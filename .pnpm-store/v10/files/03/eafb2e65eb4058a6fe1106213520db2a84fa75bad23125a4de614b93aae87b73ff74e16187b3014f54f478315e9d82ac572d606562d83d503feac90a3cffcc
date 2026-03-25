"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factoryAjv = void 0;
const ajv_draft_04_1 = require("ajv-draft-04");
const _2020_1 = require("ajv/dist/2020");
const assert_version_1 = require("../openapi/assert.version");
const factoryAjv = (version, options) => {
    const { minor } = (0, assert_version_1.assertVersion)(version);
    let ajvInstance;
    if (minor === '0') {
        ajvInstance = new ajv_draft_04_1.default(options);
    }
    else if (minor == '1') {
        ajvInstance = new _2020_1.default(options);
        // Open API 3.1 has a custom "media-range" attribute defined in its schema, but the spec does not define it. "It's not really intended to be validated"
        // https://github.com/OAI/OpenAPI-Specification/issues/2714#issuecomment-923185689
        // Since the schema is non-normative (https://github.com/OAI/OpenAPI-Specification/pull/3355#issuecomment-1915695294) we will only validate that it's a string
        // as the spec states
        ajvInstance.addFormat('media-range', true);
    }
    return ajvInstance;
};
exports.factoryAjv = factoryAjv;
//# sourceMappingURL=factory.js.map