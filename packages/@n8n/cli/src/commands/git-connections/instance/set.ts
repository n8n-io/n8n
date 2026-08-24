import { Flags } from '@oclif/core';

import { BaseCommand } from '../../../base-command';

export default class GitConnectionsInstanceSet extends BaseCommand {
	static override description = 'Update the instance Git connection from JSON';
	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to instance Git connection JSON file' }),
		stdin: Flags.boolean({
			description: 'Read instance Git connection JSON from stdin',
			default: false,
		}),
	};

	async run() {
		const { flags } = await this.parse(GitConnectionsInstanceSet);
		await this.execute(async () => {
			const body = JSON.parse(this.readInput(flags)) as unknown;
			this.output(await this.getClient(flags).updateInstanceGitConnection(body), flags);
		});
	}
}
