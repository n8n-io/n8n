const Decoder = require('../../../decoder')
const { parse: parseV0 } = require('../v0/response')

/**
 * Metadata Response (Version: 2) => [brokers] cluster_id controller_id [topic_metadata]
 *   brokers => node_id host port rack
 *     node_id => INT32
 *     host => STRING
 *     port => INT32
 *     rack => NULLABLE_STRING
 *   cluster_id => NULLABLE_STRING
 *   controller_id => INT32
 *   topic_metadata => topic_error_code topic is_internal [partition_metadata]
 *     topic_error_code => INT16
 *     topic => STRING
 *     is_internal => BOOLEAN
 *     partition_metadata => partition_error_code partition_id leader [replicas] [isr]
 *       partition_error_code => INT16
 *       partition_id => INT32
 *       leader => INT32
 *       replicas => INT32
 *       isr => INT32
 */

const broker = decoder => ({
  nodeId: decoder.readInt32(),
  host: decoder.readString(),
  port: decoder.readInt32(),
  rack: decoder.readString(),
})

const topicMetadata = decoder => ({
  topicErrorCode: decoder.readInt16(),
  topic: decoder.readString(),
  isInternal: decoder.readBoolean(),
  partitionMetadata: decoder.readArray(partitionMetadata),
})

const partitionMetadata = decoder => ({
  partitionErrorCode: decoder.readInt16(),
  partitionId: decoder.readInt32(),
  leader: decoder.readInt32(),
  replicas: decoder.readArray(d => d.readInt32()),
  isr: decoder.readArray(d => d.readInt32()),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
    brokers: decoder.readArray(broker),
    clusterId: decoder.readString(),
    controllerId: decoder.readInt32(),
    topicMetadata: decoder.readArray(topicMetadata),
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
