"use strict";

/* @minVersion 7.24.0 */

function toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) {
        return input;
    }

    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
        var res = prim.call(input, hint || "default");
        if (typeof res !== "object") {
            return res;
        }
        throw new TypeError("@@toPrimitive must return a primitive value.");
    }

    return (hint === "string" ? String : Number)(input);
}

function toPropertyKey(arg) {
    var key = toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
}

function checkInRHS(value) {
    if (Object(value) !== value) {
        throw TypeError("right-hand side of 'in' should be an object, got " + (value !== null ? typeof value : "null"));
    }

    return value;
}

function setFunctionName(fn, name, prefix) {
    if (typeof name === "symbol") {
        name = name.description;
        name = name ? "[" + name + "]" : "";
    }

    try {
        Object.defineProperty(fn, "name", { configurable: true, value: prefix ? prefix + " " + name : name });
    } catch (_) {}

    return fn;
}

/**
  kind bit layout

  FIELD = 0
  ACCESSOR = 1
  METHOD = 2
  GETTER = 3
  SETTER = 4
  CLASS = 5

  STATIC = 8
  DECORATORS_HAVE_THIS = 16
*/
function _apply_decs_2311(targetClass, classDecs, memberDecs, classDecsHaveThis, instanceBrand, parentClass) {
    var symbolMetadata = Symbol.metadata || Symbol.for("Symbol.metadata");
    var defineProperty = Object.defineProperty;
    var create = Object.create;
    var metadata;
    var existingNonFields = [create(null), create(null)];
    var hasClassDecs = classDecs.length;
    var _;

    function createRunInitializers(initializers, useStaticThis, hasValue) {
        return function(thisArg, value) {
            if (useStaticThis) {
                value = thisArg;
                thisArg = targetClass;
            }

            for (var i = 0; i < initializers.length; i++) value = initializers[i].apply(thisArg, hasValue ? [value] : []);

            return hasValue ? value : thisArg;
        };
    }

    function assertCallable(fn, hint1, hint2, throwUndefined) {
        if (typeof fn !== "function") {
            if (throwUndefined || fn !== void 0) {
                throw new TypeError(hint1 + " must " + (hint2 || "be") + " a function" + (throwUndefined ? "" : " or undefined"));
            }
        }

        return fn;
    }

    function applyDec(Class, decInfo, decoratorsHaveThis, name, kind, initializers, ret, isStatic, isPrivate, isField, hasPrivateBrand) {
        function assertInstanceIfPrivate(target) {
            if (!hasPrivateBrand(target)) {
                throw new TypeError("Attempted to access private element on non-instance");
            }
        }

        var decs = [].concat(decInfo[0]);
        var decVal = decInfo[3];
        var isClass = !ret;

        var isAccessor = kind === 1;
        var isGetter = kind === 3;
        var isSetter = kind === 4;
        var isMethod = kind === 2;

        function bindPropCall(name, useStaticThis, before) {
            return function(_this, value) {
                if (useStaticThis) {
                    value = _this;
                    _this = Class;
                }

                if (before) {
                    before(_this);
                }

                return desc[name].call(_this, value);
            };
        }

        var desc = {};
        var init = [];
        var key = isGetter ? "get" : isSetter || isAccessor ? "set" : "value";

        if (!isClass) {
            if (isPrivate) {
                if (isField || isAccessor) {
                    desc = {
                        get: setFunctionName(
                            function() {
                                return decVal(this);
                            },
                            name,
                            "get"
                        ),
                        set: function(value) {
                            decInfo[4](this, value);
                        }
                    };
                } else {
                    desc[key] = decVal;
                }

                if (!isField) {
                    setFunctionName(desc[key], name, isMethod ? "" : key);
                }
            } else if (!isField) {
                desc = Object.getOwnPropertyDescriptor(Class, name);
            }

            if (!isField && !isPrivate) {
                _ = existingNonFields[+isStatic][name];
                if (_ && (_ ^ kind) !== 7) {
                    throw new Error("Decorating two elements with the same name (" + desc[key].name + ") is not supported yet");
                }

                existingNonFields[+isStatic][name] = kind < 3 ? 1 : kind;
            }
        }

        var newValue = Class;

        for (var i = decs.length - 1; i >= 0; i -= decoratorsHaveThis ? 2 : 1) {
            var dec = assertCallable(decs[i], "A decorator", "be", true);
            var decThis = decoratorsHaveThis ? decs[i - 1] : void 0;

            var decoratorFinishedRef = {};
            var ctx = {
                kind: ["field", "accessor", "method", "getter", "setter", "class"][kind],
                name: name,
                metadata: metadata,
                addInitializer: function(decoratorFinishedRef, initializer) {
                    if (decoratorFinishedRef.v) {
                        throw new TypeError("attempted to call addInitializer after decoration was finished");
                    }
                    assertCallable(initializer, "An initializer", "be", true);
                    initializers.push(initializer);
                }
                    .bind(null, decoratorFinishedRef)
            };

            if (isClass) {
                _ = dec.call(decThis, newValue, ctx);
                decoratorFinishedRef.v = 1;

                if (assertCallable(_, "class decorators", "return")) {
                    newValue = _;
                }
                continue;
            }

            ctx.static = isStatic;
            ctx.private = isPrivate;
            _ = ctx.access = {
                has: isPrivate ? hasPrivateBrand.bind() : function(target) {
                    return name in target;
                }
            };

            if (!isSetter) {
                _.get = isPrivate
                    ? isMethod
                        ? function(_this) {
                            assertInstanceIfPrivate(_this);
                            return desc.value;
                        }
                        : bindPropCall("get", 0, assertInstanceIfPrivate)
                    : function(target) {
                        return target[name];
                    };
            }

            if (!isMethod && !isGetter) {
                _.set = isPrivate ? bindPropCall("set", 0, assertInstanceIfPrivate) : function(target, value) {
                    target[name] = value;
                };
            }

            newValue = dec.call(decThis, isAccessor ? { get: desc.get, set: desc.set } : desc[key], ctx);

            decoratorFinishedRef.v = 1;

            if (isAccessor) {
                if (typeof newValue === "object" && newValue) {
                    if ((_ = assertCallable(newValue.get, "accessor.get"))) {
                        desc.get = _;
                    }
                    if ((_ = assertCallable(newValue.set, "accessor.set"))) {
                        desc.set = _;
                    }
                    if ((_ = assertCallable(newValue.init, "accessor.init"))) {
                        init.unshift(_);
                    }
                } else if (newValue !== void 0) {
                    throw new TypeError("accessor decorators must return an object with get, set, or init properties or undefined");
                }
            } else if (assertCallable(newValue, (isField ? "field" : "method") + " decorators", "return")) {
                if (isField) {
                    init.unshift(newValue);
                } else {
                    desc[key] = newValue;
                }
            }
        }

        if (kind < 2) {
            ret.push(createRunInitializers(init, isStatic, 1), createRunInitializers(initializers, isStatic, 0));
        }

        if (!isField && !isClass) {
            if (isPrivate) {
                if (isAccessor) {
                    ret.splice(-1, 0, bindPropCall("get", isStatic), bindPropCall("set", isStatic));
                } else {
                    ret.push(isMethod ? desc[key] : assertCallable.call.bind(desc[key]));
                }
            } else {
                defineProperty(Class, name, desc);
            }
        }

        return newValue;
    }

    function applyMemberDecs() {
        var ret = [];
        var protoInitializers;
        var staticInitializers;

        var pushInitializers = function(initializers) {
            if (initializers) {
                ret.push(createRunInitializers(initializers));
            }
        };

        var applyMemberDecsOfKind = function(isStatic, isField) {
            for (var i = 0; i < memberDecs.length; i++) {
                var decInfo = memberDecs[i];
                var kind = decInfo[1];
                var kindOnly = kind & 7;

                if ((kind & 8) == isStatic && !kindOnly == isField) {
                    var name = decInfo[2];
                    var isPrivate = !!decInfo[3];
                    var decoratorsHaveThis = kind & 16;

                    applyDec(
                        isStatic ? targetClass : targetClass.prototype,
                        decInfo,
                        decoratorsHaveThis,
                        isPrivate ? "#" + name : toPropertyKey(name),
                        kindOnly,
                        kindOnly < 2 ? [] : isStatic ? (staticInitializers = staticInitializers || []) : (protoInitializers = protoInitializers || []),
                        ret,
                        !!isStatic,
                        isPrivate,
                        isField,
                        isStatic && isPrivate
                            ? function(_) {
                                return checkInRHS(_) === targetClass;
                            }
                            : instanceBrand
                    );
                }
            }
        };

        applyMemberDecsOfKind(8, 0);
        applyMemberDecsOfKind(0, 0);
        applyMemberDecsOfKind(8, 1);
        applyMemberDecsOfKind(0, 1);

        pushInitializers(protoInitializers);
        pushInitializers(staticInitializers);

        return ret;
    }

    function defineMetadata(Class) {
        return defineProperty(Class, symbolMetadata, { configurable: true, enumerable: true, value: metadata });
    }

    if (parentClass !== undefined) {
        metadata = parentClass[symbolMetadata];
    }
    metadata = create(metadata == null ? null : metadata);

    _ = applyMemberDecs();

    if (!hasClassDecs) {
        defineMetadata(targetClass);
    }

    return {
        e: _,
        get c() {
            var initializers = [];
            return (hasClassDecs && [defineMetadata(targetClass = applyDec(targetClass, [classDecs], classDecsHaveThis, targetClass.name, 5, initializers)), createRunInitializers(initializers, 1)]);
        }
    };
}

exports._ = _apply_decs_2311;
