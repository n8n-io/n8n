"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const errors_1 = require("./errors");
class JsonSchema {
    constructor(schema, opts) {
        this.validate = this.getJsonSchema(schema, opts);
        this.detailedErrorPaths = (opts === null || opts === void 0 ? void 0 : opts.detailedErrorPaths) ? opts === null || opts === void 0 ? void 0 : opts.detailedErrorPaths : false;
    }
    getJsonSchema(schema, opts) {
        var _a;
        const ajv = (_a = opts === null || opts === void 0 ? void 0 : opts.ajvInstance) !== null && _a !== void 0 ? _a : new ajv_1.default(opts);
        const referencedSchemas = opts === null || opts === void 0 ? void 0 : opts.referencedSchemas;
        if (referencedSchemas) {
            referencedSchemas.forEach(rawSchema => {
                const $schema = JSON.parse(rawSchema.schema);
                ajv.addSchema($schema, $schema['$id']);
            });
        }
        const validate = ajv.compile(JSON.parse(schema.schema));
        return validate;
    }
    validatePayload(payload) {
        const paths = [];
        if (!this.isValid(payload, {
            errorHook: (path, message) => {
                if (this.detailedErrorPaths) {
                    paths.push({ path, message });
                }
                else {
                    paths.push(path);
                }
            },
        })) {
            throw new errors_1.ConfluentSchemaRegistryValidationError('invalid payload', paths);
        }
    }
    toBuffer(payload) {
        this.validatePayload(payload);
        return Buffer.from(JSON.stringify(payload));
    }
    fromBuffer(buffer) {
        const payload = JSON.parse(buffer.toString());
        this.validatePayload(payload);
        return payload;
    }
    isValid(payload, opts) {
        var _a;
        if (!this.validate(payload)) {
            if (opts === null || opts === void 0 ? void 0 : opts.errorHook) {
                for (const err of this.validate.errors) {
                    const path = this.isOldAjvValidationError(err) ? err.dataPath : err.instancePath;
                    opts.errorHook([path], (_a = err.message) !== null && _a !== void 0 ? _a : err.data, err.schema);
                }
                return false;
            }
        }
        return true;
    }
    isOldAjvValidationError(error) {
        return error.dataPath != null;
    }
}
exports.default = JsonSchema;
//# sourceMappingURL=JsonSchema.js.map