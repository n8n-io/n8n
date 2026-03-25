const Encoder = require('../../../encoder')
const { Produce: apiKey } = require('../../apiKeys')
const MessageSet = require('../../../messageSet')

/**
 * Produce Request (Version: 0) => acks timeout [topic_data]
 *   acks => INT16
 *   timeout => INT32
 *   topic_data => topic [data]
 *     topic => STRING
 *     data => partition record_set record_set_size
 *       partition => INT32
 *       record_set_size => INT32
 *       record_set => RECORDS
 */

/**
 * MessageV0:
 * {
 *   key: bytes,
 *   value: bytes
 * }
 *
 * MessageSet:
 * [
 *   { key: "<value>", value: "<value>" },
 *   { key: "<value>", value: "<value>" },
 * ]
 *
 * TopicData:
 * [
 *   {
 *     topic: 'name1',
 *     partitions: [
 *       {
 *         partition: 0,
 *         messages: [<MessageSet>]
 *       }
 *     ]
 *   }
 * ]
 */

/**
 * @param acks {Integer} This field indicates how many acknowledgements the servers should receive before
 *                       responding to the request. If it is 0 the server will not send any response
 *                       (this is the only case where the server will not reply to a request). If it is 1,
 *                       the server will wait the data is written to the local log before sending a response.
 *                       If it is -1 the server will block until the message is committed by all in sync replicas
 *                       before sending a response.
 *
 * @param timeout {Integer} This provides a maximum time in milliseconds the server can await the receipt of the number
 *                          of acknowledgements in RequiredAcks. The timeout is not an exact limit on the request time
 *                          for a few reasons:
 *                          (1) it does not include network latency,
 *                          (2) the timer begins at the beginning of the processing of this request so if many requests are
 *                              queued due to server overload that wait time will not be included,
 *                          (3) we will not terminate a local write so if the local write time exceeds this timeout it will not
 *                              be respected. To get a hard timeout of this type the client should use the socket timeout.
 *
 * @param topicData {Array}
 */
module.exports = ({ acks, timeout, topicData }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'Produce',
  expectResponse: () => acks !== 0,
  encode: async () => {
    return new Encoder()
      .writeInt16(acks)
      .writeInt32(timeout)
      .writeArray(topicData.map(encodeTopic))
  },
})

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartitions))
}

const encodePartitions = ({ partition, messages }) => {
  const messageSet = MessageSet({ messageVersion: 0, entries: messages })
  return new Encoder()
    .writeInt32(partition)
    .writeInt32(messageSet.size())
    .writeEncoder(messageSet)
}
