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
exports.lazyObject = void 0;
const object_1 = require("../object");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
const lazy_1 = require("./lazy");
function lazyObject(getter) {
    const baseSchema = Object.assign(Object.assign({}, (0, lazy_1.constructLazyBaseSchema)(getter)), { _getRawProperties: () => __awaiter(this, void 0, void 0, function* () { return (yield (0, lazy_1.getMemoizedSchema)(getter))._getRawProperties(); }), _getParsedProperties: () => __awaiter(this, void 0, void 0, function* () { return (yield (0, lazy_1.getMemoizedSchema)(getter))._getParsedProperties(); }) });
    return Object.assign(Object.assign(Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), (0, object_1.getObjectUtils)(baseSchema));
}
exports.lazyObject = lazyObject;
