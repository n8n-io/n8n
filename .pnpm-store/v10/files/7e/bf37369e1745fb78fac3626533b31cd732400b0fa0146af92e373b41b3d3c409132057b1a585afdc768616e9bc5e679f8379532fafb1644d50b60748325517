"use strict";
var mqtt = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/esbuild-plugin-polyfill-node/polyfills/navigator.js
  var navigator;
  var init_navigator = __esm({
    "node_modules/esbuild-plugin-polyfill-node/polyfills/navigator.js"() {
      navigator = {
        deviceMemory: 8,
        // Highest allowed value
        hardwareConcurrency: 8,
        // Fairly common default
        language: "en-US"
        // Most common default
      };
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/process.js
  var process_exports = {};
  __export(process_exports, {
    _debugEnd: () => _debugEnd,
    _debugProcess: () => _debugProcess,
    _events: () => _events,
    _eventsCount: () => _eventsCount,
    _exiting: () => _exiting,
    _fatalExceptions: () => _fatalExceptions,
    _getActiveHandles: () => _getActiveHandles,
    _getActiveRequests: () => _getActiveRequests,
    _kill: () => _kill,
    _linkedBinding: () => _linkedBinding,
    _maxListeners: () => _maxListeners,
    _preload_modules: () => _preload_modules,
    _rawDebug: () => _rawDebug,
    _startProfilerIdleNotifier: () => _startProfilerIdleNotifier,
    _stopProfilerIdleNotifier: () => _stopProfilerIdleNotifier,
    _tickCallback: () => _tickCallback,
    abort: () => abort,
    addListener: () => addListener,
    allowedNodeEnvironmentFlags: () => allowedNodeEnvironmentFlags,
    arch: () => arch,
    argv: () => argv,
    argv0: () => argv0,
    assert: () => assert,
    binding: () => binding,
    chdir: () => chdir,
    config: () => config,
    cpuUsage: () => cpuUsage,
    cwd: () => cwd,
    debugPort: () => debugPort,
    default: () => process,
    dlopen: () => dlopen,
    domain: () => domain,
    emit: () => emit,
    emitWarning: () => emitWarning,
    env: () => env,
    execArgv: () => execArgv,
    execPath: () => execPath,
    exit: () => exit,
    features: () => features,
    hasUncaughtExceptionCaptureCallback: () => hasUncaughtExceptionCaptureCallback,
    hrtime: () => hrtime,
    kill: () => kill,
    listeners: () => listeners,
    memoryUsage: () => memoryUsage,
    moduleLoadList: () => moduleLoadList,
    nextTick: () => nextTick,
    off: () => off,
    on: () => on,
    once: () => once,
    openStdin: () => openStdin,
    pid: () => pid,
    platform: () => platform,
    ppid: () => ppid,
    prependListener: () => prependListener,
    prependOnceListener: () => prependOnceListener,
    reallyExit: () => reallyExit,
    release: () => release,
    removeAllListeners: () => removeAllListeners,
    removeListener: () => removeListener,
    resourceUsage: () => resourceUsage,
    setSourceMapsEnabled: () => setSourceMapsEnabled,
    setUncaughtExceptionCaptureCallback: () => setUncaughtExceptionCaptureCallback,
    stderr: () => stderr,
    stdin: () => stdin,
    stdout: () => stdout,
    title: () => title,
    umask: () => umask,
    uptime: () => uptime,
    version: () => version,
    versions: () => versions
  });
  function unimplemented(name2) {
    throw new Error("Node.js process " + name2 + " is not supported by JSPM core outside of Node.js");
  }
  function cleanUpNextTick() {
    if (!draining || !currentQueue)
      return;
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length)
      drainQueue();
  }
  function drainQueue() {
    if (draining)
      return;
    var timeout = setTimeout(cleanUpNextTick, 0);
    draining = true;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue)
          currentQueue[queueIndex].run();
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
  }
  function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i6 = 1; i6 < arguments.length; i6++)
        args[i6 - 1] = arguments[i6];
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining)
      setTimeout(drainQueue, 0);
  }
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  function noop() {
  }
  function _linkedBinding(name2) {
    unimplemented("_linkedBinding");
  }
  function dlopen(name2) {
    unimplemented("dlopen");
  }
  function _getActiveRequests() {
    return [];
  }
  function _getActiveHandles() {
    return [];
  }
  function assert(condition, message) {
    if (!condition)
      throw new Error(message || "assertion error");
  }
  function hasUncaughtExceptionCaptureCallback() {
    return false;
  }
  function uptime() {
    return _performance.now() / 1e3;
  }
  function hrtime(previousTimestamp) {
    var baseNow = Math.floor((Date.now() - _performance.now()) * 1e-3);
    var clocktime = _performance.now() * 1e-3;
    var seconds = Math.floor(clocktime) + baseNow;
    var nanoseconds = Math.floor(clocktime % 1 * 1e9);
    if (previousTimestamp) {
      seconds = seconds - previousTimestamp[0];
      nanoseconds = nanoseconds - previousTimestamp[1];
      if (nanoseconds < 0) {
        seconds--;
        nanoseconds += nanoPerSec;
      }
    }
    return [seconds, nanoseconds];
  }
  function on() {
    return process;
  }
  function listeners(name2) {
    return [];
  }
  var queue, draining, currentQueue, queueIndex, title, arch, platform, env, argv, execArgv, version, versions, emitWarning, binding, umask, cwd, chdir, release, _rawDebug, moduleLoadList, domain, _exiting, config, reallyExit, _kill, cpuUsage, resourceUsage, memoryUsage, kill, exit, openStdin, allowedNodeEnvironmentFlags, features, _fatalExceptions, setUncaughtExceptionCaptureCallback, _tickCallback, _debugProcess, _debugEnd, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, stdout, stderr, stdin, abort, pid, ppid, execPath, debugPort, argv0, _preload_modules, setSourceMapsEnabled, _performance, nowOffset, nanoPerSec, _maxListeners, _events, _eventsCount, addListener, once, off, removeListener, removeAllListeners, emit, prependListener, prependOnceListener, process;
  var init_process = __esm({
    "node_modules/@jspm/core/nodelibs/browser/process.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      queue = [];
      draining = false;
      queueIndex = -1;
      Item.prototype.run = function() {
        this.fun.apply(null, this.array);
      };
      title = "browser";
      arch = "x64";
      platform = "browser";
      env = {
        PATH: "/usr/bin",
        LANG: navigator.language + ".UTF-8",
        PWD: "/",
        HOME: "/home",
        TMP: "/tmp"
      };
      argv = ["/usr/bin/node"];
      execArgv = [];
      version = "v16.8.0";
      versions = {};
      emitWarning = function(message, type) {
        console.warn((type ? type + ": " : "") + message);
      };
      binding = function(name2) {
        unimplemented("binding");
      };
      umask = function(mask) {
        return 0;
      };
      cwd = function() {
        return "/";
      };
      chdir = function(dir) {
      };
      release = {
        name: "node",
        sourceUrl: "",
        headersUrl: "",
        libUrl: ""
      };
      _rawDebug = noop;
      moduleLoadList = [];
      domain = {};
      _exiting = false;
      config = {};
      reallyExit = noop;
      _kill = noop;
      cpuUsage = function() {
        return {};
      };
      resourceUsage = cpuUsage;
      memoryUsage = cpuUsage;
      kill = noop;
      exit = noop;
      openStdin = noop;
      allowedNodeEnvironmentFlags = {};
      features = {
        inspector: false,
        debug: false,
        uv: false,
        ipv6: false,
        tls_alpn: false,
        tls_sni: false,
        tls_ocsp: false,
        tls: false,
        cached_builtins: true
      };
      _fatalExceptions = noop;
      setUncaughtExceptionCaptureCallback = noop;
      _tickCallback = noop;
      _debugProcess = noop;
      _debugEnd = noop;
      _startProfilerIdleNotifier = noop;
      _stopProfilerIdleNotifier = noop;
      stdout = void 0;
      stderr = void 0;
      stdin = void 0;
      abort = noop;
      pid = 2;
      ppid = 1;
      execPath = "/bin/usr/node";
      debugPort = 9229;
      argv0 = "node";
      _preload_modules = [];
      setSourceMapsEnabled = noop;
      _performance = {
        now: typeof performance !== "undefined" ? performance.now.bind(performance) : void 0,
        timing: typeof performance !== "undefined" ? performance.timing : void 0
      };
      if (_performance.now === void 0) {
        nowOffset = Date.now();
        if (_performance.timing && _performance.timing.navigationStart) {
          nowOffset = _performance.timing.navigationStart;
        }
        _performance.now = () => Date.now() - nowOffset;
      }
      nanoPerSec = 1e9;
      hrtime.bigint = function(time) {
        var diff = hrtime(time);
        if (typeof BigInt === "undefined") {
          return diff[0] * nanoPerSec + diff[1];
        }
        return BigInt(diff[0] * nanoPerSec) + BigInt(diff[1]);
      };
      _maxListeners = 10;
      _events = {};
      _eventsCount = 0;
      addListener = on;
      once = on;
      off = on;
      removeListener = on;
      removeAllListeners = on;
      emit = noop;
      prependListener = on;
      prependOnceListener = on;
      process = {
        version,
        versions,
        arch,
        platform,
        release,
        _rawDebug,
        moduleLoadList,
        binding,
        _linkedBinding,
        _events,
        _eventsCount,
        _maxListeners,
        on,
        addListener,
        once,
        off,
        removeListener,
        removeAllListeners,
        emit,
        prependListener,
        prependOnceListener,
        listeners,
        domain,
        _exiting,
        config,
        dlopen,
        uptime,
        _getActiveRequests,
        _getActiveHandles,
        reallyExit,
        _kill,
        cpuUsage,
        resourceUsage,
        memoryUsage,
        kill,
        exit,
        openStdin,
        allowedNodeEnvironmentFlags,
        assert,
        features,
        _fatalExceptions,
        setUncaughtExceptionCaptureCallback,
        hasUncaughtExceptionCaptureCallback,
        emitWarning,
        nextTick,
        _tickCallback,
        _debugProcess,
        _debugEnd,
        _startProfilerIdleNotifier,
        _stopProfilerIdleNotifier,
        stdout,
        stdin,
        stderr,
        abort,
        umask,
        chdir,
        cwd,
        env,
        title,
        argv,
        execArgv,
        pid,
        ppid,
        execPath,
        debugPort,
        hrtime,
        argv0,
        _preload_modules,
        setSourceMapsEnabled
      };
    }
  });

  // node_modules/esbuild-plugin-polyfill-node/polyfills/process.js
  var init_process2 = __esm({
    "node_modules/esbuild-plugin-polyfill-node/polyfills/process.js"() {
      init_process();
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/buffer.js
  var buffer_exports = {};
  __export(buffer_exports, {
    Buffer: () => Buffer2,
    INSPECT_MAX_BYTES: () => INSPECT_MAX_BYTES,
    default: () => exports,
    kMaxLength: () => kMaxLength
  });
  function dew$2() {
    if (_dewExec$2)
      return exports$3;
    _dewExec$2 = true;
    exports$3.byteLength = byteLength;
    exports$3.toByteArray = toByteArray;
    exports$3.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (var i6 = 0, len = code.length; i6 < len; ++i6) {
      lookup[i6] = code[i6];
      revLookup[code.charCodeAt(i6)] = i6;
    }
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1)
        validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i7;
      for (i7 = 0; i7 < len2; i7 += 4) {
        tmp = revLookup[b64.charCodeAt(i7)] << 18 | revLookup[b64.charCodeAt(i7 + 1)] << 12 | revLookup[b64.charCodeAt(i7 + 2)] << 6 | revLookup[b64.charCodeAt(i7 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i7)] << 2 | revLookup[b64.charCodeAt(i7 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i7)] << 10 | revLookup[b64.charCodeAt(i7 + 1)] << 4 | revLookup[b64.charCodeAt(i7 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i7 = start; i7 < end; i7 += 3) {
        tmp = (uint8[i7] << 16 & 16711680) + (uint8[i7 + 1] << 8 & 65280) + (uint8[i7 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i7 = 0, len22 = len2 - extraBytes; i7 < len22; i7 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i7, i7 + maxChunkLength > len22 ? len22 : i7 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
      }
      return parts.join("");
    }
    return exports$3;
  }
  function dew$1() {
    if (_dewExec$1)
      return exports$2;
    _dewExec$1 = true;
    exports$2.read = function(buffer, offset, isLE, mLen, nBytes) {
      var e7, m4;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i6 = isLE ? nBytes - 1 : 0;
      var d4 = isLE ? -1 : 1;
      var s5 = buffer[offset + i6];
      i6 += d4;
      e7 = s5 & (1 << -nBits) - 1;
      s5 >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e7 = e7 * 256 + buffer[offset + i6], i6 += d4, nBits -= 8) {
      }
      m4 = e7 & (1 << -nBits) - 1;
      e7 >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m4 = m4 * 256 + buffer[offset + i6], i6 += d4, nBits -= 8) {
      }
      if (e7 === 0) {
        e7 = 1 - eBias;
      } else if (e7 === eMax) {
        return m4 ? NaN : (s5 ? -1 : 1) * Infinity;
      } else {
        m4 = m4 + Math.pow(2, mLen);
        e7 = e7 - eBias;
      }
      return (s5 ? -1 : 1) * m4 * Math.pow(2, e7 - mLen);
    };
    exports$2.write = function(buffer, value, offset, isLE, mLen, nBytes) {
      var e7, m4, c6;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i6 = isLE ? 0 : nBytes - 1;
      var d4 = isLE ? 1 : -1;
      var s5 = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || value === Infinity) {
        m4 = isNaN(value) ? 1 : 0;
        e7 = eMax;
      } else {
        e7 = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c6 = Math.pow(2, -e7)) < 1) {
          e7--;
          c6 *= 2;
        }
        if (e7 + eBias >= 1) {
          value += rt / c6;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c6 >= 2) {
          e7++;
          c6 /= 2;
        }
        if (e7 + eBias >= eMax) {
          m4 = 0;
          e7 = eMax;
        } else if (e7 + eBias >= 1) {
          m4 = (value * c6 - 1) * Math.pow(2, mLen);
          e7 = e7 + eBias;
        } else {
          m4 = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e7 = 0;
        }
      }
      for (; mLen >= 8; buffer[offset + i6] = m4 & 255, i6 += d4, m4 /= 256, mLen -= 8) {
      }
      e7 = e7 << mLen | m4;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i6] = e7 & 255, i6 += d4, e7 /= 256, eLen -= 8) {
      }
      buffer[offset + i6 - d4] |= s5 * 128;
    };
    return exports$2;
  }
  function dew() {
    if (_dewExec)
      return exports$1;
    _dewExec = true;
    const base64 = dew$2();
    const ieee754 = dew$1();
    const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
    exports$1.Buffer = Buffer3;
    exports$1.SlowBuffer = SlowBuffer;
    exports$1.INSPECT_MAX_BYTES = 50;
    const K_MAX_LENGTH = 2147483647;
    exports$1.kMaxLength = K_MAX_LENGTH;
    Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
    if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
      console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
    }
    function typedArraySupport() {
      try {
        const arr = new Uint8Array(1);
        const proto = {
          foo: function() {
            return 42;
          }
        };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42;
      } catch (e7) {
        return false;
      }
    }
    Object.defineProperty(Buffer3.prototype, "parent", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this))
          return void 0;
        return this.buffer;
      }
    });
    Object.defineProperty(Buffer3.prototype, "offset", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this))
          return void 0;
        return this.byteOffset;
      }
    });
    function createBuffer(length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
      }
      const buf = new Uint8Array(length);
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function Buffer3(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
          throw new TypeError('The "string" argument must be of type string. Received type number');
        }
        return allocUnsafe(arg);
      }
      return from(arg, encodingOrOffset, length);
    }
    Buffer3.poolSize = 8192;
    function from(value, encodingOrOffset, length) {
      if (typeof value === "string") {
        return fromString(value, encodingOrOffset);
      }
      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value);
      }
      if (value == null) {
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
      }
      if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof value === "number") {
        throw new TypeError('The "value" argument must not be of type number. Received type number');
      }
      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer3.from(valueOf, encodingOrOffset, length);
      }
      const b3 = fromObject(value);
      if (b3)
        return b3;
      if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
        return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
      }
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
    }
    Buffer3.from = function(value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length);
    };
    Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer3, Uint8Array);
    function assertSize(size) {
      if (typeof size !== "number") {
        throw new TypeError('"size" argument must be of type number');
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
      }
    }
    function alloc(size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size);
      }
      if (fill !== void 0) {
        return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
      }
      return createBuffer(size);
    }
    Buffer3.alloc = function(size, fill, encoding) {
      return alloc(size, fill, encoding);
    };
    function allocUnsafe(size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0);
    }
    Buffer3.allocUnsafe = function(size) {
      return allocUnsafe(size);
    };
    Buffer3.allocUnsafeSlow = function(size) {
      return allocUnsafe(size);
    };
    function fromString(string, encoding) {
      if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
      }
      if (!Buffer3.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      const length = byteLength(string, encoding) | 0;
      let buf = createBuffer(length);
      const actual = buf.write(string, encoding);
      if (actual !== length) {
        buf = buf.slice(0, actual);
      }
      return buf;
    }
    function fromArrayLike(array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf = createBuffer(length);
      for (let i6 = 0; i6 < length; i6 += 1) {
        buf[i6] = array[i6] & 255;
      }
      return buf;
    }
    function fromArrayView(arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
      }
      return fromArrayLike(arrayView);
    }
    function fromArrayBuffer(array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
      }
      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
      }
      let buf;
      if (byteOffset === void 0 && length === void 0) {
        buf = new Uint8Array(array);
      } else if (length === void 0) {
        buf = new Uint8Array(array, byteOffset);
      } else {
        buf = new Uint8Array(array, byteOffset, length);
      }
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function fromObject(obj) {
      if (Buffer3.isBuffer(obj)) {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);
        if (buf.length === 0) {
          return buf;
        }
        obj.copy(buf, 0, 0, len);
        return buf;
      }
      if (obj.length !== void 0) {
        if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
          return createBuffer(0);
        }
        return fromArrayLike(obj);
      }
      if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
      }
    }
    function checked(length) {
      if (length >= K_MAX_LENGTH) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
      }
      return length | 0;
    }
    function SlowBuffer(length) {
      if (+length != length) {
        length = 0;
      }
      return Buffer3.alloc(+length);
    }
    Buffer3.isBuffer = function isBuffer(b3) {
      return b3 != null && b3._isBuffer === true && b3 !== Buffer3.prototype;
    };
    Buffer3.compare = function compare(a6, b3) {
      if (isInstance(a6, Uint8Array))
        a6 = Buffer3.from(a6, a6.offset, a6.byteLength);
      if (isInstance(b3, Uint8Array))
        b3 = Buffer3.from(b3, b3.offset, b3.byteLength);
      if (!Buffer3.isBuffer(a6) || !Buffer3.isBuffer(b3)) {
        throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
      }
      if (a6 === b3)
        return 0;
      let x2 = a6.length;
      let y4 = b3.length;
      for (let i6 = 0, len = Math.min(x2, y4); i6 < len; ++i6) {
        if (a6[i6] !== b3[i6]) {
          x2 = a6[i6];
          y4 = b3[i6];
          break;
        }
      }
      if (x2 < y4)
        return -1;
      if (y4 < x2)
        return 1;
      return 0;
    };
    Buffer3.isEncoding = function isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    Buffer3.concat = function concat(list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      if (list.length === 0) {
        return Buffer3.alloc(0);
      }
      let i6;
      if (length === void 0) {
        length = 0;
        for (i6 = 0; i6 < list.length; ++i6) {
          length += list[i6].length;
        }
      }
      const buffer = Buffer3.allocUnsafe(length);
      let pos = 0;
      for (i6 = 0; i6 < list.length; ++i6) {
        let buf = list[i6];
        if (isInstance(buf, Uint8Array)) {
          if (pos + buf.length > buffer.length) {
            if (!Buffer3.isBuffer(buf))
              buf = Buffer3.from(buf);
            buf.copy(buffer, pos);
          } else {
            Uint8Array.prototype.set.call(buffer, buf, pos);
          }
        } else if (!Buffer3.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        } else {
          buf.copy(buffer, pos);
        }
        pos += buf.length;
      }
      return buffer;
    };
    function byteLength(string, encoding) {
      if (Buffer3.isBuffer(string)) {
        return string.length;
      }
      if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength;
      }
      if (typeof string !== "string") {
        throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string);
      }
      const len = string.length;
      const mustMatch = arguments.length > 2 && arguments[2] === true;
      if (!mustMatch && len === 0)
        return 0;
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "ascii":
          case "latin1":
          case "binary":
            return len;
          case "utf8":
          case "utf-8":
            return utf8ToBytes(string).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return len * 2;
          case "hex":
            return len >>> 1;
          case "base64":
            return base64ToBytes(string).length;
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length;
            }
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.byteLength = byteLength;
    function slowToString(encoding, start, end) {
      let loweredCase = false;
      if (start === void 0 || start < 0) {
        start = 0;
      }
      if (start > this.length) {
        return "";
      }
      if (end === void 0 || end > this.length) {
        end = this.length;
      }
      if (end <= 0) {
        return "";
      }
      end >>>= 0;
      start >>>= 0;
      if (end <= start) {
        return "";
      }
      if (!encoding)
        encoding = "utf8";
      while (true) {
        switch (encoding) {
          case "hex":
            return hexSlice(this, start, end);
          case "utf8":
          case "utf-8":
            return utf8Slice(this, start, end);
          case "ascii":
            return asciiSlice(this, start, end);
          case "latin1":
          case "binary":
            return latin1Slice(this, start, end);
          case "base64":
            return base64Slice(this, start, end);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return utf16leSlice(this, start, end);
          default:
            if (loweredCase)
              throw new TypeError("Unknown encoding: " + encoding);
            encoding = (encoding + "").toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.prototype._isBuffer = true;
    function swap(b3, n7, m4) {
      const i6 = b3[n7];
      b3[n7] = b3[m4];
      b3[m4] = i6;
    }
    Buffer3.prototype.swap16 = function swap16() {
      const len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      }
      for (let i6 = 0; i6 < len; i6 += 2) {
        swap(this, i6, i6 + 1);
      }
      return this;
    };
    Buffer3.prototype.swap32 = function swap32() {
      const len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      }
      for (let i6 = 0; i6 < len; i6 += 4) {
        swap(this, i6, i6 + 3);
        swap(this, i6 + 1, i6 + 2);
      }
      return this;
    };
    Buffer3.prototype.swap64 = function swap64() {
      const len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      }
      for (let i6 = 0; i6 < len; i6 += 8) {
        swap(this, i6, i6 + 7);
        swap(this, i6 + 1, i6 + 6);
        swap(this, i6 + 2, i6 + 5);
        swap(this, i6 + 3, i6 + 4);
      }
      return this;
    };
    Buffer3.prototype.toString = function toString() {
      const length = this.length;
      if (length === 0)
        return "";
      if (arguments.length === 0)
        return utf8Slice(this, 0, length);
      return slowToString.apply(this, arguments);
    };
    Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
    Buffer3.prototype.equals = function equals(b3) {
      if (!Buffer3.isBuffer(b3))
        throw new TypeError("Argument must be a Buffer");
      if (this === b3)
        return true;
      return Buffer3.compare(this, b3) === 0;
    };
    Buffer3.prototype.inspect = function inspect() {
      let str = "";
      const max = exports$1.INSPECT_MAX_BYTES;
      str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
      if (this.length > max)
        str += " ... ";
      return "<Buffer " + str + ">";
    };
    if (customInspectSymbol) {
      Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
    }
    Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer3.from(target, target.offset, target.byteLength);
      }
      if (!Buffer3.isBuffer(target)) {
        throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target);
      }
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = target ? target.length : 0;
      }
      if (thisStart === void 0) {
        thisStart = 0;
      }
      if (thisEnd === void 0) {
        thisEnd = this.length;
      }
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError("out of range index");
      }
      if (thisStart >= thisEnd && start >= end) {
        return 0;
      }
      if (thisStart >= thisEnd) {
        return -1;
      }
      if (start >= end) {
        return 1;
      }
      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;
      if (this === target)
        return 0;
      let x2 = thisEnd - thisStart;
      let y4 = end - start;
      const len = Math.min(x2, y4);
      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);
      for (let i6 = 0; i6 < len; ++i6) {
        if (thisCopy[i6] !== targetCopy[i6]) {
          x2 = thisCopy[i6];
          y4 = targetCopy[i6];
          break;
        }
      }
      if (x2 < y4)
        return -1;
      if (y4 < x2)
        return 1;
      return 0;
    };
    function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
      if (buffer.length === 0)
        return -1;
      if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 2147483647) {
        byteOffset = 2147483647;
      } else if (byteOffset < -2147483648) {
        byteOffset = -2147483648;
      }
      byteOffset = +byteOffset;
      if (numberIsNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer.length - 1;
      }
      if (byteOffset < 0)
        byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir)
          return -1;
        else
          byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir)
          byteOffset = 0;
        else
          return -1;
      }
      if (typeof val === "string") {
        val = Buffer3.from(val, encoding);
      }
      if (Buffer3.isBuffer(val)) {
        if (val.length === 0) {
          return -1;
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
      } else if (typeof val === "number") {
        val = val & 255;
        if (typeof Uint8Array.prototype.indexOf === "function") {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
          }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
      }
      throw new TypeError("val must be string, number or Buffer");
    }
    function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;
      if (encoding !== void 0) {
        encoding = String(encoding).toLowerCase();
        if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
          if (arr.length < 2 || val.length < 2) {
            return -1;
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }
      function read(buf, i7) {
        if (indexSize === 1) {
          return buf[i7];
        } else {
          return buf.readUInt16BE(i7 * indexSize);
        }
      }
      let i6;
      if (dir) {
        let foundIndex = -1;
        for (i6 = byteOffset; i6 < arrLength; i6++) {
          if (read(arr, i6) === read(val, foundIndex === -1 ? 0 : i6 - foundIndex)) {
            if (foundIndex === -1)
              foundIndex = i6;
            if (i6 - foundIndex + 1 === valLength)
              return foundIndex * indexSize;
          } else {
            if (foundIndex !== -1)
              i6 -= i6 - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength)
          byteOffset = arrLength - valLength;
        for (i6 = byteOffset; i6 >= 0; i6--) {
          let found = true;
          for (let j2 = 0; j2 < valLength; j2++) {
            if (read(arr, i6 + j2) !== read(val, j2)) {
              found = false;
              break;
            }
          }
          if (found)
            return i6;
        }
      }
      return -1;
    }
    Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1;
    };
    Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    };
    Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    };
    function hexWrite(buf, string, offset, length) {
      offset = Number(offset) || 0;
      const remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }
      const strLen = string.length;
      if (length > strLen / 2) {
        length = strLen / 2;
      }
      let i6;
      for (i6 = 0; i6 < length; ++i6) {
        const parsed = parseInt(string.substr(i6 * 2, 2), 16);
        if (numberIsNaN(parsed))
          return i6;
        buf[offset + i6] = parsed;
      }
      return i6;
    }
    function utf8Write(buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
    }
    function asciiWrite(buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length);
    }
    function base64Write(buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length);
    }
    function ucs2Write(buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
    }
    Buffer3.prototype.write = function write(string, offset, length, encoding) {
      if (offset === void 0) {
        encoding = "utf8";
        length = this.length;
        offset = 0;
      } else if (length === void 0 && typeof offset === "string") {
        encoding = offset;
        length = this.length;
        offset = 0;
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
          length = length >>> 0;
          if (encoding === void 0)
            encoding = "utf8";
        } else {
          encoding = length;
          length = void 0;
        }
      } else {
        throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
      }
      const remaining = this.length - offset;
      if (length === void 0 || length > remaining)
        length = remaining;
      if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
        throw new RangeError("Attempt to write outside buffer bounds");
      }
      if (!encoding)
        encoding = "utf8";
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "hex":
            return hexWrite(this, string, offset, length);
          case "utf8":
          case "utf-8":
            return utf8Write(this, string, offset, length);
          case "ascii":
          case "latin1":
          case "binary":
            return asciiWrite(this, string, offset, length);
          case "base64":
            return base64Write(this, string, offset, length);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ucs2Write(this, string, offset, length);
          default:
            if (loweredCase)
              throw new TypeError("Unknown encoding: " + encoding);
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };
    Buffer3.prototype.toJSON = function toJSON() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function base64Slice(buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf);
      } else {
        return base64.fromByteArray(buf.slice(start, end));
      }
    }
    function utf8Slice(buf, start, end) {
      end = Math.min(buf.length, end);
      const res = [];
      let i6 = start;
      while (i6 < end) {
        const firstByte = buf[i6];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i6 + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = buf[i6 + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = buf[i6 + 1];
              thirdByte = buf[i6 + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = buf[i6 + 1];
              thirdByte = buf[i6 + 2];
              fourthByte = buf[i6 + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint === null) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i6 += bytesPerSequence;
      }
      return decodeCodePointsArray(res);
    }
    const MAX_ARGUMENTS_LENGTH = 4096;
    function decodeCodePointsArray(codePoints) {
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i6 = 0;
      while (i6 < len) {
        res += String.fromCharCode.apply(String, codePoints.slice(i6, i6 += MAX_ARGUMENTS_LENGTH));
      }
      return res;
    }
    function asciiSlice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i6 = start; i6 < end; ++i6) {
        ret += String.fromCharCode(buf[i6] & 127);
      }
      return ret;
    }
    function latin1Slice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i6 = start; i6 < end; ++i6) {
        ret += String.fromCharCode(buf[i6]);
      }
      return ret;
    }
    function hexSlice(buf, start, end) {
      const len = buf.length;
      if (!start || start < 0)
        start = 0;
      if (!end || end < 0 || end > len)
        end = len;
      let out = "";
      for (let i6 = start; i6 < end; ++i6) {
        out += hexSliceLookupTable[buf[i6]];
      }
      return out;
    }
    function utf16leSlice(buf, start, end) {
      const bytes = buf.slice(start, end);
      let res = "";
      for (let i6 = 0; i6 < bytes.length - 1; i6 += 2) {
        res += String.fromCharCode(bytes[i6] + bytes[i6 + 1] * 256);
      }
      return res;
    }
    Buffer3.prototype.slice = function slice(start, end) {
      const len = this.length;
      start = ~~start;
      end = end === void 0 ? len : ~~end;
      if (start < 0) {
        start += len;
        if (start < 0)
          start = 0;
      } else if (start > len) {
        start = len;
      }
      if (end < 0) {
        end += len;
        if (end < 0)
          end = 0;
      } else if (end > len) {
        end = len;
      }
      if (end < start)
        end = start;
      const newBuf = this.subarray(start, end);
      Object.setPrototypeOf(newBuf, Buffer3.prototype);
      return newBuf;
    };
    function checkOffset(offset, ext, length) {
      if (offset % 1 !== 0 || offset < 0)
        throw new RangeError("offset is not uint");
      if (offset + ext > length)
        throw new RangeError("Trying to access beyond buffer length");
    }
    Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i6 = 0;
      while (++i6 < byteLength2 && (mul *= 256)) {
        val += this[offset + i6] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength2, this.length);
      }
      let val = this[offset + --byteLength2];
      let mul = 1;
      while (byteLength2 > 0 && (mul *= 256)) {
        val += this[offset + --byteLength2] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 1, this.length);
      return this[offset];
    };
    Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      return this[offset] | this[offset + 1] << 8;
    };
    Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      return this[offset] << 8 | this[offset + 1];
    };
    Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
    };
    Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    };
    Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
      const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
      return BigInt(lo) + (BigInt(hi) << BigInt(32));
    });
    Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
      return (BigInt(hi) << BigInt(32)) + BigInt(lo);
    });
    Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i6 = 0;
      while (++i6 < byteLength2 && (mul *= 256)) {
        val += this[offset + i6] * mul;
      }
      mul *= 128;
      if (val >= mul)
        val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength2, this.length);
      let i6 = byteLength2;
      let mul = 1;
      let val = this[offset + --i6];
      while (i6 > 0 && (mul *= 256)) {
        val += this[offset + --i6] * mul;
      }
      mul *= 128;
      if (val >= mul)
        val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 1, this.length);
      if (!(this[offset] & 128))
        return this[offset];
      return (255 - this[offset] + 1) * -1;
    };
    Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      const val = this[offset] | this[offset + 1] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | this[offset] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    };
    Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    };
    Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
      return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
    });
    Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = (first << 24) + // Overflow
      this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
    });
    Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, true, 23, 4);
    };
    Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, false, 23, 4);
    };
    Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, true, 52, 8);
    };
    Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, false, 52, 8);
    };
    function checkInt(buf, value, offset, ext, max, min) {
      if (!Buffer3.isBuffer(buf))
        throw new TypeError('"buffer" argument must be a Buffer instance');
      if (value > max || value < min)
        throw new RangeError('"value" argument is out of bounds');
      if (offset + ext > buf.length)
        throw new RangeError("Index out of range");
    }
    Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let mul = 1;
      let i6 = 0;
      this[offset] = value & 255;
      while (++i6 < byteLength2 && (mul *= 256)) {
        this[offset + i6] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let i6 = byteLength2 - 1;
      let mul = 1;
      this[offset + i6] = value & 255;
      while (--i6 >= 0 && (mul *= 256)) {
        this[offset + i6] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 1, 255, 0);
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    function wrtBigUInt64LE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      return offset;
    }
    function wrtBigUInt64BE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset + 7] = lo;
      lo = lo >> 8;
      buf[offset + 6] = lo;
      lo = lo >> 8;
      buf[offset + 5] = lo;
      lo = lo >> 8;
      buf[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset + 3] = hi;
      hi = hi >> 8;
      buf[offset + 2] = hi;
      hi = hi >> 8;
      buf[offset + 1] = hi;
      hi = hi >> 8;
      buf[offset] = hi;
      return offset + 8;
    }
    Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i6 = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 255;
      while (++i6 < byteLength2 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i6 - 1] !== 0) {
          sub = 1;
        }
        this[offset + i6] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i6 = byteLength2 - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i6] = value & 255;
      while (--i6 >= 0 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i6 + 1] !== 0) {
          sub = 1;
        }
        this[offset + i6] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 1, 127, -128);
      if (value < 0)
        value = 255 + value + 1;
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 2147483647, -2147483648);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
      return offset + 4;
    };
    Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 2147483647, -2147483648);
      if (value < 0)
        value = 4294967295 + value + 1;
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function checkIEEE754(buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length)
        throw new RangeError("Index out of range");
      if (offset < 0)
        throw new RangeError("Index out of range");
    }
    function writeFloat(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      ieee754.write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4;
    }
    Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert);
    };
    function writeDouble(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      ieee754.write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8;
    }
    Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert);
    };
    Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
      if (!Buffer3.isBuffer(target))
        throw new TypeError("argument should be a Buffer");
      if (!start)
        start = 0;
      if (!end && end !== 0)
        end = this.length;
      if (targetStart >= target.length)
        targetStart = target.length;
      if (!targetStart)
        targetStart = 0;
      if (end > 0 && end < start)
        end = start;
      if (end === start)
        return 0;
      if (target.length === 0 || this.length === 0)
        return 0;
      if (targetStart < 0) {
        throw new RangeError("targetStart out of bounds");
      }
      if (start < 0 || start >= this.length)
        throw new RangeError("Index out of range");
      if (end < 0)
        throw new RangeError("sourceEnd out of bounds");
      if (end > this.length)
        end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }
      const len = end - start;
      if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
      }
      return len;
    };
    Buffer3.prototype.fill = function fill(val, start, end, encoding) {
      if (typeof val === "string") {
        if (typeof start === "string") {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === "string") {
          encoding = end;
          end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
          throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
          const code = val.charCodeAt(0);
          if (encoding === "utf8" && code < 128 || encoding === "latin1") {
            val = code;
          }
        }
      } else if (typeof val === "number") {
        val = val & 255;
      } else if (typeof val === "boolean") {
        val = Number(val);
      }
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
      }
      if (end <= start) {
        return this;
      }
      start = start >>> 0;
      end = end === void 0 ? this.length : end >>> 0;
      if (!val)
        val = 0;
      let i6;
      if (typeof val === "number") {
        for (i6 = start; i6 < end; ++i6) {
          this[i6] = val;
        }
      } else {
        const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
          throw new TypeError('The value "' + val + '" is invalid for argument "value"');
        }
        for (i6 = 0; i6 < end - start; ++i6) {
          this[i6 + start] = bytes[i6 % len];
        }
      }
      return this;
    };
    const errors = {};
    function E2(sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor() {
          super();
          Object.defineProperty(this, "message", {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });
          this.name = `${this.name} [${sym}]`;
          this.stack;
          delete this.name;
        }
        get code() {
          return sym;
        }
        set code(value) {
          Object.defineProperty(this, "code", {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
        toString() {
          return `${this.name} [${sym}]: ${this.message}`;
        }
      };
    }
    E2("ERR_BUFFER_OUT_OF_BOUNDS", function(name2) {
      if (name2) {
        return `${name2} is outside of buffer bounds`;
      }
      return "Attempt to access memory outside buffer bounds";
    }, RangeError);
    E2("ERR_INVALID_ARG_TYPE", function(name2, actual) {
      return `The "${name2}" argument must be of type number. Received type ${typeof actual}`;
    }, TypeError);
    E2("ERR_OUT_OF_RANGE", function(str, range, input) {
      let msg = `The value of "${str}" is out of range.`;
      let received = input;
      if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
        received = addNumericalSeparator(String(input));
      } else if (typeof input === "bigint") {
        received = String(input);
        if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
          received = addNumericalSeparator(received);
        }
        received += "n";
      }
      msg += ` It must be ${range}. Received ${received}`;
      return msg;
    }, RangeError);
    function addNumericalSeparator(val) {
      let res = "";
      let i6 = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i6 >= start + 4; i6 -= 3) {
        res = `_${val.slice(i6 - 3, i6)}${res}`;
      }
      return `${val.slice(0, i6)}${res}`;
    }
    function checkBounds(buf, offset, byteLength2) {
      validateNumber(offset, "offset");
      if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
        boundsError(offset, buf.length - (byteLength2 + 1));
      }
    }
    function checkIntBI(value, min, max, buf, offset, byteLength2) {
      if (value > max || value < min) {
        const n7 = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength2 > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n7} and < 2${n7} ** ${(byteLength2 + 1) * 8}${n7}`;
          } else {
            range = `>= -(2${n7} ** ${(byteLength2 + 1) * 8 - 1}${n7}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n7}`;
          }
        } else {
          range = `>= ${min}${n7} and <= ${max}${n7}`;
        }
        throw new errors.ERR_OUT_OF_RANGE("value", range, value);
      }
      checkBounds(buf, offset, byteLength2);
    }
    function validateNumber(value, name2) {
      if (typeof value !== "number") {
        throw new errors.ERR_INVALID_ARG_TYPE(name2, "number", value);
      }
    }
    function boundsError(value, length, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
      }
      if (length < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
      }
      throw new errors.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
    }
    const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
    function base64clean(str) {
      str = str.split("=")[0];
      str = str.trim().replace(INVALID_BASE64_RE, "");
      if (str.length < 2)
        return "";
      while (str.length % 4 !== 0) {
        str = str + "=";
      }
      return str;
    }
    function utf8ToBytes(string, units) {
      units = units || Infinity;
      let codePoint;
      const length = string.length;
      let leadSurrogate = null;
      const bytes = [];
      for (let i6 = 0; i6 < length; ++i6) {
        codePoint = string.charCodeAt(i6);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              continue;
            } else if (i6 + 1 === length) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            if ((units -= 3) > -1)
              bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
        }
        leadSurrogate = null;
        if (codePoint < 128) {
          if ((units -= 1) < 0)
            break;
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          if ((units -= 2) < 0)
            break;
          bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
        } else if (codePoint < 65536) {
          if ((units -= 3) < 0)
            break;
          bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else if (codePoint < 1114112) {
          if ((units -= 4) < 0)
            break;
          bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else {
          throw new Error("Invalid code point");
        }
      }
      return bytes;
    }
    function asciiToBytes(str) {
      const byteArray = [];
      for (let i6 = 0; i6 < str.length; ++i6) {
        byteArray.push(str.charCodeAt(i6) & 255);
      }
      return byteArray;
    }
    function utf16leToBytes(str, units) {
      let c6, hi, lo;
      const byteArray = [];
      for (let i6 = 0; i6 < str.length; ++i6) {
        if ((units -= 2) < 0)
          break;
        c6 = str.charCodeAt(i6);
        hi = c6 >> 8;
        lo = c6 % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }
      return byteArray;
    }
    function base64ToBytes(str) {
      return base64.toByteArray(base64clean(str));
    }
    function blitBuffer(src, dst, offset, length) {
      let i6;
      for (i6 = 0; i6 < length; ++i6) {
        if (i6 + offset >= dst.length || i6 >= src.length)
          break;
        dst[i6 + offset] = src[i6];
      }
      return i6;
    }
    function isInstance(obj, type) {
      return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    function numberIsNaN(obj) {
      return obj !== obj;
    }
    const hexSliceLookupTable = function() {
      const alphabet = "0123456789abcdef";
      const table = new Array(256);
      for (let i6 = 0; i6 < 16; ++i6) {
        const i16 = i6 * 16;
        for (let j2 = 0; j2 < 16; ++j2) {
          table[i16 + j2] = alphabet[i6] + alphabet[j2];
        }
      }
      return table;
    }();
    function defineBigIntMethod(fn) {
      return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
    }
    function BufferBigIntNotDefined() {
      throw new Error("BigInt not supported");
    }
    return exports$1;
  }
  var exports$3, _dewExec$2, exports$2, _dewExec$1, exports$1, _dewExec, exports, Buffer2, INSPECT_MAX_BYTES, kMaxLength;
  var init_buffer = __esm({
    "node_modules/@jspm/core/nodelibs/browser/buffer.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      exports$3 = {};
      _dewExec$2 = false;
      exports$2 = {};
      _dewExec$1 = false;
      exports$1 = {};
      _dewExec = false;
      exports = dew();
      exports["Buffer"];
      exports["SlowBuffer"];
      exports["INSPECT_MAX_BYTES"];
      exports["kMaxLength"];
      Buffer2 = exports.Buffer;
      INSPECT_MAX_BYTES = exports.INSPECT_MAX_BYTES;
      kMaxLength = exports.kMaxLength;
    }
  });

  // node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js
  var init_buffer2 = __esm({
    "node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js"() {
      init_buffer();
    }
  });

  // build/lib/topic-alias-recv.js
  var require_topic_alias_recv = __commonJS({
    "build/lib/topic-alias-recv.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var TopicAliasRecv = class {
        constructor(max) {
          this.aliasToTopic = {};
          this.max = max;
        }
        put(topic, alias) {
          if (alias === 0 || alias > this.max) {
            return false;
          }
          this.aliasToTopic[alias] = topic;
          this.length = Object.keys(this.aliasToTopic).length;
          return true;
        }
        getTopicByAlias(alias) {
          return this.aliasToTopic[alias];
        }
        clear() {
          this.aliasToTopic = {};
        }
      };
      exports5.default = TopicAliasRecv;
    }
  });

  // node_modules/readable-stream/lib/ours/primordials.js
  var require_primordials = __commonJS({
    "node_modules/readable-stream/lib/ours/primordials.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      module.exports = {
        ArrayIsArray(self2) {
          return Array.isArray(self2);
        },
        ArrayPrototypeIncludes(self2, el) {
          return self2.includes(el);
        },
        ArrayPrototypeIndexOf(self2, el) {
          return self2.indexOf(el);
        },
        ArrayPrototypeJoin(self2, sep) {
          return self2.join(sep);
        },
        ArrayPrototypeMap(self2, fn) {
          return self2.map(fn);
        },
        ArrayPrototypePop(self2, el) {
          return self2.pop(el);
        },
        ArrayPrototypePush(self2, el) {
          return self2.push(el);
        },
        ArrayPrototypeSlice(self2, start, end) {
          return self2.slice(start, end);
        },
        Error,
        FunctionPrototypeCall(fn, thisArgs, ...args) {
          return fn.call(thisArgs, ...args);
        },
        FunctionPrototypeSymbolHasInstance(self2, instance) {
          return Function.prototype[Symbol.hasInstance].call(self2, instance);
        },
        MathFloor: Math.floor,
        Number,
        NumberIsInteger: Number.isInteger,
        NumberIsNaN: Number.isNaN,
        NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
        NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
        NumberParseInt: Number.parseInt,
        ObjectDefineProperties(self2, props) {
          return Object.defineProperties(self2, props);
        },
        ObjectDefineProperty(self2, name2, prop) {
          return Object.defineProperty(self2, name2, prop);
        },
        ObjectGetOwnPropertyDescriptor(self2, name2) {
          return Object.getOwnPropertyDescriptor(self2, name2);
        },
        ObjectKeys(obj) {
          return Object.keys(obj);
        },
        ObjectSetPrototypeOf(target, proto) {
          return Object.setPrototypeOf(target, proto);
        },
        Promise,
        PromisePrototypeCatch(self2, fn) {
          return self2.catch(fn);
        },
        PromisePrototypeThen(self2, thenFn, catchFn) {
          return self2.then(thenFn, catchFn);
        },
        PromiseReject(err) {
          return Promise.reject(err);
        },
        ReflectApply: Reflect.apply,
        RegExpPrototypeTest(self2, value) {
          return self2.test(value);
        },
        SafeSet: Set,
        String,
        StringPrototypeSlice(self2, start, end) {
          return self2.slice(start, end);
        },
        StringPrototypeToLowerCase(self2) {
          return self2.toLowerCase();
        },
        StringPrototypeToUpperCase(self2) {
          return self2.toUpperCase();
        },
        StringPrototypeTrim(self2) {
          return self2.trim();
        },
        Symbol,
        SymbolFor: Symbol.for,
        SymbolAsyncIterator: Symbol.asyncIterator,
        SymbolHasInstance: Symbol.hasInstance,
        SymbolIterator: Symbol.iterator,
        TypedArrayPrototypeSet(self2, buf, len) {
          return self2.set(buf, len);
        },
        Uint8Array
      };
    }
  });

  // node_modules/readable-stream/lib/ours/util.js
  var require_util = __commonJS({
    "node_modules/readable-stream/lib/ours/util.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var bufferModule = (init_buffer(), __toCommonJS(buffer_exports));
      var AsyncFunction = Object.getPrototypeOf(async function() {
      }).constructor;
      var Blob2 = globalThis.Blob || bufferModule.Blob;
      var isBlob = typeof Blob2 !== "undefined" ? function isBlob2(b3) {
        return b3 instanceof Blob2;
      } : function isBlob2(b3) {
        return false;
      };
      var AggregateError = class extends Error {
        constructor(errors) {
          if (!Array.isArray(errors)) {
            throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
          }
          let message = "";
          for (let i6 = 0; i6 < errors.length; i6++) {
            message += `    ${errors[i6].stack}
`;
          }
          super(message);
          this.name = "AggregateError";
          this.errors = errors;
        }
      };
      module.exports = {
        AggregateError,
        kEmptyObject: Object.freeze({}),
        once(callback) {
          let called = false;
          return function(...args) {
            if (called) {
              return;
            }
            called = true;
            callback.apply(this, args);
          };
        },
        createDeferredPromise: function() {
          let resolve2;
          let reject;
          const promise = new Promise((res, rej) => {
            resolve2 = res;
            reject = rej;
          });
          return {
            promise,
            resolve: resolve2,
            reject
          };
        },
        promisify(fn) {
          return new Promise((resolve2, reject) => {
            fn((err, ...args) => {
              if (err) {
                return reject(err);
              }
              return resolve2(...args);
            });
          });
        },
        debuglog() {
          return function() {
          };
        },
        format(format2, ...args) {
          return format2.replace(/%([sdifj])/g, function(...[_unused, type]) {
            const replacement = args.shift();
            if (type === "f") {
              return replacement.toFixed(6);
            } else if (type === "j") {
              return JSON.stringify(replacement);
            } else if (type === "s" && typeof replacement === "object") {
              const ctor = replacement.constructor !== Object ? replacement.constructor.name : "";
              return `${ctor} {}`.trim();
            } else {
              return replacement.toString();
            }
          });
        },
        inspect(value) {
          switch (typeof value) {
            case "string":
              if (value.includes("'")) {
                if (!value.includes('"')) {
                  return `"${value}"`;
                } else if (!value.includes("`") && !value.includes("${")) {
                  return `\`${value}\``;
                }
              }
              return `'${value}'`;
            case "number":
              if (isNaN(value)) {
                return "NaN";
              } else if (Object.is(value, -0)) {
                return String(value);
              }
              return value;
            case "bigint":
              return `${String(value)}n`;
            case "boolean":
            case "undefined":
              return String(value);
            case "object":
              return "{}";
          }
        },
        types: {
          isAsyncFunction(fn) {
            return fn instanceof AsyncFunction;
          },
          isArrayBufferView(arr) {
            return ArrayBuffer.isView(arr);
          }
        },
        isBlob
      };
      module.exports.promisify.custom = Symbol.for("nodejs.util.promisify.custom");
    }
  });

  // node_modules/abort-controller/browser.js
  var require_browser = __commonJS({
    "node_modules/abort-controller/browser.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { AbortController, AbortSignal } = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : (
        /* otherwise */
        void 0
      );
      module.exports = AbortController;
      module.exports.AbortSignal = AbortSignal;
      module.exports.default = AbortController;
    }
  });

  // node_modules/readable-stream/lib/ours/errors.js
  var require_errors = __commonJS({
    "node_modules/readable-stream/lib/ours/errors.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { format: format2, inspect, AggregateError: CustomAggregateError } = require_util();
      var AggregateError = globalThis.AggregateError || CustomAggregateError;
      var kIsNodeError = Symbol("kIsNodeError");
      var kTypes = [
        "string",
        "function",
        "number",
        "object",
        // Accept 'Function' and 'Object' as alternative to the lower cased version.
        "Function",
        "Object",
        "boolean",
        "bigint",
        "symbol"
      ];
      var classRegExp = /^([A-Z][a-z0-9]*)+$/;
      var nodeInternalPrefix = "__node_internal_";
      var codes = {};
      function assert2(value, message) {
        if (!value) {
          throw new codes.ERR_INTERNAL_ASSERTION(message);
        }
      }
      function addNumericalSeparator(val) {
        let res = "";
        let i6 = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i6 >= start + 4; i6 -= 3) {
          res = `_${val.slice(i6 - 3, i6)}${res}`;
        }
        return `${val.slice(0, i6)}${res}`;
      }
      function getMessage(key, msg, args) {
        if (typeof msg === "function") {
          assert2(
            msg.length <= args.length,
            // Default options do not count.
            `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`
          );
          return msg(...args);
        }
        const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
        assert2(
          expectedLength === args.length,
          `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`
        );
        if (args.length === 0) {
          return msg;
        }
        return format2(msg, ...args);
      }
      function E2(code, message, Base) {
        if (!Base) {
          Base = Error;
        }
        class NodeError extends Base {
          constructor(...args) {
            super(getMessage(code, message, args));
          }
          toString() {
            return `${this.name} [${code}]: ${this.message}`;
          }
        }
        Object.defineProperties(NodeError.prototype, {
          name: {
            value: Base.name,
            writable: true,
            enumerable: false,
            configurable: true
          },
          toString: {
            value() {
              return `${this.name} [${code}]: ${this.message}`;
            },
            writable: true,
            enumerable: false,
            configurable: true
          }
        });
        NodeError.prototype.code = code;
        NodeError.prototype[kIsNodeError] = true;
        codes[code] = NodeError;
      }
      function hideStackFrames(fn) {
        const hidden = nodeInternalPrefix + fn.name;
        Object.defineProperty(fn, "name", {
          value: hidden
        });
        return fn;
      }
      function aggregateTwoErrors(innerError, outerError) {
        if (innerError && outerError && innerError !== outerError) {
          if (Array.isArray(outerError.errors)) {
            outerError.errors.push(innerError);
            return outerError;
          }
          const err = new AggregateError([outerError, innerError], outerError.message);
          err.code = outerError.code;
          return err;
        }
        return innerError || outerError;
      }
      var AbortError = class extends Error {
        constructor(message = "The operation was aborted", options = void 0) {
          if (options !== void 0 && typeof options !== "object") {
            throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
          }
          super(message, options);
          this.code = "ABORT_ERR";
          this.name = "AbortError";
        }
      };
      E2("ERR_ASSERTION", "%s", Error);
      E2(
        "ERR_INVALID_ARG_TYPE",
        (name2, expected, actual) => {
          assert2(typeof name2 === "string", "'name' must be a string");
          if (!Array.isArray(expected)) {
            expected = [expected];
          }
          let msg = "The ";
          if (name2.endsWith(" argument")) {
            msg += `${name2} `;
          } else {
            msg += `"${name2}" ${name2.includes(".") ? "property" : "argument"} `;
          }
          msg += "must be ";
          const types = [];
          const instances = [];
          const other = [];
          for (const value of expected) {
            assert2(typeof value === "string", "All expected entries have to be of type string");
            if (kTypes.includes(value)) {
              types.push(value.toLowerCase());
            } else if (classRegExp.test(value)) {
              instances.push(value);
            } else {
              assert2(value !== "object", 'The value "object" should be written as "Object"');
              other.push(value);
            }
          }
          if (instances.length > 0) {
            const pos = types.indexOf("object");
            if (pos !== -1) {
              types.splice(types, pos, 1);
              instances.push("Object");
            }
          }
          if (types.length > 0) {
            switch (types.length) {
              case 1:
                msg += `of type ${types[0]}`;
                break;
              case 2:
                msg += `one of type ${types[0]} or ${types[1]}`;
                break;
              default: {
                const last = types.pop();
                msg += `one of type ${types.join(", ")}, or ${last}`;
              }
            }
            if (instances.length > 0 || other.length > 0) {
              msg += " or ";
            }
          }
          if (instances.length > 0) {
            switch (instances.length) {
              case 1:
                msg += `an instance of ${instances[0]}`;
                break;
              case 2:
                msg += `an instance of ${instances[0]} or ${instances[1]}`;
                break;
              default: {
                const last = instances.pop();
                msg += `an instance of ${instances.join(", ")}, or ${last}`;
              }
            }
            if (other.length > 0) {
              msg += " or ";
            }
          }
          switch (other.length) {
            case 0:
              break;
            case 1:
              if (other[0].toLowerCase() !== other[0]) {
                msg += "an ";
              }
              msg += `${other[0]}`;
              break;
            case 2:
              msg += `one of ${other[0]} or ${other[1]}`;
              break;
            default: {
              const last = other.pop();
              msg += `one of ${other.join(", ")}, or ${last}`;
            }
          }
          if (actual == null) {
            msg += `. Received ${actual}`;
          } else if (typeof actual === "function" && actual.name) {
            msg += `. Received function ${actual.name}`;
          } else if (typeof actual === "object") {
            var _actual$constructor;
            if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== void 0 && _actual$constructor.name) {
              msg += `. Received an instance of ${actual.constructor.name}`;
            } else {
              const inspected = inspect(actual, {
                depth: -1
              });
              msg += `. Received ${inspected}`;
            }
          } else {
            let inspected = inspect(actual, {
              colors: false
            });
            if (inspected.length > 25) {
              inspected = `${inspected.slice(0, 25)}...`;
            }
            msg += `. Received type ${typeof actual} (${inspected})`;
          }
          return msg;
        },
        TypeError
      );
      E2(
        "ERR_INVALID_ARG_VALUE",
        (name2, value, reason = "is invalid") => {
          let inspected = inspect(value);
          if (inspected.length > 128) {
            inspected = inspected.slice(0, 128) + "...";
          }
          const type = name2.includes(".") ? "property" : "argument";
          return `The ${type} '${name2}' ${reason}. Received ${inspected}`;
        },
        TypeError
      );
      E2(
        "ERR_INVALID_RETURN_VALUE",
        (input, name2, value) => {
          var _value$constructor;
          const type = value !== null && value !== void 0 && (_value$constructor = value.constructor) !== null && _value$constructor !== void 0 && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`;
          return `Expected ${input} to be returned from the "${name2}" function but got ${type}.`;
        },
        TypeError
      );
      E2(
        "ERR_MISSING_ARGS",
        (...args) => {
          assert2(args.length > 0, "At least one arg needs to be specified");
          let msg;
          const len = args.length;
          args = (Array.isArray(args) ? args : [args]).map((a6) => `"${a6}"`).join(" or ");
          switch (len) {
            case 1:
              msg += `The ${args[0]} argument`;
              break;
            case 2:
              msg += `The ${args[0]} and ${args[1]} arguments`;
              break;
            default:
              {
                const last = args.pop();
                msg += `The ${args.join(", ")}, and ${last} arguments`;
              }
              break;
          }
          return `${msg} must be specified`;
        },
        TypeError
      );
      E2(
        "ERR_OUT_OF_RANGE",
        (str, range, input) => {
          assert2(range, 'Missing "range" argument');
          let received;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > 2n ** 32n || input < -(2n ** 32n)) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          } else {
            received = inspect(input);
          }
          return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
        },
        RangeError
      );
      E2("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
      E2("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
      E2("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
      E2("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
      E2("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
      E2("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
      E2("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
      E2("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
      E2("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
      E2("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
      E2("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
      module.exports = {
        AbortError,
        aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
        hideStackFrames,
        codes
      };
    }
  });

  // node_modules/readable-stream/lib/internal/validators.js
  var require_validators = __commonJS({
    "node_modules/readable-stream/lib/internal/validators.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var {
        ArrayIsArray,
        ArrayPrototypeIncludes,
        ArrayPrototypeJoin,
        ArrayPrototypeMap,
        NumberIsInteger,
        NumberIsNaN,
        NumberMAX_SAFE_INTEGER,
        NumberMIN_SAFE_INTEGER,
        NumberParseInt,
        ObjectPrototypeHasOwnProperty,
        RegExpPrototypeExec,
        String: String2,
        StringPrototypeToUpperCase,
        StringPrototypeTrim
      } = require_primordials();
      var {
        hideStackFrames,
        codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL }
      } = require_errors();
      var { normalizeEncoding } = require_util();
      var { isAsyncFunction, isArrayBufferView } = require_util().types;
      var signals = {};
      function isInt32(value) {
        return value === (value | 0);
      }
      function isUint32(value) {
        return value === value >>> 0;
      }
      var octalReg = /^[0-7]+$/;
      var modeDesc = "must be a 32-bit unsigned integer or an octal string";
      function parseFileMode(value, name2, def) {
        if (typeof value === "undefined") {
          value = def;
        }
        if (typeof value === "string") {
          if (RegExpPrototypeExec(octalReg, value) === null) {
            throw new ERR_INVALID_ARG_VALUE(name2, value, modeDesc);
          }
          value = NumberParseInt(value, 8);
        }
        validateUint32(value, name2);
        return value;
      }
      var validateInteger = hideStackFrames((value, name2, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
        if (typeof value !== "number")
          throw new ERR_INVALID_ARG_TYPE(name2, "number", value);
        if (!NumberIsInteger(value))
          throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
        if (value < min || value > max)
          throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
      });
      var validateInt32 = hideStackFrames((value, name2, min = -2147483648, max = 2147483647) => {
        if (typeof value !== "number") {
          throw new ERR_INVALID_ARG_TYPE(name2, "number", value);
        }
        if (!NumberIsInteger(value)) {
          throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
        }
        if (value < min || value > max) {
          throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
        }
      });
      var validateUint32 = hideStackFrames((value, name2, positive = false) => {
        if (typeof value !== "number") {
          throw new ERR_INVALID_ARG_TYPE(name2, "number", value);
        }
        if (!NumberIsInteger(value)) {
          throw new ERR_OUT_OF_RANGE(name2, "an integer", value);
        }
        const min = positive ? 1 : 0;
        const max = 4294967295;
        if (value < min || value > max) {
          throw new ERR_OUT_OF_RANGE(name2, `>= ${min} && <= ${max}`, value);
        }
      });
      function validateString(value, name2) {
        if (typeof value !== "string")
          throw new ERR_INVALID_ARG_TYPE(name2, "string", value);
      }
      function validateNumber(value, name2, min = void 0, max) {
        if (typeof value !== "number")
          throw new ERR_INVALID_ARG_TYPE(name2, "number", value);
        if (min != null && value < min || max != null && value > max || (min != null || max != null) && NumberIsNaN(value)) {
          throw new ERR_OUT_OF_RANGE(
            name2,
            `${min != null ? `>= ${min}` : ""}${min != null && max != null ? " && " : ""}${max != null ? `<= ${max}` : ""}`,
            value
          );
        }
      }
      var validateOneOf = hideStackFrames((value, name2, oneOf) => {
        if (!ArrayPrototypeIncludes(oneOf, value)) {
          const allowed = ArrayPrototypeJoin(
            ArrayPrototypeMap(oneOf, (v4) => typeof v4 === "string" ? `'${v4}'` : String2(v4)),
            ", "
          );
          const reason = "must be one of: " + allowed;
          throw new ERR_INVALID_ARG_VALUE(name2, value, reason);
        }
      });
      function validateBoolean(value, name2) {
        if (typeof value !== "boolean")
          throw new ERR_INVALID_ARG_TYPE(name2, "boolean", value);
      }
      function getOwnPropertyValueOrDefault(options, key, defaultValue) {
        return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
      }
      var validateObject = hideStackFrames((value, name2, options = null) => {
        const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
        const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
        const nullable = getOwnPropertyValueOrDefault(options, "nullable", false);
        if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
          throw new ERR_INVALID_ARG_TYPE(name2, "Object", value);
        }
      });
      var validateDictionary = hideStackFrames((value, name2) => {
        if (value != null && typeof value !== "object" && typeof value !== "function") {
          throw new ERR_INVALID_ARG_TYPE(name2, "a dictionary", value);
        }
      });
      var validateArray = hideStackFrames((value, name2, minLength = 0) => {
        if (!ArrayIsArray(value)) {
          throw new ERR_INVALID_ARG_TYPE(name2, "Array", value);
        }
        if (value.length < minLength) {
          const reason = `must be longer than ${minLength}`;
          throw new ERR_INVALID_ARG_VALUE(name2, value, reason);
        }
      });
      function validateStringArray(value, name2) {
        validateArray(value, name2);
        for (let i6 = 0; i6 < value.length; i6++) {
          validateString(value[i6], `${name2}[${i6}]`);
        }
      }
      function validateBooleanArray(value, name2) {
        validateArray(value, name2);
        for (let i6 = 0; i6 < value.length; i6++) {
          validateBoolean(value[i6], `${name2}[${i6}]`);
        }
      }
      function validateSignalName(signal, name2 = "signal") {
        validateString(signal, name2);
        if (signals[signal] === void 0) {
          if (signals[StringPrototypeToUpperCase(signal)] !== void 0) {
            throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
          }
          throw new ERR_UNKNOWN_SIGNAL(signal);
        }
      }
      var validateBuffer = hideStackFrames((buffer, name2 = "buffer") => {
        if (!isArrayBufferView(buffer)) {
          throw new ERR_INVALID_ARG_TYPE(name2, ["Buffer", "TypedArray", "DataView"], buffer);
        }
      });
      function validateEncoding(data, encoding) {
        const normalizedEncoding = normalizeEncoding(encoding);
        const length = data.length;
        if (normalizedEncoding === "hex" && length % 2 !== 0) {
          throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
        }
      }
      function validatePort(port, name2 = "Port", allowZero = true) {
        if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) {
          throw new ERR_SOCKET_BAD_PORT(name2, port, allowZero);
        }
        return port | 0;
      }
      var validateAbortSignal = hideStackFrames((signal, name2) => {
        if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
          throw new ERR_INVALID_ARG_TYPE(name2, "AbortSignal", signal);
        }
      });
      var validateFunction = hideStackFrames((value, name2) => {
        if (typeof value !== "function")
          throw new ERR_INVALID_ARG_TYPE(name2, "Function", value);
      });
      var validatePlainFunction = hideStackFrames((value, name2) => {
        if (typeof value !== "function" || isAsyncFunction(value))
          throw new ERR_INVALID_ARG_TYPE(name2, "Function", value);
      });
      var validateUndefined = hideStackFrames((value, name2) => {
        if (value !== void 0)
          throw new ERR_INVALID_ARG_TYPE(name2, "undefined", value);
      });
      function validateUnion(value, name2, union) {
        if (!ArrayPrototypeIncludes(union, value)) {
          throw new ERR_INVALID_ARG_TYPE(name2, `('${ArrayPrototypeJoin(union, "|")}')`, value);
        }
      }
      var linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
      function validateLinkHeaderFormat(value, name2) {
        if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) {
          throw new ERR_INVALID_ARG_VALUE(
            name2,
            value,
            'must be an array or string of format "</styles.css>; rel=preload; as=style"'
          );
        }
      }
      function validateLinkHeaderValue(hints) {
        if (typeof hints === "string") {
          validateLinkHeaderFormat(hints, "hints");
          return hints;
        } else if (ArrayIsArray(hints)) {
          const hintsLength = hints.length;
          let result = "";
          if (hintsLength === 0) {
            return result;
          }
          for (let i6 = 0; i6 < hintsLength; i6++) {
            const link = hints[i6];
            validateLinkHeaderFormat(link, "hints");
            result += link;
            if (i6 !== hintsLength - 1) {
              result += ", ";
            }
          }
          return result;
        }
        throw new ERR_INVALID_ARG_VALUE(
          "hints",
          hints,
          'must be an array or string of format "</styles.css>; rel=preload; as=style"'
        );
      }
      module.exports = {
        isInt32,
        isUint32,
        parseFileMode,
        validateArray,
        validateStringArray,
        validateBooleanArray,
        validateBoolean,
        validateBuffer,
        validateDictionary,
        validateEncoding,
        validateFunction,
        validateInt32,
        validateInteger,
        validateNumber,
        validateObject,
        validateOneOf,
        validatePlainFunction,
        validatePort,
        validateSignalName,
        validateString,
        validateUint32,
        validateUndefined,
        validateUnion,
        validateAbortSignal,
        validateLinkHeaderValue
      };
    }
  });

  // node_modules/process/browser.js
  var require_browser2 = __commonJS({
    "node_modules/process/browser.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = module.exports = {};
      var cachedSetTimeout;
      var cachedClearTimeout;
      function defaultSetTimout() {
        throw new Error("setTimeout has not been defined");
      }
      function defaultClearTimeout() {
        throw new Error("clearTimeout has not been defined");
      }
      (function() {
        try {
          if (typeof setTimeout === "function") {
            cachedSetTimeout = setTimeout;
          } else {
            cachedSetTimeout = defaultSetTimout;
          }
        } catch (e7) {
          cachedSetTimeout = defaultSetTimout;
        }
        try {
          if (typeof clearTimeout === "function") {
            cachedClearTimeout = clearTimeout;
          } else {
            cachedClearTimeout = defaultClearTimeout;
          }
        } catch (e7) {
          cachedClearTimeout = defaultClearTimeout;
        }
      })();
      function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
          return setTimeout(fun, 0);
        }
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
        }
        try {
          return cachedSetTimeout(fun, 0);
        } catch (e7) {
          try {
            return cachedSetTimeout.call(null, fun, 0);
          } catch (e8) {
            return cachedSetTimeout.call(this, fun, 0);
          }
        }
      }
      function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
          return clearTimeout(marker);
        }
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
        }
        try {
          return cachedClearTimeout(marker);
        } catch (e7) {
          try {
            return cachedClearTimeout.call(null, marker);
          } catch (e8) {
            return cachedClearTimeout.call(this, marker);
          }
        }
      }
      var queue2 = [];
      var draining2 = false;
      var currentQueue2;
      var queueIndex2 = -1;
      function cleanUpNextTick2() {
        if (!draining2 || !currentQueue2) {
          return;
        }
        draining2 = false;
        if (currentQueue2.length) {
          queue2 = currentQueue2.concat(queue2);
        } else {
          queueIndex2 = -1;
        }
        if (queue2.length) {
          drainQueue2();
        }
      }
      function drainQueue2() {
        if (draining2) {
          return;
        }
        var timeout = runTimeout(cleanUpNextTick2);
        draining2 = true;
        var len = queue2.length;
        while (len) {
          currentQueue2 = queue2;
          queue2 = [];
          while (++queueIndex2 < len) {
            if (currentQueue2) {
              currentQueue2[queueIndex2].run();
            }
          }
          queueIndex2 = -1;
          len = queue2.length;
        }
        currentQueue2 = null;
        draining2 = false;
        runClearTimeout(timeout);
      }
      process3.nextTick = function(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i6 = 1; i6 < arguments.length; i6++) {
            args[i6 - 1] = arguments[i6];
          }
        }
        queue2.push(new Item2(fun, args));
        if (queue2.length === 1 && !draining2) {
          runTimeout(drainQueue2);
        }
      };
      function Item2(fun, array) {
        this.fun = fun;
        this.array = array;
      }
      Item2.prototype.run = function() {
        this.fun.apply(null, this.array);
      };
      process3.title = "browser";
      process3.browser = true;
      process3.env = {};
      process3.argv = [];
      process3.version = "";
      process3.versions = {};
      function noop2() {
      }
      process3.on = noop2;
      process3.addListener = noop2;
      process3.once = noop2;
      process3.off = noop2;
      process3.removeListener = noop2;
      process3.removeAllListeners = noop2;
      process3.emit = noop2;
      process3.prependListener = noop2;
      process3.prependOnceListener = noop2;
      process3.listeners = function(name2) {
        return [];
      };
      process3.binding = function(name2) {
        throw new Error("process.binding is not supported");
      };
      process3.cwd = function() {
        return "/";
      };
      process3.chdir = function(dir) {
        throw new Error("process.chdir is not supported");
      };
      process3.umask = function() {
        return 0;
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/utils.js
  var require_utils = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/utils.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { Symbol: Symbol2, SymbolAsyncIterator, SymbolIterator, SymbolFor } = require_primordials();
      var kDestroyed = Symbol2("kDestroyed");
      var kIsErrored = Symbol2("kIsErrored");
      var kIsReadable = Symbol2("kIsReadable");
      var kIsDisturbed = Symbol2("kIsDisturbed");
      var kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
      var kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
      function isReadableNodeStream(obj, strict = false) {
        var _obj$_readableState;
        return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === void 0 ? void 0 : _obj$_readableState.readable) !== false) && // Duplex
        (!obj._writableState || obj._readableState));
      }
      function isWritableNodeStream(obj) {
        var _obj$_writableState;
        return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === void 0 ? void 0 : _obj$_writableState.writable) !== false));
      }
      function isDuplexNodeStream(obj) {
        return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
      }
      function isNodeStream(obj) {
        return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
      }
      function isReadableStream(obj) {
        return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
      }
      function isWritableStream(obj) {
        return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
      }
      function isTransformStream(obj) {
        return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
      }
      function isWebStream(obj) {
        return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
      }
      function isIterable(obj, isAsync) {
        if (obj == null)
          return false;
        if (isAsync === true)
          return typeof obj[SymbolAsyncIterator] === "function";
        if (isAsync === false)
          return typeof obj[SymbolIterator] === "function";
        return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
      }
      function isDestroyed(stream) {
        if (!isNodeStream(stream))
          return null;
        const wState = stream._writableState;
        const rState = stream._readableState;
        const state = wState || rState;
        return !!(stream.destroyed || stream[kDestroyed] || state !== null && state !== void 0 && state.destroyed);
      }
      function isWritableEnded(stream) {
        if (!isWritableNodeStream(stream))
          return null;
        if (stream.writableEnded === true)
          return true;
        const wState = stream._writableState;
        if (wState !== null && wState !== void 0 && wState.errored)
          return false;
        if (typeof (wState === null || wState === void 0 ? void 0 : wState.ended) !== "boolean")
          return null;
        return wState.ended;
      }
      function isWritableFinished(stream, strict) {
        if (!isWritableNodeStream(stream))
          return null;
        if (stream.writableFinished === true)
          return true;
        const wState = stream._writableState;
        if (wState !== null && wState !== void 0 && wState.errored)
          return false;
        if (typeof (wState === null || wState === void 0 ? void 0 : wState.finished) !== "boolean")
          return null;
        return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
      }
      function isReadableEnded(stream) {
        if (!isReadableNodeStream(stream))
          return null;
        if (stream.readableEnded === true)
          return true;
        const rState = stream._readableState;
        if (!rState || rState.errored)
          return false;
        if (typeof (rState === null || rState === void 0 ? void 0 : rState.ended) !== "boolean")
          return null;
        return rState.ended;
      }
      function isReadableFinished(stream, strict) {
        if (!isReadableNodeStream(stream))
          return null;
        const rState = stream._readableState;
        if (rState !== null && rState !== void 0 && rState.errored)
          return false;
        if (typeof (rState === null || rState === void 0 ? void 0 : rState.endEmitted) !== "boolean")
          return null;
        return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
      }
      function isReadable(stream) {
        if (stream && stream[kIsReadable] != null)
          return stream[kIsReadable];
        if (typeof (stream === null || stream === void 0 ? void 0 : stream.readable) !== "boolean")
          return null;
        if (isDestroyed(stream))
          return false;
        return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream);
      }
      function isWritable(stream) {
        if (typeof (stream === null || stream === void 0 ? void 0 : stream.writable) !== "boolean")
          return null;
        if (isDestroyed(stream))
          return false;
        return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream);
      }
      function isFinished(stream, opts) {
        if (!isNodeStream(stream)) {
          return null;
        }
        if (isDestroyed(stream)) {
          return true;
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.readable) !== false && isReadable(stream)) {
          return false;
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.writable) !== false && isWritable(stream)) {
          return false;
        }
        return true;
      }
      function isWritableErrored(stream) {
        var _stream$_writableStat, _stream$_writableStat2;
        if (!isNodeStream(stream)) {
          return null;
        }
        if (stream.writableErrored) {
          return stream.writableErrored;
        }
        return (_stream$_writableStat = (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === void 0 ? void 0 : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== void 0 ? _stream$_writableStat : null;
      }
      function isReadableErrored(stream) {
        var _stream$_readableStat, _stream$_readableStat2;
        if (!isNodeStream(stream)) {
          return null;
        }
        if (stream.readableErrored) {
          return stream.readableErrored;
        }
        return (_stream$_readableStat = (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === void 0 ? void 0 : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== void 0 ? _stream$_readableStat : null;
      }
      function isClosed(stream) {
        if (!isNodeStream(stream)) {
          return null;
        }
        if (typeof stream.closed === "boolean") {
          return stream.closed;
        }
        const wState = stream._writableState;
        const rState = stream._readableState;
        if (typeof (wState === null || wState === void 0 ? void 0 : wState.closed) === "boolean" || typeof (rState === null || rState === void 0 ? void 0 : rState.closed) === "boolean") {
          return (wState === null || wState === void 0 ? void 0 : wState.closed) || (rState === null || rState === void 0 ? void 0 : rState.closed);
        }
        if (typeof stream._closed === "boolean" && isOutgoingMessage(stream)) {
          return stream._closed;
        }
        return null;
      }
      function isOutgoingMessage(stream) {
        return typeof stream._closed === "boolean" && typeof stream._defaultKeepAlive === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean";
      }
      function isServerResponse(stream) {
        return typeof stream._sent100 === "boolean" && isOutgoingMessage(stream);
      }
      function isServerRequest(stream) {
        var _stream$req;
        return typeof stream._consuming === "boolean" && typeof stream._dumped === "boolean" && ((_stream$req = stream.req) === null || _stream$req === void 0 ? void 0 : _stream$req.upgradeOrConnect) === void 0;
      }
      function willEmitClose(stream) {
        if (!isNodeStream(stream))
          return null;
        const wState = stream._writableState;
        const rState = stream._readableState;
        const state = wState || rState;
        return !state && isServerResponse(stream) || !!(state && state.autoDestroy && state.emitClose && state.closed === false);
      }
      function isDisturbed(stream) {
        var _stream$kIsDisturbed;
        return !!(stream && ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== void 0 ? _stream$kIsDisturbed : stream.readableDidRead || stream.readableAborted));
      }
      function isErrored(stream) {
        var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
        return !!(stream && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== void 0 ? _stream$kIsErrored : stream.readableErrored) !== null && _ref5 !== void 0 ? _ref5 : stream.writableErrored) !== null && _ref4 !== void 0 ? _ref4 : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === void 0 ? void 0 : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== void 0 ? _ref3 : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === void 0 ? void 0 : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== void 0 ? _ref2 : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === void 0 ? void 0 : _stream$_readableStat4.errored) !== null && _ref !== void 0 ? _ref : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === void 0 ? void 0 : _stream$_writableStat4.errored));
      }
      module.exports = {
        kDestroyed,
        isDisturbed,
        kIsDisturbed,
        isErrored,
        kIsErrored,
        isReadable,
        kIsReadable,
        kIsClosedPromise,
        kControllerErrorFunction,
        isClosed,
        isDestroyed,
        isDuplexNodeStream,
        isFinished,
        isIterable,
        isReadableNodeStream,
        isReadableStream,
        isReadableEnded,
        isReadableFinished,
        isReadableErrored,
        isNodeStream,
        isWebStream,
        isWritable,
        isWritableNodeStream,
        isWritableStream,
        isWritableEnded,
        isWritableFinished,
        isWritableErrored,
        isServerRequest,
        isServerResponse,
        willEmitClose,
        isTransformStream
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/end-of-stream.js
  var require_end_of_stream = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/end-of-stream.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var { AbortError, codes } = require_errors();
      var { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes;
      var { kEmptyObject, once: once3 } = require_util();
      var { validateAbortSignal, validateFunction, validateObject, validateBoolean } = require_validators();
      var { Promise: Promise2, PromisePrototypeThen } = require_primordials();
      var {
        isClosed,
        isReadable,
        isReadableNodeStream,
        isReadableStream,
        isReadableFinished,
        isReadableErrored,
        isWritable,
        isWritableNodeStream,
        isWritableStream,
        isWritableFinished,
        isWritableErrored,
        isNodeStream,
        willEmitClose: _willEmitClose,
        kIsClosedPromise
      } = require_utils();
      function isRequest(stream) {
        return stream.setHeader && typeof stream.abort === "function";
      }
      var nop = () => {
      };
      function eos(stream, options, callback) {
        var _options$readable, _options$writable;
        if (arguments.length === 2) {
          callback = options;
          options = kEmptyObject;
        } else if (options == null) {
          options = kEmptyObject;
        } else {
          validateObject(options, "options");
        }
        validateFunction(callback, "callback");
        validateAbortSignal(options.signal, "options.signal");
        callback = once3(callback);
        if (isReadableStream(stream) || isWritableStream(stream)) {
          return eosWeb(stream, options, callback);
        }
        if (!isNodeStream(stream)) {
          throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
        }
        const readable = (_options$readable = options.readable) !== null && _options$readable !== void 0 ? _options$readable : isReadableNodeStream(stream);
        const writable = (_options$writable = options.writable) !== null && _options$writable !== void 0 ? _options$writable : isWritableNodeStream(stream);
        const wState = stream._writableState;
        const rState = stream._readableState;
        const onlegacyfinish = () => {
          if (!stream.writable) {
            onfinish();
          }
        };
        let willEmitClose = _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
        let writableFinished = isWritableFinished(stream, false);
        const onfinish = () => {
          writableFinished = true;
          if (stream.destroyed) {
            willEmitClose = false;
          }
          if (willEmitClose && (!stream.readable || readable)) {
            return;
          }
          if (!readable || readableFinished) {
            callback.call(stream);
          }
        };
        let readableFinished = isReadableFinished(stream, false);
        const onend = () => {
          readableFinished = true;
          if (stream.destroyed) {
            willEmitClose = false;
          }
          if (willEmitClose && (!stream.writable || writable)) {
            return;
          }
          if (!writable || writableFinished) {
            callback.call(stream);
          }
        };
        const onerror = (err) => {
          callback.call(stream, err);
        };
        let closed = isClosed(stream);
        const onclose = () => {
          closed = true;
          const errored = isWritableErrored(stream) || isReadableErrored(stream);
          if (errored && typeof errored !== "boolean") {
            return callback.call(stream, errored);
          }
          if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
            if (!isReadableFinished(stream, false))
              return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
          }
          if (writable && !writableFinished) {
            if (!isWritableFinished(stream, false))
              return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
          }
          callback.call(stream);
        };
        const onclosed = () => {
          closed = true;
          const errored = isWritableErrored(stream) || isReadableErrored(stream);
          if (errored && typeof errored !== "boolean") {
            return callback.call(stream, errored);
          }
          callback.call(stream);
        };
        const onrequest = () => {
          stream.req.on("finish", onfinish);
        };
        if (isRequest(stream)) {
          stream.on("complete", onfinish);
          if (!willEmitClose) {
            stream.on("abort", onclose);
          }
          if (stream.req) {
            onrequest();
          } else {
            stream.on("request", onrequest);
          }
        } else if (writable && !wState) {
          stream.on("end", onlegacyfinish);
          stream.on("close", onlegacyfinish);
        }
        if (!willEmitClose && typeof stream.aborted === "boolean") {
          stream.on("aborted", onclose);
        }
        stream.on("end", onend);
        stream.on("finish", onfinish);
        if (options.error !== false) {
          stream.on("error", onerror);
        }
        stream.on("close", onclose);
        if (closed) {
          process3.nextTick(onclose);
        } else if (wState !== null && wState !== void 0 && wState.errorEmitted || rState !== null && rState !== void 0 && rState.errorEmitted) {
          if (!willEmitClose) {
            process3.nextTick(onclosed);
          }
        } else if (!readable && (!willEmitClose || isReadable(stream)) && (writableFinished || isWritable(stream) === false)) {
          process3.nextTick(onclosed);
        } else if (!writable && (!willEmitClose || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) {
          process3.nextTick(onclosed);
        } else if (rState && stream.req && stream.aborted) {
          process3.nextTick(onclosed);
        }
        const cleanup = () => {
          callback = nop;
          stream.removeListener("aborted", onclose);
          stream.removeListener("complete", onfinish);
          stream.removeListener("abort", onclose);
          stream.removeListener("request", onrequest);
          if (stream.req)
            stream.req.removeListener("finish", onfinish);
          stream.removeListener("end", onlegacyfinish);
          stream.removeListener("close", onlegacyfinish);
          stream.removeListener("finish", onfinish);
          stream.removeListener("end", onend);
          stream.removeListener("error", onerror);
          stream.removeListener("close", onclose);
        };
        if (options.signal && !closed) {
          const abort2 = () => {
            const endCallback = callback;
            cleanup();
            endCallback.call(
              stream,
              new AbortError(void 0, {
                cause: options.signal.reason
              })
            );
          };
          if (options.signal.aborted) {
            process3.nextTick(abort2);
          } else {
            const originalCallback = callback;
            callback = once3((...args) => {
              options.signal.removeEventListener("abort", abort2);
              originalCallback.apply(stream, args);
            });
            options.signal.addEventListener("abort", abort2);
          }
        }
        return cleanup;
      }
      function eosWeb(stream, options, callback) {
        let isAborted = false;
        let abort2 = nop;
        if (options.signal) {
          abort2 = () => {
            isAborted = true;
            callback.call(
              stream,
              new AbortError(void 0, {
                cause: options.signal.reason
              })
            );
          };
          if (options.signal.aborted) {
            process3.nextTick(abort2);
          } else {
            const originalCallback = callback;
            callback = once3((...args) => {
              options.signal.removeEventListener("abort", abort2);
              originalCallback.apply(stream, args);
            });
            options.signal.addEventListener("abort", abort2);
          }
        }
        const resolverFn = (...args) => {
          if (!isAborted) {
            process3.nextTick(() => callback.apply(stream, args));
          }
        };
        PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn);
        return nop;
      }
      function finished(stream, opts) {
        var _opts;
        let autoCleanup = false;
        if (opts === null) {
          opts = kEmptyObject;
        }
        if ((_opts = opts) !== null && _opts !== void 0 && _opts.cleanup) {
          validateBoolean(opts.cleanup, "cleanup");
          autoCleanup = opts.cleanup;
        }
        return new Promise2((resolve2, reject) => {
          const cleanup = eos(stream, opts, (err) => {
            if (autoCleanup) {
              cleanup();
            }
            if (err) {
              reject(err);
            } else {
              resolve2();
            }
          });
        });
      }
      module.exports = eos;
      module.exports.finished = finished;
    }
  });

  // node_modules/readable-stream/lib/internal/streams/destroy.js
  var require_destroy = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/destroy.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var {
        aggregateTwoErrors,
        codes: { ERR_MULTIPLE_CALLBACK },
        AbortError
      } = require_errors();
      var { Symbol: Symbol2 } = require_primordials();
      var { kDestroyed, isDestroyed, isFinished, isServerRequest } = require_utils();
      var kDestroy = Symbol2("kDestroy");
      var kConstruct = Symbol2("kConstruct");
      function checkError(err, w2, r7) {
        if (err) {
          err.stack;
          if (w2 && !w2.errored) {
            w2.errored = err;
          }
          if (r7 && !r7.errored) {
            r7.errored = err;
          }
        }
      }
      function destroy(err, cb) {
        const r7 = this._readableState;
        const w2 = this._writableState;
        const s5 = w2 || r7;
        if (w2 !== null && w2 !== void 0 && w2.destroyed || r7 !== null && r7 !== void 0 && r7.destroyed) {
          if (typeof cb === "function") {
            cb();
          }
          return this;
        }
        checkError(err, w2, r7);
        if (w2) {
          w2.destroyed = true;
        }
        if (r7) {
          r7.destroyed = true;
        }
        if (!s5.constructed) {
          this.once(kDestroy, function(er) {
            _destroy(this, aggregateTwoErrors(er, err), cb);
          });
        } else {
          _destroy(this, err, cb);
        }
        return this;
      }
      function _destroy(self2, err, cb) {
        let called = false;
        function onDestroy(err2) {
          if (called) {
            return;
          }
          called = true;
          const r7 = self2._readableState;
          const w2 = self2._writableState;
          checkError(err2, w2, r7);
          if (w2) {
            w2.closed = true;
          }
          if (r7) {
            r7.closed = true;
          }
          if (typeof cb === "function") {
            cb(err2);
          }
          if (err2) {
            process3.nextTick(emitErrorCloseNT, self2, err2);
          } else {
            process3.nextTick(emitCloseNT, self2);
          }
        }
        try {
          self2._destroy(err || null, onDestroy);
        } catch (err2) {
          onDestroy(err2);
        }
      }
      function emitErrorCloseNT(self2, err) {
        emitErrorNT(self2, err);
        emitCloseNT(self2);
      }
      function emitCloseNT(self2) {
        const r7 = self2._readableState;
        const w2 = self2._writableState;
        if (w2) {
          w2.closeEmitted = true;
        }
        if (r7) {
          r7.closeEmitted = true;
        }
        if (w2 !== null && w2 !== void 0 && w2.emitClose || r7 !== null && r7 !== void 0 && r7.emitClose) {
          self2.emit("close");
        }
      }
      function emitErrorNT(self2, err) {
        const r7 = self2._readableState;
        const w2 = self2._writableState;
        if (w2 !== null && w2 !== void 0 && w2.errorEmitted || r7 !== null && r7 !== void 0 && r7.errorEmitted) {
          return;
        }
        if (w2) {
          w2.errorEmitted = true;
        }
        if (r7) {
          r7.errorEmitted = true;
        }
        self2.emit("error", err);
      }
      function undestroy() {
        const r7 = this._readableState;
        const w2 = this._writableState;
        if (r7) {
          r7.constructed = true;
          r7.closed = false;
          r7.closeEmitted = false;
          r7.destroyed = false;
          r7.errored = null;
          r7.errorEmitted = false;
          r7.reading = false;
          r7.ended = r7.readable === false;
          r7.endEmitted = r7.readable === false;
        }
        if (w2) {
          w2.constructed = true;
          w2.destroyed = false;
          w2.closed = false;
          w2.closeEmitted = false;
          w2.errored = null;
          w2.errorEmitted = false;
          w2.finalCalled = false;
          w2.prefinished = false;
          w2.ended = w2.writable === false;
          w2.ending = w2.writable === false;
          w2.finished = w2.writable === false;
        }
      }
      function errorOrDestroy(stream, err, sync) {
        const r7 = stream._readableState;
        const w2 = stream._writableState;
        if (w2 !== null && w2 !== void 0 && w2.destroyed || r7 !== null && r7 !== void 0 && r7.destroyed) {
          return this;
        }
        if (r7 !== null && r7 !== void 0 && r7.autoDestroy || w2 !== null && w2 !== void 0 && w2.autoDestroy)
          stream.destroy(err);
        else if (err) {
          err.stack;
          if (w2 && !w2.errored) {
            w2.errored = err;
          }
          if (r7 && !r7.errored) {
            r7.errored = err;
          }
          if (sync) {
            process3.nextTick(emitErrorNT, stream, err);
          } else {
            emitErrorNT(stream, err);
          }
        }
      }
      function construct(stream, cb) {
        if (typeof stream._construct !== "function") {
          return;
        }
        const r7 = stream._readableState;
        const w2 = stream._writableState;
        if (r7) {
          r7.constructed = false;
        }
        if (w2) {
          w2.constructed = false;
        }
        stream.once(kConstruct, cb);
        if (stream.listenerCount(kConstruct) > 1) {
          return;
        }
        process3.nextTick(constructNT, stream);
      }
      function constructNT(stream) {
        let called = false;
        function onConstruct(err) {
          if (called) {
            errorOrDestroy(stream, err !== null && err !== void 0 ? err : new ERR_MULTIPLE_CALLBACK());
            return;
          }
          called = true;
          const r7 = stream._readableState;
          const w2 = stream._writableState;
          const s5 = w2 || r7;
          if (r7) {
            r7.constructed = true;
          }
          if (w2) {
            w2.constructed = true;
          }
          if (s5.destroyed) {
            stream.emit(kDestroy, err);
          } else if (err) {
            errorOrDestroy(stream, err, true);
          } else {
            process3.nextTick(emitConstructNT, stream);
          }
        }
        try {
          stream._construct((err) => {
            process3.nextTick(onConstruct, err);
          });
        } catch (err) {
          process3.nextTick(onConstruct, err);
        }
      }
      function emitConstructNT(stream) {
        stream.emit(kConstruct);
      }
      function isRequest(stream) {
        return (stream === null || stream === void 0 ? void 0 : stream.setHeader) && typeof stream.abort === "function";
      }
      function emitCloseLegacy(stream) {
        stream.emit("close");
      }
      function emitErrorCloseLegacy(stream, err) {
        stream.emit("error", err);
        process3.nextTick(emitCloseLegacy, stream);
      }
      function destroyer(stream, err) {
        if (!stream || isDestroyed(stream)) {
          return;
        }
        if (!err && !isFinished(stream)) {
          err = new AbortError();
        }
        if (isServerRequest(stream)) {
          stream.socket = null;
          stream.destroy(err);
        } else if (isRequest(stream)) {
          stream.abort();
        } else if (isRequest(stream.req)) {
          stream.req.abort();
        } else if (typeof stream.destroy === "function") {
          stream.destroy(err);
        } else if (typeof stream.close === "function") {
          stream.close();
        } else if (err) {
          process3.nextTick(emitErrorCloseLegacy, stream, err);
        } else {
          process3.nextTick(emitCloseLegacy, stream);
        }
        if (!stream.destroyed) {
          stream[kDestroyed] = true;
        }
      }
      module.exports = {
        construct,
        destroyer,
        destroy,
        undestroy,
        errorOrDestroy
      };
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-4bd36a8f.js
  function o() {
    o.init.call(this);
  }
  function u(e7) {
    if ("function" != typeof e7)
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof e7);
  }
  function f(e7) {
    return void 0 === e7._maxListeners ? o.defaultMaxListeners : e7._maxListeners;
  }
  function v(e7, t6, n7, r7) {
    var i6, o7, s5, v4;
    if (u(n7), void 0 === (o7 = e7._events) ? (o7 = e7._events = /* @__PURE__ */ Object.create(null), e7._eventsCount = 0) : (void 0 !== o7.newListener && (e7.emit("newListener", t6, n7.listener ? n7.listener : n7), o7 = e7._events), s5 = o7[t6]), void 0 === s5)
      s5 = o7[t6] = n7, ++e7._eventsCount;
    else if ("function" == typeof s5 ? s5 = o7[t6] = r7 ? [n7, s5] : [s5, n7] : r7 ? s5.unshift(n7) : s5.push(n7), (i6 = f(e7)) > 0 && s5.length > i6 && !s5.warned) {
      s5.warned = true;
      var a6 = new Error("Possible EventEmitter memory leak detected. " + s5.length + " " + String(t6) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      a6.name = "MaxListenersExceededWarning", a6.emitter = e7, a6.type = t6, a6.count = s5.length, v4 = a6, console && console.warn && console.warn(v4);
    }
    return e7;
  }
  function a() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = true, 0 === arguments.length ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function l(e7, t6, n7) {
    var r7 = { fired: false, wrapFn: void 0, target: e7, type: t6, listener: n7 }, i6 = a.bind(r7);
    return i6.listener = n7, r7.wrapFn = i6, i6;
  }
  function h(e7, t6, n7) {
    var r7 = e7._events;
    if (void 0 === r7)
      return [];
    var i6 = r7[t6];
    return void 0 === i6 ? [] : "function" == typeof i6 ? n7 ? [i6.listener || i6] : [i6] : n7 ? function(e8) {
      for (var t7 = new Array(e8.length), n8 = 0; n8 < t7.length; ++n8)
        t7[n8] = e8[n8].listener || e8[n8];
      return t7;
    }(i6) : c(i6, i6.length);
  }
  function p(e7) {
    var t6 = this._events;
    if (void 0 !== t6) {
      var n7 = t6[e7];
      if ("function" == typeof n7)
        return 1;
      if (void 0 !== n7)
        return n7.length;
    }
    return 0;
  }
  function c(e7, t6) {
    for (var n7 = new Array(t6), r7 = 0; r7 < t6; ++r7)
      n7[r7] = e7[r7];
    return n7;
  }
  var e, t, n, r, i, s, y;
  var init_chunk_4bd36a8f = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-4bd36a8f.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      n = "object" == typeof Reflect ? Reflect : null;
      r = n && "function" == typeof n.apply ? n.apply : function(e7, t6, n7) {
        return Function.prototype.apply.call(e7, t6, n7);
      };
      t = n && "function" == typeof n.ownKeys ? n.ownKeys : Object.getOwnPropertySymbols ? function(e7) {
        return Object.getOwnPropertyNames(e7).concat(Object.getOwnPropertySymbols(e7));
      } : function(e7) {
        return Object.getOwnPropertyNames(e7);
      };
      i = Number.isNaN || function(e7) {
        return e7 != e7;
      };
      e = o, o.EventEmitter = o, o.prototype._events = void 0, o.prototype._eventsCount = 0, o.prototype._maxListeners = void 0;
      s = 10;
      Object.defineProperty(o, "defaultMaxListeners", { enumerable: true, get: function() {
        return s;
      }, set: function(e7) {
        if ("number" != typeof e7 || e7 < 0 || i(e7))
          throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + e7 + ".");
        s = e7;
      } }), o.init = function() {
        void 0 !== this._events && this._events !== Object.getPrototypeOf(this)._events || (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
      }, o.prototype.setMaxListeners = function(e7) {
        if ("number" != typeof e7 || e7 < 0 || i(e7))
          throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e7 + ".");
        return this._maxListeners = e7, this;
      }, o.prototype.getMaxListeners = function() {
        return f(this);
      }, o.prototype.emit = function(e7) {
        for (var t6 = [], n7 = 1; n7 < arguments.length; n7++)
          t6.push(arguments[n7]);
        var i6 = "error" === e7, o7 = this._events;
        if (void 0 !== o7)
          i6 = i6 && void 0 === o7.error;
        else if (!i6)
          return false;
        if (i6) {
          var s5;
          if (t6.length > 0 && (s5 = t6[0]), s5 instanceof Error)
            throw s5;
          var u6 = new Error("Unhandled error." + (s5 ? " (" + s5.message + ")" : ""));
          throw u6.context = s5, u6;
        }
        var f6 = o7[e7];
        if (void 0 === f6)
          return false;
        if ("function" == typeof f6)
          r(f6, this, t6);
        else {
          var v4 = f6.length, a6 = c(f6, v4);
          for (n7 = 0; n7 < v4; ++n7)
            r(a6[n7], this, t6);
        }
        return true;
      }, o.prototype.addListener = function(e7, t6) {
        return v(this, e7, t6, false);
      }, o.prototype.on = o.prototype.addListener, o.prototype.prependListener = function(e7, t6) {
        return v(this, e7, t6, true);
      }, o.prototype.once = function(e7, t6) {
        return u(t6), this.on(e7, l(this, e7, t6)), this;
      }, o.prototype.prependOnceListener = function(e7, t6) {
        return u(t6), this.prependListener(e7, l(this, e7, t6)), this;
      }, o.prototype.removeListener = function(e7, t6) {
        var n7, r7, i6, o7, s5;
        if (u(t6), void 0 === (r7 = this._events))
          return this;
        if (void 0 === (n7 = r7[e7]))
          return this;
        if (n7 === t6 || n7.listener === t6)
          0 == --this._eventsCount ? this._events = /* @__PURE__ */ Object.create(null) : (delete r7[e7], r7.removeListener && this.emit("removeListener", e7, n7.listener || t6));
        else if ("function" != typeof n7) {
          for (i6 = -1, o7 = n7.length - 1; o7 >= 0; o7--)
            if (n7[o7] === t6 || n7[o7].listener === t6) {
              s5 = n7[o7].listener, i6 = o7;
              break;
            }
          if (i6 < 0)
            return this;
          0 === i6 ? n7.shift() : !function(e8, t7) {
            for (; t7 + 1 < e8.length; t7++)
              e8[t7] = e8[t7 + 1];
            e8.pop();
          }(n7, i6), 1 === n7.length && (r7[e7] = n7[0]), void 0 !== r7.removeListener && this.emit("removeListener", e7, s5 || t6);
        }
        return this;
      }, o.prototype.off = o.prototype.removeListener, o.prototype.removeAllListeners = function(e7) {
        var t6, n7, r7;
        if (void 0 === (n7 = this._events))
          return this;
        if (void 0 === n7.removeListener)
          return 0 === arguments.length ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : void 0 !== n7[e7] && (0 == --this._eventsCount ? this._events = /* @__PURE__ */ Object.create(null) : delete n7[e7]), this;
        if (0 === arguments.length) {
          var i6, o7 = Object.keys(n7);
          for (r7 = 0; r7 < o7.length; ++r7)
            "removeListener" !== (i6 = o7[r7]) && this.removeAllListeners(i6);
          return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
        }
        if ("function" == typeof (t6 = n7[e7]))
          this.removeListener(e7, t6);
        else if (void 0 !== t6)
          for (r7 = t6.length - 1; r7 >= 0; r7--)
            this.removeListener(e7, t6[r7]);
        return this;
      }, o.prototype.listeners = function(e7) {
        return h(this, e7, true);
      }, o.prototype.rawListeners = function(e7) {
        return h(this, e7, false);
      }, o.listenerCount = function(e7, t6) {
        return "function" == typeof e7.listenerCount ? e7.listenerCount(t6) : p.call(e7, t6);
      }, o.prototype.listenerCount = p, o.prototype.eventNames = function() {
        return this._eventsCount > 0 ? t(this._events) : [];
      };
      y = e;
      y.EventEmitter;
      y.defaultMaxListeners;
      y.init;
      y.listenerCount;
      y.EventEmitter;
      y.defaultMaxListeners;
      y.init;
      y.listenerCount;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/events.js
  var events_exports = {};
  __export(events_exports, {
    EventEmitter: () => EventEmitter,
    default: () => y,
    defaultMaxListeners: () => defaultMaxListeners,
    init: () => init,
    listenerCount: () => listenerCount,
    on: () => on2,
    once: () => once2
  });
  var EventEmitter, defaultMaxListeners, init, listenerCount, on2, once2;
  var init_events = __esm({
    "node_modules/@jspm/core/nodelibs/browser/events.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      init_chunk_4bd36a8f();
      init_chunk_4bd36a8f();
      y.once = function(emitter, event) {
        return new Promise((resolve2, reject) => {
          function eventListener(...args) {
            if (errorListener !== void 0) {
              emitter.removeListener("error", errorListener);
            }
            resolve2(args);
          }
          let errorListener;
          if (event !== "error") {
            errorListener = (err) => {
              emitter.removeListener(name, eventListener);
              reject(err);
            };
            emitter.once("error", errorListener);
          }
          emitter.once(event, eventListener);
        });
      };
      y.on = function(emitter, event) {
        const unconsumedEventValues = [];
        const unconsumedPromises = [];
        let error = null;
        let finished = false;
        const iterator = {
          async next() {
            const value = unconsumedEventValues.shift();
            if (value) {
              return createIterResult(value, false);
            }
            if (error) {
              const p6 = Promise.reject(error);
              error = null;
              return p6;
            }
            if (finished) {
              return createIterResult(void 0, true);
            }
            return new Promise((resolve2, reject) => unconsumedPromises.push({ resolve: resolve2, reject }));
          },
          async return() {
            emitter.removeListener(event, eventHandler);
            emitter.removeListener("error", errorHandler);
            finished = true;
            for (const promise of unconsumedPromises) {
              promise.resolve(createIterResult(void 0, true));
            }
            return createIterResult(void 0, true);
          },
          throw(err) {
            error = err;
            emitter.removeListener(event, eventHandler);
            emitter.removeListener("error", errorHandler);
          },
          [Symbol.asyncIterator]() {
            return this;
          }
        };
        emitter.on(event, eventHandler);
        emitter.on("error", errorHandler);
        return iterator;
        function eventHandler(...args) {
          const promise = unconsumedPromises.shift();
          if (promise) {
            promise.resolve(createIterResult(args, false));
          } else {
            unconsumedEventValues.push(args);
          }
        }
        function errorHandler(err) {
          finished = true;
          const toError = unconsumedPromises.shift();
          if (toError) {
            toError.reject(err);
          } else {
            error = err;
          }
          iterator.return();
        }
      };
      ({
        EventEmitter,
        defaultMaxListeners,
        init,
        listenerCount,
        on: on2,
        once: once2
      } = y);
    }
  });

  // node_modules/readable-stream/lib/internal/streams/legacy.js
  var require_legacy = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/legacy.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { ArrayIsArray, ObjectSetPrototypeOf } = require_primordials();
      var { EventEmitter: EE } = (init_events(), __toCommonJS(events_exports));
      function Stream(opts) {
        EE.call(this, opts);
      }
      ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
      ObjectSetPrototypeOf(Stream, EE);
      Stream.prototype.pipe = function(dest, options) {
        const source = this;
        function ondata(chunk) {
          if (dest.writable && dest.write(chunk) === false && source.pause) {
            source.pause();
          }
        }
        source.on("data", ondata);
        function ondrain() {
          if (source.readable && source.resume) {
            source.resume();
          }
        }
        dest.on("drain", ondrain);
        if (!dest._isStdio && (!options || options.end !== false)) {
          source.on("end", onend);
          source.on("close", onclose);
        }
        let didOnEnd = false;
        function onend() {
          if (didOnEnd)
            return;
          didOnEnd = true;
          dest.end();
        }
        function onclose() {
          if (didOnEnd)
            return;
          didOnEnd = true;
          if (typeof dest.destroy === "function")
            dest.destroy();
        }
        function onerror(er) {
          cleanup();
          if (EE.listenerCount(this, "error") === 0) {
            this.emit("error", er);
          }
        }
        prependListener2(source, "error", onerror);
        prependListener2(dest, "error", onerror);
        function cleanup() {
          source.removeListener("data", ondata);
          dest.removeListener("drain", ondrain);
          source.removeListener("end", onend);
          source.removeListener("close", onclose);
          source.removeListener("error", onerror);
          dest.removeListener("error", onerror);
          source.removeListener("end", cleanup);
          source.removeListener("close", cleanup);
          dest.removeListener("close", cleanup);
        }
        source.on("end", cleanup);
        source.on("close", cleanup);
        dest.on("close", cleanup);
        dest.emit("pipe", source);
        return dest;
      };
      function prependListener2(emitter, event, fn) {
        if (typeof emitter.prependListener === "function")
          return emitter.prependListener(event, fn);
        if (!emitter._events || !emitter._events[event])
          emitter.on(event, fn);
        else if (ArrayIsArray(emitter._events[event]))
          emitter._events[event].unshift(fn);
        else
          emitter._events[event] = [fn, emitter._events[event]];
      }
      module.exports = {
        Stream,
        prependListener: prependListener2
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/add-abort-signal.js
  var require_add_abort_signal = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/add-abort-signal.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { AbortError, codes } = require_errors();
      var { isNodeStream, isWebStream, kControllerErrorFunction } = require_utils();
      var eos = require_end_of_stream();
      var { ERR_INVALID_ARG_TYPE } = codes;
      var validateAbortSignal = (signal, name2) => {
        if (typeof signal !== "object" || !("aborted" in signal)) {
          throw new ERR_INVALID_ARG_TYPE(name2, "AbortSignal", signal);
        }
      };
      module.exports.addAbortSignal = function addAbortSignal(signal, stream) {
        validateAbortSignal(signal, "signal");
        if (!isNodeStream(stream) && !isWebStream(stream)) {
          throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
        }
        return module.exports.addAbortSignalNoValidate(signal, stream);
      };
      module.exports.addAbortSignalNoValidate = function(signal, stream) {
        if (typeof signal !== "object" || !("aborted" in signal)) {
          return stream;
        }
        const onAbort = isNodeStream(stream) ? () => {
          stream.destroy(
            new AbortError(void 0, {
              cause: signal.reason
            })
          );
        } : () => {
          stream[kControllerErrorFunction](
            new AbortError(void 0, {
              cause: signal.reason
            })
          );
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener("abort", onAbort);
          eos(stream, () => signal.removeEventListener("abort", onAbort));
        }
        return stream;
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/buffer_list.js
  var require_buffer_list = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/buffer_list.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array: Uint8Array2 } = require_primordials();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var { inspect } = require_util();
      module.exports = class BufferList {
        constructor() {
          this.head = null;
          this.tail = null;
          this.length = 0;
        }
        push(v4) {
          const entry = {
            data: v4,
            next: null
          };
          if (this.length > 0)
            this.tail.next = entry;
          else
            this.head = entry;
          this.tail = entry;
          ++this.length;
        }
        unshift(v4) {
          const entry = {
            data: v4,
            next: this.head
          };
          if (this.length === 0)
            this.tail = entry;
          this.head = entry;
          ++this.length;
        }
        shift() {
          if (this.length === 0)
            return;
          const ret = this.head.data;
          if (this.length === 1)
            this.head = this.tail = null;
          else
            this.head = this.head.next;
          --this.length;
          return ret;
        }
        clear() {
          this.head = this.tail = null;
          this.length = 0;
        }
        join(s5) {
          if (this.length === 0)
            return "";
          let p6 = this.head;
          let ret = "" + p6.data;
          while ((p6 = p6.next) !== null)
            ret += s5 + p6.data;
          return ret;
        }
        concat(n7) {
          if (this.length === 0)
            return Buffer3.alloc(0);
          const ret = Buffer3.allocUnsafe(n7 >>> 0);
          let p6 = this.head;
          let i6 = 0;
          while (p6) {
            TypedArrayPrototypeSet(ret, p6.data, i6);
            i6 += p6.data.length;
            p6 = p6.next;
          }
          return ret;
        }
        // Consumes a specified amount of bytes or characters from the buffered data.
        consume(n7, hasStrings) {
          const data = this.head.data;
          if (n7 < data.length) {
            const slice = data.slice(0, n7);
            this.head.data = data.slice(n7);
            return slice;
          }
          if (n7 === data.length) {
            return this.shift();
          }
          return hasStrings ? this._getString(n7) : this._getBuffer(n7);
        }
        first() {
          return this.head.data;
        }
        *[SymbolIterator]() {
          for (let p6 = this.head; p6; p6 = p6.next) {
            yield p6.data;
          }
        }
        // Consumes a specified amount of characters from the buffered data.
        _getString(n7) {
          let ret = "";
          let p6 = this.head;
          let c6 = 0;
          do {
            const str = p6.data;
            if (n7 > str.length) {
              ret += str;
              n7 -= str.length;
            } else {
              if (n7 === str.length) {
                ret += str;
                ++c6;
                if (p6.next)
                  this.head = p6.next;
                else
                  this.head = this.tail = null;
              } else {
                ret += StringPrototypeSlice(str, 0, n7);
                this.head = p6;
                p6.data = StringPrototypeSlice(str, n7);
              }
              break;
            }
            ++c6;
          } while ((p6 = p6.next) !== null);
          this.length -= c6;
          return ret;
        }
        // Consumes a specified amount of bytes from the buffered data.
        _getBuffer(n7) {
          const ret = Buffer3.allocUnsafe(n7);
          const retLen = n7;
          let p6 = this.head;
          let c6 = 0;
          do {
            const buf = p6.data;
            if (n7 > buf.length) {
              TypedArrayPrototypeSet(ret, buf, retLen - n7);
              n7 -= buf.length;
            } else {
              if (n7 === buf.length) {
                TypedArrayPrototypeSet(ret, buf, retLen - n7);
                ++c6;
                if (p6.next)
                  this.head = p6.next;
                else
                  this.head = this.tail = null;
              } else {
                TypedArrayPrototypeSet(ret, new Uint8Array2(buf.buffer, buf.byteOffset, n7), retLen - n7);
                this.head = p6;
                p6.data = buf.slice(n7);
              }
              break;
            }
            ++c6;
          } while ((p6 = p6.next) !== null);
          this.length -= c6;
          return ret;
        }
        // Make sure the linked list only shows the minimal necessary information.
        [Symbol.for("nodejs.util.inspect.custom")](_2, options) {
          return inspect(this, {
            ...options,
            // Only inspect one level.
            depth: 0,
            // It should not recurse.
            customInspect: false
          });
        }
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/state.js
  var require_state = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/state.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { MathFloor, NumberIsInteger } = require_primordials();
      var { ERR_INVALID_ARG_VALUE } = require_errors().codes;
      function highWaterMarkFrom(options, isDuplex, duplexKey) {
        return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
      }
      function getDefaultHighWaterMark(objectMode) {
        return objectMode ? 16 : 16 * 1024;
      }
      function getHighWaterMark(state, options, duplexKey, isDuplex) {
        const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
        if (hwm != null) {
          if (!NumberIsInteger(hwm) || hwm < 0) {
            const name2 = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
            throw new ERR_INVALID_ARG_VALUE(name2, hwm);
          }
          return MathFloor(hwm);
        }
        return getDefaultHighWaterMark(state.objectMode);
      }
      module.exports = {
        getHighWaterMark,
        getDefaultHighWaterMark
      };
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-4ccc3a29.js
  function u$2(r7) {
    var t6 = r7.length;
    if (t6 % 4 > 0)
      throw new Error("Invalid string. Length must be a multiple of 4");
    var e7 = r7.indexOf("=");
    return -1 === e7 && (e7 = t6), [e7, e7 === t6 ? 0 : 4 - e7 % 4];
  }
  function c$1(r7, e7, n7) {
    for (var o7, a6, h6 = [], u6 = e7; u6 < n7; u6 += 3)
      o7 = (r7[u6] << 16 & 16711680) + (r7[u6 + 1] << 8 & 65280) + (255 & r7[u6 + 2]), h6.push(t$1[(a6 = o7) >> 18 & 63] + t$1[a6 >> 12 & 63] + t$1[a6 >> 6 & 63] + t$1[63 & a6]);
    return h6.join("");
  }
  function f$2(t6) {
    if (t6 > 2147483647)
      throw new RangeError('The value "' + t6 + '" is invalid for option "size"');
    var r7 = new Uint8Array(t6);
    return Object.setPrototypeOf(r7, u$1$1.prototype), r7;
  }
  function u$1$1(t6, r7, e7) {
    if ("number" == typeof t6) {
      if ("string" == typeof r7)
        throw new TypeError('The "string" argument must be of type string. Received type number');
      return a$2(t6);
    }
    return s$1(t6, r7, e7);
  }
  function s$1(t6, r7, e7) {
    if ("string" == typeof t6)
      return function(t7, r8) {
        "string" == typeof r8 && "" !== r8 || (r8 = "utf8");
        if (!u$1$1.isEncoding(r8))
          throw new TypeError("Unknown encoding: " + r8);
        var e8 = 0 | y2(t7, r8), n8 = f$2(e8), i7 = n8.write(t7, r8);
        i7 !== e8 && (n8 = n8.slice(0, i7));
        return n8;
      }(t6, r7);
    if (ArrayBuffer.isView(t6))
      return p2(t6);
    if (null == t6)
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t6);
    if (F(t6, ArrayBuffer) || t6 && F(t6.buffer, ArrayBuffer))
      return c$1$1(t6, r7, e7);
    if ("undefined" != typeof SharedArrayBuffer && (F(t6, SharedArrayBuffer) || t6 && F(t6.buffer, SharedArrayBuffer)))
      return c$1$1(t6, r7, e7);
    if ("number" == typeof t6)
      throw new TypeError('The "value" argument must not be of type number. Received type number');
    var n7 = t6.valueOf && t6.valueOf();
    if (null != n7 && n7 !== t6)
      return u$1$1.from(n7, r7, e7);
    var i6 = function(t7) {
      if (u$1$1.isBuffer(t7)) {
        var r8 = 0 | l$1(t7.length), e8 = f$2(r8);
        return 0 === e8.length || t7.copy(e8, 0, 0, r8), e8;
      }
      if (void 0 !== t7.length)
        return "number" != typeof t7.length || N(t7.length) ? f$2(0) : p2(t7);
      if ("Buffer" === t7.type && Array.isArray(t7.data))
        return p2(t7.data);
    }(t6);
    if (i6)
      return i6;
    if ("undefined" != typeof Symbol && null != Symbol.toPrimitive && "function" == typeof t6[Symbol.toPrimitive])
      return u$1$1.from(t6[Symbol.toPrimitive]("string"), r7, e7);
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t6);
  }
  function h$1$1(t6) {
    if ("number" != typeof t6)
      throw new TypeError('"size" argument must be of type number');
    if (t6 < 0)
      throw new RangeError('The value "' + t6 + '" is invalid for option "size"');
  }
  function a$2(t6) {
    return h$1$1(t6), f$2(t6 < 0 ? 0 : 0 | l$1(t6));
  }
  function p2(t6) {
    for (var r7 = t6.length < 0 ? 0 : 0 | l$1(t6.length), e7 = f$2(r7), n7 = 0; n7 < r7; n7 += 1)
      e7[n7] = 255 & t6[n7];
    return e7;
  }
  function c$1$1(t6, r7, e7) {
    if (r7 < 0 || t6.byteLength < r7)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (t6.byteLength < r7 + (e7 || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    var n7;
    return n7 = void 0 === r7 && void 0 === e7 ? new Uint8Array(t6) : void 0 === e7 ? new Uint8Array(t6, r7) : new Uint8Array(t6, r7, e7), Object.setPrototypeOf(n7, u$1$1.prototype), n7;
  }
  function l$1(t6) {
    if (t6 >= 2147483647)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + 2147483647 .toString(16) + " bytes");
    return 0 | t6;
  }
  function y2(t6, r7) {
    if (u$1$1.isBuffer(t6))
      return t6.length;
    if (ArrayBuffer.isView(t6) || F(t6, ArrayBuffer))
      return t6.byteLength;
    if ("string" != typeof t6)
      throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof t6);
    var e7 = t6.length, n7 = arguments.length > 2 && true === arguments[2];
    if (!n7 && 0 === e7)
      return 0;
    for (var i6 = false; ; )
      switch (r7) {
        case "ascii":
        case "latin1":
        case "binary":
          return e7;
        case "utf8":
        case "utf-8":
          return _(t6).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return 2 * e7;
        case "hex":
          return e7 >>> 1;
        case "base64":
          return z(t6).length;
        default:
          if (i6)
            return n7 ? -1 : _(t6).length;
          r7 = ("" + r7).toLowerCase(), i6 = true;
      }
  }
  function g(t6, r7, e7) {
    var n7 = false;
    if ((void 0 === r7 || r7 < 0) && (r7 = 0), r7 > this.length)
      return "";
    if ((void 0 === e7 || e7 > this.length) && (e7 = this.length), e7 <= 0)
      return "";
    if ((e7 >>>= 0) <= (r7 >>>= 0))
      return "";
    for (t6 || (t6 = "utf8"); ; )
      switch (t6) {
        case "hex":
          return O(this, r7, e7);
        case "utf8":
        case "utf-8":
          return I(this, r7, e7);
        case "ascii":
          return S(this, r7, e7);
        case "latin1":
        case "binary":
          return R(this, r7, e7);
        case "base64":
          return T(this, r7, e7);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return L(this, r7, e7);
        default:
          if (n7)
            throw new TypeError("Unknown encoding: " + t6);
          t6 = (t6 + "").toLowerCase(), n7 = true;
      }
  }
  function w(t6, r7, e7) {
    var n7 = t6[r7];
    t6[r7] = t6[e7], t6[e7] = n7;
  }
  function d(t6, r7, e7, n7, i6) {
    if (0 === t6.length)
      return -1;
    if ("string" == typeof e7 ? (n7 = e7, e7 = 0) : e7 > 2147483647 ? e7 = 2147483647 : e7 < -2147483648 && (e7 = -2147483648), N(e7 = +e7) && (e7 = i6 ? 0 : t6.length - 1), e7 < 0 && (e7 = t6.length + e7), e7 >= t6.length) {
      if (i6)
        return -1;
      e7 = t6.length - 1;
    } else if (e7 < 0) {
      if (!i6)
        return -1;
      e7 = 0;
    }
    if ("string" == typeof r7 && (r7 = u$1$1.from(r7, n7)), u$1$1.isBuffer(r7))
      return 0 === r7.length ? -1 : v2(t6, r7, e7, n7, i6);
    if ("number" == typeof r7)
      return r7 &= 255, "function" == typeof Uint8Array.prototype.indexOf ? i6 ? Uint8Array.prototype.indexOf.call(t6, r7, e7) : Uint8Array.prototype.lastIndexOf.call(t6, r7, e7) : v2(t6, [r7], e7, n7, i6);
    throw new TypeError("val must be string, number or Buffer");
  }
  function v2(t6, r7, e7, n7, i6) {
    var o7, f6 = 1, u6 = t6.length, s5 = r7.length;
    if (void 0 !== n7 && ("ucs2" === (n7 = String(n7).toLowerCase()) || "ucs-2" === n7 || "utf16le" === n7 || "utf-16le" === n7)) {
      if (t6.length < 2 || r7.length < 2)
        return -1;
      f6 = 2, u6 /= 2, s5 /= 2, e7 /= 2;
    }
    function h6(t7, r8) {
      return 1 === f6 ? t7[r8] : t7.readUInt16BE(r8 * f6);
    }
    if (i6) {
      var a6 = -1;
      for (o7 = e7; o7 < u6; o7++)
        if (h6(t6, o7) === h6(r7, -1 === a6 ? 0 : o7 - a6)) {
          if (-1 === a6 && (a6 = o7), o7 - a6 + 1 === s5)
            return a6 * f6;
        } else
          -1 !== a6 && (o7 -= o7 - a6), a6 = -1;
    } else
      for (e7 + s5 > u6 && (e7 = u6 - s5), o7 = e7; o7 >= 0; o7--) {
        for (var p6 = true, c6 = 0; c6 < s5; c6++)
          if (h6(t6, o7 + c6) !== h6(r7, c6)) {
            p6 = false;
            break;
          }
        if (p6)
          return o7;
      }
    return -1;
  }
  function b(t6, r7, e7, n7) {
    e7 = Number(e7) || 0;
    var i6 = t6.length - e7;
    n7 ? (n7 = Number(n7)) > i6 && (n7 = i6) : n7 = i6;
    var o7 = r7.length;
    n7 > o7 / 2 && (n7 = o7 / 2);
    for (var f6 = 0; f6 < n7; ++f6) {
      var u6 = parseInt(r7.substr(2 * f6, 2), 16);
      if (N(u6))
        return f6;
      t6[e7 + f6] = u6;
    }
    return f6;
  }
  function m(t6, r7, e7, n7) {
    return D(_(r7, t6.length - e7), t6, e7, n7);
  }
  function E(t6, r7, e7, n7) {
    return D(function(t7) {
      for (var r8 = [], e8 = 0; e8 < t7.length; ++e8)
        r8.push(255 & t7.charCodeAt(e8));
      return r8;
    }(r7), t6, e7, n7);
  }
  function B(t6, r7, e7, n7) {
    return E(t6, r7, e7, n7);
  }
  function A(t6, r7, e7, n7) {
    return D(z(r7), t6, e7, n7);
  }
  function U(t6, r7, e7, n7) {
    return D(function(t7, r8) {
      for (var e8, n8, i6, o7 = [], f6 = 0; f6 < t7.length && !((r8 -= 2) < 0); ++f6)
        e8 = t7.charCodeAt(f6), n8 = e8 >> 8, i6 = e8 % 256, o7.push(i6), o7.push(n8);
      return o7;
    }(r7, t6.length - e7), t6, e7, n7);
  }
  function T(t6, r7, e7) {
    return 0 === r7 && e7 === t6.length ? n$1$1.fromByteArray(t6) : n$1$1.fromByteArray(t6.slice(r7, e7));
  }
  function I(t6, r7, e7) {
    e7 = Math.min(t6.length, e7);
    for (var n7 = [], i6 = r7; i6 < e7; ) {
      var o7, f6, u6, s5, h6 = t6[i6], a6 = null, p6 = h6 > 239 ? 4 : h6 > 223 ? 3 : h6 > 191 ? 2 : 1;
      if (i6 + p6 <= e7)
        switch (p6) {
          case 1:
            h6 < 128 && (a6 = h6);
            break;
          case 2:
            128 == (192 & (o7 = t6[i6 + 1])) && (s5 = (31 & h6) << 6 | 63 & o7) > 127 && (a6 = s5);
            break;
          case 3:
            o7 = t6[i6 + 1], f6 = t6[i6 + 2], 128 == (192 & o7) && 128 == (192 & f6) && (s5 = (15 & h6) << 12 | (63 & o7) << 6 | 63 & f6) > 2047 && (s5 < 55296 || s5 > 57343) && (a6 = s5);
            break;
          case 4:
            o7 = t6[i6 + 1], f6 = t6[i6 + 2], u6 = t6[i6 + 3], 128 == (192 & o7) && 128 == (192 & f6) && 128 == (192 & u6) && (s5 = (15 & h6) << 18 | (63 & o7) << 12 | (63 & f6) << 6 | 63 & u6) > 65535 && s5 < 1114112 && (a6 = s5);
        }
      null === a6 ? (a6 = 65533, p6 = 1) : a6 > 65535 && (a6 -= 65536, n7.push(a6 >>> 10 & 1023 | 55296), a6 = 56320 | 1023 & a6), n7.push(a6), i6 += p6;
    }
    return function(t7) {
      var r8 = t7.length;
      if (r8 <= 4096)
        return String.fromCharCode.apply(String, t7);
      var e8 = "", n8 = 0;
      for (; n8 < r8; )
        e8 += String.fromCharCode.apply(String, t7.slice(n8, n8 += 4096));
      return e8;
    }(n7);
  }
  function S(t6, r7, e7) {
    var n7 = "";
    e7 = Math.min(t6.length, e7);
    for (var i6 = r7; i6 < e7; ++i6)
      n7 += String.fromCharCode(127 & t6[i6]);
    return n7;
  }
  function R(t6, r7, e7) {
    var n7 = "";
    e7 = Math.min(t6.length, e7);
    for (var i6 = r7; i6 < e7; ++i6)
      n7 += String.fromCharCode(t6[i6]);
    return n7;
  }
  function O(t6, r7, e7) {
    var n7 = t6.length;
    (!r7 || r7 < 0) && (r7 = 0), (!e7 || e7 < 0 || e7 > n7) && (e7 = n7);
    for (var i6 = "", o7 = r7; o7 < e7; ++o7)
      i6 += Y[t6[o7]];
    return i6;
  }
  function L(t6, r7, e7) {
    for (var n7 = t6.slice(r7, e7), i6 = "", o7 = 0; o7 < n7.length; o7 += 2)
      i6 += String.fromCharCode(n7[o7] + 256 * n7[o7 + 1]);
    return i6;
  }
  function x(t6, r7, e7) {
    if (t6 % 1 != 0 || t6 < 0)
      throw new RangeError("offset is not uint");
    if (t6 + r7 > e7)
      throw new RangeError("Trying to access beyond buffer length");
  }
  function C(t6, r7, e7, n7, i6, o7) {
    if (!u$1$1.isBuffer(t6))
      throw new TypeError('"buffer" argument must be a Buffer instance');
    if (r7 > i6 || r7 < o7)
      throw new RangeError('"value" argument is out of bounds');
    if (e7 + n7 > t6.length)
      throw new RangeError("Index out of range");
  }
  function P(t6, r7, e7, n7, i6, o7) {
    if (e7 + n7 > t6.length)
      throw new RangeError("Index out of range");
    if (e7 < 0)
      throw new RangeError("Index out of range");
  }
  function k(t6, r7, e7, n7, o7) {
    return r7 = +r7, e7 >>>= 0, o7 || P(t6, 0, e7, 4), i$1.write(t6, r7, e7, n7, 23, 4), e7 + 4;
  }
  function M(t6, r7, e7, n7, o7) {
    return r7 = +r7, e7 >>>= 0, o7 || P(t6, 0, e7, 8), i$1.write(t6, r7, e7, n7, 52, 8), e7 + 8;
  }
  function _(t6, r7) {
    var e7;
    r7 = r7 || 1 / 0;
    for (var n7 = t6.length, i6 = null, o7 = [], f6 = 0; f6 < n7; ++f6) {
      if ((e7 = t6.charCodeAt(f6)) > 55295 && e7 < 57344) {
        if (!i6) {
          if (e7 > 56319) {
            (r7 -= 3) > -1 && o7.push(239, 191, 189);
            continue;
          }
          if (f6 + 1 === n7) {
            (r7 -= 3) > -1 && o7.push(239, 191, 189);
            continue;
          }
          i6 = e7;
          continue;
        }
        if (e7 < 56320) {
          (r7 -= 3) > -1 && o7.push(239, 191, 189), i6 = e7;
          continue;
        }
        e7 = 65536 + (i6 - 55296 << 10 | e7 - 56320);
      } else
        i6 && (r7 -= 3) > -1 && o7.push(239, 191, 189);
      if (i6 = null, e7 < 128) {
        if ((r7 -= 1) < 0)
          break;
        o7.push(e7);
      } else if (e7 < 2048) {
        if ((r7 -= 2) < 0)
          break;
        o7.push(e7 >> 6 | 192, 63 & e7 | 128);
      } else if (e7 < 65536) {
        if ((r7 -= 3) < 0)
          break;
        o7.push(e7 >> 12 | 224, e7 >> 6 & 63 | 128, 63 & e7 | 128);
      } else {
        if (!(e7 < 1114112))
          throw new Error("Invalid code point");
        if ((r7 -= 4) < 0)
          break;
        o7.push(e7 >> 18 | 240, e7 >> 12 & 63 | 128, e7 >> 6 & 63 | 128, 63 & e7 | 128);
      }
    }
    return o7;
  }
  function z(t6) {
    return n$1$1.toByteArray(function(t7) {
      if ((t7 = (t7 = t7.split("=")[0]).trim().replace(j, "")).length < 2)
        return "";
      for (; t7.length % 4 != 0; )
        t7 += "=";
      return t7;
    }(t6));
  }
  function D(t6, r7, e7, n7) {
    for (var i6 = 0; i6 < n7 && !(i6 + e7 >= r7.length || i6 >= t6.length); ++i6)
      r7[i6 + e7] = t6[i6];
    return i6;
  }
  function F(t6, r7) {
    return t6 instanceof r7 || null != t6 && null != t6.constructor && null != t6.constructor.name && t6.constructor.name === r7.name;
  }
  function N(t6) {
    return t6 != t6;
  }
  function t2(r7, e7) {
    for (var n7 in r7)
      e7[n7] = r7[n7];
  }
  function f2(r7, e7, n7) {
    return o2(r7, e7, n7);
  }
  function a2(t6) {
    var e7;
    switch (this.encoding = function(t7) {
      var e8 = function(t8) {
        if (!t8)
          return "utf8";
        for (var e9; ; )
          switch (t8) {
            case "utf8":
            case "utf-8":
              return "utf8";
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return "utf16le";
            case "latin1":
            case "binary":
              return "latin1";
            case "base64":
            case "ascii":
            case "hex":
              return t8;
            default:
              if (e9)
                return;
              t8 = ("" + t8).toLowerCase(), e9 = true;
          }
      }(t7);
      if ("string" != typeof e8 && (s2.isEncoding === i2 || !i2(t7)))
        throw new Error("Unknown encoding: " + t7);
      return e8 || t7;
    }(t6), this.encoding) {
      case "utf16le":
        this.text = h2, this.end = l2, e7 = 4;
        break;
      case "utf8":
        this.fillLast = n$1, e7 = 4;
        break;
      case "base64":
        this.text = u$1, this.end = o$1, e7 = 3;
        break;
      default:
        return this.write = f$1, this.end = c2, void 0;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = s2.allocUnsafe(e7);
  }
  function r2(t6) {
    return t6 <= 127 ? 0 : t6 >> 5 == 6 ? 2 : t6 >> 4 == 14 ? 3 : t6 >> 3 == 30 ? 4 : t6 >> 6 == 2 ? -1 : -2;
  }
  function n$1(t6) {
    var e7 = this.lastTotal - this.lastNeed, s5 = function(t7, e8, s6) {
      if (128 != (192 & e8[0]))
        return t7.lastNeed = 0, "\uFFFD";
      if (t7.lastNeed > 1 && e8.length > 1) {
        if (128 != (192 & e8[1]))
          return t7.lastNeed = 1, "\uFFFD";
        if (t7.lastNeed > 2 && e8.length > 2 && 128 != (192 & e8[2]))
          return t7.lastNeed = 2, "\uFFFD";
      }
    }(this, t6);
    return void 0 !== s5 ? s5 : this.lastNeed <= t6.length ? (t6.copy(this.lastChar, e7, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal)) : (t6.copy(this.lastChar, e7, 0, t6.length), this.lastNeed -= t6.length, void 0);
  }
  function h2(t6, e7) {
    if ((t6.length - e7) % 2 == 0) {
      var s5 = t6.toString("utf16le", e7);
      if (s5) {
        var i6 = s5.charCodeAt(s5.length - 1);
        if (i6 >= 55296 && i6 <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = t6[t6.length - 2], this.lastChar[1] = t6[t6.length - 1], s5.slice(0, -1);
      }
      return s5;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = t6[t6.length - 1], t6.toString("utf16le", e7, t6.length - 1);
  }
  function l2(t6) {
    var e7 = t6 && t6.length ? this.write(t6) : "";
    if (this.lastNeed) {
      var s5 = this.lastTotal - this.lastNeed;
      return e7 + this.lastChar.toString("utf16le", 0, s5);
    }
    return e7;
  }
  function u$1(t6, e7) {
    var s5 = (t6.length - e7) % 3;
    return 0 === s5 ? t6.toString("base64", e7) : (this.lastNeed = 3 - s5, this.lastTotal = 3, 1 === s5 ? this.lastChar[0] = t6[t6.length - 1] : (this.lastChar[0] = t6[t6.length - 2], this.lastChar[1] = t6[t6.length - 1]), t6.toString("base64", e7, t6.length - s5));
  }
  function o$1(t6) {
    var e7 = t6 && t6.length ? this.write(t6) : "";
    return this.lastNeed ? e7 + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : e7;
  }
  function f$1(t6) {
    return t6.toString(this.encoding);
  }
  function c2(t6) {
    return t6 && t6.length ? this.write(t6) : "";
  }
  var r$1, t$1, e$2, n$2, o$2, a$1, h$1, a$1$1, e$1$1, n$1$1, i$1, o$1$1, j, Y, e2, n2, o2, u2, e$1, s2, i2;
  var init_chunk_4ccc3a29 = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-4ccc3a29.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      for (r$1 = { byteLength: function(r7) {
        var t6 = u$2(r7), e7 = t6[0], n7 = t6[1];
        return 3 * (e7 + n7) / 4 - n7;
      }, toByteArray: function(r7) {
        var t6, o7, a6 = u$2(r7), h6 = a6[0], c6 = a6[1], d4 = new n$2(function(r8, t7, e7) {
          return 3 * (t7 + e7) / 4 - e7;
        }(0, h6, c6)), f6 = 0, A2 = c6 > 0 ? h6 - 4 : h6;
        for (o7 = 0; o7 < A2; o7 += 4)
          t6 = e$2[r7.charCodeAt(o7)] << 18 | e$2[r7.charCodeAt(o7 + 1)] << 12 | e$2[r7.charCodeAt(o7 + 2)] << 6 | e$2[r7.charCodeAt(o7 + 3)], d4[f6++] = t6 >> 16 & 255, d4[f6++] = t6 >> 8 & 255, d4[f6++] = 255 & t6;
        2 === c6 && (t6 = e$2[r7.charCodeAt(o7)] << 2 | e$2[r7.charCodeAt(o7 + 1)] >> 4, d4[f6++] = 255 & t6);
        1 === c6 && (t6 = e$2[r7.charCodeAt(o7)] << 10 | e$2[r7.charCodeAt(o7 + 1)] << 4 | e$2[r7.charCodeAt(o7 + 2)] >> 2, d4[f6++] = t6 >> 8 & 255, d4[f6++] = 255 & t6);
        return d4;
      }, fromByteArray: function(r7) {
        for (var e7, n7 = r7.length, o7 = n7 % 3, a6 = [], h6 = 0, u6 = n7 - o7; h6 < u6; h6 += 16383)
          a6.push(c$1(r7, h6, h6 + 16383 > u6 ? u6 : h6 + 16383));
        1 === o7 ? (e7 = r7[n7 - 1], a6.push(t$1[e7 >> 2] + t$1[e7 << 4 & 63] + "==")) : 2 === o7 && (e7 = (r7[n7 - 2] << 8) + r7[n7 - 1], a6.push(t$1[e7 >> 10] + t$1[e7 >> 4 & 63] + t$1[e7 << 2 & 63] + "="));
        return a6.join("");
      } }, t$1 = [], e$2 = [], n$2 = "undefined" != typeof Uint8Array ? Uint8Array : Array, o$2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", a$1 = 0, h$1 = o$2.length; a$1 < h$1; ++a$1)
        t$1[a$1] = o$2[a$1], e$2[o$2.charCodeAt(a$1)] = a$1;
      e$2["-".charCodeAt(0)] = 62, e$2["_".charCodeAt(0)] = 63;
      a$1$1 = { read: function(a6, t6, o7, r7, h6) {
        var M2, f6, p6 = 8 * h6 - r7 - 1, w2 = (1 << p6) - 1, e7 = w2 >> 1, i6 = -7, N2 = o7 ? h6 - 1 : 0, n7 = o7 ? -1 : 1, u6 = a6[t6 + N2];
        for (N2 += n7, M2 = u6 & (1 << -i6) - 1, u6 >>= -i6, i6 += p6; i6 > 0; M2 = 256 * M2 + a6[t6 + N2], N2 += n7, i6 -= 8)
          ;
        for (f6 = M2 & (1 << -i6) - 1, M2 >>= -i6, i6 += r7; i6 > 0; f6 = 256 * f6 + a6[t6 + N2], N2 += n7, i6 -= 8)
          ;
        if (0 === M2)
          M2 = 1 - e7;
        else {
          if (M2 === w2)
            return f6 ? NaN : 1 / 0 * (u6 ? -1 : 1);
          f6 += Math.pow(2, r7), M2 -= e7;
        }
        return (u6 ? -1 : 1) * f6 * Math.pow(2, M2 - r7);
      }, write: function(a6, t6, o7, r7, h6, M2) {
        var f6, p6, w2, e7 = 8 * M2 - h6 - 1, i6 = (1 << e7) - 1, N2 = i6 >> 1, n7 = 23 === h6 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, u6 = r7 ? 0 : M2 - 1, l6 = r7 ? 1 : -1, s5 = t6 < 0 || 0 === t6 && 1 / t6 < 0 ? 1 : 0;
        for (t6 = Math.abs(t6), isNaN(t6) || t6 === 1 / 0 ? (p6 = isNaN(t6) ? 1 : 0, f6 = i6) : (f6 = Math.floor(Math.log(t6) / Math.LN2), t6 * (w2 = Math.pow(2, -f6)) < 1 && (f6--, w2 *= 2), (t6 += f6 + N2 >= 1 ? n7 / w2 : n7 * Math.pow(2, 1 - N2)) * w2 >= 2 && (f6++, w2 /= 2), f6 + N2 >= i6 ? (p6 = 0, f6 = i6) : f6 + N2 >= 1 ? (p6 = (t6 * w2 - 1) * Math.pow(2, h6), f6 += N2) : (p6 = t6 * Math.pow(2, N2 - 1) * Math.pow(2, h6), f6 = 0)); h6 >= 8; a6[o7 + u6] = 255 & p6, u6 += l6, p6 /= 256, h6 -= 8)
          ;
        for (f6 = f6 << h6 | p6, e7 += h6; e7 > 0; a6[o7 + u6] = 255 & f6, u6 += l6, f6 /= 256, e7 -= 8)
          ;
        a6[o7 + u6 - l6] |= 128 * s5;
      } };
      e$1$1 = {};
      n$1$1 = r$1;
      i$1 = a$1$1;
      o$1$1 = "function" == typeof Symbol && "function" == typeof Symbol.for ? Symbol.for("nodejs.util.inspect.custom") : null;
      e$1$1.Buffer = u$1$1, e$1$1.SlowBuffer = function(t6) {
        +t6 != t6 && (t6 = 0);
        return u$1$1.alloc(+t6);
      }, e$1$1.INSPECT_MAX_BYTES = 50;
      e$1$1.kMaxLength = 2147483647, u$1$1.TYPED_ARRAY_SUPPORT = function() {
        try {
          var t6 = new Uint8Array(1), r7 = { foo: function() {
            return 42;
          } };
          return Object.setPrototypeOf(r7, Uint8Array.prototype), Object.setPrototypeOf(t6, r7), 42 === t6.foo();
        } catch (t7) {
          return false;
        }
      }(), u$1$1.TYPED_ARRAY_SUPPORT || "undefined" == typeof console || "function" != typeof console.error || console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."), Object.defineProperty(u$1$1.prototype, "parent", { enumerable: true, get: function() {
        if (u$1$1.isBuffer(this))
          return this.buffer;
      } }), Object.defineProperty(u$1$1.prototype, "offset", { enumerable: true, get: function() {
        if (u$1$1.isBuffer(this))
          return this.byteOffset;
      } }), u$1$1.poolSize = 8192, u$1$1.from = function(t6, r7, e7) {
        return s$1(t6, r7, e7);
      }, Object.setPrototypeOf(u$1$1.prototype, Uint8Array.prototype), Object.setPrototypeOf(u$1$1, Uint8Array), u$1$1.alloc = function(t6, r7, e7) {
        return function(t7, r8, e8) {
          return h$1$1(t7), t7 <= 0 ? f$2(t7) : void 0 !== r8 ? "string" == typeof e8 ? f$2(t7).fill(r8, e8) : f$2(t7).fill(r8) : f$2(t7);
        }(t6, r7, e7);
      }, u$1$1.allocUnsafe = function(t6) {
        return a$2(t6);
      }, u$1$1.allocUnsafeSlow = function(t6) {
        return a$2(t6);
      }, u$1$1.isBuffer = function(t6) {
        return null != t6 && true === t6._isBuffer && t6 !== u$1$1.prototype;
      }, u$1$1.compare = function(t6, r7) {
        if (F(t6, Uint8Array) && (t6 = u$1$1.from(t6, t6.offset, t6.byteLength)), F(r7, Uint8Array) && (r7 = u$1$1.from(r7, r7.offset, r7.byteLength)), !u$1$1.isBuffer(t6) || !u$1$1.isBuffer(r7))
          throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
        if (t6 === r7)
          return 0;
        for (var e7 = t6.length, n7 = r7.length, i6 = 0, o7 = Math.min(e7, n7); i6 < o7; ++i6)
          if (t6[i6] !== r7[i6]) {
            e7 = t6[i6], n7 = r7[i6];
            break;
          }
        return e7 < n7 ? -1 : n7 < e7 ? 1 : 0;
      }, u$1$1.isEncoding = function(t6) {
        switch (String(t6).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      }, u$1$1.concat = function(t6, r7) {
        if (!Array.isArray(t6))
          throw new TypeError('"list" argument must be an Array of Buffers');
        if (0 === t6.length)
          return u$1$1.alloc(0);
        var e7;
        if (void 0 === r7)
          for (r7 = 0, e7 = 0; e7 < t6.length; ++e7)
            r7 += t6[e7].length;
        var n7 = u$1$1.allocUnsafe(r7), i6 = 0;
        for (e7 = 0; e7 < t6.length; ++e7) {
          var o7 = t6[e7];
          if (F(o7, Uint8Array) && (o7 = u$1$1.from(o7)), !u$1$1.isBuffer(o7))
            throw new TypeError('"list" argument must be an Array of Buffers');
          o7.copy(n7, i6), i6 += o7.length;
        }
        return n7;
      }, u$1$1.byteLength = y2, u$1$1.prototype._isBuffer = true, u$1$1.prototype.swap16 = function() {
        var t6 = this.length;
        if (t6 % 2 != 0)
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (var r7 = 0; r7 < t6; r7 += 2)
          w(this, r7, r7 + 1);
        return this;
      }, u$1$1.prototype.swap32 = function() {
        var t6 = this.length;
        if (t6 % 4 != 0)
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (var r7 = 0; r7 < t6; r7 += 4)
          w(this, r7, r7 + 3), w(this, r7 + 1, r7 + 2);
        return this;
      }, u$1$1.prototype.swap64 = function() {
        var t6 = this.length;
        if (t6 % 8 != 0)
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        for (var r7 = 0; r7 < t6; r7 += 8)
          w(this, r7, r7 + 7), w(this, r7 + 1, r7 + 6), w(this, r7 + 2, r7 + 5), w(this, r7 + 3, r7 + 4);
        return this;
      }, u$1$1.prototype.toString = function() {
        var t6 = this.length;
        return 0 === t6 ? "" : 0 === arguments.length ? I(this, 0, t6) : g.apply(this, arguments);
      }, u$1$1.prototype.toLocaleString = u$1$1.prototype.toString, u$1$1.prototype.equals = function(t6) {
        if (!u$1$1.isBuffer(t6))
          throw new TypeError("Argument must be a Buffer");
        return this === t6 || 0 === u$1$1.compare(this, t6);
      }, u$1$1.prototype.inspect = function() {
        var t6 = "", r7 = e$1$1.INSPECT_MAX_BYTES;
        return t6 = this.toString("hex", 0, r7).replace(/(.{2})/g, "$1 ").trim(), this.length > r7 && (t6 += " ... "), "<Buffer " + t6 + ">";
      }, o$1$1 && (u$1$1.prototype[o$1$1] = u$1$1.prototype.inspect), u$1$1.prototype.compare = function(t6, r7, e7, n7, i6) {
        if (F(t6, Uint8Array) && (t6 = u$1$1.from(t6, t6.offset, t6.byteLength)), !u$1$1.isBuffer(t6))
          throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t6);
        if (void 0 === r7 && (r7 = 0), void 0 === e7 && (e7 = t6 ? t6.length : 0), void 0 === n7 && (n7 = 0), void 0 === i6 && (i6 = this.length), r7 < 0 || e7 > t6.length || n7 < 0 || i6 > this.length)
          throw new RangeError("out of range index");
        if (n7 >= i6 && r7 >= e7)
          return 0;
        if (n7 >= i6)
          return -1;
        if (r7 >= e7)
          return 1;
        if (this === t6)
          return 0;
        for (var o7 = (i6 >>>= 0) - (n7 >>>= 0), f6 = (e7 >>>= 0) - (r7 >>>= 0), s5 = Math.min(o7, f6), h6 = this.slice(n7, i6), a6 = t6.slice(r7, e7), p6 = 0; p6 < s5; ++p6)
          if (h6[p6] !== a6[p6]) {
            o7 = h6[p6], f6 = a6[p6];
            break;
          }
        return o7 < f6 ? -1 : f6 < o7 ? 1 : 0;
      }, u$1$1.prototype.includes = function(t6, r7, e7) {
        return -1 !== this.indexOf(t6, r7, e7);
      }, u$1$1.prototype.indexOf = function(t6, r7, e7) {
        return d(this, t6, r7, e7, true);
      }, u$1$1.prototype.lastIndexOf = function(t6, r7, e7) {
        return d(this, t6, r7, e7, false);
      }, u$1$1.prototype.write = function(t6, r7, e7, n7) {
        if (void 0 === r7)
          n7 = "utf8", e7 = this.length, r7 = 0;
        else if (void 0 === e7 && "string" == typeof r7)
          n7 = r7, e7 = this.length, r7 = 0;
        else {
          if (!isFinite(r7))
            throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
          r7 >>>= 0, isFinite(e7) ? (e7 >>>= 0, void 0 === n7 && (n7 = "utf8")) : (n7 = e7, e7 = void 0);
        }
        var i6 = this.length - r7;
        if ((void 0 === e7 || e7 > i6) && (e7 = i6), t6.length > 0 && (e7 < 0 || r7 < 0) || r7 > this.length)
          throw new RangeError("Attempt to write outside buffer bounds");
        n7 || (n7 = "utf8");
        for (var o7 = false; ; )
          switch (n7) {
            case "hex":
              return b(this, t6, r7, e7);
            case "utf8":
            case "utf-8":
              return m(this, t6, r7, e7);
            case "ascii":
              return E(this, t6, r7, e7);
            case "latin1":
            case "binary":
              return B(this, t6, r7, e7);
            case "base64":
              return A(this, t6, r7, e7);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return U(this, t6, r7, e7);
            default:
              if (o7)
                throw new TypeError("Unknown encoding: " + n7);
              n7 = ("" + n7).toLowerCase(), o7 = true;
          }
      }, u$1$1.prototype.toJSON = function() {
        return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
      };
      u$1$1.prototype.slice = function(t6, r7) {
        var e7 = this.length;
        (t6 = ~~t6) < 0 ? (t6 += e7) < 0 && (t6 = 0) : t6 > e7 && (t6 = e7), (r7 = void 0 === r7 ? e7 : ~~r7) < 0 ? (r7 += e7) < 0 && (r7 = 0) : r7 > e7 && (r7 = e7), r7 < t6 && (r7 = t6);
        var n7 = this.subarray(t6, r7);
        return Object.setPrototypeOf(n7, u$1$1.prototype), n7;
      }, u$1$1.prototype.readUIntLE = function(t6, r7, e7) {
        t6 >>>= 0, r7 >>>= 0, e7 || x(t6, r7, this.length);
        for (var n7 = this[t6], i6 = 1, o7 = 0; ++o7 < r7 && (i6 *= 256); )
          n7 += this[t6 + o7] * i6;
        return n7;
      }, u$1$1.prototype.readUIntBE = function(t6, r7, e7) {
        t6 >>>= 0, r7 >>>= 0, e7 || x(t6, r7, this.length);
        for (var n7 = this[t6 + --r7], i6 = 1; r7 > 0 && (i6 *= 256); )
          n7 += this[t6 + --r7] * i6;
        return n7;
      }, u$1$1.prototype.readUInt8 = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 1, this.length), this[t6];
      }, u$1$1.prototype.readUInt16LE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 2, this.length), this[t6] | this[t6 + 1] << 8;
      }, u$1$1.prototype.readUInt16BE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 2, this.length), this[t6] << 8 | this[t6 + 1];
      }, u$1$1.prototype.readUInt32LE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), (this[t6] | this[t6 + 1] << 8 | this[t6 + 2] << 16) + 16777216 * this[t6 + 3];
      }, u$1$1.prototype.readUInt32BE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), 16777216 * this[t6] + (this[t6 + 1] << 16 | this[t6 + 2] << 8 | this[t6 + 3]);
      }, u$1$1.prototype.readIntLE = function(t6, r7, e7) {
        t6 >>>= 0, r7 >>>= 0, e7 || x(t6, r7, this.length);
        for (var n7 = this[t6], i6 = 1, o7 = 0; ++o7 < r7 && (i6 *= 256); )
          n7 += this[t6 + o7] * i6;
        return n7 >= (i6 *= 128) && (n7 -= Math.pow(2, 8 * r7)), n7;
      }, u$1$1.prototype.readIntBE = function(t6, r7, e7) {
        t6 >>>= 0, r7 >>>= 0, e7 || x(t6, r7, this.length);
        for (var n7 = r7, i6 = 1, o7 = this[t6 + --n7]; n7 > 0 && (i6 *= 256); )
          o7 += this[t6 + --n7] * i6;
        return o7 >= (i6 *= 128) && (o7 -= Math.pow(2, 8 * r7)), o7;
      }, u$1$1.prototype.readInt8 = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 1, this.length), 128 & this[t6] ? -1 * (255 - this[t6] + 1) : this[t6];
      }, u$1$1.prototype.readInt16LE = function(t6, r7) {
        t6 >>>= 0, r7 || x(t6, 2, this.length);
        var e7 = this[t6] | this[t6 + 1] << 8;
        return 32768 & e7 ? 4294901760 | e7 : e7;
      }, u$1$1.prototype.readInt16BE = function(t6, r7) {
        t6 >>>= 0, r7 || x(t6, 2, this.length);
        var e7 = this[t6 + 1] | this[t6] << 8;
        return 32768 & e7 ? 4294901760 | e7 : e7;
      }, u$1$1.prototype.readInt32LE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), this[t6] | this[t6 + 1] << 8 | this[t6 + 2] << 16 | this[t6 + 3] << 24;
      }, u$1$1.prototype.readInt32BE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), this[t6] << 24 | this[t6 + 1] << 16 | this[t6 + 2] << 8 | this[t6 + 3];
      }, u$1$1.prototype.readFloatLE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), i$1.read(this, t6, true, 23, 4);
      }, u$1$1.prototype.readFloatBE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 4, this.length), i$1.read(this, t6, false, 23, 4);
      }, u$1$1.prototype.readDoubleLE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 8, this.length), i$1.read(this, t6, true, 52, 8);
      }, u$1$1.prototype.readDoubleBE = function(t6, r7) {
        return t6 >>>= 0, r7 || x(t6, 8, this.length), i$1.read(this, t6, false, 52, 8);
      }, u$1$1.prototype.writeUIntLE = function(t6, r7, e7, n7) {
        (t6 = +t6, r7 >>>= 0, e7 >>>= 0, n7) || C(this, t6, r7, e7, Math.pow(2, 8 * e7) - 1, 0);
        var i6 = 1, o7 = 0;
        for (this[r7] = 255 & t6; ++o7 < e7 && (i6 *= 256); )
          this[r7 + o7] = t6 / i6 & 255;
        return r7 + e7;
      }, u$1$1.prototype.writeUIntBE = function(t6, r7, e7, n7) {
        (t6 = +t6, r7 >>>= 0, e7 >>>= 0, n7) || C(this, t6, r7, e7, Math.pow(2, 8 * e7) - 1, 0);
        var i6 = e7 - 1, o7 = 1;
        for (this[r7 + i6] = 255 & t6; --i6 >= 0 && (o7 *= 256); )
          this[r7 + i6] = t6 / o7 & 255;
        return r7 + e7;
      }, u$1$1.prototype.writeUInt8 = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 1, 255, 0), this[r7] = 255 & t6, r7 + 1;
      }, u$1$1.prototype.writeUInt16LE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 2, 65535, 0), this[r7] = 255 & t6, this[r7 + 1] = t6 >>> 8, r7 + 2;
      }, u$1$1.prototype.writeUInt16BE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 2, 65535, 0), this[r7] = t6 >>> 8, this[r7 + 1] = 255 & t6, r7 + 2;
      }, u$1$1.prototype.writeUInt32LE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 4, 4294967295, 0), this[r7 + 3] = t6 >>> 24, this[r7 + 2] = t6 >>> 16, this[r7 + 1] = t6 >>> 8, this[r7] = 255 & t6, r7 + 4;
      }, u$1$1.prototype.writeUInt32BE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 4, 4294967295, 0), this[r7] = t6 >>> 24, this[r7 + 1] = t6 >>> 16, this[r7 + 2] = t6 >>> 8, this[r7 + 3] = 255 & t6, r7 + 4;
      }, u$1$1.prototype.writeIntLE = function(t6, r7, e7, n7) {
        if (t6 = +t6, r7 >>>= 0, !n7) {
          var i6 = Math.pow(2, 8 * e7 - 1);
          C(this, t6, r7, e7, i6 - 1, -i6);
        }
        var o7 = 0, f6 = 1, u6 = 0;
        for (this[r7] = 255 & t6; ++o7 < e7 && (f6 *= 256); )
          t6 < 0 && 0 === u6 && 0 !== this[r7 + o7 - 1] && (u6 = 1), this[r7 + o7] = (t6 / f6 >> 0) - u6 & 255;
        return r7 + e7;
      }, u$1$1.prototype.writeIntBE = function(t6, r7, e7, n7) {
        if (t6 = +t6, r7 >>>= 0, !n7) {
          var i6 = Math.pow(2, 8 * e7 - 1);
          C(this, t6, r7, e7, i6 - 1, -i6);
        }
        var o7 = e7 - 1, f6 = 1, u6 = 0;
        for (this[r7 + o7] = 255 & t6; --o7 >= 0 && (f6 *= 256); )
          t6 < 0 && 0 === u6 && 0 !== this[r7 + o7 + 1] && (u6 = 1), this[r7 + o7] = (t6 / f6 >> 0) - u6 & 255;
        return r7 + e7;
      }, u$1$1.prototype.writeInt8 = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 1, 127, -128), t6 < 0 && (t6 = 255 + t6 + 1), this[r7] = 255 & t6, r7 + 1;
      }, u$1$1.prototype.writeInt16LE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 2, 32767, -32768), this[r7] = 255 & t6, this[r7 + 1] = t6 >>> 8, r7 + 2;
      }, u$1$1.prototype.writeInt16BE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 2, 32767, -32768), this[r7] = t6 >>> 8, this[r7 + 1] = 255 & t6, r7 + 2;
      }, u$1$1.prototype.writeInt32LE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 4, 2147483647, -2147483648), this[r7] = 255 & t6, this[r7 + 1] = t6 >>> 8, this[r7 + 2] = t6 >>> 16, this[r7 + 3] = t6 >>> 24, r7 + 4;
      }, u$1$1.prototype.writeInt32BE = function(t6, r7, e7) {
        return t6 = +t6, r7 >>>= 0, e7 || C(this, t6, r7, 4, 2147483647, -2147483648), t6 < 0 && (t6 = 4294967295 + t6 + 1), this[r7] = t6 >>> 24, this[r7 + 1] = t6 >>> 16, this[r7 + 2] = t6 >>> 8, this[r7 + 3] = 255 & t6, r7 + 4;
      }, u$1$1.prototype.writeFloatLE = function(t6, r7, e7) {
        return k(this, t6, r7, true, e7);
      }, u$1$1.prototype.writeFloatBE = function(t6, r7, e7) {
        return k(this, t6, r7, false, e7);
      }, u$1$1.prototype.writeDoubleLE = function(t6, r7, e7) {
        return M(this, t6, r7, true, e7);
      }, u$1$1.prototype.writeDoubleBE = function(t6, r7, e7) {
        return M(this, t6, r7, false, e7);
      }, u$1$1.prototype.copy = function(t6, r7, e7, n7) {
        if (!u$1$1.isBuffer(t6))
          throw new TypeError("argument should be a Buffer");
        if (e7 || (e7 = 0), n7 || 0 === n7 || (n7 = this.length), r7 >= t6.length && (r7 = t6.length), r7 || (r7 = 0), n7 > 0 && n7 < e7 && (n7 = e7), n7 === e7)
          return 0;
        if (0 === t6.length || 0 === this.length)
          return 0;
        if (r7 < 0)
          throw new RangeError("targetStart out of bounds");
        if (e7 < 0 || e7 >= this.length)
          throw new RangeError("Index out of range");
        if (n7 < 0)
          throw new RangeError("sourceEnd out of bounds");
        n7 > this.length && (n7 = this.length), t6.length - r7 < n7 - e7 && (n7 = t6.length - r7 + e7);
        var i6 = n7 - e7;
        if (this === t6 && "function" == typeof Uint8Array.prototype.copyWithin)
          this.copyWithin(r7, e7, n7);
        else if (this === t6 && e7 < r7 && r7 < n7)
          for (var o7 = i6 - 1; o7 >= 0; --o7)
            t6[o7 + r7] = this[o7 + e7];
        else
          Uint8Array.prototype.set.call(t6, this.subarray(e7, n7), r7);
        return i6;
      }, u$1$1.prototype.fill = function(t6, r7, e7, n7) {
        if ("string" == typeof t6) {
          if ("string" == typeof r7 ? (n7 = r7, r7 = 0, e7 = this.length) : "string" == typeof e7 && (n7 = e7, e7 = this.length), void 0 !== n7 && "string" != typeof n7)
            throw new TypeError("encoding must be a string");
          if ("string" == typeof n7 && !u$1$1.isEncoding(n7))
            throw new TypeError("Unknown encoding: " + n7);
          if (1 === t6.length) {
            var i6 = t6.charCodeAt(0);
            ("utf8" === n7 && i6 < 128 || "latin1" === n7) && (t6 = i6);
          }
        } else
          "number" == typeof t6 ? t6 &= 255 : "boolean" == typeof t6 && (t6 = Number(t6));
        if (r7 < 0 || this.length < r7 || this.length < e7)
          throw new RangeError("Out of range index");
        if (e7 <= r7)
          return this;
        var o7;
        if (r7 >>>= 0, e7 = void 0 === e7 ? this.length : e7 >>> 0, t6 || (t6 = 0), "number" == typeof t6)
          for (o7 = r7; o7 < e7; ++o7)
            this[o7] = t6;
        else {
          var f6 = u$1$1.isBuffer(t6) ? t6 : u$1$1.from(t6, n7), s5 = f6.length;
          if (0 === s5)
            throw new TypeError('The value "' + t6 + '" is invalid for argument "value"');
          for (o7 = 0; o7 < e7 - r7; ++o7)
            this[o7 + r7] = f6[o7 % s5];
        }
        return this;
      };
      j = /[^+/0-9A-Za-z-_]/g;
      Y = function() {
        for (var t6 = new Array(256), r7 = 0; r7 < 16; ++r7)
          for (var e7 = 16 * r7, n7 = 0; n7 < 16; ++n7)
            t6[e7 + n7] = "0123456789abcdef"[r7] + "0123456789abcdef"[n7];
        return t6;
      }();
      e$1$1.Buffer;
      e$1$1.INSPECT_MAX_BYTES;
      e$1$1.kMaxLength;
      e2 = {};
      n2 = e$1$1;
      o2 = n2.Buffer;
      o2.from && o2.alloc && o2.allocUnsafe && o2.allocUnsafeSlow ? e2 = n2 : (t2(n2, e2), e2.Buffer = f2), f2.prototype = Object.create(o2.prototype), t2(o2, f2), f2.from = function(r7, e7, n7) {
        if ("number" == typeof r7)
          throw new TypeError("Argument must not be a number");
        return o2(r7, e7, n7);
      }, f2.alloc = function(r7, e7, n7) {
        if ("number" != typeof r7)
          throw new TypeError("Argument must be a number");
        var t6 = o2(r7);
        return void 0 !== e7 ? "string" == typeof n7 ? t6.fill(e7, n7) : t6.fill(e7) : t6.fill(0), t6;
      }, f2.allocUnsafe = function(r7) {
        if ("number" != typeof r7)
          throw new TypeError("Argument must be a number");
        return o2(r7);
      }, f2.allocUnsafeSlow = function(r7) {
        if ("number" != typeof r7)
          throw new TypeError("Argument must be a number");
        return n2.SlowBuffer(r7);
      };
      u2 = e2;
      e$1 = {};
      s2 = u2.Buffer;
      i2 = s2.isEncoding || function(t6) {
        switch ((t6 = "" + t6) && t6.toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
          case "raw":
            return true;
          default:
            return false;
        }
      };
      e$1.StringDecoder = a2, a2.prototype.write = function(t6) {
        if (0 === t6.length)
          return "";
        var e7, s5;
        if (this.lastNeed) {
          if (void 0 === (e7 = this.fillLast(t6)))
            return "";
          s5 = this.lastNeed, this.lastNeed = 0;
        } else
          s5 = 0;
        return s5 < t6.length ? e7 ? e7 + this.text(t6, s5) : this.text(t6, s5) : e7 || "";
      }, a2.prototype.end = function(t6) {
        var e7 = t6 && t6.length ? this.write(t6) : "";
        return this.lastNeed ? e7 + "\uFFFD" : e7;
      }, a2.prototype.text = function(t6, e7) {
        var s5 = function(t7, e8, s6) {
          var i7 = e8.length - 1;
          if (i7 < s6)
            return 0;
          var a6 = r2(e8[i7]);
          if (a6 >= 0)
            return a6 > 0 && (t7.lastNeed = a6 - 1), a6;
          if (--i7 < s6 || -2 === a6)
            return 0;
          if ((a6 = r2(e8[i7])) >= 0)
            return a6 > 0 && (t7.lastNeed = a6 - 2), a6;
          if (--i7 < s6 || -2 === a6)
            return 0;
          if ((a6 = r2(e8[i7])) >= 0)
            return a6 > 0 && (2 === a6 ? a6 = 0 : t7.lastNeed = a6 - 3), a6;
          return 0;
        }(this, t6, e7);
        if (!this.lastNeed)
          return t6.toString("utf8", e7);
        this.lastTotal = s5;
        var i6 = t6.length - (s5 - this.lastNeed);
        return t6.copy(this.lastChar, 0, i6), t6.toString("utf8", e7, i6);
      }, a2.prototype.fillLast = function(t6) {
        if (this.lastNeed <= t6.length)
          return t6.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
        t6.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, t6.length), this.lastNeed -= t6.length;
      };
      e$1.StringDecoder;
      e$1.StringDecoder;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/string_decoder.js
  var string_decoder_exports = {};
  __export(string_decoder_exports, {
    StringDecoder: () => StringDecoder,
    default: () => e$1
  });
  var StringDecoder;
  var init_string_decoder = __esm({
    "node_modules/@jspm/core/nodelibs/browser/string_decoder.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      init_chunk_4ccc3a29();
      init_chunk_4ccc3a29();
      StringDecoder = e$1.StringDecoder;
    }
  });

  // node_modules/readable-stream/lib/internal/streams/from.js
  var require_from = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/from.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = require_primordials();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = require_errors().codes;
      function from(Readable, iterable, opts) {
        let iterator;
        if (typeof iterable === "string" || iterable instanceof Buffer3) {
          return new Readable({
            objectMode: true,
            ...opts,
            read() {
              this.push(iterable);
              this.push(null);
            }
          });
        }
        let isAsync;
        if (iterable && iterable[SymbolAsyncIterator]) {
          isAsync = true;
          iterator = iterable[SymbolAsyncIterator]();
        } else if (iterable && iterable[SymbolIterator]) {
          isAsync = false;
          iterator = iterable[SymbolIterator]();
        } else {
          throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
        }
        const readable = new Readable({
          objectMode: true,
          highWaterMark: 1,
          // TODO(ronag): What options should be allowed?
          ...opts
        });
        let reading = false;
        readable._read = function() {
          if (!reading) {
            reading = true;
            next();
          }
        };
        readable._destroy = function(error, cb) {
          PromisePrototypeThen(
            close(error),
            () => process3.nextTick(cb, error),
            // nextTick is here in case cb throws
            (e7) => process3.nextTick(cb, e7 || error)
          );
        };
        async function close(error) {
          const hadError = error !== void 0 && error !== null;
          const hasThrow = typeof iterator.throw === "function";
          if (hadError && hasThrow) {
            const { value, done } = await iterator.throw(error);
            await value;
            if (done) {
              return;
            }
          }
          if (typeof iterator.return === "function") {
            const { value } = await iterator.return();
            await value;
          }
        }
        async function next() {
          for (; ; ) {
            try {
              const { value, done } = isAsync ? await iterator.next() : iterator.next();
              if (done) {
                readable.push(null);
              } else {
                const res = value && typeof value.then === "function" ? await value : value;
                if (res === null) {
                  reading = false;
                  throw new ERR_STREAM_NULL_VALUES();
                } else if (readable.push(res)) {
                  continue;
                } else {
                  reading = false;
                }
              }
            } catch (err) {
              readable.destroy(err);
            }
            break;
          }
        }
        return readable;
      }
      module.exports = from;
    }
  });

  // node_modules/readable-stream/lib/internal/streams/readable.js
  var require_readable = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/readable.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var {
        ArrayPrototypeIndexOf,
        NumberIsInteger,
        NumberIsNaN,
        NumberParseInt,
        ObjectDefineProperties,
        ObjectKeys,
        ObjectSetPrototypeOf,
        Promise: Promise2,
        SafeSet,
        SymbolAsyncIterator,
        Symbol: Symbol2
      } = require_primordials();
      module.exports = Readable;
      Readable.ReadableState = ReadableState;
      var { EventEmitter: EE } = (init_events(), __toCommonJS(events_exports));
      var { Stream, prependListener: prependListener2 } = require_legacy();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var { addAbortSignal } = require_add_abort_signal();
      var eos = require_end_of_stream();
      var debug = require_util().debuglog("stream", (fn) => {
        debug = fn;
      });
      var BufferList = require_buffer_list();
      var destroyImpl = require_destroy();
      var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
      var {
        aggregateTwoErrors,
        codes: {
          ERR_INVALID_ARG_TYPE,
          ERR_METHOD_NOT_IMPLEMENTED,
          ERR_OUT_OF_RANGE,
          ERR_STREAM_PUSH_AFTER_EOF,
          ERR_STREAM_UNSHIFT_AFTER_END_EVENT
        }
      } = require_errors();
      var { validateObject } = require_validators();
      var kPaused = Symbol2("kPaused");
      var { StringDecoder: StringDecoder2 } = (init_string_decoder(), __toCommonJS(string_decoder_exports));
      var from = require_from();
      ObjectSetPrototypeOf(Readable.prototype, Stream.prototype);
      ObjectSetPrototypeOf(Readable, Stream);
      var nop = () => {
      };
      var { errorOrDestroy } = destroyImpl;
      function ReadableState(options, stream, isDuplex) {
        if (typeof isDuplex !== "boolean")
          isDuplex = stream instanceof require_duplex();
        this.objectMode = !!(options && options.objectMode);
        if (isDuplex)
          this.objectMode = this.objectMode || !!(options && options.readableObjectMode);
        this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
        this.buffer = new BufferList();
        this.length = 0;
        this.pipes = [];
        this.flowing = null;
        this.ended = false;
        this.endEmitted = false;
        this.reading = false;
        this.constructed = true;
        this.sync = true;
        this.needReadable = false;
        this.emittedReadable = false;
        this.readableListening = false;
        this.resumeScheduled = false;
        this[kPaused] = null;
        this.errorEmitted = false;
        this.emitClose = !options || options.emitClose !== false;
        this.autoDestroy = !options || options.autoDestroy !== false;
        this.destroyed = false;
        this.errored = null;
        this.closed = false;
        this.closeEmitted = false;
        this.defaultEncoding = options && options.defaultEncoding || "utf8";
        this.awaitDrainWriters = null;
        this.multiAwaitDrain = false;
        this.readingMore = false;
        this.dataEmitted = false;
        this.decoder = null;
        this.encoding = null;
        if (options && options.encoding) {
          this.decoder = new StringDecoder2(options.encoding);
          this.encoding = options.encoding;
        }
      }
      function Readable(options) {
        if (!(this instanceof Readable))
          return new Readable(options);
        const isDuplex = this instanceof require_duplex();
        this._readableState = new ReadableState(options, this, isDuplex);
        if (options) {
          if (typeof options.read === "function")
            this._read = options.read;
          if (typeof options.destroy === "function")
            this._destroy = options.destroy;
          if (typeof options.construct === "function")
            this._construct = options.construct;
          if (options.signal && !isDuplex)
            addAbortSignal(options.signal, this);
        }
        Stream.call(this, options);
        destroyImpl.construct(this, () => {
          if (this._readableState.needReadable) {
            maybeReadMore(this, this._readableState);
          }
        });
      }
      Readable.prototype.destroy = destroyImpl.destroy;
      Readable.prototype._undestroy = destroyImpl.undestroy;
      Readable.prototype._destroy = function(err, cb) {
        cb(err);
      };
      Readable.prototype[EE.captureRejectionSymbol] = function(err) {
        this.destroy(err);
      };
      Readable.prototype.push = function(chunk, encoding) {
        return readableAddChunk(this, chunk, encoding, false);
      };
      Readable.prototype.unshift = function(chunk, encoding) {
        return readableAddChunk(this, chunk, encoding, true);
      };
      function readableAddChunk(stream, chunk, encoding, addToFront) {
        debug("readableAddChunk", chunk);
        const state = stream._readableState;
        let err;
        if (!state.objectMode) {
          if (typeof chunk === "string") {
            encoding = encoding || state.defaultEncoding;
            if (state.encoding !== encoding) {
              if (addToFront && state.encoding) {
                chunk = Buffer3.from(chunk, encoding).toString(state.encoding);
              } else {
                chunk = Buffer3.from(chunk, encoding);
                encoding = "";
              }
            }
          } else if (chunk instanceof Buffer3) {
            encoding = "";
          } else if (Stream._isUint8Array(chunk)) {
            chunk = Stream._uint8ArrayToBuffer(chunk);
            encoding = "";
          } else if (chunk != null) {
            err = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
          }
        }
        if (err) {
          errorOrDestroy(stream, err);
        } else if (chunk === null) {
          state.reading = false;
          onEofChunk(stream, state);
        } else if (state.objectMode || chunk && chunk.length > 0) {
          if (addToFront) {
            if (state.endEmitted)
              errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
            else if (state.destroyed || state.errored)
              return false;
            else
              addChunk(stream, state, chunk, true);
          } else if (state.ended) {
            errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
          } else if (state.destroyed || state.errored) {
            return false;
          } else {
            state.reading = false;
            if (state.decoder && !encoding) {
              chunk = state.decoder.write(chunk);
              if (state.objectMode || chunk.length !== 0)
                addChunk(stream, state, chunk, false);
              else
                maybeReadMore(stream, state);
            } else {
              addChunk(stream, state, chunk, false);
            }
          }
        } else if (!addToFront) {
          state.reading = false;
          maybeReadMore(stream, state);
        }
        return !state.ended && (state.length < state.highWaterMark || state.length === 0);
      }
      function addChunk(stream, state, chunk, addToFront) {
        if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
          if (state.multiAwaitDrain) {
            state.awaitDrainWriters.clear();
          } else {
            state.awaitDrainWriters = null;
          }
          state.dataEmitted = true;
          stream.emit("data", chunk);
        } else {
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront)
            state.buffer.unshift(chunk);
          else
            state.buffer.push(chunk);
          if (state.needReadable)
            emitReadable(stream);
        }
        maybeReadMore(stream, state);
      }
      Readable.prototype.isPaused = function() {
        const state = this._readableState;
        return state[kPaused] === true || state.flowing === false;
      };
      Readable.prototype.setEncoding = function(enc) {
        const decoder = new StringDecoder2(enc);
        this._readableState.decoder = decoder;
        this._readableState.encoding = this._readableState.decoder.encoding;
        const buffer = this._readableState.buffer;
        let content = "";
        for (const data of buffer) {
          content += decoder.write(data);
        }
        buffer.clear();
        if (content !== "")
          buffer.push(content);
        this._readableState.length = content.length;
        return this;
      };
      var MAX_HWM = 1073741824;
      function computeNewHighWaterMark(n7) {
        if (n7 > MAX_HWM) {
          throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n7);
        } else {
          n7--;
          n7 |= n7 >>> 1;
          n7 |= n7 >>> 2;
          n7 |= n7 >>> 4;
          n7 |= n7 >>> 8;
          n7 |= n7 >>> 16;
          n7++;
        }
        return n7;
      }
      function howMuchToRead(n7, state) {
        if (n7 <= 0 || state.length === 0 && state.ended)
          return 0;
        if (state.objectMode)
          return 1;
        if (NumberIsNaN(n7)) {
          if (state.flowing && state.length)
            return state.buffer.first().length;
          return state.length;
        }
        if (n7 <= state.length)
          return n7;
        return state.ended ? state.length : 0;
      }
      Readable.prototype.read = function(n7) {
        debug("read", n7);
        if (n7 === void 0) {
          n7 = NaN;
        } else if (!NumberIsInteger(n7)) {
          n7 = NumberParseInt(n7, 10);
        }
        const state = this._readableState;
        const nOrig = n7;
        if (n7 > state.highWaterMark)
          state.highWaterMark = computeNewHighWaterMark(n7);
        if (n7 !== 0)
          state.emittedReadable = false;
        if (n7 === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
          debug("read: emitReadable", state.length, state.ended);
          if (state.length === 0 && state.ended)
            endReadable(this);
          else
            emitReadable(this);
          return null;
        }
        n7 = howMuchToRead(n7, state);
        if (n7 === 0 && state.ended) {
          if (state.length === 0)
            endReadable(this);
          return null;
        }
        let doRead = state.needReadable;
        debug("need readable", doRead);
        if (state.length === 0 || state.length - n7 < state.highWaterMark) {
          doRead = true;
          debug("length less than watermark", doRead);
        }
        if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
          doRead = false;
          debug("reading, ended or constructing", doRead);
        } else if (doRead) {
          debug("do read");
          state.reading = true;
          state.sync = true;
          if (state.length === 0)
            state.needReadable = true;
          try {
            this._read(state.highWaterMark);
          } catch (err) {
            errorOrDestroy(this, err);
          }
          state.sync = false;
          if (!state.reading)
            n7 = howMuchToRead(nOrig, state);
        }
        let ret;
        if (n7 > 0)
          ret = fromList(n7, state);
        else
          ret = null;
        if (ret === null) {
          state.needReadable = state.length <= state.highWaterMark;
          n7 = 0;
        } else {
          state.length -= n7;
          if (state.multiAwaitDrain) {
            state.awaitDrainWriters.clear();
          } else {
            state.awaitDrainWriters = null;
          }
        }
        if (state.length === 0) {
          if (!state.ended)
            state.needReadable = true;
          if (nOrig !== n7 && state.ended)
            endReadable(this);
        }
        if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
          state.dataEmitted = true;
          this.emit("data", ret);
        }
        return ret;
      };
      function onEofChunk(stream, state) {
        debug("onEofChunk");
        if (state.ended)
          return;
        if (state.decoder) {
          const chunk = state.decoder.end();
          if (chunk && chunk.length) {
            state.buffer.push(chunk);
            state.length += state.objectMode ? 1 : chunk.length;
          }
        }
        state.ended = true;
        if (state.sync) {
          emitReadable(stream);
        } else {
          state.needReadable = false;
          state.emittedReadable = true;
          emitReadable_(stream);
        }
      }
      function emitReadable(stream) {
        const state = stream._readableState;
        debug("emitReadable", state.needReadable, state.emittedReadable);
        state.needReadable = false;
        if (!state.emittedReadable) {
          debug("emitReadable", state.flowing);
          state.emittedReadable = true;
          process3.nextTick(emitReadable_, stream);
        }
      }
      function emitReadable_(stream) {
        const state = stream._readableState;
        debug("emitReadable_", state.destroyed, state.length, state.ended);
        if (!state.destroyed && !state.errored && (state.length || state.ended)) {
          stream.emit("readable");
          state.emittedReadable = false;
        }
        state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
        flow(stream);
      }
      function maybeReadMore(stream, state) {
        if (!state.readingMore && state.constructed) {
          state.readingMore = true;
          process3.nextTick(maybeReadMore_, stream, state);
        }
      }
      function maybeReadMore_(stream, state) {
        while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
          const len = state.length;
          debug("maybeReadMore read 0");
          stream.read(0);
          if (len === state.length)
            break;
        }
        state.readingMore = false;
      }
      Readable.prototype._read = function(n7) {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
      };
      Readable.prototype.pipe = function(dest, pipeOpts) {
        const src = this;
        const state = this._readableState;
        if (state.pipes.length === 1) {
          if (!state.multiAwaitDrain) {
            state.multiAwaitDrain = true;
            state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
          }
        }
        state.pipes.push(dest);
        debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
        const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process3.stdout && dest !== process3.stderr;
        const endFn = doEnd ? onend : unpipe;
        if (state.endEmitted)
          process3.nextTick(endFn);
        else
          src.once("end", endFn);
        dest.on("unpipe", onunpipe);
        function onunpipe(readable, unpipeInfo) {
          debug("onunpipe");
          if (readable === src) {
            if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
              unpipeInfo.hasUnpiped = true;
              cleanup();
            }
          }
        }
        function onend() {
          debug("onend");
          dest.end();
        }
        let ondrain;
        let cleanedUp = false;
        function cleanup() {
          debug("cleanup");
          dest.removeListener("close", onclose);
          dest.removeListener("finish", onfinish);
          if (ondrain) {
            dest.removeListener("drain", ondrain);
          }
          dest.removeListener("error", onerror);
          dest.removeListener("unpipe", onunpipe);
          src.removeListener("end", onend);
          src.removeListener("end", unpipe);
          src.removeListener("data", ondata);
          cleanedUp = true;
          if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain))
            ondrain();
        }
        function pause() {
          if (!cleanedUp) {
            if (state.pipes.length === 1 && state.pipes[0] === dest) {
              debug("false write response, pause", 0);
              state.awaitDrainWriters = dest;
              state.multiAwaitDrain = false;
            } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
              debug("false write response, pause", state.awaitDrainWriters.size);
              state.awaitDrainWriters.add(dest);
            }
            src.pause();
          }
          if (!ondrain) {
            ondrain = pipeOnDrain(src, dest);
            dest.on("drain", ondrain);
          }
        }
        src.on("data", ondata);
        function ondata(chunk) {
          debug("ondata");
          const ret = dest.write(chunk);
          debug("dest.write", ret);
          if (ret === false) {
            pause();
          }
        }
        function onerror(er) {
          debug("onerror", er);
          unpipe();
          dest.removeListener("error", onerror);
          if (dest.listenerCount("error") === 0) {
            const s5 = dest._writableState || dest._readableState;
            if (s5 && !s5.errorEmitted) {
              errorOrDestroy(dest, er);
            } else {
              dest.emit("error", er);
            }
          }
        }
        prependListener2(dest, "error", onerror);
        function onclose() {
          dest.removeListener("finish", onfinish);
          unpipe();
        }
        dest.once("close", onclose);
        function onfinish() {
          debug("onfinish");
          dest.removeListener("close", onclose);
          unpipe();
        }
        dest.once("finish", onfinish);
        function unpipe() {
          debug("unpipe");
          src.unpipe(dest);
        }
        dest.emit("pipe", src);
        if (dest.writableNeedDrain === true) {
          if (state.flowing) {
            pause();
          }
        } else if (!state.flowing) {
          debug("pipe resume");
          src.resume();
        }
        return dest;
      };
      function pipeOnDrain(src, dest) {
        return function pipeOnDrainFunctionResult() {
          const state = src._readableState;
          if (state.awaitDrainWriters === dest) {
            debug("pipeOnDrain", 1);
            state.awaitDrainWriters = null;
          } else if (state.multiAwaitDrain) {
            debug("pipeOnDrain", state.awaitDrainWriters.size);
            state.awaitDrainWriters.delete(dest);
          }
          if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
            src.resume();
          }
        };
      }
      Readable.prototype.unpipe = function(dest) {
        const state = this._readableState;
        const unpipeInfo = {
          hasUnpiped: false
        };
        if (state.pipes.length === 0)
          return this;
        if (!dest) {
          const dests = state.pipes;
          state.pipes = [];
          this.pause();
          for (let i6 = 0; i6 < dests.length; i6++)
            dests[i6].emit("unpipe", this, {
              hasUnpiped: false
            });
          return this;
        }
        const index = ArrayPrototypeIndexOf(state.pipes, dest);
        if (index === -1)
          return this;
        state.pipes.splice(index, 1);
        if (state.pipes.length === 0)
          this.pause();
        dest.emit("unpipe", this, unpipeInfo);
        return this;
      };
      Readable.prototype.on = function(ev, fn) {
        const res = Stream.prototype.on.call(this, ev, fn);
        const state = this._readableState;
        if (ev === "data") {
          state.readableListening = this.listenerCount("readable") > 0;
          if (state.flowing !== false)
            this.resume();
        } else if (ev === "readable") {
          if (!state.endEmitted && !state.readableListening) {
            state.readableListening = state.needReadable = true;
            state.flowing = false;
            state.emittedReadable = false;
            debug("on readable", state.length, state.reading);
            if (state.length) {
              emitReadable(this);
            } else if (!state.reading) {
              process3.nextTick(nReadingNextTick, this);
            }
          }
        }
        return res;
      };
      Readable.prototype.addListener = Readable.prototype.on;
      Readable.prototype.removeListener = function(ev, fn) {
        const res = Stream.prototype.removeListener.call(this, ev, fn);
        if (ev === "readable") {
          process3.nextTick(updateReadableListening, this);
        }
        return res;
      };
      Readable.prototype.off = Readable.prototype.removeListener;
      Readable.prototype.removeAllListeners = function(ev) {
        const res = Stream.prototype.removeAllListeners.apply(this, arguments);
        if (ev === "readable" || ev === void 0) {
          process3.nextTick(updateReadableListening, this);
        }
        return res;
      };
      function updateReadableListening(self2) {
        const state = self2._readableState;
        state.readableListening = self2.listenerCount("readable") > 0;
        if (state.resumeScheduled && state[kPaused] === false) {
          state.flowing = true;
        } else if (self2.listenerCount("data") > 0) {
          self2.resume();
        } else if (!state.readableListening) {
          state.flowing = null;
        }
      }
      function nReadingNextTick(self2) {
        debug("readable nexttick read 0");
        self2.read(0);
      }
      Readable.prototype.resume = function() {
        const state = this._readableState;
        if (!state.flowing) {
          debug("resume");
          state.flowing = !state.readableListening;
          resume(this, state);
        }
        state[kPaused] = false;
        return this;
      };
      function resume(stream, state) {
        if (!state.resumeScheduled) {
          state.resumeScheduled = true;
          process3.nextTick(resume_, stream, state);
        }
      }
      function resume_(stream, state) {
        debug("resume", state.reading);
        if (!state.reading) {
          stream.read(0);
        }
        state.resumeScheduled = false;
        stream.emit("resume");
        flow(stream);
        if (state.flowing && !state.reading)
          stream.read(0);
      }
      Readable.prototype.pause = function() {
        debug("call pause flowing=%j", this._readableState.flowing);
        if (this._readableState.flowing !== false) {
          debug("pause");
          this._readableState.flowing = false;
          this.emit("pause");
        }
        this._readableState[kPaused] = true;
        return this;
      };
      function flow(stream) {
        const state = stream._readableState;
        debug("flow", state.flowing);
        while (state.flowing && stream.read() !== null)
          ;
      }
      Readable.prototype.wrap = function(stream) {
        let paused = false;
        stream.on("data", (chunk) => {
          if (!this.push(chunk) && stream.pause) {
            paused = true;
            stream.pause();
          }
        });
        stream.on("end", () => {
          this.push(null);
        });
        stream.on("error", (err) => {
          errorOrDestroy(this, err);
        });
        stream.on("close", () => {
          this.destroy();
        });
        stream.on("destroy", () => {
          this.destroy();
        });
        this._read = () => {
          if (paused && stream.resume) {
            paused = false;
            stream.resume();
          }
        };
        const streamKeys = ObjectKeys(stream);
        for (let j2 = 1; j2 < streamKeys.length; j2++) {
          const i6 = streamKeys[j2];
          if (this[i6] === void 0 && typeof stream[i6] === "function") {
            this[i6] = stream[i6].bind(stream);
          }
        }
        return this;
      };
      Readable.prototype[SymbolAsyncIterator] = function() {
        return streamToAsyncIterator(this);
      };
      Readable.prototype.iterator = function(options) {
        if (options !== void 0) {
          validateObject(options, "options");
        }
        return streamToAsyncIterator(this, options);
      };
      function streamToAsyncIterator(stream, options) {
        if (typeof stream.read !== "function") {
          stream = Readable.wrap(stream, {
            objectMode: true
          });
        }
        const iter = createAsyncIterator(stream, options);
        iter.stream = stream;
        return iter;
      }
      async function* createAsyncIterator(stream, options) {
        let callback = nop;
        function next(resolve2) {
          if (this === stream) {
            callback();
            callback = nop;
          } else {
            callback = resolve2;
          }
        }
        stream.on("readable", next);
        let error;
        const cleanup = eos(
          stream,
          {
            writable: false
          },
          (err) => {
            error = err ? aggregateTwoErrors(error, err) : null;
            callback();
            callback = nop;
          }
        );
        try {
          while (true) {
            const chunk = stream.destroyed ? null : stream.read();
            if (chunk !== null) {
              yield chunk;
            } else if (error) {
              throw error;
            } else if (error === null) {
              return;
            } else {
              await new Promise2(next);
            }
          }
        } catch (err) {
          error = aggregateTwoErrors(error, err);
          throw error;
        } finally {
          if ((error || (options === null || options === void 0 ? void 0 : options.destroyOnReturn) !== false) && (error === void 0 || stream._readableState.autoDestroy)) {
            destroyImpl.destroyer(stream, null);
          } else {
            stream.off("readable", next);
            cleanup();
          }
        }
      }
      ObjectDefineProperties(Readable.prototype, {
        readable: {
          __proto__: null,
          get() {
            const r7 = this._readableState;
            return !!r7 && r7.readable !== false && !r7.destroyed && !r7.errorEmitted && !r7.endEmitted;
          },
          set(val) {
            if (this._readableState) {
              this._readableState.readable = !!val;
            }
          }
        },
        readableDidRead: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return this._readableState.dataEmitted;
          }
        },
        readableAborted: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return !!(this._readableState.readable !== false && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
          }
        },
        readableHighWaterMark: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return this._readableState.highWaterMark;
          }
        },
        readableBuffer: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return this._readableState && this._readableState.buffer;
          }
        },
        readableFlowing: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return this._readableState.flowing;
          },
          set: function(state) {
            if (this._readableState) {
              this._readableState.flowing = state;
            }
          }
        },
        readableLength: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState.length;
          }
        },
        readableObjectMode: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState ? this._readableState.objectMode : false;
          }
        },
        readableEncoding: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState ? this._readableState.encoding : null;
          }
        },
        errored: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState ? this._readableState.errored : null;
          }
        },
        closed: {
          __proto__: null,
          get() {
            return this._readableState ? this._readableState.closed : false;
          }
        },
        destroyed: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState ? this._readableState.destroyed : false;
          },
          set(value) {
            if (!this._readableState) {
              return;
            }
            this._readableState.destroyed = value;
          }
        },
        readableEnded: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._readableState ? this._readableState.endEmitted : false;
          }
        }
      });
      ObjectDefineProperties(ReadableState.prototype, {
        // Legacy getter for `pipesCount`.
        pipesCount: {
          __proto__: null,
          get() {
            return this.pipes.length;
          }
        },
        // Legacy property for `paused`.
        paused: {
          __proto__: null,
          get() {
            return this[kPaused] !== false;
          },
          set(value) {
            this[kPaused] = !!value;
          }
        }
      });
      Readable._fromList = fromList;
      function fromList(n7, state) {
        if (state.length === 0)
          return null;
        let ret;
        if (state.objectMode)
          ret = state.buffer.shift();
        else if (!n7 || n7 >= state.length) {
          if (state.decoder)
            ret = state.buffer.join("");
          else if (state.buffer.length === 1)
            ret = state.buffer.first();
          else
            ret = state.buffer.concat(state.length);
          state.buffer.clear();
        } else {
          ret = state.buffer.consume(n7, state.decoder);
        }
        return ret;
      }
      function endReadable(stream) {
        const state = stream._readableState;
        debug("endReadable", state.endEmitted);
        if (!state.endEmitted) {
          state.ended = true;
          process3.nextTick(endReadableNT, state, stream);
        }
      }
      function endReadableNT(state, stream) {
        debug("endReadableNT", state.endEmitted, state.length);
        if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
          state.endEmitted = true;
          stream.emit("end");
          if (stream.writable && stream.allowHalfOpen === false) {
            process3.nextTick(endWritableNT, stream);
          } else if (state.autoDestroy) {
            const wState = stream._writableState;
            const autoDestroy = !wState || wState.autoDestroy && // We don't expect the writable to ever 'finish'
            // if writable is explicitly set to false.
            (wState.finished || wState.writable === false);
            if (autoDestroy) {
              stream.destroy();
            }
          }
        }
      }
      function endWritableNT(stream) {
        const writable = stream.writable && !stream.writableEnded && !stream.destroyed;
        if (writable) {
          stream.end();
        }
      }
      Readable.from = function(iterable, opts) {
        return from(Readable, iterable, opts);
      };
      var webStreamsAdapters;
      function lazyWebStreams() {
        if (webStreamsAdapters === void 0)
          webStreamsAdapters = {};
        return webStreamsAdapters;
      }
      Readable.fromWeb = function(readableStream, options) {
        return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
      };
      Readable.toWeb = function(streamReadable, options) {
        return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
      };
      Readable.wrap = function(src, options) {
        var _ref, _src$readableObjectMo;
        return new Readable({
          objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== void 0 ? _src$readableObjectMo : src.objectMode) !== null && _ref !== void 0 ? _ref : true,
          ...options,
          destroy(err, callback) {
            destroyImpl.destroyer(src, err);
            callback(err);
          }
        }).wrap(src);
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/writable.js
  var require_writable = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/writable.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var {
        ArrayPrototypeSlice,
        Error: Error2,
        FunctionPrototypeSymbolHasInstance,
        ObjectDefineProperty,
        ObjectDefineProperties,
        ObjectSetPrototypeOf,
        StringPrototypeToLowerCase,
        Symbol: Symbol2,
        SymbolHasInstance
      } = require_primordials();
      module.exports = Writable;
      Writable.WritableState = WritableState;
      var { EventEmitter: EE } = (init_events(), __toCommonJS(events_exports));
      var Stream = require_legacy().Stream;
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var destroyImpl = require_destroy();
      var { addAbortSignal } = require_add_abort_signal();
      var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
      var {
        ERR_INVALID_ARG_TYPE,
        ERR_METHOD_NOT_IMPLEMENTED,
        ERR_MULTIPLE_CALLBACK,
        ERR_STREAM_CANNOT_PIPE,
        ERR_STREAM_DESTROYED,
        ERR_STREAM_ALREADY_FINISHED,
        ERR_STREAM_NULL_VALUES,
        ERR_STREAM_WRITE_AFTER_END,
        ERR_UNKNOWN_ENCODING
      } = require_errors().codes;
      var { errorOrDestroy } = destroyImpl;
      ObjectSetPrototypeOf(Writable.prototype, Stream.prototype);
      ObjectSetPrototypeOf(Writable, Stream);
      function nop() {
      }
      var kOnFinished = Symbol2("kOnFinished");
      function WritableState(options, stream, isDuplex) {
        if (typeof isDuplex !== "boolean")
          isDuplex = stream instanceof require_duplex();
        this.objectMode = !!(options && options.objectMode);
        if (isDuplex)
          this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
        this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
        this.finalCalled = false;
        this.needDrain = false;
        this.ending = false;
        this.ended = false;
        this.finished = false;
        this.destroyed = false;
        const noDecode = !!(options && options.decodeStrings === false);
        this.decodeStrings = !noDecode;
        this.defaultEncoding = options && options.defaultEncoding || "utf8";
        this.length = 0;
        this.writing = false;
        this.corked = 0;
        this.sync = true;
        this.bufferProcessing = false;
        this.onwrite = onwrite.bind(void 0, stream);
        this.writecb = null;
        this.writelen = 0;
        this.afterWriteTickInfo = null;
        resetBuffer(this);
        this.pendingcb = 0;
        this.constructed = true;
        this.prefinished = false;
        this.errorEmitted = false;
        this.emitClose = !options || options.emitClose !== false;
        this.autoDestroy = !options || options.autoDestroy !== false;
        this.errored = null;
        this.closed = false;
        this.closeEmitted = false;
        this[kOnFinished] = [];
      }
      function resetBuffer(state) {
        state.buffered = [];
        state.bufferedIndex = 0;
        state.allBuffers = true;
        state.allNoop = true;
      }
      WritableState.prototype.getBuffer = function getBuffer() {
        return ArrayPrototypeSlice(this.buffered, this.bufferedIndex);
      };
      ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
        __proto__: null,
        get() {
          return this.buffered.length - this.bufferedIndex;
        }
      });
      function Writable(options) {
        const isDuplex = this instanceof require_duplex();
        if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this))
          return new Writable(options);
        this._writableState = new WritableState(options, this, isDuplex);
        if (options) {
          if (typeof options.write === "function")
            this._write = options.write;
          if (typeof options.writev === "function")
            this._writev = options.writev;
          if (typeof options.destroy === "function")
            this._destroy = options.destroy;
          if (typeof options.final === "function")
            this._final = options.final;
          if (typeof options.construct === "function")
            this._construct = options.construct;
          if (options.signal)
            addAbortSignal(options.signal, this);
        }
        Stream.call(this, options);
        destroyImpl.construct(this, () => {
          const state = this._writableState;
          if (!state.writing) {
            clearBuffer(this, state);
          }
          finishMaybe(this, state);
        });
      }
      ObjectDefineProperty(Writable, SymbolHasInstance, {
        __proto__: null,
        value: function(object) {
          if (FunctionPrototypeSymbolHasInstance(this, object))
            return true;
          if (this !== Writable)
            return false;
          return object && object._writableState instanceof WritableState;
        }
      });
      Writable.prototype.pipe = function() {
        errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
      };
      function _write(stream, chunk, encoding, cb) {
        const state = stream._writableState;
        if (typeof encoding === "function") {
          cb = encoding;
          encoding = state.defaultEncoding;
        } else {
          if (!encoding)
            encoding = state.defaultEncoding;
          else if (encoding !== "buffer" && !Buffer3.isEncoding(encoding))
            throw new ERR_UNKNOWN_ENCODING(encoding);
          if (typeof cb !== "function")
            cb = nop;
        }
        if (chunk === null) {
          throw new ERR_STREAM_NULL_VALUES();
        } else if (!state.objectMode) {
          if (typeof chunk === "string") {
            if (state.decodeStrings !== false) {
              chunk = Buffer3.from(chunk, encoding);
              encoding = "buffer";
            }
          } else if (chunk instanceof Buffer3) {
            encoding = "buffer";
          } else if (Stream._isUint8Array(chunk)) {
            chunk = Stream._uint8ArrayToBuffer(chunk);
            encoding = "buffer";
          } else {
            throw new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
          }
        }
        let err;
        if (state.ending) {
          err = new ERR_STREAM_WRITE_AFTER_END();
        } else if (state.destroyed) {
          err = new ERR_STREAM_DESTROYED("write");
        }
        if (err) {
          process3.nextTick(cb, err);
          errorOrDestroy(stream, err, true);
          return err;
        }
        state.pendingcb++;
        return writeOrBuffer(stream, state, chunk, encoding, cb);
      }
      Writable.prototype.write = function(chunk, encoding, cb) {
        return _write(this, chunk, encoding, cb) === true;
      };
      Writable.prototype.cork = function() {
        this._writableState.corked++;
      };
      Writable.prototype.uncork = function() {
        const state = this._writableState;
        if (state.corked) {
          state.corked--;
          if (!state.writing)
            clearBuffer(this, state);
        }
      };
      Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
        if (typeof encoding === "string")
          encoding = StringPrototypeToLowerCase(encoding);
        if (!Buffer3.isEncoding(encoding))
          throw new ERR_UNKNOWN_ENCODING(encoding);
        this._writableState.defaultEncoding = encoding;
        return this;
      };
      function writeOrBuffer(stream, state, chunk, encoding, callback) {
        const len = state.objectMode ? 1 : chunk.length;
        state.length += len;
        const ret = state.length < state.highWaterMark;
        if (!ret)
          state.needDrain = true;
        if (state.writing || state.corked || state.errored || !state.constructed) {
          state.buffered.push({
            chunk,
            encoding,
            callback
          });
          if (state.allBuffers && encoding !== "buffer") {
            state.allBuffers = false;
          }
          if (state.allNoop && callback !== nop) {
            state.allNoop = false;
          }
        } else {
          state.writelen = len;
          state.writecb = callback;
          state.writing = true;
          state.sync = true;
          stream._write(chunk, encoding, state.onwrite);
          state.sync = false;
        }
        return ret && !state.errored && !state.destroyed;
      }
      function doWrite(stream, state, writev, len, chunk, encoding, cb) {
        state.writelen = len;
        state.writecb = cb;
        state.writing = true;
        state.sync = true;
        if (state.destroyed)
          state.onwrite(new ERR_STREAM_DESTROYED("write"));
        else if (writev)
          stream._writev(chunk, state.onwrite);
        else
          stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
      }
      function onwriteError(stream, state, er, cb) {
        --state.pendingcb;
        cb(er);
        errorBuffer(state);
        errorOrDestroy(stream, er);
      }
      function onwrite(stream, er) {
        const state = stream._writableState;
        const sync = state.sync;
        const cb = state.writecb;
        if (typeof cb !== "function") {
          errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK());
          return;
        }
        state.writing = false;
        state.writecb = null;
        state.length -= state.writelen;
        state.writelen = 0;
        if (er) {
          er.stack;
          if (!state.errored) {
            state.errored = er;
          }
          if (stream._readableState && !stream._readableState.errored) {
            stream._readableState.errored = er;
          }
          if (sync) {
            process3.nextTick(onwriteError, stream, state, er, cb);
          } else {
            onwriteError(stream, state, er, cb);
          }
        } else {
          if (state.buffered.length > state.bufferedIndex) {
            clearBuffer(stream, state);
          }
          if (sync) {
            if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
              state.afterWriteTickInfo.count++;
            } else {
              state.afterWriteTickInfo = {
                count: 1,
                cb,
                stream,
                state
              };
              process3.nextTick(afterWriteTick, state.afterWriteTickInfo);
            }
          } else {
            afterWrite(stream, state, 1, cb);
          }
        }
      }
      function afterWriteTick({ stream, state, count, cb }) {
        state.afterWriteTickInfo = null;
        return afterWrite(stream, state, count, cb);
      }
      function afterWrite(stream, state, count, cb) {
        const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
        if (needDrain) {
          state.needDrain = false;
          stream.emit("drain");
        }
        while (count-- > 0) {
          state.pendingcb--;
          cb();
        }
        if (state.destroyed) {
          errorBuffer(state);
        }
        finishMaybe(stream, state);
      }
      function errorBuffer(state) {
        if (state.writing) {
          return;
        }
        for (let n7 = state.bufferedIndex; n7 < state.buffered.length; ++n7) {
          var _state$errored;
          const { chunk, callback } = state.buffered[n7];
          const len = state.objectMode ? 1 : chunk.length;
          state.length -= len;
          callback(
            (_state$errored = state.errored) !== null && _state$errored !== void 0 ? _state$errored : new ERR_STREAM_DESTROYED("write")
          );
        }
        const onfinishCallbacks = state[kOnFinished].splice(0);
        for (let i6 = 0; i6 < onfinishCallbacks.length; i6++) {
          var _state$errored2;
          onfinishCallbacks[i6](
            (_state$errored2 = state.errored) !== null && _state$errored2 !== void 0 ? _state$errored2 : new ERR_STREAM_DESTROYED("end")
          );
        }
        resetBuffer(state);
      }
      function clearBuffer(stream, state) {
        if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
          return;
        }
        const { buffered, bufferedIndex, objectMode } = state;
        const bufferedLength = buffered.length - bufferedIndex;
        if (!bufferedLength) {
          return;
        }
        let i6 = bufferedIndex;
        state.bufferProcessing = true;
        if (bufferedLength > 1 && stream._writev) {
          state.pendingcb -= bufferedLength - 1;
          const callback = state.allNoop ? nop : (err) => {
            for (let n7 = i6; n7 < buffered.length; ++n7) {
              buffered[n7].callback(err);
            }
          };
          const chunks = state.allNoop && i6 === 0 ? buffered : ArrayPrototypeSlice(buffered, i6);
          chunks.allBuffers = state.allBuffers;
          doWrite(stream, state, true, state.length, chunks, "", callback);
          resetBuffer(state);
        } else {
          do {
            const { chunk, encoding, callback } = buffered[i6];
            buffered[i6++] = null;
            const len = objectMode ? 1 : chunk.length;
            doWrite(stream, state, false, len, chunk, encoding, callback);
          } while (i6 < buffered.length && !state.writing);
          if (i6 === buffered.length) {
            resetBuffer(state);
          } else if (i6 > 256) {
            buffered.splice(0, i6);
            state.bufferedIndex = 0;
          } else {
            state.bufferedIndex = i6;
          }
        }
        state.bufferProcessing = false;
      }
      Writable.prototype._write = function(chunk, encoding, cb) {
        if (this._writev) {
          this._writev(
            [
              {
                chunk,
                encoding
              }
            ],
            cb
          );
        } else {
          throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
        }
      };
      Writable.prototype._writev = null;
      Writable.prototype.end = function(chunk, encoding, cb) {
        const state = this._writableState;
        if (typeof chunk === "function") {
          cb = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === "function") {
          cb = encoding;
          encoding = null;
        }
        let err;
        if (chunk !== null && chunk !== void 0) {
          const ret = _write(this, chunk, encoding);
          if (ret instanceof Error2) {
            err = ret;
          }
        }
        if (state.corked) {
          state.corked = 1;
          this.uncork();
        }
        if (err) {
        } else if (!state.errored && !state.ending) {
          state.ending = true;
          finishMaybe(this, state, true);
          state.ended = true;
        } else if (state.finished) {
          err = new ERR_STREAM_ALREADY_FINISHED("end");
        } else if (state.destroyed) {
          err = new ERR_STREAM_DESTROYED("end");
        }
        if (typeof cb === "function") {
          if (err || state.finished) {
            process3.nextTick(cb, err);
          } else {
            state[kOnFinished].push(cb);
          }
        }
        return this;
      };
      function needFinish(state) {
        return state.ending && !state.destroyed && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
      }
      function callFinal(stream, state) {
        let called = false;
        function onFinish(err) {
          if (called) {
            errorOrDestroy(stream, err !== null && err !== void 0 ? err : ERR_MULTIPLE_CALLBACK());
            return;
          }
          called = true;
          state.pendingcb--;
          if (err) {
            const onfinishCallbacks = state[kOnFinished].splice(0);
            for (let i6 = 0; i6 < onfinishCallbacks.length; i6++) {
              onfinishCallbacks[i6](err);
            }
            errorOrDestroy(stream, err, state.sync);
          } else if (needFinish(state)) {
            state.prefinished = true;
            stream.emit("prefinish");
            state.pendingcb++;
            process3.nextTick(finish, stream, state);
          }
        }
        state.sync = true;
        state.pendingcb++;
        try {
          stream._final(onFinish);
        } catch (err) {
          onFinish(err);
        }
        state.sync = false;
      }
      function prefinish(stream, state) {
        if (!state.prefinished && !state.finalCalled) {
          if (typeof stream._final === "function" && !state.destroyed) {
            state.finalCalled = true;
            callFinal(stream, state);
          } else {
            state.prefinished = true;
            stream.emit("prefinish");
          }
        }
      }
      function finishMaybe(stream, state, sync) {
        if (needFinish(state)) {
          prefinish(stream, state);
          if (state.pendingcb === 0) {
            if (sync) {
              state.pendingcb++;
              process3.nextTick(
                (stream2, state2) => {
                  if (needFinish(state2)) {
                    finish(stream2, state2);
                  } else {
                    state2.pendingcb--;
                  }
                },
                stream,
                state
              );
            } else if (needFinish(state)) {
              state.pendingcb++;
              finish(stream, state);
            }
          }
        }
      }
      function finish(stream, state) {
        state.pendingcb--;
        state.finished = true;
        const onfinishCallbacks = state[kOnFinished].splice(0);
        for (let i6 = 0; i6 < onfinishCallbacks.length; i6++) {
          onfinishCallbacks[i6]();
        }
        stream.emit("finish");
        if (state.autoDestroy) {
          const rState = stream._readableState;
          const autoDestroy = !rState || rState.autoDestroy && // We don't expect the readable to ever 'end'
          // if readable is explicitly set to false.
          (rState.endEmitted || rState.readable === false);
          if (autoDestroy) {
            stream.destroy();
          }
        }
      }
      ObjectDefineProperties(Writable.prototype, {
        closed: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.closed : false;
          }
        },
        destroyed: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.destroyed : false;
          },
          set(value) {
            if (this._writableState) {
              this._writableState.destroyed = value;
            }
          }
        },
        writable: {
          __proto__: null,
          get() {
            const w2 = this._writableState;
            return !!w2 && w2.writable !== false && !w2.destroyed && !w2.errored && !w2.ending && !w2.ended;
          },
          set(val) {
            if (this._writableState) {
              this._writableState.writable = !!val;
            }
          }
        },
        writableFinished: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.finished : false;
          }
        },
        writableObjectMode: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.objectMode : false;
          }
        },
        writableBuffer: {
          __proto__: null,
          get() {
            return this._writableState && this._writableState.getBuffer();
          }
        },
        writableEnded: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.ending : false;
          }
        },
        writableNeedDrain: {
          __proto__: null,
          get() {
            const wState = this._writableState;
            if (!wState)
              return false;
            return !wState.destroyed && !wState.ending && wState.needDrain;
          }
        },
        writableHighWaterMark: {
          __proto__: null,
          get() {
            return this._writableState && this._writableState.highWaterMark;
          }
        },
        writableCorked: {
          __proto__: null,
          get() {
            return this._writableState ? this._writableState.corked : 0;
          }
        },
        writableLength: {
          __proto__: null,
          get() {
            return this._writableState && this._writableState.length;
          }
        },
        errored: {
          __proto__: null,
          enumerable: false,
          get() {
            return this._writableState ? this._writableState.errored : null;
          }
        },
        writableAborted: {
          __proto__: null,
          enumerable: false,
          get: function() {
            return !!(this._writableState.writable !== false && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
          }
        }
      });
      var destroy = destroyImpl.destroy;
      Writable.prototype.destroy = function(err, cb) {
        const state = this._writableState;
        if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
          process3.nextTick(errorBuffer, state);
        }
        destroy.call(this, err, cb);
        return this;
      };
      Writable.prototype._undestroy = destroyImpl.undestroy;
      Writable.prototype._destroy = function(err, cb) {
        cb(err);
      };
      Writable.prototype[EE.captureRejectionSymbol] = function(err) {
        this.destroy(err);
      };
      var webStreamsAdapters;
      function lazyWebStreams() {
        if (webStreamsAdapters === void 0)
          webStreamsAdapters = {};
        return webStreamsAdapters;
      }
      Writable.fromWeb = function(writableStream, options) {
        return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
      };
      Writable.toWeb = function(streamWritable) {
        return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/duplexify.js
  var require_duplexify = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/duplexify.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var bufferModule = (init_buffer(), __toCommonJS(buffer_exports));
      var {
        isReadable,
        isWritable,
        isIterable,
        isNodeStream,
        isReadableNodeStream,
        isWritableNodeStream,
        isDuplexNodeStream
      } = require_utils();
      var eos = require_end_of_stream();
      var {
        AbortError,
        codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE }
      } = require_errors();
      var { destroyer } = require_destroy();
      var Duplex = require_duplex();
      var Readable = require_readable();
      var { createDeferredPromise } = require_util();
      var from = require_from();
      var Blob2 = globalThis.Blob || bufferModule.Blob;
      var isBlob = typeof Blob2 !== "undefined" ? function isBlob2(b3) {
        return b3 instanceof Blob2;
      } : function isBlob2(b3) {
        return false;
      };
      var AbortController = globalThis.AbortController || require_browser().AbortController;
      var { FunctionPrototypeCall } = require_primordials();
      var Duplexify = class extends Duplex {
        constructor(options) {
          super(options);
          if ((options === null || options === void 0 ? void 0 : options.readable) === false) {
            this._readableState.readable = false;
            this._readableState.ended = true;
            this._readableState.endEmitted = true;
          }
          if ((options === null || options === void 0 ? void 0 : options.writable) === false) {
            this._writableState.writable = false;
            this._writableState.ending = true;
            this._writableState.ended = true;
            this._writableState.finished = true;
          }
        }
      };
      module.exports = function duplexify(body, name2) {
        if (isDuplexNodeStream(body)) {
          return body;
        }
        if (isReadableNodeStream(body)) {
          return _duplexify({
            readable: body
          });
        }
        if (isWritableNodeStream(body)) {
          return _duplexify({
            writable: body
          });
        }
        if (isNodeStream(body)) {
          return _duplexify({
            writable: false,
            readable: false
          });
        }
        if (typeof body === "function") {
          const { value, write, final, destroy } = fromAsyncGen(body);
          if (isIterable(value)) {
            return from(Duplexify, value, {
              // TODO (ronag): highWaterMark?
              objectMode: true,
              write,
              final,
              destroy
            });
          }
          const then2 = value === null || value === void 0 ? void 0 : value.then;
          if (typeof then2 === "function") {
            let d4;
            const promise = FunctionPrototypeCall(
              then2,
              value,
              (val) => {
                if (val != null) {
                  throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
                }
              },
              (err) => {
                destroyer(d4, err);
              }
            );
            return d4 = new Duplexify({
              // TODO (ronag): highWaterMark?
              objectMode: true,
              readable: false,
              write,
              final(cb) {
                final(async () => {
                  try {
                    await promise;
                    process3.nextTick(cb, null);
                  } catch (err) {
                    process3.nextTick(cb, err);
                  }
                });
              },
              destroy
            });
          }
          throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name2, value);
        }
        if (isBlob(body)) {
          return duplexify(body.arrayBuffer());
        }
        if (isIterable(body)) {
          return from(Duplexify, body, {
            // TODO (ronag): highWaterMark?
            objectMode: true,
            writable: false
          });
        }
        if (typeof (body === null || body === void 0 ? void 0 : body.writable) === "object" || typeof (body === null || body === void 0 ? void 0 : body.readable) === "object") {
          const readable = body !== null && body !== void 0 && body.readable ? isReadableNodeStream(body === null || body === void 0 ? void 0 : body.readable) ? body === null || body === void 0 ? void 0 : body.readable : duplexify(body.readable) : void 0;
          const writable = body !== null && body !== void 0 && body.writable ? isWritableNodeStream(body === null || body === void 0 ? void 0 : body.writable) ? body === null || body === void 0 ? void 0 : body.writable : duplexify(body.writable) : void 0;
          return _duplexify({
            readable,
            writable
          });
        }
        const then = body === null || body === void 0 ? void 0 : body.then;
        if (typeof then === "function") {
          let d4;
          FunctionPrototypeCall(
            then,
            body,
            (val) => {
              if (val != null) {
                d4.push(val);
              }
              d4.push(null);
            },
            (err) => {
              destroyer(d4, err);
            }
          );
          return d4 = new Duplexify({
            objectMode: true,
            writable: false,
            read() {
            }
          });
        }
        throw new ERR_INVALID_ARG_TYPE(
          name2,
          [
            "Blob",
            "ReadableStream",
            "WritableStream",
            "Stream",
            "Iterable",
            "AsyncIterable",
            "Function",
            "{ readable, writable } pair",
            "Promise"
          ],
          body
        );
      };
      function fromAsyncGen(fn) {
        let { promise, resolve: resolve2 } = createDeferredPromise();
        const ac = new AbortController();
        const signal = ac.signal;
        const value = fn(
          async function* () {
            while (true) {
              const _promise = promise;
              promise = null;
              const { chunk, done, cb } = await _promise;
              process3.nextTick(cb);
              if (done)
                return;
              if (signal.aborted)
                throw new AbortError(void 0, {
                  cause: signal.reason
                });
              ({ promise, resolve: resolve2 } = createDeferredPromise());
              yield chunk;
            }
          }(),
          {
            signal
          }
        );
        return {
          value,
          write(chunk, encoding, cb) {
            const _resolve = resolve2;
            resolve2 = null;
            _resolve({
              chunk,
              done: false,
              cb
            });
          },
          final(cb) {
            const _resolve = resolve2;
            resolve2 = null;
            _resolve({
              done: true,
              cb
            });
          },
          destroy(err, cb) {
            ac.abort();
            cb(err);
          }
        };
      }
      function _duplexify(pair) {
        const r7 = pair.readable && typeof pair.readable.read !== "function" ? Readable.wrap(pair.readable) : pair.readable;
        const w2 = pair.writable;
        let readable = !!isReadable(r7);
        let writable = !!isWritable(w2);
        let ondrain;
        let onfinish;
        let onreadable;
        let onclose;
        let d4;
        function onfinished(err) {
          const cb = onclose;
          onclose = null;
          if (cb) {
            cb(err);
          } else if (err) {
            d4.destroy(err);
          }
        }
        d4 = new Duplexify({
          // TODO (ronag): highWaterMark?
          readableObjectMode: !!(r7 !== null && r7 !== void 0 && r7.readableObjectMode),
          writableObjectMode: !!(w2 !== null && w2 !== void 0 && w2.writableObjectMode),
          readable,
          writable
        });
        if (writable) {
          eos(w2, (err) => {
            writable = false;
            if (err) {
              destroyer(r7, err);
            }
            onfinished(err);
          });
          d4._write = function(chunk, encoding, callback) {
            if (w2.write(chunk, encoding)) {
              callback();
            } else {
              ondrain = callback;
            }
          };
          d4._final = function(callback) {
            w2.end();
            onfinish = callback;
          };
          w2.on("drain", function() {
            if (ondrain) {
              const cb = ondrain;
              ondrain = null;
              cb();
            }
          });
          w2.on("finish", function() {
            if (onfinish) {
              const cb = onfinish;
              onfinish = null;
              cb();
            }
          });
        }
        if (readable) {
          eos(r7, (err) => {
            readable = false;
            if (err) {
              destroyer(r7, err);
            }
            onfinished(err);
          });
          r7.on("readable", function() {
            if (onreadable) {
              const cb = onreadable;
              onreadable = null;
              cb();
            }
          });
          r7.on("end", function() {
            d4.push(null);
          });
          d4._read = function() {
            while (true) {
              const buf = r7.read();
              if (buf === null) {
                onreadable = d4._read;
                return;
              }
              if (!d4.push(buf)) {
                return;
              }
            }
          };
        }
        d4._destroy = function(err, callback) {
          if (!err && onclose !== null) {
            err = new AbortError();
          }
          onreadable = null;
          ondrain = null;
          onfinish = null;
          if (onclose === null) {
            callback(err);
          } else {
            onclose = callback;
            destroyer(w2, err);
            destroyer(r7, err);
          }
        };
        return d4;
      }
    }
  });

  // node_modules/readable-stream/lib/internal/streams/duplex.js
  var require_duplex = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/duplex.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var {
        ObjectDefineProperties,
        ObjectGetOwnPropertyDescriptor,
        ObjectKeys,
        ObjectSetPrototypeOf
      } = require_primordials();
      module.exports = Duplex;
      var Readable = require_readable();
      var Writable = require_writable();
      ObjectSetPrototypeOf(Duplex.prototype, Readable.prototype);
      ObjectSetPrototypeOf(Duplex, Readable);
      {
        const keys = ObjectKeys(Writable.prototype);
        for (let i6 = 0; i6 < keys.length; i6++) {
          const method = keys[i6];
          if (!Duplex.prototype[method])
            Duplex.prototype[method] = Writable.prototype[method];
        }
      }
      function Duplex(options) {
        if (!(this instanceof Duplex))
          return new Duplex(options);
        Readable.call(this, options);
        Writable.call(this, options);
        if (options) {
          this.allowHalfOpen = options.allowHalfOpen !== false;
          if (options.readable === false) {
            this._readableState.readable = false;
            this._readableState.ended = true;
            this._readableState.endEmitted = true;
          }
          if (options.writable === false) {
            this._writableState.writable = false;
            this._writableState.ending = true;
            this._writableState.ended = true;
            this._writableState.finished = true;
          }
        } else {
          this.allowHalfOpen = true;
        }
      }
      ObjectDefineProperties(Duplex.prototype, {
        writable: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writable")
        },
        writableHighWaterMark: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark")
        },
        writableObjectMode: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableObjectMode")
        },
        writableBuffer: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableBuffer")
        },
        writableLength: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableLength")
        },
        writableFinished: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableFinished")
        },
        writableCorked: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableCorked")
        },
        writableEnded: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableEnded")
        },
        writableNeedDrain: {
          __proto__: null,
          ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain")
        },
        destroyed: {
          __proto__: null,
          get() {
            if (this._readableState === void 0 || this._writableState === void 0) {
              return false;
            }
            return this._readableState.destroyed && this._writableState.destroyed;
          },
          set(value) {
            if (this._readableState && this._writableState) {
              this._readableState.destroyed = value;
              this._writableState.destroyed = value;
            }
          }
        }
      });
      var webStreamsAdapters;
      function lazyWebStreams() {
        if (webStreamsAdapters === void 0)
          webStreamsAdapters = {};
        return webStreamsAdapters;
      }
      Duplex.fromWeb = function(pair, options) {
        return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
      };
      Duplex.toWeb = function(duplex) {
        return lazyWebStreams().newReadableWritablePairFromDuplex(duplex);
      };
      var duplexify;
      Duplex.from = function(body) {
        if (!duplexify) {
          duplexify = require_duplexify();
        }
        return duplexify(body, "body");
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/transform.js
  var require_transform = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/transform.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { ObjectSetPrototypeOf, Symbol: Symbol2 } = require_primordials();
      module.exports = Transform;
      var { ERR_METHOD_NOT_IMPLEMENTED } = require_errors().codes;
      var Duplex = require_duplex();
      var { getHighWaterMark } = require_state();
      ObjectSetPrototypeOf(Transform.prototype, Duplex.prototype);
      ObjectSetPrototypeOf(Transform, Duplex);
      var kCallback = Symbol2("kCallback");
      function Transform(options) {
        if (!(this instanceof Transform))
          return new Transform(options);
        const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
        if (readableHighWaterMark === 0) {
          options = {
            ...options,
            highWaterMark: null,
            readableHighWaterMark,
            // TODO (ronag): 0 is not optimal since we have
            // a "bug" where we check needDrain before calling _write and not after.
            // Refs: https://github.com/nodejs/node/pull/32887
            // Refs: https://github.com/nodejs/node/pull/35941
            writableHighWaterMark: options.writableHighWaterMark || 0
          };
        }
        Duplex.call(this, options);
        this._readableState.sync = false;
        this[kCallback] = null;
        if (options) {
          if (typeof options.transform === "function")
            this._transform = options.transform;
          if (typeof options.flush === "function")
            this._flush = options.flush;
        }
        this.on("prefinish", prefinish);
      }
      function final(cb) {
        if (typeof this._flush === "function" && !this.destroyed) {
          this._flush((er, data) => {
            if (er) {
              if (cb) {
                cb(er);
              } else {
                this.destroy(er);
              }
              return;
            }
            if (data != null) {
              this.push(data);
            }
            this.push(null);
            if (cb) {
              cb();
            }
          });
        } else {
          this.push(null);
          if (cb) {
            cb();
          }
        }
      }
      function prefinish() {
        if (this._final !== final) {
          final.call(this);
        }
      }
      Transform.prototype._final = final;
      Transform.prototype._transform = function(chunk, encoding, callback) {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
      };
      Transform.prototype._write = function(chunk, encoding, callback) {
        const rState = this._readableState;
        const wState = this._writableState;
        const length = rState.length;
        this._transform(chunk, encoding, (err, val) => {
          if (err) {
            callback(err);
            return;
          }
          if (val != null) {
            this.push(val);
          }
          if (wState.ended || // Backwards compat.
          length === rState.length || // Backwards compat.
          rState.length < rState.highWaterMark) {
            callback();
          } else {
            this[kCallback] = callback;
          }
        });
      };
      Transform.prototype._read = function() {
        if (this[kCallback]) {
          const callback = this[kCallback];
          this[kCallback] = null;
          callback();
        }
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/passthrough.js
  var require_passthrough = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/passthrough.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { ObjectSetPrototypeOf } = require_primordials();
      module.exports = PassThrough;
      var Transform = require_transform();
      ObjectSetPrototypeOf(PassThrough.prototype, Transform.prototype);
      ObjectSetPrototypeOf(PassThrough, Transform);
      function PassThrough(options) {
        if (!(this instanceof PassThrough))
          return new PassThrough(options);
        Transform.call(this, options);
      }
      PassThrough.prototype._transform = function(chunk, encoding, cb) {
        cb(null, chunk);
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/pipeline.js
  var require_pipeline = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/pipeline.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var process3 = require_browser2();
      var { ArrayIsArray, Promise: Promise2, SymbolAsyncIterator } = require_primordials();
      var eos = require_end_of_stream();
      var { once: once3 } = require_util();
      var destroyImpl = require_destroy();
      var Duplex = require_duplex();
      var {
        aggregateTwoErrors,
        codes: {
          ERR_INVALID_ARG_TYPE,
          ERR_INVALID_RETURN_VALUE,
          ERR_MISSING_ARGS,
          ERR_STREAM_DESTROYED,
          ERR_STREAM_PREMATURE_CLOSE
        },
        AbortError
      } = require_errors();
      var { validateFunction, validateAbortSignal } = require_validators();
      var {
        isIterable,
        isReadable,
        isReadableNodeStream,
        isNodeStream,
        isTransformStream,
        isWebStream,
        isReadableStream,
        isReadableEnded
      } = require_utils();
      var AbortController = globalThis.AbortController || require_browser().AbortController;
      var PassThrough;
      var Readable;
      function destroyer(stream, reading, writing) {
        let finished = false;
        stream.on("close", () => {
          finished = true;
        });
        const cleanup = eos(
          stream,
          {
            readable: reading,
            writable: writing
          },
          (err) => {
            finished = !err;
          }
        );
        return {
          destroy: (err) => {
            if (finished)
              return;
            finished = true;
            destroyImpl.destroyer(stream, err || new ERR_STREAM_DESTROYED("pipe"));
          },
          cleanup
        };
      }
      function popCallback(streams) {
        validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
        return streams.pop();
      }
      function makeAsyncIterable(val) {
        if (isIterable(val)) {
          return val;
        } else if (isReadableNodeStream(val)) {
          return fromReadable(val);
        }
        throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable"], val);
      }
      async function* fromReadable(val) {
        if (!Readable) {
          Readable = require_readable();
        }
        yield* Readable.prototype[SymbolAsyncIterator].call(val);
      }
      async function pumpToNode(iterable, writable, finish, { end }) {
        let error;
        let onresolve = null;
        const resume = (err) => {
          if (err) {
            error = err;
          }
          if (onresolve) {
            const callback = onresolve;
            onresolve = null;
            callback();
          }
        };
        const wait = () => new Promise2((resolve2, reject) => {
          if (error) {
            reject(error);
          } else {
            onresolve = () => {
              if (error) {
                reject(error);
              } else {
                resolve2();
              }
            };
          }
        });
        writable.on("drain", resume);
        const cleanup = eos(
          writable,
          {
            readable: false
          },
          resume
        );
        try {
          if (writable.writableNeedDrain) {
            await wait();
          }
          for await (const chunk of iterable) {
            if (!writable.write(chunk)) {
              await wait();
            }
          }
          if (end) {
            writable.end();
          }
          await wait();
          finish();
        } catch (err) {
          finish(error !== err ? aggregateTwoErrors(error, err) : err);
        } finally {
          cleanup();
          writable.off("drain", resume);
        }
      }
      async function pumpToWeb(readable, writable, finish, { end }) {
        if (isTransformStream(writable)) {
          writable = writable.writable;
        }
        const writer = writable.getWriter();
        try {
          for await (const chunk of readable) {
            await writer.ready;
            writer.write(chunk).catch(() => {
            });
          }
          await writer.ready;
          if (end) {
            await writer.close();
          }
          finish();
        } catch (err) {
          try {
            await writer.abort(err);
            finish(err);
          } catch (err2) {
            finish(err2);
          }
        }
      }
      function pipeline(...streams) {
        return pipelineImpl(streams, once3(popCallback(streams)));
      }
      function pipelineImpl(streams, callback, opts) {
        if (streams.length === 1 && ArrayIsArray(streams[0])) {
          streams = streams[0];
        }
        if (streams.length < 2) {
          throw new ERR_MISSING_ARGS("streams");
        }
        const ac = new AbortController();
        const signal = ac.signal;
        const outerSignal = opts === null || opts === void 0 ? void 0 : opts.signal;
        const lastStreamCleanup = [];
        validateAbortSignal(outerSignal, "options.signal");
        function abort2() {
          finishImpl(new AbortError());
        }
        outerSignal === null || outerSignal === void 0 ? void 0 : outerSignal.addEventListener("abort", abort2);
        let error;
        let value;
        const destroys = [];
        let finishCount = 0;
        function finish(err) {
          finishImpl(err, --finishCount === 0);
        }
        function finishImpl(err, final) {
          if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
            error = err;
          }
          if (!error && !final) {
            return;
          }
          while (destroys.length) {
            destroys.shift()(error);
          }
          outerSignal === null || outerSignal === void 0 ? void 0 : outerSignal.removeEventListener("abort", abort2);
          ac.abort();
          if (final) {
            if (!error) {
              lastStreamCleanup.forEach((fn) => fn());
            }
            process3.nextTick(callback, error, value);
          }
        }
        let ret;
        for (let i6 = 0; i6 < streams.length; i6++) {
          const stream = streams[i6];
          const reading = i6 < streams.length - 1;
          const writing = i6 > 0;
          const end = reading || (opts === null || opts === void 0 ? void 0 : opts.end) !== false;
          const isLastStream = i6 === streams.length - 1;
          if (isNodeStream(stream)) {
            let onError2 = function(err) {
              if (err && err.name !== "AbortError" && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                finish(err);
              }
            };
            var onError = onError2;
            if (end) {
              const { destroy, cleanup } = destroyer(stream, reading, writing);
              destroys.push(destroy);
              if (isReadable(stream) && isLastStream) {
                lastStreamCleanup.push(cleanup);
              }
            }
            stream.on("error", onError2);
            if (isReadable(stream) && isLastStream) {
              lastStreamCleanup.push(() => {
                stream.removeListener("error", onError2);
              });
            }
          }
          if (i6 === 0) {
            if (typeof stream === "function") {
              ret = stream({
                signal
              });
              if (!isIterable(ret)) {
                throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
              }
            } else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) {
              ret = stream;
            } else {
              ret = Duplex.from(stream);
            }
          } else if (typeof stream === "function") {
            if (isTransformStream(ret)) {
              var _ret;
              ret = makeAsyncIterable((_ret = ret) === null || _ret === void 0 ? void 0 : _ret.readable);
            } else {
              ret = makeAsyncIterable(ret);
            }
            ret = stream(ret, {
              signal
            });
            if (reading) {
              if (!isIterable(ret, true)) {
                throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i6 - 1}]`, ret);
              }
            } else {
              var _ret2;
              if (!PassThrough) {
                PassThrough = require_passthrough();
              }
              const pt = new PassThrough({
                objectMode: true
              });
              const then = (_ret2 = ret) === null || _ret2 === void 0 ? void 0 : _ret2.then;
              if (typeof then === "function") {
                finishCount++;
                then.call(
                  ret,
                  (val) => {
                    value = val;
                    if (val != null) {
                      pt.write(val);
                    }
                    if (end) {
                      pt.end();
                    }
                    process3.nextTick(finish);
                  },
                  (err) => {
                    pt.destroy(err);
                    process3.nextTick(finish, err);
                  }
                );
              } else if (isIterable(ret, true)) {
                finishCount++;
                pumpToNode(ret, pt, finish, {
                  end
                });
              } else if (isReadableStream(ret) || isTransformStream(ret)) {
                const toRead = ret.readable || ret;
                finishCount++;
                pumpToNode(toRead, pt, finish, {
                  end
                });
              } else {
                throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
              }
              ret = pt;
              const { destroy, cleanup } = destroyer(ret, false, true);
              destroys.push(destroy);
              if (isLastStream) {
                lastStreamCleanup.push(cleanup);
              }
            }
          } else if (isNodeStream(stream)) {
            if (isReadableNodeStream(ret)) {
              finishCount += 2;
              const cleanup = pipe(ret, stream, finish, {
                end
              });
              if (isReadable(stream) && isLastStream) {
                lastStreamCleanup.push(cleanup);
              }
            } else if (isTransformStream(ret) || isReadableStream(ret)) {
              const toRead = ret.readable || ret;
              finishCount++;
              pumpToNode(toRead, stream, finish, {
                end
              });
            } else if (isIterable(ret)) {
              finishCount++;
              pumpToNode(ret, stream, finish, {
                end
              });
            } else {
              throw new ERR_INVALID_ARG_TYPE(
                "val",
                ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
                ret
              );
            }
            ret = stream;
          } else if (isWebStream(stream)) {
            if (isReadableNodeStream(ret)) {
              finishCount++;
              pumpToWeb(makeAsyncIterable(ret), stream, finish, {
                end
              });
            } else if (isReadableStream(ret) || isIterable(ret)) {
              finishCount++;
              pumpToWeb(ret, stream, finish, {
                end
              });
            } else if (isTransformStream(ret)) {
              finishCount++;
              pumpToWeb(ret.readable, stream, finish, {
                end
              });
            } else {
              throw new ERR_INVALID_ARG_TYPE(
                "val",
                ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
                ret
              );
            }
            ret = stream;
          } else {
            ret = Duplex.from(stream);
          }
        }
        if (signal !== null && signal !== void 0 && signal.aborted || outerSignal !== null && outerSignal !== void 0 && outerSignal.aborted) {
          process3.nextTick(abort2);
        }
        return ret;
      }
      function pipe(src, dst, finish, { end }) {
        let ended = false;
        dst.on("close", () => {
          if (!ended) {
            finish(new ERR_STREAM_PREMATURE_CLOSE());
          }
        });
        src.pipe(dst, {
          end: false
        });
        if (end) {
          let endFn2 = function() {
            ended = true;
            dst.end();
          };
          var endFn = endFn2;
          if (isReadableEnded(src)) {
            process3.nextTick(endFn2);
          } else {
            src.once("end", endFn2);
          }
        } else {
          finish();
        }
        eos(
          src,
          {
            readable: true,
            writable: false
          },
          (err) => {
            const rState = src._readableState;
            if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
              src.once("end", finish).once("error", finish);
            } else {
              finish(err);
            }
          }
        );
        return eos(
          dst,
          {
            readable: false,
            writable: true
          },
          finish
        );
      }
      module.exports = {
        pipelineImpl,
        pipeline
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/compose.js
  var require_compose = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/compose.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { pipeline } = require_pipeline();
      var Duplex = require_duplex();
      var { destroyer } = require_destroy();
      var {
        isNodeStream,
        isReadable,
        isWritable,
        isWebStream,
        isTransformStream,
        isWritableStream,
        isReadableStream
      } = require_utils();
      var {
        AbortError,
        codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS }
      } = require_errors();
      var eos = require_end_of_stream();
      module.exports = function compose(...streams) {
        if (streams.length === 0) {
          throw new ERR_MISSING_ARGS("streams");
        }
        if (streams.length === 1) {
          return Duplex.from(streams[0]);
        }
        const orgStreams = [...streams];
        if (typeof streams[0] === "function") {
          streams[0] = Duplex.from(streams[0]);
        }
        if (typeof streams[streams.length - 1] === "function") {
          const idx = streams.length - 1;
          streams[idx] = Duplex.from(streams[idx]);
        }
        for (let n7 = 0; n7 < streams.length; ++n7) {
          if (!isNodeStream(streams[n7]) && !isWebStream(streams[n7])) {
            continue;
          }
          if (n7 < streams.length - 1 && !(isReadable(streams[n7]) || isReadableStream(streams[n7]) || isTransformStream(streams[n7]))) {
            throw new ERR_INVALID_ARG_VALUE(`streams[${n7}]`, orgStreams[n7], "must be readable");
          }
          if (n7 > 0 && !(isWritable(streams[n7]) || isWritableStream(streams[n7]) || isTransformStream(streams[n7]))) {
            throw new ERR_INVALID_ARG_VALUE(`streams[${n7}]`, orgStreams[n7], "must be writable");
          }
        }
        let ondrain;
        let onfinish;
        let onreadable;
        let onclose;
        let d4;
        function onfinished(err) {
          const cb = onclose;
          onclose = null;
          if (cb) {
            cb(err);
          } else if (err) {
            d4.destroy(err);
          } else if (!readable && !writable) {
            d4.destroy();
          }
        }
        const head = streams[0];
        const tail = pipeline(streams, onfinished);
        const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
        const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
        d4 = new Duplex({
          // TODO (ronag): highWaterMark?
          writableObjectMode: !!(head !== null && head !== void 0 && head.writableObjectMode),
          readableObjectMode: !!(tail !== null && tail !== void 0 && tail.writableObjectMode),
          writable,
          readable
        });
        if (writable) {
          if (isNodeStream(head)) {
            d4._write = function(chunk, encoding, callback) {
              if (head.write(chunk, encoding)) {
                callback();
              } else {
                ondrain = callback;
              }
            };
            d4._final = function(callback) {
              head.end();
              onfinish = callback;
            };
            head.on("drain", function() {
              if (ondrain) {
                const cb = ondrain;
                ondrain = null;
                cb();
              }
            });
          } else if (isWebStream(head)) {
            const writable2 = isTransformStream(head) ? head.writable : head;
            const writer = writable2.getWriter();
            d4._write = async function(chunk, encoding, callback) {
              try {
                await writer.ready;
                writer.write(chunk).catch(() => {
                });
                callback();
              } catch (err) {
                callback(err);
              }
            };
            d4._final = async function(callback) {
              try {
                await writer.ready;
                writer.close().catch(() => {
                });
                onfinish = callback;
              } catch (err) {
                callback(err);
              }
            };
          }
          const toRead = isTransformStream(tail) ? tail.readable : tail;
          eos(toRead, () => {
            if (onfinish) {
              const cb = onfinish;
              onfinish = null;
              cb();
            }
          });
        }
        if (readable) {
          if (isNodeStream(tail)) {
            tail.on("readable", function() {
              if (onreadable) {
                const cb = onreadable;
                onreadable = null;
                cb();
              }
            });
            tail.on("end", function() {
              d4.push(null);
            });
            d4._read = function() {
              while (true) {
                const buf = tail.read();
                if (buf === null) {
                  onreadable = d4._read;
                  return;
                }
                if (!d4.push(buf)) {
                  return;
                }
              }
            };
          } else if (isWebStream(tail)) {
            const readable2 = isTransformStream(tail) ? tail.readable : tail;
            const reader = readable2.getReader();
            d4._read = async function() {
              while (true) {
                try {
                  const { value, done } = await reader.read();
                  if (!d4.push(value)) {
                    return;
                  }
                  if (done) {
                    d4.push(null);
                    return;
                  }
                } catch {
                  return;
                }
              }
            };
          }
        }
        d4._destroy = function(err, callback) {
          if (!err && onclose !== null) {
            err = new AbortError();
          }
          onreadable = null;
          ondrain = null;
          onfinish = null;
          if (onclose === null) {
            callback(err);
          } else {
            onclose = callback;
            if (isNodeStream(tail)) {
              destroyer(tail, err);
            }
          }
        };
        return d4;
      };
    }
  });

  // node_modules/readable-stream/lib/internal/streams/operators.js
  var require_operators = __commonJS({
    "node_modules/readable-stream/lib/internal/streams/operators.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var AbortController = globalThis.AbortController || require_browser().AbortController;
      var {
        codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE },
        AbortError
      } = require_errors();
      var { validateAbortSignal, validateInteger, validateObject } = require_validators();
      var kWeakHandler = require_primordials().Symbol("kWeak");
      var { finished } = require_end_of_stream();
      var staticCompose = require_compose();
      var { addAbortSignalNoValidate } = require_add_abort_signal();
      var { isWritable, isNodeStream } = require_utils();
      var {
        ArrayPrototypePush,
        MathFloor,
        Number: Number2,
        NumberIsNaN,
        Promise: Promise2,
        PromiseReject,
        PromisePrototypeThen,
        Symbol: Symbol2
      } = require_primordials();
      var kEmpty = Symbol2("kEmpty");
      var kEof = Symbol2("kEof");
      function compose(stream, options) {
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        if (isNodeStream(stream) && !isWritable(stream)) {
          throw new ERR_INVALID_ARG_VALUE("stream", stream, "must be writable");
        }
        const composedStream = staticCompose(this, stream);
        if (options !== null && options !== void 0 && options.signal) {
          addAbortSignalNoValidate(options.signal, composedStream);
        }
        return composedStream;
      }
      function map(fn, options) {
        if (typeof fn !== "function") {
          throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
        }
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        let concurrency = 1;
        if ((options === null || options === void 0 ? void 0 : options.concurrency) != null) {
          concurrency = MathFloor(options.concurrency);
        }
        validateInteger(concurrency, "concurrency", 1);
        return async function* map2() {
          var _options$signal, _options$signal2;
          const ac = new AbortController();
          const stream = this;
          const queue2 = [];
          const signal = ac.signal;
          const signalOpt = {
            signal
          };
          const abort2 = () => ac.abort();
          if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) {
            abort2();
          }
          options === null || options === void 0 ? void 0 : (_options$signal2 = options.signal) === null || _options$signal2 === void 0 ? void 0 : _options$signal2.addEventListener("abort", abort2);
          let next;
          let resume;
          let done = false;
          function onDone() {
            done = true;
          }
          async function pump() {
            try {
              for await (let val of stream) {
                var _val;
                if (done) {
                  return;
                }
                if (signal.aborted) {
                  throw new AbortError();
                }
                try {
                  val = fn(val, signalOpt);
                } catch (err) {
                  val = PromiseReject(err);
                }
                if (val === kEmpty) {
                  continue;
                }
                if (typeof ((_val = val) === null || _val === void 0 ? void 0 : _val.catch) === "function") {
                  val.catch(onDone);
                }
                queue2.push(val);
                if (next) {
                  next();
                  next = null;
                }
                if (!done && queue2.length && queue2.length >= concurrency) {
                  await new Promise2((resolve2) => {
                    resume = resolve2;
                  });
                }
              }
              queue2.push(kEof);
            } catch (err) {
              const val = PromiseReject(err);
              PromisePrototypeThen(val, void 0, onDone);
              queue2.push(val);
            } finally {
              var _options$signal3;
              done = true;
              if (next) {
                next();
                next = null;
              }
              options === null || options === void 0 ? void 0 : (_options$signal3 = options.signal) === null || _options$signal3 === void 0 ? void 0 : _options$signal3.removeEventListener("abort", abort2);
            }
          }
          pump();
          try {
            while (true) {
              while (queue2.length > 0) {
                const val = await queue2[0];
                if (val === kEof) {
                  return;
                }
                if (signal.aborted) {
                  throw new AbortError();
                }
                if (val !== kEmpty) {
                  yield val;
                }
                queue2.shift();
                if (resume) {
                  resume();
                  resume = null;
                }
              }
              await new Promise2((resolve2) => {
                next = resolve2;
              });
            }
          } finally {
            ac.abort();
            done = true;
            if (resume) {
              resume();
              resume = null;
            }
          }
        }.call(this);
      }
      function asIndexedPairs(options = void 0) {
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        return async function* asIndexedPairs2() {
          let index = 0;
          for await (const val of this) {
            var _options$signal4;
            if (options !== null && options !== void 0 && (_options$signal4 = options.signal) !== null && _options$signal4 !== void 0 && _options$signal4.aborted) {
              throw new AbortError({
                cause: options.signal.reason
              });
            }
            yield [index++, val];
          }
        }.call(this);
      }
      async function some(fn, options = void 0) {
        for await (const unused of filter.call(this, fn, options)) {
          return true;
        }
        return false;
      }
      async function every(fn, options = void 0) {
        if (typeof fn !== "function") {
          throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
        }
        return !await some.call(
          this,
          async (...args) => {
            return !await fn(...args);
          },
          options
        );
      }
      async function find(fn, options) {
        for await (const result of filter.call(this, fn, options)) {
          return result;
        }
        return void 0;
      }
      async function forEach(fn, options) {
        if (typeof fn !== "function") {
          throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
        }
        async function forEachFn(value, options2) {
          await fn(value, options2);
          return kEmpty;
        }
        for await (const unused of map.call(this, forEachFn, options))
          ;
      }
      function filter(fn, options) {
        if (typeof fn !== "function") {
          throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
        }
        async function filterFn(value, options2) {
          if (await fn(value, options2)) {
            return value;
          }
          return kEmpty;
        }
        return map.call(this, filterFn, options);
      }
      var ReduceAwareErrMissingArgs = class extends ERR_MISSING_ARGS {
        constructor() {
          super("reduce");
          this.message = "Reduce of an empty stream requires an initial value";
        }
      };
      async function reduce(reducer, initialValue, options) {
        var _options$signal5;
        if (typeof reducer !== "function") {
          throw new ERR_INVALID_ARG_TYPE("reducer", ["Function", "AsyncFunction"], reducer);
        }
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        let hasInitialValue = arguments.length > 1;
        if (options !== null && options !== void 0 && (_options$signal5 = options.signal) !== null && _options$signal5 !== void 0 && _options$signal5.aborted) {
          const err = new AbortError(void 0, {
            cause: options.signal.reason
          });
          this.once("error", () => {
          });
          await finished(this.destroy(err));
          throw err;
        }
        const ac = new AbortController();
        const signal = ac.signal;
        if (options !== null && options !== void 0 && options.signal) {
          const opts = {
            once: true,
            [kWeakHandler]: this
          };
          options.signal.addEventListener("abort", () => ac.abort(), opts);
        }
        let gotAnyItemFromStream = false;
        try {
          for await (const value of this) {
            var _options$signal6;
            gotAnyItemFromStream = true;
            if (options !== null && options !== void 0 && (_options$signal6 = options.signal) !== null && _options$signal6 !== void 0 && _options$signal6.aborted) {
              throw new AbortError();
            }
            if (!hasInitialValue) {
              initialValue = value;
              hasInitialValue = true;
            } else {
              initialValue = await reducer(initialValue, value, {
                signal
              });
            }
          }
          if (!gotAnyItemFromStream && !hasInitialValue) {
            throw new ReduceAwareErrMissingArgs();
          }
        } finally {
          ac.abort();
        }
        return initialValue;
      }
      async function toArray(options) {
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        const result = [];
        for await (const val of this) {
          var _options$signal7;
          if (options !== null && options !== void 0 && (_options$signal7 = options.signal) !== null && _options$signal7 !== void 0 && _options$signal7.aborted) {
            throw new AbortError(void 0, {
              cause: options.signal.reason
            });
          }
          ArrayPrototypePush(result, val);
        }
        return result;
      }
      function flatMap(fn, options) {
        const values = map.call(this, fn, options);
        return async function* flatMap2() {
          for await (const val of values) {
            yield* val;
          }
        }.call(this);
      }
      function toIntegerOrInfinity(number) {
        number = Number2(number);
        if (NumberIsNaN(number)) {
          return 0;
        }
        if (number < 0) {
          throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
        }
        return number;
      }
      function drop(number, options = void 0) {
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        number = toIntegerOrInfinity(number);
        return async function* drop2() {
          var _options$signal8;
          if (options !== null && options !== void 0 && (_options$signal8 = options.signal) !== null && _options$signal8 !== void 0 && _options$signal8.aborted) {
            throw new AbortError();
          }
          for await (const val of this) {
            var _options$signal9;
            if (options !== null && options !== void 0 && (_options$signal9 = options.signal) !== null && _options$signal9 !== void 0 && _options$signal9.aborted) {
              throw new AbortError();
            }
            if (number-- <= 0) {
              yield val;
            }
          }
        }.call(this);
      }
      function take(number, options = void 0) {
        if (options != null) {
          validateObject(options, "options");
        }
        if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
          validateAbortSignal(options.signal, "options.signal");
        }
        number = toIntegerOrInfinity(number);
        return async function* take2() {
          var _options$signal10;
          if (options !== null && options !== void 0 && (_options$signal10 = options.signal) !== null && _options$signal10 !== void 0 && _options$signal10.aborted) {
            throw new AbortError();
          }
          for await (const val of this) {
            var _options$signal11;
            if (options !== null && options !== void 0 && (_options$signal11 = options.signal) !== null && _options$signal11 !== void 0 && _options$signal11.aborted) {
              throw new AbortError();
            }
            if (number-- > 0) {
              yield val;
            } else {
              return;
            }
          }
        }.call(this);
      }
      module.exports.streamReturningOperators = {
        asIndexedPairs,
        drop,
        filter,
        flatMap,
        map,
        take,
        compose
      };
      module.exports.promiseReturningOperators = {
        every,
        forEach,
        reduce,
        toArray,
        some,
        find
      };
    }
  });

  // node_modules/readable-stream/lib/stream/promises.js
  var require_promises = __commonJS({
    "node_modules/readable-stream/lib/stream/promises.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { ArrayPrototypePop, Promise: Promise2 } = require_primordials();
      var { isIterable, isNodeStream, isWebStream } = require_utils();
      var { pipelineImpl: pl } = require_pipeline();
      var { finished } = require_end_of_stream();
      require_stream();
      function pipeline(...streams) {
        return new Promise2((resolve2, reject) => {
          let signal;
          let end;
          const lastArg = streams[streams.length - 1];
          if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
            const options = ArrayPrototypePop(streams);
            signal = options.signal;
            end = options.end;
          }
          pl(
            streams,
            (err, value) => {
              if (err) {
                reject(err);
              } else {
                resolve2(value);
              }
            },
            {
              signal,
              end
            }
          );
        });
      }
      module.exports = {
        finished,
        pipeline
      };
    }
  });

  // node_modules/readable-stream/lib/stream.js
  var require_stream = __commonJS({
    "node_modules/readable-stream/lib/stream.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var { ObjectDefineProperty, ObjectKeys, ReflectApply } = require_primordials();
      var {
        promisify: { custom: customPromisify }
      } = require_util();
      var { streamReturningOperators, promiseReturningOperators } = require_operators();
      var {
        codes: { ERR_ILLEGAL_CONSTRUCTOR }
      } = require_errors();
      var compose = require_compose();
      var { pipeline } = require_pipeline();
      var { destroyer } = require_destroy();
      var eos = require_end_of_stream();
      var promises = require_promises();
      var utils = require_utils();
      var Stream = module.exports = require_legacy().Stream;
      Stream.isDisturbed = utils.isDisturbed;
      Stream.isErrored = utils.isErrored;
      Stream.isReadable = utils.isReadable;
      Stream.Readable = require_readable();
      for (const key of ObjectKeys(streamReturningOperators)) {
        let fn2 = function(...args) {
          if (new.target) {
            throw ERR_ILLEGAL_CONSTRUCTOR();
          }
          return Stream.Readable.from(ReflectApply(op, this, args));
        };
        fn = fn2;
        const op = streamReturningOperators[key];
        ObjectDefineProperty(fn2, "name", {
          __proto__: null,
          value: op.name
        });
        ObjectDefineProperty(fn2, "length", {
          __proto__: null,
          value: op.length
        });
        ObjectDefineProperty(Stream.Readable.prototype, key, {
          __proto__: null,
          value: fn2,
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
      var fn;
      for (const key of ObjectKeys(promiseReturningOperators)) {
        let fn2 = function(...args) {
          if (new.target) {
            throw ERR_ILLEGAL_CONSTRUCTOR();
          }
          return ReflectApply(op, this, args);
        };
        fn = fn2;
        const op = promiseReturningOperators[key];
        ObjectDefineProperty(fn2, "name", {
          __proto__: null,
          value: op.name
        });
        ObjectDefineProperty(fn2, "length", {
          __proto__: null,
          value: op.length
        });
        ObjectDefineProperty(Stream.Readable.prototype, key, {
          __proto__: null,
          value: fn2,
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
      var fn;
      Stream.Writable = require_writable();
      Stream.Duplex = require_duplex();
      Stream.Transform = require_transform();
      Stream.PassThrough = require_passthrough();
      Stream.pipeline = pipeline;
      var { addAbortSignal } = require_add_abort_signal();
      Stream.addAbortSignal = addAbortSignal;
      Stream.finished = eos;
      Stream.destroy = destroyer;
      Stream.compose = compose;
      ObjectDefineProperty(Stream, "promises", {
        __proto__: null,
        configurable: true,
        enumerable: true,
        get() {
          return promises;
        }
      });
      ObjectDefineProperty(pipeline, customPromisify, {
        __proto__: null,
        enumerable: true,
        get() {
          return promises.pipeline;
        }
      });
      ObjectDefineProperty(eos, customPromisify, {
        __proto__: null,
        enumerable: true,
        get() {
          return promises.finished;
        }
      });
      Stream.Stream = Stream;
      Stream._isUint8Array = function isUint8Array(value) {
        return value instanceof Uint8Array;
      };
      Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
        return Buffer3.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      };
    }
  });

  // node_modules/readable-stream/lib/ours/browser.js
  var require_browser3 = __commonJS({
    "node_modules/readable-stream/lib/ours/browser.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var CustomStream = require_stream();
      var promises = require_promises();
      var originalDestroy = CustomStream.Readable.destroy;
      module.exports = CustomStream.Readable;
      module.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
      module.exports._isUint8Array = CustomStream._isUint8Array;
      module.exports.isDisturbed = CustomStream.isDisturbed;
      module.exports.isErrored = CustomStream.isErrored;
      module.exports.isReadable = CustomStream.isReadable;
      module.exports.Readable = CustomStream.Readable;
      module.exports.Writable = CustomStream.Writable;
      module.exports.Duplex = CustomStream.Duplex;
      module.exports.Transform = CustomStream.Transform;
      module.exports.PassThrough = CustomStream.PassThrough;
      module.exports.addAbortSignal = CustomStream.addAbortSignal;
      module.exports.finished = CustomStream.finished;
      module.exports.destroy = CustomStream.destroy;
      module.exports.destroy = originalDestroy;
      module.exports.pipeline = CustomStream.pipeline;
      module.exports.compose = CustomStream.compose;
      Object.defineProperty(CustomStream, "promises", {
        configurable: true,
        enumerable: true,
        get() {
          return promises;
        }
      });
      module.exports.Stream = CustomStream.Stream;
      module.exports.default = module.exports;
    }
  });

  // node_modules/inherits/inherits_browser.js
  var require_inherits_browser = __commonJS({
    "node_modules/inherits/inherits_browser.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      if (typeof Object.create === "function") {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    }
  });

  // node_modules/mqtt-packet/node_modules/bl/BufferList.js
  var require_BufferList = __commonJS({
    "node_modules/mqtt-packet/node_modules/bl/BufferList.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var symbol = Symbol.for("BufferList");
      function BufferList(buf) {
        if (!(this instanceof BufferList)) {
          return new BufferList(buf);
        }
        BufferList._init.call(this, buf);
      }
      BufferList._init = function _init(buf) {
        Object.defineProperty(this, symbol, { value: true });
        this._bufs = [];
        this.length = 0;
        if (buf) {
          this.append(buf);
        }
      };
      BufferList.prototype._new = function _new(buf) {
        return new BufferList(buf);
      };
      BufferList.prototype._offset = function _offset(offset) {
        if (offset === 0) {
          return [0, 0];
        }
        let tot = 0;
        for (let i6 = 0; i6 < this._bufs.length; i6++) {
          const _t = tot + this._bufs[i6].length;
          if (offset < _t || i6 === this._bufs.length - 1) {
            return [i6, offset - tot];
          }
          tot = _t;
        }
      };
      BufferList.prototype._reverseOffset = function(blOffset) {
        const bufferId = blOffset[0];
        let offset = blOffset[1];
        for (let i6 = 0; i6 < bufferId; i6++) {
          offset += this._bufs[i6].length;
        }
        return offset;
      };
      BufferList.prototype.get = function get(index) {
        if (index > this.length || index < 0) {
          return void 0;
        }
        const offset = this._offset(index);
        return this._bufs[offset[0]][offset[1]];
      };
      BufferList.prototype.slice = function slice(start, end) {
        if (typeof start === "number" && start < 0) {
          start += this.length;
        }
        if (typeof end === "number" && end < 0) {
          end += this.length;
        }
        return this.copy(null, 0, start, end);
      };
      BufferList.prototype.copy = function copy(dst, dstStart, srcStart, srcEnd) {
        if (typeof srcStart !== "number" || srcStart < 0) {
          srcStart = 0;
        }
        if (typeof srcEnd !== "number" || srcEnd > this.length) {
          srcEnd = this.length;
        }
        if (srcStart >= this.length) {
          return dst || Buffer3.alloc(0);
        }
        if (srcEnd <= 0) {
          return dst || Buffer3.alloc(0);
        }
        const copy2 = !!dst;
        const off2 = this._offset(srcStart);
        const len = srcEnd - srcStart;
        let bytes = len;
        let bufoff = copy2 && dstStart || 0;
        let start = off2[1];
        if (srcStart === 0 && srcEnd === this.length) {
          if (!copy2) {
            return this._bufs.length === 1 ? this._bufs[0] : Buffer3.concat(this._bufs, this.length);
          }
          for (let i6 = 0; i6 < this._bufs.length; i6++) {
            this._bufs[i6].copy(dst, bufoff);
            bufoff += this._bufs[i6].length;
          }
          return dst;
        }
        if (bytes <= this._bufs[off2[0]].length - start) {
          return copy2 ? this._bufs[off2[0]].copy(dst, dstStart, start, start + bytes) : this._bufs[off2[0]].slice(start, start + bytes);
        }
        if (!copy2) {
          dst = Buffer3.allocUnsafe(len);
        }
        for (let i6 = off2[0]; i6 < this._bufs.length; i6++) {
          const l6 = this._bufs[i6].length - start;
          if (bytes > l6) {
            this._bufs[i6].copy(dst, bufoff, start);
            bufoff += l6;
          } else {
            this._bufs[i6].copy(dst, bufoff, start, start + bytes);
            bufoff += l6;
            break;
          }
          bytes -= l6;
          if (start) {
            start = 0;
          }
        }
        if (dst.length > bufoff)
          return dst.slice(0, bufoff);
        return dst;
      };
      BufferList.prototype.shallowSlice = function shallowSlice(start, end) {
        start = start || 0;
        end = typeof end !== "number" ? this.length : end;
        if (start < 0) {
          start += this.length;
        }
        if (end < 0) {
          end += this.length;
        }
        if (start === end) {
          return this._new();
        }
        const startOffset = this._offset(start);
        const endOffset = this._offset(end);
        const buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1);
        if (endOffset[1] === 0) {
          buffers.pop();
        } else {
          buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1]);
        }
        if (startOffset[1] !== 0) {
          buffers[0] = buffers[0].slice(startOffset[1]);
        }
        return this._new(buffers);
      };
      BufferList.prototype.toString = function toString(encoding, start, end) {
        return this.slice(start, end).toString(encoding);
      };
      BufferList.prototype.consume = function consume(bytes) {
        bytes = Math.trunc(bytes);
        if (Number.isNaN(bytes) || bytes <= 0)
          return this;
        while (this._bufs.length) {
          if (bytes >= this._bufs[0].length) {
            bytes -= this._bufs[0].length;
            this.length -= this._bufs[0].length;
            this._bufs.shift();
          } else {
            this._bufs[0] = this._bufs[0].slice(bytes);
            this.length -= bytes;
            break;
          }
        }
        return this;
      };
      BufferList.prototype.duplicate = function duplicate() {
        const copy = this._new();
        for (let i6 = 0; i6 < this._bufs.length; i6++) {
          copy.append(this._bufs[i6]);
        }
        return copy;
      };
      BufferList.prototype.append = function append(buf) {
        if (buf == null) {
          return this;
        }
        if (buf.buffer) {
          this._appendBuffer(Buffer3.from(buf.buffer, buf.byteOffset, buf.byteLength));
        } else if (Array.isArray(buf)) {
          for (let i6 = 0; i6 < buf.length; i6++) {
            this.append(buf[i6]);
          }
        } else if (this._isBufferList(buf)) {
          for (let i6 = 0; i6 < buf._bufs.length; i6++) {
            this.append(buf._bufs[i6]);
          }
        } else {
          if (typeof buf === "number") {
            buf = buf.toString();
          }
          this._appendBuffer(Buffer3.from(buf));
        }
        return this;
      };
      BufferList.prototype._appendBuffer = function appendBuffer(buf) {
        this._bufs.push(buf);
        this.length += buf.length;
      };
      BufferList.prototype.indexOf = function(search, offset, encoding) {
        if (encoding === void 0 && typeof offset === "string") {
          encoding = offset;
          offset = void 0;
        }
        if (typeof search === "function" || Array.isArray(search)) {
          throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');
        } else if (typeof search === "number") {
          search = Buffer3.from([search]);
        } else if (typeof search === "string") {
          search = Buffer3.from(search, encoding);
        } else if (this._isBufferList(search)) {
          search = search.slice();
        } else if (Array.isArray(search.buffer)) {
          search = Buffer3.from(search.buffer, search.byteOffset, search.byteLength);
        } else if (!Buffer3.isBuffer(search)) {
          search = Buffer3.from(search);
        }
        offset = Number(offset || 0);
        if (isNaN(offset)) {
          offset = 0;
        }
        if (offset < 0) {
          offset = this.length + offset;
        }
        if (offset < 0) {
          offset = 0;
        }
        if (search.length === 0) {
          return offset > this.length ? this.length : offset;
        }
        const blOffset = this._offset(offset);
        let blIndex = blOffset[0];
        let buffOffset = blOffset[1];
        for (; blIndex < this._bufs.length; blIndex++) {
          const buff = this._bufs[blIndex];
          while (buffOffset < buff.length) {
            const availableWindow = buff.length - buffOffset;
            if (availableWindow >= search.length) {
              const nativeSearchResult = buff.indexOf(search, buffOffset);
              if (nativeSearchResult !== -1) {
                return this._reverseOffset([blIndex, nativeSearchResult]);
              }
              buffOffset = buff.length - search.length + 1;
            } else {
              const revOffset = this._reverseOffset([blIndex, buffOffset]);
              if (this._match(revOffset, search)) {
                return revOffset;
              }
              buffOffset++;
            }
          }
          buffOffset = 0;
        }
        return -1;
      };
      BufferList.prototype._match = function(offset, search) {
        if (this.length - offset < search.length) {
          return false;
        }
        for (let searchOffset = 0; searchOffset < search.length; searchOffset++) {
          if (this.get(offset + searchOffset) !== search[searchOffset]) {
            return false;
          }
        }
        return true;
      };
      (function() {
        const methods = {
          readDoubleBE: 8,
          readDoubleLE: 8,
          readFloatBE: 4,
          readFloatLE: 4,
          readBigInt64BE: 8,
          readBigInt64LE: 8,
          readBigUInt64BE: 8,
          readBigUInt64LE: 8,
          readInt32BE: 4,
          readInt32LE: 4,
          readUInt32BE: 4,
          readUInt32LE: 4,
          readInt16BE: 2,
          readInt16LE: 2,
          readUInt16BE: 2,
          readUInt16LE: 2,
          readInt8: 1,
          readUInt8: 1,
          readIntBE: null,
          readIntLE: null,
          readUIntBE: null,
          readUIntLE: null
        };
        for (const m4 in methods) {
          (function(m5) {
            if (methods[m5] === null) {
              BufferList.prototype[m5] = function(offset, byteLength) {
                return this.slice(offset, offset + byteLength)[m5](0, byteLength);
              };
            } else {
              BufferList.prototype[m5] = function(offset = 0) {
                return this.slice(offset, offset + methods[m5])[m5](0);
              };
            }
          })(m4);
        }
      })();
      BufferList.prototype._isBufferList = function _isBufferList(b3) {
        return b3 instanceof BufferList || BufferList.isBufferList(b3);
      };
      BufferList.isBufferList = function isBufferList(b3) {
        return b3 != null && b3[symbol];
      };
      module.exports = BufferList;
    }
  });

  // node_modules/mqtt-packet/node_modules/bl/bl.js
  var require_bl = __commonJS({
    "node_modules/mqtt-packet/node_modules/bl/bl.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var DuplexStream = require_browser3().Duplex;
      var inherits = require_inherits_browser();
      var BufferList = require_BufferList();
      function BufferListStream(callback) {
        if (!(this instanceof BufferListStream)) {
          return new BufferListStream(callback);
        }
        if (typeof callback === "function") {
          this._callback = callback;
          const piper = function piper2(err) {
            if (this._callback) {
              this._callback(err);
              this._callback = null;
            }
          }.bind(this);
          this.on("pipe", function onPipe(src) {
            src.on("error", piper);
          });
          this.on("unpipe", function onUnpipe(src) {
            src.removeListener("error", piper);
          });
          callback = null;
        }
        BufferList._init.call(this, callback);
        DuplexStream.call(this);
      }
      inherits(BufferListStream, DuplexStream);
      Object.assign(BufferListStream.prototype, BufferList.prototype);
      BufferListStream.prototype._new = function _new(callback) {
        return new BufferListStream(callback);
      };
      BufferListStream.prototype._write = function _write(buf, encoding, callback) {
        this._appendBuffer(buf);
        if (typeof callback === "function") {
          callback();
        }
      };
      BufferListStream.prototype._read = function _read(size) {
        if (!this.length) {
          return this.push(null);
        }
        size = Math.min(size, this.length);
        this.push(this.slice(0, size));
        this.consume(size);
      };
      BufferListStream.prototype.end = function end(chunk) {
        DuplexStream.prototype.end.call(this, chunk);
        if (this._callback) {
          this._callback(null, this.slice());
          this._callback = null;
        }
      };
      BufferListStream.prototype._destroy = function _destroy(err, cb) {
        this._bufs.length = 0;
        this.length = 0;
        cb(err);
      };
      BufferListStream.prototype._isBufferList = function _isBufferList(b3) {
        return b3 instanceof BufferListStream || b3 instanceof BufferList || BufferListStream.isBufferList(b3);
      };
      BufferListStream.isBufferList = BufferList.isBufferList;
      module.exports = BufferListStream;
      module.exports.BufferListStream = BufferListStream;
      module.exports.BufferList = BufferList;
    }
  });

  // node_modules/mqtt-packet/packet.js
  var require_packet = __commonJS({
    "node_modules/mqtt-packet/packet.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var Packet = class {
        constructor() {
          this.cmd = null;
          this.retain = false;
          this.qos = 0;
          this.dup = false;
          this.length = -1;
          this.topic = null;
          this.payload = null;
        }
      };
      module.exports = Packet;
    }
  });

  // node_modules/mqtt-packet/constants.js
  var require_constants = __commonJS({
    "node_modules/mqtt-packet/constants.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var protocol = module.exports;
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      protocol.types = {
        0: "reserved",
        1: "connect",
        2: "connack",
        3: "publish",
        4: "puback",
        5: "pubrec",
        6: "pubrel",
        7: "pubcomp",
        8: "subscribe",
        9: "suback",
        10: "unsubscribe",
        11: "unsuback",
        12: "pingreq",
        13: "pingresp",
        14: "disconnect",
        15: "auth"
      };
      protocol.requiredHeaderFlags = {
        1: 0,
        // 'connect'
        2: 0,
        // 'connack'
        4: 0,
        // 'puback'
        5: 0,
        // 'pubrec'
        6: 2,
        // 'pubrel'
        7: 0,
        // 'pubcomp'
        8: 2,
        // 'subscribe'
        9: 0,
        // 'suback'
        10: 2,
        // 'unsubscribe'
        11: 0,
        // 'unsuback'
        12: 0,
        // 'pingreq'
        13: 0,
        // 'pingresp'
        14: 0,
        // 'disconnect'
        15: 0
        // 'auth'
      };
      protocol.requiredHeaderFlagsErrors = {};
      for (const k2 in protocol.requiredHeaderFlags) {
        const v4 = protocol.requiredHeaderFlags[k2];
        protocol.requiredHeaderFlagsErrors[k2] = "Invalid header flag bits, must be 0x" + v4.toString(16) + " for " + protocol.types[k2] + " packet";
      }
      protocol.codes = {};
      for (const k2 in protocol.types) {
        const v4 = protocol.types[k2];
        protocol.codes[v4] = k2;
      }
      protocol.CMD_SHIFT = 4;
      protocol.CMD_MASK = 240;
      protocol.DUP_MASK = 8;
      protocol.QOS_MASK = 3;
      protocol.QOS_SHIFT = 1;
      protocol.RETAIN_MASK = 1;
      protocol.VARBYTEINT_MASK = 127;
      protocol.VARBYTEINT_FIN_MASK = 128;
      protocol.VARBYTEINT_MAX = 268435455;
      protocol.SESSIONPRESENT_MASK = 1;
      protocol.SESSIONPRESENT_HEADER = Buffer3.from([protocol.SESSIONPRESENT_MASK]);
      protocol.CONNACK_HEADER = Buffer3.from([protocol.codes.connack << protocol.CMD_SHIFT]);
      protocol.USERNAME_MASK = 128;
      protocol.PASSWORD_MASK = 64;
      protocol.WILL_RETAIN_MASK = 32;
      protocol.WILL_QOS_MASK = 24;
      protocol.WILL_QOS_SHIFT = 3;
      protocol.WILL_FLAG_MASK = 4;
      protocol.CLEAN_SESSION_MASK = 2;
      protocol.CONNECT_HEADER = Buffer3.from([protocol.codes.connect << protocol.CMD_SHIFT]);
      protocol.properties = {
        sessionExpiryInterval: 17,
        willDelayInterval: 24,
        receiveMaximum: 33,
        maximumPacketSize: 39,
        topicAliasMaximum: 34,
        requestResponseInformation: 25,
        requestProblemInformation: 23,
        userProperties: 38,
        authenticationMethod: 21,
        authenticationData: 22,
        payloadFormatIndicator: 1,
        messageExpiryInterval: 2,
        contentType: 3,
        responseTopic: 8,
        correlationData: 9,
        maximumQoS: 36,
        retainAvailable: 37,
        assignedClientIdentifier: 18,
        reasonString: 31,
        wildcardSubscriptionAvailable: 40,
        subscriptionIdentifiersAvailable: 41,
        sharedSubscriptionAvailable: 42,
        serverKeepAlive: 19,
        responseInformation: 26,
        serverReference: 28,
        topicAlias: 35,
        subscriptionIdentifier: 11
      };
      protocol.propertiesCodes = {};
      for (const prop in protocol.properties) {
        const id = protocol.properties[prop];
        protocol.propertiesCodes[id] = prop;
      }
      protocol.propertiesTypes = {
        sessionExpiryInterval: "int32",
        willDelayInterval: "int32",
        receiveMaximum: "int16",
        maximumPacketSize: "int32",
        topicAliasMaximum: "int16",
        requestResponseInformation: "byte",
        requestProblemInformation: "byte",
        userProperties: "pair",
        authenticationMethod: "string",
        authenticationData: "binary",
        payloadFormatIndicator: "byte",
        messageExpiryInterval: "int32",
        contentType: "string",
        responseTopic: "string",
        correlationData: "binary",
        maximumQoS: "int8",
        retainAvailable: "byte",
        assignedClientIdentifier: "string",
        reasonString: "string",
        wildcardSubscriptionAvailable: "byte",
        subscriptionIdentifiersAvailable: "byte",
        sharedSubscriptionAvailable: "byte",
        serverKeepAlive: "int16",
        responseInformation: "string",
        serverReference: "string",
        topicAlias: "int16",
        subscriptionIdentifier: "var"
      };
      function genHeader(type) {
        return [0, 1, 2].map((qos) => {
          return [0, 1].map((dup) => {
            return [0, 1].map((retain) => {
              const buf = Buffer3.alloc(1);
              buf.writeUInt8(
                protocol.codes[type] << protocol.CMD_SHIFT | (dup ? protocol.DUP_MASK : 0) | qos << protocol.QOS_SHIFT | retain,
                0,
                true
              );
              return buf;
            });
          });
        });
      }
      protocol.PUBLISH_HEADER = genHeader("publish");
      protocol.SUBSCRIBE_HEADER = genHeader("subscribe");
      protocol.SUBSCRIBE_OPTIONS_QOS_MASK = 3;
      protocol.SUBSCRIBE_OPTIONS_NL_MASK = 1;
      protocol.SUBSCRIBE_OPTIONS_NL_SHIFT = 2;
      protocol.SUBSCRIBE_OPTIONS_RAP_MASK = 1;
      protocol.SUBSCRIBE_OPTIONS_RAP_SHIFT = 3;
      protocol.SUBSCRIBE_OPTIONS_RH_MASK = 3;
      protocol.SUBSCRIBE_OPTIONS_RH_SHIFT = 4;
      protocol.SUBSCRIBE_OPTIONS_RH = [0, 16, 32];
      protocol.SUBSCRIBE_OPTIONS_NL = 4;
      protocol.SUBSCRIBE_OPTIONS_RAP = 8;
      protocol.SUBSCRIBE_OPTIONS_QOS = [0, 1, 2];
      protocol.UNSUBSCRIBE_HEADER = genHeader("unsubscribe");
      protocol.ACKS = {
        unsuback: genHeader("unsuback"),
        puback: genHeader("puback"),
        pubcomp: genHeader("pubcomp"),
        pubrel: genHeader("pubrel"),
        pubrec: genHeader("pubrec")
      };
      protocol.SUBACK_HEADER = Buffer3.from([protocol.codes.suback << protocol.CMD_SHIFT]);
      protocol.VERSION3 = Buffer3.from([3]);
      protocol.VERSION4 = Buffer3.from([4]);
      protocol.VERSION5 = Buffer3.from([5]);
      protocol.VERSION131 = Buffer3.from([131]);
      protocol.VERSION132 = Buffer3.from([132]);
      protocol.QOS = [0, 1, 2].map((qos) => {
        return Buffer3.from([qos]);
      });
      protocol.EMPTY = {
        pingreq: Buffer3.from([protocol.codes.pingreq << 4, 0]),
        pingresp: Buffer3.from([protocol.codes.pingresp << 4, 0]),
        disconnect: Buffer3.from([protocol.codes.disconnect << 4, 0])
      };
      protocol.MQTT5_PUBACK_PUBREC_CODES = {
        0: "Success",
        16: "No matching subscribers",
        128: "Unspecified error",
        131: "Implementation specific error",
        135: "Not authorized",
        144: "Topic Name invalid",
        145: "Packet identifier in use",
        151: "Quota exceeded",
        153: "Payload format invalid"
      };
      protocol.MQTT5_PUBREL_PUBCOMP_CODES = {
        0: "Success",
        146: "Packet Identifier not found"
      };
      protocol.MQTT5_SUBACK_CODES = {
        0: "Granted QoS 0",
        1: "Granted QoS 1",
        2: "Granted QoS 2",
        128: "Unspecified error",
        131: "Implementation specific error",
        135: "Not authorized",
        143: "Topic Filter invalid",
        145: "Packet Identifier in use",
        151: "Quota exceeded",
        158: "Shared Subscriptions not supported",
        161: "Subscription Identifiers not supported",
        162: "Wildcard Subscriptions not supported"
      };
      protocol.MQTT5_UNSUBACK_CODES = {
        0: "Success",
        17: "No subscription existed",
        128: "Unspecified error",
        131: "Implementation specific error",
        135: "Not authorized",
        143: "Topic Filter invalid",
        145: "Packet Identifier in use"
      };
      protocol.MQTT5_DISCONNECT_CODES = {
        0: "Normal disconnection",
        4: "Disconnect with Will Message",
        128: "Unspecified error",
        129: "Malformed Packet",
        130: "Protocol Error",
        131: "Implementation specific error",
        135: "Not authorized",
        137: "Server busy",
        139: "Server shutting down",
        141: "Keep Alive timeout",
        142: "Session taken over",
        143: "Topic Filter invalid",
        144: "Topic Name invalid",
        147: "Receive Maximum exceeded",
        148: "Topic Alias invalid",
        149: "Packet too large",
        150: "Message rate too high",
        151: "Quota exceeded",
        152: "Administrative action",
        153: "Payload format invalid",
        154: "Retain not supported",
        155: "QoS not supported",
        156: "Use another server",
        157: "Server moved",
        158: "Shared Subscriptions not supported",
        159: "Connection rate exceeded",
        160: "Maximum connect time",
        161: "Subscription Identifiers not supported",
        162: "Wildcard Subscriptions not supported"
      };
      protocol.MQTT5_AUTH_CODES = {
        0: "Success",
        24: "Continue authentication",
        25: "Re-authenticate"
      };
    }
  });

  // node_modules/ms/index.js
  var require_ms = __commonJS({
    "node_modules/ms/index.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var s5 = 1e3;
      var m4 = s5 * 60;
      var h6 = m4 * 60;
      var d4 = h6 * 24;
      var w2 = d4 * 7;
      var y4 = d4 * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse2(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse2(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n7 = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n7 * y4;
          case "weeks":
          case "week":
          case "w":
            return n7 * w2;
          case "days":
          case "day":
          case "d":
            return n7 * d4;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n7 * h6;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n7 * m4;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n7 * s5;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n7;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d4) {
          return Math.round(ms / d4) + "d";
        }
        if (msAbs >= h6) {
          return Math.round(ms / h6) + "h";
        }
        if (msAbs >= m4) {
          return Math.round(ms / m4) + "m";
        }
        if (msAbs >= s5) {
          return Math.round(ms / s5) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d4) {
          return plural(ms, msAbs, d4, "day");
        }
        if (msAbs >= h6) {
          return plural(ms, msAbs, h6, "hour");
        }
        if (msAbs >= m4) {
          return plural(ms, msAbs, m4, "minute");
        }
        if (msAbs >= s5) {
          return plural(ms, msAbs, s5, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n7, name2) {
        var isPlural = msAbs >= n7 * 1.5;
        return Math.round(ms / n7) + " " + name2 + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/debug/src/common.js
  var require_common = __commonJS({
    "node_modules/debug/src/common.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      function setup(env2) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms();
        createDebug.destroy = destroy;
        Object.keys(env2).forEach((key) => {
          createDebug[key] = env2[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i6 = 0; i6 < namespace.length; i6++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i6);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self2 = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format2) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format2];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v4) => {
              enableOverride = v4;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          let i6;
          const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
          const len = split.length;
          for (i6 = 0; i6 < len; i6++) {
            if (!split[i6]) {
              continue;
            }
            namespaces = split[i6].replace(/\*/g, ".*?");
            if (namespaces[0] === "-") {
              createDebug.skips.push(new RegExp("^" + namespaces.slice(1) + "$"));
            } else {
              createDebug.names.push(new RegExp("^" + namespaces + "$"));
            }
          }
        }
        function disable() {
          const namespaces = [
            ...createDebug.names.map(toNamespace),
            ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name2) {
          if (name2[name2.length - 1] === "*") {
            return true;
          }
          let i6;
          let len;
          for (i6 = 0, len = createDebug.skips.length; i6 < len; i6++) {
            if (createDebug.skips[i6].test(name2)) {
              return false;
            }
          }
          for (i6 = 0, len = createDebug.names.length; i6 < len; i6++) {
            if (createDebug.names[i6].test(name2)) {
              return true;
            }
          }
          return false;
        }
        function toNamespace(regexp) {
          return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/debug/src/browser.js
  var require_browser4 = __commonJS({
    "node_modules/debug/src/browser.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      exports5.formatArgs = formatArgs;
      exports5.save = save;
      exports5.load = load;
      exports5.useColors = useColors;
      exports5.storage = localstorage();
      exports5.destroy = (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports5.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c6 = "color: " + this.color;
        args.splice(1, 0, c6, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c6);
      }
      exports5.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports5.storage.setItem("debug", namespaces);
          } else {
            exports5.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r7;
        try {
          r7 = exports5.storage.getItem("debug");
        } catch (error) {
        }
        if (!r7 && typeof process_exports !== "undefined" && "env" in process_exports) {
          r7 = process_exports.env.DEBUG;
        }
        return r7;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common()(exports5);
      var { formatters } = module.exports;
      formatters.j = function(v4) {
        try {
          return JSON.stringify(v4);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/mqtt-packet/parser.js
  var require_parser = __commonJS({
    "node_modules/mqtt-packet/parser.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var bl = require_bl();
      var { EventEmitter: EventEmitter2 } = (init_events(), __toCommonJS(events_exports));
      var Packet = require_packet();
      var constants = require_constants();
      var debug = require_browser4()("mqtt-packet:parser");
      var Parser = class _Parser extends EventEmitter2 {
        constructor() {
          super();
          this.parser = this.constructor.parser;
        }
        static parser(opt) {
          if (!(this instanceof _Parser))
            return new _Parser().parser(opt);
          this.settings = opt || {};
          this._states = [
            "_parseHeader",
            "_parseLength",
            "_parsePayload",
            "_newPacket"
          ];
          this._resetState();
          return this;
        }
        _resetState() {
          debug("_resetState: resetting packet, error, _list, and _stateCounter");
          this.packet = new Packet();
          this.error = null;
          this._list = bl();
          this._stateCounter = 0;
        }
        parse(buf) {
          if (this.error)
            this._resetState();
          this._list.append(buf);
          debug("parse: current state: %s", this._states[this._stateCounter]);
          while ((this.packet.length !== -1 || this._list.length > 0) && this[this._states[this._stateCounter]]() && !this.error) {
            this._stateCounter++;
            debug("parse: state complete. _stateCounter is now: %d", this._stateCounter);
            debug("parse: packet.length: %d, buffer list length: %d", this.packet.length, this._list.length);
            if (this._stateCounter >= this._states.length)
              this._stateCounter = 0;
          }
          debug("parse: exited while loop. packet: %d, buffer list length: %d", this.packet.length, this._list.length);
          return this._list.length;
        }
        _parseHeader() {
          const zero = this._list.readUInt8(0);
          const cmdIndex = zero >> constants.CMD_SHIFT;
          this.packet.cmd = constants.types[cmdIndex];
          const headerFlags = zero & 15;
          const requiredHeaderFlags = constants.requiredHeaderFlags[cmdIndex];
          if (requiredHeaderFlags != null && headerFlags !== requiredHeaderFlags) {
            return this._emitError(new Error(constants.requiredHeaderFlagsErrors[cmdIndex]));
          }
          this.packet.retain = (zero & constants.RETAIN_MASK) !== 0;
          this.packet.qos = zero >> constants.QOS_SHIFT & constants.QOS_MASK;
          if (this.packet.qos > 2) {
            return this._emitError(new Error("Packet must not have both QoS bits set to 1"));
          }
          this.packet.dup = (zero & constants.DUP_MASK) !== 0;
          debug("_parseHeader: packet: %o", this.packet);
          this._list.consume(1);
          return true;
        }
        _parseLength() {
          const result = this._parseVarByteNum(true);
          if (result) {
            this.packet.length = result.value;
            this._list.consume(result.bytes);
          }
          debug("_parseLength %d", result.value);
          return !!result;
        }
        _parsePayload() {
          debug("_parsePayload: payload %O", this._list);
          let result = false;
          if (this.packet.length === 0 || this._list.length >= this.packet.length) {
            this._pos = 0;
            switch (this.packet.cmd) {
              case "connect":
                this._parseConnect();
                break;
              case "connack":
                this._parseConnack();
                break;
              case "publish":
                this._parsePublish();
                break;
              case "puback":
              case "pubrec":
              case "pubrel":
              case "pubcomp":
                this._parseConfirmation();
                break;
              case "subscribe":
                this._parseSubscribe();
                break;
              case "suback":
                this._parseSuback();
                break;
              case "unsubscribe":
                this._parseUnsubscribe();
                break;
              case "unsuback":
                this._parseUnsuback();
                break;
              case "pingreq":
              case "pingresp":
                break;
              case "disconnect":
                this._parseDisconnect();
                break;
              case "auth":
                this._parseAuth();
                break;
              default:
                this._emitError(new Error("Not supported"));
            }
            result = true;
          }
          debug("_parsePayload complete result: %s", result);
          return result;
        }
        _parseConnect() {
          debug("_parseConnect");
          let topic;
          let payload;
          let password;
          let username;
          const flags = {};
          const packet = this.packet;
          const protocolId = this._parseString();
          if (protocolId === null)
            return this._emitError(new Error("Cannot parse protocolId"));
          if (protocolId !== "MQTT" && protocolId !== "MQIsdp") {
            return this._emitError(new Error("Invalid protocolId"));
          }
          packet.protocolId = protocolId;
          if (this._pos >= this._list.length)
            return this._emitError(new Error("Packet too short"));
          packet.protocolVersion = this._list.readUInt8(this._pos);
          if (packet.protocolVersion >= 128) {
            packet.bridgeMode = true;
            packet.protocolVersion = packet.protocolVersion - 128;
          }
          if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4 && packet.protocolVersion !== 5) {
            return this._emitError(new Error("Invalid protocol version"));
          }
          this._pos++;
          if (this._pos >= this._list.length) {
            return this._emitError(new Error("Packet too short"));
          }
          if (this._list.readUInt8(this._pos) & 1) {
            return this._emitError(new Error("Connect flag bit 0 must be 0, but got 1"));
          }
          flags.username = this._list.readUInt8(this._pos) & constants.USERNAME_MASK;
          flags.password = this._list.readUInt8(this._pos) & constants.PASSWORD_MASK;
          flags.will = this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK;
          const willRetain = !!(this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK);
          const willQos = (this._list.readUInt8(this._pos) & constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT;
          if (flags.will) {
            packet.will = {};
            packet.will.retain = willRetain;
            packet.will.qos = willQos;
          } else {
            if (willRetain) {
              return this._emitError(new Error("Will Retain Flag must be set to zero when Will Flag is set to 0"));
            }
            if (willQos) {
              return this._emitError(new Error("Will QoS must be set to zero when Will Flag is set to 0"));
            }
          }
          packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0;
          this._pos++;
          packet.keepalive = this._parseNum();
          if (packet.keepalive === -1)
            return this._emitError(new Error("Packet too short"));
          if (packet.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          const clientId = this._parseString();
          if (clientId === null)
            return this._emitError(new Error("Packet too short"));
          packet.clientId = clientId;
          debug("_parseConnect: packet.clientId: %s", packet.clientId);
          if (flags.will) {
            if (packet.protocolVersion === 5) {
              const willProperties = this._parseProperties();
              if (Object.getOwnPropertyNames(willProperties).length) {
                packet.will.properties = willProperties;
              }
            }
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse will topic"));
            packet.will.topic = topic;
            debug("_parseConnect: packet.will.topic: %s", packet.will.topic);
            payload = this._parseBuffer();
            if (payload === null)
              return this._emitError(new Error("Cannot parse will payload"));
            packet.will.payload = payload;
            debug("_parseConnect: packet.will.paylaod: %s", packet.will.payload);
          }
          if (flags.username) {
            username = this._parseString();
            if (username === null)
              return this._emitError(new Error("Cannot parse username"));
            packet.username = username;
            debug("_parseConnect: packet.username: %s", packet.username);
          }
          if (flags.password) {
            password = this._parseBuffer();
            if (password === null)
              return this._emitError(new Error("Cannot parse password"));
            packet.password = password;
          }
          this.settings = packet;
          debug("_parseConnect: complete");
          return packet;
        }
        _parseConnack() {
          debug("_parseConnack");
          const packet = this.packet;
          if (this._list.length < 1)
            return null;
          const flags = this._list.readUInt8(this._pos++);
          if (flags > 1) {
            return this._emitError(new Error("Invalid connack flags, bits 7-1 must be set to 0"));
          }
          packet.sessionPresent = !!(flags & constants.SESSIONPRESENT_MASK);
          if (this.settings.protocolVersion === 5) {
            if (this._list.length >= 2) {
              packet.reasonCode = this._list.readUInt8(this._pos++);
            } else {
              packet.reasonCode = 0;
            }
          } else {
            if (this._list.length < 2)
              return null;
            packet.returnCode = this._list.readUInt8(this._pos++);
          }
          if (packet.returnCode === -1 || packet.reasonCode === -1)
            return this._emitError(new Error("Cannot parse return code"));
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          debug("_parseConnack: complete");
        }
        _parsePublish() {
          debug("_parsePublish");
          const packet = this.packet;
          packet.topic = this._parseString();
          if (packet.topic === null)
            return this._emitError(new Error("Cannot parse topic"));
          if (packet.qos > 0) {
            if (!this._parseMessageId()) {
              return;
            }
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          packet.payload = this._list.slice(this._pos, packet.length);
          debug("_parsePublish: payload from buffer list: %o", packet.payload);
        }
        _parseSubscribe() {
          debug("_parseSubscribe");
          const packet = this.packet;
          let topic;
          let options;
          let qos;
          let rh;
          let rap;
          let nl;
          let subscription;
          packet.subscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          if (packet.length <= 0) {
            return this._emitError(new Error("Malformed subscribe, no payload specified"));
          }
          while (this._pos < packet.length) {
            topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            if (this._pos >= packet.length)
              return this._emitError(new Error("Malformed Subscribe Payload"));
            options = this._parseByte();
            if (this.settings.protocolVersion === 5) {
              if (options & 192) {
                return this._emitError(new Error("Invalid subscribe topic flag bits, bits 7-6 must be 0"));
              }
            } else {
              if (options & 252) {
                return this._emitError(new Error("Invalid subscribe topic flag bits, bits 7-2 must be 0"));
              }
            }
            qos = options & constants.SUBSCRIBE_OPTIONS_QOS_MASK;
            if (qos > 2) {
              return this._emitError(new Error("Invalid subscribe QoS, must be <= 2"));
            }
            nl = (options >> constants.SUBSCRIBE_OPTIONS_NL_SHIFT & constants.SUBSCRIBE_OPTIONS_NL_MASK) !== 0;
            rap = (options >> constants.SUBSCRIBE_OPTIONS_RAP_SHIFT & constants.SUBSCRIBE_OPTIONS_RAP_MASK) !== 0;
            rh = options >> constants.SUBSCRIBE_OPTIONS_RH_SHIFT & constants.SUBSCRIBE_OPTIONS_RH_MASK;
            if (rh > 2) {
              return this._emitError(new Error("Invalid retain handling, must be <= 2"));
            }
            subscription = { topic, qos };
            if (this.settings.protocolVersion === 5) {
              subscription.nl = nl;
              subscription.rap = rap;
              subscription.rh = rh;
            } else if (this.settings.bridgeMode) {
              subscription.rh = 0;
              subscription.rap = true;
              subscription.nl = true;
            }
            debug("_parseSubscribe: push subscription `%s` to subscription", subscription);
            packet.subscriptions.push(subscription);
          }
        }
        _parseSuback() {
          debug("_parseSuback");
          const packet = this.packet;
          this.packet.granted = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          if (packet.length <= 0) {
            return this._emitError(new Error("Malformed suback, no payload specified"));
          }
          while (this._pos < this.packet.length) {
            const code = this._list.readUInt8(this._pos++);
            if (this.settings.protocolVersion === 5) {
              if (!constants.MQTT5_SUBACK_CODES[code]) {
                return this._emitError(new Error("Invalid suback code"));
              }
            } else {
              if (code > 2 && code !== 128) {
                return this._emitError(new Error("Invalid suback QoS, must be 0, 1, 2 or 128"));
              }
            }
            this.packet.granted.push(code);
          }
        }
        _parseUnsubscribe() {
          debug("_parseUnsubscribe");
          const packet = this.packet;
          packet.unsubscriptions = [];
          if (!this._parseMessageId()) {
            return;
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          if (packet.length <= 0) {
            return this._emitError(new Error("Malformed unsubscribe, no payload specified"));
          }
          while (this._pos < packet.length) {
            const topic = this._parseString();
            if (topic === null)
              return this._emitError(new Error("Cannot parse topic"));
            debug("_parseUnsubscribe: push topic `%s` to unsubscriptions", topic);
            packet.unsubscriptions.push(topic);
          }
        }
        _parseUnsuback() {
          debug("_parseUnsuback");
          const packet = this.packet;
          if (!this._parseMessageId())
            return this._emitError(new Error("Cannot parse messageId"));
          if ((this.settings.protocolVersion === 3 || this.settings.protocolVersion === 4) && packet.length !== 2) {
            return this._emitError(new Error("Malformed unsuback, payload length must be 2"));
          }
          if (packet.length <= 0) {
            return this._emitError(new Error("Malformed unsuback, no payload specified"));
          }
          if (this.settings.protocolVersion === 5) {
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
            packet.granted = [];
            while (this._pos < this.packet.length) {
              const code = this._list.readUInt8(this._pos++);
              if (!constants.MQTT5_UNSUBACK_CODES[code]) {
                return this._emitError(new Error("Invalid unsuback code"));
              }
              this.packet.granted.push(code);
            }
          }
        }
        // parse packets like puback, pubrec, pubrel, pubcomp
        _parseConfirmation() {
          debug("_parseConfirmation: packet.cmd: `%s`", this.packet.cmd);
          const packet = this.packet;
          this._parseMessageId();
          if (this.settings.protocolVersion === 5) {
            if (packet.length > 2) {
              packet.reasonCode = this._parseByte();
              switch (this.packet.cmd) {
                case "puback":
                case "pubrec":
                  if (!constants.MQTT5_PUBACK_PUBREC_CODES[packet.reasonCode]) {
                    return this._emitError(new Error("Invalid " + this.packet.cmd + " reason code"));
                  }
                  break;
                case "pubrel":
                case "pubcomp":
                  if (!constants.MQTT5_PUBREL_PUBCOMP_CODES[packet.reasonCode]) {
                    return this._emitError(new Error("Invalid " + this.packet.cmd + " reason code"));
                  }
                  break;
              }
              debug("_parseConfirmation: packet.reasonCode `%d`", packet.reasonCode);
            } else {
              packet.reasonCode = 0;
            }
            if (packet.length > 3) {
              const properties = this._parseProperties();
              if (Object.getOwnPropertyNames(properties).length) {
                packet.properties = properties;
              }
            }
          }
          return true;
        }
        // parse disconnect packet
        _parseDisconnect() {
          const packet = this.packet;
          debug("_parseDisconnect");
          if (this.settings.protocolVersion === 5) {
            if (this._list.length > 0) {
              packet.reasonCode = this._parseByte();
              if (!constants.MQTT5_DISCONNECT_CODES[packet.reasonCode]) {
                this._emitError(new Error("Invalid disconnect reason code"));
              }
            } else {
              packet.reasonCode = 0;
            }
            const properties = this._parseProperties();
            if (Object.getOwnPropertyNames(properties).length) {
              packet.properties = properties;
            }
          }
          debug("_parseDisconnect result: true");
          return true;
        }
        // parse auth packet
        _parseAuth() {
          debug("_parseAuth");
          const packet = this.packet;
          if (this.settings.protocolVersion !== 5) {
            return this._emitError(new Error("Not supported auth packet for this version MQTT"));
          }
          packet.reasonCode = this._parseByte();
          if (!constants.MQTT5_AUTH_CODES[packet.reasonCode]) {
            return this._emitError(new Error("Invalid auth reason code"));
          }
          const properties = this._parseProperties();
          if (Object.getOwnPropertyNames(properties).length) {
            packet.properties = properties;
          }
          debug("_parseAuth: result: true");
          return true;
        }
        _parseMessageId() {
          const packet = this.packet;
          packet.messageId = this._parseNum();
          if (packet.messageId === null) {
            this._emitError(new Error("Cannot parse messageId"));
            return false;
          }
          debug("_parseMessageId: packet.messageId %d", packet.messageId);
          return true;
        }
        _parseString(maybeBuffer) {
          const length = this._parseNum();
          const end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          const result = this._list.toString("utf8", this._pos, end);
          this._pos += length;
          debug("_parseString: result: %s", result);
          return result;
        }
        _parseStringPair() {
          debug("_parseStringPair");
          return {
            name: this._parseString(),
            value: this._parseString()
          };
        }
        _parseBuffer() {
          const length = this._parseNum();
          const end = length + this._pos;
          if (length === -1 || end > this._list.length || end > this.packet.length)
            return null;
          const result = this._list.slice(this._pos, end);
          this._pos += length;
          debug("_parseBuffer: result: %o", result);
          return result;
        }
        _parseNum() {
          if (this._list.length - this._pos < 2)
            return -1;
          const result = this._list.readUInt16BE(this._pos);
          this._pos += 2;
          debug("_parseNum: result: %s", result);
          return result;
        }
        _parse4ByteNum() {
          if (this._list.length - this._pos < 4)
            return -1;
          const result = this._list.readUInt32BE(this._pos);
          this._pos += 4;
          debug("_parse4ByteNum: result: %s", result);
          return result;
        }
        _parseVarByteNum(fullInfoFlag) {
          debug("_parseVarByteNum");
          const maxBytes = 4;
          let bytes = 0;
          let mul = 1;
          let value = 0;
          let result = false;
          let current;
          const padding = this._pos ? this._pos : 0;
          while (bytes < maxBytes && padding + bytes < this._list.length) {
            current = this._list.readUInt8(padding + bytes++);
            value += mul * (current & constants.VARBYTEINT_MASK);
            mul *= 128;
            if ((current & constants.VARBYTEINT_FIN_MASK) === 0) {
              result = true;
              break;
            }
            if (this._list.length <= bytes) {
              break;
            }
          }
          if (!result && bytes === maxBytes && this._list.length >= bytes) {
            this._emitError(new Error("Invalid variable byte integer"));
          }
          if (padding) {
            this._pos += bytes;
          }
          if (result) {
            if (fullInfoFlag) {
              result = { bytes, value };
            } else {
              result = value;
            }
          } else {
            result = false;
          }
          debug("_parseVarByteNum: result: %o", result);
          return result;
        }
        _parseByte() {
          let result;
          if (this._pos < this._list.length) {
            result = this._list.readUInt8(this._pos);
            this._pos++;
          }
          debug("_parseByte: result: %o", result);
          return result;
        }
        _parseByType(type) {
          debug("_parseByType: type: %s", type);
          switch (type) {
            case "byte": {
              return this._parseByte() !== 0;
            }
            case "int8": {
              return this._parseByte();
            }
            case "int16": {
              return this._parseNum();
            }
            case "int32": {
              return this._parse4ByteNum();
            }
            case "var": {
              return this._parseVarByteNum();
            }
            case "string": {
              return this._parseString();
            }
            case "pair": {
              return this._parseStringPair();
            }
            case "binary": {
              return this._parseBuffer();
            }
          }
        }
        _parseProperties() {
          debug("_parseProperties");
          const length = this._parseVarByteNum();
          const start = this._pos;
          const end = start + length;
          const result = {};
          while (this._pos < end) {
            const type = this._parseByte();
            if (!type) {
              this._emitError(new Error("Cannot parse property code type"));
              return false;
            }
            const name2 = constants.propertiesCodes[type];
            if (!name2) {
              this._emitError(new Error("Unknown property"));
              return false;
            }
            if (name2 === "userProperties") {
              if (!result[name2]) {
                result[name2] = /* @__PURE__ */ Object.create(null);
              }
              const currentUserProperty = this._parseByType(constants.propertiesTypes[name2]);
              if (result[name2][currentUserProperty.name]) {
                if (Array.isArray(result[name2][currentUserProperty.name])) {
                  result[name2][currentUserProperty.name].push(currentUserProperty.value);
                } else {
                  const currentValue = result[name2][currentUserProperty.name];
                  result[name2][currentUserProperty.name] = [currentValue];
                  result[name2][currentUserProperty.name].push(currentUserProperty.value);
                }
              } else {
                result[name2][currentUserProperty.name] = currentUserProperty.value;
              }
              continue;
            }
            if (result[name2]) {
              if (Array.isArray(result[name2])) {
                result[name2].push(this._parseByType(constants.propertiesTypes[name2]));
              } else {
                result[name2] = [result[name2]];
                result[name2].push(this._parseByType(constants.propertiesTypes[name2]));
              }
            } else {
              result[name2] = this._parseByType(constants.propertiesTypes[name2]);
            }
          }
          return result;
        }
        _newPacket() {
          debug("_newPacket");
          if (this.packet) {
            this._list.consume(this.packet.length);
            debug("_newPacket: parser emit packet: packet.cmd: %s, packet.payload: %s, packet.length: %d", this.packet.cmd, this.packet.payload, this.packet.length);
            this.emit("packet", this.packet);
          }
          debug("_newPacket: new packet");
          this.packet = new Packet();
          this._pos = 0;
          return true;
        }
        _emitError(err) {
          debug("_emitError", err);
          this.error = err;
          this.emit("error", err);
        }
      };
      module.exports = Parser;
    }
  });

  // node_modules/mqtt-packet/numbers.js
  var require_numbers = __commonJS({
    "node_modules/mqtt-packet/numbers.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var max = 65536;
      var cache = {};
      var SubOk = Buffer3.isBuffer(Buffer3.from([1, 2]).subarray(0, 1));
      function generateBuffer(i6) {
        const buffer = Buffer3.allocUnsafe(2);
        buffer.writeUInt8(i6 >> 8, 0);
        buffer.writeUInt8(i6 & 255, 0 + 1);
        return buffer;
      }
      function generateCache() {
        for (let i6 = 0; i6 < max; i6++) {
          cache[i6] = generateBuffer(i6);
        }
      }
      function genBufVariableByteInt(num) {
        const maxLength = 4;
        let digit = 0;
        let pos = 0;
        const buffer = Buffer3.allocUnsafe(maxLength);
        do {
          digit = num % 128 | 0;
          num = num / 128 | 0;
          if (num > 0)
            digit = digit | 128;
          buffer.writeUInt8(digit, pos++);
        } while (num > 0 && pos < maxLength);
        if (num > 0) {
          pos = 0;
        }
        return SubOk ? buffer.subarray(0, pos) : buffer.slice(0, pos);
      }
      function generate4ByteBuffer(num) {
        const buffer = Buffer3.allocUnsafe(4);
        buffer.writeUInt32BE(num, 0);
        return buffer;
      }
      module.exports = {
        cache,
        generateCache,
        generateNumber: generateBuffer,
        genBufVariableByteInt,
        generate4ByteBuffer
      };
    }
  });

  // node_modules/process-nextick-args/index.js
  var require_process_nextick_args = __commonJS({
    "node_modules/process-nextick-args/index.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      if (typeof process_exports === "undefined" || !process_exports.version || process_exports.version.indexOf("v0.") === 0 || process_exports.version.indexOf("v1.") === 0 && process_exports.version.indexOf("v1.8.") !== 0) {
        module.exports = { nextTick: nextTick2 };
      } else {
        module.exports = process_exports;
      }
      function nextTick2(fn, arg1, arg2, arg3) {
        if (typeof fn !== "function") {
          throw new TypeError('"callback" argument must be a function');
        }
        var len = arguments.length;
        var args, i6;
        switch (len) {
          case 0:
          case 1:
            return process_exports.nextTick(fn);
          case 2:
            return process_exports.nextTick(function afterTickOne() {
              fn.call(null, arg1);
            });
          case 3:
            return process_exports.nextTick(function afterTickTwo() {
              fn.call(null, arg1, arg2);
            });
          case 4:
            return process_exports.nextTick(function afterTickThree() {
              fn.call(null, arg1, arg2, arg3);
            });
          default:
            args = new Array(len - 1);
            i6 = 0;
            while (i6 < args.length) {
              args[i6++] = arguments[i6];
            }
            return process_exports.nextTick(function afterTick() {
              fn.apply(null, args);
            });
        }
      }
    }
  });

  // node_modules/mqtt-packet/writeToStream.js
  var require_writeToStream = __commonJS({
    "node_modules/mqtt-packet/writeToStream.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var protocol = require_constants();
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      var empty = Buffer3.allocUnsafe(0);
      var zeroBuf = Buffer3.from([0]);
      var numbers = require_numbers();
      var nextTick2 = require_process_nextick_args().nextTick;
      var debug = require_browser4()("mqtt-packet:writeToStream");
      var numCache = numbers.cache;
      var generateNumber = numbers.generateNumber;
      var generateCache = numbers.generateCache;
      var genBufVariableByteInt = numbers.genBufVariableByteInt;
      var generate4ByteBuffer = numbers.generate4ByteBuffer;
      var writeNumber = writeNumberCached;
      var toGenerate = true;
      function generate(packet, stream, opts) {
        debug("generate called");
        if (stream.cork) {
          stream.cork();
          nextTick2(uncork, stream);
        }
        if (toGenerate) {
          toGenerate = false;
          generateCache();
        }
        debug("generate: packet.cmd: %s", packet.cmd);
        switch (packet.cmd) {
          case "connect":
            return connect(packet, stream, opts);
          case "connack":
            return connack(packet, stream, opts);
          case "publish":
            return publish(packet, stream, opts);
          case "puback":
          case "pubrec":
          case "pubrel":
          case "pubcomp":
            return confirmation(packet, stream, opts);
          case "subscribe":
            return subscribe(packet, stream, opts);
          case "suback":
            return suback(packet, stream, opts);
          case "unsubscribe":
            return unsubscribe(packet, stream, opts);
          case "unsuback":
            return unsuback(packet, stream, opts);
          case "pingreq":
          case "pingresp":
            return emptyPacket(packet, stream, opts);
          case "disconnect":
            return disconnect(packet, stream, opts);
          case "auth":
            return auth(packet, stream, opts);
          default:
            stream.destroy(new Error("Unknown command"));
            return false;
        }
      }
      Object.defineProperty(generate, "cacheNumbers", {
        get() {
          return writeNumber === writeNumberCached;
        },
        set(value) {
          if (value) {
            if (!numCache || Object.keys(numCache).length === 0)
              toGenerate = true;
            writeNumber = writeNumberCached;
          } else {
            toGenerate = false;
            writeNumber = writeNumberGenerated;
          }
        }
      });
      function uncork(stream) {
        stream.uncork();
      }
      function connect(packet, stream, opts) {
        const settings = packet || {};
        const protocolId = settings.protocolId || "MQTT";
        let protocolVersion = settings.protocolVersion || 4;
        const will = settings.will;
        let clean = settings.clean;
        const keepalive = settings.keepalive || 0;
        const clientId = settings.clientId || "";
        const username = settings.username;
        const password = settings.password;
        const properties = settings.properties;
        if (clean === void 0)
          clean = true;
        let length = 0;
        if (!protocolId || typeof protocolId !== "string" && !Buffer3.isBuffer(protocolId)) {
          stream.destroy(new Error("Invalid protocolId"));
          return false;
        } else
          length += protocolId.length + 2;
        if (protocolVersion !== 3 && protocolVersion !== 4 && protocolVersion !== 5) {
          stream.destroy(new Error("Invalid protocol version"));
          return false;
        } else
          length += 1;
        if ((typeof clientId === "string" || Buffer3.isBuffer(clientId)) && (clientId || protocolVersion >= 4) && (clientId || clean)) {
          length += Buffer3.byteLength(clientId) + 2;
        } else {
          if (protocolVersion < 4) {
            stream.destroy(new Error("clientId must be supplied before 3.1.1"));
            return false;
          }
          if (clean * 1 === 0) {
            stream.destroy(new Error("clientId must be given if cleanSession set to 0"));
            return false;
          }
        }
        if (typeof keepalive !== "number" || keepalive < 0 || keepalive > 65535 || keepalive % 1 !== 0) {
          stream.destroy(new Error("Invalid keepalive"));
          return false;
        } else
          length += 2;
        length += 1;
        let propertiesData;
        let willProperties;
        if (protocolVersion === 5) {
          propertiesData = getProperties(stream, properties);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        if (will) {
          if (typeof will !== "object") {
            stream.destroy(new Error("Invalid will"));
            return false;
          }
          if (!will.topic || typeof will.topic !== "string") {
            stream.destroy(new Error("Invalid will topic"));
            return false;
          } else {
            length += Buffer3.byteLength(will.topic) + 2;
          }
          length += 2;
          if (will.payload) {
            if (will.payload.length >= 0) {
              if (typeof will.payload === "string") {
                length += Buffer3.byteLength(will.payload);
              } else {
                length += will.payload.length;
              }
            } else {
              stream.destroy(new Error("Invalid will payload"));
              return false;
            }
          }
          willProperties = {};
          if (protocolVersion === 5) {
            willProperties = getProperties(stream, will.properties);
            if (!willProperties) {
              return false;
            }
            length += willProperties.length;
          }
        }
        let providedUsername = false;
        if (username != null) {
          if (isStringOrBuffer(username)) {
            providedUsername = true;
            length += Buffer3.byteLength(username) + 2;
          } else {
            stream.destroy(new Error("Invalid username"));
            return false;
          }
        }
        if (password != null) {
          if (!providedUsername) {
            stream.destroy(new Error("Username is required to use password"));
            return false;
          }
          if (isStringOrBuffer(password)) {
            length += byteLength(password) + 2;
          } else {
            stream.destroy(new Error("Invalid password"));
            return false;
          }
        }
        stream.write(protocol.CONNECT_HEADER);
        writeVarByteInt(stream, length);
        writeStringOrBuffer(stream, protocolId);
        if (settings.bridgeMode) {
          protocolVersion += 128;
        }
        stream.write(
          protocolVersion === 131 ? protocol.VERSION131 : protocolVersion === 132 ? protocol.VERSION132 : protocolVersion === 4 ? protocol.VERSION4 : protocolVersion === 5 ? protocol.VERSION5 : protocol.VERSION3
        );
        let flags = 0;
        flags |= username != null ? protocol.USERNAME_MASK : 0;
        flags |= password != null ? protocol.PASSWORD_MASK : 0;
        flags |= will && will.retain ? protocol.WILL_RETAIN_MASK : 0;
        flags |= will && will.qos ? will.qos << protocol.WILL_QOS_SHIFT : 0;
        flags |= will ? protocol.WILL_FLAG_MASK : 0;
        flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;
        stream.write(Buffer3.from([flags]));
        writeNumber(stream, keepalive);
        if (protocolVersion === 5) {
          propertiesData.write();
        }
        writeStringOrBuffer(stream, clientId);
        if (will) {
          if (protocolVersion === 5) {
            willProperties.write();
          }
          writeString(stream, will.topic);
          writeStringOrBuffer(stream, will.payload);
        }
        if (username != null) {
          writeStringOrBuffer(stream, username);
        }
        if (password != null) {
          writeStringOrBuffer(stream, password);
        }
        return true;
      }
      function connack(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const rc = version2 === 5 ? settings.reasonCode : settings.returnCode;
        const properties = settings.properties;
        let length = 2;
        if (typeof rc !== "number") {
          stream.destroy(new Error("Invalid return code"));
          return false;
        }
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getProperties(stream, properties);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(protocol.CONNACK_HEADER);
        writeVarByteInt(stream, length);
        stream.write(settings.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf);
        stream.write(Buffer3.from([rc]));
        if (propertiesData != null) {
          propertiesData.write();
        }
        return true;
      }
      function publish(packet, stream, opts) {
        debug("publish: packet: %o", packet);
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const qos = settings.qos || 0;
        const retain = settings.retain ? protocol.RETAIN_MASK : 0;
        const topic = settings.topic;
        const payload = settings.payload || empty;
        const id = settings.messageId;
        const properties = settings.properties;
        let length = 0;
        if (typeof topic === "string")
          length += Buffer3.byteLength(topic) + 2;
        else if (Buffer3.isBuffer(topic))
          length += topic.length + 2;
        else {
          stream.destroy(new Error("Invalid topic"));
          return false;
        }
        if (!Buffer3.isBuffer(payload))
          length += Buffer3.byteLength(payload);
        else
          length += payload.length;
        if (qos && typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        } else if (qos)
          length += 2;
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getProperties(stream, properties);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(protocol.PUBLISH_HEADER[qos][settings.dup ? 1 : 0][retain ? 1 : 0]);
        writeVarByteInt(stream, length);
        writeNumber(stream, byteLength(topic));
        stream.write(topic);
        if (qos > 0)
          writeNumber(stream, id);
        if (propertiesData != null) {
          propertiesData.write();
        }
        debug("publish: payload: %o", payload);
        return stream.write(payload);
      }
      function confirmation(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const type = settings.cmd || "puback";
        const id = settings.messageId;
        const dup = settings.dup && type === "pubrel" ? protocol.DUP_MASK : 0;
        let qos = 0;
        const reasonCode = settings.reasonCode;
        const properties = settings.properties;
        let length = version2 === 5 ? 3 : 2;
        if (type === "pubrel")
          qos = 1;
        if (typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        }
        let propertiesData = null;
        if (version2 === 5) {
          if (typeof properties === "object") {
            propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
            if (!propertiesData) {
              return false;
            }
            length += propertiesData.length;
          }
        }
        stream.write(protocol.ACKS[type][qos][dup][0]);
        if (length === 3)
          length += reasonCode !== 0 ? 1 : -1;
        writeVarByteInt(stream, length);
        writeNumber(stream, id);
        if (version2 === 5 && length !== 2) {
          stream.write(Buffer3.from([reasonCode]));
        }
        if (propertiesData !== null) {
          propertiesData.write();
        } else {
          if (length === 4) {
            stream.write(Buffer3.from([0]));
          }
        }
        return true;
      }
      function subscribe(packet, stream, opts) {
        debug("subscribe: packet: ");
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const dup = settings.dup ? protocol.DUP_MASK : 0;
        const id = settings.messageId;
        const subs = settings.subscriptions;
        const properties = settings.properties;
        let length = 0;
        if (typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        } else
          length += 2;
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getProperties(stream, properties);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        if (typeof subs === "object" && subs.length) {
          for (let i6 = 0; i6 < subs.length; i6 += 1) {
            const itopic = subs[i6].topic;
            const iqos = subs[i6].qos;
            if (typeof itopic !== "string") {
              stream.destroy(new Error("Invalid subscriptions - invalid topic"));
              return false;
            }
            if (typeof iqos !== "number") {
              stream.destroy(new Error("Invalid subscriptions - invalid qos"));
              return false;
            }
            if (version2 === 5) {
              const nl = subs[i6].nl || false;
              if (typeof nl !== "boolean") {
                stream.destroy(new Error("Invalid subscriptions - invalid No Local"));
                return false;
              }
              const rap = subs[i6].rap || false;
              if (typeof rap !== "boolean") {
                stream.destroy(new Error("Invalid subscriptions - invalid Retain as Published"));
                return false;
              }
              const rh = subs[i6].rh || 0;
              if (typeof rh !== "number" || rh > 2) {
                stream.destroy(new Error("Invalid subscriptions - invalid Retain Handling"));
                return false;
              }
            }
            length += Buffer3.byteLength(itopic) + 2 + 1;
          }
        } else {
          stream.destroy(new Error("Invalid subscriptions"));
          return false;
        }
        debug("subscribe: writing to stream: %o", protocol.SUBSCRIBE_HEADER);
        stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
        writeVarByteInt(stream, length);
        writeNumber(stream, id);
        if (propertiesData !== null) {
          propertiesData.write();
        }
        let result = true;
        for (const sub of subs) {
          const jtopic = sub.topic;
          const jqos = sub.qos;
          const jnl = +sub.nl;
          const jrap = +sub.rap;
          const jrh = sub.rh;
          let joptions;
          writeString(stream, jtopic);
          joptions = protocol.SUBSCRIBE_OPTIONS_QOS[jqos];
          if (version2 === 5) {
            joptions |= jnl ? protocol.SUBSCRIBE_OPTIONS_NL : 0;
            joptions |= jrap ? protocol.SUBSCRIBE_OPTIONS_RAP : 0;
            joptions |= jrh ? protocol.SUBSCRIBE_OPTIONS_RH[jrh] : 0;
          }
          result = stream.write(Buffer3.from([joptions]));
        }
        return result;
      }
      function suback(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const id = settings.messageId;
        const granted = settings.granted;
        const properties = settings.properties;
        let length = 0;
        if (typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        } else
          length += 2;
        if (typeof granted === "object" && granted.length) {
          for (let i6 = 0; i6 < granted.length; i6 += 1) {
            if (typeof granted[i6] !== "number") {
              stream.destroy(new Error("Invalid qos vector"));
              return false;
            }
            length += 1;
          }
        } else {
          stream.destroy(new Error("Invalid qos vector"));
          return false;
        }
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(protocol.SUBACK_HEADER);
        writeVarByteInt(stream, length);
        writeNumber(stream, id);
        if (propertiesData !== null) {
          propertiesData.write();
        }
        return stream.write(Buffer3.from(granted));
      }
      function unsubscribe(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const id = settings.messageId;
        const dup = settings.dup ? protocol.DUP_MASK : 0;
        const unsubs = settings.unsubscriptions;
        const properties = settings.properties;
        let length = 0;
        if (typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        } else {
          length += 2;
        }
        if (typeof unsubs === "object" && unsubs.length) {
          for (let i6 = 0; i6 < unsubs.length; i6 += 1) {
            if (typeof unsubs[i6] !== "string") {
              stream.destroy(new Error("Invalid unsubscriptions"));
              return false;
            }
            length += Buffer3.byteLength(unsubs[i6]) + 2;
          }
        } else {
          stream.destroy(new Error("Invalid unsubscriptions"));
          return false;
        }
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getProperties(stream, properties);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);
        writeVarByteInt(stream, length);
        writeNumber(stream, id);
        if (propertiesData !== null) {
          propertiesData.write();
        }
        let result = true;
        for (let j2 = 0; j2 < unsubs.length; j2++) {
          result = writeString(stream, unsubs[j2]);
        }
        return result;
      }
      function unsuback(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const id = settings.messageId;
        const dup = settings.dup ? protocol.DUP_MASK : 0;
        const granted = settings.granted;
        const properties = settings.properties;
        const type = settings.cmd;
        const qos = 0;
        let length = 2;
        if (typeof id !== "number") {
          stream.destroy(new Error("Invalid messageId"));
          return false;
        }
        if (version2 === 5) {
          if (typeof granted === "object" && granted.length) {
            for (let i6 = 0; i6 < granted.length; i6 += 1) {
              if (typeof granted[i6] !== "number") {
                stream.destroy(new Error("Invalid qos vector"));
                return false;
              }
              length += 1;
            }
          } else {
            stream.destroy(new Error("Invalid qos vector"));
            return false;
          }
        }
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(protocol.ACKS[type][qos][dup][0]);
        writeVarByteInt(stream, length);
        writeNumber(stream, id);
        if (propertiesData !== null) {
          propertiesData.write();
        }
        if (version2 === 5) {
          stream.write(Buffer3.from(granted));
        }
        return true;
      }
      function emptyPacket(packet, stream, opts) {
        return stream.write(protocol.EMPTY[packet.cmd]);
      }
      function disconnect(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const reasonCode = settings.reasonCode;
        const properties = settings.properties;
        let length = version2 === 5 ? 1 : 0;
        let propertiesData = null;
        if (version2 === 5) {
          propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
          if (!propertiesData) {
            return false;
          }
          length += propertiesData.length;
        }
        stream.write(Buffer3.from([protocol.codes.disconnect << 4]));
        writeVarByteInt(stream, length);
        if (version2 === 5) {
          stream.write(Buffer3.from([reasonCode]));
        }
        if (propertiesData !== null) {
          propertiesData.write();
        }
        return true;
      }
      function auth(packet, stream, opts) {
        const version2 = opts ? opts.protocolVersion : 4;
        const settings = packet || {};
        const reasonCode = settings.reasonCode;
        const properties = settings.properties;
        let length = version2 === 5 ? 1 : 0;
        if (version2 !== 5)
          stream.destroy(new Error("Invalid mqtt version for auth packet"));
        const propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length);
        if (!propertiesData) {
          return false;
        }
        length += propertiesData.length;
        stream.write(Buffer3.from([protocol.codes.auth << 4]));
        writeVarByteInt(stream, length);
        stream.write(Buffer3.from([reasonCode]));
        if (propertiesData !== null) {
          propertiesData.write();
        }
        return true;
      }
      var varByteIntCache = {};
      function writeVarByteInt(stream, num) {
        if (num > protocol.VARBYTEINT_MAX) {
          stream.destroy(new Error(`Invalid variable byte integer: ${num}`));
          return false;
        }
        let buffer = varByteIntCache[num];
        if (!buffer) {
          buffer = genBufVariableByteInt(num);
          if (num < 16384)
            varByteIntCache[num] = buffer;
        }
        debug("writeVarByteInt: writing to stream: %o", buffer);
        return stream.write(buffer);
      }
      function writeString(stream, string) {
        const strlen = Buffer3.byteLength(string);
        writeNumber(stream, strlen);
        debug("writeString: %s", string);
        return stream.write(string, "utf8");
      }
      function writeStringPair(stream, name2, value) {
        writeString(stream, name2);
        writeString(stream, value);
      }
      function writeNumberCached(stream, number) {
        debug("writeNumberCached: number: %d", number);
        debug("writeNumberCached: %o", numCache[number]);
        return stream.write(numCache[number]);
      }
      function writeNumberGenerated(stream, number) {
        const generatedNumber = generateNumber(number);
        debug("writeNumberGenerated: %o", generatedNumber);
        return stream.write(generatedNumber);
      }
      function write4ByteNumber(stream, number) {
        const generated4ByteBuffer = generate4ByteBuffer(number);
        debug("write4ByteNumber: %o", generated4ByteBuffer);
        return stream.write(generated4ByteBuffer);
      }
      function writeStringOrBuffer(stream, toWrite) {
        if (typeof toWrite === "string") {
          writeString(stream, toWrite);
        } else if (toWrite) {
          writeNumber(stream, toWrite.length);
          stream.write(toWrite);
        } else
          writeNumber(stream, 0);
      }
      function getProperties(stream, properties) {
        if (typeof properties !== "object" || properties.length != null) {
          return {
            length: 1,
            write() {
              writeProperties(stream, {}, 0);
            }
          };
        }
        let propertiesLength = 0;
        function getLengthProperty(name2, value) {
          const type = protocol.propertiesTypes[name2];
          let length = 0;
          switch (type) {
            case "byte": {
              if (typeof value !== "boolean") {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + 1;
              break;
            }
            case "int8": {
              if (typeof value !== "number" || value < 0 || value > 255) {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + 1;
              break;
            }
            case "binary": {
              if (value && value === null) {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + Buffer3.byteLength(value) + 2;
              break;
            }
            case "int16": {
              if (typeof value !== "number" || value < 0 || value > 65535) {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + 2;
              break;
            }
            case "int32": {
              if (typeof value !== "number" || value < 0 || value > 4294967295) {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + 4;
              break;
            }
            case "var": {
              if (typeof value !== "number" || value < 0 || value > 268435455) {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + Buffer3.byteLength(genBufVariableByteInt(value));
              break;
            }
            case "string": {
              if (typeof value !== "string") {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += 1 + 2 + Buffer3.byteLength(value.toString());
              break;
            }
            case "pair": {
              if (typeof value !== "object") {
                stream.destroy(new Error(`Invalid ${name2}: ${value}`));
                return false;
              }
              length += Object.getOwnPropertyNames(value).reduce((result, name3) => {
                const currentValue = value[name3];
                if (Array.isArray(currentValue)) {
                  result += currentValue.reduce((currentLength, value2) => {
                    currentLength += 1 + 2 + Buffer3.byteLength(name3.toString()) + 2 + Buffer3.byteLength(value2.toString());
                    return currentLength;
                  }, 0);
                } else {
                  result += 1 + 2 + Buffer3.byteLength(name3.toString()) + 2 + Buffer3.byteLength(value[name3].toString());
                }
                return result;
              }, 0);
              break;
            }
            default: {
              stream.destroy(new Error(`Invalid property ${name2}: ${value}`));
              return false;
            }
          }
          return length;
        }
        if (properties) {
          for (const propName in properties) {
            let propLength = 0;
            let propValueLength = 0;
            const propValue = properties[propName];
            if (Array.isArray(propValue)) {
              for (let valueIndex = 0; valueIndex < propValue.length; valueIndex++) {
                propValueLength = getLengthProperty(propName, propValue[valueIndex]);
                if (!propValueLength) {
                  return false;
                }
                propLength += propValueLength;
              }
            } else {
              propValueLength = getLengthProperty(propName, propValue);
              if (!propValueLength) {
                return false;
              }
              propLength = propValueLength;
            }
            if (!propLength)
              return false;
            propertiesLength += propLength;
          }
        }
        const propertiesLengthLength = Buffer3.byteLength(genBufVariableByteInt(propertiesLength));
        return {
          length: propertiesLengthLength + propertiesLength,
          write() {
            writeProperties(stream, properties, propertiesLength);
          }
        };
      }
      function getPropertiesByMaximumPacketSize(stream, properties, opts, length) {
        const mayEmptyProps = ["reasonString", "userProperties"];
        const maximumPacketSize = opts && opts.properties && opts.properties.maximumPacketSize ? opts.properties.maximumPacketSize : 0;
        let propertiesData = getProperties(stream, properties);
        if (maximumPacketSize) {
          while (length + propertiesData.length > maximumPacketSize) {
            const currentMayEmptyProp = mayEmptyProps.shift();
            if (currentMayEmptyProp && properties[currentMayEmptyProp]) {
              delete properties[currentMayEmptyProp];
              propertiesData = getProperties(stream, properties);
            } else {
              return false;
            }
          }
        }
        return propertiesData;
      }
      function writeProperty(stream, propName, value) {
        const type = protocol.propertiesTypes[propName];
        switch (type) {
          case "byte": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            stream.write(Buffer3.from([+value]));
            break;
          }
          case "int8": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            stream.write(Buffer3.from([value]));
            break;
          }
          case "binary": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            writeStringOrBuffer(stream, value);
            break;
          }
          case "int16": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            writeNumber(stream, value);
            break;
          }
          case "int32": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            write4ByteNumber(stream, value);
            break;
          }
          case "var": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            writeVarByteInt(stream, value);
            break;
          }
          case "string": {
            stream.write(Buffer3.from([protocol.properties[propName]]));
            writeString(stream, value);
            break;
          }
          case "pair": {
            Object.getOwnPropertyNames(value).forEach((name2) => {
              const currentValue = value[name2];
              if (Array.isArray(currentValue)) {
                currentValue.forEach((value2) => {
                  stream.write(Buffer3.from([protocol.properties[propName]]));
                  writeStringPair(stream, name2.toString(), value2.toString());
                });
              } else {
                stream.write(Buffer3.from([protocol.properties[propName]]));
                writeStringPair(stream, name2.toString(), currentValue.toString());
              }
            });
            break;
          }
          default: {
            stream.destroy(new Error(`Invalid property ${propName} value: ${value}`));
            return false;
          }
        }
      }
      function writeProperties(stream, properties, propertiesLength) {
        writeVarByteInt(stream, propertiesLength);
        for (const propName in properties) {
          if (Object.prototype.hasOwnProperty.call(properties, propName) && properties[propName] !== null) {
            const value = properties[propName];
            if (Array.isArray(value)) {
              for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
                writeProperty(stream, propName, value[valueIndex]);
              }
            } else {
              writeProperty(stream, propName, value);
            }
          }
        }
      }
      function byteLength(bufOrString) {
        if (!bufOrString)
          return 0;
        else if (bufOrString instanceof Buffer3)
          return bufOrString.length;
        else
          return Buffer3.byteLength(bufOrString);
      }
      function isStringOrBuffer(field) {
        return typeof field === "string" || field instanceof Buffer3;
      }
      module.exports = generate;
    }
  });

  // node_modules/mqtt-packet/generate.js
  var require_generate = __commonJS({
    "node_modules/mqtt-packet/generate.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var writeToStream = require_writeToStream();
      var { EventEmitter: EventEmitter2 } = (init_events(), __toCommonJS(events_exports));
      var { Buffer: Buffer3 } = (init_buffer(), __toCommonJS(buffer_exports));
      function generate(packet, opts) {
        const stream = new Accumulator();
        writeToStream(packet, stream, opts);
        return stream.concat();
      }
      var Accumulator = class extends EventEmitter2 {
        constructor() {
          super();
          this._array = new Array(20);
          this._i = 0;
        }
        write(chunk) {
          this._array[this._i++] = chunk;
          return true;
        }
        concat() {
          let length = 0;
          const lengths = new Array(this._array.length);
          const list = this._array;
          let pos = 0;
          let i6;
          for (i6 = 0; i6 < list.length && list[i6] !== void 0; i6++) {
            if (typeof list[i6] !== "string")
              lengths[i6] = list[i6].length;
            else
              lengths[i6] = Buffer3.byteLength(list[i6]);
            length += lengths[i6];
          }
          const result = Buffer3.allocUnsafe(length);
          for (i6 = 0; i6 < list.length && list[i6] !== void 0; i6++) {
            if (typeof list[i6] !== "string") {
              list[i6].copy(result, pos);
              pos += lengths[i6];
            } else {
              result.write(list[i6], pos);
              pos += lengths[i6];
            }
          }
          return result;
        }
        destroy(err) {
          if (err)
            this.emit("error", err);
        }
      };
      module.exports = generate;
    }
  });

  // node_modules/mqtt-packet/mqtt.js
  var require_mqtt = __commonJS({
    "node_modules/mqtt-packet/mqtt.js"(exports5) {
      init_buffer2();
      init_process2();
      init_navigator();
      exports5.parser = require_parser().parser;
      exports5.generate = require_generate();
      exports5.writeToStream = require_writeToStream();
    }
  });

  // build/lib/default-message-id-provider.js
  var require_default_message_id_provider = __commonJS({
    "build/lib/default-message-id-provider.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var DefaultMessageIdProvider = class {
        constructor() {
          this.nextId = Math.max(1, Math.floor(Math.random() * 65535));
        }
        allocate() {
          const id = this.nextId++;
          if (this.nextId === 65536) {
            this.nextId = 1;
          }
          return id;
        }
        getLastAllocated() {
          return this.nextId === 1 ? 65535 : this.nextId - 1;
        }
        register(messageId) {
          return true;
        }
        deallocate(messageId) {
        }
        clear() {
        }
      };
      exports5.default = DefaultMessageIdProvider;
    }
  });

  // node_modules/rfdc/index.js
  var require_rfdc = __commonJS({
    "node_modules/rfdc/index.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      module.exports = rfdc;
      function copyBuffer(cur) {
        if (cur instanceof Buffer2) {
          return Buffer2.from(cur);
        }
        return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length);
      }
      function rfdc(opts) {
        opts = opts || {};
        if (opts.circles)
          return rfdcCircles(opts);
        return opts.proto ? cloneProto : clone;
        function cloneArray(a6, fn) {
          var keys = Object.keys(a6);
          var a22 = new Array(keys.length);
          for (var i6 = 0; i6 < keys.length; i6++) {
            var k2 = keys[i6];
            var cur = a6[k2];
            if (typeof cur !== "object" || cur === null) {
              a22[k2] = cur;
            } else if (cur instanceof Date) {
              a22[k2] = new Date(cur);
            } else if (ArrayBuffer.isView(cur)) {
              a22[k2] = copyBuffer(cur);
            } else {
              a22[k2] = fn(cur);
            }
          }
          return a22;
        }
        function clone(o7) {
          if (typeof o7 !== "object" || o7 === null)
            return o7;
          if (o7 instanceof Date)
            return new Date(o7);
          if (Array.isArray(o7))
            return cloneArray(o7, clone);
          if (o7 instanceof Map)
            return new Map(cloneArray(Array.from(o7), clone));
          if (o7 instanceof Set)
            return new Set(cloneArray(Array.from(o7), clone));
          var o22 = {};
          for (var k2 in o7) {
            if (Object.hasOwnProperty.call(o7, k2) === false)
              continue;
            var cur = o7[k2];
            if (typeof cur !== "object" || cur === null) {
              o22[k2] = cur;
            } else if (cur instanceof Date) {
              o22[k2] = new Date(cur);
            } else if (cur instanceof Map) {
              o22[k2] = new Map(cloneArray(Array.from(cur), clone));
            } else if (cur instanceof Set) {
              o22[k2] = new Set(cloneArray(Array.from(cur), clone));
            } else if (ArrayBuffer.isView(cur)) {
              o22[k2] = copyBuffer(cur);
            } else {
              o22[k2] = clone(cur);
            }
          }
          return o22;
        }
        function cloneProto(o7) {
          if (typeof o7 !== "object" || o7 === null)
            return o7;
          if (o7 instanceof Date)
            return new Date(o7);
          if (Array.isArray(o7))
            return cloneArray(o7, cloneProto);
          if (o7 instanceof Map)
            return new Map(cloneArray(Array.from(o7), cloneProto));
          if (o7 instanceof Set)
            return new Set(cloneArray(Array.from(o7), cloneProto));
          var o22 = {};
          for (var k2 in o7) {
            var cur = o7[k2];
            if (typeof cur !== "object" || cur === null) {
              o22[k2] = cur;
            } else if (cur instanceof Date) {
              o22[k2] = new Date(cur);
            } else if (cur instanceof Map) {
              o22[k2] = new Map(cloneArray(Array.from(cur), cloneProto));
            } else if (cur instanceof Set) {
              o22[k2] = new Set(cloneArray(Array.from(cur), cloneProto));
            } else if (ArrayBuffer.isView(cur)) {
              o22[k2] = copyBuffer(cur);
            } else {
              o22[k2] = cloneProto(cur);
            }
          }
          return o22;
        }
      }
      function rfdcCircles(opts) {
        var refs = [];
        var refsNew = [];
        return opts.proto ? cloneProto : clone;
        function cloneArray(a6, fn) {
          var keys = Object.keys(a6);
          var a22 = new Array(keys.length);
          for (var i6 = 0; i6 < keys.length; i6++) {
            var k2 = keys[i6];
            var cur = a6[k2];
            if (typeof cur !== "object" || cur === null) {
              a22[k2] = cur;
            } else if (cur instanceof Date) {
              a22[k2] = new Date(cur);
            } else if (ArrayBuffer.isView(cur)) {
              a22[k2] = copyBuffer(cur);
            } else {
              var index = refs.indexOf(cur);
              if (index !== -1) {
                a22[k2] = refsNew[index];
              } else {
                a22[k2] = fn(cur);
              }
            }
          }
          return a22;
        }
        function clone(o7) {
          if (typeof o7 !== "object" || o7 === null)
            return o7;
          if (o7 instanceof Date)
            return new Date(o7);
          if (Array.isArray(o7))
            return cloneArray(o7, clone);
          if (o7 instanceof Map)
            return new Map(cloneArray(Array.from(o7), clone));
          if (o7 instanceof Set)
            return new Set(cloneArray(Array.from(o7), clone));
          var o22 = {};
          refs.push(o7);
          refsNew.push(o22);
          for (var k2 in o7) {
            if (Object.hasOwnProperty.call(o7, k2) === false)
              continue;
            var cur = o7[k2];
            if (typeof cur !== "object" || cur === null) {
              o22[k2] = cur;
            } else if (cur instanceof Date) {
              o22[k2] = new Date(cur);
            } else if (cur instanceof Map) {
              o22[k2] = new Map(cloneArray(Array.from(cur), clone));
            } else if (cur instanceof Set) {
              o22[k2] = new Set(cloneArray(Array.from(cur), clone));
            } else if (ArrayBuffer.isView(cur)) {
              o22[k2] = copyBuffer(cur);
            } else {
              var i6 = refs.indexOf(cur);
              if (i6 !== -1) {
                o22[k2] = refsNew[i6];
              } else {
                o22[k2] = clone(cur);
              }
            }
          }
          refs.pop();
          refsNew.pop();
          return o22;
        }
        function cloneProto(o7) {
          if (typeof o7 !== "object" || o7 === null)
            return o7;
          if (o7 instanceof Date)
            return new Date(o7);
          if (Array.isArray(o7))
            return cloneArray(o7, cloneProto);
          if (o7 instanceof Map)
            return new Map(cloneArray(Array.from(o7), cloneProto));
          if (o7 instanceof Set)
            return new Set(cloneArray(Array.from(o7), cloneProto));
          var o22 = {};
          refs.push(o7);
          refsNew.push(o22);
          for (var k2 in o7) {
            var cur = o7[k2];
            if (typeof cur !== "object" || cur === null) {
              o22[k2] = cur;
            } else if (cur instanceof Date) {
              o22[k2] = new Date(cur);
            } else if (cur instanceof Map) {
              o22[k2] = new Map(cloneArray(Array.from(cur), cloneProto));
            } else if (cur instanceof Set) {
              o22[k2] = new Set(cloneArray(Array.from(cur), cloneProto));
            } else if (ArrayBuffer.isView(cur)) {
              o22[k2] = copyBuffer(cur);
            } else {
              var i6 = refs.indexOf(cur);
              if (i6 !== -1) {
                o22[k2] = refsNew[i6];
              } else {
                o22[k2] = cloneProto(cur);
              }
            }
          }
          refs.pop();
          refsNew.pop();
          return o22;
        }
      }
    }
  });

  // node_modules/rfdc/default.js
  var require_default = __commonJS({
    "node_modules/rfdc/default.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      module.exports = require_rfdc()();
    }
  });

  // build/lib/validations.js
  var require_validations = __commonJS({
    "build/lib/validations.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.validateTopics = exports5.validateTopic = void 0;
      function validateTopic(topic) {
        const parts = topic.split("/");
        for (let i6 = 0; i6 < parts.length; i6++) {
          if (parts[i6] === "+") {
            continue;
          }
          if (parts[i6] === "#") {
            return i6 === parts.length - 1;
          }
          if (parts[i6].indexOf("+") !== -1 || parts[i6].indexOf("#") !== -1) {
            return false;
          }
        }
        return true;
      }
      exports5.validateTopic = validateTopic;
      function validateTopics(topics) {
        if (topics.length === 0) {
          return "empty_topic_list";
        }
        for (let i6 = 0; i6 < topics.length; i6++) {
          if (!validateTopic(topics[i6])) {
            return topics[i6];
          }
        }
        return null;
      }
      exports5.validateTopics = validateTopics;
    }
  });

  // build/lib/store.js
  var require_store = __commonJS({
    "build/lib/store.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var readable_stream_1 = require_browser3();
      var streamsOpts = { objectMode: true };
      var defaultStoreOptions = {
        clean: true
      };
      var Store = class {
        constructor(options) {
          this.options = options || {};
          this.options = Object.assign(Object.assign({}, defaultStoreOptions), options);
          this._inflights = /* @__PURE__ */ new Map();
        }
        put(packet, cb) {
          this._inflights.set(packet.messageId, packet);
          if (cb) {
            cb();
          }
          return this;
        }
        createStream() {
          const stream = new readable_stream_1.Readable(streamsOpts);
          const values = [];
          let destroyed = false;
          let i6 = 0;
          this._inflights.forEach((value, key) => {
            values.push(value);
          });
          stream._read = () => {
            if (!destroyed && i6 < values.length) {
              stream.push(values[i6++]);
            } else {
              stream.push(null);
            }
          };
          stream.destroy = (err) => {
            if (destroyed) {
              return;
            }
            destroyed = true;
            setTimeout(() => {
              stream.emit("close");
            }, 0);
            return stream;
          };
          return stream;
        }
        del(packet, cb) {
          const toDelete = this._inflights.get(packet.messageId);
          if (toDelete) {
            this._inflights.delete(packet.messageId);
            cb(null, toDelete);
          } else if (cb) {
            cb(new Error("missing packet"));
          }
          return this;
        }
        get(packet, cb) {
          const storedPacket = this._inflights.get(packet.messageId);
          if (storedPacket) {
            cb(null, storedPacket);
          } else if (cb) {
            cb(new Error("missing packet"));
          }
          return this;
        }
        close(cb) {
          if (this.options.clean) {
            this._inflights = null;
          }
          if (cb) {
            cb();
          }
        }
      };
      exports5.default = Store;
    }
  });

  // build/lib/handlers/publish.js
  var require_publish = __commonJS({
    "build/lib/handlers/publish.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153];
      var handlePublish = (client, packet, done) => {
        client.log("handlePublish: packet %o", packet);
        done = typeof done !== "undefined" ? done : client.noop;
        let topic = packet.topic.toString();
        const message = packet.payload;
        const { qos } = packet;
        const { messageId } = packet;
        const { options } = client;
        if (client.options.protocolVersion === 5) {
          let alias;
          if (packet.properties) {
            alias = packet.properties.topicAlias;
          }
          if (typeof alias !== "undefined") {
            if (topic.length === 0) {
              if (alias > 0 && alias <= 65535) {
                const gotTopic = client["topicAliasRecv"].getTopicByAlias(alias);
                if (gotTopic) {
                  topic = gotTopic;
                  client.log("handlePublish :: topic complemented by alias. topic: %s - alias: %d", topic, alias);
                } else {
                  client.log("handlePublish :: unregistered topic alias. alias: %d", alias);
                  client.emit("error", new Error("Received unregistered Topic Alias"));
                  return;
                }
              } else {
                client.log("handlePublish :: topic alias out of range. alias: %d", alias);
                client.emit("error", new Error("Received Topic Alias is out of range"));
                return;
              }
            } else if (client["topicAliasRecv"].put(topic, alias)) {
              client.log("handlePublish :: registered topic: %s - alias: %d", topic, alias);
            } else {
              client.log("handlePublish :: topic alias out of range. alias: %d", alias);
              client.emit("error", new Error("Received Topic Alias is out of range"));
              return;
            }
          }
        }
        client.log("handlePublish: qos %d", qos);
        switch (qos) {
          case 2: {
            options.customHandleAcks(topic, message, packet, (error, code) => {
              if (typeof error === "number") {
                code = error;
                error = null;
              }
              if (error) {
                return client.emit("error", error);
              }
              if (validReasonCodes.indexOf(code) === -1) {
                return client.emit("error", new Error("Wrong reason code for pubrec"));
              }
              if (code) {
                client["_sendPacket"]({ cmd: "pubrec", messageId, reasonCode: code }, done);
              } else {
                client.incomingStore.put(packet, () => {
                  client["_sendPacket"]({ cmd: "pubrec", messageId }, done);
                });
              }
            });
            break;
          }
          case 1: {
            options.customHandleAcks(topic, message, packet, (error, code) => {
              if (typeof error === "number") {
                code = error;
                error = null;
              }
              if (error) {
                return client.emit("error", error);
              }
              if (validReasonCodes.indexOf(code) === -1) {
                return client.emit("error", new Error("Wrong reason code for puback"));
              }
              if (!code) {
                client.emit("message", topic, message, packet);
              }
              client.handleMessage(packet, (err) => {
                if (err) {
                  return done && done(err);
                }
                client["_sendPacket"]({ cmd: "puback", messageId, reasonCode: code }, done);
              });
            });
            break;
          }
          case 0:
            client.emit("message", topic, message, packet);
            client.handleMessage(packet, done);
            break;
          default:
            client.log("handlePublish: unknown QoS. Doing nothing.");
            break;
        }
      };
      exports5.default = handlePublish;
    }
  });

  // package-json:../../package.json
  var require_package = __commonJS({
    "package-json:../../package.json"(exports5, module) {
      module.exports = { version: "5.7.2" };
    }
  });

  // build/lib/shared.js
  var require_shared = __commonJS({
    "build/lib/shared.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.MQTTJS_VERSION = exports5.nextTick = exports5.applyMixin = exports5.ErrorWithReasonCode = void 0;
      var ErrorWithReasonCode = class _ErrorWithReasonCode extends Error {
        constructor(message, code) {
          super(message);
          this.code = code;
          Object.setPrototypeOf(this, _ErrorWithReasonCode.prototype);
          Object.getPrototypeOf(this).name = "ErrorWithReasonCode";
        }
      };
      exports5.ErrorWithReasonCode = ErrorWithReasonCode;
      function applyMixin(target, mixin, includeConstructor = false) {
        var _a;
        const inheritanceChain = [mixin];
        while (true) {
          const current = inheritanceChain[0];
          const base = Object.getPrototypeOf(current);
          if (base === null || base === void 0 ? void 0 : base.prototype) {
            inheritanceChain.unshift(base);
          } else {
            break;
          }
        }
        for (const ctor of inheritanceChain) {
          for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
            if (includeConstructor || prop !== "constructor") {
              Object.defineProperty(target.prototype, prop, (_a = Object.getOwnPropertyDescriptor(ctor.prototype, prop)) !== null && _a !== void 0 ? _a : /* @__PURE__ */ Object.create(null));
            }
          }
        }
      }
      exports5.applyMixin = applyMixin;
      exports5.nextTick = typeof (process_exports === null || process_exports === void 0 ? void 0 : process_exports.nextTick) === "function" ? process_exports.nextTick : (callback) => {
        setTimeout(callback, 0);
      };
      exports5.MQTTJS_VERSION = require_package().version;
    }
  });

  // build/lib/handlers/ack.js
  var require_ack = __commonJS({
    "build/lib/handlers/ack.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.ReasonCodes = void 0;
      exports5.ReasonCodes = {
        0: "",
        1: "Unacceptable protocol version",
        2: "Identifier rejected",
        3: "Server unavailable",
        4: "Bad username or password",
        5: "Not authorized",
        16: "No matching subscribers",
        17: "No subscription existed",
        128: "Unspecified error",
        129: "Malformed Packet",
        130: "Protocol Error",
        131: "Implementation specific error",
        132: "Unsupported Protocol Version",
        133: "Client Identifier not valid",
        134: "Bad User Name or Password",
        135: "Not authorized",
        136: "Server unavailable",
        137: "Server busy",
        138: "Banned",
        139: "Server shutting down",
        140: "Bad authentication method",
        141: "Keep Alive timeout",
        142: "Session taken over",
        143: "Topic Filter invalid",
        144: "Topic Name invalid",
        145: "Packet identifier in use",
        146: "Packet Identifier not found",
        147: "Receive Maximum exceeded",
        148: "Topic Alias invalid",
        149: "Packet too large",
        150: "Message rate too high",
        151: "Quota exceeded",
        152: "Administrative action",
        153: "Payload format invalid",
        154: "Retain not supported",
        155: "QoS not supported",
        156: "Use another server",
        157: "Server moved",
        158: "Shared Subscriptions not supported",
        159: "Connection rate exceeded",
        160: "Maximum connect time",
        161: "Subscription Identifiers not supported",
        162: "Wildcard Subscriptions not supported"
      };
      var handleAck = (client, packet) => {
        const { messageId } = packet;
        const type = packet.cmd;
        let response = null;
        const cb = client.outgoing[messageId] ? client.outgoing[messageId].cb : null;
        let err = null;
        if (!cb) {
          client.log("_handleAck :: Server sent an ack in error. Ignoring.");
          return;
        }
        client.log("_handleAck :: packet type", type);
        switch (type) {
          case "pubcomp":
          case "puback": {
            const pubackRC = packet.reasonCode;
            if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
              err = new Error(`Publish error: ${exports5.ReasonCodes[pubackRC]}`);
              err.code = pubackRC;
              client["_removeOutgoingAndStoreMessage"](messageId, () => {
                cb(err, packet);
              });
            } else {
              client["_removeOutgoingAndStoreMessage"](messageId, cb);
            }
            break;
          }
          case "pubrec": {
            response = {
              cmd: "pubrel",
              qos: 2,
              messageId
            };
            const pubrecRC = packet.reasonCode;
            if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
              err = new Error(`Publish error: ${exports5.ReasonCodes[pubrecRC]}`);
              err.code = pubrecRC;
              client["_removeOutgoingAndStoreMessage"](messageId, () => {
                cb(err, packet);
              });
            } else {
              client["_sendPacket"](response);
            }
            break;
          }
          case "suback": {
            delete client.outgoing[messageId];
            client.messageIdProvider.deallocate(messageId);
            const granted = packet.granted;
            for (let grantedI = 0; grantedI < granted.length; grantedI++) {
              const subackRC = granted[grantedI];
              if ((subackRC & 128) !== 0) {
                err = new Error(`Subscribe error: ${exports5.ReasonCodes[subackRC]}`);
                err.code = subackRC;
                const topics = client.messageIdToTopic[messageId];
                if (topics) {
                  topics.forEach((topic) => {
                    delete client["_resubscribeTopics"][topic];
                  });
                }
              }
            }
            delete client.messageIdToTopic[messageId];
            client["_invokeStoreProcessingQueue"]();
            cb(err, packet);
            break;
          }
          case "unsuback": {
            delete client.outgoing[messageId];
            client.messageIdProvider.deallocate(messageId);
            client["_invokeStoreProcessingQueue"]();
            cb(null);
            break;
          }
          default:
            client.emit("error", new Error("unrecognized packet type"));
        }
        if (client.disconnecting && Object.keys(client.outgoing).length === 0) {
          client.emit("outgoingEmpty");
        }
      };
      exports5.default = handleAck;
    }
  });

  // build/lib/handlers/auth.js
  var require_auth = __commonJS({
    "build/lib/handlers/auth.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var shared_1 = require_shared();
      var ack_1 = require_ack();
      var handleAuth = (client, packet) => {
        const { options } = client;
        const version2 = options.protocolVersion;
        const rc = version2 === 5 ? packet.reasonCode : packet.returnCode;
        if (version2 !== 5) {
          const err = new shared_1.ErrorWithReasonCode(`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version2}`, rc);
          client.emit("error", err);
          return;
        }
        client.handleAuth(packet, (err, packet2) => {
          if (err) {
            client.emit("error", err);
            return;
          }
          if (rc === 24) {
            client.reconnecting = false;
            client["_sendPacket"](packet2);
          } else {
            const error = new shared_1.ErrorWithReasonCode(`Connection refused: ${ack_1.ReasonCodes[rc]}`, rc);
            client.emit("error", error);
          }
        });
      };
      exports5.default = handleAuth;
    }
  });

  // node_modules/lru-cache/dist/cjs/index.js
  var require_cjs = __commonJS({
    "node_modules/lru-cache/dist/cjs/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.LRUCache = void 0;
      var perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
      var warned = /* @__PURE__ */ new Set();
      var PROCESS = typeof process_exports === "object" && !!process_exports ? process_exports : {};
      var emitWarning2 = (msg, type, code, fn) => {
        typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
      };
      var AC = globalThis.AbortController;
      var AS = globalThis.AbortSignal;
      if (typeof AC === "undefined") {
        AS = class AbortSignal {
          onabort;
          _onabort = [];
          reason;
          aborted = false;
          addEventListener(_2, fn) {
            this._onabort.push(fn);
          }
        };
        AC = class AbortController {
          constructor() {
            warnACPolyfill();
          }
          signal = new AS();
          abort(reason) {
            if (this.signal.aborted)
              return;
            this.signal.reason = reason;
            this.signal.aborted = true;
            for (const fn of this.signal._onabort) {
              fn(reason);
            }
            this.signal.onabort?.(reason);
          }
        };
        let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1";
        const warnACPolyfill = () => {
          if (!printACPolyfillWarning)
            return;
          printACPolyfillWarning = false;
          emitWarning2("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
        };
      }
      var shouldWarn = (code) => !warned.has(code);
      var TYPE = Symbol("type");
      var isPosInt = (n7) => n7 && n7 === Math.floor(n7) && n7 > 0 && isFinite(n7);
      var getUintArray = (max) => !isPosInt(max) ? null : max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
      var ZeroArray = class extends Array {
        constructor(size) {
          super(size);
          this.fill(0);
        }
      };
      var Stack = class _Stack {
        heap;
        length;
        // private constructor
        static #constructing = false;
        static create(max) {
          const HeapCls = getUintArray(max);
          if (!HeapCls)
            return [];
          _Stack.#constructing = true;
          const s5 = new _Stack(max, HeapCls);
          _Stack.#constructing = false;
          return s5;
        }
        constructor(max, HeapCls) {
          if (!_Stack.#constructing) {
            throw new TypeError("instantiate Stack using Stack.create(n)");
          }
          this.heap = new HeapCls(max);
          this.length = 0;
        }
        push(n7) {
          this.heap[this.length++] = n7;
        }
        pop() {
          return this.heap[--this.length];
        }
      };
      var LRUCache = class _LRUCache {
        // properties coming in from the options of these, only max and maxSize
        // really *need* to be protected. The rest can be modified, as they just
        // set defaults for various methods.
        #max;
        #maxSize;
        #dispose;
        #disposeAfter;
        #fetchMethod;
        /**
         * {@link LRUCache.OptionsBase.ttl}
         */
        ttl;
        /**
         * {@link LRUCache.OptionsBase.ttlResolution}
         */
        ttlResolution;
        /**
         * {@link LRUCache.OptionsBase.ttlAutopurge}
         */
        ttlAutopurge;
        /**
         * {@link LRUCache.OptionsBase.updateAgeOnGet}
         */
        updateAgeOnGet;
        /**
         * {@link LRUCache.OptionsBase.updateAgeOnHas}
         */
        updateAgeOnHas;
        /**
         * {@link LRUCache.OptionsBase.allowStale}
         */
        allowStale;
        /**
         * {@link LRUCache.OptionsBase.noDisposeOnSet}
         */
        noDisposeOnSet;
        /**
         * {@link LRUCache.OptionsBase.noUpdateTTL}
         */
        noUpdateTTL;
        /**
         * {@link LRUCache.OptionsBase.maxEntrySize}
         */
        maxEntrySize;
        /**
         * {@link LRUCache.OptionsBase.sizeCalculation}
         */
        sizeCalculation;
        /**
         * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
         */
        noDeleteOnFetchRejection;
        /**
         * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
         */
        noDeleteOnStaleGet;
        /**
         * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
         */
        allowStaleOnFetchAbort;
        /**
         * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
         */
        allowStaleOnFetchRejection;
        /**
         * {@link LRUCache.OptionsBase.ignoreFetchAbort}
         */
        ignoreFetchAbort;
        // computed properties
        #size;
        #calculatedSize;
        #keyMap;
        #keyList;
        #valList;
        #next;
        #prev;
        #head;
        #tail;
        #free;
        #disposed;
        #sizes;
        #starts;
        #ttls;
        #hasDispose;
        #hasFetchMethod;
        #hasDisposeAfter;
        /**
         * Do not call this method unless you need to inspect the
         * inner workings of the cache.  If anything returned by this
         * object is modified in any way, strange breakage may occur.
         *
         * These fields are private for a reason!
         *
         * @internal
         */
        static unsafeExposeInternals(c6) {
          return {
            // properties
            starts: c6.#starts,
            ttls: c6.#ttls,
            sizes: c6.#sizes,
            keyMap: c6.#keyMap,
            keyList: c6.#keyList,
            valList: c6.#valList,
            next: c6.#next,
            prev: c6.#prev,
            get head() {
              return c6.#head;
            },
            get tail() {
              return c6.#tail;
            },
            free: c6.#free,
            // methods
            isBackgroundFetch: (p6) => c6.#isBackgroundFetch(p6),
            backgroundFetch: (k2, index, options, context) => c6.#backgroundFetch(k2, index, options, context),
            moveToTail: (index) => c6.#moveToTail(index),
            indexes: (options) => c6.#indexes(options),
            rindexes: (options) => c6.#rindexes(options),
            isStale: (index) => c6.#isStale(index)
          };
        }
        // Protected read-only members
        /**
         * {@link LRUCache.OptionsBase.max} (read-only)
         */
        get max() {
          return this.#max;
        }
        /**
         * {@link LRUCache.OptionsBase.maxSize} (read-only)
         */
        get maxSize() {
          return this.#maxSize;
        }
        /**
         * The total computed size of items in the cache (read-only)
         */
        get calculatedSize() {
          return this.#calculatedSize;
        }
        /**
         * The number of items stored in the cache (read-only)
         */
        get size() {
          return this.#size;
        }
        /**
         * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
         */
        get fetchMethod() {
          return this.#fetchMethod;
        }
        /**
         * {@link LRUCache.OptionsBase.dispose} (read-only)
         */
        get dispose() {
          return this.#dispose;
        }
        /**
         * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
         */
        get disposeAfter() {
          return this.#disposeAfter;
        }
        constructor(options) {
          const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
          if (max !== 0 && !isPosInt(max)) {
            throw new TypeError("max option must be a nonnegative integer");
          }
          const UintArray = max ? getUintArray(max) : Array;
          if (!UintArray) {
            throw new Error("invalid max value: " + max);
          }
          this.#max = max;
          this.#maxSize = maxSize;
          this.maxEntrySize = maxEntrySize || this.#maxSize;
          this.sizeCalculation = sizeCalculation;
          if (this.sizeCalculation) {
            if (!this.#maxSize && !this.maxEntrySize) {
              throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
            }
            if (typeof this.sizeCalculation !== "function") {
              throw new TypeError("sizeCalculation set to non-function");
            }
          }
          if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
            throw new TypeError("fetchMethod must be a function if specified");
          }
          this.#fetchMethod = fetchMethod;
          this.#hasFetchMethod = !!fetchMethod;
          this.#keyMap = /* @__PURE__ */ new Map();
          this.#keyList = new Array(max).fill(void 0);
          this.#valList = new Array(max).fill(void 0);
          this.#next = new UintArray(max);
          this.#prev = new UintArray(max);
          this.#head = 0;
          this.#tail = 0;
          this.#free = Stack.create(max);
          this.#size = 0;
          this.#calculatedSize = 0;
          if (typeof dispose === "function") {
            this.#dispose = dispose;
          }
          if (typeof disposeAfter === "function") {
            this.#disposeAfter = disposeAfter;
            this.#disposed = [];
          } else {
            this.#disposeAfter = void 0;
            this.#disposed = void 0;
          }
          this.#hasDispose = !!this.#dispose;
          this.#hasDisposeAfter = !!this.#disposeAfter;
          this.noDisposeOnSet = !!noDisposeOnSet;
          this.noUpdateTTL = !!noUpdateTTL;
          this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
          this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
          this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
          this.ignoreFetchAbort = !!ignoreFetchAbort;
          if (this.maxEntrySize !== 0) {
            if (this.#maxSize !== 0) {
              if (!isPosInt(this.#maxSize)) {
                throw new TypeError("maxSize must be a positive integer if specified");
              }
            }
            if (!isPosInt(this.maxEntrySize)) {
              throw new TypeError("maxEntrySize must be a positive integer if specified");
            }
            this.#initializeSizeTracking();
          }
          this.allowStale = !!allowStale;
          this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
          this.updateAgeOnGet = !!updateAgeOnGet;
          this.updateAgeOnHas = !!updateAgeOnHas;
          this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
          this.ttlAutopurge = !!ttlAutopurge;
          this.ttl = ttl || 0;
          if (this.ttl) {
            if (!isPosInt(this.ttl)) {
              throw new TypeError("ttl must be a positive integer if specified");
            }
            this.#initializeTTLTracking();
          }
          if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0) {
            throw new TypeError("At least one of max, maxSize, or ttl is required");
          }
          if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
            const code = "LRU_CACHE_UNBOUNDED";
            if (shouldWarn(code)) {
              warned.add(code);
              const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
              emitWarning2(msg, "UnboundedCacheWarning", code, _LRUCache);
            }
          }
        }
        /**
         * Return the remaining TTL time for a given entry key
         */
        getRemainingTTL(key) {
          return this.#keyMap.has(key) ? Infinity : 0;
        }
        #initializeTTLTracking() {
          const ttls = new ZeroArray(this.#max);
          const starts = new ZeroArray(this.#max);
          this.#ttls = ttls;
          this.#starts = starts;
          this.#setItemTTL = (index, ttl, start = perf.now()) => {
            starts[index] = ttl !== 0 ? start : 0;
            ttls[index] = ttl;
            if (ttl !== 0 && this.ttlAutopurge) {
              const t6 = setTimeout(() => {
                if (this.#isStale(index)) {
                  this.delete(this.#keyList[index]);
                }
              }, ttl + 1);
              if (t6.unref) {
                t6.unref();
              }
            }
          };
          this.#updateItemAge = (index) => {
            starts[index] = ttls[index] !== 0 ? perf.now() : 0;
          };
          this.#statusTTL = (status, index) => {
            if (ttls[index]) {
              const ttl = ttls[index];
              const start = starts[index];
              status.ttl = ttl;
              status.start = start;
              status.now = cachedNow || getNow();
              const age = status.now - start;
              status.remainingTTL = ttl - age;
            }
          };
          let cachedNow = 0;
          const getNow = () => {
            const n7 = perf.now();
            if (this.ttlResolution > 0) {
              cachedNow = n7;
              const t6 = setTimeout(() => cachedNow = 0, this.ttlResolution);
              if (t6.unref) {
                t6.unref();
              }
            }
            return n7;
          };
          this.getRemainingTTL = (key) => {
            const index = this.#keyMap.get(key);
            if (index === void 0) {
              return 0;
            }
            const ttl = ttls[index];
            const start = starts[index];
            if (ttl === 0 || start === 0) {
              return Infinity;
            }
            const age = (cachedNow || getNow()) - start;
            return ttl - age;
          };
          this.#isStale = (index) => {
            return ttls[index] !== 0 && starts[index] !== 0 && (cachedNow || getNow()) - starts[index] > ttls[index];
          };
        }
        // conditionally set private methods related to TTL
        #updateItemAge = () => {
        };
        #statusTTL = () => {
        };
        #setItemTTL = () => {
        };
        /* c8 ignore stop */
        #isStale = () => false;
        #initializeSizeTracking() {
          const sizes = new ZeroArray(this.#max);
          this.#calculatedSize = 0;
          this.#sizes = sizes;
          this.#removeItemSize = (index) => {
            this.#calculatedSize -= sizes[index];
            sizes[index] = 0;
          };
          this.#requireSize = (k2, v4, size, sizeCalculation) => {
            if (this.#isBackgroundFetch(v4)) {
              return 0;
            }
            if (!isPosInt(size)) {
              if (sizeCalculation) {
                if (typeof sizeCalculation !== "function") {
                  throw new TypeError("sizeCalculation must be a function");
                }
                size = sizeCalculation(v4, k2);
                if (!isPosInt(size)) {
                  throw new TypeError("sizeCalculation return invalid (expect positive integer)");
                }
              } else {
                throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
              }
            }
            return size;
          };
          this.#addItemSize = (index, size, status) => {
            sizes[index] = size;
            if (this.#maxSize) {
              const maxSize = this.#maxSize - sizes[index];
              while (this.#calculatedSize > maxSize) {
                this.#evict(true);
              }
            }
            this.#calculatedSize += sizes[index];
            if (status) {
              status.entrySize = size;
              status.totalCalculatedSize = this.#calculatedSize;
            }
          };
        }
        #removeItemSize = (_i) => {
        };
        #addItemSize = (_i, _s, _st) => {
        };
        #requireSize = (_k, _v, size, sizeCalculation) => {
          if (size || sizeCalculation) {
            throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
          }
          return 0;
        };
        *#indexes({ allowStale = this.allowStale } = {}) {
          if (this.#size) {
            for (let i6 = this.#tail; true; ) {
              if (!this.#isValidIndex(i6)) {
                break;
              }
              if (allowStale || !this.#isStale(i6)) {
                yield i6;
              }
              if (i6 === this.#head) {
                break;
              } else {
                i6 = this.#prev[i6];
              }
            }
          }
        }
        *#rindexes({ allowStale = this.allowStale } = {}) {
          if (this.#size) {
            for (let i6 = this.#head; true; ) {
              if (!this.#isValidIndex(i6)) {
                break;
              }
              if (allowStale || !this.#isStale(i6)) {
                yield i6;
              }
              if (i6 === this.#tail) {
                break;
              } else {
                i6 = this.#next[i6];
              }
            }
          }
        }
        #isValidIndex(index) {
          return index !== void 0 && this.#keyMap.get(this.#keyList[index]) === index;
        }
        /**
         * Return a generator yielding `[key, value]` pairs,
         * in order from most recently used to least recently used.
         */
        *entries() {
          for (const i6 of this.#indexes()) {
            if (this.#valList[i6] !== void 0 && this.#keyList[i6] !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield [this.#keyList[i6], this.#valList[i6]];
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.entries}
         *
         * Return a generator yielding `[key, value]` pairs,
         * in order from least recently used to most recently used.
         */
        *rentries() {
          for (const i6 of this.#rindexes()) {
            if (this.#valList[i6] !== void 0 && this.#keyList[i6] !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield [this.#keyList[i6], this.#valList[i6]];
            }
          }
        }
        /**
         * Return a generator yielding the keys in the cache,
         * in order from most recently used to least recently used.
         */
        *keys() {
          for (const i6 of this.#indexes()) {
            const k2 = this.#keyList[i6];
            if (k2 !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield k2;
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.keys}
         *
         * Return a generator yielding the keys in the cache,
         * in order from least recently used to most recently used.
         */
        *rkeys() {
          for (const i6 of this.#rindexes()) {
            const k2 = this.#keyList[i6];
            if (k2 !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield k2;
            }
          }
        }
        /**
         * Return a generator yielding the values in the cache,
         * in order from most recently used to least recently used.
         */
        *values() {
          for (const i6 of this.#indexes()) {
            const v4 = this.#valList[i6];
            if (v4 !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield this.#valList[i6];
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.values}
         *
         * Return a generator yielding the values in the cache,
         * in order from least recently used to most recently used.
         */
        *rvalues() {
          for (const i6 of this.#rindexes()) {
            const v4 = this.#valList[i6];
            if (v4 !== void 0 && !this.#isBackgroundFetch(this.#valList[i6])) {
              yield this.#valList[i6];
            }
          }
        }
        /**
         * Iterating over the cache itself yields the same results as
         * {@link LRUCache.entries}
         */
        [Symbol.iterator]() {
          return this.entries();
        }
        /**
         * Find a value for which the supplied fn method returns a truthy value,
         * similar to Array.find().  fn is called as fn(value, key, cache).
         */
        find(fn, getOptions = {}) {
          for (const i6 of this.#indexes()) {
            const v4 = this.#valList[i6];
            const value = this.#isBackgroundFetch(v4) ? v4.__staleWhileFetching : v4;
            if (value === void 0)
              continue;
            if (fn(value, this.#keyList[i6], this)) {
              return this.get(this.#keyList[i6], getOptions);
            }
          }
        }
        /**
         * Call the supplied function on each item in the cache, in order from
         * most recently used to least recently used.  fn is called as
         * fn(value, key, cache).  Does not update age or recenty of use.
         * Does not iterate over stale values.
         */
        forEach(fn, thisp = this) {
          for (const i6 of this.#indexes()) {
            const v4 = this.#valList[i6];
            const value = this.#isBackgroundFetch(v4) ? v4.__staleWhileFetching : v4;
            if (value === void 0)
              continue;
            fn.call(thisp, value, this.#keyList[i6], this);
          }
        }
        /**
         * The same as {@link LRUCache.forEach} but items are iterated over in
         * reverse order.  (ie, less recently used items are iterated over first.)
         */
        rforEach(fn, thisp = this) {
          for (const i6 of this.#rindexes()) {
            const v4 = this.#valList[i6];
            const value = this.#isBackgroundFetch(v4) ? v4.__staleWhileFetching : v4;
            if (value === void 0)
              continue;
            fn.call(thisp, value, this.#keyList[i6], this);
          }
        }
        /**
         * Delete any stale entries. Returns true if anything was removed,
         * false otherwise.
         */
        purgeStale() {
          let deleted = false;
          for (const i6 of this.#rindexes({ allowStale: true })) {
            if (this.#isStale(i6)) {
              this.delete(this.#keyList[i6]);
              deleted = true;
            }
          }
          return deleted;
        }
        /**
         * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
         * passed to cache.load()
         */
        dump() {
          const arr = [];
          for (const i6 of this.#indexes({ allowStale: true })) {
            const key = this.#keyList[i6];
            const v4 = this.#valList[i6];
            const value = this.#isBackgroundFetch(v4) ? v4.__staleWhileFetching : v4;
            if (value === void 0 || key === void 0)
              continue;
            const entry = { value };
            if (this.#ttls && this.#starts) {
              entry.ttl = this.#ttls[i6];
              const age = perf.now() - this.#starts[i6];
              entry.start = Math.floor(Date.now() - age);
            }
            if (this.#sizes) {
              entry.size = this.#sizes[i6];
            }
            arr.unshift([key, entry]);
          }
          return arr;
        }
        /**
         * Reset the cache and load in the items in entries in the order listed.
         * Note that the shape of the resulting cache may be different if the
         * same options are not used in both caches.
         */
        load(arr) {
          this.clear();
          for (const [key, entry] of arr) {
            if (entry.start) {
              const age = Date.now() - entry.start;
              entry.start = perf.now() - age;
            }
            this.set(key, entry.value, entry);
          }
        }
        /**
         * Add a value to the cache.
         *
         * Note: if `undefined` is specified as a value, this is an alias for
         * {@link LRUCache#delete}
         */
        set(k2, v4, setOptions = {}) {
          if (v4 === void 0) {
            this.delete(k2);
            return this;
          }
          const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
          let { noUpdateTTL = this.noUpdateTTL } = setOptions;
          const size = this.#requireSize(k2, v4, setOptions.size || 0, sizeCalculation);
          if (this.maxEntrySize && size > this.maxEntrySize) {
            if (status) {
              status.set = "miss";
              status.maxEntrySizeExceeded = true;
            }
            this.delete(k2);
            return this;
          }
          let index = this.#size === 0 ? void 0 : this.#keyMap.get(k2);
          if (index === void 0) {
            index = this.#size === 0 ? this.#tail : this.#free.length !== 0 ? this.#free.pop() : this.#size === this.#max ? this.#evict(false) : this.#size;
            this.#keyList[index] = k2;
            this.#valList[index] = v4;
            this.#keyMap.set(k2, index);
            this.#next[this.#tail] = index;
            this.#prev[index] = this.#tail;
            this.#tail = index;
            this.#size++;
            this.#addItemSize(index, size, status);
            if (status)
              status.set = "add";
            noUpdateTTL = false;
          } else {
            this.#moveToTail(index);
            const oldVal = this.#valList[index];
            if (v4 !== oldVal) {
              if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
                oldVal.__abortController.abort(new Error("replaced"));
                const { __staleWhileFetching: s5 } = oldVal;
                if (s5 !== void 0 && !noDisposeOnSet) {
                  if (this.#hasDispose) {
                    this.#dispose?.(s5, k2, "set");
                  }
                  if (this.#hasDisposeAfter) {
                    this.#disposed?.push([s5, k2, "set"]);
                  }
                }
              } else if (!noDisposeOnSet) {
                if (this.#hasDispose) {
                  this.#dispose?.(oldVal, k2, "set");
                }
                if (this.#hasDisposeAfter) {
                  this.#disposed?.push([oldVal, k2, "set"]);
                }
              }
              this.#removeItemSize(index);
              this.#addItemSize(index, size, status);
              this.#valList[index] = v4;
              if (status) {
                status.set = "replace";
                const oldValue = oldVal && this.#isBackgroundFetch(oldVal) ? oldVal.__staleWhileFetching : oldVal;
                if (oldValue !== void 0)
                  status.oldValue = oldValue;
              }
            } else if (status) {
              status.set = "update";
            }
          }
          if (ttl !== 0 && !this.#ttls) {
            this.#initializeTTLTracking();
          }
          if (this.#ttls) {
            if (!noUpdateTTL) {
              this.#setItemTTL(index, ttl, start);
            }
            if (status)
              this.#statusTTL(status, index);
          }
          if (!noDisposeOnSet && this.#hasDisposeAfter && this.#disposed) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
          return this;
        }
        /**
         * Evict the least recently used item, returning its value or
         * `undefined` if cache is empty.
         */
        pop() {
          try {
            while (this.#size) {
              const val = this.#valList[this.#head];
              this.#evict(true);
              if (this.#isBackgroundFetch(val)) {
                if (val.__staleWhileFetching) {
                  return val.__staleWhileFetching;
                }
              } else if (val !== void 0) {
                return val;
              }
            }
          } finally {
            if (this.#hasDisposeAfter && this.#disposed) {
              const dt = this.#disposed;
              let task;
              while (task = dt?.shift()) {
                this.#disposeAfter?.(...task);
              }
            }
          }
        }
        #evict(free) {
          const head = this.#head;
          const k2 = this.#keyList[head];
          const v4 = this.#valList[head];
          if (this.#hasFetchMethod && this.#isBackgroundFetch(v4)) {
            v4.__abortController.abort(new Error("evicted"));
          } else if (this.#hasDispose || this.#hasDisposeAfter) {
            if (this.#hasDispose) {
              this.#dispose?.(v4, k2, "evict");
            }
            if (this.#hasDisposeAfter) {
              this.#disposed?.push([v4, k2, "evict"]);
            }
          }
          this.#removeItemSize(head);
          if (free) {
            this.#keyList[head] = void 0;
            this.#valList[head] = void 0;
            this.#free.push(head);
          }
          if (this.#size === 1) {
            this.#head = this.#tail = 0;
            this.#free.length = 0;
          } else {
            this.#head = this.#next[head];
          }
          this.#keyMap.delete(k2);
          this.#size--;
          return head;
        }
        /**
         * Check if a key is in the cache, without updating the recency of use.
         * Will return false if the item is stale, even though it is technically
         * in the cache.
         *
         * Will not update item age unless
         * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
         */
        has(k2, hasOptions = {}) {
          const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
          const index = this.#keyMap.get(k2);
          if (index !== void 0) {
            const v4 = this.#valList[index];
            if (this.#isBackgroundFetch(v4) && v4.__staleWhileFetching === void 0) {
              return false;
            }
            if (!this.#isStale(index)) {
              if (updateAgeOnHas) {
                this.#updateItemAge(index);
              }
              if (status) {
                status.has = "hit";
                this.#statusTTL(status, index);
              }
              return true;
            } else if (status) {
              status.has = "stale";
              this.#statusTTL(status, index);
            }
          } else if (status) {
            status.has = "miss";
          }
          return false;
        }
        /**
         * Like {@link LRUCache#get} but doesn't update recency or delete stale
         * items.
         *
         * Returns `undefined` if the item is stale, unless
         * {@link LRUCache.OptionsBase.allowStale} is set.
         */
        peek(k2, peekOptions = {}) {
          const { allowStale = this.allowStale } = peekOptions;
          const index = this.#keyMap.get(k2);
          if (index !== void 0 && (allowStale || !this.#isStale(index))) {
            const v4 = this.#valList[index];
            return this.#isBackgroundFetch(v4) ? v4.__staleWhileFetching : v4;
          }
        }
        #backgroundFetch(k2, index, options, context) {
          const v4 = index === void 0 ? void 0 : this.#valList[index];
          if (this.#isBackgroundFetch(v4)) {
            return v4;
          }
          const ac = new AC();
          const { signal } = options;
          signal?.addEventListener("abort", () => ac.abort(signal.reason), {
            signal: ac.signal
          });
          const fetchOpts = {
            signal: ac.signal,
            options,
            context
          };
          const cb = (v5, updateCache = false) => {
            const { aborted } = ac.signal;
            const ignoreAbort = options.ignoreFetchAbort && v5 !== void 0;
            if (options.status) {
              if (aborted && !updateCache) {
                options.status.fetchAborted = true;
                options.status.fetchError = ac.signal.reason;
                if (ignoreAbort)
                  options.status.fetchAbortIgnored = true;
              } else {
                options.status.fetchResolved = true;
              }
            }
            if (aborted && !ignoreAbort && !updateCache) {
              return fetchFail(ac.signal.reason);
            }
            const bf2 = p6;
            if (this.#valList[index] === p6) {
              if (v5 === void 0) {
                if (bf2.__staleWhileFetching) {
                  this.#valList[index] = bf2.__staleWhileFetching;
                } else {
                  this.delete(k2);
                }
              } else {
                if (options.status)
                  options.status.fetchUpdated = true;
                this.set(k2, v5, fetchOpts.options);
              }
            }
            return v5;
          };
          const eb = (er) => {
            if (options.status) {
              options.status.fetchRejected = true;
              options.status.fetchError = er;
            }
            return fetchFail(er);
          };
          const fetchFail = (er) => {
            const { aborted } = ac.signal;
            const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
            const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
            const noDelete = allowStale || options.noDeleteOnFetchRejection;
            const bf2 = p6;
            if (this.#valList[index] === p6) {
              const del = !noDelete || bf2.__staleWhileFetching === void 0;
              if (del) {
                this.delete(k2);
              } else if (!allowStaleAborted) {
                this.#valList[index] = bf2.__staleWhileFetching;
              }
            }
            if (allowStale) {
              if (options.status && bf2.__staleWhileFetching !== void 0) {
                options.status.returnedStale = true;
              }
              return bf2.__staleWhileFetching;
            } else if (bf2.__returned === bf2) {
              throw er;
            }
          };
          const pcall = (res, rej) => {
            const fmp = this.#fetchMethod?.(k2, v4, fetchOpts);
            if (fmp && fmp instanceof Promise) {
              fmp.then((v5) => res(v5 === void 0 ? void 0 : v5), rej);
            }
            ac.signal.addEventListener("abort", () => {
              if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
                res(void 0);
                if (options.allowStaleOnFetchAbort) {
                  res = (v5) => cb(v5, true);
                }
              }
            });
          };
          if (options.status)
            options.status.fetchDispatched = true;
          const p6 = new Promise(pcall).then(cb, eb);
          const bf = Object.assign(p6, {
            __abortController: ac,
            __staleWhileFetching: v4,
            __returned: void 0
          });
          if (index === void 0) {
            this.set(k2, bf, { ...fetchOpts.options, status: void 0 });
            index = this.#keyMap.get(k2);
          } else {
            this.#valList[index] = bf;
          }
          return bf;
        }
        #isBackgroundFetch(p6) {
          if (!this.#hasFetchMethod)
            return false;
          const b3 = p6;
          return !!b3 && b3 instanceof Promise && b3.hasOwnProperty("__staleWhileFetching") && b3.__abortController instanceof AC;
        }
        async fetch(k2, fetchOptions = {}) {
          const {
            // get options
            allowStale = this.allowStale,
            updateAgeOnGet = this.updateAgeOnGet,
            noDeleteOnStaleGet = this.noDeleteOnStaleGet,
            // set options
            ttl = this.ttl,
            noDisposeOnSet = this.noDisposeOnSet,
            size = 0,
            sizeCalculation = this.sizeCalculation,
            noUpdateTTL = this.noUpdateTTL,
            // fetch exclusive options
            noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
            allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
            ignoreFetchAbort = this.ignoreFetchAbort,
            allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
            context,
            forceRefresh = false,
            status,
            signal
          } = fetchOptions;
          if (!this.#hasFetchMethod) {
            if (status)
              status.fetch = "get";
            return this.get(k2, {
              allowStale,
              updateAgeOnGet,
              noDeleteOnStaleGet,
              status
            });
          }
          const options = {
            allowStale,
            updateAgeOnGet,
            noDeleteOnStaleGet,
            ttl,
            noDisposeOnSet,
            size,
            sizeCalculation,
            noUpdateTTL,
            noDeleteOnFetchRejection,
            allowStaleOnFetchRejection,
            allowStaleOnFetchAbort,
            ignoreFetchAbort,
            status,
            signal
          };
          let index = this.#keyMap.get(k2);
          if (index === void 0) {
            if (status)
              status.fetch = "miss";
            const p6 = this.#backgroundFetch(k2, index, options, context);
            return p6.__returned = p6;
          } else {
            const v4 = this.#valList[index];
            if (this.#isBackgroundFetch(v4)) {
              const stale = allowStale && v4.__staleWhileFetching !== void 0;
              if (status) {
                status.fetch = "inflight";
                if (stale)
                  status.returnedStale = true;
              }
              return stale ? v4.__staleWhileFetching : v4.__returned = v4;
            }
            const isStale = this.#isStale(index);
            if (!forceRefresh && !isStale) {
              if (status)
                status.fetch = "hit";
              this.#moveToTail(index);
              if (updateAgeOnGet) {
                this.#updateItemAge(index);
              }
              if (status)
                this.#statusTTL(status, index);
              return v4;
            }
            const p6 = this.#backgroundFetch(k2, index, options, context);
            const hasStale = p6.__staleWhileFetching !== void 0;
            const staleVal = hasStale && allowStale;
            if (status) {
              status.fetch = isStale ? "stale" : "refresh";
              if (staleVal && isStale)
                status.returnedStale = true;
            }
            return staleVal ? p6.__staleWhileFetching : p6.__returned = p6;
          }
        }
        /**
         * Return a value from the cache. Will update the recency of the cache
         * entry found.
         *
         * If the key is not found, get() will return `undefined`.
         */
        get(k2, getOptions = {}) {
          const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
          const index = this.#keyMap.get(k2);
          if (index !== void 0) {
            const value = this.#valList[index];
            const fetching = this.#isBackgroundFetch(value);
            if (status)
              this.#statusTTL(status, index);
            if (this.#isStale(index)) {
              if (status)
                status.get = "stale";
              if (!fetching) {
                if (!noDeleteOnStaleGet) {
                  this.delete(k2);
                }
                if (status && allowStale)
                  status.returnedStale = true;
                return allowStale ? value : void 0;
              } else {
                if (status && allowStale && value.__staleWhileFetching !== void 0) {
                  status.returnedStale = true;
                }
                return allowStale ? value.__staleWhileFetching : void 0;
              }
            } else {
              if (status)
                status.get = "hit";
              if (fetching) {
                return value.__staleWhileFetching;
              }
              this.#moveToTail(index);
              if (updateAgeOnGet) {
                this.#updateItemAge(index);
              }
              return value;
            }
          } else if (status) {
            status.get = "miss";
          }
        }
        #connect(p6, n7) {
          this.#prev[n7] = p6;
          this.#next[p6] = n7;
        }
        #moveToTail(index) {
          if (index !== this.#tail) {
            if (index === this.#head) {
              this.#head = this.#next[index];
            } else {
              this.#connect(this.#prev[index], this.#next[index]);
            }
            this.#connect(this.#tail, index);
            this.#tail = index;
          }
        }
        /**
         * Deletes a key out of the cache.
         * Returns true if the key was deleted, false otherwise.
         */
        delete(k2) {
          let deleted = false;
          if (this.#size !== 0) {
            const index = this.#keyMap.get(k2);
            if (index !== void 0) {
              deleted = true;
              if (this.#size === 1) {
                this.clear();
              } else {
                this.#removeItemSize(index);
                const v4 = this.#valList[index];
                if (this.#isBackgroundFetch(v4)) {
                  v4.__abortController.abort(new Error("deleted"));
                } else if (this.#hasDispose || this.#hasDisposeAfter) {
                  if (this.#hasDispose) {
                    this.#dispose?.(v4, k2, "delete");
                  }
                  if (this.#hasDisposeAfter) {
                    this.#disposed?.push([v4, k2, "delete"]);
                  }
                }
                this.#keyMap.delete(k2);
                this.#keyList[index] = void 0;
                this.#valList[index] = void 0;
                if (index === this.#tail) {
                  this.#tail = this.#prev[index];
                } else if (index === this.#head) {
                  this.#head = this.#next[index];
                } else {
                  this.#next[this.#prev[index]] = this.#next[index];
                  this.#prev[this.#next[index]] = this.#prev[index];
                }
                this.#size--;
                this.#free.push(index);
              }
            }
          }
          if (this.#hasDisposeAfter && this.#disposed?.length) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
          return deleted;
        }
        /**
         * Clear the cache entirely, throwing away all values.
         */
        clear() {
          for (const index of this.#rindexes({ allowStale: true })) {
            const v4 = this.#valList[index];
            if (this.#isBackgroundFetch(v4)) {
              v4.__abortController.abort(new Error("deleted"));
            } else {
              const k2 = this.#keyList[index];
              if (this.#hasDispose) {
                this.#dispose?.(v4, k2, "delete");
              }
              if (this.#hasDisposeAfter) {
                this.#disposed?.push([v4, k2, "delete"]);
              }
            }
          }
          this.#keyMap.clear();
          this.#valList.fill(void 0);
          this.#keyList.fill(void 0);
          if (this.#ttls && this.#starts) {
            this.#ttls.fill(0);
            this.#starts.fill(0);
          }
          if (this.#sizes) {
            this.#sizes.fill(0);
          }
          this.#head = 0;
          this.#tail = 0;
          this.#free.length = 0;
          this.#calculatedSize = 0;
          this.#size = 0;
          if (this.#hasDisposeAfter && this.#disposed) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
        }
      };
      exports5.LRUCache = LRUCache;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/ContainerBase/index.js
  var require_ContainerBase = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/ContainerBase/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.ContainerIterator = exports5.Container = exports5.Base = void 0;
      var ContainerIterator = class {
        constructor(t6 = 0) {
          this.iteratorType = t6;
        }
        equals(t6) {
          return this.o === t6.o;
        }
      };
      exports5.ContainerIterator = ContainerIterator;
      var Base = class {
        constructor() {
          this.i = 0;
        }
        get length() {
          return this.i;
        }
        size() {
          return this.i;
        }
        empty() {
          return this.i === 0;
        }
      };
      exports5.Base = Base;
      var Container = class extends Base {
      };
      exports5.Container = Container;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/OtherContainer/Stack.js
  var require_Stack = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/OtherContainer/Stack.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _ContainerBase = require_ContainerBase();
      var Stack = class extends _ContainerBase.Base {
        constructor(t6 = []) {
          super();
          this.S = [];
          const s5 = this;
          t6.forEach(function(t7) {
            s5.push(t7);
          });
        }
        clear() {
          this.i = 0;
          this.S = [];
        }
        push(t6) {
          this.S.push(t6);
          this.i += 1;
          return this.i;
        }
        pop() {
          if (this.i === 0)
            return;
          this.i -= 1;
          return this.S.pop();
        }
        top() {
          return this.S[this.i - 1];
        }
      };
      var _default = Stack;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/OtherContainer/Queue.js
  var require_Queue = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/OtherContainer/Queue.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _ContainerBase = require_ContainerBase();
      var Queue = class extends _ContainerBase.Base {
        constructor(t6 = []) {
          super();
          this.j = 0;
          this.q = [];
          const s5 = this;
          t6.forEach(function(t7) {
            s5.push(t7);
          });
        }
        clear() {
          this.q = [];
          this.i = this.j = 0;
        }
        push(t6) {
          const s5 = this.q.length;
          if (this.j / s5 > 0.5 && this.j + this.i >= s5 && s5 > 4096) {
            const s6 = this.i;
            for (let t7 = 0; t7 < s6; ++t7) {
              this.q[t7] = this.q[this.j + t7];
            }
            this.j = 0;
            this.q[this.i] = t6;
          } else
            this.q[this.j + this.i] = t6;
          return ++this.i;
        }
        pop() {
          if (this.i === 0)
            return;
          const t6 = this.q[this.j++];
          this.i -= 1;
          return t6;
        }
        front() {
          if (this.i === 0)
            return;
          return this.q[this.j];
        }
      };
      var _default = Queue;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/OtherContainer/PriorityQueue.js
  var require_PriorityQueue = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/OtherContainer/PriorityQueue.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _ContainerBase = require_ContainerBase();
      var PriorityQueue = class extends _ContainerBase.Base {
        constructor(t6 = [], s5 = function(t7, s6) {
          if (t7 > s6)
            return -1;
          if (t7 < s6)
            return 1;
          return 0;
        }, i6 = true) {
          super();
          this.v = s5;
          if (Array.isArray(t6)) {
            this.C = i6 ? [...t6] : t6;
          } else {
            this.C = [];
            const s6 = this;
            t6.forEach(function(t7) {
              s6.C.push(t7);
            });
          }
          this.i = this.C.length;
          const e7 = this.i >> 1;
          for (let t7 = this.i - 1 >> 1; t7 >= 0; --t7) {
            this.k(t7, e7);
          }
        }
        m(t6) {
          const s5 = this.C[t6];
          while (t6 > 0) {
            const i6 = t6 - 1 >> 1;
            const e7 = this.C[i6];
            if (this.v(e7, s5) <= 0)
              break;
            this.C[t6] = e7;
            t6 = i6;
          }
          this.C[t6] = s5;
        }
        k(t6, s5) {
          const i6 = this.C[t6];
          while (t6 < s5) {
            let s6 = t6 << 1 | 1;
            const e7 = s6 + 1;
            let h6 = this.C[s6];
            if (e7 < this.i && this.v(h6, this.C[e7]) > 0) {
              s6 = e7;
              h6 = this.C[e7];
            }
            if (this.v(h6, i6) >= 0)
              break;
            this.C[t6] = h6;
            t6 = s6;
          }
          this.C[t6] = i6;
        }
        clear() {
          this.i = 0;
          this.C.length = 0;
        }
        push(t6) {
          this.C.push(t6);
          this.m(this.i);
          this.i += 1;
        }
        pop() {
          if (this.i === 0)
            return;
          const t6 = this.C[0];
          const s5 = this.C.pop();
          this.i -= 1;
          if (this.i) {
            this.C[0] = s5;
            this.k(0, this.i >> 1);
          }
          return t6;
        }
        top() {
          return this.C[0];
        }
        find(t6) {
          return this.C.indexOf(t6) >= 0;
        }
        remove(t6) {
          const s5 = this.C.indexOf(t6);
          if (s5 < 0)
            return false;
          if (s5 === 0) {
            this.pop();
          } else if (s5 === this.i - 1) {
            this.C.pop();
            this.i -= 1;
          } else {
            this.C.splice(s5, 1, this.C.pop());
            this.i -= 1;
            this.m(s5);
            this.k(s5, this.i >> 1);
          }
          return true;
        }
        updateItem(t6) {
          const s5 = this.C.indexOf(t6);
          if (s5 < 0)
            return false;
          this.m(s5);
          this.k(s5, this.i >> 1);
          return true;
        }
        toArray() {
          return [...this.C];
        }
      };
      var _default = PriorityQueue;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Base/index.js
  var require_Base = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Base/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _ContainerBase = require_ContainerBase();
      var SequentialContainer = class extends _ContainerBase.Container {
      };
      var _default = SequentialContainer;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/utils/throwError.js
  var require_throwError = __commonJS({
    "node_modules/js-sdsl/dist/cjs/utils/throwError.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.throwIteratorAccessError = throwIteratorAccessError;
      function throwIteratorAccessError() {
        throw new RangeError("Iterator access denied!");
      }
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Base/RandomIterator.js
  var require_RandomIterator = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Base/RandomIterator.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.RandomIterator = void 0;
      var _ContainerBase = require_ContainerBase();
      var _throwError = require_throwError();
      var RandomIterator = class extends _ContainerBase.ContainerIterator {
        constructor(t6, r7) {
          super(r7);
          this.o = t6;
          if (this.iteratorType === 0) {
            this.pre = function() {
              if (this.o === 0) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o -= 1;
              return this;
            };
            this.next = function() {
              if (this.o === this.container.size()) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o += 1;
              return this;
            };
          } else {
            this.pre = function() {
              if (this.o === this.container.size() - 1) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o += 1;
              return this;
            };
            this.next = function() {
              if (this.o === -1) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o -= 1;
              return this;
            };
          }
        }
        get pointer() {
          return this.container.getElementByPos(this.o);
        }
        set pointer(t6) {
          this.container.setElementByPos(this.o, t6);
        }
      };
      exports5.RandomIterator = RandomIterator;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Vector.js
  var require_Vector = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Vector.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = _interopRequireDefault(require_Base());
      var _RandomIterator = require_RandomIterator();
      function _interopRequireDefault(t6) {
        return t6 && t6.t ? t6 : {
          default: t6
        };
      }
      var VectorIterator = class _VectorIterator extends _RandomIterator.RandomIterator {
        constructor(t6, r7, e7) {
          super(t6, e7);
          this.container = r7;
        }
        copy() {
          return new _VectorIterator(this.o, this.container, this.iteratorType);
        }
      };
      var Vector = class extends _Base.default {
        constructor(t6 = [], r7 = true) {
          super();
          if (Array.isArray(t6)) {
            this.J = r7 ? [...t6] : t6;
            this.i = t6.length;
          } else {
            this.J = [];
            const r8 = this;
            t6.forEach(function(t7) {
              r8.pushBack(t7);
            });
          }
        }
        clear() {
          this.i = 0;
          this.J.length = 0;
        }
        begin() {
          return new VectorIterator(0, this);
        }
        end() {
          return new VectorIterator(this.i, this);
        }
        rBegin() {
          return new VectorIterator(this.i - 1, this, 1);
        }
        rEnd() {
          return new VectorIterator(-1, this, 1);
        }
        front() {
          return this.J[0];
        }
        back() {
          return this.J[this.i - 1];
        }
        getElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          return this.J[t6];
        }
        eraseElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          this.J.splice(t6, 1);
          this.i -= 1;
          return this.i;
        }
        eraseElementByValue(t6) {
          let r7 = 0;
          for (let e7 = 0; e7 < this.i; ++e7) {
            if (this.J[e7] !== t6) {
              this.J[r7++] = this.J[e7];
            }
          }
          this.i = this.J.length = r7;
          return this.i;
        }
        eraseElementByIterator(t6) {
          const r7 = t6.o;
          t6 = t6.next();
          this.eraseElementByPos(r7);
          return t6;
        }
        pushBack(t6) {
          this.J.push(t6);
          this.i += 1;
          return this.i;
        }
        popBack() {
          if (this.i === 0)
            return;
          this.i -= 1;
          return this.J.pop();
        }
        setElementByPos(t6, r7) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          this.J[t6] = r7;
        }
        insert(t6, r7, e7 = 1) {
          if (t6 < 0 || t6 > this.i) {
            throw new RangeError();
          }
          this.J.splice(t6, 0, ...new Array(e7).fill(r7));
          this.i += e7;
          return this.i;
        }
        find(t6) {
          for (let r7 = 0; r7 < this.i; ++r7) {
            if (this.J[r7] === t6) {
              return new VectorIterator(r7, this);
            }
          }
          return this.end();
        }
        reverse() {
          this.J.reverse();
        }
        unique() {
          let t6 = 1;
          for (let r7 = 1; r7 < this.i; ++r7) {
            if (this.J[r7] !== this.J[r7 - 1]) {
              this.J[t6++] = this.J[r7];
            }
          }
          this.i = this.J.length = t6;
          return this.i;
        }
        sort(t6) {
          this.J.sort(t6);
        }
        forEach(t6) {
          for (let r7 = 0; r7 < this.i; ++r7) {
            t6(this.J[r7], r7, this);
          }
        }
        [Symbol.iterator]() {
          return function* () {
            yield* this.J;
          }.bind(this)();
        }
      };
      var _default = Vector;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/SequentialContainer/LinkList.js
  var require_LinkList = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/SequentialContainer/LinkList.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = _interopRequireDefault(require_Base());
      var _ContainerBase = require_ContainerBase();
      var _throwError = require_throwError();
      function _interopRequireDefault(t6) {
        return t6 && t6.t ? t6 : {
          default: t6
        };
      }
      var LinkListIterator = class _LinkListIterator extends _ContainerBase.ContainerIterator {
        constructor(t6, i6, s5, r7) {
          super(r7);
          this.o = t6;
          this.h = i6;
          this.container = s5;
          if (this.iteratorType === 0) {
            this.pre = function() {
              if (this.o.L === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L;
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B;
              return this;
            };
          } else {
            this.pre = function() {
              if (this.o.B === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B;
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L;
              return this;
            };
          }
        }
        get pointer() {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          return this.o.l;
        }
        set pointer(t6) {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          this.o.l = t6;
        }
        copy() {
          return new _LinkListIterator(this.o, this.h, this.container, this.iteratorType);
        }
      };
      var LinkList = class extends _Base.default {
        constructor(t6 = []) {
          super();
          this.h = {};
          this.p = this._ = this.h.L = this.h.B = this.h;
          const i6 = this;
          t6.forEach(function(t7) {
            i6.pushBack(t7);
          });
        }
        V(t6) {
          const { L: i6, B: s5 } = t6;
          i6.B = s5;
          s5.L = i6;
          if (t6 === this.p) {
            this.p = s5;
          }
          if (t6 === this._) {
            this._ = i6;
          }
          this.i -= 1;
        }
        G(t6, i6) {
          const s5 = i6.B;
          const r7 = {
            l: t6,
            L: i6,
            B: s5
          };
          i6.B = r7;
          s5.L = r7;
          if (i6 === this.h) {
            this.p = r7;
          }
          if (s5 === this.h) {
            this._ = r7;
          }
          this.i += 1;
        }
        clear() {
          this.i = 0;
          this.p = this._ = this.h.L = this.h.B = this.h;
        }
        begin() {
          return new LinkListIterator(this.p, this.h, this);
        }
        end() {
          return new LinkListIterator(this.h, this.h, this);
        }
        rBegin() {
          return new LinkListIterator(this._, this.h, this, 1);
        }
        rEnd() {
          return new LinkListIterator(this.h, this.h, this, 1);
        }
        front() {
          return this.p.l;
        }
        back() {
          return this._.l;
        }
        getElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let i6 = this.p;
          while (t6--) {
            i6 = i6.B;
          }
          return i6.l;
        }
        eraseElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let i6 = this.p;
          while (t6--) {
            i6 = i6.B;
          }
          this.V(i6);
          return this.i;
        }
        eraseElementByValue(t6) {
          let i6 = this.p;
          while (i6 !== this.h) {
            if (i6.l === t6) {
              this.V(i6);
            }
            i6 = i6.B;
          }
          return this.i;
        }
        eraseElementByIterator(t6) {
          const i6 = t6.o;
          if (i6 === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          t6 = t6.next();
          this.V(i6);
          return t6;
        }
        pushBack(t6) {
          this.G(t6, this._);
          return this.i;
        }
        popBack() {
          if (this.i === 0)
            return;
          const t6 = this._.l;
          this.V(this._);
          return t6;
        }
        pushFront(t6) {
          this.G(t6, this.h);
          return this.i;
        }
        popFront() {
          if (this.i === 0)
            return;
          const t6 = this.p.l;
          this.V(this.p);
          return t6;
        }
        setElementByPos(t6, i6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let s5 = this.p;
          while (t6--) {
            s5 = s5.B;
          }
          s5.l = i6;
        }
        insert(t6, i6, s5 = 1) {
          if (t6 < 0 || t6 > this.i) {
            throw new RangeError();
          }
          if (s5 <= 0)
            return this.i;
          if (t6 === 0) {
            while (s5--)
              this.pushFront(i6);
          } else if (t6 === this.i) {
            while (s5--)
              this.pushBack(i6);
          } else {
            let r7 = this.p;
            for (let i7 = 1; i7 < t6; ++i7) {
              r7 = r7.B;
            }
            const e7 = r7.B;
            this.i += s5;
            while (s5--) {
              r7.B = {
                l: i6,
                L: r7
              };
              r7.B.L = r7;
              r7 = r7.B;
            }
            r7.B = e7;
            e7.L = r7;
          }
          return this.i;
        }
        find(t6) {
          let i6 = this.p;
          while (i6 !== this.h) {
            if (i6.l === t6) {
              return new LinkListIterator(i6, this.h, this);
            }
            i6 = i6.B;
          }
          return this.end();
        }
        reverse() {
          if (this.i <= 1)
            return;
          let t6 = this.p;
          let i6 = this._;
          let s5 = 0;
          while (s5 << 1 < this.i) {
            const r7 = t6.l;
            t6.l = i6.l;
            i6.l = r7;
            t6 = t6.B;
            i6 = i6.L;
            s5 += 1;
          }
        }
        unique() {
          if (this.i <= 1) {
            return this.i;
          }
          let t6 = this.p;
          while (t6 !== this.h) {
            let i6 = t6;
            while (i6.B !== this.h && i6.l === i6.B.l) {
              i6 = i6.B;
              this.i -= 1;
            }
            t6.B = i6.B;
            t6.B.L = t6;
            t6 = t6.B;
          }
          return this.i;
        }
        sort(t6) {
          if (this.i <= 1)
            return;
          const i6 = [];
          this.forEach(function(t7) {
            i6.push(t7);
          });
          i6.sort(t6);
          let s5 = this.p;
          i6.forEach(function(t7) {
            s5.l = t7;
            s5 = s5.B;
          });
        }
        merge(t6) {
          const i6 = this;
          if (this.i === 0) {
            t6.forEach(function(t7) {
              i6.pushBack(t7);
            });
          } else {
            let s5 = this.p;
            t6.forEach(function(t7) {
              while (s5 !== i6.h && s5.l <= t7) {
                s5 = s5.B;
              }
              i6.G(t7, s5.L);
            });
          }
          return this.i;
        }
        forEach(t6) {
          let i6 = this.p;
          let s5 = 0;
          while (i6 !== this.h) {
            t6(i6.l, s5++, this);
            i6 = i6.B;
          }
        }
        [Symbol.iterator]() {
          return function* () {
            if (this.i === 0)
              return;
            let t6 = this.p;
            while (t6 !== this.h) {
              yield t6.l;
              t6 = t6.B;
            }
          }.bind(this)();
        }
      };
      var _default = LinkList;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Deque.js
  var require_Deque = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/SequentialContainer/Deque.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = _interopRequireDefault(require_Base());
      var _RandomIterator = require_RandomIterator();
      function _interopRequireDefault(t6) {
        return t6 && t6.t ? t6 : {
          default: t6
        };
      }
      var DequeIterator = class _DequeIterator extends _RandomIterator.RandomIterator {
        constructor(t6, i6, s5) {
          super(t6, s5);
          this.container = i6;
        }
        copy() {
          return new _DequeIterator(this.o, this.container, this.iteratorType);
        }
      };
      var Deque = class extends _Base.default {
        constructor(t6 = [], i6 = 1 << 12) {
          super();
          this.j = 0;
          this.D = 0;
          this.R = 0;
          this.N = 0;
          this.P = 0;
          this.A = [];
          const s5 = (() => {
            if (typeof t6.length === "number")
              return t6.length;
            if (typeof t6.size === "number")
              return t6.size;
            if (typeof t6.size === "function")
              return t6.size();
            throw new TypeError("Cannot get the length or size of the container");
          })();
          this.F = i6;
          this.P = Math.max(Math.ceil(s5 / this.F), 1);
          for (let t7 = 0; t7 < this.P; ++t7) {
            this.A.push(new Array(this.F));
          }
          const h6 = Math.ceil(s5 / this.F);
          this.j = this.R = (this.P >> 1) - (h6 >> 1);
          this.D = this.N = this.F - s5 % this.F >> 1;
          const e7 = this;
          t6.forEach(function(t7) {
            e7.pushBack(t7);
          });
        }
        T() {
          const t6 = [];
          const i6 = Math.max(this.P >> 1, 1);
          for (let s5 = 0; s5 < i6; ++s5) {
            t6[s5] = new Array(this.F);
          }
          for (let i7 = this.j; i7 < this.P; ++i7) {
            t6[t6.length] = this.A[i7];
          }
          for (let i7 = 0; i7 < this.R; ++i7) {
            t6[t6.length] = this.A[i7];
          }
          t6[t6.length] = [...this.A[this.R]];
          this.j = i6;
          this.R = t6.length - 1;
          for (let s5 = 0; s5 < i6; ++s5) {
            t6[t6.length] = new Array(this.F);
          }
          this.A = t6;
          this.P = t6.length;
        }
        O(t6) {
          const i6 = this.D + t6 + 1;
          const s5 = i6 % this.F;
          let h6 = s5 - 1;
          let e7 = this.j + (i6 - s5) / this.F;
          if (s5 === 0)
            e7 -= 1;
          e7 %= this.P;
          if (h6 < 0)
            h6 += this.F;
          return {
            curNodeBucketIndex: e7,
            curNodePointerIndex: h6
          };
        }
        clear() {
          this.A = [new Array(this.F)];
          this.P = 1;
          this.j = this.R = this.i = 0;
          this.D = this.N = this.F >> 1;
        }
        begin() {
          return new DequeIterator(0, this);
        }
        end() {
          return new DequeIterator(this.i, this);
        }
        rBegin() {
          return new DequeIterator(this.i - 1, this, 1);
        }
        rEnd() {
          return new DequeIterator(-1, this, 1);
        }
        front() {
          if (this.i === 0)
            return;
          return this.A[this.j][this.D];
        }
        back() {
          if (this.i === 0)
            return;
          return this.A[this.R][this.N];
        }
        pushBack(t6) {
          if (this.i) {
            if (this.N < this.F - 1) {
              this.N += 1;
            } else if (this.R < this.P - 1) {
              this.R += 1;
              this.N = 0;
            } else {
              this.R = 0;
              this.N = 0;
            }
            if (this.R === this.j && this.N === this.D)
              this.T();
          }
          this.i += 1;
          this.A[this.R][this.N] = t6;
          return this.i;
        }
        popBack() {
          if (this.i === 0)
            return;
          const t6 = this.A[this.R][this.N];
          if (this.i !== 1) {
            if (this.N > 0) {
              this.N -= 1;
            } else if (this.R > 0) {
              this.R -= 1;
              this.N = this.F - 1;
            } else {
              this.R = this.P - 1;
              this.N = this.F - 1;
            }
          }
          this.i -= 1;
          return t6;
        }
        pushFront(t6) {
          if (this.i) {
            if (this.D > 0) {
              this.D -= 1;
            } else if (this.j > 0) {
              this.j -= 1;
              this.D = this.F - 1;
            } else {
              this.j = this.P - 1;
              this.D = this.F - 1;
            }
            if (this.j === this.R && this.D === this.N)
              this.T();
          }
          this.i += 1;
          this.A[this.j][this.D] = t6;
          return this.i;
        }
        popFront() {
          if (this.i === 0)
            return;
          const t6 = this.A[this.j][this.D];
          if (this.i !== 1) {
            if (this.D < this.F - 1) {
              this.D += 1;
            } else if (this.j < this.P - 1) {
              this.j += 1;
              this.D = 0;
            } else {
              this.j = 0;
              this.D = 0;
            }
          }
          this.i -= 1;
          return t6;
        }
        getElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          const { curNodeBucketIndex: i6, curNodePointerIndex: s5 } = this.O(t6);
          return this.A[i6][s5];
        }
        setElementByPos(t6, i6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          const { curNodeBucketIndex: s5, curNodePointerIndex: h6 } = this.O(t6);
          this.A[s5][h6] = i6;
        }
        insert(t6, i6, s5 = 1) {
          if (t6 < 0 || t6 > this.i) {
            throw new RangeError();
          }
          if (t6 === 0) {
            while (s5--)
              this.pushFront(i6);
          } else if (t6 === this.i) {
            while (s5--)
              this.pushBack(i6);
          } else {
            const h6 = [];
            for (let i7 = t6; i7 < this.i; ++i7) {
              h6.push(this.getElementByPos(i7));
            }
            this.cut(t6 - 1);
            for (let t7 = 0; t7 < s5; ++t7)
              this.pushBack(i6);
            for (let t7 = 0; t7 < h6.length; ++t7)
              this.pushBack(h6[t7]);
          }
          return this.i;
        }
        cut(t6) {
          if (t6 < 0) {
            this.clear();
            return 0;
          }
          const { curNodeBucketIndex: i6, curNodePointerIndex: s5 } = this.O(t6);
          this.R = i6;
          this.N = s5;
          this.i = t6 + 1;
          return this.i;
        }
        eraseElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          if (t6 === 0)
            this.popFront();
          else if (t6 === this.i - 1)
            this.popBack();
          else {
            const i6 = [];
            for (let s6 = t6 + 1; s6 < this.i; ++s6) {
              i6.push(this.getElementByPos(s6));
            }
            this.cut(t6);
            this.popBack();
            const s5 = this;
            i6.forEach(function(t7) {
              s5.pushBack(t7);
            });
          }
          return this.i;
        }
        eraseElementByValue(t6) {
          if (this.i === 0)
            return 0;
          const i6 = [];
          for (let s6 = 0; s6 < this.i; ++s6) {
            const h6 = this.getElementByPos(s6);
            if (h6 !== t6)
              i6.push(h6);
          }
          const s5 = i6.length;
          for (let t7 = 0; t7 < s5; ++t7)
            this.setElementByPos(t7, i6[t7]);
          return this.cut(s5 - 1);
        }
        eraseElementByIterator(t6) {
          const i6 = t6.o;
          this.eraseElementByPos(i6);
          t6 = t6.next();
          return t6;
        }
        find(t6) {
          for (let i6 = 0; i6 < this.i; ++i6) {
            if (this.getElementByPos(i6) === t6) {
              return new DequeIterator(i6, this);
            }
          }
          return this.end();
        }
        reverse() {
          let t6 = 0;
          let i6 = this.i - 1;
          while (t6 < i6) {
            const s5 = this.getElementByPos(t6);
            this.setElementByPos(t6, this.getElementByPos(i6));
            this.setElementByPos(i6, s5);
            t6 += 1;
            i6 -= 1;
          }
        }
        unique() {
          if (this.i <= 1) {
            return this.i;
          }
          let t6 = 1;
          let i6 = this.getElementByPos(0);
          for (let s5 = 1; s5 < this.i; ++s5) {
            const h6 = this.getElementByPos(s5);
            if (h6 !== i6) {
              i6 = h6;
              this.setElementByPos(t6++, h6);
            }
          }
          while (this.i > t6)
            this.popBack();
          return this.i;
        }
        sort(t6) {
          const i6 = [];
          for (let t7 = 0; t7 < this.i; ++t7) {
            i6.push(this.getElementByPos(t7));
          }
          i6.sort(t6);
          for (let t7 = 0; t7 < this.i; ++t7)
            this.setElementByPos(t7, i6[t7]);
        }
        shrinkToFit() {
          if (this.i === 0)
            return;
          const t6 = [];
          this.forEach(function(i6) {
            t6.push(i6);
          });
          this.P = Math.max(Math.ceil(this.i / this.F), 1);
          this.i = this.j = this.R = this.D = this.N = 0;
          this.A = [];
          for (let t7 = 0; t7 < this.P; ++t7) {
            this.A.push(new Array(this.F));
          }
          for (let i6 = 0; i6 < t6.length; ++i6)
            this.pushBack(t6[i6]);
        }
        forEach(t6) {
          for (let i6 = 0; i6 < this.i; ++i6) {
            t6(this.getElementByPos(i6), i6, this);
          }
        }
        [Symbol.iterator]() {
          return function* () {
            for (let t6 = 0; t6 < this.i; ++t6) {
              yield this.getElementByPos(t6);
            }
          }.bind(this)();
        }
      };
      var _default = Deque;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/TreeNode.js
  var require_TreeNode = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/TreeNode.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.TreeNodeEnableIndex = exports5.TreeNode = void 0;
      var TreeNode = class {
        constructor(e7, t6) {
          this.ee = 1;
          this.u = void 0;
          this.l = void 0;
          this.U = void 0;
          this.W = void 0;
          this.tt = void 0;
          this.u = e7;
          this.l = t6;
        }
        L() {
          let e7 = this;
          if (e7.ee === 1 && e7.tt.tt === e7) {
            e7 = e7.W;
          } else if (e7.U) {
            e7 = e7.U;
            while (e7.W) {
              e7 = e7.W;
            }
          } else {
            let t6 = e7.tt;
            while (t6.U === e7) {
              e7 = t6;
              t6 = e7.tt;
            }
            e7 = t6;
          }
          return e7;
        }
        B() {
          let e7 = this;
          if (e7.W) {
            e7 = e7.W;
            while (e7.U) {
              e7 = e7.U;
            }
            return e7;
          } else {
            let t6 = e7.tt;
            while (t6.W === e7) {
              e7 = t6;
              t6 = e7.tt;
            }
            if (e7.W !== t6) {
              return t6;
            } else
              return e7;
          }
        }
        te() {
          const e7 = this.tt;
          const t6 = this.W;
          const s5 = t6.U;
          if (e7.tt === this)
            e7.tt = t6;
          else if (e7.U === this)
            e7.U = t6;
          else
            e7.W = t6;
          t6.tt = e7;
          t6.U = this;
          this.tt = t6;
          this.W = s5;
          if (s5)
            s5.tt = this;
          return t6;
        }
        se() {
          const e7 = this.tt;
          const t6 = this.U;
          const s5 = t6.W;
          if (e7.tt === this)
            e7.tt = t6;
          else if (e7.U === this)
            e7.U = t6;
          else
            e7.W = t6;
          t6.tt = e7;
          t6.W = this;
          this.tt = t6;
          this.U = s5;
          if (s5)
            s5.tt = this;
          return t6;
        }
      };
      exports5.TreeNode = TreeNode;
      var TreeNodeEnableIndex = class extends TreeNode {
        constructor() {
          super(...arguments);
          this.rt = 1;
        }
        te() {
          const e7 = super.te();
          this.ie();
          e7.ie();
          return e7;
        }
        se() {
          const e7 = super.se();
          this.ie();
          e7.ie();
          return e7;
        }
        ie() {
          this.rt = 1;
          if (this.U) {
            this.rt += this.U.rt;
          }
          if (this.W) {
            this.rt += this.W.rt;
          }
        }
      };
      exports5.TreeNodeEnableIndex = TreeNodeEnableIndex;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/index.js
  var require_Base2 = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _TreeNode = require_TreeNode();
      var _ContainerBase = require_ContainerBase();
      var _throwError = require_throwError();
      var TreeContainer = class extends _ContainerBase.Container {
        constructor(e7 = function(e8, t7) {
          if (e8 < t7)
            return -1;
          if (e8 > t7)
            return 1;
          return 0;
        }, t6 = false) {
          super();
          this.Y = void 0;
          this.v = e7;
          if (t6) {
            this.re = _TreeNode.TreeNodeEnableIndex;
            this.M = function(e8, t7, i6) {
              const s5 = this.ne(e8, t7, i6);
              if (s5) {
                let e9 = s5.tt;
                while (e9 !== this.h) {
                  e9.rt += 1;
                  e9 = e9.tt;
                }
                const t8 = this.he(s5);
                if (t8) {
                  const { parentNode: e10, grandParent: i7, curNode: s6 } = t8;
                  e10.ie();
                  i7.ie();
                  s6.ie();
                }
              }
              return this.i;
            };
            this.V = function(e8) {
              let t7 = this.fe(e8);
              while (t7 !== this.h) {
                t7.rt -= 1;
                t7 = t7.tt;
              }
            };
          } else {
            this.re = _TreeNode.TreeNode;
            this.M = function(e8, t7, i6) {
              const s5 = this.ne(e8, t7, i6);
              if (s5)
                this.he(s5);
              return this.i;
            };
            this.V = this.fe;
          }
          this.h = new this.re();
        }
        X(e7, t6) {
          let i6 = this.h;
          while (e7) {
            const s5 = this.v(e7.u, t6);
            if (s5 < 0) {
              e7 = e7.W;
            } else if (s5 > 0) {
              i6 = e7;
              e7 = e7.U;
            } else
              return e7;
          }
          return i6;
        }
        Z(e7, t6) {
          let i6 = this.h;
          while (e7) {
            const s5 = this.v(e7.u, t6);
            if (s5 <= 0) {
              e7 = e7.W;
            } else {
              i6 = e7;
              e7 = e7.U;
            }
          }
          return i6;
        }
        $(e7, t6) {
          let i6 = this.h;
          while (e7) {
            const s5 = this.v(e7.u, t6);
            if (s5 < 0) {
              i6 = e7;
              e7 = e7.W;
            } else if (s5 > 0) {
              e7 = e7.U;
            } else
              return e7;
          }
          return i6;
        }
        rr(e7, t6) {
          let i6 = this.h;
          while (e7) {
            const s5 = this.v(e7.u, t6);
            if (s5 < 0) {
              i6 = e7;
              e7 = e7.W;
            } else {
              e7 = e7.U;
            }
          }
          return i6;
        }
        ue(e7) {
          while (true) {
            const t6 = e7.tt;
            if (t6 === this.h)
              return;
            if (e7.ee === 1) {
              e7.ee = 0;
              return;
            }
            if (e7 === t6.U) {
              const i6 = t6.W;
              if (i6.ee === 1) {
                i6.ee = 0;
                t6.ee = 1;
                if (t6 === this.Y) {
                  this.Y = t6.te();
                } else
                  t6.te();
              } else {
                if (i6.W && i6.W.ee === 1) {
                  i6.ee = t6.ee;
                  t6.ee = 0;
                  i6.W.ee = 0;
                  if (t6 === this.Y) {
                    this.Y = t6.te();
                  } else
                    t6.te();
                  return;
                } else if (i6.U && i6.U.ee === 1) {
                  i6.ee = 1;
                  i6.U.ee = 0;
                  i6.se();
                } else {
                  i6.ee = 1;
                  e7 = t6;
                }
              }
            } else {
              const i6 = t6.U;
              if (i6.ee === 1) {
                i6.ee = 0;
                t6.ee = 1;
                if (t6 === this.Y) {
                  this.Y = t6.se();
                } else
                  t6.se();
              } else {
                if (i6.U && i6.U.ee === 1) {
                  i6.ee = t6.ee;
                  t6.ee = 0;
                  i6.U.ee = 0;
                  if (t6 === this.Y) {
                    this.Y = t6.se();
                  } else
                    t6.se();
                  return;
                } else if (i6.W && i6.W.ee === 1) {
                  i6.ee = 1;
                  i6.W.ee = 0;
                  i6.te();
                } else {
                  i6.ee = 1;
                  e7 = t6;
                }
              }
            }
          }
        }
        fe(e7) {
          if (this.i === 1) {
            this.clear();
            return this.h;
          }
          let t6 = e7;
          while (t6.U || t6.W) {
            if (t6.W) {
              t6 = t6.W;
              while (t6.U)
                t6 = t6.U;
            } else {
              t6 = t6.U;
            }
            [e7.u, t6.u] = [t6.u, e7.u];
            [e7.l, t6.l] = [t6.l, e7.l];
            e7 = t6;
          }
          if (this.h.U === t6) {
            this.h.U = t6.tt;
          } else if (this.h.W === t6) {
            this.h.W = t6.tt;
          }
          this.ue(t6);
          const i6 = t6.tt;
          if (t6 === i6.U) {
            i6.U = void 0;
          } else
            i6.W = void 0;
          this.i -= 1;
          this.Y.ee = 0;
          return i6;
        }
        oe(e7, t6) {
          if (e7 === void 0)
            return false;
          const i6 = this.oe(e7.U, t6);
          if (i6)
            return true;
          if (t6(e7))
            return true;
          return this.oe(e7.W, t6);
        }
        he(e7) {
          while (true) {
            const t6 = e7.tt;
            if (t6.ee === 0)
              return;
            const i6 = t6.tt;
            if (t6 === i6.U) {
              const s5 = i6.W;
              if (s5 && s5.ee === 1) {
                s5.ee = t6.ee = 0;
                if (i6 === this.Y)
                  return;
                i6.ee = 1;
                e7 = i6;
                continue;
              } else if (e7 === t6.W) {
                e7.ee = 0;
                if (e7.U)
                  e7.U.tt = t6;
                if (e7.W)
                  e7.W.tt = i6;
                t6.W = e7.U;
                i6.U = e7.W;
                e7.U = t6;
                e7.W = i6;
                if (i6 === this.Y) {
                  this.Y = e7;
                  this.h.tt = e7;
                } else {
                  const t7 = i6.tt;
                  if (t7.U === i6) {
                    t7.U = e7;
                  } else
                    t7.W = e7;
                }
                e7.tt = i6.tt;
                t6.tt = e7;
                i6.tt = e7;
                i6.ee = 1;
                return {
                  parentNode: t6,
                  grandParent: i6,
                  curNode: e7
                };
              } else {
                t6.ee = 0;
                if (i6 === this.Y) {
                  this.Y = i6.se();
                } else
                  i6.se();
                i6.ee = 1;
              }
            } else {
              const s5 = i6.U;
              if (s5 && s5.ee === 1) {
                s5.ee = t6.ee = 0;
                if (i6 === this.Y)
                  return;
                i6.ee = 1;
                e7 = i6;
                continue;
              } else if (e7 === t6.U) {
                e7.ee = 0;
                if (e7.U)
                  e7.U.tt = i6;
                if (e7.W)
                  e7.W.tt = t6;
                i6.W = e7.U;
                t6.U = e7.W;
                e7.U = i6;
                e7.W = t6;
                if (i6 === this.Y) {
                  this.Y = e7;
                  this.h.tt = e7;
                } else {
                  const t7 = i6.tt;
                  if (t7.U === i6) {
                    t7.U = e7;
                  } else
                    t7.W = e7;
                }
                e7.tt = i6.tt;
                t6.tt = e7;
                i6.tt = e7;
                i6.ee = 1;
                return {
                  parentNode: t6,
                  grandParent: i6,
                  curNode: e7
                };
              } else {
                t6.ee = 0;
                if (i6 === this.Y) {
                  this.Y = i6.te();
                } else
                  i6.te();
                i6.ee = 1;
              }
            }
            return;
          }
        }
        ne(e7, t6, i6) {
          if (this.Y === void 0) {
            this.i += 1;
            this.Y = new this.re(e7, t6);
            this.Y.ee = 0;
            this.Y.tt = this.h;
            this.h.tt = this.Y;
            this.h.U = this.Y;
            this.h.W = this.Y;
            return;
          }
          let s5;
          const r7 = this.h.U;
          const n7 = this.v(r7.u, e7);
          if (n7 === 0) {
            r7.l = t6;
            return;
          } else if (n7 > 0) {
            r7.U = new this.re(e7, t6);
            r7.U.tt = r7;
            s5 = r7.U;
            this.h.U = s5;
          } else {
            const r8 = this.h.W;
            const n8 = this.v(r8.u, e7);
            if (n8 === 0) {
              r8.l = t6;
              return;
            } else if (n8 < 0) {
              r8.W = new this.re(e7, t6);
              r8.W.tt = r8;
              s5 = r8.W;
              this.h.W = s5;
            } else {
              if (i6 !== void 0) {
                const r9 = i6.o;
                if (r9 !== this.h) {
                  const i7 = this.v(r9.u, e7);
                  if (i7 === 0) {
                    r9.l = t6;
                    return;
                  } else if (i7 > 0) {
                    const i8 = r9.L();
                    const n9 = this.v(i8.u, e7);
                    if (n9 === 0) {
                      i8.l = t6;
                      return;
                    } else if (n9 < 0) {
                      s5 = new this.re(e7, t6);
                      if (i8.W === void 0) {
                        i8.W = s5;
                        s5.tt = i8;
                      } else {
                        r9.U = s5;
                        s5.tt = r9;
                      }
                    }
                  }
                }
              }
              if (s5 === void 0) {
                s5 = this.Y;
                while (true) {
                  const i7 = this.v(s5.u, e7);
                  if (i7 > 0) {
                    if (s5.U === void 0) {
                      s5.U = new this.re(e7, t6);
                      s5.U.tt = s5;
                      s5 = s5.U;
                      break;
                    }
                    s5 = s5.U;
                  } else if (i7 < 0) {
                    if (s5.W === void 0) {
                      s5.W = new this.re(e7, t6);
                      s5.W.tt = s5;
                      s5 = s5.W;
                      break;
                    }
                    s5 = s5.W;
                  } else {
                    s5.l = t6;
                    return;
                  }
                }
              }
            }
          }
          this.i += 1;
          return s5;
        }
        I(e7, t6) {
          while (e7) {
            const i6 = this.v(e7.u, t6);
            if (i6 < 0) {
              e7 = e7.W;
            } else if (i6 > 0) {
              e7 = e7.U;
            } else
              return e7;
          }
          return e7 || this.h;
        }
        clear() {
          this.i = 0;
          this.Y = void 0;
          this.h.tt = void 0;
          this.h.U = this.h.W = void 0;
        }
        updateKeyByIterator(e7, t6) {
          const i6 = e7.o;
          if (i6 === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          if (this.i === 1) {
            i6.u = t6;
            return true;
          }
          if (i6 === this.h.U) {
            if (this.v(i6.B().u, t6) > 0) {
              i6.u = t6;
              return true;
            }
            return false;
          }
          if (i6 === this.h.W) {
            if (this.v(i6.L().u, t6) < 0) {
              i6.u = t6;
              return true;
            }
            return false;
          }
          const s5 = i6.L().u;
          if (this.v(s5, t6) >= 0)
            return false;
          const r7 = i6.B().u;
          if (this.v(r7, t6) <= 0)
            return false;
          i6.u = t6;
          return true;
        }
        eraseElementByPos(e7) {
          if (e7 < 0 || e7 > this.i - 1) {
            throw new RangeError();
          }
          let t6 = 0;
          const i6 = this;
          this.oe(this.Y, function(s5) {
            if (e7 === t6) {
              i6.V(s5);
              return true;
            }
            t6 += 1;
            return false;
          });
          return this.i;
        }
        eraseElementByKey(e7) {
          if (this.i === 0)
            return false;
          const t6 = this.I(this.Y, e7);
          if (t6 === this.h)
            return false;
          this.V(t6);
          return true;
        }
        eraseElementByIterator(e7) {
          const t6 = e7.o;
          if (t6 === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          const i6 = t6.W === void 0;
          const s5 = e7.iteratorType === 0;
          if (s5) {
            if (i6)
              e7.next();
          } else {
            if (!i6 || t6.U === void 0)
              e7.next();
          }
          this.V(t6);
          return e7;
        }
        forEach(e7) {
          let t6 = 0;
          for (const i6 of this)
            e7(i6, t6++, this);
        }
        getElementByPos(e7) {
          if (e7 < 0 || e7 > this.i - 1) {
            throw new RangeError();
          }
          let t6;
          let i6 = 0;
          for (const s5 of this) {
            if (i6 === e7) {
              t6 = s5;
              break;
            }
            i6 += 1;
          }
          return t6;
        }
        getHeight() {
          if (this.i === 0)
            return 0;
          const traversal = function(e7) {
            if (!e7)
              return 0;
            return Math.max(traversal(e7.U), traversal(e7.W)) + 1;
          };
          return traversal(this.Y);
        }
      };
      var _default = TreeContainer;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/TreeIterator.js
  var require_TreeIterator = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/TreeContainer/Base/TreeIterator.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _ContainerBase = require_ContainerBase();
      var _throwError = require_throwError();
      var TreeIterator = class extends _ContainerBase.ContainerIterator {
        constructor(t6, r7, i6) {
          super(i6);
          this.o = t6;
          this.h = r7;
          if (this.iteratorType === 0) {
            this.pre = function() {
              if (this.o === this.h.U) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L();
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B();
              return this;
            };
          } else {
            this.pre = function() {
              if (this.o === this.h.W) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B();
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L();
              return this;
            };
          }
        }
        get index() {
          let t6 = this.o;
          const r7 = this.h.tt;
          if (t6 === this.h) {
            if (r7) {
              return r7.rt - 1;
            }
            return 0;
          }
          let i6 = 0;
          if (t6.U) {
            i6 += t6.U.rt;
          }
          while (t6 !== r7) {
            const r8 = t6.tt;
            if (t6 === r8.W) {
              i6 += 1;
              if (r8.U) {
                i6 += r8.U.rt;
              }
            }
            t6 = r8;
          }
          return i6;
        }
      };
      var _default = TreeIterator;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/TreeContainer/OrderedSet.js
  var require_OrderedSet = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/TreeContainer/OrderedSet.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = _interopRequireDefault(require_Base2());
      var _TreeIterator = _interopRequireDefault(require_TreeIterator());
      var _throwError = require_throwError();
      function _interopRequireDefault(e7) {
        return e7 && e7.t ? e7 : {
          default: e7
        };
      }
      var OrderedSetIterator = class _OrderedSetIterator extends _TreeIterator.default {
        constructor(e7, t6, r7, i6) {
          super(e7, t6, i6);
          this.container = r7;
        }
        get pointer() {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          return this.o.u;
        }
        copy() {
          return new _OrderedSetIterator(this.o, this.h, this.container, this.iteratorType);
        }
      };
      var OrderedSet = class extends _Base.default {
        constructor(e7 = [], t6, r7) {
          super(t6, r7);
          const i6 = this;
          e7.forEach(function(e8) {
            i6.insert(e8);
          });
        }
        *K(e7) {
          if (e7 === void 0)
            return;
          yield* this.K(e7.U);
          yield e7.u;
          yield* this.K(e7.W);
        }
        begin() {
          return new OrderedSetIterator(this.h.U || this.h, this.h, this);
        }
        end() {
          return new OrderedSetIterator(this.h, this.h, this);
        }
        rBegin() {
          return new OrderedSetIterator(this.h.W || this.h, this.h, this, 1);
        }
        rEnd() {
          return new OrderedSetIterator(this.h, this.h, this, 1);
        }
        front() {
          return this.h.U ? this.h.U.u : void 0;
        }
        back() {
          return this.h.W ? this.h.W.u : void 0;
        }
        insert(e7, t6) {
          return this.M(e7, void 0, t6);
        }
        find(e7) {
          const t6 = this.I(this.Y, e7);
          return new OrderedSetIterator(t6, this.h, this);
        }
        lowerBound(e7) {
          const t6 = this.X(this.Y, e7);
          return new OrderedSetIterator(t6, this.h, this);
        }
        upperBound(e7) {
          const t6 = this.Z(this.Y, e7);
          return new OrderedSetIterator(t6, this.h, this);
        }
        reverseLowerBound(e7) {
          const t6 = this.$(this.Y, e7);
          return new OrderedSetIterator(t6, this.h, this);
        }
        reverseUpperBound(e7) {
          const t6 = this.rr(this.Y, e7);
          return new OrderedSetIterator(t6, this.h, this);
        }
        union(e7) {
          const t6 = this;
          e7.forEach(function(e8) {
            t6.insert(e8);
          });
          return this.i;
        }
        [Symbol.iterator]() {
          return this.K(this.Y);
        }
      };
      var _default = OrderedSet;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/TreeContainer/OrderedMap.js
  var require_OrderedMap = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/TreeContainer/OrderedMap.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = _interopRequireDefault(require_Base2());
      var _TreeIterator = _interopRequireDefault(require_TreeIterator());
      var _throwError = require_throwError();
      function _interopRequireDefault(r7) {
        return r7 && r7.t ? r7 : {
          default: r7
        };
      }
      var OrderedMapIterator = class _OrderedMapIterator extends _TreeIterator.default {
        constructor(r7, t6, e7, s5) {
          super(r7, t6, s5);
          this.container = e7;
        }
        get pointer() {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          const r7 = this;
          return new Proxy([], {
            get(t6, e7) {
              if (e7 === "0")
                return r7.o.u;
              else if (e7 === "1")
                return r7.o.l;
            },
            set(t6, e7, s5) {
              if (e7 !== "1") {
                throw new TypeError("props must be 1");
              }
              r7.o.l = s5;
              return true;
            }
          });
        }
        copy() {
          return new _OrderedMapIterator(this.o, this.h, this.container, this.iteratorType);
        }
      };
      var OrderedMap = class extends _Base.default {
        constructor(r7 = [], t6, e7) {
          super(t6, e7);
          const s5 = this;
          r7.forEach(function(r8) {
            s5.setElement(r8[0], r8[1]);
          });
        }
        *K(r7) {
          if (r7 === void 0)
            return;
          yield* this.K(r7.U);
          yield [r7.u, r7.l];
          yield* this.K(r7.W);
        }
        begin() {
          return new OrderedMapIterator(this.h.U || this.h, this.h, this);
        }
        end() {
          return new OrderedMapIterator(this.h, this.h, this);
        }
        rBegin() {
          return new OrderedMapIterator(this.h.W || this.h, this.h, this, 1);
        }
        rEnd() {
          return new OrderedMapIterator(this.h, this.h, this, 1);
        }
        front() {
          if (this.i === 0)
            return;
          const r7 = this.h.U;
          return [r7.u, r7.l];
        }
        back() {
          if (this.i === 0)
            return;
          const r7 = this.h.W;
          return [r7.u, r7.l];
        }
        lowerBound(r7) {
          const t6 = this.X(this.Y, r7);
          return new OrderedMapIterator(t6, this.h, this);
        }
        upperBound(r7) {
          const t6 = this.Z(this.Y, r7);
          return new OrderedMapIterator(t6, this.h, this);
        }
        reverseLowerBound(r7) {
          const t6 = this.$(this.Y, r7);
          return new OrderedMapIterator(t6, this.h, this);
        }
        reverseUpperBound(r7) {
          const t6 = this.rr(this.Y, r7);
          return new OrderedMapIterator(t6, this.h, this);
        }
        setElement(r7, t6, e7) {
          return this.M(r7, t6, e7);
        }
        find(r7) {
          const t6 = this.I(this.Y, r7);
          return new OrderedMapIterator(t6, this.h, this);
        }
        getElementByKey(r7) {
          const t6 = this.I(this.Y, r7);
          return t6.l;
        }
        union(r7) {
          const t6 = this;
          r7.forEach(function(r8) {
            t6.setElement(r8[0], r8[1]);
          });
          return this.i;
        }
        [Symbol.iterator]() {
          return this.K(this.Y);
        }
      };
      var _default = OrderedMap;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/utils/checkObject.js
  var require_checkObject = __commonJS({
    "node_modules/js-sdsl/dist/cjs/utils/checkObject.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = checkObject;
      function checkObject(e7) {
        const t6 = typeof e7;
        return t6 === "object" && e7 !== null || t6 === "function";
      }
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/HashContainer/Base/index.js
  var require_Base3 = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/HashContainer/Base/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.HashContainerIterator = exports5.HashContainer = void 0;
      var _ContainerBase = require_ContainerBase();
      var _checkObject = _interopRequireDefault(require_checkObject());
      var _throwError = require_throwError();
      function _interopRequireDefault(t6) {
        return t6 && t6.t ? t6 : {
          default: t6
        };
      }
      var HashContainerIterator = class extends _ContainerBase.ContainerIterator {
        constructor(t6, e7, i6) {
          super(i6);
          this.o = t6;
          this.h = e7;
          if (this.iteratorType === 0) {
            this.pre = function() {
              if (this.o.L === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L;
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B;
              return this;
            };
          } else {
            this.pre = function() {
              if (this.o.B === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.B;
              return this;
            };
            this.next = function() {
              if (this.o === this.h) {
                (0, _throwError.throwIteratorAccessError)();
              }
              this.o = this.o.L;
              return this;
            };
          }
        }
      };
      exports5.HashContainerIterator = HashContainerIterator;
      var HashContainer = class extends _ContainerBase.Container {
        constructor() {
          super();
          this.H = [];
          this.g = {};
          this.HASH_TAG = Symbol("@@HASH_TAG");
          Object.setPrototypeOf(this.g, null);
          this.h = {};
          this.h.L = this.h.B = this.p = this._ = this.h;
        }
        V(t6) {
          const { L: e7, B: i6 } = t6;
          e7.B = i6;
          i6.L = e7;
          if (t6 === this.p) {
            this.p = i6;
          }
          if (t6 === this._) {
            this._ = e7;
          }
          this.i -= 1;
        }
        M(t6, e7, i6) {
          if (i6 === void 0)
            i6 = (0, _checkObject.default)(t6);
          let s5;
          if (i6) {
            const i7 = t6[this.HASH_TAG];
            if (i7 !== void 0) {
              this.H[i7].l = e7;
              return this.i;
            }
            Object.defineProperty(t6, this.HASH_TAG, {
              value: this.H.length,
              configurable: true
            });
            s5 = {
              u: t6,
              l: e7,
              L: this._,
              B: this.h
            };
            this.H.push(s5);
          } else {
            const i7 = this.g[t6];
            if (i7) {
              i7.l = e7;
              return this.i;
            }
            s5 = {
              u: t6,
              l: e7,
              L: this._,
              B: this.h
            };
            this.g[t6] = s5;
          }
          if (this.i === 0) {
            this.p = s5;
            this.h.B = s5;
          } else {
            this._.B = s5;
          }
          this._ = s5;
          this.h.L = s5;
          return ++this.i;
        }
        I(t6, e7) {
          if (e7 === void 0)
            e7 = (0, _checkObject.default)(t6);
          if (e7) {
            const e8 = t6[this.HASH_TAG];
            if (e8 === void 0)
              return this.h;
            return this.H[e8];
          } else {
            return this.g[t6] || this.h;
          }
        }
        clear() {
          const t6 = this.HASH_TAG;
          this.H.forEach(function(e7) {
            delete e7.u[t6];
          });
          this.H = [];
          this.g = {};
          Object.setPrototypeOf(this.g, null);
          this.i = 0;
          this.p = this._ = this.h.L = this.h.B = this.h;
        }
        eraseElementByKey(t6, e7) {
          let i6;
          if (e7 === void 0)
            e7 = (0, _checkObject.default)(t6);
          if (e7) {
            const e8 = t6[this.HASH_TAG];
            if (e8 === void 0)
              return false;
            delete t6[this.HASH_TAG];
            i6 = this.H[e8];
            delete this.H[e8];
          } else {
            i6 = this.g[t6];
            if (i6 === void 0)
              return false;
            delete this.g[t6];
          }
          this.V(i6);
          return true;
        }
        eraseElementByIterator(t6) {
          const e7 = t6.o;
          if (e7 === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          this.V(e7);
          return t6.next();
        }
        eraseElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let e7 = this.p;
          while (t6--) {
            e7 = e7.B;
          }
          this.V(e7);
          return this.i;
        }
      };
      exports5.HashContainer = HashContainer;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/HashContainer/HashSet.js
  var require_HashSet = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/HashContainer/HashSet.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = require_Base3();
      var _throwError = require_throwError();
      var HashSetIterator = class _HashSetIterator extends _Base.HashContainerIterator {
        constructor(t6, e7, r7, s5) {
          super(t6, e7, s5);
          this.container = r7;
        }
        get pointer() {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          return this.o.u;
        }
        copy() {
          return new _HashSetIterator(this.o, this.h, this.container, this.iteratorType);
        }
      };
      var HashSet = class extends _Base.HashContainer {
        constructor(t6 = []) {
          super();
          const e7 = this;
          t6.forEach(function(t7) {
            e7.insert(t7);
          });
        }
        begin() {
          return new HashSetIterator(this.p, this.h, this);
        }
        end() {
          return new HashSetIterator(this.h, this.h, this);
        }
        rBegin() {
          return new HashSetIterator(this._, this.h, this, 1);
        }
        rEnd() {
          return new HashSetIterator(this.h, this.h, this, 1);
        }
        front() {
          return this.p.u;
        }
        back() {
          return this._.u;
        }
        insert(t6, e7) {
          return this.M(t6, void 0, e7);
        }
        getElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let e7 = this.p;
          while (t6--) {
            e7 = e7.B;
          }
          return e7.u;
        }
        find(t6, e7) {
          const r7 = this.I(t6, e7);
          return new HashSetIterator(r7, this.h, this);
        }
        forEach(t6) {
          let e7 = 0;
          let r7 = this.p;
          while (r7 !== this.h) {
            t6(r7.u, e7++, this);
            r7 = r7.B;
          }
        }
        [Symbol.iterator]() {
          return function* () {
            let t6 = this.p;
            while (t6 !== this.h) {
              yield t6.u;
              t6 = t6.B;
            }
          }.bind(this)();
        }
      };
      var _default = HashSet;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/container/HashContainer/HashMap.js
  var require_HashMap = __commonJS({
    "node_modules/js-sdsl/dist/cjs/container/HashContainer/HashMap.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      exports5.default = void 0;
      var _Base = require_Base3();
      var _checkObject = _interopRequireDefault(require_checkObject());
      var _throwError = require_throwError();
      function _interopRequireDefault(t6) {
        return t6 && t6.t ? t6 : {
          default: t6
        };
      }
      var HashMapIterator = class _HashMapIterator extends _Base.HashContainerIterator {
        constructor(t6, e7, r7, s5) {
          super(t6, e7, s5);
          this.container = r7;
        }
        get pointer() {
          if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
          }
          const t6 = this;
          return new Proxy([], {
            get(e7, r7) {
              if (r7 === "0")
                return t6.o.u;
              else if (r7 === "1")
                return t6.o.l;
            },
            set(e7, r7, s5) {
              if (r7 !== "1") {
                throw new TypeError("props must be 1");
              }
              t6.o.l = s5;
              return true;
            }
          });
        }
        copy() {
          return new _HashMapIterator(this.o, this.h, this.container, this.iteratorType);
        }
      };
      var HashMap = class extends _Base.HashContainer {
        constructor(t6 = []) {
          super();
          const e7 = this;
          t6.forEach(function(t7) {
            e7.setElement(t7[0], t7[1]);
          });
        }
        begin() {
          return new HashMapIterator(this.p, this.h, this);
        }
        end() {
          return new HashMapIterator(this.h, this.h, this);
        }
        rBegin() {
          return new HashMapIterator(this._, this.h, this, 1);
        }
        rEnd() {
          return new HashMapIterator(this.h, this.h, this, 1);
        }
        front() {
          if (this.i === 0)
            return;
          return [this.p.u, this.p.l];
        }
        back() {
          if (this.i === 0)
            return;
          return [this._.u, this._.l];
        }
        setElement(t6, e7, r7) {
          return this.M(t6, e7, r7);
        }
        getElementByKey(t6, e7) {
          if (e7 === void 0)
            e7 = (0, _checkObject.default)(t6);
          if (e7) {
            const e8 = t6[this.HASH_TAG];
            return e8 !== void 0 ? this.H[e8].l : void 0;
          }
          const r7 = this.g[t6];
          return r7 ? r7.l : void 0;
        }
        getElementByPos(t6) {
          if (t6 < 0 || t6 > this.i - 1) {
            throw new RangeError();
          }
          let e7 = this.p;
          while (t6--) {
            e7 = e7.B;
          }
          return [e7.u, e7.l];
        }
        find(t6, e7) {
          const r7 = this.I(t6, e7);
          return new HashMapIterator(r7, this.h, this);
        }
        forEach(t6) {
          let e7 = 0;
          let r7 = this.p;
          while (r7 !== this.h) {
            t6([r7.u, r7.l], e7++, this);
            r7 = r7.B;
          }
        }
        [Symbol.iterator]() {
          return function* () {
            let t6 = this.p;
            while (t6 !== this.h) {
              yield [t6.u, t6.l];
              t6 = t6.B;
            }
          }.bind(this)();
        }
      };
      var _default = HashMap;
      exports5.default = _default;
    }
  });

  // node_modules/js-sdsl/dist/cjs/index.js
  var require_cjs2 = __commonJS({
    "node_modules/js-sdsl/dist/cjs/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "t", {
        value: true
      });
      Object.defineProperty(exports5, "Deque", {
        enumerable: true,
        get: function() {
          return _Deque.default;
        }
      });
      Object.defineProperty(exports5, "HashMap", {
        enumerable: true,
        get: function() {
          return _HashMap.default;
        }
      });
      Object.defineProperty(exports5, "HashSet", {
        enumerable: true,
        get: function() {
          return _HashSet.default;
        }
      });
      Object.defineProperty(exports5, "LinkList", {
        enumerable: true,
        get: function() {
          return _LinkList.default;
        }
      });
      Object.defineProperty(exports5, "OrderedMap", {
        enumerable: true,
        get: function() {
          return _OrderedMap.default;
        }
      });
      Object.defineProperty(exports5, "OrderedSet", {
        enumerable: true,
        get: function() {
          return _OrderedSet.default;
        }
      });
      Object.defineProperty(exports5, "PriorityQueue", {
        enumerable: true,
        get: function() {
          return _PriorityQueue.default;
        }
      });
      Object.defineProperty(exports5, "Queue", {
        enumerable: true,
        get: function() {
          return _Queue.default;
        }
      });
      Object.defineProperty(exports5, "Stack", {
        enumerable: true,
        get: function() {
          return _Stack.default;
        }
      });
      Object.defineProperty(exports5, "Vector", {
        enumerable: true,
        get: function() {
          return _Vector.default;
        }
      });
      var _Stack = _interopRequireDefault(require_Stack());
      var _Queue = _interopRequireDefault(require_Queue());
      var _PriorityQueue = _interopRequireDefault(require_PriorityQueue());
      var _Vector = _interopRequireDefault(require_Vector());
      var _LinkList = _interopRequireDefault(require_LinkList());
      var _Deque = _interopRequireDefault(require_Deque());
      var _OrderedSet = _interopRequireDefault(require_OrderedSet());
      var _OrderedMap = _interopRequireDefault(require_OrderedMap());
      var _HashSet = _interopRequireDefault(require_HashSet());
      var _HashMap = _interopRequireDefault(require_HashMap());
      function _interopRequireDefault(e7) {
        return e7 && e7.t ? e7 : {
          default: e7
        };
      }
    }
  });

  // node_modules/number-allocator/lib/number-allocator.js
  var require_number_allocator = __commonJS({
    "node_modules/number-allocator/lib/number-allocator.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var SortedSet = require_cjs2().OrderedSet;
      var debugTrace = require_browser4()("number-allocator:trace");
      var debugError = require_browser4()("number-allocator:error");
      function Interval(low, high) {
        this.low = low;
        this.high = high;
      }
      Interval.prototype.equals = function(other) {
        return this.low === other.low && this.high === other.high;
      };
      Interval.prototype.compare = function(other) {
        if (this.low < other.low && this.high < other.low)
          return -1;
        if (other.low < this.low && other.high < this.low)
          return 1;
        return 0;
      };
      function NumberAllocator(min, max) {
        if (!(this instanceof NumberAllocator)) {
          return new NumberAllocator(min, max);
        }
        this.min = min;
        this.max = max;
        this.ss = new SortedSet(
          [],
          (lhs, rhs) => {
            return lhs.compare(rhs);
          }
        );
        debugTrace("Create");
        this.clear();
      }
      NumberAllocator.prototype.firstVacant = function() {
        if (this.ss.size() === 0)
          return null;
        return this.ss.front().low;
      };
      NumberAllocator.prototype.alloc = function() {
        if (this.ss.size() === 0) {
          debugTrace("alloc():empty");
          return null;
        }
        const it = this.ss.begin();
        const low = it.pointer.low;
        const high = it.pointer.high;
        const num = low;
        if (num + 1 <= high) {
          this.ss.updateKeyByIterator(it, new Interval(low + 1, high));
        } else {
          this.ss.eraseElementByPos(0);
        }
        debugTrace("alloc():" + num);
        return num;
      };
      NumberAllocator.prototype.use = function(num) {
        const key = new Interval(num, num);
        const it = this.ss.lowerBound(key);
        if (!it.equals(this.ss.end())) {
          const low = it.pointer.low;
          const high = it.pointer.high;
          if (it.pointer.equals(key)) {
            this.ss.eraseElementByIterator(it);
            debugTrace("use():" + num);
            return true;
          }
          if (low > num)
            return false;
          if (low === num) {
            this.ss.updateKeyByIterator(it, new Interval(low + 1, high));
            debugTrace("use():" + num);
            return true;
          }
          if (high === num) {
            this.ss.updateKeyByIterator(it, new Interval(low, high - 1));
            debugTrace("use():" + num);
            return true;
          }
          this.ss.updateKeyByIterator(it, new Interval(num + 1, high));
          this.ss.insert(new Interval(low, num - 1));
          debugTrace("use():" + num);
          return true;
        }
        debugTrace("use():failed");
        return false;
      };
      NumberAllocator.prototype.free = function(num) {
        if (num < this.min || num > this.max) {
          debugError("free():" + num + " is out of range");
          return;
        }
        const key = new Interval(num, num);
        const it = this.ss.upperBound(key);
        if (it.equals(this.ss.end())) {
          if (it.equals(this.ss.begin())) {
            this.ss.insert(key);
            return;
          }
          it.pre();
          const low = it.pointer.high;
          const high = it.pointer.high;
          if (high + 1 === num) {
            this.ss.updateKeyByIterator(it, new Interval(low, num));
          } else {
            this.ss.insert(key);
          }
        } else {
          if (it.equals(this.ss.begin())) {
            if (num + 1 === it.pointer.low) {
              const high = it.pointer.high;
              this.ss.updateKeyByIterator(it, new Interval(num, high));
            } else {
              this.ss.insert(key);
            }
          } else {
            const rLow = it.pointer.low;
            const rHigh = it.pointer.high;
            it.pre();
            const lLow = it.pointer.low;
            const lHigh = it.pointer.high;
            if (lHigh + 1 === num) {
              if (num + 1 === rLow) {
                this.ss.eraseElementByIterator(it);
                this.ss.updateKeyByIterator(it, new Interval(lLow, rHigh));
              } else {
                this.ss.updateKeyByIterator(it, new Interval(lLow, num));
              }
            } else {
              if (num + 1 === rLow) {
                this.ss.eraseElementByIterator(it.next());
                this.ss.insert(new Interval(num, rHigh));
              } else {
                this.ss.insert(key);
              }
            }
          }
        }
        debugTrace("free():" + num);
      };
      NumberAllocator.prototype.clear = function() {
        debugTrace("clear()");
        this.ss.clear();
        this.ss.insert(new Interval(this.min, this.max));
      };
      NumberAllocator.prototype.intervalCount = function() {
        return this.ss.size();
      };
      NumberAllocator.prototype.dump = function() {
        console.log("length:" + this.ss.size());
        for (const element of this.ss) {
          console.log(element);
        }
      };
      module.exports = NumberAllocator;
    }
  });

  // node_modules/number-allocator/index.js
  var require_number_allocator2 = __commonJS({
    "node_modules/number-allocator/index.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      var NumberAllocator = require_number_allocator();
      module.exports.NumberAllocator = NumberAllocator;
    }
  });

  // build/lib/topic-alias-send.js
  var require_topic_alias_send = __commonJS({
    "build/lib/topic-alias-send.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var lru_cache_1 = require_cjs();
      var number_allocator_1 = require_number_allocator2();
      var TopicAliasSend = class {
        constructor(max) {
          if (max > 0) {
            this.aliasToTopic = new lru_cache_1.LRUCache({ max });
            this.topicToAlias = {};
            this.numberAllocator = new number_allocator_1.NumberAllocator(1, max);
            this.max = max;
            this.length = 0;
          }
        }
        put(topic, alias) {
          if (alias === 0 || alias > this.max) {
            return false;
          }
          const entry = this.aliasToTopic.get(alias);
          if (entry) {
            delete this.topicToAlias[entry];
          }
          this.aliasToTopic.set(alias, topic);
          this.topicToAlias[topic] = alias;
          this.numberAllocator.use(alias);
          this.length = this.aliasToTopic.size;
          return true;
        }
        getTopicByAlias(alias) {
          return this.aliasToTopic.get(alias);
        }
        getAliasByTopic(topic) {
          const alias = this.topicToAlias[topic];
          if (typeof alias !== "undefined") {
            this.aliasToTopic.get(alias);
          }
          return alias;
        }
        clear() {
          this.aliasToTopic.clear();
          this.topicToAlias = {};
          this.numberAllocator.clear();
          this.length = 0;
        }
        getLruAlias() {
          const alias = this.numberAllocator.firstVacant();
          if (alias)
            return alias;
          return [...this.aliasToTopic.keys()][this.aliasToTopic.size - 1];
        }
      };
      exports5.default = TopicAliasSend;
    }
  });

  // build/lib/handlers/connack.js
  var require_connack = __commonJS({
    "build/lib/handlers/connack.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var ack_1 = require_ack();
      var topic_alias_send_1 = __importDefault(require_topic_alias_send());
      var shared_1 = require_shared();
      var handleConnack = (client, packet) => {
        client.log("_handleConnack");
        const { options } = client;
        const version2 = options.protocolVersion;
        const rc = version2 === 5 ? packet.reasonCode : packet.returnCode;
        clearTimeout(client["connackTimer"]);
        delete client["topicAliasSend"];
        if (packet.properties) {
          if (packet.properties.topicAliasMaximum) {
            if (packet.properties.topicAliasMaximum > 65535) {
              client.emit("error", new Error("topicAliasMaximum from broker is out of range"));
              return;
            }
            if (packet.properties.topicAliasMaximum > 0) {
              client["topicAliasSend"] = new topic_alias_send_1.default(packet.properties.topicAliasMaximum);
            }
          }
          if (packet.properties.serverKeepAlive && options.keepalive) {
            options.keepalive = packet.properties.serverKeepAlive;
          }
          if (packet.properties.maximumPacketSize) {
            if (!options.properties) {
              options.properties = {};
            }
            options.properties.maximumPacketSize = packet.properties.maximumPacketSize;
          }
        }
        if (rc === 0) {
          client.reconnecting = false;
          client["_onConnect"](packet);
        } else if (rc > 0) {
          const err = new shared_1.ErrorWithReasonCode(`Connection refused: ${ack_1.ReasonCodes[rc]}`, rc);
          client.emit("error", err);
        }
      };
      exports5.default = handleConnack;
    }
  });

  // build/lib/handlers/pubrel.js
  var require_pubrel = __commonJS({
    "build/lib/handlers/pubrel.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var handlePubrel = (client, packet, done) => {
        client.log("handling pubrel packet");
        const callback = typeof done !== "undefined" ? done : client.noop;
        const { messageId } = packet;
        const comp = { cmd: "pubcomp", messageId };
        client.incomingStore.get(packet, (err, pub) => {
          if (!err) {
            client.emit("message", pub.topic, pub.payload, pub);
            client.handleMessage(pub, (err2) => {
              if (err2) {
                return callback(err2);
              }
              client.incomingStore.del(pub, client.noop);
              client["_sendPacket"](comp, callback);
            });
          } else {
            client["_sendPacket"](comp, callback);
          }
        });
      };
      exports5.default = handlePubrel;
    }
  });

  // build/lib/handlers/index.js
  var require_handlers = __commonJS({
    "build/lib/handlers/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var publish_1 = __importDefault(require_publish());
      var auth_1 = __importDefault(require_auth());
      var connack_1 = __importDefault(require_connack());
      var ack_1 = __importDefault(require_ack());
      var pubrel_1 = __importDefault(require_pubrel());
      var handle = (client, packet, done) => {
        const { options } = client;
        if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
          client.emit("error", new Error(`exceeding packets size ${packet.cmd}`));
          client.end({
            reasonCode: 149,
            properties: { reasonString: "Maximum packet size was exceeded" }
          });
          return client;
        }
        client.log("_handlePacket :: emitting packetreceive");
        client.emit("packetreceive", packet);
        switch (packet.cmd) {
          case "publish":
            (0, publish_1.default)(client, packet, done);
            break;
          case "puback":
          case "pubrec":
          case "pubcomp":
          case "suback":
          case "unsuback":
            client.reschedulePing();
            (0, ack_1.default)(client, packet);
            done();
            break;
          case "pubrel":
            client.reschedulePing();
            (0, pubrel_1.default)(client, packet, done);
            break;
          case "connack":
            (0, connack_1.default)(client, packet);
            done();
            break;
          case "auth":
            client.reschedulePing();
            (0, auth_1.default)(client, packet);
            done();
            break;
          case "pingresp":
            client.log("_handlePacket :: received pingresp");
            client.reschedulePing();
            done();
            break;
          case "disconnect":
            client.emit("disconnect", packet);
            done();
            break;
          default:
            client.log("_handlePacket :: unknown command");
            done();
            break;
        }
      };
      exports5.default = handle;
    }
  });

  // build/lib/TypedEmitter.js
  var require_TypedEmitter = __commonJS({
    "build/lib/TypedEmitter.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.TypedEventEmitter = void 0;
      var events_1 = __importDefault((init_events(), __toCommonJS(events_exports)));
      var shared_1 = require_shared();
      var TypedEventEmitter = class {
      };
      exports5.TypedEventEmitter = TypedEventEmitter;
      (0, shared_1.applyMixin)(TypedEventEmitter, events_1.default);
    }
  });

  // build/lib/is-browser.js
  var require_is_browser = __commonJS({
    "build/lib/is-browser.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.isReactNativeBrowser = exports5.isWebWorker = void 0;
      var isStandardBrowserEnv = () => {
        var _a;
        if (typeof window !== "undefined") {
          const electronRenderCheck = typeof navigator !== "undefined" && ((_a = navigator.userAgent) === null || _a === void 0 ? void 0 : _a.toLowerCase().indexOf(" electron/")) > -1;
          if (electronRenderCheck && (process_exports === null || process_exports === void 0 ? void 0 : process_exports.versions)) {
            const electronMainCheck = Object.prototype.hasOwnProperty.call(process_exports.versions, "electron");
            return !electronMainCheck;
          }
          return typeof window.document !== "undefined";
        }
        return false;
      };
      var isWebWorkerEnv = () => {
        var _a, _b;
        return Boolean(typeof self === "object" && ((_b = (_a = self === null || self === void 0 ? void 0 : self.constructor) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.includes("WorkerGlobalScope")));
      };
      var isReactNativeEnv = () => typeof navigator !== "undefined" && navigator.product === "ReactNative";
      var isBrowser = isStandardBrowserEnv() || isWebWorkerEnv() || isReactNativeEnv();
      exports5.isWebWorker = isWebWorkerEnv();
      exports5.isReactNativeBrowser = isReactNativeEnv();
      exports5.default = isBrowser;
    }
  });

  // node_modules/fast-unique-numbers/build/es5/bundle.js
  var require_bundle = __commonJS({
    "node_modules/fast-unique-numbers/build/es5/bundle.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      (function(global2, factory) {
        typeof exports5 === "object" && typeof module !== "undefined" ? factory(exports5) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.fastUniqueNumbers = {}));
      })(exports5, function(exports6) {
        "use strict";
        var createAddUniqueNumber = function createAddUniqueNumber2(generateUniqueNumber2) {
          return function(set) {
            var number = generateUniqueNumber2(set);
            set.add(number);
            return number;
          };
        };
        var createCache = function createCache2(lastNumberWeakMap) {
          return function(collection, nextNumber) {
            lastNumberWeakMap.set(collection, nextNumber);
            return nextNumber;
          };
        };
        var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER === void 0 ? 9007199254740991 : Number.MAX_SAFE_INTEGER;
        var TWO_TO_THE_POWER_OF_TWENTY_NINE = 536870912;
        var TWO_TO_THE_POWER_OF_THIRTY = TWO_TO_THE_POWER_OF_TWENTY_NINE * 2;
        var createGenerateUniqueNumber = function createGenerateUniqueNumber2(cache2, lastNumberWeakMap) {
          return function(collection) {
            var lastNumber = lastNumberWeakMap.get(collection);
            var nextNumber = lastNumber === void 0 ? collection.size : lastNumber < TWO_TO_THE_POWER_OF_THIRTY ? lastNumber + 1 : 0;
            if (!collection.has(nextNumber)) {
              return cache2(collection, nextNumber);
            }
            if (collection.size < TWO_TO_THE_POWER_OF_TWENTY_NINE) {
              while (collection.has(nextNumber)) {
                nextNumber = Math.floor(Math.random() * TWO_TO_THE_POWER_OF_THIRTY);
              }
              return cache2(collection, nextNumber);
            }
            if (collection.size > MAX_SAFE_INTEGER) {
              throw new Error("Congratulations, you created a collection of unique numbers which uses all available integers!");
            }
            while (collection.has(nextNumber)) {
              nextNumber = Math.floor(Math.random() * MAX_SAFE_INTEGER);
            }
            return cache2(collection, nextNumber);
          };
        };
        var LAST_NUMBER_WEAK_MAP = /* @__PURE__ */ new WeakMap();
        var cache = createCache(LAST_NUMBER_WEAK_MAP);
        var generateUniqueNumber = createGenerateUniqueNumber(cache, LAST_NUMBER_WEAK_MAP);
        var addUniqueNumber = createAddUniqueNumber(generateUniqueNumber);
        exports6.addUniqueNumber = addUniqueNumber;
        exports6.generateUniqueNumber = generateUniqueNumber;
      });
    }
  });

  // node_modules/worker-timers-broker/build/es5/bundle.js
  var require_bundle2 = __commonJS({
    "node_modules/worker-timers-broker/build/es5/bundle.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      (function(global2, factory) {
        typeof exports5 === "object" && typeof module !== "undefined" ? factory(exports5, require_bundle()) : typeof define === "function" && define.amd ? define(["exports", "fast-unique-numbers"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.workerTimersBroker = {}, global2.fastUniqueNumbers));
      })(exports5, function(exports6, fastUniqueNumbers) {
        "use strict";
        var isCallNotification = function isCallNotification2(message) {
          return message.method !== void 0 && message.method === "call";
        };
        var isClearResponse = function isClearResponse2(message) {
          return message.error === null && typeof message.id === "number";
        };
        var load = function load2(url) {
          var scheduledIntervalFunctions = /* @__PURE__ */ new Map([[0, function() {
          }]]);
          var scheduledTimeoutFunctions = /* @__PURE__ */ new Map([[0, function() {
          }]]);
          var unrespondedRequests = /* @__PURE__ */ new Map();
          var worker = new Worker(url);
          worker.addEventListener("message", function(_ref) {
            var data = _ref.data;
            if (isCallNotification(data)) {
              var _data$params = data.params, timerId = _data$params.timerId, timerType = _data$params.timerType;
              if (timerType === "interval") {
                var idOrFunc = scheduledIntervalFunctions.get(timerId);
                if (typeof idOrFunc === "number") {
                  var timerIdAndTimerType = unrespondedRequests.get(idOrFunc);
                  if (timerIdAndTimerType === void 0 || timerIdAndTimerType.timerId !== timerId || timerIdAndTimerType.timerType !== timerType) {
                    throw new Error("The timer is in an undefined state.");
                  }
                } else if (typeof idOrFunc !== "undefined") {
                  idOrFunc();
                } else {
                  throw new Error("The timer is in an undefined state.");
                }
              } else if (timerType === "timeout") {
                var _idOrFunc = scheduledTimeoutFunctions.get(timerId);
                if (typeof _idOrFunc === "number") {
                  var _timerIdAndTimerType = unrespondedRequests.get(_idOrFunc);
                  if (_timerIdAndTimerType === void 0 || _timerIdAndTimerType.timerId !== timerId || _timerIdAndTimerType.timerType !== timerType) {
                    throw new Error("The timer is in an undefined state.");
                  }
                } else if (typeof _idOrFunc !== "undefined") {
                  _idOrFunc();
                  scheduledTimeoutFunctions["delete"](timerId);
                } else {
                  throw new Error("The timer is in an undefined state.");
                }
              }
            } else if (isClearResponse(data)) {
              var id = data.id;
              var _timerIdAndTimerType2 = unrespondedRequests.get(id);
              if (_timerIdAndTimerType2 === void 0) {
                throw new Error("The timer is in an undefined state.");
              }
              var _timerId = _timerIdAndTimerType2.timerId, _timerType = _timerIdAndTimerType2.timerType;
              unrespondedRequests["delete"](id);
              if (_timerType === "interval") {
                scheduledIntervalFunctions["delete"](_timerId);
              } else {
                scheduledTimeoutFunctions["delete"](_timerId);
              }
            } else {
              var message = data.error.message;
              throw new Error(message);
            }
          });
          var clearInterval2 = function clearInterval3(timerId) {
            var id = fastUniqueNumbers.generateUniqueNumber(unrespondedRequests);
            unrespondedRequests.set(id, {
              timerId,
              timerType: "interval"
            });
            scheduledIntervalFunctions.set(timerId, id);
            worker.postMessage({
              id,
              method: "clear",
              params: {
                timerId,
                timerType: "interval"
              }
            });
          };
          var clearTimeout2 = function clearTimeout3(timerId) {
            var id = fastUniqueNumbers.generateUniqueNumber(unrespondedRequests);
            unrespondedRequests.set(id, {
              timerId,
              timerType: "timeout"
            });
            scheduledTimeoutFunctions.set(timerId, id);
            worker.postMessage({
              id,
              method: "clear",
              params: {
                timerId,
                timerType: "timeout"
              }
            });
          };
          var setInterval2 = function setInterval3(func) {
            var delay = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
            var timerId = fastUniqueNumbers.generateUniqueNumber(scheduledIntervalFunctions);
            scheduledIntervalFunctions.set(timerId, function() {
              func();
              if (typeof scheduledIntervalFunctions.get(timerId) === "function") {
                worker.postMessage({
                  id: null,
                  method: "set",
                  params: {
                    delay,
                    now: performance.now(),
                    timerId,
                    timerType: "interval"
                  }
                });
              }
            });
            worker.postMessage({
              id: null,
              method: "set",
              params: {
                delay,
                now: performance.now(),
                timerId,
                timerType: "interval"
              }
            });
            return timerId;
          };
          var setTimeout2 = function setTimeout3(func) {
            var delay = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
            var timerId = fastUniqueNumbers.generateUniqueNumber(scheduledTimeoutFunctions);
            scheduledTimeoutFunctions.set(timerId, func);
            worker.postMessage({
              id: null,
              method: "set",
              params: {
                delay,
                now: performance.now(),
                timerId,
                timerType: "timeout"
              }
            });
            return timerId;
          };
          return {
            clearInterval: clearInterval2,
            clearTimeout: clearTimeout2,
            setInterval: setInterval2,
            setTimeout: setTimeout2
          };
        };
        exports6.load = load;
      });
    }
  });

  // node_modules/worker-timers/build/es5/bundle.js
  var require_bundle3 = __commonJS({
    "node_modules/worker-timers/build/es5/bundle.js"(exports5, module) {
      init_buffer2();
      init_process2();
      init_navigator();
      (function(global2, factory) {
        typeof exports5 === "object" && typeof module !== "undefined" ? factory(exports5, require_bundle2()) : typeof define === "function" && define.amd ? define(["exports", "worker-timers-broker"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.workerTimers = {}, global2.workerTimersBroker));
      })(exports5, function(exports6, workerTimersBroker) {
        "use strict";
        var createLoadOrReturnBroker = function createLoadOrReturnBroker2(loadBroker, worker2) {
          var broker = null;
          return function() {
            if (broker !== null) {
              return broker;
            }
            var blob = new Blob([worker2], {
              type: "application/javascript; charset=utf-8"
            });
            var url = URL.createObjectURL(blob);
            broker = loadBroker(url);
            setTimeout(function() {
              return URL.revokeObjectURL(url);
            });
            return broker;
          };
        };
        var worker = `(()=>{var e={472:(e,t,r)=>{var o,i;void 0===(i="function"==typeof(o=function(){"use strict";var e=new Map,t=new Map,r=function(t){var r=e.get(t);if(void 0===r)throw new Error('There is no interval scheduled with the given id "'.concat(t,'".'));clearTimeout(r),e.delete(t)},o=function(e){var r=t.get(e);if(void 0===r)throw new Error('There is no timeout scheduled with the given id "'.concat(e,'".'));clearTimeout(r),t.delete(e)},i=function(e,t){var r,o=performance.now();return{expected:o+(r=e-Math.max(0,o-t)),remainingDelay:r}},n=function e(t,r,o,i){var n=performance.now();n>o?postMessage({id:null,method:"call",params:{timerId:r,timerType:i}}):t.set(r,setTimeout(e,o-n,t,r,o,i))},a=function(t,r,o){var a=i(t,o),s=a.expected,d=a.remainingDelay;e.set(r,setTimeout(n,d,e,r,s,"interval"))},s=function(e,r,o){var a=i(e,o),s=a.expected,d=a.remainingDelay;t.set(r,setTimeout(n,d,t,r,s,"timeout"))};addEventListener("message",(function(e){var t=e.data;try{if("clear"===t.method){var i=t.id,n=t.params,d=n.timerId,c=n.timerType;if("interval"===c)r(d),postMessage({error:null,id:i});else{if("timeout"!==c)throw new Error('The given type "'.concat(c,'" is not supported'));o(d),postMessage({error:null,id:i})}}else{if("set"!==t.method)throw new Error('The given method "'.concat(t.method,'" is not supported'));var u=t.params,l=u.delay,p=u.now,m=u.timerId,v=u.timerType;if("interval"===v)a(l,m,p);else{if("timeout"!==v)throw new Error('The given type "'.concat(v,'" is not supported'));s(l,m,p)}}}catch(e){postMessage({error:{message:e.message},id:t.id,result:null})}}))})?o.call(t,r,t,e):o)||(e.exports=i)}},t={};function r(o){var i=t[o];if(void 0!==i)return i.exports;var n=t[o]={exports:{}};return e[o](n,n.exports,r),n.exports}r.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return r.d(t,{a:t}),t},r.d=(e,t)=>{for(var o in t)r.o(t,o)&&!r.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:t[o]})},r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{"use strict";r(472)})()})();`;
        var loadOrReturnBroker = createLoadOrReturnBroker(workerTimersBroker.load, worker);
        var clearInterval2 = function clearInterval3(timerId) {
          return loadOrReturnBroker().clearInterval(timerId);
        };
        var clearTimeout2 = function clearTimeout3(timerId) {
          return loadOrReturnBroker().clearTimeout(timerId);
        };
        var setInterval2 = function setInterval3() {
          var _loadOrReturnBroker;
          return (_loadOrReturnBroker = loadOrReturnBroker()).setInterval.apply(_loadOrReturnBroker, arguments);
        };
        var setTimeout$1 = function setTimeout2() {
          var _loadOrReturnBroker2;
          return (_loadOrReturnBroker2 = loadOrReturnBroker()).setTimeout.apply(_loadOrReturnBroker2, arguments);
        };
        exports6.clearInterval = clearInterval2;
        exports6.clearTimeout = clearTimeout2;
        exports6.setInterval = setInterval2;
        exports6.setTimeout = setTimeout$1;
      });
    }
  });

  // build/lib/get-timer.js
  var require_get_timer = __commonJS({
    "build/lib/get-timer.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __createBinding = exports5 && exports5.__createBinding || (Object.create ? function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        var desc = Object.getOwnPropertyDescriptor(m4, k2);
        if (!desc || ("get" in desc ? !m4.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m4[k2];
          } };
        }
        Object.defineProperty(o7, k22, desc);
      } : function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        o7[k22] = m4[k2];
      });
      var __setModuleDefault = exports5 && exports5.__setModuleDefault || (Object.create ? function(o7, v4) {
        Object.defineProperty(o7, "default", { enumerable: true, value: v4 });
      } : function(o7, v4) {
        o7["default"] = v4;
      });
      var __importStar = exports5 && exports5.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k2 in mod)
            if (k2 !== "default" && Object.prototype.hasOwnProperty.call(mod, k2))
              __createBinding(result, mod, k2);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var is_browser_1 = __importStar(require_is_browser());
      var worker_timers_1 = require_bundle3();
      var workerTimer = {
        set: worker_timers_1.setInterval,
        clear: worker_timers_1.clearInterval
      };
      var nativeTimer = {
        set: (func, time) => setInterval(func, time),
        clear: (timerId) => clearInterval(timerId)
      };
      var getTimer = (variant) => {
        switch (variant) {
          case "native": {
            return nativeTimer;
          }
          case "worker": {
            return workerTimer;
          }
          case "auto":
          default: {
            return is_browser_1.default && !is_browser_1.isWebWorker && !is_browser_1.isReactNativeBrowser ? workerTimer : nativeTimer;
          }
        }
      };
      exports5.default = getTimer;
    }
  });

  // build/lib/KeepaliveManager.js
  var require_KeepaliveManager = __commonJS({
    "build/lib/KeepaliveManager.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var get_timer_1 = __importDefault(require_get_timer());
      var KeepaliveManager = class {
        get keepaliveTimeoutTimestamp() {
          return this._keepaliveTimeoutTimestamp;
        }
        get intervalEvery() {
          return this._intervalEvery;
        }
        get keepalive() {
          return this._keepalive;
        }
        constructor(client, variant) {
          this.destroyed = false;
          this.client = client;
          this.timer = (0, get_timer_1.default)(variant);
          this.setKeepalive(client.options.keepalive);
        }
        clear() {
          if (this.timerId) {
            this.timer.clear(this.timerId);
            this.timerId = null;
          }
        }
        setKeepalive(value) {
          value *= 1e3;
          if (isNaN(value) || value <= 0 || value > 2147483647) {
            throw new Error(`Keepalive value must be an integer between 0 and 2147483647. Provided value is ${value}`);
          }
          this._keepalive = value;
          this.reschedule();
          this.client["log"](`KeepaliveManager: set keepalive to ${value}ms`);
        }
        destroy() {
          this.clear();
          this.destroyed = true;
        }
        reschedule() {
          if (this.destroyed) {
            return;
          }
          this.clear();
          this.counter = 0;
          const keepAliveTimeout = Math.ceil(this._keepalive * 1.5);
          this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout;
          this._intervalEvery = Math.ceil(this._keepalive / 2);
          this.timerId = this.timer.set(() => {
            if (this.destroyed) {
              return;
            }
            this.counter += 1;
            if (this.counter === 2) {
              this.client.sendPing();
            } else if (this.counter > 2) {
              this.client.onKeepaliveTimeout();
            }
          }, this._intervalEvery);
        }
      };
      exports5.default = KeepaliveManager;
    }
  });

  // build/lib/client.js
  var require_client = __commonJS({
    "build/lib/client.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __createBinding = exports5 && exports5.__createBinding || (Object.create ? function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        var desc = Object.getOwnPropertyDescriptor(m4, k2);
        if (!desc || ("get" in desc ? !m4.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m4[k2];
          } };
        }
        Object.defineProperty(o7, k22, desc);
      } : function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        o7[k22] = m4[k2];
      });
      var __setModuleDefault = exports5 && exports5.__setModuleDefault || (Object.create ? function(o7, v4) {
        Object.defineProperty(o7, "default", { enumerable: true, value: v4 });
      } : function(o7, v4) {
        o7["default"] = v4;
      });
      var __importStar = exports5 && exports5.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k2 in mod)
            if (k2 !== "default" && Object.prototype.hasOwnProperty.call(mod, k2))
              __createBinding(result, mod, k2);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var topic_alias_recv_1 = __importDefault(require_topic_alias_recv());
      var mqtt_packet_1 = __importDefault(require_mqtt());
      var default_message_id_provider_1 = __importDefault(require_default_message_id_provider());
      var readable_stream_1 = require_browser3();
      var default_1 = __importDefault(require_default());
      var validations = __importStar(require_validations());
      var debug_1 = __importDefault(require_browser4());
      var store_1 = __importDefault(require_store());
      var handlers_1 = __importDefault(require_handlers());
      var shared_1 = require_shared();
      var TypedEmitter_1 = require_TypedEmitter();
      var KeepaliveManager_1 = __importDefault(require_KeepaliveManager());
      var is_browser_1 = __importStar(require_is_browser());
      var setImmediate2 = globalThis.setImmediate || ((...args) => {
        const callback = args.shift();
        (0, shared_1.nextTick)(() => {
          callback(...args);
        });
      });
      var defaultConnectOptions = {
        keepalive: 60,
        reschedulePings: true,
        protocolId: "MQTT",
        protocolVersion: 4,
        reconnectPeriod: 1e3,
        connectTimeout: 30 * 1e3,
        clean: true,
        resubscribe: true,
        writeCache: true,
        timerVariant: "auto"
      };
      var MqttClient = class _MqttClient extends TypedEmitter_1.TypedEventEmitter {
        static defaultId() {
          return `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
        }
        constructor(streamBuilder, options) {
          super();
          this.options = options || {};
          for (const k2 in defaultConnectOptions) {
            if (typeof this.options[k2] === "undefined") {
              this.options[k2] = defaultConnectOptions[k2];
            } else {
              this.options[k2] = options[k2];
            }
          }
          this.log = this.options.log || (0, debug_1.default)("mqttjs:client");
          this.noop = this._noop.bind(this);
          this.log("MqttClient :: version:", _MqttClient.VERSION);
          if (is_browser_1.isWebWorker) {
            this.log("MqttClient :: environment", "webworker");
          } else {
            this.log("MqttClient :: environment", is_browser_1.default ? "browser" : "node");
          }
          this.log("MqttClient :: options.protocol", options.protocol);
          this.log("MqttClient :: options.protocolVersion", options.protocolVersion);
          this.log("MqttClient :: options.username", options.username);
          this.log("MqttClient :: options.keepalive", options.keepalive);
          this.log("MqttClient :: options.reconnectPeriod", options.reconnectPeriod);
          this.log("MqttClient :: options.rejectUnauthorized", options.rejectUnauthorized);
          this.log("MqttClient :: options.properties.topicAliasMaximum", options.properties ? options.properties.topicAliasMaximum : void 0);
          this.options.clientId = typeof options.clientId === "string" ? options.clientId : _MqttClient.defaultId();
          this.log("MqttClient :: clientId", this.options.clientId);
          this.options.customHandleAcks = options.protocolVersion === 5 && options.customHandleAcks ? options.customHandleAcks : (...args) => {
            args[3](null, 0);
          };
          if (!this.options.writeCache) {
            mqtt_packet_1.default.writeToStream.cacheNumbers = false;
          }
          this.streamBuilder = streamBuilder;
          this.messageIdProvider = typeof this.options.messageIdProvider === "undefined" ? new default_message_id_provider_1.default() : this.options.messageIdProvider;
          this.outgoingStore = options.outgoingStore || new store_1.default();
          this.incomingStore = options.incomingStore || new store_1.default();
          this.queueQoSZero = options.queueQoSZero === void 0 ? true : options.queueQoSZero;
          this._resubscribeTopics = {};
          this.messageIdToTopic = {};
          this.keepaliveManager = null;
          this.connected = false;
          this.disconnecting = false;
          this.reconnecting = false;
          this.queue = [];
          this.connackTimer = null;
          this.reconnectTimer = null;
          this._storeProcessing = false;
          this._packetIdsDuringStoreProcessing = {};
          this._storeProcessingQueue = [];
          this.outgoing = {};
          this._firstConnection = true;
          if (options.properties && options.properties.topicAliasMaximum > 0) {
            if (options.properties.topicAliasMaximum > 65535) {
              this.log("MqttClient :: options.properties.topicAliasMaximum is out of range");
            } else {
              this.topicAliasRecv = new topic_alias_recv_1.default(options.properties.topicAliasMaximum);
            }
          }
          this.on("connect", () => {
            const { queue: queue2 } = this;
            const deliver = () => {
              const entry = queue2.shift();
              this.log("deliver :: entry %o", entry);
              let packet = null;
              if (!entry) {
                this._resubscribe();
                return;
              }
              packet = entry.packet;
              this.log("deliver :: call _sendPacket for %o", packet);
              let send = true;
              if (packet.messageId && packet.messageId !== 0) {
                if (!this.messageIdProvider.register(packet.messageId)) {
                  send = false;
                }
              }
              if (send) {
                this._sendPacket(packet, (err) => {
                  if (entry.cb) {
                    entry.cb(err);
                  }
                  deliver();
                });
              } else {
                this.log("messageId: %d has already used. The message is skipped and removed.", packet.messageId);
                deliver();
              }
            };
            this.log("connect :: sending queued packets");
            deliver();
          });
          this.on("close", () => {
            this.log("close :: connected set to `false`");
            this.connected = false;
            this.log("close :: clearing connackTimer");
            clearTimeout(this.connackTimer);
            this._destroyKeepaliveManager();
            if (this.topicAliasRecv) {
              this.topicAliasRecv.clear();
            }
            this.log("close :: calling _setupReconnect");
            this._setupReconnect();
          });
          if (!this.options.manualConnect) {
            this.log("MqttClient :: setting up stream");
            this.connect();
          }
        }
        handleAuth(packet, callback) {
          callback();
        }
        handleMessage(packet, callback) {
          callback();
        }
        _nextId() {
          return this.messageIdProvider.allocate();
        }
        getLastMessageId() {
          return this.messageIdProvider.getLastAllocated();
        }
        connect() {
          var _a;
          const writable = new readable_stream_1.Writable();
          const parser = mqtt_packet_1.default.parser(this.options);
          let completeParse = null;
          const packets = [];
          this.log("connect :: calling method to clear reconnect");
          this._clearReconnect();
          this.log("connect :: using streamBuilder provided to client to create stream");
          this.stream = this.streamBuilder(this);
          parser.on("packet", (packet) => {
            this.log("parser :: on packet push to packets array.");
            packets.push(packet);
          });
          const work = () => {
            this.log("work :: getting next packet in queue");
            const packet = packets.shift();
            if (packet) {
              this.log("work :: packet pulled from queue");
              (0, handlers_1.default)(this, packet, nextTickWork);
            } else {
              this.log("work :: no packets in queue");
              const done = completeParse;
              completeParse = null;
              this.log("work :: done flag is %s", !!done);
              if (done)
                done();
            }
          };
          const nextTickWork = () => {
            if (packets.length) {
              (0, shared_1.nextTick)(work);
            } else {
              const done = completeParse;
              completeParse = null;
              done();
            }
          };
          writable._write = (buf, enc, done) => {
            completeParse = done;
            this.log("writable stream :: parsing buffer");
            parser.parse(buf);
            work();
          };
          const streamErrorHandler = (error) => {
            this.log("streamErrorHandler :: error", error.message);
            if (error.code) {
              this.log("streamErrorHandler :: emitting error");
              this.emit("error", error);
            } else {
              this.noop(error);
            }
          };
          this.log("connect :: pipe stream to writable stream");
          this.stream.pipe(writable);
          this.stream.on("error", streamErrorHandler);
          this.stream.on("close", () => {
            this.log("(%s)stream :: on close", this.options.clientId);
            this._flushVolatile();
            this.log("stream: emit close to MqttClient");
            this.emit("close");
          });
          this.log("connect: sending packet `connect`");
          const connectPacket = {
            cmd: "connect",
            protocolId: this.options.protocolId,
            protocolVersion: this.options.protocolVersion,
            clean: this.options.clean,
            clientId: this.options.clientId,
            keepalive: this.options.keepalive,
            username: this.options.username,
            password: this.options.password,
            properties: this.options.properties
          };
          if (this.options.will) {
            connectPacket.will = Object.assign(Object.assign({}, this.options.will), { payload: (_a = this.options.will) === null || _a === void 0 ? void 0 : _a.payload });
          }
          if (this.topicAliasRecv) {
            if (!connectPacket.properties) {
              connectPacket.properties = {};
            }
            if (this.topicAliasRecv) {
              connectPacket.properties.topicAliasMaximum = this.topicAliasRecv.max;
            }
          }
          this._writePacket(connectPacket);
          parser.on("error", this.emit.bind(this, "error"));
          if (this.options.properties) {
            if (!this.options.properties.authenticationMethod && this.options.properties.authenticationData) {
              this.end(() => this.emit("error", new Error("Packet has no Authentication Method")));
              return this;
            }
            if (this.options.properties.authenticationMethod && this.options.authPacket && typeof this.options.authPacket === "object") {
              const authPacket = Object.assign({ cmd: "auth", reasonCode: 0 }, this.options.authPacket);
              this._writePacket(authPacket);
            }
          }
          this.stream.setMaxListeners(1e3);
          clearTimeout(this.connackTimer);
          this.connackTimer = setTimeout(() => {
            this.log("!!connectTimeout hit!! Calling _cleanUp with force `true`");
            this.emit("error", new Error("connack timeout"));
            this._cleanUp(true);
          }, this.options.connectTimeout);
          return this;
        }
        publish(topic, message, opts, callback) {
          this.log("publish :: message `%s` to topic `%s`", message, topic);
          const { options } = this;
          if (typeof opts === "function") {
            callback = opts;
            opts = null;
          }
          opts = opts || {};
          const defaultOpts = {
            qos: 0,
            retain: false,
            dup: false
          };
          opts = Object.assign(Object.assign({}, defaultOpts), opts);
          const { qos, retain, dup, properties, cbStorePut } = opts;
          if (this._checkDisconnecting(callback)) {
            return this;
          }
          const publishProc = () => {
            let messageId = 0;
            if (qos === 1 || qos === 2) {
              messageId = this._nextId();
              if (messageId === null) {
                this.log("No messageId left");
                return false;
              }
            }
            const packet = {
              cmd: "publish",
              topic,
              payload: message,
              qos,
              retain,
              messageId,
              dup
            };
            if (options.protocolVersion === 5) {
              packet.properties = properties;
            }
            this.log("publish :: qos", qos);
            switch (qos) {
              case 1:
              case 2:
                this.outgoing[packet.messageId] = {
                  volatile: false,
                  cb: callback || this.noop
                };
                this.log("MqttClient:publish: packet cmd: %s", packet.cmd);
                this._sendPacket(packet, void 0, cbStorePut);
                break;
              default:
                this.log("MqttClient:publish: packet cmd: %s", packet.cmd);
                this._sendPacket(packet, callback, cbStorePut);
                break;
            }
            return true;
          };
          if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !publishProc()) {
            this._storeProcessingQueue.push({
              invoke: publishProc,
              cbStorePut: opts.cbStorePut,
              callback
            });
          }
          return this;
        }
        publishAsync(topic, message, opts) {
          return new Promise((resolve2, reject) => {
            this.publish(topic, message, opts, (err, packet) => {
              if (err) {
                reject(err);
              } else {
                resolve2(packet);
              }
            });
          });
        }
        subscribe(topicObject, opts, callback) {
          const version2 = this.options.protocolVersion;
          if (typeof opts === "function") {
            callback = opts;
          }
          callback = callback || this.noop;
          let resubscribe = false;
          let topicsList = [];
          if (typeof topicObject === "string") {
            topicObject = [topicObject];
            topicsList = topicObject;
          } else if (Array.isArray(topicObject)) {
            topicsList = topicObject;
          } else if (typeof topicObject === "object") {
            resubscribe = topicObject.resubscribe;
            delete topicObject.resubscribe;
            topicsList = Object.keys(topicObject);
          }
          const invalidTopic = validations.validateTopics(topicsList);
          if (invalidTopic !== null) {
            setImmediate2(callback, new Error(`Invalid topic ${invalidTopic}`));
            return this;
          }
          if (this._checkDisconnecting(callback)) {
            this.log("subscribe: discconecting true");
            return this;
          }
          const defaultOpts = {
            qos: 0
          };
          if (version2 === 5) {
            defaultOpts.nl = false;
            defaultOpts.rap = false;
            defaultOpts.rh = 0;
          }
          opts = Object.assign(Object.assign({}, defaultOpts), opts);
          const properties = opts.properties;
          const subs = [];
          const parseSub = (topic, subOptions) => {
            subOptions = subOptions || opts;
            if (!Object.prototype.hasOwnProperty.call(this._resubscribeTopics, topic) || this._resubscribeTopics[topic].qos < subOptions.qos || resubscribe) {
              const currentOpts = {
                topic,
                qos: subOptions.qos
              };
              if (version2 === 5) {
                currentOpts.nl = subOptions.nl;
                currentOpts.rap = subOptions.rap;
                currentOpts.rh = subOptions.rh;
                currentOpts.properties = properties;
              }
              this.log("subscribe: pushing topic `%s` and qos `%s` to subs list", currentOpts.topic, currentOpts.qos);
              subs.push(currentOpts);
            }
          };
          if (Array.isArray(topicObject)) {
            topicObject.forEach((topic) => {
              this.log("subscribe: array topic %s", topic);
              parseSub(topic);
            });
          } else {
            Object.keys(topicObject).forEach((topic) => {
              this.log("subscribe: object topic %s, %o", topic, topicObject[topic]);
              parseSub(topic, topicObject[topic]);
            });
          }
          if (!subs.length) {
            callback(null, []);
            return this;
          }
          const subscribeProc = () => {
            const messageId = this._nextId();
            if (messageId === null) {
              this.log("No messageId left");
              return false;
            }
            const packet = {
              cmd: "subscribe",
              subscriptions: subs,
              messageId
            };
            if (properties) {
              packet.properties = properties;
            }
            if (this.options.resubscribe) {
              this.log("subscribe :: resubscribe true");
              const topics = [];
              subs.forEach((sub) => {
                if (this.options.reconnectPeriod > 0) {
                  const topic = { qos: sub.qos };
                  if (version2 === 5) {
                    topic.nl = sub.nl || false;
                    topic.rap = sub.rap || false;
                    topic.rh = sub.rh || 0;
                    topic.properties = sub.properties;
                  }
                  this._resubscribeTopics[sub.topic] = topic;
                  topics.push(sub.topic);
                }
              });
              this.messageIdToTopic[packet.messageId] = topics;
            }
            this.outgoing[packet.messageId] = {
              volatile: true,
              cb(err, packet2) {
                if (!err) {
                  const { granted } = packet2;
                  for (let i6 = 0; i6 < granted.length; i6 += 1) {
                    subs[i6].qos = granted[i6];
                  }
                }
                callback(err, subs);
              }
            };
            this.log("subscribe :: call _sendPacket");
            this._sendPacket(packet);
            return true;
          };
          if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !subscribeProc()) {
            this._storeProcessingQueue.push({
              invoke: subscribeProc,
              callback
            });
          }
          return this;
        }
        subscribeAsync(topicObject, opts) {
          return new Promise((resolve2, reject) => {
            this.subscribe(topicObject, opts, (err, granted) => {
              if (err) {
                reject(err);
              } else {
                resolve2(granted);
              }
            });
          });
        }
        unsubscribe(topic, opts, callback) {
          if (typeof topic === "string") {
            topic = [topic];
          }
          if (typeof opts === "function") {
            callback = opts;
          }
          callback = callback || this.noop;
          const invalidTopic = validations.validateTopics(topic);
          if (invalidTopic !== null) {
            setImmediate2(callback, new Error(`Invalid topic ${invalidTopic}`));
            return this;
          }
          if (this._checkDisconnecting(callback)) {
            return this;
          }
          const unsubscribeProc = () => {
            const messageId = this._nextId();
            if (messageId === null) {
              this.log("No messageId left");
              return false;
            }
            const packet = {
              cmd: "unsubscribe",
              messageId,
              unsubscriptions: []
            };
            if (typeof topic === "string") {
              packet.unsubscriptions = [topic];
            } else if (Array.isArray(topic)) {
              packet.unsubscriptions = topic;
            }
            if (this.options.resubscribe) {
              packet.unsubscriptions.forEach((topic2) => {
                delete this._resubscribeTopics[topic2];
              });
            }
            if (typeof opts === "object" && opts.properties) {
              packet.properties = opts.properties;
            }
            this.outgoing[packet.messageId] = {
              volatile: true,
              cb: callback
            };
            this.log("unsubscribe: call _sendPacket");
            this._sendPacket(packet);
            return true;
          };
          if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !unsubscribeProc()) {
            this._storeProcessingQueue.push({
              invoke: unsubscribeProc,
              callback
            });
          }
          return this;
        }
        unsubscribeAsync(topic, opts) {
          return new Promise((resolve2, reject) => {
            this.unsubscribe(topic, opts, (err, packet) => {
              if (err) {
                reject(err);
              } else {
                resolve2(packet);
              }
            });
          });
        }
        end(force, opts, cb) {
          this.log("end :: (%s)", this.options.clientId);
          if (force == null || typeof force !== "boolean") {
            cb = cb || opts;
            opts = force;
            force = false;
          }
          if (typeof opts !== "object") {
            cb = cb || opts;
            opts = null;
          }
          this.log("end :: cb? %s", !!cb);
          if (!cb || typeof cb !== "function") {
            cb = this.noop;
          }
          const closeStores = () => {
            this.log("end :: closeStores: closing incoming and outgoing stores");
            this.disconnected = true;
            this.incomingStore.close((e1) => {
              this.outgoingStore.close((e22) => {
                this.log("end :: closeStores: emitting end");
                this.emit("end");
                if (cb) {
                  const err = e1 || e22;
                  this.log("end :: closeStores: invoking callback with args");
                  cb(err);
                }
              });
            });
            if (this._deferredReconnect) {
              this._deferredReconnect();
            }
          };
          const finish = () => {
            this.log("end :: (%s) :: finish :: calling _cleanUp with force %s", this.options.clientId, force);
            this._cleanUp(force, () => {
              this.log("end :: finish :: calling process.nextTick on closeStores");
              (0, shared_1.nextTick)(closeStores);
            }, opts);
          };
          if (this.disconnecting) {
            cb();
            return this;
          }
          this._clearReconnect();
          this.disconnecting = true;
          if (!force && Object.keys(this.outgoing).length > 0) {
            this.log("end :: (%s) :: calling finish in 10ms once outgoing is empty", this.options.clientId);
            this.once("outgoingEmpty", setTimeout.bind(null, finish, 10));
          } else {
            this.log("end :: (%s) :: immediately calling finish", this.options.clientId);
            finish();
          }
          return this;
        }
        endAsync(force, opts) {
          return new Promise((resolve2, reject) => {
            this.end(force, opts, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve2();
              }
            });
          });
        }
        removeOutgoingMessage(messageId) {
          if (this.outgoing[messageId]) {
            const { cb } = this.outgoing[messageId];
            this._removeOutgoingAndStoreMessage(messageId, () => {
              cb(new Error("Message removed"));
            });
          }
          return this;
        }
        reconnect(opts) {
          this.log("client reconnect");
          const f6 = () => {
            if (opts) {
              this.options.incomingStore = opts.incomingStore;
              this.options.outgoingStore = opts.outgoingStore;
            } else {
              this.options.incomingStore = null;
              this.options.outgoingStore = null;
            }
            this.incomingStore = this.options.incomingStore || new store_1.default();
            this.outgoingStore = this.options.outgoingStore || new store_1.default();
            this.disconnecting = false;
            this.disconnected = false;
            this._deferredReconnect = null;
            this._reconnect();
          };
          if (this.disconnecting && !this.disconnected) {
            this._deferredReconnect = f6;
          } else {
            f6();
          }
          return this;
        }
        _flushVolatile() {
          if (this.outgoing) {
            this.log("_flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function");
            Object.keys(this.outgoing).forEach((messageId) => {
              if (this.outgoing[messageId].volatile && typeof this.outgoing[messageId].cb === "function") {
                this.outgoing[messageId].cb(new Error("Connection closed"));
                delete this.outgoing[messageId];
              }
            });
          }
        }
        _flush() {
          if (this.outgoing) {
            this.log("_flush: queue exists? %b", !!this.outgoing);
            Object.keys(this.outgoing).forEach((messageId) => {
              if (typeof this.outgoing[messageId].cb === "function") {
                this.outgoing[messageId].cb(new Error("Connection closed"));
                delete this.outgoing[messageId];
              }
            });
          }
        }
        _removeTopicAliasAndRecoverTopicName(packet) {
          let alias;
          if (packet.properties) {
            alias = packet.properties.topicAlias;
          }
          let topic = packet.topic.toString();
          this.log("_removeTopicAliasAndRecoverTopicName :: alias %d, topic %o", alias, topic);
          if (topic.length === 0) {
            if (typeof alias === "undefined") {
              return new Error("Unregistered Topic Alias");
            }
            topic = this.topicAliasSend.getTopicByAlias(alias);
            if (typeof topic === "undefined") {
              return new Error("Unregistered Topic Alias");
            }
            packet.topic = topic;
          }
          if (alias) {
            delete packet.properties.topicAlias;
          }
        }
        _checkDisconnecting(callback) {
          if (this.disconnecting) {
            if (callback && callback !== this.noop) {
              callback(new Error("client disconnecting"));
            } else {
              this.emit("error", new Error("client disconnecting"));
            }
          }
          return this.disconnecting;
        }
        _reconnect() {
          this.log("_reconnect: emitting reconnect to client");
          this.emit("reconnect");
          if (this.connected) {
            this.end(() => {
              this.connect();
            });
            this.log("client already connected. disconnecting first.");
          } else {
            this.log("_reconnect: calling connect");
            this.connect();
          }
        }
        _setupReconnect() {
          if (!this.disconnecting && !this.reconnectTimer && this.options.reconnectPeriod > 0) {
            if (!this.reconnecting) {
              this.log("_setupReconnect :: emit `offline` state");
              this.emit("offline");
              this.log("_setupReconnect :: set `reconnecting` to `true`");
              this.reconnecting = true;
            }
            this.log("_setupReconnect :: setting reconnectTimer for %d ms", this.options.reconnectPeriod);
            this.reconnectTimer = setInterval(() => {
              this.log("reconnectTimer :: reconnect triggered!");
              this._reconnect();
            }, this.options.reconnectPeriod);
          } else {
            this.log("_setupReconnect :: doing nothing...");
          }
        }
        _clearReconnect() {
          this.log("_clearReconnect : clearing reconnect timer");
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        }
        _cleanUp(forced, done, opts = {}) {
          if (done) {
            this.log("_cleanUp :: done callback provided for on stream close");
            this.stream.on("close", done);
          }
          this.log("_cleanUp :: forced? %s", forced);
          if (forced) {
            if (this.options.reconnectPeriod === 0 && this.options.clean) {
              this._flush();
            }
            this.log("_cleanUp :: (%s) :: destroying stream", this.options.clientId);
            this.stream.destroy();
          } else {
            const packet = Object.assign({ cmd: "disconnect" }, opts);
            this.log("_cleanUp :: (%s) :: call _sendPacket with disconnect packet", this.options.clientId);
            this._sendPacket(packet, () => {
              this.log("_cleanUp :: (%s) :: destroying stream", this.options.clientId);
              setImmediate2(() => {
                this.stream.end(() => {
                  this.log("_cleanUp :: (%s) :: stream destroyed", this.options.clientId);
                });
              });
            });
          }
          if (!this.disconnecting && !this.reconnecting) {
            this.log("_cleanUp :: client not disconnecting/reconnecting. Clearing and resetting reconnect.");
            this._clearReconnect();
            this._setupReconnect();
          }
          this._destroyKeepaliveManager();
          if (done && !this.connected) {
            this.log("_cleanUp :: (%s) :: removing stream `done` callback `close` listener", this.options.clientId);
            this.stream.removeListener("close", done);
            done();
          }
        }
        _storeAndSend(packet, cb, cbStorePut) {
          this.log("storeAndSend :: store packet with cmd %s to outgoingStore", packet.cmd);
          let storePacket = packet;
          let err;
          if (storePacket.cmd === "publish") {
            storePacket = (0, default_1.default)(packet);
            err = this._removeTopicAliasAndRecoverTopicName(storePacket);
            if (err) {
              return cb && cb(err);
            }
          }
          this.outgoingStore.put(storePacket, (err2) => {
            if (err2) {
              return cb && cb(err2);
            }
            cbStorePut();
            this._writePacket(packet, cb);
          });
        }
        _applyTopicAlias(packet) {
          if (this.options.protocolVersion === 5) {
            if (packet.cmd === "publish") {
              let alias;
              if (packet.properties) {
                alias = packet.properties.topicAlias;
              }
              const topic = packet.topic.toString();
              if (this.topicAliasSend) {
                if (alias) {
                  if (topic.length !== 0) {
                    this.log("applyTopicAlias :: register topic: %s - alias: %d", topic, alias);
                    if (!this.topicAliasSend.put(topic, alias)) {
                      this.log("applyTopicAlias :: error out of range. topic: %s - alias: %d", topic, alias);
                      return new Error("Sending Topic Alias out of range");
                    }
                  }
                } else if (topic.length !== 0) {
                  if (this.options.autoAssignTopicAlias) {
                    alias = this.topicAliasSend.getAliasByTopic(topic);
                    if (alias) {
                      packet.topic = "";
                      packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                      this.log("applyTopicAlias :: auto assign(use) topic: %s - alias: %d", topic, alias);
                    } else {
                      alias = this.topicAliasSend.getLruAlias();
                      this.topicAliasSend.put(topic, alias);
                      packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                      this.log("applyTopicAlias :: auto assign topic: %s - alias: %d", topic, alias);
                    }
                  } else if (this.options.autoUseTopicAlias) {
                    alias = this.topicAliasSend.getAliasByTopic(topic);
                    if (alias) {
                      packet.topic = "";
                      packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                      this.log("applyTopicAlias :: auto use topic: %s - alias: %d", topic, alias);
                    }
                  }
                }
              } else if (alias) {
                this.log("applyTopicAlias :: error out of range. topic: %s - alias: %d", topic, alias);
                return new Error("Sending Topic Alias out of range");
              }
            }
          }
        }
        _noop(err) {
          this.log("noop ::", err);
        }
        _writePacket(packet, cb) {
          this.log("_writePacket :: packet: %O", packet);
          this.log("_writePacket :: emitting `packetsend`");
          this.emit("packetsend", packet);
          this.log("_writePacket :: writing to stream");
          const result = mqtt_packet_1.default.writeToStream(packet, this.stream, this.options);
          this.log("_writePacket :: writeToStream result %s", result);
          if (!result && cb && cb !== this.noop) {
            this.log("_writePacket :: handle events on `drain` once through callback.");
            this.stream.once("drain", cb);
          } else if (cb) {
            this.log("_writePacket :: invoking cb");
            cb();
          }
        }
        _sendPacket(packet, cb, cbStorePut, noStore) {
          this.log("_sendPacket :: (%s) ::  start", this.options.clientId);
          cbStorePut = cbStorePut || this.noop;
          cb = cb || this.noop;
          const err = this._applyTopicAlias(packet);
          if (err) {
            cb(err);
            return;
          }
          if (!this.connected) {
            if (packet.cmd === "auth") {
              this._writePacket(packet, cb);
              return;
            }
            this.log("_sendPacket :: client not connected. Storing packet offline.");
            this._storePacket(packet, cb, cbStorePut);
            return;
          }
          if (noStore) {
            this._writePacket(packet, cb);
            return;
          }
          switch (packet.cmd) {
            case "publish":
              break;
            case "pubrel":
              this._storeAndSend(packet, cb, cbStorePut);
              return;
            default:
              this._writePacket(packet, cb);
              return;
          }
          switch (packet.qos) {
            case 2:
            case 1:
              this._storeAndSend(packet, cb, cbStorePut);
              break;
            case 0:
            default:
              this._writePacket(packet, cb);
              break;
          }
          this.log("_sendPacket :: (%s) ::  end", this.options.clientId);
        }
        _storePacket(packet, cb, cbStorePut) {
          this.log("_storePacket :: packet: %o", packet);
          this.log("_storePacket :: cb? %s", !!cb);
          cbStorePut = cbStorePut || this.noop;
          let storePacket = packet;
          if (storePacket.cmd === "publish") {
            storePacket = (0, default_1.default)(packet);
            const err = this._removeTopicAliasAndRecoverTopicName(storePacket);
            if (err) {
              return cb && cb(err);
            }
          }
          const qos = storePacket.qos || 0;
          if (qos === 0 && this.queueQoSZero || storePacket.cmd !== "publish") {
            this.queue.push({ packet: storePacket, cb });
          } else if (qos > 0) {
            cb = this.outgoing[storePacket.messageId] ? this.outgoing[storePacket.messageId].cb : null;
            this.outgoingStore.put(storePacket, (err) => {
              if (err) {
                return cb && cb(err);
              }
              cbStorePut();
            });
          } else if (cb) {
            cb(new Error("No connection to broker"));
          }
        }
        _setupKeepaliveManager() {
          this.log("_setupKeepaliveManager :: keepalive %d (seconds)", this.options.keepalive);
          if (!this.keepaliveManager && this.options.keepalive) {
            this.keepaliveManager = new KeepaliveManager_1.default(this, this.options.timerVariant);
          }
        }
        _destroyKeepaliveManager() {
          if (this.keepaliveManager) {
            this.log("_destroyKeepaliveManager :: destroying keepalive manager");
            this.keepaliveManager.destroy();
            this.keepaliveManager = null;
          }
        }
        reschedulePing() {
          if (this.keepaliveManager && this.options.keepalive && this.options.reschedulePings) {
            this._reschedulePing();
          }
        }
        _reschedulePing() {
          this.log("_reschedulePing :: rescheduling ping");
          this.keepaliveManager.reschedule();
        }
        sendPing() {
          this.log("_sendPing :: sending pingreq");
          this._sendPacket({ cmd: "pingreq" });
        }
        onKeepaliveTimeout() {
          this.emit("error", new Error("Keepalive timeout"));
          this.log("onKeepaliveTimeout :: calling _cleanUp with force true");
          this._cleanUp(true);
        }
        _resubscribe() {
          this.log("_resubscribe");
          const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics);
          if (!this._firstConnection && (this.options.clean || this.options.protocolVersion >= 4 && !this.connackPacket.sessionPresent) && _resubscribeTopicsKeys.length > 0) {
            if (this.options.resubscribe) {
              if (this.options.protocolVersion === 5) {
                this.log("_resubscribe: protocolVersion 5");
                for (let topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
                  const resubscribeTopic = {};
                  resubscribeTopic[_resubscribeTopicsKeys[topicI]] = this._resubscribeTopics[_resubscribeTopicsKeys[topicI]];
                  resubscribeTopic.resubscribe = true;
                  this.subscribe(resubscribeTopic, {
                    properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]].properties
                  });
                }
              } else {
                this._resubscribeTopics.resubscribe = true;
                this.subscribe(this._resubscribeTopics);
              }
            } else {
              this._resubscribeTopics = {};
            }
          }
          this._firstConnection = false;
        }
        _onConnect(packet) {
          if (this.disconnected) {
            this.emit("connect", packet);
            return;
          }
          this.connackPacket = packet;
          this.messageIdProvider.clear();
          this._setupKeepaliveManager();
          this.connected = true;
          const startStreamProcess = () => {
            let outStore = this.outgoingStore.createStream();
            const remove = () => {
              outStore.destroy();
              outStore = null;
              this._flushStoreProcessingQueue();
              clearStoreProcessing();
            };
            const clearStoreProcessing = () => {
              this._storeProcessing = false;
              this._packetIdsDuringStoreProcessing = {};
            };
            this.once("close", remove);
            outStore.on("error", (err) => {
              clearStoreProcessing();
              this._flushStoreProcessingQueue();
              this.removeListener("close", remove);
              this.emit("error", err);
            });
            const storeDeliver = () => {
              if (!outStore) {
                return;
              }
              const packet2 = outStore.read(1);
              let cb;
              if (!packet2) {
                outStore.once("readable", storeDeliver);
                return;
              }
              this._storeProcessing = true;
              if (this._packetIdsDuringStoreProcessing[packet2.messageId]) {
                storeDeliver();
                return;
              }
              if (!this.disconnecting && !this.reconnectTimer) {
                cb = this.outgoing[packet2.messageId] ? this.outgoing[packet2.messageId].cb : null;
                this.outgoing[packet2.messageId] = {
                  volatile: false,
                  cb(err, status) {
                    if (cb) {
                      cb(err, status);
                    }
                    storeDeliver();
                  }
                };
                this._packetIdsDuringStoreProcessing[packet2.messageId] = true;
                if (this.messageIdProvider.register(packet2.messageId)) {
                  this._sendPacket(packet2, void 0, void 0, true);
                } else {
                  this.log("messageId: %d has already used.", packet2.messageId);
                }
              } else if (outStore.destroy) {
                outStore.destroy();
              }
            };
            outStore.on("end", () => {
              let allProcessed = true;
              for (const id in this._packetIdsDuringStoreProcessing) {
                if (!this._packetIdsDuringStoreProcessing[id]) {
                  allProcessed = false;
                  break;
                }
              }
              this.removeListener("close", remove);
              if (allProcessed) {
                clearStoreProcessing();
                this._invokeAllStoreProcessingQueue();
                this.emit("connect", packet);
              } else {
                startStreamProcess();
              }
            });
            storeDeliver();
          };
          startStreamProcess();
        }
        _invokeStoreProcessingQueue() {
          if (!this._storeProcessing && this._storeProcessingQueue.length > 0) {
            const f6 = this._storeProcessingQueue[0];
            if (f6 && f6.invoke()) {
              this._storeProcessingQueue.shift();
              return true;
            }
          }
          return false;
        }
        _invokeAllStoreProcessingQueue() {
          while (this._invokeStoreProcessingQueue()) {
          }
        }
        _flushStoreProcessingQueue() {
          for (const f6 of this._storeProcessingQueue) {
            if (f6.cbStorePut)
              f6.cbStorePut(new Error("Connection closed"));
            if (f6.callback)
              f6.callback(new Error("Connection closed"));
          }
          this._storeProcessingQueue.splice(0);
        }
        _removeOutgoingAndStoreMessage(messageId, cb) {
          delete this.outgoing[messageId];
          this.outgoingStore.del({ messageId }, (err, packet) => {
            cb(err, packet);
            this.messageIdProvider.deallocate(messageId);
            this._invokeStoreProcessingQueue();
          });
        }
      };
      MqttClient.VERSION = shared_1.MQTTJS_VERSION;
      exports5.default = MqttClient;
    }
  });

  // build/lib/unique-message-id-provider.js
  var require_unique_message_id_provider = __commonJS({
    "build/lib/unique-message-id-provider.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var number_allocator_1 = require_number_allocator2();
      var UniqueMessageIdProvider = class {
        constructor() {
          this.numberAllocator = new number_allocator_1.NumberAllocator(1, 65535);
        }
        allocate() {
          this.lastId = this.numberAllocator.alloc();
          return this.lastId;
        }
        getLastAllocated() {
          return this.lastId;
        }
        register(messageId) {
          return this.numberAllocator.use(messageId);
        }
        deallocate(messageId) {
          this.numberAllocator.free(messageId);
        }
        clear() {
          this.numberAllocator.clear();
        }
      };
      exports5.default = UniqueMessageIdProvider;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-924bb2e1.js
  function i3(t6) {
    throw new RangeError(r3[t6]);
  }
  function f3(t6, o7) {
    const n7 = t6.split("@");
    let r7 = "";
    n7.length > 1 && (r7 = n7[0] + "@", t6 = n7[1]);
    const c6 = function(t7, o8) {
      const n8 = [];
      let e7 = t7.length;
      for (; e7--; )
        n8[e7] = o8(t7[e7]);
      return n8;
    }((t6 = t6.replace(e3, ".")).split("."), o7).join(".");
    return r7 + c6;
  }
  function l3(t6) {
    const o7 = [];
    let n7 = 0;
    const e7 = t6.length;
    for (; n7 < e7; ) {
      const r7 = t6.charCodeAt(n7++);
      if (r7 >= 55296 && r7 <= 56319 && n7 < e7) {
        const e8 = t6.charCodeAt(n7++);
        56320 == (64512 & e8) ? o7.push(((1023 & r7) << 10) + (1023 & e8) + 65536) : (o7.push(r7), n7--);
      } else
        o7.push(r7);
    }
    return o7;
  }
  var t3, o3, n3, e3, r3, c3, s3, u3, a3, d2, h3, p3;
  var init_chunk_924bb2e1 = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-924bb2e1.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      t3 = 2147483647;
      o3 = /^xn--/;
      n3 = /[^\0-\x7E]/;
      e3 = /[\x2E\u3002\uFF0E\uFF61]/g;
      r3 = { overflow: "Overflow: input needs wider integers to process", "not-basic": "Illegal input >= 0x80 (not a basic code point)", "invalid-input": "Invalid input" };
      c3 = Math.floor;
      s3 = String.fromCharCode;
      u3 = function(t6, o7) {
        return t6 + 22 + 75 * (t6 < 26) - ((0 != o7) << 5);
      };
      a3 = function(t6, o7, n7) {
        let e7 = 0;
        for (t6 = n7 ? c3(t6 / 700) : t6 >> 1, t6 += c3(t6 / o7); t6 > 455; e7 += 36)
          t6 = c3(t6 / 35);
        return c3(e7 + 36 * t6 / (t6 + 38));
      };
      d2 = function(o7) {
        const n7 = [], e7 = o7.length;
        let r7 = 0, s5 = 128, f6 = 72, l6 = o7.lastIndexOf("-");
        l6 < 0 && (l6 = 0);
        for (let t6 = 0; t6 < l6; ++t6)
          o7.charCodeAt(t6) >= 128 && i3("not-basic"), n7.push(o7.charCodeAt(t6));
        for (let d4 = l6 > 0 ? l6 + 1 : 0; d4 < e7; ) {
          let l7 = r7;
          for (let n8 = 1, s6 = 36; ; s6 += 36) {
            d4 >= e7 && i3("invalid-input");
            const l8 = (u6 = o7.charCodeAt(d4++)) - 48 < 10 ? u6 - 22 : u6 - 65 < 26 ? u6 - 65 : u6 - 97 < 26 ? u6 - 97 : 36;
            (l8 >= 36 || l8 > c3((t3 - r7) / n8)) && i3("overflow"), r7 += l8 * n8;
            const a6 = s6 <= f6 ? 1 : s6 >= f6 + 26 ? 26 : s6 - f6;
            if (l8 < a6)
              break;
            const h7 = 36 - a6;
            n8 > c3(t3 / h7) && i3("overflow"), n8 *= h7;
          }
          const h6 = n7.length + 1;
          f6 = a3(r7 - l7, h6, 0 == l7), c3(r7 / h6) > t3 - s5 && i3("overflow"), s5 += c3(r7 / h6), r7 %= h6, n7.splice(r7++, 0, s5);
        }
        var u6;
        return String.fromCodePoint(...n7);
      };
      h3 = function(o7) {
        const n7 = [];
        let e7 = (o7 = l3(o7)).length, r7 = 128, f6 = 0, d4 = 72;
        for (const t6 of o7)
          t6 < 128 && n7.push(s3(t6));
        let h6 = n7.length, p6 = h6;
        for (h6 && n7.push("-"); p6 < e7; ) {
          let e8 = t3;
          for (const t6 of o7)
            t6 >= r7 && t6 < e8 && (e8 = t6);
          const l6 = p6 + 1;
          e8 - r7 > c3((t3 - f6) / l6) && i3("overflow"), f6 += (e8 - r7) * l6, r7 = e8;
          for (const e9 of o7)
            if (e9 < r7 && ++f6 > t3 && i3("overflow"), e9 == r7) {
              let t6 = f6;
              for (let o8 = 36; ; o8 += 36) {
                const e10 = o8 <= d4 ? 1 : o8 >= d4 + 26 ? 26 : o8 - d4;
                if (t6 < e10)
                  break;
                const r8 = t6 - e10, i6 = 36 - e10;
                n7.push(s3(u3(e10 + r8 % i6, 0))), t6 = c3(r8 / i6);
              }
              n7.push(s3(u3(t6, 0))), d4 = a3(f6, l6, p6 == h6), f6 = 0, ++p6;
            }
          ++f6, ++r7;
        }
        return n7.join("");
      };
      p3 = { version: "2.1.0", ucs2: { decode: l3, encode: (t6) => String.fromCodePoint(...t6) }, decode: d2, encode: h3, toASCII: function(t6) {
        return f3(t6, function(t7) {
          return n3.test(t7) ? "xn--" + h3(t7) : t7;
        });
      }, toUnicode: function(t6) {
        return f3(t6, function(t7) {
          return o3.test(t7) ? d2(t7.slice(4).toLowerCase()) : t7;
        });
      } };
      p3.decode;
      p3.encode;
      p3.toASCII;
      p3.toUnicode;
      p3.ucs2;
      p3.version;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-b04e620d.js
  function e4(e7, n7) {
    return Object.prototype.hasOwnProperty.call(e7, n7);
  }
  var n4, r4, t4, o4;
  var init_chunk_b04e620d = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-b04e620d.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      n4 = function(n7, r7, t6, o7) {
        r7 = r7 || "&", t6 = t6 || "=";
        var a6 = {};
        if ("string" != typeof n7 || 0 === n7.length)
          return a6;
        var u6 = /\+/g;
        n7 = n7.split(r7);
        var c6 = 1e3;
        o7 && "number" == typeof o7.maxKeys && (c6 = o7.maxKeys);
        var i6 = n7.length;
        c6 > 0 && i6 > c6 && (i6 = c6);
        for (var s5 = 0; s5 < i6; ++s5) {
          var p6, f6, d4, y4, m4 = n7[s5].replace(u6, "%20"), l6 = m4.indexOf(t6);
          l6 >= 0 ? (p6 = m4.substr(0, l6), f6 = m4.substr(l6 + 1)) : (p6 = m4, f6 = ""), d4 = decodeURIComponent(p6), y4 = decodeURIComponent(f6), e4(a6, d4) ? Array.isArray(a6[d4]) ? a6[d4].push(y4) : a6[d4] = [a6[d4], y4] : a6[d4] = y4;
        }
        return a6;
      };
      r4 = function(e7) {
        switch (typeof e7) {
          case "string":
            return e7;
          case "boolean":
            return e7 ? "true" : "false";
          case "number":
            return isFinite(e7) ? e7 : "";
          default:
            return "";
        }
      };
      t4 = function(e7, n7, t6, o7) {
        return n7 = n7 || "&", t6 = t6 || "=", null === e7 && (e7 = void 0), "object" == typeof e7 ? Object.keys(e7).map(function(o8) {
          var a6 = encodeURIComponent(r4(o8)) + t6;
          return Array.isArray(e7[o8]) ? e7[o8].map(function(e8) {
            return a6 + encodeURIComponent(r4(e8));
          }).join(n7) : a6 + encodeURIComponent(r4(e7[o8]));
        }).join(n7) : o7 ? encodeURIComponent(r4(o7)) + t6 + encodeURIComponent(r4(e7)) : "";
      };
      o4 = {};
      o4.decode = o4.parse = n4, o4.encode = o4.stringify = t4;
      o4.decode;
      o4.encode;
      o4.parse;
      o4.stringify;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-5decc758.js
  function i4() {
    throw new Error("setTimeout has not been defined");
  }
  function u4() {
    throw new Error("clearTimeout has not been defined");
  }
  function c4(e7) {
    if (t5 === setTimeout)
      return setTimeout(e7, 0);
    if ((t5 === i4 || !t5) && setTimeout)
      return t5 = setTimeout, setTimeout(e7, 0);
    try {
      return t5(e7, 0);
    } catch (n7) {
      try {
        return t5.call(null, e7, 0);
      } catch (n8) {
        return t5.call(this || r5, e7, 0);
      }
    }
  }
  function h4() {
    f4 && l4 && (f4 = false, l4.length ? s4 = l4.concat(s4) : a4 = -1, s4.length && d3());
  }
  function d3() {
    if (!f4) {
      var e7 = c4(h4);
      f4 = true;
      for (var t6 = s4.length; t6; ) {
        for (l4 = s4, s4 = []; ++a4 < t6; )
          l4 && l4[a4].run();
        a4 = -1, t6 = s4.length;
      }
      l4 = null, f4 = false, function(e8) {
        if (n5 === clearTimeout)
          return clearTimeout(e8);
        if ((n5 === u4 || !n5) && clearTimeout)
          return n5 = clearTimeout, clearTimeout(e8);
        try {
          n5(e8);
        } catch (t7) {
          try {
            return n5.call(null, e8);
          } catch (t8) {
            return n5.call(this || r5, e8);
          }
        }
      }(e7);
    }
  }
  function m2(e7, t6) {
    (this || r5).fun = e7, (this || r5).array = t6;
  }
  function p4() {
  }
  var e5, t5, n5, r5, o5, l4, s4, f4, a4, T2;
  var init_chunk_5decc758 = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-5decc758.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      r5 = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : global;
      o5 = e5 = {};
      !function() {
        try {
          t5 = "function" == typeof setTimeout ? setTimeout : i4;
        } catch (e7) {
          t5 = i4;
        }
        try {
          n5 = "function" == typeof clearTimeout ? clearTimeout : u4;
        } catch (e7) {
          n5 = u4;
        }
      }();
      s4 = [];
      f4 = false;
      a4 = -1;
      o5.nextTick = function(e7) {
        var t6 = new Array(arguments.length - 1);
        if (arguments.length > 1)
          for (var n7 = 1; n7 < arguments.length; n7++)
            t6[n7 - 1] = arguments[n7];
        s4.push(new m2(e7, t6)), 1 !== s4.length || f4 || c4(d3);
      }, m2.prototype.run = function() {
        (this || r5).fun.apply(null, (this || r5).array);
      }, o5.title = "browser", o5.browser = true, o5.env = {}, o5.argv = [], o5.version = "", o5.versions = {}, o5.on = p4, o5.addListener = p4, o5.once = p4, o5.off = p4, o5.removeListener = p4, o5.removeAllListeners = p4, o5.emit = p4, o5.prependListener = p4, o5.prependOnceListener = p4, o5.listeners = function(e7) {
        return [];
      }, o5.binding = function(e7) {
        throw new Error("process.binding is not supported");
      }, o5.cwd = function() {
        return "/";
      }, o5.chdir = function(e7) {
        throw new Error("process.chdir is not supported");
      }, o5.umask = function() {
        return 0;
      };
      T2 = e5;
      T2.addListener;
      T2.argv;
      T2.binding;
      T2.browser;
      T2.chdir;
      T2.cwd;
      T2.emit;
      T2.env;
      T2.listeners;
      T2.nextTick;
      T2.off;
      T2.on;
      T2.once;
      T2.prependListener;
      T2.prependOnceListener;
      T2.removeAllListeners;
      T2.removeListener;
      T2.title;
      T2.umask;
      T2.version;
      T2.versions;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-2eac56ff.js
  function dew2() {
    if (_dewExec2)
      return exports2;
    _dewExec2 = true;
    var process3 = exports2 = {};
    var cachedSetTimeout;
    var cachedClearTimeout;
    function defaultSetTimout() {
      throw new Error("setTimeout has not been defined");
    }
    function defaultClearTimeout() {
      throw new Error("clearTimeout has not been defined");
    }
    (function() {
      try {
        if (typeof setTimeout === "function") {
          cachedSetTimeout = setTimeout;
        } else {
          cachedSetTimeout = defaultSetTimout;
        }
      } catch (e7) {
        cachedSetTimeout = defaultSetTimout;
      }
      try {
        if (typeof clearTimeout === "function") {
          cachedClearTimeout = clearTimeout;
        } else {
          cachedClearTimeout = defaultClearTimeout;
        }
      } catch (e7) {
        cachedClearTimeout = defaultClearTimeout;
      }
    })();
    function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
        return setTimeout(fun, 0);
      }
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
      }
      try {
        return cachedSetTimeout(fun, 0);
      } catch (e7) {
        try {
          return cachedSetTimeout.call(null, fun, 0);
        } catch (e8) {
          return cachedSetTimeout.call(this || _global, fun, 0);
        }
      }
    }
    function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
        return clearTimeout(marker);
      }
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
      }
      try {
        return cachedClearTimeout(marker);
      } catch (e7) {
        try {
          return cachedClearTimeout.call(null, marker);
        } catch (e8) {
          return cachedClearTimeout.call(this || _global, marker);
        }
      }
    }
    var queue2 = [];
    var draining2 = false;
    var currentQueue2;
    var queueIndex2 = -1;
    function cleanUpNextTick2() {
      if (!draining2 || !currentQueue2) {
        return;
      }
      draining2 = false;
      if (currentQueue2.length) {
        queue2 = currentQueue2.concat(queue2);
      } else {
        queueIndex2 = -1;
      }
      if (queue2.length) {
        drainQueue2();
      }
    }
    function drainQueue2() {
      if (draining2) {
        return;
      }
      var timeout = runTimeout(cleanUpNextTick2);
      draining2 = true;
      var len = queue2.length;
      while (len) {
        currentQueue2 = queue2;
        queue2 = [];
        while (++queueIndex2 < len) {
          if (currentQueue2) {
            currentQueue2[queueIndex2].run();
          }
        }
        queueIndex2 = -1;
        len = queue2.length;
      }
      currentQueue2 = null;
      draining2 = false;
      runClearTimeout(timeout);
    }
    process3.nextTick = function(fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
        for (var i6 = 1; i6 < arguments.length; i6++) {
          args[i6 - 1] = arguments[i6];
        }
      }
      queue2.push(new Item2(fun, args));
      if (queue2.length === 1 && !draining2) {
        runTimeout(drainQueue2);
      }
    };
    function Item2(fun, array) {
      (this || _global).fun = fun;
      (this || _global).array = array;
    }
    Item2.prototype.run = function() {
      (this || _global).fun.apply(null, (this || _global).array);
    };
    process3.title = "browser";
    process3.browser = true;
    process3.env = {};
    process3.argv = [];
    process3.version = "";
    process3.versions = {};
    function noop2() {
    }
    process3.on = noop2;
    process3.addListener = noop2;
    process3.once = noop2;
    process3.off = noop2;
    process3.removeListener = noop2;
    process3.removeAllListeners = noop2;
    process3.emit = noop2;
    process3.prependListener = noop2;
    process3.prependOnceListener = noop2;
    process3.listeners = function(name2) {
      return [];
    };
    process3.binding = function(name2) {
      throw new Error("process.binding is not supported");
    };
    process3.cwd = function() {
      return "/";
    };
    process3.chdir = function(dir) {
      throw new Error("process.chdir is not supported");
    };
    process3.umask = function() {
      return 0;
    };
    return exports2;
  }
  var exports2, _dewExec2, _global, process2;
  var init_chunk_2eac56ff = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-2eac56ff.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      exports2 = {};
      _dewExec2 = false;
      _global = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
      process2 = dew2();
      process2.platform = "browser";
      process2.addListener;
      process2.argv;
      process2.binding;
      process2.browser;
      process2.chdir;
      process2.cwd;
      process2.emit;
      process2.env;
      process2.listeners;
      process2.nextTick;
      process2.off;
      process2.on;
      process2.once;
      process2.prependListener;
      process2.prependOnceListener;
      process2.removeAllListeners;
      process2.removeListener;
      process2.title;
      process2.umask;
      process2.version;
      process2.versions;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/chunk-23dbec7b.js
  function dew3() {
    if (_dewExec3)
      return exports$12;
    _dewExec3 = true;
    var process$1 = process2;
    function assertPath(path2) {
      if (typeof path2 !== "string") {
        throw new TypeError("Path must be a string. Received " + JSON.stringify(path2));
      }
    }
    function normalizeStringPosix(path2, allowAboveRoot) {
      var res = "";
      var lastSegmentLength = 0;
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i6 = 0; i6 <= path2.length; ++i6) {
        if (i6 < path2.length)
          code = path2.charCodeAt(i6);
        else if (code === 47)
          break;
        else
          code = 47;
        if (code === 47) {
          if (lastSlash === i6 - 1 || dots === 1)
            ;
          else if (lastSlash !== i6 - 1 && dots === 2) {
            if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
              if (res.length > 2) {
                var lastSlashIndex = res.lastIndexOf("/");
                if (lastSlashIndex !== res.length - 1) {
                  if (lastSlashIndex === -1) {
                    res = "";
                    lastSegmentLength = 0;
                  } else {
                    res = res.slice(0, lastSlashIndex);
                    lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                  }
                  lastSlash = i6;
                  dots = 0;
                  continue;
                }
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i6;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0)
                res += "/..";
              else
                res = "..";
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0)
              res += "/" + path2.slice(lastSlash + 1, i6);
            else
              res = path2.slice(lastSlash + 1, i6);
            lastSegmentLength = i6 - lastSlash - 1;
          }
          lastSlash = i6;
          dots = 0;
        } else if (code === 46 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format(sep, pathObject) {
      var dir = pathObject.dir || pathObject.root;
      var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    var posix = {
      // path.resolve([from ...], to)
      resolve: function resolve2() {
        var resolvedPath = "";
        var resolvedAbsolute = false;
        var cwd2;
        for (var i6 = arguments.length - 1; i6 >= -1 && !resolvedAbsolute; i6--) {
          var path2;
          if (i6 >= 0)
            path2 = arguments[i6];
          else {
            if (cwd2 === void 0)
              cwd2 = process$1.cwd();
            path2 = cwd2;
          }
          assertPath(path2);
          if (path2.length === 0) {
            continue;
          }
          resolvedPath = path2 + "/" + resolvedPath;
          resolvedAbsolute = path2.charCodeAt(0) === 47;
        }
        resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
        if (resolvedAbsolute) {
          if (resolvedPath.length > 0)
            return "/" + resolvedPath;
          else
            return "/";
        } else if (resolvedPath.length > 0) {
          return resolvedPath;
        } else {
          return ".";
        }
      },
      normalize: function normalize(path2) {
        assertPath(path2);
        if (path2.length === 0)
          return ".";
        var isAbsolute = path2.charCodeAt(0) === 47;
        var trailingSeparator = path2.charCodeAt(path2.length - 1) === 47;
        path2 = normalizeStringPosix(path2, !isAbsolute);
        if (path2.length === 0 && !isAbsolute)
          path2 = ".";
        if (path2.length > 0 && trailingSeparator)
          path2 += "/";
        if (isAbsolute)
          return "/" + path2;
        return path2;
      },
      isAbsolute: function isAbsolute(path2) {
        assertPath(path2);
        return path2.length > 0 && path2.charCodeAt(0) === 47;
      },
      join: function join() {
        if (arguments.length === 0)
          return ".";
        var joined;
        for (var i6 = 0; i6 < arguments.length; ++i6) {
          var arg = arguments[i6];
          assertPath(arg);
          if (arg.length > 0) {
            if (joined === void 0)
              joined = arg;
            else
              joined += "/" + arg;
          }
        }
        if (joined === void 0)
          return ".";
        return posix.normalize(joined);
      },
      relative: function relative(from, to) {
        assertPath(from);
        assertPath(to);
        if (from === to)
          return "";
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to)
          return "";
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart) {
          if (from.charCodeAt(fromStart) !== 47)
            break;
        }
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        var toStart = 1;
        for (; toStart < to.length; ++toStart) {
          if (to.charCodeAt(toStart) !== 47)
            break;
        }
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i6 = 0;
        for (; i6 <= length; ++i6) {
          if (i6 === length) {
            if (toLen > length) {
              if (to.charCodeAt(toStart + i6) === 47) {
                return to.slice(toStart + i6 + 1);
              } else if (i6 === 0) {
                return to.slice(toStart + i6);
              }
            } else if (fromLen > length) {
              if (from.charCodeAt(fromStart + i6) === 47) {
                lastCommonSep = i6;
              } else if (i6 === 0) {
                lastCommonSep = 0;
              }
            }
            break;
          }
          var fromCode = from.charCodeAt(fromStart + i6);
          var toCode = to.charCodeAt(toStart + i6);
          if (fromCode !== toCode)
            break;
          else if (fromCode === 47)
            lastCommonSep = i6;
        }
        var out = "";
        for (i6 = fromStart + lastCommonSep + 1; i6 <= fromEnd; ++i6) {
          if (i6 === fromEnd || from.charCodeAt(i6) === 47) {
            if (out.length === 0)
              out += "..";
            else
              out += "/..";
          }
        }
        if (out.length > 0)
          return out + to.slice(toStart + lastCommonSep);
        else {
          toStart += lastCommonSep;
          if (to.charCodeAt(toStart) === 47)
            ++toStart;
          return to.slice(toStart);
        }
      },
      _makeLong: function _makeLong(path2) {
        return path2;
      },
      dirname: function dirname(path2) {
        assertPath(path2);
        if (path2.length === 0)
          return ".";
        var code = path2.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i6 = path2.length - 1; i6 >= 1; --i6) {
          code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              end = i6;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1)
          return hasRoot ? "/" : ".";
        if (hasRoot && end === 1)
          return "//";
        return path2.slice(0, end);
      },
      basename: function basename(path2, ext) {
        if (ext !== void 0 && typeof ext !== "string")
          throw new TypeError('"ext" argument must be a string');
        assertPath(path2);
        var start = 0;
        var end = -1;
        var matchedSlash = true;
        var i6;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path2.length) {
          if (ext.length === path2.length && ext === path2)
            return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i6 = path2.length - 1; i6 >= 0; --i6) {
            var code = path2.charCodeAt(i6);
            if (code === 47) {
              if (!matchedSlash) {
                start = i6 + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i6 + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i6;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end)
            end = firstNonSlashEnd;
          else if (end === -1)
            end = path2.length;
          return path2.slice(start, end);
        } else {
          for (i6 = path2.length - 1; i6 >= 0; --i6) {
            if (path2.charCodeAt(i6) === 47) {
              if (!matchedSlash) {
                start = i6 + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i6 + 1;
            }
          }
          if (end === -1)
            return "";
          return path2.slice(start, end);
        }
      },
      extname: function extname(path2) {
        assertPath(path2);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i6 = path2.length - 1; i6 >= 0; --i6) {
          var code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i6 + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i6 + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i6;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path2.slice(startDot, end);
      },
      format: function format2(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
        }
        return _format("/", pathObject);
      },
      parse: function parse2(path2) {
        assertPath(path2);
        var ret = {
          root: "",
          dir: "",
          base: "",
          ext: "",
          name: ""
        };
        if (path2.length === 0)
          return ret;
        var code = path2.charCodeAt(0);
        var isAbsolute = code === 47;
        var start;
        if (isAbsolute) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i6 = path2.length - 1;
        var preDotState = 0;
        for (; i6 >= start; --i6) {
          code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i6 + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i6 + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i6;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          if (end !== -1) {
            if (startPart === 0 && isAbsolute)
              ret.base = ret.name = path2.slice(1, end);
            else
              ret.base = ret.name = path2.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path2.slice(1, startDot);
            ret.base = path2.slice(1, end);
          } else {
            ret.name = path2.slice(startPart, startDot);
            ret.base = path2.slice(startPart, end);
          }
          ret.ext = path2.slice(startDot, end);
        }
        if (startPart > 0)
          ret.dir = path2.slice(0, startPart - 1);
        else if (isAbsolute)
          ret.dir = "/";
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    posix.posix = posix;
    exports$12 = posix;
    return exports$12;
  }
  var exports$12, _dewExec3, exports3;
  var init_chunk_23dbec7b = __esm({
    "node_modules/@jspm/core/nodelibs/browser/chunk-23dbec7b.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      init_chunk_2eac56ff();
      exports$12 = {};
      _dewExec3 = false;
      exports3 = dew3();
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/url.js
  var url_exports = {};
  __export(url_exports, {
    URL: () => _URL,
    Url: () => Url,
    default: () => h5,
    fileURLToPath: () => fileURLToPath,
    format: () => format,
    parse: () => parse,
    pathToFileURL: () => pathToFileURL,
    resolve: () => resolve,
    resolveObject: () => resolveObject
  });
  function r6() {
    this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null, this.path = null, this.href = null;
  }
  function O2(t6, s5, h6) {
    if (t6 && a5.isObject(t6) && t6 instanceof r6)
      return t6;
    var e7 = new r6();
    return e7.parse(t6, s5, h6), e7;
  }
  function dew4() {
    if (_dewExec4)
      return exports4;
    _dewExec4 = true;
    var process3 = T2;
    function assertPath(path2) {
      if (typeof path2 !== "string") {
        throw new TypeError("Path must be a string. Received " + JSON.stringify(path2));
      }
    }
    function normalizeStringPosix(path2, allowAboveRoot) {
      var res = "";
      var lastSegmentLength = 0;
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i6 = 0; i6 <= path2.length; ++i6) {
        if (i6 < path2.length)
          code = path2.charCodeAt(i6);
        else if (code === 47)
          break;
        else
          code = 47;
        if (code === 47) {
          if (lastSlash === i6 - 1 || dots === 1)
            ;
          else if (lastSlash !== i6 - 1 && dots === 2) {
            if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
              if (res.length > 2) {
                var lastSlashIndex = res.lastIndexOf("/");
                if (lastSlashIndex !== res.length - 1) {
                  if (lastSlashIndex === -1) {
                    res = "";
                    lastSegmentLength = 0;
                  } else {
                    res = res.slice(0, lastSlashIndex);
                    lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                  }
                  lastSlash = i6;
                  dots = 0;
                  continue;
                }
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i6;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0)
                res += "/..";
              else
                res = "..";
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0)
              res += "/" + path2.slice(lastSlash + 1, i6);
            else
              res = path2.slice(lastSlash + 1, i6);
            lastSegmentLength = i6 - lastSlash - 1;
          }
          lastSlash = i6;
          dots = 0;
        } else if (code === 46 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format(sep, pathObject) {
      var dir = pathObject.dir || pathObject.root;
      var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    var posix = {
      // path.resolve([from ...], to)
      resolve: function resolve2() {
        var resolvedPath = "";
        var resolvedAbsolute = false;
        var cwd2;
        for (var i6 = arguments.length - 1; i6 >= -1 && !resolvedAbsolute; i6--) {
          var path2;
          if (i6 >= 0)
            path2 = arguments[i6];
          else {
            if (cwd2 === void 0)
              cwd2 = process3.cwd();
            path2 = cwd2;
          }
          assertPath(path2);
          if (path2.length === 0) {
            continue;
          }
          resolvedPath = path2 + "/" + resolvedPath;
          resolvedAbsolute = path2.charCodeAt(0) === 47;
        }
        resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
        if (resolvedAbsolute) {
          if (resolvedPath.length > 0)
            return "/" + resolvedPath;
          else
            return "/";
        } else if (resolvedPath.length > 0) {
          return resolvedPath;
        } else {
          return ".";
        }
      },
      normalize: function normalize(path2) {
        assertPath(path2);
        if (path2.length === 0)
          return ".";
        var isAbsolute = path2.charCodeAt(0) === 47;
        var trailingSeparator = path2.charCodeAt(path2.length - 1) === 47;
        path2 = normalizeStringPosix(path2, !isAbsolute);
        if (path2.length === 0 && !isAbsolute)
          path2 = ".";
        if (path2.length > 0 && trailingSeparator)
          path2 += "/";
        if (isAbsolute)
          return "/" + path2;
        return path2;
      },
      isAbsolute: function isAbsolute(path2) {
        assertPath(path2);
        return path2.length > 0 && path2.charCodeAt(0) === 47;
      },
      join: function join() {
        if (arguments.length === 0)
          return ".";
        var joined;
        for (var i6 = 0; i6 < arguments.length; ++i6) {
          var arg = arguments[i6];
          assertPath(arg);
          if (arg.length > 0) {
            if (joined === void 0)
              joined = arg;
            else
              joined += "/" + arg;
          }
        }
        if (joined === void 0)
          return ".";
        return posix.normalize(joined);
      },
      relative: function relative(from, to) {
        assertPath(from);
        assertPath(to);
        if (from === to)
          return "";
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to)
          return "";
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart) {
          if (from.charCodeAt(fromStart) !== 47)
            break;
        }
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        var toStart = 1;
        for (; toStart < to.length; ++toStart) {
          if (to.charCodeAt(toStart) !== 47)
            break;
        }
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i6 = 0;
        for (; i6 <= length; ++i6) {
          if (i6 === length) {
            if (toLen > length) {
              if (to.charCodeAt(toStart + i6) === 47) {
                return to.slice(toStart + i6 + 1);
              } else if (i6 === 0) {
                return to.slice(toStart + i6);
              }
            } else if (fromLen > length) {
              if (from.charCodeAt(fromStart + i6) === 47) {
                lastCommonSep = i6;
              } else if (i6 === 0) {
                lastCommonSep = 0;
              }
            }
            break;
          }
          var fromCode = from.charCodeAt(fromStart + i6);
          var toCode = to.charCodeAt(toStart + i6);
          if (fromCode !== toCode)
            break;
          else if (fromCode === 47)
            lastCommonSep = i6;
        }
        var out = "";
        for (i6 = fromStart + lastCommonSep + 1; i6 <= fromEnd; ++i6) {
          if (i6 === fromEnd || from.charCodeAt(i6) === 47) {
            if (out.length === 0)
              out += "..";
            else
              out += "/..";
          }
        }
        if (out.length > 0)
          return out + to.slice(toStart + lastCommonSep);
        else {
          toStart += lastCommonSep;
          if (to.charCodeAt(toStart) === 47)
            ++toStart;
          return to.slice(toStart);
        }
      },
      _makeLong: function _makeLong(path2) {
        return path2;
      },
      dirname: function dirname(path2) {
        assertPath(path2);
        if (path2.length === 0)
          return ".";
        var code = path2.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i6 = path2.length - 1; i6 >= 1; --i6) {
          code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              end = i6;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1)
          return hasRoot ? "/" : ".";
        if (hasRoot && end === 1)
          return "//";
        return path2.slice(0, end);
      },
      basename: function basename(path2, ext) {
        if (ext !== void 0 && typeof ext !== "string")
          throw new TypeError('"ext" argument must be a string');
        assertPath(path2);
        var start = 0;
        var end = -1;
        var matchedSlash = true;
        var i6;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path2.length) {
          if (ext.length === path2.length && ext === path2)
            return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i6 = path2.length - 1; i6 >= 0; --i6) {
            var code = path2.charCodeAt(i6);
            if (code === 47) {
              if (!matchedSlash) {
                start = i6 + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i6 + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i6;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end)
            end = firstNonSlashEnd;
          else if (end === -1)
            end = path2.length;
          return path2.slice(start, end);
        } else {
          for (i6 = path2.length - 1; i6 >= 0; --i6) {
            if (path2.charCodeAt(i6) === 47) {
              if (!matchedSlash) {
                start = i6 + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i6 + 1;
            }
          }
          if (end === -1)
            return "";
          return path2.slice(start, end);
        }
      },
      extname: function extname(path2) {
        assertPath(path2);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i6 = path2.length - 1; i6 >= 0; --i6) {
          var code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i6 + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i6 + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i6;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path2.slice(startDot, end);
      },
      format: function format2(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
        }
        return _format("/", pathObject);
      },
      parse: function parse2(path2) {
        assertPath(path2);
        var ret = {
          root: "",
          dir: "",
          base: "",
          ext: "",
          name: ""
        };
        if (path2.length === 0)
          return ret;
        var code = path2.charCodeAt(0);
        var isAbsolute = code === 47;
        var start;
        if (isAbsolute) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i6 = path2.length - 1;
        var preDotState = 0;
        for (; i6 >= start; --i6) {
          code = path2.charCodeAt(i6);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i6 + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i6 + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i6;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          if (end !== -1) {
            if (startPart === 0 && isAbsolute)
              ret.base = ret.name = path2.slice(1, end);
            else
              ret.base = ret.name = path2.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path2.slice(1, startDot);
            ret.base = path2.slice(1, end);
          } else {
            ret.name = path2.slice(startPart, startDot);
            ret.base = path2.slice(startPart, end);
          }
          ret.ext = path2.slice(startDot, end);
        }
        if (startPart > 0)
          ret.dir = path2.slice(0, startPart - 1);
        else if (isAbsolute)
          ret.dir = "/";
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    posix.posix = posix;
    exports4 = posix;
    return exports4;
  }
  function fileURLToPath$1(path2) {
    if (typeof path2 === "string")
      path2 = new URL(path2);
    else if (!(path2 instanceof URL)) {
      throw new Deno.errors.InvalidData(
        "invalid argument path , must be a string or URL"
      );
    }
    if (path2.protocol !== "file:") {
      throw new Deno.errors.InvalidData("invalid url scheme");
    }
    return isWindows$1 ? getPathFromURLWin$1(path2) : getPathFromURLPosix$1(path2);
  }
  function getPathFromURLWin$1(url) {
    const hostname = url.hostname;
    let pathname = url.pathname;
    for (let n7 = 0; n7 < pathname.length; n7++) {
      if (pathname[n7] === "%") {
        const third = pathname.codePointAt(n7 + 2) || 32;
        if (pathname[n7 + 1] === "2" && third === 102 || // 2f 2F /
        pathname[n7 + 1] === "5" && third === 99) {
          throw new Deno.errors.InvalidData(
            "must not include encoded \\ or / characters"
          );
        }
      }
    }
    pathname = pathname.replace(forwardSlashRegEx$1, "\\");
    pathname = decodeURIComponent(pathname);
    if (hostname !== "") {
      return `\\\\${hostname}${pathname}`;
    } else {
      const letter = pathname.codePointAt(1) | 32;
      const sep = pathname[2];
      if (letter < CHAR_LOWERCASE_A$1 || letter > CHAR_LOWERCASE_Z$1 || // a..z A..Z
      sep !== ":") {
        throw new Deno.errors.InvalidData("file url path must be absolute");
      }
      return pathname.slice(1);
    }
  }
  function getPathFromURLPosix$1(url) {
    if (url.hostname !== "") {
      throw new Deno.errors.InvalidData("invalid file url hostname");
    }
    const pathname = url.pathname;
    for (let n7 = 0; n7 < pathname.length; n7++) {
      if (pathname[n7] === "%") {
        const third = pathname.codePointAt(n7 + 2) || 32;
        if (pathname[n7 + 1] === "2" && third === 102) {
          throw new Deno.errors.InvalidData(
            "must not include encoded / characters"
          );
        }
      }
    }
    return decodeURIComponent(pathname);
  }
  function pathToFileURL$1(filepath) {
    let resolved = path.resolve(filepath);
    const filePathLast = filepath.charCodeAt(filepath.length - 1);
    if ((filePathLast === CHAR_FORWARD_SLASH$1 || isWindows$1 && filePathLast === CHAR_BACKWARD_SLASH$1) && resolved[resolved.length - 1] !== path.sep) {
      resolved += "/";
    }
    const outURL = new URL("file://");
    if (resolved.includes("%"))
      resolved = resolved.replace(percentRegEx$1, "%25");
    if (!isWindows$1 && resolved.includes("\\")) {
      resolved = resolved.replace(backslashRegEx$1, "%5C");
    }
    if (resolved.includes("\n"))
      resolved = resolved.replace(newlineRegEx$1, "%0A");
    if (resolved.includes("\r")) {
      resolved = resolved.replace(carriageReturnRegEx$1, "%0D");
    }
    if (resolved.includes("	"))
      resolved = resolved.replace(tabRegEx$1, "%09");
    outURL.pathname = resolved;
    return outURL;
  }
  function fileURLToPath(path2) {
    if (typeof path2 === "string")
      path2 = new URL(path2);
    else if (!(path2 instanceof URL)) {
      throw new Deno.errors.InvalidData(
        "invalid argument path , must be a string or URL"
      );
    }
    if (path2.protocol !== "file:") {
      throw new Deno.errors.InvalidData("invalid url scheme");
    }
    return isWindows ? getPathFromURLWin(path2) : getPathFromURLPosix(path2);
  }
  function getPathFromURLWin(url) {
    const hostname = url.hostname;
    let pathname = url.pathname;
    for (let n7 = 0; n7 < pathname.length; n7++) {
      if (pathname[n7] === "%") {
        const third = pathname.codePointAt(n7 + 2) || 32;
        if (pathname[n7 + 1] === "2" && third === 102 || // 2f 2F /
        pathname[n7 + 1] === "5" && third === 99) {
          throw new Deno.errors.InvalidData(
            "must not include encoded \\ or / characters"
          );
        }
      }
    }
    pathname = pathname.replace(forwardSlashRegEx, "\\");
    pathname = decodeURIComponent(pathname);
    if (hostname !== "") {
      return `\\\\${hostname}${pathname}`;
    } else {
      const letter = pathname.codePointAt(1) | 32;
      const sep = pathname[2];
      if (letter < CHAR_LOWERCASE_A || letter > CHAR_LOWERCASE_Z || // a..z A..Z
      sep !== ":") {
        throw new Deno.errors.InvalidData("file url path must be absolute");
      }
      return pathname.slice(1);
    }
  }
  function getPathFromURLPosix(url) {
    if (url.hostname !== "") {
      throw new Deno.errors.InvalidData("invalid file url hostname");
    }
    const pathname = url.pathname;
    for (let n7 = 0; n7 < pathname.length; n7++) {
      if (pathname[n7] === "%") {
        const third = pathname.codePointAt(n7 + 2) || 32;
        if (pathname[n7 + 1] === "2" && third === 102) {
          throw new Deno.errors.InvalidData(
            "must not include encoded / characters"
          );
        }
      }
    }
    return decodeURIComponent(pathname);
  }
  function pathToFileURL(filepath) {
    let resolved = exports3.resolve(filepath);
    const filePathLast = filepath.charCodeAt(filepath.length - 1);
    if ((filePathLast === CHAR_FORWARD_SLASH || isWindows && filePathLast === CHAR_BACKWARD_SLASH) && resolved[resolved.length - 1] !== exports3.sep) {
      resolved += "/";
    }
    const outURL = new URL("file://");
    if (resolved.includes("%"))
      resolved = resolved.replace(percentRegEx, "%25");
    if (!isWindows && resolved.includes("\\")) {
      resolved = resolved.replace(backslashRegEx, "%5C");
    }
    if (resolved.includes("\n"))
      resolved = resolved.replace(newlineRegEx, "%0A");
    if (resolved.includes("\r")) {
      resolved = resolved.replace(carriageReturnRegEx, "%0D");
    }
    if (resolved.includes("	"))
      resolved = resolved.replace(tabRegEx, "%09");
    outURL.pathname = resolved;
    return outURL;
  }
  var h5, e6, a5, o6, n6, i5, l5, p5, c5, u5, f5, m3, v3, g2, y3, b2, exports4, _dewExec4, path, processPlatform$1, CHAR_BACKWARD_SLASH$1, CHAR_FORWARD_SLASH$1, CHAR_LOWERCASE_A$1, CHAR_LOWERCASE_Z$1, isWindows$1, forwardSlashRegEx$1, percentRegEx$1, backslashRegEx$1, newlineRegEx$1, carriageReturnRegEx$1, tabRegEx$1, processPlatform, Url, format, resolve, resolveObject, parse, _URL, CHAR_BACKWARD_SLASH, CHAR_FORWARD_SLASH, CHAR_LOWERCASE_A, CHAR_LOWERCASE_Z, isWindows, forwardSlashRegEx, percentRegEx, backslashRegEx, newlineRegEx, carriageReturnRegEx, tabRegEx;
  var init_url = __esm({
    "node_modules/@jspm/core/nodelibs/browser/url.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      init_chunk_924bb2e1();
      init_chunk_b04e620d();
      init_chunk_5decc758();
      init_chunk_23dbec7b();
      init_chunk_2eac56ff();
      h5 = {};
      e6 = p3;
      a5 = { isString: function(t6) {
        return "string" == typeof t6;
      }, isObject: function(t6) {
        return "object" == typeof t6 && null !== t6;
      }, isNull: function(t6) {
        return null === t6;
      }, isNullOrUndefined: function(t6) {
        return null == t6;
      } };
      h5.parse = O2, h5.resolve = function(t6, s5) {
        return O2(t6, false, true).resolve(s5);
      }, h5.resolveObject = function(t6, s5) {
        return t6 ? O2(t6, false, true).resolveObject(s5) : s5;
      }, h5.format = function(t6) {
        a5.isString(t6) && (t6 = O2(t6));
        return t6 instanceof r6 ? t6.format() : r6.prototype.format.call(t6);
      }, h5.Url = r6;
      o6 = /^([a-z0-9.+-]+:)/i;
      n6 = /:[0-9]*$/;
      i5 = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
      l5 = ["{", "}", "|", "\\", "^", "`"].concat(["<", ">", '"', "`", " ", "\r", "\n", "	"]);
      p5 = ["'"].concat(l5);
      c5 = ["%", "/", "?", ";", "#"].concat(p5);
      u5 = ["/", "?", "#"];
      f5 = /^[+a-z0-9A-Z_-]{0,63}$/;
      m3 = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
      v3 = { javascript: true, "javascript:": true };
      g2 = { javascript: true, "javascript:": true };
      y3 = { http: true, https: true, ftp: true, gopher: true, file: true, "http:": true, "https:": true, "ftp:": true, "gopher:": true, "file:": true };
      b2 = o4;
      r6.prototype.parse = function(t6, s5, h6) {
        if (!a5.isString(t6))
          throw new TypeError("Parameter 'url' must be a string, not " + typeof t6);
        var r7 = t6.indexOf("?"), n7 = -1 !== r7 && r7 < t6.indexOf("#") ? "?" : "#", l6 = t6.split(n7);
        l6[0] = l6[0].replace(/\\/g, "/");
        var O3 = t6 = l6.join(n7);
        if (O3 = O3.trim(), !h6 && 1 === t6.split("#").length) {
          var d4 = i5.exec(O3);
          if (d4)
            return this.path = O3, this.href = O3, this.pathname = d4[1], d4[2] ? (this.search = d4[2], this.query = s5 ? b2.parse(this.search.substr(1)) : this.search.substr(1)) : s5 && (this.search = "", this.query = {}), this;
        }
        var j2 = o6.exec(O3);
        if (j2) {
          var q = (j2 = j2[0]).toLowerCase();
          this.protocol = q, O3 = O3.substr(j2.length);
        }
        if (h6 || j2 || O3.match(/^\/\/[^@\/]+@[^@\/]+/)) {
          var x2 = "//" === O3.substr(0, 2);
          !x2 || j2 && g2[j2] || (O3 = O3.substr(2), this.slashes = true);
        }
        if (!g2[j2] && (x2 || j2 && !y3[j2])) {
          for (var A2, C2, I2 = -1, w2 = 0; w2 < u5.length; w2++) {
            -1 !== (N2 = O3.indexOf(u5[w2])) && (-1 === I2 || N2 < I2) && (I2 = N2);
          }
          -1 !== (C2 = -1 === I2 ? O3.lastIndexOf("@") : O3.lastIndexOf("@", I2)) && (A2 = O3.slice(0, C2), O3 = O3.slice(C2 + 1), this.auth = decodeURIComponent(A2)), I2 = -1;
          for (w2 = 0; w2 < c5.length; w2++) {
            var N2;
            -1 !== (N2 = O3.indexOf(c5[w2])) && (-1 === I2 || N2 < I2) && (I2 = N2);
          }
          -1 === I2 && (I2 = O3.length), this.host = O3.slice(0, I2), O3 = O3.slice(I2), this.parseHost(), this.hostname = this.hostname || "";
          var U2 = "[" === this.hostname[0] && "]" === this.hostname[this.hostname.length - 1];
          if (!U2)
            for (var k2 = this.hostname.split(/\./), S2 = (w2 = 0, k2.length); w2 < S2; w2++) {
              var R2 = k2[w2];
              if (R2 && !R2.match(f5)) {
                for (var $ = "", z2 = 0, H = R2.length; z2 < H; z2++)
                  R2.charCodeAt(z2) > 127 ? $ += "x" : $ += R2[z2];
                if (!$.match(f5)) {
                  var L2 = k2.slice(0, w2), Z = k2.slice(w2 + 1), _2 = R2.match(m3);
                  _2 && (L2.push(_2[1]), Z.unshift(_2[2])), Z.length && (O3 = "/" + Z.join(".") + O3), this.hostname = L2.join(".");
                  break;
                }
              }
            }
          this.hostname.length > 255 ? this.hostname = "" : this.hostname = this.hostname.toLowerCase(), U2 || (this.hostname = e6.toASCII(this.hostname));
          var E2 = this.port ? ":" + this.port : "", P2 = this.hostname || "";
          this.host = P2 + E2, this.href += this.host, U2 && (this.hostname = this.hostname.substr(1, this.hostname.length - 2), "/" !== O3[0] && (O3 = "/" + O3));
        }
        if (!v3[q])
          for (w2 = 0, S2 = p5.length; w2 < S2; w2++) {
            var T3 = p5[w2];
            if (-1 !== O3.indexOf(T3)) {
              var B2 = encodeURIComponent(T3);
              B2 === T3 && (B2 = escape(T3)), O3 = O3.split(T3).join(B2);
            }
          }
        var D2 = O3.indexOf("#");
        -1 !== D2 && (this.hash = O3.substr(D2), O3 = O3.slice(0, D2));
        var F2 = O3.indexOf("?");
        if (-1 !== F2 ? (this.search = O3.substr(F2), this.query = O3.substr(F2 + 1), s5 && (this.query = b2.parse(this.query)), O3 = O3.slice(0, F2)) : s5 && (this.search = "", this.query = {}), O3 && (this.pathname = O3), y3[q] && this.hostname && !this.pathname && (this.pathname = "/"), this.pathname || this.search) {
          E2 = this.pathname || "";
          var G = this.search || "";
          this.path = E2 + G;
        }
        return this.href = this.format(), this;
      }, r6.prototype.format = function() {
        var t6 = this.auth || "";
        t6 && (t6 = (t6 = encodeURIComponent(t6)).replace(/%3A/i, ":"), t6 += "@");
        var s5 = this.protocol || "", h6 = this.pathname || "", e7 = this.hash || "", r7 = false, o7 = "";
        this.host ? r7 = t6 + this.host : this.hostname && (r7 = t6 + (-1 === this.hostname.indexOf(":") ? this.hostname : "[" + this.hostname + "]"), this.port && (r7 += ":" + this.port)), this.query && a5.isObject(this.query) && Object.keys(this.query).length && (o7 = b2.stringify(this.query));
        var n7 = this.search || o7 && "?" + o7 || "";
        return s5 && ":" !== s5.substr(-1) && (s5 += ":"), this.slashes || (!s5 || y3[s5]) && false !== r7 ? (r7 = "//" + (r7 || ""), h6 && "/" !== h6.charAt(0) && (h6 = "/" + h6)) : r7 || (r7 = ""), e7 && "#" !== e7.charAt(0) && (e7 = "#" + e7), n7 && "?" !== n7.charAt(0) && (n7 = "?" + n7), s5 + r7 + (h6 = h6.replace(/[?#]/g, function(t7) {
          return encodeURIComponent(t7);
        })) + (n7 = n7.replace("#", "%23")) + e7;
      }, r6.prototype.resolve = function(t6) {
        return this.resolveObject(O2(t6, false, true)).format();
      }, r6.prototype.resolveObject = function(t6) {
        if (a5.isString(t6)) {
          var s5 = new r6();
          s5.parse(t6, false, true), t6 = s5;
        }
        for (var h6 = new r6(), e7 = Object.keys(this), o7 = 0; o7 < e7.length; o7++) {
          var n7 = e7[o7];
          h6[n7] = this[n7];
        }
        if (h6.hash = t6.hash, "" === t6.href)
          return h6.href = h6.format(), h6;
        if (t6.slashes && !t6.protocol) {
          for (var i6 = Object.keys(t6), l6 = 0; l6 < i6.length; l6++) {
            var p6 = i6[l6];
            "protocol" !== p6 && (h6[p6] = t6[p6]);
          }
          return y3[h6.protocol] && h6.hostname && !h6.pathname && (h6.path = h6.pathname = "/"), h6.href = h6.format(), h6;
        }
        if (t6.protocol && t6.protocol !== h6.protocol) {
          if (!y3[t6.protocol]) {
            for (var c6 = Object.keys(t6), u6 = 0; u6 < c6.length; u6++) {
              var f6 = c6[u6];
              h6[f6] = t6[f6];
            }
            return h6.href = h6.format(), h6;
          }
          if (h6.protocol = t6.protocol, t6.host || g2[t6.protocol])
            h6.pathname = t6.pathname;
          else {
            for (var m4 = (t6.pathname || "").split("/"); m4.length && !(t6.host = m4.shift()); )
              ;
            t6.host || (t6.host = ""), t6.hostname || (t6.hostname = ""), "" !== m4[0] && m4.unshift(""), m4.length < 2 && m4.unshift(""), h6.pathname = m4.join("/");
          }
          if (h6.search = t6.search, h6.query = t6.query, h6.host = t6.host || "", h6.auth = t6.auth, h6.hostname = t6.hostname || t6.host, h6.port = t6.port, h6.pathname || h6.search) {
            var v4 = h6.pathname || "", b3 = h6.search || "";
            h6.path = v4 + b3;
          }
          return h6.slashes = h6.slashes || t6.slashes, h6.href = h6.format(), h6;
        }
        var O3 = h6.pathname && "/" === h6.pathname.charAt(0), d4 = t6.host || t6.pathname && "/" === t6.pathname.charAt(0), j2 = d4 || O3 || h6.host && t6.pathname, q = j2, x2 = h6.pathname && h6.pathname.split("/") || [], A2 = (m4 = t6.pathname && t6.pathname.split("/") || [], h6.protocol && !y3[h6.protocol]);
        if (A2 && (h6.hostname = "", h6.port = null, h6.host && ("" === x2[0] ? x2[0] = h6.host : x2.unshift(h6.host)), h6.host = "", t6.protocol && (t6.hostname = null, t6.port = null, t6.host && ("" === m4[0] ? m4[0] = t6.host : m4.unshift(t6.host)), t6.host = null), j2 = j2 && ("" === m4[0] || "" === x2[0])), d4)
          h6.host = t6.host || "" === t6.host ? t6.host : h6.host, h6.hostname = t6.hostname || "" === t6.hostname ? t6.hostname : h6.hostname, h6.search = t6.search, h6.query = t6.query, x2 = m4;
        else if (m4.length)
          x2 || (x2 = []), x2.pop(), x2 = x2.concat(m4), h6.search = t6.search, h6.query = t6.query;
        else if (!a5.isNullOrUndefined(t6.search)) {
          if (A2)
            h6.hostname = h6.host = x2.shift(), (U2 = !!(h6.host && h6.host.indexOf("@") > 0) && h6.host.split("@")) && (h6.auth = U2.shift(), h6.host = h6.hostname = U2.shift());
          return h6.search = t6.search, h6.query = t6.query, a5.isNull(h6.pathname) && a5.isNull(h6.search) || (h6.path = (h6.pathname ? h6.pathname : "") + (h6.search ? h6.search : "")), h6.href = h6.format(), h6;
        }
        if (!x2.length)
          return h6.pathname = null, h6.search ? h6.path = "/" + h6.search : h6.path = null, h6.href = h6.format(), h6;
        for (var C2 = x2.slice(-1)[0], I2 = (h6.host || t6.host || x2.length > 1) && ("." === C2 || ".." === C2) || "" === C2, w2 = 0, N2 = x2.length; N2 >= 0; N2--)
          "." === (C2 = x2[N2]) ? x2.splice(N2, 1) : ".." === C2 ? (x2.splice(N2, 1), w2++) : w2 && (x2.splice(N2, 1), w2--);
        if (!j2 && !q)
          for (; w2--; w2)
            x2.unshift("..");
        !j2 || "" === x2[0] || x2[0] && "/" === x2[0].charAt(0) || x2.unshift(""), I2 && "/" !== x2.join("/").substr(-1) && x2.push("");
        var U2, k2 = "" === x2[0] || x2[0] && "/" === x2[0].charAt(0);
        A2 && (h6.hostname = h6.host = k2 ? "" : x2.length ? x2.shift() : "", (U2 = !!(h6.host && h6.host.indexOf("@") > 0) && h6.host.split("@")) && (h6.auth = U2.shift(), h6.host = h6.hostname = U2.shift()));
        return (j2 = j2 || h6.host && x2.length) && !k2 && x2.unshift(""), x2.length ? h6.pathname = x2.join("/") : (h6.pathname = null, h6.path = null), a5.isNull(h6.pathname) && a5.isNull(h6.search) || (h6.path = (h6.pathname ? h6.pathname : "") + (h6.search ? h6.search : "")), h6.auth = t6.auth || h6.auth, h6.slashes = h6.slashes || t6.slashes, h6.href = h6.format(), h6;
      }, r6.prototype.parseHost = function() {
        var t6 = this.host, s5 = n6.exec(t6);
        s5 && (":" !== (s5 = s5[0]) && (this.port = s5.substr(1)), t6 = t6.substr(0, t6.length - s5.length)), t6 && (this.hostname = t6);
      };
      h5.Url;
      h5.format;
      h5.resolve;
      h5.resolveObject;
      exports4 = {};
      _dewExec4 = false;
      path = dew4();
      processPlatform$1 = typeof Deno !== "undefined" ? Deno.build.os === "windows" ? "win32" : Deno.build.os : void 0;
      h5.URL = typeof URL !== "undefined" ? URL : null;
      h5.pathToFileURL = pathToFileURL$1;
      h5.fileURLToPath = fileURLToPath$1;
      h5.Url;
      h5.format;
      h5.resolve;
      h5.resolveObject;
      h5.URL;
      CHAR_BACKWARD_SLASH$1 = 92;
      CHAR_FORWARD_SLASH$1 = 47;
      CHAR_LOWERCASE_A$1 = 97;
      CHAR_LOWERCASE_Z$1 = 122;
      isWindows$1 = processPlatform$1 === "win32";
      forwardSlashRegEx$1 = /\//g;
      percentRegEx$1 = /%/g;
      backslashRegEx$1 = /\\/g;
      newlineRegEx$1 = /\n/g;
      carriageReturnRegEx$1 = /\r/g;
      tabRegEx$1 = /\t/g;
      processPlatform = typeof Deno !== "undefined" ? Deno.build.os === "windows" ? "win32" : Deno.build.os : void 0;
      h5.URL = typeof URL !== "undefined" ? URL : null;
      h5.pathToFileURL = pathToFileURL;
      h5.fileURLToPath = fileURLToPath;
      Url = h5.Url;
      format = h5.format;
      resolve = h5.resolve;
      resolveObject = h5.resolveObject;
      parse = h5.parse;
      _URL = h5.URL;
      CHAR_BACKWARD_SLASH = 92;
      CHAR_FORWARD_SLASH = 47;
      CHAR_LOWERCASE_A = 97;
      CHAR_LOWERCASE_Z = 122;
      isWindows = processPlatform === "win32";
      forwardSlashRegEx = /\//g;
      percentRegEx = /%/g;
      backslashRegEx = /\\/g;
      newlineRegEx = /\n/g;
      carriageReturnRegEx = /\r/g;
      tabRegEx = /\t/g;
    }
  });

  // node_modules/@jspm/core/nodelibs/browser/net.js
  var net_exports = {};
  __export(net_exports, {
    Server: () => unimplemented2,
    Socket: () => unimplemented2,
    Stream: () => unimplemented2,
    _createServerHandle: () => unimplemented2,
    _normalizeArgs: () => unimplemented2,
    _setSimultaneousAccepts: () => unimplemented2,
    connect: () => unimplemented2,
    createConnection: () => unimplemented2,
    createServer: () => unimplemented2,
    default: () => net,
    isIP: () => unimplemented2,
    isIPv4: () => unimplemented2,
    isIPv6: () => unimplemented2
  });
  function unimplemented2() {
    throw new Error("Node.js net module is not supported by JSPM core outside of Node.js");
  }
  var net;
  var init_net = __esm({
    "node_modules/@jspm/core/nodelibs/browser/net.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      net = {
        _createServerHandle: unimplemented2,
        _normalizeArgs: unimplemented2,
        _setSimultaneousAccepts: unimplemented2,
        connect: unimplemented2,
        createConnection: unimplemented2,
        createServer: unimplemented2,
        isIP: unimplemented2,
        isIPv4: unimplemented2,
        isIPv6: unimplemented2,
        Server: unimplemented2,
        Socket: unimplemented2,
        Stream: unimplemented2
      };
    }
  });

  // build/lib/connect/tcp.js
  var require_tcp = __commonJS({
    "build/lib/connect/tcp.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var net_1 = __importDefault((init_net(), __toCommonJS(net_exports)));
      var debug_1 = __importDefault(require_browser4());
      var debug = (0, debug_1.default)("mqttjs:tcp");
      var buildStream = (client, opts) => {
        opts.port = opts.port || 1883;
        opts.hostname = opts.hostname || opts.host || "localhost";
        const { port, path: path2 } = opts;
        const host = opts.hostname;
        debug("port %d and host %s", port, host);
        return net_1.default.createConnection({ port, host, path: path2 });
      };
      exports5.default = buildStream;
    }
  });

  // node_modules/esbuild-plugin-polyfill-node/polyfills/empty.js
  var empty_exports = {};
  __export(empty_exports, {
    default: () => empty_default
  });
  var empty_default;
  var init_empty = __esm({
    "node_modules/esbuild-plugin-polyfill-node/polyfills/empty.js"() {
      init_buffer2();
      init_process2();
      init_navigator();
      empty_default = {};
    }
  });

  // build/lib/connect/tls.js
  var require_tls = __commonJS({
    "build/lib/connect/tls.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var tls_1 = __importDefault((init_empty(), __toCommonJS(empty_exports)));
      var net_1 = __importDefault((init_net(), __toCommonJS(net_exports)));
      var debug_1 = __importDefault(require_browser4());
      var debug = (0, debug_1.default)("mqttjs:tls");
      var buildStream = (client, opts) => {
        opts.port = opts.port || 8883;
        opts.host = opts.hostname || opts.host || "localhost";
        if (net_1.default.isIP(opts.host) === 0) {
          opts.servername = opts.host;
        }
        opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
        delete opts.path;
        debug("port %d host %s rejectUnauthorized %b", opts.port, opts.host, opts.rejectUnauthorized);
        const connection = tls_1.default.connect(opts);
        connection.on("secureConnect", () => {
          if (opts.rejectUnauthorized && !connection.authorized) {
            connection.emit("error", new Error("TLS not authorized"));
          } else {
            connection.removeListener("error", handleTLSerrors);
          }
        });
        function handleTLSerrors(err) {
          if (opts.rejectUnauthorized) {
            client.emit("error", err);
          }
          connection.end();
        }
        connection.on("error", handleTLSerrors);
        return connection;
      };
      exports5.default = buildStream;
    }
  });

  // build/lib/BufferedDuplex.js
  var require_BufferedDuplex = __commonJS({
    "build/lib/BufferedDuplex.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.BufferedDuplex = exports5.writev = void 0;
      var readable_stream_1 = require_browser3();
      var buffer_1 = (init_buffer(), __toCommonJS(buffer_exports));
      function writev(chunks, cb) {
        const buffers = new Array(chunks.length);
        for (let i6 = 0; i6 < chunks.length; i6++) {
          if (typeof chunks[i6].chunk === "string") {
            buffers[i6] = buffer_1.Buffer.from(chunks[i6].chunk, "utf8");
          } else {
            buffers[i6] = chunks[i6].chunk;
          }
        }
        this._write(buffer_1.Buffer.concat(buffers), "binary", cb);
      }
      exports5.writev = writev;
      var BufferedDuplex = class extends readable_stream_1.Duplex {
        constructor(opts, proxy, socket) {
          super({
            objectMode: true
          });
          this.proxy = proxy;
          this.socket = socket;
          this.writeQueue = [];
          if (!opts.objectMode) {
            this._writev = writev.bind(this);
          }
          this.isSocketOpen = false;
          this.proxy.on("data", (chunk) => {
            this.push(chunk);
          });
        }
        _read(size) {
          this.proxy.read(size);
        }
        _write(chunk, encoding, cb) {
          if (!this.isSocketOpen) {
            this.writeQueue.push({ chunk, encoding, cb });
          } else {
            this.writeToProxy(chunk, encoding, cb);
          }
        }
        _final(callback) {
          this.writeQueue = [];
          this.proxy.end(callback);
        }
        _destroy(err, callback) {
          this.writeQueue = [];
          this.proxy.destroy();
          callback(err);
        }
        socketReady() {
          this.emit("connect");
          this.isSocketOpen = true;
          this.processWriteQueue();
        }
        writeToProxy(chunk, encoding, cb) {
          if (this.proxy.write(chunk, encoding) === false) {
            this.proxy.once("drain", cb);
          } else {
            cb();
          }
        }
        processWriteQueue() {
          while (this.writeQueue.length > 0) {
            const { chunk, encoding, cb } = this.writeQueue.shift();
            this.writeToProxy(chunk, encoding, cb);
          }
        }
      };
      exports5.BufferedDuplex = BufferedDuplex;
    }
  });

  // build/lib/connect/wx.js
  var require_wx = __commonJS({
    "build/lib/connect/wx.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var buffer_1 = (init_buffer(), __toCommonJS(buffer_exports));
      var readable_stream_1 = require_browser3();
      var BufferedDuplex_1 = require_BufferedDuplex();
      var socketTask;
      var proxy;
      var stream;
      function buildProxy() {
        const _proxy = new readable_stream_1.Transform();
        _proxy._write = (chunk, encoding, next) => {
          socketTask.send({
            data: chunk.buffer,
            success() {
              next();
            },
            fail(errMsg) {
              next(new Error(errMsg));
            }
          });
        };
        _proxy._flush = (done) => {
          socketTask.close({
            success() {
              done();
            }
          });
        };
        return _proxy;
      }
      function setDefaultOpts(opts) {
        if (!opts.hostname) {
          opts.hostname = "localhost";
        }
        if (!opts.path) {
          opts.path = "/";
        }
        if (!opts.wsOptions) {
          opts.wsOptions = {};
        }
      }
      function buildUrl(opts, client) {
        const protocol = opts.protocol === "wxs" ? "wss" : "ws";
        let url = `${protocol}://${opts.hostname}${opts.path}`;
        if (opts.port && opts.port !== 80 && opts.port !== 443) {
          url = `${protocol}://${opts.hostname}:${opts.port}${opts.path}`;
        }
        if (typeof opts.transformWsUrl === "function") {
          url = opts.transformWsUrl(url, opts, client);
        }
        return url;
      }
      function bindEventHandler() {
        socketTask.onOpen(() => {
          stream.socketReady();
        });
        socketTask.onMessage((res) => {
          let { data } = res;
          if (data instanceof ArrayBuffer)
            data = buffer_1.Buffer.from(data);
          else
            data = buffer_1.Buffer.from(data, "utf8");
          proxy.push(data);
        });
        socketTask.onClose(() => {
          stream.emit("close");
          stream.end();
          stream.destroy();
        });
        socketTask.onError((error) => {
          const err = new Error(error.errMsg);
          stream.destroy(err);
        });
      }
      var buildStream = (client, opts) => {
        opts.hostname = opts.hostname || opts.host;
        if (!opts.hostname) {
          throw new Error("Could not determine host. Specify host manually.");
        }
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        setDefaultOpts(opts);
        const url = buildUrl(opts, client);
        socketTask = wx.connectSocket({
          url,
          protocols: [websocketSubProtocol]
        });
        proxy = buildProxy();
        stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, socketTask);
        stream._destroy = (err, cb) => {
          socketTask.close({
            success() {
              if (cb)
                cb(err);
            }
          });
        };
        const destroyRef = stream.destroy;
        stream.destroy = (err, cb) => {
          stream.destroy = destroyRef;
          setTimeout(() => {
            socketTask.close({
              fail() {
                stream._destroy(err, cb);
              }
            });
          }, 0);
          return stream;
        };
        bindEventHandler();
        return stream;
      };
      exports5.default = buildStream;
    }
  });

  // build/lib/connect/ali.js
  var require_ali = __commonJS({
    "build/lib/connect/ali.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      Object.defineProperty(exports5, "__esModule", { value: true });
      var buffer_1 = (init_buffer(), __toCommonJS(buffer_exports));
      var readable_stream_1 = require_browser3();
      var BufferedDuplex_1 = require_BufferedDuplex();
      var my;
      var proxy;
      var stream;
      var isInitialized = false;
      function buildProxy() {
        const _proxy = new readable_stream_1.Transform();
        _proxy._write = (chunk, encoding, next) => {
          my.sendSocketMessage({
            data: chunk.buffer,
            success() {
              next();
            },
            fail() {
              next(new Error());
            }
          });
        };
        _proxy._flush = (done) => {
          my.closeSocket({
            success() {
              done();
            }
          });
        };
        return _proxy;
      }
      function setDefaultOpts(opts) {
        if (!opts.hostname) {
          opts.hostname = "localhost";
        }
        if (!opts.path) {
          opts.path = "/";
        }
        if (!opts.wsOptions) {
          opts.wsOptions = {};
        }
      }
      function buildUrl(opts, client) {
        const protocol = opts.protocol === "alis" ? "wss" : "ws";
        let url = `${protocol}://${opts.hostname}${opts.path}`;
        if (opts.port && opts.port !== 80 && opts.port !== 443) {
          url = `${protocol}://${opts.hostname}:${opts.port}${opts.path}`;
        }
        if (typeof opts.transformWsUrl === "function") {
          url = opts.transformWsUrl(url, opts, client);
        }
        return url;
      }
      function bindEventHandler() {
        if (isInitialized)
          return;
        isInitialized = true;
        my.onSocketOpen(() => {
          stream.socketReady();
        });
        my.onSocketMessage((res) => {
          if (typeof res.data === "string") {
            const buffer = buffer_1.Buffer.from(res.data, "base64");
            proxy.push(buffer);
          } else {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
              let data = reader.result;
              if (data instanceof ArrayBuffer)
                data = buffer_1.Buffer.from(data);
              else
                data = buffer_1.Buffer.from(data, "utf8");
              proxy.push(data);
            });
            reader.readAsArrayBuffer(res.data);
          }
        });
        my.onSocketClose(() => {
          stream.end();
          stream.destroy();
        });
        my.onSocketError((err) => {
          stream.destroy(err);
        });
      }
      var buildStream = (client, opts) => {
        opts.hostname = opts.hostname || opts.host;
        if (!opts.hostname) {
          throw new Error("Could not determine host. Specify host manually.");
        }
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        setDefaultOpts(opts);
        const url = buildUrl(opts, client);
        my = opts.my;
        my.connectSocket({
          url,
          protocols: websocketSubProtocol
        });
        proxy = buildProxy();
        stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, my);
        bindEventHandler();
        return stream;
      };
      exports5.default = buildStream;
    }
  });

  // node_modules/ws/browser.js
  var require_browser5 = __commonJS({
    "node_modules/ws/browser.js"(exports5, module) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      module.exports = function() {
        throw new Error(
          "ws does not work in the browser. Browser clients must use the native WebSocket object"
        );
      };
    }
  });

  // build/lib/connect/ws.js
  var require_ws = __commonJS({
    "build/lib/connect/ws.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var buffer_1 = (init_buffer(), __toCommonJS(buffer_exports));
      var ws_1 = __importDefault(require_browser5());
      var debug_1 = __importDefault(require_browser4());
      var readable_stream_1 = require_browser3();
      var is_browser_1 = __importDefault(require_is_browser());
      var BufferedDuplex_1 = require_BufferedDuplex();
      var debug = (0, debug_1.default)("mqttjs:ws");
      var WSS_OPTIONS = [
        "rejectUnauthorized",
        "ca",
        "cert",
        "key",
        "pfx",
        "passphrase"
      ];
      function buildUrl(opts, client) {
        let url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`;
        if (typeof opts.transformWsUrl === "function") {
          url = opts.transformWsUrl(url, opts, client);
        }
        return url;
      }
      function setDefaultOpts(opts) {
        const options = opts;
        if (!opts.port) {
          if (opts.protocol === "wss") {
            options.port = 443;
          } else {
            options.port = 80;
          }
        }
        if (!opts.path) {
          options.path = "/";
        }
        if (!opts.wsOptions) {
          options.wsOptions = {};
        }
        if (!is_browser_1.default && opts.protocol === "wss") {
          WSS_OPTIONS.forEach((prop) => {
            if (Object.prototype.hasOwnProperty.call(opts, prop) && !Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)) {
              options.wsOptions[prop] = opts[prop];
            }
          });
        }
        return options;
      }
      function setDefaultBrowserOpts(opts) {
        const options = setDefaultOpts(opts);
        if (!options.hostname) {
          options.hostname = options.host;
        }
        if (!options.hostname) {
          if (typeof document === "undefined") {
            throw new Error("Could not determine host. Specify host manually.");
          }
          const parsed = new URL(document.URL);
          options.hostname = parsed.hostname;
          if (!options.port) {
            options.port = Number(parsed.port);
          }
        }
        if (options.objectMode === void 0) {
          options.objectMode = !(options.binary === true || options.binary === void 0);
        }
        return options;
      }
      function createWebSocket(client, url, opts) {
        debug("createWebSocket");
        debug(`protocol: ${opts.protocolId} ${opts.protocolVersion}`);
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        debug(`creating new Websocket for url: ${url} and protocol: ${websocketSubProtocol}`);
        let socket;
        if (opts.createWebsocket) {
          socket = opts.createWebsocket(url, [websocketSubProtocol], opts);
        } else {
          socket = new ws_1.default(url, [websocketSubProtocol], opts.wsOptions);
        }
        return socket;
      }
      function createBrowserWebSocket(client, opts) {
        const websocketSubProtocol = opts.protocolId === "MQIsdp" && opts.protocolVersion === 3 ? "mqttv3.1" : "mqtt";
        const url = buildUrl(opts, client);
        let socket;
        if (opts.createWebsocket) {
          socket = opts.createWebsocket(url, [websocketSubProtocol], opts);
        } else {
          socket = new WebSocket(url, [websocketSubProtocol]);
        }
        socket.binaryType = "arraybuffer";
        return socket;
      }
      var streamBuilder = (client, opts) => {
        debug("streamBuilder");
        const options = setDefaultOpts(opts);
        options.hostname = options.hostname || options.host || "localhost";
        const url = buildUrl(options, client);
        const socket = createWebSocket(client, url, options);
        const webSocketStream = ws_1.default.createWebSocketStream(socket, options.wsOptions);
        webSocketStream["url"] = url;
        socket.on("close", () => {
          webSocketStream.destroy();
        });
        return webSocketStream;
      };
      var browserStreamBuilder = (client, opts) => {
        debug("browserStreamBuilder");
        let stream;
        const options = setDefaultBrowserOpts(opts);
        const bufferSize = options.browserBufferSize || 1024 * 512;
        const bufferTimeout = opts.browserBufferTimeout || 1e3;
        const coerceToBuffer = !opts.objectMode;
        const socket = createBrowserWebSocket(client, opts);
        const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser);
        if (!opts.objectMode) {
          proxy._writev = BufferedDuplex_1.writev.bind(proxy);
        }
        proxy.on("close", () => {
          socket.close();
        });
        const eventListenerSupport = typeof socket.addEventListener !== "undefined";
        if (socket.readyState === socket.OPEN) {
          stream = proxy;
          stream.socket = socket;
        } else {
          stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, socket);
          if (eventListenerSupport) {
            socket.addEventListener("open", onOpen);
          } else {
            socket.onopen = onOpen;
          }
        }
        if (eventListenerSupport) {
          socket.addEventListener("close", onClose);
          socket.addEventListener("error", onError);
          socket.addEventListener("message", onMessage);
        } else {
          socket.onclose = onClose;
          socket.onerror = onError;
          socket.onmessage = onMessage;
        }
        function buildProxy(pOptions, socketWrite, socketEnd) {
          const _proxy = new readable_stream_1.Transform({
            objectMode: pOptions.objectMode
          });
          _proxy._write = socketWrite;
          _proxy._flush = socketEnd;
          return _proxy;
        }
        function onOpen() {
          debug("WebSocket onOpen");
          if (stream instanceof BufferedDuplex_1.BufferedDuplex) {
            stream.socketReady();
          }
        }
        function onClose(event) {
          debug("WebSocket onClose", event);
          stream.end();
          stream.destroy();
        }
        function onError(err) {
          debug("WebSocket onError", err);
          const error = new Error("WebSocket error");
          error["event"] = err;
          stream.destroy(error);
        }
        function onMessage(event) {
          let { data } = event;
          if (data instanceof ArrayBuffer)
            data = buffer_1.Buffer.from(data);
          else
            data = buffer_1.Buffer.from(data, "utf8");
          proxy.push(data);
        }
        function socketWriteBrowser(chunk, enc, next) {
          if (socket.bufferedAmount > bufferSize) {
            setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next);
            return;
          }
          if (coerceToBuffer && typeof chunk === "string") {
            chunk = buffer_1.Buffer.from(chunk, "utf8");
          }
          try {
            socket.send(chunk);
          } catch (err) {
            return next(err);
          }
          next();
        }
        function socketEndBrowser(done) {
          socket.close();
          done();
        }
        return stream;
      };
      exports5.default = is_browser_1.default ? browserStreamBuilder : streamBuilder;
    }
  });

  // build/lib/connect/index.js
  var require_connect = __commonJS({
    "build/lib/connect/index.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.connectAsync = void 0;
      var debug_1 = __importDefault(require_browser4());
      var url_1 = __importDefault((init_url(), __toCommonJS(url_exports)));
      var client_1 = __importDefault(require_client());
      var is_browser_1 = __importDefault(require_is_browser());
      if (typeof (process_exports === null || process_exports === void 0 ? void 0 : process_exports.nextTick) !== "function") {
        process_exports.nextTick = setImmediate;
      }
      var debug = (0, debug_1.default)("mqttjs");
      var protocols = {};
      if (!is_browser_1.default) {
        protocols.mqtt = require_tcp().default;
        protocols.tcp = require_tcp().default;
        protocols.ssl = require_tls().default;
        protocols.tls = protocols.ssl;
        protocols.mqtts = require_tls().default;
      } else {
        protocols.wx = require_wx().default;
        protocols.wxs = require_wx().default;
        protocols.ali = require_ali().default;
        protocols.alis = require_ali().default;
      }
      protocols.ws = require_ws().default;
      protocols.wss = require_ws().default;
      function parseAuthOptions(opts) {
        let matches;
        if (opts.auth) {
          matches = opts.auth.match(/^(.+):(.+)$/);
          if (matches) {
            opts.username = matches[1];
            opts.password = matches[2];
          } else {
            opts.username = opts.auth;
          }
        }
      }
      function connect(brokerUrl, opts) {
        var _a, _b, _c;
        debug("connecting to an MQTT broker...");
        if (typeof brokerUrl === "object" && !opts) {
          opts = brokerUrl;
          brokerUrl = "";
        }
        opts = opts || {};
        if (brokerUrl && typeof brokerUrl === "string") {
          const parsedUrl = url_1.default.parse(brokerUrl, true);
          const parsedOptions = {};
          if (parsedUrl.port != null) {
            parsedOptions.port = Number(parsedUrl.port);
          }
          parsedOptions.host = parsedUrl.hostname;
          parsedOptions.query = parsedUrl.query;
          parsedOptions.auth = parsedUrl.auth;
          parsedOptions.protocol = parsedUrl.protocol;
          parsedOptions.path = parsedUrl.path;
          parsedOptions.protocol = (_a = parsedOptions.protocol) === null || _a === void 0 ? void 0 : _a.replace(/:$/, "");
          opts = Object.assign(Object.assign({}, parsedOptions), opts);
          if (!opts.protocol) {
            throw new Error("Missing protocol");
          }
        }
        opts.unixSocket = opts.unixSocket || ((_b = opts.protocol) === null || _b === void 0 ? void 0 : _b.includes("+unix"));
        if (opts.unixSocket) {
          opts.protocol = opts.protocol.replace("+unix", "");
        } else if (!((_c = opts.protocol) === null || _c === void 0 ? void 0 : _c.startsWith("ws"))) {
          delete opts.path;
        }
        parseAuthOptions(opts);
        if (opts.query && typeof opts.query.clientId === "string") {
          opts.clientId = opts.query.clientId;
        }
        if (opts.cert && opts.key) {
          if (opts.protocol) {
            if (["mqtts", "wss", "wxs", "alis"].indexOf(opts.protocol) === -1) {
              switch (opts.protocol) {
                case "mqtt":
                  opts.protocol = "mqtts";
                  break;
                case "ws":
                  opts.protocol = "wss";
                  break;
                case "wx":
                  opts.protocol = "wxs";
                  break;
                case "ali":
                  opts.protocol = "alis";
                  break;
                default:
                  throw new Error(`Unknown protocol for secure connection: "${opts.protocol}"!`);
              }
            }
          } else {
            throw new Error("Missing secure protocol key");
          }
        }
        if (!protocols[opts.protocol]) {
          const isSecure = ["mqtts", "wss"].indexOf(opts.protocol) !== -1;
          opts.protocol = [
            "mqtt",
            "mqtts",
            "ws",
            "wss",
            "wx",
            "wxs",
            "ali",
            "alis"
          ].filter((key, index) => {
            if (isSecure && index % 2 === 0) {
              return false;
            }
            return typeof protocols[key] === "function";
          })[0];
        }
        if (opts.clean === false && !opts.clientId) {
          throw new Error("Missing clientId for unclean clients");
        }
        if (opts.protocol) {
          opts.defaultProtocol = opts.protocol;
        }
        function wrapper(client2) {
          if (opts.servers) {
            if (!client2._reconnectCount || client2._reconnectCount === opts.servers.length) {
              client2._reconnectCount = 0;
            }
            opts.host = opts.servers[client2._reconnectCount].host;
            opts.port = opts.servers[client2._reconnectCount].port;
            opts.protocol = !opts.servers[client2._reconnectCount].protocol ? opts.defaultProtocol : opts.servers[client2._reconnectCount].protocol;
            opts.hostname = opts.host;
            client2._reconnectCount++;
          }
          debug("calling streambuilder for", opts.protocol);
          return protocols[opts.protocol](client2, opts);
        }
        const client = new client_1.default(wrapper, opts);
        client.on("error", () => {
        });
        return client;
      }
      function connectAsync(brokerUrl, opts, allowRetries = true) {
        return new Promise((resolve2, reject) => {
          const client = connect(brokerUrl, opts);
          const promiseResolutionListeners = {
            connect: (connack) => {
              removePromiseResolutionListeners();
              resolve2(client);
            },
            end: () => {
              removePromiseResolutionListeners();
              resolve2(client);
            },
            error: (err) => {
              removePromiseResolutionListeners();
              client.end();
              reject(err);
            }
          };
          if (allowRetries === false) {
            promiseResolutionListeners.close = () => {
              promiseResolutionListeners.error(new Error("Couldn't connect to server"));
            };
          }
          function removePromiseResolutionListeners() {
            Object.keys(promiseResolutionListeners).forEach((eventName) => {
              client.off(eventName, promiseResolutionListeners[eventName]);
            });
          }
          Object.keys(promiseResolutionListeners).forEach((eventName) => {
            client.on(eventName, promiseResolutionListeners[eventName]);
          });
        });
      }
      exports5.connectAsync = connectAsync;
      exports5.default = connect;
    }
  });

  // build/mqtt.js
  var require_mqtt2 = __commonJS({
    "build/mqtt.js"(exports5) {
      "use strict";
      init_buffer2();
      init_process2();
      init_navigator();
      var __createBinding = exports5 && exports5.__createBinding || (Object.create ? function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        var desc = Object.getOwnPropertyDescriptor(m4, k2);
        if (!desc || ("get" in desc ? !m4.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m4[k2];
          } };
        }
        Object.defineProperty(o7, k22, desc);
      } : function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        o7[k22] = m4[k2];
      });
      var __setModuleDefault = exports5 && exports5.__setModuleDefault || (Object.create ? function(o7, v4) {
        Object.defineProperty(o7, "default", { enumerable: true, value: v4 });
      } : function(o7, v4) {
        o7["default"] = v4;
      });
      var __importStar = exports5 && exports5.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k2 in mod)
            if (k2 !== "default" && Object.prototype.hasOwnProperty.call(mod, k2))
              __createBinding(result, mod, k2);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __exportStar = exports5 && exports5.__exportStar || function(m4, exports6) {
        for (var p6 in m4)
          if (p6 !== "default" && !Object.prototype.hasOwnProperty.call(exports6, p6))
            __createBinding(exports6, m4, p6);
      };
      var __importDefault = exports5 && exports5.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      exports5.ReasonCodes = exports5.KeepaliveManager = exports5.UniqueMessageIdProvider = exports5.DefaultMessageIdProvider = exports5.Store = exports5.MqttClient = exports5.connectAsync = exports5.connect = exports5.Client = void 0;
      var client_1 = __importDefault(require_client());
      exports5.MqttClient = client_1.default;
      var default_message_id_provider_1 = __importDefault(require_default_message_id_provider());
      exports5.DefaultMessageIdProvider = default_message_id_provider_1.default;
      var unique_message_id_provider_1 = __importDefault(require_unique_message_id_provider());
      exports5.UniqueMessageIdProvider = unique_message_id_provider_1.default;
      var store_1 = __importDefault(require_store());
      exports5.Store = store_1.default;
      var connect_1 = __importStar(require_connect());
      exports5.connect = connect_1.default;
      Object.defineProperty(exports5, "connectAsync", { enumerable: true, get: function() {
        return connect_1.connectAsync;
      } });
      var KeepaliveManager_1 = __importDefault(require_KeepaliveManager());
      exports5.KeepaliveManager = KeepaliveManager_1.default;
      exports5.Client = client_1.default;
      __exportStar(require_client(), exports5);
      __exportStar(require_shared(), exports5);
      var ack_1 = require_ack();
      Object.defineProperty(exports5, "ReasonCodes", { enumerable: true, get: function() {
        return ack_1.ReasonCodes;
      } });
    }
  });

  // build/index.js
  var require_build = __commonJS({
    "build/index.js"(exports5) {
      init_buffer2();
      init_process2();
      init_navigator();
      var __createBinding = exports5 && exports5.__createBinding || (Object.create ? function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        var desc = Object.getOwnPropertyDescriptor(m4, k2);
        if (!desc || ("get" in desc ? !m4.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m4[k2];
          } };
        }
        Object.defineProperty(o7, k22, desc);
      } : function(o7, m4, k2, k22) {
        if (k22 === void 0)
          k22 = k2;
        o7[k22] = m4[k2];
      });
      var __setModuleDefault = exports5 && exports5.__setModuleDefault || (Object.create ? function(o7, v4) {
        Object.defineProperty(o7, "default", { enumerable: true, value: v4 });
      } : function(o7, v4) {
        o7["default"] = v4;
      });
      var __importStar = exports5 && exports5.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k2 in mod)
            if (k2 !== "default" && Object.prototype.hasOwnProperty.call(mod, k2))
              __createBinding(result, mod, k2);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __exportStar = exports5 && exports5.__exportStar || function(m4, exports6) {
        for (var p6 in m4)
          if (p6 !== "default" && !Object.prototype.hasOwnProperty.call(exports6, p6))
            __createBinding(exports6, m4, p6);
      };
      Object.defineProperty(exports5, "__esModule", { value: true });
      var mqtt = __importStar(require_mqtt2());
      exports5.default = mqtt;
      __exportStar(require_mqtt2(), exports5);
    }
  });
  return require_build();
})();
/*! Bundled license information:

@jspm/core/nodelibs/browser/buffer.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
