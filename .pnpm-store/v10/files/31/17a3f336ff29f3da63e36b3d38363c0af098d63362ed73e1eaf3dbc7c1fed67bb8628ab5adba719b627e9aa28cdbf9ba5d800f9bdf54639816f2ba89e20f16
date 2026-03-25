"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("./@types");
const errors_1 = require("./errors");
class ProtoHelper {
    validate(_schema) {
        return;
    }
    getSubject(_confluentSchema, _schema, _separator) {
        throw new errors_1.ConfluentSchemaRegistryError('not implemented yet');
    }
    toConfluentSchema(data) {
        return { type: _types_1.SchemaType.PROTOBUF, schema: data.schema, references: data.references };
    }
    updateOptionsFromSchemaReferences(referencedSchemas, options = {}) {
        return {
            ...options,
            [_types_1.SchemaType.PROTOBUF]: { ...options[_types_1.SchemaType.PROTOBUF], referencedSchemas },
        };
    }
}
exports.default = ProtoHelper;
//# sourceMappingURL=ProtoHelper.js.map