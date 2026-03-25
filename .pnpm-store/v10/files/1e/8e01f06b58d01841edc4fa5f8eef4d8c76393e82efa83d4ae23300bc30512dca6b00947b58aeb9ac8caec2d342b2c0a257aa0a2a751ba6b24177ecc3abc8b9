const createRetry = require('../../retry')
const Lock = require('../../utils/lock')
const { KafkaJSNonRetriableError } = require('../../errors')
const COORDINATOR_TYPES = require('../../protocol/coordinatorTypes')
const createStateMachine = require('./transactionStateMachine')
const { INT_32_MAX_VALUE } = require('../../constants')
const assert = require('assert')

const STATES = require('./transactionStates')
const NO_PRODUCER_ID = -1
const SEQUENCE_START = 0
const INIT_PRODUCER_RETRIABLE_PROTOCOL_ERRORS = [
  'NOT_COORDINATOR_FOR_GROUP',
  'GROUP_COORDINATOR_NOT_AVAILABLE',
  'GROUP_LOAD_IN_PROGRESS',
  /**
   * The producer might have crashed and never committed the transaction; retry the
   * request so Kafka can abort the current transaction
   * @see https://github.com/apache/kafka/blob/201da0542726472d954080d54bc585b111aaf86f/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L1001-L1002
   */
  'CONCURRENT_TRANSACTIONS',
]
const COMMIT_RETRIABLE_PROTOCOL_ERRORS = [
  'UNKNOWN_TOPIC_OR_PARTITION',
  'COORDINATOR_LOAD_IN_PROGRESS',
]
const COMMIT_STALE_COORDINATOR_PROTOCOL_ERRORS = ['COORDINATOR_NOT_AVAILABLE', 'NOT_COORDINATOR']

/**
 * @typedef {Object} EosManager
 */

/**
 * Manage behavior for an idempotent producer and transactions.
 *
 * @returns {EosManager}
 */
