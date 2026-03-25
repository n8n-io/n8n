"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPISchemaValidator = void 0;
const ajv_formats_1 = require("ajv-formats");
const factory_1 = require("./ajv/factory");
const factory_schema_1 = require("./openapi/factory.schema");
class OpenAPISchemaValidator {
    constructor(opts) {
        const options = {
            allErrors: true,
            validateFormats: true,
            coerceTypes: false,
            useDefaults: false,
            // Strict enforcement is nice, but schema is controlled by this library and known to be valid
            strict: false,
        };
        if (!opts.validateApiSpec) {
            options.validateSchema = false;
        }
        const ajvInstance = (0, factory_1.factoryAjv)(opts.version, options);
        const schema = (0, factory_schema_1.factorySchema)(opts.version);
        (0, ajv_formats_1.default)(ajvInstance, ['email', 'regex', 'uri', 'uri-reference']);
        ajvInstance.addSchema(schema);
        this.validator = ajvInstance.compile(schema);
    }
    validate(openapiDoc) {
        const valid = this.validator(openapiDoc);
        if (!valid) {
            return { errors: this.validator.errors };
        }
        else {
            return { errors: [] };
        }
    }
}
exports.OpenAPISchemaValidator = OpenAPISchemaValidator;
//# sourceMappingURL=openapi.schema.validator.js.map