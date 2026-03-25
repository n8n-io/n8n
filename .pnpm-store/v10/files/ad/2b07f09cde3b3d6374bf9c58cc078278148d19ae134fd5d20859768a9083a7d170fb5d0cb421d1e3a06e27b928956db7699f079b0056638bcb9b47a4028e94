import { isGraphBubbleUp, isGraphInterrupt } from "../errors.js";
import { CONFIG_KEY_ABORT_SIGNALS, CONFIG_KEY_CALL, CONFIG_KEY_SCRATCHPAD, ERROR, INTERRUPT, NO_WRITES, RESUME, RETURN, TAG_HIDDEN } from "../constants.js";
import { Call } from "./types.js";
import { combineAbortSignals, patchConfigurable } from "./utils/index.js";
import { _runWithRetry } from "./retry.js";

//#region src/pregel/runner.ts
const PROMISE_ADDED_SYMBOL = Symbol.for("promiseAdded");
function createPromiseBarrier() {
	const barrier = {
		next: () => void 0,
		wait: Promise.resolve(PROMISE_ADDED_SYMBOL)
	};
	function waitHandler(resolve) {
		barrier.next = () => {
			barrier.wait = new Promise(waitHandler);
			resolve(PROMISE_ADDED_SYMBOL);
		};
	}
	barrier.wait = new Promise(waitHandler);
	return barrier;
}
/**
* Responsible for handling task execution on each tick of the {@link PregelLoop}.
*/
var PregelRunner = class {
	nodeFinished;
	loop;
	/**
	* Construct a new PregelRunner, which executes tasks from the provided PregelLoop.
	* @param loop - The PregelLoop that produces tasks for this runner to execute.
	*/
	constructor({ loop, nodeFinished }) {
		this.loop = loop;
		this.nodeFinished = nodeFinished;
	}
	/**
	* Execute tasks from the current step of the PregelLoop.
	*
	* Note: this method does NOT call {@link PregelLoop}#tick. That must be handled externally.
	* @param options - Options for the execution.
	*/
	async tick(options = {}) {
		const { timeout, retryPolicy, onStepWrite, maxConcurrency } = options;
		const nodeErrors = /* @__PURE__ */ new Set();
		let graphBubbleUp;
		const exceptionSignalController = new AbortController();
		const exceptionSignal = exceptionSignalController.signal;
		const stepTimeoutSignal = timeout ? AbortSignal.timeout(timeout) : void 0;
		const pendingTasks = Object.values(this.loop.tasks).filter((t) => t.writes.length === 0);
		const { signals, disposeCombinedSignal } = this._initializeAbortSignals({
			exceptionSignal,
			stepTimeoutSignal,
			signal: options.signal
		});
		const taskStream = this._executeTasksWithRetry(pendingTasks, {
			signals,
			retryPolicy,
			maxConcurrency
		});
		for await (const { task, error, signalAborted } of taskStream) {
			this._commit(task, error);
			if (isGraphInterrupt(error)) graphBubbleUp = error;
			else if (isGraphBubbleUp(error) && !isGraphInterrupt(graphBubbleUp)) graphBubbleUp = error;
			else if (error && (nodeErrors.size === 0 || !signalAborted)) {
				exceptionSignalController.abort();
				nodeErrors.add(error);
			}
		}
		disposeCombinedSignal?.();
		onStepWrite?.(this.loop.step, Object.values(this.loop.tasks).map((task) => task.writes).flat());
		if (nodeErrors.size === 1) throw Array.from(nodeErrors)[0];
		else if (nodeErrors.size > 1) throw new AggregateError(Array.from(nodeErrors), `Multiple errors occurred during superstep ${this.loop.step}. See the "errors" field of this exception for more details.`);
		if (isGraphInterrupt(graphBubbleUp)) throw graphBubbleUp;
		if (isGraphBubbleUp(graphBubbleUp) && this.loop.isNested) throw graphBubbleUp;
	}
	/**
	* Initializes the current AbortSignals for the PregelRunner, handling the various ways that
	* AbortSignals must be chained together so that the PregelLoop can be interrupted if necessary
	* while still allowing nodes to gracefully exit.
	*
	* This method must only be called once per PregelRunner#tick. It has the side effect of updating
	* the PregelLoop#config with the new AbortSignals so they may be propagated correctly to future
	* ticks and subgraph calls.
	*
	* @param options - Options for the initialization.
	* @returns The current abort signals.
	* @internal
	*/
	_initializeAbortSignals({ exceptionSignal, stepTimeoutSignal, signal }) {
		const previousSignals = this.loop.config.configurable?.[CONFIG_KEY_ABORT_SIGNALS] ?? {};
		const externalAbortSignal = previousSignals.externalAbortSignal ?? signal;
		const timeoutAbortSignal = stepTimeoutSignal ?? previousSignals.timeoutAbortSignal;
		const { signal: composedAbortSignal, dispose: disposeCombinedSignal } = combineAbortSignals(externalAbortSignal, timeoutAbortSignal, exceptionSignal);
		const signals = {
			externalAbortSignal,
			timeoutAbortSignal,
			composedAbortSignal
		};
		this.loop.config = patchConfigurable(this.loop.config, { [CONFIG_KEY_ABORT_SIGNALS]: signals });
		return {
			signals,
			disposeCombinedSignal
		};
	}
	/**
	* Concurrently executes tasks with the requested retry policy, yielding a {@link SettledPregelTask} for each task as it completes.
	* @param tasks - The tasks to execute.
	* @param options - Options for the execution.
	*/
	async *_executeTasksWithRetry(tasks, options) {
		const { retryPolicy, maxConcurrency, signals } = options ?? {};
		const barrier = createPromiseBarrier();
		const executingTasksMap = {};
		const thisCall = {
			executingTasksMap,
			barrier,
			retryPolicy,
			scheduleTask: async (task, writeIdx, call$1) => this.loop.acceptPush(task, writeIdx, call$1)
		};
		if (signals?.composedAbortSignal?.aborted) throw new Error("Abort");
		let startedTasksCount = 0;
		let listener;
		const timeoutOrCancelSignal = combineAbortSignals(signals?.externalAbortSignal, signals?.timeoutAbortSignal);
		const abortPromise = timeoutOrCancelSignal.signal ? new Promise((_resolve, reject) => {
			listener = () => reject(/* @__PURE__ */ new Error("Abort"));
			timeoutOrCancelSignal.signal?.addEventListener("abort", listener, { once: true });
		}) : void 0;
		while ((startedTasksCount === 0 || Object.keys(executingTasksMap).length > 0) && tasks.length) {
			for (; Object.values(executingTasksMap).length < (maxConcurrency ?? tasks.length) && startedTasksCount < tasks.length; startedTasksCount += 1) {
				const task = tasks[startedTasksCount];
				executingTasksMap[task.id] = _runWithRetry(task, retryPolicy, { [CONFIG_KEY_CALL]: call?.bind(thisCall, this, task) }, signals?.composedAbortSignal).catch((error) => {
					return {
						task,
						error,
						signalAborted: signals?.composedAbortSignal?.aborted
					};
				});
			}
			const settledTask = await Promise.race([
				...Object.values(executingTasksMap),
				...abortPromise ? [abortPromise] : [],
				barrier.wait
			]);
			if (settledTask === PROMISE_ADDED_SYMBOL) continue;
			yield settledTask;
			if (listener != null) {
				timeoutOrCancelSignal.signal?.removeEventListener("abort", listener);
				timeoutOrCancelSignal.dispose?.();
			}
			delete executingTasksMap[settledTask.task.id];
		}
	}
	/**
	* Determines what writes to apply based on whether the task completed successfully, and what type of error occurred.
	*
	* Throws an error if the error is a {@link GraphBubbleUp} error and {@link PregelLoop}#isNested is true.
	*
	* @param task - The task to commit.
	* @param error - The error that occurred, if any.
	*/
	_commit(task, error) {
		if (error !== void 0) if (isGraphInterrupt(error)) {
			if (error.interrupts.length) {
				const interrupts = error.interrupts.map((interrupt) => [INTERRUPT, interrupt]);
				const resumes = task.writes.filter((w) => w[0] === RESUME);
				if (resumes.length) interrupts.push(...resumes);
				this.loop.putWrites(task.id, interrupts);
			}
		} else if (isGraphBubbleUp(error) && task.writes.length) this.loop.putWrites(task.id, task.writes);
		else this.loop.putWrites(task.id, [[ERROR, {
			message: error.message,
			name: error.name
		}]]);
		else {
			if (this.nodeFinished && (task.config?.tags == null || !task.config.tags.includes(TAG_HIDDEN))) this.nodeFinished(String(task.name));
			if (task.writes.length === 0) task.writes.push([NO_WRITES, null]);
			this.loop.putWrites(task.id, task.writes);
		}
	}
};
async function call(runner, task, func, name, input, options = {}) {
	const scratchpad = task.config?.configurable?.[CONFIG_KEY_SCRATCHPAD];
	if (!scratchpad) throw new Error(`BUG: No scratchpad found on task ${task.name}__${task.id}`);
	const cnt = scratchpad.callCounter;
	scratchpad.callCounter += 1;
	const wcall = new Call({
		func,
		name,
		input,
		cache: options.cache,
		retry: options.retry,
		callbacks: options.callbacks
	});
	const nextTask = await this.scheduleTask(task, cnt, wcall);
	if (!nextTask) return void 0;
	const existingPromise = this.executingTasksMap[nextTask.id];
	if (existingPromise !== void 0) return existingPromise;
	if (nextTask.writes.length > 0) {
		const returns = nextTask.writes.filter(([c]) => c === RETURN);
		const errors = nextTask.writes.filter(([c]) => c === ERROR);
		if (returns.length > 0) {
			if (returns.length === 1) return Promise.resolve(returns[0][1]);
			throw new Error(`BUG: multiple returns found for task ${nextTask.name}__${nextTask.id}`);
		}
		if (errors.length > 0) {
			if (errors.length === 1) {
				const errorValue = errors[0][1];
				const error = errorValue instanceof Error ? errorValue : new Error(String(errorValue));
				return Promise.reject(error);
			}
			throw new Error(`BUG: multiple errors found for task ${nextTask.name}__${nextTask.id}`);
		}
		return void 0;
	} else {
		const prom = _runWithRetry(nextTask, options.retry, { [CONFIG_KEY_CALL]: call.bind(this, runner, nextTask) });
		this.executingTasksMap[nextTask.id] = prom;
		this.barrier.next();
		return prom.then(({ result, error }) => {
			if (error) return Promise.reject(error);
			return result;
		});
	}
}

//#endregion
export { PregelRunner };
//# sourceMappingURL=runner.js.map