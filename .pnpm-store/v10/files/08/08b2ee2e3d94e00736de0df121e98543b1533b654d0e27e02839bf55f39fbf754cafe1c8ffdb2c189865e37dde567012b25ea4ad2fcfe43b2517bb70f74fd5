var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// node_modules/seedrandom/lib/alea.js
var require_alea = __commonJS({
  "node_modules/seedrandom/lib/alea.js"(exports, module2) {
    (function(global, module3, define2) {
      function Alea(seed) {
        var me = this, mash = Mash();
        me.next = function() {
          var t = 2091639 * me.s0 + me.c * 23283064365386963e-26;
          me.s0 = me.s1;
          me.s1 = me.s2;
          return me.s2 = t - (me.c = t | 0);
        };
        me.c = 1;
        me.s0 = mash(" ");
        me.s1 = mash(" ");
        me.s2 = mash(" ");
        me.s0 -= mash(seed);
        if (me.s0 < 0) {
          me.s0 += 1;
        }
        me.s1 -= mash(seed);
        if (me.s1 < 0) {
          me.s1 += 1;
        }
        me.s2 -= mash(seed);
        if (me.s2 < 0) {
          me.s2 += 1;
        }
        mash = null;
      }
      function copy(f, t) {
        t.c = f.c;
        t.s0 = f.s0;
        t.s1 = f.s1;
        t.s2 = f.s2;
        return t;
      }
      function impl(seed, opts) {
        var xg = new Alea(seed), state2 = opts && opts.state, prng = xg.next;
        prng.int32 = function() {
          return xg.next() * 4294967296 | 0;
        };
        prng.double = function() {
          return prng() + (prng() * 2097152 | 0) * 11102230246251565e-32;
        };
        prng.quick = prng;
        if (state2) {
          if (typeof state2 == "object")
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      function Mash() {
        var n = 4022871197;
        var mash = function(data) {
          data = String(data);
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 4294967296;
          }
          return (n >>> 0) * 23283064365386963e-26;
        };
        return mash;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.alea = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/lib/xor128.js
var require_xor128 = __commonJS({
  "node_modules/seedrandom/lib/xor128.js"(exports, module2) {
    (function(global, module3, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.next = function() {
          var t = me.x ^ me.x << 11;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          return me.w ^= me.w >>> 19 ^ t ^ t >>> 8;
        };
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state2 = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state2) {
          if (typeof state2 == "object")
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor128 = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/lib/xorwow.js
var require_xorwow = __commonJS({
  "node_modules/seedrandom/lib/xorwow.js"(exports, module2) {
    (function(global, module3, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var t = me.x ^ me.x >>> 2;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          me.w = me.v;
          return (me.d = me.d + 362437 | 0) + (me.v = me.v ^ me.v << 4 ^ (t ^ t << 1)) | 0;
        };
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.v = 0;
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          if (k == strseed.length) {
            me.d = me.x << 10 ^ me.x >>> 4;
          }
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        t.v = f.v;
        t.d = f.d;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state2 = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state2) {
          if (typeof state2 == "object")
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorwow = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/lib/xorshift7.js
var require_xorshift7 = __commonJS({
  "node_modules/seedrandom/lib/xorshift7.js"(exports, module2) {
    (function(global, module3, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var X = me.x, i = me.i, t, v, w;
          t = X[i];
          t ^= t >>> 7;
          v = t ^ t << 24;
          t = X[i + 1 & 7];
          v ^= t ^ t >>> 10;
          t = X[i + 3 & 7];
          v ^= t ^ t >>> 3;
          t = X[i + 4 & 7];
          v ^= t ^ t << 7;
          t = X[i + 7 & 7];
          t = t ^ t << 13;
          v ^= t ^ t << 9;
          X[i] = v;
          me.i = i + 1 & 7;
          return v;
        };
        function init(me2, seed2) {
          var j, w, X = [];
          if (seed2 === (seed2 | 0)) {
            w = X[0] = seed2;
          } else {
            seed2 = "" + seed2;
            for (j = 0; j < seed2.length; ++j) {
              X[j & 7] = X[j & 7] << 15 ^ seed2.charCodeAt(j) + X[j + 1 & 7] << 13;
            }
          }
          while (X.length < 8)
            X.push(0);
          for (j = 0; j < 8 && X[j] === 0; ++j)
            ;
          if (j == 8)
            w = X[7] = -1;
          else
            w = X[j];
          me2.x = X;
          me2.i = 0;
          for (j = 256; j > 0; --j) {
            me2.next();
          }
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.x = f.x.slice();
        t.i = f.i;
        return t;
      }
      function impl(seed, opts) {
        if (seed == null)
          seed = +new Date();
        var xg = new XorGen(seed), state2 = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state2) {
          if (state2.x)
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorshift7 = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/lib/xor4096.js
var require_xor4096 = __commonJS({
  "node_modules/seedrandom/lib/xor4096.js"(exports, module2) {
    (function(global, module3, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var w = me.w, X = me.X, i = me.i, t, v;
          me.w = w = w + 1640531527 | 0;
          v = X[i + 34 & 127];
          t = X[i = i + 1 & 127];
          v ^= v << 13;
          t ^= t << 17;
          v ^= v >>> 15;
          t ^= t >>> 12;
          v = X[i] = v ^ t;
          me.i = i;
          return v + (w ^ w >>> 16) | 0;
        };
        function init(me2, seed2) {
          var t, v, i, j, w, X = [], limit = 128;
          if (seed2 === (seed2 | 0)) {
            v = seed2;
            seed2 = null;
          } else {
            seed2 = seed2 + "\0";
            v = 0;
            limit = Math.max(limit, seed2.length);
          }
          for (i = 0, j = -32; j < limit; ++j) {
            if (seed2)
              v ^= seed2.charCodeAt((j + 32) % seed2.length);
            if (j === 0)
              w = v;
            v ^= v << 10;
            v ^= v >>> 15;
            v ^= v << 4;
            v ^= v >>> 13;
            if (j >= 0) {
              w = w + 1640531527 | 0;
              t = X[j & 127] ^= v + w;
              i = t == 0 ? i + 1 : 0;
            }
          }
          if (i >= 128) {
            X[(seed2 && seed2.length || 0) & 127] = -1;
          }
          i = 127;
          for (j = 4 * 128; j > 0; --j) {
            v = X[i + 34 & 127];
            t = X[i = i + 1 & 127];
            v ^= v << 13;
            t ^= t << 17;
            v ^= v >>> 15;
            t ^= t >>> 12;
            X[i] = v ^ t;
          }
          me2.w = w;
          me2.X = X;
          me2.i = i;
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.i = f.i;
        t.w = f.w;
        t.X = f.X.slice();
        return t;
      }
      ;
      function impl(seed, opts) {
        if (seed == null)
          seed = +new Date();
        var xg = new XorGen(seed), state2 = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state2) {
          if (state2.X)
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor4096 = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/lib/tychei.js
var require_tychei = __commonJS({
  "node_modules/seedrandom/lib/tychei.js"(exports, module2) {
    (function(global, module3, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var b = me.b, c = me.c, d = me.d, a = me.a;
          b = b << 25 ^ b >>> 7 ^ c;
          c = c - d | 0;
          d = d << 24 ^ d >>> 8 ^ a;
          a = a - b | 0;
          me.b = b = b << 20 ^ b >>> 12 ^ c;
          me.c = c = c - d | 0;
          me.d = d << 16 ^ c >>> 16 ^ a;
          return me.a = a - b | 0;
        };
        me.a = 0;
        me.b = 0;
        me.c = 2654435769 | 0;
        me.d = 1367130551;
        if (seed === Math.floor(seed)) {
          me.a = seed / 4294967296 | 0;
          me.b = seed | 0;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 20; k++) {
          me.b ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.a = f.a;
        t.b = f.b;
        t.c = f.c;
        t.d = f.d;
        return t;
      }
      ;
      function impl(seed, opts) {
        var xg = new XorGen(seed), state2 = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state2) {
          if (typeof state2 == "object")
            copy(state2, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module3 && module3.exports) {
        module3.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.tychei = impl;
      }
    })(exports, typeof module2 == "object" && module2, typeof define == "function" && define);
  }
});

// node_modules/seedrandom/seedrandom.js
var require_seedrandom = __commonJS({
  "node_modules/seedrandom/seedrandom.js"(exports, module2) {
    (function(global, pool, math) {
      var width = 256, chunks = 6, digits = 52, rngname = "random", startdenom = math.pow(width, chunks), significance = math.pow(2, digits), overflow = significance * 2, mask = width - 1, nodecrypto;
      function seedrandom(seed, options, callback) {
        var key = [];
        options = options == true ? { entropy: true } : options || {};
        var shortseed = mixkey(flatten(options.entropy ? [seed, tostring(pool)] : seed == null ? autoseed() : seed, 3), key);
        var arc4 = new ARC4(key);
        var prng = function() {
          var n = arc4.g(chunks), d = startdenom, x = 0;
          while (n < significance) {
            n = (n + x) * width;
            d *= width;
            x = arc4.g(1);
          }
          while (n >= overflow) {
            n /= 2;
            d /= 2;
            x >>>= 1;
          }
          return (n + x) / d;
        };
        prng.int32 = function() {
          return arc4.g(4) | 0;
        };
        prng.quick = function() {
          return arc4.g(4) / 4294967296;
        };
        prng.double = prng;
        mixkey(tostring(arc4.S), pool);
        return (options.pass || callback || function(prng2, seed2, is_math_call, state2) {
          if (state2) {
            if (state2.S) {
              copy(state2, arc4);
            }
            prng2.state = function() {
              return copy(arc4, {});
            };
          }
          if (is_math_call) {
            math[rngname] = prng2;
            return seed2;
          } else
            return prng2;
        })(prng, shortseed, "global" in options ? options.global : this == math, options.state);
      }
      function ARC4(key) {
        var t, keylen = key.length, me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];
        if (!keylen) {
          key = [keylen++];
        }
        while (i < width) {
          s[i] = i++;
        }
        for (i = 0; i < width; i++) {
          s[i] = s[j = mask & j + key[i % keylen] + (t = s[i])];
          s[j] = t;
        }
        (me.g = function(count) {
          var t2, r = 0, i2 = me.i, j2 = me.j, s2 = me.S;
          while (count--) {
            t2 = s2[i2 = mask & i2 + 1];
            r = r * width + s2[mask & (s2[i2] = s2[j2 = mask & j2 + t2]) + (s2[j2] = t2)];
          }
          me.i = i2;
          me.j = j2;
          return r;
        })(width);
      }
      function copy(f, t) {
        t.i = f.i;
        t.j = f.j;
        t.S = f.S.slice();
        return t;
      }
      ;
      function flatten(obj, depth) {
        var result = [], typ = typeof obj, prop;
        if (depth && typ == "object") {
          for (prop in obj) {
            try {
              result.push(flatten(obj[prop], depth - 1));
            } catch (e) {
            }
          }
        }
        return result.length ? result : typ == "string" ? obj : obj + "\0";
      }
      function mixkey(seed, key) {
        var stringseed = seed + "", smear, j = 0;
        while (j < stringseed.length) {
          key[mask & j] = mask & (smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++);
        }
        return tostring(key);
      }
      function autoseed() {
        try {
          var out;
          if (nodecrypto && (out = nodecrypto.randomBytes)) {
            out = out(width);
          } else {
            out = new Uint8Array(width);
            (global.crypto || global.msCrypto).getRandomValues(out);
          }
          return tostring(out);
        } catch (e) {
          var browser = global.navigator, plugins = browser && browser.plugins;
          return [+new Date(), global, plugins, global.screen, tostring(pool)];
        }
      }
      function tostring(a) {
        return String.fromCharCode.apply(0, a);
      }
      mixkey(math.random(), pool);
      if (typeof module2 == "object" && module2.exports) {
        module2.exports = seedrandom;
        try {
          nodecrypto = require("crypto");
        } catch (ex) {
        }
      } else if (typeof define == "function" && define.amd) {
        define(function() {
          return seedrandom;
        });
      } else {
        math["seed" + rngname] = seedrandom;
      }
    })(typeof self !== "undefined" ? self : exports, [], Math);
  }
});

// node_modules/seedrandom/index.js
var require_seedrandom2 = __commonJS({
  "node_modules/seedrandom/index.js"(exports, module2) {
    var alea = require_alea();
    var xor128 = require_xor128();
    var xorwow = require_xorwow();
    var xorshift7 = require_xorshift7();
    var xor4096 = require_xor4096();
    var tychei = require_tychei();
    var sr = require_seedrandom();
    sr.alea = alea;
    sr.xor128 = xor128;
    sr.xorwow = xorwow;
    sr.xorshift7 = xorshift7;
    sr.xor4096 = xor4096;
    sr.tychei = tychei;
    module2.exports = sr;
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  addLocale: () => addLocale,
  array: () => array,
  arrayElement: () => arrayElement,
  bitcoinAddress: () => bitcoinAddress,
  boolean: () => boolean,
  cityName: () => cityName,
  cityPrefix: () => cityPrefix,
  citySuffix: () => citySuffix,
  color: () => color,
  country: () => country,
  county: () => county,
  creditCardCVV: () => creditCardCVV,
  creditCardNumber: () => creditCardNumber,
  date: () => date,
  default: () => src_default,
  dirPath: () => dirPath,
  direction: () => direction,
  domainName: () => domainName,
  domainSuffix: () => domainSuffix,
  domainUrl: () => domainUrl,
  email: () => email,
  fileExt: () => fileExt,
  fileName: () => fileName,
  filePath: () => filePath,
  firstName: () => firstName,
  hex: () => hex,
  imageUrlFromPlaceIMG: () => imageUrlFromPlaceIMG,
  imageUrlFromPlaceholder: () => imageUrlFromPlaceholder,
  ip: () => ip,
  ipv6: () => ipv6,
  jobArea: () => jobArea,
  jobDescriptor: () => jobDescriptor,
  jobTitle: () => jobTitle,
  jobType: () => jobType,
  lastName: () => lastName,
  latLong: () => latLong,
  latitude: () => latitude,
  longitude: () => longitude,
  macAddress: () => macAddress,
  mimeType: () => mimeType,
  month: () => month,
  name: () => name,
  nanoId: () => nanoId,
  nonsecure: () => nonsecure,
  number: () => number,
  objectElement: () => objectElement,
  password: () => password,
  phoneNumber: () => phoneNumber,
  port: () => port,
  price: () => price,
  province: () => province,
  semver: () => semver,
  setDefaultLocale: () => setDefaultLocale,
  setSeed: () => setSeed,
  state: () => state,
  streetAddress: () => streetAddress,
  streetName: () => streetName,
  streetPrefix: () => streetPrefix,
  streetSuffix: () => streetSuffix,
  timeZone: () => timeZone,
  username: () => username,
  uuid: () => uuid,
  weekday: () => weekday,
  word: () => word,
  zipCode: () => zipCode
});
var import_seedrandom = __toESM(require_seedrandom2());
var _nanoid = __toESM(require("nanoid"));
var _nanoid_nonsecure = __toESM(require("nanoid/non-secure"));
var _uuid = __toESM(require("uuid"));

// src/data/creditCardProviders.ts
var americanExpress = [
  "34##-######-####L",
  "37##-######-####L"
];
var dinersClub = [
  "30[0-5]#-######-###L",
  "36##-######-###L",
  "54##-####-####-###L"
];
var discover = [
  "6011-####-####-###L",
  "65##-####-####-###L",
  "64[4-9]#-####-####-###L",
  "6011-62##-####-####-###L",
  "65##-62##-####-####-###L",
  "64[4-9]#-62##-####-####-###L"
];
var instapayment = [
  "63[7-9]#-####-####-###L"
];
var jcb = [
  "3528-####-####-###L",
  "3529-####-####-###L",
  "35[3-8]#-####-####-###L"
];
var laser = [
  "6304###########L",
  "6706###########L",
  "6771###########L",
  "6709###########L",
  "6304#########{5,6}L",
  "6706#########{5,6}L",
  "6771#########{5,6}L",
  "6709#########{5,6}L"
];
var maestro = [
  "5018-#{4}-#{4}-#{3}L",
  "5020-#{4}-#{4}-#{3}L",
  "5038-#{4}-#{4}-#{3}L",
  "5893-#{4}-#{4}-#{3}L",
  "6304-#{4}-#{4}-#{3}L",
  "6759-#{4}-#{4}-#{3}L",
  "676[1-3]-####-####-###L",
  "5018#{11,15}L",
  "5020#{11,15}L",
  "5038#{11,15}L",
  "5893#{11,15}L",
  "6304#{11,15}L",
  "6759#{11,15}L",
  "676[1-3]#{11,15}L"
];
var mastercard = [
  "5[1-5]##-####-####-###L",
  "6771-89##-####-###L"
];
var solo = [
  "6767-####-####-###L",
  "6767-####-####-####-#L",
  "6767-####-####-####-##L"
];
var visa = [
  "4###########L",
  "4###-####-####-###L"
];
var creditCardProviders_default = {
  visa,
  solo,
  mastercard,
  maestro,
  laser,
  jcb,
  instapayment,
  americanExpress,
  dinersClub,
  discover
};

// src/helpers/checkLuhn.ts
var checkLuhn_default = (numbers) => {
  numbers.reverse();
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    let digit = numbers[i];
    if (i % 2 === 0)
      digit *= 2;
    if (digit > 9)
      sum -= 9;
    sum += digit;
  }
  return 10 - sum % 10;
};

// src/data/chars.ts
var alphabet = `abcdefghijklnmopqrstuvwxyz`;
var base10 = `123456789`;
var symbols = `!"#$%&'()*+,-./:;<=>?@[]^_\`{|}~`;
var passwordSymbols = `?.,!_-~$%+=`;
var similarLetters = `ilLIoO0`;
var chars_default = {
  alphabet,
  base10,
  symbols,
  similarLetters,
  passwordSymbols
};

// src/helpers/replaceStrings.ts
var replaceSymbols = (value) => {
  const alphabet2 = chars_default.alphabet.toUpperCase().split("");
  return value.split("").map((c) => {
    if (c === "#")
      return number({ max: 9 }).toString();
    if (c === "?")
      return arrayElement(alphabet2);
    if (c === "*") {
      if (boolean())
        return arrayElement(alphabet2);
      else
        return number({ max: 9 }).toString();
    }
    return c;
  }).join("");
};
var rangeRepRegex = new RegExp(/(.)\{(\d+)\,(\d+)\}/, "g");
var repRegex = new RegExp(/(.)\{(\d+)\}/, "g");
var rangeRegex = new RegExp(/\[(\d+)\-(\d+)\]/, "g");
var regexMatchAllArray = (value, regex) => [...value.matchAll(regex)];
var replaceRangeSymbols = (value) => {
  let newValue = value.slice();
  regexMatchAllArray(newValue, rangeRepRegex).forEach((values) => {
    const [match, symbol, min, max] = values;
    const valueToReplace = array(number({ min: parseInt(min), max: parseInt(max) }), () => replaceSymbols(symbol)).join("");
    newValue = newValue.replace(match, valueToReplace);
  });
  regexMatchAllArray(newValue, repRegex).forEach((values) => {
    const [match, symbol, count] = values;
    const valueToReplace = array(parseInt(count), () => replaceSymbols(symbol)).join("");
    newValue = newValue.replace(match, valueToReplace);
  });
  regexMatchAllArray(newValue, rangeRegex).forEach((values) => {
    const [match, min, max] = values;
    const valueToReplace = number({ min: parseInt(min), max: parseInt(max) }).toString();
    newValue = newValue.replace(match, valueToReplace);
  });
  return newValue;
};

// src/data/dirPaths.ts
var dirPaths_default = [
  "/Applications",
  "/bin",
  "/boot",
  "/boot/defaults",
  "/dev",
  "/etc",
  "/etc/defaults",
  "/etc/mail",
  "/etc/namedb",
  "/etc/periodic",
  "/etc/ppp",
  "/home",
  "/home/user",
  "/home/user/dir",
  "/lib",
  "/Library",
  "/lost+found",
  "/media",
  "/mnt",
  "/net",
  "/Network",
  "/opt",
  "/opt/bin",
  "/opt/include",
  "/opt/lib",
  "/opt/sbin",
  "/opt/share",
  "/private",
  "/private/tmp",
  "/private/var",
  "/proc",
  "/rescue",
  "/root",
  "/sbin",
  "/selinux",
  "/srv",
  "/sys",
  "/System",
  "/tmp",
  "/Users",
  "/usr",
  "/usr/X11R6",
  "/usr/bin",
  "/usr/include",
  "/usr/lib",
  "/usr/libdata",
  "/usr/libexec",
  "/usr/local/bin",
  "/usr/local/src",
  "/usr/obj",
  "/usr/ports",
  "/usr/sbin",
  "/usr/share",
  "/usr/src",
  "/var",
  "/var/log",
  "/var/mail",
  "/var/spool",
  "/var/tmp",
  "/var/yp"
];

// src/data/commonMimeTypes.ts
var commonMimeTypes_default = {
  ".apk": "application/vnd.android.package-archive",
  ".avi": "video/x-msvideo",
  ".bin": "application/octet-stream",
  ".bmp": "image/bmp",
  ".conf": "text/plain",
  ".css": "text/css",
  ".csv": "text/csv",
  ".deb": "application/x-debian-package",
  ".dll": "application/x-msdownload",
  ".dmg": "application/octet-stream",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".dump": "application/octet-stream",
  ".dvi": "application/x-dvi",
  ".eps": "application/postscript",
  ".epub": "application/epub+zip",
  ".exe": "application/x-msdownload",
  ".f4v": "video/x-f4v",
  ".flv": "video/x-flv",
  ".gif": "image/gif",
  ".h264": "video/h264",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".iso": "application/octet-stream",
  ".jar": "application/java-archive",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".log": "text/plain",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".msi": "application/x-msdownload",
  ".odb": "application/vnd.oasis.opendocument.database",
  ".odc": "application/vnd.oasis.opendocument.chart",
  ".odf": "application/vnd.oasis.opendocument.formula",
  ".odft": "application/vnd.oasis.opendocument.formula-template",
  ".odg": "application/vnd.oasis.opendocument.graphics",
  ".odi": "application/vnd.oasis.opendocument.image",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".ogg": "audio/ogg",
  ".ogv": "video/ogg",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".psd": "image/vnd.adobe.photoshop",
  ".qt": "video/quicktime",
  ".rss": "application/rss+xml",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".tar": "application/x-tar",
  ".tgz": "application/x-gzip",
  ".tiff": "image/tiff",
  ".torrent": "application/x-bittorrent",
  ".ttf": "application/x-font-ttf",
  ".txt": "text/plain",
  ".udeb": "application/x-debian-package",
  ".xls": "application/vnd.ms-excel",
  ".xml": "application/xml",
  ".xsl": "application/xml",
  ".zip": "application/zip"
};

// src/index.ts
var locales = {};
var defaultLocale = null;
var random = (0, import_seedrandom.default)();
var throwNoDefaultLocale = () => {
  throw new Error(`No default locale defined. Import at least one locale!`);
};
var throwNoLocale = (locale) => {
  throw new Error(`The locale [${locale}] is not imported or supported.`);
};
var throwNoLocaleData = (locale, key) => {
  throw new Error(`The locale [${locale}] data of [${key}] doest not exists. Mostly not implemented yet!.`);
};
var getLocaleData = ({ locale: _locale, key }) => {
  if (!defaultLocale)
    throwNoDefaultLocale();
  const locale = _locale || defaultLocale;
  if (!locales[locale])
    throwNoLocale(locale);
  const localeData = locales[locale];
  if (!localeData[key])
    throwNoLocaleData(locale, key);
  return localeData[key];
};
var nanoId = _nanoid;
var nonsecure = _nanoid_nonsecure;
var uuid = _uuid;
var setSeed = (seed) => {
  random = (0, import_seedrandom.default)(seed);
};
var addLocale = (name2, localeData) => {
  const noLocales = Object.keys(locales).length === 0;
  locales[name2] = localeData;
  if (noLocales)
    setDefaultLocale(name2);
};
var setDefaultLocale = (locale) => {
  if (!locales[locale])
    throwNoLocale(locale);
  defaultLocale = locale;
};
var number = (options = {}) => {
  const { min, max, float } = { min: 0, max: 1, float: false, ...options };
  const value = min + random.quick() * (max - min);
  if (!float)
    return Math.round(value);
  return value;
};
var boolean = () => {
  return !!number({ max: 1 });
};
var arrayElement = (array2) => {
  return array2[number({ max: array2.length - 1 })];
};
var array = (count, cb) => {
  let newArray = [];
  for (let i = 0; i < count; i++) {
    newArray = [...newArray, cb(i)];
  }
  return newArray;
};
var objectElement = (obj) => {
  if (typeof obj !== "object" || Array.isArray(obj))
    throw new Error(`obj must be an object.`);
  const keys = Object.keys(obj);
  const key = arrayElement(keys);
  return { key, value: obj[key] };
};
var firstName = (options = {}) => {
  const { locale, gender } = options;
  switch (gender) {
    case "female":
      const femaleFirstNames = getLocaleData({ locale, key: "femaleFirstNames" });
      return arrayElement(femaleFirstNames);
    case "male":
      const maleFirstNames = getLocaleData({ locale, key: "maleFirstNames" });
      return arrayElement(maleFirstNames);
    default:
      const firstNames = getLocaleData({ locale, key: "firstNames" });
      return arrayElement(firstNames);
  }
};
var phoneNumber = (options = {}) => {
  const { locale, formats } = options;
  const phoneFormats = formats || getLocaleData({ locale, key: "phoneFormats" });
  return arrayElement(phoneFormats).split("").map((c) => {
    if (c === "#")
      return number({ max: 9 });
    return c;
  }).join("");
};
var county = (options = {}) => {
  const { locale } = options;
  const counties = getLocaleData({ locale, key: "counties" });
  return arrayElement(counties);
};
var province = (options = {}) => {
  const { locale } = options;
  const provinces = getLocaleData({ locale, key: "provinces" });
  return arrayElement(provinces);
};
var cityName = (options = {}) => {
  const { locale } = options;
  const cityNames = getLocaleData({ locale, key: "cityNames" });
  return arrayElement(cityNames);
};
var cityPrefix = (options = {}) => {
  const { locale } = options;
  const cityPrefixes = getLocaleData({ locale, key: "cityPrefixes" });
  return arrayElement(cityPrefixes);
};
var citySuffix = (options = {}) => {
  const { locale } = options;
  const citySuffixes = getLocaleData({ locale, key: "citySuffixes" });
  return arrayElement(citySuffixes);
};
var imageUrlFromPlaceIMG = (options) => {
  const { width, height, category, filter } = { category: "any", ...options };
  const url = `https://placeimg.com/${width}/${height}/${category}`;
  if (filter)
    url + `/${filter}`;
  return url;
};
var imageUrlFromPlaceholder = (options) => {
  const { width, height, backColor, textColor, textValue } = options;
  let url = `https://via.placeholder.com/${width}`;
  if (height)
    url + `x${height}`;
  if (backColor)
    url + `/${backColor}`;
  if (textColor)
    url + `/${textColor}`;
  if (textValue)
    url + `?text=${textValue}`;
  return url;
};
var lastName = (options = {}) => {
  const { locale } = options;
  const lastNames = getLocaleData({ locale, key: "lastNames" });
  return arrayElement(lastNames);
};
var name = (options) => {
  return `${firstName(options)} ${lastName(options)}`;
};
var jobTitle = (options) => {
  return `${jobDescriptor(options)} ${jobArea(options)} ${jobType(options)}`;
};
var jobType = (options = {}) => {
  const { locale } = options;
  const jobTypes = getLocaleData({ locale, key: "jobTypes" });
  return arrayElement(jobTypes);
};
var jobArea = (options = {}) => {
  const { locale } = options;
  const jobLevels = getLocaleData({ locale, key: "jobLevels" });
  return arrayElement(jobLevels);
};
var jobDescriptor = (options = {}) => {
  const { locale } = options;
  const jobDescriptors = getLocaleData({ locale, key: "jobDescriptors" });
  return arrayElement(jobDescriptors);
};
var ip = () => {
  return array(4, () => number({ max: 255 })).join(".");
};
var port = () => {
  return number({ max: 65535 });
};
var ipv6 = () => {
  return array(8, () => number({ max: 65535 }).toString(16)).join(":");
};
var hexPadLeft = (value) => {
  if (value.length === 1)
    return `0${value}`;
  return value;
};
var color = (options = {}) => {
  const { r, g, b } = options;
  const red = (r || number({ max: 256 })).toString(16);
  const green = (g || number({ max: 256 })).toString(16);
  const blue = (b || number({ max: 256 })).toString(16);
  return `#${hexPadLeft(red)}${hexPadLeft(green)}${hexPadLeft(blue)}`;
};
var hex = (count = 1) => {
  let hexString = "";
  array(count, () => hexString += number({ max: 15 }).toString(16));
  return `0x${hexString}`;
};
var word = (options = {}) => {
  const { type, locale, filter } = options;
  const _type = type || arrayElement(Object.values(["verb", "preposition", "noun", "interjection", "conjunction", "adverb", "adjective"]));
  const adjectives = getLocaleData({ locale, key: `${_type}s` });
  if (typeof filter === "function")
    return arrayElement(adjectives.filter(filter));
  return arrayElement(adjectives);
};
var username = (options = {}) => {
  const { locale, type: _type, firstName: _firstName, lastName: _lastName } = options;
  const newFirstName = _firstName || firstName({ locale });
  const newLastName = _lastName || lastName({ locale });
  const type = typeof _type !== "undefined" ? _type : number({ max: 2 });
  switch (type) {
    case 0:
      return newFirstName + number({ max: 99 });
    case 1:
      return newFirstName + arrayElement([".", "_"]) + newLastName;
    case 2:
      return newFirstName + arrayElement([".", "_"]) + newLastName + number({ max: 99 });
  }
};
var macAddress = (options = {}) => {
  const { separator = "-", transmission, administration } = options;
  const mac = array(6, (index) => {
    let value = number({ max: 255 });
    if (index === 0) {
      if (transmission === "multicast")
        value |= 1 << 0;
      else if (transmission === "unicast")
        value &= ~(1 << 0);
      if (administration === "laa")
        value |= 1 << 1;
      else if (administration === "uaa")
        value &= ~(1 << 1);
    }
    return hexPadLeft(value.toString(16));
  });
  if (separator === ".") {
    let dotMac = "";
    for (let i = 0; i < mac.length; i++) {
      dotMac += mac[i];
      if (i % 2 == 1 && i < mac.length - 1)
        dotMac += separator;
    }
    return dotMac;
  }
  return mac.join(separator);
};
var email = (options = {}) => {
  const { locale, provider: _provider } = options;
  const freeEmails = getLocaleData({ locale, key: "freeEmails" });
  const provider = _provider || arrayElement(freeEmails);
  return `${username(options)}@${provider}`;
};
var domainName = (options = {}) => {
  const { locale } = options;
  const name2 = arrayElement([
    word({ locale, type: "noun" }),
    firstName({ locale })
  ]);
  return `${name2.toLowerCase()}.${domainSuffix({ locale })}`;
};
var domainSuffix = (options = {}) => {
  const { locale } = options;
  const domainSuffixes = getLocaleData({ locale, key: "domainSuffixes" });
  return arrayElement(domainSuffixes);
};
var domainUrl = (options = {}) => `https://${domainName(options)}`;
var zipCode = (options = {}) => {
  const { locale, format: _format } = options;
  let format = _format;
  if (!format) {
    const formats = getLocaleData({ locale, key: "postCodeFormats" });
    format = arrayElement(formats);
  }
  return replaceSymbols(format);
};
var streetSuffix = (options = {}) => {
  const { locale } = options;
  const streetSuffixes = getLocaleData({ locale, key: "streetSuffixes" });
  return arrayElement(streetSuffixes);
};
var streetPrefix = (options = {}) => {
  const { locale } = options;
  const streetSuffixes = getLocaleData({ locale, key: "streetPrefixes" });
  return arrayElement(streetSuffixes);
};
var streetName = (options = {}) => {
  return `${arrayElement([firstName(options), lastName(options)])} ${streetSuffix(options)}`;
};
var streetAddress = (options = {}) => {
  const streetNumber = array(number({ min: 3, max: 5 }), () => number({ max: 9 })).join("");
  return `${streetNumber} ${streetName(options)}`;
};
var timeZone = (options = {}) => {
  const { locale } = options;
  const timeZones = getLocaleData({ locale, key: "timeZones" });
  return arrayElement(timeZones);
};
var latitude = () => {
  return number({ min: -90, max: 90, float: true }).toFixed(6);
};
var longitude = () => {
  return number({ min: -180, max: 180, float: true }).toFixed(6);
};
var latLong = () => {
  return `${latitude()}, ${longitude()}`;
};
var direction = (options = {}) => {
  const { locale, type, useAbbr } = options;
  const directions = getLocaleData({ locale, key: "directions" });
  const allDirections = [...directions.cardinal, ...directions.ordinal];
  const mapValue = (value) => useAbbr ? value[1] : value[0];
  if (type)
    return arrayElement(directions[type].map(mapValue));
  return arrayElement(allDirections.map(mapValue));
};
var state = (options = {}) => {
  const { locale, useAbbr } = options;
  const states = useAbbr ? getLocaleData({ locale, key: "stateAbbrs" }) : getLocaleData({ locale, key: "states" });
  return arrayElement(states);
};
var country = (options = {}) => {
  const { locale, useCode } = options;
  const getLocaleDataKey = () => {
    switch (useCode) {
      case "alpha2":
        return "countryCodesAlpha2";
      case "alpha3":
        return "countryCodesAlpha3";
      default:
        return "countries";
    }
  };
  const countries = getLocaleData({ locale, key: getLocaleDataKey() });
  return arrayElement(countries);
};
var price = (options = {}) => {
  const { locale: _locale, min, max, currency: _currency } = { min: 0, max: 1e3, ...options };
  const locale = _locale || defaultLocale;
  const currency = _currency || locales[locale] && locales[locale]["defaultCurrency"];
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  return formatter.format(number({ min, max, float: true }));
};
var creditCardNumber = (options = {}) => {
  const { provider } = options;
  const providerFormats = provider ? creditCardProviders_default[provider] : Object.values(creditCardProviders_default).flat();
  let cardNumberFormat = arrayElement(providerFormats);
  cardNumberFormat = replaceSymbols(cardNumberFormat);
  cardNumberFormat = replaceRangeSymbols(cardNumberFormat);
  const cardNumbers = cardNumberFormat.replace(/\D/g, "").split("").map((v) => parseInt(v));
  const luhnNumber = checkLuhn_default(cardNumbers);
  cardNumberFormat = cardNumberFormat.replace("L", luhnNumber.toString());
  return cardNumberFormat;
};
var creditCardCVV = () => {
  return array(3, () => number({ max: 9 })).join("");
};
var semver = () => {
  return [number({ max: 9 }), number({ max: 20 }), number({ max: 99 })].join(".");
};
var month = (options = {}) => {
  const { locale, useAbbr } = options;
  const months = getLocaleData({ locale, key: "months" });
  const { wide, abbr } = months;
  return arrayElement(useAbbr ? abbr : wide);
};
var weekday = (options = {}) => {
  const { locale, useAbbr } = options;
  const weekdays = getLocaleData({ locale, key: "weekdays" });
  const { wide, abbr } = weekdays;
  return arrayElement(useAbbr ? abbr : wide);
};
var date = (options = {}) => {
  const { from: _from, to: _to } = options;
  const from = _from || new Date(0);
  const to = _to || new Date();
  const fromEpoch = from.getTime();
  const toEpoch = to.getTime();
  return new Date(number({ min: fromEpoch, max: toEpoch }));
};
var bitcoinAddress = () => {
  const prefix = arrayElement(["1", "3", "bc1"]);
  const count = number({ min: 27, max: 34 });
  const characters = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${prefix}${array(count, () => arrayElement(characters.split(""))).join("")}`;
};
var mimeType = () => {
  return arrayElement(Object.values(commonMimeTypes_default));
};
var fileExt = () => {
  return arrayElement(Object.keys(commonMimeTypes_default));
};
var dirPath = () => {
  return arrayElement(dirPaths_default);
};
var fileName = () => {
  const words = array(number({ max: 3 }), () => word());
  return `${words.join("_").toLocaleLowerCase()}${fileExt()}`;
};
var filePath = () => {
  return `${dirPath()}/${fileName()}`;
};
var password = (options = {}) => {
  const { minLength, maxLength, numbers, symbols: symbols2, uppercases, lowercases } = options;
  let passUpercases = true;
  if (typeof uppercases === "boolean")
    passUpercases = uppercases;
  let passLowercases = true;
  if (typeof lowercases === "boolean")
    passLowercases = lowercases;
  if (!passUpercases && !passLowercases)
    throw new Error(`[uppercases] and [lowercases] can't both be false.`);
  const passMinLength = minLength || 6;
  const passMaxLength = maxLength || 10;
  const alphabetList = chars_default.alphabet.split("");
  const numberList = chars_default.base10.split("");
  let symbolList = chars_default.passwordSymbols.split("");
  if (passMinLength < 5)
    throw new Error(`[minLength] must be > 5.`);
  if (passMinLength > passMaxLength)
    throw new Error(`[minLength] must be <= to [maxLength].`);
  if (passMaxLength < passMinLength)
    throw new Error(`[maxLength] must be >= to [minLength].`);
  const passLength = number({ min: passMinLength, max: passMaxLength });
  let passNumbers = typeof numbers === "boolean" && !numbers ? 0 : number({ min: 1, max: Math.floor(passMinLength / 2) });
  if (typeof numbers === "number") {
    if (numbers > passMinLength)
      throw new Error(`[numbers] must be <= to [minLength].`);
    passNumbers = numbers;
  }
  let passSymbols = typeof symbols2 === "boolean" && !symbols2 ? 0 : 1;
  if (typeof symbols2 === "string") {
    symbolList = symbols2.split("");
    passSymbols = symbolList.length;
  }
  if (typeof symbols2 === "number") {
    passSymbols = symbols2;
  }
  if (passSymbols + passNumbers > passMinLength)
    throw new Error(`The sum of [symbols(${passSymbols})] and [numbers(${passNumbers})] must be <= to [minLength(${passMinLength})].`);
  if (passSymbols > passMinLength)
    throw new Error(`[symbols] must be <= to [minLength]`);
  let types = ["letter", "number", "symbol"];
  let _passSymbols = 0, _passNumbers = 0;
  return array(passLength, () => {
    if (_passNumbers === passNumbers) {
      _passNumbers++;
      types.splice(types.indexOf("number"), 1);
    }
    if (_passSymbols === passSymbols) {
      _passSymbols++;
      types.splice(types.indexOf("symbol"), 1);
    }
    const charType = types.length === 1 ? types[0] : arrayElement(types);
    if (charType === "number") {
      _passNumbers++;
      return arrayElement(numberList);
    }
    if (charType === "symbol") {
      _passSymbols++;
      return arrayElement(symbolList);
    }
    const letter = arrayElement(alphabetList);
    if (passUpercases && passLowercases) {
      const toUpper = boolean();
      return toUpper ? letter.toUpperCase() : letter;
    } else if (passUpercases && !passLowercases) {
      return letter.toUpperCase();
    } else {
      return letter;
    }
  }).join("");
};
var src_default = {
  setDefaultLocale,
  addLocale,
  cityName,
  citySuffix,
  cityPrefix,
  number,
  phoneNumber,
  firstName,
  arrayElement,
  boolean,
  imageUrlFromPlaceIMG,
  imageUrlFromPlaceholder,
  objectElement,
  array,
  lastName,
  name,
  jobTitle,
  jobArea,
  jobDescriptor,
  jobType,
  ip,
  port,
  word,
  ipv6,
  color,
  username,
  macAddress,
  domainSuffix,
  domainName,
  email,
  domainUrl,
  zipCode,
  streetPrefix,
  streetSuffix,
  streetName,
  streetAddress,
  timeZone,
  latitude,
  longitude,
  latLong,
  direction,
  state,
  country,
  county,
  province,
  price,
  creditCardNumber,
  creditCardCVV,
  semver,
  month,
  weekday,
  date,
  bitcoinAddress,
  mimeType,
  fileExt,
  dirPath,
  filePath,
  fileName,
  setSeed,
  hex,
  password,
  nanoId,
  uuid,
  nonsecure
};
module.exports = __toCommonJS(src_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addLocale,
  array,
  arrayElement,
  bitcoinAddress,
  boolean,
  cityName,
  cityPrefix,
  citySuffix,
  color,
  country,
  county,
  creditCardCVV,
  creditCardNumber,
  date,
  dirPath,
  direction,
  domainName,
  domainSuffix,
  domainUrl,
  email,
  fileExt,
  fileName,
  filePath,
  firstName,
  hex,
  imageUrlFromPlaceIMG,
  imageUrlFromPlaceholder,
  ip,
  ipv6,
  jobArea,
  jobDescriptor,
  jobTitle,
  jobType,
  lastName,
  latLong,
  latitude,
  longitude,
  macAddress,
  mimeType,
  month,
  name,
  nanoId,
  nonsecure,
  number,
  objectElement,
  password,
  phoneNumber,
  port,
  price,
  province,
  semver,
  setDefaultLocale,
  setSeed,
  state,
  streetAddress,
  streetName,
  streetPrefix,
  streetSuffix,
  timeZone,
  username,
  uuid,
  weekday,
  word,
  zipCode
});
