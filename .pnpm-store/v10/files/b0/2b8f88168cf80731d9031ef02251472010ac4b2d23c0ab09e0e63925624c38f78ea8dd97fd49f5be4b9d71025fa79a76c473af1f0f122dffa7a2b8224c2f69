'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var t = _interopDefault(require('should-type'));
var shouldTypeAdaptors = require('should-type-adaptors');

function looksLikeANumber(n) {
  return !!n.match(/\d+/);
}

function keyCompare(a, b) {
  var aNum = looksLikeANumber(a);
  var bNum = looksLikeANumber(b);
  if (aNum && bNum) {
    return 1*a - 1*b;
  } else if (aNum && !bNum) {
    return -1;
  } else if (!aNum && bNum) {
    return 1;
  } else {
    return a.localeCompare(b);
  }
}

function genKeysFunc(f) {
  return function(value) {
    var k = f(value);
    k.sort(keyCompare);
    return k;
  };
}

function Formatter(opts) {
  opts = opts || {};

  this.seen = [];

  var keysFunc;
  if (typeof opts.keysFunc === 'function') {
    keysFunc = opts.keysFunc;
  } else if (opts.keys === false) {
    keysFunc = Object.getOwnPropertyNames;
  } else {
    keysFunc = Object.keys;
  }

  this.getKeys = genKeysFunc(keysFunc);

  this.maxLineLength = typeof opts.maxLineLength === 'number' ? opts.maxLineLength : 60;
  this.propSep = opts.propSep || ',';

  this.isUTCdate = !!opts.isUTCdate;
}



Formatter.prototype = {
  constructor: Formatter,

  format: function(value) {
    var tp = t(value);

    if (this.alreadySeen(value)) {
      return '[Circular]';
    }

    var tries = tp.toTryTypes();
    var f = this.defaultFormat;
    while (tries.length) {
      var toTry = tries.shift();
      var name = Formatter.formatterFunctionName(toTry);
      if (this[name]) {
        f = this[name];
        break;
      }
    }
    return f.call(this, value).trim();
  },

  defaultFormat: function(obj) {
    return String(obj);
  },

  alreadySeen: function(value) {
    return this.seen.indexOf(value) >= 0;
  }

};

Formatter.addType = function addType(tp, f) {
  Formatter.prototype[Formatter.formatterFunctionName(tp)] = f;
};

Formatter.formatterFunctionName = function formatterFunctionName(tp) {
  return '_format_' + tp.toString('_');
};

var EOL = '\n';

function indent(v, indentation) {
  return v
    .split(EOL)
    .map(function(vv) {
      return indentation + vv;
    })
    .join(EOL);
}

function pad(str, value, filler) {
  str = String(str);
  var isRight = false;

  if (value < 0) {
    isRight = true;
    value = -value;
  }

  if (str.length < value) {
    var padding = new Array(value - str.length + 1).join(filler);
    return isRight ? str + padding : padding + str;
  } else {
    return str;
  }
}

function pad0(str, value) {
  return pad(str, value, '0');
}

