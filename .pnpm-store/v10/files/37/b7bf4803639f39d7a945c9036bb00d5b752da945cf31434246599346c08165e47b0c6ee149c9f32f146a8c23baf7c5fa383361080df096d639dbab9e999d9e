const BrokerPool = require('./brokerPool')
const Lock = require('../utils/lock')
const sharedPromiseTo = require('../utils/sharedPromiseTo')
const createRetry = require('../retry')
const connectionPoolBuilder = require('./connectionPoolBuilder')
const { EARLIEST_OFFSET, LATEST_OFFSET } = require('../constants')
const {
  KafkaJSError,
  KafkaJSBrokerNotFound,
  KafkaJSMetadataNotLoaded,
  KafkaJSTopicMetadataNotLoaded,
  KafkaJSGroupCoordinatorNotFound,
} = require('../errors')
const COORDINATOR_TYPES = require('../protocol/coordinatorTypes')

const { keys } = Object

const mergeTopics = (obj, { topic, partitions }) => ({
  ...obj,
  [topic]: [...(obj[topic] || []), ...partitions],
})

const PRIVATE = {
  CONNECT: Symbol('private:Cluster:connect'),
  REFRESH_METADATA: Symbol('private:Cluster:refreshMetadata'),
  REFRESH_METADATA_IF_NECESSARY: Symbol('private:Cluster:refreshMetadataIfNecessary'),
  FIND_CONTROLLER_BROKER: Symbol('private:Cluster:findControllerBroker'),
}

