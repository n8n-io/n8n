const truncate = require('./truncate')

const ISSUE_BY_CODE = {
  COMMAND_EXITED_WITH_CODE: 'https://github.com/dotenvx/dotenvx/issues/new',
  COMMAND_SUBSTITUTION_FAILED: 'https://github.com/dotenvx/dotenvx/issues/532',
  DECRYPTION_FAILED: 'https://github.com/dotenvx/dotenvx/issues/757',
  DANGEROUS_DEPENDENCY_HOIST: 'https://github.com/dotenvx/dotenvx/issues/622',
  INVALID_COLOR: 'must be 256 colors',
  INVALID_CONVENTION: 'https://github.com/dotenvx/dotenvx/issues/761',
  INVALID_PRIVATE_KEY: 'https://github.com/dotenvx/dotenvx/issues/465',
  INVALID_PUBLIC_KEY: 'https://github.com/dotenvx/dotenvx/issues/756',
  MALFORMED_ENCRYPTED_DATA: 'https://github.com/dotenvx/dotenvx/issues/467',
  MISPAIRED_PRIVATE_KEY: 'https://github.com/dotenvx/dotenvx/issues/752',
  MISSING_DIRECTORY: 'https://github.com/dotenvx/dotenvx/issues/758',
  MISSING_ENV_FILE: 'https://github.com/dotenvx/dotenvx/issues/484',
  MISSING_ENV_FILES: 'https://github.com/dotenvx/dotenvx/issues/760',
  MISSING_KEY: 'https://github.com/dotenvx/dotenvx/issues/759',
  MISSING_LOG_LEVEL: 'must be valid log level',
  MISSING_PRIVATE_KEY: 'https://github.com/dotenvx/dotenvx/issues/464',
  PRECOMMIT_HOOK_MODIFY_FAILED: 'try again or report error',
  WRONG_PRIVATE_KEY: 'https://github.com/dotenvx/dotenvx/issues/466'
}

class Errors {
  constructor (options = {}) {
    this.filepath = options.filepath
    this.envFilepath = options.envFilepath

    this.key = options.key
    this.privateKey = options.privateKey
    this.privateKeyName = options.privateKeyName
    this.publicKeyName = options.publicKeyName
    this.publicKey = options.publicKey
    this.publicKeyExisting = options.publicKeyExisting
    this.command = options.command

    this.message = options.message
    this.code = options.code
    this.help = options.help
    this.debug = options.debug

    this.convention = options.convention
    this.directory = options.directory
    this.exitCode = options.exitCode
    this.level = options.level
    this.color = options.color
    this.error = options.error
  }

  custom () {
    const e = new Error(this.message)
    if (this.code) e.code = this.code
    if (this.help) e.help = this.help
    if (this.code && !e.help) e.help = `fix: [${ISSUE_BY_CODE[this.code]}]`
    e.messageWithHelp = `${e.message}. ${e.help}`
    if (this.debug) e.debug = this.debug
    return e
  }

  commandExitedWithCode () {
    const code = 'COMMAND_EXITED_WITH_CODE'
    const message = `[${code}] Command exited with exit code ${this.exitCode}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  commandSubstitutionFailed () {
    const code = 'COMMAND_SUBSTITUTION_FAILED'
    const message = `[${code}] could not eval ${this.key} containing command '${this.command}': ${this.message}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  decryptionFailed () {
    const code = 'DECRYPTION_FAILED'
    const message = `[${code}] ${this.message}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  dangerousDependencyHoist () {
    const code = 'DANGEROUS_DEPENDENCY_HOIST'
    const message = `[${code}] your environment has hoisted an incompatible version of a dotenvx dependency: ${this.message}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  invalidColor () {
    const code = 'INVALID_COLOR'
    const message = `[${code}] Invalid color ${this.color}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  invalidConvention () {
    const code = 'INVALID_CONVENTION'
    const message = `[${code}] invalid convention (${this.convention})`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  invalidPrivateKey () {
    const code = 'INVALID_PRIVATE_KEY'
    const message = `[${code}] could not decrypt ${this.key} using private key '${this.privateKeyName}=${truncate(this.privateKey)}'`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  invalidPublicKey () {
    const code = 'INVALID_PUBLIC_KEY'
    const message = `[${code}] could not encrypt using public key '${this.publicKeyName}=${truncate(this.publicKey)}'`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  malformedEncryptedData () {
    const code = 'MALFORMED_ENCRYPTED_DATA'
    const message = `[${code}] could not decrypt ${this.key} because encrypted data appears malformed`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  mispairedPrivateKey () {
    const code = 'MISPAIRED_PRIVATE_KEY'
    const message = `[${code}] private key's derived public key (${truncate(this.publicKey)}) does not match the existing public key (${truncate(this.publicKeyExisting)})`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingDirectory () {
    const code = 'MISSING_DIRECTORY'
    const message = `[${code}] missing directory (${this.directory})`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingEnvFile () {
    const code = 'MISSING_ENV_FILE'
    const envFilepath = this.envFilepath || '.env'
    const message = `[${code}] missing file (${envFilepath})`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingEnvFiles () {
    const code = 'MISSING_ENV_FILES'
    const message = `[${code}] no .env* files found`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingKey () {
    const code = 'MISSING_KEY'
    const message = `[${code}] missing key (${this.key})`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingLogLevel () {
    const code = 'MISSING_LOG_LEVEL'
    const message = `[${code}] missing log level '${this.level}'. implement in logger`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  missingPrivateKey () {
    const code = 'MISSING_PRIVATE_KEY'
    const message = `[${code}] could not decrypt ${this.key} using private key '${this.privateKeyName}=${truncate(this.privateKey)}'`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  precommitHookModifyFailed () {
    const code = 'PRECOMMIT_HOOK_MODIFY_FAILED'
    const message = `[${code}] failed to modify pre-commit hook: ${this.error.message}`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }

  wrongPrivateKey () {
    const code = 'WRONG_PRIVATE_KEY'
    const message = `[${code}] could not decrypt ${this.key} using private key '${this.privateKeyName}=${truncate(this.privateKey)}'`
    const help = `fix: [${ISSUE_BY_CODE[code]}]`

    const e = new Error(message)
    e.code = code
    e.help = help
    e.messageWithHelp = `${message}. ${help}`
    return e
  }
}

Errors.ISSUE_BY_CODE = ISSUE_BY_CODE

module.exports = Errors
