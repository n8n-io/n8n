import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class PromotionReviewList extends BaseCommand {
	static override description =
		'List the promotion reviews that your Inbox shows. The newest activity comes first.';

	static override examples = [
		'<%= config.bin %> promotion-review list',
		'<%= config.bin %> promotion-review list --state=closed --limit=20',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		state: Flags.option({
			description: 'Open or closed reviews, as the Inbox tabs show them (default: open)',
			options: ['open', 'closed'] as const,
		})(),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run() {
		const { flags } = await this.parse(PromotionReviewList);
		await this.execute(async () => {
			const data = await this.getClient(flags).listPromotionReviews(flags.state, flags.limit);
			this.output(data, flags, {
				columns: [
					'id',
					'reviewState',
					'title',
					'branchName',
					'requester.email',
					'approver.email',
					'webUrl',
				],
			});
		});
	}
}
