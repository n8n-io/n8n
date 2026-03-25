"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistinctOperation = void 0;
const utils_1 = require("../utils");
const command_1 = require("./command");
const operation_1 = require("./operation");
/**
 * Return a list of distinct values for the given key across a collection.
 * @internal
 */
class DistinctOperation extends command_1.CommandOperation {
    /**
     * Construct a Distinct operation.
     *
     * @param collection - Collection instance.
     * @param key - Field of the document to find distinct values for.
     * @param query - The query for filtering the set of documents to which we apply the distinct filter.
     * @param options - Optional settings. See Collection.prototype.distinct for a list of options.
     */
    constructor(collection, key, query, options) {
        super(collection, options);
        this.options = options ?? {};
        this.collection = collection;
        this.key = key;
        this.query = query;
    }
    get commandName() {
        return 'distinct';
    }
    async execute(server, session, timeoutContext) {
        const coll = this.collection;
        const key = this.key;
        const query = this.query;
        const options = this.options;
        // Distinct command
        const cmd = {
            distinct: coll.collectionName,
            key: key,
            query: query
        };
        // Add maxTimeMS if defined
        if (typeof options.maxTimeMS === 'number') {
            cmd.maxTimeMS = options.maxTimeMS;
        }
        // we check for undefined specifically here to allow falsy values
        // eslint-disable-next-line no-restricted-syntax
        if (typeof options.comment !== 'undefined') {
            cmd.comment = options.comment;
        }
        // Do we have a readConcern specified
        (0, utils_1.decorateWithReadConcern)(cmd, coll, options);
        // Have we specified collation
        (0, utils_1.decorateWithCollation)(cmd, coll, options);
        const result = await super.executeCommand(server, session, cmd, timeoutContext);
        return this.explain ? result : result.values;
    }
}
exports.DistinctOperation = DistinctOperation;
(0, operation_1.defineAspects)(DistinctOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.RETRYABLE, operation_1.Aspect.EXPLAINABLE]);
//# sourceMappingURL=distinct.js.map