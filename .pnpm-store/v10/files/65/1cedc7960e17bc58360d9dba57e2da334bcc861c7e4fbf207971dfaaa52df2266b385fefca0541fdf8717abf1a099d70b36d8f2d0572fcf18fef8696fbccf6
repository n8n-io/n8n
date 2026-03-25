'use strict';

const recurse = require('./recurse.js').recurse;

/**
* flattens an object into an array of properties
* @param obj the object to flatten
* @param callback a function which can mutate or filter the entries (by returning null)
* @return the flattened object as an array of properties
*/
function flatten(obj,callback) {
    let arr = [];
    let iDepth, oDepth = 0;
    let state = {identityDetection:true};
    recurse(obj,state,function(obj,key,state){
        let entry = {};
        entry.name = key;
        entry.value = obj[key];
        entry.path = state.path;
        entry.parent = obj;
        entry.key = key;
        if (callback) entry = callback(entry);
        if (entry) {
            if (state.depth > iDepth) {
                oDepth++;
            }
            else if (state.depth < iDepth) {
                oDepth--;
            }
            entry.depth = oDepth;
            iDepth = state.depth;
            arr.push(entry);
        }
    });
    return arr;
}

module.exports = {
    flatten : flatten
};

