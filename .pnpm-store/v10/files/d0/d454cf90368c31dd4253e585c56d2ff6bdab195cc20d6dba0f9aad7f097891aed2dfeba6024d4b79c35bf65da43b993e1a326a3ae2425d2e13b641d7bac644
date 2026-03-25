import { _ as _createForOfIteratorHelper, h as _slicedToArray, a as _typeof, b as _createClass, e as _defineProperty, c as _classCallCheck, d as defaultTagPrefix, n as defaultTags } from './PlainValue-b8036b75.js';
import { d as YAMLMap, g as resolveMap, Y as YAMLSeq, h as resolveSeq, j as resolveString, c as stringifyString, s as strOptions, S as Scalar, n as nullOptions, a as boolOptions, i as intOptions, k as stringifyNumber, N as Node, A as Alias, P as Pair } from './resolveSeq-492ab440.js';
import { b as binary, o as omap, p as pairs, s as set, i as intTime, f as floatTime, t as timestamp, a as warnOptionDeprecation } from './warnings-df54cb69.js';

function createMap(schema, obj, ctx) {
  var map = new YAMLMap(schema);

  if (obj instanceof Map) {
    var _iterator = _createForOfIteratorHelper(obj),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _step$value = _slicedToArray(_step.value, 2),
            key = _step$value[0],
            value = _step$value[1];

        map.items.push(schema.createPair(key, value, ctx));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (obj && _typeof(obj) === 'object') {
    for (var _i = 0, _Object$keys = Object.keys(obj); _i < _Object$keys.length; _i++) {
      var _key = _Object$keys[_i];
      map.items.push(schema.createPair(_key, obj[_key], ctx));
    }
  }

  if (typeof schema.sortMapEntries === 'function') {
    map.items.sort(schema.sortMapEntries);
  }

  return map;
}

var map = {
  createNode: createMap,
  default: true,
  nodeClass: YAMLMap,
  tag: 'tag:yaml.org,2002:map',
  resolve: resolveMap
};

function createSeq(schema, obj, ctx) {
  var seq = new YAMLSeq(schema);

  if (obj && obj[Symbol.iterator]) {
    var _iterator = _createForOfIteratorHelper(obj),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var it = _step.value;
        var v = schema.createNode(it, ctx.wrapScalars, null, ctx);
        seq.items.push(v);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  return seq;
}

var seq = {
  createNode: createSeq,
  default: true,
  nodeClass: YAMLSeq,
  tag: 'tag:yaml.org,2002:seq',
  resolve: resolveSeq
};

var string = {
  identify: function identify(value) {
    return typeof value === 'string';
  },
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: resolveString,
  stringify: function stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({
      actualString: true
    }, ctx);
    return stringifyString(item, ctx, onComment, onChompKeep);
  },
  options: strOptions
};

var failsafe = [map, seq, string];

/* global BigInt */

var intIdentify$2 = function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
};

var intResolve$1 = function intResolve(src, part, radix) {
  return intOptions.asBigInt ? BigInt(src) : parseInt(part, radix);
};

function intStringify$1(node, radix, prefix) {
  var value = node.value;
  if (intIdentify$2(value) && value >= 0) return prefix + value.toString(radix);
  return stringifyNumber(node);
}

