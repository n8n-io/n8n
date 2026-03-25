const Long = require('../utils/long')
const createRetry = require('../retry')
const { initialRetryTime } = require('../retry/defaults')
const ConsumerGroup = require('./consumerGroup')
const Runner = require('./runner')
const { events, wrap: wrapEvent, unwrap: unwrapEvent } = require('./instrumentationEvents')
const InstrumentationEventEmitter = require('../instrumentation/emitter')
const { KafkaJSNonRetriableError } = require('../errors')
const { roundRobin } = require('./assigners')
const { EARLIEST_OFFSET, LATEST_OFFSET } = require('../constants')
const ISOLATION_LEVEL = require('../protocol/isolationLevel')
const sharedPromiseTo = require('../utils/sharedPromiseTo')

const { keys, values } = Object
const { CONNECT, DISCONNECT, STOP, CRASH } = events

const eventNames = values(events)
const eventKeys = keys(events)
  .map(key => `consumer.events.${key}`)
  .join(', ')

const specialOffsets = [
  Long.fromValue(EARLIEST_OFFSET).toString(),
  Long.fromValue(LATEST_OFFSET).toString(),
]

/**
 * @param {Object} params
 * @param {import("../../types").Cluster} params.cluster
 * @param {String} params.groupId
 * @param {import('../../types').RetryOptions} [params.retry]
 * @param {import('../../types').Logger} params.logger
 * @param {import('../../types').PartitionAssigner[]} [params.partitionAssigners]
 * @param {number} [params.sessionTimeout]
 * @param {number} [params.rebalanceTimeout]
 * @param {number} [params.heartbeatInterval]
 * @param {number} [params.maxBytesPerPartition]
 * @param {number} [params.minBytes]
 * @param {number} [params.maxBytes]
 * @param {number} [params.maxWaitTimeInMs]
 * @param {number} [params.isolationLevel]
 * @param {string} [params.rackId]
 * @param {InstrumentationEventEmitter} [params.instrumentationEmitter]
 * @param {number} params.metadataMaxAge
 *
 * @returns {import("../../types").Consumer}
 */
