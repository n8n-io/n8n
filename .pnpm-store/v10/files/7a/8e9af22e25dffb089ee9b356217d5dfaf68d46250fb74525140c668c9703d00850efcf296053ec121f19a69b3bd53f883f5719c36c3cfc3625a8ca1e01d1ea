"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCollectionOperation = void 0;
const constants_1 = require("../cmap/wire_protocol/constants");
const collection_1 = require("../collection");
const error_1 = require("../error");
const command_1 = require("./command");
const indexes_1 = require("./indexes");
const operation_1 = require("./operation");
const ILLEGAL_COMMAND_FIELDS = new Set([
    'w',
    'wtimeout',
    'timeoutMS',
    'j',
    'fsync',
    'autoIndexId',
    'pkFactory',
    'raw',
    'readPreference',
    'session',
    'readConcern',
    'writeConcern',
    'raw',
    'fieldsAsRaw',
    'useBigInt64',
    'promoteLongs',
    'promoteValues',
    'promoteBuffers',
    'bsonRegExp',
    'serializeFunctions',
    'ignoreUndefined',
    'enableUtf8Validation'
]);
/* @internal */
const INVALID_QE_VERSION = 'Driver support of Queryable Encryption is incompatible with server. Upgrade server to use Queryable Encryption.';
/** @internal */
class CreateCollectionOperation extends command_1.CommandOperation {
    constructor(db, name, options = {}) {
        super(db, options);
        this.options = options;
        this.db = db;
        this.name = name;
    }
    get commandName() {
        return 'create';
    }
    async execute(server, session, timeoutContext) {
        const db = this.db;
        const name = this.name;
        const options = this.options;
        const encryptedFields = options.encryptedFields ??
            db.client.s.options.autoEncryption?.encryptedFieldsMap?.[`${db.databaseName}.${name}`];
        if (encryptedFields) {
            // Creating a QE collection required min server of 7.0.0
            // TODO(NODE-5353): Get wire version information from connection.
            if (!server.loadBalanced &&
                server.description.maxWireVersion < constants_1.MIN_SUPPORTED_QE_WIRE_VERSION) {
                throw new error_1.MongoCompatibilityError(`${INVALID_QE_VERSION} The minimum server version required is ${constants_1.MIN_SUPPORTED_QE_SERVER_VERSION}`);
            }
            // Create auxilliary collections for queryable encryption support.
            const escCollection = encryptedFields.escCollection ?? `enxcol_.${name}.esc`;
            const ecocCollection = encryptedFields.ecocCollection ?? `enxcol_.${name}.ecoc`;
            for (const collectionName of [escCollection, ecocCollection]) {
                const createOp = new CreateCollectionOperation(db, collectionName, {
                    clusteredIndex: {
                        key: { _id: 1 },
                        unique: true
                    }
                });
                await createOp.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
            }
            if (!options.encryptedFields) {
                this.options = { ...this.options, encryptedFields };
            }
        }
        const coll = await this.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
        if (encryptedFields) {
            // Create the required index for queryable encryption support.
            const createIndexOp = indexes_1.CreateIndexesOperation.fromIndexSpecification(db, name, { __safeContent__: 1 }, {});
            await createIndexOp.execute(server, session, timeoutContext);
        }
        return coll;
    }
    async executeWithoutEncryptedFieldsCheck(server, session, timeoutContext) {
        const db = this.db;
        const name = this.name;
        const options = this.options;
        const cmd = { create: name };
        for (const n in options) {
            if (options[n] != null &&
                typeof options[n] !== 'function' &&
                !ILLEGAL_COMMAND_FIELDS.has(n)) {
                cmd[n] = options[n];
            }
        }
        // otherwise just execute the command
        await super.executeCommand(server, session, cmd, timeoutContext);
        return new collection_1.Collection(db, name, options);
    }
}
exports.CreateCollectionOperation = CreateCollectionOperation;
(0, operation_1.defineAspects)(CreateCollectionOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=create_collection.js.map