var nullObj = {
  identify: function identify(value) {
    return value == null;
  },
  createNode: function createNode(schema, value, ctx) {
    return ctx.wrapScalars ? new Scalar(null) : null;
  },
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: function resolve() {
    return null;
  },
  options: nullOptions,
  stringify: function stringify() {
    return nullOptions.nullStr;
  }
};
var boolObj = {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: function resolve(str) {
    return str[0] === 't' || str[0] === 'T';
  },
  options: boolOptions,
  stringify: function stringify(_ref) {
    var value = _ref.value;
    return value ? boolOptions.trueStr : boolOptions.falseStr;
  }
};
var octObj = {
  identify: function identify(value) {
    return intIdentify$2(value) && value >= 0;
  },
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^0o([0-7]+)$/,
  resolve: function resolve(str, oct) {
    return intResolve$1(str, oct, 8);
  },
  options: intOptions,
  stringify: function stringify(node) {
    return intStringify$1(node, 8, '0o');
  }
};
var intObj = {
  identify: intIdentify$2,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return intResolve$1(str, str, 10);
  },
  options: intOptions,
  stringify: stringifyNumber
};
var hexObj = {
  identify: function identify(value) {
    return intIdentify$2(value) && value >= 0;
  },
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^0x([0-9a-fA-F]+)$/,
  resolve: function resolve(str, hex) {
    return intResolve$1(str, hex, 16);
  },
  options: intOptions,
  stringify: function stringify(node) {
    return intStringify$1(node, 16, '0x');
  }
};
var nanObj = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.inf|(\.nan))$/i,
  resolve: function resolve(str, nan) {
    return nan ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  },
  stringify: stringifyNumber
};
var expObj = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return parseFloat(str);
  },
  stringify: function stringify(_ref2) {
    var value = _ref2.value;
    return Number(value).toExponential();
  }
};
var floatObj = {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:\.([0-9]+)|[0-9]+\.([0-9]*))$/,
  resolve: function resolve(str, frac1, frac2) {
    var frac = frac1 || frac2;
    var node = new Scalar(parseFloat(str));
    if (frac && frac[frac.length - 1] === '0') node.minFractionDigits = frac.length;
    return node;
  },
  stringify: stringifyNumber
};
var core = failsafe.concat([nullObj, boolObj, octObj, intObj, hexObj, nanObj, expObj, floatObj]);

/* global BigInt */

var intIdentify$1 = function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
};

var stringifyJSON = function stringifyJSON(_ref) {
  var value = _ref.value;
  return JSON.stringify(value);
};

var json = [map, seq, {
  identify: function identify(value) {
    return typeof value === 'string';
  },
  default: true,
  tag: 'tag:yaml.org,2002:str',
  resolve: resolveString,
  stringify: stringifyJSON
}, {
  identify: function identify(value) {
    return value == null;
  },
  createNode: function createNode(schema, value, ctx) {
    return ctx.wrapScalars ? new Scalar(null) : null;
  },
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^null$/,
  resolve: function resolve() {
    return null;
  },
  stringify: stringifyJSON
}, {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^true|false$/,
  resolve: function resolve(str) {
    return str === 'true';
  },
  stringify: stringifyJSON
}, {
  identify: intIdentify$1,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^-?(?:0|[1-9][0-9]*)$/,
  resolve: function resolve(str) {
    return intOptions.asBigInt ? BigInt(str) : parseInt(str, 10);
  },
  stringify: function stringify(_ref2) {
    var value = _ref2.value;
    return intIdentify$1(value) ? value.toString() : JSON.stringify(value);
  }
}, {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
  resolve: function resolve(str) {
    return parseFloat(str);
  },
  stringify: stringifyJSON
}];

json.scalarFallback = function (str) {
  throw new SyntaxError("Unresolved plain scalar ".concat(JSON.stringify(str)));
};

/* global BigInt */

var boolStringify = function boolStringify(_ref) {
  var value = _ref.value;
  return value ? boolOptions.trueStr : boolOptions.falseStr;
};

var intIdentify = function intIdentify(value) {
  return typeof value === 'bigint' || Number.isInteger(value);
};

function intResolve(sign, src, radix) {
  var str = src.replace(/_/g, '');

  if (intOptions.asBigInt) {
    switch (radix) {
      case 2:
        str = "0b".concat(str);
        break;

      case 8:
        str = "0o".concat(str);
        break;

      case 16:
        str = "0x".concat(str);
        break;
    }

    var _n = BigInt(str);

    return sign === '-' ? BigInt(-1) * _n : _n;
  }

  var n = parseInt(str, radix);
  return sign === '-' ? -1 * n : n;
}

function intStringify(node, radix, prefix) {
  var value = node.value;

  if (intIdentify(value)) {
    var str = value.toString(radix);
    return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
  }

  return stringifyNumber(node);
}

