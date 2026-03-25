const fs = require('./fs.js')
const getOptions = require('./common/get-options.js')
const owner = require('./common/owner.js')

const writeFile = async (file, data, opts) => {
  const options = getOptions(opts, {
    copy: ['encoding', 'mode', 'flag', 'signal', 'owner'],
    wrap: 'encoding',
  })
  const { uid, gid } = await owner.validate(file, options.owner)

  const result = await fs.writeFile(file, data, options)

  await owner.update(file, uid, gid)

  return result
}

module.exports = writeFile
