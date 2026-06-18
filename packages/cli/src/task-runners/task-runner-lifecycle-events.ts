import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

type TaskRunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': never;
	'runner:timed-out-during-task': never;
	'runner:unresponsive': { runnerId: string };
};

@Service()
export class TaskRunnerLifecycleEvents extends TypedEmitter<TaskRunnerLifecycleEventMap> {}
