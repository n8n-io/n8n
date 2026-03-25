"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchCommand = void 0;
const errors_1 = require("../../errors");
class FetchCommand {
    constructor(apiProvider, namespace) {
        this.validator = (options) => {
            if (options.length === 0) {
                throw new errors_1.PineconeArgumentError('Must pass in at least 1 recordID.');
            }
        };
        this.apiProvider = apiProvider;
        this.namespace = namespace;
    }
    async run(ids) {
        this.validator(ids);
        const api = await this.apiProvider.provide();
        const response = await api.fetchVectors({
            ids: ids,
            namespace: this.namespace,
        });
        // My testing shows that in reality vectors and namespace are
        // never undefined even when there are no records returned. So these
        // default values are needed only to satisfy the typescript compiler.
        return {
            records: response.vectors ? response.vectors : {},
            namespace: response.namespace ? response.namespace : '',
            ...(response.usage && { usage: response.usage }),
        };
    }
}
exports.FetchCommand = FetchCommand;
//# sourceMappingURL=fetch.js.map