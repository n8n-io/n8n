import { promises } from 'node:fs';
import 'fs';
import sourceMap from 'source-map-js';
import * as babelParser from '@babel/parser';

function sharedPlugin(fork) {
  var types = fork.use(typesPlugin);
  var Type = types.Type;
  var builtin = types.builtInTypes;
  var isNumber = builtin.number;
  function geq(than) {
    return Type.from(
      (value) => isNumber.check(value) && value >= than,
      isNumber + " >= " + than
    );
  }
  const defaults = {
    // Functions were used because (among other reasons) that's the most
    // elegant way to allow for the emptyArray one always to give a new
    // array instance.
    "null": function() {
      return null;
    },
    "emptyArray": function() {
      return [];
    },
    "false": function() {
      return false;
    },
    "true": function() {
      return true;
    },
    "undefined": function() {
    },
    "use strict": function() {
      return "use strict";
    }
  };
  var naiveIsPrimitive = Type.or(
    builtin.string,
    builtin.number,
    builtin.boolean,
    builtin.null,
    builtin.undefined
  );
  const isPrimitive = Type.from(
    (value) => {
      if (value === null)
        return true;
      var type = typeof value;
      if (type === "object" || type === "function") {
        return false;
      }
      return true;
    },
    naiveIsPrimitive.toString()
  );
  return {
    geq,
    defaults,
    isPrimitive
  };
}
function maybeSetModuleExports(moduleGetter) {
  try {
    var nodeModule = moduleGetter();
    var originalExports = nodeModule.exports;
    var defaultExport = originalExports["default"];
  } catch {
    return;
  }
  if (defaultExport && defaultExport !== originalExports && typeof originalExports === "object") {
    Object.assign(defaultExport, originalExports, { "default": defaultExport });
    if (originalExports.__esModule) {
      Object.defineProperty(defaultExport, "__esModule", { value: true });
    }
    nodeModule.exports = defaultExport;
  }
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const Op$1 = Object.prototype;
const objToStr = Op$1.toString;
const hasOwn$6 = Op$1.hasOwnProperty;
class BaseType {
  assert(value, deep) {
    if (!this.check(value, deep)) {
      var str = shallowStringify(value);
      throw new Error(str + " does not match type " + this);
    }
    return true;
  }
  arrayOf() {
    const elemType = this;
    return new ArrayType(elemType);
  }
}
class ArrayType extends BaseType {
  constructor(elemType) {
    super();
    this.elemType = elemType;
    __publicField$2(this, "kind", "ArrayType");
  }
  toString() {
    return "[" + this.elemType + "]";
  }
  check(value, deep) {
    return Array.isArray(value) && value.every((elem) => this.elemType.check(elem, deep));
  }
}
class IdentityType extends BaseType {
  constructor(value) {
    super();
    this.value = value;
    __publicField$2(this, "kind", "IdentityType");
  }
  toString() {
    return String(this.value);
  }
  check(value, deep) {
    const result = value === this.value;
    if (!result && typeof deep === "function") {
      deep(this, value);
    }
    return result;
  }
}
class ObjectType extends BaseType {
  constructor(fields) {
    super();
    this.fields = fields;
    __publicField$2(this, "kind", "ObjectType");
  }
  toString() {
    return "{ " + this.fields.join(", ") + " }";
  }
  check(value, deep) {
    return objToStr.call(value) === objToStr.call({}) && this.fields.every((field) => {
      return field.type.check(value[field.name], deep);
    });
  }
}
class OrType extends BaseType {
  constructor(types) {
    super();
    this.types = types;
    __publicField$2(this, "kind", "OrType");
  }
  toString() {
    return this.types.join(" | ");
  }
  check(value, deep) {
    if (this.types.some((type) => type.check(value, !!deep))) {
      return true;
    }
    if (typeof deep === "function") {
      deep(this, value);
    }
    return false;
  }
}
class PredicateType extends BaseType {
  constructor(name, predicate) {
    super();
    this.name = name;
    this.predicate = predicate;
    __publicField$2(this, "kind", "PredicateType");
  }
  toString() {
    return this.name;
  }
  check(value, deep) {
    const result = this.predicate(value, deep);
    if (!result && typeof deep === "function") {
      deep(this, value);
    }
    return result;
  }
}
class Def {
  constructor(type, typeName) {
    this.type = type;
    this.typeName = typeName;
    __publicField$2(this, "baseNames", []);
    __publicField$2(this, "ownFields", /* @__PURE__ */ Object.create(null));
    // Includes own typeName. Populated during finalization.
    __publicField$2(this, "allSupertypes", /* @__PURE__ */ Object.create(null));
    // Linear inheritance hierarchy. Populated during finalization.
    __publicField$2(this, "supertypeList", []);
    // Includes inherited fields.
    __publicField$2(this, "allFields", /* @__PURE__ */ Object.create(null));
    // Non-hidden keys of allFields.
    __publicField$2(this, "fieldNames", []);
    // This property will be overridden as true by individual Def instances
    // when they are finalized.
    __publicField$2(this, "finalized", false);
    // False by default until .build(...) is called on an instance.
    __publicField$2(this, "buildable", false);
    __publicField$2(this, "buildParams", []);
  }
  isSupertypeOf(that) {
    if (that instanceof Def) {
      if (this.finalized !== true || that.finalized !== true) {
        throw new Error("");
      }
      return hasOwn$6.call(that.allSupertypes, this.typeName);
    } else {
      throw new Error(that + " is not a Def");
    }
  }
  checkAllFields(value, deep) {
    var allFields = this.allFields;
    if (this.finalized !== true) {
      throw new Error("" + this.typeName);
    }
    function checkFieldByName(name) {
      var field = allFields[name];
      var type = field.type;
      var child = field.getValue(value);
      return type.check(child, deep);
    }
    return value !== null && typeof value === "object" && Object.keys(allFields).every(checkFieldByName);
  }
  bases(...supertypeNames) {
    var bases = this.baseNames;
    if (this.finalized) {
      if (supertypeNames.length !== bases.length) {
        throw new Error("");
      }
      for (var i = 0; i < supertypeNames.length; i++) {
        if (supertypeNames[i] !== bases[i]) {
          throw new Error("");
        }
      }
      return this;
    }
    supertypeNames.forEach((baseName) => {
      if (bases.indexOf(baseName) < 0) {
        bases.push(baseName);
      }
    });
    return this;
  }
}
class Field {
  constructor(name, type, defaultFn, hidden) {
    this.name = name;
    this.type = type;
    this.defaultFn = defaultFn;
    __publicField$2(this, "hidden");
    this.hidden = !!hidden;
  }
  toString() {
    return JSON.stringify(this.name) + ": " + this.type;
  }
  getValue(obj) {
    var value = obj[this.name];
    if (typeof value !== "undefined") {
      return value;
    }
    if (typeof this.defaultFn === "function") {
      value = this.defaultFn.call(obj);
    }
    return value;
  }
}
function shallowStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(shallowStringify).join(", ") + "]";
  }
  if (value && typeof value === "object") {
    return "{ " + Object.keys(value).map(function(key) {
      return key + ": " + value[key];
    }).join(", ") + " }";
  }
  return JSON.stringify(value);
}
function typesPlugin(_fork) {
  const Type = {
    or(...types) {
      return new OrType(types.map((type) => Type.from(type)));
    },
    from(value, name) {
      if (value instanceof ArrayType || value instanceof IdentityType || value instanceof ObjectType || value instanceof OrType || value instanceof PredicateType) {
        return value;
      }
      if (value instanceof Def) {
        return value.type;
      }
      if (isArray.check(value)) {
        if (value.length !== 1) {
          throw new Error("only one element type is permitted for typed arrays");
        }
        return new ArrayType(Type.from(value[0]));
      }
      if (isObject.check(value)) {
        return new ObjectType(Object.keys(value).map((name2) => {
          return new Field(name2, Type.from(value[name2], name2));
        }));
      }
      if (typeof value === "function") {
        var bicfIndex = builtInCtorFns.indexOf(value);
        if (bicfIndex >= 0) {
          return builtInCtorTypes[bicfIndex];
        }
        if (typeof name !== "string") {
          throw new Error("missing name");
        }
        return new PredicateType(name, value);
      }
      return new IdentityType(value);
    },
    // Define a type whose name is registered in a namespace (the defCache) so
    // that future definitions will return the same type given the same name.
    // In particular, this system allows for circular and forward definitions.
    // The Def object d returned from Type.def may be used to configure the
    // type d.type by calling methods such as d.bases, d.build, and d.field.
    def(typeName) {
      return hasOwn$6.call(defCache, typeName) ? defCache[typeName] : defCache[typeName] = new DefImpl(typeName);
    },
    hasDef(typeName) {
      return hasOwn$6.call(defCache, typeName);
    }
  };
  var builtInCtorFns = [];
  var builtInCtorTypes = [];
  function defBuiltInType(name, example) {
    const objStr = objToStr.call(example);
    const type = new PredicateType(
      name,
      (value) => objToStr.call(value) === objStr
    );
    if (example && typeof example.constructor === "function") {
      builtInCtorFns.push(example.constructor);
      builtInCtorTypes.push(type);
    }
    return type;
  }
  const isString = defBuiltInType("string", "truthy");
  const isFunction = defBuiltInType("function", function() {
  });
  const isArray = defBuiltInType("array", []);
  const isObject = defBuiltInType("object", {});
  const isRegExp = defBuiltInType("RegExp", /./);
  const isDate = defBuiltInType("Date", /* @__PURE__ */ new Date());
  const isNumber = defBuiltInType("number", 3);
  const isBoolean = defBuiltInType("boolean", true);
  const isNull = defBuiltInType("null", null);
  const isUndefined = defBuiltInType("undefined", void 0);
  const isBigInt = typeof BigInt === "function" ? defBuiltInType("BigInt", BigInt(1234)) : new PredicateType("BigInt", () => false);
  const builtInTypes = {
    string: isString,
    function: isFunction,
    array: isArray,
    object: isObject,
    RegExp: isRegExp,
    Date: isDate,
    number: isNumber,
    boolean: isBoolean,
    null: isNull,
    undefined: isUndefined,
    BigInt: isBigInt
  };
  var defCache = /* @__PURE__ */ Object.create(null);
  function defFromValue(value) {
    if (value && typeof value === "object") {
      var type = value.type;
      if (typeof type === "string" && hasOwn$6.call(defCache, type)) {
        var d = defCache[type];
        if (d.finalized) {
          return d;
        }
      }
    }
    return null;
  }
  class DefImpl extends Def {
    constructor(typeName) {
      super(
        new PredicateType(typeName, (value, deep) => this.check(value, deep)),
        typeName
      );
    }
    check(value, deep) {
      if (this.finalized !== true) {
        throw new Error(
          "prematurely checking unfinalized type " + this.typeName
        );
      }
      if (value === null || typeof value !== "object") {
        return false;
      }
      var vDef = defFromValue(value);
      if (!vDef) {
        if (this.typeName === "SourceLocation" || this.typeName === "Position") {
          return this.checkAllFields(value, deep);
        }
        return false;
      }
      if (deep && vDef === this) {
        return this.checkAllFields(value, deep);
      }
      if (!this.isSupertypeOf(vDef)) {
        return false;
      }
      if (!deep) {
        return true;
      }
      return vDef.checkAllFields(value, deep) && this.checkAllFields(value, false);
    }
    build(...buildParams) {
      this.buildParams = buildParams;
      if (this.buildable) {
        return this;
      }
      this.field("type", String, () => this.typeName);
      this.buildable = true;
      const addParam = (built, param, arg, isArgAvailable) => {
        if (hasOwn$6.call(built, param))
          return;
        var all = this.allFields;
        if (!hasOwn$6.call(all, param)) {
          throw new Error("" + param);
        }
        var field = all[param];
        var type = field.type;
        var value;
        if (isArgAvailable) {
          value = arg;
        } else if (field.defaultFn) {
          value = field.defaultFn.call(built);
        } else {
          var message = "no value or default function given for field " + JSON.stringify(param) + " of " + this.typeName + "(" + this.buildParams.map(function(name) {
            return all[name];
          }).join(", ") + ")";
          throw new Error(message);
        }
        if (!type.check(value)) {
          throw new Error(
            shallowStringify(value) + " does not match field " + field + " of type " + this.typeName
          );
        }
        built[param] = value;
      };
      const builder = (...args) => {
        var argc = args.length;
        if (!this.finalized) {
          throw new Error(
            "attempting to instantiate unfinalized type " + this.typeName
          );
        }
        var built = Object.create(nodePrototype);
        this.buildParams.forEach(function(param, i) {
          if (i < argc) {
            addParam(built, param, args[i], true);
          } else {
            addParam(built, param, null, false);
          }
        });
        Object.keys(this.allFields).forEach(function(param) {
          addParam(built, param, null, false);
        });
        if (built.type !== this.typeName) {
          throw new Error("");
        }
        return built;
      };
      builder.from = (obj) => {
        if (!this.finalized) {
          throw new Error(
            "attempting to instantiate unfinalized type " + this.typeName
          );
        }
        var built = Object.create(nodePrototype);
        Object.keys(this.allFields).forEach(function(param) {
          if (hasOwn$6.call(obj, param)) {
            addParam(built, param, obj[param], true);
          } else {
            addParam(built, param, null, false);
          }
        });
        if (built.type !== this.typeName) {
          throw new Error("");
        }
        return built;
      };
      Object.defineProperty(builders, getBuilderName(this.typeName), {
        enumerable: true,
        value: builder
      });
      return this;
    }
    // The reason fields are specified using .field(...) instead of an object
    // literal syntax is somewhat subtle: the object literal syntax would
    // support only one key and one value, but with .field(...) we can pass
    // any number of arguments to specify the field.
    field(name, type, defaultFn, hidden) {
      if (this.finalized) {
        console.error("Ignoring attempt to redefine field " + JSON.stringify(name) + " of finalized type " + JSON.stringify(this.typeName));
        return this;
      }
      this.ownFields[name] = new Field(name, Type.from(type), defaultFn, hidden);
      return this;
    }
    finalize() {
      if (!this.finalized) {
        var allFields = this.allFields;
        var allSupertypes = this.allSupertypes;
        this.baseNames.forEach((name) => {
          var def = defCache[name];
          if (def instanceof Def) {
            def.finalize();
            extend(allFields, def.allFields);
            extend(allSupertypes, def.allSupertypes);
          } else {
            var message = "unknown supertype name " + JSON.stringify(name) + " for subtype " + JSON.stringify(this.typeName);
            throw new Error(message);
          }
        });
        extend(allFields, this.ownFields);
        allSupertypes[this.typeName] = this;
        this.fieldNames.length = 0;
        for (var fieldName in allFields) {
          if (hasOwn$6.call(allFields, fieldName) && !allFields[fieldName].hidden) {
            this.fieldNames.push(fieldName);
          }
        }
        Object.defineProperty(namedTypes, this.typeName, {
          enumerable: true,
          value: this.type
        });
        this.finalized = true;
        populateSupertypeList(this.typeName, this.supertypeList);
        if (this.buildable && this.supertypeList.lastIndexOf("Expression") >= 0) {
          wrapExpressionBuilderWithStatement(this.typeName);
        }
      }
    }
  }
  function getSupertypeNames(typeName) {
    if (!hasOwn$6.call(defCache, typeName)) {
      throw new Error("");
    }
    var d = defCache[typeName];
    if (d.finalized !== true) {
      throw new Error("");
    }
    return d.supertypeList.slice(1);
  }
  function computeSupertypeLookupTable(candidates) {
    var table = {};
    var typeNames = Object.keys(defCache);
    var typeNameCount = typeNames.length;
    for (var i = 0; i < typeNameCount; ++i) {
      var typeName = typeNames[i];
      var d = defCache[typeName];
      if (d.finalized !== true) {
        throw new Error("" + typeName);
      }
      for (var j = 0; j < d.supertypeList.length; ++j) {
        var superTypeName = d.supertypeList[j];
        if (hasOwn$6.call(candidates, superTypeName)) {
          table[typeName] = superTypeName;
          break;
        }
      }
    }
    return table;
  }
  var builders = /* @__PURE__ */ Object.create(null);
  var nodePrototype = {};
  function defineMethod(name, func) {
    var old = nodePrototype[name];
    if (isUndefined.check(func)) {
      delete nodePrototype[name];
    } else {
      isFunction.assert(func);
      Object.defineProperty(nodePrototype, name, {
        enumerable: true,
        // For discoverability.
        configurable: true,
        // For delete proto[name].
        value: func
      });
    }
    return old;
  }
  function getBuilderName(typeName) {
    return typeName.replace(/^[A-Z]+/, function(upperCasePrefix) {
      var len = upperCasePrefix.length;
      switch (len) {
        case 0:
          return "";
        case 1:
          return upperCasePrefix.toLowerCase();
        default:
          return upperCasePrefix.slice(
            0,
            len - 1
          ).toLowerCase() + upperCasePrefix.charAt(len - 1);
      }
    });
  }
  function getStatementBuilderName(typeName) {
    typeName = getBuilderName(typeName);
    return typeName.replace(/(Expression)?$/, "Statement");
  }
  var namedTypes = {};
  function getFieldNames(object) {
    var d = defFromValue(object);
    if (d) {
      return d.fieldNames.slice(0);
    }
    if ("type" in object) {
      throw new Error(
        "did not recognize object of type " + JSON.stringify(object.type)
      );
    }
    return Object.keys(object);
  }
  function getFieldValue(object, fieldName) {
    var d = defFromValue(object);
    if (d) {
      var field = d.allFields[fieldName];
      if (field) {
        return field.getValue(object);
      }
    }
    return object && object[fieldName];
  }
  function eachField(object, callback, context) {
    getFieldNames(object).forEach(function(name) {
      callback.call(this, name, getFieldValue(object, name));
    }, context);
  }
  function someField(object, callback, context) {
    return getFieldNames(object).some(function(name) {
      return callback.call(this, name, getFieldValue(object, name));
    }, context);
  }
  function wrapExpressionBuilderWithStatement(typeName) {
    var wrapperName = getStatementBuilderName(typeName);
    if (builders[wrapperName])
      return;
    var wrapped = builders[getBuilderName(typeName)];
    if (!wrapped)
      return;
    const builder = function(...args) {
      return builders.expressionStatement(wrapped.apply(builders, args));
    };
    builder.from = function(...args) {
      return builders.expressionStatement(wrapped.from.apply(builders, args));
    };
    builders[wrapperName] = builder;
  }
  function populateSupertypeList(typeName, list) {
    list.length = 0;
    list.push(typeName);
    var lastSeen = /* @__PURE__ */ Object.create(null);
    for (var pos = 0; pos < list.length; ++pos) {
      typeName = list[pos];
      var d = defCache[typeName];
      if (d.finalized !== true) {
        throw new Error("");
      }
      if (hasOwn$6.call(lastSeen, typeName)) {
        delete list[lastSeen[typeName]];
      }
      lastSeen[typeName] = pos;
      list.push.apply(list, d.baseNames);
    }
    for (var to = 0, from = to, len = list.length; from < len; ++from) {
      if (hasOwn$6.call(list, from)) {
        list[to++] = list[from];
      }
    }
    list.length = to;
  }
  function extend(into, from) {
    Object.keys(from).forEach(function(name) {
      into[name] = from[name];
    });
    return into;
  }
  function finalize() {
    Object.keys(defCache).forEach(function(name) {
      defCache[name].finalize();
    });
  }
  return {
    Type,
    builtInTypes,
    getSupertypeNames,
    computeSupertypeLookupTable,
    builders,
    defineMethod,
    getBuilderName,
    getStatementBuilderName,
    namedTypes,
    getFieldNames,
    getFieldValue,
    eachField,
    someField,
    finalize
  };
}
maybeSetModuleExports(() => module);

var Op = Object.prototype;
var hasOwn$5 = Op.hasOwnProperty;
function pathPlugin(fork) {
  var types = fork.use(typesPlugin);
  var isArray = types.builtInTypes.array;
  var isNumber = types.builtInTypes.number;
  const Path = function Path2(value, parentPath, name) {
    if (!(this instanceof Path2)) {
      throw new Error("Path constructor cannot be invoked without 'new'");
    }
    if (parentPath) {
      if (!(parentPath instanceof Path2)) {
        throw new Error("");
      }
    } else {
      parentPath = null;
      name = null;
    }
    this.value = value;
    this.parentPath = parentPath;
    this.name = name;
    this.__childCache = null;
  };
  var Pp = Path.prototype;
  function getChildCache(path) {
    return path.__childCache || (path.__childCache = /* @__PURE__ */ Object.create(null));
  }
  function getChildPath(path, name) {
    var cache = getChildCache(path);
    var actualChildValue = path.getValueProperty(name);
    var childPath = cache[name];
    if (!hasOwn$5.call(cache, name) || // Ensure consistency between cache and reality.
    childPath.value !== actualChildValue) {
      childPath = cache[name] = new path.constructor(
        actualChildValue,
        path,
        name
      );
    }
    return childPath;
  }
  Pp.getValueProperty = function getValueProperty(name) {
    return this.value[name];
  };
  Pp.get = function get(...names) {
    var path = this;
    var count = names.length;
    for (var i = 0; i < count; ++i) {
      path = getChildPath(path, names[i]);
    }
    return path;
  };
  Pp.each = function each(callback, context) {
    var childPaths = [];
    var len = this.value.length;
    var i = 0;
    for (var i = 0; i < len; ++i) {
      if (hasOwn$5.call(this.value, i)) {
        childPaths[i] = this.get(i);
      }
    }
    context = context || this;
    for (i = 0; i < len; ++i) {
      if (hasOwn$5.call(childPaths, i)) {
        callback.call(context, childPaths[i]);
      }
    }
  };
  Pp.map = function map(callback, context) {
    var result = [];
    this.each(function(childPath) {
      result.push(callback.call(this, childPath));
    }, context);
    return result;
  };
  Pp.filter = function filter(callback, context) {
    var result = [];
    this.each(function(childPath) {
      if (callback.call(this, childPath)) {
        result.push(childPath);
      }
    }, context);
    return result;
  };
  function emptyMoves() {
  }
  function getMoves(path, offset, start, end) {
    isArray.assert(path.value);
    if (offset === 0) {
      return emptyMoves;
    }
    var length = path.value.length;
    if (length < 1) {
      return emptyMoves;
    }
    var argc = arguments.length;
    if (argc === 2) {
      start = 0;
      end = length;
    } else if (argc === 3) {
      start = Math.max(start, 0);
      end = length;
    } else {
      start = Math.max(start, 0);
      end = Math.min(end, length);
    }
    isNumber.assert(start);
    isNumber.assert(end);
    var moves = /* @__PURE__ */ Object.create(null);
    var cache = getChildCache(path);
    for (var i = start; i < end; ++i) {
      if (hasOwn$5.call(path.value, i)) {
        var childPath = path.get(i);
        if (childPath.name !== i) {
          throw new Error("");
        }
        var newIndex = i + offset;
        childPath.name = newIndex;
        moves[newIndex] = childPath;
        delete cache[i];
      }
    }
    delete cache.length;
    return function() {
      for (var newIndex2 in moves) {
        var childPath2 = moves[newIndex2];
        if (childPath2.name !== +newIndex2) {
          throw new Error("");
        }
        cache[newIndex2] = childPath2;
        path.value[newIndex2] = childPath2.value;
      }
    };
  }
  Pp.shift = function shift() {
    var move = getMoves(this, -1);
    var result = this.value.shift();
    move();
    return result;
  };
  Pp.unshift = function unshift(...args) {
    var move = getMoves(this, args.length);
    var result = this.value.unshift.apply(this.value, args);
    move();
    return result;
  };
  Pp.push = function push(...args) {
    isArray.assert(this.value);
    delete getChildCache(this).length;
    return this.value.push.apply(this.value, args);
  };
  Pp.pop = function pop() {
    isArray.assert(this.value);
    var cache = getChildCache(this);
    delete cache[this.value.length - 1];
    delete cache.length;
    return this.value.pop();
  };
  Pp.insertAt = function insertAt(index) {
    var argc = arguments.length;
    var move = getMoves(this, argc - 1, index);
    if (move === emptyMoves && argc <= 1) {
      return this;
    }
    index = Math.max(index, 0);
    for (var i = 1; i < argc; ++i) {
      this.value[index + i - 1] = arguments[i];
    }
    move();
    return this;
  };
  Pp.insertBefore = function insertBefore(...args) {
    var pp = this.parentPath;
    var argc = args.length;
    var insertAtArgs = [this.name];
    for (var i = 0; i < argc; ++i) {
      insertAtArgs.push(args[i]);
    }
    return pp.insertAt.apply(pp, insertAtArgs);
  };
  Pp.insertAfter = function insertAfter(...args) {
    var pp = this.parentPath;
    var argc = args.length;
    var insertAtArgs = [this.name + 1];
    for (var i = 0; i < argc; ++i) {
      insertAtArgs.push(args[i]);
    }
    return pp.insertAt.apply(pp, insertAtArgs);
  };
  function repairRelationshipWithParent(path) {
    if (!(path instanceof Path)) {
      throw new Error("");
    }
    var pp = path.parentPath;
    if (!pp) {
      return path;
    }
    var parentValue = pp.value;
    var parentCache = getChildCache(pp);
    if (parentValue[path.name] === path.value) {
      parentCache[path.name] = path;
    } else if (isArray.check(parentValue)) {
      var i = parentValue.indexOf(path.value);
      if (i >= 0) {
        parentCache[path.name = i] = path;
      }
    } else {
      parentValue[path.name] = path.value;
      parentCache[path.name] = path;
    }
    if (parentValue[path.name] !== path.value) {
      throw new Error("");
    }
    if (path.parentPath.get(path.name) !== path) {
      throw new Error("");
    }
    return path;
  }
  Pp.replace = function replace(replacement) {
    var results = [];
    var parentValue = this.parentPath.value;
    var parentCache = getChildCache(this.parentPath);
    var count = arguments.length;
    repairRelationshipWithParent(this);
    if (isArray.check(parentValue)) {
      var originalLength = parentValue.length;
      var move = getMoves(this.parentPath, count - 1, this.name + 1);
      var spliceArgs = [this.name, 1];
      for (var i = 0; i < count; ++i) {
        spliceArgs.push(arguments[i]);
      }
      var splicedOut = parentValue.splice.apply(parentValue, spliceArgs);
      if (splicedOut[0] !== this.value) {
        throw new Error("");
      }
      if (parentValue.length !== originalLength - 1 + count) {
        throw new Error("");
      }
      move();
      if (count === 0) {
        delete this.value;
        delete parentCache[this.name];
        this.__childCache = null;
      } else {
        if (parentValue[this.name] !== replacement) {
          throw new Error("");
        }
        if (this.value !== replacement) {
          this.value = replacement;
          this.__childCache = null;
        }
        for (i = 0; i < count; ++i) {
          results.push(this.parentPath.get(this.name + i));
        }
        if (results[0] !== this) {
          throw new Error("");
        }
      }
    } else if (count === 1) {
      if (this.value !== replacement) {
        this.__childCache = null;
      }
      this.value = parentValue[this.name] = replacement;
      results.push(this);
    } else if (count === 0) {
      delete parentValue[this.name];
      delete this.value;
      this.__childCache = null;
    } else {
      throw new Error("Could not replace path");
    }
    return results;
  };
  return Path;
}
maybeSetModuleExports(() => module);

var hasOwn$4 = Object.prototype.hasOwnProperty;
function scopePlugin(fork) {
  var types = fork.use(typesPlugin);
  var Type = types.Type;
  var namedTypes = types.namedTypes;
  var Node = namedTypes.Node;
  var Expression = namedTypes.Expression;
  var isArray = types.builtInTypes.array;
  var b = types.builders;
  const Scope = function Scope2(path, parentScope) {
    if (!(this instanceof Scope2)) {
      throw new Error("Scope constructor cannot be invoked without 'new'");
    }
    if (!TypeParameterScopeType.check(path.value)) {
      ScopeType.assert(path.value);
    }
    var depth;
    if (parentScope) {
      if (!(parentScope instanceof Scope2)) {
        throw new Error("");
      }
      depth = parentScope.depth + 1;
    } else {
      parentScope = null;
      depth = 0;
    }
    Object.defineProperties(this, {
      path: { value: path },
      node: { value: path.value },
      isGlobal: { value: !parentScope, enumerable: true },
      depth: { value: depth },
      parent: { value: parentScope },
      bindings: { value: {} },
      types: { value: {} }
    });
  };
  var ScopeType = Type.or(
    // Program nodes introduce global scopes.
    namedTypes.Program,
    // Function is the supertype of FunctionExpression,
    // FunctionDeclaration, ArrowExpression, etc.
    namedTypes.Function,
    // In case you didn't know, the caught parameter shadows any variable
    // of the same name in an outer scope.
    namedTypes.CatchClause
  );
  var TypeParameterScopeType = Type.or(
    namedTypes.Function,
    namedTypes.ClassDeclaration,
    namedTypes.ClassExpression,
    namedTypes.InterfaceDeclaration,
    namedTypes.TSInterfaceDeclaration,
    namedTypes.TypeAlias,
    namedTypes.TSTypeAliasDeclaration
  );
  var FlowOrTSTypeParameterType = Type.or(
    namedTypes.TypeParameter,
    namedTypes.TSTypeParameter
  );
  Scope.isEstablishedBy = function(node) {
    return ScopeType.check(node) || TypeParameterScopeType.check(node);
  };
  var Sp = Scope.prototype;
  Sp.didScan = false;
  Sp.declares = function(name) {
    this.scan();
    return hasOwn$4.call(this.bindings, name);
  };
  Sp.declaresType = function(name) {
    this.scan();
    return hasOwn$4.call(this.types, name);
  };
  Sp.declareTemporary = function(prefix) {
    if (prefix) {
      if (!/^[a-z$_]/i.test(prefix)) {
        throw new Error("");
      }
    } else {
      prefix = "t$";
    }
    prefix += this.depth.toString(36) + "$";
    this.scan();
    var index = 0;
    while (this.declares(prefix + index)) {
      ++index;
    }
    var name = prefix + index;
    return this.bindings[name] = types.builders.identifier(name);
  };
  Sp.injectTemporary = function(identifier, init) {
    identifier || (identifier = this.declareTemporary());
    var bodyPath = this.path.get("body");
    if (namedTypes.BlockStatement.check(bodyPath.value)) {
      bodyPath = bodyPath.get("body");
    }
    bodyPath.unshift(
      b.variableDeclaration(
        "var",
        [b.variableDeclarator(identifier, init || null)]
      )
    );
    return identifier;
  };
  Sp.scan = function(force) {
    if (force || !this.didScan) {
      for (var name in this.bindings) {
        delete this.bindings[name];
      }
      for (var name in this.types) {
        delete this.types[name];
      }
      scanScope(this.path, this.bindings, this.types);
      this.didScan = true;
    }
  };
  Sp.getBindings = function() {
    this.scan();
    return this.bindings;
  };
  Sp.getTypes = function() {
    this.scan();
    return this.types;
  };
  function scanScope(path, bindings, scopeTypes) {
    var node = path.value;
    if (TypeParameterScopeType.check(node)) {
      const params = path.get("typeParameters", "params");
      if (isArray.check(params.value)) {
        params.each((childPath) => {
          addTypeParameter(childPath, scopeTypes);
        });
      }
    }
    if (ScopeType.check(node)) {
      if (namedTypes.CatchClause.check(node)) {
        addPattern(path.get("param"), bindings);
      } else {
        recursiveScanScope(path, bindings, scopeTypes);
      }
    }
  }
  function recursiveScanScope(path, bindings, scopeTypes) {
    var node = path.value;
    if (path.parent && namedTypes.FunctionExpression.check(path.parent.node) && path.parent.node.id) {
      addPattern(path.parent.get("id"), bindings);
    }
    if (!node) ; else if (isArray.check(node)) {
      path.each((childPath) => {
        recursiveScanChild(childPath, bindings, scopeTypes);
      });
    } else if (namedTypes.Function.check(node)) {
      path.get("params").each((paramPath) => {
        addPattern(paramPath, bindings);
      });
      recursiveScanChild(path.get("body"), bindings, scopeTypes);
      recursiveScanScope(path.get("typeParameters"), bindings, scopeTypes);
    } else if (namedTypes.TypeAlias && namedTypes.TypeAlias.check(node) || namedTypes.InterfaceDeclaration && namedTypes.InterfaceDeclaration.check(node) || namedTypes.TSTypeAliasDeclaration && namedTypes.TSTypeAliasDeclaration.check(node) || namedTypes.TSInterfaceDeclaration && namedTypes.TSInterfaceDeclaration.check(node)) {
      addTypePattern(path.get("id"), scopeTypes);
    } else if (namedTypes.VariableDeclarator.check(node)) {
      addPattern(path.get("id"), bindings);
      recursiveScanChild(path.get("init"), bindings, scopeTypes);
    } else if (node.type === "ImportSpecifier" || node.type === "ImportNamespaceSpecifier" || node.type === "ImportDefaultSpecifier") {
      addPattern(
        // Esprima used to use the .name field to refer to the local
        // binding identifier for ImportSpecifier nodes, but .id for
        // ImportNamespaceSpecifier and ImportDefaultSpecifier nodes.
        // ESTree/Acorn/ESpree use .local for all three node types.
        path.get(node.local ? "local" : node.name ? "name" : "id"),
        bindings
      );
    } else if (Node.check(node) && !Expression.check(node)) {
      types.eachField(node, function(name, child) {
        var childPath = path.get(name);
        if (!pathHasValue(childPath, child)) {
          throw new Error("");
        }
        recursiveScanChild(childPath, bindings, scopeTypes);
      });
    }
  }
  function pathHasValue(path, value) {
    if (path.value === value) {
      return true;
    }
    if (Array.isArray(path.value) && path.value.length === 0 && Array.isArray(value) && value.length === 0) {
      return true;
    }
    return false;
  }
  function recursiveScanChild(path, bindings, scopeTypes) {
    var node = path.value;
    if (!node || Expression.check(node)) ; else if (namedTypes.FunctionDeclaration.check(node) && node.id !== null) {
      addPattern(path.get("id"), bindings);
    } else if (namedTypes.ClassDeclaration && namedTypes.ClassDeclaration.check(node) && node.id !== null) {
      addPattern(path.get("id"), bindings);
      recursiveScanScope(path.get("typeParameters"), bindings, scopeTypes);
    } else if (namedTypes.InterfaceDeclaration && namedTypes.InterfaceDeclaration.check(node) || namedTypes.TSInterfaceDeclaration && namedTypes.TSInterfaceDeclaration.check(node)) {
      addTypePattern(path.get("id"), scopeTypes);
    } else if (ScopeType.check(node)) {
      if (namedTypes.CatchClause.check(node) && // TODO Broaden this to accept any pattern.
      namedTypes.Identifier.check(node.param)) {
        var catchParamName = node.param.name;
        var hadBinding = hasOwn$4.call(bindings, catchParamName);
        recursiveScanScope(path.get("body"), bindings, scopeTypes);
        if (!hadBinding) {
          delete bindings[catchParamName];
        }
      }
    } else {
      recursiveScanScope(path, bindings, scopeTypes);
    }
  }
  function addPattern(patternPath, bindings) {
    var pattern = patternPath.value;
    namedTypes.Pattern.assert(pattern);
    if (namedTypes.Identifier.check(pattern)) {
      if (hasOwn$4.call(bindings, pattern.name)) {
        bindings[pattern.name].push(patternPath);
      } else {
        bindings[pattern.name] = [patternPath];
      }
    } else if (namedTypes.AssignmentPattern && namedTypes.AssignmentPattern.check(pattern)) {
      addPattern(patternPath.get("left"), bindings);
    } else if (namedTypes.ObjectPattern && namedTypes.ObjectPattern.check(pattern)) {
      patternPath.get("properties").each(function(propertyPath) {
        var property = propertyPath.value;
        if (namedTypes.Pattern.check(property)) {
          addPattern(propertyPath, bindings);
        } else if (namedTypes.Property.check(property) || namedTypes.ObjectProperty && namedTypes.ObjectProperty.check(property)) {
          addPattern(propertyPath.get("value"), bindings);
        } else if (namedTypes.SpreadProperty && namedTypes.SpreadProperty.check(property)) {
          addPattern(propertyPath.get("argument"), bindings);
        }
      });
    } else if (namedTypes.ArrayPattern && namedTypes.ArrayPattern.check(pattern)) {
      patternPath.get("elements").each(function(elementPath) {
        var element = elementPath.value;
        if (namedTypes.Pattern.check(element)) {
          addPattern(elementPath, bindings);
        } else if (namedTypes.SpreadElement && namedTypes.SpreadElement.check(element)) {
          addPattern(elementPath.get("argument"), bindings);
        }
      });
    } else if (namedTypes.PropertyPattern && namedTypes.PropertyPattern.check(pattern)) {
      addPattern(patternPath.get("pattern"), bindings);
    } else if (namedTypes.SpreadElementPattern && namedTypes.SpreadElementPattern.check(pattern) || namedTypes.RestElement && namedTypes.RestElement.check(pattern) || namedTypes.SpreadPropertyPattern && namedTypes.SpreadPropertyPattern.check(pattern)) {
      addPattern(patternPath.get("argument"), bindings);
    }
  }
  function addTypePattern(patternPath, types2) {
    var pattern = patternPath.value;
    namedTypes.Pattern.assert(pattern);
    if (namedTypes.Identifier.check(pattern)) {
      if (hasOwn$4.call(types2, pattern.name)) {
        types2[pattern.name].push(patternPath);
      } else {
        types2[pattern.name] = [patternPath];
      }
    }
  }
  function addTypeParameter(parameterPath, types2) {
    var parameter = parameterPath.value;
    FlowOrTSTypeParameterType.assert(parameter);
    if (hasOwn$4.call(types2, parameter.name)) {
      types2[parameter.name].push(parameterPath);
    } else {
      types2[parameter.name] = [parameterPath];
    }
  }
  Sp.lookup = function(name) {
    for (var scope = this; scope; scope = scope.parent)
      if (scope.declares(name))
        break;
    return scope;
  };
  Sp.lookupType = function(name) {
    for (var scope = this; scope; scope = scope.parent)
      if (scope.declaresType(name))
        break;
    return scope;
  };
  Sp.getGlobalScope = function() {
    var scope = this;
    while (!scope.isGlobal)
      scope = scope.parent;
    return scope;
  };
  return Scope;
}
maybeSetModuleExports(() => module);

