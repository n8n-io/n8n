"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkWriteOperation = void 0;
const operation_1 = require("./operation");
/** @internal */
class BulkWriteOperation extends operation_1.AbstractOperation {
    constructor(collection, operations, options) {
        super(options);
        this.options = options;
        this.collection = collection;
        this.operations = operations;
    }
    get commandName() {
        return 'bulkWrite';
    }
    async execute(server, session, timeoutContext) {
        const coll = this.collection;
        const operations = this.operations;
        const options = {
            ...this.options,
            ...this.bsonOptions,
            readPreference: this.readPreference,
            timeoutContext
        };
        // Create the bulk operation
        const bulk = options.ordered === false
            ? coll.initializeUnorderedBulkOp(options)
            : coll.initializeOrderedBulkOp(options);
        // for each op go through and add to the bulk
        for (let i = 0; i < operations.length; i++) {
            bulk.raw(operations[i]);
        }
        // Execute the bulk
        return await bulk.execute({ ...options, session });
    }
}
exports.BulkWriteOperation = BulkWriteOperation;
(0, operation_1.defineAspects)(BulkWriteOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=bulk_write.js.map