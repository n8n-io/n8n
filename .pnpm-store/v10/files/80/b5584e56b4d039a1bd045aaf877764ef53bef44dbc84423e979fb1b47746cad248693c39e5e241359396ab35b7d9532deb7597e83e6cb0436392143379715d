"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameOperation = void 0;
const collection_1 = require("../collection");
const utils_1 = require("../utils");
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class RenameOperation extends command_1.CommandOperation {
    constructor(collection, newName, options) {
        super(collection, options);
        this.collection = collection;
        this.newName = newName;
        this.options = options;
        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
    }
    get commandName() {
        return 'renameCollection';
    }
    async execute(server, session, timeoutContext) {
        // Build the command
        const renameCollection = this.collection.namespace;
        const toCollection = this.collection.s.namespace.withCollection(this.newName).toString();
        const dropTarget = typeof this.options.dropTarget === 'boolean' ? this.options.dropTarget : false;
        const command = {
            renameCollection: renameCollection,
            to: toCollection,
            dropTarget: dropTarget
        };
        await super.executeCommand(server, session, command, timeoutContext);
        return new collection_1.Collection(this.collection.s.db, this.newName, this.collection.s.options);
    }
}
exports.RenameOperation = RenameOperation;
(0, operation_1.defineAspects)(RenameOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=rename.js.map