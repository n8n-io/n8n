'use strict'

const msnodesql = require('msnodesqlv8')
const debug = require('debug')('mssql:msv8')
const BaseConnectionPool = require('../base/connection-pool')
const { IDS, INCREMENT } = require('../utils')
const shared = require('../shared')
const ConnectionError = require('../error/connection-error')
const { platform } = require('node:os')
const { buildConnectionString } = require('@tediousjs/connection-string')

const CONNECTION_DRIVER = ['darwin', 'linux'].includes(platform()) ? 'ODBC Driver 17 for SQL Server' : 'SQL Server Native Client 11.0'

class ConnectionPool extends BaseConnectionPool {
  _poolCreate () {
    return new shared.Promise((resolve, reject) => {
      this.config.requestTimeout = this.config.requestTimeout ?? this.config.timeout ?? 15000

      const cfg = {
        conn_str: this.config.connectionString,
        conn_timeout: (this.config.connectionTimeout ?? this.config.timeout ?? 15000) / 1000
      }

      if (!this.config.connectionString) {
        cfg.conn_str = buildConnectionString({
          Driver: CONNECTION_DRIVER,
          Server: this.config.options.instanceName ? `${this.config.server}\\${this.config.options.instanceName}` : `${this.config.server},${this.config.port}`,
          Database: this.config.database,
          Uid: this.config.user,
          Pwd: this.config.password,
          Trusted_Connection: !!this.config.options.trustedConnection,
          Encrypt: !!this.config.options.encrypt
        })
      }

      const connedtionId = INCREMENT.Connection++
      debug('pool(%d): connection #%d created', IDS.get(this), connedtionId)
      debug('connection(%d): establishing', connedtionId)

      if (typeof this.config.beforeConnect === 'function') {
        this.config.beforeConnect(cfg)
      }

      msnodesql.open(cfg, (err, tds) => {
        if (err) {
          err = new ConnectionError(err)
          return reject(err)
        }

        IDS.add(tds, 'Connection', connedtionId)
        tds.setUseUTC(this.config.options.useUTC)
        debug('connection(%d): established', IDS.get(tds))
        resolve(tds)
      })
    })
  }

  _poolValidate (tds) {
    if (tds && !tds.hasError) {
      return !this.config.validateConnection || new shared.Promise((resolve) => {
        tds.query('SELECT 1;', (err) => {
          resolve(!err)
        })
      })
    }
    return false
  }

  _poolDestroy (tds) {
    return new shared.Promise((resolve, reject) => {
      if (!tds) {
        resolve()
        return
      }
      debug('connection(%d): destroying', IDS.get(tds))
      tds.close(() => {
        debug('connection(%d): destroyed', IDS.get(tds))
        resolve()
      })
    })
  }
}

module.exports = ConnectionPool
