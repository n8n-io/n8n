'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');

const fetch = require('node-fetch-h2');
const yaml = require('yaml');

const jptr = require('reftools/lib/jptr.js').jptr;
const recurse = require('reftools/lib/recurse.js').recurse;
const clone = require('reftools/lib/clone.js').clone;
const deRef = require('reftools/lib/dereference.js').dereference;
const isRef = require('reftools/lib/isref.js').isRef;
const common = require('oas-kit-common');

function unique(arr) {
    return [... new Set(arr)];
}

function readFileAsync(filename, encoding, options, pointer, def) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filename, encoding, function (err, data) {
            if (err) {
                if (options.ignoreIOErrors && def) {
                    if (options.verbose) console.warn('FAILED',pointer);
                    options.externalRefs[pointer].failed = true;
                    resolve(def);
                }
                else {
                    reject(err);
                }
            }
            else {
                resolve(data);
            }
        });
    });
}

function resolveAllFragment(obj, context, src, parentPath, base, options) {

    let attachPoint = options.externalRefs[src+parentPath].paths[0];

    let baseUrl = url.parse(base);
    let seen = {}; // seen is indexed by the $ref value and contains path replacements
    let changes = 1;
    while (changes) {
        changes = 0;
        recurse(obj, {identityDetection:true}, function (obj, key, state) {
            if (isRef(obj, key)) {
                if (obj[key].startsWith('#')) {
                    if (!seen[obj[key]] && !obj.$fixed) {
                        let target = clone(jptr(context, obj[key]));
                        if (options.verbose>1) console.warn((target === false ? common.colour.red : common.colour.green)+'Fragment resolution', obj[key], common.colour.normal);
                        /*
                            ResolutionCase:A is where there is a local reference in an externally
                            referenced document, and we have not seen it before. The reference
                            is replaced by a copy of the data pointed to, which may be outside this fragment
                            but within the context of the external document
                        */
                        if (target === false) {
                            state.parent[state.pkey] = {}; /* case:A(2) where the resolution fails */
                            if (options.fatal) {
                                let ex = new Error('Fragment $ref resolution failed '+obj[key]);
                                if (options.promise) options.promise.reject(ex)
                                else throw ex;
                            }
                        }
                        else {
                            changes++;
                            state.parent[state.pkey] = target;
                            seen[obj[key]] = state.path.replace('/%24ref','');
                        }
                    }
                    else {
                        if (!obj.$fixed) {
                            let newRef = (attachPoint+'/'+seen[obj[key]]).split('/#/').join('/');
                            state.parent[state.pkey] = { $ref: newRef, 'x-miro': obj[key], $fixed: true };
                            if (options.verbose>1) console.warn('Replacing with',newRef);
                            changes++;
                        }
                        /*
                            ResolutionCase:B is where there is a local reference in an externally
                            referenced document, and we have seen this reference before and resolved it.
                            We create a new object containing the (immutable) $ref string
                        */
                    }
                }
                else if (baseUrl.protocol) {
                    let newRef = url.resolve(base,obj[key]).toString();
                    if (options.verbose>1) console.warn(common.colour.yellow+'Rewriting external url ref',obj[key],'as',newRef,common.colour.normal);
                    obj['x-miro'] = obj[key];
                    if (options.externalRefs[obj[key]]) {
                        if (!options.externalRefs[newRef]) {
                            options.externalRefs[newRef] = options.externalRefs[obj[key]];
                        }
                        options.externalRefs[newRef].failed = options.externalRefs[obj[key]].failed;
                    }
                    obj[key] = newRef;
                }
                else if (!obj['x-miro']) {
                    let newRef = url.resolve(base,obj[key]).toString();
                    let failed = false;
                    if (options.externalRefs[obj[key]]) {
                        failed = options.externalRefs[obj[key]].failed;
                    }
                    if (!failed) {
                        if (options.verbose>1) console.warn(common.colour.yellow+'Rewriting external ref',obj[key],'as',newRef,common.colour.normal);
                        obj['x-miro'] = obj[key]; // we use x-miro as a flag so we don't do this > once
                        obj[key] = newRef;
                    }
                }
            }
        });
    }

    recurse(obj,{},function(obj,key,state){
        if (isRef(obj, key)) {
            if (typeof obj.$fixed !== 'undefined') delete obj.$fixed;
        }
    });

    if (options.verbose>1) console.warn('Finished fragment resolution');
    return obj;
}