var yaml11 = failsafe.concat([{
  identify: function identify(value) {
    return value == null;
  },
  createNode: function createNode(schema, value, ctx) {
    return ctx.wrapScalars ? new Scalar(null) : null;
  },
  default: true,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: function resolve() {
    return null;
  },
  options: nullOptions,
  stringify: function stringify() {
    return nullOptions.nullStr;
  }
}, {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: function resolve() {
    return true;
  },
  options: boolOptions,
  stringify: boolStringify
}, {
  identify: function identify(value) {
    return typeof value === 'boolean';
  },
  default: true,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/i,
  resolve: function resolve() {
    return false;
  },
  options: boolOptions,
  stringify: boolStringify
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'BIN',
  test: /^([-+]?)0b([0-1_]+)$/,
  resolve: function resolve(str, sign, bin) {
    return intResolve(sign, bin, 2);
  },
  stringify: function stringify(node) {
    return intStringify(node, 2, '0b');
  }
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'OCT',
  test: /^([-+]?)0([0-7_]+)$/,
  resolve: function resolve(str, sign, oct) {
    return intResolve(sign, oct, 8);
  },
  stringify: function stringify(node) {
    return intStringify(node, 8, '0');
  }
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  test: /^([-+]?)([0-9][0-9_]*)$/,
  resolve: function resolve(str, sign, abs) {
    return intResolve(sign, abs, 10);
  },
  stringify: stringifyNumber
}, {
  identify: intIdentify,
  default: true,
  tag: 'tag:yaml.org,2002:int',
  format: 'HEX',
  test: /^([-+]?)0x([0-9a-fA-F_]+)$/,
  resolve: function resolve(str, sign, hex) {
    return intResolve(sign, hex, 16);
  },
  stringify: function stringify(node) {
    return intStringify(node, 16, '0x');
  }
}, {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.inf|(\.nan))$/i,
  resolve: function resolve(str, nan) {
    return nan ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  },
  stringify: stringifyNumber
}, {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  format: 'EXP',
  test: /^[-+]?([0-9][0-9_]*)?(\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return parseFloat(str.replace(/_/g, ''));
  },
  stringify: function stringify(_ref2) {
    var value = _ref2.value;
    return Number(value).toExponential();
  }
}, {
  identify: function identify(value) {
    return typeof value === 'number';
  },
  default: true,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(?:[0-9][0-9_]*)?\.([0-9_]*)$/,
  resolve: function resolve(str, frac) {
    var node = new Scalar(parseFloat(str.replace(/_/g, '')));

    if (frac) {
      var f = frac.replace(/_/g, '');
      if (f[f.length - 1] === '0') node.minFractionDigits = f.length;
    }

    return node;
  },
  stringify: stringifyNumber
}], binary, omap, pairs, set, intTime, floatTime, timestamp);

var schemas = {
  core: core,
  failsafe: failsafe,
  json: json,
  yaml11: yaml11
};
var tags = {
  binary: binary,
  bool: boolObj,
  float: floatObj,
  floatExp: expObj,
  floatNaN: nanObj,
  floatTime: floatTime,
  int: intObj,
  intHex: hexObj,
  intOct: octObj,
  intTime: intTime,
  map: map,
  null: nullObj,
  omap: omap,
  pairs: pairs,
  seq: seq,
  set: set,
  timestamp: timestamp
};

function findTagObject(value, tagName, tags) {
  if (tagName) {
    var match = tags.filter(function (t) {
      return t.tag === tagName;
    });
    var tagObj = match.find(function (t) {
      return !t.format;
    }) || match[0];
    if (!tagObj) throw new Error("Tag ".concat(tagName, " not found"));
    return tagObj;
  } // TODO: deprecate/remove class check


  return tags.find(function (t) {
    return (t.identify && t.identify(value) || t.class && value instanceof t.class) && !t.format;
  });
}

