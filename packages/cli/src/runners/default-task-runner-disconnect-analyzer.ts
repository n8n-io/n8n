import { Service } from 'typedi';

import { TaskRunnerDisconnectedError } from './errors/task-runner-disconnected-error';
import type { DisconnectAnalyzer } from './runner-types';
import type { TaskRunner } from './task-broker.service';

/**
 * Analyzes the disconnect reason of a task runner to provide a more
 * meaningful error message to the user.
 */
@Service()
export class DefaultTaskRunnerDisconnectAnalyzer implements DisconnectAnalyzer {
	async determineDisconnectReason(runnerId: TaskRunner['id']): Promise<Error> {
		return new TaskRunnerDisconnectedError(runnerId);
	}
}
