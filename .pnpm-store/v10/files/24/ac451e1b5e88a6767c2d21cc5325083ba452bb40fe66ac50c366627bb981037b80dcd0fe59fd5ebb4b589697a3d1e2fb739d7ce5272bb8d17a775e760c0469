import { extname, win32, posix, isAbsolute, resolve } from 'path';
import { walk } from 'estree-walker';
import pm from 'picomatch';

const addExtension = function addExtension(filename, ext = '.js') {
    let result = `${filename}`;
    if (!extname(filename))
        result += ext;
    return result;
};

const extractors = {
    ArrayPattern(names, param) {
        for (const element of param.elements) {
            if (element)
                extractors[element.type](names, element);
        }
    },
    AssignmentPattern(names, param) {
        extractors[param.left.type](names, param.left);
    },
    Identifier(names, param) {
        names.push(param.name);
    },
    MemberExpression() { },
    ObjectPattern(names, param) {
        for (const prop of param.properties) {
            // @ts-ignore Typescript reports that this is not a valid type
            if (prop.type === 'RestElement') {
                extractors.RestElement(names, prop);
            }
            else {
                extractors[prop.value.type](names, prop.value);
            }
        }
    },
    RestElement(names, param) {
        extractors[param.argument.type](names, param.argument);
    }
};
const extractAssignedNames = function extractAssignedNames(param) {
    const names = [];
    extractors[param.type](names, param);
    return names;
};

const blockDeclarations = {
    const: true,
    let: true
};
class Scope {
    constructor(options = {}) {
        this.parent = options.parent;
        this.isBlockScope = !!options.block;
        this.declarations = Object.create(null);
        if (options.params) {
            options.params.forEach((param) => {
                extractAssignedNames(param).forEach((name) => {
                    this.declarations[name] = true;
                });
            });
        }
    }
    addDeclaration(node, isBlockDeclaration, isVar) {
        if (!isBlockDeclaration && this.isBlockScope) {
            // it's a `var` or function node, and this
            // is a block scope, so we need to go up
            this.parent.addDeclaration(node, isBlockDeclaration, isVar);
        }
        else if (node.id) {
            extractAssignedNames(node.id).forEach((name) => {
                this.declarations[name] = true;
            });
        }
    }
    contains(name) {
        return this.declarations[name] || (this.parent ? this.parent.contains(name) : false);
    }
}
const attachScopes = function attachScopes(ast, propertyName = 'scope') {
    let scope = new Scope();
    walk(ast, {
        enter(n, parent) {
            const node = n;
            // function foo () {...}
            // class Foo {...}
            if (/(?:Function|Class)Declaration/.test(node.type)) {
                scope.addDeclaration(node, false, false);
            }
            // var foo = 1
            if (node.type === 'VariableDeclaration') {
                const { kind } = node;
                const isBlockDeclaration = blockDeclarations[kind];
                node.declarations.forEach((declaration) => {
                    scope.addDeclaration(declaration, isBlockDeclaration, true);
                });
            }
            let newScope;
            // create new function scope
            if (node.type.includes('Function')) {
                const func = node;
                newScope = new Scope({
                    parent: scope,
                    block: false,
                    params: func.params
                });
                // named function expressions - the name is considered
                // part of the function's scope
                if (func.type === 'FunctionExpression' && func.id) {
                    newScope.addDeclaration(func, false, false);
                }
            }
            // create new for scope
            if (/For(?:In|Of)?Statement/.test(node.type)) {
                newScope = new Scope({
                    parent: scope,
                    block: true
                });
            }
            // create new block scope
            if (node.type === 'BlockStatement' && !parent.type.includes('Function')) {
                newScope = new Scope({
                    parent: scope,
                    block: true
                });
            }
            // catch clause has its own block scope
            if (node.type === 'CatchClause') {
                newScope = new Scope({
                    parent: scope,
                    params: node.param ? [node.param] : [],
                    block: true
                });
            }
            if (newScope) {
                Object.defineProperty(node, propertyName, {
                    value: newScope,
                    configurable: true
                });
                scope = newScope;
            }
        },
        leave(n) {
            const node = n;
            if (node[propertyName])
                scope = scope.parent;
        }
    });
    return scope;
};

// Helper since Typescript can't detect readonly arrays with Array.isArray
function isArray(arg) {
    return Array.isArray(arg);
}
function ensureArray(thing) {
    if (isArray(thing))
        return thing;
    if (thing == null)
        return [];
    return [thing];
}

