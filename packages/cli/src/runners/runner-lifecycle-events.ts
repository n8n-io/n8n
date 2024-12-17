import { Service } from 'typedi';

import { TypedEmitter } from '@/typed-emitter';

type RunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': never;
	'runner:timed-out-during-task': never;
};

@Service()
export class RunnerLifecycleEvents extends TypedEmitter<RunnerLifecycleEventMap> {}