function nodePathPlugin(fork) {
  var types = fork.use(typesPlugin);
  var n = types.namedTypes;
  var b = types.builders;
  var isNumber = types.builtInTypes.number;
  var isArray = types.builtInTypes.array;
  var Path2 = fork.use(pathPlugin);
  var Scope2 = fork.use(scopePlugin);
  const NodePath = function NodePath2(value, parentPath, name) {
    if (!(this instanceof NodePath2)) {
      throw new Error("NodePath constructor cannot be invoked without 'new'");
    }
    Path2.call(this, value, parentPath, name);
  };
  var NPp = NodePath.prototype = Object.create(Path2.prototype, {
    constructor: {
      value: NodePath,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperties(NPp, {
    node: {
      get: function() {
        Object.defineProperty(this, "node", {
          configurable: true,
          // Enable deletion.
          value: this._computeNode()
        });
        return this.node;
      }
    },
    parent: {
      get: function() {
        Object.defineProperty(this, "parent", {
          configurable: true,
          // Enable deletion.
          value: this._computeParent()
        });
        return this.parent;
      }
    },
    scope: {
      get: function() {
        Object.defineProperty(this, "scope", {
          configurable: true,
          // Enable deletion.
          value: this._computeScope()
        });
        return this.scope;
      }
    }
  });
  NPp.replace = function() {
    delete this.node;
    delete this.parent;
    delete this.scope;
    return Path2.prototype.replace.apply(this, arguments);
  };
  NPp.prune = function() {
    var remainingNodePath = this.parent;
    this.replace();
    return cleanUpNodesAfterPrune(remainingNodePath);
  };
  NPp._computeNode = function() {
    var value = this.value;
    if (n.Node.check(value)) {
      return value;
    }
    var pp = this.parentPath;
    return pp && pp.node || null;
  };
  NPp._computeParent = function() {
    var value = this.value;
    var pp = this.parentPath;
    if (!n.Node.check(value)) {
      while (pp && !n.Node.check(pp.value)) {
        pp = pp.parentPath;
      }
      if (pp) {
        pp = pp.parentPath;
      }
    }
    while (pp && !n.Node.check(pp.value)) {
      pp = pp.parentPath;
    }
    return pp || null;
  };
  NPp._computeScope = function() {
    var value = this.value;
    var pp = this.parentPath;
    var scope = pp && pp.scope;
    if (n.Node.check(value) && Scope2.isEstablishedBy(value)) {
      scope = new Scope2(this, scope);
    }
    return scope || null;
  };
  NPp.getValueProperty = function(name) {
    return types.getFieldValue(this.value, name);
  };
  NPp.needsParens = function(assumeExpressionContext) {
    var pp = this.parentPath;
    if (!pp) {
      return false;
    }
    var node = this.value;
    if (!n.Expression.check(node)) {
      return false;
    }
    if (node.type === "Identifier") {
      return false;
    }
    while (!n.Node.check(pp.value)) {
      pp = pp.parentPath;
      if (!pp) {
        return false;
      }
    }
    var parent = pp.value;
    switch (node.type) {
      case "UnaryExpression":
      case "SpreadElement":
      case "SpreadProperty":
        return parent.type === "MemberExpression" && this.name === "object" && parent.object === node;
      case "BinaryExpression":
      case "LogicalExpression":
        switch (parent.type) {
          case "CallExpression":
            return this.name === "callee" && parent.callee === node;
          case "UnaryExpression":
          case "SpreadElement":
          case "SpreadProperty":
            return true;
          case "MemberExpression":
            return this.name === "object" && parent.object === node;
          case "BinaryExpression":
          case "LogicalExpression": {
            const n2 = node;
            const po = parent.operator;
            const pp2 = PRECEDENCE[po];
            const no = n2.operator;
            const np = PRECEDENCE[no];
            if (pp2 > np) {
              return true;
            }
            if (pp2 === np && this.name === "right") {
              if (parent.right !== n2) {
                throw new Error("Nodes must be equal");
              }
              return true;
            }
          }
          default:
            return false;
        }
      case "SequenceExpression":
        switch (parent.type) {
          case "ForStatement":
            return false;
          case "ExpressionStatement":
            return this.name !== "expression";
          default:
            return true;
        }
      case "YieldExpression":
        switch (parent.type) {
          case "BinaryExpression":
          case "LogicalExpression":
          case "UnaryExpression":
          case "SpreadElement":
          case "SpreadProperty":
          case "CallExpression":
          case "MemberExpression":
          case "NewExpression":
          case "ConditionalExpression":
          case "YieldExpression":
            return true;
          default:
            return false;
        }
      case "Literal":
        return parent.type === "MemberExpression" && isNumber.check(node.value) && this.name === "object" && parent.object === node;
      case "AssignmentExpression":
      case "ConditionalExpression":
        switch (parent.type) {
          case "UnaryExpression":
          case "SpreadElement":
          case "SpreadProperty":
          case "BinaryExpression":
          case "LogicalExpression":
            return true;
          case "CallExpression":
            return this.name === "callee" && parent.callee === node;
          case "ConditionalExpression":
            return this.name === "test" && parent.test === node;
          case "MemberExpression":
            return this.name === "object" && parent.object === node;
          default:
            return false;
        }
      default:
        if (parent.type === "NewExpression" && this.name === "callee" && parent.callee === node) {
          return containsCallExpression(node);
        }
    }
    if (assumeExpressionContext !== true && !this.canBeFirstInStatement() && this.firstInStatement())
      return true;
    return false;
  };
  function isBinary(node) {
    return n.BinaryExpression.check(node) || n.LogicalExpression.check(node);
  }
  var PRECEDENCE = {};
  [
    ["||"],
    ["&&"],
    ["|"],
    ["^"],
    ["&"],
    ["==", "===", "!=", "!=="],
    ["<", ">", "<=", ">=", "in", "instanceof"],
    [">>", "<<", ">>>"],
    ["+", "-"],
    ["*", "/", "%"]
  ].forEach(function(tier, i) {
    tier.forEach(function(op) {
      PRECEDENCE[op] = i;
    });
  });
  function containsCallExpression(node) {
    if (n.CallExpression.check(node)) {
      return true;
    }
    if (isArray.check(node)) {
      return node.some(containsCallExpression);
    }
    if (n.Node.check(node)) {
      return types.someField(node, function(_name, child) {
        return containsCallExpression(child);
      });
    }
    return false;
  }
  NPp.canBeFirstInStatement = function() {
    var node = this.node;
    return !n.FunctionExpression.check(node) && !n.ObjectExpression.check(node);
  };
  NPp.firstInStatement = function() {
    return firstInStatement(this);
  };
  function firstInStatement(path) {
    for (var node, parent; path.parent; path = path.parent) {
      node = path.node;
      parent = path.parent.node;
      if (n.BlockStatement.check(parent) && path.parent.name === "body" && path.name === 0) {
        if (parent.body[0] !== node) {
          throw new Error("Nodes must be equal");
        }
        return true;
      }
      if (n.ExpressionStatement.check(parent) && path.name === "expression") {
        if (parent.expression !== node) {
          throw new Error("Nodes must be equal");
        }
        return true;
      }
      if (n.SequenceExpression.check(parent) && path.parent.name === "expressions" && path.name === 0) {
        if (parent.expressions[0] !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      if (n.CallExpression.check(parent) && path.name === "callee") {
        if (parent.callee !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      if (n.MemberExpression.check(parent) && path.name === "object") {
        if (parent.object !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      if (n.ConditionalExpression.check(parent) && path.name === "test") {
        if (parent.test !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      if (isBinary(parent) && path.name === "left") {
        if (parent.left !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      if (n.UnaryExpression.check(parent) && !parent.prefix && path.name === "argument") {
        if (parent.argument !== node) {
          throw new Error("Nodes must be equal");
        }
        continue;
      }
      return false;
    }
    return true;
  }
  function cleanUpNodesAfterPrune(remainingNodePath) {
    if (n.VariableDeclaration.check(remainingNodePath.node)) {
      var declarations = remainingNodePath.get("declarations").value;
      if (!declarations || declarations.length === 0) {
        return remainingNodePath.prune();
      }
    } else if (n.ExpressionStatement.check(remainingNodePath.node)) {
      if (!remainingNodePath.get("expression").value) {
        return remainingNodePath.prune();
      }
    } else if (n.IfStatement.check(remainingNodePath.node)) {
      cleanUpIfStatementAfterPrune(remainingNodePath);
    }
    return remainingNodePath;
  }
  function cleanUpIfStatementAfterPrune(ifStatement) {
    var testExpression = ifStatement.get("test").value;
    var alternate = ifStatement.get("alternate").value;
    var consequent = ifStatement.get("consequent").value;
    if (!consequent && !alternate) {
      var testExpressionStatement = b.expressionStatement(testExpression);
      ifStatement.replace(testExpressionStatement);
    } else if (!consequent && alternate) {
      var negatedTestExpression = b.unaryExpression("!", testExpression, true);
      if (n.UnaryExpression.check(testExpression) && testExpression.operator === "!") {
        negatedTestExpression = testExpression.argument;
      }
      ifStatement.get("test").replace(negatedTestExpression);
      ifStatement.get("consequent").replace(alternate);
      ifStatement.get("alternate").replace();
    }
  }
  return NodePath;
}
maybeSetModuleExports(() => module);

var hasOwn$3 = Object.prototype.hasOwnProperty;
function pathVisitorPlugin(fork) {
  var types = fork.use(typesPlugin);
  var NodePath2 = fork.use(nodePathPlugin);
  var isArray = types.builtInTypes.array;
  var isObject = types.builtInTypes.object;
  var isFunction = types.builtInTypes.function;
  var undefined$1;
  const PathVisitor = function PathVisitor2() {
    if (!(this instanceof PathVisitor2)) {
      throw new Error(
        "PathVisitor constructor cannot be invoked without 'new'"
      );
    }
    this._reusableContextStack = [];
    this._methodNameTable = computeMethodNameTable(this);
    this._shouldVisitComments = hasOwn$3.call(this._methodNameTable, "Block") || hasOwn$3.call(this._methodNameTable, "Line");
    this.Context = makeContextConstructor(this);
    this._visiting = false;
    this._changeReported = false;
  };
  function computeMethodNameTable(visitor) {
    var typeNames = /* @__PURE__ */ Object.create(null);
    for (var methodName in visitor) {
      if (/^visit[A-Z]/.test(methodName)) {
        typeNames[methodName.slice("visit".length)] = true;
      }
    }
    var supertypeTable = types.computeSupertypeLookupTable(typeNames);
    var methodNameTable = /* @__PURE__ */ Object.create(null);
    var typeNameKeys = Object.keys(supertypeTable);
    var typeNameCount = typeNameKeys.length;
    for (var i = 0; i < typeNameCount; ++i) {
      var typeName = typeNameKeys[i];
      methodName = "visit" + supertypeTable[typeName];
      if (isFunction.check(visitor[methodName])) {
        methodNameTable[typeName] = methodName;
      }
    }
    return methodNameTable;
  }
  PathVisitor.fromMethodsObject = function fromMethodsObject(methods) {
    if (methods instanceof PathVisitor) {
      return methods;
    }
    if (!isObject.check(methods)) {
      return new PathVisitor();
    }
    const Visitor = function Visitor2() {
      if (!(this instanceof Visitor2)) {
        throw new Error(
          "Visitor constructor cannot be invoked without 'new'"
        );
      }
      PathVisitor.call(this);
    };
    var Vp = Visitor.prototype = Object.create(PVp);
    Vp.constructor = Visitor;
    extend(Vp, methods);
    extend(Visitor, PathVisitor);
    isFunction.assert(Visitor.fromMethodsObject);
    isFunction.assert(Visitor.visit);
    return new Visitor();
  };
  function extend(target, source) {
    for (var property in source) {
      if (hasOwn$3.call(source, property)) {
        target[property] = source[property];
      }
    }
    return target;
  }
  PathVisitor.visit = function visit(node, methods) {
    return PathVisitor.fromMethodsObject(methods).visit(node);
  };
  var PVp = PathVisitor.prototype;
  PVp.visit = function() {
    if (this._visiting) {
      throw new Error(
        "Recursively calling visitor.visit(path) resets visitor state. Try this.visit(path) or this.traverse(path) instead."
      );
    }
    this._visiting = true;
    this._changeReported = false;
    this._abortRequested = false;
    var argc = arguments.length;
    var args = new Array(argc);
    for (var i = 0; i < argc; ++i) {
      args[i] = arguments[i];
    }
    if (!(args[0] instanceof NodePath2)) {
      args[0] = new NodePath2({ root: args[0] }).get("root");
    }
    this.reset.apply(this, args);
    var didNotThrow;
    try {
      var root = this.visitWithoutReset(args[0]);
      didNotThrow = true;
    } finally {
      this._visiting = false;
      if (!didNotThrow && this._abortRequested) {
        return args[0].value;
      }
    }
    return root;
  };
  PVp.AbortRequest = function AbortRequest() {
  };
  PVp.abort = function() {
    var visitor = this;
    visitor._abortRequested = true;
    var request = new visitor.AbortRequest();
    request.cancel = function() {
      visitor._abortRequested = false;
    };
    throw request;
  };
  PVp.reset = function(_path) {
  };
  PVp.visitWithoutReset = function(path) {
    if (this instanceof this.Context) {
      return this.visitor.visitWithoutReset(path);
    }
    if (!(path instanceof NodePath2)) {
      throw new Error("");
    }
    var value = path.value;
    var methodName = value && typeof value === "object" && typeof value.type === "string" && this._methodNameTable[value.type];
    if (methodName) {
      var context = this.acquireContext(path);
      try {
        return context.invokeVisitorMethod(methodName);
      } finally {
        this.releaseContext(context);
      }
    } else {
      return visitChildren(path, this);
    }
  };
  function visitChildren(path, visitor) {
    if (!(path instanceof NodePath2)) {
      throw new Error("");
    }
    if (!(visitor instanceof PathVisitor)) {
      throw new Error("");
    }
    var value = path.value;
    if (isArray.check(value)) {
      path.each(visitor.visitWithoutReset, visitor);
    } else if (!isObject.check(value)) ; else {
      var childNames = types.getFieldNames(value);
      if (visitor._shouldVisitComments && value.comments && childNames.indexOf("comments") < 0) {
        childNames.push("comments");
      }
      var childCount = childNames.length;
      var childPaths = [];
      for (var i = 0; i < childCount; ++i) {
        var childName = childNames[i];
        if (!hasOwn$3.call(value, childName)) {
          value[childName] = types.getFieldValue(value, childName);
        }
        childPaths.push(path.get(childName));
      }
      for (var i = 0; i < childCount; ++i) {
        visitor.visitWithoutReset(childPaths[i]);
      }
    }
    return path.value;
  }
  PVp.acquireContext = function(path) {
    if (this._reusableContextStack.length === 0) {
      return new this.Context(path);
    }
    return this._reusableContextStack.pop().reset(path);
  };
  PVp.releaseContext = function(context) {
    if (!(context instanceof this.Context)) {
      throw new Error("");
    }
    this._reusableContextStack.push(context);
    context.currentPath = null;
  };
  PVp.reportChanged = function() {
    this._changeReported = true;
  };
  PVp.wasChangeReported = function() {
    return this._changeReported;
  };
  function makeContextConstructor(visitor) {
    function Context(path) {
      if (!(this instanceof Context)) {
        throw new Error("");
      }
      if (!(this instanceof PathVisitor)) {
        throw new Error("");
      }
      if (!(path instanceof NodePath2)) {
        throw new Error("");
      }
      Object.defineProperty(this, "visitor", {
        value: visitor,
        writable: false,
        enumerable: true,
        configurable: false
      });
      this.currentPath = path;
      this.needToCallTraverse = true;
      Object.seal(this);
    }
    if (!(visitor instanceof PathVisitor)) {
      throw new Error("");
    }
    var Cp = Context.prototype = Object.create(visitor);
    Cp.constructor = Context;
    extend(Cp, sharedContextProtoMethods);
    return Context;
  }
  var sharedContextProtoMethods = /* @__PURE__ */ Object.create(null);
  sharedContextProtoMethods.reset = function reset(path) {
    if (!(this instanceof this.Context)) {
      throw new Error("");
    }
    if (!(path instanceof NodePath2)) {
      throw new Error("");
    }
    this.currentPath = path;
    this.needToCallTraverse = true;
    return this;
  };
  sharedContextProtoMethods.invokeVisitorMethod = function invokeVisitorMethod(methodName) {
    if (!(this instanceof this.Context)) {
      throw new Error("");
    }
    if (!(this.currentPath instanceof NodePath2)) {
      throw new Error("");
    }
    var result = this.visitor[methodName].call(this, this.currentPath);
    if (result === false) {
      this.needToCallTraverse = false;
    } else if (result !== undefined$1) {
      this.currentPath = this.currentPath.replace(result)[0];
      if (this.needToCallTraverse) {
        this.traverse(this.currentPath);
      }
    }
    if (this.needToCallTraverse !== false) {
      throw new Error(
        "Must either call this.traverse or return false in " + methodName
      );
    }
    var path = this.currentPath;
    return path && path.value;
  };
  sharedContextProtoMethods.traverse = function traverse(path, newVisitor) {
    if (!(this instanceof this.Context)) {
      throw new Error("");
    }
    if (!(path instanceof NodePath2)) {
      throw new Error("");
    }
    if (!(this.currentPath instanceof NodePath2)) {
      throw new Error("");
    }
    this.needToCallTraverse = false;
    return visitChildren(path, PathVisitor.fromMethodsObject(
      newVisitor || this.visitor
    ));
  };
  sharedContextProtoMethods.visit = function visit(path, newVisitor) {
    if (!(this instanceof this.Context)) {
      throw new Error("");
    }
    if (!(path instanceof NodePath2)) {
      throw new Error("");
    }
    if (!(this.currentPath instanceof NodePath2)) {
      throw new Error("");
    }
    this.needToCallTraverse = false;
    return PathVisitor.fromMethodsObject(
      newVisitor || this.visitor
    ).visitWithoutReset(path);
  };
  sharedContextProtoMethods.reportChanged = function reportChanged() {
    this.visitor.reportChanged();
  };
  sharedContextProtoMethods.abort = function abort() {
    this.needToCallTraverse = false;
    this.visitor.abort();
  };
  return PathVisitor;
}
maybeSetModuleExports(() => module);

function equivPlugin(fork) {
  var types = fork.use(typesPlugin);
  var getFieldNames = types.getFieldNames;
  var getFieldValue = types.getFieldValue;
  var isArray = types.builtInTypes.array;
  var isObject = types.builtInTypes.object;
  var isDate = types.builtInTypes.Date;
  var isRegExp = types.builtInTypes.RegExp;
  var hasOwn = Object.prototype.hasOwnProperty;
  function astNodesAreEquivalent(a, b, problemPath) {
    if (isArray.check(problemPath)) {
      problemPath.length = 0;
    } else {
      problemPath = null;
    }
    return areEquivalent(a, b, problemPath);
  }
  astNodesAreEquivalent.assert = function(a, b) {
    var problemPath = [];
    if (!astNodesAreEquivalent(a, b, problemPath)) {
      if (problemPath.length === 0) {
        if (a !== b) {
          throw new Error("Nodes must be equal");
        }
      } else {
        throw new Error(
          "Nodes differ in the following path: " + problemPath.map(subscriptForProperty).join("")
        );
      }
    }
  };
  function subscriptForProperty(property) {
    if (/[_$a-z][_$a-z0-9]*/i.test(property)) {
      return "." + property;
    }
    return "[" + JSON.stringify(property) + "]";
  }
  function areEquivalent(a, b, problemPath) {
    if (a === b) {
      return true;
    }
    if (isArray.check(a)) {
      return arraysAreEquivalent(a, b, problemPath);
    }
    if (isObject.check(a)) {
      return objectsAreEquivalent(a, b, problemPath);
    }
    if (isDate.check(a)) {
      return isDate.check(b) && +a === +b;
    }
    if (isRegExp.check(a)) {
      return isRegExp.check(b) && (a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase);
    }
    return a == b;
  }
  function arraysAreEquivalent(a, b, problemPath) {
    isArray.assert(a);
    var aLength = a.length;
    if (!isArray.check(b) || b.length !== aLength) {
      if (problemPath) {
        problemPath.push("length");
      }
      return false;
    }
    for (var i = 0; i < aLength; ++i) {
      if (problemPath) {
        problemPath.push(i);
      }
      if (i in a !== i in b) {
        return false;
      }
      if (!areEquivalent(a[i], b[i], problemPath)) {
        return false;
      }
      if (problemPath) {
        var problemPathTail = problemPath.pop();
        if (problemPathTail !== i) {
          throw new Error("" + problemPathTail);
        }
      }
    }
    return true;
  }
  function objectsAreEquivalent(a, b, problemPath) {
    isObject.assert(a);
    if (!isObject.check(b)) {
      return false;
    }
    if (a.type !== b.type) {
      if (problemPath) {
        problemPath.push("type");
      }
      return false;
    }
    var aNames = getFieldNames(a);
    var aNameCount = aNames.length;
    var bNames = getFieldNames(b);
    var bNameCount = bNames.length;
    if (aNameCount === bNameCount) {
      for (var i = 0; i < aNameCount; ++i) {
        var name = aNames[i];
        var aChild = getFieldValue(a, name);
        var bChild = getFieldValue(b, name);
        if (problemPath) {
          problemPath.push(name);
        }
        if (!areEquivalent(aChild, bChild, problemPath)) {
          return false;
        }
        if (problemPath) {
          var problemPathTail = problemPath.pop();
          if (problemPathTail !== name) {
            throw new Error("" + problemPathTail);
          }
        }
      }
      return true;
    }
    if (!problemPath) {
      return false;
    }
    var seenNames = /* @__PURE__ */ Object.create(null);
    for (i = 0; i < aNameCount; ++i) {
      seenNames[aNames[i]] = true;
    }
    for (i = 0; i < bNameCount; ++i) {
      name = bNames[i];
      if (!hasOwn.call(seenNames, name)) {
        problemPath.push(name);
        return false;
      }
      delete seenNames[name];
    }
    for (name in seenNames) {
      problemPath.push(name);
      break;
    }
    return false;
  }
  return astNodesAreEquivalent;
}
maybeSetModuleExports(() => module);

function fork(plugins) {
  const fork = createFork();
  const types = fork.use(typesPlugin);
  plugins.forEach(fork.use);
  types.finalize();
  const PathVisitor = fork.use(pathVisitorPlugin);
  return {
    Type: types.Type,
    builtInTypes: types.builtInTypes,
    namedTypes: types.namedTypes,
    builders: types.builders,
    defineMethod: types.defineMethod,
    getFieldNames: types.getFieldNames,
    getFieldValue: types.getFieldValue,
    eachField: types.eachField,
    someField: types.someField,
    getSupertypeNames: types.getSupertypeNames,
    getBuilderName: types.getBuilderName,
    astNodesAreEquivalent: fork.use(equivPlugin),
    finalize: types.finalize,
    Path: fork.use(pathPlugin),
    NodePath: fork.use(nodePathPlugin),
    PathVisitor,
    use: fork.use,
    visit: PathVisitor.visit
  };
}
function createFork() {
  const used = [];
  const usedResult = [];
  function use(plugin) {
    var idx = used.indexOf(plugin);
    if (idx === -1) {
      idx = used.length;
      used.push(plugin);
      usedResult[idx] = plugin(fork);
    }
    return usedResult[idx];
  }
  var fork = { use };
  return fork;
}
maybeSetModuleExports(() => module);

function coreOpsDef() {
  return {
    BinaryOperators: [
      "==",
      "!=",
      "===",
      "!==",
      "<",
      "<=",
      ">",
      ">=",
      "<<",
      ">>",
      ">>>",
      "+",
      "-",
      "*",
      "/",
      "%",
      "&",
      "|",
      "^",
      "in",
      "instanceof"
    ],
    AssignmentOperators: [
      "=",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "<<=",
      ">>=",
      ">>>=",
      "|=",
      "^=",
      "&="
    ],
    LogicalOperators: [
      "||",
      "&&"
    ]
  };
}
maybeSetModuleExports(() => module);

function es2016OpsDef(fork) {
  const result = fork.use(coreOpsDef);
  if (result.BinaryOperators.indexOf("**") < 0) {
    result.BinaryOperators.push("**");
  }
  if (result.AssignmentOperators.indexOf("**=") < 0) {
    result.AssignmentOperators.push("**=");
  }
  return result;
}
maybeSetModuleExports(() => module);

function es2020OpsDef(fork) {
  const result = fork.use(es2016OpsDef);
  if (result.LogicalOperators.indexOf("??") < 0) {
    result.LogicalOperators.push("??");
  }
  return result;
}
maybeSetModuleExports(() => module);

function es2021OpsDef(fork) {
  const result = fork.use(es2020OpsDef);
  result.LogicalOperators.forEach((op) => {
    const assignOp = op + "=";
    if (result.AssignmentOperators.indexOf(assignOp) < 0) {
      result.AssignmentOperators.push(assignOp);
    }
  });
  return result;
}
maybeSetModuleExports(() => module);

function coreDef(fork) {
  var types = fork.use(typesPlugin);
  var Type = types.Type;
  var def = Type.def;
  var or = Type.or;
  var shared = fork.use(sharedPlugin);
  var defaults = shared.defaults;
  var geq = shared.geq;
  const {
    BinaryOperators,
    AssignmentOperators,
    LogicalOperators
  } = fork.use(coreOpsDef);
  def("Printable").field("loc", or(
    def("SourceLocation"),
    null
  ), defaults["null"], true);
  def("Node").bases("Printable").field("type", String).field("comments", or(
    [def("Comment")],
    null
  ), defaults["null"], true);
  def("SourceLocation").field("start", def("Position")).field("end", def("Position")).field("source", or(String, null), defaults["null"]);
  def("Position").field("line", geq(1)).field("column", geq(0));
  def("File").bases("Node").build("program", "name").field("program", def("Program")).field("name", or(String, null), defaults["null"]);
  def("Program").bases("Node").build("body").field("body", [def("Statement")]);
  def("Function").bases("Node").field("id", or(def("Identifier"), null), defaults["null"]).field("params", [def("Pattern")]).field("body", def("BlockStatement")).field("generator", Boolean, defaults["false"]).field("async", Boolean, defaults["false"]);
  def("Statement").bases("Node");
  def("EmptyStatement").bases("Statement").build();
  def("BlockStatement").bases("Statement").build("body").field("body", [def("Statement")]);
  def("ExpressionStatement").bases("Statement").build("expression").field("expression", def("Expression"));
  def("IfStatement").bases("Statement").build("test", "consequent", "alternate").field("test", def("Expression")).field("consequent", def("Statement")).field("alternate", or(def("Statement"), null), defaults["null"]);
  def("LabeledStatement").bases("Statement").build("label", "body").field("label", def("Identifier")).field("body", def("Statement"));
  def("BreakStatement").bases("Statement").build("label").field("label", or(def("Identifier"), null), defaults["null"]);
  def("ContinueStatement").bases("Statement").build("label").field("label", or(def("Identifier"), null), defaults["null"]);
  def("WithStatement").bases("Statement").build("object", "body").field("object", def("Expression")).field("body", def("Statement"));
  def("SwitchStatement").bases("Statement").build("discriminant", "cases", "lexical").field("discriminant", def("Expression")).field("cases", [def("SwitchCase")]).field("lexical", Boolean, defaults["false"]);
  def("ReturnStatement").bases("Statement").build("argument").field("argument", or(def("Expression"), null));
  def("ThrowStatement").bases("Statement").build("argument").field("argument", def("Expression"));
  def("TryStatement").bases("Statement").build("block", "handler", "finalizer").field("block", def("BlockStatement")).field("handler", or(def("CatchClause"), null), function() {
    return this.handlers && this.handlers[0] || null;
  }).field("handlers", [def("CatchClause")], function() {
    return this.handler ? [this.handler] : [];
  }, true).field("guardedHandlers", [def("CatchClause")], defaults.emptyArray).field("finalizer", or(def("BlockStatement"), null), defaults["null"]);
  def("CatchClause").bases("Node").build("param", "guard", "body").field("param", def("Pattern")).field("guard", or(def("Expression"), null), defaults["null"]).field("body", def("BlockStatement"));
  def("WhileStatement").bases("Statement").build("test", "body").field("test", def("Expression")).field("body", def("Statement"));
  def("DoWhileStatement").bases("Statement").build("body", "test").field("body", def("Statement")).field("test", def("Expression"));
  def("ForStatement").bases("Statement").build("init", "test", "update", "body").field("init", or(
    def("VariableDeclaration"),
    def("Expression"),
    null
  )).field("test", or(def("Expression"), null)).field("update", or(def("Expression"), null)).field("body", def("Statement"));
  def("ForInStatement").bases("Statement").build("left", "right", "body").field("left", or(
    def("VariableDeclaration"),
    def("Expression")
  )).field("right", def("Expression")).field("body", def("Statement"));
  def("DebuggerStatement").bases("Statement").build();
  def("Declaration").bases("Statement");
  def("FunctionDeclaration").bases("Function", "Declaration").build("id", "params", "body").field("id", def("Identifier"));
  def("FunctionExpression").bases("Function", "Expression").build("id", "params", "body");
  def("VariableDeclaration").bases("Declaration").build("kind", "declarations").field("kind", or("var", "let", "const")).field("declarations", [def("VariableDeclarator")]);
  def("VariableDeclarator").bases("Node").build("id", "init").field("id", def("Pattern")).field("init", or(def("Expression"), null), defaults["null"]);
  def("Expression").bases("Node");
  def("ThisExpression").bases("Expression").build();
  def("ArrayExpression").bases("Expression").build("elements").field("elements", [or(def("Expression"), null)]);
  def("ObjectExpression").bases("Expression").build("properties").field("properties", [def("Property")]);
  def("Property").bases("Node").build("kind", "key", "value").field("kind", or("init", "get", "set")).field("key", or(def("Literal"), def("Identifier"))).field("value", def("Expression"));
  def("SequenceExpression").bases("Expression").build("expressions").field("expressions", [def("Expression")]);
  var UnaryOperator = or(
    "-",
    "+",
    "!",
    "~",
    "typeof",
    "void",
    "delete"
  );
  def("UnaryExpression").bases("Expression").build("operator", "argument", "prefix").field("operator", UnaryOperator).field("argument", def("Expression")).field("prefix", Boolean, defaults["true"]);
  const BinaryOperator = or(...BinaryOperators);
  def("BinaryExpression").bases("Expression").build("operator", "left", "right").field("operator", BinaryOperator).field("left", def("Expression")).field("right", def("Expression"));
  const AssignmentOperator = or(...AssignmentOperators);
  def("AssignmentExpression").bases("Expression").build("operator", "left", "right").field("operator", AssignmentOperator).field("left", or(def("Pattern"), def("MemberExpression"))).field("right", def("Expression"));
  var UpdateOperator = or("++", "--");
  def("UpdateExpression").bases("Expression").build("operator", "argument", "prefix").field("operator", UpdateOperator).field("argument", def("Expression")).field("prefix", Boolean);
  var LogicalOperator = or(...LogicalOperators);
  def("LogicalExpression").bases("Expression").build("operator", "left", "right").field("operator", LogicalOperator).field("left", def("Expression")).field("right", def("Expression"));
  def("ConditionalExpression").bases("Expression").build("test", "consequent", "alternate").field("test", def("Expression")).field("consequent", def("Expression")).field("alternate", def("Expression"));
  def("NewExpression").bases("Expression").build("callee", "arguments").field("callee", def("Expression")).field("arguments", [def("Expression")]);
  def("CallExpression").bases("Expression").build("callee", "arguments").field("callee", def("Expression")).field("arguments", [def("Expression")]);
  def("MemberExpression").bases("Expression").build("object", "property", "computed").field("object", def("Expression")).field("property", or(def("Identifier"), def("Expression"))).field("computed", Boolean, function() {
    var type = this.property.type;
    if (type === "Literal" || type === "MemberExpression" || type === "BinaryExpression") {
      return true;
    }
    return false;
  });
  def("Pattern").bases("Node");
  def("SwitchCase").bases("Node").build("test", "consequent").field("test", or(def("Expression"), null)).field("consequent", [def("Statement")]);
  def("Identifier").bases("Expression", "Pattern").build("name").field("name", String).field("optional", Boolean, defaults["false"]);
  def("Literal").bases("Expression").build("value").field("value", or(String, Boolean, null, Number, RegExp, BigInt));
  def("Comment").bases("Printable").field("value", String).field("leading", Boolean, defaults["true"]).field("trailing", Boolean, defaults["false"]);
}
maybeSetModuleExports(() => module);

function es6Def(fork) {
  fork.use(coreDef);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;
  def("Function").field("generator", Boolean, defaults["false"]).field("expression", Boolean, defaults["false"]).field("defaults", [or(def("Expression"), null)], defaults.emptyArray).field("rest", or(def("Identifier"), null), defaults["null"]);
  def("RestElement").bases("Pattern").build("argument").field("argument", def("Pattern")).field(
    "typeAnnotation",
    // for Babylon. Flow parser puts it on the identifier
    or(def("TypeAnnotation"), def("TSTypeAnnotation"), null),
    defaults["null"]
  );
  def("SpreadElementPattern").bases("Pattern").build("argument").field("argument", def("Pattern"));
  def("FunctionDeclaration").build("id", "params", "body", "generator", "expression").field("id", or(def("Identifier"), null));
  def("FunctionExpression").build("id", "params", "body", "generator", "expression");
  def("ArrowFunctionExpression").bases("Function", "Expression").build("params", "body", "expression").field("id", null, defaults["null"]).field("body", or(def("BlockStatement"), def("Expression"))).field("generator", false, defaults["false"]);
  def("ForOfStatement").bases("Statement").build("left", "right", "body").field("left", or(
    def("VariableDeclaration"),
    def("Pattern")
  )).field("right", def("Expression")).field("body", def("Statement"));
  def("YieldExpression").bases("Expression").build("argument", "delegate").field("argument", or(def("Expression"), null)).field("delegate", Boolean, defaults["false"]);
  def("GeneratorExpression").bases("Expression").build("body", "blocks", "filter").field("body", def("Expression")).field("blocks", [def("ComprehensionBlock")]).field("filter", or(def("Expression"), null));
  def("ComprehensionExpression").bases("Expression").build("body", "blocks", "filter").field("body", def("Expression")).field("blocks", [def("ComprehensionBlock")]).field("filter", or(def("Expression"), null));
  def("ComprehensionBlock").bases("Node").build("left", "right", "each").field("left", def("Pattern")).field("right", def("Expression")).field("each", Boolean);
  def("Property").field("key", or(def("Literal"), def("Identifier"), def("Expression"))).field("value", or(def("Expression"), def("Pattern"))).field("method", Boolean, defaults["false"]).field("shorthand", Boolean, defaults["false"]).field("computed", Boolean, defaults["false"]);
  def("ObjectProperty").field("shorthand", Boolean, defaults["false"]);
  def("PropertyPattern").bases("Pattern").build("key", "pattern").field("key", or(def("Literal"), def("Identifier"), def("Expression"))).field("pattern", def("Pattern")).field("computed", Boolean, defaults["false"]);
  def("ObjectPattern").bases("Pattern").build("properties").field("properties", [or(def("PropertyPattern"), def("Property"))]);
  def("ArrayPattern").bases("Pattern").build("elements").field("elements", [or(def("Pattern"), null)]);
  def("SpreadElement").bases("Node").build("argument").field("argument", def("Expression"));
  def("ArrayExpression").field("elements", [or(
    def("Expression"),
    def("SpreadElement"),
    def("RestElement"),
    null
  )]);
  def("NewExpression").field("arguments", [or(def("Expression"), def("SpreadElement"))]);
  def("CallExpression").field("arguments", [or(def("Expression"), def("SpreadElement"))]);
  def("AssignmentPattern").bases("Pattern").build("left", "right").field("left", def("Pattern")).field("right", def("Expression"));
  def("MethodDefinition").bases("Declaration").build("kind", "key", "value", "static").field("kind", or("constructor", "method", "get", "set")).field("key", def("Expression")).field("value", def("Function")).field("computed", Boolean, defaults["false"]).field("static", Boolean, defaults["false"]);
  const ClassBodyElement = or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty"),
    def("StaticBlock")
  );
  def("ClassProperty").bases("Declaration").build("key").field("key", or(def("Literal"), def("Identifier"), def("Expression"))).field("computed", Boolean, defaults["false"]);
  def("ClassPropertyDefinition").bases("Declaration").build("definition").field("definition", ClassBodyElement);
  def("ClassBody").bases("Declaration").build("body").field("body", [ClassBodyElement]);
  def("ClassDeclaration").bases("Declaration").build("id", "body", "superClass").field("id", or(def("Identifier"), null)).field("body", def("ClassBody")).field("superClass", or(def("Expression"), null), defaults["null"]);
  def("ClassExpression").bases("Expression").build("id", "body", "superClass").field("id", or(def("Identifier"), null), defaults["null"]).field("body", def("ClassBody")).field("superClass", or(def("Expression"), null), defaults["null"]);
  def("Super").bases("Expression").build();
  def("Specifier").bases("Node");
  def("ModuleSpecifier").bases("Specifier").field("local", or(def("Identifier"), null), defaults["null"]).field("id", or(def("Identifier"), null), defaults["null"]).field("name", or(def("Identifier"), null), defaults["null"]);
  def("ImportSpecifier").bases("ModuleSpecifier").build("imported", "local").field("imported", def("Identifier"));
  def("ImportDefaultSpecifier").bases("ModuleSpecifier").build("local");
  def("ImportNamespaceSpecifier").bases("ModuleSpecifier").build("local");
  def("ImportDeclaration").bases("Declaration").build("specifiers", "source", "importKind").field("specifiers", [or(
    def("ImportSpecifier"),
    def("ImportNamespaceSpecifier"),
    def("ImportDefaultSpecifier")
  )], defaults.emptyArray).field("source", def("Literal")).field("importKind", or(
    "value",
    "type"
  ), function() {
    return "value";
  });
  def("ExportNamedDeclaration").bases("Declaration").build("declaration", "specifiers", "source").field("declaration", or(def("Declaration"), null)).field("specifiers", [def("ExportSpecifier")], defaults.emptyArray).field("source", or(def("Literal"), null), defaults["null"]);
  def("ExportSpecifier").bases("ModuleSpecifier").build("local", "exported").field("exported", def("Identifier"));
  def("ExportDefaultDeclaration").bases("Declaration").build("declaration").field("declaration", or(def("Declaration"), def("Expression")));
  def("ExportAllDeclaration").bases("Declaration").build("source").field("source", def("Literal"));
  def("TaggedTemplateExpression").bases("Expression").build("tag", "quasi").field("tag", def("Expression")).field("quasi", def("TemplateLiteral"));
  def("TemplateLiteral").bases("Expression").build("quasis", "expressions").field("quasis", [def("TemplateElement")]).field("expressions", [def("Expression")]);
  def("TemplateElement").bases("Node").build("value", "tail").field("value", { "cooked": String, "raw": String }).field("tail", Boolean);
  def("MetaProperty").bases("Expression").build("meta", "property").field("meta", def("Identifier")).field("property", def("Identifier"));
}
maybeSetModuleExports(() => module);

function es2016Def(fork) {
  fork.use(es2016OpsDef);
  fork.use(es6Def);
}
maybeSetModuleExports(() => module);

function es2017Def(fork) {
  fork.use(es2016Def);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const defaults = fork.use(sharedPlugin).defaults;
  def("Function").field("async", Boolean, defaults["false"]);
  def("AwaitExpression").bases("Expression").build("argument").field("argument", def("Expression"));
}
maybeSetModuleExports(() => module);

function es2018Def(fork) {
  fork.use(es2017Def);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;
  def("ForOfStatement").field("await", Boolean, defaults["false"]);
  def("SpreadProperty").bases("Node").build("argument").field("argument", def("Expression"));
  def("ObjectExpression").field("properties", [or(
    def("Property"),
    def("SpreadProperty"),
    // Legacy
    def("SpreadElement")
  )]);
  def("TemplateElement").field("value", { "cooked": or(String, null), "raw": String });
  def("SpreadPropertyPattern").bases("Pattern").build("argument").field("argument", def("Pattern"));
  def("ObjectPattern").field("properties", [or(def("PropertyPattern"), def("Property"), def("RestElement"), def("SpreadPropertyPattern"))]);
}
maybeSetModuleExports(() => module);

function es2019Def(fork) {
  fork.use(es2018Def);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;
  def("CatchClause").field("param", or(def("Pattern"), null), defaults["null"]);
}
maybeSetModuleExports(() => module);

function es2020Def(fork) {
  fork.use(es2020OpsDef);
  fork.use(es2019Def);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const shared = fork.use(sharedPlugin);
  const defaults = shared.defaults;
  def("ImportExpression").bases("Expression").build("source").field("source", def("Expression"));
  def("ExportAllDeclaration").bases("Declaration").build("source", "exported").field("source", def("Literal")).field("exported", or(
    def("Identifier"),
    null,
    void 0
  ), defaults["null"]);
  def("ChainElement").bases("Node").field("optional", Boolean, defaults["false"]);
  def("CallExpression").bases("Expression", "ChainElement");
  def("MemberExpression").bases("Expression", "ChainElement");
  def("ChainExpression").bases("Expression").build("expression").field("expression", def("ChainElement"));
  def("OptionalCallExpression").bases("CallExpression").build("callee", "arguments", "optional").field("optional", Boolean, defaults["true"]);
  def("OptionalMemberExpression").bases("MemberExpression").build("object", "property", "computed", "optional").field("optional", Boolean, defaults["true"]);
}
maybeSetModuleExports(() => module);

function es2021Def(fork) {
  fork.use(es2021OpsDef);
  fork.use(es2020Def);
}
maybeSetModuleExports(() => module);

function es2022Def(fork) {
  fork.use(es2021Def);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  def("StaticBlock").bases("Declaration").build("body").field("body", [def("Statement")]);
}
maybeSetModuleExports(() => module);

function esProposalsDef(fork) {
  fork.use(es2022Def);
  const types = fork.use(typesPlugin);
  const Type = types.Type;
  const def = types.Type.def;
  const or = Type.or;
  const shared = fork.use(sharedPlugin);
  const defaults = shared.defaults;
  def("AwaitExpression").build("argument", "all").field("argument", or(def("Expression"), null)).field("all", Boolean, defaults["false"]);
  def("Decorator").bases("Node").build("expression").field("expression", def("Expression"));
  def("Property").field(
    "decorators",
    or([def("Decorator")], null),
    defaults["null"]
  );
  def("MethodDefinition").field(
    "decorators",
    or([def("Decorator")], null),
    defaults["null"]
  );
  def("PrivateName").bases("Expression", "Pattern").build("id").field("id", def("Identifier"));
  def("ClassPrivateProperty").bases("ClassProperty").build("key", "value").field("key", def("PrivateName")).field("value", or(def("Expression"), null), defaults["null"]);
  def("ImportAttribute").bases("Node").build("key", "value").field("key", or(def("Identifier"), def("Literal"))).field("value", def("Expression"));
  [
    "ImportDeclaration",
    "ExportAllDeclaration",
    "ExportNamedDeclaration"
  ].forEach((decl) => {
    def(decl).field(
      "assertions",
      [def("ImportAttribute")],
      defaults.emptyArray
    );
  });
  def("RecordExpression").bases("Expression").build("properties").field("properties", [or(
    def("ObjectProperty"),
    def("ObjectMethod"),
    def("SpreadElement")
  )]);
  def("TupleExpression").bases("Expression").build("elements").field("elements", [or(
    def("Expression"),
    def("SpreadElement"),
    null
  )]);
  def("ModuleExpression").bases("Node").build("body").field("body", def("Program"));
}
maybeSetModuleExports(() => module);

function jsxDef(fork) {
  fork.use(esProposalsDef);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;
  def("JSXAttribute").bases("Node").build("name", "value").field("name", or(def("JSXIdentifier"), def("JSXNamespacedName"))).field("value", or(
    def("Literal"),
    // attr="value"
    def("JSXExpressionContainer"),
    // attr={value}
    def("JSXElement"),
    // attr=<div />
    def("JSXFragment"),
    // attr=<></>
    null
    // attr= or just attr
  ), defaults["null"]);
  def("JSXIdentifier").bases("Identifier").build("name").field("name", String);
  def("JSXNamespacedName").bases("Node").build("namespace", "name").field("namespace", def("JSXIdentifier")).field("name", def("JSXIdentifier"));
  def("JSXMemberExpression").bases("MemberExpression").build("object", "property").field("object", or(def("JSXIdentifier"), def("JSXMemberExpression"))).field("property", def("JSXIdentifier")).field("computed", Boolean, defaults.false);
  const JSXElementName = or(
    def("JSXIdentifier"),
    def("JSXNamespacedName"),
    def("JSXMemberExpression")
  );
  def("JSXSpreadAttribute").bases("Node").build("argument").field("argument", def("Expression"));
  const JSXAttributes = [or(
    def("JSXAttribute"),
    def("JSXSpreadAttribute")
  )];
  def("JSXExpressionContainer").bases("Expression").build("expression").field("expression", or(def("Expression"), def("JSXEmptyExpression")));
  const JSXChildren = [or(
    def("JSXText"),
    def("JSXExpressionContainer"),
    def("JSXSpreadChild"),
    def("JSXElement"),
    def("JSXFragment"),
    def("Literal")
    // Legacy: Esprima should return JSXText instead.
  )];
  def("JSXElement").bases("Expression").build("openingElement", "closingElement", "children").field("openingElement", def("JSXOpeningElement")).field("closingElement", or(def("JSXClosingElement"), null), defaults["null"]).field("children", JSXChildren, defaults.emptyArray).field("name", JSXElementName, function() {
    return this.openingElement.name;
  }, true).field("selfClosing", Boolean, function() {
    return this.openingElement.selfClosing;
  }, true).field("attributes", JSXAttributes, function() {
    return this.openingElement.attributes;
  }, true);
  def("JSXOpeningElement").bases("Node").build("name", "attributes", "selfClosing").field("name", JSXElementName).field("attributes", JSXAttributes, defaults.emptyArray).field("selfClosing", Boolean, defaults["false"]);
  def("JSXClosingElement").bases("Node").build("name").field("name", JSXElementName);
  def("JSXFragment").bases("Expression").build("openingFragment", "closingFragment", "children").field("openingFragment", def("JSXOpeningFragment")).field("closingFragment", def("JSXClosingFragment")).field("children", JSXChildren, defaults.emptyArray);
  def("JSXOpeningFragment").bases("Node").build();
  def("JSXClosingFragment").bases("Node").build();
  def("JSXText").bases("Literal").build("value", "raw").field("value", String).field("raw", String, function() {
    return this.value;
  });
  def("JSXEmptyExpression").bases("Node").build();
  def("JSXSpreadChild").bases("Node").build("expression").field("expression", def("Expression"));
}
maybeSetModuleExports(() => module);

function typeAnnotationsDef(fork) {
  var types = fork.use(typesPlugin);
  var def = types.Type.def;
  var or = types.Type.or;
  var defaults = fork.use(sharedPlugin).defaults;
  var TypeAnnotation = or(
    def("TypeAnnotation"),
    def("TSTypeAnnotation"),
    null
  );
  var TypeParamDecl = or(
    def("TypeParameterDeclaration"),
    def("TSTypeParameterDeclaration"),
    null
  );
  def("Identifier").field("typeAnnotation", TypeAnnotation, defaults["null"]);
  def("ObjectPattern").field("typeAnnotation", TypeAnnotation, defaults["null"]);
  def("Function").field("returnType", TypeAnnotation, defaults["null"]).field("typeParameters", TypeParamDecl, defaults["null"]);
  def("ClassProperty").build("key", "value", "typeAnnotation", "static").field("value", or(def("Expression"), null)).field("static", Boolean, defaults["false"]).field("typeAnnotation", TypeAnnotation, defaults["null"]);
  [
    "ClassDeclaration",
    "ClassExpression"
  ].forEach((typeName) => {
    def(typeName).field("typeParameters", TypeParamDecl, defaults["null"]).field(
      "superTypeParameters",
      or(
        def("TypeParameterInstantiation"),
        def("TSTypeParameterInstantiation"),
        null
      ),
      defaults["null"]
    ).field(
      "implements",
      or(
        [def("ClassImplements")],
        [def("TSExpressionWithTypeArguments")]
      ),
      defaults.emptyArray
    );
  });
}
maybeSetModuleExports(() => module);

function flowDef(fork) {
  fork.use(esProposalsDef);
  fork.use(typeAnnotationsDef);
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;
  def("Flow").bases("Node");
  def("FlowType").bases("Flow");
  def("AnyTypeAnnotation").bases("FlowType").build();
  def("EmptyTypeAnnotation").bases("FlowType").build();
  def("MixedTypeAnnotation").bases("FlowType").build();
  def("VoidTypeAnnotation").bases("FlowType").build();
  def("SymbolTypeAnnotation").bases("FlowType").build();
  def("NumberTypeAnnotation").bases("FlowType").build();
  def("BigIntTypeAnnotation").bases("FlowType").build();
  def("NumberLiteralTypeAnnotation").bases("FlowType").build("value", "raw").field("value", Number).field("raw", String);
  def("NumericLiteralTypeAnnotation").bases("FlowType").build("value", "raw").field("value", Number).field("raw", String);
  def("BigIntLiteralTypeAnnotation").bases("FlowType").build("value", "raw").field("value", null).field("raw", String);
  def("StringTypeAnnotation").bases("FlowType").build();
  def("StringLiteralTypeAnnotation").bases("FlowType").build("value", "raw").field("value", String).field("raw", String);
  def("BooleanTypeAnnotation").bases("FlowType").build();
  def("BooleanLiteralTypeAnnotation").bases("FlowType").build("value", "raw").field("value", Boolean).field("raw", String);
  def("TypeAnnotation").bases("Node").build("typeAnnotation").field("typeAnnotation", def("FlowType"));
  def("NullableTypeAnnotation").bases("FlowType").build("typeAnnotation").field("typeAnnotation", def("FlowType"));
  def("NullLiteralTypeAnnotation").bases("FlowType").build();
  def("NullTypeAnnotation").bases("FlowType").build();
  def("ThisTypeAnnotation").bases("FlowType").build();
  def("ExistsTypeAnnotation").bases("FlowType").build();
  def("ExistentialTypeParam").bases("FlowType").build();
  def("FunctionTypeAnnotation").bases("FlowType").build("params", "returnType", "rest", "typeParameters").field("params", [def("FunctionTypeParam")]).field("returnType", def("FlowType")).field("rest", or(def("FunctionTypeParam"), null)).field("typeParameters", or(def("TypeParameterDeclaration"), null));
  def("FunctionTypeParam").bases("Node").build("name", "typeAnnotation", "optional").field("name", or(def("Identifier"), null)).field("typeAnnotation", def("FlowType")).field("optional", Boolean);
  def("ArrayTypeAnnotation").bases("FlowType").build("elementType").field("elementType", def("FlowType"));
  def("ObjectTypeAnnotation").bases("FlowType").build("properties", "indexers", "callProperties").field("properties", [
    or(
      def("ObjectTypeProperty"),
      def("ObjectTypeSpreadProperty")
    )
  ]).field("indexers", [def("ObjectTypeIndexer")], defaults.emptyArray).field(
    "callProperties",
    [def("ObjectTypeCallProperty")],
    defaults.emptyArray
  ).field("inexact", or(Boolean, void 0), defaults["undefined"]).field("exact", Boolean, defaults["false"]).field("internalSlots", [def("ObjectTypeInternalSlot")], defaults.emptyArray);
  def("Variance").bases("Node").build("kind").field("kind", or("plus", "minus"));
  const LegacyVariance = or(
    def("Variance"),
    "plus",
    "minus",
    null
  );
  def("ObjectTypeProperty").bases("Node").build("key", "value", "optional").field("key", or(def("Literal"), def("Identifier"))).field("value", def("FlowType")).field("optional", Boolean).field("variance", LegacyVariance, defaults["null"]);
  def("ObjectTypeIndexer").bases("Node").build("id", "key", "value").field("id", def("Identifier")).field("key", def("FlowType")).field("value", def("FlowType")).field("variance", LegacyVariance, defaults["null"]).field("static", Boolean, defaults["false"]);
  def("ObjectTypeCallProperty").bases("Node").build("value").field("value", def("FunctionTypeAnnotation")).field("static", Boolean, defaults["false"]);
  def("QualifiedTypeIdentifier").bases("Node").build("qualification", "id").field(
    "qualification",
    or(
      def("Identifier"),
      def("QualifiedTypeIdentifier")
    )
  ).field("id", def("Identifier"));
  def("GenericTypeAnnotation").bases("FlowType").build("id", "typeParameters").field("id", or(def("Identifier"), def("QualifiedTypeIdentifier"))).field("typeParameters", or(def("TypeParameterInstantiation"), null));
  def("MemberTypeAnnotation").bases("FlowType").build("object", "property").field("object", def("Identifier")).field(
    "property",
    or(
      def("MemberTypeAnnotation"),
      def("GenericTypeAnnotation")
    )
  );
  def("IndexedAccessType").bases("FlowType").build("objectType", "indexType").field("objectType", def("FlowType")).field("indexType", def("FlowType"));
  def("OptionalIndexedAccessType").bases("FlowType").build("objectType", "indexType", "optional").field("objectType", def("FlowType")).field("indexType", def("FlowType")).field("optional", Boolean);
  def("UnionTypeAnnotation").bases("FlowType").build("types").field("types", [def("FlowType")]);
  def("IntersectionTypeAnnotation").bases("FlowType").build("types").field("types", [def("FlowType")]);
  def("TypeofTypeAnnotation").bases("FlowType").build("argument").field("argument", def("FlowType"));
  def("ObjectTypeSpreadProperty").bases("Node").build("argument").field("argument", def("FlowType"));
  def("ObjectTypeInternalSlot").bases("Node").build("id", "value", "optional", "static", "method").field("id", def("Identifier")).field("value", def("FlowType")).field("optional", Boolean).field("static", Boolean).field("method", Boolean);
  def("TypeParameterDeclaration").bases("Node").build("params").field("params", [def("TypeParameter")]);
  def("TypeParameterInstantiation").bases("Node").build("params").field("params", [def("FlowType")]);
  def("TypeParameter").bases("FlowType").build("name", "variance", "bound", "default").field("name", String).field("variance", LegacyVariance, defaults["null"]).field("bound", or(def("TypeAnnotation"), null), defaults["null"]).field("default", or(def("FlowType"), null), defaults["null"]);
  def("ClassProperty").field("variance", LegacyVariance, defaults["null"]);
  def("ClassImplements").bases("Node").build("id").field("id", def("Identifier")).field("superClass", or(def("Expression"), null), defaults["null"]).field(
    "typeParameters",
    or(def("TypeParameterInstantiation"), null),
    defaults["null"]
  );
  def("InterfaceTypeAnnotation").bases("FlowType").build("body", "extends").field("body", def("ObjectTypeAnnotation")).field("extends", or([def("InterfaceExtends")], null), defaults["null"]);
  def("InterfaceDeclaration").bases("Declaration").build("id", "body", "extends").field("id", def("Identifier")).field(
    "typeParameters",
    or(def("TypeParameterDeclaration"), null),
    defaults["null"]
  ).field("body", def("ObjectTypeAnnotation")).field("extends", [def("InterfaceExtends")]);
  def("DeclareInterface").bases("InterfaceDeclaration").build("id", "body", "extends");
  def("InterfaceExtends").bases("Node").build("id").field("id", def("Identifier")).field(
    "typeParameters",
    or(def("TypeParameterInstantiation"), null),
    defaults["null"]
  );
  def("TypeAlias").bases("Declaration").build("id", "typeParameters", "right").field("id", def("Identifier")).field("typeParameters", or(def("TypeParameterDeclaration"), null)).field("right", def("FlowType"));
  def("DeclareTypeAlias").bases("TypeAlias").build("id", "typeParameters", "right");
  def("OpaqueType").bases("Declaration").build("id", "typeParameters", "impltype", "supertype").field("id", def("Identifier")).field("typeParameters", or(def("TypeParameterDeclaration"), null)).field("impltype", def("FlowType")).field("supertype", or(def("FlowType"), null));
  def("DeclareOpaqueType").bases("OpaqueType").build("id", "typeParameters", "supertype").field("impltype", or(def("FlowType"), null));
  def("TypeCastExpression").bases("Expression").build("expression", "typeAnnotation").field("expression", def("Expression")).field("typeAnnotation", def("TypeAnnotation"));
  def("TupleTypeAnnotation").bases("FlowType").build("types").field("types", [def("FlowType")]);
  def("DeclareVariable").bases("Statement").build("id").field("id", def("Identifier"));
  def("DeclareFunction").bases("Statement").build("id").field("id", def("Identifier")).field("predicate", or(def("FlowPredicate"), null), defaults["null"]);
  def("DeclareClass").bases("InterfaceDeclaration").build("id");
  def("DeclareModule").bases("Statement").build("id", "body").field("id", or(def("Identifier"), def("Literal"))).field("body", def("BlockStatement"));
  def("DeclareModuleExports").bases("Statement").build("typeAnnotation").field("typeAnnotation", def("TypeAnnotation"));
  def("DeclareExportDeclaration").bases("Declaration").build("default", "declaration", "specifiers", "source").field("default", Boolean).field("declaration", or(
    def("DeclareVariable"),
    def("DeclareFunction"),
    def("DeclareClass"),
    def("FlowType"),
    // Implies default.
    def("TypeAlias"),
    // Implies named type
    def("DeclareOpaqueType"),
    // Implies named opaque type
    def("InterfaceDeclaration"),
    null
  )).field("specifiers", [or(
    def("ExportSpecifier"),
    def("ExportBatchSpecifier")
  )], defaults.emptyArray).field("source", or(
    def("Literal"),
    null
  ), defaults["null"]);
  def("DeclareExportAllDeclaration").bases("Declaration").build("source").field("source", or(
    def("Literal"),
    null
  ), defaults["null"]);
  def("ImportDeclaration").field("importKind", or("value", "type", "typeof"), () => "value");
  def("FlowPredicate").bases("Flow");
  def("InferredPredicate").bases("FlowPredicate").build();
  def("DeclaredPredicate").bases("FlowPredicate").build("value").field("value", def("Expression"));
  def("Function").field("predicate", or(def("FlowPredicate"), null), defaults["null"]);
  def("CallExpression").field("typeArguments", or(
    null,
    def("TypeParameterInstantiation")
  ), defaults["null"]);
  def("NewExpression").field("typeArguments", or(
    null,
    def("TypeParameterInstantiation")
  ), defaults["null"]);
  def("EnumDeclaration").bases("Declaration").build("id", "body").field("id", def("Identifier")).field("body", or(
    def("EnumBooleanBody"),
    def("EnumNumberBody"),
    def("EnumStringBody"),
    def("EnumSymbolBody")
  ));
  def("EnumBooleanBody").build("members", "explicitType").field("members", [def("EnumBooleanMember")]).field("explicitType", Boolean);
  def("EnumNumberBody").build("members", "explicitType").field("members", [def("EnumNumberMember")]).field("explicitType", Boolean);
  def("EnumStringBody").build("members", "explicitType").field("members", or([def("EnumStringMember")], [def("EnumDefaultedMember")])).field("explicitType", Boolean);
  def("EnumSymbolBody").build("members").field("members", [def("EnumDefaultedMember")]);
  def("EnumBooleanMember").build("id", "init").field("id", def("Identifier")).field("init", or(def("Literal"), Boolean));
  def("EnumNumberMember").build("id", "init").field("id", def("Identifier")).field("init", def("Literal"));
  def("EnumStringMember").build("id", "init").field("id", def("Identifier")).field("init", def("Literal"));
  def("EnumDefaultedMember").build("id").field("id", def("Identifier"));
}
maybeSetModuleExports(() => module);

function esprimaDef(fork) {
  fork.use(esProposalsDef);
  var types = fork.use(typesPlugin);
  var defaults = fork.use(sharedPlugin).defaults;
  var def = types.Type.def;
  var or = types.Type.or;
  def("VariableDeclaration").field("declarations", [or(
    def("VariableDeclarator"),
    def("Identifier")
    // Esprima deviation.
  )]);
  def("Property").field("value", or(
    def("Expression"),
    def("Pattern")
    // Esprima deviation.
  ));
  def("ArrayPattern").field("elements", [or(
    def("Pattern"),
    def("SpreadElement"),
    null
  )]);
  def("ObjectPattern").field("properties", [or(
    def("Property"),
    def("PropertyPattern"),
    def("SpreadPropertyPattern"),
    def("SpreadProperty")
    // Used by Esprima.
  )]);
  def("ExportSpecifier").bases("ModuleSpecifier").build("id", "name");
  def("ExportBatchSpecifier").bases("Specifier").build();
  def("ExportDeclaration").bases("Declaration").build("default", "declaration", "specifiers", "source").field("default", Boolean).field("declaration", or(
    def("Declaration"),
    def("Expression"),
    // Implies default.
    null
  )).field("specifiers", [or(
    def("ExportSpecifier"),
    def("ExportBatchSpecifier")
  )], defaults.emptyArray).field("source", or(
    def("Literal"),
    null
  ), defaults["null"]);
  def("Block").bases("Comment").build(
    "value",
    /*optional:*/
    "leading",
    "trailing"
  );
  def("Line").bases("Comment").build(
    "value",
    /*optional:*/
    "leading",
    "trailing"
  );
}
maybeSetModuleExports(() => module);

function babelCoreDef(fork) {
  fork.use(esProposalsDef);
  const types = fork.use(typesPlugin);
  const defaults = fork.use(sharedPlugin).defaults;
  const def = types.Type.def;
  const or = types.Type.or;
  const {
    undefined: isUndefined
  } = types.builtInTypes;
  def("Noop").bases("Statement").build();
  def("DoExpression").bases("Expression").build("body").field("body", [def("Statement")]);
  def("BindExpression").bases("Expression").build("object", "callee").field("object", or(def("Expression"), null)).field("callee", def("Expression"));
  def("ParenthesizedExpression").bases("Expression").build("expression").field("expression", def("Expression"));
  def("ExportNamespaceSpecifier").bases("Specifier").build("exported").field("exported", def("Identifier"));
  def("ExportDefaultSpecifier").bases("Specifier").build("exported").field("exported", def("Identifier"));
  def("CommentBlock").bases("Comment").build(
    "value",
    /*optional:*/
    "leading",
    "trailing"
  );
  def("CommentLine").bases("Comment").build(
    "value",
    /*optional:*/
    "leading",
    "trailing"
  );
  def("Directive").bases("Node").build("value").field("value", def("DirectiveLiteral"));
  def("DirectiveLiteral").bases("Node", "Expression").build("value").field("value", String, defaults["use strict"]);
  def("InterpreterDirective").bases("Node").build("value").field("value", String);
  def("BlockStatement").bases("Statement").build("body").field("body", [def("Statement")]).field("directives", [def("Directive")], defaults.emptyArray);
  def("Program").bases("Node").build("body").field("body", [def("Statement")]).field("directives", [def("Directive")], defaults.emptyArray).field("interpreter", or(def("InterpreterDirective"), null), defaults["null"]);
  function makeLiteralExtra(rawValueType = String, toRaw) {
    return [
      "extra",
      {
        rawValue: rawValueType,
        raw: String
      },
      function getDefault() {
        const value = types.getFieldValue(this, "value");
        return {
          rawValue: value,
          raw: toRaw ? toRaw(value) : String(value)
        };
      }
    ];
  }
  def("StringLiteral").bases("Literal").build("value").field("value", String).field(...makeLiteralExtra(String, (val) => JSON.stringify(val)));
  def("NumericLiteral").bases("Literal").build("value").field("value", Number).field("raw", or(String, null), defaults["null"]).field(...makeLiteralExtra(Number));
  def("BigIntLiteral").bases("Literal").build("value").field("value", or(String, Number)).field(...makeLiteralExtra(String, (val) => val + "n"));
  def("DecimalLiteral").bases("Literal").build("value").field("value", String).field(...makeLiteralExtra(String, (val) => val + "m"));
  def("NullLiteral").bases("Literal").build().field("value", null, defaults["null"]);
  def("BooleanLiteral").bases("Literal").build("value").field("value", Boolean);
  def("RegExpLiteral").bases("Literal").build("pattern", "flags").field("pattern", String).field("flags", String).field("value", RegExp, function() {
    return new RegExp(this.pattern, this.flags);
  }).field(...makeLiteralExtra(
    or(RegExp, isUndefined),
    (exp) => `/${exp.pattern}/${exp.flags || ""}`
  )).field("regex", {
    pattern: String,
    flags: String
  }, function() {
    return {
      pattern: this.pattern,
      flags: this.flags
    };
  });
  var ObjectExpressionProperty = or(
    def("Property"),
    def("ObjectMethod"),
    def("ObjectProperty"),
    def("SpreadProperty"),
    def("SpreadElement")
  );
  def("ObjectExpression").bases("Expression").build("properties").field("properties", [ObjectExpressionProperty]);
  def("ObjectMethod").bases("Node", "Function").build("kind", "key", "params", "body", "computed").field("kind", or("method", "get", "set")).field("key", or(def("Literal"), def("Identifier"), def("Expression"))).field("params", [def("Pattern")]).field("body", def("BlockStatement")).field("computed", Boolean, defaults["false"]).field("generator", Boolean, defaults["false"]).field("async", Boolean, defaults["false"]).field(
    "accessibility",
    // TypeScript
    or(def("Literal"), null),
    defaults["null"]
  ).field(
    "decorators",
    or([def("Decorator")], null),
    defaults["null"]
  );
  def("ObjectProperty").bases("Node").build("key", "value").field("key", or(def("Literal"), def("Identifier"), def("Expression"))).field("value", or(def("Expression"), def("Pattern"))).field(
    "accessibility",
    // TypeScript
    or(def("Literal"), null),
    defaults["null"]
  ).field("computed", Boolean, defaults["false"]);
  var ClassBodyElement = or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty"),
    def("ClassPrivateProperty"),
    def("ClassMethod"),
    def("ClassPrivateMethod"),
    def("ClassAccessorProperty"),
    def("StaticBlock")
  );
  def("ClassBody").bases("Declaration").build("body").field("body", [ClassBodyElement]);
  def("ClassMethod").bases("Declaration", "Function").build("kind", "key", "params", "body", "computed", "static").field("key", or(def("Literal"), def("Identifier"), def("Expression")));
  def("ClassPrivateMethod").bases("Declaration", "Function").build("key", "params", "body", "kind", "computed", "static").field("key", def("PrivateName"));
  def("ClassAccessorProperty").bases("Declaration").build("key", "value", "decorators", "computed", "static").field("key", or(
    def("Literal"),
    def("Identifier"),
    def("PrivateName"),
    // Only when .computed is true (TODO enforce this)
    def("Expression")
  )).field("value", or(def("Expression"), null), defaults["null"]);
  [
    "ClassMethod",
    "ClassPrivateMethod"
  ].forEach((typeName) => {
    def(typeName).field("kind", or("get", "set", "method", "constructor"), () => "method").field("body", def("BlockStatement")).field("access", or("public", "private", "protected", null), defaults["null"]);
  });
  [
    "ClassMethod",
    "ClassPrivateMethod",
    "ClassAccessorProperty"
  ].forEach((typeName) => {
    def(typeName).field("computed", Boolean, defaults["false"]).field("static", Boolean, defaults["false"]).field("abstract", Boolean, defaults["false"]).field("accessibility", or("public", "private", "protected", null), defaults["null"]).field("decorators", or([def("Decorator")], null), defaults["null"]).field("definite", Boolean, defaults["false"]).field("optional", Boolean, defaults["false"]).field("override", Boolean, defaults["false"]).field("readonly", Boolean, defaults["false"]);
  });
  var ObjectPatternProperty = or(
    def("Property"),
    def("PropertyPattern"),
    def("SpreadPropertyPattern"),
    def("SpreadProperty"),
    // Used by Esprima
    def("ObjectProperty"),
    // Babel 6
    def("RestProperty"),
    // Babel 6
    def("RestElement")
    // Babel 6
  );
  def("ObjectPattern").bases("Pattern").build("properties").field("properties", [ObjectPatternProperty]).field(
    "decorators",
    or([def("Decorator")], null),
    defaults["null"]
  );
  def("SpreadProperty").bases("Node").build("argument").field("argument", def("Expression"));
  def("RestProperty").bases("Node").build("argument").field("argument", def("Expression"));
  def("ForAwaitStatement").bases("Statement").build("left", "right", "body").field("left", or(
    def("VariableDeclaration"),
    def("Expression")
  )).field("right", def("Expression")).field("body", def("Statement"));
  def("Import").bases("Expression").build();
}
maybeSetModuleExports(() => module);

function babelDef(fork) {
  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  fork.use(babelCoreDef);
  fork.use(flowDef);
  def("V8IntrinsicIdentifier").bases("Expression").build("name").field("name", String);
  def("TopicReference").bases("Expression").build();
}
maybeSetModuleExports(() => module);

function typescriptDef(fork) {
  fork.use(babelCoreDef);
  fork.use(typeAnnotationsDef);
  var types = fork.use(typesPlugin);
  var n = types.namedTypes;
  var def = types.Type.def;
  var or = types.Type.or;
  var defaults = fork.use(sharedPlugin).defaults;
  var StringLiteral = types.Type.from(function(value, deep) {
    if (n.StringLiteral && n.StringLiteral.check(value, deep)) {
      return true;
    }
    if (n.Literal && n.Literal.check(value, deep) && typeof value.value === "string") {
      return true;
    }
    return false;
  }, "StringLiteral");
  def("TSType").bases("Node");
  var TSEntityName = or(
    def("Identifier"),
    def("TSQualifiedName")
  );
  def("TSTypeReference").bases("TSType", "TSHasOptionalTypeParameterInstantiation").build("typeName", "typeParameters").field("typeName", TSEntityName);
  def("TSHasOptionalTypeParameterInstantiation").field(
    "typeParameters",
    or(def("TSTypeParameterInstantiation"), null),
    defaults["null"]
  );
  def("TSHasOptionalTypeParameters").field(
    "typeParameters",
    or(def("TSTypeParameterDeclaration"), null, void 0),
    defaults["null"]
  );
  def("TSHasOptionalTypeAnnotation").field(
    "typeAnnotation",
    or(def("TSTypeAnnotation"), null),
    defaults["null"]
  );
  def("TSQualifiedName").bases("Node").build("left", "right").field("left", TSEntityName).field("right", TSEntityName);
  def("TSAsExpression").bases("Expression", "Pattern").build("expression", "typeAnnotation").field("expression", def("Expression")).field("typeAnnotation", def("TSType")).field(
    "extra",
    or({ parenthesized: Boolean }, null),
    defaults["null"]
  );
  def("TSTypeCastExpression").bases("Expression").build("expression", "typeAnnotation").field("expression", def("Expression")).field("typeAnnotation", def("TSType"));
  def("TSSatisfiesExpression").bases("Expression", "Pattern").build("expression", "typeAnnotation").field("expression", def("Expression")).field("typeAnnotation", def("TSType"));
  def("TSNonNullExpression").bases("Expression", "Pattern").build("expression").field("expression", def("Expression"));
  [
    // Define all the simple keyword types.
    "TSAnyKeyword",
    "TSBigIntKeyword",
    "TSBooleanKeyword",
    "TSNeverKeyword",
    "TSNullKeyword",
    "TSNumberKeyword",
    "TSObjectKeyword",
    "TSStringKeyword",
    "TSSymbolKeyword",
    "TSUndefinedKeyword",
    "TSUnknownKeyword",
    "TSVoidKeyword",
    "TSIntrinsicKeyword",
    "TSThisType"
  ].forEach((keywordType) => {
    def(keywordType).bases("TSType").build();
  });
  def("TSArrayType").bases("TSType").build("elementType").field("elementType", def("TSType"));
  def("TSLiteralType").bases("TSType").build("literal").field("literal", or(
    def("NumericLiteral"),
    def("StringLiteral"),
    def("BooleanLiteral"),
    def("TemplateLiteral"),
    def("UnaryExpression"),
    def("BigIntLiteral")
  ));
  def("TemplateLiteral").field("expressions", or(
    [def("Expression")],
    [def("TSType")]
  ));
  [
    "TSUnionType",
    "TSIntersectionType"
  ].forEach((typeName) => {
    def(typeName).bases("TSType").build("types").field("types", [def("TSType")]);
  });
  def("TSConditionalType").bases("TSType").build("checkType", "extendsType", "trueType", "falseType").field("checkType", def("TSType")).field("extendsType", def("TSType")).field("trueType", def("TSType")).field("falseType", def("TSType"));
  def("TSInferType").bases("TSType").build("typeParameter").field("typeParameter", def("TSTypeParameter"));
  def("TSParenthesizedType").bases("TSType").build("typeAnnotation").field("typeAnnotation", def("TSType"));
  var ParametersType = [or(
    def("Identifier"),
    def("RestElement"),
    def("ArrayPattern"),
    def("ObjectPattern")
  )];
  [
    "TSFunctionType",
    "TSConstructorType"
  ].forEach((typeName) => {
    def(typeName).bases(
      "TSType",
      "TSHasOptionalTypeParameters",
      "TSHasOptionalTypeAnnotation"
    ).build("parameters").field("parameters", ParametersType);
  });
  def("TSDeclareFunction").bases("Declaration", "TSHasOptionalTypeParameters").build("id", "params", "returnType").field("declare", Boolean, defaults["false"]).field("async", Boolean, defaults["false"]).field("generator", Boolean, defaults["false"]).field("id", or(def("Identifier"), null), defaults["null"]).field("params", [def("Pattern")]).field(
    "returnType",
    or(
      def("TSTypeAnnotation"),
      def("Noop"),
      // Still used?
      null
    ),
    defaults["null"]
  );
  def("TSDeclareMethod").bases("Declaration", "TSHasOptionalTypeParameters").build("key", "params", "returnType").field("async", Boolean, defaults["false"]).field("generator", Boolean, defaults["false"]).field("params", [def("Pattern")]).field("abstract", Boolean, defaults["false"]).field(
    "accessibility",
    or("public", "private", "protected", void 0),
    defaults["undefined"]
  ).field("static", Boolean, defaults["false"]).field("computed", Boolean, defaults["false"]).field("optional", Boolean, defaults["false"]).field("key", or(
    def("Identifier"),
    def("StringLiteral"),
    def("NumericLiteral"),
    // Only allowed if .computed is true.
    def("Expression")
  )).field(
    "kind",
    or("get", "set", "method", "constructor"),
    function getDefault() {
      return "method";
    }
  ).field(
    "access",
    // Not "accessibility"?
    or("public", "private", "protected", void 0),
    defaults["undefined"]
  ).field(
    "decorators",
    or([def("Decorator")], null),
    defaults["null"]
  ).field(
    "returnType",
    or(
      def("TSTypeAnnotation"),
      def("Noop"),
      // Still used?
      null
    ),
    defaults["null"]
  );
  def("TSMappedType").bases("TSType").build("typeParameter", "typeAnnotation").field("readonly", or(Boolean, "+", "-"), defaults["false"]).field("typeParameter", def("TSTypeParameter")).field("optional", or(Boolean, "+", "-"), defaults["false"]).field(
    "typeAnnotation",
    or(def("TSType"), null),
    defaults["null"]
  );
  def("TSTupleType").bases("TSType").build("elementTypes").field("elementTypes", [or(
    def("TSType"),
    def("TSNamedTupleMember")
  )]);
  def("TSNamedTupleMember").bases("TSType").build("label", "elementType", "optional").field("label", def("Identifier")).field("optional", Boolean, defaults["false"]).field("elementType", def("TSType"));
  def("TSRestType").bases("TSType").build("typeAnnotation").field("typeAnnotation", def("TSType"));
  def("TSOptionalType").bases("TSType").build("typeAnnotation").field("typeAnnotation", def("TSType"));
  def("TSIndexedAccessType").bases("TSType").build("objectType", "indexType").field("objectType", def("TSType")).field("indexType", def("TSType"));
  def("TSTypeOperator").bases("TSType").build("operator").field("operator", String).field("typeAnnotation", def("TSType"));
  def("TSTypeAnnotation").bases("Node").build("typeAnnotation").field(
    "typeAnnotation",
    or(
      def("TSType"),
      def("TSTypeAnnotation")
    )
  );
  def("TSIndexSignature").bases("Declaration", "TSHasOptionalTypeAnnotation").build("parameters", "typeAnnotation").field("parameters", [def("Identifier")]).field("readonly", Boolean, defaults["false"]);
  def("TSPropertySignature").bases("Declaration", "TSHasOptionalTypeAnnotation").build("key", "typeAnnotation", "optional").field("key", def("Expression")).field("computed", Boolean, defaults["false"]).field("readonly", Boolean, defaults["false"]).field("optional", Boolean, defaults["false"]).field(
    "initializer",
    or(def("Expression"), null),
    defaults["null"]
  );
  def("TSMethodSignature").bases(
    "Declaration",
    "TSHasOptionalTypeParameters",
    "TSHasOptionalTypeAnnotation"
  ).build("key", "parameters", "typeAnnotation").field("key", def("Expression")).field("computed", Boolean, defaults["false"]).field("optional", Boolean, defaults["false"]).field("parameters", ParametersType);
  def("TSTypePredicate").bases("TSTypeAnnotation", "TSType").build("parameterName", "typeAnnotation", "asserts").field(
    "parameterName",
    or(
      def("Identifier"),
      def("TSThisType")
    )
  ).field(
    "typeAnnotation",
    or(def("TSTypeAnnotation"), null),
    defaults["null"]
  ).field("asserts", Boolean, defaults["false"]);
  [
    "TSCallSignatureDeclaration",
    "TSConstructSignatureDeclaration"
  ].forEach((typeName) => {
    def(typeName).bases(
      "Declaration",
      "TSHasOptionalTypeParameters",
      "TSHasOptionalTypeAnnotation"
    ).build("parameters", "typeAnnotation").field("parameters", ParametersType);
  });
  def("TSEnumMember").bases("Node").build("id", "initializer").field("id", or(def("Identifier"), StringLiteral)).field(
    "initializer",
    or(def("Expression"), null),
    defaults["null"]
  );
  def("TSTypeQuery").bases("TSType").build("exprName").field("exprName", or(TSEntityName, def("TSImportType")));
  var TSTypeMember = or(
    def("TSCallSignatureDeclaration"),
    def("TSConstructSignatureDeclaration"),
    def("TSIndexSignature"),
    def("TSMethodSignature"),
    def("TSPropertySignature")
  );
  def("TSTypeLiteral").bases("TSType").build("members").field("members", [TSTypeMember]);
  def("TSTypeParameter").bases("Identifier").build("name", "constraint", "default").field("name", or(def("Identifier"), String)).field("constraint", or(def("TSType"), void 0), defaults["undefined"]).field("default", or(def("TSType"), void 0), defaults["undefined"]);
  def("TSTypeAssertion").bases("Expression", "Pattern").build("typeAnnotation", "expression").field("typeAnnotation", def("TSType")).field("expression", def("Expression")).field(
    "extra",
    or({ parenthesized: Boolean }, null),
    defaults["null"]
  );
  def("TSTypeParameterDeclaration").bases("Declaration").build("params").field("params", [def("TSTypeParameter")]);
  def("TSInstantiationExpression").bases("Expression", "TSHasOptionalTypeParameterInstantiation").build("expression", "typeParameters").field("expression", def("Expression"));
  def("TSTypeParameterInstantiation").bases("Node").build("params").field("params", [def("TSType")]);
  def("TSEnumDeclaration").bases("Declaration").build("id", "members").field("id", def("Identifier")).field("const", Boolean, defaults["false"]).field("declare", Boolean, defaults["false"]).field("members", [def("TSEnumMember")]).field(
    "initializer",
    or(def("Expression"), null),
    defaults["null"]
  );
  def("TSTypeAliasDeclaration").bases("Declaration", "TSHasOptionalTypeParameters").build("id", "typeAnnotation").field("id", def("Identifier")).field("declare", Boolean, defaults["false"]).field("typeAnnotation", def("TSType"));
  def("TSModuleBlock").bases("Node").build("body").field("body", [def("Statement")]);
  def("TSModuleDeclaration").bases("Declaration").build("id", "body").field("id", or(StringLiteral, TSEntityName)).field("declare", Boolean, defaults["false"]).field("global", Boolean, defaults["false"]).field(
    "body",
    or(
      def("TSModuleBlock"),
      def("TSModuleDeclaration"),
      null
    ),
    defaults["null"]
  );
  def("TSImportType").bases("TSType", "TSHasOptionalTypeParameterInstantiation").build("argument", "qualifier", "typeParameters").field("argument", StringLiteral).field("qualifier", or(TSEntityName, void 0), defaults["undefined"]);
  def("TSImportEqualsDeclaration").bases("Declaration").build("id", "moduleReference").field("id", def("Identifier")).field("isExport", Boolean, defaults["false"]).field(
    "moduleReference",
    or(
      TSEntityName,
      def("TSExternalModuleReference")
    )
  );
  def("TSExternalModuleReference").bases("Declaration").build("expression").field("expression", StringLiteral);
  def("TSExportAssignment").bases("Statement").build("expression").field("expression", def("Expression"));
  def("TSNamespaceExportDeclaration").bases("Declaration").build("id").field("id", def("Identifier"));
  def("TSInterfaceBody").bases("Node").build("body").field("body", [TSTypeMember]);
  def("TSExpressionWithTypeArguments").bases("TSType", "TSHasOptionalTypeParameterInstantiation").build("expression", "typeParameters").field("expression", TSEntityName);
  def("TSInterfaceDeclaration").bases("Declaration", "TSHasOptionalTypeParameters").build("id", "body").field("id", TSEntityName).field("declare", Boolean, defaults["false"]).field(
    "extends",
    or([def("TSExpressionWithTypeArguments")], null),
    defaults["null"]
  ).field("body", def("TSInterfaceBody"));
  def("TSParameterProperty").bases("Pattern").build("parameter").field(
    "accessibility",
    or("public", "private", "protected", void 0),
    defaults["undefined"]
  ).field("readonly", Boolean, defaults["false"]).field("parameter", or(
    def("Identifier"),
    def("AssignmentPattern")
  ));
  def("ClassProperty").field(
    "access",
    // Not "accessibility"?
    or("public", "private", "protected", void 0),
    defaults["undefined"]
  );
  def("ClassAccessorProperty").bases("Declaration", "TSHasOptionalTypeAnnotation");
  def("ClassBody").field("body", [or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty"),
    def("ClassPrivateProperty"),
    def("ClassAccessorProperty"),
    def("ClassMethod"),
    def("ClassPrivateMethod"),
    def("StaticBlock"),
    // Just need to add these types:
    def("TSDeclareMethod"),
    TSTypeMember
  )]);
}
maybeSetModuleExports(() => module);

var namedTypes$1;
((namedTypes2) => {
})(namedTypes$1 || (namedTypes$1 = {}));

const {
  astNodesAreEquivalent,
  builders: builders$1,
  builtInTypes,
  defineMethod,
  eachField,
  finalize,
  getBuilderName,
  getFieldNames,
  getFieldValue,
  getSupertypeNames,
  namedTypes: n$3,
  NodePath,
  Path,
  PathVisitor,
  someField,
  Type,
  use,
  visit
} = fork([
  // Feel free to add to or remove from this list of extension modules to
  // configure the precise type hierarchy that you need.
  esProposalsDef,
  jsxDef,
  flowDef,
  esprimaDef,
  babelDef,
  typescriptDef
]);
Object.assign(namedTypes$1, n$3);

const n$2 = namedTypes$1;
const SourceMapConsumer = sourceMap.SourceMapConsumer;
const SourceMapGenerator = sourceMap.SourceMapGenerator;
const hasOwn$2 = Object.prototype.hasOwnProperty;
function getLineTerminator() {
  return "\n";
}
function getOption(options, key, defaultValue) {
  if (options && hasOwn$2.call(options, key)) {
    return options[key];
  }
  return defaultValue;
}
function getUnionOfKeys(...args) {
  const result = {};
  const argc = args.length;
  for (let i = 0; i < argc; ++i) {
    const keys = Object.keys(args[i]);
    const keyCount = keys.length;
    for (let j = 0; j < keyCount; ++j) {
      result[keys[j]] = true;
    }
  }
  return result;
}
function comparePos(pos1, pos2) {
  return pos1.line - pos2.line || pos1.column - pos2.column;
}
function copyPos(pos) {
  return {
    line: pos.line,
    column: pos.column
  };
}
function composeSourceMaps(formerMap, latterMap) {
  if (formerMap) {
    if (!latterMap) {
      return formerMap;
    }
  } else {
    return latterMap || null;
  }
  const smcFormer = new SourceMapConsumer(formerMap);
  const smcLatter = new SourceMapConsumer(latterMap);
  const smg = new SourceMapGenerator({
    file: latterMap.file,
    sourceRoot: latterMap.sourceRoot
  });
  const sourcesToContents = {};
  smcLatter.eachMapping(function(mapping) {
    const origPos = smcFormer.originalPositionFor({
      line: mapping.originalLine,
      column: mapping.originalColumn
    });
    const sourceName = origPos.source;
    if (sourceName === null) {
      return;
    }
    smg.addMapping({
      source: sourceName,
      original: copyPos(origPos),
      generated: {
        line: mapping.generatedLine,
        column: mapping.generatedColumn
      },
      name: mapping.name
    });
    const sourceContent = smcFormer.sourceContentFor(sourceName);
    if (sourceContent && !hasOwn$2.call(sourcesToContents, sourceName)) {
      sourcesToContents[sourceName] = sourceContent;
      smg.setSourceContent(sourceName, sourceContent);
    }
  });
  return smg.toJSON();
}
function getTrueLoc(node, lines) {
  if (!node.loc) {
    return null;
  }
  const result = {
    start: node.loc.start,
    end: node.loc.end
  };
  function include(node2) {
    expandLoc(result, node2.loc);
  }
  if (node.declaration && node.declaration.decorators && isExportDeclaration(node)) {
    node.declaration.decorators.forEach(include);
  }
  if (comparePos(result.start, result.end) < 0) {
    result.start = copyPos(result.start);
    lines.skipSpaces(result.start, false, true);
    if (comparePos(result.start, result.end) < 0) {
      result.end = copyPos(result.end);
      lines.skipSpaces(result.end, true, true);
    }
  }
  if (node.comments) {
    node.comments.forEach(include);
  }
  return result;
}
function expandLoc(parentLoc, childLoc) {
  if (parentLoc && childLoc) {
    if (comparePos(childLoc.start, parentLoc.start) < 0) {
      parentLoc.start = childLoc.start;
    }
    if (comparePos(parentLoc.end, childLoc.end) < 0) {
      parentLoc.end = childLoc.end;
    }
  }
}
function fixFaultyLocations(node, lines) {
  const loc = node.loc;
  if (loc) {
    if (loc.start.line < 1) {
      loc.start.line = 1;
    }
    if (loc.end.line < 1) {
      loc.end.line = 1;
    }
  }
  if (node.type === "File") {
    loc.start = lines.firstPos();
    loc.end = lines.lastPos();
  }
  fixForLoopHead(node, lines);
  fixTemplateLiteral(node, lines);
  if (loc && node.decorators) {
    node.decorators.forEach(function(decorator) {
      expandLoc(loc, decorator.loc);
    });
  } else if (node.declaration && isExportDeclaration(node)) {
    node.declaration.loc = null;
    const decorators = node.declaration.decorators;
    if (decorators) {
      decorators.forEach(function(decorator) {
        expandLoc(loc, decorator.loc);
      });
    }
  } else if (n$2.MethodDefinition && n$2.MethodDefinition.check(node) || n$2.Property.check(node) && (node.method || node.shorthand)) {
    node.value.loc = null;
    if (n$2.FunctionExpression.check(node.value)) {
      node.value.id = null;
    }
  } else if (node.type === "ObjectTypeProperty") {
    const loc2 = node.loc;
    let end = loc2 && loc2.end;
    if (end) {
      end = copyPos(end);
      if (lines.prevPos(end) && lines.charAt(end) === ",") {
        if (end = lines.skipSpaces(end, true, true)) {
          loc2.end = end;
        }
      }
    }
  }
}
function fixForLoopHead(node, lines) {
  if (node.type !== "ForStatement") {
    return;
  }
  function fix(child) {
    const loc = child && child.loc;
    const start = loc && loc.start;
    const end = loc && copyPos(loc.end);
    while (start && end && comparePos(start, end) < 0) {
      lines.prevPos(end);
      if (lines.charAt(end) === ";") {
        loc.end.line = end.line;
        loc.end.column = end.column;
      } else {
        break;
      }
    }
  }
  fix(node.init);
  fix(node.test);
  fix(node.update);
}
function fixTemplateLiteral(node, lines) {
  if (node.type !== "TemplateLiteral") {
    return;
  }
  if (node.quasis.length === 0) {
    return;
  }
  if (node.loc) {
    const afterLeftBackTickPos = copyPos(node.loc.start);
    const firstQuasi = node.quasis[0];
    if (comparePos(firstQuasi.loc.start, afterLeftBackTickPos) < 0) {
      firstQuasi.loc.start = afterLeftBackTickPos;
    }
    const rightBackTickPos = copyPos(node.loc.end);
    const lastQuasi = node.quasis[node.quasis.length - 1];
    if (comparePos(rightBackTickPos, lastQuasi.loc.end) < 0) {
      lastQuasi.loc.end = rightBackTickPos;
    }
  }
  node.expressions.forEach(function(expr, i) {
    const dollarCurlyPos = lines.skipSpaces(expr.loc.start, true, false);
    if (lines.prevPos(dollarCurlyPos) && lines.charAt(dollarCurlyPos) === "{" && lines.prevPos(dollarCurlyPos) && lines.charAt(dollarCurlyPos) === "$") {
      const quasiBefore = node.quasis[i];
      if (comparePos(dollarCurlyPos, quasiBefore.loc.end) < 0) {
        quasiBefore.loc.end = dollarCurlyPos;
      }
    }
    const rightCurlyPos = lines.skipSpaces(expr.loc.end, false, false);
    if (lines.charAt(rightCurlyPos) === "}") {
      const quasiAfter = node.quasis[i + 1];
      if (comparePos(quasiAfter.loc.start, rightCurlyPos) < 0) {
        quasiAfter.loc.start = rightCurlyPos;
      }
    }
  });
}
function isExportDeclaration(node) {
  if (node)
    switch (node.type) {
      case "ExportDeclaration":
      case "ExportDefaultDeclaration":
      case "ExportDefaultSpecifier":
      case "DeclareExportDeclaration":
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
        return true;
    }
  return false;
}
function getParentExportDeclaration(path) {
  const parentNode = path.getParentNode();
  if (path.getName() === "declaration" && isExportDeclaration(parentNode)) {
    return parentNode;
  }
  return null;
}
function isTrailingCommaEnabled(options, context) {
  const trailingComma = options.trailingComma;
  if (typeof trailingComma === "object") {
    return !!trailingComma[context];
  }
  return !!trailingComma;
}

const defaults = {
  tabWidth: 4,
  useTabs: false,
  reuseWhitespace: true,
  lineTerminator: getLineTerminator(),
  wrapColumn: 74,
  // Aspirational for now.
  sourceFileName: null,
  sourceMapName: null,
  sourceRoot: null,
  inputSourceMap: null,
  range: false,
  tolerant: true,
  quote: null,
  trailingComma: false,
  arrayBracketSpacing: false,
  objectCurlySpacing: true,
  arrowParensAlways: false,
  flowObjectCommas: true,
  tokens: true
};
const hasOwn$1 = defaults.hasOwnProperty;
function normalize(opts) {
  const options = opts || defaults;
  function get(key) {
    return hasOwn$1.call(options, key) ? options[key] : defaults[key];
  }
  return {
    tabWidth: +get("tabWidth"),
    useTabs: !!get("useTabs"),
    reuseWhitespace: !!get("reuseWhitespace"),
    lineTerminator: get("lineTerminator"),
    wrapColumn: Math.max(get("wrapColumn"), 0),
    sourceFileName: get("sourceFileName"),
    sourceMapName: get("sourceMapName"),
    sourceRoot: get("sourceRoot"),
    inputSourceMap: get("inputSourceMap"),
    parser: get("esprima") || get("parser"),
    range: get("range"),
    tolerant: get("tolerant"),
    quote: get("quote"),
    trailingComma: get("trailingComma"),
    arrayBracketSpacing: get("arrayBracketSpacing"),
    objectCurlySpacing: get("objectCurlySpacing"),
    arrowParensAlways: get("arrowParensAlways"),
    flowObjectCommas: get("flowObjectCommas"),
    tokens: !!get("tokens")
  };
}

class Mapping {
  constructor(sourceLines, sourceLoc, targetLoc = sourceLoc) {
    this.sourceLines = sourceLines;
    this.sourceLoc = sourceLoc;
    this.targetLoc = targetLoc;
  }
  slice(lines, start, end = lines.lastPos()) {
    const sourceLines = this.sourceLines;
    let sourceLoc = this.sourceLoc;
    let targetLoc = this.targetLoc;
    function skip(name) {
      const sourceFromPos = sourceLoc[name];
      const targetFromPos = targetLoc[name];
      let targetToPos = start;
      if (name === "end") {
        targetToPos = end;
      }
      return skipChars(
        sourceLines,
        sourceFromPos,
        lines,
        targetFromPos,
        targetToPos
      );
    }
    if (comparePos(start, targetLoc.start) <= 0) {
      if (comparePos(targetLoc.end, end) <= 0) {
        targetLoc = {
          start: subtractPos(targetLoc.start, start.line, start.column),
          end: subtractPos(targetLoc.end, start.line, start.column)
        };
      } else if (comparePos(end, targetLoc.start) <= 0) {
        return null;
      } else {
        sourceLoc = {
          start: sourceLoc.start,
          end: skip("end")
        };
        targetLoc = {
          start: subtractPos(targetLoc.start, start.line, start.column),
          end: subtractPos(end, start.line, start.column)
        };
      }
    } else {
      if (comparePos(targetLoc.end, start) <= 0) {
        return null;
      }
      if (comparePos(targetLoc.end, end) <= 0) {
        sourceLoc = {
          start: skip("start"),
          end: sourceLoc.end
        };
        targetLoc = {
          // Same as subtractPos(start, start.line, start.column):
          start: { line: 1, column: 0 },
          end: subtractPos(targetLoc.end, start.line, start.column)
        };
      } else {
        sourceLoc = {
          start: skip("start"),
          end: skip("end")
        };
        targetLoc = {
          // Same as subtractPos(start, start.line, start.column):
          start: { line: 1, column: 0 },
          end: subtractPos(end, start.line, start.column)
        };
      }
    }
    return new Mapping(this.sourceLines, sourceLoc, targetLoc);
  }
  add(line, column) {
    return new Mapping(this.sourceLines, this.sourceLoc, {
      start: addPos(this.targetLoc.start, line, column),
      end: addPos(this.targetLoc.end, line, column)
    });
  }
  subtract(line, column) {
    return new Mapping(this.sourceLines, this.sourceLoc, {
      start: subtractPos(this.targetLoc.start, line, column),
      end: subtractPos(this.targetLoc.end, line, column)
    });
  }
  indent(by, skipFirstLine = false, noNegativeColumns = false) {
    if (by === 0) {
      return this;
    }
    let targetLoc = this.targetLoc;
    const startLine = targetLoc.start.line;
    const endLine = targetLoc.end.line;
    if (skipFirstLine && startLine === 1 && endLine === 1) {
      return this;
    }
    targetLoc = {
      start: targetLoc.start,
      end: targetLoc.end
    };
    if (!skipFirstLine || startLine > 1) {
      const startColumn = targetLoc.start.column + by;
      targetLoc.start = {
        line: startLine,
        column: noNegativeColumns ? Math.max(0, startColumn) : startColumn
      };
    }
    if (!skipFirstLine || endLine > 1) {
      const endColumn = targetLoc.end.column + by;
      targetLoc.end = {
        line: endLine,
        column: noNegativeColumns ? Math.max(0, endColumn) : endColumn
      };
    }
    return new Mapping(this.sourceLines, this.sourceLoc, targetLoc);
  }
}
function addPos(toPos, line, column) {
  return {
    line: toPos.line + line - 1,
    column: toPos.line === 1 ? toPos.column + column : toPos.column
  };
}
function subtractPos(fromPos, line, column) {
  return {
    line: fromPos.line - line + 1,
    column: fromPos.line === line ? fromPos.column - column : fromPos.column
  };
}
function skipChars(sourceLines, sourceFromPos, targetLines, targetFromPos, targetToPos) {
  const targetComparison = comparePos(targetFromPos, targetToPos);
  if (targetComparison === 0) {
    return sourceFromPos;
  }
  let sourceCursor, targetCursor;
  if (targetComparison < 0) {
    sourceCursor = sourceLines.skipSpaces(sourceFromPos) || sourceLines.lastPos();
    targetCursor = targetLines.skipSpaces(targetFromPos) || targetLines.lastPos();
    const lineDiff = targetToPos.line - targetCursor.line;
    sourceCursor.line += lineDiff;
    targetCursor.line += lineDiff;
    if (lineDiff > 0) {
      sourceCursor.column = 0;
      targetCursor.column = 0;
    }
    while (comparePos(targetCursor, targetToPos) < 0 && targetLines.nextPos(targetCursor, true)) {
    }
  } else {
    sourceCursor = sourceLines.skipSpaces(sourceFromPos, true) || sourceLines.firstPos();
    targetCursor = targetLines.skipSpaces(targetFromPos, true) || targetLines.firstPos();
    const lineDiff = targetToPos.line - targetCursor.line;
    sourceCursor.line += lineDiff;
    targetCursor.line += lineDiff;
    if (lineDiff < 0) {
      sourceCursor.column = sourceLines.getLineLength(sourceCursor.line);
      targetCursor.column = targetLines.getLineLength(targetCursor.line);
    }
    while (comparePos(targetToPos, targetCursor) < 0 && targetLines.prevPos(targetCursor, true)) {
    }
  }
  return sourceCursor;
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class Lines {
  constructor(infos, sourceFileName = null) {
    this.infos = infos;
    __publicField$1(this, "length");
    __publicField$1(this, "name");
    __publicField$1(this, "mappings", []);
    __publicField$1(this, "cachedSourceMap", null);
    __publicField$1(this, "cachedTabWidth");
    this.length = infos.length;
    this.name = sourceFileName || null;
    if (this.name) {
      this.mappings.push(
        new Mapping(this, {
          start: this.firstPos(),
          end: this.lastPos()
        })
      );
    }
  }
  toString(options) {
    return this.sliceString(this.firstPos(), this.lastPos(), options);
  }
  getSourceMap(sourceMapName, sourceRoot) {
    if (!sourceMapName) {
      return null;
    }
    const targetLines = this;
    function updateJSON(json) {
      json = json || {};
      json.file = sourceMapName;
      if (sourceRoot) {
        json.sourceRoot = sourceRoot;
      }
      return json;
    }
    if (targetLines.cachedSourceMap) {
      return updateJSON(targetLines.cachedSourceMap.toJSON());
    }
    const smg = new sourceMap.SourceMapGenerator(updateJSON());
    const sourcesToContents = {};
    targetLines.mappings.forEach(function(mapping) {
      const sourceCursor = mapping.sourceLines.skipSpaces(mapping.sourceLoc.start) || mapping.sourceLines.lastPos();
      const targetCursor = targetLines.skipSpaces(mapping.targetLoc.start) || targetLines.lastPos();
      while (comparePos(sourceCursor, mapping.sourceLoc.end) < 0 && comparePos(targetCursor, mapping.targetLoc.end) < 0) {
        mapping.sourceLines.charAt(sourceCursor);
        targetLines.charAt(targetCursor);
        const sourceName = mapping.sourceLines.name;
        smg.addMapping({
          source: sourceName,
          original: { line: sourceCursor.line, column: sourceCursor.column },
          generated: { line: targetCursor.line, column: targetCursor.column }
        });
        if (!hasOwn.call(sourcesToContents, sourceName)) {
          const sourceContent = mapping.sourceLines.toString();
          smg.setSourceContent(sourceName, sourceContent);
          sourcesToContents[sourceName] = sourceContent;
        }
        targetLines.nextPos(targetCursor, true);
        mapping.sourceLines.nextPos(sourceCursor, true);
      }
    });
    targetLines.cachedSourceMap = smg;
    return smg.toJSON();
  }
  bootstrapCharAt(pos) {
    const line = pos.line, column = pos.column, strings = this.toString().split(lineTerminatorSeqExp), string = strings[line - 1];
    if (typeof string === "undefined")
      return "";
    if (column === string.length && line < strings.length)
      return "\n";
    if (column >= string.length)
      return "";
    return string.charAt(column);
  }
  charAt(pos) {
    let line = pos.line, column = pos.column, secret = this, infos = secret.infos, info = infos[line - 1], c = column;
    if (typeof info === "undefined" || c < 0)
      return "";
    const indent = this.getIndentAt(line);
    if (c < indent)
      return " ";
    c += info.sliceStart - indent;
    if (c === info.sliceEnd && line < this.length)
      return "\n";
    if (c >= info.sliceEnd)
      return "";
    return info.line.charAt(c);
  }
  stripMargin(width, skipFirstLine) {
    if (width === 0)
      return this;
    if (skipFirstLine && this.length === 1)
      return this;
    const lines = new Lines(
      this.infos.map(function(info, i) {
        if (info.line && (i > 0 || !skipFirstLine)) {
          info = {
            ...info,
            indent: Math.max(0, info.indent - width)
          };
        }
        return info;
      })
    );
    if (this.mappings.length > 0) {
      const newMappings = lines.mappings;
      this.mappings.forEach(function(mapping) {
        newMappings.push(mapping.indent(width, skipFirstLine, true));
      });
    }
    return lines;
  }
  indent(by) {
    if (by === 0) {
      return this;
    }
    const lines = new Lines(
      this.infos.map(function(info) {
        if (info.line && !info.locked) {
          info = {
            ...info,
            indent: info.indent + by
          };
        }
        return info;
      })
    );
    if (this.mappings.length > 0) {
      const newMappings = lines.mappings;
      this.mappings.forEach(function(mapping) {
        newMappings.push(mapping.indent(by));
      });
    }
    return lines;
  }
  indentTail(by) {
    if (by === 0) {
      return this;
    }
    if (this.length < 2) {
      return this;
    }
    const lines = new Lines(
      this.infos.map(function(info, i) {
        if (i > 0 && info.line && !info.locked) {
          info = {
            ...info,
            indent: info.indent + by
          };
        }
        return info;
      })
    );
    if (this.mappings.length > 0) {
      const newMappings = lines.mappings;
      this.mappings.forEach(function(mapping) {
        newMappings.push(mapping.indent(by, true));
      });
    }
    return lines;
  }
  lockIndentTail() {
    if (this.length < 2) {
      return this;
    }
    return new Lines(
      this.infos.map((info, i) => ({
        ...info,
        locked: i > 0
      }))
    );
  }
  getIndentAt(line) {
    return Math.max(this.infos[line - 1].indent, 0);
  }
  guessTabWidth() {
    if (typeof this.cachedTabWidth === "number") {
      return this.cachedTabWidth;
    }
    const counts = [];
    let lastIndent = 0;
    for (let line = 1, last = this.length; line <= last; ++line) {
      const info = this.infos[line - 1];
      const sliced = info.line.slice(info.sliceStart, info.sliceEnd);
      if (isOnlyWhitespace(sliced)) {
        continue;
      }
      const diff = Math.abs(info.indent - lastIndent);
      counts[diff] = ~~counts[diff] + 1;
      lastIndent = info.indent;
    }
    let maxCount = -1;
    let result = 2;
    for (let tabWidth = 1; tabWidth < counts.length; tabWidth += 1) {
      if (hasOwn.call(counts, tabWidth) && counts[tabWidth] > maxCount) {
        maxCount = counts[tabWidth];
        result = tabWidth;
      }
    }
    return this.cachedTabWidth = result;
  }
  // Determine if the list of lines has a first line that starts with a //
  // or /* comment. If this is the case, the code may need to be wrapped in
  // parens to avoid ASI issues.
  startsWithComment() {
    if (this.infos.length === 0) {
      return false;
    }
    const firstLineInfo = this.infos[0], sliceStart = firstLineInfo.sliceStart, sliceEnd = firstLineInfo.sliceEnd, firstLine = firstLineInfo.line.slice(sliceStart, sliceEnd).trim();
    return firstLine.length === 0 || firstLine.slice(0, 2) === "//" || firstLine.slice(0, 2) === "/*";
  }
  isOnlyWhitespace() {
    return isOnlyWhitespace(this.toString());
  }
  isPrecededOnlyByWhitespace(pos) {
    const info = this.infos[pos.line - 1];
    const indent = Math.max(info.indent, 0);
    const diff = pos.column - indent;
    if (diff <= 0) {
      return true;
    }
    const start = info.sliceStart;
    const end = Math.min(start + diff, info.sliceEnd);
    const prefix = info.line.slice(start, end);
    return isOnlyWhitespace(prefix);
  }
  getLineLength(line) {
    const info = this.infos[line - 1];
    return this.getIndentAt(line) + info.sliceEnd - info.sliceStart;
  }
  nextPos(pos, skipSpaces = false) {
    const l = Math.max(pos.line, 0), c = Math.max(pos.column, 0);
    if (c < this.getLineLength(l)) {
      pos.column += 1;
      return skipSpaces ? !!this.skipSpaces(pos, false, true) : true;
    }
    if (l < this.length) {
      pos.line += 1;
      pos.column = 0;
      return skipSpaces ? !!this.skipSpaces(pos, false, true) : true;
    }
    return false;
  }
  prevPos(pos, skipSpaces = false) {
    let l = pos.line, c = pos.column;
    if (c < 1) {
      l -= 1;
      if (l < 1)
        return false;
      c = this.getLineLength(l);
    } else {
      c = Math.min(c - 1, this.getLineLength(l));
    }
    pos.line = l;
    pos.column = c;
    return skipSpaces ? !!this.skipSpaces(pos, true, true) : true;
  }
  firstPos() {
    return { line: 1, column: 0 };
  }
  lastPos() {
    return {
      line: this.length,
      column: this.getLineLength(this.length)
    };
  }
  skipSpaces(pos, backward = false, modifyInPlace = false) {
    if (pos) {
      pos = modifyInPlace ? pos : {
        line: pos.line,
        column: pos.column
      };
    } else if (backward) {
      pos = this.lastPos();
    } else {
      pos = this.firstPos();
    }
    if (backward) {
      while (this.prevPos(pos)) {
        if (!isOnlyWhitespace(this.charAt(pos)) && this.nextPos(pos)) {
          return pos;
        }
      }
      return null;
    } else {
      while (isOnlyWhitespace(this.charAt(pos))) {
        if (!this.nextPos(pos)) {
          return null;
        }
      }
      return pos;
    }
  }
  trimLeft() {
    const pos = this.skipSpaces(this.firstPos(), false, true);
    return pos ? this.slice(pos) : emptyLines;
  }
  trimRight() {
    const pos = this.skipSpaces(this.lastPos(), true, true);
    return pos ? this.slice(this.firstPos(), pos) : emptyLines;
  }
  trim() {
    const start = this.skipSpaces(this.firstPos(), false, true);
    if (start === null) {
      return emptyLines;
    }
    const end = this.skipSpaces(this.lastPos(), true, true);
    if (end === null) {
      return emptyLines;
    }
    return this.slice(start, end);
  }
  eachPos(callback, startPos = this.firstPos(), skipSpaces = false) {
    const pos = this.firstPos();
    if (startPos) {
      pos.line = startPos.line, pos.column = startPos.column;
    }
    if (skipSpaces && !this.skipSpaces(pos, false, true)) {
      return;
    }
    do
      callback.call(this, pos);
    while (this.nextPos(pos, skipSpaces));
  }
  bootstrapSlice(start, end) {
    const strings = this.toString().split(lineTerminatorSeqExp).slice(start.line - 1, end.line);
    if (strings.length > 0) {
      strings.push(strings.pop().slice(0, end.column));
      strings[0] = strings[0].slice(start.column);
    }
    return fromString(strings.join("\n"));
  }
  slice(start, end) {
    if (!end) {
      if (!start) {
        return this;
      }
      end = this.lastPos();
    }
    if (!start) {
      throw new Error("cannot slice with end but not start");
    }
    const sliced = this.infos.slice(start.line - 1, end.line);
    if (start.line === end.line) {
      sliced[0] = sliceInfo(sliced[0], start.column, end.column);
    } else {
      sliced[0] = sliceInfo(sliced[0], start.column);
      sliced.push(sliceInfo(sliced.pop(), 0, end.column));
    }
    const lines = new Lines(sliced);
    if (this.mappings.length > 0) {
      const newMappings = lines.mappings;
      this.mappings.forEach(function(mapping) {
        const sliced2 = mapping.slice(this, start, end);
        if (sliced2) {
          newMappings.push(sliced2);
        }
      }, this);
    }
    return lines;
  }
  bootstrapSliceString(start, end, options) {
    return this.slice(start, end).toString(options);
  }
  sliceString(start = this.firstPos(), end = this.lastPos(), options) {
    const { tabWidth, useTabs, reuseWhitespace, lineTerminator } = normalize(options);
    const parts = [];
    for (let line = start.line; line <= end.line; ++line) {
      let info = this.infos[line - 1];
      if (line === start.line) {
        if (line === end.line) {
          info = sliceInfo(info, start.column, end.column);
        } else {
          info = sliceInfo(info, start.column);
        }
      } else if (line === end.line) {
        info = sliceInfo(info, 0, end.column);
      }
      const indent = Math.max(info.indent, 0);
      const before = info.line.slice(0, info.sliceStart);
      if (reuseWhitespace && isOnlyWhitespace(before) && countSpaces(before, tabWidth) === indent) {
        parts.push(info.line.slice(0, info.sliceEnd));
        continue;
      }
      let tabs = 0;
      let spaces = indent;
      if (useTabs) {
        tabs = Math.floor(indent / tabWidth);
        spaces -= tabs * tabWidth;
      }
      let result = "";
      if (tabs > 0) {
        result += new Array(tabs + 1).join("	");
      }
      if (spaces > 0) {
        result += new Array(spaces + 1).join(" ");
      }
      result += info.line.slice(info.sliceStart, info.sliceEnd);
      parts.push(result);
    }
    return parts.join(lineTerminator);
  }
  isEmpty() {
    return this.length < 2 && this.getLineLength(1) < 1;
  }
  join(elements) {
    const separator = this;
    const infos = [];
    const mappings = [];
    let prevInfo;
    function appendLines(linesOrNull) {
      if (linesOrNull === null) {
        return;
      }
      if (prevInfo) {
        const info = linesOrNull.infos[0];
        const indent = new Array(info.indent + 1).join(" ");
        const prevLine = infos.length;
        const prevColumn = Math.max(prevInfo.indent, 0) + prevInfo.sliceEnd - prevInfo.sliceStart;
        prevInfo.line = prevInfo.line.slice(0, prevInfo.sliceEnd) + indent + info.line.slice(info.sliceStart, info.sliceEnd);
        prevInfo.locked = prevInfo.locked || info.locked;
        prevInfo.sliceEnd = prevInfo.line.length;
        if (linesOrNull.mappings.length > 0) {
          linesOrNull.mappings.forEach(function(mapping) {
            mappings.push(mapping.add(prevLine, prevColumn));
          });
        }
      } else if (linesOrNull.mappings.length > 0) {
        mappings.push.apply(mappings, linesOrNull.mappings);
      }
      linesOrNull.infos.forEach(function(info, i) {
        if (!prevInfo || i > 0) {
          prevInfo = { ...info };
          infos.push(prevInfo);
        }
      });
    }
    function appendWithSeparator(linesOrNull, i) {
      if (i > 0)
        appendLines(separator);
      appendLines(linesOrNull);
    }
    elements.map(function(elem) {
      const lines2 = fromString(elem);
      if (lines2.isEmpty())
        return null;
      return lines2;
    }).forEach((linesOrNull, i) => {
      if (separator.isEmpty()) {
        appendLines(linesOrNull);
      } else {
        appendWithSeparator(linesOrNull, i);
      }
    });
    if (infos.length < 1)
      return emptyLines;
    const lines = new Lines(infos);
    lines.mappings = mappings;
    return lines;
  }
  concat(...args) {
    const list = [this];
    list.push.apply(list, args);
    return emptyLines.join(list);
  }
}
const fromStringCache = {};
const hasOwn = fromStringCache.hasOwnProperty;
const maxCacheKeyLen = 10;
function countSpaces(spaces, tabWidth) {
  let count = 0;
  const len = spaces.length;
  for (let i = 0; i < len; ++i) {
    switch (spaces.charCodeAt(i)) {
      case 9: {
        const next = Math.ceil(count / tabWidth) * tabWidth;
        if (next === count) {
          count += tabWidth;
        } else {
          count = next;
        }
        break;
      }
      case 11:
      case 12:
      case 13:
      case 65279:
        break;
      case 32:
      default:
        count += 1;
        break;
    }
  }
  return count;
}
const leadingSpaceExp = /^\s*/;
const lineTerminatorSeqExp = /\u000D\u000A|\u000D(?!\u000A)|\u000A|\u2028|\u2029/;
function fromString(string, options) {
  if (string instanceof Lines)
    return string;
  string += "";
  const tabWidth = options && options.tabWidth;
  const tabless = string.indexOf("	") < 0;
  const cacheable = !options && tabless && string.length <= maxCacheKeyLen;
  if (cacheable && hasOwn.call(fromStringCache, string))
    return fromStringCache[string];
  const lines = new Lines(
    string.split(lineTerminatorSeqExp).map(function(line) {
      const spaces = leadingSpaceExp.exec(line)[0];
      return {
        line,
        indent: countSpaces(spaces, tabWidth),
        // Boolean indicating whether this line can be reindented.
        locked: false,
        sliceStart: spaces.length,
        sliceEnd: line.length
      };
    }),
    normalize(options).sourceFileName
  );
  if (cacheable)
    fromStringCache[string] = lines;
  return lines;
}
function isOnlyWhitespace(string) {
  return !/\S/.test(string);
}
function sliceInfo(info, startCol, endCol) {
  let sliceStart = info.sliceStart;
  let sliceEnd = info.sliceEnd;
  let indent = Math.max(info.indent, 0);
  let lineLength = indent + sliceEnd - sliceStart;
  if (typeof endCol === "undefined") {
    endCol = lineLength;
  }
  startCol = Math.max(startCol, 0);
  endCol = Math.min(endCol, lineLength);
  endCol = Math.max(endCol, startCol);
  if (endCol < indent) {
    indent = endCol;
    sliceEnd = sliceStart;
  } else {
    sliceEnd -= lineLength - endCol;
  }
  lineLength = endCol;
  lineLength -= startCol;
  if (startCol < indent) {
    indent -= startCol;
  } else {
    startCol -= indent;
    indent = 0;
    sliceStart += startCol;
  }
  if (info.indent === indent && info.sliceStart === sliceStart && info.sliceEnd === sliceEnd) {
    return info;
  }
  return {
    line: info.line,
    indent,
    // A destructive slice always unlocks indentation.
    locked: false,
    sliceStart,
    sliceEnd
  };
}
function concat(elements) {
  return emptyLines.join(elements);
}
const emptyLines = fromString("");

const n$1 = namedTypes$1;
const isArray$3 = builtInTypes.array;
const isObject$3 = builtInTypes.object;
const childNodesCache = /* @__PURE__ */ new WeakMap();
function getSortedChildNodes(node, lines, resultArray) {
  if (!node) {
    return resultArray;
  }
  fixFaultyLocations(node, lines);
  if (resultArray) {
    if (n$1.Node.check(node) && n$1.SourceLocation.check(node.loc)) {
      let i = resultArray.length - 1;
      for (; i >= 0; --i) {
        const child = resultArray[i];
        if (child && child.loc && comparePos(child.loc.end, node.loc.start) <= 0) {
          break;
        }
      }
      resultArray.splice(i + 1, 0, node);
      return resultArray;
    }
  } else {
    const childNodes = childNodesCache.get(node);
    if (childNodes) {
      return childNodes;
    }
  }
  let names;
  if (isArray$3.check(node)) {
    names = Object.keys(node);
  } else if (isObject$3.check(node)) {
    names = getFieldNames(node);
  } else {
    return resultArray;
  }
  if (!resultArray) {
    childNodesCache.set(node, resultArray = []);
  }
  for (let i = 0, nameCount = names.length; i < nameCount; ++i) {
    getSortedChildNodes(node[names[i]], lines, resultArray);
  }
  return resultArray;
}
function decorateComment(node, comment, lines) {
  const childNodes = getSortedChildNodes(node, lines);
  let left = 0;
  let right = childNodes && childNodes.length;
  let precedingNode;
  let followingNode;
  while (typeof right === "number" && left < right) {
    const middle = left + right >> 1;
    const child = childNodes[middle];
    if (comparePos(child.loc.start, comment.loc.start) <= 0 && comparePos(comment.loc.end, child.loc.end) <= 0) {
      decorateComment(comment.enclosingNode = child, comment, lines);
      return;
    }
    if (comparePos(child.loc.end, comment.loc.start) <= 0) {
      precedingNode = child;
      left = middle + 1;
      continue;
    }
    if (comparePos(comment.loc.end, child.loc.start) <= 0) {
      followingNode = child;
      right = middle;
      continue;
    }
    throw new Error("Comment location overlaps with node location");
  }
  if (precedingNode) {
    comment.precedingNode = precedingNode;
  }
  if (followingNode) {
    comment.followingNode = followingNode;
  }
}
function attach(comments, ast, lines) {
  if (!isArray$3.check(comments)) {
    return;
  }
  const tiesToBreak = [];
  comments.forEach(function(comment) {
    comment.loc.lines = lines;
    decorateComment(ast, comment, lines);
    const pn = comment.precedingNode;
    const en = comment.enclosingNode;
    const fn = comment.followingNode;
    if (pn && fn) {
      const tieCount = tiesToBreak.length;
      if (tieCount > 0) {
        const lastTie = tiesToBreak[tieCount - 1];
        if (lastTie.followingNode !== comment.followingNode) {
          breakTies(tiesToBreak, lines);
        }
      }
      tiesToBreak.push(comment);
    } else if (pn) {
      breakTies(tiesToBreak, lines);
      addTrailingComment(pn, comment);
    } else if (fn) {
      breakTies(tiesToBreak, lines);
      addLeadingComment(fn, comment);
    } else if (en) {
      breakTies(tiesToBreak, lines);
      addDanglingComment(en, comment);
    } else {
      throw new Error("AST contains no nodes at all?");
    }
  });
  breakTies(tiesToBreak, lines);
  comments.forEach(function(comment) {
    delete comment.precedingNode;
    delete comment.enclosingNode;
    delete comment.followingNode;
  });
}
function breakTies(tiesToBreak, lines) {
  const tieCount = tiesToBreak.length;
  if (tieCount === 0) {
    return;
  }
  const pn = tiesToBreak[0].precedingNode;
  const fn = tiesToBreak[0].followingNode;
  let gapEndPos = fn.loc.start;
  let indexOfFirstLeadingComment = tieCount;
  let comment;
  for (; indexOfFirstLeadingComment > 0; --indexOfFirstLeadingComment) {
    comment = tiesToBreak[indexOfFirstLeadingComment - 1];
    const gap = lines.sliceString(comment.loc.end, gapEndPos);
    if (/\S/.test(gap)) {
      break;
    }
    gapEndPos = comment.loc.start;
  }
  while (indexOfFirstLeadingComment <= tieCount && (comment = tiesToBreak[indexOfFirstLeadingComment]) && // If the comment is a //-style comment and indented more
  // deeply than the node itself, reconsider it as trailing.
  (comment.type === "Line" || comment.type === "CommentLine") && comment.loc.start.column > fn.loc.start.column) {
    ++indexOfFirstLeadingComment;
  }
  if (indexOfFirstLeadingComment) {
    const { enclosingNode } = tiesToBreak[indexOfFirstLeadingComment - 1];
    if (enclosingNode?.type === "CallExpression") {
      --indexOfFirstLeadingComment;
    }
  }
  tiesToBreak.forEach(function(comment2, i) {
    if (i < indexOfFirstLeadingComment) {
      addTrailingComment(pn, comment2);
    } else {
      addLeadingComment(fn, comment2);
    }
  });
  tiesToBreak.length = 0;
}
function addCommentHelper(node, comment) {
  const comments = node.comments || (node.comments = []);
  comments.push(comment);
}
function addLeadingComment(node, comment) {
  comment.leading = true;
  comment.trailing = false;
  addCommentHelper(node, comment);
}
function addDanglingComment(node, comment) {
  comment.leading = false;
  comment.trailing = false;
  addCommentHelper(node, comment);
}
function addTrailingComment(node, comment) {
  comment.leading = false;
  comment.trailing = true;
  addCommentHelper(node, comment);
}
function printLeadingComment(commentPath, print) {
  const comment = commentPath.getValue();
  n$1.Comment.assert(comment);
  const loc = comment.loc;
  const lines = loc && loc.lines;
  const parts = [print(commentPath)];
  if (comment.trailing) {
    parts.push("\n");
  } else if (lines instanceof Lines) {
    const trailingSpace = lines.slice(
      loc.end,
      lines.skipSpaces(loc.end) || lines.lastPos()
    );
    if (trailingSpace.length === 1) {
      parts.push(trailingSpace);
    } else {
      parts.push(new Array(trailingSpace.length).join("\n"));
    }
  } else {
    parts.push("\n");
  }
  return concat(parts);
}
function printTrailingComment(commentPath, print) {
  const comment = commentPath.getValue(commentPath);
  n$1.Comment.assert(comment);
  const loc = comment.loc;
  const lines = loc && loc.lines;
  const parts = [];
  if (lines instanceof Lines) {
    const fromPos = lines.skipSpaces(loc.start, true) || lines.firstPos();
    const leadingSpace = lines.slice(fromPos, loc.start);
    if (leadingSpace.length === 1) {
      parts.push(leadingSpace);
    } else {
      parts.push(new Array(leadingSpace.length).join("\n"));
    }
  }
  parts.push(print(commentPath));
  return concat(parts);
}
function printComments(path, print) {
  const value = path.getValue();
  const innerLines = print(path);
  const comments = n$1.Node.check(value) && getFieldValue(value, "comments");
  if (!comments || comments.length === 0) {
    return innerLines;
  }
  const leadingParts = [];
  const trailingParts = [innerLines];
  path.each(function(commentPath) {
    const comment = commentPath.getValue();
    const leading = getFieldValue(comment, "leading");
    const trailing = getFieldValue(comment, "trailing");
    if (leading || trailing && !(n$1.Statement.check(value) || comment.type === "Block" || comment.type === "CommentBlock")) {
      leadingParts.push(printLeadingComment(commentPath, print));
    } else if (trailing) {
      trailingParts.push(printTrailingComment(commentPath, print));
    }
  }, "comments");
  leadingParts.push.apply(leadingParts, trailingParts);
  return concat(leadingParts);
}

const b$5 = builders$1;
const isObject$2 = builtInTypes.object;
const isArray$2 = builtInTypes.array;
function parse(source, options) {
  options = normalize(options);
  const lines = fromString(source, options);
  const sourceWithoutTabs = lines.toString({
    tabWidth: options.tabWidth,
    reuseWhitespace: false,
    useTabs: false
  });
  let comments = [];
  const ast = options.parser.parse(sourceWithoutTabs, {
    jsx: true,
    loc: true,
    locations: true,
    range: options.range,
    comment: true,
    onComment: comments,
    tolerant: getOption(options, "tolerant", true),
    ecmaVersion: 6,
    sourceType: getOption(options, "sourceType", "module")
  });
  const tokens = Array.isArray(ast.tokens) ? ast.tokens : false;
  delete ast.tokens;
  tokens.forEach(function(token) {
    if (typeof token.value !== "string") {
      token.value = lines.sliceString(token.loc.start, token.loc.end);
    }
  });
  if (Array.isArray(ast.comments)) {
    comments = ast.comments;
    delete ast.comments;
  }
  if (ast.loc) {
    fixFaultyLocations(ast, lines);
  } else {
    ast.loc = {
      start: lines.firstPos(),
      end: lines.lastPos()
    };
  }
  ast.loc.lines = lines;
  ast.loc.indent = 0;
  let file;
  let program;
  if (ast.type === "Program") {
    program = ast;
    file = b$5.file(ast, options.sourceFileName || null);
    file.loc = {
      start: lines.firstPos(),
      end: lines.lastPos(),
      lines,
      indent: 0
    };
  } else if (ast.type === "File") {
    file = ast;
    program = file.program;
  }
  if (options.tokens) {
    file.tokens = tokens;
  }
  const trueProgramLoc = getTrueLoc(
    {
      type: program.type,
      loc: program.loc,
      body: [],
      comments
    },
    lines
  );
  program.loc.start = trueProgramLoc.start;
  program.loc.end = trueProgramLoc.end;
  attach(comments, program.body.length ? file.program : file, lines);
  return new TreeCopier(lines, tokens).copy(file);
}
const TreeCopier = function TreeCopier2(lines, tokens) {
  this.lines = lines;
  this.tokens = tokens;
  this.startTokenIndex = 0;
  this.endTokenIndex = tokens.length;
  this.indent = 0;
  this.seen = /* @__PURE__ */ new Map();
};
const TCp = TreeCopier.prototype;
TCp.copy = function(node) {
  if (this.seen.has(node)) {
    return this.seen.get(node);
  }
  if (isArray$2.check(node)) {
    const copy2 = new Array(node.length);
    this.seen.set(node, copy2);
    node.forEach(function(item, i) {
      copy2[i] = this.copy(item);
    }, this);
    return copy2;
  }
  if (!isObject$2.check(node)) {
    return node;
  }
  fixFaultyLocations(node, this.lines);
  const copy = Object.create(Object.getPrototypeOf(node), {
    original: {
      // Provide a link from the copy to the original.
      value: node,
      configurable: false,
      enumerable: false,
      writable: true
    }
  });
  this.seen.set(node, copy);
  const loc = node.loc;
  const oldIndent = this.indent;
  let newIndent = oldIndent;
  const oldStartTokenIndex = this.startTokenIndex;
  const oldEndTokenIndex = this.endTokenIndex;
  if (loc) {
    if (node.type === "Block" || node.type === "Line" || node.type === "CommentBlock" || node.type === "CommentLine" || this.lines.isPrecededOnlyByWhitespace(loc.start)) {
      newIndent = this.indent = loc.start.column;
    }
    loc.lines = this.lines;
    loc.tokens = this.tokens;
    loc.indent = newIndent;
    this.findTokenRange(loc);
  }
  const keys = Object.keys(node);
  const keyCount = keys.length;
  for (let i = 0; i < keyCount; ++i) {
    const key = keys[i];
    if (key === "loc") {
      copy[key] = node[key];
    } else if (key === "tokens" && node.type === "File") {
      copy[key] = node[key];
    } else {
      copy[key] = this.copy(node[key]);
    }
  }
  this.indent = oldIndent;
  this.startTokenIndex = oldStartTokenIndex;
  this.endTokenIndex = oldEndTokenIndex;
  return copy;
};
TCp.findTokenRange = function(loc) {
  while (this.startTokenIndex > 0) {
    const token = loc.tokens[this.startTokenIndex];
    if (comparePos(loc.start, token.loc.start) < 0) {
      --this.startTokenIndex;
    } else
      break;
  }
  while (this.endTokenIndex < loc.tokens.length) {
    const token = loc.tokens[this.endTokenIndex];
    if (comparePos(token.loc.end, loc.end) < 0) {
      ++this.endTokenIndex;
    } else
      break;
  }
  while (this.startTokenIndex < this.endTokenIndex) {
    const token = loc.tokens[this.startTokenIndex];
    if (comparePos(token.loc.start, loc.start) < 0) {
      ++this.startTokenIndex;
    } else
      break;
  }
  loc.start.token = this.startTokenIndex;
  while (this.endTokenIndex > this.startTokenIndex) {
    const token = loc.tokens[this.endTokenIndex - 1];
    if (comparePos(loc.end, token.loc.end) < 0) {
      --this.endTokenIndex;
    } else
      break;
  }
  loc.end.token = this.endTokenIndex;
};

const n = namedTypes$1;
const isArray$1 = builtInTypes.array;
const isNumber = builtInTypes.number;
const PRECEDENCE = {};
[
  ["??"],
  ["||"],
  ["&&"],
  ["|"],
  ["^"],
  ["&"],
  ["==", "===", "!=", "!=="],
  ["<", ">", "<=", ">=", "in", "instanceof"],
  [">>", "<<", ">>>"],
  ["+", "-"],
  ["*", "/", "%"],
  ["**"]
].forEach(function(tier, i) {
  tier.forEach(function(op) {
    PRECEDENCE[op] = i;
  });
});
const FastPath = function FastPath2(value) {
  this.stack = [value];
};
const FPp = FastPath.prototype;
FastPath.from = function(obj) {
  if (obj instanceof FastPath) {
    return obj.copy();
  }
  if (obj instanceof NodePath) {
    const copy2 = Object.create(FastPath.prototype);
    const stack = [obj.value];
    for (let pp; pp = obj.parentPath; obj = pp)
      stack.push(obj.name, pp.value);
    copy2.stack = stack.reverse();
    return copy2;
  }
  return new FastPath(obj);
};
FPp.copy = function copy() {
  const copy2 = Object.create(FastPath.prototype);
  copy2.stack = this.stack.slice(0);
  return copy2;
};
FPp.getName = function getName() {
  const s = this.stack;
  const len = s.length;
  if (len > 1) {
    return s[len - 2];
  }
  return null;
};
FPp.getValue = function getValue() {
  const s = this.stack;
  return s[s.length - 1];
};
FPp.valueIsDuplicate = function() {
  const s = this.stack;
  const valueIndex = s.length - 1;
  return s.lastIndexOf(s[valueIndex], valueIndex - 1) >= 0;
};
function getNodeHelper(path, count) {
  const s = path.stack;
  for (let i = s.length - 1; i >= 0; i -= 2) {
    const value = s[i];
    if (n.Node.check(value) && --count < 0) {
      return value;
    }
  }
  return null;
}
FPp.getNode = function getNode(count = 0) {
  return getNodeHelper(this, ~~count);
};
FPp.getParentNode = function getParentNode(count = 0) {
  return getNodeHelper(this, ~~count + 1);
};
FPp.getRootValue = function getRootValue() {
  const s = this.stack;
  if (s.length % 2 === 0) {
    return s[1];
  }
  return s[0];
};
FPp.call = function call(callback) {
  const s = this.stack;
  const origLen = s.length;
  let value = s[origLen - 1];
  const argc = arguments.length;
  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }
  const result = callback(this);
  s.length = origLen;
  return result;
};
FPp.each = function each(callback) {
  const s = this.stack;
  const origLen = s.length;
  let value = s[origLen - 1];
  const argc = arguments.length;
  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }
  for (let i = 0; i < value.length; ++i) {
    if (i in value) {
      s.push(i, value[i]);
      callback(this);
      s.length -= 2;
    }
  }
  s.length = origLen;
};
FPp.map = function map(callback) {
  const s = this.stack;
  const origLen = s.length;
  let value = s[origLen - 1];
  const argc = arguments.length;
  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }
  const result = new Array(value.length);
  for (let i = 0; i < value.length; ++i) {
    if (i in value) {
      s.push(i, value[i]);
      result[i] = callback(this, i);
      s.length -= 2;
    }
  }
  s.length = origLen;
  return result;
};
FPp.hasParens = function() {
  const node = this.getNode();
  const prevToken = this.getPrevToken(node);
  if (!prevToken) {
    return false;
  }
  const nextToken = this.getNextToken(node);
  if (!nextToken) {
    return false;
  }
  if (prevToken.value === "(") {
    if (nextToken.value === ")") {
      return true;
    }
    const justNeedsOpeningParen = !this.canBeFirstInStatement() && this.firstInStatement() && !this.needsParens(true);
    if (justNeedsOpeningParen) {
      return true;
    }
  }
  return false;
};
FPp.getPrevToken = function(node) {
  node = node || this.getNode();
  const loc = node && node.loc;
  const tokens = loc && loc.tokens;
  if (tokens && loc.start.token > 0) {
    const token = tokens[loc.start.token - 1];
    if (token) {
      const rootLoc = this.getRootValue().loc;
      if (comparePos(rootLoc.start, token.loc.start) <= 0) {
        return token;
      }
    }
  }
  return null;
};
FPp.getNextToken = function(node) {
  node = node || this.getNode();
  const loc = node && node.loc;
  const tokens = loc && loc.tokens;
  if (tokens && loc.end.token < tokens.length) {
    const token = tokens[loc.end.token];
    if (token) {
      const rootLoc = this.getRootValue().loc;
      if (comparePos(token.loc.end, rootLoc.end) <= 0) {
        return token;
      }
    }
  }
  return null;
};
FPp.needsParens = function(assumeExpressionContext) {
  const node = this.getNode();
  if (node.type === "AssignmentExpression" && node.left.type === "ObjectPattern") {
    return true;
  }
  const parent = this.getParentNode();
  const name = this.getName();
  if (this.getValue() !== node) {
    return false;
  }
  if (n.Statement.check(node)) {
    return false;
  }
  if (node.type === "Identifier") {
    return false;
  }
  if (parent && parent.type === "ParenthesizedExpression") {
    return false;
  }
  if (node.extra && node.extra.parenthesized) {
    return true;
  }
  if (!parent)
    return false;
  if (node.type === "UnaryExpression" && parent.type === "BinaryExpression" && name === "left" && parent.left === node && parent.operator === "**") {
    return true;
  }
  switch (node.type) {
    case "UnaryExpression":
    case "SpreadElement":
    case "SpreadProperty":
      return parent.type === "MemberExpression" && name === "object" && parent.object === node;
    case "BinaryExpression":
    case "LogicalExpression":
      switch (parent.type) {
        case "CallExpression":
          return name === "callee" && parent.callee === node;
        case "UnaryExpression":
        case "SpreadElement":
        case "SpreadProperty":
          return true;
        case "MemberExpression":
          return name === "object" && parent.object === node;
        case "BinaryExpression":
        case "LogicalExpression": {
          const po = parent.operator;
          const pp = PRECEDENCE[po];
          const no = node.operator;
          const np = PRECEDENCE[no];
          if (pp > np) {
            return true;
          }
          if (pp === np && name === "right") {
            return true;
          }
          break;
        }
        default:
          return false;
      }
      break;
    case "SequenceExpression":
      switch (parent.type) {
        case "ReturnStatement":
          return false;
        case "ForStatement":
          return false;
        case "ExpressionStatement":
          return name !== "expression";
        default:
          return true;
      }
    case "OptionalIndexedAccessType":
      return node.optional && parent.type === "IndexedAccessType";
    case "IntersectionTypeAnnotation":
    case "UnionTypeAnnotation":
      return parent.type === "NullableTypeAnnotation";
    case "Literal":
      return parent.type === "MemberExpression" && isNumber.check(node.value) && name === "object" && parent.object === node;
    case "NumericLiteral":
      return parent.type === "MemberExpression" && name === "object" && parent.object === node;
    case "YieldExpression":
    case "AwaitExpression":
    case "AssignmentExpression":
    case "ConditionalExpression":
      switch (parent.type) {
        case "UnaryExpression":
        case "SpreadElement":
        case "SpreadProperty":
        case "BinaryExpression":
        case "LogicalExpression":
          return true;
        case "CallExpression":
        case "NewExpression":
          return name === "callee" && parent.callee === node;
        case "ConditionalExpression":
          return name === "test" && parent.test === node;
        case "MemberExpression":
          return name === "object" && parent.object === node;
        default:
          return false;
      }
    case "ArrowFunctionExpression":
      if (n.CallExpression.check(parent) && name === "callee" && parent.callee === node) {
        return true;
      }
      if (n.MemberExpression.check(parent) && name === "object" && parent.object === node) {
        return true;
      }
      if (n.TSAsExpression && n.TSAsExpression.check(parent) && name === "expression" && parent.expression === node) {
        return true;
      }
      return isBinary(parent);
    case "ObjectExpression":
      if (parent.type === "ArrowFunctionExpression" && name === "body" && parent.body === node) {
        return true;
      }
      break;
    case "TSAsExpression":
      if (parent.type === "ArrowFunctionExpression" && name === "body" && parent.body === node && node.expression.type === "ObjectExpression") {
        return true;
      }
      break;
    case "CallExpression":
      if (name === "declaration" && n.ExportDefaultDeclaration.check(parent) && n.FunctionExpression.check(node.callee)) {
        return true;
      }
  }
  if (parent.type === "NewExpression" && name === "callee" && parent.callee === node) {
    return containsCallExpression(node);
  }
  if (assumeExpressionContext !== true && !this.canBeFirstInStatement() && this.firstInStatement()) {
    return true;
  }
  return false;
};
function isBinary(node) {
  return n.BinaryExpression.check(node) || n.LogicalExpression.check(node);
}
function containsCallExpression(node) {
  if (n.CallExpression.check(node)) {
    return true;
  }
  if (isArray$1.check(node)) {
    return node.some(containsCallExpression);
  }
  if (n.Node.check(node)) {
    return someField(
      node,
      (_name, child) => containsCallExpression(child)
    );
  }
  return false;
}
FPp.canBeFirstInStatement = function() {
  const node = this.getNode();
  if (n.FunctionExpression.check(node)) {
    return false;
  }
  if (n.ObjectExpression.check(node)) {
    return false;
  }
  if (n.ClassExpression.check(node)) {
    return false;
  }
  return true;
};
FPp.firstInStatement = function() {
  const s = this.stack;
  let parentName, parent;
  let childName, child;
  for (let i = s.length - 1; i >= 0; i -= 2) {
    if (n.Node.check(s[i])) {
      childName = parentName;
      child = parent;
      parentName = s[i - 1];
      parent = s[i];
    }
    if (!parent || !child) {
      continue;
    }
    if (n.BlockStatement.check(parent) && parentName === "body" && childName === 0) {
      return true;
    }
    if (n.ExpressionStatement.check(parent) && childName === "expression") {
      return true;
    }
    if (n.AssignmentExpression.check(parent) && childName === "left") {
      return true;
    }
    if (n.ArrowFunctionExpression.check(parent) && childName === "body") {
      return true;
    }
    if (n.SequenceExpression.check(parent) && s[i + 1] === "expressions" && childName === 0) {
      continue;
    }
    if (n.CallExpression.check(parent) && childName === "callee") {
      continue;
    }
    if (n.MemberExpression.check(parent) && childName === "object") {
      continue;
    }
    if (n.ConditionalExpression.check(parent) && childName === "test") {
      continue;
    }
    if (isBinary(parent) && childName === "left") {
      continue;
    }
    if (n.UnaryExpression.check(parent) && !parent.prefix && childName === "argument") {
      continue;
    }
    return false;
  }
  return true;
};

const Printable = namedTypes$1.Printable;
const Expression = namedTypes$1.Expression;
const ReturnStatement = namedTypes$1.ReturnStatement;
const SourceLocation = namedTypes$1.SourceLocation;
const isObject$1 = builtInTypes.object;
const isArray = builtInTypes.array;
const isString$1 = builtInTypes.string;
const riskyAdjoiningCharExp = /[0-9a-z_$]/i;
const Patcher = function Patcher2(lines) {
  const self = this, replacements = [];
  self.replace = function(loc, lines2) {
    if (isString$1.check(lines2))
      lines2 = fromString(lines2);
    replacements.push({
      lines: lines2,
      start: loc.start,
      end: loc.end
    });
  };
  self.get = function(loc) {
    loc = loc || {
      start: { line: 1, column: 0 },
      end: { line: lines.length, column: lines.getLineLength(lines.length) }
    };
    let sliceFrom = loc.start, toConcat = [];
    function pushSlice(from, to) {
      toConcat.push(lines.slice(from, to));
    }
    replacements.sort((a, b) => comparePos(a.start, b.start)).forEach(function(rep) {
      if (comparePos(sliceFrom, rep.start) > 0) ; else {
        pushSlice(sliceFrom, rep.start);
        toConcat.push(rep.lines);
        sliceFrom = rep.end;
      }
    });
    pushSlice(sliceFrom, loc.end);
    return concat(toConcat);
  };
};
const Pp = Patcher.prototype;
Pp.tryToReprintComments = function(newNode, oldNode, print) {
  const patcher = this;
  if (!newNode.comments && !oldNode.comments) {
    return true;
  }
  const newPath = FastPath.from(newNode);
  const oldPath = FastPath.from(oldNode);
  newPath.stack.push("comments", getSurroundingComments(newNode));
  oldPath.stack.push("comments", getSurroundingComments(oldNode));
  const reprints = [];
  const ableToReprintComments = findArrayReprints(newPath, oldPath, reprints);
  if (ableToReprintComments && reprints.length > 0) {
    reprints.forEach(function(reprint) {
      const oldComment = reprint.oldPath.getValue();
      patcher.replace(
        oldComment.loc,
        // Comments can't have .comments, so it doesn't matter whether we
        // print with comments or without.
        print(reprint.newPath).indentTail(oldComment.loc.indent)
      );
    });
  }
  return ableToReprintComments;
};
function getSurroundingComments(node) {
  const result = [];
  if (node.comments && node.comments.length > 0) {
    node.comments.forEach(function(comment) {
      if (comment.leading || comment.trailing) {
        result.push(comment);
      }
    });
  }
  return result;
}
Pp.deleteComments = function(node) {
  if (!node.comments) {
    return;
  }
  const patcher = this;
  node.comments.forEach(function(comment) {
    if (comment.leading) {
      patcher.replace(
        {
          start: comment.loc.start,
          end: node.loc.lines.skipSpaces(comment.loc.end, false, false)
        },
        ""
      );
    } else if (comment.trailing) {
      patcher.replace(
        {
          start: node.loc.lines.skipSpaces(comment.loc.start, true, false),
          end: comment.loc.end
        },
        ""
      );
    }
  });
};
function getReprinter(path) {
  const node = path.getValue();
  if (!Printable.check(node))
    return;
  const orig = node.original;
  const origLoc = orig && orig.loc;
  const lines = origLoc && origLoc.lines;
  const reprints = [];
  if (!lines || !findReprints(path, reprints))
    return;
  return function(print) {
    const patcher = new Patcher(lines);
    reprints.forEach(function(reprint) {
      const newNode = reprint.newPath.getValue();
      const oldNode = reprint.oldPath.getValue();
      SourceLocation.assert(oldNode.loc, true);
      const needToPrintNewPathWithComments = !patcher.tryToReprintComments(
        newNode,
        oldNode,
        print
      );
      if (needToPrintNewPathWithComments) {
        patcher.deleteComments(oldNode);
      }
      let newLines = print(reprint.newPath, {
        includeComments: needToPrintNewPathWithComments,
        // If the oldNode we're replacing already had parentheses, we may
        // not need to print the new node with any extra parentheses,
        // because the existing parentheses will suffice. However, if the
        // newNode has a different type than the oldNode, let the printer
        // decide if reprint.newPath needs parentheses, as usual.
        avoidRootParens: oldNode.type === newNode.type && reprint.oldPath.hasParens()
      }).indentTail(oldNode.loc.indent);
      const nls = needsLeadingSpace(lines, oldNode.loc, newLines);
      const nts = needsTrailingSpace(lines, oldNode.loc, newLines);
      if (nls || nts) {
        const newParts = [];
        nls && newParts.push(" ");
        newParts.push(newLines);
        nts && newParts.push(" ");
        newLines = concat(newParts);
      }
      patcher.replace(oldNode.loc, newLines);
    });
    const patchedLines = patcher.get(origLoc).indentTail(-orig.loc.indent);
    if (path.needsParens()) {
      return concat(["(", patchedLines, ")"]);
    }
    return patchedLines;
  };
}
function needsLeadingSpace(oldLines, oldLoc, newLines) {
  const posBeforeOldLoc = copyPos(oldLoc.start);
  const charBeforeOldLoc = oldLines.prevPos(posBeforeOldLoc) && oldLines.charAt(posBeforeOldLoc);
  const newFirstChar = newLines.charAt(newLines.firstPos());
  return charBeforeOldLoc && riskyAdjoiningCharExp.test(charBeforeOldLoc) && newFirstChar && riskyAdjoiningCharExp.test(newFirstChar);
}
function needsTrailingSpace(oldLines, oldLoc, newLines) {
  const charAfterOldLoc = oldLines.charAt(oldLoc.end);
  const newLastPos = newLines.lastPos();
  const newLastChar = newLines.prevPos(newLastPos) && newLines.charAt(newLastPos);
  return newLastChar && riskyAdjoiningCharExp.test(newLastChar) && charAfterOldLoc && riskyAdjoiningCharExp.test(charAfterOldLoc);
}
function findReprints(newPath, reprints) {
  const newNode = newPath.getValue();
  Printable.assert(newNode);
  const oldNode = newNode.original;
  Printable.assert(oldNode);
  if (newNode.type !== oldNode.type) {
    return false;
  }
  const oldPath = new FastPath(oldNode);
  const canReprint = findChildReprints(newPath, oldPath, reprints);
  if (!canReprint) {
    reprints.length = 0;
  }
  return canReprint;
}
function findAnyReprints(newPath, oldPath, reprints) {
  const newNode = newPath.getValue();
  const oldNode = oldPath.getValue();
  if (newNode === oldNode)
    return true;
  if (isArray.check(newNode))
    return findArrayReprints(newPath, oldPath, reprints);
  if (isObject$1.check(newNode))
    return findObjectReprints(newPath, oldPath, reprints);
  return false;
}
function findArrayReprints(newPath, oldPath, reprints) {
  const newNode = newPath.getValue();
  const oldNode = oldPath.getValue();
  if (newNode === oldNode || newPath.valueIsDuplicate() || oldPath.valueIsDuplicate()) {
    return true;
  }
  isArray.assert(newNode);
  const len = newNode.length;
  if (!(isArray.check(oldNode) && oldNode.length === len))
    return false;
  for (let i = 0; i < len; ++i) {
    newPath.stack.push(i, newNode[i]);
    oldPath.stack.push(i, oldNode[i]);
    const canReprint = findAnyReprints(newPath, oldPath, reprints);
    newPath.stack.length -= 2;
    oldPath.stack.length -= 2;
    if (!canReprint) {
      return false;
    }
  }
  return true;
}
function findObjectReprints(newPath, oldPath, reprints) {
  const newNode = newPath.getValue();
  isObject$1.assert(newNode);
  if (newNode.original === null) {
    return false;
  }
  const oldNode = oldPath.getValue();
  if (!isObject$1.check(oldNode))
    return false;
  if (newNode === oldNode || newPath.valueIsDuplicate() || oldPath.valueIsDuplicate()) {
    return true;
  }
  if (Printable.check(newNode)) {
    if (!Printable.check(oldNode)) {
      return false;
    }
    const newParentNode = newPath.getParentNode();
    const oldParentNode = oldPath.getParentNode();
    if (oldParentNode !== null && oldParentNode.type === "FunctionTypeAnnotation" && newParentNode !== null && newParentNode.type === "FunctionTypeAnnotation") {
      const oldNeedsParens = oldParentNode.params.length !== 1 || !!oldParentNode.params[0].name;
      const newNeedParens = newParentNode.params.length !== 1 || !!newParentNode.params[0].name;
      if (!oldNeedsParens && newNeedParens) {
        return false;
      }
    }
    if (newNode.type === oldNode.type) {
      const childReprints = [];
      if (findChildReprints(newPath, oldPath, childReprints)) {
        reprints.push.apply(reprints, childReprints);
      } else if (oldNode.loc) {
        reprints.push({
          oldPath: oldPath.copy(),
          newPath: newPath.copy()
        });
      } else {
        return false;
      }
      return true;
    }
    if (Expression.check(newNode) && Expression.check(oldNode) && // If we have no .loc information for oldNode, then we won't be
    // able to reprint it.
    oldNode.loc) {
      reprints.push({
        oldPath: oldPath.copy(),
        newPath: newPath.copy()
      });
      return true;
    }
    return false;
  }
  return findChildReprints(newPath, oldPath, reprints);
}
function findChildReprints(newPath, oldPath, reprints) {
  const newNode = newPath.getValue();
  const oldNode = oldPath.getValue();
  isObject$1.assert(newNode);
  isObject$1.assert(oldNode);
  if (newNode.original === null) {
    return false;
  }
  if (newPath.needsParens() && !oldPath.hasParens()) {
    return false;
  }
  const keys = getUnionOfKeys(oldNode, newNode);
  if (oldNode.type === "File" || newNode.type === "File") {
    delete keys.tokens;
  }
  delete keys.loc;
  const originalReprintCount = reprints.length;
  for (let k in keys) {
    if (k.charAt(0) === "_") {
      continue;
    }
    newPath.stack.push(k, getFieldValue(newNode, k));
    oldPath.stack.push(k, getFieldValue(oldNode, k));
    const canReprint = findAnyReprints(newPath, oldPath, reprints);
    newPath.stack.length -= 2;
    oldPath.stack.length -= 2;
    if (!canReprint) {
      return false;
    }
  }
  if (ReturnStatement.check(newPath.getNode()) && reprints.length > originalReprintCount) {
    return false;
  }
  return true;
}

const namedTypes = namedTypes$1;
const isString = builtInTypes.string;
const isObject = builtInTypes.object;
const PrintResult = function PrintResult2(code, sourceMap) {
  isString.assert(code);
  this.code = code;
  if (sourceMap) {
    isObject.assert(sourceMap);
    this.map = sourceMap;
  }
};
const PRp = PrintResult.prototype;
let warnedAboutToString = false;
PRp.toString = function() {
  if (!warnedAboutToString) {
    console.warn(
      "Deprecation warning: recast.print now returns an object with a .code property. You appear to be treating the object as a string, which might still work but is strongly discouraged."
    );
    warnedAboutToString = true;
  }
  return this.code;
};
const emptyPrintResult = new PrintResult("");
const Printer = function Printer2(config) {
  const explicitTabWidth = config && config.tabWidth;
  config = normalize(config);
  config.sourceFileName = null;
  function makePrintFunctionWith(options, overrides) {
    options = Object.assign({}, options, overrides);
    return (path) => print(path, options);
  }
  function print(path, options) {
    options = options || {};
    if (options.includeComments) {
      return printComments(
        path,
        makePrintFunctionWith(options, {
          includeComments: false
        })
      );
    }
    const oldTabWidth = config.tabWidth;
    if (!explicitTabWidth) {
      const loc = path.getNode().loc;
      if (loc && loc.lines && loc.lines.guessTabWidth) {
        config.tabWidth = loc.lines.guessTabWidth();
      }
    }
    const reprinter = getReprinter(path);
    const lines = reprinter ? (
      // Since the print function that we pass to the reprinter will
      // be used to print "new" nodes, it's tempting to think we
      // should pass printRootGenerically instead of print, to avoid
      // calling maybeReprint again, but that would be a mistake
      // because the new nodes might not be entirely new, but merely
      // moved from elsewhere in the AST. The print function is the
      // right choice because it gives us the opportunity to reprint
      // such nodes using their original source.
      reprinter(print)
    ) : genericPrint(
      path,
      config,
      options,
      makePrintFunctionWith(options, {
        includeComments: true,
        avoidRootParens: false
      })
    );
    config.tabWidth = oldTabWidth;
    return lines;
  }
  this.print = function(ast) {
    if (!ast) {
      return emptyPrintResult;
    }
    const lines = print(FastPath.from(ast), {
      includeComments: true,
      avoidRootParens: false
    });
    return new PrintResult(
      lines.toString(config),
      composeSourceMaps(
        config.inputSourceMap,
        lines.getSourceMap(config.sourceMapName, config.sourceRoot)
      )
    );
  };
  this.printGenerically = function(ast) {
    if (!ast) {
      return emptyPrintResult;
    }
    function printGenerically(path2) {
      return printComments(
        path2,
        (path3) => genericPrint(
          path3,
          config,
          {
            includeComments: true,
            avoidRootParens: false
          },
          printGenerically
        )
      );
    }
    const path = FastPath.from(ast);
    const oldReuseWhitespace = config.reuseWhitespace;
    config.reuseWhitespace = false;
    const pr = new PrintResult(printGenerically(path).toString(config));
    config.reuseWhitespace = oldReuseWhitespace;
    return pr;
  };
};
function genericPrint(path, config, options, printPath) {
  const node = path.getValue();
  const parts = [];
  const linesWithoutParens = genericPrintNoParens(path, config, printPath);
  if (!node || linesWithoutParens.isEmpty()) {
    return linesWithoutParens;
  }
  let shouldAddParens = false;
  const decoratorsLines = printDecorators(path, printPath);
  if (decoratorsLines.isEmpty()) {
    if (!options.avoidRootParens) {
      shouldAddParens = path.needsParens();
    }
  } else {
    parts.push(decoratorsLines);
  }
  if (shouldAddParens) {
    parts.unshift("(");
  }
  parts.push(linesWithoutParens);
  if (shouldAddParens) {
    parts.push(")");
  }
  return concat(parts);
}
function genericPrintNoParens(path, options, print) {
  const n = path.getValue();
  if (!n) {
    return fromString("");
  }
  if (typeof n === "string") {
    return fromString(n, options);
  }
  namedTypes.Printable.assert(n);
  const parts = [];
  switch (n.type) {
    case "File":
      return path.call(print, "program");
    case "Program":
      if (n.directives) {
        path.each(function(childPath) {
          parts.push(print(childPath), ";\n");
        }, "directives");
      }
      if (n.interpreter) {
        parts.push(path.call(print, "interpreter"));
      }
      parts.push(
        path.call(
          (bodyPath) => printStatementSequence(bodyPath, options, print),
          "body"
        )
      );
      return concat(parts);
    case "Noop":
    case "EmptyStatement":
      return fromString("");
    case "ExpressionStatement":
      return concat([path.call(print, "expression"), ";"]);
    case "ParenthesizedExpression":
      return concat(["(", path.call(print, "expression"), ")"]);
    case "BinaryExpression":
    case "LogicalExpression":
    case "AssignmentExpression":
      return fromString(" ").join([
        path.call(print, "left"),
        n.operator,
        path.call(print, "right")
      ]);
    case "AssignmentPattern":
      return concat([
        path.call(print, "left"),
        " = ",
        path.call(print, "right")
      ]);
    case "MemberExpression":
    case "OptionalMemberExpression": {
      parts.push(path.call(print, "object"));
      const property = path.call(print, "property");
      const optional = getFieldValue(n, "optional");
      if (n.computed) {
        parts.push(optional ? "?.[" : "[", property, "]");
      } else {
        parts.push(optional ? "?." : ".", property);
      }
      return concat(parts);
    }
    case "ChainExpression":
      return path.call(print, "expression");
    case "MetaProperty":
      return concat([
        path.call(print, "meta"),
        ".",
        path.call(print, "property")
      ]);
    case "BindExpression":
      if (n.object) {
        parts.push(path.call(print, "object"));
      }
      parts.push("::", path.call(print, "callee"));
      return concat(parts);
    case "Path":
      return fromString(".").join(n.body);
    case "Identifier":
      return concat([
        fromString(n.name, options),
        n.optional ? "?" : "",
        path.call(print, "typeAnnotation")
      ]);
    case "SpreadElement":
    case "SpreadElementPattern":
    case "RestProperty":
    case "SpreadProperty":
    case "SpreadPropertyPattern":
    case "ObjectTypeSpreadProperty":
    case "RestElement":
      return concat([
        "...",
        path.call(print, "argument"),
        path.call(print, "typeAnnotation")
      ]);
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "TSDeclareFunction":
      if (n.declare) {
        parts.push("declare ");
      }
      if (n.async) {
        parts.push("async ");
      }
      parts.push("function");
      if (n.generator)
        parts.push("*");
      if (n.id) {
        parts.push(
          " ",
          path.call(print, "id"),
          path.call(print, "typeParameters")
        );
      } else {
        if (n.typeParameters) {
          parts.push(path.call(print, "typeParameters"));
        }
      }
      parts.push(
        "(",
        printFunctionParams(path, options, print),
        ")",
        path.call(print, "returnType")
      );
      if (n.body) {
        parts.push(" ", path.call(print, "body"));
      }
      return concat(parts);
    case "ArrowFunctionExpression":
      if (n.async) {
        parts.push("async ");
      }
      if (n.typeParameters) {
        parts.push(path.call(print, "typeParameters"));
      }
      if (!options.arrowParensAlways && n.params.length === 1 && !n.rest && n.params[0].type === "Identifier" && !n.params[0].typeAnnotation && !n.returnType) {
        parts.push(path.call(print, "params", 0));
      } else {
        parts.push(
          "(",
          printFunctionParams(path, options, print),
          ")",
          path.call(print, "returnType")
        );
      }
      parts.push(" => ", path.call(print, "body"));
      return concat(parts);
    case "MethodDefinition":
      return printMethod(path, options, print);
    case "YieldExpression":
      parts.push("yield");
      if (n.delegate)
        parts.push("*");
      if (n.argument)
        parts.push(" ", path.call(print, "argument"));
      return concat(parts);
    case "AwaitExpression":
      parts.push("await");
      if (n.all)
        parts.push("*");
      if (n.argument)
        parts.push(" ", path.call(print, "argument"));
      return concat(parts);
    case "ModuleExpression":
      return concat([
        "module {\n",
        path.call(print, "body").indent(options.tabWidth),
        "\n}"
      ]);
    case "ModuleDeclaration":
      parts.push("module", path.call(print, "id"));
      if (n.source) {
        parts.push("from", path.call(print, "source"));
      } else {
        parts.push(path.call(print, "body"));
      }
      return fromString(" ").join(parts);
    case "ImportSpecifier":
      if (n.importKind && n.importKind !== "value") {
        parts.push(n.importKind + " ");
      }
      if (n.imported) {
        parts.push(path.call(print, "imported"));
        if (n.local && n.local.name !== n.imported.name) {
          parts.push(" as ", path.call(print, "local"));
        }
      } else if (n.id) {
        parts.push(path.call(print, "id"));
        if (n.name) {
          parts.push(" as ", path.call(print, "name"));
        }
      }
      return concat(parts);
    case "ExportSpecifier":
      if (n.exportKind && n.exportKind !== "value") {
        parts.push(n.exportKind + " ");
      }
      if (n.local) {
        parts.push(path.call(print, "local"));
        if (n.exported && n.exported.name !== n.local.name) {
          parts.push(" as ", path.call(print, "exported"));
        }
      } else if (n.id) {
        parts.push(path.call(print, "id"));
        if (n.name) {
          parts.push(" as ", path.call(print, "name"));
        }
      }
      return concat(parts);
    case "ExportBatchSpecifier":
      return fromString("*");
    case "ImportNamespaceSpecifier":
      parts.push("* as ");
      if (n.local) {
        parts.push(path.call(print, "local"));
      } else if (n.id) {
        parts.push(path.call(print, "id"));
      }
      return concat(parts);
    case "ImportDefaultSpecifier":
      if (n.local) {
        return path.call(print, "local");
      }
      return path.call(print, "id");
    case "TSExportAssignment":
      return concat(["export = ", path.call(print, "expression")]);
    case "ExportDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
      return printExportDeclaration(path, options, print);
    case "ExportAllDeclaration":
      parts.push("export *");
      if (n.exported) {
        parts.push(" as ", path.call(print, "exported"));
      }
      parts.push(" from ", path.call(print, "source"), ";");
      return concat(parts);
    case "TSNamespaceExportDeclaration":
      parts.push("export as namespace ", path.call(print, "id"));
      return maybeAddSemicolon(concat(parts));
    case "ExportNamespaceSpecifier":
      return concat(["* as ", path.call(print, "exported")]);
    case "ExportDefaultSpecifier":
      return path.call(print, "exported");
    case "Import":
      return fromString("import", options);
    case "ImportExpression":
      return concat(["import(", path.call(print, "source"), ")"]);
    case "ImportDeclaration": {
      parts.push("import ");
      if (n.importKind && n.importKind !== "value") {
        parts.push(n.importKind + " ");
      }
      if (n.specifiers && n.specifiers.length > 0) {
        const unbracedSpecifiers = [];
        const bracedSpecifiers = [];
        path.each(function(specifierPath) {
          const spec = specifierPath.getValue();
          if (spec.type === "ImportSpecifier") {
            bracedSpecifiers.push(print(specifierPath));
          } else if (spec.type === "ImportDefaultSpecifier" || spec.type === "ImportNamespaceSpecifier") {
            unbracedSpecifiers.push(print(specifierPath));
          }
        }, "specifiers");
        unbracedSpecifiers.forEach((lines, i) => {
          if (i > 0) {
            parts.push(", ");
          }
          parts.push(lines);
        });
        if (bracedSpecifiers.length > 0) {
          let lines = fromString(", ").join(bracedSpecifiers);
          if (lines.getLineLength(1) > options.wrapColumn) {
            lines = concat([
              fromString(",\n").join(bracedSpecifiers).indent(options.tabWidth),
              ","
            ]);
          }
          if (unbracedSpecifiers.length > 0) {
            parts.push(", ");
          }
          if (lines.length > 1) {
            parts.push("{\n", lines, "\n}");
          } else if (options.objectCurlySpacing) {
            parts.push("{ ", lines, " }");
          } else {
            parts.push("{", lines, "}");
          }
        }
        parts.push(" from ");
      }
      parts.push(
        path.call(print, "source"),
        maybePrintImportAssertions(path, options, print),
        ";"
      );
      return concat(parts);
    }
    case "ImportAttribute":
      return concat([path.call(print, "key"), ": ", path.call(print, "value")]);
    case "StaticBlock":
      parts.push("static ");
    case "BlockStatement": {
      const naked = path.call(
        (bodyPath) => printStatementSequence(bodyPath, options, print),
        "body"
      );
      if (naked.isEmpty()) {
        if (!n.directives || n.directives.length === 0) {
          parts.push("{}");
          return concat(parts);
        }
      }
      parts.push("{\n");
      if (n.directives) {
        path.each(function(childPath) {
          parts.push(
            maybeAddSemicolon(print(childPath).indent(options.tabWidth)),
            n.directives.length > 1 || !naked.isEmpty() ? "\n" : ""
          );
        }, "directives");
      }
      parts.push(naked.indent(options.tabWidth));
      parts.push("\n}");
      return concat(parts);
    }
    case "ReturnStatement": {
      parts.push("return");
      if (n.argument) {
        const argLines = path.call(print, "argument");
        if (argLines.startsWithComment() || argLines.length > 1 && namedTypes.JSXElement && namedTypes.JSXElement.check(n.argument)) {
          parts.push(" (\n", argLines.indent(options.tabWidth), "\n)");
        } else {
          parts.push(" ", argLines);
        }
      }
      parts.push(";");
      return concat(parts);
    }
    case "CallExpression":
    case "OptionalCallExpression":
      parts.push(path.call(print, "callee"));
      if (n.typeParameters) {
        parts.push(path.call(print, "typeParameters"));
      }
      if (n.typeArguments) {
        parts.push(path.call(print, "typeArguments"));
      }
      if (getFieldValue(n, "optional")) {
        parts.push("?.");
      }
      parts.push(printArgumentsList(path, options, print));
      return concat(parts);
    case "RecordExpression":
      parts.push("#");
    case "ObjectExpression":
    case "ObjectPattern":
    case "ObjectTypeAnnotation": {
      const isTypeAnnotation = n.type === "ObjectTypeAnnotation";
      const separator = options.flowObjectCommas ? "," : isTypeAnnotation ? ";" : ",";
      const fields = [];
      let allowBreak = false;
      if (isTypeAnnotation) {
        fields.push("indexers", "callProperties");
        if (n.internalSlots != null) {
          fields.push("internalSlots");
        }
      }
      fields.push("properties");
      let len = 0;
      fields.forEach(function(field) {
        len += n[field].length;
      });
      const oneLine = isTypeAnnotation && len === 1 || len === 0;
      const leftBrace = n.exact ? "{|" : "{";
      const rightBrace = n.exact ? "|}" : "}";
      parts.push(oneLine ? leftBrace : leftBrace + "\n");
      const leftBraceIndex = parts.length - 1;
      let i = 0;
      fields.forEach(function(field) {
        path.each(function(childPath) {
          let lines = print(childPath);
          if (!oneLine) {
            lines = lines.indent(options.tabWidth);
          }
          const multiLine = !isTypeAnnotation && lines.length > 1;
          if (multiLine && allowBreak) {
            parts.push("\n");
          }
          parts.push(lines);
          if (i < len - 1) {
            parts.push(separator + (multiLine ? "\n\n" : "\n"));
            allowBreak = !multiLine;
          } else if (len !== 1 && isTypeAnnotation) {
            parts.push(separator);
          } else if (!oneLine && isTrailingCommaEnabled(options, "objects") && childPath.getValue().type !== "RestElement") {
            parts.push(separator);
          }
          i++;
        }, field);
      });
      if (n.inexact) {
        const line = fromString("...", options);
        if (oneLine) {
          if (len > 0) {
            parts.push(separator, " ");
          }
          parts.push(line);
        } else {
          parts.push("\n", line.indent(options.tabWidth));
        }
      }
      parts.push(oneLine ? rightBrace : "\n" + rightBrace);
      if (i !== 0 && oneLine && options.objectCurlySpacing) {
        parts[leftBraceIndex] = leftBrace + " ";
        parts[parts.length - 1] = " " + rightBrace;
      }
      if (n.typeAnnotation) {
        parts.push(path.call(print, "typeAnnotation"));
      }
      return concat(parts);
    }
    case "PropertyPattern":
      return concat([
        path.call(print, "key"),
        ": ",
        path.call(print, "pattern")
      ]);
    case "ObjectProperty":
    case "Property": {
      if (n.method || n.kind === "get" || n.kind === "set") {
        return printMethod(path, options, print);
      }
      if (n.shorthand && n.value.type === "AssignmentPattern") {
        return path.call(print, "value");
      }
      const key = path.call(print, "key");
      if (n.computed) {
        parts.push("[", key, "]");
      } else {
        parts.push(key);
      }
      if (!n.shorthand || n.key.name !== n.value.name) {
        parts.push(": ", path.call(print, "value"));
      }
      return concat(parts);
    }
    case "ClassMethod":
    case "ObjectMethod":
    case "ClassPrivateMethod":
    case "TSDeclareMethod":
      return printMethod(path, options, print);
    case "PrivateName":
      return concat(["#", path.call(print, "id")]);
    case "Decorator":
      return concat(["@", path.call(print, "expression")]);
    case "TupleExpression":
      parts.push("#");
    case "ArrayExpression":
    case "ArrayPattern": {
      const elems = n.elements;
      const len = elems.length;
      const printed = path.map(print, "elements");
      const joined = fromString(", ").join(printed);
      const oneLine = joined.getLineLength(1) <= options.wrapColumn;
      if (oneLine) {
        if (options.arrayBracketSpacing) {
          parts.push("[ ");
        } else {
          parts.push("[");
        }
      } else {
        parts.push("[\n");
      }
      path.each(function(elemPath) {
        const i = elemPath.getName();
        const elem = elemPath.getValue();
        if (!elem) {
          parts.push(",");
        } else {
          let lines = printed[i];
          if (oneLine) {
            if (i > 0)
              parts.push(" ");
          } else {
            lines = lines.indent(options.tabWidth);
          }
          parts.push(lines);
          if (i < len - 1 || !oneLine && isTrailingCommaEnabled(options, "arrays"))
            parts.push(",");
          if (!oneLine)
            parts.push("\n");
        }
      }, "elements");
      if (oneLine && options.arrayBracketSpacing) {
        parts.push(" ]");
      } else {
        parts.push("]");
      }
      if (n.typeAnnotation) {
        parts.push(path.call(print, "typeAnnotation"));
      }
      return concat(parts);
    }
    case "SequenceExpression":
      return fromString(", ").join(path.map(print, "expressions"));
    case "ThisExpression":
      return fromString("this");
    case "Super":
      return fromString("super");
    case "NullLiteral":
      return fromString("null");
    case "RegExpLiteral":
      return fromString(
        getPossibleRaw(n) || `/${n.pattern}/${n.flags || ""}`,
        options
      );
    case "BigIntLiteral":
      return fromString(getPossibleRaw(n) || n.value + "n", options);
    case "NumericLiteral":
      return fromString(getPossibleRaw(n) || n.value, options);
    case "DecimalLiteral":
      return fromString(getPossibleRaw(n) || n.value + "m", options);
    case "StringLiteral":
      return fromString(nodeStr(n.value, options));
    case "BooleanLiteral":
    case "Literal":
      return fromString(
        getPossibleRaw(n) || (typeof n.value === "string" ? nodeStr(n.value, options) : n.value),
        options
      );
    case "Directive":
      return path.call(print, "value");
    case "DirectiveLiteral":
      return fromString(
        getPossibleRaw(n) || nodeStr(n.value, options),
        options
      );
    case "InterpreterDirective":
      return fromString(`#!${n.value}
`, options);
    case "ModuleSpecifier":
      if (n.local) {
        throw new Error("The ESTree ModuleSpecifier type should be abstract");
      }
      return fromString(nodeStr(n.value, options), options);
    case "UnaryExpression":
      parts.push(n.operator);
      if (/[a-z]$/.test(n.operator))
        parts.push(" ");
      parts.push(path.call(print, "argument"));
      return concat(parts);
    case "UpdateExpression":
      parts.push(path.call(print, "argument"), n.operator);
      if (n.prefix)
        parts.reverse();
      return concat(parts);
    case "ConditionalExpression":
      return concat([
        path.call(print, "test"),
        " ? ",
        path.call(print, "consequent"),
        " : ",
        path.call(print, "alternate")
      ]);
    case "NewExpression": {
      parts.push("new ", path.call(print, "callee"));
      if (n.typeParameters) {
        parts.push(path.call(print, "typeParameters"));
      }
      if (n.typeArguments) {
        parts.push(path.call(print, "typeArguments"));
      }
      const args = n.arguments;
      if (args) {
        parts.push(printArgumentsList(path, options, print));
      }
      return concat(parts);
    }
    case "VariableDeclaration": {
      if (n.declare) {
        parts.push("declare ");
      }
      parts.push(n.kind, " ");
      let maxLen = 0;
      const printed = path.map(function(childPath) {
        const lines = print(childPath);
        maxLen = Math.max(lines.length, maxLen);
        return lines;
      }, "declarations");
      if (maxLen === 1) {
        parts.push(fromString(", ").join(printed));
      } else if (printed.length > 1) {
        parts.push(
          fromString(",\n").join(printed).indentTail(n.kind.length + 1)
        );
      } else {
        parts.push(printed[0]);
      }
      const parentNode = path.getParentNode();
      if (!namedTypes.ForStatement.check(parentNode) && !namedTypes.ForInStatement.check(parentNode) && !(namedTypes.ForOfStatement && namedTypes.ForOfStatement.check(parentNode)) && !(namedTypes.ForAwaitStatement && namedTypes.ForAwaitStatement.check(parentNode))) {
        parts.push(";");
      }
      return concat(parts);
    }
    case "VariableDeclarator":
      return n.init ? fromString(" = ").join([
        path.call(print, "id"),
        path.call(print, "init")
      ]) : path.call(print, "id");
    case "WithStatement":
      return concat([
        "with (",
        path.call(print, "object"),
        ") ",
        path.call(print, "body")
      ]);
    case "IfStatement": {
      const con = adjustClause(path.call(print, "consequent"), options);
      parts.push("if (", path.call(print, "test"), ")", con);
      if (n.alternate)
        parts.push(
          endsWithBrace(con) ? " else" : "\nelse",
          adjustClause(path.call(print, "alternate"), options)
        );
      return concat(parts);
    }
    case "ForStatement": {
      const init = path.call(print, "init");
      const sep = init.length > 1 ? ";\n" : "; ";
      const forParen = "for (";
      const indented = fromString(sep).join([init, path.call(print, "test"), path.call(print, "update")]).indentTail(forParen.length);
      const head = concat([forParen, indented, ")"]);
      let clause = adjustClause(path.call(print, "body"), options);
      parts.push(head);
      if (head.length > 1) {
        parts.push("\n");
        clause = clause.trimLeft();
      }
      parts.push(clause);
      return concat(parts);
    }
    case "WhileStatement":
      return concat([
        "while (",
        path.call(print, "test"),
        ")",
        adjustClause(path.call(print, "body"), options)
      ]);
    case "ForInStatement":
      return concat([
        n.each ? "for each (" : "for (",
        path.call(print, "left"),
        " in ",
        path.call(print, "right"),
        ")",
        adjustClause(path.call(print, "body"), options)
      ]);
    case "ForOfStatement":
    case "ForAwaitStatement":
      parts.push("for ");
      if (n.await || n.type === "ForAwaitStatement") {
        parts.push("await ");
      }
      parts.push(
        "(",
        path.call(print, "left"),
        " of ",
        path.call(print, "right"),
        ")",
        adjustClause(path.call(print, "body"), options)
      );
      return concat(parts);
    case "DoWhileStatement": {
      const doBody = concat([
        "do",
        adjustClause(path.call(print, "body"), options)
      ]);
      parts.push(doBody);
      if (endsWithBrace(doBody))
        parts.push(" while");
      else
        parts.push("\nwhile");
      parts.push(" (", path.call(print, "test"), ");");
      return concat(parts);
    }
    case "DoExpression": {
      const statements = path.call(
        (bodyPath) => printStatementSequence(bodyPath, options, print),
        "body"
      );
      return concat(["do {\n", statements.indent(options.tabWidth), "\n}"]);
    }
    case "BreakStatement":
      parts.push("break");
      if (n.label)
        parts.push(" ", path.call(print, "label"));
      parts.push(";");
      return concat(parts);
    case "ContinueStatement":
      parts.push("continue");
      if (n.label)
        parts.push(" ", path.call(print, "label"));
      parts.push(";");
      return concat(parts);
    case "LabeledStatement":
      return concat([
        path.call(print, "label"),
        ":\n",
        path.call(print, "body")
      ]);
    case "TryStatement":
      parts.push("try ", path.call(print, "block"));
      if (n.handler) {
        parts.push(" ", path.call(print, "handler"));
      } else if (n.handlers) {
        path.each(function(handlerPath) {
          parts.push(" ", print(handlerPath));
        }, "handlers");
      }
      if (n.finalizer) {
        parts.push(" finally ", path.call(print, "finalizer"));
      }
      return concat(parts);
    case "CatchClause":
      parts.push("catch ");
      if (n.param) {
        parts.push("(", path.call(print, "param"));
      }
      if (n.guard) {
        parts.push(" if ", path.call(print, "guard"));
      }
      if (n.param) {
        parts.push(") ");
      }
      parts.push(path.call(print, "body"));
      return concat(parts);
    case "ThrowStatement":
      return concat(["throw ", path.call(print, "argument"), ";"]);
    case "SwitchStatement":
      return concat([
        "switch (",
        path.call(print, "discriminant"),
        ") {\n",
        fromString("\n").join(path.map(print, "cases")),
        "\n}"
      ]);
    case "SwitchCase":
      if (n.test)
        parts.push("case ", path.call(print, "test"), ":");
      else
        parts.push("default:");
      if (n.consequent.length > 0) {
        parts.push(
          "\n",
          path.call(
            (consequentPath) => printStatementSequence(consequentPath, options, print),
            "consequent"
          ).indent(options.tabWidth)
        );
      }
      return concat(parts);
    case "DebuggerStatement":
      return fromString("debugger;");
    case "JSXAttribute":
      parts.push(path.call(print, "name"));
      if (n.value)
        parts.push("=", path.call(print, "value"));
      return concat(parts);
    case "JSXIdentifier":
      return fromString(n.name, options);
    case "JSXNamespacedName":
      return fromString(":").join([
        path.call(print, "namespace"),
        path.call(print, "name")
      ]);
    case "JSXMemberExpression":
      return fromString(".").join([
        path.call(print, "object"),
        path.call(print, "property")
      ]);
    case "JSXSpreadAttribute":
      return concat(["{...", path.call(print, "argument"), "}"]);
    case "JSXSpreadChild":
      return concat(["{...", path.call(print, "expression"), "}"]);
    case "JSXExpressionContainer":
      return concat(["{", path.call(print, "expression"), "}"]);
    case "JSXElement":
    case "JSXFragment": {
      const openingPropName = "opening" + (n.type === "JSXElement" ? "Element" : "Fragment");
      const closingPropName = "closing" + (n.type === "JSXElement" ? "Element" : "Fragment");
      const openingLines = path.call(print, openingPropName);
      if (n[openingPropName].selfClosing) {
        return openingLines;
      }
      const childLines = concat(
        path.map(function(childPath) {
          const child = childPath.getValue();
          if (namedTypes.Literal.check(child) && typeof child.value === "string") {
            if (/\S/.test(child.value)) {
              return child.value.replace(/^\s+|\s+$/g, "");
            } else if (/\n/.test(child.value)) {
              return "\n";
            }
          }
          return print(childPath);
        }, "children")
      ).indentTail(options.tabWidth);
      const closingLines = path.call(print, closingPropName);
      return concat([openingLines, childLines, closingLines]);
    }
    case "JSXOpeningElement": {
      parts.push("<", path.call(print, "name"));
      const attrParts = [];
      path.each(function(attrPath) {
        attrParts.push(" ", print(attrPath));
      }, "attributes");
      let attrLines = concat(attrParts);
      const needLineWrap = attrLines.length > 1 || attrLines.getLineLength(1) > options.wrapColumn;
      if (needLineWrap) {
        attrParts.forEach(function(part, i) {
          if (part === " ") {
            attrParts[i] = "\n";
          }
        });
        attrLines = concat(attrParts).indentTail(options.tabWidth);
      }
      parts.push(attrLines, n.selfClosing ? " />" : ">");
      return concat(parts);
    }
    case "JSXClosingElement":
      return concat(["</", path.call(print, "name"), ">"]);
    case "JSXOpeningFragment":
      return fromString("<>");
    case "JSXClosingFragment":
      return fromString("</>");
    case "JSXText":
      return fromString(n.value, options);
    case "JSXEmptyExpression":
      return fromString("");
    case "TypeAnnotatedIdentifier":
      return concat([
        path.call(print, "annotation"),
        " ",
        path.call(print, "identifier")
      ]);
    case "ClassBody":
      if (n.body.length === 0) {
        return fromString("{}");
      }
      return concat([
        "{\n",
        path.call(
          (bodyPath) => printStatementSequence(bodyPath, options, print),
          "body"
        ).indent(options.tabWidth),
        "\n}"
      ]);
    case "ClassPropertyDefinition":
      parts.push("static ", path.call(print, "definition"));
      if (!namedTypes.MethodDefinition.check(n.definition))
        parts.push(";");
      return concat(parts);
    case "ClassProperty": {
      if (n.declare) {
        parts.push("declare ");
      }
      const access = n.accessibility || n.access;
      if (typeof access === "string") {
        parts.push(access, " ");
      }
      if (n.static) {
        parts.push("static ");
      }
      if (n.abstract) {
        parts.push("abstract ");
      }
      if (n.readonly) {
        parts.push("readonly ");
      }
      let key = path.call(print, "key");
      if (n.computed) {
        key = concat(["[", key, "]"]);
      }
      if (n.variance) {
        key = concat([printVariance(path, print), key]);
      }
      parts.push(key);
      if (n.optional) {
        parts.push("?");
      }
      if (n.definite) {
        parts.push("!");
      }
      if (n.typeAnnotation) {
        parts.push(path.call(print, "typeAnnotation"));
      }
      if (n.value) {
        parts.push(" = ", path.call(print, "value"));
      }
      parts.push(";");
      return concat(parts);
    }
    case "ClassPrivateProperty":
      if (n.static) {
        parts.push("static ");
      }
      parts.push(path.call(print, "key"));
      if (n.typeAnnotation) {
        parts.push(path.call(print, "typeAnnotation"));
      }
      if (n.value) {
        parts.push(" = ", path.call(print, "value"));
      }
      parts.push(";");
      return concat(parts);
    case "ClassAccessorProperty": {
      parts.push(
        ...printClassMemberModifiers(n),
        "accessor "
      );
      if (n.computed) {
        parts.push("[", path.call(print, "key"), "]");
      } else {
        parts.push(path.call(print, "key"));
      }
      if (n.optional) {
        parts.push("?");
      }
      if (n.definite) {
        parts.push("!");
      }
      if (n.typeAnnotation) {
        parts.push(path.call(print, "typeAnnotation"));
      }
      if (n.value) {
        parts.push(" = ", path.call(print, "value"));
      }
      parts.push(";");
      return concat(parts);
    }
    case "ClassDeclaration":
    case "ClassExpression":
    case "DeclareClass":
      if (n.declare) {
        parts.push("declare ");
      }
      if (n.abstract) {
        parts.push("abstract ");
      }
      parts.push("class");
      if (n.id) {
        parts.push(" ", path.call(print, "id"));
      }
      if (n.typeParameters) {
        parts.push(path.call(print, "typeParameters"));
      }
      if (n.superClass) {
        parts.push(
          " extends ",
          path.call(print, "superClass"),
          path.call(print, "superTypeParameters")
        );
      }
      if (n.extends && n.extends.length > 0) {
        parts.push(
          " extends ",
          fromString(", ").join(path.map(print, "extends"))
        );
      }
      if (n["implements"] && n["implements"].length > 0) {
        parts.push(
          " implements ",
          fromString(", ").join(path.map(print, "implements"))
        );
      }
      parts.push(" ", path.call(print, "body"));
      if (n.type === "DeclareClass") {
        return printFlowDeclaration(path, parts);
      } else {
        return concat(parts);
      }
    case "TemplateElement":
      return fromString(n.value.raw, options).lockIndentTail();
    case "TemplateLiteral": {
      const expressions = path.map(print, "expressions");
      parts.push("`");
      path.each(function(childPath) {
        const i = childPath.getName();
        parts.push(print(childPath));
        if (i < expressions.length) {
          parts.push("${", expressions[i], "}");
        }
      }, "quasis");
      parts.push("`");
      return concat(parts).lockIndentTail();
    }
    case "TaggedTemplateExpression":
      return concat([path.call(print, "tag"), path.call(print, "quasi")]);
    case "Node":
    case "Printable":
    case "SourceLocation":
    case "Position":
    case "Statement":
    case "Function":
    case "Pattern":
    case "Expression":
    case "Declaration":
    case "Specifier":
    case "NamedSpecifier":
    case "Comment":
    case "Flow":
    case "FlowType":
    case "FlowPredicate":
    case "MemberTypeAnnotation":
    case "Type":
    case "TSHasOptionalTypeParameterInstantiation":
    case "TSHasOptionalTypeParameters":
    case "TSHasOptionalTypeAnnotation":
    case "ChainElement":
      throw new Error("unprintable type: " + JSON.stringify(n.type));
    case "CommentBlock":
    case "Block":
      return concat(["/*", fromString(n.value, options), "*/"]);
    case "CommentLine":
    case "Line":
      return concat(["//", fromString(n.value, options)]);
    case "TypeAnnotation":
      if (n.typeAnnotation) {
        if (n.typeAnnotation.type !== "FunctionTypeAnnotation") {
          parts.push(": ");
        }
        parts.push(path.call(print, "typeAnnotation"));
        return concat(parts);
      }
      return fromString("");
    case "ExistentialTypeParam":
    case "ExistsTypeAnnotation":
      return fromString("*", options);
    case "EmptyTypeAnnotation":
      return fromString("empty", options);
    case "AnyTypeAnnotation":
      return fromString("any", options);
    case "MixedTypeAnnotation":
      return fromString("mixed", options);
    case "ArrayTypeAnnotation":
      return concat([path.call(print, "elementType"), "[]"]);
    case "TupleTypeAnnotation": {
      const printed = path.map(print, "types");
      const joined = fromString(", ").join(printed);
      const oneLine = joined.getLineLength(1) <= options.wrapColumn;
      if (oneLine) {
        if (options.arrayBracketSpacing) {
          parts.push("[ ");
        } else {
          parts.push("[");
        }
      } else {
        parts.push("[\n");
      }
      path.each(function(elemPath) {
        const i = elemPath.getName();
        const elem = elemPath.getValue();
        if (!elem) {
          parts.push(",");
        } else {
          let lines = printed[i];
          if (oneLine) {
            if (i > 0)
              parts.push(" ");
          } else {
            lines = lines.indent(options.tabWidth);
          }
          parts.push(lines);
          if (i < n.types.length - 1 || !oneLine && isTrailingCommaEnabled(options, "arrays"))
            parts.push(",");
          if (!oneLine)
            parts.push("\n");
        }
      }, "types");
      if (oneLine && options.arrayBracketSpacing) {
        parts.push(" ]");
      } else {
        parts.push("]");
      }
      return concat(parts);
    }
    case "BooleanTypeAnnotation":
      return fromString("boolean", options);
    case "BooleanLiteralTypeAnnotation":
      return fromString("" + n.value, options);
    case "InterfaceTypeAnnotation":
      parts.push("interface");
      if (n.extends && n.extends.length > 0) {
        parts.push(
          " extends ",
          fromString(", ").join(path.map(print, "extends"))
        );
      }
      parts.push(" ", path.call(print, "body"));
      return concat(parts);
    case "DeclareFunction":
      return printFlowDeclaration(path, [
        "function ",
        path.call(print, "id"),
        ";"
      ]);
    case "DeclareModule":
      return printFlowDeclaration(path, [
        "module ",
        path.call(print, "id"),
        " ",
        path.call(print, "body")
      ]);
    case "DeclareModuleExports":
      return printFlowDeclaration(path, [
        "module.exports",
        path.call(print, "typeAnnotation")
      ]);
    case "DeclareVariable":
      return printFlowDeclaration(path, ["var ", path.call(print, "id"), ";"]);
    case "DeclareExportDeclaration":
    case "DeclareExportAllDeclaration":
      return concat(["declare ", printExportDeclaration(path, options, print)]);
    case "EnumDeclaration":
      return concat([
        "enum ",
        path.call(print, "id"),
        path.call(print, "body")
      ]);
    case "EnumBooleanBody":
    case "EnumNumberBody":
    case "EnumStringBody":
    case "EnumSymbolBody": {
      if (n.type === "EnumSymbolBody" || n.explicitType) {
        parts.push(
          " of ",
          // EnumBooleanBody => boolean, etc.
          n.type.slice(4, -4).toLowerCase()
        );
      }
      parts.push(
        " {\n",
        fromString("\n").join(path.map(print, "members")).indent(options.tabWidth),
        "\n}"
      );
      return concat(parts);
    }
    case "EnumDefaultedMember":
      return concat([path.call(print, "id"), ","]);
    case "EnumBooleanMember":
    case "EnumNumberMember":
    case "EnumStringMember":
      return concat([
        path.call(print, "id"),
        " = ",
        path.call(print, "init"),
        ","
      ]);
    case "InferredPredicate":
      return fromString("%checks", options);
    case "DeclaredPredicate":
      return concat(["%checks(", path.call(print, "value"), ")"]);
    case "FunctionTypeAnnotation": {
      const parent = path.getParentNode(0);
      const isArrowFunctionTypeAnnotation = !(namedTypes.ObjectTypeCallProperty.check(parent) || namedTypes.ObjectTypeInternalSlot.check(parent) && parent.method || namedTypes.DeclareFunction.check(path.getParentNode(2)));
      const needsColon = isArrowFunctionTypeAnnotation && !namedTypes.FunctionTypeParam.check(parent) && !namedTypes.TypeAlias.check(parent);
      if (needsColon) {
        parts.push(": ");
      }
      const hasTypeParameters = !!n.typeParameters;
      const needsParens = hasTypeParameters || n.params.length !== 1 || n.params[0].name;
      parts.push(
        hasTypeParameters ? path.call(print, "typeParameters") : "",
        needsParens ? "(" : "",
        printFunctionParams(path, options, print),
        needsParens ? ")" : ""
      );
      if (n.returnType) {
        parts.push(
          isArrowFunctionTypeAnnotation ? " => " : ": ",
          path.call(print, "returnType")
        );
      }
      return concat(parts);
    }
    case "FunctionTypeParam": {
      const name = path.call(print, "name");
      parts.push(name);
      if (n.optional) {
        parts.push("?");
      }
      if (name.infos[0].line) {
        parts.push(": ");
      }
      parts.push(path.call(print, "typeAnnotation"));
      return concat(parts);
    }
    case "GenericTypeAnnotation":
      return concat([
        path.call(print, "id"),
        path.call(print, "typeParameters")
      ]);
    case "DeclareInterface":
      parts.push("declare ");
    case "InterfaceDeclaration":
    case "TSInterfaceDeclaration":
      if (n.declare) {
        parts.push("declare ");
      }
      parts.push(
        "interface ",
        path.call(print, "id"),
        path.call(print, "typeParameters"),
        " "
      );
      if (n["extends"] && n["extends"].length > 0) {
        parts.push(
          "extends ",
          fromString(", ").join(path.map(print, "extends")),
          " "
        );
      }
      if (n.body) {
        parts.push(path.call(print, "body"));
      }
      return concat(parts);
    case "ClassImplements":
    case "InterfaceExtends":
      return concat([
        path.call(print, "id"),
        path.call(print, "typeParameters")
      ]);
    case "IntersectionTypeAnnotation":
      return fromString(" & ").join(path.map(print, "types"));
    case "NullableTypeAnnotation":
      return concat(["?", path.call(print, "typeAnnotation")]);
    case "NullLiteralTypeAnnotation":
      return fromString("null", options);
    case "ThisTypeAnnotation":
      return fromString("this", options);
    case "NumberTypeAnnotation":
      return fromString("number", options);
    case "ObjectTypeCallProperty":
      return path.call(print, "value");
    case "ObjectTypeIndexer":
      if (n.static) {
        parts.push("static ");
      }
      parts.push(printVariance(path, print), "[");
      if (n.id) {
        parts.push(path.call(print, "id"), ": ");
      }
      parts.push(path.call(print, "key"), "]: ", path.call(print, "value"));
      return concat(parts);
    case "ObjectTypeProperty":
      return concat([
        printVariance(path, print),
        path.call(print, "key"),
        n.optional ? "?" : "",
        ": ",
        path.call(print, "value")
      ]);
    case "ObjectTypeInternalSlot":
      return concat([
        n.static ? "static " : "",
        "[[",
        path.call(print, "id"),
        "]]",
        n.optional ? "?" : "",
        n.value.type !== "FunctionTypeAnnotation" ? ": " : "",
        path.call(print, "value")
      ]);
    case "QualifiedTypeIdentifier":
      return concat([
        path.call(print, "qualification"),
        ".",
        path.call(print, "id")
      ]);
    case "StringLiteralTypeAnnotation":
      return fromString(nodeStr(n.value, options), options);
    case "NumberLiteralTypeAnnotation":
    case "NumericLiteralTypeAnnotation":
      return fromString(JSON.stringify(n.value), options);
    case "BigIntLiteralTypeAnnotation":
      return fromString(n.raw, options);
    case "StringTypeAnnotation":
      return fromString("string", options);
    case "DeclareTypeAlias":
      parts.push("declare ");
    case "TypeAlias":
      return concat([
        "type ",
        path.call(print, "id"),
        path.call(print, "typeParameters"),
        " = ",
        path.call(print, "right"),
        ";"
      ]);
    case "DeclareOpaqueType":
      parts.push("declare ");
    case "OpaqueType":
      parts.push(
        "opaque type ",
        path.call(print, "id"),
        path.call(print, "typeParameters")
      );
      if (n["supertype"]) {
        parts.push(": ", path.call(print, "supertype"));
      }
      if (n["impltype"]) {
        parts.push(" = ", path.call(print, "impltype"));
      }
      parts.push(";");
      return concat(parts);
    case "TypeCastExpression":
      return concat([
        "(",
        path.call(print, "expression"),
        path.call(print, "typeAnnotation"),
        ")"
      ]);
    case "TypeParameterDeclaration":
    case "TypeParameterInstantiation":
      return concat([
        "<",
        fromString(", ").join(path.map(print, "params")),
        ">"
      ]);
    case "Variance":
      if (n.kind === "plus") {
        return fromString("+");
      }
      if (n.kind === "minus") {
        return fromString("-");
      }
      return fromString("");
    case "TypeParameter":
      if (n.variance) {
        parts.push(printVariance(path, print));
      }
      parts.push(path.call(print, "name"));
      if (n.bound) {
        parts.push(path.call(print, "bound"));
      }
      if (n["default"]) {
        parts.push("=", path.call(print, "default"));
      }
      return concat(parts);
    case "TypeofTypeAnnotation":
      return concat([
        fromString("typeof ", options),
        path.call(print, "argument")
      ]);
    case "IndexedAccessType":
    case "OptionalIndexedAccessType":
      return concat([
        path.call(print, "objectType"),
        n.optional ? "?." : "",
        "[",
        path.call(print, "indexType"),
        "]"
      ]);
    case "UnionTypeAnnotation":
      return fromString(" | ").join(path.map(print, "types"));
    case "VoidTypeAnnotation":
      return fromString("void", options);
    case "NullTypeAnnotation":
      return fromString("null", options);
    case "SymbolTypeAnnotation":
      return fromString("symbol", options);
    case "BigIntTypeAnnotation":
      return fromString("bigint", options);
    case "TSType":
      throw new Error("unprintable type: " + JSON.stringify(n.type));
    case "TSNumberKeyword":
      return fromString("number", options);
    case "TSBigIntKeyword":
      return fromString("bigint", options);
    case "TSObjectKeyword":
      return fromString("object", options);
    case "TSBooleanKeyword":
      return fromString("boolean", options);
    case "TSStringKeyword":
      return fromString("string", options);
    case "TSSymbolKeyword":
      return fromString("symbol", options);
    case "TSAnyKeyword":
      return fromString("any", options);
    case "TSVoidKeyword":
      return fromString("void", options);
    case "TSIntrinsicKeyword":
      return fromString("intrinsic", options);
    case "TSThisType":
      return fromString("this", options);
    case "TSNullKeyword":
      return fromString("null", options);
    case "TSUndefinedKeyword":
      return fromString("undefined", options);
    case "TSUnknownKeyword":
      return fromString("unknown", options);
    case "TSNeverKeyword":
      return fromString("never", options);
    case "TSArrayType":
      return concat([path.call(print, "elementType"), "[]"]);
    case "TSLiteralType":
      return path.call(print, "literal");
    case "TSUnionType":
      return fromString(" | ").join(path.map(print, "types"));
    case "TSIntersectionType":
      return fromString(" & ").join(path.map(print, "types"));
    case "TSConditionalType":
      parts.push(
        path.call(print, "checkType"),
        " extends ",
        path.call(print, "extendsType"),
        " ? ",
        path.call(print, "trueType"),
        " : ",
        path.call(print, "falseType")
      );
      return concat(parts);
    case "TSInferType":
      parts.push("infer ", path.call(print, "typeParameter"));
      return concat(parts);
    case "TSParenthesizedType":
      return concat(["(", path.call(print, "typeAnnotation"), ")"]);
    case "TSFunctionType":
      return concat([
        path.call(print, "typeParameters"),
        "(",
        printFunctionParams(path, options, print),
        ") => ",
        path.call(print, "typeAnnotation", "typeAnnotation")
      ]);
    case "TSConstructorType":
      return concat([
        "new ",
        path.call(print, "typeParameters"),
        "(",
        printFunctionParams(path, options, print),
        ") => ",
        path.call(print, "typeAnnotation", "typeAnnotation")
      ]);
    case "TSMappedType": {
      parts.push(
        n.readonly ? "readonly " : "",
        "[",
        path.call(print, "typeParameter"),
        "]",
        n.optional ? "?" : ""
      );
      if (n.typeAnnotation) {
        parts.push(": ", path.call(print, "typeAnnotation"), ";");
      }
      return concat(["{\n", concat(parts).indent(options.tabWidth), "\n}"]);
    }
    case "TSTupleType":
      return concat([
        "[",
        fromString(", ").join(path.map(print, "elementTypes")),
        "]"
      ]);
    case "TSNamedTupleMember":
      parts.push(path.call(print, "label"));
      if (n.optional) {
        parts.push("?");
      }
      parts.push(": ", path.call(print, "elementType"));
      return concat(parts);
    case "TSRestType":
      return concat(["...", path.call(print, "typeAnnotation")]);
    case "TSOptionalType":
      return concat([path.call(print, "typeAnnotation"), "?"]);
    case "TSIndexedAccessType":
      return concat([
        path.call(print, "objectType"),
        "[",
        path.call(print, "indexType"),
        "]"
      ]);
    case "TSTypeOperator":
      return concat([
        path.call(print, "operator"),
        " ",
        path.call(print, "typeAnnotation")
      ]);
    case "TSTypeLiteral": {
      const members = fromString("\n").join(
        path.map(print, "members").map((member) => {
          if (lastNonSpaceCharacter(member) !== ";") {
            return member.concat(";");
          }
          return member;
        })
      );
      if (members.isEmpty()) {
        return fromString("{}", options);
      }
      parts.push("{\n", members.indent(options.tabWidth), "\n}");
      return concat(parts);
    }
    case "TSEnumMember":
      parts.push(path.call(print, "id"));
      if (n.initializer) {
        parts.push(" = ", path.call(print, "initializer"));
      }
      return concat(parts);
    case "TSTypeQuery":
      return concat(["typeof ", path.call(print, "exprName")]);
    case "TSParameterProperty":
      if (n.accessibility) {
        parts.push(n.accessibility, " ");
      }
      if (n.export) {
        parts.push("export ");
      }
      if (n.static) {
        parts.push("static ");
      }
      if (n.readonly) {
        parts.push("readonly ");
      }
      parts.push(path.call(print, "parameter"));
      return concat(parts);
    case "TSTypeReference":
      return concat([
        path.call(print, "typeName"),
        path.call(print, "typeParameters")
      ]);
    case "TSQualifiedName":
      return concat([path.call(print, "left"), ".", path.call(print, "right")]);
    case "TSAsExpression":
    case "TSSatisfiesExpression": {
      const expression = path.call(print, "expression");
      parts.push(
        expression,
        n.type === "TSSatisfiesExpression" ? " satisfies " : " as ",
        path.call(print, "typeAnnotation")
      );
      return concat(parts);
    }
    case "TSTypeCastExpression":
      return concat([
        path.call(print, "expression"),
        path.call(print, "typeAnnotation")
      ]);
    case "TSNonNullExpression":
      return concat([path.call(print, "expression"), "!"]);
    case "TSTypeAnnotation":
      return concat([": ", path.call(print, "typeAnnotation")]);
    case "TSIndexSignature":
      return concat([
        n.readonly ? "readonly " : "",
        "[",
        path.map(print, "parameters"),
        "]",
        path.call(print, "typeAnnotation")
      ]);
    case "TSPropertySignature":
      parts.push(printVariance(path, print), n.readonly ? "readonly " : "");
      if (n.computed) {
        parts.push("[", path.call(print, "key"), "]");
      } else {
        parts.push(path.call(print, "key"));
      }
      parts.push(n.optional ? "?" : "", path.call(print, "typeAnnotation"));
      return concat(parts);
    case "TSMethodSignature":
      if (n.computed) {
        parts.push("[", path.call(print, "key"), "]");
      } else {
        parts.push(path.call(print, "key"));
      }
      if (n.optional) {
        parts.push("?");
      }
      parts.push(
        path.call(print, "typeParameters"),
        "(",
        printFunctionParams(path, options, print),
        ")",
        path.call(print, "typeAnnotation")
      );
      return concat(parts);
    case "TSTypePredicate":
      if (n.asserts) {
        parts.push("asserts ");
      }
      parts.push(path.call(print, "parameterName"));
      if (n.typeAnnotation) {
        parts.push(
          " is ",
          path.call(print, "typeAnnotation", "typeAnnotation")
        );
      }
      return concat(parts);
    case "TSCallSignatureDeclaration":
      return concat([
        path.call(print, "typeParameters"),
        "(",
        printFunctionParams(path, options, print),
        ")",
        path.call(print, "typeAnnotation")
      ]);
    case "TSConstructSignatureDeclaration":
      if (n.typeParameters) {
        parts.push("new", path.call(print, "typeParameters"));
      } else {
        parts.push("new ");
      }
      parts.push(
        "(",
        printFunctionParams(path, options, print),
        ")",
        path.call(print, "typeAnnotation")
      );
      return concat(parts);
    case "TSTypeAliasDeclaration":
      return concat([
        n.declare ? "declare " : "",
        "type ",
        path.call(print, "id"),
        path.call(print, "typeParameters"),
        " = ",
        path.call(print, "typeAnnotation"),
        ";"
      ]);
    case "TSTypeParameter": {
      parts.push(path.call(print, "name"));
      const parent = path.getParentNode(0);
      const isInMappedType = namedTypes.TSMappedType.check(parent);
      if (n.constraint) {
        parts.push(
          isInMappedType ? " in " : " extends ",
          path.call(print, "constraint")
        );
      }
      if (n["default"]) {
        parts.push(" = ", path.call(print, "default"));
      }
      return concat(parts);
    }
    case "TSTypeAssertion": {
      parts.push(
        "<",
        path.call(print, "typeAnnotation"),
        "> ",
        path.call(print, "expression")
      );
      return concat(parts);
    }
    case "TSTypeParameterDeclaration":
    case "TSTypeParameterInstantiation":
      return concat([
        "<",
        fromString(", ").join(path.map(print, "params")),
        ">"
      ]);
    case "TSEnumDeclaration": {
      parts.push(
        n.declare ? "declare " : "",
        n.const ? "const " : "",
        "enum ",
        path.call(print, "id")
      );
      const memberLines = fromString(",\n").join(path.map(print, "members"));
      if (memberLines.isEmpty()) {
        parts.push(" {}");
      } else {
        parts.push(" {\n", memberLines.indent(options.tabWidth), "\n}");
      }
      return concat(parts);
    }
    case "TSExpressionWithTypeArguments":
      return concat([
        path.call(print, "expression"),
        path.call(print, "typeParameters")
      ]);
    case "TSInterfaceBody": {
      const lines = fromString("\n").join(
        path.map(print, "body").map((element) => {
          if (lastNonSpaceCharacter(element) !== ";") {
            return element.concat(";");
          }
          return element;
        })
      );
      if (lines.isEmpty()) {
        return fromString("{}", options);
      }
      return concat(["{\n", lines.indent(options.tabWidth), "\n}"]);
    }
    case "TSImportType":
      parts.push("import(", path.call(print, "argument"), ")");
      if (n.qualifier) {
        parts.push(".", path.call(print, "qualifier"));
      }
      if (n.typeParameters) {
        parts.push(path.call(print, "typeParameters"));
      }
      return concat(parts);
    case "TSImportEqualsDeclaration":
      if (n.isExport) {
        parts.push("export ");
      }
      parts.push(
        "import ",
        path.call(print, "id"),
        " = ",
        path.call(print, "moduleReference")
      );
      return maybeAddSemicolon(concat(parts));
    case "TSExternalModuleReference":
      return concat(["require(", path.call(print, "expression"), ")"]);
    case "TSModuleDeclaration": {
      const parent = path.getParentNode();
      if (parent.type === "TSModuleDeclaration") {
        parts.push(".");
      } else {
        if (n.declare) {
          parts.push("declare ");
        }
        if (!n.global) {
          const isExternal = n.id.type === "StringLiteral" || n.id.type === "Literal" && typeof n.id.value === "string";
          if (isExternal) {
            parts.push("module ");
          } else if (n.loc && n.loc.lines && n.id.loc) {
            const prefix = n.loc.lines.sliceString(n.loc.start, n.id.loc.start);
            if (prefix.indexOf("module") >= 0) {
              parts.push("module ");
            } else {
              parts.push("namespace ");
            }
          } else {
            parts.push("namespace ");
          }
        }
      }
      parts.push(path.call(print, "id"));
      if (n.body) {
        parts.push(" ");
        parts.push(path.call(print, "body"));
      }
      return concat(parts);
    }
    case "TSModuleBlock": {
      const naked = path.call(
        (bodyPath) => printStatementSequence(bodyPath, options, print),
        "body"
      );
      if (naked.isEmpty()) {
        parts.push("{}");
      } else {
        parts.push("{\n", naked.indent(options.tabWidth), "\n}");
      }
      return concat(parts);
    }
    case "TSInstantiationExpression": {
      parts.push(
        path.call(print, "expression"),
        path.call(print, "typeParameters")
      );
      return concat(parts);
    }
    case "V8IntrinsicIdentifier":
      return concat(["%", path.call(print, "name")]);
    case "TopicReference":
      return fromString("#");
    case "ClassHeritage":
    case "ComprehensionBlock":
    case "ComprehensionExpression":
    case "Glob":
    case "GeneratorExpression":
    case "LetStatement":
    case "LetExpression":
    case "GraphExpression":
    case "GraphIndexExpression":
    case "XMLDefaultDeclaration":
    case "XMLAnyName":
    case "XMLQualifiedIdentifier":
    case "XMLFunctionQualifiedIdentifier":
    case "XMLAttributeSelector":
    case "XMLFilterExpression":
    case "XML":
    case "XMLElement":
    case "XMLList":
    case "XMLEscape":
    case "XMLText":
    case "XMLStartTag":
    case "XMLEndTag":
    case "XMLPointTag":
    case "XMLName":
    case "XMLAttribute":
    case "XMLCdata":
    case "XMLComment":
    case "XMLProcessingInstruction":
    default:
      debugger;
      throw new Error("unknown type: " + JSON.stringify(n.type));
  }
}
function printDecorators(path, printPath) {
  const parts = [];
  const node = path.getValue();
  if (node.decorators && node.decorators.length > 0 && // If the parent node is an export declaration, it will be
  // responsible for printing node.decorators.
  !getParentExportDeclaration(path)) {
    path.each(function(decoratorPath) {
      parts.push(printPath(decoratorPath), "\n");
    }, "decorators");
  } else if (isExportDeclaration(node) && node.declaration && node.declaration.decorators) {
    path.each(
      function(decoratorPath) {
        parts.push(printPath(decoratorPath), "\n");
      },
      "declaration",
      "decorators"
    );
  }
  return concat(parts);
}
function printStatementSequence(path, options, print) {
  const filtered = [];
  path.each(function(stmtPath) {
    const stmt = stmtPath.getValue();
    if (!stmt) {
      return;
    }
    if (stmt.type === "EmptyStatement" && !(stmt.comments && stmt.comments.length > 0)) {
      return;
    }
    if (namedTypes.Comment.check(stmt)) ; else if (namedTypes.Statement.check(stmt)) ; else {
      isString.assert(stmt);
    }
    filtered.push({
      node: stmt,
      printed: print(stmtPath)
    });
  });
  let prevTrailingSpace = null;
  const len = filtered.length;
  const parts = [];
  filtered.forEach(function(info, i) {
    const printed = info.printed;
    const stmt = info.node;
    const multiLine = printed.length > 1;
    const notFirst = i > 0;
    const notLast = i < len - 1;
    let leadingSpace;
    let trailingSpace;
    const lines = stmt && stmt.loc && stmt.loc.lines;
    const trueLoc = lines && options.reuseWhitespace && getTrueLoc(stmt, lines);
    if (notFirst) {
      if (trueLoc) {
        const beforeStart = lines.skipSpaces(trueLoc.start, true);
        const beforeStartLine = beforeStart ? beforeStart.line : 1;
        const leadingGap = trueLoc.start.line - beforeStartLine;
        leadingSpace = Array(leadingGap + 1).join("\n");
      } else {
        leadingSpace = multiLine ? "\n\n" : "\n";
      }
    } else {
      leadingSpace = "";
    }
    if (notLast) {
      if (trueLoc) {
        const afterEnd = lines.skipSpaces(trueLoc.end);
        const afterEndLine = afterEnd ? afterEnd.line : lines.length;
        const trailingGap = afterEndLine - trueLoc.end.line;
        trailingSpace = Array(trailingGap + 1).join("\n");
      } else {
        trailingSpace = multiLine ? "\n\n" : "\n";
      }
    } else {
      trailingSpace = "";
    }
    parts.push(maxSpace(prevTrailingSpace, leadingSpace), printed);
    if (notLast) {
      prevTrailingSpace = trailingSpace;
    } else if (trailingSpace) {
      parts.push(trailingSpace);
    }
  });
  return concat(parts);
}
function maxSpace(s1, s2) {
  if (!s1 && !s2) {
    return fromString("");
  }
  if (!s1) {
    return fromString(s2);
  }
  if (!s2) {
    return fromString(s1);
  }
  const spaceLines1 = fromString(s1);
  const spaceLines2 = fromString(s2);
  if (spaceLines2.length > spaceLines1.length) {
    return spaceLines2;
  }
  return spaceLines1;
}
function printClassMemberModifiers(node) {
  const parts = [];
  if (node.declare) {
    parts.push("declare ");
  }
  const access = node.accessibility || node.access;
  if (typeof access === "string") {
    parts.push(access, " ");
  }
  if (node.static) {
    parts.push("static ");
  }
  if (node.override) {
    parts.push("override ");
  }
  if (node.abstract) {
    parts.push("abstract ");
  }
  if (node.readonly) {
    parts.push("readonly ");
  }
  return parts;
}
function printMethod(path, options, print) {
  const node = path.getNode();
  const kind = node.kind;
  const parts = [];
  let nodeValue = node.value;
  if (!namedTypes.FunctionExpression.check(nodeValue)) {
    nodeValue = node;
  }
  parts.push(...printClassMemberModifiers(node));
  if (nodeValue.async) {
    parts.push("async ");
  }
  if (nodeValue.generator) {
    parts.push("*");
  }
  if (kind === "get" || kind === "set") {
    parts.push(kind, " ");
  }
  let key = path.call(print, "key");
  if (node.computed) {
    key = concat(["[", key, "]"]);
  }
  parts.push(key);
  if (node.optional) {
    parts.push("?");
  }
  if (node === nodeValue) {
    parts.push(
      path.call(print, "typeParameters"),
      "(",
      printFunctionParams(path, options, print),
      ")",
      path.call(print, "returnType")
    );
    if (node.body) {
      parts.push(" ", path.call(print, "body"));
    } else {
      parts.push(";");
    }
  } else {
    parts.push(
      path.call(print, "value", "typeParameters"),
      "(",
      path.call(
        (valuePath) => printFunctionParams(valuePath, options, print),
        "value"
      ),
      ")",
      path.call(print, "value", "returnType")
    );
    if (nodeValue.body) {
      parts.push(" ", path.call(print, "value", "body"));
    } else {
      parts.push(";");
    }
  }
  return concat(parts);
}
function printArgumentsList(path, options, print) {
  const printed = path.map(print, "arguments");
  const trailingComma = isTrailingCommaEnabled(options, "parameters");
  let joined = fromString(", ").join(printed);
  if (joined.getLineLength(1) > options.wrapColumn) {
    joined = fromString(",\n").join(printed);
    return concat([
      "(\n",
      joined.indent(options.tabWidth),
      trailingComma ? ",\n)" : "\n)"
    ]);
  }
  return concat(["(", joined, ")"]);
}
function printFunctionParams(path, options, print) {
  const fun = path.getValue();
  let params;
  let printed = [];
  if (fun.params) {
    params = fun.params;
    printed = path.map(print, "params");
  } else if (fun.parameters) {
    params = fun.parameters;
    printed = path.map(print, "parameters");
  }
  if (fun.defaults) {
    path.each(function(defExprPath) {
      const i = defExprPath.getName();
      const p = printed[i];
      if (p && defExprPath.getValue()) {
        printed[i] = concat([p, " = ", print(defExprPath)]);
      }
    }, "defaults");
  }
  if (fun.rest) {
    printed.push(concat(["...", path.call(print, "rest")]));
  }
  let joined = fromString(", ").join(printed);
  if (joined.length > 1 || joined.getLineLength(1) > options.wrapColumn) {
    joined = fromString(",\n").join(printed);
    if (isTrailingCommaEnabled(options, "parameters") && !fun.rest && params[params.length - 1].type !== "RestElement") {
      joined = concat([joined, ",\n"]);
    } else {
      joined = concat([joined, "\n"]);
    }
    return concat(["\n", joined.indent(options.tabWidth)]);
  }
  return joined;
}
function maybePrintImportAssertions(path, options, print) {
  const n = path.getValue();
  if (n.assertions && n.assertions.length > 0) {
    const parts = [" assert {"];
    const printed = path.map(print, "assertions");
    const flat = fromString(", ").join(printed);
    if (flat.length > 1 || flat.getLineLength(1) > options.wrapColumn) {
      parts.push(
        "\n",
        fromString(",\n").join(printed).indent(options.tabWidth),
        "\n}"
      );
    } else {
      parts.push(" ", flat, " }");
    }
    return concat(parts);
  }
  return fromString("");
}
function printExportDeclaration(path, options, print) {
  const decl = path.getValue();
  const parts = ["export "];
  if (decl.exportKind && decl.exportKind === "type") {
    if (!decl.declaration) {
      parts.push("type ");
    }
  }
  const shouldPrintSpaces = options.objectCurlySpacing;
  namedTypes.Declaration.assert(decl);
  if (decl["default"] || decl.type === "ExportDefaultDeclaration") {
    parts.push("default ");
  }
  if (decl.declaration) {
    parts.push(path.call(print, "declaration"));
  } else if (decl.specifiers) {
    if (decl.specifiers.length === 1 && decl.specifiers[0].type === "ExportBatchSpecifier") {
      parts.push("*");
    } else if (decl.specifiers.length === 0) {
      parts.push("{}");
    } else if (decl.specifiers[0].type === "ExportDefaultSpecifier") {
      const unbracedSpecifiers = [];
      const bracedSpecifiers = [];
      path.each(function(specifierPath) {
        const spec = specifierPath.getValue();
        if (spec.type === "ExportDefaultSpecifier") {
          unbracedSpecifiers.push(print(specifierPath));
        } else {
          bracedSpecifiers.push(print(specifierPath));
        }
      }, "specifiers");
      unbracedSpecifiers.forEach((lines2, i) => {
        if (i > 0) {
          parts.push(", ");
        }
        parts.push(lines2);
      });
      if (bracedSpecifiers.length > 0) {
        let lines2 = fromString(", ").join(bracedSpecifiers);
        if (lines2.getLineLength(1) > options.wrapColumn) {
          lines2 = concat([
            fromString(",\n").join(bracedSpecifiers).indent(options.tabWidth),
            ","
          ]);
        }
        if (unbracedSpecifiers.length > 0) {
          parts.push(", ");
        }
        if (lines2.length > 1) {
          parts.push("{\n", lines2, "\n}");
        } else if (options.objectCurlySpacing) {
          parts.push("{ ", lines2, " }");
        } else {
          parts.push("{", lines2, "}");
        }
      }
    } else {
      parts.push(
        shouldPrintSpaces ? "{ " : "{",
        fromString(", ").join(path.map(print, "specifiers")),
        shouldPrintSpaces ? " }" : "}"
      );
    }
    if (decl.source) {
      parts.push(
        " from ",
        path.call(print, "source"),
        maybePrintImportAssertions(path, options, print)
      );
    }
  }
  let lines = concat(parts);
  if (lastNonSpaceCharacter(lines) !== ";" && !(decl.declaration && (decl.declaration.type === "FunctionDeclaration" || decl.declaration.type === "ClassDeclaration" || decl.declaration.type === "TSModuleDeclaration" || decl.declaration.type === "TSInterfaceDeclaration" || decl.declaration.type === "TSEnumDeclaration"))) {
    lines = concat([lines, ";"]);
  }
  return lines;
}
function printFlowDeclaration(path, parts) {
  const parentExportDecl = getParentExportDeclaration(path);
  if (parentExportDecl) ; else {
    parts.unshift("declare ");
  }
  return concat(parts);
}
function printVariance(path, print) {
  return path.call(function(variancePath) {
    const value = variancePath.getValue();
    if (value) {
      if (value === "plus") {
        return fromString("+");
      }
      if (value === "minus") {
        return fromString("-");
      }
      return print(variancePath);
    }
    return fromString("");
  }, "variance");
}
function adjustClause(clause, options) {
  if (clause.length > 1)
    return concat([" ", clause]);
  return concat(["\n", maybeAddSemicolon(clause).indent(options.tabWidth)]);
}
function lastNonSpaceCharacter(lines) {
  const pos = lines.lastPos();
  do {
    const ch = lines.charAt(pos);
    if (/\S/.test(ch))
      return ch;
  } while (lines.prevPos(pos));
}
function endsWithBrace(lines) {
  return lastNonSpaceCharacter(lines) === "}";
}
function swapQuotes(str) {
  return str.replace(/['"]/g, (m) => m === '"' ? "'" : '"');
}
function getPossibleRaw(node) {
  const value = getFieldValue(node, "value");
  const extra = getFieldValue(node, "extra");
  if (extra && typeof extra.raw === "string" && value == extra.rawValue) {
    return extra.raw;
  }
  if (node.type === "Literal") {
    const raw = node.raw;
    if (typeof raw === "string" && value == raw) {
      return raw;
    }
  }
}
function jsSafeStringify(str) {
  return JSON.stringify(str).replace(/[\u2028\u2029]/g, function(m) {
    return "\\u" + m.charCodeAt(0).toString(16);
  });
}
function nodeStr(str, options) {
  isString.assert(str);
  switch (options.quote) {
    case "auto": {
      const double = jsSafeStringify(str);
      const single = swapQuotes(jsSafeStringify(swapQuotes(str)));
      return double.length > single.length ? single : double;
    }
    case "single":
      return swapQuotes(jsSafeStringify(swapQuotes(str)));
    case "double":
    default:
      return jsSafeStringify(str);
  }
}
function maybeAddSemicolon(lines) {
  const eoc = lastNonSpaceCharacter(lines);
  if (!eoc || "\n};".indexOf(eoc) < 0)
    return concat([lines, ";"]);
  return lines;
}

function print(node, options) {
  return new Printer(options).print(node);
}

let _babelParser;
function getBabelParser() {
  if (_babelParser) {
    return _babelParser;
  }
  const babelOptions = _getBabelOptions();
  _babelParser = {
    parse(source, options) {
      return babelParser.parse(source, {
        ...babelOptions,
        ...options
      });
    }
  };
  return _babelParser;
}
function _getBabelOptions() {
  return {
    sourceType: "module",
    strictMode: false,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    startLine: 1,
    tokens: true,
    plugins: [
      "asyncGenerators",
      "bigInt",
      "classPrivateMethods",
      "classPrivateProperties",
      "classProperties",
      "classStaticBlock",
      "decimal",
      "decorators-legacy",
      "doExpressions",
      "dynamicImport",
      "exportDefaultFrom",
      "exportExtensions",
      "exportNamespaceFrom",
      "functionBind",
      "functionSent",
      "importAssertions",
      "importMeta",
      "nullishCoalescingOperator",
      "numericSeparator",
      "objectRestSpread",
      "optionalCatchBinding",
      "optionalChaining",
      [
        "pipelineOperator",
        {
          proposal: "minimal"
        }
      ],
      [
        "recordAndTuple",
        {
          syntaxType: "hash"
        }
      ],
      "throwExpressions",
      "topLevelAwait",
      "v8intrinsic",
      "jsx",
      "typescript"
    ]
  };
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class MagicastError extends Error {
  constructor(message, options) {
    super("");
    __publicField(this, "rawMessage");
    __publicField(this, "options");
    this.name = "MagicastError";
    this.rawMessage = message;
    this.options = options;
    if (options?.ast && options?.code && options.ast.loc) {
      const { line, column } = options.ast.loc.start;
      const lines = options.code.split("\n");
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 3);
      const codeFrame = lines.slice(start, end).map((lineCode, i) => {
        const number = (start + i + 1).toString().padStart(3, " ");
        lineCode = `${number} | ${lineCode}`;
        if (start + i === line - 1) {
          lineCode += `
${" ".repeat(6 + column)}^`;
        }
        return lineCode;
      });
      message += `

${codeFrame.join("\n")}
`;
    }
    this.message = message;
  }
}

const LITERALS_AST = /* @__PURE__ */ new Set([
  "Literal",
  "StringLiteral",
  "NumericLiteral",
  "BooleanLiteral",
  "NullLiteral",
  "RegExpLiteral",
  "BigIntLiteral"
]);
const LITERALS_TYPEOF = /* @__PURE__ */ new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined"
]);
const b$4 = builders$1;
function isValidPropName(name) {
  return /^[$A-Z_a-z][\w$]*$/.test(name);
}
const PROXY_KEY = "__magicast_proxy";
function literalToAst(value, seen = /* @__PURE__ */ new Set()) {
  if (value === void 0) {
    return b$4.identifier("undefined");
  }
  if (value === null) {
    return b$4.literal(null);
  }
  if (LITERALS_TYPEOF.has(typeof value)) {
    return b$4.literal(value);
  }
  if (seen.has(value)) {
    throw new MagicastError("Can not serialize circular reference");
  }
  seen.add(value);
  if (value[PROXY_KEY]) {
    return value.$ast;
  }
  if (value instanceof RegExp) {
    const regex = b$4.regExpLiteral(value.source, value.flags);
    delete regex.extra.raw;
    return regex;
  }
  if (value instanceof Set) {
    return b$4.newExpression(b$4.identifier("Set"), [
      b$4.arrayExpression([...value].map((n) => literalToAst(n, seen)))
    ]);
  }
  if (value instanceof Date) {
    return b$4.newExpression(b$4.identifier("Date"), [
      b$4.literal(value.toISOString())
    ]);
  }
  if (value instanceof Map) {
    return b$4.newExpression(b$4.identifier("Map"), [
      b$4.arrayExpression(
        [...value].map(([key, value2]) => {
          return b$4.arrayExpression([
            literalToAst(key, seen),
            literalToAst(value2, seen)
          ]);
        })
      )
    ]);
  }
  if (Array.isArray(value)) {
    return b$4.arrayExpression(
      value.map((n) => literalToAst(n, seen))
    );
  }
  if (typeof value === "object") {
    return b$4.objectExpression(
      Object.entries(value).map(([key, value2]) => {
        return b$4.property(
          "init",
          /^[$A-Z_a-z][\w$]*$/g.test(key) ? b$4.identifier(key) : b$4.literal(key),
          literalToAst(value2, seen)
        );
      })
    );
  }
  return b$4.literal(value);
}
function makeProxyUtils(node, extend = {}) {
  const obj = extend;
  obj[PROXY_KEY] = true;
  obj.$ast = node;
  obj.$type || (obj.$type = "object");
  return obj;
}
const propertyDescriptor = {
  enumerable: true,
  configurable: true
};
function createProxy(node, extend, handler) {
  const utils = makeProxyUtils(node, extend);
  return new Proxy(
    {},
    {
      ownKeys() {
        return Object.keys(utils).filter(
          (i) => i !== PROXY_KEY && !i.startsWith("$")
        );
      },
      getOwnPropertyDescriptor() {
        return propertyDescriptor;
      },
      has(_target, key) {
        if (key in utils) {
          return true;
        }
        return false;
      },
      ...handler,
      get(target, key, receiver) {
        if (key in utils) {
          return utils[key];
        }
        if (handler.get) {
          return handler.get(target, key, receiver);
        }
      },
      set(target, key, value, receiver) {
        if (key in utils) {
          utils[key] = value;
          return true;
        }
        if (handler.set) {
          return handler.set(target, key, value, receiver);
        }
        return false;
      }
    }
  );
}

const b$3 = builders$1;
const _importProxyCache = /* @__PURE__ */ new WeakMap();
function creatImportProxy(node, specifier, root) {
  if (_importProxyCache.has(specifier)) {
    return _importProxyCache.get(specifier);
  }
  const proxy = createProxy(
    specifier,
    {
      get $declaration() {
        return node;
      },
      get imported() {
        if (specifier.type === "ImportDefaultSpecifier") {
          return "default";
        }
        if (specifier.type === "ImportNamespaceSpecifier") {
          return "*";
        }
        if (specifier.imported.type === "Identifier") {
          return specifier.imported.name;
        }
        return specifier.imported.value;
      },
      set imported(value) {
        if (specifier.type !== "ImportSpecifier") {
          throw new MagicastError(
            "Changing import name is not yet implemented"
          );
        }
        if (specifier.imported.type === "Identifier") {
          specifier.imported.name = value;
        } else {
          specifier.imported.value = value;
        }
      },
      get local() {
        return specifier.local.name;
      },
      set local(value) {
        specifier.local.name = value;
      },
      get from() {
        return node.source.value;
      },
      set from(value) {
        if (value === node.source.value) {
          return;
        }
        node.specifiers = node.specifiers.filter((s) => s !== specifier);
        if (node.specifiers.length === 0) {
          root.body = root.body.filter((s) => s !== node);
        }
        const declaration = root.body.find(
          (i) => i.type === "ImportDeclaration" && i.source.value === value
        );
        if (declaration) {
          declaration.specifiers.push(specifier);
        } else {
          root.body.unshift(
            b$3.importDeclaration(
              [specifier],
              b$3.stringLiteral(value)
            )
          );
        }
      },
      toJSON() {
        return {
          imported: this.imported,
          local: this.local,
          from: this.from
        };
      }
    },
    {
      ownKeys() {
        return ["imported", "local", "from", "toJSON"];
      }
    }
  );
  _importProxyCache.set(specifier, proxy);
  return proxy;
}
function createImportsProxy(root, mod) {
  const getAllImports = () => {
    const imports = [];
    for (const n of root.body) {
      if (n.type === "ImportDeclaration") {
        for (const specifier of n.specifiers) {
          imports.push(creatImportProxy(n, specifier, root));
        }
      }
    }
    return imports;
  };
  const updateImport = (key, value, order) => {
    const imports = getAllImports();
    const item = imports.find((i) => i.local === key);
    const local = value.local || key;
    if (item) {
      item.imported = value.imported;
      item.local = local;
      item.from = value.from;
      return true;
    }
    const specifier = value.imported === "default" ? b$3.importDefaultSpecifier(b$3.identifier(local)) : value.imported === "*" ? b$3.importNamespaceSpecifier(b$3.identifier(local)) : b$3.importSpecifier(
      b$3.identifier(value.imported),
      b$3.identifier(local)
    );
    const declaration = imports.find(
      (i) => i.from === value.from
    )?.$declaration;
    if (declaration) {
      declaration.specifiers.push(specifier);
    } else if (order === "prepend" || imports.length === 0) {
      root.body.unshift(
        b$3.importDeclaration([specifier], b$3.stringLiteral(value.from))
      );
    } else {
      const lastImport = imports.at(-1).$declaration;
      const lastImportIndex = root.body.indexOf(lastImport);
      root.body.splice(
        lastImportIndex + 1,
        0,
        b$3.importDeclaration([specifier], b$3.stringLiteral(value.from))
      );
    }
    return true;
  };
  const removeImport = (key) => {
    const item = getAllImports().find((i) => i.local === key);
    if (!item) {
      return false;
    }
    const node = item.$declaration;
    const specifier = item.$ast;
    node.specifiers = node.specifiers.filter((s) => s !== specifier);
    if (node.specifiers.length === 0) {
      root.body = root.body.filter((n) => n !== node);
    }
    return true;
  };
  const proxy = createProxy(
    root,
    {
      $type: "imports",
      $add(item) {
        updateImport(item.local || item.imported, item, "prepend");
      },
      $prepend(item) {
        updateImport(item.local || item.imported, item, "prepend");
      },
      $append(item) {
        updateImport(item.local || item.imported, item, "append");
      },
      get $items() {
        return getAllImports();
      },
      toJSON() {
        return getAllImports().reduce((acc, i) => {
          acc[i.local] = i;
          return acc;
        }, {});
      }
    },
    {
      get(_, prop) {
        return getAllImports().find((i) => i.local === prop);
      },
      set(_, prop, value) {
        return updateImport(prop, value, "prepend");
      },
      deleteProperty(_, prop) {
        return removeImport(prop);
      },
      ownKeys() {
        return getAllImports().map((i) => i.local);
      },
      has(_, prop) {
        return getAllImports().some((i) => i.local === prop);
      }
    }
  );
  return proxy;
}

function proxifyArrayElements(node, elements, mod) {
  const getItem = (key) => {
    return elements[key];
  };
  const replaceItem = (key, value) => {
    elements[key] = value;
  };
  return createProxy(
    node,
    {
      $type: "array",
      push(value) {
        elements.push(literalToAst(value));
      },
      pop() {
        return proxify(elements.pop(), mod);
      },
      unshift(value) {
        elements.unshift(literalToAst(value));
      },
      shift() {
        return proxify(elements.shift(), mod);
      },
      splice(start, deleteCount, ...items) {
        const deleted = elements.splice(
          start,
          deleteCount,
          ...items.map((n) => literalToAst(n))
        );
        return deleted.map((n) => proxify(n, mod));
      },
      find(predicate) {
        return elements.map((n) => proxify(n, mod)).find(predicate);
      },
      findIndex(predicate) {
        return elements.map((n) => proxify(n, mod)).findIndex(predicate);
      },
      includes(value) {
        return elements.map((n) => proxify(n, mod)).includes(value);
      },
      toJSON() {
        return elements.map((n) => proxify(n, mod));
      }
    },
    {
      get(_, key) {
        if (key === "length") {
          return elements.length;
        }
        if (key === Symbol.iterator) {
          return function* () {
            for (const item of elements) {
              yield proxify(item, mod);
            }
          };
        }
        if (typeof key === "symbol") {
          return;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return;
        }
        const prop = getItem(index);
        if (prop) {
          return proxify(prop, mod);
        }
      },
      set(_, key, value) {
        if (typeof key === "symbol") {
          return false;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return false;
        }
        replaceItem(index, literalToAst(value));
        return true;
      },
      deleteProperty(_, key) {
        if (typeof key === "symbol") {
          return false;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return false;
        }
        elements[index] = literalToAst(void 0);
        return true;
      },
      ownKeys() {
        return ["length", ...elements.map((_, i) => i.toString())];
      }
    }
  );
}
function proxifyArray(node, mod) {
  if (!("elements" in node)) {
    return void 0;
  }
  return proxifyArrayElements(node, node.elements, mod);
}

function proxifyFunctionCall(node, mod) {
  if (node.type !== "CallExpression") {
    throw new MagicastError("Not a function call");
  }
  function stringifyExpression(node2) {
    if (node2.type === "Identifier") {
      return node2.name;
    }
    if (node2.type === "MemberExpression") {
      return `${stringifyExpression(node2.object)}.${stringifyExpression(
        node2.property
      )}`;
    }
    throw new MagicastError("Not implemented");
  }
  const argumentsProxy = proxifyArrayElements(node, node.arguments, mod);
  return createProxy(
    node,
    {
      $type: "function-call",
      $callee: stringifyExpression(node.callee),
      $args: argumentsProxy
    },
    {}
  );
}

function proxifyArrowFunctionExpression(node, mod) {
  if (node.type !== "ArrowFunctionExpression") {
    throw new MagicastError("Not an arrow function expression");
  }
  const parametersProxy = proxifyArrayElements(node, node.params, mod);
  return createProxy(
    node,
    {
      $type: "arrow-function-expression",
      $params: parametersProxy,
      $body: proxify(node.body, mod)
    },
    {}
  );
}

const b$2 = builders$1;
function proxifyObject(node, mod) {
  if (!("properties" in node)) {
    return void 0;
  }
  const getProp = (key) => {
    for (const prop of node.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        return prop.value;
      }
      if (prop.type === "ObjectProperty" && (prop.key.type === "StringLiteral" || prop.key.type === "NumericLiteral" || prop.key.type === "BooleanLiteral") && prop.key.value.toString() === key) {
        return prop.value.value ?? prop.value;
      }
    }
  };
  const getPropName = (prop, throwError = false) => {
    if ("key" in prop && "name" in prop.key) {
      return prop.key.name;
    }
    if (prop.type === "ObjectProperty" && (prop.key.type === "StringLiteral" || prop.key.type === "NumericLiteral" || prop.key.type === "BooleanLiteral")) {
      return prop.key.value.toString();
    }
    if (throwError) {
      throw new MagicastError(`Casting "${prop.type}" is not supported`, {
        ast: prop,
        code: mod?.$code
      });
    }
  };
  const replaceOrAddProp = (key, value) => {
    const prop = node.properties.find(
      (prop2) => getPropName(prop2) === key
    );
    if (prop) {
      prop.value = value;
    } else if (isValidPropName(key)) {
      node.properties.push({
        type: "Property",
        key: {
          type: "Identifier",
          name: key
        },
        value
      });
    } else {
      node.properties.push({
        type: "ObjectProperty",
        key: b$2.stringLiteral(key),
        value
      });
    }
  };
  return createProxy(
    node,
    {
      $type: "object",
      toJSON() {
        return node.properties.reduce((acc, prop) => {
          if ("key" in prop && "name" in prop.key) {
            acc[prop.key.name] = proxify(prop.value, mod);
          }
          return acc;
        }, {});
      }
    },
    {
      get(_, key) {
        const prop = getProp(key);
        if (prop) {
          return proxify(prop, mod);
        }
      },
      set(_, key, value) {
        if (typeof key !== "string") {
          key = String(key);
        }
        replaceOrAddProp(key, literalToAst(value));
        return true;
      },
      deleteProperty(_, key) {
        if (typeof key !== "string") {
          key = String(key);
        }
        const index = node.properties.findIndex(
          (prop) => "key" in prop && "name" in prop.key && prop.key.name === key
        );
        if (index !== -1) {
          node.properties.splice(index, 1);
        }
        return true;
      },
      ownKeys() {
        return node.properties.map((prop) => getPropName(prop, true)).filter(Boolean);
      }
    }
  );
}

function proxifyNewExpression(node, mod) {
  if (node.type !== "NewExpression") {
    throw new MagicastError("Not a new expression");
  }
  function stringifyExpression(node2) {
    if (node2.type === "Identifier") {
      return node2.name;
    }
    if (node2.type === "MemberExpression") {
      return `${stringifyExpression(node2.object)}.${stringifyExpression(
        node2.property
      )}`;
    }
    throw new MagicastError("Not implemented");
  }
  const argumentsProxy = proxifyArrayElements(node, node.arguments, mod);
  return createProxy(
    node,
    {
      $type: "new-expression",
      $callee: stringifyExpression(node.callee),
      $args: argumentsProxy
    },
    {}
  );
}

function proxifyIdentifier(node) {
  if (node.type !== "Identifier") {
    throw new MagicastError("Not an identifier");
  }
  return createProxy(
    node,
    {
      $type: "identifier",
      $name: node.name
    },
    {}
  );
}

function proxifyLogicalExpression(node) {
  if (node.type !== "LogicalExpression") {
    throw new MagicastError("Not a logical expression");
  }
  return createProxy(
    node,
    {
      $type: "logicalExpression"
    },
    {}
  );
}

function proxifyMemberExpression(node) {
  if (node.type !== "MemberExpression") {
    throw new MagicastError("Not a member expression");
  }
  return createProxy(
    node,
    {
      $type: "memberExpression"
    },
    {}
  );
}

const _cache = /* @__PURE__ */ new WeakMap();
function proxify(node, mod) {
  if (LITERALS_TYPEOF.has(typeof node)) {
    return node;
  }
  if (LITERALS_AST.has(node.type)) {
    return node.value;
  }
  if (_cache.has(node)) {
    return _cache.get(node);
  }
  let proxy;
  switch (node.type) {
    case "ObjectExpression": {
      proxy = proxifyObject(node, mod);
      break;
    }
    case "ArrayExpression": {
      proxy = proxifyArray(node, mod);
      break;
    }
    case "CallExpression": {
      proxy = proxifyFunctionCall(node, mod);
      break;
    }
    case "ArrowFunctionExpression": {
      proxy = proxifyArrowFunctionExpression(node, mod);
      break;
    }
    case "NewExpression": {
      proxy = proxifyNewExpression(node, mod);
      break;
    }
    case "Identifier": {
      proxy = proxifyIdentifier(node);
      break;
    }
    case "LogicalExpression": {
      proxy = proxifyLogicalExpression(node);
      break;
    }
    case "MemberExpression": {
      proxy = proxifyMemberExpression(node);
      break;
    }
    case "TSAsExpression":
    case "TSSatisfiesExpression": {
      proxy = proxify(node.expression, mod);
      break;
    }
    default: {
      throw new MagicastError(`Casting "${node.type}" is not supported`, {
        ast: node,
        code: mod?.$code
      });
    }
  }
  _cache.set(node, proxy);
  return proxy;
}

const b$1 = builders$1;
function createExportsProxy(root, mod) {
  const findExport = (key) => {
    const type = key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";
    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          return n.declaration;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            return dec.init;
          }
        }
      }
    }
  };
  const updateOrAddExport = (key, value) => {
    const type = key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";
    const node = literalToAst(value);
    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          n.declaration = node;
          return;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            dec.init = node;
            return;
          }
        }
      }
    }
    root.body.push(
      key === "default" ? b$1.exportDefaultDeclaration(node) : b$1.exportNamedDeclaration(
        b$1.variableDeclaration("const", [
          b$1.variableDeclarator(b$1.identifier(key), node)
        ])
      )
    );
  };
  return createProxy(
    root,
    {
      $type: "exports"
    },
    {
      get(_, prop) {
        const node = findExport(prop);
        if (node) {
          return proxify(node, mod);
        }
      },
      set(_, prop, value) {
        updateOrAddExport(prop, value);
        return true;
      },
      ownKeys() {
        return root.body.flatMap((i) => {
          if (i.type === "ExportDefaultDeclaration") {
            return ["default"];
          }
          if (i.type === "ExportNamedDeclaration" && i.declaration && "declarations" in i.declaration) {
            return i.declaration.declarations.map(
              (d) => "name" in d.id ? d.id.name : ""
            );
          }
          return [];
        }).filter(Boolean);
      },
      deleteProperty(_, prop) {
        const type = prop === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";
        for (let i = 0; i < root.body.length; i++) {
          const n = root.body[i];
          if (n.type === type) {
            if (prop === "default") {
              root.body.splice(i, 1);
              return true;
            }
            if (n.declaration && "declarations" in n.declaration) {
              const dec = n.declaration.declarations[0];
              if ("name" in dec.id && dec.id.name === prop) {
                root.body.splice(i, 1);
                return true;
              }
            }
          }
        }
        return false;
      }
    }
  );
}

