const path = require('path')
const isWindows = require('./is-windows')

module.exports = commandConvert

/**
 * Converts an environment variable usage to be appropriate for the current OS
 * @param {String} command Command to convert
 * @param {Object} env Map of the current environment variable names and their values
 * @param {boolean} normalize If the command should be normalized using `path`
 * after converting
 * @returns {String} Converted command
 */
function commandConvert(command, env, normalize = false) {
  if (!isWindows()) {
    return command
  }
  const envUnixRegex = /\$(\w+)|\${(\w+)}/g // $my_var or ${my_var}
  const convertedCmd = command.replace(envUnixRegex, (match, $1, $2) => {
    const varName = $1 || $2
    // In Windows, non-existent variables are not replaced by the shell,
    // so for example "echo %FOO%" will literally print the string "%FOO%", as
    // opposed to printing an empty string in UNIX. See kentcdodds/cross-env#145
    // If the env variable isn't defined at runtime, just strip it from the command entirely
    return env[varName] ? `%${varName}%` : ''
  })
  // Normalization is required for commands with relative paths
  // For example, `./cmd.bat`. See kentcdodds/cross-env#127
  // However, it should not be done for command arguments.
  // See https://github.com/kentcdodds/cross-env/pull/130#issuecomment-319887970
  return normalize === true ? path.normalize(convertedCmd) : convertedCmd
}
