const diagnostics = require('./');

//
// Override the existing `debug` call so it will use `diagnostics` instead
// of the `debug` module.
//
try {
  var key = require.resolve('debug');

  require.cache[key] = {
    exports: diagnostics,
    filename: key,
    loaded: true,
    id: key
  };
} catch (e) { /* We don't really care if it fails */ }

//
// Export the default import as exports again.
//
module.exports = diagnostics;
