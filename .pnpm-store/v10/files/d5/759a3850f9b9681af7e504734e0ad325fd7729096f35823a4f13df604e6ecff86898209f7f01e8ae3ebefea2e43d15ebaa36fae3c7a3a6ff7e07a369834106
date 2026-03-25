"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelImportCommand = void 0;
class CancelImportCommand {
    constructor(apiProvider, namespace) {
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(id) {
        const req = {
            id: id,
        };
        const api = await this.apiProvider.provide();
        return await api.cancelBulkImport(req);
    }
}
exports.CancelImportCommand = CancelImportCommand;
//# sourceMappingURL=cancelImport.js.map