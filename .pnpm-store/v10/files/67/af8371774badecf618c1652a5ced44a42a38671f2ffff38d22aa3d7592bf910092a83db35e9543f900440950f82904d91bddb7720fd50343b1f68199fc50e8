"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExampleValue = generateExampleValue;
const generate_test_data_from_json_schema_1 = require("./generate-test-data-from-json-schema");
const description_parser_1 = require("../description-parser");
function generateExampleValue(parameter) {
    if (parameter?.example) {
        return parameter.example;
    }
    else if (parameter?.examples) {
        return (0, description_parser_1.extractFirstExample)(parameter.examples);
    }
    else if (parameter?.schema) {
        return (0, generate_test_data_from_json_schema_1.generateTestDataFromJsonSchema)(parameter.schema);
    }
}
//# sourceMappingURL=generate-example-value.js.map