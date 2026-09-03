import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

type RunnerIdentity = { runnerId: string };

export type TaskRunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': RunnerIdentity;
	'runner:timed-out-during-task': RunnerIdentity;
	'runner:unresponsive': RunnerIdentity;
};

@Service()
export class TaskRunnerLifecycleEvents extends TypedEmitter<TaskRunnerLifecycleEventMap> {}
