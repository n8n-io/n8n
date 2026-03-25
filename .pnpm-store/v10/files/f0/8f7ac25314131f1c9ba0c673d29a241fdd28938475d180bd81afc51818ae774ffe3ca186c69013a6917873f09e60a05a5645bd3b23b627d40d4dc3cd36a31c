const { KafkaJSMetadataNotLoaded } = require('../errors')
const { staleMetadata } = require('../protocol/error')
const groupMessagesPerPartition = require('./groupMessagesPerPartition')
const createTopicData = require('./createTopicData')
const responseSerializer = require('./responseSerializer')

const { keys } = Object

/**
 * @param {Object} options
 * @param {import("../../types").Logger} options.logger
 * @param {import("../../types").Cluster} options.cluster
 * @param {ReturnType<import("../../types").ICustomPartitioner>} options.partitioner
 * @param {import("./eosManager").EosManager} options.eosManager
 * @param {import("../retry").Retrier} options.retrier
 */
module.exports = ({ logger, cluster, partitioner, eosManager, retrier }) => {
  return async ({ acks, timeout, compression, topicMessages }) => {
    /** @type {Map<import("../../types").Broker, any[]>} */
    const responsePerBroker = new Map()

    /** @param {Map<import("../../types").Broker, any[]>} responsePerBroker */
    const createProducerRequests = async responsePerBroker => {
      const topicMetadata = new Map()

      await cluster.refreshMetadataIfNecessary()

      for (const { topic, messages } of topicMessages) {
        const partitionMetadata = cluster.findTopicPartitionMetadata(topic)

        if (partitionMetadata.length === 0) {
          logger.debug('Producing to topic without metadata', {
            topic,
            targetTopics: Array.from(cluster.targetTopics),
          })

          throw new KafkaJSMetadataNotLoaded('Producing to topic without metadata')
        }

        const messagesPerPartition = groupMessagesPerPartition({
          topic,
          partitionMetadata,
          messages,
          partitioner,
        })

        const partitions = keys(messagesPerPartition)
        const partitionsPerLeader = cluster.findLeaderForPartitions(topic, partitions)
        const leaders = keys(partitionsPerLeader)

        topicMetadata.set(topic, {
          partitionsPerLeader,
          messagesPerPartition,
        })

        for (const nodeId of leaders) {
          const broker = await cluster.findBroker({ nodeId })
          if (!responsePerBroker.has(broker)) {
            responsePerBroker.set(broker, null)
          }
        }
      }

      const brokers = Array.from(responsePerBroker.keys())
      const brokersWithoutResponse = brokers.filter(broker => !responsePerBroker.get(broker))

      return brokersWithoutResponse.map(async broker => {
        const entries = Array.from(topicMetadata.entries())
        const topicDataForBroker = entries
          .filter(([_, { partitionsPerLeader }]) => !!partitionsPerLeader[broker.nodeId])
          .map(([topic, { partitionsPerLeader, messagesPerPartition, sequencePerPartition }]) => ({
            topic,
            partitions: partitionsPerLeader[broker.nodeId],
            messagesPerPartition,
          }))

        const topicData = createTopicData(topicDataForBroker)

        await eosManager.acquireBrokerLock(broker)
        try {
          if (eosManager.isTransactional()) {
            await eosManager.addPartitionsToTransaction(topicData)
          }

          topicData.forEach(({ topic, partitions }) => {
            partitions.forEach(entry => {
              entry['firstSequence'] = eosManager.getSequence(topic, entry.partition)
              eosManager.updateSequence(topic, entry.partition, entry.messages.length)
            })
          })

          let response
          try {
            response = await broker.produce({
              transactionalId: eosManager.isTransactional()
                ? eosManager.getTransactionalId()
                : undefined,
              producerId: eosManager.getProducerId(),
              producerEpoch: eosManager.getProducerEpoch(),
              acks,
              timeout,
              compression,
              topicData,
            })
          } catch (e) {
            topicData.forEach(({ topic, partitions }) => {
              partitions.forEach(entry => {
                eosManager.updateSequence(topic, entry.partition, -entry.messages.length)
              })
            })
            throw e
          }

          const expectResponse = acks !== 0
          const formattedResponse = expectResponse ? responseSerializer(response) : []

          responsePerBroker.set(broker, formattedResponse)
        } catch (e) {
          responsePerBroker.delete(broker)
          throw e
        } finally {
          await eosManager.releaseBrokerLock(broker)
        }
      })
    }

    return retrier(async (bail, retryCount, retryTime) => {
      const topics = topicMessages.map(({ topic }) => topic)
      await cluster.addMultipleTargetTopics(topics)

      try {
        const requests = await createProducerRequests(responsePerBroker)
        await Promise.all(requests)
        return Array.from(responsePerBroker.values()).flat()
      } catch (e) {
        if (e.name === 'KafkaJSConnectionClosedError') {
          cluster.removeBroker({ host: e.host, port: e.port })
        }

        if (!cluster.isConnected()) {
          logger.debug(`Cluster has disconnected, reconnecting: ${e.message}`, {
            retryCount,
            retryTime,
          })
          await cluster.connect()
          await cluster.refreshMetadata()
          throw e
        }

        // This is necessary in case the metadata is stale and the number of partitions
        // for this topic has increased in the meantime
        if (
          staleMetadata(e) ||
          e.name === 'KafkaJSMetadataNotLoaded' ||
          e.name === 'KafkaJSConnectionError' ||
          e.name === 'KafkaJSConnectionClosedError' ||
          (e.name === 'KafkaJSProtocolError' && e.retriable)
        ) {
          logger.error(`Failed to send messages: ${e.message}`, { retryCount, retryTime })
          await cluster.refreshMetadata()
          throw e
        }

        logger.error(`${e.message}`, { retryCount, retryTime })
        if (e.retriable) throw e
        bail(e)
      }
    })
  }
}
