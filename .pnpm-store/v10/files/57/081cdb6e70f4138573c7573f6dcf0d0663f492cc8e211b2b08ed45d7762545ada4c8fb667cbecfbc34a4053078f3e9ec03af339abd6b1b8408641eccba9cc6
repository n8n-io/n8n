"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineWorkflow = void 0;
const promises_1 = require("timers/promises");
const utils_1 = require("../../../utils");
const command_builders_1 = require("./command_builders");
/** The time to throttle callback calls. */
const THROTTLE_MS = 100;
/**
 * Common behaviour for OIDC machine workflows.
 * @internal
 */
class MachineWorkflow {
    /**
     * Instantiate the machine workflow.
     */
    constructor(cache) {
        this.cache = cache;
        this.callback = this.withLock(this.getToken.bind(this));
        this.lastExecutionTime = Date.now() - THROTTLE_MS;
    }
    /**
     * Execute the workflow. Gets the token from the subclass implementation.
     */
    async execute(connection, credentials) {
        const token = await this.getTokenFromCacheOrEnv(connection, credentials);
        const command = (0, command_builders_1.finishCommandDocument)(token);
        await connection.command((0, utils_1.ns)(credentials.source), command, undefined);
    }
    /**
     * Reauthenticate on a machine workflow just grabs the token again since the server
     * has said the current access token is invalid or expired.
     */
    async reauthenticate(connection, credentials) {
        if (this.cache.hasAccessToken) {
            // Reauthentication implies the token has expired.
            if (connection.accessToken === this.cache.getAccessToken()) {
                // If connection's access token is the same as the cache's, remove
                // the token from the cache and connection.
                this.cache.removeAccessToken();
                delete connection.accessToken;
            }
            else {
                // If the connection's access token is different from the cache's, set
                // the cache's token on the connection and do not remove from the
                // cache.
                connection.accessToken = this.cache.getAccessToken();
            }
        }
        await this.execute(connection, credentials);
    }
    /**
     * Get the document to add for speculative authentication.
     */
    async speculativeAuth(connection, credentials) {
        // The spec states only cached access tokens can use speculative auth.
        if (!this.cache.hasAccessToken) {
            return {};
        }
        const token = await this.getTokenFromCacheOrEnv(connection, credentials);
        const document = (0, command_builders_1.finishCommandDocument)(token);
        document.db = credentials.source;
        return { speculativeAuthenticate: document };
    }
    /**
     * Get the token from the cache or environment.
     */
    async getTokenFromCacheOrEnv(connection, credentials) {
        if (this.cache.hasAccessToken) {
            return this.cache.getAccessToken();
        }
        else {
            const token = await this.callback(credentials);
            this.cache.put({ accessToken: token.access_token, expiresInSeconds: token.expires_in });
            // Put the access token on the connection as well.
            connection.accessToken = token.access_token;
            return token.access_token;
        }
    }
    /**
     * Ensure the callback is only executed one at a time, and throttled to
     * only once per 100ms.
     */
    withLock(callback) {
        let lock = Promise.resolve();
        return async (credentials) => {
            // We do this to ensure that we would never return the result of the
            // previous lock, only the current callback's value would get returned.
            await lock;
            lock = lock
                .catch(() => null)
                .then(async () => {
                const difference = Date.now() - this.lastExecutionTime;
                if (difference <= THROTTLE_MS) {
                    await (0, promises_1.setTimeout)(THROTTLE_MS - difference);
                }
                this.lastExecutionTime = Date.now();
                return await callback(credentials);
            });
            return await lock;
        };
    }
}
exports.MachineWorkflow = MachineWorkflow;
//# sourceMappingURL=machine_workflow.js.map