import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { agentSkillSchema } from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Operation } from 'fast-json-patch';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import type { AgentJsonConfig, ConfigValidationError } from '../json-config/agent-json-config';
import {
	AgentJsonConfigSchema,
	formatZodErrors,
	tryParseConfigJson,
} from '../json-config/agent-json-config';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import {
	buildAskCredentialTool,
	buildAskLlmTool,
	buildAskQuestionTool,
	buildResolveLlmTool,
} from './interactive';
import { BUILDER_TOOLS } from './builder-tool-names';

const EMPTY_INSTRUCTIONS_ERROR: ConfigValidationError = {
	path: '/instructions',
	message:
		'Refusing to write an agent with empty instructions. Ask the user what the agent should do before calling write_config or patch_config again.',
};

const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config and retry with the returned configHash.',
};

export interface AgentConfigSnapshot {
	config: AgentJsonConfig | null;
	configHash: string | null;
	updatedAt: string | null;
	versionId: string | null;
}

function rejectIfEmptyInstructions(
	config: AgentJsonConfig,
): { errors: ConfigValidationError[] } | null {
	if (!config.instructions.trim()) {
		return { errors: [EMPTY_INSTRUCTIONS_ERROR] };
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => canonicalizeJson(item));
	}

	if (!isRecord(value)) return value;

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		sorted[key] = canonicalizeJson(value[key]);
	}
	return sorted;
}

export function getAgentConfigHash(config: AgentJsonConfig | null): string | null {
	if (!config) return null;
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(config)))
		.digest('hex');
}

function snapshotFromConfig(
	config: AgentJsonConfig | null,
	updatedAt: string | null,
	versionId: string | null,
): AgentConfigSnapshot {
	return {
		config,
		configHash: getAgentConfigHash(config),
		updatedAt,
		versionId,
	};
}

export interface BuilderTools {
	json: BuiltTool[];
	shared: BuiltTool[];
}

