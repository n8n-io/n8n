const mqtt = require('../')
const max = 1000000
let i = 0
const start = Date.now()
let time
const buf = Buffer.allocUnsafe(10)
const net = require('net')
const server = net.createServer(handle)
let dest

buf.fill('test')

function handle (sock) {
  sock.resume()
}

server.listen(0, () => {
  dest = net.connect(server.address())

  dest.on('connect', tickWait)
  dest.on('drain', tickWait)
  dest.on('finish', () => {
    time = Date.now() - start
    console.log('Total time', time)
    console.log('Total packets', max)
    console.log('Packet/s', max / time * 1000)
    server.close()
  })
})

function tickWait () {
  // console.log('tickWait', i)
  let res = true
  // var toSend = new Buffer(5 + buf.length)

  for (; i < max && res; i++) {
    res = dest.write(mqtt.generate({
      cmd: 'publish',
      topic: 'test',
      payload: buf
    }))
    // buf.copy(toSend, 5)
    // res = dest.write(toSend, 'buffer')
    // console.log(res)
  }

  if (i >= max) {
    dest.end()
  }
}
