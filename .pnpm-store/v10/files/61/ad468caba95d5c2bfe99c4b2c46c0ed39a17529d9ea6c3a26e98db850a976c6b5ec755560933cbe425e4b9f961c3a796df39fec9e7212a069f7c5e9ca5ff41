const apiKeys = require('../protocol/requests/apiKeys')
const Connection = require('./connection')

module.exports = class ConnectionPool {
  /**
   * @param {ConstructorParameters<typeof Connection>[0]} options
   */
  constructor(options) {
    this.logger = options.logger.namespace('ConnectionPool')
    this.connectionTimeout = options.connectionTimeout
    this.host = options.host
    this.port = options.port
    this.rack = options.rack
    this.ssl = options.ssl
    this.sasl = options.sasl
    this.clientId = options.clientId
    this.socketFactory = options.socketFactory

    this.pool = new Array(2).fill().map(() => new Connection(options))
  }

  isConnected() {
    return this.pool.some(c => c.isConnected())
  }

  isAuthenticated() {
    return this.pool.some(c => c.isAuthenticated())
  }

  setSupportAuthenticationProtocol(isSupported) {
    this.map(c => c.setSupportAuthenticationProtocol(isSupported))
  }

  setVersions(versions) {
    this.map(c => c.setVersions(versions))
  }

  map(callback) {
    return this.pool.map(c => callback(c))
  }

  async send(protocolRequest) {
    const connection = await this.getConnectionByRequest(protocolRequest)
    return connection.send(protocolRequest)
  }

  getConnectionByRequest({ request: { apiKey } }) {
    const index = { [apiKeys.Fetch]: 1 }[apiKey] || 0
    return this.getConnection(index)
  }

  async getConnection(index = 0) {
    const connection = this.pool[index]

    if (!connection.isConnected()) {
      await connection.connect()
    }

    return connection
  }

  async destroy() {
    await Promise.all(this.map(c => c.disconnect()))
  }
}