function filterData(data, options) {
    if (!options.filters || !options.filters.length) return data;
    for (let filter of options.filters) {
        data = filter(data, options);
    }
    return data;
}

function testProtocol(input, backup) {
    if (input && input.length > 2) return input;
    if (backup && backup.length > 2) return backup;
    return 'file:';
}

function resolveExternal(root, pointer, options, callback) {
    var u = url.parse(options.source);
    var base = options.source.split('\\').join('/').split('/');
    let doc = base.pop(); // drop the actual filename
    if (!doc) base.pop(); // in case it ended with a /
    let fragment = '';
    let fnComponents = pointer.split('#');
    if (fnComponents.length > 1) {
        fragment = '#' + fnComponents[1];
        pointer = fnComponents[0];
    }
    base = base.join('/');

    let u2 = url.parse(pointer);
    let effectiveProtocol = testProtocol(u2.protocol, u.protocol);

    let target;
    if (effectiveProtocol === 'file:') {
        target = path.resolve(base ? base + '/' : '', pointer);
    }
    else {
        target = url.resolve(base ? base + '/' : '', pointer);
    }

    if (options.cache[target]) {
        if (options.verbose) console.warn('CACHED', target, fragment);
        /*
            resolutionSource:A this is where we have cached the externally-referenced document from a
            file, http or custom handler
        */
        let context = clone(options.cache[target]);
        let data = options.externalRef = context;
        if (fragment) {
            data = jptr(data, fragment);
            if (data === false) {
                data = {}; // case:A(2) where the resolution fails
                if (options.fatal) {
                    let ex = new Error('Cached $ref resolution failed '+target+fragment);
                    if (options.promise) options.promise.reject(ex)
                    else throw ex;
                }
            }
        }
        data = resolveAllFragment(data, context, pointer, fragment, target, options);
        data = filterData(data, options);
        callback(clone(data), target, options);
        return Promise.resolve(data);
    }

    if (options.verbose) console.warn('GET', target, fragment);

    if (options.handlers && options.handlers[effectiveProtocol]) {
        return options.handlers[effectiveProtocol](base, pointer, fragment, options)
            .then(function (data) {
                options.externalRef = data;
                data = filterData(data, options);
                options.cache[target] = data;
                callback(data, target, options);
                return data;
            })
            .catch(function(ex){
                if (options.verbose) console.warn(ex);
                throw ex;
            });
    }
    else if (effectiveProtocol && effectiveProtocol.startsWith('http')) {
        const fetchOptions = Object.assign({}, options.fetchOptions, { agent: options.agent });
        return options.fetch(target, fetchOptions)
            .then(function (res) {
                if (res.status !== 200) {
                  if (options.ignoreIOErrors) {
                    if (options.verbose) console.warn('FAILED',pointer);
                    options.externalRefs[pointer].failed = true;
                    return '{"$ref":"'+pointer+'"}';
                  }
                  else {
                    throw new Error(`Received status code ${res.status}: ${target}`);
                  }
                }
                return res.text();
            })
            .then(function (data) {
                try {
                    let context = yaml.parse(data, { schema:'core', prettyErrors: true });
                    data = options.externalRef = context;
                    options.cache[target] = clone(data);
                    /* resolutionSource:B, from the network, data is fresh, but we clone it into the cache */
                    if (fragment) {
                        data = jptr(data, fragment);
                        if (data === false) {
                            data = {}; /* case:B(2) where the resolution fails */
                            if (options.fatal) {
                                let ex = new Error('Remote $ref resolution failed '+target+fragment);
                                if (options.promise) options.promise.reject(ex)
                                else throw ex;
                            }
                        }
                    }
                    data = resolveAllFragment(data, context, pointer, fragment, target, options);
                    data = filterData(data, options);
                }
                catch (ex) {
                    if (options.verbose) console.warn(ex);
                    if (options.promise && options.fatal) options.promise.reject(ex)
                    else throw ex;
                }
                callback(data, target, options);
                return data;
            })
            .catch(function (err) {
                if (options.verbose) console.warn(err);
                options.cache[target] = {};
                if (options.promise && options.fatal) options.promise.reject(err)
                else throw err;
            });
    }
    else {
        const def = '{"$ref":"'+pointer+'"}';
        return readFileAsync(target, options.encoding || 'utf8', options, pointer, def)
            .then(function (data) {
                try {
                    let context = yaml.parse(data, { schema:'core', prettyErrors: true });
                    data = options.externalRef = context;
                    /*
                        resolutionSource:C from a file, data is fresh but we clone it into the cache
                    */
                    options.cache[target] = clone(data);
                    if (fragment) {
                        data = jptr(data, fragment);
                        if (data === false) {
                            data = {}; /* case:C(2) where the resolution fails */
                            if (options.fatal) {
                                let ex = new Error('File $ref resolution failed '+target+fragment);
                                if (options.promise) options.promise.reject(ex)
                                else throw ex;
                            }
                        }
                    }
                    data = resolveAllFragment(data, context, pointer, fragment, target, options);
                    data = filterData(data, options);
                }
                catch (ex) {
                    if (options.verbose) console.warn(ex);
                    if (options.promise && options.fatal) options.promise.reject(ex)
                    else throw ex;
                }
                callback(data, target, options);
                return data;
            })
            .catch(function(err){
                if (options.verbose) console.warn(err);
                if (options.promise && options.fatal) options.promise.reject(err)
                else throw err;
            });
    }
}

