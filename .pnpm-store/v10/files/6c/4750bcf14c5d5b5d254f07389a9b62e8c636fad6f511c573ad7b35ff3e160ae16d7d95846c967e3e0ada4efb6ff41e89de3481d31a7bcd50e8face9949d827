"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionsOperation = void 0;
const collection_1 = require("../collection");
const operation_1 = require("./operation");
/** @internal */
class CollectionsOperation extends operation_1.AbstractOperation {
    constructor(db, options) {
        super(options);
        this.options = options;
        this.db = db;
    }
    get commandName() {
        return 'listCollections';
    }
    async execute(server, session) {
        // Let's get the collection names
        const documents = await this.db
            .listCollections({}, { ...this.options, nameOnly: true, readPreference: this.readPreference, session })
            .toArray();
        const collections = [];
        for (const { name } of documents) {
            if (!name.includes('$')) {
                // Filter collections removing any illegal ones
                collections.push(new collection_1.Collection(this.db, name, this.db.s.options));
            }
        }
        // Return the collection objects
        return collections;
    }
}
exports.CollectionsOperation = CollectionsOperation;
//# sourceMappingURL=collections.js.map