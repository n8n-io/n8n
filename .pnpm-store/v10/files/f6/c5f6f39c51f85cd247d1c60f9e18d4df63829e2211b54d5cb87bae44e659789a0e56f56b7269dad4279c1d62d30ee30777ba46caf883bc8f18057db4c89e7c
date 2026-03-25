const ocsp = require('../ocsp')
const rfc2560 = require('asn1.js-rfc2560')
const rfc5280 = require('asn1.js-rfc5280')

exports.getOCSPURI = function getOCSPURI (rawCert, cb) {
  const ocspMethod = rfc2560['id-pkix-ocsp'].join('.')

  let cert = ocsp.utils.toDER(rawCert, 'CERTIFICATE')
  cert = rfc5280.Certificate.decode(cert, 'der')

  ocsp.utils.getAuthorityInfo(cert, ocspMethod, cb)
}
