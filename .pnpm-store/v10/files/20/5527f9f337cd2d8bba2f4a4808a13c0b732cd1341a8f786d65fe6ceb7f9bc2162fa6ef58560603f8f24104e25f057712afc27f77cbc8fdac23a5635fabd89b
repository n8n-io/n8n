// @ts-check
'use strict';

const fs = require('fs');
const url = require('url');
const pathlib = require('path');

const maybe = require('call-me-maybe');
const fetch = require('node-fetch-h2');
const yaml = require('yaml');

const jptr = require('reftools/lib/jptr.js');
const resolveInternal = jptr.jptr;
const isRef = require('reftools/lib/isref.js').isRef;
const clone = require('reftools/lib/clone.js').clone;
const cclone = require('reftools/lib/clone.js').circularClone;
const recurse = require('reftools/lib/recurse.js').recurse;
const resolver = require('oas-resolver');
const sw = require('oas-schema-walker');
const common = require('oas-kit-common');

const statusCodes = require('./lib/statusCodes.js').statusCodes;

const ourVersion = require('./package.json').version;

// TODO handle specification-extensions with plugins?

const targetVersion = '3.0.0';
let componentNames; // initialised in main

class S2OError extends Error {
  constructor(message) {
    super(message);
    this.name = 'S2OError';
  }
}

function throwError(message, options) {
    let err = new S2OError(message);
    err.options = options;
    if (options.promise) {
        options.promise.reject(err);
    }
    else {
        throw err;
    }
}

function throwOrWarn(message, container, options) {
    if (options.warnOnly) {
        container[options.warnProperty||'x-s2o-warning'] = message;
    }
    else {
        throwError(message, options);
    }
}

function fixUpSubSchema(schema,parent,options) {
    if (schema.nullable) options.patches++;
    if (schema.discriminator && typeof schema.discriminator === 'string') {
        schema.discriminator = { propertyName: schema.discriminator };
    }
    if (schema.items && Array.isArray(schema.items)) {
        if (schema.items.length === 0) {
            schema.items = {};
        }
        else if (schema.items.length === 1) {
            schema.items = schema.items[0];
        }
        else schema.items = { anyOf: schema.items };
    }

    if (schema.type && Array.isArray(schema.type)) {
        if (options.patch) {
            options.patches++;
            if (schema.type.length === 0) {
                delete schema.type;
            }
            else {
                if (!schema.oneOf) schema.oneOf = [];
                for (let type of schema.type) {
                    let newSchema = {};
                    if (type === 'null') {
                        schema.nullable = true;
                    }
                    else {
                        newSchema.type = type;
                        for (let prop of common.arrayProperties) {
                            if (typeof schema.prop !== 'undefined') {
                                newSchema[prop] = schema[prop];
                                delete schema[prop];
                            }
                        }
                    }
                    if (newSchema.type) {
                        schema.oneOf.push(newSchema);
                    }
                }
                delete schema.type;
                if (schema.oneOf.length === 0) {
                    delete schema.oneOf; // means was just null => nullable
                }
                else if (schema.oneOf.length < 2) {
                    schema.type = schema.oneOf[0].type;
                    if (Object.keys(schema.oneOf[0]).length > 1) {
                        throwOrWarn('Lost properties from oneOf',schema,options);
                    }
                    delete schema.oneOf;
                }
            }
            // do not else this
            if (schema.type && Array.isArray(schema.type) && schema.type.length === 1) {
                schema.type = schema.type[0];
            }
        }
        else {
            throwError('(Patchable) schema type must not be an array', options);
        }
    }

    if (schema.type && schema.type === 'null') {
        delete schema.type;
        schema.nullable = true;
    }
    if ((schema.type === 'array') && (!schema.items)) {
        schema.items = {};
    }
    if (schema.type === 'file') {
        schema.type = 'string';
        schema.format = 'binary';
    }
    if (typeof schema.required === 'boolean') {
        if (schema.required && schema.name) {
            if (typeof parent.required === 'undefined') {
                parent.required = [];
            }
            if (Array.isArray(parent.required)) parent.required.push(schema.name);
        }
        delete schema.required;
    }

    // TODO if we have a nested properties (object inside an object) and the
    // *parent* type is not set, force it to object
    // TODO if default is set but type is not set, force type to typeof default

    if (schema.xml && typeof schema.xml.namespace === 'string') {
        if (!schema.xml.namespace) delete schema.xml.namespace;
    }
    if (typeof schema.allowEmptyValue !== 'undefined') {
      options.patches++;
      delete schema.allowEmptyValue;
    }
}

function fixUpSubSchemaExtensions(schema,parent) {
    if (schema["x-required"] && Array.isArray(schema["x-required"])) {
        if (!schema.required) schema.required = [];
        schema.required = schema.required.concat(schema["x-required"]);
        delete schema["x-required"];
    }
    if (schema["x-anyOf"]) {
        schema.anyOf = schema["x-anyOf"];
        delete schema["x-anyOf"];
    }
    if (schema["x-oneOf"]) {
        schema.oneOf = schema["x-oneOf"];
        delete schema["x-oneOf"];
    }
    if (schema["x-not"]) {
        schema.not = schema["x-not"];
        delete schema["x-not"];
    }
    if (typeof schema["x-nullable"] === 'boolean') {
        schema.nullable = schema["x-nullable"];
        delete schema["x-nullable"];
    }
    if ((typeof schema["x-discriminator"] === 'object') && (typeof schema["x-discriminator"].propertyName === 'string')) {
        schema.discriminator = schema["x-discriminator"];
        delete schema["x-discriminator"];
        for (let entry in schema.discriminator.mapping) {
            let schemaOrRef = schema.discriminator.mapping[entry];
            if (schemaOrRef.startsWith('#/definitions/')) {
                schema.discriminator.mapping[entry] = schemaOrRef.replace('#/definitions/','#/components/schemas/');
            }
        }
    }
}

function fixUpSchema(schema,options) {
    sw.walkSchema(schema,{},{},function(schema,parent,state){
        fixUpSubSchemaExtensions(schema,parent);
        fixUpSubSchema(schema,parent,options);
    });
}

function getMiroComponentName(ref) {
    if (ref.indexOf('#')>=0) {
        ref = ref.split('#')[1].split('/').pop();
    }
    else {
        ref = ref.split('/').pop().split('.')[0];
    }
    return encodeURIComponent(common.sanitise(ref));
}

