/**
* @vue/compiler-sfc v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var compilerCore = require('@vue/compiler-core');
var CompilerDOM = require('@vue/compiler-dom');
var sourceMapJs = require('source-map-js');
var shared = require('@vue/shared');
var path$1 = require('path');
var url = require('url');
var CompilerSSR = require('@vue/compiler-ssr');
var require$$2 = require('util');
var require$$0 = require('fs');
var require$$0$1 = require('postcss');
var estreeWalker = require('estree-walker');
var MagicString = require('magic-string');
var parser$2 = require('@babel/parser');
var process$1 = require('process');

function _interopNamespaceDefault(e) {
	var n = Object.create(null);
	if (e) {
		for (var k in e) {
			n[k] = e[k];
		}
	}
	n.default = e;
	return Object.freeze(n);
}

var CompilerDOM__namespace = /*#__PURE__*/_interopNamespaceDefault(CompilerDOM);
var CompilerSSR__namespace = /*#__PURE__*/_interopNamespaceDefault(CompilerSSR);
var process__namespace = /*#__PURE__*/_interopNamespaceDefault(process$1);

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var hashSum;
var hasRequiredHashSum;

function requireHashSum () {
	if (hasRequiredHashSum) return hashSum;
	hasRequiredHashSum = 1;

	function pad (hash, len) {
	  while (hash.length < len) {
	    hash = '0' + hash;
	  }
	  return hash;
	}

	function fold (hash, text) {
	  var i;
	  var chr;
	  var len;
	  if (text.length === 0) {
	    return hash;
	  }
	  for (i = 0, len = text.length; i < len; i++) {
	    chr = text.charCodeAt(i);
	    hash = ((hash << 5) - hash) + chr;
	    hash |= 0;
	  }
	  return hash < 0 ? hash * -2 : hash;
	}

	function foldObject (hash, o, seen) {
	  return Object.keys(o).sort().reduce(foldKey, hash);
	  function foldKey (hash, key) {
	    return foldValue(hash, o[key], key, seen);
	  }
	}

	function foldValue (input, value, key, seen) {
	  var hash = fold(fold(fold(input, key), toString(value)), typeof value);
	  if (value === null) {
	    return fold(hash, 'null');
	  }
	  if (value === undefined) {
	    return fold(hash, 'undefined');
	  }
	  if (typeof value === 'object' || typeof value === 'function') {
	    if (seen.indexOf(value) !== -1) {
	      return fold(hash, '[Circular]' + key);
	    }
	    seen.push(value);

	    var objHash = foldObject(hash, value, seen);

	    if (!('valueOf' in value) || typeof value.valueOf !== 'function') {
	      return objHash;
	    }

	    try {
	      return fold(objHash, String(value.valueOf()))
	    } catch (err) {
	      return fold(objHash, '[valueOf exception]' + (err.stack || err.message))
	    }
	  }
	  return fold(hash, value.toString());
	}

	function toString (o) {
	  return Object.prototype.toString.call(o);
	}

	function sum (o) {
	  return pad(foldValue(0, o, '', []).toString(16), 8);
	}

	hashSum = sum;
	return hashSum;
}

var hashSumExports = /*@__PURE__*/ requireHashSum();
var hash = /*@__PURE__*/getDefaultExportFromCjs(hashSumExports);

const CSS_VARS_HELPER = `useCssVars`;
function genCssVarsFromList(vars, id, isProd, isSSR = false) {
  return `{
  ${vars.map(
    (key) => (
      // The `:` prefix here is used in `ssrRenderStyle` to distinguish whether
      // a custom property comes from `ssrCssVars`. If it does, we need to reset
      // its value to `initial` on the component instance to avoid unintentionally
      // inheriting the same property value from a different instance of the same
      // component in the outer scope.
      `"${isSSR ? `:--` : ``}${genVarName(id, key, isProd, isSSR)}": (${key})`
    )
  ).join(",\n  ")}
}`;
}
function genVarName(id, raw, isProd, isSSR = false) {
  if (isProd) {
    return hash(id + raw).replace(/^\d/, (r) => `v${r}`);
  } else {
    return `${id}-${shared.getEscapedCssVarName(raw, isSSR)}`;
  }
}
function normalizeExpression(exp) {
  exp = exp.trim();
  if (exp[0] === `'` && exp[exp.length - 1] === `'` || exp[0] === `"` && exp[exp.length - 1] === `"`) {
    return exp.slice(1, -1);
  }
  return exp;
}
const vBindRE = /v-bind\s*\(/g;
function parseCssVars(sfc) {
  const vars = [];
  sfc.styles.forEach((style) => {
    let match;
    const content = style.content.replace(/\/\*([\s\S]*?)\*\/|\/\/.*/g, "");
    while (match = vBindRE.exec(content)) {
      const start = match.index + match[0].length;
      const end = lexBinding(content, start);
      if (end !== null) {
        const variable = normalizeExpression(content.slice(start, end));
        if (!vars.includes(variable)) {
          vars.push(variable);
        }
      }
    }
  });
  return vars;
}
function lexBinding(content, start) {
  let state = 0 /* inParens */;
  let parenDepth = 0;
  for (let i = start; i < content.length; i++) {
    const char = content.charAt(i);
    switch (state) {
      case 0 /* inParens */:
        if (char === `'`) {
          state = 1 /* inSingleQuoteString */;
        } else if (char === `"`) {
          state = 2 /* inDoubleQuoteString */;
        } else if (char === `(`) {
          parenDepth++;
        } else if (char === `)`) {
          if (parenDepth > 0) {
            parenDepth--;
          } else {
            return i;
          }
        }
        break;
      case 1 /* inSingleQuoteString */:
        if (char === `'`) {
          state = 0 /* inParens */;
        }
        break;
      case 2 /* inDoubleQuoteString */:
        if (char === `"`) {
          state = 0 /* inParens */;
        }
        break;
    }
  }
  return null;
}
const cssVarsPlugin = (opts) => {
  const { id, isProd } = opts;
  return {
    postcssPlugin: "vue-sfc-vars",
    Declaration(decl) {
      const value = decl.value;
      if (vBindRE.test(value)) {
        vBindRE.lastIndex = 0;
        let transformed = "";
        let lastIndex = 0;
        let match;
        while (match = vBindRE.exec(value)) {
          const start = match.index + match[0].length;
          const end = lexBinding(value, start);
          if (end !== null) {
            const variable = normalizeExpression(value.slice(start, end));
            transformed += value.slice(lastIndex, match.index) + `var(--${genVarName(id, variable, isProd)})`;
            lastIndex = end + 1;
          }
        }
        decl.value = transformed + value.slice(lastIndex);
      }
    }
  };
};
cssVarsPlugin.postcss = true;
function genCssVarsCode(vars, bindings, id, isProd) {
  const varsExp = genCssVarsFromList(vars, id, isProd);
  const exp = CompilerDOM.createSimpleExpression(varsExp, false);
  const context = CompilerDOM.createTransformContext(CompilerDOM.createRoot([]), {
    prefixIdentifiers: true,
    inline: true,
    bindingMetadata: bindings.__isScriptSetup === false ? void 0 : bindings
  });
  const transformed = CompilerDOM.processExpression(exp, context);
  const transformedString = transformed.type === 4 ? transformed.content : transformed.children.map((c) => {
    return typeof c === "string" ? c : c.content;
  }).join("");
  return `_${CSS_VARS_HELPER}(_ctx => (${transformedString}))`;
}
function genNormalScriptCssVarsCode(cssVars, bindings, id, isProd, defaultVar) {
  return `
import { ${CSS_VARS_HELPER} as _${CSS_VARS_HELPER} } from 'vue'
const __injectCSSVars__ = () => {
${genCssVarsCode(
    cssVars,
    bindings,
    id,
    isProd
  )}}
const __setup__ = ${defaultVar}.setup
${defaultVar}.setup = __setup__
  ? (props, ctx) => { __injectCSSVars__();return __setup__(props, ctx) }
  : __injectCSSVars__
`;
}

/**
 * @module LRUCache
 */
const perf = typeof performance === 'object' &&
    performance &&
    typeof performance.now === 'function'
    ? performance
    : Date;
const warned = new Set();
/* c8 ignore start */
const PROCESS = (typeof process === 'object' && !!process ? process : {});
/* c8 ignore start */
const emitWarning = (msg, type, code, fn) => {
    typeof PROCESS.emitWarning === 'function'
        ? PROCESS.emitWarning(msg, type, code, fn)
        : console.error(`[${code}] ${type}: ${msg}`);
};
let AC = globalThis.AbortController;
let AS = globalThis.AbortSignal;
/* c8 ignore start */
if (typeof AC === 'undefined') {
    //@ts-ignore
    AS = class AbortSignal {
        onabort;
        _onabort = [];
        reason;
        aborted = false;
        addEventListener(_, fn) {
            this._onabort.push(fn);
        }
    };
    //@ts-ignore
    AC = class AbortController {
        constructor() {
            warnACPolyfill();
        }
        signal = new AS();
        abort(reason) {
            if (this.signal.aborted)
                return;
            //@ts-ignore
            this.signal.reason = reason;
            //@ts-ignore
            this.signal.aborted = true;
            //@ts-ignore
            for (const fn of this.signal._onabort) {
                fn(reason);
            }
            this.signal.onabort?.(reason);
        }
    };
    let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== '1';
    const warnACPolyfill = () => {
        if (!printACPolyfillWarning)
            return;
        printACPolyfillWarning = false;
        emitWarning('AbortController is not defined. If using lru-cache in ' +
            'node 14, load an AbortController polyfill from the ' +
            '`node-abort-controller` package. A minimal polyfill is ' +
            'provided for use by LRUCache.fetch(), but it should not be ' +
            'relied upon in other contexts (eg, passing it to other APIs that ' +
            'use AbortController/AbortSignal might have undesirable effects). ' +
            'You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.', 'NO_ABORT_CONTROLLER', 'ENOTSUP', warnACPolyfill);
    };
}
/* c8 ignore stop */
const shouldWarn = (code) => !warned.has(code);
const isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
/* c8 ignore start */
// This is a little bit ridiculous, tbh.
// The maximum array length is 2^32-1 or thereabouts on most JS impls.
// And well before that point, you're caching the entire world, I mean,
// that's ~32GB of just integers for the next/prev links, plus whatever
// else to hold that many keys and values.  Just filling the memory with
// zeroes at init time is brutal when you get that big.
// But why not be complete?
// Maybe in the future, these limits will have expanded.
const getUintArray = (max) => !isPosInt(max)
    ? null
    : max <= Math.pow(2, 8)
        ? Uint8Array
        : max <= Math.pow(2, 16)
            ? Uint16Array
            : max <= Math.pow(2, 32)
                ? Uint32Array
                : max <= Number.MAX_SAFE_INTEGER
                    ? ZeroArray
                    : null;
/* c8 ignore stop */
class ZeroArray extends Array {
    constructor(size) {
        super(size);
        this.fill(0);
    }
}
class Stack {
    heap;
    length;
    // private constructor
    static #constructing = false;
    static create(max) {
        const HeapCls = getUintArray(max);
        if (!HeapCls)
            return [];
        Stack.#constructing = true;
        const s = new Stack(max, HeapCls);
        Stack.#constructing = false;
        return s;
    }
    constructor(max, HeapCls) {
        /* c8 ignore start */
        if (!Stack.#constructing) {
            throw new TypeError('instantiate Stack using Stack.create(n)');
        }
        /* c8 ignore stop */
        this.heap = new HeapCls(max);
        this.length = 0;
    }
    push(n) {
        this.heap[this.length++] = n;
    }
    pop() {
        return this.heap[--this.length];
    }
}
/**
 * Default export, the thing you're using this module to get.
 *
 * All properties from the options object (with the exception of
 * {@link OptionsBase.max} and {@link OptionsBase.maxSize}) are added as
 * normal public members. (`max` and `maxBase` are read-only getters.)
 * Changing any of these will alter the defaults for subsequent method calls,
 * but is otherwise safe.
 */
class LRUCache {
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
    static unsafeExposeInternals(c) {
        return {
            // properties
            starts: c.#starts,
            ttls: c.#ttls,
            sizes: c.#sizes,
            keyMap: c.#keyMap,
            keyList: c.#keyList,
            valList: c.#valList,
            next: c.#next,
            prev: c.#prev,
            get head() {
                return c.#head;
            },
            get tail() {
                return c.#tail;
            },
            free: c.#free,
            // methods
            isBackgroundFetch: (p) => c.#isBackgroundFetch(p),
            backgroundFetch: (k, index, options, context) => c.#backgroundFetch(k, index, options, context),
            moveToTail: (index) => c.#moveToTail(index),
            indexes: (options) => c.#indexes(options),
            rindexes: (options) => c.#rindexes(options),
            isStale: (index) => c.#isStale(index),
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
        const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort, } = options;
        if (max !== 0 && !isPosInt(max)) {
            throw new TypeError('max option must be a nonnegative integer');
        }
        const UintArray = max ? getUintArray(max) : Array;
        if (!UintArray) {
            throw new Error('invalid max value: ' + max);
        }
        this.#max = max;
        this.#maxSize = maxSize;
        this.maxEntrySize = maxEntrySize || this.#maxSize;
        this.sizeCalculation = sizeCalculation;
        if (this.sizeCalculation) {
            if (!this.#maxSize && !this.maxEntrySize) {
                throw new TypeError('cannot set sizeCalculation without setting maxSize or maxEntrySize');
            }
            if (typeof this.sizeCalculation !== 'function') {
                throw new TypeError('sizeCalculation set to non-function');
            }
        }
        if (fetchMethod !== undefined &&
            typeof fetchMethod !== 'function') {
            throw new TypeError('fetchMethod must be a function if specified');
        }
        this.#fetchMethod = fetchMethod;
        this.#hasFetchMethod = !!fetchMethod;
        this.#keyMap = new Map();
        this.#keyList = new Array(max).fill(undefined);
        this.#valList = new Array(max).fill(undefined);
        this.#next = new UintArray(max);
        this.#prev = new UintArray(max);
        this.#head = 0;
        this.#tail = 0;
        this.#free = Stack.create(max);
        this.#size = 0;
        this.#calculatedSize = 0;
        if (typeof dispose === 'function') {
            this.#dispose = dispose;
        }
        if (typeof disposeAfter === 'function') {
            this.#disposeAfter = disposeAfter;
            this.#disposed = [];
        }
        else {
            this.#disposeAfter = undefined;
            this.#disposed = undefined;
        }
        this.#hasDispose = !!this.#dispose;
        this.#hasDisposeAfter = !!this.#disposeAfter;
        this.noDisposeOnSet = !!noDisposeOnSet;
        this.noUpdateTTL = !!noUpdateTTL;
        this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
        this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
        this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
        this.ignoreFetchAbort = !!ignoreFetchAbort;
        // NB: maxEntrySize is set to maxSize if it's set
        if (this.maxEntrySize !== 0) {
            if (this.#maxSize !== 0) {
                if (!isPosInt(this.#maxSize)) {
                    throw new TypeError('maxSize must be a positive integer if specified');
                }
            }
            if (!isPosInt(this.maxEntrySize)) {
                throw new TypeError('maxEntrySize must be a positive integer if specified');
            }
            this.#initializeSizeTracking();
        }
        this.allowStale = !!allowStale;
        this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
        this.updateAgeOnGet = !!updateAgeOnGet;
        this.updateAgeOnHas = !!updateAgeOnHas;
        this.ttlResolution =
            isPosInt(ttlResolution) || ttlResolution === 0
                ? ttlResolution
                : 1;
        this.ttlAutopurge = !!ttlAutopurge;
        this.ttl = ttl || 0;
        if (this.ttl) {
            if (!isPosInt(this.ttl)) {
                throw new TypeError('ttl must be a positive integer if specified');
            }
            this.#initializeTTLTracking();
        }
        // do not allow completely unbounded caches
        if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0) {
            throw new TypeError('At least one of max, maxSize, or ttl is required');
        }
        if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
            const code = 'LRU_CACHE_UNBOUNDED';
            if (shouldWarn(code)) {
                warned.add(code);
                const msg = 'TTL caching without ttlAutopurge, max, or maxSize can ' +
                    'result in unbounded memory consumption.';
                emitWarning(msg, 'UnboundedCacheWarning', code, LRUCache);
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
                const t = setTimeout(() => {
                    if (this.#isStale(index)) {
                        this.delete(this.#keyList[index]);
                    }
                }, ttl + 1);
                // unref() not supported on all platforms
                /* c8 ignore start */
                if (t.unref) {
                    t.unref();
                }
                /* c8 ignore stop */
            }
        };
        this.#updateItemAge = index => {
            starts[index] = ttls[index] !== 0 ? perf.now() : 0;
        };
        this.#statusTTL = (status, index) => {
            if (ttls[index]) {
                const ttl = ttls[index];
                const start = starts[index];
                /* c8 ignore next */
                if (!ttl || !start)
                    return;
                status.ttl = ttl;
                status.start = start;
                status.now = cachedNow || getNow();
                const age = status.now - start;
                status.remainingTTL = ttl - age;
            }
        };
        // debounce calls to perf.now() to 1s so we're not hitting
        // that costly call repeatedly.
        let cachedNow = 0;
        const getNow = () => {
            const n = perf.now();
            if (this.ttlResolution > 0) {
                cachedNow = n;
                const t = setTimeout(() => (cachedNow = 0), this.ttlResolution);
                // not available on all platforms
                /* c8 ignore start */
                if (t.unref) {
                    t.unref();
                }
                /* c8 ignore stop */
            }
            return n;
        };
        this.getRemainingTTL = key => {
            const index = this.#keyMap.get(key);
            if (index === undefined) {
                return 0;
            }
            const ttl = ttls[index];
            const start = starts[index];
            if (!ttl || !start) {
                return Infinity;
            }
            const age = (cachedNow || getNow()) - start;
            return ttl - age;
        };
        this.#isStale = index => {
            const s = starts[index];
            const t = ttls[index];
            return !!t && !!s && (cachedNow || getNow()) - s > t;
        };
    }
    // conditionally set private methods related to TTL
    #updateItemAge = () => { };
    #statusTTL = () => { };
    #setItemTTL = () => { };
    /* c8 ignore stop */
    #isStale = () => false;
    #initializeSizeTracking() {
        const sizes = new ZeroArray(this.#max);
        this.#calculatedSize = 0;
        this.#sizes = sizes;
        this.#removeItemSize = index => {
            this.#calculatedSize -= sizes[index];
            sizes[index] = 0;
        };
        this.#requireSize = (k, v, size, sizeCalculation) => {
            // provisionally accept background fetches.
            // actual value size will be checked when they return.
            if (this.#isBackgroundFetch(v)) {
                return 0;
            }
            if (!isPosInt(size)) {
                if (sizeCalculation) {
                    if (typeof sizeCalculation !== 'function') {
                        throw new TypeError('sizeCalculation must be a function');
                    }
                    size = sizeCalculation(v, k);
                    if (!isPosInt(size)) {
                        throw new TypeError('sizeCalculation return invalid (expect positive integer)');
                    }
                }
                else {
                    throw new TypeError('invalid size value (must be positive integer). ' +
                        'When maxSize or maxEntrySize is used, sizeCalculation ' +
                        'or size must be set.');
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
    #removeItemSize = _i => { };
    #addItemSize = (_i, _s, _st) => { };
    #requireSize = (_k, _v, size, sizeCalculation) => {
        if (size || sizeCalculation) {
            throw new TypeError('cannot set size without setting maxSize or maxEntrySize on cache');
        }
        return 0;
    };
    *#indexes({ allowStale = this.allowStale } = {}) {
        if (this.#size) {
            for (let i = this.#tail; true;) {
                if (!this.#isValidIndex(i)) {
                    break;
                }
                if (allowStale || !this.#isStale(i)) {
                    yield i;
                }
                if (i === this.#head) {
                    break;
                }
                else {
                    i = this.#prev[i];
                }
            }
        }
    }
    *#rindexes({ allowStale = this.allowStale } = {}) {
        if (this.#size) {
            for (let i = this.#head; true;) {
                if (!this.#isValidIndex(i)) {
                    break;
                }
                if (allowStale || !this.#isStale(i)) {
                    yield i;
                }
                if (i === this.#tail) {
                    break;
                }
                else {
                    i = this.#next[i];
                }
            }
        }
    }
    #isValidIndex(index) {
        return (index !== undefined &&
            this.#keyMap.get(this.#keyList[index]) === index);
    }
    /**
     * Return a generator yielding `[key, value]` pairs,
     * in order from most recently used to least recently used.
     */
    *entries() {
        for (const i of this.#indexes()) {
            if (this.#valList[i] !== undefined &&
                this.#keyList[i] !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield [this.#keyList[i], this.#valList[i]];
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
        for (const i of this.#rindexes()) {
            if (this.#valList[i] !== undefined &&
                this.#keyList[i] !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield [this.#keyList[i], this.#valList[i]];
            }
        }
    }
    /**
     * Return a generator yielding the keys in the cache,
     * in order from most recently used to least recently used.
     */
    *keys() {
        for (const i of this.#indexes()) {
            const k = this.#keyList[i];
            if (k !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield k;
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
        for (const i of this.#rindexes()) {
            const k = this.#keyList[i];
            if (k !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield k;
            }
        }
    }
    /**
     * Return a generator yielding the values in the cache,
     * in order from most recently used to least recently used.
     */
    *values() {
        for (const i of this.#indexes()) {
            const v = this.#valList[i];
            if (v !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield this.#valList[i];
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
        for (const i of this.#rindexes()) {
            const v = this.#valList[i];
            if (v !== undefined &&
                !this.#isBackgroundFetch(this.#valList[i])) {
                yield this.#valList[i];
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
        for (const i of this.#indexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v)
                ? v.__staleWhileFetching
                : v;
            if (value === undefined)
                continue;
            if (fn(value, this.#keyList[i], this)) {
                return this.get(this.#keyList[i], getOptions);
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
        for (const i of this.#indexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v)
                ? v.__staleWhileFetching
                : v;
            if (value === undefined)
                continue;
            fn.call(thisp, value, this.#keyList[i], this);
        }
    }
    /**
     * The same as {@link LRUCache.forEach} but items are iterated over in
     * reverse order.  (ie, less recently used items are iterated over first.)
     */
    rforEach(fn, thisp = this) {
        for (const i of this.#rindexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v)
                ? v.__staleWhileFetching
                : v;
            if (value === undefined)
                continue;
            fn.call(thisp, value, this.#keyList[i], this);
        }
    }
    /**
     * Delete any stale entries. Returns true if anything was removed,
     * false otherwise.
     */
    purgeStale() {
        let deleted = false;
        for (const i of this.#rindexes({ allowStale: true })) {
            if (this.#isStale(i)) {
                this.delete(this.#keyList[i]);
                deleted = true;
            }
        }
        return deleted;
    }
    /**
     * Get the extended info about a given entry, to get its value, size, and
     * TTL info simultaneously. Like {@link LRUCache#dump}, but just for a
     * single key. Always returns stale values, if their info is found in the
     * cache, so be sure to check for expired TTLs if relevant.
     */
    info(key) {
        const i = this.#keyMap.get(key);
        if (i === undefined)
            return undefined;
        const v = this.#valList[i];
        const value = this.#isBackgroundFetch(v)
            ? v.__staleWhileFetching
            : v;
        if (value === undefined)
            return undefined;
        const entry = { value };
        if (this.#ttls && this.#starts) {
            const ttl = this.#ttls[i];
            const start = this.#starts[i];
            if (ttl && start) {
                const remain = ttl - (perf.now() - start);
                entry.ttl = remain;
                entry.start = Date.now();
            }
        }
        if (this.#sizes) {
            entry.size = this.#sizes[i];
        }
        return entry;
    }
    /**
     * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
     * passed to cache.load()
     */
    dump() {
        const arr = [];
        for (const i of this.#indexes({ allowStale: true })) {
            const key = this.#keyList[i];
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v)
                ? v.__staleWhileFetching
                : v;
            if (value === undefined || key === undefined)
                continue;
            const entry = { value };
            if (this.#ttls && this.#starts) {
                entry.ttl = this.#ttls[i];
                // always dump the start relative to a portable timestamp
                // it's ok for this to be a bit slow, it's a rare operation.
                const age = perf.now() - this.#starts[i];
                entry.start = Math.floor(Date.now() - age);
            }
            if (this.#sizes) {
                entry.size = this.#sizes[i];
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
                // entry.start is a portable timestamp, but we may be using
                // node's performance.now(), so calculate the offset, so that
                // we get the intended remaining TTL, no matter how long it's
                // been on ice.
                //
                // it's ok for this to be a bit slow, it's a rare operation.
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
    set(k, v, setOptions = {}) {
        if (v === undefined) {
            this.delete(k);
            return this;
        }
        const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status, } = setOptions;
        let { noUpdateTTL = this.noUpdateTTL } = setOptions;
        const size = this.#requireSize(k, v, setOptions.size || 0, sizeCalculation);
        // if the item doesn't fit, don't do anything
        // NB: maxEntrySize set to maxSize by default
        if (this.maxEntrySize && size > this.maxEntrySize) {
            if (status) {
                status.set = 'miss';
                status.maxEntrySizeExceeded = true;
            }
            // have to delete, in case something is there already.
            this.delete(k);
            return this;
        }
        let index = this.#size === 0 ? undefined : this.#keyMap.get(k);
        if (index === undefined) {
            // addition
            index = (this.#size === 0
                ? this.#tail
                : this.#free.length !== 0
                    ? this.#free.pop()
                    : this.#size === this.#max
                        ? this.#evict(false)
                        : this.#size);
            this.#keyList[index] = k;
            this.#valList[index] = v;
            this.#keyMap.set(k, index);
            this.#next[this.#tail] = index;
            this.#prev[index] = this.#tail;
            this.#tail = index;
            this.#size++;
            this.#addItemSize(index, size, status);
            if (status)
                status.set = 'add';
            noUpdateTTL = false;
        }
        else {
            // update
            this.#moveToTail(index);
            const oldVal = this.#valList[index];
            if (v !== oldVal) {
                if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
                    oldVal.__abortController.abort(new Error('replaced'));
                    const { __staleWhileFetching: s } = oldVal;
                    if (s !== undefined && !noDisposeOnSet) {
                        if (this.#hasDispose) {
                            this.#dispose?.(s, k, 'set');
                        }
                        if (this.#hasDisposeAfter) {
                            this.#disposed?.push([s, k, 'set']);
                        }
                    }
                }
                else if (!noDisposeOnSet) {
                    if (this.#hasDispose) {
                        this.#dispose?.(oldVal, k, 'set');
                    }
                    if (this.#hasDisposeAfter) {
                        this.#disposed?.push([oldVal, k, 'set']);
                    }
                }
                this.#removeItemSize(index);
                this.#addItemSize(index, size, status);
                this.#valList[index] = v;
                if (status) {
                    status.set = 'replace';
                    const oldValue = oldVal && this.#isBackgroundFetch(oldVal)
                        ? oldVal.__staleWhileFetching
                        : oldVal;
                    if (oldValue !== undefined)
                        status.oldValue = oldValue;
                }
            }
            else if (status) {
                status.set = 'update';
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
            while ((task = dt?.shift())) {
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
                }
                else if (val !== undefined) {
                    return val;
                }
            }
        }
        finally {
            if (this.#hasDisposeAfter && this.#disposed) {
                const dt = this.#disposed;
                let task;
                while ((task = dt?.shift())) {
                    this.#disposeAfter?.(...task);
                }
            }
        }
    }
    #evict(free) {
        const head = this.#head;
        const k = this.#keyList[head];
        const v = this.#valList[head];
        if (this.#hasFetchMethod && this.#isBackgroundFetch(v)) {
            v.__abortController.abort(new Error('evicted'));
        }
        else if (this.#hasDispose || this.#hasDisposeAfter) {
            if (this.#hasDispose) {
                this.#dispose?.(v, k, 'evict');
            }
            if (this.#hasDisposeAfter) {
                this.#disposed?.push([v, k, 'evict']);
            }
        }
        this.#removeItemSize(head);
        // if we aren't about to use the index, then null these out
        if (free) {
            this.#keyList[head] = undefined;
            this.#valList[head] = undefined;
            this.#free.push(head);
        }
        if (this.#size === 1) {
            this.#head = this.#tail = 0;
            this.#free.length = 0;
        }
        else {
            this.#head = this.#next[head];
        }
        this.#keyMap.delete(k);
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
    has(k, hasOptions = {}) {
        const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
        const index = this.#keyMap.get(k);
        if (index !== undefined) {
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v) &&
                v.__staleWhileFetching === undefined) {
                return false;
            }
            if (!this.#isStale(index)) {
                if (updateAgeOnHas) {
                    this.#updateItemAge(index);
                }
                if (status) {
                    status.has = 'hit';
                    this.#statusTTL(status, index);
                }
                return true;
            }
            else if (status) {
                status.has = 'stale';
                this.#statusTTL(status, index);
            }
        }
        else if (status) {
            status.has = 'miss';
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
    peek(k, peekOptions = {}) {
        const { allowStale = this.allowStale } = peekOptions;
        const index = this.#keyMap.get(k);
        if (index === undefined ||
            (!allowStale && this.#isStale(index))) {
            return;
        }
        const v = this.#valList[index];
        // either stale and allowed, or forcing a refresh of non-stale value
        return this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
    }
    #backgroundFetch(k, index, options, context) {
        const v = index === undefined ? undefined : this.#valList[index];
        if (this.#isBackgroundFetch(v)) {
            return v;
        }
        const ac = new AC();
        const { signal } = options;
        // when/if our AC signals, then stop listening to theirs.
        signal?.addEventListener('abort', () => ac.abort(signal.reason), {
            signal: ac.signal,
        });
        const fetchOpts = {
            signal: ac.signal,
            options,
            context,
        };
        const cb = (v, updateCache = false) => {
            const { aborted } = ac.signal;
            const ignoreAbort = options.ignoreFetchAbort && v !== undefined;
            if (options.status) {
                if (aborted && !updateCache) {
                    options.status.fetchAborted = true;
                    options.status.fetchError = ac.signal.reason;
                    if (ignoreAbort)
                        options.status.fetchAbortIgnored = true;
                }
                else {
                    options.status.fetchResolved = true;
                }
            }
            if (aborted && !ignoreAbort && !updateCache) {
                return fetchFail(ac.signal.reason);
            }
            // either we didn't abort, and are still here, or we did, and ignored
            const bf = p;
            if (this.#valList[index] === p) {
                if (v === undefined) {
                    if (bf.__staleWhileFetching) {
                        this.#valList[index] = bf.__staleWhileFetching;
                    }
                    else {
                        this.delete(k);
                    }
                }
                else {
                    if (options.status)
                        options.status.fetchUpdated = true;
                    this.set(k, v, fetchOpts.options);
                }
            }
            return v;
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
            const bf = p;
            if (this.#valList[index] === p) {
                // if we allow stale on fetch rejections, then we need to ensure that
                // the stale value is not removed from the cache when the fetch fails.
                const del = !noDelete || bf.__staleWhileFetching === undefined;
                if (del) {
                    this.delete(k);
                }
                else if (!allowStaleAborted) {
                    // still replace the *promise* with the stale value,
                    // since we are done with the promise at this point.
                    // leave it untouched if we're still waiting for an
                    // aborted background fetch that hasn't yet returned.
                    this.#valList[index] = bf.__staleWhileFetching;
                }
            }
            if (allowStale) {
                if (options.status && bf.__staleWhileFetching !== undefined) {
                    options.status.returnedStale = true;
                }
                return bf.__staleWhileFetching;
            }
            else if (bf.__returned === bf) {
                throw er;
            }
        };
        const pcall = (res, rej) => {
            const fmp = this.#fetchMethod?.(k, v, fetchOpts);
            if (fmp && fmp instanceof Promise) {
                fmp.then(v => res(v === undefined ? undefined : v), rej);
            }
            // ignored, we go until we finish, regardless.
            // defer check until we are actually aborting,
            // so fetchMethod can override.
            ac.signal.addEventListener('abort', () => {
                if (!options.ignoreFetchAbort ||
                    options.allowStaleOnFetchAbort) {
                    res(undefined);
                    // when it eventually resolves, update the cache.
                    if (options.allowStaleOnFetchAbort) {
                        res = v => cb(v, true);
                    }
                }
            });
        };
        if (options.status)
            options.status.fetchDispatched = true;
        const p = new Promise(pcall).then(cb, eb);
        const bf = Object.assign(p, {
            __abortController: ac,
            __staleWhileFetching: v,
            __returned: undefined,
        });
        if (index === undefined) {
            // internal, don't expose status.
            this.set(k, bf, { ...fetchOpts.options, status: undefined });
            index = this.#keyMap.get(k);
        }
        else {
            this.#valList[index] = bf;
        }
        return bf;
    }
    #isBackgroundFetch(p) {
        if (!this.#hasFetchMethod)
            return false;
        const b = p;
        return (!!b &&
            b instanceof Promise &&
            b.hasOwnProperty('__staleWhileFetching') &&
            b.__abortController instanceof AC);
    }
    async fetch(k, fetchOptions = {}) {
        const { 
        // get options
        allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, 
        // set options
        ttl = this.ttl, noDisposeOnSet = this.noDisposeOnSet, size = 0, sizeCalculation = this.sizeCalculation, noUpdateTTL = this.noUpdateTTL, 
        // fetch exclusive options
        noDeleteOnFetchRejection = this.noDeleteOnFetchRejection, allowStaleOnFetchRejection = this.allowStaleOnFetchRejection, ignoreFetchAbort = this.ignoreFetchAbort, allowStaleOnFetchAbort = this.allowStaleOnFetchAbort, context, forceRefresh = false, status, signal, } = fetchOptions;
        if (!this.#hasFetchMethod) {
            if (status)
                status.fetch = 'get';
            return this.get(k, {
                allowStale,
                updateAgeOnGet,
                noDeleteOnStaleGet,
                status,
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
            signal,
        };
        let index = this.#keyMap.get(k);
        if (index === undefined) {
            if (status)
                status.fetch = 'miss';
            const p = this.#backgroundFetch(k, index, options, context);
            return (p.__returned = p);
        }
        else {
            // in cache, maybe already fetching
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v)) {
                const stale = allowStale && v.__staleWhileFetching !== undefined;
                if (status) {
                    status.fetch = 'inflight';
                    if (stale)
                        status.returnedStale = true;
                }
                return stale ? v.__staleWhileFetching : (v.__returned = v);
            }
            // if we force a refresh, that means do NOT serve the cached value,
            // unless we are already in the process of refreshing the cache.
            const isStale = this.#isStale(index);
            if (!forceRefresh && !isStale) {
                if (status)
                    status.fetch = 'hit';
                this.#moveToTail(index);
                if (updateAgeOnGet) {
                    this.#updateItemAge(index);
                }
                if (status)
                    this.#statusTTL(status, index);
                return v;
            }
            // ok, it is stale or a forced refresh, and not already fetching.
            // refresh the cache.
            const p = this.#backgroundFetch(k, index, options, context);
            const hasStale = p.__staleWhileFetching !== undefined;
            const staleVal = hasStale && allowStale;
            if (status) {
                status.fetch = isStale ? 'stale' : 'refresh';
                if (staleVal && isStale)
                    status.returnedStale = true;
            }
            return staleVal ? p.__staleWhileFetching : (p.__returned = p);
        }
    }
    /**
     * Return a value from the cache. Will update the recency of the cache
     * entry found.
     *
     * If the key is not found, get() will return `undefined`.
     */
    get(k, getOptions = {}) {
        const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status, } = getOptions;
        const index = this.#keyMap.get(k);
        if (index !== undefined) {
            const value = this.#valList[index];
            const fetching = this.#isBackgroundFetch(value);
            if (status)
                this.#statusTTL(status, index);
            if (this.#isStale(index)) {
                if (status)
                    status.get = 'stale';
                // delete only if not an in-flight background fetch
                if (!fetching) {
                    if (!noDeleteOnStaleGet) {
                        this.delete(k);
                    }
                    if (status && allowStale)
                        status.returnedStale = true;
                    return allowStale ? value : undefined;
                }
                else {
                    if (status &&
                        allowStale &&
                        value.__staleWhileFetching !== undefined) {
                        status.returnedStale = true;
                    }
                    return allowStale ? value.__staleWhileFetching : undefined;
                }
            }
            else {
                if (status)
                    status.get = 'hit';
                // if we're currently fetching it, we don't actually have it yet
                // it's not stale, which means this isn't a staleWhileRefetching.
                // If it's not stale, and fetching, AND has a __staleWhileFetching
                // value, then that means the user fetched with {forceRefresh:true},
                // so it's safe to return that value.
                if (fetching) {
                    return value.__staleWhileFetching;
                }
                this.#moveToTail(index);
                if (updateAgeOnGet) {
                    this.#updateItemAge(index);
                }
                return value;
            }
        }
        else if (status) {
            status.get = 'miss';
        }
    }
    #connect(p, n) {
        this.#prev[n] = p;
        this.#next[p] = n;
    }
    #moveToTail(index) {
        // if tail already, nothing to do
        // if head, move head to next[index]
        // else
        //   move next[prev[index]] to next[index] (head has no prev)
        //   move prev[next[index]] to prev[index]
        // prev[index] = tail
        // next[tail] = index
        // tail = index
        if (index !== this.#tail) {
            if (index === this.#head) {
                this.#head = this.#next[index];
            }
            else {
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
    delete(k) {
        let deleted = false;
        if (this.#size !== 0) {
            const index = this.#keyMap.get(k);
            if (index !== undefined) {
                deleted = true;
                if (this.#size === 1) {
                    this.clear();
                }
                else {
                    this.#removeItemSize(index);
                    const v = this.#valList[index];
                    if (this.#isBackgroundFetch(v)) {
                        v.__abortController.abort(new Error('deleted'));
                    }
                    else if (this.#hasDispose || this.#hasDisposeAfter) {
                        if (this.#hasDispose) {
                            this.#dispose?.(v, k, 'delete');
                        }
                        if (this.#hasDisposeAfter) {
                            this.#disposed?.push([v, k, 'delete']);
                        }
                    }
                    this.#keyMap.delete(k);
                    this.#keyList[index] = undefined;
                    this.#valList[index] = undefined;
                    if (index === this.#tail) {
                        this.#tail = this.#prev[index];
                    }
                    else if (index === this.#head) {
                        this.#head = this.#next[index];
                    }
                    else {
                        const pi = this.#prev[index];
                        this.#next[pi] = this.#next[index];
                        const ni = this.#next[index];
                        this.#prev[ni] = this.#prev[index];
                    }
                    this.#size--;
                    this.#free.push(index);
                }
            }
        }
        if (this.#hasDisposeAfter && this.#disposed?.length) {
            const dt = this.#disposed;
            let task;
            while ((task = dt?.shift())) {
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
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v)) {
                v.__abortController.abort(new Error('deleted'));
            }
            else {
                const k = this.#keyList[index];
                if (this.#hasDispose) {
                    this.#dispose?.(v, k, 'delete');
                }
                if (this.#hasDisposeAfter) {
                    this.#disposed?.push([v, k, 'delete']);
                }
            }
        }
        this.#keyMap.clear();
        this.#valList.fill(undefined);
        this.#keyList.fill(undefined);
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
            while ((task = dt?.shift())) {
                this.#disposeAfter?.(...task);
            }
        }
    }
}

function createCache(max = 500) {
  return new LRUCache({ max });
}

function isImportUsed(local, sfc) {
  return resolveTemplateUsedIdentifiers(sfc).has(local);
}
const templateAnalysisCache = createCache();
function resolveTemplateVModelIdentifiers(sfc) {
  return resolveTemplateAnalysisResult(sfc, false).vModelIds;
}
function resolveTemplateUsedIdentifiers(sfc) {
  return resolveTemplateAnalysisResult(sfc).usedIds;
}
function resolveTemplateAnalysisResult(sfc, collectUsedIds = true) {
  const { content, ast } = sfc.template;
  const cached = templateAnalysisCache.get(content);
  if (cached && (!collectUsedIds || cached.usedIds)) {
    return cached;
  }
  const ids = collectUsedIds ? /* @__PURE__ */ new Set() : void 0;
  const vModelIds = /* @__PURE__ */ new Set();
  ast.children.forEach(walk);
  function walk(node) {
    var _a;
    switch (node.type) {
      case 1:
        let tag = node.tag;
        if (tag.includes(".")) tag = tag.split(".")[0].trim();
        if (!CompilerDOM.parserOptions.isNativeTag(tag) && !CompilerDOM.parserOptions.isBuiltInComponent(tag)) {
          if (ids) {
            ids.add(shared.camelize(tag));
            ids.add(shared.capitalize(shared.camelize(tag)));
          }
        }
        for (let i = 0; i < node.props.length; i++) {
          const prop = node.props[i];
          if (prop.type === 7) {
            if (ids) {
              if (!shared.isBuiltInDirective(prop.name)) {
                ids.add(`v${shared.capitalize(shared.camelize(prop.name))}`);
              }
            }
            if (prop.name === "model") {
              const exp = prop.exp;
              if (exp && exp.type === 4) {
                const expString = exp.content.trim();
                if (CompilerDOM.isSimpleIdentifier(expString) && expString !== "undefined") {
                  vModelIds.add(expString);
                }
              }
            }
            if (ids && prop.arg && !prop.arg.isStatic) {
              extractIdentifiers(ids, prop.arg);
            }
            if (ids) {
              if (prop.name === "for") {
                extractIdentifiers(ids, prop.forParseResult.source);
              } else if (prop.exp) {
                extractIdentifiers(ids, prop.exp);
              } else if (prop.name === "bind" && !prop.exp) {
                ids.add(shared.camelize(prop.arg.content));
              }
            }
          }
          if (ids && prop.type === 6 && prop.name === "ref" && ((_a = prop.value) == null ? void 0 : _a.content)) {
            ids.add(prop.value.content);
          }
        }
        node.children.forEach(walk);
        break;
      case 5:
        if (ids) extractIdentifiers(ids, node.content);
        break;
    }
  }
  const result = { usedIds: ids, vModelIds };
  templateAnalysisCache.set(content, result);
  return result;
}
function extractIdentifiers(ids, node) {
  if (node.ast) {
    CompilerDOM.walkIdentifiers(node.ast, (n) => ids.add(n.name));
  } else if (node.ast === null) {
    ids.add(node.content);
  }
}

const DEFAULT_FILENAME = "anonymous.vue";
const parseCache$1 = createCache();
function parse$1(source, options = {}) {
  var _a;
  const sourceKey = shared.genCacheKey(source, {
    ...options,
    compiler: { parse: (_a = options.compiler) == null ? void 0 : _a.parse }
  });
  const cache = parseCache$1.get(sourceKey);
  if (cache) {
    return cache;
  }
  const {
    sourceMap = true,
    filename = DEFAULT_FILENAME,
    sourceRoot = "",
    pad = false,
    ignoreEmpty = true,
    compiler = CompilerDOM__namespace,
    templateParseOptions = {}
  } = options;
  const descriptor = {
    filename,
    source,
    template: null,
    script: null,
    scriptSetup: null,
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false,
    shouldForceReload: (prevImports) => hmrShouldReload(prevImports, descriptor)
  };
  const errors = [];
  const ast = compiler.parse(source, {
    parseMode: "sfc",
    prefixIdentifiers: true,
    ...templateParseOptions,
    onError: (e) => {
      errors.push(e);
    }
  });
  ast.children.forEach((node) => {
    if (node.type !== 1) {
      return;
    }
    if (ignoreEmpty && node.tag !== "template" && isEmpty(node) && !hasSrc(node)) {
      return;
    }
    switch (node.tag) {
      case "template":
        if (!descriptor.template) {
          const templateBlock = descriptor.template = createBlock(
            node,
            source,
            false
          );
          if (!templateBlock.attrs.src) {
            templateBlock.ast = compilerCore.createRoot(node.children, source);
          }
          if (templateBlock.attrs.functional) {
            const err = new SyntaxError(
              `<template functional> is no longer supported in Vue 3, since functional components no longer have significant performance difference from stateful ones. Just use a normal <template> instead.`
            );
            err.loc = node.props.find(
              (p) => p.type === 6 && p.name === "functional"
            ).loc;
            errors.push(err);
          }
        } else {
          errors.push(createDuplicateBlockError(node));
        }
        break;
      case "script":
        const scriptBlock = createBlock(node, source, pad);
        const isSetup = !!scriptBlock.attrs.setup;
        if (isSetup && !descriptor.scriptSetup) {
          descriptor.scriptSetup = scriptBlock;
          break;
        }
        if (!isSetup && !descriptor.script) {
          descriptor.script = scriptBlock;
          break;
        }
        errors.push(createDuplicateBlockError(node, isSetup));
        break;
      case "style":
        const styleBlock = createBlock(node, source, pad);
        if (styleBlock.attrs.vars) {
          errors.push(
            new SyntaxError(
              `<style vars> has been replaced by a new proposal: https://github.com/vuejs/rfcs/pull/231`
            )
          );
        }
        descriptor.styles.push(styleBlock);
        break;
      default:
        descriptor.customBlocks.push(createBlock(node, source, pad));
        break;
    }
  });
  if (!descriptor.template && !descriptor.script && !descriptor.scriptSetup) {
    errors.push(
      new SyntaxError(
        `At least one <template> or <script> is required in a single file component. ${descriptor.filename}`
      )
    );
  }
  if (descriptor.scriptSetup) {
    if (descriptor.scriptSetup.src) {
      errors.push(
        new SyntaxError(
          `<script setup> cannot use the "src" attribute because its syntax will be ambiguous outside of the component.`
        )
      );
      descriptor.scriptSetup = null;
    }
    if (descriptor.script && descriptor.script.src) {
      errors.push(
        new SyntaxError(
          `<script> cannot use the "src" attribute when <script setup> is also present because they must be processed together.`
        )
      );
      descriptor.script = null;
    }
  }
  let templateColumnOffset = 0;
  if (descriptor.template && (descriptor.template.lang === "pug" || descriptor.template.lang === "jade")) {
    [descriptor.template.content, templateColumnOffset] = dedent(
      descriptor.template.content
    );
  }
  if (sourceMap) {
    const genMap = (block, columnOffset = 0) => {
      if (block && !block.src) {
        block.map = generateSourceMap(
          filename,
          source,
          block.content,
          sourceRoot,
          !pad || block.type === "template" ? block.loc.start.line - 1 : 0,
          columnOffset
        );
      }
    };
    genMap(descriptor.template, templateColumnOffset);
    genMap(descriptor.script);
    descriptor.styles.forEach((s) => genMap(s));
    descriptor.customBlocks.forEach((s) => genMap(s));
  }
  descriptor.cssVars = parseCssVars(descriptor);
  const slottedRE = /(?:::v-|:)slotted\(/;
  descriptor.slotted = descriptor.styles.some(
    (s) => s.scoped && slottedRE.test(s.content)
  );
  const result = {
    descriptor,
    errors
  };
  parseCache$1.set(sourceKey, result);
  return result;
}
function createDuplicateBlockError(node, isScriptSetup = false) {
  const err = new SyntaxError(
    `Single file component can contain only one <${node.tag}${isScriptSetup ? ` setup` : ``}> element`
  );
  err.loc = node.loc;
  return err;
}
function createBlock(node, source, pad) {
  const type = node.tag;
  const loc = node.innerLoc;
  const attrs = {};
  const block = {
    type,
    content: source.slice(loc.start.offset, loc.end.offset),
    loc,
    attrs
  };
  if (pad) {
    block.content = padContent(source, block, pad) + block.content;
  }
  node.props.forEach((p) => {
    if (p.type === 6) {
      const name = p.name;
      attrs[name] = p.value ? p.value.content || true : true;
      if (name === "lang") {
        block.lang = p.value && p.value.content;
      } else if (name === "src") {
        block.src = p.value && p.value.content;
      } else if (type === "style") {
        if (name === "scoped") {
          block.scoped = true;
        } else if (name === "module") {
          block.module = attrs[name];
        }
      } else if (type === "script" && name === "setup") {
        block.setup = attrs.setup;
      }
    }
  });
  return block;
}
const splitRE = /\r?\n/g;
const emptyRE = /^(?:\/\/)?\s*$/;
const replaceRE = /./g;
function generateSourceMap(filename, source, generated, sourceRoot, lineOffset, columnOffset) {
  const map = new sourceMapJs.SourceMapGenerator({
    file: filename.replace(/\\/g, "/"),
    sourceRoot: sourceRoot.replace(/\\/g, "/")
  });
  map.setSourceContent(filename, source);
  map._sources.add(filename);
  generated.split(splitRE).forEach((line, index) => {
    if (!emptyRE.test(line)) {
      const originalLine = index + 1 + lineOffset;
      const generatedLine = index + 1;
      for (let i = 0; i < line.length; i++) {
        if (!/\s/.test(line[i])) {
          map._mappings.add({
            originalLine,
            originalColumn: i + columnOffset,
            generatedLine,
            generatedColumn: i,
            source: filename,
            name: null
          });
        }
      }
    }
  });
  return map.toJSON();
}
function padContent(content, block, pad) {
  content = content.slice(0, block.loc.start.offset);
  if (pad === "space") {
    return content.replace(replaceRE, " ");
  } else {
    const offset = content.split(splitRE).length;
    const padChar = block.type === "script" && !block.lang ? "//\n" : "\n";
    return Array(offset).join(padChar);
  }
}
function hasSrc(node) {
  return node.props.some((p) => {
    if (p.type !== 6) {
      return false;
    }
    return p.name === "src";
  });
}
function isEmpty(node) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type !== 2 || child.content.trim() !== "") {
      return false;
    }
  }
  return true;
}
function hmrShouldReload(prevImports, next) {
  if (!next.scriptSetup || next.scriptSetup.lang !== "ts" && next.scriptSetup.lang !== "tsx") {
    return false;
  }
  for (const key in prevImports) {
    if (!prevImports[key].isUsedInTemplate && isImportUsed(key, next)) {
      return true;
    }
  }
  return false;
}
function dedent(s) {
  const lines = s.split("\n");
  const minIndent = lines.reduce(function(minIndent2, line) {
    var _a, _b;
    if (line.trim() === "") {
      return minIndent2;
    }
    const indent = ((_b = (_a = line.match(/^\s*/)) == null ? void 0 : _a[0]) == null ? void 0 : _b.length) || 0;
    return Math.min(indent, minIndent2);
  }, Infinity);
  if (minIndent === 0) {
    return [s, minIndent];
  }
  return [
    lines.map(function(line) {
      return line.slice(minIndent);
    }).join("\n"),
    minIndent
  ];
}

function isRelativeUrl(url) {
  const firstChar = url.charAt(0);
  return firstChar === "." || firstChar === "~" || firstChar === "@";
}
const externalRE = /^(?:https?:)?\/\//;
function isExternalUrl(url) {
  return externalRE.test(url);
}
const dataUrlRE = /^\s*data:/i;
function isDataUrl(url) {
  return dataUrlRE.test(url);
}
function parseUrl(url) {
  const firstChar = url.charAt(0);
  if (firstChar === "~") {
    const secondChar = url.charAt(1);
    url = url.slice(secondChar === "/" ? 2 : 1);
  }
  return parseUriParts(url);
}
function parseUriParts(urlString) {
  return url.parse(shared.isString(urlString) ? urlString : "", false, true);
}

const defaultAssetUrlOptions = {
  base: null,
  includeAbsolute: false,
  tags: {
    video: ["src", "poster"],
    source: ["src"],
    img: ["src"],
    image: ["xlink:href", "href"],
    use: ["xlink:href", "href"]
  }
};
const normalizeOptions = (options) => {
  if (Object.keys(options).some((key) => shared.isArray(options[key]))) {
    return {
      ...defaultAssetUrlOptions,
      tags: options
    };
  }
  return {
    ...defaultAssetUrlOptions,
    ...options
  };
};
const createAssetUrlTransformWithOptions = (options) => {
  return (node, context) => transformAssetUrl(node, context, options);
};
const transformAssetUrl = (node, context, options = defaultAssetUrlOptions) => {
  if (node.type === 1) {
    if (!node.props.length) {
      return;
    }
    const tags = options.tags || defaultAssetUrlOptions.tags;
    const attrs = tags[node.tag];
    const wildCardAttrs = tags["*"];
    if (!attrs && !wildCardAttrs) {
      return;
    }
    const assetAttrs = (attrs || []).concat(wildCardAttrs || []);
    node.props.forEach((attr, index) => {
      if (attr.type !== 6 || !assetAttrs.includes(attr.name) || !attr.value || isExternalUrl(attr.value.content) || isDataUrl(attr.value.content) || attr.value.content[0] === "#" || !options.includeAbsolute && !isRelativeUrl(attr.value.content)) {
        return;
      }
      const url = parseUrl(attr.value.content);
      if (options.base && attr.value.content[0] === ".") {
        const base = parseUrl(options.base);
        const protocol = base.protocol || "";
        const host = base.host ? protocol + "//" + base.host : "";
        const basePath = base.path || "/";
        attr.value.content = host + (path$1.posix || path$1).join(basePath, url.path + (url.hash || ""));
        return;
      }
      const exp = getImportsExpressionExp(url.path, url.hash, attr.loc, context);
      node.props[index] = {
        type: 7,
        name: "bind",
        arg: compilerCore.createSimpleExpression(attr.name, true, attr.loc),
        exp,
        modifiers: [],
        loc: attr.loc
      };
    });
  }
};
function getImportsExpressionExp(path2, hash, loc, context) {
  if (path2) {
    let name;
    let exp;
    const existingIndex = context.imports.findIndex((i) => i.path === path2);
    if (existingIndex > -1) {
      name = `_imports_${existingIndex}`;
      exp = context.imports[existingIndex].exp;
    } else {
      name = `_imports_${context.imports.length}`;
      exp = compilerCore.createSimpleExpression(
        name,
        false,
        loc,
        3
      );
      context.imports.push({
        exp,
        path: decodeURIComponent(path2)
      });
    }
    if (!hash) {
      return exp;
    }
    const hashExp = `${name} + '${hash}'`;
    const finalExp = compilerCore.createSimpleExpression(
      hashExp,
      false,
      loc,
      3
    );
    if (!context.hoistStatic) {
      return finalExp;
    }
    const existingHoistIndex = context.hoists.findIndex((h) => {
      return h && h.type === 4 && !h.isStatic && h.content === hashExp;
    });
    if (existingHoistIndex > -1) {
      return compilerCore.createSimpleExpression(
        `_hoisted_${existingHoistIndex + 1}`,
        false,
        loc,
        3
      );
    }
    return context.hoist(finalExp);
  } else {
    return compilerCore.createSimpleExpression(`''`, false, loc, 3);
  }
}

const srcsetTags = ["img", "source"];
const escapedSpaceCharacters = /( |\\t|\\n|\\f|\\r)+/g;
const createSrcsetTransformWithOptions = (options) => {
  return (node, context) => transformSrcset(node, context, options);
};
const transformSrcset = (node, context, options = defaultAssetUrlOptions) => {
  if (node.type === 1) {
    if (srcsetTags.includes(node.tag) && node.props.length) {
      node.props.forEach((attr, index) => {
        if (attr.name === "srcset" && attr.type === 6) {
          if (!attr.value) return;
          const value = attr.value.content;
          if (!value) return;
          const imageCandidates = value.split(",").map((s) => {
            const [url, descriptor] = s.replace(escapedSpaceCharacters, " ").trim().split(" ", 2);
            return { url, descriptor };
          });
          for (let i = 0; i < imageCandidates.length; i++) {
            const { url } = imageCandidates[i];
            if (isDataUrl(url)) {
              imageCandidates[i + 1].url = url + "," + imageCandidates[i + 1].url;
              imageCandidates.splice(i, 1);
            }
          }
          const shouldProcessUrl = (url) => {
            return url && !isExternalUrl(url) && !isDataUrl(url) && (options.includeAbsolute || isRelativeUrl(url));
          };
          if (!imageCandidates.some(({ url }) => shouldProcessUrl(url))) {
            return;
          }
          if (options.base) {
            const base = options.base;
            const set = [];
            let needImportTransform = false;
            imageCandidates.forEach((candidate) => {
              let { url, descriptor } = candidate;
              descriptor = descriptor ? ` ${descriptor}` : ``;
              if (url[0] === ".") {
                candidate.url = (path$1.posix || path$1).join(base, url);
                set.push(candidate.url + descriptor);
              } else if (shouldProcessUrl(url)) {
                needImportTransform = true;
              } else {
                set.push(url + descriptor);
              }
            });
            if (!needImportTransform) {
              attr.value.content = set.join(", ");
              return;
            }
          }
          const compoundExpression = compilerCore.createCompoundExpression([], attr.loc);
          imageCandidates.forEach(({ url, descriptor }, index2) => {
            if (shouldProcessUrl(url)) {
              const { path: path2 } = parseUrl(url);
              let exp2;
              if (path2) {
                const existingImportsIndex = context.imports.findIndex(
                  (i) => i.path === path2
                );
                if (existingImportsIndex > -1) {
                  exp2 = compilerCore.createSimpleExpression(
                    `_imports_${existingImportsIndex}`,
                    false,
                    attr.loc,
                    3
                  );
                } else {
                  exp2 = compilerCore.createSimpleExpression(
                    `_imports_${context.imports.length}`,
                    false,
                    attr.loc,
                    3
                  );
                  context.imports.push({ exp: exp2, path: path2 });
                }
                compoundExpression.children.push(exp2);
              }
            } else {
              const exp2 = compilerCore.createSimpleExpression(
                `"${url}"`,
                false,
                attr.loc,
                3
              );
              compoundExpression.children.push(exp2);
            }
            const isNotLast = imageCandidates.length - 1 > index2;
            if (descriptor && isNotLast) {
              compoundExpression.children.push(` + ' ${descriptor}, ' + `);
            } else if (descriptor) {
              compoundExpression.children.push(` + ' ${descriptor}'`);
            } else if (isNotLast) {
              compoundExpression.children.push(` + ', ' + `);
            }
          });
          let exp = compoundExpression;
          if (context.hoistStatic) {
            exp = context.hoist(compoundExpression);
            exp.constType = 3;
          }
          node.props[index] = {
            type: 7,
            name: "bind",
            arg: compilerCore.createSimpleExpression("srcset", true, attr.loc),
            exp,
            modifiers: [],
            loc: attr.loc
          };
        }
      });
    }
  }
};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var consolidate$2 = {exports: {}};

var hasRequiredConsolidate$1;

function requireConsolidate$1 () {
	if (hasRequiredConsolidate$1) return consolidate$2.exports;
	hasRequiredConsolidate$1 = 1;
	(function (module, exports$1) {
		/*
		 * Engines which do not support caching of their file contents
		 * should use the `read()` function defined in consolidate.js
		 * On top of this, when an engine compiles to a `Function`,
		 * these functions should either be cached within consolidate.js
		 * or the engine itself via `options.cache`. This will allow
		 * users and frameworks to pass `options.cache = true` for
		 * `NODE_ENV=production`, however edit the file(s) without
		 * re-loading the application in development.
		 */

		/**
		 * Module dependencies.
		 */

		var fs = require$$0;
		var path = path$1;
		var util = require$$2;

		var join = path.join;
		var resolve = path.resolve;
		var extname = path.extname;
		var dirname = path.dirname;
		var isAbsolute = path.isAbsolute;

		var readCache = {};

		/**
		 * Require cache.
		 */

		var cacheStore = {};

		/**
		 * Require cache.
		 */

		var requires = {};

		/**
		 * Clear the cache.
		 *
		 * @api public
		 */

		exports$1.clearCache = function() {
		  readCache = {};
		  cacheStore = {};
		};

		/**
		 * Conditionally cache `compiled` template based
		 * on the `options` filename and `.cache` boolean.
		 *
		 * @param {Object} options
		 * @param {Function} compiled
		 * @return {Function}
		 * @api private
		 */

		function cache(options, compiled) {
		  // cachable
		  if (compiled && options.filename && options.cache) {
		    delete readCache[options.filename];
		    cacheStore[options.filename] = compiled;
		    return compiled;
		  }

		  // check cache
		  if (options.filename && options.cache) {
		    return cacheStore[options.filename];
		  }

		  return compiled;
		}

		/**
		 * Read `path` with `options` with
		 * callback `(err, str)`. When `options.cache`
		 * is true the template string will be cached.
		 *
		 * @param {String} options
		 * @param {Function} cb
		 * @api private
		 */

		function read(path, options, cb) {
		  var str = readCache[path];
		  var cached = options.cache && str && typeof str === 'string';

		  // cached (only if cached is a string and not a compiled template function)
		  if (cached) return cb(null, str);

		  // read
		  fs.readFile(path, 'utf8', function(err, str) {
		    if (err) return cb(err);
		    // remove extraneous utf8 BOM marker
		    str = str.replace(/^\uFEFF/, '');
		    if (options.cache) readCache[path] = str;
		    cb(null, str);
		  });
		}

		/**
		 * Read `path` with `options` with
		 * callback `(err, str)`. When `options.cache`
		 * is true the partial string will be cached.
		 *
		 * @param {String} options
		 * @param {Function} fn
		 * @api private
		 */

		function readPartials(path, options, cb) {
		  if (!options.partials) return cb();
		  var keys = Object.keys(options.partials);
		  var partials = {};

		  function next(index) {
		    if (index === keys.length) return cb(null, partials);
		    var key = keys[index];
		    var partialPath = options.partials[key];

		    if (partialPath === undefined || partialPath === null || partialPath === false) {
		      return next(++index);
		    }

		    var file;
		    if (isAbsolute(partialPath)) {
		      if (extname(partialPath) !== '') {
		        file = partialPath;
		      } else {
		        file = join(partialPath + extname(path));
		      }
		    } else {
		      file = join(dirname(path), partialPath + extname(path));
		    }

		    read(file, options, function(err, str) {
		      if (err) return cb(err);
		      partials[key] = str;
		      next(++index);
		    });
		  }

		  next(0);
		}

		/**
		 * promisify
		 */
		function promisify(cb, fn) {
		  return new Promise(function(resolve, reject) {
		    cb = cb || function(err, html) {
		      if (err) {
		        return reject(err);
		      }
		      resolve(html);
		    };
		    fn(cb);
		  });
		}

		/**
		 * fromStringRenderer
		 */

		function fromStringRenderer(name) {
		  return function(path, options, cb) {
		    options.filename = path;

		    return promisify(cb, function(cb) {
		      readPartials(path, options, function(err, partials) {
		        var extend = (requires.extend || (requires.extend = require$$2._extend));
		        var opts = extend({}, options);
		        opts.partials = partials;
		        if (err) return cb(err);
		        if (cache(opts)) {
		          exports$1[name].render('', opts, cb);
		        } else {
		          read(path, opts, function(err, str) {
		            if (err) return cb(err);
		            exports$1[name].render(str, opts, cb);
		          });
		        }
		      });
		    });
		  };
		}

		/**
		 * velocity support.
		 */

		exports$1.velocityjs = fromStringRenderer('velocityjs');

		/**
		 * velocity string support.
		 */

		exports$1.velocityjs.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.velocityjs || (requires.velocityjs = require('velocityjs'));
		    try {
		      options.locals = options;
		      cb(null, engine.render(str, options).trimLeft());
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Liquid support.
		 */

		exports$1.liquid = fromStringRenderer('liquid');

		/**
		 * Liquid string support.
		 */

		/**
		 * Note that in order to get filters and custom tags we've had to push
		 * all user-defined locals down into @locals. However, just to make things
		 * backwards-compatible, any property of `options` that is left after
		 * processing and removing `locals`, `meta`, `filters`, `customTags` and
		 * `includeDir` will also become a local.
		 */

		function _renderTinyliquid(engine, str, options, cb) {
		  var context = engine.newContext();
		  var k;

		  /**
		   * Note that there's a bug in the library that doesn't allow us to pass
		   * the locals to newContext(), hence looping through the keys:
		   */

		  if (options.locals) {
		    for (k in options.locals) {
		      context.setLocals(k, options.locals[k]);
		    }
		    delete options.locals;
		  }

		  if (options.meta) {
		    context.setLocals('page', options.meta);
		    delete options.meta;
		  }

		  /**
		   * Add any defined filters:
		   */

		  if (options.filters) {
		    for (k in options.filters) {
		      context.setFilter(k, options.filters[k]);
		    }
		    delete options.filters;
		  }

		  /**
		   * Set up a callback for the include directory:
		   */

		  var includeDir = options.includeDir || process.cwd();

		  context.onInclude(function(name, callback) {
		    var extname = path.extname(name) ? '' : '.liquid';
		    var filename = path.resolve(includeDir, name + extname);

		    fs.readFile(filename, {encoding: 'utf8'}, function(err, data) {
		      if (err) return callback(err);
		      callback(null, engine.parse(data));
		    });
		  });
		  delete options.includeDir;

		  /**
		   * The custom tag functions need to have their results pushed back
		   * through the parser, so set up a shim before calling the provided
		   * callback:
		   */

		  var compileOptions = {
		    customTags: {}
		  };

		  if (options.customTags) {
		    var tagFunctions = options.customTags;

		    for (k in options.customTags) {
		      /*Tell jshint there's no problem with having this function in the loop */
		      /*jshint -W083 */
		      compileOptions.customTags[k] = function(context, name, body) {
		        var tpl = tagFunctions[name](body.trim());
		        context.astStack.push(engine.parse(tpl));
		      };
		      /*jshint +W083 */
		    }
		    delete options.customTags;
		  }

		  /**
		   * Now anything left in `options` becomes a local:
		   */

		  for (k in options) {
		    context.setLocals(k, options[k]);
		  }

		  /**
		   * Finally, execute the template:
		   */

		  var tmpl = cache(context) || cache(context, engine.compile(str, compileOptions));
		  tmpl(context, cb);
		}

		exports$1.liquid.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.liquid;
		    var Liquid;

		    try {
		      // set up tinyliquid engine
		      engine = requires.liquid = require('tinyliquid');

		      // use tinyliquid engine
		      _renderTinyliquid(engine, str, options, cb);

		      return;

		    } catch (err) {

		      // set up liquid-node engine
		      try {
		        Liquid = requires.liquid = require('liquid-node');
		        engine = new Liquid.Engine();
		      } catch (err) {
		        throw err;
		      }

		    }

		    // use liquid-node engine
		    try {
		      var locals = options.locals || {};

		      if (options.meta) {
		        locals.pages = options.meta;
		        delete options.meta;
		      }

		      /**
		       * Add any defined filters:
		       */

		      if (options.filters) {
		        engine.registerFilters(options.filters);
		        delete options.filters;
		      }

		      /**
		       * Set up a callback for the include directory:
		       */

		      var includeDir = options.includeDir || process.cwd();
		      engine.fileSystem = new Liquid.LocalFileSystem(includeDir, 'liquid');
		      delete options.includeDir;

		      /**
		       * The custom tag functions need to have their results pushed back
		       * through the parser, so set up a shim before calling the provided
		       * callback:
		       */

		      if (options.customTags) {
		        var tagFunctions = options.customTags;

		        for (k in options.customTags) {
		          engine.registerTag(k, tagFunctions[k]);
		        }
		        delete options.customTags;
		      }

		      /**
		       * Now anything left in `options` becomes a local:
		       */

		      for (var k in options) {
		        locals[k] = options[k];
		      }

		      /**
		       * Finally, execute the template:
		       */

		      return engine
		        .parseAndRender(str, locals)
		        .nodeify(function(err, result) {
		          if (err) {
		            throw new Error(err);
		          } else {
		            return cb(null, result);
		          }
		        });

		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Jade support.
		 */

		exports$1.jade = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.jade;
		    if (!engine) {
		      try {
		        engine = requires.jade = require('jade');
		      } catch (err) {
		        try {
		          engine = requires.jade = require('then-jade');
		        } catch (otherError) {
		          throw err;
		        }
		      }
		    }

		    try {
		      var tmpl = cache(options) || cache(options, engine.compileFile(path, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Jade string support.
		 */

		exports$1.jade.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.jade;
		    if (!engine) {
		      try {
		        engine = requires.jade = require('jade');
		      } catch (err) {
		        try {
		          engine = requires.jade = require('then-jade');
		        } catch (otherError) {
		          throw err;
		        }
		      }
		    }

		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Dust support.
		 */

		exports$1.dust = fromStringRenderer('dust');

		/**
		 * Dust string support.
		 */

		exports$1.dust.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.dust;
		    if (!engine) {
		      try {
		        engine = requires.dust = require('dust');
		      } catch (err) {
		        try {
		          engine = requires.dust = require('dustjs-helpers');
		        } catch (err) {
		          engine = requires.dust = require('dustjs-linkedin');
		        }
		      }
		    }

		    var ext = 'dust';
		    var views = '.';

		    if (options) {
		      if (options.ext) ext = options.ext;
		      if (options.views) views = options.views;
		      if (options.settings && options.settings.views) views = options.settings.views;
		    }
		    if (!options || (options && !options.cache)) engine.cache = {};

		    engine.onLoad = function(path, callback) {
		      if (extname(path) === '') path += '.' + ext;
		      if (path[0] !== '/') path = views + '/' + path;
		      read(path, options, callback);
		    };

		    try {
		      var templateName;
		      if (options.filename) {
		        templateName = options.filename.replace(new RegExp('^' + views + '/'), '').replace(new RegExp('\\.' + ext), '');
		      }

		      var tmpl = cache(options) || cache(options, engine.compileFn(str, templateName));
		      tmpl(options, cb);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Swig support.
		 */

		exports$1.swig = fromStringRenderer('swig');

		/**
		 * Swig string support.
		 */

		exports$1.swig.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.swig;
		    if (!engine) {
		      try {
		        engine = requires.swig = require('swig');
		      } catch (err) {
		        try {
		          engine = requires.swig = require('swig-templates');
		        } catch (otherError) {
		          throw err;
		        }
		      }
		    }

		    try {
		      if (options.cache === true) options.cache = 'memory';
		      engine.setDefaults({ cache: options.cache });
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Razor support.
		 */

		exports$1.razor = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.razor;
		    if (!engine) {
		      try {
		        engine = requires.razor = require('razor-tmpl');

		      } catch (err) {

		        throw err;

		      }
		    }
		    try {

		      var tmpl = cache(options) || cache(options, (locals) => {
		        console.log('Rendering razor file', path);
		        return engine.renderFileSync(path, locals);
		      });
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * razor string support.
		 */

		exports$1.razor.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {

		    try {
		      var engine = requires.razor = require('razor-tmpl');
		    } catch (err) {
		      throw err;
		    }

		    try {
		      var tf = engine.compile(str);
		      var tmpl = cache(options) || cache(options, tf);
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Atpl support.
		 */

		exports$1.atpl = fromStringRenderer('atpl');

		/**
		 * Atpl string support.
		 */

		exports$1.atpl.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.atpl || (requires.atpl = require('atpl'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Liquor support,
		 */

		exports$1.liquor = fromStringRenderer('liquor');

		/**
		 * Liquor string support.
		 */

		exports$1.liquor.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.liquor || (requires.liquor = require('liquor'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Twig support.
		 */

		exports$1.twig = fromStringRenderer('twig');

		/**
		 * Twig string support.
		 */

		exports$1.twig.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.twig || (requires.twig = require('twig').twig);
		    var templateData = {
		      data: str,
		      allowInlineIncludes: options.allowInlineIncludes,
		      namespaces: options.namespaces,
		      path: options.path
		    };
		    try {
		      var tmpl = cache(templateData) || cache(templateData, engine(templateData));
		      cb(null, tmpl.render(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * EJS support.
		 */

		exports$1.ejs = fromStringRenderer('ejs');

		/**
		 * EJS string support.
		 */

		exports$1.ejs.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.ejs || (requires.ejs = require('ejs'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Eco support.
		 */

		exports$1.eco = fromStringRenderer('eco');

		/**
		 * Eco string support.
		 */

		exports$1.eco.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.eco || (requires.eco = require('eco'));
		    try {
		      cb(null, engine.render(str, options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Jazz support.
		 */

		exports$1.jazz = fromStringRenderer('jazz');

		/**
		 * Jazz string support.
		 */

		exports$1.jazz.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.jazz || (requires.jazz = require('jazz'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      tmpl.eval(options, function(str) {
		        cb(null, str);
		      });
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * JQTPL support.
		 */

		exports$1.jqtpl = fromStringRenderer('jqtpl');

		/**
		 * JQTPL string support.
		 */

		exports$1.jqtpl.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.jqtpl || (requires.jqtpl = require('jqtpl'));
		    try {
		      engine.template(str, str);
		      cb(null, engine.tmpl(str, options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Haml support.
		 */

		exports$1.haml = fromStringRenderer('haml');

		/**
		 * Haml string support.
		 */

		exports$1.haml.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.haml || (requires.haml = require('hamljs'));
		    try {
		      options.locals = options;
		      cb(null, engine.render(str, options).trimLeft());
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Hamlet support.
		 */

		exports$1.hamlet = fromStringRenderer('hamlet');

		/**
		 * Hamlet string support.
		 */

		exports$1.hamlet.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.hamlet || (requires.hamlet = require('hamlet'));
		    try {
		      options.locals = options;
		      cb(null, engine.render(str, options).trimLeft());
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Whiskers support.
		 */

		exports$1.whiskers = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.whiskers || (requires.whiskers = require('whiskers'));
		    engine.__express(path, options, cb);
		  });
		};

		/**
		 * Whiskers string support.
		 */

		exports$1.whiskers.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.whiskers || (requires.whiskers = require('whiskers'));
		    try {
		      cb(null, engine.render(str, options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Coffee-HAML support.
		 */

		exports$1['haml-coffee'] = fromStringRenderer('haml-coffee');

		/**
		 * Coffee-HAML string support.
		 */

		exports$1['haml-coffee'].render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires['haml-coffee'] || (requires['haml-coffee'] = require('haml-coffee'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Hogan support.
		 */

		exports$1.hogan = fromStringRenderer('hogan');

		/**
		 * Hogan string support.
		 */

		exports$1.hogan.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.hogan || (requires.hogan = require('hogan.js'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl.render(options, options.partials));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * templayed.js support.
		 */

		exports$1.templayed = fromStringRenderer('templayed');

		/**
		 * templayed.js string support.
		 */

		exports$1.templayed.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.templayed || (requires.templayed = require('templayed'));
		    try {
		      var tmpl = cache(options) || cache(options, engine(str));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Handlebars support.
		 */

		exports$1.handlebars = fromStringRenderer('handlebars');

		/**
		 * Handlebars string support.
		 */

		exports$1.handlebars.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.handlebars || (requires.handlebars = require('handlebars'));
		    try {
		      for (var partial in options.partials) {
		        engine.registerPartial(partial, options.partials[partial]);
		      }
		      for (var helper in options.helpers) {
		        engine.registerHelper(helper, options.helpers[helper]);
		      }
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Underscore support.
		 */

		exports$1.underscore = fromStringRenderer('underscore');

		/**
		 * Underscore string support.
		 */

		exports$1.underscore.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.underscore || (requires.underscore = require('underscore'));
		    try {
		      const partials = {};
		      for (var partial in options.partials) {
		        partials[partial] = engine.template(options.partials[partial]);
		      }
		      options.partials = partials;
		      var tmpl = cache(options) || cache(options, engine.template(str, null, options));
		      cb(null, tmpl(options).replace(/\n$/, ''));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Lodash support.
		 */

		exports$1.lodash = fromStringRenderer('lodash');

		/**
		 * Lodash string support.
		 */

		exports$1.lodash.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.lodash || (requires.lodash = require('lodash'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.template(str, options));
		      cb(null, tmpl(options).replace(/\n$/, ''));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Pug support. (formerly Jade)
		 */

		exports$1.pug = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.pug;
		    if (!engine) {
		      try {
		        engine = requires.pug = require('pug');
		      } catch (err) {
		        try {
		          engine = requires.pug = require('then-pug');
		        } catch (otherError) {
		          throw err;
		        }
		      }
		    }

		    try {
		      var tmpl = cache(options) || cache(options, engine.compileFile(path, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Pug string support.
		 */

		exports$1.pug.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.pug;
		    if (!engine) {
		      try {
		        engine = requires.pug = require('pug');
		      } catch (err) {
		        try {
		          engine = requires.pug = require('then-pug');
		        } catch (otherError) {
		          throw err;
		        }
		      }
		    }

		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * QEJS support.
		 */

		exports$1.qejs = fromStringRenderer('qejs');

		/**
		 * QEJS string support.
		 */

		exports$1.qejs.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    try {
		      var engine = requires.qejs || (requires.qejs = require('qejs'));
		      engine.render(str, options).then(function(result) {
		        cb(null, result);
		      }, function(err) {
		        cb(err);
		      }).done();
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Walrus support.
		 */

		exports$1.walrus = fromStringRenderer('walrus');

		/**
		 * Walrus string support.
		 */

		exports$1.walrus.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.walrus || (requires.walrus = require('walrus'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.parse(str));
		      cb(null, tmpl.compile(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Mustache support.
		 */

		exports$1.mustache = fromStringRenderer('mustache');

		/**
		 * Mustache string support.
		 */

		exports$1.mustache.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.mustache || (requires.mustache = require('mustache'));
		    try {
		      cb(null, engine.render(str, options, options.partials));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Just support.
		 */

		exports$1.just = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.just;
		    if (!engine) {
		      var JUST = require('just');
		      engine = requires.just = new JUST();
		    }
		    engine.configure({ useCache: options.cache });
		    engine.render(path, options, cb);
		  });
		};

		/**
		 * Just string support.
		 */

		exports$1.just.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var JUST = require('just');
		    var engine = new JUST({ root: { page: str }});
		    engine.render('page', options, cb);
		  });
		};

		/**
		 * ECT support.
		 */

		exports$1.ect = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.ect;
		    if (!engine) {
		      var ECT = require('ect');
		      engine = requires.ect = new ECT(options);
		    }
		    engine.configure({ cache: options.cache });
		    engine.render(path, options, cb);
		  });
		};

		/**
		 * ECT string support.
		 */

		exports$1.ect.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var ECT = require('ect');
		    var engine = new ECT({ root: { page: str }});
		    engine.render('page', options, cb);
		  });
		};

		/**
		 * mote support.
		 */

		exports$1.mote = fromStringRenderer('mote');

		/**
		 * mote string support.
		 */

		exports$1.mote.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.mote || (requires.mote = require('mote'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Toffee support.
		 */

		exports$1.toffee = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var toffee = requires.toffee || (requires.toffee = require('toffee'));
		    toffee.__consolidate_engine_render(path, options, cb);
		  });
		};

		/**
		 * Toffee string support.
		 */

		exports$1.toffee.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.toffee || (requires.toffee = require('toffee'));
		    try {
		      engine.str_render(str, options, cb);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * doT support.
		 */

		exports$1.dot = fromStringRenderer('dot');

		/**
		 * doT string support.
		 */

		exports$1.dot.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.dot || (requires.dot = require('dot'));
		    var extend = (requires.extend || (requires.extend = require$$2._extend));
		    try {
		      var settings = {};
		      settings = extend(settings, engine.templateSettings);
		      settings = extend(settings, options ? options.dot : {});
		      var tmpl = cache(options) || cache(options, engine.template(str, settings, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * bracket support.
		 */

		exports$1.bracket = fromStringRenderer('bracket');

		/**
		 * bracket string support.
		 */

		exports$1.bracket.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.bracket || (requires.bracket = require('bracket-template'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.default.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Ractive support.
		 */

		exports$1.ractive = fromStringRenderer('ractive');

		/**
		 * Ractive string support.
		 */

		exports$1.ractive.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var Engine = requires.ractive || (requires.ractive = require('ractive'));

		    var template = cache(options) || cache(options, Engine.parse(str));
		    options.template = template;

		    if (options.data === null || options.data === undefined) {
		      var extend = (requires.extend || (requires.extend = require$$2._extend));

		      // Shallow clone the options object
		      options.data = extend({}, options);

		      // Remove consolidate-specific properties from the clone
		      var i;
		      var length;
		      var properties = ['template', 'filename', 'cache', 'partials'];
		      for (i = 0, length = properties.length; i < length; i++) {
		        var property = properties[i];
		        delete options.data[property];
		      }
		    }

		    try {
		      cb(null, new Engine(options).toHTML());
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Nunjucks support.
		 */

		exports$1.nunjucks = fromStringRenderer('nunjucks');

		/**
		 * Nunjucks string support.
		 */

		exports$1.nunjucks.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {

		    try {

		      var engine = options.nunjucksEnv || requires.nunjucks || (requires.nunjucks = require('nunjucks'));

		      var env = engine;

		      // deprecated fallback support for express
		      // <https://github.com/tj/consolidate.js/pull/152>
		      // <https://github.com/tj/consolidate.js/pull/224>
		      if (options.settings && options.settings.views) {
		        env = engine.configure(options.settings.views);
		      } else if (options.nunjucks && options.nunjucks.configure) {
		        env = engine.configure.apply(engine, options.nunjucks.configure);
		      }

		      //
		      // because `renderString` does not initiate loaders
		      // we must manually create a loader for it based off
		      // either `options.settings.views` or `options.nunjucks` or `options.nunjucks.root`
		      //
		      // <https://github.com/mozilla/nunjucks/issues/730>
		      // <https://github.com/crocodilejs/node-email-templates/issues/182>
		      //

		      // so instead we simply check if we passed a custom loader
		      // otherwise we create a simple file based loader
		      if (options.loader) {
		        env = new engine.Environment(options.loader);
		      } else if (options.settings && options.settings.views) {
		        env = new engine.Environment(
		          new engine.FileSystemLoader(options.settings.views)
		        );
		      } else if (options.nunjucks && options.nunjucks.loader) {
		        if (typeof options.nunjucks.loader === 'string') {
		          env = new engine.Environment(new engine.FileSystemLoader(options.nunjucks.loader));
		        } else {
		          env = new engine.Environment(
		            new engine.FileSystemLoader(
		              options.nunjucks.loader[0],
		              options.nunjucks.loader[1]
		            )
		          );
		        }
		      }

		      env.renderString(str, options, cb);
		    } catch (err) {
		      throw cb(err);
		    }
		  });
		};

		/**
		 * HTMLing support.
		 */

		exports$1.htmling = fromStringRenderer('htmling');

		/**
		 * HTMLing string support.
		 */

		exports$1.htmling.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.htmling || (requires.htmling = require('htmling'));
		    try {
		      var tmpl = cache(options) || cache(options, engine.string(str));
		      cb(null, tmpl.render(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 *  Rendering function
		 */
		function requireReact(module, filename) {
		  var babel = requires.babel || (requires.babel = require('babel-core'));

		  var compiled = babel.transformFileSync(filename, { presets: [ 'react' ] }).code;

		  return module._compile(compiled, filename);
		}

		exports$1.requireReact = requireReact;

		/**
		 *  Converting a string into a node module.
		 */
		function requireReactString(src, filename) {
		  var babel = requires.babel || (requires.babel = require('babel-core'));

		  if (!filename) filename = '';
		  var m = new module.constructor();
		  filename = filename || '';

		  // Compile Using React
		  var compiled = babel.transform(src, { presets: [ 'react' ] }).code;

		  // Compile as a module
		  m.paths = module.paths;
		  m._compile(compiled, filename);

		  return m.exports;
		}

		/**
		 * A naive helper to replace {{tags}} with options.tags content
		 */
		function reactBaseTmpl(data, options) {

		  var exp;
		  var regex;

		  // Iterates through the keys in file object
		  // and interpolate / replace {{key}} with it's value
		  for (var k in options) {
		    if (options.hasOwnProperty(k)) {
		      exp = '{{' + k + '}}';
		      regex = new RegExp(exp, 'g');
		      if (data.match(regex)) {
		        data = data.replace(regex, options[k]);
		      }
		    }
		  }

		  return data;
		}

		/**
		* Plates Support.
		*/

		exports$1.plates = fromStringRenderer('plates');

		/**
		* Plates string support.
		*/

		exports$1.plates.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.plates || (requires.plates = require('plates'));
		    var map = options.map || undefined;
		    try {
		      var tmpl = engine.bind(str, options, map);
		      cb(null, tmpl);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 *  The main render parser for React bsaed templates
		 */
		function reactRenderer(type) {

		  if (commonjsRequire.extensions) {

		    // Ensure JSX is transformed on require
		    if (!commonjsRequire.extensions['.jsx']) {
		      commonjsRequire.extensions['.jsx'] = requireReact;
		    }

		    // Supporting .react extension as well as test cases
		    // Using .react extension is not recommended.
		    if (!commonjsRequire.extensions['.react']) {
		      commonjsRequire.extensions['.react'] = requireReact;
		    }

		  }

		  // Return rendering fx
		  return function(str, options, cb) {
		    return promisify(cb, function(cb) {
		      // React Import
		      var ReactDOM = requires.ReactDOM || (requires.ReactDOM = require('react-dom/server'));
		      var react = requires.react || (requires.react = require('react'));

		      // Assign HTML Base
		      var base = options.base;
		      delete options.base;

		      var enableCache = options.cache;
		      delete options.cache;

		      var isNonStatic = options.isNonStatic;
		      delete options.isNonStatic;

		      // Start Conversion
		      try {

		        var Code;
		        var Factory;

		        var baseStr;
		        var content;
		        var parsed;

		        if (!cache(options)) {
		          // Parsing
		          if (type === 'path') {
		            var path = resolve(str);
		            delete require.cache[path];
		            Code = commonjsRequire(path);
		          } else {
		            Code = requireReactString(str);
		          }
		          Factory = cache(options, react.createFactory(Code));

		        } else {
		          Factory = cache(options);
		        }

		        parsed = new Factory(options);
		        content = (isNonStatic) ? ReactDOM.renderToString(parsed) : ReactDOM.renderToStaticMarkup(parsed);

		        if (base) {
		          baseStr = readCache[str] || fs.readFileSync(resolve(base), 'utf8');

		          if (enableCache) {
		            readCache[str] = baseStr;
		          }

		          options.content = content;
		          content = reactBaseTmpl(baseStr, options);
		        }

		        cb(null, content);

		      } catch (err) {
		        cb(err);
		      }
		    });
		  };
		}

		/**
		 * React JS Support
		 */
		exports$1.react = reactRenderer('path');

		/**
		 * React JS string support.
		 */
		exports$1.react.render = reactRenderer('string');

		/**
		 * ARC-templates support.
		 */

		exports$1['arc-templates'] = fromStringRenderer('arc-templates');

		/**
		 * ARC-templates string support.
		 */

		exports$1['arc-templates'].render = function(str, options, cb) {
		  var readFileWithOptions = util.promisify(read);
		  var consolidateFileSystem = {};
		  consolidateFileSystem.readFile = function(path) {
		    return readFileWithOptions(path, options);
		  };

		  return promisify(cb, function(cb) {
		    try {
		      var engine = requires['arc-templates'];
		      if (!engine) {
		        var Engine = require('arc-templates/dist/es5');
		        engine = requires['arc-templates'] = new Engine({ filesystem: consolidateFileSystem });
		      }

		      var compiler = cache(options) || cache(options, engine.compileString(str, options.filename));
		      compiler.then(function(func) { return func(options); })
		        .then(function(result) { cb(null, result.content); })
		        .catch(cb);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Vash support
		 */
		exports$1.vash = fromStringRenderer('vash');

		/**
		 * Vash string support
		 */
		exports$1.vash.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.vash || (requires.vash = require('vash'));

		    try {
		      // helper system : https://github.com/kirbysayshi/vash#helper-system
		      if (options.helpers) {
		        for (var key in options.helpers) {
		          if (!options.helpers.hasOwnProperty(key) || typeof options.helpers[key] !== 'function') {
		            continue;
		          }
		          engine.helpers[key] = options.helpers[key];
		        }
		      }

		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      tmpl(options, function sealLayout(err, ctx) {
		        if (err) cb(err);
		        ctx.finishLayout();
		        cb(null, ctx.toString().replace(/\n$/, ''));
		      });
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Slm support.
		 */

		exports$1.slm = fromStringRenderer('slm');

		/**
		 * Slm string support.
		 */

		exports$1.slm.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.slm || (requires.slm = require('slm'));

		    try {
		      var tmpl = cache(options) || cache(options, engine.compile(str, options));
		      cb(null, tmpl(options));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Marko support.
		 */

		exports$1.marko = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.marko || (requires.marko = require('marko'));
		    options.writeToDisk = !!options.cache;

		    try {
		      var tmpl = cache(options) || cache(options, engine.load(path, options));
		      tmpl.renderToString(options, cb);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Marko string support.
		 */

		exports$1.marko.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.marko || (requires.marko = require('marko'));
		    options.writeToDisk = !!options.cache;
		    options.filename = options.filename || 'string.marko';

		    try {
		      var tmpl = cache(options) || cache(options, engine.load(options.filename, str, options));
		      tmpl.renderToString(options, cb);
		    } catch (err) {
		      cb(err);
		    }
		  });
		};

		/**
		 * Teacup support.
		 */
		exports$1.teacup = function(path, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.teacup || (requires.teacup = require('teacup/lib/express'));
		    commonjsRequire.extensions['.teacup'] = commonjsRequire.extensions['.coffee'];
		    if (path[0] !== '/') {
		      path = join(process.cwd(), path);
		    }
		    if (!options.cache) {
		      var callback = cb;
		      cb = function() {
		        delete require.cache[path];
		        callback.apply(this, arguments);
		      };
		    }
		    engine.renderFile(path, options, cb);
		  });
		};

		/**
		 * Teacup string support.
		 */
		exports$1.teacup.render = function(str, options, cb) {
		  var coffee = require('coffee-script');
		  var vm = require('vm');
		  var sandbox = {
		    module: {exports: {}},
		    require: commonjsRequire
		  };
		  return promisify(cb, function(cb) {
		    vm.runInNewContext(coffee.compile(str), sandbox);
		    var tmpl = sandbox.module.exports;
		    cb(null, tmpl(options));
		  });
		};

		/**
		 * Squirrelly support.
		 */

		exports$1.squirrelly = fromStringRenderer('squirrelly');

		/**
		 * Squirrelly string support.
		 */

		exports$1.squirrelly.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.squirrelly || (requires.squirrelly = require('squirrelly'));
		    try {
		      for (var partial in options.partials) {
		        engine.definePartial(partial, options.partials[partial]);
		      }
		      for (var helper in options.helpers) {
		        engine.defineHelper(helper, options.helpers[helper]);
		      }
		      var tmpl = cache(options) || cache(options, engine.Compile(str, options));
		      cb(null, tmpl(options, engine));
		    } catch (err) {
		      cb(err);
		    }
		  });
		};
		/**
		 * Twing support.
		 */

		exports$1.twing = fromStringRenderer('twing');

		/**
		 * Twing string support.
		 */ 

		exports$1.twing.render = function(str, options, cb) {
		  return promisify(cb, function(cb) {
		    var engine = requires.twing || (requires.twing = require('twing'));
		    try {
		      new engine.TwingEnvironment(new engine.TwingLoaderNull()).createTemplate(str).then((twingTemplate) => {
		        twingTemplate.render(options).then((rendTmpl) => {
		          var tmpl = cache(options) || cache(options, rendTmpl);
		          cb(null, tmpl);
		        });
		      });
		    } catch (err) {
		      cb(err);
		    }
		  });
		};
		/**
		 * expose the instance of the engine
		 */
		exports$1.requires = requires; 
	} (consolidate$2, consolidate$2.exports));
	return consolidate$2.exports;
}

var consolidate$1;
var hasRequiredConsolidate;

function requireConsolidate () {
	if (hasRequiredConsolidate) return consolidate$1;
	hasRequiredConsolidate = 1;
	consolidate$1 = /*@__PURE__*/ requireConsolidate$1();
	return consolidate$1;
}

var consolidateExports = /*@__PURE__*/ requireConsolidate();
var consolidate = /*@__PURE__*/getDefaultExportFromCjs(consolidateExports);

const hasWarned = {};
function warnOnce(msg) {
  const isNodeProd = typeof process !== "undefined" && process.env.NODE_ENV === "production";
  if (!isNodeProd && true && !hasWarned[msg]) {
    hasWarned[msg] = true;
    warn(msg);
  }
}
function warn(msg) {
  console.warn(
    `\x1B[1m\x1B[33m[@vue/compiler-sfc]\x1B[0m\x1B[33m ${msg}\x1B[0m
`
  );
}

function preprocess$1({ source, filename, preprocessOptions }, preprocessor) {
  let res = "";
  let err = null;
  preprocessor.render(
    source,
    { filename, ...preprocessOptions },
    (_err, _res) => {
      if (_err) err = _err;
      res = _res;
    }
  );
  if (err) throw err;
  return res;
}
function compileTemplate(options) {
  const { preprocessLang, preprocessCustomRequire } = options;
  const preprocessor = preprocessLang ? preprocessCustomRequire ? preprocessCustomRequire(preprocessLang) : consolidate[preprocessLang] : false;
  if (preprocessor) {
    try {
      return doCompileTemplate({
        ...options,
        source: preprocess$1(options, preprocessor),
        ast: void 0
        // invalidate AST if template goes through preprocessor
      });
    } catch (e) {
      return {
        code: `export default function render() {}`,
        source: options.source,
        tips: [],
        errors: [e]
      };
    }
  } else if (preprocessLang) {
    return {
      code: `export default function render() {}`,
      source: options.source,
      tips: [
        `Component ${options.filename} uses lang ${preprocessLang} for template. Please install the language preprocessor.`
      ],
      errors: [
        `Component ${options.filename} uses lang ${preprocessLang} for template, however it is not installed.`
      ]
    };
  } else {
    return doCompileTemplate(options);
  }
}
function doCompileTemplate({
  filename,
  id,
  scoped,
  slotted,
  inMap,
  source,
  ast: inAST,
  ssr = false,
  ssrCssVars,
  isProd = false,
  compiler,
  compilerOptions = {},
  transformAssetUrls
}) {
  const errors = [];
  const warnings = [];
  let nodeTransforms = [];
  if (shared.isObject(transformAssetUrls)) {
    const assetOptions = normalizeOptions(transformAssetUrls);
    nodeTransforms = [
      createAssetUrlTransformWithOptions(assetOptions),
      createSrcsetTransformWithOptions(assetOptions)
    ];
  } else if (transformAssetUrls !== false) {
    nodeTransforms = [transformAssetUrl, transformSrcset];
  }
  if (ssr && !ssrCssVars) {
    warnOnce(
      `compileTemplate is called with \`ssr: true\` but no corresponding \`cssVars\` option.`
    );
  }
  if (!id) {
    warnOnce(`compileTemplate now requires the \`id\` option.`);
    id = "";
  }
  const shortId = id.replace(/^data-v-/, "");
  const longId = `data-v-${shortId}`;
  const defaultCompiler = ssr ? CompilerSSR__namespace : CompilerDOM__namespace;
  compiler = compiler || defaultCompiler;
  if (compiler !== defaultCompiler) {
    inAST = void 0;
  }
  if (inAST == null ? void 0 : inAST.transformed) {
    const newAST = (ssr ? CompilerDOM__namespace : compiler).parse(inAST.source, {
      prefixIdentifiers: true,
      ...compilerOptions,
      parseMode: "sfc",
      onError: (e) => errors.push(e)
    });
    const template = newAST.children.find(
      (node) => node.type === 1 && node.tag === "template"
    );
    inAST = compilerCore.createRoot(template.children, inAST.source);
  }
  let { code, ast, preamble, map } = compiler.compile(inAST || source, {
    mode: "module",
    prefixIdentifiers: true,
    hoistStatic: true,
    cacheHandlers: true,
    ssrCssVars: ssr && ssrCssVars && ssrCssVars.length ? genCssVarsFromList(ssrCssVars, shortId, isProd, true) : "",
    scopeId: scoped ? longId : void 0,
    slotted,
    sourceMap: true,
    ...compilerOptions,
    hmr: !isProd,
    nodeTransforms: nodeTransforms.concat(compilerOptions.nodeTransforms || []),
    filename,
    onError: (e) => errors.push(e),
    onWarn: (w) => warnings.push(w)
  });
  if (inMap && !inAST) {
    if (map) {
      map = mapLines(inMap, map);
    }
    if (errors.length) {
      patchErrors(errors, source, inMap);
    }
  }
  const tips = warnings.map((w) => {
    let msg = w.message;
    if (w.loc) {
      msg += `
${shared.generateCodeFrame(
        (inAST == null ? void 0 : inAST.source) || source,
        w.loc.start.offset,
        w.loc.end.offset
      )}`;
    }
    return msg;
  });
  return { code, ast, preamble, source, errors, tips, map };
}
function mapLines(oldMap, newMap) {
  if (!oldMap) return newMap;
  if (!newMap) return oldMap;
  const oldMapConsumer = new sourceMapJs.SourceMapConsumer(oldMap);
  const newMapConsumer = new sourceMapJs.SourceMapConsumer(newMap);
  const mergedMapGenerator = new sourceMapJs.SourceMapGenerator();
  newMapConsumer.eachMapping((m) => {
    if (m.originalLine == null) {
      return;
    }
    const origPosInOldMap = oldMapConsumer.originalPositionFor({
      line: m.originalLine,
      column: m.originalColumn
    });
    if (origPosInOldMap.source == null) {
      return;
    }
    mergedMapGenerator.addMapping({
      generated: {
        line: m.generatedLine,
        column: m.generatedColumn
      },
      original: {
        line: origPosInOldMap.line,
        // map line
        // use current column, since the oldMap produced by @vue/compiler-sfc
        // does not
        column: m.originalColumn
      },
      source: origPosInOldMap.source,
      name: origPosInOldMap.name
    });
  });
  const generator = mergedMapGenerator;
  oldMapConsumer.sources.forEach((sourceFile) => {
    generator._sources.add(sourceFile);
    const sourceContent = oldMapConsumer.sourceContentFor(sourceFile);
    if (sourceContent != null) {
      mergedMapGenerator.setSourceContent(sourceFile, sourceContent);
    }
  });
  generator._sourceRoot = oldMap.sourceRoot;
  generator._file = oldMap.file;
  return generator.toJSON();
}
function patchErrors(errors, source, inMap) {
  const originalSource = inMap.sourcesContent[0];
  const offset = originalSource.indexOf(source);
  const lineOffset = originalSource.slice(0, offset).split(/\r?\n/).length - 1;
  errors.forEach((err) => {
    if (err.loc) {
      err.loc.start.line += lineOffset;
      err.loc.start.offset += offset;
      if (err.loc.end !== err.loc.start) {
        err.loc.end.line += lineOffset;
        err.loc.end.offset += offset;
      }
    }
  });
}

const trimPlugin = () => {
  return {
    postcssPlugin: "vue-sfc-trim",
    Once(root) {
      root.walk(({ type, raws }) => {
        if (type === "rule" || type === "atrule") {
          if (raws.before) raws.before = "\n";
          if ("after" in raws && raws.after) raws.after = "\n";
        }
      });
    }
  };
};
trimPlugin.postcss = true;

var dist$1 = {exports: {}};

var processor$1 = {exports: {}};

var parser$1 = {exports: {}};

var root$1 = {exports: {}};

var container$1 = {exports: {}};

var node$2 = {exports: {}};

var util$2 = {};

var unesc$1 = {exports: {}};

var hasRequiredUnesc$1;

function requireUnesc$1 () {
	if (hasRequiredUnesc$1) return unesc$1.exports;
	hasRequiredUnesc$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = unesc;
		// Many thanks for this post which made this migration much easier.
		// https://mathiasbynens.be/notes/css-escapes

		/**
		 * 
		 * @param {string} str 
		 * @returns {[string, number]|undefined}
		 */
		function gobbleHex(str) {
		  var lower = str.toLowerCase();
		  var hex = '';
		  var spaceTerminated = false;
		  for (var i = 0; i < 6 && lower[i] !== undefined; i++) {
		    var code = lower.charCodeAt(i);
		    // check to see if we are dealing with a valid hex char [a-f|0-9]
		    var valid = code >= 97 && code <= 102 || code >= 48 && code <= 57;
		    // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		    spaceTerminated = code === 32;
		    if (!valid) {
		      break;
		    }
		    hex += lower[i];
		  }
		  if (hex.length === 0) {
		    return undefined;
		  }
		  var codePoint = parseInt(hex, 16);
		  var isSurrogate = codePoint >= 0xD800 && codePoint <= 0xDFFF;
		  // Add special case for
		  // "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
		  // https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
		  if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
		    return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
		  }
		  return [String.fromCodePoint(codePoint), hex.length + (spaceTerminated ? 1 : 0)];
		}
		var CONTAINS_ESCAPE = /\\/;
		function unesc(str) {
		  var needToProcess = CONTAINS_ESCAPE.test(str);
		  if (!needToProcess) {
		    return str;
		  }
		  var ret = "";
		  for (var i = 0; i < str.length; i++) {
		    if (str[i] === "\\") {
		      var gobbled = gobbleHex(str.slice(i + 1, i + 7));
		      if (gobbled !== undefined) {
		        ret += gobbled[0];
		        i += gobbled[1];
		        continue;
		      }

		      // Retain a pair of \\ if double escaped `\\\\`
		      // https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
		      if (str[i + 1] === "\\") {
		        ret += "\\";
		        i++;
		        continue;
		      }

		      // if \\ is at the end of the string retain it
		      // https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
		      if (str.length === i + 1) {
		        ret += str[i];
		      }
		      continue;
		    }
		    ret += str[i];
		  }
		  return ret;
		}
		module.exports = exports$1.default; 
	} (unesc$1, unesc$1.exports));
	return unesc$1.exports;
}

var getProp$1 = {exports: {}};

var hasRequiredGetProp$1;

function requireGetProp$1 () {
	if (hasRequiredGetProp$1) return getProp$1.exports;
	hasRequiredGetProp$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = getProp;
		function getProp(obj) {
		  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		    props[_key - 1] = arguments[_key];
		  }
		  while (props.length > 0) {
		    var prop = props.shift();
		    if (!obj[prop]) {
		      return undefined;
		    }
		    obj = obj[prop];
		  }
		  return obj;
		}
		module.exports = exports$1.default; 
	} (getProp$1, getProp$1.exports));
	return getProp$1.exports;
}

var ensureObject$1 = {exports: {}};

var hasRequiredEnsureObject$1;

function requireEnsureObject$1 () {
	if (hasRequiredEnsureObject$1) return ensureObject$1.exports;
	hasRequiredEnsureObject$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = ensureObject;
		function ensureObject(obj) {
		  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		    props[_key - 1] = arguments[_key];
		  }
		  while (props.length > 0) {
		    var prop = props.shift();
		    if (!obj[prop]) {
		      obj[prop] = {};
		    }
		    obj = obj[prop];
		  }
		}
		module.exports = exports$1.default; 
	} (ensureObject$1, ensureObject$1.exports));
	return ensureObject$1.exports;
}

var stripComments$1 = {exports: {}};

var hasRequiredStripComments$1;

function requireStripComments$1 () {
	if (hasRequiredStripComments$1) return stripComments$1.exports;
	hasRequiredStripComments$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = stripComments;
		function stripComments(str) {
		  var s = "";
		  var commentStart = str.indexOf("/*");
		  var lastEnd = 0;
		  while (commentStart >= 0) {
		    s = s + str.slice(lastEnd, commentStart);
		    var commentEnd = str.indexOf("*/", commentStart + 2);
		    if (commentEnd < 0) {
		      return s;
		    }
		    lastEnd = commentEnd + 2;
		    commentStart = str.indexOf("/*", lastEnd);
		  }
		  s = s + str.slice(lastEnd);
		  return s;
		}
		module.exports = exports$1.default; 
	} (stripComments$1, stripComments$1.exports));
	return stripComments$1.exports;
}

var hasRequiredUtil$2;

function requireUtil$2 () {
	if (hasRequiredUtil$2) return util$2;
	hasRequiredUtil$2 = 1;

	util$2.__esModule = true;
	util$2.unesc = util$2.stripComments = util$2.getProp = util$2.ensureObject = void 0;
	var _unesc = _interopRequireDefault(/*@__PURE__*/ requireUnesc$1());
	util$2.unesc = _unesc["default"];
	var _getProp = _interopRequireDefault(/*@__PURE__*/ requireGetProp$1());
	util$2.getProp = _getProp["default"];
	var _ensureObject = _interopRequireDefault(/*@__PURE__*/ requireEnsureObject$1());
	util$2.ensureObject = _ensureObject["default"];
	var _stripComments = _interopRequireDefault(/*@__PURE__*/ requireStripComments$1());
	util$2.stripComments = _stripComments["default"];
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	return util$2;
}

var hasRequiredNode$2;

function requireNode$2 () {
	if (hasRequiredNode$2) return node$2.exports;
	hasRequiredNode$2 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _util = /*@__PURE__*/ requireUtil$2();
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		var cloneNode = function cloneNode(obj, parent) {
		  if (typeof obj !== 'object' || obj === null) {
		    return obj;
		  }
		  var cloned = new obj.constructor();
		  for (var i in obj) {
		    if (!obj.hasOwnProperty(i)) {
		      continue;
		    }
		    var value = obj[i];
		    var type = typeof value;
		    if (i === 'parent' && type === 'object') {
		      if (parent) {
		        cloned[i] = parent;
		      }
		    } else if (value instanceof Array) {
		      cloned[i] = value.map(function (j) {
		        return cloneNode(j, cloned);
		      });
		    } else {
		      cloned[i] = cloneNode(value, cloned);
		    }
		  }
		  return cloned;
		};
		var Node = /*#__PURE__*/function () {
		  function Node(opts) {
		    if (opts === void 0) {
		      opts = {};
		    }
		    Object.assign(this, opts);
		    this.spaces = this.spaces || {};
		    this.spaces.before = this.spaces.before || '';
		    this.spaces.after = this.spaces.after || '';
		  }
		  var _proto = Node.prototype;
		  _proto.remove = function remove() {
		    if (this.parent) {
		      this.parent.removeChild(this);
		    }
		    this.parent = undefined;
		    return this;
		  };
		  _proto.replaceWith = function replaceWith() {
		    if (this.parent) {
		      for (var index in arguments) {
		        this.parent.insertBefore(this, arguments[index]);
		      }
		      this.remove();
		    }
		    return this;
		  };
		  _proto.next = function next() {
		    return this.parent.at(this.parent.index(this) + 1);
		  };
		  _proto.prev = function prev() {
		    return this.parent.at(this.parent.index(this) - 1);
		  };
		  _proto.clone = function clone(overrides) {
		    if (overrides === void 0) {
		      overrides = {};
		    }
		    var cloned = cloneNode(this);
		    for (var name in overrides) {
		      cloned[name] = overrides[name];
		    }
		    return cloned;
		  }

		  /**
		   * Some non-standard syntax doesn't follow normal escaping rules for css.
		   * This allows non standard syntax to be appended to an existing property
		   * by specifying the escaped value. By specifying the escaped value,
		   * illegal characters are allowed to be directly inserted into css output.
		   * @param {string} name the property to set
		   * @param {any} value the unescaped value of the property
		   * @param {string} valueEscaped optional. the escaped value of the property.
		   */;
		  _proto.appendToPropertyAndEscape = function appendToPropertyAndEscape(name, value, valueEscaped) {
		    if (!this.raws) {
		      this.raws = {};
		    }
		    var originalValue = this[name];
		    var originalEscaped = this.raws[name];
		    this[name] = originalValue + value; // this may trigger a setter that updates raws, so it has to be set first.
		    if (originalEscaped || valueEscaped !== value) {
		      this.raws[name] = (originalEscaped || originalValue) + valueEscaped;
		    } else {
		      delete this.raws[name]; // delete any escaped value that was created by the setter.
		    }
		  }

		  /**
		   * Some non-standard syntax doesn't follow normal escaping rules for css.
		   * This allows the escaped value to be specified directly, allowing illegal
		   * characters to be directly inserted into css output.
		   * @param {string} name the property to set
		   * @param {any} value the unescaped value of the property
		   * @param {string} valueEscaped the escaped value of the property.
		   */;
		  _proto.setPropertyAndEscape = function setPropertyAndEscape(name, value, valueEscaped) {
		    if (!this.raws) {
		      this.raws = {};
		    }
		    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
		    this.raws[name] = valueEscaped;
		  }

		  /**
		   * When you want a value to passed through to CSS directly. This method
		   * deletes the corresponding raw value causing the stringifier to fallback
		   * to the unescaped value.
		   * @param {string} name the property to set.
		   * @param {any} value The value that is both escaped and unescaped.
		   */;
		  _proto.setPropertyWithoutEscape = function setPropertyWithoutEscape(name, value) {
		    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
		    if (this.raws) {
		      delete this.raws[name];
		    }
		  }

		  /**
		   *
		   * @param {number} line The number (starting with 1)
		   * @param {number} column The column number (starting with 1)
		   */;
		  _proto.isAtPosition = function isAtPosition(line, column) {
		    if (this.source && this.source.start && this.source.end) {
		      if (this.source.start.line > line) {
		        return false;
		      }
		      if (this.source.end.line < line) {
		        return false;
		      }
		      if (this.source.start.line === line && this.source.start.column > column) {
		        return false;
		      }
		      if (this.source.end.line === line && this.source.end.column < column) {
		        return false;
		      }
		      return true;
		    }
		    return undefined;
		  };
		  _proto.stringifyProperty = function stringifyProperty(name) {
		    return this.raws && this.raws[name] || this[name];
		  };
		  _proto.valueToString = function valueToString() {
		    return String(this.stringifyProperty("value"));
		  };
		  _proto.toString = function toString() {
		    return [this.rawSpaceBefore, this.valueToString(), this.rawSpaceAfter].join('');
		  };
		  _createClass(Node, [{
		    key: "rawSpaceBefore",
		    get: function get() {
		      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.before;
		      if (rawSpace === undefined) {
		        rawSpace = this.spaces && this.spaces.before;
		      }
		      return rawSpace || "";
		    },
		    set: function set(raw) {
		      (0, _util.ensureObject)(this, "raws", "spaces");
		      this.raws.spaces.before = raw;
		    }
		  }, {
		    key: "rawSpaceAfter",
		    get: function get() {
		      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.after;
		      if (rawSpace === undefined) {
		        rawSpace = this.spaces.after;
		      }
		      return rawSpace || "";
		    },
		    set: function set(raw) {
		      (0, _util.ensureObject)(this, "raws", "spaces");
		      this.raws.spaces.after = raw;
		    }
		  }]);
		  return Node;
		}();
		exports$1["default"] = Node;
		module.exports = exports$1.default; 
	} (node$2, node$2.exports));
	return node$2.exports;
}

var types$2 = {};

var hasRequiredTypes$1;

function requireTypes$1 () {
	if (hasRequiredTypes$1) return types$2;
	hasRequiredTypes$1 = 1;

	types$2.__esModule = true;
	types$2.UNIVERSAL = types$2.TAG = types$2.STRING = types$2.SELECTOR = types$2.ROOT = types$2.PSEUDO = types$2.NESTING = types$2.ID = types$2.COMMENT = types$2.COMBINATOR = types$2.CLASS = types$2.ATTRIBUTE = void 0;
	var TAG = 'tag';
	types$2.TAG = TAG;
	var STRING = 'string';
	types$2.STRING = STRING;
	var SELECTOR = 'selector';
	types$2.SELECTOR = SELECTOR;
	var ROOT = 'root';
	types$2.ROOT = ROOT;
	var PSEUDO = 'pseudo';
	types$2.PSEUDO = PSEUDO;
	var NESTING = 'nesting';
	types$2.NESTING = NESTING;
	var ID = 'id';
	types$2.ID = ID;
	var COMMENT = 'comment';
	types$2.COMMENT = COMMENT;
	var COMBINATOR = 'combinator';
	types$2.COMBINATOR = COMBINATOR;
	var CLASS = 'class';
	types$2.CLASS = CLASS;
	var ATTRIBUTE = 'attribute';
	types$2.ATTRIBUTE = ATTRIBUTE;
	var UNIVERSAL = 'universal';
	types$2.UNIVERSAL = UNIVERSAL;
	return types$2;
}

var hasRequiredContainer$1;

function requireContainer$1 () {
	if (hasRequiredContainer$1) return container$1.exports;
	hasRequiredContainer$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var types = _interopRequireWildcard(/*@__PURE__*/ requireTypes$1());
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
		function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
		function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Container = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Container, _Node);
		  function Container(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    if (!_this.nodes) {
		      _this.nodes = [];
		    }
		    return _this;
		  }
		  var _proto = Container.prototype;
		  _proto.append = function append(selector) {
		    selector.parent = this;
		    this.nodes.push(selector);
		    return this;
		  };
		  _proto.prepend = function prepend(selector) {
		    selector.parent = this;
		    this.nodes.unshift(selector);
		    for (var id in this.indexes) {
		      this.indexes[id]++;
		    }
		    return this;
		  };
		  _proto.at = function at(index) {
		    return this.nodes[index];
		  };
		  _proto.index = function index(child) {
		    if (typeof child === 'number') {
		      return child;
		    }
		    return this.nodes.indexOf(child);
		  };
		  _proto.removeChild = function removeChild(child) {
		    child = this.index(child);
		    this.at(child).parent = undefined;
		    this.nodes.splice(child, 1);
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (index >= child) {
		        this.indexes[id] = index - 1;
		      }
		    }
		    return this;
		  };
		  _proto.removeAll = function removeAll() {
		    for (var _iterator = _createForOfIteratorHelperLoose(this.nodes), _step; !(_step = _iterator()).done;) {
		      var node = _step.value;
		      node.parent = undefined;
		    }
		    this.nodes = [];
		    return this;
		  };
		  _proto.empty = function empty() {
		    return this.removeAll();
		  };
		  _proto.insertAfter = function insertAfter(oldNode, newNode) {
		    var _this$nodes;
		    newNode.parent = this;
		    var oldIndex = this.index(oldNode);
		    var resetNode = [];
		    for (var i = 2; i < arguments.length; i++) {
		      resetNode.push(arguments[i]);
		    }
		    (_this$nodes = this.nodes).splice.apply(_this$nodes, [oldIndex + 1, 0, newNode].concat(resetNode));
		    newNode.parent = this;
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (oldIndex < index) {
		        this.indexes[id] = index + arguments.length - 1;
		      }
		    }
		    return this;
		  };
		  _proto.insertBefore = function insertBefore(oldNode, newNode) {
		    var _this$nodes2;
		    newNode.parent = this;
		    var oldIndex = this.index(oldNode);
		    var resetNode = [];
		    for (var i = 2; i < arguments.length; i++) {
		      resetNode.push(arguments[i]);
		    }
		    (_this$nodes2 = this.nodes).splice.apply(_this$nodes2, [oldIndex, 0, newNode].concat(resetNode));
		    newNode.parent = this;
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (index >= oldIndex) {
		        this.indexes[id] = index + arguments.length - 1;
		      }
		    }
		    return this;
		  };
		  _proto._findChildAtPosition = function _findChildAtPosition(line, col) {
		    var found = undefined;
		    this.each(function (node) {
		      if (node.atPosition) {
		        var foundChild = node.atPosition(line, col);
		        if (foundChild) {
		          found = foundChild;
		          return false;
		        }
		      } else if (node.isAtPosition(line, col)) {
		        found = node;
		        return false;
		      }
		    });
		    return found;
		  }

		  /**
		   * Return the most specific node at the line and column number given.
		   * The source location is based on the original parsed location, locations aren't
		   * updated as selector nodes are mutated.
		   *
		   * Note that this location is relative to the location of the first character
		   * of the selector, and not the location of the selector in the overall document
		   * when used in conjunction with postcss.
		   *
		   * If not found, returns undefined.
		   * @param {number} line The line number of the node to find. (1-based index)
		   * @param {number} col  The column number of the node to find. (1-based index)
		   */;
		  _proto.atPosition = function atPosition(line, col) {
		    if (this.isAtPosition(line, col)) {
		      return this._findChildAtPosition(line, col) || this;
		    } else {
		      return undefined;
		    }
		  };
		  _proto._inferEndPosition = function _inferEndPosition() {
		    if (this.last && this.last.source && this.last.source.end) {
		      this.source = this.source || {};
		      this.source.end = this.source.end || {};
		      Object.assign(this.source.end, this.last.source.end);
		    }
		  };
		  _proto.each = function each(callback) {
		    if (!this.lastEach) {
		      this.lastEach = 0;
		    }
		    if (!this.indexes) {
		      this.indexes = {};
		    }
		    this.lastEach++;
		    var id = this.lastEach;
		    this.indexes[id] = 0;
		    if (!this.length) {
		      return undefined;
		    }
		    var index, result;
		    while (this.indexes[id] < this.length) {
		      index = this.indexes[id];
		      result = callback(this.at(index), index);
		      if (result === false) {
		        break;
		      }
		      this.indexes[id] += 1;
		    }
		    delete this.indexes[id];
		    if (result === false) {
		      return false;
		    }
		  };
		  _proto.walk = function walk(callback) {
		    return this.each(function (node, i) {
		      var result = callback(node, i);
		      if (result !== false && node.length) {
		        result = node.walk(callback);
		      }
		      if (result === false) {
		        return false;
		      }
		    });
		  };
		  _proto.walkAttributes = function walkAttributes(callback) {
		    var _this2 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.ATTRIBUTE) {
		        return callback.call(_this2, selector);
		      }
		    });
		  };
		  _proto.walkClasses = function walkClasses(callback) {
		    var _this3 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.CLASS) {
		        return callback.call(_this3, selector);
		      }
		    });
		  };
		  _proto.walkCombinators = function walkCombinators(callback) {
		    var _this4 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.COMBINATOR) {
		        return callback.call(_this4, selector);
		      }
		    });
		  };
		  _proto.walkComments = function walkComments(callback) {
		    var _this5 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.COMMENT) {
		        return callback.call(_this5, selector);
		      }
		    });
		  };
		  _proto.walkIds = function walkIds(callback) {
		    var _this6 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.ID) {
		        return callback.call(_this6, selector);
		      }
		    });
		  };
		  _proto.walkNesting = function walkNesting(callback) {
		    var _this7 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.NESTING) {
		        return callback.call(_this7, selector);
		      }
		    });
		  };
		  _proto.walkPseudos = function walkPseudos(callback) {
		    var _this8 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.PSEUDO) {
		        return callback.call(_this8, selector);
		      }
		    });
		  };
		  _proto.walkTags = function walkTags(callback) {
		    var _this9 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.TAG) {
		        return callback.call(_this9, selector);
		      }
		    });
		  };
		  _proto.walkUniversals = function walkUniversals(callback) {
		    var _this10 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.UNIVERSAL) {
		        return callback.call(_this10, selector);
		      }
		    });
		  };
		  _proto.split = function split(callback) {
		    var _this11 = this;
		    var current = [];
		    return this.reduce(function (memo, node, index) {
		      var split = callback.call(_this11, node);
		      current.push(node);
		      if (split) {
		        memo.push(current);
		        current = [];
		      } else if (index === _this11.length - 1) {
		        memo.push(current);
		      }
		      return memo;
		    }, []);
		  };
		  _proto.map = function map(callback) {
		    return this.nodes.map(callback);
		  };
		  _proto.reduce = function reduce(callback, memo) {
		    return this.nodes.reduce(callback, memo);
		  };
		  _proto.every = function every(callback) {
		    return this.nodes.every(callback);
		  };
		  _proto.some = function some(callback) {
		    return this.nodes.some(callback);
		  };
		  _proto.filter = function filter(callback) {
		    return this.nodes.filter(callback);
		  };
		  _proto.sort = function sort(callback) {
		    return this.nodes.sort(callback);
		  };
		  _proto.toString = function toString() {
		    return this.map(String).join('');
		  };
		  _createClass(Container, [{
		    key: "first",
		    get: function get() {
		      return this.at(0);
		    }
		  }, {
		    key: "last",
		    get: function get() {
		      return this.at(this.length - 1);
		    }
		  }, {
		    key: "length",
		    get: function get() {
		      return this.nodes.length;
		    }
		  }]);
		  return Container;
		}(_node["default"]);
		exports$1["default"] = Container;
		module.exports = exports$1.default; 
	} (container$1, container$1.exports));
	return container$1.exports;
}

var hasRequiredRoot$1;

function requireRoot$1 () {
	if (hasRequiredRoot$1) return root$1.exports;
	hasRequiredRoot$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Root = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Root, _Container);
		  function Root(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.ROOT;
		    return _this;
		  }
		  var _proto = Root.prototype;
		  _proto.toString = function toString() {
		    var str = this.reduce(function (memo, selector) {
		      memo.push(String(selector));
		      return memo;
		    }, []).join(',');
		    return this.trailingComma ? str + ',' : str;
		  };
		  _proto.error = function error(message, options) {
		    if (this._error) {
		      return this._error(message, options);
		    } else {
		      return new Error(message);
		    }
		  };
		  _createClass(Root, [{
		    key: "errorGenerator",
		    set: function set(handler) {
		      this._error = handler;
		    }
		  }]);
		  return Root;
		}(_container["default"]);
		exports$1["default"] = Root;
		module.exports = exports$1.default; 
	} (root$1, root$1.exports));
	return root$1.exports;
}

var selector$1 = {exports: {}};

var hasRequiredSelector$1;

function requireSelector$1 () {
	if (hasRequiredSelector$1) return selector$1.exports;
	hasRequiredSelector$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Selector = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Selector, _Container);
		  function Selector(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.SELECTOR;
		    return _this;
		  }
		  return Selector;
		}(_container["default"]);
		exports$1["default"] = Selector;
		module.exports = exports$1.default; 
	} (selector$1, selector$1.exports));
	return selector$1.exports;
}

var className$1 = {exports: {}};

/*! https://mths.be/cssesc v3.0.0 by @mathias */

var cssesc_1;
var hasRequiredCssesc;

function requireCssesc () {
	if (hasRequiredCssesc) return cssesc_1;
	hasRequiredCssesc = 1;

	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
	var merge = function merge(options, defaults) {
		if (!options) {
			return defaults;
		}
		var result = {};
		for (var key in defaults) {
			// `if (defaults.hasOwnProperty(key) { … }` is not needed here, since
			// only recognized option names are used.
			result[key] = hasOwnProperty.call(options, key) ? options[key] : defaults[key];
		}
		return result;
	};

	var regexAnySingleEscape = /[ -,\.\/:-@\[-\^`\{-~]/;
	var regexSingleEscape = /[ -,\.\/:-@\[\]\^`\{-~]/;
	var regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g;

	// https://mathiasbynens.be/notes/css-escapes#css
	var cssesc = function cssesc(string, options) {
		options = merge(options, cssesc.options);
		if (options.quotes != 'single' && options.quotes != 'double') {
			options.quotes = 'single';
		}
		var quote = options.quotes == 'double' ? '"' : '\'';
		var isIdentifier = options.isIdentifier;

		var firstChar = string.charAt(0);
		var output = '';
		var counter = 0;
		var length = string.length;
		while (counter < length) {
			var character = string.charAt(counter++);
			var codePoint = character.charCodeAt();
			var value = void 0;
			// If it’s not a printable ASCII character…
			if (codePoint < 0x20 || codePoint > 0x7E) {
				if (codePoint >= 0xD800 && codePoint <= 0xDBFF && counter < length) {
					// It’s a high surrogate, and there is a next character.
					var extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) {
						// next character is low surrogate
						codePoint = ((codePoint & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
					} else {
						// It’s an unmatched surrogate; only append this code unit, in case
						// the next code unit is the high surrogate of a surrogate pair.
						counter--;
					}
				}
				value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
			} else {
				if (options.escapeEverything) {
					if (regexAnySingleEscape.test(character)) {
						value = '\\' + character;
					} else {
						value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
					}
				} else if (/[\t\n\f\r\x0B]/.test(character)) {
					value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
				} else if (character == '\\' || !isIdentifier && (character == '"' && quote == character || character == '\'' && quote == character) || isIdentifier && regexSingleEscape.test(character)) {
					value = '\\' + character;
				} else {
					value = character;
				}
			}
			output += value;
		}

		if (isIdentifier) {
			if (/^-[-\d]/.test(output)) {
				output = '\\-' + output.slice(1);
			} else if (/\d/.test(firstChar)) {
				output = '\\3' + firstChar + ' ' + output.slice(1);
			}
		}

		// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
		// since they’re redundant. Note that this is only possible if the escape
		// sequence isn’t preceded by an odd number of backslashes.
		output = output.replace(regexExcessiveSpaces, function ($0, $1, $2) {
			if ($1 && $1.length % 2) {
				// It’s not safe to remove the space, so don’t.
				return $0;
			}
			// Strip the space.
			return ($1 || '') + $2;
		});

		if (!isIdentifier && options.wrap) {
			return quote + output + quote;
		}
		return output;
	};

	// Expose default options (so they can be overridden globally).
	cssesc.options = {
		'escapeEverything': false,
		'isIdentifier': false,
		'quotes': 'single',
		'wrap': false
	};

	cssesc.version = '3.0.0';

	cssesc_1 = cssesc;
	return cssesc_1;
}

var hasRequiredClassName$1;

function requireClassName$1 () {
	if (hasRequiredClassName$1) return className$1.exports;
	hasRequiredClassName$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _util = /*@__PURE__*/ requireUtil$2();
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var ClassName = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(ClassName, _Node);
		  function ClassName(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.CLASS;
		    _this._constructed = true;
		    return _this;
		  }
		  var _proto = ClassName.prototype;
		  _proto.valueToString = function valueToString() {
		    return '.' + _Node.prototype.valueToString.call(this);
		  };
		  _createClass(ClassName, [{
		    key: "value",
		    get: function get() {
		      return this._value;
		    },
		    set: function set(v) {
		      if (this._constructed) {
		        var escaped = (0, _cssesc["default"])(v, {
		          isIdentifier: true
		        });
		        if (escaped !== v) {
		          (0, _util.ensureObject)(this, "raws");
		          this.raws.value = escaped;
		        } else if (this.raws) {
		          delete this.raws.value;
		        }
		      }
		      this._value = v;
		    }
		  }]);
		  return ClassName;
		}(_node["default"]);
		exports$1["default"] = ClassName;
		module.exports = exports$1.default; 
	} (className$1, className$1.exports));
	return className$1.exports;
}

var comment$1 = {exports: {}};

var hasRequiredComment$1;

function requireComment$1 () {
	if (hasRequiredComment$1) return comment$1.exports;
	hasRequiredComment$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Comment = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Comment, _Node);
		  function Comment(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.COMMENT;
		    return _this;
		  }
		  return Comment;
		}(_node["default"]);
		exports$1["default"] = Comment;
		module.exports = exports$1.default; 
	} (comment$1, comment$1.exports));
	return comment$1.exports;
}

var id$1 = {exports: {}};

var hasRequiredId$1;

function requireId$1 () {
	if (hasRequiredId$1) return id$1.exports;
	hasRequiredId$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var ID = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(ID, _Node);
		  function ID(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.ID;
		    return _this;
		  }
		  var _proto = ID.prototype;
		  _proto.valueToString = function valueToString() {
		    return '#' + _Node.prototype.valueToString.call(this);
		  };
		  return ID;
		}(_node["default"]);
		exports$1["default"] = ID;
		module.exports = exports$1.default; 
	} (id$1, id$1.exports));
	return id$1.exports;
}

var tag$1 = {exports: {}};

var namespace$1 = {exports: {}};

var hasRequiredNamespace$1;

function requireNamespace$1 () {
	if (hasRequiredNamespace$1) return namespace$1.exports;
	hasRequiredNamespace$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _util = /*@__PURE__*/ requireUtil$2();
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Namespace = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Namespace, _Node);
		  function Namespace() {
		    return _Node.apply(this, arguments) || this;
		  }
		  var _proto = Namespace.prototype;
		  _proto.qualifiedName = function qualifiedName(value) {
		    if (this.namespace) {
		      return this.namespaceString + "|" + value;
		    } else {
		      return value;
		    }
		  };
		  _proto.valueToString = function valueToString() {
		    return this.qualifiedName(_Node.prototype.valueToString.call(this));
		  };
		  _createClass(Namespace, [{
		    key: "namespace",
		    get: function get() {
		      return this._namespace;
		    },
		    set: function set(namespace) {
		      if (namespace === true || namespace === "*" || namespace === "&") {
		        this._namespace = namespace;
		        if (this.raws) {
		          delete this.raws.namespace;
		        }
		        return;
		      }
		      var escaped = (0, _cssesc["default"])(namespace, {
		        isIdentifier: true
		      });
		      this._namespace = namespace;
		      if (escaped !== namespace) {
		        (0, _util.ensureObject)(this, "raws");
		        this.raws.namespace = escaped;
		      } else if (this.raws) {
		        delete this.raws.namespace;
		      }
		    }
		  }, {
		    key: "ns",
		    get: function get() {
		      return this._namespace;
		    },
		    set: function set(namespace) {
		      this.namespace = namespace;
		    }
		  }, {
		    key: "namespaceString",
		    get: function get() {
		      if (this.namespace) {
		        var ns = this.stringifyProperty("namespace");
		        if (ns === true) {
		          return '';
		        } else {
		          return ns;
		        }
		      } else {
		        return '';
		      }
		    }
		  }]);
		  return Namespace;
		}(_node["default"]);
		exports$1["default"] = Namespace;
		module.exports = exports$1.default; 
	} (namespace$1, namespace$1.exports));
	return namespace$1.exports;
}

var hasRequiredTag$1;

function requireTag$1 () {
	if (hasRequiredTag$1) return tag$1.exports;
	hasRequiredTag$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Tag = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Tag, _Namespace);
		  function Tag(opts) {
		    var _this;
		    _this = _Namespace.call(this, opts) || this;
		    _this.type = _types.TAG;
		    return _this;
		  }
		  return Tag;
		}(_namespace["default"]);
		exports$1["default"] = Tag;
		module.exports = exports$1.default; 
	} (tag$1, tag$1.exports));
	return tag$1.exports;
}

var string$1 = {exports: {}};

var hasRequiredString$1;

function requireString$1 () {
	if (hasRequiredString$1) return string$1.exports;
	hasRequiredString$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var String = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(String, _Node);
		  function String(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.STRING;
		    return _this;
		  }
		  return String;
		}(_node["default"]);
		exports$1["default"] = String;
		module.exports = exports$1.default; 
	} (string$1, string$1.exports));
	return string$1.exports;
}

var pseudo$1 = {exports: {}};

var hasRequiredPseudo$1;

function requirePseudo$1 () {
	if (hasRequiredPseudo$1) return pseudo$1.exports;
	hasRequiredPseudo$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Pseudo = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Pseudo, _Container);
		  function Pseudo(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.PSEUDO;
		    return _this;
		  }
		  var _proto = Pseudo.prototype;
		  _proto.toString = function toString() {
		    var params = this.length ? '(' + this.map(String).join(',') + ')' : '';
		    return [this.rawSpaceBefore, this.stringifyProperty("value"), params, this.rawSpaceAfter].join('');
		  };
		  return Pseudo;
		}(_container["default"]);
		exports$1["default"] = Pseudo;
		module.exports = exports$1.default; 
	} (pseudo$1, pseudo$1.exports));
	return pseudo$1.exports;
}

var attribute$1 = {};

var node$1;
var hasRequiredNode$1;

function requireNode$1 () {
	if (hasRequiredNode$1) return node$1;
	hasRequiredNode$1 = 1;
	/**
	 * For Node.js, simply re-export the core `util.deprecate` function.
	 */

	node$1 = require$$2.deprecate;
	return node$1;
}

var hasRequiredAttribute$1;

function requireAttribute$1 () {
	if (hasRequiredAttribute$1) return attribute$1;
	hasRequiredAttribute$1 = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		exports$1.unescapeValue = unescapeValue;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _unesc = _interopRequireDefault(/*@__PURE__*/ requireUnesc$1());
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		var _CSSESC_QUOTE_OPTIONS;
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var deprecate = /*@__PURE__*/ requireNode$1();
		var WRAPPED_IN_QUOTES = /^('|")([^]*)\1$/;
		var warnOfDeprecatedValueAssignment = deprecate(function () {}, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. " + "Call attribute.setValue() instead.");
		var warnOfDeprecatedQuotedAssignment = deprecate(function () {}, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead.");
		var warnOfDeprecatedConstructor = deprecate(function () {}, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");
		function unescapeValue(value) {
		  var deprecatedUsage = false;
		  var quoteMark = null;
		  var unescaped = value;
		  var m = unescaped.match(WRAPPED_IN_QUOTES);
		  if (m) {
		    quoteMark = m[1];
		    unescaped = m[2];
		  }
		  unescaped = (0, _unesc["default"])(unescaped);
		  if (unescaped !== value) {
		    deprecatedUsage = true;
		  }
		  return {
		    deprecatedUsage: deprecatedUsage,
		    unescaped: unescaped,
		    quoteMark: quoteMark
		  };
		}
		function handleDeprecatedContructorOpts(opts) {
		  if (opts.quoteMark !== undefined) {
		    return opts;
		  }
		  if (opts.value === undefined) {
		    return opts;
		  }
		  warnOfDeprecatedConstructor();
		  var _unescapeValue = unescapeValue(opts.value),
		    quoteMark = _unescapeValue.quoteMark,
		    unescaped = _unescapeValue.unescaped;
		  if (!opts.raws) {
		    opts.raws = {};
		  }
		  if (opts.raws.value === undefined) {
		    opts.raws.value = opts.value;
		  }
		  opts.value = unescaped;
		  opts.quoteMark = quoteMark;
		  return opts;
		}
		var Attribute = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Attribute, _Namespace);
		  function Attribute(opts) {
		    var _this;
		    if (opts === void 0) {
		      opts = {};
		    }
		    _this = _Namespace.call(this, handleDeprecatedContructorOpts(opts)) || this;
		    _this.type = _types.ATTRIBUTE;
		    _this.raws = _this.raws || {};
		    Object.defineProperty(_this.raws, 'unquoted', {
		      get: deprecate(function () {
		        return _this.value;
		      }, "attr.raws.unquoted is deprecated. Call attr.value instead."),
		      set: deprecate(function () {
		        return _this.value;
		      }, "Setting attr.raws.unquoted is deprecated and has no effect. attr.value is unescaped by default now.")
		    });
		    _this._constructed = true;
		    return _this;
		  }

		  /**
		   * Returns the Attribute's value quoted such that it would be legal to use
		   * in the value of a css file. The original value's quotation setting
		   * used for stringification is left unchanged. See `setValue(value, options)`
		   * if you want to control the quote settings of a new value for the attribute.
		   *
		   * You can also change the quotation used for the current value by setting quoteMark.
		   *
		   * Options:
		   *   * quoteMark {'"' | "'" | null} - Use this value to quote the value. If this
		   *     option is not set, the original value for quoteMark will be used. If
		   *     indeterminate, a double quote is used. The legal values are:
		   *     * `null` - the value will be unquoted and characters will be escaped as necessary.
		   *     * `'` - the value will be quoted with a single quote and single quotes are escaped.
		   *     * `"` - the value will be quoted with a double quote and double quotes are escaped.
		   *   * preferCurrentQuoteMark {boolean} - if true, prefer the source quote mark
		   *     over the quoteMark option value.
		   *   * smart {boolean} - if true, will select a quote mark based on the value
		   *     and the other options specified here. See the `smartQuoteMark()`
		   *     method.
		   **/
		  var _proto = Attribute.prototype;
		  _proto.getQuotedValue = function getQuotedValue(options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var quoteMark = this._determineQuoteMark(options);
		    var cssescopts = CSSESC_QUOTE_OPTIONS[quoteMark];
		    var escaped = (0, _cssesc["default"])(this._value, cssescopts);
		    return escaped;
		  };
		  _proto._determineQuoteMark = function _determineQuoteMark(options) {
		    return options.smart ? this.smartQuoteMark(options) : this.preferredQuoteMark(options);
		  }

		  /**
		   * Set the unescaped value with the specified quotation options. The value
		   * provided must not include any wrapping quote marks -- those quotes will
		   * be interpreted as part of the value and escaped accordingly.
		   */;
		  _proto.setValue = function setValue(value, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    this._value = value;
		    this._quoteMark = this._determineQuoteMark(options);
		    this._syncRawValue();
		  }

		  /**
		   * Intelligently select a quoteMark value based on the value's contents. If
		   * the value is a legal CSS ident, it will not be quoted. Otherwise a quote
		   * mark will be picked that minimizes the number of escapes.
		   *
		   * If there's no clear winner, the quote mark from these options is used,
		   * then the source quote mark (this is inverted if `preferCurrentQuoteMark` is
		   * true). If the quoteMark is unspecified, a double quote is used.
		   *
		   * @param options This takes the quoteMark and preferCurrentQuoteMark options
		   * from the quoteValue method.
		   */;
		  _proto.smartQuoteMark = function smartQuoteMark(options) {
		    var v = this.value;
		    var numSingleQuotes = v.replace(/[^']/g, '').length;
		    var numDoubleQuotes = v.replace(/[^"]/g, '').length;
		    if (numSingleQuotes + numDoubleQuotes === 0) {
		      var escaped = (0, _cssesc["default"])(v, {
		        isIdentifier: true
		      });
		      if (escaped === v) {
		        return Attribute.NO_QUOTE;
		      } else {
		        var pref = this.preferredQuoteMark(options);
		        if (pref === Attribute.NO_QUOTE) {
		          // pick a quote mark that isn't none and see if it's smaller
		          var quote = this.quoteMark || options.quoteMark || Attribute.DOUBLE_QUOTE;
		          var opts = CSSESC_QUOTE_OPTIONS[quote];
		          var quoteValue = (0, _cssesc["default"])(v, opts);
		          if (quoteValue.length < escaped.length) {
		            return quote;
		          }
		        }
		        return pref;
		      }
		    } else if (numDoubleQuotes === numSingleQuotes) {
		      return this.preferredQuoteMark(options);
		    } else if (numDoubleQuotes < numSingleQuotes) {
		      return Attribute.DOUBLE_QUOTE;
		    } else {
		      return Attribute.SINGLE_QUOTE;
		    }
		  }

		  /**
		   * Selects the preferred quote mark based on the options and the current quote mark value.
		   * If you want the quote mark to depend on the attribute value, call `smartQuoteMark(opts)`
		   * instead.
		   */;
		  _proto.preferredQuoteMark = function preferredQuoteMark(options) {
		    var quoteMark = options.preferCurrentQuoteMark ? this.quoteMark : options.quoteMark;
		    if (quoteMark === undefined) {
		      quoteMark = options.preferCurrentQuoteMark ? options.quoteMark : this.quoteMark;
		    }
		    if (quoteMark === undefined) {
		      quoteMark = Attribute.DOUBLE_QUOTE;
		    }
		    return quoteMark;
		  };
		  _proto._syncRawValue = function _syncRawValue() {
		    var rawValue = (0, _cssesc["default"])(this._value, CSSESC_QUOTE_OPTIONS[this.quoteMark]);
		    if (rawValue === this._value) {
		      if (this.raws) {
		        delete this.raws.value;
		      }
		    } else {
		      this.raws.value = rawValue;
		    }
		  };
		  _proto._handleEscapes = function _handleEscapes(prop, value) {
		    if (this._constructed) {
		      var escaped = (0, _cssesc["default"])(value, {
		        isIdentifier: true
		      });
		      if (escaped !== value) {
		        this.raws[prop] = escaped;
		      } else {
		        delete this.raws[prop];
		      }
		    }
		  };
		  _proto._spacesFor = function _spacesFor(name) {
		    var attrSpaces = {
		      before: '',
		      after: ''
		    };
		    var spaces = this.spaces[name] || {};
		    var rawSpaces = this.raws.spaces && this.raws.spaces[name] || {};
		    return Object.assign(attrSpaces, spaces, rawSpaces);
		  };
		  _proto._stringFor = function _stringFor(name, spaceName, concat) {
		    if (spaceName === void 0) {
		      spaceName = name;
		    }
		    if (concat === void 0) {
		      concat = defaultAttrConcat;
		    }
		    var attrSpaces = this._spacesFor(spaceName);
		    return concat(this.stringifyProperty(name), attrSpaces);
		  }

		  /**
		   * returns the offset of the attribute part specified relative to the
		   * start of the node of the output string.
		   *
		   * * "ns" - alias for "namespace"
		   * * "namespace" - the namespace if it exists.
		   * * "attribute" - the attribute name
		   * * "attributeNS" - the start of the attribute or its namespace
		   * * "operator" - the match operator of the attribute
		   * * "value" - The value (string or identifier)
		   * * "insensitive" - the case insensitivity flag;
		   * @param part One of the possible values inside an attribute.
		   * @returns -1 if the name is invalid or the value doesn't exist in this attribute.
		   */;
		  _proto.offsetOf = function offsetOf(name) {
		    var count = 1;
		    var attributeSpaces = this._spacesFor("attribute");
		    count += attributeSpaces.before.length;
		    if (name === "namespace" || name === "ns") {
		      return this.namespace ? count : -1;
		    }
		    if (name === "attributeNS") {
		      return count;
		    }
		    count += this.namespaceString.length;
		    if (this.namespace) {
		      count += 1;
		    }
		    if (name === "attribute") {
		      return count;
		    }
		    count += this.stringifyProperty("attribute").length;
		    count += attributeSpaces.after.length;
		    var operatorSpaces = this._spacesFor("operator");
		    count += operatorSpaces.before.length;
		    var operator = this.stringifyProperty("operator");
		    if (name === "operator") {
		      return operator ? count : -1;
		    }
		    count += operator.length;
		    count += operatorSpaces.after.length;
		    var valueSpaces = this._spacesFor("value");
		    count += valueSpaces.before.length;
		    var value = this.stringifyProperty("value");
		    if (name === "value") {
		      return value ? count : -1;
		    }
		    count += value.length;
		    count += valueSpaces.after.length;
		    var insensitiveSpaces = this._spacesFor("insensitive");
		    count += insensitiveSpaces.before.length;
		    if (name === "insensitive") {
		      return this.insensitive ? count : -1;
		    }
		    return -1;
		  };
		  _proto.toString = function toString() {
		    var _this2 = this;
		    var selector = [this.rawSpaceBefore, '['];
		    selector.push(this._stringFor('qualifiedAttribute', 'attribute'));
		    if (this.operator && (this.value || this.value === '')) {
		      selector.push(this._stringFor('operator'));
		      selector.push(this._stringFor('value'));
		      selector.push(this._stringFor('insensitiveFlag', 'insensitive', function (attrValue, attrSpaces) {
		        if (attrValue.length > 0 && !_this2.quoted && attrSpaces.before.length === 0 && !(_this2.spaces.value && _this2.spaces.value.after)) {
		          attrSpaces.before = " ";
		        }
		        return defaultAttrConcat(attrValue, attrSpaces);
		      }));
		    }
		    selector.push(']');
		    selector.push(this.rawSpaceAfter);
		    return selector.join('');
		  };
		  _createClass(Attribute, [{
		    key: "quoted",
		    get: function get() {
		      var qm = this.quoteMark;
		      return qm === "'" || qm === '"';
		    },
		    set: function set(value) {
		      warnOfDeprecatedQuotedAssignment();
		    }

		    /**
		     * returns a single (`'`) or double (`"`) quote character if the value is quoted.
		     * returns `null` if the value is not quoted.
		     * returns `undefined` if the quotation state is unknown (this can happen when
		     * the attribute is constructed without specifying a quote mark.)
		     */
		  }, {
		    key: "quoteMark",
		    get: function get() {
		      return this._quoteMark;
		    }

		    /**
		     * Set the quote mark to be used by this attribute's value.
		     * If the quote mark changes, the raw (escaped) value at `attr.raws.value` of the attribute
		     * value is updated accordingly.
		     *
		     * @param {"'" | '"' | null} quoteMark The quote mark or `null` if the value should be unquoted.
		     */,
		    set: function set(quoteMark) {
		      if (!this._constructed) {
		        this._quoteMark = quoteMark;
		        return;
		      }
		      if (this._quoteMark !== quoteMark) {
		        this._quoteMark = quoteMark;
		        this._syncRawValue();
		      }
		    }
		  }, {
		    key: "qualifiedAttribute",
		    get: function get() {
		      return this.qualifiedName(this.raws.attribute || this.attribute);
		    }
		  }, {
		    key: "insensitiveFlag",
		    get: function get() {
		      return this.insensitive ? 'i' : '';
		    }
		  }, {
		    key: "value",
		    get: function get() {
		      return this._value;
		    },
		    set:
		    /**
		     * Before 3.0, the value had to be set to an escaped value including any wrapped
		     * quote marks. In 3.0, the semantics of `Attribute.value` changed so that the value
		     * is unescaped during parsing and any quote marks are removed.
		     *
		     * Because the ambiguity of this semantic change, if you set `attr.value = newValue`,
		     * a deprecation warning is raised when the new value contains any characters that would
		     * require escaping (including if it contains wrapped quotes).
		     *
		     * Instead, you should call `attr.setValue(newValue, opts)` and pass options that describe
		     * how the new value is quoted.
		     */
		    function set(v) {
		      if (this._constructed) {
		        var _unescapeValue2 = unescapeValue(v),
		          deprecatedUsage = _unescapeValue2.deprecatedUsage,
		          unescaped = _unescapeValue2.unescaped,
		          quoteMark = _unescapeValue2.quoteMark;
		        if (deprecatedUsage) {
		          warnOfDeprecatedValueAssignment();
		        }
		        if (unescaped === this._value && quoteMark === this._quoteMark) {
		          return;
		        }
		        this._value = unescaped;
		        this._quoteMark = quoteMark;
		        this._syncRawValue();
		      } else {
		        this._value = v;
		      }
		    }
		  }, {
		    key: "insensitive",
		    get: function get() {
		      return this._insensitive;
		    }

		    /**
		     * Set the case insensitive flag.
		     * If the case insensitive flag changes, the raw (escaped) value at `attr.raws.insensitiveFlag`
		     * of the attribute is updated accordingly.
		     *
		     * @param {true | false} insensitive true if the attribute should match case-insensitively.
		     */,
		    set: function set(insensitive) {
		      if (!insensitive) {
		        this._insensitive = false;

		        // "i" and "I" can be used in "this.raws.insensitiveFlag" to store the original notation.
		        // When setting `attr.insensitive = false` both should be erased to ensure correct serialization.
		        if (this.raws && (this.raws.insensitiveFlag === 'I' || this.raws.insensitiveFlag === 'i')) {
		          this.raws.insensitiveFlag = undefined;
		        }
		      }
		      this._insensitive = insensitive;
		    }
		  }, {
		    key: "attribute",
		    get: function get() {
		      return this._attribute;
		    },
		    set: function set(name) {
		      this._handleEscapes("attribute", name);
		      this._attribute = name;
		    }
		  }]);
		  return Attribute;
		}(_namespace["default"]);
		exports$1["default"] = Attribute;
		Attribute.NO_QUOTE = null;
		Attribute.SINGLE_QUOTE = "'";
		Attribute.DOUBLE_QUOTE = '"';
		var CSSESC_QUOTE_OPTIONS = (_CSSESC_QUOTE_OPTIONS = {
		  "'": {
		    quotes: 'single',
		    wrap: true
		  },
		  '"': {
		    quotes: 'double',
		    wrap: true
		  }
		}, _CSSESC_QUOTE_OPTIONS[null] = {
		  isIdentifier: true
		}, _CSSESC_QUOTE_OPTIONS);
		function defaultAttrConcat(attrValue, attrSpaces) {
		  return "" + attrSpaces.before + attrValue + attrSpaces.after;
		} 
	} (attribute$1));
	return attribute$1;
}

var universal$1 = {exports: {}};

var hasRequiredUniversal$1;

function requireUniversal$1 () {
	if (hasRequiredUniversal$1) return universal$1.exports;
	hasRequiredUniversal$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace$1());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Universal = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Universal, _Namespace);
		  function Universal(opts) {
		    var _this;
		    _this = _Namespace.call(this, opts) || this;
		    _this.type = _types.UNIVERSAL;
		    _this.value = '*';
		    return _this;
		  }
		  return Universal;
		}(_namespace["default"]);
		exports$1["default"] = Universal;
		module.exports = exports$1.default; 
	} (universal$1, universal$1.exports));
	return universal$1.exports;
}

var combinator$1 = {exports: {}};

var hasRequiredCombinator$1;

function requireCombinator$1 () {
	if (hasRequiredCombinator$1) return combinator$1.exports;
	hasRequiredCombinator$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Combinator = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Combinator, _Node);
		  function Combinator(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.COMBINATOR;
		    return _this;
		  }
		  return Combinator;
		}(_node["default"]);
		exports$1["default"] = Combinator;
		module.exports = exports$1.default; 
	} (combinator$1, combinator$1.exports));
	return combinator$1.exports;
}

var nesting$1 = {exports: {}};

var hasRequiredNesting$1;

function requireNesting$1 () {
	if (hasRequiredNesting$1) return nesting$1.exports;
	hasRequiredNesting$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode$2());
		var _types = /*@__PURE__*/ requireTypes$1();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Nesting = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Nesting, _Node);
		  function Nesting(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.NESTING;
		    _this.value = '&';
		    return _this;
		  }
		  return Nesting;
		}(_node["default"]);
		exports$1["default"] = Nesting;
		module.exports = exports$1.default; 
	} (nesting$1, nesting$1.exports));
	return nesting$1.exports;
}

var sortAscending$1 = {exports: {}};

var hasRequiredSortAscending$1;

function requireSortAscending$1 () {
	if (hasRequiredSortAscending$1) return sortAscending$1.exports;
	hasRequiredSortAscending$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = sortAscending;
		function sortAscending(list) {
		  return list.sort(function (a, b) {
		    return a - b;
		  });
		}
		module.exports = exports$1.default; 
	} (sortAscending$1, sortAscending$1.exports));
	return sortAscending$1.exports;
}

var tokenize$1 = {};

var tokenTypes$1 = {};

var hasRequiredTokenTypes$1;

function requireTokenTypes$1 () {
	if (hasRequiredTokenTypes$1) return tokenTypes$1;
	hasRequiredTokenTypes$1 = 1;

	tokenTypes$1.__esModule = true;
	tokenTypes$1.word = tokenTypes$1.tilde = tokenTypes$1.tab = tokenTypes$1.str = tokenTypes$1.space = tokenTypes$1.slash = tokenTypes$1.singleQuote = tokenTypes$1.semicolon = tokenTypes$1.plus = tokenTypes$1.pipe = tokenTypes$1.openSquare = tokenTypes$1.openParenthesis = tokenTypes$1.newline = tokenTypes$1.greaterThan = tokenTypes$1.feed = tokenTypes$1.equals = tokenTypes$1.doubleQuote = tokenTypes$1.dollar = tokenTypes$1.cr = tokenTypes$1.comment = tokenTypes$1.comma = tokenTypes$1.combinator = tokenTypes$1.colon = tokenTypes$1.closeSquare = tokenTypes$1.closeParenthesis = tokenTypes$1.caret = tokenTypes$1.bang = tokenTypes$1.backslash = tokenTypes$1.at = tokenTypes$1.asterisk = tokenTypes$1.ampersand = void 0;
	var ampersand = 38; // `&`.charCodeAt(0);
	tokenTypes$1.ampersand = ampersand;
	var asterisk = 42; // `*`.charCodeAt(0);
	tokenTypes$1.asterisk = asterisk;
	var at = 64; // `@`.charCodeAt(0);
	tokenTypes$1.at = at;
	var comma = 44; // `,`.charCodeAt(0);
	tokenTypes$1.comma = comma;
	var colon = 58; // `:`.charCodeAt(0);
	tokenTypes$1.colon = colon;
	var semicolon = 59; // `;`.charCodeAt(0);
	tokenTypes$1.semicolon = semicolon;
	var openParenthesis = 40; // `(`.charCodeAt(0);
	tokenTypes$1.openParenthesis = openParenthesis;
	var closeParenthesis = 41; // `)`.charCodeAt(0);
	tokenTypes$1.closeParenthesis = closeParenthesis;
	var openSquare = 91; // `[`.charCodeAt(0);
	tokenTypes$1.openSquare = openSquare;
	var closeSquare = 93; // `]`.charCodeAt(0);
	tokenTypes$1.closeSquare = closeSquare;
	var dollar = 36; // `$`.charCodeAt(0);
	tokenTypes$1.dollar = dollar;
	var tilde = 126; // `~`.charCodeAt(0);
	tokenTypes$1.tilde = tilde;
	var caret = 94; // `^`.charCodeAt(0);
	tokenTypes$1.caret = caret;
	var plus = 43; // `+`.charCodeAt(0);
	tokenTypes$1.plus = plus;
	var equals = 61; // `=`.charCodeAt(0);
	tokenTypes$1.equals = equals;
	var pipe = 124; // `|`.charCodeAt(0);
	tokenTypes$1.pipe = pipe;
	var greaterThan = 62; // `>`.charCodeAt(0);
	tokenTypes$1.greaterThan = greaterThan;
	var space = 32; // ` `.charCodeAt(0);
	tokenTypes$1.space = space;
	var singleQuote = 39; // `'`.charCodeAt(0);
	tokenTypes$1.singleQuote = singleQuote;
	var doubleQuote = 34; // `"`.charCodeAt(0);
	tokenTypes$1.doubleQuote = doubleQuote;
	var slash = 47; // `/`.charCodeAt(0);
	tokenTypes$1.slash = slash;
	var bang = 33; // `!`.charCodeAt(0);
	tokenTypes$1.bang = bang;
	var backslash = 92; // '\\'.charCodeAt(0);
	tokenTypes$1.backslash = backslash;
	var cr = 13; // '\r'.charCodeAt(0);
	tokenTypes$1.cr = cr;
	var feed = 12; // '\f'.charCodeAt(0);
	tokenTypes$1.feed = feed;
	var newline = 10; // '\n'.charCodeAt(0);
	tokenTypes$1.newline = newline;
	var tab = 9; // '\t'.charCodeAt(0);

	// Expose aliases primarily for readability.
	tokenTypes$1.tab = tab;
	var str = singleQuote;

	// No good single character representation!
	tokenTypes$1.str = str;
	var comment = -1;
	tokenTypes$1.comment = comment;
	var word = -2;
	tokenTypes$1.word = word;
	var combinator = -3;
	tokenTypes$1.combinator = combinator;
	return tokenTypes$1;
}

var hasRequiredTokenize$1;

function requireTokenize$1 () {
	if (hasRequiredTokenize$1) return tokenize$1;
	hasRequiredTokenize$1 = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		exports$1.FIELDS = void 0;
		exports$1["default"] = tokenize;
		var t = _interopRequireWildcard(/*@__PURE__*/ requireTokenTypes$1());
		var _unescapable, _wordDelimiters;
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		var unescapable = (_unescapable = {}, _unescapable[t.tab] = true, _unescapable[t.newline] = true, _unescapable[t.cr] = true, _unescapable[t.feed] = true, _unescapable);
		var wordDelimiters = (_wordDelimiters = {}, _wordDelimiters[t.space] = true, _wordDelimiters[t.tab] = true, _wordDelimiters[t.newline] = true, _wordDelimiters[t.cr] = true, _wordDelimiters[t.feed] = true, _wordDelimiters[t.ampersand] = true, _wordDelimiters[t.asterisk] = true, _wordDelimiters[t.bang] = true, _wordDelimiters[t.comma] = true, _wordDelimiters[t.colon] = true, _wordDelimiters[t.semicolon] = true, _wordDelimiters[t.openParenthesis] = true, _wordDelimiters[t.closeParenthesis] = true, _wordDelimiters[t.openSquare] = true, _wordDelimiters[t.closeSquare] = true, _wordDelimiters[t.singleQuote] = true, _wordDelimiters[t.doubleQuote] = true, _wordDelimiters[t.plus] = true, _wordDelimiters[t.pipe] = true, _wordDelimiters[t.tilde] = true, _wordDelimiters[t.greaterThan] = true, _wordDelimiters[t.equals] = true, _wordDelimiters[t.dollar] = true, _wordDelimiters[t.caret] = true, _wordDelimiters[t.slash] = true, _wordDelimiters);
		var hex = {};
		var hexChars = "0123456789abcdefABCDEF";
		for (var i = 0; i < hexChars.length; i++) {
		  hex[hexChars.charCodeAt(i)] = true;
		}

		/**
		 *  Returns the last index of the bar css word
		 * @param {string} css The string in which the word begins
		 * @param {number} start The index into the string where word's first letter occurs
		 */
		function consumeWord(css, start) {
		  var next = start;
		  var code;
		  do {
		    code = css.charCodeAt(next);
		    if (wordDelimiters[code]) {
		      return next - 1;
		    } else if (code === t.backslash) {
		      next = consumeEscape(css, next) + 1;
		    } else {
		      // All other characters are part of the word
		      next++;
		    }
		  } while (next < css.length);
		  return next - 1;
		}

		/**
		 *  Returns the last index of the escape sequence
		 * @param {string} css The string in which the sequence begins
		 * @param {number} start The index into the string where escape character (`\`) occurs.
		 */
		function consumeEscape(css, start) {
		  var next = start;
		  var code = css.charCodeAt(next + 1);
		  if (unescapable[code]) ; else if (hex[code]) {
		    var hexDigits = 0;
		    // consume up to 6 hex chars
		    do {
		      next++;
		      hexDigits++;
		      code = css.charCodeAt(next + 1);
		    } while (hex[code] && hexDigits < 6);
		    // if fewer than 6 hex chars, a trailing space ends the escape
		    if (hexDigits < 6 && code === t.space) {
		      next++;
		    }
		  } else {
		    // the next char is part of the current word
		    next++;
		  }
		  return next;
		}
		var FIELDS = {
		  TYPE: 0,
		  START_LINE: 1,
		  START_COL: 2,
		  END_LINE: 3,
		  END_COL: 4,
		  START_POS: 5,
		  END_POS: 6
		};
		exports$1.FIELDS = FIELDS;
		function tokenize(input) {
		  var tokens = [];
		  var css = input.css.valueOf();
		  var _css = css,
		    length = _css.length;
		  var offset = -1;
		  var line = 1;
		  var start = 0;
		  var end = 0;
		  var code, content, endColumn, endLine, escaped, escapePos, last, lines, next, nextLine, nextOffset, quote, tokenType;
		  function unclosed(what, fix) {
		    if (input.safe) {
		      // fyi: this is never set to true.
		      css += fix;
		      next = css.length - 1;
		    } else {
		      throw input.error('Unclosed ' + what, line, start - offset, start);
		    }
		  }
		  while (start < length) {
		    code = css.charCodeAt(start);
		    if (code === t.newline) {
		      offset = start;
		      line += 1;
		    }
		    switch (code) {
		      case t.space:
		      case t.tab:
		      case t.newline:
		      case t.cr:
		      case t.feed:
		        next = start;
		        do {
		          next += 1;
		          code = css.charCodeAt(next);
		          if (code === t.newline) {
		            offset = next;
		            line += 1;
		          }
		        } while (code === t.space || code === t.newline || code === t.tab || code === t.cr || code === t.feed);
		        tokenType = t.space;
		        endLine = line;
		        endColumn = next - offset - 1;
		        end = next;
		        break;
		      case t.plus:
		      case t.greaterThan:
		      case t.tilde:
		      case t.pipe:
		        next = start;
		        do {
		          next += 1;
		          code = css.charCodeAt(next);
		        } while (code === t.plus || code === t.greaterThan || code === t.tilde || code === t.pipe);
		        tokenType = t.combinator;
		        endLine = line;
		        endColumn = start - offset;
		        end = next;
		        break;

		      // Consume these characters as single tokens.
		      case t.asterisk:
		      case t.ampersand:
		      case t.bang:
		      case t.comma:
		      case t.equals:
		      case t.dollar:
		      case t.caret:
		      case t.openSquare:
		      case t.closeSquare:
		      case t.colon:
		      case t.semicolon:
		      case t.openParenthesis:
		      case t.closeParenthesis:
		        next = start;
		        tokenType = code;
		        endLine = line;
		        endColumn = start - offset;
		        end = next + 1;
		        break;
		      case t.singleQuote:
		      case t.doubleQuote:
		        quote = code === t.singleQuote ? "'" : '"';
		        next = start;
		        do {
		          escaped = false;
		          next = css.indexOf(quote, next + 1);
		          if (next === -1) {
		            unclosed('quote', quote);
		          }
		          escapePos = next;
		          while (css.charCodeAt(escapePos - 1) === t.backslash) {
		            escapePos -= 1;
		            escaped = !escaped;
		          }
		        } while (escaped);
		        tokenType = t.str;
		        endLine = line;
		        endColumn = start - offset;
		        end = next + 1;
		        break;
		      default:
		        if (code === t.slash && css.charCodeAt(start + 1) === t.asterisk) {
		          next = css.indexOf('*/', start + 2) + 1;
		          if (next === 0) {
		            unclosed('comment', '*/');
		          }
		          content = css.slice(start, next + 1);
		          lines = content.split('\n');
		          last = lines.length - 1;
		          if (last > 0) {
		            nextLine = line + last;
		            nextOffset = next - lines[last].length;
		          } else {
		            nextLine = line;
		            nextOffset = offset;
		          }
		          tokenType = t.comment;
		          line = nextLine;
		          endLine = nextLine;
		          endColumn = next - nextOffset;
		        } else if (code === t.slash) {
		          next = start;
		          tokenType = code;
		          endLine = line;
		          endColumn = start - offset;
		          end = next + 1;
		        } else {
		          next = consumeWord(css, start);
		          tokenType = t.word;
		          endLine = line;
		          endColumn = next - offset;
		        }
		        end = next + 1;
		        break;
		    }

		    // Ensure that the token structure remains consistent
		    tokens.push([tokenType,
		    // [0] Token type
		    line,
		    // [1] Starting line
		    start - offset,
		    // [2] Starting column
		    endLine,
		    // [3] Ending line
		    endColumn,
		    // [4] Ending column
		    start,
		    // [5] Start position / Source index
		    end // [6] End position
		    ]);

		    // Reset offset for the next token
		    if (nextOffset) {
		      offset = nextOffset;
		      nextOffset = null;
		    }
		    start = end;
		  }
		  return tokens;
		} 
	} (tokenize$1));
	return tokenize$1;
}

var hasRequiredParser$2;

function requireParser$2 () {
	if (hasRequiredParser$2) return parser$1.exports;
	hasRequiredParser$2 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _root = _interopRequireDefault(/*@__PURE__*/ requireRoot$1());
		var _selector = _interopRequireDefault(/*@__PURE__*/ requireSelector$1());
		var _className = _interopRequireDefault(/*@__PURE__*/ requireClassName$1());
		var _comment = _interopRequireDefault(/*@__PURE__*/ requireComment$1());
		var _id = _interopRequireDefault(/*@__PURE__*/ requireId$1());
		var _tag = _interopRequireDefault(/*@__PURE__*/ requireTag$1());
		var _string = _interopRequireDefault(/*@__PURE__*/ requireString$1());
		var _pseudo = _interopRequireDefault(/*@__PURE__*/ requirePseudo$1());
		var _attribute = _interopRequireWildcard(/*@__PURE__*/ requireAttribute$1());
		var _universal = _interopRequireDefault(/*@__PURE__*/ requireUniversal$1());
		var _combinator = _interopRequireDefault(/*@__PURE__*/ requireCombinator$1());
		var _nesting = _interopRequireDefault(/*@__PURE__*/ requireNesting$1());
		var _sortAscending = _interopRequireDefault(/*@__PURE__*/ requireSortAscending$1());
		var _tokenize = _interopRequireWildcard(/*@__PURE__*/ requireTokenize$1());
		var tokens = _interopRequireWildcard(/*@__PURE__*/ requireTokenTypes$1());
		var types = _interopRequireWildcard(/*@__PURE__*/ requireTypes$1());
		var _util = /*@__PURE__*/ requireUtil$2();
		var _WHITESPACE_TOKENS, _Object$assign;
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		var WHITESPACE_TOKENS = (_WHITESPACE_TOKENS = {}, _WHITESPACE_TOKENS[tokens.space] = true, _WHITESPACE_TOKENS[tokens.cr] = true, _WHITESPACE_TOKENS[tokens.feed] = true, _WHITESPACE_TOKENS[tokens.newline] = true, _WHITESPACE_TOKENS[tokens.tab] = true, _WHITESPACE_TOKENS);
		var WHITESPACE_EQUIV_TOKENS = Object.assign({}, WHITESPACE_TOKENS, (_Object$assign = {}, _Object$assign[tokens.comment] = true, _Object$assign));
		function tokenStart(token) {
		  return {
		    line: token[_tokenize.FIELDS.START_LINE],
		    column: token[_tokenize.FIELDS.START_COL]
		  };
		}
		function tokenEnd(token) {
		  return {
		    line: token[_tokenize.FIELDS.END_LINE],
		    column: token[_tokenize.FIELDS.END_COL]
		  };
		}
		function getSource(startLine, startColumn, endLine, endColumn) {
		  return {
		    start: {
		      line: startLine,
		      column: startColumn
		    },
		    end: {
		      line: endLine,
		      column: endColumn
		    }
		  };
		}
		function getTokenSource(token) {
		  return getSource(token[_tokenize.FIELDS.START_LINE], token[_tokenize.FIELDS.START_COL], token[_tokenize.FIELDS.END_LINE], token[_tokenize.FIELDS.END_COL]);
		}
		function getTokenSourceSpan(startToken, endToken) {
		  if (!startToken) {
		    return undefined;
		  }
		  return getSource(startToken[_tokenize.FIELDS.START_LINE], startToken[_tokenize.FIELDS.START_COL], endToken[_tokenize.FIELDS.END_LINE], endToken[_tokenize.FIELDS.END_COL]);
		}
		function unescapeProp(node, prop) {
		  var value = node[prop];
		  if (typeof value !== "string") {
		    return;
		  }
		  if (value.indexOf("\\") !== -1) {
		    (0, _util.ensureObject)(node, 'raws');
		    node[prop] = (0, _util.unesc)(value);
		    if (node.raws[prop] === undefined) {
		      node.raws[prop] = value;
		    }
		  }
		  return node;
		}
		function indexesOf(array, item) {
		  var i = -1;
		  var indexes = [];
		  while ((i = array.indexOf(item, i + 1)) !== -1) {
		    indexes.push(i);
		  }
		  return indexes;
		}
		function uniqs() {
		  var list = Array.prototype.concat.apply([], arguments);
		  return list.filter(function (item, i) {
		    return i === list.indexOf(item);
		  });
		}
		var Parser = /*#__PURE__*/function () {
		  function Parser(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    this.rule = rule;
		    this.options = Object.assign({
		      lossy: false,
		      safe: false
		    }, options);
		    this.position = 0;
		    this.css = typeof this.rule === 'string' ? this.rule : this.rule.selector;
		    this.tokens = (0, _tokenize["default"])({
		      css: this.css,
		      error: this._errorGenerator(),
		      safe: this.options.safe
		    });
		    var rootSource = getTokenSourceSpan(this.tokens[0], this.tokens[this.tokens.length - 1]);
		    this.root = new _root["default"]({
		      source: rootSource
		    });
		    this.root.errorGenerator = this._errorGenerator();
		    var selector = new _selector["default"]({
		      source: {
		        start: {
		          line: 1,
		          column: 1
		        }
		      },
		      sourceIndex: 0
		    });
		    this.root.append(selector);
		    this.current = selector;
		    this.loop();
		  }
		  var _proto = Parser.prototype;
		  _proto._errorGenerator = function _errorGenerator() {
		    var _this = this;
		    return function (message, errorOptions) {
		      if (typeof _this.rule === 'string') {
		        return new Error(message);
		      }
		      return _this.rule.error(message, errorOptions);
		    };
		  };
		  _proto.attribute = function attribute() {
		    var attr = [];
		    var startingToken = this.currToken;
		    this.position++;
		    while (this.position < this.tokens.length && this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
		      attr.push(this.currToken);
		      this.position++;
		    }
		    if (this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
		      return this.expected('closing square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		    var len = attr.length;
		    var node = {
		      source: getSource(startingToken[1], startingToken[2], this.currToken[3], this.currToken[4]),
		      sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
		    };
		    if (len === 1 && !~[tokens.word].indexOf(attr[0][_tokenize.FIELDS.TYPE])) {
		      return this.expected('attribute', attr[0][_tokenize.FIELDS.START_POS]);
		    }
		    var pos = 0;
		    var spaceBefore = '';
		    var commentBefore = '';
		    var lastAdded = null;
		    var spaceAfterMeaningfulToken = false;
		    while (pos < len) {
		      var token = attr[pos];
		      var content = this.content(token);
		      var next = attr[pos + 1];
		      switch (token[_tokenize.FIELDS.TYPE]) {
		        case tokens.space:
		          // if (
		          //     len === 1 ||
		          //     pos === 0 && this.content(next) === '|'
		          // ) {
		          //     return this.expected('attribute', token[TOKEN.START_POS], content);
		          // }
		          spaceAfterMeaningfulToken = true;
		          if (this.options.lossy) {
		            break;
		          }
		          if (lastAdded) {
		            (0, _util.ensureObject)(node, 'spaces', lastAdded);
		            var prevContent = node.spaces[lastAdded].after || '';
		            node.spaces[lastAdded].after = prevContent + content;
		            var existingComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || null;
		            if (existingComment) {
		              node.raws.spaces[lastAdded].after = existingComment + content;
		            }
		          } else {
		            spaceBefore = spaceBefore + content;
		            commentBefore = commentBefore + content;
		          }
		          break;
		        case tokens.asterisk:
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          } else if ((!node.namespace || lastAdded === "namespace" && !spaceAfterMeaningfulToken) && next) {
		            if (spaceBefore) {
		              (0, _util.ensureObject)(node, 'spaces', 'attribute');
		              node.spaces.attribute.before = spaceBefore;
		              spaceBefore = '';
		            }
		            if (commentBefore) {
		              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
		              node.raws.spaces.attribute.before = spaceBefore;
		              commentBefore = '';
		            }
		            node.namespace = (node.namespace || "") + content;
		            var rawValue = (0, _util.getProp)(node, 'raws', 'namespace') || null;
		            if (rawValue) {
		              node.raws.namespace += content;
		            }
		            lastAdded = 'namespace';
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.dollar:
		          if (lastAdded === "value") {
		            var oldRawValue = (0, _util.getProp)(node, 'raws', 'value');
		            node.value += "$";
		            if (oldRawValue) {
		              node.raws.value = oldRawValue + "$";
		            }
		            break;
		          }
		        // Falls through
		        case tokens.caret:
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.combinator:
		          if (content === '~' && next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          }
		          if (content !== '|') {
		            spaceAfterMeaningfulToken = false;
		            break;
		          }
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          } else if (!node.namespace && !node.attribute) {
		            node.namespace = true;
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.word:
		          if (next && this.content(next) === '|' && attr[pos + 2] && attr[pos + 2][_tokenize.FIELDS.TYPE] !== tokens.equals &&
		          // this look-ahead probably fails with comment nodes involved.
		          !node.operator && !node.namespace) {
		            node.namespace = content;
		            lastAdded = 'namespace';
		          } else if (!node.attribute || lastAdded === "attribute" && !spaceAfterMeaningfulToken) {
		            if (spaceBefore) {
		              (0, _util.ensureObject)(node, 'spaces', 'attribute');
		              node.spaces.attribute.before = spaceBefore;
		              spaceBefore = '';
		            }
		            if (commentBefore) {
		              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
		              node.raws.spaces.attribute.before = commentBefore;
		              commentBefore = '';
		            }
		            node.attribute = (node.attribute || "") + content;
		            var _rawValue = (0, _util.getProp)(node, 'raws', 'attribute') || null;
		            if (_rawValue) {
		              node.raws.attribute += content;
		            }
		            lastAdded = 'attribute';
		          } else if (!node.value && node.value !== "" || lastAdded === "value" && !(spaceAfterMeaningfulToken || node.quoteMark)) {
		            var _unescaped = (0, _util.unesc)(content);
		            var _oldRawValue = (0, _util.getProp)(node, 'raws', 'value') || '';
		            var oldValue = node.value || '';
		            node.value = oldValue + _unescaped;
		            node.quoteMark = null;
		            if (_unescaped !== content || _oldRawValue) {
		              (0, _util.ensureObject)(node, 'raws');
		              node.raws.value = (_oldRawValue || oldValue) + content;
		            }
		            lastAdded = 'value';
		          } else {
		            var insensitive = content === 'i' || content === "I";
		            if ((node.value || node.value === '') && (node.quoteMark || spaceAfterMeaningfulToken)) {
		              node.insensitive = insensitive;
		              if (!insensitive || content === "I") {
		                (0, _util.ensureObject)(node, 'raws');
		                node.raws.insensitiveFlag = content;
		              }
		              lastAdded = 'insensitive';
		              if (spaceBefore) {
		                (0, _util.ensureObject)(node, 'spaces', 'insensitive');
		                node.spaces.insensitive.before = spaceBefore;
		                spaceBefore = '';
		              }
		              if (commentBefore) {
		                (0, _util.ensureObject)(node, 'raws', 'spaces', 'insensitive');
		                node.raws.spaces.insensitive.before = commentBefore;
		                commentBefore = '';
		              }
		            } else if (node.value || node.value === '') {
		              lastAdded = 'value';
		              node.value += content;
		              if (node.raws.value) {
		                node.raws.value += content;
		              }
		            }
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.str:
		          if (!node.attribute || !node.operator) {
		            return this.error("Expected an attribute followed by an operator preceding the string.", {
		              index: token[_tokenize.FIELDS.START_POS]
		            });
		          }
		          var _unescapeValue = (0, _attribute.unescapeValue)(content),
		            unescaped = _unescapeValue.unescaped,
		            quoteMark = _unescapeValue.quoteMark;
		          node.value = unescaped;
		          node.quoteMark = quoteMark;
		          lastAdded = 'value';
		          (0, _util.ensureObject)(node, 'raws');
		          node.raws.value = content;
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.equals:
		          if (!node.attribute) {
		            return this.expected('attribute', token[_tokenize.FIELDS.START_POS], content);
		          }
		          if (node.value) {
		            return this.error('Unexpected "=" found; an operator was already defined.', {
		              index: token[_tokenize.FIELDS.START_POS]
		            });
		          }
		          node.operator = node.operator ? node.operator + content : content;
		          lastAdded = 'operator';
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.comment:
		          if (lastAdded) {
		            if (spaceAfterMeaningfulToken || next && next[_tokenize.FIELDS.TYPE] === tokens.space || lastAdded === 'insensitive') {
		              var lastComment = (0, _util.getProp)(node, 'spaces', lastAdded, 'after') || '';
		              var rawLastComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || lastComment;
		              (0, _util.ensureObject)(node, 'raws', 'spaces', lastAdded);
		              node.raws.spaces[lastAdded].after = rawLastComment + content;
		            } else {
		              var lastValue = node[lastAdded] || '';
		              var rawLastValue = (0, _util.getProp)(node, 'raws', lastAdded) || lastValue;
		              (0, _util.ensureObject)(node, 'raws');
		              node.raws[lastAdded] = rawLastValue + content;
		            }
		          } else {
		            commentBefore = commentBefore + content;
		          }
		          break;
		        default:
		          return this.error("Unexpected \"" + content + "\" found.", {
		            index: token[_tokenize.FIELDS.START_POS]
		          });
		      }
		      pos++;
		    }
		    unescapeProp(node, "attribute");
		    unescapeProp(node, "namespace");
		    this.newNode(new _attribute["default"](node));
		    this.position++;
		  }

		  /**
		   * return a node containing meaningless garbage up to (but not including) the specified token position.
		   * if the token position is negative, all remaining tokens are consumed.
		   *
		   * This returns an array containing a single string node if all whitespace,
		   * otherwise an array of comment nodes with space before and after.
		   *
		   * These tokens are not added to the current selector, the caller can add them or use them to amend
		   * a previous node's space metadata.
		   *
		   * In lossy mode, this returns only comments.
		   */;
		  _proto.parseWhitespaceEquivalentTokens = function parseWhitespaceEquivalentTokens(stopPosition) {
		    if (stopPosition < 0) {
		      stopPosition = this.tokens.length;
		    }
		    var startPosition = this.position;
		    var nodes = [];
		    var space = "";
		    var lastComment = undefined;
		    do {
		      if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) {
		        if (!this.options.lossy) {
		          space += this.content();
		        }
		      } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.comment) {
		        var spaces = {};
		        if (space) {
		          spaces.before = space;
		          space = "";
		        }
		        lastComment = new _comment["default"]({
		          value: this.content(),
		          source: getTokenSource(this.currToken),
		          sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
		          spaces: spaces
		        });
		        nodes.push(lastComment);
		      }
		    } while (++this.position < stopPosition);
		    if (space) {
		      if (lastComment) {
		        lastComment.spaces.after = space;
		      } else if (!this.options.lossy) {
		        var firstToken = this.tokens[startPosition];
		        var lastToken = this.tokens[this.position - 1];
		        nodes.push(new _string["default"]({
		          value: '',
		          source: getSource(firstToken[_tokenize.FIELDS.START_LINE], firstToken[_tokenize.FIELDS.START_COL], lastToken[_tokenize.FIELDS.END_LINE], lastToken[_tokenize.FIELDS.END_COL]),
		          sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
		          spaces: {
		            before: space,
		            after: ''
		          }
		        }));
		      }
		    }
		    return nodes;
		  }

		  /**
		   *
		   * @param {*} nodes
		   */;
		  _proto.convertWhitespaceNodesToSpace = function convertWhitespaceNodesToSpace(nodes, requiredSpace) {
		    var _this2 = this;
		    if (requiredSpace === void 0) {
		      requiredSpace = false;
		    }
		    var space = "";
		    var rawSpace = "";
		    nodes.forEach(function (n) {
		      var spaceBefore = _this2.lossySpace(n.spaces.before, requiredSpace);
		      var rawSpaceBefore = _this2.lossySpace(n.rawSpaceBefore, requiredSpace);
		      space += spaceBefore + _this2.lossySpace(n.spaces.after, requiredSpace && spaceBefore.length === 0);
		      rawSpace += spaceBefore + n.value + _this2.lossySpace(n.rawSpaceAfter, requiredSpace && rawSpaceBefore.length === 0);
		    });
		    if (rawSpace === space) {
		      rawSpace = undefined;
		    }
		    var result = {
		      space: space,
		      rawSpace: rawSpace
		    };
		    return result;
		  };
		  _proto.isNamedCombinator = function isNamedCombinator(position) {
		    if (position === void 0) {
		      position = this.position;
		    }
		    return this.tokens[position + 0] && this.tokens[position + 0][_tokenize.FIELDS.TYPE] === tokens.slash && this.tokens[position + 1] && this.tokens[position + 1][_tokenize.FIELDS.TYPE] === tokens.word && this.tokens[position + 2] && this.tokens[position + 2][_tokenize.FIELDS.TYPE] === tokens.slash;
		  };
		  _proto.namedCombinator = function namedCombinator() {
		    if (this.isNamedCombinator()) {
		      var nameRaw = this.content(this.tokens[this.position + 1]);
		      var name = (0, _util.unesc)(nameRaw).toLowerCase();
		      var raws = {};
		      if (name !== nameRaw) {
		        raws.value = "/" + nameRaw + "/";
		      }
		      var node = new _combinator["default"]({
		        value: "/" + name + "/",
		        source: getSource(this.currToken[_tokenize.FIELDS.START_LINE], this.currToken[_tokenize.FIELDS.START_COL], this.tokens[this.position + 2][_tokenize.FIELDS.END_LINE], this.tokens[this.position + 2][_tokenize.FIELDS.END_COL]),
		        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
		        raws: raws
		      });
		      this.position = this.position + 3;
		      return node;
		    } else {
		      this.unexpected();
		    }
		  };
		  _proto.combinator = function combinator() {
		    var _this3 = this;
		    if (this.content() === '|') {
		      return this.namespace();
		    }
		    // We need to decide between a space that's a descendant combinator and meaningless whitespace at the end of a selector.
		    var nextSigTokenPos = this.locateNextMeaningfulToken(this.position);
		    if (nextSigTokenPos < 0 || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.comma || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		      var nodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
		      if (nodes.length > 0) {
		        var last = this.current.last;
		        if (last) {
		          var _this$convertWhitespa = this.convertWhitespaceNodesToSpace(nodes),
		            space = _this$convertWhitespa.space,
		            rawSpace = _this$convertWhitespa.rawSpace;
		          if (rawSpace !== undefined) {
		            last.rawSpaceAfter += rawSpace;
		          }
		          last.spaces.after += space;
		        } else {
		          nodes.forEach(function (n) {
		            return _this3.newNode(n);
		          });
		        }
		      }
		      return;
		    }
		    var firstToken = this.currToken;
		    var spaceOrDescendantSelectorNodes = undefined;
		    if (nextSigTokenPos > this.position) {
		      spaceOrDescendantSelectorNodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
		    }
		    var node;
		    if (this.isNamedCombinator()) {
		      node = this.namedCombinator();
		    } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.combinator) {
		      node = new _combinator["default"]({
		        value: this.content(),
		        source: getTokenSource(this.currToken),
		        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS]
		      });
		      this.position++;
		    } else if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) ; else if (!spaceOrDescendantSelectorNodes) {
		      this.unexpected();
		    }
		    if (node) {
		      if (spaceOrDescendantSelectorNodes) {
		        var _this$convertWhitespa2 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes),
		          _space = _this$convertWhitespa2.space,
		          _rawSpace = _this$convertWhitespa2.rawSpace;
		        node.spaces.before = _space;
		        node.rawSpaceBefore = _rawSpace;
		      }
		    } else {
		      // descendant combinator
		      var _this$convertWhitespa3 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes, true),
		        _space2 = _this$convertWhitespa3.space,
		        _rawSpace2 = _this$convertWhitespa3.rawSpace;
		      if (!_rawSpace2) {
		        _rawSpace2 = _space2;
		      }
		      var spaces = {};
		      var raws = {
		        spaces: {}
		      };
		      if (_space2.endsWith(' ') && _rawSpace2.endsWith(' ')) {
		        spaces.before = _space2.slice(0, _space2.length - 1);
		        raws.spaces.before = _rawSpace2.slice(0, _rawSpace2.length - 1);
		      } else if (_space2.startsWith(' ') && _rawSpace2.startsWith(' ')) {
		        spaces.after = _space2.slice(1);
		        raws.spaces.after = _rawSpace2.slice(1);
		      } else {
		        raws.value = _rawSpace2;
		      }
		      node = new _combinator["default"]({
		        value: ' ',
		        source: getTokenSourceSpan(firstToken, this.tokens[this.position - 1]),
		        sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
		        spaces: spaces,
		        raws: raws
		      });
		    }
		    if (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.space) {
		      node.spaces.after = this.optionalSpace(this.content());
		      this.position++;
		    }
		    return this.newNode(node);
		  };
		  _proto.comma = function comma() {
		    if (this.position === this.tokens.length - 1) {
		      this.root.trailingComma = true;
		      this.position++;
		      return;
		    }
		    this.current._inferEndPosition();
		    var selector = new _selector["default"]({
		      source: {
		        start: tokenStart(this.tokens[this.position + 1])
		      },
		      sourceIndex: this.tokens[this.position + 1][_tokenize.FIELDS.START_POS]
		    });
		    this.current.parent.append(selector);
		    this.current = selector;
		    this.position++;
		  };
		  _proto.comment = function comment() {
		    var current = this.currToken;
		    this.newNode(new _comment["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.error = function error(message, opts) {
		    throw this.root.error(message, opts);
		  };
		  _proto.missingBackslash = function missingBackslash() {
		    return this.error('Expected a backslash preceding the semicolon.', {
		      index: this.currToken[_tokenize.FIELDS.START_POS]
		    });
		  };
		  _proto.missingParenthesis = function missingParenthesis() {
		    return this.expected('opening parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.missingSquareBracket = function missingSquareBracket() {
		    return this.expected('opening square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.unexpected = function unexpected() {
		    return this.error("Unexpected '" + this.content() + "'. Escaping special characters with \\ may help.", this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.unexpectedPipe = function unexpectedPipe() {
		    return this.error("Unexpected '|'.", this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.namespace = function namespace() {
		    var before = this.prevToken && this.content(this.prevToken) || true;
		    if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.word) {
		      this.position++;
		      return this.word(before);
		    } else if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.asterisk) {
		      this.position++;
		      return this.universal(before);
		    }
		    this.unexpectedPipe();
		  };
		  _proto.nesting = function nesting() {
		    if (this.nextToken) {
		      var nextContent = this.content(this.nextToken);
		      if (nextContent === "|") {
		        this.position++;
		        return;
		      }
		    }
		    var current = this.currToken;
		    this.newNode(new _nesting["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.parentheses = function parentheses() {
		    var last = this.current.last;
		    var unbalanced = 1;
		    this.position++;
		    if (last && last.type === types.PSEUDO) {
		      var selector = new _selector["default"]({
		        source: {
		          start: tokenStart(this.tokens[this.position])
		        },
		        sourceIndex: this.tokens[this.position][_tokenize.FIELDS.START_POS]
		      });
		      var cache = this.current;
		      last.append(selector);
		      this.current = selector;
		      while (this.position < this.tokens.length && unbalanced) {
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          unbalanced++;
		        }
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		          unbalanced--;
		        }
		        if (unbalanced) {
		          this.parse();
		        } else {
		          this.current.source.end = tokenEnd(this.currToken);
		          this.current.parent.source.end = tokenEnd(this.currToken);
		          this.position++;
		        }
		      }
		      this.current = cache;
		    } else {
		      // I think this case should be an error. It's used to implement a basic parse of media queries
		      // but I don't think it's a good idea.
		      var parenStart = this.currToken;
		      var parenValue = "(";
		      var parenEnd;
		      while (this.position < this.tokens.length && unbalanced) {
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          unbalanced++;
		        }
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		          unbalanced--;
		        }
		        parenEnd = this.currToken;
		        parenValue += this.parseParenthesisToken(this.currToken);
		        this.position++;
		      }
		      if (last) {
		        last.appendToPropertyAndEscape("value", parenValue, parenValue);
		      } else {
		        this.newNode(new _string["default"]({
		          value: parenValue,
		          source: getSource(parenStart[_tokenize.FIELDS.START_LINE], parenStart[_tokenize.FIELDS.START_COL], parenEnd[_tokenize.FIELDS.END_LINE], parenEnd[_tokenize.FIELDS.END_COL]),
		          sourceIndex: parenStart[_tokenize.FIELDS.START_POS]
		        }));
		      }
		    }
		    if (unbalanced) {
		      return this.expected('closing parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		  };
		  _proto.pseudo = function pseudo() {
		    var _this4 = this;
		    var pseudoStr = '';
		    var startingToken = this.currToken;
		    while (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.colon) {
		      pseudoStr += this.content();
		      this.position++;
		    }
		    if (!this.currToken) {
		      return this.expected(['pseudo-class', 'pseudo-element'], this.position - 1);
		    }
		    if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.word) {
		      this.splitWord(false, function (first, length) {
		        pseudoStr += first;
		        _this4.newNode(new _pseudo["default"]({
		          value: pseudoStr,
		          source: getTokenSourceSpan(startingToken, _this4.currToken),
		          sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
		        }));
		        if (length > 1 && _this4.nextToken && _this4.nextToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          _this4.error('Misplaced parenthesis.', {
		            index: _this4.nextToken[_tokenize.FIELDS.START_POS]
		          });
		        }
		      });
		    } else {
		      return this.expected(['pseudo-class', 'pseudo-element'], this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		  };
		  _proto.space = function space() {
		    var content = this.content();
		    // Handle space before and after the selector
		    if (this.position === 0 || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis || this.current.nodes.every(function (node) {
		      return node.type === 'comment';
		    })) {
		      this.spaces = this.optionalSpace(content);
		      this.position++;
		    } else if (this.position === this.tokens.length - 1 || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		      this.current.last.spaces.after = this.optionalSpace(content);
		      this.position++;
		    } else {
		      this.combinator();
		    }
		  };
		  _proto.string = function string() {
		    var current = this.currToken;
		    this.newNode(new _string["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.universal = function universal(namespace) {
		    var nextToken = this.nextToken;
		    if (nextToken && this.content(nextToken) === '|') {
		      this.position++;
		      return this.namespace();
		    }
		    var current = this.currToken;
		    this.newNode(new _universal["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }), namespace);
		    this.position++;
		  };
		  _proto.splitWord = function splitWord(namespace, firstCallback) {
		    var _this5 = this;
		    var nextToken = this.nextToken;
		    var word = this.content();
		    while (nextToken && ~[tokens.dollar, tokens.caret, tokens.equals, tokens.word].indexOf(nextToken[_tokenize.FIELDS.TYPE])) {
		      this.position++;
		      var current = this.content();
		      word += current;
		      if (current.lastIndexOf('\\') === current.length - 1) {
		        var next = this.nextToken;
		        if (next && next[_tokenize.FIELDS.TYPE] === tokens.space) {
		          word += this.requiredSpace(this.content(next));
		          this.position++;
		        }
		      }
		      nextToken = this.nextToken;
		    }
		    var hasClass = indexesOf(word, '.').filter(function (i) {
		      // Allow escaped dot within class name
		      var escapedDot = word[i - 1] === '\\';
		      // Allow decimal numbers percent in @keyframes
		      var isKeyframesPercent = /^\d+\.\d+%$/.test(word);
		      return !escapedDot && !isKeyframesPercent;
		    });
		    var hasId = indexesOf(word, '#').filter(function (i) {
		      return word[i - 1] !== '\\';
		    });
		    // Eliminate Sass interpolations from the list of id indexes
		    var interpolations = indexesOf(word, '#{');
		    if (interpolations.length) {
		      hasId = hasId.filter(function (hashIndex) {
		        return !~interpolations.indexOf(hashIndex);
		      });
		    }
		    var indices = (0, _sortAscending["default"])(uniqs([0].concat(hasClass, hasId)));
		    indices.forEach(function (ind, i) {
		      var index = indices[i + 1] || word.length;
		      var value = word.slice(ind, index);
		      if (i === 0 && firstCallback) {
		        return firstCallback.call(_this5, value, indices.length);
		      }
		      var node;
		      var current = _this5.currToken;
		      var sourceIndex = current[_tokenize.FIELDS.START_POS] + indices[i];
		      var source = getSource(current[1], current[2] + ind, current[3], current[2] + (index - 1));
		      if (~hasClass.indexOf(ind)) {
		        var classNameOpts = {
		          value: value.slice(1),
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        node = new _className["default"](unescapeProp(classNameOpts, "value"));
		      } else if (~hasId.indexOf(ind)) {
		        var idOpts = {
		          value: value.slice(1),
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        node = new _id["default"](unescapeProp(idOpts, "value"));
		      } else {
		        var tagOpts = {
		          value: value,
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        unescapeProp(tagOpts, "value");
		        node = new _tag["default"](tagOpts);
		      }
		      _this5.newNode(node, namespace);
		      // Ensure that the namespace is used only once
		      namespace = null;
		    });
		    this.position++;
		  };
		  _proto.word = function word(namespace) {
		    var nextToken = this.nextToken;
		    if (nextToken && this.content(nextToken) === '|') {
		      this.position++;
		      return this.namespace();
		    }
		    return this.splitWord(namespace);
		  };
		  _proto.loop = function loop() {
		    while (this.position < this.tokens.length) {
		      this.parse(true);
		    }
		    this.current._inferEndPosition();
		    return this.root;
		  };
		  _proto.parse = function parse(throwOnParenthesis) {
		    switch (this.currToken[_tokenize.FIELDS.TYPE]) {
		      case tokens.space:
		        this.space();
		        break;
		      case tokens.comment:
		        this.comment();
		        break;
		      case tokens.openParenthesis:
		        this.parentheses();
		        break;
		      case tokens.closeParenthesis:
		        if (throwOnParenthesis) {
		          this.missingParenthesis();
		        }
		        break;
		      case tokens.openSquare:
		        this.attribute();
		        break;
		      case tokens.dollar:
		      case tokens.caret:
		      case tokens.equals:
		      case tokens.word:
		        this.word();
		        break;
		      case tokens.colon:
		        this.pseudo();
		        break;
		      case tokens.comma:
		        this.comma();
		        break;
		      case tokens.asterisk:
		        this.universal();
		        break;
		      case tokens.ampersand:
		        this.nesting();
		        break;
		      case tokens.slash:
		      case tokens.combinator:
		        this.combinator();
		        break;
		      case tokens.str:
		        this.string();
		        break;
		      // These cases throw; no break needed.
		      case tokens.closeSquare:
		        this.missingSquareBracket();
		      case tokens.semicolon:
		        this.missingBackslash();
		      default:
		        this.unexpected();
		    }
		  }

		  /**
		   * Helpers
		   */;
		  _proto.expected = function expected(description, index, found) {
		    if (Array.isArray(description)) {
		      var last = description.pop();
		      description = description.join(', ') + " or " + last;
		    }
		    var an = /^[aeiou]/.test(description[0]) ? 'an' : 'a';
		    if (!found) {
		      return this.error("Expected " + an + " " + description + ".", {
		        index: index
		      });
		    }
		    return this.error("Expected " + an + " " + description + ", found \"" + found + "\" instead.", {
		      index: index
		    });
		  };
		  _proto.requiredSpace = function requiredSpace(space) {
		    return this.options.lossy ? ' ' : space;
		  };
		  _proto.optionalSpace = function optionalSpace(space) {
		    return this.options.lossy ? '' : space;
		  };
		  _proto.lossySpace = function lossySpace(space, required) {
		    if (this.options.lossy) {
		      return required ? ' ' : '';
		    } else {
		      return space;
		    }
		  };
		  _proto.parseParenthesisToken = function parseParenthesisToken(token) {
		    var content = this.content(token);
		    if (token[_tokenize.FIELDS.TYPE] === tokens.space) {
		      return this.requiredSpace(content);
		    } else {
		      return content;
		    }
		  };
		  _proto.newNode = function newNode(node, namespace) {
		    if (namespace) {
		      if (/^ +$/.test(namespace)) {
		        if (!this.options.lossy) {
		          this.spaces = (this.spaces || '') + namespace;
		        }
		        namespace = true;
		      }
		      node.namespace = namespace;
		      unescapeProp(node, "namespace");
		    }
		    if (this.spaces) {
		      node.spaces.before = this.spaces;
		      this.spaces = '';
		    }
		    return this.current.append(node);
		  };
		  _proto.content = function content(token) {
		    if (token === void 0) {
		      token = this.currToken;
		    }
		    return this.css.slice(token[_tokenize.FIELDS.START_POS], token[_tokenize.FIELDS.END_POS]);
		  };
		  /**
		   * returns the index of the next non-whitespace, non-comment token.
		   * returns -1 if no meaningful token is found.
		   */
		  _proto.locateNextMeaningfulToken = function locateNextMeaningfulToken(startPosition) {
		    if (startPosition === void 0) {
		      startPosition = this.position + 1;
		    }
		    var searchPosition = startPosition;
		    while (searchPosition < this.tokens.length) {
		      if (WHITESPACE_EQUIV_TOKENS[this.tokens[searchPosition][_tokenize.FIELDS.TYPE]]) {
		        searchPosition++;
		        continue;
		      } else {
		        return searchPosition;
		      }
		    }
		    return -1;
		  };
		  _createClass(Parser, [{
		    key: "currToken",
		    get: function get() {
		      return this.tokens[this.position];
		    }
		  }, {
		    key: "nextToken",
		    get: function get() {
		      return this.tokens[this.position + 1];
		    }
		  }, {
		    key: "prevToken",
		    get: function get() {
		      return this.tokens[this.position - 1];
		    }
		  }]);
		  return Parser;
		}();
		exports$1["default"] = Parser;
		module.exports = exports$1.default; 
	} (parser$1, parser$1.exports));
	return parser$1.exports;
}

var hasRequiredProcessor$1;

function requireProcessor$1 () {
	if (hasRequiredProcessor$1) return processor$1.exports;
	hasRequiredProcessor$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _parser = _interopRequireDefault(/*@__PURE__*/ requireParser$2());
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		var Processor = /*#__PURE__*/function () {
		  function Processor(func, options) {
		    this.func = func || function noop() {};
		    this.funcRes = null;
		    this.options = options;
		  }
		  var _proto = Processor.prototype;
		  _proto._shouldUpdateSelector = function _shouldUpdateSelector(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var merged = Object.assign({}, this.options, options);
		    if (merged.updateSelector === false) {
		      return false;
		    } else {
		      return typeof rule !== "string";
		    }
		  };
		  _proto._isLossy = function _isLossy(options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var merged = Object.assign({}, this.options, options);
		    if (merged.lossless === false) {
		      return true;
		    } else {
		      return false;
		    }
		  };
		  _proto._root = function _root(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var parser = new _parser["default"](rule, this._parseOptions(options));
		    return parser.root;
		  };
		  _proto._parseOptions = function _parseOptions(options) {
		    return {
		      lossy: this._isLossy(options)
		    };
		  };
		  _proto._run = function _run(rule, options) {
		    var _this = this;
		    if (options === void 0) {
		      options = {};
		    }
		    return new Promise(function (resolve, reject) {
		      try {
		        var root = _this._root(rule, options);
		        Promise.resolve(_this.func(root)).then(function (transform) {
		          var string = undefined;
		          if (_this._shouldUpdateSelector(rule, options)) {
		            string = root.toString();
		            rule.selector = string;
		          }
		          return {
		            transform: transform,
		            root: root,
		            string: string
		          };
		        }).then(resolve, reject);
		      } catch (e) {
		        reject(e);
		        return;
		      }
		    });
		  };
		  _proto._runSync = function _runSync(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var root = this._root(rule, options);
		    var transform = this.func(root);
		    if (transform && typeof transform.then === "function") {
		      throw new Error("Selector processor returned a promise to a synchronous call.");
		    }
		    var string = undefined;
		    if (options.updateSelector && typeof rule !== "string") {
		      string = root.toString();
		      rule.selector = string;
		    }
		    return {
		      transform: transform,
		      root: root,
		      string: string
		    };
		  }

		  /**
		   * Process rule into a selector AST.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {Promise<parser.Root>} The AST of the selector after processing it.
		   */;
		  _proto.ast = function ast(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.root;
		    });
		  }

		  /**
		   * Process rule into a selector AST synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {parser.Root} The AST of the selector after processing it.
		   */;
		  _proto.astSync = function astSync(rule, options) {
		    return this._runSync(rule, options).root;
		  }

		  /**
		   * Process a selector into a transformed value asynchronously
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {Promise<any>} The value returned by the processor.
		   */;
		  _proto.transform = function transform(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.transform;
		    });
		  }

		  /**
		   * Process a selector into a transformed value synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {any} The value returned by the processor.
		   */;
		  _proto.transformSync = function transformSync(rule, options) {
		    return this._runSync(rule, options).transform;
		  }

		  /**
		   * Process a selector into a new selector string asynchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {string} the selector after processing.
		   */;
		  _proto.process = function process(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.string || result.root.toString();
		    });
		  }

		  /**
		   * Process a selector into a new selector string synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {string} the selector after processing.
		   */;
		  _proto.processSync = function processSync(rule, options) {
		    var result = this._runSync(rule, options);
		    return result.string || result.root.toString();
		  };
		  return Processor;
		}();
		exports$1["default"] = Processor;
		module.exports = exports$1.default; 
	} (processor$1, processor$1.exports));
	return processor$1.exports;
}

var selectors$1 = {};

var constructors$1 = {};

var hasRequiredConstructors$1;

function requireConstructors$1 () {
	if (hasRequiredConstructors$1) return constructors$1;
	hasRequiredConstructors$1 = 1;

	constructors$1.__esModule = true;
	constructors$1.universal = constructors$1.tag = constructors$1.string = constructors$1.selector = constructors$1.root = constructors$1.pseudo = constructors$1.nesting = constructors$1.id = constructors$1.comment = constructors$1.combinator = constructors$1.className = constructors$1.attribute = void 0;
	var _attribute = _interopRequireDefault(/*@__PURE__*/ requireAttribute$1());
	var _className = _interopRequireDefault(/*@__PURE__*/ requireClassName$1());
	var _combinator = _interopRequireDefault(/*@__PURE__*/ requireCombinator$1());
	var _comment = _interopRequireDefault(/*@__PURE__*/ requireComment$1());
	var _id = _interopRequireDefault(/*@__PURE__*/ requireId$1());
	var _nesting = _interopRequireDefault(/*@__PURE__*/ requireNesting$1());
	var _pseudo = _interopRequireDefault(/*@__PURE__*/ requirePseudo$1());
	var _root = _interopRequireDefault(/*@__PURE__*/ requireRoot$1());
	var _selector = _interopRequireDefault(/*@__PURE__*/ requireSelector$1());
	var _string = _interopRequireDefault(/*@__PURE__*/ requireString$1());
	var _tag = _interopRequireDefault(/*@__PURE__*/ requireTag$1());
	var _universal = _interopRequireDefault(/*@__PURE__*/ requireUniversal$1());
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	var attribute = function attribute(opts) {
	  return new _attribute["default"](opts);
	};
	constructors$1.attribute = attribute;
	var className = function className(opts) {
	  return new _className["default"](opts);
	};
	constructors$1.className = className;
	var combinator = function combinator(opts) {
	  return new _combinator["default"](opts);
	};
	constructors$1.combinator = combinator;
	var comment = function comment(opts) {
	  return new _comment["default"](opts);
	};
	constructors$1.comment = comment;
	var id = function id(opts) {
	  return new _id["default"](opts);
	};
	constructors$1.id = id;
	var nesting = function nesting(opts) {
	  return new _nesting["default"](opts);
	};
	constructors$1.nesting = nesting;
	var pseudo = function pseudo(opts) {
	  return new _pseudo["default"](opts);
	};
	constructors$1.pseudo = pseudo;
	var root = function root(opts) {
	  return new _root["default"](opts);
	};
	constructors$1.root = root;
	var selector = function selector(opts) {
	  return new _selector["default"](opts);
	};
	constructors$1.selector = selector;
	var string = function string(opts) {
	  return new _string["default"](opts);
	};
	constructors$1.string = string;
	var tag = function tag(opts) {
	  return new _tag["default"](opts);
	};
	constructors$1.tag = tag;
	var universal = function universal(opts) {
	  return new _universal["default"](opts);
	};
	constructors$1.universal = universal;
	return constructors$1;
}

var guards$1 = {};

var hasRequiredGuards$1;

function requireGuards$1 () {
	if (hasRequiredGuards$1) return guards$1;
	hasRequiredGuards$1 = 1;

	guards$1.__esModule = true;
	guards$1.isComment = guards$1.isCombinator = guards$1.isClassName = guards$1.isAttribute = void 0;
	guards$1.isContainer = isContainer;
	guards$1.isIdentifier = void 0;
	guards$1.isNamespace = isNamespace;
	guards$1.isNesting = void 0;
	guards$1.isNode = isNode;
	guards$1.isPseudo = void 0;
	guards$1.isPseudoClass = isPseudoClass;
	guards$1.isPseudoElement = isPseudoElement;
	guards$1.isUniversal = guards$1.isTag = guards$1.isString = guards$1.isSelector = guards$1.isRoot = void 0;
	var _types = /*@__PURE__*/ requireTypes$1();
	var _IS_TYPE;
	var IS_TYPE = (_IS_TYPE = {}, _IS_TYPE[_types.ATTRIBUTE] = true, _IS_TYPE[_types.CLASS] = true, _IS_TYPE[_types.COMBINATOR] = true, _IS_TYPE[_types.COMMENT] = true, _IS_TYPE[_types.ID] = true, _IS_TYPE[_types.NESTING] = true, _IS_TYPE[_types.PSEUDO] = true, _IS_TYPE[_types.ROOT] = true, _IS_TYPE[_types.SELECTOR] = true, _IS_TYPE[_types.STRING] = true, _IS_TYPE[_types.TAG] = true, _IS_TYPE[_types.UNIVERSAL] = true, _IS_TYPE);
	function isNode(node) {
	  return typeof node === "object" && IS_TYPE[node.type];
	}
	function isNodeType(type, node) {
	  return isNode(node) && node.type === type;
	}
	var isAttribute = isNodeType.bind(null, _types.ATTRIBUTE);
	guards$1.isAttribute = isAttribute;
	var isClassName = isNodeType.bind(null, _types.CLASS);
	guards$1.isClassName = isClassName;
	var isCombinator = isNodeType.bind(null, _types.COMBINATOR);
	guards$1.isCombinator = isCombinator;
	var isComment = isNodeType.bind(null, _types.COMMENT);
	guards$1.isComment = isComment;
	var isIdentifier = isNodeType.bind(null, _types.ID);
	guards$1.isIdentifier = isIdentifier;
	var isNesting = isNodeType.bind(null, _types.NESTING);
	guards$1.isNesting = isNesting;
	var isPseudo = isNodeType.bind(null, _types.PSEUDO);
	guards$1.isPseudo = isPseudo;
	var isRoot = isNodeType.bind(null, _types.ROOT);
	guards$1.isRoot = isRoot;
	var isSelector = isNodeType.bind(null, _types.SELECTOR);
	guards$1.isSelector = isSelector;
	var isString = isNodeType.bind(null, _types.STRING);
	guards$1.isString = isString;
	var isTag = isNodeType.bind(null, _types.TAG);
	guards$1.isTag = isTag;
	var isUniversal = isNodeType.bind(null, _types.UNIVERSAL);
	guards$1.isUniversal = isUniversal;
	function isPseudoElement(node) {
	  return isPseudo(node) && node.value && (node.value.startsWith("::") || node.value.toLowerCase() === ":before" || node.value.toLowerCase() === ":after" || node.value.toLowerCase() === ":first-letter" || node.value.toLowerCase() === ":first-line");
	}
	function isPseudoClass(node) {
	  return isPseudo(node) && !isPseudoElement(node);
	}
	function isContainer(node) {
	  return !!(isNode(node) && node.walk);
	}
	function isNamespace(node) {
	  return isAttribute(node) || isTag(node);
	}
	return guards$1;
}

var hasRequiredSelectors$1;

function requireSelectors$1 () {
	if (hasRequiredSelectors$1) return selectors$1;
	hasRequiredSelectors$1 = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		var _types = /*@__PURE__*/ requireTypes$1();
		Object.keys(_types).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _types[key]) return;
		  exports$1[key] = _types[key];
		});
		var _constructors = /*@__PURE__*/ requireConstructors$1();
		Object.keys(_constructors).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _constructors[key]) return;
		  exports$1[key] = _constructors[key];
		});
		var _guards = /*@__PURE__*/ requireGuards$1();
		Object.keys(_guards).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _guards[key]) return;
		  exports$1[key] = _guards[key];
		}); 
	} (selectors$1));
	return selectors$1;
}

var hasRequiredDist$1;

function requireDist$1 () {
	if (hasRequiredDist$1) return dist$1.exports;
	hasRequiredDist$1 = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _processor = _interopRequireDefault(/*@__PURE__*/ requireProcessor$1());
		var selectors = _interopRequireWildcard(/*@__PURE__*/ requireSelectors$1());
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		var parser = function parser(processor) {
		  return new _processor["default"](processor);
		};
		Object.assign(parser, selectors);
		delete parser.__esModule;
		var _default = parser;
		exports$1["default"] = _default;
		module.exports = exports$1.default; 
	} (dist$1, dist$1.exports));
	return dist$1.exports;
}

var distExports = /*@__PURE__*/ requireDist$1();
var selectorParser = /*@__PURE__*/getDefaultExportFromCjs(distExports);

const animationNameRE = /^(?:-\w+-)?animation-name$/;
const animationRE = /^(?:-\w+-)?animation$/;
const keyframesRE = /^(?:-\w+-)?keyframes$/;
const scopedPlugin = (id = "") => {
  const keyframes = /* @__PURE__ */ Object.create(null);
  const shortId = id.replace(/^data-v-/, "");
  return {
    postcssPlugin: "vue-sfc-scoped",
    Rule(rule) {
      processRule(id, rule);
    },
    AtRule(node) {
      if (keyframesRE.test(node.name) && !node.params.endsWith(`-${shortId}`)) {
        keyframes[node.params] = node.params = node.params + "-" + shortId;
      }
    },
    OnceExit(root) {
      if (Object.keys(keyframes).length) {
        root.walkDecls((decl) => {
          if (animationNameRE.test(decl.prop)) {
            decl.value = decl.value.split(",").map((v) => keyframes[v.trim()] || v.trim()).join(",");
          }
          if (animationRE.test(decl.prop)) {
            decl.value = decl.value.split(",").map((v) => {
              const vals = v.trim().split(/\s+/);
              const i = vals.findIndex((val) => keyframes[val]);
              if (i !== -1) {
                vals.splice(i, 1, keyframes[vals[i]]);
                return vals.join(" ");
              } else {
                return v;
              }
            }).join(",");
          }
        });
      }
    }
  };
};
const processedRules = /* @__PURE__ */ new WeakSet();
function processRule(id, rule) {
  if (processedRules.has(rule) || rule.parent && rule.parent.type === "atrule" && keyframesRE.test(rule.parent.name)) {
    return;
  }
  processedRules.add(rule);
  let deep = false;
  let parent = rule.parent;
  while (parent && parent.type !== "root") {
    if (parent.__deep) {
      deep = true;
      break;
    }
    parent = parent.parent;
  }
  rule.selector = selectorParser((selectorRoot) => {
    selectorRoot.each((selector) => {
      rewriteSelector(id, rule, selector, selectorRoot, deep);
    });
  }).processSync(rule.selector);
}
function rewriteSelector(id, rule, selector, selectorRoot, deep, slotted = false) {
  let node = null;
  let shouldInject = !deep;
  selector.each((n) => {
    if (n.type === "combinator" && (n.value === ">>>" || n.value === "/deep/")) {
      n.value = " ";
      n.spaces.before = n.spaces.after = "";
      warn(
        `the >>> and /deep/ combinators have been deprecated. Use :deep() instead.`
      );
      return false;
    }
    if (n.type === "pseudo") {
      const { value } = n;
      if (value === ":deep" || value === "::v-deep") {
        rule.__deep = true;
        if (n.nodes.length) {
          let last = n;
          n.nodes[0].each((ss) => {
            selector.insertAfter(last, ss);
            last = ss;
          });
          const prev = selector.at(selector.index(n) - 1);
          if (!prev || !isSpaceCombinator(prev)) {
            selector.insertAfter(
              n,
              selectorParser.combinator({
                value: " "
              })
            );
          }
          selector.removeChild(n);
        } else {
          warn(
            `${value} usage as a combinator has been deprecated. Use :deep(<inner-selector>) instead of ${value} <inner-selector>.`
          );
          const prev = selector.at(selector.index(n) - 1);
          if (prev && isSpaceCombinator(prev)) {
            selector.removeChild(prev);
          }
          selector.removeChild(n);
        }
        return false;
      }
      if (value === ":slotted" || value === "::v-slotted") {
        rewriteSelector(
          id,
          rule,
          n.nodes[0],
          selectorRoot,
          deep,
          true
        );
        let last = n;
        n.nodes[0].each((ss) => {
          selector.insertAfter(last, ss);
          last = ss;
        });
        selector.removeChild(n);
        shouldInject = false;
        return false;
      }
      if (value === ":global" || value === "::v-global") {
        selector.replaceWith(n.nodes[0]);
        return false;
      }
    }
    if (n.type === "universal") {
      const prev = selector.at(selector.index(n) - 1);
      const next = selector.at(selector.index(n) + 1);
      if (!prev) {
        if (next) {
          if (next.type === "combinator" && next.value === " ") {
            selector.removeChild(next);
          }
          selector.removeChild(n);
          return;
        } else {
          node = selectorParser.combinator({
            value: ""
          });
          selector.insertBefore(n, node);
          selector.removeChild(n);
          return false;
        }
      }
      if (node) return;
    }
    if (n.type !== "pseudo" && n.type !== "combinator" || n.type === "pseudo" && (n.value === ":is" || n.value === ":where") && !node) {
      node = n;
    }
  });
  if (rule.nodes.some((node2) => node2.type === "rule")) {
    const deep2 = rule.__deep;
    if (!deep2) {
      extractAndWrapNodes(rule);
      const atruleNodes = rule.nodes.filter((node2) => node2.type === "atrule");
      for (const atnode of atruleNodes) {
        extractAndWrapNodes(atnode);
      }
    }
    shouldInject = deep2;
  }
  if (node) {
    const { type, value } = node;
    if (type === "pseudo" && (value === ":is" || value === ":where")) {
      node.nodes.forEach(
        (value2) => rewriteSelector(id, rule, value2, selectorRoot, deep, slotted)
      );
      shouldInject = false;
    }
  }
  if (node) {
    node.spaces.after = "";
  } else {
    selector.first.spaces.before = "";
  }
  if (shouldInject) {
    const idToAdd = slotted ? id + "-s" : id;
    selector.insertAfter(
      // If node is null it means we need to inject [id] at the start
      // insertAfter can handle `null` here
      node,
      selectorParser.attribute({
        attribute: idToAdd,
        value: idToAdd,
        raws: {},
        quoteMark: `"`
      })
    );
  }
}
function isSpaceCombinator(node) {
  return node.type === "combinator" && /^\s+$/.test(node.value);
}
function extractAndWrapNodes(parentNode) {
  if (!parentNode.nodes) return;
  const nodes = parentNode.nodes.filter(
    (node) => node.type === "decl" || node.type === "comment"
  );
  if (nodes.length) {
    for (const node of nodes) {
      parentNode.removeChild(node);
    }
    const wrappedRule = new require$$0$1.Rule({
      nodes,
      selector: "&"
    });
    parentNode.prepend(wrappedRule);
  }
}
scopedPlugin.postcss = true;

var sourceMap = {};

var sourceMapGenerator = {};

var base64Vlq = {};

var base64 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBase64;

function requireBase64 () {
	if (hasRequiredBase64) return base64;
	hasRequiredBase64 = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

	/**
	 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
	 */
	base64.encode = function (number) {
	  if (0 <= number && number < intToCharMap.length) {
	    return intToCharMap[number];
	  }
	  throw new TypeError("Must be between 0 and 63: " + number);
	};

	/**
	 * Decode a single base 64 character code digit to an integer. Returns -1 on
	 * failure.
	 */
	base64.decode = function (charCode) {
	  var bigA = 65;     // 'A'
	  var bigZ = 90;     // 'Z'

	  var littleA = 97;  // 'a'
	  var littleZ = 122; // 'z'

	  var zero = 48;     // '0'
	  var nine = 57;     // '9'

	  var plus = 43;     // '+'
	  var slash = 47;    // '/'

	  var littleOffset = 26;
	  var numberOffset = 52;

	  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
	  if (bigA <= charCode && charCode <= bigZ) {
	    return (charCode - bigA);
	  }

	  // 26 - 51: abcdefghijklmnopqrstuvwxyz
	  if (littleA <= charCode && charCode <= littleZ) {
	    return (charCode - littleA + littleOffset);
	  }

	  // 52 - 61: 0123456789
	  if (zero <= charCode && charCode <= nine) {
	    return (charCode - zero + numberOffset);
	  }

	  // 62: +
	  if (charCode == plus) {
	    return 62;
	  }

	  // 63: /
	  if (charCode == slash) {
	    return 63;
	  }

	  // Invalid base64 digit.
	  return -1;
	};
	return base64;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBase64Vlq;

function requireBase64Vlq () {
	if (hasRequiredBase64Vlq) return base64Vlq;
	hasRequiredBase64Vlq = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 *
	 * Based on the Base 64 VLQ implementation in Closure Compiler:
	 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
	 *
	 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
	 * Redistribution and use in source and binary forms, with or without
	 * modification, are permitted provided that the following conditions are
	 * met:
	 *
	 *  * Redistributions of source code must retain the above copyright
	 *    notice, this list of conditions and the following disclaimer.
	 *  * Redistributions in binary form must reproduce the above
	 *    copyright notice, this list of conditions and the following
	 *    disclaimer in the documentation and/or other materials provided
	 *    with the distribution.
	 *  * Neither the name of Google Inc. nor the names of its
	 *    contributors may be used to endorse or promote products derived
	 *    from this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	var base64 = /*@__PURE__*/ requireBase64();

	// A single base 64 digit can contain 6 bits of data. For the base 64 variable
	// length quantities we use in the source map spec, the first bit is the sign,
	// the next four bits are the actual value, and the 6th bit is the
	// continuation bit. The continuation bit tells us whether there are more
	// digits in this value following this digit.
	//
	//   Continuation
	//   |    Sign
	//   |    |
	//   V    V
	//   101011

	var VLQ_BASE_SHIFT = 5;

	// binary: 100000
	var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

	// binary: 011111
	var VLQ_BASE_MASK = VLQ_BASE - 1;

	// binary: 100000
	var VLQ_CONTINUATION_BIT = VLQ_BASE;

	/**
	 * Converts from a two-complement value to a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
	 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
	 */
	function toVLQSigned(aValue) {
	  return aValue < 0
	    ? ((-aValue) << 1) + 1
	    : (aValue << 1) + 0;
	}

	/**
	 * Converts to a two-complement value from a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
	 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
	 */
	function fromVLQSigned(aValue) {
	  var isNegative = (aValue & 1) === 1;
	  var shifted = aValue >> 1;
	  return isNegative
	    ? -shifted
	    : shifted;
	}

	/**
	 * Returns the base 64 VLQ encoded value.
	 */
	base64Vlq.encode = function base64VLQ_encode(aValue) {
	  var encoded = "";
	  var digit;

	  var vlq = toVLQSigned(aValue);

	  do {
	    digit = vlq & VLQ_BASE_MASK;
	    vlq >>>= VLQ_BASE_SHIFT;
	    if (vlq > 0) {
	      // There are still more digits in this value, so we must make sure the
	      // continuation bit is marked.
	      digit |= VLQ_CONTINUATION_BIT;
	    }
	    encoded += base64.encode(digit);
	  } while (vlq > 0);

	  return encoded;
	};

	/**
	 * Decodes the next base 64 VLQ value from the given string and returns the
	 * value and the rest of the string via the out parameter.
	 */
	base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
	  var strLen = aStr.length;
	  var result = 0;
	  var shift = 0;
	  var continuation, digit;

	  do {
	    if (aIndex >= strLen) {
	      throw new Error("Expected more digits in base 64 VLQ value.");
	    }

	    digit = base64.decode(aStr.charCodeAt(aIndex++));
	    if (digit === -1) {
	      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
	    }

	    continuation = !!(digit & VLQ_CONTINUATION_BIT);
	    digit &= VLQ_BASE_MASK;
	    result = result + (digit << shift);
	    shift += VLQ_BASE_SHIFT;
	  } while (continuation);

	  aOutParam.value = fromVLQSigned(result);
	  aOutParam.rest = aIndex;
	};
	return base64Vlq;
}

var util$1 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredUtil$1;

function requireUtil$1 () {
	if (hasRequiredUtil$1) return util$1;
	hasRequiredUtil$1 = 1;
	(function (exports$1) {
		/*
		 * Copyright 2011 Mozilla Foundation and contributors
		 * Licensed under the New BSD license. See LICENSE or:
		 * http://opensource.org/licenses/BSD-3-Clause
		 */

		/**
		 * This is a helper function for getting values from parameter/options
		 * objects.
		 *
		 * @param args The object we are extracting values from
		 * @param name The name of the property we are getting.
		 * @param defaultValue An optional value to return if the property is missing
		 * from the object. If this is not specified and the property is missing, an
		 * error will be thrown.
		 */
		function getArg(aArgs, aName, aDefaultValue) {
		  if (aName in aArgs) {
		    return aArgs[aName];
		  } else if (arguments.length === 3) {
		    return aDefaultValue;
		  } else {
		    throw new Error('"' + aName + '" is a required argument.');
		  }
		}
		exports$1.getArg = getArg;

		var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
		var dataUrlRegexp = /^data:.+\,.+$/;

		function urlParse(aUrl) {
		  var match = aUrl.match(urlRegexp);
		  if (!match) {
		    return null;
		  }
		  return {
		    scheme: match[1],
		    auth: match[2],
		    host: match[3],
		    port: match[4],
		    path: match[5]
		  };
		}
		exports$1.urlParse = urlParse;

		function urlGenerate(aParsedUrl) {
		  var url = '';
		  if (aParsedUrl.scheme) {
		    url += aParsedUrl.scheme + ':';
		  }
		  url += '//';
		  if (aParsedUrl.auth) {
		    url += aParsedUrl.auth + '@';
		  }
		  if (aParsedUrl.host) {
		    url += aParsedUrl.host;
		  }
		  if (aParsedUrl.port) {
		    url += ":" + aParsedUrl.port;
		  }
		  if (aParsedUrl.path) {
		    url += aParsedUrl.path;
		  }
		  return url;
		}
		exports$1.urlGenerate = urlGenerate;

		/**
		 * Normalizes a path, or the path portion of a URL:
		 *
		 * - Replaces consecutive slashes with one slash.
		 * - Removes unnecessary '.' parts.
		 * - Removes unnecessary '<dir>/..' parts.
		 *
		 * Based on code in the Node.js 'path' core module.
		 *
		 * @param aPath The path or url to normalize.
		 */
		function normalize(aPath) {
		  var path = aPath;
		  var url = urlParse(aPath);
		  if (url) {
		    if (!url.path) {
		      return aPath;
		    }
		    path = url.path;
		  }
		  var isAbsolute = exports$1.isAbsolute(path);

		  var parts = path.split(/\/+/);
		  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
		    part = parts[i];
		    if (part === '.') {
		      parts.splice(i, 1);
		    } else if (part === '..') {
		      up++;
		    } else if (up > 0) {
		      if (part === '') {
		        // The first part is blank if the path is absolute. Trying to go
		        // above the root is a no-op. Therefore we can remove all '..' parts
		        // directly after the root.
		        parts.splice(i + 1, up);
		        up = 0;
		      } else {
		        parts.splice(i, 2);
		        up--;
		      }
		    }
		  }
		  path = parts.join('/');

		  if (path === '') {
		    path = isAbsolute ? '/' : '.';
		  }

		  if (url) {
		    url.path = path;
		    return urlGenerate(url);
		  }
		  return path;
		}
		exports$1.normalize = normalize;

		/**
		 * Joins two paths/URLs.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be joined with the root.
		 *
		 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
		 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
		 *   first.
		 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
		 *   is updated with the result and aRoot is returned. Otherwise the result
		 *   is returned.
		 *   - If aPath is absolute, the result is aPath.
		 *   - Otherwise the two paths are joined with a slash.
		 * - Joining for example 'http://' and 'www.example.com' is also supported.
		 */
		function join(aRoot, aPath) {
		  if (aRoot === "") {
		    aRoot = ".";
		  }
		  if (aPath === "") {
		    aPath = ".";
		  }
		  var aPathUrl = urlParse(aPath);
		  var aRootUrl = urlParse(aRoot);
		  if (aRootUrl) {
		    aRoot = aRootUrl.path || '/';
		  }

		  // `join(foo, '//www.example.org')`
		  if (aPathUrl && !aPathUrl.scheme) {
		    if (aRootUrl) {
		      aPathUrl.scheme = aRootUrl.scheme;
		    }
		    return urlGenerate(aPathUrl);
		  }

		  if (aPathUrl || aPath.match(dataUrlRegexp)) {
		    return aPath;
		  }

		  // `join('http://', 'www.example.com')`
		  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
		    aRootUrl.host = aPath;
		    return urlGenerate(aRootUrl);
		  }

		  var joined = aPath.charAt(0) === '/'
		    ? aPath
		    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

		  if (aRootUrl) {
		    aRootUrl.path = joined;
		    return urlGenerate(aRootUrl);
		  }
		  return joined;
		}
		exports$1.join = join;

		exports$1.isAbsolute = function (aPath) {
		  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
		};

		/**
		 * Make a path relative to a URL or another path.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be made relative to aRoot.
		 */
		function relative(aRoot, aPath) {
		  if (aRoot === "") {
		    aRoot = ".";
		  }

		  aRoot = aRoot.replace(/\/$/, '');

		  // It is possible for the path to be above the root. In this case, simply
		  // checking whether the root is a prefix of the path won't work. Instead, we
		  // need to remove components from the root one by one, until either we find
		  // a prefix that fits, or we run out of components to remove.
		  var level = 0;
		  while (aPath.indexOf(aRoot + '/') !== 0) {
		    var index = aRoot.lastIndexOf("/");
		    if (index < 0) {
		      return aPath;
		    }

		    // If the only part of the root that is left is the scheme (i.e. http://,
		    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
		    // have exhausted all components, so the path is not relative to the root.
		    aRoot = aRoot.slice(0, index);
		    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
		      return aPath;
		    }

		    ++level;
		  }

		  // Make sure we add a "../" for each component we removed from the root.
		  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
		}
		exports$1.relative = relative;

		var supportsNullProto = (function () {
		  var obj = Object.create(null);
		  return !('__proto__' in obj);
		}());

		function identity (s) {
		  return s;
		}

		/**
		 * Because behavior goes wacky when you set `__proto__` on objects, we
		 * have to prefix all the strings in our set with an arbitrary character.
		 *
		 * See https://github.com/mozilla/source-map/pull/31 and
		 * https://github.com/mozilla/source-map/issues/30
		 *
		 * @param String aStr
		 */
		function toSetString(aStr) {
		  if (isProtoString(aStr)) {
		    return '$' + aStr;
		  }

		  return aStr;
		}
		exports$1.toSetString = supportsNullProto ? identity : toSetString;

		function fromSetString(aStr) {
		  if (isProtoString(aStr)) {
		    return aStr.slice(1);
		  }

		  return aStr;
		}
		exports$1.fromSetString = supportsNullProto ? identity : fromSetString;

		function isProtoString(s) {
		  if (!s) {
		    return false;
		  }

		  var length = s.length;

		  if (length < 9 /* "__proto__".length */) {
		    return false;
		  }

		  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
		      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
		      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
		      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
		      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
		      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 9) !== 95  /* '_' */) {
		    return false;
		  }

		  for (var i = length - 10; i >= 0; i--) {
		    if (s.charCodeAt(i) !== 36 /* '$' */) {
		      return false;
		    }
		  }

		  return true;
		}

		/**
		 * Comparator between two mappings where the original positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same original source/line/column, but different generated
		 * line and column the same. Useful when searching for a mapping with a
		 * stubbed out mapping.
		 */
		function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
		  var cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0 || onlyCompareOriginal) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByOriginalPositions = compareByOriginalPositions;

		/**
		 * Comparator between two mappings with deflated source and name indices where
		 * the generated positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same generated line and column, but different
		 * source/name/original line and column the same. Useful when searching for a
		 * mapping with a stubbed out mapping.
		 */
		function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
		  var cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0 || onlyCompareGenerated) {
		    return cmp;
		  }

		  cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

		function strcmp(aStr1, aStr2) {
		  if (aStr1 === aStr2) {
		    return 0;
		  }

		  if (aStr1 === null) {
		    return 1; // aStr2 !== null
		  }

		  if (aStr2 === null) {
		    return -1; // aStr1 !== null
		  }

		  if (aStr1 > aStr2) {
		    return 1;
		  }

		  return -1;
		}

		/**
		 * Comparator between two mappings with inflated source and name strings where
		 * the generated positions are compared.
		 */
		function compareByGeneratedPositionsInflated(mappingA, mappingB) {
		  var cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

		/**
		 * Strip any JSON XSSI avoidance prefix from the string (as documented
		 * in the source maps specification), and then parse the string as
		 * JSON.
		 */
		function parseSourceMapInput(str) {
		  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
		}
		exports$1.parseSourceMapInput = parseSourceMapInput;

		/**
		 * Compute the URL of a source given the the source root, the source's
		 * URL, and the source map's URL.
		 */
		function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
		  sourceURL = sourceURL || '';

		  if (sourceRoot) {
		    // This follows what Chrome does.
		    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
		      sourceRoot += '/';
		    }
		    // The spec says:
		    //   Line 4: An optional source root, useful for relocating source
		    //   files on a server or removing repeated values in the
		    //   “sources” entry.  This value is prepended to the individual
		    //   entries in the “source” field.
		    sourceURL = sourceRoot + sourceURL;
		  }

		  // Historically, SourceMapConsumer did not take the sourceMapURL as
		  // a parameter.  This mode is still somewhat supported, which is why
		  // this code block is conditional.  However, it's preferable to pass
		  // the source map URL to SourceMapConsumer, so that this function
		  // can implement the source URL resolution algorithm as outlined in
		  // the spec.  This block is basically the equivalent of:
		  //    new URL(sourceURL, sourceMapURL).toString()
		  // ... except it avoids using URL, which wasn't available in the
		  // older releases of node still supported by this library.
		  //
		  // The spec says:
		  //   If the sources are not absolute URLs after prepending of the
		  //   “sourceRoot”, the sources are resolved relative to the
		  //   SourceMap (like resolving script src in a html document).
		  if (sourceMapURL) {
		    var parsed = urlParse(sourceMapURL);
		    if (!parsed) {
		      throw new Error("sourceMapURL could not be parsed");
		    }
		    if (parsed.path) {
		      // Strip the last path component, but keep the "/".
		      var index = parsed.path.lastIndexOf('/');
		      if (index >= 0) {
		        parsed.path = parsed.path.substring(0, index + 1);
		      }
		    }
		    sourceURL = join(urlGenerate(parsed), sourceURL);
		  }

		  return normalize(sourceURL);
		}
		exports$1.computeSourceURL = computeSourceURL; 
	} (util$1));
	return util$1;
}

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredArraySet;

function requireArraySet () {
	if (hasRequiredArraySet) return arraySet;
	hasRequiredArraySet = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = /*@__PURE__*/ requireUtil$1();
	var has = Object.prototype.hasOwnProperty;
	var hasNativeMap = typeof Map !== "undefined";

	/**
	 * A data structure which is a combination of an array and a set. Adding a new
	 * member is O(1), testing for membership is O(1), and finding the index of an
	 * element is O(1). Removing elements from the set is not supported. Only
	 * strings are supported for membership.
	 */
	function ArraySet() {
	  this._array = [];
	  this._set = hasNativeMap ? new Map() : Object.create(null);
	}

	/**
	 * Static method for creating ArraySet instances from an existing array.
	 */
	ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
	  var set = new ArraySet();
	  for (var i = 0, len = aArray.length; i < len; i++) {
	    set.add(aArray[i], aAllowDuplicates);
	  }
	  return set;
	};

	/**
	 * Return how many unique items are in this ArraySet. If duplicates have been
	 * added, than those do not count towards the size.
	 *
	 * @returns Number
	 */
	ArraySet.prototype.size = function ArraySet_size() {
	  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
	};

	/**
	 * Add the given string to this set.
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
	  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
	  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
	  var idx = this._array.length;
	  if (!isDuplicate || aAllowDuplicates) {
	    this._array.push(aStr);
	  }
	  if (!isDuplicate) {
	    if (hasNativeMap) {
	      this._set.set(aStr, idx);
	    } else {
	      this._set[sStr] = idx;
	    }
	  }
	};

	/**
	 * Is the given string a member of this set?
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.has = function ArraySet_has(aStr) {
	  if (hasNativeMap) {
	    return this._set.has(aStr);
	  } else {
	    var sStr = util.toSetString(aStr);
	    return has.call(this._set, sStr);
	  }
	};

	/**
	 * What is the index of the given string in the array?
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
	  if (hasNativeMap) {
	    var idx = this._set.get(aStr);
	    if (idx >= 0) {
	        return idx;
	    }
	  } else {
	    var sStr = util.toSetString(aStr);
	    if (has.call(this._set, sStr)) {
	      return this._set[sStr];
	    }
	  }

	  throw new Error('"' + aStr + '" is not in the set.');
	};

	/**
	 * What is the element at the given index?
	 *
	 * @param Number aIdx
	 */
	ArraySet.prototype.at = function ArraySet_at(aIdx) {
	  if (aIdx >= 0 && aIdx < this._array.length) {
	    return this._array[aIdx];
	  }
	  throw new Error('No element indexed by ' + aIdx);
	};

	/**
	 * Returns the array representation of this set (which has the proper indices
	 * indicated by indexOf). Note that this is a copy of the internal array used
	 * for storing the members so that no one can mess with internal state.
	 */
	ArraySet.prototype.toArray = function ArraySet_toArray() {
	  return this._array.slice();
	};

	arraySet.ArraySet = ArraySet;
	return arraySet;
}

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredMappingList;

function requireMappingList () {
	if (hasRequiredMappingList) return mappingList;
	hasRequiredMappingList = 1;
	/*
	 * Copyright 2014 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = /*@__PURE__*/ requireUtil$1();

	/**
	 * Determine whether mappingB is after mappingA with respect to generated
	 * position.
	 */
	function generatedPositionAfter(mappingA, mappingB) {
	  // Optimized for most common case
	  var lineA = mappingA.generatedLine;
	  var lineB = mappingB.generatedLine;
	  var columnA = mappingA.generatedColumn;
	  var columnB = mappingB.generatedColumn;
	  return lineB > lineA || lineB == lineA && columnB >= columnA ||
	         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
	}

	/**
	 * A data structure to provide a sorted view of accumulated mappings in a
	 * performance conscious manner. It trades a neglibable overhead in general
	 * case for a large speedup in case of mappings being added in order.
	 */
	function MappingList() {
	  this._array = [];
	  this._sorted = true;
	  // Serves as infimum
	  this._last = {generatedLine: -1, generatedColumn: 0};
	}

	/**
	 * Iterate through internal items. This method takes the same arguments that
	 * `Array.prototype.forEach` takes.
	 *
	 * NOTE: The order of the mappings is NOT guaranteed.
	 */
	MappingList.prototype.unsortedForEach =
	  function MappingList_forEach(aCallback, aThisArg) {
	    this._array.forEach(aCallback, aThisArg);
	  };

	/**
	 * Add the given source mapping.
	 *
	 * @param Object aMapping
	 */
	MappingList.prototype.add = function MappingList_add(aMapping) {
	  if (generatedPositionAfter(this._last, aMapping)) {
	    this._last = aMapping;
	    this._array.push(aMapping);
	  } else {
	    this._sorted = false;
	    this._array.push(aMapping);
	  }
	};

	/**
	 * Returns the flat, sorted array of mappings. The mappings are sorted by
	 * generated position.
	 *
	 * WARNING: This method returns internal data without copying, for
	 * performance. The return value must NOT be mutated, and should be treated as
	 * an immutable borrow. If you want to take ownership, you must make your own
	 * copy.
	 */
	MappingList.prototype.toArray = function MappingList_toArray() {
	  if (!this._sorted) {
	    this._array.sort(util.compareByGeneratedPositionsInflated);
	    this._sorted = true;
	  }
	  return this._array;
	};

	mappingList.MappingList = MappingList;
	return mappingList;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceMapGenerator;

function requireSourceMapGenerator () {
	if (hasRequiredSourceMapGenerator) return sourceMapGenerator;
	hasRequiredSourceMapGenerator = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var base64VLQ = /*@__PURE__*/ requireBase64Vlq();
	var util = /*@__PURE__*/ requireUtil$1();
	var ArraySet = /*@__PURE__*/ requireArraySet().ArraySet;
	var MappingList = /*@__PURE__*/ requireMappingList().MappingList;

	/**
	 * An instance of the SourceMapGenerator represents a source map which is
	 * being built incrementally. You may pass an object with the following
	 * properties:
	 *
	 *   - file: The filename of the generated source.
	 *   - sourceRoot: A root for all relative URLs in this source map.
	 */
	function SourceMapGenerator(aArgs) {
	  if (!aArgs) {
	    aArgs = {};
	  }
	  this._file = util.getArg(aArgs, 'file', null);
	  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
	  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
	  this._sources = new ArraySet();
	  this._names = new ArraySet();
	  this._mappings = new MappingList();
	  this._sourcesContents = null;
	}

	SourceMapGenerator.prototype._version = 3;

	/**
	 * Creates a new SourceMapGenerator based on a SourceMapConsumer
	 *
	 * @param aSourceMapConsumer The SourceMap.
	 */
	SourceMapGenerator.fromSourceMap =
	  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
	    var sourceRoot = aSourceMapConsumer.sourceRoot;
	    var generator = new SourceMapGenerator({
	      file: aSourceMapConsumer.file,
	      sourceRoot: sourceRoot
	    });
	    aSourceMapConsumer.eachMapping(function (mapping) {
	      var newMapping = {
	        generated: {
	          line: mapping.generatedLine,
	          column: mapping.generatedColumn
	        }
	      };

	      if (mapping.source != null) {
	        newMapping.source = mapping.source;
	        if (sourceRoot != null) {
	          newMapping.source = util.relative(sourceRoot, newMapping.source);
	        }

	        newMapping.original = {
	          line: mapping.originalLine,
	          column: mapping.originalColumn
	        };

	        if (mapping.name != null) {
	          newMapping.name = mapping.name;
	        }
	      }

	      generator.addMapping(newMapping);
	    });
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var sourceRelative = sourceFile;
	      if (sourceRoot !== null) {
	        sourceRelative = util.relative(sourceRoot, sourceFile);
	      }

	      if (!generator._sources.has(sourceRelative)) {
	        generator._sources.add(sourceRelative);
	      }

	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        generator.setSourceContent(sourceFile, content);
	      }
	    });
	    return generator;
	  };

	/**
	 * Add a single mapping from original source line and column to the generated
	 * source's line and column for this source map being created. The mapping
	 * object should have the following properties:
	 *
	 *   - generated: An object with the generated line and column positions.
	 *   - original: An object with the original line and column positions.
	 *   - source: The original source file (relative to the sourceRoot).
	 *   - name: An optional original token name for this mapping.
	 */
	SourceMapGenerator.prototype.addMapping =
	  function SourceMapGenerator_addMapping(aArgs) {
	    var generated = util.getArg(aArgs, 'generated');
	    var original = util.getArg(aArgs, 'original', null);
	    var source = util.getArg(aArgs, 'source', null);
	    var name = util.getArg(aArgs, 'name', null);

	    if (!this._skipValidation) {
	      this._validateMapping(generated, original, source, name);
	    }

	    if (source != null) {
	      source = String(source);
	      if (!this._sources.has(source)) {
	        this._sources.add(source);
	      }
	    }

	    if (name != null) {
	      name = String(name);
	      if (!this._names.has(name)) {
	        this._names.add(name);
	      }
	    }

	    this._mappings.add({
	      generatedLine: generated.line,
	      generatedColumn: generated.column,
	      originalLine: original != null && original.line,
	      originalColumn: original != null && original.column,
	      source: source,
	      name: name
	    });
	  };

	/**
	 * Set the source content for a source file.
	 */
	SourceMapGenerator.prototype.setSourceContent =
	  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
	    var source = aSourceFile;
	    if (this._sourceRoot != null) {
	      source = util.relative(this._sourceRoot, source);
	    }

	    if (aSourceContent != null) {
	      // Add the source content to the _sourcesContents map.
	      // Create a new _sourcesContents map if the property is null.
	      if (!this._sourcesContents) {
	        this._sourcesContents = Object.create(null);
	      }
	      this._sourcesContents[util.toSetString(source)] = aSourceContent;
	    } else if (this._sourcesContents) {
	      // Remove the source file from the _sourcesContents map.
	      // If the _sourcesContents map is empty, set the property to null.
	      delete this._sourcesContents[util.toSetString(source)];
	      if (Object.keys(this._sourcesContents).length === 0) {
	        this._sourcesContents = null;
	      }
	    }
	  };

	/**
	 * Applies the mappings of a sub-source-map for a specific source file to the
	 * source map being generated. Each mapping to the supplied source file is
	 * rewritten using the supplied source map. Note: The resolution for the
	 * resulting mappings is the minimium of this map and the supplied map.
	 *
	 * @param aSourceMapConsumer The source map to be applied.
	 * @param aSourceFile Optional. The filename of the source file.
	 *        If omitted, SourceMapConsumer's file property will be used.
	 * @param aSourceMapPath Optional. The dirname of the path to the source map
	 *        to be applied. If relative, it is relative to the SourceMapConsumer.
	 *        This parameter is needed when the two source maps aren't in the same
	 *        directory, and the source map to be applied contains relative source
	 *        paths. If so, those relative source paths need to be rewritten
	 *        relative to the SourceMapGenerator.
	 */
	SourceMapGenerator.prototype.applySourceMap =
	  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
	    var sourceFile = aSourceFile;
	    // If aSourceFile is omitted, we will use the file property of the SourceMap
	    if (aSourceFile == null) {
	      if (aSourceMapConsumer.file == null) {
	        throw new Error(
	          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
	          'or the source map\'s "file" property. Both were omitted.'
	        );
	      }
	      sourceFile = aSourceMapConsumer.file;
	    }
	    var sourceRoot = this._sourceRoot;
	    // Make "sourceFile" relative if an absolute Url is passed.
	    if (sourceRoot != null) {
	      sourceFile = util.relative(sourceRoot, sourceFile);
	    }
	    // Applying the SourceMap can add and remove items from the sources and
	    // the names array.
	    var newSources = new ArraySet();
	    var newNames = new ArraySet();

	    // Find mappings for the "sourceFile"
	    this._mappings.unsortedForEach(function (mapping) {
	      if (mapping.source === sourceFile && mapping.originalLine != null) {
	        // Check if it can be mapped by the source map, then update the mapping.
	        var original = aSourceMapConsumer.originalPositionFor({
	          line: mapping.originalLine,
	          column: mapping.originalColumn
	        });
	        if (original.source != null) {
	          // Copy mapping
	          mapping.source = original.source;
	          if (aSourceMapPath != null) {
	            mapping.source = util.join(aSourceMapPath, mapping.source);
	          }
	          if (sourceRoot != null) {
	            mapping.source = util.relative(sourceRoot, mapping.source);
	          }
	          mapping.originalLine = original.line;
	          mapping.originalColumn = original.column;
	          if (original.name != null) {
	            mapping.name = original.name;
	          }
	        }
	      }

	      var source = mapping.source;
	      if (source != null && !newSources.has(source)) {
	        newSources.add(source);
	      }

	      var name = mapping.name;
	      if (name != null && !newNames.has(name)) {
	        newNames.add(name);
	      }

	    }, this);
	    this._sources = newSources;
	    this._names = newNames;

	    // Copy sourcesContents of applied map.
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        if (aSourceMapPath != null) {
	          sourceFile = util.join(aSourceMapPath, sourceFile);
	        }
	        if (sourceRoot != null) {
	          sourceFile = util.relative(sourceRoot, sourceFile);
	        }
	        this.setSourceContent(sourceFile, content);
	      }
	    }, this);
	  };

	/**
	 * A mapping can have one of the three levels of data:
	 *
	 *   1. Just the generated position.
	 *   2. The Generated position, original position, and original source.
	 *   3. Generated and original position, original source, as well as a name
	 *      token.
	 *
	 * To maintain consistency, we validate that any new mapping being added falls
	 * in to one of these categories.
	 */
	SourceMapGenerator.prototype._validateMapping =
	  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
	                                              aName) {
	    // When aOriginal is truthy but has empty values for .line and .column,
	    // it is most likely a programmer error. In this case we throw a very
	    // specific error message to try to guide them the right way.
	    // For example: https://github.com/Polymer/polymer-bundler/pull/519
	    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
	        throw new Error(
	            'original.line and original.column are not numbers -- you probably meant to omit ' +
	            'the original mapping entirely and only map the generated position. If so, pass ' +
	            'null for the original mapping instead of an object with empty or null values.'
	        );
	    }

	    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
	        && aGenerated.line > 0 && aGenerated.column >= 0
	        && !aOriginal && !aSource && !aName) {
	      // Case 1.
	      return;
	    }
	    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
	             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
	             && aGenerated.line > 0 && aGenerated.column >= 0
	             && aOriginal.line > 0 && aOriginal.column >= 0
	             && aSource) {
	      // Cases 2 and 3.
	      return;
	    }
	    else {
	      throw new Error('Invalid mapping: ' + JSON.stringify({
	        generated: aGenerated,
	        source: aSource,
	        original: aOriginal,
	        name: aName
	      }));
	    }
	  };

	/**
	 * Serialize the accumulated mappings in to the stream of base 64 VLQs
	 * specified by the source map format.
	 */
	SourceMapGenerator.prototype._serializeMappings =
	  function SourceMapGenerator_serializeMappings() {
	    var previousGeneratedColumn = 0;
	    var previousGeneratedLine = 1;
	    var previousOriginalColumn = 0;
	    var previousOriginalLine = 0;
	    var previousName = 0;
	    var previousSource = 0;
	    var result = '';
	    var next;
	    var mapping;
	    var nameIdx;
	    var sourceIdx;

	    var mappings = this._mappings.toArray();
	    for (var i = 0, len = mappings.length; i < len; i++) {
	      mapping = mappings[i];
	      next = '';

	      if (mapping.generatedLine !== previousGeneratedLine) {
	        previousGeneratedColumn = 0;
	        while (mapping.generatedLine !== previousGeneratedLine) {
	          next += ';';
	          previousGeneratedLine++;
	        }
	      }
	      else {
	        if (i > 0) {
	          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
	            continue;
	          }
	          next += ',';
	        }
	      }

	      next += base64VLQ.encode(mapping.generatedColumn
	                                 - previousGeneratedColumn);
	      previousGeneratedColumn = mapping.generatedColumn;

	      if (mapping.source != null) {
	        sourceIdx = this._sources.indexOf(mapping.source);
	        next += base64VLQ.encode(sourceIdx - previousSource);
	        previousSource = sourceIdx;

	        // lines are stored 0-based in SourceMap spec version 3
	        next += base64VLQ.encode(mapping.originalLine - 1
	                                   - previousOriginalLine);
	        previousOriginalLine = mapping.originalLine - 1;

	        next += base64VLQ.encode(mapping.originalColumn
	                                   - previousOriginalColumn);
	        previousOriginalColumn = mapping.originalColumn;

	        if (mapping.name != null) {
	          nameIdx = this._names.indexOf(mapping.name);
	          next += base64VLQ.encode(nameIdx - previousName);
	          previousName = nameIdx;
	        }
	      }

	      result += next;
	    }

	    return result;
	  };

	SourceMapGenerator.prototype._generateSourcesContent =
	  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
	    return aSources.map(function (source) {
	      if (!this._sourcesContents) {
	        return null;
	      }
	      if (aSourceRoot != null) {
	        source = util.relative(aSourceRoot, source);
	      }
	      var key = util.toSetString(source);
	      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
	        ? this._sourcesContents[key]
	        : null;
	    }, this);
	  };

	/**
	 * Externalize the source map.
	 */
	SourceMapGenerator.prototype.toJSON =
	  function SourceMapGenerator_toJSON() {
	    var map = {
	      version: this._version,
	      sources: this._sources.toArray(),
	      names: this._names.toArray(),
	      mappings: this._serializeMappings()
	    };
	    if (this._file != null) {
	      map.file = this._file;
	    }
	    if (this._sourceRoot != null) {
	      map.sourceRoot = this._sourceRoot;
	    }
	    if (this._sourcesContents) {
	      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
	    }

	    return map;
	  };

	/**
	 * Render the source map being generated to a string.
	 */
	SourceMapGenerator.prototype.toString =
	  function SourceMapGenerator_toString() {
	    return JSON.stringify(this.toJSON());
	  };

	sourceMapGenerator.SourceMapGenerator = SourceMapGenerator;
	return sourceMapGenerator;
}

var sourceMapConsumer = {};

var binarySearch = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBinarySearch;

function requireBinarySearch () {
	if (hasRequiredBinarySearch) return binarySearch;
	hasRequiredBinarySearch = 1;
	(function (exports$1) {
		/*
		 * Copyright 2011 Mozilla Foundation and contributors
		 * Licensed under the New BSD license. See LICENSE or:
		 * http://opensource.org/licenses/BSD-3-Clause
		 */

		exports$1.GREATEST_LOWER_BOUND = 1;
		exports$1.LEAST_UPPER_BOUND = 2;

		/**
		 * Recursive implementation of binary search.
		 *
		 * @param aLow Indices here and lower do not contain the needle.
		 * @param aHigh Indices here and higher do not contain the needle.
		 * @param aNeedle The element being searched for.
		 * @param aHaystack The non-empty array being searched.
		 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
		 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
		 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
		 *     closest element that is smaller than or greater than the one we are
		 *     searching for, respectively, if the exact element cannot be found.
		 */
		function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
		  // This function terminates when one of the following is true:
		  //
		  //   1. We find the exact element we are looking for.
		  //
		  //   2. We did not find the exact element, but we can return the index of
		  //      the next-closest element.
		  //
		  //   3. We did not find the exact element, and there is no next-closest
		  //      element than the one we are searching for, so we return -1.
		  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
		  var cmp = aCompare(aNeedle, aHaystack[mid], true);
		  if (cmp === 0) {
		    // Found the element we are looking for.
		    return mid;
		  }
		  else if (cmp > 0) {
		    // Our needle is greater than aHaystack[mid].
		    if (aHigh - mid > 1) {
		      // The element is in the upper half.
		      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
		    }

		    // The exact needle element was not found in this haystack. Determine if
		    // we are in termination case (3) or (2) and return the appropriate thing.
		    if (aBias == exports$1.LEAST_UPPER_BOUND) {
		      return aHigh < aHaystack.length ? aHigh : -1;
		    } else {
		      return mid;
		    }
		  }
		  else {
		    // Our needle is less than aHaystack[mid].
		    if (mid - aLow > 1) {
		      // The element is in the lower half.
		      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
		    }

		    // we are in termination case (3) or (2) and return the appropriate thing.
		    if (aBias == exports$1.LEAST_UPPER_BOUND) {
		      return mid;
		    } else {
		      return aLow < 0 ? -1 : aLow;
		    }
		  }
		}

		/**
		 * This is an implementation of binary search which will always try and return
		 * the index of the closest element if there is no exact hit. This is because
		 * mappings between original and generated line/col pairs are single points,
		 * and there is an implicit region between each of them, so a miss just means
		 * that you aren't on the very start of a region.
		 *
		 * @param aNeedle The element you are looking for.
		 * @param aHaystack The array that is being searched.
		 * @param aCompare A function which takes the needle and an element in the
		 *     array and returns -1, 0, or 1 depending on whether the needle is less
		 *     than, equal to, or greater than the element, respectively.
		 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
		 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
		 *     closest element that is smaller than or greater than the one we are
		 *     searching for, respectively, if the exact element cannot be found.
		 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
		 */
		exports$1.search = function search(aNeedle, aHaystack, aCompare, aBias) {
		  if (aHaystack.length === 0) {
		    return -1;
		  }

		  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
		                              aCompare, aBias || exports$1.GREATEST_LOWER_BOUND);
		  if (index < 0) {
		    return -1;
		  }

		  // We have found either the exact element, or the next-closest element than
		  // the one we are searching for. However, there may be more than one such
		  // element. Make sure we always return the smallest of these.
		  while (index - 1 >= 0) {
		    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
		      break;
		    }
		    --index;
		  }

		  return index;
		}; 
	} (binarySearch));
	return binarySearch;
}

var quickSort = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredQuickSort;

function requireQuickSort () {
	if (hasRequiredQuickSort) return quickSort;
	hasRequiredQuickSort = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	// It turns out that some (most?) JavaScript engines don't self-host
	// `Array.prototype.sort`. This makes sense because C++ will likely remain
	// faster than JS when doing raw CPU-intensive sorting. However, when using a
	// custom comparator function, calling back and forth between the VM's C++ and
	// JIT'd JS is rather slow *and* loses JIT type information, resulting in
	// worse generated code for the comparator function than would be optimal. In
	// fact, when sorting with a comparator, these costs outweigh the benefits of
	// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
	// a ~3500ms mean speed-up in `bench/bench.html`.

	/**
	 * Swap the elements indexed by `x` and `y` in the array `ary`.
	 *
	 * @param {Array} ary
	 *        The array.
	 * @param {Number} x
	 *        The index of the first item.
	 * @param {Number} y
	 *        The index of the second item.
	 */
	function swap(ary, x, y) {
	  var temp = ary[x];
	  ary[x] = ary[y];
	  ary[y] = temp;
	}

	/**
	 * Returns a random integer within the range `low .. high` inclusive.
	 *
	 * @param {Number} low
	 *        The lower bound on the range.
	 * @param {Number} high
	 *        The upper bound on the range.
	 */
	function randomIntInRange(low, high) {
	  return Math.round(low + (Math.random() * (high - low)));
	}

	/**
	 * The Quick Sort algorithm.
	 *
	 * @param {Array} ary
	 *        An array to sort.
	 * @param {function} comparator
	 *        Function to use to compare two items.
	 * @param {Number} p
	 *        Start index of the array
	 * @param {Number} r
	 *        End index of the array
	 */
	function doQuickSort(ary, comparator, p, r) {
	  // If our lower bound is less than our upper bound, we (1) partition the
	  // array into two pieces and (2) recurse on each half. If it is not, this is
	  // the empty array and our base case.

	  if (p < r) {
	    // (1) Partitioning.
	    //
	    // The partitioning chooses a pivot between `p` and `r` and moves all
	    // elements that are less than or equal to the pivot to the before it, and
	    // all the elements that are greater than it after it. The effect is that
	    // once partition is done, the pivot is in the exact place it will be when
	    // the array is put in sorted order, and it will not need to be moved
	    // again. This runs in O(n) time.

	    // Always choose a random pivot so that an input array which is reverse
	    // sorted does not cause O(n^2) running time.
	    var pivotIndex = randomIntInRange(p, r);
	    var i = p - 1;

	    swap(ary, pivotIndex, r);
	    var pivot = ary[r];

	    // Immediately after `j` is incremented in this loop, the following hold
	    // true:
	    //
	    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
	    //
	    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
	    for (var j = p; j < r; j++) {
	      if (comparator(ary[j], pivot) <= 0) {
	        i += 1;
	        swap(ary, i, j);
	      }
	    }

	    swap(ary, i + 1, j);
	    var q = i + 1;

	    // (2) Recurse on each half.

	    doQuickSort(ary, comparator, p, q - 1);
	    doQuickSort(ary, comparator, q + 1, r);
	  }
	}

	/**
	 * Sort the given array in-place with the given comparator function.
	 *
	 * @param {Array} ary
	 *        An array to sort.
	 * @param {function} comparator
	 *        Function to use to compare two items.
	 */
	quickSort.quickSort = function (ary, comparator) {
	  doQuickSort(ary, comparator, 0, ary.length - 1);
	};
	return quickSort;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceMapConsumer;

function requireSourceMapConsumer () {
	if (hasRequiredSourceMapConsumer) return sourceMapConsumer;
	hasRequiredSourceMapConsumer = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = /*@__PURE__*/ requireUtil$1();
	var binarySearch = /*@__PURE__*/ requireBinarySearch();
	var ArraySet = /*@__PURE__*/ requireArraySet().ArraySet;
	var base64VLQ = /*@__PURE__*/ requireBase64Vlq();
	var quickSort = /*@__PURE__*/ requireQuickSort().quickSort;

	function SourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  return sourceMap.sections != null
	    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
	    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
	}

	SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
	  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
	};

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	SourceMapConsumer.prototype._version = 3;

	// `__generatedMappings` and `__originalMappings` are arrays that hold the
	// parsed mapping coordinates from the source map's "mappings" attribute. They
	// are lazily instantiated, accessed via the `_generatedMappings` and
	// `_originalMappings` getters respectively, and we only parse the mappings
	// and create these arrays once queried for a source location. We jump through
	// these hoops because there can be many thousands of mappings, and parsing
	// them is expensive, so we only want to do it if we must.
	//
	// Each object in the arrays is of the form:
	//
	//     {
	//       generatedLine: The line number in the generated code,
	//       generatedColumn: The column number in the generated code,
	//       source: The path to the original source file that generated this
	//               chunk of code,
	//       originalLine: The line number in the original source that
	//                     corresponds to this chunk of generated code,
	//       originalColumn: The column number in the original source that
	//                       corresponds to this chunk of generated code,
	//       name: The name of the original symbol which generated this chunk of
	//             code.
	//     }
	//
	// All properties except for `generatedLine` and `generatedColumn` can be
	// `null`.
	//
	// `_generatedMappings` is ordered by the generated positions.
	//
	// `_originalMappings` is ordered by the original positions.

	SourceMapConsumer.prototype.__generatedMappings = null;
	Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
	  configurable: true,
	  enumerable: true,
	  get: function () {
	    if (!this.__generatedMappings) {
	      this._parseMappings(this._mappings, this.sourceRoot);
	    }

	    return this.__generatedMappings;
	  }
	});

	SourceMapConsumer.prototype.__originalMappings = null;
	Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
	  configurable: true,
	  enumerable: true,
	  get: function () {
	    if (!this.__originalMappings) {
	      this._parseMappings(this._mappings, this.sourceRoot);
	    }

	    return this.__originalMappings;
	  }
	});

	SourceMapConsumer.prototype._charIsMappingSeparator =
	  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
	    var c = aStr.charAt(index);
	    return c === ";" || c === ",";
	  };

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */
	SourceMapConsumer.prototype._parseMappings =
	  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    throw new Error("Subclasses must implement _parseMappings");
	  };

	SourceMapConsumer.GENERATED_ORDER = 1;
	SourceMapConsumer.ORIGINAL_ORDER = 2;

	SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
	SourceMapConsumer.LEAST_UPPER_BOUND = 2;

	/**
	 * Iterate over each mapping between an original source/line/column and a
	 * generated line/column in this source map.
	 *
	 * @param Function aCallback
	 *        The function that is called with each mapping.
	 * @param Object aContext
	 *        Optional. If specified, this object will be the value of `this` every
	 *        time that `aCallback` is called.
	 * @param aOrder
	 *        Either `SourceMapConsumer.GENERATED_ORDER` or
	 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
	 *        iterate over the mappings sorted by the generated file's line/column
	 *        order or the original's source/line/column order, respectively. Defaults to
	 *        `SourceMapConsumer.GENERATED_ORDER`.
	 */
	SourceMapConsumer.prototype.eachMapping =
	  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
	    var context = aContext || null;
	    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

	    var mappings;
	    switch (order) {
	    case SourceMapConsumer.GENERATED_ORDER:
	      mappings = this._generatedMappings;
	      break;
	    case SourceMapConsumer.ORIGINAL_ORDER:
	      mappings = this._originalMappings;
	      break;
	    default:
	      throw new Error("Unknown order of iteration.");
	    }

	    var sourceRoot = this.sourceRoot;
	    mappings.map(function (mapping) {
	      var source = mapping.source === null ? null : this._sources.at(mapping.source);
	      source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
	      return {
	        source: source,
	        generatedLine: mapping.generatedLine,
	        generatedColumn: mapping.generatedColumn,
	        originalLine: mapping.originalLine,
	        originalColumn: mapping.originalColumn,
	        name: mapping.name === null ? null : this._names.at(mapping.name)
	      };
	    }, this).forEach(aCallback, context);
	  };

	/**
	 * Returns all generated line and column information for the original source,
	 * line, and column provided. If no column is provided, returns all mappings
	 * corresponding to a either the line we are searching for or the next
	 * closest line that has any mappings. Otherwise, returns all mappings
	 * corresponding to the given line and either the column we are searching for
	 * or the next closest column that has any offsets.
	 *
	 * The only argument is an object with the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number is 1-based.
	 *   - column: Optional. the column number in the original source.
	 *    The column number is 0-based.
	 *
	 * and an array of objects is returned, each with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *    line number is 1-based.
	 *   - column: The column number in the generated source, or null.
	 *    The column number is 0-based.
	 */
	SourceMapConsumer.prototype.allGeneratedPositionsFor =
	  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
	    var line = util.getArg(aArgs, 'line');

	    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
	    // returns the index of the closest mapping less than the needle. By
	    // setting needle.originalColumn to 0, we thus find the last mapping for
	    // the given line, provided such a mapping exists.
	    var needle = {
	      source: util.getArg(aArgs, 'source'),
	      originalLine: line,
	      originalColumn: util.getArg(aArgs, 'column', 0)
	    };

	    needle.source = this._findSourceIndex(needle.source);
	    if (needle.source < 0) {
	      return [];
	    }

	    var mappings = [];

	    var index = this._findMapping(needle,
	                                  this._originalMappings,
	                                  "originalLine",
	                                  "originalColumn",
	                                  util.compareByOriginalPositions,
	                                  binarySearch.LEAST_UPPER_BOUND);
	    if (index >= 0) {
	      var mapping = this._originalMappings[index];

	      if (aArgs.column === undefined) {
	        var originalLine = mapping.originalLine;

	        // Iterate until either we run out of mappings, or we run into
	        // a mapping for a different line than the one we found. Since
	        // mappings are sorted, this is guaranteed to find all mappings for
	        // the line we found.
	        while (mapping && mapping.originalLine === originalLine) {
	          mappings.push({
	            line: util.getArg(mapping, 'generatedLine', null),
	            column: util.getArg(mapping, 'generatedColumn', null),
	            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	          });

	          mapping = this._originalMappings[++index];
	        }
	      } else {
	        var originalColumn = mapping.originalColumn;

	        // Iterate until either we run out of mappings, or we run into
	        // a mapping for a different line than the one we were searching for.
	        // Since mappings are sorted, this is guaranteed to find all mappings for
	        // the line we are searching for.
	        while (mapping &&
	               mapping.originalLine === line &&
	               mapping.originalColumn == originalColumn) {
	          mappings.push({
	            line: util.getArg(mapping, 'generatedLine', null),
	            column: util.getArg(mapping, 'generatedColumn', null),
	            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	          });

	          mapping = this._originalMappings[++index];
	        }
	      }
	    }

	    return mappings;
	  };

	sourceMapConsumer.SourceMapConsumer = SourceMapConsumer;

	/**
	 * A BasicSourceMapConsumer instance represents a parsed source map which we can
	 * query for information about the original file positions by giving it a file
	 * position in the generated source.
	 *
	 * The first parameter is the raw source map (either as a JSON string, or
	 * already parsed to an object). According to the spec, source maps have the
	 * following attributes:
	 *
	 *   - version: Which version of the source map spec this map is following.
	 *   - sources: An array of URLs to the original source files.
	 *   - names: An array of identifiers which can be referrenced by individual mappings.
	 *   - sourceRoot: Optional. The URL root from which all sources are relative.
	 *   - sourcesContent: Optional. An array of contents of the original source files.
	 *   - mappings: A string of base64 VLQs which contain the actual mappings.
	 *   - file: Optional. The generated file this source map is associated with.
	 *
	 * Here is an example source map, taken from the source map spec[0]:
	 *
	 *     {
	 *       version : 3,
	 *       file: "out.js",
	 *       sourceRoot : "",
	 *       sources: ["foo.js", "bar.js"],
	 *       names: ["src", "maps", "are", "fun"],
	 *       mappings: "AA,AB;;ABCDE;"
	 *     }
	 *
	 * The second parameter, if given, is a string whose value is the URL
	 * at which the source map was found.  This URL is used to compute the
	 * sources array.
	 *
	 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
	 */
	function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  var version = util.getArg(sourceMap, 'version');
	  var sources = util.getArg(sourceMap, 'sources');
	  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
	  // requires the array) to play nice here.
	  var names = util.getArg(sourceMap, 'names', []);
	  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
	  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
	  var mappings = util.getArg(sourceMap, 'mappings');
	  var file = util.getArg(sourceMap, 'file', null);

	  // Once again, Sass deviates from the spec and supplies the version as a
	  // string rather than a number, so we use loose equality checking here.
	  if (version != this._version) {
	    throw new Error('Unsupported version: ' + version);
	  }

	  if (sourceRoot) {
	    sourceRoot = util.normalize(sourceRoot);
	  }

	  sources = sources
	    .map(String)
	    // Some source maps produce relative source paths like "./foo.js" instead of
	    // "foo.js".  Normalize these first so that future comparisons will succeed.
	    // See bugzil.la/1090768.
	    .map(util.normalize)
	    // Always ensure that absolute sources are internally stored relative to
	    // the source root, if the source root is absolute. Not doing this would
	    // be particularly problematic when the source root is a prefix of the
	    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
	    .map(function (source) {
	      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
	        ? util.relative(sourceRoot, source)
	        : source;
	    });

	  // Pass `true` below to allow duplicate names and sources. While source maps
	  // are intended to be compressed and deduplicated, the TypeScript compiler
	  // sometimes generates source maps with duplicates in them. See Github issue
	  // #72 and bugzil.la/889492.
	  this._names = ArraySet.fromArray(names.map(String), true);
	  this._sources = ArraySet.fromArray(sources, true);

	  this._absoluteSources = this._sources.toArray().map(function (s) {
	    return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
	  });

	  this.sourceRoot = sourceRoot;
	  this.sourcesContent = sourcesContent;
	  this._mappings = mappings;
	  this._sourceMapURL = aSourceMapURL;
	  this.file = file;
	}

	BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
	BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

	/**
	 * Utility function to find the index of a source.  Returns -1 if not
	 * found.
	 */
	BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
	  var relativeSource = aSource;
	  if (this.sourceRoot != null) {
	    relativeSource = util.relative(this.sourceRoot, relativeSource);
	  }

	  if (this._sources.has(relativeSource)) {
	    return this._sources.indexOf(relativeSource);
	  }

	  // Maybe aSource is an absolute URL as returned by |sources|.  In
	  // this case we can't simply undo the transform.
	  var i;
	  for (i = 0; i < this._absoluteSources.length; ++i) {
	    if (this._absoluteSources[i] == aSource) {
	      return i;
	    }
	  }

	  return -1;
	};

	/**
	 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
	 *
	 * @param SourceMapGenerator aSourceMap
	 *        The source map that will be consumed.
	 * @param String aSourceMapURL
	 *        The URL at which the source map can be found (optional)
	 * @returns BasicSourceMapConsumer
	 */
	BasicSourceMapConsumer.fromSourceMap =
	  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
	    var smc = Object.create(BasicSourceMapConsumer.prototype);

	    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
	    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
	    smc.sourceRoot = aSourceMap._sourceRoot;
	    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
	                                                            smc.sourceRoot);
	    smc.file = aSourceMap._file;
	    smc._sourceMapURL = aSourceMapURL;
	    smc._absoluteSources = smc._sources.toArray().map(function (s) {
	      return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
	    });

	    // Because we are modifying the entries (by converting string sources and
	    // names to indices into the sources and names ArraySets), we have to make
	    // a copy of the entry or else bad things happen. Shared mutable state
	    // strikes again! See github issue #191.

	    var generatedMappings = aSourceMap._mappings.toArray().slice();
	    var destGeneratedMappings = smc.__generatedMappings = [];
	    var destOriginalMappings = smc.__originalMappings = [];

	    for (var i = 0, length = generatedMappings.length; i < length; i++) {
	      var srcMapping = generatedMappings[i];
	      var destMapping = new Mapping;
	      destMapping.generatedLine = srcMapping.generatedLine;
	      destMapping.generatedColumn = srcMapping.generatedColumn;

	      if (srcMapping.source) {
	        destMapping.source = sources.indexOf(srcMapping.source);
	        destMapping.originalLine = srcMapping.originalLine;
	        destMapping.originalColumn = srcMapping.originalColumn;

	        if (srcMapping.name) {
	          destMapping.name = names.indexOf(srcMapping.name);
	        }

	        destOriginalMappings.push(destMapping);
	      }

	      destGeneratedMappings.push(destMapping);
	    }

	    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

	    return smc;
	  };

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	BasicSourceMapConsumer.prototype._version = 3;

	/**
	 * The list of original sources.
	 */
	Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
	  get: function () {
	    return this._absoluteSources.slice();
	  }
	});

	/**
	 * Provide the JIT with a nice shape / hidden class.
	 */
	function Mapping() {
	  this.generatedLine = 0;
	  this.generatedColumn = 0;
	  this.source = null;
	  this.originalLine = null;
	  this.originalColumn = null;
	  this.name = null;
	}

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */
	BasicSourceMapConsumer.prototype._parseMappings =
	  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    var generatedLine = 1;
	    var previousGeneratedColumn = 0;
	    var previousOriginalLine = 0;
	    var previousOriginalColumn = 0;
	    var previousSource = 0;
	    var previousName = 0;
	    var length = aStr.length;
	    var index = 0;
	    var cachedSegments = {};
	    var temp = {};
	    var originalMappings = [];
	    var generatedMappings = [];
	    var mapping, str, segment, end, value;

	    while (index < length) {
	      if (aStr.charAt(index) === ';') {
	        generatedLine++;
	        index++;
	        previousGeneratedColumn = 0;
	      }
	      else if (aStr.charAt(index) === ',') {
	        index++;
	      }
	      else {
	        mapping = new Mapping();
	        mapping.generatedLine = generatedLine;

	        // Because each offset is encoded relative to the previous one,
	        // many segments often have the same encoding. We can exploit this
	        // fact by caching the parsed variable length fields of each segment,
	        // allowing us to avoid a second parse if we encounter the same
	        // segment again.
	        for (end = index; end < length; end++) {
	          if (this._charIsMappingSeparator(aStr, end)) {
	            break;
	          }
	        }
	        str = aStr.slice(index, end);

	        segment = cachedSegments[str];
	        if (segment) {
	          index += str.length;
	        } else {
	          segment = [];
	          while (index < end) {
	            base64VLQ.decode(aStr, index, temp);
	            value = temp.value;
	            index = temp.rest;
	            segment.push(value);
	          }

	          if (segment.length === 2) {
	            throw new Error('Found a source, but no line and column');
	          }

	          if (segment.length === 3) {
	            throw new Error('Found a source and line, but no column');
	          }

	          cachedSegments[str] = segment;
	        }

	        // Generated column.
	        mapping.generatedColumn = previousGeneratedColumn + segment[0];
	        previousGeneratedColumn = mapping.generatedColumn;

	        if (segment.length > 1) {
	          // Original source.
	          mapping.source = previousSource + segment[1];
	          previousSource += segment[1];

	          // Original line.
	          mapping.originalLine = previousOriginalLine + segment[2];
	          previousOriginalLine = mapping.originalLine;
	          // Lines are stored 0-based
	          mapping.originalLine += 1;

	          // Original column.
	          mapping.originalColumn = previousOriginalColumn + segment[3];
	          previousOriginalColumn = mapping.originalColumn;

	          if (segment.length > 4) {
	            // Original name.
	            mapping.name = previousName + segment[4];
	            previousName += segment[4];
	          }
	        }

	        generatedMappings.push(mapping);
	        if (typeof mapping.originalLine === 'number') {
	          originalMappings.push(mapping);
	        }
	      }
	    }

	    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
	    this.__generatedMappings = generatedMappings;

	    quickSort(originalMappings, util.compareByOriginalPositions);
	    this.__originalMappings = originalMappings;
	  };

	/**
	 * Find the mapping that best matches the hypothetical "needle" mapping that
	 * we are searching for in the given "haystack" of mappings.
	 */
	BasicSourceMapConsumer.prototype._findMapping =
	  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
	                                         aColumnName, aComparator, aBias) {
	    // To return the position we are searching for, we must first find the
	    // mapping for the given position and then return the opposite position it
	    // points to. Because the mappings are sorted, we can use binary search to
	    // find the best mapping.

	    if (aNeedle[aLineName] <= 0) {
	      throw new TypeError('Line must be greater than or equal to 1, got '
	                          + aNeedle[aLineName]);
	    }
	    if (aNeedle[aColumnName] < 0) {
	      throw new TypeError('Column must be greater than or equal to 0, got '
	                          + aNeedle[aColumnName]);
	    }

	    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
	  };

	/**
	 * Compute the last column for each generated mapping. The last column is
	 * inclusive.
	 */
	BasicSourceMapConsumer.prototype.computeColumnSpans =
	  function SourceMapConsumer_computeColumnSpans() {
	    for (var index = 0; index < this._generatedMappings.length; ++index) {
	      var mapping = this._generatedMappings[index];

	      // Mappings do not contain a field for the last generated columnt. We
	      // can come up with an optimistic estimate, however, by assuming that
	      // mappings are contiguous (i.e. given two consecutive mappings, the
	      // first mapping ends where the second one starts).
	      if (index + 1 < this._generatedMappings.length) {
	        var nextMapping = this._generatedMappings[index + 1];

	        if (mapping.generatedLine === nextMapping.generatedLine) {
	          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
	          continue;
	        }
	      }

	      // The last mapping for each line spans the entire line.
	      mapping.lastGeneratedColumn = Infinity;
	    }
	  };

	/**
	 * Returns the original source, line, and column information for the generated
	 * source's line and column positions provided. The only argument is an object
	 * with the following properties:
	 *
	 *   - line: The line number in the generated source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the generated source.  The column
	 *     number is 0-based.
	 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
	 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - source: The original source file, or null.
	 *   - line: The line number in the original source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the original source, or null.  The
	 *     column number is 0-based.
	 *   - name: The original identifier, or null.
	 */
	BasicSourceMapConsumer.prototype.originalPositionFor =
	  function SourceMapConsumer_originalPositionFor(aArgs) {
	    var needle = {
	      generatedLine: util.getArg(aArgs, 'line'),
	      generatedColumn: util.getArg(aArgs, 'column')
	    };

	    var index = this._findMapping(
	      needle,
	      this._generatedMappings,
	      "generatedLine",
	      "generatedColumn",
	      util.compareByGeneratedPositionsDeflated,
	      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
	    );

	    if (index >= 0) {
	      var mapping = this._generatedMappings[index];

	      if (mapping.generatedLine === needle.generatedLine) {
	        var source = util.getArg(mapping, 'source', null);
	        if (source !== null) {
	          source = this._sources.at(source);
	          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
	        }
	        var name = util.getArg(mapping, 'name', null);
	        if (name !== null) {
	          name = this._names.at(name);
	        }
	        return {
	          source: source,
	          line: util.getArg(mapping, 'originalLine', null),
	          column: util.getArg(mapping, 'originalColumn', null),
	          name: name
	        };
	      }
	    }

	    return {
	      source: null,
	      line: null,
	      column: null,
	      name: null
	    };
	  };

	/**
	 * Return true if we have the source content for every source in the source
	 * map, false otherwise.
	 */
	BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
	  function BasicSourceMapConsumer_hasContentsOfAllSources() {
	    if (!this.sourcesContent) {
	      return false;
	    }
	    return this.sourcesContent.length >= this._sources.size() &&
	      !this.sourcesContent.some(function (sc) { return sc == null; });
	  };

	/**
	 * Returns the original source content. The only argument is the url of the
	 * original source file. Returns null if no original source content is
	 * available.
	 */
	BasicSourceMapConsumer.prototype.sourceContentFor =
	  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
	    if (!this.sourcesContent) {
	      return null;
	    }

	    var index = this._findSourceIndex(aSource);
	    if (index >= 0) {
	      return this.sourcesContent[index];
	    }

	    var relativeSource = aSource;
	    if (this.sourceRoot != null) {
	      relativeSource = util.relative(this.sourceRoot, relativeSource);
	    }

	    var url;
	    if (this.sourceRoot != null
	        && (url = util.urlParse(this.sourceRoot))) {
	      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
	      // many users. We can help them out when they expect file:// URIs to
	      // behave like it would if they were running a local HTTP server. See
	      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
	      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
	      if (url.scheme == "file"
	          && this._sources.has(fileUriAbsPath)) {
	        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
	      }

	      if ((!url.path || url.path == "/")
	          && this._sources.has("/" + relativeSource)) {
	        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
	      }
	    }

	    // This function is used recursively from
	    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
	    // don't want to throw if we can't find the source - we just want to
	    // return null, so we provide a flag to exit gracefully.
	    if (nullOnMissing) {
	      return null;
	    }
	    else {
	      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
	    }
	  };

	/**
	 * Returns the generated line and column information for the original source,
	 * line, and column positions provided. The only argument is an object with
	 * the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the original source.  The column
	 *     number is 0-based.
	 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
	 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the generated source, or null.
	 *     The column number is 0-based.
	 */
	BasicSourceMapConsumer.prototype.generatedPositionFor =
	  function SourceMapConsumer_generatedPositionFor(aArgs) {
	    var source = util.getArg(aArgs, 'source');
	    source = this._findSourceIndex(source);
	    if (source < 0) {
	      return {
	        line: null,
	        column: null,
	        lastColumn: null
	      };
	    }

	    var needle = {
	      source: source,
	      originalLine: util.getArg(aArgs, 'line'),
	      originalColumn: util.getArg(aArgs, 'column')
	    };

	    var index = this._findMapping(
	      needle,
	      this._originalMappings,
	      "originalLine",
	      "originalColumn",
	      util.compareByOriginalPositions,
	      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
	    );

	    if (index >= 0) {
	      var mapping = this._originalMappings[index];

	      if (mapping.source === needle.source) {
	        return {
	          line: util.getArg(mapping, 'generatedLine', null),
	          column: util.getArg(mapping, 'generatedColumn', null),
	          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	        };
	      }
	    }

	    return {
	      line: null,
	      column: null,
	      lastColumn: null
	    };
	  };

	sourceMapConsumer.BasicSourceMapConsumer = BasicSourceMapConsumer;

	/**
	 * An IndexedSourceMapConsumer instance represents a parsed source map which
	 * we can query for information. It differs from BasicSourceMapConsumer in
	 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
	 * input.
	 *
	 * The first parameter is a raw source map (either as a JSON string, or already
	 * parsed to an object). According to the spec for indexed source maps, they
	 * have the following attributes:
	 *
	 *   - version: Which version of the source map spec this map is following.
	 *   - file: Optional. The generated file this source map is associated with.
	 *   - sections: A list of section definitions.
	 *
	 * Each value under the "sections" field has two fields:
	 *   - offset: The offset into the original specified at which this section
	 *       begins to apply, defined as an object with a "line" and "column"
	 *       field.
	 *   - map: A source map definition. This source map could also be indexed,
	 *       but doesn't have to be.
	 *
	 * Instead of the "map" field, it's also possible to have a "url" field
	 * specifying a URL to retrieve a source map from, but that's currently
	 * unsupported.
	 *
	 * Here's an example source map, taken from the source map spec[0], but
	 * modified to omit a section which uses the "url" field.
	 *
	 *  {
	 *    version : 3,
	 *    file: "app.js",
	 *    sections: [{
	 *      offset: {line:100, column:10},
	 *      map: {
	 *        version : 3,
	 *        file: "section.js",
	 *        sources: ["foo.js", "bar.js"],
	 *        names: ["src", "maps", "are", "fun"],
	 *        mappings: "AAAA,E;;ABCDE;"
	 *      }
	 *    }],
	 *  }
	 *
	 * The second parameter, if given, is a string whose value is the URL
	 * at which the source map was found.  This URL is used to compute the
	 * sources array.
	 *
	 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
	 */
	function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  var version = util.getArg(sourceMap, 'version');
	  var sections = util.getArg(sourceMap, 'sections');

	  if (version != this._version) {
	    throw new Error('Unsupported version: ' + version);
	  }

	  this._sources = new ArraySet();
	  this._names = new ArraySet();

	  var lastOffset = {
	    line: -1,
	    column: 0
	  };
	  this._sections = sections.map(function (s) {
	    if (s.url) {
	      // The url field will require support for asynchronicity.
	      // See https://github.com/mozilla/source-map/issues/16
	      throw new Error('Support for url field in sections not implemented.');
	    }
	    var offset = util.getArg(s, 'offset');
	    var offsetLine = util.getArg(offset, 'line');
	    var offsetColumn = util.getArg(offset, 'column');

	    if (offsetLine < lastOffset.line ||
	        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
	      throw new Error('Section offsets must be ordered and non-overlapping.');
	    }
	    lastOffset = offset;

	    return {
	      generatedOffset: {
	        // The offset fields are 0-based, but we use 1-based indices when
	        // encoding/decoding from VLQ.
	        generatedLine: offsetLine + 1,
	        generatedColumn: offsetColumn + 1
	      },
	      consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
	    }
	  });
	}

	IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
	IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	IndexedSourceMapConsumer.prototype._version = 3;

	/**
	 * The list of original sources.
	 */
	Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
	  get: function () {
	    var sources = [];
	    for (var i = 0; i < this._sections.length; i++) {
	      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
	        sources.push(this._sections[i].consumer.sources[j]);
	      }
	    }
	    return sources;
	  }
	});

	/**
	 * Returns the original source, line, and column information for the generated
	 * source's line and column positions provided. The only argument is an object
	 * with the following properties:
	 *
	 *   - line: The line number in the generated source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the generated source.  The column
	 *     number is 0-based.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - source: The original source file, or null.
	 *   - line: The line number in the original source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the original source, or null.  The
	 *     column number is 0-based.
	 *   - name: The original identifier, or null.
	 */
	IndexedSourceMapConsumer.prototype.originalPositionFor =
	  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
	    var needle = {
	      generatedLine: util.getArg(aArgs, 'line'),
	      generatedColumn: util.getArg(aArgs, 'column')
	    };

	    // Find the section containing the generated position we're trying to map
	    // to an original position.
	    var sectionIndex = binarySearch.search(needle, this._sections,
	      function(needle, section) {
	        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
	        if (cmp) {
	          return cmp;
	        }

	        return (needle.generatedColumn -
	                section.generatedOffset.generatedColumn);
	      });
	    var section = this._sections[sectionIndex];

	    if (!section) {
	      return {
	        source: null,
	        line: null,
	        column: null,
	        name: null
	      };
	    }

	    return section.consumer.originalPositionFor({
	      line: needle.generatedLine -
	        (section.generatedOffset.generatedLine - 1),
	      column: needle.generatedColumn -
	        (section.generatedOffset.generatedLine === needle.generatedLine
	         ? section.generatedOffset.generatedColumn - 1
	         : 0),
	      bias: aArgs.bias
	    });
	  };

	/**
	 * Return true if we have the source content for every source in the source
	 * map, false otherwise.
	 */
	IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
	  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
	    return this._sections.every(function (s) {
	      return s.consumer.hasContentsOfAllSources();
	    });
	  };

	/**
	 * Returns the original source content. The only argument is the url of the
	 * original source file. Returns null if no original source content is
	 * available.
	 */
	IndexedSourceMapConsumer.prototype.sourceContentFor =
	  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];

	      var content = section.consumer.sourceContentFor(aSource, true);
	      if (content) {
	        return content;
	      }
	    }
	    if (nullOnMissing) {
	      return null;
	    }
	    else {
	      throw new Error('"' + aSource + '" is not in the SourceMap.');
	    }
	  };

	/**
	 * Returns the generated line and column information for the original source,
	 * line, and column positions provided. The only argument is an object with
	 * the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the original source.  The column
	 *     number is 0-based.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *     line number is 1-based. 
	 *   - column: The column number in the generated source, or null.
	 *     The column number is 0-based.
	 */
	IndexedSourceMapConsumer.prototype.generatedPositionFor =
	  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];

	      // Only consider this section if the requested source is in the list of
	      // sources of the consumer.
	      if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
	        continue;
	      }
	      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
	      if (generatedPosition) {
	        var ret = {
	          line: generatedPosition.line +
	            (section.generatedOffset.generatedLine - 1),
	          column: generatedPosition.column +
	            (section.generatedOffset.generatedLine === generatedPosition.line
	             ? section.generatedOffset.generatedColumn - 1
	             : 0)
	        };
	        return ret;
	      }
	    }

	    return {
	      line: null,
	      column: null
	    };
	  };

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */
	IndexedSourceMapConsumer.prototype._parseMappings =
	  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    this.__generatedMappings = [];
	    this.__originalMappings = [];
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];
	      var sectionMappings = section.consumer._generatedMappings;
	      for (var j = 0; j < sectionMappings.length; j++) {
	        var mapping = sectionMappings[j];

	        var source = section.consumer._sources.at(mapping.source);
	        source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
	        this._sources.add(source);
	        source = this._sources.indexOf(source);

	        var name = null;
	        if (mapping.name) {
	          name = section.consumer._names.at(mapping.name);
	          this._names.add(name);
	          name = this._names.indexOf(name);
	        }

	        // The mappings coming from the consumer for the section have
	        // generated positions relative to the start of the section, so we
	        // need to offset them to be relative to the start of the concatenated
	        // generated file.
	        var adjustedMapping = {
	          source: source,
	          generatedLine: mapping.generatedLine +
	            (section.generatedOffset.generatedLine - 1),
	          generatedColumn: mapping.generatedColumn +
	            (section.generatedOffset.generatedLine === mapping.generatedLine
	            ? section.generatedOffset.generatedColumn - 1
	            : 0),
	          originalLine: mapping.originalLine,
	          originalColumn: mapping.originalColumn,
	          name: name
	        };

	        this.__generatedMappings.push(adjustedMapping);
	        if (typeof adjustedMapping.originalLine === 'number') {
	          this.__originalMappings.push(adjustedMapping);
	        }
	      }
	    }

	    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
	    quickSort(this.__originalMappings, util.compareByOriginalPositions);
	  };

	sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
	return sourceMapConsumer;
}

var sourceNode = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceNode;

function requireSourceNode () {
	if (hasRequiredSourceNode) return sourceNode;
	hasRequiredSourceNode = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var SourceMapGenerator = /*@__PURE__*/ requireSourceMapGenerator().SourceMapGenerator;
	var util = /*@__PURE__*/ requireUtil$1();

	// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
	// operating systems these days (capturing the result).
	var REGEX_NEWLINE = /(\r?\n)/;

	// Newline character code for charCodeAt() comparisons
	var NEWLINE_CODE = 10;

	// Private symbol for identifying `SourceNode`s when multiple versions of
	// the source-map library are loaded. This MUST NOT CHANGE across
	// versions!
	var isSourceNode = "$$$isSourceNode$$$";

	/**
	 * SourceNodes provide a way to abstract over interpolating/concatenating
	 * snippets of generated JavaScript source code while maintaining the line and
	 * column information associated with the original source code.
	 *
	 * @param aLine The original line number.
	 * @param aColumn The original column number.
	 * @param aSource The original source's filename.
	 * @param aChunks Optional. An array of strings which are snippets of
	 *        generated JS, or other SourceNodes.
	 * @param aName The original identifier.
	 */
	function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
	  this.children = [];
	  this.sourceContents = {};
	  this.line = aLine == null ? null : aLine;
	  this.column = aColumn == null ? null : aColumn;
	  this.source = aSource == null ? null : aSource;
	  this.name = aName == null ? null : aName;
	  this[isSourceNode] = true;
	  if (aChunks != null) this.add(aChunks);
	}

	/**
	 * Creates a SourceNode from generated code and a SourceMapConsumer.
	 *
	 * @param aGeneratedCode The generated code
	 * @param aSourceMapConsumer The SourceMap for the generated code
	 * @param aRelativePath Optional. The path that relative sources in the
	 *        SourceMapConsumer should be relative to.
	 */
	SourceNode.fromStringWithSourceMap =
	  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
	    // The SourceNode we want to fill with the generated code
	    // and the SourceMap
	    var node = new SourceNode();

	    // All even indices of this array are one line of the generated code,
	    // while all odd indices are the newlines between two adjacent lines
	    // (since `REGEX_NEWLINE` captures its match).
	    // Processed fragments are accessed by calling `shiftNextLine`.
	    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
	    var remainingLinesIndex = 0;
	    var shiftNextLine = function() {
	      var lineContents = getNextLine();
	      // The last line of a file might not have a newline.
	      var newLine = getNextLine() || "";
	      return lineContents + newLine;

	      function getNextLine() {
	        return remainingLinesIndex < remainingLines.length ?
	            remainingLines[remainingLinesIndex++] : undefined;
	      }
	    };

	    // We need to remember the position of "remainingLines"
	    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

	    // The generate SourceNodes we need a code range.
	    // To extract it current and last mapping is used.
	    // Here we store the last mapping.
	    var lastMapping = null;

	    aSourceMapConsumer.eachMapping(function (mapping) {
	      if (lastMapping !== null) {
	        // We add the code from "lastMapping" to "mapping":
	        // First check if there is a new line in between.
	        if (lastGeneratedLine < mapping.generatedLine) {
	          // Associate first line with "lastMapping"
	          addMappingWithCode(lastMapping, shiftNextLine());
	          lastGeneratedLine++;
	          lastGeneratedColumn = 0;
	          // The remaining code is added without mapping
	        } else {
	          // There is no new line in between.
	          // Associate the code between "lastGeneratedColumn" and
	          // "mapping.generatedColumn" with "lastMapping"
	          var nextLine = remainingLines[remainingLinesIndex] || '';
	          var code = nextLine.substr(0, mapping.generatedColumn -
	                                        lastGeneratedColumn);
	          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
	                                              lastGeneratedColumn);
	          lastGeneratedColumn = mapping.generatedColumn;
	          addMappingWithCode(lastMapping, code);
	          // No more remaining code, continue
	          lastMapping = mapping;
	          return;
	        }
	      }
	      // We add the generated code until the first mapping
	      // to the SourceNode without any mapping.
	      // Each line is added as separate string.
	      while (lastGeneratedLine < mapping.generatedLine) {
	        node.add(shiftNextLine());
	        lastGeneratedLine++;
	      }
	      if (lastGeneratedColumn < mapping.generatedColumn) {
	        var nextLine = remainingLines[remainingLinesIndex] || '';
	        node.add(nextLine.substr(0, mapping.generatedColumn));
	        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
	        lastGeneratedColumn = mapping.generatedColumn;
	      }
	      lastMapping = mapping;
	    }, this);
	    // We have processed all mappings.
	    if (remainingLinesIndex < remainingLines.length) {
	      if (lastMapping) {
	        // Associate the remaining code in the current line with "lastMapping"
	        addMappingWithCode(lastMapping, shiftNextLine());
	      }
	      // and add the remaining lines without any mapping
	      node.add(remainingLines.splice(remainingLinesIndex).join(""));
	    }

	    // Copy sourcesContent into SourceNode
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        if (aRelativePath != null) {
	          sourceFile = util.join(aRelativePath, sourceFile);
	        }
	        node.setSourceContent(sourceFile, content);
	      }
	    });

	    return node;

	    function addMappingWithCode(mapping, code) {
	      if (mapping === null || mapping.source === undefined) {
	        node.add(code);
	      } else {
	        var source = aRelativePath
	          ? util.join(aRelativePath, mapping.source)
	          : mapping.source;
	        node.add(new SourceNode(mapping.originalLine,
	                                mapping.originalColumn,
	                                source,
	                                code,
	                                mapping.name));
	      }
	    }
	  };

	/**
	 * Add a chunk of generated JS to this source node.
	 *
	 * @param aChunk A string snippet of generated JS code, another instance of
	 *        SourceNode, or an array where each member is one of those things.
	 */
	SourceNode.prototype.add = function SourceNode_add(aChunk) {
	  if (Array.isArray(aChunk)) {
	    aChunk.forEach(function (chunk) {
	      this.add(chunk);
	    }, this);
	  }
	  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
	    if (aChunk) {
	      this.children.push(aChunk);
	    }
	  }
	  else {
	    throw new TypeError(
	      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
	    );
	  }
	  return this;
	};

	/**
	 * Add a chunk of generated JS to the beginning of this source node.
	 *
	 * @param aChunk A string snippet of generated JS code, another instance of
	 *        SourceNode, or an array where each member is one of those things.
	 */
	SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
	  if (Array.isArray(aChunk)) {
	    for (var i = aChunk.length-1; i >= 0; i--) {
	      this.prepend(aChunk[i]);
	    }
	  }
	  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
	    this.children.unshift(aChunk);
	  }
	  else {
	    throw new TypeError(
	      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
	    );
	  }
	  return this;
	};

	/**
	 * Walk over the tree of JS snippets in this node and its children. The
	 * walking function is called once for each snippet of JS and is passed that
	 * snippet and the its original associated source's line/column location.
	 *
	 * @param aFn The traversal function.
	 */
	SourceNode.prototype.walk = function SourceNode_walk(aFn) {
	  var chunk;
	  for (var i = 0, len = this.children.length; i < len; i++) {
	    chunk = this.children[i];
	    if (chunk[isSourceNode]) {
	      chunk.walk(aFn);
	    }
	    else {
	      if (chunk !== '') {
	        aFn(chunk, { source: this.source,
	                     line: this.line,
	                     column: this.column,
	                     name: this.name });
	      }
	    }
	  }
	};

	/**
	 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
	 * each of `this.children`.
	 *
	 * @param aSep The separator.
	 */
	SourceNode.prototype.join = function SourceNode_join(aSep) {
	  var newChildren;
	  var i;
	  var len = this.children.length;
	  if (len > 0) {
	    newChildren = [];
	    for (i = 0; i < len-1; i++) {
	      newChildren.push(this.children[i]);
	      newChildren.push(aSep);
	    }
	    newChildren.push(this.children[i]);
	    this.children = newChildren;
	  }
	  return this;
	};

	/**
	 * Call String.prototype.replace on the very right-most source snippet. Useful
	 * for trimming whitespace from the end of a source node, etc.
	 *
	 * @param aPattern The pattern to replace.
	 * @param aReplacement The thing to replace the pattern with.
	 */
	SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
	  var lastChild = this.children[this.children.length - 1];
	  if (lastChild[isSourceNode]) {
	    lastChild.replaceRight(aPattern, aReplacement);
	  }
	  else if (typeof lastChild === 'string') {
	    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
	  }
	  else {
	    this.children.push(''.replace(aPattern, aReplacement));
	  }
	  return this;
	};

	/**
	 * Set the source content for a source file. This will be added to the SourceMapGenerator
	 * in the sourcesContent field.
	 *
	 * @param aSourceFile The filename of the source file
	 * @param aSourceContent The content of the source file
	 */
	SourceNode.prototype.setSourceContent =
	  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
	    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
	  };

	/**
	 * Walk over the tree of SourceNodes. The walking function is called for each
	 * source file content and is passed the filename and source content.
	 *
	 * @param aFn The traversal function.
	 */
	SourceNode.prototype.walkSourceContents =
	  function SourceNode_walkSourceContents(aFn) {
	    for (var i = 0, len = this.children.length; i < len; i++) {
	      if (this.children[i][isSourceNode]) {
	        this.children[i].walkSourceContents(aFn);
	      }
	    }

	    var sources = Object.keys(this.sourceContents);
	    for (var i = 0, len = sources.length; i < len; i++) {
	      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
	    }
	  };

	/**
	 * Return the string representation of this source node. Walks over the tree
	 * and concatenates all the various snippets together to one string.
	 */
	SourceNode.prototype.toString = function SourceNode_toString() {
	  var str = "";
	  this.walk(function (chunk) {
	    str += chunk;
	  });
	  return str;
	};

	/**
	 * Returns the string representation of this source node along with a source
	 * map.
	 */
	SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
	  var generated = {
	    code: "",
	    line: 1,
	    column: 0
	  };
	  var map = new SourceMapGenerator(aArgs);
	  var sourceMappingActive = false;
	  var lastOriginalSource = null;
	  var lastOriginalLine = null;
	  var lastOriginalColumn = null;
	  var lastOriginalName = null;
	  this.walk(function (chunk, original) {
	    generated.code += chunk;
	    if (original.source !== null
	        && original.line !== null
	        && original.column !== null) {
	      if(lastOriginalSource !== original.source
	         || lastOriginalLine !== original.line
	         || lastOriginalColumn !== original.column
	         || lastOriginalName !== original.name) {
	        map.addMapping({
	          source: original.source,
	          original: {
	            line: original.line,
	            column: original.column
	          },
	          generated: {
	            line: generated.line,
	            column: generated.column
	          },
	          name: original.name
	        });
	      }
	      lastOriginalSource = original.source;
	      lastOriginalLine = original.line;
	      lastOriginalColumn = original.column;
	      lastOriginalName = original.name;
	      sourceMappingActive = true;
	    } else if (sourceMappingActive) {
	      map.addMapping({
	        generated: {
	          line: generated.line,
	          column: generated.column
	        }
	      });
	      lastOriginalSource = null;
	      sourceMappingActive = false;
	    }
	    for (var idx = 0, length = chunk.length; idx < length; idx++) {
	      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
	        generated.line++;
	        generated.column = 0;
	        // Mappings end at eol
	        if (idx + 1 === length) {
	          lastOriginalSource = null;
	          sourceMappingActive = false;
	        } else if (sourceMappingActive) {
	          map.addMapping({
	            source: original.source,
	            original: {
	              line: original.line,
	              column: original.column
	            },
	            generated: {
	              line: generated.line,
	              column: generated.column
	            },
	            name: original.name
	          });
	        }
	      } else {
	        generated.column++;
	      }
	    }
	  });
	  this.walkSourceContents(function (sourceFile, sourceContent) {
	    map.setSourceContent(sourceFile, sourceContent);
	  });

	  return { code: generated.code, map: map };
	};

	sourceNode.SourceNode = SourceNode;
	return sourceNode;
}

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var hasRequiredSourceMap;

function requireSourceMap () {
	if (hasRequiredSourceMap) return sourceMap;
	hasRequiredSourceMap = 1;
	sourceMap.SourceMapGenerator = /*@__PURE__*/ requireSourceMapGenerator().SourceMapGenerator;
	sourceMap.SourceMapConsumer = /*@__PURE__*/ requireSourceMapConsumer().SourceMapConsumer;
	sourceMap.SourceNode = /*@__PURE__*/ requireSourceNode().SourceNode;
	return sourceMap;
}

var mergeSourceMap;
var hasRequiredMergeSourceMap;

function requireMergeSourceMap () {
	if (hasRequiredMergeSourceMap) return mergeSourceMap;
	hasRequiredMergeSourceMap = 1;
	var sourceMap = /*@__PURE__*/ requireSourceMap();
	var SourceMapConsumer = sourceMap.SourceMapConsumer;
	var SourceMapGenerator = sourceMap.SourceMapGenerator;

	mergeSourceMap = merge;

	/**
	 * Merge old source map and new source map and return merged.
	 * If old or new source map value is falsy, return another one as it is.
	 *
	 * @param {object|string} [oldMap] old source map object
	 * @param {object|string} [newmap] new source map object
	 * @return {object|undefined} merged source map object, or undefined when both old and new source map are undefined
	 */
	function merge(oldMap, newMap) {
	  if (!oldMap) return newMap
	  if (!newMap) return oldMap

	  var oldMapConsumer = new SourceMapConsumer(oldMap);
	  var newMapConsumer = new SourceMapConsumer(newMap);
	  var mergedMapGenerator = new SourceMapGenerator();

	  // iterate on new map and overwrite original position of new map with one of old map
	  newMapConsumer.eachMapping(function(m) {
	    // pass when `originalLine` is null.
	    // It occurs in case that the node does not have origin in original code.
	    if (m.originalLine == null) return

	    var origPosInOldMap = oldMapConsumer.originalPositionFor({
	      line: m.originalLine,
	      column: m.originalColumn
	    });

	    if (origPosInOldMap.source == null) return

	    mergedMapGenerator.addMapping({
	      original: {
	        line: origPosInOldMap.line,
	        column: origPosInOldMap.column
	      },
	      generated: {
	        line: m.generatedLine,
	        column: m.generatedColumn
	      },
	      source: origPosInOldMap.source,
	      name: origPosInOldMap.name
	    });
	  });

	  var consumers = [oldMapConsumer, newMapConsumer];
	  consumers.forEach(function(consumer) {
	    consumer.sources.forEach(function(sourceFile) {
	      mergedMapGenerator._sources.add(sourceFile);
	      var sourceContent = consumer.sourceContentFor(sourceFile);
	      if (sourceContent != null) {
	        mergedMapGenerator.setSourceContent(sourceFile, sourceContent);
	      }
	    });
	  });

	  mergedMapGenerator._sourceRoot = oldMap.sourceRoot;
	  mergedMapGenerator._file = oldMap.file;

	  return JSON.parse(mergedMapGenerator.toString())
	}
	return mergeSourceMap;
}

var mergeSourceMapExports = /*@__PURE__*/ requireMergeSourceMap();
var merge = /*@__PURE__*/getDefaultExportFromCjs(mergeSourceMapExports);

const scss = (source, map, options, load = require) => {
  const nodeSass = load("sass");
  const { compileString, renderSync } = nodeSass;
  const data = getSource(source, options.filename, options.additionalData);
  let css;
  let dependencies;
  let sourceMap;
  try {
    if (compileString) {
      const { pathToFileURL, fileURLToPath } = load("url");
      const result = compileString(data, {
        ...options,
        url: pathToFileURL(options.filename),
        sourceMap: !!map
      });
      css = result.css;
      dependencies = result.loadedUrls.map((url) => fileURLToPath(url));
      sourceMap = map ? result.sourceMap : void 0;
    } else {
      const result = renderSync({
        ...options,
        data,
        file: options.filename,
        outFile: options.filename,
        sourceMap: !!map
      });
      css = result.css.toString();
      dependencies = result.stats.includedFiles;
      sourceMap = map ? JSON.parse(result.map.toString()) : void 0;
    }
    if (map) {
      return {
        code: css,
        errors: [],
        dependencies,
        map: merge(map, sourceMap)
      };
    }
    return { code: css, errors: [], dependencies };
  } catch (e) {
    return { code: "", errors: [e], dependencies: [] };
  }
};
const sass = (source, map, options, load) => scss(
  source,
  map,
  {
    ...options,
    indentedSyntax: true
  },
  load
);
const less = (source, map, options, load = require) => {
  const nodeLess = load("less");
  let result;
  let error = null;
  nodeLess.render(
    getSource(source, options.filename, options.additionalData),
    { ...options, syncImport: true },
    (err, output) => {
      error = err;
      result = output;
    }
  );
  if (error) return { code: "", errors: [error], dependencies: [] };
  const dependencies = result.imports;
  if (map) {
    return {
      code: result.css.toString(),
      map: merge(map, result.map),
      errors: [],
      dependencies
    };
  }
  return {
    code: result.css.toString(),
    errors: [],
    dependencies
  };
};
const styl = (source, map, options, load = require) => {
  const nodeStylus = load("stylus");
  try {
    const ref = nodeStylus(source, options);
    if (map) ref.set("sourcemap", { inline: false, comment: false });
    const result = ref.render();
    const dependencies = ref.deps();
    if (map) {
      return {
        code: result,
        map: merge(map, ref.sourcemap),
        errors: [],
        dependencies
      };
    }
    return { code: result, errors: [], dependencies };
  } catch (e) {
    return { code: "", errors: [e], dependencies: [] };
  }
};
function getSource(source, filename, additionalData) {
  if (!additionalData) return source;
  if (shared.isFunction(additionalData)) {
    return additionalData(source, filename);
  }
  return additionalData + source;
}
const processors = {
  less,
  sass,
  scss,
  styl,
  stylus: styl
};

var build = {exports: {}};

var fs = {};

var hasRequiredFs;

function requireFs () {
	if (hasRequiredFs) return fs;
	hasRequiredFs = 1;

	Object.defineProperty(fs, "__esModule", {
	  value: true
	});
	fs.getFileSystem = getFileSystem;
	fs.setFileSystem = setFileSystem;
	let fileSystem = {
	  readFile: () => {
	    throw Error("readFile not implemented");
	  },
	  writeFile: () => {
	    throw Error("writeFile not implemented");
	  }
	};

	function setFileSystem(fs) {
	  fileSystem.readFile = fs.readFile;
	  fileSystem.writeFile = fs.writeFile;
	}

	function getFileSystem() {
	  return fileSystem;
	}
	return fs;
}

var pluginFactory = {};

var unquote = {};

var hasRequiredUnquote;

function requireUnquote () {
	if (hasRequiredUnquote) return unquote;
	hasRequiredUnquote = 1;

	Object.defineProperty(unquote, "__esModule", {
	  value: true
	});
	unquote.default = unquote$1;
	// copied from https://github.com/lakenen/node-unquote
	const reg = /['"]/;

	function unquote$1(str) {
	  if (!str) {
	    return "";
	  }

	  if (reg.test(str.charAt(0))) {
	    str = str.substr(1);
	  }

	  if (reg.test(str.charAt(str.length - 1))) {
	    str = str.substr(0, str.length - 1);
	  }

	  return str;
	}
	return unquote;
}

var Parser = {};

var replaceValueSymbols_1;
var hasRequiredReplaceValueSymbols;

function requireReplaceValueSymbols () {
	if (hasRequiredReplaceValueSymbols) return replaceValueSymbols_1;
	hasRequiredReplaceValueSymbols = 1;
	const matchValueName = /[$]?[\w-]+/g;

	const replaceValueSymbols = (value, replacements) => {
	  let matches;

	  while ((matches = matchValueName.exec(value))) {
	    const replacement = replacements[matches[0]];

	    if (replacement) {
	      value =
	        value.slice(0, matches.index) +
	        replacement +
	        value.slice(matchValueName.lastIndex);

	      matchValueName.lastIndex -= matches[0].length - replacement.length;
	    }
	  }

	  return value;
	};

	replaceValueSymbols_1 = replaceValueSymbols;
	return replaceValueSymbols_1;
}

var replaceSymbols_1;
var hasRequiredReplaceSymbols;

function requireReplaceSymbols () {
	if (hasRequiredReplaceSymbols) return replaceSymbols_1;
	hasRequiredReplaceSymbols = 1;
	const replaceValueSymbols = /*@__PURE__*/ requireReplaceValueSymbols();

	const replaceSymbols = (css, replacements) => {
	  css.walk((node) => {
	    if (node.type === "decl" && node.value) {
	      node.value = replaceValueSymbols(node.value.toString(), replacements);
	    } else if (node.type === "rule" && node.selector) {
	      node.selector = replaceValueSymbols(
	        node.selector.toString(),
	        replacements
	      );
	    } else if (node.type === "atrule" && node.params) {
	      node.params = replaceValueSymbols(node.params.toString(), replacements);
	    }
	  });
	};

	replaceSymbols_1 = replaceSymbols;
	return replaceSymbols_1;
}

var extractICSS_1;
var hasRequiredExtractICSS;

function requireExtractICSS () {
	if (hasRequiredExtractICSS) return extractICSS_1;
	hasRequiredExtractICSS = 1;
	const importPattern = /^:import\(("[^"]*"|'[^']*'|[^"']+)\)$/;
	const balancedQuotes = /^("[^"]*"|'[^']*'|[^"']+)$/;

	const getDeclsObject = (rule) => {
	  const object = {};

	  rule.walkDecls((decl) => {
	    const before = decl.raws.before ? decl.raws.before.trim() : "";

	    object[before + decl.prop] = decl.value;
	  });

	  return object;
	};
	/**
	 *
	 * @param {string} css
	 * @param {boolean} removeRules
	 * @param {'auto' | 'rule' | 'at-rule'} mode
	 */
	const extractICSS = (css, removeRules = true, mode = "auto") => {
	  const icssImports = {};
	  const icssExports = {};

	  function addImports(node, path) {
	    const unquoted = path.replace(/'|"/g, "");
	    icssImports[unquoted] = Object.assign(
	      icssImports[unquoted] || {},
	      getDeclsObject(node)
	    );

	    if (removeRules) {
	      node.remove();
	    }
	  }

	  function addExports(node) {
	    Object.assign(icssExports, getDeclsObject(node));
	    if (removeRules) {
	      node.remove();
	    }
	  }

	  css.each((node) => {
	    if (node.type === "rule" && mode !== "at-rule") {
	      if (node.selector.slice(0, 7) === ":import") {
	        const matches = importPattern.exec(node.selector);

	        if (matches) {
	          addImports(node, matches[1]);
	        }
	      }

	      if (node.selector === ":export") {
	        addExports(node);
	      }
	    }

	    if (node.type === "atrule" && mode !== "rule") {
	      if (node.name === "icss-import") {
	        const matches = balancedQuotes.exec(node.params);

	        if (matches) {
	          addImports(node, matches[1]);
	        }
	      }
	      if (node.name === "icss-export") {
	        addExports(node);
	      }
	    }
	  });

	  return { icssImports, icssExports };
	};

	extractICSS_1 = extractICSS;
	return extractICSS_1;
}

var createICSSRules_1;
var hasRequiredCreateICSSRules;

function requireCreateICSSRules () {
	if (hasRequiredCreateICSSRules) return createICSSRules_1;
	hasRequiredCreateICSSRules = 1;
	const createImports = (imports, postcss, mode = "rule") => {
	  return Object.keys(imports).map((path) => {
	    const aliases = imports[path];
	    const declarations = Object.keys(aliases).map((key) =>
	      postcss.decl({
	        prop: key,
	        value: aliases[key],
	        raws: { before: "\n  " },
	      })
	    );

	    const hasDeclarations = declarations.length > 0;

	    const rule =
	      mode === "rule"
	        ? postcss.rule({
	            selector: `:import('${path}')`,
	            raws: { after: hasDeclarations ? "\n" : "" },
	          })
	        : postcss.atRule({
	            name: "icss-import",
	            params: `'${path}'`,
	            raws: { after: hasDeclarations ? "\n" : "" },
	          });

	    if (hasDeclarations) {
	      rule.append(declarations);
	    }

	    return rule;
	  });
	};

	const createExports = (exports$1, postcss, mode = "rule") => {
	  const declarations = Object.keys(exports$1).map((key) =>
	    postcss.decl({
	      prop: key,
	      value: exports$1[key],
	      raws: { before: "\n  " },
	    })
	  );

	  if (declarations.length === 0) {
	    return [];
	  }
	  const rule =
	    mode === "rule"
	      ? postcss.rule({
	          selector: `:export`,
	          raws: { after: "\n" },
	        })
	      : postcss.atRule({
	          name: "icss-export",
	          raws: { after: "\n" },
	        });

	  rule.append(declarations);

	  return [rule];
	};

	const createICSSRules = (imports, exports$1, postcss, mode) => [
	  ...createImports(imports, postcss, mode),
	  ...createExports(exports$1, postcss, mode),
	];

	createICSSRules_1 = createICSSRules;
	return createICSSRules_1;
}

var src$4;
var hasRequiredSrc$4;

function requireSrc$4 () {
	if (hasRequiredSrc$4) return src$4;
	hasRequiredSrc$4 = 1;
	const replaceValueSymbols = /*@__PURE__*/ requireReplaceValueSymbols();
	const replaceSymbols = /*@__PURE__*/ requireReplaceSymbols();
	const extractICSS = /*@__PURE__*/ requireExtractICSS();
	const createICSSRules = /*@__PURE__*/ requireCreateICSSRules();

	src$4 = {
	  replaceValueSymbols,
	  replaceSymbols,
	  extractICSS,
	  createICSSRules,
	};
	return src$4;
}

var hasRequiredParser$1;

function requireParser$1 () {
	if (hasRequiredParser$1) return Parser;
	hasRequiredParser$1 = 1;

	Object.defineProperty(Parser, "__esModule", {
	  value: true
	});
	Parser.default = void 0;

	var _icssUtils = /*@__PURE__*/ requireSrc$4();

	// Initially copied from https://github.com/css-modules/css-modules-loader-core
	const importRegexp = /^:import\((.+)\)$/;

	let Parser$1 = class Parser {
	  constructor(pathFetcher, trace) {
	    this.pathFetcher = pathFetcher;
	    this.plugin = this.plugin.bind(this);
	    this.exportTokens = {};
	    this.translations = {};
	    this.trace = trace;
	  }

	  plugin() {
	    const parser = this;
	    return {
	      postcssPlugin: "css-modules-parser",

	      async OnceExit(css) {
	        await Promise.all(parser.fetchAllImports(css));
	        parser.linkImportedSymbols(css);
	        return parser.extractExports(css);
	      }

	    };
	  }

	  fetchAllImports(css) {
	    let imports = [];
	    css.each(node => {
	      if (node.type == "rule" && node.selector.match(importRegexp)) {
	        imports.push(this.fetchImport(node, css.source.input.from, imports.length));
	      }
	    });
	    return imports;
	  }

	  linkImportedSymbols(css) {
	    (0, _icssUtils.replaceSymbols)(css, this.translations);
	  }

	  extractExports(css) {
	    css.each(node => {
	      if (node.type == "rule" && node.selector == ":export") this.handleExport(node);
	    });
	  }

	  handleExport(exportNode) {
	    exportNode.each(decl => {
	      if (decl.type == "decl") {
	        Object.keys(this.translations).forEach(translation => {
	          decl.value = decl.value.replace(translation, this.translations[translation]);
	        });
	        this.exportTokens[decl.prop] = decl.value;
	      }
	    });
	    exportNode.remove();
	  }

	  async fetchImport(importNode, relativeTo, depNr) {
	    const file = importNode.selector.match(importRegexp)[1];
	    const depTrace = this.trace + String.fromCharCode(depNr);
	    const exports$1 = await this.pathFetcher(file, relativeTo, depTrace);

	    try {
	      importNode.each(decl => {
	        if (decl.type == "decl") {
	          this.translations[decl.prop] = exports$1[decl.value];
	        }
	      });
	      importNode.remove();
	    } catch (err) {
	      console.log(err);
	    }
	  }

	};

	Parser.default = Parser$1;
	return Parser;
}

var saveJSON = {};

var hasRequiredSaveJSON;

function requireSaveJSON () {
	if (hasRequiredSaveJSON) return saveJSON;
	hasRequiredSaveJSON = 1;

	Object.defineProperty(saveJSON, "__esModule", {
	  value: true
	});
	saveJSON.default = saveJSON$1;

	var _fs = /*@__PURE__*/ requireFs();

	function saveJSON$1(cssFile, json) {
	  return new Promise((resolve, reject) => {
	    const {
	      writeFile
	    } = (0, _fs.getFileSystem)();
	    writeFile(`${cssFile}.json`, JSON.stringify(json), e => e ? reject(e) : resolve(json));
	  });
	}
	return saveJSON;
}

var localsConvention = {};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

var lodash_camelcase;
var hasRequiredLodash_camelcase;

function requireLodash_camelcase () {
	if (hasRequiredLodash_camelcase) return lodash_camelcase;
	hasRequiredLodash_camelcase = 1;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/** Used to match words composed of alphanumeric characters. */
	var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

	/** Used to match Latin Unicode letters (excluding mathematical operators). */
	var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

	/** Used to compose unicode character classes. */
	var rsAstralRange = '\\ud800-\\udfff',
	    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
	    rsComboSymbolsRange = '\\u20d0-\\u20f0',
	    rsDingbatRange = '\\u2700-\\u27bf',
	    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
	    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
	    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
	    rsPunctuationRange = '\\u2000-\\u206f',
	    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
	    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
	    rsVarRange = '\\ufe0e\\ufe0f',
	    rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

	/** Used to compose unicode capture groups. */
	var rsApos = "['\u2019]",
	    rsAstral = '[' + rsAstralRange + ']',
	    rsBreak = '[' + rsBreakRange + ']',
	    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
	    rsDigits = '\\d+',
	    rsDingbat = '[' + rsDingbatRange + ']',
	    rsLower = '[' + rsLowerRange + ']',
	    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
	    rsFitz = '\\ud83c[\\udffb-\\udfff]',
	    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
	    rsNonAstral = '[^' + rsAstralRange + ']',
	    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
	    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
	    rsUpper = '[' + rsUpperRange + ']',
	    rsZWJ = '\\u200d';

	/** Used to compose unicode regexes. */
	var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
	    rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
	    rsOptLowerContr = '(?:' + rsApos + '(?:d|ll|m|re|s|t|ve))?',
	    rsOptUpperContr = '(?:' + rsApos + '(?:D|LL|M|RE|S|T|VE))?',
	    reOptMod = rsModifier + '?',
	    rsOptVar = '[' + rsVarRange + ']?',
	    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
	    rsSeq = rsOptVar + reOptMod + rsOptJoin,
	    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
	    rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

	/** Used to match apostrophes. */
	var reApos = RegExp(rsApos, 'g');

	/**
	 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
	 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
	 */
	var reComboMark = RegExp(rsCombo, 'g');

	/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
	var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

	/** Used to match complex or compound words. */
	var reUnicodeWord = RegExp([
	  rsUpper + '?' + rsLower + '+' + rsOptLowerContr + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
	  rsUpperMisc + '+' + rsOptUpperContr + '(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
	  rsUpper + '?' + rsLowerMisc + '+' + rsOptLowerContr,
	  rsUpper + '+' + rsOptUpperContr,
	  rsDigits,
	  rsEmoji
	].join('|'), 'g');

	/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
	var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

	/** Used to detect strings that need a more robust regexp to match words. */
	var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

	/** Used to map Latin Unicode letters to basic Latin letters. */
	var deburredLetters = {
	  // Latin-1 Supplement block.
	  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
	  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
	  '\xc7': 'C',  '\xe7': 'c',
	  '\xd0': 'D',  '\xf0': 'd',
	  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
	  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
	  '\xcc': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
	  '\xec': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
	  '\xd1': 'N',  '\xf1': 'n',
	  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
	  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
	  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
	  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
	  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
	  '\xc6': 'Ae', '\xe6': 'ae',
	  '\xde': 'Th', '\xfe': 'th',
	  '\xdf': 'ss',
	  // Latin Extended-A block.
	  '\u0100': 'A',  '\u0102': 'A', '\u0104': 'A',
	  '\u0101': 'a',  '\u0103': 'a', '\u0105': 'a',
	  '\u0106': 'C',  '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
	  '\u0107': 'c',  '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
	  '\u010e': 'D',  '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
	  '\u0112': 'E',  '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
	  '\u0113': 'e',  '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
	  '\u011c': 'G',  '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
	  '\u011d': 'g',  '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
	  '\u0124': 'H',  '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
	  '\u0128': 'I',  '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
	  '\u0129': 'i',  '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
	  '\u0134': 'J',  '\u0135': 'j',
	  '\u0136': 'K',  '\u0137': 'k', '\u0138': 'k',
	  '\u0139': 'L',  '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
	  '\u013a': 'l',  '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
	  '\u0143': 'N',  '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
	  '\u0144': 'n',  '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
	  '\u014c': 'O',  '\u014e': 'O', '\u0150': 'O',
	  '\u014d': 'o',  '\u014f': 'o', '\u0151': 'o',
	  '\u0154': 'R',  '\u0156': 'R', '\u0158': 'R',
	  '\u0155': 'r',  '\u0157': 'r', '\u0159': 'r',
	  '\u015a': 'S',  '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
	  '\u015b': 's',  '\u015d': 's', '\u015f': 's', '\u0161': 's',
	  '\u0162': 'T',  '\u0164': 'T', '\u0166': 'T',
	  '\u0163': 't',  '\u0165': 't', '\u0167': 't',
	  '\u0168': 'U',  '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
	  '\u0169': 'u',  '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
	  '\u0174': 'W',  '\u0175': 'w',
	  '\u0176': 'Y',  '\u0177': 'y', '\u0178': 'Y',
	  '\u0179': 'Z',  '\u017b': 'Z', '\u017d': 'Z',
	  '\u017a': 'z',  '\u017c': 'z', '\u017e': 'z',
	  '\u0132': 'IJ', '\u0133': 'ij',
	  '\u0152': 'Oe', '\u0153': 'oe',
	  '\u0149': "'n", '\u017f': 'ss'
	};

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/**
	 * A specialized version of `_.reduce` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @param {*} [accumulator] The initial value.
	 * @param {boolean} [initAccum] Specify using the first element of `array` as
	 *  the initial value.
	 * @returns {*} Returns the accumulated value.
	 */
	function arrayReduce(array, iteratee, accumulator, initAccum) {
	  var index = -1,
	      length = array ? array.length : 0;
	  while (++index < length) {
	    accumulator = iteratee(accumulator, array[index], index, array);
	  }
	  return accumulator;
	}

	/**
	 * Converts an ASCII `string` to an array.
	 *
	 * @private
	 * @param {string} string The string to convert.
	 * @returns {Array} Returns the converted array.
	 */
	function asciiToArray(string) {
	  return string.split('');
	}

	/**
	 * Splits an ASCII `string` into an array of its words.
	 *
	 * @private
	 * @param {string} The string to inspect.
	 * @returns {Array} Returns the words of `string`.
	 */
	function asciiWords(string) {
	  return string.match(reAsciiWord) || [];
	}

	/**
	 * The base implementation of `_.propertyOf` without support for deep paths.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Function} Returns the new accessor function.
	 */
	function basePropertyOf(object) {
	  return function(key) {
	    return object == null ? undefined : object[key];
	  };
	}

	/**
	 * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
	 * letters to basic Latin letters.
	 *
	 * @private
	 * @param {string} letter The matched letter to deburr.
	 * @returns {string} Returns the deburred letter.
	 */
	var deburrLetter = basePropertyOf(deburredLetters);

	/**
	 * Checks if `string` contains Unicode symbols.
	 *
	 * @private
	 * @param {string} string The string to inspect.
	 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
	 */
	function hasUnicode(string) {
	  return reHasUnicode.test(string);
	}

	/**
	 * Checks if `string` contains a word composed of Unicode symbols.
	 *
	 * @private
	 * @param {string} string The string to inspect.
	 * @returns {boolean} Returns `true` if a word is found, else `false`.
	 */
	function hasUnicodeWord(string) {
	  return reHasUnicodeWord.test(string);
	}

	/**
	 * Converts `string` to an array.
	 *
	 * @private
	 * @param {string} string The string to convert.
	 * @returns {Array} Returns the converted array.
	 */
	function stringToArray(string) {
	  return hasUnicode(string)
	    ? unicodeToArray(string)
	    : asciiToArray(string);
	}

	/**
	 * Converts a Unicode `string` to an array.
	 *
	 * @private
	 * @param {string} string The string to convert.
	 * @returns {Array} Returns the converted array.
	 */
	function unicodeToArray(string) {
	  return string.match(reUnicode) || [];
	}

	/**
	 * Splits a Unicode `string` into an array of its words.
	 *
	 * @private
	 * @param {string} The string to inspect.
	 * @returns {Array} Returns the words of `string`.
	 */
	function unicodeWords(string) {
	  return string.match(reUnicodeWord) || [];
	}

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/** Built-in value references. */
	var Symbol = root.Symbol;

	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol ? Symbol.prototype : undefined,
	    symbolToString = symbolProto ? symbolProto.toString : undefined;

	/**
	 * The base implementation of `_.slice` without an iteratee call guard.
	 *
	 * @private
	 * @param {Array} array The array to slice.
	 * @param {number} [start=0] The start position.
	 * @param {number} [end=array.length] The end position.
	 * @returns {Array} Returns the slice of `array`.
	 */
	function baseSlice(array, start, end) {
	  var index = -1,
	      length = array.length;

	  if (start < 0) {
	    start = -start > length ? 0 : (length + start);
	  }
	  end = end > length ? length : end;
	  if (end < 0) {
	    end += length;
	  }
	  length = start > end ? 0 : ((end - start) >>> 0);
	  start >>>= 0;

	  var result = Array(length);
	  while (++index < length) {
	    result[index] = array[index + start];
	  }
	  return result;
	}

	/**
	 * The base implementation of `_.toString` which doesn't convert nullish
	 * values to empty strings.
	 *
	 * @private
	 * @param {*} value The value to process.
	 * @returns {string} Returns the string.
	 */
	function baseToString(value) {
	  // Exit early for strings to avoid a performance hit in some environments.
	  if (typeof value == 'string') {
	    return value;
	  }
	  if (isSymbol(value)) {
	    return symbolToString ? symbolToString.call(value) : '';
	  }
	  var result = (value + '');
	  return (result == '0' && (1 / value) == -Infinity) ? '-0' : result;
	}

	/**
	 * Casts `array` to a slice if it's needed.
	 *
	 * @private
	 * @param {Array} array The array to inspect.
	 * @param {number} start The start position.
	 * @param {number} [end=array.length] The end position.
	 * @returns {Array} Returns the cast slice.
	 */
	function castSlice(array, start, end) {
	  var length = array.length;
	  end = end === undefined ? length : end;
	  return (!start && end >= length) ? array : baseSlice(array, start, end);
	}

	/**
	 * Creates a function like `_.lowerFirst`.
	 *
	 * @private
	 * @param {string} methodName The name of the `String` case method to use.
	 * @returns {Function} Returns the new case function.
	 */
	function createCaseFirst(methodName) {
	  return function(string) {
	    string = toString(string);

	    var strSymbols = hasUnicode(string)
	      ? stringToArray(string)
	      : undefined;

	    var chr = strSymbols
	      ? strSymbols[0]
	      : string.charAt(0);

	    var trailing = strSymbols
	      ? castSlice(strSymbols, 1).join('')
	      : string.slice(1);

	    return chr[methodName]() + trailing;
	  };
	}

	/**
	 * Creates a function like `_.camelCase`.
	 *
	 * @private
	 * @param {Function} callback The function to combine each word.
	 * @returns {Function} Returns the new compounder function.
	 */
	function createCompounder(callback) {
	  return function(string) {
	    return arrayReduce(words(deburr(string).replace(reApos, '')), callback, '');
	  };
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && typeof value == 'object';
	}

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return typeof value == 'symbol' ||
	    (isObjectLike(value) && objectToString.call(value) == symbolTag);
	}

	/**
	 * Converts `value` to a string. An empty string is returned for `null`
	 * and `undefined` values. The sign of `-0` is preserved.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {string} Returns the string.
	 * @example
	 *
	 * _.toString(null);
	 * // => ''
	 *
	 * _.toString(-0);
	 * // => '-0'
	 *
	 * _.toString([1, 2, 3]);
	 * // => '1,2,3'
	 */
	function toString(value) {
	  return value == null ? '' : baseToString(value);
	}

	/**
	 * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to convert.
	 * @returns {string} Returns the camel cased string.
	 * @example
	 *
	 * _.camelCase('Foo Bar');
	 * // => 'fooBar'
	 *
	 * _.camelCase('--foo-bar--');
	 * // => 'fooBar'
	 *
	 * _.camelCase('__FOO_BAR__');
	 * // => 'fooBar'
	 */
	var camelCase = createCompounder(function(result, word, index) {
	  word = word.toLowerCase();
	  return result + (index ? capitalize(word) : word);
	});

	/**
	 * Converts the first character of `string` to upper case and the remaining
	 * to lower case.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to capitalize.
	 * @returns {string} Returns the capitalized string.
	 * @example
	 *
	 * _.capitalize('FRED');
	 * // => 'Fred'
	 */
	function capitalize(string) {
	  return upperFirst(toString(string).toLowerCase());
	}

	/**
	 * Deburrs `string` by converting
	 * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
	 * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
	 * letters to basic Latin letters and removing
	 * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to deburr.
	 * @returns {string} Returns the deburred string.
	 * @example
	 *
	 * _.deburr('déjà vu');
	 * // => 'deja vu'
	 */
	function deburr(string) {
	  string = toString(string);
	  return string && string.replace(reLatin, deburrLetter).replace(reComboMark, '');
	}

	/**
	 * Converts the first character of `string` to upper case.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category String
	 * @param {string} [string=''] The string to convert.
	 * @returns {string} Returns the converted string.
	 * @example
	 *
	 * _.upperFirst('fred');
	 * // => 'Fred'
	 *
	 * _.upperFirst('FRED');
	 * // => 'FRED'
	 */
	var upperFirst = createCaseFirst('toUpperCase');

	/**
	 * Splits `string` into an array of its words.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to inspect.
	 * @param {RegExp|string} [pattern] The pattern to match words.
	 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
	 * @returns {Array} Returns the words of `string`.
	 * @example
	 *
	 * _.words('fred, barney, & pebbles');
	 * // => ['fred', 'barney', 'pebbles']
	 *
	 * _.words('fred, barney, & pebbles', /[^, ]+/g);
	 * // => ['fred', 'barney', '&', 'pebbles']
	 */
	function words(string, pattern, guard) {
	  string = toString(string);
	  pattern = pattern;

	  if (pattern === undefined) {
	    return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
	  }
	  return string.match(pattern) || [];
	}

	lodash_camelcase = camelCase;
	return lodash_camelcase;
}

var hasRequiredLocalsConvention;

function requireLocalsConvention () {
	if (hasRequiredLocalsConvention) return localsConvention;
	hasRequiredLocalsConvention = 1;

	Object.defineProperty(localsConvention, "__esModule", {
	  value: true
	});
	localsConvention.makeLocalsConventionReducer = makeLocalsConventionReducer;

	var _lodash = _interopRequireDefault(/*@__PURE__*/ requireLodash_camelcase());

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function dashesCamelCase(string) {
	  return string.replace(/-+(\w)/g, (_, firstLetter) => firstLetter.toUpperCase());
	}

	function makeLocalsConventionReducer(localsConvention, inputFile) {
	  const isFunc = typeof localsConvention === "function";
	  return (tokens, [className, value]) => {
	    if (isFunc) {
	      const convention = localsConvention(className, value, inputFile);
	      tokens[convention] = value;
	      return tokens;
	    }

	    switch (localsConvention) {
	      case "camelCase":
	        tokens[className] = value;
	        tokens[(0, _lodash.default)(className)] = value;
	        break;

	      case "camelCaseOnly":
	        tokens[(0, _lodash.default)(className)] = value;
	        break;

	      case "dashes":
	        tokens[className] = value;
	        tokens[dashesCamelCase(className)] = value;
	        break;

	      case "dashesOnly":
	        tokens[dashesCamelCase(className)] = value;
	        break;
	    }

	    return tokens;
	  };
	}
	return localsConvention;
}

var FileSystemLoader = {};

var hasRequiredFileSystemLoader;

function requireFileSystemLoader () {
	if (hasRequiredFileSystemLoader) return FileSystemLoader;
	hasRequiredFileSystemLoader = 1;

	Object.defineProperty(FileSystemLoader, "__esModule", {
	  value: true
	});
	FileSystemLoader.default = void 0;

	var _postcss = _interopRequireDefault(require$$0$1);

	var _path = _interopRequireDefault(path$1);

	var _Parser = _interopRequireDefault(/*@__PURE__*/ requireParser$1());

	var _fs = /*@__PURE__*/ requireFs();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	// Initially copied from https://github.com/css-modules/css-modules-loader-core
	class Core {
	  constructor(plugins) {
	    this.plugins = plugins || Core.defaultPlugins;
	  }

	  async load(sourceString, sourcePath, trace, pathFetcher) {
	    const parser = new _Parser.default(pathFetcher, trace);
	    const plugins = this.plugins.concat([parser.plugin()]);
	    const result = await (0, _postcss.default)(plugins).process(sourceString, {
	      from: sourcePath
	    });
	    return {
	      injectableSource: result.css,
	      exportTokens: parser.exportTokens
	    };
	  }

	} // Sorts dependencies in the following way:
	// AAA comes before AA and A
	// AB comes after AA and before A
	// All Bs come after all As
	// This ensures that the files are always returned in the following order:
	// - In the order they were required, except
	// - After all their dependencies


	const traceKeySorter = (a, b) => {
	  if (a.length < b.length) {
	    return a < b.substring(0, a.length) ? -1 : 1;
	  }

	  if (a.length > b.length) {
	    return a.substring(0, b.length) <= b ? -1 : 1;
	  }

	  return a < b ? -1 : 1;
	};

	let FileSystemLoader$1 = class FileSystemLoader {
	  constructor(root, plugins, fileResolve) {
	    if (root === "/" && process.platform === "win32") {
	      const cwdDrive = process.cwd().slice(0, 3);

	      if (!/^[A-Za-z]:\\$/.test(cwdDrive)) {
	        throw new Error(`Failed to obtain root from "${process.cwd()}".`);
	      }

	      root = cwdDrive;
	    }

	    this.root = root;
	    this.fileResolve = fileResolve;
	    this.sources = {};
	    this.traces = {};
	    this.importNr = 0;
	    this.core = new Core(plugins);
	    this.tokensByFile = {};
	    this.fs = (0, _fs.getFileSystem)();
	  }

	  async fetch(_newPath, relativeTo, _trace) {
	    const newPath = _newPath.replace(/^["']|["']$/g, "");

	    const trace = _trace || String.fromCharCode(this.importNr++);

	    const useFileResolve = typeof this.fileResolve === "function";
	    const fileResolvedPath = useFileResolve ? await this.fileResolve(newPath, relativeTo) : await Promise.resolve();

	    if (fileResolvedPath && !_path.default.isAbsolute(fileResolvedPath)) {
	      throw new Error('The returned path from the "fileResolve" option must be absolute.');
	    }

	    const relativeDir = _path.default.dirname(relativeTo);

	    const rootRelativePath = fileResolvedPath || _path.default.resolve(relativeDir, newPath);

	    let fileRelativePath = fileResolvedPath || _path.default.resolve(_path.default.resolve(this.root, relativeDir), newPath); // if the path is not relative or absolute, try to resolve it in node_modules


	    if (!useFileResolve && newPath[0] !== "." && !_path.default.isAbsolute(newPath)) {
	      try {
	        fileRelativePath = require.resolve(newPath);
	      } catch (e) {// noop
	      }
	    }

	    const tokens = this.tokensByFile[fileRelativePath];
	    if (tokens) return tokens;
	    return new Promise((resolve, reject) => {
	      this.fs.readFile(fileRelativePath, "utf-8", async (err, source) => {
	        if (err) reject(err);
	        const {
	          injectableSource,
	          exportTokens
	        } = await this.core.load(source, rootRelativePath, trace, this.fetch.bind(this));
	        this.sources[fileRelativePath] = injectableSource;
	        this.traces[trace] = fileRelativePath;
	        this.tokensByFile[fileRelativePath] = exportTokens;
	        resolve(exportTokens);
	      });
	    });
	  }

	  get finalSource() {
	    const traces = this.traces;
	    const sources = this.sources;
	    let written = new Set();
	    return Object.keys(traces).sort(traceKeySorter).map(key => {
	      const filename = traces[key];

	      if (written.has(filename)) {
	        return null;
	      }

	      written.add(filename);
	      return sources[filename];
	    }).join("");
	  }

	};

	FileSystemLoader.default = FileSystemLoader$1;
	return FileSystemLoader;
}

var scoping = {};

var src$3 = {exports: {}};

var topologicalSort_1;
var hasRequiredTopologicalSort;

function requireTopologicalSort () {
	if (hasRequiredTopologicalSort) return topologicalSort_1;
	hasRequiredTopologicalSort = 1;
	const PERMANENT_MARKER = 2;
	const TEMPORARY_MARKER = 1;

	function createError(node, graph) {
	  const er = new Error("Nondeterministic import's order");

	  const related = graph[node];
	  const relatedNode = related.find(
	    (relatedNode) => graph[relatedNode].indexOf(node) > -1
	  );

	  er.nodes = [node, relatedNode];

	  return er;
	}

	function walkGraph(node, graph, state, result, strict) {
	  if (state[node] === PERMANENT_MARKER) {
	    return;
	  }

	  if (state[node] === TEMPORARY_MARKER) {
	    if (strict) {
	      return createError(node, graph);
	    }

	    return;
	  }

	  state[node] = TEMPORARY_MARKER;

	  const children = graph[node];
	  const length = children.length;

	  for (let i = 0; i < length; ++i) {
	    const error = walkGraph(children[i], graph, state, result, strict);

	    if (error instanceof Error) {
	      return error;
	    }
	  }

	  state[node] = PERMANENT_MARKER;

	  result.push(node);
	}

	function topologicalSort(graph, strict) {
	  const result = [];
	  const state = {};

	  const nodes = Object.keys(graph);
	  const length = nodes.length;

	  for (let i = 0; i < length; ++i) {
	    const er = walkGraph(nodes[i], graph, state, result, strict);

	    if (er instanceof Error) {
	      return er;
	    }
	  }

	  return result;
	}

	topologicalSort_1 = topologicalSort;
	return topologicalSort_1;
}

var hasRequiredSrc$3;

function requireSrc$3 () {
	if (hasRequiredSrc$3) return src$3.exports;
	hasRequiredSrc$3 = 1;
	const topologicalSort = /*@__PURE__*/ requireTopologicalSort();

	const matchImports = /^(.+?)\s+from\s+(?:"([^"]+)"|'([^']+)'|(global))$/;
	const icssImport = /^:import\((?:"([^"]+)"|'([^']+)')\)/;

	const VISITED_MARKER = 1;

	/**
	 * :import('G') {}
	 *
	 * Rule
	 *   composes: ... from 'A'
	 *   composes: ... from 'B'

	 * Rule
	 *   composes: ... from 'A'
	 *   composes: ... from 'A'
	 *   composes: ... from 'C'
	 *
	 * Results in:
	 *
	 * graph: {
	 *   G: [],
	 *   A: [],
	 *   B: ['A'],
	 *   C: ['A'],
	 * }
	 */
	function addImportToGraph(importId, parentId, graph, visited) {
	  const siblingsId = parentId + "_" + "siblings";
	  const visitedId = parentId + "_" + importId;

	  if (visited[visitedId] !== VISITED_MARKER) {
	    if (!Array.isArray(visited[siblingsId])) {
	      visited[siblingsId] = [];
	    }

	    const siblings = visited[siblingsId];

	    if (Array.isArray(graph[importId])) {
	      graph[importId] = graph[importId].concat(siblings);
	    } else {
	      graph[importId] = siblings.slice();
	    }

	    visited[visitedId] = VISITED_MARKER;

	    siblings.push(importId);
	  }
	}

	src$3.exports = (options = {}) => {
	  let importIndex = 0;
	  const createImportedName =
	    typeof options.createImportedName !== "function"
	      ? (importName /*, path*/) =>
	          `i__imported_${importName.replace(/\W/g, "_")}_${importIndex++}`
	      : options.createImportedName;
	  const failOnWrongOrder = options.failOnWrongOrder;

	  return {
	    postcssPlugin: "postcss-modules-extract-imports",
	    prepare() {
	      const graph = {};
	      const visited = {};
	      const existingImports = {};
	      const importDecls = {};
	      const imports = {};

	      return {
	        Once(root, postcss) {
	          // Check the existing imports order and save refs
	          root.walkRules((rule) => {
	            const matches = icssImport.exec(rule.selector);

	            if (matches) {
	              const [, /*match*/ doubleQuotePath, singleQuotePath] = matches;
	              const importPath = doubleQuotePath || singleQuotePath;

	              addImportToGraph(importPath, "root", graph, visited);

	              existingImports[importPath] = rule;
	            }
	          });

	          root.walkDecls(/^composes$/, (declaration) => {
	            const multiple = declaration.value.split(",");
	            const values = [];

	            multiple.forEach((value) => {
	              const matches = value.trim().match(matchImports);

	              if (!matches) {
	                values.push(value);

	                return;
	              }

	              let tmpSymbols;
	              let [
	                ,
	                /*match*/ symbols,
	                doubleQuotePath,
	                singleQuotePath,
	                global,
	              ] = matches;

	              if (global) {
	                // Composing globals simply means changing these classes to wrap them in global(name)
	                tmpSymbols = symbols.split(/\s+/).map((s) => `global(${s})`);
	              } else {
	                const importPath = doubleQuotePath || singleQuotePath;

	                let parent = declaration.parent;
	                let parentIndexes = "";

	                while (parent.type !== "root") {
	                  parentIndexes =
	                    parent.parent.index(parent) + "_" + parentIndexes;
	                  parent = parent.parent;
	                }

	                const { selector } = declaration.parent;
	                const parentRule = `_${parentIndexes}${selector}`;

	                addImportToGraph(importPath, parentRule, graph, visited);

	                importDecls[importPath] = declaration;
	                imports[importPath] = imports[importPath] || {};

	                tmpSymbols = symbols.split(/\s+/).map((s) => {
	                  if (!imports[importPath][s]) {
	                    imports[importPath][s] = createImportedName(s, importPath);
	                  }

	                  return imports[importPath][s];
	                });
	              }

	              values.push(tmpSymbols.join(" "));
	            });

	            declaration.value = values.join(", ");
	          });

	          const importsOrder = topologicalSort(graph, failOnWrongOrder);

	          if (importsOrder instanceof Error) {
	            const importPath = importsOrder.nodes.find((importPath) =>
	              // eslint-disable-next-line no-prototype-builtins
	              importDecls.hasOwnProperty(importPath)
	            );
	            const decl = importDecls[importPath];

	            throw decl.error(
	              "Failed to resolve order of composed modules " +
	                importsOrder.nodes
	                  .map((importPath) => "`" + importPath + "`")
	                  .join(", ") +
	                ".",
	              {
	                plugin: "postcss-modules-extract-imports",
	                word: "composes",
	              }
	            );
	          }

	          let lastImportRule;

	          importsOrder.forEach((path) => {
	            const importedSymbols = imports[path];
	            let rule = existingImports[path];

	            if (!rule && importedSymbols) {
	              rule = postcss.rule({
	                selector: `:import("${path}")`,
	                raws: { after: "\n" },
	              });

	              if (lastImportRule) {
	                root.insertAfter(lastImportRule, rule);
	              } else {
	                root.prepend(rule);
	              }
	            }

	            lastImportRule = rule;

	            if (!importedSymbols) {
	              return;
	            }

	            Object.keys(importedSymbols).forEach((importedSymbol) => {
	              rule.append(
	                postcss.decl({
	                  value: importedSymbol,
	                  prop: importedSymbols[importedSymbol],
	                  raws: { before: "\n  " },
	                })
	              );
	            });
	          });
	        },
	      };
	    },
	  };
	};

	src$3.exports.postcss = true;
	return src$3.exports;
}

var wasmHash = {exports: {}};

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var hasRequiredWasmHash;

function requireWasmHash () {
	if (hasRequiredWasmHash) return wasmHash.exports;
	hasRequiredWasmHash = 1;

	// 65536 is the size of a wasm memory page
	// 64 is the maximum chunk size for every possible wasm hash implementation
	// 4 is the maximum number of bytes per char for string encoding (max is utf-8)
	// ~3 makes sure that it's always a block of 4 chars, so avoid partially encoded bytes for base64
	const MAX_SHORT_STRING = Math.floor((65536 - 64) / 4) & -4;

	class WasmHash {
	  /**
	   * @param {WebAssembly.Instance} instance wasm instance
	   * @param {WebAssembly.Instance[]} instancesPool pool of instances
	   * @param {number} chunkSize size of data chunks passed to wasm
	   * @param {number} digestSize size of digest returned by wasm
	   */
	  constructor(instance, instancesPool, chunkSize, digestSize) {
	    const exports$1 = /** @type {any} */ (instance.exports);

	    exports$1.init();

	    this.exports = exports$1;
	    this.mem = Buffer.from(exports$1.memory.buffer, 0, 65536);
	    this.buffered = 0;
	    this.instancesPool = instancesPool;
	    this.chunkSize = chunkSize;
	    this.digestSize = digestSize;
	  }

	  reset() {
	    this.buffered = 0;
	    this.exports.init();
	  }

	  /**
	   * @param {Buffer | string} data data
	   * @param {BufferEncoding=} encoding encoding
	   * @returns {this} itself
	   */
	  update(data, encoding) {
	    if (typeof data === "string") {
	      while (data.length > MAX_SHORT_STRING) {
	        this._updateWithShortString(data.slice(0, MAX_SHORT_STRING), encoding);
	        data = data.slice(MAX_SHORT_STRING);
	      }

	      this._updateWithShortString(data, encoding);

	      return this;
	    }

	    this._updateWithBuffer(data);

	    return this;
	  }

	  /**
	   * @param {string} data data
	   * @param {BufferEncoding=} encoding encoding
	   * @returns {void}
	   */
	  _updateWithShortString(data, encoding) {
	    const { exports: exports$1, buffered, mem, chunkSize } = this;

	    let endPos;

	    if (data.length < 70) {
	      if (!encoding || encoding === "utf-8" || encoding === "utf8") {
	        endPos = buffered;
	        for (let i = 0; i < data.length; i++) {
	          const cc = data.charCodeAt(i);

	          if (cc < 0x80) {
	            mem[endPos++] = cc;
	          } else if (cc < 0x800) {
	            mem[endPos] = (cc >> 6) | 0xc0;
	            mem[endPos + 1] = (cc & 0x3f) | 0x80;
	            endPos += 2;
	          } else {
	            // bail-out for weird chars
	            endPos += mem.write(data.slice(i), endPos, encoding);
	            break;
	          }
	        }
	      } else if (encoding === "latin1") {
	        endPos = buffered;

	        for (let i = 0; i < data.length; i++) {
	          const cc = data.charCodeAt(i);

	          mem[endPos++] = cc;
	        }
	      } else {
	        endPos = buffered + mem.write(data, buffered, encoding);
	      }
	    } else {
	      endPos = buffered + mem.write(data, buffered, encoding);
	    }

	    if (endPos < chunkSize) {
	      this.buffered = endPos;
	    } else {
	      const l = endPos & ~(this.chunkSize - 1);

	      exports$1.update(l);

	      const newBuffered = endPos - l;

	      this.buffered = newBuffered;

	      if (newBuffered > 0) {
	        mem.copyWithin(0, l, endPos);
	      }
	    }
	  }

	  /**
	   * @param {Buffer} data data
	   * @returns {void}
	   */
	  _updateWithBuffer(data) {
	    const { exports: exports$1, buffered, mem } = this;
	    const length = data.length;

	    if (buffered + length < this.chunkSize) {
	      data.copy(mem, buffered, 0, length);

	      this.buffered += length;
	    } else {
	      const l = (buffered + length) & ~(this.chunkSize - 1);

	      if (l > 65536) {
	        let i = 65536 - buffered;

	        data.copy(mem, buffered, 0, i);
	        exports$1.update(65536);

	        const stop = l - buffered - 65536;

	        while (i < stop) {
	          data.copy(mem, 0, i, i + 65536);
	          exports$1.update(65536);
	          i += 65536;
	        }

	        data.copy(mem, 0, i, l - buffered);

	        exports$1.update(l - buffered - i);
	      } else {
	        data.copy(mem, buffered, 0, l - buffered);

	        exports$1.update(l);
	      }

	      const newBuffered = length + buffered - l;

	      this.buffered = newBuffered;

	      if (newBuffered > 0) {
	        data.copy(mem, 0, length - newBuffered, length);
	      }
	    }
	  }

	  digest(type) {
	    const { exports: exports$1, buffered, mem, digestSize } = this;

	    exports$1.final(buffered);

	    this.instancesPool.push(this);

	    const hex = mem.toString("latin1", 0, digestSize);

	    if (type === "hex") {
	      return hex;
	    }

	    if (type === "binary" || !type) {
	      return Buffer.from(hex, "hex");
	    }

	    return Buffer.from(hex, "hex").toString(type);
	  }
	}

	const create = (wasmModule, instancesPool, chunkSize, digestSize) => {
	  if (instancesPool.length > 0) {
	    const old = instancesPool.pop();

	    old.reset();

	    return old;
	  } else {
	    return new WasmHash(
	      new WebAssembly.Instance(wasmModule),
	      instancesPool,
	      chunkSize,
	      digestSize
	    );
	  }
	};

	wasmHash.exports = create;
	wasmHash.exports.MAX_SHORT_STRING = MAX_SHORT_STRING;
	return wasmHash.exports;
}

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var xxhash64_1;
var hasRequiredXxhash64;

function requireXxhash64 () {
	if (hasRequiredXxhash64) return xxhash64_1;
	hasRequiredXxhash64 = 1;

	const create = /*@__PURE__*/ requireWasmHash();

	//#region wasm code: xxhash64 (../../../assembly/hash/xxhash64.asm.ts) --initialMemory 1
	const xxhash64 = new WebAssembly.Module(
	  Buffer.from(
	    // 1173 bytes
	    "AGFzbQEAAAABCAJgAX8AYAAAAwQDAQAABQMBAAEGGgV+AUIAC34BQgALfgFCAAt+AUIAC34BQgALByIEBGluaXQAAAZ1cGRhdGUAAQVmaW5hbAACBm1lbW9yeQIACrUIAzAAQtbrgu7q/Yn14AAkAELP1tO+0ser2UIkAUIAJAJC+erQ0OfJoeThACQDQgAkBAvUAQIBfwR+IABFBEAPCyMEIACtfCQEIwAhAiMBIQMjAiEEIwMhBQNAIAIgASkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiECIAMgASkDCELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEDIAQgASkDEELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEEIAUgASkDGELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEFIAAgAUEgaiIBSw0ACyACJAAgAyQBIAQkAiAFJAMLqwYCAX8EfiMEQgBSBH4jACICQgGJIwEiA0IHiXwjAiIEQgyJfCMDIgVCEol8IAJCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gA0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSAEQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IAVCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0FQsXP2bLx5brqJwsjBCAArXx8IQIDQCABQQhqIABNBEAgAiABKQMAQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQhuJQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IQIgAUEIaiEBDAELCyABQQRqIABNBEACfyACIAE1AgBCh5Wvr5i23puef36FQheJQs/W077Sx6vZQn5C+fPd8Zn2masWfCECIAFBBGoLIQELA0AgACABRwRAIAIgATEAAELFz9my8eW66id+hUILiUKHla+vmLbem55/fiECIAFBAWohAQwBCwtBACACIAJCIYiFQs/W077Sx6vZQn4iAiACQh2IhUL5893xmfaZqxZ+IgIgAkIgiIUiAkIgiCIDQv//A4NCIIYgA0KAgPz/D4NCEIiEIgNC/4GAgPAfg0IQhiADQoD+g4CA4D+DQgiIhCIDQo+AvIDwgcAHg0IIhiADQvCBwIeAnoD4AINCBIiEIgNChoyYsODAgYMGfEIEiEKBgoSIkKDAgAGDQid+IANCsODAgYOGjJgwhHw3AwBBCCACQv////8PgyICQv//A4NCIIYgAkKAgPz/D4NCEIiEIgJC/4GAgPAfg0IQhiACQoD+g4CA4D+DQgiIhCICQo+AvIDwgcAHg0IIhiACQvCBwIeAnoD4AINCBIiEIgJChoyYsODAgYMGfEIEiEKBgoSIkKDAgAGDQid+IAJCsODAgYOGjJgwhHw3AwAL",
	    "base64"
	  )
	);
	//#endregion

	xxhash64_1 = create.bind(null, xxhash64, [], 32, 16);
	return xxhash64_1;
}

var BatchedHash_1;
var hasRequiredBatchedHash;

function requireBatchedHash () {
	if (hasRequiredBatchedHash) return BatchedHash_1;
	hasRequiredBatchedHash = 1;
	const MAX_SHORT_STRING = /*@__PURE__*/ requireWasmHash().MAX_SHORT_STRING;

	class BatchedHash {
	  constructor(hash) {
	    this.string = undefined;
	    this.encoding = undefined;
	    this.hash = hash;
	  }

	  /**
	   * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	   * @param {string|Buffer} data data
	   * @param {string=} inputEncoding data encoding
	   * @returns {this} updated hash
	   */
	  update(data, inputEncoding) {
	    if (this.string !== undefined) {
	      if (
	        typeof data === "string" &&
	        inputEncoding === this.encoding &&
	        this.string.length + data.length < MAX_SHORT_STRING
	      ) {
	        this.string += data;

	        return this;
	      }

	      this.hash.update(this.string, this.encoding);
	      this.string = undefined;
	    }

	    if (typeof data === "string") {
	      if (
	        data.length < MAX_SHORT_STRING &&
	        // base64 encoding is not valid since it may contain padding chars
	        (!inputEncoding || !inputEncoding.startsWith("ba"))
	      ) {
	        this.string = data;
	        this.encoding = inputEncoding;
	      } else {
	        this.hash.update(data, inputEncoding);
	      }
	    } else {
	      this.hash.update(data);
	    }

	    return this;
	  }

	  /**
	   * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	   * @param {string=} encoding encoding of the return value
	   * @returns {string|Buffer} digest
	   */
	  digest(encoding) {
	    if (this.string !== undefined) {
	      this.hash.update(this.string, this.encoding);
	    }

	    return this.hash.digest(encoding);
	  }
	}

	BatchedHash_1 = BatchedHash;
	return BatchedHash_1;
}

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var md4_1;
var hasRequiredMd4;

function requireMd4 () {
	if (hasRequiredMd4) return md4_1;
	hasRequiredMd4 = 1;

	const create = /*@__PURE__*/ requireWasmHash();

	//#region wasm code: md4 (../../../assembly/hash/md4.asm.ts) --initialMemory 1
	const md4 = new WebAssembly.Module(
	  Buffer.from(
	    // 2150 bytes
	    "AGFzbQEAAAABCAJgAX8AYAAAAwUEAQAAAAUDAQABBhoFfwFBAAt/AUEAC38BQQALfwFBAAt/AUEACwciBARpbml0AAAGdXBkYXRlAAIFZmluYWwAAwZtZW1vcnkCAAqFEAQmAEGBxpS6BiQBQYnXtv5+JAJB/rnrxXkkA0H2qMmBASQEQQAkAAvMCgEYfyMBIQojAiEGIwMhByMEIQgDQCAAIAVLBEAgBSgCCCINIAcgBiAFKAIEIgsgCCAHIAUoAgAiDCAKIAggBiAHIAhzcXNqakEDdyIDIAYgB3Nxc2pqQQd3IgEgAyAGc3FzampBC3chAiAFKAIUIg8gASACIAUoAhAiCSADIAEgBSgCDCIOIAYgAyACIAEgA3Nxc2pqQRN3IgQgASACc3FzampBA3ciAyACIARzcXNqakEHdyEBIAUoAiAiEiADIAEgBSgCHCIRIAQgAyAFKAIYIhAgAiAEIAEgAyAEc3FzampBC3ciAiABIANzcXNqakETdyIEIAEgAnNxc2pqQQN3IQMgBSgCLCIVIAQgAyAFKAIoIhQgAiAEIAUoAiQiEyABIAIgAyACIARzcXNqakEHdyIBIAMgBHNxc2pqQQt3IgIgASADc3FzampBE3chBCAPIBAgCSAVIBQgEyAFKAI4IhYgAiAEIAUoAjQiFyABIAIgBSgCMCIYIAMgASAEIAEgAnNxc2pqQQN3IgEgAiAEc3FzampBB3ciAiABIARzcXNqakELdyIDIAkgAiAMIAEgBSgCPCIJIAQgASADIAEgAnNxc2pqQRN3IgEgAiADcnEgAiADcXJqakGZ84nUBWpBA3ciAiABIANycSABIANxcmpqQZnzidQFakEFdyIEIAEgAnJxIAEgAnFyaiASakGZ84nUBWpBCXciAyAPIAQgCyACIBggASADIAIgBHJxIAIgBHFyampBmfOJ1AVqQQ13IgEgAyAEcnEgAyAEcXJqakGZ84nUBWpBA3ciAiABIANycSABIANxcmpqQZnzidQFakEFdyIEIAEgAnJxIAEgAnFyampBmfOJ1AVqQQl3IgMgECAEIAIgFyABIAMgAiAEcnEgAiAEcXJqakGZ84nUBWpBDXciASADIARycSADIARxcmogDWpBmfOJ1AVqQQN3IgIgASADcnEgASADcXJqakGZ84nUBWpBBXciBCABIAJycSABIAJxcmpqQZnzidQFakEJdyIDIBEgBCAOIAIgFiABIAMgAiAEcnEgAiAEcXJqakGZ84nUBWpBDXciASADIARycSADIARxcmpqQZnzidQFakEDdyICIAEgA3JxIAEgA3FyampBmfOJ1AVqQQV3IgQgASACcnEgASACcXJqakGZ84nUBWpBCXciAyAMIAIgAyAJIAEgAyACIARycSACIARxcmpqQZnzidQFakENdyIBcyAEc2pqQaHX5/YGakEDdyICIAQgASACcyADc2ogEmpBodfn9gZqQQl3IgRzIAFzampBodfn9gZqQQt3IgMgAiADIBggASADIARzIAJzampBodfn9gZqQQ93IgFzIARzaiANakGh1+f2BmpBA3ciAiAUIAQgASACcyADc2pqQaHX5/YGakEJdyIEcyABc2pqQaHX5/YGakELdyIDIAsgAiADIBYgASADIARzIAJzampBodfn9gZqQQ93IgFzIARzampBodfn9gZqQQN3IgIgEyAEIAEgAnMgA3NqakGh1+f2BmpBCXciBHMgAXNqakGh1+f2BmpBC3chAyAKIA4gAiADIBcgASADIARzIAJzampBodfn9gZqQQ93IgFzIARzampBodfn9gZqQQN3IgJqIQogBiAJIAEgESADIAIgFSAEIAEgAnMgA3NqakGh1+f2BmpBCXciBHMgAXNqakGh1+f2BmpBC3ciAyAEcyACc2pqQaHX5/YGakEPd2ohBiADIAdqIQcgBCAIaiEIIAVBQGshBQwBCwsgCiQBIAYkAiAHJAMgCCQECw0AIAAQASMAIABqJAAL/wQCA38BfiMAIABqrUIDhiEEIABByABqQUBxIgJBCGshAyAAIgFBAWohACABQYABOgAAA0AgACACSUEAIABBB3EbBEAgAEEAOgAAIABBAWohAAwBCwsDQCAAIAJJBEAgAEIANwMAIABBCGohAAwBCwsgAyAENwMAIAIQAUEAIwGtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEIIwKtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEQIwOtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEYIwStIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAAs=",
	    "base64"
	  )
	);
	//#endregion

	md4_1 = create.bind(null, md4, [], 64, 32);
	return md4_1;
}

var BulkUpdateDecorator_1;
var hasRequiredBulkUpdateDecorator;

function requireBulkUpdateDecorator () {
	if (hasRequiredBulkUpdateDecorator) return BulkUpdateDecorator_1;
	hasRequiredBulkUpdateDecorator = 1;
	const BULK_SIZE = 2000;

	// We are using an object instead of a Map as this will stay static during the runtime
	// so access to it can be optimized by v8
	const digestCaches = {};

	class BulkUpdateDecorator {
	  /**
	   * @param {Hash | function(): Hash} hashOrFactory function to create a hash
	   * @param {string=} hashKey key for caching
	   */
	  constructor(hashOrFactory, hashKey) {
	    this.hashKey = hashKey;

	    if (typeof hashOrFactory === "function") {
	      this.hashFactory = hashOrFactory;
	      this.hash = undefined;
	    } else {
	      this.hashFactory = undefined;
	      this.hash = hashOrFactory;
	    }

	    this.buffer = "";
	  }

	  /**
	   * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	   * @param {string|Buffer} data data
	   * @param {string=} inputEncoding data encoding
	   * @returns {this} updated hash
	   */
	  update(data, inputEncoding) {
	    if (
	      inputEncoding !== undefined ||
	      typeof data !== "string" ||
	      data.length > BULK_SIZE
	    ) {
	      if (this.hash === undefined) {
	        this.hash = this.hashFactory();
	      }

	      if (this.buffer.length > 0) {
	        this.hash.update(this.buffer);
	        this.buffer = "";
	      }

	      this.hash.update(data, inputEncoding);
	    } else {
	      this.buffer += data;

	      if (this.buffer.length > BULK_SIZE) {
	        if (this.hash === undefined) {
	          this.hash = this.hashFactory();
	        }

	        this.hash.update(this.buffer);
	        this.buffer = "";
	      }
	    }

	    return this;
	  }

	  /**
	   * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	   * @param {string=} encoding encoding of the return value
	   * @returns {string|Buffer} digest
	   */
	  digest(encoding) {
	    let digestCache;

	    const buffer = this.buffer;

	    if (this.hash === undefined) {
	      // short data for hash, we can use caching
	      const cacheKey = `${this.hashKey}-${encoding}`;

	      digestCache = digestCaches[cacheKey];

	      if (digestCache === undefined) {
	        digestCache = digestCaches[cacheKey] = new Map();
	      }

	      const cacheEntry = digestCache.get(buffer);

	      if (cacheEntry !== undefined) {
	        return cacheEntry;
	      }

	      this.hash = this.hashFactory();
	    }

	    if (buffer.length > 0) {
	      this.hash.update(buffer);
	    }

	    const digestResult = this.hash.digest(encoding);

	    if (digestCache !== undefined) {
	      digestCache.set(buffer, digestResult);
	    }

	    return digestResult;
	  }
	}

	BulkUpdateDecorator_1 = BulkUpdateDecorator;
	return BulkUpdateDecorator_1;
}

var getHashDigest_1;
var hasRequiredGetHashDigest;

function requireGetHashDigest () {
	if (hasRequiredGetHashDigest) return getHashDigest_1;
	hasRequiredGetHashDigest = 1;

	const baseEncodeTables = {
	  26: "abcdefghijklmnopqrstuvwxyz",
	  32: "123456789abcdefghjkmnpqrstuvwxyz", // no 0lio
	  36: "0123456789abcdefghijklmnopqrstuvwxyz",
	  49: "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", // no lIO
	  52: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
	  58: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", // no 0lIO
	  62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
	  64: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
	};

	/**
	 * @param {Uint32Array} uint32Array Treated as a long base-0x100000000 number, little endian
	 * @param {number} divisor The divisor
	 * @return {number} Modulo (remainder) of the division
	 */
	function divmod32(uint32Array, divisor) {
	  let carry = 0;
	  for (let i = uint32Array.length - 1; i >= 0; i--) {
	    const value = carry * 0x100000000 + uint32Array[i];
	    carry = value % divisor;
	    uint32Array[i] = Math.floor(value / divisor);
	  }
	  return carry;
	}

	function encodeBufferToBase(buffer, base, length) {
	  const encodeTable = baseEncodeTables[base];

	  if (!encodeTable) {
	    throw new Error("Unknown encoding base" + base);
	  }

	  // Input bits are only enough to generate this many characters
	  const limit = Math.ceil((buffer.length * 8) / Math.log2(base));
	  length = Math.min(length, limit);

	  // Most of the crypto digests (if not all) has length a multiple of 4 bytes.
	  // Fewer numbers in the array means faster math.
	  const uint32Array = new Uint32Array(Math.ceil(buffer.length / 4));

	  // Make sure the input buffer data is copied and is not mutated by reference.
	  // divmod32() would corrupt the BulkUpdateDecorator cache otherwise.
	  buffer.copy(Buffer.from(uint32Array.buffer));

	  let output = "";

	  for (let i = 0; i < length; i++) {
	    output = encodeTable[divmod32(uint32Array, base)] + output;
	  }

	  return output;
	}

	let crypto = undefined;
	let createXXHash64 = undefined;
	let createMd4 = undefined;
	let BatchedHash = undefined;
	let BulkUpdateDecorator = undefined;

	function getHashDigest(buffer, algorithm, digestType, maxLength) {
	  algorithm = algorithm || "xxhash64";
	  maxLength = maxLength || 9999;

	  let hash;

	  if (algorithm === "xxhash64") {
	    if (createXXHash64 === undefined) {
	      createXXHash64 = /*@__PURE__*/ requireXxhash64();

	      if (BatchedHash === undefined) {
	        BatchedHash = /*@__PURE__*/ requireBatchedHash();
	      }
	    }

	    hash = new BatchedHash(createXXHash64());
	  } else if (algorithm === "md4") {
	    if (createMd4 === undefined) {
	      createMd4 = /*@__PURE__*/ requireMd4();

	      if (BatchedHash === undefined) {
	        BatchedHash = /*@__PURE__*/ requireBatchedHash();
	      }
	    }

	    hash = new BatchedHash(createMd4());
	  } else if (algorithm === "native-md4") {
	    if (typeof crypto === "undefined") {
	      crypto = require("crypto");

	      if (BulkUpdateDecorator === undefined) {
	        BulkUpdateDecorator = /*@__PURE__*/ requireBulkUpdateDecorator();
	      }
	    }

	    hash = new BulkUpdateDecorator(() => crypto.createHash("md4"), "md4");
	  } else {
	    if (typeof crypto === "undefined") {
	      crypto = require("crypto");

	      if (BulkUpdateDecorator === undefined) {
	        BulkUpdateDecorator = /*@__PURE__*/ requireBulkUpdateDecorator();
	      }
	    }

	    hash = new BulkUpdateDecorator(
	      () => crypto.createHash(algorithm),
	      algorithm
	    );
	  }

	  hash.update(buffer);

	  if (
	    digestType === "base26" ||
	    digestType === "base32" ||
	    digestType === "base36" ||
	    digestType === "base49" ||
	    digestType === "base52" ||
	    digestType === "base58" ||
	    digestType === "base62" ||
	    digestType === "base64safe"
	  ) {
	    return encodeBufferToBase(
	      hash.digest(),
	      digestType === "base64safe" ? 64 : digestType.substr(4),
	      maxLength
	    );
	  }

	  return hash.digest(digestType || "hex").substr(0, maxLength);
	}

	getHashDigest_1 = getHashDigest;
	return getHashDigest_1;
}

var interpolateName_1;
var hasRequiredInterpolateName;

function requireInterpolateName () {
	if (hasRequiredInterpolateName) return interpolateName_1;
	hasRequiredInterpolateName = 1;

	const path = path$1;
	const getHashDigest = /*@__PURE__*/ requireGetHashDigest();

	function interpolateName(loaderContext, name, options = {}) {
	  let filename;

	  const hasQuery =
	    loaderContext.resourceQuery && loaderContext.resourceQuery.length > 1;

	  if (typeof name === "function") {
	    filename = name(
	      loaderContext.resourcePath,
	      hasQuery ? loaderContext.resourceQuery : undefined
	    );
	  } else {
	    filename = name || "[hash].[ext]";
	  }

	  const context = options.context;
	  const content = options.content;
	  const regExp = options.regExp;

	  let ext = "bin";
	  let basename = "file";
	  let directory = "";
	  let folder = "";
	  let query = "";

	  if (loaderContext.resourcePath) {
	    const parsed = path.parse(loaderContext.resourcePath);
	    let resourcePath = loaderContext.resourcePath;

	    if (parsed.ext) {
	      ext = parsed.ext.substr(1);
	    }

	    if (parsed.dir) {
	      basename = parsed.name;
	      resourcePath = parsed.dir + path.sep;
	    }

	    if (typeof context !== "undefined") {
	      directory = path
	        .relative(context, resourcePath + "_")
	        .replace(/\\/g, "/")
	        .replace(/\.\.(\/)?/g, "_$1");
	      directory = directory.substr(0, directory.length - 1);
	    } else {
	      directory = resourcePath.replace(/\\/g, "/").replace(/\.\.(\/)?/g, "_$1");
	    }

	    if (directory.length <= 1) {
	      directory = "";
	    } else {
	      // directory.length > 1
	      folder = path.basename(directory);
	    }
	  }

	  if (loaderContext.resourceQuery && loaderContext.resourceQuery.length > 1) {
	    query = loaderContext.resourceQuery;

	    const hashIdx = query.indexOf("#");

	    if (hashIdx >= 0) {
	      query = query.substr(0, hashIdx);
	    }
	  }

	  let url = filename;

	  if (content) {
	    // Match hash template
	    url = url
	      // `hash` and `contenthash` are same in `loader-utils` context
	      // let's keep `hash` for backward compatibility
	      .replace(
	        /\[(?:([^[:\]]+):)?(?:hash|contenthash)(?::([a-z]+\d*(?:safe)?))?(?::(\d+))?\]/gi,
	        (all, hashType, digestType, maxLength) =>
	          getHashDigest(content, hashType, digestType, parseInt(maxLength, 10))
	      );
	  }

	  url = url
	    .replace(/\[ext\]/gi, () => ext)
	    .replace(/\[name\]/gi, () => basename)
	    .replace(/\[path\]/gi, () => directory)
	    .replace(/\[folder\]/gi, () => folder)
	    .replace(/\[query\]/gi, () => query);

	  if (regExp && loaderContext.resourcePath) {
	    const match = loaderContext.resourcePath.match(new RegExp(regExp));

	    match &&
	      match.forEach((matched, i) => {
	        url = url.replace(new RegExp("\\[" + i + "\\]", "ig"), matched);
	      });
	  }

	  if (
	    typeof loaderContext.options === "object" &&
	    typeof loaderContext.options.customInterpolateName === "function"
	  ) {
	    url = loaderContext.options.customInterpolateName.call(
	      loaderContext,
	      url,
	      name,
	      options
	    );
	  }

	  return url;
	}

	interpolateName_1 = interpolateName;
	return interpolateName_1;
}

var genericNames;
var hasRequiredGenericNames;

function requireGenericNames () {
	if (hasRequiredGenericNames) return genericNames;
	hasRequiredGenericNames = 1;

	var interpolateName = /*@__PURE__*/ requireInterpolateName();
	var path = path$1;

	/**
	 * @param  {string} pattern
	 * @param  {object} options
	 * @param  {string} options.context
	 * @param  {string} options.hashPrefix
	 * @return {function}
	 */
	genericNames = function createGenerator(pattern, options) {
	  options = options || {};
	  var context =
	    options && typeof options.context === "string"
	      ? options.context
	      : process.cwd();
	  var hashPrefix =
	    options && typeof options.hashPrefix === "string" ? options.hashPrefix : "";

	  /**
	   * @param  {string} localName Usually a class name
	   * @param  {string} filepath  Absolute path
	   * @return {string}
	   */
	  return function generate(localName, filepath) {
	    var name = pattern.replace(/\[local\]/gi, localName);
	    var loaderContext = {
	      resourcePath: filepath,
	    };

	    var loaderOptions = {
	      content:
	        hashPrefix +
	        path.relative(context, filepath).replace(/\\/g, "/") +
	        "\x00" +
	        localName,
	      context: context,
	    };

	    var genericName = interpolateName(loaderContext, name, loaderOptions);
	    return genericName
	      .replace(new RegExp("[^a-zA-Z0-9\\-_\u00A0-\uFFFF]", "g"), "-")
	      .replace(/^((-?[0-9])|--)/, "_$1");
	  };
	};
	return genericNames;
}

var src$2 = {exports: {}};

var dist = {exports: {}};

var processor = {exports: {}};

var parser = {exports: {}};

var root = {exports: {}};

var container = {exports: {}};

var node = {exports: {}};

var util = {};

var unesc = {exports: {}};

var hasRequiredUnesc;

function requireUnesc () {
	if (hasRequiredUnesc) return unesc.exports;
	hasRequiredUnesc = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = unesc;
		// Many thanks for this post which made this migration much easier.
		// https://mathiasbynens.be/notes/css-escapes

		/**
		 * 
		 * @param {string} str 
		 * @returns {[string, number]|undefined}
		 */
		function gobbleHex(str) {
		  var lower = str.toLowerCase();
		  var hex = '';
		  var spaceTerminated = false;
		  for (var i = 0; i < 6 && lower[i] !== undefined; i++) {
		    var code = lower.charCodeAt(i);
		    // check to see if we are dealing with a valid hex char [a-f|0-9]
		    var valid = code >= 97 && code <= 102 || code >= 48 && code <= 57;
		    // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		    spaceTerminated = code === 32;
		    if (!valid) {
		      break;
		    }
		    hex += lower[i];
		  }
		  if (hex.length === 0) {
		    return undefined;
		  }
		  var codePoint = parseInt(hex, 16);
		  var isSurrogate = codePoint >= 0xD800 && codePoint <= 0xDFFF;
		  // Add special case for
		  // "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
		  // https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
		  if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
		    return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
		  }
		  return [String.fromCodePoint(codePoint), hex.length + (spaceTerminated ? 1 : 0)];
		}
		var CONTAINS_ESCAPE = /\\/;
		function unesc(str) {
		  var needToProcess = CONTAINS_ESCAPE.test(str);
		  if (!needToProcess) {
		    return str;
		  }
		  var ret = "";
		  for (var i = 0; i < str.length; i++) {
		    if (str[i] === "\\") {
		      var gobbled = gobbleHex(str.slice(i + 1, i + 7));
		      if (gobbled !== undefined) {
		        ret += gobbled[0];
		        i += gobbled[1];
		        continue;
		      }

		      // Retain a pair of \\ if double escaped `\\\\`
		      // https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
		      if (str[i + 1] === "\\") {
		        ret += "\\";
		        i++;
		        continue;
		      }

		      // if \\ is at the end of the string retain it
		      // https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
		      if (str.length === i + 1) {
		        ret += str[i];
		      }
		      continue;
		    }
		    ret += str[i];
		  }
		  return ret;
		}
		module.exports = exports$1.default; 
	} (unesc, unesc.exports));
	return unesc.exports;
}

var getProp = {exports: {}};

var hasRequiredGetProp;

function requireGetProp () {
	if (hasRequiredGetProp) return getProp.exports;
	hasRequiredGetProp = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = getProp;
		function getProp(obj) {
		  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		    props[_key - 1] = arguments[_key];
		  }
		  while (props.length > 0) {
		    var prop = props.shift();
		    if (!obj[prop]) {
		      return undefined;
		    }
		    obj = obj[prop];
		  }
		  return obj;
		}
		module.exports = exports$1.default; 
	} (getProp, getProp.exports));
	return getProp.exports;
}

var ensureObject = {exports: {}};

var hasRequiredEnsureObject;

function requireEnsureObject () {
	if (hasRequiredEnsureObject) return ensureObject.exports;
	hasRequiredEnsureObject = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = ensureObject;
		function ensureObject(obj) {
		  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		    props[_key - 1] = arguments[_key];
		  }
		  while (props.length > 0) {
		    var prop = props.shift();
		    if (!obj[prop]) {
		      obj[prop] = {};
		    }
		    obj = obj[prop];
		  }
		}
		module.exports = exports$1.default; 
	} (ensureObject, ensureObject.exports));
	return ensureObject.exports;
}

var stripComments = {exports: {}};

var hasRequiredStripComments;

function requireStripComments () {
	if (hasRequiredStripComments) return stripComments.exports;
	hasRequiredStripComments = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = stripComments;
		function stripComments(str) {
		  var s = "";
		  var commentStart = str.indexOf("/*");
		  var lastEnd = 0;
		  while (commentStart >= 0) {
		    s = s + str.slice(lastEnd, commentStart);
		    var commentEnd = str.indexOf("*/", commentStart + 2);
		    if (commentEnd < 0) {
		      return s;
		    }
		    lastEnd = commentEnd + 2;
		    commentStart = str.indexOf("/*", lastEnd);
		  }
		  s = s + str.slice(lastEnd);
		  return s;
		}
		module.exports = exports$1.default; 
	} (stripComments, stripComments.exports));
	return stripComments.exports;
}

var hasRequiredUtil;

function requireUtil () {
	if (hasRequiredUtil) return util;
	hasRequiredUtil = 1;

	util.__esModule = true;
	util.unesc = util.stripComments = util.getProp = util.ensureObject = void 0;
	var _unesc = _interopRequireDefault(/*@__PURE__*/ requireUnesc());
	util.unesc = _unesc["default"];
	var _getProp = _interopRequireDefault(/*@__PURE__*/ requireGetProp());
	util.getProp = _getProp["default"];
	var _ensureObject = _interopRequireDefault(/*@__PURE__*/ requireEnsureObject());
	util.ensureObject = _ensureObject["default"];
	var _stripComments = _interopRequireDefault(/*@__PURE__*/ requireStripComments());
	util.stripComments = _stripComments["default"];
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	return util;
}

var hasRequiredNode;

function requireNode () {
	if (hasRequiredNode) return node.exports;
	hasRequiredNode = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _util = /*@__PURE__*/ requireUtil();
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		var cloneNode = function cloneNode(obj, parent) {
		  if (typeof obj !== 'object' || obj === null) {
		    return obj;
		  }
		  var cloned = new obj.constructor();
		  for (var i in obj) {
		    if (!obj.hasOwnProperty(i)) {
		      continue;
		    }
		    var value = obj[i];
		    var type = typeof value;
		    if (i === 'parent' && type === 'object') {
		      if (parent) {
		        cloned[i] = parent;
		      }
		    } else if (value instanceof Array) {
		      cloned[i] = value.map(function (j) {
		        return cloneNode(j, cloned);
		      });
		    } else {
		      cloned[i] = cloneNode(value, cloned);
		    }
		  }
		  return cloned;
		};
		var Node = /*#__PURE__*/function () {
		  function Node(opts) {
		    if (opts === void 0) {
		      opts = {};
		    }
		    Object.assign(this, opts);
		    this.spaces = this.spaces || {};
		    this.spaces.before = this.spaces.before || '';
		    this.spaces.after = this.spaces.after || '';
		  }
		  var _proto = Node.prototype;
		  _proto.remove = function remove() {
		    if (this.parent) {
		      this.parent.removeChild(this);
		    }
		    this.parent = undefined;
		    return this;
		  };
		  _proto.replaceWith = function replaceWith() {
		    if (this.parent) {
		      for (var index in arguments) {
		        this.parent.insertBefore(this, arguments[index]);
		      }
		      this.remove();
		    }
		    return this;
		  };
		  _proto.next = function next() {
		    return this.parent.at(this.parent.index(this) + 1);
		  };
		  _proto.prev = function prev() {
		    return this.parent.at(this.parent.index(this) - 1);
		  };
		  _proto.clone = function clone(overrides) {
		    if (overrides === void 0) {
		      overrides = {};
		    }
		    var cloned = cloneNode(this);
		    for (var name in overrides) {
		      cloned[name] = overrides[name];
		    }
		    return cloned;
		  }

		  /**
		   * Some non-standard syntax doesn't follow normal escaping rules for css.
		   * This allows non standard syntax to be appended to an existing property
		   * by specifying the escaped value. By specifying the escaped value,
		   * illegal characters are allowed to be directly inserted into css output.
		   * @param {string} name the property to set
		   * @param {any} value the unescaped value of the property
		   * @param {string} valueEscaped optional. the escaped value of the property.
		   */;
		  _proto.appendToPropertyAndEscape = function appendToPropertyAndEscape(name, value, valueEscaped) {
		    if (!this.raws) {
		      this.raws = {};
		    }
		    var originalValue = this[name];
		    var originalEscaped = this.raws[name];
		    this[name] = originalValue + value; // this may trigger a setter that updates raws, so it has to be set first.
		    if (originalEscaped || valueEscaped !== value) {
		      this.raws[name] = (originalEscaped || originalValue) + valueEscaped;
		    } else {
		      delete this.raws[name]; // delete any escaped value that was created by the setter.
		    }
		  }

		  /**
		   * Some non-standard syntax doesn't follow normal escaping rules for css.
		   * This allows the escaped value to be specified directly, allowing illegal
		   * characters to be directly inserted into css output.
		   * @param {string} name the property to set
		   * @param {any} value the unescaped value of the property
		   * @param {string} valueEscaped the escaped value of the property.
		   */;
		  _proto.setPropertyAndEscape = function setPropertyAndEscape(name, value, valueEscaped) {
		    if (!this.raws) {
		      this.raws = {};
		    }
		    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
		    this.raws[name] = valueEscaped;
		  }

		  /**
		   * When you want a value to passed through to CSS directly. This method
		   * deletes the corresponding raw value causing the stringifier to fallback
		   * to the unescaped value.
		   * @param {string} name the property to set.
		   * @param {any} value The value that is both escaped and unescaped.
		   */;
		  _proto.setPropertyWithoutEscape = function setPropertyWithoutEscape(name, value) {
		    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
		    if (this.raws) {
		      delete this.raws[name];
		    }
		  }

		  /**
		   *
		   * @param {number} line The number (starting with 1)
		   * @param {number} column The column number (starting with 1)
		   */;
		  _proto.isAtPosition = function isAtPosition(line, column) {
		    if (this.source && this.source.start && this.source.end) {
		      if (this.source.start.line > line) {
		        return false;
		      }
		      if (this.source.end.line < line) {
		        return false;
		      }
		      if (this.source.start.line === line && this.source.start.column > column) {
		        return false;
		      }
		      if (this.source.end.line === line && this.source.end.column < column) {
		        return false;
		      }
		      return true;
		    }
		    return undefined;
		  };
		  _proto.stringifyProperty = function stringifyProperty(name) {
		    return this.raws && this.raws[name] || this[name];
		  };
		  _proto.valueToString = function valueToString() {
		    return String(this.stringifyProperty("value"));
		  };
		  _proto.toString = function toString() {
		    return [this.rawSpaceBefore, this.valueToString(), this.rawSpaceAfter].join('');
		  };
		  _createClass(Node, [{
		    key: "rawSpaceBefore",
		    get: function get() {
		      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.before;
		      if (rawSpace === undefined) {
		        rawSpace = this.spaces && this.spaces.before;
		      }
		      return rawSpace || "";
		    },
		    set: function set(raw) {
		      (0, _util.ensureObject)(this, "raws", "spaces");
		      this.raws.spaces.before = raw;
		    }
		  }, {
		    key: "rawSpaceAfter",
		    get: function get() {
		      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.after;
		      if (rawSpace === undefined) {
		        rawSpace = this.spaces.after;
		      }
		      return rawSpace || "";
		    },
		    set: function set(raw) {
		      (0, _util.ensureObject)(this, "raws", "spaces");
		      this.raws.spaces.after = raw;
		    }
		  }]);
		  return Node;
		}();
		exports$1["default"] = Node;
		module.exports = exports$1.default; 
	} (node, node.exports));
	return node.exports;
}

var types$1 = {};

var hasRequiredTypes;

function requireTypes () {
	if (hasRequiredTypes) return types$1;
	hasRequiredTypes = 1;

	types$1.__esModule = true;
	types$1.UNIVERSAL = types$1.TAG = types$1.STRING = types$1.SELECTOR = types$1.ROOT = types$1.PSEUDO = types$1.NESTING = types$1.ID = types$1.COMMENT = types$1.COMBINATOR = types$1.CLASS = types$1.ATTRIBUTE = void 0;
	var TAG = 'tag';
	types$1.TAG = TAG;
	var STRING = 'string';
	types$1.STRING = STRING;
	var SELECTOR = 'selector';
	types$1.SELECTOR = SELECTOR;
	var ROOT = 'root';
	types$1.ROOT = ROOT;
	var PSEUDO = 'pseudo';
	types$1.PSEUDO = PSEUDO;
	var NESTING = 'nesting';
	types$1.NESTING = NESTING;
	var ID = 'id';
	types$1.ID = ID;
	var COMMENT = 'comment';
	types$1.COMMENT = COMMENT;
	var COMBINATOR = 'combinator';
	types$1.COMBINATOR = COMBINATOR;
	var CLASS = 'class';
	types$1.CLASS = CLASS;
	var ATTRIBUTE = 'attribute';
	types$1.ATTRIBUTE = ATTRIBUTE;
	var UNIVERSAL = 'universal';
	types$1.UNIVERSAL = UNIVERSAL;
	return types$1;
}

var hasRequiredContainer;

function requireContainer () {
	if (hasRequiredContainer) return container.exports;
	hasRequiredContainer = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var types = _interopRequireWildcard(/*@__PURE__*/ requireTypes());
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
		function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
		function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Container = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Container, _Node);
		  function Container(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    if (!_this.nodes) {
		      _this.nodes = [];
		    }
		    return _this;
		  }
		  var _proto = Container.prototype;
		  _proto.append = function append(selector) {
		    selector.parent = this;
		    this.nodes.push(selector);
		    return this;
		  };
		  _proto.prepend = function prepend(selector) {
		    selector.parent = this;
		    this.nodes.unshift(selector);
		    return this;
		  };
		  _proto.at = function at(index) {
		    return this.nodes[index];
		  };
		  _proto.index = function index(child) {
		    if (typeof child === 'number') {
		      return child;
		    }
		    return this.nodes.indexOf(child);
		  };
		  _proto.removeChild = function removeChild(child) {
		    child = this.index(child);
		    this.at(child).parent = undefined;
		    this.nodes.splice(child, 1);
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (index >= child) {
		        this.indexes[id] = index - 1;
		      }
		    }
		    return this;
		  };
		  _proto.removeAll = function removeAll() {
		    for (var _iterator = _createForOfIteratorHelperLoose(this.nodes), _step; !(_step = _iterator()).done;) {
		      var node = _step.value;
		      node.parent = undefined;
		    }
		    this.nodes = [];
		    return this;
		  };
		  _proto.empty = function empty() {
		    return this.removeAll();
		  };
		  _proto.insertAfter = function insertAfter(oldNode, newNode) {
		    newNode.parent = this;
		    var oldIndex = this.index(oldNode);
		    this.nodes.splice(oldIndex + 1, 0, newNode);
		    newNode.parent = this;
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (oldIndex <= index) {
		        this.indexes[id] = index + 1;
		      }
		    }
		    return this;
		  };
		  _proto.insertBefore = function insertBefore(oldNode, newNode) {
		    newNode.parent = this;
		    var oldIndex = this.index(oldNode);
		    this.nodes.splice(oldIndex, 0, newNode);
		    newNode.parent = this;
		    var index;
		    for (var id in this.indexes) {
		      index = this.indexes[id];
		      if (index <= oldIndex) {
		        this.indexes[id] = index + 1;
		      }
		    }
		    return this;
		  };
		  _proto._findChildAtPosition = function _findChildAtPosition(line, col) {
		    var found = undefined;
		    this.each(function (node) {
		      if (node.atPosition) {
		        var foundChild = node.atPosition(line, col);
		        if (foundChild) {
		          found = foundChild;
		          return false;
		        }
		      } else if (node.isAtPosition(line, col)) {
		        found = node;
		        return false;
		      }
		    });
		    return found;
		  }

		  /**
		   * Return the most specific node at the line and column number given.
		   * The source location is based on the original parsed location, locations aren't
		   * updated as selector nodes are mutated.
		   * 
		   * Note that this location is relative to the location of the first character
		   * of the selector, and not the location of the selector in the overall document
		   * when used in conjunction with postcss.
		   *
		   * If not found, returns undefined.
		   * @param {number} line The line number of the node to find. (1-based index)
		   * @param {number} col  The column number of the node to find. (1-based index)
		   */;
		  _proto.atPosition = function atPosition(line, col) {
		    if (this.isAtPosition(line, col)) {
		      return this._findChildAtPosition(line, col) || this;
		    } else {
		      return undefined;
		    }
		  };
		  _proto._inferEndPosition = function _inferEndPosition() {
		    if (this.last && this.last.source && this.last.source.end) {
		      this.source = this.source || {};
		      this.source.end = this.source.end || {};
		      Object.assign(this.source.end, this.last.source.end);
		    }
		  };
		  _proto.each = function each(callback) {
		    if (!this.lastEach) {
		      this.lastEach = 0;
		    }
		    if (!this.indexes) {
		      this.indexes = {};
		    }
		    this.lastEach++;
		    var id = this.lastEach;
		    this.indexes[id] = 0;
		    if (!this.length) {
		      return undefined;
		    }
		    var index, result;
		    while (this.indexes[id] < this.length) {
		      index = this.indexes[id];
		      result = callback(this.at(index), index);
		      if (result === false) {
		        break;
		      }
		      this.indexes[id] += 1;
		    }
		    delete this.indexes[id];
		    if (result === false) {
		      return false;
		    }
		  };
		  _proto.walk = function walk(callback) {
		    return this.each(function (node, i) {
		      var result = callback(node, i);
		      if (result !== false && node.length) {
		        result = node.walk(callback);
		      }
		      if (result === false) {
		        return false;
		      }
		    });
		  };
		  _proto.walkAttributes = function walkAttributes(callback) {
		    var _this2 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.ATTRIBUTE) {
		        return callback.call(_this2, selector);
		      }
		    });
		  };
		  _proto.walkClasses = function walkClasses(callback) {
		    var _this3 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.CLASS) {
		        return callback.call(_this3, selector);
		      }
		    });
		  };
		  _proto.walkCombinators = function walkCombinators(callback) {
		    var _this4 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.COMBINATOR) {
		        return callback.call(_this4, selector);
		      }
		    });
		  };
		  _proto.walkComments = function walkComments(callback) {
		    var _this5 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.COMMENT) {
		        return callback.call(_this5, selector);
		      }
		    });
		  };
		  _proto.walkIds = function walkIds(callback) {
		    var _this6 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.ID) {
		        return callback.call(_this6, selector);
		      }
		    });
		  };
		  _proto.walkNesting = function walkNesting(callback) {
		    var _this7 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.NESTING) {
		        return callback.call(_this7, selector);
		      }
		    });
		  };
		  _proto.walkPseudos = function walkPseudos(callback) {
		    var _this8 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.PSEUDO) {
		        return callback.call(_this8, selector);
		      }
		    });
		  };
		  _proto.walkTags = function walkTags(callback) {
		    var _this9 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.TAG) {
		        return callback.call(_this9, selector);
		      }
		    });
		  };
		  _proto.walkUniversals = function walkUniversals(callback) {
		    var _this10 = this;
		    return this.walk(function (selector) {
		      if (selector.type === types.UNIVERSAL) {
		        return callback.call(_this10, selector);
		      }
		    });
		  };
		  _proto.split = function split(callback) {
		    var _this11 = this;
		    var current = [];
		    return this.reduce(function (memo, node, index) {
		      var split = callback.call(_this11, node);
		      current.push(node);
		      if (split) {
		        memo.push(current);
		        current = [];
		      } else if (index === _this11.length - 1) {
		        memo.push(current);
		      }
		      return memo;
		    }, []);
		  };
		  _proto.map = function map(callback) {
		    return this.nodes.map(callback);
		  };
		  _proto.reduce = function reduce(callback, memo) {
		    return this.nodes.reduce(callback, memo);
		  };
		  _proto.every = function every(callback) {
		    return this.nodes.every(callback);
		  };
		  _proto.some = function some(callback) {
		    return this.nodes.some(callback);
		  };
		  _proto.filter = function filter(callback) {
		    return this.nodes.filter(callback);
		  };
		  _proto.sort = function sort(callback) {
		    return this.nodes.sort(callback);
		  };
		  _proto.toString = function toString() {
		    return this.map(String).join('');
		  };
		  _createClass(Container, [{
		    key: "first",
		    get: function get() {
		      return this.at(0);
		    }
		  }, {
		    key: "last",
		    get: function get() {
		      return this.at(this.length - 1);
		    }
		  }, {
		    key: "length",
		    get: function get() {
		      return this.nodes.length;
		    }
		  }]);
		  return Container;
		}(_node["default"]);
		exports$1["default"] = Container;
		module.exports = exports$1.default; 
	} (container, container.exports));
	return container.exports;
}

var hasRequiredRoot;

function requireRoot () {
	if (hasRequiredRoot) return root.exports;
	hasRequiredRoot = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Root = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Root, _Container);
		  function Root(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.ROOT;
		    return _this;
		  }
		  var _proto = Root.prototype;
		  _proto.toString = function toString() {
		    var str = this.reduce(function (memo, selector) {
		      memo.push(String(selector));
		      return memo;
		    }, []).join(',');
		    return this.trailingComma ? str + ',' : str;
		  };
		  _proto.error = function error(message, options) {
		    if (this._error) {
		      return this._error(message, options);
		    } else {
		      return new Error(message);
		    }
		  };
		  _createClass(Root, [{
		    key: "errorGenerator",
		    set: function set(handler) {
		      this._error = handler;
		    }
		  }]);
		  return Root;
		}(_container["default"]);
		exports$1["default"] = Root;
		module.exports = exports$1.default; 
	} (root, root.exports));
	return root.exports;
}

var selector = {exports: {}};

var hasRequiredSelector;

function requireSelector () {
	if (hasRequiredSelector) return selector.exports;
	hasRequiredSelector = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Selector = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Selector, _Container);
		  function Selector(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.SELECTOR;
		    return _this;
		  }
		  return Selector;
		}(_container["default"]);
		exports$1["default"] = Selector;
		module.exports = exports$1.default; 
	} (selector, selector.exports));
	return selector.exports;
}

var className = {exports: {}};

var hasRequiredClassName;

function requireClassName () {
	if (hasRequiredClassName) return className.exports;
	hasRequiredClassName = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _util = /*@__PURE__*/ requireUtil();
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var ClassName = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(ClassName, _Node);
		  function ClassName(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.CLASS;
		    _this._constructed = true;
		    return _this;
		  }
		  var _proto = ClassName.prototype;
		  _proto.valueToString = function valueToString() {
		    return '.' + _Node.prototype.valueToString.call(this);
		  };
		  _createClass(ClassName, [{
		    key: "value",
		    get: function get() {
		      return this._value;
		    },
		    set: function set(v) {
		      if (this._constructed) {
		        var escaped = (0, _cssesc["default"])(v, {
		          isIdentifier: true
		        });
		        if (escaped !== v) {
		          (0, _util.ensureObject)(this, "raws");
		          this.raws.value = escaped;
		        } else if (this.raws) {
		          delete this.raws.value;
		        }
		      }
		      this._value = v;
		    }
		  }]);
		  return ClassName;
		}(_node["default"]);
		exports$1["default"] = ClassName;
		module.exports = exports$1.default; 
	} (className, className.exports));
	return className.exports;
}

var comment = {exports: {}};

var hasRequiredComment;

function requireComment () {
	if (hasRequiredComment) return comment.exports;
	hasRequiredComment = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Comment = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Comment, _Node);
		  function Comment(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.COMMENT;
		    return _this;
		  }
		  return Comment;
		}(_node["default"]);
		exports$1["default"] = Comment;
		module.exports = exports$1.default; 
	} (comment, comment.exports));
	return comment.exports;
}

var id = {exports: {}};

var hasRequiredId;

function requireId () {
	if (hasRequiredId) return id.exports;
	hasRequiredId = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var ID = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(ID, _Node);
		  function ID(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.ID;
		    return _this;
		  }
		  var _proto = ID.prototype;
		  _proto.valueToString = function valueToString() {
		    return '#' + _Node.prototype.valueToString.call(this);
		  };
		  return ID;
		}(_node["default"]);
		exports$1["default"] = ID;
		module.exports = exports$1.default; 
	} (id, id.exports));
	return id.exports;
}

var tag = {exports: {}};

var namespace = {exports: {}};

var hasRequiredNamespace;

function requireNamespace () {
	if (hasRequiredNamespace) return namespace.exports;
	hasRequiredNamespace = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _util = /*@__PURE__*/ requireUtil();
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Namespace = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Namespace, _Node);
		  function Namespace() {
		    return _Node.apply(this, arguments) || this;
		  }
		  var _proto = Namespace.prototype;
		  _proto.qualifiedName = function qualifiedName(value) {
		    if (this.namespace) {
		      return this.namespaceString + "|" + value;
		    } else {
		      return value;
		    }
		  };
		  _proto.valueToString = function valueToString() {
		    return this.qualifiedName(_Node.prototype.valueToString.call(this));
		  };
		  _createClass(Namespace, [{
		    key: "namespace",
		    get: function get() {
		      return this._namespace;
		    },
		    set: function set(namespace) {
		      if (namespace === true || namespace === "*" || namespace === "&") {
		        this._namespace = namespace;
		        if (this.raws) {
		          delete this.raws.namespace;
		        }
		        return;
		      }
		      var escaped = (0, _cssesc["default"])(namespace, {
		        isIdentifier: true
		      });
		      this._namespace = namespace;
		      if (escaped !== namespace) {
		        (0, _util.ensureObject)(this, "raws");
		        this.raws.namespace = escaped;
		      } else if (this.raws) {
		        delete this.raws.namespace;
		      }
		    }
		  }, {
		    key: "ns",
		    get: function get() {
		      return this._namespace;
		    },
		    set: function set(namespace) {
		      this.namespace = namespace;
		    }
		  }, {
		    key: "namespaceString",
		    get: function get() {
		      if (this.namespace) {
		        var ns = this.stringifyProperty("namespace");
		        if (ns === true) {
		          return '';
		        } else {
		          return ns;
		        }
		      } else {
		        return '';
		      }
		    }
		  }]);
		  return Namespace;
		}(_node["default"]);
		exports$1["default"] = Namespace;
		module.exports = exports$1.default; 
	} (namespace, namespace.exports));
	return namespace.exports;
}

var hasRequiredTag;

function requireTag () {
	if (hasRequiredTag) return tag.exports;
	hasRequiredTag = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Tag = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Tag, _Namespace);
		  function Tag(opts) {
		    var _this;
		    _this = _Namespace.call(this, opts) || this;
		    _this.type = _types.TAG;
		    return _this;
		  }
		  return Tag;
		}(_namespace["default"]);
		exports$1["default"] = Tag;
		module.exports = exports$1.default; 
	} (tag, tag.exports));
	return tag.exports;
}

var string = {exports: {}};

var hasRequiredString;

function requireString () {
	if (hasRequiredString) return string.exports;
	hasRequiredString = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var String = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(String, _Node);
		  function String(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.STRING;
		    return _this;
		  }
		  return String;
		}(_node["default"]);
		exports$1["default"] = String;
		module.exports = exports$1.default; 
	} (string, string.exports));
	return string.exports;
}

var pseudo = {exports: {}};

var hasRequiredPseudo;

function requirePseudo () {
	if (hasRequiredPseudo) return pseudo.exports;
	hasRequiredPseudo = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _container = _interopRequireDefault(/*@__PURE__*/ requireContainer());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Pseudo = /*#__PURE__*/function (_Container) {
		  _inheritsLoose(Pseudo, _Container);
		  function Pseudo(opts) {
		    var _this;
		    _this = _Container.call(this, opts) || this;
		    _this.type = _types.PSEUDO;
		    return _this;
		  }
		  var _proto = Pseudo.prototype;
		  _proto.toString = function toString() {
		    var params = this.length ? '(' + this.map(String).join(',') + ')' : '';
		    return [this.rawSpaceBefore, this.stringifyProperty("value"), params, this.rawSpaceAfter].join('');
		  };
		  return Pseudo;
		}(_container["default"]);
		exports$1["default"] = Pseudo;
		module.exports = exports$1.default; 
	} (pseudo, pseudo.exports));
	return pseudo.exports;
}

var attribute = {};

var hasRequiredAttribute;

function requireAttribute () {
	if (hasRequiredAttribute) return attribute;
	hasRequiredAttribute = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		exports$1.unescapeValue = unescapeValue;
		var _cssesc = _interopRequireDefault(/*@__PURE__*/ requireCssesc());
		var _unesc = _interopRequireDefault(/*@__PURE__*/ requireUnesc());
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace());
		var _types = /*@__PURE__*/ requireTypes();
		var _CSSESC_QUOTE_OPTIONS;
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var deprecate = /*@__PURE__*/ requireNode$1();
		var WRAPPED_IN_QUOTES = /^('|")([^]*)\1$/;
		var warnOfDeprecatedValueAssignment = deprecate(function () {}, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. " + "Call attribute.setValue() instead.");
		var warnOfDeprecatedQuotedAssignment = deprecate(function () {}, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead.");
		var warnOfDeprecatedConstructor = deprecate(function () {}, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");
		function unescapeValue(value) {
		  var deprecatedUsage = false;
		  var quoteMark = null;
		  var unescaped = value;
		  var m = unescaped.match(WRAPPED_IN_QUOTES);
		  if (m) {
		    quoteMark = m[1];
		    unescaped = m[2];
		  }
		  unescaped = (0, _unesc["default"])(unescaped);
		  if (unescaped !== value) {
		    deprecatedUsage = true;
		  }
		  return {
		    deprecatedUsage: deprecatedUsage,
		    unescaped: unescaped,
		    quoteMark: quoteMark
		  };
		}
		function handleDeprecatedContructorOpts(opts) {
		  if (opts.quoteMark !== undefined) {
		    return opts;
		  }
		  if (opts.value === undefined) {
		    return opts;
		  }
		  warnOfDeprecatedConstructor();
		  var _unescapeValue = unescapeValue(opts.value),
		    quoteMark = _unescapeValue.quoteMark,
		    unescaped = _unescapeValue.unescaped;
		  if (!opts.raws) {
		    opts.raws = {};
		  }
		  if (opts.raws.value === undefined) {
		    opts.raws.value = opts.value;
		  }
		  opts.value = unescaped;
		  opts.quoteMark = quoteMark;
		  return opts;
		}
		var Attribute = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Attribute, _Namespace);
		  function Attribute(opts) {
		    var _this;
		    if (opts === void 0) {
		      opts = {};
		    }
		    _this = _Namespace.call(this, handleDeprecatedContructorOpts(opts)) || this;
		    _this.type = _types.ATTRIBUTE;
		    _this.raws = _this.raws || {};
		    Object.defineProperty(_this.raws, 'unquoted', {
		      get: deprecate(function () {
		        return _this.value;
		      }, "attr.raws.unquoted is deprecated. Call attr.value instead."),
		      set: deprecate(function () {
		        return _this.value;
		      }, "Setting attr.raws.unquoted is deprecated and has no effect. attr.value is unescaped by default now.")
		    });
		    _this._constructed = true;
		    return _this;
		  }

		  /**
		   * Returns the Attribute's value quoted such that it would be legal to use
		   * in the value of a css file. The original value's quotation setting
		   * used for stringification is left unchanged. See `setValue(value, options)`
		   * if you want to control the quote settings of a new value for the attribute.
		   *
		   * You can also change the quotation used for the current value by setting quoteMark.
		   *
		   * Options:
		   *   * quoteMark {'"' | "'" | null} - Use this value to quote the value. If this
		   *     option is not set, the original value for quoteMark will be used. If
		   *     indeterminate, a double quote is used. The legal values are:
		   *     * `null` - the value will be unquoted and characters will be escaped as necessary.
		   *     * `'` - the value will be quoted with a single quote and single quotes are escaped.
		   *     * `"` - the value will be quoted with a double quote and double quotes are escaped.
		   *   * preferCurrentQuoteMark {boolean} - if true, prefer the source quote mark
		   *     over the quoteMark option value.
		   *   * smart {boolean} - if true, will select a quote mark based on the value
		   *     and the other options specified here. See the `smartQuoteMark()`
		   *     method.
		   **/
		  var _proto = Attribute.prototype;
		  _proto.getQuotedValue = function getQuotedValue(options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var quoteMark = this._determineQuoteMark(options);
		    var cssescopts = CSSESC_QUOTE_OPTIONS[quoteMark];
		    var escaped = (0, _cssesc["default"])(this._value, cssescopts);
		    return escaped;
		  };
		  _proto._determineQuoteMark = function _determineQuoteMark(options) {
		    return options.smart ? this.smartQuoteMark(options) : this.preferredQuoteMark(options);
		  }

		  /**
		   * Set the unescaped value with the specified quotation options. The value
		   * provided must not include any wrapping quote marks -- those quotes will
		   * be interpreted as part of the value and escaped accordingly.
		   */;
		  _proto.setValue = function setValue(value, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    this._value = value;
		    this._quoteMark = this._determineQuoteMark(options);
		    this._syncRawValue();
		  }

		  /**
		   * Intelligently select a quoteMark value based on the value's contents. If
		   * the value is a legal CSS ident, it will not be quoted. Otherwise a quote
		   * mark will be picked that minimizes the number of escapes.
		   *
		   * If there's no clear winner, the quote mark from these options is used,
		   * then the source quote mark (this is inverted if `preferCurrentQuoteMark` is
		   * true). If the quoteMark is unspecified, a double quote is used.
		   *
		   * @param options This takes the quoteMark and preferCurrentQuoteMark options
		   * from the quoteValue method.
		   */;
		  _proto.smartQuoteMark = function smartQuoteMark(options) {
		    var v = this.value;
		    var numSingleQuotes = v.replace(/[^']/g, '').length;
		    var numDoubleQuotes = v.replace(/[^"]/g, '').length;
		    if (numSingleQuotes + numDoubleQuotes === 0) {
		      var escaped = (0, _cssesc["default"])(v, {
		        isIdentifier: true
		      });
		      if (escaped === v) {
		        return Attribute.NO_QUOTE;
		      } else {
		        var pref = this.preferredQuoteMark(options);
		        if (pref === Attribute.NO_QUOTE) {
		          // pick a quote mark that isn't none and see if it's smaller
		          var quote = this.quoteMark || options.quoteMark || Attribute.DOUBLE_QUOTE;
		          var opts = CSSESC_QUOTE_OPTIONS[quote];
		          var quoteValue = (0, _cssesc["default"])(v, opts);
		          if (quoteValue.length < escaped.length) {
		            return quote;
		          }
		        }
		        return pref;
		      }
		    } else if (numDoubleQuotes === numSingleQuotes) {
		      return this.preferredQuoteMark(options);
		    } else if (numDoubleQuotes < numSingleQuotes) {
		      return Attribute.DOUBLE_QUOTE;
		    } else {
		      return Attribute.SINGLE_QUOTE;
		    }
		  }

		  /**
		   * Selects the preferred quote mark based on the options and the current quote mark value.
		   * If you want the quote mark to depend on the attribute value, call `smartQuoteMark(opts)`
		   * instead.
		   */;
		  _proto.preferredQuoteMark = function preferredQuoteMark(options) {
		    var quoteMark = options.preferCurrentQuoteMark ? this.quoteMark : options.quoteMark;
		    if (quoteMark === undefined) {
		      quoteMark = options.preferCurrentQuoteMark ? options.quoteMark : this.quoteMark;
		    }
		    if (quoteMark === undefined) {
		      quoteMark = Attribute.DOUBLE_QUOTE;
		    }
		    return quoteMark;
		  };
		  _proto._syncRawValue = function _syncRawValue() {
		    var rawValue = (0, _cssesc["default"])(this._value, CSSESC_QUOTE_OPTIONS[this.quoteMark]);
		    if (rawValue === this._value) {
		      if (this.raws) {
		        delete this.raws.value;
		      }
		    } else {
		      this.raws.value = rawValue;
		    }
		  };
		  _proto._handleEscapes = function _handleEscapes(prop, value) {
		    if (this._constructed) {
		      var escaped = (0, _cssesc["default"])(value, {
		        isIdentifier: true
		      });
		      if (escaped !== value) {
		        this.raws[prop] = escaped;
		      } else {
		        delete this.raws[prop];
		      }
		    }
		  };
		  _proto._spacesFor = function _spacesFor(name) {
		    var attrSpaces = {
		      before: '',
		      after: ''
		    };
		    var spaces = this.spaces[name] || {};
		    var rawSpaces = this.raws.spaces && this.raws.spaces[name] || {};
		    return Object.assign(attrSpaces, spaces, rawSpaces);
		  };
		  _proto._stringFor = function _stringFor(name, spaceName, concat) {
		    if (spaceName === void 0) {
		      spaceName = name;
		    }
		    if (concat === void 0) {
		      concat = defaultAttrConcat;
		    }
		    var attrSpaces = this._spacesFor(spaceName);
		    return concat(this.stringifyProperty(name), attrSpaces);
		  }

		  /**
		   * returns the offset of the attribute part specified relative to the
		   * start of the node of the output string.
		   *
		   * * "ns" - alias for "namespace"
		   * * "namespace" - the namespace if it exists.
		   * * "attribute" - the attribute name
		   * * "attributeNS" - the start of the attribute or its namespace
		   * * "operator" - the match operator of the attribute
		   * * "value" - The value (string or identifier)
		   * * "insensitive" - the case insensitivity flag;
		   * @param part One of the possible values inside an attribute.
		   * @returns -1 if the name is invalid or the value doesn't exist in this attribute.
		   */;
		  _proto.offsetOf = function offsetOf(name) {
		    var count = 1;
		    var attributeSpaces = this._spacesFor("attribute");
		    count += attributeSpaces.before.length;
		    if (name === "namespace" || name === "ns") {
		      return this.namespace ? count : -1;
		    }
		    if (name === "attributeNS") {
		      return count;
		    }
		    count += this.namespaceString.length;
		    if (this.namespace) {
		      count += 1;
		    }
		    if (name === "attribute") {
		      return count;
		    }
		    count += this.stringifyProperty("attribute").length;
		    count += attributeSpaces.after.length;
		    var operatorSpaces = this._spacesFor("operator");
		    count += operatorSpaces.before.length;
		    var operator = this.stringifyProperty("operator");
		    if (name === "operator") {
		      return operator ? count : -1;
		    }
		    count += operator.length;
		    count += operatorSpaces.after.length;
		    var valueSpaces = this._spacesFor("value");
		    count += valueSpaces.before.length;
		    var value = this.stringifyProperty("value");
		    if (name === "value") {
		      return value ? count : -1;
		    }
		    count += value.length;
		    count += valueSpaces.after.length;
		    var insensitiveSpaces = this._spacesFor("insensitive");
		    count += insensitiveSpaces.before.length;
		    if (name === "insensitive") {
		      return this.insensitive ? count : -1;
		    }
		    return -1;
		  };
		  _proto.toString = function toString() {
		    var _this2 = this;
		    var selector = [this.rawSpaceBefore, '['];
		    selector.push(this._stringFor('qualifiedAttribute', 'attribute'));
		    if (this.operator && (this.value || this.value === '')) {
		      selector.push(this._stringFor('operator'));
		      selector.push(this._stringFor('value'));
		      selector.push(this._stringFor('insensitiveFlag', 'insensitive', function (attrValue, attrSpaces) {
		        if (attrValue.length > 0 && !_this2.quoted && attrSpaces.before.length === 0 && !(_this2.spaces.value && _this2.spaces.value.after)) {
		          attrSpaces.before = " ";
		        }
		        return defaultAttrConcat(attrValue, attrSpaces);
		      }));
		    }
		    selector.push(']');
		    selector.push(this.rawSpaceAfter);
		    return selector.join('');
		  };
		  _createClass(Attribute, [{
		    key: "quoted",
		    get: function get() {
		      var qm = this.quoteMark;
		      return qm === "'" || qm === '"';
		    },
		    set: function set(value) {
		      warnOfDeprecatedQuotedAssignment();
		    }

		    /**
		     * returns a single (`'`) or double (`"`) quote character if the value is quoted.
		     * returns `null` if the value is not quoted.
		     * returns `undefined` if the quotation state is unknown (this can happen when
		     * the attribute is constructed without specifying a quote mark.)
		     */
		  }, {
		    key: "quoteMark",
		    get: function get() {
		      return this._quoteMark;
		    }

		    /**
		     * Set the quote mark to be used by this attribute's value.
		     * If the quote mark changes, the raw (escaped) value at `attr.raws.value` of the attribute
		     * value is updated accordingly.
		     *
		     * @param {"'" | '"' | null} quoteMark The quote mark or `null` if the value should be unquoted.
		     */,
		    set: function set(quoteMark) {
		      if (!this._constructed) {
		        this._quoteMark = quoteMark;
		        return;
		      }
		      if (this._quoteMark !== quoteMark) {
		        this._quoteMark = quoteMark;
		        this._syncRawValue();
		      }
		    }
		  }, {
		    key: "qualifiedAttribute",
		    get: function get() {
		      return this.qualifiedName(this.raws.attribute || this.attribute);
		    }
		  }, {
		    key: "insensitiveFlag",
		    get: function get() {
		      return this.insensitive ? 'i' : '';
		    }
		  }, {
		    key: "value",
		    get: function get() {
		      return this._value;
		    },
		    set:
		    /**
		     * Before 3.0, the value had to be set to an escaped value including any wrapped
		     * quote marks. In 3.0, the semantics of `Attribute.value` changed so that the value
		     * is unescaped during parsing and any quote marks are removed.
		     *
		     * Because the ambiguity of this semantic change, if you set `attr.value = newValue`,
		     * a deprecation warning is raised when the new value contains any characters that would
		     * require escaping (including if it contains wrapped quotes).
		     *
		     * Instead, you should call `attr.setValue(newValue, opts)` and pass options that describe
		     * how the new value is quoted.
		     */
		    function set(v) {
		      if (this._constructed) {
		        var _unescapeValue2 = unescapeValue(v),
		          deprecatedUsage = _unescapeValue2.deprecatedUsage,
		          unescaped = _unescapeValue2.unescaped,
		          quoteMark = _unescapeValue2.quoteMark;
		        if (deprecatedUsage) {
		          warnOfDeprecatedValueAssignment();
		        }
		        if (unescaped === this._value && quoteMark === this._quoteMark) {
		          return;
		        }
		        this._value = unescaped;
		        this._quoteMark = quoteMark;
		        this._syncRawValue();
		      } else {
		        this._value = v;
		      }
		    }
		  }, {
		    key: "insensitive",
		    get: function get() {
		      return this._insensitive;
		    }

		    /**
		     * Set the case insensitive flag.
		     * If the case insensitive flag changes, the raw (escaped) value at `attr.raws.insensitiveFlag`
		     * of the attribute is updated accordingly.
		     *
		     * @param {true | false} insensitive true if the attribute should match case-insensitively.
		     */,
		    set: function set(insensitive) {
		      if (!insensitive) {
		        this._insensitive = false;

		        // "i" and "I" can be used in "this.raws.insensitiveFlag" to store the original notation.
		        // When setting `attr.insensitive = false` both should be erased to ensure correct serialization.
		        if (this.raws && (this.raws.insensitiveFlag === 'I' || this.raws.insensitiveFlag === 'i')) {
		          this.raws.insensitiveFlag = undefined;
		        }
		      }
		      this._insensitive = insensitive;
		    }
		  }, {
		    key: "attribute",
		    get: function get() {
		      return this._attribute;
		    },
		    set: function set(name) {
		      this._handleEscapes("attribute", name);
		      this._attribute = name;
		    }
		  }]);
		  return Attribute;
		}(_namespace["default"]);
		exports$1["default"] = Attribute;
		Attribute.NO_QUOTE = null;
		Attribute.SINGLE_QUOTE = "'";
		Attribute.DOUBLE_QUOTE = '"';
		var CSSESC_QUOTE_OPTIONS = (_CSSESC_QUOTE_OPTIONS = {
		  "'": {
		    quotes: 'single',
		    wrap: true
		  },
		  '"': {
		    quotes: 'double',
		    wrap: true
		  }
		}, _CSSESC_QUOTE_OPTIONS[null] = {
		  isIdentifier: true
		}, _CSSESC_QUOTE_OPTIONS);
		function defaultAttrConcat(attrValue, attrSpaces) {
		  return "" + attrSpaces.before + attrValue + attrSpaces.after;
		} 
	} (attribute));
	return attribute;
}

var universal = {exports: {}};

var hasRequiredUniversal;

function requireUniversal () {
	if (hasRequiredUniversal) return universal.exports;
	hasRequiredUniversal = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _namespace = _interopRequireDefault(/*@__PURE__*/ requireNamespace());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Universal = /*#__PURE__*/function (_Namespace) {
		  _inheritsLoose(Universal, _Namespace);
		  function Universal(opts) {
		    var _this;
		    _this = _Namespace.call(this, opts) || this;
		    _this.type = _types.UNIVERSAL;
		    _this.value = '*';
		    return _this;
		  }
		  return Universal;
		}(_namespace["default"]);
		exports$1["default"] = Universal;
		module.exports = exports$1.default; 
	} (universal, universal.exports));
	return universal.exports;
}

var combinator = {exports: {}};

var hasRequiredCombinator;

function requireCombinator () {
	if (hasRequiredCombinator) return combinator.exports;
	hasRequiredCombinator = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Combinator = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Combinator, _Node);
		  function Combinator(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.COMBINATOR;
		    return _this;
		  }
		  return Combinator;
		}(_node["default"]);
		exports$1["default"] = Combinator;
		module.exports = exports$1.default; 
	} (combinator, combinator.exports));
	return combinator.exports;
}

var nesting = {exports: {}};

var hasRequiredNesting;

function requireNesting () {
	if (hasRequiredNesting) return nesting.exports;
	hasRequiredNesting = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _node = _interopRequireDefault(/*@__PURE__*/ requireNode());
		var _types = /*@__PURE__*/ requireTypes();
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
		function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
		var Nesting = /*#__PURE__*/function (_Node) {
		  _inheritsLoose(Nesting, _Node);
		  function Nesting(opts) {
		    var _this;
		    _this = _Node.call(this, opts) || this;
		    _this.type = _types.NESTING;
		    _this.value = '&';
		    return _this;
		  }
		  return Nesting;
		}(_node["default"]);
		exports$1["default"] = Nesting;
		module.exports = exports$1.default; 
	} (nesting, nesting.exports));
	return nesting.exports;
}

var sortAscending = {exports: {}};

var hasRequiredSortAscending;

function requireSortAscending () {
	if (hasRequiredSortAscending) return sortAscending.exports;
	hasRequiredSortAscending = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = sortAscending;
		function sortAscending(list) {
		  return list.sort(function (a, b) {
		    return a - b;
		  });
		}
		module.exports = exports$1.default; 
	} (sortAscending, sortAscending.exports));
	return sortAscending.exports;
}

var tokenize = {};

var tokenTypes = {};

var hasRequiredTokenTypes;

function requireTokenTypes () {
	if (hasRequiredTokenTypes) return tokenTypes;
	hasRequiredTokenTypes = 1;

	tokenTypes.__esModule = true;
	tokenTypes.word = tokenTypes.tilde = tokenTypes.tab = tokenTypes.str = tokenTypes.space = tokenTypes.slash = tokenTypes.singleQuote = tokenTypes.semicolon = tokenTypes.plus = tokenTypes.pipe = tokenTypes.openSquare = tokenTypes.openParenthesis = tokenTypes.newline = tokenTypes.greaterThan = tokenTypes.feed = tokenTypes.equals = tokenTypes.doubleQuote = tokenTypes.dollar = tokenTypes.cr = tokenTypes.comment = tokenTypes.comma = tokenTypes.combinator = tokenTypes.colon = tokenTypes.closeSquare = tokenTypes.closeParenthesis = tokenTypes.caret = tokenTypes.bang = tokenTypes.backslash = tokenTypes.at = tokenTypes.asterisk = tokenTypes.ampersand = void 0;
	var ampersand = 38; // `&`.charCodeAt(0);
	tokenTypes.ampersand = ampersand;
	var asterisk = 42; // `*`.charCodeAt(0);
	tokenTypes.asterisk = asterisk;
	var at = 64; // `@`.charCodeAt(0);
	tokenTypes.at = at;
	var comma = 44; // `,`.charCodeAt(0);
	tokenTypes.comma = comma;
	var colon = 58; // `:`.charCodeAt(0);
	tokenTypes.colon = colon;
	var semicolon = 59; // `;`.charCodeAt(0);
	tokenTypes.semicolon = semicolon;
	var openParenthesis = 40; // `(`.charCodeAt(0);
	tokenTypes.openParenthesis = openParenthesis;
	var closeParenthesis = 41; // `)`.charCodeAt(0);
	tokenTypes.closeParenthesis = closeParenthesis;
	var openSquare = 91; // `[`.charCodeAt(0);
	tokenTypes.openSquare = openSquare;
	var closeSquare = 93; // `]`.charCodeAt(0);
	tokenTypes.closeSquare = closeSquare;
	var dollar = 36; // `$`.charCodeAt(0);
	tokenTypes.dollar = dollar;
	var tilde = 126; // `~`.charCodeAt(0);
	tokenTypes.tilde = tilde;
	var caret = 94; // `^`.charCodeAt(0);
	tokenTypes.caret = caret;
	var plus = 43; // `+`.charCodeAt(0);
	tokenTypes.plus = plus;
	var equals = 61; // `=`.charCodeAt(0);
	tokenTypes.equals = equals;
	var pipe = 124; // `|`.charCodeAt(0);
	tokenTypes.pipe = pipe;
	var greaterThan = 62; // `>`.charCodeAt(0);
	tokenTypes.greaterThan = greaterThan;
	var space = 32; // ` `.charCodeAt(0);
	tokenTypes.space = space;
	var singleQuote = 39; // `'`.charCodeAt(0);
	tokenTypes.singleQuote = singleQuote;
	var doubleQuote = 34; // `"`.charCodeAt(0);
	tokenTypes.doubleQuote = doubleQuote;
	var slash = 47; // `/`.charCodeAt(0);
	tokenTypes.slash = slash;
	var bang = 33; // `!`.charCodeAt(0);
	tokenTypes.bang = bang;
	var backslash = 92; // '\\'.charCodeAt(0);
	tokenTypes.backslash = backslash;
	var cr = 13; // '\r'.charCodeAt(0);
	tokenTypes.cr = cr;
	var feed = 12; // '\f'.charCodeAt(0);
	tokenTypes.feed = feed;
	var newline = 10; // '\n'.charCodeAt(0);
	tokenTypes.newline = newline;
	var tab = 9; // '\t'.charCodeAt(0);

	// Expose aliases primarily for readability.
	tokenTypes.tab = tab;
	var str = singleQuote;

	// No good single character representation!
	tokenTypes.str = str;
	var comment = -1;
	tokenTypes.comment = comment;
	var word = -2;
	tokenTypes.word = word;
	var combinator = -3;
	tokenTypes.combinator = combinator;
	return tokenTypes;
}

var hasRequiredTokenize;

function requireTokenize () {
	if (hasRequiredTokenize) return tokenize;
	hasRequiredTokenize = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		exports$1.FIELDS = void 0;
		exports$1["default"] = tokenize;
		var t = _interopRequireWildcard(/*@__PURE__*/ requireTokenTypes());
		var _unescapable, _wordDelimiters;
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		var unescapable = (_unescapable = {}, _unescapable[t.tab] = true, _unescapable[t.newline] = true, _unescapable[t.cr] = true, _unescapable[t.feed] = true, _unescapable);
		var wordDelimiters = (_wordDelimiters = {}, _wordDelimiters[t.space] = true, _wordDelimiters[t.tab] = true, _wordDelimiters[t.newline] = true, _wordDelimiters[t.cr] = true, _wordDelimiters[t.feed] = true, _wordDelimiters[t.ampersand] = true, _wordDelimiters[t.asterisk] = true, _wordDelimiters[t.bang] = true, _wordDelimiters[t.comma] = true, _wordDelimiters[t.colon] = true, _wordDelimiters[t.semicolon] = true, _wordDelimiters[t.openParenthesis] = true, _wordDelimiters[t.closeParenthesis] = true, _wordDelimiters[t.openSquare] = true, _wordDelimiters[t.closeSquare] = true, _wordDelimiters[t.singleQuote] = true, _wordDelimiters[t.doubleQuote] = true, _wordDelimiters[t.plus] = true, _wordDelimiters[t.pipe] = true, _wordDelimiters[t.tilde] = true, _wordDelimiters[t.greaterThan] = true, _wordDelimiters[t.equals] = true, _wordDelimiters[t.dollar] = true, _wordDelimiters[t.caret] = true, _wordDelimiters[t.slash] = true, _wordDelimiters);
		var hex = {};
		var hexChars = "0123456789abcdefABCDEF";
		for (var i = 0; i < hexChars.length; i++) {
		  hex[hexChars.charCodeAt(i)] = true;
		}

		/**
		 *  Returns the last index of the bar css word
		 * @param {string} css The string in which the word begins
		 * @param {number} start The index into the string where word's first letter occurs
		 */
		function consumeWord(css, start) {
		  var next = start;
		  var code;
		  do {
		    code = css.charCodeAt(next);
		    if (wordDelimiters[code]) {
		      return next - 1;
		    } else if (code === t.backslash) {
		      next = consumeEscape(css, next) + 1;
		    } else {
		      // All other characters are part of the word
		      next++;
		    }
		  } while (next < css.length);
		  return next - 1;
		}

		/**
		 *  Returns the last index of the escape sequence
		 * @param {string} css The string in which the sequence begins
		 * @param {number} start The index into the string where escape character (`\`) occurs.
		 */
		function consumeEscape(css, start) {
		  var next = start;
		  var code = css.charCodeAt(next + 1);
		  if (unescapable[code]) ; else if (hex[code]) {
		    var hexDigits = 0;
		    // consume up to 6 hex chars
		    do {
		      next++;
		      hexDigits++;
		      code = css.charCodeAt(next + 1);
		    } while (hex[code] && hexDigits < 6);
		    // if fewer than 6 hex chars, a trailing space ends the escape
		    if (hexDigits < 6 && code === t.space) {
		      next++;
		    }
		  } else {
		    // the next char is part of the current word
		    next++;
		  }
		  return next;
		}
		var FIELDS = {
		  TYPE: 0,
		  START_LINE: 1,
		  START_COL: 2,
		  END_LINE: 3,
		  END_COL: 4,
		  START_POS: 5,
		  END_POS: 6
		};
		exports$1.FIELDS = FIELDS;
		function tokenize(input) {
		  var tokens = [];
		  var css = input.css.valueOf();
		  var _css = css,
		    length = _css.length;
		  var offset = -1;
		  var line = 1;
		  var start = 0;
		  var end = 0;
		  var code, content, endColumn, endLine, escaped, escapePos, last, lines, next, nextLine, nextOffset, quote, tokenType;
		  function unclosed(what, fix) {
		    if (input.safe) {
		      // fyi: this is never set to true.
		      css += fix;
		      next = css.length - 1;
		    } else {
		      throw input.error('Unclosed ' + what, line, start - offset, start);
		    }
		  }
		  while (start < length) {
		    code = css.charCodeAt(start);
		    if (code === t.newline) {
		      offset = start;
		      line += 1;
		    }
		    switch (code) {
		      case t.space:
		      case t.tab:
		      case t.newline:
		      case t.cr:
		      case t.feed:
		        next = start;
		        do {
		          next += 1;
		          code = css.charCodeAt(next);
		          if (code === t.newline) {
		            offset = next;
		            line += 1;
		          }
		        } while (code === t.space || code === t.newline || code === t.tab || code === t.cr || code === t.feed);
		        tokenType = t.space;
		        endLine = line;
		        endColumn = next - offset - 1;
		        end = next;
		        break;
		      case t.plus:
		      case t.greaterThan:
		      case t.tilde:
		      case t.pipe:
		        next = start;
		        do {
		          next += 1;
		          code = css.charCodeAt(next);
		        } while (code === t.plus || code === t.greaterThan || code === t.tilde || code === t.pipe);
		        tokenType = t.combinator;
		        endLine = line;
		        endColumn = start - offset;
		        end = next;
		        break;

		      // Consume these characters as single tokens.
		      case t.asterisk:
		      case t.ampersand:
		      case t.bang:
		      case t.comma:
		      case t.equals:
		      case t.dollar:
		      case t.caret:
		      case t.openSquare:
		      case t.closeSquare:
		      case t.colon:
		      case t.semicolon:
		      case t.openParenthesis:
		      case t.closeParenthesis:
		        next = start;
		        tokenType = code;
		        endLine = line;
		        endColumn = start - offset;
		        end = next + 1;
		        break;
		      case t.singleQuote:
		      case t.doubleQuote:
		        quote = code === t.singleQuote ? "'" : '"';
		        next = start;
		        do {
		          escaped = false;
		          next = css.indexOf(quote, next + 1);
		          if (next === -1) {
		            unclosed('quote', quote);
		          }
		          escapePos = next;
		          while (css.charCodeAt(escapePos - 1) === t.backslash) {
		            escapePos -= 1;
		            escaped = !escaped;
		          }
		        } while (escaped);
		        tokenType = t.str;
		        endLine = line;
		        endColumn = start - offset;
		        end = next + 1;
		        break;
		      default:
		        if (code === t.slash && css.charCodeAt(start + 1) === t.asterisk) {
		          next = css.indexOf('*/', start + 2) + 1;
		          if (next === 0) {
		            unclosed('comment', '*/');
		          }
		          content = css.slice(start, next + 1);
		          lines = content.split('\n');
		          last = lines.length - 1;
		          if (last > 0) {
		            nextLine = line + last;
		            nextOffset = next - lines[last].length;
		          } else {
		            nextLine = line;
		            nextOffset = offset;
		          }
		          tokenType = t.comment;
		          line = nextLine;
		          endLine = nextLine;
		          endColumn = next - nextOffset;
		        } else if (code === t.slash) {
		          next = start;
		          tokenType = code;
		          endLine = line;
		          endColumn = start - offset;
		          end = next + 1;
		        } else {
		          next = consumeWord(css, start);
		          tokenType = t.word;
		          endLine = line;
		          endColumn = next - offset;
		        }
		        end = next + 1;
		        break;
		    }

		    // Ensure that the token structure remains consistent
		    tokens.push([tokenType,
		    // [0] Token type
		    line,
		    // [1] Starting line
		    start - offset,
		    // [2] Starting column
		    endLine,
		    // [3] Ending line
		    endColumn,
		    // [4] Ending column
		    start,
		    // [5] Start position / Source index
		    end // [6] End position
		    ]);

		    // Reset offset for the next token
		    if (nextOffset) {
		      offset = nextOffset;
		      nextOffset = null;
		    }
		    start = end;
		  }
		  return tokens;
		} 
	} (tokenize));
	return tokenize;
}

var hasRequiredParser;

function requireParser () {
	if (hasRequiredParser) return parser.exports;
	hasRequiredParser = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _root = _interopRequireDefault(/*@__PURE__*/ requireRoot());
		var _selector = _interopRequireDefault(/*@__PURE__*/ requireSelector());
		var _className = _interopRequireDefault(/*@__PURE__*/ requireClassName());
		var _comment = _interopRequireDefault(/*@__PURE__*/ requireComment());
		var _id = _interopRequireDefault(/*@__PURE__*/ requireId());
		var _tag = _interopRequireDefault(/*@__PURE__*/ requireTag());
		var _string = _interopRequireDefault(/*@__PURE__*/ requireString());
		var _pseudo = _interopRequireDefault(/*@__PURE__*/ requirePseudo());
		var _attribute = _interopRequireWildcard(/*@__PURE__*/ requireAttribute());
		var _universal = _interopRequireDefault(/*@__PURE__*/ requireUniversal());
		var _combinator = _interopRequireDefault(/*@__PURE__*/ requireCombinator());
		var _nesting = _interopRequireDefault(/*@__PURE__*/ requireNesting());
		var _sortAscending = _interopRequireDefault(/*@__PURE__*/ requireSortAscending());
		var _tokenize = _interopRequireWildcard(/*@__PURE__*/ requireTokenize());
		var tokens = _interopRequireWildcard(/*@__PURE__*/ requireTokenTypes());
		var types = _interopRequireWildcard(/*@__PURE__*/ requireTypes());
		var _util = /*@__PURE__*/ requireUtil();
		var _WHITESPACE_TOKENS, _Object$assign;
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
		function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
		var WHITESPACE_TOKENS = (_WHITESPACE_TOKENS = {}, _WHITESPACE_TOKENS[tokens.space] = true, _WHITESPACE_TOKENS[tokens.cr] = true, _WHITESPACE_TOKENS[tokens.feed] = true, _WHITESPACE_TOKENS[tokens.newline] = true, _WHITESPACE_TOKENS[tokens.tab] = true, _WHITESPACE_TOKENS);
		var WHITESPACE_EQUIV_TOKENS = Object.assign({}, WHITESPACE_TOKENS, (_Object$assign = {}, _Object$assign[tokens.comment] = true, _Object$assign));
		function tokenStart(token) {
		  return {
		    line: token[_tokenize.FIELDS.START_LINE],
		    column: token[_tokenize.FIELDS.START_COL]
		  };
		}
		function tokenEnd(token) {
		  return {
		    line: token[_tokenize.FIELDS.END_LINE],
		    column: token[_tokenize.FIELDS.END_COL]
		  };
		}
		function getSource(startLine, startColumn, endLine, endColumn) {
		  return {
		    start: {
		      line: startLine,
		      column: startColumn
		    },
		    end: {
		      line: endLine,
		      column: endColumn
		    }
		  };
		}
		function getTokenSource(token) {
		  return getSource(token[_tokenize.FIELDS.START_LINE], token[_tokenize.FIELDS.START_COL], token[_tokenize.FIELDS.END_LINE], token[_tokenize.FIELDS.END_COL]);
		}
		function getTokenSourceSpan(startToken, endToken) {
		  if (!startToken) {
		    return undefined;
		  }
		  return getSource(startToken[_tokenize.FIELDS.START_LINE], startToken[_tokenize.FIELDS.START_COL], endToken[_tokenize.FIELDS.END_LINE], endToken[_tokenize.FIELDS.END_COL]);
		}
		function unescapeProp(node, prop) {
		  var value = node[prop];
		  if (typeof value !== "string") {
		    return;
		  }
		  if (value.indexOf("\\") !== -1) {
		    (0, _util.ensureObject)(node, 'raws');
		    node[prop] = (0, _util.unesc)(value);
		    if (node.raws[prop] === undefined) {
		      node.raws[prop] = value;
		    }
		  }
		  return node;
		}
		function indexesOf(array, item) {
		  var i = -1;
		  var indexes = [];
		  while ((i = array.indexOf(item, i + 1)) !== -1) {
		    indexes.push(i);
		  }
		  return indexes;
		}
		function uniqs() {
		  var list = Array.prototype.concat.apply([], arguments);
		  return list.filter(function (item, i) {
		    return i === list.indexOf(item);
		  });
		}
		var Parser = /*#__PURE__*/function () {
		  function Parser(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    this.rule = rule;
		    this.options = Object.assign({
		      lossy: false,
		      safe: false
		    }, options);
		    this.position = 0;
		    this.css = typeof this.rule === 'string' ? this.rule : this.rule.selector;
		    this.tokens = (0, _tokenize["default"])({
		      css: this.css,
		      error: this._errorGenerator(),
		      safe: this.options.safe
		    });
		    var rootSource = getTokenSourceSpan(this.tokens[0], this.tokens[this.tokens.length - 1]);
		    this.root = new _root["default"]({
		      source: rootSource
		    });
		    this.root.errorGenerator = this._errorGenerator();
		    var selector = new _selector["default"]({
		      source: {
		        start: {
		          line: 1,
		          column: 1
		        }
		      },
		      sourceIndex: 0
		    });
		    this.root.append(selector);
		    this.current = selector;
		    this.loop();
		  }
		  var _proto = Parser.prototype;
		  _proto._errorGenerator = function _errorGenerator() {
		    var _this = this;
		    return function (message, errorOptions) {
		      if (typeof _this.rule === 'string') {
		        return new Error(message);
		      }
		      return _this.rule.error(message, errorOptions);
		    };
		  };
		  _proto.attribute = function attribute() {
		    var attr = [];
		    var startingToken = this.currToken;
		    this.position++;
		    while (this.position < this.tokens.length && this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
		      attr.push(this.currToken);
		      this.position++;
		    }
		    if (this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
		      return this.expected('closing square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		    var len = attr.length;
		    var node = {
		      source: getSource(startingToken[1], startingToken[2], this.currToken[3], this.currToken[4]),
		      sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
		    };
		    if (len === 1 && !~[tokens.word].indexOf(attr[0][_tokenize.FIELDS.TYPE])) {
		      return this.expected('attribute', attr[0][_tokenize.FIELDS.START_POS]);
		    }
		    var pos = 0;
		    var spaceBefore = '';
		    var commentBefore = '';
		    var lastAdded = null;
		    var spaceAfterMeaningfulToken = false;
		    while (pos < len) {
		      var token = attr[pos];
		      var content = this.content(token);
		      var next = attr[pos + 1];
		      switch (token[_tokenize.FIELDS.TYPE]) {
		        case tokens.space:
		          // if (
		          //     len === 1 ||
		          //     pos === 0 && this.content(next) === '|'
		          // ) {
		          //     return this.expected('attribute', token[TOKEN.START_POS], content);
		          // }
		          spaceAfterMeaningfulToken = true;
		          if (this.options.lossy) {
		            break;
		          }
		          if (lastAdded) {
		            (0, _util.ensureObject)(node, 'spaces', lastAdded);
		            var prevContent = node.spaces[lastAdded].after || '';
		            node.spaces[lastAdded].after = prevContent + content;
		            var existingComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || null;
		            if (existingComment) {
		              node.raws.spaces[lastAdded].after = existingComment + content;
		            }
		          } else {
		            spaceBefore = spaceBefore + content;
		            commentBefore = commentBefore + content;
		          }
		          break;
		        case tokens.asterisk:
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          } else if ((!node.namespace || lastAdded === "namespace" && !spaceAfterMeaningfulToken) && next) {
		            if (spaceBefore) {
		              (0, _util.ensureObject)(node, 'spaces', 'attribute');
		              node.spaces.attribute.before = spaceBefore;
		              spaceBefore = '';
		            }
		            if (commentBefore) {
		              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
		              node.raws.spaces.attribute.before = spaceBefore;
		              commentBefore = '';
		            }
		            node.namespace = (node.namespace || "") + content;
		            var rawValue = (0, _util.getProp)(node, 'raws', 'namespace') || null;
		            if (rawValue) {
		              node.raws.namespace += content;
		            }
		            lastAdded = 'namespace';
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.dollar:
		          if (lastAdded === "value") {
		            var oldRawValue = (0, _util.getProp)(node, 'raws', 'value');
		            node.value += "$";
		            if (oldRawValue) {
		              node.raws.value = oldRawValue + "$";
		            }
		            break;
		          }
		        // Falls through
		        case tokens.caret:
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.combinator:
		          if (content === '~' && next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          }
		          if (content !== '|') {
		            spaceAfterMeaningfulToken = false;
		            break;
		          }
		          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
		            node.operator = content;
		            lastAdded = 'operator';
		          } else if (!node.namespace && !node.attribute) {
		            node.namespace = true;
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.word:
		          if (next && this.content(next) === '|' && attr[pos + 2] && attr[pos + 2][_tokenize.FIELDS.TYPE] !== tokens.equals &&
		          // this look-ahead probably fails with comment nodes involved.
		          !node.operator && !node.namespace) {
		            node.namespace = content;
		            lastAdded = 'namespace';
		          } else if (!node.attribute || lastAdded === "attribute" && !spaceAfterMeaningfulToken) {
		            if (spaceBefore) {
		              (0, _util.ensureObject)(node, 'spaces', 'attribute');
		              node.spaces.attribute.before = spaceBefore;
		              spaceBefore = '';
		            }
		            if (commentBefore) {
		              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
		              node.raws.spaces.attribute.before = commentBefore;
		              commentBefore = '';
		            }
		            node.attribute = (node.attribute || "") + content;
		            var _rawValue = (0, _util.getProp)(node, 'raws', 'attribute') || null;
		            if (_rawValue) {
		              node.raws.attribute += content;
		            }
		            lastAdded = 'attribute';
		          } else if (!node.value && node.value !== "" || lastAdded === "value" && !(spaceAfterMeaningfulToken || node.quoteMark)) {
		            var _unescaped = (0, _util.unesc)(content);
		            var _oldRawValue = (0, _util.getProp)(node, 'raws', 'value') || '';
		            var oldValue = node.value || '';
		            node.value = oldValue + _unescaped;
		            node.quoteMark = null;
		            if (_unescaped !== content || _oldRawValue) {
		              (0, _util.ensureObject)(node, 'raws');
		              node.raws.value = (_oldRawValue || oldValue) + content;
		            }
		            lastAdded = 'value';
		          } else {
		            var insensitive = content === 'i' || content === "I";
		            if ((node.value || node.value === '') && (node.quoteMark || spaceAfterMeaningfulToken)) {
		              node.insensitive = insensitive;
		              if (!insensitive || content === "I") {
		                (0, _util.ensureObject)(node, 'raws');
		                node.raws.insensitiveFlag = content;
		              }
		              lastAdded = 'insensitive';
		              if (spaceBefore) {
		                (0, _util.ensureObject)(node, 'spaces', 'insensitive');
		                node.spaces.insensitive.before = spaceBefore;
		                spaceBefore = '';
		              }
		              if (commentBefore) {
		                (0, _util.ensureObject)(node, 'raws', 'spaces', 'insensitive');
		                node.raws.spaces.insensitive.before = commentBefore;
		                commentBefore = '';
		              }
		            } else if (node.value || node.value === '') {
		              lastAdded = 'value';
		              node.value += content;
		              if (node.raws.value) {
		                node.raws.value += content;
		              }
		            }
		          }
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.str:
		          if (!node.attribute || !node.operator) {
		            return this.error("Expected an attribute followed by an operator preceding the string.", {
		              index: token[_tokenize.FIELDS.START_POS]
		            });
		          }
		          var _unescapeValue = (0, _attribute.unescapeValue)(content),
		            unescaped = _unescapeValue.unescaped,
		            quoteMark = _unescapeValue.quoteMark;
		          node.value = unescaped;
		          node.quoteMark = quoteMark;
		          lastAdded = 'value';
		          (0, _util.ensureObject)(node, 'raws');
		          node.raws.value = content;
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.equals:
		          if (!node.attribute) {
		            return this.expected('attribute', token[_tokenize.FIELDS.START_POS], content);
		          }
		          if (node.value) {
		            return this.error('Unexpected "=" found; an operator was already defined.', {
		              index: token[_tokenize.FIELDS.START_POS]
		            });
		          }
		          node.operator = node.operator ? node.operator + content : content;
		          lastAdded = 'operator';
		          spaceAfterMeaningfulToken = false;
		          break;
		        case tokens.comment:
		          if (lastAdded) {
		            if (spaceAfterMeaningfulToken || next && next[_tokenize.FIELDS.TYPE] === tokens.space || lastAdded === 'insensitive') {
		              var lastComment = (0, _util.getProp)(node, 'spaces', lastAdded, 'after') || '';
		              var rawLastComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || lastComment;
		              (0, _util.ensureObject)(node, 'raws', 'spaces', lastAdded);
		              node.raws.spaces[lastAdded].after = rawLastComment + content;
		            } else {
		              var lastValue = node[lastAdded] || '';
		              var rawLastValue = (0, _util.getProp)(node, 'raws', lastAdded) || lastValue;
		              (0, _util.ensureObject)(node, 'raws');
		              node.raws[lastAdded] = rawLastValue + content;
		            }
		          } else {
		            commentBefore = commentBefore + content;
		          }
		          break;
		        default:
		          return this.error("Unexpected \"" + content + "\" found.", {
		            index: token[_tokenize.FIELDS.START_POS]
		          });
		      }
		      pos++;
		    }
		    unescapeProp(node, "attribute");
		    unescapeProp(node, "namespace");
		    this.newNode(new _attribute["default"](node));
		    this.position++;
		  }

		  /**
		   * return a node containing meaningless garbage up to (but not including) the specified token position.
		   * if the token position is negative, all remaining tokens are consumed.
		   *
		   * This returns an array containing a single string node if all whitespace,
		   * otherwise an array of comment nodes with space before and after.
		   *
		   * These tokens are not added to the current selector, the caller can add them or use them to amend
		   * a previous node's space metadata.
		   *
		   * In lossy mode, this returns only comments.
		   */;
		  _proto.parseWhitespaceEquivalentTokens = function parseWhitespaceEquivalentTokens(stopPosition) {
		    if (stopPosition < 0) {
		      stopPosition = this.tokens.length;
		    }
		    var startPosition = this.position;
		    var nodes = [];
		    var space = "";
		    var lastComment = undefined;
		    do {
		      if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) {
		        if (!this.options.lossy) {
		          space += this.content();
		        }
		      } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.comment) {
		        var spaces = {};
		        if (space) {
		          spaces.before = space;
		          space = "";
		        }
		        lastComment = new _comment["default"]({
		          value: this.content(),
		          source: getTokenSource(this.currToken),
		          sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
		          spaces: spaces
		        });
		        nodes.push(lastComment);
		      }
		    } while (++this.position < stopPosition);
		    if (space) {
		      if (lastComment) {
		        lastComment.spaces.after = space;
		      } else if (!this.options.lossy) {
		        var firstToken = this.tokens[startPosition];
		        var lastToken = this.tokens[this.position - 1];
		        nodes.push(new _string["default"]({
		          value: '',
		          source: getSource(firstToken[_tokenize.FIELDS.START_LINE], firstToken[_tokenize.FIELDS.START_COL], lastToken[_tokenize.FIELDS.END_LINE], lastToken[_tokenize.FIELDS.END_COL]),
		          sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
		          spaces: {
		            before: space,
		            after: ''
		          }
		        }));
		      }
		    }
		    return nodes;
		  }

		  /**
		   *
		   * @param {*} nodes
		   */;
		  _proto.convertWhitespaceNodesToSpace = function convertWhitespaceNodesToSpace(nodes, requiredSpace) {
		    var _this2 = this;
		    if (requiredSpace === void 0) {
		      requiredSpace = false;
		    }
		    var space = "";
		    var rawSpace = "";
		    nodes.forEach(function (n) {
		      var spaceBefore = _this2.lossySpace(n.spaces.before, requiredSpace);
		      var rawSpaceBefore = _this2.lossySpace(n.rawSpaceBefore, requiredSpace);
		      space += spaceBefore + _this2.lossySpace(n.spaces.after, requiredSpace && spaceBefore.length === 0);
		      rawSpace += spaceBefore + n.value + _this2.lossySpace(n.rawSpaceAfter, requiredSpace && rawSpaceBefore.length === 0);
		    });
		    if (rawSpace === space) {
		      rawSpace = undefined;
		    }
		    var result = {
		      space: space,
		      rawSpace: rawSpace
		    };
		    return result;
		  };
		  _proto.isNamedCombinator = function isNamedCombinator(position) {
		    if (position === void 0) {
		      position = this.position;
		    }
		    return this.tokens[position + 0] && this.tokens[position + 0][_tokenize.FIELDS.TYPE] === tokens.slash && this.tokens[position + 1] && this.tokens[position + 1][_tokenize.FIELDS.TYPE] === tokens.word && this.tokens[position + 2] && this.tokens[position + 2][_tokenize.FIELDS.TYPE] === tokens.slash;
		  };
		  _proto.namedCombinator = function namedCombinator() {
		    if (this.isNamedCombinator()) {
		      var nameRaw = this.content(this.tokens[this.position + 1]);
		      var name = (0, _util.unesc)(nameRaw).toLowerCase();
		      var raws = {};
		      if (name !== nameRaw) {
		        raws.value = "/" + nameRaw + "/";
		      }
		      var node = new _combinator["default"]({
		        value: "/" + name + "/",
		        source: getSource(this.currToken[_tokenize.FIELDS.START_LINE], this.currToken[_tokenize.FIELDS.START_COL], this.tokens[this.position + 2][_tokenize.FIELDS.END_LINE], this.tokens[this.position + 2][_tokenize.FIELDS.END_COL]),
		        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
		        raws: raws
		      });
		      this.position = this.position + 3;
		      return node;
		    } else {
		      this.unexpected();
		    }
		  };
		  _proto.combinator = function combinator() {
		    var _this3 = this;
		    if (this.content() === '|') {
		      return this.namespace();
		    }
		    // We need to decide between a space that's a descendant combinator and meaningless whitespace at the end of a selector.
		    var nextSigTokenPos = this.locateNextMeaningfulToken(this.position);
		    if (nextSigTokenPos < 0 || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.comma || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		      var nodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
		      if (nodes.length > 0) {
		        var last = this.current.last;
		        if (last) {
		          var _this$convertWhitespa = this.convertWhitespaceNodesToSpace(nodes),
		            space = _this$convertWhitespa.space,
		            rawSpace = _this$convertWhitespa.rawSpace;
		          if (rawSpace !== undefined) {
		            last.rawSpaceAfter += rawSpace;
		          }
		          last.spaces.after += space;
		        } else {
		          nodes.forEach(function (n) {
		            return _this3.newNode(n);
		          });
		        }
		      }
		      return;
		    }
		    var firstToken = this.currToken;
		    var spaceOrDescendantSelectorNodes = undefined;
		    if (nextSigTokenPos > this.position) {
		      spaceOrDescendantSelectorNodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
		    }
		    var node;
		    if (this.isNamedCombinator()) {
		      node = this.namedCombinator();
		    } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.combinator) {
		      node = new _combinator["default"]({
		        value: this.content(),
		        source: getTokenSource(this.currToken),
		        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS]
		      });
		      this.position++;
		    } else if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) ; else if (!spaceOrDescendantSelectorNodes) {
		      this.unexpected();
		    }
		    if (node) {
		      if (spaceOrDescendantSelectorNodes) {
		        var _this$convertWhitespa2 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes),
		          _space = _this$convertWhitespa2.space,
		          _rawSpace = _this$convertWhitespa2.rawSpace;
		        node.spaces.before = _space;
		        node.rawSpaceBefore = _rawSpace;
		      }
		    } else {
		      // descendant combinator
		      var _this$convertWhitespa3 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes, true),
		        _space2 = _this$convertWhitespa3.space,
		        _rawSpace2 = _this$convertWhitespa3.rawSpace;
		      if (!_rawSpace2) {
		        _rawSpace2 = _space2;
		      }
		      var spaces = {};
		      var raws = {
		        spaces: {}
		      };
		      if (_space2.endsWith(' ') && _rawSpace2.endsWith(' ')) {
		        spaces.before = _space2.slice(0, _space2.length - 1);
		        raws.spaces.before = _rawSpace2.slice(0, _rawSpace2.length - 1);
		      } else if (_space2.startsWith(' ') && _rawSpace2.startsWith(' ')) {
		        spaces.after = _space2.slice(1);
		        raws.spaces.after = _rawSpace2.slice(1);
		      } else {
		        raws.value = _rawSpace2;
		      }
		      node = new _combinator["default"]({
		        value: ' ',
		        source: getTokenSourceSpan(firstToken, this.tokens[this.position - 1]),
		        sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
		        spaces: spaces,
		        raws: raws
		      });
		    }
		    if (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.space) {
		      node.spaces.after = this.optionalSpace(this.content());
		      this.position++;
		    }
		    return this.newNode(node);
		  };
		  _proto.comma = function comma() {
		    if (this.position === this.tokens.length - 1) {
		      this.root.trailingComma = true;
		      this.position++;
		      return;
		    }
		    this.current._inferEndPosition();
		    var selector = new _selector["default"]({
		      source: {
		        start: tokenStart(this.tokens[this.position + 1])
		      },
		      sourceIndex: this.tokens[this.position + 1][_tokenize.FIELDS.START_POS]
		    });
		    this.current.parent.append(selector);
		    this.current = selector;
		    this.position++;
		  };
		  _proto.comment = function comment() {
		    var current = this.currToken;
		    this.newNode(new _comment["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.error = function error(message, opts) {
		    throw this.root.error(message, opts);
		  };
		  _proto.missingBackslash = function missingBackslash() {
		    return this.error('Expected a backslash preceding the semicolon.', {
		      index: this.currToken[_tokenize.FIELDS.START_POS]
		    });
		  };
		  _proto.missingParenthesis = function missingParenthesis() {
		    return this.expected('opening parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.missingSquareBracket = function missingSquareBracket() {
		    return this.expected('opening square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.unexpected = function unexpected() {
		    return this.error("Unexpected '" + this.content() + "'. Escaping special characters with \\ may help.", this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.unexpectedPipe = function unexpectedPipe() {
		    return this.error("Unexpected '|'.", this.currToken[_tokenize.FIELDS.START_POS]);
		  };
		  _proto.namespace = function namespace() {
		    var before = this.prevToken && this.content(this.prevToken) || true;
		    if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.word) {
		      this.position++;
		      return this.word(before);
		    } else if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.asterisk) {
		      this.position++;
		      return this.universal(before);
		    }
		    this.unexpectedPipe();
		  };
		  _proto.nesting = function nesting() {
		    if (this.nextToken) {
		      var nextContent = this.content(this.nextToken);
		      if (nextContent === "|") {
		        this.position++;
		        return;
		      }
		    }
		    var current = this.currToken;
		    this.newNode(new _nesting["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.parentheses = function parentheses() {
		    var last = this.current.last;
		    var unbalanced = 1;
		    this.position++;
		    if (last && last.type === types.PSEUDO) {
		      var selector = new _selector["default"]({
		        source: {
		          start: tokenStart(this.tokens[this.position])
		        },
		        sourceIndex: this.tokens[this.position][_tokenize.FIELDS.START_POS]
		      });
		      var cache = this.current;
		      last.append(selector);
		      this.current = selector;
		      while (this.position < this.tokens.length && unbalanced) {
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          unbalanced++;
		        }
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		          unbalanced--;
		        }
		        if (unbalanced) {
		          this.parse();
		        } else {
		          this.current.source.end = tokenEnd(this.currToken);
		          this.current.parent.source.end = tokenEnd(this.currToken);
		          this.position++;
		        }
		      }
		      this.current = cache;
		    } else {
		      // I think this case should be an error. It's used to implement a basic parse of media queries
		      // but I don't think it's a good idea.
		      var parenStart = this.currToken;
		      var parenValue = "(";
		      var parenEnd;
		      while (this.position < this.tokens.length && unbalanced) {
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          unbalanced++;
		        }
		        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		          unbalanced--;
		        }
		        parenEnd = this.currToken;
		        parenValue += this.parseParenthesisToken(this.currToken);
		        this.position++;
		      }
		      if (last) {
		        last.appendToPropertyAndEscape("value", parenValue, parenValue);
		      } else {
		        this.newNode(new _string["default"]({
		          value: parenValue,
		          source: getSource(parenStart[_tokenize.FIELDS.START_LINE], parenStart[_tokenize.FIELDS.START_COL], parenEnd[_tokenize.FIELDS.END_LINE], parenEnd[_tokenize.FIELDS.END_COL]),
		          sourceIndex: parenStart[_tokenize.FIELDS.START_POS]
		        }));
		      }
		    }
		    if (unbalanced) {
		      return this.expected('closing parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		  };
		  _proto.pseudo = function pseudo() {
		    var _this4 = this;
		    var pseudoStr = '';
		    var startingToken = this.currToken;
		    while (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.colon) {
		      pseudoStr += this.content();
		      this.position++;
		    }
		    if (!this.currToken) {
		      return this.expected(['pseudo-class', 'pseudo-element'], this.position - 1);
		    }
		    if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.word) {
		      this.splitWord(false, function (first, length) {
		        pseudoStr += first;
		        _this4.newNode(new _pseudo["default"]({
		          value: pseudoStr,
		          source: getTokenSourceSpan(startingToken, _this4.currToken),
		          sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
		        }));
		        if (length > 1 && _this4.nextToken && _this4.nextToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
		          _this4.error('Misplaced parenthesis.', {
		            index: _this4.nextToken[_tokenize.FIELDS.START_POS]
		          });
		        }
		      });
		    } else {
		      return this.expected(['pseudo-class', 'pseudo-element'], this.currToken[_tokenize.FIELDS.START_POS]);
		    }
		  };
		  _proto.space = function space() {
		    var content = this.content();
		    // Handle space before and after the selector
		    if (this.position === 0 || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis || this.current.nodes.every(function (node) {
		      return node.type === 'comment';
		    })) {
		      this.spaces = this.optionalSpace(content);
		      this.position++;
		    } else if (this.position === this.tokens.length - 1 || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
		      this.current.last.spaces.after = this.optionalSpace(content);
		      this.position++;
		    } else {
		      this.combinator();
		    }
		  };
		  _proto.string = function string() {
		    var current = this.currToken;
		    this.newNode(new _string["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }));
		    this.position++;
		  };
		  _proto.universal = function universal(namespace) {
		    var nextToken = this.nextToken;
		    if (nextToken && this.content(nextToken) === '|') {
		      this.position++;
		      return this.namespace();
		    }
		    var current = this.currToken;
		    this.newNode(new _universal["default"]({
		      value: this.content(),
		      source: getTokenSource(current),
		      sourceIndex: current[_tokenize.FIELDS.START_POS]
		    }), namespace);
		    this.position++;
		  };
		  _proto.splitWord = function splitWord(namespace, firstCallback) {
		    var _this5 = this;
		    var nextToken = this.nextToken;
		    var word = this.content();
		    while (nextToken && ~[tokens.dollar, tokens.caret, tokens.equals, tokens.word].indexOf(nextToken[_tokenize.FIELDS.TYPE])) {
		      this.position++;
		      var current = this.content();
		      word += current;
		      if (current.lastIndexOf('\\') === current.length - 1) {
		        var next = this.nextToken;
		        if (next && next[_tokenize.FIELDS.TYPE] === tokens.space) {
		          word += this.requiredSpace(this.content(next));
		          this.position++;
		        }
		      }
		      nextToken = this.nextToken;
		    }
		    var hasClass = indexesOf(word, '.').filter(function (i) {
		      // Allow escaped dot within class name
		      var escapedDot = word[i - 1] === '\\';
		      // Allow decimal numbers percent in @keyframes
		      var isKeyframesPercent = /^\d+\.\d+%$/.test(word);
		      return !escapedDot && !isKeyframesPercent;
		    });
		    var hasId = indexesOf(word, '#').filter(function (i) {
		      return word[i - 1] !== '\\';
		    });
		    // Eliminate Sass interpolations from the list of id indexes
		    var interpolations = indexesOf(word, '#{');
		    if (interpolations.length) {
		      hasId = hasId.filter(function (hashIndex) {
		        return !~interpolations.indexOf(hashIndex);
		      });
		    }
		    var indices = (0, _sortAscending["default"])(uniqs([0].concat(hasClass, hasId)));
		    indices.forEach(function (ind, i) {
		      var index = indices[i + 1] || word.length;
		      var value = word.slice(ind, index);
		      if (i === 0 && firstCallback) {
		        return firstCallback.call(_this5, value, indices.length);
		      }
		      var node;
		      var current = _this5.currToken;
		      var sourceIndex = current[_tokenize.FIELDS.START_POS] + indices[i];
		      var source = getSource(current[1], current[2] + ind, current[3], current[2] + (index - 1));
		      if (~hasClass.indexOf(ind)) {
		        var classNameOpts = {
		          value: value.slice(1),
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        node = new _className["default"](unescapeProp(classNameOpts, "value"));
		      } else if (~hasId.indexOf(ind)) {
		        var idOpts = {
		          value: value.slice(1),
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        node = new _id["default"](unescapeProp(idOpts, "value"));
		      } else {
		        var tagOpts = {
		          value: value,
		          source: source,
		          sourceIndex: sourceIndex
		        };
		        unescapeProp(tagOpts, "value");
		        node = new _tag["default"](tagOpts);
		      }
		      _this5.newNode(node, namespace);
		      // Ensure that the namespace is used only once
		      namespace = null;
		    });
		    this.position++;
		  };
		  _proto.word = function word(namespace) {
		    var nextToken = this.nextToken;
		    if (nextToken && this.content(nextToken) === '|') {
		      this.position++;
		      return this.namespace();
		    }
		    return this.splitWord(namespace);
		  };
		  _proto.loop = function loop() {
		    while (this.position < this.tokens.length) {
		      this.parse(true);
		    }
		    this.current._inferEndPosition();
		    return this.root;
		  };
		  _proto.parse = function parse(throwOnParenthesis) {
		    switch (this.currToken[_tokenize.FIELDS.TYPE]) {
		      case tokens.space:
		        this.space();
		        break;
		      case tokens.comment:
		        this.comment();
		        break;
		      case tokens.openParenthesis:
		        this.parentheses();
		        break;
		      case tokens.closeParenthesis:
		        if (throwOnParenthesis) {
		          this.missingParenthesis();
		        }
		        break;
		      case tokens.openSquare:
		        this.attribute();
		        break;
		      case tokens.dollar:
		      case tokens.caret:
		      case tokens.equals:
		      case tokens.word:
		        this.word();
		        break;
		      case tokens.colon:
		        this.pseudo();
		        break;
		      case tokens.comma:
		        this.comma();
		        break;
		      case tokens.asterisk:
		        this.universal();
		        break;
		      case tokens.ampersand:
		        this.nesting();
		        break;
		      case tokens.slash:
		      case tokens.combinator:
		        this.combinator();
		        break;
		      case tokens.str:
		        this.string();
		        break;
		      // These cases throw; no break needed.
		      case tokens.closeSquare:
		        this.missingSquareBracket();
		      case tokens.semicolon:
		        this.missingBackslash();
		      default:
		        this.unexpected();
		    }
		  }

		  /**
		   * Helpers
		   */;
		  _proto.expected = function expected(description, index, found) {
		    if (Array.isArray(description)) {
		      var last = description.pop();
		      description = description.join(', ') + " or " + last;
		    }
		    var an = /^[aeiou]/.test(description[0]) ? 'an' : 'a';
		    if (!found) {
		      return this.error("Expected " + an + " " + description + ".", {
		        index: index
		      });
		    }
		    return this.error("Expected " + an + " " + description + ", found \"" + found + "\" instead.", {
		      index: index
		    });
		  };
		  _proto.requiredSpace = function requiredSpace(space) {
		    return this.options.lossy ? ' ' : space;
		  };
		  _proto.optionalSpace = function optionalSpace(space) {
		    return this.options.lossy ? '' : space;
		  };
		  _proto.lossySpace = function lossySpace(space, required) {
		    if (this.options.lossy) {
		      return required ? ' ' : '';
		    } else {
		      return space;
		    }
		  };
		  _proto.parseParenthesisToken = function parseParenthesisToken(token) {
		    var content = this.content(token);
		    if (token[_tokenize.FIELDS.TYPE] === tokens.space) {
		      return this.requiredSpace(content);
		    } else {
		      return content;
		    }
		  };
		  _proto.newNode = function newNode(node, namespace) {
		    if (namespace) {
		      if (/^ +$/.test(namespace)) {
		        if (!this.options.lossy) {
		          this.spaces = (this.spaces || '') + namespace;
		        }
		        namespace = true;
		      }
		      node.namespace = namespace;
		      unescapeProp(node, "namespace");
		    }
		    if (this.spaces) {
		      node.spaces.before = this.spaces;
		      this.spaces = '';
		    }
		    return this.current.append(node);
		  };
		  _proto.content = function content(token) {
		    if (token === void 0) {
		      token = this.currToken;
		    }
		    return this.css.slice(token[_tokenize.FIELDS.START_POS], token[_tokenize.FIELDS.END_POS]);
		  };
		  /**
		   * returns the index of the next non-whitespace, non-comment token.
		   * returns -1 if no meaningful token is found.
		   */
		  _proto.locateNextMeaningfulToken = function locateNextMeaningfulToken(startPosition) {
		    if (startPosition === void 0) {
		      startPosition = this.position + 1;
		    }
		    var searchPosition = startPosition;
		    while (searchPosition < this.tokens.length) {
		      if (WHITESPACE_EQUIV_TOKENS[this.tokens[searchPosition][_tokenize.FIELDS.TYPE]]) {
		        searchPosition++;
		        continue;
		      } else {
		        return searchPosition;
		      }
		    }
		    return -1;
		  };
		  _createClass(Parser, [{
		    key: "currToken",
		    get: function get() {
		      return this.tokens[this.position];
		    }
		  }, {
		    key: "nextToken",
		    get: function get() {
		      return this.tokens[this.position + 1];
		    }
		  }, {
		    key: "prevToken",
		    get: function get() {
		      return this.tokens[this.position - 1];
		    }
		  }]);
		  return Parser;
		}();
		exports$1["default"] = Parser;
		module.exports = exports$1.default; 
	} (parser, parser.exports));
	return parser.exports;
}

var hasRequiredProcessor;

function requireProcessor () {
	if (hasRequiredProcessor) return processor.exports;
	hasRequiredProcessor = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _parser = _interopRequireDefault(/*@__PURE__*/ requireParser());
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		var Processor = /*#__PURE__*/function () {
		  function Processor(func, options) {
		    this.func = func || function noop() {};
		    this.funcRes = null;
		    this.options = options;
		  }
		  var _proto = Processor.prototype;
		  _proto._shouldUpdateSelector = function _shouldUpdateSelector(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var merged = Object.assign({}, this.options, options);
		    if (merged.updateSelector === false) {
		      return false;
		    } else {
		      return typeof rule !== "string";
		    }
		  };
		  _proto._isLossy = function _isLossy(options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var merged = Object.assign({}, this.options, options);
		    if (merged.lossless === false) {
		      return true;
		    } else {
		      return false;
		    }
		  };
		  _proto._root = function _root(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var parser = new _parser["default"](rule, this._parseOptions(options));
		    return parser.root;
		  };
		  _proto._parseOptions = function _parseOptions(options) {
		    return {
		      lossy: this._isLossy(options)
		    };
		  };
		  _proto._run = function _run(rule, options) {
		    var _this = this;
		    if (options === void 0) {
		      options = {};
		    }
		    return new Promise(function (resolve, reject) {
		      try {
		        var root = _this._root(rule, options);
		        Promise.resolve(_this.func(root)).then(function (transform) {
		          var string = undefined;
		          if (_this._shouldUpdateSelector(rule, options)) {
		            string = root.toString();
		            rule.selector = string;
		          }
		          return {
		            transform: transform,
		            root: root,
		            string: string
		          };
		        }).then(resolve, reject);
		      } catch (e) {
		        reject(e);
		        return;
		      }
		    });
		  };
		  _proto._runSync = function _runSync(rule, options) {
		    if (options === void 0) {
		      options = {};
		    }
		    var root = this._root(rule, options);
		    var transform = this.func(root);
		    if (transform && typeof transform.then === "function") {
		      throw new Error("Selector processor returned a promise to a synchronous call.");
		    }
		    var string = undefined;
		    if (options.updateSelector && typeof rule !== "string") {
		      string = root.toString();
		      rule.selector = string;
		    }
		    return {
		      transform: transform,
		      root: root,
		      string: string
		    };
		  }

		  /**
		   * Process rule into a selector AST.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {Promise<parser.Root>} The AST of the selector after processing it.
		   */;
		  _proto.ast = function ast(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.root;
		    });
		  }

		  /**
		   * Process rule into a selector AST synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {parser.Root} The AST of the selector after processing it.
		   */;
		  _proto.astSync = function astSync(rule, options) {
		    return this._runSync(rule, options).root;
		  }

		  /**
		   * Process a selector into a transformed value asynchronously
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {Promise<any>} The value returned by the processor.
		   */;
		  _proto.transform = function transform(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.transform;
		    });
		  }

		  /**
		   * Process a selector into a transformed value synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {any} The value returned by the processor.
		   */;
		  _proto.transformSync = function transformSync(rule, options) {
		    return this._runSync(rule, options).transform;
		  }

		  /**
		   * Process a selector into a new selector string asynchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {string} the selector after processing.
		   */;
		  _proto.process = function process(rule, options) {
		    return this._run(rule, options).then(function (result) {
		      return result.string || result.root.toString();
		    });
		  }

		  /**
		   * Process a selector into a new selector string synchronously.
		   *
		   * @param rule {postcss.Rule | string} The css selector to be processed
		   * @param options The options for processing
		   * @returns {string} the selector after processing.
		   */;
		  _proto.processSync = function processSync(rule, options) {
		    var result = this._runSync(rule, options);
		    return result.string || result.root.toString();
		  };
		  return Processor;
		}();
		exports$1["default"] = Processor;
		module.exports = exports$1.default; 
	} (processor, processor.exports));
	return processor.exports;
}

var selectors = {};

var constructors = {};

var hasRequiredConstructors;

function requireConstructors () {
	if (hasRequiredConstructors) return constructors;
	hasRequiredConstructors = 1;

	constructors.__esModule = true;
	constructors.universal = constructors.tag = constructors.string = constructors.selector = constructors.root = constructors.pseudo = constructors.nesting = constructors.id = constructors.comment = constructors.combinator = constructors.className = constructors.attribute = void 0;
	var _attribute = _interopRequireDefault(/*@__PURE__*/ requireAttribute());
	var _className = _interopRequireDefault(/*@__PURE__*/ requireClassName());
	var _combinator = _interopRequireDefault(/*@__PURE__*/ requireCombinator());
	var _comment = _interopRequireDefault(/*@__PURE__*/ requireComment());
	var _id = _interopRequireDefault(/*@__PURE__*/ requireId());
	var _nesting = _interopRequireDefault(/*@__PURE__*/ requireNesting());
	var _pseudo = _interopRequireDefault(/*@__PURE__*/ requirePseudo());
	var _root = _interopRequireDefault(/*@__PURE__*/ requireRoot());
	var _selector = _interopRequireDefault(/*@__PURE__*/ requireSelector());
	var _string = _interopRequireDefault(/*@__PURE__*/ requireString());
	var _tag = _interopRequireDefault(/*@__PURE__*/ requireTag());
	var _universal = _interopRequireDefault(/*@__PURE__*/ requireUniversal());
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	var attribute = function attribute(opts) {
	  return new _attribute["default"](opts);
	};
	constructors.attribute = attribute;
	var className = function className(opts) {
	  return new _className["default"](opts);
	};
	constructors.className = className;
	var combinator = function combinator(opts) {
	  return new _combinator["default"](opts);
	};
	constructors.combinator = combinator;
	var comment = function comment(opts) {
	  return new _comment["default"](opts);
	};
	constructors.comment = comment;
	var id = function id(opts) {
	  return new _id["default"](opts);
	};
	constructors.id = id;
	var nesting = function nesting(opts) {
	  return new _nesting["default"](opts);
	};
	constructors.nesting = nesting;
	var pseudo = function pseudo(opts) {
	  return new _pseudo["default"](opts);
	};
	constructors.pseudo = pseudo;
	var root = function root(opts) {
	  return new _root["default"](opts);
	};
	constructors.root = root;
	var selector = function selector(opts) {
	  return new _selector["default"](opts);
	};
	constructors.selector = selector;
	var string = function string(opts) {
	  return new _string["default"](opts);
	};
	constructors.string = string;
	var tag = function tag(opts) {
	  return new _tag["default"](opts);
	};
	constructors.tag = tag;
	var universal = function universal(opts) {
	  return new _universal["default"](opts);
	};
	constructors.universal = universal;
	return constructors;
}

var guards = {};

var hasRequiredGuards;

function requireGuards () {
	if (hasRequiredGuards) return guards;
	hasRequiredGuards = 1;

	guards.__esModule = true;
	guards.isComment = guards.isCombinator = guards.isClassName = guards.isAttribute = void 0;
	guards.isContainer = isContainer;
	guards.isIdentifier = void 0;
	guards.isNamespace = isNamespace;
	guards.isNesting = void 0;
	guards.isNode = isNode;
	guards.isPseudo = void 0;
	guards.isPseudoClass = isPseudoClass;
	guards.isPseudoElement = isPseudoElement;
	guards.isUniversal = guards.isTag = guards.isString = guards.isSelector = guards.isRoot = void 0;
	var _types = /*@__PURE__*/ requireTypes();
	var _IS_TYPE;
	var IS_TYPE = (_IS_TYPE = {}, _IS_TYPE[_types.ATTRIBUTE] = true, _IS_TYPE[_types.CLASS] = true, _IS_TYPE[_types.COMBINATOR] = true, _IS_TYPE[_types.COMMENT] = true, _IS_TYPE[_types.ID] = true, _IS_TYPE[_types.NESTING] = true, _IS_TYPE[_types.PSEUDO] = true, _IS_TYPE[_types.ROOT] = true, _IS_TYPE[_types.SELECTOR] = true, _IS_TYPE[_types.STRING] = true, _IS_TYPE[_types.TAG] = true, _IS_TYPE[_types.UNIVERSAL] = true, _IS_TYPE);
	function isNode(node) {
	  return typeof node === "object" && IS_TYPE[node.type];
	}
	function isNodeType(type, node) {
	  return isNode(node) && node.type === type;
	}
	var isAttribute = isNodeType.bind(null, _types.ATTRIBUTE);
	guards.isAttribute = isAttribute;
	var isClassName = isNodeType.bind(null, _types.CLASS);
	guards.isClassName = isClassName;
	var isCombinator = isNodeType.bind(null, _types.COMBINATOR);
	guards.isCombinator = isCombinator;
	var isComment = isNodeType.bind(null, _types.COMMENT);
	guards.isComment = isComment;
	var isIdentifier = isNodeType.bind(null, _types.ID);
	guards.isIdentifier = isIdentifier;
	var isNesting = isNodeType.bind(null, _types.NESTING);
	guards.isNesting = isNesting;
	var isPseudo = isNodeType.bind(null, _types.PSEUDO);
	guards.isPseudo = isPseudo;
	var isRoot = isNodeType.bind(null, _types.ROOT);
	guards.isRoot = isRoot;
	var isSelector = isNodeType.bind(null, _types.SELECTOR);
	guards.isSelector = isSelector;
	var isString = isNodeType.bind(null, _types.STRING);
	guards.isString = isString;
	var isTag = isNodeType.bind(null, _types.TAG);
	guards.isTag = isTag;
	var isUniversal = isNodeType.bind(null, _types.UNIVERSAL);
	guards.isUniversal = isUniversal;
	function isPseudoElement(node) {
	  return isPseudo(node) && node.value && (node.value.startsWith("::") || node.value.toLowerCase() === ":before" || node.value.toLowerCase() === ":after" || node.value.toLowerCase() === ":first-letter" || node.value.toLowerCase() === ":first-line");
	}
	function isPseudoClass(node) {
	  return isPseudo(node) && !isPseudoElement(node);
	}
	function isContainer(node) {
	  return !!(isNode(node) && node.walk);
	}
	function isNamespace(node) {
	  return isAttribute(node) || isTag(node);
	}
	return guards;
}

var hasRequiredSelectors;

function requireSelectors () {
	if (hasRequiredSelectors) return selectors;
	hasRequiredSelectors = 1;
	(function (exports$1) {

		exports$1.__esModule = true;
		var _types = /*@__PURE__*/ requireTypes();
		Object.keys(_types).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _types[key]) return;
		  exports$1[key] = _types[key];
		});
		var _constructors = /*@__PURE__*/ requireConstructors();
		Object.keys(_constructors).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _constructors[key]) return;
		  exports$1[key] = _constructors[key];
		});
		var _guards = /*@__PURE__*/ requireGuards();
		Object.keys(_guards).forEach(function (key) {
		  if (key === "default" || key === "__esModule") return;
		  if (key in exports$1 && exports$1[key] === _guards[key]) return;
		  exports$1[key] = _guards[key];
		}); 
	} (selectors));
	return selectors;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist.exports;
	hasRequiredDist = 1;
	(function (module, exports$1) {

		exports$1.__esModule = true;
		exports$1["default"] = void 0;
		var _processor = _interopRequireDefault(/*@__PURE__*/ requireProcessor());
		var selectors = _interopRequireWildcard(/*@__PURE__*/ requireSelectors());
		function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
		function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
		function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
		var parser = function parser(processor) {
		  return new _processor["default"](processor);
		};
		Object.assign(parser, selectors);
		delete parser.__esModule;
		var _default = parser;
		exports$1["default"] = _default;
		module.exports = exports$1.default; 
	} (dist, dist.exports));
	return dist.exports;
}

var parse;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse;
	hasRequiredParse = 1;
	var openParentheses = "(".charCodeAt(0);
	var closeParentheses = ")".charCodeAt(0);
	var singleQuote = "'".charCodeAt(0);
	var doubleQuote = '"'.charCodeAt(0);
	var backslash = "\\".charCodeAt(0);
	var slash = "/".charCodeAt(0);
	var comma = ",".charCodeAt(0);
	var colon = ":".charCodeAt(0);
	var star = "*".charCodeAt(0);
	var uLower = "u".charCodeAt(0);
	var uUpper = "U".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var isUnicodeRange = /^[a-f0-9?-]+$/i;

	parse = function(input) {
	  var tokens = [];
	  var value = input;

	  var next,
	    quote,
	    prev,
	    token,
	    escape,
	    escapePos,
	    whitespacePos,
	    parenthesesOpenPos;
	  var pos = 0;
	  var code = value.charCodeAt(pos);
	  var max = value.length;
	  var stack = [{ nodes: tokens }];
	  var balanced = 0;
	  var parent;

	  var name = "";
	  var before = "";
	  var after = "";

	  while (pos < max) {
	    // Whitespaces
	    if (code <= 32) {
	      next = pos;
	      do {
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (code <= 32);
	      token = value.slice(pos, next);

	      prev = tokens[tokens.length - 1];
	      if (code === closeParentheses && balanced) {
	        after = token;
	      } else if (prev && prev.type === "div") {
	        prev.after = token;
	        prev.sourceEndIndex += token.length;
	      } else if (
	        code === comma ||
	        code === colon ||
	        (code === slash &&
	          value.charCodeAt(next + 1) !== star &&
	          (!parent ||
	            (parent && parent.type === "function" && parent.value !== "calc")))
	      ) {
	        before = token;
	      } else {
	        tokens.push({
	          type: "space",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      }

	      pos = next;

	      // Quotes
	    } else if (code === singleQuote || code === doubleQuote) {
	      next = pos;
	      quote = code === singleQuote ? "'" : '"';
	      token = {
	        type: "string",
	        sourceIndex: pos,
	        quote: quote
	      };
	      do {
	        escape = false;
	        next = value.indexOf(quote, next + 1);
	        if (~next) {
	          escapePos = next;
	          while (value.charCodeAt(escapePos - 1) === backslash) {
	            escapePos -= 1;
	            escape = !escape;
	          }
	        } else {
	          value += quote;
	          next = value.length - 1;
	          token.unclosed = true;
	        }
	      } while (escape);
	      token.value = value.slice(pos + 1, next);
	      token.sourceEndIndex = token.unclosed ? next : next + 1;
	      tokens.push(token);
	      pos = next + 1;
	      code = value.charCodeAt(pos);

	      // Comments
	    } else if (code === slash && value.charCodeAt(pos + 1) === star) {
	      next = value.indexOf("*/", pos);

	      token = {
	        type: "comment",
	        sourceIndex: pos,
	        sourceEndIndex: next + 2
	      };

	      if (next === -1) {
	        token.unclosed = true;
	        next = value.length;
	        token.sourceEndIndex = next;
	      }

	      token.value = value.slice(pos + 2, next);
	      tokens.push(token);

	      pos = next + 2;
	      code = value.charCodeAt(pos);

	      // Operation within calc
	    } else if (
	      (code === slash || code === star) &&
	      parent &&
	      parent.type === "function" &&
	      parent.value === "calc"
	    ) {
	      token = value[pos];
	      tokens.push({
	        type: "word",
	        sourceIndex: pos - before.length,
	        sourceEndIndex: pos + token.length,
	        value: token
	      });
	      pos += 1;
	      code = value.charCodeAt(pos);

	      // Dividers
	    } else if (code === slash || code === comma || code === colon) {
	      token = value[pos];

	      tokens.push({
	        type: "div",
	        sourceIndex: pos - before.length,
	        sourceEndIndex: pos + token.length,
	        value: token,
	        before: before,
	        after: ""
	      });
	      before = "";

	      pos += 1;
	      code = value.charCodeAt(pos);

	      // Open parentheses
	    } else if (openParentheses === code) {
	      // Whitespaces after open parentheses
	      next = pos;
	      do {
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (code <= 32);
	      parenthesesOpenPos = pos;
	      token = {
	        type: "function",
	        sourceIndex: pos - name.length,
	        value: name,
	        before: value.slice(parenthesesOpenPos + 1, next)
	      };
	      pos = next;

	      if (name === "url" && code !== singleQuote && code !== doubleQuote) {
	        next -= 1;
	        do {
	          escape = false;
	          next = value.indexOf(")", next + 1);
	          if (~next) {
	            escapePos = next;
	            while (value.charCodeAt(escapePos - 1) === backslash) {
	              escapePos -= 1;
	              escape = !escape;
	            }
	          } else {
	            value += ")";
	            next = value.length - 1;
	            token.unclosed = true;
	          }
	        } while (escape);
	        // Whitespaces before closed
	        whitespacePos = next;
	        do {
	          whitespacePos -= 1;
	          code = value.charCodeAt(whitespacePos);
	        } while (code <= 32);
	        if (parenthesesOpenPos < whitespacePos) {
	          if (pos !== whitespacePos + 1) {
	            token.nodes = [
	              {
	                type: "word",
	                sourceIndex: pos,
	                sourceEndIndex: whitespacePos + 1,
	                value: value.slice(pos, whitespacePos + 1)
	              }
	            ];
	          } else {
	            token.nodes = [];
	          }
	          if (token.unclosed && whitespacePos + 1 !== next) {
	            token.after = "";
	            token.nodes.push({
	              type: "space",
	              sourceIndex: whitespacePos + 1,
	              sourceEndIndex: next,
	              value: value.slice(whitespacePos + 1, next)
	            });
	          } else {
	            token.after = value.slice(whitespacePos + 1, next);
	            token.sourceEndIndex = next;
	          }
	        } else {
	          token.after = "";
	          token.nodes = [];
	        }
	        pos = next + 1;
	        token.sourceEndIndex = token.unclosed ? next : pos;
	        code = value.charCodeAt(pos);
	        tokens.push(token);
	      } else {
	        balanced += 1;
	        token.after = "";
	        token.sourceEndIndex = pos + 1;
	        tokens.push(token);
	        stack.push(token);
	        tokens = token.nodes = [];
	        parent = token;
	      }
	      name = "";

	      // Close parentheses
	    } else if (closeParentheses === code && balanced) {
	      pos += 1;
	      code = value.charCodeAt(pos);

	      parent.after = after;
	      parent.sourceEndIndex += after.length;
	      after = "";
	      balanced -= 1;
	      stack[stack.length - 1].sourceEndIndex = pos;
	      stack.pop();
	      parent = stack[balanced];
	      tokens = parent.nodes;

	      // Words
	    } else {
	      next = pos;
	      do {
	        if (code === backslash) {
	          next += 1;
	        }
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (
	        next < max &&
	        !(
	          code <= 32 ||
	          code === singleQuote ||
	          code === doubleQuote ||
	          code === comma ||
	          code === colon ||
	          code === slash ||
	          code === openParentheses ||
	          (code === star &&
	            parent &&
	            parent.type === "function" &&
	            parent.value === "calc") ||
	          (code === slash &&
	            parent.type === "function" &&
	            parent.value === "calc") ||
	          (code === closeParentheses && balanced)
	        )
	      );
	      token = value.slice(pos, next);

	      if (openParentheses === code) {
	        name = token;
	      } else if (
	        (uLower === token.charCodeAt(0) || uUpper === token.charCodeAt(0)) &&
	        plus === token.charCodeAt(1) &&
	        isUnicodeRange.test(token.slice(2))
	      ) {
	        tokens.push({
	          type: "unicode-range",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      } else {
	        tokens.push({
	          type: "word",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      }

	      pos = next;
	    }
	  }

	  for (pos = stack.length - 1; pos; pos -= 1) {
	    stack[pos].unclosed = true;
	    stack[pos].sourceEndIndex = value.length;
	  }

	  return stack[0].nodes;
	};
	return parse;
}

var walk$1;
var hasRequiredWalk;

function requireWalk () {
	if (hasRequiredWalk) return walk$1;
	hasRequiredWalk = 1;
	walk$1 = function walk(nodes, cb, bubble) {
	  var i, max, node, result;

	  for (i = 0, max = nodes.length; i < max; i += 1) {
	    node = nodes[i];
	    if (!bubble) {
	      result = cb(node, i, nodes);
	    }

	    if (
	      result !== false &&
	      node.type === "function" &&
	      Array.isArray(node.nodes)
	    ) {
	      walk(node.nodes, cb, bubble);
	    }

	    if (bubble) {
	      cb(node, i, nodes);
	    }
	  }
	};
	return walk$1;
}

var stringify_1;
var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify_1;
	hasRequiredStringify = 1;
	function stringifyNode(node, custom) {
	  var type = node.type;
	  var value = node.value;
	  var buf;
	  var customResult;

	  if (custom && (customResult = custom(node)) !== undefined) {
	    return customResult;
	  } else if (type === "word" || type === "space") {
	    return value;
	  } else if (type === "string") {
	    buf = node.quote || "";
	    return buf + value + (node.unclosed ? "" : buf);
	  } else if (type === "comment") {
	    return "/*" + value + (node.unclosed ? "" : "*/");
	  } else if (type === "div") {
	    return (node.before || "") + value + (node.after || "");
	  } else if (Array.isArray(node.nodes)) {
	    buf = stringify(node.nodes, custom);
	    if (type !== "function") {
	      return buf;
	    }
	    return (
	      value +
	      "(" +
	      (node.before || "") +
	      buf +
	      (node.after || "") +
	      (node.unclosed ? "" : ")")
	    );
	  }
	  return value;
	}

	function stringify(nodes, custom) {
	  var result, i;

	  if (Array.isArray(nodes)) {
	    result = "";
	    for (i = nodes.length - 1; ~i; i -= 1) {
	      result = stringifyNode(nodes[i], custom) + result;
	    }
	    return result;
	  }
	  return stringifyNode(nodes, custom);
	}

	stringify_1 = stringify;
	return stringify_1;
}

var unit;
var hasRequiredUnit;

function requireUnit () {
	if (hasRequiredUnit) return unit;
	hasRequiredUnit = 1;
	var minus = "-".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var dot = ".".charCodeAt(0);
	var exp = "e".charCodeAt(0);
	var EXP = "E".charCodeAt(0);

	// Check if three code points would start a number
	// https://www.w3.org/TR/css-syntax-3/#starts-with-a-number
	function likeNumber(value) {
	  var code = value.charCodeAt(0);
	  var nextCode;

	  if (code === plus || code === minus) {
	    nextCode = value.charCodeAt(1);

	    if (nextCode >= 48 && nextCode <= 57) {
	      return true;
	    }

	    var nextNextCode = value.charCodeAt(2);

	    if (nextCode === dot && nextNextCode >= 48 && nextNextCode <= 57) {
	      return true;
	    }

	    return false;
	  }

	  if (code === dot) {
	    nextCode = value.charCodeAt(1);

	    if (nextCode >= 48 && nextCode <= 57) {
	      return true;
	    }

	    return false;
	  }

	  if (code >= 48 && code <= 57) {
	    return true;
	  }

	  return false;
	}

	// Consume a number
	// https://www.w3.org/TR/css-syntax-3/#consume-number
	unit = function(value) {
	  var pos = 0;
	  var length = value.length;
	  var code;
	  var nextCode;
	  var nextNextCode;

	  if (length === 0 || !likeNumber(value)) {
	    return false;
	  }

	  code = value.charCodeAt(pos);

	  if (code === plus || code === minus) {
	    pos++;
	  }

	  while (pos < length) {
	    code = value.charCodeAt(pos);

	    if (code < 48 || code > 57) {
	      break;
	    }

	    pos += 1;
	  }

	  code = value.charCodeAt(pos);
	  nextCode = value.charCodeAt(pos + 1);

	  if (code === dot && nextCode >= 48 && nextCode <= 57) {
	    pos += 2;

	    while (pos < length) {
	      code = value.charCodeAt(pos);

	      if (code < 48 || code > 57) {
	        break;
	      }

	      pos += 1;
	    }
	  }

	  code = value.charCodeAt(pos);
	  nextCode = value.charCodeAt(pos + 1);
	  nextNextCode = value.charCodeAt(pos + 2);

	  if (
	    (code === exp || code === EXP) &&
	    ((nextCode >= 48 && nextCode <= 57) ||
	      ((nextCode === plus || nextCode === minus) &&
	        nextNextCode >= 48 &&
	        nextNextCode <= 57))
	  ) {
	    pos += nextCode === plus || nextCode === minus ? 3 : 2;

	    while (pos < length) {
	      code = value.charCodeAt(pos);

	      if (code < 48 || code > 57) {
	        break;
	      }

	      pos += 1;
	    }
	  }

	  return {
	    number: value.slice(0, pos),
	    unit: value.slice(pos)
	  };
	};
	return unit;
}

var lib;
var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	var parse = /*@__PURE__*/ requireParse();
	var walk = /*@__PURE__*/ requireWalk();
	var stringify = /*@__PURE__*/ requireStringify();

	function ValueParser(value) {
	  if (this instanceof ValueParser) {
	    this.nodes = parse(value);
	    return this;
	  }
	  return new ValueParser(value);
	}

	ValueParser.prototype.toString = function() {
	  return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
	};

	ValueParser.prototype.walk = function(cb, bubble) {
	  walk(this.nodes, cb, bubble);
	  return this;
	};

	ValueParser.unit = /*@__PURE__*/ requireUnit();

	ValueParser.walk = walk;

	ValueParser.stringify = stringify;

	lib = ValueParser;
	return lib;
}

var hasRequiredSrc$2;

function requireSrc$2 () {
	if (hasRequiredSrc$2) return src$2.exports;
	hasRequiredSrc$2 = 1;

	const selectorParser = /*@__PURE__*/ requireDist();
	const valueParser = /*@__PURE__*/ requireLib();
	const { extractICSS } = /*@__PURE__*/ requireSrc$4();

	const isSpacing = (node) => node.type === "combinator" && node.value === " ";

	function normalizeNodeArray(nodes) {
	  const array = [];

	  nodes.forEach((x) => {
	    if (Array.isArray(x)) {
	      normalizeNodeArray(x).forEach((item) => {
	        array.push(item);
	      });
	    } else if (x) {
	      array.push(x);
	    }
	  });

	  if (array.length > 0 && isSpacing(array[array.length - 1])) {
	    array.pop();
	  }
	  return array;
	}

	function localizeNode(rule, mode, localAliasMap) {
	  const transform = (node, context) => {
	    if (context.ignoreNextSpacing && !isSpacing(node)) {
	      throw new Error("Missing whitespace after " + context.ignoreNextSpacing);
	    }

	    if (context.enforceNoSpacing && isSpacing(node)) {
	      throw new Error("Missing whitespace before " + context.enforceNoSpacing);
	    }

	    let newNodes;

	    switch (node.type) {
	      case "root": {
	        let resultingGlobal;

	        context.hasPureGlobals = false;

	        newNodes = node.nodes.map((n) => {
	          const nContext = {
	            global: context.global,
	            lastWasSpacing: true,
	            hasLocals: false,
	            explicit: false,
	          };

	          n = transform(n, nContext);

	          if (typeof resultingGlobal === "undefined") {
	            resultingGlobal = nContext.global;
	          } else if (resultingGlobal !== nContext.global) {
	            throw new Error(
	              'Inconsistent rule global/local result in rule "' +
	                node +
	                '" (multiple selectors must result in the same mode for the rule)'
	            );
	          }

	          if (!nContext.hasLocals) {
	            context.hasPureGlobals = true;
	          }

	          return n;
	        });

	        context.global = resultingGlobal;

	        node.nodes = normalizeNodeArray(newNodes);
	        break;
	      }
	      case "selector": {
	        newNodes = node.map((childNode) => transform(childNode, context));

	        node = node.clone();
	        node.nodes = normalizeNodeArray(newNodes);
	        break;
	      }
	      case "combinator": {
	        if (isSpacing(node)) {
	          if (context.ignoreNextSpacing) {
	            context.ignoreNextSpacing = false;
	            context.lastWasSpacing = false;
	            context.enforceNoSpacing = false;
	            return null;
	          }
	          context.lastWasSpacing = true;
	          return node;
	        }
	        break;
	      }
	      case "pseudo": {
	        let childContext;
	        const isNested = !!node.length;
	        const isScoped = node.value === ":local" || node.value === ":global";
	        const isImportExport =
	          node.value === ":import" || node.value === ":export";

	        if (isImportExport) {
	          context.hasLocals = true;
	          // :local(.foo)
	        } else if (isNested) {
	          if (isScoped) {
	            if (node.nodes.length === 0) {
	              throw new Error(`${node.value}() can't be empty`);
	            }

	            if (context.inside) {
	              throw new Error(
	                `A ${node.value} is not allowed inside of a ${context.inside}(...)`
	              );
	            }

	            childContext = {
	              global: node.value === ":global",
	              inside: node.value,
	              hasLocals: false,
	              explicit: true,
	            };

	            newNodes = node
	              .map((childNode) => transform(childNode, childContext))
	              .reduce((acc, next) => acc.concat(next.nodes), []);

	            if (newNodes.length) {
	              const { before, after } = node.spaces;

	              const first = newNodes[0];
	              const last = newNodes[newNodes.length - 1];

	              first.spaces = { before, after: first.spaces.after };
	              last.spaces = { before: last.spaces.before, after };
	            }

	            node = newNodes;

	            break;
	          } else {
	            childContext = {
	              global: context.global,
	              inside: context.inside,
	              lastWasSpacing: true,
	              hasLocals: false,
	              explicit: context.explicit,
	            };
	            newNodes = node.map((childNode) => {
	              const newContext = {
	                ...childContext,
	                enforceNoSpacing: false,
	              };

	              const result = transform(childNode, newContext);

	              childContext.global = newContext.global;
	              childContext.hasLocals = newContext.hasLocals;

	              return result;
	            });

	            node = node.clone();
	            node.nodes = normalizeNodeArray(newNodes);

	            if (childContext.hasLocals) {
	              context.hasLocals = true;
	            }
	          }
	          break;

	          //:local .foo .bar
	        } else if (isScoped) {
	          if (context.inside) {
	            throw new Error(
	              `A ${node.value} is not allowed inside of a ${context.inside}(...)`
	            );
	          }

	          const addBackSpacing = !!node.spaces.before;

	          context.ignoreNextSpacing = context.lastWasSpacing
	            ? node.value
	            : false;

	          context.enforceNoSpacing = context.lastWasSpacing
	            ? false
	            : node.value;

	          context.global = node.value === ":global";
	          context.explicit = true;

	          // because this node has spacing that is lost when we remove it
	          // we make up for it by adding an extra combinator in since adding
	          // spacing on the parent selector doesn't work
	          return addBackSpacing
	            ? selectorParser.combinator({ value: " " })
	            : null;
	        }
	        break;
	      }
	      case "id":
	      case "class": {
	        if (!node.value) {
	          throw new Error("Invalid class or id selector syntax");
	        }

	        if (context.global) {
	          break;
	        }

	        const isImportedValue = localAliasMap.has(node.value);
	        const isImportedWithExplicitScope = isImportedValue && context.explicit;

	        if (!isImportedValue || isImportedWithExplicitScope) {
	          const innerNode = node.clone();
	          innerNode.spaces = { before: "", after: "" };

	          node = selectorParser.pseudo({
	            value: ":local",
	            nodes: [innerNode],
	            spaces: node.spaces,
	          });

	          context.hasLocals = true;
	        }

	        break;
	      }
	      case "nesting": {
	        if (node.value === "&") {
	          context.hasLocals = true;
	        }
	      }
	    }

	    context.lastWasSpacing = false;
	    context.ignoreNextSpacing = false;
	    context.enforceNoSpacing = false;

	    return node;
	  };

	  const rootContext = {
	    global: mode === "global",
	    hasPureGlobals: false,
	  };

	  rootContext.selector = selectorParser((root) => {
	    transform(root, rootContext);
	  }).processSync(rule, { updateSelector: false, lossless: true });

	  return rootContext;
	}

	function localizeDeclNode(node, context) {
	  switch (node.type) {
	    case "word":
	      if (context.localizeNextItem) {
	        if (!context.localAliasMap.has(node.value)) {
	          node.value = ":local(" + node.value + ")";
	          context.localizeNextItem = false;
	        }
	      }
	      break;

	    case "function":
	      if (
	        context.options &&
	        context.options.rewriteUrl &&
	        node.value.toLowerCase() === "url"
	      ) {
	        node.nodes.map((nestedNode) => {
	          if (nestedNode.type !== "string" && nestedNode.type !== "word") {
	            return;
	          }

	          let newUrl = context.options.rewriteUrl(
	            context.global,
	            nestedNode.value
	          );

	          switch (nestedNode.type) {
	            case "string":
	              if (nestedNode.quote === "'") {
	                newUrl = newUrl.replace(/(\\)/g, "\\$1").replace(/'/g, "\\'");
	              }

	              if (nestedNode.quote === '"') {
	                newUrl = newUrl.replace(/(\\)/g, "\\$1").replace(/"/g, '\\"');
	              }

	              break;
	            case "word":
	              newUrl = newUrl.replace(/("|'|\)|\\)/g, "\\$1");
	              break;
	          }

	          nestedNode.value = newUrl;
	        });
	      }
	      break;
	  }
	  return node;
	}

	// `none` is special value, other is global values
	const specialKeywords = [
	  "none",
	  "inherit",
	  "initial",
	  "revert",
	  "revert-layer",
	  "unset",
	];

	function localizeDeclarationValues(localize, declaration, context) {
	  const valueNodes = valueParser(declaration.value);

	  valueNodes.walk((node, index, nodes) => {
	    if (
	      node.type === "function" &&
	      (node.value.toLowerCase() === "var" || node.value.toLowerCase() === "env")
	    ) {
	      return false;
	    }

	    if (
	      node.type === "word" &&
	      specialKeywords.includes(node.value.toLowerCase())
	    ) {
	      return;
	    }

	    const subContext = {
	      options: context.options,
	      global: context.global,
	      localizeNextItem: localize && !context.global,
	      localAliasMap: context.localAliasMap,
	    };
	    nodes[index] = localizeDeclNode(node, subContext);
	  });

	  declaration.value = valueNodes.toString();
	}

	function localizeDeclaration(declaration, context) {
	  const isAnimation = /animation$/i.test(declaration.prop);

	  if (isAnimation) {
	    // letter
	    // An uppercase letter or a lowercase letter.
	    //
	    // ident-start code point
	    // A letter, a non-ASCII code point, or U+005F LOW LINE (_).
	    //
	    // ident code point
	    // An ident-start code point, a digit, or U+002D HYPHEN-MINUS (-).

	    // We don't validate `hex digits`, because we don't need it, it is work of linters.
	    const validIdent =
	      /^-?([a-z\u0080-\uFFFF_]|(\\[^\r\n\f])|-(?![0-9]))((\\[^\r\n\f])|[a-z\u0080-\uFFFF_0-9-])*$/i;

	    /*
	    The spec defines some keywords that you can use to describe properties such as the timing
	    function. These are still valid animation names, so as long as there is a property that accepts
	    a keyword, it is given priority. Only when all the properties that can take a keyword are
	    exhausted can the animation name be set to the keyword. I.e.

	    animation: infinite infinite;

	    The animation will repeat an infinite number of times from the first argument, and will have an
	    animation name of infinite from the second.
	    */
	    const animationKeywords = {
	      // animation-direction
	      $normal: 1,
	      $reverse: 1,
	      $alternate: 1,
	      "$alternate-reverse": 1,
	      // animation-fill-mode
	      $forwards: 1,
	      $backwards: 1,
	      $both: 1,
	      // animation-iteration-count
	      $infinite: 1,
	      // animation-play-state
	      $paused: 1,
	      $running: 1,
	      // animation-timing-function
	      $ease: 1,
	      "$ease-in": 1,
	      "$ease-out": 1,
	      "$ease-in-out": 1,
	      $linear: 1,
	      "$step-end": 1,
	      "$step-start": 1,
	      // Special
	      $none: Infinity, // No matter how many times you write none, it will never be an animation name
	      // Global values
	      $initial: Infinity,
	      $inherit: Infinity,
	      $unset: Infinity,
	      $revert: Infinity,
	      "$revert-layer": Infinity,
	    };
	    let parsedAnimationKeywords = {};
	    const valueNodes = valueParser(declaration.value).walk((node) => {
	      // If div-token appeared (represents as comma ','), a possibility of an animation-keywords should be reflesh.
	      if (node.type === "div") {
	        parsedAnimationKeywords = {};

	        return;
	      }
	      // Do not handle nested functions
	      else if (node.type === "function") {
	        return false;
	      }
	      // Ignore all except word
	      else if (node.type !== "word") {
	        return;
	      }

	      const value = node.type === "word" ? node.value.toLowerCase() : null;

	      let shouldParseAnimationName = false;

	      if (value && validIdent.test(value)) {
	        if ("$" + value in animationKeywords) {
	          parsedAnimationKeywords["$" + value] =
	            "$" + value in parsedAnimationKeywords
	              ? parsedAnimationKeywords["$" + value] + 1
	              : 0;

	          shouldParseAnimationName =
	            parsedAnimationKeywords["$" + value] >=
	            animationKeywords["$" + value];
	        } else {
	          shouldParseAnimationName = true;
	        }
	      }

	      const subContext = {
	        options: context.options,
	        global: context.global,
	        localizeNextItem: shouldParseAnimationName && !context.global,
	        localAliasMap: context.localAliasMap,
	      };

	      return localizeDeclNode(node, subContext);
	    });

	    declaration.value = valueNodes.toString();

	    return;
	  }

	  const isAnimationName = /animation(-name)?$/i.test(declaration.prop);

	  if (isAnimationName) {
	    return localizeDeclarationValues(true, declaration, context);
	  }

	  const hasUrl = /url\(/i.test(declaration.value);

	  if (hasUrl) {
	    return localizeDeclarationValues(false, declaration, context);
	  }
	}

	src$2.exports = (options = {}) => {
	  if (
	    options &&
	    options.mode &&
	    options.mode !== "global" &&
	    options.mode !== "local" &&
	    options.mode !== "pure"
	  ) {
	    throw new Error(
	      'options.mode must be either "global", "local" or "pure" (default "local")'
	    );
	  }

	  const pureMode = options && options.mode === "pure";
	  const globalMode = options && options.mode === "global";

	  return {
	    postcssPlugin: "postcss-modules-local-by-default",
	    prepare() {
	      const localAliasMap = new Map();

	      return {
	        Once(root) {
	          const { icssImports } = extractICSS(root, false);

	          Object.keys(icssImports).forEach((key) => {
	            Object.keys(icssImports[key]).forEach((prop) => {
	              localAliasMap.set(prop, icssImports[key][prop]);
	            });
	          });

	          root.walkAtRules((atRule) => {
	            if (/keyframes$/i.test(atRule.name)) {
	              const globalMatch = /^\s*:global\s*\((.+)\)\s*$/.exec(
	                atRule.params
	              );
	              const localMatch = /^\s*:local\s*\((.+)\)\s*$/.exec(
	                atRule.params
	              );

	              let globalKeyframes = globalMode;

	              if (globalMatch) {
	                if (pureMode) {
	                  throw atRule.error(
	                    "@keyframes :global(...) is not allowed in pure mode"
	                  );
	                }
	                atRule.params = globalMatch[1];
	                globalKeyframes = true;
	              } else if (localMatch) {
	                atRule.params = localMatch[0];
	                globalKeyframes = false;
	              } else if (
	                atRule.params &&
	                !globalMode &&
	                !localAliasMap.has(atRule.params)
	              ) {
	                atRule.params = ":local(" + atRule.params + ")";
	              }

	              atRule.walkDecls((declaration) => {
	                localizeDeclaration(declaration, {
	                  localAliasMap,
	                  options: options,
	                  global: globalKeyframes,
	                });
	              });
	            } else if (/scope$/i.test(atRule.name)) {
	              if (atRule.params) {
	                atRule.params = atRule.params
	                  .split("to")
	                  .map((item) => {
	                    const selector = item.trim().slice(1, -1).trim();
	                    const context = localizeNode(
	                      selector,
	                      options.mode,
	                      localAliasMap
	                    );

	                    context.options = options;
	                    context.localAliasMap = localAliasMap;

	                    if (pureMode && context.hasPureGlobals) {
	                      throw atRule.error(
	                        'Selector in at-rule"' +
	                          selector +
	                          '" is not pure ' +
	                          "(pure selectors must contain at least one local class or id)"
	                      );
	                    }

	                    return `(${context.selector})`;
	                  })
	                  .join(" to ");
	              }

	              atRule.nodes.forEach((declaration) => {
	                if (declaration.type === "decl") {
	                  localizeDeclaration(declaration, {
	                    localAliasMap,
	                    options: options,
	                    global: globalMode,
	                  });
	                }
	              });
	            } else if (atRule.nodes) {
	              atRule.nodes.forEach((declaration) => {
	                if (declaration.type === "decl") {
	                  localizeDeclaration(declaration, {
	                    localAliasMap,
	                    options: options,
	                    global: globalMode,
	                  });
	                }
	              });
	            }
	          });

	          root.walkRules((rule) => {
	            if (
	              rule.parent &&
	              rule.parent.type === "atrule" &&
	              /keyframes$/i.test(rule.parent.name)
	            ) {
	              // ignore keyframe rules
	              return;
	            }

	            const context = localizeNode(rule, options.mode, localAliasMap);

	            context.options = options;
	            context.localAliasMap = localAliasMap;

	            if (pureMode && context.hasPureGlobals) {
	              throw rule.error(
	                'Selector "' +
	                  rule.selector +
	                  '" is not pure ' +
	                  "(pure selectors must contain at least one local class or id)"
	              );
	            }

	            rule.selector = context.selector;

	            // Less-syntax mixins parse as rules with no nodes
	            if (rule.nodes) {
	              rule.nodes.forEach((declaration) =>
	                localizeDeclaration(declaration, context)
	              );
	            }
	          });
	        },
	      };
	    },
	  };
	};
	src$2.exports.postcss = true;
	return src$2.exports;
}

var src$1;
var hasRequiredSrc$1;

function requireSrc$1 () {
	if (hasRequiredSrc$1) return src$1;
	hasRequiredSrc$1 = 1;

	const selectorParser = /*@__PURE__*/ requireDist();

	const hasOwnProperty = Object.prototype.hasOwnProperty;

	function isNestedRule(rule) {
	  if (!rule.parent || rule.parent.type === "root") {
	    return false;
	  }

	  if (rule.parent.type === "rule") {
	    return true;
	  }

	  return isNestedRule(rule.parent);
	}

	function getSingleLocalNamesForComposes(root, rule) {
	  if (isNestedRule(rule)) {
	    throw new Error(`composition is not allowed in nested rule \n\n${rule}`);
	  }

	  return root.nodes.map((node) => {
	    if (node.type !== "selector" || node.nodes.length !== 1) {
	      throw new Error(
	        `composition is only allowed when selector is single :local class name not in "${root}"`
	      );
	    }

	    node = node.nodes[0];

	    if (
	      node.type !== "pseudo" ||
	      node.value !== ":local" ||
	      node.nodes.length !== 1
	    ) {
	      throw new Error(
	        'composition is only allowed when selector is single :local class name not in "' +
	          root +
	          '", "' +
	          node +
	          '" is weird'
	      );
	    }

	    node = node.first;

	    if (node.type !== "selector" || node.length !== 1) {
	      throw new Error(
	        'composition is only allowed when selector is single :local class name not in "' +
	          root +
	          '", "' +
	          node +
	          '" is weird'
	      );
	    }

	    node = node.first;

	    if (node.type !== "class") {
	      // 'id' is not possible, because you can't compose ids
	      throw new Error(
	        'composition is only allowed when selector is single :local class name not in "' +
	          root +
	          '", "' +
	          node +
	          '" is weird'
	      );
	    }

	    return node.value;
	  });
	}

	const whitespace = "[\\x20\\t\\r\\n\\f]";
	const unescapeRegExp = new RegExp(
	  "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)",
	  "ig"
	);

	function unescape(str) {
	  return str.replace(unescapeRegExp, (_, escaped, escapedWhitespace) => {
	    const high = "0x" + escaped - 0x10000;

	    // NaN means non-codepoint
	    // Workaround erroneous numeric interpretation of +"0x"
	    return high !== high || escapedWhitespace
	      ? escaped
	      : high < 0
	      ? // BMP codepoint
	        String.fromCharCode(high + 0x10000)
	      : // Supplemental Plane codepoint (surrogate pair)
	        String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
	  });
	}

	const plugin = (options = {}) => {
	  const generateScopedName =
	    (options && options.generateScopedName) || plugin.generateScopedName;
	  const generateExportEntry =
	    (options && options.generateExportEntry) || plugin.generateExportEntry;
	  const exportGlobals = options && options.exportGlobals;

	  return {
	    postcssPlugin: "postcss-modules-scope",
	    Once(root, { rule }) {
	      const exports$1 = Object.create(null);

	      function exportScopedName(name, rawName, node) {
	        const scopedName = generateScopedName(
	          rawName ? rawName : name,
	          root.source.input.from,
	          root.source.input.css,
	          node
	        );
	        const exportEntry = generateExportEntry(
	          rawName ? rawName : name,
	          scopedName,
	          root.source.input.from,
	          root.source.input.css,
	          node
	        );
	        const { key, value } = exportEntry;

	        exports$1[key] = exports$1[key] || [];

	        if (exports$1[key].indexOf(value) < 0) {
	          exports$1[key].push(value);
	        }

	        return scopedName;
	      }

	      function localizeNode(node) {
	        switch (node.type) {
	          case "selector":
	            node.nodes = node.map((item) => localizeNode(item));
	            return node;
	          case "class":
	            return selectorParser.className({
	              value: exportScopedName(
	                node.value,
	                node.raws && node.raws.value ? node.raws.value : null,
	                node
	              ),
	            });
	          case "id": {
	            return selectorParser.id({
	              value: exportScopedName(
	                node.value,
	                node.raws && node.raws.value ? node.raws.value : null,
	                node
	              ),
	            });
	          }
	          case "attribute": {
	            if (node.attribute === "class" && node.operator === "=") {
	              return selectorParser.attribute({
	                attribute: node.attribute,
	                operator: node.operator,
	                quoteMark: "'",
	                value: exportScopedName(node.value, null, null),
	              });
	            }
	          }
	        }

	        throw new Error(
	          `${node.type} ("${node}") is not allowed in a :local block`
	        );
	      }

	      function traverseNode(node) {
	        switch (node.type) {
	          case "pseudo":
	            if (node.value === ":local") {
	              if (node.nodes.length !== 1) {
	                throw new Error('Unexpected comma (",") in :local block');
	              }

	              const selector = localizeNode(node.first);
	              // move the spaces that were around the pseudo selector to the first
	              // non-container node
	              selector.first.spaces = node.spaces;

	              const nextNode = node.next();

	              if (
	                nextNode &&
	                nextNode.type === "combinator" &&
	                nextNode.value === " " &&
	                /\\[A-F0-9]{1,6}$/.test(selector.last.value)
	              ) {
	                selector.last.spaces.after = " ";
	              }

	              node.replaceWith(selector);

	              return;
	            }
	          /* falls through */
	          case "root":
	          case "selector": {
	            node.each((item) => traverseNode(item));
	            break;
	          }
	          case "id":
	          case "class":
	            if (exportGlobals) {
	              exports$1[node.value] = [node.value];
	            }
	            break;
	        }
	        return node;
	      }

	      // Find any :import and remember imported names
	      const importedNames = {};

	      root.walkRules(/^:import\(.+\)$/, (rule) => {
	        rule.walkDecls((decl) => {
	          importedNames[decl.prop] = true;
	        });
	      });

	      // Find any :local selectors
	      root.walkRules((rule) => {
	        let parsedSelector = selectorParser().astSync(rule);

	        rule.selector = traverseNode(parsedSelector.clone()).toString();

	        rule.walkDecls(/^(composes|compose-with)$/i, (decl) => {
	          const localNames = getSingleLocalNamesForComposes(
	            parsedSelector,
	            decl.parent
	          );
	          const multiple = decl.value.split(",");

	          multiple.forEach((value) => {
	            const classes = value.trim().split(/\s+/);

	            classes.forEach((className) => {
	              const global = /^global\(([^)]+)\)$/.exec(className);

	              if (global) {
	                localNames.forEach((exportedName) => {
	                  exports$1[exportedName].push(global[1]);
	                });
	              } else if (hasOwnProperty.call(importedNames, className)) {
	                localNames.forEach((exportedName) => {
	                  exports$1[exportedName].push(className);
	                });
	              } else if (hasOwnProperty.call(exports$1, className)) {
	                localNames.forEach((exportedName) => {
	                  exports$1[className].forEach((item) => {
	                    exports$1[exportedName].push(item);
	                  });
	                });
	              } else {
	                throw decl.error(
	                  `referenced class name "${className}" in ${decl.prop} not found`
	                );
	              }
	            });
	          });

	          decl.remove();
	        });

	        // Find any :local values
	        rule.walkDecls((decl) => {
	          if (!/:local\s*\((.+?)\)/.test(decl.value)) {
	            return;
	          }

	          let tokens = decl.value.split(/(,|'[^']*'|"[^"]*")/);

	          tokens = tokens.map((token, idx) => {
	            if (idx === 0 || tokens[idx - 1] === ",") {
	              let result = token;

	              const localMatch = /:local\s*\((.+?)\)/.exec(token);

	              if (localMatch) {
	                const input = localMatch.input;
	                const matchPattern = localMatch[0];
	                const matchVal = localMatch[1];
	                const newVal = exportScopedName(matchVal);

	                result = input.replace(matchPattern, newVal);
	              } else {
	                return token;
	              }

	              return result;
	            } else {
	              return token;
	            }
	          });

	          decl.value = tokens.join("");
	        });
	      });

	      // Find any :local keyframes
	      root.walkAtRules(/keyframes$/i, (atRule) => {
	        const localMatch = /^\s*:local\s*\((.+?)\)\s*$/.exec(atRule.params);

	        if (!localMatch) {
	          return;
	        }

	        atRule.params = exportScopedName(localMatch[1]);
	      });

	      root.walkAtRules(/scope$/i, (atRule) => {
	        if (atRule.params) {
	          atRule.params = atRule.params
	            .split("to")
	            .map((item) => {
	              const selector = item.trim().slice(1, -1).trim();

	              const localMatch = /^\s*:local\s*\((.+?)\)\s*$/.exec(selector);

	              if (!localMatch) {
	                return `(${selector})`;
	              }

	              let parsedSelector = selectorParser().astSync(selector);

	              return `(${traverseNode(parsedSelector).toString()})`;
	            })
	            .join(" to ");
	        }
	      });

	      // If we found any :locals, insert an :export rule
	      const exportedNames = Object.keys(exports$1);

	      if (exportedNames.length > 0) {
	        const exportRule = rule({ selector: ":export" });

	        exportedNames.forEach((exportedName) =>
	          exportRule.append({
	            prop: exportedName,
	            value: exports$1[exportedName].join(" "),
	            raws: { before: "\n  " },
	          })
	        );

	        root.append(exportRule);
	      }
	    },
	  };
	};

	plugin.postcss = true;

	plugin.generateScopedName = function (name, path) {
	  const sanitisedPath = path
	    .replace(/\.[^./\\]+$/, "")
	    .replace(/[\W_]+/g, "_")
	    .replace(/^_|_$/g, "");

	  return `_${sanitisedPath}__${name}`.trim();
	};

	plugin.generateExportEntry = function (name, scopedName) {
	  return {
	    key: unescape(name),
	    value: unescape(scopedName),
	  };
	};

	src$1 = plugin;
	return src$1;
}

var stringHash;
var hasRequiredStringHash;

function requireStringHash () {
	if (hasRequiredStringHash) return stringHash;
	hasRequiredStringHash = 1;

	function hash(str) {
	  var hash = 5381,
	      i    = str.length;

	  while(i) {
	    hash = (hash * 33) ^ str.charCodeAt(--i);
	  }

	  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
	   * integers. Since we want the results to be always positive, convert the
	   * signed int to an unsigned by doing an unsigned bitshift. */
	  return hash >>> 0;
	}

	stringHash = hash;
	return stringHash;
}

var src = {exports: {}};

var hasRequiredSrc;

function requireSrc () {
	if (hasRequiredSrc) return src.exports;
	hasRequiredSrc = 1;

	const ICSSUtils = /*@__PURE__*/ requireSrc$4();

	const matchImports = /^(.+?|\([\s\S]+?\))\s+from\s+("[^"]*"|'[^']*'|[\w-]+)$/;
	const matchValueDefinition = /(?:\s+|^)([\w-]+):?(.*?)$/;
	const matchImport = /^([\w-]+)(?:\s+as\s+([\w-]+))?/;

	src.exports = (options) => {
	  let importIndex = 0;
	  const createImportedName =
	    (options && options.createImportedName) ||
	    ((importName /*, path*/) =>
	      `i__const_${importName.replace(/\W/g, "_")}_${importIndex++}`);

	  return {
	    postcssPlugin: "postcss-modules-values",
	    prepare(result) {
	      const importAliases = [];
	      const definitions = {};

	      return {
	        Once(root, postcss) {
	          root.walkAtRules(/value/i, (atRule) => {
	            const matches = atRule.params.match(matchImports);

	            if (matches) {
	              let [, /*match*/ aliases, path] = matches;

	              // We can use constants for path names
	              if (definitions[path]) {
	                path = definitions[path];
	              }

	              const imports = aliases
	                .replace(/^\(\s*([\s\S]+)\s*\)$/, "$1")
	                .split(/\s*,\s*/)
	                .map((alias) => {
	                  const tokens = matchImport.exec(alias);

	                  if (tokens) {
	                    const [, /*match*/ theirName, myName = theirName] = tokens;
	                    const importedName = createImportedName(myName);
	                    definitions[myName] = importedName;
	                    return { theirName, importedName };
	                  } else {
	                    throw new Error(`@import statement "${alias}" is invalid!`);
	                  }
	                });

	              importAliases.push({ path, imports });

	              atRule.remove();

	              return;
	            }

	            if (atRule.params.indexOf("@value") !== -1) {
	              result.warn("Invalid value definition: " + atRule.params);
	            }

	            let [, key, value] = `${atRule.params}${atRule.raws.between}`.match(
	              matchValueDefinition
	            );

	            const normalizedValue = value.replace(/\/\*((?!\*\/).*?)\*\//g, "");

	            if (normalizedValue.length === 0) {
	              result.warn("Invalid value definition: " + atRule.params);
	              atRule.remove();

	              return;
	            }

	            let isOnlySpace = /^\s+$/.test(normalizedValue);

	            if (!isOnlySpace) {
	              value = value.trim();
	            }

	            // Add to the definitions, knowing that values can refer to each other
	            definitions[key] = ICSSUtils.replaceValueSymbols(
	              value,
	              definitions
	            );

	            atRule.remove();
	          });

	          /* If we have no definitions, don't continue */
	          if (!Object.keys(definitions).length) {
	            return;
	          }

	          /* Perform replacements */
	          ICSSUtils.replaceSymbols(root, definitions);

	          /* We want to export anything defined by now, but don't add it to the CSS yet or it well get picked up by the replacement stuff */
	          const exportDeclarations = Object.keys(definitions).map((key) =>
	            postcss.decl({
	              value: definitions[key],
	              prop: key,
	              raws: { before: "\n  " },
	            })
	          );

	          /* Add export rules if any */
	          if (exportDeclarations.length > 0) {
	            const exportRule = postcss.rule({
	              selector: ":export",
	              raws: { after: "\n" },
	            });

	            exportRule.append(exportDeclarations);

	            root.prepend(exportRule);
	          }

	          /* Add import rules */
	          importAliases.reverse().forEach(({ path, imports }) => {
	            const importRule = postcss.rule({
	              selector: `:import(${path})`,
	              raws: { after: "\n" },
	            });

	            imports.forEach(({ theirName, importedName }) => {
	              importRule.append({
	                value: theirName,
	                prop: importedName,
	                raws: { before: "\n  " },
	              });
	            });

	            root.prepend(importRule);
	          });
	        },
	      };
	    },
	  };
	};

	src.exports.postcss = true;
	return src.exports;
}

var hasRequiredScoping;

function requireScoping () {
	if (hasRequiredScoping) return scoping;
	hasRequiredScoping = 1;

	Object.defineProperty(scoping, "__esModule", {
	  value: true
	});
	scoping.behaviours = void 0;
	scoping.getDefaultPlugins = getDefaultPlugins;
	scoping.getDefaultScopeBehaviour = getDefaultScopeBehaviour;
	scoping.getScopedNameGenerator = getScopedNameGenerator;

	var _postcssModulesExtractImports = _interopRequireDefault(/*@__PURE__*/ requireSrc$3());

	var _genericNames = _interopRequireDefault(/*@__PURE__*/ requireGenericNames());

	var _postcssModulesLocalByDefault = _interopRequireDefault(/*@__PURE__*/ requireSrc$2());

	var _postcssModulesScope = _interopRequireDefault(/*@__PURE__*/ requireSrc$1());

	var _stringHash = _interopRequireDefault(/*@__PURE__*/ requireStringHash());

	var _postcssModulesValues = _interopRequireDefault(/*@__PURE__*/ requireSrc());

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	const behaviours = {
	  LOCAL: "local",
	  GLOBAL: "global"
	};
	scoping.behaviours = behaviours;

	function getDefaultPlugins({
	  behaviour,
	  generateScopedName,
	  exportGlobals
	}) {
	  const scope = (0, _postcssModulesScope.default)({
	    generateScopedName,
	    exportGlobals
	  });
	  const plugins = {
	    [behaviours.LOCAL]: [_postcssModulesValues.default, (0, _postcssModulesLocalByDefault.default)({
	      mode: "local"
	    }), _postcssModulesExtractImports.default, scope],
	    [behaviours.GLOBAL]: [_postcssModulesValues.default, (0, _postcssModulesLocalByDefault.default)({
	      mode: "global"
	    }), _postcssModulesExtractImports.default, scope]
	  };
	  return plugins[behaviour];
	}

	function isValidBehaviour(behaviour) {
	  return Object.keys(behaviours).map(key => behaviours[key]).indexOf(behaviour) > -1;
	}

	function getDefaultScopeBehaviour(scopeBehaviour) {
	  return scopeBehaviour && isValidBehaviour(scopeBehaviour) ? scopeBehaviour : behaviours.LOCAL;
	}

	function generateScopedNameDefault(name, filename, css) {
	  const i = css.indexOf(`.${name}`);
	  const lineNumber = css.substr(0, i).split(/[\r\n]/).length;
	  const hash = (0, _stringHash.default)(css).toString(36).substr(0, 5);
	  return `_${name}_${hash}_${lineNumber}`;
	}

	function getScopedNameGenerator(generateScopedName, hashPrefix) {
	  const scopedNameGenerator = generateScopedName || generateScopedNameDefault;

	  if (typeof scopedNameGenerator === "function") {
	    return scopedNameGenerator;
	  }

	  return (0, _genericNames.default)(scopedNameGenerator, {
	    context: process.cwd(),
	    hashPrefix: hashPrefix
	  });
	}
	return scoping;
}

var hasRequiredPluginFactory;

function requirePluginFactory () {
	if (hasRequiredPluginFactory) return pluginFactory;
	hasRequiredPluginFactory = 1;

	Object.defineProperty(pluginFactory, "__esModule", {
	  value: true
	});
	pluginFactory.makePlugin = makePlugin;

	var _postcss = _interopRequireDefault(require$$0$1);

	var _unquote = _interopRequireDefault(/*@__PURE__*/ requireUnquote());

	var _Parser = _interopRequireDefault(/*@__PURE__*/ requireParser$1());

	var _saveJSON = _interopRequireDefault(/*@__PURE__*/ requireSaveJSON());

	var _localsConvention = /*@__PURE__*/ requireLocalsConvention();

	var _FileSystemLoader = _interopRequireDefault(/*@__PURE__*/ requireFileSystemLoader());

	var _scoping = /*@__PURE__*/ requireScoping();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	const PLUGIN_NAME = "postcss-modules";

	function isGlobalModule(globalModules, inputFile) {
	  return globalModules.some(regex => inputFile.match(regex));
	}

	function getDefaultPluginsList(opts, inputFile) {
	  const globalModulesList = opts.globalModulePaths || null;
	  const exportGlobals = opts.exportGlobals || false;
	  const defaultBehaviour = (0, _scoping.getDefaultScopeBehaviour)(opts.scopeBehaviour);
	  const generateScopedName = (0, _scoping.getScopedNameGenerator)(opts.generateScopedName, opts.hashPrefix);

	  if (globalModulesList && isGlobalModule(globalModulesList, inputFile)) {
	    return (0, _scoping.getDefaultPlugins)({
	      behaviour: _scoping.behaviours.GLOBAL,
	      generateScopedName,
	      exportGlobals
	    });
	  }

	  return (0, _scoping.getDefaultPlugins)({
	    behaviour: defaultBehaviour,
	    generateScopedName,
	    exportGlobals
	  });
	}

	function getLoader(opts, plugins) {
	  const root = typeof opts.root === "undefined" ? "/" : opts.root;
	  return typeof opts.Loader === "function" ? new opts.Loader(root, plugins, opts.resolve) : new _FileSystemLoader.default(root, plugins, opts.resolve);
	}

	function isOurPlugin(plugin) {
	  return plugin.postcssPlugin === PLUGIN_NAME;
	}

	function makePlugin(opts) {
	  return {
	    postcssPlugin: PLUGIN_NAME,

	    async OnceExit(css, {
	      result
	    }) {
	      const getJSON = opts.getJSON || _saveJSON.default;
	      const inputFile = css.source.input.file;
	      const pluginList = getDefaultPluginsList(opts, inputFile);
	      const resultPluginIndex = result.processor.plugins.findIndex(plugin => isOurPlugin(plugin));

	      if (resultPluginIndex === -1) {
	        throw new Error("Plugin missing from options.");
	      }

	      const earlierPlugins = result.processor.plugins.slice(0, resultPluginIndex);
	      const loaderPlugins = [...earlierPlugins, ...pluginList];
	      const loader = getLoader(opts, loaderPlugins);

	      const fetcher = async (file, relativeTo, depTrace) => {
	        const unquoteFile = (0, _unquote.default)(file);
	        return loader.fetch.call(loader, unquoteFile, relativeTo, depTrace);
	      };

	      const parser = new _Parser.default(fetcher);
	      await (0, _postcss.default)([...pluginList, parser.plugin()]).process(css, {
	        from: inputFile
	      });
	      const out = loader.finalSource;
	      if (out) css.prepend(out);

	      if (opts.localsConvention) {
	        const reducer = (0, _localsConvention.makeLocalsConventionReducer)(opts.localsConvention, inputFile);
	        parser.exportTokens = Object.entries(parser.exportTokens).reduce(reducer, {});
	      }

	      result.messages.push({
	        type: "export",
	        plugin: "postcss-modules",
	        exportTokens: parser.exportTokens
	      }); // getJSON may return a promise

	      return getJSON(css.source.input.file, parser.exportTokens, result.opts.to);
	    }

	  };
	}
	return pluginFactory;
}

var hasRequiredBuild;

function requireBuild () {
	if (hasRequiredBuild) return build.exports;
	hasRequiredBuild = 1;

	var _fs = require$$0;

	var _fs2 = /*@__PURE__*/ requireFs();

	var _pluginFactory = /*@__PURE__*/ requirePluginFactory();

	(0, _fs2.setFileSystem)({
	  readFile: _fs.readFile,
	  writeFile: _fs.writeFile
	});

	build.exports = (opts = {}) => (0, _pluginFactory.makePlugin)(opts);

	build.exports.postcss = true;
	return build.exports;
}

var buildExports = /*@__PURE__*/ requireBuild();
var postcssModules = /*@__PURE__*/getDefaultExportFromCjs(buildExports);

function compileStyle(options) {
  return doCompileStyle({
    ...options,
    isAsync: false
  });
}
function compileStyleAsync(options) {
  return doCompileStyle({
    ...options,
    isAsync: true
  });
}
function doCompileStyle(options) {
  const {
    filename,
    id,
    scoped = false,
    trim = true,
    isProd = false,
    modules = false,
    modulesOptions = {},
    preprocessLang,
    postcssOptions,
    postcssPlugins
  } = options;
  const preprocessor = preprocessLang && processors[preprocessLang];
  const preProcessedSource = preprocessor && preprocess(options, preprocessor);
  const map = preProcessedSource ? preProcessedSource.map : options.inMap || options.map;
  const source = preProcessedSource ? preProcessedSource.code : options.source;
  const shortId = id.replace(/^data-v-/, "");
  const longId = `data-v-${shortId}`;
  const plugins = (postcssPlugins || []).slice();
  plugins.unshift(cssVarsPlugin({ id: shortId, isProd }));
  if (trim) {
    plugins.push(trimPlugin());
  }
  if (scoped) {
    plugins.push(scopedPlugin(longId));
  }
  let cssModules;
  if (modules) {
    if (!options.isAsync) {
      throw new Error(
        "[@vue/compiler-sfc] `modules` option can only be used with compileStyleAsync()."
      );
    }
    plugins.push(
      postcssModules({
        ...modulesOptions,
        getJSON: (_cssFileName, json) => {
          cssModules = json;
        }
      })
    );
  }
  const postCSSOptions = {
    ...postcssOptions,
    to: filename,
    from: filename
  };
  if (map) {
    postCSSOptions.map = {
      inline: false,
      annotation: false,
      prev: map
    };
  }
  let result;
  let code;
  let outMap;
  const dependencies = new Set(
    preProcessedSource ? preProcessedSource.dependencies : []
  );
  dependencies.delete(filename);
  const errors = [];
  if (preProcessedSource && preProcessedSource.errors.length) {
    errors.push(...preProcessedSource.errors);
  }
  const recordPlainCssDependencies = (messages) => {
    messages.forEach((msg) => {
      if (msg.type === "dependency") {
        dependencies.add(msg.file);
      }
    });
    return dependencies;
  };
  try {
    result = require$$0$1(plugins).process(source, postCSSOptions);
    if (options.isAsync) {
      return result.then((result2) => ({
        code: result2.css || "",
        map: result2.map && result2.map.toJSON(),
        errors,
        modules: cssModules,
        rawResult: result2,
        dependencies: recordPlainCssDependencies(result2.messages)
      })).catch((error) => ({
        code: "",
        map: void 0,
        errors: [...errors, error],
        rawResult: void 0,
        dependencies
      }));
    }
    recordPlainCssDependencies(result.messages);
    code = result.css;
    outMap = result.map;
  } catch (e) {
    errors.push(e);
  }
  return {
    code: code || ``,
    map: outMap && outMap.toJSON(),
    errors,
    rawResult: result,
    dependencies
  };
}
function preprocess(options, preprocessor) {
  return preprocessor(
    options.source,
    options.inMap || options.map,
    {
      filename: options.filename,
      ...options.preprocessOptions
    },
    options.preprocessCustomRequire
  );
}

const UNKNOWN_TYPE = "Unknown";
function resolveObjectKey(node, computed) {
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
      return String(node.value);
    case "Identifier":
      if (!computed) return node.name;
  }
  return void 0;
}
function concatStrings(strs) {
  return strs.filter((s) => !!s).join(", ");
}
function isLiteralNode(node) {
  return node.type.endsWith("Literal");
}
function isCallOf(node, test) {
  return !!(node && test && node.type === "CallExpression" && node.callee.type === "Identifier" && (typeof test === "string" ? node.callee.name === test : test(node.callee.name)));
}
function toRuntimeTypeString(types) {
  return types.length > 1 ? `[${types.join(", ")}]` : types[0];
}
function getImportedName(specifier) {
  if (specifier.type === "ImportSpecifier")
    return specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
  else if (specifier.type === "ImportNamespaceSpecifier") return "*";
  return "default";
}
function getId(node) {
  return node.type === "Identifier" ? node.name : node.type === "StringLiteral" ? node.value : null;
}
function getStringLiteralKey(node) {
  return node.computed ? node.key.type === "TemplateLiteral" && !node.key.expressions.length ? node.key.quasis.map((q) => q.value.cooked).join("") : null : node.key.type === "Identifier" ? node.key.name : node.key.type === "StringLiteral" ? node.key.value : node.key.type === "NumericLiteral" ? String(node.key.value) : null;
}
const identity = (str) => str;
const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g;
const toLowerCase = (str) => str.toLowerCase();
function toFileNameLowerCase(x) {
  return fileNameLowerCaseRegExp.test(x) ? x.replace(fileNameLowerCaseRegExp, toLowerCase) : x;
}
function createGetCanonicalFileName(useCaseSensitiveFileNames) {
  return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}
const normalize = (path$1.posix || path$1).normalize;
const windowsSlashRE = /\\/g;
function normalizePath(p) {
  return normalize(p.replace(windowsSlashRE, "/"));
}
const joinPaths = (path$1.posix || path$1).join;
const propNameEscapeSymbolsRE = /[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\-]/;
function getEscapedPropName(key) {
  return propNameEscapeSymbolsRE.test(key) ? JSON.stringify(key) : key;
}
const isJS = (...langs) => langs.some((lang) => lang === "js" || lang === "jsx");
const isTS = (...langs) => langs.some((lang) => lang === "ts" || lang === "tsx");

function analyzeScriptBindings(ast) {
  for (const node of ast) {
    if (node.type === "ExportDefaultDeclaration" && node.declaration.type === "ObjectExpression") {
      return analyzeBindingsFromOptions(node.declaration);
    }
  }
  return {};
}
function analyzeBindingsFromOptions(node) {
  const bindings = {};
  Object.defineProperty(bindings, "__isScriptSetup", {
    enumerable: false,
    value: false
  });
  for (const property of node.properties) {
    if (property.type === "ObjectProperty" && !property.computed && property.key.type === "Identifier") {
      if (property.key.name === "props") {
        for (const key of getObjectOrArrayExpressionKeys(property.value)) {
          bindings[key] = "props";
        }
      } else if (property.key.name === "inject") {
        for (const key of getObjectOrArrayExpressionKeys(property.value)) {
          bindings[key] = "options";
        }
      } else if (property.value.type === "ObjectExpression" && (property.key.name === "computed" || property.key.name === "methods")) {
        for (const key of getObjectExpressionKeys(property.value)) {
          bindings[key] = "options";
        }
      }
    } else if (property.type === "ObjectMethod" && property.key.type === "Identifier" && (property.key.name === "setup" || property.key.name === "data")) {
      for (const bodyItem of property.body.body) {
        if (bodyItem.type === "ReturnStatement" && bodyItem.argument && bodyItem.argument.type === "ObjectExpression") {
          for (const key of getObjectExpressionKeys(bodyItem.argument)) {
            bindings[key] = property.key.name === "setup" ? "setup-maybe-ref" : "data";
          }
        }
      }
    }
  }
  return bindings;
}
function getObjectExpressionKeys(node) {
  const keys = [];
  for (const prop of node.properties) {
    if (prop.type === "SpreadElement") continue;
    const key = resolveObjectKey(prop.key, prop.computed);
    if (key) keys.push(String(key));
  }
  return keys;
}
function getArrayExpressionKeys(node) {
  const keys = [];
  for (const element of node.elements) {
    if (element && element.type === "StringLiteral") {
      keys.push(element.value);
    }
  }
  return keys;
}
function getObjectOrArrayExpressionKeys(value) {
  if (value.type === "ArrayExpression") {
    return getArrayExpressionKeys(value);
  }
  if (value.type === "ObjectExpression") {
    return getObjectExpressionKeys(value);
  }
  return [];
}

var _a, _b;
class ScriptCompileContext {
  constructor(descriptor, options) {
    this.descriptor = descriptor;
    this.options = options;
    this.isCE = false;
    this.source = this.descriptor.source;
    this.filename = this.descriptor.filename;
    this.s = new MagicString(this.source);
    this.startOffset = (_a = this.descriptor.scriptSetup) == null ? void 0 : _a.loc.start.offset;
    this.endOffset = (_b = this.descriptor.scriptSetup) == null ? void 0 : _b.loc.end.offset;
    this.userImports = /* @__PURE__ */ Object.create(null);
    // macros presence check
    this.hasDefinePropsCall = false;
    this.hasDefineEmitCall = false;
    this.hasDefineExposeCall = false;
    this.hasDefaultExportName = false;
    this.hasDefaultExportRender = false;
    this.hasDefineOptionsCall = false;
    this.hasDefineSlotsCall = false;
    this.hasDefineModelCall = false;
    this.propsDestructuredBindings = /* @__PURE__ */ Object.create(null);
    // defineModel
    this.modelDecls = /* @__PURE__ */ Object.create(null);
    // codegen
    this.bindingMetadata = {};
    this.helperImports = /* @__PURE__ */ new Set();
    const { script, scriptSetup } = descriptor;
    const scriptLang = script && script.lang;
    const scriptSetupLang = scriptSetup && scriptSetup.lang;
    this.isJS = isJS(scriptLang, scriptSetupLang);
    this.isTS = isTS(scriptLang, scriptSetupLang);
    const customElement = options.customElement;
    const filename = this.descriptor.filename;
    if (customElement) {
      this.isCE = typeof customElement === "boolean" ? customElement : customElement(filename);
    }
    const plugins = resolveParserPlugins(
      scriptLang || scriptSetupLang,
      options.babelParserPlugins
    );
    function parse(input, offset) {
      try {
        return parser$2.parse(input, {
          plugins,
          sourceType: "module"
        }).program;
      } catch (e) {
        e.message = `[vue/compiler-sfc] ${e.message}

${descriptor.filename}
${shared.generateCodeFrame(
          descriptor.source,
          e.pos + offset,
          e.pos + offset + 1
        )}`;
        throw e;
      }
    }
    this.scriptAst = descriptor.script && parse(descriptor.script.content, descriptor.script.loc.start.offset);
    this.scriptSetupAst = descriptor.scriptSetup && parse(descriptor.scriptSetup.content, this.startOffset);
  }
  helper(key) {
    this.helperImports.add(key);
    return `_${key}`;
  }
  getString(node, scriptSetup = true) {
    const block = scriptSetup ? this.descriptor.scriptSetup : this.descriptor.script;
    return block.content.slice(node.start, node.end);
  }
  warn(msg, node, scope) {
    warn(generateError(msg, node, this, scope));
  }
  error(msg, node, scope) {
    throw new Error(
      `[@vue/compiler-sfc] ${generateError(msg, node, this, scope)}`
    );
  }
}
function generateError(msg, node, ctx, scope) {
  const offset = scope ? scope.offset : ctx.startOffset;
  return `${msg}

${(scope || ctx.descriptor).filename}
${shared.generateCodeFrame(
    (scope || ctx.descriptor).source,
    node.start + offset,
    node.end + offset
  )}`;
}
function resolveParserPlugins(lang, userPlugins, dts = false) {
  const plugins = [];
  if (!userPlugins || !userPlugins.some(
    (p) => p === "importAssertions" || p === "importAttributes" || shared.isArray(p) && p[0] === "importAttributes"
  )) {
    plugins.push("importAttributes");
  }
  if (lang === "jsx" || lang === "tsx" || lang === "mtsx") {
    plugins.push("jsx");
  } else if (userPlugins) {
    userPlugins = userPlugins.filter((p) => p !== "jsx");
  }
  if (lang === "ts" || lang === "mts" || lang === "tsx" || lang === "mtsx") {
    plugins.push(["typescript", { dts }], "explicitResourceManagement");
    if (!userPlugins || !userPlugins.includes("decorators")) {
      plugins.push("decorators-legacy");
    }
  }
  if (userPlugins) {
    plugins.push(...userPlugins);
  }
  return plugins;
}

function rewriteDefault(input, as, parserPlugins) {
  const ast = parser$2.parse(input, {
    sourceType: "module",
    plugins: resolveParserPlugins("js", parserPlugins)
  }).program.body;
  const s = new MagicString(input);
  rewriteDefaultAST(ast, s, as);
  return s.toString();
}
function rewriteDefaultAST(ast, s, as) {
  if (!hasDefaultExport(ast)) {
    s.append(`
const ${as} = {}`);
    return;
  }
  ast.forEach((node) => {
    if (node.type === "ExportDefaultDeclaration") {
      if (node.declaration.type === "ClassDeclaration" && node.declaration.id) {
        const start = node.declaration.decorators && node.declaration.decorators.length > 0 ? node.declaration.decorators[node.declaration.decorators.length - 1].end : node.start;
        s.overwrite(start, node.declaration.id.start, ` class `);
        s.append(`
const ${as} = ${node.declaration.id.name}`);
      } else {
        s.overwrite(node.start, node.declaration.start, `const ${as} = `);
      }
    } else if (node.type === "ExportNamedDeclaration") {
      for (const specifier of node.specifiers) {
        if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier" && specifier.exported.name === "default") {
          if (node.source) {
            if (specifier.local.name === "default") {
              s.prepend(
                `import { default as __VUE_DEFAULT__ } from '${node.source.value}'
`
              );
              const end2 = specifierEnd(s, specifier.local.end, node.end);
              s.remove(specifier.start, end2);
              s.append(`
const ${as} = __VUE_DEFAULT__`);
              continue;
            } else {
              s.prepend(
                `import { ${s.slice(
                  specifier.local.start,
                  specifier.local.end
                )} as __VUE_DEFAULT__ } from '${node.source.value}'
`
              );
              const end2 = specifierEnd(s, specifier.exported.end, node.end);
              s.remove(specifier.start, end2);
              s.append(`
const ${as} = __VUE_DEFAULT__`);
              continue;
            }
          }
          const end = specifierEnd(s, specifier.end, node.end);
          s.remove(specifier.start, end);
          s.append(`
const ${as} = ${specifier.local.name}`);
        }
      }
    }
  });
}
function hasDefaultExport(ast) {
  for (const stmt of ast) {
    if (stmt.type === "ExportDefaultDeclaration") {
      return true;
    } else if (stmt.type === "ExportNamedDeclaration" && stmt.specifiers.some(
      (spec) => spec.exported.name === "default"
    )) {
      return true;
    }
  }
  return false;
}
function specifierEnd(s, end, nodeEnd) {
  let hasCommas = false;
  let oldEnd = end;
  while (end < nodeEnd) {
    if (/\s/.test(s.slice(end, end + 1))) {
      end++;
    } else if (s.slice(end, end + 1) === ",") {
      end++;
      hasCommas = true;
      break;
    } else if (s.slice(end, end + 1) === "}") {
      break;
    }
  }
  return hasCommas ? end : oldEnd;
}

const normalScriptDefaultVar = `__default__`;
function processNormalScript(ctx, scopeId) {
  var _a;
  const script = ctx.descriptor.script;
  try {
    let content = script.content;
    let map = script.map;
    const scriptAst = ctx.scriptAst;
    const bindings = analyzeScriptBindings(scriptAst.body);
    const { cssVars } = ctx.descriptor;
    const { genDefaultAs, isProd } = ctx.options;
    if (cssVars.length || genDefaultAs) {
      const defaultVar = genDefaultAs || normalScriptDefaultVar;
      const s = new MagicString(content);
      rewriteDefaultAST(scriptAst.body, s, defaultVar);
      content = s.toString();
      if (cssVars.length && !((_a = ctx.options.templateOptions) == null ? void 0 : _a.ssr)) {
        content += genNormalScriptCssVarsCode(
          cssVars,
          bindings,
          scopeId,
          !!isProd,
          defaultVar
        );
      }
      if (!genDefaultAs) {
        content += `
export default ${defaultVar}`;
      }
    }
    return {
      ...script,
      content,
      map,
      bindings,
      scriptAst: scriptAst.body
    };
  } catch (e) {
    return script;
  }
}

const balanced = (a, b, str) => {
    const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
    const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
    const r = ma !== null && mb != null && range(ma, mb, str);
    return (r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + ma.length, r[1]),
        post: str.slice(r[1] + mb.length),
    });
};
const maybeMatch = (reg, str) => {
    const m = str.match(reg);
    return m ? m[0] : null;
};
const range = (a, b, str) => {
    let begs, beg, left, right = undefined, result;
    let ai = str.indexOf(a);
    let bi = str.indexOf(b, ai + 1);
    let i = ai;
    if (ai >= 0 && bi > 0) {
        if (a === b) {
            return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
            if (i === ai) {
                begs.push(i);
                ai = str.indexOf(a, i + 1);
            }
            else if (begs.length === 1) {
                const r = begs.pop();
                if (r !== undefined)
                    result = [r, bi];
            }
            else {
                beg = begs.pop();
                if (beg !== undefined && beg < left) {
                    left = beg;
                    right = bi;
                }
                bi = str.indexOf(b, i + 1);
            }
            i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length && right !== undefined) {
            result = [left, right];
        }
    }
    return result;
};

const escSlash = '\0SLASH' + Math.random() + '\0';
const escOpen = '\0OPEN' + Math.random() + '\0';
const escClose = '\0CLOSE' + Math.random() + '\0';
const escComma = '\0COMMA' + Math.random() + '\0';
const escPeriod = '\0PERIOD' + Math.random() + '\0';
const escSlashPattern = new RegExp(escSlash, 'g');
const escOpenPattern = new RegExp(escOpen, 'g');
const escClosePattern = new RegExp(escClose, 'g');
const escCommaPattern = new RegExp(escComma, 'g');
const escPeriodPattern = new RegExp(escPeriod, 'g');
const slashPattern = /\\\\/g;
const openPattern = /\\{/g;
const closePattern = /\\}/g;
const commaPattern = /\\,/g;
const periodPattern = /\\./g;
function numeric(str) {
    return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
    return str
        .replace(slashPattern, escSlash)
        .replace(openPattern, escOpen)
        .replace(closePattern, escClose)
        .replace(commaPattern, escComma)
        .replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
    return str
        .replace(escSlashPattern, '\\')
        .replace(escOpenPattern, '{')
        .replace(escClosePattern, '}')
        .replace(escCommaPattern, ',')
        .replace(escPeriodPattern, '.');
}
/**
 * Basically just str.split(","), but handling cases
 * where we have nested braced sections, which should be
 * treated as individual members, like {a,{b,c},d}
 */
function parseCommaParts(str) {
    if (!str) {
        return [''];
    }
    const parts = [];
    const m = balanced('{', '}', str);
    if (!m) {
        return str.split(',');
    }
    const { pre, body, post } = m;
    const p = pre.split(',');
    p[p.length - 1] += '{' + body + '}';
    const postParts = parseCommaParts(post);
    if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
    }
    parts.push.apply(parts, p);
    return parts;
}
function expand(str) {
    if (!str) {
        return [];
    }
    // I don't know why Bash 4.3 does this, but it does.
    // Anything starting with {} will have the first two bytes preserved
    // but *only* at the top level, so {},a}b will not expand to anything,
    // but a{},b}c will be expanded to [a}c,abc].
    // One could argue that this is a bug in Bash, but since the goal of
    // this module is to match Bash's rules, we escape a leading {}
    if (str.slice(0, 2) === '{}') {
        str = '\\{\\}' + str.slice(2);
    }
    return expand_(escapeBraces(str), true).map(unescapeBraces);
}
function embrace(str) {
    return '{' + str + '}';
}
function isPadded(el) {
    return /^-?0\d/.test(el);
}
function lte(i, y) {
    return i <= y;
}
function gte(i, y) {
    return i >= y;
}
function expand_(str, isTop) {
    /** @type {string[]} */
    const expansions = [];
    const m = balanced('{', '}', str);
    if (!m)
        return [str];
    // no need to expand pre, since it is guaranteed to be free of brace-sets
    const pre = m.pre;
    const post = m.post.length ? expand_(m.post, false) : [''];
    if (/\$$/.test(m.pre)) {
        for (let k = 0; k < post.length; k++) {
            const expansion = pre + '{' + m.body + '}' + post[k];
            expansions.push(expansion);
        }
    }
    else {
        const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
        const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
        const isSequence = isNumericSequence || isAlphaSequence;
        const isOptions = m.body.indexOf(',') >= 0;
        if (!isSequence && !isOptions) {
            // {a},b}
            if (m.post.match(/,(?!,).*\}/)) {
                str = m.pre + '{' + m.body + escClose + m.post;
                return expand_(str);
            }
            return [str];
        }
        let n;
        if (isSequence) {
            n = m.body.split(/\.\./);
        }
        else {
            n = parseCommaParts(m.body);
            if (n.length === 1 && n[0] !== undefined) {
                // x{{a,b}}y ==> x{a}y x{b}y
                n = expand_(n[0], false).map(embrace);
                //XXX is this necessary? Can't seem to hit it in tests.
                /* c8 ignore start */
                if (n.length === 1) {
                    return post.map(p => m.pre + n[0] + p);
                }
                /* c8 ignore stop */
            }
        }
        // at this point, n is the parts, and we know it's not a comma set
        // with a single entry.
        let N;
        if (isSequence && n[0] !== undefined && n[1] !== undefined) {
            const x = numeric(n[0]);
            const y = numeric(n[1]);
            const width = Math.max(n[0].length, n[1].length);
            let incr = n.length === 3 && n[2] !== undefined ? Math.abs(numeric(n[2])) : 1;
            let test = lte;
            const reverse = y < x;
            if (reverse) {
                incr *= -1;
                test = gte;
            }
            const pad = n.some(isPadded);
            N = [];
            for (let i = x; test(i, y); i += incr) {
                let c;
                if (isAlphaSequence) {
                    c = String.fromCharCode(i);
                    if (c === '\\') {
                        c = '';
                    }
                }
                else {
                    c = String(i);
                    if (pad) {
                        const need = width - c.length;
                        if (need > 0) {
                            const z = new Array(need + 1).join('0');
                            if (i < 0) {
                                c = '-' + z + c.slice(1);
                            }
                            else {
                                c = z + c;
                            }
                        }
                    }
                }
                N.push(c);
            }
        }
        else {
            N = [];
            for (let j = 0; j < n.length; j++) {
                N.push.apply(N, expand_(n[j], false));
            }
        }
        for (let j = 0; j < N.length; j++) {
            for (let k = 0; k < post.length; k++) {
                const expansion = pre + N[j] + post[k];
                if (!isTop || isSequence || expansion) {
                    expansions.push(expansion);
                }
            }
        }
    }
    return expansions;
}

const MAX_PATTERN_LENGTH = 1024 * 64;
const assertValidPattern = (pattern) => {
    if (typeof pattern !== 'string') {
        throw new TypeError('invalid pattern');
    }
    if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new TypeError('pattern is too long');
    }
};

// translate the various posix character classes into unicode properties
// this works across all unicode locales
// { <posix class>: [<translation>, /u flag required, negated]
const posixClasses = {
    '[:alnum:]': ['\\p{L}\\p{Nl}\\p{Nd}', true],
    '[:alpha:]': ['\\p{L}\\p{Nl}', true],
    '[:ascii:]': ['\\x' + '00-\\x' + '7f', false],
    '[:blank:]': ['\\p{Zs}\\t', true],
    '[:cntrl:]': ['\\p{Cc}', true],
    '[:digit:]': ['\\p{Nd}', true],
    '[:graph:]': ['\\p{Z}\\p{C}', true, true],
    '[:lower:]': ['\\p{Ll}', true],
    '[:print:]': ['\\p{C}', true],
    '[:punct:]': ['\\p{P}', true],
    '[:space:]': ['\\p{Z}\\t\\r\\n\\v\\f', true],
    '[:upper:]': ['\\p{Lu}', true],
    '[:word:]': ['\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}', true],
    '[:xdigit:]': ['A-Fa-f0-9', false],
};
// only need to escape a few things inside of brace expressions
// escapes: [ \ ] -
const braceEscape = (s) => s.replace(/[[\]\\-]/g, '\\$&');
// escape all regexp magic characters
const regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
// everything has already been escaped, we just have to join
const rangesToString = (ranges) => ranges.join('');
// takes a glob string at a posix brace expression, and returns
// an equivalent regular expression source, and boolean indicating
// whether the /u flag needs to be applied, and the number of chars
// consumed to parse the character class.
// This also removes out of order ranges, and returns ($.) if the
// entire class just no good.
const parseClass = (glob, position) => {
    const pos = position;
    /* c8 ignore start */
    if (glob.charAt(pos) !== '[') {
        throw new Error('not in a brace expression');
    }
    /* c8 ignore stop */
    const ranges = [];
    const negs = [];
    let i = pos + 1;
    let sawStart = false;
    let uflag = false;
    let escaping = false;
    let negate = false;
    let endPos = pos;
    let rangeStart = '';
    WHILE: while (i < glob.length) {
        const c = glob.charAt(i);
        if ((c === '!' || c === '^') && i === pos + 1) {
            negate = true;
            i++;
            continue;
        }
        if (c === ']' && sawStart && !escaping) {
            endPos = i + 1;
            break;
        }
        sawStart = true;
        if (c === '\\') {
            if (!escaping) {
                escaping = true;
                i++;
                continue;
            }
            // escaped \ char, fall through and treat like normal char
        }
        if (c === '[' && !escaping) {
            // either a posix class, a collation equivalent, or just a [
            for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
                if (glob.startsWith(cls, i)) {
                    // invalid, [a-[] is fine, but not [a-[:alpha]]
                    if (rangeStart) {
                        return ['$.', false, glob.length - pos, true];
                    }
                    i += cls.length;
                    if (neg)
                        negs.push(unip);
                    else
                        ranges.push(unip);
                    uflag = uflag || u;
                    continue WHILE;
                }
            }
        }
        // now it's just a normal character, effectively
        escaping = false;
        if (rangeStart) {
            // throw this range away if it's not valid, but others
            // can still match.
            if (c > rangeStart) {
                ranges.push(braceEscape(rangeStart) + '-' + braceEscape(c));
            }
            else if (c === rangeStart) {
                ranges.push(braceEscape(c));
            }
            rangeStart = '';
            i++;
            continue;
        }
        // now might be the start of a range.
        // can be either c-d or c-] or c<more...>] or c] at this point
        if (glob.startsWith('-]', i + 1)) {
            ranges.push(braceEscape(c + '-'));
            i += 2;
            continue;
        }
        if (glob.startsWith('-', i + 1)) {
            rangeStart = c;
            i += 2;
            continue;
        }
        // not the start of a range, just a single character
        ranges.push(braceEscape(c));
        i++;
    }
    if (endPos < i) {
        // didn't see the end of the class, not a valid class,
        // but might still be valid as a literal match.
        return ['', false, 0, false];
    }
    // if we got no ranges and no negates, then we have a range that
    // cannot possibly match anything, and that poisons the whole glob
    if (!ranges.length && !negs.length) {
        return ['$.', false, glob.length - pos, true];
    }
    // if we got one positive range, and it's a single character, then that's
    // not actually a magic pattern, it's just that one literal character.
    // we should not treat that as "magic", we should just return the literal
    // character. [_] is a perfectly valid way to escape glob magic chars.
    if (negs.length === 0 &&
        ranges.length === 1 &&
        /^\\?.$/.test(ranges[0]) &&
        !negate) {
        const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
        return [regexpEscape(r), false, endPos - pos, false];
    }
    const sranges = '[' + (negate ? '^' : '') + rangesToString(ranges) + ']';
    const snegs = '[' + (negate ? '' : '^') + rangesToString(negs) + ']';
    const comb = ranges.length && negs.length
        ? '(' + sranges + '|' + snegs + ')'
        : ranges.length
            ? sranges
            : snegs;
    return [comb, uflag, endPos - pos, true];
};

/**
 * Un-escape a string that has been escaped with {@link escape}.
 *
 * If the {@link MinimatchOptions.windowsPathsNoEscape} option is used, then
 * square-bracket escapes are removed, but not backslash escapes.
 *
 * For example, it will turn the string `'[*]'` into `*`, but it will not
 * turn `'\\*'` into `'*'`, because `\` is a path separator in
 * `windowsPathsNoEscape` mode.
 *
 * When `windowsPathsNoEscape` is not set, then both square-bracket escapes and
 * backslash escapes are removed.
 *
 * Slashes (and backslashes in `windowsPathsNoEscape` mode) cannot be escaped
 * or unescaped.
 *
 * When `magicalBraces` is not set, escapes of braces (`{` and `}`) will not be
 * unescaped.
 */
const unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true, } = {}) => {
    if (magicalBraces) {
        return windowsPathsNoEscape
            ? s.replace(/\[([^\/\\])\]/g, '$1')
            : s
                .replace(/((?!\\).|^)\[([^\/\\])\]/g, '$1$2')
                .replace(/\\([^\/])/g, '$1');
    }
    return windowsPathsNoEscape
        ? s.replace(/\[([^\/\\{}])\]/g, '$1')
        : s
            .replace(/((?!\\).|^)\[([^\/\\{}])\]/g, '$1$2')
            .replace(/\\([^\/{}])/g, '$1');
};

// parse a single path portion
const types = new Set(['!', '?', '+', '*', '@']);
const isExtglobType = (c) => types.has(c);
// Patterns that get prepended to bind to the start of either the
// entire string, or just a single path portion, to prevent dots
// and/or traversal patterns, when needed.
// Exts don't need the ^ or / bit, because the root binds that already.
const startNoTraversal = '(?!(?:^|/)\\.\\.?(?:$|/))';
const startNoDot = '(?!\\.)';
// characters that indicate a start of pattern needs the "no dots" bit,
// because a dot *might* be matched. ( is not in the list, because in
// the case of a child extglob, it will handle the prevention itself.
const addPatternStart = new Set(['[', '.']);
// cases where traversal is A-OK, no dot prevention needed
const justDots = new Set(['..', '.']);
const reSpecials = new Set('().*{}+?[]^$\\!');
const regExpEscape$1 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
// any single thing other than /
const qmark$1 = '[^/]';
// * => any number of characters
const star$1 = qmark$1 + '*?';
// use + when we need to ensure that *something* matches, because the * is
// the only thing in the path portion.
const starNoEmpty = qmark$1 + '+?';
// remove the \ chars that we added if we end up doing a nonmagic compare
// const deslash = (s: string) => s.replace(/\\(.)/g, '$1')
class AST {
    type;
    #root;
    #hasMagic;
    #uflag = false;
    #parts = [];
    #parent;
    #parentIndex;
    #negs;
    #filledNegs = false;
    #options;
    #toString;
    // set to true if it's an extglob with no children
    // (which really means one child of '')
    #emptyExt = false;
    constructor(type, parent, options = {}) {
        this.type = type;
        // extglobs are inherently magical
        if (type)
            this.#hasMagic = true;
        this.#parent = parent;
        this.#root = this.#parent ? this.#parent.#root : this;
        this.#options = this.#root === this ? options : this.#root.#options;
        this.#negs = this.#root === this ? [] : this.#root.#negs;
        if (type === '!' && !this.#root.#filledNegs)
            this.#negs.push(this);
        this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
    }
    get hasMagic() {
        /* c8 ignore start */
        if (this.#hasMagic !== undefined)
            return this.#hasMagic;
        /* c8 ignore stop */
        for (const p of this.#parts) {
            if (typeof p === 'string')
                continue;
            if (p.type || p.hasMagic)
                return (this.#hasMagic = true);
        }
        // note: will be undefined until we generate the regexp src and find out
        return this.#hasMagic;
    }
    // reconstructs the pattern
    toString() {
        if (this.#toString !== undefined)
            return this.#toString;
        if (!this.type) {
            return (this.#toString = this.#parts.map(p => String(p)).join(''));
        }
        else {
            return (this.#toString =
                this.type + '(' + this.#parts.map(p => String(p)).join('|') + ')');
        }
    }
    #fillNegs() {
        /* c8 ignore start */
        if (this !== this.#root)
            throw new Error('should only call on root');
        if (this.#filledNegs)
            return this;
        /* c8 ignore stop */
        // call toString() once to fill this out
        this.toString();
        this.#filledNegs = true;
        let n;
        while ((n = this.#negs.pop())) {
            if (n.type !== '!')
                continue;
            // walk up the tree, appending everthing that comes AFTER parentIndex
            let p = n;
            let pp = p.#parent;
            while (pp) {
                for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
                    for (const part of n.#parts) {
                        /* c8 ignore start */
                        if (typeof part === 'string') {
                            throw new Error('string part in extglob AST??');
                        }
                        /* c8 ignore stop */
                        part.copyIn(pp.#parts[i]);
                    }
                }
                p = pp;
                pp = p.#parent;
            }
        }
        return this;
    }
    push(...parts) {
        for (const p of parts) {
            if (p === '')
                continue;
            /* c8 ignore start */
            if (typeof p !== 'string' && !(p instanceof AST && p.#parent === this)) {
                throw new Error('invalid part: ' + p);
            }
            /* c8 ignore stop */
            this.#parts.push(p);
        }
    }
    toJSON() {
        const ret = this.type === null
            ? this.#parts.slice().map(p => (typeof p === 'string' ? p : p.toJSON()))
            : [this.type, ...this.#parts.map(p => p.toJSON())];
        if (this.isStart() && !this.type)
            ret.unshift([]);
        if (this.isEnd() &&
            (this === this.#root ||
                (this.#root.#filledNegs && this.#parent?.type === '!'))) {
            ret.push({});
        }
        return ret;
    }
    isStart() {
        if (this.#root === this)
            return true;
        // if (this.type) return !!this.#parent?.isStart()
        if (!this.#parent?.isStart())
            return false;
        if (this.#parentIndex === 0)
            return true;
        // if everything AHEAD of this is a negation, then it's still the "start"
        const p = this.#parent;
        for (let i = 0; i < this.#parentIndex; i++) {
            const pp = p.#parts[i];
            if (!(pp instanceof AST && pp.type === '!')) {
                return false;
            }
        }
        return true;
    }
    isEnd() {
        if (this.#root === this)
            return true;
        if (this.#parent?.type === '!')
            return true;
        if (!this.#parent?.isEnd())
            return false;
        if (!this.type)
            return this.#parent?.isEnd();
        // if not root, it'll always have a parent
        /* c8 ignore start */
        const pl = this.#parent ? this.#parent.#parts.length : 0;
        /* c8 ignore stop */
        return this.#parentIndex === pl - 1;
    }
    copyIn(part) {
        if (typeof part === 'string')
            this.push(part);
        else
            this.push(part.clone(this));
    }
    clone(parent) {
        const c = new AST(this.type, parent);
        for (const p of this.#parts) {
            c.copyIn(p);
        }
        return c;
    }
    static #parseAST(str, ast, pos, opt) {
        let escaping = false;
        let inBrace = false;
        let braceStart = -1;
        let braceNeg = false;
        if (ast.type === null) {
            // outside of a extglob, append until we find a start
            let i = pos;
            let acc = '';
            while (i < str.length) {
                const c = str.charAt(i++);
                // still accumulate escapes at this point, but we do ignore
                // starts that are escaped
                if (escaping || c === '\\') {
                    escaping = !escaping;
                    acc += c;
                    continue;
                }
                if (inBrace) {
                    if (i === braceStart + 1) {
                        if (c === '^' || c === '!') {
                            braceNeg = true;
                        }
                    }
                    else if (c === ']' && !(i === braceStart + 2 && braceNeg)) {
                        inBrace = false;
                    }
                    acc += c;
                    continue;
                }
                else if (c === '[') {
                    inBrace = true;
                    braceStart = i;
                    braceNeg = false;
                    acc += c;
                    continue;
                }
                if (!opt.noext && isExtglobType(c) && str.charAt(i) === '(') {
                    ast.push(acc);
                    acc = '';
                    const ext = new AST(c, ast);
                    i = AST.#parseAST(str, ext, i, opt);
                    ast.push(ext);
                    continue;
                }
                acc += c;
            }
            ast.push(acc);
            return i;
        }
        // some kind of extglob, pos is at the (
        // find the next | or )
        let i = pos + 1;
        let part = new AST(null, ast);
        const parts = [];
        let acc = '';
        while (i < str.length) {
            const c = str.charAt(i++);
            // still accumulate escapes at this point, but we do ignore
            // starts that are escaped
            if (escaping || c === '\\') {
                escaping = !escaping;
                acc += c;
                continue;
            }
            if (inBrace) {
                if (i === braceStart + 1) {
                    if (c === '^' || c === '!') {
                        braceNeg = true;
                    }
                }
                else if (c === ']' && !(i === braceStart + 2 && braceNeg)) {
                    inBrace = false;
                }
                acc += c;
                continue;
            }
            else if (c === '[') {
                inBrace = true;
                braceStart = i;
                braceNeg = false;
                acc += c;
                continue;
            }
            if (isExtglobType(c) && str.charAt(i) === '(') {
                part.push(acc);
                acc = '';
                const ext = new AST(c, part);
                part.push(ext);
                i = AST.#parseAST(str, ext, i, opt);
                continue;
            }
            if (c === '|') {
                part.push(acc);
                acc = '';
                parts.push(part);
                part = new AST(null, ast);
                continue;
            }
            if (c === ')') {
                if (acc === '' && ast.#parts.length === 0) {
                    ast.#emptyExt = true;
                }
                part.push(acc);
                acc = '';
                ast.push(...parts, part);
                return i;
            }
            acc += c;
        }
        // unfinished extglob
        // if we got here, it was a malformed extglob! not an extglob, but
        // maybe something else in there.
        ast.type = null;
        ast.#hasMagic = undefined;
        ast.#parts = [str.substring(pos - 1)];
        return i;
    }
    static fromGlob(pattern, options = {}) {
        const ast = new AST(null, undefined, options);
        AST.#parseAST(pattern, ast, 0, options);
        return ast;
    }
    // returns the regular expression if there's magic, or the unescaped
    // string if not.
    toMMPattern() {
        // should only be called on root
        /* c8 ignore start */
        if (this !== this.#root)
            return this.#root.toMMPattern();
        /* c8 ignore stop */
        const glob = this.toString();
        const [re, body, hasMagic, uflag] = this.toRegExpSource();
        // if we're in nocase mode, and not nocaseMagicOnly, then we do
        // still need a regular expression if we have to case-insensitively
        // match capital/lowercase characters.
        const anyMagic = hasMagic ||
            this.#hasMagic ||
            (this.#options.nocase &&
                !this.#options.nocaseMagicOnly &&
                glob.toUpperCase() !== glob.toLowerCase());
        if (!anyMagic) {
            return body;
        }
        const flags = (this.#options.nocase ? 'i' : '') + (uflag ? 'u' : '');
        return Object.assign(new RegExp(`^${re}$`, flags), {
            _src: re,
            _glob: glob,
        });
    }
    get options() {
        return this.#options;
    }
    // returns the string match, the regexp source, whether there's magic
    // in the regexp (so a regular expression is required) and whether or
    // not the uflag is needed for the regular expression (for posix classes)
    // TODO: instead of injecting the start/end at this point, just return
    // the BODY of the regexp, along with the start/end portions suitable
    // for binding the start/end in either a joined full-path makeRe context
    // (where we bind to (^|/), or a standalone matchPart context (where
    // we bind to ^, and not /).  Otherwise slashes get duped!
    //
    // In part-matching mode, the start is:
    // - if not isStart: nothing
    // - if traversal possible, but not allowed: ^(?!\.\.?$)
    // - if dots allowed or not possible: ^
    // - if dots possible and not allowed: ^(?!\.)
    // end is:
    // - if not isEnd(): nothing
    // - else: $
    //
    // In full-path matching mode, we put the slash at the START of the
    // pattern, so start is:
    // - if first pattern: same as part-matching mode
    // - if not isStart(): nothing
    // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
    // - if dots allowed or not possible: /
    // - if dots possible and not allowed: /(?!\.)
    // end is:
    // - if last pattern, same as part-matching mode
    // - else nothing
    //
    // Always put the (?:$|/) on negated tails, though, because that has to be
    // there to bind the end of the negated pattern portion, and it's easier to
    // just stick it in now rather than try to inject it later in the middle of
    // the pattern.
    //
    // We can just always return the same end, and leave it up to the caller
    // to know whether it's going to be used joined or in parts.
    // And, if the start is adjusted slightly, can do the same there:
    // - if not isStart: nothing
    // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
    // - if dots allowed or not possible: (?:/|^)
    // - if dots possible and not allowed: (?:/|^)(?!\.)
    //
    // But it's better to have a simpler binding without a conditional, for
    // performance, so probably better to return both start options.
    //
    // Then the caller just ignores the end if it's not the first pattern,
    // and the start always gets applied.
    //
    // But that's always going to be $ if it's the ending pattern, or nothing,
    // so the caller can just attach $ at the end of the pattern when building.
    //
    // So the todo is:
    // - better detect what kind of start is needed
    // - return both flavors of starting pattern
    // - attach $ at the end of the pattern when creating the actual RegExp
    //
    // Ah, but wait, no, that all only applies to the root when the first pattern
    // is not an extglob. If the first pattern IS an extglob, then we need all
    // that dot prevention biz to live in the extglob portions, because eg
    // +(*|.x*) can match .xy but not .yx.
    //
    // So, return the two flavors if it's #root and the first child is not an
    // AST, otherwise leave it to the child AST to handle it, and there,
    // use the (?:^|/) style of start binding.
    //
    // Even simplified further:
    // - Since the start for a join is eg /(?!\.) and the start for a part
    // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
    // or start or whatever) and prepend ^ or / at the Regexp construction.
    toRegExpSource(allowDot) {
        const dot = allowDot ?? !!this.#options.dot;
        if (this.#root === this)
            this.#fillNegs();
        if (!this.type) {
            const noEmpty = this.isStart() &&
                this.isEnd() &&
                !this.#parts.some(s => typeof s !== 'string');
            const src = this.#parts
                .map(p => {
                const [re, _, hasMagic, uflag] = typeof p === 'string'
                    ? AST.#parseGlob(p, this.#hasMagic, noEmpty)
                    : p.toRegExpSource(allowDot);
                this.#hasMagic = this.#hasMagic || hasMagic;
                this.#uflag = this.#uflag || uflag;
                return re;
            })
                .join('');
            let start = '';
            if (this.isStart()) {
                if (typeof this.#parts[0] === 'string') {
                    // this is the string that will match the start of the pattern,
                    // so we need to protect against dots and such.
                    // '.' and '..' cannot match unless the pattern is that exactly,
                    // even if it starts with . or dot:true is set.
                    const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
                    if (!dotTravAllowed) {
                        const aps = addPatternStart;
                        // check if we have a possibility of matching . or ..,
                        // and prevent that.
                        const needNoTrav = 
                        // dots are allowed, and the pattern starts with [ or .
                        (dot && aps.has(src.charAt(0))) ||
                            // the pattern starts with \., and then [ or .
                            (src.startsWith('\\.') && aps.has(src.charAt(2))) ||
                            // the pattern starts with \.\., and then [ or .
                            (src.startsWith('\\.\\.') && aps.has(src.charAt(4)));
                        // no need to prevent dots if it can't match a dot, or if a
                        // sub-pattern will be preventing it anyway.
                        const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
                        start = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : '';
                    }
                }
            }
            // append the "end of path portion" pattern to negation tails
            let end = '';
            if (this.isEnd() &&
                this.#root.#filledNegs &&
                this.#parent?.type === '!') {
                end = '(?:$|\\/)';
            }
            const final = start + src + end;
            return [
                final,
                unescape(src),
                (this.#hasMagic = !!this.#hasMagic),
                this.#uflag,
            ];
        }
        // We need to calculate the body *twice* if it's a repeat pattern
        // at the start, once in nodot mode, then again in dot mode, so a
        // pattern like *(?) can match 'x.y'
        const repeated = this.type === '*' || this.type === '+';
        // some kind of extglob
        const start = this.type === '!' ? '(?:(?!(?:' : '(?:';
        let body = this.#partsToRegExp(dot);
        if (this.isStart() && this.isEnd() && !body && this.type !== '!') {
            // invalid extglob, has to at least be *something* present, if it's
            // the entire path portion.
            const s = this.toString();
            this.#parts = [s];
            this.type = null;
            this.#hasMagic = undefined;
            return [s, unescape(this.toString()), false, false];
        }
        // XXX abstract out this map method
        let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot
            ? ''
            : this.#partsToRegExp(true);
        if (bodyDotAllowed === body) {
            bodyDotAllowed = '';
        }
        if (bodyDotAllowed) {
            body = `(?:${body})(?:${bodyDotAllowed})*?`;
        }
        // an empty !() is exactly equivalent to a starNoEmpty
        let final = '';
        if (this.type === '!' && this.#emptyExt) {
            final = (this.isStart() && !dot ? startNoDot : '') + starNoEmpty;
        }
        else {
            const close = this.type === '!'
                ? // !() must match something,but !(x) can match ''
                    '))' +
                        (this.isStart() && !dot && !allowDot ? startNoDot : '') +
                        star$1 +
                        ')'
                : this.type === '@'
                    ? ')'
                    : this.type === '?'
                        ? ')?'
                        : this.type === '+' && bodyDotAllowed
                            ? ')'
                            : this.type === '*' && bodyDotAllowed
                                ? `)?`
                                : `)${this.type}`;
            final = start + body + close;
        }
        return [
            final,
            unescape(body),
            (this.#hasMagic = !!this.#hasMagic),
            this.#uflag,
        ];
    }
    #partsToRegExp(dot) {
        return this.#parts
            .map(p => {
            // extglob ASTs should only contain parent ASTs
            /* c8 ignore start */
            if (typeof p === 'string') {
                throw new Error('string type in extglob ast??');
            }
            /* c8 ignore stop */
            // can ignore hasMagic, because extglobs are already always magic
            const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
            this.#uflag = this.#uflag || uflag;
            return re;
        })
            .filter(p => !(this.isStart() && this.isEnd()) || !!p)
            .join('|');
    }
    static #parseGlob(glob, hasMagic, noEmpty = false) {
        let escaping = false;
        let re = '';
        let uflag = false;
        for (let i = 0; i < glob.length; i++) {
            const c = glob.charAt(i);
            if (escaping) {
                escaping = false;
                re += (reSpecials.has(c) ? '\\' : '') + c;
                continue;
            }
            if (c === '\\') {
                if (i === glob.length - 1) {
                    re += '\\\\';
                }
                else {
                    escaping = true;
                }
                continue;
            }
            if (c === '[') {
                const [src, needUflag, consumed, magic] = parseClass(glob, i);
                if (consumed) {
                    re += src;
                    uflag = uflag || needUflag;
                    i += consumed - 1;
                    hasMagic = hasMagic || magic;
                    continue;
                }
            }
            if (c === '*') {
                re += noEmpty && glob === '*' ? starNoEmpty : star$1;
                hasMagic = true;
                continue;
            }
            if (c === '?') {
                re += qmark$1;
                hasMagic = true;
                continue;
            }
            re += regExpEscape$1(c);
        }
        return [re, unescape(glob), !!hasMagic, uflag];
    }
}

/**
 * Escape all magic characters in a glob pattern.
 *
 * If the {@link MinimatchOptions.windowsPathsNoEscape}
 * option is used, then characters are escaped by wrapping in `[]`, because
 * a magic character wrapped in a character class can only be satisfied by
 * that exact character.  In this mode, `\` is _not_ escaped, because it is
 * not interpreted as a magic character, but instead as a path separator.
 *
 * If the {@link MinimatchOptions.magicalBraces} option is used,
 * then braces (`{` and `}`) will be escaped.
 */
const escape = (s, { windowsPathsNoEscape = false, magicalBraces = false, } = {}) => {
    // don't need to escape +@! because we escape the parens
    // that make those magic, and escaping ! as [!] isn't valid,
    // because [!]] is a valid glob class meaning not ']'.
    if (magicalBraces) {
        return windowsPathsNoEscape
            ? s.replace(/[?*()[\]{}]/g, '[$&]')
            : s.replace(/[?*()[\]\\{}]/g, '\\$&');
    }
    return windowsPathsNoEscape
        ? s.replace(/[?*()[\]]/g, '[$&]')
        : s.replace(/[?*()[\]\\]/g, '\\$&');
};

const minimatch = (p, pattern, options = {}) => {
    assertValidPattern(pattern);
    // shortcut: comments match nothing.
    if (!options.nocomment && pattern.charAt(0) === '#') {
        return false;
    }
    return new Minimatch(pattern, options).match(p);
};
// Optimized checking for the most common glob patterns.
const starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
const starDotExtTest = (ext) => (f) => !f.startsWith('.') && f.endsWith(ext);
const starDotExtTestDot = (ext) => (f) => f.endsWith(ext);
const starDotExtTestNocase = (ext) => {
    ext = ext.toLowerCase();
    return (f) => !f.startsWith('.') && f.toLowerCase().endsWith(ext);
};
const starDotExtTestNocaseDot = (ext) => {
    ext = ext.toLowerCase();
    return (f) => f.toLowerCase().endsWith(ext);
};
const starDotStarRE = /^\*+\.\*+$/;
const starDotStarTest = (f) => !f.startsWith('.') && f.includes('.');
const starDotStarTestDot = (f) => f !== '.' && f !== '..' && f.includes('.');
const dotStarRE = /^\.\*+$/;
const dotStarTest = (f) => f !== '.' && f !== '..' && f.startsWith('.');
const starRE = /^\*+$/;
const starTest = (f) => f.length !== 0 && !f.startsWith('.');
const starTestDot = (f) => f.length !== 0 && f !== '.' && f !== '..';
const qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
const qmarksTestNocase = ([$0, ext = '']) => {
    const noext = qmarksTestNoExt([$0]);
    if (!ext)
        return noext;
    ext = ext.toLowerCase();
    return (f) => noext(f) && f.toLowerCase().endsWith(ext);
};
const qmarksTestNocaseDot = ([$0, ext = '']) => {
    const noext = qmarksTestNoExtDot([$0]);
    if (!ext)
        return noext;
    ext = ext.toLowerCase();
    return (f) => noext(f) && f.toLowerCase().endsWith(ext);
};
const qmarksTestDot = ([$0, ext = '']) => {
    const noext = qmarksTestNoExtDot([$0]);
    return !ext ? noext : (f) => noext(f) && f.endsWith(ext);
};
const qmarksTest = ([$0, ext = '']) => {
    const noext = qmarksTestNoExt([$0]);
    return !ext ? noext : (f) => noext(f) && f.endsWith(ext);
};
const qmarksTestNoExt = ([$0]) => {
    const len = $0.length;
    return (f) => f.length === len && !f.startsWith('.');
};
const qmarksTestNoExtDot = ([$0]) => {
    const len = $0.length;
    return (f) => f.length === len && f !== '.' && f !== '..';
};
/* c8 ignore start */
const defaultPlatform = (typeof process === 'object' && process
    ? (typeof process.env === 'object' &&
        process.env &&
        process.env.__MINIMATCH_TESTING_PLATFORM__) ||
        process.platform
    : 'posix');
const path = {
    win32: { sep: '\\' },
    posix: { sep: '/' },
};
/* c8 ignore stop */
const sep = defaultPlatform === 'win32' ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
const GLOBSTAR = Symbol('globstar **');
minimatch.GLOBSTAR = GLOBSTAR;
// any single thing other than /
// don't need to escape / when using new RegExp()
const qmark = '[^/]';
// * => any number of characters
const star = qmark + '*?';
// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
const twoStarDot = '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
// not a ^ or / followed by a dot,
// followed by anything, any number of times.
const twoStarNoDot = '(?:(?!(?:\\/|^)\\.).)*?';
const filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
const ext = (a, b = {}) => Object.assign({}, a, b);
const defaults = (def) => {
    if (!def || typeof def !== 'object' || !Object.keys(def).length) {
        return minimatch;
    }
    const orig = minimatch;
    const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
    return Object.assign(m, {
        Minimatch: class Minimatch extends orig.Minimatch {
            constructor(pattern, options = {}) {
                super(pattern, ext(def, options));
            }
            static defaults(options) {
                return orig.defaults(ext(def, options)).Minimatch;
            }
        },
        AST: class AST extends orig.AST {
            /* c8 ignore start */
            constructor(type, parent, options = {}) {
                super(type, parent, ext(def, options));
            }
            /* c8 ignore stop */
            static fromGlob(pattern, options = {}) {
                return orig.AST.fromGlob(pattern, ext(def, options));
            }
        },
        unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
        escape: (s, options = {}) => orig.escape(s, ext(def, options)),
        filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
        defaults: (options) => orig.defaults(ext(def, options)),
        makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
        braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
        match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
        sep: orig.sep,
        GLOBSTAR: GLOBSTAR,
    });
};
minimatch.defaults = defaults;
// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
const braceExpand = (pattern, options = {}) => {
    assertValidPattern(pattern);
    // Thanks to Yeting Li <https://github.com/yetingli> for
    // improving this regexp to avoid a ReDOS vulnerability.
    if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
        // shortcut. no need to expand.
        return [pattern];
    }
    return expand(pattern);
};
minimatch.braceExpand = braceExpand;
// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
const makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
const match = (list, pattern, options = {}) => {
    const mm = new Minimatch(pattern, options);
    list = list.filter(f => mm.match(f));
    if (mm.options.nonull && !list.length) {
        list.push(pattern);
    }
    return list;
};
minimatch.match = match;
// replace stuff like \* with *
const globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
const regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
class Minimatch {
    options;
    set;
    pattern;
    windowsPathsNoEscape;
    nonegate;
    negate;
    comment;
    empty;
    preserveMultipleSlashes;
    partial;
    globSet;
    globParts;
    nocase;
    isWindows;
    platform;
    windowsNoMagicRoot;
    regexp;
    constructor(pattern, options = {}) {
        assertValidPattern(pattern);
        options = options || {};
        this.options = options;
        this.pattern = pattern;
        this.platform = options.platform || defaultPlatform;
        this.isWindows = this.platform === 'win32';
        this.windowsPathsNoEscape =
            !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
        if (this.windowsPathsNoEscape) {
            this.pattern = this.pattern.replace(/\\/g, '/');
        }
        this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
        this.regexp = null;
        this.negate = false;
        this.nonegate = !!options.nonegate;
        this.comment = false;
        this.empty = false;
        this.partial = !!options.partial;
        this.nocase = !!this.options.nocase;
        this.windowsNoMagicRoot =
            options.windowsNoMagicRoot !== undefined
                ? options.windowsNoMagicRoot
                : !!(this.isWindows && this.nocase);
        this.globSet = [];
        this.globParts = [];
        this.set = [];
        // make the set of regexps etc.
        this.make();
    }
    hasMagic() {
        if (this.options.magicalBraces && this.set.length > 1) {
            return true;
        }
        for (const pattern of this.set) {
            for (const part of pattern) {
                if (typeof part !== 'string')
                    return true;
            }
        }
        return false;
    }
    debug(..._) { }
    make() {
        const pattern = this.pattern;
        const options = this.options;
        // empty patterns and comments match nothing.
        if (!options.nocomment && pattern.charAt(0) === '#') {
            this.comment = true;
            return;
        }
        if (!pattern) {
            this.empty = true;
            return;
        }
        // step 1: figure out negation, etc.
        this.parseNegate();
        // step 2: expand braces
        this.globSet = [...new Set(this.braceExpand())];
        if (options.debug) {
            this.debug = (...args) => console.error(...args);
        }
        this.debug(this.pattern, this.globSet);
        // step 3: now we have a set, so turn each one into a series of
        // path-portion matching patterns.
        // These will be regexps, except in the case of "**", which is
        // set to the GLOBSTAR object for globstar behavior,
        // and will not contain any / characters
        //
        // First, we preprocess to make the glob pattern sets a bit simpler
        // and deduped.  There are some perf-killing patterns that can cause
        // problems with a glob walk, but we can simplify them down a bit.
        const rawGlobParts = this.globSet.map(s => this.slashSplit(s));
        this.globParts = this.preprocess(rawGlobParts);
        this.debug(this.pattern, this.globParts);
        // glob --> regexps
        let set = this.globParts.map((s, _, __) => {
            if (this.isWindows && this.windowsNoMagicRoot) {
                // check if it's a drive or unc path.
                const isUNC = s[0] === '' &&
                    s[1] === '' &&
                    (s[2] === '?' || !globMagic.test(s[2])) &&
                    !globMagic.test(s[3]);
                const isDrive = /^[a-z]:/i.test(s[0]);
                if (isUNC) {
                    return [...s.slice(0, 4), ...s.slice(4).map(ss => this.parse(ss))];
                }
                else if (isDrive) {
                    return [s[0], ...s.slice(1).map(ss => this.parse(ss))];
                }
            }
            return s.map(ss => this.parse(ss));
        });
        this.debug(this.pattern, set);
        // filter out everything that didn't compile properly.
        this.set = set.filter(s => s.indexOf(false) === -1);
        // do not treat the ? in UNC paths as magic
        if (this.isWindows) {
            for (let i = 0; i < this.set.length; i++) {
                const p = this.set[i];
                if (p[0] === '' &&
                    p[1] === '' &&
                    this.globParts[i][2] === '?' &&
                    typeof p[3] === 'string' &&
                    /^[a-z]:$/i.test(p[3])) {
                    p[2] = '?';
                }
            }
        }
        this.debug(this.pattern, this.set);
    }
    // various transforms to equivalent pattern sets that are
    // faster to process in a filesystem walk.  The goal is to
    // eliminate what we can, and push all ** patterns as far
    // to the right as possible, even if it increases the number
    // of patterns that we have to process.
    preprocess(globParts) {
        // if we're not in globstar mode, then turn all ** into *
        if (this.options.noglobstar) {
            for (let i = 0; i < globParts.length; i++) {
                for (let j = 0; j < globParts[i].length; j++) {
                    if (globParts[i][j] === '**') {
                        globParts[i][j] = '*';
                    }
                }
            }
        }
        const { optimizationLevel = 1 } = this.options;
        if (optimizationLevel >= 2) {
            // aggressive optimization for the purpose of fs walking
            globParts = this.firstPhasePreProcess(globParts);
            globParts = this.secondPhasePreProcess(globParts);
        }
        else if (optimizationLevel >= 1) {
            // just basic optimizations to remove some .. parts
            globParts = this.levelOneOptimize(globParts);
        }
        else {
            // just collapse multiple ** portions into one
            globParts = this.adjascentGlobstarOptimize(globParts);
        }
        return globParts;
    }
    // just get rid of adjascent ** portions
    adjascentGlobstarOptimize(globParts) {
        return globParts.map(parts => {
            let gs = -1;
            while (-1 !== (gs = parts.indexOf('**', gs + 1))) {
                let i = gs;
                while (parts[i + 1] === '**') {
                    i++;
                }
                if (i !== gs) {
                    parts.splice(gs, i - gs);
                }
            }
            return parts;
        });
    }
    // get rid of adjascent ** and resolve .. portions
    levelOneOptimize(globParts) {
        return globParts.map(parts => {
            parts = parts.reduce((set, part) => {
                const prev = set[set.length - 1];
                if (part === '**' && prev === '**') {
                    return set;
                }
                if (part === '..') {
                    if (prev && prev !== '..' && prev !== '.' && prev !== '**') {
                        set.pop();
                        return set;
                    }
                }
                set.push(part);
                return set;
            }, []);
            return parts.length === 0 ? [''] : parts;
        });
    }
    levelTwoFileOptimize(parts) {
        if (!Array.isArray(parts)) {
            parts = this.slashSplit(parts);
        }
        let didSomething = false;
        do {
            didSomething = false;
            // <pre>/<e>/<rest> -> <pre>/<rest>
            if (!this.preserveMultipleSlashes) {
                for (let i = 1; i < parts.length - 1; i++) {
                    const p = parts[i];
                    // don't squeeze out UNC patterns
                    if (i === 1 && p === '' && parts[0] === '')
                        continue;
                    if (p === '.' || p === '') {
                        didSomething = true;
                        parts.splice(i, 1);
                        i--;
                    }
                }
                if (parts[0] === '.' &&
                    parts.length === 2 &&
                    (parts[1] === '.' || parts[1] === '')) {
                    didSomething = true;
                    parts.pop();
                }
            }
            // <pre>/<p>/../<rest> -> <pre>/<rest>
            let dd = 0;
            while (-1 !== (dd = parts.indexOf('..', dd + 1))) {
                const p = parts[dd - 1];
                if (p && p !== '.' && p !== '..' && p !== '**') {
                    didSomething = true;
                    parts.splice(dd - 1, 2);
                    dd -= 2;
                }
            }
        } while (didSomething);
        return parts.length === 0 ? [''] : parts;
    }
    // First phase: single-pattern processing
    // <pre> is 1 or more portions
    // <rest> is 1 or more portions
    // <p> is any portion other than ., .., '', or **
    // <e> is . or ''
    //
    // **/.. is *brutal* for filesystem walking performance, because
    // it effectively resets the recursive walk each time it occurs,
    // and ** cannot be reduced out by a .. pattern part like a regexp
    // or most strings (other than .., ., and '') can be.
    //
    // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
    // <pre>/<e>/<rest> -> <pre>/<rest>
    // <pre>/<p>/../<rest> -> <pre>/<rest>
    // **/**/<rest> -> **/<rest>
    //
    // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
    // this WOULD be allowed if ** did follow symlinks, or * didn't
    firstPhasePreProcess(globParts) {
        let didSomething = false;
        do {
            didSomething = false;
            // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
            for (let parts of globParts) {
                let gs = -1;
                while (-1 !== (gs = parts.indexOf('**', gs + 1))) {
                    let gss = gs;
                    while (parts[gss + 1] === '**') {
                        // <pre>/**/**/<rest> -> <pre>/**/<rest>
                        gss++;
                    }
                    // eg, if gs is 2 and gss is 4, that means we have 3 **
                    // parts, and can remove 2 of them.
                    if (gss > gs) {
                        parts.splice(gs + 1, gss - gs);
                    }
                    let next = parts[gs + 1];
                    const p = parts[gs + 2];
                    const p2 = parts[gs + 3];
                    if (next !== '..')
                        continue;
                    if (!p ||
                        p === '.' ||
                        p === '..' ||
                        !p2 ||
                        p2 === '.' ||
                        p2 === '..') {
                        continue;
                    }
                    didSomething = true;
                    // edit parts in place, and push the new one
                    parts.splice(gs, 1);
                    const other = parts.slice(0);
                    other[gs] = '**';
                    globParts.push(other);
                    gs--;
                }
                // <pre>/<e>/<rest> -> <pre>/<rest>
                if (!this.preserveMultipleSlashes) {
                    for (let i = 1; i < parts.length - 1; i++) {
                        const p = parts[i];
                        // don't squeeze out UNC patterns
                        if (i === 1 && p === '' && parts[0] === '')
                            continue;
                        if (p === '.' || p === '') {
                            didSomething = true;
                            parts.splice(i, 1);
                            i--;
                        }
                    }
                    if (parts[0] === '.' &&
                        parts.length === 2 &&
                        (parts[1] === '.' || parts[1] === '')) {
                        didSomething = true;
                        parts.pop();
                    }
                }
                // <pre>/<p>/../<rest> -> <pre>/<rest>
                let dd = 0;
                while (-1 !== (dd = parts.indexOf('..', dd + 1))) {
                    const p = parts[dd - 1];
                    if (p && p !== '.' && p !== '..' && p !== '**') {
                        didSomething = true;
                        const needDot = dd === 1 && parts[dd + 1] === '**';
                        const splin = needDot ? ['.'] : [];
                        parts.splice(dd - 1, 2, ...splin);
                        if (parts.length === 0)
                            parts.push('');
                        dd -= 2;
                    }
                }
            }
        } while (didSomething);
        return globParts;
    }
    // second phase: multi-pattern dedupes
    // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
    // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
    // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
    //
    // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
    // ^-- not valid because ** doens't follow symlinks
    secondPhasePreProcess(globParts) {
        for (let i = 0; i < globParts.length - 1; i++) {
            for (let j = i + 1; j < globParts.length; j++) {
                const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
                if (matched) {
                    globParts[i] = [];
                    globParts[j] = matched;
                    break;
                }
            }
        }
        return globParts.filter(gs => gs.length);
    }
    partsMatch(a, b, emptyGSMatch = false) {
        let ai = 0;
        let bi = 0;
        let result = [];
        let which = '';
        while (ai < a.length && bi < b.length) {
            if (a[ai] === b[bi]) {
                result.push(which === 'b' ? b[bi] : a[ai]);
                ai++;
                bi++;
            }
            else if (emptyGSMatch && a[ai] === '**' && b[bi] === a[ai + 1]) {
                result.push(a[ai]);
                ai++;
            }
            else if (emptyGSMatch && b[bi] === '**' && a[ai] === b[bi + 1]) {
                result.push(b[bi]);
                bi++;
            }
            else if (a[ai] === '*' &&
                b[bi] &&
                (this.options.dot || !b[bi].startsWith('.')) &&
                b[bi] !== '**') {
                if (which === 'b')
                    return false;
                which = 'a';
                result.push(a[ai]);
                ai++;
                bi++;
            }
            else if (b[bi] === '*' &&
                a[ai] &&
                (this.options.dot || !a[ai].startsWith('.')) &&
                a[ai] !== '**') {
                if (which === 'a')
                    return false;
                which = 'b';
                result.push(b[bi]);
                ai++;
                bi++;
            }
            else {
                return false;
            }
        }
        // if we fall out of the loop, it means they two are identical
        // as long as their lengths match
        return a.length === b.length && result;
    }
    parseNegate() {
        if (this.nonegate)
            return;
        const pattern = this.pattern;
        let negate = false;
        let negateOffset = 0;
        for (let i = 0; i < pattern.length && pattern.charAt(i) === '!'; i++) {
            negate = !negate;
            negateOffset++;
        }
        if (negateOffset)
            this.pattern = pattern.slice(negateOffset);
        this.negate = negate;
    }
    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    matchOne(file, pattern, partial = false) {
        const options = this.options;
        // UNC paths like //?/X:/... can match X:/... and vice versa
        // Drive letters in absolute drive or unc paths are always compared
        // case-insensitively.
        if (this.isWindows) {
            const fileDrive = typeof file[0] === 'string' && /^[a-z]:$/i.test(file[0]);
            const fileUNC = !fileDrive &&
                file[0] === '' &&
                file[1] === '' &&
                file[2] === '?' &&
                /^[a-z]:$/i.test(file[3]);
            const patternDrive = typeof pattern[0] === 'string' && /^[a-z]:$/i.test(pattern[0]);
            const patternUNC = !patternDrive &&
                pattern[0] === '' &&
                pattern[1] === '' &&
                pattern[2] === '?' &&
                typeof pattern[3] === 'string' &&
                /^[a-z]:$/i.test(pattern[3]);
            const fdi = fileUNC ? 3 : fileDrive ? 0 : undefined;
            const pdi = patternUNC ? 3 : patternDrive ? 0 : undefined;
            if (typeof fdi === 'number' && typeof pdi === 'number') {
                const [fd, pd] = [file[fdi], pattern[pdi]];
                if (fd.toLowerCase() === pd.toLowerCase()) {
                    pattern[pdi] = fd;
                    if (pdi > fdi) {
                        pattern = pattern.slice(pdi);
                    }
                    else if (fdi > pdi) {
                        file = file.slice(fdi);
                    }
                }
            }
        }
        // resolve and reduce . and .. portions in the file as well.
        // don't need to do the second phase, because it's only one string[]
        const { optimizationLevel = 1 } = this.options;
        if (optimizationLevel >= 2) {
            file = this.levelTwoFileOptimize(file);
        }
        this.debug('matchOne', this, { file, pattern });
        this.debug('matchOne', file.length, pattern.length);
        for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
            this.debug('matchOne loop');
            var p = pattern[pi];
            var f = file[fi];
            this.debug(pattern, p, f);
            // should be impossible.
            // some invalid regexp stuff in the set.
            /* c8 ignore start */
            if (p === false) {
                return false;
            }
            /* c8 ignore stop */
            if (p === GLOBSTAR) {
                this.debug('GLOBSTAR', [pattern, p, f]);
                // "**"
                // a/**/b/**/c would match the following:
                // a/b/x/y/z/c
                // a/x/y/z/b/c
                // a/b/x/b/x/c
                // a/b/c
                // To do this, take the rest of the pattern after
                // the **, and see if it would match the file remainder.
                // If so, return success.
                // If not, the ** "swallows" a segment, and try again.
                // This is recursively awful.
                //
                // a/**/b/**/c matching a/b/x/y/z/c
                // - a matches a
                // - doublestar
                //   - matchOne(b/x/y/z/c, b/**/c)
                //     - b matches b
                //     - doublestar
                //       - matchOne(x/y/z/c, c) -> no
                //       - matchOne(y/z/c, c) -> no
                //       - matchOne(z/c, c) -> no
                //       - matchOne(c, c) yes, hit
                var fr = fi;
                var pr = pi + 1;
                if (pr === pl) {
                    this.debug('** at the end');
                    // a ** at the end will just swallow the rest.
                    // We have found a match.
                    // however, it will not swallow /.x, unless
                    // options.dot is set.
                    // . and .. are *never* matched by **, for explosively
                    // exponential reasons.
                    for (; fi < fl; fi++) {
                        if (file[fi] === '.' ||
                            file[fi] === '..' ||
                            (!options.dot && file[fi].charAt(0) === '.'))
                            return false;
                    }
                    return true;
                }
                // ok, let's see if we can swallow whatever we can.
                while (fr < fl) {
                    var swallowee = file[fr];
                    this.debug('\nglobstar while', file, fr, pattern, pr, swallowee);
                    // XXX remove this slice.  Just pass the start index.
                    if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
                        this.debug('globstar found match!', fr, fl, swallowee);
                        // found a match.
                        return true;
                    }
                    else {
                        // can't swallow "." or ".." ever.
                        // can only swallow ".foo" when explicitly asked.
                        if (swallowee === '.' ||
                            swallowee === '..' ||
                            (!options.dot && swallowee.charAt(0) === '.')) {
                            this.debug('dot detected!', file, fr, pattern, pr);
                            break;
                        }
                        // ** swallows a segment, and continue.
                        this.debug('globstar swallow a segment, and continue');
                        fr++;
                    }
                }
                // no match was found.
                // However, in partial mode, we can't say this is necessarily over.
                /* c8 ignore start */
                if (partial) {
                    // ran out of file
                    this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
                    if (fr === fl) {
                        return true;
                    }
                }
                /* c8 ignore stop */
                return false;
            }
            // something other than **
            // non-magic patterns just have to match exactly
            // patterns with magic have been turned into regexps.
            let hit;
            if (typeof p === 'string') {
                hit = f === p;
                this.debug('string match', p, f, hit);
            }
            else {
                hit = p.test(f);
                this.debug('pattern match', p, f, hit);
            }
            if (!hit)
                return false;
        }
        // Note: ending in / means that we'll get a final ""
        // at the end of the pattern.  This can only match a
        // corresponding "" at the end of the file.
        // If the file ends in /, then it can only match a
        // a pattern that ends in /, unless the pattern just
        // doesn't have any more for it. But, a/b/ should *not*
        // match "a/b/*", even though "" matches against the
        // [^/]*? pattern, except in partial mode, where it might
        // simply not be reached yet.
        // However, a/b/ should still satisfy a/*
        // now either we fell off the end of the pattern, or we're done.
        if (fi === fl && pi === pl) {
            // ran out of pattern and filename at the same time.
            // an exact hit!
            return true;
        }
        else if (fi === fl) {
            // ran out of file, but still had pattern left.
            // this is ok if we're doing the match as part of
            // a glob fs traversal.
            return partial;
        }
        else if (pi === pl) {
            // ran out of pattern, still have file left.
            // this is only acceptable if we're on the very last
            // empty segment of a file with a trailing slash.
            // a/* should match a/b/
            return fi === fl - 1 && file[fi] === '';
            /* c8 ignore start */
        }
        else {
            // should be unreachable.
            throw new Error('wtf?');
        }
        /* c8 ignore stop */
    }
    braceExpand() {
        return braceExpand(this.pattern, this.options);
    }
    parse(pattern) {
        assertValidPattern(pattern);
        const options = this.options;
        // shortcuts
        if (pattern === '**')
            return GLOBSTAR;
        if (pattern === '')
            return '';
        // far and away, the most common glob pattern parts are
        // *, *.*, and *.<ext>  Add a fast check method for those.
        let m;
        let fastTest = null;
        if ((m = pattern.match(starRE))) {
            fastTest = options.dot ? starTestDot : starTest;
        }
        else if ((m = pattern.match(starDotExtRE))) {
            fastTest = (options.nocase
                ? options.dot
                    ? starDotExtTestNocaseDot
                    : starDotExtTestNocase
                : options.dot
                    ? starDotExtTestDot
                    : starDotExtTest)(m[1]);
        }
        else if ((m = pattern.match(qmarksRE))) {
            fastTest = (options.nocase
                ? options.dot
                    ? qmarksTestNocaseDot
                    : qmarksTestNocase
                : options.dot
                    ? qmarksTestDot
                    : qmarksTest)(m);
        }
        else if ((m = pattern.match(starDotStarRE))) {
            fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
        }
        else if ((m = pattern.match(dotStarRE))) {
            fastTest = dotStarTest;
        }
        const re = AST.fromGlob(pattern, this.options).toMMPattern();
        if (fastTest && typeof re === 'object') {
            // Avoids overriding in frozen environments
            Reflect.defineProperty(re, 'test', { value: fastTest });
        }
        return re;
    }
    makeRe() {
        if (this.regexp || this.regexp === false)
            return this.regexp;
        // at this point, this.set is a 2d array of partial
        // pattern strings, or "**".
        //
        // It's better to use .match().  This function shouldn't
        // be used, really, but it's pretty convenient sometimes,
        // when you just want to work with a regex.
        const set = this.set;
        if (!set.length) {
            this.regexp = false;
            return this.regexp;
        }
        const options = this.options;
        const twoStar = options.noglobstar
            ? star
            : options.dot
                ? twoStarDot
                : twoStarNoDot;
        const flags = new Set(options.nocase ? ['i'] : []);
        // regexpify non-globstar patterns
        // if ** is only item, then we just do one twoStar
        // if ** is first, and there are more, prepend (\/|twoStar\/)? to next
        // if ** is last, append (\/twoStar|) to previous
        // if ** is in the middle, append (\/|\/twoStar\/) to previous
        // then filter out GLOBSTAR symbols
        let re = set
            .map(pattern => {
            const pp = pattern.map(p => {
                if (p instanceof RegExp) {
                    for (const f of p.flags.split(''))
                        flags.add(f);
                }
                return typeof p === 'string'
                    ? regExpEscape(p)
                    : p === GLOBSTAR
                        ? GLOBSTAR
                        : p._src;
            });
            pp.forEach((p, i) => {
                const next = pp[i + 1];
                const prev = pp[i - 1];
                if (p !== GLOBSTAR || prev === GLOBSTAR) {
                    return;
                }
                if (prev === undefined) {
                    if (next !== undefined && next !== GLOBSTAR) {
                        pp[i + 1] = '(?:\\/|' + twoStar + '\\/)?' + next;
                    }
                    else {
                        pp[i] = twoStar;
                    }
                }
                else if (next === undefined) {
                    pp[i - 1] = prev + '(?:\\/|\\/' + twoStar + ')?';
                }
                else if (next !== GLOBSTAR) {
                    pp[i - 1] = prev + '(?:\\/|\\/' + twoStar + '\\/)' + next;
                    pp[i + 1] = GLOBSTAR;
                }
            });
            const filtered = pp.filter(p => p !== GLOBSTAR);
            // For partial matches, we need to make the pattern match
            // any prefix of the full path. We do this by generating
            // alternative patterns that match progressively longer prefixes.
            if (this.partial && filtered.length >= 1) {
                const prefixes = [];
                for (let i = 1; i <= filtered.length; i++) {
                    prefixes.push(filtered.slice(0, i).join('/'));
                }
                return '(?:' + prefixes.join('|') + ')';
            }
            return filtered.join('/');
        })
            .join('|');
        // need to wrap in parens if we had more than one thing with |,
        // otherwise only the first will be anchored to ^ and the last to $
        const [open, close] = set.length > 1 ? ['(?:', ')'] : ['', ''];
        // must match entire pattern
        // ending in a * or ** will make it less strict.
        re = '^' + open + re + close + '$';
        // In partial mode, '/' should always match as it's a valid prefix for any pattern
        if (this.partial) {
            re = '^(?:\\/|' + open + re.slice(1, -1) + close + ')$';
        }
        // can match anything, as long as it's not this.
        if (this.negate)
            re = '^(?!' + re + ').+$';
        try {
            this.regexp = new RegExp(re, [...flags].join(''));
            /* c8 ignore start */
        }
        catch (ex) {
            // should be impossible
            this.regexp = false;
        }
        /* c8 ignore stop */
        return this.regexp;
    }
    slashSplit(p) {
        // if p starts with // on windows, we preserve that
        // so that UNC paths aren't broken.  Otherwise, any number of
        // / characters are coalesced into one, unless
        // preserveMultipleSlashes is set to true.
        if (this.preserveMultipleSlashes) {
            return p.split('/');
        }
        else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
            // add an extra '' for the one we lose
            return ['', ...p.split(/\/+/)];
        }
        else {
            return p.split(/\/+/);
        }
    }
    match(f, partial = this.partial) {
        this.debug('match', f, this.pattern);
        // short-circuit in the case of busted things.
        // comments, etc.
        if (this.comment) {
            return false;
        }
        if (this.empty) {
            return f === '';
        }
        if (f === '/' && partial) {
            return true;
        }
        const options = this.options;
        // windows: need to use /, not \
        if (this.isWindows) {
            f = f.split('\\').join('/');
        }
        // treat the test path as a set of pathparts.
        const ff = this.slashSplit(f);
        this.debug(this.pattern, 'split', ff);
        // just ONE of the pattern sets in this.set needs to match
        // in order for it to be valid.  If negating, then just one
        // match means that we have failed.
        // Either way, return on the first hit.
        const set = this.set;
        this.debug(this.pattern, 'set', set);
        // Find the basename of the path by looking for the last non-empty segment
        let filename = ff[ff.length - 1];
        if (!filename) {
            for (let i = ff.length - 2; !filename && i >= 0; i--) {
                filename = ff[i];
            }
        }
        for (let i = 0; i < set.length; i++) {
            const pattern = set[i];
            let file = ff;
            if (options.matchBase && pattern.length === 1) {
                file = [filename];
            }
            const hit = this.matchOne(file, pattern, partial);
            if (hit) {
                if (options.flipNegate) {
                    return true;
                }
                return !this.negate;
            }
        }
        // didn't get any hits.  this is success if it's a negative
        // pattern, failure otherwise.
        if (options.flipNegate) {
            return false;
        }
        return this.negate;
    }
    static defaults(def) {
        return minimatch.defaults(def).Minimatch;
    }
}
/* c8 ignore stop */
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

class TypeScope {
  constructor(filename, source, offset = 0, imports = /* @__PURE__ */ Object.create(null), types = /* @__PURE__ */ Object.create(null), declares = /* @__PURE__ */ Object.create(null)) {
    this.filename = filename;
    this.source = source;
    this.offset = offset;
    this.imports = imports;
    this.types = types;
    this.declares = declares;
    this.isGenericScope = false;
    this.resolvedImportSources = /* @__PURE__ */ Object.create(null);
    this.exportedTypes = /* @__PURE__ */ Object.create(null);
    this.exportedDeclares = /* @__PURE__ */ Object.create(null);
  }
}
function resolveTypeElements(ctx, node, scope, typeParameters) {
  const canCache = !typeParameters;
  if (canCache && node._resolvedElements) {
    return node._resolvedElements;
  }
  const resolved = innerResolveTypeElements(
    ctx,
    node,
    node._ownerScope || scope || ctxToScope(ctx),
    typeParameters
  );
  return canCache ? node._resolvedElements = resolved : resolved;
}
function innerResolveTypeElements(ctx, node, scope, typeParameters) {
  var _a, _b;
  if (node.leadingComments && node.leadingComments.some((c) => c.value.includes("@vue-ignore"))) {
    return { props: {} };
  }
  switch (node.type) {
    case "TSTypeLiteral":
      return typeElementsToMap(ctx, node.members, scope, typeParameters);
    case "TSInterfaceDeclaration":
      return resolveInterfaceMembers(ctx, node, scope, typeParameters);
    case "TSTypeAliasDeclaration":
    case "TSTypeAnnotation":
    case "TSParenthesizedType":
      return resolveTypeElements(
        ctx,
        node.typeAnnotation,
        scope,
        typeParameters
      );
    case "TSFunctionType": {
      return { props: {}, calls: [node] };
    }
    case "TSUnionType":
    case "TSIntersectionType":
      return mergeElements(
        node.types.map((t) => resolveTypeElements(ctx, t, scope, typeParameters)),
        node.type
      );
    case "TSMappedType":
      return resolveMappedType(ctx, node, scope, typeParameters);
    case "TSIndexedAccessType": {
      const types = resolveIndexType(ctx, node, scope);
      return mergeElements(
        types.map((t) => resolveTypeElements(ctx, t, t._ownerScope)),
        "TSUnionType"
      );
    }
    case "TSExpressionWithTypeArguments":
    // referenced by interface extends
    case "TSTypeReference": {
      const typeName = getReferenceName(node);
      if ((typeName === "ExtractPropTypes" || typeName === "ExtractPublicPropTypes") && node.typeParameters && ((_a = scope.imports[typeName]) == null ? void 0 : _a.source) === "vue") {
        return resolveExtractPropTypes(
          resolveTypeElements(
            ctx,
            node.typeParameters.params[0],
            scope,
            typeParameters
          ),
          scope
        );
      }
      const resolved = resolveTypeReference(ctx, node, scope);
      if (resolved) {
        let typeParams;
        if ((resolved.type === "TSTypeAliasDeclaration" || resolved.type === "TSInterfaceDeclaration") && resolved.typeParameters && node.typeParameters) {
          typeParams = /* @__PURE__ */ Object.create(null);
          resolved.typeParameters.params.forEach((p, i) => {
            let param = typeParameters && typeParameters[p.name];
            if (!param) param = node.typeParameters.params[i];
            typeParams[p.name] = param;
          });
        }
        return resolveTypeElements(
          ctx,
          resolved,
          resolved._ownerScope,
          typeParams
        );
      } else {
        if (typeof typeName === "string") {
          if (typeParameters && typeParameters[typeName]) {
            return resolveTypeElements(
              ctx,
              typeParameters[typeName],
              scope,
              typeParameters
            );
          }
          if (
            // @ts-expect-error
            SupportedBuiltinsSet.has(typeName)
          ) {
            return resolveBuiltin(
              ctx,
              node,
              typeName,
              scope,
              typeParameters
            );
          } else if (typeName === "ReturnType" && node.typeParameters) {
            const ret = resolveReturnType(
              ctx,
              node.typeParameters.params[0],
              scope
            );
            if (ret) {
              return resolveTypeElements(ctx, ret, scope);
            }
          }
        }
        return ctx.error(
          `Unresolvable type reference or unsupported built-in utility type`,
          node,
          scope
        );
      }
    }
    case "TSImportType": {
      if (getId(node.argument) === "vue" && ((_b = node.qualifier) == null ? void 0 : _b.type) === "Identifier" && node.qualifier.name === "ExtractPropTypes" && node.typeParameters) {
        return resolveExtractPropTypes(
          resolveTypeElements(ctx, node.typeParameters.params[0], scope),
          scope
        );
      }
      const sourceScope = importSourceToScope(
        ctx,
        node.argument,
        scope,
        node.argument.value
      );
      const resolved = resolveTypeReference(ctx, node, sourceScope);
      if (resolved) {
        return resolveTypeElements(ctx, resolved, resolved._ownerScope);
      }
      break;
    }
    case "TSTypeQuery":
      {
        const resolved = resolveTypeReference(ctx, node, scope);
        if (resolved) {
          return resolveTypeElements(ctx, resolved, resolved._ownerScope);
        }
      }
      break;
  }
  return ctx.error(`Unresolvable type: ${node.type}`, node, scope);
}
function typeElementsToMap(ctx, elements, scope = ctxToScope(ctx), typeParameters) {
  const res = { props: {} };
  for (const e of elements) {
    if (e.type === "TSPropertySignature" || e.type === "TSMethodSignature") {
      if (typeParameters) {
        scope = createChildScope(scope);
        scope.isGenericScope = true;
        Object.assign(scope.types, typeParameters);
      }
      e._ownerScope = scope;
      const name = getStringLiteralKey(e);
      if (name !== null) {
        res.props[name] = e;
      } else {
        ctx.error(
          `Unsupported computed key in type referenced by a macro`,
          e.key,
          scope
        );
      }
    } else if (e.type === "TSCallSignatureDeclaration") {
      (res.calls || (res.calls = [])).push(e);
    }
  }
  return res;
}
function mergeElements(maps, type) {
  if (maps.length === 1) return maps[0];
  const res = { props: {} };
  const { props: baseProps } = res;
  for (const { props, calls } of maps) {
    for (const key in props) {
      if (!shared.hasOwn(baseProps, key)) {
        baseProps[key] = props[key];
      } else {
        baseProps[key] = createProperty(
          baseProps[key].key,
          {
            type,
            // @ts-expect-error
            types: [baseProps[key], props[key]]
          },
          baseProps[key]._ownerScope,
          baseProps[key].optional || props[key].optional
        );
      }
    }
    if (calls) {
      (res.calls || (res.calls = [])).push(...calls);
    }
  }
  return res;
}
function createProperty(key, typeAnnotation, scope, optional) {
  return {
    type: "TSPropertySignature",
    key,
    kind: "get",
    optional,
    typeAnnotation: {
      type: "TSTypeAnnotation",
      typeAnnotation
    },
    _ownerScope: scope
  };
}
function resolveInterfaceMembers(ctx, node, scope, typeParameters) {
  const base = typeElementsToMap(
    ctx,
    node.body.body,
    node._ownerScope,
    typeParameters
  );
  if (node.extends) {
    for (const ext of node.extends) {
      try {
        const { props, calls } = resolveTypeElements(ctx, ext, scope);
        for (const key in props) {
          if (!shared.hasOwn(base.props, key)) {
            base.props[key] = props[key];
          }
        }
        if (calls) {
          ;
          (base.calls || (base.calls = [])).push(...calls);
        }
      } catch (e) {
        ctx.error(
          `Failed to resolve extends base type.
If this previously worked in 3.2, you can instruct the compiler to ignore this extend by adding /* @vue-ignore */ before it, for example:

interface Props extends /* @vue-ignore */ Base {}

Note: both in 3.2 or with the ignore, the properties in the base type are treated as fallthrough attrs at runtime.`,
          ext,
          scope
        );
      }
    }
  }
  return base;
}
function resolveMappedType(ctx, node, scope, typeParameters) {
  const res = { props: {} };
  let keys;
  if (node.nameType) {
    const { name, constraint } = node.typeParameter;
    scope = createChildScope(scope);
    Object.assign(scope.types, { ...typeParameters, [name]: constraint });
    keys = resolveStringType(ctx, node.nameType, scope);
  } else {
    keys = resolveStringType(ctx, node.typeParameter.constraint, scope);
  }
  for (const key of keys) {
    res.props[key] = createProperty(
      {
        type: "Identifier",
        name: key
      },
      node.typeAnnotation,
      scope,
      !!node.optional
    );
  }
  return res;
}
function resolveIndexType(ctx, node, scope) {
  var _a, _b;
  if (node.indexType.type === "TSNumberKeyword") {
    return resolveArrayElementType(ctx, node.objectType, scope);
  }
  const { indexType, objectType } = node;
  const types = [];
  let keys;
  let resolved;
  if (indexType.type === "TSStringKeyword") {
    resolved = resolveTypeElements(ctx, objectType, scope);
    keys = Object.keys(resolved.props);
  } else {
    keys = resolveStringType(ctx, indexType, scope);
    resolved = resolveTypeElements(ctx, objectType, scope);
  }
  for (const key of keys) {
    const targetType = (_b = (_a = resolved.props[key]) == null ? void 0 : _a.typeAnnotation) == null ? void 0 : _b.typeAnnotation;
    if (targetType) {
      targetType._ownerScope = resolved.props[key]._ownerScope;
      types.push(targetType);
    }
  }
  return types;
}
function resolveArrayElementType(ctx, node, scope) {
  if (node.type === "TSArrayType") {
    return [node.elementType];
  }
  if (node.type === "TSTupleType") {
    return node.elementTypes.map(
      (t) => t.type === "TSNamedTupleMember" ? t.elementType : t
    );
  }
  if (node.type === "TSTypeReference") {
    if (getReferenceName(node) === "Array" && node.typeParameters) {
      return node.typeParameters.params;
    } else {
      const resolved = resolveTypeReference(ctx, node, scope);
      if (resolved) {
        return resolveArrayElementType(ctx, resolved, scope);
      }
    }
  }
  return ctx.error(
    "Failed to resolve element type from target type",
    node,
    scope
  );
}
function resolveStringType(ctx, node, scope, typeParameters) {
  switch (node.type) {
    case "StringLiteral":
      return [node.value];
    case "TSLiteralType":
      return resolveStringType(ctx, node.literal, scope, typeParameters);
    case "TSUnionType":
      return node.types.map((t) => resolveStringType(ctx, t, scope, typeParameters)).flat();
    case "TemplateLiteral": {
      return resolveTemplateKeys(ctx, node, scope);
    }
    case "TSTypeReference": {
      const resolved = resolveTypeReference(ctx, node, scope);
      if (resolved) {
        return resolveStringType(ctx, resolved, scope, typeParameters);
      }
      if (node.typeName.type === "Identifier") {
        const name = node.typeName.name;
        if (typeParameters && typeParameters[name]) {
          return resolveStringType(
            ctx,
            typeParameters[name],
            scope,
            typeParameters
          );
        }
        const getParam = (index = 0) => resolveStringType(
          ctx,
          node.typeParameters.params[index],
          scope,
          typeParameters
        );
        switch (name) {
          case "Extract":
            return getParam(1);
          case "Exclude": {
            const excluded = getParam(1);
            return getParam().filter((s) => !excluded.includes(s));
          }
          case "Uppercase":
            return getParam().map((s) => s.toUpperCase());
          case "Lowercase":
            return getParam().map((s) => s.toLowerCase());
          case "Capitalize":
            return getParam().map(shared.capitalize);
          case "Uncapitalize":
            return getParam().map((s) => s[0].toLowerCase() + s.slice(1));
          default:
            ctx.error(
              "Unsupported type when resolving index type",
              node.typeName,
              scope
            );
        }
      }
    }
  }
  return ctx.error("Failed to resolve index type into finite keys", node, scope);
}
function resolveTemplateKeys(ctx, node, scope) {
  if (!node.expressions.length) {
    return [node.quasis[0].value.raw];
  }
  const res = [];
  const e = node.expressions[0];
  const q = node.quasis[0];
  const leading = q ? q.value.raw : ``;
  const resolved = resolveStringType(ctx, e, scope);
  const restResolved = resolveTemplateKeys(
    ctx,
    {
      ...node,
      expressions: node.expressions.slice(1),
      quasis: q ? node.quasis.slice(1) : node.quasis
    },
    scope
  );
  for (const r of resolved) {
    for (const rr of restResolved) {
      res.push(leading + r + rr);
    }
  }
  return res;
}
const SupportedBuiltinsSet = /* @__PURE__ */ new Set([
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit"
]);
function resolveBuiltin(ctx, node, name, scope, typeParameters) {
  const t = resolveTypeElements(
    ctx,
    node.typeParameters.params[0],
    scope,
    typeParameters
  );
  switch (name) {
    case "Partial": {
      const res2 = { props: {}, calls: t.calls };
      Object.keys(t.props).forEach((key) => {
        res2.props[key] = { ...t.props[key], optional: true };
      });
      return res2;
    }
    case "Required": {
      const res2 = { props: {}, calls: t.calls };
      Object.keys(t.props).forEach((key) => {
        res2.props[key] = { ...t.props[key], optional: false };
      });
      return res2;
    }
    case "Readonly":
      return t;
    case "Pick": {
      const picked = resolveStringType(
        ctx,
        node.typeParameters.params[1],
        scope,
        typeParameters
      );
      const res2 = { props: {}, calls: t.calls };
      for (const key of picked) {
        res2.props[key] = t.props[key];
      }
      return res2;
    }
    case "Omit":
      const omitted = resolveStringType(
        ctx,
        node.typeParameters.params[1],
        scope,
        typeParameters
      );
      const res = { props: {}, calls: t.calls };
      for (const key in t.props) {
        if (!omitted.includes(key)) {
          res.props[key] = t.props[key];
        }
      }
      return res;
  }
}
function resolveTypeReference(ctx, node, scope, name, onlyExported = false) {
  const canCache = !(scope == null ? void 0 : scope.isGenericScope);
  if (canCache && node._resolvedReference) {
    return node._resolvedReference;
  }
  const resolved = innerResolveTypeReference(
    ctx,
    scope || ctxToScope(ctx),
    name || getReferenceName(node),
    node,
    onlyExported
  );
  return canCache ? node._resolvedReference = resolved : resolved;
}
function innerResolveTypeReference(ctx, scope, name, node, onlyExported) {
  if (typeof name === "string") {
    if (scope.imports[name]) {
      return resolveTypeFromImport(ctx, node, name, scope);
    } else {
      const lookupSource = node.type === "TSTypeQuery" ? onlyExported ? scope.exportedDeclares : scope.declares : onlyExported ? scope.exportedTypes : scope.types;
      if (lookupSource[name]) {
        return lookupSource[name];
      } else {
        const globalScopes = resolveGlobalScope(ctx);
        if (globalScopes) {
          for (const s of globalScopes) {
            const src = node.type === "TSTypeQuery" ? s.declares : s.types;
            if (src[name]) {
              (ctx.deps || (ctx.deps = /* @__PURE__ */ new Set())).add(s.filename);
              return src[name];
            }
          }
        }
      }
    }
  } else {
    let ns = innerResolveTypeReference(ctx, scope, name[0], node, onlyExported);
    if (ns) {
      if (ns.type !== "TSModuleDeclaration") {
        ns = ns._ns;
      }
      if (ns) {
        const childScope = moduleDeclToScope(ctx, ns, ns._ownerScope || scope);
        return innerResolveTypeReference(
          ctx,
          childScope,
          name.length > 2 ? name.slice(1) : name[name.length - 1],
          node,
          !ns.declare
        );
      }
    }
  }
}
function getReferenceName(node) {
  const ref = node.type === "TSTypeReference" ? node.typeName : node.type === "TSExpressionWithTypeArguments" ? node.expression : node.type === "TSImportType" ? node.qualifier : node.exprName;
  if ((ref == null ? void 0 : ref.type) === "Identifier") {
    return ref.name;
  } else if ((ref == null ? void 0 : ref.type) === "TSQualifiedName") {
    return qualifiedNameToPath(ref);
  } else {
    return "default";
  }
}
function qualifiedNameToPath(node) {
  if (node.type === "Identifier") {
    return [node.name];
  } else {
    return [...qualifiedNameToPath(node.left), node.right.name];
  }
}
function resolveGlobalScope(ctx) {
  if (ctx.options.globalTypeFiles) {
    const fs = resolveFS(ctx);
    if (!fs) {
      throw new Error("[vue/compiler-sfc] globalTypeFiles requires fs access.");
    }
    return ctx.options.globalTypeFiles.map(
      (file) => fileToScope(ctx, normalizePath(file), true)
    );
  }
}
let ts;
let loadTS;
function registerTS(_loadTS) {
  loadTS = () => {
    try {
      return _loadTS();
    } catch (err) {
      if (typeof err.message === "string" && err.message.includes("Cannot find module")) {
        throw new Error(
          'Failed to load TypeScript, which is required for resolving imported types. Please make sure "TypeScript" is installed as a project dependency.'
        );
      } else {
        throw new Error(
          "Failed to load TypeScript for resolving imported types."
        );
      }
    }
  };
}
function resolveFS(ctx) {
  if (ctx.fs) {
    return ctx.fs;
  }
  if (!ts && loadTS) {
    ts = loadTS();
  }
  const fs = ctx.options.fs || (ts == null ? void 0 : ts.sys);
  if (!fs) {
    return;
  }
  return ctx.fs = {
    fileExists(file) {
      if (file.endsWith(".vue.ts") && !file.endsWith(".d.vue.ts")) {
        file = file.replace(/\.ts$/, "");
      }
      return fs.fileExists(file);
    },
    readFile(file) {
      if (file.endsWith(".vue.ts") && !file.endsWith(".d.vue.ts")) {
        file = file.replace(/\.ts$/, "");
      }
      return fs.readFile(file);
    },
    realpath: fs.realpath
  };
}
function resolveTypeFromImport(ctx, node, name, scope) {
  const { source, imported } = scope.imports[name];
  const sourceScope = importSourceToScope(ctx, node, scope, source);
  return resolveTypeReference(ctx, node, sourceScope, imported, true);
}
function importSourceToScope(ctx, node, scope, source) {
  let fs;
  try {
    fs = resolveFS(ctx);
  } catch (err) {
    return ctx.error(err.message, node, scope);
  }
  if (!fs) {
    return ctx.error(
      `No fs option provided to \`compileScript\` in non-Node environment. File system access is required for resolving imported types.`,
      node,
      scope
    );
  }
  let resolved = scope.resolvedImportSources[source];
  if (!resolved) {
    if (source.startsWith("..")) {
      const osSpecificJoinFn = process__namespace.platform === "win32" ? path$1.join : joinPaths;
      const filename = osSpecificJoinFn(path$1.dirname(scope.filename), source);
      resolved = resolveExt(filename, fs);
    } else if (source[0] === ".") {
      const filename = joinPaths(path$1.dirname(scope.filename), source);
      resolved = resolveExt(filename, fs);
    } else {
      if (!ts) {
        if (loadTS) ts = loadTS();
        if (!ts) {
          return ctx.error(
            `Failed to resolve import source ${JSON.stringify(source)}. TypeScript is required as a peer dep for vue in order to support resolving types from module imports.`,
            node,
            scope
          );
        }
      }
      resolved = resolveWithTS(scope.filename, source, ts, fs);
    }
    if (resolved) {
      resolved = scope.resolvedImportSources[source] = normalizePath(resolved);
    }
  }
  if (resolved) {
    (ctx.deps || (ctx.deps = /* @__PURE__ */ new Set())).add(resolved);
    return fileToScope(ctx, resolved);
  } else {
    return ctx.error(
      `Failed to resolve import source ${JSON.stringify(source)}.`,
      node,
      scope
    );
  }
}
function resolveExt(filename, fs) {
  filename = filename.replace(/\.js$/, "");
  const tryResolve = (filename2) => {
    if (fs.fileExists(filename2)) return filename2;
  };
  return tryResolve(filename) || tryResolve(filename + `.ts`) || tryResolve(filename + `.tsx`) || tryResolve(filename + `.d.ts`) || tryResolve(joinPaths(filename, `index.ts`)) || tryResolve(joinPaths(filename, `index.tsx`)) || tryResolve(joinPaths(filename, `index.d.ts`));
}
const tsConfigCache = createCache();
const tsConfigRefMap = /* @__PURE__ */ new Map();
function resolveWithTS(containingFile, source, ts2, fs) {
  var _a, _b;
  const configPath = ts2.findConfigFile(containingFile, fs.fileExists);
  let tsCompilerOptions;
  let tsResolveCache;
  if (configPath) {
    let configs;
    const normalizedConfigPath = normalizePath(configPath);
    const cached = tsConfigCache.get(normalizedConfigPath);
    if (!cached) {
      configs = loadTSConfig(configPath, ts2, fs).map((config) => ({ config }));
      tsConfigCache.set(normalizedConfigPath, configs);
    } else {
      configs = cached;
    }
    let matchedConfig;
    if (configs.length === 1) {
      matchedConfig = configs[0];
    } else {
      const [major, minor] = ts2.versionMajorMinor.split(".").map(Number);
      const getPattern = (base, p) => {
        const supportsConfigDir = major > 5 || major === 5 && minor >= 5;
        return p.startsWith("${configDir}") && supportsConfigDir ? normalizePath(p.replace("${configDir}", path$1.dirname(configPath))) : joinPaths(base, p);
      };
      for (const c of configs) {
        const base = normalizePath(
          c.config.options.pathsBasePath || path$1.dirname(c.config.options.configFilePath)
        );
        const included = (_a = c.config.raw) == null ? void 0 : _a.include;
        const excluded = (_b = c.config.raw) == null ? void 0 : _b.exclude;
        if (!included && (!base || containingFile.startsWith(base)) || (included == null ? void 0 : included.some((p) => minimatch(containingFile, getPattern(base, p))))) {
          if (excluded && excluded.some((p) => minimatch(containingFile, getPattern(base, p)))) {
            continue;
          }
          matchedConfig = c;
          break;
        }
      }
      if (!matchedConfig) {
        matchedConfig = configs[configs.length - 1];
      }
    }
    tsCompilerOptions = matchedConfig.config.options;
    tsResolveCache = matchedConfig.cache || (matchedConfig.cache = ts2.createModuleResolutionCache(
      process__namespace.cwd(),
      createGetCanonicalFileName(ts2.sys.useCaseSensitiveFileNames),
      tsCompilerOptions
    ));
  } else {
    tsCompilerOptions = {};
  }
  const res = ts2.resolveModuleName(
    source,
    containingFile,
    tsCompilerOptions,
    fs,
    tsResolveCache
  );
  if (res.resolvedModule) {
    let filename = res.resolvedModule.resolvedFileName;
    if (filename.endsWith(".vue.ts") && !filename.endsWith(".d.vue.ts")) {
      filename = filename.replace(/\.ts$/, "");
    }
    return fs.realpath ? fs.realpath(filename) : filename;
  }
}
function loadTSConfig(configPath, ts2, fs, visited = /* @__PURE__ */ new Set()) {
  const parseConfigHost = ts2.sys;
  const config = ts2.parseJsonConfigFileContent(
    ts2.readConfigFile(configPath, fs.readFile).config,
    parseConfigHost,
    path$1.dirname(configPath),
    void 0,
    configPath
  );
  const res = [config];
  visited.add(configPath);
  if (config.projectReferences) {
    for (const ref of config.projectReferences) {
      const refPath = ts2.resolveProjectReferencePath(ref);
      if (visited.has(refPath) || !fs.fileExists(refPath)) {
        continue;
      }
      tsConfigRefMap.set(refPath, configPath);
      res.unshift(...loadTSConfig(refPath, ts2, fs, visited));
    }
  }
  return res;
}
const fileToScopeCache = createCache();
function invalidateTypeCache(filename) {
  filename = normalizePath(filename);
  fileToScopeCache.delete(filename);
  tsConfigCache.delete(filename);
  const affectedConfig = tsConfigRefMap.get(filename);
  if (affectedConfig) tsConfigCache.delete(affectedConfig);
}
function fileToScope(ctx, filename, asGlobal = false) {
  const cached = fileToScopeCache.get(filename);
  if (cached) {
    return cached;
  }
  const fs = resolveFS(ctx);
  const source = fs.readFile(filename) || "";
  const body = parseFile(filename, source, fs, ctx.options.babelParserPlugins);
  const scope = new TypeScope(filename, source, 0, recordImports(body));
  recordTypes(ctx, body, scope, asGlobal);
  fileToScopeCache.set(filename, scope);
  return scope;
}
function parseFile(filename, content, fs, parserPlugins) {
  const ext = path$1.extname(filename);
  if (ext === ".ts" || ext === ".mts" || ext === ".tsx" || ext === ".mtsx") {
    return parser$2.parse(content, {
      plugins: resolveParserPlugins(
        ext.slice(1),
        parserPlugins,
        /\.d\.m?ts$/.test(filename)
      ),
      sourceType: "module"
    }).program.body;
  }
  const isUnknownTypeSource = !/\.[cm]?[tj]sx?$/.test(filename);
  const arbitraryTypeSource = `${filename.slice(0, -ext.length)}.d${ext}.ts`;
  const hasArbitraryTypeDeclaration = isUnknownTypeSource && fs.fileExists(arbitraryTypeSource);
  if (hasArbitraryTypeDeclaration) {
    return parser$2.parse(fs.readFile(arbitraryTypeSource), {
      plugins: resolveParserPlugins("ts", parserPlugins, true),
      sourceType: "module"
    }).program.body;
  }
  if (ext === ".vue") {
    const {
      descriptor: { script, scriptSetup }
    } = parse$1(content);
    if (!script && !scriptSetup) {
      return [];
    }
    const scriptOffset = script ? script.loc.start.offset : Infinity;
    const scriptSetupOffset = scriptSetup ? scriptSetup.loc.start.offset : Infinity;
    const firstBlock = scriptOffset < scriptSetupOffset ? script : scriptSetup;
    const secondBlock = scriptOffset < scriptSetupOffset ? scriptSetup : script;
    let scriptContent = " ".repeat(Math.min(scriptOffset, scriptSetupOffset)) + firstBlock.content;
    if (secondBlock) {
      scriptContent += " ".repeat(secondBlock.loc.start.offset - script.loc.end.offset) + secondBlock.content;
    }
    const lang = (script == null ? void 0 : script.lang) || (scriptSetup == null ? void 0 : scriptSetup.lang);
    return parser$2.parse(scriptContent, {
      plugins: resolveParserPlugins(lang, parserPlugins),
      sourceType: "module"
    }).program.body;
  }
  return [];
}
function ctxToScope(ctx) {
  if (ctx.scope) {
    return ctx.scope;
  }
  const body = "ast" in ctx ? ctx.ast : ctx.scriptAst ? [...ctx.scriptAst.body, ...ctx.scriptSetupAst.body] : ctx.scriptSetupAst.body;
  const scope = new TypeScope(
    ctx.filename,
    ctx.source,
    "startOffset" in ctx ? ctx.startOffset : 0,
    "userImports" in ctx ? Object.create(ctx.userImports) : recordImports(body)
  );
  recordTypes(ctx, body, scope);
  return ctx.scope = scope;
}
function moduleDeclToScope(ctx, node, parentScope) {
  if (node._resolvedChildScope) {
    return node._resolvedChildScope;
  }
  const scope = createChildScope(parentScope);
  if (node.body.type === "TSModuleDeclaration") {
    const decl = node.body;
    decl._ownerScope = scope;
    const id = getId(decl.id);
    scope.types[id] = scope.exportedTypes[id] = decl;
  } else {
    recordTypes(ctx, node.body.body, scope);
  }
  return node._resolvedChildScope = scope;
}
function createChildScope(parentScope) {
  return new TypeScope(
    parentScope.filename,
    parentScope.source,
    parentScope.offset,
    Object.create(parentScope.imports),
    Object.create(parentScope.types),
    Object.create(parentScope.declares)
  );
}
const importExportRE = /^Import|^Export/;
function recordTypes(ctx, body, scope, asGlobal = false) {
  const { types, declares, exportedTypes, exportedDeclares, imports } = scope;
  const isAmbient = asGlobal ? !body.some((s) => importExportRE.test(s.type)) : false;
  for (const stmt of body) {
    if (asGlobal) {
      if (isAmbient) {
        if (stmt.declare) {
          recordType(stmt, types, declares);
        }
      } else if (stmt.type === "TSModuleDeclaration" && stmt.global) {
        for (const s of stmt.body.body) {
          if (s.type === "ExportNamedDeclaration" && s.declaration) {
            recordType(s.declaration, types, declares);
          } else {
            recordType(s, types, declares);
          }
        }
      }
    } else {
      recordType(stmt, types, declares);
    }
  }
  if (!asGlobal) {
    for (const stmt of body) {
      if (stmt.type === "ExportNamedDeclaration") {
        if (stmt.declaration) {
          recordType(stmt.declaration, types, declares);
          recordType(stmt.declaration, exportedTypes, exportedDeclares);
        } else {
          for (const spec of stmt.specifiers) {
            if (spec.type === "ExportSpecifier") {
              const local = spec.local.name;
              const exported = getId(spec.exported);
              if (stmt.source) {
                imports[exported] = {
                  source: stmt.source.value,
                  imported: local
                };
                exportedTypes[exported] = {
                  type: "TSTypeReference",
                  typeName: {
                    type: "Identifier",
                    name: local
                  },
                  _ownerScope: scope
                };
              } else if (types[local]) {
                exportedTypes[exported] = types[local];
              }
            }
          }
        }
      } else if (stmt.type === "ExportAllDeclaration") {
        const sourceScope = importSourceToScope(
          ctx,
          stmt.source,
          scope,
          stmt.source.value
        );
        Object.assign(scope.exportedTypes, sourceScope.exportedTypes);
      } else if (stmt.type === "ExportDefaultDeclaration" && stmt.declaration) {
        if (stmt.declaration.type !== "Identifier") {
          recordType(stmt.declaration, types, declares, "default");
          recordType(
            stmt.declaration,
            exportedTypes,
            exportedDeclares,
            "default"
          );
        } else if (types[stmt.declaration.name]) {
          exportedTypes["default"] = types[stmt.declaration.name];
        }
      }
    }
  }
  for (const key of Object.keys(types)) {
    const node = types[key];
    node._ownerScope = scope;
    if (node._ns) node._ns._ownerScope = scope;
  }
  for (const key of Object.keys(declares)) {
    declares[key]._ownerScope = scope;
  }
}
function recordType(node, types, declares, overwriteId) {
  switch (node.type) {
    case "TSInterfaceDeclaration":
    case "TSEnumDeclaration":
    case "TSModuleDeclaration": {
      const id = overwriteId || getId(node.id);
      let existing = types[id];
      if (existing) {
        if (node.type === "TSModuleDeclaration") {
          if (existing.type === "TSModuleDeclaration") {
            mergeNamespaces(existing, node);
          } else {
            attachNamespace(existing, node);
          }
          break;
        }
        if (existing.type === "TSModuleDeclaration") {
          types[id] = node;
          attachNamespace(node, existing);
          break;
        }
        if (existing.type !== node.type) {
          break;
        }
        if (node.type === "TSInterfaceDeclaration") {
          existing.body.body.push(...node.body.body);
        } else {
          existing.members.push(...node.members);
        }
      } else {
        types[id] = node;
      }
      break;
    }
    case "ClassDeclaration":
      if (overwriteId || node.id) types[overwriteId || getId(node.id)] = node;
      break;
    case "TSTypeAliasDeclaration":
      types[node.id.name] = node.typeParameters ? node : node.typeAnnotation;
      break;
    case "TSDeclareFunction":
      if (node.id) declares[node.id.name] = node;
      break;
    case "VariableDeclaration": {
      if (node.declare) {
        for (const decl of node.declarations) {
          if (decl.id.type === "Identifier" && decl.id.typeAnnotation) {
            declares[decl.id.name] = decl.id.typeAnnotation.typeAnnotation;
          }
        }
      }
      break;
    }
  }
}
function mergeNamespaces(to, from) {
  const toBody = to.body;
  const fromBody = from.body;
  if (toBody.type === "TSModuleDeclaration") {
    if (fromBody.type === "TSModuleDeclaration") {
      mergeNamespaces(toBody, fromBody);
    } else {
      fromBody.body.push({
        type: "ExportNamedDeclaration",
        declaration: toBody,
        exportKind: "type",
        specifiers: []
      });
    }
  } else if (fromBody.type === "TSModuleDeclaration") {
    toBody.body.push({
      type: "ExportNamedDeclaration",
      declaration: fromBody,
      exportKind: "type",
      specifiers: []
    });
  } else {
    toBody.body.push(...fromBody.body);
  }
}
function attachNamespace(to, ns) {
  if (!to._ns) {
    to._ns = ns;
  } else {
    mergeNamespaces(to._ns, ns);
  }
}
function recordImports(body) {
  const imports = /* @__PURE__ */ Object.create(null);
  for (const s of body) {
    recordImport(s, imports);
  }
  return imports;
}
function recordImport(node, imports) {
  if (node.type !== "ImportDeclaration") {
    return;
  }
  for (const s of node.specifiers) {
    imports[s.local.name] = {
      imported: getImportedName(s),
      source: node.source.value
    };
  }
}
function inferRuntimeType(ctx, node, scope = node._ownerScope || ctxToScope(ctx), isKeyOf = false, typeParameters) {
  if (node.leadingComments && node.leadingComments.some((c) => c.value.includes("@vue-ignore"))) {
    return [UNKNOWN_TYPE];
  }
  try {
    switch (node.type) {
      case "TSStringKeyword":
        return ["String"];
      case "TSNumberKeyword":
        return ["Number"];
      case "TSBooleanKeyword":
        return ["Boolean"];
      case "TSObjectKeyword":
        return ["Object"];
      case "TSNullKeyword":
        return ["null"];
      case "TSTypeLiteral":
      case "TSInterfaceDeclaration": {
        const types = /* @__PURE__ */ new Set();
        const members = node.type === "TSTypeLiteral" ? node.members : node.body.body;
        for (const m of members) {
          if (isKeyOf) {
            if (m.type === "TSPropertySignature" && m.key.type === "NumericLiteral") {
              types.add("Number");
            } else if (m.type === "TSIndexSignature") {
              const annotation = m.parameters[0].typeAnnotation;
              if (annotation && annotation.type !== "Noop") {
                const type = inferRuntimeType(
                  ctx,
                  annotation.typeAnnotation,
                  scope
                )[0];
                if (type === UNKNOWN_TYPE) return [UNKNOWN_TYPE];
                types.add(type);
              }
            } else {
              types.add("String");
            }
          } else if (m.type === "TSCallSignatureDeclaration" || m.type === "TSConstructSignatureDeclaration") {
            types.add("Function");
          } else {
            types.add("Object");
          }
        }
        return types.size ? Array.from(types) : [isKeyOf ? UNKNOWN_TYPE : "Object"];
      }
      case "TSPropertySignature":
        if (node.typeAnnotation) {
          return inferRuntimeType(
            ctx,
            node.typeAnnotation.typeAnnotation,
            scope
          );
        }
        break;
      case "TSMethodSignature":
      case "TSFunctionType":
        return ["Function"];
      case "TSArrayType":
      case "TSTupleType":
        return ["Array"];
      case "TSLiteralType":
        switch (node.literal.type) {
          case "StringLiteral":
            return ["String"];
          case "BooleanLiteral":
            return ["Boolean"];
          case "NumericLiteral":
          case "BigIntLiteral":
            return ["Number"];
          default:
            return [UNKNOWN_TYPE];
        }
      case "TSTypeReference": {
        const resolved = resolveTypeReference(ctx, node, scope);
        if (resolved) {
          if (resolved.type === "TSTypeAliasDeclaration") {
            if (resolved.typeAnnotation.type === "TSFunctionType") {
              return ["Function"];
            }
            if (node.typeParameters) {
              const typeParams = /* @__PURE__ */ Object.create(null);
              if (resolved.typeParameters) {
                resolved.typeParameters.params.forEach((p, i) => {
                  typeParams[p.name] = node.typeParameters.params[i];
                });
              }
              return inferRuntimeType(
                ctx,
                resolved.typeAnnotation,
                resolved._ownerScope,
                isKeyOf,
                typeParams
              );
            }
          }
          return inferRuntimeType(ctx, resolved, resolved._ownerScope, isKeyOf);
        }
        if (node.typeName.type === "Identifier") {
          if (typeParameters && typeParameters[node.typeName.name]) {
            return inferRuntimeType(
              ctx,
              typeParameters[node.typeName.name],
              scope,
              isKeyOf,
              typeParameters
            );
          }
          if (isKeyOf) {
            switch (node.typeName.name) {
              case "String":
              case "Array":
              case "ArrayLike":
              case "Parameters":
              case "ConstructorParameters":
              case "ReadonlyArray":
                return ["String", "Number"];
              // TS built-in utility types
              case "Record":
              case "Partial":
              case "Required":
              case "Readonly":
                if (node.typeParameters && node.typeParameters.params[0]) {
                  return inferRuntimeType(
                    ctx,
                    node.typeParameters.params[0],
                    scope,
                    true
                  );
                }
                break;
              case "Pick":
              case "Extract":
                if (node.typeParameters && node.typeParameters.params[1]) {
                  return inferRuntimeType(
                    ctx,
                    node.typeParameters.params[1],
                    scope
                  );
                }
                break;
              case "Function":
              case "Object":
              case "Set":
              case "Map":
              case "WeakSet":
              case "WeakMap":
              case "Date":
              case "Promise":
              case "Error":
              case "Uppercase":
              case "Lowercase":
              case "Capitalize":
              case "Uncapitalize":
              case "ReadonlyMap":
              case "ReadonlySet":
                return ["String"];
            }
          } else {
            switch (node.typeName.name) {
              case "Array":
              case "Function":
              case "Object":
              case "Set":
              case "Map":
              case "WeakSet":
              case "WeakMap":
              case "Date":
              case "Promise":
              case "Error":
                return [node.typeName.name];
              // TS built-in utility types
              // https://www.typescriptlang.org/docs/handbook/utility-types.html
              case "Partial":
              case "Required":
              case "Readonly":
              case "Record":
              case "Pick":
              case "Omit":
              case "InstanceType":
                return ["Object"];
              case "Uppercase":
              case "Lowercase":
              case "Capitalize":
              case "Uncapitalize":
                return ["String"];
              case "Parameters":
              case "ConstructorParameters":
              case "ReadonlyArray":
                return ["Array"];
              case "ReadonlyMap":
                return ["Map"];
              case "ReadonlySet":
                return ["Set"];
              case "NonNullable":
                if (node.typeParameters && node.typeParameters.params[0]) {
                  return inferRuntimeType(
                    ctx,
                    node.typeParameters.params[0],
                    scope
                  ).filter((t) => t !== "null");
                }
                break;
              case "Extract":
                if (node.typeParameters && node.typeParameters.params[1]) {
                  return inferRuntimeType(
                    ctx,
                    node.typeParameters.params[1],
                    scope
                  );
                }
                break;
              case "Exclude":
              case "OmitThisParameter":
                if (node.typeParameters && node.typeParameters.params[0]) {
                  return inferRuntimeType(
                    ctx,
                    node.typeParameters.params[0],
                    scope
                  );
                }
                break;
            }
          }
        }
        break;
      }
      case "TSParenthesizedType":
        return inferRuntimeType(ctx, node.typeAnnotation, scope);
      case "TSUnionType":
        return flattenTypes(ctx, node.types, scope, isKeyOf, typeParameters);
      case "TSIntersectionType": {
        return flattenTypes(
          ctx,
          node.types,
          scope,
          isKeyOf,
          typeParameters
        ).filter((t) => t !== UNKNOWN_TYPE);
      }
      case "TSMappedType": {
        const { typeAnnotation, typeParameter } = node;
        if (typeAnnotation && typeAnnotation.type === "TSIndexedAccessType" && typeParameter && typeParameter.constraint && typeParameters) {
          const constraint = typeParameter.constraint;
          if (constraint.type === "TSTypeOperator" && constraint.operator === "keyof" && constraint.typeAnnotation && constraint.typeAnnotation.type === "TSTypeReference" && constraint.typeAnnotation.typeName.type === "Identifier") {
            const typeName = constraint.typeAnnotation.typeName.name;
            const index = typeAnnotation.indexType;
            const obj = typeAnnotation.objectType;
            if (obj && obj.type === "TSTypeReference" && obj.typeName.type === "Identifier" && obj.typeName.name === typeName && index && index.type === "TSTypeReference" && index.typeName.type === "Identifier" && index.typeName.name === typeParameter.name) {
              const targetType = typeParameters[typeName];
              if (targetType) {
                return inferRuntimeType(ctx, targetType, scope);
              }
            }
          }
        }
        return [UNKNOWN_TYPE];
      }
      case "TSEnumDeclaration":
        return inferEnumType(node);
      case "TSSymbolKeyword":
        return ["Symbol"];
      case "TSIndexedAccessType": {
        const types = resolveIndexType(ctx, node, scope);
        return flattenTypes(ctx, types, scope, isKeyOf);
      }
      case "ClassDeclaration":
        return ["Object"];
      case "TSImportType": {
        const sourceScope = importSourceToScope(
          ctx,
          node.argument,
          scope,
          node.argument.value
        );
        const resolved = resolveTypeReference(ctx, node, sourceScope);
        if (resolved) {
          return inferRuntimeType(ctx, resolved, resolved._ownerScope);
        }
        break;
      }
      case "TSTypeQuery": {
        const id = node.exprName;
        if (id.type === "Identifier") {
          const matched = scope.declares[id.name];
          if (matched) {
            return inferRuntimeType(ctx, matched, matched._ownerScope, isKeyOf);
          }
        }
        break;
      }
      // e.g. readonly
      case "TSTypeOperator": {
        return inferRuntimeType(
          ctx,
          node.typeAnnotation,
          scope,
          node.operator === "keyof"
        );
      }
      case "TSAnyKeyword": {
        if (isKeyOf) {
          return ["String", "Number", "Symbol"];
        }
        break;
      }
    }
  } catch (e) {
  }
  return [UNKNOWN_TYPE];
}
function flattenTypes(ctx, types, scope, isKeyOf = false, typeParameters = void 0) {
  if (types.length === 1) {
    return inferRuntimeType(ctx, types[0], scope, isKeyOf, typeParameters);
  }
  return [
    ...new Set(
      [].concat(
        ...types.map(
          (t) => inferRuntimeType(ctx, t, scope, isKeyOf, typeParameters)
        )
      )
    )
  ];
}
function inferEnumType(node) {
  const types = /* @__PURE__ */ new Set();
  for (const m of node.members) {
    if (m.initializer) {
      switch (m.initializer.type) {
        case "StringLiteral":
          types.add("String");
          break;
        case "NumericLiteral":
          types.add("Number");
          break;
      }
    }
  }
  return types.size ? [...types] : ["Number"];
}
function resolveExtractPropTypes({ props }, scope) {
  const res = { props: {} };
  for (const key in props) {
    const raw = props[key];
    res.props[key] = reverseInferType(
      raw.key,
      raw.typeAnnotation.typeAnnotation,
      scope
    );
  }
  return res;
}
function reverseInferType(key, node, scope, optional = true, checkObjectSyntax = true) {
  if (checkObjectSyntax && node.type === "TSTypeLiteral") {
    const typeType = findStaticPropertyType(node, "type");
    if (typeType) {
      const requiredType = findStaticPropertyType(node, "required");
      const optional2 = requiredType && requiredType.type === "TSLiteralType" && requiredType.literal.type === "BooleanLiteral" ? !requiredType.literal.value : true;
      return reverseInferType(key, typeType, scope, optional2, false);
    }
  } else if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") {
    if (node.typeName.name.endsWith("Constructor")) {
      return createProperty(
        key,
        ctorToType(node.typeName.name),
        scope,
        optional
      );
    } else if (node.typeName.name === "PropType" && node.typeParameters) {
      return createProperty(key, node.typeParameters.params[0], scope, optional);
    }
  }
  if ((node.type === "TSTypeReference" || node.type === "TSImportType") && node.typeParameters) {
    for (const t of node.typeParameters.params) {
      const inferred = reverseInferType(key, t, scope, optional);
      if (inferred) return inferred;
    }
  }
  return createProperty(key, { type: `TSNullKeyword` }, scope, optional);
}
function ctorToType(ctorType) {
  const ctor = ctorType.slice(0, -11);
  switch (ctor) {
    case "String":
    case "Number":
    case "Boolean":
      return { type: `TS${ctor}Keyword` };
    case "Array":
    case "Function":
    case "Object":
    case "Set":
    case "Map":
    case "WeakSet":
    case "WeakMap":
    case "Date":
    case "Promise":
      return {
        type: "TSTypeReference",
        typeName: { type: "Identifier", name: ctor }
      };
  }
  return { type: `TSNullKeyword` };
}
function findStaticPropertyType(node, key) {
  const prop = node.members.find(
    (m) => m.type === "TSPropertySignature" && getStringLiteralKey(m) === key && m.typeAnnotation
  );
  return prop && prop.typeAnnotation.typeAnnotation;
}
function resolveReturnType(ctx, arg, scope) {
  var _a;
  let resolved = arg;
  if (arg.type === "TSTypeReference" || arg.type === "TSTypeQuery" || arg.type === "TSImportType") {
    resolved = resolveTypeReference(ctx, arg, scope);
  }
  if (!resolved) return;
  if (resolved.type === "TSFunctionType") {
    return (_a = resolved.typeAnnotation) == null ? void 0 : _a.typeAnnotation;
  }
  if (resolved.type === "TSDeclareFunction") {
    return resolved.returnType;
  }
}
function resolveUnionType(ctx, node, scope) {
  if (node.type === "TSTypeReference") {
    const resolved = resolveTypeReference(ctx, node, scope);
    if (resolved) node = resolved;
  }
  let types;
  if (node.type === "TSUnionType") {
    types = node.types.flatMap((node2) => resolveUnionType(ctx, node2, scope));
  } else {
    types = [node];
  }
  return types;
}

const DEFINE_MODEL = "defineModel";
function processDefineModel(ctx, node, declId) {
  if (!isCallOf(node, DEFINE_MODEL)) {
    return false;
  }
  ctx.hasDefineModelCall = true;
  const type = node.typeParameters && node.typeParameters.params[0] || void 0;
  let modelName;
  let options;
  const arg0 = node.arguments[0] && CompilerDOM.unwrapTSNode(node.arguments[0]);
  const hasName = arg0 && arg0.type === "StringLiteral";
  if (hasName) {
    modelName = arg0.value;
    options = node.arguments[1];
  } else {
    modelName = "modelValue";
    options = arg0;
  }
  if (ctx.modelDecls[modelName]) {
    ctx.error(`duplicate model name ${JSON.stringify(modelName)}`, node);
  }
  let optionsString = options && ctx.getString(options);
  let optionsRemoved = !options;
  const runtimeOptionNodes = [];
  if (options && options.type === "ObjectExpression" && !options.properties.some((p) => p.type === "SpreadElement" || p.computed)) {
    let removed = 0;
    for (let i = options.properties.length - 1; i >= 0; i--) {
      const p = options.properties[i];
      const next = options.properties[i + 1];
      const start = p.start;
      const end = next ? next.start : options.end - 1;
      if ((p.type === "ObjectProperty" || p.type === "ObjectMethod") && (p.key.type === "Identifier" && (p.key.name === "get" || p.key.name === "set") || p.key.type === "StringLiteral" && (p.key.value === "get" || p.key.value === "set"))) {
        optionsString = optionsString.slice(0, start - options.start) + optionsString.slice(end - options.start);
      } else {
        removed++;
        ctx.s.remove(ctx.startOffset + start, ctx.startOffset + end);
        runtimeOptionNodes.push(p);
      }
    }
    if (removed === options.properties.length) {
      optionsRemoved = true;
      ctx.s.remove(
        ctx.startOffset + (hasName ? arg0.end : options.start),
        ctx.startOffset + options.end
      );
    }
  }
  ctx.modelDecls[modelName] = {
    type,
    options: optionsString,
    runtimeOptionNodes,
    identifier: declId && declId.type === "Identifier" ? declId.name : void 0
  };
  ctx.bindingMetadata[modelName] = "props";
  ctx.s.overwrite(
    ctx.startOffset + node.callee.start,
    ctx.startOffset + node.callee.end,
    ctx.helper("useModel")
  );
  ctx.s.appendLeft(
    ctx.startOffset + (node.arguments.length ? node.arguments[0].start : node.end - 1),
    `__props, ` + (hasName ? `` : `${JSON.stringify(modelName)}${optionsRemoved ? `` : `, `}`)
  );
  return true;
}
function genModelProps(ctx) {
  if (!ctx.hasDefineModelCall) return;
  const isProd = !!ctx.options.isProd;
  let modelPropsDecl = "";
  for (const [name, { type, options: runtimeOptions }] of Object.entries(
    ctx.modelDecls
  )) {
    let skipCheck = false;
    let codegenOptions = ``;
    let runtimeTypes = type && inferRuntimeType(ctx, type);
    if (runtimeTypes) {
      const hasBoolean = runtimeTypes.includes("Boolean");
      const hasFunction = runtimeTypes.includes("Function");
      const hasUnknownType = runtimeTypes.includes(UNKNOWN_TYPE);
      if (hasUnknownType) {
        if (hasBoolean || hasFunction) {
          runtimeTypes = runtimeTypes.filter((t) => t !== UNKNOWN_TYPE);
          skipCheck = true;
        } else {
          runtimeTypes = ["null"];
        }
      }
      if (!isProd) {
        codegenOptions = `type: ${toRuntimeTypeString(runtimeTypes)}` + (skipCheck ? ", skipCheck: true" : "");
      } else if (hasBoolean || runtimeOptions && hasFunction) {
        codegenOptions = `type: ${toRuntimeTypeString(runtimeTypes)}`;
      } else ;
    }
    let decl;
    if (codegenOptions && runtimeOptions) {
      decl = ctx.isTS ? `{ ${codegenOptions}, ...${runtimeOptions} }` : `Object.assign({ ${codegenOptions} }, ${runtimeOptions})`;
    } else if (codegenOptions) {
      decl = `{ ${codegenOptions} }`;
    } else if (runtimeOptions) {
      decl = runtimeOptions;
    } else {
      decl = `{}`;
    }
    modelPropsDecl += `
    ${JSON.stringify(name)}: ${decl},`;
    const modifierPropName = JSON.stringify(
      name === "modelValue" ? `modelModifiers` : `${name}Modifiers`
    );
    modelPropsDecl += `
    ${modifierPropName}: {},`;
  }
  return `{${modelPropsDecl}
  }`;
}

const DEFINE_PROPS = "defineProps";
const WITH_DEFAULTS = "withDefaults";
function processDefineProps(ctx, node, declId, isWithDefaults = false) {
  if (!isCallOf(node, DEFINE_PROPS)) {
    return processWithDefaults(ctx, node, declId);
  }
  if (ctx.hasDefinePropsCall) {
    ctx.error(`duplicate ${DEFINE_PROPS}() call`, node);
  }
  ctx.hasDefinePropsCall = true;
  ctx.propsRuntimeDecl = node.arguments[0];
  if (ctx.propsRuntimeDecl) {
    for (const key of getObjectOrArrayExpressionKeys(ctx.propsRuntimeDecl)) {
      if (!(key in ctx.bindingMetadata)) {
        ctx.bindingMetadata[key] = "props";
      }
    }
  }
  if (node.typeParameters) {
    if (ctx.propsRuntimeDecl) {
      ctx.error(
        `${DEFINE_PROPS}() cannot accept both type and non-type arguments at the same time. Use one or the other.`,
        node
      );
    }
    ctx.propsTypeDecl = node.typeParameters.params[0];
  }
  if (!isWithDefaults && declId && declId.type === "ObjectPattern") {
    processPropsDestructure(ctx, declId);
  }
  ctx.propsCall = node;
  ctx.propsDecl = declId;
  return true;
}
function processWithDefaults(ctx, node, declId) {
  if (!isCallOf(node, WITH_DEFAULTS)) {
    return false;
  }
  if (!processDefineProps(
    ctx,
    node.arguments[0],
    declId,
    true
  )) {
    ctx.error(
      `${WITH_DEFAULTS}' first argument must be a ${DEFINE_PROPS} call.`,
      node.arguments[0] || node
    );
  }
  if (ctx.propsRuntimeDecl) {
    ctx.error(
      `${WITH_DEFAULTS} can only be used with type-based ${DEFINE_PROPS} declaration.`,
      node
    );
  }
  if (declId && declId.type === "ObjectPattern") {
    ctx.warn(
      `${WITH_DEFAULTS}() is unnecessary when using destructure with ${DEFINE_PROPS}().
Reactive destructure will be disabled when using withDefaults().
Prefer using destructure default values, e.g. const { foo = 1 } = defineProps(...). `,
      node.callee
    );
  }
  ctx.propsRuntimeDefaults = node.arguments[1];
  if (!ctx.propsRuntimeDefaults) {
    ctx.error(`The 2nd argument of ${WITH_DEFAULTS} is required.`, node);
  }
  ctx.propsCall = node;
  return true;
}
function genRuntimeProps(ctx) {
  let propsDecls;
  if (ctx.propsRuntimeDecl) {
    propsDecls = ctx.getString(ctx.propsRuntimeDecl).trim();
    if (ctx.propsDestructureDecl) {
      const defaults = [];
      for (const key in ctx.propsDestructuredBindings) {
        const d = genDestructuredDefaultValue(ctx, key);
        const finalKey = getEscapedPropName(key);
        if (d)
          defaults.push(
            `${finalKey}: ${d.valueString}${d.needSkipFactory ? `, __skip_${finalKey}: true` : ``}`
          );
      }
      if (defaults.length) {
        propsDecls = `/*@__PURE__*/${ctx.helper(
          `mergeDefaults`
        )}(${propsDecls}, {
  ${defaults.join(",\n  ")}
})`;
      }
    }
  } else if (ctx.propsTypeDecl) {
    propsDecls = extractRuntimeProps(ctx);
  }
  const modelsDecls = genModelProps(ctx);
  if (propsDecls && modelsDecls) {
    return `/*@__PURE__*/${ctx.helper(
      "mergeModels"
    )}(${propsDecls}, ${modelsDecls})`;
  } else {
    return modelsDecls || propsDecls;
  }
}
function extractRuntimeProps(ctx) {
  const props = resolveRuntimePropsFromType(ctx, ctx.propsTypeDecl);
  if (!props.length) {
    return;
  }
  const propStrings = [];
  const hasStaticDefaults = hasStaticWithDefaults(ctx);
  for (const prop of props) {
    propStrings.push(genRuntimePropFromType(ctx, prop, hasStaticDefaults));
    if ("bindingMetadata" in ctx && !(prop.key in ctx.bindingMetadata)) {
      ctx.bindingMetadata[prop.key] = "props";
    }
  }
  let propsDecls = `{
    ${propStrings.join(",\n    ")}
  }`;
  if (ctx.propsRuntimeDefaults && !hasStaticDefaults) {
    propsDecls = `/*@__PURE__*/${ctx.helper(
      "mergeDefaults"
    )}(${propsDecls}, ${ctx.getString(ctx.propsRuntimeDefaults)})`;
  }
  return propsDecls;
}
function resolveRuntimePropsFromType(ctx, node) {
  const props = [];
  const elements = resolveTypeElements(ctx, node);
  for (const key in elements.props) {
    const e = elements.props[key];
    let type = inferRuntimeType(ctx, e);
    let skipCheck = false;
    if (type.includes(UNKNOWN_TYPE)) {
      if (type.includes("Boolean") || type.includes("Function")) {
        type = type.filter((t) => t !== UNKNOWN_TYPE);
        skipCheck = true;
      } else {
        type = ["null"];
      }
    }
    props.push({
      key,
      required: !e.optional,
      type: type || [`null`],
      skipCheck
    });
  }
  return props;
}
function genRuntimePropFromType(ctx, { key, required, type, skipCheck }, hasStaticDefaults) {
  let defaultString;
  const destructured = genDestructuredDefaultValue(ctx, key, type);
  if (destructured) {
    defaultString = `default: ${destructured.valueString}${destructured.needSkipFactory ? `, skipFactory: true` : ``}`;
  } else if (hasStaticDefaults) {
    const prop = ctx.propsRuntimeDefaults.properties.find(
      (node) => {
        if (node.type === "SpreadElement") return false;
        return resolveObjectKey(node.key, node.computed) === key;
      }
    );
    if (prop) {
      if (prop.type === "ObjectProperty") {
        defaultString = `default: ${ctx.getString(prop.value)}`;
      } else {
        defaultString = `${prop.async ? "async " : ""}${prop.kind !== "method" ? `${prop.kind} ` : ""}default() ${ctx.getString(prop.body)}`;
      }
    }
  }
  const finalKey = getEscapedPropName(key);
  if (!ctx.options.isProd) {
    return `${finalKey}: { ${concatStrings([
      `type: ${toRuntimeTypeString(type)}`,
      `required: ${required}`,
      skipCheck && "skipCheck: true",
      defaultString
    ])} }`;
  } else if (type.some(
    (el) => el === "Boolean" || (!hasStaticDefaults || defaultString) && el === "Function"
  )) {
    return `${finalKey}: { ${concatStrings([
      `type: ${toRuntimeTypeString(type)}`,
      defaultString
    ])} }`;
  } else {
    if (ctx.isCE) {
      if (defaultString) {
        return `${finalKey}: ${`{ ${defaultString}, type: ${toRuntimeTypeString(
          type
        )} }`}`;
      } else {
        return `${finalKey}: {type: ${toRuntimeTypeString(type)}}`;
      }
    }
    return `${finalKey}: ${defaultString ? `{ ${defaultString} }` : `{}`}`;
  }
}
function hasStaticWithDefaults(ctx) {
  return !!(ctx.propsRuntimeDefaults && ctx.propsRuntimeDefaults.type === "ObjectExpression" && ctx.propsRuntimeDefaults.properties.every(
    (node) => node.type !== "SpreadElement" && (!node.computed || node.key.type.endsWith("Literal"))
  ));
}
function genDestructuredDefaultValue(ctx, key, inferredType) {
  const destructured = ctx.propsDestructuredBindings[key];
  const defaultVal = destructured && destructured.default;
  if (defaultVal) {
    const value = ctx.getString(defaultVal);
    const unwrapped = CompilerDOM.unwrapTSNode(defaultVal);
    if (inferredType && inferredType.length && !inferredType.includes("null")) {
      const valueType = inferValueType(unwrapped);
      if (valueType && !inferredType.includes(valueType)) {
        ctx.error(
          `Default value of prop "${key}" does not match declared type.`,
          unwrapped
        );
      }
    }
    const needSkipFactory = !inferredType && (CompilerDOM.isFunctionType(unwrapped) || unwrapped.type === "Identifier");
    const needFactoryWrap = !needSkipFactory && !isLiteralNode(unwrapped) && !(inferredType == null ? void 0 : inferredType.includes("Function"));
    return {
      valueString: needFactoryWrap ? `() => (${value})` : value,
      needSkipFactory
    };
  }
}
function inferValueType(node) {
  switch (node.type) {
    case "StringLiteral":
      return "String";
    case "NumericLiteral":
      return "Number";
    case "BooleanLiteral":
      return "Boolean";
    case "ObjectExpression":
      return "Object";
    case "ArrayExpression":
      return "Array";
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return "Function";
  }
}

function processPropsDestructure(ctx, declId) {
  if (ctx.options.propsDestructure === "error") {
    ctx.error(`Props destructure is explicitly prohibited via config.`, declId);
  } else if (ctx.options.propsDestructure === false) {
    return;
  }
  ctx.propsDestructureDecl = declId;
  const registerBinding = (key, local, defaultValue) => {
    ctx.propsDestructuredBindings[key] = { local, default: defaultValue };
    if (local !== key) {
      ctx.bindingMetadata[local] = "props-aliased";
      (ctx.bindingMetadata.__propsAliases || (ctx.bindingMetadata.__propsAliases = {}))[local] = key;
    }
  };
  for (const prop of declId.properties) {
    if (prop.type === "ObjectProperty") {
      const propKey = resolveObjectKey(prop.key, prop.computed);
      if (!propKey) {
        ctx.error(
          `${DEFINE_PROPS}() destructure cannot use computed key.`,
          prop.key
        );
      }
      if (prop.value.type === "AssignmentPattern") {
        const { left, right } = prop.value;
        if (left.type !== "Identifier") {
          ctx.error(
            `${DEFINE_PROPS}() destructure does not support nested patterns.`,
            left
          );
        }
        registerBinding(propKey, left.name, right);
      } else if (prop.value.type === "Identifier") {
        registerBinding(propKey, prop.value.name);
      } else {
        ctx.error(
          `${DEFINE_PROPS}() destructure does not support nested patterns.`,
          prop.value
        );
      }
    } else {
      ctx.propsDestructureRestId = prop.argument.name;
      ctx.bindingMetadata[ctx.propsDestructureRestId] = "setup-reactive-const";
    }
  }
}
function transformDestructuredProps(ctx, vueImportAliases) {
  if (ctx.options.propsDestructure === false) {
    return;
  }
  const rootScope = /* @__PURE__ */ Object.create(null);
  const scopeStack = [rootScope];
  let currentScope = rootScope;
  const excludedIds = /* @__PURE__ */ new WeakSet();
  const parentStack = [];
  const propsLocalToPublicMap = /* @__PURE__ */ Object.create(null);
  for (const key in ctx.propsDestructuredBindings) {
    const { local } = ctx.propsDestructuredBindings[key];
    rootScope[local] = true;
    propsLocalToPublicMap[local] = key;
  }
  function pushScope() {
    scopeStack.push(currentScope = Object.create(currentScope));
  }
  function popScope() {
    scopeStack.pop();
    currentScope = scopeStack[scopeStack.length - 1] || null;
  }
  function registerLocalBinding(id) {
    excludedIds.add(id);
    if (currentScope) {
      currentScope[id.name] = false;
    } else {
      ctx.error(
        "registerBinding called without active scope, something is wrong.",
        id
      );
    }
  }
  function walkScope(node, isRoot = false) {
    for (const stmt of node.body) {
      if (stmt.type === "VariableDeclaration") {
        walkVariableDeclaration(stmt, isRoot);
      } else if (stmt.type === "FunctionDeclaration" || stmt.type === "ClassDeclaration") {
        if (stmt.declare || !stmt.id) continue;
        registerLocalBinding(stmt.id);
      } else if ((stmt.type === "ForOfStatement" || stmt.type === "ForInStatement") && stmt.left.type === "VariableDeclaration") {
        walkVariableDeclaration(stmt.left);
      } else if (stmt.type === "ExportNamedDeclaration" && stmt.declaration && stmt.declaration.type === "VariableDeclaration") {
        walkVariableDeclaration(stmt.declaration, isRoot);
      } else if (stmt.type === "LabeledStatement" && stmt.body.type === "VariableDeclaration") {
        walkVariableDeclaration(stmt.body, isRoot);
      }
    }
  }
  function walkVariableDeclaration(stmt, isRoot = false) {
    if (stmt.declare) {
      return;
    }
    for (const decl of stmt.declarations) {
      const isDefineProps = isRoot && decl.init && isCallOf(CompilerDOM.unwrapTSNode(decl.init), "defineProps");
      for (const id of CompilerDOM.extractIdentifiers(decl.id)) {
        if (isDefineProps) {
          excludedIds.add(id);
        } else {
          registerLocalBinding(id);
        }
      }
    }
  }
  function rewriteId(id, parent, parentStack2) {
    if (parent.type === "AssignmentExpression" && id === parent.left || parent.type === "UpdateExpression") {
      ctx.error(`Cannot assign to destructured props as they are readonly.`, id);
    }
    if (CompilerDOM.isStaticProperty(parent) && parent.shorthand) {
      if (!parent.inPattern || CompilerDOM.isInDestructureAssignment(parent, parentStack2)) {
        ctx.s.appendLeft(
          id.end + ctx.startOffset,
          `: ${shared.genPropsAccessExp(propsLocalToPublicMap[id.name])}`
        );
      }
    } else {
      ctx.s.overwrite(
        id.start + ctx.startOffset,
        id.end + ctx.startOffset,
        shared.genPropsAccessExp(propsLocalToPublicMap[id.name])
      );
    }
  }
  function checkUsage(node, method, alias = method) {
    if (isCallOf(node, alias)) {
      const arg = CompilerDOM.unwrapTSNode(node.arguments[0]);
      if (arg.type === "Identifier" && currentScope[arg.name]) {
        ctx.error(
          `"${arg.name}" is a destructured prop and should not be passed directly to ${method}(). Pass a getter () => ${arg.name} instead.`,
          arg
        );
      }
    }
  }
  const ast = ctx.scriptSetupAst;
  walkScope(ast, true);
  estreeWalker.walk(ast, {
    enter(node, parent) {
      parent && parentStack.push(parent);
      if (parent && parent.type.startsWith("TS") && !CompilerDOM.TS_NODE_TYPES.includes(parent.type)) {
        return this.skip();
      }
      checkUsage(node, "watch", vueImportAliases.watch);
      checkUsage(node, "toRef", vueImportAliases.toRef);
      if (CompilerDOM.isFunctionType(node)) {
        pushScope();
        CompilerDOM.walkFunctionParams(node, registerLocalBinding);
        if (node.body.type === "BlockStatement") {
          walkScope(node.body);
        }
        return;
      }
      if (node.type === "CatchClause") {
        pushScope();
        if (node.param && node.param.type === "Identifier") {
          registerLocalBinding(node.param);
        }
        walkScope(node.body);
        return;
      }
      if (node.type === "BlockStatement" && !CompilerDOM.isFunctionType(parent)) {
        pushScope();
        walkScope(node);
        return;
      }
      if (node.type === "Identifier") {
        if (CompilerDOM.isReferencedIdentifier(node, parent, parentStack) && !excludedIds.has(node)) {
          if (currentScope[node.name]) {
            rewriteId(node, parent, parentStack);
          }
        }
      }
    },
    leave(node, parent) {
      parent && parentStack.pop();
      if (node.type === "BlockStatement" && !CompilerDOM.isFunctionType(parent) || CompilerDOM.isFunctionType(node) || node.type === "CatchClause") {
        popScope();
      }
    }
  });
}

const DEFINE_EMITS = "defineEmits";
function processDefineEmits(ctx, node, declId) {
  if (!isCallOf(node, DEFINE_EMITS)) {
    return false;
  }
  if (ctx.hasDefineEmitCall) {
    ctx.error(`duplicate ${DEFINE_EMITS}() call`, node);
  }
  ctx.hasDefineEmitCall = true;
  ctx.emitsRuntimeDecl = node.arguments[0];
  if (node.typeParameters) {
    if (ctx.emitsRuntimeDecl) {
      ctx.error(
        `${DEFINE_EMITS}() cannot accept both type and non-type arguments at the same time. Use one or the other.`,
        node
      );
    }
    ctx.emitsTypeDecl = node.typeParameters.params[0];
  }
  ctx.emitDecl = declId;
  return true;
}
function genRuntimeEmits(ctx) {
  let emitsDecl = "";
  if (ctx.emitsRuntimeDecl) {
    emitsDecl = ctx.getString(ctx.emitsRuntimeDecl).trim();
  } else if (ctx.emitsTypeDecl) {
    const typeDeclaredEmits = extractRuntimeEmits(ctx);
    emitsDecl = typeDeclaredEmits.size ? `[${Array.from(typeDeclaredEmits).map((k) => JSON.stringify(k)).join(", ")}]` : ``;
  }
  if (ctx.hasDefineModelCall) {
    let modelEmitsDecl = `[${Object.keys(ctx.modelDecls).map((n) => JSON.stringify(`update:${n}`)).join(", ")}]`;
    emitsDecl = emitsDecl ? `/*@__PURE__*/${ctx.helper(
      "mergeModels"
    )}(${emitsDecl}, ${modelEmitsDecl})` : modelEmitsDecl;
  }
  return emitsDecl;
}
function extractRuntimeEmits(ctx) {
  const emits = /* @__PURE__ */ new Set();
  const node = ctx.emitsTypeDecl;
  if (node.type === "TSFunctionType") {
    extractEventNames(ctx, node.parameters[0], emits);
    return emits;
  }
  const { props, calls } = resolveTypeElements(ctx, node);
  let hasProperty = false;
  for (const key in props) {
    emits.add(key);
    hasProperty = true;
  }
  if (calls) {
    if (hasProperty) {
      ctx.error(
        `defineEmits() type cannot mixed call signature and property syntax.`,
        node
      );
    }
    for (const call of calls) {
      extractEventNames(ctx, call.parameters[0], emits);
    }
  }
  return emits;
}
function extractEventNames(ctx, eventName, emits) {
  if (eventName.type === "Identifier" && eventName.typeAnnotation && eventName.typeAnnotation.type === "TSTypeAnnotation") {
    const types = resolveUnionType(ctx, eventName.typeAnnotation.typeAnnotation);
    for (const type of types) {
      if (type.type === "TSLiteralType") {
        if (type.literal.type !== "UnaryExpression" && type.literal.type !== "TemplateLiteral") {
          emits.add(String(type.literal.value));
        }
      }
    }
  }
}

const DEFINE_EXPOSE = "defineExpose";
function processDefineExpose(ctx, node) {
  if (isCallOf(node, DEFINE_EXPOSE)) {
    if (ctx.hasDefineExposeCall) {
      ctx.error(`duplicate ${DEFINE_EXPOSE}() call`, node);
    }
    ctx.hasDefineExposeCall = true;
    return true;
  }
  return false;
}

const DEFINE_SLOTS = "defineSlots";
function processDefineSlots(ctx, node, declId) {
  if (!isCallOf(node, DEFINE_SLOTS)) {
    return false;
  }
  if (ctx.hasDefineSlotsCall) {
    ctx.error(`duplicate ${DEFINE_SLOTS}() call`, node);
  }
  ctx.hasDefineSlotsCall = true;
  if (node.arguments.length > 0) {
    ctx.error(`${DEFINE_SLOTS}() cannot accept arguments`, node);
  }
  if (declId) {
    ctx.s.overwrite(
      ctx.startOffset + node.start,
      ctx.startOffset + node.end,
      `${ctx.helper("useSlots")}()`
    );
  }
  return true;
}

const DEFINE_OPTIONS = "defineOptions";
function processDefineOptions(ctx, node) {
  if (!isCallOf(node, DEFINE_OPTIONS)) {
    return false;
  }
  if (ctx.hasDefineOptionsCall) {
    ctx.error(`duplicate ${DEFINE_OPTIONS}() call`, node);
  }
  if (node.typeParameters) {
    ctx.error(`${DEFINE_OPTIONS}() cannot accept type arguments`, node);
  }
  if (!node.arguments[0]) return true;
  ctx.hasDefineOptionsCall = true;
  ctx.optionsRuntimeDecl = CompilerDOM.unwrapTSNode(node.arguments[0]);
  let propsOption = void 0;
  let emitsOption = void 0;
  let exposeOption = void 0;
  let slotsOption = void 0;
  if (ctx.optionsRuntimeDecl.type === "ObjectExpression") {
    for (const prop of ctx.optionsRuntimeDecl.properties) {
      if ((prop.type === "ObjectProperty" || prop.type === "ObjectMethod") && prop.key.type === "Identifier") {
        switch (prop.key.name) {
          case "props":
            propsOption = prop;
            break;
          case "emits":
            emitsOption = prop;
            break;
          case "expose":
            exposeOption = prop;
            break;
          case "slots":
            slotsOption = prop;
            break;
        }
      }
    }
  }
  if (propsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare props. Use ${DEFINE_PROPS}() instead.`,
      propsOption
    );
  }
  if (emitsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare emits. Use ${DEFINE_EMITS}() instead.`,
      emitsOption
    );
  }
  if (exposeOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare expose. Use ${DEFINE_EXPOSE}() instead.`,
      exposeOption
    );
  }
  if (slotsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare slots. Use ${DEFINE_SLOTS}() instead.`,
      slotsOption
    );
  }
  return true;
}

function processAwait(ctx, node, needSemi, isStatement) {
  const argumentStart = node.argument.extra && node.argument.extra.parenthesized ? node.argument.extra.parenStart : node.argument.start;
  const startOffset = ctx.startOffset;
  const argumentStr = ctx.descriptor.source.slice(
    argumentStart + startOffset,
    node.argument.end + startOffset
  );
  const containsNestedAwait = /\bawait\b/.test(argumentStr);
  ctx.s.overwrite(
    node.start + startOffset,
    argumentStart + startOffset,
    `${needSemi ? `;` : ``}(
  ([__temp,__restore] = ${ctx.helper(
      `withAsyncContext`
    )}(${containsNestedAwait ? `async ` : ``}() => `
  );
  ctx.s.appendLeft(
    node.end + startOffset,
    `)),
  ${isStatement ? `` : `__temp = `}await __temp,
  __restore()${isStatement ? `` : `,
  __temp`}
)`
  );
}

const MACROS = [
  DEFINE_PROPS,
  DEFINE_EMITS,
  DEFINE_EXPOSE,
  DEFINE_OPTIONS,
  DEFINE_SLOTS,
  DEFINE_MODEL,
  WITH_DEFAULTS
];
function compileScript(sfc, options) {
  var _a, _b, _c;
  if (!options.id) {
    warnOnce(
      `compileScript now requires passing the \`id\` option.
Upgrade your vite or vue-loader version for compatibility with the latest experimental proposals.`
    );
  }
  const { script, scriptSetup, source, filename } = sfc;
  const hoistStatic = options.hoistStatic !== false && !script;
  const scopeId = options.id ? options.id.replace(/^data-v-/, "") : "";
  const scriptLang = script && script.lang;
  const scriptSetupLang = scriptSetup && scriptSetup.lang;
  const isJSOrTS = isJS(scriptLang, scriptSetupLang) || isTS(scriptLang, scriptSetupLang);
  if (script && scriptSetup && scriptLang !== scriptSetupLang) {
    throw new Error(
      `[@vue/compiler-sfc] <script> and <script setup> must have the same language type.`
    );
  }
  if (!scriptSetup) {
    if (!script) {
      throw new Error(`[@vue/compiler-sfc] SFC contains no <script> tags.`);
    }
    if (script.lang && !isJSOrTS) {
      return script;
    }
    const ctx2 = new ScriptCompileContext(sfc, options);
    return processNormalScript(ctx2, scopeId);
  }
  if (scriptSetupLang && !isJSOrTS) {
    return scriptSetup;
  }
  const ctx = new ScriptCompileContext(sfc, options);
  const scriptBindings = /* @__PURE__ */ Object.create(null);
  const setupBindings = /* @__PURE__ */ Object.create(null);
  let defaultExport;
  let hasAwait = false;
  let hasInlinedSsrRenderFn = false;
  const startOffset = ctx.startOffset;
  const endOffset = ctx.endOffset;
  const scriptStartOffset = script && script.loc.start.offset;
  const scriptEndOffset = script && script.loc.end.offset;
  function hoistNode(node) {
    const start = node.start + startOffset;
    let end = node.end + startOffset;
    if (node.trailingComments && node.trailingComments.length > 0) {
      const lastCommentNode = node.trailingComments[node.trailingComments.length - 1];
      end = lastCommentNode.end + startOffset;
    }
    while (end <= source.length) {
      if (!/\s/.test(source.charAt(end))) {
        break;
      }
      end++;
    }
    ctx.s.move(start, end, 0);
  }
  function registerUserImport(source2, local, imported, isType, isFromSetup, needTemplateUsageCheck) {
    let isUsedInTemplate = needTemplateUsageCheck;
    if (needTemplateUsageCheck && ctx.isTS && sfc.template && !sfc.template.src && !sfc.template.lang) {
      isUsedInTemplate = isImportUsed(local, sfc);
    }
    ctx.userImports[local] = {
      isType,
      imported,
      local,
      source: source2,
      isFromSetup,
      isUsedInTemplate
    };
  }
  function checkInvalidScopeReference(node, method) {
    if (!node) return;
    CompilerDOM.walkIdentifiers(node, (id) => {
      const binding = setupBindings[id.name];
      if (binding && binding !== "literal-const") {
        ctx.error(
          `\`${method}()\` in <script setup> cannot reference locally declared variables because it will be hoisted outside of the setup() function. If your component options require initialization in the module scope, use a separate normal <script> to export the options instead.`,
          id
        );
      }
    });
  }
  const scriptAst = ctx.scriptAst;
  const scriptSetupAst = ctx.scriptSetupAst;
  if (scriptAst) {
    for (const node of scriptAst.body) {
      if (node.type === "ImportDeclaration") {
        for (const specifier of node.specifiers) {
          const imported = getImportedName(specifier);
          registerUserImport(
            node.source.value,
            specifier.local.name,
            imported,
            node.importKind === "type" || specifier.type === "ImportSpecifier" && specifier.importKind === "type",
            false,
            !options.inlineTemplate
          );
        }
      }
    }
  }
  for (const node of scriptSetupAst.body) {
    if (node.type === "ImportDeclaration") {
      hoistNode(node);
      let removed = 0;
      const removeSpecifier = (i) => {
        const removeLeft = i > removed;
        removed++;
        const current = node.specifiers[i];
        const next = node.specifiers[i + 1];
        ctx.s.remove(
          removeLeft ? node.specifiers[i - 1].end + startOffset : current.start + startOffset,
          next && !removeLeft ? next.start + startOffset : current.end + startOffset
        );
      };
      for (let i = 0; i < node.specifiers.length; i++) {
        const specifier = node.specifiers[i];
        const local = specifier.local.name;
        const imported = getImportedName(specifier);
        const source2 = node.source.value;
        const existing = ctx.userImports[local];
        if (source2 === "vue" && MACROS.includes(imported)) {
          if (local === imported) {
            warnOnce(
              `\`${imported}\` is a compiler macro and no longer needs to be imported.`
            );
          } else {
            ctx.error(
              `\`${imported}\` is a compiler macro and cannot be aliased to a different name.`,
              specifier
            );
          }
          removeSpecifier(i);
        } else if (existing) {
          if (existing.source === source2 && existing.imported === imported) {
            removeSpecifier(i);
          } else {
            ctx.error(
              `different imports aliased to same local name.`,
              specifier
            );
          }
        } else {
          registerUserImport(
            source2,
            local,
            imported,
            node.importKind === "type" || specifier.type === "ImportSpecifier" && specifier.importKind === "type",
            true,
            !options.inlineTemplate
          );
        }
      }
      if (node.specifiers.length && removed === node.specifiers.length) {
        ctx.s.remove(node.start + startOffset, node.end + startOffset);
      }
    }
  }
  const vueImportAliases = {};
  for (const key in ctx.userImports) {
    const { source: source2, imported, local } = ctx.userImports[key];
    if (source2 === "vue") vueImportAliases[imported] = local;
  }
  if (script && scriptAst) {
    for (const node of scriptAst.body) {
      if (node.type === "ExportDefaultDeclaration") {
        defaultExport = node;
        let optionProperties;
        if (defaultExport.declaration.type === "ObjectExpression") {
          optionProperties = defaultExport.declaration.properties;
        } else if (defaultExport.declaration.type === "CallExpression" && defaultExport.declaration.arguments[0] && defaultExport.declaration.arguments[0].type === "ObjectExpression") {
          optionProperties = defaultExport.declaration.arguments[0].properties;
        }
        if (optionProperties) {
          for (const p of optionProperties) {
            if (p.type === "ObjectProperty" && p.key.type === "Identifier" && p.key.name === "name") {
              ctx.hasDefaultExportName = true;
            }
            if ((p.type === "ObjectMethod" || p.type === "ObjectProperty") && p.key.type === "Identifier" && p.key.name === "render") {
              ctx.hasDefaultExportRender = true;
            }
          }
        }
        const start = node.start + scriptStartOffset;
        const end = node.declaration.start + scriptStartOffset;
        ctx.s.overwrite(start, end, `const ${normalScriptDefaultVar} = `);
      } else if (node.type === "ExportNamedDeclaration") {
        const defaultSpecifier = node.specifiers.find(
          (s) => s.exported.type === "Identifier" && s.exported.name === "default"
        );
        if (defaultSpecifier) {
          defaultExport = node;
          if (node.specifiers.length > 1) {
            ctx.s.remove(
              defaultSpecifier.start + scriptStartOffset,
              defaultSpecifier.end + scriptStartOffset
            );
          } else {
            ctx.s.remove(
              node.start + scriptStartOffset,
              node.end + scriptStartOffset
            );
          }
          if (node.source) {
            ctx.s.prepend(
              `import { ${defaultSpecifier.local.name} as ${normalScriptDefaultVar} } from '${node.source.value}'
`
            );
          } else {
            ctx.s.appendLeft(
              scriptEndOffset,
              `
const ${normalScriptDefaultVar} = ${defaultSpecifier.local.name}
`
            );
          }
        }
        if (node.declaration) {
          walkDeclaration(
            "script",
            node.declaration,
            scriptBindings,
            vueImportAliases,
            hoistStatic
          );
        }
      } else if ((node.type === "VariableDeclaration" || node.type === "FunctionDeclaration" || node.type === "ClassDeclaration" || node.type === "TSEnumDeclaration") && !node.declare) {
        walkDeclaration(
          "script",
          node,
          scriptBindings,
          vueImportAliases,
          hoistStatic
        );
      }
    }
    if (scriptStartOffset > startOffset) {
      if (!/\n$/.test(script.content.trim())) {
        ctx.s.appendLeft(scriptEndOffset, `
`);
      }
      ctx.s.move(scriptStartOffset, scriptEndOffset, 0);
    }
  }
  for (const node of scriptSetupAst.body) {
    if (node.type === "ExpressionStatement") {
      const expr = CompilerDOM.unwrapTSNode(node.expression);
      if (processDefineProps(ctx, expr) || processDefineEmits(ctx, expr) || processDefineOptions(ctx, expr) || processDefineSlots(ctx, expr)) {
        ctx.s.remove(node.start + startOffset, node.end + startOffset);
      } else if (processDefineExpose(ctx, expr)) {
        const callee = expr.callee;
        ctx.s.overwrite(
          callee.start + startOffset,
          callee.end + startOffset,
          "__expose"
        );
      } else {
        processDefineModel(ctx, expr);
      }
    }
    if (node.type === "VariableDeclaration" && !node.declare) {
      const total = node.declarations.length;
      let left = total;
      let lastNonRemoved;
      for (let i = 0; i < total; i++) {
        const decl = node.declarations[i];
        const init = decl.init && CompilerDOM.unwrapTSNode(decl.init);
        if (init) {
          if (processDefineOptions(ctx, init)) {
            ctx.error(
              `${DEFINE_OPTIONS}() has no returning value, it cannot be assigned.`,
              node
            );
          }
          const isDefineProps = processDefineProps(ctx, init, decl.id);
          if (ctx.propsDestructureRestId) {
            setupBindings[ctx.propsDestructureRestId] = "setup-reactive-const";
          }
          const isDefineEmits = !isDefineProps && processDefineEmits(ctx, init, decl.id);
          !isDefineEmits && (processDefineSlots(ctx, init, decl.id) || processDefineModel(ctx, init, decl.id));
          if (isDefineProps && !ctx.propsDestructureRestId && ctx.propsDestructureDecl) {
            if (left === 1) {
              ctx.s.remove(node.start + startOffset, node.end + startOffset);
            } else {
              let start = decl.start + startOffset;
              let end = decl.end + startOffset;
              if (i === total - 1) {
                start = node.declarations[lastNonRemoved].end + startOffset;
              } else {
                end = node.declarations[i + 1].start + startOffset;
              }
              ctx.s.remove(start, end);
              left--;
            }
          } else if (isDefineEmits) {
            ctx.s.overwrite(
              startOffset + init.start,
              startOffset + init.end,
              "__emit"
            );
          } else {
            lastNonRemoved = i;
          }
        }
      }
    }
    let isAllLiteral = false;
    if ((node.type === "VariableDeclaration" || node.type === "FunctionDeclaration" || node.type === "ClassDeclaration" || node.type === "TSEnumDeclaration") && !node.declare) {
      isAllLiteral = walkDeclaration(
        "scriptSetup",
        node,
        setupBindings,
        vueImportAliases,
        hoistStatic,
        !!ctx.propsDestructureDecl
      );
    }
    if (hoistStatic && isAllLiteral) {
      hoistNode(node);
    }
    if (node.type === "VariableDeclaration" && !node.declare || node.type.endsWith("Statement")) {
      const scope = [scriptSetupAst.body];
      estreeWalker.walk(node, {
        enter(child, parent) {
          if (CompilerDOM.isFunctionType(child)) {
            this.skip();
          }
          if (child.type === "BlockStatement") {
            scope.push(child.body);
          }
          if (child.type === "AwaitExpression") {
            hasAwait = true;
            const currentScope = scope[scope.length - 1];
            const needsSemi = currentScope.some((n, i) => {
              return (scope.length === 1 || i > 0) && n.type === "ExpressionStatement" && n.start === child.start;
            });
            processAwait(
              ctx,
              child,
              needsSemi,
              parent.type === "ExpressionStatement"
            );
          }
        },
        exit(node2) {
          if (node2.type === "BlockStatement") scope.pop();
        }
      });
    }
    if (node.type === "ExportNamedDeclaration" && node.exportKind !== "type" || node.type === "ExportAllDeclaration" || node.type === "ExportDefaultDeclaration") {
      ctx.error(
        `<script setup> cannot contain ES module exports. If you are using a previous version of <script setup>, please consult the updated RFC at https://github.com/vuejs/rfcs/pull/227.`,
        node
      );
    }
    if (ctx.isTS) {
      if (node.type.startsWith("TS") || node.type === "ExportNamedDeclaration" && node.exportKind === "type" || node.type === "VariableDeclaration" && node.declare) {
        if (node.type !== "TSEnumDeclaration") {
          hoistNode(node);
        }
      }
    }
  }
  if (ctx.propsDestructureDecl) {
    transformDestructuredProps(ctx, vueImportAliases);
  }
  checkInvalidScopeReference(ctx.propsRuntimeDecl, DEFINE_PROPS);
  checkInvalidScopeReference(ctx.propsRuntimeDefaults, DEFINE_PROPS);
  checkInvalidScopeReference(ctx.propsDestructureDecl, DEFINE_PROPS);
  checkInvalidScopeReference(ctx.emitsRuntimeDecl, DEFINE_EMITS);
  checkInvalidScopeReference(ctx.optionsRuntimeDecl, DEFINE_OPTIONS);
  for (const { runtimeOptionNodes } of Object.values(ctx.modelDecls)) {
    for (const node of runtimeOptionNodes) {
      checkInvalidScopeReference(node, DEFINE_MODEL);
    }
  }
  if (script) {
    if (startOffset < scriptStartOffset) {
      ctx.s.remove(0, startOffset);
      ctx.s.remove(endOffset, scriptStartOffset);
      ctx.s.remove(scriptEndOffset, source.length);
    } else {
      ctx.s.remove(0, scriptStartOffset);
      ctx.s.remove(scriptEndOffset, startOffset);
      ctx.s.remove(endOffset, source.length);
    }
  } else {
    ctx.s.remove(0, startOffset);
    ctx.s.remove(endOffset, source.length);
  }
  if (scriptAst) {
    Object.assign(ctx.bindingMetadata, analyzeScriptBindings(scriptAst.body));
  }
  for (const [key, { isType, imported, source: source2 }] of Object.entries(
    ctx.userImports
  )) {
    if (isType) continue;
    ctx.bindingMetadata[key] = imported === "*" || imported === "default" && source2.endsWith(".vue") || source2 === "vue" ? "setup-const" : "setup-maybe-ref";
  }
  for (const key in scriptBindings) {
    ctx.bindingMetadata[key] = scriptBindings[key];
  }
  for (const key in setupBindings) {
    ctx.bindingMetadata[key] = setupBindings[key];
  }
  if (sfc.template && !sfc.template.src && sfc.template.ast) {
    const vModelIds = resolveTemplateVModelIdentifiers(sfc);
    if (vModelIds.size) {
      const toDemote = /* @__PURE__ */ new Set();
      for (const id of vModelIds) {
        if (setupBindings[id] === "setup-reactive-const") {
          toDemote.add(id);
        }
      }
      if (toDemote.size) {
        for (const node of scriptSetupAst.body) {
          if (node.type === "VariableDeclaration" && node.kind === "const" && !node.declare) {
            const demotedInDecl = [];
            for (const decl of node.declarations) {
              if (decl.id.type === "Identifier" && toDemote.has(decl.id.name)) {
                demotedInDecl.push(decl.id.name);
              }
            }
            if (demotedInDecl.length) {
              ctx.s.overwrite(
                node.start + startOffset,
                node.start + startOffset + "const".length,
                "let"
              );
              for (const id of demotedInDecl) {
                setupBindings[id] = "setup-let";
                ctx.bindingMetadata[id] = "setup-let";
                warnOnce(
                  `\`v-model\` cannot update a \`const\` reactive binding \`${id}\`. The compiler has transformed it to \`let\` to make the update work.`
                );
              }
            }
          }
        }
      }
    }
  }
  if (sfc.cssVars.length && // no need to do this when targeting SSR
  !((_a = options.templateOptions) == null ? void 0 : _a.ssr)) {
    ctx.helperImports.add(CSS_VARS_HELPER);
    ctx.helperImports.add("unref");
    ctx.s.prependLeft(
      startOffset,
      `
${genCssVarsCode(
        sfc.cssVars,
        ctx.bindingMetadata,
        scopeId,
        !!options.isProd
      )}
`
    );
  }
  let args = `__props`;
  if (ctx.propsTypeDecl) {
    args += `: any`;
  }
  if (ctx.propsDecl) {
    if (ctx.propsDestructureRestId) {
      ctx.s.overwrite(
        startOffset + ctx.propsCall.start,
        startOffset + ctx.propsCall.end,
        `${ctx.helper(`createPropsRestProxy`)}(__props, ${JSON.stringify(
          Object.keys(ctx.propsDestructuredBindings)
        )})`
      );
      ctx.s.overwrite(
        startOffset + ctx.propsDestructureDecl.start,
        startOffset + ctx.propsDestructureDecl.end,
        ctx.propsDestructureRestId
      );
    } else if (!ctx.propsDestructureDecl) {
      ctx.s.overwrite(
        startOffset + ctx.propsCall.start,
        startOffset + ctx.propsCall.end,
        "__props"
      );
    }
  }
  if (hasAwait) {
    const any = ctx.isTS ? `: any` : ``;
    ctx.s.prependLeft(startOffset, `
let __temp${any}, __restore${any}
`);
  }
  const destructureElements = ctx.hasDefineExposeCall || !options.inlineTemplate ? [`expose: __expose`] : [];
  if (ctx.emitDecl) {
    destructureElements.push(`emit: __emit`);
  }
  if (destructureElements.length) {
    args += `, { ${destructureElements.join(", ")} }`;
  }
  let templateMap;
  let returned;
  const propsDecl = genRuntimeProps(ctx);
  if (!options.inlineTemplate || !sfc.template && ctx.hasDefaultExportRender) {
    const allBindings = {
      ...scriptBindings,
      ...setupBindings
    };
    for (const key in ctx.userImports) {
      if (!ctx.userImports[key].isType && ctx.userImports[key].isUsedInTemplate) {
        allBindings[key] = true;
      }
    }
    returned = `{ `;
    for (const key in allBindings) {
      if (allBindings[key] === true && ctx.userImports[key].source !== "vue" && !ctx.userImports[key].source.endsWith(".vue")) {
        returned += `get ${key}() { return ${key} }, `;
      } else if (ctx.bindingMetadata[key] === "setup-let") {
        const setArg = key === "v" ? `_v` : `v`;
        returned += `get ${key}() { return ${key} }, set ${key}(${setArg}) { ${key} = ${setArg} }, `;
      } else {
        returned += `${key}, `;
      }
    }
    returned = returned.replace(/, $/, "") + ` }`;
  } else {
    if (sfc.template && !sfc.template.src) {
      if (options.templateOptions && options.templateOptions.ssr) {
        hasInlinedSsrRenderFn = true;
      }
      const { code, ast, preamble, tips, errors, map: map2 } = compileTemplate({
        filename,
        ast: sfc.template.ast,
        source: sfc.template.content,
        inMap: sfc.template.map,
        ...options.templateOptions,
        id: scopeId,
        scoped: sfc.styles.some((s) => s.scoped),
        isProd: options.isProd,
        ssrCssVars: sfc.cssVars,
        compilerOptions: {
          ...options.templateOptions && options.templateOptions.compilerOptions,
          inline: true,
          isTS: ctx.isTS,
          bindingMetadata: ctx.bindingMetadata
        }
      });
      templateMap = map2;
      if (tips.length) {
        tips.forEach(warnOnce);
      }
      const err = errors[0];
      if (typeof err === "string") {
        throw new Error(err);
      } else if (err) {
        if (err.loc) {
          err.message += `

` + sfc.filename + "\n" + shared.generateCodeFrame(
            source,
            err.loc.start.offset,
            err.loc.end.offset
          ) + `
`;
        }
        throw err;
      }
      if (preamble) {
        ctx.s.prepend(preamble);
      }
      if (ast && ast.helpers.has(CompilerDOM.UNREF)) {
        ctx.helperImports.delete("unref");
      }
      returned = code;
    } else {
      returned = `() => {}`;
    }
  }
  if (!options.inlineTemplate && true) {
    ctx.s.appendRight(
      endOffset,
      `
const __returned__ = ${returned}
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

`
    );
  } else {
    ctx.s.appendRight(endOffset, `
return ${returned}
}

`);
  }
  const genDefaultAs = options.genDefaultAs ? `const ${options.genDefaultAs} =` : `export default`;
  let runtimeOptions = ``;
  if (!ctx.hasDefaultExportName && filename && filename !== DEFAULT_FILENAME) {
    const match = filename.match(/([^/\\]+)\.\w+$/);
    if (match) {
      runtimeOptions += `
  __name: '${match[1]}',`;
    }
  }
  if (hasInlinedSsrRenderFn) {
    runtimeOptions += `
  __ssrInlineRender: true,`;
  }
  if (propsDecl) runtimeOptions += `
  props: ${propsDecl},`;
  const emitsDecl = genRuntimeEmits(ctx);
  if (emitsDecl) runtimeOptions += `
  emits: ${emitsDecl},`;
  let definedOptions = "";
  if (ctx.optionsRuntimeDecl) {
    definedOptions = scriptSetup.content.slice(ctx.optionsRuntimeDecl.start, ctx.optionsRuntimeDecl.end).trim();
  }
  const exposeCall = ctx.hasDefineExposeCall || options.inlineTemplate ? `` : `  __expose();
`;
  if (ctx.isTS) {
    const def = (defaultExport ? `
  ...${normalScriptDefaultVar},` : ``) + (definedOptions ? `
  ...${definedOptions},` : "");
    ctx.s.prependLeft(
      startOffset,
      `
${genDefaultAs} /*@__PURE__*/${ctx.helper(
        `defineComponent`
      )}({${def}${runtimeOptions}
  ${hasAwait ? `async ` : ``}setup(${args}) {
${exposeCall}`
    );
    ctx.s.appendRight(endOffset, `})`);
  } else {
    if (defaultExport || definedOptions) {
      ctx.s.prependLeft(
        startOffset,
        `
${genDefaultAs} /*@__PURE__*/Object.assign(${defaultExport ? `${normalScriptDefaultVar}, ` : ""}${definedOptions ? `${definedOptions}, ` : ""}{${runtimeOptions}
  ${hasAwait ? `async ` : ``}setup(${args}) {
${exposeCall}`
      );
      ctx.s.appendRight(endOffset, `})`);
    } else {
      ctx.s.prependLeft(
        startOffset,
        `
${genDefaultAs} {${runtimeOptions}
  ${hasAwait ? `async ` : ``}setup(${args}) {
${exposeCall}`
      );
      ctx.s.appendRight(endOffset, `}`);
    }
  }
  if (ctx.helperImports.size > 0) {
    const runtimeModuleName = (_c = (_b = options.templateOptions) == null ? void 0 : _b.compilerOptions) == null ? void 0 : _c.runtimeModuleName;
    const importSrc = runtimeModuleName ? JSON.stringify(runtimeModuleName) : `'vue'`;
    ctx.s.prepend(
      `import { ${[...ctx.helperImports].map((h) => `${h} as _${h}`).join(", ")} } from ${importSrc}
`
    );
  }
  const content = ctx.s.toString();
  let map = options.sourceMap !== false ? ctx.s.generateMap({
    source: filename,
    hires: true,
    includeContent: true
  }) : void 0;
  if (templateMap && map) {
    const offset = content.indexOf(returned);
    const templateLineOffset = content.slice(0, offset).split(/\r?\n/).length - 1;
    map = mergeSourceMaps(map, templateMap, templateLineOffset);
  }
  return {
    ...scriptSetup,
    bindings: ctx.bindingMetadata,
    imports: ctx.userImports,
    content,
    map,
    scriptAst: scriptAst == null ? void 0 : scriptAst.body,
    scriptSetupAst: scriptSetupAst == null ? void 0 : scriptSetupAst.body,
    deps: ctx.deps ? [...ctx.deps] : void 0
  };
}
function registerBinding(bindings, node, type) {
  bindings[node.name] = type;
}
function walkDeclaration(from, node, bindings, userImportAliases, hoistStatic, isPropsDestructureEnabled = false) {
  let isAllLiteral = false;
  if (node.type === "VariableDeclaration") {
    const isConst = node.kind === "const";
    isAllLiteral = isConst && node.declarations.every(
      (decl) => decl.id.type === "Identifier" && isStaticNode(decl.init)
    );
    for (const { id, init: _init } of node.declarations) {
      const init = _init && CompilerDOM.unwrapTSNode(_init);
      const isConstMacroCall = isConst && isCallOf(
        init,
        (c) => c === DEFINE_PROPS || c === DEFINE_EMITS || c === WITH_DEFAULTS || c === DEFINE_SLOTS
      );
      if (id.type === "Identifier") {
        let bindingType;
        const userReactiveBinding = userImportAliases["reactive"];
        if ((hoistStatic || from === "script") && (isAllLiteral || isConst && isStaticNode(init))) {
          bindingType = "literal-const";
        } else if (isCallOf(init, userReactiveBinding)) {
          bindingType = isConst ? "setup-reactive-const" : "setup-let";
        } else if (
          // if a declaration is a const literal, we can mark it so that
          // the generated render fn code doesn't need to unref() it
          isConstMacroCall || isConst && canNeverBeRef(init, userReactiveBinding)
        ) {
          bindingType = isCallOf(init, DEFINE_PROPS) ? "setup-reactive-const" : "setup-const";
        } else if (isConst) {
          if (isCallOf(
            init,
            (m) => m === userImportAliases["ref"] || m === userImportAliases["computed"] || m === userImportAliases["shallowRef"] || m === userImportAliases["customRef"] || m === userImportAliases["toRef"] || m === userImportAliases["useTemplateRef"] || m === DEFINE_MODEL
          )) {
            bindingType = "setup-ref";
          } else {
            bindingType = "setup-maybe-ref";
          }
        } else {
          bindingType = "setup-let";
        }
        registerBinding(bindings, id, bindingType);
      } else {
        if (isCallOf(init, DEFINE_PROPS) && isPropsDestructureEnabled) {
          continue;
        }
        if (id.type === "ObjectPattern") {
          walkObjectPattern(id, bindings, isConst, isConstMacroCall);
        } else if (id.type === "ArrayPattern") {
          walkArrayPattern(id, bindings, isConst, isConstMacroCall);
        }
      }
    }
  } else if (node.type === "TSEnumDeclaration") {
    isAllLiteral = node.members.every(
      (member) => !member.initializer || isStaticNode(member.initializer)
    );
    bindings[node.id.name] = isAllLiteral ? "literal-const" : "setup-const";
  } else if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
    bindings[node.id.name] = "setup-const";
  }
  return isAllLiteral;
}
function walkObjectPattern(node, bindings, isConst, isDefineCall = false) {
  for (const p of node.properties) {
    if (p.type === "ObjectProperty") {
      if (p.key.type === "Identifier" && p.key === p.value) {
        const type = isDefineCall ? "setup-const" : isConst ? "setup-maybe-ref" : "setup-let";
        registerBinding(bindings, p.key, type);
      } else {
        walkPattern(p.value, bindings, isConst, isDefineCall);
      }
    } else {
      const type = isConst ? "setup-const" : "setup-let";
      registerBinding(bindings, p.argument, type);
    }
  }
}
function walkArrayPattern(node, bindings, isConst, isDefineCall = false) {
  for (const e of node.elements) {
    e && walkPattern(e, bindings, isConst, isDefineCall);
  }
}
function walkPattern(node, bindings, isConst, isDefineCall = false) {
  if (node.type === "Identifier") {
    const type = isDefineCall ? "setup-const" : isConst ? "setup-maybe-ref" : "setup-let";
    registerBinding(bindings, node, type);
  } else if (node.type === "RestElement") {
    const type = isConst ? "setup-const" : "setup-let";
    registerBinding(bindings, node.argument, type);
  } else if (node.type === "ObjectPattern") {
    walkObjectPattern(node, bindings, isConst);
  } else if (node.type === "ArrayPattern") {
    walkArrayPattern(node, bindings, isConst);
  } else if (node.type === "AssignmentPattern") {
    if (node.left.type === "Identifier") {
      const type = isDefineCall ? "setup-const" : isConst ? "setup-maybe-ref" : "setup-let";
      registerBinding(bindings, node.left, type);
    } else {
      walkPattern(node.left, bindings, isConst);
    }
  }
}
function canNeverBeRef(node, userReactiveImport) {
  if (isCallOf(node, userReactiveImport)) {
    return true;
  }
  switch (node.type) {
    case "UnaryExpression":
    case "BinaryExpression":
    case "ArrayExpression":
    case "ObjectExpression":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "UpdateExpression":
    case "ClassExpression":
    case "TaggedTemplateExpression":
      return true;
    case "SequenceExpression":
      return canNeverBeRef(
        node.expressions[node.expressions.length - 1],
        userReactiveImport
      );
    default:
      if (isLiteralNode(node)) {
        return true;
      }
      return false;
  }
}
function isStaticNode(node) {
  node = CompilerDOM.unwrapTSNode(node);
  switch (node.type) {
    case "UnaryExpression":
      return isStaticNode(node.argument);
    case "LogicalExpression":
    // 1 > 2
    case "BinaryExpression":
      return isStaticNode(node.left) && isStaticNode(node.right);
    case "ConditionalExpression": {
      return isStaticNode(node.test) && isStaticNode(node.consequent) && isStaticNode(node.alternate);
    }
    case "SequenceExpression":
    // (1, 2)
    case "TemplateLiteral":
      return node.expressions.every((expr) => isStaticNode(expr));
    case "ParenthesizedExpression":
      return isStaticNode(node.expression);
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "BigIntLiteral":
      return true;
  }
  return false;
}
function mergeSourceMaps(scriptMap, templateMap, templateLineOffset) {
  const generator = new sourceMapJs.SourceMapGenerator();
  const addMapping = (map, lineOffset = 0) => {
    const consumer = new sourceMapJs.SourceMapConsumer(map);
    consumer.sources.forEach((sourceFile) => {
      generator._sources.add(sourceFile);
      const sourceContent = consumer.sourceContentFor(sourceFile);
      if (sourceContent != null) {
        generator.setSourceContent(sourceFile, sourceContent);
      }
    });
    consumer.eachMapping((m) => {
      if (m.originalLine == null) return;
      generator.addMapping({
        generated: {
          line: m.generatedLine + lineOffset,
          column: m.generatedColumn
        },
        original: {
          line: m.originalLine,
          column: m.originalColumn
        },
        source: m.source,
        name: m.name
      });
    });
  };
  addMapping(scriptMap);
  addMapping(templateMap, templateLineOffset);
  generator._sourceRoot = scriptMap.sourceRoot;
  generator._file = scriptMap.file;
  return generator.toJSON();
}

const version = "3.5.26";
const parseCache = parseCache$1;
const errorMessages = {
  ...CompilerDOM.errorMessages,
  ...CompilerDOM.DOMErrorMessages
};
const walk = estreeWalker.walk;
const shouldTransformRef = () => false;

exports.extractIdentifiers = compilerCore.extractIdentifiers;
exports.generateCodeFrame = compilerCore.generateCodeFrame;
exports.isInDestructureAssignment = compilerCore.isInDestructureAssignment;
exports.isStaticProperty = compilerCore.isStaticProperty;
exports.walkIdentifiers = compilerCore.walkIdentifiers;
exports.MagicString = MagicString;
exports.babelParse = parser$2.parse;
exports.compileScript = compileScript;
exports.compileStyle = compileStyle;
exports.compileStyleAsync = compileStyleAsync;
exports.compileTemplate = compileTemplate;
exports.errorMessages = errorMessages;
exports.extractRuntimeEmits = extractRuntimeEmits;
exports.extractRuntimeProps = extractRuntimeProps;
exports.inferRuntimeType = inferRuntimeType;
exports.invalidateTypeCache = invalidateTypeCache;
exports.parse = parse$1;
exports.parseCache = parseCache;
exports.registerTS = registerTS;
exports.resolveTypeElements = resolveTypeElements;
exports.rewriteDefault = rewriteDefault;
exports.rewriteDefaultAST = rewriteDefaultAST;
exports.shouldTransformRef = shouldTransformRef;
exports.version = version;
exports.walk = walk;