function scanExternalRefs(options) {
    return new Promise(function (res, rej) {

        function inner(obj,key,state){
            if (obj[key] && isRef(obj[key],'$ref')) {
                let $ref = obj[key].$ref;
                if (!$ref.startsWith('#')) { // is external

                    let $extra = '';

                    if (!refs[$ref]) {
                        let potential = Object.keys(refs).find(function(e,i,a){
                            return $ref.startsWith(e+'/');
                        });
                        if (potential) {
                            if (options.verbose) console.warn('Found potential subschema at',potential);
                            $extra = '/'+($ref.split('#')[1]||'').replace(potential.split('#')[1]||'');
                            $extra = $extra.split('/undefined').join(''); // FIXME
                            $ref = potential;
                        }
                    }

                    if (!refs[$ref]) {
                        refs[$ref] = { resolved: false, paths: [], extras:{}, description: obj[key].description };
                    }
                    if (refs[$ref].resolved) {
                        // we've already seen it
                        if (refs[$ref].failed) {
                          // do none
                        }
                        else if (options.rewriteRefs) {
                            let newRef = refs[$ref].resolvedAt;
                            if (options.verbose>1) console.warn('Rewriting ref', $ref, newRef);
                            obj[key]['x-miro'] = $ref;
                            obj[key].$ref = newRef+$extra; // resolutionCase:C (new string)
                        }
                        else {
                            obj[key] = clone(refs[$ref].data); // resolutionCase:D (cloned:yes)
                        }
                    }
                    else {
                        refs[$ref].paths.push(state.path);
                        refs[$ref].extras[state.path] = $extra;
                    }
                }
            }
        }

        let refs = options.externalRefs;

        if ((options.resolver.depth>0) && (options.source === options.resolver.base)) {
            // we only need to do any of this when called directly on pass #1
            return res(refs);
        }

        recurse(options.openapi.definitions, {identityDetection: true, path: '#/definitions'}, inner);
        recurse(options.openapi.components, {identityDetection: true, path: '#/components'}, inner);
        recurse(options.openapi, {identityDetection: true}, inner);

        res(refs);
    });
}

