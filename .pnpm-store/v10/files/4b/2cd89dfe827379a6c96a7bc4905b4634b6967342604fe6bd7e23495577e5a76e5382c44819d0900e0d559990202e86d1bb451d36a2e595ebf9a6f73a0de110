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
const user_models_1 = require("./user_models");
const memory_models_1 = require("./memory_models");
const utils_1 = require("./utils");
/**
 * UserManager class handles all user related operations such as
 * adding, getting, updating, deleting, listing users and their sessions.
 * It uses the IZepClient interface to make requests to the server.
 */
class UserManager {
    constructor(client) {
        this.client = client;
    }
    /**
     * Add a new user.
     *
     * @param {ICreateUserRequest} user - The user details to be added.
     * @returns {Promise<User>} A Promise that resolves to a User object.
     * @throws {APIError} If the request fails.
     */
    add(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const newUserRequest = new user_models_1.CreateUserRequest(user);
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/user`), {
                method: "POST",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(newUserRequest.toDict()),
            }), `Failed to add user ${user.user_id}`);
            const responseData = yield response.json();
            return new user_models_1.User(responseData);
        });
    }
    /**
     * Get a user by their ID.
     *
     * @param {string} userId - The ID of the user to be retrieved.
     * @returns {Promise<User>} A Promise that resolves to a User object.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    get(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/user/${userId}`), {
                headers: this.client.headers,
            }), `No user found for userId ${userId}`);
            const responseData = yield response.json();
            return new user_models_1.User(responseData);
        });
    }
    /**
     * Update a user's details.
     *
     * @param {IUpdateUserRequest} user - The updated user details.
     * @returns {Promise<User>} A Promise that resolves to a User object with the updated details.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    update(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const newUserUpdate = new user_models_1.UpdateUserRequest(user);
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/user/${user.user_id}`), {
                method: "PATCH",
                headers: Object.assign(Object.assign({}, this.client.headers), { "Content-Type": "application/json" }),
                body: JSON.stringify(newUserUpdate.toDict()),
            }), `Failed to update user ${user.user_id}`);
            const responseData = yield response.json();
            return new user_models_1.User(responseData);
        });
    }
    /**
     * Delete a user by their ID.
     *
     * @param {string} userId - The ID of the user to be deleted.
     * @returns {Promise<string>} A Promise that resolves to a string message confirming deletion.
     * @throws {NotFoundError} If the request no user is found for the given ID.
     * @throws {APIError} If the request fails.
     */
    delete(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/user/${userId}`), {
                method: "DELETE",
                headers: this.client.headers,
            }), `Failed to delete user ${userId}`);
            return response.text();
        });
    }
    /**
     * List all users.
     *
     * @param {number} limit - The maximum number of users to return.
     * @param {number} cursor - The index to start listing users from.
     * @returns {Promise<User[]>} A Promise that resolves to an array of User objects.
     * @throws {APIError} If the request fails.
     */
    list(limit, cursor) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = new URLSearchParams();
            if (limit !== undefined)
                params.append("limit", limit.toString());
            if (cursor !== undefined)
                params.append("cursor", cursor.toString());
            const response = yield (0, utils_1.handleRequest)(fetch(`${this.client.getFullUrl("/user")}?${params.toString()}`, {
                headers: this.client.headers,
            }));
            const data = yield response.json();
            return data.map((user) => new user_models_1.User(user));
        });
    }
    /**
     * Get all sessions for a user.
     *
     * @param {string} userId - The ID of the user to retrieve sessions for.
     * @returns {Promise<Session[]>} A Promise that resolves to an array of Session objects.
     * @throws {NotFoundError} If no sessions are found for the given user ID.
     * @throws {APIError} If the request fails.
     */
    getSessions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, utils_1.handleRequest)(fetch(this.client.getFullUrl(`/user/${userId}/sessions`), {
                headers: this.client.headers,
            }), `No sessions found for userId ${userId}`);
            const data = yield response.json();
            return data.map((session) => new memory_models_1.Session(session));
        });
    }
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
    listChunked(chunkSize = 100) {
        return __asyncGenerator(this, arguments, function* listChunked_1() {
            let cursor;
            while (true) {
                // eslint-disable-next-line no-await-in-loop
                const users = yield __await(this.list(chunkSize, cursor));
                if (users.length === 0) {
                    // We've reached the last page
                    break;
                }
                yield yield __await(users);
                if (cursor === undefined) {
                    cursor = 0;
                }
                cursor += chunkSize;
            }
        });
    }
}
exports.default = UserManager;
