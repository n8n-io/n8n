"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListImportsCommand = void 0;
class ListImportsCommand {
    constructor(apiProvider, namespace) {
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(limit, paginationToken) {
        const req = {
            limit: limit,
            paginationToken: paginationToken,
        };
        const api = await this.apiProvider.provide();
        return await api.listBulkImports(req);
    }
}
exports.ListImportsCommand = ListImportsCommand;
//# sourceMappingURL=listImports.js.map