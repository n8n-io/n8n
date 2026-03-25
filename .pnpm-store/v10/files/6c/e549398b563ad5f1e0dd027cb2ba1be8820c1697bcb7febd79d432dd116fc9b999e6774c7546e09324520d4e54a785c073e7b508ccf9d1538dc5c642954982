require('./sass.dart.js');
const library = globalThis._cliPkgExports.pop();
if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;
library.load({
  util: require("util"),
  stream: require("stream"),
  nodeModule: require("module"),
  fs: require("fs"),
  immutable: require("immutable"),
});

module.exports = library;
