"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaPreprocessor = exports.httpMethods = void 0;
const cloneDeep = require("lodash.clonedeep");
const _get = require("lodash.get");
const ajv_1 = require("../../framework/ajv");
class Node {
    constructor(parent, schema, path) {
        this.path = path;
        this.parent = parent;
        this.schema = schema;
    }
}
function isParameterObject(node) {
    return !node.$ref;
}
function isReferenceObject(node) {
    return !!node.$ref;
}
function isArraySchemaObject(node) {
    return !!node.items;
}
function isNonArraySchemaObject(node) {
    return !isArraySchemaObject(node) && !isReferenceObject(node);
}
class Root extends Node {
    constructor(schema, path) {
        super(null, schema, path);
    }
}
if (!Array.prototype['flatMap']) {
    // polyfill flatMap
    // TODO remove me when dropping node 10 support
    Array.prototype['flatMap'] = function (lambda) {
        return Array.prototype.concat.apply([], this.map(lambda));
    };
    Object.defineProperty(Array.prototype, 'flatMap', { enumerable: false });
}
exports.httpMethods = new Set([
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace',
]);
class SchemaPreprocessor {
    constructor(apiDoc, ajvOptions, validateResponsesOpts) {
        this.resolvedSchemaCache = new Map();
        this.ajv = (0, ajv_1.createRequestAjv)(apiDoc, ajvOptions);
        this.apiDoc = apiDoc;
        this.serDesMap = ajvOptions.serDesMap;
        this.responseOpts = validateResponsesOpts;
    }
    preProcess() {
        const componentSchemas = this.gatherComponentSchemaNodes();
        let r;
        if (this.apiDoc.paths) {
            r = this.gatherSchemaNodesFromPaths();
        }
        // Now that we've processed paths, clone a response spec if we are validating responses
        this.apiDocRes = !!this.responseOpts ? cloneDeep(this.apiDoc) : null;
        if (this.apiDoc.components) {
            this.removeExamples(this.apiDoc.components);
        }
        const schemaNodes = {
            schemas: componentSchemas,
            requestBodies: r === null || r === void 0 ? void 0 : r.requestBodies,
            responses: r === null || r === void 0 ? void 0 : r.responses,
            requestParameters: r === null || r === void 0 ? void 0 : r.requestParameters,
        };
        // Traverse the schemas
        if (r) {
            this.traverseSchemas(schemaNodes, (parent, schema, opts) => this.schemaVisitor(parent, schema, opts));
        }
        return {
            apiDoc: this.apiDoc,
            apiDocRes: this.apiDocRes,
        };
    }
    gatherComponentSchemaNodes() {
        var _a, _b, _c;
        const nodes = [];
        const componentSchemaMap = (_c = (_b = (_a = this.apiDoc) === null || _a === void 0 ? void 0 : _a.components) === null || _b === void 0 ? void 0 : _b.schemas) !== null && _c !== void 0 ? _c : [];
        for (const [id, s] of Object.entries(componentSchemaMap)) {
            const schema = this.resolveSchema(s);
            this.apiDoc.components.schemas[id] = schema;
            const path = ['components', 'schemas', id];
            const node = new Root(schema, path);
            nodes.push(node);
        }
        return nodes;
    }
    gatherSchemaNodesFromPaths() {
        const requestBodySchemas = [];
        const requestParameterSchemas = [];
        const responseSchemas = [];
        for (const [p, pi] of Object.entries(this.apiDoc.paths)) {
            const pathItem = this.resolveSchema(pi);
            // Since OpenAPI 3.1, paths can be a #ref to reusable path items
            // The following line mutates the paths item to dereference the reference, so that we can process as a POJO, as we would if it wasn't a reference
            this.apiDoc.paths[p] = pathItem;
            for (const method of Object.keys(pathItem)) {
                if (exports.httpMethods.has(method)) {
                    const operation = pathItem[method];
                    // Adds path declared parameters to the schema's parameters list
                    this.preprocessPathLevelParameters(method, pathItem);
                    const path = ['paths', p, method];
                    const node = new Root(operation, path);
                    const requestBodies = this.extractRequestBodySchemaNodes(node);
                    const responseBodies = this.extractResponseSchemaNodes(node);
                    const requestParameters = this.extractRequestParameterSchemaNodes(node);
                    requestBodySchemas.push(...requestBodies);
                    responseSchemas.push(...responseBodies);
                    requestParameterSchemas.push(...requestParameters);
                }
            }
        }
        return {
            requestBodies: requestBodySchemas,
            requestParameters: requestParameterSchemas,
            responses: responseSchemas,
        };
    }
    /**
     * Traverse the schema starting at each node in nodes
     * @param nodes the nodes to traverse
     * @param visit a function to invoke per node
     */
    traverseSchemas(nodes, visit) {
        const seen = new Set();
        const recurse = (parent, node, opts) => {
            const schema = node.schema;
            if (!schema || seen.has(schema))
                return;
            seen.add(schema);
            if (schema.$ref) {
                const resolvedSchema = this.resolveSchema(schema);
                const path = schema.$ref.split('/').slice(1);
                opts.req.originalSchema = schema;
                opts.res.originalSchema = schema;
                visit(parent, node, opts);
                recurse(node, new Node(schema, resolvedSchema, path), opts);
                return;
            }
            // Save the original schema so we can check if it was a $ref
            opts.req.originalSchema = schema;
            opts.res.originalSchema = schema;
            visit(parent, node, opts);
            if (schema.allOf) {
                schema.allOf.forEach((s, i) => {
                    const child = new Node(node, s, [...node.path, 'allOf', i + '']);
                    recurse(node, child, opts);
                });
            }
            else if (schema.oneOf) {
                schema.oneOf.forEach((s, i) => {
                    const child = new Node(node, s, [...node.path, 'oneOf', i + '']);
                    recurse(node, child, opts);
                });
            }
            else if (schema.anyOf) {
                schema.anyOf.forEach((s, i) => {
                    const child = new Node(node, s, [...node.path, 'anyOf', i + '']);
                    recurse(node, child, opts);
                });
            }
            else if (schema.type === 'array' && schema.items) {
                const child = new Node(node, schema.items, [...node.path, 'items']);
                recurse(node, child, opts);
            }
            else if (schema.properties) {
                Object.entries(schema.properties).forEach(([id, cschema]) => {
                    const path = [...node.path, 'properties', id];
                    const child = new Node(node, cschema, path);
                    recurse(node, child, opts);
                });
            }
            else if (schema.additionalProperties) {
                const child = new Node(node, schema.additionalProperties, [
                    ...node.path,
                    'additionalProperties',
                ]);
                recurse(node, child, opts);
            }
        };
        const initOpts = () => ({
            req: { discriminator: {}, kind: 'req', path: [] },
            res: { discriminator: {}, kind: 'res', path: [] },
        });
        for (const node of nodes.schemas) {
            recurse(null, node, initOpts());
        }
        for (const node of nodes.requestBodies) {
            recurse(null, node, initOpts());
        }
        for (const node of nodes.responses) {
            recurse(null, node, initOpts());
        }
        for (const node of nodes.requestParameters) {
            recurse(null, node, initOpts());
        }
    }
    schemaVisitor(parent, node, opts) {
        const pschemas = [parent === null || parent === void 0 ? void 0 : parent.schema];
        const nschemas = [node.schema];
        if (this.apiDocRes) {
            const p = _get(this.apiDocRes, parent === null || parent === void 0 ? void 0 : parent.path);
            const n = _get(this.apiDocRes, node === null || node === void 0 ? void 0 : node.path);
            pschemas.push(p);
            nschemas.push(n);
        }
        // visit the node in both the request and response schema
        for (let i = 0; i < nschemas.length; i++) {
            const kind = i === 0 ? 'req' : 'res';
            const pschema = pschemas[i];
            const nschema = nschemas[i];
            const options = opts[kind];
            options.path = node.path;
            if (nschema) {
                // This null check should no longer be necessary
                this.handleSerDes(pschema, nschema, options);
                this.handleReadonly(pschema, nschema, options);
                this.handleWriteonly(pschema, nschema, options);
                this.processDiscriminator(pschema, nschema, options);
                this.removeSchemaExamples(pschema, nschema, options);
            }
        }
    }
    processDiscriminator(parent, schema, opts = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const o = opts.discriminator;
        const schemaObj = schema;
        const xOf = schemaObj.oneOf ? 'oneOf' : schemaObj.anyOf ? 'anyOf' : null;
        if (xOf && ((_a = schemaObj.discriminator) === null || _a === void 0 ? void 0 : _a.propertyName) && !o.discriminator) {
            const options = schemaObj[xOf].flatMap((refObject) => {
                if (refObject['$ref'] === undefined) {
                    return [];
                }
                const keys = this.findKeys(schemaObj.discriminator.mapping, (value) => value === refObject['$ref']);
                const ref = this.getKeyFromRef(refObject['$ref']);
                return keys.length > 0
                    ? keys.map((option) => ({ option, ref }))
                    : [{ option: ref, ref }];
            });
            o.options = options;
            o.discriminator = (_b = schemaObj.discriminator) === null || _b === void 0 ? void 0 : _b.propertyName;
            o.properties = Object.assign(Object.assign({}, ((_c = o.properties) !== null && _c !== void 0 ? _c : {})), ((_d = schemaObj.properties) !== null && _d !== void 0 ? _d : {}));
            o.required = Array.from(new Set(((_e = o.required) !== null && _e !== void 0 ? _e : []).concat((_f = schemaObj.required) !== null && _f !== void 0 ? _f : [])));
        }
        if (xOf)
            return;
        if (o.discriminator) {
            o.properties = Object.assign(Object.assign({}, ((_g = o.properties) !== null && _g !== void 0 ? _g : {})), ((_h = schemaObj.properties) !== null && _h !== void 0 ? _h : {}));
            o.required = Array.from(new Set(((_j = o.required) !== null && _j !== void 0 ? _j : []).concat((_k = schemaObj.required) !== null && _k !== void 0 ? _k : [])));
            const ancestor = parent;
            const ref = opts.originalSchema.$ref;
            if (!ref)
                return;
            const options = this.findKeys((_l = ancestor.discriminator) === null || _l === void 0 ? void 0 : _l.mapping, (value) => value === ref);
            const refName = this.getKeyFromRef(ref);
            if (options.length === 0 && ref) {
                options.push(refName);
            }
            if (options.length > 0) {
                const newSchema = JSON.parse(JSON.stringify(schemaObj));
                const newProperties = Object.assign(Object.assign({}, ((_m = o.properties) !== null && _m !== void 0 ? _m : {})), ((_o = newSchema.properties) !== null && _o !== void 0 ? _o : {}));
                if (Object.keys(newProperties).length > 0) {
                    newSchema.properties = newProperties;
                }
                newSchema.required = o.required;
                if (newSchema.required.length === 0) {
                    delete newSchema.required;
                }
                // Expose `_discriminator` to consumers without exposing to AJV
                Object.defineProperty(ancestor, '_discriminator', {
                    enumerable: false,
                    value: (_p = ancestor._discriminator) !== null && _p !== void 0 ? _p : {
                        validators: {},
                        options: o.options,
                        property: o.discriminator,
                    },
                });
                for (const option of options) {
                    ancestor._discriminator.validators[option] =
                        this.ajv.compile(newSchema);
                }
            }
            //reset data
            o.properties = {};
            delete o.required;
        }
    }
    /**
     * Attach custom `x-eov-*-serdes` vendor extension for performing
     * serialization (response) and deserialization (request) of data.
     *
     * This only applies to `type=string` schemas with a `format` that was flagged for serdes.
     *
     * The goal of this function is to define a JSON schema that:
     * 1) Only performs the method for matching req/res (e.g. never deserialize a response)
     * 2) Validates initial data THEN performs serdes THEN validates output. In that order.
     * 3) Hide internal schema keywords (and its validation errors) from user.
     *
     * The solution is in three parts:
     * 1) Remove the `type` keywords and replace it with a custom clone `x-eov-type`.
     *    This ensures that we control the order of type validations,
     *    and allows the response serialization to occur before AJV enforces the type.
     * 2) Add an `x-eov-req-serdes` keyword.
     *    This keyword will deserialize the request string AFTER all other validations occur,
     *    ensuring that the string is valid before modifications.
     *    This keyword is only attached when deserialization is enabled.
     * 3) Add an `x-eov-res-serdes` keyword.
     *    This keyword will serialize the response object BEFORE any other validations occur,
     *    ensuring the output is validated as a string.
     *    This keyword is only attached when serialization is enabled.
     * 4) If `nullable` is set, set the type as every possible type.
     *    Then initial type checking will _always_ pass and the `x-eov-type` will narrow it down later.
     *
     * See [`createAjv`](../../framework/ajv/index.ts) for custom keyword definitions.
     *
     * @param {object} parent - parent schema
     * @param {object} schema - schema
     * @param {object} state - traversal state
     */
    handleSerDes(parent, schema, state) {
        if (schema.type === 'string' &&
            !!schema.format &&
            this.serDesMap[schema.format]) {
            const serDes = this.serDesMap[schema.format];
            schema['x-eov-type'] = schema.type;
            if ('nullable' in schema) {
                // Ajv requires `type` keyword with `nullable` (regardless of value).
                schema.type = ['string', 'number', 'boolean', 'object', 'array'];
            }
            else {
                delete schema.type;
            }
            if (serDes.deserialize) {
                schema['x-eov-req-serdes'] = serDes;
            }
            if (serDes.serialize) {
                schema['x-eov-res-serdes'] = serDes;
            }
        }
    }
    removeSchemaExamples(parent, schema, opts) {
        this.removeExamples(parent);
        this.removeExamples(schema);
    }
    removeExamples(object) {
        object === null || object === void 0 ? true : delete object.example;
        object === null || object === void 0 ? true : delete object.examples;
    }
    handleReadonly(parent, schema, opts) {
        var _a, _b, _c;
        if (opts.kind === 'res')
            return;
        const required = (_a = parent === null || parent === void 0 ? void 0 : parent.required) !== null && _a !== void 0 ? _a : [];
        const prop = (_b = opts === null || opts === void 0 ? void 0 : opts.path) === null || _b === void 0 ? void 0 : _b[((_c = opts === null || opts === void 0 ? void 0 : opts.path) === null || _c === void 0 ? void 0 : _c.length) - 1];
        const index = required.indexOf(prop);
        if (schema.readOnly && index > -1) {
            // remove required if readOnly
            parent.required = required
                .slice(0, index)
                .concat(required.slice(index + 1));
            if (parent.required.length === 0) {
                delete parent.required;
            }
        }
    }
    handleWriteonly(parent, schema, opts) {
        var _a, _b, _c;
        if (opts.kind === 'req')
            return;
        const required = (_a = parent === null || parent === void 0 ? void 0 : parent.required) !== null && _a !== void 0 ? _a : [];
        const prop = (_b = opts === null || opts === void 0 ? void 0 : opts.path) === null || _b === void 0 ? void 0 : _b[((_c = opts === null || opts === void 0 ? void 0 : opts.path) === null || _c === void 0 ? void 0 : _c.length) - 1];
        const index = required.indexOf(prop);
        if (schema.writeOnly && index > -1) {
            // remove required if writeOnly
            parent.required = required
                .slice(0, index)
                .concat(required.slice(index + 1));
            if (parent.required.length === 0) {
                delete parent.required;
            }
        }
    }
    /**
     * extract all requestBodies' schemas from an operation
     * @param op
     */
    extractRequestBodySchemaNodes(node) {
        const op = node.schema;
        const bodySchema = this.resolveSchema(op.requestBody);
        op.requestBody = bodySchema;
        if (!(bodySchema === null || bodySchema === void 0 ? void 0 : bodySchema.content))
            return [];
        const result = [];
        const contentEntries = Object.entries(bodySchema.content);
        for (const [type, mediaTypeObject] of contentEntries) {
            const mediaTypeSchema = this.resolveSchema(mediaTypeObject.schema);
            op.requestBody.content[type].schema = mediaTypeSchema;
            // TODO replace with visitor
            this.removeExamples(op.requestBody.content[type]);
            const path = [...node.path, 'requestBody', 'content', type, 'schema'];
            result.push(new Root(mediaTypeSchema, path));
        }
        return result;
    }
    extractResponseSchemaNodes(node) {
        const op = node.schema;
        const responses = op.responses;
        if (!responses)
            return [];
        const schemas = [];
        for (const [statusCode, response] of Object.entries(responses)) {
            const rschema = this.resolveSchema(response);
            if (!rschema) {
                // issue #553
                // TODO the schema failed to resolve.
                // This can occur with multi-file specs
                // improve resolution, so that rschema resolves (use json ref parser?)
                continue;
            }
            responses[statusCode] = rschema;
            if (rschema.content) {
                for (const [type, mediaType] of Object.entries(rschema.content)) {
                    const schema = this.resolveSchema(mediaType === null || mediaType === void 0 ? void 0 : mediaType.schema);
                    if (schema) {
                        rschema.content[type].schema = schema;
                        const path = [
                            ...node.path,
                            'responses',
                            statusCode,
                            'content',
                            type,
                            'schema',
                        ];
                        // TODO replace with visitor
                        this.removeExamples(rschema.content[type]);
                        schemas.push(new Root(schema, path));
                    }
                }
            }
        }
        return schemas;
    }
    extractRequestParameterSchemaNodes(operationNode) {
        var _a;
        return ((_a = operationNode.schema.parameters) !== null && _a !== void 0 ? _a : []).flatMap((node) => {
            const parameterObject = isParameterObject(node) ? node : undefined;
            // TODO replace with visitor
            // TODO This does not handle JSON query parameters
            this.removeExamples(parameterObject);
            if (!(parameterObject === null || parameterObject === void 0 ? void 0 : parameterObject.schema))
                return [];
            const schema = isNonArraySchemaObject(parameterObject.schema)
                ? parameterObject.schema
                : undefined;
            if (!schema)
                return [];
            return new Root(schema, [
                ...operationNode.path,
                'parameters',
                parameterObject.name,
                parameterObject.in,
            ]);
        });
    }
    resolveSchema(schema) {
        var _a;
        if (!schema)
            return null;
        const ref = schema === null || schema === void 0 ? void 0 : schema['$ref'];
        if (ref && this.resolvedSchemaCache.has(ref)) {
            return this.resolvedSchemaCache.get(ref);
        }
        let res = (ref ? (_a = this.ajv.getSchema(ref)) === null || _a === void 0 ? void 0 : _a.schema : schema);
        if (ref && !res) {
            const path = ref.split('/').join('.');
            const p = path.substring(path.indexOf('.') + 1);
            res = _get(this.apiDoc, p);
        }
        if (ref) {
            this.resolvedSchemaCache.set(ref, res);
        }
        return res;
    }
    /**
     * add path level parameters to the schema's parameters list
     * @param pathItemKey
     * @param pathItem
     */
    preprocessPathLevelParameters(pathItemKey, pathItem) {
        var _a;
        const parameters = (_a = pathItem.parameters) !== null && _a !== void 0 ? _a : [];
        if (parameters.length === 0)
            return;
        const v = this.resolveSchema(pathItem[pathItemKey]);
        if (v === parameters)
            return;
        v.parameters = v.parameters || [];
        const match = (pathParam, opParam) => 
        // if name or ref exists and are equal
        (opParam['name'] && opParam['name'] === pathParam['name']) ||
            (opParam['$ref'] && opParam['$ref'] === pathParam['$ref']);
        // Add Path level query param to list ONLY if there is not already an operation-level query param by the same name.
        for (const param of parameters) {
            if (!v.parameters.some((vparam) => match(param, vparam))) {
                v.parameters.push(param);
            }
        }
    }
    findKeys(object, searchFunc) {
        const matches = [];
        if (!object) {
            return matches;
        }
        const keys = Object.keys(object);
        for (let i = 0; i < keys.length; i++) {
            if (searchFunc(object[keys[i]])) {
                matches.push(keys[i]);
            }
        }
        return matches;
    }
    getKeyFromRef(ref) {
        return ref.split('/components/schemas/')[1];
    }
}
exports.SchemaPreprocessor = SchemaPreprocessor;
//# sourceMappingURL=schema.preprocessor.js.map