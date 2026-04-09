/* node:coverage disable */
var _a, _b, _c;
import { warn } from './internal/log.js';
// eslint-disable-next-line @typescript-eslint/unbound-method
(_a = Promise.withResolvers) !== null && _a !== void 0 ? _a : (Promise.withResolvers = (warn('Using a polyfill of Promise.withResolvers'),
    function () {
        let _resolve, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _reject;
        const promise = new Promise((resolve, reject) => {
            _resolve = resolve;
            _reject = reject;
        });
        return { promise, resolve: _resolve, reject: _reject };
    }));
// @ts-expect-error 2540
(_b = Symbol['dispose']) !== null && _b !== void 0 ? _b : (Symbol['dispose'] = (warn('Using a polyfill of Symbol.dispose'), Symbol('Symbol.dispose')));
// @ts-expect-error 2540
(_c = Symbol['asyncDispose']) !== null && _c !== void 0 ? _c : (Symbol['asyncDispose'] = (warn('Using a polyfill of Symbol.asyncDispose'), Symbol('Symbol.asyncDispose')));
/* node:coverage enable */
