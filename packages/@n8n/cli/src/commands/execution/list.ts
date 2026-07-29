import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class ExecutionList extends BaseCommand {
	static override description = 'List executions';

	static override examples = [
		'<%= config.bin %> execution list',
		'<%= config.bin %> execution list --workflow=1234 --status=error --limit=10',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		workflow: Flags.string({ description: 'Filter by workflow ID' }),
		status: Flags.string({
			description: 'Filter by status',
			options: ['canceled', 'error', 'running', 'success', 'waiting'],
		}),
		limit: Flags.integer({ description: 'Maximum number of results' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ExecutionList);
		await this.execute(async () => {
			const client = this.getClient(flags);
			const query: Record<string, string> = {};
			if (flags.workflow) query.workflowId = flags.workflow;
			if (flags.status) query.status = flags.status;

			const data = await client.listExecutions(query, flags.limit);
			this.output(data, flags, {
				columns: ['id', 'workflowId', 'status', 'startedAt', 'stoppedAt'],
			});
		});
	}
}
