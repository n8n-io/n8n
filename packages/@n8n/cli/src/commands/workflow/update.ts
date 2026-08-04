import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowUpdate extends BaseCommand {
	static override description = 'Update a workflow from a JSON file';

	static override examples = [
		'<%= config.bin %> workflow update 1234 --file=workflow.json',
		'cat workflow.json | <%= config.bin %> workflow update 1234 --stdin',
	];

	static override args = {
		id: Args.string({ description: 'Workflow ID', required: true }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to workflow JSON file' }),
		stdin: Flags.boolean({ description: 'Read workflow JSON from stdin', default: false }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WorkflowUpdate);
		await this.execute(async () => {
			const raw = this.readInput(flags);
			const body = JSON.parse(raw) as unknown;
			const client = this.getClient(flags);
			const data = await client.updateWorkflow(args.id, body);
			this.output(data, flags);
		});
	}
}
