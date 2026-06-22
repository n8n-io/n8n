import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';

export default class PackageImport extends BaseCommand {
	static override description = 'Import an n8n package (.n8np) into a project';

	static override examples = [
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail',
		'<%= config.bin %> package import --file=export.n8np --project=<id> --conflict-policy=new-version',
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to the .n8np package file', required: true }),
		project: Flags.string({
			description: 'Target project ID (defaults to your personal project)',
		}),
		folder: Flags.string({
			description: 'Target folder ID within the project (defaults to the project root)',
		}),
		conflictPolicy: Flags.string({
			description: 'What to do when a workflow already exists in the target project',
			options: ['new-version', 'fail', 'skip'],
			required: true,
			aliases: ['conflict-policy'],
		}),
		workflowIdPolicy: Flags.string({
			description: 'Whether imported workflows keep their source ID or receive a new one',
			options: ['new', 'source'],
			aliases: ['workflow-id-policy'],
		}),
		credentialMatchingMode: Flags.string({
			description: 'How credential references are matched on the target instance',
			options: ['id-only'],
			aliases: ['credential-matching-mode'],
		}),
		credentialMissingMode: Flags.string({
			description:
				'What to do when a referenced credential cannot be resolved (default on the instance: create-stub)',
			options: ['must-preexist', 'create-stub'],
			aliases: ['credential-missing-mode'],
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageImport);

		if (!fs.existsSync(flags.file)) {
			this.error(`File not found: ${flags.file}`);
		}

		await this.execute(async () => {
			const buffer = fs.readFileSync(flags.file);
			const client = this.getClient(flags);
			let result: Record<string, unknown>;
			try {
				result = await client.importPackage(
					{ buffer, filename: path.basename(flags.file) },
					{
						projectId: flags.project,
						folderId: flags.folder,
						workflowConflictPolicy: flags.conflictPolicy,
						workflowIdPolicy: flags.workflowIdPolicy,
						credentialMatchingMode: flags.credentialMatchingMode,
						credentialMissingMode: flags.credentialMissingMode,
					},
				);
			} catch (error) {
				throw toPackagesError(error);
			}
			this.output(result, flags);
		});
	}
}
