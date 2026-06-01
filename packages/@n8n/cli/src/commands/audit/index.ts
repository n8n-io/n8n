import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Audit extends BaseCommand {
	static override description = 'Generate a security audit report';

	static override examples = [
		'<%= config.bin %> audit',
		'<%= config.bin %> audit --categories=credentials,nodes',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		categories: Flags.string({
			description:
				'Comma-separated audit categories (credentials, database, nodes, filesystem, instance)',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Audit);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const categories = flags.categories?.split(',').map((s) => s.trim());
			const data = await client.audit(categories);
			this.output(data, flags);
		});
	}
}
