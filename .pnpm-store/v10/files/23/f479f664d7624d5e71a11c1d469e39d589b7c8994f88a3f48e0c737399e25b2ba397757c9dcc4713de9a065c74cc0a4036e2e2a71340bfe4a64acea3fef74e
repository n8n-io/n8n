const Long = require('../utils/long')
const filterAbortedMessages = require('./filterAbortedMessages')

/**
 * A batch collects messages returned from a single fetch call.
 *
 * A batch could contain _multiple_ Kafka RecordBatches.
 */
module.exports = class Batch {
  constructor(topic, fetchedOffset, partitionData) {
    this.fetchedOffset = fetchedOffset
    const longFetchedOffset = Long.fromValue(this.fetchedOffset)
    const { abortedTransactions, messages } = partitionData

    this.topic = topic
    this.partition = partitionData.partition
    this.highWatermark = partitionData.highWatermark

    this.rawMessages = messages
    // Apparently fetch can return different offsets than the target offset provided to the fetch API.
    // Discard messages that are not in the requested offset
    // https://github.com/apache/kafka/blob/bf237fa7c576bd141d78fdea9f17f65ea269c290/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Fetcher.java#L912
    this.messagesWithinOffset = this.rawMessages.filter(message =>
      Long.fromValue(message.offset).gte(longFetchedOffset)
    )

    // 1. Don't expose aborted messages
    // 2. Don't expose control records
    // @see https://kafka.apache.org/documentation/#controlbatch
    this.messages = filterAbortedMessages({
      messages: this.messagesWithinOffset,
      abortedTransactions,
    }).filter(message => !message.isControlRecord)
  }

  isEmpty() {
    return this.messages.length === 0
  }

  isEmptyIncludingFiltered() {
    return this.messagesWithinOffset.length === 0
  }

  /**
   * If the batch contained raw messages (i.e was not truly empty) but all messages were filtered out due to
   * log compaction, control records or other reasons
   */
  isEmptyDueToFiltering() {
    return this.isEmpty() && this.rawMessages.length > 0
  }

  isEmptyControlRecord() {
    return (
      this.isEmpty() && this.messagesWithinOffset.some(({ isControlRecord }) => isControlRecord)
    )
  }

  /**
   * With compressed messages, it's possible for the returned messages to have offsets smaller than the starting offset.
   * These messages will be filtered out (i.e. they are not even included in this.messagesWithinOffset)
   * If these are the only messages, the batch will appear as an empty batch.
   *
   * isEmpty() and isEmptyIncludingFiltered() will always return true if the batch is empty,
   * but this method will only return true if the batch is empty due to log compacted messages.
   *
   * @returns boolean True if the batch is empty, because of log compacted messages in the partition.
   */
  isEmptyDueToLogCompactedMessages() {
    const hasMessages = this.rawMessages.length > 0
    return hasMessages && this.isEmptyIncludingFiltered()
  }

  firstOffset() {
    return this.isEmptyIncludingFiltered() ? null : this.messagesWithinOffset[0].offset
  }

  lastOffset() {
    if (this.isEmptyDueToLogCompactedMessages()) {
      return this.fetchedOffset
    }

    if (this.isEmptyIncludingFiltered()) {
      return Long.fromValue(this.highWatermark)
        .add(-1)
        .toString()
    }

    return this.messagesWithinOffset[this.messagesWithinOffset.length - 1].offset
  }

  /**
   * Returns the lag based on the last offset in the batch (also known as "high")
   */
  offsetLag() {
    const lastOffsetOfPartition = Long.fromValue(this.highWatermark).add(-1)
    const lastConsumedOffset = Long.fromValue(this.lastOffset())
    return lastOffsetOfPartition.add(lastConsumedOffset.multiply(-1)).toString()
  }

  /**
   * Returns the lag based on the first offset in the batch
   */
  offsetLagLow() {
    if (this.isEmptyIncludingFiltered()) {
      return '0'
    }

    const lastOffsetOfPartition = Long.fromValue(this.highWatermark).add(-1)
    const firstConsumedOffset = Long.fromValue(this.firstOffset())
    return lastOffsetOfPartition.add(firstConsumedOffset.multiply(-1)).toString()
  }
}
