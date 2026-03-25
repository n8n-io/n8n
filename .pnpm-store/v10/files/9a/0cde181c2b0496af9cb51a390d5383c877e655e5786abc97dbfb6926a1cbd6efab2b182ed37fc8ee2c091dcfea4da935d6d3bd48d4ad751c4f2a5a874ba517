import { User, ICreateUserRequest, IUpdateUserRequest } from "./user_models";
import { Session } from "./memory_models";
import { IZepClient } from "./interfaces";
/**
 * UserManager class handles all user related operations such as
 * adding, getting, updating, deleting, listing users and their sessions.
 * It uses the IZepClient interface to make requests to the server.
 */
export default class UserManager {
    client: IZepClient;
    constructor(client: IZepClient);
    /**
     * Add a new user.
     *
     * @param {ICreateUserRequest} user - The user details to be added.
     * @returns {Promise<User>} A Promise that resolves to a User object.
     * @throws {APIError} If the request fails.
     */
    add(user: ICreateUserRequest): Promise<User>;
    /**
     * Get a user by their ID.
     *
     * @param {string} userId - The ID of the user to be retrieved.
     * @returns {Promise<User>} A Promise that resolves to a User object.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    get(userId: string): Promise<User>;
    /**
     * Update a user's details.
     *
     * @param {IUpdateUserRequest} user - The updated user details.
     * @returns {Promise<User>} A Promise that resolves to a User object with the updated details.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    update(user: IUpdateUserRequest): Promise<User>;
    /**
     * Delete a user by their ID.
     *
     * @param {string} userId - The ID of the user to be deleted.
     * @returns {Promise<string>} A Promise that resolves to a string message confirming deletion.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    delete(userId: string): Promise<string>;
    /**
     * List all users.
     *
     * @param {number} limit - The maximum number of users to return.
     * @param {number} cursor - The index to start listing users from.
     * @returns {Promise<User[]>} A Promise that resolves to an array of User objects.
     * @throws {APIError} If the request fails.
     */
    list(limit?: number, cursor?: number): Promise<User[]>;
    /**
     * Get all sessions for a user.
     *
     * @param {string} userId - The ID of the user to retrieve sessions for.
     * @returns {Promise<Session[]>} A Promise that resolves to an array of Session objects.
     * @throws {NotFoundError} If no sessions are found for the given user ID.
     * @throws {APIError} If the request fails.
     */
    getSessions(userId: string): Promise<Session[]>;
    /**
     * List users in chunks.
     *
     * This method retrieves users in chunks of a specified size.
     * It is a generator function that yields each chunk of users as they are retrieved.
     *
     * @param {number} chunkSize - The size of the user chunks to retrieve. Defaults to 100.
     * @yields {Promise<User[]>} A Promise that resolves to an array of User objects.
     * @throws {APIError} If the request fails.
     */
    listChunked(chunkSize?: number): AsyncGenerator<User[], void, unknown>;
}
