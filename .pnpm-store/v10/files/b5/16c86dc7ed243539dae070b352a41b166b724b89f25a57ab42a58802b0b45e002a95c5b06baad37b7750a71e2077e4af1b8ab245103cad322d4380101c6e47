'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var recast = require('recast');
var parser$2 = require('@babel/parser');
var LRUCache = require('lru-cache');
var hash = require('hash-sum');
var bt = require('@babel/types');
var esmResolveNative = require('esm-resolve');
var astTypes = require('ast-types');
var compilerSfc = require('@vue/compiler-sfc');
var pug = require('pug');
var compilerDom = require('@vue/compiler-dom');
var vueInbrowserCompilerIndependentUtils = require('vue-inbrowser-compiler-independent-utils');

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

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);
var bt__namespace = /*#__PURE__*/_interopNamespaceDefault(bt);
var pug__namespace = /*#__PURE__*/_interopNamespaceDefault(pug);

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

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
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

var tsMap = {};

Object.defineProperty(tsMap, "__esModule", { value: true });
var TsMap = (function () {
    // Accept an optional parameter,
    // The parameter's type:
    // [
    //   [K, V], [K, V], ...
    // ]
    function TsMap(intrator) {
        // Used to store keys.
        this.keyStore = [];
        // Used to store values.
        this.valueStore = [];
        // The Map's size,
        // increase at function set,
        // decrease at function remove,
        // clear at function clear.
        this.size = 0;
        if (intrator) {
            for (var _i = 0, intrator_1 = intrator; _i < intrator_1.length; _i++) {
                var item = intrator_1[_i];
                this.keyStore.push(item[0]);
                this.valueStore.push(item[1]);
                this.size++;
            }
        }
    }
    // set a key-value to Map,
    // return this to chain called.
    TsMap.prototype.set = function (k, v) {
        var existed = false;
        var ks = this.keyStore;
        var vs = this.valueStore;
        // if key is existed, replace it.
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                vs[i] = v;
                existed = true;
            }
        }
        if (!existed) {
            this.keyStore.push(k);
            this.valueStore.push(v);
            this.size++;
        }
        return this;
    };
    // Return the value of the corresponding key,
    // if dosn't has, return undefind.
    TsMap.prototype.get = function (k) {
        var ks = this.keyStore;
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                return this.valueStore[i];
            }
        }
        return undefined;
    };
    // Determine if a key is included.
    TsMap.prototype.has = function (k) {
        var ks = this.keyStore;
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                return true;
            }
        }
        return false;
    };
    // Delete all the corresponding keys and its value,
    // if detele success, return true.
    // else return false.
    TsMap.prototype.delete = function (k) {
        var ks = this.keyStore;
        var len = ks.length;
        var deleteFlag = false;
        while (len--) {
            if (ks[len] === k) {
                ks.splice(len, 1);
                this.size--;
                deleteFlag = true;
            }
        }
        return deleteFlag;
    };
    // Empty the Map.
    TsMap.prototype.clear = function () {
        this.keyStore.splice(0, this.size);
        this.valueStore.splice(0, this.size);
        this.size = 0;
    };
    // return all Map's key.
    TsMap.prototype.keys = function () {
        return this.keyStore;
    };
    // return all Map's value.
    TsMap.prototype.values = function () {
        return this.valueStore;
    };
    // return all Map's key-value.
    TsMap.prototype.entries = function () {
        var entries = [];
        var ks = this.keyStore;
        var vs = this.valueStore;
        for (var i = 0; i < this.size; i++) {
            entries.push([ks[i], vs[i]]);
        }
        return entries;
    };
    // Traversal the Map,
    // Accept two parameters, first is a callback, second is a optional context.
    // callback function accepts 3 optional params.
    // first is value, second is key, last is the map
    TsMap.prototype.forEach = function (cb, context) {
        var size = this.size;
        var ks = this.keyStore;
        var vs = this.valueStore;
        for (var i = 0; i < size; i++) {
            cb.bind(context || this)(vs[i], ks[i], this);
        }
    };
    return TsMap;
}());
var _default = tsMap.default = TsMap;

var Documentation = /** @class */ (function () {
    function Documentation(fullFilePath) {
        this.componentFullfilePath = fullFilePath;
        this.propsMap = new _default();
        this.eventsMap = new _default();
        this.slotsMap = new _default();
        this.methodsMap = new _default();
        this.exposedMap = new _default();
        this.sourceFiles = new Set([fullFilePath]);
        this.originExtendsMixin = {};
        this.dataMap = new _default();
    }
    Documentation.prototype.setOrigin = function (origin) {
        this.originExtendsMixin = origin.extends ? { extends: origin.extends } : {};
        this.originExtendsMixin = origin.mixin ? { mixin: origin.mixin } : {};
    };
    Documentation.prototype.setDocsBlocks = function (docsBlocks) {
        this.docsBlocks = docsBlocks;
    };
    Documentation.prototype.set = function (key, value) {
        this.dataMap.set(key, value);
    };
    Documentation.prototype.get = function (key) {
        return this.dataMap.get(key);
    };
    Documentation.prototype.getPropDescriptor = function (propName) {
        var vModelDescriptor = this.propsMap.get('v-model');
        return vModelDescriptor && vModelDescriptor.name === propName
            ? vModelDescriptor
            : this.getDescriptor(propName, this.propsMap, function () { return ({
                name: propName
            }); });
    };
    Documentation.prototype.getEventDescriptor = function (eventName) {
        return this.getDescriptor(eventName, this.eventsMap, function () { return ({
            name: eventName
        }); });
    };
    Documentation.prototype.getSlotDescriptor = function (slotName) {
        return this.getDescriptor(slotName, this.slotsMap, function () { return ({
            name: slotName
        }); });
    };
    Documentation.prototype.getMethodDescriptor = function (methodName) {
        return this.getDescriptor(methodName, this.methodsMap, function () { return ({
            name: methodName
        }); });
    };
    Documentation.prototype.getExposeDescriptor = function (exposedName) {
        return this.getDescriptor(exposedName, this.exposedMap, function () { return ({
            name: exposedName
        }); });
    };
    Documentation.prototype.toObject = function () {
        var props = this.getObjectFromDescriptor(this.propsMap);
        var methods = this.getObjectFromDescriptor(this.methodsMap);
        var events = this.getObjectFromDescriptor(this.eventsMap);
        var slots = this.getObjectFromDescriptor(this.slotsMap);
        var expose = this.getObjectFromDescriptor(this.exposedMap);
        var sourceFiles = __spreadArray([], __read(this.sourceFiles), false).sort();
        var obj = {};
        this.dataMap.forEach(function (value, key) {
            if (key) {
                obj[key] = value;
            }
        });
        if (this.docsBlocks) {
            obj.docsBlocks = this.docsBlocks;
        }
        return __assign(__assign({}, obj), { 
            // initialize non null params
            description: obj.description || '', tags: obj.tags || {}, 
            // set all the static properties
            exportName: obj.exportName, displayName: obj.displayName, expose: expose, props: props, events: events, methods: methods, slots: slots, sourceFiles: sourceFiles });
    };
    Documentation.prototype.getDescriptor = function (name, map, init) {
        var descriptor = map.get(name);
        if (!descriptor) {
            descriptor = init();
            descriptor = __assign(__assign({}, descriptor), this.originExtendsMixin);
            map.set(name, descriptor);
        }
        return descriptor;
    };
    Documentation.prototype.getObjectFromDescriptor = function (map) {
        if (map.size > 0) {
            var obj_1 = [];
            map.forEach(function (descriptor, name) {
                if (name && descriptor) {
                    obj_1.push(descriptor);
                }
            });
            return obj_1;
        }
        else {
            return undefined;
        }
    };
    return Documentation;
}());

var babelParserOptions = {
    sourceType: 'module',
    strictMode: false,
    tokens: true,
    plugins: [
        'decorators-legacy',
        'doExpressions',
        'objectRestSpread',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'functionBind',
        'functionSent',
        'dynamicImport',
        'numericSeparator',
        'optionalChaining',
        'importMeta',
        'bigInt',
        'optionalCatchBinding',
        'throwExpressions',
        'nullishCoalescingOperator',
        'importAssertions'
    ]
};
function buildParse(options) {
    if (options === void 0) { options = {}; }
    options = __assign(__assign(__assign({}, babelParserOptions), options), { plugins: __spreadArray(__spreadArray([], __read((babelParserOptions.plugins || [])), false), __read((options.plugins || [])), false) });
    return {
        parse: function (src) {
            return parser$2.parse(src, options);
        }
    };
}

var cache = new LRUCache({ max: 250 });
function cacher (creator) {
    var argsKey = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        argsKey[_i - 1] = arguments[_i];
    }
    var cacheKey = hash(argsKey.join(''));
    // source-map cache busting for hot-reloadded modules
    var output = cache.get(cacheKey);
    if (output) {
        return output;
    }
    output = creator();
    cache.set(cacheKey, output);
    return output;
}

/**
 * true if the left part of the expression of the NodePath is of form `exports.foo = ...;` or
 * `modules.exports = ...;`.
 */
function isExportedAssignment(path) {
    if (bt__namespace.isExpressionStatement(path.node)) {
        path = path.get('expression');
    }
    if (!bt__namespace.isAssignmentExpression(path.node)) {
        return false;
    }
    var pathLeft = path.get('left');
    var isSimpleExports = bt__namespace.isIdentifier(pathLeft.node) && pathLeft.node.name === 'exports';
    // check if we are looking at obj.member = value`
    var isModuleExports = false;
    if (!isSimpleExports && !bt__namespace.isMemberExpression(pathLeft.node)) {
        return false;
    }
    else if (bt__namespace.isMemberExpression(pathLeft.node)) {
        var leftObject = pathLeft.get('object');
        var leftProp = pathLeft.get('property');
        isModuleExports =
            !Array.isArray(leftProp) &&
                bt__namespace.isIdentifier(leftProp.node) &&
                bt__namespace.isIdentifier(leftObject.node) &&
                // if exports.xx =
                (leftObject.node.name === 'exports' ||
                    // if module.exports =
                    (leftObject.node.name === 'module' && leftProp.node.name === 'exports'));
    }
    return isSimpleExports || isModuleExports;
}

function resolveExportDeclaration(path) {
    var definitions = new _default();
    if (bt__namespace.isExportDefaultDeclaration(path.node)) {
        var defaultPath = path;
        definitions.set('default', defaultPath.get('declaration'));
    }
    else if (bt__namespace.isExportNamedDeclaration(path.node)) {
        var declaration = path.get('declaration');
        // export const example = {}
        if (declaration && bt__namespace.isVariableDeclaration(declaration.node)) {
            declaration.get('declarations').each(function (declarator) {
                var nodeId = declarator.node.id;
                if (bt__namespace.isIdentifier(nodeId)) {
                    definitions.set(nodeId.name, declarator);
                }
            });
        }
        else if (declaration && bt__namespace.isClassDeclaration(declaration.node)) {
            var nodeId = declaration.node.id;
            if (bt__namespace.isIdentifier(nodeId)) {
                definitions.set(nodeId.name, declaration);
            }
        }
        else {
            // const example = {}
            // export { example }
            getDefinitionsFromPathSpecifiers(path, definitions);
        }
    }
    else if (bt__namespace.isExportDeclaration(path.node)) {
        getDefinitionsFromPathSpecifiers(path, definitions);
    }
    return definitions;
}
function getDefinitionsFromPathSpecifiers(path, defs) {
    var specifiersPath = path.get('specifiers');
    specifiersPath.each(function (specifier) {
        if (bt__namespace.isIdentifier(specifier.node.exported)) {
            defs.set(specifier.node.exported.name, bt__namespace.isExportSpecifier(specifier.node) ? specifier.get('local') : specifier.get('exported'));
        }
    });
}

function ignore$2() {
    return false;
}
function resolveIdentifier(ast, path) {
    if (!bt__namespace.isIdentifier(path.node)) {
        return path;
    }
    var varName = path.node.name;
    var comp = null;
    recast.visit(ast.program, {
        // to look only at the root we ignore all traversing
        visitFunctionDeclaration: ignore$2,
        visitFunctionExpression: ignore$2,
        visitClassExpression: ignore$2,
        visitIfStatement: ignore$2,
        visitWithStatement: ignore$2,
        visitSwitchStatement: ignore$2,
        visitWhileStatement: ignore$2,
        visitDoWhileStatement: ignore$2,
        visitForStatement: ignore$2,
        visitForInStatement: ignore$2,
        visitVariableDeclaration: function (variablePath) {
            if (variablePath.node.type !== 'VariableDeclaration') {
                return false;
            }
            var firstDeclaration = variablePath.node.declarations[0];
            var varID = firstDeclaration.type === 'VariableDeclarator' ? firstDeclaration.id : firstDeclaration;
            if (!varID || varID.type !== 'Identifier' || varID.name !== varName) {
                return false;
            }
            comp = variablePath.get('declarations', 0).get('init');
            return false;
        },
        visitClassDeclaration: function (classPath) {
            var classID = classPath.node.id;
            if (!classID || classID.type !== 'Identifier' || classID.name !== varName) {
                return false;
            }
            comp = classPath;
            return false;
        }
    });
    return comp;
}

/**
 *
 * @param ast
 * @param varNameFilter
 */
function resolveRequired(ast, varNameFilter) {
    var varToFilePath = {};
    recast.visit(ast.program, {
        visitImportDeclaration: function (astPath) {
            var specifiers = astPath.get('specifiers');
            // if `import 'module'` without variable name cannot be a mixin
            specifiers.each(function (sp) {
                var nodeSpecifier = sp.node;
                if (bt__namespace.isImportDefaultSpecifier(nodeSpecifier) || bt__namespace.isImportSpecifier(nodeSpecifier)) {
                    var localVariableName = nodeSpecifier.local.name;
                    var exportName = bt__namespace.isImportDefaultSpecifier(nodeSpecifier)
                        ? 'default'
                        : bt__namespace.isIdentifier(nodeSpecifier.imported)
                            ? nodeSpecifier.imported.name
                            : 'default';
                    if (!varNameFilter || varNameFilter.indexOf(localVariableName) > -1) {
                        var nodeSource = astPath.get('source').node;
                        if (bt__namespace.isStringLiteral(nodeSource)) {
                            var filePath = [nodeSource.value];
                            varToFilePath[localVariableName] = {
                                filePath: filePath,
                                exportName: exportName
                            };
                        }
                    }
                }
            });
            return false;
        },
        visitVariableDeclaration: function (astPath) {
            // only look at variable declarations
            if (!bt__namespace.isVariableDeclaration(astPath.node)) {
                return false;
            }
            astPath.node.declarations.forEach(function (nodeDeclaration) {
                var sourceNode;
                var source = '';
                var _a = nodeDeclaration.init && bt__namespace.isMemberExpression(nodeDeclaration.init)
                    ? {
                        init: nodeDeclaration.init.object,
                        exportName: bt__namespace.isIdentifier(nodeDeclaration.init.property)
                            ? nodeDeclaration.init.property.name
                            : 'default'
                    }
                    : { init: nodeDeclaration.init, exportName: 'default' }, init = _a.init, exportName = _a.exportName;
                if (!init) {
                    return;
                }
                if (bt__namespace.isCallExpression(init)) {
                    if (!bt__namespace.isIdentifier(init.callee) || init.callee.name !== 'require') {
                        return;
                    }
                    sourceNode = init.arguments[0];
                    if (!bt__namespace.isStringLiteral(sourceNode)) {
                        return;
                    }
                    source = sourceNode.value;
                }
                else {
                    return;
                }
                if (bt__namespace.isIdentifier(nodeDeclaration.id)) {
                    var varName = nodeDeclaration.id.name;
                    varToFilePath[varName] = { filePath: [source], exportName: exportName };
                }
                else if (bt__namespace.isObjectPattern(nodeDeclaration.id)) {
                    nodeDeclaration.id.properties.forEach(function (p) {
                        if (bt__namespace.isIdentifier(p.key)) {
                            var varName = p.key.name;
                            varToFilePath[varName] = { filePath: [source], exportName: exportName };
                        }
                    });
                }
            });
            return false;
        }
    });
    return varToFilePath;
}

function ignore$1() {
    return false;
}
/**
 * List of all keys that could contain documentation
 */
var VUE_COMPONENTS_KEYS = ['data', 'props', 'methods', 'computed', 'emits'];
function isObjectExpressionComponentDefinition(node) {
    return (
    // export const test = {}
    node.properties.length === 0 ||
        // export const compo = {data(){ return {cpm:"Button"}}
        node.properties.some(function (p) {
            return (bt__namespace.isObjectMethod(p) || bt__namespace.isObjectProperty(p)) &&
                bt__namespace.isIdentifier(p.key) &&
                VUE_COMPONENTS_KEYS.includes(p.key.name);
        }));
}
function isComponentDefinition(path) {
    var node = path.node;
    return (
    // export default {} (always exported even when empty)
    bt__namespace.isObjectExpression(node) ||
        // export const myComp = {} (exported only when there is a componente definition or if empty)
        (bt__namespace.isVariableDeclarator(node) &&
            node.init &&
            bt__namespace.isObjectExpression(node.init) &&
            isObjectExpressionComponentDefinition(node.init)) ||
        // export default class MyComp extends VueComp
        bt__namespace.isClassDeclaration(node) ||
        // export default whatever.extend({})
        (bt__namespace.isCallExpression(node) && bt__namespace.isObjectExpression(node.arguments[0])) ||
        // export const myComp = whatever.extend({})
        (bt__namespace.isVariableDeclarator(node) &&
            node.init &&
            bt__namespace.isCallExpression(node.init) &&
            bt__namespace.isObjectExpression(node.init.arguments[0])) ||
        false);
}
function getReturnStatementObject(realDef) {
    var returnedObjectPath;
    recast.visit(realDef.get('body'), {
        visitReturnStatement: function (rPath) {
            var returnArg = rPath.get('argument');
            if (bt__namespace.isObjectExpression(returnArg.node)) {
                returnedObjectPath = returnArg;
            }
            return false;
        }
    });
    return returnedObjectPath;
}
function getReturnedObject(realDef) {
    var node = realDef.node;
    if (bt__namespace.isArrowFunctionExpression(node)) {
        if (bt__namespace.isObjectExpression(realDef.get('body').node)) {
            return realDef.get('body');
        }
        return getReturnStatementObject(realDef);
    }
    if (bt__namespace.isFunctionDeclaration(node) || bt__namespace.isFunctionExpression(node)) {
        return getReturnStatementObject(realDef);
    }
    return undefined;
}
/**
 * Given an AST, this function tries to find the exported component definitions.
 *
 * If a definition is part of the following statements, it is considered to be
 * exported:
 *
 * modules.exports = Definition;
 * exports.foo = Definition;
 * export default Definition;
 * export var Definition = ...;
 */
function resolveExportedComponent(ast) {
    var components = new _default();
    var ievPureExports = {};
    var nonComponentsIdentifiers = [];
    function setComponent(exportName, definition) {
        if (definition && !components.get(exportName)) {
            components.set(exportName, normalizeComponentPath(definition));
        }
    }
    // function run for every non "assignment" export declaration
    // in extenso export default or export myvar
    function exportDeclaration(path) {
        var _a;
        var definitions = resolveExportDeclaration(path);
        // if it is a pure export { compo } from "./compo" load the source here
        var sourcePath = (_a = path.get('source').value) === null || _a === void 0 ? void 0 : _a.value;
        definitions.forEach(function (definition, name) {
            if (sourcePath) {
                ievPureExports[name] = {
                    exportName: definition.value.name,
                    filePath: [sourcePath]
                };
            }
            else {
                // if we look at a TS "as" expression the variable is "contained"
                // in its expression member. In this case, resolve the expression member
                if (bt__namespace.isTSAsExpression(definition.node)) {
                    definition = definition.get('expression');
                }
                var realDef = resolveIdentifier(ast, definition);
                if (realDef) {
                    if (isComponentDefinition(realDef)) {
                        setComponent(name, realDef);
                    }
                    else {
                        var returnedObject = getReturnedObject(realDef);
                        if (returnedObject && isObjectExpressionComponentDefinition(returnedObject.node)) {
                            setComponent(name, returnedObject);
                        }
                    }
                }
                else {
                    nonComponentsIdentifiers.push(definition.value.name);
                }
            }
        });
        return false;
    }
    recast.visit(ast.program, {
        // for perf resons,
        // look only at the root,
        // ignore all traversing except for if
        visitFunctionDeclaration: ignore$1,
        visitFunctionExpression: ignore$1,
        visitClassDeclaration: ignore$1,
        visitClassExpression: ignore$1,
        visitWithStatement: ignore$1,
        visitSwitchStatement: ignore$1,
        visitWhileStatement: ignore$1,
        visitDoWhileStatement: ignore$1,
        visitForStatement: ignore$1,
        visitForInStatement: ignore$1,
        visitDeclareExportDeclaration: exportDeclaration,
        visitExportNamedDeclaration: exportDeclaration,
        visitExportDefaultDeclaration: exportDeclaration,
        visitAssignmentExpression: function (path) {
            // function run on every assignments (with an =)
            // Ignore anything that is not `exports.X = ...;` or
            // `module.exports = ...;`
            if (!isExportedAssignment(path)) {
                return false;
            }
            // Resolve the value of the right hand side. It should resolve to a call
            // expression, something like Vue.extend({})
            var pathRight = path.get('right');
            var pathLeft = path.get('left');
            var realComp = resolveIdentifier(ast, pathRight);
            var name = bt__namespace.isMemberExpression(pathLeft.node) &&
                bt__namespace.isIdentifier(pathLeft.node.property) &&
                pathLeft.node.property.name !== 'exports'
                ? pathLeft.node.property.name
                : 'default';
            if (realComp) {
                if (isComponentDefinition(realComp)) {
                    setComponent(name, realComp);
                }
                else {
                    var returnedObject = getReturnedObject(realComp);
                    if (returnedObject && isObjectExpressionComponentDefinition(returnedObject.node)) {
                        setComponent(name, returnedObject);
                    }
                }
            }
            else {
                nonComponentsIdentifiers.push(name);
            }
            return false;
        }
    });
    var requiredValues = Object.assign(ievPureExports, resolveRequired(ast, nonComponentsIdentifiers));
    return [components, requiredValues];
}
function normalizeComponentPath(path) {
    if (bt__namespace.isVariableDeclarator(path.node)) {
        path = path.get('init');
    }
    if (bt__namespace.isObjectExpression(path.node)) {
        return path;
    }
    else if (bt__namespace.isCallExpression(path.node)) {
        return path.get('arguments', 0);
    }
    return path;
}

