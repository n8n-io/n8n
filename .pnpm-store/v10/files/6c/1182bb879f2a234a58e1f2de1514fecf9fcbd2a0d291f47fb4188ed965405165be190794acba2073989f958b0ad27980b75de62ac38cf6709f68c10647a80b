/*!
  * core-base v11.1.10
  * (c) 2025 kazuya kawaguchi
  * Released under the MIT License.
  */
'use strict';

var messageCompiler = require('@intlify/message-compiler');
var shared = require('@intlify/shared');

function isMessageAST(val) {
    return (shared.isObject(val) &&
        resolveType(val) === 0 &&
        (shared.hasOwn(val, 'b') || shared.hasOwn(val, 'body')));
}
const PROPS_BODY = ['b', 'body'];
function resolveBody(node) {
    return resolveProps(node, PROPS_BODY);
}
const PROPS_CASES = ['c', 'cases'];
function resolveCases(node) {
    return resolveProps(node, PROPS_CASES, []);
}
const PROPS_STATIC = ['s', 'static'];
function resolveStatic(node) {
    return resolveProps(node, PROPS_STATIC);
}
const PROPS_ITEMS = ['i', 'items'];
function resolveItems(node) {
    return resolveProps(node, PROPS_ITEMS, []);
}
const PROPS_TYPE = ['t', 'type'];
function resolveType(node) {
    return resolveProps(node, PROPS_TYPE);
}
const PROPS_VALUE = ['v', 'value'];
function resolveValue$1(node, type) {
    const resolved = resolveProps(node, PROPS_VALUE);
    if (resolved != null) {
        return resolved;
    }
    else {
        throw createUnhandleNodeError(type);
    }
}
const PROPS_MODIFIER = ['m', 'modifier'];
function resolveLinkedModifier(node) {
    return resolveProps(node, PROPS_MODIFIER);
}
const PROPS_KEY = ['k', 'key'];
function resolveLinkedKey(node) {
    const resolved = resolveProps(node, PROPS_KEY);
    if (resolved) {
        return resolved;
    }
    else {
        throw createUnhandleNodeError(6 /* NodeTypes.Linked */);
    }
}
function resolveProps(node, props, defaultValue) {
    for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (shared.hasOwn(node, prop) && node[prop] != null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return node[prop];
        }
    }
    return defaultValue;
}
const AST_NODE_PROPS_KEYS = [
    ...PROPS_BODY,
    ...PROPS_CASES,
    ...PROPS_STATIC,
    ...PROPS_ITEMS,
    ...PROPS_KEY,
    ...PROPS_MODIFIER,
    ...PROPS_VALUE,
    ...PROPS_TYPE
];
function createUnhandleNodeError(type) {
    return new Error(`unhandled node type: ${type}`);
}

function format(ast) {
    const msg = (ctx) => formatParts(ctx, ast);
    return msg;
}
function formatParts(ctx, ast) {
    const body = resolveBody(ast);
    if (body == null) {
        throw createUnhandleNodeError(0 /* NodeTypes.Resource */);
    }
    const type = resolveType(body);
    if (type === 1 /* NodeTypes.Plural */) {
        const plural = body;
        const cases = resolveCases(plural);
        return ctx.plural(cases.reduce((messages, c) => [
            ...messages,
            formatMessageParts(ctx, c)
        ], []));
    }
    else {
        return formatMessageParts(ctx, body);
    }
}
function formatMessageParts(ctx, node) {
    const static_ = resolveStatic(node);
    if (static_ != null) {
        return ctx.type === 'text'
            ? static_
            : ctx.normalize([static_]);
    }
    else {
        const messages = resolveItems(node).reduce((acm, c) => [...acm, formatMessagePart(ctx, c)], []);
        return ctx.normalize(messages);
    }
}
function formatMessagePart(ctx, node) {
    const type = resolveType(node);
    switch (type) {
        case 3 /* NodeTypes.Text */: {
            return resolveValue$1(node, type);
        }
        case 9 /* NodeTypes.Literal */: {
            return resolveValue$1(node, type);
        }
        case 4 /* NodeTypes.Named */: {
            const named = node;
            if (shared.hasOwn(named, 'k') && named.k) {
                return ctx.interpolate(ctx.named(named.k));
            }
            if (shared.hasOwn(named, 'key') && named.key) {
                return ctx.interpolate(ctx.named(named.key));
            }
            throw createUnhandleNodeError(type);
        }
        case 5 /* NodeTypes.List */: {
            const list = node;
            if (shared.hasOwn(list, 'i') && shared.isNumber(list.i)) {
                return ctx.interpolate(ctx.list(list.i));
            }
            if (shared.hasOwn(list, 'index') && shared.isNumber(list.index)) {
                return ctx.interpolate(ctx.list(list.index));
            }
            throw createUnhandleNodeError(type);
        }
        case 6 /* NodeTypes.Linked */: {
            const linked = node;
            const modifier = resolveLinkedModifier(linked);
            const key = resolveLinkedKey(linked);
            return ctx.linked(formatMessagePart(ctx, key), modifier ? formatMessagePart(ctx, modifier) : undefined, ctx.type);
        }
        case 7 /* NodeTypes.LinkedKey */: {
            return resolveValue$1(node, type);
        }
        case 8 /* NodeTypes.LinkedModifier */: {
            return resolveValue$1(node, type);
        }
        default:
            throw new Error(`unhandled node on format message part: ${type}`);
    }
}

const WARN_MESSAGE = `Detected HTML in '{source}' message. Recommend not using HTML messages to avoid XSS.`;
function checkHtmlMessage(source, warnHtmlMessage) {
    if (warnHtmlMessage && messageCompiler.detectHtmlTag(source)) {
        shared.warn(shared.format(WARN_MESSAGE, { source }));
    }
}
const defaultOnCacheKey = (message) => message;
let compileCache = shared.create();
function clearCompileCache() {
    compileCache = shared.create();
}
function baseCompile(message, options = {}) {
    // error detecting on compile
    let detectError = false;
    const onError = options.onError || messageCompiler.defaultOnError;
    options.onError = (err) => {
        detectError = true;
        onError(err);
    };
    // compile with mesasge-compiler
    return { ...messageCompiler.baseCompile(message, options), detectError };
}
/* #__NO_SIDE_EFFECTS__ */
function compile(message, context) {
    if (shared.isString(message)) {
        // check HTML message
        const warnHtmlMessage = shared.isBoolean(context.warnHtmlMessage)
            ? context.warnHtmlMessage
            : true;
        checkHtmlMessage(message, warnHtmlMessage);
        // check caches
        const onCacheKey = context.onCacheKey || defaultOnCacheKey;
        const cacheKey = onCacheKey(message);
        const cached = compileCache[cacheKey];
        if (cached) {
            return cached;
        }
        // compile with JIT mode
        const { ast, detectError } = baseCompile(message, {
            ...context,
            location: true,
            jit: true
        });
        // compose message function from AST
        const msg = format(ast);
        // if occurred compile error, don't cache
        return !detectError
            ? (compileCache[cacheKey] = msg)
            : msg;
    }
    else {
        if (!isMessageAST(message)) {
            shared.warn(`the message that is resolve with key '${context.key}' is not supported for jit compilation`);
            return (() => message);
        }
        // AST case (passed from bundler)
        const cacheKey = message.cacheKey;
        if (cacheKey) {
            const cached = compileCache[cacheKey];
            if (cached) {
                return cached;
            }
            // compose message function from message (AST)
            return (compileCache[cacheKey] =
                format(message));
        }
        else {
            return format(message);
        }
    }
}

let devtools = null;
function setDevToolsHook(hook) {
    devtools = hook;
}
function getDevToolsHook() {
    return devtools;
}
function initI18nDevTools(i18n, version, meta) {
    // TODO: queue if devtools is undefined
    devtools &&
        devtools.emit('i18n:init', {
            timestamp: Date.now(),
            i18n,
            version,
            meta
        });
}
const translateDevTools = 
/* #__PURE__*/ createDevToolsHook('function:translate');
function createDevToolsHook(hook) {
    return (payloads) => devtools && devtools.emit(hook, payloads);
}