function fixupRefs(obj, key, state) {
    let options = state.payload.options;
    if (isRef(obj,key)) {
        if (obj[key].startsWith('#/components/')) {
            // no-op
        }
        else if (obj[key] === '#/consumes') {
            // people are *so* creative
            delete obj[key];
            state.parent[state.pkey] = clone(options.openapi.consumes);
        }
        else if (obj[key] === '#/produces') {
            // and by creative, I mean devious
            delete obj[key];
            state.parent[state.pkey] = clone(options.openapi.produces);
        }
        else if (obj[key].startsWith('#/definitions/')) {
            //only the first part of a schema component name must be sanitised
            let keys = obj[key].replace('#/definitions/', '').split('/');
            const ref = jptr.jpunescape(keys[0]);

            let newKey = componentNames.schemas[decodeURIComponent(ref)]; // lookup, resolves a $ref
            if (newKey) {
                keys[0] = newKey;
            }
            else {
                throwOrWarn('Could not resolve reference '+obj[key],obj,options);
            }
            obj[key] = '#/components/schemas/' + keys.join('/');
        }
        else if (obj[key].startsWith('#/parameters/')) {
            // for extensions like Apigee's x-templates
            obj[key] = '#/components/parameters/' + common.sanitise(obj[key].replace('#/parameters/', ''));
        }
        else if (obj[key].startsWith('#/responses/')) {
            // for extensions like Apigee's x-templates
            obj[key] = '#/components/responses/' + common.sanitise(obj[key].replace('#/responses/', ''));
        }
        else if (obj[key].startsWith('#')) {
            // fixes up direct $refs or those created by resolvers
            let target = clone(jptr.jptr(options.openapi,obj[key]));
            if (target === false) throwOrWarn('direct $ref not found '+obj[key],obj,options)
            else if (options.refmap[obj[key]]) {
                obj[key] = options.refmap[obj[key]];
            }
            else {
                // we use a heuristic to determine what kind of thing is being referenced
                let oldRef = obj[key];
                oldRef = oldRef.replace('/properties/headers/','');
                oldRef = oldRef.replace('/properties/responses/','');
                oldRef = oldRef.replace('/properties/parameters/','');
                oldRef = oldRef.replace('/properties/schemas/','');
                let type = 'schemas';
                let schemaIndex = oldRef.lastIndexOf('/schema');
                type = (oldRef.indexOf('/headers/')>schemaIndex) ? 'headers' :
                    ((oldRef.indexOf('/responses/')>schemaIndex) ? 'responses' :
                    ((oldRef.indexOf('/example')>schemaIndex) ? 'examples' :
                    ((oldRef.indexOf('/x-')>schemaIndex) ? 'extensions' :
                    ((oldRef.indexOf('/parameters/')>schemaIndex) ? 'parameters' : 'schemas'))));

                // non-body/form parameters have not moved in the overall structure (like responses)
                // but extracting the requestBodies can cause the *number* of parameters to change

                if (type === 'schemas') {
                    fixUpSchema(target,options);
                }

                if ((type !== 'responses') && (type !== 'extensions')) {
                    let prefix = type.substr(0,type.length-1);
                    if ((prefix === 'parameter') && target.name && (target.name === common.sanitise(target.name))) {
                        prefix = encodeURIComponent(target.name);
                    }

                    let suffix = 1;
                    if (obj['x-miro']) {
                        prefix = getMiroComponentName(obj['x-miro']);
                        suffix = '';
                    }

                    while (jptr.jptr(options.openapi,'#/components/'+type+'/'+prefix+suffix)) {
                        suffix = (suffix === '' ? 2 : ++suffix);
                    }

                    let newRef = '#/components/'+type+'/'+prefix+suffix;
                    let refSuffix = '';

                    if (type === 'examples') {
                        target = { value: target };
                        refSuffix = '/value';
                    }

                    jptr.jptr(options.openapi,newRef,target);
                    options.refmap[obj[key]] = newRef+refSuffix;
                    obj[key] = newRef+refSuffix;
                }
            }
        }

        delete obj['x-miro'];
        // do this last - rework cases where $ref object has sibling properties
        if (Object.keys(obj).length > 1) {
            const tmpRef = obj[key];
            const inSchema = state.path.indexOf('/schema') >= 0; // not perfect, but in the absence of a reasonably-sized and complete OAS 2.0 parser...
            if (options.refSiblings === 'preserve') {
                // no-op
            }
            else if (inSchema && (options.refSiblings === 'allOf')) {
                delete obj.$ref;
                state.parent[state.pkey] = { allOf: [ { $ref: tmpRef }, obj ]};
            }
            else { // remove, or not 'preserve' and not in a schema
                state.parent[state.pkey] = { $ref: tmpRef };
            }
        }

    }
    if ((key === 'x-ms-odata') && (typeof obj[key] === 'string') && (obj[key].startsWith('#/'))) {
        let keys = obj[key].replace('#/definitions/', '').replace('#/components/schemas/','').split('/');
        let newKey = componentNames.schemas[decodeURIComponent(keys[0])]; // lookup, resolves a $ref
        if (newKey) {
            keys[0] = newKey;
        }
        else {
            throwOrWarn('Could not resolve reference '+obj[key],obj,options);
        }
        obj[key] = '#/components/schemas/' + keys.join('/');
    }
}

/*
* This has to happen as a separate pass because multiple $refs may point
* through elements of the same path
*/
function dedupeRefs(openapi, options) {
    for (let ref in options.refmap) {
        jptr.jptr(openapi,ref,{ $ref: options.refmap[ref] });
    }
}

function processSecurity(securityObject) {
    for (let s in securityObject) {
        for (let k in securityObject[s]) {
            let sname = common.sanitise(k);
            if (k !== sname) {
                securityObject[s][sname] = securityObject[s][k];
                delete securityObject[s][k];
            }
        }
    }
}

function processSecurityScheme(scheme, options) {
    if (scheme.type === 'basic') {
        scheme.type = 'http';
        scheme.scheme = 'basic';
    }
    if (scheme.type === 'oauth2') {
        let flow = {};
        let flowName = scheme.flow;
        if (scheme.flow === 'application') flowName = 'clientCredentials';
        if (scheme.flow === 'accessCode') flowName = 'authorizationCode';
        if (typeof scheme.authorizationUrl !== 'undefined') flow.authorizationUrl = scheme.authorizationUrl.split('?')[0].trim() || '/';
        if (typeof scheme.tokenUrl === 'string') flow.tokenUrl = scheme.tokenUrl.split('?')[0].trim() || '/';
        flow.scopes = scheme.scopes || {};
        scheme.flows = {};
        scheme.flows[flowName] = flow;
        delete scheme.flow;
        delete scheme.authorizationUrl;
        delete scheme.tokenUrl;
        delete scheme.scopes;
        if (typeof scheme.name !== 'undefined') {
            if (options.patch) {
                options.patches++;
                delete scheme.name;
            }
            else {
                throwError('(Patchable) oauth2 securitySchemes should not have name property', options);
            }
        }
    }
}

function keepParameters(value) {
    return (value && !value["x-s2o-delete"]);
}

