var readline = require('readline')
var Promise = require('any-promise')
var objectAssign = require('object-assign')
var Interface = readline.Interface

function wrapCompleter (completer) {
  if (completer.length === 2) return completer

  return function (line, cb) {
    var result = completer(line)

    if (typeof result.then !== 'function') {
      return cb(null, result)
    }

    result.catch(cb).then(function (result) {
      process.nextTick(function () { cb(null, result) })
    })
  }
}

function InterfaceAsPromised (input, output, completer, terminal) {
  if (arguments.length === 1) {
    var options = input

    if (typeof options.completer === 'function') {
      options = objectAssign({}, options, {
        completer: wrapCompleter(options.completer)
      })
    }

    Interface.call(this, options)
  } else {
    if (typeof completer === 'function') {
      completer = wrapCompleter(completer)
    }

    Interface.call(this, input, output, completer, terminal)
  }
}

InterfaceAsPromised.prototype = Object.create(Interface.prototype)

InterfaceAsPromised.prototype.question = function (question, callback) {
  if (typeof callback === 'function') {
    return Interface.prototype.question.call(this, question, callback)
  }

  var self = this
  return new Promise(function (resolve) {
    Interface.prototype.question.call(self, question, resolve)
  })
}

objectAssign(exports, readline, {
  Interface: InterfaceAsPromised,
  createInterface: function (input, output, completer, terminal) {
    if (arguments.length === 1) {
      return new InterfaceAsPromised(input)
    }

    return new InterfaceAsPromised(input, output, completer, terminal)
  }
})
