import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for resolving node definition directories.
 *
 * For built-in nodes, definitions are pre-generated at build time
 * in each node package's dist/node-definitions/ directory.
 */
@Service()
export class NodeDefinitionGeneratorService {
	/**
	 * Compute MD5 hash of content
	 */
	computeHash(content: string): string {
		return createHash('md5').update(content).digest('hex');
	}

	/**
	 * Returns ordered list of directories to search for node definitions.
	 * Returns only built-in dirs (from node packages).
	 */
	getNodeDefinitionDirs(): string[] {
		return this.getBuiltinDefinitionDirs();
	}

	/**
	 * Resolve built-in node definition directories from installed node packages.
	 */
	private getBuiltinDefinitionDirs(): string[] {
		const dirs: string[] = [];
		for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				const nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');
				if (fs.existsSync(nodeDefsDir)) {
					dirs.push(nodeDefsDir);
				}
			} catch {
				// Package not installed, skip
			}
		}
		return dirs;
	}
}
