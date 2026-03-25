const Encoder = require('../../../encoder')
const { AddOffsetsToTxn: apiKey } = require('../../apiKeys')

/**
 * AddOffsetsToTxn Request (Version: 0) => transactional_id producer_id producer_epoch group_id
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   group_id => STRING
 */

module.exports = ({ transactionalId, producerId, producerEpoch, groupId }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'AddOffsetsToTxn',
  encode: async () => {
    return new Encoder()
      .writeString(transactionalId)
      .writeInt64(producerId)
      .writeInt16(producerEpoch)
      .writeString(groupId)
  },
})
