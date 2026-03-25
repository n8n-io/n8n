/* Protocol - protocol constants */
const protocol = module.exports
const { Buffer } = require('buffer')

/* Command code => mnemonic */
protocol.types = {
  0: 'reserved',
  1: 'connect',
  2: 'connack',
  3: 'publish',
  4: 'puback',
  5: 'pubrec',
  6: 'pubrel',
  7: 'pubcomp',
  8: 'subscribe',
  9: 'suback',
  10: 'unsubscribe',
  11: 'unsuback',
  12: 'pingreq',
  13: 'pingresp',
  14: 'disconnect',
  15: 'auth'
}

protocol.requiredHeaderFlags = {
  1: 0, // 'connect'
  2: 0, // 'connack'
  4: 0, // 'puback'
  5: 0, // 'pubrec'
  6: 2, // 'pubrel'
  7: 0, // 'pubcomp'
  8: 2, // 'subscribe'
  9: 0, // 'suback'
  10: 2, // 'unsubscribe'
  11: 0, // 'unsuback'
  12: 0, // 'pingreq'
  13: 0, // 'pingresp'
  14: 0, // 'disconnect'
  15: 0 // 'auth'
}

protocol.requiredHeaderFlagsErrors = {}
for (const k in protocol.requiredHeaderFlags) {
  const v = protocol.requiredHeaderFlags[k]
  protocol.requiredHeaderFlagsErrors[k] = 'Invalid header flag bits, must be 0x' + v.toString(16) + ' for ' + protocol.types[k] + ' packet'
}

/* Mnemonic => Command code */
protocol.codes = {}
for (const k in protocol.types) {
  const v = protocol.types[k]
  protocol.codes[v] = k
}

/* Header */
protocol.CMD_SHIFT = 4
protocol.CMD_MASK = 0xF0
protocol.DUP_MASK = 0x08
protocol.QOS_MASK = 0x03
protocol.QOS_SHIFT = 1
protocol.RETAIN_MASK = 0x01

/* Length */
protocol.VARBYTEINT_MASK = 0x7F
protocol.VARBYTEINT_FIN_MASK = 0x80
protocol.VARBYTEINT_MAX = 268435455

/* Connack */
protocol.SESSIONPRESENT_MASK = 0x01
protocol.SESSIONPRESENT_HEADER = Buffer.from([protocol.SESSIONPRESENT_MASK])
protocol.CONNACK_HEADER = Buffer.from([protocol.codes.connack << protocol.CMD_SHIFT])

/* Connect */
protocol.USERNAME_MASK = 0x80
protocol.PASSWORD_MASK = 0x40
protocol.WILL_RETAIN_MASK = 0x20
protocol.WILL_QOS_MASK = 0x18
protocol.WILL_QOS_SHIFT = 3
protocol.WILL_FLAG_MASK = 0x04
protocol.CLEAN_SESSION_MASK = 0x02
protocol.CONNECT_HEADER = Buffer.from([protocol.codes.connect << protocol.CMD_SHIFT])

/* Properties */
protocol.properties = {
  sessionExpiryInterval: 17,
  willDelayInterval: 24,
  receiveMaximum: 33,
  maximumPacketSize: 39,
  topicAliasMaximum: 34,
  requestResponseInformation: 25,
  requestProblemInformation: 23,
  userProperties: 38,
  authenticationMethod: 21,
  authenticationData: 22,
  payloadFormatIndicator: 1,
  messageExpiryInterval: 2,
  contentType: 3,
  responseTopic: 8,
  correlationData: 9,
  maximumQoS: 36,
  retainAvailable: 37,
  assignedClientIdentifier: 18,
  reasonString: 31,
  wildcardSubscriptionAvailable: 40,
  subscriptionIdentifiersAvailable: 41,
  sharedSubscriptionAvailable: 42,
  serverKeepAlive: 19,
  responseInformation: 26,
  serverReference: 28,
  topicAlias: 35,
  subscriptionIdentifier: 11
}
protocol.propertiesCodes = {}
for (const prop in protocol.properties) {
  const id = protocol.properties[prop]
  protocol.propertiesCodes[id] = prop
}
protocol.propertiesTypes = {
  sessionExpiryInterval: 'int32',
  willDelayInterval: 'int32',
  receiveMaximum: 'int16',
  maximumPacketSize: 'int32',
  topicAliasMaximum: 'int16',
  requestResponseInformation: 'byte',
  requestProblemInformation: 'byte',
  userProperties: 'pair',
  authenticationMethod: 'string',
  authenticationData: 'binary',
  payloadFormatIndicator: 'byte',
  messageExpiryInterval: 'int32',
  contentType: 'string',
  responseTopic: 'string',
  correlationData: 'binary',
  maximumQoS: 'int8',
  retainAvailable: 'byte',
  assignedClientIdentifier: 'string',
  reasonString: 'string',
  wildcardSubscriptionAvailable: 'byte',
  subscriptionIdentifiersAvailable: 'byte',
  sharedSubscriptionAvailable: 'byte',
  serverKeepAlive: 'int16',
  responseInformation: 'string',
  serverReference: 'string',
  topicAlias: 'int16',
  subscriptionIdentifier: 'var'
}

function genHeader (type) {
  return [0, 1, 2].map(qos => {
    return [0, 1].map(dup => {
      return [0, 1].map(retain => {
        const buf = Buffer.alloc(1)
        buf.writeUInt8(
          protocol.codes[type] << protocol.CMD_SHIFT |
          (dup ? protocol.DUP_MASK : 0) |
          qos << protocol.QOS_SHIFT | retain, 0, true)
        return buf
      })
    })
  })
}

