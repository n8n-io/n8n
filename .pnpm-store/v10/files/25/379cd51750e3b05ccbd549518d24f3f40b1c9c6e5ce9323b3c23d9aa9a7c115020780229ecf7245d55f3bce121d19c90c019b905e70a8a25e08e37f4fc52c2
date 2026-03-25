const swapObject = require('../utils/swapObject')
const networkEvents = require('../network/instrumentationEvents')
const InstrumentationEventType = require('../instrumentation/eventType')
const adminType = InstrumentationEventType('admin')

const events = {
  CONNECT: adminType('connect'),
  DISCONNECT: adminType('disconnect'),
  REQUEST: adminType(networkEvents.NETWORK_REQUEST),
  REQUEST_TIMEOUT: adminType(networkEvents.NETWORK_REQUEST_TIMEOUT),
  REQUEST_QUEUE_SIZE: adminType(networkEvents.NETWORK_REQUEST_QUEUE_SIZE),
}

const wrappedEvents = {
  [events.REQUEST]: networkEvents.NETWORK_REQUEST,
  [events.REQUEST_TIMEOUT]: networkEvents.NETWORK_REQUEST_TIMEOUT,
  [events.REQUEST_QUEUE_SIZE]: networkEvents.NETWORK_REQUEST_QUEUE_SIZE,
}

const reversedWrappedEvents = swapObject(wrappedEvents)
const unwrap = eventName => wrappedEvents[eventName] || eventName
const wrap = eventName => reversedWrappedEvents[eventName] || eventName

module.exports = {
  events,
  wrap,
  unwrap,
}
