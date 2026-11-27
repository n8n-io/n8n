import { BaseCommand } from '../../base-command';

export default class PromotionSettingsGet extends BaseCommand {
	static override description = 'Get who can promote, approve, and apply in their own projects';

	static override examples = ['<%= config.bin %> promotion-settings get'];

	static override flags = { ...BaseCommand.baseFlags };

	async run() {
		const { flags } = await this.parse(PromotionSettingsGet);
		await this.execute(async () => {
			this.output(await this.getClient(flags).getPromotionSettings(), flags);
		});
	}
}
