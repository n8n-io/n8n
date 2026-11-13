// Bundled in place of `http` for the startup snapshot: the module loads on
// first use, after the start, because a snapshot cannot hold its bindings.
module.exports = new Proxy({}, { get: (_target, key) => require('node:http')[key] });