function processHeader(header, options) {
    if (header.$ref) {
        header.$ref = header.$ref.replace('#/responses/', '#/components/responses/');
    }
    else {
        if (header.type && !header.schema) {
            header.schema = {};
        }
        if (header.type) header.schema.type = header.type;
        if (header.items && header.items.type !== 'array') {
            if (header.items.collectionFormat !== header.collectionFormat) {
                throwOrWarn('Nested collectionFormats are not supported', header, options);
            }
            delete header.items.collectionFormat;
        }
        if (header.type === 'array') {
            if (header.collectionFormat === 'ssv') {
                throwOrWarn('collectionFormat:ssv is no longer supported for headers', header, options); // not lossless
            }
            else if (header.collectionFormat === 'pipes') {
                throwOrWarn('collectionFormat:pipes is no longer supported for headers', header, options); // not lossless
            }
            else if (header.collectionFormat === 'multi') {
                header.explode = true;
            }
            else if (header.collectionFormat === 'tsv') {
                throwOrWarn('collectionFormat:tsv is no longer supported', header, options); // not lossless
                header["x-collectionFormat"] = 'tsv';
            }
            else { // 'csv'
                header.style = 'simple';
            }
            delete header.collectionFormat;
        }
        else if (header.collectionFormat) {
            if (options.patch) {
                options.patches++;
                delete header.collectionFormat;
            }
            else {
                throwError('(Patchable) collectionFormat is only applicable to header.type array', options);
            }
        }
        delete header.type;
        for (let prop of common.parameterTypeProperties) {
            if (typeof header[prop] !== 'undefined') {
                header.schema[prop] = header[prop];
                delete header[prop];
            }
        }
        for (let prop of common.arrayProperties) {
            if (typeof header[prop] !== 'undefined') {
                header.schema[prop] = header[prop];
                delete header[prop];
            }
        }
    }
}

function fixParamRef(param, options) {
    if (param.$ref.indexOf('#/parameters/') >= 0) {
        let refComponents = param.$ref.split('#/parameters/');
        param.$ref = refComponents[0] + '#/components/parameters/' + common.sanitise(refComponents[1]);
    }
    if (param.$ref.indexOf('#/definitions/') >= 0) {
        throwOrWarn('Definition used as parameter', param, options);
    }
}

function attachRequestBody(op,options) {
    let newOp = {};
    for (let key of Object.keys(op)) {
        newOp[key] = op[key];
        if (key === 'parameters') {
            newOp.requestBody = {};
            if (options.rbname) newOp[options.rbname] = '';
        }
    }
    newOp.requestBody = {}; // just in case there are no parameters
    return newOp;
}

/**
 * @returns op, as it may have changed
 */