function resolveImmediatelyExported (ast, variableFilter) {
    var variables = {};
    var importedVariablePaths = {};
    var exportAllFiles = [];
    // get imported variable names and filepath
    recast.visit(ast.program, {
        visitImportDeclaration: function (astPath) {
            if (!astPath.node.source) {
                return false;
            }
            var filePath = astPath.node.source.value;
            if (typeof filePath !== 'string') {
                return false;
            }
            var specifiers = astPath.get('specifiers');
            specifiers.each(function (s) {
                var varName = s.node.local.name;
                var exportName = bt__namespace.isImportSpecifier(s.node) && bt__namespace.isIdentifier(s.node.imported)
                    ? s.node.imported.name
                    : 'default';
                importedVariablePaths[varName] = { filePath: [filePath], exportName: exportName };
            });
            return false;
        }
    });
    recast.visit(ast.program, {
        visitExportNamedDeclaration: function (astPath) {
            var specifiers = astPath.get('specifiers');
            if (astPath.node.source) {
                var filePath_1 = astPath.node.source.value;
                if (typeof filePath_1 !== 'string') {
                    return false;
                }
                specifiers.each(function (s) {
                    if (bt__namespace.isIdentifier(s.node.exported)) {
                        var varName = s.node.exported.name;
                        var exportName = s.node.local ? s.node.local.name : varName;
                        if (variableFilter.indexOf(varName) > -1) {
                            variables[varName] = { filePath: [filePath_1], exportName: exportName };
                        }
                    }
                });
            }
            else {
                specifiers.each(function (s) {
                    if (bt__namespace.isIdentifier(s.node.exported)) {
                        var varName = s.node.exported.name;
                        var middleName = s.node.local.name;
                        var importedVar = importedVariablePaths[middleName];
                        if (importedVar && variableFilter.indexOf(varName) > -1) {
                            variables[varName] = importedVar;
                        }
                    }
                });
            }
            return false;
        },
        visitExportDefaultDeclaration: function (astPath) {
            if (variableFilter.indexOf('default') > -1) {
                var middleNameDeclaration = astPath.node.declaration;
                if (middleNameDeclaration.type === 'Identifier') {
                    var middleName = middleNameDeclaration.name;
                    var importedVar = importedVariablePaths[middleName];
                    if (importedVar) {
                        variables.default = importedVar;
                    }
                }
            }
            return false;
        },
        visitExportAllDeclaration: function (astPath) {
            var newFilePath = astPath.get('source').node.value;
            exportAllFiles.push(newFilePath);
            return false;
        }
    });
    if (exportAllFiles.length) {
        variableFilter
            .filter(function (v) { return !variables[v]; })
            .forEach(function (exportName) {
            variables[exportName] = { filePath: exportAllFiles, exportName: exportName };
        });
    }
    return { variables: variables, exportAll: exportAllFiles.length > 0 };
}

/**
 * Recursively resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
function recursiveResolveIEV(pathResolver, varToFilePath, validExtends) {
    return __awaiter(this, void 0, void 0, function () {
        var hashes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hashes = new Set();
                    _a.label = 1;
                case 1: 
                // in this case I need to resolve IEV in sequence in case they are defined multiple times
                // eslint-disable-next-line no-await-in-loop
                return [4 /*yield*/, resolveIEV(pathResolver, varToFilePath, validExtends)
                    // we iterate until there is no change in the set of variables or there is a loop
                ];
                case 2:
                    // in this case I need to resolve IEV in sequence in case they are defined multiple times
                    // eslint-disable-next-line no-await-in-loop
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (!hashes.has(hash(varToFilePath)) && hashes.add(hash(varToFilePath))) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * export * from "path/to/another/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
function resolveIEV(pathResolver, varToFilePath, validExtends) {
    return __awaiter(this, void 0, void 0, function () {
        var filePathToVars;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePathToVars = new _default();
                    Object.keys(varToFilePath).forEach(function (k) {
                        // the only way a variable can be exported by multiple files
                        // is if one of those files is exported as follows
                        // export * from 'path/to/file'
                        var exportedVariable = varToFilePath[k];
                        exportedVariable.filePath.forEach(function (filePath, i) {
                            var exportToLocalMap = filePathToVars.get(filePath) || new _default();
                            exportToLocalMap.set(k, exportedVariable.exportName);
                            filePathToVars.set(filePath, exportToLocalMap);
                        });
                    });
                    // then roll though this map and replace varToFilePath elements with their final destinations
                    // {
                    //	nameOfVariable: { filePath:['filesWhereToFindIt'], exportedName:'nameUsedInExportThatCanBeUsedForFiltering' }
                    // }
                    return [4 /*yield*/, Promise.all(filePathToVars.entries().map(function (_a) {
                            var _b = __read(_a, 2), filePath = _b[0], exportToLocal = _b[1];
                            return __awaiter(_this, void 0, void 0, function () {
                                var exportedVariableNames_1, fullFilePath_1, source_1, astRemote, returnedVariables_1;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            if (!(filePath && exportToLocal)) return [3 /*break*/, 4];
                                            exportedVariableNames_1 = [];
                                            exportToLocal.forEach(function (exportedName) {
                                                if (exportedName) {
                                                    exportedVariableNames_1.push(exportedName);
                                                }
                                            });
                                            _c.label = 1;
                                        case 1:
                                            _c.trys.push([1, 3, , 4]);
                                            fullFilePath_1 = pathResolver(filePath);
                                            if (!fullFilePath_1 || !validExtends(fullFilePath_1)) {
                                                // if the file is not in scope of the analysis, skip it
                                                // if no variable export corresponds to this local name, we delete it at the very end
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, fs.promises.readFile(fullFilePath_1, {
                                                    encoding: 'utf-8'
                                                })];
                                        case 2:
                                            source_1 = _c.sent();
                                            astRemote = cacher(function () { return recast.parse(source_1, { parser: buildParse() }); }, source_1);
                                            returnedVariables_1 = resolveImmediatelyExported(astRemote, exportedVariableNames_1).variables;
                                            if (Object.keys(returnedVariables_1).length) {
                                                exportToLocal.forEach(function (exported, local) {
                                                    var aliasedVariable = returnedVariables_1[exported];
                                                    if (aliasedVariable) {
                                                        aliasedVariable.filePath = aliasedVariable.filePath
                                                            .map(function (p) { return pathResolver(p, path__namespace.dirname(fullFilePath_1)); })
                                                            .filter(function (a) { return a; });
                                                        varToFilePath[local] = aliasedVariable;
                                                    }
                                                });
                                            }
                                            return [3 /*break*/, 4];
                                        case 3:
                                            _c.sent();
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            });
                        }))];
                case 1:
                    // then roll though this map and replace varToFilePath elements with their final destinations
                    // {
                    //	nameOfVariable: { filePath:['filesWhereToFindIt'], exportedName:'nameUsedInExportThatCanBeUsedForFiltering' }
                    // }
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}

function resolveAliases(filePath, aliases, refDirName) {
    var e_1, _a, e_2, _b;
    if (refDirName === void 0) { refDirName = ''; }
    var aliasKeys = Object.keys(aliases);
    var aliasResolved = null;
    if (!aliasKeys.length) {
        return filePath;
    }
    try {
        for (var aliasKeys_1 = __values(aliasKeys), aliasKeys_1_1 = aliasKeys_1.next(); !aliasKeys_1_1.done; aliasKeys_1_1 = aliasKeys_1.next()) {
            var aliasKey = aliasKeys_1_1.value;
            var aliasValueWithSlash = aliasKey + '/';
            var aliasMatch = filePath.substring(0, aliasValueWithSlash.length) === aliasValueWithSlash;
            var aliasValue = aliases[aliasKey];
            if (!aliasMatch) {
                continue;
            }
            if (!Array.isArray(aliasValue)) {
                aliasResolved = path__namespace.join(aliasValue, filePath.substring(aliasKey.length + 1));
                continue;
            }
            try {
                for (var aliasValue_1 = (e_2 = void 0, __values(aliasValue)), aliasValue_1_1 = aliasValue_1.next(); !aliasValue_1_1.done; aliasValue_1_1 = aliasValue_1.next()) {
                    var alias = aliasValue_1_1.value;
                    var absolutePath = path__namespace.resolve(refDirName, alias, filePath.substring(aliasKey.length + 1));
                    if (fs__namespace.existsSync(absolutePath)) {
                        aliasResolved = absolutePath;
                        break;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (aliasValue_1_1 && !aliasValue_1_1.done && (_b = aliasValue_1.return)) _b.call(aliasValue_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (aliasKeys_1_1 && !aliasKeys_1_1.done && (_a = aliasKeys_1.return)) _a.call(aliasKeys_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return aliasResolved === null ?
        filePath :
        aliasResolved;
}

var missingFilesCache = {};

// fix issues with babel bundles in cjs
var esmResolve = ('default' in esmResolveNative ? esmResolveNative.default : esmResolveNative);
var SUFFIXES = ['', '.js', '.ts', '.vue', '.jsx', '.tsx'];
function resolvePathFrom(path$1, from) {
    var e_1, _a;
    var _b;
    var finalPath = null;
    try {
        for (var SUFFIXES_1 = __values(SUFFIXES), SUFFIXES_1_1 = SUFFIXES_1.next(); !SUFFIXES_1_1.done; SUFFIXES_1_1 = SUFFIXES_1.next()) {
            var s = SUFFIXES_1_1.value;
            if (!finalPath) {
                try {
                    finalPath = require.resolve("".concat(path$1).concat(s), {
                        paths: from
                    });
                }
                catch (e) {
                    // eat the error
                }
            }
            if (!finalPath) {
                try {
                    finalPath = require.resolve(path.join(path$1, "index".concat(s)), {
                        paths: from
                    });
                }
                catch (e) {
                    // eat the error
                }
            }
            if (!finalPath) {
                for (var i = 0; i < from.length; i++) {
                    try {
                        finalPath = require.resolve(path.join(from[i], "".concat(path$1).concat(s)));
                        if (finalPath.length) {
                            break;
                        }
                    }
                    catch (e) {
                        // eat the error
                    }
                }
            }
            if (finalPath) {
                break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (SUFFIXES_1_1 && !SUFFIXES_1_1.done && (_a = SUFFIXES_1.return)) _a.call(SUFFIXES_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        var packagePath = require.resolve(path.join(path$1, 'package.json'), {
            paths: from
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        var pkg = require(packagePath);
        // if it is an es6 module use the module instead of commonjs
        finalPath = require.resolve(path.join(path$1, pkg.module || pkg.main));
    }
    catch (e) {
        // if the error is about the package.json not being found,
        // try to resolve the path naturally
        if (e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
            try {
                finalPath = (_b = esmResolve(from[0])(path$1)) !== null && _b !== void 0 ? _b : null;
            }
            catch (e) {
                // dismiss the error
            }
        }
        // else dismiss the error
    }
    if (!finalPath) {
        if (!missingFilesCache[path$1]) {
            // eslint-disable-next-line no-console
            console.warn("Neither '".concat(path$1, ".vue' nor '").concat(path$1, ".js(x)' or '").concat(path$1, "/index.js(x)' or '").concat(path$1, "/index.ts(x)' could be found in '").concat(from, "'"));
            missingFilesCache[path$1] = true;
        }
    }
    return finalPath;
}

function makePathResolver(refDirName, aliases, modules) {
    /**
     * Emulate the module import logic as much as necessary to resolve a module containing the
     * interface or type.
     *
     * @param base Path to the file that is importing the module
     * @param module Relative path to the module
     * @returns The absolute path to the file that contains the module to be imported
     */
    return function (filePath, originalDirNameOverride) {
        return resolvePathFrom(resolveAliases(filePath, aliases || {}, refDirName), __spreadArray([
            originalDirNameOverride || refDirName
        ], __read((modules || [])), false));
    };
}

/**
 * Document all components in varToFilePath in documentation
 * Instead of giving it only one component file, here we give it a whole set of variable -> file
 *
 * @param documentation if omitted (undefined), it will return all docs in an array
 * @param varToFilePath variable of object to document
 * @param originObject to build the origin flag
 * @param opt parsing options
 */
function documentRequiredComponents(parseFile, documentation, varToFilePath, originObject, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var originalDirName, pathResolver, files, _loop_1, _a, _b, varName, docsArray;
        var e_1, _c;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    originalDirName = path__namespace.dirname(opt.filePath);
                    pathResolver = makePathResolver(originalDirName, opt.alias, opt.modules);
                    // resolve where components are through immediately exported variables
                    return [4 /*yield*/, recursiveResolveIEV(pathResolver, varToFilePath, opt.validExtends)
                        // if we are in a mixin or an extend we want to add
                        // all props on the current doc, instead of creating another one
                    ];
                case 1:
                    // resolve where components are through immediately exported variables
                    _d.sent();
                    if (!(originObject && documentation)) return [3 /*break*/, 3];
                    return [4 /*yield*/, enrichDocumentation(parseFile, documentation, varToFilePath, originObject, opt, pathResolver)];
                case 2: return [2 /*return*/, [
                        _d.sent()
                    ]];
                case 3:
                    files = new _default();
                    _loop_1 = function (varName) {
                        var _e = varToFilePath[varName], filePath = _e.filePath, exportName = _e.exportName;
                        filePath.forEach(function (p) {
                            var fullFilePath = pathResolver(p);
                            if (fullFilePath && opt.validExtends(fullFilePath)) {
                                var vars = files.get(fullFilePath) || [];
                                vars.push({ exportName: exportName, varName: varName });
                                files.set(fullFilePath, vars);
                            }
                        });
                    };
                    try {
                        for (_a = __values(Object.keys(varToFilePath)), _b = _a.next(); !_b.done; _b = _a.next()) {
                            varName = _b.value;
                            _loop_1(varName);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [4 /*yield*/, Promise.all(files.keys().map(function (fullFilePath) { return __awaiter(_this, void 0, void 0, function () {
                            var vars, temporaryDocs;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        vars = files.get(fullFilePath) || [];
                                        return [4 /*yield*/, parseFile(__assign(__assign({}, opt), { filePath: fullFilePath, nameFilter: vars.map(function (v) { return v.exportName; }) }), documentation)
                                            // then assign each doc in one to the correct exported varname in the root file
                                        ];
                                    case 1:
                                        temporaryDocs = _a.sent();
                                        // then assign each doc in one to the correct exported varname in the root file
                                        temporaryDocs.forEach(function (d) {
                                            return d.set('exportName', (vars.find(function (v) { return v.exportName === d.get('exportName'); }) || {}).varName);
                                        });
                                        return [2 /*return*/, temporaryDocs];
                                }
                            });
                        }); }))
                        // flatten array of docs
                    ];
                case 4:
                    docsArray = _d.sent();
                    // flatten array of docs
                    return [2 /*return*/, docsArray.reduce(function (a, i) { return a.concat(i); }, [])];
            }
        });
    });
}
function enrichDocumentation(parseFile, documentation, varToFilePath, originObject, opt, pathResolver) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Object.keys(varToFilePath).reduce(function (_, varName) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, filePath, exportName;
                        var _this = this;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, _];
                                case 1:
                                    _b.sent();
                                    _a = varToFilePath[varName], filePath = _a.filePath, exportName = _a.exportName;
                                    // If there is more than one filepath for a variable, only one
                                    // will be valid. if not the parser of the browser will shout.
                                    // We therefore do not care in which order the filepath go as
                                    // long as we follow the variables order
                                    return [4 /*yield*/, Promise.all(filePath.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                                            var fullFilePath, originVar;
                                            var _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        fullFilePath = pathResolver(p);
                                                        if (!(fullFilePath && opt.validExtends(fullFilePath))) return [3 /*break*/, 4];
                                                        _b.label = 1;
                                                    case 1:
                                                        _b.trys.push([1, 3, , 4]);
                                                        originVar = (_a = {},
                                                            _a[originObject] = {
                                                                name: '-',
                                                                path: path__namespace.relative(path__namespace.dirname(documentation.componentFullfilePath), fullFilePath)
                                                            },
                                                            _a);
                                                        return [4 /*yield*/, parseFile(__assign(__assign(__assign({}, opt), { filePath: fullFilePath, nameFilter: [exportName] }), originVar), documentation)];
                                                    case 2:
                                                        _b.sent();
                                                        documentation.sourceFiles.add(fullFilePath);
                                                        if (documentation && originVar[originObject]) {
                                                            originVar[originObject].name =
                                                                documentation.get('displayName') || documentation.get('exportName');
                                                            documentation.set('displayName', null);
                                                        }
                                                        return [3 /*break*/, 4];
                                                    case 3:
                                                        _b.sent();
                                                        return [3 /*break*/, 4];
                                                    case 4: return [2 /*return*/];
                                                }
                                            });
                                        }); }))];
                                case 2:
                                    // If there is more than one filepath for a variable, only one
                                    // will be valid. if not the parser of the browser will shout.
                                    // We therefore do not care in which order the filepath go as
                                    // long as we follow the variables order
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, Promise.resolve())];
                case 1:
                    _a.sent();
                    return [2 /*return*/, documentation];
            }
        });
    });
}

function getArgFromDecorator(path) {
    var expForDecorator = path
        .filter(function (p) {
        var exp = p.get('expression');
        var decoratorIdenifier = bt__namespace.isCallExpression(exp.node) ? exp.node.callee : exp.node;
        return (bt__namespace.isIdentifier(decoratorIdenifier) ? decoratorIdenifier.name : null) === 'Component';
    }, null)[0]
        .get('expression');
    if (bt__namespace.isCallExpression(expForDecorator.node)) {
        return expForDecorator.get('arguments', 0);
    }
    return null;
}

function getProperties(path, id) {
    return path
        .get('properties')
        .filter(function (p) {
        return (bt__namespace.isObjectProperty(p.node) || bt__namespace.isObjectMethod(p.node)) &&
            bt__namespace.isIdentifier(p.node.key) &&
            p.node.key.name === id;
    });
}

/**
 * Extracts the name of the component from a class-style component
 * @param documentation
 * @param path
 */
function classDisplayNameHandler(documentation, path) {
    if (bt__namespace.isClassDeclaration(path.node)) {
        var config = getArgFromDecorator(path.get('decorators'));
        var displayName_1;
        if (config && bt__namespace.isObjectExpression(config.node)) {
            getProperties(config, 'name').forEach(function (p) {
                var valuePath = p.get('value');
                if (bt__namespace.isStringLiteral(valuePath.node)) {
                    displayName_1 = valuePath.node.value;
                }
            });
        }
        else {
            displayName_1 = path.node.id ? path.node.id.name : undefined;
        }
        if (displayName_1) {
            documentation.set('displayName', displayName_1);
        }
    }
    return Promise.resolve();
}

/**
 * Helper functions to work with docblock comments.
 */
/**
 * Extracts the text from a docblock comment
 * @param {rawDocblock} str
 * @return str stripped from stars and spaces
 */