module.exports = ({
  logger,
  cluster,
  transactionTimeout = 60000,
  transactional,
  transactionalId,
}) => {
  if (transactional && !transactionalId) {
    throw new KafkaJSNonRetriableError('Cannot manage transactions without a transactionalId')
  }

  const retrier = createRetry(cluster.retry)

  /**
   * Current producer ID
   */
  let producerId = NO_PRODUCER_ID

  /**
   * Current producer epoch
   */
  let producerEpoch = 0

  /**
   * Idempotent production requires that the producer track the sequence number of messages.
   *
   * Sequences are sent with every Record Batch and tracked per Topic-Partition
   */
  let producerSequence = {}

  /**
   * Idempotent production requires a mutex lock per broker to serialize requests with sequence number handling
   */
  let brokerMutexLocks = {}

  /**
   * Topic partitions already participating in the transaction
   */
  let transactionTopicPartitions = {}

  /**
   * Offsets have been added to the transaction
   */
  let hasOffsetsAddedToTransaction = false

  const stateMachine = createStateMachine({ logger })
  stateMachine.on('transition', ({ to }) => {
    if (to === STATES.READY) {
      transactionTopicPartitions = {}
      hasOffsetsAddedToTransaction = false
    }
  })

  const findTransactionCoordinator = () => {
    return cluster.findGroupCoordinator({
      groupId: transactionalId,
      coordinatorType: COORDINATOR_TYPES.TRANSACTION,
    })
  }

  const transactionalGuard = () => {
    if (!transactional) {
      throw new KafkaJSNonRetriableError('Method unavailable if non-transactional')
    }
  }

  /**
   * A transaction is ongoing when offsets or partitions added to it
   *
   * @returns {boolean}
   */
  const isOngoing = () => {
    return (
      hasOffsetsAddedToTransaction ||
      Object.entries(transactionTopicPartitions).some(([, partitions]) => {
        return Object.entries(partitions).some(
          ([, isPartitionAddedToTransaction]) => isPartitionAddedToTransaction
        )
      })
    )
  }

  const eosManager = stateMachine.createGuarded(
    {
      /**
       * Get the current producer id
       * @returns {number}
       */
      getProducerId() {
        return producerId
      },

      /**
       * Get the current producer epoch
       * @returns {number}
       */
      getProducerEpoch() {
        return producerEpoch
      },

      getTransactionalId() {
        return transactionalId
      },

      /**
       * Initialize the idempotent producer by making an `InitProducerId` request.
       * Overwrites any existing state in this transaction manager
       */
      async initProducerId() {
        return retrier(async (bail, retryCount, retryTime) => {
          try {
            await cluster.refreshMetadataIfNecessary()

            // If non-transactional we can request the PID from any broker
            const broker = await (transactional
              ? findTransactionCoordinator()
              : cluster.findControllerBroker())

            const result = await broker.initProducerId({
              transactionalId: transactional ? transactionalId : undefined,
              transactionTimeout,
            })

            stateMachine.transitionTo(STATES.READY)
            producerId = result.producerId
            producerEpoch = result.producerEpoch
            producerSequence = {}
            brokerMutexLocks = {}

            logger.debug('Initialized producer id & epoch', { producerId, producerEpoch })
          } catch (e) {
            if (INIT_PRODUCER_RETRIABLE_PROTOCOL_ERRORS.includes(e.type)) {
              if (e.type === 'CONCURRENT_TRANSACTIONS') {
                logger.debug('There is an ongoing transaction on this transactionId, retrying', {
                  error: e.message,
                  stack: e.stack,
                  transactionalId,
                  retryCount,
                  retryTime,
                })
              }

              throw e
            }

            bail(e)
          }
        })
      },

      /**
       * Get the current sequence for a given Topic-Partition. Defaults to 0.
       *
       * @param {string} topic
       * @param {string} partition
       * @returns {number}
       */
      getSequence(topic, partition) {
        if (!eosManager.isInitialized()) {
          return SEQUENCE_START
        }

        producerSequence[topic] = producerSequence[topic] || {}
        producerSequence[topic][partition] = producerSequence[topic][partition] || SEQUENCE_START

        return producerSequence[topic][partition]
      },

      /**
       * Update the sequence for a given Topic-Partition.
       *
       * Do nothing if not yet initialized (not idempotent)
       * @param {string} topic
       * @param {string} partition
       * @param {number} increment
       */
      updateSequence(topic, partition, increment) {
        if (!eosManager.isInitialized()) {
          return
        }

        const previous = eosManager.getSequence(topic, partition)
        let sequence = previous + increment

        // Sequence is defined as Int32 in the Record Batch,
        // so theoretically should need to rotate here
        if (sequence >= INT_32_MAX_VALUE) {
          logger.debug(
            `Sequence for ${topic} ${partition} exceeds max value (${sequence}). Rotating to 0.`
          )
          sequence = 0
        }

        producerSequence[topic][partition] = sequence
      },

      /**
       * Begin a transaction
       */
      beginTransaction() {
        transactionalGuard()
        stateMachine.transitionTo(STATES.TRANSACTING)
      },

      /**
       * Add partitions to a transaction if they are not already marked as participating.
       *
       * Should be called prior to sending any messages during a transaction
       * @param {TopicData[]} topicData
       *
       * @typedef {Object} TopicData
       * @property {string} topic
       * @property {object[]} partitions
       * @property {number} partitions[].partition
       */
      async addPartitionsToTransaction(topicData) {
        transactionalGuard()
        const newTopicPartitions = {}

        topicData.forEach(({ topic, partitions }) => {
          transactionTopicPartitions[topic] = transactionTopicPartitions[topic] || {}

          partitions.forEach(({ partition }) => {
            if (!transactionTopicPartitions[topic][partition]) {
              newTopicPartitions[topic] = newTopicPartitions[topic] || []
              newTopicPartitions[topic].push(partition)
            }
          })
        })

        const topics = Object.keys(newTopicPartitions).map(topic => ({
          topic,
          partitions: newTopicPartitions[topic],
        }))

        if (topics.length) {
          const broker = await findTransactionCoordinator()
          await broker.addPartitionsToTxn({ transactionalId, producerId, producerEpoch, topics })
        }

        topics.forEach(({ topic, partitions }) => {
          partitions.forEach(partition => {
            transactionTopicPartitions[topic][partition] = true
          })
        })
      },

      /**
       * Commit the ongoing transaction
       */
      async commit() {
        transactionalGuard()
        stateMachine.transitionTo(STATES.COMMITTING)

        if (!isOngoing()) {
          logger.debug('No partitions or offsets registered, not sending EndTxn')

          stateMachine.transitionTo(STATES.READY)
          return
        }

        const broker = await findTransactionCoordinator()
        await broker.endTxn({
          producerId,
          producerEpoch,
          transactionalId,
          transactionResult: true,
        })

        stateMachine.transitionTo(STATES.READY)
      },

      /**
       * Abort the ongoing transaction
       */
      async abort() {
        transactionalGuard()
        stateMachine.transitionTo(STATES.ABORTING)

        if (!isOngoing()) {
          logger.debug('No partitions or offsets registered, not sending EndTxn')

          stateMachine.transitionTo(STATES.READY)
          return
        }

        const broker = await findTransactionCoordinator()
        await broker.endTxn({
          producerId,
          producerEpoch,
          transactionalId,
          transactionResult: false,
        })

        stateMachine.transitionTo(STATES.READY)
      },

      /**
       * Whether the producer id has already been initialized
       */
      isInitialized() {
        return producerId !== NO_PRODUCER_ID
      },

      isTransactional() {
        return transactional
      },

      isInTransaction() {
        return stateMachine.state() === STATES.TRANSACTING
      },

      async acquireBrokerLock(broker) {
        if (this.isInitialized()) {
          brokerMutexLocks[broker.nodeId] =
            brokerMutexLocks[broker.nodeId] || new Lock({ timeout: 0xffff })
          await brokerMutexLocks[broker.nodeId].acquire()
        }
      },

      releaseBrokerLock(broker) {
        if (this.isInitialized()) brokerMutexLocks[broker.nodeId].release()
      },

      /**
       * Mark the provided offsets as participating in the transaction for the given consumer group.
       *
       * This allows us to commit an offset as consumed only if the transaction passes.
       * @param {string} consumerGroupId The unique group identifier
       * @param {OffsetCommitTopic[]} topics The unique group identifier
       * @returns {Promise}
       *
       * @typedef {Object} OffsetCommitTopic
       * @property {string} topic
       * @property {OffsetCommitTopicPartition[]} partitions
       *
       * @typedef {Object} OffsetCommitTopicPartition
       * @property {number} partition
       * @property {number} offset
       */
      async sendOffsets({ consumerGroupId, topics }) {
        assert(consumerGroupId, 'Missing consumerGroupId')
        assert(topics, 'Missing offset topics')

        const transactionCoordinator = await findTransactionCoordinator()

        // Do we need to add offsets if we've already done so for this consumer group?
        await transactionCoordinator.addOffsetsToTxn({
          transactionalId,
          producerId,
          producerEpoch,
          groupId: consumerGroupId,
        })

        hasOffsetsAddedToTransaction = true

        let groupCoordinator = await cluster.findGroupCoordinator({
          groupId: consumerGroupId,
          coordinatorType: COORDINATOR_TYPES.GROUP,
        })

        return retrier(async (bail, retryCount, retryTime) => {
          try {
            await groupCoordinator.txnOffsetCommit({
              transactionalId,
              producerId,
              producerEpoch,
              groupId: consumerGroupId,
              topics,
            })
          } catch (e) {
            if (COMMIT_RETRIABLE_PROTOCOL_ERRORS.includes(e.type)) {
              logger.debug('Group coordinator is not ready yet, retrying', {
                error: e.message,
                stack: e.stack,
                transactionalId,
                retryCount,
                retryTime,
              })

              throw e
            }

            if (
              COMMIT_STALE_COORDINATOR_PROTOCOL_ERRORS.includes(e.type) ||
              e.code === 'ECONNREFUSED'
            ) {
              logger.debug(
                'Invalid group coordinator, finding new group coordinator and retrying',
                {
                  error: e.message,
                  stack: e.stack,
                  transactionalId,
                  retryCount,
                  retryTime,
                }
              )

              groupCoordinator = await cluster.findGroupCoordinator({
                groupId: consumerGroupId,
                coordinatorType: COORDINATOR_TYPES.GROUP,
              })

              throw e
            }

            bail(e)
          }
        })
      },
    },

    /**
     * Transaction state guards
     */
    {
      initProducerId: { legalStates: [STATES.UNINITIALIZED, STATES.READY] },
      beginTransaction: { legalStates: [STATES.READY], async: false },
      addPartitionsToTransaction: { legalStates: [STATES.TRANSACTING] },
      sendOffsets: { legalStates: [STATES.TRANSACTING] },
      commit: { legalStates: [STATES.TRANSACTING] },
      abort: { legalStates: [STATES.TRANSACTING] },
    }
  )

  return eosManager
}
