import type { AgentJsonConfig, AgentIntegrationConfig, AgentSkill } from '@n8n/api-types';
import {
	AgentDiscordSettingsSchema,
	AgentLinearSettingsSchema,
	AgentSlackSettingsSchema,
	AgentTelegramSettingsSchema,
	sanitizeAgentToolName,
} from '@n8n/api-types';
import type { z } from 'zod';

import { isRecord } from '@n8n/utils/is-record';

import { uniqueName } from '../../workflow-compiler/text';
import type { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import { bindParameters } from '../../workflow-compiler/compiler/compile';
import { compileParameterTree } from '../../workflow-compiler/expressions/expression';
import type { CatalogDefaultModel } from '../catalog/capabilities';
import type { AgentChannelIR, AgentChannelType, AgentIR, AgentToolIR } from '../ir/schema';
import { AGENT_COMPILER_VERSION, AGENT_INSTRUCTIONS_TEMPLATE_VERSION } from '../versions';
import { renderInstructions } from './instructions';

export type AgentTool = NonNullable<AgentJsonConfig['tools']>[number];

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

/** Builds one integration type; the settings schema fills in `defaults` and drops invalid input. */
function integration<T extends AgentChannelType, S>(
	type: T,
	schema: z.ZodType<S, z.ZodTypeDef, unknown>,
	defaults: NoInfer<Partial<S>>,
) {
	return (credentialId: string, extra: Record<string, unknown>) => {
		const parsed = schema.safeParse({ ...defaults, ...extra });
		return { type, credentialId, ...(parsed.success ? { settings: parsed.data } : {}) };
	};
}

const CHANNELS = {
	telegram: integration('telegram', AgentTelegramSettingsSchema, {
		accessMode: 'public',
		allowedUsers: [],
	}),
	slack: integration('slack', AgentSlackSettingsSchema, { messagingExperience: 'agent' }),
	discord: integration('discord', AgentDiscordSettingsSchema, {}),
	linear: integration('linear', AgentLinearSettingsSchema, {}),
};

export function channelIntegration(channel: AgentChannelIR): AgentIntegrationConfig {
	return CHANNELS[channel.type](channel.credentialId ?? '', channel.settings ?? {});
}

export function memoryConfig(
	observational: boolean,
	episodic: boolean,
): NonNullable<AgentJsonConfig['memory']> {
	return {
		enabled: observational || episodic,
		storage: 'n8n',
		observationalMemory: { enabled: observational },
		episodicMemory: episodic ? { enabled: true, credential: 'managed' } : { enabled: false },
	};
}

export function uniqueToolName(base: string, used: Set<string>): string {
	// Names that exist on Object.prototype (such as __proto__) would break plain-object maps.
	const name = uniqueName(
		sanitizeAgentToolName(base) || 'tool',
		(c) => used.has(c) || c in {},
		'_',
	);
	used.add(name);
	return name;
}

/** `{ [key]: value }` when `value` is truthy, else nothing to spread. */
function optional<K extends string, V>(
	key: K,
	value: V | undefined | false | '',
): Partial<Record<K, V>> {
	const out: Partial<Record<K, V>> = {};
	if (value) out[key] = value;
	return out;
}

/** Deterministic AgentIR → AgentJsonConfig (+ skill and task bodies). */
export function compileAgent(ir: AgentIR, options: CompileAgentOptions): CompiledAgent {
	const warnings: string[] = [];
	const used = new Set<string>();
	const toolNames: Record<string, string> = {};
	const tools: AgentTool[] = [];
	for (const tool of ir.tools) {
		const name = uniqueToolName(tool.name, used);
		toolNames[name] = tool.id;
		tools.push(compileTool(tool, name, options, warnings));
	}

	const model = resolveModel(ir, options, warnings);
	const { reasoning, webSearch, maxIterations } = ir.options;
	const config: AgentJsonConfig = {
		...(options.existing ?? {}),
		name: ir.name,
		model: model.model,
		...optional('credential', model.credential),
		instructions: renderInstructions(ir),
		tools,
		integrations: ir.channels.map(channelIntegration),
		memory: memoryConfig(ir.memory.observational, ir.memory.episodic),
		...optional(
			'subAgents',
			ir.subAgents.length > 0 && {
				agents: ir.subAgents.map(({ agentId, useWhen }) => ({
					agentId,
					...optional('useWhen', useWhen),
				})),
			},
		),
		...optional(
			'mcpServers',
			ir.mcpServers.length > 0 &&
				ir.mcpServers.map(({ name, url, transport, authentication, credentialId }) => ({
					name,
					url,
					transport,
					authentication,
					...optional('credential', credentialId),
				})),
		),
		config: {
			...(options.existing?.config ?? {}),
			...optional('reasoning', reasoning),
			...(webSearch !== undefined ? { webSearch: { enabled: webSearch } } : {}),
			...optional('maxIterations', maxIterations),
		},
	};
	// Skill and task refs are attached by the persistence step once their bodies have ids.
	delete config.skills;
	delete config.tasks;

	const skills: Record<string, AgentSkill> = {};
	for (const { id, name, description, instructions } of ir.skills)
		skills[id] = { name, description, instructions };

	return {
		config,
		skills,
		tasks: ir.tasks.map(({ name, objective, cron, timezone, enabled }) => ({
			name,
			objective,
			cronExpression: cron,
			timezone,
			enabled,
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
	const { existing, defaultModel } = options;
	const { model } = ir;
	if (model.mode === 'explicit')
		return { model: model.model, ...optional('credential', model.credentialId) };
	if (model.mode === 'provider') {
		if (defaultModel?.model.startsWith(`${model.provider}/`)) return defaultModel;
		warnings.push(
			`No configured model for provider "${model.provider}"; the agent is saved as a draft until a model is chosen.`,
		);
		return { model: '' };
	}
	if (existing?.model)
		return { model: existing.model, ...optional('credential', existing.credential) };
	if (defaultModel) return defaultModel;
	warnings.push(
		'No default model is available; the agent is saved as a draft until a model is chosen.',
	);
	return { model: '' };
}

/** Compiles one IR tool under an already unique `name`. */
export function compileTool(
	tool: AgentToolIR,
	name: string,
	options: Pick<CompileAgentOptions, 'registry'>,
	warnings: string[],
): AgentTool {
	const approval = optional('requireApproval', tool.requireApproval);
	switch (tool.kind) {
		case 'workflow':
			return {
				type: 'workflow',
				...optional('workflowId', tool.workflowId),
				workflow: tool.workflowName,
				name,
				...optional('description', tool.description),
				...approval,
				...optional('allOutputs', tool.allOutputs),
			};
		case 'custom':
			return { type: 'custom', id: tool.id, ...approval };
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
					nodeParameters: isRecord(parameters) ? parameters : {},
					...optional(
						'credentials',
						credentialType &&
							tool.credentialId && {
								[credentialType]: { id: tool.credentialId, name: tool.credentialName ?? '' },
							},
					),
				},
				...approval,
			};
		}
	}
}
