const Encoder = require('../../../encoder')
const { DeleteRecords: apiKey } = require('../../apiKeys')

/**
 * DeleteRecords Request (Version: 0) => [topics] timeout_ms
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition offset
 *       partition => INT32
 *       offset => INT64
 *   timeout => INT32
 */
module.exports = ({ topics, timeout = 5000 }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'DeleteRecords',
  encode: async () => {
    return new Encoder()
      .writeArray(
        topics.map(({ topic, partitions }) => {
          return new Encoder().writeString(topic).writeArray(
            partitions.map(({ partition, offset }) => {
              return new Encoder().writeInt32(partition).writeInt64(offset)
            })
          )
        })
      )
      .writeInt32(timeout)
  },
})
