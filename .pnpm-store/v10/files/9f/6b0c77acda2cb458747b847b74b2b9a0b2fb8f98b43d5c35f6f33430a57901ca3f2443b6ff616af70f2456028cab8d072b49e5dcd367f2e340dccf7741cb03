var tape = require('tape')
var net = require('net')
var http = require('http')
var onlistening = require('./')

tape('detects net.listen', function (t) {
  var expected = null

  onlistening(function (addr) {
    server.close()
    this.destroy()
    t.same(expected, addr)
    t.end()
  })

  var server = net.createServer()

  server.listen(0, function () {
    expected = server.address()
  })
})

tape('detects net.listen more than once', function (t) {
  var expected = null
  var server = null
  var missing = 5

  onlistening(function (addr) {
    server.close()
    t.same(expected, addr)
    if (missing > 0) return loop()
    this.destroy()
    t.end()
  })

  loop()

  function loop () {
    missing--
    server = net.createServer()
    server.listen(0, function () {
      expected = server.address()
    })
  }
})

tape('http listen', function (t) {
  var expected = null

  onlistening(function (addr) {
    server.close()
    this.destroy()
    t.same(expected, addr)
    t.end()
  })

  var server = http.createServer()

  server.listen(0, function () {
    expected = server.address()
  })
})