module.exports = ({
  cluster,
  groupId,
  retry,
  logger: rootLogger,
  partitionAssigners = [roundRobin],
  sessionTimeout = 30000,
  rebalanceTimeout = 60000,
  heartbeatInterval = 3000,
  maxBytesPerPartition = 1048576, // 1MB
  minBytes = 1,
  maxBytes = 10485760, // 10MB
  maxWaitTimeInMs = 5000,
  isolationLevel = ISOLATION_LEVEL.READ_COMMITTED,
  rackId = '',
  instrumentationEmitter: rootInstrumentationEmitter,
  metadataMaxAge,
}) => {
  if (!groupId) {
    throw new KafkaJSNonRetriableError('Consumer groupId must be a non-empty string.')
  }

  const logger = rootLogger.namespace('Consumer')
  const instrumentationEmitter = rootInstrumentationEmitter || new InstrumentationEventEmitter()
  const assigners = partitionAssigners.map(createAssigner =>
    createAssigner({ groupId, logger, cluster })
  )

  /** @type {Record<string, { fromBeginning?: boolean }>} */
  const topics = {}
  let runner = null
  /** @type {ConsumerGroup} */
  let consumerGroup = null
  let restartTimeout = null

  if (heartbeatInterval >= sessionTimeout) {
    throw new KafkaJSNonRetriableError(
      `Consumer heartbeatInterval (${heartbeatInterval}) must be lower than sessionTimeout (${sessionTimeout}). It is recommended to set heartbeatInterval to approximately a third of the sessionTimeout.`
    )
  }

  /** @type {import("../../types").Consumer["connect"]} */
  const connect = async () => {
    await cluster.connect()
    instrumentationEmitter.emit(CONNECT)
  }

  /** @type {import("../../types").Consumer["disconnect"]} */
  const disconnect = async () => {
    try {
      await stop()
      logger.debug('consumer has stopped, disconnecting', { groupId })
      await cluster.disconnect()
      instrumentationEmitter.emit(DISCONNECT)
    } catch (e) {
      logger.error(`Caught error when disconnecting the consumer: ${e.message}`, {
        stack: e.stack,
        groupId,
      })
      throw e
    }
  }

  /** @type {import("../../types").Consumer["stop"]} */
  const stop = sharedPromiseTo(async () => {
    try {
      if (runner) {
        await runner.stop()
        runner = null
        consumerGroup = null
        instrumentationEmitter.emit(STOP)
      }

      clearTimeout(restartTimeout)
      logger.info('Stopped', { groupId })
    } catch (e) {
      logger.error(`Caught error when stopping the consumer: ${e.message}`, {
        stack: e.stack,
        groupId,
      })

      throw e
    }
  })

  /** @type {import("../../types").Consumer["subscribe"]} */
  const subscribe = async ({ topic, topics: subscriptionTopics, fromBeginning = false }) => {
    if (consumerGroup) {
      throw new KafkaJSNonRetriableError('Cannot subscribe to topic while consumer is running')
    }

    if (!topic && !subscriptionTopics) {
      throw new KafkaJSNonRetriableError('Missing required argument "topics"')
    }

    if (subscriptionTopics != null && !Array.isArray(subscriptionTopics)) {
      throw new KafkaJSNonRetriableError('Argument "topics" must be an array')
    }

    const subscriptions = subscriptionTopics || [topic]

    for (const subscription of subscriptions) {
      if (typeof subscription !== 'string' && !(subscription instanceof RegExp)) {
        throw new KafkaJSNonRetriableError(
          `Invalid topic ${subscription} (${typeof subscription}), the topic name has to be a String or a RegExp`
        )
      }
    }

    const hasRegexSubscriptions = subscriptions.some(subscription => subscription instanceof RegExp)
    const metadata = hasRegexSubscriptions ? await cluster.metadata() : undefined

    const topicsToSubscribe = []
    for (const subscription of subscriptions) {
      const isRegExp = subscription instanceof RegExp
      if (isRegExp) {
        const topicRegExp = subscription
        const matchedTopics = metadata.topicMetadata
          .map(({ topic: topicName }) => topicName)
          .filter(topicName => topicRegExp.test(topicName))

        logger.debug('Subscription based on RegExp', {
          groupId,
          topicRegExp: topicRegExp.toString(),
          matchedTopics,
        })

        topicsToSubscribe.push(...matchedTopics)
      } else {
        topicsToSubscribe.push(subscription)
      }
    }

    for (const t of topicsToSubscribe) {
      topics[t] = { fromBeginning }
    }

    await cluster.addMultipleTargetTopics(topicsToSubscribe)
  }

  /** @type {import("../../types").Consumer["run"]} */
  const run = async ({
    autoCommit = true,
    autoCommitInterval = null,
    autoCommitThreshold = null,
    eachBatchAutoResolve = true,
    partitionsConsumedConcurrently: concurrency = 1,
    eachBatch = null,
    eachMessage = null,
  } = {}) => {
    if (consumerGroup) {
      logger.warn('consumer#run was called, but the consumer is already running', { groupId })
      return
    }

    const start = async onCrash => {
      logger.info('Starting', { groupId })

      consumerGroup = new ConsumerGroup({
        logger: rootLogger,
        topics: keys(topics),
        topicConfigurations: topics,
        retry,
        cluster,
        groupId,
        assigners,
        sessionTimeout,
        rebalanceTimeout,
        maxBytesPerPartition,
        minBytes,
        maxBytes,
        maxWaitTimeInMs,
        instrumentationEmitter,
        isolationLevel,
        rackId,
        metadataMaxAge,
        autoCommit,
        autoCommitInterval,
        autoCommitThreshold,
      })

      runner = new Runner({
        logger: rootLogger,
        consumerGroup,
        instrumentationEmitter,
        heartbeatInterval,
        retry,
        autoCommit,
        eachBatchAutoResolve,
        eachBatch,
        eachMessage,
        onCrash,
        concurrency,
      })

      await runner.start()
    }

    const onCrash = async e => {
      logger.error(`Crash: ${e.name}: ${e.message}`, {
        groupId,
        retryCount: e.retryCount,
        stack: e.stack,
      })

      if (e.name === 'KafkaJSConnectionClosedError') {
        cluster.removeBroker({ host: e.host, port: e.port })
      }

      await disconnect()

      const getOriginalCause = error => {
        if (error.cause) {
          return getOriginalCause(error.cause)
        }

        return error
      }

      const isErrorRetriable =
        e.name === 'KafkaJSNumberOfRetriesExceeded' || getOriginalCause(e).retriable === true
      const shouldRestart =
        isErrorRetriable &&
        (!retry ||
          !retry.restartOnFailure ||
          (await retry.restartOnFailure(e).catch(error => {
            logger.error(
              'Caught error when invoking user-provided "restartOnFailure" callback. Defaulting to restarting.',
              {
                error: error.message || error,
                cause: e.message || e,
                groupId,
              }
            )

            return true
          })))

      instrumentationEmitter.emit(CRASH, {
        error: e,
        groupId,
        restart: shouldRestart,
      })

      if (shouldRestart) {
        const retryTime = e.retryTime || (retry && retry.initialRetryTime) || initialRetryTime
        logger.error(`Restarting the consumer in ${retryTime}ms`, {
          retryCount: e.retryCount,
          retryTime,
          groupId,
        })

        restartTimeout = setTimeout(() => start(onCrash), retryTime)
      }
    }

    await start(onCrash)
  }

  /** @type {import("../../types").Consumer["on"]} */
  const on = (eventName, listener) => {
    if (!eventNames.includes(eventName)) {
      throw new KafkaJSNonRetriableError(`Event name should be one of ${eventKeys}`)
    }

    return instrumentationEmitter.addListener(unwrapEvent(eventName), event => {
      event.type = wrapEvent(event.type)
      Promise.resolve(listener(event)).catch(e => {
        logger.error(`Failed to execute listener: ${e.message}`, {
          eventName,
          stack: e.stack,
        })
      })
    })
  }

  /**
   * @type {import("../../types").Consumer["commitOffsets"]}
   * @param topicPartitions
   *   Example: [{ topic: 'topic-name', partition: 0, offset: '1', metadata: 'event-id-3' }]
   */
  const commitOffsets = async (topicPartitions = []) => {
    const commitsByTopic = topicPartitions.reduce(
      (payload, { topic, partition, offset, metadata = null }) => {
        if (!topic) {
          throw new KafkaJSNonRetriableError(`Invalid topic ${topic}`)
        }

        if (isNaN(partition)) {
          throw new KafkaJSNonRetriableError(
            `Invalid partition, expected a number received ${partition}`
          )
        }

        let commitOffset
        try {
          commitOffset = Long.fromValue(offset)
        } catch (_) {
          throw new KafkaJSNonRetriableError(`Invalid offset, expected a long received ${offset}`)
        }

        if (commitOffset.lessThan(0)) {
          throw new KafkaJSNonRetriableError('Offset must not be a negative number')
        }

        if (metadata !== null && typeof metadata !== 'string') {
          throw new KafkaJSNonRetriableError(
            `Invalid offset metadata, expected string or null, received ${metadata}`
          )
        }

        const topicCommits = payload[topic] || []

        topicCommits.push({ partition, offset: commitOffset, metadata })

        return { ...payload, [topic]: topicCommits }
      },
      {}
    )

    if (!consumerGroup) {
      throw new KafkaJSNonRetriableError(
        'Consumer group was not initialized, consumer#run must be called first'
      )
    }

    const topics = Object.keys(commitsByTopic)

    return runner.commitOffsets({
      topics: topics.map(topic => {
        return {
          topic,
          partitions: commitsByTopic[topic],
        }
      }),
    })
  }

  /** @type {import("../../types").Consumer["seek"]} */
  const seek = ({ topic, partition, offset }) => {
    if (!topic) {
      throw new KafkaJSNonRetriableError(`Invalid topic ${topic}`)
    }

    if (isNaN(partition)) {
      throw new KafkaJSNonRetriableError(
        `Invalid partition, expected a number received ${partition}`
      )
    }

    let seekOffset
    try {
      seekOffset = Long.fromValue(offset)
    } catch (_) {
      throw new KafkaJSNonRetriableError(`Invalid offset, expected a long received ${offset}`)
    }

    if (seekOffset.lessThan(0) && !specialOffsets.includes(seekOffset.toString())) {
      throw new KafkaJSNonRetriableError('Offset must not be a negative number')
    }

    if (!consumerGroup) {
      throw new KafkaJSNonRetriableError(
        'Consumer group was not initialized, consumer#run must be called first'
      )
    }

    consumerGroup.seek({ topic, partition, offset: seekOffset.toString() })
  }

  /** @type {import("../../types").Consumer["describeGroup"]} */
  const describeGroup = async () => {
    const coordinator = await cluster.findGroupCoordinator({ groupId })
    const retrier = createRetry(retry)
    return retrier(async () => {
      const { groups } = await coordinator.describeGroups({ groupIds: [groupId] })
      return groups.find(group => group.groupId === groupId)
    })
  }

  /**
   * @type {import("../../types").Consumer["pause"]}
   * @param topicPartitions
   *   Example: [{ topic: 'topic-name', partitions: [1, 2] }]
   */
  const pause = (topicPartitions = []) => {
    for (const topicPartition of topicPartitions) {
      if (!topicPartition || !topicPartition.topic) {
        throw new KafkaJSNonRetriableError(
          `Invalid topic ${(topicPartition && topicPartition.topic) || topicPartition}`
        )
      } else if (
        typeof topicPartition.partitions !== 'undefined' &&
        (!Array.isArray(topicPartition.partitions) || topicPartition.partitions.some(isNaN))
      ) {
        throw new KafkaJSNonRetriableError(
          `Array of valid partitions required to pause specific partitions instead of ${topicPartition.partitions}`
        )
      }
    }

    if (!consumerGroup) {
      throw new KafkaJSNonRetriableError(
        'Consumer group was not initialized, consumer#run must be called first'
      )
    }

    consumerGroup.pause(topicPartitions)
  }

  /**
   * Returns the list of topic partitions paused on this consumer
   *
   * @type {import("../../types").Consumer["paused"]}
   */
  const paused = () => {
    if (!consumerGroup) {
      return []
    }

    return consumerGroup.paused()
  }

  /**
   * @type {import("../../types").Consumer["resume"]}
   * @param topicPartitions
   *  Example: [{ topic: 'topic-name', partitions: [1, 2] }]
   */
  const resume = (topicPartitions = []) => {
    for (const topicPartition of topicPartitions) {
      if (!topicPartition || !topicPartition.topic) {
        throw new KafkaJSNonRetriableError(
          `Invalid topic ${(topicPartition && topicPartition.topic) || topicPartition}`
        )
      } else if (
        typeof topicPartition.partitions !== 'undefined' &&
        (!Array.isArray(topicPartition.partitions) || topicPartition.partitions.some(isNaN))
      ) {
        throw new KafkaJSNonRetriableError(
          `Array of valid partitions required to resume specific partitions instead of ${topicPartition.partitions}`
        )
      }
    }

    if (!consumerGroup) {
      throw new KafkaJSNonRetriableError(
        'Consumer group was not initialized, consumer#run must be called first'
      )
    }

    consumerGroup.resume(topicPartitions)
  }

  /**
   * @return {Object} logger
   */
  const getLogger = () => logger

  return {
    connect,
    disconnect,
    subscribe,
    stop,
    run,
    commitOffsets,
    seek,
    describeGroup,
    pause,
    paused,
    resume,
    on,
    events,
    logger: getLogger,
  }
}
