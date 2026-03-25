"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).parse(raw, opts); }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).json(parsed, opts); }),
        getType: () => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).getType(); }),
    };
}
exports.constructLazyBaseSchema = constructLazyBaseSchema;
function getMemoizedSchema(getter) {
    return __awaiter(this, void 0, void 0, function* () {
        const castedGetter = getter;
        if (castedGetter.__zurg_memoized == null) {
            castedGetter.__zurg_memoized = yield getter();
        }
        return castedGetter.__zurg_memoized;
    });
}
exports.getMemoizedSchema = getMemoizedSchema;
