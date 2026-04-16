import type { NodeTypeParser } from '@n8n/ai-workflow-builder';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

interface InvokableTool<TInput> {
	invoke(input: TInput): Promise<string>;
}

/**
 * Shared service for MCP workflow builder tools.
 * Lazily initializes NodeTypeParser and resolves nodeDefinitionDirs
 * for the code-builder search/get/suggest tools.
 *
 * Caches tool instances and their results across successive builds.
 * All caches are invalidated when node types are refreshed.
 */
@Service()
export class WorkflowBuilderToolsService {
	private nodeTypeParser: NodeTypeParser | undefined;

	private nodeDefinitionDirs: string[] = [];

	private initPromise: Promise<void> | undefined;

	// Cached tool instances — created once, reused across invocations
	private searchTool: InvokableTool<{ queries: string[] }> | undefined;

	private getTool: InvokableTool<{ nodeIds: NodeRequest[] }> | undefined;

	private suggestTool: InvokableTool<{ categories: string[] }> | undefined;

	// Result caches — keyed by normalized input, cleared on node type refresh
	private readonly searchCache = new Map<string, string>();

	private readonly getCache = new Map<string, string>();

	private readonly suggestCache = new Map<string, string>();

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	async initialize(): Promise<void> {
		this.initPromise ??= this.doInitialize();
		await this.initPromise;
	}

	getNodeTypeParser(): NodeTypeParser {
		if (!this.nodeTypeParser) {
			throw new Error('WorkflowBuilderToolsService not initialized. Call initialize() first.');
		}
		return this.nodeTypeParser;
	}

	getNodeDefinitionDirs(): string[] {
		return this.nodeDefinitionDirs;
	}

	/** Search for nodes by keyword, with result caching. */
	async searchNodes(queries: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...queries].sort());
		const cached = this.searchCache.get(cacheKey);
		if (cached) return cached;

		if (!this.searchTool) {
			const { createCodeBuilderSearchTool } = await import('@n8n/ai-workflow-builder');
			this.searchTool = createCodeBuilderSearchTool(this.getNodeTypeParser());
		}
		const result = await this.searchTool.invoke({ queries });
		this.searchCache.set(cacheKey, result);
		return result;
	}

	/** Get TypeScript type definitions for nodes, with result caching. */
	async getNodeTypes(nodeIds: NodeRequest[]): Promise<string> {
		const cacheKey = JSON.stringify(
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))),
		);
		const cached = this.getCache.get(cacheKey);
		if (cached) return cached;

		if (!this.getTool) {
			const { createCodeBuilderGetTool } = await import('@n8n/ai-workflow-builder');
			this.getTool = createCodeBuilderGetTool({ nodeDefinitionDirs: this.nodeDefinitionDirs });
		}
		const result = await this.getTool.invoke({ nodeIds });
		this.getCache.set(cacheKey, result);
		return result;
	}

	/** Get curated node suggestions by category, with result caching. */
	async getSuggestedNodes(categories: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...categories].sort());
		const cached = this.suggestCache.get(cacheKey);
		if (cached) return cached;

		if (!this.suggestTool) {
			const { createGetSuggestedNodesTool } = await import('@n8n/ai-workflow-builder');
			this.suggestTool = createGetSuggestedNodesTool(this.getNodeTypeParser());
		}
		const result = await this.suggestTool.invoke({ categories });
		this.suggestCache.set(cacheKey, result);
		return result;
	}

	private async doInitialize(): Promise<void> {
		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-workflow-builder');
		const { setSchemaBaseDirs } = await import('@n8n/workflow-sdk');

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);
		this.nodeDefinitionDirs = await this.resolveBuiltinNodeDefinitionDirs();

		setSchemaBaseDirs(this.nodeDefinitionDirs);

		this.logger.debug('WorkflowBuilderToolsService initialized', {
			nodeTypeCount: nodeTypeDescriptions.length,
			nodeDefinitionDirs: this.nodeDefinitionDirs.length,
		});
	}

	private async refreshNodeTypes(): Promise<void> {
		if (!this.nodeTypeParser) return;

		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-workflow-builder');
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();
		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);

		// Invalidate cached tool instances (they hold references to the old parser)
		this.searchTool = undefined;
		this.getTool = undefined;
		this.suggestTool = undefined;

		// Clear result caches
		this.searchCache.clear();
		this.getCache.clear();
		this.suggestCache.clear();

		this.logger.debug('WorkflowBuilderToolsService refreshed node types', {
			nodeTypeCount: nodeTypeDescriptions.length,
		});
	}

	private async resolveBuiltinNodeDefinitionDirs(): Promise<string[]> {
		const dirs: string[] = [];
		for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				const nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');
				await fs.access(nodeDefsDir);
				dirs.push(nodeDefsDir);
			} catch (error) {
				this.logger.debug(`Could not resolve node definitions for ${packageId}`, { error });
			}
		}
		return dirs;
	}
}
