import { OperationalError } from 'n8n-workflow';

export class TaskRunnerNotConnectedError extends OperationalError {
	description: string;

	constructor(taskType: string) {
		super('No task runner connected');

		this.description = [
			`No task runner for "${taskType}" tasks has connected to this n8n instance since it started.`,
			'Task runners run as a separate process. Start the task runner launcher (the n8nio/runners image), point it at this instance and set the same N8N_RUNNERS_AUTH_TOKEN on both. See https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-task-runners',
		].join('<br/><br/>');
	}
}
