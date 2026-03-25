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
exports.HttpUtil = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const json5_1 = require("json5");
const nanoid_1 = require("nanoid");
const https_proxy_agent_1 = __importDefault(require("https-proxy-agent"));
const log_util_1 = require("./log.util");
class HttpUtil {
    static fetch(uri, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = nanoid_1.nanoid();
            const allOptions = Object.assign({ headers: Object.assign({ 'Content-Type': 'application/json' }, HttpUtil.headers) }, options);
            if (HttpUtil.proxy) {
                allOptions.agent = new https_proxy_agent_1.default(HttpUtil.proxy);
                log_util_1.LogUtil.logger().debug(`[${id}] Using proxy: ${HttpUtil.proxy}`);
            }
            try {
                log_util_1.LogUtil.logger().info(`[${id}] Request: [${allOptions.method}] ${uri}`);
                if (allOptions.body !== undefined) {
                    log_util_1.LogUtil.logger().debug(`[${id}] Request body: ${allOptions.body}`);
                }
                const response = yield cross_fetch_1.default(uri, allOptions);
                return this.parseResponse(id, response);
            }
            catch (error) {
                log_util_1.LogUtil.handleError(`[${id}] Error: ${error.message}`);
                return '';
            }
        });
    }
    static parseResponse(id, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const responseLog = `Response: [${response.status}] ${response.statusText}`;
            if (!response.ok) {
                log_util_1.LogUtil.handleError(`[${id}] ${responseLog}`);
            }
            log_util_1.LogUtil.logger().info(`[${id}] ${responseLog}`);
            const responseText = yield response.text();
            try {
                return json5_1.parse(responseText);
            }
            catch (error) {
                return responseText;
            }
        });
    }
}
exports.HttpUtil = HttpUtil;
