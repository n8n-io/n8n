module.exports = class SeekOffsets extends Map {
  getKey(topic, partition) {
    return JSON.stringify([topic, partition])
  }

  set(topic, partition, offset) {
    const key = this.getKey(topic, partition)
    super.set(key, offset)
  }

  has(topic, partition) {
    const key = this.getKey(topic, partition)
    return super.has(key)
  }

  pop(topic, partition) {
    if (this.size === 0 || !this.has(topic, partition)) {
      return
    }

    const key = this.getKey(topic, partition)
    const offset = this.get(key)

    this.delete(key)
    return { topic, partition, offset }
  }
}
