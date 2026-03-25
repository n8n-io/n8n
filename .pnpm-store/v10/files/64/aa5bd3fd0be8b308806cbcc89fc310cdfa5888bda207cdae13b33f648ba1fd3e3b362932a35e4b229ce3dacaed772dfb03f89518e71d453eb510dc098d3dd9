"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = addMetaSchema2020;
const metaSchema = require("./schema.json");
const applicator = require("./meta/applicator.json");
const unevaluated = require("./meta/unevaluated.json");
const content = require("./meta/content.json");
const core = require("./meta/core.json");
const format = require("./meta/format-annotation.json");
const metadata = require("./meta/meta-data.json");
const validation = require("./meta/validation.json");
const META_SUPPORT_DATA = ["/properties"];
function addMetaSchema2020($data) {
    ;
    [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation),
    ].forEach((sch) => this.addMetaSchema(sch, undefined, false));
    return this;
    function with$data(ajv, sch) {
        return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
    }
}
//# sourceMappingURL=index.js.map