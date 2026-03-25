"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimatedDocumentCountOperation = void 0;
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class EstimatedDocumentCountOperation extends command_1.CommandOperation {
    constructor(collection, options = {}) {
        super(collection, options);
        this.options = options;
        this.collectionName = collection.collectionName;
    }
    get commandName() {
        return 'count';
    }
    async execute(server, session, timeoutContext) {
        const cmd = { count: this.collectionName };
        if (typeof this.options.maxTimeMS === 'number') {
            cmd.maxTimeMS = this.options.maxTimeMS;
        }
        // we check for undefined specifically here to allow falsy values
        // eslint-disable-next-line no-restricted-syntax
        if (this.options.comment !== undefined) {
            cmd.comment = this.options.comment;
        }
        const response = await super.executeCommand(server, session, cmd, timeoutContext);
        return response?.n || 0;
    }
}
exports.EstimatedDocumentCountOperation = EstimatedDocumentCountOperation;
(0, operation_1.defineAspects)(EstimatedDocumentCountOperation, [
    operation_1.Aspect.READ_OPERATION,
    operation_1.Aspect.RETRYABLE,
    operation_1.Aspect.CURSOR_CREATING
]);
//# sourceMappingURL=estimated_document_count.js.map