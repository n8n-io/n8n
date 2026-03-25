"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KWDs = {
    exclusiveMaximum: "maximum",
    exclusiveMinimum: "minimum",
};
const def = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "boolean",
    code({ keyword, parentSchema }) {
        const limitKwd = KWDs[keyword];
        if (parentSchema[limitKwd] === undefined) {
            throw new Error(`${keyword} can only be used with ${limitKwd}`);
        }
    },
};
exports.default = def;
//# sourceMappingURL=limitNumberExclusive.js.map