'use strict'

const { EventEmitter } = require('node:events')
const debug = require('debug')('mssql:base')
const { parseSqlConnectionString } = require('@tediousjs/connection-string')
const tarn = require('tarn')
const { IDS } = require('../utils')
const ConnectionError = require('../error/connection-error')
const shared = require('../shared')
const clone = require('rfdc/default')
const { MSSQLError } = require('../error')

/**
 * Class ConnectionPool.
 *
 * Internally, each `Connection` instance is a separate pool of TDS connections. Once you create a new `Request`/`Transaction`/`Prepared Statement`, a new TDS connection is acquired from the pool and reserved for desired action. Once the action is complete, connection is released back to the pool.
 *
 * @property {Boolean} connected If true, connection is established.
 * @property {Boolean} connecting If true, connection is being established.
 *
 * @fires ConnectionPool#connect
 * @fires ConnectionPool#close
 */

class ConnectionPool extends EventEmitter {
  /**
   * Create new Connection.
   *
   * @param {Object|String} config Connection configuration object or connection string.
   * @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred.
   */

  constructor (config, callback) {
    super()

    IDS.add(this, 'ConnectionPool')
    debug('pool(%d): created', IDS.get(this))

    this._connectStack = []
    this._closeStack = []

    this._connected = false
    this._connecting = false
    this._healthy = false

    if (typeof config === 'string') {
      try {
        this.config = this.constructor.parseConnectionString(config)
      } catch (ex) {
        if (typeof callback === 'function') {
          return setImmediate(callback, ex)
        }
        throw ex
      }
    } else {
      this.config = clone(config)
    }

    // set defaults
    this.config.port = this.config.port || 1433
    this.config.options = this.config.options || {}
    this.config.stream = this.config.stream || false
    this.config.parseJSON = this.config.parseJSON || false
    this.config.arrayRowMode = this.config.arrayRowMode || false
    this.config.validateConnection = 'validateConnection' in this.config ? this.config.validateConnection : true

    const namedServer = /^(.*)\\(.*)$/.exec(this.config.server)
    if (namedServer) {
      this.config.server = namedServer[1]
      this.config.options.instanceName = namedServer[2]
    }

    if (typeof this.config.options.useColumnNames !== 'undefined' && this.config.options.useColumnNames !== true) {
      const ex = new MSSQLError('Invalid options `useColumnNames`, use `arrayRowMode` instead')
      if (typeof callback === 'function') {
        return setImmediate(callback, ex)
      }
      throw ex
    }

    if (typeof callback === 'function') {
      this.connect(callback)
    }
  }

  get connected () {
    return this._connected
  }

  get connecting () {
    return this._connecting
  }

  get healthy () {
    return this._healthy
  }

  static parseConnectionString (connectionString) {
    return this._parseConnectionString(connectionString)
  }

  static _parseAuthenticationType (type, entries) {
    switch (type.toLowerCase()) {
      case 'active directory integrated':
        if (entries.includes('token')) {
          return 'azure-active-directory-access-token'
        } else if (['client id', 'client secret', 'tenant id'].every(entry => entries.includes(entry))) {
          return 'azure-active-directory-service-principal-secret'
        } else if (['client id', 'msi endpoint', 'msi secret'].every(entry => entries.includes(entry))) {
          return 'azure-active-directory-msi-app-service'
        } else if (['client id', 'msi endpoint'].every(entry => entries.includes(entry))) {
          return 'azure-active-directory-msi-vm'
        }
        return 'azure-active-directory-default'
      case 'active directory password':
        return 'azure-active-directory-password'
      case 'ntlm':
        return 'ntlm'
      default:
        return 'default'
    }
  }

