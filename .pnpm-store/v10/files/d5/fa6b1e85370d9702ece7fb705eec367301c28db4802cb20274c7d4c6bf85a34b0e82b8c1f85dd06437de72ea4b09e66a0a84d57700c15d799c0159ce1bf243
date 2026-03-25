'use strict';

const recurse = require('./recurse.js').recurse;
const jptr = require('./jptr.js').jptr;

/**
* Given an expanded object and an optional object to compare to (e.g. its $ref'd form), will call
* the following functions:
* * callbacks.before - lets you modify the initial starting state, must return it
* * callbacks.where - lets you select a subset of properties, return a truthy value
* * callbacks.filter - called for all selected properties, can mutate/remove (by setting to undefined)
* * callbacks.compare - allowing the objects to be compared by path (i.e. for $ref reinstating)
* * callbacks.identity - called on any object identity (previously seen) properties
* * callbacks.selected - called for all selected/unfiltered properties, does not mutate directly
* * callbacks.count - called at the end with the number of selected properties
* * callbacks.finally - called at the end of the traversal
* @param obj the object to visit
* @param comparison optional object to compare to
* @param callbacks object containing functions as above
* @return the possibly mutated object
*/
function visit(obj,comparison,callbacks) {
    let state = {identityDetection:true};
    let count = 0;
    if (callbacks.before) state = callbacks.before(obj,'',{});
    recurse(obj,state,function(obj,key,state){
        let selected = true;
        if (callbacks.where) {
            selected = callbacks.where(obj,key,state);
        }
        if (selected) {
            if (callbacks.filter) {
                obj[key] = callbacks.filter(obj,key,state);
                if (typeof obj[key] === 'undefined') {
                    delete obj[key]; // to be doubly sure
                }
            }
            if (typeof obj[key] !== 'undefined') {
                if (callbacks.compare && comparison) {
                    let equiv = jptr(comparison,state.path);
                    if (equiv) {
                        obj[key] = callbacks.compare(obj,key,state,equiv);
                    }
                }
                if (typeof obj[key] !== 'undefined' && state.identity && callbacks.identity) {
                    obj[key] = callbacks.identity(obj,key,state,state.identityPath);
                }
                if (typeof obj[key] !== 'undefined') {
                    if (callbacks.selected) {
                        callbacks.selected(obj,key,state);
                    }
                    count++;
                }
            }
        }
    });
    if (callbacks.count) callbacks.count(obj,'',state,count);
    if (callbacks.finally) callbacks.finally(obj,'',state);
    return obj;
}

module.exports = {
    visit : visit
};

