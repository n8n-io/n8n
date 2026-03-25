"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("ajv/dist/core");
const codegen_1 = require("ajv/dist/compile/codegen");
const ops = codegen_1.operators;
const KWDs = {
    maximum: {
        exclusive: "exclusiveMaximum",
        ops: [
            { okStr: "<=", ok: ops.LTE, fail: ops.GT },
            { okStr: "<", ok: ops.LT, fail: ops.GTE },
        ],
    },
    minimum: {
        exclusive: "exclusiveMinimum",
        ops: [
            { okStr: ">=", ok: ops.GTE, fail: ops.LT },
            { okStr: ">", ok: ops.GT, fail: ops.LTE },
        ],
    },
};
const error = {
    message: (cxt) => core_1.str `must be ${kwdOp(cxt).okStr} ${cxt.schemaCode}`,
    params: (cxt) => core_1._ `{comparison: ${kwdOp(cxt).okStr}, limit: ${cxt.schemaCode}}`,
};
const def = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
        const { data, schemaCode } = cxt;
        cxt.fail$data(core_1._ `${data} ${kwdOp(cxt).fail} ${schemaCode} || isNaN(${data})`);
    },
};
function kwdOp(cxt) {
    var _a;
    const keyword = cxt.keyword;
    const opsIdx = ((_a = cxt.parentSchema) === null || _a === void 0 ? void 0 : _a[KWDs[keyword].exclusive]) ? 1 : 0;
    return KWDs[keyword].ops[opsIdx];
}
exports.default = def;
//# sourceMappingURL=limitNumber.js.map