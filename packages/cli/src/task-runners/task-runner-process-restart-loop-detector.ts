import { Time } from '@n8n/constants';

import { TaskRunnerRestartLoopError } from '@/task-runners/errors/task-runner-restart-loop-error';
import type { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { TypedEmitter } from '@/typed-emitter';

const MAX_RESTARTS = 5;
const RESTARTS_WINDOW = 2 * Time.seconds.toMilliseconds;

type TaskRunnerProcessRestartLoopDetectorEventMap = {
	'restart-loop-detected': TaskRunnerRestartLoopError;
};

/**
 * A class to monitor the task runner process for restart loops
 */
export class TaskRunnerProcessRestartLoopDetector extends TypedEmitter<TaskRunnerProcessRestartLoopDetectorEventMap> {
	/**
	 * How many times the process needs to restart for it to be detected
	 * being in a loop.
	 */
	private readonly maxCount = MAX_RESTARTS;

	/**
	 * The time interval in which the process needs to restart `maxCount` times
	 * to be detected as being in a loop.
	 */
	private readonly restartsWindow = RESTARTS_WINDOW;

	private numRestarts = 0;

	/** Time when the first restart of a loop happened within a time window */
	private firstRestartedAt = Date.now();

	constructor(private readonly taskRunnerProcess: TaskRunnerProcess) {
		super();

		this.taskRunnerProcess.on('exit', () => {
			this.increment();

			if (this.isMaxCountExceeded()) {
				this.emit(
					'restart-loop-detected',
					new TaskRunnerRestartLoopError(this.numRestarts, this.msSinceFirstIncrement()),
				);
			}
		});
	}

	/**
	 * Increments the counter
	 */
	private increment() {
		const now = Date.now();
		if (now > this.firstRestartedAt + this.restartsWindow) {
			this.reset();
		}

		this.numRestarts++;
	}

	private reset() {
		this.numRestarts = 0;
		this.firstRestartedAt = Date.now();
	}

	private isMaxCountExceeded() {
		return this.numRestarts >= this.maxCount;
	}

	private msSinceFirstIncrement() {
		return Date.now() - this.firstRestartedAt;
	}
}
