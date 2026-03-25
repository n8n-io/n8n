const { EventEmitter } = require('events')
const Long = require('../utils/long')
const createRetry = require('../retry')
const { isKafkaJSError, isRebalancing } = require('../errors')

const {
  events: { FETCH, FETCH_START, START_BATCH_PROCESS, END_BATCH_PROCESS, REBALANCING },
} = require('./instrumentationEvents')
const createFetchManager = require('./fetchManager')

const isSameOffset = (offsetA, offsetB) => Long.fromValue(offsetA).equals(Long.fromValue(offsetB))
const CONSUMING_START = 'consuming-start'
const CONSUMING_STOP = 'consuming-stop'

module.exports = class Runner extends EventEmitter {
  /**
   * @param {object} options
   * @param {import("../../types").Logger} options.logger
   * @param {import("./consumerGroup")} options.consumerGroup
   * @param {import("../instrumentation/emitter")} options.instrumentationEmitter
   * @param {boolean} [options.eachBatchAutoResolve=true]
   * @param {number} options.concurrency
   * @param {(payload: import("../../types").EachBatchPayload) => Promise<void>} [options.eachBatch]
   * @param {(payload: import("../../types").EachMessagePayload) => Promise<void>} [options.eachMessage]
   * @param {number} [options.heartbeatInterval]
   * @param {(reason: Error) => void} options.onCrash
   * @param {import("../../types").RetryOptions} [options.retry]
   * @param {boolean} [options.autoCommit=true]
   */
  constructor({
    logger,
    consumerGroup,
    instrumentationEmitter,
    eachBatchAutoResolve = true,
    concurrency,
    eachBatch,
    eachMessage,
    heartbeatInterval,
    onCrash,
    retry,
    autoCommit = true,
  }) {
    super()
    this.logger = logger.namespace('Runner')
    this.consumerGroup = consumerGroup
    this.instrumentationEmitter = instrumentationEmitter
    this.eachBatchAutoResolve = eachBatchAutoResolve
    this.eachBatch = eachBatch
    this.eachMessage = eachMessage
    this.heartbeatInterval = heartbeatInterval
    this.retrier = createRetry(Object.assign({}, retry))
    this.onCrash = onCrash
    this.autoCommit = autoCommit
    this.fetchManager = createFetchManager({
      logger: this.logger,
      getNodeIds: () => this.consumerGroup.getNodeIds(),
      fetch: nodeId => this.fetch(nodeId),
      handler: batch => this.handleBatch(batch),
      concurrency,
    })

    this.running = false
    this.consuming = false
  }

  get consuming() {
    return this._consuming
  }

  set consuming(value) {
    if (this._consuming !== value) {
      this._consuming = value
      this.emit(value ? CONSUMING_START : CONSUMING_STOP)
    }
  }

  async start() {
    if (this.running) {
      return
    }

    try {
      await this.consumerGroup.connect()
      await this.consumerGroup.joinAndSync()
    } catch (e) {
      return this.onCrash(e)
    }

    this.running = true
    this.scheduleFetchManager()
  }

  scheduleFetchManager() {
    if (!this.running) {
      this.consuming = false

      this.logger.info('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      return
    }

    this.consuming = true

    this.retrier(async (bail, retryCount, retryTime) => {
      if (!this.running) {
        return
      }

      try {
        await this.fetchManager.start()
      } catch (e) {
        if (isRebalancing(e)) {
          this.logger.warn('The group is rebalancing, re-joining', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
          })

          this.instrumentationEmitter.emit(REBALANCING, {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
          })

          await this.consumerGroup.joinAndSync()
          return
        }

        if (e.type === 'UNKNOWN_MEMBER_ID') {
          this.logger.error('The coordinator is not aware of this member, re-joining the group', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
          })

          this.consumerGroup.memberId = null
          await this.consumerGroup.joinAndSync()
          return
        }

        if (e.name === 'KafkaJSNotImplemented') {
          return bail(e)
        }

        if (e.name === 'KafkaJSNoBrokerAvailableError') {
          return bail(e)
        }

        this.logger.debug('Error while scheduling fetch manager, trying again...', {
          groupId: this.consumerGroup.groupId,
          memberId: this.consumerGroup.memberId,
          error: e.message,
          stack: e.stack,
          retryCount,
          retryTime,
        })

        throw e
      }
    })
      .then(() => {
        this.scheduleFetchManager()
      })
      .catch(e => {
        this.onCrash(e)
        this.consuming = false
        this.running = false
      })
  }

  async stop() {
    if (!this.running) {
      return
    }

    this.logger.debug('stop consumer group', {
      groupId: this.consumerGroup.groupId,
      memberId: this.consumerGroup.memberId,
    })

    this.running = false

    try {
      await this.fetchManager.stop()
      await this.waitForConsumer()
      await this.consumerGroup.leave()
    } catch (e) {}
  }

  waitForConsumer() {
    return new Promise(resolve => {
      if (!this.consuming) {
        return resolve()
      }

      this.logger.debug('waiting for consumer to finish...', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      this.once(CONSUMING_STOP, () => resolve())
    })
  }

  async heartbeat() {
    try {
      await this.consumerGroup.heartbeat({ interval: this.heartbeatInterval })
    } catch (e) {
      if (isRebalancing(e)) {
        await this.autoCommitOffsets()
      }
      throw e
    }
  }

  async processEachMessage(batch) {
    const { topic, partition } = batch

    const pause = () => {
      this.consumerGroup.pause([{ topic, partitions: [partition] }])
      return () => this.consumerGroup.resume([{ topic, partitions: [partition] }])
    }
    for (const message of batch.messages) {
      if (!this.running || this.consumerGroup.hasSeekOffset({ topic, partition })) {
        break
      }

      try {
        await this.eachMessage({
          topic,
          partition,
          message,
          heartbeat: () => this.heartbeat(),
          pause,
        })
      } catch (e) {
        if (!isKafkaJSError(e)) {
          this.logger.error(`Error when calling eachMessage`, {
            topic,
            partition,
            offset: message.offset,
            stack: e.stack,
            error: e,
          })
        }

        // In case of errors, commit the previously consumed offsets unless autoCommit is disabled
        await this.autoCommitOffsets()
        throw e
      }

      this.consumerGroup.resolveOffset({ topic, partition, offset: message.offset })
      await this.heartbeat()
      await this.autoCommitOffsetsIfNecessary()

      if (this.consumerGroup.isPaused(topic, partition)) {
        break
      }
    }
  }

  async processEachBatch(batch) {
    const { topic, partition } = batch
    const lastFilteredMessage = batch.messages[batch.messages.length - 1]

    const pause = () => {
      this.consumerGroup.pause([{ topic, partitions: [partition] }])
      return () => this.consumerGroup.resume([{ topic, partitions: [partition] }])
    }

    try {
      await this.eachBatch({
        batch,
        resolveOffset: offset => {
          /**
           * The transactional producer generates a control record after committing the transaction.
           * The control record is the last record on the RecordBatch, and it is filtered before it
           * reaches the eachBatch callback. When disabling auto-resolve, the user-land code won't
           * be able to resolve the control record offset, since it never reaches the callback,
           * causing stuck consumers as the consumer will never move the offset marker.
           *
           * When the last offset of the batch is resolved, we should automatically resolve
           * the control record offset as this entry doesn't have any meaning to the user-land code,
           * and won't interfere with the stream processing.
           *
           * @see https://github.com/apache/kafka/blob/9aa660786e46c1efbf5605a6a69136a1dac6edb9/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Fetcher.java#L1499-L1505
           */
          const offsetToResolve =
            lastFilteredMessage && isSameOffset(offset, lastFilteredMessage.offset)
              ? batch.lastOffset()
              : offset

          this.consumerGroup.resolveOffset({ topic, partition, offset: offsetToResolve })
        },
        heartbeat: () => this.heartbeat(),
        /**
         * Pause consumption for the current topic-partition being processed
         */
        pause,
        /**
         * Commit offsets if provided. Otherwise commit most recent resolved offsets
         * if the autoCommit conditions are met.
         *
         * @param {import('../../types').OffsetsByTopicPartition} [offsets] Optional.
         */
        commitOffsetsIfNecessary: async offsets => {
          return offsets
            ? this.consumerGroup.commitOffsets(offsets)
            : this.consumerGroup.commitOffsetsIfNecessary()
        },
        uncommittedOffsets: () => this.consumerGroup.uncommittedOffsets(),
        isRunning: () => this.running,
        isStale: () => this.consumerGroup.hasSeekOffset({ topic, partition }),
      })
    } catch (e) {
      if (!isKafkaJSError(e)) {
        this.logger.error(`Error when calling eachBatch`, {
          topic,
          partition,
          offset: batch.firstOffset(),
          stack: e.stack,
          error: e,
        })
      }

      // eachBatch has a special resolveOffset which can be used
      // to keep track of the messages
      await this.autoCommitOffsets()
      throw e
    }

    // resolveOffset for the last offset can be disabled to allow the users of eachBatch to
    // stop their consumers without resolving unprocessed offsets (issues/18)
    if (this.eachBatchAutoResolve) {
      this.consumerGroup.resolveOffset({ topic, partition, offset: batch.lastOffset() })
    }
  }

  async fetch(nodeId) {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      return []
    }

    const startFetch = Date.now()

    this.instrumentationEmitter.emit(FETCH_START, { nodeId })

    const batches = await this.consumerGroup.fetch(nodeId)

    this.instrumentationEmitter.emit(FETCH, {
      /**
       * PR #570 removed support for the number of batches in this instrumentation event;
       * The new implementation uses an async generation to deliver the batches, which makes
       * this number impossible to get. The number is set to 0 to keep the event backward
       * compatible until we bump KafkaJS to version 2, following the end of node 8 LTS.
       *
       * @since 2019-11-29
       */
      numberOfBatches: 0,
      duration: Date.now() - startFetch,
      nodeId,
    })

    if (batches.length === 0) {
      await this.heartbeat()
    }

    return batches
  }

  async handleBatch(batch) {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      return
    }

    /** @param {import('./batch')} batch */
    const onBatch = async batch => {
      const startBatchProcess = Date.now()
      const payload = {
        topic: batch.topic,
        partition: batch.partition,
        highWatermark: batch.highWatermark,
        offsetLag: batch.offsetLag(),
        /**
         * @since 2019-06-24 (>= 1.8.0)
         *
         * offsetLag returns the lag based on the latest offset in the batch, to
         * keep the event backward compatible we just introduced "offsetLagLow"
         * which calculates the lag based on the first offset in the batch
         */
        offsetLagLow: batch.offsetLagLow(),
        batchSize: batch.messages.length,
        firstOffset: batch.firstOffset(),
        lastOffset: batch.lastOffset(),
      }

      /**
       * If the batch contained only control records or only aborted messages then we still
       * need to resolve and auto-commit to ensure the consumer can move forward.
       *
       * We also need to emit batch instrumentation events to allow any listeners keeping
       * track of offsets to know about the latest point of consumption.
       *
       * Added in #1256
       *
       * @see https://github.com/apache/kafka/blob/9aa660786e46c1efbf5605a6a69136a1dac6edb9/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Fetcher.java#L1499-L1505
       */
      if (batch.isEmptyDueToFiltering()) {
        this.instrumentationEmitter.emit(START_BATCH_PROCESS, payload)

        this.consumerGroup.resolveOffset({
          topic: batch.topic,
          partition: batch.partition,
          offset: batch.lastOffset(),
        })
        await this.autoCommitOffsetsIfNecessary()

        this.instrumentationEmitter.emit(END_BATCH_PROCESS, {
          ...payload,
          duration: Date.now() - startBatchProcess,
        })

        await this.heartbeat()
        return
      }

      if (batch.isEmpty()) {
        await this.heartbeat()
        return
      }

      this.instrumentationEmitter.emit(START_BATCH_PROCESS, payload)

      if (this.eachMessage) {
        await this.processEachMessage(batch)
      } else if (this.eachBatch) {
        await this.processEachBatch(batch)
      }

      this.instrumentationEmitter.emit(END_BATCH_PROCESS, {
        ...payload,
        duration: Date.now() - startBatchProcess,
      })

      await this.autoCommitOffsets()
      await this.heartbeat()
    }

    await onBatch(batch)
  }

  autoCommitOffsets() {
    if (this.autoCommit) {
      return this.consumerGroup.commitOffsets()
    }
  }

  autoCommitOffsetsIfNecessary() {
    if (this.autoCommit) {
      return this.consumerGroup.commitOffsetsIfNecessary()
    }
  }

  commitOffsets(offsets) {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
        offsets,
      })
      return
    }

    return this.retrier(async (bail, retryCount, retryTime) => {
      try {
        await this.consumerGroup.commitOffsets(offsets)
      } catch (e) {
        if (!this.running) {
          this.logger.debug('consumer not running, exiting', {
            error: e.message,
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            offsets,
          })
          return
        }

        if (e.name === 'KafkaJSNotImplemented') {
          return bail(e)
        }

        this.logger.debug('Error while committing offsets, trying again...', {
          groupId: this.consumerGroup.groupId,
          memberId: this.consumerGroup.memberId,
          error: e.message,
          stack: e.stack,
          retryCount,
          retryTime,
          offsets,
        })

        throw e
      }
    })
  }
}
