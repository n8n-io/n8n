import { BaseCommand } from '../../base-command';

export default class PromotionList extends BaseCommand {
	static override description = 'POC: List promotions';

	static override examples = ['<%= config.bin %> promotion list'];

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { flags } = await this.parse(PromotionList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listPromotions();
			this.output(data, flags, {
				columns: ['id', 'model', 'role', 'unitOfWorkType', 'unitOfWorkId', 'state', 'createdAt'],
			});
		});
	}
}
