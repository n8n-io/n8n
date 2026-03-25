import { Memory, MemorySearchPayload, MemorySearchResult, Session } from "./memory_models";
import DocumentManager from "./document_manager";
import MemoryManager from "./memory_manager";
import UserManager from "./user_manager";
import { IZepClient } from "./interfaces";
/**
 * ZepClient is a Typescript class for interacting with the Zep.
 */
export default class ZepClient implements IZepClient {
    private static constructing;
    baseURL: string;
    headers: any;
    memory: MemoryManager;
    document: DocumentManager;
    user: UserManager;
    /**
     * Constructs a new ZepClient instance.
     * @param {string} baseURL - The base URL of the Zep API.
     * @param {string} [apiKey] - Optional. The API key to use for authentication.
     */
    constructor(baseURL: string, apiKey?: string);
    /**
     * Asynchronously initializes a new instance of the ZepClient class.
     *
     * @param {string} baseURL - The base URL of the Zep API.
     * @param {string} [apiKey] - Optional. The API key to use for authentication.
     * @returns {Promise<ZepClient>} A promise that resolves to a new ZepClient instance.
     * @throws {Error} Throws an error if the server is not running.
     */
    static init(baseURL: string, apiKey?: string): Promise<ZepClient>;
    /**
     * Constructs the full URL for an API endpoint.
     * @param {string} endpoint - The endpoint of the API.
     * @returns {string} The full URL.
     */
    getFullUrl(endpoint: string): string;
    /**
     * Retrieves a session with the specified ID.
     *
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {Promise<Session>} A promise that resolves to the Session object.
     * @throws {Error} Will throw an error if the sessionId is not provided.
     * @throws {Error} Will throw an error if the fetch request fails.
     */
    getSession(sessionId: string): Promise<Session>;
    /**
     * Adds or updates a session.
     *
     * @param {Session} session - The Session object to add or update.
     * @returns {Promise<string>} A promise that resolves to the response text from the server.
     * @throws {Error} Will throw an error if the session is not provided.
     * @throws {Error} Will throw an error if the session.session_id is not provided.
     * @throws {Error} Will throw an error if the fetch request fails.
     */
    addSession(session: Session): Promise<Session>;
    /**
     * Retrieves memory for a specific session.
     * @param {string} sessionID - The ID of the session to retrieve memory for.
     * @param {number} [lastn] - Optional. The number of most recent memories to retrieve.
     * @returns {Promise<Array<Memory>>} - A promise that returns a Memory object.
     */
    getMemory(sessionID: string, lastn?: number): Promise<Memory | null>;
    /**
     * Adds a new memory to a specific session.
     * @param {string} sessionID - The ID of the session to add the memory to.
     * @param {Memory} memory - The memory object to add to the session.
     * @returns {Promise<Memory>} A promise that resolves to the added memory.
     */
    addMemory(sessionID: string, memory: Memory): Promise<string>;
    /**
     * Deletes the memory of a specific session.
     * @param {string} sessionID - The ID of the session for which the memory
     *                             should be deleted.
     * @returns {Promise<string>} - Promise message indicating the memory has
     *                              been deleted.
     */
    deleteMemory(sessionID: string): Promise<string>;
    /**
     * Searches memory of a specific session based on search payload provided.
     * @param {string} sessionID - ID of the session for which the memory should be searched.
     * @param {MemorySearchPayload} searchPayload - The search payload containing
     * the search criteria.
     * @param {number} [limit] - Optional limit on the number of search results returned.
     * @returns {Promise<Array<MemorySearchResult>>} - Promise that resolves to array of search
     * results.
     */
    searchMemory(sessionID: string, searchPayload: MemorySearchPayload, limit?: number): Promise<Array<MemorySearchResult>>;
    private checkServer;
}
