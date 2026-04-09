(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('react')) :
    typeof define === 'function' && define.amd ? define(['react'], factory) :
    (global = global || self, global.styled = factory(global.React));
})(this, (function (React) { 'use strict';

    var SC_ATTR = (typeof process !== 'undefined' &&
        typeof process.env !== 'undefined' &&
        (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
        'data-styled';
    var SC_ATTR_ACTIVE = 'active';
    var SC_ATTR_VERSION = 'data-styled-version';
    var SC_VERSION = "6.3.9";
    var SPLITTER = '/*!sc*/\n';
    var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
    /**
     * Detect if we're running in a React Server Component environment.
     * RSC environments lack createContext, making this a reliable indicator.
     */
    var IS_RSC = typeof React.createContext === 'undefined';
    var DISABLE_SPEEDY = Boolean(typeof SC_DISABLE_SPEEDY === 'boolean'
        ? SC_DISABLE_SPEEDY
        : typeof process !== 'undefined' &&
            typeof process.env !== 'undefined' &&
            typeof process.env.REACT_APP_SC_DISABLE_SPEEDY !== 'undefined' &&
            process.env.REACT_APP_SC_DISABLE_SPEEDY !== ''
            ? process.env.REACT_APP_SC_DISABLE_SPEEDY === 'false'
                ? false
                : process.env.REACT_APP_SC_DISABLE_SPEEDY
            : typeof process !== 'undefined' &&
                typeof process.env !== 'undefined' &&
                typeof process.env.SC_DISABLE_SPEEDY !== 'undefined' &&
                process.env.SC_DISABLE_SPEEDY !== ''
                ? process.env.SC_DISABLE_SPEEDY === 'false'
                    ? false
                    : process.env.SC_DISABLE_SPEEDY
                : "development" !== 'production');
    // Shared empty execution context when generating static styles
    var STATIC_EXECUTION_CONTEXT = {};

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
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


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

    var EMPTY_ARRAY = Object.freeze([]);
    var EMPTY_OBJECT = Object.freeze({});

    /**
     * If the Object prototype is frozen, the "toString" property is non-writable. This means that any objects which inherit this property
     * cannot have the property changed using a "=" assignment operator. If using strict mode, attempting that will cause an error. If not using
     * strict mode, attempting that will be silently ignored.
     *
     * If the Object prototype is frozen, inherited non-writable properties can still be shadowed using one of two mechanisms:
     *
     *  1. ES6 class methods: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#methods
     *  2. Using the `Object.defineProperty()` static method:
     *     https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
     *
     * However, this project uses Babel to transpile ES6 classes, and transforms ES6 class methods to use the assignment operator instead:
     * https://babeljs.io/docs/babel-plugin-transform-class-properties#options
     *
     * Therefore, the most compatible way to shadow the prototype's "toString" property is to define a new "toString" property on this object.
     */
    function setToString(object, toStringFn) {
        Object.defineProperty(object, 'toString', { value: toStringFn });
    }

    var errorMap = {
        '1': 'Cannot create styled-component for component: %s.\n\n',
        '2': "Can't collect styles once you've consumed a `ServerStyleSheet`'s styles! `ServerStyleSheet` is a one off instance for each server-side render cycle.\n\n- Are you trying to reuse it across renders?\n- Are you accidentally calling collectStyles twice?\n\n",
        '3': 'Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.\n\n',
        '4': 'The `StyleSheetManager` expects a valid target or sheet prop!\n\n- Does this error occur on the client and is your target falsy?\n- Does this error occur on the server and is the sheet falsy?\n\n',
        '5': 'The clone method cannot be used on the client!\n\n- Are you running in a client-like environment on the server?\n- Are you trying to run SSR on the client?\n\n',
        '6': "Trying to insert a new style tag, but the given Node is unmounted!\n\n- Are you using a custom target that isn't mounted?\n- Does your document not have a valid head element?\n- Have you accidentally removed a style tag manually?\n\n",
        '7': 'ThemeProvider: Please return an object from your "theme" prop function, e.g.\n\n```js\ntheme={() => ({})}\n```\n\n',
        '8': 'ThemeProvider: Please make your "theme" prop an object.\n\n',
        '9': 'Missing document `<head>`\n\n',
        '10': 'Cannot find a StyleSheet instance. Usually this happens if there are multiple copies of styled-components loaded at once. Check out this issue for how to troubleshoot and fix the common cases where this situation can happen: https://github.com/styled-components/styled-components/issues/1941#issuecomment-417862021\n\n',
        '11': '_This error was replaced with a dev-time warning, it will be deleted for v4 final._ [createGlobalStyle] received children which will not be rendered. Please use the component without passing children elements.\n\n',
        '12': 'It seems you are interpolating a keyframe declaration (%s) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\\`\\` helper which ensures the styles are injected correctly. See https://www.styled-components.com/docs/api#css\n\n',
        '13': '%s is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.\n\n',
        '14': 'ThemeProvider: "theme" prop is required.\n\n',
        '15': "A stylis plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different stylis configurations within the same app. Before you pass your plugin to `<StyleSheetManager stylisPlugins={[]}>`, please make sure each plugin is uniquely-named, e.g.\n\n```js\nObject.defineProperty(importedPlugin, 'name', { value: 'some-unique-name' });\n```\n\n",
        '16': "Reached the limit of how many styled components may be created at group %s.\nYou may only create up to 1,073,741,824 components. If you're creating components dynamically,\nas for instance in your render method then you may be running into this limitation.\n\n",
        '17': "CSSStyleSheet could not be found on HTMLStyleElement.\nHas styled-components' style tag been unmounted or altered by another script?\n",
        '18': 'ThemeProvider: Please make sure your useTheme hook is within a `<ThemeProvider>`',
    };

    var ERRORS = errorMap ;
    /**
     * super basic version of sprintf
     */
    function format() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var a = args[0];
        var b = [];
        for (var c = 1, len = args.length; c < len; c += 1) {
            b.push(args[c]);
        }
        b.forEach(function (d) {
            a = a.replace(/%[a-z]/, d);
        });
        return a;
    }
    /**
     * Create an error file out of errors.md for development and a simple web link to the full errors
     * in production mode.
     */
    function throwStyledComponentsError(code) {
        var interpolations = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            interpolations[_i - 1] = arguments[_i];
        }
        {
            return new Error(format.apply(void 0, __spreadArray([ERRORS[code]], interpolations, false)).trim());
        }
    }

    /** Create a GroupedTag with an underlying Tag implementation */
    var makeGroupedTag = function (tag) {
        return new DefaultGroupedTag(tag);
    };
    var BASE_SIZE = 1 << 9;
    var DefaultGroupedTag = /** @class */ (function () {
        function DefaultGroupedTag(tag) {
            this.groupSizes = new Uint32Array(BASE_SIZE);
            this.length = BASE_SIZE;
            this.tag = tag;
            this._cGroup = 0;
            this._cIndex = 0;
        }
        DefaultGroupedTag.prototype.indexOfGroup = function (group) {
            if (group === this._cGroup)
                return this._cIndex;
            var index = this._cIndex;
            if (group > this._cGroup) {
                for (var i = this._cGroup; i < group; i++) {
                    index += this.groupSizes[i];
                }
            }
            else {
                for (var i = this._cGroup - 1; i >= group; i--) {
                    index -= this.groupSizes[i];
                }
            }
            this._cGroup = group;
            this._cIndex = index;
            return index;
        };
        DefaultGroupedTag.prototype.insertRules = function (group, rules) {
            if (group >= this.groupSizes.length) {
                var oldBuffer = this.groupSizes;
                var oldSize = oldBuffer.length;
                var newSize = oldSize;
                while (group >= newSize) {
                    newSize <<= 1;
                    if (newSize < 0) {
                        throw throwStyledComponentsError(16, "".concat(group));
                    }
                }
                this.groupSizes = new Uint32Array(newSize);
                this.groupSizes.set(oldBuffer);
                this.length = newSize;
                for (var i = oldSize; i < newSize; i++) {
                    this.groupSizes[i] = 0;
                }
            }
            var ruleIndex = this.indexOfGroup(group + 1);
            var insertedCount = 0;
            for (var i = 0, l = rules.length; i < l; i++) {
                if (this.tag.insertRule(ruleIndex, rules[i])) {
                    this.groupSizes[group]++;
                    ruleIndex++;
                    insertedCount++;
                }
            }
            // Keep cache consistent: groups after the insertion point shift forward
            if (insertedCount > 0 && this._cGroup > group) {
                this._cIndex += insertedCount;
            }
        };
        DefaultGroupedTag.prototype.clearGroup = function (group) {
            if (group < this.length) {
                var length_1 = this.groupSizes[group];
                var startIndex = this.indexOfGroup(group);
                var endIndex = startIndex + length_1;
                this.groupSizes[group] = 0;
                for (var i = startIndex; i < endIndex; i++) {
                    this.tag.deleteRule(startIndex);
                }
                // Keep cache consistent: groups after the cleared group shift backward
                if (length_1 > 0 && this._cGroup > group) {
                    this._cIndex -= length_1;
                }
            }
        };
        DefaultGroupedTag.prototype.getGroup = function (group) {
            var css = '';
            if (group >= this.length || this.groupSizes[group] === 0) {
                return css;
            }
            var length = this.groupSizes[group];
            var startIndex = this.indexOfGroup(group);
            var endIndex = startIndex + length;
            for (var i = startIndex; i < endIndex; i++) {
                css += this.tag.getRule(i) + SPLITTER;
            }
            return css;
        };
        return DefaultGroupedTag;
    }());

    var MAX_SMI = 1 << (31 - 1);
    var groupIDRegister = new Map();
    var reverseRegister = new Map();
    var nextFreeGroup = 1;
    var getGroupForId = function (id) {
        if (groupIDRegister.has(id)) {
            return groupIDRegister.get(id);
        }
        while (reverseRegister.has(nextFreeGroup)) {
            nextFreeGroup++;
        }
        var group = nextFreeGroup++;
        if (((group | 0) < 0 || group > MAX_SMI)) {
            throw throwStyledComponentsError(16, "".concat(group));
        }
        groupIDRegister.set(id, group);
        reverseRegister.set(group, id);
        return group;
    };
    var getIdForGroup = function (group) {
        return reverseRegister.get(group);
    };
    var setGroupForId = function (id, group) {
        // move pointer
        nextFreeGroup = group + 1;
        groupIDRegister.set(id, group);
        reverseRegister.set(group, id);
    };

    var SELECTOR = "style[".concat(SC_ATTR, "][").concat(SC_ATTR_VERSION, "=\"").concat(SC_VERSION, "\"]");
    var MARKER_RE = new RegExp("^".concat(SC_ATTR, "\\.g(\\d+)\\[id=\"([\\w\\d-]+)\"\\].*?\"([^\"]*)"));
    /**
     * Type guard to check if a node is a ShadowRoot.
     * Uses instanceof when available, with duck-typing fallback for cross-realm scenarios.
     */
    var isShadowRoot = function (node) {
        return ((typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot) ||
            ('host' in node &&
                // https://dom.spec.whatwg.org/#dom-node-document_fragment_node
                node.nodeType === 11));
    };
    /**
     * Extract the container (Document or ShadowRoot) from an InsertionTarget.
     * If the target is a ShadowRoot, return it directly.
     * If the target is an HTMLElement, return its root node if it's a ShadowRoot, otherwise return document.
     */
    var getRehydrationContainer = function (target) {
        if (!target) {
            return document;
        }
        // Check if target is a ShadowRoot
        if (isShadowRoot(target)) {
            return target;
        }
        // Check if target is an HTMLElement inside a ShadowRoot
        if ('getRootNode' in target) {
            var root = target.getRootNode();
            if (isShadowRoot(root)) {
                return root;
            }
        }
        return document;
    };
    var outputSheet = function (sheet) {
        var tag = sheet.getTag();
        var length = tag.length;
        var css = '';
        var _loop_1 = function (group) {
            var id = getIdForGroup(group);
            if (id === undefined)
                return "continue";
            var names = sheet.names.get(id);
            if (names === undefined || !names.size)
                return "continue";
            var rules = tag.getGroup(group);
            if (rules.length === 0)
                return "continue";
            var selector = SC_ATTR + '.g' + group + '[id="' + id + '"]';
            var content = '';
            names.forEach(function (name) {
                if (name.length > 0) {
                    content += name + ',';
                }
            });
            // NOTE: It's easier to collect rules and have the marker
            // after the actual rules to simplify the rehydration
            css += rules + selector + '{content:"' + content + '"}' + SPLITTER;
        };
        for (var group = 0; group < length; group++) {
            _loop_1(group);
        }
        return css;
    };
    var rehydrateNamesFromContent = function (sheet, id, content) {
        var names = content.split(',');
        var name;
        for (var i = 0, l = names.length; i < l; i++) {
            if ((name = names[i])) {
                sheet.registerName(id, name);
            }
        }
    };
    var rehydrateSheetFromTag = function (sheet, style) {
        var _a;
        var parts = ((_a = style.textContent) !== null && _a !== void 0 ? _a : '').split(SPLITTER);
        var rules = [];
        for (var i = 0, l = parts.length; i < l; i++) {
            var part = parts[i].trim();
            if (!part)
                continue;
            var marker = part.match(MARKER_RE);
            if (marker) {
                var group = parseInt(marker[1], 10) | 0;
                var id = marker[2];
                if (group !== 0) {
                    // Rehydrate componentId to group index mapping
                    setGroupForId(id, group);
                    // Rehydrate names and rules
                    // looks like: data-styled.g11[id="idA"]{content:"nameA,"}
                    rehydrateNamesFromContent(sheet, id, marker[3]);
                    sheet.getTag().insertRules(group, rules);
                }
                rules.length = 0;
            }
            else {
                rules.push(part);
            }
        }
    };
    var rehydrateSheet = function (sheet) {
        var container = getRehydrationContainer(sheet.options.target);
        var nodes = container.querySelectorAll(SELECTOR);
        for (var i = 0, l = nodes.length; i < l; i++) {
            var node = nodes[i];
            if (node && node.getAttribute(SC_ATTR) !== SC_ATTR_ACTIVE) {
                rehydrateSheetFromTag(sheet, node);
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            }
        }
    };

    function getNonce() {
        return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
    }

    /** Find last style element if any inside target */
    var findLastStyleTag = function (target) {
        var arr = Array.from(target.querySelectorAll("style[".concat(SC_ATTR, "]")));
        return arr[arr.length - 1];
    };
    /** Create a style element inside `target` or <head> after the last */
    var makeStyleTag = function (target) {
        var head = document.head;
        var parent = target || head;
        var style = document.createElement('style');
        var prevStyle = findLastStyleTag(parent);
        var nextSibling = prevStyle !== undefined ? prevStyle.nextSibling : null;
        style.setAttribute(SC_ATTR, SC_ATTR_ACTIVE);
        style.setAttribute(SC_ATTR_VERSION, SC_VERSION);
        var nonce = getNonce();
        if (nonce)
            style.setAttribute('nonce', nonce);
        parent.insertBefore(style, nextSibling);
        return style;
    };
    /** Get the CSSStyleSheet instance for a given style element */
    var getSheet = function (tag) {
        var _a;
        if (tag.sheet) {
            return tag.sheet;
        }
        // Avoid Firefox quirk where the style element might not have a sheet property.
        // Use the tag's root node to find styleSheets — document.styleSheets doesn't
        // include sheets inside shadow roots.
        var root = tag.getRootNode();
        var styleSheets = (_a = root.styleSheets) !== null && _a !== void 0 ? _a : document.styleSheets;
        for (var i = 0, l = styleSheets.length; i < l; i++) {
            var sheet = styleSheets[i];
            if (sheet.ownerNode === tag) {
                return sheet;
            }
        }
        throw throwStyledComponentsError(17);
    };
    /** Remove a GlobalStyle's SSR-rendered inline style tag(s) from the DOM */
    var removeGlobalStyleTag = function (componentId, target) {
        if (typeof document === 'undefined')
            return;
        var container = target !== null && target !== void 0 ? target : document;
        var styleTags = container.querySelectorAll("style[data-styled-global=\"".concat(componentId, "\"]"));
        styleTags.forEach(function (tag) { return tag.remove(); });
    };

    /** Create a CSSStyleSheet-like tag depending on the environment */
    var makeTag = function (_a) {
        var isServer = _a.isServer, useCSSOMInjection = _a.useCSSOMInjection, target = _a.target;
        if (isServer) {
            return new VirtualTag(target);
        }
        else if (useCSSOMInjection) {
            return new CSSOMTag(target);
        }
        else {
            return new TextTag(target);
        }
    };
    var CSSOMTag = /** @class */ (function () {
        function CSSOMTag(target) {
            this.element = makeStyleTag(target);
            // Avoid Edge bug where empty style elements don't create sheets
            this.element.appendChild(document.createTextNode(''));
            this.sheet = getSheet(this.element);
            this.length = 0;
        }
        CSSOMTag.prototype.insertRule = function (index, rule) {
            try {
                this.sheet.insertRule(rule, index);
                this.length++;
                return true;
            }
            catch (_error) {
                return false;
            }
        };
        CSSOMTag.prototype.deleteRule = function (index) {
            this.sheet.deleteRule(index);
            this.length--;
        };
        CSSOMTag.prototype.getRule = function (index) {
            var rule = this.sheet.cssRules[index];
            // Avoid IE11 quirk where cssText is inaccessible on some invalid rules
            if (rule && rule.cssText) {
                return rule.cssText;
            }
            else {
                return '';
            }
        };
        return CSSOMTag;
    }());
    /** A Tag that emulates the CSSStyleSheet API but uses text nodes */
    var TextTag = /** @class */ (function () {
        function TextTag(target) {
            this.element = makeStyleTag(target);
            this.nodes = this.element.childNodes;
            this.length = 0;
        }
        TextTag.prototype.insertRule = function (index, rule) {
            if (index <= this.length && index >= 0) {
                var node = document.createTextNode(rule);
                var refNode = this.nodes[index];
                this.element.insertBefore(node, refNode || null);
                this.length++;
                return true;
            }
            else {
                return false;
            }
        };
        TextTag.prototype.deleteRule = function (index) {
            this.element.removeChild(this.nodes[index]);
            this.length--;
        };
        TextTag.prototype.getRule = function (index) {
            if (index < this.length) {
                return this.nodes[index].textContent;
            }
            else {
                return '';
            }
        };
        return TextTag;
    }());
    /** A completely virtual (server-side) Tag that doesn't manipulate the DOM */
    var VirtualTag = /** @class */ (function () {
        function VirtualTag(_target) {
            this.rules = [];
            this.length = 0;
        }
        VirtualTag.prototype.insertRule = function (index, rule) {
            if (index <= this.length) {
                if (index === this.length) {
                    this.rules.push(rule);
                }
                else {
                    this.rules.splice(index, 0, rule);
                }
                this.length++;
                return true;
            }
            else {
                return false;
            }
        };
        VirtualTag.prototype.deleteRule = function (index) {
            this.rules.splice(index, 1);
            this.length--;
        };
        VirtualTag.prototype.getRule = function (index) {
            if (index < this.length) {
                return this.rules[index];
            }
            else {
                return '';
            }
        };
        return VirtualTag;
    }());

    var SHOULD_REHYDRATE = IS_BROWSER;
    var defaultOptions = {
        isServer: !IS_BROWSER,
        useCSSOMInjection: !DISABLE_SPEEDY,
    };
    /** Contains the main stylesheet logic for stringification and caching */
    var StyleSheet = /** @class */ (function () {
        function StyleSheet(options, globalStyles, names) {
            if (options === void 0) { options = EMPTY_OBJECT; }
            if (globalStyles === void 0) { globalStyles = {}; }
            var _this = this;
            this.options = __assign(__assign({}, defaultOptions), options);
            this.gs = globalStyles;
            this.names = new Map(names);
            this.server = !!options.isServer;
            // We rehydrate only once and use the sheet that is created first
            if (!this.server && IS_BROWSER && SHOULD_REHYDRATE) {
                SHOULD_REHYDRATE = false;
                rehydrateSheet(this);
            }
            setToString(this, function () { return outputSheet(_this); });
        }
        /** Register a group ID to give it an index */
        StyleSheet.registerId = function (id) {
            return getGroupForId(id);
        };
        StyleSheet.prototype.rehydrate = function () {
            if (!this.server && IS_BROWSER) {
                rehydrateSheet(this);
            }
        };
        StyleSheet.prototype.reconstructWithOptions = function (options, withNames) {
            if (withNames === void 0) { withNames = true; }
            var newSheet = new StyleSheet(__assign(__assign({}, this.options), options), this.gs, (withNames && this.names) || undefined);
            // If we're reconstructing with a new target on the client, check if the container changed
            // This handles the case where StyleSheetManager's target prop changes (e.g., from undefined to shadowRoot)
            // We only rehydrate if the container (Document or ShadowRoot) actually changes
            if (!this.server && IS_BROWSER && options.target !== this.options.target) {
                var oldContainer = getRehydrationContainer(this.options.target);
                var newContainer = getRehydrationContainer(options.target);
                if (oldContainer !== newContainer) {
                    rehydrateSheet(newSheet);
                }
            }
            return newSheet;
        };
        StyleSheet.prototype.allocateGSInstance = function (id) {
            return (this.gs[id] = (this.gs[id] || 0) + 1);
        };
        /** Lazily initialises a GroupedTag for when it's actually needed */
        StyleSheet.prototype.getTag = function () {
            return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
        };
        /** Check whether a name is known for caching */
        StyleSheet.prototype.hasNameForId = function (id, name) {
            var _a, _b;
            return (_b = (_a = this.names.get(id)) === null || _a === void 0 ? void 0 : _a.has(name)) !== null && _b !== void 0 ? _b : false;
        };
        /** Mark a group's name as known for caching */
        StyleSheet.prototype.registerName = function (id, name) {
            getGroupForId(id);
            var existing = this.names.get(id);
            if (existing) {
                existing.add(name);
            }
            else {
                this.names.set(id, new Set([name]));
            }
        };
        /** Insert new rules which also marks the name as known */
        StyleSheet.prototype.insertRules = function (id, name, rules) {
            this.registerName(id, name);
            this.getTag().insertRules(getGroupForId(id), rules);
        };
        /** Clears all cached names for a given group ID */
        StyleSheet.prototype.clearNames = function (id) {
            if (this.names.has(id)) {
                this.names.get(id).clear();
            }
        };
        /** Clears all rules for a given group ID */
        StyleSheet.prototype.clearRules = function (id) {
            this.getTag().clearGroup(getGroupForId(id));
            this.clearNames(id);
        };
        /** Clears the entire tag which deletes all rules but not its names */
        StyleSheet.prototype.clearTag = function () {
            // NOTE: This does not clear the names, since it's only used during SSR
            // so that we can continuously output only new rules
            this.tag = undefined;
        };
        return StyleSheet;
    }());

    var e="-ms-";var r="-moz-";var a="-webkit-";var c="comm";var n="rule";var s="decl";var i="@import";var v="@namespace";var b="@keyframes";var g="@layer";var $=Math.abs;var m=String.fromCharCode;var x=Object.assign;function y(e,r){return A(e,0)^45?(((r<<2^A(e,0))<<2^A(e,1))<<2^A(e,2))<<2^A(e,3):0}function j(e){return e.trim()}function z(e,r){return (e=r.exec(e))?e[0]:e}function C(e,r,a){return e.replace(r,a)}function O(e,r,a){return e.indexOf(r,a)}function A(e,r){return e.charCodeAt(r)|0}function M(e,r,a){return e.slice(r,a)}function S(e){return e.length}function q(e){return e.length}function B(e,r){return r.push(e),e}function D(e,r){return e.map(r).join("")}function E(e,r){return e.filter((function(e){return !z(e,r)}))}var F=1;var G=1;var H=0;var I=0;var J=0;var K="";function L(e,r,a,c,n,s,t,u){return {value:e,root:r,parent:a,type:c,props:n,children:s,line:F,column:G,length:t,return:"",siblings:u}}function N(e,r){return x(L("",null,null,"",null,null,0,e.siblings),e,{length:-e.length},r)}function P(e){while(e.root)e=N(e.root,{children:[e]});B(e,e.siblings);}function Q(){return J}function R(){J=I>0?A(K,--I):0;if(G--,J===10)G=1,F--;return J}function T(){J=I<H?A(K,I++):0;if(G++,J===10)G=1,F++;return J}function U(){return A(K,I)}function V(){return I}function W(e,r){return M(K,e,r)}function X(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function Y(e){return F=G=1,H=S(K=e),I=0,[]}function Z(e){return K="",e}function _(e){return j(W(I-1,ne(e===91?e+2:e===40?e+1:e)))}function re(e){while(J=U())if(J<33)T();else break;return X(e)>2||X(J)>3?"":" "}function ce(e,r){while(--r&&T())if(J<48||J>102||J>57&&J<65||J>70&&J<97)break;return W(e,V()+(r<6&&U()==32&&T()==32))}function ne(e){while(T())switch(J){case e:return I;case 34:case 39:if(e!==34&&e!==39)ne(J);break;case 40:if(e===41)ne(e);break;case 92:T();break}return I}function se(e,r){while(T())if(e+J===47+10)break;else if(e+J===42+42&&U()===47)break;return "/*"+W(r,I-1)+"*"+m(e===47?e:T())}function te(e){while(!X(U()))T();return W(e,I)}function ue(e){return Z(ie("",null,null,null,[""],e=Y(e),0,[0],e))}function ie(e,r,a,c,n,s,t,u,i){var f=0;var o=0;var l=t;var p=0;var v=0;var b=0;var h=1;var w=1;var d=1;var g=0;var k="";var x=n;var y=s;var j=c;var z=k;while(w)switch(b=g,g=T()){case 40:if(b!=108&&A(z,l-1)==58){if(O(z+=C(_(g),"&","&\f"),"&\f",$(f?u[f-1]:0))!=-1)d=-1;break}case 34:case 39:case 91:z+=_(g);break;case 9:case 10:case 13:case 32:z+=re(b);break;case 92:z+=ce(V()-1,7);continue;case 47:switch(U()){case 42:case 47:B(oe(se(T(),V()),r,a,i),i);if((X(b||1)==5||X(U()||1)==5)&&S(z)&&M(z,-1,void 0)!==" ")z+=" ";break;default:z+="/";}break;case 123*h:u[f++]=S(z)*d;case 125*h:case 59:case 0:switch(g){case 0:case 125:w=0;case 59+o:if(d==-1)z=C(z,/\f/g,"");if(v>0&&(S(z)-l||h===0&&b===47))B(v>32?le(z+";",c,a,l-1,i):le(C(z," ","")+";",c,a,l-2,i),i);break;case 59:z+=";";default:B(j=fe(z,r,a,f,o,n,u,k,x=[],y=[],l,s),s);if(g===123)if(o===0)ie(z,r,j,j,x,s,l,u,y);else {switch(p){case 99:if(A(z,3)===110)break;case 108:if(A(z,2)===97)break;default:o=0;case 100:case 109:case 115:}if(o)ie(e,j,j,c&&B(fe(e,j,j,0,0,n,u,k,n,x=[],l,y),y),n,y,l,u,c?x:y);else ie(z,j,j,j,[""],y,0,u,y);}}f=o=v=0,h=d=1,k=z="",l=t;break;case 58:l=1+S(z),v=b;default:if(h<1)if(g==123)--h;else if(g==125&&h++==0&&R()==125)continue;switch(z+=m(g),g*h){case 38:d=o>0?1:(z+="\f",-1);break;case 44:u[f++]=(S(z)-1)*d,d=1;break;case 64:if(U()===45)z+=_(T());p=U(),o=l=S(k=z+=te(V())),g++;break;case 45:if(b===45&&S(z)==2)h=0;}}return s}function fe(e,r,a,c,s,t,u,i,f,o,l,p){var v=s-1;var b=s===0?t:[""];var h=q(b);for(var w=0,d=0,g=0;w<c;++w)for(var k=0,m=M(e,v+1,v=$(d=u[w])),x=e;k<h;++k)if(x=j(d>0?b[k]+" "+m:C(m,/&\f/g,b[k])))f[g++]=x;return L(e,r,a,s===0?n:i,f,o,l,p)}function oe(e,r,a,n){return L(e,r,a,c,m(Q()),M(e,2,-2),0,n)}function le(e,r,a,c,n){return L(e,r,a,s,M(e,0,c),M(e,c+1,-1),c,n)}function pe(c,n,s){switch(y(c,n)){case 5103:return a+"print-"+c+c;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:case 6391:case 5879:case 5623:case 6135:case 4599:return a+c+c;case 4855:return a+c.replace("add","source-over").replace("substract","source-out").replace("intersect","source-in").replace("exclude","xor")+c;case 4789:return r+c+c;case 5349:case 4246:case 4810:case 6968:case 2756:return a+c+r+c+e+c+c;case 5936:switch(A(c,n+11)){case 114:return a+c+e+C(c,/[svh]\w+-[tblr]{2}/,"tb")+c;case 108:return a+c+e+C(c,/[svh]\w+-[tblr]{2}/,"tb-rl")+c;case 45:return a+c+e+C(c,/[svh]\w+-[tblr]{2}/,"lr")+c}case 6828:case 4268:case 2903:return a+c+e+c+c;case 6165:return a+c+e+"flex-"+c+c;case 5187:return a+c+C(c,/(\w+).+(:[^]+)/,a+"box-$1$2"+e+"flex-$1$2")+c;case 5443:return a+c+e+"flex-item-"+C(c,/flex-|-self/g,"")+(!z(c,/flex-|baseline/)?e+"grid-row-"+C(c,/flex-|-self/g,""):"")+c;case 4675:return a+c+e+"flex-line-pack"+C(c,/align-content|flex-|-self/g,"")+c;case 5548:return a+c+e+C(c,"shrink","negative")+c;case 5292:return a+c+e+C(c,"basis","preferred-size")+c;case 6060:return a+"box-"+C(c,"-grow","")+a+c+e+C(c,"grow","positive")+c;case 4554:return a+C(c,/([^-])(transform)/g,"$1"+a+"$2")+c;case 6187:return C(C(C(c,/(zoom-|grab)/,a+"$1"),/(image-set)/,a+"$1"),c,"")+c;case 5495:case 3959:return C(c,/(image-set\([^]*)/,a+"$1"+"$`$1");case 4968:return C(C(c,/(.+:)(flex-)?(.*)/,a+"box-pack:$3"+e+"flex-pack:$3"),/space-between/,"justify")+a+c+c;case 4200:if(!z(c,/flex-|baseline/))return e+"grid-column-align"+M(c,n)+c;break;case 2592:case 3360:return e+C(c,"template-","")+c;case 4384:case 3616:if(s&&s.some((function(e,r){return n=r,z(e.props,/grid-\w+-end/)}))){return ~O(c+(s=s[n].value),"span",0)?c:e+C(c,"-start","")+c+e+"grid-row-span:"+(~O(s,"span",0)?z(s,/\d+/):+z(s,/\d+/)-+z(c,/\d+/))+";"}return e+C(c,"-start","")+c;case 4896:case 4128:return s&&s.some((function(e){return z(e.props,/grid-\w+-start/)}))?c:e+C(C(c,"-end","-span"),"span ","")+c;case 4095:case 3583:case 4068:case 2532:return C(c,/(.+)-inline(.+)/,a+"$1$2")+c;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(S(c)-1-n>6)switch(A(c,n+1)){case 109:if(A(c,n+4)!==45)break;case 102:return C(c,/(.+:)(.+)-([^]+)/,"$1"+a+"$2-$3"+"$1"+r+(A(c,n+3)==108?"$3":"$2-$3"))+c;case 115:return ~O(c,"stretch",0)?pe(C(c,"stretch","fill-available"),n,s)+c:c}break;case 5152:case 5920:return C(c,/(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/,(function(r,a,n,s,t,u,i){return e+a+":"+n+i+(s?e+a+"-span:"+(t?u:+u-+n)+i:"")+c}));case 4949:if(A(c,n+6)===121)return C(c,":",":"+a)+c;break;case 6444:switch(A(c,A(c,14)===45?18:11)){case 120:return C(c,/(.+:)([^;\s!]+)(;|(\s+)?!.+)?/,"$1"+a+(A(c,14)===45?"inline-":"")+"box$3"+"$1"+a+"$2$3"+"$1"+e+"$2box$3")+c;case 100:return C(c,":",":"+e)+c}break;case 5719:case 2647:case 2135:case 3927:case 2391:return C(c,"scroll-","scroll-snap-")+c}return c}function ve(e,r){var a="";for(var c=0;c<e.length;c++)a+=r(e[c],c,e,r)||"";return a}function be(e,r,a,t){switch(e.type){case g:if(e.children.length)break;case i:case v:case s:return e.return=e.return||e.value;case c:return "";case b:return e.return=e.value+"{"+ve(e.children,t)+"}";case n:if(!S(e.value=e.props.join(",")))return ""}return S(a=ve(e.children,t))?e.return=e.value+"{"+a+"}":""}function he(e){var r=q(e);return function(a,c,n,s){var t="";for(var u=0;u<r;u++)t+=e[u](a,c,n,s)||"";return t}}function we(e){return function(r){if(!r.root)if(r=r.return)e(r);}}function de(c,t,u,i){if(c.length>-1)if(!c.return)switch(c.type){case s:c.return=pe(c.value,c.length,u);return;case b:return ve([N(c,{value:C(c.value,"@","@"+a)})],i);case n:if(c.length)return D(u=c.props,(function(n){switch(z(n,i=/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":P(N(c,{props:[C(n,/:(read-\w+)/,":"+r+"$1")]}));P(N(c,{props:[n]}));x(c,{props:E(u,i)});break;case"::placeholder":P(N(c,{props:[C(n,/:(plac\w+)/,":"+a+"input-$1")]}));P(N(c,{props:[C(n,/:(plac\w+)/,":"+r+"$1")]}));P(N(c,{props:[C(n,/:(plac\w+)/,e+"input-$1")]}));P(N(c,{props:[n]}));x(c,{props:E(u,i)});break}return ""}))}}

    var SEED$1 = 5381;
    // When we have separate strings it's useful to run a progressive
    // version of djb2 where we pretend that we're still looping over
    // the same string
    var phash = function (h, x) {
        var i = x.length;
        while (i) {
            h = (h * 33) ^ x.charCodeAt(--i);
        }
        return h;
    };
    // This is a djb2 hashing function
    var hash = function (x) {
        return phash(SEED$1, x);
    };

    var AMP_REGEX = /&/g;
    // Character codes for fast comparison
    var DOUBLE_QUOTE = 34; // "
    var SINGLE_QUOTE = 39; // '
    var SLASH = 47; // /
    var ASTERISK = 42; // *
    var BACKSLASH = 92; // \
    var OPEN_BRACE = 123; // {
    var CLOSE_BRACE = 125; // }
    var SEMICOLON = 59; // ;
    var NEWLINE = 10; // \n
    var OPEN_PAREN = 40; // (
    var CLOSE_PAREN = 41; // )
    /**
     * Strips JS-style line comments (//) from CSS, handling comments anywhere
     * in the line while preserving strings, url() contents, and valid CSS.
     * Optimized with early bail and charCodeAt for performance.
     */
    function stripLineComments(css) {
        // Fast path: no // means no line comments
        if (css.indexOf('//') === -1)
            return css;
        var len = css.length;
        var parts = [];
        var start = 0;
        var i = 0;
        var inString = 0; // 0 = none, DOUBLE_QUOTE or SINGLE_QUOTE when in string
        var urlDepth = 0; // Track nesting depth inside url()
        while (i < len) {
            var code = css.charCodeAt(i);
            // Track string state
            if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
                (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)) {
                if (inString === 0) {
                    inString = code;
                }
                else if (inString === code) {
                    inString = 0;
                }
                i++;
                continue;
            }
            // Skip string content
            if (inString !== 0) {
                i++;
                continue;
            }
            // Handle CSS block comments: skip /* ... */ entirely
            if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === ASTERISK) {
                i += 2;
                while (i + 1 < len && !(css.charCodeAt(i) === ASTERISK && css.charCodeAt(i + 1) === SLASH)) {
                    i++;
                }
                i += 2; // skip past */
                continue;
            }
            // Track url() context - check for 'url(' (case insensitive via | 32)
            if (code === OPEN_PAREN &&
                i >= 3 &&
                (css.charCodeAt(i - 1) | 32) === 108 && // l
                (css.charCodeAt(i - 2) | 32) === 114 && // r
                (css.charCodeAt(i - 3) | 32) === 117 // u
            ) {
                urlDepth = 1;
                i++;
                continue;
            }
            // Track nested parentheses inside url()
            if (urlDepth > 0) {
                if (code === CLOSE_PAREN)
                    urlDepth--;
                else if (code === OPEN_PAREN)
                    urlDepth++;
                i++;
                continue;
            }
            // Strip orphaned */ (no matching /*) — invalid CSS that breaks parsing
            if (code === ASTERISK && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
                if (i > start)
                    parts.push(css.substring(start, i));
                i += 2;
                start = i;
                continue;
            }
            // Check for line comment (only when not in url())
            if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
                if (i > start)
                    parts.push(css.substring(start, i));
                // Skip to end of line
                while (i < len && css.charCodeAt(i) !== NEWLINE) {
                    i++;
                }
                start = i;
                continue;
            }
            i++;
        }
        // No comments found after indexOf check means // was in a string or url()
        if (start === 0)
            return css;
        if (start < len)
            parts.push(css.substring(start));
        return parts.join('');
    }
    /**
     * Checks if CSS has unbalanced closing braces that would cause stylis
     * to prematurely close rule blocks.
     * Optimized with early bail and charCodeAt for performance.
     */
    function hasUnbalancedBraces(css) {
        // Fast path: no closing brace means can't have unbalanced braces
        if (css.indexOf('}') === -1)
            return false;
        var len = css.length;
        var depth = 0;
        var inString = 0; // 0 = none, char code when in string
        var inComment = false;
        for (var i = 0; i < len; i++) {
            var code = css.charCodeAt(i);
            // Handle CSS comments
            if (inString === 0 && !inComment && code === SLASH && css.charCodeAt(i + 1) === ASTERISK) {
                inComment = true;
                i++;
                continue;
            }
            if (inComment) {
                if (code === ASTERISK && css.charCodeAt(i + 1) === SLASH) {
                    inComment = false;
                    i++;
                }
                continue;
            }
            // Track string state
            if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
                (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)) {
                if (inString === 0) {
                    inString = code;
                }
                else if (inString === code) {
                    inString = 0;
                }
                continue;
            }
            if (inString !== 0)
                continue;
            // Track brace depth
            if (code === OPEN_BRACE) {
                depth++;
            }
            else if (code === CLOSE_BRACE) {
                depth--;
                if (depth < 0)
                    return true;
            }
        }
        return depth !== 0 || inString !== 0;
    }
    /**
     * Sanitizes CSS by removing declarations with unbalanced braces.
     * This contains invalid syntax to just the affected declaration.
     * Optimized with charCodeAt for performance.
     */
    function sanitizeCSS(css) {
        // Fast path: valid CSS passes through unchanged
        if (!hasUnbalancedBraces(css)) {
            return css;
        }
        var len = css.length;
        var result = '';
        var declStart = 0;
        var braceDepth = 0;
        var inString = 0;
        var inComment = false;
        for (var i = 0; i < len; i++) {
            var code = css.charCodeAt(i);
            // Handle CSS comments
            if (inString === 0 && !inComment && code === SLASH && css.charCodeAt(i + 1) === ASTERISK) {
                inComment = true;
                i++;
                continue;
            }
            if (inComment) {
                if (code === ASTERISK && css.charCodeAt(i + 1) === SLASH) {
                    inComment = false;
                    i++;
                }
                continue;
            }
            // Track string state
            if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
                (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)) {
                if (inString === 0) {
                    inString = code;
                }
                else if (inString === code) {
                    inString = 0;
                }
                continue;
            }
            if (inString !== 0)
                continue;
            if (code === OPEN_BRACE) {
                braceDepth++;
            }
            else if (code === CLOSE_BRACE) {
                braceDepth--;
                if (braceDepth < 0) {
                    // Extra closing brace - skip to next semicolon or newline
                    var skipEnd = i + 1;
                    while (skipEnd < len) {
                        var skipCode = css.charCodeAt(skipEnd);
                        if (skipCode === SEMICOLON || skipCode === NEWLINE)
                            break;
                        skipEnd++;
                    }
                    if (skipEnd < len && css.charCodeAt(skipEnd) === SEMICOLON)
                        skipEnd++;
                    braceDepth = 0;
                    i = skipEnd - 1;
                    declStart = skipEnd;
                    continue;
                }
                if (braceDepth === 0) {
                    result += css.substring(declStart, i + 1);
                    declStart = i + 1;
                }
            }
            else if (code === SEMICOLON && braceDepth === 0) {
                result += css.substring(declStart, i + 1);
                declStart = i + 1;
            }
        }
        // Add remaining valid content
        if (declStart < len) {
            var remaining = css.substring(declStart);
            if (!hasUnbalancedBraces(remaining)) {
                result += remaining;
            }
        }
        return result;
    }
    /**
     * Takes an element and recurses through it's rules added the namespace to the start of each selector.
     * Takes into account media queries by recursing through child rules if they are present.
     */
    function recursivelySetNamepace(compiled, namespace) {
        return compiled.map(function (rule) {
            if (rule.type === 'rule') {
                // add the namespace to the start
                rule.value = "".concat(namespace, " ").concat(rule.value);
                // add the namespace after each comma for subsequent selectors.
                rule.value = rule.value.replaceAll(',', ",".concat(namespace, " "));
                rule.props = rule.props.map(function (prop) {
                    return "".concat(namespace, " ").concat(prop);
                });
            }
            if (Array.isArray(rule.children) && rule.type !== '@keyframes') {
                rule.children = recursivelySetNamepace(rule.children, namespace);
            }
            return rule;
        });
    }
    function createStylisInstance(_a) {
        var _b = _a === void 0 ? EMPTY_OBJECT : _a, _c = _b.options, options = _c === void 0 ? EMPTY_OBJECT : _c, _d = _b.plugins, plugins = _d === void 0 ? EMPTY_ARRAY : _d;
        var _componentId;
        var _selector;
        var _selectorRegexp;
        var selfReferenceReplacer = function (match, offset, string) {
            if (
            /**
             * We only want to refer to the static class directly if the selector is part of a
             * self-reference selector `& + & { color: red; }`
             */
            string.startsWith(_selector) &&
                string.endsWith(_selector) &&
                string.replaceAll(_selector, '').length > 0) {
                return ".".concat(_componentId);
            }
            return match;
        };
        /**
         * When writing a style like
         *
         * & + & {
         *   color: red;
         * }
         *
         * The second ampersand should be a reference to the static component class. stylis
         * has no knowledge of static class so we have to intelligently replace the base selector.
         *
         * https://github.com/thysultan/stylis.js/tree/v4.0.2#abstract-syntax-structure
         */
        var selfReferenceReplacementPlugin = function (element) {
            if (element.type === n && element.value.includes('&')) {
                // Lazy RegExp creation: only allocate when self-reference pattern is actually used
                if (!_selectorRegexp) {
                    _selectorRegexp = new RegExp("\\".concat(_selector, "\\b"), 'g');
                }
                element.props[0] = element.props[0]
                    // catch any hanging references that stylis missed
                    .replace(AMP_REGEX, _selector)
                    .replace(_selectorRegexp, selfReferenceReplacer);
            }
        };
        var middlewares = plugins.slice();
        middlewares.push(selfReferenceReplacementPlugin);
        /**
         * Enables automatic vendor-prefixing for styles.
         */
        if (options.prefix) {
            middlewares.push(de);
        }
        middlewares.push(be);
        // Pre-build the middleware chain once to avoid allocating closures,
        // arrays, and middleware wrappers on every stringifyRules call.
        // Safe because JS is single-threaded and _stack is consumed before next call.
        var _stack = [];
        var _middleware = he(middlewares.concat(we(function (value) { return _stack.push(value); })));
        var stringifyRules = function (css, selector, 
        /**
         * This "prefix" referes to a _selector_ prefix.
         */
        prefix, componentId) {
            if (selector === void 0) { selector = ''; }
            if (prefix === void 0) { prefix = ''; }
            if (componentId === void 0) { componentId = '&'; }
            // stylis has no concept of state to be passed to plugins
            // but since JS is single-threaded, we can rely on that to ensure
            // these properties stay in sync with the current stylis run
            _componentId = componentId;
            _selector = selector;
            _selectorRegexp = undefined; // Reset for lazy creation per call
            var flatCSS = sanitizeCSS(stripLineComments(css));
            var compiled = ue(prefix || selector ? "".concat(prefix, " ").concat(selector, " { ").concat(flatCSS, " }") : flatCSS);
            if (options.namespace) {
                compiled = recursivelySetNamepace(compiled, options.namespace);
            }
            _stack = [];
            ve(compiled, _middleware);
            return _stack;
        };
        stringifyRules.hash = plugins.length
            ? plugins
                .reduce(function (acc, plugin) {
                if (!plugin.name) {
                    throwStyledComponentsError(15);
                }
                return phash(acc, plugin.name);
            }, SEED$1)
                .toString()
            : '';
        return stringifyRules;
    }

    var mainSheet = new StyleSheet();
    var mainStylis = createStylisInstance();
    var defaultContextValue = {
        shouldForwardProp: undefined,
        styleSheet: mainSheet,
        stylis: mainStylis,
    };
    // Create context only if createContext is available, otherwise create a fallback
    var StyleSheetContext = !IS_RSC
        ? React.createContext(defaultContextValue)
        : {
            Provider: function (_a) {
                var children = _a.children;
                return children;
            },
            Consumer: function (_a) {
                var children = _a.children;
                return children(defaultContextValue);
            },
        };
    var StyleSheetConsumer = StyleSheetContext.Consumer;
    var StylisContext = !IS_RSC
        ? React.createContext(undefined)
        : {
            Provider: function (_a) {
                var children = _a.children;
                return children;
            },
            Consumer: function (_a) {
                var children = _a.children;
                return children(undefined);
            },
        };
    function useStyleSheetContext() {
        // Skip useContext if we're in an RSC environment without context support
        return !IS_RSC ? React.useContext(StyleSheetContext) : defaultContextValue;
    }
    function StyleSheetManager(props) {
        // In RSC environments without context support, StyleSheetManager becomes a no-op
        if (IS_RSC || !React.useMemo) {
            return props.children;
        }
        var styleSheet = useStyleSheetContext().styleSheet;
        var resolvedStyleSheet = React.useMemo(function () {
            var sheet = styleSheet;
            if (props.sheet) {
                sheet = props.sheet;
            }
            else if (props.target) {
                sheet = sheet.reconstructWithOptions({ target: props.target }, false);
            }
            if (props.disableCSSOMInjection) {
                sheet = sheet.reconstructWithOptions({ useCSSOMInjection: false });
            }
            return sheet;
        }, [props.disableCSSOMInjection, props.sheet, props.target, styleSheet]);
        var stylis = React.useMemo(function () {
            return createStylisInstance({
                options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
                plugins: props.stylisPlugins,
            });
        }, [props.enableVendorPrefixes, props.namespace, props.stylisPlugins]);
        var styleSheetContextValue = React.useMemo(function () { return ({
            shouldForwardProp: props.shouldForwardProp,
            styleSheet: resolvedStyleSheet,
            stylis: stylis,
        }); }, [props.shouldForwardProp, resolvedStyleSheet, stylis]);
        return (React.createElement(StyleSheetContext.Provider, { value: styleSheetContextValue },
            React.createElement(StylisContext.Provider, { value: stylis }, props.children)));
    }

    var Keyframes = /** @class */ (function () {
        function Keyframes(name, rules) {
            var _this = this;
            this.inject = function (styleSheet, stylisInstance) {
                if (stylisInstance === void 0) { stylisInstance = mainStylis; }
                var resolvedName = _this.name + stylisInstance.hash;
                if (!styleSheet.hasNameForId(_this.id, resolvedName)) {
                    styleSheet.insertRules(_this.id, resolvedName, stylisInstance(_this.rules, resolvedName, '@keyframes'));
                }
            };
            this.name = name;
            this.id = "sc-keyframes-".concat(name);
            this.rules = rules;
            setToString(this, function () {
                throw throwStyledComponentsError(12, String(_this.name));
            });
        }
        Keyframes.prototype.getName = function (stylisInstance) {
            if (stylisInstance === void 0) { stylisInstance = mainStylis; }
            return this.name + stylisInstance.hash;
        };
        return Keyframes;
    }());

    var unitlessKeys = {
      animationIterationCount: 1,
      aspectRatio: 1,
      borderImageOutset: 1,
      borderImageSlice: 1,
      borderImageWidth: 1,
      boxFlex: 1,
      boxFlexGroup: 1,
      boxOrdinalGroup: 1,
      columnCount: 1,
      columns: 1,
      flex: 1,
      flexGrow: 1,
      flexPositive: 1,
      flexShrink: 1,
      flexNegative: 1,
      flexOrder: 1,
      gridRow: 1,
      gridRowEnd: 1,
      gridRowSpan: 1,
      gridRowStart: 1,
      gridColumn: 1,
      gridColumnEnd: 1,
      gridColumnSpan: 1,
      gridColumnStart: 1,
      msGridRow: 1,
      msGridRowSpan: 1,
      msGridColumn: 1,
      msGridColumnSpan: 1,
      fontWeight: 1,
      lineHeight: 1,
      opacity: 1,
      order: 1,
      orphans: 1,
      scale: 1,
      tabSize: 1,
      widows: 1,
      zIndex: 1,
      zoom: 1,
      WebkitLineClamp: 1,
      // SVG-related properties
      fillOpacity: 1,
      floodOpacity: 1,
      stopOpacity: 1,
      strokeDasharray: 1,
      strokeDashoffset: 1,
      strokeMiterlimit: 1,
      strokeOpacity: 1,
      strokeWidth: 1
    };

    // Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
    function addUnitIfNeeded(name, value) {
        // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
        if (value == null || typeof value === 'boolean' || value === '') {
            return '';
        }
        if (typeof value === 'number' && value !== 0 && !(name in unitlessKeys) && !name.startsWith('--')) {
            return "".concat(value, "px"); // Presumes implicit 'px' suffix for unitless numbers except for CSS variables
        }
        return String(value).trim();
    }

    function getComponentName(target) {
        return ((typeof target === 'string' && target ) ||
            target.displayName ||
            target.name ||
            'Component');
    }

    var isUpper = function (c) { return c >= 'A' && c <= 'Z'; };
    /**
     * Hyphenates a camelcased CSS property name, for example:
     *
     *   > hyphenateStyleName('backgroundColor')
     *   < "background-color"
     *   > hyphenateStyleName('MozTransition')
     *   < "-moz-transition"
     *   > hyphenateStyleName('msTransition')
     *   < "-ms-transition"
     *
     * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
     * is converted to `-ms-`.
     */
    function hyphenateStyleName(string) {
        var output = '';
        for (var i = 0; i < string.length; i++) {
            var c = string[i];
            // Check for CSS variable prefix
            if (i === 1 && c === '-' && string[0] === '-') {
                return string;
            }
            if (isUpper(c)) {
                output += '-' + c.toLowerCase();
            }
            else {
                output += c;
            }
        }
        return output.startsWith('ms-') ? '-' + output : output;
    }

    function isFunction(test) {
        return typeof test === 'function';
    }

    function isPlainObject(x) {
        return (x !== null &&
            typeof x === 'object' &&
            x.constructor.name === Object.name &&
            /* check for reasonable markers that the object isn't an element for react & preact/compat */
            !('props' in x && x.$$typeof));
    }

    function isStatelessFunction(test) {
        return isFunction(test) && !(test.prototype && test.prototype.isReactComponent);
    }

    function isStyledComponent(target) {
        return typeof target === 'object' && 'styledComponentId' in target;
    }

    /**
     * It's falsish not falsy because 0 is allowed.
     */
    var isFalsish = function (chunk) {
        return chunk === undefined || chunk === null || chunk === false || chunk === '';
    };
    var objToCssArray = function (obj) {
        var rules = [];
        for (var key in obj) {
            var val = obj[key];
            if (!obj.hasOwnProperty(key) || isFalsish(val))
                continue;
            // @ts-expect-error Property 'isCss' does not exist on type 'any[]'
            if ((Array.isArray(val) && val.isCss) || isFunction(val)) {
                rules.push("".concat(hyphenateStyleName(key), ":"), val, ';');
            }
            else if (isPlainObject(val)) {
                rules.push.apply(rules, __spreadArray(__spreadArray(["".concat(key, " {")], objToCssArray(val), false), ['}'], false));
            }
            else {
                rules.push("".concat(hyphenateStyleName(key), ": ").concat(addUnitIfNeeded(key, val), ";"));
            }
        }
        return rules;
    };
    function flatten(chunk, executionContext, styleSheet, stylisInstance, result) {
        if (result === void 0) { result = []; }
        if (typeof chunk === 'string') {
            if (chunk)
                result.push(chunk);
            return result;
        }
        if (isFalsish(chunk)) {
            return result;
        }
        /* Handle other components */
        if (isStyledComponent(chunk)) {
            result.push(".".concat(chunk.styledComponentId));
            return result;
        }
        /* Either execute or defer the function */
        if (isFunction(chunk)) {
            if (isStatelessFunction(chunk) && executionContext) {
                var fnResult = chunk(executionContext);
                if (typeof fnResult === 'object' &&
                    !Array.isArray(fnResult) &&
                    !(fnResult instanceof Keyframes) &&
                    !isPlainObject(fnResult) &&
                    fnResult !== null) {
                    console.error("".concat(getComponentName(chunk), " is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details."));
                }
                return flatten(fnResult, executionContext, styleSheet, stylisInstance, result);
            }
            else {
                result.push(chunk);
                return result;
            }
        }
        if (chunk instanceof Keyframes) {
            if (styleSheet) {
                chunk.inject(styleSheet, stylisInstance);
                result.push(chunk.getName(stylisInstance));
            }
            else {
                result.push(chunk);
            }
            return result;
        }
        /* Handle objects */
        if (isPlainObject(chunk)) {
            var cssArr = objToCssArray(chunk);
            for (var i = 0; i < cssArr.length; i++)
                result.push(cssArr[i]);
            return result;
        }
        if (!Array.isArray(chunk)) {
            result.push(chunk.toString());
            return result;
        }
        for (var i = 0; i < chunk.length; i++) {
            flatten(chunk[i], executionContext, styleSheet, stylisInstance, result);
        }
        return result;
    }

    function isStaticRules(rules) {
        for (var i = 0; i < rules.length; i += 1) {
            var rule = rules[i];
            if (isFunction(rule) && !isStyledComponent(rule)) {
                // functions are allowed to be static if they're just being
                // used to get the classname of a nested styled component
                return false;
            }
        }
        return true;
    }

    /**
     * Convenience function for joining strings to form className chains
     */
    function joinStrings(a, b) {
        return a && b ? "".concat(a, " ").concat(b) : a || b || '';
    }
    function joinStringArray(arr, sep) {
        return arr.join(sep || '');
    }

    var GlobalStyle = /** @class */ (function () {
        function GlobalStyle(rules, componentId) {
            this.rules = rules;
            this.componentId = componentId;
            this.isStatic = isStaticRules(rules);
            // pre-register the first instance to ensure global styles
            // load before component ones
            StyleSheet.registerId(this.componentId + 1);
        }
        GlobalStyle.prototype.createStyles = function (instance, executionContext, styleSheet, stylis) {
            var flatCSS = joinStringArray(flatten(this.rules, executionContext, styleSheet, stylis));
            var css = stylis(flatCSS, '');
            var id = this.componentId + instance;
            // NOTE: We use the id as a name as well, since these rules never change
            styleSheet.insertRules(id, id, css);
        };
        GlobalStyle.prototype.removeStyles = function (instance, styleSheet) {
            styleSheet.clearRules(this.componentId + instance);
        };
        GlobalStyle.prototype.renderStyles = function (instance, executionContext, styleSheet, stylis) {
            if (instance > 2)
                StyleSheet.registerId(this.componentId + instance);
            var id = this.componentId + instance;
            // For static styles that don't change based on props,
            // only inject once and don't remove/re-add on every render.
            // This prevents issues with React StrictMode where the effect cleanup
            // from the simulated unmount runs after the re-render.
            if (this.isStatic) {
                if (!styleSheet.hasNameForId(id, id)) {
                    this.createStyles(instance, executionContext, styleSheet, stylis);
                }
                return;
            }
            // NOTE: Remove old styles, then inject the new ones
            this.removeStyles(instance, styleSheet);
            this.createStyles(instance, executionContext, styleSheet, stylis);
        };
        return GlobalStyle;
    }());

    // Create context only if createContext is available, otherwise create a fallback
    var ThemeContext = !IS_RSC
        ? React.createContext(undefined)
        : {
            Provider: function (_a) {
                var children = _a.children;
                return children;
            },
            Consumer: function (_a) {
                var children = _a.children;
                return children(undefined);
            },
        };
    var ThemeConsumer = ThemeContext.Consumer;
    function mergeTheme(theme, outerTheme) {
        if (!theme) {
            throw throwStyledComponentsError(14);
        }
        if (isFunction(theme)) {
            var themeFn = theme;
            var mergedTheme = themeFn(outerTheme);
            if ((mergedTheme === null || Array.isArray(mergedTheme) || typeof mergedTheme !== 'object')) {
                throw throwStyledComponentsError(7);
            }
            return mergedTheme;
        }
        if (Array.isArray(theme) || typeof theme !== 'object') {
            throw throwStyledComponentsError(8);
        }
        return outerTheme ? __assign(__assign({}, outerTheme), theme) : theme;
    }
    /**
     * Returns the current theme (as provided by the closest ancestor `ThemeProvider`.)
     *
     * If no `ThemeProvider` is found, the function will error. If you need access to the theme in an
     * uncertain composition scenario, `React.useContext(ThemeContext)` will not emit an error if there
     * is no `ThemeProvider` ancestor.
     */
    function useTheme() {
        // Skip useContext if we're in an RSC environment without context support
        var theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
        if (!theme) {
            throw throwStyledComponentsError(18);
        }
        return theme;
    }
    /**
     * Provide a theme to an entire react component tree via context
     */
    function ThemeProvider(props) {
        // In RSC environments without context support, ThemeProvider becomes a no-op
        if (IS_RSC) {
            return props.children;
        }
        var outerTheme = React.useContext(ThemeContext);
        var themeContext = React.useMemo(function () { return mergeTheme(props.theme, outerTheme); }, [props.theme, outerTheme]);
        if (!props.children) {
            return null;
        }
        return React.createElement(ThemeContext.Provider, { value: themeContext }, props.children);
    }

    var invalidHookCallRe = /invalid hook call/i;
    var seen = new Set();
    var checkDynamicCreation = function (displayName, componentId) {
        {
            // Skip check in RSC environments where:
            // 1. Components are always module-level (can't be in render functions)
            // 2. Hook detection is unreliable due to different module evaluation context
            if (IS_RSC) {
                return;
            }
            var parsedIdString = componentId ? " with the id of \"".concat(componentId, "\"") : '';
            var message_1 = "The component ".concat(displayName).concat(parsedIdString, " has been created dynamically.\n") +
                "You may see this warning because you've called styled inside another component.\n" +
                'To resolve this only create new StyledComponents outside of any render method and function component.\n' +
                'See https://styled-components.com/docs/basics#define-styled-components-outside-of-the-render-method for more info.\n';
            // If a hook is called outside of a component:
            // React 17 and earlier throw an error
            // React 18 and above use console.error
            var originalConsoleError_1 = console.error;
            try {
                var didNotCallInvalidHook_1 = true;
                console.error = function (consoleErrorMessage) {
                    var consoleErrorArgs = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        consoleErrorArgs[_i - 1] = arguments[_i];
                    }
                    // The error here is expected, since we're expecting anything that uses `checkDynamicCreation` to
                    // be called outside of a React component.
                    if (invalidHookCallRe.test(consoleErrorMessage)) {
                        didNotCallInvalidHook_1 = false;
                        // This shouldn't happen, but resets `warningSeen` if we had this error happen intermittently
                        seen.delete(message_1);
                    }
                    else {
                        originalConsoleError_1.apply(void 0, __spreadArray([consoleErrorMessage], consoleErrorArgs, false));
                    }
                };
                // We purposefully call a hook outside of a component and expect it to throw
                // If it doesn't, then we're inside another component.
                // Use useState instead of useRef to avoid importing useRef
                if (typeof React.useState === 'function') {
                    React.useState(null);
                }
                if (didNotCallInvalidHook_1 && !seen.has(message_1)) {
                    console.warn(message_1);
                    seen.add(message_1);
                }
            }
            catch (error) {
                // The error here is expected, since we're expecting anything that uses `checkDynamicCreation` to
                // be called outside of a React component.
                if (invalidHookCallRe.test(error.message)) {
                    // This shouldn't happen, but resets `warningSeen` if we had this error happen intermittently
                    seen.delete(message_1);
                }
            }
            finally {
                console.error = originalConsoleError_1;
            }
        }
    };

    function determineTheme(props, providedTheme, defaultProps) {
        if (defaultProps === void 0) { defaultProps = EMPTY_OBJECT; }
        return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
    }

    var AD_REPLACER_R = /(a)(d)/gi;
    /* This is the "capacity" of our alphabet i.e. 2x26 for all letters plus their capitalised
     * counterparts */
    var charsLength = 52;
    /* start at 75 for 'a' until 'z' (25) and then start at 65 for capitalised letters */
    var getAlphabeticChar = function (code) { return String.fromCharCode(code + (code > 25 ? 39 : 97)); };
    /* input a number, usually a hash and convert it to base-52 */
    function generateAlphabeticName(code) {
        var name = '';
        var x;
        /* get a char and divide by alphabet-length */
        for (x = Math.abs(code); x > charsLength; x = (x / charsLength) | 0) {
            name = getAlphabeticChar(x % charsLength) + name;
        }
        return (getAlphabeticChar(x % charsLength) + name).replace(AD_REPLACER_R, '$1-$2');
    }

    function generateComponentId(str) {
        return generateAlphabeticName(hash(str) >>> 0);
    }

    function interleave(strings, interpolations) {
        var result = [strings[0]];
        for (var i = 0, len = interpolations.length; i < len; i += 1) {
            result.push(interpolations[i], strings[i + 1]);
        }
        return result;
    }

    /**
     * Used when flattening object styles to determine if we should
     * expand an array of styles.
     */
    var addTag = function (arg) {
        return Object.assign(arg, { isCss: true });
    };
    function css(styles) {
        var interpolations = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            interpolations[_i - 1] = arguments[_i];
        }
        if (isFunction(styles) || isPlainObject(styles)) {
            var styleFunctionOrObject = styles;
            return addTag(flatten(interleave(EMPTY_ARRAY, __spreadArray([
                styleFunctionOrObject
            ], interpolations, true))));
        }
        var styleStringArray = styles;
        if (interpolations.length === 0 &&
            styleStringArray.length === 1 &&
            typeof styleStringArray[0] === 'string') {
            return flatten(styleStringArray);
        }
        return addTag(flatten(interleave(styleStringArray, interpolations)));
    }

    function createGlobalStyle(strings) {
        var interpolations = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            interpolations[_i - 1] = arguments[_i];
        }
        var rules = css.apply(void 0, __spreadArray([strings], interpolations, false));
        var styledComponentId = "sc-global-".concat(generateComponentId(JSON.stringify(rules)));
        var globalStyle = new GlobalStyle(rules, styledComponentId);
        {
            checkDynamicCreation(styledComponentId);
        }
        // Use a WeakMap to maintain stable instances per stylesheet
        var instanceMap = new WeakMap();
        var GlobalStyleComponent = function (props) {
            var ssc = useStyleSheetContext();
            var theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
            // Get or create instance ID for this stylesheet
            var instance = instanceMap.get(ssc.styleSheet);
            if (instance === undefined) {
                instance = ssc.styleSheet.allocateGSInstance(styledComponentId);
                instanceMap.set(ssc.styleSheet, instance);
            }
            if (// @ts-expect-error invariant check
                React.Children.count(props.children)) {
                console.warn("The global style component ".concat(styledComponentId, " was given child JSX. createGlobalStyle does not render children."));
            }
            if (rules.some(function (rule) { return typeof rule === 'string' && rule.indexOf('@import') !== -1; })) {
                console.warn("Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app.");
            }
            // Render styles during component execution
            var shouldRenderStyles = typeof window === 'undefined' || !ssc.styleSheet.server;
            if (shouldRenderStyles) {
                renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
            }
            // Client-side lifecycle: render styles in effect and clean up on unmount.
            // false and IS_RSC are build/module-level constants, so this doesn't violate rules of hooks.
            if (!IS_RSC) {
                React.useLayoutEffect(function () {
                    // Re-render styles on every effect run to self-heal after any cleanup
                    // (e.g. StrictMode's simulated unmount/remount, error recovery).
                    // useLayoutEffect runs synchronously before paint, so the brief
                    // remove→re-add in cleanup→mount is never visible to the user.
                    if (!ssc.styleSheet.server) {
                        renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
                    }
                    return function () {
                        globalStyle.removeStyles(instance, ssc.styleSheet);
                        removeGlobalStyleTag(styledComponentId, ssc.styleSheet.options.target);
                    };
                }, [instance, props, ssc.styleSheet, theme, ssc.stylis]);
            }
            // RSC mode: output style tag.
            // Unlike regular styled components, global styles must NOT use React 19's
            // `precedence` attribute because it makes style tags persist as permanent
            // resources even after unmount. Global styles need lifecycle-based cleanup
            // for conditional rendering (e.g. body lock on modal open/close).
            if (IS_RSC) {
                var id = styledComponentId + instance;
                var css_1 = typeof window === 'undefined' ? ssc.styleSheet.getTag().getGroup(getGroupForId(id)) : '';
                if (css_1) {
                    return React.createElement('style', {
                        key: "".concat(styledComponentId, "-").concat(instance),
                        'data-styled-global': styledComponentId,
                        children: css_1,
                    });
                }
            }
            return null;
        };
        function renderStyles(instance, props, styleSheet, theme, stylis) {
            if (globalStyle.isStatic) {
                globalStyle.renderStyles(instance, STATIC_EXECUTION_CONTEXT, styleSheet, stylis);
            }
            else {
                var context = __assign(__assign({}, props), { theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps) });
                globalStyle.renderStyles(instance, context, styleSheet, stylis);
            }
        }
        return React.memo(GlobalStyleComponent);
    }

    function keyframes(strings) {
        var interpolations = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            interpolations[_i - 1] = arguments[_i];
        }
        /* Warning if you've used keyframes on React Native */
        if (typeof navigator !== 'undefined' &&
            navigator.product === 'ReactNative') {
            console.warn('`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use Animated.');
        }
        var rules = joinStringArray(css.apply(void 0, __spreadArray([strings], interpolations, false)));
        var name = generateComponentId(rules);
        return new Keyframes(name, rules);
    }

    var _a;
    var hasSymbol = typeof Symbol === 'function' && Symbol.for;
    // copied from react-is
    var REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
    var REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for('react.forward_ref') : 0xead0;
    /**
     * Adapted from hoist-non-react-statics to avoid the react-is dependency.
     */
    var REACT_STATICS = {
        childContextTypes: true,
        contextType: true,
        contextTypes: true,
        defaultProps: true,
        displayName: true,
        getDefaultProps: true,
        getDerivedStateFromError: true,
        getDerivedStateFromProps: true,
        mixins: true,
        propTypes: true,
        type: true,
    };
    var KNOWN_STATICS = {
        name: true,
        length: true,
        prototype: true,
        caller: true,
        callee: true,
        arguments: true,
        arity: true,
    };
    var FORWARD_REF_STATICS = {
        $$typeof: true,
        render: true,
        defaultProps: true,
        displayName: true,
        propTypes: true,
    };
    var MEMO_STATICS = {
        $$typeof: true,
        compare: true,
        defaultProps: true,
        displayName: true,
        propTypes: true,
        type: true,
    };
    var TYPE_STATICS = (_a = {},
        _a[REACT_FORWARD_REF_TYPE] = FORWARD_REF_STATICS,
        _a[REACT_MEMO_TYPE] = MEMO_STATICS,
        _a);
    // adapted from react-is
    function isMemo(object) {
        var $$typeofType = 'type' in object && object.type.$$typeof;
        return $$typeofType === REACT_MEMO_TYPE;
    }
    function getStatics(component) {
        // React v16.11 and below
        if (isMemo(component)) {
            return MEMO_STATICS;
        }
        // React v16.12 and above
        return '$$typeof' in component
            ? TYPE_STATICS[component['$$typeof']]
            : REACT_STATICS;
    }
    var defineProperty = Object.defineProperty;
    var getOwnPropertyNames = Object.getOwnPropertyNames;
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    var getPrototypeOf = Object.getPrototypeOf;
    var objectPrototype = Object.prototype;
    function hoistNonReactStatics(targetComponent, sourceComponent, excludelist) {
        if (typeof sourceComponent !== 'string') {
            // don't hoist over string (html) components
            if (objectPrototype) {
                var inheritedComponent = getPrototypeOf(sourceComponent);
                if (inheritedComponent && inheritedComponent !== objectPrototype) {
                    hoistNonReactStatics(targetComponent, inheritedComponent, excludelist);
                }
            }
            var keys = getOwnPropertyNames(sourceComponent);
            if (getOwnPropertySymbols) {
                keys = keys.concat(getOwnPropertySymbols(sourceComponent));
            }
            var targetStatics = getStatics(targetComponent);
            var sourceStatics = getStatics(sourceComponent);
            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                if (!(key in KNOWN_STATICS) &&
                    !(excludelist && excludelist[key]) &&
                    !(sourceStatics && key in sourceStatics) &&
                    !(targetStatics && key in targetStatics)) {
                    var descriptor = getOwnPropertyDescriptor(sourceComponent, key);
                    try {
                        // Avoid failures from read-only properties
                        defineProperty(targetComponent, key, descriptor);
                    }
                    catch (e) {
                        /* ignore */
                    }
                }
            }
        }
        return targetComponent;
    }

    function withTheme(Component) {
        var WithTheme = React.forwardRef(function (props, ref) {
            var theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
            var themeProp = determineTheme(props, theme, Component.defaultProps);
            if (themeProp === undefined) {
                console.warn("[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class \"".concat(getComponentName(Component), "\""));
            }
            return React.createElement(Component, __assign(__assign({}, props), { theme: themeProp, ref: ref }));
        });
        WithTheme.displayName = "WithTheme(".concat(getComponentName(Component), ")");
        return hoistNonReactStatics(WithTheme, Component);
    }

    var ServerStyleSheet = /** @class */ (function () {
        function ServerStyleSheet() {
            var _this = this;
            this._emitSheetCSS = function () {
                var css = _this.instance.toString();
                if (!css)
                    return '';
                var nonce = getNonce();
                var attrs = [
                    nonce && "nonce=\"".concat(nonce, "\""),
                    "".concat(SC_ATTR, "=\"true\""),
                    "".concat(SC_ATTR_VERSION, "=\"").concat(SC_VERSION, "\""),
                ];
                var htmlAttr = joinStringArray(attrs.filter(Boolean), ' ');
                return "<style ".concat(htmlAttr, ">").concat(css, "</style>");
            };
            this.getStyleTags = function () {
                if (_this.sealed) {
                    throw throwStyledComponentsError(2);
                }
                return _this._emitSheetCSS();
            };
            this.getStyleElement = function () {
                var _a;
                if (_this.sealed) {
                    throw throwStyledComponentsError(2);
                }
                var css = _this.instance.toString();
                if (!css)
                    return [];
                var props = (_a = {},
                    _a[SC_ATTR] = '',
                    _a[SC_ATTR_VERSION] = SC_VERSION,
                    _a.dangerouslySetInnerHTML = {
                        __html: css,
                    },
                    _a);
                var nonce = getNonce();
                if (nonce) {
                    props.nonce = nonce;
                }
                // v4 returned an array for this fn, so we'll do the same for v5 for backward compat
                return [React.createElement("style", __assign({}, props, { key: "sc-0-0" }))];
            };
            this.seal = function () {
                _this.sealed = true;
            };
            this.instance = new StyleSheet({ isServer: true });
            this.sealed = false;
        }
        ServerStyleSheet.prototype.collectStyles = function (children) {
            if (this.sealed) {
                throw throwStyledComponentsError(2);
            }
            return React.createElement(StyleSheetManager, { sheet: this.instance }, children);
        };
        ServerStyleSheet.prototype.interleaveWithNodeStream = function (input) {
            {
                throw throwStyledComponentsError(3);
            }
        };
        return ServerStyleSheet;
    }());

    var __PRIVATE__ = {
        StyleSheet: StyleSheet,
        mainSheet: mainSheet,
    };

    /* Import singletons */
    /* Warning if you've imported this file on React Native */
    if (typeof navigator !== 'undefined' &&
        navigator.product === 'ReactNative') {
        console.warn("It looks like you've imported 'styled-components' on React Native.\nPerhaps you're looking to import 'styled-components/native'?\nRead more about this at https://www.styled-components.com/docs/basics#react-native");
    }
    var windowGlobalKey = "__sc-".concat(SC_ATTR, "__");
    /* Warning if there are several instances of styled-components */
    if (typeof window !== 'undefined') {
        // @ts-expect-error dynamic key not in window object
        window[windowGlobalKey] || (window[windowGlobalKey] = 0);
        // @ts-expect-error dynamic key not in window object
        if (window[windowGlobalKey] === 1) {
            console.warn("It looks like there are several instances of 'styled-components' initialized in this application. This may cause dynamic styles to not render properly, errors during the rehydration process, a missing theme prop, and makes your application bigger without good reason.\n\nSee https://styled-components.com/docs/faqs#why-am-i-getting-a-warning-about-several-instances-of-module-on-the-page for more info.");
        }
        // @ts-expect-error dynamic key not in window object
        window[windowGlobalKey] += 1;
    }

    var secondary = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ServerStyleSheet: ServerStyleSheet,
        StyleSheetConsumer: StyleSheetConsumer,
        StyleSheetContext: StyleSheetContext,
        StyleSheetManager: StyleSheetManager,
        ThemeConsumer: ThemeConsumer,
        ThemeContext: ThemeContext,
        ThemeProvider: ThemeProvider,
        __PRIVATE__: __PRIVATE__,
        createGlobalStyle: createGlobalStyle,
        css: css,
        isStyledComponent: isStyledComponent,
        keyframes: keyframes,
        useTheme: useTheme,
        version: SC_VERSION,
        withTheme: withTheme
    });

    function memoize(fn) {
      var cache = Object.create(null);
      return function (arg) {
        if (cache[arg] === undefined) cache[arg] = fn(arg);
        return cache[arg];
      };
    }

    // eslint-disable-next-line no-undef
    var reactPropsRegex = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|popover|popoverTarget|popoverTargetAction|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/; // https://esbench.com/bench/5bfee68a4cd7e6009ef61d23

    var isPropValid = /* #__PURE__ */memoize(function (prop) {
      return reactPropsRegex.test(prop) || prop.charCodeAt(0) === 111
      /* o */
      && prop.charCodeAt(1) === 110
      /* n */
      && prop.charCodeAt(2) < 91;
    }
    /* Z+1 */
    );

    var LIMIT = 200;
    var createWarnTooManyClasses = (function (displayName, componentId) {
        var generatedClasses = {};
        var warningSeen = false;
        return function (className) {
            if (!warningSeen) {
                generatedClasses[className] = true;
                if (Object.keys(generatedClasses).length >= LIMIT) {
                    // Unable to find latestRule in test environment.
                    var parsedIdString = componentId ? " with the id of \"".concat(componentId, "\"") : '';
                    console.warn("Over ".concat(LIMIT, " classes were generated for component ").concat(displayName).concat(parsedIdString, ".\n") +
                        'Consider using the attrs method, together with a style object for frequently changed styles.\n' +
                        'Example:\n' +
                        '  const Component = styled.div.attrs(props => ({\n' +
                        '    style: {\n' +
                        '      background: props.background,\n' +
                        '    },\n' +
                        '  }))`width: 100%;`\n\n' +
                        '  <Component />');
                    warningSeen = true;
                    generatedClasses = {};
                }
            }
        };
    });

    var elements = [
        'a',
        'abbr',
        'address',
        'area',
        'article',
        'aside',
        'audio',
        'b',
        'bdi',
        'bdo',
        'blockquote',
        'body',
        'button',
        'br',
        'canvas',
        'caption',
        'cite',
        'code',
        'col',
        'colgroup',
        'data',
        'datalist',
        'dd',
        'del',
        'details',
        'dfn',
        'dialog',
        'div',
        'dl',
        'dt',
        'em',
        'embed',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'html',
        'i',
        'iframe',
        'img',
        'input',
        'ins',
        'kbd',
        'label',
        'legend',
        'li',
        'main',
        'map',
        'mark',
        'menu',
        'meter',
        'nav',
        'object',
        'ol',
        'optgroup',
        'option',
        'output',
        'p',
        'picture',
        'pre',
        'progress',
        'q',
        'rp',
        'rt',
        'ruby',
        's',
        'samp',
        'search',
        'section',
        'select',
        'slot',
        'small',
        'span',
        'strong',
        'sub',
        'summary',
        'sup',
        'table',
        'tbody',
        'td',
        'template',
        'textarea',
        'tfoot',
        'th',
        'thead',
        'time',
        'tr',
        'u',
        'ul',
        'var',
        'video',
        'wbr',
        'circle',
        'clipPath',
        'defs',
        'ellipse',
        'feBlend',
        'feColorMatrix',
        'feComponentTransfer',
        'feComposite',
        'feConvolveMatrix',
        'feDiffuseLighting',
        'feDisplacementMap',
        'feDistantLight',
        'feDropShadow',
        'feFlood',
        'feFuncA',
        'feFuncB',
        'feFuncG',
        'feFuncR',
        'feGaussianBlur',
        'feImage',
        'feMerge',
        'feMergeNode',
        'feMorphology',
        'feOffset',
        'fePointLight',
        'feSpecularLighting',
        'feSpotLight',
        'feTile',
        'feTurbulence',
        'filter',
        'foreignObject',
        'g',
        'image',
        'line',
        'linearGradient',
        'marker',
        'mask',
        'path',
        'pattern',
        'polygon',
        'polyline',
        'radialGradient',
        'rect',
        'stop',
        'svg',
        'switch',
        'symbol',
        'text',
        'textPath',
        'tspan',
        'use',
    ];
    var domElements = new Set(elements);

    // Source: https://www.w3.org/TR/cssom-1/#serialize-an-identifier
    // Control characters and non-letter first symbols are not supported
    var escapeRegex = /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g;
    var dashesAtEnds = /(^-|-$)/g;
    /**
     * TODO: Explore using CSS.escape when it becomes more available
     * in evergreen browsers.
     */
    function escape(str) {
        return str // Replace all possible CSS selectors
            .replace(escapeRegex, '-') // Remove extraneous hyphens at the start and end
            .replace(dashesAtEnds, '');
    }

    function isTag(target) {
        return (typeof target === 'string' &&
            (target.charAt(0) === target.charAt(0).toLowerCase()
                ));
    }

    function generateDisplayName(target) {
        return isTag(target) ? "styled.".concat(target) : "Styled(".concat(getComponentName(target), ")");
    }

    function mixinRecursively(target, source, forceMerge) {
        if (forceMerge === void 0) { forceMerge = false; }
        /* only merge into POJOs, Arrays, but for top level objects only
         * allow to merge into anything by passing forceMerge = true */
        if (!forceMerge && !isPlainObject(target) && !Array.isArray(target)) {
            return source;
        }
        if (Array.isArray(source)) {
            for (var key = 0; key < source.length; key++) {
                target[key] = mixinRecursively(target[key], source[key]);
            }
        }
        else if (isPlainObject(source)) {
            for (var key in source) {
                target[key] = mixinRecursively(target[key], source[key]);
            }
        }
        return target;
    }
    /**
     * Arrays & POJOs merged recursively, other objects and value types are overridden
     * If target is not a POJO or an Array, it will get source properties injected via shallow merge
     * Source objects applied left to right.  Mutates & returns target.  Similar to lodash merge.
     */
    function mixinDeep(target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        for (var _a = 0, sources_1 = sources; _a < sources_1.length; _a++) {
            var source = sources_1[_a];
            mixinRecursively(target, source, true);
        }
        return target;
    }

    var SEED = hash(SC_VERSION);
    /**
     * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
     */
    var ComponentStyle = /** @class */ (function () {
        function ComponentStyle(rules, componentId, baseStyle) {
            this.rules = rules;
            this.staticRulesId = '';
            this.isStatic =
                "development" === 'production'  ;
            this.componentId = componentId;
            this.baseHash = phash(SEED, componentId);
            this.baseStyle = baseStyle;
            // NOTE: This registers the componentId, which ensures a consistent order
            // for this component's styles compared to others
            StyleSheet.registerId(componentId);
        }
        ComponentStyle.prototype.generateAndInjectStyles = function (executionContext, styleSheet, stylis) {
            var names = this.baseStyle
                ? this.baseStyle.generateAndInjectStyles(executionContext, styleSheet, stylis).className
                : '';
            // force dynamic classnames if user-supplied stylis plugins are in use
            if (this.isStatic && !stylis.hash) {
                if (this.staticRulesId && styleSheet.hasNameForId(this.componentId, this.staticRulesId)) {
                    names = joinStrings(names, this.staticRulesId);
                }
                else {
                    var cssStatic = joinStringArray(flatten(this.rules, executionContext, styleSheet, stylis));
                    var name_1 = generateAlphabeticName(phash(this.baseHash, cssStatic) >>> 0);
                    if (!styleSheet.hasNameForId(this.componentId, name_1)) {
                        var cssStaticFormatted = stylis(cssStatic, ".".concat(name_1), undefined, this.componentId);
                        styleSheet.insertRules(this.componentId, name_1, cssStaticFormatted);
                    }
                    names = joinStrings(names, name_1);
                    this.staticRulesId = name_1;
                }
            }
            else {
                var dynamicHash = phash(this.baseHash, stylis.hash);
                var css = '';
                for (var i = 0; i < this.rules.length; i++) {
                    var partRule = this.rules[i];
                    if (typeof partRule === 'string') {
                        css += partRule;
                        dynamicHash = phash(dynamicHash, partRule);
                    }
                    else if (partRule) {
                        var partString = joinStringArray(flatten(partRule, executionContext, styleSheet, stylis));
                        // The same value can switch positions in the array, so we include "i" in the hash.
                        // Split into two phash calls to avoid temp string allocation (partString + i).
                        // phash processes right-to-left, so phash(h, a+b) === phash(phash(h, b), a).
                        dynamicHash = phash(phash(dynamicHash, String(i)), partString);
                        css += partString;
                    }
                }
                if (css) {
                    var name_2 = generateAlphabeticName(dynamicHash >>> 0);
                    if (!styleSheet.hasNameForId(this.componentId, name_2)) {
                        var cssFormatted = stylis(css, ".".concat(name_2), undefined, this.componentId);
                        styleSheet.insertRules(this.componentId, name_2, cssFormatted);
                    }
                    names = joinStrings(names, name_2);
                }
            }
            // Retrieve CSS from Tag for RSC rendering
            var generatedCSS = typeof window === 'undefined'
                ? styleSheet.getTag().getGroup(getGroupForId(this.componentId))
                : '';
            return { className: names, css: generatedCSS };
        };
        return ComponentStyle;
    }());

    var identifiers = {};
    /* We depend on components having unique IDs */
    function generateId(displayName, parentComponentId) {
        var name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
        // Ensure that no displayName can lead to duplicate componentIds
        identifiers[name] = (identifiers[name] || 0) + 1;
        var componentId = "".concat(name, "-").concat(generateComponentId(
        // SC_VERSION gives us isolation between multiple runtimes on the page at once
        // this is improved further with use of the babel plugin "namespace" feature
        SC_VERSION + name + identifiers[name]));
        return parentComponentId ? "".concat(parentComponentId, "-").concat(componentId) : componentId;
    }
    function useInjectedStyle(componentStyle, resolvedAttrs) {
        var ssc = useStyleSheetContext();
        var result = componentStyle.generateAndInjectStyles(resolvedAttrs, ssc.styleSheet, ssc.stylis);
        if (React.useDebugValue) {
            React.useDebugValue(result.className);
        }
        return result;
    }
    function resolveContext(attrs, props, theme) {
        var context = __assign(__assign({}, props), { 
            // unset, add `props.className` back at the end so props always "wins"
            className: undefined, theme: theme });
        var attrDef;
        for (var i = 0; i < attrs.length; i += 1) {
            attrDef = attrs[i];
            var resolvedAttrDef = isFunction(attrDef) ? attrDef(context) : attrDef;
            for (var key in resolvedAttrDef) {
                if (key === 'className') {
                    context.className = joinStrings(context.className, resolvedAttrDef[key]);
                }
                else if (key === 'style') {
                    context.style = __assign(__assign({}, context.style), resolvedAttrDef[key]);
                }
                else {
                    // @ts-expect-error attrs can dynamically add arbitrary properties
                    context[key] = resolvedAttrDef[key];
                }
            }
        }
        if ('className' in props && typeof props.className === 'string') {
            context.className = joinStrings(context.className, props.className);
        }
        return context;
    }
    var seenUnknownProps = new Set();
    function useStyledComponentImpl(forwardedComponent, props, forwardedRef) {
        var componentAttrs = forwardedComponent.attrs, componentStyle = forwardedComponent.componentStyle, defaultProps = forwardedComponent.defaultProps, foldedComponentIds = forwardedComponent.foldedComponentIds, styledComponentId = forwardedComponent.styledComponentId, target = forwardedComponent.target;
        var contextTheme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
        var ssc = useStyleSheetContext();
        var shouldForwardProp = forwardedComponent.shouldForwardProp || ssc.shouldForwardProp;
        if (React.useDebugValue) {
            React.useDebugValue(styledComponentId);
        }
        // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
        // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
        // should be an immutable value, but behave for now.
        var theme = determineTheme(props, contextTheme, defaultProps) || (IS_RSC ? undefined : EMPTY_OBJECT);
        var context = resolveContext(componentAttrs, props, theme);
        var elementToBeCreated = context.as || target;
        var propsForElement = {};
        for (var key in context) {
            // @ts-expect-error context may have arbitrary properties from attrs
            if (context[key] === undefined) ;
            else if (key[0] === '$' || key === 'as' || (key === 'theme' && context.theme === theme)) ;
            else if (key === 'forwardedAs') {
                propsForElement.as = context.forwardedAs;
            }
            else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
                // @ts-expect-error context may have arbitrary properties from attrs
                propsForElement[key] = context[key];
                if (!shouldForwardProp &&
                    "development" === 'development' &&
                    !isPropValid(key) &&
                    !seenUnknownProps.has(key) &&
                    // Only warn on DOM Element.
                    domElements.has(elementToBeCreated)) {
                    seenUnknownProps.add(key);
                    console.warn("styled-components: it looks like an unknown prop \"".concat(key, "\" is being sent through to the DOM, which will likely trigger a React console error. If you would like automatic filtering of unknown props, you can opt-into that behavior via `<StyleSheetManager shouldForwardProp={...}>` (connect an API like `@emotion/is-prop-valid`) or consider using transient props (`$` prefix for automatic filtering.)"));
                }
            }
        }
        var _a = useInjectedStyle(componentStyle, context), generatedClassName = _a.className, css = _a.css;
        if (forwardedComponent.warnTooManyClasses) {
            forwardedComponent.warnTooManyClasses(generatedClassName);
        }
        var classString = joinStrings(foldedComponentIds, styledComponentId);
        if (generatedClassName) {
            classString += ' ' + generatedClassName;
        }
        if (context.className) {
            classString += ' ' + context.className;
        }
        propsForElement[
        // handle custom elements which React doesn't properly alias
        isTag(elementToBeCreated) &&
            !domElements.has(elementToBeCreated)
            ? 'class'
            : 'className'] = classString;
        // forwardedRef is coming from React.forwardRef.
        // But it might not exist. Since React 19 handles `ref` like a prop, it only define it if there is a value.
        // We don't want to inject an empty ref.
        if (forwardedRef) {
            propsForElement.ref = forwardedRef;
        }
        var element = React.createElement(elementToBeCreated, propsForElement);
        // RSC mode: output style tag alongside element
        // React 19's style hoisting will deduplicate by href and move to <head>
        if (IS_RSC && css) {
            return React.createElement(React.Fragment, null, React.createElement('style', {
                precedence: 'styled-components',
                href: "sc-".concat(styledComponentId, "-").concat(generatedClassName),
                children: css,
            }), element);
        }
        return element;
    }
    function createStyledComponent(target, options, rules) {
        var isTargetStyledComp = isStyledComponent(target);
        var styledComponentTarget = target;
        var isCompositeComponent = !isTag(target);
        var _a = options.attrs, attrs = _a === void 0 ? EMPTY_ARRAY : _a, _b = options.componentId, componentId = _b === void 0 ? generateId(options.displayName, options.parentComponentId) : _b, _c = options.displayName, displayName = _c === void 0 ? generateDisplayName(target) : _c;
        var styledComponentId = options.displayName && options.componentId
            ? "".concat(escape(options.displayName), "-").concat(options.componentId)
            : options.componentId || componentId;
        // fold the underlying StyledComponent attrs up (implicit extend)
        var finalAttrs = isTargetStyledComp && styledComponentTarget.attrs
            ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
            : attrs;
        var shouldForwardProp = options.shouldForwardProp;
        if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
            var shouldForwardPropFn_1 = styledComponentTarget.shouldForwardProp;
            if (options.shouldForwardProp) {
                var passedShouldForwardPropFn_1 = options.shouldForwardProp;
                // compose nested shouldForwardProp calls
                shouldForwardProp = function (prop, elementToBeCreated) {
                    return shouldForwardPropFn_1(prop, elementToBeCreated) &&
                        passedShouldForwardPropFn_1(prop, elementToBeCreated);
                };
            }
            else {
                shouldForwardProp = shouldForwardPropFn_1;
            }
        }
        var componentStyle = new ComponentStyle(rules, styledComponentId, isTargetStyledComp ? styledComponentTarget.componentStyle : undefined);
        function forwardRefRender(props, ref) {
            return useStyledComponentImpl(WrappedStyledComponent, props, ref);
        }
        forwardRefRender.displayName = displayName;
        /**
         * forwardRef creates a new interim component, which we'll take advantage of
         * instead of extending ParentComponent to create _another_ interim class
         */
        var WrappedStyledComponent = React.forwardRef(forwardRefRender);
        WrappedStyledComponent.attrs = finalAttrs;
        WrappedStyledComponent.componentStyle = componentStyle;
        WrappedStyledComponent.displayName = displayName;
        WrappedStyledComponent.shouldForwardProp = shouldForwardProp;
        // this static is used to preserve the cascade of static classes for component selector
        // purposes; this is especially important with usage of the css prop
        WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
            ? joinStrings(styledComponentTarget.foldedComponentIds, styledComponentTarget.styledComponentId)
            : '';
        WrappedStyledComponent.styledComponentId = styledComponentId;
        // fold the underlying StyledComponent target up since we folded the styles
        WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;
        Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
            get: function () {
                return this._foldedDefaultProps;
            },
            set: function (obj) {
                this._foldedDefaultProps = isTargetStyledComp
                    ? mixinDeep({}, styledComponentTarget.defaultProps, obj)
                    : obj;
            },
        });
        {
            checkDynamicCreation(displayName, styledComponentId);
            WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName, styledComponentId);
        }
        setToString(WrappedStyledComponent, function () { return ".".concat(WrappedStyledComponent.styledComponentId); });
        if (isCompositeComponent) {
            var compositeComponentTarget = target;
            hoistNonReactStatics(WrappedStyledComponent, compositeComponentTarget, {
                // all SC-specific things should not be hoisted
                attrs: true,
                componentStyle: true,
                displayName: true,
                foldedComponentIds: true,
                shouldForwardProp: true,
                styledComponentId: true,
                target: true,
            });
        }
        return WrappedStyledComponent;
    }

    function constructWithOptions(componentConstructor, tag, options) {
        if (options === void 0) { options = EMPTY_OBJECT; }
        /**
         * We trust that the tag is a valid component as long as it isn't
         * falsish. Typically the tag here is a string or function (i.e.
         * class or pure function component), however a component may also be
         * an object if it uses another utility, e.g. React.memo. React will
         * output an appropriate warning however if the `tag` isn't valid.
         */
        if (!tag) {
            throw throwStyledComponentsError(1, tag);
        }
        /* This is callable directly as a template function */
        var templateFunction = function (initialStyles) {
            var interpolations = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                interpolations[_i - 1] = arguments[_i];
            }
            return componentConstructor(tag, options, css.apply(void 0, __spreadArray([initialStyles], interpolations, false)));
        };
        /**
         * Attrs allows for accomplishing two goals:
         *
         * 1. Backfilling props at runtime more expressively than defaultProps
         * 2. Amending the prop interface of a wrapped styled component
         */
        templateFunction.attrs = function (attrs) {
            return constructWithOptions(componentConstructor, tag, __assign(__assign({}, options), { attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean) }));
        };
        /**
         * If config methods are called, wrap up a new template function
         * and merge options.
         */
        templateFunction.withConfig = function (config) {
            return constructWithOptions(componentConstructor, tag, __assign(__assign({}, options), config));
        };
        return templateFunction;
    }

    var baseStyled = function (tag) {
        return constructWithOptions(createStyledComponent, tag);
    };
    var styled = baseStyled;
    // Shorthands for all valid HTML Elements
    domElements.forEach(function (domElement) {
        // @ts-expect-error some react typing bs
        styled[domElement] = baseStyled(domElement);
    });

    /**
     * eliminates the need to do styled.default since the other APIs
     * are directly assigned as properties to the main function
     * */
    for (var key in secondary) {
        // @ts-expect-error shush
        styled[key] = secondary[key];
    }

    return styled;

}));
//# sourceMappingURL=styled-components.js.map
