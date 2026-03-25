'use strict';

const recurse = require('./recurse.js').recurse;
const clone = require('./clone.js').shallowClone;
const jptr = require('./jptr.js').jptr;
const isRef = require('./isref.js').isRef;

var getLogger = function (options) {
    if (options && options.verbose) {
        return {
            warn: function() {
                var args = Array.prototype.slice.call(arguments);
                console.warn.apply(console, args);
            }
        }
    }
    else {
        return {
            warn: function() {
                //nop
            }
        }
    }
}

/**
* dereferences the given object
* @param o the object to dereference
* @definitions a source of definitions to reference
* @options optional settings (used recursively)
* @return the dereferenced object
*/
function dereference(o,definitions,options) {
    if (!options) options = {};
    if (!options.cache) options.cache = {};
    if (!options.state) options.state = {};
    options.state.identityDetection = true;
    // options.depth allows us to limit cloning to the first invocation
    options.depth = (options.depth ? options.depth+1 : 1);
    let obj = (options.depth > 1 ? o : clone(o));
    let container = { data: obj };
    let defs = (options.depth > 1 ? definitions : clone(definitions));
    // options.master is the top level object, regardless of depth
    if (!options.master) options.master = obj;

    let logger = getLogger(options);

    let changes = 1;
    while (changes > 0) {
        changes = 0;
    recurse(container,options.state,function(obj,key,state){
        if (isRef(obj,key)) {
            let $ref = obj[key]; // immutable
            changes++;
            if (!options.cache[$ref]) {
                let entry = {};
                entry.path = state.path.split('/$ref')[0];
                entry.key = $ref;
                logger.warn('Dereffing %s at %s',$ref,entry.path);
                entry.source = defs;
                entry.data = jptr(entry.source,entry.key);
                if (entry.data === false) {
                    entry.data = jptr(options.master,entry.key);
                    entry.source = options.master;
                }
                if (entry.data === false) {
                    logger.warn('Missing $ref target',entry.key);
                }
                options.cache[$ref] = entry;
                entry.data = state.parent[state.pkey] = dereference(jptr(entry.source,entry.key),entry.source,options);
                if (options.$ref && (typeof state.parent[state.pkey] === 'object') && (state.parent[state.pkey] !== null)) state.parent[state.pkey][options.$ref] = $ref;
                entry.resolved = true;
            }
            else {
                let entry = options.cache[$ref];
                if (entry.resolved) {
                    // we have already seen and resolved this reference
                    logger.warn('Patching %s for %s',$ref,entry.path);
                    state.parent[state.pkey] = entry.data;
                    if (options.$ref && (typeof state.parent[state.pkey] === 'object') && (state.parent[state.pkey] !== null)) state.parent[state.pkey][options.$ref] = $ref;
                }
                else if ($ref === entry.path) {
                    // reference to itself, throw
                    throw new Error(`Tight circle at ${entry.path}`);
                }
                else {
                    // we're dealing with a circular reference here
                    logger.warn('Unresolved ref');
                    state.parent[state.pkey] = jptr(entry.source,entry.path);
                    if (state.parent[state.pkey] === false) {
                        state.parent[state.pkey] = jptr(entry.source,entry.key);
                    }
                    if (options.$ref && (typeof state.parent[state.pkey] === 'object') && (state.parent[state.pkey] !== null)) state.parent[options.$ref] = $ref;
                }
            }
        }
    });
    }
    return container.data;
}

module.exports = {
    dereference : dereference
};

