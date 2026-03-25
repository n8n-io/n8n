const path = require('path')
const childProcess = require('child_process')

const { logger } = require('./../../shared/logger')

class Ops {
  constructor () {
    this.opsLib = null

    // check npm lib
    try {
      this.opsLib = this._opsNpm()
      logger.successv(`🛡️ ops: ${this.opsLib.status}`)
    } catch (e) {
      // check binary cli
      try {
        this.opsLib = this._opsCli()
        logger.successv(`🛡️ ops: ${this.opsLib.status}`)
      } catch (_e2) {
        // noop
      }
      // noop
    }
  }

  observe (payload) {
    if (this.opsLib && this.opsLib.status !== 'off') {
      const encoded = this.encode(payload)
      this.opsLib.observe(encoded)
    }
  }

  keypair (publicKey) {
    if (this._status() === 'off') {
      return null
    }

    const args = ['keypair']
    if (publicKey) {
      args.push(publicKey)
    }

    const options = { stdio: ['pipe', 'pipe', 'ignore'] }
    const fallbackBin = path.resolve(process.cwd(), 'node_modules/.bin/dotenvx-ops')

    try {
      const output = childProcess.execFileSync(fallbackBin, args, options)
      const parsed = JSON.parse(output.toString())
      if (parsed && parsed.private_key) {
        return parsed.private_key
      }
    } catch (e) {
      // noop
    }

    try {
      const output = childProcess.execFileSync('dotenvx-ops', args, options)
      const parsed = JSON.parse(output.toString())
      if (parsed && parsed.private_key) {
        return parsed.private_key
      }
    } catch (e) {
      // noop
    }

    return null
  }

  _status () {
    const fallbackBin = path.resolve(process.cwd(), 'node_modules/.bin/dotenvx-ops')
    const options = { stdio: ['pipe', 'pipe', 'ignore'] }

    try {
      const status = childProcess.execFileSync(fallbackBin, ['status'], options)
      return status.toString().trim()
    } catch (e) {
      // noop
    }

    try {
      const status = childProcess.execFileSync('dotenvx-ops', ['status'], options)
      return status.toString().trim()
    } catch (e) {
      // noop
    }

    return null
  }

  encode (payload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  _opsNpm () {
    const fallbackBin = path.resolve(process.cwd(), 'node_modules/.bin/dotenvx-ops')
    const status = childProcess.execSync(`${fallbackBin} status`, { stdio: ['pipe', 'pipe', 'ignore'] })

    return {
      status: status.toString().trim(),
      observe: (encoded) => {
        try {
          const subprocess = childProcess.spawn(fallbackBin, ['observe', encoded], {
            stdio: 'ignore',
            detached: true
          })

          subprocess.unref() // let it run independently
        } catch (e) {
          // noop
        }
      }
    }
  }

  _opsCli () {
    const status = childProcess.execSync('dotenvx-ops status', { stdio: ['pipe', 'pipe', 'ignore'] })

    return {
      status: status.toString().trim(),
      observe: (encoded) => {
        try {
          const subprocess = childProcess.spawn('dotenvx-ops', ['observe', encoded], {
            stdio: 'ignore',
            detached: true
          })

          subprocess.unref() // let it run independently
        } catch (e) {
          // noop
        }
      }
    }
  }
}

module.exports = Ops