function parseDocblock(str) {
    var lines = str.split('\n');
    for (var i = 0, l = lines.length; i < l; i++) {
        lines[i] = lines[i].replace(/^\s*\*\s?/, '').replace(/\r$/, '');
    }
    return lines.join('\n').trim();
}
var DOCBLOCK_HEADER = /^\*\s/;
/**
 * Given a path, this function returns the closest preceding docblock if it
 * exists.
 */
function getDocblock(path, _a) {
    var _b;
    var _c = _a === void 0 ? { commentIndex: 1 } : _a, _d = _c.commentIndex, commentIndex = _d === void 0 ? 1 : _d;
    commentIndex = commentIndex || 1;
    var comments = [];
    var allComments = (_b = path.value.leadingComments) !== null && _b !== void 0 ? _b : path.parentPath.value.leadingComments;
    if (allComments) {
        comments = allComments.filter(function (comment) {
            return comment.type === 'CommentBlock' && DOCBLOCK_HEADER.test(comment.value);
        });
    }
    if (comments.length + 1 - commentIndex > 0) {
        return parseDocblock(comments[comments.length - commentIndex].value);
    }
    return null;
}

/* eslint-disable no-cond-assign */
/**
 * matching nested constructs
 * thanks Steve Levithan
 * @see http://blog.stevenlevithan.com/archives/javascript-match-recursive-regexp
 * @param str
 * @param left
 * @param right
 * @param flags
 */
function matchRecursiveRegExp(str, left, right, flags) {
    if (flags === void 0) { flags = ''; }
    var f = flags;
    var g = f.indexOf('g') > -1;
    f = f.replace('g', '');
    var x = new RegExp("".concat(left, "|").concat(right), "g".concat(f));
    var l = new RegExp(left, f.replace(/g/g, ''));
    var a = [];
    var s = -1;
    var t;
    var m;
    do {
        t = 0;
        while ((m = x.exec(str))) {
            if (l.test(m[0])) {
                if (!t++) {
                    s = x.lastIndex;
                }
            }
            else if (t) {
                if (!--t) {
                    a.push(str.slice(s, m.index));
                    if (!g) {
                        return a;
                    }
                }
            }
        }
    } while (t && (x.lastIndex = s));
    return a;
}

function getParamInfo(content, hasName) {
    content = content || '';
    var typeSlice = matchRecursiveRegExp(content, '{', '}')[0] || '';
    var param = hasName || typeSlice.length ? { type: getTypeObjectFromTypeString(typeSlice) } : {};
    content = content.replace("{".concat(typeSlice, "}"), '');
    if (hasName) {
        var nameSliceArray = /^ *(\w[\w-]+)?/.exec(content);
        if (nameSliceArray) {
            param.name = nameSliceArray[1];
        }
        if (param.name) {
            content = content.replace(new RegExp("^ *".concat(param.name)), '');
        }
    }
    content = content.replace(/^ *-/, '');
    if (content.length) {
        param.description = content.trim();
    }
    return param;
}
function getTypeObjectFromTypeString(typeSlice) {
    if (typeSlice === '' || typeSlice === '*') {
        return { name: 'mixed' };
    }
    else if (/\w+\|\w+/.test(typeSlice)) {
        return {
            name: 'union',
            elements: typeSlice.split('|').map(function (type) { return getTypeObjectFromTypeString(type); })
        };
    }
    else {
        return {
            name: typeSlice
        };
    }
}
/**
 * This is used to ignore the name tag if it does not make sense
 */
var UNNAMED_TAG_TITLES = ['returns', 'throws', 'type'];
/**
 * For those arguments we will try and parse type of the content
 */
var TYPED_TAG_TITLES = [
    'param',
    'arg',
    'argument',
    'property',
    'type',
    'returns',
    'throws',
    'prop',
    'binding',
    'type'
];
/**
 * These tags don't have content and we push them as 'access'
 */
var ACCESS_TAG_TITLES = ['private', 'public'];
/**
 * If one of these tags is placed above content
 * the content is still taken as the description
 * they are usually placed at the top of the docblock
 */
var PREFIX_TAG_TITLES = ['slot', 'ignore'];
/**
 * Given a string, this functions returns an object with
 * two keys:
 * - `tags` an array of tags {title: tagname, content: }
 * - `description` whatever is left once the tags are removed
 */
function getDocblockTags(str) {
    var DOCLET_PATTERN = /^(?:\s+)?@(\w+) ?(.+)?/;
    var tags = [];
    var lines = str.split('\n').reverse();
    var accNonTagLines = '';
    lines.forEach(function (line) {
        var _a = __read(DOCLET_PATTERN.exec(line) || [], 3), title = _a[1], tagContents = _a[2];
        if (!title) {
            accNonTagLines = line + '\n' + accNonTagLines;
            return;
        }
        if (TYPED_TAG_TITLES.includes(title)) {
            tags.push(__assign({ title: title }, getParamInfo(tagContents, !UNNAMED_TAG_TITLES.includes(title))));
        }
        else if (ACCESS_TAG_TITLES.indexOf(title) > -1) {
            tags.push({ title: 'access', content: title });
            return;
        }
        else if (PREFIX_TAG_TITLES.indexOf(title) > -1) {
            tags.push({ title: title, content: tagContents !== null && tagContents !== void 0 ? tagContents : true });
            return;
        }
        else {
            var content = tagContents
                ? (tagContents + '\n' + accNonTagLines).trim()
                : accNonTagLines
                    ? accNonTagLines.trim()
                    : true;
            tags.push({ title: title, content: content });
        }
        accNonTagLines = '';
    });
    var description = accNonTagLines.trim().length ? accNonTagLines.trim() : undefined;
    return { description: description, tags: tags.reverse() };
}

function transformTagsIntoObject(tags) {
    return tags.reduce(function (acc, tag) {
        if (isContentTag(tag)) {
            var newTag = {
                description: tag.content,
                title: tag.title
            };
            tag = newTag;
        }
        var title = tag.title === 'param' ? 'params' : tag.title;
        if (acc[title]) {
            acc[title].push(tag);
        }
        else {
            acc[title] = [tag];
        }
        return acc;
    }, {});
}
function isContentTag(tag) {
    return tag.content !== undefined;
}

function getTypeFromAnnotation(typeNode) {
    if (typeNode) {
        if (bt__namespace.isTSTypeAnnotation(typeNode)) {
            return getTypeObjectFromTSType(typeNode.typeAnnotation);
        }
        else if (bt__namespace.isTypeAnnotation(typeNode)) {
            return getTypeObjectFromFlowType(typeNode.typeAnnotation);
        }
    }
    return undefined;
}
var TS_TYPE_NAME_MAP = {
    TSAnyKeyword: 'any',
    TSUnknownKeyword: 'unknown',
    TSNumberKeyword: 'number',
    TSObjectKeyword: 'object',
    TSBooleanKeyword: 'boolean',
    TSStringKeyword: 'string',
    TSSymbolKeyword: 'symbol',
    TSVoidKeyword: 'void',
    TSUndefinedKeyword: 'undefined',
    TSNullKeyword: 'null',
    TSNeverKeyword: 'never',
    TSArrayType: 'Array',
    TSUnionType: 'union',
    TSIntersectionType: 'intersection',
    TSTupleType: 'tuple'
};
function printType(t) {
    var _a;
    if (!t) {
        return { name: '' };
    }
    if (bt__namespace.isTSLiteralType(t) && !bt__namespace.isUnaryExpression(t.literal) && !bt__namespace.isTemplateLiteral(t.literal)) {
        return { name: JSON.stringify(t.literal.value) };
    }
    if (bt__namespace.isTSTypeLiteral(t)) {
        return {
            name: recast.print(t).code
        };
    }
    if (bt__namespace.isTSTypeReference(t) && bt__namespace.isIdentifier(t.typeName)) {
        var out = { name: t.typeName.name };
        if ((_a = t.typeParameters) === null || _a === void 0 ? void 0 : _a.params) {
            out.elements = t.typeParameters.params.map(getTypeObjectFromTSType);
        }
        return out;
    }
    if (TS_TYPE_NAME_MAP[t.type]) {
        return { name: TS_TYPE_NAME_MAP[t.type] };
    }
    return { name: t.type };
}
function getTypeObjectFromTSType(type) {
    if (bt__namespace.isTSUnionType(type) || bt__namespace.isTSIntersectionType(type)) {
        return { name: TS_TYPE_NAME_MAP[type.type], elements: type.types.map(getTypeObjectFromTSType) };
    }
    if (bt__namespace.isTSArrayType(type)) {
        return {
            name: TS_TYPE_NAME_MAP[type.type],
            elements: [getTypeObjectFromTSType(type.elementType)]
        };
    }
    if (bt__namespace.isTSTupleType(type)) {
        return {
            name: TS_TYPE_NAME_MAP[type.type],
            elements: type.elementTypes.map(getTypeObjectFromTSType)
        };
    }
    if (bt__namespace.isTSNamedTupleMember(type)) {
        return getTypeObjectFromTSType(type.elementType);
    }
    return printType(type);
}
var FLOW_TYPE_NAME_MAP = {
    AnyTypeAnnotation: 'any',
    UnknownTypeAnnotation: 'unknown',
    NumberTypeAnnotation: 'number',
    ObjectTypeAnnotation: 'object',
    BooleanTypeAnnotation: 'boolean',
    StringTypeAnnotation: 'string',
    SymbolTypeAnnotation: 'symbol',
    VoidTypeAnnotation: 'void',
    UndefinedTypeAnnotation: 'undefined',
    NullTypeAnnotation: 'null',
    NeverTypeAnnotation: 'never'
};
function getTypeObjectFromFlowType(type) {
    var name = FLOW_TYPE_NAME_MAP[type.type]
        ? FLOW_TYPE_NAME_MAP[type.type]
        : bt__namespace.isGenericTypeAnnotation(type) && bt__namespace.isIdentifier(type.id)
            ? type.id.name
            : type.type;
    return { name: name };
}
function decorateItem(item, propDescriptor) {
    var docBlock = getDocblock(item);
    var jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
    var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
    if (jsDoc.description) {
        propDescriptor.description = jsDoc.description;
    }
    if (jsDocTags.length) {
        propDescriptor.tags = transformTagsIntoObject(jsDocTags);
    }
}

/**
 * Extracts methods information from an object-style VueJs component
 * @param documentation
 * @param path
 */
function methodHandler(documentation, path) {
    var _a;
    if (bt__namespace.isObjectExpression(path.node)) {
        var exposePath = getProperties(path, 'expose');
        var exposeArray_1 = ((_a = exposePath[0]) === null || _a === void 0 ? void 0 : _a.get('value', 'elements').map(function (el) { return el.value.value; })) || [];
        var methodsPath = getProperties(path, 'methods');
        // if no method return
        if (!methodsPath.length) {
            return Promise.resolve();
        }
        var methodsObject = methodsPath[0].get('value');
        if (bt__namespace.isObjectExpression(methodsObject.node)) {
            methodsObject.get('properties').each(function (p) {
                var methodName = '<anonymous>';
                if (bt__namespace.isObjectProperty(p.node) && bt__namespace.isIdentifier(p.node.key)) {
                    var val = p.get('value');
                    methodName = p.node.key.name;
                    if (!Array.isArray(val)) {
                        p = val;
                    }
                }
                methodName =
                    bt__namespace.isObjectMethod(p.node) && bt__namespace.isIdentifier(p.node.key) ? p.node.key.name : methodName;
                var docBlock = getDocblock(bt__namespace.isObjectMethod(p.node) ? p : p.parentPath);
                var jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
                var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                // ignore the method if there is no public tag
                if (!jsDocTags.some(function (t) { return t.title === 'access' && t.content === 'public'; }) &&
                    !exposeArray_1.includes(methodName)) {
                    return;
                }
                var methodDescriptor = documentation.getMethodDescriptor(methodName);
                if (jsDoc.description) {
                    methodDescriptor.description = jsDoc.description;
                }
                setMethodDescriptor(methodDescriptor, p, jsDocTags);
            });
        }
    }
    return Promise.resolve();
}
function setMethodDescriptor(methodDescriptor, method, jsDocTags) {
    // params
    describeParams(method, methodDescriptor, jsDocTags.filter(function (tag) { return ['param', 'arg', 'argument'].indexOf(tag.title) >= 0; }));
    // returns
    describeReturns(method, methodDescriptor, jsDocTags.filter(function (t) { return t.title === 'returns'; }));
    // tags
    methodDescriptor.tags = transformTagsIntoObject(jsDocTags);
    return methodDescriptor;
}
function describeParams(methodPath, methodDescriptor, jsDocParamTags) {
    // if there is no parameter no need to parse them
    var fExp = methodPath.node;
    if (!fExp.params || !jsDocParamTags || (!fExp.params.length && !jsDocParamTags.length)) {
        return;
    }
    var params = [];
    fExp.params.forEach(function (par, i) {
        var name;
        if (bt__namespace.isIdentifier(par)) {
            // simple params
            name = par.name;
        }
        else if (bt__namespace.isIdentifier(par.left)) {
            // es6 default params
            name = par.left.name;
        }
        else {
            // unrecognized pattern
            return;
        }
        var jsDocTags = jsDocParamTags.filter(function (tag) { return tag.name === name; });
        var jsDocTag = jsDocTags.length ? jsDocTags[0] : undefined;
        // if tag is not namely described try finding it by its order
        if (!jsDocTag) {
            if (jsDocParamTags[i] && !jsDocParamTags[i].name) {
                jsDocTag = jsDocParamTags[i];
            }
        }
        var param = { name: name };
        if (jsDocTag) {
            if (jsDocTag.type) {
                param.type = jsDocTag.type;
            }
            if (jsDocTag.description) {
                param.description = jsDocTag.description;
            }
        }
        if (!param.type && par.typeAnnotation) {
            var type = getTypeFromAnnotation(par.typeAnnotation);
            if (type) {
                param.type = type;
            }
        }
        params.push(param);
    });
    // in case the arguments are abstracted (using the arguments keyword)
    if (!params.length) {
        jsDocParamTags.forEach(function (doc) {
            params.push(doc);
        });
    }
    if (params.length) {
        methodDescriptor.params = params;
    }
}
function describeReturns(methodPath, methodDescriptor, jsDocReturnTags) {
    if (jsDocReturnTags.length) {
        var ret = jsDocReturnTags[0];
        if (ret.name && ret.description) {
            ret.description = "".concat(ret.name, " ").concat(ret.description);
        }
        methodDescriptor.returns = ret;
    }
    if (!methodDescriptor.returns || !methodDescriptor.returns.type) {
        var methodNode = methodPath.node;
        if (methodNode.returnType) {
            var type = getTypeFromAnnotation(methodNode.returnType);
            if (type) {
                methodDescriptor.returns = methodDescriptor.returns || {};
                methodDescriptor.returns.type = type;
            }
        }
    }
}

/**
 * Extracts all information about methods in a class-style Component
 * @param documentation
 * @param path
 */
function classMethodHandler(documentation, path) {
    if (bt__namespace.isClassDeclaration(path.node)) {
        var methods = documentation.get('methods') || [];
        var allMethods = path
            .get('body')
            .get('body')
            .filter(function (a) { return bt__namespace.isClassMethod(a.node); });
        allMethods.forEach(function (methodPath) {
            var methodName = bt__namespace.isIdentifier(methodPath.node.key)
                ? methodPath.node.key.name
                : '<anonymous>';
            var docBlock = getDocblock(bt__namespace.isClassMethod(methodPath.node) ? methodPath : methodPath.parentPath);
            var jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
            var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
            // ignore the method if there is no public tag
            if (!jsDocTags.some(function (t) { return t.title === 'access' && t.content === 'public'; })) {
                return Promise.resolve();
            }
            var methodDescriptor = documentation.getMethodDescriptor(methodName);
            if (jsDoc.description) {
                methodDescriptor.description = jsDoc.description;
            }
            setMethodDescriptor(methodDescriptor, methodPath, jsDocTags);
            return true;
        });
        documentation.set('methods', methods);
    }
    return Promise.resolve();
}

function getMemberFilter(propName) {
    return function (p) {
        return bt__namespace.isIdentifier(p.node.key)
            ? p.node.key.name === propName
            : bt__namespace.isStringLiteral(p.node.key)
                ? p.node.key.value === propName
                : false;
    };
}

var parser$1 = buildParse({ plugins: ['typescript'] });
function getTemplateExpressionAST(expression) {
    try {
        // this allows for weird expressions like {[t]:val} to be parsed properly
        return parser$1.parse(/^\{/.test(expression.trim()) ? "(() => (".concat(expression, "))()") : expression);
    }
    catch (e) {
        throw Error("Could not parse template expression:\n" + //
            "".concat(expression, "\n") + //
            "Err: ".concat(e.message));
    }
}

var read$2 = util.promisify(fs.readFile);
function getPathOfExportedValue(pathResolver, exportName, filePath, options) {
    return __awaiter(this, void 0, void 0, function () {
        var plugins, filePathIndex, exportedPath, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    plugins = options.lang === 'ts' ? ['typescript'] : ['flow'];
                    if (options.jsx) {
                        plugins.push('jsx');
                    }
                    filePathIndex = filePath.length;
                    exportedPath = undefined;
                    _loop_1 = function () {
                        var currentFilePath, filePlugins, source, ast;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    currentFilePath = pathResolver(filePath[filePathIndex]);
                                    if (!currentFilePath) {
                                        return [2 /*return*/, { value: undefined }];
                                    }
                                    filePlugins = plugins;
                                    // Fixes SFCs written in JS having their imported modules being assumed to also be JS
                                    if (/.tsx?$/.test(currentFilePath)) {
                                        filePlugins = filePlugins.map(function (plugin) { return (plugin === 'flow' ? 'typescript' : plugin); });
                                    }
                                    return [4 /*yield*/, read$2(currentFilePath, {
                                            encoding: 'utf-8'
                                        })];
                                case 1:
                                    source = _b.sent();
                                    ast = cacher(function () { return recast.parse(source, { parser: buildParse({ plugins: filePlugins }) }); }, source);
                                    recast.visit(ast, {
                                        visitExportNamedDeclaration: function (p) {
                                            var masterDeclaration = p.node.declaration;
                                            if ((masterDeclaration === null || masterDeclaration === void 0 ? void 0 : masterDeclaration.type) === 'VariableDeclaration') {
                                                masterDeclaration.declarations.forEach(function (declaration, i) {
                                                    if (declaration.type === 'VariableDeclarator' &&
                                                        declaration.id.type === 'Identifier' &&
                                                        declaration.id.name === exportName) {
                                                        exportedPath = p.get('declaration', 'declarations', i, 'init');
                                                    }
                                                });
                                            }
                                            return false;
                                        },
                                        visitExportDefaultDeclaration: function (p) {
                                            if (exportName === 'default') {
                                                var masterDeclaration = p.node.declaration;
                                                if (masterDeclaration) {
                                                    exportedPath = p.get('declaration');
                                                }
                                            }
                                            return false;
                                        }
                                    });
                                    if (exportedPath) {
                                        return [2 /*return*/, { value: exportedPath }];
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!filePathIndex--) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, undefined];
            }
        });
    });
}

/**
 * Determines if node contains the value -1
 * @param node
 */
