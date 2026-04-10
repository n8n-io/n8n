import type { Operation } from 'fast-json-patch';
import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isToolType, isTriggerNodeType } from 'n8n-workflow';
import { z } from 'zod';

import { WorkflowBuilderToolsService } from '@/modules/mcp/tools/workflow-builder/workflow-builder-tools.service';

import type { AgentJsonConfig } from './agent-json-config';
import { AgentJsonConfigSchema, formatZodErrors, tryParseConfigJson } from './agent-json-config';
import { AgentSecureRuntime } from './agent-secure-runtime';
import { AgentsService } from './agents.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

interface InvokableTool<TInput> {
	invoke(input: TInput): Promise<string>;
}

export interface BuilderTools {
	json: BuiltTool[];
	shared: BuiltTool[];
}

/** Nodes the agent builder should never surface as selectable node tools. */
function isExcludedNodeType(nodeId: string): boolean {
	return isTriggerNodeType(nodeId) || isToolType(nodeId);
}

@Service()
export class AgentsBuilderToolsService {
	/** Lazily initialized filtered search tool — invalidated on node-type refresh. */
	private builderSearchTool: InvokableTool<{ queries: string[] }> | undefined;

	/** Result cache for the filtered search tool, keyed by sorted query list. */
	private readonly builderSearchCache = new Map<string, string>();

	constructor(
		private readonly agentsService: AgentsService,
		private readonly secureRuntime: AgentSecureRuntime,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowBuilderToolsService: WorkflowBuilderToolsService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	async refreshNodeTypes(): Promise<void> {
		this.builderSearchTool = undefined;
		this.builderSearchCache.clear();
	}

	async initialize(): Promise<void> {
		await this.workflowBuilderToolsService.initialize();
	}

	private async invokeBuilderSearch(queries: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...queries].sort());
		const cached = this.builderSearchCache.get(cacheKey);
		if (cached) return cached;

		if (!this.builderSearchTool) {
			const { createCodeBuilderSearchTool } = await import('@n8n/ai-workflow-builder');
			this.builderSearchTool = createCodeBuilderSearchTool(
				this.workflowBuilderToolsService.getNodeTypeParser(),
				{ nodeFilter: (nodeId) => !isExcludedNodeType(nodeId) },
			);
		}

		const result = await this.builderSearchTool.invoke({ queries });
		this.builderSearchCache.set(cacheKey, result);
		return result;
	}

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
				'Create or update a custom tool. Pass the tool ID and complete TypeScript source ' +
					'using `export default new Tool(...)` builder chain. The code is validated in a ' +
					'sandbox. On success the tool is added to the agent config automatically. ' +
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

		const listCredentialsTool = new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Call this BEFORE generating code to know which .credential() value to use.',
			)
			.input(z.object({}))
			.handler(async () => {
				const creds = await credentialProvider.list();
				return { credentials: creds };
			})
			.build();

		const listWorkflowsTool = new Tool('list_workflows')
			.description(
				'List the n8n workflows that can be attached as tools via .tool(new WorkflowTool(name)) from @n8n/agents-utils. ' +
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

				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};

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

		const searchNodesTool = new Tool('search_nodes')
			.description(
				'Search for n8n nodes by name or service. Use this to find nodes that can be added ' +
					'as node tools. Returns node IDs, display names, versions, and descriptions. ' +
					'After finding a node, call get_node_types to get its parameter schema.',
			)
			.input(
				z.object({
					queries: z
						.array(z.string())
						.min(1)
						.describe('Search queries (e.g., ["gmail", "slack", "http"])'),
				}),
			)
			.handler(async ({ queries }: { queries: string[] }) => {
				const results = await this.invokeBuilderSearch(queries);
				return { results };
			})
			.build();

		const getNodeTypesTool = new Tool('get_node_types')
			.description(
				'Get detailed parameter schema for specific n8n nodes. Use the node IDs returned ' +
					'by search_nodes. Returns parameter definitions needed to configure node tools. ' +
					'You can optionally filter by resource/operation/mode.',
			)
			.input(
				z.object({
					nodeIds: z
						.array(
							z.union([
								z.string(),
								z.object({
									nodeId: z.string(),
									version: z.string().optional(),
									resource: z.string().optional(),
									operation: z.string().optional(),
									mode: z.string().optional(),
								}),
							]),
						)
						.min(1)
						.describe('Node IDs from search_nodes (e.g., ["n8n-nodes-base.gmail"])'),
				}),
			)
			.handler(
				async ({
					nodeIds,
				}: {
					nodeIds: Array<
						| string
						| {
								nodeId: string;
								version?: string;
								resource?: string;
								operation?: string;
								mode?: string;
						  }
					>;
				}) => {
					const results = await this.workflowBuilderToolsService.getNodeTypes(nodeIds);
					return { results };
				},
			)
			.build();

		return [
			buildCustomToolTool,
			listCredentialsTool,
			listWorkflowsTool,
			searchNodesTool,
			getNodeTypesTool,
		];
	}
}
