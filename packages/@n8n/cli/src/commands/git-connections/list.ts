import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class GitConnectionsList extends BaseCommand {
	static override description = 'List Git connections';
	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { flags } = await this.parse(GitConnectionsList);
		await this.execute(async () => {
			const data = await this.getClient(flags).listGitConnections(flags.limit);
			this.output(data, flags, {
				columns: ['id', 'name', 'repositoryUrl', 'branchName', 'connectionType'],
			});
		});
	}
}
