"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoClient = exports.ServerApiVersion = void 0;
const fs_1 = require("fs");
const bson_1 = require("./bson");
const change_stream_1 = require("./change_stream");
const mongo_credentials_1 = require("./cmap/auth/mongo_credentials");
const providers_1 = require("./cmap/auth/providers");
const connection_string_1 = require("./connection_string");
const constants_1 = require("./constants");
const db_1 = require("./db");
const error_1 = require("./error");
const mongo_client_auth_providers_1 = require("./mongo_client_auth_providers");
const mongo_logger_1 = require("./mongo_logger");
const mongo_types_1 = require("./mongo_types");
const executor_1 = require("./operations/client_bulk_write/executor");
const execute_operation_1 = require("./operations/execute_operation");
const run_command_1 = require("./operations/run_command");
const read_preference_1 = require("./read_preference");
const resource_management_1 = require("./resource_management");
const server_selection_1 = require("./sdam/server_selection");
const topology_1 = require("./sdam/topology");
const sessions_1 = require("./sessions");
const utils_1 = require("./utils");
/** @public */
exports.ServerApiVersion = Object.freeze({
    v1: '1'
});
/** @internal */
const kOptions = Symbol('options');
/**
 * The **MongoClient** class is a class that allows for making Connections to MongoDB.
 * @public
 *
 * @remarks
 * The programmatically provided options take precedence over the URI options.
 *
 * @example
 * ```ts
 * import { MongoClient } from 'mongodb';
 *
 * // Enable command monitoring for debugging
 * const client = new MongoClient('mongodb://localhost:27017', { monitorCommands: true });
 *
 * client.on('commandStarted', started => console.log(started));
 * client.db().collection('pets');
 * await client.insertOne({ name: 'spot', kind: 'dog' });
 * ```
 */