const CoreErrorCodes = {
    INVALID_ARGUMENT: messageCompiler.COMPILE_ERROR_CODES_EXTEND_POINT, // 17
    INVALID_DATE_ARGUMENT: 18,
    INVALID_ISO_DATE_ARGUMENT: 19,
    NOT_SUPPORT_NON_STRING_MESSAGE: 20,
    NOT_SUPPORT_LOCALE_PROMISE_VALUE: 21,
    NOT_SUPPORT_LOCALE_ASYNC_FUNCTION: 22,
    NOT_SUPPORT_LOCALE_TYPE: 23
};
const CORE_ERROR_CODES_EXTEND_POINT = 24;
function createCoreError(code) {
    return messageCompiler.createCompileError(code, null, { messages: errorMessages } );
}
/** @internal */
const errorMessages = {
    [CoreErrorCodes.INVALID_ARGUMENT]: 'Invalid arguments',
    [CoreErrorCodes.INVALID_DATE_ARGUMENT]: 'The date provided is an invalid Date object.' +
        'Make sure your Date represents a valid date.',
    [CoreErrorCodes.INVALID_ISO_DATE_ARGUMENT]: 'The argument provided is not a valid ISO date string',
    [CoreErrorCodes.NOT_SUPPORT_NON_STRING_MESSAGE]: 'Not support non-string message',
    [CoreErrorCodes.NOT_SUPPORT_LOCALE_PROMISE_VALUE]: 'cannot support promise value',
    [CoreErrorCodes.NOT_SUPPORT_LOCALE_ASYNC_FUNCTION]: 'cannot support async function',
    [CoreErrorCodes.NOT_SUPPORT_LOCALE_TYPE]: 'cannot support locale type'
};

/** @internal */
function getLocale(context, options) {
    return options.locale != null
        ? resolveLocale(options.locale)
        : resolveLocale(context.locale);
}
let _resolveLocale;
/** @internal */
function resolveLocale(locale) {
    if (shared.isString(locale)) {
        return locale;
    }
    else {
        if (shared.isFunction(locale)) {
            if (locale.resolvedOnce && _resolveLocale != null) {
                return _resolveLocale;
            }
            else if (locale.constructor.name === 'Function') {
                const resolve = locale();
                if (shared.isPromise(resolve)) {
                    throw createCoreError(CoreErrorCodes.NOT_SUPPORT_LOCALE_PROMISE_VALUE);
                }
                return (_resolveLocale = resolve);
            }
            else {
                throw createCoreError(CoreErrorCodes.NOT_SUPPORT_LOCALE_ASYNC_FUNCTION);
            }
        }
        else {
            throw createCoreError(CoreErrorCodes.NOT_SUPPORT_LOCALE_TYPE);
        }
    }
}
/**
 * Fallback with simple implemenation
 *
 * @remarks
 * A fallback locale function implemented with a simple fallback algorithm.
 *
 * Basically, it returns the value as specified in the `fallbackLocale` props, and is processed with the fallback inside intlify.
 *
 * @param ctx - A {@link CoreContext | context}
 * @param fallback - A {@link FallbackLocale | fallback locale}
 * @param start - A starting {@link Locale | locale}
 *
 * @returns Fallback locales
 *
 * @VueI18nGeneral
 */
function fallbackWithSimple(ctx, fallback, start) {
    // prettier-ignore
    return [...new Set([
            start,
            ...(shared.isArray(fallback)
                ? fallback
                : shared.isObject(fallback)
                    ? Object.keys(fallback)
                    : shared.isString(fallback)
                        ? [fallback]
                        : [start])
        ])];
}
/**
 * Fallback with locale chain
 *
 * @remarks
 * A fallback locale function implemented with a fallback chain algorithm. It's used in VueI18n as default.
 *
 * @param ctx - A {@link CoreContext | context}
 * @param fallback - A {@link FallbackLocale | fallback locale}
 * @param start - A starting {@link Locale | locale}
 *
 * @returns Fallback locales
 *
 * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
 *
 * @VueI18nGeneral
 */
function fallbackWithLocaleChain(ctx, fallback, start) {
    const startLocale = shared.isString(start) ? start : DEFAULT_LOCALE;
    const context = ctx;
    if (!context.__localeChainCache) {
        context.__localeChainCache = new Map();
    }
    let chain = context.__localeChainCache.get(startLocale);
    if (!chain) {
        chain = [];
        // first block defined by start
        let block = [start];
        // while any intervening block found
        while (shared.isArray(block)) {
            block = appendBlockToChain(chain, block, fallback);
        }
        // prettier-ignore
        // last block defined by default
        const defaults = shared.isArray(fallback) || !shared.isPlainObject(fallback)
            ? fallback
            : fallback['default']
                ? fallback['default']
                : null;
        // convert defaults to array
        block = shared.isString(defaults) ? [defaults] : defaults;
        if (shared.isArray(block)) {
            appendBlockToChain(chain, block, false);
        }
        context.__localeChainCache.set(startLocale, chain);
    }
    return chain;
}
function appendBlockToChain(chain, block, blocks) {
    let follow = true;
    for (let i = 0; i < block.length && shared.isBoolean(follow); i++) {
        const locale = block[i];
        if (shared.isString(locale)) {
            follow = appendLocaleToChain(chain, block[i], blocks);
        }
    }
    return follow;
}
function appendLocaleToChain(chain, locale, blocks) {
    let follow;
    const tokens = locale.split('-');
    do {
        const target = tokens.join('-');
        follow = appendItemToChain(chain, target, blocks);
        tokens.splice(-1, 1);
    } while (tokens.length && follow === true);
    return follow;
}
function appendItemToChain(chain, target, blocks) {
    let follow = false;
    if (!chain.includes(target)) {
        follow = true;
        if (target) {
            follow = target[target.length - 1] !== '!';
            const locale = target.replace(/!/g, '');
            chain.push(locale);
            if ((shared.isArray(blocks) || shared.isPlainObject(blocks)) &&
                blocks[locale] // eslint-disable-line @typescript-eslint/no-explicit-any
            ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                follow = blocks[locale];
            }
        }
    }
    return follow;
}

