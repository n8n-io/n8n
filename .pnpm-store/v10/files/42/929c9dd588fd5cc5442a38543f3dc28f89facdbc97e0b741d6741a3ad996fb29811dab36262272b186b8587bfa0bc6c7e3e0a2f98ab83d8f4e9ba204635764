"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertManyOperation = exports.InsertOneOperation = exports.InsertOperation = void 0;
const error_1 = require("../error");
const utils_1 = require("../utils");
const write_concern_1 = require("../write_concern");
const bulk_write_1 = require("./bulk_write");
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class InsertOperation extends command_1.CommandOperation {
    constructor(ns, documents, options) {
        super(undefined, options);
        this.options = { ...options, checkKeys: options.checkKeys ?? false };
        this.ns = ns;
        this.documents = documents;
    }
    get commandName() {
        return 'insert';
    }
    async execute(server, session, timeoutContext) {
        const options = this.options ?? {};
        const ordered = typeof options.ordered === 'boolean' ? options.ordered : true;
        const command = {
            insert: this.ns.collection,
            documents: this.documents,
            ordered
        };
        if (typeof options.bypassDocumentValidation === 'boolean') {
            command.bypassDocumentValidation = options.bypassDocumentValidation;
        }
        // we check for undefined specifically here to allow falsy values
        // eslint-disable-next-line no-restricted-syntax
        if (options.comment !== undefined) {
            command.comment = options.comment;
        }
        return await super.executeCommand(server, session, command, timeoutContext);
    }
}
exports.InsertOperation = InsertOperation;
class InsertOneOperation extends InsertOperation {
    constructor(collection, doc, options) {
        super(collection.s.namespace, (0, utils_1.maybeAddIdToDocuments)(collection, [doc], options), options);
    }
    async execute(server, session, timeoutContext) {
        const res = await super.execute(server, session, timeoutContext);
        if (res.code)
            throw new error_1.MongoServerError(res);
        if (res.writeErrors) {
            // This should be a WriteError but we can't change it now because of error hierarchy
            throw new error_1.MongoServerError(res.writeErrors[0]);
        }
        return {
            acknowledged: this.writeConcern?.w !== 0,
            insertedId: this.documents[0]._id
        };
    }
}
exports.InsertOneOperation = InsertOneOperation;
/** @internal */
class InsertManyOperation extends operation_1.AbstractOperation {
    constructor(collection, docs, options) {
        super(options);
        if (!Array.isArray(docs)) {
            throw new error_1.MongoInvalidArgumentError('Argument "docs" must be an array of documents');
        }
        this.options = options;
        this.collection = collection;
        this.docs = docs;
    }
    get commandName() {
        return 'insert';
    }
    async execute(server, session, timeoutContext) {
        const coll = this.collection;
        const options = { ...this.options, ...this.bsonOptions, readPreference: this.readPreference };
        const writeConcern = write_concern_1.WriteConcern.fromOptions(options);
        const bulkWriteOperation = new bulk_write_1.BulkWriteOperation(coll, this.docs.map(document => ({
            insertOne: { document }
        })), options);
        try {
            const res = await bulkWriteOperation.execute(server, session, timeoutContext);
            return {
                acknowledged: writeConcern?.w !== 0,
                insertedCount: res.insertedCount,
                insertedIds: res.insertedIds
            };
        }
        catch (err) {
            if (err && err.message === 'Operation must be an object with an operation key') {
                throw new error_1.MongoInvalidArgumentError('Collection.insertMany() cannot be called with an array that has null/undefined values');
            }
            throw err;
        }
    }
}
exports.InsertManyOperation = InsertManyOperation;
(0, operation_1.defineAspects)(InsertOperation, [operation_1.Aspect.RETRYABLE, operation_1.Aspect.WRITE_OPERATION]);
(0, operation_1.defineAspects)(InsertOneOperation, [operation_1.Aspect.RETRYABLE, operation_1.Aspect.WRITE_OPERATION]);
(0, operation_1.defineAspects)(InsertManyOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=insert.js.map