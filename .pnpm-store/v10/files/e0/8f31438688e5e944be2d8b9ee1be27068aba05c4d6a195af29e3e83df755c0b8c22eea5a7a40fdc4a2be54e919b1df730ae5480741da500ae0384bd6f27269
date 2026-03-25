"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ArraySchema", {
  enumerable: true,
  get: function () {
    return _array.default;
  }
});
Object.defineProperty(exports, "BaseSchema", {
  enumerable: true,
  get: function () {
    return _schema.default;
  }
});
Object.defineProperty(exports, "BooleanSchema", {
  enumerable: true,
  get: function () {
    return _boolean.default;
  }
});
Object.defineProperty(exports, "DateSchema", {
  enumerable: true,
  get: function () {
    return _date.default;
  }
});
Object.defineProperty(exports, "MixedSchema", {
  enumerable: true,
  get: function () {
    return _mixed.default;
  }
});
Object.defineProperty(exports, "NumberSchema", {
  enumerable: true,
  get: function () {
    return _number.default;
  }
});
Object.defineProperty(exports, "ObjectSchema", {
  enumerable: true,
  get: function () {
    return _object.default;
  }
});
Object.defineProperty(exports, "StringSchema", {
  enumerable: true,
  get: function () {
    return _string.default;
  }
});
Object.defineProperty(exports, "ValidationError", {
  enumerable: true,
  get: function () {
    return _ValidationError.default;
  }
});
exports.addMethod = addMethod;
Object.defineProperty(exports, "array", {
  enumerable: true,
  get: function () {
    return _array.create;
  }
});
Object.defineProperty(exports, "bool", {
  enumerable: true,
  get: function () {
    return _boolean.create;
  }
});
Object.defineProperty(exports, "boolean", {
  enumerable: true,
  get: function () {
    return _boolean.create;
  }
});
Object.defineProperty(exports, "date", {
  enumerable: true,
  get: function () {
    return _date.create;
  }
});
Object.defineProperty(exports, "isSchema", {
  enumerable: true,
  get: function () {
    return _isSchema.default;
  }
});
Object.defineProperty(exports, "lazy", {
  enumerable: true,
  get: function () {
    return _Lazy.create;
  }
});
Object.defineProperty(exports, "mixed", {
  enumerable: true,
  get: function () {
    return _mixed.create;
  }
});
Object.defineProperty(exports, "number", {
  enumerable: true,
  get: function () {
    return _number.create;
  }
});
Object.defineProperty(exports, "object", {
  enumerable: true,
  get: function () {
    return _object.create;
  }
});
Object.defineProperty(exports, "reach", {
  enumerable: true,
  get: function () {
    return _reach.default;
  }
});
Object.defineProperty(exports, "ref", {
  enumerable: true,
  get: function () {
    return _Reference.create;
  }
});
Object.defineProperty(exports, "setLocale", {
  enumerable: true,
  get: function () {
    return _setLocale.default;
  }
});
Object.defineProperty(exports, "string", {
  enumerable: true,
  get: function () {
    return _string.create;
  }
});

var _mixed = _interopRequireWildcard(require("./mixed"));

var _boolean = _interopRequireWildcard(require("./boolean"));

var _string = _interopRequireWildcard(require("./string"));

var _number = _interopRequireWildcard(require("./number"));

var _date = _interopRequireWildcard(require("./date"));

var _object = _interopRequireWildcard(require("./object"));

var _array = _interopRequireWildcard(require("./array"));

var _Reference = require("./Reference");

var _Lazy = require("./Lazy");

var _ValidationError = _interopRequireDefault(require("./ValidationError"));

var _reach = _interopRequireDefault(require("./util/reach"));

var _isSchema = _interopRequireDefault(require("./util/isSchema"));

var _setLocale = _interopRequireDefault(require("./setLocale"));

var _schema = _interopRequireDefault(require("./schema"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function addMethod(schemaType, name, fn) {
  if (!schemaType || !(0, _isSchema.default)(schemaType.prototype)) throw new TypeError('You must provide a yup schema constructor function');
  if (typeof name !== 'string') throw new TypeError('A Method name must be provided');
  if (typeof fn !== 'function') throw new TypeError('Method function must be provided');
  schemaType.prototype[name] = fn;
}