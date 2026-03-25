const fs = require('./fs.js')
const getOptions = require('./common/get-options.js')
const owner = require('./common/owner.js')

const copyFile = async (src, dest, opts) => {
  const options = getOptions(opts, {
    copy: ['mode', 'owner'],
    wrap: 'mode',
  })

  const { uid, gid } = await owner.validate(dest, options.owner)

  // the node core method as of 16.5.0 does not support the mode being in an
  // object, so we have to pass the mode value directly
  const result = await fs.copyFile(src, dest, options.mode)

  await owner.update(dest, uid, gid)

  return result
}

module.exports = copyFile
