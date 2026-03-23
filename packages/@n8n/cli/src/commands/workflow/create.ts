import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class WorkflowCreate extends BaseCommand {
	static override description = 'Create a workflow from a JSON file';

	static override examples = [
		'<%= config.bin %> workflow create --file=workflow.json',
		'cat workflow.json | <%= config.bin %> workflow create --stdin',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to workflow JSON file' }),
		stdin: Flags.boolean({ description: 'Read workflow JSON from stdin', default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(WorkflowCreate);
		await this.execute(async () => {
			const raw = this.readInput(flags);
			const body = JSON.parse(raw) as unknown;
			const client = this.getClient(flags);
			const data = await client.createWorkflow(body);
			this.output(data, flags);
		});
	}
}
