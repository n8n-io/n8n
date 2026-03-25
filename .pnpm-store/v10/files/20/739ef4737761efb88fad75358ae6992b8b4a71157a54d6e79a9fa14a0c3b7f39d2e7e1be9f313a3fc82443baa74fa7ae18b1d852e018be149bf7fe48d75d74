// @ts-check
'use strict';

const fs = require('fs');
const url = require('url');

const yaml = require('yaml');
const should = require('should/as-function');
const maybe = require('call-me-maybe');

const common = require('oas-kit-common');
const jptr = require('reftools/lib/jptr.js');
const resolveInternal = jptr.jptr;
const clone = require('reftools/lib/clone.js').clone;
const recurse = require('reftools/lib/recurse.js').recurse;
const isRef = require('reftools/lib/isref.js').isRef;
const sw = require('oas-schema-walker');
const linter = require('oas-linter');
const resolver = require('oas-resolver');

const dummySchema = { anyOf: {} };
const emptySchema = {};
let refSeen = {};

function contextAppend(options, s) {
    options.context.push((options.context[options.context.length - 1] + '/' + s).split('//').join('/'));
}

function validateUrl(s, contextServers, context, options) {
    let effSource = options.source || 'http://localhost/';
    if (effSource.indexOf('://') < 0) {
        effSource = url.pathToFileURL(effSource);
    }
    should(s).be.a.String();
    should(s).not.be.Null();
    if (!options.laxurls) should(s).not.be.exactly('', 'Invalid empty URL ' + context);
    let base = effSource;
    let variables = {};
    if (contextServers && contextServers.length) {
        let servers = contextServers[0];
        if (servers && servers.length) {
            base = servers[0].url;
            variables = servers[0].variables;
            for (let v in variables) {
                base = base.replace('{'+v+'}',variables[v].default);
            }
            if (base.indexOf('://') < 0) {
                base = new URL(base, effSource).toString();
            }
        }
    }
    if (s.indexOf('://') > 0) { // FIXME HACK
        base = undefined;
    }
    let u = new URL(s, base);
    return true; // if we haven't thrown
}

function validateComponentName(name) {
    return /^[a-zA-Z0-9\.\-_]+$/.test(name);
}

