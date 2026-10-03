import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { readdir, readFile } from 'fs/promises';
import { UserError } from 'n8n-workflow';
import path from 'path';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

import { NodeContractsStore } from '@/node-contracts-registry';
import { NodeContractsSync } from '@/node-contracts-sync';

const flagsSchema = z.object({
	dir: z
		.string()
		.describe('Adds each contract package tarball (*.tgz) in this directory to the store')
		.optional(),
	registry: z
		.string()
		.describe(
			'Fetches missing locked bundles from this registry. Default: N8N_NODE_CONTRACTS_REGISTRY_URL, or no registry with --dir',
		)
		.optional(),
});

@Command({
	name: 'contracts:sync',
	description:
		'Seeds the node contracts store from a directory or a registry, then checks the locked bundles of all saved workflows',
	examples: ['', '--dir=/mnt/node-contracts', '--registry=https://npm.example.com'],
	flagsSchema,
})
export class ContractsSyncCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { dir, registry } = this.flags;
		// Without a registry, an air-gapped host checks the store and makes no request.
		const registryUrl = registry ?? (dir === undefined ? undefined : '');
		if (dir !== undefined) await this.addDirectory(dir, registryUrl);

		const { added, failed, unsupported } = await Container.get(NodeContractsSync).run({
			registryUrl,
			refreshNodeTypes: false,
		});
		this.logger.info(
			`Added ${added.length} bundles. ${failed.length} locked nodes have no bundle. ${unsupported.length} locked nodes need a Node Contract version that this host does not run.`,
		);
		if (failed.length > 0 || unsupported.length > 0) {
			throw new UserError('Some saved workflows cannot run their locked node versions');
		}
	}

	private async addDirectory(dir: string, registryUrl: string | undefined) {
		const store = await Container.get(NodeContractsStore).open(registryUrl);
		const files = (await readdir(dir)).filter((file) => file.endsWith('.tgz'));
		for (const file of files) {
			try {
				const { id, semver } = await store.add(await readFile(path.join(dir, file)));
				this.logger.info(`Added ${id}@${semver} from ${file}`);
			} catch (error) {
				this.logger.warn(
					`Skipped ${file}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	async catch(error: Error) {
		this.logError(error);
	}
}
