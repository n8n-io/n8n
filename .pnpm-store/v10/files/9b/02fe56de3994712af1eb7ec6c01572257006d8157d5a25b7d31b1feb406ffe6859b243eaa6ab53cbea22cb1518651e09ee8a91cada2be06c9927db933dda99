/**
 * @otplib/core
 *
 * @author Gerald Yeo <contact@fusedthought.com>
 * @version: 12.0.1
 * @license: MIT
 **/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function objectValues(value) {
  return Object.keys(value).map(key => value[key]);
}
(function (HashAlgorithms) {
  HashAlgorithms["SHA1"] = "sha1";
  HashAlgorithms["SHA256"] = "sha256";
  HashAlgorithms["SHA512"] = "sha512";
})(exports.HashAlgorithms || (exports.HashAlgorithms = {}));
const HASH_ALGORITHMS = objectValues(exports.HashAlgorithms);
(function (KeyEncodings) {
  KeyEncodings["ASCII"] = "ascii";
  KeyEncodings["BASE64"] = "base64";
  KeyEncodings["HEX"] = "hex";
  KeyEncodings["LATIN1"] = "latin1";
  KeyEncodings["UTF8"] = "utf8";
})(exports.KeyEncodings || (exports.KeyEncodings = {}));
const KEY_ENCODINGS = objectValues(exports.KeyEncodings);
(function (Strategy) {
  Strategy["HOTP"] = "hotp";
  Strategy["TOTP"] = "totp";
})(exports.Strategy || (exports.Strategy = {}));
const STRATEGY = objectValues(exports.Strategy);
const createDigestPlaceholder = () => {
  throw new Error('Please provide an options.createDigest implementation.');
};
function isTokenValid(value) {
  return /^(\d+)$/.test(value);
}
function padStart(value, maxLength, fillString) {
  if (value.length >= maxLength) {
    return value;
  }
  const padding = Array(maxLength + 1).join(fillString);
  return `${padding}${value}`.slice(-1 * maxLength);
}
function keyuri(options) {
  const tmpl = `otpauth://${options.type}/{labelPrefix}:{accountName}?secret={secret}{query}`;
  const params = [];
  if (STRATEGY.indexOf(options.type) < 0) {
    throw new Error(`Expecting options.type to be one of ${STRATEGY.join(', ')}. Received ${options.type}.`);
  }
  if (options.type === 'hotp') {
    if (options.counter == null || typeof options.counter !== 'number') {
      throw new Error('Expecting options.counter to be a number when options.type is "hotp".');
    }
    params.push(`&counter=${options.counter}`);
  }
  if (options.type === 'totp' && options.step) {
    params.push(`&period=${options.step}`);
  }
  if (options.digits) {
    params.push(`&digits=${options.digits}`);
  }
  if (options.algorithm) {
    params.push(`&algorithm=${options.algorithm.toUpperCase()}`);
  }
  if (options.issuer) {
    params.push(`&issuer=${encodeURIComponent(options.issuer)}`);
  }
  return tmpl.replace('{labelPrefix}', encodeURIComponent(options.issuer || options.accountName)).replace('{accountName}', encodeURIComponent(options.accountName)).replace('{secret}', options.secret).replace('{query}', params.join(''));
}
class OTP {
  constructor(defaultOptions = {}) {
    this._defaultOptions = Object.freeze({ ...defaultOptions
    });
    this._options = Object.freeze({});
  }
  create(defaultOptions = {}) {
    return new OTP(defaultOptions);
  }
  clone(defaultOptions = {}) {
    const instance = this.create({ ...this._defaultOptions,
      ...defaultOptions
    });
    instance.options = this._options;
    return instance;
  }
  get options() {
    return Object.freeze({ ...this._defaultOptions,
      ...this._options
    });
  }
  set options(options) {
    this._options = Object.freeze({ ...this._options,
      ...options
    });
  }
  allOptions() {
    return this.options;
  }
  resetOptions() {
    this._options = Object.freeze({});
  }
}

