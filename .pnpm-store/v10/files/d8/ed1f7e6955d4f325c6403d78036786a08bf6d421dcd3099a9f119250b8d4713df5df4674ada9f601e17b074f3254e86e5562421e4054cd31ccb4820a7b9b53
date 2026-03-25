import { Memory, MemorySearchPayload, MemorySearchResult, Session } from "./memory_models";
import { IZepClient } from "./interfaces";
export default class MemoryManager {
    client: IZepClient;
    constructor(client: IZepClient);
    /**
     * Retrieves a session with the specified ID.
     *
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {Promise<Session>} A promise that resolves to the Session object.
     * @throws {Error} Will throw an error if the sessionId is not provided.
     * @throws {APIError} Will throw an error if the fetch request fails.
     * @throws {NotFoundError} Will throw an error if the session is not found.
     */
    getSession(sessionId: string): Promise<Session>;
    /**
     * Adds a session.
     *
     * @param {Session} session - The session to add.
     * @returns {Promise<Session>} The added session.
     * @throws {Error} Will throw an error if the session is not provided.
     * @throws {Error} Will throw an error if the session.session_id is not provided.
     * @throws {APIError} Will throw an error if the fetch request fails.
     */
    addSession(session: Session): Promise<Session>;
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
    updateSession(session: Session): Promise<Session>;
    /**
     * Asynchronously retrieve a list of paginated sessions.
     *
     * @param {number} [limit] - Limit the number of results returned.
     * @param {number} [cursor] - Cursor for pagination.
     * @returns {Promise<Array<Session>>} A list of all sessions paginated.
     * @throws {APIError} If the API response format is unexpected.
     */
    listSessions(limit?: number, cursor?: number): Promise<Array<Session>>;
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
    listSessionsChunked(chunkSize?: number): AsyncGenerator<Array<Session>, void, unknown>;
    /**
     * Retrieves memory for a specific session.
     * @param {string} sessionID - The ID of the session to retrieve memory for.
     * @param {number} [lastn] - Optional. The number of most recent memories to retrieve.
     * @returns {Promise<Array<Memory>>} - A promise that returns a Memory object.
     * @throws {APIError} - If the request fails.
     * @throws {NotFoundError} - If the session is not found.
     */
    getMemory(sessionID: string, lastn?: number): Promise<Memory | null>;
    /**
     * Adds a new memory to a specific session.
     * @param {string} sessionID - The ID of the session to add the memory to.
     * @param {Memory} memory - The memory object to add to the session.
     * @returns {Promise<Memory>} A promise that resolves to the added memory.
     * @throws {APIError} If the request fails.
     */
    addMemory(sessionID: string, memory: Memory): Promise<string>;
    /**
     * Deletes the memory of a specific session.
     * @param {string} sessionID - The ID of the session for which the memory
     *                             should be deleted.
     * @returns {Promise<string>} - Promise message indicating the memory has
     *                              been deleted.
     * @throws {APIError} - If the request fails.
     * @throws {NotFoundError} - If the session is not found.
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
     * @throws {APIError} - If the request fails.
     */
    searchMemory(sessionID: string, searchPayload: MemorySearchPayload, limit?: number): Promise<Array<MemorySearchResult>>;
}