var functionNameRE = /^\s*function\s*(\S*)\s*\(/;

function functionName(f) {
  if (f.name) {
    return f.name;
  }
  var matches = f.toString().match(functionNameRE);
  if (matches === null) {
    // `functionNameRE` doesn't match arrow functions.
    return '';
  }
  var name = matches[1];
  return name;
}

function constructorName(obj) {
  while (obj) {
    var descriptor = Object.getOwnPropertyDescriptor(obj, 'constructor');
    if (descriptor !== undefined &&  typeof descriptor.value === 'function') {
      var name = functionName(descriptor.value);
      if (name !== '') {
        return name;
      }
    }

    obj = Object.getPrototypeOf(obj);
  }
}

var INDENT = '  ';

function addSpaces(str) {
  return indent(str, INDENT);
}

function typeAdaptorForEachFormat(obj, opts) {
  opts = opts || {};
  var filterKey = opts.filterKey || function() { return true; };

  var formatKey = opts.formatKey || this.format;
  var formatValue = opts.formatValue || this.format;

  var keyValueSep = typeof opts.keyValueSep !== 'undefined' ? opts.keyValueSep : ': ';

  this.seen.push(obj);

  var formatLength = 0;
  var pairs = [];

  shouldTypeAdaptors.forEach(obj, function(value, key) {
    if (!filterKey(key)) {
      return;
    }

    var formattedKey = formatKey.call(this, key);
    var formattedValue = formatValue.call(this, value, key);

    var pair = formattedKey ? (formattedKey + keyValueSep + formattedValue) : formattedValue;

    formatLength += pair.length;
    pairs.push(pair);
  }, this);

  this.seen.pop();

  (opts.additionalKeys || []).forEach(function(keyValue) {
    var pair = keyValue[0] + keyValueSep + this.format(keyValue[1]);
    formatLength += pair.length;
    pairs.push(pair);
  }, this);

  var prefix = opts.prefix || constructorName(obj) || '';
  if (prefix.length > 0) {
    prefix += ' ';
  }

  var lbracket, rbracket;
  if (Array.isArray(opts.brackets)) {
    lbracket = opts.brackets[0];
    rbracket = opts.brackets[1];
  } else {
    lbracket = '{';
    rbracket = '}';
  }

  var rootValue = opts.value || '';

  if (pairs.length === 0) {
    return rootValue || (prefix + lbracket + rbracket);
  }

  if (formatLength <= this.maxLineLength) {
    return prefix + lbracket + ' ' + (rootValue ? rootValue + ' ' : '') + pairs.join(this.propSep + ' ') + ' ' + rbracket;
  } else {
    return prefix + lbracket + '\n' + (rootValue ? '  ' + rootValue + '\n' : '') + pairs.map(addSpaces).join(this.propSep + '\n') + '\n' + rbracket;
  }
}

function formatPlainObjectKey(key) {
  return typeof key === 'string' && key.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) ? key : this.format(key);
}

function getPropertyDescriptor(obj, key) {
  var desc;
  try {
    desc = Object.getOwnPropertyDescriptor(obj, key) || { value: obj[key] };
  } catch (e) {
    desc = { value: e };
  }
  return desc;
}

function formatPlainObjectValue(obj, key) {
  var desc = getPropertyDescriptor(obj, key);
  if (desc.get && desc.set) {
    return '[Getter/Setter]';
  }
  if (desc.get) {
    return '[Getter]';
  }
  if (desc.set) {
    return '[Setter]';
  }

  return this.format(desc.value);
}

function formatPlainObject(obj, opts) {
  opts = opts || {};
  opts.keyValueSep = ': ';
  opts.formatKey = opts.formatKey || formatPlainObjectKey;
  opts.formatValue = opts.formatValue || function(value, key) {
    return formatPlainObjectValue.call(this, obj, key);
  };
  return typeAdaptorForEachFormat.call(this, obj, opts);
}

function formatWrapper1(value) {
  return formatPlainObject.call(this, value, {
    additionalKeys: [['[[PrimitiveValue]]', value.valueOf()]]
  });
}


function formatWrapper2(value) {
  var realValue = value.valueOf();

  return formatPlainObject.call(this, value, {
    filterKey: function(key) {
      //skip useless indexed properties
      return !(key.match(/\d+/) && parseInt(key, 10) < realValue.length);
    },
    additionalKeys: [['[[PrimitiveValue]]', realValue]]
  });
}

function formatRegExp(value) {
  return formatPlainObject.call(this, value, {
    value: String(value)
  });
}

function formatFunction(value) {
  return formatPlainObject.call(this, value, {
    prefix: 'Function',
    additionalKeys: [['name', functionName(value)]]
  });
}

function formatArray(value) {
  return formatPlainObject.call(this, value, {
    formatKey: function(key) {
      if (!key.match(/\d+/)) {
        return formatPlainObjectKey.call(this, key);
      }
    },
    brackets: ['[', ']']
  });
}

function formatArguments(value) {
  return formatPlainObject.call(this, value, {
    formatKey: function(key) {
      if (!key.match(/\d+/)) {
        return formatPlainObjectKey.call(this, key);
      }
    },
    brackets: ['[', ']'],
    prefix: 'Arguments'
  });
}

