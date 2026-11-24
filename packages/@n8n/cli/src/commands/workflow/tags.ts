import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowTags extends BaseCommand {
	static override description = 'Get or set tags on a workflow';

	static override examples = [
		'<%= config.bin %> workflow tags 1234',
		'<%= config.bin %> workflow tags 1234 --set=tagId1,tagId2',
	];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		set: Flags.string({ description: 'Comma-separated tag IDs to set' }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowTags);
		await this.execute(async () => {
			const client = this.getClient(flags);
			if (flags.set) {
				const tagIds = flags.set.split(',').map((s) => s.trim());
				const data = await client.updateWorkflowTags(args.id, tagIds);
				this.output(data, flags, { columns: ['id', 'name'] });
			} else {
				const data = await client.getWorkflowTags(args.id);
				this.output(data, flags, { columns: ['id', 'name'] });
			}
		});
	}
}