function processParameter(param, op, path, method, index, openapi, options) {
    let result = {};
    let singularRequestBody = true;
    let originalType;

    if (op && op.consumes && (typeof op.consumes === 'string')) {
        if (options.patch) {
            options.patches++;
            op.consumes = [op.consumes];
        }
        else {
            return throwError('(Patchable) operation.consumes must be an array', options);
        }
    }
    if (!Array.isArray(openapi.consumes)) delete openapi.consumes;
    let consumes = ((op ? op.consumes : null) || (openapi.consumes || [])).filter(common.uniqueOnly);

    if (param && param.$ref && (typeof param.$ref === 'string')) {
        // if we still have a ref here, it must be an internal one
        fixParamRef(param, options);
        let ptr = decodeURIComponent(param.$ref.replace('#/components/parameters/', ''));
        let rbody = false;
        let target = openapi.components.parameters[ptr]; // resolves a $ref, must have been sanitised already

        if (((!target) || (target["x-s2o-delete"])) && param.$ref.startsWith('#/')) {
            // if it's gone, chances are it's a requestBody component now unless spec was broken
            param["x-s2o-delete"] = true;
            rbody = true;
        }

        // shared formData parameters from swagger or path level could be used in any combination.
        // we dereference all op.requestBody's then hash them and pull out common ones later

        if (rbody) {
            let ref = param.$ref;
            let newParam = resolveInternal(openapi, param.$ref);
            if (!newParam && ref.startsWith('#/')) {
                throwOrWarn('Could not resolve reference ' + ref, param, options);
            }
            else {
                if (newParam) param = newParam; // preserve reference
            }
        }
    }

    if (param && (param.name || param.in)) { // if it's a real parameter OR we've dereferenced it

        if (typeof param['x-deprecated'] === 'boolean') {
            param.deprecated = param['x-deprecated'];
            delete param['x-deprecated'];
        }

        if (typeof param['x-example'] !== 'undefined') {
            param.example = param['x-example'];
            delete param['x-example'];
        }

        if ((param.in !== 'body') && (!param.type)) {
            if (options.patch) {
                options.patches++;
                param.type = 'string';
            }
            else {
                throwError('(Patchable) parameter.type is mandatory for non-body parameters', options);
            }
        }
        if (param.type && typeof param.type === 'object' && param.type.$ref) {
            // $ref anywhere sensibility
            param.type = resolveInternal(openapi, param.type.$ref);
        }
        if (param.type === 'file') {
            param['x-s2o-originalType'] = param.type;
            originalType = param.type;
        }
        if (param.description && typeof param.description === 'object' && param.description.$ref) {
            // $ref anywhere sensibility
            param.description = resolveInternal(openapi, param.description.$ref);
        }
        if (param.description === null) delete param.description;

        let oldCollectionFormat = param.collectionFormat;
        if ((param.type === 'array') && !oldCollectionFormat) {
            oldCollectionFormat = 'csv';
        }
        if (oldCollectionFormat) {
            if (param.type !== 'array') {
                if (options.patch) {
                    options.patches++;
                    delete param.collectionFormat;
                }
                else {
                    throwError('(Patchable) collectionFormat is only applicable to param.type array', options);
                }
            }
            if ((oldCollectionFormat === 'csv') && ((param.in === 'query') || (param.in === 'cookie'))) {
                param.style = 'form';
                param.explode = false;
            }
            if ((oldCollectionFormat === 'csv') && ((param.in === 'path') || (param.in === 'header'))) {
                param.style = 'simple';
            }
            if (oldCollectionFormat === 'ssv') {
                if (param.in === 'query') {
                    param.style = 'spaceDelimited';
                }
                else {
                    throwOrWarn('collectionFormat:ssv is no longer supported except for in:query parameters', param, options); // not lossless
                }
            }
            if (oldCollectionFormat === 'pipes') {
                if (param.in === 'query') {
                    param.style = 'pipeDelimited';
                }
                else {
                    throwOrWarn('collectionFormat:pipes is no longer supported except for in:query parameters', param, options); // not lossless
                }
            }
            if (oldCollectionFormat === 'multi') {
                param.explode = true;
            }
            if (oldCollectionFormat === 'tsv') {
                throwOrWarn('collectionFormat:tsv is no longer supported', param, options); // not lossless
                param["x-collectionFormat"] = 'tsv';
            }
            delete param.collectionFormat;
        }

        if (param.type && (param.type !== 'body') && (param.in !== 'formData')) {
            if (param.items && param.schema) {
                throwOrWarn('parameter has array,items and schema', param, options);
            }
            else {
                if (param.schema) options.patches++; // already present
                if ((!param.schema) || (typeof param.schema !== 'object')) param.schema = {};
                param.schema.type = param.type;
                if (param.items) {
                    param.schema.items = param.items;
                    delete param.items;
                    recurse(param.schema.items, null, function (obj, key, state) {
                        if ((key === 'collectionFormat') && (typeof obj[key] === 'string')) {
                            if (oldCollectionFormat && obj[key] !== oldCollectionFormat) {
                                throwOrWarn('Nested collectionFormats are not supported', param, options);
                            }
                            delete obj[key]; // not lossless
                        }
                        // items in 2.0 was a subset of the JSON-Schema items
                        // object, it gets fixed up below
                    });
                }
                for (let prop of common.parameterTypeProperties) {
                    if (typeof param[prop] !== 'undefined') param.schema[prop] = param[prop];
                    delete param[prop];
                }
            }
        }

        if (param.schema) {
            fixUpSchema(param.schema,options);
        }

        if (param["x-ms-skip-url-encoding"]) {
            if (param.in === 'query') { // might be in:path, not allowed in OAS3
                param.allowReserved = true;
                delete param["x-ms-skip-url-encoding"];
            }
        }
    }

    if (param && param.in === 'formData') {
        // convert to requestBody component
        singularRequestBody = false;
        result.content = {};
        let contentType = 'application/x-www-form-urlencoded';
        if ((consumes.length) && (consumes.indexOf('multipart/form-data') >= 0)) {
            contentType = 'multipart/form-data';
        }

        result.content[contentType] = {};
        if (param.schema) {
            result.content[contentType].schema = param.schema;
            if (param.schema.$ref) {
                result['x-s2o-name'] = decodeURIComponent(param.schema.$ref.replace('#/components/schemas/', ''));
            }
        }
        else {
            result.content[contentType].schema = {};
            result.content[contentType].schema.type = 'object';
            result.content[contentType].schema.properties = {};
            result.content[contentType].schema.properties[param.name] = {};
            let schema = result.content[contentType].schema;
            let target = result.content[contentType].schema.properties[param.name];
            if (param.description) target.description = param.description;
            if (param.example) target.example = param.example;
            if (param.type) target.type = param.type;

            for (let prop of common.parameterTypeProperties) {
                if (typeof param[prop] !== 'undefined') target[prop] = param[prop];
            }
            if (param.required === true) {
                if (!schema.required) schema.required = [];
                schema.required.push(param.name);
                result.required = true;
            }
            if (typeof param.default !== 'undefined') target.default = param.default;
            if (target.properties) target.properties = param.properties;
            if (param.allOf) target.allOf = param.allOf; // new are anyOf, oneOf, not
            if ((param.type === 'array') && (param.items)) {
                target.items = param.items;
                if (target.items.collectionFormat) delete target.items.collectionFormat;
            }
            if ((originalType === 'file') || (param['x-s2o-originalType'] === 'file')) {
                target.type = 'string';
                target.format = 'binary';
            }

            // Copy any extensions on the form param to the target schema property.
            copyExtensions(param, target);
        }
    }
    else if (param && (param.type === 'file')) {
        // convert to requestBody
        if (param.required) result.required = param.required;
        result.content = {};
        result.content["application/octet-stream"] = {};
        result.content["application/octet-stream"].schema = {};
        result.content["application/octet-stream"].schema.type = 'string';
        result.content["application/octet-stream"].schema.format = 'binary';
        copyExtensions(param, result);
    }
    if (param && param.in === 'body') {
        result.content = {};
        if (param.name) result['x-s2o-name'] = (op && op.operationId ? common.sanitiseAll(op.operationId) : '') + ('_' + param.name).toCamelCase();
        if (param.description) result.description = param.description;
        if (param.required) result.required = param.required;

        // Set the "request body name" extension on the operation if requested.
        if (op && options.rbname && param.name) {
            op[options.rbname] = param.name;
        }
        if (param.schema && param.schema.$ref) {
            result['x-s2o-name'] = decodeURIComponent(param.schema.$ref.replace('#/components/schemas/', ''));
        }
        else if (param.schema && (param.schema.type === 'array') && param.schema.items && param.schema.items.$ref) {
            result['x-s2o-name'] = decodeURIComponent(param.schema.items.$ref.replace('#/components/schemas/', '')) + 'Array';
        }

        if (!consumes.length) {
            consumes.push('application/json'); // TODO verify default
        }

        for (let mimetype of consumes) {
            result.content[mimetype] = {};
            result.content[mimetype].schema = clone(param.schema || {});
            fixUpSchema(result.content[mimetype].schema,options);
        }

        // Copy any extensions from the original parameter to the new requestBody
        copyExtensions(param, result);
    }

    if (Object.keys(result).length > 0) {
        param["x-s2o-delete"] = true;
        // work out where to attach the requestBody
        if (op) {
            if (op.requestBody && singularRequestBody) {
                op.requestBody["x-s2o-overloaded"] = true;
                let opId = op.operationId || index;

                throwOrWarn('Operation ' + opId + ' has multiple requestBodies', op, options);
            }
            else {
                if (!op.requestBody) {
                   op = path[method] = attachRequestBody(op,options); // make sure we have one
                }
                if ((op.requestBody.content && op.requestBody.content["multipart/form-data"])
                    && (op.requestBody.content["multipart/form-data"].schema) && (op.requestBody.content["multipart/form-data"].schema.properties) && (result.content["multipart/form-data"]) && (result.content["multipart/form-data"].schema) && (result.content["multipart/form-data"].schema.properties)) {
                    op.requestBody.content["multipart/form-data"].schema.properties =
                        Object.assign(op.requestBody.content["multipart/form-data"].schema.properties, result.content["multipart/form-data"].schema.properties);
                    op.requestBody.content["multipart/form-data"].schema.required = (op.requestBody.content["multipart/form-data"].schema.required || []).concat(result.content["multipart/form-data"].schema.required||[]);
                    if (!op.requestBody.content["multipart/form-data"].schema.required.length) {
                        delete op.requestBody.content["multipart/form-data"].schema.required;
                    }
                }
                else if ((op.requestBody.content && op.requestBody.content["application/x-www-form-urlencoded"] && op.requestBody.content["application/x-www-form-urlencoded"].schema && op.requestBody.content["application/x-www-form-urlencoded"].schema.properties)
                    && result.content["application/x-www-form-urlencoded"] && result.content["application/x-www-form-urlencoded"].schema && result.content["application/x-www-form-urlencoded"].schema.properties) {
                    op.requestBody.content["application/x-www-form-urlencoded"].schema.properties =
                        Object.assign(op.requestBody.content["application/x-www-form-urlencoded"].schema.properties, result.content["application/x-www-form-urlencoded"].schema.properties);
                    op.requestBody.content["application/x-www-form-urlencoded"].schema.required = (op.requestBody.content["application/x-www-form-urlencoded"].schema.required || []).concat(result.content["application/x-www-form-urlencoded"].schema.required||[]);
                    if (!op.requestBody.content["application/x-www-form-urlencoded"].schema.required.length) {
                        delete op.requestBody.content["application/x-www-form-urlencoded"].schema.required;
                    }
                }
                else {
                    op.requestBody = Object.assign(op.requestBody, result);
                    if (!op.requestBody['x-s2o-name']) {
                        if (op.requestBody.schema && op.requestBody.schema.$ref) {
                            op.requestBody['x-s2o-name'] = decodeURIComponent(op.requestBody.schema.$ref.replace('#/components/schemas/', '')).split('/').join('');
                        }
                        else if (op.operationId) {
                            op.requestBody['x-s2o-name'] = common.sanitiseAll(op.operationId);
                        }
                    }
                }
            }
        }
    }

    // tidy up
    if (param && !param['x-s2o-delete']) {
        delete param.type;
        for (let prop of common.parameterTypeProperties) {
            delete param[prop];
        }

        if ((param.in === 'path') && ((typeof param.required === 'undefined') || (param.required !== true))) {
            if (options.patch) {
                options.patches++;
                param.required = true;
            }
            else {
                throwError('(Patchable) path parameters must be required:true ['+param.name+' in '+index+']', options);
            }
        }
    }

    return op;
}

