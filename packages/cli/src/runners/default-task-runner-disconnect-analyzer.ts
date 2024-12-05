import { Service } from 'typedi';

import config from '@/config';

import { TaskRunnerDisconnectedError } from './errors/task-runner-disconnected-error';
import { TaskRunnerFailedHeartbeatError } from './errors/task-runner-failed-heartbeat.error';
import type { DisconnectAnalyzer, DisconnectErrorOptions } from './runner-types';

/**
 * Analyzes the disconnect reason of a task runner to provide a more
 * meaningful error message to the user.
 */
@Service()
export class DefaultTaskRunnerDisconnectAnalyzer implements DisconnectAnalyzer {
	get isCloudDeployment() {
		return config.get('deployment.type') === 'cloud';
	}

	async toDisconnectError(opts: DisconnectErrorOptions): Promise<Error> {
		const { reason, heartbeatInterval } = opts;

		if (reason === 'failed-heartbeat-check' && heartbeatInterval) {
			return new TaskRunnerFailedHeartbeatError(
				heartbeatInterval,
				config.get('deployment.type') !== 'cloud',
			);
		}

		return new TaskRunnerDisconnectedError(
			opts.runnerId ?? 'Unknown runner ID',
			this.isCloudDeployment,
		);
	}
}
