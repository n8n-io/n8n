module.exports = ({ topics }) =>
  topics.flatMap(({ topicName, partitions }) =>
    partitions.map(partition => ({ topicName, ...partition }))
  )