function validateHeaderName(name) {
    return /^[A-Za-z0-9!#\-\$%&'\*\+\\\.\^_`\|~]+$/.test(name);
}

function checkSubSchema(schema, parent, state) {
    let prop = state.property;
    if (prop) contextAppend(state.options, prop);
    if (state.options.lint) state.options.linter('schema',schema,prop,state.options);
    should(schema).be.an.Object();
    should(schema).not.be.an.Array();

    if (typeof schema.$ref !== 'undefined') {
        should(schema.$ref).be.a.String();
        if (state.options.lint) state.options.linter('reference',schema,'$ref',state.options);
        if (prop) state.options.context.pop();
        return; // all other properties SHALL be ignored (3.0)
    }

    for (let k in schema) {
        if (!k.startsWith('x-')) {
            should(['type','items','format','properties','required','minimum','maximum',
            'exclusiveMinimum','exclusiveMaximum','enum','default','description','title',
            'readOnly','writeOnly','anyOf','allOf','oneOf','not','discriminator','maxItems',
            'minItems','additionalItems','additionalProperties','example','maxLength',
            'minLength','pattern','uniqueItems','xml','externalDocs','nullable','deprecated',
            'minProperties','maxProperties','multipleOf'].indexOf(k)).
            be.greaterThan(-1,'Schema object cannot have additionalProperty: '+k);
        }
    }

    if (typeof schema.multipleOf !== 'undefined') {
        should(schema.multipleOf).be.type('number','multipleOf must be a number');
        should(schema.multipleOf).be.greaterThan(0);
    }
    if (typeof schema.maximum !== 'undefined') {
        should(schema.maximum).be.type('number','maximum must be a number');
    }
    if (typeof schema.exclusiveMaximum !== 'undefined') {
        should(schema.exclusiveMaximum).be.type('boolean','exclusiveMaximum must be a boolean');
    }
    if (typeof schema.minimum !== 'undefined') {
        should(schema.minimum).be.type('number','minimum must be a number');
    }
    if (typeof schema.exclusiveMinimum !== 'undefined') {
        should(schema.exclusiveMinimum).be.type('boolean','exclusiveMinimum must be a boolean');
    }
    if (typeof schema.maxLength !== 'undefined') {
        should(schema.maxLength).be.type('number','maxLength must be a number');
        should(schema.maxLength).be.greaterThan(-1);
    }
    if (typeof schema.minLength !== 'undefined') {
        should(schema.minLength).be.type('number','minLength must be a number');
        should(schema.minLength).be.greaterThan(-1);
    }
    if (schema.pattern) {
        try {
            let regex = new RegExp(schema.pattern);
        }
        catch (ex) {
            should.fail(false,true,'pattern does not conform to ECMA-262');
        }
    }
    if (typeof schema.items !== 'undefined') {
        should(schema.items).be.an.Object();
        should(schema.items).not.be.an.Array();
    }
    if (schema.additionalItems) {
        if (typeof schema.additionalItems === 'boolean') {
        }
        else if (typeof schema.additionalItems === 'object') {
            should(schema.additionalItems).not.be.an.Array();
        }
        else should.fail(false,true,'additionalItems must be a boolean or schema');
    }
    if (schema.additionalProperties) {
        if (typeof schema.additionalProperties === 'boolean') {
        }
        else if (typeof schema.additionalProperties === 'object') {
            should(schema.additionalProperties).not.be.an.Array();
        }
        else should.fail(false,true,'additionalProperties must be a boolean or schema');
    }
    if (typeof schema.maxItems !== 'undefined') {
        should(schema.maxItems).be.type('number','maxItems must be a number');
        should(schema.maxItems).be.greaterThan(-1);
    }
    if (typeof schema.minItems !== 'undefined') {
        should(schema.minItems).be.type('number','minItems must be a number');
        should(schema.minItems).be.greaterThan(-1);
    }
    if (typeof schema.uniqueItems !== 'undefined') {
        should(schema.uniqueItems).be.type('boolean','uniqueItems must be a boolean');
    }
    if (typeof schema.maxProperties !== 'undefined') {
        should(schema.maxProperties).be.type('number','maxProperties must be a number');
        should(schema.maxProperties).be.greaterThan(-1);
    }
    if (typeof schema.minProperties !== 'undefined') {
        should(schema.minProperties).be.type('number','minProperties must be a number');
        should(schema.minProperties).be.greaterThan(-1);
    }
    if (typeof schema.required !== 'undefined') {
        should(schema.required).be.an.Array();
        should(schema.required).not.be.empty();
        should(common.hasDuplicates(schema.required)).be.exactly(false,'required items must be unique: '+common.firstDupe(schema.required));
        // nb: required array can include (for example) specific properties which match patternProperties and which aren't listed in properties
    }
    if (schema.properties) {
        should(schema.properties).be.an.Object();
        should(schema.properties).not.be.an.Array();
    }
    should(schema).not.have.property('patternProperties');
    /*if (schema.patternProperties) {
        should(schema.patternProperties).be.an.Object();
        for (let prop in schema.patternProperties) {
            try {
                let regex = new RegExp(prop);
            }
            catch (ex) {
                should.fail(false,true,'patternProperty '+prop+' does not conform to ECMA-262');
            }
        }
    }*/
    if (typeof schema.enum !== 'undefined') {
        should(schema.enum).be.an.Array();
        should(schema.enum).not.be.empty();
        // items only SHOULD be unique
    }
    if (typeof schema.type !== 'undefined') {
        should(schema.type).be.a.String(); // not an array
        should(schema.type).equalOneOf('integer','number','string','boolean','object','array'); // not null
        if (schema.type === 'array') {
            should(schema).have.property('items');
        }
    }
    if (typeof schema.allOf !== 'undefined') {
        should(schema.allOf).be.an.Array();
        should(schema.allOf).not.be.empty();
    }
    if (typeof schema.anyOf !== 'undefined') {
        should(schema.anyOf).be.an.Array();
        should(schema.anyOf).not.be.empty();
    }
    if (typeof schema.oneOf !== 'undefined') {
        should(schema.oneOf).be.an.Array();
        should(schema.oneOf).not.be.empty();
    }
    if (schema.not) {
        should(schema.not).be.an.Object();
        should(schema.not).not.be.an.Array();
    }
    if (typeof schema.title !== 'undefined') {
        should(schema.title).be.a.String();
    }
    if (typeof schema.description !== 'undefined') {
        should(schema.description).be.a.String();
    }
    if (!state.options.laxDefaults && typeof schema.default !== 'undefined') {
        should(schema).have.property('type');
        let realType = typeof schema.default;
        let schemaType = schema.type;
        if (Array.isArray(schema.default)) realType = 'array';
        if (schemaType === 'integer') schemaType = 'number';
        if ((schema.default === null) && (schema.nullable)) {
            // nop
        }
        else {
            should(schemaType).equal(realType);
        }
    }
    if (typeof schema.format !== 'undefined') {
        should(schema.format).be.a.String();
        if (schema.type && ['date-time','email','hostname','ipv4','ipv6','uri','uriref',
            'byte','binary','date','password'].indexOf(schema.format) >= 0) {
            should(schema.type).equal('string',`Invalid type ${schema.type} for format ${schema.format}`);
        }
        if (schema.type && ['int32','int64'].indexOf(schema.format) >= 0) {
            if (schema.type !== 'string' && schema.type !== 'number') { // common case - googleapis
               should(schema.type).equal('integer',`Invalid type ${schema.type} for format ${schema.format}`);
            }
        }
        if (schema.type && ['float','double'].indexOf(schema.format) >= 0) {
            if (schema.type !== 'string') { // occasionally seen
                should(schema.type).equal('number',`Invalid type ${schema.type} for format ${schema.format}`);
            }
        }
    }

    if (typeof schema.nullable !== 'undefined') {
        should(schema.nullable).be.type('boolean','nullable must be a boolean');
    }
    if (typeof schema.readOnly !== 'undefined') {
        should(schema.readOnly).be.type('boolean','readOnly must be a boolean');
        if (schema.readOnly && schema.writeOnly) {
            should(schema).not.have.property('writeOnly');
        }
    }
    if (typeof schema.writeOnly !== 'undefined') {
        should(schema.writeOnly).be.type('boolean','writeOnly must be a boolean');
        if (schema.readOnly && schema.writeOnly) {
            should(schema).not.have.property('readOnly');
        }
    }
    if (typeof schema.deprecated !== 'undefined') {
        should(schema.deprecated).be.type('boolean','deprecated must be a boolean');
    }
    if (typeof schema.discriminator !== 'undefined') {
        should(schema.discriminator).be.an.Object();
        should(schema.discriminator).not.be.an.Array();
        should(schema.discriminator).have.property('propertyName');
        //"To avoid redundancy, the discriminator MAY be added to a parent schema definition..."
        //if ((Object.keys(parent).length>0) && !(parent.oneOf || parent.anyOf || parent.allOf)) {
        //    should.fail(false,true,'discriminator requires oneOf, anyOf or allOf in parent schema');
        //}
    }
    if (typeof schema.xml !== 'undefined') {
        should(schema.xml).be.an.Object();
        should(schema.xml).not.be.an.Array();
    }
    // example can be any type

    if (typeof schema.externalDocs !== 'undefined') {
        should(schema.externalDocs).be.an.Object();
        should(schema.externalDocs).not.be.an.Array();
        should(schema.externalDocs).have.key('url');
        should.doesNotThrow(function() { validateUrl(schema.externalDocs.url, [state.openapi.servers], 'externalDocs', state.options)}, 'Invalid externalDocs.url');
        if (state.options.lint) state.options.linter('externalDocs',schema.externalDocs,'externalDocs',state.options);
    }
    if (prop) state.options.context.pop();
}

function checkSchema(schema,parent,prop,openapi,options) {
    if ((typeof schema.$ref === 'string') && (!refSeen[schema.$ref])) {
      // check if the $reffed thing is actually a schema object (and not a response etc)
      // all other properties SHALL be ignored (3.0)
      const refSchema = resolveInternal(openapi,schema.$ref);
      should(refSchema).not.be.exactly(false, 'Cannot resolve reference: ' + schema.$ref);
      refSeen[schema.$ref] = checkSchema(refSchema,parent,prop,openapi,options);
    }
    else {
      let state = sw.getDefaultState();
      state.openapi = openapi;
      state.options = options;
      state.property = prop;
      sw.walkSchema(schema,parent,state,checkSubSchema);
    }
    return true;
}

function checkExample(ex, contextServers, openapi, options) {
    should(ex).be.an.Object();
    should(ex).not.be.an.Array();
    if (typeof ex.summary !== 'undefined') {
        should(ex.summary).have.type('string');
    }
    if (typeof ex.description !== 'undefined') {
        should(ex.description).have.type('string');
    }
    if (typeof ex.value !== 'undefined') {
        should(ex).not.have.property('externalValue');
    }
    if (typeof ex.externalValue !== 'undefined') {
        should(ex).not.have.property('value');
        should.doesNotThrow(function () { validateUrl(ex.externalValue, contextServers, 'examples..externalValue', options) },'Invalid examples..externalValue');
    }
    for (let k in ex) {
        if (!k.startsWith('x-')) {
            should(['summary','description','value','externalValue'].indexOf(k)).be.greaterThan(-1,'Example object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('example',ex,'example',options);
}

function checkContent(content, contextServers, openapi, options) {
    contextAppend(options, 'content');
    should(content).be.an.Object();
    should(content).not.be.an.Array();
    for (let ct in content) {
        contextAppend(options, jptr.jpescape(ct));
        // validate ct against https://tools.ietf.org/html/rfc6838#section-4.2
        if (options.mediatype) {
            should(/[a-zA-Z0-9!#$%^&\*_\-\+{}\|'.`~]+\/[a-zA-Z0-9!#$%^&\*_\-\+{}\|'.`~]+/.test(ct)).be.exactly(true,'media-type should match RFC6838 format'); // this is a SHOULD not MUST
        }
        let contentType = content[ct];
        should(contentType).be.an.Object();
        should(contentType).not.be.an.Array();

        if (typeof contentType.schema !== 'undefined') {
            checkSchema(contentType.schema,emptySchema,'schema',openapi,options);
        }
        if (typeof contentType.example !== 'undefined') {
            should(contentType).not.have.property('examples');
        }
        if (typeof contentType.examples !== 'undefined') {
            contextAppend(options, 'examples');
            should(contentType).not.have.property('example');
            should(contentType.examples).be.an.Object();
            should(contentType.examples).not.be.an.Array();
            for (let e in contentType.examples) {
                let ex = contentType.examples[e];
                if (typeof ex.$ref === 'undefined') {
                    checkExample(ex, contextServers, openapi, options);
                }
                else {
                    if (options.lint) options.linter('reference',ex,'$ref',options);
                }
            }
            options.context.pop();
        }

        for (let k in contentType) {
            if (!k.startsWith('x-')) {
                should(['schema','example','examples','encoding'].indexOf(k)).be.greaterThan(-1,'mediaType object cannot have additionalProperty: '+k);
            }
        }
        if (options.lint) options.linter('content',content,ct,options);
        options.context.pop();
    }
    options.context.pop();
}

function checkServer(server, options) {
    should(server).have.property('url');
    if (typeof server.description !== 'undefined') {
        should(server.description).be.a.String();
    }
    let u = server.url;
    let srvVars = 0;
    server.url.replace(/\{(.+?)\}/g, function (match, group1) {
        srvVars++;
        should(server).have.key('variables');
        should(server.variables).have.key(group1);
    });
    if (typeof server.variables !== 'undefined') {
        contextAppend(options, 'variables');
        should(server.variables).be.an.Object();
        should(server.variables).not.be.an.Array();
        for (let v in server.variables) {
            contextAppend(options, v);
            should(server.variables[v]).be.an.Object();
            should(server.variables[v]).have.key('default');
            should(server.variables[v].default).be.a.String();
            u = u.replace('{'+v+'}',server.variables[v].default);
            if (typeof server.variables[v].enum !== 'undefined') {
                contextAppend(options, 'enum');
                should(server.variables[v].enum).be.an.Array();
                should(server.variables[v].enum.length).not.be.exactly(0, 'Server variables enum should not be empty');
                for (let e in server.variables[v].enum) {
                    contextAppend(options, e);
                    should(server.variables[v].enum[e]).be.type('string');
                    options.context.pop();
                }
                options.context.pop();
            }
            if (options.lint) options.linter('serverVariable',server.variables[v],v,options);
            options.context.pop();
        }
        should(Object.keys(server.variables).length).be.exactly(srvVars,'Missing template variable in server url');
        options.context.pop();
    }

    should.doesNotThrow(function () { validateUrl(u, [], 'server.url', options) },'Invalid server.url');

    for (let k in server) {
        if (!k.startsWith('x-')) {
            should(['url','description','variables'].indexOf(k)).be.greaterThan(-1,'server object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('server',server,'server',options);
}

function checkServers(servers, options) {
    should(servers).be.an.Array();
    //should(common.distinctArray(servers)).be.exactly(true,'servers array must be distinct'); // TODO move to linter
    servers.forEach(function(server, s) {
        contextAppend(options, s);
        checkServer(server, options);
        options.context.pop();
    });
}

function checkLink(link, openapi, options) {
    if (typeof link.$ref !== 'undefined') {
        let ref = link.$ref;
        should(ref).be.type('string');
        if (refSeen[ref]) return true; // bail out
        refSeen[ref] = true;
        if (options.lint) options.linter('reference',link,'$ref',options);
        link = resolveInternal(openapi, ref);
        should(link).not.be.exactly(false, 'Cannot resolve reference: ' + ref);
    }
    should(link).be.type('object');
    if (typeof link.operationRef === 'undefined') {
        should(link).have.property('operationId');
    }
    else {
        should(link.operationRef).be.type('string');
        should(link).not.have.property('operationId');
    }
    if (typeof link.operationId === 'undefined') {
        should(link).have.property('operationRef');
    }
    else {
        should(link.operationId).be.type('string');
        should(link).not.have.property('operationRef');
        // validate operationId exists (external refs?)
    }
    if (typeof link.parameters != 'undefined') {
        should(link.parameters).be.type('object');
        should(link.parameters).not.be.an.Array();
    }
    if (typeof link.description !== 'undefined') {
        should(link.description).have.type('string');
    }
    if (typeof link.server !== 'undefined') {
        checkServer(link.server, options);
    }
    for (let k in link) {
        if (!k.startsWith('x-')) {
            should(['operationRef','operationId','parameters','requestBody','description','server'].indexOf(k)).be.greaterThan(-1,'link object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('link',link,'link',options);
}

function checkHeader(header, contextServers, openapi, options) {
    if (typeof header.$ref !== 'undefined') {
        let ref = header.$ref;
        should(ref).be.type('string');
        if (refSeen[ref]) return true; // bail out
        refSeen[ref] = true;
        if (options.lint) options.linter('reference',header,'$ref',options);
        header = resolveInternal(openapi, ref);
        should(header).not.be.exactly(false, 'Cannot resolve reference: ' + ref);
    }
    should(header).not.have.property('name');
    should(header).not.have.property('in');
    should(header).not.have.property('type');
    for (let prop of common.parameterTypeProperties) {
        should(header).not.have.property(prop);
    }
    if (typeof header.schema !== 'undefined') {
        should(header).not.have.property('content');
        if (typeof header.style !== 'undefined') {
            should(header.style).be.type('string');
            should(header.style).be.exactly('simple');
        }
        if (typeof header.explode !== 'undefined') {
            should(header.explode).be.type('boolean');
        }
        if (typeof header.allowReserved !== 'undefined') {
            should(header.allowReserved).be.type('boolean');
        }
        checkSchema(header.schema, emptySchema, 'schema', openapi, options);
    }
    if (header.content) {
        should(header).not.have.property('schema');
        should(header).not.have.property('style');
        should(header).not.have.property('explode');
        should(header).not.have.property('allowReserved');
        should(header).not.have.property('example');
        should(header).not.have.property('examples');
        checkContent(header.content, contextServers, openapi, options);
    }
    if (!header.schema && !header.content) {
        should(header).have.property('schema', 'Header should have schema or content');
    }
    for (let k in header) {
        if (!k.startsWith('x-')) {
           should(['description','required','deprecated','allowEmptyValue','style','explode','allowReserved','schema','example','examples','content'].indexOf(k)).be.greaterThan(-1,'header object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('header',header,'header',options);
}

function checkResponse(response, key, contextServers, openapi, options) {
    should(response).not.be.null();
    if (typeof response.$ref !== 'undefined') {
        let ref = response.$ref;
        should(ref).be.type('string');
        if (refSeen[ref]) return true; // bail out
        refSeen[ref] = true;
        if (options.lint) options.linter('reference',response,'$ref',options);
        response = resolveInternal(openapi, ref);
        should(response).not.be.exactly(false, 'Cannot resolve reference: ' + ref);
    }
    should(response).have.property('description');
    should(response.description).have.type('string', 'response description should be of type string');
    should(response).not.have.property('examples');
    should(response).not.have.property('schema');
    if (response.headers) {
        contextAppend(options, 'headers');
        for (let h in response.headers) {
            contextAppend(options, h);
            should(validateHeaderName(h)).be.equal(true, 'Header doesn\'t match RFC7230 pattern');
            checkHeader(response.headers[h], contextServers, openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }

    if (response.content) {
        checkContent(response.content, contextServers, openapi, options);
    }

    if (typeof response.links !== 'undefined') {
        contextAppend(options, 'links');
        for (let l in response.links) {
            contextAppend(options, l);
            checkLink(response.links[l], openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }
    for (let k in response) {
        if (!k.startsWith('x-')) {
            should(['description','headers','content','links'].indexOf(k)).be.greaterThan(-1,'response object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('response',response,key,options);
}

function checkParam(param, index, path, contextServers, openapi, options) {
    const ref = param.$ref;
    contextAppend(options, index);
    if (typeof param.$ref !== 'undefined') {
        should(ref).be.type('string');
        if (options.lint) options.linter('reference',param,'$ref',options);
        param = resolveInternal(openapi, ref);
        if (refSeen[ref] && (param.in !== 'path')) {
          options.context.pop();
          return param; // bail out
        }
        should(param).not.be.exactly(false, 'Cannot resolve reference: ' + ref);
    }
    should(param).have.property('name');
    should(param.name).have.type('string');
    should(param).have.property('in');
    should(param.in).have.type('string');
    should(param.in).equalOneOf('query', 'header', 'path', 'cookie');
    if (param.in === 'path') {
        should(param).have.property('required');
        should(param.required).be.exactly(true, 'Path parameters must have an explicit required:true');
        if (path) { // if we're not looking at a param from #/components (checked when used)
            should(path.indexOf('{'+param.name+'}')).be.greaterThan(-1,'path parameters must appear in the path');
        }
    }
    if (typeof param.required !== 'undefined') should(param.required).have.type('boolean');
    should(param).not.have.property('items');
    should(param).not.have.property('collectionFormat');
    should(param).not.have.property('type');
    for (let prop of common.parameterTypeProperties) {
        should(param).not.have.property(prop);
    }
    should(param.in).not.be.exactly('body', 'Parameter type body is no-longer valid');
    should(param.in).not.be.exactly('formData', 'Parameter type formData is no-longer valid');
    if (param.description) {
        should(param.description).have.type('string');
    }
    if (typeof param.deprecated !== 'undefined') {
        should(param.deprecated).be.a.Boolean();
    }
    if (typeof param.schema !== 'undefined') {
        should(param).not.have.property('content');
        if (typeof param.style !== 'undefined') {
            should(param.style).be.type('string');
            if (param.in === 'path') {
                should(param.style).not.be.exactly('form');
                should(param.style).not.be.exactly('spaceDelimited');
                should(param.style).not.be.exactly('pipeDelimited');
                should(param.style).not.be.exactly('deepObject');
            }
            if (param.in === 'query') {
                should(param.style).not.be.exactly('matrix');
                should(param.style).not.be.exactly('label');
                should(param.style).not.be.exactly('simple');
            }
            if (param.in === 'header') {
                should(param.style).be.exactly('simple');
            }
            if (param.in === 'cookie') {
                should(param.style).be.exactly('form');
            }
        }
        if (typeof param.explode !== 'undefined') {
            should(param.explode).be.type('boolean');
        }
        if (typeof param.allowReserved !== 'undefined') {
            should(param.allowReserved).be.type('boolean');
        }
        if (typeof param.example !== 'undefined') {
            should(param).not.have.key('examples');
        }
        if (typeof param.examples !== 'undefined') {
            contextAppend(options, 'examples');
            should(param).not.have.key('example');
            should(param.examples).be.an.Object();
            should(param.examples).not.be.an.Array();
            for (let e in param.examples) {
                contextAppend(options, e);
                let example = param.examples[e];
                checkExample(example, contextServers, openapi, options);
                options.context.pop();
            }
            options.context.pop();
        }
        checkSchema(param.schema, emptySchema, 'schema', openapi, options);
    }
    if (param.content) {
        should(param).not.have.property('schema');
        should(param).not.have.property('style');
        should(param).not.have.property('explode');
        should(param).not.have.property('allowReserved');
        should(param).not.have.property('example');
        should(param).not.have.property('examples');
        should(Object.keys(param.content).length).be.exactly(1, 'Parameter content must have only one entry');
        checkContent(param.content, contextServers, openapi, options);
    }
    if (!param.schema && !param.content) {
        should(param).have.property('schema', 'Parameter should have schema or content');
    }
    for (let k in param) {
        if (!k.startsWith('x-')) {
           should(['name','in','description','required','deprecated','allowEmptyValue','style','explode','allowReserved','schema','example','examples','content'].indexOf(k)).be.greaterThan(-1,'parameter object cannot have additionalProperty: '+k);
        }
    }
    if (options.lint) options.linter('parameter',param,index,options);
    options.context.pop();
    if (ref) {
      refSeen[ref] = param;
    }
    return param;
}

function checkPathItem(pathItem, path, openapi, options) {

    should(pathItem).be.an.Object();
    should(pathItem).not.be.an.Array();

    let contextServers = [];
    contextServers.push(openapi.servers);
    if (pathItem.servers) contextServers.push(pathItem.servers);

    let pathParameters = {};
    if (typeof pathItem.parameters !== 'undefined') should(pathItem.parameters).be.an.Array();
    contextAppend(options, 'parameters');
    for (let p in pathItem.parameters) {
        let param = checkParam(pathItem.parameters[p], p, path, contextServers, openapi, options);
        if (pathParameters[param.in+':'+param.name]) {
            should.fail(false,true,'Duplicate path-level parameter '+param.name);
        }
        else {
            pathParameters[param.in+':'+param.name] = param;
        }
    }
    options.context.pop();

    for (let o in pathItem) {
        contextAppend(options, o);
        let op = pathItem[o];
        if (o === '$ref') {
            should(op).be.ok();
            should(op).have.type('string');
            should(op.startsWith('#/') && (!op.startsWith('#/paths/')) && (op.indexOf('x-')<0)).equal(false,'PathItem $refs must be external or to specification extension ('+op+')');
            if (options.lint) options.linter('reference',pathItem,'$ref',options);
            if (!options.metadata.count.operation) {
                options.metadata.count.operation = 0;
            }
            options.metadata.count.operation++;
        }
        else if (o === 'parameters') {
            // checked above
        }
        else if (o === 'servers') {
            contextAppend(options, 'servers');
            checkServers(op, options); // won't be here in converted definitions
            options.context.pop();
        }
        else if (o === 'summary') {
            should(pathItem.summary).have.type('string');
        }
        else if (o === 'description') {
            should(pathItem.description).have.type('string');
        }
        else if (common.httpMethods.indexOf(o) >= 0) {
            should(op).be.an.Object();
            should(op).not.be.an.Array();
            should(op).not.have.property('consumes');
            should(op).not.have.property('produces');
            should(op).not.have.property('schemes');
            should(op).have.property('responses');
            contextAppend(options, 'responses');
            should(op.responses).not.be.undefined();
            should(op.responses).be.an.Object();
            should(op.responses).not.be.an.Array();
            should(op.responses).not.be.empty();
            options.context.pop();
            if (typeof op.summary !== 'undefined') should(op.summary).have.type('string');
            if (typeof op.description !== 'undefined') should(op.description).be.a.String();
            if (typeof op.operationId !== 'undefined') {
                should(op.operationId).be.a.String();
                should(options.operationIds.indexOf(op.operationId)).be.exactly(-1,'operationIds must be unique ['+op.operationId+']');
                options.operationIds.push(op.operationId);
            }

            if (typeof op.servers !== 'undefined') {
                contextAppend(options, 'servers');
                checkServers(op.servers, options); // won't be here in converted definitions
                options.context.pop();
                contextServers.push(op.servers);
            }

            if (typeof op.tags !== 'undefined') {
                contextAppend(options, 'tags');
                should(op.tags).be.an.Array();
                for (let tag of op.tags) {
                    should(tag).be.a.String();
                }
                options.context.pop();
            }

            if (typeof op.requestBody !== 'undefined') {
                contextAppend(options, 'requestBody');
                should(op.requestBody).not.be.null();
                should(op.requestBody).be.an.Object();
                should(op.requestBody).not.be.an.Array();
                if (typeof op.requestBody.description !== 'undefined') should(op.requestBody.description).have.type('string');
                if (typeof op.requestBody.required !== 'undefined') should(op.requestBody.required).have.type('boolean');
                if (typeof op.requestBody.content !== 'undefined') {
                    checkContent(op.requestBody.content, contextServers, openapi, options);
                }
                options.context.pop();
            }

            contextAppend(options, 'responses');
            if (options.lint) options.linter('responses',op.responses,'responses',options);
            for (let r in op.responses) {
                if (!r.startsWith('x-')) {
                    contextAppend(options, r);
                    if ((r !== 'default') && (!r.match('^[1-5](?:\\d{2}|XX)$'))) {
                        should.fail(false,true,'Responses object should not have additional property '+r);
}
                    let response = op.responses[r];
                    checkResponse(response, r, contextServers, openapi, options);
                    options.context.pop();
                }
            }
            options.context.pop();
            let localPathParameters = clone(pathParameters);

            let opParameters = {};
            if (typeof op.parameters !== 'undefined') {
                should(op.parameters).be.an.Array();
                contextAppend(options, 'parameters');
                for (let p in op.parameters) {
                    let param = checkParam(op.parameters[p], p, path, contextServers, openapi, options);
                    if (opParameters[param.in+':'+param.name]) {
                        should.fail(false,true,'Duplicate operation-level parameter '+param.name);
                    }
                    else {
                        opParameters[param.in+':'+param.name] = param;
                        delete localPathParameters[param.in+':'+param.name];
                    }
                }
                options.context.pop();
            }

            let contextParameters = Object.assign({},localPathParameters,opParameters);
            let prepath = path.split('?')[0];
            prepath.replace(/\{(.+?)\}/g, function (match, group1) {
                if (!contextParameters['path:'+group1]) {
                    if (!group1.startsWith('$')) { // callbacks
                        should.fail(false,true,'Templated parameter '+group1+' not found');
                    }
                }
            });

            if (typeof op.deprecated !== 'undefined') {
                should(op.deprecated).be.a.Boolean();
            }
            if (typeof op.externalDocs !== 'undefined') {
                contextAppend(options, 'externalDocs');
                should(op.externalDocs).be.an.Object();
                should(op.externalDocs).not.be.an.Array();
                should(op.externalDocs).have.key('url');
                if (typeof op.externalDocs.description !== 'undefined') {
                    should(op.externalDocs.description).be.a.String();
                }
                should.doesNotThrow(function () { validateUrl(op.externalDocs.url, contextServers, 'externalDocs', options) },'Invalid externalDocs.url');
                if (options.lint) options.linter('externalDocs',op.externalDocs,'externalDocs',options);
                options.context.pop();
            }
            if (op.callbacks) {
                contextAppend(options, 'callbacks');
                for (let c in op.callbacks) {
                    let callback = op.callbacks[c];
                    if (callback && typeof callback.$ref !== 'undefined') {
                        if (options.lint) options.linter('reference',callback,'$ref',options);
                    }
                    else {
                        contextAppend(options, c);
                        for (let p in callback) {
                            let cbPi = callback[p];
                            options.isCallback = true;
                            checkPathItem(cbPi, p, openapi, options);
                            options.isCallback = false;
                        }
                        options.context.pop();
                    }
                }
                options.context.pop();
            }
            if (op.security) {
                checkSecurity(op.security,openapi,options);
            }
            if (options.lint) options.linter('operation',op,o,options);
        }
        else if (!o.startsWith('x-')) {
            should.fail(false,true,'PathItem should not have additional property '+o);
        }
        options.context.pop();
    }
    if (options.lint) options.linter('pathItem',pathItem,path,options);
    return true;
}

function checkSecurity(security,openapi,options) {
    contextAppend(options, 'security');
    should(security).be.an.Array();
    //should(common.distinctArray(security)).be.exactly(true,'security array should be distinct'); // TODO move to linter
    for (let sr of security) {
        should(sr).be.an.Object();
        should(sr).not.be.an.Array();
        for (let i in sr) {
            should(sr[i]).be.an.Array();
            let sec = jptr.jptr(openapi,'#/components/securitySchemes/'+i);
            should(sec).not.be.exactly(false,'Could not dereference securityScheme '+i);
            if (sec.type !== 'openIdConnect') {
                if (sec.type !== 'oauth2') {
                    should(sr[i]).be.empty();
                }
                else if (sr[i].length) {
                    if (!options.allScopes[i]) {
                        options.allScopes[i] = {};
                        if (sec.flows) {
                            if (sec.flows.password) Object.assign(options.allScopes[i],sec.flows.password.scopes);
                            if (sec.flows.implicit) Object.assign(options.allScopes[i],sec.flows.implicit.scopes);
                            if (sec.flows.authorizationCode) Object.assign(options.allScopes[i],sec.flows.authorizationCode.scopes);
                            if (sec.flows.clientCredentials) Object.assign(options.allScopes[i],sec.flows.clientCredentials.scopes);
                        }
                    }
                    for (let scope of sr[i]) {
                        should(options.allScopes[i]).have.property(scope);
                    }
                }
            }
        }
    }
    if (options.lint) options.linter('security',security,'security',options);
    options.context.pop();
}

function validateInner(openapi, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
    try {
    setupOptions(options,openapi);
    let contextServers = [];

    should(openapi).be.an.Object();
    should(openapi).not.have.key('swagger');
    should(openapi).have.key('openapi');
    should(openapi.openapi).have.type('string');
    should.ok(openapi.openapi.startsWith('3.0.'), 'Must be an OpenAPI 3.0.x document');
    should(openapi).not.have.key('host');
    should(openapi).not.have.key('basePath');
    should(openapi).not.have.key('schemes');
    should(openapi).have.key('paths');
    should(openapi.paths).be.an.Object();
    should(openapi).not.have.key('definitions');
    should(openapi).not.have.key('parameters');
    should(openapi).not.have.key('responses');
    should(openapi).not.have.key('securityDefinitions');
    should(openapi).not.have.key('produces');
    should(openapi).not.have.key('consumes');

    for (let k in openapi) {
        if (!k.startsWith('x-')) {
            should(['openapi','info','servers','security','externalDocs','tags','paths','components'].indexOf(k)).be.greaterThan(-1,'OpenAPI object cannot have additionalProperty: '+k);
        }
    }

    if (typeof openapi.servers !== 'undefined') {
        should(openapi.servers).be.an.Object();
        contextAppend(options, 'servers');
        checkServers(openapi.servers, options);
        options.context.pop();
        contextServers.push(openapi.servers);
    }

    should(openapi).have.key('info');
    should(openapi.info).be.an.Object();
    should(openapi.info).not.be.an.Array();
    contextAppend(options, 'info');
    should(openapi.info).have.key('title');
    should(openapi.info.title).be.type('string', 'title should be of type string');
    should(openapi.info).have.key('version');
    should(openapi.info.version).be.type('string', 'version should be of type string');
    if (typeof openapi.info.license !== 'undefined') {
        should(openapi.info.license).be.an.Object();
        should(openapi.info.license).not.be.an.Array();
        contextAppend(options, 'license');
        should(openapi.info.license).have.key('name');
        should(openapi.info.license.name).have.type('string');
        if (typeof openapi.info.license.url !== 'undefined') {
            should.doesNotThrow(function () { validateUrl(openapi.info.license.url, contextServers, 'license.url', options) },'Invalid license.url');
        }
        if (options.lint) options.linter('license',openapi.info.license,'license',options);
        options.context.pop();
    }
    if (typeof openapi.info.termsOfService !== 'undefined') {
        should.doesNotThrow(function () { validateUrl(openapi.info.termsOfService, contextServers, 'termsOfService', options) },'Invalid termsOfService.url');
    }
    if (typeof openapi.info.contact !== 'undefined') {
        contextAppend(options, 'contact');
        should(openapi.info.contact).be.type('object');
        should(openapi.info.contact).not.be.an.Array();
        should(openapi.info.contact).not.be.Null();
        if (typeof openapi.info.contact.name !== 'undefined') {
            should(openapi.info.contact.name).be.a.String();
        }
        if (typeof openapi.info.contact.url !== 'undefined') {
            should.doesNotThrow(function () { validateUrl(openapi.info.contact.url, contextServers, 'url', options) },'Invalid contact.url');
        }
        if (typeof openapi.info.contact.email !== 'undefined') {
            should(openapi.info.contact.email).be.a.String();
            should(openapi.info.contact.email.indexOf('@')).be.greaterThan(-1,'Contact email must be a valid email address');
            should(openapi.info.contact.email.indexOf('.')).be.greaterThan(-1,'Contact email must be a valid email address');
        }
        if (options.lint) options.linter('contact',openapi.info.contact,'contact',options);
        for (let k in openapi.info.contact) {
            if (!k.startsWith('x-')) {
                should(['name','url','email'].indexOf(k)).be.greaterThan(-1,'info object cannot have additionalProperty: '+k);
            }
        }
        options.context.pop();
    }
    if (typeof openapi.info.description !== 'undefined') {
        should(openapi.info.description).be.a.String();
    }
    if (options.lint) options.linter('info',openapi.info,'info',options);
    options.context.pop();

    if (typeof openapi.externalDocs !== 'undefined') {
        should(openapi.externalDocs).be.an.Object();
        contextAppend(options, 'externalDocs');
        should(openapi.externalDocs).have.key('url');
        if (typeof openapi.externalDocs.description !== 'undefined') {
            should(openapi.externalDocs.description).be.a.String();
        }
        should.doesNotThrow(function () { validateUrl(openapi.externalDocs.url, contextServers, 'externalDocs', options) },'Invalid externalDocs.url');
        if (options.lint) options.linter('externalDocs',openapi.externalDocs,'externalDocs',options);
        options.context.pop();
    }

    if (typeof openapi.paths !== 'undefined'){
        if (options.lint) options.linter('paths',openapi.paths,'paths',options);
    }

    if (typeof openapi.tags !== 'undefined') {
        should(openapi.tags).be.an.Array();
        contextAppend(options, 'tags');
        let tagsSeen = new Map();
        for (let tag of openapi.tags) {
            should(tag).have.property('name');
            contextAppend(options, tag.name);
            should(tag.name).be.a.String();
            should(tagsSeen.has(tag.name)).be.exactly(false,'Tag names must be unique ['+tag.name+']');
            tagsSeen.set(tag.name,true);
            if (typeof tag.externalDocs !== 'undefined') {
                contextAppend(options, 'externalDocs');
                should(tag.externalDocs).be.an.Object();
                should(tag.externalDocs).not.be.an.Array();
                if (typeof tag.externalDocs.description !== 'undefined') {
                    should(tag.externalDocs.description).be.a.String();
                }
                should(tag.externalDocs).have.key('url');
                should.doesNotThrow(function () { validateUrl(tag.externalDocs.url, contextServers, 'tag.externalDocs', options) },'Invalid externalDocs.url');
                if (options.lint) options.linter('externalDocs',tag.externalDocs,'externalDocs',options);
                options.context.pop();
            }
            if (typeof tag.description !== 'undefined') {
                should(tag.description).be.a.String();
            }
            if (options.lint) options.linter('tag',tag,tag.name,options); // should be index
            options.context.pop();
        }
        options.context.pop();
    }

    if (typeof openapi.security !== 'undefined') {
        checkSecurity(openapi.security,openapi,options);
    }

    if (typeof openapi.components !== 'undefined') {
        options.context.push('#/components');
        should(openapi.components).be.an.Object();
        should(openapi.components).not.be.an.Array();
        if (options.lint) options.linter('components',openapi.components,'components',options);
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.securitySchemes !== 'undefined')) {
        options.context.push('#/components/securitySchemes');
        should(openapi.components.securitySchemes).be.an.Object();
        should(openapi.components.securitySchemes).not.be.an.Array();
        for (let s in openapi.components.securitySchemes) {
            options.context.push('#/components/securitySchemes/' + s);
            should(validateComponentName(s)).be.equal(true, 'component name invalid');
            let scheme = openapi.components.securitySchemes[s];
            should(scheme).have.property('type');
            should(scheme.type).have.type('string');
            should(scheme.type).not.be.exactly('basic', 'Security scheme basic should be http with scheme basic');
            should(scheme.type).equalOneOf('apiKey', 'http', 'oauth2', 'openIdConnect');
            if (scheme.type === 'http') {
                should(scheme).have.property('scheme');
                should(scheme.scheme).have.type('string');
                if (scheme.scheme != 'bearer') {
                    should(scheme).not.have.property('bearerFormat');
                }
            }
            else {
                should(scheme).not.have.property('scheme');
                should(scheme).not.have.property('bearerFormat');
            }
            if (scheme.type === 'apiKey') {
                should(scheme).have.property('name');
                should(scheme.name).have.type('string');
                should(scheme).have.property('in');
                should(scheme.in).have.type('string');
                should(scheme.in).equalOneOf('query', 'header', 'cookie');
            }
            else {
                should(scheme).not.have.property('name');
                should(scheme).not.have.property('in');
            }
            if (scheme.type === 'oauth2') {
                should(scheme).not.have.property('flow');
                should(scheme).have.property('flows');
                contextAppend(options,'flows');
                for (let f in scheme.flows) {
                    contextAppend(options,f);
                    let flow = scheme.flows[f];
                    should(['implicit','password','authorizationCode','clientCredentials'].indexOf(f)).be.greaterThan(-1,'Unknown flow type: '+f);

                    if ((f === 'implicit') || (f === 'authorizationCode')) {
                        should(flow).have.property('authorizationUrl');
                        should.doesNotThrow(function () { validateUrl(flow.authorizationUrl, contextServers, 'authorizationUrl', options) },'Invalid authorizationUrl');
                    }
                    else {
                        should(flow).not.have.property('authorizationUrl');
                    }
                    if ((f === 'password') || (f === 'clientCredentials') ||
                        (f === 'authorizationCode')) {
                        should(flow).have.property('tokenUrl');
                        should.doesNotThrow(function () { validateUrl(flow.tokenUrl, contextServers, 'tokenUrl', options) },'Invalid tokenUrl');
                    }
                    else {
                        should(flow).not.have.property('tokenUrl');
                    }
                    if (typeof flow.refreshUrl !== 'undefined') {
                        should.doesNotThrow(function () { validateUrl(flow.refreshUrl, contextServers, 'refreshUrl', options) },'Invalid refreshUrl');
                    }
                    should(flow).have.property('scopes');
                    should(flow.scopes).be.an.Object();
                    should(flow.scopes).not.be.an.Array();
                    options.context.pop();
                }
                options.context.pop();
            }
            else {
                should(scheme).not.have.property('flows');
            }
            if (scheme.type === 'openIdConnect') {
                should(scheme).have.property('openIdConnectUrl');
                should.doesNotThrow(function () { validateUrl(scheme.openIdConnectUrl, contextServers, 'openIdConnectUrl', options) },'Invalid openIdConnectUrl');
            }
            else {
                should(scheme).not.have.property('openIdConnectUrl');
            }
            if (options.lint) options.linter('securityScheme',scheme,s,options);
            options.context.pop();
        }
        options.context.pop();
    }

    let seen = new WeakSet();
    recurse(openapi, {identityDetection:true}, function (obj, key, state) {
        if (!options.anchors && (typeof obj[key] === 'object') && (obj[key] !== null)) {
            if (seen.has(obj[key])) {
                options.context.push(state.path);
                should.fail(true,false,'Definition contains YAML anchor or merge key');
                options.context.pop(); // won't actually get here
            }
            else {
                seen.add(obj[key]);
            }
        }
        if (isRef(obj,key) && (!refSeen[obj[key]])) {
            options.context.push(state.path);
            should(obj[key]).not.startWith('#/definitions/');
            let refUrl = url.parse(obj[key]);
            if (!refUrl.protocol && !refUrl.path) {
                should(obj[key]+'/%24ref').not.be.equal(state.path,'Circular reference');
                if (obj[key].indexOf('/examples/')<0) {
                    should(jptr.jptr(openapi,obj[key])).not.be.exactly(false, 'Cannot resolve reference: ' + obj[key]);
                }
            }
            options.context.pop();
        }
    });
    seen = null;

    let paths = {};

    for (let p in openapi.paths) {
        options.context.push('#/paths/' + jptr.jpescape(p));
        if (!p.startsWith('x-')) {
            should(p).startWith('/');
            if (!options.laxurls) should(p).not.containEql('?');
            if (!options.laxurls) should(p).not.containEql('#');
            let pCount = 0;
            let template = p.replace(/\{(.+?)\}/g, function (match, group1) {
                return '{'+(pCount++)+'}';
            });
            if (paths[template] && !openapi["x-hasEquivalentPaths"]) {
                should.fail(false,true,'Identical path templates detected');
            }
            paths[template] = {};
            let templateCheck = p.replace(/\{(.+?)\}/g, function (match, group1) {
                return '';
            });
            if ((templateCheck.indexOf('{')>=0) || (templateCheck.indexOf('}')>=0)) {
                should.fail(false,true,'Mismatched {} in path template');
            }

            checkPathItem(openapi.paths[p], p, openapi, options);
        }
        options.context.pop();
    }
    if (openapi["x-ms-paths"]) {
        for (let p in openapi["x-ms-paths"]) {
            options.context.push('#/x-ms-paths/' + jptr.jpescape(p));
            should(p).startWith('/');
            //if (!options.laxurls) should(p).not.containEql('?');
            if (!options.laxurls) should(p).not.containEql('#');
            checkPathItem(openapi["x-ms-paths"][p], p, openapi, options);
            options.context.pop();
        }
    }

    if (openapi.components && (typeof openapi.components.parameters !== 'undefined')) {
        options.context.push('#/components/parameters/');
        should(openapi.components.parameters).be.an.Object();
        should(openapi.components.parameters).not.be.an.Array();
        for (let p in openapi.components.parameters) {
            checkParam(openapi.components.parameters[p], p, '', contextServers, openapi, options);
            contextAppend(options, p);
            should(validateComponentName(p)).be.equal(true, 'component name invalid');
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.schemas !== 'undefined')) {
        options.context.push('#/components/schemas');
        should(openapi.components.schemas).be.an.Object();
        should(openapi.components.schemas).not.be.an.Array();
        for (let s in openapi.components.schemas) {
            options.context.push('#/components/schemas/' + s);
            should(validateComponentName(s)).be.equal(true, 'component name invalid');
            checkSchema(openapi.components.schemas[s], dummySchema, '', openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.responses !== 'undefined')) {
        options.context.push('#/components/responses');
        should(openapi.components.responses).be.an.Object();
        should(openapi.components.responses).not.be.an.Array();
        for (let r in openapi.components.responses) {
            options.context.push('#/components/responses/' + r);
            should(validateComponentName(r)).be.equal(true, 'component name invalid');
            checkResponse(openapi.components.responses[r], r, contextServers, openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.headers !== 'undefined')) {
        options.context.push('#/components/headers');
        should(openapi.components.headers).be.an.Object();
        should(openapi.components.headers).not.be.an.Array();
        for (let h in openapi.components.headers) {
            options.context.push('#/components/headers/' + h);
            should(validateComponentName(h)).be.equal(true, 'component name invalid');
            checkHeader(openapi.components.headers[h], contextServers, openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.requestBodies !== 'undefined')) {
        options.context.push('#/components/requestBodies');
        should(openapi.components.requestBodies).be.an.Object();
        should(openapi.components.requestBodies).not.be.an.Array();
        for (let r in openapi.components.requestBodies) {
            options.context.push('#/components/requestBodies/' + r);
            should(validateComponentName(r)).be.equal(true, 'component name invalid');
            if (r.startsWith('requestBody')) {
                options.warnings.push('Anonymous requestBody: ' + r);
            }
            let rb = openapi.components.requestBodies[r];
            should(rb).have.property('content');
            if (typeof rb.description !== 'undefined') should(rb.description).have.type('string');
            if (typeof rb.required !== 'undefined') should(rb.required).have.type('boolean');
            checkContent(rb.content, openapi.servers, openapi, options);
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.examples !== 'undefined')) {
        options.context.push('#/components/examples');
        should(openapi.components.examples).be.an.Object();
        should(openapi.components.examples).not.be.an.Array();
        for (let e in openapi.components.examples) {
            options.context.push('#/components/examples/' + e);
            should(validateComponentName(e)).be.equal(true, 'component name invalid');
            let ex = openapi.components.examples[e];
            if (typeof ex.$ref === 'undefined') {
                checkExample(ex, openapi.servers, openapi, options);
            }
            else {
                if (options.lint) options.linter('reference',ex,'$ref',options);
            }
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.callbacks !== 'undefined')) {
        options.context.push('#/components/callbacks');
        should(openapi.components.callbacks).be.an.Object();
        should(openapi.components.callbacks).not.be.an.Array();
        for (let c in openapi.components.callbacks) {
            options.context.push('#/components/callbacks/' + c);
            should(validateComponentName(c)).be.equal(true, 'component name invalid');
            let cb = openapi.components.callbacks[c];
            if (typeof cb.$ref === 'undefined') {
                for (let exp in cb) {
                    let cbPi = cb[exp];
                    options.isCallback = true;
                    checkPathItem(cbPi, exp, openapi, options);
                    options.isCallback = false;
                }
            }
            else {
                if (options.lint) options.linter('reference',cb,'$ref',options);
            }
            options.context.pop();
        }
        options.context.pop();
    }

    if (openapi.components && (typeof openapi.components.links !== 'undefined')) {
        options.context.push('#/components/links');
        should(openapi.components.links).be.type('object');
        should(openapi.components.links).not.be.an.Array();
        for (let l in openapi.components.links) {
            options.context.push('#/components/links/' + l);
            should(validateComponentName(l)).be.equal(true, 'component name invalid');
            let link = openapi.components.links[l];
            if (typeof link.$ref === 'undefined') {
                checkLink(link, openapi, options);
            }
            else {
                if (options.lint) options.linter('reference',link,'$ref',options);
            }
            options.context.pop();
        }
        options.context.pop();
    }

    options.valid = !options.expectFailure;
    if (options.lint) options.linter('openapi',openapi,'',options);

    options.warnings = options.warnings.filter(common.uniqueOnly);

    if (options.verbose > 1) {
        for (let w=0;w<options.warnings.length && w<options.lintLimit;w++) {
            let warning = options.warnings[w];
            if (warning.pointer) console.warn(warning.pointer);
            console.warn(warning.rule.name,warning.rule.description);
        }
    }

    if (options.lint) {
        options.linter('metadata',options.metadata,'metadata',options);
        options.linter('metadata.count',options.metadata.count,'count',options);
        options.warnings = options.warnings.concat(options.linterResults());
    }

    should (options.warnings.length).be.equal(0,`There were ${options.warnings.length} lint rule violations${options.warnings.length > options.lintLimit ? `, showing first ${options.lintLimit}` : ''}`);

    resolve(options.valid);
    }
    catch (ex) {
        ex.options = options;
        reject(ex);
        throw ex;
    }
    }));
}

function setupOptions(options,openapi) {
    refSeen = {};
    options.valid = false;
    options.context = [ '#/' ];
    options.warnings = [];
    if (!options.lintLimit) options.lintLimit = 5;
    if (!options.lintSkip) options.lintSkip = [];
    options.operationIds = [];
    options.allScopes = {};
    options.openapi = openapi;
    if (options.lint && !options.linter) {
        options.linter = linter.lint;
        linter.loadDefaultRules();
        options.linterResults = linter.getResults;
    }
    if (!options.cache) options.cache = {};
    options.metadata = { lines: -1, count: {} };
    if ((options.text) && (typeof options.text === 'string')) options.metadata.lines = options.text.split('\n').length;
}

function validate(openapi, options, callback) {
    return maybe(callback, new Promise(function (resolve, reject) {
        setupOptions(options,openapi);

        let actions = [];

        resolver.optionalResolve(options)
        .then(function(){
            options.context = [];
            validateInner(openapi, options)
            .then(function(){
                return resolve(options);
            })
            .catch(function(err){
                err.options = options;
                return reject(err);
            });
        })
        .catch(function (err) {
            return reject(err);
        });
    }));
}

function microValidate(openapi, options) {
    return (openapi && openapi.openapi && openapi.info && (typeof openapi.info.version !== 'undefined') && (typeof openapi.info.title !== 'undefined') && openapi.paths);
}

function optionallyValidate(openapi, options) {
    const target = options.externalRef||openapi;
    if (microValidate(target, options)) {
        validateInner(target, options, function(err, options) {
            if (err) throw err;
        });
    }
    return openapi
}

module.exports = {
    validateInner: validateInner,
    validate: validate,
    microValidate: microValidate,
    optionallyValidate: optionallyValidate
}
