import { Time } from '@/constants';
import { TaskRunnerRestartLoopError } from '@/runners/errors/task-runner-restart-loop-error';
import type { TaskRunnerProcess } from '@/runners/task-runner-process';
import { TypedEmitter } from '@/typed-emitter';

const RESTART_LOOP_COUNT_LIMIT = 5;
const RESTART_LOOP_TIME_LIMIT = 5 * Time.seconds.toMilliseconds;

export type TaskRunnerProcessRestartLoopDetectorEventMap = {
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
	private readonly maxCount = RESTART_LOOP_COUNT_LIMIT;

	/**
	 * The time interval in which the process needs to restart `maxCount` times
	 * to be detected as being in a loop.
	 */
	private readonly resetTimeInMs = RESTART_LOOP_TIME_LIMIT;

	private counter = 0;

	/** Time when the first restart of a loop happened */
	private firstIncrementTime = Date.now();

	constructor(private readonly taskRunnerProcess: TaskRunnerProcess) {
		super();

		this.taskRunnerProcess.on('exit', () => {
			this.increment();

			if (this.isMaxCountExceeded()) {
				this.emit(
					'restart-loop-detected',
					new TaskRunnerRestartLoopError(this.counter, this.msSinceFirstIncrement()),
				);
			}
		});
	}

	/**
	 * Increments the counter
	 */
	private increment() {
		const now = Date.now();
		if (now > this.firstIncrementTime + this.resetTimeInMs) {
			this.reset();
		}

		this.counter++;
	}

	private reset() {
		this.counter = 0;
		this.firstIncrementTime = Date.now();
	}

	private isMaxCountExceeded() {
		return this.counter >= this.maxCount;
	}

	private msSinceFirstIncrement() {
		return Date.now() - this.firstIncrementTime;
	}
}
