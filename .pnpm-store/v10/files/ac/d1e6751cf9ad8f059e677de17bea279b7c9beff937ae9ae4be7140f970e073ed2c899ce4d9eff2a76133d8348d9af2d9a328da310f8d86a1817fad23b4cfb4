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
exports.RequestService = void 0;
const url_1 = require("url");
const http_util_1 = require("../util/http.util");
class RequestService {
    constructor(baseUri) {
        this.baseUri = url_1.resolve(baseUri, 'requests');
    }
    /**
     * Get all requests in journal
     */
    getAllRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, { method: 'GET' });
        });
    }
    /**
     * Delete all requests in journal
     */
    deleteAllRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, { method: 'DELETE' });
        });
    }
    /**
     * Get request by ID
     * @param id The UUID of the logged request
     */
    getRequest(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, uuid), { method: 'GET' });
        });
    }
    /**
     * Delete request by ID
     * @param id The UUID of the logged request
     */
    deleteRequest(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, uuid), { method: 'DELETE' });
        });
    }
    /**
     * Empty the request journal
     */
    resetAllRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'reset'), { method: 'POST' });
        });
    }
    /**
     * Count requests by criteria
     * @param id The UUID of the logged request
     */
    getCount(requestPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'count'), {
                method: 'POST',
                body: JSON.stringify(requestPattern)
            });
        });
    }
    /**
     * Remove requests by criteria
     * @param requestPattern Request pattern as filter criteria
     */
    removeRequests(requestPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'remove'), {
                method: 'POST',
                body: JSON.stringify(requestPattern)
            });
        });
    }
    /**
     * Delete requests mappings matching metadata
     * @param contentPattern Content pattern (metadata) as filter criteria
     */
    removeRequestsByMetadata(contentPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'remove-by-metadata'), {
                method: 'POST',
                body: JSON.stringify(contentPattern)
            });
        });
    }
    /**
     * Retrieve details of requests logged in the journal matching the specified criteria
     * @param requestPattern Request pattern as filter criteria
     */
    findRequests(requestPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'find'), {
                method: 'POST',
                body: JSON.stringify(requestPattern)
            });
        });
    }
    /**
     * Get details of logged requests that were not matched by any stub mapping
     */
    getUnmatchedRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'unmatched'), { method: 'GET' });
        });
    }
    /**
     * Retrieve near-misses for all unmatched requests
     */
    getUnmatchedNearMisses() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'unmatched/near-misses'), { method: 'GET' });
        });
    }
    /**
     * Find at most 3 near misses for closest stub mappings to the specified request
     * @param loggedRequest Logged request as filter criteria
     */
    getNearMissesByRequest(loggedRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'near-misses/request'), {
                method: 'POST',
                body: JSON.stringify(loggedRequest)
            });
        });
    }
    /**
     * Find at most 3 near misses for closest logged requests to the specified request pattern
     * @param requestPattern Request pattern as filter criteria
     */
    getNearMissesByRequestPattern(requestPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'near-misses/request-pattern'), {
                method: 'POST',
                body: JSON.stringify(requestPattern)
            });
        });
    }
}
exports.RequestService = RequestService;
