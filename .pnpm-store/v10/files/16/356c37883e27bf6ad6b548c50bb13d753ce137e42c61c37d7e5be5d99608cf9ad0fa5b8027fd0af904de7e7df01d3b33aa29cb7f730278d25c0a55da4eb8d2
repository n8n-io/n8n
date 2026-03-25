"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestParameterMutator = void 0;
const types_1 = require("../../framework/types");
const url = require("url");
const util_1 = require("./util");
const mediaTypeParser = require("media-typer");
const contentTypeParser = require("content-type");
const qs_1 = require("qs");
const RESERVED_CHARS = /[\:\/\?#\[\]@!\$&\'()\*\+,;=]/;
const ARRAY_DELIMITER = {
    simple: ',',
    form: ',',
    spaceDelimited: ' ',
    pipeDelimited: '|',
};
const REQUEST_FIELDS = {
    query: 'query',
    header: 'headers',
    path: 'params',
    cookie: 'cookies',
};
/**
 * A class top parse and mutate the incoming request parameters according to the openapi spec.
 * the request is mutated to accomodate various styles and types e.g. form, explode, deepObject, etc
 */
class RequestParameterMutator {
    constructor(ajv, apiDocs, path, parsedSchema) {
        this.ajv = ajv;
        this._apiDocs = apiDocs;
        this.path = path;
        this.parsedSchema = parsedSchema;
    }
    /**
     * Modifies an incoming request object by applying the openapi schema
     * req values may be parsed/mutated as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
     * @param req
     */
    modifyRequest(req) {
        const { parameters } = req.openapi.schema;
        const rawQuery = this.parseQueryStringUndecoded(url.parse(req.originalUrl).query);
        req.query = this.handleBracketNotationQueryFields(req.query);
        (parameters || []).forEach((p) => {
            const parameter = (0, util_1.dereferenceParameter)(this._apiDocs, p);
            const { name, schema } = (0, util_1.normalizeParameter)(this.ajv, parameter);
            const { type } = schema;
            const { style, explode } = parameter;
            const i = req.originalUrl.indexOf('?');
            const queryString = req.originalUrl.substr(i + 1);
            if (parameter.in === 'query' &&
                !parameter.allowReserved &&
                !!parameter.explode) {
                //} && !!parameter.explode) {
                this.validateReservedCharacters(name, rawQuery);
            }
            if (parameter.in === 'query' &&
                !parameter.allowReserved &&
                !parameter.explode) {
                //} && !!parameter.explode) {
                this.validateReservedCharacters(name, rawQuery, true);
            }
            if (parameter.content) {
                this.handleContent(req, name, parameter);
            }
            else if (parameter.in === 'query' && this.isObjectOrXOf(schema)) {
                // handle bracket notation and mutates query param
                if (style === 'form' && explode) {
                    this.parseJsonAndMutateRequest(req, parameter.in, name);
                    this.handleFormExplode(req, name, schema, parameter);
                }
                else if (style === 'deepObject') {
                    this.handleDeepObject(req, queryString, name, schema);
                }
                else if (style === 'form' && !explode && schema.type === 'object') {
                    const value = req.query[name];
                    if (typeof value === 'string') {
                        const kvPairs = this.csvToKeyValuePairs(value);
                        if (kvPairs) {
                            req.query[name] = kvPairs;
                            return;
                        }
                    }
                    this.parseJsonAndMutateRequest(req, parameter.in, name);
                }
                else {
                    this.parseJsonAndMutateRequest(req, parameter.in, name);
                }
            }
            else if (type === 'array' && !explode) {
                const delimiter = ARRAY_DELIMITER[parameter.style];
                this.validateArrayDelimiter(delimiter, parameter);
                this.parseJsonArrayAndMutateRequest(req, parameter.in, name, delimiter, rawQuery);
            }
            else if (type === 'array' && explode) {
                this.explodeJsonArrayAndMutateRequest(req, parameter.in, name);
            }
            else if (style === 'form' && explode) {
                this.handleFormExplode(req, name, schema, parameter);
            }
        });
    }
    handleDeepObject(req, qs, name, schema) {
        var _a;
        const getDefaultSchemaValue = () => {
            let defaultValue;
            if (schema.default !== undefined) {
                defaultValue = schema.default;
            }
            else if (schema.properties) {
                Object.entries(schema.properties).forEach(([k, v]) => {
                    // Handle recursive objects
                    defaultValue !== null && defaultValue !== void 0 ? defaultValue : (defaultValue = {});
                    if (v['default']) {
                        defaultValue[k] = v['default'];
                    }
                });
            }
            else {
                ['allOf', 'oneOf', 'anyOf'].forEach((key) => {
                    if (schema[key]) {
                        schema[key].forEach((s) => {
                            if (s.$ref) {
                                const compiledSchema = this.ajv.getSchema(s.$ref);
                                // as any -> https://stackoverflow.com/a/23553128
                                defaultValue =
                                    defaultValue === undefined
                                        ? compiledSchema.schema.default
                                        : defaultValue;
                            }
                            else {
                                defaultValue =
                                    defaultValue === undefined ? s.default : defaultValue;
                            }
                        });
                    }
                });
            }
            return defaultValue;
        };
        if (!((_a = req.query) === null || _a === void 0 ? void 0 : _a[name])) {
            req.query[name] = getDefaultSchemaValue();
        }
        this.parseJsonAndMutateRequest(req, 'query', name);
        // TODO handle url encoded?
    }
    handleContent(req, name, parameter) {
        /**
         * Per the OpenAPI3 spec:
         * A map containing the representations for the parameter. The key is the media type
         * and the value describes it. The map MUST only contain one entry.
         * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterContent
         */
        const contentType = Object.keys(parameter.content)[0];
        const parsedContentType = contentTypeParser.parse(contentType);
        const parsedMediaType = mediaTypeParser.parse(parsedContentType.type);
        const { subtype, suffix } = parsedMediaType;
        const isMediaTypeJson = [subtype, suffix].includes('json');
        if (isMediaTypeJson) {
            const reqField = REQUEST_FIELDS[parameter.in];
            this.parseJsonAndMutateRequest(req, reqField, name);
        }
    }
    handleFormExplode(req, name, schema, parameter) {
        var _a;
        // fetch the keys used for this kind of explode
        const type = schema.type;
        const hasXOf = schema['allOf'] || schema['oneOf'] || schema['anyOf'];
        const properties = hasXOf
            ? xOfProperties(schema)
            : type === 'object'
                ? Object.keys((_a = schema.properties) !== null && _a !== void 0 ? _a : {})
                : [];
        this.explodedJsonObjectAndMutateRequest(req, parameter.in, name, properties, schema);
        function xOfProperties(schema) {
            return ['allOf', 'oneOf', 'anyOf'].reduce((acc, key) => {
                if (!schema.hasOwnProperty(key)) {
                    return acc;
                }
                else {
                    const foundProperties = schema[key].reduce((acc2, obj) => {
                        return obj.type === 'object'
                            ? acc2.concat(...Object.keys(obj.properties))
                            : acc2;
                    }, []);
                    return foundProperties.length > 0
                        ? acc.concat(...foundProperties)
                        : acc;
                }
            }, []);
        }
    }
    parseJsonAndMutateRequest(req, $in, name) {
        var _a;
        /**
         * support json in request params, query, headers and cookies
         * like this filter={"type":"t-shirt","color":"blue"}
         *
         * https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
         */
        const field = REQUEST_FIELDS[$in];
        if ((_a = req[field]) === null || _a === void 0 ? void 0 : _a[name]) {
            try {
                const value = req[field][name];
                const json = JSON.parse(value);
                req[field][name] = json;
            }
            catch (e) {
                // NOOP If parsing failed but _should_ contain JSON, validator will catch it.
                // May contain falsely flagged parameter (e.g. input was object OR string)
            }
        }
    }
    /**
     * used for !explode array parameters
     * @param req
     * @param $in
     * @param name
     * @param delimiter
     * @param rawQuery
     * @private
     */
    parseJsonArrayAndMutateRequest(req, $in, name, delimiter, rawQuery) {
        var _a, _b;
        /**
         * array deserialization for query and params
         * filter=foo,bar,baz
         * filter=foo|bar|baz
         * filter=foo%20bar%20baz
         */
        const field = REQUEST_FIELDS[$in];
        const rawValues = [];
        if (['query'].includes($in)) {
            // perhaps split query from params
            rawValues.concat((_a = rawQuery.get(name)) !== null && _a !== void 0 ? _a : []);
        }
        let i = 0;
        if ((_b = req[field]) === null || _b === void 0 ? void 0 : _b[name]) {
            if (Array.isArray(req[field][name]))
                return;
            const value = req[field][name].split(delimiter);
            const rawValue = rawValues[i++];
            if (rawValue === null || rawValue === void 0 ? void 0 : rawValue.includes(delimiter)) {
                // TODO add && !allowReserved to improve performance. When allowReserved is true, commas are common and we do not need to do this extra work
                // Currently, rawValue is only populated for query params
                // if the raw value contains a delimiter, decode manually
                // parse the decode value and update req[field][name]
                const manuallyDecodedValues = rawValue
                    .split(delimiter)
                    .map((v) => decodeURIComponent(v));
                req[field][name] = manuallyDecodedValues;
            }
            else {
                req[field][name] = value;
            }
        }
    }
    // TODO is this method still necessary with the new qs processing introduced in the express-5 support
    // (Try removing it)
    explodedJsonObjectAndMutateRequest(req, $in, name, properties, schema) {
        // forcing convert to object if scheme describes param as object + explode
        // for easy validation, keep the schema but update whereabouts of its sub components
        const field = REQUEST_FIELDS[$in];
        if (req[field]) {
            // check if there is at least one of the nested properties before creating the root property
            const atLeastOne = properties.some((p) => {
                return Object.prototype.hasOwnProperty.call(req[field], p);
            });
            if (atLeastOne) {
                req[field][name] = {};
                properties.forEach((property) => {
                    var _a, _b;
                    if (req[field][property]) {
                        const schema = this.parsedSchema[field];
                        const type = (_b = (_a = schema.properties[name].properties) === null || _a === void 0 ? void 0 : _a[property]) === null || _b === void 0 ? void 0 : _b.type;
                        const value = req[field][property];
                        const coercedValue = type === 'array' && !Array.isArray(value) ? [value] : value;
                        req[field][name][property] = coercedValue;
                        delete req[field][property];
                    }
                });
            }
        }
    }
    explodeJsonArrayAndMutateRequest(req, $in, name) {
        var _a;
        /**
         * forcing convert to array if scheme describes param as array + explode
         */
        const field = REQUEST_FIELDS[$in];
        if (((_a = req[field]) === null || _a === void 0 ? void 0 : _a[name]) && !Array.isArray(req[field][name])) {
            const value = [req[field][name]];
            req[field][name] = value;
        }
    }
    isObjectOrXOf(schema) {
        const schemaHasObject = (schema) => {
            if (!schema)
                return false;
            if (schema.$ref)
                return true;
            const { type, allOf, oneOf, anyOf } = schema;
            return (type === 'object' ||
                [].concat(allOf, oneOf, anyOf).some(schemaHasObject));
        };
        return schemaHasObject(schema);
    }
    validateArrayDelimiter(delimiter, parameter) {
        if (!delimiter) {
            const message = `Parameter 'style' has incorrect value '${parameter.style}' for [${parameter.name}]`;
            throw new types_1.BadRequest({
                path: `.query.${parameter.name}`,
                message: message,
            });
        }
    }
    validateReservedCharacters(name, pairs, allowComma = false) {
        const vs = pairs.get(name);
        if (!vs)
            return;
        for (const v of vs) {
            const svs = allowComma ? v.split(',') : [v];
            for (const sv of svs) {
                if (sv === null || sv === void 0 ? void 0 : sv.match(RESERVED_CHARS)) {
                    const message = `Parameter '${name}' must be url encoded. Its value may not contain reserved characters.`;
                    throw new types_1.BadRequest({ path: `/query/${name}`, message: message });
                }
            }
        }
    }
    parseQueryStringUndecoded(qs) {
        if (!qs)
            return new Map();
        const q = qs.replace('?', '');
        return q.split('&').reduce((m, p) => {
            var _a;
            const [k, v] = p.split('=');
            m.set(k, (_a = m.get(k)) !== null && _a !== void 0 ? _a : []);
            m.get(k).push(v);
            return m;
        }, new Map());
    }
    csvToKeyValuePairs(csvString) {
        const hasBrace = csvString.split('{').length > 1;
        const items = csvString.split(',');
        if (hasBrace) {
            // if it has a brace, we assume its JSON and skip creating k v pairs
            // TODO improve json check, but ensure its cheap
            return;
        }
        if (items.length % 2 !== 0) {
            // if the number of elements is not event, 
            // then we do not have k v pairs, so return undefined
            return;
        }
        const result = {};
        for (let i = 0; i < items.length - 1; i += 2) {
            result[items[i]] = items[i + 1];
        }
        return result;
    }
    /**
     * Mutates and normalizes the req.query object by parsing braket notation query string key values pairs
     * into its corresponding key=<json-object> and update req.query with the parsed value
     * for instance, req.query that equals { filter[name]: test} is translated into { filter: { name: 'test' }, where
     * the query string field is set as filter and its value is the full javascript object (translated from bracket notation)
     * @param keys
     * @returns
     */
    handleBracketNotationQueryFields(query) {
        Object.keys(query).forEach((key) => {
            const bracketNotation = key.includes('[');
            if (bracketNotation) {
                const normalizedKey = key.split('[')[0];
                query[normalizedKey] = (0, qs_1.parse)(`${key}=${query[key]}`)[normalizedKey];
                delete query[key];
            }
        });
        return query;
    }
}
exports.RequestParameterMutator = RequestParameterMutator;
//# sourceMappingURL=req.parameter.mutator.js.map