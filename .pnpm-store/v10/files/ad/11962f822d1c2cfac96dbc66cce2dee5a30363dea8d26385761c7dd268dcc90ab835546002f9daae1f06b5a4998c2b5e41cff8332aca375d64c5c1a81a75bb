module.exports = ({ topic, partitionMetadata, messages, partitioner }) => {
  if (partitionMetadata.length === 0) {
    return {}
  }

  return messages.reduce((result, message) => {
    const partition = partitioner({ topic, partitionMetadata, message })
    const current = result[partition] || []
    return Object.assign(result, { [partition]: [...current, message] })
  }, {})
}
