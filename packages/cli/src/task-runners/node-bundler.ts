import { createHash } from 'node:crypto';
import path from 'node:path';

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { build } from 'esbuild';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

export interface NodeBundle {
	/** Bundled JS code (self-contained) */
	code: string;
	/** Node type name, e.g., "n8n-nodes-base.slack" */
	nodeType: string;
	/** Node version */
	version: number;
	/** Hash of the bundle */
	hash: string;
}

/**
 * Bundles node source code with all dependencies for transfer to the node runner.
 *
 * The runner has NO filesystem access to main n8n, so all node code must be
 * bundled and sent over the wire.
 */
@Service()
export class NodeBundler {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly nodeTypes: NodeTypes,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {
		this.logger = logger.scoped('node-bundler');
	}

	/**
	 * Create a bundle for a node type.
	 */
	async getBundle(nodeType: string, version: number): Promise<NodeBundle> {
		// Get the node's source path
		const { sourcePath } = this.nodeTypes.getWithSourcePath(nodeType, version);

		if (!sourcePath) {
			this.logger.error('No source path found for node type', { nodeType, version });
			throw new Error(`No source path found for node type: ${nodeType}@${version}`);
		}

		// The sourcePath may be relative (e.g., "dist/nodes/Set/Set.node.js") for lazy-loaded nodes.
		// We need to resolve it to an absolute path using the package directory.
		const [packageName] = nodeType.split('.');
		const loader = this.loadNodesAndCredentials.loaders[packageName];
		const resolvedPath = loader ? path.resolve(loader.directory, sourcePath) : sourcePath;

		this.logger.debug('Bundling node from source', {
			nodeType,
			version,
			sourcePath,
			resolvedPath,
		});

		// Use esbuild to create a self-contained bundle
		const startTime = Date.now();
		const result = await build({
			entryPoints: [resolvedPath],
			bundle: true,
			write: false,
			format: 'cjs',
			platform: 'node',
			target: 'node18',
			// Externalize n8n-workflow - the runner has its own copy
			external: ['n8n-workflow', 'n8n-core'],
			// Include source maps for debugging
			sourcemap: 'inline',
			// Minify to reduce transfer size
			minify: true,
			// Tree shake unused code
			treeShaking: true,
		});
		const bundleTimeMs = Date.now() - startTime;

		const code = result.outputFiles[0].text;
		const hash = createHash('sha256').update(code).digest('hex').slice(0, 16);

		this.logger.debug('Node bundle complete', {
			nodeType,
			version,
			hash,
			codeSize: code.length,
			bundleTimeMs,
		});

		return { code, nodeType, version, hash };
	}
}
