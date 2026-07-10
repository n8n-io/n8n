import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectRemoveMember extends BaseCommand {
	static override description = 'Remove a member from a project';

	static override examples = ['<%= config.bin %> project remove-member proj-abc --user=user-123'];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		user: Flags.string({ description: 'User ID', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectRemoveMember);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.removeProjectMember(args.id, flags.user);
			this.succeed(`User ${flags.user} removed from project ${args.id}.`, flags, {
				projectId: args.id,
				userId: flags.user,
				removed: true,
			});
		});
	}
}
