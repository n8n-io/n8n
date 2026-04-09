declare function fastq<C, T = any, R = any>(context: C, worker: fastq.worker<C, T, R>, concurrency: number): fastq.queue<T, R>
declare function fastq<C, T = any, R = any>(worker: fastq.worker<C, T, R>, concurrency: number): fastq.queue<T, R>

declare namespace fastq {
  type worker<C, T = any, R = any> = (this: C, task: T, cb: fastq.done<R>) => void
  type asyncWorker<C, T = any, R = any> = (this: C, task: T) => Promise<R>
  type done<R = any> = (err: Error | null, result?: R) => void
  type errorHandler<T = any> = (err: Error, task: T) => void

  interface queue<T = any, R = any> {
    /** Add a task at the end of the queue. `done(err, result)` will be called when the task was processed. */
    push(task: T, done?: done<R>): void
    /** Add a task at the beginning of the queue. `done(err, result)` will be called when the task was processed. */
    unshift(task: T, done?: done<R>): void
    /** Pause the processing of tasks. Currently worked tasks are not stopped. */
    pause(): any
    /** Resume the processing of tasks. */
    resume(): any
    running(): number
    /** Returns `false` if there are tasks being processed or waiting to be processed. `true` otherwise. */
    idle(): boolean
    /** Returns the number of tasks waiting to be processed (in the queue). */
    length(): number
    /** Returns all the tasks be processed (in the queue). Returns empty array when there are no tasks */
    getQueue(): T[]
    /** Removes all tasks waiting to be processed, and reset `drain` to an empty function. */
    kill(): any
    /** Same than `kill` but the `drain` function will be called before reset to empty. */
    killAndDrain(): any
    /** Removes all tasks waiting to be processed, calls each task's callback with an abort error (rejects promises for promise-based queues), and resets `drain` to an empty function. */
    abort(): any
    /** Set a global error handler. `handler(err, task)` will be called each time a task is completed, `err` will be not null if the task has thrown an error. */
    error(handler: errorHandler<T>): void
    /** Property that returns the number of concurrent tasks that could be executed in parallel. It can be altered at runtime. */
    concurrency: number
    /** Property (Read-Only) that returns `true` when the queue is in a paused state. */
    readonly paused: boolean
    /** Function that will be called when the last item from the queue has been processed by a worker. It can be altered at runtime. */
    drain(): any
    /** Function that will be called when the last item from the queue has been assigned to a worker. It can be altered at runtime. */
    empty: () => void
    /** Function that will be called when the queue hits the concurrency limit. It can be altered at runtime. */
    saturated: () => void
  }

  interface queueAsPromised<T = any, R = any> extends queue<T, R> {
    /** Add a task at the end of the queue. The returned `Promise` will be fulfilled (rejected) when the task is completed successfully (unsuccessfully). */
    push(task: T): Promise<R>
    /** Add a task at the beginning of the queue. The returned `Promise` will be fulfilled (rejected) when the task is completed successfully (unsuccessfully). */
    unshift(task: T): Promise<R>
    /** Wait for the queue to be drained. The returned `Promise` will be resolved when all tasks in the queue have been processed by a worker. */
    drained(): Promise<void>
  }

  function promise<C, T = any, R = any>(context: C, worker: fastq.asyncWorker<C, T, R>, concurrency: number): fastq.queueAsPromised<T, R>
  function promise<C, T = any, R = any>(worker: fastq.asyncWorker<C, T, R>, concurrency: number): fastq.queueAsPromised<T, R>
}

export = fastq
