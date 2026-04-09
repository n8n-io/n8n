const path = require('path')
const preserveShebang = require('./../preserveShebang')
const prependPublicKey = require('./../prependPublicKey')

function mutateSrc ({ envSrc, envFilepath, keysFilepath, publicKeyName, publicKeyValue }) {
  const filename = path.basename(envFilepath)
  const filepath = path.resolve(envFilepath)
  let resolvedKeysFilepath = path.join(path.dirname(filepath), '.env.keys')
  if (keysFilepath) {
    resolvedKeysFilepath = path.resolve(keysFilepath)
  }
  const relativeFilepath = path.relative(path.dirname(filepath), resolvedKeysFilepath)

  const ps = preserveShebang(envSrc)
  const prependedPublicKey = prependPublicKey(publicKeyName, publicKeyValue, filename, relativeFilepath)

  envSrc = `${ps.firstLinePreserved}${prependedPublicKey}\n${ps.envSrc}`

  return {
    envSrc
  }
}

module.exports = mutateSrc
