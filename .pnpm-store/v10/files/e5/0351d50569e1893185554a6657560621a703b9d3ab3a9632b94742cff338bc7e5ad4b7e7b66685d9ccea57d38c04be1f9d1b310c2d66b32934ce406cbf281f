const EventEmitter = require('events')

/**
 * Fetches data from all assigned nodes, waits for workerQueue to drain and repeats.
 *
 * @param {object} options
 * @param {number} options.nodeId
 * @param {import('./workerQueue').WorkerQueue} options.workerQueue
 * @param {Map<string, string[]>} options.partitionAssignments
 * @param {(nodeId: number) => Promise<T[]>} options.fetch
 * @param {import('../../types').Logger} options.logger
 * @template T
 */
const createFetcher = ({
  nodeId,
  workerQueue,
  partitionAssignments,
  fetch,
  logger: rootLogger,
}) => {
  const logger = rootLogger.namespace(`Fetcher ${nodeId}`)
  const emitter = new EventEmitter()
  let isRunning = false

  const getWorkerQueue = () => workerQueue
  const assignmentKey = ({ topic, partition }) => `${topic}|${partition}`
  const getAssignedFetcher = batch => partitionAssignments.get(assignmentKey(batch))
  const assignTopicPartition = batch => partitionAssignments.set(assignmentKey(batch), nodeId)
  const unassignTopicPartition = batch => partitionAssignments.delete(assignmentKey(batch))
  const filterUnassignedBatches = batches =>
    batches.filter(batch => {
      const assignedFetcher = getAssignedFetcher(batch)
      if (assignedFetcher != null && assignedFetcher !== nodeId) {
        logger.info(
          'Filtering out batch due to partition already being processed by another fetcher',
          {
            topic: batch.topic,
            partition: batch.partition,
            assignedFetcher: assignedFetcher,
            fetcher: nodeId,
          }
        )
        return false
      }

      return true
    })

  const start = async () => {
    if (isRunning) return
    isRunning = true

    while (isRunning) {
      try {
        const batches = await fetch(nodeId)
        if (isRunning) {
          const availableBatches = filterUnassignedBatches(batches)

          if (availableBatches.length > 0) {
            availableBatches.forEach(assignTopicPartition)
            try {
              await workerQueue.push(...availableBatches)
            } finally {
              availableBatches.forEach(unassignTopicPartition)
            }
          }
        }
      } catch (error) {
        isRunning = false
        emitter.emit('end')
        throw error
      }
    }
    emitter.emit('end')
  }

  const stop = async () => {
    if (!isRunning) return
    isRunning = false
    await new Promise(resolve => emitter.once('end', () => resolve()))
  }

  return { start, stop, getWorkerQueue }
}

module.exports = createFetcher
