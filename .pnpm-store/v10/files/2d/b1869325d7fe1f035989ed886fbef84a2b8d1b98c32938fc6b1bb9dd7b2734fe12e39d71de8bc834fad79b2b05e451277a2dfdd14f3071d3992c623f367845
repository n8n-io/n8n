'use strict';
var $ = require('../internals/export');
var FREEZING = require('../internals/freezing');
var NATIVE_RAW_JSON = require('../internals/native-raw-json');
var getBuiltIn = require('../internals/get-built-in');
var call = require('../internals/function-call');
var uncurryThis = require('../internals/function-uncurry-this');
var isCallable = require('../internals/is-callable');
var isRawJSON = require('../internals/is-raw-json');
var toString = require('../internals/to-string');
var createProperty = require('../internals/create-property');
var parseJSONString = require('../internals/parse-json-string');
var getReplacerFunction = require('../internals/get-json-replacer-function');
var uid = require('../internals/uid');
var setInternalState = require('../internals/internal-state').set;

var $String = String;
var $SyntaxError = SyntaxError;
var parse = getBuiltIn('JSON', 'parse');
var $stringify = getBuiltIn('JSON', 'stringify');
var create = getBuiltIn('Object', 'create');
var freeze = getBuiltIn('Object', 'freeze');
var at = uncurryThis(''.charAt);
var slice = uncurryThis(''.slice);
var exec = uncurryThis(/./.exec);
var push = uncurryThis([].push);

var MARK = uid();
var MARK_LENGTH = MARK.length;
var ERROR_MESSAGE = 'Unacceptable as raw JSON';
var IS_WHITESPACE = /^[\t\n\r ]$/;

// `JSON.parse` method
// https://tc39.es/proposal-json-parse-with-source/#sec-json.israwjson
// https://github.com/tc39/proposal-json-parse-with-source
$({ target: 'JSON', stat: true, forced: !NATIVE_RAW_JSON }, {
  rawJSON: function rawJSON(text) {
    var jsonString = toString(text);
    if (jsonString === '' || exec(IS_WHITESPACE, at(jsonString, 0)) || exec(IS_WHITESPACE, at(jsonString, jsonString.length - 1))) {
      throw $SyntaxError(ERROR_MESSAGE);
    }
    var parsed = parse(jsonString);
    if (typeof parsed == 'object' && parsed !== null) throw $SyntaxError(ERROR_MESSAGE);
    var obj = create(null);
    setInternalState(obj, { type: 'RawJSON' });
    createProperty(obj, 'rawJSON', jsonString);
    return FREEZING ? freeze(obj) : obj;
  }
});

// `JSON.stringify` method
// https://tc39.es/ecma262/#sec-json.stringify
// https://github.com/tc39/proposal-json-parse-with-source
if ($stringify) $({ target: 'JSON', stat: true, arity: 3, forced: !NATIVE_RAW_JSON }, {
  stringify: function stringify(text, replacer, space) {
    var replacerFunction = getReplacerFunction(replacer);
    var rawStrings = [];

    var json = $stringify(text, function (key, value) {
      // some old implementations (like WebKit) could pass numbers as keys
      var v = isCallable(replacerFunction) ? call(replacerFunction, this, $String(key), value) : value;
      return isRawJSON(v) ? MARK + (push(rawStrings, v.rawJSON) - 1) : v;
    }, space);

    if (typeof json != 'string') return json;

    var result = '';
    var length = json.length;

    for (var i = 0; i < length; i++) {
      var chr = at(json, i);
      if (chr === '"') {
        var end = parseJSONString(json, ++i).end - 1;
        var string = slice(json, i, end);
        result += slice(string, 0, MARK_LENGTH) === MARK
          ? rawStrings[slice(string, MARK_LENGTH)]
          : '"' + string + '"';
        i = end;
      } else result += chr;
    }

    return result;
  }
});
