"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const avsc_1 = __importDefault(require("avsc"));
const _types_1 = require("./@types");
class AvroHelper {
    getRawAvroSchema(schema) {
        return (typeof schema.schema === 'string'
            ? JSON.parse(schema.schema)
            : schema.schema);
    }
    getAvroSchema(schema, opts) {
        const rawSchema = this.isRawAvroSchema(schema)
            ? schema
            : this.getRawAvroSchema(schema);
        // @ts-ignore TODO: Fix typings for Schema...
        const addReferencedSchemas = (userHook) => (schema, opts) => {
            var _a;
            const avroOpts = opts;
            (_a = avroOpts === null || avroOpts === void 0 ? void 0 : avroOpts.referencedSchemas) === null || _a === void 0 ? void 0 : _a.forEach(subSchema => {
                const rawSubSchema = this.getRawAvroSchema(subSchema);
                avroOpts.typeHook = userHook;
                avsc_1.default.Type.forSchema(rawSubSchema, avroOpts);
            });
            if (userHook) {
                return userHook(schema, opts);
            }
        };
        const avroSchema = avsc_1.default.Type.forSchema(rawSchema, {
            ...opts,
            typeHook: addReferencedSchemas(opts === null || opts === void 0 ? void 0 : opts.typeHook),
        });
        return avroSchema;
    }
    validate(avroSchema) {
        if (!avroSchema.name) {
            throw new errors_1.ConfluentSchemaRegistryArgumentError(`Invalid name: ${avroSchema.name}`);
        }
    }
    getSubject(schema, _avroSchema, separator) {
        const rawSchema = this.getRawAvroSchema(schema);
        if (!rawSchema.namespace) {
            throw new errors_1.ConfluentSchemaRegistryArgumentError(`Invalid namespace: ${rawSchema.namespace}`);
        }
        const subject = {
            name: [rawSchema.namespace, rawSchema.name].join(separator),
        };
        return subject;
    }
    isRawAvroSchema(schema) {
        const asRawAvroSchema = schema;
        return asRawAvroSchema.name != null && asRawAvroSchema.type != null;
    }
    toConfluentSchema(data) {
        return { type: _types_1.SchemaType.AVRO, schema: data.schema, references: data.references };
    }
    updateOptionsFromSchemaReferences(referencedSchemas, options = {}) {
        return { ...options, [_types_1.SchemaType.AVRO]: { ...options[_types_1.SchemaType.AVRO], referencedSchemas } };
    }
}
exports.default = AvroHelper;
//# sourceMappingURL=AvroHelper.js.map