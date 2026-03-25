const mqtt = require('./')
const crypto = require('crypto')
const max = 1E5
const start = Date.now() / 1000
let errors = 0
let packets = 0
let randomPacket
const firstBytes = [
  16 * 1, // CONNECT
  16 * 2, // CONNACK
  16 * 3, // PUBLISH, QoS: 0, No Retain, No Dup
  16 * 3 + 1, // PUBLISH, QoS: 0, Retain, No Dup
  16 * 3 + 8, // PUBLISH, QoS: 0, No Retain, Dup
  16 * 3 + 1 + 8, // PUBLISH, QoS: 0, Retain, Dup
  16 * 3 + 2, // PUBLISH, QoS: 1, No Retain, No Dup
  16 * 3 + 2 + 1, // PUBLISH, QoS: 1, Retain, No Dup
  16 * 3 + 2 + 8, // PUBLISH, QoS: 1, No Retain, Dup
  16 * 3 + 2 + 1 + 8, // PUBLISH, QoS: 1, Retain, Dup
  16 * 3 + 4, // PUBLISH, QoS: 2, No Retain, No Dup
  16 * 3 + 4 + 1, // PUBLISH, QoS: 2, Retain, No Dup
  16 * 3 + 4 + 8, // PUBLISH, QoS: 2, No Retain, Dup
  16 * 3 + 4 + 1 + 8, // PUBLISH, QoS: 2, Retain, Dup
  16 * 4, // PUBACK
  16 * 5, // PUBREC
  16 * 6, // PUBREL
  16 * 7, // PUBCOMP
  16 * 8, // SUBSCRIBE
  16 * 9, // SUBACK
  16 * 10, // UNSUBSCRIBE
  16 * 11, // UNSUBACK
  16 * 12, // PINGREQ
  16 * 13, // PINGRESP
  16 * 14, // DISCONNECT
  16 * 15 // RESERVED
]

function doParse () {
  const parser = mqtt.parser()

  parser.on('error', onError)
  parser.on('packet', onPacket)
  randomPacket = crypto.randomBytes(Math.floor(Math.random() * 512))

  // Increase probability to have a valid first byte in order to at least
  // enter the parser
  if (Math.random() > 0.2 && randomPacket.length > 0) randomPacket.writeUInt8(firstBytes[Math.floor(Math.random() * firstBytes.length)], 0)
  parser.parse(randomPacket)
}

try {
  console.log('Starting benchmark')
  for (let i = 0; i < max; i++) {
    doParse()
  }
} catch (e) {
  console.log('Exception occurred at packet')
  console.log(randomPacket)
  console.log(e.message)
  console.log(e.stack)
}

function onError () {
  errors++
}

function onPacket () {
  packets++
}

const delta = Math.abs(max - packets - errors)
const time = Date.now() / 1000 - start
console.log('Benchmark complete')
console.log('==========================')
console.log('Sent packets:', max)
console.log('Total time:', Math.round(time * 100) / 100, 'seconds', '\r\n')

console.log('Valid packets:', packets)
console.log('Erroneous packets:', errors)

if ((max - packets - errors) < 0) console.log('Excess packets:', delta, '\r\n')
else console.log('Missing packets:', delta, '\r\n')

console.log('Total packets:', packets + errors)
console.log('Total errors:', errors + delta)
console.log('Error rate:', `${((errors + delta) / max * 100).toFixed(2)}%`)
console.log('==========================')
