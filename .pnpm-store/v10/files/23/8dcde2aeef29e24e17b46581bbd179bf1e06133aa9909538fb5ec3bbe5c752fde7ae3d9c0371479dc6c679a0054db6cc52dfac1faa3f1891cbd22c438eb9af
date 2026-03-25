const mqtt = require('../')
const max = 100000
let i
const buf = Buffer.from('test')

// initialize it
mqtt.generate({
  cmd: 'publish',
  topic: 'test',
  payload: buf
})

const start = Date.now()

for (i = 0; i < max; i++) {
  mqtt.generate({
    cmd: 'publish',
    topic: 'test',
    payload: buf
  })
}

const time = Date.now() - start
console.log('Total time', time)
console.log('Total packets', max)
console.log('Packet/s', max / time * 1000)
