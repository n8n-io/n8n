/**
 * @otplib/preset-v11
 *
 * @author Gerald Yeo <contact@fusedthought.com>
 * @version: 12.0.1
 * @license: MIT
 **/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var pluginCrypto = require('@otplib/plugin-crypto');
var pluginThirtyTwo = require('@otplib/plugin-thirty-two');
var core = require('@otplib/core');

function epochUnixToJS(opt = {}) {
  if (!opt || typeof opt !== 'object') {
    return {};
  }
  const {
    epoch,
    ...others
  } = opt;
  if (epoch === null) {
    return others;
  }
  if (typeof epoch === 'number') {
    return { ...opt,
      epoch: opt.epoch * 1000
    };
  }
  return opt;
}
function epochJSToUnix(opt = {}) {
  if (!opt || typeof opt !== 'object') {
    return {};
  }
  const {
    epoch,
    ...others
  } = opt;
  if (epoch === null) {
    return others;
  }
  if (typeof epoch === 'number') {
    return { ...opt,
      epoch: epoch / 1000
    };
  }
  return opt;
}
function createV11(Base, legacyOptions) {
  class Legacy extends Base {
    constructor(defaultOptions = {}) {
      super(epochUnixToJS({ ...legacyOptions,
        ...defaultOptions
      }));
      console.warn(Base.name, 'initialised with v11.x adapter');
    }
    static get name() {
      return Base.name;
    }
    set options(opt = {}) {
      console.warn(Base.name, '.options setter will remove UNIX epoch if it is set to null.' + '\n Do note that library versions above v11.x uses JavaScript epoch.');
      super.options = epochUnixToJS(opt);
    }
    get options() {
      console.warn(Base.name, '.options getter will remove epoch if it is set to null' + '\n Do note that library versions above v11.x uses JavaScript epoch.');
      return epochJSToUnix(super.options);
    }
    get defaultOptions() {
      console.warn(Base.name, '.defaultOptions getter has been deprecated in favour of the .options getter' + '\n\n The .options getter now returns the combined defaultOptions and options values' + 'instead of setting options when adding defaultOptions.');
      return Object.freeze(epochJSToUnix(this._defaultOptions));
    }
    set defaultOptions(opt) {
      console.warn(Base.name, '.defaultOptions setter has been deprecated in favour of the .clone(defaultOptions) method');
      this._defaultOptions = Object.freeze({ ...this._defaultOptions,
        ...epochUnixToJS(opt)
      });
    }
    get optionsAll() {
      console.warn(Base.name, '.optionsAll getter has been deprecated in favour of the .allOptions() method.' + '\n That epoch returned here will be in Unix Epoch, while .allOptions()' + ' will return JavaScript epoch.' + '\n Do note that library versions above v11.x uses JavaScript epoch.');
      return epochJSToUnix(this.allOptions());
    }
    allOptions() {
      return epochUnixToJS(super.allOptions());
    }
    getClass() {
      return Legacy;
    }
    verify(opts) {
      if (!opts || typeof opts !== 'object') {
        return false;
      }
      try {
        return super.verify(opts);
      } catch (err) {
        return false;
      }
    }
  }
  Legacy.prototype[Base.name] = Legacy;
  return Legacy;
}
const HOTP = createV11(core.HOTP, {});
const TOTP = createV11(core.TOTP, {
  epoch: null,
  step: 30,
  window: 0
});
const Authenticator = createV11(core.Authenticator, {
  encoding: 'hex',
  epoch: null,
  step: 30,
  window: 0
});

const hotp = new HOTP({
  createDigest: pluginCrypto.createDigest
});
const totp = new TOTP({
  createDigest: pluginCrypto.createDigest
});
const authenticator = new Authenticator({
  createDigest: pluginCrypto.createDigest,
  createRandomBytes: pluginCrypto.createRandomBytes,
  keyEncoder: pluginThirtyTwo.keyEncoder,
  keyDecoder: pluginThirtyTwo.keyDecoder
});

exports.authenticator = authenticator;
exports.hotp = hotp;
exports.totp = totp;
