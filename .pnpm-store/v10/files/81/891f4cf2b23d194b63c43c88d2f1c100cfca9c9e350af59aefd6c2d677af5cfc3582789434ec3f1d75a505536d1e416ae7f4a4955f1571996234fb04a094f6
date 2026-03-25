const Encoder = require('../../../encoder')
const { Fetch: apiKey } = require('../../apiKeys')

/**
 * Fetch Request (Version: 3) => replica_id max_wait_time min_bytes max_bytes [topics]
 *   replica_id => INT32
 *   max_wait_time => INT32
 *   min_bytes => INT32
 *   max_bytes => INT32
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition fetch_offset max_bytes
 *       partition => INT32
 *       fetch_offset => INT64
 *       max_bytes => INT32
 */

/**
 * @param {number} replicaId Broker id of the follower
 * @param {number} maxWaitTime Maximum time in ms to wait for the response
 * @param {number} minBytes Minimum bytes to accumulate in the response.
 * @param {number} maxBytes Maximum bytes to accumulate in the response. Note that this is not an absolute maximum,
 *                          if the first message in the first non-empty partition of the fetch is larger than this value,
 *                          the message will still be returned to ensure that progress can be made.
 * @param {Array} topics Topics to fetch
 *                        [
 *                          {
 *                            topic: 'topic-name',
 *                            partitions: [
 *                              {
 *                                partition: 0,
 *                                fetchOffset: '4124',
 *                                maxBytes: 2048
 *                              }
 *                            ]
 *                          }
 *                        ]
 */
module.exports = ({ replicaId, maxWaitTime, minBytes, maxBytes, topics }) => ({
  apiKey,
  apiVersion: 3,
  apiName: 'Fetch',
  encode: async () => {
    return new Encoder()
      .writeInt32(replicaId)
      .writeInt32(maxWaitTime)
      .writeInt32(minBytes)
      .writeInt32(maxBytes)
      .writeArray(topics.map(encodeTopic))
  },
})

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartition))
}

const encodePartition = ({ partition, fetchOffset, maxBytes }) => {
  return new Encoder()
    .writeInt32(partition)
    .writeInt64(fetchOffset)
    .writeInt32(maxBytes)
}
