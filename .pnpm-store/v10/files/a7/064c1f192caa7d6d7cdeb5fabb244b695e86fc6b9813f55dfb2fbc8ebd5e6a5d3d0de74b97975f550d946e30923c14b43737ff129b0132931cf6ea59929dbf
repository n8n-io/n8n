"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindOneAndUpdateOperation = exports.FindOneAndReplaceOperation = exports.FindOneAndDeleteOperation = exports.FindAndModifyOperation = exports.ReturnDocument = void 0;
const error_1 = require("../error");
const read_preference_1 = require("../read_preference");
const sort_1 = require("../sort");
const utils_1 = require("../utils");
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @public */
exports.ReturnDocument = Object.freeze({
    BEFORE: 'before',
    AFTER: 'after'
});
function configureFindAndModifyCmdBaseUpdateOpts(cmdBase, options) {
    cmdBase.new = options.returnDocument === exports.ReturnDocument.AFTER;
    cmdBase.upsert = options.upsert === true;
    if (options.bypassDocumentValidation === true) {
        cmdBase.bypassDocumentValidation = options.bypassDocumentValidation;
    }
    return cmdBase;
}
/** @internal */
class FindAndModifyOperation extends command_1.CommandOperation {
    constructor(collection, query, options) {
        super(collection, options);
        this.options = options ?? {};
        this.cmdBase = {
            remove: false,
            new: false,
            upsert: false
        };
        options.includeResultMetadata ??= false;
        const sort = (0, sort_1.formatSort)(options.sort);
        if (sort) {
            this.cmdBase.sort = sort;
        }
        if (options.projection) {
            this.cmdBase.fields = options.projection;
        }
        if (options.maxTimeMS) {
            this.cmdBase.maxTimeMS = options.maxTimeMS;
        }
        // Decorate the findAndModify command with the write Concern
        if (options.writeConcern) {
            this.cmdBase.writeConcern = options.writeConcern;
        }
        if (options.let) {
            this.cmdBase.let = options.let;
        }
        // we check for undefined specifically here to allow falsy values
        // eslint-disable-next-line no-restricted-syntax
        if (options.comment !== undefined) {
            this.cmdBase.comment = options.comment;
        }
        // force primary read preference
        this.readPreference = read_preference_1.ReadPreference.primary;
        this.collection = collection;
        this.query = query;
    }
    get commandName() {
        return 'findAndModify';
    }
    async execute(server, session, timeoutContext) {
        const coll = this.collection;
        const query = this.query;
        const options = { ...this.options, ...this.bsonOptions };
        // Create findAndModify command object
        const cmd = {
            findAndModify: coll.collectionName,
            query: query,
            ...this.cmdBase
        };
        (0, utils_1.decorateWithCollation)(cmd, coll, options);
        if (options.hint) {
            // TODO: once this method becomes a CommandOperation we will have the server
            // in place to check.
            const unacknowledgedWrite = this.writeConcern?.w === 0;
            if (unacknowledgedWrite || (0, utils_1.maxWireVersion)(server) < 8) {
                throw new error_1.MongoCompatibilityError('The current topology does not support a hint on findAndModify commands');
            }
            cmd.hint = options.hint;
        }
        // Execute the command
        const result = await super.executeCommand(server, session, cmd, timeoutContext);
        return options.includeResultMetadata ? result : (result.value ?? null);
    }
}
exports.FindAndModifyOperation = FindAndModifyOperation;
/** @internal */
class FindOneAndDeleteOperation extends FindAndModifyOperation {
    constructor(collection, filter, options) {
        // Basic validation
        if (filter == null || typeof filter !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
        }
        super(collection, filter, options);
        this.cmdBase.remove = true;
    }
}
exports.FindOneAndDeleteOperation = FindOneAndDeleteOperation;
/** @internal */
class FindOneAndReplaceOperation extends FindAndModifyOperation {
    constructor(collection, filter, replacement, options) {
        if (filter == null || typeof filter !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
        }
        if (replacement == null || typeof replacement !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Argument "replacement" must be an object');
        }
        if ((0, utils_1.hasAtomicOperators)(replacement)) {
            throw new error_1.MongoInvalidArgumentError('Replacement document must not contain atomic operators');
        }
        super(collection, filter, options);
        this.cmdBase.update = replacement;
        configureFindAndModifyCmdBaseUpdateOpts(this.cmdBase, options);
    }
}
exports.FindOneAndReplaceOperation = FindOneAndReplaceOperation;
/** @internal */
class FindOneAndUpdateOperation extends FindAndModifyOperation {
    constructor(collection, filter, update, options) {
        if (filter == null || typeof filter !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
        }
        if (update == null || typeof update !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Argument "update" must be an object');
        }
        if (!(0, utils_1.hasAtomicOperators)(update)) {
            throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
        }
        super(collection, filter, options);
        this.cmdBase.update = update;
        configureFindAndModifyCmdBaseUpdateOpts(this.cmdBase, options);
        if (options.arrayFilters) {
            this.cmdBase.arrayFilters = options.arrayFilters;
        }
    }
}
exports.FindOneAndUpdateOperation = FindOneAndUpdateOperation;
(0, operation_1.defineAspects)(FindAndModifyOperation, [
    operation_1.Aspect.WRITE_OPERATION,
    operation_1.Aspect.RETRYABLE,
    operation_1.Aspect.EXPLAINABLE
]);
//# sourceMappingURL=find_and_modify.js.map