  static _parseConnectionString (connectionString) {
    const parsed = parseSqlConnectionString(connectionString, true, true)
    return Object.entries(parsed).reduce((config, [key, value]) => {
      switch (key) {
        case 'application name':
          break
        case 'applicationintent':
          Object.assign(config.options, {
            readOnlyIntent: value === 'readonly'
          })
          break
        case 'asynchronous processing':
          break
        case 'attachdbfilename':
          break
        case 'authentication':
          Object.assign(config, {
            authentication_type: this._parseAuthenticationType(value, Object.keys(parsed))
          })
          break
        case 'column encryption setting':
          break
        case 'connection timeout':
          Object.assign(config, {
            connectionTimeout: value * 1000
          })
          break
        case 'connection lifetime':
          break
        case 'connectretrycount':
          break
        case 'connectretryinterval':
          Object.assign(config.options, {
            connectionRetryInterval: value * 1000
          })
          break
        case 'context connection':
          break
        case 'client id':
          Object.assign(config, {
            clientId: value
          })
          break
        case 'client secret':
          Object.assign(config, {
            clientSecret: value
          })
          break
        case 'current language':
          Object.assign(config.options, {
            language: value
          })
          break
        case 'data source':
        {
          let server = value
          let instanceName
          let port = 1433
          if (/^np:/i.test(server)) {
            throw new Error('Connection via Named Pipes is not supported.')
          }
          if (/^tcp:/i.test(server)) {
            server = server.substr(4)
          }
          const namedServerParts = /^(.*)\\(.*)$/.exec(server)
          if (namedServerParts) {
            server = namedServerParts[1].trim()
            instanceName = namedServerParts[2].trim()
          }
          const serverParts = /^(.*),(.*)$/.exec(server)
          if (serverParts) {
            server = serverParts[1].trim()
            port = parseInt(serverParts[2].trim(), 10)
          } else {
            const instanceParts = /^(.*),(.*)$/.exec(instanceName)
            if (instanceParts) {
              instanceName = instanceParts[1].trim()
              port = parseInt(instanceParts[2].trim(), 10)
            }
          }
          if (server === '.' || server === '(.)' || server.toLowerCase() === '(localdb)' || server.toLowerCase() === '(local)') {
            server = 'localhost'
          }
          Object.assign(config, {
            port,
            server
          })
          if (instanceName) {
            Object.assign(config.options, {
              instanceName
            })
          }
          break
        }
        case 'encrypt':
          Object.assign(config.options, {
            encrypt: !!value
          })
          break
        case 'enlist':
          break
        case 'failover partner':
          break
        case 'initial catalog':
          Object.assign(config, {
            database: value
          })
          break
        case 'integrated security':
          break
        case 'max pool size':
          Object.assign(config.pool, {
            max: value
          })
          break
        case 'min pool size':
          Object.assign(config.pool, {
            min: value
          })
          break
        case 'msi endpoint':
          Object.assign(config, {
            msiEndpoint: value
          })
          break
        case 'msi secret':
          Object.assign(config, {
            msiSecret: value
          })
          break
        case 'multipleactiveresultsets':
          break
        case 'multisubnetfailover':
          Object.assign(config.options, {
            multiSubnetFailover: value
          })
          break
        case 'network library':
          break
        case 'packet size':
          Object.assign(config.options, {
            packetSize: value
          })
          break
        case 'password':
          Object.assign(config, {
            password: value
          })
          break
        case 'persist security info':
          break
        case 'poolblockingperiod':
          break
        case 'pooling':
          break
        case 'replication':
          break
        case 'tenant id':
          Object.assign(config, {
            tenantId: value
          })
          break
        case 'token':
          Object.assign(config, {
            token: value
          })
          break
        case 'transaction binding':
          Object.assign(config.options, {
            enableImplicitTransactions: value.toLowerCase() === 'implicit unbind'
          })
          break
        case 'transparentnetworkipresolution':
          break
        case 'trustservercertificate':
          Object.assign(config.options, {
            trustServerCertificate: value
          })
          break
        case 'type system version':
          break
        case 'user id': {
          let user = value
          let domain
          const domainUser = /^(.*)\\(.*)$/.exec(user)
          if (domainUser) {
            domain = domainUser[1]
            user = domainUser[2]
          }
          if (domain) {
            Object.assign(config, {
              domain
            })
          }
          if (user) {
            Object.assign(config, {
              user
            })
          }
          break
        }
        case 'user instance':
          break
        case 'workstation id':
          Object.assign(config.options, {
            workstationId: value
          })
          break
        case 'request timeout':
          Object.assign(config, {
            requestTimeout: parseInt(value, 10)
          })
          break
        case 'stream':
          Object.assign(config, {
            stream: !!value
          })
          break
        case 'useutc':
          Object.assign(config.options, {
            useUTC: !!value
          })
          break
        case 'parsejson':
          Object.assign(config, {
            parseJSON: !!value
          })
          break
      }
      return config
    }, { options: {}, pool: {} })
  }

  /**
   * Acquire connection from this connection pool.
   *
   * @param {ConnectionPool|Transaction|PreparedStatement} requester Requester.
   * @param {acquireCallback} [callback] A callback which is called after connection has been acquired, or an error has occurred. If omited, method returns Promise.
   * @return {ConnectionPool|Promise}
   */

  acquire (requester, callback) {
    const acquirePromise = shared.Promise.resolve(this._acquire()).catch(err => {
      this.emit('error', err)
      throw err
    })
    if (typeof callback === 'function') {
      acquirePromise.then(connection => callback(null, connection, this.config)).catch(callback)
      return this
    }

    return acquirePromise
  }

  _acquire () {
    if (!this.pool) {
      return shared.Promise.reject(new ConnectionError('Connection not yet open.', 'ENOTOPEN'))
    } else if (this.pool.destroyed) {
      return shared.Promise.reject(new ConnectionError('Connection is closing', 'ENOTOPEN'))
    }

    return this.pool.acquire().promise
  }

  /**
   * Release connection back to the pool.
   *
   * @param {Connection} connection Previously acquired connection.
   * @return {ConnectionPool}
   */

  release (connection) {
    debug('connection(%d): released', IDS.get(connection))

    if (this.pool) {
      this.pool.release(connection)
    }
    return this
  }

  /**
   * Creates a new connection pool with one active connection. This one initial connection serves as a probe to find out whether the configuration is valid.
   *
   * @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
   * @return {ConnectionPool|Promise}
   */