const normalizePathRegExp = new RegExp(`\\${win32.sep}`, 'g');
const normalizePath = function normalizePath(filename) {
    return filename.replace(normalizePathRegExp, posix.sep);
};

function getMatcherString(id, resolutionBase) {
    if (resolutionBase === false || isAbsolute(id) || id.startsWith('**')) {
        return normalizePath(id);
    }
    // resolve('') is valid and will default to process.cwd()
    const basePath = normalizePath(resolve(resolutionBase || ''))
        // escape all possible (posix + win) path characters that might interfere with regex
        .replace(/[-^$*+?.()|[\]{}]/g, '\\$&');
    // Note that we use posix.join because:
    // 1. the basePath has been normalized to use /
    // 2. the incoming glob (id) matcher, also uses /
    // otherwise Node will force backslash (\) on windows
    return posix.join(basePath, normalizePath(id));
}
const createFilter = function createFilter(include, exclude, options) {
    const resolutionBase = options && options.resolve;
    const getMatcher = (id) => id instanceof RegExp
        ? id
        : {
            test: (what) => {
                // this refactor is a tad overly verbose but makes for easy debugging
                const pattern = getMatcherString(id, resolutionBase);
                const fn = pm(pattern, { dot: true });
                const result = fn(what);
                return result;
            }
        };
    const includeMatchers = ensureArray(include).map(getMatcher);
    const excludeMatchers = ensureArray(exclude).map(getMatcher);
    if (!includeMatchers.length && !excludeMatchers.length)
        return (id) => typeof id === 'string' && !id.includes('\0');
    return function result(id) {
        if (typeof id !== 'string')
            return false;
        if (id.includes('\0'))
            return false;
        const pathId = normalizePath(id);
        for (let i = 0; i < excludeMatchers.length; ++i) {
            const matcher = excludeMatchers[i];
            if (matcher instanceof RegExp) {
                matcher.lastIndex = 0;
            }
            if (matcher.test(pathId))
                return false;
        }
        for (let i = 0; i < includeMatchers.length; ++i) {
            const matcher = includeMatchers[i];
            if (matcher instanceof RegExp) {
                matcher.lastIndex = 0;
            }
            if (matcher.test(pathId))
                return true;
        }
        return !includeMatchers.length;
    };
};

const reservedWords = 'break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public';
const builtins = 'arguments Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl';
const forbiddenIdentifiers = new Set(`${reservedWords} ${builtins}`.split(' '));
forbiddenIdentifiers.add('');
const makeLegalIdentifier = function makeLegalIdentifier(str) {
    let identifier = str
        .replace(/-(\w)/g, (_, letter) => letter.toUpperCase())
        .replace(/[^$_a-zA-Z0-9]/g, '_');
    if (/\d/.test(identifier[0]) || forbiddenIdentifiers.has(identifier)) {
        identifier = `_${identifier}`;
    }
    return identifier || '_';
};

