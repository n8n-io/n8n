import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class AiThreads extends BaseCommand {
	static override description = 'List AI conversation threads';

	static override examples = [
		'<%= config.bin %> ai threads',
		'<%= config.bin %> ai threads --format=json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		limit: Flags.integer({ description: 'Maximum number of threads', default: 20 }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(AiThreads);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.listAiThreads();
			this.output(data.threads, flags, {
				columns: ['id', 'title', 'createdAt', 'updatedAt'],
			});
		});
	}
}
