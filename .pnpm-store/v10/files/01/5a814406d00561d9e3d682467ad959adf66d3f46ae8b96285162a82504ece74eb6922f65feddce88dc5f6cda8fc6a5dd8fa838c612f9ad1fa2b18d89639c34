"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsCappedOperation = void 0;
const error_1 = require("../error");
const operation_1 = require("./operation");
/** @internal */
class IsCappedOperation extends operation_1.AbstractOperation {
    constructor(collection, options) {
        super(options);
        this.options = options;
        this.collection = collection;
    }
    get commandName() {
        return 'listCollections';
    }
    async execute(server, session) {
        const coll = this.collection;
        const [collection] = await coll.s.db
            .listCollections({ name: coll.collectionName }, { ...this.options, nameOnly: false, readPreference: this.readPreference, session })
            .toArray();
        if (collection == null || collection.options == null) {
            throw new error_1.MongoAPIError(`collection ${coll.namespace} not found`);
        }
        return !!collection.options?.capped;
    }
}
exports.IsCappedOperation = IsCappedOperation;
//# sourceMappingURL=is_capped.js.map