function _formatDate(value, isUTC) {
  var prefix = isUTC ? 'UTC' : '';

  var date = value['get' + prefix + 'FullYear']() +
    '-' +
    pad0(value['get' + prefix + 'Month']() + 1, 2) +
    '-' +
    pad0(value['get' + prefix + 'Date'](), 2);

  var time = pad0(value['get' + prefix + 'Hours'](), 2) +
    ':' +
    pad0(value['get' + prefix + 'Minutes'](), 2) +
    ':' +
    pad0(value['get' + prefix + 'Seconds'](), 2) +
    '.' +
    pad0(value['get' + prefix + 'Milliseconds'](), 3);

  var to = value.getTimezoneOffset();
  var absTo = Math.abs(to);
  var hours = Math.floor(absTo / 60);
  var minutes = absTo - hours * 60;
  var tzFormat = (to < 0 ? '+' : '-') + pad0(hours, 2) + pad0(minutes, 2);

  return date + ' ' + time + (isUTC ? '' : ' ' + tzFormat);
}

function formatDate(value) {
  return formatPlainObject.call(this, value, { value: _formatDate(value, this.isUTCdate) });
}

function formatError(value) {
  return formatPlainObject.call(this, value, {
    prefix: value.name,
    additionalKeys: [['message', value.message]]
  });
}

function generateFormatForNumberArray(lengthProp, name, padding) {
  return function(value) {
    var max = this.byteArrayMaxLength || 50;
    var length = value[lengthProp];
    var formattedValues = [];
    var len = 0;
    for (var i = 0; i < max && i < length; i++) {
      var b = value[i] || 0;
      var v = pad0(b.toString(16), padding);
      len += v.length;
      formattedValues.push(v);
    }
    var prefix = value.constructor.name || name || '';
    if (prefix) {
      prefix += ' ';
    }

    if (formattedValues.length === 0) {
      return prefix + '[]';
    }

    if (len <= this.maxLineLength) {
      return prefix + '[ ' + formattedValues.join(this.propSep + ' ') + ' ' + ']';
    } else {
      return prefix + '[\n' + formattedValues.map(addSpaces).join(this.propSep + '\n') + '\n' + ']';
    }
  };
}

function formatMap(obj) {
  return typeAdaptorForEachFormat.call(this, obj, {
    keyValueSep: ' => '
  });
}

function formatSet(obj) {
  return typeAdaptorForEachFormat.call(this, obj, {
    keyValueSep: '',
    formatKey: function() { return ''; }
  });
}

function genSimdVectorFormat(constructorName, length) {
  return function(value) {
    var Constructor = value.constructor;
    var extractLane = Constructor.extractLane;

    var len = 0;
    var props = [];

    for (var i = 0; i < length; i ++) {
      var key = this.format(extractLane(value, i));
      len += key.length;
      props.push(key);
    }

    if (len <= this.maxLineLength) {
      return constructorName + ' [ ' + props.join(this.propSep + ' ') + ' ]';
    } else {
      return constructorName + ' [\n' + props.map(addSpaces).join(this.propSep + '\n') + '\n' + ']';
    }
  };
}

function defaultFormat(value, opts) {
  return new Formatter(opts).format(value);
}

defaultFormat.Formatter = Formatter;
defaultFormat.addSpaces = addSpaces;
defaultFormat.pad0 = pad0;
defaultFormat.functionName = functionName;
defaultFormat.constructorName = constructorName;
defaultFormat.formatPlainObjectKey = formatPlainObjectKey;
defaultFormat.formatPlainObject = formatPlainObject;
defaultFormat.typeAdaptorForEachFormat = typeAdaptorForEachFormat;
// adding primitive types
Formatter.addType(new t.Type(t.UNDEFINED), function() {
  return 'undefined';
});
Formatter.addType(new t.Type(t.NULL), function() {
  return 'null';
});
Formatter.addType(new t.Type(t.BOOLEAN), function(value) {
  return value ? 'true': 'false';
});
Formatter.addType(new t.Type(t.SYMBOL), function(value) {
  return value.toString();
});
Formatter.addType(new t.Type(t.NUMBER), function(value) {
  if (value === 0 && 1 / value < 0) {
    return '-0';
  }
  return String(value);
});

