(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.OpenAPISampler = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],2:[function(require,module,exports){
'use strict';

var each = require('foreach');
module.exports = api;


/**
 * Convenience wrapper around the api.
 * Calls `.get` when called with an `object` and a `pointer`.
 * Calls `.set` when also called with `value`.
 * If only supplied `object`, returns a partially applied function, mapped to the object.
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @param value
 * @returns {*}
 */

function api (obj, pointer, value) {
    // .set()
    if (arguments.length === 3) {
        return api.set(obj, pointer, value);
    }
    // .get()
    if (arguments.length === 2) {
        return api.get(obj, pointer);
    }
    // Return a partially applied function on `obj`.
    var wrapped = api.bind(api, obj);

    // Support for oo style
    for (var name in api) {
        if (api.hasOwnProperty(name)) {
            wrapped[name] = api[name].bind(wrapped, obj);
        }
    }
    return wrapped;
}


/**
 * Lookup a json pointer in an object
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @returns {*}
 */
api.get = function get (obj, pointer) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer);

    for (var i = 0; i < refTokens.length; ++i) {
        var tok = refTokens[i];
        if (!(typeof obj == 'object' && tok in obj)) {
            throw new Error('Invalid reference token: ' + tok);
        }
        obj = obj[tok];
    }
    return obj;
};

/**
 * Sets a value on an object
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @param value
 */
api.set = function set (obj, pointer, value) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer),
      nextTok = refTokens[0];

    if (refTokens.length === 0) {
      throw Error('Can not set the root object');
    }

    for (var i = 0; i < refTokens.length - 1; ++i) {
        var tok = refTokens[i];
        if (typeof tok !== 'string' && typeof tok !== 'number') {
          tok = String(tok)
        }
        if (tok === "__proto__" || tok === "constructor" || tok === "prototype") {
            continue
        }
        if (tok === '-' && Array.isArray(obj)) {
          tok = obj.length;
        }
        nextTok = refTokens[i + 1];

        if (!(tok in obj)) {
            if (nextTok.match(/^(\d+|-)$/)) {
                obj[tok] = [];
            } else {
                obj[tok] = {};
            }
        }
        obj = obj[tok];
    }
    if (nextTok === '-' && Array.isArray(obj)) {
      nextTok = obj.length;
    }
    obj[nextTok] = value;
    return this;
};

/**
 * Removes an attribute
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 */
api.remove = function (obj, pointer) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer);
    var finalToken = refTokens[refTokens.length -1];
    if (finalToken === undefined) {
        throw new Error('Invalid JSON pointer for remove: "' + pointer + '"');
    }

    var parent = api.get(obj, refTokens.slice(0, -1));
    if (Array.isArray(parent)) {
      var index = +finalToken;
      if (finalToken === '' && isNaN(index)) {
        throw new Error('Invalid array index: "' + finalToken + '"');
      }

      Array.prototype.splice.call(parent, index, 1);
    } else {
      delete parent[finalToken];
    }
};

/**
 * Returns a (pointer -> value) dictionary for an object
 *
 * @param obj
 * @param {function} descend
 * @returns {}
 */
api.dict = function dict (obj, descend) {
    var results = {};
    api.walk(obj, function (value, pointer) {
        results[pointer] = value;
    }, descend);
    return results;
};

/**
 * Iterates over an object
 * Iterator: function (value, pointer) {}
 *
 * @param obj
 * @param {function} iterator
 * @param {function} descend
 */
api.walk = function walk (obj, iterator, descend) {
    var refTokens = [];

    descend = descend || function (value) {
        var type = Object.prototype.toString.call(value);
        return type === '[object Object]' || type === '[object Array]';
    };

    (function next (cur) {
        each(cur, function (value, key) {
            refTokens.push(String(key));
            if (descend(value)) {
                next(value);
            } else {
                iterator(value, api.compile(refTokens));
            }
            refTokens.pop();
        });
    }(obj));
};

/**
 * Tests if an object has a value for a json pointer
 *
 * @param obj
 * @param pointer
 * @returns {boolean}
 */
