import glob from 'fast-glob';
import { createHash } from "crypto";

import { DirectoryLoader } from './directory-loader';

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = 'CUSTOM';

	override async loadAll() {
		// hash the name so that multiple custom nodes do not collide
		this.packageName = createHash('sha256')
            .update(this.directory)
            .digest('hex')
			.substring(0, 8);
		
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
