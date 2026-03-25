'use strict'

const tds = require('tedious')
const debug = require('debug')('mssql:tedi')
const BaseConnectionPool = require('../base/connection-pool')
const { IDS } = require('../utils')
const shared = require('../shared')
const ConnectionError = require('../error/connection-error')

class ConnectionPool extends BaseConnectionPool {
  _config () {
    const cfg = {
      server: this.config.server,
      options: Object.assign({
        encrypt: typeof this.config.encrypt === 'boolean' ? this.config.encrypt : true,
        trustServerCertificate: typeof this.config.trustServerCertificate === 'boolean' ? this.config.trustServerCertificate : false
      }, this.config.options),
      authentication: Object.assign({
        type: this.config.domain !== undefined ? 'ntlm' : this.config.authentication_type !== undefined ? this.config.authentication_type : 'default',
        options: Object.entries({
          userName: this.config.user,
          password: this.config.password,
          domain: this.config.domain,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          tenantId: this.config.tenantId,
          token: this.config.token,
          msiEndpoint: this.config.msiEndpoint,
          msiSecret: this.config.msiSecret
        }).reduce((acc, [key, val]) => {
          if (typeof val !== 'undefined') {
            return { ...acc, [key]: val }
          }
          return acc
        }, {})
      }, this.config.authentication)
    }

    cfg.options.database = cfg.options.database || this.config.database
    cfg.options.port = cfg.options.port || this.config.port
    cfg.options.connectTimeout = cfg.options.connectTimeout ?? this.config.connectionTimeout ?? this.config.timeout ?? 15000
    cfg.options.requestTimeout = cfg.options.requestTimeout ?? this.config.requestTimeout ?? this.config.timeout ?? 15000
    cfg.options.tdsVersion = cfg.options.tdsVersion || '7_4'
    cfg.options.rowCollectionOnDone = cfg.options.rowCollectionOnDone || false
    cfg.options.rowCollectionOnRequestCompletion = cfg.options.rowCollectionOnRequestCompletion || false
    cfg.options.useColumnNames = cfg.options.useColumnNames || false
    cfg.options.appName = cfg.options.appName || 'node-mssql'

    // tedious always connect via tcp when port is specified
    if (cfg.options.instanceName) delete cfg.options.port

    if (isNaN(cfg.options.requestTimeout)) cfg.options.requestTimeout = 15000
    if (cfg.options.requestTimeout === Infinity || cfg.options.requestTimeout < 0) cfg.options.requestTimeout = 0

    if (!cfg.options.debug && this.config.debug) {
      cfg.options.debug = {
        packet: true,
        token: true,
        data: true,
        payload: true
      }
    }
    return cfg
  }

  _poolCreate () {
    return new shared.Promise((resolve, reject) => {
      const resolveOnce = (v) => {
        resolve(v)
        resolve = reject = () => {}
      }
      const rejectOnce = (e) => {
        reject(e)
        resolve = reject = () => {}
      }
      let tedious
      try {
        tedious = new tds.Connection(this._config())
      } catch (err) {
        rejectOnce(err)
        return
      }
      tedious.connect(err => {
        if (err) {
          err = new ConnectionError(err)
          return rejectOnce(err)
        }

        debug('connection(%d): established', IDS.get(tedious))
        this.collation = tedious.databaseCollation
        resolveOnce(tedious)
      })
      IDS.add(tedious, 'Connection')
      debug('pool(%d): connection #%d created', IDS.get(this), IDS.get(tedious))
      debug('connection(%d): establishing', IDS.get(tedious))

      tedious.on('end', () => {
        const err = new ConnectionError('The connection ended without ever completing the connection')
        rejectOnce(err)
      })
      tedious.on('error', err => {
        if (err.code === 'ESOCKET') {
          tedious.hasError = true
        } else {
          this.emit('error', err)
        }
        rejectOnce(err)
      })

      if (this.config.debug) {
        tedious.on('debug', this.emit.bind(this, 'debug', tedious))
      }
      if (typeof this.config.beforeConnect === 'function') {
        this.config.beforeConnect(tedious)
      }
    })
  }

  _poolValidate (tedious) {
    if (tedious && !tedious.closed && !tedious.hasError) {
      return !this.config.validateConnection || new shared.Promise((resolve) => {
        const req = new tds.Request('SELECT 1;', (err) => {
          resolve(!err)
        })
        tedious.execSql(req)
      })
    }
    return false
  }

  _poolDestroy (tedious) {
    return new shared.Promise((resolve, reject) => {
      if (!tedious) {
        resolve()
        return
      }
      debug('connection(%d): destroying', IDS.get(tedious))

      if (tedious.closed) {
        debug('connection(%d): already closed', IDS.get(tedious))
        resolve()
      } else {
        tedious.once('end', () => {
          debug('connection(%d): destroyed', IDS.get(tedious))
          resolve()
        })

        tedious.close()
      }
    })
  }
}

module.exports = ConnectionPool
