import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { assertNodeContractsEnabled } from '@/node-contracts-run';
import { NodeContractsSync } from '@/node-contracts-sync';

const flagsSchema = z.object({
	registry: z
		.string()
		.describe(
			'Fetches missing locked versions from this registry: a static store at https://… or file://… Default: N8N_NODE_CONTRACTS_REGISTRY_URL',
		)
		.optional(),
});

@Command({
	name: 'contracts:sync',
	description:
		'Puts the locked versions of all saved workflows into the node contracts store, from a registry or a folder',
	examples: [
		'',
		'--registry=file:///mnt/node-contracts',
		'--registry=https://contracts.example.com',
	],
	flagsSchema,
})
export class ContractsSyncCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		assertNodeContractsEnabled('contracts:sync');
		const { added, failed, unsupported } = await Container.get(NodeContractsSync).run({
			registryUrl: this.flags.registry,
			refreshNodeTypes: false,
		});
		this.logger.info(
			`Added ${added.length} versions. ${failed.length} locked nodes have no version. ${unsupported.length} locked nodes need a Node Contract version that this host does not run.`,
		);
		if (failed.length > 0 || unsupported.length > 0) {
			throw new UserError('Some saved workflows cannot run their locked node versions');
		}
	}

	async catch(error: Error) {
		this.logError(error);
	}
}
