
/**
 * @vue/test-utils v2.4.6
 * (c) 2024 Lachlan Miller
 * Released under the MIT License
 */

var VueTestUtils = (function (exports, Vue, compilerDom, serverRenderer) {
    'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var Vue__namespace = /*#__PURE__*/_interopNamespaceDefault(Vue);

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    var Pluggable = /** @class */ (function () {
        function Pluggable() {
            this.installedPlugins = [];
        }
        Pluggable.prototype.install = function (handler, options) {
            if (typeof handler !== 'function') {
                console.error('plugin.install must receive a function');
                handler = function () { return ({}); };
            }
            this.installedPlugins.push({ handler: handler, options: options });
        };
        Pluggable.prototype.extend = function (instance) {
            var invokeSetup = function (_a) {
                var handler = _a.handler, options = _a.options;
                return handler(instance, options); // invoke the setup method passed to install
            };
            var bindProperty = function (_a) {
                var property = _a[0], value = _a[1];
                instance[property] =
                    typeof value === 'function' ? value.bind(instance) : value;
            };
            var addAllPropertiesFromSetup = function (setupResult) {
                setupResult = typeof setupResult === 'object' ? setupResult : {};
                Object.entries(setupResult).forEach(bindProperty);
            };
            this.installedPlugins.map(invokeSetup).forEach(addAllPropertiesFromSetup);
        };
        /** For testing */
        Pluggable.prototype.reset = function () {
            this.installedPlugins = [];
        };
        return Pluggable;
    }());
    var config = {
        global: {
            stubs: {
                transition: true,
                'transition-group': true
            },
            provide: {},
            components: {},
            config: {},
            directives: {},
            mixins: [],
            mocks: {},
            plugins: [],
            renderStubDefaultSlot: false
        },
        plugins: {
            VueWrapper: new Pluggable(),
            DOMWrapper: new Pluggable()
        }
    };

    function mergeStubs(target, source) {
        if (source.stubs) {
            if (Array.isArray(source.stubs)) {
                source.stubs.forEach(function (x) { return (target[x] = true); });
            }
            else {
                for (var _i = 0, _a = Object.entries(source.stubs); _i < _a.length; _i++) {
                    var _b = _a[_i], k = _b[0], v = _b[1];
                    target[k] = v;
                }
            }
        }
    }
    // perform 1-level-deep-pseudo-clone merge in order to prevent config leaks
    // example: vue-router overwrites globalProperties.$router
    function mergeAppConfig(configGlobalConfig, mountGlobalConfig) {
        return __assign(__assign(__assign({}, configGlobalConfig), mountGlobalConfig), { globalProperties: __assign(__assign({}, configGlobalConfig === null || configGlobalConfig === void 0 ? void 0 : configGlobalConfig.globalProperties), mountGlobalConfig === null || mountGlobalConfig === void 0 ? void 0 : mountGlobalConfig.globalProperties) });
    }
    function mergeGlobalProperties(mountGlobal) {
        var _a, _b, _c;
        if (mountGlobal === void 0) { mountGlobal = {}; }
        var stubs = {};
        var configGlobal = (_a = config === null || config === void 0 ? void 0 : config.global) !== null && _a !== void 0 ? _a : {};
        mergeStubs(stubs, configGlobal);
        mergeStubs(stubs, mountGlobal);
        var renderStubDefaultSlot = (_c = (_b = mountGlobal.renderStubDefaultSlot) !== null && _b !== void 0 ? _b : (configGlobal.renderStubDefaultSlot || (config === null || config === void 0 ? void 0 : config.renderStubDefaultSlot))) !== null && _c !== void 0 ? _c : false;
        if (config.renderStubDefaultSlot === true) {
            console.warn('config.renderStubDefaultSlot is deprecated, use config.global.renderStubDefaultSlot instead');
        }
        return {
            mixins: __spreadArray(__spreadArray([], (configGlobal.mixins || []), true), (mountGlobal.mixins || []), true),
            plugins: __spreadArray(__spreadArray([], (configGlobal.plugins || []), true), (mountGlobal.plugins || []), true),
            stubs: stubs,
            components: __assign(__assign({}, configGlobal.components), mountGlobal.components),
            provide: __assign(__assign({}, configGlobal.provide), mountGlobal.provide),
            mocks: __assign(__assign({}, configGlobal.mocks), mountGlobal.mocks),
            config: mergeAppConfig(configGlobal.config, mountGlobal.config),
            directives: __assign(__assign({}, configGlobal.directives), mountGlobal.directives),
            renderStubDefaultSlot: renderStubDefaultSlot
        };
    }
    var isObject = function (obj) {
        return !!obj && typeof obj === 'object';
    };
    function isClass(obj) {
        if (!(obj instanceof Object))
            return;
        var isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === 'class';
        if (!('prototype' in obj)) {
            return isCtorClass;
        }
        var prototype = obj.prototype;
        var isPrototypeCtorClass = prototype.constructor &&
            prototype.constructor.toString &&
            prototype.constructor.toString().substring(0, 5) === 'class';
        return isCtorClass || isPrototypeCtorClass;
    }
    // https://stackoverflow.com/a/48218209
    var mergeDeep = function (target, source) {
        var _a;
        if (!isObject(target) || !isObject(source)) {
            return source;
        }
        Object.keys(source)
            .concat(isClass(source)
            ? Object.getOwnPropertyNames((_a = Object.getPrototypeOf(source)) !== null && _a !== void 0 ? _a : {})
            : Object.getOwnPropertyNames(source))
            .forEach(function (key) {
            var targetValue = target[key];
            var sourceValue = source[key];
            if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                target[key] = sourceValue;
            }
            else if (sourceValue instanceof Date) {
                target[key] = sourceValue;
            }
            else if (isObject(targetValue) && isObject(sourceValue)) {
                target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
            }
            else {
                target[key] = sourceValue;
            }
        });
        return target;
    };
    function isClassComponent(component) {
        return typeof component === 'function' && '__vccOpts' in component;
    }
    function isComponent(component) {
        return Boolean(component &&
            (typeof component === 'object' || typeof component === 'function'));
    }
    function isFunctionalComponent(component) {
        return typeof component === 'function' && !isClassComponent(component);
    }
    function isObjectComponent(component) {
        return Boolean(component && typeof component === 'object');
    }
    function textContent(element) {
        var _a, _b;
        // we check if the element is a comment first
        // to return an empty string in that case, instead of the comment content
        return element.nodeType !== Node.COMMENT_NODE
            ? (_b = (_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''
            : '';
    }
    function hasOwnProperty(obj, prop) {
        return obj.hasOwnProperty(prop);
    }
    function isNotNullOrUndefined(obj) {
        return Boolean(obj);
    }
    function isRefSelector(selector) {
        return typeof selector === 'object' && 'ref' in selector;
    }
    function convertStubsToRecord(stubs) {
        if (Array.isArray(stubs)) {
            // ['Foo', 'Bar'] => { Foo: true, Bar: true }
            return stubs.reduce(function (acc, current) {
                acc[current] = true;
                return acc;
            }, {});
        }
        return stubs;
    }
    var isDirectiveKey = function (key) { return key.match(/^v[A-Z].*/); };
    function getComponentsFromStubs(stubs) {
        var normalizedStubs = convertStubsToRecord(stubs);
        return Object.fromEntries(Object.entries(normalizedStubs).filter(function (_a) {
            var key = _a[0];
            return !isDirectiveKey(key);
        }));
    }
    function getDirectivesFromStubs(stubs) {
        var normalizedStubs = convertStubsToRecord(stubs);
        return Object.fromEntries(Object.entries(normalizedStubs)
            .filter(function (_a) {
            var key = _a[0], value = _a[1];
            return isDirectiveKey(key) && value !== false;
        })
            .map(function (_a) {
            var key = _a[0], value = _a[1];
            return [key.substring(1), value];
        }));
    }
    function hasSetupState(vm) {
        return (vm &&
            vm.$.devtoolsRawSetupState);
    }
    function isScriptSetup(vm) {
        return (vm && vm.$.setupState.__isScriptSetup);
    }
    var _globalThis;
    var getGlobalThis = function () {
        return (_globalThis ||
            (_globalThis =
                typeof globalThis !== 'undefined'
                    ? globalThis
                    : typeof self !== 'undefined'
                        ? self
                        : typeof window !== 'undefined'
                            ? window
                            : typeof global !== 'undefined'
                                ? global
                                : {}));
    };

    var ignorableKeyModifiers = [
        'stop',
        'prevent',
        'self',
        'exact',
        'prevent',
        'capture'
    ];
    var systemKeyModifiers = ['ctrl', 'shift', 'alt', 'meta'];
    var mouseKeyModifiers = ['left', 'middle', 'right'];
    var keyCodesByKeyName = {
        backspace: 8,
        tab: 9,
        enter: 13,
        esc: 27,
        space: 32,
        pageup: 33,
        pagedown: 34,
        end: 35,
        home: 36,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        insert: 45,
        delete: 46
    };
    var domEvents = {
        abort: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        afterprint: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        animationend: {
            eventInterface: 'AnimationEvent',
            bubbles: true,
            cancelable: false
        },
        animationiteration: {
            eventInterface: 'AnimationEvent',
            bubbles: true,
            cancelable: false
        },
        animationstart: {
            eventInterface: 'AnimationEvent',
            bubbles: true,
            cancelable: false
        },
        appinstalled: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        /**
         * @deprecated
         */
        audioprocess: {
            eventInterface: 'AudioProcessingEvent',
            bubbles: false,
            cancelable: false
        },
        audioend: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        audiostart: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        beforeprint: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        beforeunload: {
            eventInterface: 'BeforeUnloadEvent',
            bubbles: false,
            cancelable: true
        },
        beginEvent: {
            eventInterface: 'TimeEvent',
            bubbles: false,
            cancelable: false
        },
        blur: {
            eventInterface: 'FocusEvent',
            bubbles: false,
            cancelable: false
        },
        boundary: {
            eventInterface: 'SpeechSynthesisEvent',
            bubbles: false,
            cancelable: false
        },
        cached: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        canplay: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        canplaythrough: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        change: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        chargingchange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        chargingtimechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        checking: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        click: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        close: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        complete: {
            eventInterface: 'OfflineAudioCompletionEvent',
            bubbles: false,
            cancelable: false
        },
        compositionend: {
            eventInterface: 'CompositionEvent',
            bubbles: true,
            cancelable: true
        },
        compositionstart: {
            eventInterface: 'CompositionEvent',
            bubbles: true,
            cancelable: true
        },
        compositionupdate: {
            eventInterface: 'CompositionEvent',
            bubbles: true,
            cancelable: false
        },
        contextmenu: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        copy: {
            eventInterface: 'ClipboardEvent',
            bubbles: true,
            cancelable: true
        },
        cut: {
            eventInterface: 'ClipboardEvent',
            bubbles: true,
            cancelable: true
        },
        dblclick: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        devicechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        devicelight: {
            eventInterface: 'DeviceLightEvent',
            bubbles: false,
            cancelable: false
        },
        devicemotion: {
            eventInterface: 'DeviceMotionEvent',
            bubbles: false,
            cancelable: false
        },
        deviceorientation: {
            eventInterface: 'DeviceOrientationEvent',
            bubbles: false,
            cancelable: false
        },
        deviceproximity: {
            eventInterface: 'DeviceProximityEvent',
            bubbles: false,
            cancelable: false
        },
        dischargingtimechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        DOMActivate: {
            eventInterface: 'UIEvent',
            bubbles: true,
            cancelable: true
        },
        DOMAttributeNameChanged: {
            eventInterface: 'MutationNameEvent',
            bubbles: true,
            cancelable: true
        },
        DOMAttrModified: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        DOMCharacterDataModified: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        DOMContentLoaded: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: true
        },
        DOMElementNameChanged: {
            eventInterface: 'MutationNameEvent',
            bubbles: true,
            cancelable: true
        },
        DOMFocusIn: {
            eventInterface: 'FocusEvent',
            bubbles: true,
            cancelable: true
        },
        DOMFocusOut: {
            eventInterface: 'FocusEvent',
            bubbles: true,
            cancelable: true
        },
        DOMNodeInserted: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        DOMNodeInsertedIntoDocument: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        DOMNodeRemoved: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        DOMNodeRemovedFromDocument: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: true
        },
        /**
         * @deprecated
         */
        DOMSubtreeModified: {
            eventInterface: 'MutationEvent',
            bubbles: true,
            cancelable: false
        },
        downloading: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        drag: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: true
        },
        dragend: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: false
        },
        dragenter: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: true
        },
        dragleave: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: false
        },
        dragover: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: true
        },
        dragstart: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: true
        },
        drop: {
            eventInterface: 'DragEvent',
            bubbles: true,
            cancelable: true
        },
        durationchange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        emptied: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        end: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        ended: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        endEvent: {
            eventInterface: 'TimeEvent',
            bubbles: false,
            cancelable: false
        },
        error: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        focus: {
            eventInterface: 'FocusEvent',
            bubbles: false,
            cancelable: false
        },
        focusin: {
            eventInterface: 'FocusEvent',
            bubbles: true,
            cancelable: false
        },
        focusout: {
            eventInterface: 'FocusEvent',
            bubbles: true,
            cancelable: false
        },
        fullscreenchange: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        fullscreenerror: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        gamepadconnected: {
            eventInterface: 'GamepadEvent',
            bubbles: false,
            cancelable: false
        },
        gamepaddisconnected: {
            eventInterface: 'GamepadEvent',
            bubbles: false,
            cancelable: false
        },
        gotpointercapture: {
            eventInterface: 'PointerEvent',
            bubbles: false,
            cancelable: false
        },
        hashchange: {
            eventInterface: 'HashChangeEvent',
            bubbles: true,
            cancelable: false
        },
        lostpointercapture: {
            eventInterface: 'PointerEvent',
            bubbles: false,
            cancelable: false
        },
        input: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        invalid: {
            eventInterface: 'Event',
            cancelable: true,
            bubbles: false
        },
        keydown: {
            eventInterface: 'KeyboardEvent',
            bubbles: true,
            cancelable: true
        },
        keypress: {
            eventInterface: 'KeyboardEvent',
            bubbles: true,
            cancelable: true
        },
        keyup: {
            eventInterface: 'KeyboardEvent',
            bubbles: true,
            cancelable: true
        },
        languagechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        levelchange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        load: {
            eventInterface: 'UIEvent',
            bubbles: false,
            cancelable: false
        },
        loadeddata: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        loadedmetadata: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        loadend: {
            eventInterface: 'ProgressEvent',
            bubbles: false,
            cancelable: false
        },
        loadstart: {
            eventInterface: 'ProgressEvent',
            bubbles: false,
            cancelable: false
        },
        mark: {
            eventInterface: 'SpeechSynthesisEvent',
            bubbles: false,
            cancelable: false
        },
        message: {
            eventInterface: 'MessageEvent',
            bubbles: false,
            cancelable: false
        },
        messageerror: {
            eventInterface: 'MessageEvent',
            bubbles: false,
            cancelable: false
        },
        mousedown: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        mouseenter: {
            eventInterface: 'MouseEvent',
            bubbles: false,
            cancelable: false
        },
        mouseleave: {
            eventInterface: 'MouseEvent',
            bubbles: false,
            cancelable: false
        },
        mousemove: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        mouseout: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        mouseover: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        mouseup: {
            eventInterface: 'MouseEvent',
            bubbles: true,
            cancelable: true
        },
        nomatch: {
            eventInterface: 'SpeechRecognitionEvent',
            bubbles: false,
            cancelable: false
        },
        notificationclick: {
            eventInterface: 'NotificationEvent',
            bubbles: false,
            cancelable: false
        },
        noupdate: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        obsolete: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        offline: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        online: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        open: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        orientationchange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        pagehide: {
            eventInterface: 'PageTransitionEvent',
            bubbles: false,
            cancelable: false
        },
        pageshow: {
            eventInterface: 'PageTransitionEvent',
            bubbles: false,
            cancelable: false
        },
        paste: {
            eventInterface: 'ClipboardEvent',
            bubbles: true,
            cancelable: true
        },
        pause: {
            eventInterface: 'SpeechSynthesisEvent',
            bubbles: false,
            cancelable: false
        },
        pointercancel: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: false
        },
        pointerdown: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: true
        },
        pointerenter: {
            eventInterface: 'PointerEvent',
            bubbles: false,
            cancelable: false
        },
        pointerleave: {
            eventInterface: 'PointerEvent',
            bubbles: false,
            cancelable: false
        },
        pointerlockchange: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        pointerlockerror: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        pointermove: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: true
        },
        pointerout: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: true
        },
        pointerover: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: true
        },
        pointerup: {
            eventInterface: 'PointerEvent',
            bubbles: true,
            cancelable: true
        },
        play: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        playing: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        popstate: {
            eventInterface: 'PopStateEvent',
            bubbles: true,
            cancelable: false
        },
        progress: {
            eventInterface: 'ProgressEvent',
            bubbles: false,
            cancelable: false
        },
        push: {
            eventInterface: 'PushEvent',
            bubbles: false,
            cancelable: false
        },
        pushsubscriptionchange: {
            eventInterface: 'PushEvent',
            bubbles: false,
            cancelable: false
        },
        ratechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        readystatechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        repeatEvent: {
            eventInterface: 'TimeEvent',
            bubbles: false,
            cancelable: false
        },
        reset: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: true
        },
        resize: {
            eventInterface: 'UIEvent',
            bubbles: false,
            cancelable: false
        },
        resourcetimingbufferfull: {
            eventInterface: 'Performance',
            bubbles: true,
            cancelable: true
        },
        result: {
            eventInterface: 'SpeechRecognitionEvent',
            bubbles: false,
            cancelable: false
        },
        resume: {
            eventInterface: 'SpeechSynthesisEvent',
            bubbles: false,
            cancelable: false
        },
        scroll: {
            eventInterface: 'UIEvent',
            bubbles: false,
            cancelable: false
        },
        seeked: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        seeking: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        select: {
            eventInterface: 'UIEvent',
            bubbles: true,
            cancelable: false
        },
        selectstart: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: true
        },
        selectionchange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        show: {
            eventInterface: 'MouseEvent',
            bubbles: false,
            cancelable: false
        },
        slotchange: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        soundend: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        soundstart: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        speechend: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        speechstart: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        stalled: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        start: {
            eventInterface: 'SpeechSynthesisEvent',
            bubbles: false,
            cancelable: false
        },
        storage: {
            eventInterface: 'StorageEvent',
            bubbles: false,
            cancelable: false
        },
        submit: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: true
        },
        success: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        suspend: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        SVGAbort: {
            eventInterface: 'SVGEvent',
            bubbles: true,
            cancelable: false
        },
        SVGError: {
            eventInterface: 'SVGEvent',
            bubbles: true,
            cancelable: false
        },
        SVGLoad: {
            eventInterface: 'SVGEvent',
            bubbles: false,
            cancelable: false
        },
        SVGResize: {
            eventInterface: 'SVGEvent',
            bubbles: true,
            cancelable: false
        },
        SVGScroll: {
            eventInterface: 'SVGEvent',
            bubbles: true,
            cancelable: false
        },
        SVGUnload: {
            eventInterface: 'SVGEvent',
            bubbles: false,
            cancelable: false
        },
        SVGZoom: {
            eventInterface: 'SVGZoomEvent',
            bubbles: true,
            cancelable: false
        },
        timeout: {
            eventInterface: 'ProgressEvent',
            bubbles: false,
            cancelable: false
        },
        timeupdate: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        touchcancel: {
            eventInterface: 'TouchEvent',
            bubbles: true,
            cancelable: false
        },
        touchend: {
            eventInterface: 'TouchEvent',
            bubbles: true,
            cancelable: true
        },
        touchmove: {
            eventInterface: 'TouchEvent',
            bubbles: true,
            cancelable: true
        },
        touchstart: {
            eventInterface: 'TouchEvent',
            bubbles: true,
            cancelable: true
        },
        transitionend: {
            eventInterface: 'TransitionEvent',
            bubbles: true,
            cancelable: true
        },
        unload: {
            eventInterface: 'UIEvent',
            bubbles: false,
            cancelable: false
        },
        updateready: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        userproximity: {
            eventInterface: 'UserProximityEvent',
            bubbles: false,
            cancelable: false
        },
        voiceschanged: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        visibilitychange: {
            eventInterface: 'Event',
            bubbles: true,
            cancelable: false
        },
        volumechange: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        waiting: {
            eventInterface: 'Event',
            bubbles: false,
            cancelable: false
        },
        wheel: {
            eventInterface: 'WheelEvent',
            bubbles: true,
            cancelable: true
        }
    };

    /**
     * Groups modifiers into lists
     */
    function generateModifiers(modifiers, isOnClick) {
        var keyModifiers = [];
        var systemModifiers = [];
        for (var i = 0; i < modifiers.length; i++) {
            var modifier = modifiers[i];
            // addEventListener() options, e.g. .passive & .capture, that we dont need to handle
            if (ignorableKeyModifiers.includes(modifier)) {
                continue;
            }
            // modifiers that require special conversion
            // if passed a left/right key modifier with onClick, add it here as well.
            if (systemKeyModifiers.includes(modifier) ||
                (mouseKeyModifiers.includes(modifier) &&
                    isOnClick)) {
                systemModifiers.push(modifier);
            }
            else {
                keyModifiers.push(modifier);
            }
        }
        return {
            keyModifiers: keyModifiers,
            systemModifiers: systemModifiers
        };
    }
    function getEventProperties(eventParams) {
        var modifiers = eventParams.modifiers, _a = eventParams.options, options = _a === void 0 ? {} : _a, eventType = eventParams.eventType;
        var isOnClick = eventType === 'click';
        var _b = generateModifiers(modifiers, isOnClick), keyModifiers = _b.keyModifiers, systemModifiers = _b.systemModifiers;
        if (isOnClick) {
            // if it's a right click, it should fire a `contextmenu` event
            if (systemModifiers.includes('right')) {
                eventType = 'contextmenu';
                options.button = 2;
                // if its a middle click, fire a `mouseup` event
            }
            else if (systemModifiers.includes('middle')) {
                eventType = 'mouseup';
                options.button = 1;
            }
        }
        var meta = domEvents[eventType] || {
            eventInterface: 'Event',
            cancelable: true,
            bubbles: true
        };
        // convert `shift, ctrl` to `shiftKey, ctrlKey`
        // allows trigger('keydown.shift.ctrl.n') directly
        var systemModifiersMeta = systemModifiers.reduce(function (all, key) {
            all["".concat(key, "Key")] = true;
            return all;
        }, {});
        // get the keyCode for backwards compat
        var keyCode = keyCodesByKeyName[keyModifiers[0]] ||
            (options && (options.keyCode || options.code));
        var eventProperties = __assign(__assign(__assign(__assign({}, systemModifiersMeta), options), { bubbles: meta.bubbles, cancelable: meta.cancelable, 
            // Any derived options should go here
            keyCode: keyCode, code: keyCode }), (keyModifiers[0] ? { key: keyModifiers[0] } : {}));
        return {
            eventProperties: eventProperties,
            meta: meta,
            eventType: eventType
        };
    }
    function createEvent(eventParams) {
        var _a = getEventProperties(eventParams), eventProperties = _a.eventProperties, meta = _a.meta, eventType = _a.eventType;
        // user defined eventInterface
        var eventInterface = meta.eventInterface;
        var metaEventInterface = window[eventInterface];
        var SupportedEventInterface = typeof metaEventInterface === 'function' ? metaEventInterface : window.Event;
        return new SupportedEventInterface(eventType, 
        // event properties can only be added when the event is instantiated
        // custom properties must be added after the event has been instantiated
        eventProperties);
    }
    function createDOMEvent(eventString, options) {
        // split eventString like `keydown.ctrl.shift` into `keydown` and array of modifiers
        var _a = eventString.split('.'), eventType = _a[0], modifiers = _a.slice(1);
        var eventParams = {
            eventType: eventType,
            modifiers: modifiers,
            options: options
        };
        var event = createEvent(eventParams);
        var eventPrototype = Object.getPrototypeOf(event);
        // attach custom options to the event, like `relatedTarget` and so on.
        options &&
            Object.keys(options).forEach(function (key) {
                var propertyDescriptor = Object.getOwnPropertyDescriptor(eventPrototype, key);
                var canSetProperty = !(propertyDescriptor && propertyDescriptor.set === undefined);
                if (canSetProperty) {
                    event[key] = options[key];
                }
            });
        return event;
    }

    // Stubbing occurs when in vnode transformer we're swapping
    // component vnode type due to stubbing either component
    // or directive on component
    // In order to be able to find components we need to track pairs
    // stub --> original component
    // Having this as global might feel unsafe at first point
    // One can assume that sharing stub map across mounts might
    // lead to false matches, however our vnode mappers always
    // produce new nodeTypes for each mount even if you're reusing
    // same stub, so we're safe and do not need to pass these stubs
    // for each mount operation
    var stubs = new WeakMap();
    function registerStub(_a) {
        var source = _a.source, stub = _a.stub;
        stubs.set(stub, source);
    }
    function getOriginalComponentFromStub(stub) {
        return stubs.get(stub);
    }

    var cacheStringFunction = function (fn) {
        var cache = Object.create(null);
        return (function (str) {
            var hit = cache[str];
            return hit || (cache[str] = fn(str));
        });
    };
    var camelizeRE = /-(\w)/g;
    var camelize = cacheStringFunction(function (str) {
        return str.replace(camelizeRE, function (_, c) { return (c ? c.toUpperCase() : ''); });
    });
    var capitalize = cacheStringFunction(function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    });
    var hyphenateRE = /\B([A-Z])/g;
    var hyphenate = cacheStringFunction(function (str) {
        return str.replace(hyphenateRE, '-$1').toLowerCase();
    });

    function matchName(target, sourceName) {
        var camelized = camelize(target);
        var capitalized = capitalize(camelized);
        return (!!sourceName &&
            (sourceName === target ||
                sourceName === camelized ||
                sourceName === capitalized ||
                capitalize(camelize(sourceName)) === capitalized));
    }

    function isCompatEnabled(key) {
        var _a, _b;
        return (_b = (_a = Vue__namespace.compatUtils) === null || _a === void 0 ? void 0 : _a.isCompatEnabled(key)) !== null && _b !== void 0 ? _b : false;
    }
    function isLegacyExtendedComponent(component) {
        if (!isCompatEnabled('GLOBAL_EXTEND') || typeof component !== 'function') {
            return false;
        }
        return (hasOwnProperty(component, 'super') &&
            component.super.extend({}).super === component.super);
    }
    function unwrapLegacyVueExtendComponent(selector) {
        return isLegacyExtendedComponent(selector) ? selector.options : selector;
    }
    function isLegacyFunctionalComponent(component) {
        return Boolean(component &&
            typeof component === 'object' &&
            hasOwnProperty(component, 'functional') &&
            component.functional);
    }

    var getComponentNameInSetup = function (instance, type) {
        return Object.keys((instance === null || instance === void 0 ? void 0 : instance.setupState) || {}).find(function (key) { var _a; return ((_a = Object.getOwnPropertyDescriptor(instance.setupState, key)) === null || _a === void 0 ? void 0 : _a.value) === type; });
    };
    var getComponentRegisteredName = function (instance, type) {
        if (!instance || !instance.parent)
            return null;
        // try to infer the name based on local resolution
        var registry = instance.type.components;
        for (var key in registry) {
            if (registry[key] === type) {
                return key;
            }
        }
        // try to retrieve name imported in script setup
        return getComponentNameInSetup(instance.parent, type) || null;
    };
    var getComponentName = function (instance, type) {
        if (isObjectComponent(type)) {
            return (
            // If the component we stub is a script setup component and is automatically
            // imported by unplugin-vue-components we can only get its name through
            // the `__name` property.
            getComponentNameInSetup(instance, type) || type.name || type.__name || '');
        }
        if (isLegacyExtendedComponent(type)) {
            return unwrapLegacyVueExtendComponent(type).name || '';
        }
        if (isFunctionalComponent(type)) {
            return type.displayName || type.name;
        }
        return '';
    };

    /**
     * Detect whether a selector matches a VNode
     * @param node
     * @param selector
     * @return {boolean | ((value: any) => boolean)}
     */
    function matches(node, rawSelector) {
        var _a, _b, _c;
        var selector = unwrapLegacyVueExtendComponent(rawSelector);
        // do not return none Vue components
        if (!node.component)
            return false;
        var nodeType = node.type;
        if (!isComponent(nodeType))
            return false;
        if (typeof selector === 'string') {
            return (_b = (_a = node.el) === null || _a === void 0 ? void 0 : _a.matches) === null || _b === void 0 ? void 0 : _b.call(_a, selector);
        }
        // When we're using stubs we want user to be able to
        // find stubbed components both by original component
        // or stub definition. That's why we are trying to
        // extract original component and also stub, which was
        // used to create specialized stub for render
        var nodeTypeCandidates = [
            nodeType,
            getOriginalComponentFromStub(nodeType)
        ].filter(Boolean);
        // our selector might be a stub itself
        var target = (_c = getOriginalComponentFromStub(selector)) !== null && _c !== void 0 ? _c : selector;
        if (nodeTypeCandidates.includes(target)) {
            return true;
        }
        var componentName;
        componentName = getComponentName(node.component, nodeType);
        var selectorName = selector.name;
        // the component and selector both have a name
        if (componentName && selectorName) {
            return matchName(selectorName, componentName);
        }
        componentName =
            getComponentRegisteredName(node.component, nodeType) || undefined;
        // if a name is missing, then check the locally registered components in the parent
        if (node.component.parent) {
            var registry = node.component.parent.type.components;
            for (var key in registry) {
                // is it the selector
                if (!selectorName && registry[key] === selector) {
                    selectorName = key;
                }
                // is it the component
                if (!componentName && registry[key] === nodeType) {
                    componentName = key;
                }
            }
        }
        if (selectorName && componentName) {
            return matchName(selectorName, componentName);
        }
        return false;
    }
    /**
     * Filters out the null, undefined and primitive values,
     * to only keep VNode and VNodeArrayChildren values
     * @param value
     */
    function nodesAsObject(value) {
        return !!value && typeof value === 'object';
    }
    /**
     * Collect all children
     * @param nodes
     * @param children
     */
    function aggregateChildren(nodes, children) {
        if (children && Array.isArray(children)) {
            var reversedNodes = __spreadArray([], children, true).reverse().filter(nodesAsObject);
            reversedNodes.forEach(function (node) {
                if (Array.isArray(node)) {
                    aggregateChildren(nodes, node);
                }
                else {
                    nodes.unshift(node);
                }
            });
        }
    }
    function findAllVNodes(vnode, selector) {
        var matchingNodes = [];
        var nodes = [vnode];
        while (nodes.length) {
            var node = nodes.shift();
            aggregateChildren(nodes, node.children);
            if (node.component) {
                aggregateChildren(nodes, [node.component.subTree]);
            }
            if (node.suspense) {
                // match children if component is Suspense
                var activeBranch = node.suspense.activeBranch;
                aggregateChildren(nodes, [activeBranch]);
            }
            if (matches(node, selector) && !matchingNodes.includes(node)) {
                matchingNodes.push(node);
            }
        }
        return matchingNodes;
    }
    function find(root, selector) {
        var matchingVNodes = findAllVNodes(root, selector);
        if (typeof selector === 'string') {
            // When searching by CSS selector we want only one (topmost) vnode for each el`
            matchingVNodes = matchingVNodes.filter(function (vnode) { var _a; return ((_a = vnode.component.parent) === null || _a === void 0 ? void 0 : _a.vnode.el) !== vnode.el; });
        }
        return matchingVNodes.map(function (vnode) { return vnode.component; });
    }

    function createWrapperError(wrapperType) {
        return new Proxy(Object.create(null), {
            get: function (obj, prop) {
                switch (prop) {
                    case 'then':
                        // allows for better errors when wrapping `find` in `await`
                        // https://github.com/vuejs/test-utils/issues/638
                        return;
                    case 'exists':
                        return function () { return false; };
                    default:
                        throw new Error("Cannot call ".concat(String(prop), " on an empty ").concat(wrapperType, "."));
                }
            }
        });
    }

    /*!
     * isElementVisible
     * Adapted from https://github.com/testing-library/jest-dom
     * Licensed under the MIT License.
     */
    function isStyleVisible(element) {
        if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
            return false;
        }
        var _a = getComputedStyle(element), display = _a.display, visibility = _a.visibility, opacity = _a.opacity;
        return (display !== 'none' &&
            visibility !== 'hidden' &&
            visibility !== 'collapse' &&
            opacity !== '0');
    }
    function isAttributeVisible(element) {
        return (!element.hasAttribute('hidden') &&
            (element.nodeName === 'DETAILS' ? element.hasAttribute('open') : true));
    }
    function isElementVisible(element) {
        return (element.nodeName !== '#comment' &&
            isStyleVisible(element) &&
            isAttributeVisible(element) &&
            (!element.parentElement || isElementVisible(element.parentElement)));
    }

    function isElement(element) {
        return element instanceof Element;
    }

    var WrapperType;
    (function (WrapperType) {
        WrapperType[WrapperType["DOMWrapper"] = 0] = "DOMWrapper";
        WrapperType[WrapperType["VueWrapper"] = 1] = "VueWrapper";
    })(WrapperType || (WrapperType = {}));
    var factories = {};
    function registerFactory(type, fn) {
        factories[type] = fn;
    }
    var createDOMWrapper = function (element) {
        return factories[WrapperType.DOMWrapper](element);
    };
    var createVueWrapper = function (app, vm, setProps) {
        return factories[WrapperType.VueWrapper](app, vm, setProps);
    };

    function stringifyNode(node) {
        return node instanceof Element
            ? node.outerHTML
            : new XMLSerializer().serializeToString(node);
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var js = {exports: {}};

    var src = {};

    var javascript = {exports: {}};

    var beautifier$2 = {};

    var output = {};

    /*jshint node:true */

    var hasRequiredOutput;

    function requireOutput () {
    	if (hasRequiredOutput) return output;
    	hasRequiredOutput = 1;

    	function OutputLine(parent) {
    	  this.__parent = parent;
    	  this.__character_count = 0;
    	  // use indent_count as a marker for this.__lines that have preserved indentation
    	  this.__indent_count = -1;
    	  this.__alignment_count = 0;
    	  this.__wrap_point_index = 0;
    	  this.__wrap_point_character_count = 0;
    	  this.__wrap_point_indent_count = -1;
    	  this.__wrap_point_alignment_count = 0;

    	  this.__items = [];
    	}

    	OutputLine.prototype.clone_empty = function() {
    	  var line = new OutputLine(this.__parent);
    	  line.set_indent(this.__indent_count, this.__alignment_count);
    	  return line;
    	};

    	OutputLine.prototype.item = function(index) {
    	  if (index < 0) {
    	    return this.__items[this.__items.length + index];
    	  } else {
    	    return this.__items[index];
    	  }
    	};

    	OutputLine.prototype.has_match = function(pattern) {
    	  for (var lastCheckedOutput = this.__items.length - 1; lastCheckedOutput >= 0; lastCheckedOutput--) {
    	    if (this.__items[lastCheckedOutput].match(pattern)) {
    	      return true;
    	    }
    	  }
    	  return false;
    	};

    	OutputLine.prototype.set_indent = function(indent, alignment) {
    	  if (this.is_empty()) {
    	    this.__indent_count = indent || 0;
    	    this.__alignment_count = alignment || 0;
    	    this.__character_count = this.__parent.get_indent_size(this.__indent_count, this.__alignment_count);
    	  }
    	};

    	OutputLine.prototype._set_wrap_point = function() {
    	  if (this.__parent.wrap_line_length) {
    	    this.__wrap_point_index = this.__items.length;
    	    this.__wrap_point_character_count = this.__character_count;
    	    this.__wrap_point_indent_count = this.__parent.next_line.__indent_count;
    	    this.__wrap_point_alignment_count = this.__parent.next_line.__alignment_count;
    	  }
    	};

    	OutputLine.prototype._should_wrap = function() {
    	  return this.__wrap_point_index &&
    	    this.__character_count > this.__parent.wrap_line_length &&
    	    this.__wrap_point_character_count > this.__parent.next_line.__character_count;
    	};

    	OutputLine.prototype._allow_wrap = function() {
    	  if (this._should_wrap()) {
    	    this.__parent.add_new_line();
    	    var next = this.__parent.current_line;
    	    next.set_indent(this.__wrap_point_indent_count, this.__wrap_point_alignment_count);
    	    next.__items = this.__items.slice(this.__wrap_point_index);
    	    this.__items = this.__items.slice(0, this.__wrap_point_index);

    	    next.__character_count += this.__character_count - this.__wrap_point_character_count;
    	    this.__character_count = this.__wrap_point_character_count;

    	    if (next.__items[0] === " ") {
    	      next.__items.splice(0, 1);
    	      next.__character_count -= 1;
    	    }
    	    return true;
    	  }
    	  return false;
    	};

    	OutputLine.prototype.is_empty = function() {
    	  return this.__items.length === 0;
    	};

    	OutputLine.prototype.last = function() {
    	  if (!this.is_empty()) {
    	    return this.__items[this.__items.length - 1];
    	  } else {
    	    return null;
    	  }
    	};

    	OutputLine.prototype.push = function(item) {
    	  this.__items.push(item);
    	  var last_newline_index = item.lastIndexOf('\n');
    	  if (last_newline_index !== -1) {
    	    this.__character_count = item.length - last_newline_index;
    	  } else {
    	    this.__character_count += item.length;
    	  }
    	};

    	OutputLine.prototype.pop = function() {
    	  var item = null;
    	  if (!this.is_empty()) {
    	    item = this.__items.pop();
    	    this.__character_count -= item.length;
    	  }
    	  return item;
    	};


    	OutputLine.prototype._remove_indent = function() {
    	  if (this.__indent_count > 0) {
    	    this.__indent_count -= 1;
    	    this.__character_count -= this.__parent.indent_size;
    	  }
    	};

    	OutputLine.prototype._remove_wrap_indent = function() {
    	  if (this.__wrap_point_indent_count > 0) {
    	    this.__wrap_point_indent_count -= 1;
    	  }
    	};
    	OutputLine.prototype.trim = function() {
    	  while (this.last() === ' ') {
    	    this.__items.pop();
    	    this.__character_count -= 1;
    	  }
    	};

    	OutputLine.prototype.toString = function() {
    	  var result = '';
    	  if (this.is_empty()) {
    	    if (this.__parent.indent_empty_lines) {
    	      result = this.__parent.get_indent_string(this.__indent_count);
    	    }
    	  } else {
    	    result = this.__parent.get_indent_string(this.__indent_count, this.__alignment_count);
    	    result += this.__items.join('');
    	  }
    	  return result;
    	};

    	function IndentStringCache(options, baseIndentString) {
    	  this.__cache = [''];
    	  this.__indent_size = options.indent_size;
    	  this.__indent_string = options.indent_char;
    	  if (!options.indent_with_tabs) {
    	    this.__indent_string = new Array(options.indent_size + 1).join(options.indent_char);
    	  }

    	  // Set to null to continue support for auto detection of base indent
    	  baseIndentString = baseIndentString || '';
    	  if (options.indent_level > 0) {
    	    baseIndentString = new Array(options.indent_level + 1).join(this.__indent_string);
    	  }

    	  this.__base_string = baseIndentString;
    	  this.__base_string_length = baseIndentString.length;
    	}

    	IndentStringCache.prototype.get_indent_size = function(indent, column) {
    	  var result = this.__base_string_length;
    	  column = column || 0;
    	  if (indent < 0) {
    	    result = 0;
    	  }
    	  result += indent * this.__indent_size;
    	  result += column;
    	  return result;
    	};

    	IndentStringCache.prototype.get_indent_string = function(indent_level, column) {
    	  var result = this.__base_string;
    	  column = column || 0;
    	  if (indent_level < 0) {
    	    indent_level = 0;
    	    result = '';
    	  }
    	  column += indent_level * this.__indent_size;
    	  this.__ensure_cache(column);
    	  result += this.__cache[column];
    	  return result;
    	};

    	IndentStringCache.prototype.__ensure_cache = function(column) {
    	  while (column >= this.__cache.length) {
    	    this.__add_column();
    	  }
    	};

    	IndentStringCache.prototype.__add_column = function() {
    	  var column = this.__cache.length;
    	  var indent = 0;
    	  var result = '';
    	  if (this.__indent_size && column >= this.__indent_size) {
    	    indent = Math.floor(column / this.__indent_size);
    	    column -= indent * this.__indent_size;
    	    result = new Array(indent + 1).join(this.__indent_string);
    	  }
    	  if (column) {
    	    result += new Array(column + 1).join(' ');
    	  }

    	  this.__cache.push(result);
    	};

    	function Output(options, baseIndentString) {
    	  this.__indent_cache = new IndentStringCache(options, baseIndentString);
    	  this.raw = false;
    	  this._end_with_newline = options.end_with_newline;
    	  this.indent_size = options.indent_size;
    	  this.wrap_line_length = options.wrap_line_length;
    	  this.indent_empty_lines = options.indent_empty_lines;
    	  this.__lines = [];
    	  this.previous_line = null;
    	  this.current_line = null;
    	  this.next_line = new OutputLine(this);
    	  this.space_before_token = false;
    	  this.non_breaking_space = false;
    	  this.previous_token_wrapped = false;
    	  // initialize
    	  this.__add_outputline();
    	}

    	Output.prototype.__add_outputline = function() {
    	  this.previous_line = this.current_line;
    	  this.current_line = this.next_line.clone_empty();
    	  this.__lines.push(this.current_line);
    	};

    	Output.prototype.get_line_number = function() {
    	  return this.__lines.length;
    	};

    	Output.prototype.get_indent_string = function(indent, column) {
    	  return this.__indent_cache.get_indent_string(indent, column);
    	};

    	Output.prototype.get_indent_size = function(indent, column) {
    	  return this.__indent_cache.get_indent_size(indent, column);
    	};

    	Output.prototype.is_empty = function() {
    	  return !this.previous_line && this.current_line.is_empty();
    	};

    	Output.prototype.add_new_line = function(force_newline) {
    	  // never newline at the start of file
    	  // otherwise, newline only if we didn't just add one or we're forced
    	  if (this.is_empty() ||
    	    (!force_newline && this.just_added_newline())) {
    	    return false;
    	  }

    	  // if raw output is enabled, don't print additional newlines,
    	  // but still return True as though you had
    	  if (!this.raw) {
    	    this.__add_outputline();
    	  }
    	  return true;
    	};

    	Output.prototype.get_code = function(eol) {
    	  this.trim(true);

    	  // handle some edge cases where the last tokens
    	  // has text that ends with newline(s)
    	  var last_item = this.current_line.pop();
    	  if (last_item) {
    	    if (last_item[last_item.length - 1] === '\n') {
    	      last_item = last_item.replace(/\n+$/g, '');
    	    }
    	    this.current_line.push(last_item);
    	  }

    	  if (this._end_with_newline) {
    	    this.__add_outputline();
    	  }

    	  var sweet_code = this.__lines.join('\n');

    	  if (eol !== '\n') {
    	    sweet_code = sweet_code.replace(/[\n]/g, eol);
    	  }
    	  return sweet_code;
    	};

    	Output.prototype.set_wrap_point = function() {
    	  this.current_line._set_wrap_point();
    	};

    	Output.prototype.set_indent = function(indent, alignment) {
    	  indent = indent || 0;
    	  alignment = alignment || 0;

    	  // Next line stores alignment values
    	  this.next_line.set_indent(indent, alignment);

    	  // Never indent your first output indent at the start of the file
    	  if (this.__lines.length > 1) {
    	    this.current_line.set_indent(indent, alignment);
    	    return true;
    	  }

    	  this.current_line.set_indent();
    	  return false;
    	};

    	Output.prototype.add_raw_token = function(token) {
    	  for (var x = 0; x < token.newlines; x++) {
    	    this.__add_outputline();
    	  }
    	  this.current_line.set_indent(-1);
    	  this.current_line.push(token.whitespace_before);
    	  this.current_line.push(token.text);
    	  this.space_before_token = false;
    	  this.non_breaking_space = false;
    	  this.previous_token_wrapped = false;
    	};

    	Output.prototype.add_token = function(printable_token) {
    	  this.__add_space_before_token();
    	  this.current_line.push(printable_token);
    	  this.space_before_token = false;
    	  this.non_breaking_space = false;
    	  this.previous_token_wrapped = this.current_line._allow_wrap();
    	};

    	Output.prototype.__add_space_before_token = function() {
    	  if (this.space_before_token && !this.just_added_newline()) {
    	    if (!this.non_breaking_space) {
    	      this.set_wrap_point();
    	    }
    	    this.current_line.push(' ');
    	  }
    	};

    	Output.prototype.remove_indent = function(index) {
    	  var output_length = this.__lines.length;
    	  while (index < output_length) {
    	    this.__lines[index]._remove_indent();
    	    index++;
    	  }
    	  this.current_line._remove_wrap_indent();
    	};

    	Output.prototype.trim = function(eat_newlines) {
    	  eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

    	  this.current_line.trim();

    	  while (eat_newlines && this.__lines.length > 1 &&
    	    this.current_line.is_empty()) {
    	    this.__lines.pop();
    	    this.current_line = this.__lines[this.__lines.length - 1];
    	    this.current_line.trim();
    	  }

    	  this.previous_line = this.__lines.length > 1 ?
    	    this.__lines[this.__lines.length - 2] : null;
    	};

    	Output.prototype.just_added_newline = function() {
    	  return this.current_line.is_empty();
    	};

    	Output.prototype.just_added_blankline = function() {
    	  return this.is_empty() ||
    	    (this.current_line.is_empty() && this.previous_line.is_empty());
    	};

    	Output.prototype.ensure_empty_line_above = function(starts_with, ends_with) {
    	  var index = this.__lines.length - 2;
    	  while (index >= 0) {
    	    var potentialEmptyLine = this.__lines[index];
    	    if (potentialEmptyLine.is_empty()) {
    	      break;
    	    } else if (potentialEmptyLine.item(0).indexOf(starts_with) !== 0 &&
    	      potentialEmptyLine.item(-1) !== ends_with) {
    	      this.__lines.splice(index + 1, 0, new OutputLine(this));
    	      this.previous_line = this.__lines[this.__lines.length - 2];
    	      break;
    	    }
    	    index--;
    	  }
    	};

    	output.Output = Output;
    	return output;
    }

    var token = {};

    /*jshint node:true */

    var hasRequiredToken;

    function requireToken () {
    	if (hasRequiredToken) return token;
    	hasRequiredToken = 1;

    	function Token(type, text, newlines, whitespace_before) {
    	  this.type = type;
    	  this.text = text;

    	  // comments_before are
    	  // comments that have a new line before them
    	  // and may or may not have a newline after
    	  // this is a set of comments before
    	  this.comments_before = null; /* inline comment*/


    	  // this.comments_after =  new TokenStream(); // no new line before and newline after
    	  this.newlines = newlines || 0;
    	  this.whitespace_before = whitespace_before || '';
    	  this.parent = null;
    	  this.next = null;
    	  this.previous = null;
    	  this.opened = null;
    	  this.closed = null;
    	  this.directives = null;
    	}


    	token.Token = Token;
    	return token;
    }

    var acorn = {};

    /* jshint node: true, curly: false */

    var hasRequiredAcorn;

    function requireAcorn () {
    	if (hasRequiredAcorn) return acorn;
    	hasRequiredAcorn = 1;
    	(function (exports) {

    		// acorn used char codes to squeeze the last bit of performance out
    		// Beautifier is okay without that, so we're using regex
    		// permit # (23), $ (36), and @ (64). @ is used in ES7 decorators.
    		// 65 through 91 are uppercase letters.
    		// permit _ (95).
    		// 97 through 123 are lowercase letters.
    		var baseASCIIidentifierStartChars = "\\x23\\x24\\x40\\x41-\\x5a\\x5f\\x61-\\x7a";

    		// inside an identifier @ is not allowed but 0-9 are.
    		var baseASCIIidentifierChars = "\\x24\\x30-\\x39\\x41-\\x5a\\x5f\\x61-\\x7a";

    		// Big ugly regular expressions that match characters in the
    		// whitespace, identifier, and identifier-start categories. These
    		// are only applied when a character is found to actually have a
    		// code point above 128.
    		var nonASCIIidentifierStartChars = "\\xaa\\xb5\\xba\\xc0-\\xd6\\xd8-\\xf6\\xf8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0370-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u048a-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05d0-\\u05ea\\u05f0-\\u05f2\\u0620-\\u064a\\u066e\\u066f\\u0671-\\u06d3\\u06d5\\u06e5\\u06e6\\u06ee\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710\\u0712-\\u072f\\u074d-\\u07a5\\u07b1\\u07ca-\\u07ea\\u07f4\\u07f5\\u07fa\\u0800-\\u0815\\u081a\\u0824\\u0828\\u0840-\\u0858\\u08a0\\u08a2-\\u08ac\\u0904-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097f\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bd\\u09ce\\u09dc\\u09dd\\u09df-\\u09e1\\u09f0\\u09f1\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a72-\\u0a74\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae1\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b71\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bd0\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c33\\u0c35-\\u0c39\\u0c3d\\u0c58\\u0c59\\u0c60\\u0c61\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbd\\u0cde\\u0ce0\\u0ce1\\u0cf1\\u0cf2\\u0d05-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d3a\\u0d3d\\u0d4e\\u0d60\\u0d61\\u0d7a-\\u0d7f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e46\\u0e81\\u0e82\\u0e84\\u0e87\\u0e88\\u0e8a\\u0e8d\\u0e94-\\u0e97\\u0e99-\\u0e9f\\u0ea1-\\u0ea3\\u0ea5\\u0ea7\\u0eaa\\u0eab\\u0ead-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0edc-\\u0edf\\u0f00\\u0f40-\\u0f47\\u0f49-\\u0f6c\\u0f88-\\u0f8c\\u1000-\\u102a\\u103f\\u1050-\\u1055\\u105a-\\u105d\\u1061\\u1065\\u1066\\u106e-\\u1070\\u1075-\\u1081\\u108e\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u1380-\\u138f\\u13a0-\\u13f4\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16ee-\\u16f0\\u1700-\\u170c\\u170e-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176c\\u176e-\\u1770\\u1780-\\u17b3\\u17d7\\u17dc\\u1820-\\u1877\\u1880-\\u18a8\\u18aa\\u18b0-\\u18f5\\u1900-\\u191c\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19c1-\\u19c7\\u1a00-\\u1a16\\u1a20-\\u1a54\\u1aa7\\u1b05-\\u1b33\\u1b45-\\u1b4b\\u1b83-\\u1ba0\\u1bae\\u1baf\\u1bba-\\u1be5\\u1c00-\\u1c23\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1ce9-\\u1cec\\u1cee-\\u1cf1\\u1cf5\\u1cf6\\u1d00-\\u1dbf\\u1e00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2160-\\u2188\\u2c00-\\u2c2e\\u2c30-\\u2c5e\\u2c60-\\u2ce4\\u2ceb-\\u2cee\\u2cf2\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d80-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u2e2f\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303c\\u3041-\\u3096\\u309d-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312d\\u3131-\\u318e\\u31a0-\\u31ba\\u31f0-\\u31ff\\u3400-\\u4db5\\u4e00-\\u9fcc\\ua000-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua66e\\ua67f-\\ua697\\ua6a0-\\ua6ef\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua78e\\ua790-\\ua793\\ua7a0-\\ua7aa\\ua7f8-\\ua801\\ua803-\\ua805\\ua807-\\ua80a\\ua80c-\\ua822\\ua840-\\ua873\\ua882-\\ua8b3\\ua8f2-\\ua8f7\\ua8fb\\ua90a-\\ua925\\ua930-\\ua946\\ua960-\\ua97c\\ua984-\\ua9b2\\ua9cf\\uaa00-\\uaa28\\uaa40-\\uaa42\\uaa44-\\uaa4b\\uaa60-\\uaa76\\uaa7a\\uaa80-\\uaaaf\\uaab1\\uaab5\\uaab6\\uaab9-\\uaabd\\uaac0\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaea\\uaaf2-\\uaaf4\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uabc0-\\uabe2\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc";
    		var nonASCIIidentifierChars = "\\u0300-\\u036f\\u0483-\\u0487\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u0620-\\u0649\\u0672-\\u06d3\\u06e7-\\u06e8\\u06fb-\\u06fc\\u0730-\\u074a\\u0800-\\u0814\\u081b-\\u0823\\u0825-\\u0827\\u0829-\\u082d\\u0840-\\u0857\\u08e4-\\u08fe\\u0900-\\u0903\\u093a-\\u093c\\u093e-\\u094f\\u0951-\\u0957\\u0962-\\u0963\\u0966-\\u096f\\u0981-\\u0983\\u09bc\\u09be-\\u09c4\\u09c7\\u09c8\\u09d7\\u09df-\\u09e0\\u0a01-\\u0a03\\u0a3c\\u0a3e-\\u0a42\\u0a47\\u0a48\\u0a4b-\\u0a4d\\u0a51\\u0a66-\\u0a71\\u0a75\\u0a81-\\u0a83\\u0abc\\u0abe-\\u0ac5\\u0ac7-\\u0ac9\\u0acb-\\u0acd\\u0ae2-\\u0ae3\\u0ae6-\\u0aef\\u0b01-\\u0b03\\u0b3c\\u0b3e-\\u0b44\\u0b47\\u0b48\\u0b4b-\\u0b4d\\u0b56\\u0b57\\u0b5f-\\u0b60\\u0b66-\\u0b6f\\u0b82\\u0bbe-\\u0bc2\\u0bc6-\\u0bc8\\u0bca-\\u0bcd\\u0bd7\\u0be6-\\u0bef\\u0c01-\\u0c03\\u0c46-\\u0c48\\u0c4a-\\u0c4d\\u0c55\\u0c56\\u0c62-\\u0c63\\u0c66-\\u0c6f\\u0c82\\u0c83\\u0cbc\\u0cbe-\\u0cc4\\u0cc6-\\u0cc8\\u0cca-\\u0ccd\\u0cd5\\u0cd6\\u0ce2-\\u0ce3\\u0ce6-\\u0cef\\u0d02\\u0d03\\u0d46-\\u0d48\\u0d57\\u0d62-\\u0d63\\u0d66-\\u0d6f\\u0d82\\u0d83\\u0dca\\u0dcf-\\u0dd4\\u0dd6\\u0dd8-\\u0ddf\\u0df2\\u0df3\\u0e34-\\u0e3a\\u0e40-\\u0e45\\u0e50-\\u0e59\\u0eb4-\\u0eb9\\u0ec8-\\u0ecd\\u0ed0-\\u0ed9\\u0f18\\u0f19\\u0f20-\\u0f29\\u0f35\\u0f37\\u0f39\\u0f41-\\u0f47\\u0f71-\\u0f84\\u0f86-\\u0f87\\u0f8d-\\u0f97\\u0f99-\\u0fbc\\u0fc6\\u1000-\\u1029\\u1040-\\u1049\\u1067-\\u106d\\u1071-\\u1074\\u1082-\\u108d\\u108f-\\u109d\\u135d-\\u135f\\u170e-\\u1710\\u1720-\\u1730\\u1740-\\u1750\\u1772\\u1773\\u1780-\\u17b2\\u17dd\\u17e0-\\u17e9\\u180b-\\u180d\\u1810-\\u1819\\u1920-\\u192b\\u1930-\\u193b\\u1951-\\u196d\\u19b0-\\u19c0\\u19c8-\\u19c9\\u19d0-\\u19d9\\u1a00-\\u1a15\\u1a20-\\u1a53\\u1a60-\\u1a7c\\u1a7f-\\u1a89\\u1a90-\\u1a99\\u1b46-\\u1b4b\\u1b50-\\u1b59\\u1b6b-\\u1b73\\u1bb0-\\u1bb9\\u1be6-\\u1bf3\\u1c00-\\u1c22\\u1c40-\\u1c49\\u1c5b-\\u1c7d\\u1cd0-\\u1cd2\\u1d00-\\u1dbe\\u1e01-\\u1f15\\u200c\\u200d\\u203f\\u2040\\u2054\\u20d0-\\u20dc\\u20e1\\u20e5-\\u20f0\\u2d81-\\u2d96\\u2de0-\\u2dff\\u3021-\\u3028\\u3099\\u309a\\ua640-\\ua66d\\ua674-\\ua67d\\ua69f\\ua6f0-\\ua6f1\\ua7f8-\\ua800\\ua806\\ua80b\\ua823-\\ua827\\ua880-\\ua881\\ua8b4-\\ua8c4\\ua8d0-\\ua8d9\\ua8f3-\\ua8f7\\ua900-\\ua909\\ua926-\\ua92d\\ua930-\\ua945\\ua980-\\ua983\\ua9b3-\\ua9c0\\uaa00-\\uaa27\\uaa40-\\uaa41\\uaa4c-\\uaa4d\\uaa50-\\uaa59\\uaa7b\\uaae0-\\uaae9\\uaaf2-\\uaaf3\\uabc0-\\uabe1\\uabec\\uabed\\uabf0-\\uabf9\\ufb20-\\ufb28\\ufe00-\\ufe0f\\ufe20-\\ufe26\\ufe33\\ufe34\\ufe4d-\\ufe4f\\uff10-\\uff19\\uff3f";
    		//var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
    		//var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

    		var identifierStart = "(?:\\\\u[0-9a-fA-F]{4}|[" + baseASCIIidentifierStartChars + nonASCIIidentifierStartChars + "])";
    		var identifierChars = "(?:\\\\u[0-9a-fA-F]{4}|[" + baseASCIIidentifierChars + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "])*";

    		exports.identifier = new RegExp(identifierStart + identifierChars, 'g');
    		exports.identifierStart = new RegExp(identifierStart);
    		exports.identifierMatch = new RegExp("(?:\\\\u[0-9a-fA-F]{4}|[" + baseASCIIidentifierChars + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "])+");

    		// Whether a single character denotes a newline.

    		exports.newline = /[\n\r\u2028\u2029]/;

    		// Matches a whole line break (where CRLF is considered a single
    		// line break). Used to count lines.

    		// in javascript, these two differ
    		// in python they are the same, different methods are called on them
    		exports.lineBreak = new RegExp('\r\n|' + exports.newline.source);
    		exports.allLineBreaks = new RegExp(exports.lineBreak.source, 'g'); 
    	} (acorn));
    	return acorn;
    }

    var options$3 = {};

    var options$2 = {};

    /*jshint node:true */

    var hasRequiredOptions$3;

    function requireOptions$3 () {
    	if (hasRequiredOptions$3) return options$2;
    	hasRequiredOptions$3 = 1;

    	function Options(options, merge_child_field) {
    	  this.raw_options = _mergeOpts(options, merge_child_field);

    	  // Support passing the source text back with no change
    	  this.disabled = this._get_boolean('disabled');

    	  this.eol = this._get_characters('eol', 'auto');
    	  this.end_with_newline = this._get_boolean('end_with_newline');
    	  this.indent_size = this._get_number('indent_size', 4);
    	  this.indent_char = this._get_characters('indent_char', ' ');
    	  this.indent_level = this._get_number('indent_level');

    	  this.preserve_newlines = this._get_boolean('preserve_newlines', true);
    	  this.max_preserve_newlines = this._get_number('max_preserve_newlines', 32786);
    	  if (!this.preserve_newlines) {
    	    this.max_preserve_newlines = 0;
    	  }

    	  this.indent_with_tabs = this._get_boolean('indent_with_tabs', this.indent_char === '\t');
    	  if (this.indent_with_tabs) {
    	    this.indent_char = '\t';

    	    // indent_size behavior changed after 1.8.6
    	    // It used to be that indent_size would be
    	    // set to 1 for indent_with_tabs. That is no longer needed and
    	    // actually doesn't make sense - why not use spaces? Further,
    	    // that might produce unexpected behavior - tabs being used
    	    // for single-column alignment. So, when indent_with_tabs is true
    	    // and indent_size is 1, reset indent_size to 4.
    	    if (this.indent_size === 1) {
    	      this.indent_size = 4;
    	    }
    	  }

    	  // Backwards compat with 1.3.x
    	  this.wrap_line_length = this._get_number('wrap_line_length', this._get_number('max_char'));

    	  this.indent_empty_lines = this._get_boolean('indent_empty_lines');

    	  // valid templating languages ['django', 'erb', 'handlebars', 'php', 'smarty']
    	  // For now, 'auto' = all off for javascript, all on for html (and inline javascript).
    	  // other values ignored
    	  this.templating = this._get_selection_list('templating', ['auto', 'none', 'django', 'erb', 'handlebars', 'php', 'smarty'], ['auto']);
    	}

    	Options.prototype._get_array = function(name, default_value) {
    	  var option_value = this.raw_options[name];
    	  var result = default_value || [];
    	  if (typeof option_value === 'object') {
    	    if (option_value !== null && typeof option_value.concat === 'function') {
    	      result = option_value.concat();
    	    }
    	  } else if (typeof option_value === 'string') {
    	    result = option_value.split(/[^a-zA-Z0-9_\/\-]+/);
    	  }
    	  return result;
    	};

    	Options.prototype._get_boolean = function(name, default_value) {
    	  var option_value = this.raw_options[name];
    	  var result = option_value === undefined ? !!default_value : !!option_value;
    	  return result;
    	};

    	Options.prototype._get_characters = function(name, default_value) {
    	  var option_value = this.raw_options[name];
    	  var result = default_value || '';
    	  if (typeof option_value === 'string') {
    	    result = option_value.replace(/\\r/, '\r').replace(/\\n/, '\n').replace(/\\t/, '\t');
    	  }
    	  return result;
    	};

    	Options.prototype._get_number = function(name, default_value) {
    	  var option_value = this.raw_options[name];
    	  default_value = parseInt(default_value, 10);
    	  if (isNaN(default_value)) {
    	    default_value = 0;
    	  }
    	  var result = parseInt(option_value, 10);
    	  if (isNaN(result)) {
    	    result = default_value;
    	  }
    	  return result;
    	};

    	Options.prototype._get_selection = function(name, selection_list, default_value) {
    	  var result = this._get_selection_list(name, selection_list, default_value);
    	  if (result.length !== 1) {
    	    throw new Error(
    	      "Invalid Option Value: The option '" + name + "' can only be one of the following values:\n" +
    	      selection_list + "\nYou passed in: '" + this.raw_options[name] + "'");
    	  }

    	  return result[0];
    	};


    	Options.prototype._get_selection_list = function(name, selection_list, default_value) {
    	  if (!selection_list || selection_list.length === 0) {
    	    throw new Error("Selection list cannot be empty.");
    	  }

    	  default_value = default_value || [selection_list[0]];
    	  if (!this._is_valid_selection(default_value, selection_list)) {
    	    throw new Error("Invalid Default Value!");
    	  }

    	  var result = this._get_array(name, default_value);
    	  if (!this._is_valid_selection(result, selection_list)) {
    	    throw new Error(
    	      "Invalid Option Value: The option '" + name + "' can contain only the following values:\n" +
    	      selection_list + "\nYou passed in: '" + this.raw_options[name] + "'");
    	  }

    	  return result;
    	};

    	Options.prototype._is_valid_selection = function(result, selection_list) {
    	  return result.length && selection_list.length &&
    	    !result.some(function(item) { return selection_list.indexOf(item) === -1; });
    	};


    	// merges child options up with the parent options object
    	// Example: obj = {a: 1, b: {a: 2}}
    	//          mergeOpts(obj, 'b')
    	//
    	//          Returns: {a: 2}
    	function _mergeOpts(allOptions, childFieldName) {
    	  var finalOpts = {};
    	  allOptions = _normalizeOpts(allOptions);
    	  var name;

    	  for (name in allOptions) {
    	    if (name !== childFieldName) {
    	      finalOpts[name] = allOptions[name];
    	    }
    	  }

    	  //merge in the per type settings for the childFieldName
    	  if (childFieldName && allOptions[childFieldName]) {
    	    for (name in allOptions[childFieldName]) {
    	      finalOpts[name] = allOptions[childFieldName][name];
    	    }
    	  }
    	  return finalOpts;
    	}

    	function _normalizeOpts(options) {
    	  var convertedOpts = {};
    	  var key;

    	  for (key in options) {
    	    var newKey = key.replace(/-/g, "_");
    	    convertedOpts[newKey] = options[key];
    	  }
    	  return convertedOpts;
    	}

    	options$2.Options = Options;
    	options$2.normalizeOpts = _normalizeOpts;
    	options$2.mergeOpts = _mergeOpts;
    	return options$2;
    }

    /*jshint node:true */

    var hasRequiredOptions$2;

    function requireOptions$2 () {
    	if (hasRequiredOptions$2) return options$3;
    	hasRequiredOptions$2 = 1;

    	var BaseOptions = requireOptions$3().Options;

    	var validPositionValues = ['before-newline', 'after-newline', 'preserve-newline'];

    	function Options(options) {
    	  BaseOptions.call(this, options, 'js');

    	  // compatibility, re
    	  var raw_brace_style = this.raw_options.brace_style || null;
    	  if (raw_brace_style === "expand-strict") { //graceful handling of deprecated option
    	    this.raw_options.brace_style = "expand";
    	  } else if (raw_brace_style === "collapse-preserve-inline") { //graceful handling of deprecated option
    	    this.raw_options.brace_style = "collapse,preserve-inline";
    	  } else if (this.raw_options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
    	    this.raw_options.brace_style = this.raw_options.braces_on_own_line ? "expand" : "collapse";
    	    // } else if (!raw_brace_style) { //Nothing exists to set it
    	    //   raw_brace_style = "collapse";
    	  }

    	  //preserve-inline in delimited string will trigger brace_preserve_inline, everything
    	  //else is considered a brace_style and the last one only will have an effect

    	  var brace_style_split = this._get_selection_list('brace_style', ['collapse', 'expand', 'end-expand', 'none', 'preserve-inline']);

    	  this.brace_preserve_inline = false; //Defaults in case one or other was not specified in meta-option
    	  this.brace_style = "collapse";

    	  for (var bs = 0; bs < brace_style_split.length; bs++) {
    	    if (brace_style_split[bs] === "preserve-inline") {
    	      this.brace_preserve_inline = true;
    	    } else {
    	      this.brace_style = brace_style_split[bs];
    	    }
    	  }

    	  this.unindent_chained_methods = this._get_boolean('unindent_chained_methods');
    	  this.break_chained_methods = this._get_boolean('break_chained_methods');
    	  this.space_in_paren = this._get_boolean('space_in_paren');
    	  this.space_in_empty_paren = this._get_boolean('space_in_empty_paren');
    	  this.jslint_happy = this._get_boolean('jslint_happy');
    	  this.space_after_anon_function = this._get_boolean('space_after_anon_function');
    	  this.space_after_named_function = this._get_boolean('space_after_named_function');
    	  this.keep_array_indentation = this._get_boolean('keep_array_indentation');
    	  this.space_before_conditional = this._get_boolean('space_before_conditional', true);
    	  this.unescape_strings = this._get_boolean('unescape_strings');
    	  this.e4x = this._get_boolean('e4x');
    	  this.comma_first = this._get_boolean('comma_first');
    	  this.operator_position = this._get_selection('operator_position', validPositionValues);

    	  // For testing of beautify preserve:start directive
    	  this.test_output_raw = this._get_boolean('test_output_raw');

    	  // force this._options.space_after_anon_function to true if this._options.jslint_happy
    	  if (this.jslint_happy) {
    	    this.space_after_anon_function = true;
    	  }

    	}
    	Options.prototype = new BaseOptions();



    	options$3.Options = Options;
    	return options$3;
    }

    var tokenizer$2 = {};

    var inputscanner = {};

    /*jshint node:true */

    var hasRequiredInputscanner;

    function requireInputscanner () {
    	if (hasRequiredInputscanner) return inputscanner;
    	hasRequiredInputscanner = 1;

    	var regexp_has_sticky = RegExp.prototype.hasOwnProperty('sticky');

    	function InputScanner(input_string) {
    	  this.__input = input_string || '';
    	  this.__input_length = this.__input.length;
    	  this.__position = 0;
    	}

    	InputScanner.prototype.restart = function() {
    	  this.__position = 0;
    	};

    	InputScanner.prototype.back = function() {
    	  if (this.__position > 0) {
    	    this.__position -= 1;
    	  }
    	};

    	InputScanner.prototype.hasNext = function() {
    	  return this.__position < this.__input_length;
    	};

    	InputScanner.prototype.next = function() {
    	  var val = null;
    	  if (this.hasNext()) {
    	    val = this.__input.charAt(this.__position);
    	    this.__position += 1;
    	  }
    	  return val;
    	};

    	InputScanner.prototype.peek = function(index) {
    	  var val = null;
    	  index = index || 0;
    	  index += this.__position;
    	  if (index >= 0 && index < this.__input_length) {
    	    val = this.__input.charAt(index);
    	  }
    	  return val;
    	};

    	// This is a JavaScript only helper function (not in python)
    	// Javascript doesn't have a match method
    	// and not all implementation support "sticky" flag.
    	// If they do not support sticky then both this.match() and this.test() method
    	// must get the match and check the index of the match.
    	// If sticky is supported and set, this method will use it.
    	// Otherwise it will check that global is set, and fall back to the slower method.
    	InputScanner.prototype.__match = function(pattern, index) {
    	  pattern.lastIndex = index;
    	  var pattern_match = pattern.exec(this.__input);

    	  if (pattern_match && !(regexp_has_sticky && pattern.sticky)) {
    	    if (pattern_match.index !== index) {
    	      pattern_match = null;
    	    }
    	  }

    	  return pattern_match;
    	};

    	InputScanner.prototype.test = function(pattern, index) {
    	  index = index || 0;
    	  index += this.__position;

    	  if (index >= 0 && index < this.__input_length) {
    	    return !!this.__match(pattern, index);
    	  } else {
    	    return false;
    	  }
    	};

    	InputScanner.prototype.testChar = function(pattern, index) {
    	  // test one character regex match
    	  var val = this.peek(index);
    	  pattern.lastIndex = 0;
    	  return val !== null && pattern.test(val);
    	};

    	InputScanner.prototype.match = function(pattern) {
    	  var pattern_match = this.__match(pattern, this.__position);
    	  if (pattern_match) {
    	    this.__position += pattern_match[0].length;
    	  } else {
    	    pattern_match = null;
    	  }
    	  return pattern_match;
    	};

    	InputScanner.prototype.read = function(starting_pattern, until_pattern, until_after) {
    	  var val = '';
    	  var match;
    	  if (starting_pattern) {
    	    match = this.match(starting_pattern);
    	    if (match) {
    	      val += match[0];
    	    }
    	  }
    	  if (until_pattern && (match || !starting_pattern)) {
    	    val += this.readUntil(until_pattern, until_after);
    	  }
    	  return val;
    	};

    	InputScanner.prototype.readUntil = function(pattern, until_after) {
    	  var val = '';
    	  var match_index = this.__position;
    	  pattern.lastIndex = this.__position;
    	  var pattern_match = pattern.exec(this.__input);
    	  if (pattern_match) {
    	    match_index = pattern_match.index;
    	    if (until_after) {
    	      match_index += pattern_match[0].length;
    	    }
    	  } else {
    	    match_index = this.__input_length;
    	  }

    	  val = this.__input.substring(this.__position, match_index);
    	  this.__position = match_index;
    	  return val;
    	};

    	InputScanner.prototype.readUntilAfter = function(pattern) {
    	  return this.readUntil(pattern, true);
    	};

    	InputScanner.prototype.get_regexp = function(pattern, match_from) {
    	  var result = null;
    	  var flags = 'g';
    	  if (match_from && regexp_has_sticky) {
    	    flags = 'y';
    	  }
    	  // strings are converted to regexp
    	  if (typeof pattern === "string" && pattern !== '') {
    	    // result = new RegExp(pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), flags);
    	    result = new RegExp(pattern, flags);
    	  } else if (pattern) {
    	    result = new RegExp(pattern.source, flags);
    	  }
    	  return result;
    	};

    	InputScanner.prototype.get_literal_regexp = function(literal_string) {
    	  return RegExp(literal_string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    	};

    	/* css beautifier legacy helpers */
    	InputScanner.prototype.peekUntilAfter = function(pattern) {
    	  var start = this.__position;
    	  var val = this.readUntilAfter(pattern);
    	  this.__position = start;
    	  return val;
    	};

    	InputScanner.prototype.lookBack = function(testVal) {
    	  var start = this.__position - 1;
    	  return start >= testVal.length && this.__input.substring(start - testVal.length, start)
    	    .toLowerCase() === testVal;
    	};

    	inputscanner.InputScanner = InputScanner;
    	return inputscanner;
    }

    var tokenizer$1 = {};

    var tokenstream = {};

    /*jshint node:true */

    var hasRequiredTokenstream;

    function requireTokenstream () {
    	if (hasRequiredTokenstream) return tokenstream;
    	hasRequiredTokenstream = 1;

    	function TokenStream(parent_token) {
    	  // private
    	  this.__tokens = [];
    	  this.__tokens_length = this.__tokens.length;
    	  this.__position = 0;
    	  this.__parent_token = parent_token;
    	}

    	TokenStream.prototype.restart = function() {
    	  this.__position = 0;
    	};

    	TokenStream.prototype.isEmpty = function() {
    	  return this.__tokens_length === 0;
    	};

    	TokenStream.prototype.hasNext = function() {
    	  return this.__position < this.__tokens_length;
    	};

    	TokenStream.prototype.next = function() {
    	  var val = null;
    	  if (this.hasNext()) {
    	    val = this.__tokens[this.__position];
    	    this.__position += 1;
    	  }
    	  return val;
    	};

    	TokenStream.prototype.peek = function(index) {
    	  var val = null;
    	  index = index || 0;
    	  index += this.__position;
    	  if (index >= 0 && index < this.__tokens_length) {
    	    val = this.__tokens[index];
    	  }
    	  return val;
    	};

    	TokenStream.prototype.add = function(token) {
    	  if (this.__parent_token) {
    	    token.parent = this.__parent_token;
    	  }
    	  this.__tokens.push(token);
    	  this.__tokens_length += 1;
    	};

    	tokenstream.TokenStream = TokenStream;
    	return tokenstream;
    }

    var whitespacepattern = {};

    var pattern = {};

    /*jshint node:true */

    var hasRequiredPattern;

    function requirePattern () {
    	if (hasRequiredPattern) return pattern;
    	hasRequiredPattern = 1;

    	function Pattern(input_scanner, parent) {
    	  this._input = input_scanner;
    	  this._starting_pattern = null;
    	  this._match_pattern = null;
    	  this._until_pattern = null;
    	  this._until_after = false;

    	  if (parent) {
    	    this._starting_pattern = this._input.get_regexp(parent._starting_pattern, true);
    	    this._match_pattern = this._input.get_regexp(parent._match_pattern, true);
    	    this._until_pattern = this._input.get_regexp(parent._until_pattern);
    	    this._until_after = parent._until_after;
    	  }
    	}

    	Pattern.prototype.read = function() {
    	  var result = this._input.read(this._starting_pattern);
    	  if (!this._starting_pattern || result) {
    	    result += this._input.read(this._match_pattern, this._until_pattern, this._until_after);
    	  }
    	  return result;
    	};

    	Pattern.prototype.read_match = function() {
    	  return this._input.match(this._match_pattern);
    	};

    	Pattern.prototype.until_after = function(pattern) {
    	  var result = this._create();
    	  result._until_after = true;
    	  result._until_pattern = this._input.get_regexp(pattern);
    	  result._update();
    	  return result;
    	};

    	Pattern.prototype.until = function(pattern) {
    	  var result = this._create();
    	  result._until_after = false;
    	  result._until_pattern = this._input.get_regexp(pattern);
    	  result._update();
    	  return result;
    	};

    	Pattern.prototype.starting_with = function(pattern) {
    	  var result = this._create();
    	  result._starting_pattern = this._input.get_regexp(pattern, true);
    	  result._update();
    	  return result;
    	};

    	Pattern.prototype.matching = function(pattern) {
    	  var result = this._create();
    	  result._match_pattern = this._input.get_regexp(pattern, true);
    	  result._update();
    	  return result;
    	};

    	Pattern.prototype._create = function() {
    	  return new Pattern(this._input, this);
    	};

    	Pattern.prototype._update = function() {};

    	pattern.Pattern = Pattern;
    	return pattern;
    }

    /*jshint node:true */

    var hasRequiredWhitespacepattern;

    function requireWhitespacepattern () {
    	if (hasRequiredWhitespacepattern) return whitespacepattern;
    	hasRequiredWhitespacepattern = 1;

    	var Pattern = requirePattern().Pattern;

    	function WhitespacePattern(input_scanner, parent) {
    	  Pattern.call(this, input_scanner, parent);
    	  if (parent) {
    	    this._line_regexp = this._input.get_regexp(parent._line_regexp);
    	  } else {
    	    this.__set_whitespace_patterns('', '');
    	  }

    	  this.newline_count = 0;
    	  this.whitespace_before_token = '';
    	}
    	WhitespacePattern.prototype = new Pattern();

    	WhitespacePattern.prototype.__set_whitespace_patterns = function(whitespace_chars, newline_chars) {
    	  whitespace_chars += '\\t ';
    	  newline_chars += '\\n\\r';

    	  this._match_pattern = this._input.get_regexp(
    	    '[' + whitespace_chars + newline_chars + ']+', true);
    	  this._newline_regexp = this._input.get_regexp(
    	    '\\r\\n|[' + newline_chars + ']');
    	};

    	WhitespacePattern.prototype.read = function() {
    	  this.newline_count = 0;
    	  this.whitespace_before_token = '';

    	  var resulting_string = this._input.read(this._match_pattern);
    	  if (resulting_string === ' ') {
    	    this.whitespace_before_token = ' ';
    	  } else if (resulting_string) {
    	    var matches = this.__split(this._newline_regexp, resulting_string);
    	    this.newline_count = matches.length - 1;
    	    this.whitespace_before_token = matches[this.newline_count];
    	  }

    	  return resulting_string;
    	};

    	WhitespacePattern.prototype.matching = function(whitespace_chars, newline_chars) {
    	  var result = this._create();
    	  result.__set_whitespace_patterns(whitespace_chars, newline_chars);
    	  result._update();
    	  return result;
    	};

    	WhitespacePattern.prototype._create = function() {
    	  return new WhitespacePattern(this._input, this);
    	};

    	WhitespacePattern.prototype.__split = function(regexp, input_string) {
    	  regexp.lastIndex = 0;
    	  var start_index = 0;
    	  var result = [];
    	  var next_match = regexp.exec(input_string);
    	  while (next_match) {
    	    result.push(input_string.substring(start_index, next_match.index));
    	    start_index = next_match.index + next_match[0].length;
    	    next_match = regexp.exec(input_string);
    	  }

    	  if (start_index < input_string.length) {
    	    result.push(input_string.substring(start_index, input_string.length));
    	  } else {
    	    result.push('');
    	  }

    	  return result;
    	};



    	whitespacepattern.WhitespacePattern = WhitespacePattern;
    	return whitespacepattern;
    }

    /*jshint node:true */

    var hasRequiredTokenizer$2;

    function requireTokenizer$2 () {
    	if (hasRequiredTokenizer$2) return tokenizer$1;
    	hasRequiredTokenizer$2 = 1;

    	var InputScanner = requireInputscanner().InputScanner;
    	var Token = requireToken().Token;
    	var TokenStream = requireTokenstream().TokenStream;
    	var WhitespacePattern = requireWhitespacepattern().WhitespacePattern;

    	var TOKEN = {
    	  START: 'TK_START',
    	  RAW: 'TK_RAW',
    	  EOF: 'TK_EOF'
    	};

    	var Tokenizer = function(input_string, options) {
    	  this._input = new InputScanner(input_string);
    	  this._options = options || {};
    	  this.__tokens = null;

    	  this._patterns = {};
    	  this._patterns.whitespace = new WhitespacePattern(this._input);
    	};

    	Tokenizer.prototype.tokenize = function() {
    	  this._input.restart();
    	  this.__tokens = new TokenStream();

    	  this._reset();

    	  var current;
    	  var previous = new Token(TOKEN.START, '');
    	  var open_token = null;
    	  var open_stack = [];
    	  var comments = new TokenStream();

    	  while (previous.type !== TOKEN.EOF) {
    	    current = this._get_next_token(previous, open_token);
    	    while (this._is_comment(current)) {
    	      comments.add(current);
    	      current = this._get_next_token(previous, open_token);
    	    }

    	    if (!comments.isEmpty()) {
    	      current.comments_before = comments;
    	      comments = new TokenStream();
    	    }

    	    current.parent = open_token;

    	    if (this._is_opening(current)) {
    	      open_stack.push(open_token);
    	      open_token = current;
    	    } else if (open_token && this._is_closing(current, open_token)) {
    	      current.opened = open_token;
    	      open_token.closed = current;
    	      open_token = open_stack.pop();
    	      current.parent = open_token;
    	    }

    	    current.previous = previous;
    	    previous.next = current;

    	    this.__tokens.add(current);
    	    previous = current;
    	  }

    	  return this.__tokens;
    	};


    	Tokenizer.prototype._is_first_token = function() {
    	  return this.__tokens.isEmpty();
    	};

    	Tokenizer.prototype._reset = function() {};

    	Tokenizer.prototype._get_next_token = function(previous_token, open_token) { // jshint unused:false
    	  this._readWhitespace();
    	  var resulting_string = this._input.read(/.+/g);
    	  if (resulting_string) {
    	    return this._create_token(TOKEN.RAW, resulting_string);
    	  } else {
    	    return this._create_token(TOKEN.EOF, '');
    	  }
    	};

    	Tokenizer.prototype._is_comment = function(current_token) { // jshint unused:false
    	  return false;
    	};

    	Tokenizer.prototype._is_opening = function(current_token) { // jshint unused:false
    	  return false;
    	};

    	Tokenizer.prototype._is_closing = function(current_token, open_token) { // jshint unused:false
    	  return false;
    	};

    	Tokenizer.prototype._create_token = function(type, text) {
    	  var token = new Token(type, text,
    	    this._patterns.whitespace.newline_count,
    	    this._patterns.whitespace.whitespace_before_token);
    	  return token;
    	};

    	Tokenizer.prototype._readWhitespace = function() {
    	  return this._patterns.whitespace.read();
    	};



    	tokenizer$1.Tokenizer = Tokenizer;
    	tokenizer$1.TOKEN = TOKEN;
    	return tokenizer$1;
    }

    var directives = {};

    /*jshint node:true */

    var hasRequiredDirectives;

    function requireDirectives () {
    	if (hasRequiredDirectives) return directives;
    	hasRequiredDirectives = 1;

    	function Directives(start_block_pattern, end_block_pattern) {
    	  start_block_pattern = typeof start_block_pattern === 'string' ? start_block_pattern : start_block_pattern.source;
    	  end_block_pattern = typeof end_block_pattern === 'string' ? end_block_pattern : end_block_pattern.source;
    	  this.__directives_block_pattern = new RegExp(start_block_pattern + / beautify( \w+[:]\w+)+ /.source + end_block_pattern, 'g');
    	  this.__directive_pattern = / (\w+)[:](\w+)/g;

    	  this.__directives_end_ignore_pattern = new RegExp(start_block_pattern + /\sbeautify\signore:end\s/.source + end_block_pattern, 'g');
    	}

    	Directives.prototype.get_directives = function(text) {
    	  if (!text.match(this.__directives_block_pattern)) {
    	    return null;
    	  }

    	  var directives = {};
    	  this.__directive_pattern.lastIndex = 0;
    	  var directive_match = this.__directive_pattern.exec(text);

    	  while (directive_match) {
    	    directives[directive_match[1]] = directive_match[2];
    	    directive_match = this.__directive_pattern.exec(text);
    	  }

    	  return directives;
    	};

    	Directives.prototype.readIgnored = function(input) {
    	  return input.readUntilAfter(this.__directives_end_ignore_pattern);
    	};


    	directives.Directives = Directives;
    	return directives;
    }

    var templatablepattern = {};

    /*jshint node:true */

    var hasRequiredTemplatablepattern;

    function requireTemplatablepattern () {
    	if (hasRequiredTemplatablepattern) return templatablepattern;
    	hasRequiredTemplatablepattern = 1;

    	var Pattern = requirePattern().Pattern;


    	var template_names = {
    	  django: false,
    	  erb: false,
    	  handlebars: false,
    	  php: false,
    	  smarty: false
    	};

    	// This lets templates appear anywhere we would do a readUntil
    	// The cost is higher but it is pay to play.
    	function TemplatablePattern(input_scanner, parent) {
    	  Pattern.call(this, input_scanner, parent);
    	  this.__template_pattern = null;
    	  this._disabled = Object.assign({}, template_names);
    	  this._excluded = Object.assign({}, template_names);

    	  if (parent) {
    	    this.__template_pattern = this._input.get_regexp(parent.__template_pattern);
    	    this._excluded = Object.assign(this._excluded, parent._excluded);
    	    this._disabled = Object.assign(this._disabled, parent._disabled);
    	  }
    	  var pattern = new Pattern(input_scanner);
    	  this.__patterns = {
    	    handlebars_comment: pattern.starting_with(/{{!--/).until_after(/--}}/),
    	    handlebars_unescaped: pattern.starting_with(/{{{/).until_after(/}}}/),
    	    handlebars: pattern.starting_with(/{{/).until_after(/}}/),
    	    php: pattern.starting_with(/<\?(?:[= ]|php)/).until_after(/\?>/),
    	    erb: pattern.starting_with(/<%[^%]/).until_after(/[^%]%>/),
    	    // django coflicts with handlebars a bit.
    	    django: pattern.starting_with(/{%/).until_after(/%}/),
    	    django_value: pattern.starting_with(/{{/).until_after(/}}/),
    	    django_comment: pattern.starting_with(/{#/).until_after(/#}/),
    	    smarty: pattern.starting_with(/{(?=[^}{\s\n])/).until_after(/[^\s\n]}/),
    	    smarty_comment: pattern.starting_with(/{\*/).until_after(/\*}/),
    	    smarty_literal: pattern.starting_with(/{literal}/).until_after(/{\/literal}/)
    	  };
    	}
    	TemplatablePattern.prototype = new Pattern();

    	TemplatablePattern.prototype._create = function() {
    	  return new TemplatablePattern(this._input, this);
    	};

    	TemplatablePattern.prototype._update = function() {
    	  this.__set_templated_pattern();
    	};

    	TemplatablePattern.prototype.disable = function(language) {
    	  var result = this._create();
    	  result._disabled[language] = true;
    	  result._update();
    	  return result;
    	};

    	TemplatablePattern.prototype.read_options = function(options) {
    	  var result = this._create();
    	  for (var language in template_names) {
    	    result._disabled[language] = options.templating.indexOf(language) === -1;
    	  }
    	  result._update();
    	  return result;
    	};

    	TemplatablePattern.prototype.exclude = function(language) {
    	  var result = this._create();
    	  result._excluded[language] = true;
    	  result._update();
    	  return result;
    	};

    	TemplatablePattern.prototype.read = function() {
    	  var result = '';
    	  if (this._match_pattern) {
    	    result = this._input.read(this._starting_pattern);
    	  } else {
    	    result = this._input.read(this._starting_pattern, this.__template_pattern);
    	  }
    	  var next = this._read_template();
    	  while (next) {
    	    if (this._match_pattern) {
    	      next += this._input.read(this._match_pattern);
    	    } else {
    	      next += this._input.readUntil(this.__template_pattern);
    	    }
    	    result += next;
    	    next = this._read_template();
    	  }

    	  if (this._until_after) {
    	    result += this._input.readUntilAfter(this._until_pattern);
    	  }
    	  return result;
    	};

    	TemplatablePattern.prototype.__set_templated_pattern = function() {
    	  var items = [];

    	  if (!this._disabled.php) {
    	    items.push(this.__patterns.php._starting_pattern.source);
    	  }
    	  if (!this._disabled.handlebars) {
    	    items.push(this.__patterns.handlebars._starting_pattern.source);
    	  }
    	  if (!this._disabled.erb) {
    	    items.push(this.__patterns.erb._starting_pattern.source);
    	  }
    	  if (!this._disabled.django) {
    	    items.push(this.__patterns.django._starting_pattern.source);
    	    // The starting pattern for django is more complex because it has different
    	    // patterns for value, comment, and other sections
    	    items.push(this.__patterns.django_value._starting_pattern.source);
    	    items.push(this.__patterns.django_comment._starting_pattern.source);
    	  }
    	  if (!this._disabled.smarty) {
    	    items.push(this.__patterns.smarty._starting_pattern.source);
    	  }

    	  if (this._until_pattern) {
    	    items.push(this._until_pattern.source);
    	  }
    	  this.__template_pattern = this._input.get_regexp('(?:' + items.join('|') + ')');
    	};

    	TemplatablePattern.prototype._read_template = function() {
    	  var resulting_string = '';
    	  var c = this._input.peek();
    	  if (c === '<') {
    	    var peek1 = this._input.peek(1);
    	    //if we're in a comment, do something special
    	    // We treat all comments as literals, even more than preformatted tags
    	    // we just look for the appropriate close tag
    	    if (!this._disabled.php && !this._excluded.php && peek1 === '?') {
    	      resulting_string = resulting_string ||
    	        this.__patterns.php.read();
    	    }
    	    if (!this._disabled.erb && !this._excluded.erb && peek1 === '%') {
    	      resulting_string = resulting_string ||
    	        this.__patterns.erb.read();
    	    }
    	  } else if (c === '{') {
    	    if (!this._disabled.handlebars && !this._excluded.handlebars) {
    	      resulting_string = resulting_string ||
    	        this.__patterns.handlebars_comment.read();
    	      resulting_string = resulting_string ||
    	        this.__patterns.handlebars_unescaped.read();
    	      resulting_string = resulting_string ||
    	        this.__patterns.handlebars.read();
    	    }
    	    if (!this._disabled.django) {
    	      // django coflicts with handlebars a bit.
    	      if (!this._excluded.django && !this._excluded.handlebars) {
    	        resulting_string = resulting_string ||
    	          this.__patterns.django_value.read();
    	      }
    	      if (!this._excluded.django) {
    	        resulting_string = resulting_string ||
    	          this.__patterns.django_comment.read();
    	        resulting_string = resulting_string ||
    	          this.__patterns.django.read();
    	      }
    	    }
    	    if (!this._disabled.smarty) {
    	      // smarty cannot be enabled with django or handlebars enabled
    	      if (this._disabled.django && this._disabled.handlebars) {
    	        resulting_string = resulting_string ||
    	          this.__patterns.smarty_comment.read();
    	        resulting_string = resulting_string ||
    	          this.__patterns.smarty_literal.read();
    	        resulting_string = resulting_string ||
    	          this.__patterns.smarty.read();
    	      }
    	    }
    	  }
    	  return resulting_string;
    	};


    	templatablepattern.TemplatablePattern = TemplatablePattern;
    	return templatablepattern;
    }

    /*jshint node:true */

    var hasRequiredTokenizer$1;

    function requireTokenizer$1 () {
    	if (hasRequiredTokenizer$1) return tokenizer$2;
    	hasRequiredTokenizer$1 = 1;

    	var InputScanner = requireInputscanner().InputScanner;
    	var BaseTokenizer = requireTokenizer$2().Tokenizer;
    	var BASETOKEN = requireTokenizer$2().TOKEN;
    	var Directives = requireDirectives().Directives;
    	var acorn = requireAcorn();
    	var Pattern = requirePattern().Pattern;
    	var TemplatablePattern = requireTemplatablepattern().TemplatablePattern;


    	function in_array(what, arr) {
    	  return arr.indexOf(what) !== -1;
    	}


    	var TOKEN = {
    	  START_EXPR: 'TK_START_EXPR',
    	  END_EXPR: 'TK_END_EXPR',
    	  START_BLOCK: 'TK_START_BLOCK',
    	  END_BLOCK: 'TK_END_BLOCK',
    	  WORD: 'TK_WORD',
    	  RESERVED: 'TK_RESERVED',
    	  SEMICOLON: 'TK_SEMICOLON',
    	  STRING: 'TK_STRING',
    	  EQUALS: 'TK_EQUALS',
    	  OPERATOR: 'TK_OPERATOR',
    	  COMMA: 'TK_COMMA',
    	  BLOCK_COMMENT: 'TK_BLOCK_COMMENT',
    	  COMMENT: 'TK_COMMENT',
    	  DOT: 'TK_DOT',
    	  UNKNOWN: 'TK_UNKNOWN',
    	  START: BASETOKEN.START,
    	  RAW: BASETOKEN.RAW,
    	  EOF: BASETOKEN.EOF
    	};


    	var directives_core = new Directives(/\/\*/, /\*\//);

    	var number_pattern = /0[xX][0123456789abcdefABCDEF_]*n?|0[oO][01234567_]*n?|0[bB][01_]*n?|\d[\d_]*n|(?:\.\d[\d_]*|\d[\d_]*\.?[\d_]*)(?:[eE][+-]?[\d_]+)?/;

    	var digit = /[0-9]/;

    	// Dot "." must be distinguished from "..." and decimal
    	var dot_pattern = /[^\d\.]/;

    	var positionable_operators = (
    	  ">>> === !== &&= ??= ||= " +
    	  "<< && >= ** != == <= >> || ?? |> " +
    	  "< / - + > : & % ? ^ | *").split(' ');

    	// IMPORTANT: this must be sorted longest to shortest or tokenizing many not work.
    	// Also, you must update possitionable operators separately from punct
    	var punct =
    	  ">>>= " +
    	  "... >>= <<= === >>> !== **= &&= ??= ||= " +
    	  "=> ^= :: /= << <= == && -= >= >> != -- += ** || ?? ++ %= &= *= |= |> " +
    	  "= ! ? > < : / ^ - + * & % ~ |";

    	punct = punct.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
    	// ?. but not if followed by a number 
    	punct = '\\?\\.(?!\\d) ' + punct;
    	punct = punct.replace(/ /g, '|');

    	var punct_pattern = new RegExp(punct);

    	// words which should always start on new line.
    	var line_starters = 'continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,import,export'.split(',');
    	var reserved_words = line_starters.concat(['do', 'in', 'of', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof', 'yield', 'async', 'await', 'from', 'as', 'class', 'extends']);
    	var reserved_word_pattern = new RegExp('^(?:' + reserved_words.join('|') + ')$');

    	// var template_pattern = /(?:(?:<\?php|<\?=)[\s\S]*?\?>)|(?:<%[\s\S]*?%>)/g;

    	var in_html_comment;

    	var Tokenizer = function(input_string, options) {
    	  BaseTokenizer.call(this, input_string, options);

    	  this._patterns.whitespace = this._patterns.whitespace.matching(
    	    /\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff/.source,
    	    /\u2028\u2029/.source);

    	  var pattern_reader = new Pattern(this._input);
    	  var templatable = new TemplatablePattern(this._input)
    	    .read_options(this._options);

    	  this.__patterns = {
    	    template: templatable,
    	    identifier: templatable.starting_with(acorn.identifier).matching(acorn.identifierMatch),
    	    number: pattern_reader.matching(number_pattern),
    	    punct: pattern_reader.matching(punct_pattern),
    	    // comment ends just before nearest linefeed or end of file
    	    comment: pattern_reader.starting_with(/\/\//).until(/[\n\r\u2028\u2029]/),
    	    //  /* ... */ comment ends with nearest */ or end of file
    	    block_comment: pattern_reader.starting_with(/\/\*/).until_after(/\*\//),
    	    html_comment_start: pattern_reader.matching(/<!--/),
    	    html_comment_end: pattern_reader.matching(/-->/),
    	    include: pattern_reader.starting_with(/#include/).until_after(acorn.lineBreak),
    	    shebang: pattern_reader.starting_with(/#!/).until_after(acorn.lineBreak),
    	    xml: pattern_reader.matching(/[\s\S]*?<(\/?)([-a-zA-Z:0-9_.]+|{[^}]+?}|!\[CDATA\[[^\]]*?\]\]|)(\s*{[^}]+?}|\s+[-a-zA-Z:0-9_.]+|\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{([^{}]|{[^}]+?})+?}))*\s*(\/?)\s*>/),
    	    single_quote: templatable.until(/['\\\n\r\u2028\u2029]/),
    	    double_quote: templatable.until(/["\\\n\r\u2028\u2029]/),
    	    template_text: templatable.until(/[`\\$]/),
    	    template_expression: templatable.until(/[`}\\]/)
    	  };

    	};
    	Tokenizer.prototype = new BaseTokenizer();

    	Tokenizer.prototype._is_comment = function(current_token) {
    	  return current_token.type === TOKEN.COMMENT || current_token.type === TOKEN.BLOCK_COMMENT || current_token.type === TOKEN.UNKNOWN;
    	};

    	Tokenizer.prototype._is_opening = function(current_token) {
    	  return current_token.type === TOKEN.START_BLOCK || current_token.type === TOKEN.START_EXPR;
    	};

    	Tokenizer.prototype._is_closing = function(current_token, open_token) {
    	  return (current_token.type === TOKEN.END_BLOCK || current_token.type === TOKEN.END_EXPR) &&
    	    (open_token && (
    	      (current_token.text === ']' && open_token.text === '[') ||
    	      (current_token.text === ')' && open_token.text === '(') ||
    	      (current_token.text === '}' && open_token.text === '{')));
    	};

    	Tokenizer.prototype._reset = function() {
    	  in_html_comment = false;
    	};

    	Tokenizer.prototype._get_next_token = function(previous_token, open_token) { // jshint unused:false
    	  var token = null;
    	  this._readWhitespace();
    	  var c = this._input.peek();

    	  if (c === null) {
    	    return this._create_token(TOKEN.EOF, '');
    	  }

    	  token = token || this._read_non_javascript(c);
    	  token = token || this._read_string(c);
    	  token = token || this._read_pair(c, this._input.peek(1)); // Issue #2062 hack for record type '#{'
    	  token = token || this._read_word(previous_token);
    	  token = token || this._read_singles(c);
    	  token = token || this._read_comment(c);
    	  token = token || this._read_regexp(c, previous_token);
    	  token = token || this._read_xml(c, previous_token);
    	  token = token || this._read_punctuation();
    	  token = token || this._create_token(TOKEN.UNKNOWN, this._input.next());

    	  return token;
    	};

    	Tokenizer.prototype._read_word = function(previous_token) {
    	  var resulting_string;
    	  resulting_string = this.__patterns.identifier.read();
    	  if (resulting_string !== '') {
    	    resulting_string = resulting_string.replace(acorn.allLineBreaks, '\n');
    	    if (!(previous_token.type === TOKEN.DOT ||
    	        (previous_token.type === TOKEN.RESERVED && (previous_token.text === 'set' || previous_token.text === 'get'))) &&
    	      reserved_word_pattern.test(resulting_string)) {
    	      if ((resulting_string === 'in' || resulting_string === 'of') &&
    	        (previous_token.type === TOKEN.WORD || previous_token.type === TOKEN.STRING)) { // hack for 'in' and 'of' operators
    	        return this._create_token(TOKEN.OPERATOR, resulting_string);
    	      }
    	      return this._create_token(TOKEN.RESERVED, resulting_string);
    	    }
    	    return this._create_token(TOKEN.WORD, resulting_string);
    	  }

    	  resulting_string = this.__patterns.number.read();
    	  if (resulting_string !== '') {
    	    return this._create_token(TOKEN.WORD, resulting_string);
    	  }
    	};

    	Tokenizer.prototype._read_singles = function(c) {
    	  var token = null;
    	  if (c === '(' || c === '[') {
    	    token = this._create_token(TOKEN.START_EXPR, c);
    	  } else if (c === ')' || c === ']') {
    	    token = this._create_token(TOKEN.END_EXPR, c);
    	  } else if (c === '{') {
    	    token = this._create_token(TOKEN.START_BLOCK, c);
    	  } else if (c === '}') {
    	    token = this._create_token(TOKEN.END_BLOCK, c);
    	  } else if (c === ';') {
    	    token = this._create_token(TOKEN.SEMICOLON, c);
    	  } else if (c === '.' && dot_pattern.test(this._input.peek(1))) {
    	    token = this._create_token(TOKEN.DOT, c);
    	  } else if (c === ',') {
    	    token = this._create_token(TOKEN.COMMA, c);
    	  }

    	  if (token) {
    	    this._input.next();
    	  }
    	  return token;
    	};

    	Tokenizer.prototype._read_pair = function(c, d) {
    	  var token = null;
    	  if (c === '#' && d === '{') {
    	    token = this._create_token(TOKEN.START_BLOCK, c + d);
    	  }

    	  if (token) {
    	    this._input.next();
    	    this._input.next();
    	  }
    	  return token;
    	};

    	Tokenizer.prototype._read_punctuation = function() {
    	  var resulting_string = this.__patterns.punct.read();

    	  if (resulting_string !== '') {
    	    if (resulting_string === '=') {
    	      return this._create_token(TOKEN.EQUALS, resulting_string);
    	    } else if (resulting_string === '?.') {
    	      return this._create_token(TOKEN.DOT, resulting_string);
    	    } else {
    	      return this._create_token(TOKEN.OPERATOR, resulting_string);
    	    }
    	  }
    	};

    	Tokenizer.prototype._read_non_javascript = function(c) {
    	  var resulting_string = '';

    	  if (c === '#') {
    	    if (this._is_first_token()) {
    	      resulting_string = this.__patterns.shebang.read();

    	      if (resulting_string) {
    	        return this._create_token(TOKEN.UNKNOWN, resulting_string.trim() + '\n');
    	      }
    	    }

    	    // handles extendscript #includes
    	    resulting_string = this.__patterns.include.read();

    	    if (resulting_string) {
    	      return this._create_token(TOKEN.UNKNOWN, resulting_string.trim() + '\n');
    	    }

    	    c = this._input.next();

    	    // Spidermonkey-specific sharp variables for circular references. Considered obsolete.
    	    var sharp = '#';
    	    if (this._input.hasNext() && this._input.testChar(digit)) {
    	      do {
    	        c = this._input.next();
    	        sharp += c;
    	      } while (this._input.hasNext() && c !== '#' && c !== '=');
    	      if (c === '#') ; else if (this._input.peek() === '[' && this._input.peek(1) === ']') {
    	        sharp += '[]';
    	        this._input.next();
    	        this._input.next();
    	      } else if (this._input.peek() === '{' && this._input.peek(1) === '}') {
    	        sharp += '{}';
    	        this._input.next();
    	        this._input.next();
    	      }
    	      return this._create_token(TOKEN.WORD, sharp);
    	    }

    	    this._input.back();

    	  } else if (c === '<' && this._is_first_token()) {
    	    resulting_string = this.__patterns.html_comment_start.read();
    	    if (resulting_string) {
    	      while (this._input.hasNext() && !this._input.testChar(acorn.newline)) {
    	        resulting_string += this._input.next();
    	      }
    	      in_html_comment = true;
    	      return this._create_token(TOKEN.COMMENT, resulting_string);
    	    }
    	  } else if (in_html_comment && c === '-') {
    	    resulting_string = this.__patterns.html_comment_end.read();
    	    if (resulting_string) {
    	      in_html_comment = false;
    	      return this._create_token(TOKEN.COMMENT, resulting_string);
    	    }
    	  }

    	  return null;
    	};

    	Tokenizer.prototype._read_comment = function(c) {
    	  var token = null;
    	  if (c === '/') {
    	    var comment = '';
    	    if (this._input.peek(1) === '*') {
    	      // peek for comment /* ... */
    	      comment = this.__patterns.block_comment.read();
    	      var directives = directives_core.get_directives(comment);
    	      if (directives && directives.ignore === 'start') {
    	        comment += directives_core.readIgnored(this._input);
    	      }
    	      comment = comment.replace(acorn.allLineBreaks, '\n');
    	      token = this._create_token(TOKEN.BLOCK_COMMENT, comment);
    	      token.directives = directives;
    	    } else if (this._input.peek(1) === '/') {
    	      // peek for comment // ...
    	      comment = this.__patterns.comment.read();
    	      token = this._create_token(TOKEN.COMMENT, comment);
    	    }
    	  }
    	  return token;
    	};

    	Tokenizer.prototype._read_string = function(c) {
    	  if (c === '`' || c === "'" || c === '"') {
    	    var resulting_string = this._input.next();
    	    this.has_char_escapes = false;

    	    if (c === '`') {
    	      resulting_string += this._read_string_recursive('`', true, '${');
    	    } else {
    	      resulting_string += this._read_string_recursive(c);
    	    }

    	    if (this.has_char_escapes && this._options.unescape_strings) {
    	      resulting_string = unescape_string(resulting_string);
    	    }

    	    if (this._input.peek() === c) {
    	      resulting_string += this._input.next();
    	    }

    	    resulting_string = resulting_string.replace(acorn.allLineBreaks, '\n');

    	    return this._create_token(TOKEN.STRING, resulting_string);
    	  }

    	  return null;
    	};

    	Tokenizer.prototype._allow_regexp_or_xml = function(previous_token) {
    	  // regex and xml can only appear in specific locations during parsing
    	  return (previous_token.type === TOKEN.RESERVED && in_array(previous_token.text, ['return', 'case', 'throw', 'else', 'do', 'typeof', 'yield'])) ||
    	    (previous_token.type === TOKEN.END_EXPR && previous_token.text === ')' &&
    	      previous_token.opened.previous.type === TOKEN.RESERVED && in_array(previous_token.opened.previous.text, ['if', 'while', 'for'])) ||
    	    (in_array(previous_token.type, [TOKEN.COMMENT, TOKEN.START_EXPR, TOKEN.START_BLOCK, TOKEN.START,
    	      TOKEN.END_BLOCK, TOKEN.OPERATOR, TOKEN.EQUALS, TOKEN.EOF, TOKEN.SEMICOLON, TOKEN.COMMA
    	    ]));
    	};

    	Tokenizer.prototype._read_regexp = function(c, previous_token) {

    	  if (c === '/' && this._allow_regexp_or_xml(previous_token)) {
    	    // handle regexp
    	    //
    	    var resulting_string = this._input.next();
    	    var esc = false;

    	    var in_char_class = false;
    	    while (this._input.hasNext() &&
    	      ((esc || in_char_class || this._input.peek() !== c) &&
    	        !this._input.testChar(acorn.newline))) {
    	      resulting_string += this._input.peek();
    	      if (!esc) {
    	        esc = this._input.peek() === '\\';
    	        if (this._input.peek() === '[') {
    	          in_char_class = true;
    	        } else if (this._input.peek() === ']') {
    	          in_char_class = false;
    	        }
    	      } else {
    	        esc = false;
    	      }
    	      this._input.next();
    	    }

    	    if (this._input.peek() === c) {
    	      resulting_string += this._input.next();

    	      // regexps may have modifiers /regexp/MOD , so fetch those, too
    	      // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
    	      resulting_string += this._input.read(acorn.identifier);
    	    }
    	    return this._create_token(TOKEN.STRING, resulting_string);
    	  }
    	  return null;
    	};

    	Tokenizer.prototype._read_xml = function(c, previous_token) {

    	  if (this._options.e4x && c === "<" && this._allow_regexp_or_xml(previous_token)) {
    	    var xmlStr = '';
    	    var match = this.__patterns.xml.read_match();
    	    // handle e4x xml literals
    	    //
    	    if (match) {
    	      // Trim root tag to attempt to
    	      var rootTag = match[2].replace(/^{\s+/, '{').replace(/\s+}$/, '}');
    	      var isCurlyRoot = rootTag.indexOf('{') === 0;
    	      var depth = 0;
    	      while (match) {
    	        var isEndTag = !!match[1];
    	        var tagName = match[2];
    	        var isSingletonTag = (!!match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
    	        if (!isSingletonTag &&
    	          (tagName === rootTag || (isCurlyRoot && tagName.replace(/^{\s+/, '{').replace(/\s+}$/, '}')))) {
    	          if (isEndTag) {
    	            --depth;
    	          } else {
    	            ++depth;
    	          }
    	        }
    	        xmlStr += match[0];
    	        if (depth <= 0) {
    	          break;
    	        }
    	        match = this.__patterns.xml.read_match();
    	      }
    	      // if we didn't close correctly, keep unformatted.
    	      if (!match) {
    	        xmlStr += this._input.match(/[\s\S]*/g)[0];
    	      }
    	      xmlStr = xmlStr.replace(acorn.allLineBreaks, '\n');
    	      return this._create_token(TOKEN.STRING, xmlStr);
    	    }
    	  }

    	  return null;
    	};

    	function unescape_string(s) {
    	  // You think that a regex would work for this
    	  // return s.replace(/\\x([0-9a-f]{2})/gi, function(match, val) {
    	  //         return String.fromCharCode(parseInt(val, 16));
    	  //     })
    	  // However, dealing with '\xff', '\\xff', '\\\xff' makes this more fun.
    	  var out = '',
    	    escaped = 0;

    	  var input_scan = new InputScanner(s);
    	  var matched = null;

    	  while (input_scan.hasNext()) {
    	    // Keep any whitespace, non-slash characters
    	    // also keep slash pairs.
    	    matched = input_scan.match(/([\s]|[^\\]|\\\\)+/g);

    	    if (matched) {
    	      out += matched[0];
    	    }

    	    if (input_scan.peek() === '\\') {
    	      input_scan.next();
    	      if (input_scan.peek() === 'x') {
    	        matched = input_scan.match(/x([0-9A-Fa-f]{2})/g);
    	      } else if (input_scan.peek() === 'u') {
    	        matched = input_scan.match(/u([0-9A-Fa-f]{4})/g);
    	      } else {
    	        out += '\\';
    	        if (input_scan.hasNext()) {
    	          out += input_scan.next();
    	        }
    	        continue;
    	      }

    	      // If there's some error decoding, return the original string
    	      if (!matched) {
    	        return s;
    	      }

    	      escaped = parseInt(matched[1], 16);

    	      if (escaped > 0x7e && escaped <= 0xff && matched[0].indexOf('x') === 0) {
    	        // we bail out on \x7f..\xff,
    	        // leaving whole string escaped,
    	        // as it's probably completely binary
    	        return s;
    	      } else if (escaped >= 0x00 && escaped < 0x20) {
    	        // leave 0x00...0x1f escaped
    	        out += '\\' + matched[0];
    	        continue;
    	      } else if (escaped === 0x22 || escaped === 0x27 || escaped === 0x5c) {
    	        // single-quote, apostrophe, backslash - escape these
    	        out += '\\' + String.fromCharCode(escaped);
    	      } else {
    	        out += String.fromCharCode(escaped);
    	      }
    	    }
    	  }

    	  return out;
    	}

    	// handle string
    	//
    	Tokenizer.prototype._read_string_recursive = function(delimiter, allow_unescaped_newlines, start_sub) {
    	  var current_char;
    	  var pattern;
    	  if (delimiter === '\'') {
    	    pattern = this.__patterns.single_quote;
    	  } else if (delimiter === '"') {
    	    pattern = this.__patterns.double_quote;
    	  } else if (delimiter === '`') {
    	    pattern = this.__patterns.template_text;
    	  } else if (delimiter === '}') {
    	    pattern = this.__patterns.template_expression;
    	  }

    	  var resulting_string = pattern.read();
    	  var next = '';
    	  while (this._input.hasNext()) {
    	    next = this._input.next();
    	    if (next === delimiter ||
    	      (!allow_unescaped_newlines && acorn.newline.test(next))) {
    	      this._input.back();
    	      break;
    	    } else if (next === '\\' && this._input.hasNext()) {
    	      current_char = this._input.peek();

    	      if (current_char === 'x' || current_char === 'u') {
    	        this.has_char_escapes = true;
    	      } else if (current_char === '\r' && this._input.peek(1) === '\n') {
    	        this._input.next();
    	      }
    	      next += this._input.next();
    	    } else if (start_sub) {
    	      if (start_sub === '${' && next === '$' && this._input.peek() === '{') {
    	        next += this._input.next();
    	      }

    	      if (start_sub === next) {
    	        if (delimiter === '`') {
    	          next += this._read_string_recursive('}', allow_unescaped_newlines, '`');
    	        } else {
    	          next += this._read_string_recursive('`', allow_unescaped_newlines, '${');
    	        }
    	        if (this._input.hasNext()) {
    	          next += this._input.next();
    	        }
    	      }
    	    }
    	    next += pattern.read();
    	    resulting_string += next;
    	  }

    	  return resulting_string;
    	};

    	tokenizer$2.Tokenizer = Tokenizer;
    	tokenizer$2.TOKEN = TOKEN;
    	tokenizer$2.positionable_operators = positionable_operators.slice();
    	tokenizer$2.line_starters = line_starters.slice();
    	return tokenizer$2;
    }

    /*jshint node:true */

    var hasRequiredBeautifier$2;

    function requireBeautifier$2 () {
    	if (hasRequiredBeautifier$2) return beautifier$2;
    	hasRequiredBeautifier$2 = 1;

    	var Output = requireOutput().Output;
    	var Token = requireToken().Token;
    	var acorn = requireAcorn();
    	var Options = requireOptions$2().Options;
    	var Tokenizer = requireTokenizer$1().Tokenizer;
    	var line_starters = requireTokenizer$1().line_starters;
    	var positionable_operators = requireTokenizer$1().positionable_operators;
    	var TOKEN = requireTokenizer$1().TOKEN;


    	function in_array(what, arr) {
    	  return arr.indexOf(what) !== -1;
    	}

    	function ltrim(s) {
    	  return s.replace(/^\s+/g, '');
    	}

    	function generateMapFromStrings(list) {
    	  var result = {};
    	  for (var x = 0; x < list.length; x++) {
    	    // make the mapped names underscored instead of dash
    	    result[list[x].replace(/-/g, '_')] = list[x];
    	  }
    	  return result;
    	}

    	function reserved_word(token, word) {
    	  return token && token.type === TOKEN.RESERVED && token.text === word;
    	}

    	function reserved_array(token, words) {
    	  return token && token.type === TOKEN.RESERVED && in_array(token.text, words);
    	}
    	// Unsure of what they mean, but they work. Worth cleaning up in future.
    	var special_words = ['case', 'return', 'do', 'if', 'throw', 'else', 'await', 'break', 'continue', 'async'];

    	var validPositionValues = ['before-newline', 'after-newline', 'preserve-newline'];

    	// Generate map from array
    	var OPERATOR_POSITION = generateMapFromStrings(validPositionValues);

    	var OPERATOR_POSITION_BEFORE_OR_PRESERVE = [OPERATOR_POSITION.before_newline, OPERATOR_POSITION.preserve_newline];

    	var MODE = {
    	  BlockStatement: 'BlockStatement', // 'BLOCK'
    	  Statement: 'Statement', // 'STATEMENT'
    	  ObjectLiteral: 'ObjectLiteral', // 'OBJECT',
    	  ArrayLiteral: 'ArrayLiteral', //'[EXPRESSION]',
    	  ForInitializer: 'ForInitializer', //'(FOR-EXPRESSION)',
    	  Conditional: 'Conditional', //'(COND-EXPRESSION)',
    	  Expression: 'Expression' //'(EXPRESSION)'
    	};

    	function remove_redundant_indentation(output, frame) {
    	  // This implementation is effective but has some issues:
    	  //     - can cause line wrap to happen too soon due to indent removal
    	  //           after wrap points are calculated
    	  // These issues are minor compared to ugly indentation.

    	  if (frame.multiline_frame ||
    	    frame.mode === MODE.ForInitializer ||
    	    frame.mode === MODE.Conditional) {
    	    return;
    	  }

    	  // remove one indent from each line inside this section
    	  output.remove_indent(frame.start_line_index);
    	}

    	// we could use just string.split, but
    	// IE doesn't like returning empty strings
    	function split_linebreaks(s) {
    	  //return s.split(/\x0d\x0a|\x0a/);

    	  s = s.replace(acorn.allLineBreaks, '\n');
    	  var out = [],
    	    idx = s.indexOf("\n");
    	  while (idx !== -1) {
    	    out.push(s.substring(0, idx));
    	    s = s.substring(idx + 1);
    	    idx = s.indexOf("\n");
    	  }
    	  if (s.length) {
    	    out.push(s);
    	  }
    	  return out;
    	}

    	function is_array(mode) {
    	  return mode === MODE.ArrayLiteral;
    	}

    	function is_expression(mode) {
    	  return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
    	}

    	function all_lines_start_with(lines, c) {
    	  for (var i = 0; i < lines.length; i++) {
    	    var line = lines[i].trim();
    	    if (line.charAt(0) !== c) {
    	      return false;
    	    }
    	  }
    	  return true;
    	}

    	function each_line_matches_indent(lines, indent) {
    	  var i = 0,
    	    len = lines.length,
    	    line;
    	  for (; i < len; i++) {
    	    line = lines[i];
    	    // allow empty lines to pass through
    	    if (line && line.indexOf(indent) !== 0) {
    	      return false;
    	    }
    	  }
    	  return true;
    	}


    	function Beautifier(source_text, options) {
    	  options = options || {};
    	  this._source_text = source_text || '';

    	  this._output = null;
    	  this._tokens = null;
    	  this._last_last_text = null;
    	  this._flags = null;
    	  this._previous_flags = null;

    	  this._flag_store = null;
    	  this._options = new Options(options);
    	}

    	Beautifier.prototype.create_flags = function(flags_base, mode) {
    	  var next_indent_level = 0;
    	  if (flags_base) {
    	    next_indent_level = flags_base.indentation_level;
    	    if (!this._output.just_added_newline() &&
    	      flags_base.line_indent_level > next_indent_level) {
    	      next_indent_level = flags_base.line_indent_level;
    	    }
    	  }

    	  var next_flags = {
    	    mode: mode,
    	    parent: flags_base,
    	    last_token: flags_base ? flags_base.last_token : new Token(TOKEN.START_BLOCK, ''), // last token text
    	    last_word: flags_base ? flags_base.last_word : '', // last TOKEN.WORD passed
    	    declaration_statement: false,
    	    declaration_assignment: false,
    	    multiline_frame: false,
    	    inline_frame: false,
    	    if_block: false,
    	    else_block: false,
    	    class_start_block: false, // class A { INSIDE HERE } or class B extends C { INSIDE HERE }
    	    do_block: false,
    	    do_while: false,
    	    import_block: false,
    	    in_case_statement: false, // switch(..){ INSIDE HERE }
    	    in_case: false, // we're on the exact line with "case 0:"
    	    case_body: false, // the indented case-action block
    	    case_block: false, // the indented case-action block is wrapped with {}
    	    indentation_level: next_indent_level,
    	    alignment: 0,
    	    line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
    	    start_line_index: this._output.get_line_number(),
    	    ternary_depth: 0
    	  };
    	  return next_flags;
    	};

    	Beautifier.prototype._reset = function(source_text) {
    	  var baseIndentString = source_text.match(/^[\t ]*/)[0];

    	  this._last_last_text = ''; // pre-last token text
    	  this._output = new Output(this._options, baseIndentString);

    	  // If testing the ignore directive, start with output disable set to true
    	  this._output.raw = this._options.test_output_raw;


    	  // Stack of parsing/formatting states, including MODE.
    	  // We tokenize, parse, and output in an almost purely a forward-only stream of token input
    	  // and formatted output.  This makes the beautifier less accurate than full parsers
    	  // but also far more tolerant of syntax errors.
    	  //
    	  // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
    	  // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
    	  // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
    	  // most full parsers would die, but the beautifier gracefully falls back to
    	  // MODE.BlockStatement and continues on.
    	  this._flag_store = [];
    	  this.set_mode(MODE.BlockStatement);
    	  var tokenizer = new Tokenizer(source_text, this._options);
    	  this._tokens = tokenizer.tokenize();
    	  return source_text;
    	};

    	Beautifier.prototype.beautify = function() {
    	  // if disabled, return the input unchanged.
    	  if (this._options.disabled) {
    	    return this._source_text;
    	  }

    	  var sweet_code;
    	  var source_text = this._reset(this._source_text);

    	  var eol = this._options.eol;
    	  if (this._options.eol === 'auto') {
    	    eol = '\n';
    	    if (source_text && acorn.lineBreak.test(source_text || '')) {
    	      eol = source_text.match(acorn.lineBreak)[0];
    	    }
    	  }

    	  var current_token = this._tokens.next();
    	  while (current_token) {
    	    this.handle_token(current_token);

    	    this._last_last_text = this._flags.last_token.text;
    	    this._flags.last_token = current_token;

    	    current_token = this._tokens.next();
    	  }

    	  sweet_code = this._output.get_code(eol);

    	  return sweet_code;
    	};

    	Beautifier.prototype.handle_token = function(current_token, preserve_statement_flags) {
    	  if (current_token.type === TOKEN.START_EXPR) {
    	    this.handle_start_expr(current_token);
    	  } else if (current_token.type === TOKEN.END_EXPR) {
    	    this.handle_end_expr(current_token);
    	  } else if (current_token.type === TOKEN.START_BLOCK) {
    	    this.handle_start_block(current_token);
    	  } else if (current_token.type === TOKEN.END_BLOCK) {
    	    this.handle_end_block(current_token);
    	  } else if (current_token.type === TOKEN.WORD) {
    	    this.handle_word(current_token);
    	  } else if (current_token.type === TOKEN.RESERVED) {
    	    this.handle_word(current_token);
    	  } else if (current_token.type === TOKEN.SEMICOLON) {
    	    this.handle_semicolon(current_token);
    	  } else if (current_token.type === TOKEN.STRING) {
    	    this.handle_string(current_token);
    	  } else if (current_token.type === TOKEN.EQUALS) {
    	    this.handle_equals(current_token);
    	  } else if (current_token.type === TOKEN.OPERATOR) {
    	    this.handle_operator(current_token);
    	  } else if (current_token.type === TOKEN.COMMA) {
    	    this.handle_comma(current_token);
    	  } else if (current_token.type === TOKEN.BLOCK_COMMENT) {
    	    this.handle_block_comment(current_token, preserve_statement_flags);
    	  } else if (current_token.type === TOKEN.COMMENT) {
    	    this.handle_comment(current_token, preserve_statement_flags);
    	  } else if (current_token.type === TOKEN.DOT) {
    	    this.handle_dot(current_token);
    	  } else if (current_token.type === TOKEN.EOF) {
    	    this.handle_eof(current_token);
    	  } else if (current_token.type === TOKEN.UNKNOWN) {
    	    this.handle_unknown(current_token, preserve_statement_flags);
    	  } else {
    	    this.handle_unknown(current_token, preserve_statement_flags);
    	  }
    	};

    	Beautifier.prototype.handle_whitespace_and_comments = function(current_token, preserve_statement_flags) {
    	  var newlines = current_token.newlines;
    	  var keep_whitespace = this._options.keep_array_indentation && is_array(this._flags.mode);

    	  if (current_token.comments_before) {
    	    var comment_token = current_token.comments_before.next();
    	    while (comment_token) {
    	      // The cleanest handling of inline comments is to treat them as though they aren't there.
    	      // Just continue formatting and the behavior should be logical.
    	      // Also ignore unknown tokens.  Again, this should result in better behavior.
    	      this.handle_whitespace_and_comments(comment_token, preserve_statement_flags);
    	      this.handle_token(comment_token, preserve_statement_flags);
    	      comment_token = current_token.comments_before.next();
    	    }
    	  }

    	  if (keep_whitespace) {
    	    for (var i = 0; i < newlines; i += 1) {
    	      this.print_newline(i > 0, preserve_statement_flags);
    	    }
    	  } else {
    	    if (this._options.max_preserve_newlines && newlines > this._options.max_preserve_newlines) {
    	      newlines = this._options.max_preserve_newlines;
    	    }

    	    if (this._options.preserve_newlines) {
    	      if (newlines > 1) {
    	        this.print_newline(false, preserve_statement_flags);
    	        for (var j = 1; j < newlines; j += 1) {
    	          this.print_newline(true, preserve_statement_flags);
    	        }
    	      }
    	    }
    	  }

    	};

    	var newline_restricted_tokens = ['async', 'break', 'continue', 'return', 'throw', 'yield'];

    	Beautifier.prototype.allow_wrap_or_preserved_newline = function(current_token, force_linewrap) {
    	  force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

    	  // Never wrap the first token on a line
    	  if (this._output.just_added_newline()) {
    	    return;
    	  }

    	  var shouldPreserveOrForce = (this._options.preserve_newlines && current_token.newlines) || force_linewrap;
    	  var operatorLogicApplies = in_array(this._flags.last_token.text, positionable_operators) ||
    	    in_array(current_token.text, positionable_operators);

    	  if (operatorLogicApplies) {
    	    var shouldPrintOperatorNewline = (
    	        in_array(this._flags.last_token.text, positionable_operators) &&
    	        in_array(this._options.operator_position, OPERATOR_POSITION_BEFORE_OR_PRESERVE)
    	      ) ||
    	      in_array(current_token.text, positionable_operators);
    	    shouldPreserveOrForce = shouldPreserveOrForce && shouldPrintOperatorNewline;
    	  }

    	  if (shouldPreserveOrForce) {
    	    this.print_newline(false, true);
    	  } else if (this._options.wrap_line_length) {
    	    if (reserved_array(this._flags.last_token, newline_restricted_tokens)) {
    	      // These tokens should never have a newline inserted
    	      // between them and the following expression.
    	      return;
    	    }
    	    this._output.set_wrap_point();
    	  }
    	};

    	Beautifier.prototype.print_newline = function(force_newline, preserve_statement_flags) {
    	  if (!preserve_statement_flags) {
    	    if (this._flags.last_token.text !== ';' && this._flags.last_token.text !== ',' && this._flags.last_token.text !== '=' && (this._flags.last_token.type !== TOKEN.OPERATOR || this._flags.last_token.text === '--' || this._flags.last_token.text === '++')) {
    	      var next_token = this._tokens.peek();
    	      while (this._flags.mode === MODE.Statement &&
    	        !(this._flags.if_block && reserved_word(next_token, 'else')) &&
    	        !this._flags.do_block) {
    	        this.restore_mode();
    	      }
    	    }
    	  }

    	  if (this._output.add_new_line(force_newline)) {
    	    this._flags.multiline_frame = true;
    	  }
    	};

    	Beautifier.prototype.print_token_line_indentation = function(current_token) {
    	  if (this._output.just_added_newline()) {
    	    if (this._options.keep_array_indentation &&
    	      current_token.newlines &&
    	      (current_token.text === '[' || is_array(this._flags.mode))) {
    	      this._output.current_line.set_indent(-1);
    	      this._output.current_line.push(current_token.whitespace_before);
    	      this._output.space_before_token = false;
    	    } else if (this._output.set_indent(this._flags.indentation_level, this._flags.alignment)) {
    	      this._flags.line_indent_level = this._flags.indentation_level;
    	    }
    	  }
    	};

    	Beautifier.prototype.print_token = function(current_token) {
    	  if (this._output.raw) {
    	    this._output.add_raw_token(current_token);
    	    return;
    	  }

    	  if (this._options.comma_first && current_token.previous && current_token.previous.type === TOKEN.COMMA &&
    	    this._output.just_added_newline()) {
    	    if (this._output.previous_line.last() === ',') {
    	      var popped = this._output.previous_line.pop();
    	      // if the comma was already at the start of the line,
    	      // pull back onto that line and reprint the indentation
    	      if (this._output.previous_line.is_empty()) {
    	        this._output.previous_line.push(popped);
    	        this._output.trim(true);
    	        this._output.current_line.pop();
    	        this._output.trim();
    	      }

    	      // add the comma in front of the next token
    	      this.print_token_line_indentation(current_token);
    	      this._output.add_token(',');
    	      this._output.space_before_token = true;
    	    }
    	  }

    	  this.print_token_line_indentation(current_token);
    	  this._output.non_breaking_space = true;
    	  this._output.add_token(current_token.text);
    	  if (this._output.previous_token_wrapped) {
    	    this._flags.multiline_frame = true;
    	  }
    	};

    	Beautifier.prototype.indent = function() {
    	  this._flags.indentation_level += 1;
    	  this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
    	};

    	Beautifier.prototype.deindent = function() {
    	  if (this._flags.indentation_level > 0 &&
    	    ((!this._flags.parent) || this._flags.indentation_level > this._flags.parent.indentation_level)) {
    	    this._flags.indentation_level -= 1;
    	    this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
    	  }
    	};

    	Beautifier.prototype.set_mode = function(mode) {
    	  if (this._flags) {
    	    this._flag_store.push(this._flags);
    	    this._previous_flags = this._flags;
    	  } else {
    	    this._previous_flags = this.create_flags(null, mode);
    	  }

    	  this._flags = this.create_flags(this._previous_flags, mode);
    	  this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
    	};


    	Beautifier.prototype.restore_mode = function() {
    	  if (this._flag_store.length > 0) {
    	    this._previous_flags = this._flags;
    	    this._flags = this._flag_store.pop();
    	    if (this._previous_flags.mode === MODE.Statement) {
    	      remove_redundant_indentation(this._output, this._previous_flags);
    	    }
    	    this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
    	  }
    	};

    	Beautifier.prototype.start_of_object_property = function() {
    	  return this._flags.parent.mode === MODE.ObjectLiteral && this._flags.mode === MODE.Statement && (
    	    (this._flags.last_token.text === ':' && this._flags.ternary_depth === 0) || (reserved_array(this._flags.last_token, ['get', 'set'])));
    	};

    	Beautifier.prototype.start_of_statement = function(current_token) {
    	  var start = false;
    	  start = start || reserved_array(this._flags.last_token, ['var', 'let', 'const']) && current_token.type === TOKEN.WORD;
    	  start = start || reserved_word(this._flags.last_token, 'do');
    	  start = start || (!(this._flags.parent.mode === MODE.ObjectLiteral && this._flags.mode === MODE.Statement)) && reserved_array(this._flags.last_token, newline_restricted_tokens) && !current_token.newlines;
    	  start = start || reserved_word(this._flags.last_token, 'else') &&
    	    !(reserved_word(current_token, 'if') && !current_token.comments_before);
    	  start = start || (this._flags.last_token.type === TOKEN.END_EXPR && (this._previous_flags.mode === MODE.ForInitializer || this._previous_flags.mode === MODE.Conditional));
    	  start = start || (this._flags.last_token.type === TOKEN.WORD && this._flags.mode === MODE.BlockStatement &&
    	    !this._flags.in_case &&
    	    !(current_token.text === '--' || current_token.text === '++') &&
    	    this._last_last_text !== 'function' &&
    	    current_token.type !== TOKEN.WORD && current_token.type !== TOKEN.RESERVED);
    	  start = start || (this._flags.mode === MODE.ObjectLiteral && (
    	    (this._flags.last_token.text === ':' && this._flags.ternary_depth === 0) || reserved_array(this._flags.last_token, ['get', 'set'])));

    	  if (start) {
    	    this.set_mode(MODE.Statement);
    	    this.indent();

    	    this.handle_whitespace_and_comments(current_token, true);

    	    // Issue #276:
    	    // If starting a new statement with [if, for, while, do], push to a new line.
    	    // if (a) if (b) if(c) d(); else e(); else f();
    	    if (!this.start_of_object_property()) {
    	      this.allow_wrap_or_preserved_newline(current_token,
    	        reserved_array(current_token, ['do', 'for', 'if', 'while']));
    	    }
    	    return true;
    	  }
    	  return false;
    	};

    	Beautifier.prototype.handle_start_expr = function(current_token) {
    	  // The conditional starts the statement if appropriate.
    	  if (!this.start_of_statement(current_token)) {
    	    this.handle_whitespace_and_comments(current_token);
    	  }

    	  var next_mode = MODE.Expression;
    	  if (current_token.text === '[') {

    	    if (this._flags.last_token.type === TOKEN.WORD || this._flags.last_token.text === ')') {
    	      // this is array index specifier, break immediately
    	      // a[x], fn()[x]
    	      if (reserved_array(this._flags.last_token, line_starters)) {
    	        this._output.space_before_token = true;
    	      }
    	      this.print_token(current_token);
    	      this.set_mode(next_mode);
    	      this.indent();
    	      if (this._options.space_in_paren) {
    	        this._output.space_before_token = true;
    	      }
    	      return;
    	    }

    	    next_mode = MODE.ArrayLiteral;
    	    if (is_array(this._flags.mode)) {
    	      if (this._flags.last_token.text === '[' ||
    	        (this._flags.last_token.text === ',' && (this._last_last_text === ']' || this._last_last_text === '}'))) {
    	        // ], [ goes to new line
    	        // }, [ goes to new line
    	        if (!this._options.keep_array_indentation) {
    	          this.print_newline();
    	        }
    	      }
    	    }

    	    if (!in_array(this._flags.last_token.type, [TOKEN.START_EXPR, TOKEN.END_EXPR, TOKEN.WORD, TOKEN.OPERATOR, TOKEN.DOT])) {
    	      this._output.space_before_token = true;
    	    }
    	  } else {
    	    if (this._flags.last_token.type === TOKEN.RESERVED) {
    	      if (this._flags.last_token.text === 'for') {
    	        this._output.space_before_token = this._options.space_before_conditional;
    	        next_mode = MODE.ForInitializer;
    	      } else if (in_array(this._flags.last_token.text, ['if', 'while', 'switch'])) {
    	        this._output.space_before_token = this._options.space_before_conditional;
    	        next_mode = MODE.Conditional;
    	      } else if (in_array(this._flags.last_word, ['await', 'async'])) {
    	        // Should be a space between await and an IIFE, or async and an arrow function
    	        this._output.space_before_token = true;
    	      } else if (this._flags.last_token.text === 'import' && current_token.whitespace_before === '') {
    	        this._output.space_before_token = false;
    	      } else if (in_array(this._flags.last_token.text, line_starters) || this._flags.last_token.text === 'catch') {
    	        this._output.space_before_token = true;
    	      }
    	    } else if (this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
    	      // Support of this kind of newline preservation.
    	      // a = (b &&
    	      //     (c || d));
    	      if (!this.start_of_object_property()) {
    	        this.allow_wrap_or_preserved_newline(current_token);
    	      }
    	    } else if (this._flags.last_token.type === TOKEN.WORD) {
    	      this._output.space_before_token = false;

    	      // function name() vs function name ()
    	      // function* name() vs function* name ()
    	      // async name() vs async name ()
    	      // In ES6, you can also define the method properties of an object
    	      // var obj = {a: function() {}}
    	      // It can be abbreviated
    	      // var obj = {a() {}}
    	      // var obj = { a() {}} vs var obj = { a () {}}
    	      // var obj = { * a() {}} vs var obj = { * a () {}}
    	      var peek_back_two = this._tokens.peek(-3);
    	      if (this._options.space_after_named_function && peek_back_two) {
    	        // peek starts at next character so -1 is current token
    	        var peek_back_three = this._tokens.peek(-4);
    	        if (reserved_array(peek_back_two, ['async', 'function']) ||
    	          (peek_back_two.text === '*' && reserved_array(peek_back_three, ['async', 'function']))) {
    	          this._output.space_before_token = true;
    	        } else if (this._flags.mode === MODE.ObjectLiteral) {
    	          if ((peek_back_two.text === '{' || peek_back_two.text === ',') ||
    	            (peek_back_two.text === '*' && (peek_back_three.text === '{' || peek_back_three.text === ','))) {
    	            this._output.space_before_token = true;
    	          }
    	        } else if (this._flags.parent && this._flags.parent.class_start_block) {
    	          this._output.space_before_token = true;
    	        }
    	      }
    	    } else {
    	      // Support preserving wrapped arrow function expressions
    	      // a.b('c',
    	      //     () => d.e
    	      // )
    	      this.allow_wrap_or_preserved_newline(current_token);
    	    }

    	    // function() vs function ()
    	    // yield*() vs yield* ()
    	    // function*() vs function* ()
    	    if ((this._flags.last_token.type === TOKEN.RESERVED && (this._flags.last_word === 'function' || this._flags.last_word === 'typeof')) ||
    	      (this._flags.last_token.text === '*' &&
    	        (in_array(this._last_last_text, ['function', 'yield']) ||
    	          (this._flags.mode === MODE.ObjectLiteral && in_array(this._last_last_text, ['{', ',']))))) {
    	      this._output.space_before_token = this._options.space_after_anon_function;
    	    }
    	  }

    	  if (this._flags.last_token.text === ';' || this._flags.last_token.type === TOKEN.START_BLOCK) {
    	    this.print_newline();
    	  } else if (this._flags.last_token.type === TOKEN.END_EXPR || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.END_BLOCK || this._flags.last_token.text === '.' || this._flags.last_token.type === TOKEN.COMMA) {
    	    // do nothing on (( and )( and ][ and ]( and .(
    	    // TODO: Consider whether forcing this is required.  Review failing tests when removed.
    	    this.allow_wrap_or_preserved_newline(current_token, current_token.newlines);
    	  }

    	  this.print_token(current_token);
    	  this.set_mode(next_mode);
    	  if (this._options.space_in_paren) {
    	    this._output.space_before_token = true;
    	  }

    	  // In all cases, if we newline while inside an expression it should be indented.
    	  this.indent();
    	};

    	Beautifier.prototype.handle_end_expr = function(current_token) {
    	  // statements inside expressions are not valid syntax, but...
    	  // statements must all be closed when their container closes
    	  while (this._flags.mode === MODE.Statement) {
    	    this.restore_mode();
    	  }

    	  this.handle_whitespace_and_comments(current_token);

    	  if (this._flags.multiline_frame) {
    	    this.allow_wrap_or_preserved_newline(current_token,
    	      current_token.text === ']' && is_array(this._flags.mode) && !this._options.keep_array_indentation);
    	  }

    	  if (this._options.space_in_paren) {
    	    if (this._flags.last_token.type === TOKEN.START_EXPR && !this._options.space_in_empty_paren) {
    	      // () [] no inner space in empty parens like these, ever, ref #320
    	      this._output.trim();
    	      this._output.space_before_token = false;
    	    } else {
    	      this._output.space_before_token = true;
    	    }
    	  }
    	  this.deindent();
    	  this.print_token(current_token);
    	  this.restore_mode();

    	  remove_redundant_indentation(this._output, this._previous_flags);

    	  // do {} while () // no statement required after
    	  if (this._flags.do_while && this._previous_flags.mode === MODE.Conditional) {
    	    this._previous_flags.mode = MODE.Expression;
    	    this._flags.do_block = false;
    	    this._flags.do_while = false;

    	  }
    	};

    	Beautifier.prototype.handle_start_block = function(current_token) {
    	  this.handle_whitespace_and_comments(current_token);

    	  // Check if this is should be treated as a ObjectLiteral
    	  var next_token = this._tokens.peek();
    	  var second_token = this._tokens.peek(1);
    	  if (this._flags.last_word === 'switch' && this._flags.last_token.type === TOKEN.END_EXPR) {
    	    this.set_mode(MODE.BlockStatement);
    	    this._flags.in_case_statement = true;
    	  } else if (this._flags.case_body) {
    	    this.set_mode(MODE.BlockStatement);
    	  } else if (second_token && (
    	      (in_array(second_token.text, [':', ',']) && in_array(next_token.type, [TOKEN.STRING, TOKEN.WORD, TOKEN.RESERVED])) ||
    	      (in_array(next_token.text, ['get', 'set', '...']) && in_array(second_token.type, [TOKEN.WORD, TOKEN.RESERVED]))
    	    )) {
    	    // We don't support TypeScript,but we didn't break it for a very long time.
    	    // We'll try to keep not breaking it.
    	    if (in_array(this._last_last_text, ['class', 'interface']) && !in_array(second_token.text, [':', ','])) {
    	      this.set_mode(MODE.BlockStatement);
    	    } else {
    	      this.set_mode(MODE.ObjectLiteral);
    	    }
    	  } else if (this._flags.last_token.type === TOKEN.OPERATOR && this._flags.last_token.text === '=>') {
    	    // arrow function: (param1, paramN) => { statements }
    	    this.set_mode(MODE.BlockStatement);
    	  } else if (in_array(this._flags.last_token.type, [TOKEN.EQUALS, TOKEN.START_EXPR, TOKEN.COMMA, TOKEN.OPERATOR]) ||
    	    reserved_array(this._flags.last_token, ['return', 'throw', 'import', 'default'])
    	  ) {
    	    // Detecting shorthand function syntax is difficult by scanning forward,
    	    //     so check the surrounding context.
    	    // If the block is being returned, imported, export default, passed as arg,
    	    //     assigned with = or assigned in a nested object, treat as an ObjectLiteral.
    	    this.set_mode(MODE.ObjectLiteral);
    	  } else {
    	    this.set_mode(MODE.BlockStatement);
    	  }

    	  if (this._flags.last_token) {
    	    if (reserved_array(this._flags.last_token.previous, ['class', 'extends'])) {
    	      this._flags.class_start_block = true;
    	    }
    	  }

    	  var empty_braces = !next_token.comments_before && next_token.text === '}';
    	  var empty_anonymous_function = empty_braces && this._flags.last_word === 'function' &&
    	    this._flags.last_token.type === TOKEN.END_EXPR;

    	  if (this._options.brace_preserve_inline) // check for inline, set inline_frame if so
    	  {
    	    // search forward for a newline wanted inside this block
    	    var index = 0;
    	    var check_token = null;
    	    this._flags.inline_frame = true;
    	    do {
    	      index += 1;
    	      check_token = this._tokens.peek(index - 1);
    	      if (check_token.newlines) {
    	        this._flags.inline_frame = false;
    	        break;
    	      }
    	    } while (check_token.type !== TOKEN.EOF &&
    	      !(check_token.type === TOKEN.END_BLOCK && check_token.opened === current_token));
    	  }

    	  if ((this._options.brace_style === "expand" ||
    	      (this._options.brace_style === "none" && current_token.newlines)) &&
    	    !this._flags.inline_frame) {
    	    if (this._flags.last_token.type !== TOKEN.OPERATOR &&
    	      (empty_anonymous_function ||
    	        this._flags.last_token.type === TOKEN.EQUALS ||
    	        (reserved_array(this._flags.last_token, special_words) && this._flags.last_token.text !== 'else'))) {
    	      this._output.space_before_token = true;
    	    } else {
    	      this.print_newline(false, true);
    	    }
    	  } else { // collapse || inline_frame
    	    if (is_array(this._previous_flags.mode) && (this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.COMMA)) {
    	      if (this._flags.last_token.type === TOKEN.COMMA || this._options.space_in_paren) {
    	        this._output.space_before_token = true;
    	      }

    	      if (this._flags.last_token.type === TOKEN.COMMA || (this._flags.last_token.type === TOKEN.START_EXPR && this._flags.inline_frame)) {
    	        this.allow_wrap_or_preserved_newline(current_token);
    	        this._previous_flags.multiline_frame = this._previous_flags.multiline_frame || this._flags.multiline_frame;
    	        this._flags.multiline_frame = false;
    	      }
    	    }
    	    if (this._flags.last_token.type !== TOKEN.OPERATOR && this._flags.last_token.type !== TOKEN.START_EXPR) {
    	      if (in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.SEMICOLON]) && !this._flags.inline_frame) {
    	        this.print_newline();
    	      } else {
    	        this._output.space_before_token = true;
    	      }
    	    }
    	  }
    	  this.print_token(current_token);
    	  this.indent();

    	  // Except for specific cases, open braces are followed by a new line.
    	  if (!empty_braces && !(this._options.brace_preserve_inline && this._flags.inline_frame)) {
    	    this.print_newline();
    	  }
    	};

    	Beautifier.prototype.handle_end_block = function(current_token) {
    	  // statements must all be closed when their container closes
    	  this.handle_whitespace_and_comments(current_token);

    	  while (this._flags.mode === MODE.Statement) {
    	    this.restore_mode();
    	  }

    	  var empty_braces = this._flags.last_token.type === TOKEN.START_BLOCK;

    	  if (this._flags.inline_frame && !empty_braces) { // try inline_frame (only set if this._options.braces-preserve-inline) first
    	    this._output.space_before_token = true;
    	  } else if (this._options.brace_style === "expand") {
    	    if (!empty_braces) {
    	      this.print_newline();
    	    }
    	  } else {
    	    // skip {}
    	    if (!empty_braces) {
    	      if (is_array(this._flags.mode) && this._options.keep_array_indentation) {
    	        // we REALLY need a newline here, but newliner would skip that
    	        this._options.keep_array_indentation = false;
    	        this.print_newline();
    	        this._options.keep_array_indentation = true;

    	      } else {
    	        this.print_newline();
    	      }
    	    }
    	  }
    	  this.restore_mode();
    	  this.print_token(current_token);
    	};

    	Beautifier.prototype.handle_word = function(current_token) {
    	  if (current_token.type === TOKEN.RESERVED) {
    	    if (in_array(current_token.text, ['set', 'get']) && this._flags.mode !== MODE.ObjectLiteral) {
    	      current_token.type = TOKEN.WORD;
    	    } else if (current_token.text === 'import' && in_array(this._tokens.peek().text, ['(', '.'])) {
    	      current_token.type = TOKEN.WORD;
    	    } else if (in_array(current_token.text, ['as', 'from']) && !this._flags.import_block) {
    	      current_token.type = TOKEN.WORD;
    	    } else if (this._flags.mode === MODE.ObjectLiteral) {
    	      var next_token = this._tokens.peek();
    	      if (next_token.text === ':') {
    	        current_token.type = TOKEN.WORD;
    	      }
    	    }
    	  }

    	  if (this.start_of_statement(current_token)) {
    	    // The conditional starts the statement if appropriate.
    	    if (reserved_array(this._flags.last_token, ['var', 'let', 'const']) && current_token.type === TOKEN.WORD) {
    	      this._flags.declaration_statement = true;
    	    }
    	  } else if (current_token.newlines && !is_expression(this._flags.mode) &&
    	    (this._flags.last_token.type !== TOKEN.OPERATOR || (this._flags.last_token.text === '--' || this._flags.last_token.text === '++')) &&
    	    this._flags.last_token.type !== TOKEN.EQUALS &&
    	    (this._options.preserve_newlines || !reserved_array(this._flags.last_token, ['var', 'let', 'const', 'set', 'get']))) {
    	    this.handle_whitespace_and_comments(current_token);
    	    this.print_newline();
    	  } else {
    	    this.handle_whitespace_and_comments(current_token);
    	  }

    	  if (this._flags.do_block && !this._flags.do_while) {
    	    if (reserved_word(current_token, 'while')) {
    	      // do {} ## while ()
    	      this._output.space_before_token = true;
    	      this.print_token(current_token);
    	      this._output.space_before_token = true;
    	      this._flags.do_while = true;
    	      return;
    	    } else {
    	      // do {} should always have while as the next word.
    	      // if we don't see the expected while, recover
    	      this.print_newline();
    	      this._flags.do_block = false;
    	    }
    	  }

    	  // if may be followed by else, or not
    	  // Bare/inline ifs are tricky
    	  // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
    	  if (this._flags.if_block) {
    	    if (!this._flags.else_block && reserved_word(current_token, 'else')) {
    	      this._flags.else_block = true;
    	    } else {
    	      while (this._flags.mode === MODE.Statement) {
    	        this.restore_mode();
    	      }
    	      this._flags.if_block = false;
    	      this._flags.else_block = false;
    	    }
    	  }

    	  if (this._flags.in_case_statement && reserved_array(current_token, ['case', 'default'])) {
    	    this.print_newline();
    	    if (!this._flags.case_block && (this._flags.case_body || this._options.jslint_happy)) {
    	      // switch cases following one another
    	      this.deindent();
    	    }
    	    this._flags.case_body = false;

    	    this.print_token(current_token);
    	    this._flags.in_case = true;
    	    return;
    	  }

    	  if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
    	    if (!this.start_of_object_property()) {
    	      this.allow_wrap_or_preserved_newline(current_token);
    	    }
    	  }

    	  if (reserved_word(current_token, 'function')) {
    	    if (in_array(this._flags.last_token.text, ['}', ';']) ||
    	      (this._output.just_added_newline() && !(in_array(this._flags.last_token.text, ['(', '[', '{', ':', '=', ',']) || this._flags.last_token.type === TOKEN.OPERATOR))) {
    	      // make sure there is a nice clean space of at least one blank line
    	      // before a new function definition
    	      if (!this._output.just_added_blankline() && !current_token.comments_before) {
    	        this.print_newline();
    	        this.print_newline(true);
    	      }
    	    }
    	    if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD) {
    	      if (reserved_array(this._flags.last_token, ['get', 'set', 'new', 'export']) ||
    	        reserved_array(this._flags.last_token, newline_restricted_tokens)) {
    	        this._output.space_before_token = true;
    	      } else if (reserved_word(this._flags.last_token, 'default') && this._last_last_text === 'export') {
    	        this._output.space_before_token = true;
    	      } else if (this._flags.last_token.text === 'declare') {
    	        // accomodates Typescript declare function formatting
    	        this._output.space_before_token = true;
    	      } else {
    	        this.print_newline();
    	      }
    	    } else if (this._flags.last_token.type === TOKEN.OPERATOR || this._flags.last_token.text === '=') {
    	      // foo = function
    	      this._output.space_before_token = true;
    	    } else if (!this._flags.multiline_frame && (is_expression(this._flags.mode) || is_array(this._flags.mode))) ; else {
    	      this.print_newline();
    	    }

    	    this.print_token(current_token);
    	    this._flags.last_word = current_token.text;
    	    return;
    	  }

    	  var prefix = 'NONE';

    	  if (this._flags.last_token.type === TOKEN.END_BLOCK) {

    	    if (this._previous_flags.inline_frame) {
    	      prefix = 'SPACE';
    	    } else if (!reserved_array(current_token, ['else', 'catch', 'finally', 'from'])) {
    	      prefix = 'NEWLINE';
    	    } else {
    	      if (this._options.brace_style === "expand" ||
    	        this._options.brace_style === "end-expand" ||
    	        (this._options.brace_style === "none" && current_token.newlines)) {
    	        prefix = 'NEWLINE';
    	      } else {
    	        prefix = 'SPACE';
    	        this._output.space_before_token = true;
    	      }
    	    }
    	  } else if (this._flags.last_token.type === TOKEN.SEMICOLON && this._flags.mode === MODE.BlockStatement) {
    	    // TODO: Should this be for STATEMENT as well?
    	    prefix = 'NEWLINE';
    	  } else if (this._flags.last_token.type === TOKEN.SEMICOLON && is_expression(this._flags.mode)) {
    	    prefix = 'SPACE';
    	  } else if (this._flags.last_token.type === TOKEN.STRING) {
    	    prefix = 'NEWLINE';
    	  } else if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD ||
    	    (this._flags.last_token.text === '*' &&
    	      (in_array(this._last_last_text, ['function', 'yield']) ||
    	        (this._flags.mode === MODE.ObjectLiteral && in_array(this._last_last_text, ['{', ',']))))) {
    	    prefix = 'SPACE';
    	  } else if (this._flags.last_token.type === TOKEN.START_BLOCK) {
    	    if (this._flags.inline_frame) {
    	      prefix = 'SPACE';
    	    } else {
    	      prefix = 'NEWLINE';
    	    }
    	  } else if (this._flags.last_token.type === TOKEN.END_EXPR) {
    	    this._output.space_before_token = true;
    	    prefix = 'NEWLINE';
    	  }

    	  if (reserved_array(current_token, line_starters) && this._flags.last_token.text !== ')') {
    	    if (this._flags.inline_frame || this._flags.last_token.text === 'else' || this._flags.last_token.text === 'export') {
    	      prefix = 'SPACE';
    	    } else {
    	      prefix = 'NEWLINE';
    	    }

    	  }

    	  if (reserved_array(current_token, ['else', 'catch', 'finally'])) {
    	    if ((!(this._flags.last_token.type === TOKEN.END_BLOCK && this._previous_flags.mode === MODE.BlockStatement) ||
    	        this._options.brace_style === "expand" ||
    	        this._options.brace_style === "end-expand" ||
    	        (this._options.brace_style === "none" && current_token.newlines)) &&
    	      !this._flags.inline_frame) {
    	      this.print_newline();
    	    } else {
    	      this._output.trim(true);
    	      var line = this._output.current_line;
    	      // If we trimmed and there's something other than a close block before us
    	      // put a newline back in.  Handles '} // comment' scenario.
    	      if (line.last() !== '}') {
    	        this.print_newline();
    	      }
    	      this._output.space_before_token = true;
    	    }
    	  } else if (prefix === 'NEWLINE') {
    	    if (reserved_array(this._flags.last_token, special_words)) {
    	      // no newline between 'return nnn'
    	      this._output.space_before_token = true;
    	    } else if (this._flags.last_token.text === 'declare' && reserved_array(current_token, ['var', 'let', 'const'])) {
    	      // accomodates Typescript declare formatting
    	      this._output.space_before_token = true;
    	    } else if (this._flags.last_token.type !== TOKEN.END_EXPR) {
    	      if ((this._flags.last_token.type !== TOKEN.START_EXPR || !reserved_array(current_token, ['var', 'let', 'const'])) && this._flags.last_token.text !== ':') {
    	        // no need to force newline on 'var': for (var x = 0...)
    	        if (reserved_word(current_token, 'if') && reserved_word(current_token.previous, 'else')) {
    	          // no newline for } else if {
    	          this._output.space_before_token = true;
    	        } else {
    	          this.print_newline();
    	        }
    	      }
    	    } else if (reserved_array(current_token, line_starters) && this._flags.last_token.text !== ')') {
    	      this.print_newline();
    	    }
    	  } else if (this._flags.multiline_frame && is_array(this._flags.mode) && this._flags.last_token.text === ',' && this._last_last_text === '}') {
    	    this.print_newline(); // }, in lists get a newline treatment
    	  } else if (prefix === 'SPACE') {
    	    this._output.space_before_token = true;
    	  }
    	  if (current_token.previous && (current_token.previous.type === TOKEN.WORD || current_token.previous.type === TOKEN.RESERVED)) {
    	    this._output.space_before_token = true;
    	  }
    	  this.print_token(current_token);
    	  this._flags.last_word = current_token.text;

    	  if (current_token.type === TOKEN.RESERVED) {
    	    if (current_token.text === 'do') {
    	      this._flags.do_block = true;
    	    } else if (current_token.text === 'if') {
    	      this._flags.if_block = true;
    	    } else if (current_token.text === 'import') {
    	      this._flags.import_block = true;
    	    } else if (this._flags.import_block && reserved_word(current_token, 'from')) {
    	      this._flags.import_block = false;
    	    }
    	  }
    	};

    	Beautifier.prototype.handle_semicolon = function(current_token) {
    	  if (this.start_of_statement(current_token)) {
    	    // The conditional starts the statement if appropriate.
    	    // Semicolon can be the start (and end) of a statement
    	    this._output.space_before_token = false;
    	  } else {
    	    this.handle_whitespace_and_comments(current_token);
    	  }

    	  var next_token = this._tokens.peek();
    	  while (this._flags.mode === MODE.Statement &&
    	    !(this._flags.if_block && reserved_word(next_token, 'else')) &&
    	    !this._flags.do_block) {
    	    this.restore_mode();
    	  }

    	  // hacky but effective for the moment
    	  if (this._flags.import_block) {
    	    this._flags.import_block = false;
    	  }
    	  this.print_token(current_token);
    	};

    	Beautifier.prototype.handle_string = function(current_token) {
    	  if (current_token.text.startsWith("`") && current_token.newlines === 0 && current_token.whitespace_before === '' && (current_token.previous.text === ')' || this._flags.last_token.type === TOKEN.WORD)) ; else if (this.start_of_statement(current_token)) {
    	    // The conditional starts the statement if appropriate.
    	    // One difference - strings want at least a space before
    	    this._output.space_before_token = true;
    	  } else {
    	    this.handle_whitespace_and_comments(current_token);
    	    if (this._flags.last_token.type === TOKEN.RESERVED || this._flags.last_token.type === TOKEN.WORD || this._flags.inline_frame) {
    	      this._output.space_before_token = true;
    	    } else if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR || this._flags.last_token.type === TOKEN.EQUALS || this._flags.last_token.type === TOKEN.OPERATOR) {
    	      if (!this.start_of_object_property()) {
    	        this.allow_wrap_or_preserved_newline(current_token);
    	      }
    	    } else if ((current_token.text.startsWith("`") && this._flags.last_token.type === TOKEN.END_EXPR && (current_token.previous.text === ']' || current_token.previous.text === ')') && current_token.newlines === 0)) {
    	      this._output.space_before_token = true;
    	    } else {
    	      this.print_newline();
    	    }
    	  }
    	  this.print_token(current_token);
    	};

    	Beautifier.prototype.handle_equals = function(current_token) {
    	  if (this.start_of_statement(current_token)) ; else {
    	    this.handle_whitespace_and_comments(current_token);
    	  }

    	  if (this._flags.declaration_statement) {
    	    // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
    	    this._flags.declaration_assignment = true;
    	  }
    	  this._output.space_before_token = true;
    	  this.print_token(current_token);
    	  this._output.space_before_token = true;
    	};

    	Beautifier.prototype.handle_comma = function(current_token) {
    	  this.handle_whitespace_and_comments(current_token, true);

    	  this.print_token(current_token);
    	  this._output.space_before_token = true;
    	  if (this._flags.declaration_statement) {
    	    if (is_expression(this._flags.parent.mode)) {
    	      // do not break on comma, for(var a = 1, b = 2)
    	      this._flags.declaration_assignment = false;
    	    }

    	    if (this._flags.declaration_assignment) {
    	      this._flags.declaration_assignment = false;
    	      this.print_newline(false, true);
    	    } else if (this._options.comma_first) {
    	      // for comma-first, we want to allow a newline before the comma
    	      // to turn into a newline after the comma, which we will fixup later
    	      this.allow_wrap_or_preserved_newline(current_token);
    	    }
    	  } else if (this._flags.mode === MODE.ObjectLiteral ||
    	    (this._flags.mode === MODE.Statement && this._flags.parent.mode === MODE.ObjectLiteral)) {
    	    if (this._flags.mode === MODE.Statement) {
    	      this.restore_mode();
    	    }

    	    if (!this._flags.inline_frame) {
    	      this.print_newline();
    	    }
    	  } else if (this._options.comma_first) {
    	    // EXPR or DO_BLOCK
    	    // for comma-first, we want to allow a newline before the comma
    	    // to turn into a newline after the comma, which we will fixup later
    	    this.allow_wrap_or_preserved_newline(current_token);
    	  }
    	};

    	Beautifier.prototype.handle_operator = function(current_token) {
    	  var isGeneratorAsterisk = current_token.text === '*' &&
    	    (reserved_array(this._flags.last_token, ['function', 'yield']) ||
    	      (in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.COMMA, TOKEN.END_BLOCK, TOKEN.SEMICOLON]))
    	    );
    	  var isUnary = in_array(current_token.text, ['-', '+']) && (
    	    in_array(this._flags.last_token.type, [TOKEN.START_BLOCK, TOKEN.START_EXPR, TOKEN.EQUALS, TOKEN.OPERATOR]) ||
    	    in_array(this._flags.last_token.text, line_starters) ||
    	    this._flags.last_token.text === ','
    	  );

    	  if (this.start_of_statement(current_token)) ; else {
    	    var preserve_statement_flags = !isGeneratorAsterisk;
    	    this.handle_whitespace_and_comments(current_token, preserve_statement_flags);
    	  }

    	  // hack for actionscript's import .*;
    	  if (current_token.text === '*' && this._flags.last_token.type === TOKEN.DOT) {
    	    this.print_token(current_token);
    	    return;
    	  }

    	  if (current_token.text === '::') {
    	    // no spaces around exotic namespacing syntax operator
    	    this.print_token(current_token);
    	    return;
    	  }

    	  // Allow line wrapping between operators when operator_position is
    	  //   set to before or preserve
    	  if (this._flags.last_token.type === TOKEN.OPERATOR && in_array(this._options.operator_position, OPERATOR_POSITION_BEFORE_OR_PRESERVE)) {
    	    this.allow_wrap_or_preserved_newline(current_token);
    	  }

    	  if (current_token.text === ':' && this._flags.in_case) {
    	    this.print_token(current_token);

    	    this._flags.in_case = false;
    	    this._flags.case_body = true;
    	    if (this._tokens.peek().type !== TOKEN.START_BLOCK) {
    	      this.indent();
    	      this.print_newline();
    	      this._flags.case_block = false;
    	    } else {
    	      this._flags.case_block = true;
    	      this._output.space_before_token = true;
    	    }
    	    return;
    	  }

    	  var space_before = true;
    	  var space_after = true;
    	  var in_ternary = false;
    	  if (current_token.text === ':') {
    	    if (this._flags.ternary_depth === 0) {
    	      // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
    	      space_before = false;
    	    } else {
    	      this._flags.ternary_depth -= 1;
    	      in_ternary = true;
    	    }
    	  } else if (current_token.text === '?') {
    	    this._flags.ternary_depth += 1;
    	  }

    	  // let's handle the operator_position option prior to any conflicting logic
    	  if (!isUnary && !isGeneratorAsterisk && this._options.preserve_newlines && in_array(current_token.text, positionable_operators)) {
    	    var isColon = current_token.text === ':';
    	    var isTernaryColon = (isColon && in_ternary);
    	    var isOtherColon = (isColon && !in_ternary);

    	    switch (this._options.operator_position) {
    	      case OPERATOR_POSITION.before_newline:
    	        // if the current token is : and it's not a ternary statement then we set space_before to false
    	        this._output.space_before_token = !isOtherColon;

    	        this.print_token(current_token);

    	        if (!isColon || isTernaryColon) {
    	          this.allow_wrap_or_preserved_newline(current_token);
    	        }

    	        this._output.space_before_token = true;
    	        return;

    	      case OPERATOR_POSITION.after_newline:
    	        // if the current token is anything but colon, or (via deduction) it's a colon and in a ternary statement,
    	        //   then print a newline.

    	        this._output.space_before_token = true;

    	        if (!isColon || isTernaryColon) {
    	          if (this._tokens.peek().newlines) {
    	            this.print_newline(false, true);
    	          } else {
    	            this.allow_wrap_or_preserved_newline(current_token);
    	          }
    	        } else {
    	          this._output.space_before_token = false;
    	        }

    	        this.print_token(current_token);

    	        this._output.space_before_token = true;
    	        return;

    	      case OPERATOR_POSITION.preserve_newline:
    	        if (!isOtherColon) {
    	          this.allow_wrap_or_preserved_newline(current_token);
    	        }

    	        // if we just added a newline, or the current token is : and it's not a ternary statement,
    	        //   then we set space_before to false
    	        space_before = !(this._output.just_added_newline() || isOtherColon);

    	        this._output.space_before_token = space_before;
    	        this.print_token(current_token);
    	        this._output.space_before_token = true;
    	        return;
    	    }
    	  }

    	  if (isGeneratorAsterisk) {
    	    this.allow_wrap_or_preserved_newline(current_token);
    	    space_before = false;
    	    var next_token = this._tokens.peek();
    	    space_after = next_token && in_array(next_token.type, [TOKEN.WORD, TOKEN.RESERVED]);
    	  } else if (current_token.text === '...') {
    	    this.allow_wrap_or_preserved_newline(current_token);
    	    space_before = this._flags.last_token.type === TOKEN.START_BLOCK;
    	    space_after = false;
    	  } else if (in_array(current_token.text, ['--', '++', '!', '~']) || isUnary) {
    	    // unary operators (and binary +/- pretending to be unary) special cases
    	    if (this._flags.last_token.type === TOKEN.COMMA || this._flags.last_token.type === TOKEN.START_EXPR) {
    	      this.allow_wrap_or_preserved_newline(current_token);
    	    }

    	    space_before = false;
    	    space_after = false;

    	    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
    	    // if there is a newline between -- or ++ and anything else we should preserve it.
    	    if (current_token.newlines && (current_token.text === '--' || current_token.text === '++' || current_token.text === '~')) {
    	      var new_line_needed = reserved_array(this._flags.last_token, special_words) && current_token.newlines;
    	      if (new_line_needed && (this._previous_flags.if_block || this._previous_flags.else_block)) {
    	        this.restore_mode();
    	      }
    	      this.print_newline(new_line_needed, true);
    	    }

    	    if (this._flags.last_token.text === ';' && is_expression(this._flags.mode)) {
    	      // for (;; ++i)
    	      //        ^^^
    	      space_before = true;
    	    }

    	    if (this._flags.last_token.type === TOKEN.RESERVED) {
    	      space_before = true;
    	    } else if (this._flags.last_token.type === TOKEN.END_EXPR) {
    	      space_before = !(this._flags.last_token.text === ']' && (current_token.text === '--' || current_token.text === '++'));
    	    } else if (this._flags.last_token.type === TOKEN.OPERATOR) {
    	      // a++ + ++b;
    	      // a - -b
    	      space_before = in_array(current_token.text, ['--', '-', '++', '+']) && in_array(this._flags.last_token.text, ['--', '-', '++', '+']);
    	      // + and - are not unary when preceeded by -- or ++ operator
    	      // a-- + b
    	      // a * +b
    	      // a - -b
    	      if (in_array(current_token.text, ['+', '-']) && in_array(this._flags.last_token.text, ['--', '++'])) {
    	        space_after = true;
    	      }
    	    }


    	    if (((this._flags.mode === MODE.BlockStatement && !this._flags.inline_frame) || this._flags.mode === MODE.Statement) &&
    	      (this._flags.last_token.text === '{' || this._flags.last_token.text === ';')) {
    	      // { foo; --i }
    	      // foo(); --bar;
    	      this.print_newline();
    	    }
    	  }

    	  this._output.space_before_token = this._output.space_before_token || space_before;
    	  this.print_token(current_token);
    	  this._output.space_before_token = space_after;
    	};

    	Beautifier.prototype.handle_block_comment = function(current_token, preserve_statement_flags) {
    	  if (this._output.raw) {
    	    this._output.add_raw_token(current_token);
    	    if (current_token.directives && current_token.directives.preserve === 'end') {
    	      // If we're testing the raw output behavior, do not allow a directive to turn it off.
    	      this._output.raw = this._options.test_output_raw;
    	    }
    	    return;
    	  }

    	  if (current_token.directives) {
    	    this.print_newline(false, preserve_statement_flags);
    	    this.print_token(current_token);
    	    if (current_token.directives.preserve === 'start') {
    	      this._output.raw = true;
    	    }
    	    this.print_newline(false, true);
    	    return;
    	  }

    	  // inline block
    	  if (!acorn.newline.test(current_token.text) && !current_token.newlines) {
    	    this._output.space_before_token = true;
    	    this.print_token(current_token);
    	    this._output.space_before_token = true;
    	    return;
    	  } else {
    	    this.print_block_commment(current_token, preserve_statement_flags);
    	  }
    	};

    	Beautifier.prototype.print_block_commment = function(current_token, preserve_statement_flags) {
    	  var lines = split_linebreaks(current_token.text);
    	  var j; // iterator for this case
    	  var javadoc = false;
    	  var starless = false;
    	  var lastIndent = current_token.whitespace_before;
    	  var lastIndentLength = lastIndent.length;

    	  // block comment starts with a new line
    	  this.print_newline(false, preserve_statement_flags);

    	  // first line always indented
    	  this.print_token_line_indentation(current_token);
    	  this._output.add_token(lines[0]);
    	  this.print_newline(false, preserve_statement_flags);


    	  if (lines.length > 1) {
    	    lines = lines.slice(1);
    	    javadoc = all_lines_start_with(lines, '*');
    	    starless = each_line_matches_indent(lines, lastIndent);

    	    if (javadoc) {
    	      this._flags.alignment = 1;
    	    }

    	    for (j = 0; j < lines.length; j++) {
    	      if (javadoc) {
    	        // javadoc: reformat and re-indent
    	        this.print_token_line_indentation(current_token);
    	        this._output.add_token(ltrim(lines[j]));
    	      } else if (starless && lines[j]) {
    	        // starless: re-indent non-empty content, avoiding trim
    	        this.print_token_line_indentation(current_token);
    	        this._output.add_token(lines[j].substring(lastIndentLength));
    	      } else {
    	        // normal comments output raw
    	        this._output.current_line.set_indent(-1);
    	        this._output.add_token(lines[j]);
    	      }

    	      // for comments on their own line or  more than one line, make sure there's a new line after
    	      this.print_newline(false, preserve_statement_flags);
    	    }

    	    this._flags.alignment = 0;
    	  }
    	};


    	Beautifier.prototype.handle_comment = function(current_token, preserve_statement_flags) {
    	  if (current_token.newlines) {
    	    this.print_newline(false, preserve_statement_flags);
    	  } else {
    	    this._output.trim(true);
    	  }

    	  this._output.space_before_token = true;
    	  this.print_token(current_token);
    	  this.print_newline(false, preserve_statement_flags);
    	};

    	Beautifier.prototype.handle_dot = function(current_token) {
    	  if (this.start_of_statement(current_token)) ; else {
    	    this.handle_whitespace_and_comments(current_token, true);
    	  }

    	  if (this._flags.last_token.text.match('^[0-9]+$')) {
    	    this._output.space_before_token = true;
    	  }

    	  if (reserved_array(this._flags.last_token, special_words)) {
    	    this._output.space_before_token = false;
    	  } else {
    	    // allow preserved newlines before dots in general
    	    // force newlines on dots after close paren when break_chained - for bar().baz()
    	    this.allow_wrap_or_preserved_newline(current_token,
    	      this._flags.last_token.text === ')' && this._options.break_chained_methods);
    	  }

    	  // Only unindent chained method dot if this dot starts a new line.
    	  // Otherwise the automatic extra indentation removal will handle the over indent
    	  if (this._options.unindent_chained_methods && this._output.just_added_newline()) {
    	    this.deindent();
    	  }

    	  this.print_token(current_token);
    	};

    	Beautifier.prototype.handle_unknown = function(current_token, preserve_statement_flags) {
    	  this.print_token(current_token);

    	  if (current_token.text[current_token.text.length - 1] === '\n') {
    	    this.print_newline(false, preserve_statement_flags);
    	  }
    	};

    	Beautifier.prototype.handle_eof = function(current_token) {
    	  // Unwind any open statements
    	  while (this._flags.mode === MODE.Statement) {
    	    this.restore_mode();
    	  }
    	  this.handle_whitespace_and_comments(current_token);
    	};

    	beautifier$2.Beautifier = Beautifier;
    	return beautifier$2;
    }

    /*jshint node:true */

    var hasRequiredJavascript;

    function requireJavascript () {
    	if (hasRequiredJavascript) return javascript.exports;
    	hasRequiredJavascript = 1;

    	var Beautifier = requireBeautifier$2().Beautifier,
    	  Options = requireOptions$2().Options;

    	function js_beautify(js_source_text, options) {
    	  var beautifier = new Beautifier(js_source_text, options);
    	  return beautifier.beautify();
    	}

    	javascript.exports = js_beautify;
    	javascript.exports.defaultOptions = function() {
    	  return new Options();
    	};
    	return javascript.exports;
    }

    var css = {exports: {}};

    var beautifier$1 = {};

    var options$1 = {};

    /*jshint node:true */

    var hasRequiredOptions$1;

    function requireOptions$1 () {
    	if (hasRequiredOptions$1) return options$1;
    	hasRequiredOptions$1 = 1;

    	var BaseOptions = requireOptions$3().Options;

    	function Options(options) {
    	  BaseOptions.call(this, options, 'css');

    	  this.selector_separator_newline = this._get_boolean('selector_separator_newline', true);
    	  this.newline_between_rules = this._get_boolean('newline_between_rules', true);
    	  var space_around_selector_separator = this._get_boolean('space_around_selector_separator');
    	  this.space_around_combinator = this._get_boolean('space_around_combinator') || space_around_selector_separator;

    	  var brace_style_split = this._get_selection_list('brace_style', ['collapse', 'expand', 'end-expand', 'none', 'preserve-inline']);
    	  this.brace_style = 'collapse';
    	  for (var bs = 0; bs < brace_style_split.length; bs++) {
    	    if (brace_style_split[bs] !== 'expand') {
    	      // default to collapse, as only collapse|expand is implemented for now
    	      this.brace_style = 'collapse';
    	    } else {
    	      this.brace_style = brace_style_split[bs];
    	    }
    	  }
    	}
    	Options.prototype = new BaseOptions();



    	options$1.Options = Options;
    	return options$1;
    }

    /*jshint node:true */

    var hasRequiredBeautifier$1;

    function requireBeautifier$1 () {
    	if (hasRequiredBeautifier$1) return beautifier$1;
    	hasRequiredBeautifier$1 = 1;

    	var Options = requireOptions$1().Options;
    	var Output = requireOutput().Output;
    	var InputScanner = requireInputscanner().InputScanner;
    	var Directives = requireDirectives().Directives;

    	var directives_core = new Directives(/\/\*/, /\*\//);

    	var lineBreak = /\r\n|[\r\n]/;
    	var allLineBreaks = /\r\n|[\r\n]/g;

    	// tokenizer
    	var whitespaceChar = /\s/;
    	var whitespacePattern = /(?:\s|\n)+/g;
    	var block_comment_pattern = /\/\*(?:[\s\S]*?)((?:\*\/)|$)/g;
    	var comment_pattern = /\/\/(?:[^\n\r\u2028\u2029]*)/g;

    	function Beautifier(source_text, options) {
    	  this._source_text = source_text || '';
    	  // Allow the setting of language/file-type specific options
    	  // with inheritance of overall settings
    	  this._options = new Options(options);
    	  this._ch = null;
    	  this._input = null;

    	  // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    	  this.NESTED_AT_RULE = {
    	    "page": true,
    	    "font-face": true,
    	    "keyframes": true,
    	    // also in CONDITIONAL_GROUP_RULE below
    	    "media": true,
    	    "supports": true,
    	    "document": true
    	  };
    	  this.CONDITIONAL_GROUP_RULE = {
    	    "media": true,
    	    "supports": true,
    	    "document": true
    	  };
    	  this.NON_SEMICOLON_NEWLINE_PROPERTY = [
    	    "grid-template-areas",
    	    "grid-template"
    	  ];

    	}

    	Beautifier.prototype.eatString = function(endChars) {
    	  var result = '';
    	  this._ch = this._input.next();
    	  while (this._ch) {
    	    result += this._ch;
    	    if (this._ch === "\\") {
    	      result += this._input.next();
    	    } else if (endChars.indexOf(this._ch) !== -1 || this._ch === "\n") {
    	      break;
    	    }
    	    this._ch = this._input.next();
    	  }
    	  return result;
    	};

    	// Skips any white space in the source text from the current position.
    	// When allowAtLeastOneNewLine is true, will output new lines for each
    	// newline character found; if the user has preserve_newlines off, only
    	// the first newline will be output
    	Beautifier.prototype.eatWhitespace = function(allowAtLeastOneNewLine) {
    	  var result = whitespaceChar.test(this._input.peek());
    	  var newline_count = 0;
    	  while (whitespaceChar.test(this._input.peek())) {
    	    this._ch = this._input.next();
    	    if (allowAtLeastOneNewLine && this._ch === '\n') {
    	      if (newline_count === 0 || newline_count < this._options.max_preserve_newlines) {
    	        newline_count++;
    	        this._output.add_new_line(true);
    	      }
    	    }
    	  }
    	  return result;
    	};

    	// Nested pseudo-class if we are insideRule
    	// and the next special character found opens
    	// a new block
    	Beautifier.prototype.foundNestedPseudoClass = function() {
    	  var openParen = 0;
    	  var i = 1;
    	  var ch = this._input.peek(i);
    	  while (ch) {
    	    if (ch === "{") {
    	      return true;
    	    } else if (ch === '(') {
    	      // pseudoclasses can contain ()
    	      openParen += 1;
    	    } else if (ch === ')') {
    	      if (openParen === 0) {
    	        return false;
    	      }
    	      openParen -= 1;
    	    } else if (ch === ";" || ch === "}") {
    	      return false;
    	    }
    	    i++;
    	    ch = this._input.peek(i);
    	  }
    	  return false;
    	};

    	Beautifier.prototype.print_string = function(output_string) {
    	  this._output.set_indent(this._indentLevel);
    	  this._output.non_breaking_space = true;
    	  this._output.add_token(output_string);
    	};

    	Beautifier.prototype.preserveSingleSpace = function(isAfterSpace) {
    	  if (isAfterSpace) {
    	    this._output.space_before_token = true;
    	  }
    	};

    	Beautifier.prototype.indent = function() {
    	  this._indentLevel++;
    	};

    	Beautifier.prototype.outdent = function() {
    	  if (this._indentLevel > 0) {
    	    this._indentLevel--;
    	  }
    	};

    	/*_____________________--------------------_____________________*/

    	Beautifier.prototype.beautify = function() {
    	  if (this._options.disabled) {
    	    return this._source_text;
    	  }

    	  var source_text = this._source_text;
    	  var eol = this._options.eol;
    	  if (eol === 'auto') {
    	    eol = '\n';
    	    if (source_text && lineBreak.test(source_text || '')) {
    	      eol = source_text.match(lineBreak)[0];
    	    }
    	  }


    	  // HACK: newline parsing inconsistent. This brute force normalizes the this._input.
    	  source_text = source_text.replace(allLineBreaks, '\n');

    	  // reset
    	  var baseIndentString = source_text.match(/^[\t ]*/)[0];

    	  this._output = new Output(this._options, baseIndentString);
    	  this._input = new InputScanner(source_text);
    	  this._indentLevel = 0;
    	  this._nestedLevel = 0;

    	  this._ch = null;
    	  var parenLevel = 0;

    	  var insideRule = false;
    	  // This is the value side of a property value pair (blue in the following ex)
    	  // label { content: blue }
    	  var insidePropertyValue = false;
    	  var enteringConditionalGroup = false;
    	  var insideNonNestedAtRule = false;
    	  var insideScssMap = false;
    	  var topCharacter = this._ch;
    	  var insideNonSemiColonValues = false;
    	  var whitespace;
    	  var isAfterSpace;
    	  var previous_ch;

    	  while (true) {
    	    whitespace = this._input.read(whitespacePattern);
    	    isAfterSpace = whitespace !== '';
    	    previous_ch = topCharacter;
    	    this._ch = this._input.next();
    	    if (this._ch === '\\' && this._input.hasNext()) {
    	      this._ch += this._input.next();
    	    }
    	    topCharacter = this._ch;

    	    if (!this._ch) {
    	      break;
    	    } else if (this._ch === '/' && this._input.peek() === '*') {
    	      // /* css comment */
    	      // Always start block comments on a new line.
    	      // This handles scenarios where a block comment immediately
    	      // follows a property definition on the same line or where
    	      // minified code is being beautified.
    	      this._output.add_new_line();
    	      this._input.back();

    	      var comment = this._input.read(block_comment_pattern);

    	      // Handle ignore directive
    	      var directives = directives_core.get_directives(comment);
    	      if (directives && directives.ignore === 'start') {
    	        comment += directives_core.readIgnored(this._input);
    	      }

    	      this.print_string(comment);

    	      // Ensures any new lines following the comment are preserved
    	      this.eatWhitespace(true);

    	      // Block comments are followed by a new line so they don't
    	      // share a line with other properties
    	      this._output.add_new_line();
    	    } else if (this._ch === '/' && this._input.peek() === '/') {
    	      // // single line comment
    	      // Preserves the space before a comment
    	      // on the same line as a rule
    	      this._output.space_before_token = true;
    	      this._input.back();
    	      this.print_string(this._input.read(comment_pattern));

    	      // Ensures any new lines following the comment are preserved
    	      this.eatWhitespace(true);
    	    } else if (this._ch === '$') {
    	      this.preserveSingleSpace(isAfterSpace);

    	      this.print_string(this._ch);

    	      // strip trailing space, if present, for hash property checks
    	      var variable = this._input.peekUntilAfter(/[: ,;{}()[\]\/='"]/g);

    	      if (variable.match(/[ :]$/)) {
    	        // we have a variable or pseudo-class, add it and insert one space before continuing
    	        variable = this.eatString(": ").replace(/\s$/, '');
    	        this.print_string(variable);
    	        this._output.space_before_token = true;
    	      }

    	      variable = variable.replace(/\s$/, '');

    	      // might be sass variable
    	      if (parenLevel === 0 && variable.indexOf(':') !== -1) {
    	        insidePropertyValue = true;
    	        this.indent();
    	      }
    	    } else if (this._ch === '@') {
    	      this.preserveSingleSpace(isAfterSpace);

    	      // deal with less property mixins @{...}
    	      if (this._input.peek() === '{') {
    	        this.print_string(this._ch + this.eatString('}'));
    	      } else {
    	        this.print_string(this._ch);

    	        // strip trailing space, if present, for hash property checks
    	        var variableOrRule = this._input.peekUntilAfter(/[: ,;{}()[\]\/='"]/g);

    	        if (variableOrRule.match(/[ :]$/)) {
    	          // we have a variable or pseudo-class, add it and insert one space before continuing
    	          variableOrRule = this.eatString(": ").replace(/\s$/, '');
    	          this.print_string(variableOrRule);
    	          this._output.space_before_token = true;
    	        }

    	        variableOrRule = variableOrRule.replace(/\s$/, '');

    	        // might be less variable
    	        if (parenLevel === 0 && variableOrRule.indexOf(':') !== -1) {
    	          insidePropertyValue = true;
    	          this.indent();

    	          // might be a nesting at-rule
    	        } else if (variableOrRule in this.NESTED_AT_RULE) {
    	          this._nestedLevel += 1;
    	          if (variableOrRule in this.CONDITIONAL_GROUP_RULE) {
    	            enteringConditionalGroup = true;
    	          }

    	          // might be a non-nested at-rule
    	        } else if (parenLevel === 0 && !insidePropertyValue) {
    	          insideNonNestedAtRule = true;
    	        }
    	      }
    	    } else if (this._ch === '#' && this._input.peek() === '{') {
    	      this.preserveSingleSpace(isAfterSpace);
    	      this.print_string(this._ch + this.eatString('}'));
    	    } else if (this._ch === '{') {
    	      if (insidePropertyValue) {
    	        insidePropertyValue = false;
    	        this.outdent();
    	      }

    	      // non nested at rule becomes nested
    	      insideNonNestedAtRule = false;

    	      // when entering conditional groups, only rulesets are allowed
    	      if (enteringConditionalGroup) {
    	        enteringConditionalGroup = false;
    	        insideRule = (this._indentLevel >= this._nestedLevel);
    	      } else {
    	        // otherwise, declarations are also allowed
    	        insideRule = (this._indentLevel >= this._nestedLevel - 1);
    	      }
    	      if (this._options.newline_between_rules && insideRule) {
    	        if (this._output.previous_line && this._output.previous_line.item(-1) !== '{') {
    	          this._output.ensure_empty_line_above('/', ',');
    	        }
    	      }

    	      this._output.space_before_token = true;

    	      // The difference in print_string and indent order is necessary to indent the '{' correctly
    	      if (this._options.brace_style === 'expand') {
    	        this._output.add_new_line();
    	        this.print_string(this._ch);
    	        this.indent();
    	        this._output.set_indent(this._indentLevel);
    	      } else {
    	        // inside mixin and first param is object
    	        if (previous_ch === '(') {
    	          this._output.space_before_token = false;
    	        } else if (previous_ch !== ',') {
    	          this.indent();
    	        }
    	        this.print_string(this._ch);
    	      }

    	      this.eatWhitespace(true);
    	      this._output.add_new_line();
    	    } else if (this._ch === '}') {
    	      this.outdent();
    	      this._output.add_new_line();
    	      if (previous_ch === '{') {
    	        this._output.trim(true);
    	      }

    	      if (insidePropertyValue) {
    	        this.outdent();
    	        insidePropertyValue = false;
    	      }
    	      this.print_string(this._ch);
    	      insideRule = false;
    	      if (this._nestedLevel) {
    	        this._nestedLevel--;
    	      }

    	      this.eatWhitespace(true);
    	      this._output.add_new_line();

    	      if (this._options.newline_between_rules && !this._output.just_added_blankline()) {
    	        if (this._input.peek() !== '}') {
    	          this._output.add_new_line(true);
    	        }
    	      }
    	      if (this._input.peek() === ')') {
    	        this._output.trim(true);
    	        if (this._options.brace_style === "expand") {
    	          this._output.add_new_line(true);
    	        }
    	      }
    	    } else if (this._ch === ":") {

    	      for (var i = 0; i < this.NON_SEMICOLON_NEWLINE_PROPERTY.length; i++) {
    	        if (this._input.lookBack(this.NON_SEMICOLON_NEWLINE_PROPERTY[i])) {
    	          insideNonSemiColonValues = true;
    	          break;
    	        }
    	      }

    	      if ((insideRule || enteringConditionalGroup) && !(this._input.lookBack("&") || this.foundNestedPseudoClass()) && !this._input.lookBack("(") && !insideNonNestedAtRule && parenLevel === 0) {
    	        // 'property: value' delimiter
    	        // which could be in a conditional group query

    	        this.print_string(':');
    	        if (!insidePropertyValue) {
    	          insidePropertyValue = true;
    	          this._output.space_before_token = true;
    	          this.eatWhitespace(true);
    	          this.indent();
    	        }
    	      } else {
    	        // sass/less parent reference don't use a space
    	        // sass nested pseudo-class don't use a space

    	        // preserve space before pseudoclasses/pseudoelements, as it means "in any child"
    	        if (this._input.lookBack(" ")) {
    	          this._output.space_before_token = true;
    	        }
    	        if (this._input.peek() === ":") {
    	          // pseudo-element
    	          this._ch = this._input.next();
    	          this.print_string("::");
    	        } else {
    	          // pseudo-class
    	          this.print_string(':');
    	        }
    	      }
    	    } else if (this._ch === '"' || this._ch === '\'') {
    	      var preserveQuoteSpace = previous_ch === '"' || previous_ch === '\'';
    	      this.preserveSingleSpace(preserveQuoteSpace || isAfterSpace);
    	      this.print_string(this._ch + this.eatString(this._ch));
    	      this.eatWhitespace(true);
    	    } else if (this._ch === ';') {
    	      insideNonSemiColonValues = false;
    	      if (parenLevel === 0) {
    	        if (insidePropertyValue) {
    	          this.outdent();
    	          insidePropertyValue = false;
    	        }
    	        insideNonNestedAtRule = false;
    	        this.print_string(this._ch);
    	        this.eatWhitespace(true);

    	        // This maintains single line comments on the same
    	        // line. Block comments are also affected, but
    	        // a new line is always output before one inside
    	        // that section
    	        if (this._input.peek() !== '/') {
    	          this._output.add_new_line();
    	        }
    	      } else {
    	        this.print_string(this._ch);
    	        this.eatWhitespace(true);
    	        this._output.space_before_token = true;
    	      }
    	    } else if (this._ch === '(') { // may be a url
    	      if (this._input.lookBack("url")) {
    	        this.print_string(this._ch);
    	        this.eatWhitespace();
    	        parenLevel++;
    	        this.indent();
    	        this._ch = this._input.next();
    	        if (this._ch === ')' || this._ch === '"' || this._ch === '\'') {
    	          this._input.back();
    	        } else if (this._ch) {
    	          this.print_string(this._ch + this.eatString(')'));
    	          if (parenLevel) {
    	            parenLevel--;
    	            this.outdent();
    	          }
    	        }
    	      } else {
    	        var space_needed = false;
    	        if (this._input.lookBack("with")) {
    	          // look back is not an accurate solution, we need tokens to confirm without whitespaces
    	          space_needed = true;
    	        }
    	        this.preserveSingleSpace(isAfterSpace || space_needed);
    	        this.print_string(this._ch);

    	        // handle scss/sass map
    	        if (insidePropertyValue && previous_ch === "$" && this._options.selector_separator_newline) {
    	          this._output.add_new_line();
    	          insideScssMap = true;
    	        } else {
    	          this.eatWhitespace();
    	          parenLevel++;
    	          this.indent();
    	        }
    	      }
    	    } else if (this._ch === ')') {
    	      if (parenLevel) {
    	        parenLevel--;
    	        this.outdent();
    	      }
    	      if (insideScssMap && this._input.peek() === ";" && this._options.selector_separator_newline) {
    	        insideScssMap = false;
    	        this.outdent();
    	        this._output.add_new_line();
    	      }
    	      this.print_string(this._ch);
    	    } else if (this._ch === ',') {
    	      this.print_string(this._ch);
    	      this.eatWhitespace(true);
    	      if (this._options.selector_separator_newline && (!insidePropertyValue || insideScssMap) && parenLevel === 0 && !insideNonNestedAtRule) {
    	        this._output.add_new_line();
    	      } else {
    	        this._output.space_before_token = true;
    	      }
    	    } else if ((this._ch === '>' || this._ch === '+' || this._ch === '~') && !insidePropertyValue && parenLevel === 0) {
    	      //handle combinator spacing
    	      if (this._options.space_around_combinator) {
    	        this._output.space_before_token = true;
    	        this.print_string(this._ch);
    	        this._output.space_before_token = true;
    	      } else {
    	        this.print_string(this._ch);
    	        this.eatWhitespace();
    	        // squash extra whitespace
    	        if (this._ch && whitespaceChar.test(this._ch)) {
    	          this._ch = '';
    	        }
    	      }
    	    } else if (this._ch === ']') {
    	      this.print_string(this._ch);
    	    } else if (this._ch === '[') {
    	      this.preserveSingleSpace(isAfterSpace);
    	      this.print_string(this._ch);
    	    } else if (this._ch === '=') { // no whitespace before or after
    	      this.eatWhitespace();
    	      this.print_string('=');
    	      if (whitespaceChar.test(this._ch)) {
    	        this._ch = '';
    	      }
    	    } else if (this._ch === '!' && !this._input.lookBack("\\")) { // !important
    	      this._output.space_before_token = true;
    	      this.print_string(this._ch);
    	    } else {
    	      var preserveAfterSpace = previous_ch === '"' || previous_ch === '\'';
    	      this.preserveSingleSpace(preserveAfterSpace || isAfterSpace);
    	      this.print_string(this._ch);

    	      if (!this._output.just_added_newline() && this._input.peek() === '\n' && insideNonSemiColonValues) {
    	        this._output.add_new_line();
    	      }
    	    }
    	  }

    	  var sweetCode = this._output.get_code(eol);

    	  return sweetCode;
    	};

    	beautifier$1.Beautifier = Beautifier;
    	return beautifier$1;
    }

    /*jshint node:true */

    var hasRequiredCss;

    function requireCss () {
    	if (hasRequiredCss) return css.exports;
    	hasRequiredCss = 1;

    	var Beautifier = requireBeautifier$1().Beautifier,
    	  Options = requireOptions$1().Options;

    	function css_beautify(source_text, options) {
    	  var beautifier = new Beautifier(source_text, options);
    	  return beautifier.beautify();
    	}

    	css.exports = css_beautify;
    	css.exports.defaultOptions = function() {
    	  return new Options();
    	};
    	return css.exports;
    }

    var html = {exports: {}};

    var beautifier = {};

    var options = {};

    /*jshint node:true */

    var hasRequiredOptions;

    function requireOptions () {
    	if (hasRequiredOptions) return options;
    	hasRequiredOptions = 1;

    	var BaseOptions = requireOptions$3().Options;

    	function Options(options) {
    	  BaseOptions.call(this, options, 'html');
    	  if (this.templating.length === 1 && this.templating[0] === 'auto') {
    	    this.templating = ['django', 'erb', 'handlebars', 'php'];
    	  }

    	  this.indent_inner_html = this._get_boolean('indent_inner_html');
    	  this.indent_body_inner_html = this._get_boolean('indent_body_inner_html', true);
    	  this.indent_head_inner_html = this._get_boolean('indent_head_inner_html', true);

    	  this.indent_handlebars = this._get_boolean('indent_handlebars', true);
    	  this.wrap_attributes = this._get_selection('wrap_attributes',
    	    ['auto', 'force', 'force-aligned', 'force-expand-multiline', 'aligned-multiple', 'preserve', 'preserve-aligned']);
    	  this.wrap_attributes_min_attrs = this._get_number('wrap_attributes_min_attrs', 2);
    	  this.wrap_attributes_indent_size = this._get_number('wrap_attributes_indent_size', this.indent_size);
    	  this.extra_liners = this._get_array('extra_liners', ['head', 'body', '/html']);

    	  // Block vs inline elements
    	  // https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
    	  // https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
    	  // https://www.w3.org/TR/html5/dom.html#phrasing-content
    	  this.inline = this._get_array('inline', [
    	    'a', 'abbr', 'area', 'audio', 'b', 'bdi', 'bdo', 'br', 'button', 'canvas', 'cite',
    	    'code', 'data', 'datalist', 'del', 'dfn', 'em', 'embed', 'i', 'iframe', 'img',
    	    'input', 'ins', 'kbd', 'keygen', 'label', 'map', 'mark', 'math', 'meter', 'noscript',
    	    'object', 'output', 'progress', 'q', 'ruby', 's', 'samp', /* 'script', */ 'select', 'small',
    	    'span', 'strong', 'sub', 'sup', 'svg', 'template', 'textarea', 'time', 'u', 'var',
    	    'video', 'wbr', 'text',
    	    // obsolete inline tags
    	    'acronym', 'big', 'strike', 'tt'
    	  ]);
    	  this.inline_custom_elements = this._get_boolean('inline_custom_elements', true);
    	  this.void_elements = this._get_array('void_elements', [
    	    // HTLM void elements - aka self-closing tags - aka singletons
    	    // https://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
    	    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen',
    	    'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
    	    // NOTE: Optional tags are too complex for a simple list
    	    // they are hard coded in _do_optional_end_element

    	    // Doctype and xml elements
    	    '!doctype', '?xml',

    	    // obsolete tags
    	    // basefont: https://www.computerhope.com/jargon/h/html-basefont-tag.htm
    	    // isndex: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/isindex
    	    'basefont', 'isindex'
    	  ]);
    	  this.unformatted = this._get_array('unformatted', []);
    	  this.content_unformatted = this._get_array('content_unformatted', [
    	    'pre', 'textarea'
    	  ]);
    	  this.unformatted_content_delimiter = this._get_characters('unformatted_content_delimiter');
    	  this.indent_scripts = this._get_selection('indent_scripts', ['normal', 'keep', 'separate']);

    	}
    	Options.prototype = new BaseOptions();



    	options.Options = Options;
    	return options;
    }

    var tokenizer = {};

    /*jshint node:true */

    var hasRequiredTokenizer;

    function requireTokenizer () {
    	if (hasRequiredTokenizer) return tokenizer;
    	hasRequiredTokenizer = 1;

    	var BaseTokenizer = requireTokenizer$2().Tokenizer;
    	var BASETOKEN = requireTokenizer$2().TOKEN;
    	var Directives = requireDirectives().Directives;
    	var TemplatablePattern = requireTemplatablepattern().TemplatablePattern;
    	var Pattern = requirePattern().Pattern;

    	var TOKEN = {
    	  TAG_OPEN: 'TK_TAG_OPEN',
    	  TAG_CLOSE: 'TK_TAG_CLOSE',
    	  ATTRIBUTE: 'TK_ATTRIBUTE',
    	  EQUALS: 'TK_EQUALS',
    	  VALUE: 'TK_VALUE',
    	  COMMENT: 'TK_COMMENT',
    	  TEXT: 'TK_TEXT',
    	  UNKNOWN: 'TK_UNKNOWN',
    	  START: BASETOKEN.START,
    	  RAW: BASETOKEN.RAW,
    	  EOF: BASETOKEN.EOF
    	};

    	var directives_core = new Directives(/<\!--/, /-->/);

    	var Tokenizer = function(input_string, options) {
    	  BaseTokenizer.call(this, input_string, options);
    	  this._current_tag_name = '';

    	  // Words end at whitespace or when a tag starts
    	  // if we are indenting handlebars, they are considered tags
    	  var templatable_reader = new TemplatablePattern(this._input).read_options(this._options);
    	  var pattern_reader = new Pattern(this._input);

    	  this.__patterns = {
    	    word: templatable_reader.until(/[\n\r\t <]/),
    	    single_quote: templatable_reader.until_after(/'/),
    	    double_quote: templatable_reader.until_after(/"/),
    	    attribute: templatable_reader.until(/[\n\r\t =>]|\/>/),
    	    element_name: templatable_reader.until(/[\n\r\t >\/]/),

    	    handlebars_comment: pattern_reader.starting_with(/{{!--/).until_after(/--}}/),
    	    handlebars: pattern_reader.starting_with(/{{/).until_after(/}}/),
    	    handlebars_open: pattern_reader.until(/[\n\r\t }]/),
    	    handlebars_raw_close: pattern_reader.until(/}}/),
    	    comment: pattern_reader.starting_with(/<!--/).until_after(/-->/),
    	    cdata: pattern_reader.starting_with(/<!\[CDATA\[/).until_after(/]]>/),
    	    // https://en.wikipedia.org/wiki/Conditional_comment
    	    conditional_comment: pattern_reader.starting_with(/<!\[/).until_after(/]>/),
    	    processing: pattern_reader.starting_with(/<\?/).until_after(/\?>/)
    	  };

    	  if (this._options.indent_handlebars) {
    	    this.__patterns.word = this.__patterns.word.exclude('handlebars');
    	  }

    	  this._unformatted_content_delimiter = null;

    	  if (this._options.unformatted_content_delimiter) {
    	    var literal_regexp = this._input.get_literal_regexp(this._options.unformatted_content_delimiter);
    	    this.__patterns.unformatted_content_delimiter =
    	      pattern_reader.matching(literal_regexp)
    	      .until_after(literal_regexp);
    	  }
    	};
    	Tokenizer.prototype = new BaseTokenizer();

    	Tokenizer.prototype._is_comment = function(current_token) { // jshint unused:false
    	  return false; //current_token.type === TOKEN.COMMENT || current_token.type === TOKEN.UNKNOWN;
    	};

    	Tokenizer.prototype._is_opening = function(current_token) {
    	  return current_token.type === TOKEN.TAG_OPEN;
    	};

    	Tokenizer.prototype._is_closing = function(current_token, open_token) {
    	  return current_token.type === TOKEN.TAG_CLOSE &&
    	    (open_token && (
    	      ((current_token.text === '>' || current_token.text === '/>') && open_token.text[0] === '<') ||
    	      (current_token.text === '}}' && open_token.text[0] === '{' && open_token.text[1] === '{')));
    	};

    	Tokenizer.prototype._reset = function() {
    	  this._current_tag_name = '';
    	};

    	Tokenizer.prototype._get_next_token = function(previous_token, open_token) { // jshint unused:false
    	  var token = null;
    	  this._readWhitespace();
    	  var c = this._input.peek();

    	  if (c === null) {
    	    return this._create_token(TOKEN.EOF, '');
    	  }

    	  token = token || this._read_open_handlebars(c, open_token);
    	  token = token || this._read_attribute(c, previous_token, open_token);
    	  token = token || this._read_close(c, open_token);
    	  token = token || this._read_raw_content(c, previous_token, open_token);
    	  token = token || this._read_content_word(c);
    	  token = token || this._read_comment_or_cdata(c);
    	  token = token || this._read_processing(c);
    	  token = token || this._read_open(c, open_token);
    	  token = token || this._create_token(TOKEN.UNKNOWN, this._input.next());

    	  return token;
    	};

    	Tokenizer.prototype._read_comment_or_cdata = function(c) { // jshint unused:false
    	  var token = null;
    	  var resulting_string = null;
    	  var directives = null;

    	  if (c === '<') {
    	    var peek1 = this._input.peek(1);
    	    // We treat all comments as literals, even more than preformatted tags
    	    // we only look for the appropriate closing marker
    	    if (peek1 === '!') {
    	      resulting_string = this.__patterns.comment.read();

    	      // only process directive on html comments
    	      if (resulting_string) {
    	        directives = directives_core.get_directives(resulting_string);
    	        if (directives && directives.ignore === 'start') {
    	          resulting_string += directives_core.readIgnored(this._input);
    	        }
    	      } else {
    	        resulting_string = this.__patterns.cdata.read();
    	      }
    	    }

    	    if (resulting_string) {
    	      token = this._create_token(TOKEN.COMMENT, resulting_string);
    	      token.directives = directives;
    	    }
    	  }

    	  return token;
    	};

    	Tokenizer.prototype._read_processing = function(c) { // jshint unused:false
    	  var token = null;
    	  var resulting_string = null;
    	  var directives = null;

    	  if (c === '<') {
    	    var peek1 = this._input.peek(1);
    	    if (peek1 === '!' || peek1 === '?') {
    	      resulting_string = this.__patterns.conditional_comment.read();
    	      resulting_string = resulting_string || this.__patterns.processing.read();
    	    }

    	    if (resulting_string) {
    	      token = this._create_token(TOKEN.COMMENT, resulting_string);
    	      token.directives = directives;
    	    }
    	  }

    	  return token;
    	};

    	Tokenizer.prototype._read_open = function(c, open_token) {
    	  var resulting_string = null;
    	  var token = null;
    	  if (!open_token) {
    	    if (c === '<') {

    	      resulting_string = this._input.next();
    	      if (this._input.peek() === '/') {
    	        resulting_string += this._input.next();
    	      }
    	      resulting_string += this.__patterns.element_name.read();
    	      token = this._create_token(TOKEN.TAG_OPEN, resulting_string);
    	    }
    	  }
    	  return token;
    	};

    	Tokenizer.prototype._read_open_handlebars = function(c, open_token) {
    	  var resulting_string = null;
    	  var token = null;
    	  if (!open_token) {
    	    if (this._options.indent_handlebars && c === '{' && this._input.peek(1) === '{') {
    	      if (this._input.peek(2) === '!') {
    	        resulting_string = this.__patterns.handlebars_comment.read();
    	        resulting_string = resulting_string || this.__patterns.handlebars.read();
    	        token = this._create_token(TOKEN.COMMENT, resulting_string);
    	      } else {
    	        resulting_string = this.__patterns.handlebars_open.read();
    	        token = this._create_token(TOKEN.TAG_OPEN, resulting_string);
    	      }
    	    }
    	  }
    	  return token;
    	};


    	Tokenizer.prototype._read_close = function(c, open_token) {
    	  var resulting_string = null;
    	  var token = null;
    	  if (open_token) {
    	    if (open_token.text[0] === '<' && (c === '>' || (c === '/' && this._input.peek(1) === '>'))) {
    	      resulting_string = this._input.next();
    	      if (c === '/') { //  for close tag "/>"
    	        resulting_string += this._input.next();
    	      }
    	      token = this._create_token(TOKEN.TAG_CLOSE, resulting_string);
    	    } else if (open_token.text[0] === '{' && c === '}' && this._input.peek(1) === '}') {
    	      this._input.next();
    	      this._input.next();
    	      token = this._create_token(TOKEN.TAG_CLOSE, '}}');
    	    }
    	  }

    	  return token;
    	};

    	Tokenizer.prototype._read_attribute = function(c, previous_token, open_token) {
    	  var token = null;
    	  var resulting_string = '';
    	  if (open_token && open_token.text[0] === '<') {

    	    if (c === '=') {
    	      token = this._create_token(TOKEN.EQUALS, this._input.next());
    	    } else if (c === '"' || c === "'") {
    	      var content = this._input.next();
    	      if (c === '"') {
    	        content += this.__patterns.double_quote.read();
    	      } else {
    	        content += this.__patterns.single_quote.read();
    	      }
    	      token = this._create_token(TOKEN.VALUE, content);
    	    } else {
    	      resulting_string = this.__patterns.attribute.read();

    	      if (resulting_string) {
    	        if (previous_token.type === TOKEN.EQUALS) {
    	          token = this._create_token(TOKEN.VALUE, resulting_string);
    	        } else {
    	          token = this._create_token(TOKEN.ATTRIBUTE, resulting_string);
    	        }
    	      }
    	    }
    	  }
    	  return token;
    	};

    	Tokenizer.prototype._is_content_unformatted = function(tag_name) {
    	  // void_elements have no content and so cannot have unformatted content
    	  // script and style tags should always be read as unformatted content
    	  // finally content_unformatted and unformatted element contents are unformatted
    	  return this._options.void_elements.indexOf(tag_name) === -1 &&
    	    (this._options.content_unformatted.indexOf(tag_name) !== -1 ||
    	      this._options.unformatted.indexOf(tag_name) !== -1);
    	};


    	Tokenizer.prototype._read_raw_content = function(c, previous_token, open_token) { // jshint unused:false
    	  var resulting_string = '';
    	  if (open_token && open_token.text[0] === '{') {
    	    resulting_string = this.__patterns.handlebars_raw_close.read();
    	  } else if (previous_token.type === TOKEN.TAG_CLOSE &&
    	    previous_token.opened.text[0] === '<' && previous_token.text[0] !== '/') {
    	    // ^^ empty tag has no content 
    	    var tag_name = previous_token.opened.text.substr(1).toLowerCase();
    	    if (tag_name === 'script' || tag_name === 'style') {
    	      // Script and style tags are allowed to have comments wrapping their content
    	      // or just have regular content.
    	      var token = this._read_comment_or_cdata(c);
    	      if (token) {
    	        token.type = TOKEN.TEXT;
    	        return token;
    	      }
    	      resulting_string = this._input.readUntil(new RegExp('</' + tag_name + '[\\n\\r\\t ]*?>', 'ig'));
    	    } else if (this._is_content_unformatted(tag_name)) {

    	      resulting_string = this._input.readUntil(new RegExp('</' + tag_name + '[\\n\\r\\t ]*?>', 'ig'));
    	    }
    	  }

    	  if (resulting_string) {
    	    return this._create_token(TOKEN.TEXT, resulting_string);
    	  }

    	  return null;
    	};

    	Tokenizer.prototype._read_content_word = function(c) {
    	  var resulting_string = '';
    	  if (this._options.unformatted_content_delimiter) {
    	    if (c === this._options.unformatted_content_delimiter[0]) {
    	      resulting_string = this.__patterns.unformatted_content_delimiter.read();
    	    }
    	  }

    	  if (!resulting_string) {
    	    resulting_string = this.__patterns.word.read();
    	  }
    	  if (resulting_string) {
    	    return this._create_token(TOKEN.TEXT, resulting_string);
    	  }
    	};

    	tokenizer.Tokenizer = Tokenizer;
    	tokenizer.TOKEN = TOKEN;
    	return tokenizer;
    }

    /*jshint node:true */

    var hasRequiredBeautifier;

    function requireBeautifier () {
    	if (hasRequiredBeautifier) return beautifier;
    	hasRequiredBeautifier = 1;

    	var Options = requireOptions().Options;
    	var Output = requireOutput().Output;
    	var Tokenizer = requireTokenizer().Tokenizer;
    	var TOKEN = requireTokenizer().TOKEN;

    	var lineBreak = /\r\n|[\r\n]/;
    	var allLineBreaks = /\r\n|[\r\n]/g;

    	var Printer = function(options, base_indent_string) { //handles input/output and some other printing functions

    	  this.indent_level = 0;
    	  this.alignment_size = 0;
    	  this.max_preserve_newlines = options.max_preserve_newlines;
    	  this.preserve_newlines = options.preserve_newlines;

    	  this._output = new Output(options, base_indent_string);

    	};

    	Printer.prototype.current_line_has_match = function(pattern) {
    	  return this._output.current_line.has_match(pattern);
    	};

    	Printer.prototype.set_space_before_token = function(value, non_breaking) {
    	  this._output.space_before_token = value;
    	  this._output.non_breaking_space = non_breaking;
    	};

    	Printer.prototype.set_wrap_point = function() {
    	  this._output.set_indent(this.indent_level, this.alignment_size);
    	  this._output.set_wrap_point();
    	};


    	Printer.prototype.add_raw_token = function(token) {
    	  this._output.add_raw_token(token);
    	};

    	Printer.prototype.print_preserved_newlines = function(raw_token) {
    	  var newlines = 0;
    	  if (raw_token.type !== TOKEN.TEXT && raw_token.previous.type !== TOKEN.TEXT) {
    	    newlines = raw_token.newlines ? 1 : 0;
    	  }

    	  if (this.preserve_newlines) {
    	    newlines = raw_token.newlines < this.max_preserve_newlines + 1 ? raw_token.newlines : this.max_preserve_newlines + 1;
    	  }
    	  for (var n = 0; n < newlines; n++) {
    	    this.print_newline(n > 0);
    	  }

    	  return newlines !== 0;
    	};

    	Printer.prototype.traverse_whitespace = function(raw_token) {
    	  if (raw_token.whitespace_before || raw_token.newlines) {
    	    if (!this.print_preserved_newlines(raw_token)) {
    	      this._output.space_before_token = true;
    	    }
    	    return true;
    	  }
    	  return false;
    	};

    	Printer.prototype.previous_token_wrapped = function() {
    	  return this._output.previous_token_wrapped;
    	};

    	Printer.prototype.print_newline = function(force) {
    	  this._output.add_new_line(force);
    	};

    	Printer.prototype.print_token = function(token) {
    	  if (token.text) {
    	    this._output.set_indent(this.indent_level, this.alignment_size);
    	    this._output.add_token(token.text);
    	  }
    	};

    	Printer.prototype.indent = function() {
    	  this.indent_level++;
    	};

    	Printer.prototype.get_full_indent = function(level) {
    	  level = this.indent_level + (level || 0);
    	  if (level < 1) {
    	    return '';
    	  }

    	  return this._output.get_indent_string(level);
    	};

    	var get_type_attribute = function(start_token) {
    	  var result = null;
    	  var raw_token = start_token.next;

    	  // Search attributes for a type attribute
    	  while (raw_token.type !== TOKEN.EOF && start_token.closed !== raw_token) {
    	    if (raw_token.type === TOKEN.ATTRIBUTE && raw_token.text === 'type') {
    	      if (raw_token.next && raw_token.next.type === TOKEN.EQUALS &&
    	        raw_token.next.next && raw_token.next.next.type === TOKEN.VALUE) {
    	        result = raw_token.next.next.text;
    	      }
    	      break;
    	    }
    	    raw_token = raw_token.next;
    	  }

    	  return result;
    	};

    	var get_custom_beautifier_name = function(tag_check, raw_token) {
    	  var typeAttribute = null;
    	  var result = null;

    	  if (!raw_token.closed) {
    	    return null;
    	  }

    	  if (tag_check === 'script') {
    	    typeAttribute = 'text/javascript';
    	  } else if (tag_check === 'style') {
    	    typeAttribute = 'text/css';
    	  }

    	  typeAttribute = get_type_attribute(raw_token) || typeAttribute;

    	  // For script and style tags that have a type attribute, only enable custom beautifiers for matching values
    	  // For those without a type attribute use default;
    	  if (typeAttribute.search('text/css') > -1) {
    	    result = 'css';
    	  } else if (typeAttribute.search(/module|((text|application|dojo)\/(x-)?(javascript|ecmascript|jscript|livescript|(ld\+)?json|method|aspect))/) > -1) {
    	    result = 'javascript';
    	  } else if (typeAttribute.search(/(text|application|dojo)\/(x-)?(html)/) > -1) {
    	    result = 'html';
    	  } else if (typeAttribute.search(/test\/null/) > -1) {
    	    // Test only mime-type for testing the beautifier when null is passed as beautifing function
    	    result = 'null';
    	  }

    	  return result;
    	};

    	function in_array(what, arr) {
    	  return arr.indexOf(what) !== -1;
    	}

    	function TagFrame(parent, parser_token, indent_level) {
    	  this.parent = parent || null;
    	  this.tag = parser_token ? parser_token.tag_name : '';
    	  this.indent_level = indent_level || 0;
    	  this.parser_token = parser_token || null;
    	}

    	function TagStack(printer) {
    	  this._printer = printer;
    	  this._current_frame = null;
    	}

    	TagStack.prototype.get_parser_token = function() {
    	  return this._current_frame ? this._current_frame.parser_token : null;
    	};

    	TagStack.prototype.record_tag = function(parser_token) { //function to record a tag and its parent in this.tags Object
    	  var new_frame = new TagFrame(this._current_frame, parser_token, this._printer.indent_level);
    	  this._current_frame = new_frame;
    	};

    	TagStack.prototype._try_pop_frame = function(frame) { //function to retrieve the opening tag to the corresponding closer
    	  var parser_token = null;

    	  if (frame) {
    	    parser_token = frame.parser_token;
    	    this._printer.indent_level = frame.indent_level;
    	    this._current_frame = frame.parent;
    	  }

    	  return parser_token;
    	};

    	TagStack.prototype._get_frame = function(tag_list, stop_list) { //function to retrieve the opening tag to the corresponding closer
    	  var frame = this._current_frame;

    	  while (frame) { //till we reach '' (the initial value);
    	    if (tag_list.indexOf(frame.tag) !== -1) { //if this is it use it
    	      break;
    	    } else if (stop_list && stop_list.indexOf(frame.tag) !== -1) {
    	      frame = null;
    	      break;
    	    }
    	    frame = frame.parent;
    	  }

    	  return frame;
    	};

    	TagStack.prototype.try_pop = function(tag, stop_list) { //function to retrieve the opening tag to the corresponding closer
    	  var frame = this._get_frame([tag], stop_list);
    	  return this._try_pop_frame(frame);
    	};

    	TagStack.prototype.indent_to_tag = function(tag_list) {
    	  var frame = this._get_frame(tag_list);
    	  if (frame) {
    	    this._printer.indent_level = frame.indent_level;
    	  }
    	};

    	function Beautifier(source_text, options, js_beautify, css_beautify) {
    	  //Wrapper function to invoke all the necessary constructors and deal with the output.
    	  this._source_text = source_text || '';
    	  options = options || {};
    	  this._js_beautify = js_beautify;
    	  this._css_beautify = css_beautify;
    	  this._tag_stack = null;

    	  // Allow the setting of language/file-type specific options
    	  // with inheritance of overall settings
    	  var optionHtml = new Options(options, 'html');

    	  this._options = optionHtml;

    	  this._is_wrap_attributes_force = this._options.wrap_attributes.substr(0, 'force'.length) === 'force';
    	  this._is_wrap_attributes_force_expand_multiline = (this._options.wrap_attributes === 'force-expand-multiline');
    	  this._is_wrap_attributes_force_aligned = (this._options.wrap_attributes === 'force-aligned');
    	  this._is_wrap_attributes_aligned_multiple = (this._options.wrap_attributes === 'aligned-multiple');
    	  this._is_wrap_attributes_preserve = this._options.wrap_attributes.substr(0, 'preserve'.length) === 'preserve';
    	  this._is_wrap_attributes_preserve_aligned = (this._options.wrap_attributes === 'preserve-aligned');
    	}

    	Beautifier.prototype.beautify = function() {

    	  // if disabled, return the input unchanged.
    	  if (this._options.disabled) {
    	    return this._source_text;
    	  }

    	  var source_text = this._source_text;
    	  var eol = this._options.eol;
    	  if (this._options.eol === 'auto') {
    	    eol = '\n';
    	    if (source_text && lineBreak.test(source_text)) {
    	      eol = source_text.match(lineBreak)[0];
    	    }
    	  }

    	  // HACK: newline parsing inconsistent. This brute force normalizes the input.
    	  source_text = source_text.replace(allLineBreaks, '\n');

    	  var baseIndentString = source_text.match(/^[\t ]*/)[0];

    	  var last_token = {
    	    text: '',
    	    type: ''
    	  };

    	  var last_tag_token = new TagOpenParserToken();

    	  var printer = new Printer(this._options, baseIndentString);
    	  var tokens = new Tokenizer(source_text, this._options).tokenize();

    	  this._tag_stack = new TagStack(printer);

    	  var parser_token = null;
    	  var raw_token = tokens.next();
    	  while (raw_token.type !== TOKEN.EOF) {

    	    if (raw_token.type === TOKEN.TAG_OPEN || raw_token.type === TOKEN.COMMENT) {
    	      parser_token = this._handle_tag_open(printer, raw_token, last_tag_token, last_token, tokens);
    	      last_tag_token = parser_token;
    	    } else if ((raw_token.type === TOKEN.ATTRIBUTE || raw_token.type === TOKEN.EQUALS || raw_token.type === TOKEN.VALUE) ||
    	      (raw_token.type === TOKEN.TEXT && !last_tag_token.tag_complete)) {
    	      parser_token = this._handle_inside_tag(printer, raw_token, last_tag_token, last_token);
    	    } else if (raw_token.type === TOKEN.TAG_CLOSE) {
    	      parser_token = this._handle_tag_close(printer, raw_token, last_tag_token);
    	    } else if (raw_token.type === TOKEN.TEXT) {
    	      parser_token = this._handle_text(printer, raw_token, last_tag_token);
    	    } else {
    	      // This should never happen, but if it does. Print the raw token
    	      printer.add_raw_token(raw_token);
    	    }

    	    last_token = parser_token;

    	    raw_token = tokens.next();
    	  }
    	  var sweet_code = printer._output.get_code(eol);

    	  return sweet_code;
    	};

    	Beautifier.prototype._handle_tag_close = function(printer, raw_token, last_tag_token) {
    	  var parser_token = {
    	    text: raw_token.text,
    	    type: raw_token.type
    	  };
    	  printer.alignment_size = 0;
    	  last_tag_token.tag_complete = true;

    	  printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== '', true);
    	  if (last_tag_token.is_unformatted) {
    	    printer.add_raw_token(raw_token);
    	  } else {
    	    if (last_tag_token.tag_start_char === '<') {
    	      printer.set_space_before_token(raw_token.text[0] === '/', true); // space before />, no space before >
    	      if (this._is_wrap_attributes_force_expand_multiline && last_tag_token.has_wrapped_attrs) {
    	        printer.print_newline(false);
    	      }
    	    }
    	    printer.print_token(raw_token);

    	  }

    	  if (last_tag_token.indent_content &&
    	    !(last_tag_token.is_unformatted || last_tag_token.is_content_unformatted)) {
    	    printer.indent();

    	    // only indent once per opened tag
    	    last_tag_token.indent_content = false;
    	  }

    	  if (!last_tag_token.is_inline_element &&
    	    !(last_tag_token.is_unformatted || last_tag_token.is_content_unformatted)) {
    	    printer.set_wrap_point();
    	  }

    	  return parser_token;
    	};

    	Beautifier.prototype._handle_inside_tag = function(printer, raw_token, last_tag_token, last_token) {
    	  var wrapped = last_tag_token.has_wrapped_attrs;
    	  var parser_token = {
    	    text: raw_token.text,
    	    type: raw_token.type
    	  };

    	  printer.set_space_before_token(raw_token.newlines || raw_token.whitespace_before !== '', true);
    	  if (last_tag_token.is_unformatted) {
    	    printer.add_raw_token(raw_token);
    	  } else if (last_tag_token.tag_start_char === '{' && raw_token.type === TOKEN.TEXT) {
    	    // For the insides of handlebars allow newlines or a single space between open and contents
    	    if (printer.print_preserved_newlines(raw_token)) {
    	      raw_token.newlines = 0;
    	      printer.add_raw_token(raw_token);
    	    } else {
    	      printer.print_token(raw_token);
    	    }
    	  } else {
    	    if (raw_token.type === TOKEN.ATTRIBUTE) {
    	      printer.set_space_before_token(true);
    	    } else if (raw_token.type === TOKEN.EQUALS) { //no space before =
    	      printer.set_space_before_token(false);
    	    } else if (raw_token.type === TOKEN.VALUE && raw_token.previous.type === TOKEN.EQUALS) { //no space before value
    	      printer.set_space_before_token(false);
    	    }

    	    if (raw_token.type === TOKEN.ATTRIBUTE && last_tag_token.tag_start_char === '<') {
    	      if (this._is_wrap_attributes_preserve || this._is_wrap_attributes_preserve_aligned) {
    	        printer.traverse_whitespace(raw_token);
    	        wrapped = wrapped || raw_token.newlines !== 0;
    	      }

    	      // Wrap for 'force' options, and if the number of attributes is at least that specified in 'wrap_attributes_min_attrs':
    	      // 1. always wrap the second and beyond attributes
    	      // 2. wrap the first attribute only if 'force-expand-multiline' is specified
    	      if (this._is_wrap_attributes_force &&
    	        last_tag_token.attr_count >= this._options.wrap_attributes_min_attrs &&
    	        (last_token.type !== TOKEN.TAG_OPEN || // ie. second attribute and beyond
    	          this._is_wrap_attributes_force_expand_multiline)) {
    	        printer.print_newline(false);
    	        wrapped = true;
    	      }
    	    }
    	    printer.print_token(raw_token);
    	    wrapped = wrapped || printer.previous_token_wrapped();
    	    last_tag_token.has_wrapped_attrs = wrapped;
    	  }
    	  return parser_token;
    	};

    	Beautifier.prototype._handle_text = function(printer, raw_token, last_tag_token) {
    	  var parser_token = {
    	    text: raw_token.text,
    	    type: 'TK_CONTENT'
    	  };
    	  if (last_tag_token.custom_beautifier_name) { //check if we need to format javascript
    	    this._print_custom_beatifier_text(printer, raw_token, last_tag_token);
    	  } else if (last_tag_token.is_unformatted || last_tag_token.is_content_unformatted) {
    	    printer.add_raw_token(raw_token);
    	  } else {
    	    printer.traverse_whitespace(raw_token);
    	    printer.print_token(raw_token);
    	  }
    	  return parser_token;
    	};

    	Beautifier.prototype._print_custom_beatifier_text = function(printer, raw_token, last_tag_token) {
    	  var local = this;
    	  if (raw_token.text !== '') {

    	    var text = raw_token.text,
    	      _beautifier,
    	      script_indent_level = 1,
    	      pre = '',
    	      post = '';
    	    if (last_tag_token.custom_beautifier_name === 'javascript' && typeof this._js_beautify === 'function') {
    	      _beautifier = this._js_beautify;
    	    } else if (last_tag_token.custom_beautifier_name === 'css' && typeof this._css_beautify === 'function') {
    	      _beautifier = this._css_beautify;
    	    } else if (last_tag_token.custom_beautifier_name === 'html') {
    	      _beautifier = function(html_source, options) {
    	        var beautifier = new Beautifier(html_source, options, local._js_beautify, local._css_beautify);
    	        return beautifier.beautify();
    	      };
    	    }

    	    if (this._options.indent_scripts === "keep") {
    	      script_indent_level = 0;
    	    } else if (this._options.indent_scripts === "separate") {
    	      script_indent_level = -printer.indent_level;
    	    }

    	    var indentation = printer.get_full_indent(script_indent_level);

    	    // if there is at least one empty line at the end of this text, strip it
    	    // we'll be adding one back after the text but before the containing tag.
    	    text = text.replace(/\n[ \t]*$/, '');

    	    // Handle the case where content is wrapped in a comment or cdata.
    	    if (last_tag_token.custom_beautifier_name !== 'html' &&
    	      text[0] === '<' && text.match(/^(<!--|<!\[CDATA\[)/)) {
    	      var matched = /^(<!--[^\n]*|<!\[CDATA\[)(\n?)([ \t\n]*)([\s\S]*)(-->|]]>)$/.exec(text);

    	      // if we start to wrap but don't finish, print raw
    	      if (!matched) {
    	        printer.add_raw_token(raw_token);
    	        return;
    	      }

    	      pre = indentation + matched[1] + '\n';
    	      text = matched[4];
    	      if (matched[5]) {
    	        post = indentation + matched[5];
    	      }

    	      // if there is at least one empty line at the end of this text, strip it
    	      // we'll be adding one back after the text but before the containing tag.
    	      text = text.replace(/\n[ \t]*$/, '');

    	      if (matched[2] || matched[3].indexOf('\n') !== -1) {
    	        // if the first line of the non-comment text has spaces
    	        // use that as the basis for indenting in null case.
    	        matched = matched[3].match(/[ \t]+$/);
    	        if (matched) {
    	          raw_token.whitespace_before = matched[0];
    	        }
    	      }
    	    }

    	    if (text) {
    	      if (_beautifier) {

    	        // call the Beautifier if avaliable
    	        var Child_options = function() {
    	          this.eol = '\n';
    	        };
    	        Child_options.prototype = this._options.raw_options;
    	        var child_options = new Child_options();
    	        text = _beautifier(indentation + text, child_options);
    	      } else {
    	        // simply indent the string otherwise
    	        var white = raw_token.whitespace_before;
    	        if (white) {
    	          text = text.replace(new RegExp('\n(' + white + ')?', 'g'), '\n');
    	        }

    	        text = indentation + text.replace(/\n/g, '\n' + indentation);
    	      }
    	    }

    	    if (pre) {
    	      if (!text) {
    	        text = pre + post;
    	      } else {
    	        text = pre + text + '\n' + post;
    	      }
    	    }

    	    printer.print_newline(false);
    	    if (text) {
    	      raw_token.text = text;
    	      raw_token.whitespace_before = '';
    	      raw_token.newlines = 0;
    	      printer.add_raw_token(raw_token);
    	      printer.print_newline(true);
    	    }
    	  }
    	};

    	Beautifier.prototype._handle_tag_open = function(printer, raw_token, last_tag_token, last_token, tokens) {
    	  var parser_token = this._get_tag_open_token(raw_token);

    	  if ((last_tag_token.is_unformatted || last_tag_token.is_content_unformatted) &&
    	    !last_tag_token.is_empty_element &&
    	    raw_token.type === TOKEN.TAG_OPEN && !parser_token.is_start_tag) {
    	    // End element tags for unformatted or content_unformatted elements
    	    // are printed raw to keep any newlines inside them exactly the same.
    	    printer.add_raw_token(raw_token);
    	    parser_token.start_tag_token = this._tag_stack.try_pop(parser_token.tag_name);
    	  } else {
    	    printer.traverse_whitespace(raw_token);
    	    this._set_tag_position(printer, raw_token, parser_token, last_tag_token, last_token);
    	    if (!parser_token.is_inline_element) {
    	      printer.set_wrap_point();
    	    }
    	    printer.print_token(raw_token);
    	  }

    	  // count the number of attributes
    	  if (parser_token.is_start_tag && this._is_wrap_attributes_force) {
    	    var peek_index = 0;
    	    var peek_token;
    	    do {
    	      peek_token = tokens.peek(peek_index);
    	      if (peek_token.type === TOKEN.ATTRIBUTE) {
    	        parser_token.attr_count += 1;
    	      }
    	      peek_index += 1;
    	    } while (peek_token.type !== TOKEN.EOF && peek_token.type !== TOKEN.TAG_CLOSE);
    	  }

    	  //indent attributes an auto, forced, aligned or forced-align line-wrap
    	  if (this._is_wrap_attributes_force_aligned || this._is_wrap_attributes_aligned_multiple || this._is_wrap_attributes_preserve_aligned) {
    	    parser_token.alignment_size = raw_token.text.length + 1;
    	  }

    	  if (!parser_token.tag_complete && !parser_token.is_unformatted) {
    	    printer.alignment_size = parser_token.alignment_size;
    	  }

    	  return parser_token;
    	};

    	var TagOpenParserToken = function(parent, raw_token) {
    	  this.parent = parent || null;
    	  this.text = '';
    	  this.type = 'TK_TAG_OPEN';
    	  this.tag_name = '';
    	  this.is_inline_element = false;
    	  this.is_unformatted = false;
    	  this.is_content_unformatted = false;
    	  this.is_empty_element = false;
    	  this.is_start_tag = false;
    	  this.is_end_tag = false;
    	  this.indent_content = false;
    	  this.multiline_content = false;
    	  this.custom_beautifier_name = null;
    	  this.start_tag_token = null;
    	  this.attr_count = 0;
    	  this.has_wrapped_attrs = false;
    	  this.alignment_size = 0;
    	  this.tag_complete = false;
    	  this.tag_start_char = '';
    	  this.tag_check = '';

    	  if (!raw_token) {
    	    this.tag_complete = true;
    	  } else {
    	    var tag_check_match;

    	    this.tag_start_char = raw_token.text[0];
    	    this.text = raw_token.text;

    	    if (this.tag_start_char === '<') {
    	      tag_check_match = raw_token.text.match(/^<([^\s>]*)/);
    	      this.tag_check = tag_check_match ? tag_check_match[1] : '';
    	    } else {
    	      tag_check_match = raw_token.text.match(/^{{~?(?:[\^]|#\*?)?([^\s}]+)/);
    	      this.tag_check = tag_check_match ? tag_check_match[1] : '';

    	      // handle "{{#> myPartial}}" or "{{~#> myPartial}}"
    	      if ((raw_token.text.startsWith('{{#>') || raw_token.text.startsWith('{{~#>')) && this.tag_check[0] === '>') {
    	        if (this.tag_check === '>' && raw_token.next !== null) {
    	          this.tag_check = raw_token.next.text.split(' ')[0];
    	        } else {
    	          this.tag_check = raw_token.text.split('>')[1];
    	        }
    	      }
    	    }

    	    this.tag_check = this.tag_check.toLowerCase();

    	    if (raw_token.type === TOKEN.COMMENT) {
    	      this.tag_complete = true;
    	    }

    	    this.is_start_tag = this.tag_check.charAt(0) !== '/';
    	    this.tag_name = !this.is_start_tag ? this.tag_check.substr(1) : this.tag_check;
    	    this.is_end_tag = !this.is_start_tag ||
    	      (raw_token.closed && raw_token.closed.text === '/>');

    	    // if whitespace handler ~ included (i.e. {{~#if true}}), handlebars tags start at pos 3 not pos 2
    	    var handlebar_starts = 2;
    	    if (this.tag_start_char === '{' && this.text.length >= 3) {
    	      if (this.text.charAt(2) === '~') {
    	        handlebar_starts = 3;
    	      }
    	    }

    	    // handlebars tags that don't start with # or ^ are single_tags, and so also start and end.
    	    this.is_end_tag = this.is_end_tag ||
    	      (this.tag_start_char === '{' && (this.text.length < 3 || (/[^#\^]/.test(this.text.charAt(handlebar_starts)))));
    	  }
    	};

    	Beautifier.prototype._get_tag_open_token = function(raw_token) { //function to get a full tag and parse its type
    	  var parser_token = new TagOpenParserToken(this._tag_stack.get_parser_token(), raw_token);

    	  parser_token.alignment_size = this._options.wrap_attributes_indent_size;

    	  parser_token.is_end_tag = parser_token.is_end_tag ||
    	    in_array(parser_token.tag_check, this._options.void_elements);

    	  parser_token.is_empty_element = parser_token.tag_complete ||
    	    (parser_token.is_start_tag && parser_token.is_end_tag);

    	  parser_token.is_unformatted = !parser_token.tag_complete && in_array(parser_token.tag_check, this._options.unformatted);
    	  parser_token.is_content_unformatted = !parser_token.is_empty_element && in_array(parser_token.tag_check, this._options.content_unformatted);
    	  parser_token.is_inline_element = in_array(parser_token.tag_name, this._options.inline) || (this._options.inline_custom_elements && parser_token.tag_name.includes("-")) || parser_token.tag_start_char === '{';

    	  return parser_token;
    	};

    	Beautifier.prototype._set_tag_position = function(printer, raw_token, parser_token, last_tag_token, last_token) {

    	  if (!parser_token.is_empty_element) {
    	    if (parser_token.is_end_tag) { //this tag is a double tag so check for tag-ending
    	      parser_token.start_tag_token = this._tag_stack.try_pop(parser_token.tag_name); //remove it and all ancestors
    	    } else { // it's a start-tag
    	      // check if this tag is starting an element that has optional end element
    	      // and do an ending needed
    	      if (this._do_optional_end_element(parser_token)) {
    	        if (!parser_token.is_inline_element) {
    	          printer.print_newline(false);
    	        }
    	      }

    	      this._tag_stack.record_tag(parser_token); //push it on the tag stack

    	      if ((parser_token.tag_name === 'script' || parser_token.tag_name === 'style') &&
    	        !(parser_token.is_unformatted || parser_token.is_content_unformatted)) {
    	        parser_token.custom_beautifier_name = get_custom_beautifier_name(parser_token.tag_check, raw_token);
    	      }
    	    }
    	  }

    	  if (in_array(parser_token.tag_check, this._options.extra_liners)) { //check if this double needs an extra line
    	    printer.print_newline(false);
    	    if (!printer._output.just_added_blankline()) {
    	      printer.print_newline(true);
    	    }
    	  }

    	  if (parser_token.is_empty_element) { //if this tag name is a single tag type (either in the list or has a closing /)

    	    // if you hit an else case, reset the indent level if you are inside an:
    	    // 'if', 'unless', or 'each' block.
    	    if (parser_token.tag_start_char === '{' && parser_token.tag_check === 'else') {
    	      this._tag_stack.indent_to_tag(['if', 'unless', 'each']);
    	      parser_token.indent_content = true;
    	      // Don't add a newline if opening {{#if}} tag is on the current line
    	      var foundIfOnCurrentLine = printer.current_line_has_match(/{{#if/);
    	      if (!foundIfOnCurrentLine) {
    	        printer.print_newline(false);
    	      }
    	    }

    	    // Don't add a newline before elements that should remain where they are.
    	    if (parser_token.tag_name === '!--' && last_token.type === TOKEN.TAG_CLOSE &&
    	      last_tag_token.is_end_tag && parser_token.text.indexOf('\n') === -1) ; else {
    	      if (!(parser_token.is_inline_element || parser_token.is_unformatted)) {
    	        printer.print_newline(false);
    	      }
    	      this._calcluate_parent_multiline(printer, parser_token);
    	    }
    	  } else if (parser_token.is_end_tag) { //this tag is a double tag so check for tag-ending
    	    var do_end_expand = false;

    	    // deciding whether a block is multiline should not be this hard
    	    do_end_expand = parser_token.start_tag_token && parser_token.start_tag_token.multiline_content;
    	    do_end_expand = do_end_expand || (!parser_token.is_inline_element &&
    	      !(last_tag_token.is_inline_element || last_tag_token.is_unformatted) &&
    	      !(last_token.type === TOKEN.TAG_CLOSE && parser_token.start_tag_token === last_tag_token) &&
    	      last_token.type !== 'TK_CONTENT'
    	    );

    	    if (parser_token.is_content_unformatted || parser_token.is_unformatted) {
    	      do_end_expand = false;
    	    }

    	    if (do_end_expand) {
    	      printer.print_newline(false);
    	    }
    	  } else { // it's a start-tag
    	    parser_token.indent_content = !parser_token.custom_beautifier_name;

    	    if (parser_token.tag_start_char === '<') {
    	      if (parser_token.tag_name === 'html') {
    	        parser_token.indent_content = this._options.indent_inner_html;
    	      } else if (parser_token.tag_name === 'head') {
    	        parser_token.indent_content = this._options.indent_head_inner_html;
    	      } else if (parser_token.tag_name === 'body') {
    	        parser_token.indent_content = this._options.indent_body_inner_html;
    	      }
    	    }

    	    if (!(parser_token.is_inline_element || parser_token.is_unformatted) &&
    	      (last_token.type !== 'TK_CONTENT' || parser_token.is_content_unformatted)) {
    	      printer.print_newline(false);
    	    }

    	    this._calcluate_parent_multiline(printer, parser_token);
    	  }
    	};

    	Beautifier.prototype._calcluate_parent_multiline = function(printer, parser_token) {
    	  if (parser_token.parent && printer._output.just_added_newline() &&
    	    !((parser_token.is_inline_element || parser_token.is_unformatted) && parser_token.parent.is_inline_element)) {
    	    parser_token.parent.multiline_content = true;
    	  }
    	};

    	//To be used for <p> tag special case:
    	var p_closers = ['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'];
    	var p_parent_excludes = ['a', 'audio', 'del', 'ins', 'map', 'noscript', 'video'];

    	Beautifier.prototype._do_optional_end_element = function(parser_token) {
    	  var result = null;
    	  // NOTE: cases of "if there is no more content in the parent element"
    	  // are handled automatically by the beautifier.
    	  // It assumes parent or ancestor close tag closes all children.
    	  // https://www.w3.org/TR/html5/syntax.html#optional-tags
    	  if (parser_token.is_empty_element || !parser_token.is_start_tag || !parser_token.parent) {
    	    return;

    	  }

    	  if (parser_token.tag_name === 'body') {
    	    // A head element’s end tag may be omitted if the head element is not immediately followed by a space character or a comment.
    	    result = result || this._tag_stack.try_pop('head');

    	    //} else if (parser_token.tag_name === 'body') {
    	    // DONE: A body element’s end tag may be omitted if the body element is not immediately followed by a comment.

    	  } else if (parser_token.tag_name === 'li') {
    	    // An li element’s end tag may be omitted if the li element is immediately followed by another li element or if there is no more content in the parent element.
    	    result = result || this._tag_stack.try_pop('li', ['ol', 'ul', 'menu']);

    	  } else if (parser_token.tag_name === 'dd' || parser_token.tag_name === 'dt') {
    	    // A dd element’s end tag may be omitted if the dd element is immediately followed by another dd element or a dt element, or if there is no more content in the parent element.
    	    // A dt element’s end tag may be omitted if the dt element is immediately followed by another dt element or a dd element.
    	    result = result || this._tag_stack.try_pop('dt', ['dl']);
    	    result = result || this._tag_stack.try_pop('dd', ['dl']);


    	  } else if (parser_token.parent.tag_name === 'p' && p_closers.indexOf(parser_token.tag_name) !== -1) {
    	    // IMPORTANT: this else-if works because p_closers has no overlap with any other element we look for in this method
    	    // check for the parent element is an HTML element that is not an <a>, <audio>, <del>, <ins>, <map>, <noscript>, or <video> element,  or an autonomous custom element.
    	    // To do this right, this needs to be coded as an inclusion of the inverse of the exclusion above.
    	    // But to start with (if we ignore "autonomous custom elements") the exclusion would be fine.
    	    var p_parent = parser_token.parent.parent;
    	    if (!p_parent || p_parent_excludes.indexOf(p_parent.tag_name) === -1) {
    	      result = result || this._tag_stack.try_pop('p');
    	    }
    	  } else if (parser_token.tag_name === 'rp' || parser_token.tag_name === 'rt') {
    	    // An rt element’s end tag may be omitted if the rt element is immediately followed by an rt or rp element, or if there is no more content in the parent element.
    	    // An rp element’s end tag may be omitted if the rp element is immediately followed by an rt or rp element, or if there is no more content in the parent element.
    	    result = result || this._tag_stack.try_pop('rt', ['ruby', 'rtc']);
    	    result = result || this._tag_stack.try_pop('rp', ['ruby', 'rtc']);

    	  } else if (parser_token.tag_name === 'optgroup') {
    	    // An optgroup element’s end tag may be omitted if the optgroup element is immediately followed by another optgroup element, or if there is no more content in the parent element.
    	    // An option element’s end tag may be omitted if the option element is immediately followed by another option element, or if it is immediately followed by an optgroup element, or if there is no more content in the parent element.
    	    result = result || this._tag_stack.try_pop('optgroup', ['select']);
    	    //result = result || this._tag_stack.try_pop('option', ['select']);

    	  } else if (parser_token.tag_name === 'option') {
    	    // An option element’s end tag may be omitted if the option element is immediately followed by another option element, or if it is immediately followed by an optgroup element, or if there is no more content in the parent element.
    	    result = result || this._tag_stack.try_pop('option', ['select', 'datalist', 'optgroup']);

    	  } else if (parser_token.tag_name === 'colgroup') {
    	    // DONE: A colgroup element’s end tag may be omitted if the colgroup element is not immediately followed by a space character or a comment.
    	    // A caption element's end tag may be ommitted if a colgroup, thead, tfoot, tbody, or tr element is started.
    	    result = result || this._tag_stack.try_pop('caption', ['table']);

    	  } else if (parser_token.tag_name === 'thead') {
    	    // A colgroup element's end tag may be ommitted if a thead, tfoot, tbody, or tr element is started.
    	    // A caption element's end tag may be ommitted if a colgroup, thead, tfoot, tbody, or tr element is started.
    	    result = result || this._tag_stack.try_pop('caption', ['table']);
    	    result = result || this._tag_stack.try_pop('colgroup', ['table']);

    	    //} else if (parser_token.tag_name === 'caption') {
    	    // DONE: A caption element’s end tag may be omitted if the caption element is not immediately followed by a space character or a comment.

    	  } else if (parser_token.tag_name === 'tbody' || parser_token.tag_name === 'tfoot') {
    	    // A thead element’s end tag may be omitted if the thead element is immediately followed by a tbody or tfoot element.
    	    // A tbody element’s end tag may be omitted if the tbody element is immediately followed by a tbody or tfoot element, or if there is no more content in the parent element.
    	    // A colgroup element's end tag may be ommitted if a thead, tfoot, tbody, or tr element is started.
    	    // A caption element's end tag may be ommitted if a colgroup, thead, tfoot, tbody, or tr element is started.
    	    result = result || this._tag_stack.try_pop('caption', ['table']);
    	    result = result || this._tag_stack.try_pop('colgroup', ['table']);
    	    result = result || this._tag_stack.try_pop('thead', ['table']);
    	    result = result || this._tag_stack.try_pop('tbody', ['table']);

    	    //} else if (parser_token.tag_name === 'tfoot') {
    	    // DONE: A tfoot element’s end tag may be omitted if there is no more content in the parent element.

    	  } else if (parser_token.tag_name === 'tr') {
    	    // A tr element’s end tag may be omitted if the tr element is immediately followed by another tr element, or if there is no more content in the parent element.
    	    // A colgroup element's end tag may be ommitted if a thead, tfoot, tbody, or tr element is started.
    	    // A caption element's end tag may be ommitted if a colgroup, thead, tfoot, tbody, or tr element is started.
    	    result = result || this._tag_stack.try_pop('caption', ['table']);
    	    result = result || this._tag_stack.try_pop('colgroup', ['table']);
    	    result = result || this._tag_stack.try_pop('tr', ['table', 'thead', 'tbody', 'tfoot']);

    	  } else if (parser_token.tag_name === 'th' || parser_token.tag_name === 'td') {
    	    // A td element’s end tag may be omitted if the td element is immediately followed by a td or th element, or if there is no more content in the parent element.
    	    // A th element’s end tag may be omitted if the th element is immediately followed by a td or th element, or if there is no more content in the parent element.
    	    result = result || this._tag_stack.try_pop('td', ['table', 'thead', 'tbody', 'tfoot', 'tr']);
    	    result = result || this._tag_stack.try_pop('th', ['table', 'thead', 'tbody', 'tfoot', 'tr']);
    	  }

    	  // Start element omission not handled currently
    	  // A head element’s start tag may be omitted if the element is empty, or if the first thing inside the head element is an element.
    	  // A tbody element’s start tag may be omitted if the first thing inside the tbody element is a tr element, and if the element is not immediately preceded by a tbody, thead, or tfoot element whose end tag has been omitted. (It can’t be omitted if the element is empty.)
    	  // A colgroup element’s start tag may be omitted if the first thing inside the colgroup element is a col element, and if the element is not immediately preceded by another colgroup element whose end tag has been omitted. (It can’t be omitted if the element is empty.)

    	  // Fix up the parent of the parser token
    	  parser_token.parent = this._tag_stack.get_parser_token();

    	  return result;
    	};

    	beautifier.Beautifier = Beautifier;
    	return beautifier;
    }

    /*jshint node:true */

    var hasRequiredHtml;

    function requireHtml () {
    	if (hasRequiredHtml) return html.exports;
    	hasRequiredHtml = 1;

    	var Beautifier = requireBeautifier().Beautifier,
    	  Options = requireOptions().Options;

    	function style_html(html_source, options, js_beautify, css_beautify) {
    	  var beautifier = new Beautifier(html_source, options, js_beautify, css_beautify);
    	  return beautifier.beautify();
    	}

    	html.exports = style_html;
    	html.exports.defaultOptions = function() {
    	  return new Options();
    	};
    	return html.exports;
    }

    /*jshint node:true */

    var hasRequiredSrc;

    function requireSrc () {
    	if (hasRequiredSrc) return src;
    	hasRequiredSrc = 1;

    	var js_beautify = requireJavascript();
    	var css_beautify = requireCss();
    	var html_beautify = requireHtml();

    	function style_html(html_source, options, js, css) {
    	  js = js || js_beautify;
    	  css = css || css_beautify;
    	  return html_beautify(html_source, options, js, css);
    	}
    	style_html.defaultOptions = html_beautify.defaultOptions;

    	src.js = js_beautify;
    	src.css = css_beautify;
    	src.html = style_html;
    	return src;
    }

    /*jshint node:true */

    (function (module) {

    	/**
    	The following batches are equivalent:

    	var beautify_js = require('js-beautify');
    	var beautify_js = require('js-beautify').js;
    	var beautify_js = require('js-beautify').js_beautify;

    	var beautify_css = require('js-beautify').css;
    	var beautify_css = require('js-beautify').css_beautify;

    	var beautify_html = require('js-beautify').html;
    	var beautify_html = require('js-beautify').html_beautify;

    	All methods returned accept two arguments, the source string and an options object.
    	**/

    	function get_beautify(js_beautify, css_beautify, html_beautify) {
    	  // the default is js
    	  var beautify = function(src, config) {
    	    return js_beautify.js_beautify(src, config);
    	  };

    	  // short aliases
    	  beautify.js = js_beautify.js_beautify;
    	  beautify.css = css_beautify.css_beautify;
    	  beautify.html = html_beautify.html_beautify;

    	  // legacy aliases
    	  beautify.js_beautify = js_beautify.js_beautify;
    	  beautify.css_beautify = css_beautify.css_beautify;
    	  beautify.html_beautify = html_beautify.html_beautify;

    	  return beautify;
    	}

    	{
    	  (function(mod) {
    	    var beautifier = requireSrc();
    	    beautifier.js_beautify = beautifier.js;
    	    beautifier.css_beautify = beautifier.css;
    	    beautifier.html_beautify = beautifier.html;

    	    mod.exports = get_beautify(beautifier, beautifier, beautifier);

    	  })(module);
    	} 
    } (js));

    var jsExports = js.exports;
    var beautify = /*@__PURE__*/getDefaultExportFromCjs(jsExports);

    var BaseWrapper = /** @class */ (function () {
        function BaseWrapper(element) {
            var _this = this;
            this.isDisabled = function () {
                var validTagsToBeDisabled = [
                    'BUTTON',
                    'COMMAND',
                    'FIELDSET',
                    'KEYGEN',
                    'OPTGROUP',
                    'OPTION',
                    'SELECT',
                    'TEXTAREA',
                    'INPUT'
                ];
                var hasDisabledAttribute = _this.attributes().disabled !== undefined;
                var elementCanBeDisabled = isElement(_this.element) &&
                    validTagsToBeDisabled.includes(_this.element.tagName);
                return hasDisabledAttribute && elementCanBeDisabled;
            };
            this.wrapperElement = element;
        }
        Object.defineProperty(BaseWrapper.prototype, "element", {
            get: function () {
                return this.wrapperElement;
            },
            enumerable: false,
            configurable: true
        });
        BaseWrapper.prototype.findAllDOMElements = function (selector) {
            var elementRootNodes = this.getRootNodes().filter(isElement);
            if (elementRootNodes.length === 0)
                return [];
            var result = __spreadArray([], elementRootNodes.filter(function (node) { return node.matches(selector); }), true);
            elementRootNodes.forEach(function (rootNode) {
                result.push.apply(result, Array.from(rootNode.querySelectorAll(selector)));
            });
            return result;
        };
        BaseWrapper.prototype.find = function (selector) {
            if (typeof selector === 'object' && 'ref' in selector) {
                var currentComponent = this.getCurrentComponent();
                if (!currentComponent) {
                    return createWrapperError('DOMWrapper');
                }
                var result = currentComponent.refs[selector.ref];
                // When using ref inside v-for, then refs contains array of component instances and nodes
                if (Array.isArray(result)) {
                    result = result.length ? result[0] : undefined;
                }
                if (result instanceof Node) {
                    return createDOMWrapper(result);
                }
                else {
                    return createWrapperError('DOMWrapper');
                }
            }
            var elements = this.findAll(selector);
            if (elements.length > 0) {
                return elements[0];
            }
            return createWrapperError('DOMWrapper');
        };
        BaseWrapper.prototype.findComponent = function (selector) {
            var currentComponent = this.getCurrentComponent();
            if (!currentComponent) {
                return createWrapperError('VueWrapper');
            }
            if (typeof selector === 'object' && 'ref' in selector) {
                var result_1 = currentComponent.refs[selector.ref];
                // When using ref inside v-for, then refs contains array of component instances
                if (Array.isArray(result_1)) {
                    result_1 = result_1.length ? result_1[0] : undefined;
                }
                if (result_1 && !(result_1 instanceof HTMLElement)) {
                    return createVueWrapper(null, result_1);
                }
                else {
                    return createWrapperError('VueWrapper');
                }
            }
            if (matches(currentComponent.vnode, selector) &&
                this.element.contains(currentComponent.vnode.el)) {
                return createVueWrapper(null, currentComponent.subTree.component
                    ? currentComponent.subTree.component.proxy
                    : currentComponent.proxy);
            }
            var result = this.findAllComponents(selector)[0];
            return result !== null && result !== void 0 ? result : createWrapperError('VueWrapper');
        };
        BaseWrapper.prototype.findAllComponents = function (selector) {
            var currentComponent = this.getCurrentComponent();
            if (!currentComponent) {
                return [];
            }
            var results = find(currentComponent.subTree, selector);
            return results.map(function (c) {
                return c.proxy
                    ? createVueWrapper(null, c.proxy)
                    : createDOMWrapper(c.vnode.el);
            });
        };
        BaseWrapper.prototype.html = function (options) {
            var stringNodes = this.getRootNodes().map(function (node) { return stringifyNode(node); });
            if (options === null || options === void 0 ? void 0 : options.raw)
                return stringNodes.join('');
            return stringNodes
                .map(function (node) {
                return beautify.html(node, {
                    unformatted: ['code', 'pre', 'em', 'strong', 'span'],
                    indent_inner_html: true,
                    indent_size: 2,
                    inline_custom_elements: false
                    // TODO the cast can be removed when @types/js-beautify will be up-to-date
                });
            })
                .join('\n');
        };
        BaseWrapper.prototype.classes = function (className) {
            var classes = isElement(this.element)
                ? Array.from(this.element.classList)
                : [];
            if (className)
                return classes.includes(className);
            return classes;
        };
        BaseWrapper.prototype.attributes = function (key) {
            var attributeMap = {};
            if (isElement(this.element)) {
                var attributes = Array.from(this.element.attributes);
                for (var _i = 0, attributes_1 = attributes; _i < attributes_1.length; _i++) {
                    var attribute = attributes_1[_i];
                    attributeMap[attribute.localName] = attribute.value;
                }
            }
            return key ? attributeMap[key] : attributeMap;
        };
        BaseWrapper.prototype.text = function () {
            return this.getRootNodes().map(textContent).join('');
        };
        BaseWrapper.prototype.exists = function () {
            return true;
        };
        BaseWrapper.prototype.get = function (selector) {
            var result = this.find(selector);
            if (result.exists()) {
                return result;
            }
            throw new Error("Unable to get ".concat(selector, " within: ").concat(this.html()));
        };
        BaseWrapper.prototype.getComponent = function (selector) {
            var result = this.findComponent(selector);
            if (result.exists()) {
                return result;
            }
            var message = 'Unable to get ';
            if (typeof selector === 'string') {
                message += "component with selector ".concat(selector);
            }
            else if ('name' in selector) {
                message += "component with name ".concat(selector.name);
            }
            else if ('ref' in selector) {
                message += "component with ref ".concat(selector.ref);
            }
            else {
                message += 'specified component';
            }
            message += " within: ".concat(this.html());
            throw new Error(message);
        };
        BaseWrapper.prototype.isVisible = function () {
            return isElement(this.element) && isElementVisible(this.element);
        };
        BaseWrapper.prototype.trigger = function (eventString, options) {
            return __awaiter(this, void 0, void 0, function () {
                var event_1;
                return __generator(this, function (_a) {
                    if (options && options['target']) {
                        throw Error("[vue-test-utils]: you cannot set the target value of an event. See the notes section " +
                            "of the docs for more details\u2014" +
                            "https://vue-test-utils.vuejs.org/api/wrapper/trigger.html");
                    }
                    if (this.element && !this.isDisabled()) {
                        event_1 = createDOMEvent(eventString, options);
                        // see https://github.com/vuejs/test-utils/issues/1854
                        // fakeTimers provoke an issue as Date.now() always return the same value
                        // and Vue relies on it to determine if the handler should be invoked
                        // see https://github.com/vuejs/core/blob/5ee40532a63e0b792e0c1eccf3cf68546a4e23e9/packages/runtime-dom/src/modules/events.ts#L100-L104
                        // we workaround this issue by manually setting _vts to Date.now() + 1
                        // thus making sure the event handler is invoked
                        event_1._vts = Date.now() + 1;
                        this.element.dispatchEvent(event_1);
                    }
                    return [2 /*return*/, Vue.nextTick()];
                });
            });
        };
        return BaseWrapper;
    }());

    var DOMWrapper = /** @class */ (function (_super) {
        __extends(DOMWrapper, _super);
        function DOMWrapper(element) {
            var _this = this;
            if (!element) {
                return createWrapperError('DOMWrapper');
            }
            _this = _super.call(this, element) || this;
            // plugins hook
            config.plugins.DOMWrapper.extend(_this);
            return _this;
        }
        DOMWrapper.prototype.getRootNodes = function () {
            return [this.wrapperElement];
        };
        DOMWrapper.prototype.getCurrentComponent = function () {
            var _a;
            var component = this.element.__vueParentComponent;
            while (((_a = component === null || component === void 0 ? void 0 : component.parent) === null || _a === void 0 ? void 0 : _a.vnode.el) === this.element) {
                component = component.parent;
            }
            return component;
        };
        DOMWrapper.prototype.find = function (selector) {
            var result = _super.prototype.find.call(this, selector);
            if (result.exists() && isRefSelector(selector)) {
                return this.element.contains(result.element)
                    ? result
                    : createWrapperError('DOMWrapper');
            }
            return result;
        };
        DOMWrapper.prototype.findAll = function (selector) {
            if (!(this.wrapperElement instanceof Element)) {
                return [];
            }
            return Array.from(this.wrapperElement.querySelectorAll(selector), createDOMWrapper);
        };
        DOMWrapper.prototype.findAllComponents = function (selector) {
            var _this = this;
            var results = _super.prototype.findAllComponents.call(this, selector);
            return results.filter(function (r) { return _this.element.contains(r.element); });
        };
        DOMWrapper.prototype.setChecked = function () {
            return __awaiter(this, arguments, void 0, function (checked) {
                var element, type;
                if (checked === void 0) { checked = true; }
                return __generator(this, function (_a) {
                    element = this.element;
                    type = this.attributes().type;
                    if (type === 'radio' && !checked) {
                        throw Error("wrapper.setChecked() cannot be called with parameter false on a '<input type=\"radio\" /> element.");
                    }
                    // we do not want to trigger an event if the user
                    // attempting set the same value twice
                    // this is because in a browser setting checked = true when it is
                    // already true is a no-op; no change event is triggered
                    if (checked === element.checked) {
                        return [2 /*return*/];
                    }
                    element.checked = checked;
                    this.trigger('input');
                    return [2 /*return*/, this.trigger('change')];
                });
            });
        };
        DOMWrapper.prototype.setValue = function (value) {
            var element = this.element;
            var tagName = element.tagName;
            var type = this.attributes().type;
            if (tagName === 'OPTION') {
                this.setSelected();
                return Promise.resolve();
            }
            else if (tagName === 'INPUT' && type === 'checkbox') {
                return this.setChecked(value);
            }
            else if (tagName === 'INPUT' && type === 'radio') {
                return this.setChecked(value);
            }
            else if (tagName === 'SELECT') {
                if (Array.isArray(value)) {
                    var selectElement = element;
                    for (var i = 0; i < selectElement.options.length; i++) {
                        var option = selectElement.options[i];
                        option.selected = value.includes(option.value);
                    }
                }
                else {
                    element.value = value;
                }
                this.trigger('input');
                return this.trigger('change');
            }
            else if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                element.value = value;
                this.trigger('input');
                // trigger `change` for `v-model.lazy`
                return this.trigger('change');
            }
            else {
                throw Error("wrapper.setValue() cannot be called on ".concat(tagName));
            }
        };
        DOMWrapper.prototype.setSelected = function () {
            var element = this.element;
            if (element.selected) {
                return;
            }
            // todo - review all non-null assertion operators in project
            // search globally for `!.` and with regex `!$`
            element.selected = true;
            var parentElement = element.parentElement;
            if (parentElement.tagName === 'OPTGROUP') {
                parentElement = parentElement.parentElement;
            }
            var parentWrapper = new DOMWrapper(parentElement);
            parentWrapper.trigger('input');
            return parentWrapper.trigger('change');
        };
        return DOMWrapper;
    }(BaseWrapper));
    registerFactory(WrapperType.DOMWrapper, function (element) { return new DOMWrapper(element); });

    function getRootNodes(vnode) {
        if (vnode.shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
            return [vnode.el];
        }
        else if (vnode.shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            var subTree = vnode.component.subTree;
            return getRootNodes(subTree);
        }
        else if (vnode.shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
            return getRootNodes(vnode.suspense.activeBranch);
        }
        else if (vnode.shapeFlag &
            (8 /* ShapeFlags.TEXT_CHILDREN */ | 64 /* ShapeFlags.TELEPORT */)) {
            // static node optimization, subTree.children will be static string and will not help us
            var result = [vnode.el];
            if (vnode.anchor) {
                var currentNode = result[0].nextSibling;
                while (currentNode && currentNode.previousSibling !== vnode.anchor) {
                    result.push(currentNode);
                    currentNode = currentNode.nextSibling;
                }
            }
            return result;
        }
        else if (vnode.shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
            var children = vnode.children.flat();
            return children
                .flatMap(function (vnode) { return getRootNodes(vnode); })
                .filter(isNotNullOrUndefined);
        }
        // Missing cases which do not need special handling:
        // ShapeFlags.SLOTS_CHILDREN comes with ShapeFlags.ELEMENT
        // Will hit this default when ShapeFlags is 0
        // This is the case for example for unresolved async component without loader
        return [];
    }

    var events = {};
    function emitted(vm, eventName) {
        var cid = vm.$.uid;
        var vmEvents = events[cid] || {};
        if (eventName) {
            return vmEvents ? vmEvents[eventName] : undefined;
        }
        return vmEvents;
    }
    var attachEmitListener = function () {
        var target = getGlobalThis();
        // override emit to capture events when devtools is defined
        if (target.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
            var _emit_1 = target.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit;
            target.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit = function (eventType) {
                var payload = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    payload[_i - 1] = arguments[_i];
                }
                _emit_1.call.apply(_emit_1, __spreadArray([target.__VUE_DEVTOOLS_GLOBAL_HOOK__, eventType], payload, false));
                captureDevtoolsVueComponentEmitEvent(eventType, payload);
            };
        }
        else {
            // use devtools to capture this "emit"
            Vue.setDevtoolsHook(createDevTools(), {});
        }
    };
    function captureDevtoolsVueComponentEmitEvent(eventType, payload) {
        if (eventType === "component:emit" /* DevtoolsHooks.COMPONENT_EMIT */) {
            payload[0]; var componentVM = payload[1], event_1 = payload[2], eventArgs = payload[3];
            recordEvent(componentVM, event_1, eventArgs);
        }
    }
    // devtools hook only catches Vue component custom events
    function createDevTools() {
        return {
            emit: function (eventType) {
                var payload = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    payload[_i - 1] = arguments[_i];
                }
                captureDevtoolsVueComponentEmitEvent(eventType, payload);
            }
        };
    }
    var recordEvent = function (vm, event, args) {
        // Functional component wrapper creates a parent component
        var wrapperVm = vm;
        while (typeof (wrapperVm === null || wrapperVm === void 0 ? void 0 : wrapperVm.type) === 'function')
            wrapperVm = wrapperVm.parent;
        var cid = wrapperVm.uid;
        if (!(cid in events)) {
            events[cid] = {};
        }
        if (!(event in events[cid])) {
            events[cid][event] = [];
        }
        // Record the event message sent by the emit
        events[cid][event].push(args);
    };
    var removeEventHistory = function (vm) {
        var cid = vm.$.uid;
        delete events[cid];
    };

    /**
     * Creates a proxy around the VM instance.
     * This proxy returns the value from the setupState if there is one, or the one from the VM if not.
     * See https://github.com/vuejs/core/issues/7103
     */
    function createVMProxy(vm, setupState) {
        return new Proxy(vm, {
            get: function (vm, key, receiver) {
                if (vm.$.exposed && vm.$.exposeProxy && key in vm.$.exposeProxy) {
                    // first if the key is exposed
                    return Reflect.get(vm.$.exposeProxy, key, receiver);
                }
                else if (key in setupState) {
                    // second if the key is acccessible from the setupState
                    return Reflect.get(setupState, key, receiver);
                }
                else if (key in vm.$.appContext.config.globalProperties) {
                    // third if the key is a global property
                    return Reflect.get(vm.$.appContext.config.globalProperties, key, receiver);
                }
                else {
                    // vm.$.ctx is the internal context of the vm
                    // with all variables, methods and props
                    return vm.$.ctx[key];
                }
            },
            set: function (vm, key, value, receiver) {
                if (key in setupState) {
                    return Reflect.set(setupState, key, value, receiver);
                }
                else {
                    return Reflect.set(vm, key, value, receiver);
                }
            },
            has: function (vm, property) {
                return Reflect.has(setupState, property) || Reflect.has(vm, property);
            },
            defineProperty: function (vm, key, attributes) {
                if (key in setupState) {
                    return Reflect.defineProperty(setupState, key, attributes);
                }
                else {
                    return Reflect.defineProperty(vm, key, attributes);
                }
            },
            getOwnPropertyDescriptor: function (vm, property) {
                if (property in setupState) {
                    return Reflect.getOwnPropertyDescriptor(setupState, property);
                }
                else {
                    return Reflect.getOwnPropertyDescriptor(vm, property);
                }
            },
            deleteProperty: function (vm, property) {
                if (property in setupState) {
                    return Reflect.deleteProperty(setupState, property);
                }
                else {
                    return Reflect.deleteProperty(vm, property);
                }
            }
        });
    }
    var VueWrapper = /** @class */ (function (_super) {
        __extends(VueWrapper, _super);
        function VueWrapper(app, vm, setProps) {
            var _this = _super.call(this, vm === null || vm === void 0 ? void 0 : vm.$el) || this;
            _this.cleanUpCallbacks = [];
            _this.__app = app;
            // root is null on functional components
            _this.rootVM = vm === null || vm === void 0 ? void 0 : vm.$root;
            // `vm.$.setupState` is what the template has access to
            // so even if the component is closed (as they are by default for `script setup`)
            // a test will still be able to do something like
            // `expect(wrapper.vm.count).toBe(1)`
            // if we return it as `vm`
            // This does not work for functional components though (as they have no vm)
            // or for components with a setup that returns a render function (as they have an empty proxy)
            // in both cases, we return `vm` directly instead
            if (hasSetupState(vm)) {
                _this.componentVM = createVMProxy(vm, vm.$.setupState);
            }
            else {
                _this.componentVM = vm;
            }
            _this.__setProps = setProps;
            _this.attachNativeEventListener();
            config.plugins.VueWrapper.extend(_this);
            return _this;
        }
        Object.defineProperty(VueWrapper.prototype, "hasMultipleRoots", {
            get: function () {
                // Recursive check subtree for nested root elements
                // <template>
                //   <WithMultipleRoots />
                // </template>
                var checkTree = function (subTree) {
                    var _a;
                    // if the subtree is an array of children, we have multiple root nodes
                    if (subTree.shapeFlag === 16 /* ShapeFlags.ARRAY_CHILDREN */)
                        return true;
                    if (subTree.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */ ||
                        subTree.shapeFlag & 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */) {
                        // We are rendering other component, check it's tree instead
                        if ((_a = subTree.component) === null || _a === void 0 ? void 0 : _a.subTree) {
                            return checkTree(subTree.component.subTree);
                        }
                        // Component has multiple children
                        if (subTree.shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                            return true;
                        }
                    }
                    return false;
                };
                return checkTree(this.vm.$.subTree);
            },
            enumerable: false,
            configurable: true
        });
        VueWrapper.prototype.getRootNodes = function () {
            return getRootNodes(this.vm.$.vnode);
        };
        Object.defineProperty(VueWrapper.prototype, "parentElement", {
            get: function () {
                return this.vm.$el.parentElement;
            },
            enumerable: false,
            configurable: true
        });
        VueWrapper.prototype.getCurrentComponent = function () {
            return this.vm.$;
        };
        VueWrapper.prototype.exists = function () {
            return !this.getCurrentComponent().isUnmounted;
        };
        VueWrapper.prototype.findAll = function (selector) {
            return this.findAllDOMElements(selector).map(createDOMWrapper);
        };
        VueWrapper.prototype.attachNativeEventListener = function () {
            var vm = this.vm;
            if (!vm)
                return;
            var emits = vm.$options.emits
                ? // if emits is declared as an array
                    Array.isArray(vm.$options.emits)
                        ? // use it
                            vm.$options.emits
                        : // otherwise it's declared as an object
                            // and we only need the keys
                            Object.keys(vm.$options.emits)
                : [];
            var elementRoots = this.getRootNodes().filter(function (node) { return node instanceof Element; });
            if (elementRoots.length !== 1) {
                return;
            }
            var element = elementRoots[0];
            var _loop_1 = function (eventName) {
                // if a component includes events in 'emits' with the same name as native
                // events, the native events with that name should be ignored
                // @see https://github.com/vuejs/rfcs/blob/master/active-rfcs/0030-emits-option.md#fallthrough-control
                if (emits.includes(eventName))
                    return "continue";
                var eventListener = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    recordEvent(vm.$, eventName, args);
                };
                element.addEventListener(eventName, eventListener);
                this_1.cleanUpCallbacks.push(function () {
                    element.removeEventListener(eventName, eventListener);
                });
            };
            var this_1 = this;
            for (var _i = 0, _a = Object.keys(domEvents); _i < _a.length; _i++) {
                var eventName = _a[_i];
                _loop_1(eventName);
            }
        };
        Object.defineProperty(VueWrapper.prototype, "element", {
            get: function () {
                // if the component has multiple root elements, we use the parent's element
                return this.hasMultipleRoots ? this.parentElement : this.vm.$el;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(VueWrapper.prototype, "vm", {
            get: function () {
                return this.componentVM;
            },
            enumerable: false,
            configurable: true
        });
        VueWrapper.prototype.props = function (selector) {
            var props = this.componentVM.$props;
            return selector ? props[selector] : props;
        };
        VueWrapper.prototype.emitted = function (eventName) {
            return emitted(this.vm, eventName);
        };
        VueWrapper.prototype.isVisible = function () {
            var domWrapper = createDOMWrapper(this.element);
            return domWrapper.isVisible();
        };
        VueWrapper.prototype.setData = function (data) {
            mergeDeep(this.componentVM.$data, data);
            return Vue.nextTick();
        };
        VueWrapper.prototype.setProps = function (props) {
            // if this VM's parent is not the root or if setProps does not exist, error out
            if (this.vm.$parent !== this.rootVM || !this.__setProps) {
                throw Error('You can only use setProps on your mounted component');
            }
            this.__setProps(props);
            return Vue.nextTick();
        };
        VueWrapper.prototype.setValue = function (value, prop) {
            var propEvent = prop || 'modelValue';
            this.vm.$emit("update:".concat(propEvent), value);
            return this.vm.$nextTick();
        };
        VueWrapper.prototype.unmount = function () {
            // preventing dispose of child component
            if (!this.__app) {
                throw new Error("wrapper.unmount() can only be called by the root wrapper");
            }
            // Clear emitted events cache for this component instance
            removeEventHistory(this.vm);
            this.cleanUpCallbacks.forEach(function (cb) { return cb(); });
            this.cleanUpCallbacks = [];
            this.__app.unmount();
        };
        return VueWrapper;
    }(BaseWrapper));
    registerFactory(WrapperType.VueWrapper, function (app, vm, setProps) { return new VueWrapper(app, vm, setProps); });

    function processSlot(source, Vue) {
        if (source === void 0) { source = ''; }
        if (Vue === void 0) { Vue = Vue__namespace; }
        var template = source.trim();
        var hasWrappingTemplate = template && template.startsWith('<template');
        // allow content without `template` tag, for easier testing
        if (!hasWrappingTemplate) {
            template = "<template #default=\"params\">".concat(template, "</template>");
        }
        // Vue does not provide an easy way to compile template in "slot" mode
        // Since we do not want to rely on compiler internals and specify
        // transforms manually we create fake component invocation with the slot we
        // need and pick slots param from render function later. Fake component will
        // never be instantiated but it requires to be a component so compile
        // properly generate invocation. Since we do not want to monkey-patch
        // `resolveComponent` function we are just using one of built-in components:
        // transition
        var code = compilerDom.compile("<transition>".concat(template, "</transition>"), {
            mode: 'function',
            prefixIdentifiers: false
        }).code;
        var createRenderFunction = new Function('Vue', code);
        var renderFn = createRenderFunction(Vue);
        return function (ctx) {
            if (ctx === void 0) { ctx = {}; }
            var result = renderFn(ctx);
            var slotName = Object.keys(result.children)[0];
            return result.children[slotName](ctx);
        };
    }

    var isTeleport = function (type) { return type.__isTeleport; };
    var isKeepAlive = function (type) { return type.__isKeepAlive; };
    var isRootComponent = function (rootComponents, type, instance) {
        return !!(!instance ||
            // Don't stub mounted component on root level
            (rootComponents.component === type && !(instance === null || instance === void 0 ? void 0 : instance.parent)) ||
            // Don't stub component with compat wrapper
            (rootComponents.functional && rootComponents.functional === type));
    };
    var createVNodeTransformer = function (_a) {
        var rootComponents = _a.rootComponents, transformers = _a.transformers;
        var transformationCache = new WeakMap();
        return function (args, instance) {
            var originalType = args[0], props = args[1], children = args[2], restVNodeArgs = args.slice(3);
            if (!isComponent(originalType)) {
                return __spreadArray([originalType, props, children], restVNodeArgs, true);
            }
            var componentType = originalType;
            var cachedTransformation = transformationCache.get(originalType);
            if (cachedTransformation &&
                // Don't use cache for root component, as it could use stubbed recursive component
                !isRootComponent(rootComponents, componentType, instance) &&
                !isTeleport(originalType) &&
                !isKeepAlive(originalType)) {
                return __spreadArray([cachedTransformation, props, children], restVNodeArgs, true);
            }
            var transformedType = transformers.reduce(function (type, transformer) { return transformer(type, instance); }, componentType);
            if (originalType !== transformedType) {
                transformationCache.set(originalType, transformedType);
                registerStub({ source: originalType, stub: transformedType });
                // https://github.com/vuejs/test-utils/issues/1829 & https://github.com/vuejs/test-utils/issues/1888
                // Teleport/KeepAlive should return child nodes as a function
                if (isTeleport(originalType) || isKeepAlive(originalType)) {
                    return __spreadArray([transformedType, props, function () { return children; }], restVNodeArgs, true);
                }
            }
            return __spreadArray([transformedType, props, children], restVNodeArgs, true);
        };
    };

    var normalizeStubProps = function (props) {
        // props are always normalized to object syntax
        var $props = props;
        return Object.keys($props).reduce(function (acc, key) {
            var _a, _b, _c;
            var _d;
            if (typeof $props[key] === 'symbol') {
                return __assign(__assign({}, acc), (_a = {}, _a[key] = [(_d = $props[key]) === null || _d === void 0 ? void 0 : _d.toString()], _a));
            }
            if (typeof $props[key] === 'function') {
                return __assign(__assign({}, acc), (_b = {}, _b[key] = ['[Function]'], _b));
            }
            return __assign(__assign({}, acc), (_c = {}, _c[key] = $props[key], _c));
        }, {});
    };
    var clearAndUpper = function (text) { return text.replace(/-/, '').toUpperCase(); };
    var kebabToPascalCase = function (tag) {
        return tag.replace(/(^\w|-\w)/g, clearAndUpper);
    };
    var DEFAULT_STUBS = {
        teleport: isTeleport,
        'keep-alive': isKeepAlive,
        transition: function (type) { return type === Vue.Transition || type === Vue.BaseTransition; },
        'transition-group': function (type) { return type === Vue.TransitionGroup; }
    };
    var createDefaultStub = function (kebabTag, predicate, type, stubs) {
        var pascalTag = kebabToPascalCase(kebabTag);
        if (predicate(type) && (pascalTag in stubs || kebabTag in stubs)) {
            if (kebabTag in stubs && stubs[kebabTag] === false)
                return type;
            if (pascalTag in stubs && stubs[pascalTag] === false)
                return type;
            if (stubs[kebabTag] === true || stubs[pascalTag] === true) {
                return createStub({
                    name: kebabTag,
                    type: type,
                    renderStubDefaultSlot: true
                });
            }
        }
    };
    var createStub = function (_a) {
        var name = _a.name, type = _a.type, renderStubDefaultSlot = _a.renderStubDefaultSlot;
        var anonName = 'anonymous-stub';
        var tag = name ? "".concat(hyphenate(name), "-stub") : anonName;
        var componentOptions = type
            ? unwrapLegacyVueExtendComponent(type) || {}
            : {};
        var stub = Vue.defineComponent({
            name: name || anonName,
            props: componentOptions.props || {},
            // fix #1550 - respect old-style v-model for shallow mounted components with @vue/compat
            // @ts-expect-error
            model: componentOptions.model,
            setup: function (props, _a) {
                var slots = _a.slots;
                return function () {
                    // https://github.com/vuejs/test-utils/issues/1076
                    // Passing a symbol as a static prop is not legal, since Vue will try to do
                    // something like `el.setAttribute('val', Symbol())` which is not valid and
                    // causes an error.
                    // Only a problem when shallow mounting. For this reason we iterate of the
                    // props that will be passed and stringify any that are symbols.
                    // Also having function text as attribute is useless and annoying so
                    // we replace it with "[Function]""
                    var stubProps = normalizeStubProps(props);
                    // if renderStubDefaultSlot is true, we render the default slot
                    if (renderStubDefaultSlot && slots.default) {
                        // we explicitly call the default slot with an empty object
                        // so scope slots destructuring works
                        return Vue.h(tag, stubProps, slots.default({}));
                    }
                    return Vue.h(tag, stubProps);
                };
            }
        });
        var asyncLoader = type.__asyncLoader;
        if (asyncLoader) {
            asyncLoader().then(function () {
                registerStub({
                    source: type.__asyncResolved,
                    stub: stub
                });
            });
        }
        return stub;
    };
    var resolveComponentStubByName = function (componentName, stubs) {
        for (var _i = 0, _a = Object.entries(stubs); _i < _a.length; _i++) {
            var _b = _a[_i], stubKey = _b[0], value = _b[1];
            if (matchName(componentName, stubKey)) {
                return value;
            }
        }
    };
    function createStubComponentsTransformer(_a) {
        var rootComponents = _a.rootComponents, _b = _a.stubs, stubs = _b === void 0 ? {} : _b, _c = _a.shallow, shallow = _c === void 0 ? false : _c, _d = _a.renderStubDefaultSlot, renderStubDefaultSlot = _d === void 0 ? false : _d;
        return function componentsTransformer(type, instance) {
            var _a, _b, _c;
            for (var tag in DEFAULT_STUBS) {
                var predicate = DEFAULT_STUBS[tag];
                var defaultStub = createDefaultStub(tag, predicate, type, stubs);
                if (defaultStub)
                    return defaultStub;
            }
            // Don't stub root components
            if (isRootComponent(rootComponents, type, instance)) {
                return type;
            }
            var registeredName = getComponentRegisteredName(instance, type);
            var componentName = getComponentName(instance, type);
            var stub = null;
            var name = null;
            // Prio 1 using the key in locally registered components in the parent
            if (registeredName) {
                stub = resolveComponentStubByName(registeredName, stubs);
                if (stub) {
                    name = registeredName;
                }
            }
            // Prio 2 using the name attribute in the component
            if (!stub && componentName) {
                stub = resolveComponentStubByName(componentName, stubs);
                if (stub) {
                    name = componentName;
                }
            }
            // case 2: custom implementation
            if (isComponent(stub)) {
                var unwrappedStub = unwrapLegacyVueExtendComponent(stub);
                var stubFn_1 = isFunctionalComponent(unwrappedStub) ? unwrappedStub : null;
                // Edge case: stub is component, we will not render stub but instead will create
                // a new "copy" of stub component definition, but we want user still to be able
                // to find our component by stub definition, so we register it manually
                registerStub({ source: type, stub: stub });
                var specializedStubComponent = stubFn_1
                    ? function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return stubFn_1.apply(void 0, args);
                    }
                    : __assign({}, unwrappedStub);
                specializedStubComponent.props = unwrappedStub.props;
                return specializedStubComponent;
            }
            if (stub === false) {
                // we explicitly opt out of stubbing this component
                return type;
            }
            // we return a stub by matching Vue's `h` function
            // where the signature is h(Component, props, slots)
            // case 1: default stub
            if (stub === true || shallow) {
                // Set name when using shallow without stub
                var stubName = name || registeredName || componentName;
                return ((_c = (_b = (_a = config.plugins).createStubs) === null || _b === void 0 ? void 0 : _b.call(_a, {
                    name: stubName,
                    component: type,
                    registerStub: registerStub
                })) !== null && _c !== void 0 ? _c : createStub({
                    name: stubName,
                    type: type,
                    renderStubDefaultSlot: renderStubDefaultSlot
                }));
            }
            return type;
        };
    }

    var noop = function () { };
    function createStubDirectivesTransformer(_a) {
        var _b = _a.directives, directives = _b === void 0 ? {} : _b;
        if (Object.keys(directives).length === 0) {
            return function (type) { return type; };
        }
        return function directivesTransformer(type) {
            if (isObjectComponent(type) && type.directives) {
                // We want to change component types as rarely as possible
                // So first we check if there are any directives we should stub
                var directivesToPatch = Object.keys(type.directives).filter(function (key) { return key in directives; });
                if (!directivesToPatch.length) {
                    return type;
                }
                var replacementDirectives = Object.fromEntries(directivesToPatch.map(function (name) {
                    var directive = directives[name];
                    return [name, typeof directive === 'boolean' ? noop : directive];
                }));
                return __assign(__assign({}, type), { directives: __assign(__assign({}, type.directives), replacementDirectives) });
            }
            return type;
        };
    }

    /**
     * Implementation details of isDeepRef to avoid circular dependencies.
     * It keeps track of visited objects to avoid infinite recursion.
     *
     * @param r The value to check for a Ref.
     * @param visitedObjects a weak map to keep track of visited objects and avoid infinite recursion
     * @returns returns true if the value is a Ref, false otherwise
     */
    var deeplyCheckForRef = function (r, visitedObjects) {
        if (Vue.isRef(r))
            return true;
        if (!isObject(r))
            return false;
        if (visitedObjects.has(r))
            return false;
        visitedObjects.set(r, true);
        return Object.values(r).some(function (val) { return deeplyCheckForRef(val, visitedObjects); });
    };
    /**
     * Checks if the given value is a DeepRef.
     *
     * For both arrays and objects, it will recursively check
     * if any of their values is a Ref.
     *
     * @param {DeepRef<T> | unknown} r - The value to check.
     * @returns {boolean} Returns true if the value is a DeepRef, false otherwise.
     */
    var isDeepRef = function (r) {
        var visitedObjects = new WeakMap();
        return deeplyCheckForRef(r, visitedObjects);
    };

    var MOUNT_OPTIONS = [
        'attachTo',
        'attrs',
        'data',
        'props',
        'slots',
        'global',
        'shallow'
    ];
    function getInstanceOptions(options) {
        if (options.methods) {
            console.warn("Passing a `methods` option to mount was deprecated on Vue Test Utils v1, and it won't have any effect on v2. For additional info: https://vue-test-utils.vuejs.org/upgrading-to-v1/#setmethods-and-mountingoptions-methods");
            delete options.methods;
        }
        var resultOptions = __assign({}, options);
        for (var _i = 0, _a = Object.keys(options); _i < _a.length; _i++) {
            var key = _a[_i];
            if (MOUNT_OPTIONS.includes(key)) {
                delete resultOptions[key];
            }
        }
        return resultOptions;
    }
    // implementation
    function createInstance(inputComponent, options) {
        // normalize the incoming component
        var originalComponent = unwrapLegacyVueExtendComponent(inputComponent);
        var component;
        var instanceOptions = getInstanceOptions(options !== null && options !== void 0 ? options : {});
        var rootComponents = {};
        if (isFunctionalComponent(originalComponent) ||
            isLegacyFunctionalComponent(originalComponent)) {
            component = Vue.defineComponent(__assign({ compatConfig: {
                    MODE: 3,
                    INSTANCE_LISTENERS: false,
                    INSTANCE_ATTRS_CLASS_STYLE: false,
                    COMPONENT_FUNCTIONAL: isLegacyFunctionalComponent(originalComponent)
                        ? 'suppress-warning'
                        : false
                }, props: originalComponent.props || {}, setup: function (props, _a) {
                    var attrs = _a.attrs, slots = _a.slots;
                    return function () {
                        return Vue.h(originalComponent, __assign(__assign({}, props), attrs), slots);
                    };
                } }, instanceOptions));
            rootComponents.functional = originalComponent;
        }
        else if (isObjectComponent(originalComponent)) {
            component = __assign(__assign({}, originalComponent), instanceOptions);
        }
        else {
            component = originalComponent;
        }
        rootComponents.component = component;
        // We've just replaced our component with its copy
        // Let's register it as a stub so user can find it
        registerStub({ source: originalComponent, stub: component });
        function slotToFunction(slot) {
            switch (typeof slot) {
                case 'function':
                    return slot;
                case 'object':
                    return function () { return Vue.h(slot); };
                case 'string':
                    return processSlot(slot);
                default:
                    throw Error("Invalid slot received.");
            }
        }
        // handle any slots passed via mounting options
        var slots = (options === null || options === void 0 ? void 0 : options.slots) &&
            Object.entries(options.slots).reduce(function (acc, _a) {
                var name = _a[0], slot = _a[1];
                if (Array.isArray(slot)) {
                    var normalized_1 = slot.map(slotToFunction);
                    acc[name] = function (args) { return normalized_1.map(function (f) { return f(args); }); };
                    return acc;
                }
                acc[name] = slotToFunction(slot);
                return acc;
            }, {});
        // override component data with mounting options data
        if (options === null || options === void 0 ? void 0 : options.data) {
            var providedData_1 = options.data();
            if (isObjectComponent(originalComponent)) {
                // component is guaranteed to be the same type as originalComponent
                var objectComponent = component;
                var originalDataFn_1 = originalComponent.data || (function () { return ({}); });
                objectComponent.data = function (vm) { return (__assign(__assign({}, originalDataFn_1.call(vm, vm)), providedData_1)); };
            }
            else {
                throw new Error('data() option is not supported on functional and class components');
            }
        }
        var MOUNT_COMPONENT_REF = 'VTU_COMPONENT';
        // we define props as reactive so that way when we update them with `setProps`
        // Vue's reactivity system will cause a rerender.
        var refs = Vue.shallowReactive({});
        var props = Vue.reactive({});
        Object.entries(__assign(__assign(__assign(__assign({}, options === null || options === void 0 ? void 0 : options.attrs), options === null || options === void 0 ? void 0 : options.propsData), options === null || options === void 0 ? void 0 : options.props), { ref: MOUNT_COMPONENT_REF })).forEach(function (_a) {
            var k = _a[0], v = _a[1];
            if (isDeepRef(v)) {
                refs[k] = v;
            }
            else {
                props[k] = v;
            }
        });
        var global = mergeGlobalProperties(options === null || options === void 0 ? void 0 : options.global);
        if (isObjectComponent(component)) {
            component.components = __assign(__assign({}, component.components), global.components);
        }
        var componentRef = Vue.ref(null);
        // create the wrapper component
        var Parent = Vue.defineComponent({
            name: 'VTU_ROOT',
            setup: function () {
                var _a;
                return _a = {},
                    _a[MOUNT_COMPONENT_REF] = componentRef,
                    _a;
            },
            render: function () {
                return Vue.h(component, __assign(__assign({}, props), refs), slots);
            }
        });
        // create the app
        var app = Vue.createApp(Parent);
        // add tracking for emitted events
        // this must be done after `createApp`: https://github.com/vuejs/test-utils/issues/436
        attachEmitListener();
        // global mocks mixin
        if (global === null || global === void 0 ? void 0 : global.mocks) {
            var mixin = {
                beforeCreate: function () {
                    // we need to differentiate components that are or not not `script setup`
                    // otherwise we run into a proxy set error
                    // due to https://github.com/vuejs/core/commit/f73925d76a76ee259749b8b48cb68895f539a00f#diff-ea4d1ddabb7e22e17e80ada458eef70679af4005df2a1a6b73418fec897603ceR404
                    // introduced in Vue v3.2.45
                    // Also ensures not to include option API components in this block
                    // since they can also have setup state but need to be patched using
                    // the regular method.
                    if (isScriptSetup(this)) {
                        // add the mocks to setupState
                        for (var _i = 0, _a = Object.entries(global.mocks); _i < _a.length; _i++) {
                            var _b = _a[_i], k = _b[0], v = _b[1];
                            // we do this in a try/catch, as some properties might be read-only
                            try {
                                this.$.setupState[k] = v;
                                // eslint-disable-next-line no-empty
                            }
                            catch (e) { }
                        }
                        this.$.proxy = new Proxy(this.$.proxy, {
                            get: function (target, key) {
                                if (key in global.mocks) {
                                    return global.mocks[key];
                                }
                                return target[key];
                            }
                        });
                    }
                    else {
                        for (var _c = 0, _d = Object.entries(global.mocks); _c < _d.length; _c++) {
                            var _e = _d[_c], k = _e[0], v = _e[1];
                            this[k] = v;
                        }
                    }
                }
            };
            app.mixin(mixin);
        }
        // AppConfig
        if (global.config) {
            for (var _i = 0, _a = Object.entries(global.config); _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                app.config[k] = isObject(app.config[k])
                    ? Object.assign(app.config[k], v)
                    : v;
            }
        }
        // provide any values passed via provides mounting option
        if (global.provide) {
            for (var _c = 0, _d = Reflect.ownKeys(global.provide); _c < _d.length; _c++) {
                var key = _d[_c];
                // @ts-ignore: https://github.com/microsoft/TypeScript/issues/1863
                app.provide(key, global.provide[key]);
            }
        }
        // use and plugins from mounting options
        if (global.plugins) {
            for (var _e = 0, _f = global.plugins; _e < _f.length; _e++) {
                var plugin = _f[_e];
                if (Array.isArray(plugin)) {
                    app.use.apply(app, __spreadArray([plugin[0]], plugin.slice(1), false));
                    continue;
                }
                app.use(plugin);
            }
        }
        // use any mixins from mounting options
        if (global.mixins) {
            for (var _g = 0, _h = global.mixins; _g < _h.length; _g++) {
                var mixin = _h[_g];
                app.mixin(mixin);
            }
        }
        if (global.components) {
            for (var _j = 0, _k = Object.keys(global.components); _j < _k.length; _j++) {
                var key = _k[_j];
                // avoid registering components that are stubbed twice
                if (!(key in global.stubs)) {
                    app.component(key, global.components[key]);
                }
            }
        }
        if (global.directives) {
            for (var _l = 0, _m = Object.keys(global.directives); _l < _m.length; _l++) {
                var key = _m[_l];
                app.directive(key, global.directives[key]);
            }
        }
        // stubs
        // even if we are using `mount`, we will still
        // stub out Transition and Transition Group by default.
        Vue.transformVNodeArgs(createVNodeTransformer({
            rootComponents: rootComponents,
            transformers: [
                createStubComponentsTransformer({
                    rootComponents: rootComponents,
                    stubs: getComponentsFromStubs(global.stubs),
                    shallow: options === null || options === void 0 ? void 0 : options.shallow,
                    renderStubDefaultSlot: global.renderStubDefaultSlot
                }),
                createStubDirectivesTransformer({
                    directives: getDirectivesFromStubs(global.stubs)
                })
            ]
        }));
        // users expect stubs to work with globally registered
        // components so we register stubs as global components to avoid
        // warning about not being able to resolve component
        //
        // component implementation provided here will never be called
        // but we need name to make sure that stubComponents will
        // properly stub this later by matching stub name
        //
        // ref: https://github.com/vuejs/test-utils/issues/249
        // ref: https://github.com/vuejs/test-utils/issues/425
        if (global === null || global === void 0 ? void 0 : global.stubs) {
            for (var _o = 0, _p = Object.keys(getComponentsFromStubs(global.stubs)); _o < _p.length; _o++) {
                var name_1 = _p[_o];
                if (!app.component(name_1)) {
                    app.component(name_1, { name: name_1 });
                }
            }
        }
        return {
            app: app,
            props: props,
            componentRef: componentRef
        };
    }

    var isEnabled = false;
    var wrapperInstances = [];
    function disableAutoUnmount() {
        isEnabled = false;
        wrapperInstances.length = 0;
    }
    function enableAutoUnmount(hook) {
        if (isEnabled) {
            throw new Error('enableAutoUnmount cannot be called more than once');
        }
        isEnabled = true;
        hook(function () {
            wrapperInstances.forEach(function (wrapper) {
                wrapper.unmount();
            });
            wrapperInstances.length = 0;
        });
    }
    function trackInstance(wrapper) {
        if (!isEnabled)
            return;
        wrapperInstances.push(wrapper);
    }

    // implementation
    function mount(inputComponent, options) {
        var _a = createInstance(inputComponent, options), app = _a.app, props = _a.props, componentRef = _a.componentRef;
        var setProps = function (newProps) {
            for (var _i = 0, _a = Object.entries(newProps); _i < _a.length; _i++) {
                var _b = _a[_i], k = _b[0], v = _b[1];
                props[k] = v;
            }
            return vm.$nextTick();
        };
        // Workaround for https://github.com/vuejs/core/issues/7020
        var originalErrorHandler = app.config.errorHandler;
        var errorsOnMount = [];
        app.config.errorHandler = function (err, instance, info) {
            errorsOnMount.push(err);
            return originalErrorHandler === null || originalErrorHandler === void 0 ? void 0 : originalErrorHandler(err, instance, info);
        };
        // mount the app!
        var el = document.createElement('div');
        if (options === null || options === void 0 ? void 0 : options.attachTo) {
            var to = void 0;
            if (typeof options.attachTo === 'string') {
                to = document.querySelector(options.attachTo);
                if (!to) {
                    throw new Error("Unable to find the element matching the selector ".concat(options.attachTo, " given as the `attachTo` option"));
                }
            }
            else {
                to = options.attachTo;
            }
            to.appendChild(el);
        }
        var vm = app.mount(el);
        if (errorsOnMount.length) {
            // If several errors are thrown during mount, then throw the first one
            throw errorsOnMount[0];
        }
        app.config.errorHandler = originalErrorHandler;
        var appRef = componentRef.value;
        // we add `hasOwnProperty` so Jest can spy on the proxied vm without throwing
        // note that this is not necessary with Jest v27+ or Vitest, but is kept for compatibility with older Jest versions
        if (!app.hasOwnProperty) {
            appRef.hasOwnProperty = function (property) {
                return Reflect.has(appRef, property);
            };
        }
        var wrapper = createVueWrapper(app, appRef, setProps);
        trackInstance(wrapper);
        return wrapper;
    }
    var shallowMount = function (component, options) {
        return mount(component, __assign(__assign({}, options), { shallow: true }));
    };

    function renderToString(component, options) {
        if (options === null || options === void 0 ? void 0 : options.attachTo) {
            console.warn('attachTo option is not available for renderToString');
        }
        var app = createInstance(component, options).app;
        return serverRenderer.renderToString(app);
    }

    // match return type of router.resolve: RouteLocation & { href: string }
    var defaultRoute = {
        path: '/',
        name: undefined,
        redirectedFrom: undefined,
        params: {},
        query: {},
        hash: '',
        fullPath: '/',
        matched: [],
        meta: {},
        href: '/'
    };
    // TODO: Borrow typings from vue-router-next
    var RouterLinkStub = Vue.defineComponent({
        name: 'RouterLinkStub',
        compatConfig: { MODE: 3 },
        props: {
            to: {
                type: [String, Object],
                required: true
            },
            custom: {
                type: Boolean,
                default: false
            }
        },
        render: function () {
            var _this = this;
            var _a, _b;
            var route = Vue.computed(function () { return defaultRoute; });
            // mock reasonable return values to mimic vue-router's useLink
            var children = (_b = (_a = this.$slots) === null || _a === void 0 ? void 0 : _a.default) === null || _b === void 0 ? void 0 : _b.call(_a, {
                route: route,
                href: Vue.computed(function () { return route.value.href; }),
                isActive: Vue.computed(function () { return false; }),
                isExactActive: Vue.computed(function () { return false; }),
                navigate: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/];
                }); }); }
            });
            return this.custom ? children : Vue.h('a', undefined, children);
        }
    });

    var scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout;
    // Credit to: https://github.com/kentor/flush-promises
    function flushPromises() {
        return new Promise(function (resolve) {
            scheduler(resolve, 0);
        });
    }

    exports.BaseWrapper = BaseWrapper;
    exports.DOMWrapper = DOMWrapper;
    exports.RouterLinkStub = RouterLinkStub;
    exports.VueWrapper = VueWrapper;
    exports.config = config;
    exports.createWrapperError = createWrapperError;
    exports.disableAutoUnmount = disableAutoUnmount;
    exports.enableAutoUnmount = enableAutoUnmount;
    exports.flushPromises = flushPromises;
    exports.mount = mount;
    exports.renderToString = renderToString;
    exports.shallowMount = shallowMount;

    return exports;

})({}, Vue, VueCompilerDOM, VueServerRenderer);
