"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaFromConfluentSchema = exports.helperTypeFromSchemaType = exports.schemaTypeFromString = void 0;
const AvroHelper_1 = __importDefault(require("./AvroHelper"));
const JsonHelper_1 = __importDefault(require("./JsonHelper"));
const JsonSchema_1 = __importDefault(require("./JsonSchema"));
const ProtoHelper_1 = __importDefault(require("./ProtoHelper"));
const ProtoSchema_1 = __importDefault(require("./ProtoSchema"));
const _types_1 = require("./@types");
const errors_1 = require("./errors");
const helperTypeFromSchemaTypeMap = {};
const schemaTypeFromString = (schemaTypeString) => {
    switch (schemaTypeString) {
        case 'AVRO':
        case undefined:
            return _types_1.SchemaType.AVRO;
        case 'JSON':
            return _types_1.SchemaType.JSON;
        case 'PROTOBUF':
            return _types_1.SchemaType.PROTOBUF;
        default:
            return _types_1.SchemaType.UNKNOWN;
    }
};
exports.schemaTypeFromString = schemaTypeFromString;
const helperTypeFromSchemaType = (schemaType = _types_1.SchemaType.AVRO) => {
    const schemaTypeStr = schemaType.toString();
    if (!helperTypeFromSchemaTypeMap[schemaTypeStr]) {
        let helper;
        switch (schemaType) {
            case _types_1.SchemaType.AVRO: {
                helper = new AvroHelper_1.default();
                break;
            }
            case _types_1.SchemaType.JSON: {
                helper = new JsonHelper_1.default();
                break;
            }
            case _types_1.SchemaType.PROTOBUF: {
                helper = new ProtoHelper_1.default();
                break;
            }
            default:
                throw new errors_1.ConfluentSchemaRegistryArgumentError('invalid schemaType');
        }
        helperTypeFromSchemaTypeMap[schemaTypeStr] = helper;
    }
    return helperTypeFromSchemaTypeMap[schemaTypeStr];
};
exports.helperTypeFromSchemaType = helperTypeFromSchemaType;
const schemaFromConfluentSchema = (confluentSchema, options) => {
    try {
        let schema;
        switch (confluentSchema.type) {
            case _types_1.SchemaType.AVRO: {
                const opts = (options === null || options === void 0 ? void 0 : options.forSchemaOptions) ||
                    (options === null || options === void 0 ? void 0 : options[_types_1.SchemaType.AVRO]);
                schema = (0, exports.helperTypeFromSchemaType)(confluentSchema.type).getAvroSchema(confluentSchema, opts);
                break;
            }
            case _types_1.SchemaType.JSON: {
                const opts = options === null || options === void 0 ? void 0 : options[_types_1.SchemaType.JSON];
                schema = new JsonSchema_1.default(confluentSchema, opts);
                break;
            }
            case _types_1.SchemaType.PROTOBUF: {
                const opts = options === null || options === void 0 ? void 0 : options[_types_1.SchemaType.PROTOBUF];
                schema = new ProtoSchema_1.default(confluentSchema, opts);
                break;
            }
            default:
                throw new errors_1.ConfluentSchemaRegistryArgumentError('invalid schemaType');
        }
        return schema;
    }
    catch (err) {
        if (err instanceof Error)
            throw new errors_1.ConfluentSchemaRegistryArgumentError(err.message);
        throw err;
    }
};
exports.schemaFromConfluentSchema = schemaFromConfluentSchema;
//# sourceMappingURL=schemaTypeResolver.js.map