function hotpOptionsValidator(options) {
  if (typeof options.createDigest !== 'function') {
    throw new Error('Expecting options.createDigest to be a function.');
  }
  if (typeof options.createHmacKey !== 'function') {
    throw new Error('Expecting options.createHmacKey to be a function.');
  }
  if (typeof options.digits !== 'number') {
    throw new Error('Expecting options.digits to be a number.');
  }
  if (!options.algorithm || HASH_ALGORITHMS.indexOf(options.algorithm) < 0) {
    throw new Error(`Expecting options.algorithm to be one of ${HASH_ALGORITHMS.join(', ')}. Received ${options.algorithm}.`);
  }
  if (!options.encoding || KEY_ENCODINGS.indexOf(options.encoding) < 0) {
    throw new Error(`Expecting options.encoding to be one of ${KEY_ENCODINGS.join(', ')}. Received ${options.encoding}.`);
  }
}
const hotpCreateHmacKey = (algorithm, secret, encoding) => {
  return Buffer.from(secret, encoding).toString('hex');
};
function hotpDefaultOptions() {
  const options = {
    algorithm: exports.HashAlgorithms.SHA1,
    createHmacKey: hotpCreateHmacKey,
    createDigest: createDigestPlaceholder,
    digits: 6,
    encoding: exports.KeyEncodings.ASCII
  };
  return options;
}
function hotpOptions(opt) {
  const options = { ...hotpDefaultOptions(),
    ...opt
  };
  hotpOptionsValidator(options);
  return Object.freeze(options);
}
function hotpCounter(counter) {
  const hexCounter = counter.toString(16);
  return padStart(hexCounter, 16, '0');
}
function hotpDigestToToken(hexDigest, digits) {
  const digest = Buffer.from(hexDigest, 'hex');
  const offset = digest[digest.length - 1] & 0xf;
  const binary = (digest[offset] & 0x7f) << 24 | (digest[offset + 1] & 0xff) << 16 | (digest[offset + 2] & 0xff) << 8 | digest[offset + 3] & 0xff;
  const token = binary % Math.pow(10, digits);
  return padStart(String(token), digits, '0');
}
function hotpDigest(secret, counter, options) {
  const hexCounter = hotpCounter(counter);
  const hmacKey = options.createHmacKey(options.algorithm, secret, options.encoding);
  return options.createDigest(options.algorithm, hmacKey, hexCounter);
}
function hotpToken(secret, counter, options) {
  const hexDigest = options.digest || hotpDigest(secret, counter, options);
  return hotpDigestToToken(hexDigest, options.digits);
}
function hotpCheck(token, secret, counter, options) {
  if (!isTokenValid(token)) {
    return false;
  }
  const systemToken = hotpToken(secret, counter, options);
  return token === systemToken;
}
function hotpKeyuri(accountName, issuer, secret, counter, options) {
  return keyuri({
    algorithm: options.algorithm,
    digits: options.digits,
    type: exports.Strategy.HOTP,
    accountName,
    counter,
    issuer,
    secret
  });
}
class HOTP extends OTP {
  create(defaultOptions = {}) {
    return new HOTP(defaultOptions);
  }
  allOptions() {
    return hotpOptions(this.options);
  }
  generate(secret, counter) {
    return hotpToken(secret, counter, this.allOptions());
  }
  check(token, secret, counter) {
    return hotpCheck(token, secret, counter, this.allOptions());
  }
  verify(opts) {
    if (typeof opts !== 'object') {
      throw new Error('Expecting argument 0 of verify to be an object');
    }
    return this.check(opts.token, opts.secret, opts.counter);
  }
  keyuri(accountName, issuer, secret, counter) {
    return hotpKeyuri(accountName, issuer, secret, counter, this.allOptions());
  }
}

