import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

const ACCESS_OPTIONS = ['instanceAdmins', 'projectAdmins', 'projectAdminsAndEditors'];

export default class PromotionSettingsUpdate extends BaseCommand {
	static override description =
		'Update who can promote, approve, and apply in their own projects, and whether every promote needs a review. A setting that you leave out keeps its value.';

	static override examples = [
		'<%= config.bin %> promotion-settings update --who-can-promote=projectAdmins',
		'<%= config.bin %> promotion-settings update --who-can-approve=projectAdminsAndEditors --who-can-apply=instanceAdmins',
		'<%= config.bin %> promotion-settings update --require-approval=alwaysRequired',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		'who-can-promote': Flags.string({
			description: 'Who can promote a project and see its promotion reviews',
			options: ACCESS_OPTIONS,
		}),
		'who-can-approve': Flags.string({
			description: 'Who can see and approve the promotion reviews of a project',
			options: ACCESS_OPTIONS,
		}),
		'who-can-apply': Flags.string({
			description: 'Who can apply changes into a project',
			options: ACCESS_OPTIONS,
		}),
		'require-approval': Flags.string({
			description:
				'Whether every promote needs a review. alwaysRequired pushes every promote to a new branch, and a gitlab provider also opens a merge request.',
			options: ['whenConfigured', 'alwaysRequired'],
		}),
	};

	async run() {
		const { flags } = await this.parse(PromotionSettingsUpdate);
		const changes = {
			whoCanPromote: flags['who-can-promote'],
			whoCanApprove: flags['who-can-approve'],
			whoCanApply: flags['who-can-apply'],
			requireApproval: flags['require-approval'],
		};
		if (Object.values(changes).every((value) => value === undefined)) {
			this.error(
				'Pass at least one of --who-can-promote, --who-can-approve, --who-can-apply, --require-approval',
			);
		}
		await this.execute(async () => {
			// The API keeps the value of a setting that the request leaves out.
			this.output(await this.getClient(flags).updatePromotionSettings(changes), flags);
		});
	}
}
