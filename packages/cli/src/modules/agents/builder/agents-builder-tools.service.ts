import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Operation } from 'fast-json-patch';
import { z } from 'zod';

import { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import {
	AgentJsonConfigSchema,
	formatZodErrors,
	tryParseConfigJson,
} from '../json-config/agent-json-config';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

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
			json: this.getJsonTools(agentId, projectId),
			shared: this.getSharedTools(agentId, projectId, credentialProvider),
		};
	}

	private getJsonTools(agentId: string, projectId: string): BuiltTool[] {
		const writeConfigTool = new Tool('write_config')
			.description(
				'Create or replace the agent configuration by writing a complete JSON string. ' +
					'Returns { ok: true } on success or { ok: false, errors } with path, message, ' +
					'expected, received fields on validation failure.',
			)
			.input(
				z.object({
					json: z.string().describe('Complete agent configuration as a JSON string'),
				}),
			)
			.handler(async ({ json }: { json: string }) => {
				const parsed = tryParseConfigJson(json);
				if (!parsed.ok) {
					return { ok: false, errors: parsed.errors };
				}
				const zodResult = AgentJsonConfigSchema.safeParse(parsed.data);
				if (!zodResult.success) {
					return { ok: false, errors: formatZodErrors(zodResult.error) };
				}
				try {
					await this.agentsService.updateConfig(agentId, projectId, zodResult.data);
					return { ok: true };
				} catch (e) {
					return {
						ok: false,
						errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		const patchConfigTool = new Tool('patch_config')
			.description(
				'Apply RFC 6902 JSON Patch operations to the current agent configuration. ' +
					'Pass an array of patch operations as a JSON string. ' +
					'Supported ops: add, remove, replace, move, copy, test. ' +
					'Returns { ok: true, config } on success or { ok: false, stage, errors } on failure. ' +
					'stage is "parse", "patch", or "schema".',
			)
			.input(
				z.object({
					operations: z.string().describe('RFC 6902 JSON Patch operations array as a JSON string'),
				}),
			)
			.handler(async ({ operations }: { operations: string }) => {
				const parsedOps = tryParseConfigJson(operations);
				if (!parsedOps.ok) {
					return { ok: false, stage: 'parse', errors: parsedOps.errors };
				}

				let existingConfig: AgentJsonConfig;
				try {
					existingConfig = await this.agentsService.getConfig(agentId, projectId);
				} catch (e) {
					return {
						ok: false,
						stage: 'patch',
						errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
					};
				}
				const jsonpatch = (await import('fast-json-patch')).default;
				const ops = parsedOps.data as Operation[];
				const patchError = jsonpatch.validate(ops, existingConfig);
				if (patchError) {
					const opPath = (patchError.operation as { path?: string } | undefined)?.path ?? '(root)';
					return {
						ok: false,
						stage: 'patch',
						errors: [{ path: opPath, message: patchError.message ?? 'Invalid patch operation' }],
					};
				}

				const patched = jsonpatch.applyPatch(jsonpatch.deepClone(existingConfig), ops)
					.newDocument as unknown as AgentJsonConfig;

				const zodResult = AgentJsonConfigSchema.safeParse(patched);
				if (!zodResult.success) {
					return { ok: false, stage: 'schema', errors: formatZodErrors(zodResult.error) };
				}

				try {
					const result = await this.agentsService.updateConfig(agentId, projectId, zodResult.data);
					return { ok: true, config: result.config };
				} catch (e) {
					return {
						ok: false,
						stage: 'schema',
						errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
			.build();

		return [writeConfigTool, patchConfigTool];
	}

	private getSharedTools(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): BuiltTool[] {
		const buildCustomToolTool = new Tool('build_custom_tool')
			.description(
				'Compile and store a custom tool. Pass the tool ID and complete TypeScript source ' +
					'using `export default new Tool(...)` builder chain. The code is validated in a ' +
					'sandbox and saved against the agent, but this does NOT register the tool in the ' +
					'agent config — follow up with patch_config (or write_config) to add a ' +
					'`{ type: "custom", id }` entry to `tools` so the agent actually uses it. ' +
					'Returns { ok: true, descriptor } or { ok: false, errors }.',
			)
			.input(
				z.object({
					id: z
						.string()
						.min(1)
						.regex(/^[a-z0-9_-]+$/)
						.describe('Tool ID (lowercase, underscores, hyphens)'),
					code: z
						.string()
						.describe('Complete TypeScript source using export default new Tool(...)'),
				}),
			)
			.handler(async ({ id, code }: { id: string; code: string }) => {
				try {
					const descriptor = await this.secureRuntime.describeToolSecurely(code);
					await this.agentsService.buildCustomTool(agentId, projectId, id, code, descriptor);
					return { ok: true, id, descriptor };
				} catch (e) {
					return {
						ok: false,
						errors: [{ message: e instanceof Error ? e.message : String(e) }],
					};
				}
			})
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
			listWorkflowsTool,
			...this.agentsToolsService.getSharedTools(
				credentialProvider,
				'Call this BEFORE adding a node tool so you know which credential to wire up. ' +
					"Copy the returned { id, name } into the tool's `credentials` field, keyed by the " +
					'credential slot name (e.g. `credentials: { gmailOAuth2: { id, name } }`).',
			),
		];
	}
}