api.has = function has (obj, pointer) {
    try {
        api.get(obj, pointer);
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * Escapes a reference token
 *
 * @param str
 * @returns {string}
 */
api.escape = function escape (str) {
    return str.toString().replace(/~/g, '~0').replace(/\//g, '~1');
};

/**
 * Unescapes a reference token
 *
 * @param str
 * @returns {string}
 */
api.unescape = function unescape (str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~');
};

/**
 * Converts a json pointer into a array of reference tokens
 *
 * @param pointer
 * @returns {Array}
 */
api.parse = function parse (pointer) {
    if (pointer === '') { return []; }
    if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer: ' + pointer); }
    return pointer.substring(1).split(/\//).map(api.unescape);
};

/**
 * Builds a json pointer from a array of reference tokens
 *
 * @param refTokens
 * @returns {string}
 */
api.compile = function compile (refTokens) {
    if (refTokens.length === 0) { return ''; }
    return '/' + refTokens.map(api.escape).join('/');
};

},{"foreach":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.allOfSample = allOfSample;
var _traverse = require("./traverse");
var _utils = require("./utils");
function allOfSample(into, children, options, spec, context) {
  let res = (0, _traverse.traverse)(into, options, spec);
  const subSamples = [];
  for (let subSchema of children) {
    const {
      type,
      readOnly,
      writeOnly,
      value
    } = (0, _traverse.traverse)({
      type: res.type,
      ...subSchema
    }, options, spec, context);
    if (res.type && type && type !== res.type) {
      console.warn('allOf: schemas with different types can\'t be merged');
      res.type = type;
    }
    res.type = res.type || type;
    res.readOnly = res.readOnly || readOnly;
    res.writeOnly = res.writeOnly || writeOnly;
    if (value != null) subSamples.push(value);
  }
  if (res.type === 'object') {
    res.value = (0, _utils.mergeDeep)(res.value || {}, ...subSamples.filter(sample => typeof sample === 'object'));
    return res;
  } else {
    if (res.type === 'array') {
      // TODO: implement arrays
      if (!options.quiet) console.warn('OpenAPI Sampler: found allOf with "array" type. Result may be incorrect');
    }
    const lastSample = subSamples[subSamples.length - 1];
    res.value = lastSample != null ? lastSample : res.value;
    return res;
  }
}

},{"./traverse":13,"./utils":14}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inferType = inferType;
const schemaKeywordTypes = {
  multipleOf: 'number',
  maximum: 'number',
  exclusiveMaximum: 'number',
  minimum: 'number',
  exclusiveMinimum: 'number',
  maxLength: 'string',
  minLength: 'string',
  pattern: 'string',
  items: 'array',
  maxItems: 'array',
  minItems: 'array',
  uniqueItems: 'array',
  additionalItems: 'array',
  maxProperties: 'object',
  minProperties: 'object',
  required: 'object',
  additionalProperties: 'object',
  properties: 'object',
  patternProperties: 'object',
  dependencies: 'object'
};
function inferType(schema) {
  if (schema.type !== undefined) {
    return Array.isArray(schema.type) ? schema.type.length === 0 ? null : schema.type[0] : schema.type;
  }
  const keywords = Object.keys(schemaKeywordTypes);
  for (var i = 0; i < keywords.length; i++) {
    let keyword = keywords[i];
    let type = schemaKeywordTypes[keyword];
    if (schema[keyword] !== undefined) {
      return type;
    }
  }
  return null;
}

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sample = sample;
exports._registerSampler = _registerSampler;
Object.defineProperty(exports, "inferType", {
  enumerable: true,
  get: function () {
    return _infer.inferType;
  }
});
exports._samplers = void 0;
var _traverse = require("./traverse");
var _index = require("./samplers/index");
var _infer = require("./infer");
var _samplers = {};
exports._samplers = _samplers;
const defaults = {
  skipReadOnly: false,
  maxSampleDepth: 15
};
function sample(schema, options, spec) {
  let opts = Object.assign({}, defaults, options);
  (0, _traverse.clearCache)();
  return (0, _traverse.traverse)(schema, opts, spec).value;
}
;
function _registerSampler(type, sampler) {
  _samplers[type] = sampler;
}
;
_registerSampler('array', _index.sampleArray);
_registerSampler('boolean', _index.sampleBoolean);
_registerSampler('integer', _index.sampleNumber);
_registerSampler('number', _index.sampleNumber);
_registerSampler('object', _index.sampleObject);
_registerSampler('string', _index.sampleString);

},{"./infer":4,"./samplers/index":8,"./traverse":13}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleArray = sampleArray;
var _traverse = require("../traverse");
function sampleArray(schema, options = {}, spec, context) {
  const depth = context && context.depth || 1;
  let arrayLength = Math.min(schema.maxItems != undefined ? schema.maxItems : Infinity, schema.minItems || 1);
  // for the sake of simplicity, we're treating `contains` in a similar way to `items`
  const items = schema.prefixItems || schema.items || schema.contains;
  if (Array.isArray(items)) {
    arrayLength = Math.max(arrayLength, items.length);
  }
  let itemSchemaGetter = itemNumber => {
    if (Array.isArray(items)) {
      return items[itemNumber] || {};
    }
    return items || {};
  };
  let res = [];
  if (!items) return res;
  for (let i = 0; i < arrayLength; i++) {
    let itemSchema = itemSchemaGetter(i);
    let {
      value: sample
    } = (0, _traverse.traverse)(itemSchema, options, spec, {
      depth: depth + 1
    });
    res.push(sample);
  }
  return res;
}

},{"../traverse":13}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleBoolean = sampleBoolean;
function sampleBoolean(schema) {
  return true; // let be optimistic :)
}

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "sampleArray", {
  enumerable: true,
  get: function () {
    return _array.sampleArray;
  }
});
Object.defineProperty(exports, "sampleBoolean", {
  enumerable: true,
  get: function () {
    return _boolean.sampleBoolean;
  }
});
Object.defineProperty(exports, "sampleNumber", {
  enumerable: true,
  get: function () {
    return _number.sampleNumber;
  }
});
Object.defineProperty(exports, "sampleObject", {
  enumerable: true,
  get: function () {
    return _object.sampleObject;
  }
});
Object.defineProperty(exports, "sampleString", {
  enumerable: true,
  get: function () {
    return _string.sampleString;
  }
});
var _array = require("./array");
var _boolean = require("./boolean");
var _number = require("./number");
var _object = require("./object");
var _string = require("./string");

},{"./array":6,"./boolean":7,"./number":9,"./object":10,"./string":12}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleNumber = sampleNumber;
function sampleNumber(schema) {
  let res = 0;
  if (schema.type === 'number' && (schema.format === 'float' || schema.format === 'double')) {
    res = 0.1;
  }
  if (typeof schema.exclusiveMinimum === 'boolean' || typeof schema.exclusiveMaximum === 'boolean') {
    //legacy support for jsonschema draft 4 of exclusiveMaximum/exclusiveMinimum as booleans
    if (schema.maximum && schema.minimum) {
      res = schema.exclusiveMinimum ? Math.floor(schema.minimum) + 1 : schema.minimum;
      if (schema.exclusiveMaximum && res >= schema.maximum || !schema.exclusiveMaximum && res > schema.maximum) {
        res = (schema.maximum + schema.minimum) / 2;
      }
      return res;
    }
    if (schema.minimum) {
      if (schema.exclusiveMinimum) {
        return Math.floor(schema.minimum) + 1;
      } else {
        return schema.minimum;
      }
    }
    if (schema.maximum) {
      if (schema.exclusiveMaximum) {
        return schema.maximum > 0 ? 0 : Math.floor(schema.maximum) - 1;
      } else {
        return schema.maximum > 0 ? 0 : schema.maximum;
      }
    }
  } else {
    if (schema.minimum) {
      return schema.minimum;
    }
    if (schema.exclusiveMinimum) {
      res = Math.floor(schema.exclusiveMinimum) + 1;
      if (res === schema.exclusiveMaximum) {
        res = (res + Math.floor(schema.exclusiveMaximum) - 1) / 2;
      }
    } else if (schema.exclusiveMaximum) {
      res = Math.floor(schema.exclusiveMaximum) - 1;
    } else if (schema.maximum) {
      res = schema.maximum;
    }
  }
  return res;
}

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleObject = sampleObject;
var _traverse = require("../traverse");
function sampleObject(schema, options = {}, spec, context) {
  let res = {};
  const depth = context && context.depth || 1;
  if (schema && typeof schema.properties === 'object') {
    // Prepare for skipNonRequired option
    const requiredProperties = Array.isArray(schema.required) ? schema.required : [];
    const requiredPropertiesMap = {};
    for (const requiredProperty of requiredProperties) {
      requiredPropertiesMap[requiredProperty] = true;
    }
    Object.keys(schema.properties).forEach(propertyName => {
      // skip before traverse that could be costly
      if (options.skipNonRequired && !requiredPropertiesMap.hasOwnProperty(propertyName)) {
        return;
      }
      const sample = (0, _traverse.traverse)(schema.properties[propertyName], options, spec, {
        propertyName,
        depth: depth + 1
      });
      if (options.skipReadOnly && sample.readOnly) {
        return;
      }
      if (options.skipWriteOnly && sample.writeOnly) {
        return;
      }
      res[propertyName] = sample.value;
    });
  }
  if (schema && typeof schema.additionalProperties === 'object') {
    const propertyName = schema.additionalProperties['x-additionalPropertiesName'] || 'property';
    res[`${String(propertyName)}1`] = (0, _traverse.traverse)(schema.additionalProperties, options, spec, {
      depth: depth + 1
    }).value;
    res[`${String(propertyName)}2`] = (0, _traverse.traverse)(schema.additionalProperties, options, spec, {
      depth: depth + 1
    }).value;
  }

  // Strictly enforce maxProperties constraint
  if (schema && typeof schema.properties === 'object' && schema.maxProperties !== undefined && Object.keys(res).length > schema.maxProperties) {
    const filteredResult = {};
    let propertiesAdded = 0;

    // Always include required properties first, if present
    const requiredProperties = Array.isArray(schema.required) ? schema.required : [];
    requiredProperties.forEach(propName => {
      if (res[propName] !== undefined) {
        filteredResult[propName] = res[propName];
        propertiesAdded++;
      }
    });

    // Add other properties until maxProperties is reached
    Object.keys(res).forEach(propName => {
      if (propertiesAdded < schema.maxProperties && !filteredResult.hasOwnProperty(propName)) {
        filteredResult[propName] = res[propName];
        propertiesAdded++;
      }
    });
    res = filteredResult;
  }
  return res;
}

},{"../traverse":13}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.regexSample = regexSample;
/**
Faker - Copyright (c) 2022-2023

This software consists of voluntary contributions made by many individuals.
For exact contribution history, see the revision history
available at https://github.com/faker-js/faker

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

===

From: https://github.com/faker-js/faker/commit/a9f98046c7d5eeaabe12fc587024c06d683800b8
To: https://github.com/faker-js/faker/commit/29234378807c4141588861f69421bf20b5ac635e

Based on faker.js, copyright Marak Squires and contributor, what follows below is the original license.

===

faker.js - Copyright (c) 2020
Marak Squires
http://github.com/marak/faker.js/

faker.js was inspired by and has used data definitions from:

 * https://github.com/stympy/faker/ - Copyright (c) 2007-2010 Benjamin Curtis
 * http://search.cpan.org/~jasonk/Data-Faker-0.07/ - Copyright 2004-2005 by Jason Kohles

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** @returns {boolean} */
function boolSample() {
  return true;
}

