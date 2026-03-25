"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeIndexStats = void 0;
const errors_1 = require("../../errors");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const describeIndexStats = (apiProvider) => {
    const validator = (options) => {
        if (options) {
            (0, validateObjectProperties_1.ValidateObjectProperties)(options, ['filter']);
        }
        const map = options['filter'];
        for (const key in map) {
            if (!map[key]) {
                throw new errors_1.PineconeArgumentError(`\`filter\` property cannot be empty for ${key}`);
            }
        }
    };
    return async (options) => {
        if (options) {
            validator(options);
        }
        const api = await apiProvider.provide();
        const results = await api.describeIndexStats({
            describeIndexStatsRequest: { ...options },
        });
        const mappedResult = {
            namespaces: {},
            dimension: results.dimension,
            indexFullness: results.indexFullness,
            totalRecordCount: results.totalVectorCount,
        };
        if (results.namespaces) {
            for (const key in results.namespaces) {
                mappedResult.namespaces[key] = {
                    recordCount: results.namespaces[key].vectorCount,
                };
            }
        }
        return mappedResult;
    };
};
exports.describeIndexStats = describeIndexStats;
//# sourceMappingURL=describeIndexStats.js.map