/**
 * @typedef {(batch: T, metadata: { workerId: number }) => Promise<void>} Handler
 * @template T
 *
 * @typedef {ReturnType<typeof createWorker>} Worker
 */

const sharedPromiseTo = require('../utils/sharedPromiseTo')

/**
 * @param {{ handler: Handler<T>, workerId: number }} options
 * @template T
 */
const createWorker = ({ handler, workerId }) => {
  /**
   * Takes batches from next() until it returns undefined.
   *
   * @param {{ next: () => { batch: T, resolve: () => void, reject: (e: Error) => void } | undefined }} param0
   * @returns {Promise<void>}
   */
  const run = sharedPromiseTo(async ({ next }) => {
    while (true) {
      const item = next()
      if (!item) break

      const { batch, resolve, reject } = item

      try {
        await handler(batch, { workerId })
        resolve()
      } catch (error) {
        reject(error)
      }
    }
  })

  return { run }
}

module.exports = createWorker
