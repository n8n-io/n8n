import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ProjectAddMember extends BaseCommand {
	static override description = 'Add a member to a project';

	static override examples = [
		'<%= config.bin %> project add-member proj-abc --user=user-123 --role=project:editor',
	];

	static override args = {
		id: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		user: Flags.string({ description: 'User ID', required: true }),
		role: Flags.string({ description: 'Role (e.g. project:editor)', required: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ProjectAddMember);
		await this.execute(async () => {
			const client = this.getClient(flags);
			await client.addProjectMember(args.id, flags.user, flags.role);
			this.succeed(`User ${flags.user} added to project ${args.id}.`, flags, {
				projectId: args.id,
				userId: flags.user,
				role: flags.role,
			});
		});
	}
}
