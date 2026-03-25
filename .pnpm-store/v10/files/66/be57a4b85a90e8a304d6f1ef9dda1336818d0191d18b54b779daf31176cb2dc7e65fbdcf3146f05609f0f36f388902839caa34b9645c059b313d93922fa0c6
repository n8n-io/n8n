const ocsp = require('../ocsp')

const http = require('http')
const httpServer = http.Server
const crypto = require('crypto')

const async = require('async')
const rfc2560 = require('asn1.js-rfc2560')
const rfc5280 = require('asn1.js-rfc5280')

function handler (req, res) {
  if (req.method !== 'POST') {
    return res.writeHead(400)
  }

  if (req.headers['content-type'] !== 'application/ocsp-request') {
    return res.writeHead(400)
  }

  const chunks = []
  req.on('readable', function () {
    const chunk = req.read()
    if (chunk) { chunks.push(chunk) }
  })

  function errRes (status) {
    return rfc2560.OCSPResponse.encode({
      responseStatus: status
    }, 'der')
  }

  function done (out) {
    res.writeHead(200, {
      'Content-Type': 'application/ocsp-response',
      'Content-Length': out.length
    })
    res.end(out)
  }

  req.on('end', () => {
    const body = Buffer.concat(chunks)
    let ocspReq
    try {
      ocspReq = rfc2560.OCSPRequest.decode(body, 'der')
    } catch (e) {
      return done(errRes('malformed_request'))
    }

    this.getResponses(ocspReq, (err, responses) => {
      // Assume not found
      if (err) {
        res.writeHead(404)
        res.end()
        return
      }

      return done(responses)
    })
  })
}

class Server extends httpServer {
  constructor (options) {
    super(handler)

    this.options = Object.assign({ nextUpdate: 24 * 3600 * 1e3 }, options)

    this.key = this.options.key
    this.certroot = rfc5280.Certificate.decode(
      ocsp.utils.toDER(options.cert, 'CERTIFICATE'),
      'der')
    this.cert = this.certroot.tbsCertificate

    const issuerName = rfc5280.Name.encode(this.cert.subject, 'der')
    const issuerKey = this.cert.subjectPublicKeyInfo.subjectPublicKey.data

    this.certID = {}
    Object.keys(ocsp.utils.digestRev).forEach(function (digest) {
      this.certID[digest] = {
        issuerNameHash: crypto.createHash(digest).update(issuerName).digest(),
        issuerKeyHash: crypto.createHash(digest).update(issuerKey).digest()
      }
    }, this)

    this.certs = {}
  }

  static create (options) {
    return new Server(options)
  }

  addCert (serial, status, info) {
    this.certs[serial.toString(16)] = {
      type: status,
      value: info
    }
  }

  getResponses (req, cb) {
    const reqList = req.tbsRequest.requestList

    // TODO(indutny): support signed requests
    async.map(reqList, (req, cb) => {
      this.getResponse(req, cb)
    }, (err, responses) => {
      if (err) { return cb(err) }

      // TODO(indutny): send extensions
      const basic = {
        tbsResponseData: {
          version: 'v1',
          responderID: {
            type: 'byKey',
            value: this.certID.sha1.issuerKeyHash
          },
          producedAt: new Date(),
          responses
        },

        signatureAlgorithm: {
          algorithm: ocsp.utils.signRev.sha512WithRSAEncryption
        },
        signature: null,

        certs: [
          this.certroot
        ]
      }

      const sign = crypto.createSign('sha512WithRSAEncryption')
      sign.update(rfc2560.ResponseData.encode(basic.tbsResponseData, 'der'))
      basic.signature = {
        unused: 0,
        data: sign.sign(this.key)
      }

      const res = {
        responseStatus: 'successful',
        responseBytes: {
          responseType: 'id-pkix-ocsp-basic',
          response: rfc2560.BasicOCSPResponse.encode(basic, 'der')
        }
      }

      cb(null, rfc2560.OCSPResponse.encode(res, 'der'))
    })
  }

  getResponse (req, cb) {
    const certID = req.reqCert

    const digestId = certID.hashAlgorithm.algorithm.join('.')
    const digest = ocsp.utils.digest[digestId]
    if (!digest) { return cb(new Error('Unknown digest: ' + digestId)) }

    const expectedID = this.certID[digest]
    if (!expectedID) { return cb(new Error('No pre-generated CertID for digest: ' + digest)) }

    if (expectedID.issuerNameHash.toString('hex') !==
      certID.issuerNameHash.toString('hex')) {
      return cb(new Error('Issuer name mismatch'))
    }

    if (expectedID.issuerKeyHash.toString('hex') !==
      certID.issuerKeyHash.toString('hex')) {
      return cb(new Error('Issuer key mismatch'))
    }

    const serial = certID.serialNumber.toString(16)
    const cert = this.certs[serial]

    const response = {
      certId: certID,
      certStatus: null,
      thisUpdate: new Date(),
      nextUpdate: new Date(+new Date() + this.options.nextUpdate)
    }
    if (cert) {
      response.certStatus = cert
    } else {
      response.certStatus = {
        type: 'unknown',
        value: null
      }
    }

    cb(null, response)
  }
}

module.exports = Server