Formatter.addType(new t.Type(t.STRING), function(value) {
  return '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
      .replace(/'/g, "\\'")
      .replace(/\\"/g, '"') + '\'';
});

Formatter.addType(new t.Type(t.FUNCTION), formatFunction);

// plain object
Formatter.addType(new t.Type(t.OBJECT), formatPlainObject);

// type wrappers
Formatter.addType(new t.Type(t.OBJECT, t.NUMBER), formatWrapper1);
Formatter.addType(new t.Type(t.OBJECT, t.BOOLEAN), formatWrapper1);
Formatter.addType(new t.Type(t.OBJECT, t.STRING), formatWrapper2);

Formatter.addType(new t.Type(t.OBJECT, t.REGEXP), formatRegExp);
Formatter.addType(new t.Type(t.OBJECT, t.ARRAY), formatArray);
Formatter.addType(new t.Type(t.OBJECT, t.ARGUMENTS), formatArguments);
Formatter.addType(new t.Type(t.OBJECT, t.DATE), formatDate);
Formatter.addType(new t.Type(t.OBJECT, t.ERROR), formatError);
Formatter.addType(new t.Type(t.OBJECT, t.SET), formatSet);
Formatter.addType(new t.Type(t.OBJECT, t.MAP), formatMap);
Formatter.addType(new t.Type(t.OBJECT, t.WEAK_MAP), formatMap);
Formatter.addType(new t.Type(t.OBJECT, t.WEAK_SET), formatSet);

Formatter.addType(new t.Type(t.OBJECT, t.BUFFER), generateFormatForNumberArray('length', 'Buffer', 2));

Formatter.addType(new t.Type(t.OBJECT, t.ARRAY_BUFFER), generateFormatForNumberArray('byteLength', 'ArrayBuffer', 2));

Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'int8'), generateFormatForNumberArray('length', 'Int8Array', 2));
Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'uint8'), generateFormatForNumberArray('length', 'Uint8Array', 2));
Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'uint8clamped'), generateFormatForNumberArray('length', 'Uint8ClampedArray', 2));

Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'int16'), generateFormatForNumberArray('length', 'Int16Array', 4));
Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'uint16'), generateFormatForNumberArray('length', 'Uint16Array', 4));

Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'int32'), generateFormatForNumberArray('length', 'Int32Array', 8));
Formatter.addType(new t.Type(t.OBJECT, t.TYPED_ARRAY, 'uint32'), generateFormatForNumberArray('length', 'Uint32Array', 8));

Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'bool16x8'), genSimdVectorFormat('Bool16x8', 8));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'bool32x4'), genSimdVectorFormat('Bool32x4', 4));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'bool8x16'), genSimdVectorFormat('Bool8x16', 16));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'float32x4'), genSimdVectorFormat('Float32x4', 4));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'int16x8'), genSimdVectorFormat('Int16x8', 8));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'int32x4'), genSimdVectorFormat('Int32x4', 4));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'int8x16'), genSimdVectorFormat('Int8x16', 16));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'uint16x8'), genSimdVectorFormat('Uint16x8', 8));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'uint32x4'), genSimdVectorFormat('Uint32x4', 4));
Formatter.addType(new t.Type(t.OBJECT, t.SIMD, 'uint8x16'), genSimdVectorFormat('Uint8x16', 16));


Formatter.addType(new t.Type(t.OBJECT, t.PROMISE), function() {
  return '[Promise]';//TODO it could be nice to inspect its state and value
});

Formatter.addType(new t.Type(t.OBJECT, t.XHR), function() {
  return '[XMLHttpRequest]';//TODO it could be nice to inspect its state
});

Formatter.addType(new t.Type(t.OBJECT, t.HTML_ELEMENT), function(value) {
  return value.outerHTML;
});

Formatter.addType(new t.Type(t.OBJECT, t.HTML_ELEMENT, '#text'), function(value) {
  return value.nodeValue;
});

Formatter.addType(new t.Type(t.OBJECT, t.HTML_ELEMENT, '#document'), function(value) {
  return value.documentElement.outerHTML;
});

Formatter.addType(new t.Type(t.OBJECT, t.HOST), function() {
  return '[Host]';
});

module.exports = defaultFormat;