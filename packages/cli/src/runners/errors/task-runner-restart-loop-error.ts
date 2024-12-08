import { ApplicationError } from 'n8n-workflow';

export class TaskRunnerRestartLoopError extends ApplicationError {
	constructor(
		public readonly howManyTimes: number,
		public readonly timePeriodMs: number,
	) {
		const message = `Task runner has restarted ${howManyTimes} times within ${timePeriodMs / 1000} seconds`;

		super(message, {
			level: 'fatal',
		});
	}
}
