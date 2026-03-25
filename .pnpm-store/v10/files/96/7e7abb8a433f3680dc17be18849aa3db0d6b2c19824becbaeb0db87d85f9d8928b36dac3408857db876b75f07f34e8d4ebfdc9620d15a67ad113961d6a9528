"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestAdapter = void 0;
const debug_1 = __importDefault(require("debug"));
const url_1 = require("url");
const debug = (0, debug_1.default)("opconnect:requests");
class RequestAdapter {
    constructor(client, opts) {
        if (!opts.serverURL || !opts.token) {
            throw TypeError("Options serverURL and token are required.");
        }
        this.baseURL = new url_1.URL(opts.serverURL);
        this.token = opts.token;
        this.client = client;
    }
    /**
     * Delegate request call to client implementation.
     *
     * In the future this function may apply middleware.
     *
     * @param method
     * @param path
     * @param {RequestOptions} opts
     * @returns {Promise<Response>}
     */
    sendRequest(method, path, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            // The client implementation *must* accept the `authToken` option and
            // provide it as an Authorization header
            const clientOptions = Object.assign(Object.assign({}, opts), { authToken: this.token });
            debug("Sending request - %s %s", method.toUpperCase(), path);
            return this.client.request(method, this.normalizeURL(path), clientOptions);
        });
    }
    /**
     * Prevent double slash (//) and other mishaps
     *
     * @param {string} path
     * @returns {string}
     * @private
     */
    normalizeURL(path) {
        const { href: normalizedURL } = new url_1.URL(path, this.baseURL);
        debug("formatted url: %s", normalizedURL);
        return normalizedURL;
    }
}
exports.RequestAdapter = RequestAdapter;
//# sourceMappingURL=requests.js.map