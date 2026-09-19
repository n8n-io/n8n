import type { AgentJsonConfig, AgentIntegrationConfig, AgentSkill } from '@n8n/api-types';
import {
	AgentDiscordSettingsSchema,
	AgentLinearSettingsSchema,
	AgentSlackSettingsSchema,
	AgentTelegramSettingsSchema,
	sanitizeAgentToolName,
} from '@n8n/api-types';

import type { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import { bindParameters } from '../../workflow-compiler/compiler/compile';
import { compileParameterTree } from '../../workflow-compiler/expressions/expression';
import type { CatalogDefaultModel } from '../catalog/capabilities';
import type { AgentChannelIR, AgentIR, AgentToolIR } from '../ir/schema';
import { AGENT_COMPILER_VERSION, AGENT_INSTRUCTIONS_TEMPLATE_VERSION } from '../versions';
import { renderInstructions } from './instructions';

export interface CompiledAgentTask {
	name: string;
	objective: string;
	cronExpression: string;
	timezone: string;
	enabled: boolean;
}

export interface AgentGeneratorMetadata {
	compilerVersion: string;
	instructionsTemplateVersion: string;
	nodeRegistryVersion: string;
	patternIds: string[];
}

export interface CompiledAgent {
	/** Config without skill and task refs; the persistence step attaches them once bodies exist. */
	config: AgentJsonConfig;
	skills: Record<string, AgentSkill>;
	tasks: CompiledAgentTask[];
	/** Tool name → IR tool id, for validation and scenarios. */
	toolNames: Record<string, string>;
	generator: AgentGeneratorMetadata;
	warnings: string[];
}

export interface CompileAgentOptions {
	registry: NodeRegistry;
	defaultModel: CatalogDefaultModel | null;
	/** Existing config an edit started from; unknown fields (personalisation, vector stores…) carry over. */
	existing?: AgentJsonConfig;
}

function channelIntegration(channel: AgentChannelIR): AgentIntegrationConfig {
	const credentialId = channel.credentialId ?? '';
	const extra = channel.settings ?? {};
	switch (channel.type) {
		case 'telegram': {
			const parsed = AgentTelegramSettingsSchema.safeParse({
				accessMode: 'public',
				allowedUsers: [],
				...extra,
			});
			return {
				type: 'telegram',
				credentialId,
				...(parsed.success ? { settings: parsed.data } : {}),
			};
		}
		case 'slack': {
			const parsed = AgentSlackSettingsSchema.safeParse({ messagingExperience: 'agent', ...extra });
			return { type: 'slack', credentialId, ...(parsed.success ? { settings: parsed.data } : {}) };
		}
		case 'discord': {
			const parsed = AgentDiscordSettingsSchema.safeParse(extra);
			return {
				type: 'discord',
				credentialId,
				...(parsed.success ? { settings: parsed.data } : {}),
			};
		}
		case 'linear': {
			const parsed = AgentLinearSettingsSchema.safeParse(extra);
			return { type: 'linear', credentialId, ...(parsed.success ? { settings: parsed.data } : {}) };
		}
	}
}

function uniqueToolName(base: string, used: Set<string>): string {
	const sanitized = sanitizeAgentToolName(base) || 'tool';
	let name = sanitized;
	let n = 1;
	while (used.has(name)) {
		n += 1;
		name = `${sanitized}_${n}`;
	}
	used.add(name);
	return name;
}

/** Deterministic AgentIR → AgentJsonConfig (+ skill and task bodies). */
export function compileAgent(ir: AgentIR, options: CompileAgentOptions): CompiledAgent {
	const warnings: string[] = [];
	const used = new Set<string>();
	const toolNames: Record<string, string> = {};
	const tools: NonNullable<AgentJsonConfig['tools']> = [];
	for (const tool of ir.tools) {
		const name = uniqueToolName(tool.name, used);
		toolNames[name] = tool.id;
		tools.push(compileTool(tool, name, options, warnings));
	}

	const model = resolveModel(ir, options, warnings);
	const config: AgentJsonConfig = {
		...(options.existing ?? {}),
		name: ir.name,
		model: model.model,
		...(model.credential ? { credential: model.credential } : {}),
		instructions: renderInstructions(ir),
		tools,
		integrations: ir.channels.map(channelIntegration),
		memory: {
			enabled: ir.memory.observational || ir.memory.episodic,
			storage: 'n8n',
			observationalMemory: { enabled: ir.memory.observational },
			episodicMemory: ir.memory.episodic
				? { enabled: true, credential: 'managed' }
				: { enabled: false },
		},
		...(ir.subAgents.length > 0
			? {
					subAgents: {
						agents: ir.subAgents.map(({ agentId, useWhen }) => ({
							agentId,
							...(useWhen ? { useWhen } : {}),
						})),
					},
				}
			: {}),
		...(ir.mcpServers.length > 0
			? {
					mcpServers: ir.mcpServers.map((server) => ({
						name: server.name,
						url: server.url,
						transport: server.transport,
						authentication: server.authentication,
						...(server.credentialId ? { credential: server.credentialId } : {}),
					})),
				}
			: {}),
		config: {
			...(options.existing?.config ?? {}),
			...(ir.options.reasoning ? { reasoning: ir.options.reasoning } : {}),
			...(ir.options.webSearch !== undefined
				? { webSearch: { enabled: ir.options.webSearch } }
				: {}),
			...(ir.options.maxIterations ? { maxIterations: ir.options.maxIterations } : {}),
		},
	};
	// Skill and task refs are attached by the persistence step once their bodies have ids.
	delete config.skills;
	delete config.tasks;

	const skills: Record<string, AgentSkill> = {};
	for (const skill of ir.skills)
		skills[skill.id] = {
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
		};

	return {
		config,
		skills,
		tasks: ir.tasks.map((task) => ({
			name: task.name,
			objective: task.objective,
			cronExpression: task.cron,
			timezone: task.timezone,
			enabled: task.enabled,
		})),
		toolNames,
		generator: {
			compilerVersion: AGENT_COMPILER_VERSION,
			instructionsTemplateVersion: AGENT_INSTRUCTIONS_TEMPLATE_VERSION,
			nodeRegistryVersion: options.registry.version,
			patternIds: ir.patternIds,
		},
		warnings,
	};
}

function resolveModel(
	ir: AgentIR,
	options: CompileAgentOptions,
	warnings: string[],
): { model: string; credential?: string } {
	if (ir.model.mode === 'explicit')
		return {
			model: ir.model.model,
			...(ir.model.credentialId ? { credential: ir.model.credentialId } : {}),
		};
	if (ir.model.mode === 'provider') {
		if (options.defaultModel?.model.startsWith(`${ir.model.provider}/`))
			return options.defaultModel;
		warnings.push(
			`No configured model for provider "${ir.model.provider}"; the agent is saved as a draft until a model is chosen.`,
		);
		return { model: '' };
	}
	if (options.existing?.model)
		return {
			model: options.existing.model,
			...(options.existing.credential ? { credential: options.existing.credential } : {}),
		};
	if (options.defaultModel) return options.defaultModel;
	warnings.push(
		'No default model is available; the agent is saved as a draft until a model is chosen.',
	);
	return { model: '' };
}

function compileTool(
	tool: AgentToolIR,
	name: string,
	options: CompileAgentOptions,
	warnings: string[],
): NonNullable<AgentJsonConfig['tools']>[number] {
	switch (tool.kind) {
		case 'workflow':
			return {
				type: 'workflow',
				...(tool.workflowId ? { workflowId: tool.workflowId } : {}),
				workflow: tool.workflowName,
				name,
				...(tool.description ? { description: tool.description } : {}),
				...(tool.requireApproval ? { requireApproval: true } : {}),
				...(tool.allOutputs ? { allOutputs: true } : {}),
			};
		case 'custom':
			return {
				type: 'custom',
				id: tool.id,
				...(tool.requireApproval ? { requireApproval: true } : {}),
			};
		case 'node': {
			const operation = options.registry.require(tool.operationId);
			const parameters = compileParameterTree(
				bindParameters(operation, tool.params, { warnings: [] }, tool.id),
				() => undefined,
			);
			const credentialType = operation.credentials.find((credential) => credential.required)?.type;
			if (credentialType && !tool.credentialId)
				warnings.push(`Tool "${name}" needs a ${credentialType} credential.`);
			return {
				type: 'node',
				name,
				description: tool.description ?? operation.description,
				node: {
					nodeType: operation.nodeType,
					nodeTypeVersion: operation.version,
					nodeParameters:
						typeof parameters === 'object' && parameters !== null
							? (parameters as Record<string, unknown>)
							: {},
					...(credentialType && tool.credentialId
						? {
								credentials: {
									[credentialType]: { id: tool.credentialId, name: tool.credentialName ?? '' },
								},
							}
						: {}),
				},
				...(tool.requireApproval ? { requireApproval: true } : {}),
			};
		}
	}
}
