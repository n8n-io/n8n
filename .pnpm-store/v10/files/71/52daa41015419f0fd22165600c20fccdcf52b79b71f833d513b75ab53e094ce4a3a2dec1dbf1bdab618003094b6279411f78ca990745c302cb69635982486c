"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoizedSchema = exports.constructLazyBaseSchema = exports.lazy = void 0;
const schema_utils_1 = require("../schema-utils");
function lazy(getter) {
    const baseSchema = constructLazyBaseSchema(getter);
    return Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.lazy = lazy;
function constructLazyBaseSchema(getter) {
    return {
        parse: (raw, opts) => getMemoizedSchema(getter).parse(raw, opts),
        json: (parsed, opts) => getMemoizedSchema(getter).json(parsed, opts),
        getType: () => getMemoizedSchema(getter).getType(),
    };
}
exports.constructLazyBaseSchema = constructLazyBaseSchema;
function getMemoizedSchema(getter) {
    const castedGetter = getter;
    if (castedGetter.__zurg_memoized == null) {
        castedGetter.__zurg_memoized = getter();
    }
    return castedGetter.__zurg_memoized;
}
exports.getMemoizedSchema = getMemoizedSchema;
