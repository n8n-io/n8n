"use strict";
/**
 * (C) Copyright IBM Corp. 2022, 2023.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCookieInterceptor = void 0;
var axios_1 = require("axios");
var extend_1 = __importDefault(require("extend"));
var tough_cookie_1 = require("tough-cookie");
var logger_1 = __importDefault(require("./logger"));
var internalCreateCookieInterceptor = function (cookieJar) {
    /**
     * This is called by Axios when a request is about to be sent in order to
     * set the "cookie" header in the request.
     *
     * @param config the Axios request config
     * @returns the request config
     */
    function requestInterceptor(config) {
        return __awaiter(this, void 0, void 0, function () {
            var cookieHeaderValue, cookieHeader;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.default.debug('CookieInterceptor: intercepting request');
                        if (!(config && config.url)) return [3 /*break*/, 2];
                        logger_1.default.debug("CookieInterceptor: getting cookies for: ".concat(config.url));
                        return [4 /*yield*/, cookieJar.getCookieString(config.url)];
                    case 1:
                        cookieHeaderValue = _a.sent();
                        if (cookieHeaderValue) {
                            logger_1.default.debug('CookieInterceptor: setting cookie header');
                            cookieHeader = { cookie: cookieHeaderValue };
                            config.headers = (0, extend_1.default)(true, {}, config.headers, cookieHeader);
                        }
                        else {
                            logger_1.default.debug("CookieInterceptor: no cookies for: ".concat(config.url));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        logger_1.default.debug('CookieInterceptor: no request URL.');
                        _a.label = 3;
                    case 3: return [2 /*return*/, config];
                }
            });
        });
    }
    /**
     * This is called by Axios when a 2xx response has been received.
     * We'll invoke the configured cookie jar's setCookie() method to handle
     * the "set-cookie" header.
     * @param response the Axios response object
     * @returns the response object
     */
    function responseInterceptor(response) {
        return __awaiter(this, void 0, void 0, function () {
            var cookies;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.default.debug('CookieInterceptor: intercepting response to check for set-cookie headers.');
                        if (!(response && response.headers)) return [3 /*break*/, 4];
                        cookies = response.headers['set-cookie'];
                        if (!cookies) return [3 /*break*/, 2];
                        logger_1.default.debug("CookieInterceptor: setting cookies in jar for URL ".concat(response.config.url, "."));
                        // Write cookies sequentially by chaining the promises in a reduce
                        return [4 /*yield*/, cookies.reduce(function (cookiePromise, cookie) {
                                return cookiePromise.then(function () { return cookieJar.setCookie(cookie, response.config.url); });
                            }, Promise.resolve(null))];
                    case 1:
                        // Write cookies sequentially by chaining the promises in a reduce
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        logger_1.default.debug('CookieInterceptor: no set-cookie headers.');
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        logger_1.default.debug('CookieInterceptor: no response headers.');
                        _a.label = 5;
                    case 5: return [2 /*return*/, response];
                }
            });
        });
    }
    /**
     * This is called by Axios when a non-2xx response has been received.
     * We'll simply delegate to the "responseInterceptor" method since we want to
     * do the same cookie handling as for a success response.
     * @param error the Axios error object that describes the non-2xx response
     * @returns the error object
     */
    function responseRejected(error) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.default.debug('CookieIntercepter: intercepting error response');
                        if (!((0, axios_1.isAxiosError)(error) && error.response)) return [3 /*break*/, 2];
                        logger_1.default.debug('CookieIntercepter: delegating to responseInterceptor()');
                        return [4 /*yield*/, responseInterceptor(error.response)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        logger_1.default.debug('CookieInterceptor: no response field in error object, skipping...');
                        _a.label = 3;
                    case 3: return [2 /*return*/, Promise.reject(error)];
                }
            });
        });
    }
    return function (axios) {
        axios.interceptors.request.use(requestInterceptor);
        axios.interceptors.response.use(responseInterceptor, responseRejected);
    };
};
var createCookieInterceptor = function (cookieJar) {
    if (cookieJar) {
        if (cookieJar === true) {
            logger_1.default.debug('CookieInterceptor: creating new CookieJar');
            return internalCreateCookieInterceptor(new tough_cookie_1.CookieJar());
        }
        else {
            logger_1.default.debug('CookieInterceptor: using supplied CookieJar');
            return internalCreateCookieInterceptor(cookieJar);
        }
    }
    else {
        throw new Error('Must supply a cookie jar or true.');
    }
};
exports.createCookieInterceptor = createCookieInterceptor;
