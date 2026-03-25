const { execSync } = require('child_process')
const chomp = require('./chomp')
const Errors = require('./errors')

function evalKeyValue (key, value, processEnv, runningParsed) {
  // Match everything between the outermost $() using a regex with non-capturing groups
  const matches = value.match(/\$\(([^)]+(?:\)[^(]*)*)\)/g) || []
  return matches.reduce((newValue, match) => {
    const command = match.slice(2, -1) // Extract command by removing $() wrapper
    let result

    try {
      result = execSync(command, { env: { ...processEnv, ...runningParsed } }).toString() // execute command (including runningParsed)
    } catch (e) {
      throw new Errors({ key, command, message: e.message.trim() }).commandSubstitutionFailed()
    }

    result = chomp(result) // chomp it
    return newValue.replace(match, result) // Replace match with result
  }, value)
}

module.exports = evalKeyValue
