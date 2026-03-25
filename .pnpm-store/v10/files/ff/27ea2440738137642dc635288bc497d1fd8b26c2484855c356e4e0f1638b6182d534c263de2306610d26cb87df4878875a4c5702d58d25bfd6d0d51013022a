const ocsp = require('../ocsp')

const rfc2560 = require('asn1.js-rfc2560')

module.exports = function check (options, cb) {
  let sync = true
  let req

  function done (err, data) {
    if (sync) {
      sync = false
      process.nextTick(function () {
        cb(err, data)
      })
      return
    }

    cb(err, data)
  }

  try {
    req = ocsp.request.generate(options.cert, options.issuer)
  } catch (e) {
    return done(e)
  }

  const ocspMethod = rfc2560['id-pkix-ocsp'].join('.')
  ocsp.utils.getAuthorityInfo(req.cert, ocspMethod, function (err, uri) {
    if (err) { return done(err) }

    ocsp.utils.getResponse(uri, req.data, function (err, raw) {
      if (err) {
        return done(err)
      }

      try {
        ocsp.verify({ request: req, response: raw }, done)
      } catch (e) {
        return done(e)
      }
    })
  })

  sync = false
}
