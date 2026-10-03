import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { NodeContractsStore } from '@/node-contracts-registry';

const flagsSchema = z.object({
	input: z
		.string()
		.describe('The store folder or its file:// URL, e.g. a folder that contracts:export wrote'),
});

@Command({
	name: 'contracts:import',
	description:
		'Puts each version of a store folder into the node contracts store, with the origin of its signing key. It checks every digest, and every signature when N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE or N8N_NODE_CONTRACTS_VETTING_KEY_FILE is set. When one check fails, it adds nothing.',
	examples: ['--input=/mnt/node-contracts', '--input=file:///mnt/node-contracts'],
	flagsSchema,
})
export class ContractsImportCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { importContractStore, STORE_CATALOG_FILE, storeFilesOfDir, storeReader } = await import(
			'@n8n/nodes-base-next'
		);
		const { input } = this.flags;
		if (input.includes('://') && !input.startsWith('file:')) {
			throw new UserError(
				`contracts:import reads only a folder or a file:// URL, not ${input}. Use contracts:sync --registry for a registry.`,
			);
		}
		const dir = input.startsWith('file:') ? fileURLToPath(input) : path.resolve(input);
		const files = storeFilesOfDir(dir);
		if ((await files(STORE_CATALOG_FILE)) === undefined) {
			throw new UserError(`${dir} is not a store folder: it has no ${STORE_CATALOG_FILE}`);
		}
		const store = Container.get(NodeContractsStore);
		const added = await importContractStore(storeReader(files), store.rows, await store.keys());
		if (added.length > 0) await store.reloadOtherMains();
		this.logger.info(`Added ${added.length} versions to the node contracts store`);
	}

	async catch(error: Error) {
		this.logError(error);
	}
}
