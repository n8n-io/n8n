import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter';

type RunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': never;
	'runner:timed-out-during-task': never;
};

@Service()
export class RunnerLifecycleEvents extends TypedEmitter<RunnerLifecycleEventMap> {}
