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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const memory_models_1 = require("./memory_models");
const utils_1 = require("./utils");
class MemoryManager {
    constructor(client) {
        this.client = client;
    }
    /**
     * Retrieves a session with the specified ID.
     *
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {Promise<Session>} A promise that resolves to the Session object.
     * @throws {Error} Will throw an error if the sessionId is not provided.
     * @throws {APIError} Will throw an error if the fetch request fails.
     * @throws {NotFoundError} Will throw an error if the session is not found.
     */
    getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!sessionId || sessionId.trim() === "") {
                throw new Error("sessionId must be provided");
            }
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/sessions/${sessionId}`), {
                headers: this.client.headers,
            }), `No session found for session ${sessionId}`);
            const responseData = yield response.json();
            return new memory_models_1.Session(responseData);
        });
    }
    /**
     * Adds a session.
     *
     * @param {Session} session - The session to add.
     * @returns {Promise<Session>} The added session.
     * @throws {Error} Will throw an error if the session is not provided.
     * @throws {Error} Will throw an error if the session.session_id is not provided.
     * @throws {APIError} Will throw an error if the fetch request fails.
     */
    addSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!session) {
                throw new Error("session must be provided");
            }
            if (!session.session_id || session.session_id.trim() === "") {
                throw new Error("session.session_id must be provided");
            }
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/sessions`), {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(session.toDict()),
            }), `Failed to add session ${session.session_id}`);
            const responseData = yield response.json();
            return new memory_models_1.Session(responseData);
        });
    }
    /**
     * Updates the specified session.
     *
     * @param {Session} session - The session data to update.
     * @returns {Promise<Session>} The updated session.
     * @throws {Error} Will throw an error if the session is not provided.
     * @throws {Error} Will throw an error if the session.session_id is not provided.
     * @throws {APIError} Will throw an error if the fetch request fails.
     * @throws {NotFoundError} Will throw an error if the session is not found.
     */
    updateSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!session) {
                throw new Error("session must be provided");
            }
            if (!session.session_id || session.session_id.trim() === "") {
                throw new Error("session.session_id must be provided");
            }
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/sessions/${session.session_id}`), {
                method: "PATCH",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(session.toDict()),
            }), `Failed to update session ${session.session_id}`);
            const responseData = yield response.json();
            return new memory_models_1.Session(responseData);
        });
    }
    /**
     * Asynchronously retrieve a list of paginated sessions.
     *
     * @param {number} [limit] - Limit the number of results returned.
     * @param {number} [cursor] - Cursor for pagination.
     * @returns {Promise<Array<Session>>} A list of all sessions paginated.
     * @throws {APIError} If the API response format is unexpected.
     */
    listSessions(limit, cursor) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = new URLSearchParams();
            if (limit !== undefined)
                params.append("limit", limit.toString());
            if (cursor !== undefined)
                params.append("cursor", cursor.toString());
            const response = yield (0, utils_1.handleRequest)(fetch(`${this.client.getFullUrl("/sessions")}?${params.toString()}`, {
                headers: this.client.headers,
            }), `Failed to get sessions`);
            const responseData = yield response.json();
            return responseData.map((session) => new memory_models_1.Session(session));
        });
    }
    /**
     * Retrieve all sessions, handling pagination automatically.
     * Yields a generator of lists of sessions.
     *
     * @param {number} [chunkSize=100] - The number of sessions to retrieve at a time.
     * @returns {AsyncGenerator<Array<Session>, void, unknown>}
     *    The next chunk of sessions from the server.
     * @throws {APIError} If the API response format is unexpected.
     * @throws {ConnectionError} If the connection to the server fails.
     */
    listSessionsChunked(chunkSize = 100) {
        return __asyncGenerator(this, arguments, function* listSessionsChunked_1() {
            let cursor;
            while (true) {
                // eslint-disable-next-line no-await-in-loop
                const sessions = yield __await(this.listSessions(chunkSize, cursor));
                if (sessions.length === 0) {
                    // We've reached the last page
                    break;
                }
                yield yield __await(sessions);
                if (cursor === undefined) {
                    cursor = 0;
                }
                cursor += chunkSize;
            }
        });
    }
    /**
     * Retrieves memory for a specific session.
     * @param {string} sessionID - The ID of the session to retrieve memory for.
     * @param {number} [lastn] - Optional. The number of most recent memories to retrieve.
     * @returns {Promise<Array<Memory>>} - A promise that returns a Memory object.
     * @throws {APIError} - If the request fails.
     * @throws {NotFoundError} - If the session is not found.
     */
    getMemory(sessionID, lastn) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.client.getFullUrl(`/sessions/${sessionID}/memory`);
            const params = lastn !== undefined ? `?lastn=${lastn}` : "";
            const response = yield (0, utils_1.handleRequest)(fetch(`${url}${params}`, {
                headers: this.client.headers,
            }));
            const data = yield response.json();
            if (data.messages) {
                return new memory_models_1.Memory({
                    messages: data.messages.map((message) => {
                        return new memory_models_1.Message(message);
                    }),
                    summary: data.summary,
                });
            }
            return null;
        });
    }
    /**
     * Adds a new memory to a specific session.
     * @param {string} sessionID - The ID of the session to add the memory to.
     * @param {Memory} memory - The memory object to add to the session.
     * @returns {Promise<Memory>} A promise that resolves to the added memory.
     * @throws {APIError} If the request fails.
     */
    addMemory(sessionID, memory) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.client.getFullUrl(`/sessions/${sessionID}/memory`);
            const response = yield (0, utils_1.handleRequest)(fetch(url, {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(memory.toDict()),
            }), `Memory not found for session ${sessionID}.`);
            return response.text();
        });
    }
    /**
     * Deletes the memory of a specific session.
     * @param {string} sessionID - The ID of the session for which the memory
     *                             should be deleted.
     * @returns {Promise<string>} - Promise message indicating the memory has
     *                              been deleted.
     * @throws {APIError} - If the request fails.
     * @throws {NotFoundError} - If the session is not found.
     */
    deleteMemory(sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.client.getFullUrl(`/sessions/${sessionID}/memory`);
            const response = yield (0, utils_1.handleRequest)(fetch(url, {
                method: "DELETE",
                headers: this.client.headers,
            }), `No session found for sessionID: ${sessionID}`);
            return response.text();
        });
    }
    /**
     * Searches memory of a specific session based on search payload provided.
     * @param {string} sessionID - ID of the session for which the memory should be searched.
     * @param {MemorySearchPayload} searchPayload - The search payload containing
     * the search criteria.
     * @param {number} [limit] - Optional limit on the number of search results returned.
     * @returns {Promise<Array<MemorySearchResult>>} - Promise that resolves to array of search
     * results.
     * @throws {APIError} - If the request fails.
     */
    searchMemory(sessionID, searchPayload, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.client.getFullUrl(`/sessions/${sessionID}/search`);
            const params = limit !== undefined ? `?limit=${limit}` : "";
            const response = yield (0, utils_1.handleRequest)(fetch(`${url}${params}`, {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(searchPayload),
            }));
            const data = yield response.json();
            return data.map((searchResult) => new memory_models_1.MemorySearchResult(searchResult));
        });
    }
}
exports.default = MemoryManager;
