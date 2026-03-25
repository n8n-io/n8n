'use strict';

const recurse = require('./recurse.js').recurse;

function findObj(container,obj) {
    if (container === obj) {
        return { found: true, path: '#/', parent: null };
    }
    let result = { found: false, path: null, parent: null };
    recurse(container,{},function(o,key,state){
        if ((o[key] === obj) && (!result.found)) {
            result = { found: true, path: state.path, parent: o };
        }
    });
    return result;
}

module.exports = {
    findObj: findObj
};

