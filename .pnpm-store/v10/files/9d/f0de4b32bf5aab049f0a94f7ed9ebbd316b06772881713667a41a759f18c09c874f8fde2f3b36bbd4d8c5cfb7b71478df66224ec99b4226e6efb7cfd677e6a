const Encoder = require('../../../encoder')
const { AddPartitionsToTxn: apiKey } = require('../../apiKeys')

/**
 * AddPartitionsToTxn Request (Version: 0) => transactional_id producer_id producer_epoch [topics]
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => INT32
 */

module.exports = ({ transactionalId, producerId, producerEpoch, topics }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'AddPartitionsToTxn',
  encode: async () => {
    return new Encoder()
      .writeString(transactionalId)
      .writeInt64(producerId)
      .writeInt16(producerEpoch)
      .writeArray(topics.map(encodeTopic))
  },
})

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartition))
}

const encodePartition = partition => {
  return new Encoder().writeInt32(partition)
}
