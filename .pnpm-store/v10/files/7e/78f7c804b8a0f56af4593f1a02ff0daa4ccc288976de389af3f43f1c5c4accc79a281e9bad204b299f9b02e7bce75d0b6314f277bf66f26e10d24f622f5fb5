/**
 * Get a socket stream compatible with the current runtime environment.
 * @returns {Duplex}
 */
module.exports.getStream = function getStream(ssl) {
  const net = require('net')
  if (typeof net.Socket === 'function') {
    return new net.Socket()
  } else {
    const { CloudflareSocket } = require('pg-cloudflare')
    return new CloudflareSocket(ssl)
  }
}

/**
 * Get a TLS secured socket, compatible with the current environment,
 * using the socket and other settings given in `options`.
 * @returns {Duplex}
 */
module.exports.getSecureStream = function getSecureStream(options) {
  var tls = require('tls')
  if (tls.connect) {
    return tls.connect(options)
  } else {
    options.socket.startTls(options)
    return options.socket
  }
}
