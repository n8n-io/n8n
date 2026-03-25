"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientBulkWriteOperation = void 0;
const beta_1 = require("../../beta");
const responses_1 = require("../../cmap/wire_protocol/responses");
const utils_1 = require("../../utils");
const command_1 = require("../command");
const operation_1 = require("../operation");
/**
 * Executes a single client bulk write operation within a potential batch.
 * @internal
 */
class ClientBulkWriteOperation extends command_1.CommandOperation {
    get commandName() {
        return 'bulkWrite';
    }
    constructor(commandBuilder, options) {
        super(undefined, options);
        this.commandBuilder = commandBuilder;
        this.options = options;
        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
    }
    resetBatch() {
        return this.commandBuilder.resetBatch();
    }
    get canRetryWrite() {
        return this.commandBuilder.isBatchRetryable;
    }
    /**
     * Execute the command. Superclass will handle write concern, etc.
     * @param server - The server.
     * @param session - The session.
     * @returns The response.
     */
    async execute(server, session, timeoutContext) {
        let command;
        if (server.description.type === beta_1.ServerType.LoadBalancer) {
            if (session) {
                let connection;
                if (!session.pinnedConnection) {
                    // Checkout a connection to build the command.
                    connection = await server.pool.checkOut({ timeoutContext });
                    // Pin the connection to the session so it get used to execute the command and we do not
                    // perform a double check-in/check-out.
                    session.pin(connection);
                }
                else {
                    connection = session.pinnedConnection;
                }
                command = this.commandBuilder.buildBatch(connection.hello?.maxMessageSizeBytes, connection.hello?.maxWriteBatchSize, connection.hello?.maxBsonObjectSize);
            }
            else {
                throw new beta_1.MongoClientBulkWriteExecutionError('Session provided to the client bulk write operation must be present.');
            }
        }
        else {
            // At this point we have a server and the auto connect code has already
            // run in executeOperation, so the server description will be populated.
            // We can use that to build the command.
            if (!server.description.maxWriteBatchSize ||
                !server.description.maxMessageSizeBytes ||
                !server.description.maxBsonObjectSize) {
                throw new beta_1.MongoClientBulkWriteExecutionError('In order to execute a client bulk write, both maxWriteBatchSize, maxMessageSizeBytes and maxBsonObjectSize must be provided by the servers hello response.');
            }
            command = this.commandBuilder.buildBatch(server.description.maxMessageSizeBytes, server.description.maxWriteBatchSize, server.description.maxBsonObjectSize);
        }
        // Check after the batch is built if we cannot retry it and override the option.
        if (!this.canRetryWrite) {
            this.options.willRetryWrite = false;
        }
        return await super.executeCommand(server, session, command, timeoutContext, responses_1.ClientBulkWriteCursorResponse);
    }
}
exports.ClientBulkWriteOperation = ClientBulkWriteOperation;
// Skipping the collation as it goes on the individual ops.
(0, operation_1.defineAspects)(ClientBulkWriteOperation, [
    operation_1.Aspect.WRITE_OPERATION,
    operation_1.Aspect.SKIP_COLLATION,
    operation_1.Aspect.CURSOR_CREATING,
    operation_1.Aspect.RETRYABLE,
    operation_1.Aspect.COMMAND_BATCHING
]);
//# sourceMappingURL=client_bulk_write.js.map