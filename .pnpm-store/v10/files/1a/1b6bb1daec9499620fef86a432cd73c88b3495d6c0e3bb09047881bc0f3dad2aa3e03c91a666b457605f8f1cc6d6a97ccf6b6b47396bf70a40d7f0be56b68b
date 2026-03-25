const mqtt = require('../')
const max = 1000000
let i = 0
const start = Date.now()
let time
const buf = Buffer.allocUnsafe(10)
const net = require('net')
const server = net.createServer(handle)
let dest

function handle (sock) {
  sock.resume()
}

buf.fill('test')

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
  let res = true
  // var toSend = new Buffer(5)

  for (; i < max && res; i++) {
    res = mqtt.writeToStream({
      cmd: 'publish',
      topic: 'test',
      payload: buf
    }, dest)
    // dest.write(toSend, 'buffer')
    // res = dest.write(buf, 'buffer')
  }

  if (i >= max) {
    dest.end()
  }
}
