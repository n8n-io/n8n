import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionConnectionRemoveProject extends BaseCommand {
	static override description = 'Unlink a project from a promotion connection';

	static override examples = [
		'<%= config.bin %> promotion-connection remove-project conn-1 proj-abc',
	];

	static override args = {
		id: Args.string({ description: 'Connection ID', required: true }),
		projectId: Args.string({ description: 'Project ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionConnectionRemoveProject);
		await this.execute(async () => {
			await this.getClient(flags).removeProjectFromPromotionConnection(args.id, args.projectId);
			this.succeed(
				`Project ${args.projectId} unlinked from promotion connection ${args.id}.`,
				flags,
				{ id: args.id, projectId: args.projectId, removed: true },
			);
		});
	}
}
