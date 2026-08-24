import { BaseCommand } from '../../../base-command';

export default class GitConnectionsInstanceGet extends BaseCommand {
	static override description = 'Get the instance Git connection';
	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { flags } = await this.parse(GitConnectionsInstanceGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getInstanceGitConnection(), flags);
		});
	}
}
