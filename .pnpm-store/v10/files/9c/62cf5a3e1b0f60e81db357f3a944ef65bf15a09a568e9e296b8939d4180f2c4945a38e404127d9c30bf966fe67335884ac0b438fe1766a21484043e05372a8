var adapter = require('./');

/**
 * Extracts the values from process.env.
 *
 * @type {Function}
 * @public
 */
module.exports = adapter(function storage() {
  return localStorage.getItem('debug') || localStorage.getItem('diagnostics');
});
