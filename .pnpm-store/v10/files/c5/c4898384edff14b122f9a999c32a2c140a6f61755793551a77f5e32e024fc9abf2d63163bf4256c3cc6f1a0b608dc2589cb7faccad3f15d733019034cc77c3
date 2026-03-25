'use strict'

function rebuild (gyp, argv, callback) {
  gyp.todo.push(
    { name: 'clean', args: [] }
    , { name: 'configure', args: argv }
    , { name: 'build', args: [] }
  )
  process.nextTick(callback)
}

module.exports = rebuild
module.exports.usage = 'Runs "clean", "configure" and "build" all at once'
