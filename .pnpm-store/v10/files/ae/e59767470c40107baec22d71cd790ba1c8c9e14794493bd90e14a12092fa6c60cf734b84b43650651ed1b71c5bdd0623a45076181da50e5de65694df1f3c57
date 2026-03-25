import utils from '../utils.js';
import platform from '../platform/index.js';

export default platform.hasStandardBrowserEnv ?

  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure, sameSite) {
      if (typeof document === 'undefined') return;

      const cookie = [`${name}=${encodeURIComponent(value)}`];

      if (utils.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils.isString(path)) {
        cookie.push(`path=${path}`);
      }
      if (utils.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push('secure');
      }
      if (utils.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }

      document.cookie = cookie.join('; ');
    },

    read(name) {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    },

    remove(name) {
      this.write(name, '', Date.now() - 86400000, '/');
    }
  }

  :

  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {},
    read() {
      return null;
    },
    remove() {}
  };

