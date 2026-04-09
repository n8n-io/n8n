const fsx = require('./fsx')
const Errors = require('./errors')

const RESERVED_ENV_FILES = ['.env.project', '.env.keys', '.env.me', '.env.x', '.env.example']

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
      throw new Errors({ directory }).missingDirectory()
    } else {
      throw e
    }
  }
}

module.exports = findEnvFiles
