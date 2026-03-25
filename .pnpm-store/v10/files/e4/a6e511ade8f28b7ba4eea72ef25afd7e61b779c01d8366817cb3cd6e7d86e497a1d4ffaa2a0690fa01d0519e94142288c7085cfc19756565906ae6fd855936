/**
 * @typedef {ReturnType<typeof createWorkerQueue>} WorkerQueue
 */

/**
 * @param {object} options
 * @param {import('./worker').Worker<T>[]} options.workers
 * @template T
 */
const createWorkerQueue = ({ workers }) => {
  /** @type {{ batch: T, resolve: (value?: any) => void, reject: (e: Error) => void}[]} */
  const queue = []

  const getWorkers = () => workers

  /**
   * Waits until workers have processed all batches in the queue.
   *
   * @param {...T} batches
   * @returns {Promise<void>}
   */
  const push = async (...batches) => {
    const promises = batches.map(
      batch => new Promise((resolve, reject) => queue.push({ batch, resolve, reject }))
    )

    workers.forEach(worker => worker.run({ next: () => queue.shift() }))

    const results = await Promise.allSettled(promises)
    const rejected = results.find(result => result.status === 'rejected')
    if (rejected) {
      // @ts-ignore
      throw rejected.reason
    }
  }

  return { push, getWorkers }
}

module.exports = createWorkerQueue
