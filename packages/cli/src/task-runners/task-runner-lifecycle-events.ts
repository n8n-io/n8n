import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter';

type TaskRunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': never;
	'runner:timed-out-during-task': never;
};

@Service()
export class TaskRunnerLifecycleEvents extends TypedEmitter<TaskRunnerLifecycleEventMap> {}
