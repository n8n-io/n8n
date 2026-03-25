"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSearchIndexOperation = void 0;
const operation_1 = require("../operation");
/** @internal */
class UpdateSearchIndexOperation extends operation_1.AbstractOperation {
    constructor(collection, name, definition) {
        super();
        this.collection = collection;
        this.name = name;
        this.definition = definition;
    }
    get commandName() {
        return 'updateSearchIndex';
    }
    async execute(server, session, timeoutContext) {
        const namespace = this.collection.fullNamespace;
        const command = {
            updateSearchIndex: namespace.collection,
            name: this.name,
            definition: this.definition
        };
        await server.command(namespace, command, { session, timeoutContext });
        return;
    }
}
exports.UpdateSearchIndexOperation = UpdateSearchIndexOperation;
//# sourceMappingURL=update.js.map