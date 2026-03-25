/// <reference types="./otpauth.d.ts" />
'use strict';

var crypto = require('node:crypto');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var crypto__namespace = /*#__PURE__*/_interopNamespaceDefault(crypto);

/**
 * Converts an integer to an ArrayBuffer.
 * @param {number} num Integer.
 * @returns {ArrayBuffer} ArrayBuffer.
 */
const uintToBuf = num => {
  const buf = new ArrayBuffer(8);
  const arr = new Uint8Array(buf);
  let acc = num;
  for (let i = 7; i >= 0; i--) {
    if (acc === 0) break;
    arr[i] = acc & 255;
    acc -= arr[i];
    acc /= 256;
  }
  return buf;
};

var jsSHA = undefined;

/**
 * "globalThis" ponyfill.
 * @see [A horrifying globalThis polyfill in universal JavaScript](https://mathiasbynens.be/notes/globalthis)
 * @type {Object.<string, *>}
 */
const globalScope = (() => {
  if (typeof globalThis === "object") return globalThis;else {
    Object.defineProperty(Object.prototype, "__GLOBALTHIS__", {
      get() {
        return this;
      },
      configurable: true
    });
    try {
      // @ts-ignore
      // eslint-disable-next-line no-undef
      if (typeof __GLOBALTHIS__ !== "undefined") return __GLOBALTHIS__;
    } finally {
      // @ts-ignore
      delete Object.prototype.__GLOBALTHIS__;
    }
  }

  // Still unable to determine "globalThis", fall back to a naive method.
  if (typeof self !== "undefined") return self;else if (typeof window !== "undefined") return window;else if (typeof global !== "undefined") return global;
  return undefined;
})();

/**
 * OpenSSL to jsSHA algorithms map.
 * @type {Object.<string, "SHA-1"|"SHA-224"|"SHA-256"|"SHA-384"|"SHA-512"|"SHA3-224"|"SHA3-256"|"SHA3-384"|"SHA3-512">}
 */
const OPENSSL_JSSHA_ALGO_MAP = {
  SHA1: "SHA-1",
  SHA224: "SHA-224",
  SHA256: "SHA-256",
  SHA384: "SHA-384",
  SHA512: "SHA-512",
  "SHA3-224": "SHA3-224",
  "SHA3-256": "SHA3-256",
  "SHA3-384": "SHA3-384",
  "SHA3-512": "SHA3-512"
};

/**
 * Calculates an HMAC digest.
 * In Node.js, the command "openssl list -digest-algorithms" displays the available digest algorithms.
 * @param {string} algorithm Algorithm.
 * @param {ArrayBuffer} key Key.
 * @param {ArrayBuffer} message Message.
 * @returns {ArrayBuffer} Digest.
 */
const hmacDigest = (algorithm, key, message) => {
  if (crypto__namespace !== null && crypto__namespace !== void 0 && crypto__namespace.createHmac) {
    const hmac = crypto__namespace.createHmac(algorithm, globalScope.Buffer.from(key));
    hmac.update(globalScope.Buffer.from(message));
    return hmac.digest().buffer;
  } else {
    const variant = OPENSSL_JSSHA_ALGO_MAP[algorithm.toUpperCase()];
    if (typeof variant === "undefined") {
      throw new TypeError("Unknown hash function");
    }
    const hmac = new jsSHA(variant, "ARRAYBUFFER");
    hmac.setHMACKey(key, "ARRAYBUFFER");
    hmac.update(message);
    return hmac.getHMAC("ARRAYBUFFER");
  }
};

/**
 * Pads a number with leading zeros.
 * @param {number|string} num Number.
 * @param {number} digits Digits.
 * @returns {string} Padded number.
 */
const pad = (num, digits) => {
  let prefix = "";
  let repeat = digits - String(num).length;
  while (repeat-- > 0) prefix += "0";
  return `${prefix}${num}`;
};

/**
 * RFC 4648 base32 alphabet without pad.
 * @type {string}
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Converts a base32 string to an ArrayBuffer (RFC 4648).
 * @see [LinusU/base32-decode](https://github.com/LinusU/base32-decode)
 * @param {string} str Base32 string.
 * @returns {ArrayBuffer} ArrayBuffer.
 */
