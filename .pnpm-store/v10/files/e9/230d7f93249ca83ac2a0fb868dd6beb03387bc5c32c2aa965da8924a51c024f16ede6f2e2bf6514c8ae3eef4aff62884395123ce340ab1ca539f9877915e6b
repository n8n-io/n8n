function prependPublicKey (publicKeyName, publicKey, filename, relativeFilepath = '.env.keys') {
  const comment = relativeFilepath === '.env.keys'
    ? ''
    : ` # -fk ${relativeFilepath}`

  return [
    '#/-------------------[DOTENV_PUBLIC_KEY]--------------------/',
    '#/            public-key encryption for .env files          /',
    '#/       [how it works](https://dotenvx.com/encryption)     /',
    '#/----------------------------------------------------------/',
    `${publicKeyName}="${publicKey}"${comment}`,
    '',
    `# ${filename}`
  ].join('\n')
}

module.exports = prependPublicKey
