"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HIGH_LEVEL_INDEX_PARAMS = exports.DEFAULT_HIGH_LEVEL_SCHEMA = void 0;
const _1 = require("./");
const DEFAULT_HIGH_LEVEL_SCHEMA = (dimension) => [
    {
        name: 'id',
        data_type: _1.DataType.Int64,
        is_primary_key: true,
        autoID: false,
    },
    {
        name: 'vector',
        data_type: _1.DataType.FloatVector,
        dim: dimension,
    },
];
exports.DEFAULT_HIGH_LEVEL_SCHEMA = DEFAULT_HIGH_LEVEL_SCHEMA;
const DEFAULT_HIGH_LEVEL_INDEX_PARAMS = (field_name) => ({
    field_name,
    index_type: 'HNSW',
    metric_type: 'L2',
    params: { efConstruction: 10, M: 4 },
});
exports.DEFAULT_HIGH_LEVEL_INDEX_PARAMS = DEFAULT_HIGH_LEVEL_INDEX_PARAMS;
//# sourceMappingURL=highLevel.js.map