const base32ToBuf = str => {
  // Canonicalize to all upper case and remove padding if it exists.
  let end = str.length;
  while (str[end - 1] === "=") --end;
  const cstr = (end < str.length ? str.substring(0, end) : str).toUpperCase();
  const buf = new ArrayBuffer(cstr.length * 5 / 8 | 0);
  const arr = new Uint8Array(buf);
  let bits = 0;
  let value = 0;
  let index = 0;
  for (let i = 0; i < cstr.length; i++) {
    const idx = ALPHABET.indexOf(cstr[i]);
    if (idx === -1) throw new TypeError(`Invalid character found: ${cstr[i]}`);
    value = value << 5 | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      arr[index++] = value >>> bits;
    }
  }
  return buf;
};

/**
 * Converts an ArrayBuffer to a base32 string (RFC 4648).
 * @see [LinusU/base32-encode](https://github.com/LinusU/base32-encode)
 * @param {ArrayBuffer} buf ArrayBuffer.
 * @returns {string} Base32 string.
 */
const base32FromBuf = buf => {
  const arr = new Uint8Array(buf);
  let bits = 0;
  let value = 0;
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    value = value << 8 | arr[i];
    bits += 8;
    while (bits >= 5) {
      str += ALPHABET[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    str += ALPHABET[value << 5 - bits & 31];
  }
  return str;
};

/**
 * Converts a hexadecimal string to an ArrayBuffer.
 * @param {string} str Hexadecimal string.
 * @returns {ArrayBuffer} ArrayBuffer.
 */
const hexToBuf = str => {
  const buf = new ArrayBuffer(str.length / 2);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < str.length; i += 2) {
    arr[i / 2] = parseInt(str.substring(i, i + 2), 16);
  }
  return buf;
};

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param {ArrayBuffer} buf ArrayBuffer.
 * @returns {string} Hexadecimal string.
 */
const hexFromBuf = buf => {
  const arr = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    const hex = arr[i].toString(16);
    if (hex.length === 1) str += "0";
    str += hex;
  }
  return str.toUpperCase();
};

/**
 * Converts a Latin-1 string to an ArrayBuffer.
 * @param {string} str Latin-1 string.
 * @returns {ArrayBuffer} ArrayBuffer.
 */
