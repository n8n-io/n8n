import fetchJwks from '../runtime/fetch_jwks.js';
import { JWKSInvalid, JWKSNoMatchingKey } from '../util/errors.js';
import { isJWKSLike, LocalJWKSet } from './local.js';
function isCloudflareWorkers() {
    return (typeof WebSocketPair !== 'undefined' ||
        (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') ||
        (typeof EdgeRuntime !== 'undefined' && EdgeRuntime === 'vercel'));
}
class RemoteJWKSet extends LocalJWKSet {
    constructor(url, options) {
        super({ keys: [] });
        this._jwks = undefined;
        if (!(url instanceof URL)) {
            throw new TypeError('url must be an instance of URL');
        }
        this._url = new URL(url.href);
        this._options = { agent: options === null || options === void 0 ? void 0 : options.agent, headers: options === null || options === void 0 ? void 0 : options.headers };
        this._timeoutDuration =
            typeof (options === null || options === void 0 ? void 0 : options.timeoutDuration) === 'number' ? options === null || options === void 0 ? void 0 : options.timeoutDuration : 5000;
        this._cooldownDuration =
            typeof (options === null || options === void 0 ? void 0 : options.cooldownDuration) === 'number' ? options === null || options === void 0 ? void 0 : options.cooldownDuration : 30000;
        this._cacheMaxAge = typeof (options === null || options === void 0 ? void 0 : options.cacheMaxAge) === 'number' ? options === null || options === void 0 ? void 0 : options.cacheMaxAge : 600000;
    }
    coolingDown() {
        return typeof this._jwksTimestamp === 'number'
            ? Date.now() < this._jwksTimestamp + this._cooldownDuration
            : false;
    }
    fresh() {
        return typeof this._jwksTimestamp === 'number'
            ? Date.now() < this._jwksTimestamp + this._cacheMaxAge
            : false;
    }
    async getKey(protectedHeader, token) {
        if (!this._jwks || !this.fresh()) {
            await this.reload();
        }
        try {
            return await super.getKey(protectedHeader, token);
        }
        catch (err) {
            if (err instanceof JWKSNoMatchingKey) {
                if (this.coolingDown() === false) {
                    await this.reload();
                    return super.getKey(protectedHeader, token);
                }
            }
            throw err;
        }
    }
    async reload() {
        if (this._pendingFetch && isCloudflareWorkers()) {
            this._pendingFetch = undefined;
        }
        this._pendingFetch || (this._pendingFetch = fetchJwks(this._url, this._timeoutDuration, this._options)
            .then((json) => {
            if (!isJWKSLike(json)) {
                throw new JWKSInvalid('JSON Web Key Set malformed');
            }
            this._jwks = { keys: json.keys };
            this._jwksTimestamp = Date.now();
            this._pendingFetch = undefined;
        })
            .catch((err) => {
            this._pendingFetch = undefined;
            throw err;
        }));
        await this._pendingFetch;
    }
}
export function createRemoteJWKSet(url, options) {
    const set = new RemoteJWKSet(url, options);
    return async function (protectedHeader, token) {
        return set.getKey(protectedHeader, token);
    };
}
