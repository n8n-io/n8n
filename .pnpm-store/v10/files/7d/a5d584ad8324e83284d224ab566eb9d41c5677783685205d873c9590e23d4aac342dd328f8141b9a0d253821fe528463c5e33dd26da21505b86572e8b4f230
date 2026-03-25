const ocsp = require('../ocsp')
const rfc5280 = require('asn1.js-rfc5280')
const crypto = require('crypto')

// TODO(indutny): verify issuer, etc...
function findResponder (issuer, certs, raws) {
  let issuerKey = issuer.tbsCertificate.subjectPublicKeyInfo
  issuerKey = ocsp.utils.toPEM(
    rfc5280.SubjectPublicKeyInfo.encode(issuerKey, 'der'), 'PUBLIC KEY')

  if (certs.length) {
    const cert = certs[0]
    const signAlg = ocsp.utils.sign[cert.signatureAlgorithm.algorithm.join('.')]
    if (!signAlg) {
      throw new Error('Unknown signature algorithm ' + cert.signatureAlgorithm.algorithm)
    }

    const verify = crypto.createVerify(signAlg)

    verify.update(raws[0])
    if (!verify.verify(issuerKey, cert.signature.data)) {
      throw new Error('Invalid signature')
    }

    let certKey = cert.tbsCertificate.subjectPublicKeyInfo
    certKey = ocsp.utils.toPEM(rfc5280.SubjectPublicKeyInfo.encode(certKey, 'der'), 'PUBLIC KEY')

    return certKey
  }

  return issuerKey
}

module.exports = function verify (options, cb) {
  function done (err, res) {
    process.nextTick(() => { cb(err, res) })
  }

  try {
    const req = options.request

    const issuer = req.issuer || rfc5280.Certificate.decode(ocsp.utils.toDER(options.issuer, 'CERTIFICATE'), 'der')
    let res = ocsp.utils.parseResponse(options.response)

    const rawTBS = options.response.slice(res.start, res.end)
    const certs = res.certs
    const raws = res.certsTbs.map((tbs) => { return options.response.slice(tbs.start, tbs.end) })
    res = res.value

    // Verify signature using CAs Public Key
    const signAlg = ocsp.utils.sign[res.signatureAlgorithm.algorithm.join('.')]
    if (!signAlg) {
      done(new Error('Unknown signature algorithm ' + res.signatureAlgorithm.algorithm), res)
      return
    }

    const responderKey = findResponder(issuer, certs, raws)

    const verify = crypto.createVerify(signAlg)
    const tbs = res.tbsResponseData
    const signature = res.signature.data

    verify.update(rawTBS)
    if (!verify.verify(responderKey, signature)) { return done(new Error('Invalid signature'), res) }

    if (tbs.responses.length < 1) { return done(new Error('Expected at least one response')) }

    res = tbs.responses[0]

    // Verify CertID
    // XXX(indutny): verify parameters
    if (res.certId.hashAlgorithm.algorithm.join('.') !== req.certID.hashAlgorithm.algorithm.join('.')) {
      return done(new Error('Hash algorithm mismatch'), res)
    }

    if (res.certId.issuerNameHash.toString('hex') !== req.certID.issuerNameHash.toString('hex')) {
      return done(new Error('Issuer name hash mismatch'), res)
    }

    if (res.certId.issuerKeyHash.toString('hex') !== req.certID.issuerKeyHash.toString('hex')) {
      return done(new Error('Issuer key hash mismatch'), res)
    }

    if (res.certId.serialNumber.cmp(req.certID.serialNumber) !== 0) {
      return done(new Error('Serial number mismatch'), res)
    }

    if (res.certStatus.type !== 'good') {
      return done(new Error('OCSP Status: ' + res.certStatus.type), res)
    }

    const now = +new Date()
    const nudge = options.nudge || 60000
    if (res.thisUpdate - nudge > now || res.nextUpdate + nudge < now) {
      return done(new Error('OCSP Response expired'), res)
    }

    return done(null, res)
  } catch (e) {
    return done(e)
  }
}