const latin1ToBuf = str => {
  const buf = new ArrayBuffer(str.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return buf;
};

/**
 * Converts an ArrayBuffer to a Latin-1 string.
 * @param {ArrayBuffer} buf ArrayBuffer.
 * @returns {string} Latin-1 string.
 */
const latin1FromBuf = buf => {
  const arr = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return str;
};

/**
 * TextEncoder instance.
 * @type {TextEncoder|null}
 */
const ENCODER = globalScope.TextEncoder ? new globalScope.TextEncoder("utf-8") : null;

/**
 * TextDecoder instance.
 * @type {TextDecoder|null}
 */
const DECODER = globalScope.TextDecoder ? new globalScope.TextDecoder("utf-8") : null;

/**
 * Converts an UTF-8 string to an ArrayBuffer.
 * @param {string} str String.
 * @returns {ArrayBuffer} ArrayBuffer.
 */
const utf8ToBuf = str => {
  if (!ENCODER) {
    throw new Error("Encoding API not available");
  }
  return ENCODER.encode(str).buffer;
};

/**
 * Converts an ArrayBuffer to an UTF-8 string.
 * @param {ArrayBuffer} buf ArrayBuffer.
 * @returns {string} String.
 */
const utf8FromBuf = buf => {
  if (!DECODER) {
    throw new Error("Encoding API not available");
  }
  return DECODER.decode(buf);
};

/**
 * Returns random bytes.
 * @param {number} size Size.
 * @returns {ArrayBuffer} Random bytes.
 */
const randomBytes = size => {
  if (crypto__namespace !== null && crypto__namespace !== void 0 && crypto__namespace.randomBytes) {
    return crypto__namespace.randomBytes(size).buffer;
  } else {
    if (!globalScope.crypto || !globalScope.crypto.getRandomValues) {
      throw new Error("Cryptography API not available");
    }
    return globalScope.crypto.getRandomValues(new Uint8Array(size)).buffer;
  }
};

/**
 * OTP secret key.
 */
class Secret {
  /**
   * Creates a secret key object.
   * @param {Object} [config] Configuration options.
   * @param {ArrayBuffer} [config.buffer=randomBytes] Secret key.
   * @param {number} [config.size=20] Number of random bytes to generate, ignored if 'buffer' is provided.
   */
  constructor() {
    let {
      buffer,
      size = 20
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    /**
     * Secret key.
     * @type {ArrayBuffer}
     */
    this.buffer = typeof buffer === "undefined" ? randomBytes(size) : buffer;
  }

  /**
   * Converts a Latin-1 string to a Secret object.
   * @param {string} str Latin-1 string.
   * @returns {Secret} Secret object.
   */
  static fromLatin1(str) {
    return new Secret({
      buffer: latin1ToBuf(str)
    });
  }

  /**
   * Converts an UTF-8 string to a Secret object.
   * @param {string} str UTF-8 string.
   * @returns {Secret} Secret object.
   */
  static fromUTF8(str) {
    return new Secret({
      buffer: utf8ToBuf(str)
    });
  }

  /**
   * Converts a base32 string to a Secret object.
   * @param {string} str Base32 string.
   * @returns {Secret} Secret object.
   */
  static fromBase32(str) {
    return new Secret({
      buffer: base32ToBuf(str)
    });
  }

  /**
   * Converts a hexadecimal string to a Secret object.
   * @param {string} str Hexadecimal string.
   * @returns {Secret} Secret object.
   */
  static fromHex(str) {
    return new Secret({
      buffer: hexToBuf(str)
    });
  }

  /**
   * Latin-1 string representation of secret key.
   * @type {string}
   */
  get latin1() {
    Object.defineProperty(this, "latin1", {
      enumerable: true,
      value: latin1FromBuf(this.buffer)
    });
    return this.latin1;
  }

  /**
   * UTF-8 string representation of secret key.
   * @type {string}
   */
  get utf8() {
    Object.defineProperty(this, "utf8", {
      enumerable: true,
      value: utf8FromBuf(this.buffer)
    });
    return this.utf8;
  }

  /**
   * Base32 string representation of secret key.
   * @type {string}
   */
  get base32() {
    Object.defineProperty(this, "base32", {
      enumerable: true,
      value: base32FromBuf(this.buffer)
    });
    return this.base32;
  }

  /**
   * Hexadecimal string representation of secret key.
   * @type {string}
   */
  get hex() {
    Object.defineProperty(this, "hex", {
      enumerable: true,
      value: hexFromBuf(this.buffer)
    });
    return this.hex;
  }
}

/**
 * Returns true if a is equal to b, without leaking timing information that would allow an attacker to guess one of the values.
 * @param {string} a String a.
 * @param {string} b String b.
 * @returns {boolean} Equality result.
 */
const timingSafeEqual = (a, b) => {
  if (crypto__namespace !== null && crypto__namespace !== void 0 && crypto__namespace.timingSafeEqual) {
    return crypto__namespace.timingSafeEqual(globalScope.Buffer.from(a), globalScope.Buffer.from(b));
  } else {
    if (a.length !== b.length) {
      throw new TypeError("Input strings must have the same length");
    }
    let i = -1;
    let out = 0;
    while (++i < a.length) {
      out |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return out === 0;
  }
};

/**
 * HOTP: An HMAC-based One-time Password Algorithm.
 * @see [RFC 4226](https://tools.ietf.org/html/rfc4226)
 */
class HOTP {
  /**
   * Default configuration.
   * @type {{
   *   issuer: string,
   *   label: string,
   *   algorithm: string,
   *   digits: number,
   *   counter: number
   *   window: number
   * }}
   */
  static get defaults() {
    return {
      issuer: "",
      label: "OTPAuth",
      algorithm: "SHA1",
      digits: 6,
      counter: 0,
      window: 1
    };
  }

  /**
   * Creates an HOTP object.
   * @param {Object} [config] Configuration options.
   * @param {string} [config.issuer=''] Account provider.
   * @param {string} [config.label='OTPAuth'] Account label.
   * @param {Secret|string} [config.secret=Secret] Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} [config.digits=6] Token length.
   * @param {number} [config.counter=0] Initial counter value.
   */
  constructor() {
    let {
      issuer = HOTP.defaults.issuer,
      label = HOTP.defaults.label,
      secret = new Secret(),
      algorithm = HOTP.defaults.algorithm,
      digits = HOTP.defaults.digits,
      counter = HOTP.defaults.counter
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    /**
     * Account provider.
     * @type {string}
     */
    this.issuer = issuer;
    /**
     * Account label.
     * @type {string}
     */
    this.label = label;
    /**
     * Secret key.
     * @type {Secret}
     */
    this.secret = typeof secret === "string" ? Secret.fromBase32(secret) : secret;
    /**
     * HMAC hashing algorithm.
     * @type {string}
     */
    this.algorithm = algorithm.toUpperCase();
    /**
     * Token length.
     * @type {number}
     */
    this.digits = digits;
    /**
     * Initial counter value.
     * @type {number}
     */
    this.counter = counter;
  }

  /**
   * Generates an HOTP token.
   * @param {Object} config Configuration options.
   * @param {Secret} config.secret Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} [config.digits=6] Token length.
   * @param {number} [config.counter=0] Counter value.
   * @returns {string} Token.
   */
  static generate(_ref) {
    let {
      secret,
      algorithm = HOTP.defaults.algorithm,
      digits = HOTP.defaults.digits,
      counter = HOTP.defaults.counter
    } = _ref;
    const digest = new Uint8Array(hmacDigest(algorithm, secret.buffer, uintToBuf(counter)));
    const offset = digest[digest.byteLength - 1] & 15;
    const otp = ((digest[offset] & 127) << 24 | (digest[offset + 1] & 255) << 16 | (digest[offset + 2] & 255) << 8 | digest[offset + 3] & 255) % 10 ** digits;
    return pad(otp, digits);
  }

  /**
   * Generates an HOTP token.
   * @param {Object} [config] Configuration options.
   * @param {number} [config.counter=this.counter++] Counter value.
   * @returns {string} Token.
   */
  generate() {
    let {
      counter = this.counter++
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return HOTP.generate({
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      counter
    });
  }

  /**
   * Validates an HOTP token.
   * @param {Object} config Configuration options.
   * @param {string} config.token Token value.
   * @param {Secret} config.secret Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} config.digits Token length.
   * @param {number} [config.counter=0] Counter value.
   * @param {number} [config.window=1] Window of counter values to test.
   * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
   */
  static validate(_ref2) {
    let {
      token,
      secret,
      algorithm,
      digits,
      counter = HOTP.defaults.counter,
      window = HOTP.defaults.window
    } = _ref2;
    // Return early if the token length does not match the digit number.
    if (token.length !== digits) return null;
    let delta = null;
    for (let i = counter - window; i <= counter + window; ++i) {
      const generatedToken = HOTP.generate({
        secret,
        algorithm,
        digits,
        counter: i
      });
      if (timingSafeEqual(token, generatedToken)) {
        delta = i - counter;
      }
    }
    return delta;
  }

  /**
   * Validates an HOTP token.
   * @param {Object} config Configuration options.
   * @param {string} config.token Token value.
   * @param {number} [config.counter=this.counter] Counter value.
   * @param {number} [config.window=1] Window of counter values to test.
   * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
   */
  validate(_ref3) {
    let {
      token,
      counter = this.counter,
      window
    } = _ref3;
    return HOTP.validate({
      token,
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      counter,
      window
    });
  }

  /**
   * Returns a Google Authenticator key URI.
   * @returns {string} URI.
   */
  toString() {
    const e = encodeURIComponent;
    return "otpauth://hotp/" + `${this.issuer.length > 0 ? `${e(this.issuer)}:${e(this.label)}?issuer=${e(this.issuer)}&` : `${e(this.label)}?`}` + `secret=${e(this.secret.base32)}&` + `algorithm=${e(this.algorithm)}&` + `digits=${e(this.digits)}&` + `counter=${e(this.counter)}`;
  }
}

/**
 * TOTP: Time-Based One-Time Password Algorithm.
 * @see [RFC 6238](https://tools.ietf.org/html/rfc6238)
 */
class TOTP {
  /**
   * Default configuration.
   * @type {{
   *   issuer: string,
   *   label: string,
   *   algorithm: string,
   *   digits: number,
   *   period: number
   *   window: number
   * }}
   */
  static get defaults() {
    return {
      issuer: "",
      label: "OTPAuth",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      window: 1
    };
  }

  /**
   * Creates a TOTP object.
   * @param {Object} [config] Configuration options.
   * @param {string} [config.issuer=''] Account provider.
   * @param {string} [config.label='OTPAuth'] Account label.
   * @param {Secret|string} [config.secret=Secret] Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} [config.digits=6] Token length.
   * @param {number} [config.period=30] Token time-step duration.
   */
  constructor() {
    let {
      issuer = TOTP.defaults.issuer,
      label = TOTP.defaults.label,
      secret = new Secret(),
      algorithm = TOTP.defaults.algorithm,
      digits = TOTP.defaults.digits,
      period = TOTP.defaults.period
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    /**
     * Account provider.
     * @type {string}
     */
    this.issuer = issuer;
    /**
     * Account label.
     * @type {string}
     */
    this.label = label;
    /**
     * Secret key.
     * @type {Secret}
     */
    this.secret = typeof secret === "string" ? Secret.fromBase32(secret) : secret;
    /**
     * HMAC hashing algorithm.
     * @type {string}
     */
    this.algorithm = algorithm.toUpperCase();
    /**
     * Token length.
     * @type {number}
     */
    this.digits = digits;
    /**
     * Token time-step duration.
     * @type {number}
     */
    this.period = period;
  }

  /**
   * Generates a TOTP token.
   * @param {Object} config Configuration options.
   * @param {Secret} config.secret Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} [config.digits=6] Token length.
   * @param {number} [config.period=30] Token time-step duration.
   * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
   * @returns {string} Token.
   */
  static generate(_ref) {
    let {
      secret,
      algorithm,
      digits,
      period = TOTP.defaults.period,
      timestamp = Date.now()
    } = _ref;
    return HOTP.generate({
      secret,
      algorithm,
      digits,
      counter: Math.floor(timestamp / 1000 / period)
    });
  }

  /**
   * Generates a TOTP token.
   * @param {Object} [config] Configuration options.
   * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
   * @returns {string} Token.
   */
  generate() {
    let {
      timestamp = Date.now()
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return TOTP.generate({
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
      timestamp
    });
  }

  /**
   * Validates a TOTP token.
   * @param {Object} config Configuration options.
   * @param {string} config.token Token value.
   * @param {Secret} config.secret Secret key.
   * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
   * @param {number} config.digits Token length.
   * @param {number} [config.period=30] Token time-step duration.
   * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
   * @param {number} [config.window=1] Window of counter values to test.
   * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
   */
  static validate(_ref2) {
    let {
      token,
      secret,
      algorithm,
      digits,
      period = TOTP.defaults.period,
      timestamp = Date.now(),
      window
    } = _ref2;
    return HOTP.validate({
      token,
      secret,
      algorithm,
      digits,
      counter: Math.floor(timestamp / 1000 / period),
      window
    });
  }

  /**
   * Validates a TOTP token.
   * @param {Object} config Configuration options.
   * @param {string} config.token Token value.
   * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
   * @param {number} [config.window=1] Window of counter values to test.
   * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
   */
  validate(_ref3) {
    let {
      token,
      timestamp,
      window
    } = _ref3;
    return TOTP.validate({
      token,
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
      timestamp,
      window
    });
  }

  /**
   * Returns a Google Authenticator key URI.
   * @returns {string} URI.
   */
  toString() {
    const e = encodeURIComponent;
    return "otpauth://totp/" + `${this.issuer.length > 0 ? `${e(this.issuer)}:${e(this.label)}?issuer=${e(this.issuer)}&` : `${e(this.label)}?`}` + `secret=${e(this.secret.base32)}&` + `algorithm=${e(this.algorithm)}&` + `digits=${e(this.digits)}&` + `period=${e(this.period)}`;
  }
}

/**
 * Key URI regex (otpauth://TYPE/[ISSUER:]LABEL?PARAMETERS).
 * @type {RegExp}
 */
const OTPURI_REGEX = /^otpauth:\/\/([ht]otp)\/(.+)\?([A-Z0-9.~_-]+=[^?&]*(?:&[A-Z0-9.~_-]+=[^?&]*)*)$/i;

/**
 * RFC 4648 base32 alphabet with pad.
 * @type {RegExp}
 */
const SECRET_REGEX = /^[2-7A-Z]+=*$/i;

/**
 * Regex for supported algorithms.
 * @type {RegExp}
 */
const ALGORITHM_REGEX = /^SHA(?:1|224|256|384|512|3-224|3-256|3-384|3-512)$/i;

/**
 * Integer regex.
 * @type {RegExp}
 */
const INTEGER_REGEX = /^[+-]?\d+$/;

/**
 * Positive integer regex.
 * @type {RegExp}
 */
const POSITIVE_INTEGER_REGEX = /^\+?[1-9]\d*$/;

/**
 * HOTP/TOTP object/string conversion.
 * @see [Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
 */
class URI {
  /**
   * Parses a Google Authenticator key URI and returns an HOTP/TOTP object.
   * @param {string} uri Google Authenticator Key URI.
   * @returns {HOTP|TOTP} HOTP/TOTP object.
   */
  static parse(uri) {
    let uriGroups;
    try {
      uriGroups = uri.match(OTPURI_REGEX);
    } catch (error) {
      /* Handled below */
    }
    if (!Array.isArray(uriGroups)) {
      throw new URIError("Invalid URI format");
    }

    // Extract URI groups.
    const uriType = uriGroups[1].toLowerCase();
    const uriLabel = uriGroups[2].split(/(?::|%3A) *(.+)/i, 2).map(decodeURIComponent);
    /** @type {Object.<string, string>} */
    const uriParams = uriGroups[3].split("&").reduce((acc, cur) => {
      const pairArr = cur.split(/=(.*)/, 2).map(decodeURIComponent);
      const pairKey = pairArr[0].toLowerCase();
      const pairVal = pairArr[1];
      /** @type {Object.<string, string>} */
      const pairAcc = acc;
      pairAcc[pairKey] = pairVal;
      return pairAcc;
    }, {});

    // 'OTP' will be instantiated with 'config' argument.
    let OTP;
    const config = {};
    if (uriType === "hotp") {
      OTP = HOTP;

      // Counter: required
      if (typeof uriParams.counter !== "undefined" && INTEGER_REGEX.test(uriParams.counter)) {
        config.counter = parseInt(uriParams.counter, 10);
      } else {
        throw new TypeError("Missing or invalid 'counter' parameter");
      }
    } else if (uriType === "totp") {
      OTP = TOTP;

      // Period: optional
      if (typeof uriParams.period !== "undefined") {
        if (POSITIVE_INTEGER_REGEX.test(uriParams.period)) {
          config.period = parseInt(uriParams.period, 10);
        } else {
          throw new TypeError("Invalid 'period' parameter");
        }
      }
    } else {
      throw new TypeError("Unknown OTP type");
    }

    // Label: required
    // Issuer: optional
    if (uriLabel.length === 2) {
      config.label = uriLabel[1];
      config.issuer = uriLabel[0];
    } else {
      config.label = uriLabel[0];
      if (typeof uriParams.issuer !== "undefined") {
        config.issuer = uriParams.issuer;
      }
    }

    // Secret: required
    if (typeof uriParams.secret !== "undefined" && SECRET_REGEX.test(uriParams.secret)) {
      config.secret = uriParams.secret;
    } else {
      throw new TypeError("Missing or invalid 'secret' parameter");
    }

    // Algorithm: optional
    if (typeof uriParams.algorithm !== "undefined") {
      if (ALGORITHM_REGEX.test(uriParams.algorithm)) {
        config.algorithm = uriParams.algorithm;
      } else {
        throw new TypeError("Invalid 'algorithm' parameter");
      }
    }

    // Digits: optional
    if (typeof uriParams.digits !== "undefined") {
      if (POSITIVE_INTEGER_REGEX.test(uriParams.digits)) {
        config.digits = parseInt(uriParams.digits, 10);
      } else {
        throw new TypeError("Invalid 'digits' parameter");
      }
    }
    return new OTP(config);
  }

  /**
   * Converts an HOTP/TOTP object to a Google Authenticator key URI.
   * @param {HOTP|TOTP} otp HOTP/TOTP object.
   * @returns {string} Google Authenticator Key URI.
   */
  static stringify(otp) {
    if (otp instanceof HOTP || otp instanceof TOTP) {
      return otp.toString();
    }
    throw new TypeError("Invalid 'HOTP/TOTP' object");
  }
}

/**
 * Library version.
 * @type {string}
 */
const version = "9.1.1";

exports.HOTP = HOTP;
exports.Secret = Secret;
exports.TOTP = TOTP;
exports.URI = URI;
exports.version = version;
