const fsx = require('./fsx')

const RESERVED_ENV_FILES = ['.env.vault', '.env.project', '.env.keys', '.env.me', '.env.x', '.env.example']

function findEnvFiles (directory) {
  try {
    const files = fsx.readdirSync(directory)
    const envFiles = files.filter(file =>
      file.startsWith('.env') &&
      !file.endsWith('.previous') &&
      !RESERVED_ENV_FILES.includes(file)
    )

    return envFiles
  } catch (e) {
    if (e.code === 'ENOENT') {
      const error = new Error(`missing directory (${directory})`)
      error.code = 'MISSING_DIRECTORY'

      throw error
    } else {
      throw e
    }
  }
}

module.exports = findEnvFiles