function proxifyModule(ast, code) {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new MagicastError(`Cannot proxify ${ast.type} as module`);
  }
  const util = {
    $code: code,
    $type: "module"
  };
  const mod = createProxy(root, util, {
    ownKeys() {
      return ["imports", "exports", "generate"];
    }
  });
  util.exports = createExportsProxy(root, mod);
  util.imports = createImportsProxy(root);
  util.generate = (options) => generateCode(mod, options);
  return mod;
}

function detectCodeFormat(code, userStyles = {}) {
  const detect = {
    wrapColumn: userStyles.wrapColumn === void 0,
    indent: userStyles.tabWidth === void 0 || userStyles.useTabs === void 0,
    quote: userStyles.quote === void 0,
    arrowParens: userStyles.arrowParensAlways === void 0,
    trailingComma: userStyles.trailingComma === void 0
  };
  let codeIndent = 2;
  let tabUsages = 0;
  let semiUsages = 0;
  let maxLineLength = 0;
  let multiLineTrailingCommaUsages = 0;
  const syntaxDetectRegex = /(?<doubleQuote>"[^"]+")|(?<singleQuote>'[^']+')|(?<singleParam>\([^),]+\)\s*=>)|(?<trailingComma>,\s*[\]}])/g;
  const syntaxUsages = {
    doubleQuote: 0,
    singleQuote: 0,
    singleParam: 0,
    trailingComma: 0
  };
  const lines = (code || "").split("\n");
  let previousLineTrailing = false;
  for (const line of lines) {
    const trimmitedLine = line.trim();
    if (trimmitedLine.length === 0) {
      continue;
    }
    if (detect.wrapColumn && line.length > maxLineLength) {
      maxLineLength = line.length;
    }
    if (detect.indent) {
      const lineIndent = line.match(/^\s+/)?.[0] || "";
      if (lineIndent.length > 0) {
        if (lineIndent.length > 0 && lineIndent.length < codeIndent) {
          codeIndent = lineIndent.length;
        }
        if (lineIndent[0] === "	") {
          tabUsages++;
        } else if (lineIndent.length > 0) {
          tabUsages--;
        }
      }
    }
    if (trimmitedLine.at(-1) === ";") {
      semiUsages++;
    } else if (trimmitedLine.length > 0) {
      semiUsages--;
    }
    if (detect.quote || detect.arrowParens) {
      const matches = trimmitedLine.matchAll(syntaxDetectRegex);
      for (const match of matches) {
        if (!match.groups) {
          continue;
        }
        for (const key in syntaxUsages) {
          if (match.groups[key]) {
            syntaxUsages[key]++;
          }
        }
      }
    }
    if (detect.trailingComma) {
      if (line.startsWith("}") || line.startsWith("]")) {
        if (previousLineTrailing) {
          multiLineTrailingCommaUsages++;
        } else {
          multiLineTrailingCommaUsages--;
        }
      }
      previousLineTrailing = trimmitedLine.endsWith(",");
    }
  }
  return {
    wrapColumn: maxLineLength,
    useTabs: tabUsages > 0,
    tabWidth: codeIndent,
    quote: syntaxUsages.singleQuote > syntaxUsages.doubleQuote ? "single" : "double",
    arrowParensAlways: syntaxUsages.singleParam > 0,
    trailingComma: multiLineTrailingCommaUsages > 0 || syntaxUsages.trailingComma > 0,
    useSemi: semiUsages > 0,
    arrayBracketSpacing: void 0,
    // TODO
    objectCurlySpacing: void 0,
    // TODO
    ...userStyles
  };
}

