"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Def = void 0;
var tslib_1 = require("tslib");
var shared_1 = require("./shared");
var Op = Object.prototype;
var objToStr = Op.toString;
var hasOwn = Op.hasOwnProperty;
var BaseType = /** @class */ (function () {
    function BaseType() {
    }
    BaseType.prototype.assert = function (value, deep) {
        if (!this.check(value, deep)) {
            var str = shallowStringify(value);
            throw new Error(str + " does not match type " + this);
        }
        return true;
    };
    BaseType.prototype.arrayOf = function () {
        var elemType = this;
        return new ArrayType(elemType);
    };
    return BaseType;
}());
var ArrayType = /** @class */ (function (_super) {
    tslib_1.__extends(ArrayType, _super);
    function ArrayType(elemType) {
        var _this = _super.call(this) || this;
        _this.elemType = elemType;
        _this.kind = "ArrayType";
        return _this;
    }
    ArrayType.prototype.toString = function () {
        return "[" + this.elemType + "]";
    };
    ArrayType.prototype.check = function (value, deep) {
        var _this = this;
        return Array.isArray(value) && value.every(function (elem) { return _this.elemType.check(elem, deep); });
    };
    return ArrayType;
}(BaseType));
var IdentityType = /** @class */ (function (_super) {
    tslib_1.__extends(IdentityType, _super);
    function IdentityType(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        _this.kind = "IdentityType";
        return _this;
    }
    IdentityType.prototype.toString = function () {
        return String(this.value);
    };
    IdentityType.prototype.check = function (value, deep) {
        var result = value === this.value;
        if (!result && typeof deep === "function") {
            deep(this, value);
        }
        return result;
    };
    return IdentityType;
}(BaseType));
var ObjectType = /** @class */ (function (_super) {
    tslib_1.__extends(ObjectType, _super);
    function ObjectType(fields) {
        var _this = _super.call(this) || this;
        _this.fields = fields;
        _this.kind = "ObjectType";
        return _this;
    }
    ObjectType.prototype.toString = function () {
        return "{ " + this.fields.join(", ") + " }";
    };
    ObjectType.prototype.check = function (value, deep) {
        return (objToStr.call(value) === objToStr.call({}) &&
            this.fields.every(function (field) {
                return field.type.check(value[field.name], deep);
            }));
    };
    return ObjectType;
}(BaseType));
var OrType = /** @class */ (function (_super) {
    tslib_1.__extends(OrType, _super);
    function OrType(types) {
        var _this = _super.call(this) || this;
        _this.types = types;
        _this.kind = "OrType";
        return _this;
    }
    OrType.prototype.toString = function () {
        return this.types.join(" | ");
    };
    OrType.prototype.check = function (value, deep) {
        if (this.types.some(function (type) { return type.check(value, !!deep); })) {
            return true;
        }
        if (typeof deep === "function") {
            deep(this, value);
        }
        return false;
    };
    return OrType;
}(BaseType));
var PredicateType = /** @class */ (function (_super) {
    tslib_1.__extends(PredicateType, _super);
    function PredicateType(name, predicate) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.predicate = predicate;
        _this.kind = "PredicateType";
        return _this;
    }
    PredicateType.prototype.toString = function () {
        return this.name;
    };
    PredicateType.prototype.check = function (value, deep) {
        var result = this.predicate(value, deep);
        if (!result && typeof deep === "function") {
            deep(this, value);
        }
        return result;
    };
    return PredicateType;
}(BaseType));
var Def = /** @class */ (function () {
    function Def(type, typeName) {
        this.type = type;
        this.typeName = typeName;
        this.baseNames = [];
        this.ownFields = Object.create(null);
        // Includes own typeName. Populated during finalization.
        this.allSupertypes = Object.create(null);
        // Linear inheritance hierarchy. Populated during finalization.
        this.supertypeList = [];
        // Includes inherited fields.
        this.allFields = Object.create(null);
        // Non-hidden keys of allFields.
        this.fieldNames = [];
        // This property will be overridden as true by individual Def instances
        // when they are finalized.
        this.finalized = false;
        // False by default until .build(...) is called on an instance.
        this.buildable = false;
        this.buildParams = [];
    }
    Def.prototype.isSupertypeOf = function (that) {
        if (that instanceof Def) {
            if (this.finalized !== true ||
                that.finalized !== true) {
                throw new Error("");
            }
            return hasOwn.call(that.allSupertypes, this.typeName);
        }
        else {
            throw new Error(that + " is not a Def");
        }
    };
    Def.prototype.checkAllFields = function (value, deep) {
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
        return value !== null &&
            typeof value === "object" &&
            Object.keys(allFields).every(checkFieldByName);
    };
    Def.prototype.bases = function () {
        var supertypeNames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            supertypeNames[_i] = arguments[_i];
        }
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
        supertypeNames.forEach(function (baseName) {
            // This indexOf lookup may be O(n), but the typical number of base
            // names is very small, and indexOf is a native Array method.
            if (bases.indexOf(baseName) < 0) {
                bases.push(baseName);
            }
        });
        return this; // For chaining.
    };
    return Def;
}());
exports.Def = Def;
var Field = /** @class */ (function () {
    function Field(name, type, defaultFn, hidden) {
        this.name = name;
        this.type = type;
        this.defaultFn = defaultFn;
        this.hidden = !!hidden;
    }
    Field.prototype.toString = function () {
        return JSON.stringify(this.name) + ": " + this.type;
    };
    Field.prototype.getValue = function (obj) {
        var value = obj[this.name];
        if (typeof value !== "undefined") {
            return value;
        }
        if (typeof this.defaultFn === "function") {
            value = this.defaultFn.call(obj);
        }
        return value;
    };
    return Field;
}());
function shallowStringify(value) {
    if (Array.isArray(value)) {
        return "[" + value.map(shallowStringify).join(", ") + "]";
    }
    if (value && typeof value === "object") {
        return "{ " + Object.keys(value).map(function (key) {
            return key + ": " + value[key];
        }).join(", ") + " }";
    }
    return JSON.stringify(value);
}
function typesPlugin(_fork) {
    var Type = {
        or: function () {
            var types = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                types[_i] = arguments[_i];
            }
            return new OrType(types.map(function (type) { return Type.from(type); }));
        },
        from: function (value, name) {
            if (value instanceof ArrayType ||
                value instanceof IdentityType ||
                value instanceof ObjectType ||
                value instanceof OrType ||
                value instanceof PredicateType) {
                return value;
            }
            // The Def type is used as a helper for constructing compound
            // interface types for AST nodes.
            if (value instanceof Def) {
                return value.type;
            }
            // Support [ElemType] syntax.
            if (isArray.check(value)) {
                if (value.length !== 1) {
                    throw new Error("only one element type is permitted for typed arrays");
                }
                return new ArrayType(Type.from(value[0]));
            }
            // Support { someField: FieldType, ... } syntax.
            if (isObject.check(value)) {
                return new ObjectType(Object.keys(value).map(function (name) {
                    return new Field(name, Type.from(value[name], name));
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
            // As a last resort, toType returns a type that matches any value that
            // is === from. This is primarily useful for literal values like
            // toType(null), but it has the additional advantage of allowing
            // toType to be a total function.
            return new IdentityType(value);
        },
        // Define a type whose name is registered in a namespace (the defCache) so
        // that future definitions will return the same type given the same name.
        // In particular, this system allows for circular and forward definitions.
        // The Def object d returned from Type.def may be used to configure the
        // type d.type by calling methods such as d.bases, d.build, and d.field.
        def: function (typeName) {
            return hasOwn.call(defCache, typeName)
                ? defCache[typeName]
                : defCache[typeName] = new DefImpl(typeName);
        },
        hasDef: function (typeName) {
            return hasOwn.call(defCache, typeName);
        }
    };
    var builtInCtorFns = [];
    var builtInCtorTypes = [];
    function defBuiltInType(name, example) {
        var objStr = objToStr.call(example);
        var type = new PredicateType(name, function (value) { return objToStr.call(value) === objStr; });
        if (example && typeof example.constructor === "function") {
            builtInCtorFns.push(example.constructor);
            builtInCtorTypes.push(type);
        }
        return type;
    }
    // These types check the underlying [[Class]] attribute of the given
    // value, rather than using the problematic typeof operator. Note however
    // that no subtyping is considered; so, for instance, isObject.check
    // returns false for [], /./, new Date, and null.
    var isString = defBuiltInType("string", "truthy");
    var isFunction = defBuiltInType("function", function () { });
    var isArray = defBuiltInType("array", []);
    var isObject = defBuiltInType("object", {});
    var isRegExp = defBuiltInType("RegExp", /./);
    var isDate = defBuiltInType("Date", new Date());
    var isNumber = defBuiltInType("number", 3);
    var isBoolean = defBuiltInType("boolean", true);
    var isNull = defBuiltInType("null", null);
    var isUndefined = defBuiltInType("undefined", undefined);
    var isBigInt = typeof BigInt === "function"
        ? defBuiltInType("BigInt", BigInt(1234))
        : new PredicateType("BigInt", function () { return false; });
    var builtInTypes = {
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
        BigInt: isBigInt,
    };
    // In order to return the same Def instance every time Type.def is called
    // with a particular name, those instances need to be stored in a cache.
    var defCache = Object.create(null);
    function defFromValue(value) {
        if (value && typeof value === "object") {
            var type = value.type;
            if (typeof type === "string" &&
                hasOwn.call(defCache, type)) {
                var d = defCache[type];
                if (d.finalized) {
                    return d;
                }
            }
        }
        return null;
    }
    var DefImpl = /** @class */ (function (_super) {
        tslib_1.__extends(DefImpl, _super);
        function DefImpl(typeName) {
            var _this = _super.call(this, new PredicateType(typeName, function (value, deep) { return _this.check(value, deep); }), typeName) || this;
            return _this;
        }
        DefImpl.prototype.check = function (value, deep) {
            if (this.finalized !== true) {
                throw new Error("prematurely checking unfinalized type " + this.typeName);
            }
            // A Def type can only match an object value.
            if (value === null || typeof value !== "object") {
                return false;
            }
            var vDef = defFromValue(value);
            if (!vDef) {
                // If we couldn't infer the Def associated with the given value,
                // and we expected it to be a SourceLocation or a Position, it was
                // probably just missing a "type" field (because Esprima does not
                // assign a type property to such nodes). Be optimistic and let
                // this.checkAllFields make the final decision.
                if (this.typeName === "SourceLocation" ||
                    this.typeName === "Position") {
                    return this.checkAllFields(value, deep);
                }
                // Calling this.checkAllFields for any other type of node is both
                // bad for performance and way too forgiving.
                return false;
            }
            // If checking deeply and vDef === this, then we only need to call
            // checkAllFields once. Calling checkAllFields is too strict when deep
            // is false, because then we only care about this.isSupertypeOf(vDef).
            if (deep && vDef === this) {
                return this.checkAllFields(value, deep);
            }
            // In most cases we rely exclusively on isSupertypeOf to make O(1)
            // subtyping determinations. This suffices in most situations outside
            // of unit tests, since interface conformance is checked whenever new
            // instances are created using builder functions.
            if (!this.isSupertypeOf(vDef)) {
                return false;
            }
            // The exception is when deep is true; then, we recursively check all
            // fields.
            if (!deep) {
                return true;
            }
            // Use the more specific Def (vDef) to perform the deep check, but
            // shallow-check fields defined by the less specific Def (this).
            return vDef.checkAllFields(value, deep)
                && this.checkAllFields(value, false);
        };
        DefImpl.prototype.build = function () {
            var _this = this;
            var buildParams = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                buildParams[_i] = arguments[_i];
            }
            // Calling Def.prototype.build multiple times has the effect of merely
            // redefining this property.
            this.buildParams = buildParams;
            if (this.buildable) {
                // If this Def is already buildable, update self.buildParams and
                // continue using the old builder function.
                return this;
            }
            // Every buildable type will have its "type" field filled in
            // automatically. This includes types that are not subtypes of Node,
            // like SourceLocation, but that seems harmless (TODO?).
            this.field("type", String, function () { return _this.typeName; });
            // Override Dp.buildable for this Def instance.
            this.buildable = true;
            var addParam = function (built, param, arg, isArgAvailable) {
                if (hasOwn.call(built, param))
                    return;
                var all = _this.allFields;
                if (!hasOwn.call(all, param)) {
                    throw new Error("" + param);
                }
                var field = all[param];
                var type = field.type;
                var value;
                if (isArgAvailable) {
                    value = arg;
                }
                else if (field.defaultFn) {
                    // Expose the partially-built object to the default
                    // function as its `this` object.
                    value = field.defaultFn.call(built);
                }
                else {
                    var message = "no value or default function given for field " +
                        JSON.stringify(param) + " of " + _this.typeName + "(" +
                        _this.buildParams.map(function (name) {
                            return all[name];
                        }).join(", ") + ")";
                    throw new Error(message);
                }
                if (!type.check(value)) {
                    throw new Error(shallowStringify(value) +
                        " does not match field " + field +
                        " of type " + _this.typeName);
                }
                built[param] = value;
            };
            // Calling the builder function will construct an instance of the Def,
            // with positional arguments mapped to the fields original passed to .build.
            // If not enough arguments are provided, the default value for the remaining fields
            // will be used.
            var builder = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var argc = args.length;
                if (!_this.finalized) {
                    throw new Error("attempting to instantiate unfinalized type " +
                        _this.typeName);
                }
                var built = Object.create(nodePrototype);
                _this.buildParams.forEach(function (param, i) {
                    if (i < argc) {
                        addParam(built, param, args[i], true);
                    }
                    else {
                        addParam(built, param, null, false);
                    }
                });
                Object.keys(_this.allFields).forEach(function (param) {
                    // Use the default value.
                    addParam(built, param, null, false);
                });
                // Make sure that the "type" field was filled automatically.
                if (built.type !== _this.typeName) {
                    throw new Error("");
                }
                return built;
            };
            // Calling .from on the builder function will construct an instance of the Def,
            // using field values from the passed object. For fields missing from the passed object,
            // their default value will be used.
            builder.from = function (obj) {
                if (!_this.finalized) {
                    throw new Error("attempting to instantiate unfinalized type " +
                        _this.typeName);
                }
                var built = Object.create(nodePrototype);
                Object.keys(_this.allFields).forEach(function (param) {
                    if (hasOwn.call(obj, param)) {
                        addParam(built, param, obj[param], true);
                    }
                    else {
                        addParam(built, param, null, false);
                    }
                });
                // Make sure that the "type" field was filled automatically.
                if (built.type !== _this.typeName) {
                    throw new Error("");
                }
                return built;
            };
            Object.defineProperty(builders, getBuilderName(this.typeName), {
                enumerable: true,
                value: builder
            });
            return this;
        };
        // The reason fields are specified using .field(...) instead of an object
        // literal syntax is somewhat subtle: the object literal syntax would
        // support only one key and one value, but with .field(...) we can pass
        // any number of arguments to specify the field.
        DefImpl.prototype.field = function (name, type, defaultFn, hidden) {
            if (this.finalized) {
                console.error("Ignoring attempt to redefine field " +
                    JSON.stringify(name) + " of finalized type " +
                    JSON.stringify(this.typeName));
                return this;
            }
            this.ownFields[name] = new Field(name, Type.from(type), defaultFn, hidden);
            return this; // For chaining.
        };
        DefImpl.prototype.finalize = function () {
            var _this = this;
            // It's not an error to finalize a type more than once, but only the
            // first call to .finalize does anything.
            if (!this.finalized) {
                var allFields = this.allFields;
                var allSupertypes = this.allSupertypes;
                this.baseNames.forEach(function (name) {
                    var def = defCache[name];
                    if (def instanceof Def) {
                        def.finalize();
                        extend(allFields, def.allFields);
                        extend(allSupertypes, def.allSupertypes);
                    }
                    else {
                        var message = "unknown supertype name " +
                            JSON.stringify(name) +
                            " for subtype " +
                            JSON.stringify(_this.typeName);
                        throw new Error(message);
                    }
                });
                // TODO Warn if fields are overridden with incompatible types.
                extend(allFields, this.ownFields);
                allSupertypes[this.typeName] = this;
                this.fieldNames.length = 0;
                for (var fieldName in allFields) {
                    if (hasOwn.call(allFields, fieldName) &&
                        !allFields[fieldName].hidden) {
                        this.fieldNames.push(fieldName);
                    }
                }
                // Types are exported only once they have been finalized.
                Object.defineProperty(namedTypes, this.typeName, {
                    enumerable: true,
                    value: this.type
                });
                this.finalized = true;
                // A linearization of the inheritance hierarchy.
                populateSupertypeList(this.typeName, this.supertypeList);
                if (this.buildable &&
                    this.supertypeList.lastIndexOf("Expression") >= 0) {
                    wrapExpressionBuilderWithStatement(this.typeName);
                }
            }
        };
        return DefImpl;
    }(Def));
    // Note that the list returned by this function is a copy of the internal
    // supertypeList, *without* the typeName itself as the first element.
    function getSupertypeNames(typeName) {
        if (!hasOwn.call(defCache, typeName)) {
            throw new Error("");
        }
        var d = defCache[typeName];
        if (d.finalized !== true) {
            throw new Error("");
        }
        return d.supertypeList.slice(1);
    }
    // Returns an object mapping from every known type in the defCache to the
    // most specific supertype whose name is an own property of the candidates
    // object.
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
                if (hasOwn.call(candidates, superTypeName)) {
                    table[typeName] = superTypeName;
                    break;
                }
            }
        }
        return table;
    }
    var builders = Object.create(null);
    // This object is used as prototype for any node created by a builder.
    var nodePrototype = {};
    // Call this function to define a new method to be shared by all AST
    // nodes. The replaced method (if any) is returned for easy wrapping.
    function defineMethod(name, func) {
        var old = nodePrototype[name];
        // Pass undefined as func to delete nodePrototype[name].
        if (isUndefined.check(func)) {
            delete nodePrototype[name];
        }
        else {
            isFunction.assert(func);
            Object.defineProperty(nodePrototype, name, {
                enumerable: true,
                configurable: true,
                value: func
            });
        }
        return old;
    }
    function getBuilderName(typeName) {
        return typeName.replace(/^[A-Z]+/, function (upperCasePrefix) {
            var len = upperCasePrefix.length;
            switch (len) {
                case 0: return "";
                // If there's only one initial capital letter, just lower-case it.
                case 1: return upperCasePrefix.toLowerCase();
                default:
                    // If there's more than one initial capital letter, lower-case
                    // all but the last one, so that XMLDefaultDeclaration (for
                    // example) becomes xmlDefaultDeclaration.
                    return upperCasePrefix.slice(0, len - 1).toLowerCase() +
                        upperCasePrefix.charAt(len - 1);
            }
        });
    }
    function getStatementBuilderName(typeName) {
        typeName = getBuilderName(typeName);
        return typeName.replace(/(Expression)?$/, "Statement");
    }
    var namedTypes = {};
    // Like Object.keys, but aware of what fields each AST type should have.
    function getFieldNames(object) {
        var d = defFromValue(object);
        if (d) {
            return d.fieldNames.slice(0);
        }
        if ("type" in object) {
            throw new Error("did not recognize object of type " +
                JSON.stringify(object.type));
        }
        return Object.keys(object);
    }
    // Get the value of an object property, taking object.type and default
    // functions into account.
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
    // Iterate over all defined fields of an object, including those missing
    // or undefined, passing each field name and effective value (as returned
    // by getFieldValue) to the callback. If the object has no corresponding
    // Def, the callback will never be called.
    function eachField(object, callback, context) {
        getFieldNames(object).forEach(function (name) {
            callback.call(this, name, getFieldValue(object, name));
        }, context);
    }
    // Similar to eachField, except that iteration stops as soon as the
    // callback returns a truthy value. Like Array.prototype.some, the final
    // result is either true or false to indicates whether the callback
    // returned true for any element or not.
    function someField(object, callback, context) {
        return getFieldNames(object).some(function (name) {
            return callback.call(this, name, getFieldValue(object, name));
        }, context);
    }
    // Adds an additional builder for Expression subtypes
    // that wraps the built Expression in an ExpressionStatements.
    function wrapExpressionBuilderWithStatement(typeName) {
        var wrapperName = getStatementBuilderName(typeName);
        // skip if the builder already exists
        if (builders[wrapperName])
            return;
        // the builder function to wrap with builders.ExpressionStatement
        var wrapped = builders[getBuilderName(typeName)];
        // skip if there is nothing to wrap
        if (!wrapped)
            return;
        var builder = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return builders.expressionStatement(wrapped.apply(builders, args));
        };
        builder.from = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return builders.expressionStatement(wrapped.from.apply(builders, args));
        };
        builders[wrapperName] = builder;
    }
    function populateSupertypeList(typeName, list) {
        list.length = 0;
        list.push(typeName);
        var lastSeen = Object.create(null);
        for (var pos = 0; pos < list.length; ++pos) {
            typeName = list[pos];
            var d = defCache[typeName];
            if (d.finalized !== true) {
                throw new Error("");
            }
            // If we saw typeName earlier in the breadth-first traversal,
            // delete the last-seen occurrence.
            if (hasOwn.call(lastSeen, typeName)) {
                delete list[lastSeen[typeName]];
            }
            // Record the new index of the last-seen occurrence of typeName.
            lastSeen[typeName] = pos;
            // Enqueue the base names of this type.
            list.push.apply(list, d.baseNames);
        }
        // Compaction loop to remove array holes.
        for (var to = 0, from = to, len = list.length; from < len; ++from) {
            if (hasOwn.call(list, from)) {
                list[to++] = list[from];
            }
        }
        list.length = to;
    }
    function extend(into, from) {
        Object.keys(from).forEach(function (name) {
            into[name] = from[name];
        });
        return into;
    }
    function finalize() {
        Object.keys(defCache).forEach(function (name) {
            defCache[name].finalize();
        });
    }
    return {
        Type: Type,
        builtInTypes: builtInTypes,
        getSupertypeNames: getSupertypeNames,
        computeSupertypeLookupTable: computeSupertypeLookupTable,
        builders: builders,
        defineMethod: defineMethod,
        getBuilderName: getBuilderName,
        getStatementBuilderName: getStatementBuilderName,
        namedTypes: namedTypes,
        getFieldNames: getFieldNames,
        getFieldValue: getFieldValue,
        eachField: eachField,
        someField: someField,
        finalize: finalize,
    };
}
exports.default = typesPlugin;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=types.js.map