function copyExtensions(src, tgt) {
    for (let prop in src) {
        if (prop.startsWith('x-') && !prop.startsWith('x-s2o')) {
            tgt[prop] = src[prop];
        }
    }
}

function processResponse(response, name, op, openapi, options) {
    if (!response) return false;
    if (response.$ref && (typeof response.$ref === 'string')) {
        if (response.$ref.indexOf('#/definitions/') >= 0) {
            //response.$ref = '#/components/schemas/'+common.sanitise(response.$ref.replace('#/definitions/',''));
            throwOrWarn('definition used as response: ' + response.$ref, response, options);
        }
        else {
            if (response.$ref.startsWith('#/responses/')) {
                response.$ref = '#/components/responses/' + common.sanitise(decodeURIComponent(response.$ref.replace('#/responses/', '')));
            }
        }
    }
    else {
        if ((typeof response.description === 'undefined') || (response.description === null)
            || ((response.description === '') && options.patch)) {
            if (options.patch) {
                if ((typeof response === 'object') && (!Array.isArray(response))) {
                    options.patches++;
                    response.description = (statusCodes[response] || '');
                }
            }
            else {
                throwError('(Patchable) response.description is mandatory', options);
            }
        }
        if (typeof response.schema !== 'undefined') {

            fixUpSchema(response.schema,options);

            if (response.schema.$ref && (typeof response.schema.$ref === 'string') && response.schema.$ref.startsWith('#/responses/')) {
                response.schema.$ref = '#/components/responses/' + common.sanitise(decodeURIComponent(response.schema.$ref.replace('#/responses/', '')));
            }

            if (op && op.produces && (typeof op.produces === 'string')) {
                if (options.patch) {
                    options.patches++;
                    op.produces = [op.produces];
                }
                else {
                    return throwError('(Patchable) operation.produces must be an array', options);
                }
            }
            if (openapi.produces && !Array.isArray(openapi.produces)) delete openapi.produces;

            let produces = ((op ? op.produces : null) || (openapi.produces || [])).filter(common.uniqueOnly);
            if (!produces.length) produces.push('*/*'); // TODO verify default

            response.content = {};
            for (let mimetype of produces) {
                response.content[mimetype] = {};
                response.content[mimetype].schema = clone(response.schema);
                if (response.examples && response.examples[mimetype]) {
                    let example = {};
                    example.value = response.examples[mimetype];
                    response.content[mimetype].examples = {};
                    response.content[mimetype].examples.response = example;
                    delete response.examples[mimetype];
                }
                if (response.content[mimetype].schema.type === 'file') {
                    response.content[mimetype].schema = { type: 'string', format: 'binary' };
                }
            }
            delete response.schema;
        }
        // examples for content-types not listed in produces
        for (let mimetype in response.examples) {
            if (!response.content) response.content = {};
            if (!response.content[mimetype]) response.content[mimetype] = {};
            response.content[mimetype].examples = {};
            response.content[mimetype].examples.response = {};
            response.content[mimetype].examples.response.value = response.examples[mimetype];
        }
        delete response.examples;

        if (response.headers) {
            for (let h in response.headers) {
                if (h.toLowerCase() === 'status code') {
                    if (options.patch) {
                        options.patches++;
                        delete response.headers[h];
                    }
                    else {
                        throwError('(Patchable) "Status Code" is not a valid header', options);
                    }
                }
                else {
                    processHeader(response.headers[h], options);
                }
            }
        }
    }
}

