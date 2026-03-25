"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMoreOperation = void 0;
const responses_1 = require("../cmap/wire_protocol/responses");
const error_1 = require("../error");
const utils_1 = require("../utils");
const operation_1 = require("./operation");
/** @internal */
class GetMoreOperation extends operation_1.AbstractOperation {
    constructor(ns, cursorId, server, options) {
        super(options);
        this.options = options;
        this.ns = ns;
        this.cursorId = cursorId;
        this.server = server;
    }
    get commandName() {
        return 'getMore';
    }
    /**
     * Although there is a server already associated with the get more operation, the signature
     * for execute passes a server so we will just use that one.
     */
    async execute(server, _session, timeoutContext) {
        if (server !== this.server) {
            throw new error_1.MongoRuntimeError('Getmore must run on the same server operation began on');
        }
        if (this.cursorId == null || this.cursorId.isZero()) {
            throw new error_1.MongoRuntimeError('Unable to iterate cursor with no id');
        }
        const collection = this.ns.collection;
        if (collection == null) {
            // Cursors should have adopted the namespace returned by MongoDB
            // which should always defined a collection name (even a pseudo one, ex. db.aggregate())
            throw new error_1.MongoRuntimeError('A collection name must be determined before getMore');
        }
        const getMoreCmd = {
            getMore: this.cursorId,
            collection
        };
        if (typeof this.options.batchSize === 'number') {
            getMoreCmd.batchSize = Math.abs(this.options.batchSize);
        }
        if (typeof this.options.maxAwaitTimeMS === 'number') {
            getMoreCmd.maxTimeMS = this.options.maxAwaitTimeMS;
        }
        // we check for undefined specifically here to allow falsy values
        // eslint-disable-next-line no-restricted-syntax
        if (this.options.comment !== undefined && (0, utils_1.maxWireVersion)(server) >= 9) {
            getMoreCmd.comment = this.options.comment;
        }
        const commandOptions = {
            returnFieldSelector: null,
            documentsReturnedIn: 'nextBatch',
            timeoutContext,
            ...this.options
        };
        return await server.command(this.ns, getMoreCmd, commandOptions, responses_1.CursorResponse);
    }
}
exports.GetMoreOperation = GetMoreOperation;
(0, operation_1.defineAspects)(GetMoreOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.MUST_SELECT_SAME_SERVER]);
//# sourceMappingURL=get_more.js.map