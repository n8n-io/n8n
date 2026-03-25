"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestAjv = createRequestAjv;
exports.createResponseAjv = createResponseAjv;
const type_1 = require("ajv/dist/vocabularies/jtd/type");
const ajv_formats_1 = require("ajv-formats");
const formats_1 = require("./formats");
const traverse = require("json-schema-traverse");
const factory_1 = require("./factory");
function createRequestAjv(openApiSpec, options = {}) {
    return createAjv(openApiSpec, options);
}
function createResponseAjv(openApiSpec, options = {}) {
    return createAjv(openApiSpec, options, false);
}
function createAjv(openApiSpec, options = {}, request = true) {
    var _a;
    const { ajvFormats } = options, ajvOptions = __rest(options, ["ajvFormats"]);
    const ajv = (0, factory_1.factoryAjv)(openApiSpec.openapi, Object.assign(Object.assign({}, ajvOptions), { formats: formats_1.formats }));
    // Clean openApiSpec
    traverse(openApiSpec, { allKeys: true }, (schema => {
        if ('x-stoplight' in schema) {
            delete schema['x-stoplight'];
        }
    }));
    // Formats will overwrite existing validation,
    // so set in order of least->most important.
    if (options.serDesMap) {
        for (const serDesFormat of Object.keys(options.serDesMap)) {
            ajv.addFormat(serDesFormat, true);
        }
    }
    for (const [formatName, formatValidation] of Object.entries(formats_1.formats)) {
        ajv.addFormat(formatName, formatValidation);
    }
    if (ajvFormats) {
        (0, ajv_formats_1.default)(ajv, ajvFormats);
    }
    for (let [formatName, formatDefinition] of Object.entries(options.formats)) {
        ajv.addFormat(formatName, formatDefinition);
    }
    if (options.serDesMap) {
        // Alias for `type` that can execute AFTER x-eov-res-serdes
        // There is a `type` keyword which this is positioned "next to",
        // as well as high-level type assertion that runs before any keywords.
        ajv.addKeyword(Object.assign(Object.assign({}, type_1.default), { keyword: 'x-eov-type', before: 'type' }));
    }
    if (request) {
        if (options.serDesMap) {
            ajv.addKeyword({
                keyword: 'x-eov-req-serdes',
                modifying: true,
                errors: true,
                // Deserialization occurs AFTER all string validations
                post: true,
                compile: (sch, p, it) => {
                    const validate = (data, ctx) => {
                        if (typeof data !== 'string') {
                            // Either null (possibly allowed, defer to nullable validation)
                            // or already failed string validation (no need to throw additional internal errors).
                            return true;
                        }
                        try {
                            ctx.parentData[ctx.parentDataProperty] = sch.deserialize(data);
                        }
                        catch (e) {
                            validate.errors = [
                                {
                                    keyword: 'serdes',
                                    instancePath: ctx.instancePath,
                                    schemaPath: it.schemaPath.str,
                                    message: e.message || `format is invalid`,
                                    params: { 'x-eov-req-serdes': ctx.parentDataProperty },
                                },
                            ];
                            return false;
                        }
                        return true;
                    };
                    return validate;
                },
            });
        }
        ajv.removeKeyword('readOnly');
        ajv.addKeyword({
            keyword: 'readOnly',
            errors: true,
            compile: (sch, p, it) => {
                if (sch) {
                    const validate = (data, ctx) => {
                        if (options.removeAdditional == true || options.removeAdditional == "all" || options.removeAdditional == "failing") {
                            // Remove readonly properties in request
                            delete ctx.parentData[ctx.parentDataProperty];
                            return true;
                        }
                        else {
                            const isValid = data == null;
                            if (!isValid) {
                                validate.errors = [
                                    {
                                        keyword: 'readOnly',
                                        instancePath: ctx.instancePath,
                                        schemaPath: it.schemaPath.str,
                                        message: `is read-only`,
                                        params: { writeOnly: ctx.parentDataProperty },
                                    },
                                ];
                            }
                            return false;
                        }
                    };
                    return validate;
                }
                return () => true;
            },
        });
    }
    else {
        // response
        if (options.serDesMap) {
            ajv.addKeyword({
                keyword: 'x-eov-res-serdes',
                modifying: true,
                errors: true,
                // Serialization occurs BEFORE type validations
                before: 'x-eov-type',
                compile: (sch, p, it) => {
                    const validate = (data, ctx) => {
                        if (typeof data === 'string')
                            return true;
                        try {
                            ctx.parentData[ctx.parentDataProperty] = sch.serialize(data);
                        }
                        catch (e) {
                            validate.errors = [
                                {
                                    keyword: 'serdes',
                                    instancePath: ctx.instancePath,
                                    schemaPath: it.schemaPath.str,
                                    message: `format is invalid`,
                                    params: { 'x-eov-res-serdes': ctx.parentDataProperty },
                                },
                            ];
                            return false;
                        }
                        return true;
                    };
                    return validate;
                },
            });
        }
        ajv.removeKeyword('writeOnly');
        ajv.addKeyword({
            keyword: 'writeOnly',
            schemaType: 'boolean',
            errors: true,
            compile: (sch, p, it) => {
                if (sch) {
                    const validate = (data, ctx) => {
                        if (options.removeAdditional == true || options.removeAdditional == "all" || options.removeAdditional == "failing") {
                            // Remove readonly properties in request
                            delete ctx.parentData[ctx.parentDataProperty];
                            return true;
                        }
                        else {
                            const isValid = data == null;
                            if (!isValid) {
                                validate.errors = [
                                    {
                                        keyword: 'writeOnly',
                                        instancePath: ctx.instancePath,
                                        schemaPath: it.schemaPath.str,
                                        message: `is write-only`,
                                        params: { writeOnly: ctx.parentDataProperty },
                                    },
                                ];
                            }
                            return false;
                        }
                    };
                    return validate;
                }
                return () => true;
            },
        });
    }
    if ((_a = openApiSpec.components) === null || _a === void 0 ? void 0 : _a.schemas) {
        Object.entries(openApiSpec.components.schemas).forEach(([id, schema]) => {
            ajv.addSchema(openApiSpec.components.schemas[id], `#/components/schemas/${id}`);
        });
    }
    return ajv;
}
//# sourceMappingURL=index.js.map