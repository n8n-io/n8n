(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.typeDetect = factory());
})(this, (function () { 'use strict';

    var promiseExists = typeof Promise === 'function';
    var globalObject = (function (Obj) {
        if (typeof globalThis === 'object') {
            return globalThis;
        }
        Object.defineProperty(Obj, 'typeDetectGlobalObject', {
            get: function get() {
                return this;
            },
            configurable: true,
        });
        var global = typeDetectGlobalObject;
        delete Obj.typeDetectGlobalObject;
        return global;
    })(Object.prototype);
    var symbolExists = typeof Symbol !== 'undefined';
    var mapExists = typeof Map !== 'undefined';
    var setExists = typeof Set !== 'undefined';
    var weakMapExists = typeof WeakMap !== 'undefined';
    var weakSetExists = typeof WeakSet !== 'undefined';
    var dataViewExists = typeof DataView !== 'undefined';
    var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
    var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
    var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
    var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
    var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
    var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
    var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
    var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
    var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
    var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
    var toStringLeftSliceLength = 8;
    var toStringRightSliceLength = -1;
    function typeDetect(obj) {
        var typeofObj = typeof obj;
        if (typeofObj !== 'object') {
            return typeofObj;
        }
        if (obj === null) {
            return 'null';
        }
        if (obj === globalObject) {
            return 'global';
        }
        if (Array.isArray(obj) &&
            (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))) {
            return 'Array';
        }
        if (typeof window === 'object' && window !== null) {
            if (typeof window.location === 'object' && obj === window.location) {
                return 'Location';
            }
            if (typeof window.document === 'object' && obj === window.document) {
                return 'Document';
            }
            if (typeof window.navigator === 'object') {
                if (typeof window.navigator.mimeTypes === 'object' &&
                    obj === window.navigator.mimeTypes) {
                    return 'MimeTypeArray';
                }
                if (typeof window.navigator.plugins === 'object' &&
                    obj === window.navigator.plugins) {
                    return 'PluginArray';
                }
            }
            if ((typeof window.HTMLElement === 'function' ||
                typeof window.HTMLElement === 'object') &&
                obj instanceof window.HTMLElement) {
                if (obj.tagName === 'BLOCKQUOTE') {
                    return 'HTMLQuoteElement';
                }
                if (obj.tagName === 'TD') {
                    return 'HTMLTableDataCellElement';
                }
                if (obj.tagName === 'TH') {
                    return 'HTMLTableHeaderCellElement';
                }
            }
        }
        var stringTag = (symbolToStringTagExists && obj[Symbol.toStringTag]);
        if (typeof stringTag === 'string') {
            return stringTag;
        }
        var objPrototype = Object.getPrototypeOf(obj);
        if (objPrototype === RegExp.prototype) {
            return 'RegExp';
        }
        if (objPrototype === Date.prototype) {
            return 'Date';
        }
        if (promiseExists && objPrototype === Promise.prototype) {
            return 'Promise';
        }
        if (setExists && objPrototype === Set.prototype) {
            return 'Set';
        }
        if (mapExists && objPrototype === Map.prototype) {
            return 'Map';
        }
        if (weakSetExists && objPrototype === WeakSet.prototype) {
            return 'WeakSet';
        }
        if (weakMapExists && objPrototype === WeakMap.prototype) {
            return 'WeakMap';
        }
        if (dataViewExists && objPrototype === DataView.prototype) {
            return 'DataView';
        }
        if (mapExists && objPrototype === mapIteratorPrototype) {
            return 'Map Iterator';
        }
        if (setExists && objPrototype === setIteratorPrototype) {
            return 'Set Iterator';
        }
        if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
            return 'Array Iterator';
        }
        if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
            return 'String Iterator';
        }
        if (objPrototype === null) {
            return 'Object';
        }
        return Object
            .prototype
            .toString
            .call(obj)
            .slice(toStringLeftSliceLength, toStringRightSliceLength);
    }

    return typeDetect;

}));
