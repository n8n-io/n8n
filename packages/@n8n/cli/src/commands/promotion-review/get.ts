import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionReviewGet extends BaseCommand {
	static override description =
		'Get a promotion review by ID, with its merge request link, branch, requester, approver and state';

	static override examples = [
		'<%= config.bin %> promotion-review get 0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
	];

	static override args = { id: Args.string({ description: 'Review ID', required: true }) };

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { args, flags } = await this.parse(PromotionReviewGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getPromotionReview(args.id), flags);
		});
	}
}
