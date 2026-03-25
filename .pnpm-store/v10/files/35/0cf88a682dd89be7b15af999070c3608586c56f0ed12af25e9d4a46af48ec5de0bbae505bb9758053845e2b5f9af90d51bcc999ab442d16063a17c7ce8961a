import {AbortError, catchAbortError, isAbortError} from './AbortError';

export type SpawnEffects = {
  /**
   * Schedules a function to run after spawned function finishes.
   *
   * Deferred functions run serially in last-in-first-out order.
   *
   * Promise returned from `spawn` fulfills or rejects only after all deferred
   * functions finish.
   */
  defer(fn: () => void | Promise<void>): void;

  /**
   * Executes an abortable function in background.
   *
   * If a forked function throws an exception, spawned function and other forks
   * are aborted and promise returned from `spawn` rejects with that exception.
   *
   * When spawned function finishes, all forks are aborted.
   */
  fork<T>(fn: (signal: AbortSignal) => Promise<T>): ForkTask<T>;
};

export type ForkTask<T> = {
  /**
   * Abort a forked function.
   */
  abort(): void;
  /**
   * Returns a promise returned from a forked function.
   */
  join(): Promise<T>;
};

/**
 * Run an abortable function with `fork` and `defer` effects attached to it.
 *
 * `spawn` allows to write Go-style coroutines.
 *
 * Example:
 *
 *     // Connect to a database, then start a server, then block until abort.
 *     // On abort, gracefully shutdown the server, and once done, disconnect
 *     // from the database.
 *     spawn(signal, async (signal, {defer}) => {
 *       const db = await connectToDb();
 *
 *       defer(async () => {
 *         await db.close();
 *       });
 *
 *       const server = await startServer(db);
 *
 *       defer(async () => {
 *         await server.close();
 *       });
 *
 *       await forever(signal);
 *     });
 *
 * Example:
 *
 *     // Connect to a database, then start an infinite polling loop.
 *     // On abort, disconnect from the database.
 *     spawn(signal, async (signal, {defer}) => {
 *       const db = await connectToDb();
 *
 *       defer(async () => {
 *         await db.close();
 *       });
 *
 *       while (true) {
 *         await poll(signal, db);
 *         await delay(signal, 5000);
 *       }
 *     });
 *
 * Example:
 *
 *     // Acquire a lock and execute a function.
 *     // Extend the lock while the function is running.
 *     // Once the function finishes or the signal is aborted, stop extending
 *     // the lock and release it.
 *     import Redlock = require('redlock');
 *     
 *     const lockTtl = 30_000;    
 * 
 *     function withLock<T>(
 *       signal: AbortSignal,
 *       redlock: Redlock,
 *       key: string,
 *       fn: (signal: AbortSignal) => Promise<T>,
 *     ): Promise<T> {
 *       return spawn(signal, async (signal, {fork, defer}) => {
 *         const lock = await redlock.lock(key, lockTtl);
 * 
 *         defer(() => lock.unlock());
 *     ​
 *         fork(async signal => {
 *           while (true) {
 *             await delay(signal, lockTtl / 10);
 *             await lock.extend(lockTtl);
 *           }
 *         });
 * 
 *         return await fn(signal);
 *       });
 *     }
 * 
 *     const redlock = new Redlock([redis], {
 *       retryCount: -1,
 *     });
 * 
 *     await withLock(signal, redlock, 'the-lock-key', async signal => {
 *       // ...
 *     });
 */
export function spawn<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, effects: SpawnEffects) => Promise<T>,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new AbortError());
  }

  const deferredFunctions: Array<() => void | Promise<void>> = [];

  /**
   * Aborted when spawned function finishes
   * or one of forked functions throws
   * or parent signal aborted.
   */
  const spawnAbortController = new AbortController();
  const spawnSignal = spawnAbortController.signal;

  const abortSpawn = () => {
    spawnAbortController.abort();
  };
  signal.addEventListener('abort', abortSpawn);
  const removeAbortListener = () => {
    signal.removeEventListener('abort', abortSpawn);
  };

  const tasks = new Set<ForkTask<unknown>>();

  const abortTasks = () => {
    for (const task of tasks) {
      task.abort();
    }
  };
  spawnSignal.addEventListener('abort', abortTasks);
  const removeSpawnAbortListener = () => {
    spawnSignal.removeEventListener('abort', abortTasks);
  };

  let promise = new Promise<T>((resolve, reject) => {
    let result: {value: T} | undefined;
    let failure: {error: unknown} | undefined;

    fork(signal =>
      fn(signal, {
        defer(fn: () => void | Promise<void>) {
          deferredFunctions.push(fn);
        },

        fork,
      }),
    )
      .join()
      .then(
        value => {
          spawnAbortController.abort();
          result = {value};
        },
        error => {
          spawnAbortController.abort();

          if (!isAbortError(error) || failure == null) {
            failure = {error};
          }
        },
      );

    function fork<T>(forkFn: (signal: AbortSignal) => Promise<T>): ForkTask<T> {
      if (spawnSignal.aborted) {
        // return already aborted task
        return {
          abort() {},
          async join() {
            throw new AbortError();
          },
        };
      }

      const taskAbortController = new AbortController();
      const taskSignal = taskAbortController.signal;

      const taskPromise = forkFn(taskSignal);

      const task: ForkTask<T> = {
        abort() {
          taskAbortController.abort();
        },
        join: () => taskPromise,
      };

      tasks.add(task);

      taskPromise
        .catch(catchAbortError)
        .catch(error => {
          failure = {error};

          // error in forked function
          spawnAbortController.abort();
        })
        .finally(() => {
          tasks.delete(task);

          if (tasks.size === 0) {
            if (failure != null) {
              reject(failure.error);
            } else {
              resolve(result!.value);
            }
          }
        });

      return task;
    }
  });

  promise = promise.finally(() => {
    removeAbortListener();
    removeSpawnAbortListener();

    let deferPromise = Promise.resolve();

    for (let i = deferredFunctions.length - 1; i >= 0; i--) {
      deferPromise = deferPromise.finally(deferredFunctions[i]);
    }

    return deferPromise;
  });

  return promise;
}