module.exports = class Cluster {
  /**
   * @param {Object} options
   * @param {Array<string>} options.brokers example: ['127.0.0.1:9092', '127.0.0.1:9094']
   * @param {Object} options.ssl
   * @param {Object} options.sasl
   * @param {string} options.clientId
   * @param {number} options.connectionTimeout - in milliseconds
   * @param {number} options.authenticationTimeout - in milliseconds
   * @param {number} options.reauthenticationThreshold - in milliseconds
   * @param {number} [options.requestTimeout=30000] - in milliseconds
   * @param {boolean} [options.enforceRequestTimeout]
   * @param {number} options.metadataMaxAge - in milliseconds
   * @param {boolean} options.allowAutoTopicCreation
   * @param {number} options.maxInFlightRequests
   * @param {number} options.isolationLevel
   * @param {import("../../types").RetryOptions} options.retry
   * @param {import("../../types").Logger} options.logger
   * @param {import("../../types").ISocketFactory} options.socketFactory
   * @param {Map} [options.offsets]
   * @param {import("../instrumentation/emitter")} [options.instrumentationEmitter=null]
   */
  constructor({
    logger: rootLogger,
    socketFactory,
    brokers,
    ssl,
    sasl,
    clientId,
    connectionTimeout,
    authenticationTimeout,
    reauthenticationThreshold,
    requestTimeout = 30000,
    enforceRequestTimeout,
    metadataMaxAge,
    retry,
    allowAutoTopicCreation,
    maxInFlightRequests,
    isolationLevel,
    instrumentationEmitter = null,
    offsets = new Map(),
  }) {
    this.rootLogger = rootLogger
    this.logger = rootLogger.namespace('Cluster')
    this.retrier = createRetry(retry)
    this.connectionPoolBuilder = connectionPoolBuilder({
      logger: rootLogger,
      instrumentationEmitter,
      socketFactory,
      brokers,
      ssl,
      sasl,
      clientId,
      connectionTimeout,
      requestTimeout,
      enforceRequestTimeout,
      maxInFlightRequests,
      reauthenticationThreshold,
    })

    this.targetTopics = new Set()
    this.mutatingTargetTopics = new Lock({
      description: `updating target topics`,
      timeout: requestTimeout,
    })
    this.isolationLevel = isolationLevel
    this.brokerPool = new BrokerPool({
      connectionPoolBuilder: this.connectionPoolBuilder,
      logger: this.rootLogger,
      retry,
      allowAutoTopicCreation,
      authenticationTimeout,
      metadataMaxAge,
    })
    this.committedOffsetsByGroup = offsets

    this[PRIVATE.CONNECT] = sharedPromiseTo(async () => {
      return await this.brokerPool.connect()
    })

    this[PRIVATE.REFRESH_METADATA] = sharedPromiseTo(async () => {
      return await this.brokerPool.refreshMetadata(Array.from(this.targetTopics))
    })

    this[PRIVATE.REFRESH_METADATA_IF_NECESSARY] = sharedPromiseTo(async () => {
      return await this.brokerPool.refreshMetadataIfNecessary(Array.from(this.targetTopics))
    })

    this[PRIVATE.FIND_CONTROLLER_BROKER] = sharedPromiseTo(async () => {
      const { metadata } = this.brokerPool

      if (!metadata || metadata.controllerId == null) {
        throw new KafkaJSMetadataNotLoaded('Topic metadata not loaded')
      }

      const broker = await this.findBroker({ nodeId: metadata.controllerId })

      if (!broker) {
        throw new KafkaJSBrokerNotFound(
          `Controller broker with id ${metadata.controllerId} not found in the cached metadata`
        )
      }

      return broker
    })
  }

  isConnected() {
    return this.brokerPool.hasConnectedBrokers()
  }

  /**
   * @public
   * @returns {Promise<void>}
   */
  async connect() {
    await this[PRIVATE.CONNECT]()
  }

  /**
   * @public
   * @returns {Promise<void>}
   */
  async disconnect() {
    await this.brokerPool.disconnect()
  }

  /**
   * @public
   * @param {object} destination
   * @param {String} destination.host
   * @param {Number} destination.port
   */
  removeBroker({ host, port }) {
    this.brokerPool.removeBroker({ host, port })
  }

  /**
   * @public
   * @returns {Promise<void>}
   */
  async refreshMetadata() {
    await this[PRIVATE.REFRESH_METADATA]()
  }

  /**
   * @public
   * @returns {Promise<void>}
   */
  async refreshMetadataIfNecessary() {
    await this[PRIVATE.REFRESH_METADATA_IF_NECESSARY]()
  }

  /**
   * @public
   * @returns {Promise<import("../../types").BrokerMetadata>}
   */
  async metadata({ topics = [] } = {}) {
    return this.retrier(async (bail, retryCount, retryTime) => {
      try {
        await this.brokerPool.refreshMetadataIfNecessary(topics)
        return this.brokerPool.withBroker(async ({ broker }) => broker.metadata(topics))
      } catch (e) {
        if (e.type === 'LEADER_NOT_AVAILABLE') {
          throw e
        }

        bail(e)
      }
    })
  }

  /**
   * @public
   * @param {string} topic
   * @return {Promise}
   */
  async addTargetTopic(topic) {
    return this.addMultipleTargetTopics([topic])
  }

  /**
   * @public
   * @param {string[]} topics
   * @return {Promise}
   */
  async addMultipleTargetTopics(topics) {
    await this.mutatingTargetTopics.acquire()

    try {
      const previousSize = this.targetTopics.size
      const previousTopics = new Set(this.targetTopics)
      for (const topic of topics) {
        this.targetTopics.add(topic)
      }

      const hasChanged = previousSize !== this.targetTopics.size || !this.brokerPool.metadata

      if (hasChanged) {
        try {
          await this.refreshMetadata()
        } catch (e) {
          if (
            e.type === 'INVALID_TOPIC_EXCEPTION' ||
            e.type === 'UNKNOWN_TOPIC_OR_PARTITION' ||
            e.type === 'TOPIC_AUTHORIZATION_FAILED'
          ) {
            this.targetTopics = previousTopics
          }

          throw e
        }
      }
    } finally {
      await this.mutatingTargetTopics.release()
    }
  }

  /** @type {() => string[]} */
  getNodeIds() {
    return this.brokerPool.getNodeIds()
  }

  /**
   * @public
   * @param {object} options
   * @param {string} options.nodeId
   * @returns {Promise<import("../../types").Broker>}
   */
  async findBroker({ nodeId }) {
    try {
      return await this.brokerPool.findBroker({ nodeId })
    } catch (e) {
      // The client probably has stale metadata
      if (
        e.name === 'KafkaJSBrokerNotFound' ||
        e.name === 'KafkaJSLockTimeout' ||
        e.name === 'KafkaJSConnectionError'
      ) {
        await this.refreshMetadata()
      }

      throw e
    }
  }

  /**
   * @public
   * @returns {Promise<import("../../types").Broker>}
   */
  async findControllerBroker() {
    return await this[PRIVATE.FIND_CONTROLLER_BROKER]()
  }

  /**
   * @public
   * @param {string} topic
   * @returns {import("../../types").PartitionMetadata[]} Example:
   *                   [{
   *                     isr: [2],
   *                     leader: 2,
   *                     partitionErrorCode: 0,
   *                     partitionId: 0,
   *                     replicas: [2],
   *                   }]
   */
  findTopicPartitionMetadata(topic) {
    const { metadata } = this.brokerPool
    if (!metadata || !metadata.topicMetadata) {
      throw new KafkaJSTopicMetadataNotLoaded('Topic metadata not loaded', { topic })
    }

    const topicMetadata = metadata.topicMetadata.find(t => t.topic === topic)
    return topicMetadata ? topicMetadata.partitionMetadata : []
  }

  /**
   * @public
   * @param {string} topic
   * @param {(number|string)[]} partitions
   * @returns {Object} Object with leader and partitions. For partitions 0 and 5
   *                   the result could be:
   *                     { '0': [0], '2': [5] }
   *
   *                   where the key is the nodeId.
   */
  findLeaderForPartitions(topic, partitions) {
    const partitionMetadata = this.findTopicPartitionMetadata(topic)
    return partitions.reduce((result, id) => {
      const partitionId = parseInt(id, 10)
      const metadata = partitionMetadata.find(p => p.partitionId === partitionId)

      if (!metadata) {
        return result
      }

      if (metadata.leader === null || metadata.leader === undefined) {
        throw new KafkaJSError('Invalid partition metadata', { topic, partitionId, metadata })
      }

      const { leader } = metadata
      const current = result[leader] || []
      return { ...result, [leader]: [...current, partitionId] }
    }, {})
  }

  /**
   * @public
   * @param {object} params
   * @param {string} params.groupId
   * @param {import("../protocol/coordinatorTypes").CoordinatorType} [params.coordinatorType=0]
   * @returns {Promise<import("../../types").Broker>}
   */
  async findGroupCoordinator({ groupId, coordinatorType = COORDINATOR_TYPES.GROUP }) {
    return this.retrier(async (bail, retryCount, retryTime) => {
      try {
        const { coordinator } = await this.findGroupCoordinatorMetadata({
          groupId,
          coordinatorType,
        })
        return await this.findBroker({ nodeId: coordinator.nodeId })
      } catch (e) {
        // A new broker can join the cluster before we have the chance
        // to refresh metadata
        if (e.name === 'KafkaJSBrokerNotFound' || e.type === 'GROUP_COORDINATOR_NOT_AVAILABLE') {
          this.logger.debug(`${e.message}, refreshing metadata and trying again...`, {
            groupId,
            retryCount,
            retryTime,
          })

          await this.refreshMetadata()
          throw e
        }

        if (e.code === 'ECONNREFUSED') {
          // During maintenance the current coordinator can go down; findBroker will
          // refresh metadata and re-throw the error. findGroupCoordinator has to re-throw
          // the error to go through the retry cycle.
          throw e
        }

        bail(e)
      }
    })
  }

  /**
   * @public
   * @param {object} params
   * @param {string} params.groupId
   * @param {import("../protocol/coordinatorTypes").CoordinatorType} [params.coordinatorType=0]
   * @returns {Promise<Object>}
   */
  async findGroupCoordinatorMetadata({ groupId, coordinatorType }) {
    const brokerMetadata = await this.brokerPool.withBroker(async ({ nodeId, broker }) => {
      return await this.retrier(async (bail, retryCount, retryTime) => {
        try {
          const brokerMetadata = await broker.findGroupCoordinator({ groupId, coordinatorType })
          this.logger.debug('Found group coordinator', {
            broker: brokerMetadata.host,
            nodeId: brokerMetadata.coordinator.nodeId,
          })
          return brokerMetadata
        } catch (e) {
          this.logger.debug('Tried to find group coordinator', {
            nodeId,
            groupId,
            error: e,
          })

          if (e.type === 'GROUP_COORDINATOR_NOT_AVAILABLE') {
            this.logger.debug('Group coordinator not available, retrying...', {
              nodeId,
              retryCount,
              retryTime,
            })

            throw e
          }

          bail(e)
        }
      })
    })

    if (brokerMetadata) {
      return brokerMetadata
    }

    throw new KafkaJSGroupCoordinatorNotFound('Failed to find group coordinator')
  }

  /**
   * @param {object} topicConfiguration
   * @returns {number}
   */
  defaultOffset({ fromBeginning }) {
    return fromBeginning ? EARLIEST_OFFSET : LATEST_OFFSET
  }

  /**
   * @public
   * @param {Array<Object>} topics
   *                          [
   *                            {
   *                              topic: 'my-topic-name',
   *                              partitions: [{ partition: 0 }],
   *                              fromBeginning: false
   *                            }
   *                          ]
   * @returns {Promise<import("../../types").TopicOffsets[]>} example:
   *                          [
   *                            {
   *                              topic: 'my-topic-name',
   *                              partitions: [
   *                                { partition: 0, offset: '1' },
   *                                { partition: 1, offset: '2' },
   *                                { partition: 2, offset: '1' },
   *                              ],
   *                            },
   *                          ]
   */
  async fetchTopicsOffset(topics) {
    const partitionsPerBroker = {}
    const topicConfigurations = {}

    const addDefaultOffset = topic => partition => {
      const { timestamp } = topicConfigurations[topic]
      return { ...partition, timestamp }
    }

    // Index all topics and partitions per leader (nodeId)
    for (const topicData of topics) {
      const { topic, partitions, fromBeginning, fromTimestamp } = topicData
      const partitionsPerLeader = this.findLeaderForPartitions(
        topic,
        partitions.map(p => p.partition)
      )
      const timestamp =
        fromTimestamp != null ? fromTimestamp : this.defaultOffset({ fromBeginning })

      topicConfigurations[topic] = { timestamp }

      keys(partitionsPerLeader).forEach(nodeId => {
        partitionsPerBroker[nodeId] = partitionsPerBroker[nodeId] || {}
        partitionsPerBroker[nodeId][topic] = partitions.filter(p =>
          partitionsPerLeader[nodeId].includes(p.partition)
        )
      })
    }

    // Create a list of requests to fetch the offset of all partitions
    const requests = keys(partitionsPerBroker).map(async nodeId => {
      const broker = await this.findBroker({ nodeId })
      const partitions = partitionsPerBroker[nodeId]

      const { responses: topicOffsets } = await broker.listOffsets({
        isolationLevel: this.isolationLevel,
        topics: keys(partitions).map(topic => ({
          topic,
          partitions: partitions[topic].map(addDefaultOffset(topic)),
        })),
      })

      return topicOffsets
    })

    // Execute all requests, merge and normalize the responses
    const responses = await Promise.all(requests)
    const partitionsPerTopic = responses.flat().reduce(mergeTopics, {})

    return keys(partitionsPerTopic).map(topic => ({
      topic,
      partitions: partitionsPerTopic[topic].map(({ partition, offset }) => ({
        partition,
        offset,
      })),
    }))
  }

  /**
   * Retrieve the object mapping for committed offsets for a single consumer group
   * @param {object} options
   * @param {string} options.groupId
   * @returns {Object}
   */
  committedOffsets({ groupId }) {
    if (!this.committedOffsetsByGroup.has(groupId)) {
      this.committedOffsetsByGroup.set(groupId, {})
    }

    return this.committedOffsetsByGroup.get(groupId)
  }

  /**
   * Mark offset as committed for a single consumer group's topic-partition
   * @param {object} options
   * @param {string} options.groupId
   * @param {string} options.topic
   * @param {string|number} options.partition
   * @param {string} options.offset
   */
  markOffsetAsCommitted({ groupId, topic, partition, offset }) {
    const committedOffsets = this.committedOffsets({ groupId })

    committedOffsets[topic] = committedOffsets[topic] || {}
    committedOffsets[topic][partition] = offset
  }
}
