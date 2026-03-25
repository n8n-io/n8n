'use strict';

var createRequire = require('create-require');
var pkgDir = require('pkg-dir');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var createRequire__default = /*#__PURE__*/_interopDefaultLegacy(createRequire);
var pkgDir__default = /*#__PURE__*/_interopDefaultLegacy(pkgDir);

var _globalThis = function (Object) {
  function get() {
    var _global = this || self;
    delete Object.prototype.__magic__;
    return _global;
  }
  if (typeof globalThis === "object") {
    return globalThis;
  }
  if (this) {
    return get();
  } else {
    Object.defineProperty(Object.prototype, "__magic__", {
      configurable: true,
      get: get
    });
    var _global = __magic__;
    return _global;
  }
}(Object);

/**
 * @param {string} path
 */
const resolvePath = path => {
  let resolvedPath;
  try {
    resolvedPath = require.resolve(path);
  } catch {
    var _globalThis$require;
    resolvedPath = ((_globalThis$require = _globalThis.require) != null ? _globalThis$require : createRequire__default["default"]((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT' && document.currentScript.src || new URL('index.js', document.baseURI).href)))).resolve(path);
  }
  if (!path.includes('./')) {
    var _pkgDir$sync;
    const directory = (_pkgDir$sync = pkgDir__default["default"].sync(resolvedPath)) != null ? _pkgDir$sync : '';
    return directory;
  }
  return resolvedPath;
};
const assert = resolvePath('assert/');
const buffer = resolvePath('buffer/');
const child_process = resolvePath('./mock/empty.js');
const cluster = resolvePath('./mock/empty.js');
const _console = resolvePath('console-browserify');
const constants = resolvePath('constants-browserify');
const crypto = resolvePath('crypto-browserify');
const dgram = resolvePath('./mock/empty.js');
const dns = resolvePath('./mock/empty.js');
const domain = resolvePath('domain-browser');
const events = resolvePath('events/');
const fs = resolvePath('./mock/empty.js');
const http = resolvePath('stream-http');
const https = resolvePath('https-browserify');
const http2 = resolvePath('./mock/empty.js');
const _module = resolvePath('./mock/empty.js');
const net = resolvePath('./mock/empty.js');
const os = resolvePath('os-browserify/browser.js');
const path = resolvePath('path-browserify');
const punycode = resolvePath('punycode/');
const _process = resolvePath('./proxy/process').replace('.js', '');
const querystring = resolvePath('./proxy/querystring.js');
const readline = resolvePath('./mock/empty.js');
const repl = resolvePath('./mock/empty.js');
const stream = resolvePath('stream-browserify');
const _stream_duplex = resolvePath('readable-stream/lib/_stream_duplex.js');
const _stream_passthrough = resolvePath('readable-stream/lib/_stream_passthrough.js');
const _stream_readable = resolvePath('readable-stream/lib/_stream_readable.js');
const _stream_transform = resolvePath('readable-stream/lib/_stream_transform.js');
const _stream_writable = resolvePath('readable-stream/lib/_stream_writable.js');
const string_decoder = resolvePath('string_decoder/');
const sys = resolvePath('util/util.js');
const timers = resolvePath('timers-browserify');
const timersPromises = resolvePath('isomorphic-timers-promises');
const tls = resolvePath('./mock/empty.js');
const tty = resolvePath('tty-browserify');
const url = resolvePath('./proxy/url.js');
const util = resolvePath('util/util.js');
const vm = resolvePath('vm-browserify');
const zlib = resolvePath('browserify-zlib');
const packages = {
  assert,
  buffer,
  child_process,
  cluster,
  console: _console,
  constants,
  crypto,
  dgram,
  dns,
  domain,
  events,
  fs,
  http,
  https,
  http2,
  module: _module,
  net,
  os,
  path,
  punycode,
  process: _process,
  querystring,
  readline,
  repl,
  stream,
  _stream_duplex,
  _stream_passthrough,
  _stream_readable,
  _stream_transform,
  _stream_writable,
  string_decoder,
  sys,
  'timers/promises': timersPromises,
  timers,
  tls,
  tty,
  url,
  util,
  vm,
  zlib
};

/** @typedef {typeof packages} Packages */
/** @typedef {keyof Packages} PackageNames */
/** @typedef {{ [Property in PackageNames as `node:${Property}`]: Packages[Property] }} NodeProtocolPackages */

const packagesWithNodeProtocol = /** @type NodeProtocolPackages */{};
for (const [packageName, packagePath] of Object.entries(packages)) {
  packagesWithNodeProtocol[`node:${(/** @type PackageNames */packageName)}`] = /** @type PackageNames */packagePath;
}
var index = {
  ...packages,
  ...packagesWithNodeProtocol
};

module.exports = index;
//# sourceMappingURL=index.js.map