function parseWindowBounds(win) {
  if (typeof win === 'number') {
    return [Math.abs(win), Math.abs(win)];
  }
  if (Array.isArray(win)) {
    const [past, future] = win;
    if (typeof past === 'number' && typeof future === 'number') {
      return [Math.abs(past), Math.abs(future)];
    }
  }
  throw new Error('Expecting options.window to be an number or [number, number].');
}
function totpOptionsValidator(options) {
  hotpOptionsValidator(options);
  parseWindowBounds(options.window);
  if (typeof options.epoch !== 'number') {
    throw new Error('Expecting options.epoch to be a number.');
  }
  if (typeof options.step !== 'number') {
    throw new Error('Expecting options.step to be a number.');
  }
}
const totpPadSecret = (secret, encoding, minLength) => {
  const currentLength = secret.length;
  const hexSecret = Buffer.from(secret, encoding).toString('hex');
  if (currentLength < minLength) {
    const newSecret = new Array(minLength - currentLength + 1).join(hexSecret);
    return Buffer.from(newSecret, 'hex').slice(0, minLength).toString('hex');
  }
  return hexSecret;
};
const totpCreateHmacKey = (algorithm, secret, encoding) => {
  switch (algorithm) {
    case exports.HashAlgorithms.SHA1:
      return totpPadSecret(secret, encoding, 20);
    case exports.HashAlgorithms.SHA256:
      return totpPadSecret(secret, encoding, 32);
    case exports.HashAlgorithms.SHA512:
      return totpPadSecret(secret, encoding, 64);
    default:
      throw new Error(`Expecting algorithm to be one of ${HASH_ALGORITHMS.join(', ')}. Received ${algorithm}.`);
  }
};
function totpDefaultOptions() {
  const options = {
    algorithm: exports.HashAlgorithms.SHA1,
    createDigest: createDigestPlaceholder,
    createHmacKey: totpCreateHmacKey,
    digits: 6,
    encoding: exports.KeyEncodings.ASCII,
    epoch: Date.now(),
    step: 30,
    window: 0
  };
  return options;
}
function totpOptions(opt) {
  const options = { ...totpDefaultOptions(),
    ...opt
  };
  totpOptionsValidator(options);
  return Object.freeze(options);
}
function totpCounter(epoch, step) {
  return Math.floor(epoch / step / 1000);
}
function totpToken(secret, options) {
  const counter = totpCounter(options.epoch, options.step);
  return hotpToken(secret, counter, options);
}
function totpEpochsInWindow(epoch, direction, deltaPerEpoch, numOfEpoches) {
  const result = [];
  if (numOfEpoches === 0) {
    return result;
  }
  for (let i = 1; i <= numOfEpoches; i++) {
    const delta = direction * i * deltaPerEpoch;
    result.push(epoch + delta);
  }
  return result;
}
function totpEpochAvailable(epoch, step, win) {
  const bounds = parseWindowBounds(win);
  const delta = step * 1000;
  return {
    current: epoch,
    past: totpEpochsInWindow(epoch, -1, delta, bounds[0]),
    future: totpEpochsInWindow(epoch, 1, delta, bounds[1])
  };
}
function totpCheck(token, secret, options) {
  if (!isTokenValid(token)) {
    return false;
  }
  const systemToken = totpToken(secret, options);
  return token === systemToken;
}
function totpCheckByEpoch(epochs, token, secret, options) {
  let position = null;
  epochs.some((epoch, idx) => {
    if (totpCheck(token, secret, { ...options,
      epoch
    })) {
      position = idx + 1;
      return true;
    }
    return false;
  });
  return position;
}
function totpCheckWithWindow(token, secret, options) {
  if (totpCheck(token, secret, options)) {
    return 0;
  }
  const epochs = totpEpochAvailable(options.epoch, options.step, options.window);
  const backward = totpCheckByEpoch(epochs.past, token, secret, options);
  if (backward !== null) {
    return backward * -1;
  }
  return totpCheckByEpoch(epochs.future, token, secret, options);
}
function totpTimeUsed(epoch, step) {
  return Math.floor(epoch / 1000) % step;
}
function totpTimeRemaining(epoch, step) {
  return step - totpTimeUsed(epoch, step);
}
function totpKeyuri(accountName, issuer, secret, options) {
  return keyuri({
    algorithm: options.algorithm,
    digits: options.digits,
    step: options.step,
    type: exports.Strategy.TOTP,
    accountName,
    issuer,
    secret
  });
}
class TOTP extends HOTP {
  create(defaultOptions = {}) {
    return new TOTP(defaultOptions);
  }
  allOptions() {
    return totpOptions(this.options);
  }
  generate(secret) {
    return totpToken(secret, this.allOptions());
  }
  checkDelta(token, secret) {
    return totpCheckWithWindow(token, secret, this.allOptions());
  }
  check(token, secret) {
    const delta = this.checkDelta(token, secret);
    return typeof delta === 'number';
  }
  verify(opts) {
    if (typeof opts !== 'object') {
      throw new Error('Expecting argument 0 of verify to be an object');
    }
    return this.check(opts.token, opts.secret);
  }
  timeRemaining() {
    const options = this.allOptions();
    return totpTimeRemaining(options.epoch, options.step);
  }
  timeUsed() {
    const options = this.allOptions();
    return totpTimeUsed(options.epoch, options.step);
  }
  keyuri(accountName, issuer, secret) {
    return totpKeyuri(accountName, issuer, secret, this.allOptions());
  }
}

