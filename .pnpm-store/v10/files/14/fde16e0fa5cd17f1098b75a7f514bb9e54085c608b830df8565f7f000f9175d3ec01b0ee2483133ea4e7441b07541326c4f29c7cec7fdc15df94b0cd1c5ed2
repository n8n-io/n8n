const ocsp = require('../ocsp')

const http = require('http')
const https = require('https')
const httpsAgent = https.Agent
const rfc5280 = require('asn1.js-rfc5280')
const SimpleCache = require('simple-lru-cache')

class Agent extends httpsAgent {
  constructor (options) {
    options = Object.assign({ CACacheSize: 1024 }, options)
    super(options)

    this.caCache = new SimpleCache({ maxSize: options.CACacheSize })
  }

  createConnection (options, connectListener) {
    options.requestOCSP = true
    const socket = super.createConnection(options, connectListener)

    let stapling = null
    socket.on('OCSPResponse', function (data) { stapling = data })

    socket.on('secure', () => {
      return this.handleOCSPResponse(socket, stapling, function (err) {
        if (err) {
          return socket.destroy(err)
        }

        // Time to allow all writes!
        socket.uncork()
      })
    })

    // Do not let any writes come through until we will verify OCSP
    socket.cork()

    return socket
  }

  handleOCSPResponse (socket, stapling, cb) {
    if (!socket.authorized) {
      return cb(new Error(socket.authorizationError))
    }

    let cert
    let issuer

    try {
      cert = (socket.ssl || socket).getPeerCertificate(true)
      issuer = cert && cert.issuerCertificate
      cert = cert && cert.raw
      cert = rfc5280.Certificate.decode(cert, 'der')

      if (issuer) {
        issuer = issuer.raw
        issuer = rfc5280.Certificate.decode(issuer, 'der')
      }
    } catch (e) {
      return cb(e)
    }

    function onIssuer (err, x509) {
      if (err) {
        return cb(err)
      }

      issuer = x509

      if (stapling) {
        const req = ocsp.request.generate(cert, issuer)
        ocsp.verify({
          request: req,
          response: stapling
        }, cb)
      } else {
        return ocsp.check({ cert, issuer }, cb)
      }
    }

    if (issuer) {
      return onIssuer(null, issuer)
    } else {
      return this.fetchIssuer(cert, stapling, onIssuer)
    }
  }

  fetchIssuer (cert, stapling, cb) {
    const issuers = ocsp.utils['id-ad-caIssuers'].join('.')

    // TODO(indutny): use info from stapling response
    ocsp.utils.getAuthorityInfo(cert, issuers, (err, uri) => {
      if (err) { return cb(err) }

      const ca = this.caCache.get(uri)
      if (ca) { return cb(null, ca) }

      let once = false
      function done (err, data) {
        if (once) { return }

        once = true
        cb(err, data)
      }

      function onResponse (res) {
        if (res.statusCode < 200 || res.statusCode >= 400) {
          return done(new Error('Failed to fetch CA: ' + res.statusCode))
        }

        const chunks = []
        res.on('readable', function () {
          const chunk = res.read()
          if (!chunk) { return }
          chunks.push(chunk)
        })

        res.on('end', function () {
          let cert = Buffer.concat(chunks)

          try {
            cert = rfc5280.Certificate.decode(cert, 'der')
          } catch (e) {
            return done(e)
          }

          this.caCache.set(uri, cert)
          done(null, cert)
        })
      }

      try {
        http.get(uri)
          .on('error', done)
          .on('response', onResponse.bind(this))
      } catch (e) {
        return done(e)
      }
    })
  }
}

module.exports = Agent