function processPaths(container, containerName, options, requestBodyCache, openapi) {
    for (let p in container) {
        let path = container[p];
        // path.$ref is external only
        if (path && (path['x-trace']) && (typeof path['x-trace'] === 'object')) {
            path.trace = path['x-trace'];
            delete path['x-trace'];
        }
        if (path && (path['x-summary']) && (typeof path['x-summary'] === 'string')) {
            path.summary = path['x-summary'];
            delete path['x-summary'];
        }
        if (path && (path['x-description']) && (typeof path['x-description'] === 'string')) {
            path.description = path['x-description'];
            delete path['x-description'];
        }
        if (path && (path['x-servers']) && (Array.isArray(path['x-servers']))) {
            path.servers = path['x-servers'];
            delete path['x-servers'];
        }
        for (let method in path) {
            if ((common.httpMethods.indexOf(method) >= 0) || (method === 'x-amazon-apigateway-any-method')) {
                let op = path[method];

                if (op && op.parameters && Array.isArray(op.parameters)) {
                    if (path.parameters) {
                        for (let param of path.parameters) {
                            if (typeof param.$ref === 'string') {
                                fixParamRef(param, options);
                                param = resolveInternal(openapi, param.$ref);
                            }
                            let match = op.parameters.find(function (e, i, a) {
                                return ((e.name === param.name) && (e.in === param.in));
                            });

                            if (!match && ((param.in === 'formData') || (param.in === 'body') || (param.type === 'file'))) {
                                op = processParameter(param, op, path, method, p, openapi, options);
                                if (options.rbname && op[options.rbname] === '') {
                                    delete op[options.rbname];
                                }
                            }
                        }
                    }
                    for (let param of op.parameters) {
                        op = processParameter(param, op, path, method, method + ':' + p, openapi, options);
                    }
                    if (options.rbname && op[options.rbname] === '') {
                        delete op[options.rbname];
                    }
                    if (!options.debug) {
                        if (op.parameters) op.parameters = op.parameters.filter(keepParameters);
                    }
                }

                if (op && op.security) processSecurity(op.security);

                //don't need to remove requestBody for non-supported ops as they "SHALL be ignored"

                // responses
                if (typeof op === 'object') {
                    if (!op.responses) {
                        let defaultResp = {};
                        defaultResp.description = 'Default response';
                        op.responses = { default: defaultResp };
                    }
                    for (let r in op.responses) {
                        let response = op.responses[r];
                        processResponse(response, r, op, openapi, options);
                    }
                }

                if (op && (op['x-servers']) && (Array.isArray(op['x-servers']))) {
                    op.servers = op['x-servers'];
                    delete op['x-servers'];
                } else if (op && op.schemes && op.schemes.length) {
                    for (let scheme of op.schemes) {
                        if ((!openapi.schemes) || (openapi.schemes.indexOf(scheme) < 0)) {
                            if (!op.servers) {
                                op.servers = [];
                            }
                            if (Array.isArray(openapi.servers)) {
                                for (let server of openapi.servers) {
                                    let newServer = clone(server);
                                    let serverUrl = url.parse(newServer.url);
                                    serverUrl.protocol = scheme;
                                    newServer.url = serverUrl.format();
                                    op.servers.push(newServer);
                                }
                            }
                        }
                    }
                }

                if (options.debug) {
                    op["x-s2o-consumes"] = op.consumes || [];
                    op["x-s2o-produces"] = op.produces || [];
                }
                if (op) {
                    delete op.consumes;
                    delete op.produces;
                    delete op.schemes;

                    if (op["x-ms-examples"]) {
                        for (let e in op["x-ms-examples"]) {
                            let example = op["x-ms-examples"][e];
                            let se = common.sanitiseAll(e);
                            if (example.parameters) {
                                for (let p in example.parameters) {
                                    let value = example.parameters[p];
                                    for (let param of (op.parameters||[]).concat(path.parameters||[])) {
                                        if (param.$ref) {
                                            param = jptr.jptr(openapi,param.$ref);
                                        }
                                        if ((param.name === p) && (!param.example)) {
                                            if (!param.examples) {
                                                param.examples = {};
                                            }
                                            param.examples[e] = {value: value};
                                        }
                                    }
                                }
                            }
                            if (example.responses) {
                                for (let r in example.responses) {
                                    if (example.responses[r].headers) {
                                        for (let h in example.responses[r].headers) {
                                            let value = example.responses[r].headers[h];
                                            for (let rh in op.responses[r].headers) {
                                                if (rh === h) {
                                                    let header = op.responses[r].headers[rh];
                                                    header.example = value;
                                                }
                                            }
                                        }
                                    }
                                    if (example.responses[r].body) {
                                        openapi.components.examples[se] = { value: clone(example.responses[r].body) };
                                        if (op.responses[r] && op.responses[r].content) {
                                            for (let ct in op.responses[r].content) {
                                                let contentType = op.responses[r].content[ct];
                                                if (!contentType.examples) {
                                                    contentType.examples = {};
                                                }
                                                contentType.examples[e] = { $ref: '#/components/examples/'+se };
                                            }
                                        }
                                    }

                                }
                            }
                        }
                        delete op["x-ms-examples"];
                    }

                    if (op.parameters && op.parameters.length === 0) delete op.parameters;
                    if (op.requestBody) {
                        let effectiveOperationId = op.operationId ? common.sanitiseAll(op.operationId) : common.sanitiseAll(method + p).toCamelCase();
                        let rbName = common.sanitise(op.requestBody['x-s2o-name'] || effectiveOperationId || '');
                        delete op.requestBody['x-s2o-name'];
                        let rbStr = JSON.stringify(op.requestBody);
                        let rbHash = common.hash(rbStr);
                        if (!requestBodyCache[rbHash]) {
                            let entry = {};
                            entry.name = rbName;
                            entry.body = op.requestBody;
                            entry.refs = [];
                            requestBodyCache[rbHash] = entry;
                        }
                        let ptr = '#/'+containerName+'/'+encodeURIComponent(jptr.jpescape(p))+'/'+method+'/requestBody';
                        requestBodyCache[rbHash].refs.push(ptr);
                    }
                }

            }
        }
        if (path && path.parameters) {
            for (let p2 in path.parameters) {
                let param = path.parameters[p2];
                processParameter(param, null, path, null, p, openapi, options); // index here is the path string
            }
            if (!options.debug && Array.isArray(path.parameters)) {
                path.parameters = path.parameters.filter(keepParameters);
            }
        }
    }
}

function main(openapi, options) {

    let requestBodyCache = {};
    componentNames = { schemas: {} };

    if (openapi.security) processSecurity(openapi.security);

    for (let s in openapi.components.securitySchemes) {
        let sname = common.sanitise(s);
        if (s !== sname) {
            if (openapi.components.securitySchemes[sname]) {
                throwError('Duplicate sanitised securityScheme name ' + sname, options);
            }
            openapi.components.securitySchemes[sname] = openapi.components.securitySchemes[s];
            delete openapi.components.securitySchemes[s];
        }
        processSecurityScheme(openapi.components.securitySchemes[sname], options);
    }

    for (let s in openapi.components.schemas) {
        let sname = common.sanitiseAll(s);
        let suffix = '';
        if (s !== sname) {
            while (openapi.components.schemas[sname + suffix]) {
                // @ts-ignore
                suffix = (suffix ? ++suffix : 2);
            }
            openapi.components.schemas[sname + suffix] = openapi.components.schemas[s];
            delete openapi.components.schemas[s];
        }
        componentNames.schemas[s] = sname + suffix;
        fixUpSchema(openapi.components.schemas[sname+suffix],options)
    }

    // fix all $refs to their new locations (and potentially new names)
    options.refmap = {};
    recurse(openapi, { payload: { options: options } }, fixupRefs);
    dedupeRefs(openapi,options);

    for (let p in openapi.components.parameters) {
        let sname = common.sanitise(p);
        if (p !== sname) {
            if (openapi.components.parameters[sname]) {
                throwError('Duplicate sanitised parameter name ' + sname, options);
            }
            openapi.components.parameters[sname] = openapi.components.parameters[p];
            delete openapi.components.parameters[p];
        }
        let param = openapi.components.parameters[sname];
        processParameter(param, null, null, null, sname, openapi, options);
    }

    for (let r in openapi.components.responses) {
        let sname = common.sanitise(r);
        if (r !== sname) {
            if (openapi.components.responses[sname]) {
                throwError('Duplicate sanitised response name ' + sname, options);
            }
            openapi.components.responses[sname] = openapi.components.responses[r];
            delete openapi.components.responses[r];
        }
        let response = openapi.components.responses[sname];
        processResponse(response, sname, null, openapi, options);
        if (response.headers) {
            for (let h in response.headers) {
                if (h.toLowerCase() === 'status code') {
                    if (options.patch) {
                        options.patches++;
                        delete response.headers[h];
                    }
                    else {
                        throwError('(Patchable) "Status Code" is not a valid header', options);
                    }
                }
                else {
                    processHeader(response.headers[h], options);
                }
            }
        }
    }

    for (let r in openapi.components.requestBodies) { // converted ones
        let rb = openapi.components.requestBodies[r];
        let rbStr = JSON.stringify(rb);
        let rbHash = common.hash(rbStr);
        let entry = {};
        entry.name = r;
        entry.body = rb;
        entry.refs = [];
        requestBodyCache[rbHash] = entry;
    }

    processPaths(openapi.paths, 'paths', options, requestBodyCache, openapi);
    if (openapi["x-ms-paths"]) {
        processPaths(openapi["x-ms-paths"], 'x-ms-paths', options, requestBodyCache, openapi);
    }

    if (!options.debug) {
        for (let p in openapi.components.parameters) {
            let param = openapi.components.parameters[p];
            if (param["x-s2o-delete"]) {
                delete openapi.components.parameters[p];
            }
        }
    }

    if (options.debug) {
        openapi["x-s2o-consumes"] = openapi.consumes || [];
        openapi["x-s2o-produces"] = openapi.produces || [];
    }
    delete openapi.consumes;
    delete openapi.produces;
    delete openapi.schemes;

    let rbNamesGenerated = [];

    openapi.components.requestBodies = {}; // for now as we've dereffed them

    if (!options.resolveInternal) {
        let counter = 1;
        for (let e in requestBodyCache) {
            let entry = requestBodyCache[e];
            if (entry.refs.length > 1) {
                // create a shared requestBody
                let suffix = '';
                if (!entry.name) {
                    entry.name = 'requestBody';
                    // @ts-ignore
                    suffix = counter++;
                }
                while (rbNamesGenerated.indexOf(entry.name + suffix) >= 0) {
                    // @ts-ignore - this can happen if descriptions are not exactly the same (e.g. bitbucket)
                    suffix = (suffix ? ++suffix : 2);
                }
                entry.name = entry.name + suffix;
                rbNamesGenerated.push(entry.name);
                openapi.components.requestBodies[entry.name] = clone(entry.body);
                for (let r in entry.refs) {
                    let ref = {};
                    ref.$ref = '#/components/requestBodies/' + entry.name;
                    jptr.jptr(openapi,entry.refs[r],ref);
                }
            }
        }
    }

    if (openapi.components.responses && Object.keys(openapi.components.responses).length === 0) {
        delete openapi.components.responses;
    }
    if (openapi.components.parameters && Object.keys(openapi.components.parameters).length === 0) {
        delete openapi.components.parameters;
    }
    if (openapi.components.examples && Object.keys(openapi.components.examples).length === 0) {
        delete openapi.components.examples;
    }
    if (openapi.components.requestBodies && Object.keys(openapi.components.requestBodies).length === 0) {
        delete openapi.components.requestBodies;
    }
    if (openapi.components.securitySchemes && Object.keys(openapi.components.securitySchemes).length === 0) {
        delete openapi.components.securitySchemes;
    }
    if (openapi.components.headers && Object.keys(openapi.components.headers).length === 0) {
        delete openapi.components.headers;
    }
    if (openapi.components.schemas && Object.keys(openapi.components.schemas).length === 0) {
        delete openapi.components.schemas;
    }
    if (openapi.components && Object.keys(openapi.components).length === 0) {
        delete openapi.components;
    }

    return openapi;
}

