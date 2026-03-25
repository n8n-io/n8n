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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalService = void 0;
const url_1 = require("url");
const http_util_1 = require("../util/http.util");
class GlobalService {
    constructor(baseUri) {
        this.baseUri = baseUri;
    }
    /**
     * Update global settings
     * @param delayDistribution Delay definition
     */
    updateGlobalSettings(delayDefinition) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(this.baseUri, 'settings'), {
                method: 'POST',
                body: JSON.stringify(delayDefinition)
            });
        });
    }
    /**
     * Reset mappings to the default set and reset the request journal
     */
    resetAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(this.baseUri, 'reset'), { method: 'POST' });
        });
    }
    /**
    * Shut down the WireMock server
    */
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(this.baseUri, 'shutdown'), { method: 'POST' });
        });
    }
}
exports.GlobalService = GlobalService;
