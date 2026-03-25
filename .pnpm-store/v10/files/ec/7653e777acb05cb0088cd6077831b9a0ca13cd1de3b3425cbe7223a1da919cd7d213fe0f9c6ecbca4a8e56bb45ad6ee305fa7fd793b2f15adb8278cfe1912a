"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const DataSource_1 = require("../data-source/DataSource");
const ConnectionNotFoundError_1 = require("../error/ConnectionNotFoundError");
const AlreadyHasActiveConnectionError_1 = require("../error/AlreadyHasActiveConnectionError");
/**
 * ConnectionManager is used to store and manage multiple orm connections.
 * It also provides useful factory methods to simplify connection creation.
 *
 * @deprecated
 */
class ConnectionManager {
    constructor() {
        /**
         * Internal lookup to quickly get from a connection name to the Connection object.
         */
        this.connectionMap = new Map();
    }
    /**
     * List of connections registered in this connection manager.
     */
    get connections() {
        return Array.from(this.connectionMap.values());
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Checks if connection with the given name exist in the manager.
     */
    has(name) {
        return this.connectionMap.has(name);
    }
    /**
     * Gets registered connection with the given name.
     * If connection name is not given then it will get a default connection.
     * Throws error if connection with the given name was not found.
     */
    get(name = "default") {
        const connection = this.connectionMap.get(name);
        if (!connection)
            throw new ConnectionNotFoundError_1.ConnectionNotFoundError(name);
        return connection;
    }
    /**
     * Creates a new connection based on the given connection options and registers it in the manager.
     * Connection won't be established, you'll need to manually call connect method to establish connection.
     */
    create(options) {
        // check if such connection is already registered
        const existConnection = this.connectionMap.get(options.name || "default");
        if (existConnection) {
            // if connection is registered and its not closed then throw an error
            if (existConnection.isInitialized)
                throw new AlreadyHasActiveConnectionError_1.AlreadyHasActiveConnectionError(options.name || "default");
        }
        // create a new connection
        const connection = new DataSource_1.DataSource(options);
        this.connectionMap.set(connection.name, connection);
        return connection;
    }
}
exports.ConnectionManager = ConnectionManager;

//# sourceMappingURL=ConnectionManager.js.map
