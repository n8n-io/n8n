/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var Evk = require('eslint-visitor-keys');
var sortedLastIndex = require('lodash/sortedLastIndex');
var assert = require('assert');
var last = require('lodash/last');
var findLastIndex = require('lodash/findLastIndex');
var debugFactory = require('debug');
var first = require('lodash/first');
var sortedIndexBy = require('lodash/sortedIndexBy');
var escope = require('eslint-scope');
var semver = require('semver');
var module$1 = require('module');
var dependencyEspree = require('espree');
var sortedLastIndexBy = require('lodash/sortedLastIndexBy');
var EventEmitter = require('events');
var esquery = require('esquery');
var union = require('lodash/union');
var intersection = require('lodash/intersection');
var memoize = require('lodash/memoize');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
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
    n["default"] = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var Evk__namespace = /*#__PURE__*/_interopNamespace(Evk);
var sortedLastIndex__default = /*#__PURE__*/_interopDefaultLegacy(sortedLastIndex);
var assert__default = /*#__PURE__*/_interopDefaultLegacy(assert);
var last__default = /*#__PURE__*/_interopDefaultLegacy(last);
var findLastIndex__default = /*#__PURE__*/_interopDefaultLegacy(findLastIndex);
var debugFactory__default = /*#__PURE__*/_interopDefaultLegacy(debugFactory);
var first__default = /*#__PURE__*/_interopDefaultLegacy(first);
var sortedIndexBy__default = /*#__PURE__*/_interopDefaultLegacy(sortedIndexBy);
var escope__namespace = /*#__PURE__*/_interopNamespace(escope);
var dependencyEspree__namespace = /*#__PURE__*/_interopNamespace(dependencyEspree);
var sortedLastIndexBy__default = /*#__PURE__*/_interopDefaultLegacy(sortedLastIndexBy);
var EventEmitter__default = /*#__PURE__*/_interopDefaultLegacy(EventEmitter);
var esquery__default = /*#__PURE__*/_interopDefaultLegacy(esquery);
var union__default = /*#__PURE__*/_interopDefaultLegacy(union);
var intersection__default = /*#__PURE__*/_interopDefaultLegacy(intersection);
var memoize__default = /*#__PURE__*/_interopDefaultLegacy(memoize);

function isAcornStyleParseError(x) {
    return (typeof x.message === "string" &&
        typeof x.pos === "number" &&
        typeof x.loc === "object" &&
        x.loc !== null &&
        typeof x.loc.line === "number" &&
        typeof x.loc.column === "number");
}
function isTSError(x) {
    return (!(x instanceof ParseError) &&
        typeof x.message === "string" &&
        typeof x.index === "number" &&
        typeof x.lineNumber === "number" &&
        typeof x.column === "number" &&
        x.name === "TSError");
}
class ParseError extends SyntaxError {
    code;
    index;
    lineNumber;
    column;
    static fromCode(code, offset, line, column) {
        return new ParseError(code, code, offset, line, column);
    }
    static normalize(x) {
        if (isTSError(x)) {
            return new ParseError(x.message, undefined, x.index, x.lineNumber, x.column);
        }
        if (ParseError.isParseError(x)) {
            return x;
        }
        if (isAcornStyleParseError(x)) {
            return new ParseError(x.message, undefined, x.pos, x.loc.line, x.loc.column);
        }
        return null;
    }
    constructor(message, code, offset, line, column) {
        super(message);
        this.code = code;
        this.index = offset;
        this.lineNumber = line;
        this.column = column;
    }
    static isParseError(x) {
        return (x instanceof ParseError ||
            (typeof x.message === "string" &&
                typeof x.index === "number" &&
                typeof x.lineNumber === "number" &&
                typeof x.column === "number"));
    }
}

const NS = Object.freeze({
    HTML: "http://www.w3.org/1999/xhtml",
    MathML: "http://www.w3.org/1998/Math/MathML",
    SVG: "http://www.w3.org/2000/svg",
    XLink: "http://www.w3.org/1999/xlink",
    XML: "http://www.w3.org/XML/1998/namespace",
    XMLNS: "http://www.w3.org/2000/xmlns/",
});

const KEYS = Evk__namespace.unionWith({
    VAttribute: ["key", "value"],
    VDirectiveKey: ["name", "argument", "modifiers"],
    VDocumentFragment: ["children"],
    VElement: ["startTag", "children", "endTag"],
    VEndTag: [],
    VExpressionContainer: ["expression"],
    VFilter: ["callee", "arguments"],
    VFilterSequenceExpression: ["expression", "filters"],
    VForExpression: ["left", "right"],
    VIdentifier: [],
    VLiteral: [],
    VOnExpression: ["body"],
    VSlotScopeExpression: ["params"],
    VStartTag: ["attributes"],
    VText: [],
    VGenericExpression: ["params"],
});
function fallbackKeysFilter(key) {
    let value = null;
    return (key !== "comments" &&
        key !== "leadingComments" &&
        key !== "loc" &&
        key !== "parent" &&
        key !== "range" &&
        key !== "tokens" &&
        key !== "trailingComments" &&
        (value = this[key]) !== null &&
        typeof value === "object" &&
        (typeof value.type === "string" || Array.isArray(value)));
}
function getFallbackKeys(node) {
    return Object.keys(node).filter(fallbackKeysFilter, node);
}
function isNode(x) {
    return x !== null && typeof x === "object" && typeof x.type === "string";
}
function traverse(node, parent, visitor) {
    let i = 0;
    let j = 0;
    visitor.enterNode(node, parent);
    const keys = (visitor.visitorKeys ?? KEYS)[node.type] ?? getFallbackKeys(node);
    for (i = 0; i < keys.length; ++i) {
        const child = node[keys[i]];
        if (Array.isArray(child)) {
            for (j = 0; j < child.length; ++j) {
                if (isNode(child[j])) {
                    traverse(child[j], node, visitor);
                }
            }
        }
        else if (isNode(child)) {
            traverse(child, node, visitor);
        }
    }
    visitor.leaveNode(node, parent);
}
function traverseNodes(node, visitor) {
    traverse(node, null, visitor);
}

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ParseError: ParseError,
    NS: NS,
    KEYS: KEYS,
    traverseNodes: traverseNodes,
    getFallbackKeys: getFallbackKeys
});

class LinesAndColumns {
    ltOffsets;
    constructor(ltOffsets) {
        this.ltOffsets = ltOffsets;
    }
    getLocFromIndex(index) {
        const line = sortedLastIndex__default["default"](this.ltOffsets, index) + 1;
        const column = index - (line === 1 ? 0 : this.ltOffsets[line - 2]);
        return { line, column };
    }
    createOffsetLocationCalculator(offset) {
        return {
            getFixOffset() {
                return offset;
            },
            getLocFromIndex: this.getLocFromIndex.bind(this),
        };
    }
}

class LocationCalculatorForHtml extends LinesAndColumns {
    gapOffsets;
    baseOffset;
    baseIndexOfGap;
    shiftOffset;
    constructor(gapOffsets, ltOffsets, baseOffset, shiftOffset = 0) {
        super(ltOffsets);
        this.gapOffsets = gapOffsets;
        this.ltOffsets = ltOffsets;
        this.baseOffset = baseOffset ?? 0;
        this.baseIndexOfGap =
            this.baseOffset === 0
                ? 0
                : sortedLastIndex__default["default"](gapOffsets, this.baseOffset);
        this.shiftOffset = shiftOffset;
    }
    getSubCalculatorAfter(offset) {
        return new LocationCalculatorForHtml(this.gapOffsets, this.ltOffsets, this.baseOffset + offset, this.shiftOffset);
    }
    getSubCalculatorShift(offset) {
        return new LocationCalculatorForHtml(this.gapOffsets, this.ltOffsets, this.baseOffset, this.shiftOffset + offset);
    }
    _getGap(index) {
        const offsets = this.gapOffsets;
        let g0 = sortedLastIndex__default["default"](offsets, index + this.baseOffset);
        let pos = index + this.baseOffset + g0 - this.baseIndexOfGap;
        while (g0 < offsets.length && offsets[g0] <= pos) {
            g0 += 1;
            pos += 1;
        }
        return g0 - this.baseIndexOfGap;
    }
    getLocation(index) {
        return this.getLocFromIndex(this.getOffsetWithGap(index));
    }
    getOffsetWithGap(index) {
        return index + this.getFixOffset(index);
    }
    getFixOffset(offset) {
        const shiftOffset = this.shiftOffset;
        const gap = this._getGap(offset + shiftOffset);
        return this.baseOffset + gap + shiftOffset;
    }
}

const debug = debugFactory__default["default"]("vue-eslint-parser");

function isScriptElement(node) {
    return node.type === "VElement" && node.name === "script";
}
function isScriptSetupElement(script) {
    return (isScriptElement(script) &&
        script.startTag.attributes.some((attr) => !attr.directive && attr.key.name === "setup"));
}
function isTemplateElement(node) {
    return node.type === "VElement" && node.name === "template";
}
function isStyleElement(node) {
    return node.type === "VElement" && node.name === "style";
}
function getOwnerDocument(leafNode) {
    let node = leafNode;
    while (node != null && node.type !== "VDocumentFragment") {
        node = node.parent;
    }
    return node;
}
function isLang(attribute) {
    return attribute.directive === false && attribute.key.name === "lang";
}
function getLang(element) {
    const langAttr = element?.startTag.attributes.find(isLang);
    const lang = langAttr?.value?.value;
    return lang || null;
}
function isTSLang(element) {
    const lang = getLang(element);
    return lang === "ts" || lang === "tsx";
}
function findGenericDirective(element) {
    return (element.startTag.attributes.find((attr) => attr.directive &&
        attr.value?.expression?.type === "VGenericExpression") || null);
}

function isParserObject(value) {
    return isEnhancedParserObject(value) || isBasicParserObject(value);
}
function isEnhancedParserObject(value) {
    return Boolean(value && typeof value.parseForESLint === "function");
}
function isBasicParserObject(value) {
    return Boolean(value && typeof value.parse === "function");
}

function isSFCFile(parserOptions) {
    if (parserOptions.filePath === "<input>") {
        return true;
    }
    return path__namespace.extname(parserOptions.filePath || "unknown.vue") === ".vue";
}
function getScriptParser(parser, getParserLang) {
    if (isParserObject(parser)) {
        return parser;
    }
    if (parser && typeof parser === "object") {
        const parserLang = getParserLang();
        const parserLangs = parserLang == null
            ? []
            : typeof parserLang === "string"
                ? [parserLang]
                : parserLang;
        for (const lang of parserLangs) {
            const parserForLang = lang && parser[lang];
            if (typeof parserForLang === "string" ||
                isParserObject(parserForLang)) {
                return parserForLang;
            }
        }
        return parser.js;
    }
    return typeof parser === "string" ? parser : undefined;
}
function getParserLangFromSFC(doc) {
    if (doc) {
        const scripts = doc.children.filter(isScriptElement);
        const script = (scripts.length === 2 && scripts.find(isScriptSetupElement)) ||
            scripts[0];
        if (script) {
            return getLang(script);
        }
    }
    return null;
}

let escopeCache = null;
function getEslintScope() {
    return escopeCache ?? (escopeCache = getNewest());
}
function getNewest() {
    let newest = escope__namespace;
    const userEscope = getEslintScopeFromUser();
    if (userEscope.version != null && semver.lte(newest.version, userEscope.version)) {
        newest = userEscope;
    }
    return newest;
}
function getEslintScopeFromUser() {
    try {
        const cwd = process.cwd();
        const relativeTo = path__default["default"].join(cwd, "__placeholder__.js");
        return module$1.createRequire(relativeTo)("eslint-scope");
    }
    catch {
        return escope__namespace;
    }
}

let espreeCache = null;
function getEspree() {
    return espreeCache ?? (espreeCache = getNewestEspree());
}
function getEcmaVersionIfUseEspree(parserOptions) {
    if (parserOptions.parser != null && parserOptions.parser !== "espree") {
        return undefined;
    }
    if (parserOptions.ecmaVersion === "latest" ||
        parserOptions.ecmaVersion == null) {
        return getDefaultEcmaVersion();
    }
    return normalizeEcmaVersion(parserOptions.ecmaVersion);
}
function getEspreeFromUser() {
    try {
        const cwd = process.cwd();
        const relativeTo = path__default["default"].join(cwd, "__placeholder__.js");
        return module$1.createRequire(relativeTo)("espree");
    }
    catch {
        return dependencyEspree__namespace;
    }
}
function getNewestEspree() {
    let newest = dependencyEspree__namespace;
    const userEspree = getEspreeFromUser();
    if (userEspree.version != null && semver.lte(newest.version, userEspree.version)) {
        newest = userEspree;
    }
    return newest;
}
function getDefaultEcmaVersion() {
    return getLatestEcmaVersion(getEspree());
}
function normalizeEcmaVersion(version) {
    if (version > 5 && version < 2015) {
        return version + 2009;
    }
    return version;
}
function getLatestEcmaVersion(espree) {
    return normalizeEcmaVersion(espree.latestEcmaVersion);
}

const DEFAULT_ECMA_VERSION = "latest";
const ANALYZE_SCOPE_DEFAULT_ECMA_VERSION = 2022;

function isUnique(reference, index, references) {
    return (index === 0 || reference.identifier !== references[index - 1].identifier);
}
function hasDefinition(variable) {
    return variable.defs.length >= 1;
}
function transformReference(reference) {
    const ret = {
        id: reference.identifier,
        mode: reference.isReadOnly()
            ? "r"
            : reference.isWriteOnly()
                ? "w"
                : "rw",
        variable: null,
        isValueReference: reference.isValueReference,
        isTypeReference: reference.isTypeReference,
    };
    Object.defineProperty(ret, "variable", { enumerable: false });
    return ret;
}
function transformVariable(variable, kind) {
    const ret = {
        id: variable.defs[0].name,
        kind,
        references: [],
    };
    Object.defineProperty(ret, "references", { enumerable: false });
    return ret;
}
function getForScope(scope) {
    const child = scope.childScopes[0];
    return child.block === scope.block ? child.childScopes[0] : child;
}
function analyzeScope(ast, parserOptions) {
    const ecmaVersion = getEcmaVersionIfUseEspree(parserOptions) ??
        ANALYZE_SCOPE_DEFAULT_ECMA_VERSION;
    const ecmaFeatures = parserOptions.ecmaFeatures ?? {};
    const sourceType = parserOptions.sourceType ?? "script";
    const result = getEslintScope().analyze(ast, {
        ignoreEval: true,
        nodejsScope: false,
        impliedStrict: ecmaFeatures.impliedStrict,
        ecmaVersion,
        sourceType,
        fallback: getFallbackKeys,
    });
    return result;
}
function analyze(parserResult, parserOptions) {
    const scopeManager = parserResult.scopeManager ||
        analyzeScope(parserResult.ast, parserOptions);
    return scopeManager.globalScope;
}
function analyzeExternalReferences(parserResult, parserOptions) {
    const scope = analyze(parserResult, parserOptions);
    return scope.through.filter(isUnique).map(transformReference);
}
function analyzeVariablesAndExternalReferences(parserResult, kind, parserOptions) {
    const scope = analyze(parserResult, parserOptions);
    return {
        variables: getForScope(scope)
            .variables.filter(hasDefinition)
            .map((v) => transformVariable(v, kind)),
        references: scope.through.filter(isUnique).map(transformReference),
    };
}

function fixLocations(result, locationCalculator) {
    fixNodeLocations(result.ast, result.visitorKeys, locationCalculator);
    for (const token of result.ast.tokens ?? []) {
        fixLocation(token, locationCalculator);
    }
    for (const comment of result.ast.comments ?? []) {
        fixLocation(comment, locationCalculator);
    }
}
function fixNodeLocations(rootNode, visitorKeys, locationCalculator) {
    const traversed = new Map();
    traverseNodes(rootNode, {
        visitorKeys,
        enterNode(node, parent) {
            if (!traversed.has(node)) {
                traversed.set(node, node);
                node.parent = parent;
                if (traversed.has(node.range)) {
                    if (!traversed.has(node.loc)) {
                        node.loc.start = locationCalculator.getLocFromIndex(node.range[0]);
                        node.loc.end = locationCalculator.getLocFromIndex(node.range[1]);
                        traversed.set(node.loc, node);
                    }
                    else if (node.start != null || node.end != null) {
                        const traversedNode = traversed.get(node.range);
                        if (traversedNode.type === node.type) {
                            node.start = traversedNode.start;
                            node.end = traversedNode.end;
                        }
                    }
                }
                else {
                    fixLocation(node, locationCalculator);
                    traversed.set(node.range, node);
                    traversed.set(node.loc, node);
                }
            }
        },
        leaveNode() {
        },
    });
}
function fixLocation(node, locationCalculator) {
    const range = node.range;
    const loc = node.loc;
    const d0 = locationCalculator.getFixOffset(range[0], "start");
    const d1 = locationCalculator.getFixOffset(range[1], "end");
    if (d0 !== 0) {
        range[0] += d0;
        if (node.start != null) {
            node.start += d0;
        }
        loc.start = locationCalculator.getLocFromIndex(range[0]);
    }
    if (d1 !== 0) {
        range[1] += d1;
        if (node.end != null) {
            node.end += d0;
        }
        loc.end = locationCalculator.getLocFromIndex(range[1]);
    }
    return node;
}
function fixErrorLocation(error, locationCalculator) {
    const diff = locationCalculator.getFixOffset(error.index, "start");
    error.index += diff;
    const loc = locationCalculator.getLocFromIndex(error.index);
    error.lineNumber = loc.line;
    error.column = loc.column;
}

function extractGeneric(element) {
    const genericAttr = findGenericDirective(element);
    if (!genericAttr) {
        return null;
    }
    const genericNode = genericAttr.value.expression;
    const defineTypes = genericNode.params.map((t, i) => ({
        node: t,
        define: `type ${t.name.name} = ${getConstraint(t, genericNode.rawParams[i])}`,
    }));
    return {
        node: genericNode,
        defineTypes,
        postprocess({ result, getTypeBlock, isRemoveTarget, getTypeDefScope }) {
            const node = getTypeBlock?.(result.ast) ?? result.ast;
            removeTypeDeclarations(node, isRemoveTarget);
            if (result.ast.tokens) {
                removeTypeDeclarationTokens(result.ast.tokens, isRemoveTarget);
            }
            if (result.ast.comments) {
                removeTypeDeclarationTokens(result.ast.comments, isRemoveTarget);
            }
            if (result.scopeManager) {
                const typeDefScope = getTypeDefScope(result.scopeManager);
                restoreScope(result.scopeManager, typeDefScope, isRemoveTarget);
            }
        },
    };
    function removeTypeDeclarations(node, isRemoveTarget) {
        for (let index = node.body.length - 1; index >= 0; index--) {
            if (isRemoveTarget(node.body[index])) {
                node.body.splice(index, 1);
            }
        }
    }
    function removeTypeDeclarationTokens(tokens, isRemoveTarget) {
        for (let index = tokens.length - 1; index >= 0; index--) {
            if (isRemoveTarget(tokens[index])) {
                tokens.splice(index, 1);
            }
        }
    }
    function restoreScope(scopeManager, typeDefScope, isRemoveTarget) {
        for (const variable of [...typeDefScope.variables]) {
            let def = variable.defs.find((d) => isRemoveTarget(d.name));
            while (def) {
                removeVariableDef(variable, def, typeDefScope);
                def = variable.defs.find((d) => isRemoveTarget(d.name));
            }
        }
        for (const reference of [...typeDefScope.references]) {
            if (isRemoveTarget(reference.identifier)) {
                removeReference(reference, typeDefScope);
            }
        }
        for (const scope of [...scopeManager.scopes]) {
            if (isRemoveTarget(scope.block)) {
                removeScope(scopeManager, scope);
            }
        }
    }
}
function getConstraint(node, rawParam) {
    if (!node.constraint) {
        return "unknown";
    }
    let index = rawParam.indexOf(node.name.name) + node.name.name.length;
    let startIndex = null;
    while (index < rawParam.length) {
        if (startIndex == null) {
            if (rawParam.startsWith("extends", index)) {
                startIndex = index = index + 7;
                continue;
            }
        }
        else if (rawParam[index] === "=") {
            if (rawParam[index + 1] === ">") {
                index += 2;
                continue;
            }
            return rawParam.slice(startIndex, index);
        }
        if (rawParam.startsWith("//", index)) {
            const lfIndex = rawParam.indexOf("\n", index);
            if (lfIndex >= 0) {
                index = lfIndex + 1;
                continue;
            }
            return "unknown";
        }
        if (rawParam.startsWith("/*", index)) {
            const endIndex = rawParam.indexOf("*/", index);
            if (endIndex >= 0) {
                index = endIndex + 2;
                continue;
            }
            return "unknown";
        }
        index++;
    }
    if (startIndex == null) {
        return "unknown";
    }
    return rawParam.slice(startIndex);
}
function removeVariableDef(variable, def, scope) {
    const defIndex = variable.defs.indexOf(def);
    if (defIndex < 0) {
        return;
    }
    variable.defs.splice(defIndex, 1);
    if (variable.defs.length === 0) {
        referencesToThrough(variable.references, scope);
        variable.references.forEach((r) => {
            if (r.init) {
                r.init = false;
            }
            r.resolved = null;
        });
        scope.variables.splice(scope.variables.indexOf(variable), 1);
        const name = variable.name;
        if (variable === scope.set.get(name)) {
            scope.set.delete(name);
        }
    }
    else {
        const idIndex = variable.identifiers.indexOf(def.name);
        if (idIndex >= 0) {
            variable.identifiers.splice(idIndex, 1);
        }
    }
}
function referencesToThrough(references, baseScope) {
    let scope = baseScope;
    while (scope) {
        addAllReferences(scope.through, references);
        scope = scope.upper;
    }
}
function addAllReferences(list, elements) {
    list.push(...elements);
    list.sort((a, b) => a.identifier.range[0] - b.identifier.range[0]);
}
function removeReference(reference, baseScope) {
    if (reference.resolved) {
        if (reference.resolved.defs.some((d) => d.name === reference.identifier)) {
            const varIndex = baseScope.variables.indexOf(reference.resolved);
            if (varIndex >= 0) {
                baseScope.variables.splice(varIndex, 1);
            }
            const name = reference.identifier.name;
            if (reference.resolved === baseScope.set.get(name)) {
                baseScope.set.delete(name);
            }
        }
        else {
            const refIndex = reference.resolved.references.indexOf(reference);
            if (refIndex >= 0) {
                reference.resolved.references.splice(refIndex, 1);
            }
        }
    }
    let scope = baseScope;
    while (scope) {
        const refIndex = scope.references.indexOf(reference);
        if (refIndex >= 0) {
            scope.references.splice(refIndex, 1);
        }
        const throughIndex = scope.through.indexOf(reference);
        if (throughIndex >= 0) {
            scope.through.splice(throughIndex, 1);
        }
        scope = scope.upper;
    }
}
function removeScope(scopeManager, scope) {
    for (const childScope of scope.childScopes) {
        removeScope(scopeManager, childScope);
    }
    while (scope.references[0]) {
        removeReference(scope.references[0], scope);
    }
    const upper = scope.upper;
    if (upper) {
        const index = upper.childScopes.indexOf(scope);
        if (index >= 0) {
            upper.childScopes.splice(index, 1);
        }
    }
    const index = scopeManager.scopes.indexOf(scope);
    if (index >= 0) {
        scopeManager.scopes.splice(index, 1);
    }
}

