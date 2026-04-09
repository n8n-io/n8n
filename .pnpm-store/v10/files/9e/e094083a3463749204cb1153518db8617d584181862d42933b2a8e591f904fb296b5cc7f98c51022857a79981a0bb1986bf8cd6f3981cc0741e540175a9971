const path = require('path')
const childProcess = require('child_process')

// const { logger } = require('./../../shared/logger')

class Ops {
  constructor () {
    this.opsLib = null

    if (this._isForcedOff()) {
      return
    }

    // check npm lib
    try { this.opsLib = this._opsNpm() } catch (_e) {}

    // check binary cli
    if (!this.opsLib) {
      try { this.opsLib = this._opsCli() } catch (_e) {}
    }

    if (this.opsLib) {
      // logger.successv(`⛨ ops: ${this.opsLib.status()}`)
    }
  }

  status () {
    if (this._isForcedOff() || !this.opsLib) {
      return 'off'
    }

    return this.opsLib.status()
  }

  keypair (publicKey) {
    if (this._isForcedOff() || !this.opsLib) {
      return {}
    }

    return this.opsLib.keypair(publicKey)
  }

  observe (payload) {
    if (!this._isForcedOff() && this.opsLib && this.opsLib.status() !== 'off') {
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
      this.opsLib.observe(encoded)
    }
  }

  //
  // private
  //
  _opsNpm () {
    const npmBin = path.resolve(process.cwd(), 'node_modules/.bin/dotenvx-ops')
    return this._opsLib(npmBin)
  }

  _opsCli () {
    return this._opsLib('dotenvx-ops')
  }

  _opsLib (binary) {
    childProcess.execFileSync(binary, ['--version'], { stdio: ['pipe', 'pipe', 'ignore'] })

    return {
      status: () => {
        return childProcess.execFileSync(binary, ['status'], { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
      },
      keypair: (publicKey) => {
        const args = ['keypair']
        if (publicKey) {
          args.push(publicKey)
        }
        const output = childProcess.execFileSync(binary, args, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
        const parsed = JSON.parse(output.toString())
        return parsed
      },
      observe: (encoded) => {
        try {
          const subprocess = childProcess.spawn(binary, ['observe', encoded], {
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

  _isForcedOff () {
    return process.env.DOTENVX_OPS_OFF === 'true'
  }
}

module.exports = Ops
