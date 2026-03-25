(function (factory) {
  if (typeof exports == 'object') {
    module.exports = factory();
  } else if ((typeof define == 'function') && define.amd) {
    define(factory);
  }
}(function () {

  var isBuiltIn = (function () {
    var built_ins = [
      Object,
      Function,
      Array,
      String,
      Boolean,
      Number,
      Date,
      RegExp,
      Error
    ];
    var built_ins_length = built_ins.length;

    return function (_constructor) {
      for (var i = 0; i < built_ins_length; i++) {
        if (built_ins[i] === _constructor) {
          return true;
        }
      }
      return false;
    };
  })();

  var stringType = (function () {
    var _toString = ({}).toString;

    return function (obj) {
      // [object Blah] -> Blah
      var stype = _toString.call(obj).slice(8, -1);

      if ((obj === null) || (obj === undefined)) {
        return stype.toLowerCase();
      }

      var ctype = of(obj);

      if (ctype && !isBuiltIn(ctype)) {
        return ctype.name;
      } else {
        return stype;
      }
    };
  })();

  function of (obj) {
    if ((obj === null) || (obj === undefined)) {
      return obj;
    } else {
      return obj.constructor;
    }
  }

  function is (obj, test) {
    var typer = (of(test) === String) ? stringType : of;
    return (typer(obj) === test);
  }

  function instance (obj, test) {
    return (obj instanceof test);
  }

  function extension (_Extension, _Base) {
    return instance(_Extension.prototype, _Base);
  }

  function any (obj, tests) {
    if (!is(tests, Array)) {
      throw ("Second argument to .any() should be array")
    }
    for (var i = 0; i < tests.length; i++) {
      var test = tests[i];
      if (is(obj, test)) {
        return true;
      }
    }
    return false;
  }

  var exports = function (obj, type) {
    if (arguments.length == 1) {
      return of(obj);
    } else {
      if (is(type, Array)) {
        return any(obj, type);
      } else {
        return is(obj, type);
      }
    }
  }

  exports.instance  = instance;
  exports.string    = stringType;
  exports.of        = of;
  exports.is        = is;
  exports.any       = any;
  exports.extension = extension;
  return exports;

}));
