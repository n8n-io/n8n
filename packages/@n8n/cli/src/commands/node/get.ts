import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class NodeGet extends BaseCommand {
	static override description = 'Get the full schema for a single node by id';

	static override examples = [
		'<%= config.bin %> node get slack',
		'<%= config.bin %> node get n8n-nodes-base.slack',
		'<%= config.bin %> node get @n8n/n8n-nodes-langchain.agent --format=json',
	];

	static override args = {
		id: Args.string({
			description:
				'Node id. Accepts a bare name ("slack") or a fully-qualified id ("n8n-nodes-base.slack").',
			required: true,
		}),
	};

	static override flags = { ...BaseCommand.baseFlags };

	async run(): Promise<void> {
		const { args, flags } = await this.parse(NodeGet);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const data = await client.getNode(args.id);
			this.output(data, flags);
		});
	}
}