/* Publish */
protocol.PUBLISH_HEADER = genHeader('publish')

/* Subscribe */
protocol.SUBSCRIBE_HEADER = genHeader('subscribe')
protocol.SUBSCRIBE_OPTIONS_QOS_MASK = 0x03
protocol.SUBSCRIBE_OPTIONS_NL_MASK = 0x01
protocol.SUBSCRIBE_OPTIONS_NL_SHIFT = 2
protocol.SUBSCRIBE_OPTIONS_RAP_MASK = 0x01
protocol.SUBSCRIBE_OPTIONS_RAP_SHIFT = 3
protocol.SUBSCRIBE_OPTIONS_RH_MASK = 0x03
protocol.SUBSCRIBE_OPTIONS_RH_SHIFT = 4
protocol.SUBSCRIBE_OPTIONS_RH = [0x00, 0x10, 0x20]
protocol.SUBSCRIBE_OPTIONS_NL = 0x04
protocol.SUBSCRIBE_OPTIONS_RAP = 0x08
protocol.SUBSCRIBE_OPTIONS_QOS = [0x00, 0x01, 0x02]

/* Unsubscribe */
protocol.UNSUBSCRIBE_HEADER = genHeader('unsubscribe')

/* Confirmations */
protocol.ACKS = {
  unsuback: genHeader('unsuback'),
  puback: genHeader('puback'),
  pubcomp: genHeader('pubcomp'),
  pubrel: genHeader('pubrel'),
  pubrec: genHeader('pubrec')
}

protocol.SUBACK_HEADER = Buffer.from([protocol.codes.suback << protocol.CMD_SHIFT])

/* Protocol versions */
protocol.VERSION3 = Buffer.from([3])
protocol.VERSION4 = Buffer.from([4])
protocol.VERSION5 = Buffer.from([5])
protocol.VERSION131 = Buffer.from([131])
protocol.VERSION132 = Buffer.from([132])

/* QoS */
protocol.QOS = [0, 1, 2].map(qos => {
  return Buffer.from([qos])
})

/* Empty packets */
protocol.EMPTY = {
  pingreq: Buffer.from([protocol.codes.pingreq << 4, 0]),
  pingresp: Buffer.from([protocol.codes.pingresp << 4, 0]),
  disconnect: Buffer.from([protocol.codes.disconnect << 4, 0])
}

protocol.MQTT5_PUBACK_PUBREC_CODES = {
  0x00: 'Success',
  0x10: 'No matching subscribers',
  0x80: 'Unspecified error',
  0x83: 'Implementation specific error',
  0x87: 'Not authorized',
  0x90: 'Topic Name invalid',
  0x91: 'Packet identifier in use',
  0x97: 'Quota exceeded',
  0x99: 'Payload format invalid'
}

protocol.MQTT5_PUBREL_PUBCOMP_CODES = {
  0x00: 'Success',
  0x92: 'Packet Identifier not found'
}

protocol.MQTT5_SUBACK_CODES = {
  0x00: 'Granted QoS 0',
  0x01: 'Granted QoS 1',
  0x02: 'Granted QoS 2',
  0x80: 'Unspecified error',
  0x83: 'Implementation specific error',
  0x87: 'Not authorized',
  0x8F: 'Topic Filter invalid',
  0x91: 'Packet Identifier in use',
  0x97: 'Quota exceeded',
  0x9E: 'Shared Subscriptions not supported',
  0xA1: 'Subscription Identifiers not supported',
  0xA2: 'Wildcard Subscriptions not supported'
}

protocol.MQTT5_UNSUBACK_CODES = {
  0x00: 'Success',
  0x11: 'No subscription existed',
  0x80: 'Unspecified error',
  0x83: 'Implementation specific error',
  0x87: 'Not authorized',
  0x8F: 'Topic Filter invalid',
  0x91: 'Packet Identifier in use'
}

protocol.MQTT5_DISCONNECT_CODES = {
  0x00: 'Normal disconnection',
  0x04: 'Disconnect with Will Message',
  0x80: 'Unspecified error',
  0x81: 'Malformed Packet',
  0x82: 'Protocol Error',
  0x83: 'Implementation specific error',
  0x87: 'Not authorized',
  0x89: 'Server busy',
  0x8B: 'Server shutting down',
  0x8D: 'Keep Alive timeout',
  0x8E: 'Session taken over',
  0x8F: 'Topic Filter invalid',
  0x90: 'Topic Name invalid',
  0x93: 'Receive Maximum exceeded',
  0x94: 'Topic Alias invalid',
  0x95: 'Packet too large',
  0x96: 'Message rate too high',
  0x97: 'Quota exceeded',
  0x98: 'Administrative action',
  0x99: 'Payload format invalid',
  0x9A: 'Retain not supported',
  0x9B: 'QoS not supported',
  0x9C: 'Use another server',
  0x9D: 'Server moved',
  0x9E: 'Shared Subscriptions not supported',
  0x9F: 'Connection rate exceeded',
  0xA0: 'Maximum connect time',
  0xA1: 'Subscription Identifiers not supported',
  0xA2: 'Wildcard Subscriptions not supported'
}

protocol.MQTT5_AUTH_CODES = {
  0x00: 'Success',
  0x18: 'Continue authentication',
  0x19: 'Re-authenticate'
}
