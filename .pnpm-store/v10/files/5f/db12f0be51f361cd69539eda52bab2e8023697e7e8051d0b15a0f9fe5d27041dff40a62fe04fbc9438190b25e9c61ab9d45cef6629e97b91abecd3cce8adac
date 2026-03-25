"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withParsedProperties = exports.getObjectLikeUtils = void 0;
const filterObject_1 = require("../../utils/filterObject");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const schema_utils_1 = require("../schema-utils");
function getObjectLikeUtils(schema) {
    return {
        withParsedProperties: (properties) => withParsedProperties(schema, properties),
    };
}
exports.getObjectLikeUtils = getObjectLikeUtils;
/**
 * object-like utils are defined in one file to resolve issues with circular imports
 */
function withParsedProperties(objectLike, properties) {
    const objectSchema = {
        parse: (raw, opts) => {
            const parsedObject = objectLike.parse(raw, opts);
            if (!parsedObject.ok) {
                return parsedObject;
            }
            const additionalProperties = Object.entries(properties).reduce((processed, [key, value]) => {
                return Object.assign(Object.assign({}, processed), { [key]: typeof value === "function" ? value(parsedObject.value) : value });
            }, {});
            return {
                ok: true,
                value: Object.assign(Object.assign({}, parsedObject.value), additionalProperties),
            };
        },
        json: (parsed, opts) => {
            var _a;
            if (!(0, isPlainObject_1.isPlainObject)(parsed)) {
                return {
                    ok: false,
                    errors: [
                        {
                            path: (_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : [],
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(parsed, "object"),
                        },
                    ],
                };
            }
            // strip out added properties
            const addedPropertyKeys = new Set(Object.keys(properties));
            const parsedWithoutAddedProperties = (0, filterObject_1.filterObject)(parsed, Object.keys(parsed).filter((key) => !addedPropertyKeys.has(key)));
            return objectLike.json(parsedWithoutAddedProperties, opts);
        },
        getType: () => objectLike.getType(),
    };
    return Object.assign(Object.assign(Object.assign({}, objectSchema), (0, schema_utils_1.getSchemaUtils)(objectSchema)), getObjectLikeUtils(objectSchema));
}
exports.withParsedProperties = withParsedProperties;