function findExternalRefs(options) {
    return new Promise(function (res, rej) {

        scanExternalRefs(options)
        .then(function (refs) {
            for (let ref in refs) {

                if (!refs[ref].resolved) {
                    let depth = options.resolver.depth;
                    if (depth>0) depth++;
                    options.resolver.actions[depth].push(function () {
                        return resolveExternal(options.openapi, ref, options, function (data, source, options) {
                            if (!refs[ref].resolved) {
                                let external = {};
                                external.context = refs[ref];
                                external.$ref = ref;
                                external.original = clone(data);
                                external.updated = data;
                                external.source = source;
                                options.externals.push(external);
                                refs[ref].resolved = true;
                            }

                            let localOptions = Object.assign({}, options, { source: '',
                                resolver: {actions: options.resolver.actions,
                                depth: options.resolver.actions.length-1, base: options.resolver.base } });
                            if (options.patch && refs[ref].description && !data.description &&
                                (typeof data === 'object')) {
                                data.description = refs[ref].description;
                            }
                            refs[ref].data = data;

                            // sorting $refs by length causes bugs (due to overlapping regions?)
                            let pointers = unique(refs[ref].paths);
                            pointers = pointers.sort(function(a,b){
                                const aComp = (a.startsWith('#/components/') || a.startsWith('#/definitions/'));
                                const bComp = (b.startsWith('#/components/') || b.startsWith('#/definitions/'));
                                if (aComp && !bComp) return -1;
                                if (bComp && !aComp) return +1;
                                return 0;
                            });

                            for (let ptr of pointers) {
                                // shared x-ms-examples $refs confuse the fixupRefs heuristic in index.js
                                if (refs[ref].resolvedAt && (ptr !== refs[ref].resolvedAt) && (ptr.indexOf('x-ms-examples/')<0)) {
                                    if (options.verbose>1) console.warn('Creating pointer to data at', ptr);
                                    jptr(options.openapi, ptr, { $ref: refs[ref].resolvedAt+refs[ref].extras[ptr], 'x-miro': ref+refs[ref].extras[ptr] }); // resolutionCase:E (new object)
                                }
                                else {
                                    if (refs[ref].resolvedAt) {
                                        if (options.verbose>1) console.warn('Avoiding circular reference');
                                    }
                                    else {
                                        refs[ref].resolvedAt = ptr;
                                        if (options.verbose>1) console.warn('Creating initial clone of data at', ptr);
                                    }
                                    let cdata = clone(data);
                                    jptr(options.openapi, ptr, cdata); // resolutionCase:F (cloned:yes)
                                }
                            }
                            if (options.resolver.actions[localOptions.resolver.depth].length === 0) {
                                //options.resolver.actions[localOptions.resolver.depth].push(function () { return scanExternalRefs(localOptions) });
                                options.resolver.actions[localOptions.resolver.depth].push(function () { return findExternalRefs(localOptions) }); // findExternalRefs calls scanExternalRefs
                            }
                        });
                    });
                }
            }
        })
        .catch(function(ex){
            if (options.verbose) console.warn(ex);
            rej(ex);
        });

        let result = {options:options};
        result.actions = options.resolver.actions[options.resolver.depth];
        res(result);
    });
}

const serial = funcs =>
    funcs.reduce((promise, func) =>
        promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]));

function loopReferences(options, res, rej) {
    options.resolver.actions.push([]);
    findExternalRefs(options)
        .then(function (data) {
            serial(data.actions)
                .then(function () {
                    if (options.resolver.depth>=options.resolver.actions.length) {
                        console.warn('Ran off the end of resolver actions');
                        return res(true);
                    } else {
                        options.resolver.depth++;
                        if (options.resolver.actions[options.resolver.depth].length) {
                            setTimeout(function () {
                                loopReferences(data.options, res, rej);
                            }, 0);
                        }
                        else {
                            if (options.verbose>1) console.warn(common.colour.yellow+'Finished external resolution!',common.colour.normal);
                            if (options.resolveInternal) {
                                if (options.verbose>1) console.warn(common.colour.yellow+'Starting internal resolution!',common.colour.normal);
                                options.openapi = deRef(options.openapi,options.original,{verbose:options.verbose-1});
                                if (options.verbose>1) console.warn(common.colour.yellow+'Finished internal resolution!',common.colour.normal);
                            }
                            recurse(options.openapi,{},function(obj,key,state){
                                if (isRef(obj, key)) {
                                    if (!options.preserveMiro) delete obj['x-miro'];
                                }
                            });
                            res(options);
                        }
                    }
                })
                .catch(function (ex) {
                    if (options.verbose) console.warn(ex);
                    rej(ex);
                });
        })
        .catch(function(ex){
            if (options.verbose) console.warn(ex);
            rej(ex);
        });
}

function setupOptions(options) {
    if (!options.cache) options.cache = {};
    if (!options.fetch) options.fetch = fetch;

    if (options.source) {
        let srcUrl = url.parse(options.source);
        if (!srcUrl.protocol || srcUrl.protocol.length <= 2) { // windows drive-letters
            options.source = path.resolve(options.source);
        }
    }

    options.externals = [];
    options.externalRefs = {};
    options.rewriteRefs = true;
    options.resolver = {};
    options.resolver.depth = 0;
    options.resolver.base = options.source;
    options.resolver.actions = [[]];
}

/** compatibility function for swagger2openapi */
function optionalResolve(options) {
    setupOptions(options);
    return new Promise(function (res, rej) {
        if (options.resolve)
            loopReferences(options, res, rej)
        else
            res(options);
    });
}

function resolve(openapi,source,options) {
    if (!options) options = {};
    options.openapi = openapi;
    options.source = source;
    options.resolve = true;
    setupOptions(options);
    return new Promise(function (res, rej) {
        loopReferences(options, res, rej)
    });
}

module.exports = {
    optionalResolve: optionalResolve,
    resolve: resolve
};

