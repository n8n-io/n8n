"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartImportCommand = void 0;
const db_data_1 = require("../../pinecone-generated-ts-fetch/db_data");
const errors_1 = require("../../errors");
class StartImportCommand {
    constructor(apiProvider, namespace) {
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(uri, errorMode, integrationId) {
        if (!uri) {
            throw new errors_1.PineconeArgumentError('`uri` field is required and must start with the scheme of a supported storage provider.');
        }
        let error = db_data_1.ImportErrorModeOnErrorEnum.Continue;
        if (errorMode) {
            if (errorMode.toLowerCase() !== 'continue' &&
                errorMode.toLowerCase() !== 'abort') {
                throw new errors_1.PineconeArgumentError('`errorMode` must be one of "Continue" or "Abort"');
            }
            if (errorMode?.toLowerCase() == 'abort') {
                error = db_data_1.ImportErrorModeOnErrorEnum.Abort;
            }
        }
        const req = {
            startImportRequest: {
                uri: uri,
                errorMode: { onError: error },
                integrationId: integrationId,
            },
        };
        const api = await this.apiProvider.provide();
        return await api.startBulkImport(req);
    }
}
exports.StartImportCommand = StartImportCommand;
//# sourceMappingURL=startImport.js.map