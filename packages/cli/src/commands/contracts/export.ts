import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import path from 'node:path';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { NodeContractsStore } from '@/node-contracts-registry';
import { assertNodeContractsEnabled } from '@/node-contracts-run';
import { NodeContractsSync } from '@/node-contracts-sync';

const flagsSchema = z.object({
	output: z.string().describe('The folder to write the store layout to'),
	pinned: z
		.boolean()
		.describe('Writes only the versions that the node locks of saved workflows name')
		.optional(),
});

@Command({
	name: 'contracts:export',
	description:
		'Writes the versions of the node contracts store to a folder in the store layout, e.g. for contracts:import on a host without network',
	examples: ['--output=/mnt/node-contracts', '--output=/mnt/node-contracts --pinned'],
	flagsSchema,
})
export class ContractsExportCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		assertNodeContractsEnabled('contracts:export');
		const { exportContractStore } = await import('@n8n/nodes-base-next');
		const { output, pinned } = this.flags;
		const locks = pinned ? await Container.get(NodeContractsSync).locks() : undefined;
		const records = await exportContractStore(
			Container.get(NodeContractsStore).rows,
			path.resolve(output),
			({ id, version }) =>
				!locks || locks.some((lock) => lock.action === id && lock.version === version),
		);
		this.logger.info(`Wrote ${records.length} versions to ${output}`);
		const missing = new Set(
			(locks ?? [])
				.filter(
					(lock) =>
						!records.some(({ id, version }) => id === lock.action && version === lock.version),
				)
				.map((lock) => `${lock.action}@${lock.version}`),
		);
		if (missing.size > 0) {
			this.logger.warn(
				`The store does not have these locked versions, so the folder does not have them: ${[...missing].join(', ')}. A version that n8n bundles is not in the store.`,
			);
		}
	}

	async catch(error: Error) {
		this.logError(error);
	}
}
