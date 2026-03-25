/**
 * Invokes an abortable function with implicitly created `AbortSignal`.
 *
 * Returns a function that aborts that signal and waits until passed function
 * finishes.
 *
 * Any error other than `AbortError` thrown from passed function will result in
 * unhandled promise rejection.
 *
 * Example:
 *
 *    const stop = run(async signal => {
 *      try {
 *        while (true) {
 *          await delay(signal, 1000);
 *          console.log('tick');
 *        }
 *      } finally {
 *        await doCleanup();
 *      }
 *    });
 *
 *    // abort and wait until cleanup is done
 *    await stop();
 */
export declare function run(fn: (signal: AbortSignal) => Promise<void>): () => Promise<void>;
