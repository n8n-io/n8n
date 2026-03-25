var tape = require('tape')
var through = require('through2')
var concat = require('concat-stream')
var stream = require('readable-stream')
var net = require('net')
var duplexify = require('./')

var HELLO_WORLD = (Buffer.from && Buffer.from !== Uint8Array.from)
 ? Buffer.from('hello world')
 : new Buffer('hello world')

tape('passthrough', function(t) {
  t.plan(2)

  var pt = through()
  var dup = duplexify(pt, pt)

  dup.end('hello world')
  dup.on('finish', function() {
    t.ok(true, 'should finish')
  })
  dup.pipe(concat(function(data) {
    t.same(data.toString(), 'hello world', 'same in as out')
  }))
})

tape('passthrough + double end', function(t) {
  t.plan(2)

  var pt = through()
  var dup = duplexify(pt, pt)

  dup.end('hello world')
  dup.end()

  dup.on('finish', function() {
    t.ok(true, 'should finish')
  })
  dup.pipe(concat(function(data) {
    t.same(data.toString(), 'hello world', 'same in as out')
  }))
})

tape('async passthrough + end', function(t) {
  t.plan(2)

  var pt = through.obj({highWaterMark:1}, function(data, enc, cb) {
    setTimeout(function() {
      cb(null, data)
    }, 100)
  })

  var dup = duplexify(pt, pt)

  dup.write('hello ')
  dup.write('world')
  dup.end()

  dup.on('finish', function() {
    t.ok(true, 'should finish')
  })
  dup.pipe(concat(function(data) {
    t.same(data.toString(), 'hello world', 'same in as out')
  }))
})

tape('duplex', function(t) {
  var readExpected = ['read-a', 'read-b', 'read-c']
  var writeExpected = ['write-a', 'write-b', 'write-c']

  t.plan(readExpected.length+writeExpected.length+2)

  var readable = through.obj()
  var writable = through.obj(function(data, enc, cb) {
    t.same(data, writeExpected.shift(), 'onwrite should match')
    cb()
  })

  var dup = duplexify.obj(writable, readable)

  readExpected.slice().forEach(function(data) {
    readable.write(data)
  })
  readable.end()

  writeExpected.slice().forEach(function(data) {
    dup.write(data)
  })
  dup.end()

  dup.on('data', function(data) {
    t.same(data, readExpected.shift(), 'ondata should match')
  })
  dup.on('end', function() {
    t.ok(true, 'should end')
  })
  dup.on('finish', function() {
    t.ok(true, 'should finish')
  })
})

tape('async', function(t) {
  var dup = duplexify()
  var pt = through()

  dup.pipe(concat(function(data) {
    t.same(data.toString(), 'i was async', 'same in as out')
    t.end()
  }))

  dup.write('i')
  dup.write(' was ')
  dup.end('async')

  setTimeout(function() {
    dup.setWritable(pt)
    setTimeout(function() {
      dup.setReadable(pt)
    }, 50)
  }, 50)
})

tape('destroy', function(t) {
  t.plan(2)

  var write = through()
  var read = through()
  var dup = duplexify(write, read)

  write.destroy = function() {
    t.ok(true, 'write destroyed')
  }

  dup.on('close', function() {
    t.ok(true, 'close emitted')
  })

  dup.destroy()
  dup.destroy() // should only work once
  dup.end()
})

tape('destroy both', function(t) {
  t.plan(3)

  var write = through()
  var read = through()
  var dup = duplexify(write, read)

  write.destroy = function() {
    t.ok(true, 'write destroyed')
  }

  read.destroy = function() {
    t.ok(true, 'read destroyed')
  }

  dup.on('close', function() {
    t.ok(true, 'close emitted')
  })

  dup.destroy()
  dup.destroy() // should only work once
})

