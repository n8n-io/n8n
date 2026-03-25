const nativeModule = require(`module`);

module.exports = (filename) => {
  // Added in Node v12.2.0
  if (nativeModule.createRequire) {
    return nativeModule.createRequire(filename);
  }

  // Added in Node v10.12.0 and deprecated since Node v12.2.0
  if (nativeModule.createRequireFromPath) {
    return nativeModule.createRequireFromPath(filename);
  }

  // Polyfill
  return _createRequire(filename);
};

// Polyfill
function _createRequire (filename) {
  const mod = new nativeModule.Module(filename, null)
  mod.filename = filename
  mod.paths = nativeModule.Module._nodeModulePaths(path.dirname(filename))
  mod._compile(`module.exports = require;`, filename)
  return mod.exports
}