function authenticatorOptionValidator(options) {
  totpOptionsValidator(options);
  if (typeof options.keyDecoder !== 'function') {
    throw new Error('Expecting options.keyDecoder to be a function.');
  }
  if (options.keyEncoder && typeof options.keyEncoder !== 'function') {
    throw new Error('Expecting options.keyEncoder to be a function.');
  }
}
function authenticatorDefaultOptions() {
  const options = {
    algorithm: exports.HashAlgorithms.SHA1,
    createDigest: createDigestPlaceholder,
    createHmacKey: totpCreateHmacKey,
    digits: 6,
    encoding: exports.KeyEncodings.HEX,
    epoch: Date.now(),
    step: 30,
    window: 0
  };
  return options;
}
function authenticatorOptions(opt) {
  const options = { ...authenticatorDefaultOptions(),
    ...opt
  };
  authenticatorOptionValidator(options);
  return Object.freeze(options);
}
function authenticatorEncoder(secret, options) {
  return options.keyEncoder(secret, options.encoding);
}
function authenticatorDecoder(secret, options) {
  return options.keyDecoder(secret, options.encoding);
}
function authenticatorGenerateSecret(numberOfBytes, options) {
  const key = options.createRandomBytes(numberOfBytes, options.encoding);
  return authenticatorEncoder(key, options);
}
function authenticatorToken(secret, options) {
  return totpToken(authenticatorDecoder(secret, options), options);
}
function authenticatorCheckWithWindow(token, secret, options) {
  return totpCheckWithWindow(token, authenticatorDecoder(secret, options), options);
}
class Authenticator extends TOTP {
  create(defaultOptions = {}) {
    return new Authenticator(defaultOptions);
  }
  allOptions() {
    return authenticatorOptions(this.options);
  }
  generate(secret) {
    return authenticatorToken(secret, this.allOptions());
  }
  checkDelta(token, secret) {
    return authenticatorCheckWithWindow(token, secret, this.allOptions());
  }
  encode(secret) {
    return authenticatorEncoder(secret, this.allOptions());
  }
  decode(secret) {
    return authenticatorDecoder(secret, this.allOptions());
  }
  generateSecret(numberOfBytes = 10) {
    return authenticatorGenerateSecret(numberOfBytes, this.allOptions());
  }
}

exports.Authenticator = Authenticator;
exports.HASH_ALGORITHMS = HASH_ALGORITHMS;
exports.HOTP = HOTP;
exports.KEY_ENCODINGS = KEY_ENCODINGS;
exports.OTP = OTP;
exports.STRATEGY = STRATEGY;
exports.TOTP = TOTP;
exports.authenticatorCheckWithWindow = authenticatorCheckWithWindow;
exports.authenticatorDecoder = authenticatorDecoder;
exports.authenticatorDefaultOptions = authenticatorDefaultOptions;
exports.authenticatorEncoder = authenticatorEncoder;
exports.authenticatorGenerateSecret = authenticatorGenerateSecret;
exports.authenticatorOptionValidator = authenticatorOptionValidator;
exports.authenticatorOptions = authenticatorOptions;
exports.authenticatorToken = authenticatorToken;
exports.createDigestPlaceholder = createDigestPlaceholder;
exports.hotpCheck = hotpCheck;
exports.hotpCounter = hotpCounter;
exports.hotpCreateHmacKey = hotpCreateHmacKey;
exports.hotpDefaultOptions = hotpDefaultOptions;
exports.hotpDigestToToken = hotpDigestToToken;
exports.hotpKeyuri = hotpKeyuri;
exports.hotpOptions = hotpOptions;
exports.hotpOptionsValidator = hotpOptionsValidator;
exports.hotpToken = hotpToken;
exports.isTokenValid = isTokenValid;
exports.keyuri = keyuri;
exports.objectValues = objectValues;
exports.padStart = padStart;
exports.totpCheck = totpCheck;
exports.totpCheckByEpoch = totpCheckByEpoch;
exports.totpCheckWithWindow = totpCheckWithWindow;
exports.totpCounter = totpCounter;
exports.totpCreateHmacKey = totpCreateHmacKey;
exports.totpDefaultOptions = totpDefaultOptions;
exports.totpEpochAvailable = totpEpochAvailable;
exports.totpKeyuri = totpKeyuri;
exports.totpOptions = totpOptions;
exports.totpOptionsValidator = totpOptionsValidator;
exports.totpPadSecret = totpPadSecret;
exports.totpTimeRemaining = totpTimeRemaining;
exports.totpTimeUsed = totpTimeUsed;
exports.totpToken = totpToken;
