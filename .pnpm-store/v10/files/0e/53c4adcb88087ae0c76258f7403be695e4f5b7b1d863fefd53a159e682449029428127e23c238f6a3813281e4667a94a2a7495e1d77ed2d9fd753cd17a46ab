/*
The MIT License (MIT)

Copyright (c) 2014-2022 Matteo Collina

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

const leven = require('./leven')

function commist (opts) {
  opts = opts || {}
  const commands = []
  const maxDistance = opts.maxDistance || Infinity

  function lookup (array) {
    if (typeof array === 'string') { array = array.split(' ') }

    let res = commands.map(function (cmd) {
      return cmd.match(array)
    })

    res = res.filter(function (match) {
      if (match.partsNotMatched !== 0) {
        return false
      }
      return match.distances.reduce(function (acc, curr) {
        return acc && curr <= maxDistance
      }, true)
    })

    res = res.sort(function (a, b) {
      if (a.inputNotMatched > b.inputNotMatched) { return 1 }

      if (a.inputNotMatched === b.inputNotMatched && a.totalDistance > b.totalDistance) { return 1 }

      return -1
    })

    res = res.map(function (match) {
      return match.cmd
    })

    return res
  }

  function parse (args) {
    const matching = lookup(args)

    if (matching.length > 0) {
      matching[0].call(args)

      // return null to indicate there is nothing left to do
      return null
    }

    return args
  }

  async function parseAsync (args) {
    const matching = lookup(args)

    if (matching.length > 0) {
      await matching[0].call(args)
      // return null to indicate there is nothing left to do
      return null
    }

    return args
  }

  function register (inputCommand, func) {
    let commandOptions = {
      command: inputCommand,
      strict: false,
      func
    }

    if (typeof inputCommand === 'object') {
      commandOptions = Object.assign(commandOptions, inputCommand)
    }

    const matching = lookup(commandOptions.command)

    matching.forEach(function (match) {
      if (match.string === commandOptions.command) { throw new Error('command already registered: ' + commandOptions.command) }
    })

    commands.push(new Command(commandOptions))

    return this
  }

  return {
    register,
    parse,
    parseAsync,
    lookup
  }
}

function Command (options) {
  this.string = options.command
  this.strict = options.strict
  this.parts = this.string.split(' ')
  this.length = this.parts.length
  this.func = options.func
}

Command.prototype.call = function call (argv) {
  return this.func(argv.slice(this.length))
}

Command.prototype.match = function match (string) {
  return new CommandMatch(this, string)
}

function CommandMatch (cmd, array) {
  this.cmd = cmd
  this.distances = cmd.parts.map(function (elem, i) {
    if (array[i] !== undefined) {
      if (cmd.strict) {
        return elem === array[i] ? 0 : undefined
      } else {
        return leven(elem, array[i])
      }
    } else { return undefined }
  }).filter(function (distance, i) {
    return distance !== undefined && distance < cmd.parts[i].length
  })

  this.partsNotMatched = cmd.length - this.distances.length
  this.inputNotMatched = array.length - this.distances.length
  this.totalDistance = this.distances.reduce(function (acc, i) { return acc + i }, 0)
}

module.exports = commist