tape('bubble read errors', function(t) {
  t.plan(2)

  var write = through()
  var read = through()
  var dup = duplexify(write, read)

  dup.on('error', function(err) {
    t.same(err.message, 'read-error', 'received read error')
  })
  dup.on('close', function() {
    t.ok(true, 'close emitted')
  })

  read.emit('error', new Error('read-error'))
  write.emit('error', new Error('write-error')) // only emit first error
})

tape('bubble write errors', function(t) {
  t.plan(2)

  var write = through()
  var read = through()
  var dup = duplexify(write, read)

  dup.on('error', function(err) {
    t.same(err.message, 'write-error', 'received write error')
  })
  dup.on('close', function() {
    t.ok(true, 'close emitted')
  })

  write.emit('error', new Error('write-error'))
  read.emit('error', new Error('read-error')) // only emit first error
})

tape('bubble errors from write()', function(t) {
  t.plan(3)

  var errored = false
  var dup = duplexify(new stream.Writable({
    write: function(chunk, enc, next) {
      next(new Error('write-error'))
    }
  }))

  dup.on('error', function(err) {
    errored = true
    t.same(err.message, 'write-error', 'received write error')
  })
  dup.on('close', function() {
    t.pass('close emitted')
    t.ok(errored, 'error was emitted before close')
  })
  dup.end('123')
})

tape('destroy while waiting for drain', function(t) {
  t.plan(3)

  var errored = false
  var dup = duplexify(new stream.Writable({
    highWaterMark: 0,
    write: function() {}
  }))

  dup.on('error', function(err) {
    errored = true
    t.same(err.message, 'destroy-error', 'received destroy error')
  })
  dup.on('close', function() {
    t.pass('close emitted')
    t.ok(errored, 'error was emitted before close')
  })
  dup.write('123')
  dup.destroy(new Error('destroy-error'))
})

tape('reset writable / readable', function(t) {
  t.plan(3)

  var toUpperCase = function(data, enc, cb) {
    cb(null, data.toString().toUpperCase())
  }

  var passthrough = through()
  var upper = through(toUpperCase)
  var dup = duplexify(passthrough, passthrough)

  dup.once('data', function(data) {
    t.same(data.toString(), 'hello')
    dup.setWritable(upper)
    dup.setReadable(upper)
    dup.once('data', function(data) {
      t.same(data.toString(), 'HELLO')
      dup.once('data', function(data) {
        t.same(data.toString(), 'HI')
        t.end()
      })
    })
    dup.write('hello')
    dup.write('hi')
  })
  dup.write('hello')
})

tape('cork', function(t) {
  var passthrough = through()
  var dup = duplexify(passthrough, passthrough)
  var ok = false

  dup.on('prefinish', function() {
    dup.cork()
    setTimeout(function() {
      ok = true
      dup.uncork()
    }, 100)
  })
  dup.on('finish', function() {
    t.ok(ok)
    t.end()
  })
  dup.end()
})

tape('prefinish not twice', function(t) {
  var passthrough = through()
  var dup = duplexify(passthrough, passthrough)
  var prefinished = false

  dup.on('prefinish', function() {
    t.ok(!prefinished, 'only prefinish once')
    prefinished = true
  })

  dup.on('finish', function() {
    t.end()
  })

  dup.end()
})

tape('close', function(t) {
  var passthrough = through()
  var dup = duplexify(passthrough, passthrough)

  passthrough.emit('close')
  dup.on('close', function() {
    t.ok(true, 'should forward close')
    t.end()
  })
})

tape('works with node native streams (net)', function(t) {
  t.plan(1)

  var server = net.createServer(function(socket) {
    var dup = duplexify(socket, socket)

    dup.once('data', function(chunk) {
      t.same(chunk, HELLO_WORLD)
      server.close()
      socket.end()
      t.end()
    })
  })

  server.listen(0, function () {
    var socket = net.connect(server.address().port)
    var dup = duplexify(socket, socket)

    dup.write(HELLO_WORLD)
  })
})
