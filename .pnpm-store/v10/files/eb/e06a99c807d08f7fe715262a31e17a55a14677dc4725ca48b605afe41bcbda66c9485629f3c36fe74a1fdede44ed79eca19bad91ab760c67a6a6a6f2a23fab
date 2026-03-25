"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescribeImportCommand = void 0;
class DescribeImportCommand {
    constructor(apiProvider, namespace) {
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(id) {
        const req = {
            id: id,
        };
        const api = await this.apiProvider.provide();
        return await api.describeBulkImport(req);
    }
}
exports.DescribeImportCommand = DescribeImportCommand;
//# sourceMappingURL=describeImport.js.map