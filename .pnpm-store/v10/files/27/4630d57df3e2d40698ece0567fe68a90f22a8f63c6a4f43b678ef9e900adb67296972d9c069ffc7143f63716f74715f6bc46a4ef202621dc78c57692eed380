const fs = require('fs')
const path = require('path')

function getCommanderVersion () {
  const commanderMain = require.resolve('commander')
  const pkgPath = path.join(commanderMain, '..', 'package.json')
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
}

module.exports = getCommanderVersion
