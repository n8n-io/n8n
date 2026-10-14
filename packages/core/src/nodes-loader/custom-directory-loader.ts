import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { CUSTOM_NODES_PACKAGE_NAME } from './constants';
import { DirectoryLoader } from './directory-loader';
import type { n8n } from './types';

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = CUSTOM_NODES_PACKAGE_NAME;

	constructor(directory: string, excludeNodes: string[] = [], includeNodes: string[] = []) {
		super(directory, excludeNodes, includeNodes);

		this.excludeNodes = this.extractNodeTypes(excludeNodes, this.packageName);
		this.includeNodes = this.extractNodeTypes(includeNodes, this.packageName);
	}

	override async loadAll() {
		const nodes = await glob('**/*.node.js', {
			cwd: this.directory,
			absolute: true,
			ignore: ['**/node_modules/**'],
		});

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
			ignore: ['**/node_modules/**'],
		});

		// Dev packages are linked here. Load their manifest entries, not their dependencies.
		const packageFiles = await glob(
			['node_modules/*/package.json', 'node_modules/@*/*/package.json'],
			{ cwd: this.directory, absolute: true },
		);
		for (const packageFile of packageFiles) {
			const { n8n } = jsonParse<n8n.PackageJson>(await readFile(packageFile, 'utf8'));
			if (!n8n) {
				this.logger.warn(`Skipping custom node package "${packageFile}": no n8n field found.`);
				continue;
			}

			const packageDirectory = path.dirname(packageFile);
			if (Array.isArray(n8n.nodes)) {
				nodes.push(...n8n.nodes.map((nodePath) => path.resolve(packageDirectory, nodePath)));
			}
			if (Array.isArray(n8n.credentials)) {
				credentials.push(
					...n8n.credentials.map((credentialPath) =>
						path.resolve(packageDirectory, credentialPath),
					),
				);
			}
		}

		for (const nodePath of nodes) {
			this.loadNodeFromFile(nodePath);
		}

		for (const credentialPath of credentials) {
			this.loadCredentialFromFile(credentialPath);
		}
	}
}