@Service()
export class AgentsBuilderToolsService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly workflowRepository: WorkflowRepository,
		private readonly agentsToolsService: AgentsToolsService,
	) {}

	getTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): BuilderTools {
		return {
			json: this.getJsonTools(agentId, projectId, credentialProvider),
			shared: this.getSharedTools(agentId, projectId, credentialProvider),
		};
	}

	private getJsonTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): BuiltTool[] {
		const readConfigTool = new Tool(BUILDER_TOOLS.READ_CONFIG)
			.description(
				'Read the latest persisted agent configuration and freshness metadata. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId }. ' +
					'Call this before every write_config or patch_config and use configHash as baseConfigHash.',
			)
			.input(z.object({}))
			.handler(async () => {
				try {
					return { ok: true, ...(await this.getConfigSnapshot(agentId, projectId)) };
				} catch (e) {
					return {
						ok: false,
						errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const writeConfigTool = new Tool(BUILDER_TOOLS.WRITE_CONFIG)
			.description(
				'Create or replace the agent configuration by writing a complete JSON string. ' +
					'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
					'Do not use a configHash copied from the prompt snapshot. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
					'{ ok: false, stage, errors } with path, message, expected, received fields on failure.',
			)
			.input(
				z.object({
					json: z.string().describe('Complete agent configuration as a JSON string'),
					baseConfigHash: z
						.string()
						.nullable()
						.describe(
							'configHash from the immediately preceding read_config result; null only if no config exists',
						),
				}),
			)
			.handler(
				async ({ json, baseConfigHash }: { json: string; baseConfigHash: string | null }) => {
					const parsed = tryParseConfigJson(json);
					if (!parsed.ok) {
						return { ok: false, errors: parsed.errors };
					}
					let snapshot: AgentConfigSnapshot;
					try {
						snapshot = await this.getConfigSnapshot(agentId, projectId);
					} catch (e) {
						return {
							ok: false,
							stage: 'stale',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
					if (baseConfigHash !== snapshot.configHash) {
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
					}
					const zodResult = AgentJsonConfigSchema.safeParse(parsed.data);
					if (!zodResult.success) {
						return { ok: false, errors: formatZodErrors(zodResult.error) };
					}
					const emptyInstructions = rejectIfEmptyInstructions(zodResult.data);
					if (emptyInstructions) {
						return { ok: false, errors: emptyInstructions.errors };
					}
					try {
						const result = await this.agentsService.updateConfig(
							agentId,
							projectId,
							zodResult.data,
						);
						return {
							ok: true,
							...snapshotFromConfig(result.config, result.updatedAt, result.versionId),
						};
					} catch (e) {
						return {
							ok: false,
							stage: 'schema',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const patchConfigTool = new Tool(BUILDER_TOOLS.PATCH_CONFIG)
			.description(
				'Apply RFC 6902 JSON Patch operations to the current agent configuration. ' +
					'Pass an array of patch operations as a JSON string. ' +
					'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
					'Do not use a configHash copied from the prompt snapshot. ' +
					'Supported ops: add, remove, replace, move, copy, test. ' +
					'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
					'{ ok: false, stage, errors } on failure. ' +
					'stage is "parse", "stale", "patch", or "schema".',
			)
			.input(
				z.object({
					operations: z.string().describe('RFC 6902 JSON Patch operations array as a JSON string'),
					baseConfigHash: z
						.string()
						.nullable()
						.describe(
							'configHash from the immediately preceding read_config result; null only if no config exists',
						),
				}),
			)
			.handler(
				async ({
					operations,
					baseConfigHash,
				}: {
					operations: string;
					baseConfigHash: string | null;
				}) => {
					const parsedOps = tryParseConfigJson(operations);
					if (!parsedOps.ok) {
						return { ok: false, stage: 'parse', errors: parsedOps.errors };
					}

					let snapshot: AgentConfigSnapshot;
					try {
						snapshot = await this.getConfigSnapshot(agentId, projectId);
					} catch (e) {
						return {
							ok: false,
							stage: 'stale',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
					if (baseConfigHash !== snapshot.configHash) {
						return { ok: false, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
					}
					if (!snapshot.config) {
						return {
							ok: false,
							stage: 'patch',
							errors: [{ path: '(root)', message: 'Agent has no JSON config yet.' }],
						};
					}

					const jsonpatch = (await import('fast-json-patch')).default;
					const ops = parsedOps.data as Operation[];
					const patchError = jsonpatch.validate(ops, snapshot.config);
					if (patchError) {
						const opPath =
							(patchError.operation as { path?: string } | undefined)?.path ?? '(root)';
						return {
							ok: false,
							stage: 'patch',
							errors: [{ path: opPath, message: patchError.message ?? 'Invalid patch operation' }],
						};
					}

					const patched = jsonpatch.applyPatch(jsonpatch.deepClone(snapshot.config), ops)
						.newDocument as unknown as AgentJsonConfig;

					const zodResult = AgentJsonConfigSchema.safeParse(patched);
					if (!zodResult.success) {
						return { ok: false, stage: 'schema', errors: formatZodErrors(zodResult.error) };
					}
					const emptyInstructions = rejectIfEmptyInstructions(zodResult.data);
					if (emptyInstructions) {
						return { ok: false, stage: 'schema', errors: emptyInstructions.errors };
					}

					try {
						const result = await this.agentsService.updateConfig(
							agentId,
							projectId,
							zodResult.data,
						);
						return {
							ok: true,
							...snapshotFromConfig(result.config, result.updatedAt, result.versionId),
						};
					} catch (e) {
						return {
							ok: false,
							stage: 'schema',
							errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const listIntegrationTypesTool = new Tool(BUILDER_TOOLS.LIST_INTEGRATION_TYPES)
			.description(
				"List trigger / integration types that can be added to the agent's `integrations` array. " +
					'Returns the schedule trigger plus every connected chat platform with the list of ' +
					'credential types it supports (`credentialTypes: string[]`). ' +
					'Call this BEFORE asking the user for a credential. Then pick ONE entry from the ' +
					'returned `credentialTypes` (prefer the OAuth variant if present, e.g. `slackOAuth2Api` ' +
					'over `slackApi`) and pass it to `ask_credential` as the singular `credentialType` arg.',
			)
			.input(z.object({}))
			.handler(async () => {
				const chat = this.agentsService.listChatIntegrations();
				return [
					{ type: 'schedule', label: 'Schedule', icon: 'clock', credentialTypes: [] },
					...chat,
				];
			})
			.build();

		return [
			readConfigTool,
			writeConfigTool,
			patchConfigTool,
			listIntegrationTypesTool,
			buildResolveLlmTool({ credentialProvider }),
			buildAskCredentialTool({ credentialProvider }),
			buildAskLlmTool(),
			buildAskQuestionTool(),
		];
	}

	private getSharedTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): BuiltTool[] {
		const buildCustomToolTool = new Tool(BUILDER_TOOLS.BUILD_CUSTOM_TOOL)
			.description(
				'Compile and store a custom tool. Pass the complete TypeScript source ' +
					'using `export default new Tool(...)` builder chain. The code is validated in a ' +
					'sandbox and saved against the agent, but this does NOT register the tool in the ' +
					'agent config — follow up with patch_config (or write_config) to add a ' +
					'`{ type: "custom", id }` entry to `tools` so the agent actually uses it. ' +
					'Returns { ok: true, id, descriptor } or { ok: false, errors }.',
			)
			.input(
				z.object({
					code: z
						.string()
						.describe('Complete TypeScript source using export default new Tool(...)'),
				}),
			)
			.handler(async ({ code }: { code: string }) => {
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					const built = await this.agentsService.buildCustomTool(
						agentId,
						projectId,
						code,
						descriptor,
					);
					return { ok: true, id: built.id, descriptor };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const createSkillTool = new Tool(BUILDER_TOOLS.CREATE_SKILL)
			.description(
				'Create and store an agent skill. Pass the skill name, a short description, and the full skill body. ' +
					'The description should help the runtime decide when to load it. ' +
					'The body is stored as the skill instructions, but this does NOT attach the skill to the agent config. ' +
					'Follow up with read_config and patch_config (or write_config) to add a `{ type: "skill", id }` entry to `skills`. ' +
					'Returns { ok: true, id, skill } or { ok: false, errors }.',
			)
			.input(
				z.object({
					name: agentSkillSchema.shape.name.describe('Human-readable skill name'),
					description: agentSkillSchema.shape.description.describe(
						'Short description of when to load the skill.',
					),
					body: agentSkillSchema.shape.instructions.describe('Full skill instructions/body'),
				}),
			)
			.handler(
				async ({
					name,
					description,
					body,
				}: {
					name: string;
					description: string;
					body: string;
				}) => {
					const skill = { name, description, instructions: body };
					const validation = agentSkillSchema.safeParse(skill);
					if (!validation.success) {
						return { ok: false, errors: formatZodErrors(validation.error) };
					}

					try {
						const created = await this.agentsService.createSkill(agentId, projectId, skill);
						return { ok: true, id: created.id, skill: created.skill };
					} catch (e) {
						return {
							ok: false,
							errors: [{ message: e instanceof Error ? e.message : String(e) }],
						};
					}
				},
			)
			.build();

		const listWorkflowsTool = new Tool('list_workflows')
			.description(
				'List the n8n workflows that can be attached as tools via `type: "workflow"` in the agent config. ' +
					'ALWAYS call this at the start — workflows are the preferred way to give agents real capabilities ' +
					'(sending emails, creating calendar events, querying databases, calling APIs, etc.). ' +
					'Only returns workflows with supported trigger types.',
			)
			.input(z.object({}))
			.handler(async () => {
				const workflows = await this.workflowRepository.find({
					select: ['id', 'name', 'nodes', 'active', 'updatedAt'],
					where: { shared: { projectId } },
					relations: ['shared'],
					order: { updatedAt: 'DESC' },
					take: 100,
				});

				// Keys are n8n node type IDs, which use the dotted "package.nodeName"
				// format — the naming-convention rule doesn't apply to those.
				/* eslint-disable @typescript-eslint/naming-convention */
				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};
				/* eslint-enable @typescript-eslint/naming-convention */

				const compatible = workflows
					.map((w) => {
						const triggerNode = (w.nodes ?? []).find(
							(n: { type: string }) => SUPPORTED_TRIGGERS[n.type],
						);
						if (!triggerNode) return null;
						return {
							name: w.name,
							active: w.active,
							triggerType: SUPPORTED_TRIGGERS[triggerNode.type],
						};
					})
					.filter(Boolean);

				return { workflows: compatible };
			})
			.build();

		return [
			buildCustomToolTool,
			createSkillTool,
			listWorkflowsTool,
			...this.agentsToolsService.getSharedTools(
				credentialProvider,
				'Read-only inspection of available credentials. Use ask_credential to let the user ' +
					'pick the credential to wire into a node tool — never copy ids from this list directly ' +
					'into the config.',
			),
		];
	}

	private async getConfigSnapshot(
		agentId: string,
		projectId: string,
	): Promise<AgentConfigSnapshot> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new Error('Agent not found');

		const config = composeJsonConfig(agent);
		return snapshotFromConfig(config, agent.updatedAt.toISOString(), agent.versionId);
	}
}