function isMinusOne(node) {
    return (bt__namespace.isUnaryExpression(node) &&
        node.operator === '-' &&
        bt__namespace.isNumericLiteral(node.argument) &&
        node.argument.value === 1);
}
function parseValidatorForValues(validatorNode, ast, options) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Resolves a variable value from its identifier (name)
         * @param identifierName
         */
        function resolveValueFromIdentifier(identifierName) {
            return __awaiter(this, void 0, void 0, function () {
                var varPath, varToFilePath, originalDirName, pathResolver, _a, exportName, filePath, p;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            astTypes.visit(ast, {
                                visitVariableDeclaration: function (p) {
                                    p.node.declarations.forEach(function (decl, i) {
                                        if (decl.type === 'VariableDeclarator' &&
                                            decl.id.type === 'Identifier' &&
                                            decl.id.name === identifierName) {
                                            varPath = p.get('declarations', i, 'init');
                                        }
                                    });
                                    return false;
                                }
                            });
                            if (varPath && bt__namespace.isArrayExpression(varPath.node)) {
                                return [2 /*return*/, varPath.node.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })];
                            }
                            varToFilePath = resolveRequired(ast, [identifierName]);
                            originalDirName = path__namespace.dirname(options.filePath);
                            pathResolver = makePathResolver(originalDirName, options.alias, options.modules);
                            // resolve where sources are through immediately exported variables
                            return [4 /*yield*/, recursiveResolveIEV(pathResolver, varToFilePath, options.validExtends)];
                        case 1:
                            // resolve where sources are through immediately exported variables
                            _b.sent();
                            if (!varToFilePath[identifierName]) return [3 /*break*/, 3];
                            _a = varToFilePath[identifierName], exportName = _a.exportName, filePath = _a.filePath;
                            return [4 /*yield*/, getPathOfExportedValue(pathResolver, exportName, filePath, options)];
                        case 2:
                            p = _b.sent();
                            if (p && bt__namespace.isArrayExpression(p.node)) {
                                return [2 /*return*/, p.node.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })];
                            }
                            _b.label = 3;
                        case 3: return [2 /*return*/, undefined];
                    }
                });
            });
        }
        function extractStringArray(valuesObjectNode) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!bt__namespace.isIdentifier(valuesObjectNode)) return [3 /*break*/, 2];
                            return [4 /*yield*/, resolveValueFromIdentifier(valuesObjectNode.name)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = bt__namespace.isArrayExpression(valuesObjectNode)
                                ? valuesObjectNode.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })
                                : undefined;
                            _b.label = 3;
                        case 3: return [2 /*return*/, _a];
                    }
                });
            });
        }
        var returnedExpression, varName, valuesNode, values, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    returnedExpression = (bt__namespace.isMethod(validatorNode) || bt__namespace.isFunctionExpression(validatorNode)) &&
                        validatorNode.body.body.length === 1 &&
                        bt__namespace.isReturnStatement(validatorNode.body.body[0])
                        ? validatorNode.body.body[0].argument
                        : bt__namespace.isArrowFunctionExpression(validatorNode)
                            ? validatorNode.body
                            : undefined;
                    varName = validatorNode.params && bt__namespace.isIdentifier(validatorNode.params[0])
                        ? validatorNode.params[0].name
                        : undefined;
                    if (!bt__namespace.isBinaryExpression(returnedExpression)) return [3 /*break*/, 4];
                    valuesNode = void 0;
                    switch (returnedExpression.operator) {
                        case '>':
                            if (isMinusOne(returnedExpression.right)) {
                                valuesNode = returnedExpression.left;
                            }
                            break;
                        case '<':
                            if (bt__namespace.isExpression(returnedExpression.left) && isMinusOne(returnedExpression.left)) {
                                valuesNode = returnedExpression.right;
                            }
                            break;
                        case '!==':
                        case '!=':
                            if (bt__namespace.isExpression(returnedExpression.left) && isMinusOne(returnedExpression.left)) {
                                valuesNode = returnedExpression.right;
                            }
                            else if (isMinusOne(returnedExpression.right)) {
                                valuesNode = returnedExpression.left;
                            }
                            break;
                        default:
                            return [2 /*return*/, undefined];
                    }
                    if (!(bt__namespace.isCallExpression(valuesNode) &&
                        bt__namespace.isIdentifier(valuesNode.arguments[0]) &&
                        varName === valuesNode.arguments[0].name &&
                        bt__namespace.isMemberExpression(valuesNode.callee) &&
                        bt__namespace.isIdentifier(valuesNode.callee.property) &&
                        valuesNode.callee.property.name === 'indexOf')) return [3 /*break*/, 2];
                    return [4 /*yield*/, extractStringArray(valuesNode.callee.object)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = undefined;
                    _b.label = 3;
                case 3:
                    values = _a;
                    return [2 /*return*/, values];
                case 4:
                    if (bt__namespace.isCallExpression(returnedExpression)) {
                        if (bt__namespace.isMemberExpression(returnedExpression.callee) &&
                            bt__namespace.isIdentifier(returnedExpression.callee.property) &&
                            returnedExpression.callee.property.name === 'includes') {
                            return [2 /*return*/, extractStringArray(returnedExpression.callee.object)];
                        }
                    }
                    _b.label = 5;
                case 5: return [2 /*return*/, undefined];
            }
        });
    });
}

function getRawValueParsedFromFunctionsBlockStatementNode(blockStatementNode) {
    var body = blockStatementNode.body;
    // if there is more than a return statement in the body,
    // we cannot resolve the new object, we let the function display as a function
    if (body.length !== 1 || !bt__namespace.isReturnStatement(body[0])) {
        return null;
    }
    var _a = __read(body, 1), ret = _a[0];
    return ret.argument ? recast.print(ret.argument).code : null;
}
/**
 * Extract props information form an object-style VueJs component
 * @param documentation
 * @param path
 */
