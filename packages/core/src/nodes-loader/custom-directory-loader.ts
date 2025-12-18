import glob from 'fast-glob';

import { DirectoryLoader } from './directory-loader';

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = 'CUSTOM';

	constructor(directory: string, excludeNodes: string[] = [], includeNodes: string[] = []) {
		super(directory, excludeNodes, includeNodes);

		this.excludeNodes = this.extractNodeTypes(excludeNodes, this.packageName);
		this.includeNodes = this.extractNodeTypes(includeNodes, this.packageName);
	}

	override async loadAll() {
		const nodes = await glob('**/*.node.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const nodePath of nodes) {
			this.loadNodeFromFile(nodePath);
		}

		const credentials = await glob('**/*.credentials.js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const credentialPath of credentials) {
			this.loadCredentialFromFile(credentialPath);
		}
	}
}
