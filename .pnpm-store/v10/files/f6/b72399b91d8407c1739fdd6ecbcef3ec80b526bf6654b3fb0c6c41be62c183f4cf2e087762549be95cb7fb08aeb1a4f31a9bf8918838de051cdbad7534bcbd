"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazyObject = void 0;
const object_1 = require("../object");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
const lazy_1 = require("./lazy");
function lazyObject(getter) {
    const baseSchema = Object.assign(Object.assign({}, (0, lazy_1.constructLazyBaseSchema)(getter)), { _getRawProperties: () => (0, lazy_1.getMemoizedSchema)(getter)._getRawProperties(), _getParsedProperties: () => (0, lazy_1.getMemoizedSchema)(getter)._getParsedProperties() });
    return Object.assign(Object.assign(Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), (0, object_1.getObjectUtils)(baseSchema));
}
exports.lazyObject = lazyObject;
