const { join, sep } = require('path')

const getOptions = require('./common/get-options.js')
const mkdir = require('./mkdir/index.js')
const mkdtemp = require('./mkdtemp.js')
const rm = require('./rm/index.js')

// create a temp directory, ensure its permissions match its parent, then call
// the supplied function passing it the path to the directory. clean up after
// the function finishes, whether it throws or not
const withTempDir = async (root, fn, opts) => {
  const options = getOptions(opts, {
    copy: ['tmpPrefix'],
  })
  // create the directory, and fix its ownership
  await mkdir(root, { recursive: true, owner: 'inherit' })

  const target = await mkdtemp(join(`${root}${sep}`, options.tmpPrefix || ''), { owner: 'inherit' })
  let err
  let result

  try {
    result = await fn(target)
  } catch (_err) {
    err = _err
  }

  try {
    await rm(target, { force: true, recursive: true })
  } catch (err) {}

  if (err) {
    throw err
  }

  return result
}

module.exports = withTempDir