function propHandler(documentation, path, ast, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var propsPath, modelPropertyName, propsValuePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt__namespace.isObjectExpression(path.node)) return [3 /*break*/, 2];
                    propsPath = path
                        .get('properties')
                        .filter(function (p) { return bt__namespace.isObjectProperty(p.node) && getMemberFilter('props')(p); });
                    // if no prop return
                    if (!propsPath.length) {
                        return [2 /*return*/, Promise.resolve()];
                    }
                    modelPropertyName = getModelPropName(path);
                    propsValuePath = propsPath[0].get('value');
                    return [4 /*yield*/, describePropsFromValue(documentation, propsValuePath, ast, opt, modelPropertyName)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
function describePropsFromValue(documentation, propsValuePath, ast, opt, modelPropertyName) {
    if (modelPropertyName === void 0) { modelPropertyName = null; }
    return __awaiter(this, void 0, void 0, function () {
        var objProp, objPropFiltered;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt__namespace.isObjectExpression(propsValuePath.node)) return [3 /*break*/, 2];
                    objProp = propsValuePath.get('properties');
                    objPropFiltered = objProp.filter(function (p) {
                        return bt__namespace.isProperty(p.node);
                    });
                    return [4 /*yield*/, Promise.all(objPropFiltered.map(function (prop) { return __awaiter(_this, void 0, void 0, function () {
                            var propNode, docBlock, jsDoc, jsDocTags, propertyName, isPropertyModel, propName, propDescriptor, propValuePath, propPropertiesPath, literalType, propValuePathExpression, finalPropValuePathExpression, propPropertiesPath;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        propNode = prop.node;
                                        docBlock = getDocblock(prop);
                                        jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
                                        jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                                        propertyName = bt__namespace.isIdentifier(propNode.key)
                                            ? propNode.key.name
                                            : bt__namespace.isStringLiteral(propNode.key)
                                                ? propNode.key.value
                                                : null;
                                        if (!propertyName) {
                                            return [2 /*return*/];
                                        }
                                        isPropertyModel = jsDocTags.some(function (t) { return t.title === 'model'; }) || propertyName === modelPropertyName;
                                        propName = isPropertyModel ? 'v-model' : propertyName;
                                        propDescriptor = documentation.getPropDescriptor(propName);
                                        propValuePath = prop.get('value');
                                        if (jsDoc.description) {
                                            propDescriptor.description = jsDoc.description;
                                        }
                                        if (jsDocTags.length) {
                                            propDescriptor.tags = transformTagsIntoObject(jsDocTags);
                                        }
                                        extractValuesFromTags(propDescriptor);
                                        if (!(bt__namespace.isArrayExpression(propValuePath.node) || bt__namespace.isIdentifier(propValuePath.node))) return [3 /*break*/, 1];
                                        // if it's an immediately typed property, resolve its type immediately
                                        propDescriptor.type = getTypeFromTypePath(propValuePath);
                                        return [3 /*break*/, 4];
                                    case 1:
                                        if (!bt__namespace.isObjectExpression(propValuePath.node)) return [3 /*break*/, 3];
                                        propPropertiesPath = propValuePath
                                            .get('properties')
                                            .filter(function (p) { return bt__namespace.isObjectProperty(p.node) || bt__namespace.isObjectMethod(p.node); });
                                        literalType = describeType(propPropertiesPath, propDescriptor);
                                        // required
                                        describeRequired(propPropertiesPath, propDescriptor);
                                        // default
                                        describeDefault(propPropertiesPath, propDescriptor, literalType || '');
                                        // validator => values
                                        return [4 /*yield*/, describeValues(propPropertiesPath, propDescriptor, ast, opt)];
                                    case 2:
                                        // validator => values
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        if (bt__namespace.isTSAsExpression(propValuePath.node)) {
                                            propValuePathExpression = propValuePath.get('expression');
                                            finalPropValuePathExpression = bt__namespace.isTSAsExpression(propValuePathExpression.node) &&
                                                bt__namespace.isTSUnknownKeyword(propValuePathExpression.get('typeAnnotation').node)
                                                ? propValuePathExpression.get('expression')
                                                : propValuePathExpression;
                                            if (bt__namespace.isObjectExpression(finalPropValuePathExpression.node)) {
                                                propPropertiesPath = finalPropValuePathExpression
                                                    .get('properties')
                                                    .filter(function (p) { return bt__namespace.isObjectProperty(p.node); });
                                                // type and values
                                                describeTypeAndValuesFromPath(propValuePath, propDescriptor);
                                                // required
                                                describeRequired(propPropertiesPath, propDescriptor);
                                                // default
                                                describeDefault(propPropertiesPath, propDescriptor, (propDescriptor.type && propDescriptor.type.name) || '');
                                            }
                                            else if (bt__namespace.isIdentifier(finalPropValuePathExpression.node)) {
                                                describeTypeAndValuesFromPath(propValuePath, propDescriptor);
                                            }
                                        }
                                        else {
                                            // in any other case, just display the code for the typing
                                            propDescriptor.type = {
                                                name: recast.print(prop.get('value')).code,
                                                func: true
                                            };
                                        }
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (bt__namespace.isArrayExpression(propsValuePath.node)) {
                        propsValuePath
                            .get('elements')
                            .filter(function (e) { return bt__namespace.isStringLiteral(e.node); })
                            .forEach(function (e) {
                            var propDescriptor = documentation.getPropDescriptor(e.node.value);
                            propDescriptor.type = { name: 'undefined' };
                        });
                    }
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Deal with the description of the type
 * @param propPropertiesPath
 * @param propDescriptor
 * @returns the unaltered type member of the prop object
 */
function describeType(propPropertiesPath, propDescriptor) {
    var typeArray = propPropertiesPath.filter(getMemberFilter('type'));
    if (propDescriptor.tags && propDescriptor.tags.type) {
        var _a = __read(propDescriptor.tags.type, 1), typeDesc = _a[0].type;
        if (typeDesc) {
            var typedAST = getTemplateExpressionAST("let a:".concat(typeDesc.name));
            var typeValues_1;
            recast.visit(typedAST.program, {
                visitVariableDeclaration: function (path) {
                    var typeAnnotation = path.get('declarations', 0, 'id', 'typeAnnotation').value.typeAnnotation;
                    if (bt__namespace.isTSUnionType(typeAnnotation) &&
                        typeAnnotation.types.every(function (t) { return bt__namespace.isTSLiteralType(t); })) {
                        typeValues_1 = typeAnnotation.types.map(function (t) {
                            return 'literal' in t
                                ? bt__namespace.isUnaryExpression(t.literal)
                                    ? t.literal.argument.toString()
                                    : bt__namespace.isTemplateLiteral(t.literal)
                                        ? t.literal.type
                                        : t.literal.value.toString()
                                : t.type.toString();
                        });
                    }
                    return false;
                }
            });
            if (typeValues_1) {
                propDescriptor.values = typeValues_1;
            }
            else {
                propDescriptor.type = typeDesc;
                if (typeArray.length) {
                    return getTypeFromTypePath(typeArray[0].get('value')).name;
                }
            }
        }
    }
    if (typeArray.length) {
        return describeTypeAndValuesFromPath(typeArray[0].get('value'), propDescriptor);
    }
    else {
        // deduce the type from default expression
        var defaultArray = propPropertiesPath.filter(getMemberFilter('default'));
        if (defaultArray.length) {
            var typeNode = defaultArray[0].node;
            if (bt__namespace.isObjectProperty(typeNode)) {
                var func = bt__namespace.isArrowFunctionExpression(typeNode.value) || bt__namespace.isFunctionExpression(typeNode.value);
                var typeValueNode = defaultArray[0].get('value').node;
                var typeName = typeof typeValueNode.value;
                propDescriptor.type = { name: func ? 'func' : typeName };
            }
        }
    }
    return undefined;
}
var VALID_VUE_TYPES = [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'date',
    'function',
    'symbol'
];
function resolveParenthesis(typeAnnotation) {
    var finalAnno = typeAnnotation;
    while (bt__namespace.isTSParenthesizedType(finalAnno)) {
        finalAnno = finalAnno.typeAnnotation;
    }
    return finalAnno;
}
function describeTypeAndValuesFromPath(propPropertiesPath, propDescriptor) {
    // values
    var values = getValuesFromTypePath(propPropertiesPath.node.typeAnnotation);
    // if it has an "as" annotation defining values
    if (values) {
        propDescriptor.values = values;
        propDescriptor.type = { name: 'string' };
    }
    else {
        // Get natural type from its identifier
        // (classic way)
        // type: Object
        propDescriptor.type = getTypeFromTypePath(propPropertiesPath);
    }
    return propDescriptor.type.name;
}
function getTypeFromTypePath(typePath) {
    var typeNode = typePath.node;
    var typeAnnotation = typeNode.typeAnnotation;
    var typeName = !typeNode
        ? 'any'
        : bt__namespace.isTSTypeReference(typeAnnotation) && typeAnnotation.typeParameters
            ? recast.print(resolveParenthesis(typeAnnotation.typeParameters.params[0])).code
            : bt__namespace.isArrayExpression(typeNode)
                ? typePath
                    .get('elements')
                    .map(function (t) { return getTypeFromTypePath(t).name; })
                    .join('|')
                : bt__namespace.isIdentifier(typeNode) && VALID_VUE_TYPES.indexOf(typeNode.name.toLowerCase()) > -1
                    ? typeNode.name.toLowerCase()
                    : bt__namespace.isObjectProperty(typeNode) &&
                        bt__namespace.isExpression(typeNode.value) &&
                        bt__namespace.isTSInstantiationExpression(typeNode.value)
                        ? recast.print(typeNode.value.expression).code +
                            (typeNode.value.typeParameters ? recast.print(typeNode.value.typeParameters).code : '')
                        : recast.print(typeNode).code;
    return {
        name: typeName === 'function' ? 'func' : typeName
    };
}
/**
 * When a prop is type annotated with the "as" keyword,
 * It means that its possible values can be extracted from it
 * this extracts the values from the as
 * @param typeAnnotation the as annotation
 */
function getValuesFromTypePath(typeAnnotation) {
    if (bt__namespace.isTSTypeReference(typeAnnotation) && typeAnnotation.typeParameters) {
        var type = resolveParenthesis(typeAnnotation.typeParameters.params[0]);
        return getValuesFromTypeAnnotation(type);
    }
    return undefined;
}
function getValuesFromTypeAnnotation(type) {
    if (bt__namespace.isTSUnionType(type) && type.types.every(function (t) { return bt__namespace.isTSLiteralType(t); })) {
        return type.types.map(function (t) {
            return bt__namespace.isTSLiteralType(t) && !bt__namespace.isUnaryExpression(t.literal)
                ? bt__namespace.isTemplateLiteral(t.literal)
                    ? t.literal.type
                    : t.literal.value.toString()
                : '';
        });
    }
    return undefined;
}
function describeRequired(propPropertiesPath, propDescriptor) {
    var requiredArray = propPropertiesPath.filter(getMemberFilter('required'));
    var requiredNode = requiredArray.length ? requiredArray[0].get('value').node : undefined;
    var required = requiredNode && bt__namespace.isBooleanLiteral(requiredNode) ? requiredNode.value : undefined;
    if (required !== undefined) {
        propDescriptor.required = required;
    }
}
function describeDefault(propPropertiesPath, propDescriptor, propType) {
    var _a;
    var defaultArray = propPropertiesPath.filter(getMemberFilter('default'));
    if (defaultArray.length) {
        /**
         * This means the default value is formatted like so: `default: any`
         */
        var defaultValueIsProp = bt__namespace.isObjectProperty(defaultArray[0].value);
        /**
         * This means the default value is formatted like so: `default () { return {} }`
         */
        var defaultValueIsObjectMethod = bt__namespace.isObjectMethod(defaultArray[0].value);
        // objects and arrays should try to extract the body from functions
        if (propType === 'object' || propType === 'array') {
            if (defaultValueIsProp) {
                /* TODO: add correct type info here ↓ */
                var defaultFunction = defaultArray[0].get('value');
                var isArrowFunction = bt__namespace.isArrowFunctionExpression(defaultFunction.node);
                var isOldSchoolFunction = bt__namespace.isFunctionExpression(defaultFunction.node);
                // if default is undefined or null, literals are allowed
                if (bt__namespace.isNullLiteral(defaultFunction.node) ||
                    (bt__namespace.isIdentifier(defaultFunction.node) && defaultFunction.node.name === 'undefined')) {
                    propDescriptor.defaultValue = {
                        func: false,
                        value: recast.print(defaultFunction.node).code
                    };
                    return;
                }
                // check if the prop value is a function
                if (!isArrowFunction && !isOldSchoolFunction) {
                    throw new Error('A default value needs to be a function when your type is an object or array');
                }
                // retrieve the function "body" from the arrow function
                if (isArrowFunction) {
                    var arrowFunctionBody = defaultFunction.get('body');
                    // arrow function looks like `() => { return {} }`
                    if (bt__namespace.isBlockStatement(arrowFunctionBody.node)) {
                        var rawValueParsed_1 = getRawValueParsedFromFunctionsBlockStatementNode(arrowFunctionBody.node);
                        if (rawValueParsed_1) {
                            propDescriptor.defaultValue = {
                                func: false,
                                value: rawValueParsed_1
                            };
                            return;
                        }
                    }
                    if (bt__namespace.isArrayExpression(arrowFunctionBody.node) ||
                        bt__namespace.isObjectExpression(arrowFunctionBody.node)) {
                        var rawCode = recast.print(arrowFunctionBody.node).code;
                        var value = ((_a = arrowFunctionBody.node.extra) === null || _a === void 0 ? void 0 : _a.parenthesized)
                            ? rawCode.slice(1, rawCode.length - 1)
                            : rawCode;
                        propDescriptor.defaultValue = {
                            func: false,
                            value: value
                        };
                        return;
                    }
                    // arrow function looks like `() => ({})`
                    propDescriptor.defaultValue = {
                        func: true,
                        value: recast.print(defaultFunction).code
                    };
                    return;
                }
            }
            // defaultValue was either an ObjectMethod or an oldSchoolFunction
            // in either case we need to retrieve the blockStatement and work with that
            /* todo: add correct type info here ↓ */
            var defaultBlockStatement = defaultValueIsObjectMethod
                ? defaultArray[0].get('body')
                : defaultArray[0].get('value').get('body');
            var defaultBlockStatementNode = defaultBlockStatement.node;
            var rawValueParsed = getRawValueParsedFromFunctionsBlockStatementNode(defaultBlockStatementNode);
            if (rawValueParsed) {
                propDescriptor.defaultValue = {
                    func: false,
                    value: rawValueParsed
                };
                return;
            }
        }
        // otherwise the rest should return whatever there is
        if (defaultValueIsProp) {
            // in this case, just return the rawValue
            var defaultPath = defaultArray[0].get('value');
            if (bt__namespace.isTSAsExpression(defaultPath.value)) {
                defaultPath = defaultPath.get('expression');
            }
            var rawValue = recast.print(defaultPath).code;
            propDescriptor.defaultValue = {
                func: bt__namespace.isFunction(defaultPath.node),
                value: rawValue
            };
            return;
        }
        if (defaultValueIsObjectMethod) {
            // in this case, just the function needs to be reconstructed a bit
            var defaultObjectMethod = defaultArray[0].get('value');
            var paramNodeArray = defaultObjectMethod.node.params;
            var params = paramNodeArray.map(function (p) { return p.name; }).join(', ');
            var defaultBlockStatement = defaultArray[0].get('body');
            var rawValue = recast.print(defaultBlockStatement).code;
            // the function should be reconstructed as "old-school" function, because they have the same handling of "this", whereas arrow functions do not.
            var rawValueParsed = "function(".concat(params, ") ").concat(rawValue.trim());
            propDescriptor.defaultValue = {
                func: true,
                value: rawValueParsed
            };
            return;
        }
        throw new Error('Your default value was formatted incorrectly');
    }
}
function describeValues(propPropertiesPath, propDescriptor, ast, options) {
    return __awaiter(this, void 0, void 0, function () {
        var validatorArray, validatorNode, values;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (propDescriptor.values) {
                        return [2 /*return*/];
                    }
                    validatorArray = propPropertiesPath.filter(getMemberFilter('validator'));
                    if (!validatorArray.length) return [3 /*break*/, 2];
                    validatorNode = validatorArray[0].get('value').node;
                    return [4 /*yield*/, parseValidatorForValues(validatorNode, ast, options)];
                case 1:
                    values = _a.sent();
                    if (values) {
                        propDescriptor.values = values;
                    }
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
function extractValuesFromTags(propDescriptor) {
    var _a;
    if (propDescriptor.tags && propDescriptor.tags.values) {
        var values = propDescriptor.tags.values.map(function (tag) {
            var description = tag.description;
            var choices = typeof description === 'string' ? description.split(',') : undefined;
            if (choices) {
                return choices.map(function (v) { return v.trim(); });
            }
            return [];
        });
        propDescriptor.values = (_a = []).concat.apply(_a, __spreadArray([], __read(values), false));
        delete propDescriptor.tags.values;
    }
}
/**
 * extract the property model.prop from the component object
 * @param path component NodePath
 * @returns name of the model prop, null if none
 */
function getModelPropName(path) {
    var modelPath = path
        .get('properties')
        .filter(function (p) { return bt__namespace.isObjectProperty(p.node) && getMemberFilter('model')(p); });
    if (!modelPath.length) {
        return null;
    }
    var modelValue = modelPath.length && modelPath[0].get('value');
    if (!bt__namespace.isObjectExpression(modelValue.node)) {
        return null;
    }
    var modelPropertyNamePath = modelValue
        .get('properties')
        .filter(function (p) { return bt__namespace.isObjectProperty(p.node) && getMemberFilter('prop')(p); });
    if (!modelPropertyNamePath.length) {
        return null;
    }
    var valuePath = modelPropertyNamePath[0].get('value');
    return bt__namespace.isStringLiteral(valuePath.node) ? valuePath.node.value : null;
}

/**
 * Extracts prop information from a class-style VueJs component
 * @param documentation
 * @param path
 */
function classPropHandler(documentation, path, ast, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var config;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt__namespace.isClassDeclaration(path.node)) return [3 /*break*/, 3];
                    config = getArgFromDecorator(path.get('decorators'));
                    if (!(config && bt__namespace.isObjectExpression(config.node))) return [3 /*break*/, 2];
                    return [4 /*yield*/, propHandler(documentation, config, ast, opt)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    path
                        .get('body')
                        .get('body')
                        .filter(function (p) { return bt__namespace.isClassProperty(p.node) && !!p.node.decorators; })
                        .forEach(function (propPath) {
                        var propDeco = (propPath.get('decorators') || []).filter(function (p) {
                            var exp = bt__namespace.isCallExpression(p.node.expression)
                                ? p.node.expression.callee
                                : p.node.expression;
                            return bt__namespace.isIdentifier(exp) && exp.name === 'Prop';
                        });
                        if (!propDeco.length) {
                            return undefined;
                        }
                        var propName = bt__namespace.isIdentifier(propPath.node.key) ? propPath.node.key.name : undefined;
                        if (!propName) {
                            return undefined;
                        }
                        var propDescriptor = documentation.getPropDescriptor(propName);
                        // description
                        var docBlock = getDocblock(propPath);
                        var jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
                        var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                        if (jsDocTags) {
                            propDescriptor.tags = transformTagsIntoObject(jsDocTags);
                        }
                        if (jsDoc.description) {
                            propDescriptor.description = jsDoc.description;
                        }
                        extractValuesFromTags(propDescriptor);
                        var litteralType;
                        if (propPath.node.typeAnnotation) {
                            var values = !!bt__namespace.isTSTypeAnnotation(propPath.node.typeAnnotation) &&
                                getValuesFromTypeAnnotation(propPath.node.typeAnnotation.typeAnnotation);
                            if (values) {
                                propDescriptor.values = values;
                                propDescriptor.type = { name: 'string' };
                                litteralType = 'string';
                            }
                            else {
                                // type
                                propDescriptor.type = getTypeFromAnnotation(propPath.node.typeAnnotation);
                            }
                        }
                        else if (propPath.node.value) {
                            propDescriptor.type = getTypeFromInitValue(propPath.node.value);
                        }
                        var propDecoratorPath = propDeco[0].get('expression');
                        if (bt__namespace.isCallExpression(propDecoratorPath.node)) {
                            var propDecoratorArg = propDecoratorPath.get('arguments', 0);
                            if (propDecoratorArg) {
                                if (bt__namespace.isObjectExpression(propDecoratorArg.node)) {
                                    var propsPath = propDecoratorArg
                                        .get('properties')
                                        .filter(function (p) {
                                        return bt__namespace.isObjectProperty(p.node);
                                    });
                                    // if there is no type annotation, get it from the decorators arguments
                                    if (!propPath.node.typeAnnotation) {
                                        litteralType = describeType(propsPath, propDescriptor);
                                    }
                                    describeDefault(propsPath, propDescriptor, litteralType || '');
                                    describeRequired(propsPath, propDescriptor);
                                    // this compares the node to its supposed args
                                    // if it finds no args it will return itself
                                }
                                else if (propDecoratorArg.node !== propDecoratorPath.node) {
                                    propDescriptor.type = getTypeFromTypePath(propDecoratorArg);
                                }
                            }
                        }
                        return undefined;
                    });
                    _a.label = 3;
                case 3: return [2 /*return*/, Promise.resolve()];
            }
        });
    });
}
function getTypeFromInitValue(node) {
    if (bt__namespace.isNumericLiteral(node)) {
        return { name: 'number' };
    }
    if (bt__namespace.isStringLiteral(node) || bt__namespace.isTemplateLiteral(node)) {
        return { name: 'string' };
    }
    if (bt__namespace.isBooleanLiteral(node)) {
        return { name: 'boolean' };
    }
    return undefined;
}

function getCommentBlockAndTags(p, _a) {
    var _b = _a === void 0 ? { commentIndex: 1 } : _a, commentIndex = _b.commentIndex;
    var docBlock = getDocblock(p, { commentIndex: commentIndex });
    return docBlock ? getDocblockTags(docBlock) : null;
}
/**
 * Extracts events information from a VueJs component
 * wether it's a class based component or an option based one
 *
 * @param documentation
 * @param path
 * @param astPath
 */
function eventHandler$1(documentation, path, astPath) {
    if (bt__namespace.isObjectExpression(path.node)) {
        eventHandlerMethods(documentation, path);
        eventHandlerEmits(documentation, path);
    }
    // browse the entirety of the code inside the component to look for this.$emit
    recast.visit(path.node, {
        visitCallExpression: function (pathExpression) {
            if (pathExpression.node.callee.type === 'MemberExpression' &&
                pathExpression.node.callee.object.type === 'ThisExpression' &&
                pathExpression.node.callee.property.type === 'Identifier' &&
                pathExpression.node.callee.property.name === '$emit') {
                var args = pathExpression.node.arguments;
                if (!args.length) {
                    return false;
                }
                // fetch the leading comments on the wrapping expression
                var docblock = getDocblock(pathExpression.parentPath);
                var doclets = getDocblockTags(docblock || '');
                var eventName = void 0;
                var eventTags = doclets.tags ? doclets.tags.filter(function (d) { return d.title === 'event'; }) : [];
                // if someone wants to document it with anything else, they can force it
                if (eventTags.length) {
                    eventName = eventTags[0].content;
                }
                else {
                    var firstArg = pathExpression.get('arguments', 0);
                    if (bt__namespace.isIdentifier(firstArg.node)) {
                        firstArg = resolveIdentifier(astPath, firstArg);
                    }
                    if (!firstArg || !bt__namespace.isStringLiteral(firstArg.node)) {
                        return false;
                    }
                    eventName = firstArg.node.value;
                }
                // if this event is documented somewhere else leave it alone
                var evtDescriptor = documentation.getEventDescriptor(eventName);
                setEventDescriptor(evtDescriptor, doclets);
                if (args.length > 1 && !evtDescriptor.type) {
                    evtDescriptor.type = {
                        names: ['undefined']
                    };
                }
                if (args.length > 2 && !evtDescriptor.properties) {
                    evtDescriptor.properties = [];
                }
                if (evtDescriptor.properties && evtDescriptor.properties.length < args.length - 2) {
                    var i = args.length - 2 - evtDescriptor.properties.length;
                    while (i--) {
                        evtDescriptor.properties.push({
                            type: { names: ['undefined'] },
                            name: "<anonymous".concat(args.length - i - 2, ">")
                        });
                    }
                }
                return false;
            }
            this.traverse(pathExpression);
            return undefined;
        }
    });
    return Promise.resolve();
}
/**
 * Extracts events information from an
 * object-style VueJs component `emits` option
 *
 * @param documentation
 * @param path
 */
function eventHandlerEmits(documentation, path) {
    var emitsPath = path
        .get('properties')
        .filter(function (p) { return bt__namespace.isObjectProperty(p.node) && getMemberFilter('emits')(p); });
    // if no emits member return
    if (!emitsPath.length) {
        return;
    }
    var emitsObject = emitsPath[0].get('value');
    if (bt__namespace.isArrayExpression(emitsObject.node)) {
        emitsObject.get('elements').value.forEach(function (event, i) {
            if (bt__namespace.isStringLiteral(event)) {
                var eventDescriptor = documentation.getEventDescriptor(event.value);
                var eventPath = emitsObject.get('elements', i);
                var docblock = getDocblock(eventPath);
                var doclets = getDocblockTags(docblock || '');
                setEventDescriptor(eventDescriptor, doclets);
            }
        });
    }
    else if (bt__namespace.isObjectExpression(emitsObject.node)) {
        emitsObject.get('properties').value.forEach(function (event, i) {
            var eventName = bt__namespace.isStringLiteral(event.key)
                ? event.key.value
                : bt__namespace.isIdentifier(event.key)
                    ? event.key.name
                    : undefined;
            if (eventName) {
                var eventDescriptor = documentation.getEventDescriptor(eventName);
                var eventPath = emitsObject.get('properties', i);
                var docblock = getDocblock(eventPath);
                var doclets = getDocblockTags(docblock || '');
                setEventDescriptor(eventDescriptor, doclets);
            }
        });
    }
}
/**
 * Extracts events information from an
 * object-style VueJs component `methods` option
 *
 * @param documentation
 * @param path
 */
function eventHandlerMethods(documentation, path) {
    var methodsPath = path
        .get('properties')
        .filter(function (p) { return bt__namespace.isObjectProperty(p.node) && getMemberFilter('methods')(p); });
    // if no method return
    if (!methodsPath.length) {
        return;
    }
    var methodsObject = methodsPath[0].get('value');
    if (bt__namespace.isObjectExpression(methodsObject.node)) {
        methodsObject.get('properties').each(function (p) {
            var commentedMethod = bt__namespace.isObjectMethod(p.node) ? p : p.parentPath;
            var jsDocTags = (getCommentBlockAndTags(commentedMethod) || {}).tags;
            if (!jsDocTags) {
                return;
            }
            var firesTags = jsDocTags.filter(function (tag) { return tag.title === 'fires'; });
            firesTags.forEach(function (tag) {
                var eventName = tag.content;
                var eventDescriptor = documentation.getEventDescriptor(eventName);
                var currentBlock;
                var foundEventDescriptor;
                var commentIndex = 1;
                do {
                    currentBlock = getCommentBlockAndTags(commentedMethod, { commentIndex: ++commentIndex });
                    if (currentBlock &&
                        currentBlock.tags &&
                        currentBlock.tags.some(function (tag) { return tag.title === 'event' && tag.content === eventName; })) {
                        foundEventDescriptor = currentBlock;
                    }
                } while (currentBlock && !foundEventDescriptor);
                if (foundEventDescriptor) {
                    setEventDescriptor(eventDescriptor, foundEventDescriptor);
                }
            });
        });
    }
}
/**
 * Accepted tags for conveying event properties
 */
var PROPERTY_TAGS = ['property', 'arg', 'arguments', 'param'];
function setEventDescriptor(eventDescriptor, jsDoc) {
    if (jsDoc.description && jsDoc.description.length) {
        eventDescriptor.description = jsDoc.description;
    }
    var nonNullTags = jsDoc.tags ? jsDoc.tags : [];
    var typeTags = nonNullTags.filter(function (tg) { return tg.title === 'type'; });
    eventDescriptor.type = typeTags.length
        ? { names: typeTags.map(function (t) { return t.type.name; }) }
        : eventDescriptor.type;
    var propertyTags = nonNullTags.filter(function (tg) { return PROPERTY_TAGS.includes(tg.title); });
    if (propertyTags.length) {
        eventDescriptor.properties = propertyTags.map(function (tg) {
            return { type: { names: [tg.type.name] }, name: tg.name, description: tg.description };
        });
    }
    // remove the property an type tags from the tag array
    var tags = nonNullTags.filter(function (tg) { return tg.title !== 'type' && tg.title !== 'property' && tg.title !== 'event'; });
    if (tags.length) {
        eventDescriptor.tags = tags;
    }
    else {
        delete eventDescriptor.tags;
    }
    return eventDescriptor;
}

/**
 * Extracts all events from a class-style component code
 * @param documentation
 * @param path
 * @param astPath
 */
function classEventHandler(documentation, path, astPath) {
    if (bt__namespace.isClassDeclaration(path.node)) {
        recast.visit(path.node, {
            visitClassMethod: function (nodePath) {
                if (nodePath.node.decorators &&
                    nodePath.node.decorators[0].expression.type === 'CallExpression' &&
                    nodePath.node.decorators[0].expression.callee.type === 'Identifier' &&
                    nodePath.node.decorators[0].expression.callee.name === 'Emit') {
                    // fetch the leading comments on the wrapping expression
                    var docblock = getDocblock(nodePath);
                    var doclets = getDocblockTags(docblock || '');
                    var eventName = void 0;
                    var eventTags = doclets.tags ? doclets.tags.filter(function (d) { return d.title === 'event'; }) : [];
                    var exp = nodePath.get('decorators', 0).get('expression');
                    // if someone wants to document it with anything else, they can force it
                    if (eventTags.length) {
                        eventName = eventTags[0].content;
                    }
                    else if (exp.get('arguments').value.length) {
                        var firstArg = exp.get('arguments', 0);
                        if (bt__namespace.isIdentifier(firstArg.node)) {
                            firstArg = resolveIdentifier(astPath, firstArg);
                        }
                        if (!bt__namespace.isStringLiteral(firstArg.node)) {
                            return false;
                        }
                        eventName = firstArg.node.value;
                    }
                    else if (nodePath.node.key.type === 'Identifier') {
                        eventName = nodePath.node.key.name;
                    }
                    else {
                        return false;
                    }
                    var evtDescriptor = documentation.getEventDescriptor(eventName);
                    setEventDescriptor(evtDescriptor, doclets);
                    return false;
                }
                this.traverse(nodePath);
            }
        });
    }
    return Promise.resolve();
}

/**
 * Reads the data from a JSDoc block of a component
 * and adds it to the documentation object
 * @param componentCommentedPath the AST path of the component
 * @param documentation the documentation object to modify
 * @returns
 */
function handleComponentJSDoc(componentCommentedPath, documentation) {
    var docBlock = getDocblock(componentCommentedPath);
    // if no prop return
    if (!docBlock || !docBlock.length) {
        return Promise.resolve();
    }
    var jsDoc = getDocblockTags(docBlock);
    documentation.set('description', jsDoc.description);
    if (jsDoc.tags) {
        var displayNamesTags = jsDoc.tags.filter(function (t) { return t.title === 'displayName'; });
        if (displayNamesTags.length) {
            var displayName = displayNamesTags[0];
            documentation.set('displayName', displayName.content);
        }
        var tagsAsObject = transformTagsIntoObject(jsDoc.tags.filter(function (t) { return t.title !== 'example' && t.title !== 'displayName'; }) || []);
        var examples = jsDoc.tags.filter(function (t) { return t.title === 'example'; });
        if (examples.length) {
            tagsAsObject.examples = examples;
        }
        documentation.set('tags', tagsAsObject);
    }
    else {
        documentation.set('tags', {});
    }
    return Promise.resolve();
}

/**
 * Extracts prop information from an object-style VueJs component
 * @param documentation
 * @param path
 */
function componentHandler(documentation, path) {
    // deal with functional flag
    if (bt__namespace.isObjectExpression(path.node)) {
        var functionalPath = getProperties(path, 'functional');
        if (functionalPath.length) {
            var functionalValue = functionalPath[0].get('value').node;
            if (bt__namespace.isBooleanLiteral(functionalValue)) {
                documentation.set('functional', functionalValue.value);
            }
        }
    }
    var componentCommentedPath = path.parentPath;
    // in case of Vue.extend() structure
    if (bt__namespace.isCallExpression(componentCommentedPath.node)) {
        // look for leading comments in the parent structures
        var i = 5;
        while (i-- &&
            !componentCommentedPath.get('leadingComments').value &&
            componentCommentedPath.parentPath.node.type !== 'Program') {
            componentCommentedPath = componentCommentedPath.parentPath;
        }
    }
    else if (bt__namespace.isVariableDeclarator(componentCommentedPath.node)) {
        componentCommentedPath = componentCommentedPath.parentPath.parentPath;
        if (componentCommentedPath.parentPath.node.type !== 'Program') {
            componentCommentedPath = componentCommentedPath.parentPath;
        }
    }
    else if (bt__namespace.isDeclaration(componentCommentedPath.node)) {
        var classDeclaration = componentCommentedPath.get('declaration');
        if (bt__namespace.isClassDeclaration(classDeclaration.node)) {
            componentCommentedPath = classDeclaration;
        }
    }
    // always return a promise to trigger next handler in chain
    return handleComponentJSDoc(componentCommentedPath, documentation);
}

/**
 * Extracts component name from an object-style VueJs component
 * @param documentation
 * @param path
 */
function displayNameHandler(documentation, compDef) {
    if (bt__namespace.isObjectExpression(compDef.node)) {
        var namePath = getProperties(compDef, 'name');
        // if no prop return
        if (!namePath.length) {
            return Promise.resolve();
        }
        var nameValuePath = namePath[0].get('value');
        var singleNameValuePath = !Array.isArray(nameValuePath) ? nameValuePath : null;
        var displayName = null;
        if (singleNameValuePath) {
            if (bt__namespace.isStringLiteral(singleNameValuePath.node)) {
                displayName = singleNameValuePath.node.value;
            }
            else if (bt__namespace.isIdentifier(singleNameValuePath.node)) {
                var nameConstId = singleNameValuePath.node.name;
                var program = compDef.parentPath.parentPath;
                if (program.name === 'body') {
                    displayName = getDeclaredConstantValue(program, nameConstId);
                }
            }
        }
        documentation.set('displayName', displayName);
    }
    return Promise.resolve();
}
function getDeclaredConstantValue(prog, nameConstId) {
    var body = prog.node.body;
    var globalVariableDeclarations = body.filter(function (node) {
        return bt__namespace.isVariableDeclaration(node);
    });
    var globalVariableExports = body
        .filter(function (node) {
        return bt__namespace.isExportNamedDeclaration(node) && bt__namespace.isVariableDeclaration(node.declaration);
    })
        .map(function (node) { return node.declaration; });
    var declarations = globalVariableDeclarations
        .concat(globalVariableExports)
        .reduce(function (a, declPath) { return a.concat(declPath.declarations); }, []);
    var nodeDeclaratorArray = declarations.filter(function (d) { return bt__namespace.isIdentifier(d.id) && d.id.name === nameConstId; });
    var nodeDeclarator = nodeDeclaratorArray.length ? nodeDeclaratorArray[0] : undefined;
    return nodeDeclarator && nodeDeclarator.init && bt__namespace.isStringLiteral(nodeDeclarator.init)
        ? nodeDeclarator.init.value
        : null;
}

function ignore() {
    return false;
}
function resolveLocal(ast, variableNames) {
    var variablesMap = new _default();
    recast.visit(ast, {
        // for perf resons,
        // look only at the root,
        // ignore all traversing except for if
        visitFunctionDeclaration: ignore,
        visitFunctionExpression: ignore,
        visitClassDeclaration: ignore,
        visitClassExpression: ignore,
        visitWithStatement: ignore,
        visitSwitchStatement: ignore,
        visitWhileStatement: ignore,
        visitDoWhileStatement: ignore,
        visitForStatement: ignore,
        visitForInStatement: ignore,
        visitVariableDeclaration: function (pathVariable) {
            pathVariable.get('declarations').each(function (declaration) {
                if (bt__namespace.isVariableDeclarator(declaration.node) && bt__namespace.isIdentifier(declaration.node.id)) {
                    var varName = declaration.node.id.name;
                    if (variableNames.includes(varName) && declaration.get('init', 'callee', 'name').value !== 'require') {
                        variablesMap.set(varName, declaration.get('init'));
                    }
                }
            });
            return false;
        }
    });
    return variablesMap;
}

/**
 * Returns documentation of the component referenced in the extends property of the component
 */
var extendsHandler = function (documentation, componentDefinition, astPath, opt, deps) { return __awaiter(void 0, void 0, void 0, function () {
    var extendsVariableName, variablesResolvedToCurrentFile, extendsFilePath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                extendsVariableName = getExtendsVariableName(componentDefinition);
                // if there is no extends or extends is a direct require
                if (!extendsVariableName) {
                    return [2 /*return*/];
                }
                variablesResolvedToCurrentFile = resolveLocal(astPath, [extendsVariableName]);
                if (!variablesResolvedToCurrentFile.get(extendsVariableName)) return [3 /*break*/, 2];
                return [4 /*yield*/, deps.addDefaultAndExecuteHandlers(variablesResolvedToCurrentFile, astPath, __assign(__assign({}, opt), { nameFilter: [extendsVariableName] }), deps, documentation)];
            case 1:
                _a.sent();
                return [3 /*break*/, 4];
            case 2:
                extendsFilePath = resolveRequired(astPath, [extendsVariableName]);
                // get each doc for each mixin using parse
                return [4 /*yield*/, documentRequiredComponents(deps.parseFile, documentation, extendsFilePath, 'extends', opt)];
            case 3:
                // get each doc for each mixin using parse
                _a.sent();
                _a.label = 4;
            case 4: return [2 /*return*/];
        }
    });
}); };
function getExtendsVariableName(compDef) {
    var extendsVariable = compDef &&
        bt__namespace.isClassDeclaration(compDef.node) &&
        compDef.node.superClass &&
        bt__namespace.isIdentifier(compDef.node.superClass)
        ? compDef.get('superClass')
        : getExtendsVariableNameFromCompDef(compDef);
    if (extendsVariable) {
        var extendsValue = bt__namespace.isProperty(extendsVariable.node)
            ? extendsVariable.node.value
            : extendsVariable.node;
        return extendsValue && bt__namespace.isIdentifier(extendsValue) ? extendsValue.name : undefined;
    }
    return undefined;
}
function getExtendsVariableNameFromCompDef(compDef) {
    if (!compDef) {
        return undefined;
    }
    var compDefProperties = compDef.get('properties');
    var pathExtends = compDefProperties.value
        ? compDefProperties.filter(function (p) { return bt__namespace.isIdentifier(p.node.key) && p.node.key.name === 'extends'; })
        : [];
    return pathExtends.length ? pathExtends[0] : undefined;
}

/**
 * Look in the mixin section of a component.
 * Parse the file mixins point to.
 * Add the necessary info to the current doc object.
 * Must be run first as mixins do not override components.
 */
var mixinHandler = function (documentation, componentDefinition, astPath, opt, deps) { return __awaiter(void 0, void 0, void 0, function () {
    var mixinVariableNames, variablesResolvedToCurrentFile, mixinVarToFilePath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                mixinVariableNames = getMixinsVariableNames(componentDefinition);
                if (!mixinVariableNames || !mixinVariableNames.length) {
                    return [2 /*return*/];
                }
                variablesResolvedToCurrentFile = resolveLocal(astPath, mixinVariableNames);
                mixinVarToFilePath = resolveRequired(astPath, mixinVariableNames);
                return [4 /*yield*/, mixinVariableNames.reduce(function (_, varName) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, _];
                                case 1:
                                    _a.sent();
                                    if (!variablesResolvedToCurrentFile.get(varName)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, deps.addDefaultAndExecuteHandlers(variablesResolvedToCurrentFile, astPath, __assign(__assign({}, opt), { nameFilter: [varName] }), deps, documentation)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 5];
                                case 3: 
                                // get each doc for each mixin using parse
                                return [4 /*yield*/, documentRequiredComponents(deps.parseFile, documentation, mixinVarToFilePath, 'mixin', __assign(__assign({}, opt), { nameFilter: [varName] }))];
                                case 4:
                                    // get each doc for each mixin using parse
                                    _a.sent();
                                    _a.label = 5;
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); }, Promise.resolve())];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
function getMixinsVariableNames(compDef) {
    var varNames = [];
    if (bt__namespace.isObjectExpression(compDef.node)) {
        var mixinProp = getProperties(compDef, 'mixins');
        var mixinPath = mixinProp.length ? mixinProp[0] : undefined;
        if (mixinPath) {
            var mixinPropertyValue = mixinPath.node.value && bt__namespace.isArrayExpression(mixinPath.node.value)
                ? mixinPath.node.value.elements
                : [];
            mixinPropertyValue.forEach(function (e) {
                if (!e) {
                    return;
                }
                if (bt__namespace.isCallExpression(e)) {
                    e = e.callee;
                }
                if (bt__namespace.isIdentifier(e)) {
                    varNames.push(e.name);
                }
            });
        }
    }
    else if (bt__namespace.isClassDeclaration(compDef.node) &&
        compDef.node.superClass &&
        bt__namespace.isCallExpression(compDef.node.superClass) &&
        bt__namespace.isIdentifier(compDef.node.superClass.callee) &&
        compDef.node.superClass.callee.name.toLowerCase() === 'mixins') {
        return compDef.node.superClass.arguments.reduce(function (acc, a) {
            if (bt__namespace.isIdentifier(a)) {
                acc.push(a.name);
            }
            return acc;
        }, []);
    }
    return varNames;
}

/**
 * Extract slots information form the render function of an object-style VueJs component
 * @param documentation
 * @param path
 */
function slotHandler$3(documentation, path) {
    if (bt__namespace.isObjectExpression(path.node)) {
        var renderPath = getProperties(path, 'render');
        // if no prop return
        if (!renderPath.length) {
            return Promise.resolve();
        }
        var renderValuePath = bt__namespace.isObjectProperty(renderPath[0].node)
            ? renderPath[0].get('value')
            : renderPath[0];
        recast.visit(renderValuePath.node, {
            // this.$slots.default()
            visitCallExpression: function (pathCall) {
                if (pathCall.node.callee.type === 'MemberExpression' &&
                    pathCall.node.callee.object.type === 'MemberExpression' &&
                    pathCall.node.callee.object.object.type === 'ThisExpression' &&
                    pathCall.node.callee.property.type === 'Identifier' &&
                    pathCall.node.callee.object.property.type === 'Identifier' &&
                    (pathCall.node.callee.object.property.name === '$slots' ||
                        pathCall.node.callee.object.property.name === '$scopedSlots')) {
                    var doc = documentation.getSlotDescriptor(pathCall.node.callee.property.name);
                    var comment = getSlotComment(pathCall, doc);
                    var bindings = pathCall.node.arguments[0];
                    if ((bindings === null || bindings === void 0 ? void 0 : bindings.type) === 'ObjectExpression' && bindings.properties.length) {
                        doc.bindings = getBindings(bindings, comment ? comment.bindings : undefined);
                    }
                    return false;
                }
                this.traverse(pathCall);
                return undefined;
            },
            // this.$slots.mySlot
            visitMemberExpression: function (pathMember) {
                if (pathMember.node.object.type === 'MemberExpression' &&
                    pathMember.node.object.object.type === 'ThisExpression' &&
                    pathMember.node.object.property.type === 'Identifier' &&
                    (pathMember.node.object.property.name === '$slots' ||
                        pathMember.node.object.property.name === '$scopedSlots') &&
                    pathMember.node.property.type === 'Identifier') {
                    var doc = documentation.getSlotDescriptor(pathMember.node.property.name);
                    getSlotComment(pathMember, doc);
                    return false;
                }
                this.traverse(pathMember);
                return undefined;
            },
            visitJSXElement: function (pathJSX) {
                var tagName = pathJSX.node.openingElement.name;
                var nodeJSX = pathJSX.node;
                if (tagName.type === 'JSXIdentifier' && tagName.name === 'slot') {
                    var doc = documentation.getSlotDescriptor(getName(nodeJSX));
                    var parentNode = pathJSX.parentPath.node;
                    var comment_1;
                    if (bt__namespace.isJSXElement(parentNode)) {
                        comment_1 = getJSXDescription(nodeJSX, parentNode.children, doc);
                    }
                    var bindings = nodeJSX.openingElement.attributes;
                    if (bindings && bindings.length) {
                        doc.bindings = bindings.map(function (b) {
                            return getBindingsFromJSX(b, comment_1 ? comment_1.bindings : undefined);
                        });
                    }
                    return false;
                }
                this.traverse(pathJSX);
                return undefined;
            }
        });
    }
    return Promise.resolve();
}
function isStatement(path) {
    return (path &&
        (bt__namespace.isDeclaration(path.node) || bt__namespace.isReturnStatement(path.node) || bt__namespace.isIfStatement(path.node)));
}
function getName(nodeJSX) {
    var oe = nodeJSX.openingElement;
    var names = oe.attributes.filter(function (a) { return bt__namespace.isJSXAttribute(a) && a.name.name === 'name'; });
    var nameNode = names.length ? names[0].value : null;
    return nameNode && bt__namespace.isStringLiteral(nameNode) ? nameNode.value : 'default';
}
function getJSXDescription(nodeJSX, siblings, descriptor) {
    var indexInParent = siblings.indexOf(nodeJSX);
    var commentExpression = null;
    for (var i = indexInParent - 1; i > -1; i--) {
        var currentNode = siblings[i];
        if (bt__namespace.isJSXExpressionContainer(currentNode)) {
            commentExpression = currentNode;
            break;
        }
    }
    if (!commentExpression || !commentExpression.expression.innerComments) {
        return undefined;
    }
    var cmts = commentExpression.expression.innerComments;
    var lastComment = cmts[cmts.length - 1];
    return parseCommentNode(lastComment, descriptor);
}
function getSlotComment(path, descriptor) {
    var desc = getExpressionDescription(path, descriptor);
    if (desc) {
        return desc;
    }
    // in case we don't find a description on the expression,
    // look for it on the containing statement
    // 1: find the statement
    var i = 10;
    while (i-- && path && !isStatement(path)) {
        path = path.parentPath;
    }
    // 2: extract the description if it exists
    return path ? getExpressionDescription(path, descriptor) : undefined;
}
function getExpressionDescription(path, descriptor) {
    var node = path.node;
    if (!node || !node.leadingComments || node.leadingComments.length === 0) {
        return undefined;
    }
    return parseCommentNode(node.leadingComments[node.leadingComments.length - 1], descriptor);
}
function parseCommentNode(node, descriptor) {
    if (node.type !== 'CommentBlock') {
        return undefined;
    }
    return parseSlotDocBlock(node.value, descriptor);
}
function parseSlotDocBlock(str, descriptor) {
    var _a;
    var docBlock = parseDocblock(str).trim();
    var jsDoc = getDocblockTags(docBlock);
    if (!((_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.length)) {
        return undefined;
    }
    var slotTags = jsDoc.tags.filter(function (t) { return t.title === 'slot'; });
    if (slotTags.length) {
        var tagContent = slotTags[0].content;
        var description = typeof tagContent === 'string' ? tagContent : undefined;
        if (description && (!descriptor.description || !descriptor.description.length)) {
            descriptor.description = description;
            var fixedNameMatch = description.match(/^(\S+) - (.*)$/);
            if (fixedNameMatch) {
                descriptor.name = fixedNameMatch[1];
                descriptor.description = fixedNameMatch[2];
            }
        }
        var tags = jsDoc.tags.filter(function (t) { return t.title !== 'slot' && t.title !== 'binding'; });
        if (tags.length) {
            descriptor.tags = transformTagsIntoObject(tags);
        }
        return {
            bindings: jsDoc.tags.filter(function (t) { return t.title === 'binding'; })
        };
    }
    return undefined;
}
function getBindings(node, bindingsFromComments) {
    return node.properties.reduce(function (bindings, prop) {
        if (bt__namespace.isIdentifier(prop.key)) {
            var name_1 = prop.key.name;
            var description = prop.leadingComments && prop.leadingComments.length
                ? parseDocblock(prop.leadingComments[prop.leadingComments.length - 1].value)
                : undefined;
            if (!description) {
                var descbinding = bindingsFromComments
                    ? bindingsFromComments.filter(function (b) { return b.name === name_1; })[0]
                    : undefined;
                if (descbinding) {
                    bindings.push(descbinding);
                    return bindings;
                }
            }
            else {
                bindings.push({
                    title: 'binding',
                    name: name_1,
                    description: description
                });
            }
        }
        return bindings;
    }, []);
}
function getBindingsFromJSX(attr, bindings) {
    var name = attr.name.name;
    var descbinding = bindings ? bindings.filter(function (b) { return b.name === name; })[0] : undefined;
    if (descbinding) {
        return descbinding;
    }
    return {
        title: 'binding',
        name: name
    };
}

/**
 * Extract slots information form the render function of an object-style VueJs component
 * @param documentation
 * @param path
 */
function slotHandler$2(documentation, path) {
    var _a;
    if (bt__namespace.isObjectExpression(path.node)) {
        var functionalPath = getProperties(path, 'functional');
        // if no prop return
        if (!functionalPath.length || !functionalPath[0].get('value')) {
            return Promise.resolve();
        }
        var renderPath = getProperties(path, 'render');
        if (!renderPath || !renderPath.length) {
            return Promise.resolve();
        }
        var renderValuePath = bt__namespace.isObjectProperty(renderPath[0].node)
            ? renderPath[0].get('value')
            : renderPath[0];
        var contextVariable = renderValuePath.get('params', 1);
        if (contextVariable.value) {
            if (bt__namespace.isIdentifier(contextVariable.value)) {
                var contextVariableName_1 = contextVariable.value.name;
                recast.visit(renderValuePath.node, {
                    // context.children
                    visitMemberExpression: function (pathMember) {
                        if (pathMember.node.object.type === 'Identifier' &&
                            pathMember.node.object.name === contextVariableName_1 &&
                            pathMember.node.property.type === 'Identifier' &&
                            pathMember.node.property.name === 'children') {
                            var doc = documentation.getSlotDescriptor('default');
                            getSlotComment(pathMember, doc);
                            return false;
                        }
                        this.traverse(pathMember);
                        return undefined;
                    }
                });
            }
            else {
                var childrenVarValueName_1 = (_a = contextVariable
                    .get('properties')
                    .value.filter(function (a) { return bt__namespace.isIdentifier(a.key) && a.key.name === 'children'; })[0]) === null || _a === void 0 ? void 0 : _a.value.name;
                recast.visit(renderValuePath.node, {
                    // destructured children
                    visitIdentifier: function (pathMember) {
                        if (pathMember.node.name === childrenVarValueName_1) {
                            var doc = documentation.getSlotDescriptor('default');
                            getSlotComment(pathMember, doc);
                            return false;
                        }
                        this.traverse(pathMember);
                        return undefined;
                    }
                });
            }
        }
    }
    return Promise.resolve();
}

/**
 * Extract slots information from the render or setup function of an object-style VueJs component
 * @param documentation
 * @param path
 */
function slotHandler$1(documentation, path) {
    if (bt__namespace.isObjectExpression(path.node)) {
        var renderPath = getProperties(path, 'render');
        var setupPath = getProperties(path, 'setup');
        if (!renderPath.length && !setupPath.length) {
            return Promise.resolve();
        }
        var functionPath = renderPath.length ? renderPath : setupPath;
        var i = 0;
        var docBlock = getDocblock(functionPath[0], { commentIndex: i });
        while (docBlock) {
            // if no doc block return
            if (!docBlock || !docBlock.length) {
                return Promise.resolve();
            }
            var jsDoc = getDocblockTags(docBlock);
            if (jsDoc.tags) {
                var slotTag = jsDoc.tags.find(function (a) { return a.title === 'slot'; });
                if (slotTag) {
                    var name_1 = typeof slotTag.content === 'string' ? slotTag.content : 'default';
                    var slotDescriptor = documentation.getSlotDescriptor(name_1);
                    slotDescriptor.description = jsDoc.description;
                    var bindingsTag = jsDoc.tags.filter(function (t) { return t.title === 'binding'; });
                    if (bindingsTag) {
                        slotDescriptor.bindings = bindingsTag;
                    }
                }
            }
            docBlock = getDocblock(functionPath[0], { commentIndex: ++i });
        }
    }
    return Promise.resolve();
}

var defaultHandlers = [
    displayNameHandler,
    componentHandler,
    methodHandler,
    propHandler,
    eventHandler$1,
    slotHandler$3,
    slotHandler$2,
    slotHandler$1,
    classDisplayNameHandler,
    classMethodHandler,
    classPropHandler,
    classEventHandler
];
var preHandlers = [
    // have to be first if they can be overridden
    extendsHandler,
    // have to be second as they can be overridden too
    mixinHandler
];

var index$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    classDisplayNameHandler: classDisplayNameHandler,
    classEventHandler: classEventHandler,
    classMethodHandler: classMethodHandler,
    classPropHandler: classPropHandler,
    componentHandler: componentHandler,
    default: defaultHandlers,
    displayNameHandler: displayNameHandler,
    eventHandler: eventHandler$1,
    extendsHandler: extendsHandler,
    methodHandler: methodHandler,
    mixinsHandler: mixinHandler,
    preHandlers: preHandlers,
    propHandler: propHandler,
    slotHandler: slotHandler$3,
    slotHandlerFunctional: slotHandler$2,
    slotHandlerLitteral: slotHandler$1
});

var addDefaultAndExecuteHandlers = function (componentDefinitions, ast, options, deps, documentation, forceSingleExport) {
    if (forceSingleExport === void 0) { forceSingleExport = false; }
    var handlers = __spreadArray(__spreadArray([], __read((options.scriptHandlers || defaultHandlers)), false), __read((options.addScriptHandlers || [])), false);
    return executeHandlers(options.scriptPreHandlers || preHandlers, handlers, componentDefinitions, ast, options, forceSingleExport, deps, documentation);
};
function executeHandlers(preHandlers, localHandlers, componentDefinitions, ast, opt, forceSingleExport, deps, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var compDefs, docs;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    compDefs = componentDefinitions
                        .keys()
                        .filter(function (name) { return name && (!opt.nameFilter || opt.nameFilter.indexOf(name) > -1); });
                    if (forceSingleExport && compDefs.length > 1) {
                        throw Error('vue-docgen-api: multiple exports in a component file are not handled by docgen.parse, Please use "docgen.parseMulti" instead');
                    }
                    return [4 /*yield*/, Promise.all(compDefs.map(function (name) { return __awaiter(_this, void 0, void 0, function () {
                            var doc, compDef;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        doc = (compDefs.length > 1 && name !== 'default' ? undefined : documentation) ||
                                            new Documentation(opt.filePath);
                                        compDef = componentDefinitions.get(name);
                                        // execute all prehandlers in order
                                        return [4 /*yield*/, preHandlers.reduce(function (_, handler) { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, _];
                                                        case 1:
                                                            _a.sent();
                                                            if (!(typeof handler === 'function')) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, handler(doc, compDef, ast, opt, { parseFile: deps.parseFile, addDefaultAndExecuteHandlers: addDefaultAndExecuteHandlers })];
                                                        case 2: return [2 /*return*/, _a.sent()];
                                                        case 3: return [2 /*return*/];
                                                    }
                                                });
                                            }); }, Promise.resolve())];
                                    case 1:
                                        // execute all prehandlers in order
                                        _a.sent();
                                        return [4 /*yield*/, Promise.all(localHandlers.map(function (handler) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, handler(doc, compDef, ast, opt, { parseFile: deps.parseFile, addDefaultAndExecuteHandlers: addDefaultAndExecuteHandlers })];
                                                    case 1: return [2 /*return*/, _a.sent()];
                                                }
                                            }); }); }))
                                            // end with setting of exportname
                                            // to avoid dependencies names bleeding on the main components,
                                            // do this step at the end of the function
                                        ];
                                    case 2:
                                        _a.sent();
                                        // end with setting of exportname
                                        // to avoid dependencies names bleeding on the main components,
                                        // do this step at the end of the function
                                        doc.set('exportName', name);
                                        return [2 /*return*/, doc];
                                }
                            });
                        }); }))
                        // default component first so in multiple exports in parse it is returned
                    ];
                case 1:
                    docs = _a.sent();
                    // default component first so in multiple exports in parse it is returned
                    return [2 /*return*/, docs.sort(function (a, b) {
                            return a.get('exportName') === 'default' ? -1 : b.get('exportName') === 'default' ? 1 : 0;
                        })];
            }
        });
    });
}

