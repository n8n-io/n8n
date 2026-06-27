import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';

export default class PackageExport extends BaseCommand {
	static override description = 'Export workflows as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --workflow-id=abc --output=export.n8np',
		'<%= config.bin %> package export -w abc -w def -o team.n8np',
		'<%= config.bin %> package export --folder-id=xyz -o folders.n8np',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		workflowId: Flags.string({
			char: 'w',
			description: 'Workflow ID to include (repeat for multiple)',
			multiple: true,
			aliases: ['workflow-id'],
		}),
		folderId: Flags.string({
			char: 'f',
			description: 'Folder ID to include with its nested folders (repeat for multiple)',
			multiple: true,
			aliases: ['folder-id'],
		}),
		output: Flags.string({
			char: 'o',
			description: 'File to write the package to',
			default: 'export.n8np',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		const workflowIds = flags.workflowId ?? [];
		const folderIds = flags.folderId ?? [];

		if (workflowIds.length === 0 && folderIds.length === 0) {
			this.error('Provide at least one --workflow-id or --folder-id to export.');
		}

		await this.execute(async () => {
			const client = this.getClient(flags);
			let archive: Buffer;
			try {
				archive = await client.exportPackage(workflowIds, folderIds);
			} catch (error) {
				throw toPackagesError(error);
			}
			fs.writeFileSync(flags.output, archive);
			this.succeed(
				`Exported ${workflowIds.length} workflow(s) and ${folderIds.length} folder(s) to ${flags.output}`,
				flags,
				{ output: flags.output, workflowIds, folderIds },
			);
		});
	}
}
