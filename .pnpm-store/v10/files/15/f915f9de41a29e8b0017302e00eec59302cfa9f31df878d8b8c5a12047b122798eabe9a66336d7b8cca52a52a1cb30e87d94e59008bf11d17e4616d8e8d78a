var adapter = require('./');

/**
 * Extracts the values from process.env.
 *
 * @type {Function}
 * @public
 */
module.exports = adapter(function hash() {
  return /(debug|diagnostics)=([^&]+)/i.exec(window.location.hash)[2];
});