  connect (callback) {
    if (typeof callback === 'function') {
      this._connect(callback)
      return this
    }

    return new shared.Promise((resolve, reject) => {
      return this._connect(err => {
        if (err) return reject(err)
        resolve(this)
      })
    })
  }

  /**
   * @private
   * @param {basicCallback} callback
   */

  _connect (callback) {
    if (this._connected) {
      debug('pool(%d): already connected, executing connect callback immediately', IDS.get(this))
      return setImmediate(callback, null, this)
    }

    this._connectStack.push(callback)

    if (this._connecting) {
      return
    }

    this._connecting = true
    debug('pool(%d): connecting', IDS.get(this))

    // create one test connection to check if everything is ok
    this._poolCreate().then((connection) => {
      debug('pool(%d): connected', IDS.get(this))
      this._healthy = true

      return this._poolDestroy(connection).then(() => {
        // prepare pool
        this.pool = new tarn.Pool(
          Object.assign({
            create: () => this._poolCreate()
              .then(connection => {
                this._healthy = true
                return connection
              })
              .catch(err => {
                if (this.pool.numUsed() + this.pool.numFree() <= 0) {
                  this._healthy = false
                }
                throw err
              }),
            validate: this._poolValidate.bind(this),
            destroy: this._poolDestroy.bind(this),
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            propagateCreateError: true
          }, this.config.pool)
        )

        this._connecting = false
        this._connected = true
      })
    }).then(() => {
      this._connectStack.forEach((cb) => {
        setImmediate(cb, null, this)
      })
    }).catch(err => {
      this._connecting = false
      this._connectStack.forEach((cb) => {
        setImmediate(cb, err)
      })
    }).then(() => {
      this._connectStack = []
    })
  }

  get size () {
    return this.pool.numFree() + this.pool.numUsed() + this.pool.numPendingCreates()
  }

  get available () {
    return this.pool.numFree()
  }

  get pending () {
    return this.pool.numPendingAcquires()
  }

  get borrowed () {
    return this.pool.numUsed()
  }

  /**
   * Close all active connections in the pool.
   *
   * @param {basicCallback} [callback] A callback which is called after connection has closed, or an error has occurred. If omited, method returns Promise.
   * @return {ConnectionPool|Promise}
   */

  close (callback) {
    if (typeof callback === 'function') {
      this._close(callback)
      return this
    }

    return new shared.Promise((resolve, reject) => {
      this._close(err => {
        if (err) return reject(err)
        resolve(this)
      })
    })
  }

  /**
   * @private
   * @param {basicCallback} callback
   */

  _close (callback) {
    // we don't allow pools in a connecting state to be closed because it means there are far too many
    // edge cases to deal with
    if (this._connecting) {
      debug('pool(%d): close called while connecting', IDS.get(this))
      setImmediate(callback, new ConnectionError('Cannot close a pool while it is connecting'))
    }

    if (!this.pool) {
      debug('pool(%d): already closed, executing close callback immediately', IDS.get(this))
      return setImmediate(callback, null)
    }

    this._closeStack.push(callback)

    if (this.pool.destroyed) return

    this._connecting = this._connected = this._healthy = false

    this.pool.destroy().then(() => {
      debug('pool(%d): pool closed, removing pool reference and executing close callbacks', IDS.get(this))
      this.pool = null
      this._closeStack.forEach(cb => {
        setImmediate(cb, null)
      })
    }).catch(err => {
      this.pool = null
      this._closeStack.forEach(cb => {
        setImmediate(cb, err)
      })
    }).then(() => {
      this._closeStack = []
    })
  }

  /**
   * Returns new request using this connection.
   *
   * @return {Request}
   */

  request () {
    return new shared.driver.Request(this)
  }

  /**
   * Returns new transaction using this connection.
   *
   * @return {Transaction}
   */

  transaction () {
    return new shared.driver.Transaction(this)
  }

  /**
   * Creates a new query using this connection from a tagged template string.
   *
   * @variation 1
   * @param {Array} strings Array of string literals.
   * @param {...*} keys Values.
   * @return {Request}
   */

  /**
   * Execute the SQL command.
   *
   * @variation 2
   * @param {String} command T-SQL command to be executed.
   * @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
   * @return {Request|Promise}
   */

  query () {
    if (typeof arguments[0] === 'string') { return new shared.driver.Request(this).query(arguments[0], arguments[1]) }

    const values = Array.prototype.slice.call(arguments)
    const strings = values.shift()

    return new shared.driver.Request(this)._template(strings, values, 'query')
  }

  /**
   * Creates a new batch using this connection from a tagged template string.
   *
   * @variation 1
   * @param {Array} strings Array of string literals.
   * @param {...*} keys Values.
   * @return {Request}
   */

  /**
   * Execute the SQL command.
   *
   * @variation 2
   * @param {String} command T-SQL command to be executed.
   * @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
   * @return {Request|Promise}
   */

  batch () {
    if (typeof arguments[0] === 'string') { return new shared.driver.Request(this).batch(arguments[0], arguments[1]) }

    const values = Array.prototype.slice.call(arguments)
    const strings = values.shift()

    return new shared.driver.Request(this)._template(strings, values, 'batch')
  }
}

module.exports = ConnectionPool