function stringify(obj) {
    return (JSON.stringify(obj) || 'undefined').replace(/[\u2028\u2029]/g, (char) => `\\u${`000${char.charCodeAt(0).toString(16)}`.slice(-4)}`);
}
function serializeArray(arr, indent, baseIndent) {
    let output = '[';
    const separator = indent ? `\n${baseIndent}${indent}` : '';
    for (let i = 0; i < arr.length; i++) {
        const key = arr[i];
        output += `${i > 0 ? ',' : ''}${separator}${serialize(key, indent, baseIndent + indent)}`;
    }
    return `${output}${indent ? `\n${baseIndent}` : ''}]`;
}
function serializeObject(obj, indent, baseIndent) {
    let output = '{';
    const separator = indent ? `\n${baseIndent}${indent}` : '';
    const entries = Object.entries(obj);
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        const stringKey = makeLegalIdentifier(key) === key ? key : stringify(key);
        output += `${i > 0 ? ',' : ''}${separator}${stringKey}:${indent ? ' ' : ''}${serialize(value, indent, baseIndent + indent)}`;
    }
    return `${output}${indent ? `\n${baseIndent}` : ''}}`;
}
function serialize(obj, indent, baseIndent) {
    if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj))
            return serializeArray(obj, indent, baseIndent);
        if (obj instanceof Date)
            return `new Date(${obj.getTime()})`;
        if (obj instanceof RegExp)
            return obj.toString();
        return serializeObject(obj, indent, baseIndent);
    }
    if (typeof obj === 'number') {
        if (obj === Infinity)
            return 'Infinity';
        if (obj === -Infinity)
            return '-Infinity';
        if (obj === 0)
            return 1 / obj === Infinity ? '0' : '-0';
        if (obj !== obj)
            return 'NaN'; // eslint-disable-line no-self-compare
    }
    if (typeof obj === 'symbol') {
        const key = Symbol.keyFor(obj);
        // eslint-disable-next-line no-undefined
        if (key !== undefined)
            return `Symbol.for(${stringify(key)})`;
    }
    if (typeof obj === 'bigint')
        return `${obj}n`;
    return stringify(obj);
}
// isWellFormed exists from Node.js 20
const hasStringIsWellFormed = 'isWellFormed' in String.prototype;
function isWellFormedString(input) {
    // @ts-expect-error String::isWellFormed exists from ES2024. tsconfig lib is set to ES6
    if (hasStringIsWellFormed)
        return input.isWellFormed();
    // https://github.com/tc39/proposal-is-usv-string/blob/main/README.md#algorithm
    return !/\p{Surrogate}/u.test(input);
}
const dataToEsm = function dataToEsm(data, options = {}) {
    var _a, _b;
    const t = options.compact ? '' : 'indent' in options ? options.indent : '\t';
    const _ = options.compact ? '' : ' ';
    const n = options.compact ? '' : '\n';
    const declarationType = options.preferConst ? 'const' : 'var';
    if (options.namedExports === false ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        data instanceof Date ||
        data instanceof RegExp ||
        data === null) {
        const code = serialize(data, options.compact ? null : t, '');
        const magic = _ || (/^[{[\-\/]/.test(code) ? '' : ' '); // eslint-disable-line no-useless-escape
        return `export default${magic}${code};`;
    }
    let maxUnderbarPrefixLength = 0;
    for (const key of Object.keys(data)) {
        const underbarPrefixLength = (_b = (_a = /^(_+)/.exec(key)) === null || _a === void 0 ? void 0 : _a[0].length) !== null && _b !== void 0 ? _b : 0;
        if (underbarPrefixLength > maxUnderbarPrefixLength) {
            maxUnderbarPrefixLength = underbarPrefixLength;
        }
    }
    const arbitraryNamePrefix = `${'_'.repeat(maxUnderbarPrefixLength + 1)}arbitrary`;
    let namedExportCode = '';
    const defaultExportRows = [];
    const arbitraryNameExportRows = [];
    for (const [key, value] of Object.entries(data)) {
        if (key === makeLegalIdentifier(key)) {
            if (options.objectShorthand)
                defaultExportRows.push(key);
            else
                defaultExportRows.push(`${key}:${_}${key}`);
            namedExportCode += `export ${declarationType} ${key}${_}=${_}${serialize(value, options.compact ? null : t, '')};${n}`;
        }
        else {
            defaultExportRows.push(`${stringify(key)}:${_}${serialize(value, options.compact ? null : t, '')}`);
            if (options.includeArbitraryNames && isWellFormedString(key)) {
                const variableName = `${arbitraryNamePrefix}${arbitraryNameExportRows.length}`;
                namedExportCode += `${declarationType} ${variableName}${_}=${_}${serialize(value, options.compact ? null : t, '')};${n}`;
                arbitraryNameExportRows.push(`${variableName} as ${JSON.stringify(key)}`);
            }
        }
    }
    const arbitraryExportCode = arbitraryNameExportRows.length > 0
        ? `export${_}{${n}${t}${arbitraryNameExportRows.join(`,${n}${t}`)}${n}};${n}`
        : '';
    const defaultExportCode = `export default${_}{${n}${t}${defaultExportRows.join(`,${n}${t}`)}${n}};${n}`;
    return `${namedExportCode}${arbitraryExportCode}${defaultExportCode}`;
};

// TODO: remove this in next major
var index = {
    addExtension,
    attachScopes,
    createFilter,
    dataToEsm,
    extractAssignedNames,
    makeLegalIdentifier,
    normalizePath
};

export { addExtension, attachScopes, createFilter, dataToEsm, index as default, extractAssignedNames, makeLegalIdentifier, normalizePath };
//# sourceMappingURL=index.js.map
