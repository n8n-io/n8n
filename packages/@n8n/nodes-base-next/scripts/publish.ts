import { parseFixtures } from '@n8n/node-sdk/registry';
import { npmRegistry, publishAction } from '@n8n/node-sdk/publish';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { actionEntries } from './freeze';

export const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * Publishes the HEAD of each action, one package per action. The gate in `publishAction`
 * refuses a wrong bump; a version already published with the same bytes is a no-op.
 */
async function publishAll() {
	const url = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
	const keyFile = process.env.N8N_NODE_CONTRACTS_SIGNING_KEY_FILE;
	if (!url || !keyFile) {
		throw new UserError(
			'Set N8N_NODE_CONTRACTS_REGISTRY_URL and N8N_NODE_CONTRACTS_SIGNING_KEY_FILE',
		);
	}
	const registry = npmRegistry(url);
	const privateKey = await readFile(keyFile, 'utf8');
	// One at a time: npm publish runs per package and its log stays readable.
	for (const { entryFile, exportName, action } of await actionEntries()) {
		const file = path.join(FIXTURES_DIR, `${action.id}.json`);
		const fixtures = parseFixtures(await readFile(file, 'utf8'));
		const manifest = await publishAction({ entryFile, exportName, fixtures, registry, privateKey });
		console.log(`${manifest.id}@${manifest.semver} ${manifest.bundleHash}`);
	}
}

if (require.main === module) {
	void publishAll().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
