const fs = require('../fs.js')
const getOptions = require('../common/get-options.js')
const node = require('../common/node.js')
const owner = require('../common/owner.js')

const polyfill = require('./polyfill.js')

// node 10.12.0 added the options parameter, which allows recursive and mode
// properties to be passed
const useNative = node.satisfies('>=10.12.0')

// extends mkdir with the ability to specify an owner of the new dir
const mkdir = async (path, opts) => {
  const options = getOptions(opts, {
    copy: ['mode', 'recursive', 'owner'],
    wrap: 'mode',
  })
  const { uid, gid } = await owner.validate(path, options.owner)

  // the polyfill is tested separately from this module, no need to hack
  // process.version to try to trigger it just for coverage
  // istanbul ignore next
  const result = useNative
    ? await fs.mkdir(path, options)
    : await polyfill(path, options)

  await owner.update(path, uid, gid)

  return result
}

module.exports = mkdir