function createNode(value, tagName, ctx) {
  if (value instanceof Node) return value;
  var defaultPrefix = ctx.defaultPrefix,
      onTagObj = ctx.onTagObj,
      prevObjects = ctx.prevObjects,
      schema = ctx.schema,
      wrapScalars = ctx.wrapScalars;
  if (tagName && tagName.startsWith('!!')) tagName = defaultPrefix + tagName.slice(2);
  var tagObj = findTagObject(value, tagName, schema.tags);

  if (!tagObj) {
    if (typeof value.toJSON === 'function') value = value.toJSON();
    if (!value || _typeof(value) !== 'object') return wrapScalars ? new Scalar(value) : value;
    tagObj = value instanceof Map ? map : value[Symbol.iterator] ? seq : map;
  }

  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  } // Detect duplicate references to the same object & use Alias nodes for all
  // after first. The `obj` wrapper allows for circular references to resolve.


  var obj = {
    value: undefined,
    node: undefined
  };

  if (value && _typeof(value) === 'object' && prevObjects) {
    var prev = prevObjects.get(value);

    if (prev) {
      var alias = new Alias(prev); // leaves source dirty; must be cleaned by caller

      ctx.aliasNodes.push(alias); // defined along with prevObjects

      return alias;
    }

    obj.value = value;
    prevObjects.set(value, obj);
  }

  obj.node = tagObj.createNode ? tagObj.createNode(ctx.schema, value, ctx) : wrapScalars ? new Scalar(value) : value;
  if (tagName && obj.node instanceof Node) obj.node.tag = tagName;
  return obj.node;
}

function getSchemaTags(schemas, knownTags, customTags, schemaId) {
  var tags = schemas[schemaId.replace(/\W/g, '')]; // 'yaml-1.1' -> 'yaml11'

  if (!tags) {
    var keys = Object.keys(schemas).map(function (key) {
      return JSON.stringify(key);
    }).join(', ');
    throw new Error("Unknown schema \"".concat(schemaId, "\"; use one of ").concat(keys));
  }

  if (Array.isArray(customTags)) {
    var _iterator = _createForOfIteratorHelper(customTags),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var tag = _step.value;
        tags = tags.concat(tag);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (typeof customTags === 'function') {
    tags = customTags(tags.slice());
  }

  for (var i = 0; i < tags.length; ++i) {
    var _tag = tags[i];

    if (typeof _tag === 'string') {
      var tagObj = knownTags[_tag];

      if (!tagObj) {
        var _keys = Object.keys(knownTags).map(function (key) {
          return JSON.stringify(key);
        }).join(', ');

        throw new Error("Unknown custom tag \"".concat(_tag, "\"; use one of ").concat(_keys));
      }

      tags[i] = tagObj;
    }
  }

  return tags;
}

var sortMapEntriesByKey = function sortMapEntriesByKey(a, b) {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

var Schema = /*#__PURE__*/function () {
  // TODO: remove in v2
  // TODO: remove in v2
  function Schema(_ref) {
    var customTags = _ref.customTags,
        merge = _ref.merge,
        schema = _ref.schema,
        sortMapEntries = _ref.sortMapEntries,
        deprecatedCustomTags = _ref.tags;

    _classCallCheck(this, Schema);

    this.merge = !!merge;
    this.name = schema;
    this.sortMapEntries = sortMapEntries === true ? sortMapEntriesByKey : sortMapEntries || null;
    if (!customTags && deprecatedCustomTags) warnOptionDeprecation('tags', 'customTags');
    this.tags = getSchemaTags(schemas, tags, customTags || deprecatedCustomTags, schema);
  }

  _createClass(Schema, [{
    key: "createNode",
    value: function createNode$1(value, wrapScalars, tagName, ctx) {
      var baseCtx = {
        defaultPrefix: Schema.defaultPrefix,
        schema: this,
        wrapScalars: wrapScalars
      };
      var createCtx = ctx ? Object.assign(ctx, baseCtx) : baseCtx;
      return createNode(value, tagName, createCtx);
    }
  }, {
    key: "createPair",
    value: function createPair(key, value, ctx) {
      if (!ctx) ctx = {
        wrapScalars: true
      };
      var k = this.createNode(key, ctx.wrapScalars, null, ctx);
      var v = this.createNode(value, ctx.wrapScalars, null, ctx);
      return new Pair(k, v);
    }
  }]);

  return Schema;
}();

_defineProperty(Schema, "defaultPrefix", defaultTagPrefix);

_defineProperty(Schema, "defaultTags", defaultTags);

export { Schema as S };
