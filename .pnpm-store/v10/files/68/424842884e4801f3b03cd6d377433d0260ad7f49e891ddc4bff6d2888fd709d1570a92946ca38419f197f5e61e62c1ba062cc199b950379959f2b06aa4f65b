var test = require('tape')
var fs = require('fs')
var os = require('os')
var mockdata = require('./mockdata')

var currentData

os.platform = function () {
  return currentData.platform
}

fs.stat = function (file, callback) {
  process.nextTick(function () {
    if (!currentData.file[file]) { return callback(new Error()) }
    callback(null, { isFile: function () { return true } })
  })
}

fs.readFile = function (file, enc, callback) {
  process.nextTick(function () {
    if (!currentData.file[file]) { return callback(new Error()) }
    callback(null, currentData.file[file])
  })
}

mockdata.forEach(function (data) {
  test('test ' + data.desc, function (t) {
    // reload each time to avoid internal caching
    delete require.cache[require.resolve('../')]
    var getos = require('../')

    currentData = data

    getos(function (err, os) {
      t.error(err, 'no error')
      t.deepEqual(os, data.expected, 'correct os data')
      t.end()
    })
  })
})