function extractServerParameters(server) {
    if (!server || !server.url || (typeof server.url !== 'string')) return server;
    server.url = server.url.split('{{').join('{');
    server.url = server.url.split('}}').join('}');
    server.url.replace(/\{(.+?)\}/g, function (match, group1) { // TODO extend to :parameters (not port)?
        if (!server.variables) {
            server.variables = {};
        }
        server.variables[group1] = { default: 'unknown' };
    });
    return server;
}

function fixInfo(openapi, options, reject) {
    if ((typeof openapi.info === 'undefined') || (openapi.info === null)) {
        if (options.patch) {
            options.patches++;
            openapi.info = { version: '', title: '' };
        }
        else {
            return reject(new S2OError('(Patchable) info object is mandatory'));
        }
    }
    if ((typeof openapi.info !== 'object') || (Array.isArray(openapi.info))) {
        return reject(new S2OError('info must be an object'));
    }
    if ((typeof openapi.info.title === 'undefined') || (openapi.info.title === null)) {
        if (options.patch) {
            options.patches++;
            openapi.info.title = '';
        }
        else {
            return reject(new S2OError('(Patchable) info.title cannot be null'));
        }
    }
    if ((typeof openapi.info.version === 'undefined') || (openapi.info.version === null)) {
        if (options.patch) {
            options.patches++;
            openapi.info.version = '';
        }
        else {
            return reject(new S2OError('(Patchable) info.version cannot be null'));
        }
    }
    if (typeof openapi.info.version !== 'string') {
        if (options.patch) {
            options.patches++;
            openapi.info.version = openapi.info.version.toString();
        }
        else {
            return reject(new S2OError('(Patchable) info.version must be a string'));
        }
    }
    if (typeof openapi.info.logo !== 'undefined') {
        if (options.patch) {
            options.patches++;
            openapi.info['x-logo'] = openapi.info.logo;
            delete openapi.info.logo;
        }
        else return reject(new S2OError('(Patchable) info should not have logo property'));
    }
    if (typeof openapi.info.termsOfService !== 'undefined') {
        if (openapi.info.termsOfService === null) {
            if (options.patch) {
                options.patches++;
                openapi.info.termsOfService = '';
            }
            else {
                return reject(new S2OError('(Patchable) info.termsOfService cannot be null'));
            }
        }
        try {
            let u = new URL(openapi.info.termsOfService);
        }
        catch (ex) {
            if (options.patch) {
                options.patches++;
                delete openapi.info.termsOfService;
            }
            else return reject(new S2OError('(Patchable) info.termsOfService must be a URL'));
        }
    }
}

function fixPaths(openapi, options, reject) {
    if (typeof openapi.paths === 'undefined') {
        if (options.patch) {
            options.patches++;
            openapi.paths = {};
        }
        else {
            return reject(new S2OError('(Patchable) paths object is mandatory'));
        }
    }
}

function detectObjectReferences(obj, options) {
    const seen = new WeakSet();
    recurse(obj, {identityDetection:true}, function (obj, key, state) {
        if ((typeof obj[key] === 'object') && (obj[key] !== null)) {
            if (seen.has(obj[key])) {
                if (options.anchors) {
                    obj[key] = clone(obj[key]);
                }
                else {
                    throwError('YAML anchor or merge key at '+state.path, options);
                }
            }
            else {
                seen.add(obj[key]);
            }
        }
    });
}