var ERROR_MISSING_DEFINITION = 'No suitable component definition found';
function parseScript(parseFile, source, options, documentation, forceSingleExport, noNeedForExport) {
    if (forceSingleExport === void 0) { forceSingleExport = false; }
    if (noNeedForExport === void 0) { noNeedForExport = false; }
    return __awaiter(this, void 0, void 0, function () {
        var plugins, ast, _a, componentDefinitions, ievSet, docs;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    plugins = options.lang === 'ts' ? ['typescript'] : ['flow'];
                    if (options.jsx) {
                        plugins.push('jsx');
                    }
                    ast = cacher(function () { return recast.parse(source, { parser: buildParse({ plugins: plugins }) }); }, source);
                    if (!ast) {
                        throw new Error("Unable to parse empty file \"".concat(options.filePath, "\""));
                    }
                    _a = __read(resolveExportedComponent(ast), 2), componentDefinitions = _a[0], ievSet = _a[1];
                    if (componentDefinitions.size === 0 && noNeedForExport) {
                        componentDefinitions.set('default', ast.program.body[0]);
                    }
                    if (!(componentDefinitions.size === 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, documentRequiredComponents(parseFile, documentation, ievSet, undefined, options)
                        // if we do not find any components, throw
                    ];
                case 1:
                    docs = _b.sent();
                    // if we do not find any components, throw
                    if (!docs.length) {
                        throw new Error("".concat(ERROR_MISSING_DEFINITION, " on \"").concat(options.filePath, "\""));
                    }
                    else {
                        return [2 /*return*/, docs];
                    }
                case 2: return [2 /*return*/, addDefaultAndExecuteHandlers(componentDefinitions, ast, options, {
                        parseFile: parseFile,
                    }, documentation, forceSingleExport)];
            }
        });
    });
}

