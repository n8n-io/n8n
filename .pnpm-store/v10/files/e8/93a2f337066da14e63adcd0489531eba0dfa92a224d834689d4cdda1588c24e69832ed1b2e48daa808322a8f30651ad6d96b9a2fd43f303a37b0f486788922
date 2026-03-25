module.exports = topicDataForBroker => {
  return topicDataForBroker.map(
    ({ topic, partitions, messagesPerPartition, sequencePerPartition }) => ({
      topic,
      partitions: partitions.map(partition => ({
        partition,
        messages: messagesPerPartition[partition],
      })),
    })
  )
}