class MongoClient extends mongo_types_1.TypedEventEmitter {
    constructor(url, options) {
        super();
        this[kOptions] = (0, connection_string_1.parseOptions)(url, this, options);
        const shouldSetLogger = Object.values(this[kOptions].mongoLoggerOptions.componentSeverities).some(value => value !== mongo_logger_1.SeverityLevel.OFF);
        this.mongoLogger = shouldSetLogger
            ? new mongo_logger_1.MongoLogger(this[kOptions].mongoLoggerOptions)
            : undefined;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const client = this;
        // The internal state
        this.s = {
            url,
            bsonOptions: (0, bson_1.resolveBSONOptions)(this[kOptions]),
            namespace: (0, utils_1.ns)('admin'),
            hasBeenClosed: false,
            sessionPool: new sessions_1.ServerSessionPool(this),
            activeSessions: new Set(),
            authProviders: new mongo_client_auth_providers_1.MongoClientAuthProviders(),
            get options() {
                return client[kOptions];
            },
            get readConcern() {
                return client[kOptions].readConcern;
            },
            get writeConcern() {
                return client[kOptions].writeConcern;
            },
            get readPreference() {
                return client[kOptions].readPreference;
            },
            get isMongoClient() {
                return true;
            }
        };
        this.checkForNonGenuineHosts();
    }
    /** @internal */
    async asyncDispose() {
        await this.close();
    }
    /** @internal */
    checkForNonGenuineHosts() {
        const documentDBHostnames = this[kOptions].hosts.filter((hostAddress) => (0, utils_1.isHostMatch)(utils_1.DOCUMENT_DB_CHECK, hostAddress.host));
        const srvHostIsDocumentDB = (0, utils_1.isHostMatch)(utils_1.DOCUMENT_DB_CHECK, this[kOptions].srvHost);
        const cosmosDBHostnames = this[kOptions].hosts.filter((hostAddress) => (0, utils_1.isHostMatch)(utils_1.COSMOS_DB_CHECK, hostAddress.host));
        const srvHostIsCosmosDB = (0, utils_1.isHostMatch)(utils_1.COSMOS_DB_CHECK, this[kOptions].srvHost);
        if (documentDBHostnames.length !== 0 || srvHostIsDocumentDB) {
            this.mongoLogger?.info('client', utils_1.DOCUMENT_DB_MSG);
        }
        else if (cosmosDBHostnames.length !== 0 || srvHostIsCosmosDB) {
            this.mongoLogger?.info('client', utils_1.COSMOS_DB_MSG);
        }
    }
    /** @see MongoOptions */
    get options() {
        return Object.freeze({ ...this[kOptions] });
    }
    get serverApi() {
        return this[kOptions].serverApi && Object.freeze({ ...this[kOptions].serverApi });
    }
    /**
     * Intended for APM use only
     * @internal
     */
    get monitorCommands() {
        return this[kOptions].monitorCommands;
    }
    set monitorCommands(value) {
        this[kOptions].monitorCommands = value;
    }
    /** @internal */
    get autoEncrypter() {
        return this[kOptions].autoEncrypter;
    }
    get readConcern() {
        return this.s.readConcern;
    }
    get writeConcern() {
        return this.s.writeConcern;
    }
    get readPreference() {
        return this.s.readPreference;
    }
    get bsonOptions() {
        return this.s.bsonOptions;
    }
    get timeoutMS() {
        return this.s.options.timeoutMS;
    }
    /**
     * Executes a client bulk write operation, available on server 8.0+.
     * @param models - The client bulk write models.
     * @param options - The client bulk write options.
     * @returns A ClientBulkWriteResult for acknowledged writes and ok: 1 for unacknowledged writes.
     */
    async bulkWrite(models, options) {
        if (this.autoEncrypter) {
            throw new error_1.MongoInvalidArgumentError('MongoClient bulkWrite does not currently support automatic encryption.');
        }
        // We do not need schema type information past this point ("as any" is fine)
        return await new executor_1.ClientBulkWriteExecutor(this, models, (0, utils_1.resolveOptions)(this, options)).execute();
    }
    /**
     * Connect to MongoDB using a url
     *
     * @remarks
     * Calling `connect` is optional since the first operation you perform will call `connect` if it's needed.
     * `timeoutMS` will bound the time any operation can take before throwing a timeout error.
     * However, when the operation being run is automatically connecting your `MongoClient` the `timeoutMS` will not apply to the time taken to connect the MongoClient.
     * This means the time to setup the `MongoClient` does not count against `timeoutMS`.
     * If you are using `timeoutMS` we recommend connecting your client explicitly in advance of any operation to avoid this inconsistent execution time.
     *
     * @see docs.mongodb.org/manual/reference/connection-string/
     */
    async connect() {
        if (this.connectionLock) {
            return await this.connectionLock;
        }
        try {
            this.connectionLock = this._connect();
            await this.connectionLock;
        }
        finally {
            // release
            this.connectionLock = undefined;
        }
        return this;
    }
    /**
     * Create a topology to open the connection, must be locked to avoid topology leaks in concurrency scenario.
     * Locking is enforced by the connect method.
     *
     * @internal
     */
    async _connect() {
        if (this.topology && this.topology.isConnected()) {
            return this;
        }
        const options = this[kOptions];
        if (options.tls) {
            if (typeof options.tlsCAFile === 'string') {
                options.ca ??= await fs_1.promises.readFile(options.tlsCAFile);
            }
            if (typeof options.tlsCRLFile === 'string') {
                options.crl ??= await fs_1.promises.readFile(options.tlsCRLFile);
            }
            if (typeof options.tlsCertificateKeyFile === 'string') {
                if (!options.key || !options.cert) {
                    const contents = await fs_1.promises.readFile(options.tlsCertificateKeyFile);
                    options.key ??= contents;
                    options.cert ??= contents;
                }
            }
        }
        if (typeof options.srvHost === 'string') {
            const hosts = await (0, connection_string_1.resolveSRVRecord)(options);
            for (const [index, host] of hosts.entries()) {
                options.hosts[index] = host;
            }
        }
        // It is important to perform validation of hosts AFTER SRV resolution, to check the real hostname,
        // but BEFORE we even attempt connecting with a potentially not allowed hostname
        if (options.credentials?.mechanism === providers_1.AuthMechanism.MONGODB_OIDC) {
            const allowedHosts = options.credentials?.mechanismProperties?.ALLOWED_HOSTS || mongo_credentials_1.DEFAULT_ALLOWED_HOSTS;
            const isServiceAuth = !!options.credentials?.mechanismProperties?.ENVIRONMENT;
            if (!isServiceAuth) {
                for (const host of options.hosts) {
                    if (!(0, utils_1.hostMatchesWildcards)(host.toHostPort().host, allowedHosts)) {
                        throw new error_1.MongoInvalidArgumentError(`Host '${host}' is not valid for OIDC authentication with ALLOWED_HOSTS of '${allowedHosts.join(',')}'`);
                    }
                }
            }
        }
        this.topology = new topology_1.Topology(this, options.hosts, options);
        // Events can be emitted before initialization is complete so we have to
        // save the reference to the topology on the client ASAP if the event handlers need to access it
        this.topology.once(topology_1.Topology.OPEN, () => this.emit('open', this));
        for (const event of constants_1.MONGO_CLIENT_EVENTS) {
            this.topology.on(event, (...args) => this.emit(event, ...args));
        }
        const topologyConnect = async () => {
            try {
                await this.topology?.connect(options);
            }
            catch (error) {
                this.topology?.close();
                throw error;
            }
        };
        if (this.autoEncrypter) {
            await this.autoEncrypter?.init();
            await topologyConnect();
            await options.encrypter.connectInternalClient();
        }
        else {
            await topologyConnect();
        }
        return this;
    }
    /**
     * Cleans up client-side resources used by the MongoCLient and .  This includes:
     *
     * - Closes all open, unused connections (see note).
     * - Ends all in-use sessions with {@link ClientSession#endSession|ClientSession.endSession()}.
     * - Ends all unused sessions server-side.
     * - Cleans up any resources being used for auto encryption if auto encryption is enabled.
     *
     * @remarks Any in-progress operations are not killed and any connections used by in progress operations
     * will be cleaned up lazily as operations finish.
     *
     * @param force - Force close, emitting no events
     */
    async close(force = false) {
        // There's no way to set hasBeenClosed back to false
        Object.defineProperty(this.s, 'hasBeenClosed', {
            value: true,
            enumerable: true,
            configurable: false,
            writable: false
        });
        const activeSessionEnds = Array.from(this.s.activeSessions, session => session.endSession());
        this.s.activeSessions.clear();
        await Promise.all(activeSessionEnds);
        if (this.topology == null) {
            return;
        }
        // If we would attempt to select a server and get nothing back we short circuit
        // to avoid the server selection timeout.
        const selector = (0, server_selection_1.readPreferenceServerSelector)(read_preference_1.ReadPreference.primaryPreferred);
        const topologyDescription = this.topology.description;
        const serverDescriptions = Array.from(topologyDescription.servers.values());
        const servers = selector(topologyDescription, serverDescriptions);
        if (servers.length !== 0) {
            const endSessions = Array.from(this.s.sessionPool.sessions, ({ id }) => id);
            if (endSessions.length !== 0) {
                try {
                    await (0, execute_operation_1.executeOperation)(this, new run_command_1.RunAdminCommandOperation({ endSessions }, { readPreference: read_preference_1.ReadPreference.primaryPreferred, noResponse: true }));
                }
                catch (error) {
                    (0, utils_1.squashError)(error);
                }
            }
        }
        // clear out references to old topology
        const topology = this.topology;
        this.topology = undefined;
        topology.close();
        const { encrypter } = this[kOptions];
        if (encrypter) {
            await encrypter.close(this, force);
        }
    }
    /**
     * Create a new Db instance sharing the current socket connections.
     *
     * @param dbName - The name of the database we want to use. If not provided, use database name from connection string.
     * @param options - Optional settings for Db construction
     */
    db(dbName, options) {
        options = options ?? {};
        // Default to db from connection string if not provided
        if (!dbName) {
            dbName = this.s.options.dbName;
        }
        // Copy the options and add out internal override of the not shared flag
        const finalOptions = Object.assign({}, this[kOptions], options);
        // Return the db object
        const db = new db_1.Db(this, dbName, finalOptions);
        // Return the database
        return db;
    }
    /**
     * Connect to MongoDB using a url
     *
     * @remarks
     * Calling `connect` is optional since the first operation you perform will call `connect` if it's needed.
     * `timeoutMS` will bound the time any operation can take before throwing a timeout error.
     * However, when the operation being run is automatically connecting your `MongoClient` the `timeoutMS` will not apply to the time taken to connect the MongoClient.
     * This means the time to setup the `MongoClient` does not count against `timeoutMS`.
     * If you are using `timeoutMS` we recommend connecting your client explicitly in advance of any operation to avoid this inconsistent execution time.
     *
     * @remarks
     * The programmatically provided options take precedence over the URI options.
     *
     * @see https://www.mongodb.com/docs/manual/reference/connection-string/
     */
    static async connect(url, options) {
        const client = new this(url, options);
        return await client.connect();
    }
    /**
     * Creates a new ClientSession. When using the returned session in an operation
     * a corresponding ServerSession will be created.
     *
     * @remarks
     * A ClientSession instance may only be passed to operations being performed on the same
     * MongoClient it was started from.
     */
    startSession(options) {
        const session = new sessions_1.ClientSession(this, this.s.sessionPool, { explicit: true, ...options }, this[kOptions]);
        this.s.activeSessions.add(session);
        session.once('ended', () => {
            this.s.activeSessions.delete(session);
        });
        return session;
    }
    async withSession(optionsOrExecutor, executor) {
        const options = {
            // Always define an owner
            owner: Symbol(),
            // If it's an object inherit the options
            ...(typeof optionsOrExecutor === 'object' ? optionsOrExecutor : {})
        };
        const withSessionCallback = typeof optionsOrExecutor === 'function' ? optionsOrExecutor : executor;
        if (withSessionCallback == null) {
            throw new error_1.MongoInvalidArgumentError('Missing required callback parameter');
        }
        const session = this.startSession(options);
        try {
            return await withSessionCallback(session);
        }
        finally {
            try {
                await session.endSession();
            }
            catch (error) {
                (0, utils_1.squashError)(error);
            }
        }
    }
    /**
     * Create a new Change Stream, watching for new changes (insertions, updates,
     * replacements, deletions, and invalidations) in this cluster. Will ignore all
     * changes to system collections, as well as the local, admin, and config databases.
     *
     * @remarks
     * watch() accepts two generic arguments for distinct use cases:
     * - The first is to provide the schema that may be defined for all the data within the current cluster
     * - The second is to override the shape of the change stream document entirely, if it is not provided the type will default to ChangeStreamDocument of the first argument
     *
     * @remarks
     * When `timeoutMS` is configured for a change stream, it will have different behaviour depending
     * on whether the change stream is in iterator mode or emitter mode. In both cases, a change
     * stream will time out if it does not receive a change event within `timeoutMS` of the last change
     * event.
     *
     * Note that if a change stream is consistently timing out when watching a collection, database or
     * client that is being changed, then this may be due to the server timing out before it can finish
     * processing the existing oplog. To address this, restart the change stream with a higher
     * `timeoutMS`.
     *
     * If the change stream times out the initial aggregate operation to establish the change stream on
     * the server, then the client will close the change stream. If the getMore calls to the server
     * time out, then the change stream will be left open, but will throw a MongoOperationTimeoutError
     * when in iterator mode and emit an error event that returns a MongoOperationTimeoutError in
     * emitter mode.
     *
     * To determine whether or not the change stream is still open following a timeout, check the
     * {@link ChangeStream.closed} getter.
     *
     * @example
     * In iterator mode, if a next() call throws a timeout error, it will attempt to resume the change stream.
     * The next call can just be retried after this succeeds.
     * ```ts
     * const changeStream = collection.watch([], { timeoutMS: 100 });
     * try {
     *     await changeStream.next();
     * } catch (e) {
     *     if (e instanceof MongoOperationTimeoutError && !changeStream.closed) {
     *       await changeStream.next();
     *     }
     *     throw e;
     * }
     * ```
     *
     * @example
     * In emitter mode, if the change stream goes `timeoutMS` without emitting a change event, it will
     * emit an error event that returns a MongoOperationTimeoutError, but will not close the change
     * stream unless the resume attempt fails. There is no need to re-establish change listeners as
     * this will automatically continue emitting change events once the resume attempt completes.
     *
     * ```ts
     * const changeStream = collection.watch([], { timeoutMS: 100 });
     * changeStream.on('change', console.log);
     * changeStream.on('error', e => {
     *     if (e instanceof MongoOperationTimeoutError && !changeStream.closed) {
     *         // do nothing
     *     } else {
     *         changeStream.close();
     *     }
     * });
     * ```
     * @param pipeline - An array of {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
     * @param options - Optional settings for the command
     * @typeParam TSchema - Type of the data being detected by the change stream
     * @typeParam TChange - Type of the whole change stream document emitted
     */
    watch(pipeline = [], options = {}) {
        // Allow optionally not specifying a pipeline
        if (!Array.isArray(pipeline)) {
            options = pipeline;
            pipeline = [];
        }
        return new change_stream_1.ChangeStream(this, pipeline, (0, utils_1.resolveOptions)(this, options));
    }
}
exports.MongoClient = MongoClient;
(0, resource_management_1.configureResourceManagement)(MongoClient.prototype);
//# sourceMappingURL=mongo_client.js.map