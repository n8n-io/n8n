import { Args, Flags } from '@oclif/core';

import { parseOptions } from './submit';
import { BaseCommand } from '../../base-command';

export default class PromotionAction extends BaseCommand {
	static override description = 'POC: Run a state-transition action (e.g. approve) on a promotion';

	static override examples = [
		'<%= config.bin %> promotion action prom-abc approve',
		'<%= config.bin %> promotion action prom-abc mark-promoted',
		'<%= config.bin %> promotion action prom-abc resolve-binding --option sourceCredentialId=x --option targetCredentialId=y',
	];

	static override args = {
		id: Args.string({ description: 'Promotion ID', required: true }),
		action: Args.string({ description: 'Action to run (see availableActions)', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		option: Flags.string({
			description: 'Action payload entry as key=value (repeat for multiple)',
			multiple: true,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(PromotionAction);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const payload = flags.option?.length ? parseOptions(flags.option) : undefined;
			const data = await client.runPromotionAction(args.id, args.action, payload);
			this.output(data, flags, { columns: ['id', 'model', 'state'] });
		});
	}
}
