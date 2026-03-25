"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factorySchema = void 0;
const assert_version_1 = require("./assert.version");
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
const openapi3Schema = require("../openapi.v3.schema.json");
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.1/schema.json with dynamic refs replaced due to AJV bug - https://github.com/ajv-validator/ajv/issues/1745
const openapi31Schema = require("../openapi.v3_1.modified.schema.json");
const factorySchema = (version) => {
    const { minor } = (0, assert_version_1.assertVersion)(version);
    if (minor === '0') {
        return openapi3Schema;
    }
    return openapi31Schema;
};
exports.factorySchema = factorySchema;
//# sourceMappingURL=factory.schema.js.map