/**
 * @param {number} min - inclusive
 * @param {number} _max - inclusive
 * @returns {number}
 */
function intSample(min, _max) {
  return min;
}

/**
 * Returns a number based on given RegEx-based quantifier symbol or quantifier values.
 *
 * @param {string} quantifierSymbol Quantifier symbols can be either of these: `?`, `*`, `+`.
 * @param {string} quantifierMin Quantifier minimum value. If given without a maximum, this will be used as the quantifier value.
 * @param {string} quantifierMax Quantifier maximum value. Will randomly get a value between the minimum and maximum if both are provided.
 *
 * @returns {number} a random number based on the given quantifier parameters.
 *
 * @example
 * getRepetitionsBasedOnQuantifierParameters('*', null, null) // 3
 * getRepetitionsBasedOnQuantifierParameters(null, 10, null) // 10
 * getRepetitionsBasedOnQuantifierParameters(null, 5, 8) // 6
 *
 * @since 8.0.0
 */
function getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax) {
  let repetitions = 1;
  if (quantifierSymbol) {
    switch (quantifierSymbol) {
      case '?':
        {
          repetitions = boolSample() ? 0 : 1;
          break;
        }
      case '*':
        {
          const limit = 8;
          repetitions = intSample(0, limit);
          break;
        }
      case '+':
        {
          const limit = 8;
          repetitions = intSample(1, limit);
          break;
        }
      default:
        throw new Error('Unknown quantifier symbol provided.');
    }
  } else if (quantifierMin != null && quantifierMax != null) {
    repetitions = intSample(parseInt(quantifierMin), parseInt(quantifierMax));
  } else if (quantifierMin != null && quantifierMax == null) {
    repetitions = parseInt(quantifierMin);
  }
  return repetitions;
}

