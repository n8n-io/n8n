import { parseFixtures } from '@n8n/node-sdk/registry';
import { publishAction } from '@n8n/node-sdk/publish';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError } from 'n8n-workflow';

import { actionEntries } from './freeze';

export const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * Publishes the HEAD of each action into the registry store. The registry serves these files as
 * they are, so the URL is a `file://` folder that a static upload copies. The gate in
 * `publishAction` refuses a wrong bump; a version already published with the same bytes is a no-op.
 */
async function publishAll() {
	const url = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
	const keyFile = process.env.N8N_NODE_CONTRACTS_SIGNING_KEY_FILE;
	if (!url?.startsWith('file:') || !keyFile) {
		throw new UserError(
			'Set N8N_NODE_CONTRACTS_REGISTRY_URL to a file:// folder and N8N_NODE_CONTRACTS_SIGNING_KEY_FILE',
		);
	}
	const registryDir = fileURLToPath(url);
	const privateKey = await readFile(keyFile, 'utf8');
	// One at a time: each version appends to the registry index, and the log stays readable.
	for (const { entryFile, exportName, action } of await actionEntries()) {
		const file = path.join(FIXTURES_DIR, `${action.id}.json`);
		const fixtures = parseFixtures(await readFile(file, 'utf8'));
		const manifest = await publishAction({
			entryFile,
			exportName,
			fixtures,
			registryDir,
			privateKey,
		});
		console.log(`${manifest.id}@${manifest.semver} ${manifest.bundleHash}`);
	}
}

if (require.main === module) {
	void publishAll().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
