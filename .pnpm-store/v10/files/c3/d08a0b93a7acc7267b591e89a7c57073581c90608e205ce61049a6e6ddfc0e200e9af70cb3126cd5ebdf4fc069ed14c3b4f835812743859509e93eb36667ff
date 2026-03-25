'use strict'

const clone = require('lodash.clonedeep')

const subArgAlias = {
  warmup: {
    c: 'connections',
    d: 'duration'
  }
}

// Expects args to have already been processed by subarg
function generateSubargAliases (args) {
  const aliasedArgs = clone(args)

  function isParentAliasInArgs (argKey) {
    return aliasedArgs[argKey]
  }

  function isSubargAnAlias (parentAlias, subArg) {
    return parentAlias[subArg]
  }

  function mapAliasForSubarg (parentAlias, parentKey) {
    const parentArgs = aliasedArgs[parentKey]
    for (const subArg in parentArgs) {
      if (isSubargAnAlias(parentAlias, subArg)) {
        parentArgs[parentAlias[subArg]] = parentArgs[subArg]
      }
    }
  }

  for (const parentKey in subArgAlias) {
    const parentAlias = subArgAlias[parentKey]
    if (isParentAliasInArgs(parentKey)) {
      mapAliasForSubarg(parentAlias, parentKey)
    }
  }

  return aliasedArgs
}

module.exports = generateSubargAliases
