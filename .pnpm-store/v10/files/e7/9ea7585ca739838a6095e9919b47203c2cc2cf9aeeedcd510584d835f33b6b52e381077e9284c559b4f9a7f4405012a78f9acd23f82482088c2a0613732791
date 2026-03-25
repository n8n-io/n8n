'use strict';

const sjs = require('fast-safe-stringify');

const colour = process.env.NODE_DISABLE_COLORS ?
    { red: '', yellow: '', green: '', normal: '' } :
    { red: '\x1b[31m', yellow: '\x1b[33;1m', green: '\x1b[32m', normal: '\x1b[0m' };

function uniqueOnly(value, index, self) {
    return self.indexOf(value) === index;
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}

function allSame(array) {
    return (new Set(array)).size <= 1;
}

function deepEquals(obj1, obj2) {
    function _equals(obj1, obj2) {
        return sjs.stringify(obj1) === sjs.stringify(Object.assign({}, obj1, obj2));
    }
    return _equals(obj1, obj2) && _equals(obj2, obj1);
}

function compressArray(arr) {
    let result = [];
    for (let candidate of arr) {
        let dupe = result.find(function(e,i,a){
            return deepEquals(e,candidate);
        });
        if (!dupe) result.push(candidate);
    }
    return result;
}

function distinctArray(arr) {
    return (arr.length === compressArray(arr).length);
}

function firstDupe(arr) {
    return arr.find(function(e,i,a){
        return arr.indexOf(e)<i;
    });
}

/**
 * simple hash implementation based on https://stackoverflow.com/a/7616484/1749888
 * @param {string} s - string to hash
 * @returns {number} numerical hash code
 */
function hash(s) {
    let hash = 0;
    let chr;
    if (s.length === 0) return hash;
    for (let i = 0; i < s.length; i++) {
      chr   = s.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

String.prototype.toCamelCase = function camelize() {
    return this.toLowerCase().replace(/[-_ \/\.](.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
}

const parameterTypeProperties = [
    'format',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'minLength',
    'maxLength',
    'multipleOf',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minProperties',
    'maxProperties',
    'additionalProperties',
    'pattern',
    'enum',
    'default'
];

const arrayProperties = [
    'items',
    'minItems',
    'maxItems',
    'uniqueItems'
];

const httpMethods = [
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'head',
    'options',
    'trace'
];

function sanitise(s) {
    s = s.replace('[]','Array');
    let components = s.split('/');
    components[0] = components[0].replace(/[^A-Za-z0-9_\-\.]+|\s+/gm, '_');
    return components.join('/');
}

function sanitiseAll(s) {
    return sanitise(s.split('/').join('_'));
}

module.exports = {

    colour: colour,
    uniqueOnly: uniqueOnly,
    hasDuplicates: hasDuplicates,
    allSame: allSame,
    distinctArray: distinctArray,
    firstDupe: firstDupe,
    hash: hash,
    parameterTypeProperties: parameterTypeProperties,
    arrayProperties: arrayProperties,
    httpMethods: httpMethods,
    sanitise: sanitise,
    sanitiseAll: sanitiseAll

};

