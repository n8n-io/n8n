"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapNativeSuper = void 0;
//@ts-ignore
function wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;
    //@ts-ignore
    exports.wrapNativeSuper = wrapNativeSuper = function wrapNativeSuper(Class) {
        if (Class === null || !_isNativeFunction(Class))
            return Class;
        if (typeof Class !== "function") {
            throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
            if (_cache.has(Class))
                return _cache.get(Class);
            _cache.set(Class, Wrapper);
        }
        function Wrapper() {
            //@ts-ignore
            return _construct(Class, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class.prototype, {
            constructor: {
                value: Wrapper,
                enumerable: false,
                writable: true,
                configurable: true,
            },
        });
        return _setPrototypeOf(Wrapper, Class);
    };
    return wrapNativeSuper(Class);
}
exports.wrapNativeSuper = wrapNativeSuper;
function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct)
        return false;
    //@ts-ignore
    if (Reflect.construct.sham)
        return false;
    if (typeof Proxy === "function")
        return true;
    try {
        Date.prototype.toString.call(Reflect.construct(Date, [], function () { }));
        return true;
    }
    catch (e) {
        return false;
    }
}
//@ts-ignore
function _construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
        //@ts-ignore
        _construct = Reflect.construct;
    }
    else {
        //@ts-ignore
        _construct = function _construct(Parent, args, Class) {
            var a = [null];
            a.push.apply(a, args);
            //@ts-ignore
            var Constructor = Function.bind.apply(Parent, a);
            //@ts-ignore
            var instance = new Constructor();
            if (Class)
                _setPrototypeOf(instance, Class.prototype);
            return instance;
        };
    }
    //@ts-ignore
    return _construct.apply(null, arguments);
}
function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
//@ts-ignore
function _setPrototypeOf(o, p) {
    //@ts-ignore
    _setPrototypeOf =
        Object.setPrototypeOf ||
            //@ts-ignore
            function _setPrototypeOf(o, p) {
                o.__proto__ = p;
                return o;
            };
    return _setPrototypeOf(o, p);
}
//@ts-ignore
function _getPrototypeOf(o) {
    //@ts-ignore
    _getPrototypeOf = Object.setPrototypeOf
        ? Object.getPrototypeOf
        : function _getPrototypeOf(
        //@ts-ignore
        o) {
            return o.__proto__ || Object.getPrototypeOf(o);
        };
    return _getPrototypeOf(o);
}
module.exports = {
    wrapNativeSuper,
};