function convertObj(swagger, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        if (!swagger) swagger = {};
        options.original = swagger;
        if (!options.text) options.text = yaml.stringify(swagger);
        options.externals = [];
        options.externalRefs = {};
        options.rewriteRefs = true; // avoids stack explosions
        options.preserveMiro = true;
        options.promise = {};
        options.promise.resolve = resolve;
        options.promise.reject = reject;
        options.patches = 0;
        if (!options.cache) options.cache = {};
        if (options.source) options.cache[options.source] = options.original;

        detectObjectReferences(swagger, options);

        if (swagger.openapi && (typeof swagger.openapi === 'string') && swagger.openapi.startsWith('3.')) {
            options.openapi = cclone(swagger);
            fixInfo(options.openapi, options, reject);
            fixPaths(options.openapi, options, reject);

            resolver.optionalResolve(options) // is a no-op if options.resolve is not set
            .then(function(){
                if (options.direct) {
                    return resolve(options.openapi);
                }
                else {
                    return resolve(options);
                }
            })
            .catch(function(ex){
                console.warn(ex);
                reject(ex);
            });
            return; // we should have resolved or rejected by now
        }

        if ((!swagger.swagger) || (swagger.swagger != "2.0")) {
            return reject(new S2OError('Unsupported swagger/OpenAPI version: ' + (swagger.openapi ? swagger.openapi : swagger.swagger)));
        }

        let openapi = options.openapi = {};
        openapi.openapi = (typeof options.targetVersion === 'string' && options.targetVersion.startsWith('3.')) ? options.targetVersion : targetVersion; // semver

        if (options.origin) {
            if (!openapi["x-origin"]) {
                openapi["x-origin"] = [];
            }
            let origin = {};
            origin.url = options.source||options.origin;
            origin.format = 'swagger';
            origin.version = swagger.swagger;
            origin.converter = {};
            origin.converter.url = 'https://github.com/mermade/oas-kit';
            origin.converter.version = ourVersion;
            openapi["x-origin"].push(origin);
        }

        // we want the new and existing properties to appear in a sensible order. Not guaranteed
        openapi = Object.assign(openapi, cclone(swagger));
        delete openapi.swagger;
        recurse(openapi, {}, function(obj, key, state){
            if ((obj[key] === null) && (!key.startsWith('x-')) && key !== 'default' && (state.path.indexOf('/example') < 0)) delete obj[key]; // this saves *so* much grief later
        });

        if (swagger.host) {
            for (let s of (Array.isArray(swagger.schemes) ? swagger.schemes : [''])) {
                let server = {};
                let basePath = (swagger.basePath || '').replace(/\/$/, '') // Trailing slashes generally shouldn't be included
                server.url = (s ? s+':' : '') + '//' + swagger.host + basePath;
                extractServerParameters(server);
                if (!openapi.servers) openapi.servers = [];
                openapi.servers.push(server);
            }
        }
        else if (swagger.basePath) {
            let server = {};
            server.url = swagger.basePath;
            extractServerParameters(server);
            if (!openapi.servers) openapi.servers = [];
            openapi.servers.push(server);
        }
        delete openapi.host;
        delete openapi.basePath;

        if (openapi['x-servers'] && Array.isArray(openapi['x-servers'])) {
            openapi.servers = openapi['x-servers'];
            delete openapi['x-servers'];
        }

        // TODO APIMatic extensions (x-server-configuration) ?

        if (swagger['x-ms-parameterized-host']) {
            let xMsPHost = swagger['x-ms-parameterized-host'];
            let server = {};
            server.url = xMsPHost.hostTemplate + (swagger.basePath ? swagger.basePath : '');
            server.variables = {};
            const paramNames = server.url.match(/\{\w+\}/g);
            for (let msp in xMsPHost.parameters) {
                let param = xMsPHost.parameters[msp];
                if (param.$ref) {
                    param = clone(resolveInternal(openapi, param.$ref));
                }
                if (!msp.startsWith('x-')) {
                    delete param.required; // all true
                    delete param.type; // all strings
                    delete param.in; // all 'host'
                    if (typeof param.default === 'undefined') {
                        if (param.enum) {
                            param.default = param.enum[0];
                        }
                        else {
                            param.default = 'none';
                        }
                    }
                    if (!param.name) {
                      param.name = paramNames[msp].replace('{','').replace('}','');
                    }
                    server.variables[param.name] = param;
                    delete param.name;
                }
            }
            if (!openapi.servers) openapi.servers = [];
            if (xMsPHost.useSchemePrefix === false) {
                // The server URL already includes a protocol scheme
                openapi.servers.push(server);
            } else {
                // Define this server once for each given protocol scheme
                swagger.schemes.forEach((scheme) => {
                    openapi.servers.push(
                        Object.assign({}, server, { url: scheme + '://' + server.url })
                    )
                });
            }
            delete openapi['x-ms-parameterized-host'];
        }

        fixInfo(openapi, options, reject);
        fixPaths(openapi, options, reject);

        if (typeof openapi.consumes === 'string') {
            openapi.consumes = [openapi.consumes];
        }
        if (typeof openapi.produces === 'string') {
            openapi.produces = [openapi.produces];
        }

        openapi.components = {};
        if (openapi['x-callbacks']) {
            openapi.components.callbacks = openapi['x-callbacks'];
            delete openapi['x-callbacks'];
        }
        openapi.components.examples = {};
        openapi.components.headers = {};
        if (openapi['x-links']) {
            openapi.components.links = openapi['x-links'];
            delete openapi['x-links'];
        }
        openapi.components.parameters = openapi.parameters || {};
        openapi.components.responses = openapi.responses || {};
        openapi.components.requestBodies = {};
        openapi.components.securitySchemes = openapi.securityDefinitions || {};
        openapi.components.schemas = openapi.definitions || {};
        delete openapi.definitions;
        delete openapi.responses;
        delete openapi.parameters;
        delete openapi.securityDefinitions;

        resolver.optionalResolve(options) // is a no-op if options.resolve is not set
        .then(function(){
            main(options.openapi, options);
            if (options.direct) {
                resolve(options.openapi);
            }
            else {
                resolve(options);
            }
        })
        .catch(function(ex){
            console.warn(ex);
            reject(ex);
        });

    }));
}

function convertStr(str, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        let obj = null;
        let error = null;
        try {
            obj = JSON.parse(str);
            options.text = JSON.stringify(obj,null,2);
        }
        catch (ex) {
            error = ex;
            try {
                obj = yaml.parse(str, { schema: 'core', prettyErrors: true });
                options.sourceYaml = true;
                options.text = str;
            }
            catch (ex) {
                error = ex;
            }
        }
        if (obj) {
            convertObj(obj, options)
            .then(options => resolve(options))
            .catch(ex => reject(ex));
        }
        else {
            reject(new S2OError(error ? error.message : 'Could not parse string'));
        }
    }));
}

function convertUrl(url, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        options.origin = true;
        if (!options.source) {
            options.source = url;
        }
        if (options.verbose) {
            console.warn('GET ' + url);
        }
        if (!options.fetch) {
          options.fetch = fetch;
        }
        const fetchOptions = Object.assign({}, options.fetchOptions, {agent:options.agent});
        options.fetch(url, fetchOptions).then(function (res) {
            if (res.status !== 200) throw new S2OError(`Received status code ${res.status}: ${url}`);
            return res.text();
        }).then(function (body) {
            convertStr(body, options)
            .then(options => resolve(options))
            .catch(ex => reject(ex));
        }).catch(function (err) {
            reject(err);
        });
    }));
}

function convertFile(filename, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        fs.readFile(filename, options.encoding || 'utf8', function (err, s) {
            if (err) {
                reject(err);
            }
            else {
                options.sourceFile = filename;
                convertStr(s, options)
                .then(options => resolve(options))
                .catch(ex => reject(ex));
            }
        });
    }));
}

function convertStream(readable, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        let data = '';
        readable.on('data', function (chunk) {
            data += chunk;
        })
        .on('end', function () {
            convertStr(data, options)
            .then(options => resolve(options))
            .catch(ex => reject(ex));
        });
    }));
}

module.exports = {
    S2OError: S2OError,
    targetVersion: targetVersion,
    convert: convertObj,
    convertObj: convertObj,
    convertUrl: convertUrl,
    convertStr: convertStr,
    convertFile: convertFile,
    convertStream: convertStream
};