function parseModule(code, options) {
  const node = parse(code, {
    parser: options?.parser || getBabelParser(),
    ...options
  });
  return proxifyModule(node, code);
}
function parseExpression(code, options) {
  const root = parse("(" + code + ")", {
    parser: options?.parser || getBabelParser(),
    ...options
  });
  let body = root.program.body[0];
  if (body.type === "ExpressionStatement") {
    body = body.expression;
  }
  if (body.extra?.parenthesized) {
    body.extra.parenthesized = false;
  }
  const mod = {
    $ast: root,
    $code: " " + code + " ",
    $type: "module"
  };
  return proxify(body, mod);
}
function generateCode(node, options = {}) {
  const ast = node.$ast || node;
  const formatOptions = options.format === false || !("$code" in node) ? {} : detectCodeFormat(node.$code, options.format);
  const { code, map } = print(ast, {
    ...options,
    ...formatOptions
  });
  return { code, map };
}
async function loadFile(filename, options = {}) {
  const contents = await promises.readFile(filename, "utf8");
  options.sourceFileName = options.sourceFileName ?? filename;
  return parseModule(contents, options);
}
async function writeFile(node, filename, options) {
  const ast = "$ast" in node ? node.$ast : node;
  const { code, map } = generateCode(ast, options);
  await promises.writeFile(filename, code);
  if (map) {
    await promises.writeFile(filename + ".map", map);
  }
}

const b = builders$1;
const builders = {
  /**
   * Create a function call node.
   */
  functionCall(callee, ...args) {
    const node = b.callExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i))
    );
    return proxifyFunctionCall(node);
  },
  /**
   * Create a new expression node.
   */
  newExpression(callee, ...args) {
    const node = b.newExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i))
    );
    return proxifyNewExpression(node);
  },
  /**
   * Create a proxified version of a literal value.
   */
  literal(value) {
    return literalToAst(value);
  },
  /**
   * Parse a raw expression and return a proxified version of it.
   *
   * ```ts
   * const obj = builders.raw("{ foo: 1 }");
   * console.log(obj.foo); // 1
   * ```
   */
  raw(code) {
    return parseExpression(code);
  }
};

export { MagicastError, builders, detectCodeFormat, generateCode, loadFile, parseExpression, parseModule, writeFile };
