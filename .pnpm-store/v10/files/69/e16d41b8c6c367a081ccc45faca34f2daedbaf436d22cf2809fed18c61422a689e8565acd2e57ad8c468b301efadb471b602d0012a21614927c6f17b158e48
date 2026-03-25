"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const protobufjs_1 = __importDefault(require("protobufjs"));
const light_1 = require("protobufjs/light");
const errors_1 = require("./errors");
class ProtoSchema {
    constructor(schema, opts) {
        const parsedMessage = protobufjs_1.default.parse(schema.schema);
        const root = parsedMessage.root;
        const referencedSchemas = opts === null || opts === void 0 ? void 0 : opts.referencedSchemas;
        // handle all schema references independent on nested references
        if (referencedSchemas) {
            referencedSchemas.forEach(rawSchema => protobufjs_1.default.parse(rawSchema.schema, root));
        }
        this.message = root.lookupType(this.getTypeName(parsedMessage, opts));
    }
    getNestedTypeName(parent) {
        if (!parent)
            throw new errors_1.ConfluentSchemaRegistryArgumentError('no nested fields');
        const keys = Object.keys(parent);
        const reflection = parent[keys[0]];
        // Traverse down the nested Namespaces until we find a message Type instance (which extends Namespace)
        if (reflection instanceof light_1.Namespace && !(reflection instanceof light_1.Type) && reflection.nested)
            return this.getNestedTypeName(reflection.nested);
        return keys[0];
    }
    getTypeName(parsedMessage, opts) {
        const root = parsedMessage.root;
        const pkg = parsedMessage.package;
        const name = opts && opts.messageName ? opts.messageName : this.getNestedTypeName(root.nested);
        return `${pkg ? pkg + '.' : ''}.${name}`;
    }
    trimStart(buffer) {
        const index = buffer.findIndex((value) => value != 0);
        return buffer.slice(index);
    }
    toBuffer(payload) {
        const paths = [];
        if (!this.isValid(payload, {
            errorHook: (path) => paths.push(path),
        })) {
            throw new errors_1.ConfluentSchemaRegistryValidationError('invalid payload', paths);
        }
        const protoPayload = this.message.create(payload);
        return Buffer.from(this.message.encode(protoPayload).finish());
    }
    fromBuffer(buffer) {
        const newBuffer = this.trimStart(buffer);
        return this.message.decode(newBuffer);
    }
    isValid(payload, opts) {
        const errMsg = this.message.verify(payload);
        if (errMsg) {
            if (opts === null || opts === void 0 ? void 0 : opts.errorHook) {
                opts.errorHook([errMsg], payload);
            }
            return false;
        }
        return true;
    }
}
exports.default = ProtoSchema;
//# sourceMappingURL=ProtoSchema.js.map