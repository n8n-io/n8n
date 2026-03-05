import type { NodeTypeParser } from '@n8n/ai-workflow-builder';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

/**
 * Shared service for MCP workflow builder tools.
 * Lazily initializes NodeTypeParser and resolves nodeDefinitionDirs
 * for the code-builder search/get/suggest tools.
 */
@Service()
export class WorkflowBuilderToolsService {
	private nodeTypeParser: NodeTypeParser | undefined;

	private nodeDefinitionDirs: string[] = [];

	private initPromise: Promise<void> | undefined;

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