const pathStateMachine = [];
pathStateMachine[0 /* States.BEFORE_PATH */] = {
    ["w" /* PathCharTypes.WORKSPACE */]: [0 /* States.BEFORE_PATH */],
    ["i" /* PathCharTypes.IDENT */]: [3 /* States.IN_IDENT */, 0 /* Actions.APPEND */],
    ["[" /* PathCharTypes.LEFT_BRACKET */]: [4 /* States.IN_SUB_PATH */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: [7 /* States.AFTER_PATH */]
};
pathStateMachine[1 /* States.IN_PATH */] = {
    ["w" /* PathCharTypes.WORKSPACE */]: [1 /* States.IN_PATH */],
    ["." /* PathCharTypes.DOT */]: [2 /* States.BEFORE_IDENT */],
    ["[" /* PathCharTypes.LEFT_BRACKET */]: [4 /* States.IN_SUB_PATH */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: [7 /* States.AFTER_PATH */]
};
pathStateMachine[2 /* States.BEFORE_IDENT */] = {
    ["w" /* PathCharTypes.WORKSPACE */]: [2 /* States.BEFORE_IDENT */],
    ["i" /* PathCharTypes.IDENT */]: [3 /* States.IN_IDENT */, 0 /* Actions.APPEND */],
    ["0" /* PathCharTypes.ZERO */]: [3 /* States.IN_IDENT */, 0 /* Actions.APPEND */]
};
pathStateMachine[3 /* States.IN_IDENT */] = {
    ["i" /* PathCharTypes.IDENT */]: [3 /* States.IN_IDENT */, 0 /* Actions.APPEND */],
    ["0" /* PathCharTypes.ZERO */]: [3 /* States.IN_IDENT */, 0 /* Actions.APPEND */],
    ["w" /* PathCharTypes.WORKSPACE */]: [1 /* States.IN_PATH */, 1 /* Actions.PUSH */],
    ["." /* PathCharTypes.DOT */]: [2 /* States.BEFORE_IDENT */, 1 /* Actions.PUSH */],
    ["[" /* PathCharTypes.LEFT_BRACKET */]: [4 /* States.IN_SUB_PATH */, 1 /* Actions.PUSH */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: [7 /* States.AFTER_PATH */, 1 /* Actions.PUSH */]
};
pathStateMachine[4 /* States.IN_SUB_PATH */] = {
    ["'" /* PathCharTypes.SINGLE_QUOTE */]: [5 /* States.IN_SINGLE_QUOTE */, 0 /* Actions.APPEND */],
    ["\"" /* PathCharTypes.DOUBLE_QUOTE */]: [6 /* States.IN_DOUBLE_QUOTE */, 0 /* Actions.APPEND */],
    ["[" /* PathCharTypes.LEFT_BRACKET */]: [
        4 /* States.IN_SUB_PATH */,
        2 /* Actions.INC_SUB_PATH_DEPTH */
    ],
    ["]" /* PathCharTypes.RIGHT_BRACKET */]: [1 /* States.IN_PATH */, 3 /* Actions.PUSH_SUB_PATH */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: 8 /* States.ERROR */,
    ["l" /* PathCharTypes.ELSE */]: [4 /* States.IN_SUB_PATH */, 0 /* Actions.APPEND */]
};
pathStateMachine[5 /* States.IN_SINGLE_QUOTE */] = {
    ["'" /* PathCharTypes.SINGLE_QUOTE */]: [4 /* States.IN_SUB_PATH */, 0 /* Actions.APPEND */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: 8 /* States.ERROR */,
    ["l" /* PathCharTypes.ELSE */]: [5 /* States.IN_SINGLE_QUOTE */, 0 /* Actions.APPEND */]
};
pathStateMachine[6 /* States.IN_DOUBLE_QUOTE */] = {
    ["\"" /* PathCharTypes.DOUBLE_QUOTE */]: [4 /* States.IN_SUB_PATH */, 0 /* Actions.APPEND */],
    ["o" /* PathCharTypes.END_OF_FAIL */]: 8 /* States.ERROR */,
    ["l" /* PathCharTypes.ELSE */]: [6 /* States.IN_DOUBLE_QUOTE */, 0 /* Actions.APPEND */]
};
/**
 * Check if an expression is a literal value.
 */
const literalValueRE = /^\s?(?:true|false|-?[\d.]+|'[^']*'|"[^"]*")\s?$/;
function isLiteral(exp) {
    return literalValueRE.test(exp);
}
/**
 * Strip quotes from a string
 */
function stripQuotes(str) {
    const a = str.charCodeAt(0);
    const b = str.charCodeAt(str.length - 1);
    return a === b && (a === 0x22 || a === 0x27) ? str.slice(1, -1) : str;
}
/**
 * Determine the type of a character in a keypath.
 */
function getPathCharType(ch) {
    if (ch === undefined || ch === null) {
        return "o" /* PathCharTypes.END_OF_FAIL */;
    }
    const code = ch.charCodeAt(0);
    switch (code) {
        case 0x5b: // [
        case 0x5d: // ]
        case 0x2e: // .
        case 0x22: // "
        case 0x27: // '
            return ch;
        case 0x5f: // _
        case 0x24: // $
        case 0x2d: // -
            return "i" /* PathCharTypes.IDENT */;
        case 0x09: // Tab (HT)
        case 0x0a: // Newline (LF)
        case 0x0d: // Return (CR)
        case 0xa0: // No-break space (NBSP)
        case 0xfeff: // Byte Order Mark (BOM)
        case 0x2028: // Line Separator (LS)
        case 0x2029: // Paragraph Separator (PS)
            return "w" /* PathCharTypes.WORKSPACE */;
    }
    return "i" /* PathCharTypes.IDENT */;
}
/**
 * Format a subPath, return its plain form if it is
 * a literal string or number. Otherwise prepend the
 * dynamic indicator (*).
 */
function formatSubPath(path) {
    const trimmed = path.trim();
    // invalid leading 0
    if (path.charAt(0) === '0' && isNaN(parseInt(path))) {
        return false;
    }
    return isLiteral(trimmed)
        ? stripQuotes(trimmed)
        : "*" /* PathCharTypes.ASTARISK */ + trimmed;
}
/**
 * Parse a string path into an array of segments
 */
function parse(path) {
    const keys = [];
    let index = -1;
    let mode = 0 /* States.BEFORE_PATH */;
    let subPathDepth = 0;
    let c;
    let key; // eslint-disable-line
    let newChar;
    let type;
    let transition;
    let action;
    let typeMap;
    const actions = [];
    actions[0 /* Actions.APPEND */] = () => {
        if (key === undefined) {
            key = newChar;
        }
        else {
            key += newChar;
        }
    };
    actions[1 /* Actions.PUSH */] = () => {
        if (key !== undefined) {
            keys.push(key);
            key = undefined;
        }
    };
    actions[2 /* Actions.INC_SUB_PATH_DEPTH */] = () => {
        actions[0 /* Actions.APPEND */]();
        subPathDepth++;
    };
    actions[3 /* Actions.PUSH_SUB_PATH */] = () => {
        if (subPathDepth > 0) {
            subPathDepth--;
            mode = 4 /* States.IN_SUB_PATH */;
            actions[0 /* Actions.APPEND */]();
        }
        else {
            subPathDepth = 0;
            if (key === undefined) {
                return false;
            }
            key = formatSubPath(key);
            if (key === false) {
                return false;
            }
            else {
                actions[1 /* Actions.PUSH */]();
            }
        }
    };
    function maybeUnescapeQuote() {
        const nextChar = path[index + 1];
        if ((mode === 5 /* States.IN_SINGLE_QUOTE */ &&
            nextChar === "'" /* PathCharTypes.SINGLE_QUOTE */) ||
            (mode === 6 /* States.IN_DOUBLE_QUOTE */ &&
                nextChar === "\"" /* PathCharTypes.DOUBLE_QUOTE */)) {
            index++;
            newChar = '\\' + nextChar;
            actions[0 /* Actions.APPEND */]();
            return true;
        }
    }
    while (mode !== null) {
        index++;
        c = path[index];
        if (c === '\\' && maybeUnescapeQuote()) {
            continue;
        }
        type = getPathCharType(c);
        typeMap = pathStateMachine[mode];
        transition = typeMap[type] || typeMap["l" /* PathCharTypes.ELSE */] || 8 /* States.ERROR */;
        // check parse error
        if (transition === 8 /* States.ERROR */) {
            return;
        }
        mode = transition[0];
        if (transition[1] !== undefined) {
            action = actions[transition[1]];
            if (action) {
                newChar = c;
                if (action() === false) {
                    return;
                }
            }
        }
        // check parse finish
        if (mode === 7 /* States.AFTER_PATH */) {
            return keys;
        }
    }
}
// path token cache
const cache = new Map();
/**
 * key-value message resolver
 *
 * @remarks
 * Resolves messages with the key-value structure. Note that messages with a hierarchical structure such as objects cannot be resolved
 *
 * @param obj - A target object to be resolved with path
 * @param path - A {@link Path | path} to resolve the value of message
 *
 * @returns A resolved {@link PathValue | path value}
 *
 * @VueI18nGeneral
 */
function resolveWithKeyValue(obj, path) {
    return shared.isObject(obj) ? obj[path] : null;
}
/**
 * message resolver
 *
 * @remarks
 * Resolves messages. messages with a hierarchical structure such as objects can be resolved. This resolver is used in VueI18n as default.
 *
 * @param obj - A target object to be resolved with path
 * @param path - A {@link Path | path} to resolve the value of message
 *
 * @returns A resolved {@link PathValue | path value}
 *
 * @VueI18nGeneral
 */
function resolveValue(obj, path) {
    // check object
    if (!shared.isObject(obj)) {
        return null;
    }
    // parse path
    let hit = cache.get(path);
    if (!hit) {
        hit = parse(path);
        if (hit) {
            cache.set(path, hit);
        }
    }
    // check hit
    if (!hit) {
        return null;
    }
    // resolve path value
    const len = hit.length;
    let last = obj;
    let i = 0;
    while (i < len) {
        const key = hit[i];
        /**
         * NOTE:
         * if `key` is intlify message format AST node key and `last` is intlify message format AST, skip it.
         * because the AST node is not a key-value structure.
         */
        if (AST_NODE_PROPS_KEYS.includes(key) && isMessageAST(last)) {
            return null;
        }
        const val = last[key];
        if (val === undefined) {
            return null;
        }
        if (shared.isFunction(last)) {
            return null;
        }
        last = val;
        i++;
    }
    return last;
}

const CoreWarnCodes = {
    NOT_FOUND_KEY: 1,
    FALLBACK_TO_TRANSLATE: 2,
    CANNOT_FORMAT_NUMBER: 3,
    FALLBACK_TO_NUMBER_FORMAT: 4,
    CANNOT_FORMAT_DATE: 5,
    FALLBACK_TO_DATE_FORMAT: 6,
    EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER: 7
};
const CORE_WARN_CODES_EXTEND_POINT = 8;
/** @internal */
const warnMessages = {
    [CoreWarnCodes.NOT_FOUND_KEY]: `Not found '{key}' key in '{locale}' locale messages.`,
    [CoreWarnCodes.FALLBACK_TO_TRANSLATE]: `Fall back to translate '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.CANNOT_FORMAT_NUMBER]: `Cannot format a number value due to not supported Intl.NumberFormat.`,
    [CoreWarnCodes.FALLBACK_TO_NUMBER_FORMAT]: `Fall back to number format '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.CANNOT_FORMAT_DATE]: `Cannot format a date value due to not supported Intl.DateTimeFormat.`,
    [CoreWarnCodes.FALLBACK_TO_DATE_FORMAT]: `Fall back to datetime format '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER]: `This project is using Custom Message Compiler, which is an experimental feature. It may receive breaking changes or be removed in the future.`
};
function getWarnMessage(code, ...args) {
    return shared.format(warnMessages[code], ...args);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Intlify core-base version
 * @internal
 */
const VERSION = '11.1.10';
const NOT_REOSLVED = -1;
const DEFAULT_LOCALE = 'en-US';
const MISSING_RESOLVE_VALUE = '';
const capitalize = (str) => `${str.charAt(0).toLocaleUpperCase()}${str.substr(1)}`;
function getDefaultLinkedModifiers() {
    return {
        upper: (val, type) => {
            // prettier-ignore
            return type === 'text' && shared.isString(val)
                ? val.toUpperCase()
                : type === 'vnode' && shared.isObject(val) && '__v_isVNode' in val
                    ? val.children.toUpperCase()
                    : val;
        },
        lower: (val, type) => {
            // prettier-ignore
            return type === 'text' && shared.isString(val)
                ? val.toLowerCase()
                : type === 'vnode' && shared.isObject(val) && '__v_isVNode' in val
                    ? val.children.toLowerCase()
                    : val;
        },
        capitalize: (val, type) => {
            // prettier-ignore
            return (type === 'text' && shared.isString(val)
                ? capitalize(val)
                : type === 'vnode' && shared.isObject(val) && '__v_isVNode' in val
                    ? capitalize(val.children)
                    : val);
        }
    };
}
let _compiler;
function registerMessageCompiler(compiler) {
    _compiler = compiler;
}
let _resolver;
/**
 * Register the message resolver
 *
 * @param resolver - A {@link MessageResolver} function
 *
 * @VueI18nGeneral
 */
function registerMessageResolver(resolver) {
    _resolver = resolver;
}
let _fallbacker;
/**
 * Register the locale fallbacker
 *
 * @param fallbacker - A {@link LocaleFallbacker} function
 *
 * @VueI18nGeneral
 */
function registerLocaleFallbacker(fallbacker) {
    _fallbacker = fallbacker;
}
// Additional Meta for Intlify DevTools
let _additionalMeta = null;
/* #__NO_SIDE_EFFECTS__ */
const setAdditionalMeta = (meta) => {
    _additionalMeta = meta;
};
/* #__NO_SIDE_EFFECTS__ */
const getAdditionalMeta = () => _additionalMeta;
let _fallbackContext = null;
const setFallbackContext = (context) => {
    _fallbackContext = context;
};
const getFallbackContext = () => _fallbackContext;
// ID for CoreContext
let _cid = 0;
function createCoreContext(options = {}) {
    // setup options
    const onWarn = shared.isFunction(options.onWarn) ? options.onWarn : shared.warn;
    const version = shared.isString(options.version) ? options.version : VERSION;
    const locale = shared.isString(options.locale) || shared.isFunction(options.locale)
        ? options.locale
        : DEFAULT_LOCALE;
    const _locale = shared.isFunction(locale) ? DEFAULT_LOCALE : locale;
    const fallbackLocale = shared.isArray(options.fallbackLocale) ||
        shared.isPlainObject(options.fallbackLocale) ||
        shared.isString(options.fallbackLocale) ||
        options.fallbackLocale === false
        ? options.fallbackLocale
        : _locale;
    const messages = shared.isPlainObject(options.messages)
        ? options.messages
        : createResources(_locale);
    const datetimeFormats = shared.isPlainObject(options.datetimeFormats)
            ? options.datetimeFormats
            : createResources(_locale)
        ;
    const numberFormats = shared.isPlainObject(options.numberFormats)
            ? options.numberFormats
            : createResources(_locale)
        ;
    const modifiers = shared.assign(shared.create(), options.modifiers, getDefaultLinkedModifiers());
    const pluralRules = options.pluralRules || shared.create();
    const missing = shared.isFunction(options.missing) ? options.missing : null;
    const missingWarn = shared.isBoolean(options.missingWarn) || shared.isRegExp(options.missingWarn)
        ? options.missingWarn
        : true;
    const fallbackWarn = shared.isBoolean(options.fallbackWarn) || shared.isRegExp(options.fallbackWarn)
        ? options.fallbackWarn
        : true;
    const fallbackFormat = !!options.fallbackFormat;
    const unresolving = !!options.unresolving;
    const postTranslation = shared.isFunction(options.postTranslation)
        ? options.postTranslation
        : null;
    const processor = shared.isPlainObject(options.processor) ? options.processor : null;
    const warnHtmlMessage = shared.isBoolean(options.warnHtmlMessage)
        ? options.warnHtmlMessage
        : true;
    const escapeParameter = !!options.escapeParameter;
    const messageCompiler = shared.isFunction(options.messageCompiler)
        ? options.messageCompiler
        : _compiler;
    if (shared.isFunction(options.messageCompiler)) {
        shared.warnOnce(getWarnMessage(CoreWarnCodes.EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER));
    }
    const messageResolver = shared.isFunction(options.messageResolver)
        ? options.messageResolver
        : _resolver || resolveWithKeyValue;
    const localeFallbacker = shared.isFunction(options.localeFallbacker)
        ? options.localeFallbacker
        : _fallbacker || fallbackWithSimple;
    const fallbackContext = shared.isObject(options.fallbackContext)
        ? options.fallbackContext
        : undefined;
    // setup internal options
    const internalOptions = options;
    const __datetimeFormatters = shared.isObject(internalOptions.__datetimeFormatters)
            ? internalOptions.__datetimeFormatters
            : new Map()
        ;
    const __numberFormatters = shared.isObject(internalOptions.__numberFormatters)
            ? internalOptions.__numberFormatters
            : new Map()
        ;
    const __meta = shared.isObject(internalOptions.__meta) ? internalOptions.__meta : {};
    _cid++;
    const context = {
        version,
        cid: _cid,
        locale,
        fallbackLocale,
        messages,
        modifiers,
        pluralRules,
        missing,
        missingWarn,
        fallbackWarn,
        fallbackFormat,
        unresolving,
        postTranslation,
        processor,
        warnHtmlMessage,
        escapeParameter,
        messageCompiler,
        messageResolver,
        localeFallbacker,
        fallbackContext,
        onWarn,
        __meta
    };
    {
        context.datetimeFormats = datetimeFormats;
        context.numberFormats = numberFormats;
        context.__datetimeFormatters = __datetimeFormatters;
        context.__numberFormatters = __numberFormatters;
    }
    // for vue-devtools timeline event
    {
        context.__v_emitter =
            internalOptions.__v_emitter != null
                ? internalOptions.__v_emitter
                : undefined;
    }
    // NOTE: experimental !!
    {
        initI18nDevTools(context, version, __meta);
    }
    return context;
}
const createResources = (locale) => ({ [locale]: shared.create() });
/** @internal */
function isTranslateFallbackWarn(fallback, key) {
    return fallback instanceof RegExp ? fallback.test(key) : fallback;
}
/** @internal */
function isTranslateMissingWarn(missing, key) {
    return missing instanceof RegExp ? missing.test(key) : missing;
}
/** @internal */
function handleMissing(context, key, locale, missingWarn, type) {
    const { missing, onWarn } = context;
    // for vue-devtools timeline event
    {
        const emitter = context.__v_emitter;
        if (emitter) {
            emitter.emit('missing', {
                locale,
                key,
                type,
                groupId: `${type}:${key}`
            });
        }
    }
    if (missing !== null) {
        const ret = missing(context, locale, key, type);
        return shared.isString(ret) ? ret : key;
    }
    else {
        if (isTranslateMissingWarn(missingWarn, key)) {
            onWarn(getWarnMessage(CoreWarnCodes.NOT_FOUND_KEY, { key, locale }));
        }
        return key;
    }
}
/** @internal */
function updateFallbackLocale(ctx, locale, fallback) {
    const context = ctx;
    context.__localeChainCache = new Map();
    ctx.localeFallbacker(ctx, fallback, locale);
}
/** @internal */
function isAlmostSameLocale(locale, compareLocale) {
    if (locale === compareLocale)
        return false;
    return locale.split('-')[0] === compareLocale.split('-')[0];
}
/** @internal */
function isImplicitFallback(targetLocale, locales) {
    const index = locales.indexOf(targetLocale);
    if (index === -1) {
        return false;
    }
    for (let i = index + 1; i < locales.length; i++) {
        if (isAlmostSameLocale(targetLocale, locales[i])) {
            return true;
        }
    }
    return false;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const intlDefined = typeof Intl !== 'undefined';
const Availabilities = {
    dateTimeFormat: intlDefined && typeof Intl.DateTimeFormat !== 'undefined',
    numberFormat: intlDefined && typeof Intl.NumberFormat !== 'undefined'
};

// implementation of `datetime` function
function datetime(context, ...args) {
    const { datetimeFormats, unresolving, fallbackLocale, onWarn, localeFallbacker } = context;
    const { __datetimeFormatters } = context;
    if (!Availabilities.dateTimeFormat) {
        onWarn(getWarnMessage(CoreWarnCodes.CANNOT_FORMAT_DATE));
        return MISSING_RESOLVE_VALUE;
    }
    const [key, value, options, overrides] = parseDateTimeArgs(...args);
    const missingWarn = shared.isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = shared.isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const part = !!options.part;
    const locale = getLocale(context, options);
    const locales = localeFallbacker(context, // eslint-disable-line @typescript-eslint/no-explicit-any
    fallbackLocale, locale);
    if (!shared.isString(key) || key === '') {
        return new Intl.DateTimeFormat(locale, overrides).format(value);
    }
    // resolve format
    let datetimeFormat = {};
    let targetLocale;
    let format = null;
    let from = locale;
    let to = null;
    const type = 'datetime format';
    for (let i = 0; i < locales.length; i++) {
        targetLocale = to = locales[i];
        if (locale !== targetLocale &&
            isTranslateFallbackWarn(fallbackWarn, key)) {
            onWarn(getWarnMessage(CoreWarnCodes.FALLBACK_TO_DATE_FORMAT, {
                key,
                target: targetLocale
            }));
        }
        // for vue-devtools timeline event
        if (locale !== targetLocale) {
            const emitter = context.__v_emitter;
            if (emitter) {
                emitter.emit('fallback', {
                    type,
                    key,
                    from,
                    to,
                    groupId: `${type}:${key}`
                });
            }
        }
        datetimeFormat =
            datetimeFormats[targetLocale] || {};
        format = datetimeFormat[key];
        if (shared.isPlainObject(format))
            break;
        handleMissing(context, key, targetLocale, missingWarn, type); // eslint-disable-line @typescript-eslint/no-explicit-any
        from = to;
    }
    // checking format and target locale
    if (!shared.isPlainObject(format) || !shared.isString(targetLocale)) {
        return unresolving ? NOT_REOSLVED : key;
    }
    let id = `${targetLocale}__${key}`;
    if (!shared.isEmptyObject(overrides)) {
        id = `${id}__${JSON.stringify(overrides)}`;
    }
    let formatter = __datetimeFormatters.get(id);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(targetLocale, shared.assign({}, format, overrides));
        __datetimeFormatters.set(id, formatter);
    }
    return !part ? formatter.format(value) : formatter.formatToParts(value);
}
/** @internal */
const DATETIME_FORMAT_OPTIONS_KEYS = [
    'localeMatcher',
    'weekday',
    'era',
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
    'timeZoneName',
    'formatMatcher',
    'hour12',
    'timeZone',
    'dateStyle',
    'timeStyle',
    'calendar',
    'dayPeriod',
    'numberingSystem',
    'hourCycle',
    'fractionalSecondDigits'
];
/** @internal */
function parseDateTimeArgs(...args) {
    const [arg1, arg2, arg3, arg4] = args;
    const options = shared.create();
    let overrides = shared.create();
    let value;
    if (shared.isString(arg1)) {
        // Only allow ISO strings - other date formats are often supported,
        // but may cause different results in different browsers.
        const matches = arg1.match(/(\d{4}-\d{2}-\d{2})(T|\s)?(.*)/);
        if (!matches) {
            throw createCoreError(CoreErrorCodes.INVALID_ISO_DATE_ARGUMENT);
        }
        // Some browsers can not parse the iso datetime separated by space,
        // this is a compromise solution by replace the 'T'/' ' with 'T'
        const dateTime = matches[3]
            ? matches[3].trim().startsWith('T')
                ? `${matches[1].trim()}${matches[3].trim()}`
                : `${matches[1].trim()}T${matches[3].trim()}`
            : matches[1].trim();
        value = new Date(dateTime);
        try {
            // This will fail if the date is not valid
            value.toISOString();
        }
        catch {
            throw createCoreError(CoreErrorCodes.INVALID_ISO_DATE_ARGUMENT);
        }
    }
    else if (shared.isDate(arg1)) {
        if (isNaN(arg1.getTime())) {
            throw createCoreError(CoreErrorCodes.INVALID_DATE_ARGUMENT);
        }
        value = arg1;
    }
    else if (shared.isNumber(arg1)) {
        value = arg1;
    }
    else {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    if (shared.isString(arg2)) {
        options.key = arg2;
    }
    else if (shared.isPlainObject(arg2)) {
        Object.keys(arg2).forEach(key => {
            if (DATETIME_FORMAT_OPTIONS_KEYS.includes(key)) {
                overrides[key] = arg2[key];
            }
            else {
                options[key] = arg2[key];
            }
        });
    }
    if (shared.isString(arg3)) {
        options.locale = arg3;
    }
    else if (shared.isPlainObject(arg3)) {
        overrides = arg3;
    }
    if (shared.isPlainObject(arg4)) {
        overrides = arg4;
    }
    return [options.key || '', value, options, overrides];
}
/** @internal */
function clearDateTimeFormat(ctx, locale, format) {
    const context = ctx;
    for (const key in format) {
        const id = `${locale}__${key}`;
        if (!context.__datetimeFormatters.has(id)) {
            continue;
        }
        context.__datetimeFormatters.delete(id);
    }
}

// implementation of `number` function
function number(context, ...args) {
    const { numberFormats, unresolving, fallbackLocale, onWarn, localeFallbacker } = context;
    const { __numberFormatters } = context;
    if (!Availabilities.numberFormat) {
        onWarn(getWarnMessage(CoreWarnCodes.CANNOT_FORMAT_NUMBER));
        return MISSING_RESOLVE_VALUE;
    }
    const [key, value, options, overrides] = parseNumberArgs(...args);
    const missingWarn = shared.isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = shared.isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const part = !!options.part;
    const locale = getLocale(context, options);
    const locales = localeFallbacker(context, // eslint-disable-line @typescript-eslint/no-explicit-any
    fallbackLocale, locale);
    if (!shared.isString(key) || key === '') {
        return new Intl.NumberFormat(locale, overrides).format(value);
    }
    // resolve format
    let numberFormat = {};
    let targetLocale;
    let format = null;
    let from = locale;
    let to = null;
    const type = 'number format';
    for (let i = 0; i < locales.length; i++) {
        targetLocale = to = locales[i];
        if (locale !== targetLocale &&
            isTranslateFallbackWarn(fallbackWarn, key)) {
            onWarn(getWarnMessage(CoreWarnCodes.FALLBACK_TO_NUMBER_FORMAT, {
                key,
                target: targetLocale
            }));
        }
        // for vue-devtools timeline event
        if (locale !== targetLocale) {
            const emitter = context.__v_emitter;
            if (emitter) {
                emitter.emit('fallback', {
                    type,
                    key,
                    from,
                    to,
                    groupId: `${type}:${key}`
                });
            }
        }
        numberFormat =
            numberFormats[targetLocale] || {};
        format = numberFormat[key];
        if (shared.isPlainObject(format))
            break;
        handleMissing(context, key, targetLocale, missingWarn, type); // eslint-disable-line @typescript-eslint/no-explicit-any
        from = to;
    }
    // checking format and target locale
    if (!shared.isPlainObject(format) || !shared.isString(targetLocale)) {
        return unresolving ? NOT_REOSLVED : key;
    }
    let id = `${targetLocale}__${key}`;
    if (!shared.isEmptyObject(overrides)) {
        id = `${id}__${JSON.stringify(overrides)}`;
    }
    let formatter = __numberFormatters.get(id);
    if (!formatter) {
        formatter = new Intl.NumberFormat(targetLocale, shared.assign({}, format, overrides));
        __numberFormatters.set(id, formatter);
    }
    return !part ? formatter.format(value) : formatter.formatToParts(value);
}
/** @internal */
const NUMBER_FORMAT_OPTIONS_KEYS = [
    'localeMatcher',
    'style',
    'currency',
    'currencyDisplay',
    'currencySign',
    'useGrouping',
    'minimumIntegerDigits',
    'minimumFractionDigits',
    'maximumFractionDigits',
    'minimumSignificantDigits',
    'maximumSignificantDigits',
    'compactDisplay',
    'notation',
    'signDisplay',
    'unit',
    'unitDisplay',
    'roundingMode',
    'roundingPriority',
    'roundingIncrement',
    'trailingZeroDisplay'
];
/** @internal */
function parseNumberArgs(...args) {
    const [arg1, arg2, arg3, arg4] = args;
    const options = shared.create();
    let overrides = shared.create();
    if (!shared.isNumber(arg1)) {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    const value = arg1;
    if (shared.isString(arg2)) {
        options.key = arg2;
    }
    else if (shared.isPlainObject(arg2)) {
        Object.keys(arg2).forEach(key => {
            if (NUMBER_FORMAT_OPTIONS_KEYS.includes(key)) {
                overrides[key] = arg2[key];
            }
            else {
                options[key] = arg2[key];
            }
        });
    }
    if (shared.isString(arg3)) {
        options.locale = arg3;
    }
    else if (shared.isPlainObject(arg3)) {
        overrides = arg3;
    }
    if (shared.isPlainObject(arg4)) {
        overrides = arg4;
    }
    return [options.key || '', value, options, overrides];
}
/** @internal */
function clearNumberFormat(ctx, locale, format) {
    const context = ctx;
    for (const key in format) {
        const id = `${locale}__${key}`;
        if (!context.__numberFormatters.has(id)) {
            continue;
        }
        context.__numberFormatters.delete(id);
    }
}

const DEFAULT_MODIFIER = (str) => str;
const DEFAULT_MESSAGE = (ctx) => ''; // eslint-disable-line
const DEFAULT_MESSAGE_DATA_TYPE = 'text';
const DEFAULT_NORMALIZE = (values) => values.length === 0 ? '' : shared.join(values);
const DEFAULT_INTERPOLATE = shared.toDisplayString;
function pluralDefault(choice, choicesLength) {
    choice = Math.abs(choice);
    if (choicesLength === 2) {
        // prettier-ignore
        return choice
            ? choice > 1
                ? 1
                : 0
            : 1;
    }
    return choice ? Math.min(choice, 2) : 0;
}
function getPluralIndex(options) {
    // prettier-ignore
    const index = shared.isNumber(options.pluralIndex)
        ? options.pluralIndex
        : -1;
    // prettier-ignore
    return options.named && (shared.isNumber(options.named.count) || shared.isNumber(options.named.n))
        ? shared.isNumber(options.named.count)
            ? options.named.count
            : shared.isNumber(options.named.n)
                ? options.named.n
                : index
        : index;
}
function normalizeNamed(pluralIndex, props) {
    if (!props.count) {
        props.count = pluralIndex;
    }
    if (!props.n) {
        props.n = pluralIndex;
    }
}
function createMessageContext(options = {}) {
    const locale = options.locale;
    const pluralIndex = getPluralIndex(options);
    const pluralRule = shared.isObject(options.pluralRules) &&
        shared.isString(locale) &&
        shared.isFunction(options.pluralRules[locale])
        ? options.pluralRules[locale]
        : pluralDefault;
    const orgPluralRule = shared.isObject(options.pluralRules) &&
        shared.isString(locale) &&
        shared.isFunction(options.pluralRules[locale])
        ? pluralDefault
        : undefined;
    const plural = (messages) => {
        return messages[pluralRule(pluralIndex, messages.length, orgPluralRule)];
    };
    const _list = options.list || [];
    const list = (index) => _list[index];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _named = options.named || shared.create();
    shared.isNumber(options.pluralIndex) && normalizeNamed(pluralIndex, _named);
    const named = (key) => _named[key];
    function message(key, useLinked) {
        // prettier-ignore
        const msg = shared.isFunction(options.messages)
            ? options.messages(key, !!useLinked)
            : shared.isObject(options.messages)
                ? options.messages[key]
                : false;
        return !msg
            ? options.parent
                ? options.parent.message(key) // resolve from parent messages
                : DEFAULT_MESSAGE
            : msg;
    }
    const _modifier = (name) => options.modifiers
        ? options.modifiers[name]
        : DEFAULT_MODIFIER;
    const normalize = shared.isPlainObject(options.processor) && shared.isFunction(options.processor.normalize)
        ? options.processor.normalize
        : DEFAULT_NORMALIZE;
    const interpolate = shared.isPlainObject(options.processor) &&
        shared.isFunction(options.processor.interpolate)
        ? options.processor.interpolate
        : DEFAULT_INTERPOLATE;
    const type = shared.isPlainObject(options.processor) && shared.isString(options.processor.type)
        ? options.processor.type
        : DEFAULT_MESSAGE_DATA_TYPE;
    const linked = (key, ...args) => {
        const [arg1, arg2] = args;
        let type = 'text';
        let modifier = '';
        if (args.length === 1) {
            if (shared.isObject(arg1)) {
                modifier = arg1.modifier || modifier;
                type = arg1.type || type;
            }
            else if (shared.isString(arg1)) {
                modifier = arg1 || modifier;
            }
        }
        else if (args.length === 2) {
            if (shared.isString(arg1)) {
                modifier = arg1 || modifier;
            }
            if (shared.isString(arg2)) {
                type = arg2 || type;
            }
        }
        const ret = message(key, true)(ctx);
        const msg = 
        // The message in vnode resolved with linked are returned as an array by processor.nomalize
        type === 'vnode' && shared.isArray(ret) && modifier
            ? ret[0]
            : ret;
        return modifier ? _modifier(modifier)(msg, type) : msg;
    };
    const ctx = {
        ["list" /* HelperNameMap.LIST */]: list,
        ["named" /* HelperNameMap.NAMED */]: named,
        ["plural" /* HelperNameMap.PLURAL */]: plural,
        ["linked" /* HelperNameMap.LINKED */]: linked,
        ["message" /* HelperNameMap.MESSAGE */]: message,
        ["type" /* HelperNameMap.TYPE */]: type,
        ["interpolate" /* HelperNameMap.INTERPOLATE */]: interpolate,
        ["normalize" /* HelperNameMap.NORMALIZE */]: normalize,
        ["values" /* HelperNameMap.VALUES */]: shared.assign(shared.create(), _list, _named)
    };
    return ctx;
}

const NOOP_MESSAGE_FUNCTION = () => '';
const isMessageFunction = (val) => shared.isFunction(val);
// implementation of `translate` function
function translate(context, ...args) {
    const { fallbackFormat, postTranslation, unresolving, messageCompiler, fallbackLocale, messages } = context;
    const [key, options] = parseTranslateArgs(...args);
    const missingWarn = shared.isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = shared.isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const escapeParameter = shared.isBoolean(options.escapeParameter)
        ? options.escapeParameter
        : context.escapeParameter;
    const resolvedMessage = !!options.resolvedMessage;
    // prettier-ignore
    const defaultMsgOrKey = shared.isString(options.default) || shared.isBoolean(options.default) // default by function option
        ? !shared.isBoolean(options.default)
            ? options.default
            : (!messageCompiler ? () => key : key)
        : fallbackFormat // default by `fallbackFormat` option
            ? (!messageCompiler ? () => key : key)
            : null;
    const enableDefaultMsg = fallbackFormat ||
        (defaultMsgOrKey != null &&
            (shared.isString(defaultMsgOrKey) || shared.isFunction(defaultMsgOrKey)));
    const locale = getLocale(context, options);
    // escape params
    escapeParameter && escapeParams(options);
    // resolve message format
    // eslint-disable-next-line prefer-const
    let [formatScope, targetLocale, message] = !resolvedMessage
        ? resolveMessageFormat(context, key, locale, fallbackLocale, fallbackWarn, missingWarn)
        : [
            key,
            locale,
            messages[locale] || shared.create()
        ];
    // NOTE:
    //  Fix to work around `ssrTransfrom` bug in Vite.
    //  https://github.com/vitejs/vite/issues/4306
    //  To get around this, use temporary variables.
    //  https://github.com/nuxt/framework/issues/1461#issuecomment-954606243
    let format = formatScope;
    // if you use default message, set it as message format!
    let cacheBaseKey = key;
    if (!resolvedMessage &&
        !(shared.isString(format) ||
            isMessageAST(format) ||
            isMessageFunction(format))) {
        if (enableDefaultMsg) {
            format = defaultMsgOrKey;
            cacheBaseKey = format;
        }
    }
    // checking message format and target locale
    if (!resolvedMessage &&
        (!(shared.isString(format) ||
            isMessageAST(format) ||
            isMessageFunction(format)) ||
            !shared.isString(targetLocale))) {
        return unresolving ? NOT_REOSLVED : key;
    }
    // TODO: refactor
    if (shared.isString(format) && context.messageCompiler == null) {
        shared.warn(`The message format compilation is not supported in this build. ` +
            `Because message compiler isn't included. ` +
            `You need to pre-compilation all message format. ` +
            `So translate function return '${key}'.`);
        return key;
    }
    // setup compile error detecting
    let occurred = false;
    const onError = () => {
        occurred = true;
    };
    // compile message format
    const msg = !isMessageFunction(format)
        ? compileMessageFormat(context, key, targetLocale, format, cacheBaseKey, onError)
        : format;
    // if occurred compile error, return the message format
    if (occurred) {
        return format;
    }
    // evaluate message with context
    const ctxOptions = getMessageContextOptions(context, targetLocale, message, options);
    const msgContext = createMessageContext(ctxOptions);
    const messaged = evaluateMessage(context, msg, msgContext);
    // if use post translation option, proceed it with handler
    let ret = postTranslation
        ? postTranslation(messaged, key)
        : messaged;
    // apply HTML sanitization for security
    if (escapeParameter && shared.isString(ret)) {
        ret = shared.sanitizeTranslatedHtml(ret);
    }
    // NOTE: experimental !!
    {
        // prettier-ignore
        const payloads = {
            timestamp: Date.now(),
            key: shared.isString(key)
                ? key
                : isMessageFunction(format)
                    ? format.key
                    : '',
            locale: targetLocale || (isMessageFunction(format)
                ? format.locale
                : ''),
            format: shared.isString(format)
                ? format
                : isMessageFunction(format)
                    ? format.source
                    : '',
            message: ret
        };
        payloads.meta = shared.assign({}, context.__meta, getAdditionalMeta() || {});
        translateDevTools(payloads);
    }
    return ret;
}
function escapeParams(options) {
    if (shared.isArray(options.list)) {
        options.list = options.list.map(item => shared.isString(item) ? shared.escapeHtml(item) : item);
    }
    else if (shared.isObject(options.named)) {
        Object.keys(options.named).forEach(key => {
            if (shared.isString(options.named[key])) {
                options.named[key] = shared.escapeHtml(options.named[key]);
            }
        });
    }
}
function resolveMessageFormat(context, key, locale, fallbackLocale, fallbackWarn, missingWarn) {
    const { messages, onWarn, messageResolver: resolveValue, localeFallbacker } = context;
    const locales = localeFallbacker(context, fallbackLocale, locale); // eslint-disable-line @typescript-eslint/no-explicit-any
    let message = shared.create();
    let targetLocale;
    let format = null;
    let from = locale;
    let to = null;
    const type = 'translate';
    for (let i = 0; i < locales.length; i++) {
        targetLocale = to = locales[i];
        if (locale !== targetLocale &&
            !isAlmostSameLocale(locale, targetLocale) &&
            isTranslateFallbackWarn(fallbackWarn, key)) {
            onWarn(getWarnMessage(CoreWarnCodes.FALLBACK_TO_TRANSLATE, {
                key,
                target: targetLocale
            }));
        }
        // for vue-devtools timeline event
        if (locale !== targetLocale) {
            const emitter = context.__v_emitter;
            if (emitter) {
                emitter.emit('fallback', {
                    type,
                    key,
                    from,
                    to,
                    groupId: `${type}:${key}`
                });
            }
        }
        message =
            messages[targetLocale] || shared.create();
        // for vue-devtools timeline event
        let start = null;
        let startTag;
        let endTag;
        if (shared.inBrowser) {
            start = window.performance.now();
            startTag = 'intlify-message-resolve-start';
            endTag = 'intlify-message-resolve-end';
            shared.mark && shared.mark(startTag);
        }
        if ((format = resolveValue(message, key)) === null) {
            // if null, resolve with object key path
            format = message[key]; // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        // for vue-devtools timeline event
        if (shared.inBrowser) {
            const end = window.performance.now();
            const emitter = context.__v_emitter;
            if (emitter && start && format) {
                emitter.emit('message-resolve', {
                    type: 'message-resolve',
                    key,
                    message: format,
                    time: end - start,
                    groupId: `${type}:${key}`
                });
            }
            if (startTag && endTag && shared.mark && shared.measure) {
                shared.mark(endTag);
                shared.measure('intlify message resolve', startTag, endTag);
            }
        }
        if (shared.isString(format) || isMessageAST(format) || isMessageFunction(format)) {
            break;
        }
        if (!isImplicitFallback(targetLocale, locales)) {
            const missingRet = handleMissing(context, // eslint-disable-line @typescript-eslint/no-explicit-any
            key, targetLocale, missingWarn, type);
            if (missingRet !== key) {
                format = missingRet;
            }
        }
        from = to;
    }
    return [format, targetLocale, message];
}
function compileMessageFormat(context, key, targetLocale, format, cacheBaseKey, onError) {
    const { messageCompiler, warnHtmlMessage } = context;
    if (isMessageFunction(format)) {
        const msg = format;
        msg.locale = msg.locale || targetLocale;
        msg.key = msg.key || key;
        return msg;
    }
    if (messageCompiler == null) {
        const msg = (() => format);
        msg.locale = targetLocale;
        msg.key = key;
        return msg;
    }
    // for vue-devtools timeline event
    let start = null;
    let startTag;
    let endTag;
    if (shared.inBrowser) {
        start = window.performance.now();
        startTag = 'intlify-message-compilation-start';
        endTag = 'intlify-message-compilation-end';
        shared.mark && shared.mark(startTag);
    }
    const msg = messageCompiler(format, getCompileContext(context, targetLocale, cacheBaseKey, format, warnHtmlMessage, onError));
    // for vue-devtools timeline event
    if (shared.inBrowser) {
        const end = window.performance.now();
        const emitter = context.__v_emitter;
        if (emitter && start) {
            emitter.emit('message-compilation', {
                type: 'message-compilation',
                message: format,
                time: end - start,
                groupId: `${'translate'}:${key}`
            });
        }
        if (startTag && endTag && shared.mark && shared.measure) {
            shared.mark(endTag);
            shared.measure('intlify message compilation', startTag, endTag);
        }
    }
    msg.locale = targetLocale;
    msg.key = key;
    msg.source = format;
    return msg;
}
function evaluateMessage(context, msg, msgCtx) {
    // for vue-devtools timeline event
    let start = null;
    let startTag;
    let endTag;
    if (shared.inBrowser) {
        start = window.performance.now();
        startTag = 'intlify-message-evaluation-start';
        endTag = 'intlify-message-evaluation-end';
        shared.mark && shared.mark(startTag);
    }
    const messaged = msg(msgCtx);
    // for vue-devtools timeline event
    if (shared.inBrowser) {
        const end = window.performance.now();
        const emitter = context.__v_emitter;
        if (emitter && start) {
            emitter.emit('message-evaluation', {
                type: 'message-evaluation',
                value: messaged,
                time: end - start,
                groupId: `${'translate'}:${msg.key}`
            });
        }
        if (startTag && endTag && shared.mark && shared.measure) {
            shared.mark(endTag);
            shared.measure('intlify message evaluation', startTag, endTag);
        }
    }
    return messaged;
}
/** @internal */
function parseTranslateArgs(...args) {
    const [arg1, arg2, arg3] = args;
    const options = shared.create();
    if (!shared.isString(arg1) &&
        !shared.isNumber(arg1) &&
        !isMessageFunction(arg1) &&
        !isMessageAST(arg1)) {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    // prettier-ignore
    const key = shared.isNumber(arg1)
        ? String(arg1)
        : isMessageFunction(arg1)
            ? arg1
            : arg1;
    if (shared.isNumber(arg2)) {
        options.plural = arg2;
    }
    else if (shared.isString(arg2)) {
        options.default = arg2;
    }
    else if (shared.isPlainObject(arg2) && !shared.isEmptyObject(arg2)) {
        options.named = arg2;
    }
    else if (shared.isArray(arg2)) {
        options.list = arg2;
    }
    if (shared.isNumber(arg3)) {
        options.plural = arg3;
    }
    else if (shared.isString(arg3)) {
        options.default = arg3;
    }
    else if (shared.isPlainObject(arg3)) {
        shared.assign(options, arg3);
    }
    return [key, options];
}
function getCompileContext(context, locale, key, source, warnHtmlMessage, onError) {
    return {
        locale,
        key,
        warnHtmlMessage,
        onError: (err) => {
            onError && onError(err);
            {
                const _source = getSourceForCodeFrame(source);
                const message = `Message compilation error: ${err.message}`;
                const codeFrame = err.location &&
                    _source &&
                    shared.generateCodeFrame(_source, err.location.start.offset, err.location.end.offset);
                const emitter = context.__v_emitter;
                if (emitter && _source) {
                    emitter.emit('compile-error', {
                        message: _source,
                        error: err.message,
                        start: err.location && err.location.start.offset,
                        end: err.location && err.location.end.offset,
                        groupId: `${'translate'}:${key}`
                    });
                }
                console.error(codeFrame ? `${message}\n${codeFrame}` : message);
            }
        },
        onCacheKey: (source) => shared.generateFormatCacheKey(locale, key, source)
    };
}
function getSourceForCodeFrame(source) {
    if (shared.isString(source)) {
        return source;
    }
    else {
        if (source.loc && source.loc.source) {
            return source.loc.source;
        }
    }
}
function getMessageContextOptions(context, locale, message, options) {
    const { modifiers, pluralRules, messageResolver: resolveValue, fallbackLocale, fallbackWarn, missingWarn, fallbackContext } = context;
    const resolveMessage = (key, useLinked) => {
        let val = resolveValue(message, key);
        // fallback
        if (val == null && (fallbackContext || useLinked)) {
            const [, , message] = resolveMessageFormat(fallbackContext || context, // NOTE: if has fallbackContext, fallback to root, else if use linked, fallback to local context
            key, locale, fallbackLocale, fallbackWarn, missingWarn);
            val = resolveValue(message, key);
        }
        if (shared.isString(val) || isMessageAST(val)) {
            let occurred = false;
            const onError = () => {
                occurred = true;
            };
            const msg = compileMessageFormat(context, key, locale, val, key, onError);
            return !occurred
                ? msg
                : NOOP_MESSAGE_FUNCTION;
        }
        else if (isMessageFunction(val)) {
            return val;
        }
        else {
            // TODO: should be implemented warning message
            return NOOP_MESSAGE_FUNCTION;
        }
    };
    const ctxOptions = {
        locale,
        modifiers,
        pluralRules,
        messages: resolveMessage
    };
    if (context.processor) {
        ctxOptions.processor = context.processor;
    }
    if (options.list) {
        ctxOptions.list = options.list;
    }
    if (options.named) {
        ctxOptions.named = options.named;
    }
    if (shared.isNumber(options.plural)) {
        ctxOptions.pluralIndex = options.plural;
    }
    return ctxOptions;
}

exports.CompileErrorCodes = messageCompiler.CompileErrorCodes;
exports.createCompileError = messageCompiler.createCompileError;
exports.AST_NODE_PROPS_KEYS = AST_NODE_PROPS_KEYS;
exports.CORE_ERROR_CODES_EXTEND_POINT = CORE_ERROR_CODES_EXTEND_POINT;
exports.CORE_WARN_CODES_EXTEND_POINT = CORE_WARN_CODES_EXTEND_POINT;
exports.CoreErrorCodes = CoreErrorCodes;
exports.CoreWarnCodes = CoreWarnCodes;
exports.DATETIME_FORMAT_OPTIONS_KEYS = DATETIME_FORMAT_OPTIONS_KEYS;
exports.DEFAULT_LOCALE = DEFAULT_LOCALE;
exports.DEFAULT_MESSAGE_DATA_TYPE = DEFAULT_MESSAGE_DATA_TYPE;
exports.MISSING_RESOLVE_VALUE = MISSING_RESOLVE_VALUE;
exports.NOT_REOSLVED = NOT_REOSLVED;
exports.NUMBER_FORMAT_OPTIONS_KEYS = NUMBER_FORMAT_OPTIONS_KEYS;
exports.VERSION = VERSION;
exports.clearCompileCache = clearCompileCache;
exports.clearDateTimeFormat = clearDateTimeFormat;
exports.clearNumberFormat = clearNumberFormat;
exports.compile = compile;
exports.createCoreContext = createCoreContext;
exports.createCoreError = createCoreError;
exports.createMessageContext = createMessageContext;
exports.datetime = datetime;
exports.fallbackWithLocaleChain = fallbackWithLocaleChain;
exports.fallbackWithSimple = fallbackWithSimple;
exports.getAdditionalMeta = getAdditionalMeta;
exports.getDevToolsHook = getDevToolsHook;
exports.getFallbackContext = getFallbackContext;
exports.getLocale = getLocale;
exports.getWarnMessage = getWarnMessage;
exports.handleMissing = handleMissing;
exports.initI18nDevTools = initI18nDevTools;
exports.isAlmostSameLocale = isAlmostSameLocale;
exports.isImplicitFallback = isImplicitFallback;
exports.isMessageAST = isMessageAST;
exports.isMessageFunction = isMessageFunction;
exports.isTranslateFallbackWarn = isTranslateFallbackWarn;
exports.isTranslateMissingWarn = isTranslateMissingWarn;
exports.number = number;
exports.parse = parse;
exports.parseDateTimeArgs = parseDateTimeArgs;
exports.parseNumberArgs = parseNumberArgs;
exports.parseTranslateArgs = parseTranslateArgs;
exports.registerLocaleFallbacker = registerLocaleFallbacker;
exports.registerMessageCompiler = registerMessageCompiler;
exports.registerMessageResolver = registerMessageResolver;
exports.resolveLocale = resolveLocale;
exports.resolveValue = resolveValue;
exports.resolveWithKeyValue = resolveWithKeyValue;
exports.setAdditionalMeta = setAdditionalMeta;
exports.setDevToolsHook = setDevToolsHook;
exports.setFallbackContext = setFallbackContext;
exports.translate = translate;
exports.translateDevTools = translateDevTools;
exports.updateFallbackLocale = updateFallbackLocale;
