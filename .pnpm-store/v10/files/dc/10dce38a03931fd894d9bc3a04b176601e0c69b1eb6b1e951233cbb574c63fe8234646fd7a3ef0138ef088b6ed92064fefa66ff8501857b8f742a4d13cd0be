const createRetry = require('../retry')
const { CONNECTION_STATUS } = require('../network/connectionStatus')
const { DefaultPartitioner } = require('./partitioners/')
const InstrumentationEventEmitter = require('../instrumentation/emitter')
const createEosManager = require('./eosManager')
const createMessageProducer = require('./messageProducer')
const { events, wrap: wrapEvent, unwrap: unwrapEvent } = require('./instrumentationEvents')
const { KafkaJSNonRetriableError } = require('../errors')

const { values, keys } = Object
const eventNames = values(events)
const eventKeys = keys(events)
  .map(key => `producer.events.${key}`)
  .join(', ')

const { CONNECT, DISCONNECT } = events

/**
 *
 * @param {Object} params
 * @param {import('../../types').Cluster} params.cluster
 * @param {import('../../types').Logger} params.logger
 * @param {import('../../types').ICustomPartitioner} [params.createPartitioner]
 * @param {import('../../types').RetryOptions} [params.retry]
 * @param {boolean} [params.idempotent]
 * @param {string} [params.transactionalId]
 * @param {number} [params.transactionTimeout]
 * @param {InstrumentationEventEmitter} [params.instrumentationEmitter]
 *
 * @returns {import('../../types').Producer}
 */
module.exports = ({
  cluster,
  logger: rootLogger,
  createPartitioner = DefaultPartitioner,
  retry,
  idempotent = false,
  transactionalId,
  transactionTimeout,
  instrumentationEmitter: rootInstrumentationEmitter,
}) => {
  let connectionStatus = CONNECTION_STATUS.DISCONNECTED
  retry = retry || { retries: idempotent ? Number.MAX_SAFE_INTEGER : 5 }

  if (idempotent && retry.retries < 1) {
    throw new KafkaJSNonRetriableError(
      'Idempotent producer must allow retries to protect against transient errors'
    )
  }

  const logger = rootLogger.namespace('Producer')

  if (idempotent && retry.retries < Number.MAX_SAFE_INTEGER) {
    logger.warn('Limiting retries for the idempotent producer may invalidate EoS guarantees')
  }

  const partitioner = createPartitioner()
  const retrier = createRetry(Object.assign({}, cluster.retry, retry))
  const instrumentationEmitter = rootInstrumentationEmitter || new InstrumentationEventEmitter()
  const idempotentEosManager = createEosManager({
    logger,
    cluster,
    transactionTimeout,
    transactional: false,
    transactionalId,
  })

  const { send, sendBatch } = createMessageProducer({
    logger,
    cluster,
    partitioner,
    eosManager: idempotentEosManager,
    idempotent,
    retrier,
    getConnectionStatus: () => connectionStatus,
  })

  let transactionalEosManager

  /** @type {import("../../types").Producer["on"]} */
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
   * Begin a transaction. The returned object contains methods to send messages
   * to the transaction and end the transaction by committing or aborting.
   *
   * Only messages sent on the transaction object will participate in the transaction.
   *
   * Calling any of the transactional methods after the transaction has ended
   * will raise an exception (use `isActive` to ascertain if ended).
   * @returns {Promise<Transaction>}
   *
   * @typedef {Object} Transaction
   * @property {Function} send  Identical to the producer "send" method
   * @property {Function} sendBatch Identical to the producer "sendBatch" method
   * @property {Function} abort Abort the transaction
   * @property {Function} commit  Commit the transaction
   * @property {Function} isActive  Whether the transaction is active
   */
  const transaction = async () => {
    if (!transactionalId) {
      throw new KafkaJSNonRetriableError('Must provide transactional id for transactional producer')
    }

    let transactionDidEnd = false
    transactionalEosManager =
      transactionalEosManager ||
      createEosManager({
        logger,
        cluster,
        transactionTimeout,
        transactional: true,
        transactionalId,
      })

    if (transactionalEosManager.isInTransaction()) {
      throw new KafkaJSNonRetriableError(
        'There is already an ongoing transaction for this producer. Please end the transaction before beginning another.'
      )
    }

    // We only initialize the producer id once
    if (!transactionalEosManager.isInitialized()) {
      await transactionalEosManager.initProducerId()
    }
    transactionalEosManager.beginTransaction()

    const { send: sendTxn, sendBatch: sendBatchTxn } = createMessageProducer({
      logger,
      cluster,
      partitioner,
      retrier,
      eosManager: transactionalEosManager,
      idempotent: true,
      getConnectionStatus: () => connectionStatus,
    })

    const isActive = () => transactionalEosManager.isInTransaction() && !transactionDidEnd

    const transactionGuard = fn => (...args) => {
      if (!isActive()) {
        return Promise.reject(
          new KafkaJSNonRetriableError('Cannot continue to use transaction once ended')
        )
      }

      return fn(...args)
    }

    return {
      sendBatch: transactionGuard(sendBatchTxn),
      send: transactionGuard(sendTxn),
      /**
       * Abort the ongoing transaction.
       *
       * @throws {KafkaJSNonRetriableError} If transaction has ended
       */
      abort: transactionGuard(async () => {
        await transactionalEosManager.abort()
        transactionDidEnd = true
      }),
      /**
       * Commit the ongoing transaction.
       *
       * @throws {KafkaJSNonRetriableError} If transaction has ended
       */
      commit: transactionGuard(async () => {
        await transactionalEosManager.commit()
        transactionDidEnd = true
      }),
      /**
       * Sends a list of specified offsets to the consumer group coordinator, and also marks those offsets as part of the current transaction.
       *
       * @throws {KafkaJSNonRetriableError} If transaction has ended
       */
      sendOffsets: transactionGuard(async ({ consumerGroupId, topics }) => {
        await transactionalEosManager.sendOffsets({ consumerGroupId, topics })

        for (const topicOffsets of topics) {
          const { topic, partitions } = topicOffsets
          for (const { partition, offset } of partitions) {
            cluster.markOffsetAsCommitted({
              groupId: consumerGroupId,
              topic,
              partition,
              offset,
            })
          }
        }
      }),
      isActive,
    }
  }

  /**
   * @returns {Object} logger
   */
  const getLogger = () => logger

  return {
    /**
     * @returns {Promise}
     */
    connect: async () => {
      await cluster.connect()
      connectionStatus = CONNECTION_STATUS.CONNECTED
      instrumentationEmitter.emit(CONNECT)

      if (idempotent && !idempotentEosManager.isInitialized()) {
        await idempotentEosManager.initProducerId()
      }
    },
    /**
     * @return {Promise}
     */
    disconnect: async () => {
      connectionStatus = CONNECTION_STATUS.DISCONNECTING
      await cluster.disconnect()
      connectionStatus = CONNECTION_STATUS.DISCONNECTED
      instrumentationEmitter.emit(DISCONNECT)
    },
    isIdempotent: () => {
      return idempotent
    },
    events,
    on,
    send,
    sendBatch,
    transaction,
    logger: getLogger,
  }
}
