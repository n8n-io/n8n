"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropDatabaseOperation = exports.DropCollectionOperation = void 0;
const error_1 = require("../error");
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class DropCollectionOperation extends command_1.CommandOperation {
    constructor(db, name, options = {}) {
        super(db, options);
        this.db = db;
        this.options = options;
        this.name = name;
    }
    get commandName() {
        return 'drop';
    }
    async execute(server, session, timeoutContext) {
        const db = this.db;
        const options = this.options;
        const name = this.name;
        const encryptedFieldsMap = db.client.s.options.autoEncryption?.encryptedFieldsMap;
        let encryptedFields = options.encryptedFields ?? encryptedFieldsMap?.[`${db.databaseName}.${name}`];
        if (!encryptedFields && encryptedFieldsMap) {
            // If the MongoClient was configured with an encryptedFieldsMap,
            // and no encryptedFields config was available in it or explicitly
            // passed as an argument, the spec tells us to look one up using
            // listCollections().
            const listCollectionsResult = await db
                .listCollections({ name }, { nameOnly: false })
                .toArray();
            encryptedFields = listCollectionsResult?.[0]?.options?.encryptedFields;
        }
        if (encryptedFields) {
            const escCollection = encryptedFields.escCollection || `enxcol_.${name}.esc`;
            const ecocCollection = encryptedFields.ecocCollection || `enxcol_.${name}.ecoc`;
            for (const collectionName of [escCollection, ecocCollection]) {
                // Drop auxilliary collections, ignoring potential NamespaceNotFound errors.
                const dropOp = new DropCollectionOperation(db, collectionName);
                try {
                    await dropOp.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
                }
                catch (err) {
                    if (!(err instanceof error_1.MongoServerError) ||
                        err.code !== error_1.MONGODB_ERROR_CODES.NamespaceNotFound) {
                        throw err;
                    }
                }
            }
        }
        return await this.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
    }
    async executeWithoutEncryptedFieldsCheck(server, session, timeoutContext) {
        await super.executeCommand(server, session, { drop: this.name }, timeoutContext);
        return true;
    }
}
exports.DropCollectionOperation = DropCollectionOperation;
/** @internal */
class DropDatabaseOperation extends command_1.CommandOperation {
    constructor(db, options) {
        super(db, options);
        this.options = options;
    }
    get commandName() {
        return 'dropDatabase';
    }
    async execute(server, session, timeoutContext) {
        await super.executeCommand(server, session, { dropDatabase: 1 }, timeoutContext);
        return true;
    }
}
exports.DropDatabaseOperation = DropDatabaseOperation;
(0, operation_1.defineAspects)(DropCollectionOperation, [operation_1.Aspect.WRITE_OPERATION]);
(0, operation_1.defineAspects)(DropDatabaseOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=drop.js.map