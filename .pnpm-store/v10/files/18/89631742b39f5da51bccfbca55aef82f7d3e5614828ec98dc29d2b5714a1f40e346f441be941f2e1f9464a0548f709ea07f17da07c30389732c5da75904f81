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
const document_manager_1 = __importDefault(require("./document_manager"));
const utils_1 = require("./utils");
const memory_manager_1 = __importDefault(require("./memory_manager"));
const user_manager_1 = __importDefault(require("./user_manager"));
/**
 * ZepClient is a Typescript class for interacting with the Zep.
 */
class ZepClient {
    /**
     * Constructs a new ZepClient instance.
     * @param {string} baseURL - The base URL of the Zep API.
     * @param {string} [apiKey] - Optional. The API key to use for authentication.
     */
    constructor(baseURL, apiKey) {
        if (!ZepClient.constructing) {
            (0, utils_1.warnDeprecation)("Please use ZepClient.init(). Calling the ZepClient constructor directly is deprecated.");
        }
        this.baseURL = baseURL;
        this.headers = apiKey
            ? {
                Authorization: `Bearer ${apiKey}`,
            }
            : {};
        this.memory = new memory_manager_1.default(this);
        this.document = new document_manager_1.default(this);
        this.user = new user_manager_1.default(this);
    }
    /**
     * Asynchronously initializes a new instance of the ZepClient class.
     *
     * @param {string} baseURL - The base URL of the Zep API.
     * @param {string} [apiKey] - Optional. The API key to use for authentication.
     * @returns {Promise<ZepClient>} A promise that resolves to a new ZepClient instance.
     * @throws {Error} Throws an error if the server is not running.
     */
    static init(baseURL, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            ZepClient.constructing = true;
            const client = new ZepClient(baseURL, apiKey);
            ZepClient.constructing = false;
            const isRunning = yield client.checkServer();
            if (!isRunning) {
                throw new Error(utils_1.SERVER_ERROR_MESSAGE);
            }
            return client;
        });
    }
    /**
     * Constructs the full URL for an API endpoint.
     * @param {string} endpoint - The endpoint of the API.
     * @returns {string} The full URL.
     */
    getFullUrl(endpoint) {
        const url = new URL(this.baseURL);
        url.pathname = (0, utils_1.joinPaths)(utils_1.API_BASEPATH, endpoint);
        return url.toString();
    }
    /**
     * Retrieves a session with the specified ID.
     *
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {Promise<Session>} A promise that resolves to the Session object.
     * @throws {Error} Will throw an error if the sessionId is not provided.
     * @throws {Error} Will throw an error if the fetch request fails.
     */
    getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.getSession(). getSession()");
            return this.memory.getSession(sessionId);
        });
    }
    /**
     * Adds or updates a session.
     *
     * @param {Session} session - The Session object to add or update.
     * @returns {Promise<string>} A promise that resolves to the response text from the server.
     * @throws {Error} Will throw an error if the session is not provided.
     * @throws {Error} Will throw an error if the session.session_id is not provided.
     * @throws {Error} Will throw an error if the fetch request fails.
     */
    addSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.addSession(). addSession()");
            return this.memory.addSession(session);
        });
    }
    /**
     * Retrieves memory for a specific session.
     * @param {string} sessionID - The ID of the session to retrieve memory for.
     * @param {number} [lastn] - Optional. The number of most recent memories to retrieve.
     * @returns {Promise<Array<Memory>>} - A promise that returns a Memory object.
     */
    getMemory(sessionID, lastn) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.getMemory(). getMemory()");
            return this.memory.getMemory(sessionID, lastn);
        });
    }
    /**
     * Adds a new memory to a specific session.
     * @param {string} sessionID - The ID of the session to add the memory to.
     * @param {Memory} memory - The memory object to add to the session.
     * @returns {Promise<Memory>} A promise that resolves to the added memory.
     */
    addMemory(sessionID, memory) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.addMemory(). addMemory()");
            return this.memory.addMemory(sessionID, memory);
        });
    }
    /**
     * Deletes the memory of a specific session.
     * @param {string} sessionID - The ID of the session for which the memory
     *                             should be deleted.
     * @returns {Promise<string>} - Promise message indicating the memory has
     *                              been deleted.
     */
    deleteMemory(sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.deleteMemory(). deleteMemory()");
            return this.memory.deleteMemory(sessionID);
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
     */
    searchMemory(sessionID, searchPayload, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, utils_1.warnDeprecation)("Please use ZepClient.memory.searchMemory(). searchMemory()");
            return this.memory.searchMemory(sessionID, searchPayload, limit);
        });
    }
    checkServer() {
        return __awaiter(this, void 0, void 0, function* () {
            const healthCheck = "/healthz";
            const healthCheckURL = `${this.baseURL}${healthCheck}`;
            const response = yield fetch(healthCheckURL, { headers: this.headers });
            const zepServerVersion = response.headers.get("X-Zep-Version");
            if (!(0, utils_1.isVersionGreaterOrEqual)(zepServerVersion)) {
                console.warn(utils_1.MIN_SERVER_WARNING_MESSAGE);
            }
            return response.status === 200;
        });
    }
}
ZepClient.constructing = false;
exports.default = ZepClient;
