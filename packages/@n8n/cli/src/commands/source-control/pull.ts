import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class SourceControlPull extends BaseCommand {
	static override description = 'Pull changes from remote source control';

	static override examples = [
		'<%= config.bin %> source-control pull',
		'<%= config.bin %> source-control pull --force',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		force: Flags.boolean({ description: 'Force pull', default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(SourceControlPull);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.sourceControlPull({ force: flags.force });
			this.output(data, flags);
		});
	}
}
