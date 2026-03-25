"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dereferenceParameter = dereferenceParameter;
exports.normalizeParameter = normalizeParameter;
exports.dereferenceSchema = dereferenceSchema;
function dereferenceParameter(apiDocs, parameter) {
    // TODO this should recurse or use ajv.getSchema - if implemented as such, may want to cache the result
    // as it is called by query.paraer and req.parameter mutator
    if (is$Ref(parameter)) {
        const p = parameter;
        const id = p.$ref.replace(/^.+\//i, '');
        return apiDocs.components.parameters[id];
    }
    else {
        return parameter;
    }
}
function normalizeParameter(ajv, parameter) {
    var _a, _b, _c;
    let schema;
    if (is$Ref(parameter)) {
        schema = dereferenceSchema(ajv, parameter['$ref']);
    }
    else if ((_a = parameter === null || parameter === void 0 ? void 0 : parameter.schema) === null || _a === void 0 ? void 0 : _a['$ref']) {
        schema = dereferenceSchema(ajv, parameter.schema['$ref']);
    }
    else {
        schema = parameter.schema;
    }
    if (!schema && parameter.content) {
        const contentType = Object.keys(parameter.content)[0];
        schema = (_c = (_b = parameter.content) === null || _b === void 0 ? void 0 : _b[contentType]) === null || _c === void 0 ? void 0 : _c.schema;
    }
    if (!schema) {
        schema = parameter;
    }
    applyParameterStyle(parameter);
    applyParameterExplode(parameter);
    const name = parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;
    return { name, schema };
}
function applyParameterStyle(param) {
    if (!param.style) {
        if (param.in === 'path') {
            param.style = 'simple';
        }
        else if (param.in === 'query') {
            param.style = 'form';
        }
        else if (param.style === 'header') {
            param.style = 'simple';
        }
        else if (param.style === 'cookie') {
            param.style = 'form';
        }
    }
}
function applyParameterExplode(param) {
    if (param.explode == null) {
        if (param.in === 'path') {
            param.explode = false;
        }
        else if (param.in === 'query') {
            param.explode = true;
        }
        else if (param.style === 'header') {
            param.explode = false;
        }
        else if (param.style === 'cookie') {
            param.explode = true;
        }
    }
}
function dereferenceSchema(ajv, ref) {
    // TODO cache schemas - so that we don't recurse every time
    const derefSchema = ajv.getSchema(ref);
    if (derefSchema === null || derefSchema === void 0 ? void 0 : derefSchema['$ref']) {
        return dereferenceSchema(ajv, '');
    }
    return derefSchema === null || derefSchema === void 0 ? void 0 : derefSchema.schema;
}
function is$Ref(parameter) {
    return parameter.hasOwnProperty('$ref');
}
//# sourceMappingURL=util.js.map