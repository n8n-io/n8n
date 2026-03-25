"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParametersSchemaParser = void 0;
const types_1 = require("../../framework/types");
const util_1 = require("./util");
const PARAM_TYPE = {
    query: 'query',
    header: 'headers',
    path: 'params',
    cookie: 'cookies',
};
/**
 * A class top arse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
 * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
 */
class ParametersSchemaParser {
    constructor(ajv, apiDocs) {
        this._ajv = ajv;
        this._apiDocs = apiDocs;
    }
    /**
     * Parse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
     * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
     * @param path
     * @param parameters
     */
    parse(path, parameters = []) {
        const schemas = { query: {}, headers: {}, params: {}, cookies: {} };
        parameters.forEach((p) => {
            const parameter = (0, util_1.dereferenceParameter)(this._apiDocs, p);
            this.validateParameterType(path, parameter);
            const reqField = PARAM_TYPE[parameter.in];
            const { name, schema } = (0, util_1.normalizeParameter)(this._ajv, parameter);
            if (!schemas[reqField].properties) {
                schemas[reqField] = {
                    type: 'object',
                    properties: {},
                };
            }
            schemas[reqField].properties[name] = schema;
            if (reqField === 'query' && parameter.allowEmptyValue) {
                if (!schemas[reqField].allowEmptyValue) {
                    schemas[reqField].allowEmptyValue = new Set();
                }
                schemas[reqField].allowEmptyValue.add(name);
            }
            if (parameter.required) {
                if (!schemas[reqField].required) {
                    schemas[reqField].required = [];
                }
                schemas[reqField].required.push(name);
            }
        });
        return schemas;
    }
    validateParameterType(path, parameter) {
        const isKnownType = PARAM_TYPE[parameter.in];
        if (!isKnownType) {
            const message = `Parameter 'in' has incorrect value '${parameter.in}' for [${parameter.name}]`;
            throw new types_1.BadRequest({ path: path, message: message });
        }
        const hasSchema = () => {
            var _a, _b;
            const contentType = parameter.content && Object.keys(parameter.content)[0];
            return !parameter.schema || !((_b = (_a = parameter.content) === null || _a === void 0 ? void 0 : _a[contentType]) === null || _b === void 0 ? void 0 : _b.schema);
        };
        if (!hasSchema()) {
            const message = `No available parameter in 'schema' or 'content' for [${parameter.name}]`;
            throw new types_1.BadRequest({ path: path, message: message });
        }
    }
}
exports.ParametersSchemaParser = ParametersSchemaParser;
//# sourceMappingURL=schema.parse.js.map