/**
  * Generates a string matching the given regex like expressions.
  *
  * This function doesn't provide full support of actual `RegExp`.
  * Features such as grouping, anchors and character classes are not supported.
  * If you are looking for a library that randomly generates strings based on
  * `RegExp`s, see [randexp.js](https://github.com/fent/randexp.js)
  *
  * Supported patterns:
  * - `x{times}` => Repeat the `x` exactly `times` times.
  * - `x{min,max}` => Repeat the `x` `min` to `max` times.
  * - `[x-y]` => Randomly get a character between `x` and `y` (inclusive).
  * - `[x-y]{times}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `times` times.
  * - `[x-y]{min,max}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `min` to `max` times.
  * - `[^...]` => Randomly get an ASCII number or letter character that is not in the given range. (e.g. `[^0-9]` will get a random non-numeric character).
  * - `[-...]` => Include dashes in the range. Must be placed after the negate character `^` and before any character sets if used (e.g. `[^-0-9]` will not get any numeric characters or dashes).
  * - `/[x-y]/i` => Randomly gets an uppercase or lowercase character between `x` and `y` (inclusive).
  * - `x?` => Randomly decide to include or not include `x`.
  * - `[x-y]?` => Randomly decide to include or not include characters between `x` and `y` (inclusive).
  * - `x*` => Repeat `x` 0 or more times.
  * - `[x-y]*` => Repeat characters between `x` and `y` (inclusive) 0 or more times.
  * - `x+` => Repeat `x` 1 or more times.
  * - `[x-y]+` => Repeat characters between `x` and `y` (inclusive) 1 or more times.
  * - `.` => returns a wildcard ASCII character that can be any number, character or symbol. Can be combined with quantifiers as well.
  *
  * @param {string | RegExp} pattern The template string/RegExp to generate a matching string for.
  * @returns {string} A string matching the given pattern.
  *
  * @throws If min value is more than max value in quantifier. e.g. `#{10,5}`
  * @throws If invalid quantifier symbol is passed in.
  *
  * @example
  * regexSample('#{5}') // '#####'
  * regexSample('#{2,9}') // '#######'
  * regexSample('[1-7]') // '5'
  * regexSample('#{3}test[1-5]') // '###test3'
  * regexSample('[0-9a-dmno]') // '5'
  * regexSample('[^a-zA-Z0-8]') // '9'
  * regexSample('[a-d0-6]{2,8}') // 'a0dc45b0'
  * regexSample('[-a-z]{5}') // 'a-zab'
  * regexSample(/[A-Z0-9]{4}-[A-Z0-9]{4}/) // 'BS4G-485H'
  * regexSample(/[A-Z]{5}/i) // 'pDKfh'
  * regexSample(/.{5}/) // '14(#B'
  * regexSample(/Joh?n/) // 'Jon'
  * regexSample(/ABC*DE/) // 'ABDE'
  * regexSample(/bee+p/) // 'beeeeeeeep'
  *
  * @since 8.0.0
  */