var NodeTypesLitteral = {
    ELEMENT: 1,
    TEXT: 2,
    COMMENT: 3,
    SIMPLE_EXPRESSION: 4,
    INTERPOLATION: 5,
    ATTRIBUTE: 6,
    DIRECTIVE: 7,
    COMPOUND_EXPRESSION: 8
};
function isTextNode(node) {
    return !!node && node.type === NodeTypesLitteral.TEXT;
}
function isCommentNode(node) {
    return !!node && node.type === NodeTypesLitteral.COMMENT;
}
function isBaseElementNode(node) {
    return !!node && node.type === NodeTypesLitteral.ELEMENT;
}
function isDirectiveNode(prop) {
    return !!prop && prop.type === NodeTypesLitteral.DIRECTIVE;
}
function isAttributeNode(prop) {
    return !!prop && prop.type === NodeTypesLitteral.ATTRIBUTE;
}
function isSimpleExpressionNode(exp) {
    return !!exp && exp.type === NodeTypesLitteral.SIMPLE_EXPRESSION;
}
function isInterpolationNode(exp) {
    return !!exp && exp.type === NodeTypesLitteral.INTERPOLATION;
}

/**
 * Extract leading comments to an html node
 * Even if the comment is on multiple lines it's still taken as a whole
 * @param templateAst
 * @param rootLeadingComment
 */
function extractLeadingComment(siblings, templateAst) {
    // if the item has no siblings, the item is not documented
    if (siblings.length < 1) {
        return [];
    }
    // First find the position of the item in the siblings list
    var i = siblings.length - 1;
    var currentSlotIndex = -1;
    do {
        if (siblings[i] === templateAst) {
            currentSlotIndex = i;
        }
    } while (currentSlotIndex < 0 && i--);
    // Find the first leading comment
    // get all siblings before the current node
    var slotSiblingsBeforeSlot = siblings
        .slice(0, currentSlotIndex)
        .filter(function (s) { return !isTextNode(s); })
        .reverse();
    // find the first node that is not a potential comment
    var indexLastComment = slotSiblingsBeforeSlot.findIndex(function (sibling) {
        return !isCommentNode(sibling) &&
            !(isInterpolationNode(sibling) &&
                isSimpleExpressionNode(sibling.content) &&
                isCodeOnlyJSComment(sibling.content.content));
    });
    // cut the comments array on this index
    var slotLeadingComments = (indexLastComment > 0
        ? slotSiblingsBeforeSlot.slice(0, indexLastComment)
        : slotSiblingsBeforeSlot)
        .reverse()
        .filter(function (s) { return isCommentNode(s) || isInterpolationNode(s); });
    // return each comment text
    return slotLeadingComments.map(function (comment) {
        return isCommentNode(comment)
            ? comment.content.trim()
            : isInterpolationNode(comment) && isSimpleExpressionNode(comment.content)
                ? cleanUpComment(comment.content.content.trim())
                : '';
    });
}
function isCodeOnlyJSComment(code) {
    var codeTrimmed = code.trim();
    return (
    // check single-line comments
    isCodeOnlyJSCommentSingleLine(codeTrimmed) ||
        // check multi-line comments
        isCodeOnlyJSCommentMultiLine(codeTrimmed));
}
function isCodeOnlyJSCommentSingleLine(code) {
    return code.split('\n').every(function (line) { return line.startsWith('//'); });
}
function isCodeOnlyJSCommentMultiLine(code) {
    return (code.startsWith('/*') &&
        code.endsWith('*/') &&
        // avoid picking up comments that have multiple blocks
        code.slice(2, -2).indexOf('*/') === -1);
}
function cleanUpComment(comment) {
    return isCodeOnlyJSCommentMultiLine(comment)
        ? comment.slice(2, -2)
        : comment
            .trim()
            .slice(2)
            .split(/\n\/\//g)
            .join('\n');
}

function propTemplateHandler(documentation, templateAst, siblings, options) {
    if (options.functional) {
        propsInAttributes(documentation, templateAst, siblings);
        propsInInterpolation(documentation, templateAst, siblings);
    }
}
function propsInAttributes(documentation, templateAst, siblings) {
    if (isBaseElementNode(templateAst)) {
        templateAst.props.forEach(function (prop) {
            if (isDirectiveNode(prop) && isSimpleExpressionNode(prop.exp)) {
                getPropsFromExpression(documentation, templateAst, prop.exp, siblings);
            }
        });
    }
}
function propsInInterpolation(documentation, templateAst, siblings) {
    if (isInterpolationNode(templateAst) && isSimpleExpressionNode(templateAst.content)) {
        getPropsFromExpression(documentation, templateAst, templateAst.content, siblings);
    }
}
function getPropsFromExpression(documentation, item, exp, siblings) {
    var expression = exp.content;
    var ast = getTemplateExpressionAST(expression);
    var propsFound = [];
    recast.visit(ast.program, {
        visitMemberExpression: function (path) {
            var obj = path.node ? path.node.object : undefined;
            var propName = path.node ? path.node.property : undefined;
            if ((obj === null || obj === void 0 ? void 0 : obj.type) === 'Identifier' && obj.name === 'props' && (propName === null || propName === void 0 ? void 0 : propName.type) === 'Identifier') {
                var pName = propName.name;
                var p = documentation.getPropDescriptor(pName);
                propsFound.push(pName);
                p.type = { name: 'undefined' };
            }
            return false;
        }
    });
    if (propsFound.length) {
        var comments = extractLeadingComment(siblings, item);
        comments.forEach(function (comment) {
            var doclets = getDocblockTags(comment);
            var propTags = doclets.tags && doclets.tags.filter(function (d) { return d.title === 'prop'; });
            if (propTags && propTags.length) {
                propsFound.forEach(function (pName) {
                    var propTag = propTags.filter(function (pt) { return pt.name === pName; });
                    if (propTag.length) {
                        var p = documentation.getPropDescriptor(pName);
                        p.type = propTag[0].type;
                        if (typeof propTag[0].description === 'string') {
                            p.description = propTag[0].description;
                        }
                    }
                });
            }
        });
    }
}

var parser = buildParse({ plugins: ['typescript'] });
function slotHandler(documentation, templateAst, siblings) {
    var _a;
    if (isBaseElementNode(templateAst) && templateAst.tag === 'slot') {
        var nameProp = templateAst.props.filter(isAttributeNode).find(function (b) { return b.name === 'name'; });
        var slotName = nameProp && nameProp.value ? nameProp.value.content : undefined;
        if (!slotName) {
            var dynExpr = templateAst.props
                .filter(isDirectiveNode)
                .find(function (b) { return b.name === 'bind' && isSimpleExpressionNode(b.arg) && b.arg.content === 'name'; });
            if (dynExpr && isSimpleExpressionNode(dynExpr.exp) && dynExpr.exp) {
                slotName = dynExpr.exp.content;
            }
            else {
                slotName = 'default';
            }
        }
        var bindings = templateAst.props.filter(
        // only keep simple binds and static attributes
        function (b) { return b.name !== 'name' && (b.name === 'bind' || isAttributeNode(b)); });
        var slotDescriptor_1 = documentation.getSlotDescriptor(slotName);
        if (bindings.length) {
            slotDescriptor_1.scoped = true;
        }
        var comments = extractLeadingComment(siblings, templateAst);
        var bindingDescriptors_1 = [];
        comments.forEach(function (comment) {
            // if a comment contains @slot,
            // use it to determine bindings and tags
            // if multiple @slot, use the last one
            if (comment.length) {
                var doclets = parseSlotDocBlock(comment, slotDescriptor_1);
                if (doclets && doclets.bindings) {
                    bindingDescriptors_1 = doclets.bindings;
                }
            }
        });
        var simpleBindings_1 = [];
        // deal with v-bind="" props
        var simpleVBind = bindings.find(function (b) { return isDirectiveNode(b) && !b.arg; });
        var rawVBind_1 = false;
        if (simpleVBind && isSimpleExpressionNode(simpleVBind.exp)) {
            var ast = parser.parse("() => (".concat(simpleVBind.exp.content, ")"));
            recast.visit(ast.program, {
                visitObjectExpression: function (path) {
                    path.get('properties').each(function (property) {
                        var node = property.node;
                        if (bt__namespace.isProperty(node) || bt__namespace.isObjectProperty(node)) {
                            var name_1 = recast.print(property.get('key')).code;
                            var bindingDesc = bindingDescriptors_1.filter(function (t) { return t.name === name_1; })[0];
                            simpleBindings_1.push(bindingDesc
                                ? bindingDesc
                                : {
                                    name: name_1,
                                    title: 'binding'
                                });
                        }
                        else {
                            rawVBind_1 = true;
                        }
                    });
                    return false;
                }
            });
        }
        if (bindings.length) {
            slotDescriptor_1.bindings = simpleBindings_1.concat(bindings.reduce(function (acc, b) {
                if (!rawVBind_1 && isDirectiveNode(b) && !b.arg) {
                    return acc;
                }
                // resolve name of binding
                var name = isDirectiveNode(b) && b.arg && isSimpleExpressionNode(b.arg)
                    ? b.arg.content
                    : "".concat(isDirectiveNode(b) ? 'v-' : '').concat(b.name);
                var bindingDesc = bindingDescriptors_1.filter(function (t) { return t.name === name; })[0];
                acc.push(bindingDesc ? bindingDesc : { name: name, title: 'binding' });
                return acc;
            }, []));
        }
        var restOfBindings = bindingDescriptors_1.filter(function (bindFromComment) { var _a; return !((_a = slotDescriptor_1.bindings) === null || _a === void 0 ? void 0 : _a.some(function (bindFromData) { return bindFromData.title === bindFromComment.title; })); });
        if (restOfBindings.length) {
            slotDescriptor_1.bindings = (_a = slotDescriptor_1.bindings) === null || _a === void 0 ? void 0 : _a.concat(restOfBindings);
        }
    }
}

function eventHandler(documentation, templateAst, siblings) {
    if (isBaseElementNode(templateAst)) {
        templateAst.props.forEach(function (prop) {
            if (isDirectiveNode(prop)) {
                if (prop.name === 'on') {
                    // only look at expressions
                    var expression = prop.exp;
                    if (isSimpleExpressionNode(expression)) {
                        getEventsFromExpression(templateAst, expression.content, documentation, siblings);
                    }
                }
            }
        });
    }
}
function getEventsFromExpression(item, expression, documentation, siblings) {
    var ast = getTemplateExpressionAST(expression);
    var eventsFound = [];
    recast.visit(ast.program, {
        visitCallExpression: function (path) {
            var obj = path.node ? path.node.callee : undefined;
            var args = path.node ? path.node.arguments : undefined;
            if (obj && args && obj.type === 'Identifier' && obj.name === '$emit' && args.length) {
                var evtName = args[0].type === 'StringLiteral' ? args[0].value : '<undefined>';
                documentation.getEventDescriptor(evtName);
                eventsFound.push(evtName);
                return false;
            }
            this.traverse(path);
            return undefined;
        }
    });
    if (eventsFound.length) {
        var leadingComments_1 = extractLeadingComment(siblings, item);
        if (leadingComments_1.length) {
            eventsFound.forEach(function (evtName) {
                leadingComments_1.forEach(function (comment) {
                    var doclets = getDocblockTags(comment);
                    var eventTags = doclets.tags && doclets.tags.filter(function (d) { return d.title === 'event'; });
                    if (!(eventTags &&
                        eventTags.length &&
                        eventTags.findIndex(function (et) { return et.content === evtName; }) > -1)) {
                        return;
                    }
                    var e = documentation.getEventDescriptor(evtName);
                    setEventDescriptor(e, doclets);
                });
            });
        }
    }
}

var templateHandlers = [slotHandler, propTemplateHandler, eventHandler];

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: templateHandlers
});

