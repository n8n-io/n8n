"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zipObject = exports.findResponseContent = exports.deprecationWarning = exports.ContentType = void 0;
exports.augmentAjvErrors = augmentAjvErrors;
exports.ajvErrorsToValidatorError = ajvErrorsToValidatorError;
exports.useAjvCache = useAjvCache;
class ContentType {
    constructor(contentType) {
        this.mediaType = null;
        this.parameters = {};
        if (contentType) {
            const parameterRegExp = /;\s*([^=]+)=([^;]+)/g;
            const paramMatches = contentType.matchAll(parameterRegExp);
            if (paramMatches) {
                this.parameters = {};
                for (let match of paramMatches) {
                    const key = match[1].toLowerCase();
                    let value = match[2];
                    if (key === 'charset') {
                        // charset parameter is case insensitive
                        // @see [rfc2046, Section 4.1.2](https://www.rfc-editor.org/rfc/rfc2046#section-4.1.2)
                        value = value.toLowerCase();
                    }
                    this.parameters[key] = value;
                }
                ;
            }
            this.mediaType = contentType.split(';')[0].toLowerCase().trim();
            this.isWildCard = RegExp(/^[a-z]+\/\*$/).test(contentType);
        }
    }
    static from(req) {
        return new ContentType(req.headers['content-type']);
    }
    static fromString(type) {
        return new ContentType(type);
    }
    equivalents() {
        const types = [];
        if (!this.mediaType) {
            return types;
        }
        types.push(new ContentType(this.mediaType));
        if (!this.parameters['charset']) {
            types.push(new ContentType(`${this.normalize(['charset'])}; charset=utf-8`));
        }
        return types;
    }
    normalize(excludeParams = ['boundary']) {
        let parameters = '';
        Object.keys(this.parameters)
            .sort()
            .forEach((key) => {
            if (!excludeParams.includes(key)) {
                parameters += `; ${key}=${this.parameters[key]}`;
            }
        });
        if (this.mediaType)
            return this.mediaType + parameters;
    }
}
exports.ContentType = ContentType;
/**
 * (side-effecting) modifies the errors object
 * TODO - do this some other way
 * @param errors
 */
function augmentAjvErrors(errors = []) {
    errors.forEach((e) => {
        if (e.keyword === 'enum') {
            const params = e.params;
            const allowedEnumValues = params === null || params === void 0 ? void 0 : params.allowedValues;
            e.message = !!allowedEnumValues
                ? `${e.message}: ${allowedEnumValues.join(', ')}`
                : e.message;
        }
    });
    const serDesPaths = new Set();
    return errors.filter((e) => {
        if (serDesPaths.has(e.schemaPath)) {
            return false;
        }
        if (e.params['x-eov-res-serdes']) {
            // If response serialization failed,
            // silence additional errors about not being a string.
            serDesPaths.add(e.schemaPath.replace('x-eov-res-serdes', 'x-eov-type'));
        }
        return true;
    });
}
function ajvErrorsToValidatorError(status, errors) {
    return {
        status,
        errors: errors.map((e) => {
            var _a, _b, _c;
            const params = e.params;
            const required = (params === null || params === void 0 ? void 0 : params.missingProperty) &&
                e.instancePath + '/' + params.missingProperty;
            const additionalProperty = (params === null || params === void 0 ? void 0 : params.additionalProperty) &&
                e.instancePath + '/' + params.additionalProperty;
            const unevaluatedProperty = (params === null || params === void 0 ? void 0 : params.unevaluatedProperty) &&
                e.instancePath + '/' + params.unevaluatedProperty;
            const path = (_c = (_b = (_a = required !== null && required !== void 0 ? required : additionalProperty) !== null && _a !== void 0 ? _a : unevaluatedProperty) !== null && _b !== void 0 ? _b : e.instancePath) !== null && _c !== void 0 ? _c : e.schemaPath;
            return {
                path,
                message: e.message,
                errorCode: `${e.keyword}.openapi.validation`,
            };
        }),
    };
}
exports.deprecationWarning = process.env.NODE_ENV !== 'production' ? console.warn : () => { };
/**
 *
 * @param accepts the list of accepted media types
 * @param expectedTypes - expected media types defined in the response schema
 * @returns the content-type
 */
const findResponseContent = function (accepts, expectedTypes) {
    const expectedTypesMap = new Map();
    for (let type of expectedTypes) {
        expectedTypesMap.set(ContentType.fromString(type).normalize(), type);
    }
    // if accepts are supplied, try to find a match, and use its validator
    for (const accept of accepts) {
        const act = ContentType.fromString(accept);
        const normalizedCT = act.normalize();
        if (normalizedCT === '*/*') {
            return expectedTypes[0];
        }
        else if (expectedTypesMap.has(normalizedCT)) {
            return normalizedCT;
        }
        else if (expectedTypesMap.has(act.mediaType)) {
            return act.mediaType;
        }
        else if (act.isWildCard) {
            // wildcard of type application/*
            const [type] = normalizedCT.split('/', 1);
            for (const expectedType of expectedTypesMap) {
                if (new RegExp(`^${type}\/.+$`).test(expectedType[0])) {
                    return expectedType[1];
                }
            }
        }
        else {
            for (const expectedType of expectedTypes) {
                const ect = ContentType.fromString(expectedType);
                if (ect.mediaType === act.mediaType) {
                    return expectedType;
                }
            }
        }
    }
    return null;
};
exports.findResponseContent = findResponseContent;
const zipObject = (keys, values) => keys.reduce((acc, key, idx) => {
    acc[key] = values[idx];
    return acc;
}, {});
exports.zipObject = zipObject;
/**
 * Tries to fetch a schema from ajv instance by the provided key otherwise adds (and
 * compiles) the schema under provided key. We provide a key to avoid ajv library
 * using the whole schema as a cache key, leading to a lot of unnecessary memory
 * usage - this is not recommended by the library either:
 * https://ajv.js.org/guide/managing-schemas.html#cache-key-schema-vs-key-vs-id
 *
 * @param ajvCacheKey - Key which will be used for ajv cache
 */
function useAjvCache(ajv, schema, ajvCacheKey) {
    let validator = ajv.getSchema(ajvCacheKey);
    if (!validator) {
        ajv.addSchema(schema, ajvCacheKey);
        validator = ajv.getSchema(ajvCacheKey);
    }
    return validator;
}
//# sourceMappingURL=util.js.map