function regexSample(pattern) {
  let isCaseInsensitive = false;
  if (pattern instanceof RegExp) {
    var _pattern$match;
    isCaseInsensitive = pattern.flags.includes('i');
    pattern = pattern.toString();
    pattern = ((_pattern$match = pattern.match(/\/(.+?)\//)) === null || _pattern$match === void 0 ? void 0 : _pattern$match[1]) ?? ''; // Remove frontslash from front and back of RegExp
  }
  let min;
  let max;
  let repetitions;

  // Deal with single wildcards
  const SINGLE_CHAR_REG = /([.A-Za-z0-9])(?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+))(?![^[]*]|[^{]*})/;
  let token = pattern.match(SINGLE_CHAR_REG);
  while (token != null) {
    const quantifierMin = token[2];
    const quantifierMax = token[3];
    const quantifierSymbol = token[4];
    repetitions = getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(SINGLE_CHAR_REG);
  }
  const SINGLE_RANGE_REG = /(\d-\d|\w-\w|\d|\w|[-!@#$&()`.+,/"])/;
  const RANGE_ALPHANUMEMRIC_REG = /\[(\^|)(-|)(.+?)\](?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+)|)/;
  // Deal with character classes with quantifiers `[a-z0-9]{min[, max]}`
  token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  while (token != null) {
    const isNegated = token[1] === '^';
    const includesDash = token[2] === '-';
    const quantifierMin = token[4];
    const quantifierMax = token[5];
    const quantifierSymbol = token[6];
    const rangeCodes = [];
    let ranges = token[3];
    let range = ranges.match(SINGLE_RANGE_REG);
    if (includesDash) {
      // 45 is the ascii code for '-'
      rangeCodes.push(45);
    }
    while (range != null) {
      if (range[0].indexOf('-') === -1) {
        // handle non-ranges
        if (isCaseInsensitive && isNaN(Number(range[0]))) {
          rangeCodes.push(range[0].toUpperCase().charCodeAt(0));
          rangeCodes.push(range[0].toLowerCase().charCodeAt(0));
        } else {
          rangeCodes.push(range[0].charCodeAt(0));
        }
      } else {
        // handle ranges
        const rangeMinMax = range[0].split('-').map(x => x.charCodeAt(0));
        min = rangeMinMax[0];
        max = rangeMinMax[1];
        // throw error if min larger than max
        if (min > max) {
          throw new Error('Character range provided is out of order.');
        }
        for (let i = min; i <= max; i++) {
          if (isCaseInsensitive && isNaN(Number(String.fromCharCode(i)))) {
            const ch = String.fromCharCode(i);
            rangeCodes.push(ch.toUpperCase().charCodeAt(0));
            rangeCodes.push(ch.toLowerCase().charCodeAt(0));
          } else {
            rangeCodes.push(i);
          }
        }
      }
      ranges = ranges.substring(range[0].length);
      range = ranges.match(SINGLE_RANGE_REG);
    }
    repetitions = getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax);
    if (isNegated) {
      let index = -1;
      // 0-9
      for (let i = 48; i <= 57; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }

      // A-Z
      for (let i = 65; i <= 90; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }

      // a-z
      for (let i = 97; i <= 122; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }
    }
    const generatedString = Array.from({
      length: repetitions
    }, () => String.fromCharCode(rangeCodes[intSample(0, rangeCodes.length - 1)])).join('');
    pattern = pattern.slice(0, token.index) + generatedString + pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  }
  const RANGE_REP_REG = /(.)\{(\d+)\,(\d+)\}/;
  // Deal with quantifier ranges `{min,max}`
  token = pattern.match(RANGE_REP_REG);
  while (token != null) {
    min = parseInt(token[2]);
    max = parseInt(token[3]);
    // throw error if min larger than max
    if (min > max) {
      throw new Error('Numbers out of order in {} quantifier.');
    }
    repetitions = intSample(min, max);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_REP_REG);
  }
  const REP_REG = /(.)\{(\d+)\}/;
  // Deal with repeat `{num}`
  token = pattern.match(REP_REG);
  while (token != null) {
    repetitions = parseInt(token[2]);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(REP_REG);
  }
  return pattern;
}

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleString = sampleString;
var _utils = require("../utils");
var faker = _interopRequireWildcard(require("./string-regex"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const passwordSymbols = 'qwerty!@#$%^123456';
function emailSample() {
  return 'user@example.com';
}
function idnEmailSample() {
  return 'пошта@укр.нет';
}
function passwordSample(min, max) {
  let res = 'pa$$word';
  if (min > res.length) {
    res += '_';
    res += (0, _utils.ensureMinLength)(passwordSymbols, min - res.length).substring(0, min - res.length);
  }
  return res;
}
function commonDateTimeSample({
  min,
  max,
  omitTime,
  omitDate
}) {
  let res = (0, _utils.toRFCDateTime)(new Date('2019-08-24T14:15:22.123Z'), omitTime, omitDate, false);
  if (res.length < min) {
    console.warn(`Using minLength = ${min} is incorrect with format "date-time"`);
  }
  if (max && res.length > max) {
    console.warn(`Using maxLength = ${max} is incorrect with format "date-time"`);
  }
  return res;
}
function dateTimeSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: false,
    omitDate: false
  });
}
function dateSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: true,
    omitDate: false
  });
}
function timeSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: false,
    omitDate: true
  }).slice(1);
}
function defaultSample(min, max, _propertyName, pattern, enablePatterns = false) {
  if (pattern && enablePatterns) {
    return faker.regexSample(pattern);
  }
  let res = (0, _utils.ensureMinLength)('string', min);
  if (max && res.length > max) {
    res = res.substring(0, max);
  }
  return res;
}
function ipv4Sample() {
  return '192.168.0.1';
}
function ipv6Sample() {
  return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
}
function hostnameSample() {
  return 'example.com';
}
function idnHostnameSample() {
  return 'приклад.укр';
}
function uriSample() {
  return 'http://example.com';
}
function uriReferenceSample() {
  return '../dictionary';
}
function uriTemplateSample() {
  return 'http://example.com/{endpoint}';
}
function iriSample() {
  return 'http://example.com/entity/1';
}
function iriReferenceSample() {
  return '/entity/1';
}
function uuidSample(_min, _max, propertyName) {
  return (0, _utils.uuid)(propertyName || 'id');
}
function jsonPointerSample() {
  return '/json/pointer';
}
function relativeJsonPointerSample() {
  return '1/relative/json/pointer';
}
function regexSample() {
  return '/regex/';
}
const stringFormats = {
  'email': emailSample,
  'idn-email': idnEmailSample,
  // https://tools.ietf.org/html/rfc6531#section-3.3
  'password': passwordSample,
  'date-time': dateTimeSample,
  'date': dateSample,
  'time': timeSample,
  // full-time in https://tools.ietf.org/html/rfc3339#section-5.6
  'ipv4': ipv4Sample,
  'ipv6': ipv6Sample,
  'hostname': hostnameSample,
  'idn-hostname': idnHostnameSample,
  // https://tools.ietf.org/html/rfc5890#section-2.3.2.3
  'iri': iriSample,
  // https://tools.ietf.org/html/rfc3987
  'iri-reference': iriReferenceSample,
  'uri': uriSample,
  'uri-reference': uriReferenceSample,
  // either a URI or relative-reference https://tools.ietf.org/html/rfc3986#section-4.1
  'uri-template': uriTemplateSample,
  'uuid': uuidSample,
  'default': defaultSample,
  'json-pointer': jsonPointerSample,
  'relative-json-pointer': relativeJsonPointerSample,
  // https://tools.ietf.org/html/draft-handrews-relative-json-pointer-01
  'regex': regexSample
};
function sampleString(schema, options, spec, context) {
  let format = schema.format || 'default';
  let sampler = stringFormats[format] || defaultSample;
  let propertyName = context && context.propertyName;
  return sampler(schema.minLength || 0, schema.maxLength, propertyName, schema.pattern, options === null || options === void 0 ? void 0 : options.enablePatterns);
}

},{"../utils":14,"./string-regex":11}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearCache = clearCache;
exports.traverse = traverse;
var _openapiSampler = require("./openapi-sampler");
var _allOf = require("./allOf");
var _infer = require("./infer");
var _utils = require("./utils");
var _jsonPointer = _interopRequireDefault(require("json-pointer"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
let $refCache = {};
// for circular JS references we use additional array and not object as we need to compare entire schemas and not strings
let seenSchemasStack = [];
function clearCache() {
  $refCache = {};
  seenSchemasStack = [];
}
function inferExample(schema) {
  let example;
  if (schema.const !== undefined) {
    example = schema.const;
  } else if (schema.examples !== undefined && schema.examples.length) {
    example = schema.examples[0];
  } else if (schema.enum !== undefined && schema.enum.length) {
    example = schema.enum[0];
  } else if (schema.default !== undefined) {
    example = schema.default;
  }
  return example;
}
function tryInferExample(schema) {
  const example = inferExample(schema);
  // case when we don't infer example from schema but take from `const`, `examples`, `default` or `enum` keywords
  if (example !== undefined) {
    return {
      value: example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: null
    };
  }
  return;
}
function traverse(schema, options, spec, context) {
  // checking circular JS references by checking context
  // because context is passed only when traversing through nested objects happens
  if (context) {
    if (seenSchemasStack.includes(schema)) return (0, _utils.getResultForCircular)((0, _infer.inferType)(schema));
    seenSchemasStack.push(schema);
  }
  if (context && context.depth > options.maxSampleDepth) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return (0, _utils.getResultForCircular)((0, _infer.inferType)(schema));
  }
  if (schema.$ref) {
    if (!spec) {
      throw new Error('Your schema contains $ref. You must provide full specification in the third parameter.');
    }
    let ref = decodeURIComponent(schema.$ref);
    if (ref.startsWith('#')) {
      ref = ref.substring(1);
    }
    const referenced = _jsonPointer.default.get(spec, ref);
    let result;
    if ($refCache[ref] !== true) {
      $refCache[ref] = true;
      result = traverse(referenced, options, spec, context);
      $refCache[ref] = false;
    } else {
      const referencedType = (0, _infer.inferType)(referenced);
      result = (0, _utils.getResultForCircular)(referencedType);
    }
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return result;
  }
  if (schema.example !== undefined) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return {
      value: schema.example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: schema.type
    };
  }
  if (schema.allOf !== undefined) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return tryInferExample(schema) || (0, _allOf.allOfSample)({
      ...schema,
      allOf: undefined
    }, schema.allOf, options, spec, context);
  }
  if (schema.oneOf && schema.oneOf.length) {
    if (schema.anyOf) {
      if (!options.quiet) console.warn('oneOf and anyOf are not supported on the same level. Skipping anyOf');
    }
    (0, _utils.popSchemaStack)(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstOneOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.oneOf[0]);
    return traverseOneOrAnyOf(schema, firstOneOf);
  }
  if (schema.anyOf && schema.anyOf.length) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstAnyOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.anyOf[0]);
    return traverseOneOrAnyOf(schema, firstAnyOf);
  }
  if (schema.if && schema.then) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    const {
      if: ifSchema,
      then,
      ...rest
    } = schema;
    return traverse((0, _utils.mergeDeep)(rest, ifSchema, then), options, spec, context);
  }
  let example = inferExample(schema);
  let type = null;
  if (example === undefined) {
    example = null;
    type = schema.type;
    if (Array.isArray(type) && schema.type.length > 0) {
      type = schema.type[0];
    }
    if (!type) {
      type = (0, _infer.inferType)(schema);
    }
    let sampler = _openapiSampler._samplers[type];
    if (sampler) {
      example = sampler(schema, options, spec, context);
    }
  }
  (0, _utils.popSchemaStack)(seenSchemasStack, context);
  return {
    value: example,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
    type: type
  };
  function traverseOneOrAnyOf(schema, selectedSubSchema) {
    const inferred = tryInferExample(schema);
    if (inferred !== undefined) {
      return inferred;
    }
    const localExample = traverse({
      ...schema,
      oneOf: undefined,
      anyOf: undefined
    }, options, spec, context);
    const subSchemaExample = traverse(selectedSubSchema, options, spec, context);
    if (typeof localExample.value === 'object' && typeof subSchemaExample.value === 'object') {
      const mergedExample = (0, _utils.mergeDeep)(localExample.value, subSchemaExample.value);
      return {
        ...subSchemaExample,
        value: mergedExample
      };
    }
    return subSchemaExample;
  }
}

},{"./allOf":3,"./infer":4,"./openapi-sampler":5,"./utils":14,"json-pointer":2}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toRFCDateTime = toRFCDateTime;
exports.ensureMinLength = ensureMinLength;
exports.mergeDeep = mergeDeep;
exports.uuid = uuid;
exports.getResultForCircular = getResultForCircular;
exports.popSchemaStack = popSchemaStack;
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}
function toRFCDateTime(date, omitTime, omitDate, milliseconds) {
  var res = omitDate ? '' : date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
  if (!omitTime) {
    res += 'T' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + (milliseconds ? '.' + (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) : '') + 'Z';
  }
  return res;
}
;
function ensureMinLength(sample, min) {
  if (min > sample.length) {
    return sample.repeat(Math.trunc(min / sample.length) + 1).substring(0, min);
  }
  return sample;
}
function mergeDeep(...objects) {
  const isObject = obj => obj && typeof obj === 'object';
  return objects.reduce((prev, obj) => {
    Object.keys(obj || {}).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];
      if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });
    return prev;
  }, Array.isArray(objects[objects.length - 1]) ? [] : {});
}

// deterministic UUID sampler

function uuid(str) {
  var hash = hashCode(str);
  var random = jsf32(hash, hash, hash, hash);
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    var r = random() * 16 % 16 | 0;
    return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
  });
  return uuid;
}
function getResultForCircular(type) {
  return {
    value: type === 'object' ? {} : type === 'array' ? [] : undefined
  };
}
function popSchemaStack(seenSchemasStack, context) {
  if (context) seenSchemasStack.pop();
}
function hashCode(str) {
  var hash = 0;
  if (str.length == 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
function jsf32(a, b, c, d) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    var t = a - (b << 27 | b >>> 5) | 0;
    a = b ^ (c << 17 | c >>> 15);
    b = c + d | 0;
    c = d + t | 0;
    d = a + t | 0;
    return (d >>> 0) / 4294967296;
  };
}

},{}]},{},[5])(5)
});
