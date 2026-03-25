let id = 0
const nextId = () => {
  if (id === Number.MAX_VALUE) {
    id = 0
  }

  return id++
}

class InstrumentationEvent {
  /**
   * @param {String} type
   * @param {Object} payload
   */
  constructor(type, payload) {
    this.id = nextId()
    this.type = type
    this.timestamp = Date.now()
    this.payload = payload
  }
}

module.exports = InstrumentationEvent
