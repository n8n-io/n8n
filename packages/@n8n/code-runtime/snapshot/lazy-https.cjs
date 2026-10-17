// Bundled in place of `https` for the startup snapshot. See lazy-http.cjs.
module.exports = new Proxy({}, { get: (_target, key) => require('node:https')[key] });
