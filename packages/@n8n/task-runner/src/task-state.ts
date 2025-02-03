import * as a from 'node:assert';

export type TaskStatus =
	| 'waitingForSettings'
	| 'running'
	| 'aborting:cancelled'
	| 'aborting:timeout';

export type TaskStateOpts = {
	taskId: string;
	timeoutInS: number;
	onTimeout: () => void;
};

/**
 * The state of a task. The task can be in one of the following states:
 * - waitingForSettings: The task is waiting for settings from the broker
 * - running: The task is currently running
 * - aborting:cancelled: The task was canceled by the broker and is being aborted
 * - aborting:timeout: The task took too long to complete and is being aborted
 *
 * The task is discarded once it reaches an end state.
 *
 * The class only holds the state, and does not have any logic.
 *
 * The task has the following lifecycle:
 *
 *                      ┌───┐
 *                      └───┘
 *                        │
 *               broker:taskofferaccept : create task state
 *                        │
 *                        ▼
 *               ┌────────────────────┐  broker:taskcancel / timeout
 *               │ waitingForSettings ├──────────────────────────────────┐
 *               └────────┬───────────┘                                  │
 *                        │                                              │
 *                broker:tasksettings                                    │
 *                        │                                              │
 *                        ▼                                              │
 *                 ┌───────────────┐            ┌────────────────────┐   │
 *                 │    running    │            │  aborting:timeout  │   │
 *                 │               │  timeout   │                    │   │
 *         ┌───────┤- execute task ├───────────►│- fire abort signal │   │
 *         │       └──────┬────────┘            └──────────┬─────────┘   │
 *         │              │                                │             │
 *         │       broker:taskcancel                       │             │
 *  Task execution        │                          Task execution      │
 *  resolves / rejects    │                          resolves / rejects  │
 *         │              ▼                                │             │
 *         │    ┌─────────────────────┐                    │             │
 *         │    │ aborting:cancelled  │                    │             │
 *         │    │                     │                    │             │
 *         │    │- fire abort signal  │                    │             │
 *         │    └──────────┬──────────┘                    │             │
 *         │        Task execution                         │             │
 *         │        resolves / rejects                     │             │
 *         │               │                               │             │
 *         │               ▼                               │             │
 *         │              ┌──┐                             │             │
 *         └─────────────►│  │◄────────────────────────────┴─────────────┘
 *                        └──┘
 */
export class TaskState {
	status: TaskStatus = 'waitingForSettings';

	readonly taskId: string;

	/** Controller for aborting the execution of the task */
	readonly abortController = new AbortController();

	/** Timeout timer for the task */
	private timeoutTimer: NodeJS.Timeout | undefined;

	constructor(opts: TaskStateOpts) {
		this.taskId = opts.taskId;
		this.timeoutTimer = setTimeout(opts.onTimeout, opts.timeoutInS * 1000);
	}

	/** Cleans up any resources before the task can be removed */
	cleanup() {
		clearTimeout(this.timeoutTimer);
		this.timeoutTimer = undefined;
	}

	/** Custom JSON serialization for the task state for logging purposes */
	toJSON() {
		return `[Task ${this.taskId} (${this.status})]`;
	}

	/**
	 * Executes the function matching the current task status
	 *
	 * @example
	 * ```ts
	 * taskState.caseOf({
	 * 	 waitingForSettings: () => {...},
	 * 	 running: () => {...},
	 * 	 aborting:cancelled: () => {...},
	 * 	 aborting:timeout: () => {...},
	 * });
	 * ```
	 */
	async caseOf(
		conditions: Record<TaskStatus, (taskState: TaskState) => void | Promise<void> | never>,
	) {
		if (!conditions[this.status]) {
			TaskState.throwUnexpectedTaskStatus(this);
		}

		return await conditions[this.status](this);
	}

	/** Throws an error that the task status is unexpected */
	static throwUnexpectedTaskStatus = (taskState: TaskState) => {
		a.fail(`Unexpected task status: ${JSON.stringify(taskState)}`);
	};
}
