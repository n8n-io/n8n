"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateCollectionOperation = void 0;
const error_1 = require("../error");
const command_1 = require("./command");
/** @internal */
class ValidateCollectionOperation extends command_1.CommandOperation {
    constructor(admin, collectionName, options) {
        // Decorate command with extra options
        const command = { validate: collectionName };
        const keys = Object.keys(options);
        for (let i = 0; i < keys.length; i++) {
            if (Object.prototype.hasOwnProperty.call(options, keys[i]) && keys[i] !== 'session') {
                command[keys[i]] = options[keys[i]];
            }
        }
        super(admin.s.db, options);
        this.options = options;
        this.command = command;
        this.collectionName = collectionName;
    }
    get commandName() {
        return 'validate';
    }
    async execute(server, session, timeoutContext) {
        const collectionName = this.collectionName;
        const doc = await super.executeCommand(server, session, this.command, timeoutContext);
        if (doc.result != null && typeof doc.result !== 'string')
            throw new error_1.MongoUnexpectedServerResponseError('Error with validation data');
        if (doc.result != null && doc.result.match(/exception|corrupt/) != null)
            throw new error_1.MongoUnexpectedServerResponseError(`Invalid collection ${collectionName}`);
        if (doc.valid != null && !doc.valid)
            throw new error_1.MongoUnexpectedServerResponseError(`Invalid collection ${collectionName}`);
        return doc;
    }
}
exports.ValidateCollectionOperation = ValidateCollectionOperation;
//# sourceMappingURL=validate_collection.js.map