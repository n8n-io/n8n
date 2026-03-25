const Long = require('../utils/long')
const ABORTED_MESSAGE_KEY = Buffer.from([0, 0, 0, 0])

const isAbortMarker = ({ key }) => {
  // Handle null/undefined keys.
  if (!key) return false
  // Cast key to buffer defensively
  return Buffer.from(key).equals(ABORTED_MESSAGE_KEY)
}

/**
 * Remove messages marked as aborted according to the aborted transactions list.
 *
 * Start of an aborted transaction is determined by message offset.
 * End of an aborted transaction is determined by control messages.
 * @param {Message[]} messages
 * @param {Transaction[]} [abortedTransactions]
 * @returns {Message[]} Messages which did not participate in an aborted transaction
 *
 * @typedef {object} Message
 * @param {Buffer} key
 * @param {lastOffset} key  Int64
 * @param {RecordBatch}  batchContext
 *
 * @typedef {object} Transaction
 * @param {string} firstOffset  Int64
 * @param {string} producerId  Int64
 *
 * @typedef {object} RecordBatch
 * @param {string}  producerId  Int64
 * @param {boolean}  inTransaction
 */
module.exports = ({ messages, abortedTransactions }) => {
  const currentAbortedTransactions = new Map()

  if (!abortedTransactions || !abortedTransactions.length) {
    return messages
  }

  const remainingAbortedTransactions = [...abortedTransactions]

  return messages.filter(message => {
    // If the message offset is GTE the first offset of the next aborted transaction
    // then we have stepped into an aborted transaction.
    if (
      remainingAbortedTransactions.length &&
      Long.fromValue(message.offset).gte(remainingAbortedTransactions[0].firstOffset)
    ) {
      const { producerId } = remainingAbortedTransactions.shift()
      currentAbortedTransactions.set(producerId, true)
    }

    const { producerId, inTransaction } = message.batchContext

    if (isAbortMarker(message)) {
      // Transaction is over, we no longer need to ignore messages from this producer
      currentAbortedTransactions.delete(producerId)
    } else if (currentAbortedTransactions.has(producerId) && inTransaction) {
      return false
    }

    return true
  })
}
