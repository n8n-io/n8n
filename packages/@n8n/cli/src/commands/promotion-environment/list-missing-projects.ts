import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionEnvironmentListMissingProjects extends BaseCommand {
	static override description =
		'List the team projects of the Apply package whose IDs do not exist on this instance. Create them with create-missing-projects before you apply changes to them.';

	static override examples = [
		'<%= config.bin %> promotion-environment list-missing-projects env-1',
	];

	static override args = {
		id: Args.string({ description: 'Apply environment ID', required: true }),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionEnvironmentListMissingProjects);
		await this.execute(async () => {
			const { data } = await this.getClient(flags).listMissingPromotionProjects(args.id);
			this.output(data, flags);
		});
	}
}