const ALIAS_ITERATOR = /^([\s\S]*?(?:\s|\)))(\bin\b|\bof\b)([\s\S]*)$/u;
const PARENS = /^(\s*\()([\s\S]*?)(\)\s*)$/u;
const DUMMY_PARENT$2 = {};
const IS_FUNCTION_EXPRESSION = /^\s*([\w$_]+|(async\s*)?\([^)]*?\))\s*(:[^=]+)?=>|^\s*(async\s+)?function(?:\s+[\w$]+)?\s*\(/u;
const IS_SIMPLE_PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?'\]|\["[^"]*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/u;
function processVForAliasAndIterator(code) {
    const match = ALIAS_ITERATOR.exec(code);
    if (match != null) {
        const aliases = match[1];
        const parenMatch = PARENS.exec(aliases);
        return {
            aliases,
            hasParens: Boolean(parenMatch),
            aliasesWithBrackets: parenMatch
                ? `${parenMatch[1].slice(0, -1)}[${parenMatch[2]}]${parenMatch[3].slice(1)}`
                : `[${aliases.slice(0, -1)}]`,
            delimiter: match[2] || "",
            iterator: match[3],
        };
    }
    return {
        aliases: "",
        hasParens: false,
        aliasesWithBrackets: "",
        delimiter: "",
        iterator: code,
    };
}
function getCommaTokenBeforeNode(tokens, node) {
    let tokenIndex = sortedIndexBy__default["default"](tokens, { range: node.range }, (t) => t.range[0]);
    while (tokenIndex >= 0) {
        const token = tokens[tokenIndex];
        if (token.type === "Punctuator" && token.value === ",") {
            return token;
        }
        tokenIndex -= 1;
    }
    return null;
}
function throwEmptyError(locationCalculator, expected) {
    const loc = locationCalculator.getLocation(0);
    const err = new ParseError(`Expected to be ${expected}, but got empty.`, undefined, 0, loc.line, loc.column);
    fixErrorLocation(err, locationCalculator);
    throw err;
}
function throwUnexpectedTokenError(name, token) {
    const err = new ParseError(`Unexpected token '${name}'.`, undefined, token.range[0], token.loc.start.line, token.loc.start.column);
    throw err;
}
function throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator) {
    if (ParseError.isParseError(err)) {
        const endOffset = locationCalculator.getOffsetWithGap(code.length);
        if (err.index >= endOffset) {
            err.message = "Unexpected end of expression.";
        }
    }
    throw err;
}
function parseScriptFragment(code, locationCalculator, parserOptions) {
    return parseScriptFragmentWithOption(code, locationCalculator, parserOptions);
}
function parseScriptFragmentWithOption(code, locationCalculator, parserOptions, processOptions) {
    try {
        const result = parseScript$1(code, parserOptions);
        processOptions?.preFixLocationProcess?.(result);
        fixLocations(result, locationCalculator);
        return result;
    }
    catch (err) {
        const perr = ParseError.normalize(err);
        if (perr) {
            fixErrorLocation(perr, locationCalculator);
            throw perr;
        }
        throw err;
    }
}
const validDivisionCharRE = /[\w).+\-_$\]]/u;
function splitFilters(exp) {
    const result = [];
    let inSingle = false;
    let inDouble = false;
    let inTemplateString = false;
    let inRegex = false;
    let curly = 0;
    let square = 0;
    let paren = 0;
    let lastFilterIndex = 0;
    let c = 0;
    let prev = 0;
    for (let i = 0; i < exp.length; i++) {
        prev = c;
        c = exp.charCodeAt(i);
        if (inSingle) {
            if (c === 0x27 && prev !== 0x5c) {
                inSingle = false;
            }
        }
        else if (inDouble) {
            if (c === 0x22 && prev !== 0x5c) {
                inDouble = false;
            }
        }
        else if (inTemplateString) {
            if (c === 0x60 && prev !== 0x5c) {
                inTemplateString = false;
            }
        }
        else if (inRegex) {
            if (c === 0x2f && prev !== 0x5c) {
                inRegex = false;
            }
        }
        else if (c === 0x7c &&
            exp.charCodeAt(i + 1) !== 0x7c &&
            exp.charCodeAt(i - 1) !== 0x7c &&
            !curly &&
            !square &&
            !paren) {
            result.push(exp.slice(lastFilterIndex, i));
            lastFilterIndex = i + 1;
        }
        else {
            switch (c) {
                case 0x22:
                    inDouble = true;
                    break;
                case 0x27:
                    inSingle = true;
                    break;
                case 0x60:
                    inTemplateString = true;
                    break;
                case 0x28:
                    paren++;
                    break;
                case 0x29:
                    paren--;
                    break;
                case 0x5b:
                    square++;
                    break;
                case 0x5d:
                    square--;
                    break;
                case 0x7b:
                    curly++;
                    break;
                case 0x7d:
                    curly--;
                    break;
            }
            if (c === 0x2f) {
                let j = i - 1;
                let p;
                for (; j >= 0; j--) {
                    p = exp.charAt(j);
                    if (p !== " ") {
                        break;
                    }
                }
                if (!p || !validDivisionCharRE.test(p)) {
                    inRegex = true;
                }
            }
        }
    }
    result.push(exp.slice(lastFilterIndex));
    return result;
}
function parseExpressionBody(code, locationCalculator, parserOptions, allowEmpty = false) {
    debug('[script] parse expression: "0(%s)"', code);
    try {
        const result = parseScriptFragment(`0(${code})`, locationCalculator.getSubCalculatorShift(-2), parserOptions);
        const { ast } = result;
        const tokens = ast.tokens ?? [];
        const comments = ast.comments ?? [];
        const references = analyzeExternalReferences(result, parserOptions);
        const statement = ast.body[0];
        const callExpression = statement.expression;
        const expression = callExpression.arguments[0];
        if (!allowEmpty && !expression) {
            return throwEmptyError(locationCalculator, "an expression");
        }
        if (expression?.type === "SpreadElement") {
            return throwUnexpectedTokenError("...", expression);
        }
        if (callExpression.arguments[1]) {
            const node = callExpression.arguments[1];
            return throwUnexpectedTokenError(",", getCommaTokenBeforeNode(tokens, node) || node);
        }
        tokens.shift();
        tokens.shift();
        tokens.pop();
        return { expression, tokens, comments, references, variables: [] };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function parseFilter(code, locationCalculator, parserOptions) {
    debug('[script] parse filter: "%s"', code);
    try {
        const expression = {
            type: "VFilter",
            parent: null,
            range: [0, 0],
            loc: {},
            callee: null,
            arguments: [],
        };
        const tokens = [];
        const comments = [];
        const references = [];
        const paren = code.indexOf("(");
        const calleeCode = paren === -1 ? code : code.slice(0, paren);
        const argsCode = paren === -1 ? null : code.slice(paren);
        if (calleeCode.trim()) {
            const spaces = /^\s*/u.exec(calleeCode)[0];
            const subCalculator = locationCalculator.getSubCalculatorShift(spaces.length);
            const { ast } = parseScriptFragment(`"${calleeCode.trim()}"`, subCalculator, parserOptions);
            const statement = ast.body[0];
            const callee = statement.expression;
            if (callee.type !== "Literal") {
                const { loc, range } = ast.tokens[0];
                return throwUnexpectedTokenError('"', {
                    range: [range[1] - 1, range[1]],
                    loc: {
                        start: {
                            line: loc.end.line,
                            column: loc.end.column - 1,
                        },
                        end: loc.end,
                    },
                });
            }
            expression.callee = {
                type: "Identifier",
                parent: expression,
                range: [
                    callee.range[0],
                    subCalculator.getOffsetWithGap(calleeCode.trim().length),
                ],
                loc: {
                    start: callee.loc.start,
                    end: subCalculator.getLocation(calleeCode.trim().length),
                },
                name: String(callee.value),
            };
            tokens.push({
                type: "Identifier",
                value: calleeCode.trim(),
                range: expression.callee.range,
                loc: expression.callee.loc,
            });
        }
        else {
            return throwEmptyError(locationCalculator, "a filter name");
        }
        if (argsCode != null) {
            const result = parseScriptFragment(`0${argsCode}`, locationCalculator
                .getSubCalculatorAfter(paren)
                .getSubCalculatorShift(-1), parserOptions);
            const { ast } = result;
            const statement = ast.body[0];
            const callExpression = statement.expression;
            ast.tokens.shift();
            if (callExpression.type !== "CallExpression" ||
                callExpression.callee.type !== "Literal") {
                let nestCount = 1;
                for (const token of ast.tokens.slice(1)) {
                    if (nestCount === 0) {
                        return throwUnexpectedTokenError(token.value, token);
                    }
                    if (token.type === "Punctuator" && token.value === "(") {
                        nestCount += 1;
                    }
                    if (token.type === "Punctuator" && token.value === ")") {
                        nestCount -= 1;
                    }
                }
                const token = last__default["default"](ast.tokens);
                return throwUnexpectedTokenError(token.value, token);
            }
            for (const argument of callExpression.arguments) {
                argument.parent = expression;
                expression.arguments.push(argument);
            }
            tokens.push(...ast.tokens);
            comments.push(...ast.comments);
            references.push(...analyzeExternalReferences(result, parserOptions));
        }
        const firstToken = tokens[0];
        const lastToken = last__default["default"](tokens);
        expression.range = [firstToken.range[0], lastToken.range[1]];
        expression.loc = { start: firstToken.loc.start, end: lastToken.loc.end };
        return { expression, tokens, comments, references, variables: [] };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function loadParser(parser) {
    if (parser !== "espree") {
        return require(parser);
    }
    return getEspree();
}
function parseScript$1(code, parserOptions) {
    const parser = typeof parserOptions.parser === "string"
        ? loadParser(parserOptions.parser)
        : isParserObject(parserOptions.parser)
            ? parserOptions.parser
            : getEspree();
    const result = isEnhancedParserObject(parser)
        ? parser.parseForESLint(code, parserOptions)
        : parser.parse(code, parserOptions);
    if (result.ast != null) {
        return result;
    }
    return { ast: result };
}
function parseScriptElement(node, sfcCode, linesAndColumns, originalParserOptions) {
    const parserOptions = {
        ...originalParserOptions,
        ecmaVersion: originalParserOptions.ecmaVersion ?? DEFAULT_ECMA_VERSION,
    };
    let generic = null;
    let code;
    let offset;
    const textNode = node.children[0];
    if (textNode?.type === "VText") {
        const [scriptStartOffset, scriptEndOffset] = textNode.range;
        code = sfcCode.slice(scriptStartOffset, scriptEndOffset);
        offset = scriptStartOffset;
        generic = extractGeneric(node);
        if (generic) {
            const defineTypesCode = `${generic.defineTypes
                .map((e) => e.define)
                .join(";")};\n`;
            code = defineTypesCode + code;
            offset -= defineTypesCode.length;
        }
    }
    else {
        code = "";
        offset = node.startTag.range[1];
    }
    const locationCalculator = linesAndColumns.createOffsetLocationCalculator(offset);
    const result = parseScriptFragment(code, locationCalculator, parserOptions);
    if (generic) {
        generic.postprocess({
            result,
            isRemoveTarget(nodeOrToken) {
                return nodeOrToken.range[1] <= textNode.range[0];
            },
            getTypeDefScope(scopeManager) {
                return (scopeManager.globalScope.childScopes.find((s) => s.type === "module") ?? scopeManager.globalScope);
            },
        });
        const startToken = [
            result.ast.body[0],
            result.ast.tokens?.[0],
            result.ast.comments?.[0],
        ]
            .filter((e) => Boolean(e))
            .sort((a, b) => a.range[0] - b.range[0])
            .find((t) => Boolean(t));
        if (startToken && result.ast.range[0] !== startToken.range[0]) {
            result.ast.range[0] = startToken.range[0];
            if (result.ast.start != null) {
                result.ast.start = startToken.start;
            }
            result.ast.loc.start = { ...startToken.loc.start };
        }
    }
    if (result.ast.tokens != null) {
        const startTag = node.startTag;
        const endTag = node.endTag;
        result.ast.tokens.unshift({
            type: "Punctuator",
            range: startTag.range,
            loc: startTag.loc,
            value: "<script>",
        });
        if (endTag != null) {
            result.ast.tokens.push({
                type: "Punctuator",
                range: endTag.range,
                loc: endTag.loc,
                value: "</script>",
            });
        }
    }
    return result;
}
function parseExpression(code, locationCalculator, parserOptions, { allowEmpty = false, allowFilters = false } = {}) {
    debug('[script] parse expression: "%s"', code);
    const [mainCode, ...filterCodes] = allowFilters && (parserOptions.vueFeatures?.filter ?? true)
        ? splitFilters(code)
        : [code];
    if (filterCodes.length === 0) {
        return parseExpressionBody(code, locationCalculator, parserOptions, allowEmpty);
    }
    const retB = parseExpressionBody(mainCode, locationCalculator, parserOptions);
    if (!retB.expression) {
        return retB;
    }
    const ret = retB;
    ret.expression = {
        type: "VFilterSequenceExpression",
        parent: null,
        expression: retB.expression,
        filters: [],
        range: [...retB.expression.range],
        loc: { ...retB.expression.loc },
    };
    ret.expression.expression.parent = ret.expression;
    let prevLoc = mainCode.length;
    for (const filterCode of filterCodes) {
        ret.tokens.push(fixLocation({
            type: "Punctuator",
            value: "|",
            range: [prevLoc, prevLoc + 1],
            loc: {},
        }, locationCalculator));
        const retF = parseFilter(filterCode, locationCalculator.getSubCalculatorShift(prevLoc + 1), parserOptions);
        if (retF) {
            if (retF.expression) {
                ret.expression.filters.push(retF.expression);
                retF.expression.parent = ret.expression;
            }
            ret.tokens.push(...retF.tokens);
            ret.comments.push(...retF.comments);
            ret.references.push(...retF.references);
        }
        prevLoc += 1 + filterCode.length;
    }
    const lastToken = last__default["default"](ret.tokens);
    ret.expression.range[1] = lastToken.range[1];
    ret.expression.loc.end = lastToken.loc.end;
    return ret;
}
function parseVForExpression(code, locationCalculator, parserOptions) {
    if (code.trim() === "") {
        throwEmptyError(locationCalculator, "'<alias> in <expression>'");
    }
    if (isEcmaVersion5(parserOptions)) {
        return parseVForExpressionForEcmaVersion5(code, locationCalculator, parserOptions);
    }
    const processed = processVForAliasAndIterator(code);
    if (!processed.aliases.trim()) {
        return throwEmptyError(locationCalculator, "an alias");
    }
    try {
        debug('[script] parse v-for expression: "for(%s%s%s);"', processed.aliasesWithBrackets, processed.delimiter, processed.iterator);
        const result = parseScriptFragment(`for(let ${processed.aliasesWithBrackets}${processed.delimiter}${processed.iterator});`, locationCalculator.getSubCalculatorShift(processed.hasParens ? -8 : -9), parserOptions);
        const { ast } = result;
        const tokens = ast.tokens ?? [];
        const comments = ast.comments ?? [];
        const scope = analyzeVariablesAndExternalReferences(result, "v-for", parserOptions);
        const references = scope.references;
        const variables = scope.variables;
        const statement = ast.body[0];
        const varDecl = statement.left;
        const id = varDecl.declarations[0].id;
        const left = id.elements;
        const right = statement.right;
        if (!processed.hasParens && !left.length) {
            return throwEmptyError(locationCalculator, "an alias");
        }
        tokens.shift();
        tokens.shift();
        tokens.shift();
        tokens.pop();
        tokens.pop();
        const closeOffset = statement.left.range[1] - 1;
        const closeIndex = tokens.findIndex((t) => t.range[0] === closeOffset);
        if (processed.hasParens) {
            const open = tokens[0];
            if (open != null) {
                open.value = "(";
            }
            const close = tokens[closeIndex];
            if (close != null) {
                close.value = ")";
            }
        }
        else {
            tokens.splice(closeIndex, 1);
            tokens.shift();
        }
        const firstToken = tokens[0] || statement.left;
        const lastToken = tokens[tokens.length - 1] || statement.right;
        const expression = {
            type: "VForExpression",
            range: [firstToken.range[0], lastToken.range[1]],
            loc: { start: firstToken.loc.start, end: lastToken.loc.end },
            parent: DUMMY_PARENT$2,
            left,
            right,
        };
        for (const l of left) {
            if (l != null) {
                l.parent = expression;
            }
        }
        right.parent = expression;
        return { expression, tokens, comments, references, variables };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function isEcmaVersion5(parserOptions) {
    const ecmaVersion = getEcmaVersionIfUseEspree(parserOptions);
    return ecmaVersion != null && ecmaVersion <= 5;
}
function parseVForExpressionForEcmaVersion5(code, locationCalculator, parserOptions) {
    const processed = processVForAliasAndIterator(code);
    if (!processed.aliases.trim()) {
        return throwEmptyError(locationCalculator, "an alias");
    }
    try {
        const tokens = [];
        const comments = [];
        const parsedAliases = parseVForAliasesForEcmaVersion5(processed.aliasesWithBrackets, locationCalculator.getSubCalculatorShift(processed.hasParens ? 0 : -1), parserOptions);
        if (processed.hasParens) {
            const open = parsedAliases.tokens[0];
            if (open != null) {
                open.value = "(";
            }
            const close = last__default["default"](parsedAliases.tokens);
            if (close != null) {
                close.value = ")";
            }
        }
        else {
            parsedAliases.tokens.shift();
            parsedAliases.tokens.pop();
        }
        tokens.push(...parsedAliases.tokens);
        comments.push(...parsedAliases.comments);
        const { left, variables } = parsedAliases;
        if (!processed.hasParens && !left.length) {
            return throwEmptyError(locationCalculator, "an alias");
        }
        const delimiterStart = processed.aliases.length;
        const delimiterEnd = delimiterStart + processed.delimiter.length;
        tokens.push(fixLocation({
            type: processed.delimiter === "in" ? "Keyword" : "Identifier",
            value: processed.delimiter,
            start: delimiterStart,
            end: delimiterEnd,
            loc: {},
            range: [delimiterStart, delimiterEnd],
        }, locationCalculator));
        const parsedIterator = parseVForIteratorForEcmaVersion5(processed.iterator, locationCalculator.getSubCalculatorShift(delimiterEnd), parserOptions);
        tokens.push(...parsedIterator.tokens);
        comments.push(...parsedIterator.comments);
        const { right, references } = parsedIterator;
        const firstToken = tokens[0];
        const lastToken = last__default["default"](tokens) || firstToken;
        const expression = {
            type: "VForExpression",
            range: [firstToken.range[0], lastToken.range[1]],
            loc: { start: firstToken.loc.start, end: lastToken.loc.end },
            parent: DUMMY_PARENT$2,
            left,
            right,
        };
        for (const l of left) {
            if (l != null) {
                l.parent = expression;
            }
        }
        right.parent = expression;
        return { expression, tokens, comments, references, variables };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function parseVForAliasesForEcmaVersion5(code, locationCalculator, parserOptions) {
    const result = parseScriptFragment(`0(${code})`, locationCalculator.getSubCalculatorShift(-2), parserOptions);
    const { ast } = result;
    const tokens = ast.tokens ?? [];
    const comments = ast.comments ?? [];
    const variables = analyzeExternalReferences(result, parserOptions).map(transformVariable);
    const statement = ast.body[0];
    const callExpression = statement.expression;
    const expression = callExpression.arguments[0];
    const left = expression.elements.filter((e) => {
        if (e == null || e.type === "Identifier") {
            return true;
        }
        const errorToken = tokens.find((t) => e.range[0] <= t.range[0] && t.range[1] <= e.range[1]);
        return throwUnexpectedTokenError(errorToken.value, errorToken);
    });
    tokens.shift();
    tokens.shift();
    tokens.pop();
    return { left, tokens, comments, variables };
    function transformVariable(reference) {
        const ret = {
            id: reference.id,
            kind: "v-for",
            references: [],
        };
        Object.defineProperty(ret, "references", { enumerable: false });
        return ret;
    }
}
function parseVForIteratorForEcmaVersion5(code, locationCalculator, parserOptions) {
    const result = parseScriptFragment(`0(${code})`, locationCalculator.getSubCalculatorShift(-2), parserOptions);
    const { ast } = result;
    const tokens = ast.tokens ?? [];
    const comments = ast.comments ?? [];
    const references = analyzeExternalReferences(result, parserOptions);
    const statement = ast.body[0];
    const callExpression = statement.expression;
    const expression = callExpression.arguments[0];
    if (!expression) {
        return throwEmptyError(locationCalculator, "an expression");
    }
    if (expression?.type === "SpreadElement") {
        return throwUnexpectedTokenError("...", expression);
    }
    const right = expression;
    tokens.shift();
    tokens.shift();
    tokens.pop();
    return { right, tokens, comments, references };
}
function parseVOnExpression(code, locationCalculator, parserOptions) {
    if (IS_FUNCTION_EXPRESSION.test(code) || IS_SIMPLE_PATH.test(code)) {
        return parseExpressionBody(code, locationCalculator, parserOptions);
    }
    return parseVOnExpressionBody(code, locationCalculator, parserOptions);
}
function parseVOnExpressionBody(code, locationCalculator, parserOptions) {
    debug('[script] parse v-on expression: "void function($event){%s}"', code);
    if (code.trim() === "") {
        throwEmptyError(locationCalculator, "statements");
    }
    try {
        const result = parseScriptFragment(`void function($event){${code}}`, locationCalculator.getSubCalculatorShift(-22), parserOptions);
        const { ast } = result;
        const references = analyzeExternalReferences(result, parserOptions);
        const outermostStatement = ast.body[0];
        const functionDecl = outermostStatement.expression.argument;
        const block = functionDecl.body;
        const body = block.body;
        const firstStatement = first__default["default"](body);
        const lastStatement = last__default["default"](body);
        const expression = {
            type: "VOnExpression",
            range: [
                firstStatement != null
                    ? firstStatement.range[0]
                    : block.range[0] + 1,
                lastStatement != null
                    ? lastStatement.range[1]
                    : block.range[1] - 1,
            ],
            loc: {
                start: firstStatement != null
                    ? firstStatement.loc.start
                    : locationCalculator.getLocation(1),
                end: lastStatement != null
                    ? lastStatement.loc.end
                    : locationCalculator.getLocation(code.length + 1),
            },
            parent: DUMMY_PARENT$2,
            body,
        };
        const tokens = ast.tokens ?? [];
        const comments = ast.comments ?? [];
        for (const b of body) {
            b.parent = expression;
        }
        tokens.splice(0, 6);
        tokens.pop();
        return { expression, tokens, comments, references, variables: [] };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function parseSlotScopeExpression(code, locationCalculator, parserOptions) {
    debug('[script] parse slot-scope expression: "void function(%s) {}"', code);
    if (code.trim() === "") {
        throwEmptyError(locationCalculator, "an identifier or an array/object pattern");
    }
    try {
        const result = parseScriptFragment(`void function(${code}) {}`, locationCalculator.getSubCalculatorShift(-14), parserOptions);
        const { ast } = result;
        const statement = ast.body[0];
        const rawExpression = statement.expression;
        const functionDecl = rawExpression.argument;
        const params = functionDecl.params;
        if (params.length === 0) {
            return {
                expression: null,
                tokens: [],
                comments: [],
                references: [],
                variables: [],
            };
        }
        const tokens = ast.tokens ?? [];
        const comments = ast.comments ?? [];
        const scope = analyzeVariablesAndExternalReferences(result, "scope", parserOptions);
        const references = scope.references;
        const variables = scope.variables;
        const firstParam = first__default["default"](params);
        const lastParam = last__default["default"](params);
        const expression = {
            type: "VSlotScopeExpression",
            range: [firstParam.range[0], lastParam.range[1]],
            loc: { start: firstParam.loc.start, end: lastParam.loc.end },
            parent: DUMMY_PARENT$2,
            params: functionDecl.params,
        };
        for (const param of params) {
            param.parent = expression;
        }
        tokens.shift();
        tokens.shift();
        tokens.shift();
        tokens.pop();
        tokens.pop();
        tokens.pop();
        return { expression, tokens, comments, references, variables };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}
function parseGenericExpression(code, locationCalculator, parserOptions) {
    debug('[script] parse generic definition: "void function<%s>() {}"', code);
    if (code.trim() === "") {
        throwEmptyError(locationCalculator, "a type parameter");
    }
    function getParams(result) {
        const { ast } = result;
        const statement = ast.body[0];
        const rawExpression = statement.expression;
        const classDecl = rawExpression.argument;
        const typeParameters = classDecl
            .typeParameters;
        return typeParameters?.params;
    }
    try {
        const rawParams = [];
        const scriptLet = `void function<${code}>(){}`;
        const result = parseScriptFragmentWithOption(scriptLet, locationCalculator.getSubCalculatorShift(-14), { ...parserOptions, project: undefined, projectService: undefined }, {
            preFixLocationProcess(preResult) {
                const params = getParams(preResult);
                if (params) {
                    for (const param of params) {
                        rawParams.push(scriptLet.slice(param.range[0], param.range[1]));
                    }
                }
            },
        });
        const { ast } = result;
        const params = getParams(result);
        if (!params || params.length === 0) {
            return {
                expression: null,
                tokens: [],
                comments: [],
                references: [],
                variables: [],
            };
        }
        const tokens = ast.tokens ?? [];
        const comments = ast.comments ?? [];
        const scope = analyzeVariablesAndExternalReferences(result, "generic", parserOptions);
        const references = scope.references;
        const variables = scope.variables;
        const firstParam = first__default["default"](params);
        const lastParam = last__default["default"](params);
        const expression = {
            type: "VGenericExpression",
            range: [firstParam.range[0], lastParam.range[1]],
            loc: { start: firstParam.loc.start, end: lastParam.loc.end },
            parent: DUMMY_PARENT$2,
            params,
            rawParams,
        };
        for (const param of params) {
            ;
            param.parent = expression;
        }
        tokens.shift();
        tokens.shift();
        tokens.shift();
        tokens.pop();
        tokens.pop();
        tokens.pop();
        tokens.pop();
        tokens.pop();
        return { expression, tokens, comments, references, variables };
    }
    catch (err) {
        return throwErrorAsAdjustingOutsideOfCode(err, code, locationCalculator);
    }
}

function replaceTokens(document, node, newTokens) {
    if (document == null) {
        return;
    }
    const index = sortedIndexBy__default["default"](document.tokens, node, byRange0);
    const count = sortedLastIndexBy__default["default"](document.tokens, node, byRange1) - index;
    document.tokens.splice(index, count, ...newTokens);
}
function replaceAndSplitTokens(document, node, newTokens) {
    if (document == null) {
        return;
    }
    const index = sortedIndexBy__default["default"](document.tokens, node, byRange0);
    if (document.tokens.length === index ||
        node.range[0] < document.tokens[index].range[0]) {
        const beforeToken = document.tokens[index - 1];
        const value = beforeToken.value;
        const splitOffset = node.range[0] - beforeToken.range[0];
        const afterToken = {
            type: beforeToken.type,
            range: [node.range[0], beforeToken.range[1]],
            loc: {
                start: { ...node.loc.start },
                end: { ...beforeToken.loc.end },
            },
            value: value.slice(splitOffset),
        };
        beforeToken.range[1] = node.range[0];
        beforeToken.loc.end = { ...node.loc.start };
        beforeToken.value = value.slice(0, splitOffset);
        document.tokens.splice(index, 0, afterToken);
    }
    let lastIndex = sortedLastIndexBy__default["default"](document.tokens, node, byRange1);
    if (lastIndex === 0 ||
        node.range[1] < document.tokens[lastIndex].range[1]) {
        const beforeToken = document.tokens[lastIndex];
        const value = beforeToken.value;
        const splitOffset = beforeToken.range[1] -
            beforeToken.range[0] -
            (beforeToken.range[1] - node.range[1]);
        const afterToken = {
            type: beforeToken.type,
            range: [node.range[1], beforeToken.range[1]],
            loc: {
                start: { ...node.loc.end },
                end: { ...beforeToken.loc.end },
            },
            value: value.slice(splitOffset),
        };
        beforeToken.range[1] = node.range[1];
        beforeToken.loc.end = { ...node.loc.end };
        beforeToken.value = value.slice(0, splitOffset);
        document.tokens.splice(lastIndex + 1, 0, afterToken);
        lastIndex++;
    }
    const count = lastIndex - index;
    document.tokens.splice(index, count, ...newTokens);
}
function insertComments(document, newComments) {
    if (document == null || newComments.length === 0) {
        return;
    }
    const index = sortedIndexBy__default["default"](document.comments, newComments[0], byRange0);
    document.comments.splice(index, 0, ...newComments);
}
function createSimpleToken(type, start, end, value, linesAndColumns) {
    return {
        type,
        range: [start, end],
        loc: {
            start: linesAndColumns.getLocFromIndex(start),
            end: linesAndColumns.getLocFromIndex(end),
        },
        value,
    };
}
function byRange0(x) {
    return x.range[0];
}
function byRange1(x) {
    return x.range[1];
}

function insertError(document, error) {
    if (document == null) {
        return;
    }
    const index = sortedIndexBy__default["default"](document.errors, error, byIndex);
    document.errors.splice(index, 0, error);
}
function byIndex(x) {
    return x.index;
}

function camelize(str) {
    return str.replace(/-(\w)/gu, (_, c) => (c ? c.toUpperCase() : ""));
}

const shorthandSign = /^[.:@#]/u;
const shorthandNameMap = { ":": "bind", ".": "bind", "@": "on", "#": "slot" };
const invalidDynamicArgumentNextChar = /^[\s\r\n=/>]$/u;
function getTagName$1(startTagOrElement, isSFC) {
    return isSFC ? startTagOrElement.rawName : startTagOrElement.name;
}
function parseDirectiveKeyStatically(node, document) {
    const { name: text, rawName: rawText, range: [offset], loc: { start: { column, line }, }, } = node;
    const directiveKey = {
        type: "VDirectiveKey",
        range: node.range,
        loc: node.loc,
        parent: node.parent,
        name: null,
        argument: null,
        modifiers: [],
    };
    let i = 0;
    function createIdentifier(start, end, name) {
        return {
            type: "VIdentifier",
            parent: directiveKey,
            range: [offset + start, offset + end],
            loc: {
                start: { column: column + start, line },
                end: { column: column + end, line },
            },
            name: name || text.slice(start, end),
            rawName: rawText.slice(start, end),
        };
    }
    if (shorthandSign.test(text)) {
        const sign = text[0];
        directiveKey.name = createIdentifier(0, 1, shorthandNameMap[sign]);
        i = 1;
    }
    else {
        const colon = text.indexOf(":");
        if (colon !== -1) {
            directiveKey.name = createIdentifier(0, colon);
            i = colon + 1;
        }
    }
    if (directiveKey.name != null && text[i] === "[") {
        const len = text.slice(i).lastIndexOf("]");
        if (len !== -1) {
            directiveKey.argument = createIdentifier(i, i + len + 1);
            i = i + len + 1 + (text[i + len + 1] === "." ? 1 : 0);
        }
    }
    const modifiers = text
        .slice(i)
        .split(".")
        .map((modifierName) => {
        const modifier = createIdentifier(i, i + modifierName.length);
        if (modifierName === "" && i < text.length) {
            insertError(document, new ParseError(`Unexpected token '${text[i]}'`, undefined, offset + i, line, column + i));
        }
        i += modifierName.length + 1;
        return modifier;
    });
    if (directiveKey.name == null) {
        directiveKey.name = modifiers.shift();
    }
    else if (directiveKey.argument == null && modifiers[0].name !== "") {
        directiveKey.argument = modifiers.shift() ?? null;
    }
    directiveKey.modifiers = modifiers.filter(isNotEmptyModifier);
    if (directiveKey.name.name === "v-") {
        insertError(document, new ParseError(`Unexpected token '${text[directiveKey.name.range[1] - offset]}'`, undefined, directiveKey.name.range[1], directiveKey.name.loc.end.line, directiveKey.name.loc.end.column));
    }
    if (directiveKey.name.rawName === "." &&
        !directiveKey.modifiers.some(isPropModifier)) {
        const pos = (directiveKey.argument || directiveKey.name).range[1] - offset;
        const propModifier = createIdentifier(pos, pos, "prop");
        directiveKey.modifiers.unshift(propModifier);
    }
    return directiveKey;
}
function isPropModifier(node) {
    return node.name === "prop";
}
function isNotEmptyModifier(node) {
    return node.name !== "";
}
function parseDirectiveKeyTokens(node) {
    const { name, argument, modifiers } = node;
    const shorthand = name.range[1] - name.range[0] === 1;
    const tokens = [];
    if (shorthand) {
        tokens.push({
            type: "Punctuator",
            range: name.range,
            loc: name.loc,
            value: name.rawName,
        });
    }
    else {
        tokens.push({
            type: "HTMLIdentifier",
            range: name.range,
            loc: name.loc,
            value: name.rawName,
        });
        if (argument) {
            tokens.push({
                type: "Punctuator",
                range: [name.range[1], argument.range[0]],
                loc: { start: name.loc.end, end: argument.loc.start },
                value: ":",
            });
        }
    }
    if (argument) {
        tokens.push({
            type: "HTMLIdentifier",
            range: argument.range,
            loc: argument.loc,
            value: argument.rawName,
        });
    }
    let lastNode = argument || name;
    for (const modifier of modifiers) {
        if (modifier.rawName === "") {
            continue;
        }
        tokens.push({
            type: "Punctuator",
            range: [lastNode.range[1], modifier.range[0]],
            loc: { start: lastNode.loc.end, end: modifier.loc.start },
            value: ".",
        }, {
            type: "HTMLIdentifier",
            range: modifier.range,
            loc: modifier.loc,
            value: modifier.rawName,
        });
        lastNode = modifier;
    }
    return tokens;
}
function convertDynamicArgument(node, document, parserOptions, locationCalculator) {
    const { argument } = node;
    if (!(argument != null &&
        argument.type === "VIdentifier" &&
        argument.name.startsWith("[") &&
        argument.name.endsWith("]"))) {
        return;
    }
    const { rawName, range, loc } = argument;
    try {
        const { comments, expression, references, tokens } = parseExpression(rawName.slice(1, -1), locationCalculator.getSubCalculatorAfter(range[0] + 1), parserOptions);
        node.argument = {
            type: "VExpressionContainer",
            range,
            loc,
            parent: node,
            expression,
            references,
        };
        if (expression != null) {
            expression.parent = node.argument;
        }
        tokens.unshift(createSimpleToken("Punctuator", range[0], range[0] + 1, "[", locationCalculator));
        tokens.push(createSimpleToken("Punctuator", range[1] - 1, range[1], "]", locationCalculator));
        replaceTokens(document, node.argument, tokens);
        insertComments(document, comments);
    }
    catch (error) {
        debug("[template] Parse error: %s", error);
        if (ParseError.isParseError(error)) {
            node.argument = {
                type: "VExpressionContainer",
                range,
                loc,
                parent: node,
                expression: null,
                references: [],
            };
            insertError(document, error);
        }
        else {
            throw error;
        }
    }
}
function createDirectiveKey(node, document, parserOptions, locationCalculator) {
    const directiveKey = parseDirectiveKeyStatically(node, document);
    const tokens = parseDirectiveKeyTokens(directiveKey);
    replaceTokens(document, directiveKey, tokens);
    if (directiveKey.name.name.startsWith("v-")) {
        directiveKey.name.name = directiveKey.name.name.slice(2);
    }
    if (directiveKey.name.rawName.startsWith("v-")) {
        directiveKey.name.rawName = directiveKey.name.rawName.slice(2);
    }
    convertDynamicArgument(directiveKey, document, parserOptions, locationCalculator);
    return directiveKey;
}
function parseAttributeValue(code, parserOptions, scriptParserOptions, globalLocationCalculator, node, element, directiveKey) {
    const firstChar = code[node.range[0]];
    const quoted = firstChar === '"' || firstChar === "'";
    const locationCalculator = globalLocationCalculator.getSubCalculatorAfter(node.range[0] + (quoted ? 1 : 0));
    const directiveKind = getStandardDirectiveKind(parserOptions, element, directiveKey);
    let result;
    if (quoted && node.value === "") {
        result = {
            expression: null,
            tokens: [],
            comments: [],
            variables: [],
            references: [],
        };
    }
    else if (directiveKind === "for") {
        result = parseVForExpression(node.value, locationCalculator, parserOptions);
    }
    else if (directiveKind === "on" && directiveKey.argument != null) {
        result = parseVOnExpression(node.value, locationCalculator, parserOptions);
    }
    else if (directiveKind === "slot") {
        result = parseSlotScopeExpression(node.value, locationCalculator, parserOptions);
    }
    else if (directiveKind === "bind") {
        result = parseExpression(node.value, locationCalculator, parserOptions, { allowFilters: true });
    }
    else if (directiveKind === "generic") {
        result = parseGenericExpression(node.value, locationCalculator, scriptParserOptions);
    }
    else {
        result = parseExpression(node.value, locationCalculator, parserOptions);
    }
    if (quoted) {
        result.tokens.unshift(createSimpleToken("Punctuator", node.range[0], node.range[0] + 1, firstChar, globalLocationCalculator));
        result.tokens.push(createSimpleToken("Punctuator", node.range[1] - 1, node.range[1], firstChar, globalLocationCalculator));
    }
    return result;
}
function getStandardDirectiveKind(parserOptions, element, directiveKey) {
    const directiveName = directiveKey.name.name;
    if (directiveName === "for") {
        return "for";
    }
    else if (directiveName === "on") {
        return "on";
    }
    else if (directiveName === "slot" ||
        directiveName === "slot-scope" ||
        (directiveName === "scope" &&
            getTagName$1(element, isSFCFile(parserOptions)) === "template")) {
        return "slot";
    }
    else if (directiveName === "bind") {
        return "bind";
    }
    else if (directiveName === "generic" &&
        element.parent.type === "VDocumentFragment" &&
        getTagName$1(element, isSFCFile(parserOptions)) === "script" &&
        isScriptSetupElement(element) &&
        isTSLang(element)) {
        return "generic";
    }
    return null;
}
function resolveReference(referene, element) {
    let node = element;
    while (node?.type === "VElement") {
        for (const variable of node.variables) {
            if (variable.id.name === referene.id.name) {
                referene.variable = variable;
                variable.references.push(referene);
                return;
            }
        }
        node = node.parent;
    }
}
function convertToDirective(code, parserOptions, scriptParserOptions, locationCalculator, node) {
    debug('[template] convert to directive: %s="%s" %j', node.key.name, node.value?.value, node.range);
    const document = getOwnerDocument(node);
    const directive = node;
    directive.directive = true;
    directive.key = createDirectiveKey(node.key, document, parserOptions, locationCalculator);
    const { argument } = directive.key;
    if (argument?.type === "VIdentifier" && argument.name.startsWith("[")) {
        const nextChar = code[argument.range[1]];
        if (nextChar == null || invalidDynamicArgumentNextChar.test(nextChar)) {
            const char = nextChar == null ? "EOF" : JSON.stringify(nextChar).slice(1, -1);
            insertError(document, new ParseError(`Dynamic argument cannot contain the '${char}' character.`, undefined, argument.range[1], argument.loc.end.line, argument.loc.end.column));
        }
    }
    if (node.value == null) {
        if (directive.key.name.name === "bind") {
            convertForVBindSameNameShorthandValue(directive, parserOptions, locationCalculator);
        }
        return;
    }
    try {
        const ret = parseAttributeValue(code, parserOptions, scriptParserOptions, locationCalculator, node.value, node.parent.parent, directive.key);
        directive.value = {
            type: "VExpressionContainer",
            range: node.value.range,
            loc: node.value.loc,
            parent: directive,
            expression: ret.expression,
            references: ret.references,
        };
        if (ret.expression != null) {
            ret.expression.parent = directive.value;
        }
        for (const variable of ret.variables) {
            node.parent.parent.variables.push(variable);
        }
        replaceTokens(document, node.value, ret.tokens);
        insertComments(document, ret.comments);
    }
    catch (err) {
        debug("[template] Parse error: %s", err);
        if (ParseError.isParseError(err)) {
            directive.value = {
                type: "VExpressionContainer",
                range: node.value.range,
                loc: node.value.loc,
                parent: directive,
                expression: null,
                references: [],
            };
            insertError(document, err);
        }
        else {
            throw err;
        }
    }
}
function convertForVBindSameNameShorthandValue(directive, parserOptions, locationCalculator) {
    if (directive.key.name.name !== "bind" ||
        directive.key.argument == null ||
        directive.key.argument.type !== "VIdentifier") {
        return;
    }
    const vId = directive.key.argument;
    const camelName = camelize(vId.rawName);
    let result = null;
    try {
        result = parseScriptFragment(camelName, locationCalculator.getSubCalculatorAfter(vId.range[0]), parserOptions);
    }
    catch (err) {
        debug("[template] Parse error: %s", err);
    }
    if (result == null ||
        result.ast.body.length !== 1 ||
        result.ast.body[0].type !== "ExpressionStatement" ||
        result.ast.body[0].expression.type !== "Identifier") {
        return;
    }
    const id = result.ast.body[0].expression;
    id.range[1] = vId.range[1];
    id.loc.end = { ...vId.loc.end };
    if (id.end != null) {
        id.end = vId.end;
    }
    directive.value = {
        type: "VExpressionContainer",
        range: [...vId.range],
        loc: {
            start: { ...vId.loc.start },
            end: { ...vId.loc.end },
        },
        parent: directive,
        expression: id,
        references: [
            {
                id,
                mode: "r",
                variable: null,
            },
        ],
    };
    id.parent = directive.value;
}
function processMustache(parserOptions, globalLocationCalculator, node, mustache) {
    const range = [
        mustache.startToken.range[1],
        mustache.endToken.range[0],
    ];
    debug("[template] convert mustache {{%s}} %j", mustache.value, range);
    const document = getOwnerDocument(node);
    try {
        const locationCalculator = globalLocationCalculator.getSubCalculatorAfter(range[0]);
        const ret = parseExpression(mustache.value, locationCalculator, parserOptions, { allowEmpty: true, allowFilters: true });
        node.expression = ret.expression ?? null;
        node.references = ret.references;
        if (ret.expression != null) {
            ret.expression.parent = node;
        }
        replaceTokens(document, { range }, ret.tokens);
        insertComments(document, ret.comments);
    }
    catch (err) {
        debug("[template] Parse error: %s", err);
        if (ParseError.isParseError(err)) {
            insertError(document, err);
        }
        else {
            throw err;
        }
    }
}
function resolveReferences(container) {
    let element = container.parent;
    while (element != null && element.type !== "VElement") {
        element = element.parent;
    }
    if (element != null) {
        for (const reference of container.references) {
            resolveReference(reference, element);
        }
    }
}

const SVG_ATTRIBUTE_NAME_MAP = new Map([
    ["attributename", "attributeName"],
    ["attributetype", "attributeType"],
    ["basefrequency", "baseFrequency"],
    ["baseprofile", "baseProfile"],
    ["calcmode", "calcMode"],
    ["clippathunits", "clipPathUnits"],
    ["diffuseconstant", "diffuseConstant"],
    ["edgemode", "edgeMode"],
    ["filterunits", "filterUnits"],
    ["glyphref", "glyphRef"],
    ["gradienttransform", "gradientTransform"],
    ["gradientunits", "gradientUnits"],
    ["kernelmatrix", "kernelMatrix"],
    ["kernelunitlength", "kernelUnitLength"],
    ["keypoints", "keyPoints"],
    ["keysplines", "keySplines"],
    ["keytimes", "keyTimes"],
    ["lengthadjust", "lengthAdjust"],
    ["limitingconeangle", "limitingConeAngle"],
    ["markerheight", "markerHeight"],
    ["markerunits", "markerUnits"],
    ["markerwidth", "markerWidth"],
    ["maskcontentunits", "maskContentUnits"],
    ["maskunits", "maskUnits"],
    ["numoctaves", "numOctaves"],
    ["pathlength", "pathLength"],
    ["patterncontentunits", "patternContentUnits"],
    ["patterntransform", "patternTransform"],
    ["patternunits", "patternUnits"],
    ["pointsatx", "pointsAtX"],
    ["pointsaty", "pointsAtY"],
    ["pointsatz", "pointsAtZ"],
    ["preservealpha", "preserveAlpha"],
    ["preserveaspectratio", "preserveAspectRatio"],
    ["primitiveunits", "primitiveUnits"],
    ["refx", "refX"],
    ["refy", "refY"],
    ["repeatcount", "repeatCount"],
    ["repeatdur", "repeatDur"],
    ["requiredextensions", "requiredExtensions"],
    ["requiredfeatures", "requiredFeatures"],
    ["specularconstant", "specularConstant"],
    ["specularexponent", "specularExponent"],
    ["spreadmethod", "spreadMethod"],
    ["startoffset", "startOffset"],
    ["stddeviation", "stdDeviation"],
    ["stitchtiles", "stitchTiles"],
    ["surfacescale", "surfaceScale"],
    ["systemlanguage", "systemLanguage"],
    ["tablevalues", "tableValues"],
    ["targetx", "targetX"],
    ["targety", "targetY"],
    ["textlength", "textLength"],
    ["viewbox", "viewBox"],
    ["viewtarget", "viewTarget"],
    ["xchannelselector", "xChannelSelector"],
    ["ychannelselector", "yChannelSelector"],
    ["zoomandpan", "zoomAndPan"],
]);
const MATHML_ATTRIBUTE_NAME_MAP = new Map([
    ["definitionurl", "definitionUrl"]
]);

const HTML_VOID_ELEMENT_TAGS = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
]);
const HTML_CAN_BE_LEFT_OPEN_TAGS = new Set([
    "colgroup", "li", "options", "p", "td", "tfoot", "th", "thead",
    "tr", "source",
]);
const HTML_NON_FHRASING_TAGS = new Set([
    "address", "article", "aside", "base", "blockquote", "body", "caption",
    "col", "colgroup", "dd", "details", "dialog", "div", "dl", "dt", "fieldset",
    "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5",
    "h6", "head", "header", "hgroup", "hr", "html", "legend", "li", "menuitem",
    "meta", "optgroup", "option", "param", "rp", "rt", "source", "style",
    "summary", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track",
]);
const HTML_RCDATA_TAGS = new Set([
    "title", "textarea",
]);
const HTML_RAWTEXT_TAGS = new Set([
    "style", "xmp", "iframe", "noembed", "noframes", "noscript", "script",
]);
const SVG_TAGS$1 = new Set([
    "a", "altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor",
    "animateMotion", "animateTransform", "animation", "audio", "canvas",
    "circle", "clipPath", "color-profile", "cursor", "defs", "desc", "discard",
    "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
    "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
    "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB",
    "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode",
    "feMorphology", "feOffset", "fePointLight", "feSpecularLighting",
    "feSpotLight", "feTile", "feTurbulence", "filter", "font", "font-face",
    "font-face-format", "font-face-name", "font-face-src", "font-face-uri",
    "foreignObject", "g", "glyph", "glyphRef", "handler", "hatch", "hatchpath",
    "hkern", "iframe", "image", "line", "linearGradient", "listener", "marker",
    "mask", "mesh", "meshgradient", "meshpatch", "meshrow", "metadata",
    "missing-glyph", "mpath", "path", "pattern", "polygon", "polyline",
    "prefetch", "radialGradient", "rect", "script", "set", "solidColor",
    "solidcolor", "stop", "style", "svg", "switch", "symbol", "tbreak", "text",
    "textArea", "textPath", "title", "tref", "tspan", "unknown", "use", "video",
    "view", "vkern",
]);
const SVG_ELEMENT_NAME_MAP = new Map();
for (const name of SVG_TAGS$1) {
    if (/[A-Z]/.test(name)) {
        SVG_ELEMENT_NAME_MAP.set(name.toLowerCase(), name);
    }
}

const DUMMY_PARENT$1 = Object.freeze({});
function concat(text, token) {
    return text + token.value;
}
class IntermediateTokenizer {
    tokenizer;
    currentToken;
    attribute;
    attributeNames;
    expressionStartToken;
    expressionTokens;
    tokens;
    comments;
    get text() {
        return this.tokenizer.text;
    }
    get errors() {
        return this.tokenizer.errors;
    }
    get state() {
        return this.tokenizer.state;
    }
    set state(value) {
        this.tokenizer.state = value;
    }
    get namespace() {
        return this.tokenizer.namespace;
    }
    set namespace(value) {
        this.tokenizer.namespace = value;
    }
    get expressionEnabled() {
        return this.tokenizer.expressionEnabled;
    }
    set expressionEnabled(value) {
        this.tokenizer.expressionEnabled = value;
    }
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
        this.currentToken = null;
        this.attribute = null;
        this.attributeNames = new Set();
        this.expressionStartToken = null;
        this.expressionTokens = [];
        this.tokens = [];
        this.comments = [];
    }
    nextToken() {
        let token = null;
        let result = null;
        while (result == null && (token = this.tokenizer.nextToken()) != null) {
            result = this[token.type](token);
        }
        if (result == null && token == null && this.currentToken != null) {
            result = this.commit();
        }
        return result;
    }
    commit() {
        assert__default["default"](this.currentToken != null || this.expressionStartToken != null);
        let token = this.currentToken;
        this.currentToken = null;
        this.attribute = null;
        if (this.expressionStartToken != null) {
            const start = this.expressionStartToken;
            const end = last__default["default"](this.expressionTokens) || start;
            const value = this.expressionTokens.reduce(concat, start.value);
            this.expressionStartToken = null;
            this.expressionTokens = [];
            if (token == null) {
                token = {
                    type: "Text",
                    range: [start.range[0], end.range[1]],
                    loc: { start: start.loc.start, end: end.loc.end },
                    value,
                };
            }
            else if (token.type === "Text") {
                token.range[1] = end.range[1];
                token.loc.end = end.loc.end;
                token.value += value;
            }
            else {
                throw new Error("unreachable");
            }
        }
        return token;
    }
    reportParseError(token, code) {
        const error = ParseError.fromCode(code, token.range[0], token.loc.start.line, token.loc.start.column);
        this.errors.push(error);
        debug("[html] syntax error:", error.message);
    }
    processComment(token) {
        this.comments.push(token);
        if (this.currentToken?.type === "Text") {
            return this.commit();
        }
        return null;
    }
    processText(token) {
        this.tokens.push(token);
        let result = null;
        if (this.expressionStartToken != null) {
            const lastToken = last__default["default"](this.expressionTokens) || this.expressionStartToken;
            if (lastToken.range[1] === token.range[0]) {
                this.expressionTokens.push(token);
                return null;
            }
            result = this.commit();
        }
        else if (this.currentToken != null) {
            if (this.currentToken.type === "Text" &&
                this.currentToken.range[1] === token.range[0]) {
                this.currentToken.value += token.value;
                this.currentToken.range[1] = token.range[1];
                this.currentToken.loc.end = token.loc.end;
                return null;
            }
            result = this.commit();
        }
        assert__default["default"](this.currentToken == null);
        this.currentToken = {
            type: "Text",
            range: [token.range[0], token.range[1]],
            loc: { start: token.loc.start, end: token.loc.end },
            value: token.value,
        };
        return result;
    }
    HTMLAssociation(token) {
        this.tokens.push(token);
        if (this.attribute != null) {
            this.attribute.range[1] = token.range[1];
            this.attribute.loc.end = token.loc.end;
            if (this.currentToken == null ||
                this.currentToken.type !== "StartTag") {
                throw new Error("unreachable");
            }
            this.currentToken.range[1] = token.range[1];
            this.currentToken.loc.end = token.loc.end;
        }
        return null;
    }
    HTMLBogusComment(token) {
        return this.processComment(token);
    }
    HTMLCDataText(token) {
        return this.processText(token);
    }
    HTMLComment(token) {
        return this.processComment(token);
    }
    HTMLEndTagOpen(token) {
        this.tokens.push(token);
        let result = null;
        if (this.currentToken != null || this.expressionStartToken != null) {
            result = this.commit();
        }
        this.currentToken = {
            type: "EndTag",
            range: [token.range[0], token.range[1]],
            loc: { start: token.loc.start, end: token.loc.end },
            name: token.value,
        };
        return result;
    }
    HTMLIdentifier(token) {
        this.tokens.push(token);
        if (this.currentToken == null ||
            this.currentToken.type === "Text" ||
            this.currentToken.type === "Mustache") {
            throw new Error("unreachable");
        }
        if (this.currentToken.type === "EndTag") {
            this.reportParseError(token, "end-tag-with-attributes");
            return null;
        }
        if (this.attributeNames.has(token.value)) {
            this.reportParseError(token, "duplicate-attribute");
        }
        this.attributeNames.add(token.value);
        this.attribute = {
            type: "VAttribute",
            range: [token.range[0], token.range[1]],
            loc: { start: token.loc.start, end: token.loc.end },
            parent: DUMMY_PARENT$1,
            directive: false,
            key: {
                type: "VIdentifier",
                range: [token.range[0], token.range[1]],
                loc: { start: token.loc.start, end: token.loc.end },
                parent: DUMMY_PARENT$1,
                name: token.value,
                rawName: this.text.slice(token.range[0], token.range[1]),
            },
            value: null,
        };
        this.attribute.key.parent = this.attribute;
        this.currentToken.range[1] = token.range[1];
        this.currentToken.loc.end = token.loc.end;
        this.currentToken.attributes.push(this.attribute);
        return null;
    }
    HTMLLiteral(token) {
        this.tokens.push(token);
        if (this.attribute != null) {
            this.attribute.range[1] = token.range[1];
            this.attribute.loc.end = token.loc.end;
            this.attribute.value = {
                type: "VLiteral",
                range: [token.range[0], token.range[1]],
                loc: { start: token.loc.start, end: token.loc.end },
                parent: this.attribute,
                value: token.value,
            };
            if (this.currentToken == null ||
                this.currentToken.type !== "StartTag") {
                throw new Error("unreachable");
            }
            this.currentToken.range[1] = token.range[1];
            this.currentToken.loc.end = token.loc.end;
        }
        return null;
    }
    HTMLRCDataText(token) {
        return this.processText(token);
    }
    HTMLRawText(token) {
        return this.processText(token);
    }
    HTMLSelfClosingTagClose(token) {
        this.tokens.push(token);
        if (this.currentToken == null || this.currentToken.type === "Text") {
            throw new Error("unreachable");
        }
        if (this.currentToken.type === "StartTag") {
            this.currentToken.selfClosing = true;
        }
        else {
            this.reportParseError(token, "end-tag-with-trailing-solidus");
        }
        this.currentToken.range[1] = token.range[1];
        this.currentToken.loc.end = token.loc.end;
        return this.commit();
    }
    HTMLTagClose(token) {
        this.tokens.push(token);
        if (this.currentToken == null || this.currentToken.type === "Text") {
            throw new Error("unreachable");
        }
        this.currentToken.range[1] = token.range[1];
        this.currentToken.loc.end = token.loc.end;
        return this.commit();
    }
    HTMLTagOpen(token) {
        this.tokens.push(token);
        let result = null;
        if (this.currentToken != null || this.expressionStartToken != null) {
            result = this.commit();
        }
        this.currentToken = {
            type: "StartTag",
            range: [token.range[0], token.range[1]],
            loc: { start: token.loc.start, end: token.loc.end },
            name: token.value,
            rawName: this.text.slice(token.range[0] + 1, token.range[1]),
            selfClosing: false,
            attributes: [],
        };
        this.attribute = null;
        this.attributeNames.clear();
        return result;
    }
    HTMLText(token) {
        return this.processText(token);
    }
    HTMLWhitespace(token) {
        return this.processText(token);
    }
    VExpressionStart(token) {
        if (this.expressionStartToken != null) {
            return this.processText(token);
        }
        const separated = this.currentToken != null &&
            this.currentToken.range[1] !== token.range[0];
        const result = separated ? this.commit() : null;
        this.tokens.push(token);
        this.expressionStartToken = token;
        return result;
    }
    VExpressionEnd(token) {
        if (this.expressionStartToken == null) {
            return this.processText(token);
        }
        const start = this.expressionStartToken;
        const end = last__default["default"](this.expressionTokens) || start;
        if (token.range[0] === start.range[1]) {
            this.tokens.pop();
            this.expressionStartToken = null;
            const result = this.processText(start);
            this.processText(token);
            return result;
        }
        if (end.range[1] !== token.range[0]) {
            const result = this.commit();
            this.processText(token);
            return result;
        }
        const value = this.expressionTokens.reduce(concat, "");
        this.tokens.push(token);
        this.expressionStartToken = null;
        this.expressionTokens = [];
        const result = this.currentToken != null ? this.commit() : null;
        this.currentToken = {
            type: "Mustache",
            range: [start.range[0], token.range[1]],
            loc: { start: start.loc.start, end: token.loc.end },
            value,
            startToken: start,
            endToken: token,
        };
        return result || this.commit();
    }
}

const DIRECTIVE_NAME = /^(?:v-|[.:@#]).*[^.:@#]$/u;
const DT_DD = /^d[dt]$/u;
const DUMMY_PARENT = Object.freeze({});
function getTagName(startTagOrElement, isSFC) {
    return isSFC ? startTagOrElement.rawName : startTagOrElement.name;
}
function isMathMLIntegrationPoint(element, isSFC) {
    if (element.namespace === NS.MathML) {
        const name = getTagName(element, isSFC);
        return (name === "mi" ||
            name === "mo" ||
            name === "mn" ||
            name === "ms" ||
            name === "mtext");
    }
    return false;
}
function isHTMLIntegrationPoint(element, isSFC) {
    if (element.namespace === NS.MathML) {
        return (getTagName(element, isSFC) === "annotation-xml" &&
            element.startTag.attributes.some((a) => a.directive === false &&
                a.key.name === "encoding" &&
                a.value != null &&
                (a.value.value === "text/html" ||
                    a.value.value === "application/xhtml+xml")));
    }
    if (element.namespace === NS.SVG) {
        const name = getTagName(element, isSFC);
        return name === "foreignObject" || name === "desc" || name === "title";
    }
    return false;
}
function adjustElementName(name, namespace) {
    if (namespace === NS.SVG) {
        return SVG_ELEMENT_NAME_MAP.get(name) || name;
    }
    return name;
}
function adjustAttributeName(name, namespace) {
    if (namespace === NS.SVG) {
        return SVG_ATTRIBUTE_NAME_MAP.get(name) || name;
    }
    if (namespace === NS.MathML) {
        return MATHML_ATTRIBUTE_NAME_MAP.get(name) || name;
    }
    return name;
}
function propagateEndLocation(node) {
    const lastChild = (node.type === "VElement" ? node.endTag : null) || last__default["default"](node.children);
    if (lastChild != null) {
        node.range[1] = lastChild.range[1];
        node.loc.end = lastChild.loc.end;
    }
}
class Parser {
    tokenizer;
    locationCalculator;
    baseParserOptions;
    isSFC;
    document;
    elementStack;
    vPreElement;
    postProcessesForScript = [];
    get text() {
        return this.tokenizer.text;
    }
    get tokens() {
        return this.tokenizer.tokens;
    }
    get comments() {
        return this.tokenizer.comments;
    }
    get errors() {
        return this.tokenizer.errors;
    }
    get namespace() {
        return this.tokenizer.namespace;
    }
    set namespace(value) {
        this.tokenizer.namespace = value;
    }
    get expressionEnabled() {
        return this.tokenizer.expressionEnabled;
    }
    set expressionEnabled(value) {
        this.tokenizer.expressionEnabled = value;
    }
    get currentNode() {
        return last__default["default"](this.elementStack) || this.document;
    }
    get isInVPreElement() {
        return this.vPreElement != null;
    }
    constructor(tokenizer, parserOptions) {
        this.tokenizer = new IntermediateTokenizer(tokenizer);
        this.locationCalculator = new LocationCalculatorForHtml(tokenizer.gaps, tokenizer.lineTerminators);
        this.baseParserOptions = parserOptions;
        this.isSFC = isSFCFile(parserOptions);
        this.document = {
            type: "VDocumentFragment",
            range: [0, 0],
            loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 0 },
            },
            parent: null,
            children: [],
            tokens: this.tokens,
            comments: this.comments,
            errors: this.errors,
        };
        this.elementStack = [];
        this.vPreElement = null;
        this.postProcessesForScript = [];
    }
    parse() {
        let token = null;
        while ((token = this.tokenizer.nextToken()) != null) {
            this[token.type](token);
        }
        this.popElementStackUntil(0);
        propagateEndLocation(this.document);
        const doc = this.document;
        const htmlParserOptions = {
            ...this.baseParserOptions,
            parser: getScriptParser(this.baseParserOptions.parser, function* () {
                yield "<template>";
                yield getParserLangFromSFC(doc);
            }),
            project: undefined,
            projectService: undefined,
        };
        const scriptParserOptions = {
            ...this.baseParserOptions,
            parser: getScriptParser(this.baseParserOptions.parser, () => getParserLangFromSFC(doc)),
        };
        for (const proc of this.postProcessesForScript) {
            proc(htmlParserOptions, scriptParserOptions);
        }
        this.postProcessesForScript = [];
        return doc;
    }
    reportParseError(token, code) {
        const error = ParseError.fromCode(code, token.range[0], token.loc.start.line, token.loc.start.column);
        this.errors.push(error);
        debug("[html] syntax error:", error.message);
    }
    popElementStack() {
        assert__default["default"](this.elementStack.length >= 1);
        const element = this.elementStack.pop();
        propagateEndLocation(element);
        const current = this.currentNode;
        this.namespace =
            current.type === "VElement" ? current.namespace : NS.HTML;
        if (this.vPreElement === element) {
            this.vPreElement = null;
            this.expressionEnabled = true;
        }
        if (this.elementStack.length === 0) {
            this.expressionEnabled = false;
        }
    }
    popElementStackUntil(index) {
        while (this.elementStack.length > index) {
            this.popElementStack();
        }
    }
    getTagName(startTagOrElement) {
        return getTagName(startTagOrElement, this.isSFC);
    }
    detectNamespace(token) {
        const name = this.getTagName(token);
        let ns = this.namespace;
        if (ns === NS.MathML || ns === NS.SVG) {
            const element = this.currentNode;
            if (element.type === "VElement") {
                if (element.namespace === NS.MathML &&
                    this.getTagName(element) === "annotation-xml" &&
                    name === "svg") {
                    return NS.SVG;
                }
                if (isHTMLIntegrationPoint(element, this.isSFC) ||
                    (isMathMLIntegrationPoint(element, this.isSFC) &&
                        name !== "mglyph" &&
                        name !== "malignmark")) {
                    ns = NS.HTML;
                }
            }
        }
        if (ns === NS.HTML) {
            if (name === "svg") {
                return NS.SVG;
            }
            if (name === "math") {
                return NS.MathML;
            }
        }
        if (name === "template") {
            const xmlns = token.attributes.find((a) => a.key.name === "xmlns");
            const value = xmlns?.value?.value;
            if (value === NS.HTML || value === NS.MathML || value === NS.SVG) {
                return value;
            }
        }
        return ns;
    }
    closeCurrentElementIfNecessary(token) {
        const element = this.currentNode;
        if (element.type !== "VElement") {
            return;
        }
        const name = this.getTagName(token);
        const elementName = this.getTagName(element);
        if (elementName === "p" && HTML_NON_FHRASING_TAGS.has(name)) {
            this.popElementStack();
        }
        if (elementName === name && HTML_CAN_BE_LEFT_OPEN_TAGS.has(name)) {
            this.popElementStack();
        }
        if (DT_DD.test(elementName) && DT_DD.test(name)) {
            this.popElementStack();
        }
    }
    processAttribute(node, namespace) {
        if (this.needConvertToDirective(node)) {
            this.postProcessesForScript.push((parserOptions, scriptParserOptions) => {
                convertToDirective(this.text, parserOptions, scriptParserOptions, this.locationCalculator, node);
            });
            return;
        }
        node.key.name = adjustAttributeName(node.key.name, namespace);
        const key = this.getTagName(node.key);
        const value = node.value?.value;
        if (key === "xmlns" && value !== namespace) {
            this.reportParseError(node, "x-invalid-namespace");
        }
        else if (key === "xmlns:xlink" && value !== NS.XLink) {
            this.reportParseError(node, "x-invalid-namespace");
        }
    }
    needConvertToDirective(node) {
        const element = node.parent.parent;
        const tagName = this.getTagName(element);
        const attrName = this.getTagName(node.key);
        if (attrName === "generic" &&
            element.parent.type === "VDocumentFragment" &&
            isScriptSetupElement(element) &&
            isTSLang(element)) {
            return true;
        }
        const expressionEnabled = this.expressionEnabled ||
            (attrName === "v-pre" && !this.isInVPreElement);
        if (!expressionEnabled) {
            return false;
        }
        return (DIRECTIVE_NAME.test(attrName) ||
            attrName === "slot-scope" ||
            (tagName === "template" && attrName === "scope"));
    }
    processTemplateText(token, templateTokenizerOption) {
        const TemplateTokenizer = typeof templateTokenizerOption === "function"
            ? templateTokenizerOption
            :
                require(templateTokenizerOption);
        const templateTokenizer = new TemplateTokenizer(token.value, this.text, {
            startingLine: token.loc.start.line,
            startingColumn: token.loc.start.column,
        });
        const rootTokenizer = this.tokenizer;
        this.tokenizer = templateTokenizer;
        let templateToken = null;
        while ((templateToken = templateTokenizer.nextToken()) != null) {
            this[templateToken.type](templateToken);
        }
        this.tokenizer = rootTokenizer;
        const index = sortedIndexBy__default["default"](this.tokenizer.tokens, token, (x) => x.range[0]);
        const count = sortedLastIndexBy__default["default"](this.tokenizer.tokens, token, (x) => x.range[1]) -
            index;
        this.tokenizer.tokens.splice(index, count, ...templateTokenizer.tokens);
        this.tokenizer.comments.push(...templateTokenizer.comments);
        this.tokenizer.errors.push(...templateTokenizer.errors);
    }
    StartTag(token) {
        debug("[html] StartTag %j", token);
        this.closeCurrentElementIfNecessary(token);
        const parent = this.currentNode;
        const namespace = this.detectNamespace(token);
        const element = {
            type: "VElement",
            range: [token.range[0], token.range[1]],
            loc: { start: token.loc.start, end: token.loc.end },
            parent,
            name: adjustElementName(token.name, namespace),
            rawName: token.rawName,
            namespace,
            startTag: {
                type: "VStartTag",
                range: token.range,
                loc: token.loc,
                parent: DUMMY_PARENT,
                selfClosing: token.selfClosing,
                attributes: token.attributes,
            },
            children: [],
            endTag: null,
            variables: [],
        };
        const hasVPre = !this.isInVPreElement &&
            token.attributes.some((a) => this.getTagName(a.key) === "v-pre");
        if (hasVPre) {
            this.expressionEnabled = false;
        }
        parent.children.push(element);
        element.startTag.parent = element;
        for (const attribute of token.attributes) {
            attribute.parent = element.startTag;
            this.processAttribute(attribute, namespace);
        }
        this.postProcessesForScript.push(() => {
            for (const attribute of element.startTag.attributes) {
                if (attribute.directive) {
                    if (attribute.key.argument?.type === "VExpressionContainer") {
                        resolveReferences(attribute.key.argument);
                    }
                    if (attribute.value != null) {
                        resolveReferences(attribute.value);
                    }
                }
            }
        });
        const isVoid = namespace === NS.HTML &&
            HTML_VOID_ELEMENT_TAGS.has(this.getTagName(element));
        if (token.selfClosing && !isVoid && namespace === NS.HTML) {
            this.reportParseError(token, "non-void-html-element-start-tag-with-trailing-solidus");
        }
        if (token.selfClosing || isVoid) {
            this.expressionEnabled = !this.isInVPreElement;
            return;
        }
        this.elementStack.push(element);
        if (hasVPre) {
            assert__default["default"](this.vPreElement === null);
            this.vPreElement = element;
        }
        this.namespace = namespace;
        if (namespace === NS.HTML) {
            const elementName = this.getTagName(element);
            if (element.parent.type === "VDocumentFragment") {
                const langAttr = element.startTag.attributes.find((a) => !a.directive && a.key.name === "lang");
                const lang = langAttr?.value?.value;
                if (elementName === "template") {
                    this.expressionEnabled = true;
                    if (lang && lang !== "html") {
                        this.tokenizer.state = "RAWTEXT";
                        this.expressionEnabled = false;
                    }
                }
                else if (this.isSFC) {
                    if (!lang || lang !== "html") {
                        this.tokenizer.state = "RAWTEXT";
                    }
                }
                else {
                    if (HTML_RCDATA_TAGS.has(elementName)) {
                        this.tokenizer.state = "RCDATA";
                    }
                    if (HTML_RAWTEXT_TAGS.has(elementName)) {
                        this.tokenizer.state = "RAWTEXT";
                    }
                }
            }
            else {
                if (HTML_RCDATA_TAGS.has(elementName)) {
                    this.tokenizer.state = "RCDATA";
                }
                if (HTML_RAWTEXT_TAGS.has(elementName)) {
                    this.tokenizer.state = "RAWTEXT";
                }
            }
        }
    }
    EndTag(token) {
        debug("[html] EndTag %j", token);
        const i = findLastIndex__default["default"](this.elementStack, (el) => el.name.toLowerCase() === token.name);
        if (i === -1) {
            this.reportParseError(token, "x-invalid-end-tag");
            return;
        }
        const element = this.elementStack[i];
        element.endTag = {
            type: "VEndTag",
            range: token.range,
            loc: token.loc,
            parent: element,
        };
        this.popElementStackUntil(i);
    }
    Text(token) {
        debug("[html] Text %j", token);
        const parent = this.currentNode;
        if (token.value &&
            parent.type === "VElement" &&
            parent.name === "template" &&
            parent.parent.type === "VDocumentFragment") {
            const langAttribute = parent.startTag.attributes.find((a) => a.key.name === "lang");
            const lang = langAttribute?.value?.value;
            if (lang && lang !== "html") {
                const templateTokenizerOption = this.baseParserOptions.templateTokenizer?.[lang];
                if (templateTokenizerOption) {
                    this.processTemplateText(token, templateTokenizerOption);
                    return;
                }
            }
        }
        parent.children.push({
            type: "VText",
            range: token.range,
            loc: token.loc,
            parent,
            value: token.value,
        });
    }
    Mustache(token) {
        debug("[html] Mustache %j", token);
        const parent = this.currentNode;
        const container = {
            type: "VExpressionContainer",
            range: token.range,
            loc: token.loc,
            parent,
            expression: null,
            references: [],
        };
        parent.children.push(container);
        this.postProcessesForScript.push((parserOptions) => {
            processMustache(parserOptions, this.locationCalculator, container, token);
            resolveReferences(container);
        });
    }
}

const alternativeCR = new Map([[128, 8364], [130, 8218], [131, 402], [132, 8222], [133, 8230], [134, 8224], [135, 8225], [136, 710], [137, 8240], [138, 352], [139, 8249], [140, 338], [142, 381], [145, 8216], [146, 8217], [147, 8220], [148, 8221], [149, 8226], [150, 8211], [151, 8212], [152, 732], [153, 8482], [154, 353], [155, 8250], [156, 339], [158, 382], [159, 376]]);

const entitySets = [{ "length": 32, "entities": { "CounterClockwiseContourIntegral;": [8755] } }, { "length": 25, "entities": { "ClockwiseContourIntegral;": [8754], "DoubleLongLeftRightArrow;": [10234] } }, { "length": 24, "entities": { "NotNestedGreaterGreater;": [10914, 824] } }, { "length": 23, "entities": { "DiacriticalDoubleAcute;": [733], "NotSquareSupersetEqual;": [8931] } }, { "length": 22, "entities": { "CloseCurlyDoubleQuote;": [8221], "DoubleContourIntegral;": [8751], "FilledVerySmallSquare;": [9642], "NegativeVeryThinSpace;": [8203], "NotPrecedesSlantEqual;": [8928], "NotRightTriangleEqual;": [8941], "NotSucceedsSlantEqual;": [8929] } }, { "length": 21, "entities": { "CapitalDifferentialD;": [8517], "DoubleLeftRightArrow;": [8660], "DoubleLongRightArrow;": [10233], "EmptyVerySmallSquare;": [9643], "NestedGreaterGreater;": [8811], "NotDoubleVerticalBar;": [8742], "NotGreaterSlantEqual;": [10878, 824], "NotLeftTriangleEqual;": [8940], "NotSquareSubsetEqual;": [8930], "OpenCurlyDoubleQuote;": [8220], "ReverseUpEquilibrium;": [10607] } }, { "length": 20, "entities": { "DoubleLongLeftArrow;": [10232], "DownLeftRightVector;": [10576], "LeftArrowRightArrow;": [8646], "NegativeMediumSpace;": [8203], "NotGreaterFullEqual;": [8807, 824], "NotRightTriangleBar;": [10704, 824], "RightArrowLeftArrow;": [8644], "SquareSupersetEqual;": [8850], "leftrightsquigarrow;": [8621] } }, { "length": 19, "entities": { "DownRightTeeVector;": [10591], "DownRightVectorBar;": [10583], "LongLeftRightArrow;": [10231], "Longleftrightarrow;": [10234], "NegativeThickSpace;": [8203], "NotLeftTriangleBar;": [10703, 824], "PrecedesSlantEqual;": [8828], "ReverseEquilibrium;": [8651], "RightDoubleBracket;": [10215], "RightDownTeeVector;": [10589], "RightDownVectorBar;": [10581], "RightTriangleEqual;": [8885], "SquareIntersection;": [8851], "SucceedsSlantEqual;": [8829], "blacktriangleright;": [9656], "longleftrightarrow;": [10231] } }, { "length": 18, "entities": { "DoubleUpDownArrow;": [8661], "DoubleVerticalBar;": [8741], "DownLeftTeeVector;": [10590], "DownLeftVectorBar;": [10582], "FilledSmallSquare;": [9724], "GreaterSlantEqual;": [10878], "LeftDoubleBracket;": [10214], "LeftDownTeeVector;": [10593], "LeftDownVectorBar;": [10585], "LeftTriangleEqual;": [8884], "NegativeThinSpace;": [8203], "NotGreaterGreater;": [8811, 824], "NotLessSlantEqual;": [10877, 824], "NotNestedLessLess;": [10913, 824], "NotReverseElement;": [8716], "NotSquareSuperset;": [8848, 824], "NotTildeFullEqual;": [8775], "RightAngleBracket;": [10217], "RightUpDownVector;": [10575], "SquareSubsetEqual;": [8849], "VerticalSeparator;": [10072], "blacktriangledown;": [9662], "blacktriangleleft;": [9666], "leftrightharpoons;": [8651], "rightleftharpoons;": [8652], "twoheadrightarrow;": [8608] } }, { "length": 17, "entities": { "DiacriticalAcute;": [180], "DiacriticalGrave;": [96], "DiacriticalTilde;": [732], "DoubleRightArrow;": [8658], "DownArrowUpArrow;": [8693], "EmptySmallSquare;": [9723], "GreaterEqualLess;": [8923], "GreaterFullEqual;": [8807], "LeftAngleBracket;": [10216], "LeftUpDownVector;": [10577], "LessEqualGreater;": [8922], "NonBreakingSpace;": [160], "NotPrecedesEqual;": [10927, 824], "NotRightTriangle;": [8939], "NotSucceedsEqual;": [10928, 824], "NotSucceedsTilde;": [8831, 824], "NotSupersetEqual;": [8841], "RightTriangleBar;": [10704], "RightUpTeeVector;": [10588], "RightUpVectorBar;": [10580], "UnderParenthesis;": [9181], "UpArrowDownArrow;": [8645], "circlearrowright;": [8635], "downharpoonright;": [8642], "ntrianglerighteq;": [8941], "rightharpoondown;": [8641], "rightrightarrows;": [8649], "twoheadleftarrow;": [8606], "vartriangleright;": [8883] } }, { "length": 16, "entities": { "CloseCurlyQuote;": [8217], "ContourIntegral;": [8750], "DoubleDownArrow;": [8659], "DoubleLeftArrow;": [8656], "DownRightVector;": [8641], "LeftRightVector;": [10574], "LeftTriangleBar;": [10703], "LeftUpTeeVector;": [10592], "LeftUpVectorBar;": [10584], "LowerRightArrow;": [8600], "NotGreaterEqual;": [8817], "NotGreaterTilde;": [8821], "NotHumpDownHump;": [8782, 824], "NotLeftTriangle;": [8938], "NotSquareSubset;": [8847, 824], "OverParenthesis;": [9180], "RightDownVector;": [8642], "ShortRightArrow;": [8594], "UpperRightArrow;": [8599], "bigtriangledown;": [9661], "circlearrowleft;": [8634], "curvearrowright;": [8631], "downharpoonleft;": [8643], "leftharpoondown;": [8637], "leftrightarrows;": [8646], "nLeftrightarrow;": [8654], "nleftrightarrow;": [8622], "ntrianglelefteq;": [8940], "rightleftarrows;": [8644], "rightsquigarrow;": [8605], "rightthreetimes;": [8908], "straightepsilon;": [1013], "trianglerighteq;": [8885], "vartriangleleft;": [8882] } }, { "length": 15, "entities": { "DiacriticalDot;": [729], "DoubleRightTee;": [8872], "DownLeftVector;": [8637], "GreaterGreater;": [10914], "HorizontalLine;": [9472], "InvisibleComma;": [8291], "InvisibleTimes;": [8290], "LeftDownVector;": [8643], "LeftRightArrow;": [8596], "Leftrightarrow;": [8660], "LessSlantEqual;": [10877], "LongRightArrow;": [10230], "Longrightarrow;": [10233], "LowerLeftArrow;": [8601], "NestedLessLess;": [8810], "NotGreaterLess;": [8825], "NotLessGreater;": [8824], "NotSubsetEqual;": [8840], "NotVerticalBar;": [8740], "OpenCurlyQuote;": [8216], "ReverseElement;": [8715], "RightTeeVector;": [10587], "RightVectorBar;": [10579], "ShortDownArrow;": [8595], "ShortLeftArrow;": [8592], "SquareSuperset;": [8848], "TildeFullEqual;": [8773], "UpperLeftArrow;": [8598], "ZeroWidthSpace;": [8203], "curvearrowleft;": [8630], "doublebarwedge;": [8966], "downdownarrows;": [8650], "hookrightarrow;": [8618], "leftleftarrows;": [8647], "leftrightarrow;": [8596], "leftthreetimes;": [8907], "longrightarrow;": [10230], "looparrowright;": [8620], "nshortparallel;": [8742], "ntriangleright;": [8939], "rightarrowtail;": [8611], "rightharpoonup;": [8640], "trianglelefteq;": [8884], "upharpoonright;": [8638] } }, { "length": 14, "entities": { "ApplyFunction;": [8289], "DifferentialD;": [8518], "DoubleLeftTee;": [10980], "DoubleUpArrow;": [8657], "LeftTeeVector;": [10586], "LeftVectorBar;": [10578], "LessFullEqual;": [8806], "LongLeftArrow;": [10229], "Longleftarrow;": [10232], "NotEqualTilde;": [8770, 824], "NotTildeEqual;": [8772], "NotTildeTilde;": [8777], "Poincareplane;": [8460], "PrecedesEqual;": [10927], "PrecedesTilde;": [8830], "RightArrowBar;": [8677], "RightTeeArrow;": [8614], "RightTriangle;": [8883], "RightUpVector;": [8638], "SucceedsEqual;": [10928], "SucceedsTilde;": [8831], "SupersetEqual;": [8839], "UpEquilibrium;": [10606], "VerticalTilde;": [8768], "VeryThinSpace;": [8202], "bigtriangleup;": [9651], "blacktriangle;": [9652], "divideontimes;": [8903], "fallingdotseq;": [8786], "hookleftarrow;": [8617], "leftarrowtail;": [8610], "leftharpoonup;": [8636], "longleftarrow;": [10229], "looparrowleft;": [8619], "measuredangle;": [8737], "ntriangleleft;": [8938], "shortparallel;": [8741], "smallsetminus;": [8726], "triangleright;": [9657], "upharpoonleft;": [8639], "varsubsetneqq;": [10955, 65024], "varsupsetneqq;": [10956, 65024] } }, { "length": 13, "entities": { "DownArrowBar;": [10515], "DownTeeArrow;": [8615], "ExponentialE;": [8519], "GreaterEqual;": [8805], "GreaterTilde;": [8819], "HilbertSpace;": [8459], "HumpDownHump;": [8782], "Intersection;": [8898], "LeftArrowBar;": [8676], "LeftTeeArrow;": [8612], "LeftTriangle;": [8882], "LeftUpVector;": [8639], "NotCongruent;": [8802], "NotHumpEqual;": [8783, 824], "NotLessEqual;": [8816], "NotLessTilde;": [8820], "Proportional;": [8733], "RightCeiling;": [8969], "RoundImplies;": [10608], "ShortUpArrow;": [8593], "SquareSubset;": [8847], "UnderBracket;": [9141], "VerticalLine;": [124], "blacklozenge;": [10731], "exponentiale;": [8519], "risingdotseq;": [8787], "triangledown;": [9663], "triangleleft;": [9667], "varsubsetneq;": [8842, 65024], "varsupsetneq;": [8843, 65024] } }, { "length": 12, "entities": { "CircleMinus;": [8854], "CircleTimes;": [8855], "Equilibrium;": [8652], "GreaterLess;": [8823], "LeftCeiling;": [8968], "LessGreater;": [8822], "MediumSpace;": [8287], "NotLessLess;": [8810, 824], "NotPrecedes;": [8832], "NotSucceeds;": [8833], "NotSuperset;": [8835, 8402], "OverBracket;": [9140], "RightVector;": [8640], "Rrightarrow;": [8667], "RuleDelayed;": [10740], "SmallCircle;": [8728], "SquareUnion;": [8852], "SubsetEqual;": [8838], "UpDownArrow;": [8597], "Updownarrow;": [8661], "VerticalBar;": [8739], "backepsilon;": [1014], "blacksquare;": [9642], "circledcirc;": [8858], "circleddash;": [8861], "curlyeqprec;": [8926], "curlyeqsucc;": [8927], "diamondsuit;": [9830], "eqslantless;": [10901], "expectation;": [8496], "nRightarrow;": [8655], "nrightarrow;": [8603], "preccurlyeq;": [8828], "precnapprox;": [10937], "quaternions;": [8461], "straightphi;": [981], "succcurlyeq;": [8829], "succnapprox;": [10938], "thickapprox;": [8776], "updownarrow;": [8597] } }, { "length": 11, "entities": { "Bernoullis;": [8492], "CirclePlus;": [8853], "EqualTilde;": [8770], "Fouriertrf;": [8497], "ImaginaryI;": [8520], "Laplacetrf;": [8466], "LeftVector;": [8636], "Lleftarrow;": [8666], "NotElement;": [8713], "NotGreater;": [8815], "Proportion;": [8759], "RightArrow;": [8594], "RightFloor;": [8971], "Rightarrow;": [8658], "ThickSpace;": [8287, 8202], "TildeEqual;": [8771], "TildeTilde;": [8776], "UnderBrace;": [9183], "UpArrowBar;": [10514], "UpTeeArrow;": [8613], "circledast;": [8859], "complement;": [8705], "curlywedge;": [8911], "eqslantgtr;": [10902], "gtreqqless;": [10892], "lessapprox;": [10885], "lesseqqgtr;": [10891], "lmoustache;": [9136], "longmapsto;": [10236], "mapstodown;": [8615], "mapstoleft;": [8612], "nLeftarrow;": [8653], "nleftarrow;": [8602], "nsubseteqq;": [10949, 824], "nsupseteqq;": [10950, 824], "precapprox;": [10935], "rightarrow;": [8594], "rmoustache;": [9137], "sqsubseteq;": [8849], "sqsupseteq;": [8850], "subsetneqq;": [10955], "succapprox;": [10936], "supsetneqq;": [10956], "upuparrows;": [8648], "varepsilon;": [1013], "varnothing;": [8709] } }, { "length": 10, "entities": { "Backslash;": [8726], "CenterDot;": [183], "CircleDot;": [8857], "Congruent;": [8801], "Coproduct;": [8720], "DoubleDot;": [168], "DownArrow;": [8595], "DownBreve;": [785], "Downarrow;": [8659], "HumpEqual;": [8783], "LeftArrow;": [8592], "LeftFloor;": [8970], "Leftarrow;": [8656], "LessTilde;": [8818], "Mellintrf;": [8499], "MinusPlus;": [8723], "NotCupCap;": [8813], "NotExists;": [8708], "NotSubset;": [8834, 8402], "OverBrace;": [9182], "PlusMinus;": [177], "Therefore;": [8756], "ThinSpace;": [8201], "TripleDot;": [8411], "UnionPlus;": [8846], "backprime;": [8245], "backsimeq;": [8909], "bigotimes;": [10754], "centerdot;": [183], "checkmark;": [10003], "complexes;": [8450], "dotsquare;": [8865], "downarrow;": [8595], "gtrapprox;": [10886], "gtreqless;": [8923], "gvertneqq;": [8809, 65024], "heartsuit;": [9829], "leftarrow;": [8592], "lesseqgtr;": [8922], "lvertneqq;": [8808, 65024], "ngeqslant;": [10878, 824], "nleqslant;": [10877, 824], "nparallel;": [8742], "nshortmid;": [8740], "nsubseteq;": [8840], "nsupseteq;": [8841], "pitchfork;": [8916], "rationals;": [8474], "spadesuit;": [9824], "subseteqq;": [10949], "subsetneq;": [8842], "supseteqq;": [10950], "supsetneq;": [8843], "therefore;": [8756], "triangleq;": [8796], "varpropto;": [8733] } }, { "length": 9, "entities": { "DDotrahd;": [10513], "DotEqual;": [8784], "Integral;": [8747], "LessLess;": [10913], "NotEqual;": [8800], "NotTilde;": [8769], "PartialD;": [8706], "Precedes;": [8826], "RightTee;": [8866], "Succeeds;": [8827], "SuchThat;": [8715], "Superset;": [8835], "Uarrocir;": [10569], "UnderBar;": [95], "andslope;": [10840], "angmsdaa;": [10664], "angmsdab;": [10665], "angmsdac;": [10666], "angmsdad;": [10667], "angmsdae;": [10668], "angmsdaf;": [10669], "angmsdag;": [10670], "angmsdah;": [10671], "angrtvbd;": [10653], "approxeq;": [8778], "awconint;": [8755], "backcong;": [8780], "barwedge;": [8965], "bbrktbrk;": [9142], "bigoplus;": [10753], "bigsqcup;": [10758], "biguplus;": [10756], "bigwedge;": [8896], "boxminus;": [8863], "boxtimes;": [8864], "bsolhsub;": [10184], "capbrcup;": [10825], "circledR;": [174], "circledS;": [9416], "cirfnint;": [10768], "clubsuit;": [9827], "cupbrcap;": [10824], "curlyvee;": [8910], "cwconint;": [8754], "doteqdot;": [8785], "dotminus;": [8760], "drbkarow;": [10512], "dzigrarr;": [10239], "elinters;": [9191], "emptyset;": [8709], "eqvparsl;": [10725], "fpartint;": [10765], "geqslant;": [10878], "gesdotol;": [10884], "gnapprox;": [10890], "hksearow;": [10533], "hkswarow;": [10534], "imagline;": [8464], "imagpart;": [8465], "infintie;": [10717], "integers;": [8484], "intercal;": [8890], "intlarhk;": [10775], "laemptyv;": [10676], "ldrushar;": [10571], "leqslant;": [10877], "lesdotor;": [10883], "llcorner;": [8990], "lnapprox;": [10889], "lrcorner;": [8991], "lurdshar;": [10570], "mapstoup;": [8613], "multimap;": [8888], "naturals;": [8469], "ncongdot;": [10861, 824], "notindot;": [8949, 824], "otimesas;": [10806], "parallel;": [8741], "plusacir;": [10787], "pointint;": [10773], "precneqq;": [10933], "precnsim;": [8936], "profalar;": [9006], "profline;": [8978], "profsurf;": [8979], "raemptyv;": [10675], "realpart;": [8476], "rppolint;": [10770], "rtriltri;": [10702], "scpolint;": [10771], "setminus;": [8726], "shortmid;": [8739], "smeparsl;": [10724], "sqsubset;": [8847], "sqsupset;": [8848], "subseteq;": [8838], "succneqq;": [10934], "succnsim;": [8937], "supseteq;": [8839], "thetasym;": [977], "thicksim;": [8764], "timesbar;": [10801], "triangle;": [9653], "triminus;": [10810], "trpezium;": [9186], "ulcorner;": [8988], "urcorner;": [8989], "varkappa;": [1008], "varsigma;": [962], "vartheta;": [977] } }, { "length": 8, "entities": { "Because;": [8757], "Cayleys;": [8493], "Cconint;": [8752], "Cedilla;": [184], "Diamond;": [8900], "DownTee;": [8868], "Element;": [8712], "Epsilon;": [917], "Implies;": [8658], "LeftTee;": [8867], "NewLine;": [10], "NoBreak;": [8288], "NotLess;": [8814], "Omicron;": [927], "OverBar;": [8254], "Product;": [8719], "UpArrow;": [8593], "Uparrow;": [8657], "Upsilon;": [933], "alefsym;": [8501], "angrtvb;": [8894], "angzarr;": [9084], "asympeq;": [8781], "backsim;": [8765], "because;": [8757], "bemptyv;": [10672], "between;": [8812], "bigcirc;": [9711], "bigodot;": [10752], "bigstar;": [9733], "bnequiv;": [8801, 8421], "boxplus;": [8862], "ccupssm;": [10832], "cemptyv;": [10674], "cirscir;": [10690], "coloneq;": [8788], "congdot;": [10861], "cudarrl;": [10552], "cudarrr;": [10549], "cularrp;": [10557], "curarrm;": [10556], "dbkarow;": [10511], "ddagger;": [8225], "ddotseq;": [10871], "demptyv;": [10673], "diamond;": [8900], "digamma;": [989], "dotplus;": [8724], "dwangle;": [10662], "epsilon;": [949], "eqcolon;": [8789], "equivDD;": [10872], "gesdoto;": [10882], "gtquest;": [10876], "gtrless;": [8823], "harrcir;": [10568], "intprod;": [10812], "isindot;": [8949], "larrbfs;": [10527], "larrsim;": [10611], "lbrksld;": [10639], "lbrkslu;": [10637], "ldrdhar;": [10599], "lesdoto;": [10881], "lessdot;": [8918], "lessgtr;": [8822], "lesssim;": [8818], "lotimes;": [10804], "lozenge;": [9674], "ltquest;": [10875], "luruhar;": [10598], "maltese;": [10016], "minusdu;": [10794], "napprox;": [8777], "natural;": [9838], "nearrow;": [8599], "nexists;": [8708], "notinva;": [8713], "notinvb;": [8951], "notinvc;": [8950], "notniva;": [8716], "notnivb;": [8958], "notnivc;": [8957], "npolint;": [10772], "npreceq;": [10927, 824], "nsqsube;": [8930], "nsqsupe;": [8931], "nsubset;": [8834, 8402], "nsucceq;": [10928, 824], "nsupset;": [8835, 8402], "nvinfin;": [10718], "nvltrie;": [8884, 8402], "nvrtrie;": [8885, 8402], "nwarrow;": [8598], "olcross;": [10683], "omicron;": [959], "orderof;": [8500], "orslope;": [10839], "pertenk;": [8241], "planckh;": [8462], "pluscir;": [10786], "plussim;": [10790], "plustwo;": [10791], "precsim;": [8830], "quatint;": [10774], "questeq;": [8799], "rarrbfs;": [10528], "rarrsim;": [10612], "rbrksld;": [10638], "rbrkslu;": [10640], "rdldhar;": [10601], "realine;": [8475], "rotimes;": [10805], "ruluhar;": [10600], "searrow;": [8600], "simplus;": [10788], "simrarr;": [10610], "subedot;": [10947], "submult;": [10945], "subplus;": [10943], "subrarr;": [10617], "succsim;": [8831], "supdsub;": [10968], "supedot;": [10948], "suphsol;": [10185], "suphsub;": [10967], "suplarr;": [10619], "supmult;": [10946], "supplus;": [10944], "swarrow;": [8601], "topfork;": [10970], "triplus;": [10809], "tritime;": [10811], "uparrow;": [8593], "upsilon;": [965], "uwangle;": [10663], "vzigzag;": [10650], "zigrarr;": [8669] } }, { "length": 7, "entities": { "Aacute;": [193], "Abreve;": [258], "Agrave;": [192], "Assign;": [8788], "Atilde;": [195], "Barwed;": [8966], "Bumpeq;": [8782], "Cacute;": [262], "Ccaron;": [268], "Ccedil;": [199], "Colone;": [10868], "Conint;": [8751], "CupCap;": [8781], "Dagger;": [8225], "Dcaron;": [270], "DotDot;": [8412], "Dstrok;": [272], "Eacute;": [201], "Ecaron;": [282], "Egrave;": [200], "Exists;": [8707], "ForAll;": [8704], "Gammad;": [988], "Gbreve;": [286], "Gcedil;": [290], "HARDcy;": [1066], "Hstrok;": [294], "Iacute;": [205], "Igrave;": [204], "Itilde;": [296], "Jsercy;": [1032], "Kcedil;": [310], "Lacute;": [313], "Lambda;": [923], "Lcaron;": [317], "Lcedil;": [315], "Lmidot;": [319], "Lstrok;": [321], "Nacute;": [323], "Ncaron;": [327], "Ncedil;": [325], "Ntilde;": [209], "Oacute;": [211], "Odblac;": [336], "Ograve;": [210], "Oslash;": [216], "Otilde;": [213], "Otimes;": [10807], "Racute;": [340], "Rarrtl;": [10518], "Rcaron;": [344], "Rcedil;": [342], "SHCHcy;": [1065], "SOFTcy;": [1068], "Sacute;": [346], "Scaron;": [352], "Scedil;": [350], "Square;": [9633], "Subset;": [8912], "Supset;": [8913], "Tcaron;": [356], "Tcedil;": [354], "Tstrok;": [358], "Uacute;": [218], "Ubreve;": [364], "Udblac;": [368], "Ugrave;": [217], "Utilde;": [360], "Vdashl;": [10982], "Verbar;": [8214], "Vvdash;": [8874], "Yacute;": [221], "Zacute;": [377], "Zcaron;": [381], "aacute;": [225], "abreve;": [259], "agrave;": [224], "andand;": [10837], "angmsd;": [8737], "angsph;": [8738], "apacir;": [10863], "approx;": [8776], "atilde;": [227], "barvee;": [8893], "barwed;": [8965], "becaus;": [8757], "bernou;": [8492], "bigcap;": [8898], "bigcup;": [8899], "bigvee;": [8897], "bkarow;": [10509], "bottom;": [8869], "bowtie;": [8904], "boxbox;": [10697], "bprime;": [8245], "brvbar;": [166], "bullet;": [8226], "bumpeq;": [8783], "cacute;": [263], "capand;": [10820], "capcap;": [10827], "capcup;": [10823], "capdot;": [10816], "ccaron;": [269], "ccedil;": [231], "circeq;": [8791], "cirmid;": [10991], "colone;": [8788], "commat;": [64], "compfn;": [8728], "conint;": [8750], "coprod;": [8720], "copysr;": [8471], "cularr;": [8630], "cupcap;": [10822], "cupcup;": [10826], "cupdot;": [8845], "curarr;": [8631], "curren;": [164], "cylcty;": [9005], "dagger;": [8224], "daleth;": [8504], "dcaron;": [271], "dfisht;": [10623], "divide;": [247], "divonx;": [8903], "dlcorn;": [8990], "dlcrop;": [8973], "dollar;": [36], "drcorn;": [8991], "drcrop;": [8972], "dstrok;": [273], "eacute;": [233], "easter;": [10862], "ecaron;": [283], "ecolon;": [8789], "egrave;": [232], "egsdot;": [10904], "elsdot;": [10903], "emptyv;": [8709], "emsp13;": [8196], "emsp14;": [8197], "eparsl;": [10723], "eqcirc;": [8790], "equals;": [61], "equest;": [8799], "female;": [9792], "ffilig;": [64259], "ffllig;": [64260], "forall;": [8704], "frac12;": [189], "frac13;": [8531], "frac14;": [188], "frac15;": [8533], "frac16;": [8537], "frac18;": [8539], "frac23;": [8532], "frac25;": [8534], "frac34;": [190], "frac35;": [8535], "frac38;": [8540], "frac45;": [8536], "frac56;": [8538], "frac58;": [8541], "frac78;": [8542], "gacute;": [501], "gammad;": [989], "gbreve;": [287], "gesdot;": [10880], "gesles;": [10900], "gtlPar;": [10645], "gtrarr;": [10616], "gtrdot;": [8919], "gtrsim;": [8819], "hairsp;": [8202], "hamilt;": [8459], "hardcy;": [1098], "hearts;": [9829], "hellip;": [8230], "hercon;": [8889], "homtht;": [8763], "horbar;": [8213], "hslash;": [8463], "hstrok;": [295], "hybull;": [8259], "hyphen;": [8208], "iacute;": [237], "igrave;": [236], "iiiint;": [10764], "iinfin;": [10716], "incare;": [8453], "inodot;": [305], "intcal;": [8890], "iquest;": [191], "isinsv;": [8947], "itilde;": [297], "jsercy;": [1112], "kappav;": [1008], "kcedil;": [311], "kgreen;": [312], "lAtail;": [10523], "lacute;": [314], "lagran;": [8466], "lambda;": [955], "langle;": [10216], "larrfs;": [10525], "larrhk;": [8617], "larrlp;": [8619], "larrpl;": [10553], "larrtl;": [8610], "latail;": [10521], "lbrace;": [123], "lbrack;": [91], "lcaron;": [318], "lcedil;": [316], "ldquor;": [8222], "lesdot;": [10879], "lesges;": [10899], "lfisht;": [10620], "lfloor;": [8970], "lharul;": [10602], "llhard;": [10603], "lmidot;": [320], "lmoust;": [9136], "loplus;": [10797], "lowast;": [8727], "lowbar;": [95], "lparlt;": [10643], "lrhard;": [10605], "lsaquo;": [8249], "lsquor;": [8218], "lstrok;": [322], "lthree;": [8907], "ltimes;": [8905], "ltlarr;": [10614], "ltrPar;": [10646], "mapsto;": [8614], "marker;": [9646], "mcomma;": [10793], "midast;": [42], "midcir;": [10992], "middot;": [183], "minusb;": [8863], "minusd;": [8760], "mnplus;": [8723], "models;": [8871], "mstpos;": [8766], "nVDash;": [8879], "nVdash;": [8878], "nacute;": [324], "nbumpe;": [8783, 824], "ncaron;": [328], "ncedil;": [326], "nearhk;": [10532], "nequiv;": [8802], "nesear;": [10536], "nexist;": [8708], "nltrie;": [8940], "notinE;": [8953, 824], "nparsl;": [11005, 8421], "nprcue;": [8928], "nrarrc;": [10547, 824], "nrarrw;": [8605, 824], "nrtrie;": [8941], "nsccue;": [8929], "nsimeq;": [8772], "ntilde;": [241], "numero;": [8470], "nvDash;": [8877], "nvHarr;": [10500], "nvdash;": [8876], "nvlArr;": [10498], "nvrArr;": [10499], "nwarhk;": [10531], "nwnear;": [10535], "oacute;": [243], "odblac;": [337], "odsold;": [10684], "ograve;": [242], "ominus;": [8854], "origof;": [8886], "oslash;": [248], "otilde;": [245], "otimes;": [8855], "parsim;": [10995], "percnt;": [37], "period;": [46], "permil;": [8240], "phmmat;": [8499], "planck;": [8463], "plankv;": [8463], "plusdo;": [8724], "plusdu;": [10789], "plusmn;": [177], "preceq;": [10927], "primes;": [8473], "prnsim;": [8936], "propto;": [8733], "prurel;": [8880], "puncsp;": [8200], "qprime;": [8279], "rAtail;": [10524], "racute;": [341], "rangle;": [10217], "rarrap;": [10613], "rarrfs;": [10526], "rarrhk;": [8618], "rarrlp;": [8620], "rarrpl;": [10565], "rarrtl;": [8611], "ratail;": [10522], "rbrace;": [125], "rbrack;": [93], "rcaron;": [345], "rcedil;": [343], "rdquor;": [8221], "rfisht;": [10621], "rfloor;": [8971], "rharul;": [10604], "rmoust;": [9137], "roplus;": [10798], "rpargt;": [10644], "rsaquo;": [8250], "rsquor;": [8217], "rthree;": [8908], "rtimes;": [8906], "sacute;": [347], "scaron;": [353], "scedil;": [351], "scnsim;": [8937], "searhk;": [10533], "seswar;": [10537], "sfrown;": [8994], "shchcy;": [1097], "sigmaf;": [962], "sigmav;": [962], "simdot;": [10858], "smashp;": [10803], "softcy;": [1100], "solbar;": [9023], "spades;": [9824], "sqcaps;": [8851, 65024], "sqcups;": [8852, 65024], "sqsube;": [8849], "sqsupe;": [8850], "square;": [9633], "squarf;": [9642], "ssetmn;": [8726], "ssmile;": [8995], "sstarf;": [8902], "subdot;": [10941], "subset;": [8834], "subsim;": [10951], "subsub;": [10965], "subsup;": [10963], "succeq;": [10928], "supdot;": [10942], "supset;": [8835], "supsim;": [10952], "supsub;": [10964], "supsup;": [10966], "swarhk;": [10534], "swnwar;": [10538], "target;": [8982], "tcaron;": [357], "tcedil;": [355], "telrec;": [8981], "there4;": [8756], "thetav;": [977], "thinsp;": [8201], "thksim;": [8764], "timesb;": [8864], "timesd;": [10800], "topbot;": [9014], "topcir;": [10993], "tprime;": [8244], "tridot;": [9708], "tstrok;": [359], "uacute;": [250], "ubreve;": [365], "udblac;": [369], "ufisht;": [10622], "ugrave;": [249], "ulcorn;": [8988], "ulcrop;": [8975], "urcorn;": [8989], "urcrop;": [8974], "utilde;": [361], "vangrt;": [10652], "varphi;": [981], "varrho;": [1009], "veebar;": [8891], "vellip;": [8942], "verbar;": [124], "vsubnE;": [10955, 65024], "vsubne;": [8842, 65024], "vsupnE;": [10956, 65024], "vsupne;": [8843, 65024], "wedbar;": [10847], "wedgeq;": [8793], "weierp;": [8472], "wreath;": [8768], "xoplus;": [10753], "xotime;": [10754], "xsqcup;": [10758], "xuplus;": [10756], "xwedge;": [8896], "yacute;": [253], "zacute;": [378], "zcaron;": [382], "zeetrf;": [8488] } }, { "length": 6, "entities": { "AElig;": [198], "Aacute": [193], "Acirc;": [194], "Agrave": [192], "Alpha;": [913], "Amacr;": [256], "Aogon;": [260], "Aring;": [197], "Atilde": [195], "Breve;": [728], "Ccedil": [199], "Ccirc;": [264], "Colon;": [8759], "Cross;": [10799], "Dashv;": [10980], "Delta;": [916], "Eacute": [201], "Ecirc;": [202], "Egrave": [200], "Emacr;": [274], "Eogon;": [280], "Equal;": [10869], "Gamma;": [915], "Gcirc;": [284], "Hacek;": [711], "Hcirc;": [292], "IJlig;": [306], "Iacute": [205], "Icirc;": [206], "Igrave": [204], "Imacr;": [298], "Iogon;": [302], "Iukcy;": [1030], "Jcirc;": [308], "Jukcy;": [1028], "Kappa;": [922], "Ntilde": [209], "OElig;": [338], "Oacute": [211], "Ocirc;": [212], "Ograve": [210], "Omacr;": [332], "Omega;": [937], "Oslash": [216], "Otilde": [213], "Prime;": [8243], "RBarr;": [10512], "Scirc;": [348], "Sigma;": [931], "THORN;": [222], "TRADE;": [8482], "TSHcy;": [1035], "Theta;": [920], "Tilde;": [8764], "Uacute": [218], "Ubrcy;": [1038], "Ucirc;": [219], "Ugrave": [217], "Umacr;": [362], "Union;": [8899], "Uogon;": [370], "UpTee;": [8869], "Uring;": [366], "VDash;": [8875], "Vdash;": [8873], "Wcirc;": [372], "Wedge;": [8896], "Yacute": [221], "Ycirc;": [374], "aacute": [225], "acirc;": [226], "acute;": [180], "aelig;": [230], "agrave": [224], "aleph;": [8501], "alpha;": [945], "amacr;": [257], "amalg;": [10815], "angle;": [8736], "angrt;": [8735], "angst;": [197], "aogon;": [261], "aring;": [229], "asymp;": [8776], "atilde": [227], "awint;": [10769], "bcong;": [8780], "bdquo;": [8222], "bepsi;": [1014], "blank;": [9251], "blk12;": [9618], "blk14;": [9617], "blk34;": [9619], "block;": [9608], "boxDL;": [9559], "boxDR;": [9556], "boxDl;": [9558], "boxDr;": [9555], "boxHD;": [9574], "boxHU;": [9577], "boxHd;": [9572], "boxHu;": [9575], "boxUL;": [9565], "boxUR;": [9562], "boxUl;": [9564], "boxUr;": [9561], "boxVH;": [9580], "boxVL;": [9571], "boxVR;": [9568], "boxVh;": [9579], "boxVl;": [9570], "boxVr;": [9567], "boxdL;": [9557], "boxdR;": [9554], "boxdl;": [9488], "boxdr;": [9484], "boxhD;": [9573], "boxhU;": [9576], "boxhd;": [9516], "boxhu;": [9524], "boxuL;": [9563], "boxuR;": [9560], "boxul;": [9496], "boxur;": [9492], "boxvH;": [9578], "boxvL;": [9569], "boxvR;": [9566], "boxvh;": [9532], "boxvl;": [9508], "boxvr;": [9500], "breve;": [728], "brvbar": [166], "bsemi;": [8271], "bsime;": [8909], "bsolb;": [10693], "bumpE;": [10926], "bumpe;": [8783], "caret;": [8257], "caron;": [711], "ccaps;": [10829], "ccedil": [231], "ccirc;": [265], "ccups;": [10828], "cedil;": [184], "check;": [10003], "clubs;": [9827], "colon;": [58], "comma;": [44], "crarr;": [8629], "cross;": [10007], "csube;": [10961], "csupe;": [10962], "ctdot;": [8943], "cuepr;": [8926], "cuesc;": [8927], "cupor;": [10821], "curren": [164], "cuvee;": [8910], "cuwed;": [8911], "cwint;": [8753], "dashv;": [8867], "dblac;": [733], "ddarr;": [8650], "delta;": [948], "dharl;": [8643], "dharr;": [8642], "diams;": [9830], "disin;": [8946], "divide": [247], "doteq;": [8784], "dtdot;": [8945], "dtrif;": [9662], "duarr;": [8693], "duhar;": [10607], "eDDot;": [10871], "eacute": [233], "ecirc;": [234], "efDot;": [8786], "egrave": [232], "emacr;": [275], "empty;": [8709], "eogon;": [281], "eplus;": [10865], "epsiv;": [1013], "eqsim;": [8770], "equiv;": [8801], "erDot;": [8787], "erarr;": [10609], "esdot;": [8784], "exist;": [8707], "fflig;": [64256], "filig;": [64257], "fjlig;": [102, 106], "fllig;": [64258], "fltns;": [9649], "forkv;": [10969], "frac12": [189], "frac14": [188], "frac34": [190], "frasl;": [8260], "frown;": [8994], "gamma;": [947], "gcirc;": [285], "gescc;": [10921], "gimel;": [8503], "gneqq;": [8809], "gnsim;": [8935], "grave;": [96], "gsime;": [10894], "gsiml;": [10896], "gtcir;": [10874], "gtdot;": [8919], "harrw;": [8621], "hcirc;": [293], "hoarr;": [8703], "iacute": [237], "icirc;": [238], "iexcl;": [161], "igrave": [236], "iiint;": [8749], "iiota;": [8489], "ijlig;": [307], "imacr;": [299], "image;": [8465], "imath;": [305], "imped;": [437], "infin;": [8734], "iogon;": [303], "iprod;": [10812], "iquest": [191], "isinE;": [8953], "isins;": [8948], "isinv;": [8712], "iukcy;": [1110], "jcirc;": [309], "jmath;": [567], "jukcy;": [1108], "kappa;": [954], "lAarr;": [8666], "lBarr;": [10510], "langd;": [10641], "laquo;": [171], "larrb;": [8676], "lates;": [10925, 65024], "lbarr;": [10508], "lbbrk;": [10098], "lbrke;": [10635], "lceil;": [8968], "ldquo;": [8220], "lescc;": [10920], "lhard;": [8637], "lharu;": [8636], "lhblk;": [9604], "llarr;": [8647], "lltri;": [9722], "lneqq;": [8808], "lnsim;": [8934], "loang;": [10220], "loarr;": [8701], "lobrk;": [10214], "lopar;": [10629], "lrarr;": [8646], "lrhar;": [8651], "lrtri;": [8895], "lsime;": [10893], "lsimg;": [10895], "lsquo;": [8216], "ltcir;": [10873], "ltdot;": [8918], "ltrie;": [8884], "ltrif;": [9666], "mDDot;": [8762], "mdash;": [8212], "micro;": [181], "middot": [183], "minus;": [8722], "mumap;": [8888], "nabla;": [8711], "napid;": [8779, 824], "napos;": [329], "natur;": [9838], "nbump;": [8782, 824], "ncong;": [8775], "ndash;": [8211], "neArr;": [8663], "nearr;": [8599], "nedot;": [8784, 824], "nesim;": [8770, 824], "ngeqq;": [8807, 824], "ngsim;": [8821], "nhArr;": [8654], "nharr;": [8622], "nhpar;": [10994], "nlArr;": [8653], "nlarr;": [8602], "nleqq;": [8806, 824], "nless;": [8814], "nlsim;": [8820], "nltri;": [8938], "notin;": [8713], "notni;": [8716], "npart;": [8706, 824], "nprec;": [8832], "nrArr;": [8655], "nrarr;": [8603], "nrtri;": [8939], "nsime;": [8772], "nsmid;": [8740], "nspar;": [8742], "nsubE;": [10949, 824], "nsube;": [8840], "nsucc;": [8833], "nsupE;": [10950, 824], "nsupe;": [8841], "ntilde": [241], "numsp;": [8199], "nvsim;": [8764, 8402], "nwArr;": [8662], "nwarr;": [8598], "oacute": [243], "ocirc;": [244], "odash;": [8861], "oelig;": [339], "ofcir;": [10687], "ograve": [242], "ohbar;": [10677], "olarr;": [8634], "olcir;": [10686], "oline;": [8254], "omacr;": [333], "omega;": [969], "operp;": [10681], "oplus;": [8853], "orarr;": [8635], "order;": [8500], "oslash": [248], "otilde": [245], "ovbar;": [9021], "parsl;": [11005], "phone;": [9742], "plusb;": [8862], "pluse;": [10866], "plusmn": [177], "pound;": [163], "prcue;": [8828], "prime;": [8242], "prnap;": [10937], "prsim;": [8830], "quest;": [63], "rAarr;": [8667], "rBarr;": [10511], "radic;": [8730], "rangd;": [10642], "range;": [10661], "raquo;": [187], "rarrb;": [8677], "rarrc;": [10547], "rarrw;": [8605], "ratio;": [8758], "rbarr;": [10509], "rbbrk;": [10099], "rbrke;": [10636], "rceil;": [8969], "rdquo;": [8221], "reals;": [8477], "rhard;": [8641], "rharu;": [8640], "rlarr;": [8644], "rlhar;": [8652], "rnmid;": [10990], "roang;": [10221], "roarr;": [8702], "robrk;": [10215], "ropar;": [10630], "rrarr;": [8649], "rsquo;": [8217], "rtrie;": [8885], "rtrif;": [9656], "sbquo;": [8218], "sccue;": [8829], "scirc;": [349], "scnap;": [10938], "scsim;": [8831], "sdotb;": [8865], "sdote;": [10854], "seArr;": [8664], "searr;": [8600], "setmn;": [8726], "sharp;": [9839], "sigma;": [963], "simeq;": [8771], "simgE;": [10912], "simlE;": [10911], "simne;": [8774], "slarr;": [8592], "smile;": [8995], "smtes;": [10924, 65024], "sqcap;": [8851], "sqcup;": [8852], "sqsub;": [8847], "sqsup;": [8848], "srarr;": [8594], "starf;": [9733], "strns;": [175], "subnE;": [10955], "subne;": [8842], "supnE;": [10956], "supne;": [8843], "swArr;": [8665], "swarr;": [8601], "szlig;": [223], "theta;": [952], "thkap;": [8776], "thorn;": [254], "tilde;": [732], "times;": [215], "trade;": [8482], "trisb;": [10701], "tshcy;": [1115], "twixt;": [8812], "uacute": [250], "ubrcy;": [1118], "ucirc;": [251], "udarr;": [8645], "udhar;": [10606], "ugrave": [249], "uharl;": [8639], "uharr;": [8638], "uhblk;": [9600], "ultri;": [9720], "umacr;": [363], "uogon;": [371], "uplus;": [8846], "upsih;": [978], "uring;": [367], "urtri;": [9721], "utdot;": [8944], "utrif;": [9652], "uuarr;": [8648], "vBarv;": [10985], "vDash;": [8872], "varpi;": [982], "vdash;": [8866], "veeeq;": [8794], "vltri;": [8882], "vnsub;": [8834, 8402], "vnsup;": [8835, 8402], "vprop;": [8733], "vrtri;": [8883], "wcirc;": [373], "wedge;": [8743], "xcirc;": [9711], "xdtri;": [9661], "xhArr;": [10234], "xharr;": [10231], "xlArr;": [10232], "xlarr;": [10229], "xodot;": [10752], "xrArr;": [10233], "xrarr;": [10230], "xutri;": [9651], "yacute": [253], "ycirc;": [375] } }, { "length": 5, "entities": { "AElig": [198], "Acirc": [194], "Aopf;": [120120], "Aring": [197], "Ascr;": [119964], "Auml;": [196], "Barv;": [10983], "Beta;": [914], "Bopf;": [120121], "Bscr;": [8492], "CHcy;": [1063], "COPY;": [169], "Cdot;": [266], "Copf;": [8450], "Cscr;": [119966], "DJcy;": [1026], "DScy;": [1029], "DZcy;": [1039], "Darr;": [8609], "Dopf;": [120123], "Dscr;": [119967], "Ecirc": [202], "Edot;": [278], "Eopf;": [120124], "Escr;": [8496], "Esim;": [10867], "Euml;": [203], "Fopf;": [120125], "Fscr;": [8497], "GJcy;": [1027], "Gdot;": [288], "Gopf;": [120126], "Gscr;": [119970], "Hopf;": [8461], "Hscr;": [8459], "IEcy;": [1045], "IOcy;": [1025], "Icirc": [206], "Idot;": [304], "Iopf;": [120128], "Iota;": [921], "Iscr;": [8464], "Iuml;": [207], "Jopf;": [120129], "Jscr;": [119973], "KHcy;": [1061], "KJcy;": [1036], "Kopf;": [120130], "Kscr;": [119974], "LJcy;": [1033], "Lang;": [10218], "Larr;": [8606], "Lopf;": [120131], "Lscr;": [8466], "Mopf;": [120132], "Mscr;": [8499], "NJcy;": [1034], "Nopf;": [8469], "Nscr;": [119977], "Ocirc": [212], "Oopf;": [120134], "Oscr;": [119978], "Ouml;": [214], "Popf;": [8473], "Pscr;": [119979], "QUOT;": [34], "Qopf;": [8474], "Qscr;": [119980], "Rang;": [10219], "Rarr;": [8608], "Ropf;": [8477], "Rscr;": [8475], "SHcy;": [1064], "Sopf;": [120138], "Sqrt;": [8730], "Sscr;": [119982], "Star;": [8902], "THORN": [222], "TScy;": [1062], "Topf;": [120139], "Tscr;": [119983], "Uarr;": [8607], "Ucirc": [219], "Uopf;": [120140], "Upsi;": [978], "Uscr;": [119984], "Uuml;": [220], "Vbar;": [10987], "Vert;": [8214], "Vopf;": [120141], "Vscr;": [119985], "Wopf;": [120142], "Wscr;": [119986], "Xopf;": [120143], "Xscr;": [119987], "YAcy;": [1071], "YIcy;": [1031], "YUcy;": [1070], "Yopf;": [120144], "Yscr;": [119988], "Yuml;": [376], "ZHcy;": [1046], "Zdot;": [379], "Zeta;": [918], "Zopf;": [8484], "Zscr;": [119989], "acirc": [226], "acute": [180], "aelig": [230], "andd;": [10844], "andv;": [10842], "ange;": [10660], "aopf;": [120146], "apid;": [8779], "apos;": [39], "aring": [229], "ascr;": [119990], "auml;": [228], "bNot;": [10989], "bbrk;": [9141], "beta;": [946], "beth;": [8502], "bnot;": [8976], "bopf;": [120147], "boxH;": [9552], "boxV;": [9553], "boxh;": [9472], "boxv;": [9474], "bscr;": [119991], "bsim;": [8765], "bsol;": [92], "bull;": [8226], "bump;": [8782], "caps;": [8745, 65024], "cdot;": [267], "cedil": [184], "cent;": [162], "chcy;": [1095], "cirE;": [10691], "circ;": [710], "cire;": [8791], "comp;": [8705], "cong;": [8773], "copf;": [120148], "copy;": [169], "cscr;": [119992], "csub;": [10959], "csup;": [10960], "cups;": [8746, 65024], "dArr;": [8659], "dHar;": [10597], "darr;": [8595], "dash;": [8208], "diam;": [8900], "djcy;": [1106], "dopf;": [120149], "dscr;": [119993], "dscy;": [1109], "dsol;": [10742], "dtri;": [9663], "dzcy;": [1119], "eDot;": [8785], "ecir;": [8790], "ecirc": [234], "edot;": [279], "emsp;": [8195], "ensp;": [8194], "eopf;": [120150], "epar;": [8917], "epsi;": [949], "escr;": [8495], "esim;": [8770], "euml;": [235], "euro;": [8364], "excl;": [33], "flat;": [9837], "fnof;": [402], "fopf;": [120151], "fork;": [8916], "fscr;": [119995], "gdot;": [289], "geqq;": [8807], "gesl;": [8923, 65024], "gjcy;": [1107], "gnap;": [10890], "gneq;": [10888], "gopf;": [120152], "gscr;": [8458], "gsim;": [8819], "gtcc;": [10919], "gvnE;": [8809, 65024], "hArr;": [8660], "half;": [189], "harr;": [8596], "hbar;": [8463], "hopf;": [120153], "hscr;": [119997], "icirc": [238], "iecy;": [1077], "iexcl": [161], "imof;": [8887], "iocy;": [1105], "iopf;": [120154], "iota;": [953], "iscr;": [119998], "isin;": [8712], "iuml;": [239], "jopf;": [120155], "jscr;": [119999], "khcy;": [1093], "kjcy;": [1116], "kopf;": [120156], "kscr;": [120000], "lArr;": [8656], "lHar;": [10594], "lang;": [10216], "laquo": [171], "larr;": [8592], "late;": [10925], "lcub;": [123], "ldca;": [10550], "ldsh;": [8626], "leqq;": [8806], "lesg;": [8922, 65024], "ljcy;": [1113], "lnap;": [10889], "lneq;": [10887], "lopf;": [120157], "lozf;": [10731], "lpar;": [40], "lscr;": [120001], "lsim;": [8818], "lsqb;": [91], "ltcc;": [10918], "ltri;": [9667], "lvnE;": [8808, 65024], "macr;": [175], "male;": [9794], "malt;": [10016], "micro": [181], "mlcp;": [10971], "mldr;": [8230], "mopf;": [120158], "mscr;": [120002], "nGtv;": [8811, 824], "nLtv;": [8810, 824], "nang;": [8736, 8402], "napE;": [10864, 824], "nbsp;": [160], "ncap;": [10819], "ncup;": [10818], "ngeq;": [8817], "nges;": [10878, 824], "ngtr;": [8815], "nisd;": [8954], "njcy;": [1114], "nldr;": [8229], "nleq;": [8816], "nles;": [10877, 824], "nmid;": [8740], "nopf;": [120159], "npar;": [8742], "npre;": [10927, 824], "nsce;": [10928, 824], "nscr;": [120003], "nsim;": [8769], "nsub;": [8836], "nsup;": [8837], "ntgl;": [8825], "ntlg;": [8824], "nvap;": [8781, 8402], "nvge;": [8805, 8402], "nvgt;": [62, 8402], "nvle;": [8804, 8402], "nvlt;": [60, 8402], "oast;": [8859], "ocir;": [8858], "ocirc": [244], "odiv;": [10808], "odot;": [8857], "ogon;": [731], "oint;": [8750], "omid;": [10678], "oopf;": [120160], "opar;": [10679], "ordf;": [170], "ordm;": [186], "oror;": [10838], "oscr;": [8500], "osol;": [8856], "ouml;": [246], "para;": [182], "part;": [8706], "perp;": [8869], "phiv;": [981], "plus;": [43], "popf;": [120161], "pound": [163], "prap;": [10935], "prec;": [8826], "prnE;": [10933], "prod;": [8719], "prop;": [8733], "pscr;": [120005], "qint;": [10764], "qopf;": [120162], "qscr;": [120006], "quot;": [34], "rArr;": [8658], "rHar;": [10596], "race;": [8765, 817], "rang;": [10217], "raquo": [187], "rarr;": [8594], "rcub;": [125], "rdca;": [10551], "rdsh;": [8627], "real;": [8476], "rect;": [9645], "rhov;": [1009], "ring;": [730], "ropf;": [120163], "rpar;": [41], "rscr;": [120007], "rsqb;": [93], "rtri;": [9657], "scap;": [10936], "scnE;": [10934], "sdot;": [8901], "sect;": [167], "semi;": [59], "sext;": [10038], "shcy;": [1096], "sime;": [8771], "simg;": [10910], "siml;": [10909], "smid;": [8739], "smte;": [10924], "solb;": [10692], "sopf;": [120164], "spar;": [8741], "squf;": [9642], "sscr;": [120008], "star;": [9734], "subE;": [10949], "sube;": [8838], "succ;": [8827], "sung;": [9834], "sup1;": [185], "sup2;": [178], "sup3;": [179], "supE;": [10950], "supe;": [8839], "szlig": [223], "tbrk;": [9140], "tdot;": [8411], "thorn": [254], "times": [215], "tint;": [8749], "toea;": [10536], "topf;": [120165], "tosa;": [10537], "trie;": [8796], "tscr;": [120009], "tscy;": [1094], "uArr;": [8657], "uHar;": [10595], "uarr;": [8593], "ucirc": [251], "uopf;": [120166], "upsi;": [965], "uscr;": [120010], "utri;": [9653], "uuml;": [252], "vArr;": [8661], "vBar;": [10984], "varr;": [8597], "vert;": [124], "vopf;": [120167], "vscr;": [120011], "wopf;": [120168], "wscr;": [120012], "xcap;": [8898], "xcup;": [8899], "xmap;": [10236], "xnis;": [8955], "xopf;": [120169], "xscr;": [120013], "xvee;": [8897], "yacy;": [1103], "yicy;": [1111], "yopf;": [120170], "yscr;": [120014], "yucy;": [1102], "yuml;": [255], "zdot;": [380], "zeta;": [950], "zhcy;": [1078], "zopf;": [120171], "zscr;": [120015], "zwnj;": [8204] } }, { "length": 4, "entities": { "AMP;": [38], "Acy;": [1040], "Afr;": [120068], "And;": [10835], "Auml": [196], "Bcy;": [1041], "Bfr;": [120069], "COPY": [169], "Cap;": [8914], "Cfr;": [8493], "Chi;": [935], "Cup;": [8915], "Dcy;": [1044], "Del;": [8711], "Dfr;": [120071], "Dot;": [168], "ENG;": [330], "ETH;": [208], "Ecy;": [1069], "Efr;": [120072], "Eta;": [919], "Euml": [203], "Fcy;": [1060], "Ffr;": [120073], "Gcy;": [1043], "Gfr;": [120074], "Hat;": [94], "Hfr;": [8460], "Icy;": [1048], "Ifr;": [8465], "Int;": [8748], "Iuml": [207], "Jcy;": [1049], "Jfr;": [120077], "Kcy;": [1050], "Kfr;": [120078], "Lcy;": [1051], "Lfr;": [120079], "Lsh;": [8624], "Map;": [10501], "Mcy;": [1052], "Mfr;": [120080], "Ncy;": [1053], "Nfr;": [120081], "Not;": [10988], "Ocy;": [1054], "Ofr;": [120082], "Ouml": [214], "Pcy;": [1055], "Pfr;": [120083], "Phi;": [934], "Psi;": [936], "QUOT": [34], "Qfr;": [120084], "REG;": [174], "Rcy;": [1056], "Rfr;": [8476], "Rho;": [929], "Rsh;": [8625], "Scy;": [1057], "Sfr;": [120086], "Sub;": [8912], "Sum;": [8721], "Sup;": [8913], "Tab;": [9], "Tau;": [932], "Tcy;": [1058], "Tfr;": [120087], "Ucy;": [1059], "Ufr;": [120088], "Uuml": [220], "Vcy;": [1042], "Vee;": [8897], "Vfr;": [120089], "Wfr;": [120090], "Xfr;": [120091], "Ycy;": [1067], "Yfr;": [120092], "Zcy;": [1047], "Zfr;": [8488], "acE;": [8766, 819], "acd;": [8767], "acy;": [1072], "afr;": [120094], "amp;": [38], "and;": [8743], "ang;": [8736], "apE;": [10864], "ape;": [8778], "ast;": [42], "auml": [228], "bcy;": [1073], "bfr;": [120095], "bne;": [61, 8421], "bot;": [8869], "cap;": [8745], "cent": [162], "cfr;": [120096], "chi;": [967], "cir;": [9675], "copy": [169], "cup;": [8746], "dcy;": [1076], "deg;": [176], "dfr;": [120097], "die;": [168], "div;": [247], "dot;": [729], "ecy;": [1101], "efr;": [120098], "egs;": [10902], "ell;": [8467], "els;": [10901], "eng;": [331], "eta;": [951], "eth;": [240], "euml": [235], "fcy;": [1092], "ffr;": [120099], "gEl;": [10892], "gap;": [10886], "gcy;": [1075], "gel;": [8923], "geq;": [8805], "ges;": [10878], "gfr;": [120100], "ggg;": [8921], "glE;": [10898], "gla;": [10917], "glj;": [10916], "gnE;": [8809], "gne;": [10888], "hfr;": [120101], "icy;": [1080], "iff;": [8660], "ifr;": [120102], "int;": [8747], "iuml": [239], "jcy;": [1081], "jfr;": [120103], "kcy;": [1082], "kfr;": [120104], "lEg;": [10891], "lap;": [10885], "lat;": [10923], "lcy;": [1083], "leg;": [8922], "leq;": [8804], "les;": [10877], "lfr;": [120105], "lgE;": [10897], "lnE;": [8808], "lne;": [10887], "loz;": [9674], "lrm;": [8206], "lsh;": [8624], "macr": [175], "map;": [8614], "mcy;": [1084], "mfr;": [120106], "mho;": [8487], "mid;": [8739], "nGg;": [8921, 824], "nGt;": [8811, 8402], "nLl;": [8920, 824], "nLt;": [8810, 8402], "nap;": [8777], "nbsp": [160], "ncy;": [1085], "nfr;": [120107], "ngE;": [8807, 824], "nge;": [8817], "ngt;": [8815], "nis;": [8956], "niv;": [8715], "nlE;": [8806, 824], "nle;": [8816], "nlt;": [8814], "not;": [172], "npr;": [8832], "nsc;": [8833], "num;": [35], "ocy;": [1086], "ofr;": [120108], "ogt;": [10689], "ohm;": [937], "olt;": [10688], "ord;": [10845], "ordf": [170], "ordm": [186], "orv;": [10843], "ouml": [246], "par;": [8741], "para": [182], "pcy;": [1087], "pfr;": [120109], "phi;": [966], "piv;": [982], "prE;": [10931], "pre;": [10927], "psi;": [968], "qfr;": [120110], "quot": [34], "rcy;": [1088], "reg;": [174], "rfr;": [120111], "rho;": [961], "rlm;": [8207], "rsh;": [8625], "scE;": [10932], "sce;": [10928], "scy;": [1089], "sect": [167], "sfr;": [120112], "shy;": [173], "sim;": [8764], "smt;": [10922], "sol;": [47], "squ;": [9633], "sub;": [8834], "sum;": [8721], "sup1": [185], "sup2": [178], "sup3": [179], "sup;": [8835], "tau;": [964], "tcy;": [1090], "tfr;": [120113], "top;": [8868], "ucy;": [1091], "ufr;": [120114], "uml;": [168], "uuml": [252], "vcy;": [1074], "vee;": [8744], "vfr;": [120115], "wfr;": [120116], "xfr;": [120117], "ycy;": [1099], "yen;": [165], "yfr;": [120118], "yuml": [255], "zcy;": [1079], "zfr;": [120119], "zwj;": [8205] } }, { "length": 3, "entities": { "AMP": [38], "DD;": [8517], "ETH": [208], "GT;": [62], "Gg;": [8921], "Gt;": [8811], "Im;": [8465], "LT;": [60], "Ll;": [8920], "Lt;": [8810], "Mu;": [924], "Nu;": [925], "Or;": [10836], "Pi;": [928], "Pr;": [10939], "REG": [174], "Re;": [8476], "Sc;": [10940], "Xi;": [926], "ac;": [8766], "af;": [8289], "amp": [38], "ap;": [8776], "dd;": [8518], "deg": [176], "ee;": [8519], "eg;": [10906], "el;": [10905], "eth": [240], "gE;": [8807], "ge;": [8805], "gg;": [8811], "gl;": [8823], "gt;": [62], "ic;": [8291], "ii;": [8520], "in;": [8712], "it;": [8290], "lE;": [8806], "le;": [8804], "lg;": [8822], "ll;": [8810], "lt;": [60], "mp;": [8723], "mu;": [956], "ne;": [8800], "ni;": [8715], "not": [172], "nu;": [957], "oS;": [9416], "or;": [8744], "pi;": [960], "pm;": [177], "pr;": [8826], "reg": [174], "rx;": [8478], "sc;": [8827], "shy": [173], "uml": [168], "wp;": [8472], "wr;": [8768], "xi;": [958], "yen": [165] } }, { "length": 2, "entities": { "GT": [62], "LT": [60], "gt": [62], "lt": [60] } }];

const EOF = -1;
const NULL = 0x00;
const TABULATION = 0x09;
const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const FORM_FEED = 0x0c;
const SPACE = 0x20;
const EXCLAMATION_MARK = 0x21;
const QUOTATION_MARK = 0x22;
const NUMBER_SIGN = 0x23;
const AMPERSAND = 0x26;
const APOSTROPHE = 0x27;
const LEFT_PARENTHESIS = 0x28;
const RIGHT_PARENTHESIS = 0x29;
const ASTERISK = 0x2a;
const HYPHEN_MINUS = 0x2d;
const SOLIDUS = 0x2f;
const DIGIT_0 = 0x30;
const DIGIT_9 = 0x39;
const COLON = 0x3a;
const SEMICOLON = 0x3b;
const LESS_THAN_SIGN = 0x3c;
const EQUALS_SIGN = 0x3d;
const GREATER_THAN_SIGN = 0x3e;
const QUESTION_MARK = 0x3f;
const LATIN_CAPITAL_A = 0x41;
const LATIN_CAPITAL_D = 0x44;
const LATIN_CAPITAL_F = 0x46;
const LATIN_CAPITAL_X = 0x58;
const LATIN_CAPITAL_Z = 0x5a;
const LEFT_SQUARE_BRACKET = 0x5b;
const REVERSE_SOLIDUS = 0x5c;
const RIGHT_SQUARE_BRACKET = 0x5d;
const GRAVE_ACCENT = 0x60;
const LATIN_SMALL_A = 0x61;
const LATIN_SMALL_F = 0x66;
const LATIN_SMALL_X = 0x78;
const LATIN_SMALL_Z = 0x7a;
const LEFT_CURLY_BRACKET = 0x7b;
const RIGHT_CURLY_BRACKET = 0x7d;
const NULL_REPLACEMENT = 0xfffd;
function isWhitespace(cp) {
    return (cp === TABULATION ||
        cp === LINE_FEED ||
        cp === FORM_FEED ||
        cp === CARRIAGE_RETURN ||
        cp === SPACE);
}
function isUpperLetter(cp) {
    return cp >= LATIN_CAPITAL_A && cp <= LATIN_CAPITAL_Z;
}
function isLowerLetter(cp) {
    return cp >= LATIN_SMALL_A && cp <= LATIN_SMALL_Z;
}
function isLetter(cp) {
    return isLowerLetter(cp) || isUpperLetter(cp);
}
function isDigit(cp) {
    return cp >= DIGIT_0 && cp <= DIGIT_9;
}
function isUpperHexDigit(cp) {
    return cp >= LATIN_CAPITAL_A && cp <= LATIN_CAPITAL_F;
}
function isLowerHexDigit(cp) {
    return cp >= LATIN_SMALL_A && cp <= LATIN_SMALL_F;
}
function isHexDigit(cp) {
    return isDigit(cp) || isUpperHexDigit(cp) || isLowerHexDigit(cp);
}
function isControl(cp) {
    return (cp >= 0 && cp <= 0x1f) || (cp >= 0x7f && cp <= 0x9f);
}
function isSurrogate(cp) {
    return cp >= 0xd800 && cp <= 0xdfff;
}
function isSurrogatePair(cp) {
    return cp >= 0xdc00 && cp <= 0xdfff;
}
function isNonCharacter(cp) {
    return ((cp >= 0xfdd0 && cp <= 0xfdef) ||
        ((cp & 0xfffe) === 0xfffe && cp <= 0x10ffff));
}
function toLowerCodePoint(cp) {
    return cp + 0x0020;
}

class Tokenizer {
    text;
    gaps;
    lineTerminators;
    parserOptions;
    lastCodePoint;
    lastCodePointRaw;
    offset;
    column;
    line;
    returnState;
    vExpressionScriptState = null;
    reconsuming;
    buffer;
    crStartOffset;
    crCode;
    committedToken;
    provisionalToken;
    currentToken;
    lastTagOpenToken;
    tokenStartOffset;
    tokenStartLine;
    tokenStartColumn;
    state;
    errors;
    namespace;
    expressionEnabled;
    constructor(text, parserOptions) {
        debug("[html] the source code length: %d", text.length);
        this.text = text;
        this.gaps = [];
        this.lineTerminators = [];
        this.parserOptions = parserOptions || {};
        this.lastCodePoint = this.lastCodePointRaw = NULL;
        this.offset = -1;
        this.column = -1;
        this.line = 1;
        this.state = "DATA";
        this.returnState = "DATA";
        this.reconsuming = false;
        this.buffer = [];
        this.crStartOffset = -1;
        this.crCode = 0;
        this.errors = [];
        this.committedToken = null;
        this.provisionalToken = null;
        this.currentToken = null;
        this.lastTagOpenToken = null;
        this.tokenStartOffset = -1;
        this.tokenStartColumn = -1;
        this.tokenStartLine = 1;
        this.namespace = NS.HTML;
        this.expressionEnabled = false;
    }
    nextToken() {
        let cp = this.lastCodePoint;
        while (this.committedToken == null &&
            (cp !== EOF || this.reconsuming)) {
            if (this.provisionalToken != null && !this.isProvisionalState()) {
                this.commitProvisionalToken();
                if (this.committedToken != null) {
                    break;
                }
            }
            if (this.reconsuming) {
                this.reconsuming = false;
                cp = this.lastCodePoint;
            }
            else {
                cp = this.consumeNextCodePoint();
            }
            debug("[html] parse", cp, this.state);
            this.state = this[this.state](cp);
        }
        {
            const token = this.consumeCommittedToken();
            if (token != null) {
                return token;
            }
        }
        assert__default["default"](cp === EOF);
        if (this.currentToken != null) {
            this.endToken();
            const token = this.consumeCommittedToken();
            if (token != null) {
                return token;
            }
        }
        return this.currentToken;
    }
    consumeCommittedToken() {
        const token = this.committedToken;
        this.committedToken = null;
        return token;
    }
    consumeNextCodePoint() {
        if (this.offset >= this.text.length) {
            this.lastCodePoint = this.lastCodePointRaw = EOF;
            return EOF;
        }
        this.offset += this.lastCodePoint >= 0x10000 ? 2 : 1;
        if (this.offset >= this.text.length) {
            this.advanceLocation();
            this.lastCodePoint = this.lastCodePointRaw = EOF;
            return EOF;
        }
        const cp = this.text.codePointAt(this.offset);
        if (isSurrogate(this.text.charCodeAt(this.offset)) &&
            !isSurrogatePair(this.text.charCodeAt(this.offset + 1))) {
            this.reportParseError("surrogate-in-input-stream");
        }
        if (isNonCharacter(cp)) {
            this.reportParseError("noncharacter-in-input-stream");
        }
        if (isControl(cp) && !isWhitespace(cp) && cp !== NULL) {
            this.reportParseError("control-character-in-input-stream");
        }
        if (this.lastCodePointRaw === CARRIAGE_RETURN && cp === LINE_FEED) {
            this.lastCodePoint = this.lastCodePointRaw = LINE_FEED;
            this.gaps.push(this.offset);
            return this.consumeNextCodePoint();
        }
        this.advanceLocation();
        this.lastCodePoint = this.lastCodePointRaw = cp;
        if (cp === CARRIAGE_RETURN) {
            this.lastCodePoint = LINE_FEED;
            return LINE_FEED;
        }
        return cp;
    }
    advanceLocation() {
        if (this.lastCodePointRaw === LINE_FEED) {
            this.lineTerminators.push(this.offset);
            this.line += 1;
            this.column = 0;
        }
        else {
            this.column += this.lastCodePoint >= 0x10000 ? 2 : 1;
        }
    }
    reconsumeAs(state) {
        this.reconsuming = true;
        return state;
    }
    reportParseError(code) {
        const error = ParseError.fromCode(code, this.offset, this.line, this.column);
        this.errors.push(error);
        debug("[html] syntax error:", error.message);
    }
    setStartTokenMark() {
        this.tokenStartOffset = this.offset;
        this.tokenStartLine = this.line;
        this.tokenStartColumn = this.column;
    }
    clearStartTokenMark() {
        this.tokenStartOffset = -1;
    }
    startToken(type) {
        if (this.tokenStartOffset === -1) {
            this.setStartTokenMark();
        }
        const offset = this.tokenStartOffset;
        const line = this.tokenStartLine;
        const column = this.tokenStartColumn;
        if (this.currentToken != null) {
            this.endToken();
        }
        this.tokenStartOffset = -1;
        const token = (this.currentToken = {
            type,
            range: [offset, -1],
            loc: {
                start: { line, column },
                end: { line: -1, column: -1 },
            },
            value: "",
        });
        debug("[html] start token: %d %s", offset, token.type);
        return this.currentToken;
    }
    endToken() {
        if (this.currentToken == null) {
            throw new Error("Invalid state");
        }
        if (this.tokenStartOffset === -1) {
            this.setStartTokenMark();
        }
        const token = this.currentToken;
        const offset = this.tokenStartOffset;
        const line = this.tokenStartLine;
        const column = this.tokenStartColumn;
        const provisional = this.isProvisionalState();
        this.currentToken = null;
        this.tokenStartOffset = -1;
        token.range[1] = offset;
        token.loc.end.line = line;
        token.loc.end.column = column;
        if (token.range[0] === offset && !provisional) {
            debug("[html] abandon token: %j %s %j", token.range, token.type, token.value);
            return null;
        }
        if (provisional) {
            if (this.provisionalToken != null) {
                this.commitProvisionalToken();
            }
            this.provisionalToken = token;
            debug("[html] provisional-commit token: %j %s %j", token.range, token.type, token.value);
        }
        else {
            this.commitToken(token);
        }
        return token;
    }
    commitToken(token) {
        assert__default["default"](this.committedToken == null, "Invalid state: the commited token existed already.");
        debug("[html] commit token: %j %j %s %j", token.range, token.loc, token.type, token.value);
        this.committedToken = token;
        if (token.type === "HTMLTagOpen") {
            this.lastTagOpenToken = token;
        }
    }
    isProvisionalState() {
        return (this.state.startsWith("RCDATA_") ||
            this.state.startsWith("RAWTEXT_"));
    }
    commitProvisionalToken() {
        assert__default["default"](this.provisionalToken != null, "Invalid state: the provisional token was not found.");
        const token = this.provisionalToken;
        this.provisionalToken = null;
        if (token.range[0] < token.range[1]) {
            this.commitToken(token);
        }
    }
    rollbackProvisionalToken() {
        assert__default["default"](this.currentToken != null);
        assert__default["default"](this.provisionalToken != null);
        const token = this.currentToken;
        debug("[html] rollback token: %d %s", token.range[0], token.type);
        this.currentToken = this.provisionalToken;
        this.provisionalToken = null;
    }
    appendTokenValue(cp, expected) {
        const token = this.currentToken;
        if (token == null || (expected != null && token.type !== expected)) {
            const msg1 = expected ? `"${expected}" type` : "any token";
            const msg2 = token ? `"${token.type}" type` : "no token";
            throw new Error(`Tokenizer: Invalid state. Expected ${msg1}, but got ${msg2}.`);
        }
        token.value += String.fromCodePoint(cp);
    }
    isAppropriateEndTagOpen() {
        return (this.currentToken != null &&
            this.lastTagOpenToken != null &&
            this.currentToken.type === "HTMLEndTagOpen" &&
            this.currentToken.value === this.lastTagOpenToken.value);
    }
    DATA(cp) {
        this.clearStartTokenMark();
        while (true) {
            const type = isWhitespace(cp) ? "HTMLWhitespace" : "HTMLText";
            if (this.currentToken != null && this.currentToken.type !== type) {
                this.endToken();
                return this.reconsumeAs(this.state);
            }
            if (this.currentToken == null) {
                this.startToken(type);
            }
            if (cp === AMPERSAND) {
                this.returnState = "DATA";
                return "CHARACTER_REFERENCE";
            }
            if (cp === LESS_THAN_SIGN) {
                this.setStartTokenMark();
                return "TAG_OPEN";
            }
            if (cp === LEFT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "DATA";
                return "V_EXPRESSION_START";
            }
            if (cp === RIGHT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "DATA";
                return "V_EXPRESSION_END";
            }
            if (cp === EOF) {
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
            }
            this.appendTokenValue(cp, type);
            cp = this.consumeNextCodePoint();
        }
    }
    RCDATA(cp) {
        this.clearStartTokenMark();
        while (true) {
            const type = isWhitespace(cp) ? "HTMLWhitespace" : "HTMLRCDataText";
            if (this.currentToken != null && this.currentToken.type !== type) {
                this.endToken();
                return this.reconsumeAs(this.state);
            }
            if (this.currentToken == null) {
                this.startToken(type);
            }
            if (cp === AMPERSAND) {
                this.returnState = "RCDATA";
                return "CHARACTER_REFERENCE";
            }
            if (cp === LESS_THAN_SIGN) {
                this.setStartTokenMark();
                return "RCDATA_LESS_THAN_SIGN";
            }
            if (cp === LEFT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "RCDATA";
                return "V_EXPRESSION_START";
            }
            if (cp === RIGHT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "RCDATA";
                return "V_EXPRESSION_END";
            }
            if (cp === EOF) {
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            this.appendTokenValue(cp, type);
            cp = this.consumeNextCodePoint();
        }
    }
    RAWTEXT(cp) {
        this.clearStartTokenMark();
        while (true) {
            const type = isWhitespace(cp) ? "HTMLWhitespace" : "HTMLRawText";
            if (this.currentToken != null && this.currentToken.type !== type) {
                this.endToken();
                return this.reconsumeAs(this.state);
            }
            if (this.currentToken == null) {
                this.startToken(type);
            }
            if (cp === LESS_THAN_SIGN) {
                this.setStartTokenMark();
                return "RAWTEXT_LESS_THAN_SIGN";
            }
            if (cp === LEFT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "RAWTEXT";
                return "V_EXPRESSION_START";
            }
            if (cp === RIGHT_CURLY_BRACKET && this.expressionEnabled) {
                this.setStartTokenMark();
                this.returnState = "RAWTEXT";
                return "V_EXPRESSION_END";
            }
            if (cp === EOF) {
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            this.appendTokenValue(cp, type);
            cp = this.consumeNextCodePoint();
        }
    }
    TAG_OPEN(cp) {
        if (cp === EXCLAMATION_MARK) {
            return "MARKUP_DECLARATION_OPEN";
        }
        if (cp === SOLIDUS) {
            return "END_TAG_OPEN";
        }
        if (isLetter(cp)) {
            this.startToken("HTMLTagOpen");
            return this.reconsumeAs("TAG_NAME");
        }
        if (cp === QUESTION_MARK) {
            this.reportParseError("unexpected-question-mark-instead-of-tag-name");
            this.startToken("HTMLBogusComment");
            return this.reconsumeAs("BOGUS_COMMENT");
        }
        if (cp === EOF) {
            this.clearStartTokenMark();
            this.reportParseError("eof-before-tag-name");
            this.appendTokenValue(LESS_THAN_SIGN, "HTMLText");
            return "DATA";
        }
        this.reportParseError("invalid-first-character-of-tag-name");
        this.appendTokenValue(LESS_THAN_SIGN, "HTMLText");
        return this.reconsumeAs("DATA");
    }
    END_TAG_OPEN(cp) {
        if (isLetter(cp)) {
            this.startToken("HTMLEndTagOpen");
            return this.reconsumeAs("TAG_NAME");
        }
        if (cp === GREATER_THAN_SIGN) {
            this.endToken();
            this.reportParseError("missing-end-tag-name");
            return "DATA";
        }
        if (cp === EOF) {
            this.clearStartTokenMark();
            this.reportParseError("eof-before-tag-name");
            this.appendTokenValue(LESS_THAN_SIGN, "HTMLText");
            this.appendTokenValue(SOLIDUS, "HTMLText");
            return "DATA";
        }
        this.reportParseError("invalid-first-character-of-tag-name");
        this.startToken("HTMLBogusComment");
        return this.reconsumeAs("BOGUS_COMMENT");
    }
    TAG_NAME(cp) {
        while (true) {
            if (isWhitespace(cp)) {
                this.endToken();
                return "BEFORE_ATTRIBUTE_NAME";
            }
            if (cp === SOLIDUS) {
                this.endToken();
                this.setStartTokenMark();
                return "SELF_CLOSING_START_TAG";
            }
            if (cp === GREATER_THAN_SIGN) {
                this.startToken("HTMLTagClose");
                return "DATA";
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-tag");
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            this.appendTokenValue(isUpperLetter(cp) ? toLowerCodePoint(cp) : cp, null);
            cp = this.consumeNextCodePoint();
        }
    }
    RCDATA_LESS_THAN_SIGN(cp) {
        if (cp === SOLIDUS) {
            this.buffer = [];
            return "RCDATA_END_TAG_OPEN";
        }
        this.appendTokenValue(LESS_THAN_SIGN, "HTMLRCDataText");
        return this.reconsumeAs("RCDATA");
    }
    RCDATA_END_TAG_OPEN(cp) {
        if (isLetter(cp)) {
            this.startToken("HTMLEndTagOpen");
            return this.reconsumeAs("RCDATA_END_TAG_NAME");
        }
        this.appendTokenValue(LESS_THAN_SIGN, "HTMLRCDataText");
        this.appendTokenValue(SOLIDUS, "HTMLRCDataText");
        return this.reconsumeAs("RCDATA");
    }
    RCDATA_END_TAG_NAME(cp) {
        while (true) {
            if (isWhitespace(cp) && this.isAppropriateEndTagOpen()) {
                this.endToken();
                return "BEFORE_ATTRIBUTE_NAME";
            }
            if (cp === SOLIDUS && this.isAppropriateEndTagOpen()) {
                this.endToken();
                this.setStartTokenMark();
                return "SELF_CLOSING_START_TAG";
            }
            if (cp === GREATER_THAN_SIGN && this.isAppropriateEndTagOpen()) {
                this.startToken("HTMLTagClose");
                return "DATA";
            }
            if (!isLetter(cp)) {
                this.rollbackProvisionalToken();
                this.appendTokenValue(LESS_THAN_SIGN, "HTMLRCDataText");
                this.appendTokenValue(SOLIDUS, "HTMLRCDataText");
                for (const cp1 of this.buffer) {
                    this.appendTokenValue(cp1, "HTMLRCDataText");
                }
                return this.reconsumeAs("RCDATA");
            }
            this.appendTokenValue(isUpperLetter(cp) ? toLowerCodePoint(cp) : cp, "HTMLEndTagOpen");
            this.buffer.push(cp);
            cp = this.consumeNextCodePoint();
        }
    }
    RAWTEXT_LESS_THAN_SIGN(cp) {
        if (cp === SOLIDUS) {
            this.buffer = [];
            return "RAWTEXT_END_TAG_OPEN";
        }
        this.appendTokenValue(LESS_THAN_SIGN, "HTMLRawText");
        return this.reconsumeAs("RAWTEXT");
    }
    RAWTEXT_END_TAG_OPEN(cp) {
        if (isLetter(cp)) {
            this.startToken("HTMLEndTagOpen");
            return this.reconsumeAs("RAWTEXT_END_TAG_NAME");
        }
        this.appendTokenValue(LESS_THAN_SIGN, "HTMLRawText");
        this.appendTokenValue(SOLIDUS, "HTMLRawText");
        return this.reconsumeAs("RAWTEXT");
    }
    RAWTEXT_END_TAG_NAME(cp) {
        while (true) {
            if (cp === SOLIDUS && this.isAppropriateEndTagOpen()) {
                this.endToken();
                this.setStartTokenMark();
                return "SELF_CLOSING_START_TAG";
            }
            if (cp === GREATER_THAN_SIGN && this.isAppropriateEndTagOpen()) {
                this.startToken("HTMLTagClose");
                return "DATA";
            }
            if (isWhitespace(cp) && this.isAppropriateEndTagOpen()) {
                this.endToken();
                return "BEFORE_ATTRIBUTE_NAME";
            }
            if (!isLetter(cp) && !maybeValidCustomBlock.call(this, cp)) {
                this.rollbackProvisionalToken();
                this.appendTokenValue(LESS_THAN_SIGN, "HTMLRawText");
                this.appendTokenValue(SOLIDUS, "HTMLRawText");
                for (const cp1 of this.buffer) {
                    this.appendTokenValue(cp1, "HTMLRawText");
                }
                return this.reconsumeAs("RAWTEXT");
            }
            this.appendTokenValue(isUpperLetter(cp) ? toLowerCodePoint(cp) : cp, "HTMLEndTagOpen");
            this.buffer.push(cp);
            cp = this.consumeNextCodePoint();
        }
        function maybeValidCustomBlock(nextCp) {
            return (this.currentToken &&
                this.lastTagOpenToken?.value.startsWith(this.currentToken.value + String.fromCodePoint(nextCp)));
        }
    }
    BEFORE_ATTRIBUTE_NAME(cp) {
        while (isWhitespace(cp)) {
            cp = this.consumeNextCodePoint();
        }
        if (cp === SOLIDUS || cp === GREATER_THAN_SIGN || cp === EOF) {
            return this.reconsumeAs("AFTER_ATTRIBUTE_NAME");
        }
        if (cp === EQUALS_SIGN) {
            this.reportParseError("unexpected-equals-sign-before-attribute-name");
            this.startToken("HTMLIdentifier");
            this.appendTokenValue(cp, "HTMLIdentifier");
            return "ATTRIBUTE_NAME";
        }
        this.startToken("HTMLIdentifier");
        return this.reconsumeAs("ATTRIBUTE_NAME");
    }
    ATTRIBUTE_NAME(cp) {
        while (true) {
            if (isWhitespace(cp) ||
                cp === SOLIDUS ||
                cp === GREATER_THAN_SIGN ||
                cp === EOF) {
                this.endToken();
                return this.reconsumeAs("AFTER_ATTRIBUTE_NAME");
            }
            if (cp === EQUALS_SIGN) {
                this.startToken("HTMLAssociation");
                return "BEFORE_ATTRIBUTE_VALUE";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            if (cp === QUOTATION_MARK ||
                cp === APOSTROPHE ||
                cp === LESS_THAN_SIGN) {
                this.reportParseError("unexpected-character-in-attribute-name");
            }
            this.appendTokenValue(isUpperLetter(cp) ? toLowerCodePoint(cp) : cp, "HTMLIdentifier");
            cp = this.consumeNextCodePoint();
        }
    }
    AFTER_ATTRIBUTE_NAME(cp) {
        while (isWhitespace(cp)) {
            cp = this.consumeNextCodePoint();
        }
        if (cp === SOLIDUS) {
            this.setStartTokenMark();
            return "SELF_CLOSING_START_TAG";
        }
        if (cp === EQUALS_SIGN) {
            this.startToken("HTMLAssociation");
            return "BEFORE_ATTRIBUTE_VALUE";
        }
        if (cp === GREATER_THAN_SIGN) {
            this.startToken("HTMLTagClose");
            return "DATA";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-tag");
            return "DATA";
        }
        this.startToken("HTMLIdentifier");
        return this.reconsumeAs("ATTRIBUTE_NAME");
    }
    BEFORE_ATTRIBUTE_VALUE(cp) {
        this.endToken();
        while (isWhitespace(cp)) {
            cp = this.consumeNextCodePoint();
        }
        if (cp === GREATER_THAN_SIGN) {
            this.reportParseError("missing-attribute-value");
            this.startToken("HTMLTagClose");
            return "DATA";
        }
        this.startToken("HTMLLiteral");
        if (cp === QUOTATION_MARK) {
            return "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
        }
        if (cp === APOSTROPHE) {
            return "ATTRIBUTE_VALUE_SINGLE_QUOTED";
        }
        return this.reconsumeAs("ATTRIBUTE_VALUE_UNQUOTED");
    }
    ATTRIBUTE_VALUE_DOUBLE_QUOTED(cp) {
        while (true) {
            if (cp === QUOTATION_MARK) {
                return "AFTER_ATTRIBUTE_VALUE_QUOTED";
            }
            if (cp === AMPERSAND) {
                this.returnState = "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
                return "CHARACTER_REFERENCE";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-tag");
                return "DATA";
            }
            this.appendTokenValue(cp, "HTMLLiteral");
            cp = this.consumeNextCodePoint();
        }
    }
    ATTRIBUTE_VALUE_SINGLE_QUOTED(cp) {
        while (true) {
            if (cp === APOSTROPHE) {
                return "AFTER_ATTRIBUTE_VALUE_QUOTED";
            }
            if (cp === AMPERSAND) {
                this.returnState = "ATTRIBUTE_VALUE_SINGLE_QUOTED";
                return "CHARACTER_REFERENCE";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-tag");
                return "DATA";
            }
            this.appendTokenValue(cp, "HTMLLiteral");
            cp = this.consumeNextCodePoint();
        }
    }
    ATTRIBUTE_VALUE_UNQUOTED(cp) {
        while (true) {
            if (isWhitespace(cp)) {
                this.endToken();
                return "BEFORE_ATTRIBUTE_NAME";
            }
            if (cp === AMPERSAND) {
                this.returnState = "ATTRIBUTE_VALUE_UNQUOTED";
                return "CHARACTER_REFERENCE";
            }
            if (cp === GREATER_THAN_SIGN) {
                this.startToken("HTMLTagClose");
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            if (cp === QUOTATION_MARK ||
                cp === APOSTROPHE ||
                cp === LESS_THAN_SIGN ||
                cp === EQUALS_SIGN ||
                cp === GRAVE_ACCENT) {
                this.reportParseError("unexpected-character-in-unquoted-attribute-value");
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-tag");
                return "DATA";
            }
            this.appendTokenValue(cp, "HTMLLiteral");
            cp = this.consumeNextCodePoint();
        }
    }
    AFTER_ATTRIBUTE_VALUE_QUOTED(cp) {
        this.endToken();
        if (isWhitespace(cp)) {
            return "BEFORE_ATTRIBUTE_NAME";
        }
        if (cp === SOLIDUS) {
            this.setStartTokenMark();
            return "SELF_CLOSING_START_TAG";
        }
        if (cp === GREATER_THAN_SIGN) {
            this.startToken("HTMLTagClose");
            return "DATA";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-tag");
            return "DATA";
        }
        this.reportParseError("missing-whitespace-between-attributes");
        return this.reconsumeAs("BEFORE_ATTRIBUTE_NAME");
    }
    SELF_CLOSING_START_TAG(cp) {
        if (cp === GREATER_THAN_SIGN) {
            this.startToken("HTMLSelfClosingTagClose");
            return "DATA";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-tag");
            return "DATA";
        }
        this.reportParseError("unexpected-solidus-in-tag");
        this.clearStartTokenMark();
        return this.reconsumeAs("BEFORE_ATTRIBUTE_NAME");
    }
    BOGUS_COMMENT(cp) {
        while (true) {
            if (cp === GREATER_THAN_SIGN) {
                return "DATA";
            }
            if (cp === EOF) {
                return "DATA";
            }
            if (cp === NULL) {
                cp = NULL_REPLACEMENT;
            }
            this.appendTokenValue(cp, null);
            cp = this.consumeNextCodePoint();
        }
    }
    MARKUP_DECLARATION_OPEN(cp) {
        if (cp === HYPHEN_MINUS && this.text[this.offset + 1] === "-") {
            this.offset += 1;
            this.column += 1;
            this.startToken("HTMLComment");
            return "COMMENT_START";
        }
        if (cp === LATIN_CAPITAL_D &&
            this.text.slice(this.offset + 1, this.offset + 7) === "OCTYPE") {
            this.startToken("HTMLBogusComment");
            this.appendTokenValue(cp, "HTMLBogusComment");
            return "BOGUS_COMMENT";
        }
        if (cp === LEFT_SQUARE_BRACKET &&
            this.text.slice(this.offset + 1, this.offset + 7) === "CDATA[") {
            this.offset += 6;
            this.column += 6;
            if (this.namespace === NS.HTML) {
                this.reportParseError("cdata-in-html-content");
                this.startToken("HTMLBogusComment").value = "[CDATA[";
                return "BOGUS_COMMENT";
            }
            this.startToken("HTMLCDataText");
            return "CDATA_SECTION";
        }
        this.reportParseError("incorrectly-opened-comment");
        this.startToken("HTMLBogusComment");
        return this.reconsumeAs("BOGUS_COMMENT");
    }
    COMMENT_START(cp) {
        if (cp === HYPHEN_MINUS) {
            return "COMMENT_START_DASH";
        }
        if (cp === GREATER_THAN_SIGN) {
            this.reportParseError("abrupt-closing-of-empty-comment");
            return "DATA";
        }
        return this.reconsumeAs("COMMENT");
    }
    COMMENT_START_DASH(cp) {
        if (cp === HYPHEN_MINUS) {
            return "COMMENT_END";
        }
        if (cp === GREATER_THAN_SIGN) {
            this.reportParseError("abrupt-closing-of-empty-comment");
            return "DATA";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-comment");
            return "DATA";
        }
        this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
        return this.reconsumeAs("COMMENT");
    }
    COMMENT(cp) {
        while (true) {
            if (cp === LESS_THAN_SIGN) {
                this.appendTokenValue(LESS_THAN_SIGN, "HTMLComment");
                return "COMMENT_LESS_THAN_SIGN";
            }
            if (cp === HYPHEN_MINUS) {
                return "COMMENT_END_DASH";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
                cp = NULL_REPLACEMENT;
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-comment");
                return "DATA";
            }
            this.appendTokenValue(cp, "HTMLComment");
            cp = this.consumeNextCodePoint();
        }
    }
    COMMENT_LESS_THAN_SIGN(cp) {
        while (true) {
            if (cp === EXCLAMATION_MARK) {
                this.appendTokenValue(cp, "HTMLComment");
                return "COMMENT_LESS_THAN_SIGN_BANG";
            }
            if (cp !== LESS_THAN_SIGN) {
                return this.reconsumeAs("COMMENT");
            }
            this.appendTokenValue(cp, "HTMLComment");
            cp = this.consumeNextCodePoint();
        }
    }
    COMMENT_LESS_THAN_SIGN_BANG(cp) {
        if (cp === HYPHEN_MINUS) {
            return "COMMENT_LESS_THAN_SIGN_BANG_DASH";
        }
        return this.reconsumeAs("COMMENT");
    }
    COMMENT_LESS_THAN_SIGN_BANG_DASH(cp) {
        if (cp === HYPHEN_MINUS) {
            return "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH";
        }
        return this.reconsumeAs("COMMENT_END_DASH");
    }
    COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH(cp) {
        if (cp !== GREATER_THAN_SIGN && cp !== EOF) {
            this.reportParseError("nested-comment");
        }
        return this.reconsumeAs("COMMENT_END");
    }
    COMMENT_END_DASH(cp) {
        if (cp === HYPHEN_MINUS) {
            return "COMMENT_END";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-comment");
            return "DATA";
        }
        this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
        return this.reconsumeAs("COMMENT");
    }
    COMMENT_END(cp) {
        while (true) {
            if (cp === GREATER_THAN_SIGN) {
                return "DATA";
            }
            if (cp === EXCLAMATION_MARK) {
                return "COMMENT_END_BANG";
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-comment");
                return "DATA";
            }
            this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
            if (cp !== HYPHEN_MINUS) {
                this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
                return this.reconsumeAs("COMMENT");
            }
            cp = this.consumeNextCodePoint();
        }
    }
    COMMENT_END_BANG(cp) {
        if (cp === HYPHEN_MINUS) {
            this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
            this.appendTokenValue(EXCLAMATION_MARK, "HTMLComment");
            return "COMMENT_END_DASH";
        }
        if (cp === GREATER_THAN_SIGN) {
            this.reportParseError("incorrectly-closed-comment");
            return "DATA";
        }
        if (cp === EOF) {
            this.reportParseError("eof-in-comment");
            return "DATA";
        }
        this.appendTokenValue(HYPHEN_MINUS, "HTMLComment");
        this.appendTokenValue(EXCLAMATION_MARK, "HTMLComment");
        return this.reconsumeAs("COMMENT");
    }
    CDATA_SECTION(cp) {
        while (true) {
            if (cp === RIGHT_SQUARE_BRACKET) {
                return "CDATA_SECTION_BRACKET";
            }
            if (cp === EOF) {
                this.reportParseError("eof-in-cdata");
                return "DATA";
            }
            this.appendTokenValue(cp, "HTMLCDataText");
            cp = this.consumeNextCodePoint();
        }
    }
    CDATA_SECTION_BRACKET(cp) {
        if (cp === RIGHT_SQUARE_BRACKET) {
            return "CDATA_SECTION_END";
        }
        this.appendTokenValue(RIGHT_SQUARE_BRACKET, "HTMLCDataText");
        return this.reconsumeAs("CDATA_SECTION");
    }
    CDATA_SECTION_END(cp) {
        while (true) {
            if (cp === GREATER_THAN_SIGN) {
                return "DATA";
            }
            if (cp !== RIGHT_SQUARE_BRACKET) {
                this.appendTokenValue(RIGHT_SQUARE_BRACKET, "HTMLCDataText");
                this.appendTokenValue(RIGHT_SQUARE_BRACKET, "HTMLCDataText");
                return this.reconsumeAs("CDATA_SECTION");
            }
            this.appendTokenValue(RIGHT_SQUARE_BRACKET, "HTMLCDataText");
            cp = this.consumeNextCodePoint();
        }
    }
    CHARACTER_REFERENCE(cp) {
        this.crStartOffset = this.offset - 1;
        this.buffer = [AMPERSAND];
        if (isDigit(cp) || isLetter(cp)) {
            return this.reconsumeAs("NAMED_CHARACTER_REFERENCE");
        }
        if (cp === NUMBER_SIGN) {
            this.buffer.push(cp);
            return "NUMERIC_CHARACTER_REFERENCE";
        }
        return this.reconsumeAs("CHARACTER_REFERENCE_END");
    }
    NAMED_CHARACTER_REFERENCE(cp) {
        for (const entitySet of entitySets) {
            const length = entitySet.length;
            const entities = entitySet.entities;
            const text = this.text.slice(this.offset, this.offset + length);
            const codepoints = entities[text];
            if (codepoints == null) {
                continue;
            }
            const semi = text.endsWith(";");
            const next = this.text.codePointAt(this.offset + 1);
            this.offset += length - 1;
            this.column += length - 1;
            if (this.returnState.startsWith("ATTR") &&
                !semi &&
                next != null &&
                (next === EQUALS_SIGN || isLetter(next) || isDigit(next))) {
                for (const cp1 of text) {
                    this.buffer.push(cp1.codePointAt(0));
                }
            }
            else {
                if (!semi) {
                    this.reportParseError("missing-semicolon-after-character-reference");
                }
                this.buffer = codepoints;
            }
            return "CHARACTER_REFERENCE_END";
        }
        for (const cp0 of this.buffer) {
            this.appendTokenValue(cp0, null);
        }
        this.appendTokenValue(cp, null);
        return "AMBIGUOUS_AMPERSAND";
    }
    AMBIGUOUS_AMPERSAND(cp) {
        while (isDigit(cp) || isLetter(cp)) {
            this.appendTokenValue(cp, null);
            cp = this.consumeNextCodePoint();
        }
        if (cp === SEMICOLON) {
            this.reportParseError("unknown-named-character-reference");
        }
        return this.reconsumeAs(this.returnState);
    }
    NUMERIC_CHARACTER_REFERENCE(cp) {
        this.crCode = 0;
        if (cp === LATIN_SMALL_X || cp === LATIN_CAPITAL_X) {
            this.buffer.push(cp);
            return "HEXADEMICAL_CHARACTER_REFERENCE_START";
        }
        return this.reconsumeAs("DECIMAL_CHARACTER_REFERENCE_START");
    }
    HEXADEMICAL_CHARACTER_REFERENCE_START(cp) {
        if (isHexDigit(cp)) {
            return this.reconsumeAs("HEXADEMICAL_CHARACTER_REFERENCE");
        }
        this.reportParseError("absence-of-digits-in-numeric-character-reference");
        return this.reconsumeAs("CHARACTER_REFERENCE_END");
    }
    DECIMAL_CHARACTER_REFERENCE_START(cp) {
        if (isDigit(cp)) {
            return this.reconsumeAs("DECIMAL_CHARACTER_REFERENCE");
        }
        this.reportParseError("absence-of-digits-in-numeric-character-reference");
        return this.reconsumeAs("CHARACTER_REFERENCE_END");
    }
    HEXADEMICAL_CHARACTER_REFERENCE(cp) {
        while (true) {
            if (isDigit(cp)) {
                this.crCode = 16 * this.crCode + (cp - 0x30);
            }
            else if (isUpperHexDigit(cp)) {
                this.crCode = 16 * this.crCode + (cp - 0x37);
            }
            else if (isLowerHexDigit(cp)) {
                this.crCode = 16 * this.crCode + (cp - 0x57);
            }
            else {
                if (cp === SEMICOLON) {
                    return "NUMERIC_CHARACTER_REFERENCE_END";
                }
                this.reportParseError("missing-semicolon-after-character-reference");
                return this.reconsumeAs("NUMERIC_CHARACTER_REFERENCE_END");
            }
            cp = this.consumeNextCodePoint();
        }
    }
    DECIMAL_CHARACTER_REFERENCE(cp) {
        while (true) {
            if (isDigit(cp)) {
                this.crCode = 10 * this.crCode + (cp - 0x30);
            }
            else {
                if (cp === SEMICOLON) {
                    return "NUMERIC_CHARACTER_REFERENCE_END";
                }
                this.reportParseError("missing-semicolon-after-character-reference");
                return this.reconsumeAs("NUMERIC_CHARACTER_REFERENCE_END");
            }
            cp = this.consumeNextCodePoint();
        }
    }
    NUMERIC_CHARACTER_REFERENCE_END(_cp) {
        let code = this.crCode;
        if (code === 0) {
            this.reportParseError("null-character-reference");
            code = NULL_REPLACEMENT;
        }
        else if (code > 0x10ffff) {
            this.reportParseError("character-reference-outside-unicode-range");
            code = NULL_REPLACEMENT;
        }
        else if (isSurrogate(code)) {
            this.reportParseError("surrogate-character-reference");
            code = NULL_REPLACEMENT;
        }
        else if (isNonCharacter(code)) {
            this.reportParseError("noncharacter-character-reference");
        }
        else if (code === 0x0d || (isControl(code) && !isWhitespace(code))) {
            this.reportParseError("control-character-reference");
            code = alternativeCR.get(code) || code;
        }
        this.buffer = [code];
        return this.reconsumeAs("CHARACTER_REFERENCE_END");
    }
    CHARACTER_REFERENCE_END(_cp) {
        assert__default["default"](this.currentToken != null);
        const token = this.currentToken;
        const len0 = token.value.length;
        for (const cp1 of this.buffer) {
            this.appendTokenValue(cp1, null);
        }
        const newLength = token.value.length - len0;
        for (let i = this.crStartOffset + newLength; i < this.offset; ++i) {
            this.gaps.push(i);
        }
        return this.reconsumeAs(this.returnState);
    }
    V_EXPRESSION_START(cp) {
        if (cp === LEFT_CURLY_BRACKET) {
            this.startToken("VExpressionStart");
            this.appendTokenValue(LEFT_CURLY_BRACKET, null);
            this.appendTokenValue(LEFT_CURLY_BRACKET, null);
            if (!(this.parserOptions.vueFeatures?.interpolationAsNonHTML ??
                true)) {
                return this.returnState;
            }
            const closeIndex = this.text.indexOf("}}", this.offset + 1);
            if (closeIndex === -1) {
                this.reportParseError("x-missing-interpolation-end");
                return this.returnState;
            }
            this.vExpressionScriptState = {
                state: this.returnState,
            };
            return "V_EXPRESSION_DATA";
        }
        this.appendTokenValue(LEFT_CURLY_BRACKET, null);
        return this.reconsumeAs(this.returnState);
    }
    V_EXPRESSION_DATA(cp) {
        this.clearStartTokenMark();
        const state = this.vExpressionScriptState.state;
        while (true) {
            const type = isWhitespace(cp)
                ? "HTMLWhitespace"
                : state === "RCDATA"
                    ? "HTMLRCDataText"
                    : state === "RAWTEXT"
                        ? "HTMLRawText"
                        : "HTMLText";
            if (this.currentToken != null && this.currentToken.type !== type) {
                this.endToken();
                return this.reconsumeAs(this.state);
            }
            if (this.currentToken == null) {
                this.startToken(type);
            }
            if (cp === AMPERSAND && state !== "RAWTEXT") {
                this.returnState = "V_EXPRESSION_DATA";
                return "CHARACTER_REFERENCE";
            }
            if (cp === RIGHT_CURLY_BRACKET) {
                this.setStartTokenMark();
                this.returnState = "V_EXPRESSION_DATA";
                return "V_EXPRESSION_END";
            }
            if (cp === EOF) {
                this.reportParseError("x-missing-interpolation-end");
                return "DATA";
            }
            if (cp === NULL) {
                this.reportParseError("unexpected-null-character");
            }
            this.appendTokenValue(cp, type);
            cp = this.consumeNextCodePoint();
        }
    }
    V_EXPRESSION_END(cp) {
        if (cp === RIGHT_CURLY_BRACKET) {
            this.startToken("VExpressionEnd");
            this.appendTokenValue(RIGHT_CURLY_BRACKET, null);
            this.appendTokenValue(RIGHT_CURLY_BRACKET, null);
            if (this.vExpressionScriptState) {
                const state = this.vExpressionScriptState.state;
                this.vExpressionScriptState = null;
                return state;
            }
            return this.returnState;
        }
        this.appendTokenValue(RIGHT_CURLY_BRACKET, null);
        return this.reconsumeAs(this.returnState);
    }
}

function getPossibleTypes(parsedSelector) {
    switch (parsedSelector.type) {
        case "identifier":
            return [parsedSelector.value];
        case "matches": {
            const typesForComponents = parsedSelector.selectors.map(getPossibleTypes);
            if (typesForComponents.every(Boolean)) {
                return union__default["default"](...typesForComponents);
            }
            return null;
        }
        case "compound": {
            const typesForComponents = parsedSelector.selectors
                .map(getPossibleTypes)
                .filter(Boolean);
            if (!typesForComponents.length) {
                return null;
            }
            return intersection__default["default"](...typesForComponents);
        }
        case "child":
        case "descendant":
        case "sibling":
        case "adjacent":
            return getPossibleTypes(parsedSelector.right);
        default:
            return null;
    }
}
function countClassAttributes(parsedSelector) {
    switch (parsedSelector.type) {
        case "child":
        case "descendant":
        case "sibling":
        case "adjacent":
            return (countClassAttributes(parsedSelector.left) +
                countClassAttributes(parsedSelector.right));
        case "compound":
        case "not":
        case "matches":
            return parsedSelector.selectors.reduce((sum, childSelector) => sum + countClassAttributes(childSelector), 0);
        case "attribute":
        case "field":
        case "nth-child":
        case "nth-last-child":
            return 1;
        default:
            return 0;
    }
}
function countIdentifiers(parsedSelector) {
    switch (parsedSelector.type) {
        case "child":
        case "descendant":
        case "sibling":
        case "adjacent":
            return (countIdentifiers(parsedSelector.left) +
                countIdentifiers(parsedSelector.right));
        case "compound":
        case "not":
        case "matches":
            return parsedSelector.selectors.reduce((sum, childSelector) => sum + countIdentifiers(childSelector), 0);
        case "identifier":
            return 1;
        default:
            return 0;
    }
}
function compareSpecificity(selectorA, selectorB) {
    return (selectorA.attributeCount - selectorB.attributeCount ||
        selectorA.identifierCount - selectorB.identifierCount ||
        (selectorA.rawSelector <= selectorB.rawSelector ? -1 : 1));
}
function tryParseSelector(rawSelector) {
    try {
        return esquery__default["default"].parse(rawSelector.replace(/:exit$/u, ""));
    }
    catch (err) {
        if (typeof err.offset === "number") {
            throw new Error(`Syntax error in selector "${rawSelector}" at position ${err.offset}: ${err.message}`);
        }
        throw err;
    }
}
const parseSelector = memoize__default["default"]((rawSelector) => {
    const parsedSelector = tryParseSelector(rawSelector);
    return {
        rawSelector,
        isExit: rawSelector.endsWith(":exit"),
        parsedSelector,
        listenerTypes: getPossibleTypes(parsedSelector),
        attributeCount: countClassAttributes(parsedSelector),
        identifierCount: countIdentifiers(parsedSelector),
    };
});
class NodeEventGenerator {
    emitter;
    esqueryOptions;
    currentAncestry;
    enterSelectorsByNodeType;
    exitSelectorsByNodeType;
    anyTypeEnterSelectors;
    anyTypeExitSelectors;
    constructor(emitter, esqueryOptions) {
        this.emitter = emitter;
        this.esqueryOptions = esqueryOptions;
        this.currentAncestry = [];
        this.enterSelectorsByNodeType = new Map();
        this.exitSelectorsByNodeType = new Map();
        this.anyTypeEnterSelectors = [];
        this.anyTypeExitSelectors = [];
        const eventNames = typeof emitter.eventNames === "function"
            ?
                emitter.eventNames()
            :
                Object.keys(emitter._events);
        for (const rawSelector of eventNames) {
            if (typeof rawSelector === "symbol") {
                continue;
            }
            const selector = parseSelector(rawSelector);
            if (selector.listenerTypes) {
                for (const nodeType of selector.listenerTypes) {
                    const typeMap = selector.isExit
                        ? this.exitSelectorsByNodeType
                        : this.enterSelectorsByNodeType;
                    let selectors = typeMap.get(nodeType);
                    if (selectors == null) {
                        typeMap.set(nodeType, (selectors = []));
                    }
                    selectors.push(selector);
                }
            }
            else {
                (selector.isExit
                    ? this.anyTypeExitSelectors
                    : this.anyTypeEnterSelectors).push(selector);
            }
        }
        this.anyTypeEnterSelectors.sort(compareSpecificity);
        this.anyTypeExitSelectors.sort(compareSpecificity);
        for (const selectorList of this.enterSelectorsByNodeType.values()) {
            selectorList.sort(compareSpecificity);
        }
        for (const selectorList of this.exitSelectorsByNodeType.values()) {
            selectorList.sort(compareSpecificity);
        }
    }
    applySelector(node, selector) {
        if (esquery__default["default"].matches(node, selector.parsedSelector, this.currentAncestry, this.esqueryOptions)) {
            this.emitter.emit(selector.rawSelector, node);
        }
    }
    applySelectors(node, isExit) {
        const selectorsByNodeType = (isExit
            ? this.exitSelectorsByNodeType
            : this.enterSelectorsByNodeType).get(node.type) || [];
        const anyTypeSelectors = isExit
            ? this.anyTypeExitSelectors
            : this.anyTypeEnterSelectors;
        let selectorsByTypeIndex = 0;
        let anyTypeSelectorsIndex = 0;
        while (selectorsByTypeIndex < selectorsByNodeType.length ||
            anyTypeSelectorsIndex < anyTypeSelectors.length) {
            if (selectorsByTypeIndex >= selectorsByNodeType.length ||
                (anyTypeSelectorsIndex < anyTypeSelectors.length &&
                    compareSpecificity(anyTypeSelectors[anyTypeSelectorsIndex], selectorsByNodeType[selectorsByTypeIndex]) < 0)) {
                this.applySelector(node, anyTypeSelectors[anyTypeSelectorsIndex++]);
            }
            else {
                this.applySelector(node, selectorsByNodeType[selectorsByTypeIndex++]);
            }
        }
    }
    enterNode(node) {
        if (node.parent) {
            this.currentAncestry.unshift(node.parent);
        }
        this.applySelectors(node, false);
    }
    leaveNode(node) {
        this.applySelectors(node, true);
        this.currentAncestry.shift();
    }
}

function getStartLocation(token) {
    return token.range[0];
}
function search(tokens, location) {
    return sortedIndexBy__default["default"](tokens, { range: [location] }, getStartLocation);
}
function getFirstIndex(tokens, indexMap, startLoc) {
    if (startLoc in indexMap) {
        return indexMap[startLoc];
    }
    if (startLoc - 1 in indexMap) {
        const index = indexMap[startLoc - 1];
        const token = index >= 0 && index < tokens.length ? tokens[index] : null;
        if (token && token.range[0] >= startLoc) {
            return index;
        }
        return index + 1;
    }
    return 0;
}
function getLastIndex(tokens, indexMap, endLoc) {
    if (endLoc in indexMap) {
        return indexMap[endLoc] - 1;
    }
    if (endLoc - 1 in indexMap) {
        const index = indexMap[endLoc - 1];
        const token = index >= 0 && index < tokens.length ? tokens[index] : null;
        if (token && token.range[1] > endLoc) {
            return index - 1;
        }
        return index;
    }
    return tokens.length - 1;
}

class Cursor {
    current;
    constructor() {
        this.current = null;
    }
    getOneToken() {
        return this.moveNext() ? this.current : null;
    }
    getAllTokens() {
        const tokens = [];
        while (this.moveNext()) {
            tokens.push(this.current);
        }
        return tokens;
    }
}

class BackwardTokenCommentCursor extends Cursor {
    tokens;
    comments;
    tokenIndex;
    commentIndex;
    border;
    constructor(tokens, comments, indexMap, startLoc, endLoc) {
        super();
        this.tokens = tokens;
        this.comments = comments;
        this.tokenIndex = getLastIndex(tokens, indexMap, endLoc);
        this.commentIndex = search(comments, endLoc) - 1;
        this.border = startLoc;
    }
    moveNext() {
        const token = this.tokenIndex >= 0 ? this.tokens[this.tokenIndex] : null;
        const comment = this.commentIndex >= 0 ? this.comments[this.commentIndex] : null;
        if (token && (!comment || token.range[1] > comment.range[1])) {
            this.current = token;
            this.tokenIndex -= 1;
        }
        else if (comment) {
            this.current = comment;
            this.commentIndex -= 1;
        }
        else {
            this.current = null;
        }
        return (this.current != null &&
            (this.border === -1 || this.current.range[0] >= this.border));
    }
}

class BackwardTokenCursor extends Cursor {
    tokens;
    index;
    indexEnd;
    constructor(tokens, _comments, indexMap, startLoc, endLoc) {
        super();
        this.tokens = tokens;
        this.index = getLastIndex(tokens, indexMap, endLoc);
        this.indexEnd = getFirstIndex(tokens, indexMap, startLoc);
    }
    moveNext() {
        if (this.index >= this.indexEnd) {
            this.current = this.tokens[this.index];
            this.index -= 1;
            return true;
        }
        return false;
    }
    getOneToken() {
        return this.index >= this.indexEnd ? this.tokens[this.index] : null;
    }
}

class DecorativeCursor extends Cursor {
    cursor;
    constructor(cursor) {
        super();
        this.cursor = cursor;
    }
    moveNext() {
        const retv = this.cursor.moveNext();
        this.current = this.cursor.current;
        return retv;
    }
}

class FilterCursor extends DecorativeCursor {
    predicate;
    constructor(cursor, predicate) {
        super(cursor);
        this.predicate = predicate;
    }
    moveNext() {
        const predicate = this.predicate;
        while (super.moveNext()) {
            if (predicate(this.current)) {
                return true;
            }
        }
        return false;
    }
}

class ForwardTokenCommentCursor extends Cursor {
    tokens;
    comments;
    tokenIndex;
    commentIndex;
    border;
    constructor(tokens, comments, indexMap, startLoc, endLoc) {
        super();
        this.tokens = tokens;
        this.comments = comments;
        this.tokenIndex = getFirstIndex(tokens, indexMap, startLoc);
        this.commentIndex = search(comments, startLoc);
        this.border = endLoc;
    }
    moveNext() {
        const token = this.tokenIndex < this.tokens.length
            ? this.tokens[this.tokenIndex]
            : null;
        const comment = this.commentIndex < this.comments.length
            ? this.comments[this.commentIndex]
            : null;
        if (token && (!comment || token.range[0] < comment.range[0])) {
            this.current = token;
            this.tokenIndex += 1;
        }
        else if (comment) {
            this.current = comment;
            this.commentIndex += 1;
        }
        else {
            this.current = null;
        }
        return (this.current != null &&
            (this.border === -1 || this.current.range[1] <= this.border));
    }
}

class ForwardTokenCursor extends Cursor {
    tokens;
    index;
    indexEnd;
    constructor(tokens, _comments, indexMap, startLoc, endLoc) {
        super();
        this.tokens = tokens;
        this.index = getFirstIndex(tokens, indexMap, startLoc);
        this.indexEnd = getLastIndex(tokens, indexMap, endLoc);
    }
    moveNext() {
        if (this.index <= this.indexEnd) {
            this.current = this.tokens[this.index];
            this.index += 1;
            return true;
        }
        return false;
    }
    getOneToken() {
        return this.index <= this.indexEnd ? this.tokens[this.index] : null;
    }
    getAllTokens() {
        return this.tokens.slice(this.index, this.indexEnd + 1);
    }
}

class LimitCursor extends DecorativeCursor {
    count;
    constructor(cursor, count) {
        super(cursor);
        this.count = count;
    }
    moveNext() {
        if (this.count > 0) {
            this.count -= 1;
            return super.moveNext();
        }
        return false;
    }
}

class SkipCursor extends DecorativeCursor {
    count;
    constructor(cursor, count) {
        super(cursor);
        this.count = count;
    }
    moveNext() {
        while (this.count > 0) {
            this.count -= 1;
            if (!super.moveNext()) {
                return false;
            }
        }
        return super.moveNext();
    }
}

class CursorFactory {
    TokenCursor;
    TokenCommentCursor;
    constructor(TokenCursor, TokenCommentCursor) {
        this.TokenCursor = TokenCursor;
        this.TokenCommentCursor = TokenCommentCursor;
    }
    createBaseCursor(tokens, comments, indexMap, startLoc, endLoc, includeComments) {
        const TokenCursor = includeComments
            ? this.TokenCommentCursor
            : this.TokenCursor;
        return new TokenCursor(tokens, comments, indexMap, startLoc, endLoc);
    }
    createCursor(tokens, comments, indexMap, startLoc, endLoc, includeComments, filter, skip, count) {
        let cursor = this.createBaseCursor(tokens, comments, indexMap, startLoc, endLoc, includeComments);
        if (filter) {
            cursor = new FilterCursor(cursor, filter);
        }
        if (skip >= 1) {
            cursor = new SkipCursor(cursor, skip);
        }
        if (count >= 0) {
            cursor = new LimitCursor(cursor, count);
        }
        return cursor;
    }
}
const forward = new CursorFactory(ForwardTokenCursor, ForwardTokenCommentCursor);
const backward = new CursorFactory(BackwardTokenCursor, BackwardTokenCommentCursor);

class PaddedTokenCursor extends ForwardTokenCursor {
    constructor(tokens, comments, indexMap, startLoc, endLoc, beforeCount, afterCount) {
        super(tokens, comments, indexMap, startLoc, endLoc);
        this.index = Math.max(0, this.index - beforeCount);
        this.indexEnd = Math.min(tokens.length - 1, this.indexEnd + afterCount);
    }
}

function isCommentToken(token) {
    return (token.type === "Line" ||
        token.type === "Block" ||
        token.type === "Shebang");
}
function createIndexMap(tokens, comments) {
    const map = Object.create(null);
    let tokenIndex = 0;
    let commentIndex = 0;
    let nextStart = 0;
    let range = null;
    while (tokenIndex < tokens.length || commentIndex < comments.length) {
        nextStart =
            commentIndex < comments.length
                ? comments[commentIndex].range[0]
                : Number.MAX_SAFE_INTEGER;
        while (tokenIndex < tokens.length &&
            (range = tokens[tokenIndex].range)[0] < nextStart) {
            map[range[0]] = tokenIndex;
            map[range[1] - 1] = tokenIndex;
            tokenIndex += 1;
        }
        nextStart =
            tokenIndex < tokens.length
                ? tokens[tokenIndex].range[0]
                : Number.MAX_SAFE_INTEGER;
        while (commentIndex < comments.length &&
            (range = comments[commentIndex].range)[0] < nextStart) {
            map[range[0]] = tokenIndex;
            map[range[1] - 1] = tokenIndex;
            commentIndex += 1;
        }
    }
    return map;
}
function createCursorWithSkip(factory, tokens, comments, indexMap, startLoc, endLoc, opts) {
    let includeComments = false;
    let skip = 0;
    let filter = null;
    if (typeof opts === "number") {
        skip = opts | 0;
    }
    else if (typeof opts === "function") {
        filter = opts;
    }
    else if (opts) {
        includeComments = Boolean(opts.includeComments);
        skip = opts.skip || 0;
        filter = opts.filter || null;
    }
    assert__default["default"](skip >= 0, "options.skip should be zero or a positive integer.");
    assert__default["default"](!filter || typeof filter === "function", "options.filter should be a function.");
    return factory.createCursor(tokens, comments, indexMap, startLoc, endLoc, includeComments, filter, skip, -1);
}
function createCursorWithCount(factory, tokens, comments, indexMap, startLoc, endLoc, opts) {
    let includeComments = false;
    let count = 0;
    let countExists = false;
    let filter = null;
    if (typeof opts === "number") {
        count = opts | 0;
        countExists = true;
    }
    else if (typeof opts === "function") {
        filter = opts;
    }
    else if (opts) {
        includeComments = Boolean(opts.includeComments);
        count = opts.count || 0;
        countExists = typeof opts.count === "number";
        filter = opts.filter || null;
    }
    assert__default["default"](count >= 0, "options.count should be zero or a positive integer.");
    assert__default["default"](!filter || typeof filter === "function", "options.filter should be a function.");
    return factory.createCursor(tokens, comments, indexMap, startLoc, endLoc, includeComments, filter, 0, countExists ? count : -1);
}
function createCursorWithPadding(tokens, comments, indexMap, startLoc, endLoc, beforeCount, afterCount) {
    if (typeof beforeCount === "undefined" &&
        typeof afterCount === "undefined") {
        return new ForwardTokenCursor(tokens, comments, indexMap, startLoc, endLoc);
    }
    if (typeof beforeCount === "number" || typeof beforeCount === "undefined") {
        return new PaddedTokenCursor(tokens, comments, indexMap, startLoc, endLoc, beforeCount || 0, afterCount || 0);
    }
    return createCursorWithCount(forward, tokens, comments, indexMap, startLoc, endLoc, beforeCount);
}
function getAdjacentCommentTokensFromCursor(cursor) {
    const tokens = [];
    let currentToken = cursor.getOneToken();
    while (currentToken && isCommentToken(currentToken)) {
        tokens.push(currentToken);
        currentToken = cursor.getOneToken();
    }
    return tokens;
}
class TokenStore {
    _tokens;
    _comments;
    _indexMap;
    constructor(tokens, comments) {
        this._tokens = tokens;
        this._comments = comments;
        this._indexMap = createIndexMap(tokens, comments);
    }
    getTokenByRangeStart(offset, options) {
        const includeComments = Boolean(options && options.includeComments);
        const token = forward
            .createBaseCursor(this._tokens, this._comments, this._indexMap, offset, -1, includeComments)
            .getOneToken();
        if (token?.range[0] === offset) {
            return token;
        }
        return null;
    }
    getFirstToken(node, options) {
        return createCursorWithSkip(forward, this._tokens, this._comments, this._indexMap, node.range[0], node.range[1], options).getOneToken();
    }
    getLastToken(node, options) {
        return createCursorWithSkip(backward, this._tokens, this._comments, this._indexMap, node.range[0], node.range[1], options).getOneToken();
    }
    getTokenBefore(node, options) {
        return createCursorWithSkip(backward, this._tokens, this._comments, this._indexMap, -1, node.range[0], options).getOneToken();
    }
    getTokenAfter(node, options) {
        return createCursorWithSkip(forward, this._tokens, this._comments, this._indexMap, node.range[1], -1, options).getOneToken();
    }
    getFirstTokenBetween(left, right, options) {
        return createCursorWithSkip(forward, this._tokens, this._comments, this._indexMap, left.range[1], right.range[0], options).getOneToken();
    }
    getLastTokenBetween(left, right, options) {
        return createCursorWithSkip(backward, this._tokens, this._comments, this._indexMap, left.range[1], right.range[0], options).getOneToken();
    }
    getTokenOrCommentBefore(node, skip) {
        return this.getTokenBefore(node, { includeComments: true, skip });
    }
    getTokenOrCommentAfter(node, skip) {
        return this.getTokenAfter(node, { includeComments: true, skip });
    }
    getFirstTokens(node, options) {
        return createCursorWithCount(forward, this._tokens, this._comments, this._indexMap, node.range[0], node.range[1], options).getAllTokens();
    }
    getLastTokens(node, options) {
        return createCursorWithCount(backward, this._tokens, this._comments, this._indexMap, node.range[0], node.range[1], options)
            .getAllTokens()
            .reverse();
    }
    getTokensBefore(node, options) {
        return createCursorWithCount(backward, this._tokens, this._comments, this._indexMap, -1, node.range[0], options)
            .getAllTokens()
            .reverse();
    }
    getTokensAfter(node, options) {
        return createCursorWithCount(forward, this._tokens, this._comments, this._indexMap, node.range[1], -1, options).getAllTokens();
    }
    getFirstTokensBetween(left, right, options) {
        return createCursorWithCount(forward, this._tokens, this._comments, this._indexMap, left.range[1], right.range[0], options).getAllTokens();
    }
    getLastTokensBetween(left, right, options) {
        return createCursorWithCount(backward, this._tokens, this._comments, this._indexMap, left.range[1], right.range[0], options)
            .getAllTokens()
            .reverse();
    }
    getTokens(node, beforeCount, afterCount) {
        return createCursorWithPadding(this._tokens, this._comments, this._indexMap, node.range[0], node.range[1], beforeCount, afterCount).getAllTokens();
    }
    getTokensBetween(left, right, padding) {
        return createCursorWithPadding(this._tokens, this._comments, this._indexMap, left.range[1], right.range[0], padding, typeof padding === "number" ? padding : undefined).getAllTokens();
    }
    commentsExistBetween(left, right) {
        const index = search(this._comments, left.range[1]);
        return (index < this._comments.length &&
            this._comments[index].range[1] <= right.range[0]);
    }
    getCommentsBefore(nodeOrToken) {
        const cursor = createCursorWithCount(backward, this._tokens, this._comments, this._indexMap, -1, nodeOrToken.range[0], { includeComments: true });
        return getAdjacentCommentTokensFromCursor(cursor).reverse();
    }
    getCommentsAfter(nodeOrToken) {
        const cursor = createCursorWithCount(forward, this._tokens, this._comments, this._indexMap, nodeOrToken.range[1], -1, { includeComments: true });
        return getAdjacentCommentTokensFromCursor(cursor);
    }
    getCommentsInside(node) {
        return this.getTokens(node, {
            includeComments: true,
            filter: isCommentToken,
        });
    }
    getLoc(nodeOrToken) {
        return nodeOrToken.loc;
    }
    getRange(nodeOrToken) {
        return nodeOrToken.range;
    }
}

function isVElement(node) {
    return node.type === "VElement";
}
function getCustomBlocks(document) {
    return document
        ? document.children
            .filter(isVElement)
            .filter((block) => block.name !== "script" &&
            block.name !== "template" &&
            block.name !== "style")
        : [];
}
function parseCustomBlockElement(node, parser, globalLocationCalculator, parserOptions) {
    const text = node.children[0];
    const { code, range, loc } = text?.type === "VText"
        ? {
            code: text.value,
            range: text.range,
            loc: text.loc,
        }
        : {
            code: "",
            range: [
                node.startTag.range[1],
                node.endTag.range[0],
            ],
            loc: {
                start: node.startTag.loc.end,
                end: node.endTag.loc.start,
            },
        };
    const locationCalculator = globalLocationCalculator.getSubCalculatorAfter(range[0]);
    try {
        return parseCustomBlockFragment(code, parser, locationCalculator, parserOptions);
    }
    catch (e) {
        if (!(e instanceof Error)) {
            throw e;
        }
        return {
            error: e,
            ast: {
                type: "Program",
                sourceType: "module",
                loc: {
                    start: {
                        ...loc.start,
                    },
                    end: {
                        ...loc.end,
                    },
                },
                range: [...range],
                body: [],
                tokens: [],
                comments: [],
            },
        };
    }
}
function parseCustomBlockFragment(code, parser, locationCalculator, parserOptions) {
    try {
        const result = parseBlock(code, parser, {
            ecmaVersion: DEFAULT_ECMA_VERSION,
            loc: true,
            range: true,
            raw: true,
            tokens: true,
            comment: true,
            eslintVisitorKeys: true,
            eslintScopeManager: true,
            ...parserOptions,
        });
        fixLocations(result, locationCalculator);
        return result;
    }
    catch (err) {
        const perr = ParseError.normalize(err);
        if (perr) {
            fixErrorLocation(perr, locationCalculator);
            throw perr;
        }
        throw err;
    }
}
function parseBlock(code, parser, parserOptions) {
    const result = isEnhancedParserObject(parser)
        ? parser.parseForESLint(code, parserOptions)
        : parser.parse(code, parserOptions);
    if (result.ast != null) {
        return result;
    }
    return { ast: result };
}
function createCustomBlockSharedContext({ text, customBlock, parsedResult, globalLocationCalculator, parserOptions, }) {
    let sourceCode;
    let currentNode;
    return {
        serCurrentNode(node) {
            currentNode = node;
        },
        context: {
            getAncestors: () => getSourceCode().getAncestors(currentNode),
            getDeclaredVariables: (...args) => getSourceCode().getDeclaredVariables(...args),
            getScope: () => getSourceCode().getScope(currentNode),
            markVariableAsUsed: (name) => getSourceCode().markVariableAsUsed(name, currentNode),
            get parserServices() {
                return getSourceCode().parserServices;
            },
            getSourceCode,
            get sourceCode() {
                return getSourceCode();
            },
        },
    };
    function getSourceCode() {
        if (sourceCode) {
            return sourceCode;
        }
        const scopeManager = getScopeManager();
        const originalSourceCode = new (require("eslint").SourceCode)({
            text,
            ast: parsedResult.ast,
            parserServices: {
                customBlock,
                parseCustomBlockElement(parser, options) {
                    return parseCustomBlockElement(customBlock, parser, globalLocationCalculator, { ...parserOptions, ...options });
                },
                ...parsedResult.services,
                ...(parsedResult.error
                    ? { parseError: parsedResult.error }
                    : {}),
            },
            scopeManager,
            visitorKeys: parsedResult.visitorKeys,
        });
        const polyfills = {
            markVariableAsUsed: (name, node) => markVariableAsUsed(scopeManager, node, parsedResult.ast, name),
            getScope: (node) => getScope(scopeManager, node),
            getAncestors: (node) => getAncestors(node),
            getDeclaredVariables: (...args) => scopeManager.getDeclaredVariables(...args),
        };
        return (sourceCode = new Proxy(originalSourceCode, {
            get(_target, prop) {
                return originalSourceCode[prop] || polyfills[prop];
            },
        }));
    }
    function getScopeManager() {
        if (parsedResult.scopeManager) {
            return parsedResult.scopeManager;
        }
        const ecmaVersion = getEcmaVersionIfUseEspree(parserOptions) ??
            ANALYZE_SCOPE_DEFAULT_ECMA_VERSION;
        const ecmaFeatures = parserOptions.ecmaFeatures ?? {};
        const sourceType = parserOptions.sourceType ?? "script";
        return getEslintScope().analyze(parsedResult.ast, {
            ignoreEval: true,
            nodejsScope: false,
            impliedStrict: ecmaFeatures.impliedStrict,
            ecmaVersion,
            sourceType,
            fallback: getFallbackKeys,
        });
    }
}
function getAncestors(node) {
    const ancestorsStartingAtParent = [];
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
        ancestorsStartingAtParent.push(ancestor);
    }
    return ancestorsStartingAtParent.reverse();
}
function getScope(scopeManager, currentNode) {
    const inner = currentNode.type !== "Program";
    for (let node = currentNode; node; node = node.parent ?? null) {
        const scope = scopeManager.acquire(node, inner);
        if (scope) {
            if (scope.type === "function-expression-name") {
                return scope.childScopes[0];
            }
            return scope;
        }
    }
    return scopeManager.scopes[0];
}
function markVariableAsUsed(scopeManager, currentNode, program, name) {
    const currentScope = getScope(scopeManager, currentNode);
    let initialScope = currentScope;
    if (currentScope.type === "global" &&
        currentScope.childScopes.length > 0 &&
        currentScope.childScopes[0].block === program) {
        initialScope = currentScope.childScopes[0];
    }
    for (let scope = initialScope; scope; scope = scope.upper) {
        const variable = scope.variables.find((scopeVar) => scopeVar.name === name);
        if (variable) {
            variable.eslintUsed = true;
            return true;
        }
    }
    return false;
}

function define(sourceText, rootAST, document, globalLocationCalculator, { parserOptions }) {
    const templateBodyEmitters = new Map();
    const stores = new WeakMap();
    const documentEmitters = new Map();
    const customBlocksEmitters = new Map();
    const isSFC = isSFCFile(parserOptions);
    return {
        defineTemplateBodyVisitor(templateBodyVisitor, scriptVisitor, options) {
            if (scriptVisitor == null) {
                scriptVisitor = {};
            }
            if (rootAST.templateBody == null) {
                return scriptVisitor;
            }
            const templateBodyTriggerSelector = options?.templateBodyTriggerSelector ?? "Program:exit";
            let emitter = templateBodyEmitters.get(templateBodyTriggerSelector);
            if (emitter == null) {
                emitter = new EventEmitter__default["default"]();
                emitter.setMaxListeners(0);
                templateBodyEmitters.set(templateBodyTriggerSelector, emitter);
                const programExitHandler = scriptVisitor[templateBodyTriggerSelector];
                scriptVisitor[templateBodyTriggerSelector] = (node) => {
                    try {
                        if (typeof programExitHandler === "function") {
                            programExitHandler(node);
                        }
                        const generator = new NodeEventGenerator(emitter, {
                            visitorKeys: KEYS,
                            fallback: getFallbackKeys,
                        });
                        traverseNodes(rootAST.templateBody, generator);
                    }
                    finally {
                        scriptVisitor[templateBodyTriggerSelector] =
                            programExitHandler;
                        templateBodyEmitters.delete(templateBodyTriggerSelector);
                    }
                };
            }
            for (const selector of Object.keys(templateBodyVisitor)) {
                emitter.on(selector, templateBodyVisitor[selector]);
            }
            return scriptVisitor;
        },
        defineDocumentVisitor(documentVisitor, options) {
            const scriptVisitor = {};
            if (!document) {
                return scriptVisitor;
            }
            const documentTriggerSelector = options?.triggerSelector ?? "Program:exit";
            let emitter = documentEmitters.get(documentTriggerSelector);
            if (emitter == null) {
                emitter = new EventEmitter__default["default"]();
                emitter.setMaxListeners(0);
                documentEmitters.set(documentTriggerSelector, emitter);
                const programExitHandler = scriptVisitor[documentTriggerSelector];
                scriptVisitor[documentTriggerSelector] = (node) => {
                    try {
                        if (typeof programExitHandler === "function") {
                            programExitHandler(node);
                        }
                        const generator = new NodeEventGenerator(emitter, {
                            visitorKeys: KEYS,
                            fallback: getFallbackKeys,
                        });
                        traverseNodes(document, generator);
                    }
                    finally {
                        scriptVisitor[documentTriggerSelector] =
                            programExitHandler;
                        documentEmitters.delete(documentTriggerSelector);
                    }
                };
            }
            for (const selector of Object.keys(documentVisitor)) {
                emitter.on(selector, documentVisitor[selector]);
            }
            return scriptVisitor;
        },
        defineCustomBlocksVisitor(context, parser, rule, scriptVisitor) {
            if (scriptVisitor == null) {
                scriptVisitor = {};
            }
            if (!isSFC) {
                return scriptVisitor;
            }
            parserOptions = { ...parserOptions };
            const customBlocks = getCustomBlocks(document).filter((block) => block.endTag &&
                !block.startTag.attributes.some((attr) => !attr.directive && attr.key.name === "src"));
            if (!customBlocks.length || globalLocationCalculator == null) {
                return {};
            }
            const key = parser.parseForESLint ?? parser.parse;
            let factories = customBlocksEmitters.get(key);
            if (factories == null) {
                factories = [];
                customBlocksEmitters.set(key, factories);
                const visitorFactories = factories;
                const programExitHandler = scriptVisitor["Program:exit"];
                scriptVisitor["Program:exit"] = (node) => {
                    try {
                        if (typeof programExitHandler === "function") {
                            programExitHandler(node);
                        }
                        for (const customBlock of customBlocks) {
                            const lang = getLang(customBlock);
                            const activeVisitorFactories = visitorFactories.filter((f) => f.test(lang, customBlock));
                            if (!activeVisitorFactories.length) {
                                continue;
                            }
                            const parsedResult = parseCustomBlockElement(customBlock, parser, globalLocationCalculator, parserOptions);
                            const { serCurrentNode, context: customBlockContext, } = createCustomBlockSharedContext({
                                text: sourceText,
                                customBlock,
                                parsedResult,
                                globalLocationCalculator,
                                parserOptions,
                            });
                            const emitter = new EventEmitter__default["default"]();
                            emitter.setMaxListeners(0);
                            for (const factory of activeVisitorFactories) {
                                const ctx = {
                                    ...customBlockContext,
                                };
                                ctx.__proto__ = factory.context;
                                const visitor = factory.create(ctx);
                                for (const selector of Object.keys(visitor ?? {})) {
                                    emitter.on(selector, visitor[selector]);
                                }
                            }
                            const generator = new NodeEventGenerator(emitter, {
                                visitorKeys: parsedResult.visitorKeys,
                                fallback: getFallbackKeys,
                            });
                            traverseNodes(parsedResult.ast, {
                                visitorKeys: parsedResult.visitorKeys,
                                enterNode(n) {
                                    serCurrentNode(n);
                                    generator.enterNode(n);
                                },
                                leaveNode(n) {
                                    serCurrentNode(n);
                                    generator.leaveNode(n);
                                },
                            });
                        }
                    }
                    finally {
                        scriptVisitor["Program:exit"] = programExitHandler;
                        customBlocksEmitters.delete(key);
                    }
                };
            }
            const target = rule.target;
            const test = typeof target === "function"
                ? target
                : Array.isArray(target)
                    ? (lang) => Boolean(lang && target.includes(lang))
                    : (lang) => target === lang;
            factories.push({
                context,
                test,
                create: rule.create,
            });
            return scriptVisitor;
        },
        getTemplateBodyTokenStore() {
            const key = document || stores;
            let store = stores.get(key);
            if (!store) {
                store =
                    document != null
                        ? new TokenStore(document.tokens, document.comments)
                        : new TokenStore([], []);
                stores.set(key, store);
            }
            return store;
        },
        getDocumentFragment() {
            return document;
        },
    };
}

class CodeBlocks {
    code;
    remapBlocks = [];
    splitPunctuators = [];
    constructor() {
        this.code = "";
    }
    get length() {
        return this.code.length;
    }
    append(codeLet, originalOffset) {
        const rangeStart = this.code.length;
        this.code += codeLet.trimEnd();
        this.remapBlocks.push({
            range: [rangeStart, this.code.length],
            offset: originalOffset - rangeStart,
        });
    }
    appendSplitPunctuators(punctuator) {
        this.splitPunctuators.push(this.code.length, this.code.length + 1);
        this.code += `\n${punctuator}\n`;
    }
    appendCodeBlocks(codeBlocks) {
        const start = this.code.length;
        this.code += codeBlocks.code;
        this.remapBlocks.push(...codeBlocks.remapBlocks.map((b) => ({
            range: [b.range[0] + start, b.range[1] + start],
            offset: b.offset - start,
        })));
        this.splitPunctuators.push(...codeBlocks.splitPunctuators.map((s) => s + start));
    }
}
class RestoreASTCallbacks {
    callbacks = [];
    addCallback(originalOffsetStart, range, callback) {
        this.callbacks.push({
            range: [
                originalOffsetStart + range[0],
                originalOffsetStart + range[1],
            ],
            callback,
        });
    }
    restore(program, scriptSetupStatements, linesAndColumns) {
        if (this.callbacks.length === 0) {
            return;
        }
        const callbacks = new Set(this.callbacks);
        for (const statement of scriptSetupStatements) {
            for (const cb of callbacks) {
                if (cb.range[0] <= statement.range[0] &&
                    statement.range[1] <= cb.range[1]) {
                    const restored = cb.callback(statement);
                    if (restored) {
                        const removeIndex = program.body.indexOf(statement);
                        if (removeIndex >= 0) {
                            program.body.splice(removeIndex, 1);
                            program.body.push(restored.statement);
                            program.tokens.push(...restored.tokens);
                            restored.statement.parent = program;
                            callbacks.delete(cb);
                            break;
                        }
                    }
                }
            }
        }
        if (callbacks.size) {
            const [cb] = callbacks;
            const loc = linesAndColumns.getLocFromIndex(cb.range[0]);
            throw new ParseError("Could not parse <script setup>. Failed to restore ExportNamedDeclaration.", undefined, cb.range[0], loc.line, loc.column);
        }
    }
}
function parseScript(code, parserOptions, locationCalculatorForError) {
    try {
        return parseScript$1(code, parserOptions);
    }
    catch (err) {
        const perr = ParseError.normalize(err);
        if (perr) {
            fixErrorLocation(perr, locationCalculatorForError);
            throw perr;
        }
        throw err;
    }
}
function parseScriptSetupElements(scriptSetupElement, scriptElement, sfcCode, linesAndColumns, originalParserOptions) {
    const parserOptions = {
        ...originalParserOptions,
        ecmaVersion: originalParserOptions.ecmaVersion ?? DEFAULT_ECMA_VERSION,
    };
    const scriptSetupModuleCodeBlocks = getScriptSetupModuleCodeBlocks(scriptSetupElement, scriptElement, sfcCode, linesAndColumns, parserOptions);
    if (!scriptSetupModuleCodeBlocks) {
        return parseScriptFragment("", linesAndColumns.createOffsetLocationCalculator(scriptSetupElement.startTag.range[1]), parserOptions);
    }
    const locationCalculator = {
        getFixOffset(offset, kind) {
            const test = kind === "start"
                ? (block) => block.range[0] <= offset && offset < block.range[1]
                : (block) => block.range[0] < offset && offset <= block.range[1];
            for (const block of scriptSetupModuleCodeBlocks.codeBlocks
                .remapBlocks) {
                if (test(block)) {
                    return block.offset;
                }
            }
            return offset;
        },
        getLocFromIndex: linesAndColumns.getLocFromIndex.bind(linesAndColumns),
    };
    const result = parseScript(scriptSetupModuleCodeBlocks.codeBlocks.code, parserOptions, locationCalculator);
    if (scriptSetupModuleCodeBlocks.postprocess) {
        scriptSetupModuleCodeBlocks.postprocess(result, {
            scriptSetupBlockRange: scriptSetupModuleCodeBlocks.scriptSetupBlockRange,
        });
    }
    const scriptSetupStatements = remapAST(result, scriptSetupModuleCodeBlocks);
    remapLocationAndTokens(result, scriptSetupModuleCodeBlocks, locationCalculator);
    if (scriptSetupModuleCodeBlocks.restoreASTCallbacks) {
        scriptSetupModuleCodeBlocks.restoreASTCallbacks.restore(result.ast, scriptSetupStatements, linesAndColumns);
    }
    if (result.ast.tokens != null) {
        for (const node of [scriptSetupElement, scriptElement]) {
            const startTag = node.startTag;
            const endTag = node.endTag;
            result.ast.tokens.unshift({
                type: "Punctuator",
                range: startTag.range,
                loc: startTag.loc,
                value: "<script>",
            });
            if (endTag != null) {
                result.ast.tokens.push({
                    type: "Punctuator",
                    range: endTag.range,
                    loc: endTag.loc,
                    value: "</script>",
                });
            }
        }
        result.ast.tokens.sort((a, b) => a.range[0] - b.range[0]);
    }
    result.ast.body.sort((a, b) => a.range[0] - b.range[0]);
    const programStartOffset = result.ast.body.reduce((start, node) => Math.min(start, node.range[0]), result.ast.range[0]);
    result.ast.range[0] = programStartOffset;
    result.ast.loc.start =
        locationCalculator.getLocFromIndex(programStartOffset);
    if (result.ast.start != null) {
        result.ast.start = [scriptSetupElement, scriptElement].reduce((start, node) => {
            const textNode = node.children[0];
            return Math.min(start, textNode?.type === "VText"
                ? textNode.range[0]
                : node.startTag.range[1]);
        }, result.ast.start);
    }
    const programEndOffset = result.ast.body.reduce((end, node) => Math.max(end, node.range[1]), 0);
    result.ast.range[1] = programEndOffset;
    result.ast.loc.end = locationCalculator.getLocFromIndex(programEndOffset);
    if (result.ast.end != null) {
        result.ast.end = [scriptSetupElement, scriptElement].reduce((end, node) => {
            const textNode = node.children[0];
            return Math.max(end, textNode?.type === "VText"
                ? textNode.range[1]
                : (node.endTag?.range[0] ?? node.range[1]));
        }, 0);
    }
    return result;
}
function getScriptSetupModuleCodeBlocks(scriptSetupElement, scriptElement, sfcCode, linesAndColumns, parserOptions) {
    const scriptSetupCodeBlocks = getScriptSetupCodeBlocks(scriptSetupElement, sfcCode, linesAndColumns, parserOptions);
    const textNode = scriptElement.children[0];
    if (textNode == null || textNode.type !== "VText") {
        return scriptSetupCodeBlocks;
    }
    const [scriptStartOffset, scriptEndOffset] = textNode.range;
    const codeBlocks = new CodeBlocks();
    codeBlocks.append(sfcCode.slice(scriptStartOffset, scriptEndOffset), scriptStartOffset);
    if (scriptSetupCodeBlocks == null) {
        return { codeBlocks };
    }
    codeBlocks.appendSplitPunctuators(";");
    const scriptSetupOffset = codeBlocks.length;
    codeBlocks.appendCodeBlocks(scriptSetupCodeBlocks.codeBlocks);
    return {
        codeBlocks,
        scriptSetupBlockRange: [
            scriptSetupCodeBlocks.scriptSetupBlockRange[0] + scriptSetupOffset,
            scriptSetupCodeBlocks.scriptSetupBlockRange[1] + scriptSetupOffset,
        ],
        postprocess: scriptSetupCodeBlocks.postprocess,
        restoreASTCallbacks: scriptSetupCodeBlocks.restoreASTCallbacks,
    };
}
function getScriptSetupCodeBlocks(node, sfcCode, linesAndColumns, parserOptions) {
    const textNode = node.children[0];
    if (textNode == null || textNode.type !== "VText") {
        return null;
    }
    const [scriptSetupStartOffset, scriptSetupEndOffset] = textNode.range;
    const scriptCode = sfcCode.slice(scriptSetupStartOffset, scriptSetupEndOffset);
    const offsetLocationCalculator = linesAndColumns.createOffsetLocationCalculator(scriptSetupStartOffset);
    const { ast, visitorKeys } = parseScript(scriptCode, { ...parserOptions, project: undefined, projectService: undefined }, offsetLocationCalculator);
    const importCodeBlocks = new CodeBlocks();
    const statementCodeBlocks = new CodeBlocks();
    const exportDefaultCodeBlocks = new CodeBlocks();
    const restoreASTCallbacks = new RestoreASTCallbacks();
    let usedOffset = 0;
    function append(codeBlocks, start, end) {
        if (start < end) {
            codeBlocks.append(scriptCode.slice(start, end), scriptSetupStartOffset + start);
            usedOffset = end;
            return true;
        }
        return false;
    }
    function appendRangeAsStatement(codeBlocks, start, end) {
        if (append(codeBlocks, start, end)) {
            codeBlocks.appendSplitPunctuators(";");
        }
    }
    function transformExportNamed(body) {
        const [start, end] = getNodeFullRange(body);
        appendRangeAsStatement(statementCodeBlocks, usedOffset, start);
        const tokens = ast.tokens;
        const exportTokenIndex = tokens.findIndex((t) => t.range[0] === body.range[0]);
        const exportToken = tokens[exportTokenIndex];
        if (exportToken?.value === "export") {
            append(statementCodeBlocks, usedOffset, exportToken.range[0]);
            if (body.declaration) {
                appendRangeAsStatement(statementCodeBlocks, exportToken.range[1], end);
                restoreASTCallbacks.addCallback(scriptSetupStartOffset, [start, end], (statement) => {
                    if (statement.type !== body.declaration.type) {
                        return null;
                    }
                    fixNodeLocations(body, visitorKeys, offsetLocationCalculator);
                    fixLocation(exportToken, offsetLocationCalculator);
                    body.declaration = statement;
                    statement.parent = body;
                    return {
                        statement: body,
                        tokens: [exportToken],
                    };
                });
            }
            else {
                statementCodeBlocks.appendSplitPunctuators("(");
                const restoreTokens = [exportToken];
                let startOffset = exportToken.range[1];
                for (const spec of body.specifiers) {
                    if (spec.local.range[0] < spec.exported.range[0]) {
                        const localTokenIndex = tokens.findIndex((t) => t.range[0] === spec.local.range[0], exportTokenIndex);
                        checkToken(tokens[localTokenIndex], spec.local.name);
                        const asToken = tokens[localTokenIndex + 1];
                        checkToken(asToken, "as");
                        restoreTokens.push(asToken);
                        const exportedToken = tokens[localTokenIndex + 2];
                        checkToken(exportedToken, spec.exported.type === "Identifier"
                            ? spec.exported.name
                            : spec.exported.raw);
                        restoreTokens.push(exportedToken);
                        append(statementCodeBlocks, startOffset, asToken.range[0]);
                        append(statementCodeBlocks, asToken.range[1], exportedToken.range[0]);
                        startOffset = exportedToken.range[1];
                    }
                }
                append(statementCodeBlocks, startOffset, end);
                statementCodeBlocks.appendSplitPunctuators(")");
                statementCodeBlocks.appendSplitPunctuators(";");
                restoreASTCallbacks.addCallback(scriptSetupStartOffset, [start, end], (statement) => {
                    if (statement.type !== "ExpressionStatement" ||
                        statement.expression.type !== "ObjectExpression") {
                        return null;
                    }
                    const locals = [];
                    for (const prop of statement.expression.properties) {
                        if (prop.type !== "Property" ||
                            prop.value.type !== "Identifier") {
                            return null;
                        }
                        locals.push(prop.value);
                    }
                    if (body.specifiers.length !== locals.length) {
                        return null;
                    }
                    const map = new Map();
                    for (let index = 0; index < body.specifiers.length; index++) {
                        const spec = body.specifiers[index];
                        const local = locals[index];
                        map.set(spec, local);
                    }
                    fixNodeLocations(body, visitorKeys, offsetLocationCalculator);
                    for (const token of restoreTokens) {
                        fixLocation(token, offsetLocationCalculator);
                    }
                    for (const [spec, local] of map) {
                        spec.local = local;
                        local.parent = spec;
                    }
                    return {
                        statement: body,
                        tokens: restoreTokens,
                    };
                });
            }
        }
        else {
            appendRangeAsStatement(statementCodeBlocks, usedOffset, end);
        }
    }
    for (const body of ast.body) {
        if (body.type === "ImportDeclaration" ||
            body.type === "ExportAllDeclaration" ||
            (body.type === "ExportNamedDeclaration" && body.source != null)) {
            const [start, end] = getNodeFullRange(body);
            appendRangeAsStatement(statementCodeBlocks, usedOffset, start);
            appendRangeAsStatement(importCodeBlocks, start, end);
        }
        else if (body.type === "ExportDefaultDeclaration") {
            const [start, end] = getNodeFullRange(body);
            appendRangeAsStatement(statementCodeBlocks, usedOffset, start);
            appendRangeAsStatement(exportDefaultCodeBlocks, start, end);
        }
        else if (body.type === "ExportNamedDeclaration") {
            transformExportNamed(body);
        }
    }
    appendRangeAsStatement(statementCodeBlocks, usedOffset, scriptSetupEndOffset);
    const codeBlocks = new CodeBlocks();
    let postprocess = () => {
    };
    codeBlocks.appendCodeBlocks(importCodeBlocks);
    const scriptSetupBlockRangeStart = codeBlocks.length;
    codeBlocks.appendSplitPunctuators("{");
    const generic = extractGeneric(node);
    if (generic) {
        const defineGenericTypeRangeStart = codeBlocks.length;
        for (const defineType of generic.defineTypes) {
            codeBlocks.append(defineType.define, defineType.node.range[0]);
            codeBlocks.appendSplitPunctuators(";");
        }
        const defineGenericTypeRangeEnd = codeBlocks.length;
        postprocess = (eslintResult, context) => {
            const diffOffset = context.scriptSetupBlockRange[0] - scriptSetupBlockRangeStart;
            const defineGenericTypeRange = [
                defineGenericTypeRangeStart + diffOffset,
                defineGenericTypeRangeEnd + diffOffset,
            ];
            function isTypeBlock(block) {
                return (block.type === "BlockStatement" &&
                    context.scriptSetupBlockRange[0] <= block.range[0] &&
                    block.range[1] <= context.scriptSetupBlockRange[1]);
            }
            generic.postprocess({
                result: eslintResult,
                getTypeBlock: (program) => program.body.find(isTypeBlock),
                isRemoveTarget(nodeOrToken) {
                    return (defineGenericTypeRange[0] <= nodeOrToken.range[0] &&
                        nodeOrToken.range[1] <= defineGenericTypeRange[1]);
                },
                getTypeDefScope(scopeManager) {
                    const moduleScope = scopeManager.globalScope.childScopes.find((s) => s.type === "module") ?? scopeManager.globalScope;
                    return moduleScope.childScopes.find((scope) => isTypeBlock(scope.block));
                },
            });
        };
    }
    codeBlocks.appendCodeBlocks(statementCodeBlocks);
    codeBlocks.appendSplitPunctuators("}");
    const scriptSetupBlockRangeEnd = codeBlocks.length;
    codeBlocks.appendCodeBlocks(exportDefaultCodeBlocks);
    return {
        codeBlocks,
        scriptSetupBlockRange: [
            scriptSetupBlockRangeStart,
            scriptSetupBlockRangeEnd,
        ],
        postprocess,
        restoreASTCallbacks,
    };
    function getNodeFullRange(n) {
        let start = n.range[0];
        let end = n.range[1];
        traverseNodes(n, {
            visitorKeys,
            enterNode(c) {
                start = Math.min(start, c.range[0]);
                end = Math.max(end, c.range[1]);
            },
            leaveNode() {
            },
        });
        return [start, end];
    }
    function checkToken(token, value) {
        if (token.value === value) {
            return;
        }
        const perr = new ParseError(`Could not parse <script setup>. Expected "${value}", but it was "${token.value}".`, undefined, token.range[0], token.loc.start.line, token.loc.start.column);
        fixErrorLocation(perr, offsetLocationCalculator);
        throw perr;
    }
}
function remapAST(result, { scriptSetupBlockRange, codeBlocks }) {
    if (!scriptSetupBlockRange) {
        return [];
    }
    let scriptSetupBlock = null;
    const scriptSetupStatements = [];
    for (let index = result.ast.body.length - 1; index >= 0; index--) {
        const body = result.ast.body[index];
        if (body.type === "BlockStatement") {
            if (scriptSetupBlockRange[0] <= body.range[0] &&
                body.range[1] <= scriptSetupBlockRange[1]) {
                if (scriptSetupBlock) {
                    throw new Error(`Unexpected state error: An unexpected block statement was found. ${JSON.stringify(body.loc)}`);
                }
                scriptSetupBlock = body;
                scriptSetupStatements.push(...body.body.filter((b) => !isSplitPunctuatorsEmptyStatement(b)));
                result.ast.body.splice(index, 1, ...scriptSetupStatements);
            }
        }
        else if (body.type === "EmptyStatement") {
            if (isSplitPunctuatorsEmptyStatement(body)) {
                result.ast.body.splice(index, 1);
            }
        }
    }
    if (result.scopeManager && scriptSetupBlock) {
        const blockScope = result.scopeManager.acquire(scriptSetupBlock, true);
        remapScope(result.scopeManager, blockScope);
    }
    return scriptSetupStatements;
    function isSplitPunctuatorsEmptyStatement(body) {
        return (body.type === "EmptyStatement" &&
            codeBlocks.splitPunctuators.includes(body.range[1] - 1));
    }
    function remapScope(scopeManager, blockScope) {
        const moduleScope = blockScope.upper;
        for (const reference of blockScope.references) {
            reference.from = moduleScope;
            moduleScope.references.push(reference);
        }
        for (const variable of blockScope.variables) {
            variable.scope = moduleScope;
            const alreadyVariable = moduleScope.variables.find((v) => v.name === variable.name);
            if (alreadyVariable) {
                alreadyVariable.defs.push(...variable.defs);
                alreadyVariable.identifiers.push(...variable.identifiers);
                alreadyVariable.references.push(...variable.references);
                for (const reference of variable.references) {
                    reference.resolved = alreadyVariable;
                }
            }
            else {
                moduleScope.variables.push(variable);
                moduleScope.set.set(variable.name, variable);
            }
        }
        const upper = blockScope.upper;
        if (upper) {
            const index = upper.childScopes.indexOf(blockScope);
            if (index >= 0) {
                upper.childScopes.splice(index, 1);
            }
        }
        const index = scopeManager.scopes.indexOf(blockScope);
        if (index >= 0) {
            scopeManager.scopes.splice(index, 1);
        }
    }
}
function remapLocationAndTokens(result, { codeBlocks }, locationCalculator) {
    const tokens = result.ast.tokens ?? [];
    const endMap = new Map();
    const buffer = [];
    for (let index = tokens.length - 1; index >= 0; index--) {
        const token = tokens[index];
        if (token.range[0] + 1 === token.range[1] &&
            codeBlocks.splitPunctuators.includes(token.range[0])) {
            tokens.splice(index, 1);
            buffer.push(token.range[1]);
            continue;
        }
        else {
            for (const end of buffer) {
                endMap.set(end, token.range[1]);
            }
            buffer.length = 0;
        }
    }
    traverseNodes(result.ast, {
        visitorKeys: result.visitorKeys,
        enterNode(node) {
            const rangeEnd = endMap.get(node.range[1]);
            if (rangeEnd != null) {
                node.range[1] = rangeEnd;
            }
            if (node.end) {
                const end = endMap.get(node.end);
                if (end != null) {
                    node.end = rangeEnd;
                }
            }
        },
        leaveNode() {
        },
    });
    fixLocations(result, locationCalculator);
}

class CSSTokenizer {
    text;
    options;
    cp;
    offset;
    nextOffset;
    reconsuming;
    constructor(text, startOffset, options) {
        debug("[css] the source code length: %d", text.length);
        this.text = text;
        this.options = {
            inlineComment: options?.inlineComment ?? false,
        };
        this.cp = NULL;
        this.offset = startOffset - 1;
        this.nextOffset = startOffset;
        this.reconsuming = false;
    }
    nextToken() {
        let cp;
        if (this.reconsuming) {
            cp = this.cp;
            this.reconsuming = false;
        }
        else {
            cp = this.consumeNextCodePoint();
        }
        while (isWhitespace(cp)) {
            cp = this.consumeNextCodePoint();
        }
        if (cp === EOF) {
            return null;
        }
        const start = this.offset;
        return this.consumeNextToken(cp, start);
    }
    nextCodePoint() {
        if (this.nextOffset >= this.text.length) {
            return EOF;
        }
        return this.text.codePointAt(this.nextOffset);
    }
    consumeNextCodePoint() {
        if (this.offset >= this.text.length) {
            this.cp = EOF;
            return EOF;
        }
        this.offset = this.nextOffset;
        if (this.offset >= this.text.length) {
            this.cp = EOF;
            return EOF;
        }
        let cp = this.text.codePointAt(this.offset);
        if (cp === CARRIAGE_RETURN) {
            this.nextOffset = this.offset + 1;
            if (this.text.codePointAt(this.nextOffset) === LINE_FEED) {
                this.nextOffset++;
            }
            cp = LINE_FEED;
        }
        else {
            this.nextOffset = this.offset + (cp >= 0x10000 ? 2 : 1);
        }
        this.cp = cp;
        return cp;
    }
    consumeNextToken(cp, start) {
        if (cp === SOLIDUS) {
            const nextCp = this.nextCodePoint();
            if (nextCp === ASTERISK) {
                return this.consumeComment(start);
            }
            if (nextCp === SOLIDUS && this.options.inlineComment) {
                return this.consumeInlineComment(start);
            }
        }
        if (isQuote(cp)) {
            return this.consumeString(start, cp);
        }
        if (isPunctuator(cp)) {
            return {
                type: "Punctuator",
                range: [start, start + 1],
                value: String.fromCodePoint(cp),
            };
        }
        return this.consumeWord(start);
    }
    consumeWord(start) {
        let cp = this.consumeNextCodePoint();
        while (!isWhitespace(cp) && !isPunctuator(cp) && !isQuote(cp)) {
            cp = this.consumeNextCodePoint();
        }
        this.reconsuming = true;
        const range = [start, this.offset];
        const text = this.text;
        let value;
        return {
            type: "Word",
            range,
            get value() {
                return (value ??= text.slice(...range));
            },
        };
    }
    consumeString(start, quote) {
        let valueEndOffset = null;
        let cp = this.consumeNextCodePoint();
        while (cp !== EOF) {
            if (cp === quote) {
                valueEndOffset = this.offset;
                break;
            }
            if (cp === REVERSE_SOLIDUS) {
                this.consumeNextCodePoint();
            }
            cp = this.consumeNextCodePoint();
        }
        const text = this.text;
        let value;
        const valueRange = [
            start + 1,
            valueEndOffset ?? this.nextOffset,
        ];
        return {
            type: "Quoted",
            range: [start, this.nextOffset],
            valueRange,
            get value() {
                return (value ??= text.slice(...valueRange));
            },
            quote: String.fromCodePoint(quote),
        };
    }
    consumeComment(start) {
        this.consumeNextCodePoint();
        let valueEndOffset = null;
        let cp = this.consumeNextCodePoint();
        while (cp !== EOF) {
            if (cp === ASTERISK) {
                cp = this.consumeNextCodePoint();
                if (cp === SOLIDUS) {
                    valueEndOffset = this.offset - 1;
                    break;
                }
            }
            cp = this.consumeNextCodePoint();
        }
        const valueRange = [
            start + 2,
            valueEndOffset ?? this.nextOffset,
        ];
        const text = this.text;
        let value;
        return {
            type: "Block",
            range: [start, this.nextOffset],
            valueRange,
            get value() {
                return (value ??= text.slice(...valueRange));
            },
        };
    }
    consumeInlineComment(start) {
        this.consumeNextCodePoint();
        let valueEndOffset = null;
        let cp = this.consumeNextCodePoint();
        while (cp !== EOF) {
            if (cp === LINE_FEED) {
                valueEndOffset = this.offset - 1;
                break;
            }
            cp = this.consumeNextCodePoint();
        }
        const valueRange = [
            start + 2,
            valueEndOffset ?? this.nextOffset,
        ];
        const text = this.text;
        let value;
        return {
            type: "Line",
            range: [start, this.nextOffset],
            valueRange,
            get value() {
                return (value ??= text.slice(...valueRange));
            },
        };
    }
}
function isPunctuator(cp) {
    return (cp === COLON ||
        cp === SEMICOLON ||
        cp === LEFT_PARENTHESIS ||
        cp === RIGHT_PARENTHESIS ||
        cp === LEFT_CURLY_BRACKET ||
        cp === RIGHT_CURLY_BRACKET ||
        cp === LEFT_SQUARE_BRACKET ||
        cp === RIGHT_SQUARE_BRACKET ||
        cp === SOLIDUS ||
        cp === ASTERISK);
}
function isQuote(cp) {
    return cp === APOSTROPHE || cp === QUOTATION_MARK;
}

class CSSTokenScanner {
    reconsuming = [];
    tokenizer;
    constructor(text, options) {
        this.tokenizer = new CSSTokenizer(text, 0, options);
    }
    nextToken() {
        return this.reconsuming.shift() ?? this.tokenizer.nextToken();
    }
    reconsume(...tokens) {
        this.reconsuming.push(...tokens);
    }
}
function parseStyleElements(elements, globalLocationCalculator, originalParserOptions) {
    const parserOptions = {
        ...originalParserOptions,
        ecmaVersion: originalParserOptions.ecmaVersion ?? DEFAULT_ECMA_VERSION,
    };
    for (const style of elements) {
        style.style = true;
        parseStyleElement(style, globalLocationCalculator, parserOptions, {
            inlineComment: (getLang(style) || "css") !== "css",
        });
    }
}
function parseStyleElement(style, globalLocationCalculator, parserOptions, cssOptions) {
    if (style.children.length !== 1) {
        return;
    }
    const textNode = style.children[0];
    if (textNode.type !== "VText") {
        return;
    }
    const code = textNode.value;
    if (!/v-bind\s*(?:\(|\/)/u.test(code)) {
        return;
    }
    const locationCalculator = globalLocationCalculator.getSubCalculatorAfter(textNode.range[0]);
    const document = getOwnerDocument(style);
    parseStyle(document, style, code, locationCalculator, parserOptions, cssOptions);
}
function parseStyle(document, style, code, locationCalculator, parserOptions, cssOptions) {
    let textStart = 0;
    for (const { range, exprRange, quote, openingParenOffset, comments, } of iterateVBind(code, cssOptions)) {
        insertComments(document, comments.map((c) => createSimpleToken(c.type, locationCalculator.getOffsetWithGap(c.range[0]), locationCalculator.getOffsetWithGap(c.range[1]), c.value, locationCalculator)));
        const container = {
            type: "VExpressionContainer",
            range: [
                locationCalculator.getOffsetWithGap(range[0]),
                locationCalculator.getOffsetWithGap(range[1]),
            ],
            loc: {
                start: locationCalculator.getLocation(range[0]),
                end: locationCalculator.getLocation(range[1]),
            },
            parent: style,
            expression: null,
            references: [],
        };
        const openingParenStart = locationCalculator.getOffsetWithGap(openingParenOffset);
        const beforeTokens = [
            createSimpleToken("HTMLRawText", container.range[0], container.range[0] + 6, "v-bind", locationCalculator),
            createSimpleToken("Punctuator", openingParenStart, openingParenStart + 1, "(", locationCalculator),
        ];
        const afterTokens = [
            createSimpleToken("Punctuator", container.range[1] - 1, container.range[1], ")", locationCalculator),
        ];
        if (quote) {
            const openStart = locationCalculator.getOffsetWithGap(exprRange[0] - 1);
            beforeTokens.push(createSimpleToken("Punctuator", openStart, openStart + 1, quote, locationCalculator));
            const closeStart = locationCalculator.getOffsetWithGap(exprRange[1]);
            afterTokens.unshift(createSimpleToken("Punctuator", closeStart, closeStart + 1, quote, locationCalculator));
        }
        const beforeLast = beforeTokens[beforeTokens.length - 1];
        replaceAndSplitTokens(document, {
            range: [container.range[0], beforeLast.range[1]],
            loc: { start: container.loc.start, end: beforeLast.loc.end },
        }, beforeTokens);
        const afterFirst = afterTokens[0];
        replaceAndSplitTokens(document, {
            range: [afterFirst.range[0], container.range[1]],
            loc: { start: afterFirst.loc.start, end: container.loc.end },
        }, afterTokens);
        const lastChild = style.children[style.children.length - 1];
        style.children.push(container);
        if (lastChild.type === "VText") {
            const newTextNode = {
                type: "VText",
                range: [container.range[1], lastChild.range[1]],
                loc: {
                    start: { ...container.loc.end },
                    end: { ...lastChild.loc.end },
                },
                parent: style,
                value: code.slice(range[1]),
            };
            style.children.push(newTextNode);
            lastChild.range[1] = container.range[0];
            lastChild.loc.end = { ...container.loc.start };
            lastChild.value = code.slice(textStart, range[0]);
            textStart = range[1];
        }
        try {
            const ret = parseExpression(code.slice(...exprRange), locationCalculator.getSubCalculatorShift(exprRange[0]), parserOptions, { allowEmpty: false, allowFilters: false });
            if (ret.expression) {
                ret.expression.parent = container;
                container.expression = ret.expression;
                container.references = ret.references;
            }
            replaceAndSplitTokens(document, {
                range: [beforeLast.range[1], afterFirst.range[0]],
                loc: {
                    start: beforeLast.loc.end,
                    end: afterFirst.loc.start,
                },
            }, ret.tokens);
            insertComments(document, ret.comments);
            for (const variable of ret.variables) {
                style.variables.push(variable);
            }
            resolveReferences(container);
        }
        catch (err) {
            debug("[style] Parse error: %s", err);
            if (ParseError.isParseError(err)) {
                insertError(document, err);
            }
            else {
                throw err;
            }
        }
    }
}
function* iterateVBind(code, cssOptions) {
    const tokenizer = new CSSTokenScanner(code, cssOptions);
    let token;
    while ((token = tokenizer.nextToken())) {
        if (token.type !== "Word" || token.value !== "v-bind") {
            continue;
        }
        const openingParen = findVBindOpeningParen(tokenizer);
        if (!openingParen) {
            continue;
        }
        const arg = parseVBindArg(tokenizer);
        if (!arg) {
            continue;
        }
        yield {
            range: [token.range[0], arg.closingParen.range[1]],
            exprRange: arg.exprRange,
            quote: arg.quote,
            openingParenOffset: openingParen.openingParen.range[0],
            comments: [...openingParen.comments, ...arg.comments],
        };
    }
}
function findVBindOpeningParen(tokenizer) {
    const comments = [];
    let token;
    while ((token = tokenizer.nextToken())) {
        if (token.type === "Punctuator" && token.value === "(") {
            return {
                openingParen: token,
                comments,
            };
        }
        else if (isComment(token)) {
            comments.push(token);
            continue;
        }
        tokenizer.reconsume(...comments, token);
        return null;
    }
    return null;
}
function parseVBindArg(tokenizer) {
    const tokensBuffer = [];
    const comments = [];
    const tokens = [];
    const closeTokenStack = [];
    let token;
    while ((token = tokenizer.nextToken())) {
        if (token.type === "Punctuator") {
            if (token.value === ")" && !closeTokenStack.length) {
                if (tokens.length === 1 &&
                    tokens[0].type === "Quoted") {
                    const quotedToken = tokens[0];
                    return {
                        exprRange: quotedToken.valueRange,
                        quote: quotedToken.quote,
                        closingParen: token,
                        comments,
                    };
                }
                const startToken = tokensBuffer[0] ?? token;
                return {
                    exprRange: [startToken.range[0], token.range[0]],
                    quote: null,
                    closingParen: token,
                    comments: [],
                };
            }
            if (token.value === closeTokenStack[0]) {
                closeTokenStack.shift();
            }
            else if (token.value === "(") {
                closeTokenStack.unshift(")");
            }
        }
        tokensBuffer.push(token);
        if (isComment(token)) {
            comments.push(token);
        }
        else {
            tokens.push(token);
        }
    }
    tokenizer.reconsume(...tokensBuffer);
    return null;
}
function isComment(token) {
    return token.type === "Block" || token.type === "Line";
}

const BUILTIN_COMPONENTS = new Set([
    "template",
    "slot",
    "component",
    "Component",
    "transition",
    "Transition",
    "transition-group",
    "TransitionGroup",
    "keep-alive",
    "KeepAlive",
    "teleport",
    "Teleport",
    "suspense",
    "Suspense",
]);
const BUILTIN_DIRECTIVES = new Set([
    "bind",
    "on",
    "text",
    "html",
    "show",
    "if",
    "else",
    "else-if",
    "for",
    "model",
    "slot",
    "pre",
    "cloak",
    "once",
    "memo",
    "is",
]);
const HTML_TAGS = "html,body,base,head,link,meta,style,title,address,article,aside,footer," +
    "header,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption," +
    "figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code," +
    "data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup," +
    "time,u,var,wbr,area,audio,map,track,video,embed,object,param,source," +
    "canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td," +
    "th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup," +
    "option,output,progress,select,textarea,details,dialog,menu," +
    "summary,template,blockquote,iframe,tfoot";
const SVG_TAGS = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile," +
    "defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer," +
    "feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap," +
    "feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR," +
    "feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset," +
    "fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter," +
    "foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask," +
    "mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern," +
    "polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol," +
    "text,textPath,title,tspan,unknown,use,view";
const NATIVE_TAGS = new Set([...HTML_TAGS.split(","), ...SVG_TAGS.split(",")]);
const COMPILER_MACROS_AT_ROOT = new Set([
    "defineProps",
    "defineEmits",
    "defineExpose",
    "withDefaults",
    "defineOptions",
    "defineSlots",
    "defineModel",
]);
function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}
function analyzeScriptSetupScope(scopeManager, templateBody, df, parserOptions) {
    analyzeUsedInTemplateVariables(scopeManager, templateBody, df);
    analyzeScriptSetupVariables(scopeManager, df, parserOptions);
}
function extractVariables(scopeManager) {
    const scriptVariables = new Map();
    const globalScope = scopeManager.globalScope;
    if (!globalScope) {
        return scriptVariables;
    }
    for (const variable of globalScope.variables) {
        scriptVariables.set(variable.name, variable);
    }
    const moduleScope = globalScope.childScopes.find((scope) => scope.type === "module");
    for (const variable of moduleScope?.variables ?? []) {
        scriptVariables.set(variable.name, variable);
    }
    return scriptVariables;
}
function analyzeUsedInTemplateVariables(scopeManager, templateBody, df) {
    const scriptVariables = extractVariables(scopeManager);
    const markedVariables = new Set();
    function markSetupReferenceVariableAsUsed(name) {
        if (scriptVariables.has(name)) {
            markVariableAsUsed(name);
            return true;
        }
        const camelName = camelize(name);
        if (scriptVariables.has(camelName)) {
            markVariableAsUsed(camelName);
            return true;
        }
        const pascalName = capitalize(camelName);
        if (scriptVariables.has(pascalName)) {
            markVariableAsUsed(pascalName);
            return true;
        }
        return false;
    }
    function markVariableAsUsed(nameOrRef) {
        let name;
        let isValueReference;
        let isTypeReference;
        if (typeof nameOrRef === "string") {
            name = nameOrRef;
        }
        else {
            name = nameOrRef.id.name;
            isValueReference = nameOrRef.isValueReference;
            isTypeReference = nameOrRef.isTypeReference;
        }
        const variable = scriptVariables.get(name);
        if (!variable || variable.identifiers.length === 0) {
            return;
        }
        if (markedVariables.has(name)) {
            return;
        }
        markedVariables.add(name);
        const reference = new (getEslintScope().Reference)();
        reference.vueUsedInTemplate = true;
        reference.from = variable.scope;
        reference.identifier = variable.identifiers[0];
        reference.isWrite = () => false;
        reference.isWriteOnly = () => false;
        reference.isRead = () => true;
        reference.isReadOnly = () => true;
        reference.isReadWrite = () => false;
        reference.isValueReference = isValueReference;
        reference.isTypeReference = isTypeReference;
        variable.references.push(reference);
        reference.resolved = variable;
        if (reference.isTypeReference) {
            variable.eslintUsed = true;
        }
    }
    function processVExpressionContainer(node) {
        for (const reference of node.references.filter((ref) => ref.variable == null)) {
            markVariableAsUsed(reference);
        }
    }
    function processVElement(node) {
        if ((node.rawName === node.name && NATIVE_TAGS.has(node.rawName)) ||
            BUILTIN_COMPONENTS.has(node.rawName)) {
            return;
        }
        if (!markSetupReferenceVariableAsUsed(node.rawName)) {
            const dotIndex = node.rawName.indexOf(".");
            if (dotIndex > 0) {
                markSetupReferenceVariableAsUsed(node.rawName.slice(0, dotIndex));
            }
        }
    }
    function processVAttribute(node) {
        if (node.directive) {
            if (BUILTIN_DIRECTIVES.has(node.key.name.name)) {
                return;
            }
            markSetupReferenceVariableAsUsed(`v-${node.key.name.rawName}`);
        }
        else if (node.key.name === "ref" && node.value) {
            markVariableAsUsed(node.value.value);
        }
    }
    if (templateBody) {
        traverseNodes(templateBody, {
            enterNode(node) {
                if (node.type === "VExpressionContainer") {
                    processVExpressionContainer(node);
                }
                else if (node.type === "VElement") {
                    processVElement(node);
                }
                else if (node.type === "VAttribute") {
                    processVAttribute(node);
                }
            },
            leaveNode() {
            },
        });
    }
    for (const child of df.children) {
        if (child.type === "VElement") {
            if (isScriptSetupElement(child)) {
                const generic = findGenericDirective(child);
                if (generic) {
                    processVExpressionContainer(generic.value);
                }
            }
            else if (child.name === "style") {
                for (const node of child.children) {
                    if (node.type === "VExpressionContainer") {
                        processVExpressionContainer(node);
                    }
                }
            }
        }
    }
}
function analyzeScriptSetupVariables(scopeManager, df, parserOptions) {
    const globalScope = scopeManager.globalScope;
    if (!globalScope) {
        return;
    }
    const customMacros = new Set(parserOptions.vueFeatures?.customMacros &&
        Array.isArray(parserOptions.vueFeatures.customMacros)
        ? parserOptions.vueFeatures.customMacros
        : []);
    const genericDefineNames = new Set();
    const scriptElements = df.children.filter(isScriptElement);
    const scriptSetupElement = scriptElements.find(isScriptSetupElement);
    if (scriptSetupElement && findGenericDirective(scriptSetupElement)) {
        for (const variable of scriptSetupElement.variables) {
            if (variable.kind === "generic") {
                genericDefineNames.add(variable.id.name);
            }
        }
    }
    const newThrough = [];
    for (const reference of globalScope.through) {
        if (COMPILER_MACROS_AT_ROOT.has(reference.identifier.name) ||
            customMacros.has(reference.identifier.name)) {
            if (reference.from.type === "global" ||
                reference.from.type === "module") {
                addCompilerMacroVariable(reference);
                continue;
            }
        }
        if (genericDefineNames.has(reference.identifier.name)) {
            addGenericVariable(reference);
            continue;
        }
        newThrough.push(reference);
    }
    globalScope.through = newThrough;
    function addCompilerMacroVariable(reference) {
        addVariable(globalScope, reference);
    }
    function addGenericVariable(reference) {
        addVariable(globalScope, reference);
    }
}
function addVariable(scope, reference) {
    const name = reference.identifier.name;
    let variable = scope.set.get(name);
    if (!variable) {
        variable = new (getEslintScope().Variable)();
        variable.name = name;
        variable.scope = scope;
        scope.variables.push(variable);
        scope.set.set(name, variable);
    }
    reference.resolved = variable;
    variable.references.push(reference);
}

const STARTS_WITH_LT = /^\s*</u;
function isVueFile(code, options) {
    const filePath = options.filePath || "unknown.js";
    return path__namespace.extname(filePath) === ".vue" || STARTS_WITH_LT.test(code);
}
function parseForESLint(code, parserOptions) {
    const options = {
        comment: true,
        loc: true,
        range: true,
        tokens: true,
        ...parserOptions,
    };
    let result;
    let document;
    let locationCalculator;
    if (!isVueFile(code, options)) {
        result = parseAsScript(code, options);
        document = null;
        locationCalculator = null;
    }
    else {
        ({ result, document, locationCalculator } = parseAsSFC(code, options));
    }
    result.services = {
        ...result.services,
        ...define(code, result.ast, document, locationCalculator, {
            parserOptions: options,
        }),
    };
    return result;
}
function parse(code, options) {
    return parseForESLint(code, options).ast;
}
function parseAsSFC(code, options) {
    const optionsForTemplate = {
        ...options,
        ecmaVersion: options.ecmaVersion ?? DEFAULT_ECMA_VERSION,
    };
    const skipParsingScript = options.parser === false;
    const tokenizer = new Tokenizer(code, optionsForTemplate);
    const rootAST = new Parser(tokenizer, optionsForTemplate).parse();
    const locationCalculator = new LocationCalculatorForHtml(tokenizer.gaps, tokenizer.lineTerminators);
    const scripts = rootAST.children.filter(isScriptElement);
    const template = rootAST.children.find(isTemplateElement);
    const templateLang = getLang(template) || "html";
    const hasTemplateTokenizer = options?.templateTokenizer?.[templateLang];
    const concreteInfo = {
        tokens: rootAST.tokens,
        comments: rootAST.comments,
        errors: rootAST.errors,
    };
    const templateBody = template != null && (templateLang === "html" || hasTemplateTokenizer)
        ? Object.assign(template, concreteInfo)
        : undefined;
    const scriptParser = getScriptParser(options.parser, () => getParserLangFromSFC(rootAST));
    let result;
    let scriptSetup;
    if (skipParsingScript || !scripts.length) {
        result = parseScript$1("", {
            ...options,
            ecmaVersion: options.ecmaVersion ?? DEFAULT_ECMA_VERSION,
            parser: scriptParser,
        });
    }
    else if (scripts.length === 2 &&
        (scriptSetup = scripts.find(isScriptSetupElement))) {
        result = parseScriptSetupElements(scriptSetup, scripts.find((e) => e !== scriptSetup), code, new LinesAndColumns(tokenizer.lineTerminators), {
            ...options,
            parser: scriptParser,
        });
    }
    else {
        result = parseScriptElement(scripts[0], code, new LinesAndColumns(tokenizer.lineTerminators), {
            ...options,
            parser: scriptParser,
        });
    }
    if (options.vueFeatures?.styleCSSVariableInjection ?? true) {
        const styles = rootAST.children.filter(isStyleElement);
        parseStyleElements(styles, locationCalculator, {
            ...options,
            parser: getScriptParser(options.parser, function* () {
                yield "<template>";
                yield getParserLangFromSFC(rootAST);
            }),
            project: undefined,
            projectService: undefined,
        });
    }
    result.ast.templateBody = templateBody;
    if (options.eslintScopeManager) {
        if (scripts.some(isScriptSetupElement)) {
            if (!result.scopeManager) {
                result.scopeManager = analyzeScope(result.ast, options);
            }
            analyzeScriptSetupScope(result.scopeManager, templateBody, rootAST, options);
        }
    }
    return {
        result,
        locationCalculator,
        document: rootAST,
    };
}
function parseAsScript(code, options) {
    return parseScript$1(code, {
        ...options,
        ecmaVersion: options.ecmaVersion ?? DEFAULT_ECMA_VERSION,
        parser: getScriptParser(options.parser, () => {
            const ext = (path__namespace.extname(options.filePath || "unknown.js").toLowerCase() ||
                "")
                .slice(1);
            if (/^[jt]sx$/u.test(ext)) {
                return [ext, ext.slice(0, -1)];
            }
            return ext;
        }),
    });
}
const meta = {
    name: "vue-eslint-parser",
    version: "10.1.3",
};

exports.AST = index;
exports.meta = meta;
exports.parse = parse;
exports.parseForESLint = parseForESLint;
//# sourceMappingURL=index.js.map
