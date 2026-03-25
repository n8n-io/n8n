'use strict';

const recurse = require('./recurse.js').recurse;
const jptr = require('./jptr.js').jptr;

/**
* Simply modifies an object to have no self-references by replacing them
* with $ref pointers
* @param obj the object to re-reference
* @param options may contain a prefix property for the generated refs
* @return the re-referenced object (mutated)
*/

function reref(obj,options) {
    let master = obj;
    recurse(obj,{identityDetection:true},function(obj,key,state){
        if (state.identity) {
            let replacement = jptr(master,state.identityPath);
            // ensure it's still there and we've not reffed it away
            let newRef = state.identityPath;
            if (state.identityPath !== state.path) {
                if (options && options.prefix) newRef = newRef.replace('#/',options.prefix);
                if (replacement !== false) obj[key] = { $ref: newRef }
                else if (options && options.verbose) console.warn(state.identityPath,'gone away at',state.path);
            }
        }
    });
    return obj;
}

module.exports = {
    reref : reref
};

