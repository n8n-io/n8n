const fsx = require('./fsx')
const path = require('path')

const HOOK_SCRIPT = `#!/bin/sh

if command -v dotenvx 2>&1 >/dev/null
then
  dotenvx ext precommit
elif npx dotenvx -V >/dev/null 2>&1
then
  npx dotenvx ext precommit
else
  echo "[dotenvx][precommit] 'dotenvx' command not found"
  echo "[dotenvx][precommit] ? install it with [curl -fsS https://dotenvx.sh | sh]"
  echo "[dotenvx][precommit] ? other install options [https://dotenvx.com/docs/install]"
  exit 1
fi
`

class InstallPrecommitHook {
  constructor () {
    this.hookPath = path.join('.git', 'hooks', 'pre-commit')
  }

  run () {
    let successMessage

    try {
      // Check if the pre-commit file already exists
      if (this._exists()) {
        // Check if 'dotenvx precommit' already exists in the file
        if (this._currentHook().includes('dotenvx ext precommit')) {
          // do nothing
          successMessage = `dotenvx ext precommit exists [${this.hookPath}]`
        } else {
          this._appendHook()
          successMessage = `dotenvx ext precommit appended [${this.hookPath}]`
        }
      } else {
        this._createHook()
        successMessage = `dotenvx ext precommit installed [${this.hookPath}]`
      }

      return {
        successMessage
      }
    } catch (err) {
      const error = new Error(`failed to modify pre-commit hook: ${err.message}`)
      throw error
    }
  }

  _exists () {
    return fsx.existsSync(this.hookPath)
  }

  _currentHook () {
    return fsx.readFileX(this.hookPath)
  }

  _createHook () {
    // If the pre-commit file doesn't exist, create a new one with the hookScript
    fsx.writeFileX(this.hookPath, HOOK_SCRIPT)
    fsx.chmodSync(this.hookPath, '755') // Make the file executable
  }

  _appendHook () {
    // Append 'dotenvx precommit' to the existing file
    fsx.appendFileSync(this.hookPath, '\n' + HOOK_SCRIPT)
  }
}

module.exports = InstallPrecommitHook