function parseTemplate(tpl, documentation, handlers, opts) {
    var filePath = opts.filePath, pugOptions = opts.pugOptions;
    if (tpl && tpl.content) {
        var source_1 = tpl.attrs && tpl.attrs.lang === 'pug'
            ? pug__namespace.render(tpl.content.trim(), __assign(__assign({ doctype: 'html' }, pugOptions), { filename: filePath }))
            : tpl.content;
        var ast_1 = cacher(function () { return compilerDom.parse(source_1, { comments: true }); }, source_1);
        var functional_1 = !!tpl.attrs.functional;
        if (functional_1) {
            documentation.set('functional', functional_1);
        }
        if (ast_1) {
            ast_1.children.forEach(function (child) {
                return traverse(child, documentation, handlers, ast_1.children, {
                    functional: functional_1
                });
            });
        }
    }
}
function hasChildren(child) {
    return !!child.children;
}
function traverse(templateAst, documentation, handlers, siblings, options) {
    var traverseAstChildren = function (ast) {
        var e_1, _a;
        if (hasChildren(ast)) {
            var children = ast.children;
            try {
                for (var children_1 = __values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                    var childNode = children_1_1.value;
                    traverse(childNode, documentation, handlers, children, options);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (children_1_1 && !children_1_1.done && (_a = children_1.return)) _a.call(children_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    handlers.forEach(function (handler) {
        handler(documentation, templateAst, siblings, options);
    });
    traverseAstChildren(templateAst);
}

function defineHandler(handler) {
    return handler;
}
var getTypeDefinitionFromIdentifierFromModule = function (module, typeName, opt, pathResolver) {
    var parser = buildParse({ plugins: ['typescript'] });
    var filePath = pathResolver(module);
    if (!filePath || !opt.validExtends(filePath)) {
        return undefined;
    }
    return getTypeDefinitionFromIdentifier(parser.parse(fs.readFileSync(filePath, {
        encoding: 'utf-8'
    })), typeName, __assign(__assign({}, opt), { filePath: filePath }));
};
function getTypeDefinitionFromIdentifier(astPath, typeName, opt, importName) {
    var typeBody = undefined;
    var pathResolver = makePathResolver(path.dirname(opt.filePath), opt.alias, opt.modules);
    recast.visit(astPath.program, {
        visitExportAllDeclaration: function (nodePath) {
            typeBody =
                typeBody !== null && typeBody !== void 0 ? typeBody : getTypeDefinitionFromIdentifierFromModule(nodePath.value.source.value, typeName, opt, pathResolver);
            return false;
        },
        visitExportSpecifier: function (nodePath) {
            if (!typeBody && nodePath.value.exported.name === typeName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(nodePath.parent.value.source.value, nodePath.value.local.name, opt, pathResolver);
            }
            return false;
        },
        visitImportSpecifier: function (nodePath) {
            if (!typeBody && nodePath.value.imported.name === typeName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(nodePath.parent.value.source.value, typeName, opt, pathResolver);
            }
            return false;
        },
        visitImportNamespaceSpecifier: function (path) {
            if (!typeBody && path.value.local.name === importName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(path.parent.value.source.value, typeName, opt, pathResolver);
            }
            return false;
        },
        visitTSInterfaceDeclaration: function (nodePath) {
            if (nodePath.node.id.type === 'Identifier' && nodePath.node.id.name === typeName) {
                var interfaceBody_1 = nodePath.get('body', 'body');
                if (!interfaceBody_1) {
                    return;
                }
                // If the interface extends from other interfaces, look these up and insert their properties
                // into the just resolved interface. If the inheriting interface already has such a property
                // defined, to not add it, as the inheriting interface overwrites it.
                if (nodePath.value.extends) {
                    var parentInterfaces = nodePath.value.extends;
                    parentInterfaces.forEach(function (parentInterface) {
                        if (parentInterface.expression.type !== 'Identifier') {
                            return;
                        }
                        var parentInterfaceBody = getTypeDefinitionFromIdentifier(astPath, parentInterface.expression.name, opt);
                        parentInterfaceBody === null || parentInterfaceBody === void 0 ? void 0 : parentInterfaceBody.value.forEach(function (parentInterfaceProp) {
                            if (!interfaceBody_1.value.find(function (prop) {
                                var _a, _b;
                                return ((_a = prop.key) === null || _a === void 0 ? void 0 : _a.type) === 'Identifier' &&
                                    ((_b = parentInterfaceProp.key) === null || _b === void 0 ? void 0 : _b.type) === 'Identifier' &&
                                    prop.key.name === parentInterfaceProp.key.name;
                            })) {
                                interfaceBody_1.value.splice(0, 0, parentInterfaceProp);
                            }
                        });
                    });
                }
                typeBody = interfaceBody_1;
            }
            return false;
        },
        visitTSTypeAliasDeclaration: function (nodePath) {
            if (nodePath.node.id.type === 'Identifier' && nodePath.node.id.name === typeName) {
                var typeAnnotation = nodePath.get('typeAnnotation');
                if (bt__namespace.isTSTypeLiteral(typeAnnotation.node)) {
                    typeBody = typeAnnotation.get('members');
                }
                else if (bt__namespace.isTSTypeReference(typeAnnotation.node)) {
                    typeBody = getTypeDefinitionFromIdentifier(astPath, typeAnnotation.node.typeName.name, opt);
                }
            }
            return false;
        }
    });
    return typeBody;
}

/**
 * Extract information from an setup-style VueJs 3 component
 * about what events can be emitted
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
function setupEventHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        function buildEventDescriptor(eventName, eventPath) {
            var _a;
            var eventDescriptor = documentation.getEventDescriptor(eventName);
            var isPropertyEmitSyntax = bt__namespace.isTSPropertySignature(eventPath.node);
            var typeParam = isPropertyEmitSyntax
                ? eventPath.get('typeAnnotation')
                : eventPath.get('parameters', 1, 'typeAnnotation');
            if (bt__namespace.isTSTypeAnnotation(typeParam.node)) {
                var type = getTypeFromAnnotation(typeParam.node);
                if (isPropertyEmitSyntax && type) {
                    type = (_a = type.elements) === null || _a === void 0 ? void 0 : _a[0];
                }
                if (type) {
                    eventDescriptor.type = {
                        names: [type.name]
                    };
                    if (type.elements) {
                        eventDescriptor.type.elements = type.elements;
                    }
                }
            }
            var docBlock = getDocblock(eventPath);
            if (docBlock) {
                var jsDoc = getDocblockTags(docBlock);
                setEventDescriptor(eventDescriptor, jsDoc);
            }
        }
        function readEventsTSTypes(refs) {
            if (!refs.value) {
                return;
            }
            refs.each(function (member) {
                if (bt__namespace.isTSCallSignatureDeclaration(member.node)) {
                    var firstParam = member.node.parameters[0].typeAnnotation;
                    if (bt__namespace.isTSTypeAnnotation(firstParam) &&
                        bt__namespace.isTSLiteralType(firstParam.typeAnnotation) &&
                        !bt__namespace.isUnaryExpression(firstParam.typeAnnotation.literal) &&
                        !bt__namespace.isTemplateLiteral(firstParam.typeAnnotation.literal) &&
                        typeof firstParam.typeAnnotation.literal.value === 'string') {
                        buildEventDescriptor(firstParam.typeAnnotation.literal.value, member);
                    }
                }
                else if (bt__namespace.isTSPropertySignature(member.node)) {
                    if (bt__namespace.isIdentifier(member.node.key)) {
                        buildEventDescriptor(member.node.key.name, member);
                    }
                    else if (bt__namespace.isStringLiteral(member.node.key)) {
                        buildEventDescriptor(member.node.key.value, member);
                    }
                }
            });
        }
        return __generator(this, function (_a) {
            recast.visit(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (nodePath.node.callee.type === 'Identifier' &&
                        nodePath.node.callee.name === 'defineEmits') {
                        // Array of string where no type is specified
                        if (bt__namespace.isArrayExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'elements').each(function (element) {
                                if (bt__namespace.isStringLiteral(element.node)) {
                                    buildEventDescriptor(element.node.value, element);
                                }
                            });
                        }
                        // Object where the arguments are validated manually
                        if (bt__namespace.isObjectExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'properties').each(function (element) {
                                if (bt__namespace.isObjectProperty(element.node)) {
                                    if (bt__namespace.isIdentifier(element.node.key)) {
                                        buildEventDescriptor(element.node.key.name, element);
                                    }
                                    else if (bt__namespace.isStringLiteral(element.node.key)) {
                                        buildEventDescriptor(element.node.key.value, element);
                                    }
                                }
                            });
                        }
                        // typescript validation of arguments
                        if (bt__namespace.isTSTypeParameterInstantiation(nodePath.get('typeParameters').node)) {
                            nodePath.get('typeParameters', 'params').each(function (param) {
                                if (bt__namespace.isTSTypeLiteral(param.node)) {
                                    readEventsTSTypes(param.get('members'));
                                }
                                else if (bt__namespace.isTSTypeReference(param.node) && bt__namespace.isIdentifier(param.node.typeName)) {
                                    var resolvedType = getTypeDefinitionFromIdentifier(astPath, param.node.typeName.name, opt);
                                    if (resolvedType) {
                                        readEventsTSTypes(resolvedType);
                                    }
                                }
                            });
                        }
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
}

/**
 * Extract information from an setup-style VueJs 3 component
 * about what events can be emitted
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
function setupOptionsHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            recast.visit(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (nodePath.node.callee.type === 'Identifier' &&
                        nodePath.node.callee.name === 'defineOptions' &&
                        nodePath.node.arguments[0].type === 'ObjectExpression') {
                        var options = nodePath.node.arguments[0];
                        options.properties.forEach(function (property) {
                            if (property.type === 'ObjectProperty' && property.key.type === 'Identifier') {
                                var key = property.key.name;
                                if (key === 'name' && property.value.type === 'StringLiteral') {
                                    documentation.set('name', property.value.value);
                                }
                            }
                        });
                        handleComponentJSDoc(nodePath, documentation);
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
}

/**
 * Extract information from an setup-style VueJs 3 component
 * about what props can be used with this component
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
var setupPropHandler = defineHandler(function setupPropHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var propsDef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recast.visit(astPath.program, {
                        visitCallExpression: function (nodePath) {
                            var hasDefaults = nodePath.node.callee.type === 'Identifier' && nodePath.node.callee.name === 'withDefaults';
                            var normalizedNodePath = hasDefaults ? nodePath.get('arguments', 0) : nodePath;
                            if (bt__namespace.isIdentifier(normalizedNodePath.node.callee) &&
                                normalizedNodePath.node.callee.name === 'defineProps') {
                                if (normalizedNodePath.node.typeParameters) {
                                    var typeParamsPath = normalizedNodePath.get('typeParameters', 'params', 0);
                                    if (bt__namespace.isTSTypeLiteral(typeParamsPath.node)) {
                                        getPropsFromLiteralType(documentation, typeParamsPath.get('members'));
                                    }
                                    else if (bt__namespace.isTSTypeReference(typeParamsPath.node)) {
                                        if (bt__namespace.isIdentifier(typeParamsPath.node.typeName)) {
                                            // its a reference to an interface or type
                                            var typeName = typeParamsPath.node.typeName.name; // extract the identifier
                                            // find it's definition in the file
                                            var definitionPath = getTypeDefinitionFromIdentifier(astPath, typeName, opt);
                                            // use the same process to exact info
                                            if (definitionPath &&
                                                (bt__namespace.isTSTypeLiteral(definitionPath.node) ||
                                                    bt__namespace.isTSInterfaceBody(definitionPath.node))) {
                                                getPropsFromLiteralType(documentation, definitionPath);
                                            }
                                        }
                                        else if (bt__namespace.isTSQualifiedName(typeParamsPath.node.typeName)) {
                                            // its a reference to an interface or type
                                            var importName = typeParamsPath.node.typeName.left.name; // extract the import identifier
                                            var typeName = typeParamsPath.node.typeName.right.name; // extract the identifier
                                            var definitionPath = getTypeDefinitionFromIdentifier(astPath, typeName, opt, importName);
                                            // use the same process to exact info
                                            if (definitionPath) {
                                                getPropsFromLiteralType(documentation, definitionPath);
                                            }
                                        }
                                    }
                                }
                                else {
                                    propsDef = normalizedNodePath.get('arguments', 0);
                                }
                                // add defaults from withDefaults
                                if (hasDefaults) {
                                    var defaults = nodePath.get('arguments', 1);
                                    if (bt__namespace.isObjectExpression(defaults.node)) {
                                        defaults.get('properties').each(function (propPath) {
                                            var propName = propPath.get('key').node.name;
                                            var propValue = propPath.get('value');
                                            var propDescriptor = documentation.getPropDescriptor(propName);
                                            propDescriptor.defaultValue = {
                                                func: false,
                                                value: recast.print(propValue).code
                                            };
                                        });
                                    }
                                }
                            }
                            return false;
                        }
                    });
                    if (!propsDef) return [3 /*break*/, 2];
                    return [4 /*yield*/, describePropsFromValue(documentation, propsDef, astPath, opt)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
});
function getPropsFromLiteralType(documentation, typeParamsPathMembers) {
    typeParamsPathMembers.each(function (prop) {
        if (bt__namespace.isTSPropertySignature(prop.node) && bt__namespace.isIdentifier(prop.node.key)) {
            var propDescriptor = documentation.getPropDescriptor(prop.node.key.name);
            decorateItem(prop, propDescriptor);
            propDescriptor.required = !prop.node.optional;
            propDescriptor.type = getTypeFromAnnotation(prop.get('typeAnnotation').value);
        }
    });
}

/**
 * Extract information from an setup-style VueJs 3 component
 * about what methods and variable are exposed
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
function setupExposedHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        function buildExposeDescriptor(exposedName, exposedPath) {
            var exposeDescriptor = documentation.getExposeDescriptor(exposedName);
            var docBlock = getDocblock(exposedPath);
            if (docBlock) {
                var jsDoc = getDocblockTags(docBlock);
                setExposeDescriptor(exposeDescriptor, jsDoc);
            }
        }
        function setExposeDescriptor(exposeDescriptor, jsDoc) {
            var _a;
            if (jsDoc.description && jsDoc.description.length) {
                exposeDescriptor.description = jsDoc.description;
            }
            if ((_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.length) {
                exposeDescriptor.tags = jsDoc.tags;
            }
        }
        return __generator(this, function (_a) {
            recast.visit(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (nodePath.node.callee.type === 'Identifier' &&
                        nodePath.node.callee.name === 'defineExpose') {
                        if (bt__namespace.isObjectExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'properties').each(function (prop) {
                                if (bt__namespace.isIdentifier(prop.node.key)) {
                                    buildExposeDescriptor(prop.node.key.name, prop);
                                }
                                else if (bt__namespace.isStringLiteral(prop.node.key)) {
                                    buildExposeDescriptor(prop.node.key.value, prop);
                                }
                            });
                        }
                        else if (bt__namespace.isArrayExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'elements').each(function (prop) {
                                if (bt__namespace.isStringLiteral(prop.node)) {
                                    buildExposeDescriptor(prop.node.value, prop);
                                }
                            });
                        }
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
}

/**
 * Extract information from an setup-style VueJs 3 component
 * about what props can be used with this component
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
var setupSlotHandler = defineHandler(function setupSlotHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            recast.visit(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (nodePath.node.callee.type === 'Identifier' &&
                        nodePath.node.callee.name === 'defineSlots' &&
                        nodePath.node.typeParameters) {
                        var typeParamsPath = nodePath.get('typeParameters', 'params', 0);
                        if (bt__namespace.isTSTypeLiteral(typeParamsPath.node)) {
                            // if the slots are defined as a literal type
                            getSlotsFromLiteralType(documentation, typeParamsPath.get('members'));
                        }
                        else if (bt__namespace.isTSTypeReference(typeParamsPath.node) &&
                            bt__namespace.isIdentifier(typeParamsPath.node.typeName)) {
                            // its a reference to an interface or type
                            var typeName = typeParamsPath.node.typeName.name; // extract the identifier
                            // find it's definition in the file
                            var definitionPath = getTypeDefinitionFromIdentifier(astPath, typeName, opt);
                            // use the same process to exact info
                            if (definitionPath) {
                                getSlotsFromLiteralType(documentation, definitionPath);
                            }
                        }
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
});
function getSlotsFromLiteralType(documentation, members) {
    members.each(function (propPath) {
        var slotName = propPath.get('key').node.name;
        var slotDescriptor = documentation.getSlotDescriptor(slotName);
        slotDescriptor.name = slotName;
        parseDocBlock(slotDescriptor, propPath);
        if (bt__namespace.isTSMethodSignature(propPath.node)) {
            var p = propPath.get('parameters', 0, 'typeAnnotation', 'typeAnnotation');
            if (bt__namespace.isTSTypeLiteral(p.node)) {
                var bindingDescriptors_1 = [];
                p.get('members').each(function (paramPath) {
                    var _a, _b;
                    var paramName = (_b = (_a = paramPath.get('key')) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.name;
                    var docBlock = getDocblock(paramPath);
                    var jsDoc = docBlock
                        ? getDocblockTags(docBlock)
                        : { description: '', tags: [] };
                    bindingDescriptors_1.push({
                        name: paramName,
                        title: 'binding',
                        description: jsDoc.description
                    });
                });
                if (bindingDescriptors_1.length) {
                    slotDescriptor.scoped = true;
                    slotDescriptor.bindings = bindingDescriptors_1;
                }
            }
        }
    });
}
function parseDocBlock(descriptor, path) {
    var docBlock = getDocblock(path);
    var jsDoc = docBlock ? getDocblockTags(docBlock) : { description: '', tags: [] };
    var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
    if (jsDoc.description) {
        descriptor.description = jsDoc.description;
    }
    if (jsDocTags.length) {
        descriptor.tags = transformTagsIntoObject(jsDocTags);
    }
}

var setupHandlers = [setupEventHandler, setupOptionsHandler, setupPropHandler, setupExposedHandler, setupSlotHandler];

var read$1 = util.promisify(fs.readFile);
function parseSFC(parseFile, initialDoc, source, opt) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var documentation, pathResolver, parts, extTemplSrc, extTemplSrcAbs, extTemplSource, _c, addTemplateHandlers, docsBlocks, docs, displayName, dirName;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    documentation = initialDoc;
                    pathResolver = makePathResolver(path__namespace.dirname(opt.filePath), opt.alias, opt.modules);
                    parts = cacher(function () { return compilerSfc.parse(source, { pad: 'line' }); }, source).descriptor;
                    if (!parts.template) return [3 /*break*/, 5];
                    extTemplSrc = (_b = (_a = parts === null || parts === void 0 ? void 0 : parts.template) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.src;
                    if (!(extTemplSrc && typeof extTemplSrc === 'string')) return [3 /*break*/, 4];
                    extTemplSrcAbs = pathResolver(extTemplSrc);
                    if (!extTemplSrcAbs) return [3 /*break*/, 2];
                    return [4 /*yield*/, read$1(extTemplSrcAbs, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    _c = _d.sent();
                    return [3 /*break*/, 3];
                case 2:
                    // leave the template alone
                    _c = false;
                    _d.label = 3;
                case 3:
                    extTemplSource = _c;
                    if (extTemplSource) {
                        parts.template.content = extTemplSource;
                    }
                    _d.label = 4;
                case 4:
                    addTemplateHandlers = opt.addTemplateHandlers || [];
                    documentation = initialDoc || new Documentation(opt.filePath);
                    parseTemplate(parts.template, documentation, __spreadArray(__spreadArray([], __read(templateHandlers), false), __read(addTemplateHandlers), false), opt);
                    _d.label = 5;
                case 5:
                    if (parts.customBlocks) {
                        documentation = documentation || new Documentation(opt.filePath);
                        docsBlocks = parts.customBlocks
                            .filter(function (block) { return block.type === 'docs' && block.content && block.content.length; })
                            .map(function (block) { return block.content.trim(); });
                        if (docsBlocks.length) {
                            documentation.setDocsBlocks(docsBlocks);
                        }
                    }
                    docs = documentation ? [documentation] : [];
                    if (!parts.scriptSetup) return [3 /*break*/, 7];
                    return [4 /*yield*/, parseScriptTag(parseFile, parts.scriptSetup, pathResolver, opt, documentation, initialDoc !== undefined, true, parts.script ? parts.script.content : '')];
                case 6:
                    docs = _d.sent();
                    return [3 /*break*/, 9];
                case 7:
                    if (!parts.script) return [3 /*break*/, 9];
                    return [4 /*yield*/, parseScriptTag(parseFile, parts.script, pathResolver, opt, documentation, initialDoc !== undefined)];
                case 8:
                    docs = _d.sent();
                    _d.label = 9;
                case 9:
                    if (documentation && !documentation.get('displayName')) {
                        displayName = path__namespace.basename(opt.filePath).replace(/\.\w+$/, '');
                        dirName = path__namespace.basename(path__namespace.dirname(opt.filePath));
                        documentation.set('displayName', displayName.toLowerCase() === 'index' ? dirName : displayName);
                    }
                    return [2 /*return*/, docs];
            }
        });
    });
}
function parseScriptTag(parseFile, scriptTag, pathResolver, opt, documentation, forceSingleExport, isSetupScript, isSetupScriptOtherScript) {
    if (isSetupScript === void 0) { isSetupScript = false; }
    if (isSetupScriptOtherScript === void 0) { isSetupScriptOtherScript = ''; }
    return __awaiter(this, void 0, void 0, function () {
        var scriptSource, extSrc, extSrcAbs, extSource, _a, docs, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    scriptSource = scriptTag ? scriptTag.content : undefined;
                    extSrc = scriptTag && scriptTag.attrs ? scriptTag.attrs.src : false;
                    if (!(extSrc && typeof extSrc === 'string')) return [3 /*break*/, 4];
                    extSrcAbs = pathResolver(extSrc);
                    if (!extSrcAbs) return [3 /*break*/, 2];
                    return [4 /*yield*/, read$1(extSrcAbs, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    _a = _c.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = '';
                    _c.label = 3;
                case 3:
                    extSource = _a;
                    if (extSource.length) {
                        scriptSource = extSource;
                        opt.lang =
                            (scriptTag && scriptTag.attrs && /^tsx?$/.test(scriptTag.attrs.lang)) ||
                                /\.tsx?$/i.test(extSrc)
                                ? 'ts'
                                : 'js';
                        if (extSrcAbs) {
                            documentation === null || documentation === void 0 ? void 0 : documentation.sourceFiles.add(extSrcAbs);
                        }
                    }
                    _c.label = 4;
                case 4:
                    opt.lang =
                        (scriptTag && scriptTag.attrs && /^tsx?$/.test(scriptTag.attrs.lang)) ||
                            (typeof extSrc === 'string' && /\.tsx?$/i.test(extSrc))
                            ? 'ts'
                            : 'js';
                    opt = isSetupScript ? __assign(__assign({}, opt), { scriptPreHandlers: [], scriptHandlers: setupHandlers }) : opt;
                    if (!scriptSource) return [3 /*break*/, 6];
                    return [4 /*yield*/, parseScript(parseFile, isSetupScriptOtherScript + '\n' + scriptSource, opt, documentation, forceSingleExport, isSetupScript)];
                case 5:
                    _b = (_c.sent()) || [];
                    return [3 /*break*/, 7];
                case 6:
                    _b = documentation
                        ? [documentation]
                        : [];
                    _c.label = 7;
                case 7:
                    docs = _b;
                    return [2 /*return*/, docs];
            }
        });
    });
}

var read = util.promisify(fs.readFile);
var ERROR_EMPTY_DOCUMENT = 'The passed source is empty';
/**
 * parses the source at filePath and returns the doc
 * @param opt ParseOptions containing the filePath and the rest of the options
 * @param documentation documentation to be enriched if needed
 * @returns {object} documentation object
 */
function parseFile(opt, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var source;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, read(opt.filePath, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    source = _a.sent();
                    return [2 /*return*/, parseSource$1(source, opt, documentation)];
                case 2:
                    _a.sent();
                    throw Error("Could not read file ".concat(opt.filePath));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * parses the source and returns the doc
 * @param {string} source code whose documentation is parsed
 * @param {string} opt path of the current file against whom to resolve the mixins
 * @returns {object} documentation object
 */
function parseSource$1(source, opt, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var singleFileComponent, docs, displayName, dirName, dIndex, d, exportName, displayName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // if jsx option is not mentionned, parse jsx in components
                    opt.jsx = opt.jsx === undefined ? true : opt.jsx;
                    singleFileComponent = /\.vue$/i.test(path__namespace.extname(opt.filePath));
                    if (source === '') {
                        throw new Error(ERROR_EMPTY_DOCUMENT);
                    }
                    // if the parsed component is the result of a mixin or an extends
                    if (documentation) {
                        documentation.setOrigin(opt);
                    }
                    if (!singleFileComponent) return [3 /*break*/, 2];
                    return [4 /*yield*/, parseSFC(parseFile, documentation, source, opt)];
                case 1:
                    docs = _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    opt.lang = /\.tsx?$/i.test(path__namespace.extname(opt.filePath)) ? 'ts' : 'js';
                    return [4 /*yield*/, parseScript(parseFile, source, opt, documentation, documentation !== undefined)];
                case 3:
                    docs =
                        (_a.sent()) || [];
                    if (docs.length === 1) {
                        if (!docs[0].get('displayName')) {
                            displayName = path__namespace.basename(opt.filePath).replace(/\.\w+$/, '');
                            dirName = path__namespace.basename(path__namespace.dirname(opt.filePath));
                            docs[0].set('displayName', displayName.toLowerCase() === 'index' ? dirName : displayName);
                        }
                    }
                    else {
                        for (dIndex in docs) {
                            d = docs[dIndex];
                            exportName = d.get('exportName');
                            if (!d.get('displayName') && exportName && exportName !== 'default') {
                                displayName = exportName !== null && exportName !== void 0 ? exportName : "".concat(path__namespace.basename(opt.filePath).replace(/\.\w+$/, ''), "_").concat(dIndex + 1);
                                d.set('displayName', displayName);
                            }
                        }
                    }
                    _a.label = 4;
                case 4:
                    if (documentation) {
                        documentation.setOrigin({});
                    }
                    return [2 /*return*/, docs];
            }
        });
    });
}

/**
 * Parse the component at filePath and return props, public methods, events and slots
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parse(filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, parseFile(options)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); }, filePath, opts)];
                case 1: return [2 /*return*/, (_a.sent())[0]];
            }
        });
    });
}
/**
 * Parse all the components at filePath and returns an array of their
 * props, public methods, events and slot
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parseMulti(filePath, opts) {
    var _this = this;
    return parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, parseFile(options)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    }); }); }, filePath, opts);
}
/**
 * Parse the `source` assuming that it is located at `filePath` and return props, public methods, events and slots
 * @param source source code to be parsed
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parseSource(source, filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, parseSource$1(source, options)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); }, filePath, opts)];
                case 1: return [2 /*return*/, (_a.sent())[0]];
            }
        });
    });
}
function isOptionsObject(opts) {
    return (!!opts &&
        (!!opts.alias ||
            opts.jsx !== undefined ||
            !!opts.addScriptHandlers ||
            !!opts.addTemplateHandlers ||
            !!opts.validExtends ||
            !!opts.nameFilter));
}
function parsePrimitive(createDocs, filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var options, docs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    options = isOptionsObject(opts)
                        ? __assign(__assign({ validExtends: function (fullFilePath) { return !/[\\/]node_modules[\\/]/.test(fullFilePath); } }, opts), { filePath: filePath }) : {
                        filePath: filePath,
                        alias: opts,
                        validExtends: function (fullFilePath) { return !/[\\/]node_modules[\\/]/.test(fullFilePath); }
                    };
                    return [4 /*yield*/, createDocs(options)];
                case 1:
                    docs = _a.sent();
                    return [2 /*return*/, docs.map(function (d) { return d.toObject(); })];
            }
        });
    });
}

Object.defineProperty(exports, 'cleanName', {
    enumerable: true,
    get: function () { return vueInbrowserCompilerIndependentUtils.cleanName; }
});
Object.defineProperty(exports, 'getDefaultExample', {
    enumerable: true,
    get: function () { return vueInbrowserCompilerIndependentUtils.getDefaultExample; }
});
exports.Documentation = Documentation;
exports.ScriptHandlers = index$1;
exports.TemplateHandlers = index;
exports.getDocblock = getDocblock;
exports.getDoclets = getDocblockTags;
exports.getProperties = getProperties;
exports.parse = parse;
exports.parseMulti = parseMulti;
exports.parseSource = parseSource;
//# sourceMappingURL=main.cjs.map
