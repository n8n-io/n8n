#!/usr/bin/env node

require('./sass.dart.js');
var library = globalThis._cliPkgExports.pop();
if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;

library.load({
  readline: require("readline"),
  chokidar: require("chokidar"),
  parcel_watcher: (function(i){let r;return function parcel_watcher(){if(void 0!==r)return r;try{r=require(i)}catch(e){if('MODULE_NOT_FOUND'!==e.code)console.error(e);r=null}return r}})("@parcel/watcher"),
  util: require("util"),
  stream: require("stream"),
  nodeModule: require("module"),
  fs: require("fs"),
  immutable: require("immutable"),
});

library.cli_pkg_main_0_(process.argv.slice(2));
