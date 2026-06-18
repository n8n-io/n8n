import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';

export default class PackageExport extends BaseCommand {
	static override description = 'Export workflows as an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package export --workflow-id=abc --output=export.n8np',
		'<%= config.bin %> package export -w abc -w def -o team.n8np',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		workflowId: Flags.string({
			char: 'w',
			description: 'Workflow ID to include (repeat for multiple)',
			multiple: true,
			required: true,
			aliases: ['workflow-id'],
		}),
		output: Flags.string({
			char: 'o',
			description: 'File to write the package to',
			default: 'export.n8np',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageExport);
		await this.execute(async () => {
			const client = this.getClient(flags);
			let archive: Buffer;
			try {
				archive = await client.exportPackage(flags.workflowId);
			} catch (error) {
				throw toPackagesError(error);
			}
			fs.writeFileSync(flags.output, archive);
			this.succeed(`Exported ${flags.workflowId.length} workflow(s) to ${flags.output}`, flags, {
				output: flags.output,
				workflowIds: flags.workflowId,
			});
		});
	}
}
