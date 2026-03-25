'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var shouldUtil = require('should-util');
var t = _interopDefault(require('should-type'));

// TODO in future add generators instead of forEach and iterator implementation


function ObjectIterator(obj) {
  this._obj = obj;
}

ObjectIterator.prototype = {
  __shouldIterator__: true, // special marker

  next: function() {
    if (this._done) {
      throw new Error('Iterator already reached the end');
    }

    if (!this._keys) {
      this._keys = Object.keys(this._obj);
      this._index = 0;
    }

    var key = this._keys[this._index];
    this._done = this._index === this._keys.length;
    this._index += 1;

    return {
      value: this._done ? void 0: [key, this._obj[key]],
      done: this._done
    };
  }
};

if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
  ObjectIterator.prototype[Symbol.iterator] = function() {
    return this;
  };
}


function TypeAdaptorStorage() {
  this._typeAdaptors = [];
  this._iterableTypes = {};
}

TypeAdaptorStorage.prototype = {
  add: function(type, cls, sub, adaptor) {
    return this.addType(new t.Type(type, cls, sub), adaptor);
  },

  addType: function(type, adaptor) {
    this._typeAdaptors[type.toString()] = adaptor;
  },

  getAdaptor: function(tp, funcName) {
    var tries = tp.toTryTypes();
    while (tries.length) {
      var toTry = tries.shift();
      var ad = this._typeAdaptors[toTry];
      if (ad && ad[funcName]) {
        return ad[funcName];
      }
    }
  },

  requireAdaptor: function(tp, funcName) {
    var a = this.getAdaptor(tp, funcName);
    if (!a) {
      throw new Error('There is no type adaptor `' + funcName + '` for ' + tp.toString());
    }
    return a;
  },

  addIterableType: function(tp) {
    this._iterableTypes[tp.toString()] = true;
  },

  isIterableType: function(tp) {
    return !!this._iterableTypes[tp.toString()];
  }
};

var defaultTypeAdaptorStorage = new TypeAdaptorStorage();

var objectAdaptor = {
  forEach: function(obj, f, context) {
    for (var prop in obj) {
      if (shouldUtil.hasOwnProperty(obj, prop) && shouldUtil.propertyIsEnumerable(obj, prop)) {
        if (f.call(context, obj[prop], prop, obj) === false) {
          return;
        }
      }
    }
  },

  has: function(obj, prop) {
    return shouldUtil.hasOwnProperty(obj, prop);
  },

  get: function(obj, prop) {
    return obj[prop];
  },

  iterator: function(obj) {
    return new ObjectIterator(obj);
  }
};

// default for objects
defaultTypeAdaptorStorage.addType(new t.Type(t.OBJECT), objectAdaptor);
defaultTypeAdaptorStorage.addType(new t.Type(t.FUNCTION), objectAdaptor);

var mapAdaptor = {
  has: function(obj, key) {
    return obj.has(key);
  },

  get: function(obj, key) {
    return obj.get(key);
  },

  forEach: function(obj, f, context) {
    var iter = obj.entries();
    forEach(iter, function(value) {
      return f.call(context, value[1], value[0], obj);
    });
  },

  size: function(obj) {
    return obj.size;
  },

  isEmpty: function(obj) {
    return obj.size === 0;
  },

  iterator: function(obj) {
    return obj.entries();
  }
};

var setAdaptor = shouldUtil.merge({}, mapAdaptor);
setAdaptor.get = function(obj, key) {
  if (obj.has(key)) {
    return key;
  }
};
setAdaptor.iterator = function(obj) {
  return obj.values();
};

defaultTypeAdaptorStorage.addType(new t.Type(t.OBJECT, t.MAP), mapAdaptor);
defaultTypeAdaptorStorage.addType(new t.Type(t.OBJECT, t.SET), setAdaptor);
defaultTypeAdaptorStorage.addType(new t.Type(t.OBJECT, t.WEAK_SET), setAdaptor);
defaultTypeAdaptorStorage.addType(new t.Type(t.OBJECT, t.WEAK_MAP), mapAdaptor);

defaultTypeAdaptorStorage.addType(new t.Type(t.STRING), {
  isEmpty: function(obj) {
    return obj === '';
  },

  size: function(obj) {
    return obj.length;
  }
});

defaultTypeAdaptorStorage.addIterableType(new t.Type(t.OBJECT, t.ARRAY));
defaultTypeAdaptorStorage.addIterableType(new t.Type(t.OBJECT, t.ARGUMENTS));
defaultTypeAdaptorStorage.addIterableType(new t.Type(t.OBJECT, t.SET));

function forEach(obj, f, context) {
  if (shouldUtil.isGeneratorFunction(obj)) {
    return forEach(obj(), f, context);
  } else if (shouldUtil.isIterator(obj)) {
    var value = obj.next();
    while (!value.done) {
      if (f.call(context, value.value, 'value', obj) === false) {
        return;
      }
      value = obj.next();
    }
  } else {
    var type = t(obj);
    var func = defaultTypeAdaptorStorage.requireAdaptor(type, 'forEach');
    func(obj, f, context);
  }
}


function size(obj) {
  var type = t(obj);
  var func = defaultTypeAdaptorStorage.getAdaptor(type, 'size');
  if (func) {
    return func(obj);
  } else {
    var len = 0;
    forEach(obj, function() {
      len += 1;
    });
    return len;
  }
}

function isEmpty(obj) {
  var type = t(obj);
  var func = defaultTypeAdaptorStorage.getAdaptor(type, 'isEmpty');
  if (func) {
    return func(obj);
  } else {
    var res = true;
    forEach(obj, function() {
      res = false;
      return false;
    });
    return res;
  }
}

// return boolean if obj has such 'key'
function has(obj, key) {
  var type = t(obj);
  var func = defaultTypeAdaptorStorage.requireAdaptor(type, 'has');
  return func(obj, key);
}

// return value for given key
function get(obj, key) {
  var type = t(obj);
  var func = defaultTypeAdaptorStorage.requireAdaptor(type, 'get');
  return func(obj, key);
}

function reduce(obj, f, initialValue) {
  var res = initialValue;
  forEach(obj, function(value, key) {
    res = f(res, value, key, obj);
  });
  return res;
}

function some(obj, f, context) {
  var res = false;
  forEach(obj, function(value, key) {
    if (f.call(context, value, key, obj)) {
      res = true;
      return false;
    }
  }, context);
  return res;
}

function every(obj, f, context) {
  var res = true;
  forEach(obj, function(value, key) {
    if (!f.call(context, value, key, obj)) {
      res = false;
      return false;
    }
  }, context);
  return res;
}

function isIterable(obj) {
  return defaultTypeAdaptorStorage.isIterableType(t(obj));
}

function iterator(obj) {
  return defaultTypeAdaptorStorage.requireAdaptor(t(obj), 'iterator')(obj);
}

exports.defaultTypeAdaptorStorage = defaultTypeAdaptorStorage;
exports.forEach = forEach;
exports.size = size;
exports.isEmpty = isEmpty;
exports.has = has;
exports.get = get;
exports.reduce = reduce;
exports.some = some;
exports.every = every;
exports.isIterable = isIterable;
exports.iterator = iterator;