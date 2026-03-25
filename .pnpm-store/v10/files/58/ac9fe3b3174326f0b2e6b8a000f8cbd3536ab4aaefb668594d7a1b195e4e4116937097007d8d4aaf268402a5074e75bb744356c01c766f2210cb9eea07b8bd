var hooks = require('async_hooks')
var events = require('events')
var cluster = require('cluster')

module.exports = onListening

function onListening (onlistening) {
  var e = new events.EventEmitter()

  var hook = hooks.createHook({
    init (asyncId, type, triggerAsyncId, resource) {
      if (type === 'PIPESERVERWRAP' || type === 'TCPSERVERWRAP') {
        process.nextTick(function () {
          resource.owner.once('listening', function () {
            var addr = resource.owner.address()
            if (addr) e.emit('listening', addr)
          })
        })
      }
    }
  })

  hook.enable()
  cluster.on('listening', oncluster)
  e.destroy = destroy

  if (onlistening) e.on('listening', onlistening)

  return e

  function destroy () {
    hook.disable()
    cluster.removeListener('listening', oncluster)
  }

  function oncluster (_, addr) {
    e.emit('listening', addr)
  }
}
