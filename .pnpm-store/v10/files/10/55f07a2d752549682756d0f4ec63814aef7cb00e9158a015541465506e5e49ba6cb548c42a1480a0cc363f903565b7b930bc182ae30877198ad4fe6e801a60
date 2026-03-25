"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
const core_1 = require("ajv/dist/core");
const draft4_1 = require("./vocabulary/draft4");
const discriminator_1 = require("ajv/dist/vocabularies/discriminator");
const draft4MetaSchema = require("./refs/json-schema-draft-04.json");
const META_SUPPORT_DATA = ["/properties"];
const META_SCHEMA_ID = "http://json-schema.org/draft-04/schema";
class Ajv extends core_1.default {
    constructor(opts = {}) {
        super({
            ...opts,
            schemaId: "id",
        });
    }
    _addVocabularies() {
        super._addVocabularies();
        draft4_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
            this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
            return;
        const metaSchema = this.opts.$data
            ? this.$dataMetaSchema(draft4MetaSchema, META_SUPPORT_DATA)
            : draft4MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
        return (this.opts.defaultMeta =
            super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
    }
}
module.exports = exports = Ajv;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Ajv;
var core_2 = require("ajv/dist/core");
Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return core_2.KeywordCxt; } });
var core_3 = require("ajv/dist/core");
Object.defineProperty(exports, "_", { enumerable: true, get: function () { return core_3._; } });
Object.defineProperty(exports, "str", { enumerable: true, get: function () { return core_3.str; } });
Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return core_3.stringify; } });
Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return core_3.nil; } });
Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return core_3.Name; } });
Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return core_3.CodeGen; } });
//# sourceMappingURL=index.js.map