/*!
  * vue-i18n v11.1.10
  * (c) 2025 kazuya kawaguchi
  * Released under the MIT License.
  */
import { createVNode, Text, computed, watch, getCurrentInstance, ref, shallowRef, Fragment, defineComponent, h, effectScope, inject, onMounted, onUnmounted, isRef } from 'vue';

function warn(msg, err) {
    if (typeof console !== 'undefined') {
        console.warn(`[intlify] ` + msg);
        /* istanbul ignore if */
        if (err) {
            console.warn(err.stack);
        }
    }
}
const hasWarned = {};
function warnOnce(msg) {
    if (!hasWarned[msg]) {
        hasWarned[msg] = true;
        warn(msg);
    }
}

/**
 * Original Utilities
 * written by kazuya kawaguchi
 */
const inBrowser = typeof window !== 'undefined';
let mark;
let measure;
{
    const perf = inBrowser && window.performance;
    if (perf &&
        perf.mark &&
        perf.measure &&
        perf.clearMarks &&
        // @ts-ignore browser compat
        perf.clearMeasures) {
        mark = (tag) => {
            perf.mark(tag);
        };
        measure = (name, startTag, endTag) => {
            perf.measure(name, startTag, endTag);
            perf.clearMarks(startTag);
            perf.clearMarks(endTag);
        };
    }
}
const RE_ARGS = /\{([0-9a-zA-Z]+)\}/g;
/* eslint-disable */
function format$1(message, ...args) {
    if (args.length === 1 && isObject(args[0])) {
        args = args[0];
    }
    if (!args || !args.hasOwnProperty) {
        args = {};
    }
    return message.replace(RE_ARGS, (match, identifier) => {
        return args.hasOwnProperty(identifier) ? args[identifier] : '';
    });
}
const makeSymbol = (name, shareable = false) => !shareable ? Symbol(name) : Symbol.for(name);
const generateFormatCacheKey = (locale, key, source) => friendlyJSONstringify({ l: locale, k: key, s: source });
const friendlyJSONstringify = (json) => JSON.stringify(json)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/\u0027/g, '\\u0027');
const isNumber = (val) => typeof val === 'number' && isFinite(val);
const isDate = (val) => toTypeString(val) === '[object Date]';
const isRegExp = (val) => toTypeString(val) === '[object RegExp]';
const isEmptyObject = (val) => isPlainObject(val) && Object.keys(val).length === 0;
const assign = Object.assign;
const _create = Object.create;
const create = (obj = null) => _create(obj);
let _globalThis;
const getGlobalThis = () => {
    // prettier-ignore
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
                            : create()));
};
function escapeHtml(rawText) {
    return rawText
        .replace(/&/g, '&amp;') // escape `&` first to avoid double escaping
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\//g, '&#x2F;') // escape `/` to prevent closing tags or JavaScript URLs
        .replace(/=/g, '&#x3D;'); // escape `=` to prevent attribute injection
}
function escapeAttributeValue(value) {
    return value
        .replace(/&(?![a-zA-Z0-9#]{2,6};)/g, '&amp;') // escape unescaped `&`
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function sanitizeTranslatedHtml(html) {
    // Escape dangerous characters in attribute values
    // Process attributes with double quotes
    html = html.replace(/(\w+)\s*=\s*"([^"]*)"/g, (_, attrName, attrValue) => `${attrName}="${escapeAttributeValue(attrValue)}"`);
    // Process attributes with single quotes
    html = html.replace(/(\w+)\s*=\s*'([^']*)'/g, (_, attrName, attrValue) => `${attrName}='${escapeAttributeValue(attrValue)}'`);
    // Detect and neutralize event handler attributes
    const eventHandlerPattern = /\s*on\w+\s*=\s*["']?[^"'>]+["']?/gi;
    if (eventHandlerPattern.test(html)) {
        {
            warn('Potentially dangerous event handlers detected in translation. ' +
                'Consider removing onclick, onerror, etc. from your translation messages.');
        }
        // Neutralize event handler attributes by escaping 'on'
        html = html.replace(/(\s+)(on)(\w+\s*=)/gi, '$1&#111;n$3');
    }
    // Disable javascript: URLs in various contexts
    const javascriptUrlPattern = [
        // In href, src, action, formaction attributes
        /(\s+(?:href|src|action|formaction)\s*=\s*["']?)\s*javascript:/gi,
        // In style attributes within url()
        /(style\s*=\s*["'][^"']*url\s*\(\s*)javascript:/gi
    ];
    javascriptUrlPattern.forEach(pattern => {
        html = html.replace(pattern, '$1javascript&#58;');
    });
    return html;
}
const hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key);
}
/* eslint-enable */
/**
 * Useful Utilities By Evan you
 * Modified by kazuya kawaguchi
 * MIT License
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/index.ts
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/codeframe.ts
 */
const isArray = Array.isArray;
const isFunction = (val) => typeof val === 'function';
const isString = (val) => typeof val === 'string';
const isBoolean = (val) => typeof val === 'boolean';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isObject = (val) => val !== null && typeof val === 'object';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPromise = (val) => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const isPlainObject = (val) => toTypeString(val) === '[object Object]';
// for converting list and named values to displayed strings.
const toDisplayString = (val) => {
    return val == null
        ? ''
        : isArray(val) || (isPlainObject(val) && val.toString === objectToString)
            ? JSON.stringify(val, null, 2)
            : String(val);
};
function join(items, separator = '') {
    return items.reduce((str, item, index) => (index === 0 ? str + item : str + separator + item), '');
}
const RANGE = 2;
function generateCodeFrame(source, start = 0, end = source.length) {
    const lines = source.split(/\r?\n/);
    let count = 0;
    const res = [];
    for (let i = 0; i < lines.length; i++) {
        count += lines[i].length + 1;
        if (count >= start) {
            for (let j = i - RANGE; j <= i + RANGE || end > count; j++) {
                if (j < 0 || j >= lines.length)
                    continue;
                const line = j + 1;
                res.push(`${line}${' '.repeat(3 - String(line).length)}|  ${lines[j]}`);
                const lineLength = lines[j].length;
                if (j === i) {
                    // push underline
                    const pad = start - (count - lineLength) + 1;
                    const length = Math.max(1, end > count ? lineLength - pad : end - start);
                    res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length));
                }
                else if (j > i) {
                    if (end > count) {
                        const length = Math.max(Math.min(end - count, lineLength), 1);
                        res.push(`   |  ` + '^'.repeat(length));
                    }
                    count += lineLength + 1;
                }
            }
            break;
        }
    }
    return res.join('\n');
}

/**
 * Event emitter, forked from the below:
 * - original repository url: https://github.com/developit/mitt
 * - code url: https://github.com/developit/mitt/blob/master/src/index.ts
 * - author: Jason Miller (https://github.com/developit)
 * - license: MIT
 */
/**
 * Create a event emitter
 *
 * @returns An event emitter
 */
function createEmitter() {
    const events = new Map();
    const emitter = {
        events,
        on(event, handler) {
            const handlers = events.get(event);
            const added = handlers && handlers.push(handler);
            if (!added) {
                events.set(event, [handler]);
            }
        },
        off(event, handler) {
            const handlers = events.get(event);
            if (handlers) {
                handlers.splice(handlers.indexOf(handler) >>> 0, 1);
            }
        },
        emit(event, payload) {
            (events.get(event) || [])
                .slice()
                .map(handler => handler(payload));
            (events.get('*') || [])
                .slice()
                .map(handler => handler(event, payload));
        }
    };
    return emitter;
}

const isNotObjectOrIsArray = (val) => !isObject(val) || isArray(val);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepCopy(src, des) {
    // src and des should both be objects, and none of them can be a array
    if (isNotObjectOrIsArray(src) || isNotObjectOrIsArray(des)) {
        throw new Error('Invalid value');
    }
    const stack = [{ src, des }];
    while (stack.length) {
        const { src, des } = stack.pop();
        // using `Object.keys` which skips prototype properties
        Object.keys(src).forEach(key => {
            if (key === '__proto__') {
                return;
            }
            // if src[key] is an object/array, set des[key]
            // to empty object/array to prevent setting by reference
            if (isObject(src[key]) && !isObject(des[key])) {
                des[key] = Array.isArray(src[key]) ? [] : create();
            }
            if (isNotObjectOrIsArray(des[key]) || isNotObjectOrIsArray(src[key])) {
                // replace with src[key] when:
                // src[key] or des[key] is not an object, or
                // src[key] or des[key] is an array
                des[key] = src[key];
            }
            else {
                // src[key] and des[key] are both objects, merge them
                stack.push({ src: src[key], des: des[key] });
            }
        });
    }
}

const CompileErrorCodes = {
    // tokenizer error codes
    EXPECTED_TOKEN: 1,
    INVALID_TOKEN_IN_PLACEHOLDER: 2,
    UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3,
    UNKNOWN_ESCAPE_SEQUENCE: 4,
    INVALID_UNICODE_ESCAPE_SEQUENCE: 5,
    UNBALANCED_CLOSING_BRACE: 6,
    UNTERMINATED_CLOSING_BRACE: 7,
    EMPTY_PLACEHOLDER: 8,
    NOT_ALLOW_NEST_PLACEHOLDER: 9,
    INVALID_LINKED_FORMAT: 10,
    // parser error codes
    MUST_HAVE_MESSAGES_IN_PLURAL: 11,
    UNEXPECTED_EMPTY_LINKED_MODIFIER: 12,
    UNEXPECTED_EMPTY_LINKED_KEY: 13,
    UNEXPECTED_LEXICAL_ANALYSIS: 14,
    // generator error codes
    UNHANDLED_CODEGEN_NODE_TYPE: 15,
    // minifier error codes
    UNHANDLED_MINIFIER_NODE_TYPE: 16
};
// Special value for higher-order compilers to pick up the last code
// to avoid collision of error codes.
// This should always be kept as the last item.
const COMPILE_ERROR_CODES_EXTEND_POINT = 17;
/** @internal */
const errorMessages$2 = {
    // tokenizer error messages
    [CompileErrorCodes.EXPECTED_TOKEN]: `Expected token: '{0}'`,
    [CompileErrorCodes.INVALID_TOKEN_IN_PLACEHOLDER]: `Invalid token in placeholder: '{0}'`,
    [CompileErrorCodes.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER]: `Unterminated single quote in placeholder`,
    [CompileErrorCodes.UNKNOWN_ESCAPE_SEQUENCE]: `Unknown escape sequence: \\{0}`,
    [CompileErrorCodes.INVALID_UNICODE_ESCAPE_SEQUENCE]: `Invalid unicode escape sequence: {0}`,
    [CompileErrorCodes.UNBALANCED_CLOSING_BRACE]: `Unbalanced closing brace`,
    [CompileErrorCodes.UNTERMINATED_CLOSING_BRACE]: `Unterminated closing brace`,
    [CompileErrorCodes.EMPTY_PLACEHOLDER]: `Empty placeholder`,
    [CompileErrorCodes.NOT_ALLOW_NEST_PLACEHOLDER]: `Not allowed nest placeholder`,
    [CompileErrorCodes.INVALID_LINKED_FORMAT]: `Invalid linked format`,
    // parser error messages
    [CompileErrorCodes.MUST_HAVE_MESSAGES_IN_PLURAL]: `Plural must have messages`,
    [CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_MODIFIER]: `Unexpected empty linked modifier`,
    [CompileErrorCodes.UNEXPECTED_EMPTY_LINKED_KEY]: `Unexpected empty linked key`,
    [CompileErrorCodes.UNEXPECTED_LEXICAL_ANALYSIS]: `Unexpected lexical analysis in token: '{0}'`,
    // generator error messages
    [CompileErrorCodes.UNHANDLED_CODEGEN_NODE_TYPE]: `unhandled codegen node type: '{0}'`,
    // minimizer error messages
    [CompileErrorCodes.UNHANDLED_MINIFIER_NODE_TYPE]: `unhandled mimifier node type: '{0}'`
};
function createCompileError(code, loc, options = {}) {
    const { domain, messages, args } = options;
    const msg = format$1((messages || errorMessages$2)[code] || '', ...(args || []))
        ;
    const error = new SyntaxError(String(msg));
    error.code = code;
    error.domain = domain;
    return error;
}

function isMessageAST(val) {
    return (isObject(val) &&
        resolveType(val) === 0 &&
        (hasOwn(val, 'b') || hasOwn(val, 'body')));
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
        if (hasOwn(node, prop) && node[prop] != null) {
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
            if (hasOwn(named, 'k') && named.k) {
                return ctx.interpolate(ctx.named(named.k));
            }
            if (hasOwn(named, 'key') && named.key) {
                return ctx.interpolate(ctx.named(named.key));
            }
            throw createUnhandleNodeError(type);
        }
        case 5 /* NodeTypes.List */: {
            const list = node;
            if (hasOwn(list, 'i') && isNumber(list.i)) {
                return ctx.interpolate(ctx.list(list.i));
            }
            if (hasOwn(list, 'index') && isNumber(list.index)) {
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

let compileCache = create();
/* #__NO_SIDE_EFFECTS__ */
function compile(message, context) {
    {
        if (!isMessageAST(message)) {
            warn(`the message that is resolve with key '${context.key}' is not supported for jit compilation`);
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
    INVALID_ARGUMENT: COMPILE_ERROR_CODES_EXTEND_POINT, // 17
    INVALID_DATE_ARGUMENT: 18,
    INVALID_ISO_DATE_ARGUMENT: 19,
    NOT_SUPPORT_NON_STRING_MESSAGE: 20,
    NOT_SUPPORT_LOCALE_PROMISE_VALUE: 21,
    NOT_SUPPORT_LOCALE_ASYNC_FUNCTION: 22,
    NOT_SUPPORT_LOCALE_TYPE: 23
};
const CORE_ERROR_CODES_EXTEND_POINT = 24;
function createCoreError(code) {
    return createCompileError(code, null, { messages: errorMessages$1 } );
}
/** @internal */
const errorMessages$1 = {
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
    if (isString(locale)) {
        return locale;
    }
    else {
        if (isFunction(locale)) {
            if (locale.resolvedOnce && _resolveLocale != null) {
                return _resolveLocale;
            }
            else if (locale.constructor.name === 'Function') {
                const resolve = locale();
                if (isPromise(resolve)) {
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
            ...(isArray(fallback)
                ? fallback
                : isObject(fallback)
                    ? Object.keys(fallback)
                    : isString(fallback)
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
    const startLocale = isString(start) ? start : DEFAULT_LOCALE;
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
        while (isArray(block)) {
            block = appendBlockToChain(chain, block, fallback);
        }
        // prettier-ignore
        // last block defined by default
        const defaults = isArray(fallback) || !isPlainObject(fallback)
            ? fallback
            : fallback['default']
                ? fallback['default']
                : null;
        // convert defaults to array
        block = isString(defaults) ? [defaults] : defaults;
        if (isArray(block)) {
            appendBlockToChain(chain, block, false);
        }
        context.__localeChainCache.set(startLocale, chain);
    }
    return chain;
}
function appendBlockToChain(chain, block, blocks) {
    let follow = true;
    for (let i = 0; i < block.length && isBoolean(follow); i++) {
        const locale = block[i];
        if (isString(locale)) {
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
            if ((isArray(blocks) || isPlainObject(blocks)) &&
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
    return isObject(obj) ? obj[path] : null;
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
    if (!isObject(obj)) {
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
        if (isFunction(last)) {
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
const warnMessages$1 = {
    [CoreWarnCodes.NOT_FOUND_KEY]: `Not found '{key}' key in '{locale}' locale messages.`,
    [CoreWarnCodes.FALLBACK_TO_TRANSLATE]: `Fall back to translate '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.CANNOT_FORMAT_NUMBER]: `Cannot format a number value due to not supported Intl.NumberFormat.`,
    [CoreWarnCodes.FALLBACK_TO_NUMBER_FORMAT]: `Fall back to number format '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.CANNOT_FORMAT_DATE]: `Cannot format a date value due to not supported Intl.DateTimeFormat.`,
    [CoreWarnCodes.FALLBACK_TO_DATE_FORMAT]: `Fall back to datetime format '{key}' key with '{target}' locale.`,
    [CoreWarnCodes.EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER]: `This project is using Custom Message Compiler, which is an experimental feature. It may receive breaking changes or be removed in the future.`
};
function getWarnMessage$1(code, ...args) {
    return format$1(warnMessages$1[code], ...args);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Intlify core-base version
 * @internal
 */
const VERSION$1 = '11.1.10';
const NOT_REOSLVED = -1;
const DEFAULT_LOCALE = 'en-US';
const MISSING_RESOLVE_VALUE = '';
const capitalize = (str) => `${str.charAt(0).toLocaleUpperCase()}${str.substr(1)}`;
function getDefaultLinkedModifiers() {
    return {
        upper: (val, type) => {
            // prettier-ignore
            return type === 'text' && isString(val)
                ? val.toUpperCase()
                : type === 'vnode' && isObject(val) && '__v_isVNode' in val
                    ? val.children.toUpperCase()
                    : val;
        },
        lower: (val, type) => {
            // prettier-ignore
            return type === 'text' && isString(val)
                ? val.toLowerCase()
                : type === 'vnode' && isObject(val) && '__v_isVNode' in val
                    ? val.children.toLowerCase()
                    : val;
        },
        capitalize: (val, type) => {
            // prettier-ignore
            return (type === 'text' && isString(val)
                ? capitalize(val)
                : type === 'vnode' && isObject(val) && '__v_isVNode' in val
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
    const onWarn = isFunction(options.onWarn) ? options.onWarn : warn;
    const version = isString(options.version) ? options.version : VERSION$1;
    const locale = isString(options.locale) || isFunction(options.locale)
        ? options.locale
        : DEFAULT_LOCALE;
    const _locale = isFunction(locale) ? DEFAULT_LOCALE : locale;
    const fallbackLocale = isArray(options.fallbackLocale) ||
        isPlainObject(options.fallbackLocale) ||
        isString(options.fallbackLocale) ||
        options.fallbackLocale === false
        ? options.fallbackLocale
        : _locale;
    const messages = isPlainObject(options.messages)
        ? options.messages
        : createResources(_locale);
    const datetimeFormats = isPlainObject(options.datetimeFormats)
            ? options.datetimeFormats
            : createResources(_locale)
        ;
    const numberFormats = isPlainObject(options.numberFormats)
            ? options.numberFormats
            : createResources(_locale)
        ;
    const modifiers = assign(create(), options.modifiers, getDefaultLinkedModifiers());
    const pluralRules = options.pluralRules || create();
    const missing = isFunction(options.missing) ? options.missing : null;
    const missingWarn = isBoolean(options.missingWarn) || isRegExp(options.missingWarn)
        ? options.missingWarn
        : true;
    const fallbackWarn = isBoolean(options.fallbackWarn) || isRegExp(options.fallbackWarn)
        ? options.fallbackWarn
        : true;
    const fallbackFormat = !!options.fallbackFormat;
    const unresolving = !!options.unresolving;
    const postTranslation = isFunction(options.postTranslation)
        ? options.postTranslation
        : null;
    const processor = isPlainObject(options.processor) ? options.processor : null;
    const warnHtmlMessage = isBoolean(options.warnHtmlMessage)
        ? options.warnHtmlMessage
        : true;
    const escapeParameter = !!options.escapeParameter;
    const messageCompiler = isFunction(options.messageCompiler)
        ? options.messageCompiler
        : _compiler;
    if (isFunction(options.messageCompiler)) {
        warnOnce(getWarnMessage$1(CoreWarnCodes.EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER));
    }
    const messageResolver = isFunction(options.messageResolver)
        ? options.messageResolver
        : _resolver || resolveWithKeyValue;
    const localeFallbacker = isFunction(options.localeFallbacker)
        ? options.localeFallbacker
        : _fallbacker || fallbackWithSimple;
    const fallbackContext = isObject(options.fallbackContext)
        ? options.fallbackContext
        : undefined;
    // setup internal options
    const internalOptions = options;
    const __datetimeFormatters = isObject(internalOptions.__datetimeFormatters)
            ? internalOptions.__datetimeFormatters
            : new Map()
        ;
    const __numberFormatters = isObject(internalOptions.__numberFormatters)
            ? internalOptions.__numberFormatters
            : new Map()
        ;
    const __meta = isObject(internalOptions.__meta) ? internalOptions.__meta : {};
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
const createResources = (locale) => ({ [locale]: create() });
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
        return isString(ret) ? ret : key;
    }
    else {
        if (isTranslateMissingWarn(missingWarn, key)) {
            onWarn(getWarnMessage$1(CoreWarnCodes.NOT_FOUND_KEY, { key, locale }));
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
        onWarn(getWarnMessage$1(CoreWarnCodes.CANNOT_FORMAT_DATE));
        return MISSING_RESOLVE_VALUE;
    }
    const [key, value, options, overrides] = parseDateTimeArgs(...args);
    const missingWarn = isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const part = !!options.part;
    const locale = getLocale(context, options);
    const locales = localeFallbacker(context, // eslint-disable-line @typescript-eslint/no-explicit-any
    fallbackLocale, locale);
    if (!isString(key) || key === '') {
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
            onWarn(getWarnMessage$1(CoreWarnCodes.FALLBACK_TO_DATE_FORMAT, {
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
        if (isPlainObject(format))
            break;
        handleMissing(context, key, targetLocale, missingWarn, type); // eslint-disable-line @typescript-eslint/no-explicit-any
        from = to;
    }
    // checking format and target locale
    if (!isPlainObject(format) || !isString(targetLocale)) {
        return unresolving ? NOT_REOSLVED : key;
    }
    let id = `${targetLocale}__${key}`;
    if (!isEmptyObject(overrides)) {
        id = `${id}__${JSON.stringify(overrides)}`;
    }
    let formatter = __datetimeFormatters.get(id);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(targetLocale, assign({}, format, overrides));
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
    const options = create();
    let overrides = create();
    let value;
    if (isString(arg1)) {
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
    else if (isDate(arg1)) {
        if (isNaN(arg1.getTime())) {
            throw createCoreError(CoreErrorCodes.INVALID_DATE_ARGUMENT);
        }
        value = arg1;
    }
    else if (isNumber(arg1)) {
        value = arg1;
    }
    else {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    if (isString(arg2)) {
        options.key = arg2;
    }
    else if (isPlainObject(arg2)) {
        Object.keys(arg2).forEach(key => {
            if (DATETIME_FORMAT_OPTIONS_KEYS.includes(key)) {
                overrides[key] = arg2[key];
            }
            else {
                options[key] = arg2[key];
            }
        });
    }
    if (isString(arg3)) {
        options.locale = arg3;
    }
    else if (isPlainObject(arg3)) {
        overrides = arg3;
    }
    if (isPlainObject(arg4)) {
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
        onWarn(getWarnMessage$1(CoreWarnCodes.CANNOT_FORMAT_NUMBER));
        return MISSING_RESOLVE_VALUE;
    }
    const [key, value, options, overrides] = parseNumberArgs(...args);
    const missingWarn = isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const part = !!options.part;
    const locale = getLocale(context, options);
    const locales = localeFallbacker(context, // eslint-disable-line @typescript-eslint/no-explicit-any
    fallbackLocale, locale);
    if (!isString(key) || key === '') {
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
            onWarn(getWarnMessage$1(CoreWarnCodes.FALLBACK_TO_NUMBER_FORMAT, {
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
        if (isPlainObject(format))
            break;
        handleMissing(context, key, targetLocale, missingWarn, type); // eslint-disable-line @typescript-eslint/no-explicit-any
        from = to;
    }
    // checking format and target locale
    if (!isPlainObject(format) || !isString(targetLocale)) {
        return unresolving ? NOT_REOSLVED : key;
    }
    let id = `${targetLocale}__${key}`;
    if (!isEmptyObject(overrides)) {
        id = `${id}__${JSON.stringify(overrides)}`;
    }
    let formatter = __numberFormatters.get(id);
    if (!formatter) {
        formatter = new Intl.NumberFormat(targetLocale, assign({}, format, overrides));
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
    const options = create();
    let overrides = create();
    if (!isNumber(arg1)) {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    const value = arg1;
    if (isString(arg2)) {
        options.key = arg2;
    }
    else if (isPlainObject(arg2)) {
        Object.keys(arg2).forEach(key => {
            if (NUMBER_FORMAT_OPTIONS_KEYS.includes(key)) {
                overrides[key] = arg2[key];
            }
            else {
                options[key] = arg2[key];
            }
        });
    }
    if (isString(arg3)) {
        options.locale = arg3;
    }
    else if (isPlainObject(arg3)) {
        overrides = arg3;
    }
    if (isPlainObject(arg4)) {
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
const DEFAULT_NORMALIZE = (values) => values.length === 0 ? '' : join(values);
const DEFAULT_INTERPOLATE = toDisplayString;
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
    const index = isNumber(options.pluralIndex)
        ? options.pluralIndex
        : -1;
    // prettier-ignore
    return options.named && (isNumber(options.named.count) || isNumber(options.named.n))
        ? isNumber(options.named.count)
            ? options.named.count
            : isNumber(options.named.n)
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
    const pluralRule = isObject(options.pluralRules) &&
        isString(locale) &&
        isFunction(options.pluralRules[locale])
        ? options.pluralRules[locale]
        : pluralDefault;
    const orgPluralRule = isObject(options.pluralRules) &&
        isString(locale) &&
        isFunction(options.pluralRules[locale])
        ? pluralDefault
        : undefined;
    const plural = (messages) => {
        return messages[pluralRule(pluralIndex, messages.length, orgPluralRule)];
    };
    const _list = options.list || [];
    const list = (index) => _list[index];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _named = options.named || create();
    isNumber(options.pluralIndex) && normalizeNamed(pluralIndex, _named);
    const named = (key) => _named[key];
    function message(key, useLinked) {
        // prettier-ignore
        const msg = isFunction(options.messages)
            ? options.messages(key, !!useLinked)
            : isObject(options.messages)
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
    const normalize = isPlainObject(options.processor) && isFunction(options.processor.normalize)
        ? options.processor.normalize
        : DEFAULT_NORMALIZE;
    const interpolate = isPlainObject(options.processor) &&
        isFunction(options.processor.interpolate)
        ? options.processor.interpolate
        : DEFAULT_INTERPOLATE;
    const type = isPlainObject(options.processor) && isString(options.processor.type)
        ? options.processor.type
        : DEFAULT_MESSAGE_DATA_TYPE;
    const linked = (key, ...args) => {
        const [arg1, arg2] = args;
        let type = 'text';
        let modifier = '';
        if (args.length === 1) {
            if (isObject(arg1)) {
                modifier = arg1.modifier || modifier;
                type = arg1.type || type;
            }
            else if (isString(arg1)) {
                modifier = arg1 || modifier;
            }
        }
        else if (args.length === 2) {
            if (isString(arg1)) {
                modifier = arg1 || modifier;
            }
            if (isString(arg2)) {
                type = arg2 || type;
            }
        }
        const ret = message(key, true)(ctx);
        const msg = 
        // The message in vnode resolved with linked are returned as an array by processor.nomalize
        type === 'vnode' && isArray(ret) && modifier
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
        ["values" /* HelperNameMap.VALUES */]: assign(create(), _list, _named)
    };
    return ctx;
}

const NOOP_MESSAGE_FUNCTION = () => '';
const isMessageFunction = (val) => isFunction(val);
// implementation of `translate` function
function translate(context, ...args) {
    const { fallbackFormat, postTranslation, unresolving, messageCompiler, fallbackLocale, messages } = context;
    const [key, options] = parseTranslateArgs(...args);
    const missingWarn = isBoolean(options.missingWarn)
        ? options.missingWarn
        : context.missingWarn;
    const fallbackWarn = isBoolean(options.fallbackWarn)
        ? options.fallbackWarn
        : context.fallbackWarn;
    const escapeParameter = isBoolean(options.escapeParameter)
        ? options.escapeParameter
        : context.escapeParameter;
    const resolvedMessage = !!options.resolvedMessage;
    // prettier-ignore
    const defaultMsgOrKey = isString(options.default) || isBoolean(options.default) // default by function option
        ? !isBoolean(options.default)
            ? options.default
            : (!messageCompiler ? () => key : key)
        : fallbackFormat // default by `fallbackFormat` option
            ? (!messageCompiler ? () => key : key)
            : null;
    const enableDefaultMsg = fallbackFormat ||
        (defaultMsgOrKey != null &&
            (isString(defaultMsgOrKey) || isFunction(defaultMsgOrKey)));
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
            messages[locale] || create()
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
        !(isString(format) ||
            isMessageAST(format) ||
            isMessageFunction(format))) {
        if (enableDefaultMsg) {
            format = defaultMsgOrKey;
            cacheBaseKey = format;
        }
    }
    // checking message format and target locale
    if (!resolvedMessage &&
        (!(isString(format) ||
            isMessageAST(format) ||
            isMessageFunction(format)) ||
            !isString(targetLocale))) {
        return unresolving ? NOT_REOSLVED : key;
    }
    // TODO: refactor
    if (isString(format) && context.messageCompiler == null) {
        warn(`The message format compilation is not supported in this build. ` +
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
    if (escapeParameter && isString(ret)) {
        ret = sanitizeTranslatedHtml(ret);
    }
    // NOTE: experimental !!
    {
        // prettier-ignore
        const payloads = {
            timestamp: Date.now(),
            key: isString(key)
                ? key
                : isMessageFunction(format)
                    ? format.key
                    : '',
            locale: targetLocale || (isMessageFunction(format)
                ? format.locale
                : ''),
            format: isString(format)
                ? format
                : isMessageFunction(format)
                    ? format.source
                    : '',
            message: ret
        };
        payloads.meta = assign({}, context.__meta, getAdditionalMeta() || {});
        translateDevTools(payloads);
    }
    return ret;
}
function escapeParams(options) {
    if (isArray(options.list)) {
        options.list = options.list.map(item => isString(item) ? escapeHtml(item) : item);
    }
    else if (isObject(options.named)) {
        Object.keys(options.named).forEach(key => {
            if (isString(options.named[key])) {
                options.named[key] = escapeHtml(options.named[key]);
            }
        });
    }
}
function resolveMessageFormat(context, key, locale, fallbackLocale, fallbackWarn, missingWarn) {
    const { messages, onWarn, messageResolver: resolveValue, localeFallbacker } = context;
    const locales = localeFallbacker(context, fallbackLocale, locale); // eslint-disable-line @typescript-eslint/no-explicit-any
    let message = create();
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
            onWarn(getWarnMessage$1(CoreWarnCodes.FALLBACK_TO_TRANSLATE, {
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
            messages[targetLocale] || create();
        // for vue-devtools timeline event
        let start = null;
        let startTag;
        let endTag;
        if (inBrowser) {
            start = window.performance.now();
            startTag = 'intlify-message-resolve-start';
            endTag = 'intlify-message-resolve-end';
            mark && mark(startTag);
        }
        if ((format = resolveValue(message, key)) === null) {
            // if null, resolve with object key path
            format = message[key]; // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        // for vue-devtools timeline event
        if (inBrowser) {
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
            if (startTag && endTag && mark && measure) {
                mark(endTag);
                measure('intlify message resolve', startTag, endTag);
            }
        }
        if (isString(format) || isMessageAST(format) || isMessageFunction(format)) {
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
    if (inBrowser) {
        start = window.performance.now();
        startTag = 'intlify-message-compilation-start';
        endTag = 'intlify-message-compilation-end';
        mark && mark(startTag);
    }
    const msg = messageCompiler(format, getCompileContext(context, targetLocale, cacheBaseKey, format, warnHtmlMessage, onError));
    // for vue-devtools timeline event
    if (inBrowser) {
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
        if (startTag && endTag && mark && measure) {
            mark(endTag);
            measure('intlify message compilation', startTag, endTag);
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
    if (inBrowser) {
        start = window.performance.now();
        startTag = 'intlify-message-evaluation-start';
        endTag = 'intlify-message-evaluation-end';
        mark && mark(startTag);
    }
    const messaged = msg(msgCtx);
    // for vue-devtools timeline event
    if (inBrowser) {
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
        if (startTag && endTag && mark && measure) {
            mark(endTag);
            measure('intlify message evaluation', startTag, endTag);
        }
    }
    return messaged;
}
/** @internal */
function parseTranslateArgs(...args) {
    const [arg1, arg2, arg3] = args;
    const options = create();
    if (!isString(arg1) &&
        !isNumber(arg1) &&
        !isMessageFunction(arg1) &&
        !isMessageAST(arg1)) {
        throw createCoreError(CoreErrorCodes.INVALID_ARGUMENT);
    }
    // prettier-ignore
    const key = isNumber(arg1)
        ? String(arg1)
        : isMessageFunction(arg1)
            ? arg1
            : arg1;
    if (isNumber(arg2)) {
        options.plural = arg2;
    }
    else if (isString(arg2)) {
        options.default = arg2;
    }
    else if (isPlainObject(arg2) && !isEmptyObject(arg2)) {
        options.named = arg2;
    }
    else if (isArray(arg2)) {
        options.list = arg2;
    }
    if (isNumber(arg3)) {
        options.plural = arg3;
    }
    else if (isString(arg3)) {
        options.default = arg3;
    }
    else if (isPlainObject(arg3)) {
        assign(options, arg3);
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
                    generateCodeFrame(_source, err.location.start.offset, err.location.end.offset);
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
        onCacheKey: (source) => generateFormatCacheKey(locale, key, source)
    };
}
function getSourceForCodeFrame(source) {
    if (isString(source)) {
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
        if (isString(val) || isMessageAST(val)) {
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
    if (isNumber(options.plural)) {
        ctxOptions.pluralIndex = options.plural;
    }
    return ctxOptions;
}

/**
 * Vue I18n Version
 *
 * @remarks
 * Semver format. Same format as the package.json `version` field.
 *
 * @VueI18nGeneral
 */
const VERSION = '11.1.10';
/**
 * This is only called development env
 * istanbul-ignore-next
 */
function initDev() {
    {
        {
            console.info(`You are running a development build of vue-i18n.\n` +
                `Make sure to use the production build (*.prod.js) when deploying for production.`);
        }
    }
}

const I18nErrorCodes = {
    // composer module errors
    UNEXPECTED_RETURN_TYPE: CORE_ERROR_CODES_EXTEND_POINT, // 24
    // legacy module errors
    INVALID_ARGUMENT: 25,
    // i18n module errors
    MUST_BE_CALL_SETUP_TOP: 26,
    NOT_INSTALLED: 27,
    // directive module errors
    REQUIRED_VALUE: 28,
    INVALID_VALUE: 29,
    // vue-devtools errors
    CANNOT_SETUP_VUE_DEVTOOLS_PLUGIN: 30,
    NOT_INSTALLED_WITH_PROVIDE: 31,
    // unexpected error
    UNEXPECTED_ERROR: 32,
    // not compatible legacy vue-i18n constructor
    NOT_COMPATIBLE_LEGACY_VUE_I18N: 33,
    // Not available Compostion API in Legacy API mode. Please make sure that the legacy API mode is working properly
    NOT_AVAILABLE_COMPOSITION_IN_LEGACY: 34,
    // duplicate `useI18n` calling
    DUPLICATE_USE_I18N_CALLING: 35
};
function createI18nError(code, ...args) {
    return createCompileError(code, null, { messages: errorMessages, args } );
}
const errorMessages = {
    [I18nErrorCodes.UNEXPECTED_RETURN_TYPE]: 'Unexpected return type in composer',
    [I18nErrorCodes.INVALID_ARGUMENT]: 'Invalid argument',
    [I18nErrorCodes.MUST_BE_CALL_SETUP_TOP]: 'Must be called at the top of a `setup` function',
    [I18nErrorCodes.NOT_INSTALLED]: 'Need to install with `app.use` function',
    [I18nErrorCodes.UNEXPECTED_ERROR]: 'Unexpected error',
    [I18nErrorCodes.REQUIRED_VALUE]: `Required in value: {0}`,
    [I18nErrorCodes.INVALID_VALUE]: `Invalid value`,
    [I18nErrorCodes.CANNOT_SETUP_VUE_DEVTOOLS_PLUGIN]: `Cannot setup vue-devtools plugin`,
    [I18nErrorCodes.NOT_INSTALLED_WITH_PROVIDE]: 'Need to install with `provide` function',
    [I18nErrorCodes.NOT_COMPATIBLE_LEGACY_VUE_I18N]: 'Not compatible legacy VueI18n.',
    [I18nErrorCodes.NOT_AVAILABLE_COMPOSITION_IN_LEGACY]: 'Not available Compostion API in Legacy API mode. Please make sure that the legacy API mode is working properly',
    [I18nErrorCodes.DUPLICATE_USE_I18N_CALLING]: "Duplicate `useI18n` calling by local scope. Please don't call it on local scope"
};

const TranslateVNodeSymbol = 
/* #__PURE__*/ makeSymbol('__translateVNode');
const DatetimePartsSymbol = /* #__PURE__*/ makeSymbol('__datetimeParts');
const NumberPartsSymbol = /* #__PURE__*/ makeSymbol('__numberParts');
const EnableEmitter = /* #__PURE__*/ makeSymbol('__enableEmitter');
const DisableEmitter = /* #__PURE__*/ makeSymbol('__disableEmitter');
const SetPluralRulesSymbol = makeSymbol('__setPluralRules');
const InejctWithOptionSymbol = 
/* #__PURE__*/ makeSymbol('__injectWithOption');
const DisposeSymbol = /* #__PURE__*/ makeSymbol('__dispose');

const I18nWarnCodes = {
    FALLBACK_TO_ROOT: CORE_WARN_CODES_EXTEND_POINT, // 8
    NOT_FOUND_PARENT_SCOPE: 9,
    IGNORE_OBJ_FLATTEN: 10,
    /**
     * @deprecated will be removed at vue-i18n v12
     */
    DEPRECATE_LEGACY_MODE: 11,
    /**
     * @deprecated will be removed at vue-i18n v12
     */
    DEPRECATE_TRANSLATE_CUSTOME_DIRECTIVE: 12
};
const warnMessages = {
    [I18nWarnCodes.FALLBACK_TO_ROOT]: `Fall back to {type} '{key}' with root locale.`,
    [I18nWarnCodes.NOT_FOUND_PARENT_SCOPE]: `Not found parent scope. use the global scope.`,
    [I18nWarnCodes.IGNORE_OBJ_FLATTEN]: `Ignore object flatten: '{key}' key has an string value`,
    /**
     * @deprecated will be removed at vue-i18n v12
     */
    [I18nWarnCodes.DEPRECATE_LEGACY_MODE]: `Legacy API mode has been deprecated in v11. Use Composition API mode instead.\nAbout how to use the Composition API mode, see https://vue-i18n.intlify.dev/guide/advanced/composition.html`,
    /**
     * @deprecated will be removed at vue-i18n v12
     */
    [I18nWarnCodes.DEPRECATE_TRANSLATE_CUSTOME_DIRECTIVE]: `'v-t' has been deprecated in v11. Use translate APIs ('t' or '$t') instead.`
};
function getWarnMessage(code, ...args) {
    return format$1(warnMessages[code], ...args);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Transform flat json in obj to normal json in obj
 */
function handleFlatJson(obj) {
    // check obj
    if (!isObject(obj)) {
        return obj;
    }
    if (isMessageAST(obj)) {
        return obj;
    }
    for (const key in obj) {
        // check key
        if (!hasOwn(obj, key)) {
            continue;
        }
        // handle for normal json
        if (!key.includes('.')) {
            // recursive process value if value is also a object
            if (isObject(obj[key])) {
                handleFlatJson(obj[key]);
            }
        }
        // handle for flat json, transform to normal json
        else {
            // go to the last object
            const subKeys = key.split('.');
            const lastIndex = subKeys.length - 1;
            let currentObj = obj;
            let hasStringValue = false;
            for (let i = 0; i < lastIndex; i++) {
                if (subKeys[i] === '__proto__') {
                    throw new Error(`unsafe key: ${subKeys[i]}`);
                }
                if (!(subKeys[i] in currentObj)) {
                    currentObj[subKeys[i]] = create();
                }
                if (!isObject(currentObj[subKeys[i]])) {
                    warn(getWarnMessage(I18nWarnCodes.IGNORE_OBJ_FLATTEN, {
                            key: subKeys[i]
                        }));
                    hasStringValue = true;
                    break;
                }
                currentObj = currentObj[subKeys[i]];
            }
            // update last object value, delete old property
            if (!hasStringValue) {
                if (!isMessageAST(currentObj)) {
                    currentObj[subKeys[lastIndex]] = obj[key];
                    delete obj[key];
                }
                else {
                    /**
                     * NOTE:
                     * if the last object is a message AST and subKeys[lastIndex] has message AST prop key, ignore to copy and key deletion
                     */
                    if (!AST_NODE_PROPS_KEYS.includes(subKeys[lastIndex])) {
                        delete obj[key];
                    }
                }
            }
            // recursive process value if value is also a object
            if (!isMessageAST(currentObj)) {
                const target = currentObj[subKeys[lastIndex]];
                if (isObject(target)) {
                    handleFlatJson(target);
                }
            }
        }
    }
    return obj;
}
function getLocaleMessages(locale, options) {
    const { messages, __i18n, messageResolver, flatJson } = options;
    // prettier-ignore
    const ret = (isPlainObject(messages)
        ? messages
        : isArray(__i18n)
            ? create()
            : { [locale]: create() });
    // merge locale messages of i18n custom block
    if (isArray(__i18n)) {
        __i18n.forEach(custom => {
            if ('locale' in custom && 'resource' in custom) {
                const { locale, resource } = custom;
                if (locale) {
                    ret[locale] = ret[locale] || create();
                    deepCopy(resource, ret[locale]);
                }
                else {
                    deepCopy(resource, ret);
                }
            }
            else {
                isString(custom) && deepCopy(JSON.parse(custom), ret);
            }
        });
    }
    // handle messages for flat json
    if (messageResolver == null && flatJson) {
        for (const key in ret) {
            if (hasOwn(ret, key)) {
                handleFlatJson(ret[key]);
            }
        }
    }
    return ret;
}
function getComponentOptions(instance) {
    return instance.type;
}
function adjustI18nResources(gl, options, componentOptions) {
    // prettier-ignore
    let messages = isObject(options.messages)
        ? options.messages
        : create();
    if ('__i18nGlobal' in componentOptions) {
        messages = getLocaleMessages(gl.locale.value, {
            messages,
            __i18n: componentOptions.__i18nGlobal
        });
    }
    // merge locale messages
    const locales = Object.keys(messages);
    if (locales.length) {
        locales.forEach(locale => {
            gl.mergeLocaleMessage(locale, messages[locale]);
        });
    }
    {
        // merge datetime formats
        if (isObject(options.datetimeFormats)) {
            const locales = Object.keys(options.datetimeFormats);
            if (locales.length) {
                locales.forEach(locale => {
                    gl.mergeDateTimeFormat(locale, options.datetimeFormats[locale]);
                });
            }
        }
        // merge number formats
        if (isObject(options.numberFormats)) {
            const locales = Object.keys(options.numberFormats);
            if (locales.length) {
                locales.forEach(locale => {
                    gl.mergeNumberFormat(locale, options.numberFormats[locale]);
                });
            }
        }
    }
}
function createTextNode(key) {
    return createVNode(Text, null, key, 0);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// extend VNode interface
const DEVTOOLS_META = '__INTLIFY_META__';
const NOOP_RETURN_ARRAY = () => [];
const NOOP_RETURN_FALSE = () => false;
let composerID = 0;
function defineCoreMissingHandler(missing) {
    return ((ctx, locale, key, type) => {
        return missing(locale, key, getCurrentInstance() || undefined, type);
    });
}
// for Intlify DevTools
/* #__NO_SIDE_EFFECTS__ */
const getMetaInfo = () => {
    const instance = getCurrentInstance();
    let meta = null;
    return instance && (meta = getComponentOptions(instance)[DEVTOOLS_META])
        ? { [DEVTOOLS_META]: meta }
        : null;
};
/**
 * Create composer interface factory
 *
 * @internal
 */
function createComposer(options = {}) {
    const { __root, __injectWithOption } = options;
    const _isGlobal = __root === undefined;
    const flatJson = options.flatJson;
    const _ref = inBrowser ? ref : shallowRef;
    let _inheritLocale = isBoolean(options.inheritLocale)
        ? options.inheritLocale
        : true;
    const _locale = _ref(
    // prettier-ignore
    __root && _inheritLocale
        ? __root.locale.value
        : isString(options.locale)
            ? options.locale
            : DEFAULT_LOCALE);
    const _fallbackLocale = _ref(
    // prettier-ignore
    __root && _inheritLocale
        ? __root.fallbackLocale.value
        : isString(options.fallbackLocale) ||
            isArray(options.fallbackLocale) ||
            isPlainObject(options.fallbackLocale) ||
            options.fallbackLocale === false
            ? options.fallbackLocale
            : _locale.value);
    const _messages = _ref(getLocaleMessages(_locale.value, options));
    // prettier-ignore
    const _datetimeFormats = _ref(isPlainObject(options.datetimeFormats)
            ? options.datetimeFormats
            : { [_locale.value]: {} })
        ;
    // prettier-ignore
    const _numberFormats = _ref(isPlainObject(options.numberFormats)
            ? options.numberFormats
            : { [_locale.value]: {} })
        ;
    // warning suppress options
    // prettier-ignore
    let _missingWarn = __root
        ? __root.missingWarn
        : isBoolean(options.missingWarn) || isRegExp(options.missingWarn)
            ? options.missingWarn
            : true;
    // prettier-ignore
    let _fallbackWarn = __root
        ? __root.fallbackWarn
        : isBoolean(options.fallbackWarn) || isRegExp(options.fallbackWarn)
            ? options.fallbackWarn
            : true;
    // prettier-ignore
    let _fallbackRoot = __root
        ? __root.fallbackRoot
        : isBoolean(options.fallbackRoot)
            ? options.fallbackRoot
            : true;
    // configure fall back to root
    let _fallbackFormat = !!options.fallbackFormat;
    // runtime missing
    let _missing = isFunction(options.missing) ? options.missing : null;
    let _runtimeMissing = isFunction(options.missing)
        ? defineCoreMissingHandler(options.missing)
        : null;
    // postTranslation handler
    let _postTranslation = isFunction(options.postTranslation)
        ? options.postTranslation
        : null;
    // prettier-ignore
    let _warnHtmlMessage = __root
        ? __root.warnHtmlMessage
        : isBoolean(options.warnHtmlMessage)
            ? options.warnHtmlMessage
            : true;
    let _escapeParameter = !!options.escapeParameter;
    // custom linked modifiers
    // prettier-ignore
    const _modifiers = __root
        ? __root.modifiers
        : isPlainObject(options.modifiers)
            ? options.modifiers
            : {};
    // pluralRules
    let _pluralRules = options.pluralRules || (__root && __root.pluralRules);
    // runtime context
    // eslint-disable-next-line prefer-const
    let _context;
    const getCoreContext = () => {
        _isGlobal && setFallbackContext(null);
        const ctxOptions = {
            version: VERSION,
            locale: _locale.value,
            fallbackLocale: _fallbackLocale.value,
            messages: _messages.value,
            modifiers: _modifiers,
            pluralRules: _pluralRules,
            missing: _runtimeMissing === null ? undefined : _runtimeMissing,
            missingWarn: _missingWarn,
            fallbackWarn: _fallbackWarn,
            fallbackFormat: _fallbackFormat,
            unresolving: true,
            postTranslation: _postTranslation === null ? undefined : _postTranslation,
            warnHtmlMessage: _warnHtmlMessage,
            escapeParameter: _escapeParameter,
            messageResolver: options.messageResolver,
            messageCompiler: options.messageCompiler,
            __meta: { framework: 'vue' }
        };
        {
            ctxOptions.datetimeFormats = _datetimeFormats.value;
            ctxOptions.numberFormats = _numberFormats.value;
            ctxOptions.__datetimeFormatters = isPlainObject(_context)
                ? _context.__datetimeFormatters
                : undefined;
            ctxOptions.__numberFormatters = isPlainObject(_context)
                ? _context.__numberFormatters
                : undefined;
        }
        {
            ctxOptions.__v_emitter = isPlainObject(_context)
                ? _context.__v_emitter
                : undefined;
        }
        const ctx = createCoreContext(ctxOptions);
        _isGlobal && setFallbackContext(ctx);
        return ctx;
    };
    _context = getCoreContext();
    updateFallbackLocale(_context, _locale.value, _fallbackLocale.value);
    // track reactivity
    function trackReactivityValues() {
        return [
                _locale.value,
                _fallbackLocale.value,
                _messages.value,
                _datetimeFormats.value,
                _numberFormats.value
            ]
            ;
    }
    // locale
    const locale = computed({
        get: () => _locale.value,
        set: val => {
            _context.locale = val;
            _locale.value = val;
        }
    });
    // fallbackLocale
    const fallbackLocale = computed({
        get: () => _fallbackLocale.value,
        set: val => {
            _context.fallbackLocale = val;
            _fallbackLocale.value = val;
            updateFallbackLocale(_context, _locale.value, val);
        }
    });
    // messages
    const messages = computed(() => _messages.value);
    // datetimeFormats
    const datetimeFormats = /* #__PURE__*/ computed(() => _datetimeFormats.value);
    // numberFormats
    const numberFormats = /* #__PURE__*/ computed(() => _numberFormats.value);
    // getPostTranslationHandler
    function getPostTranslationHandler() {
        return isFunction(_postTranslation) ? _postTranslation : null;
    }
    // setPostTranslationHandler
    function setPostTranslationHandler(handler) {
        _postTranslation = handler;
        _context.postTranslation = handler;
    }
    // getMissingHandler
    function getMissingHandler() {
        return _missing;
    }
    // setMissingHandler
    function setMissingHandler(handler) {
        if (handler !== null) {
            _runtimeMissing = defineCoreMissingHandler(handler);
        }
        _missing = handler;
        _context.missing = _runtimeMissing;
    }
    function isResolvedTranslateMessage(type, arg) {
        return type !== 'translate' || !arg.resolvedMessage;
    }
    const wrapWithDeps = (fn, argumentParser, warnType, fallbackSuccess, fallbackFail, successCondition) => {
        trackReactivityValues(); // track reactive dependency
        // NOTE: experimental !!
        let ret;
        try {
            if (true || false) {
                setAdditionalMeta(getMetaInfo());
            }
            if (!_isGlobal) {
                _context.fallbackContext = __root
                    ? getFallbackContext()
                    : undefined;
            }
            ret = fn(_context);
        }
        finally {
            if (!_isGlobal) {
                _context.fallbackContext = undefined;
            }
        }
        if ((warnType !== 'translate exists' && // for not `te` (e.g `t`)
            isNumber(ret) &&
            ret === NOT_REOSLVED) ||
            (warnType === 'translate exists' && !ret) // for `te`
        ) {
            const [key, arg2] = argumentParser();
            if (__root &&
                isString(key) &&
                isResolvedTranslateMessage(warnType, arg2)) {
                if (_fallbackRoot &&
                    (isTranslateFallbackWarn(_fallbackWarn, key) ||
                        isTranslateMissingWarn(_missingWarn, key))) {
                    warn(getWarnMessage(I18nWarnCodes.FALLBACK_TO_ROOT, {
                        key,
                        type: warnType
                    }));
                }
                // for vue-devtools timeline event
                {
                    const { __v_emitter: emitter } = _context;
                    if (emitter && _fallbackRoot) {
                        emitter.emit('fallback', {
                            type: warnType,
                            key,
                            to: 'global',
                            groupId: `${warnType}:${key}`
                        });
                    }
                }
            }
            return __root && _fallbackRoot
                ? fallbackSuccess(__root)
                : fallbackFail(key);
        }
        else if (successCondition(ret)) {
            return ret;
        }
        else {
            /* istanbul ignore next */
            throw createI18nError(I18nErrorCodes.UNEXPECTED_RETURN_TYPE);
        }
    };
    // t
    function t(...args) {
        return wrapWithDeps(context => Reflect.apply(translate, null, [context, ...args]), () => parseTranslateArgs(...args), 'translate', root => Reflect.apply(root.t, root, [...args]), key => key, val => isString(val));
    }
    // rt
    function rt(...args) {
        const [arg1, arg2, arg3] = args;
        if (arg3 && !isObject(arg3)) {
            throw createI18nError(I18nErrorCodes.INVALID_ARGUMENT);
        }
        return t(...[arg1, arg2, assign({ resolvedMessage: true }, arg3 || {})]);
    }
    // d
    function d(...args) {
        return wrapWithDeps(context => Reflect.apply(datetime, null, [context, ...args]), () => parseDateTimeArgs(...args), 'datetime format', root => Reflect.apply(root.d, root, [...args]), () => MISSING_RESOLVE_VALUE, val => isString(val) || isArray(val));
    }
    // n
    function n(...args) {
        return wrapWithDeps(context => Reflect.apply(number, null, [context, ...args]), () => parseNumberArgs(...args), 'number format', root => Reflect.apply(root.n, root, [...args]), () => MISSING_RESOLVE_VALUE, val => isString(val) || isArray(val));
    }
    // for custom processor
    function normalize(values) {
        return values.map(val => isString(val) || isNumber(val) || isBoolean(val)
            ? createTextNode(String(val))
            : val);
    }
    const interpolate = (val) => val;
    const processor = {
        normalize,
        interpolate,
        type: 'vnode'
    };
    // translateVNode, using for `i18n-t` component
    function translateVNode(...args) {
        return wrapWithDeps(context => {
            let ret;
            const _context = context;
            try {
                _context.processor = processor;
                ret = Reflect.apply(translate, null, [_context, ...args]);
            }
            finally {
                _context.processor = null;
            }
            return ret;
        }, () => parseTranslateArgs(...args), 'translate', root => root[TranslateVNodeSymbol](...args), key => [createTextNode(key)], val => isArray(val));
    }
    // numberParts, using for `i18n-n` component
    function numberParts(...args) {
        return wrapWithDeps(context => Reflect.apply(number, null, [context, ...args]), () => parseNumberArgs(...args), 'number format', root => root[NumberPartsSymbol](...args), NOOP_RETURN_ARRAY, val => isString(val) || isArray(val));
    }
    // datetimeParts, using for `i18n-d` component
    function datetimeParts(...args) {
        return wrapWithDeps(context => Reflect.apply(datetime, null, [context, ...args]), () => parseDateTimeArgs(...args), 'datetime format', root => root[DatetimePartsSymbol](...args), NOOP_RETURN_ARRAY, val => isString(val) || isArray(val));
    }
    function setPluralRules(rules) {
        _pluralRules = rules;
        _context.pluralRules = _pluralRules;
    }
    // te
    function te(key, locale) {
        return wrapWithDeps(() => {
            if (!key) {
                return false;
            }
            const targetLocale = isString(locale) ? locale : _locale.value;
            const message = getLocaleMessage(targetLocale);
            const resolved = _context.messageResolver(message, key);
            return (isMessageAST(resolved) ||
                isMessageFunction(resolved) ||
                isString(resolved));
        }, () => [key], 'translate exists', root => {
            return Reflect.apply(root.te, root, [key, locale]);
        }, NOOP_RETURN_FALSE, val => isBoolean(val));
    }
    function resolveMessages(key) {
        let messages = null;
        const locales = fallbackWithLocaleChain(_context, _fallbackLocale.value, _locale.value);
        for (let i = 0; i < locales.length; i++) {
            const targetLocaleMessages = _messages.value[locales[i]] || {};
            const messageValue = _context.messageResolver(targetLocaleMessages, key);
            if (messageValue != null) {
                messages = messageValue;
                break;
            }
        }
        return messages;
    }
    // tm
    function tm(key) {
        const messages = resolveMessages(key);
        // prettier-ignore
        return messages != null
            ? messages
            : __root
                ? __root.tm(key) || {}
                : {};
    }
    // getLocaleMessage
    function getLocaleMessage(locale) {
        return (_messages.value[locale] || {});
    }
    // setLocaleMessage
    function setLocaleMessage(locale, message) {
        if (flatJson) {
            const _message = { [locale]: message };
            for (const key in _message) {
                if (hasOwn(_message, key)) {
                    handleFlatJson(_message[key]);
                }
            }
            message = _message[locale];
        }
        _messages.value[locale] = message;
        _context.messages = _messages.value;
    }
    // mergeLocaleMessage
    function mergeLocaleMessage(locale, message) {
        _messages.value[locale] = _messages.value[locale] || {};
        const _message = { [locale]: message };
        if (flatJson) {
            for (const key in _message) {
                if (hasOwn(_message, key)) {
                    handleFlatJson(_message[key]);
                }
            }
        }
        message = _message[locale];
        deepCopy(message, _messages.value[locale]);
        _context.messages = _messages.value;
    }
    // getDateTimeFormat
    function getDateTimeFormat(locale) {
        return _datetimeFormats.value[locale] || {};
    }
    // setDateTimeFormat
    function setDateTimeFormat(locale, format) {
        _datetimeFormats.value[locale] = format;
        _context.datetimeFormats = _datetimeFormats.value;
        clearDateTimeFormat(_context, locale, format);
    }
    // mergeDateTimeFormat
    function mergeDateTimeFormat(locale, format) {
        _datetimeFormats.value[locale] = assign(_datetimeFormats.value[locale] || {}, format);
        _context.datetimeFormats = _datetimeFormats.value;
        clearDateTimeFormat(_context, locale, format);
    }
    // getNumberFormat
    function getNumberFormat(locale) {
        return _numberFormats.value[locale] || {};
    }
    // setNumberFormat
    function setNumberFormat(locale, format) {
        _numberFormats.value[locale] = format;
        _context.numberFormats = _numberFormats.value;
        clearNumberFormat(_context, locale, format);
    }
    // mergeNumberFormat
    function mergeNumberFormat(locale, format) {
        _numberFormats.value[locale] = assign(_numberFormats.value[locale] || {}, format);
        _context.numberFormats = _numberFormats.value;
        clearNumberFormat(_context, locale, format);
    }
    // for debug
    composerID++;
    // watch root locale & fallbackLocale
    if (__root && inBrowser) {
        watch(__root.locale, (val) => {
            if (_inheritLocale) {
                _locale.value = val;
                _context.locale = val;
                updateFallbackLocale(_context, _locale.value, _fallbackLocale.value);
            }
        });
        watch(__root.fallbackLocale, (val) => {
            if (_inheritLocale) {
                _fallbackLocale.value = val;
                _context.fallbackLocale = val;
                updateFallbackLocale(_context, _locale.value, _fallbackLocale.value);
            }
        });
    }
    // define basic composition API!
    const composer = {
        id: composerID,
        locale,
        fallbackLocale,
        get inheritLocale() {
            return _inheritLocale;
        },
        set inheritLocale(val) {
            _inheritLocale = val;
            if (val && __root) {
                _locale.value = __root.locale.value;
                _fallbackLocale.value = __root.fallbackLocale.value;
                updateFallbackLocale(_context, _locale.value, _fallbackLocale.value);
            }
        },
        get availableLocales() {
            return Object.keys(_messages.value).sort();
        },
        messages,
        get modifiers() {
            return _modifiers;
        },
        get pluralRules() {
            return _pluralRules || {};
        },
        get isGlobal() {
            return _isGlobal;
        },
        get missingWarn() {
            return _missingWarn;
        },
        set missingWarn(val) {
            _missingWarn = val;
            _context.missingWarn = _missingWarn;
        },
        get fallbackWarn() {
            return _fallbackWarn;
        },
        set fallbackWarn(val) {
            _fallbackWarn = val;
            _context.fallbackWarn = _fallbackWarn;
        },
        get fallbackRoot() {
            return _fallbackRoot;
        },
        set fallbackRoot(val) {
            _fallbackRoot = val;
        },
        get fallbackFormat() {
            return _fallbackFormat;
        },
        set fallbackFormat(val) {
            _fallbackFormat = val;
            _context.fallbackFormat = _fallbackFormat;
        },
        get warnHtmlMessage() {
            return _warnHtmlMessage;
        },
        set warnHtmlMessage(val) {
            _warnHtmlMessage = val;
            _context.warnHtmlMessage = val;
        },
        get escapeParameter() {
            return _escapeParameter;
        },
        set escapeParameter(val) {
            _escapeParameter = val;
            _context.escapeParameter = val;
        },
        t,
        getLocaleMessage,
        setLocaleMessage,
        mergeLocaleMessage,
        getPostTranslationHandler,
        setPostTranslationHandler,
        getMissingHandler,
        setMissingHandler,
        [SetPluralRulesSymbol]: setPluralRules
    };
    {
        composer.datetimeFormats = datetimeFormats;
        composer.numberFormats = numberFormats;
        composer.rt = rt;
        composer.te = te;
        composer.tm = tm;
        composer.d = d;
        composer.n = n;
        composer.getDateTimeFormat = getDateTimeFormat;
        composer.setDateTimeFormat = setDateTimeFormat;
        composer.mergeDateTimeFormat = mergeDateTimeFormat;
        composer.getNumberFormat = getNumberFormat;
        composer.setNumberFormat = setNumberFormat;
        composer.mergeNumberFormat = mergeNumberFormat;
        composer[InejctWithOptionSymbol] = __injectWithOption;
        composer[TranslateVNodeSymbol] = translateVNode;
        composer[DatetimePartsSymbol] = datetimeParts;
        composer[NumberPartsSymbol] = numberParts;
    }
    // for vue-devtools timeline event
    {
        composer[EnableEmitter] = (emitter) => {
            _context.__v_emitter = emitter;
        };
        composer[DisableEmitter] = () => {
            _context.__v_emitter = undefined;
        };
    }
    return composer;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

var global$1 = (typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {});

function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
}
function getTarget() {
    // @ts-ignore
    return (typeof navigator !== 'undefined' && typeof window !== 'undefined')
        ? window
        : typeof global$1 !== 'undefined'
            ? global$1
            : {};
}
const isProxyAvailable = typeof Proxy === 'function';

const HOOK_SETUP = 'devtools-plugin:setup';
const HOOK_PLUGIN_SETTINGS_SET = 'plugin:settings:set';

let supported;
let perf;
function isPerformanceSupported() {
    var _a;
    if (supported !== undefined) {
        return supported;
    }
    if (typeof window !== 'undefined' && window.performance) {
        supported = true;
        perf = window.performance;
    }
    else if (typeof global$1 !== 'undefined' && ((_a = global$1.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
        supported = true;
        perf = global$1.perf_hooks.performance;
    }
    else {
        supported = false;
    }
    return supported;
}
function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
}

class ApiProxy {
    constructor(plugin, hook) {
        this.target = null;
        this.targetQueue = [];
        this.onQueue = [];
        this.plugin = plugin;
        this.hook = hook;
        const defaultSettings = {};
        if (plugin.settings) {
            for (const id in plugin.settings) {
                const item = plugin.settings[id];
                defaultSettings[id] = item.defaultValue;
            }
        }
        const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
        let currentSettings = Object.assign({}, defaultSettings);
        try {
            const raw = localStorage.getItem(localSettingsSaveId);
            const data = JSON.parse(raw);
            Object.assign(currentSettings, data);
        }
        catch (e) {
            // noop
        }
        this.fallbacks = {
            getSettings() {
                return currentSettings;
            },
            setSettings(value) {
                try {
                    localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
                }
                catch (e) {
                    // noop
                }
                currentSettings = value;
            },
            now() {
                return now();
            },
        };
        if (hook) {
            hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
                if (pluginId === this.plugin.id) {
                    this.fallbacks.setSettings(value);
                }
            });
        }
        this.proxiedOn = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target.on[prop];
                }
                else {
                    return (...args) => {
                        this.onQueue.push({
                            method: prop,
                            args,
                        });
                    };
                }
            },
        });
        this.proxiedTarget = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target[prop];
                }
                else if (prop === 'on') {
                    return this.proxiedOn;
                }
                else if (Object.keys(this.fallbacks).includes(prop)) {
                    return (...args) => {
                        this.targetQueue.push({
                            method: prop,
                            args,
                            resolve: () => { },
                        });
                        return this.fallbacks[prop](...args);
                    };
                }
                else {
                    return (...args) => {
                        return new Promise(resolve => {
                            this.targetQueue.push({
                                method: prop,
                                args,
                                resolve,
                            });
                        });
                    };
                }
            },
        });
    }
    async setRealTarget(target) {
        this.target = target;
        for (const item of this.onQueue) {
            this.target.on[item.method](...item.args);
        }
        for (const item of this.targetQueue) {
            item.resolve(await this.target[item.method](...item.args));
        }
    }
}

function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
        hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    }
    else {
        const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
        const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
        list.push({
            pluginDescriptor: descriptor,
            setupFn,
            proxy,
        });
        if (proxy)
            setupFn(proxy.proxiedTarget);
    }
}

const VUE_I18N_COMPONENT_TYPES = 'vue-i18n: composer properties';
const VueDevToolsLabels = {
    'vue-devtools-plugin-vue-i18n': 'Vue I18n DevTools',
    'vue-i18n-resource-inspector': 'Vue I18n DevTools',
    'vue-i18n-timeline': 'Vue I18n'
};
const VueDevToolsPlaceholders = {
    'vue-i18n-resource-inspector': 'Search for scopes ...'
};
const VueDevToolsTimelineColors = {
    'vue-i18n-timeline': 0xffcd19
};
let devtoolsApi;
async function enableDevTools(app, i18n) {
    return new Promise((resolve, reject) => {
        try {
            setupDevtoolsPlugin({
                id: 'vue-devtools-plugin-vue-i18n',
                label: VueDevToolsLabels['vue-devtools-plugin-vue-i18n'],
                packageName: 'vue-i18n',
                homepage: 'https://vue-i18n.intlify.dev',
                logo: 'https://vue-i18n.intlify.dev/vue-i18n-devtools-logo.png',
                componentStateTypes: [VUE_I18N_COMPONENT_TYPES],
                app: app // eslint-disable-line @typescript-eslint/no-explicit-any
            }, api => {
                devtoolsApi = api;
                api.on.visitComponentTree(({ componentInstance, treeNode }) => {
                    updateComponentTreeTags(componentInstance, treeNode, i18n);
                });
                api.on.inspectComponent(({ componentInstance, instanceData }) => {
                    if (componentInstance.vnode.el &&
                        componentInstance.vnode.el.__VUE_I18N__ &&
                        instanceData) {
                        if (i18n.mode === 'legacy') {
                            // ignore global scope on legacy mode
                            if (componentInstance.vnode.el.__VUE_I18N__ !==
                                i18n.global.__composer) {
                                inspectComposer(instanceData, componentInstance.vnode.el.__VUE_I18N__);
                            }
                        }
                        else {
                            inspectComposer(instanceData, componentInstance.vnode.el.__VUE_I18N__);
                        }
                    }
                });
                api.addInspector({
                    id: 'vue-i18n-resource-inspector',
                    label: VueDevToolsLabels['vue-i18n-resource-inspector'],
                    icon: 'language',
                    treeFilterPlaceholder: VueDevToolsPlaceholders['vue-i18n-resource-inspector']
                });
                api.on.getInspectorTree(payload => {
                    if (payload.app === app &&
                        payload.inspectorId === 'vue-i18n-resource-inspector') {
                        registerScope(payload, i18n);
                    }
                });
                const roots = new Map();
                api.on.getInspectorState(async (payload) => {
                    if (payload.app === app &&
                        payload.inspectorId === 'vue-i18n-resource-inspector') {
                        api.unhighlightElement();
                        inspectScope(payload, i18n);
                        if (payload.nodeId === 'global') {
                            if (!roots.has(payload.app)) {
                                const [root] = await api.getComponentInstances(payload.app);
                                roots.set(payload.app, root);
                            }
                            api.highlightElement(roots.get(payload.app));
                        }
                        else {
                            const instance = getComponentInstance(payload.nodeId, i18n);
                            instance && api.highlightElement(instance);
                        }
                    }
                });
                api.on.editInspectorState(payload => {
                    if (payload.app === app &&
                        payload.inspectorId === 'vue-i18n-resource-inspector') {
                        editScope(payload, i18n);
                    }
                });
                api.addTimelineLayer({
                    id: 'vue-i18n-timeline',
                    label: VueDevToolsLabels['vue-i18n-timeline'],
                    color: VueDevToolsTimelineColors['vue-i18n-timeline']
                });
                resolve(true);
            });
        }
        catch (e) {
            console.error(e);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject(false);
        }
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getI18nScopeLable(instance) {
    return (instance.type.name ||
        instance.type.displayName ||
        instance.type.__file ||
        'Anonymous');
}
function updateComponentTreeTags(instance, // eslint-disable-line @typescript-eslint/no-explicit-any
treeNode, i18n) {
    // prettier-ignore
    const global = i18n.mode === 'composition'
        ? i18n.global
        : i18n.global.__composer;
    if (instance && instance.vnode.el && instance.vnode.el.__VUE_I18N__) {
        // add custom tags local scope only
        if (instance.vnode.el.__VUE_I18N__ !== global) {
            const tag = {
                label: `i18n (${getI18nScopeLable(instance)} Scope)`,
                textColor: 0x000000,
                backgroundColor: 0xffcd19
            };
            treeNode.tags.push(tag);
        }
    }
}
function inspectComposer(instanceData, composer) {
    const type = VUE_I18N_COMPONENT_TYPES;
    instanceData.state.push({
        type,
        key: 'locale',
        editable: true,
        value: composer.locale.value
    });
    instanceData.state.push({
        type,
        key: 'availableLocales',
        editable: false,
        value: composer.availableLocales
    });
    instanceData.state.push({
        type,
        key: 'fallbackLocale',
        editable: true,
        value: composer.fallbackLocale.value
    });
    instanceData.state.push({
        type,
        key: 'inheritLocale',
        editable: true,
        value: composer.inheritLocale
    });
    instanceData.state.push({
        type,
        key: 'messages',
        editable: false,
        value: getLocaleMessageValue(composer.messages.value)
    });
    {
        instanceData.state.push({
            type,
            key: 'datetimeFormats',
            editable: false,
            value: composer.datetimeFormats.value
        });
        instanceData.state.push({
            type,
            key: 'numberFormats',
            editable: false,
            value: composer.numberFormats.value
        });
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocaleMessageValue(messages) {
    const value = {};
    Object.keys(messages).forEach((key) => {
        const v = messages[key];
        if (isFunction(v) && 'source' in v) {
            value[key] = getMessageFunctionDetails(v);
        }
        else if (isMessageAST(v) && v.loc && v.loc.source) {
            value[key] = v.loc.source;
        }
        else if (isObject(v)) {
            value[key] = getLocaleMessageValue(v);
        }
        else {
            value[key] = v;
        }
    });
    return value;
}
const ESC = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '&': '&amp;'
};
function escape(s) {
    return s.replace(/[<>"&]/g, escapeChar);
}
function escapeChar(a) {
    return ESC[a] || a;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMessageFunctionDetails(func) {
    const argString = func.source ? `("${escape(func.source)}")` : `(?)`;
    return {
        _custom: {
            type: 'function',
            display: `<span>ƒ</span> ${argString}`
        }
    };
}
function registerScope(payload, i18n) {
    payload.rootNodes.push({
        id: 'global',
        label: 'Global Scope'
    });
    // prettier-ignore
    const global = i18n.mode === 'composition'
        ? i18n.global
        : i18n.global.__composer;
    for (const [keyInstance, instance] of i18n.__instances) {
        // prettier-ignore
        const composer = i18n.mode === 'composition'
            ? instance
            : instance.__composer;
        if (global === composer) {
            continue;
        }
        payload.rootNodes.push({
            id: composer.id.toString(),
            label: `${getI18nScopeLable(keyInstance)} Scope`
        });
    }
}
function getComponentInstance(nodeId, i18n) {
    let instance = null;
    if (nodeId !== 'global') {
        for (const [component, composer] of i18n.__instances.entries()) {
            if (composer.id.toString() === nodeId) {
                instance = component;
                break;
            }
        }
    }
    return instance;
}
function getComposer$2(nodeId, i18n) {
    if (nodeId === 'global') {
        return i18n.mode === 'composition'
            ? i18n.global
            : i18n.global.__composer;
    }
    else {
        const instance = Array.from(i18n.__instances.values()).find(item => item.id.toString() === nodeId);
        if (instance) {
            return i18n.mode === 'composition'
                ? instance
                : instance.__composer;
        }
        else {
            return null;
        }
    }
}
function inspectScope(payload, i18n
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    const composer = getComposer$2(payload.nodeId, i18n);
    if (composer) {
        // TODO:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload.state = makeScopeInspectState(composer);
    }
    return null;
}
function makeScopeInspectState(composer) {
    const state = {};
    const localeType = 'Locale related info';
    const localeStates = [
        {
            type: localeType,
            key: 'locale',
            editable: true,
            value: composer.locale.value
        },
        {
            type: localeType,
            key: 'fallbackLocale',
            editable: true,
            value: composer.fallbackLocale.value
        },
        {
            type: localeType,
            key: 'availableLocales',
            editable: false,
            value: composer.availableLocales
        },
        {
            type: localeType,
            key: 'inheritLocale',
            editable: true,
            value: composer.inheritLocale
        }
    ];
    state[localeType] = localeStates;
    const localeMessagesType = 'Locale messages info';
    const localeMessagesStates = [
        {
            type: localeMessagesType,
            key: 'messages',
            editable: false,
            value: getLocaleMessageValue(composer.messages.value)
        }
    ];
    state[localeMessagesType] = localeMessagesStates;
    {
        const datetimeFormatsType = 'Datetime formats info';
        const datetimeFormatsStates = [
            {
                type: datetimeFormatsType,
                key: 'datetimeFormats',
                editable: false,
                value: composer.datetimeFormats.value
            }
        ];
        state[datetimeFormatsType] = datetimeFormatsStates;
        const numberFormatsType = 'Datetime formats info';
        const numberFormatsStates = [
            {
                type: numberFormatsType,
                key: 'numberFormats',
                editable: false,
                value: composer.numberFormats.value
            }
        ];
        state[numberFormatsType] = numberFormatsStates;
    }
    return state;
}
function addTimelineEvent(event, payload) {
    if (devtoolsApi) {
        let groupId;
        if (payload && 'groupId' in payload) {
            groupId = payload.groupId;
            delete payload.groupId;
        }
        devtoolsApi.addTimelineEvent({
            layerId: 'vue-i18n-timeline',
            event: {
                title: event,
                groupId,
                time: Date.now(),
                meta: {},
                data: payload || {},
                logType: event === 'compile-error'
                    ? 'error'
                    : event === 'fallback' || event === 'missing'
                        ? 'warning'
                        : 'default'
            }
        });
    }
}
function editScope(payload, i18n) {
    const composer = getComposer$2(payload.nodeId, i18n);
    if (composer) {
        const [field] = payload.path;
        if (field === 'locale' && isString(payload.state.value)) {
            composer.locale.value = payload.state.value;
        }
        else if (field === 'fallbackLocale' &&
            (isString(payload.state.value) ||
                isArray(payload.state.value) ||
                isObject(payload.state.value))) {
            composer.fallbackLocale.value = payload.state.value;
        }
        else if (field === 'inheritLocale' && isBoolean(payload.state.value)) {
            composer.inheritLocale = payload.state.value;
        }
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Convert to I18n Composer Options from VueI18n Options
 *
 * @internal
 */
function convertComposerOptions(options) {
    const locale = isString(options.locale) ? options.locale : DEFAULT_LOCALE;
    const fallbackLocale = isString(options.fallbackLocale) ||
        isArray(options.fallbackLocale) ||
        isPlainObject(options.fallbackLocale) ||
        options.fallbackLocale === false
        ? options.fallbackLocale
        : locale;
    const missing = isFunction(options.missing) ? options.missing : undefined;
    const missingWarn = isBoolean(options.silentTranslationWarn) ||
        isRegExp(options.silentTranslationWarn)
        ? !options.silentTranslationWarn
        : true;
    const fallbackWarn = isBoolean(options.silentFallbackWarn) ||
        isRegExp(options.silentFallbackWarn)
        ? !options.silentFallbackWarn
        : true;
    const fallbackRoot = isBoolean(options.fallbackRoot)
        ? options.fallbackRoot
        : true;
    const fallbackFormat = !!options.formatFallbackMessages;
    const modifiers = isPlainObject(options.modifiers) ? options.modifiers : {};
    const pluralizationRules = options.pluralizationRules;
    const postTranslation = isFunction(options.postTranslation)
        ? options.postTranslation
        : undefined;
    const warnHtmlMessage = isString(options.warnHtmlInMessage)
        ? options.warnHtmlInMessage !== 'off'
        : true;
    const escapeParameter = !!options.escapeParameterHtml;
    const inheritLocale = isBoolean(options.sync) ? options.sync : true;
    let messages = options.messages;
    if (isPlainObject(options.sharedMessages)) {
        const sharedMessages = options.sharedMessages;
        const locales = Object.keys(sharedMessages);
        messages = locales.reduce((messages, locale) => {
            const message = messages[locale] || (messages[locale] = {});
            assign(message, sharedMessages[locale]);
            return messages;
        }, (messages || {}));
    }
    const { __i18n, __root, __injectWithOption } = options;
    const datetimeFormats = options.datetimeFormats;
    const numberFormats = options.numberFormats;
    const flatJson = options.flatJson;
    return {
        locale,
        fallbackLocale,
        messages,
        flatJson,
        datetimeFormats,
        numberFormats,
        missing,
        missingWarn,
        fallbackWarn,
        fallbackRoot,
        fallbackFormat,
        modifiers,
        pluralRules: pluralizationRules,
        postTranslation,
        warnHtmlMessage,
        escapeParameter,
        messageResolver: options.messageResolver,
        inheritLocale,
        __i18n,
        __root,
        __injectWithOption
    };
}
/**
 * create VueI18n interface factory
 *
 * @internal
 *
 * @deprecated will be removed at vue-i18n v12
 */
function createVueI18n(options = {}) {
    const composer = createComposer(convertComposerOptions(options));
    const { __extender } = options;
    // defines VueI18n
    const vueI18n = {
        // id
        id: composer.id,
        // locale
        get locale() {
            return composer.locale.value;
        },
        set locale(val) {
            composer.locale.value = val;
        },
        // fallbackLocale
        get fallbackLocale() {
            return composer.fallbackLocale.value;
        },
        set fallbackLocale(val) {
            composer.fallbackLocale.value = val;
        },
        // messages
        get messages() {
            return composer.messages.value;
        },
        // datetimeFormats
        get datetimeFormats() {
            return composer.datetimeFormats.value;
        },
        // numberFormats
        get numberFormats() {
            return composer.numberFormats.value;
        },
        // availableLocales
        get availableLocales() {
            return composer.availableLocales;
        },
        // missing
        get missing() {
            return composer.getMissingHandler();
        },
        set missing(handler) {
            composer.setMissingHandler(handler);
        },
        // silentTranslationWarn
        get silentTranslationWarn() {
            return isBoolean(composer.missingWarn)
                ? !composer.missingWarn
                : composer.missingWarn;
        },
        set silentTranslationWarn(val) {
            composer.missingWarn = isBoolean(val) ? !val : val;
        },
        // silentFallbackWarn
        get silentFallbackWarn() {
            return isBoolean(composer.fallbackWarn)
                ? !composer.fallbackWarn
                : composer.fallbackWarn;
        },
        set silentFallbackWarn(val) {
            composer.fallbackWarn = isBoolean(val) ? !val : val;
        },
        // modifiers
        get modifiers() {
            return composer.modifiers;
        },
        // formatFallbackMessages
        get formatFallbackMessages() {
            return composer.fallbackFormat;
        },
        set formatFallbackMessages(val) {
            composer.fallbackFormat = val;
        },
        // postTranslation
        get postTranslation() {
            return composer.getPostTranslationHandler();
        },
        set postTranslation(handler) {
            composer.setPostTranslationHandler(handler);
        },
        // sync
        get sync() {
            return composer.inheritLocale;
        },
        set sync(val) {
            composer.inheritLocale = val;
        },
        // warnInHtmlMessage
        get warnHtmlInMessage() {
            return composer.warnHtmlMessage ? 'warn' : 'off';
        },
        set warnHtmlInMessage(val) {
            composer.warnHtmlMessage = val !== 'off';
        },
        // escapeParameterHtml
        get escapeParameterHtml() {
            return composer.escapeParameter;
        },
        set escapeParameterHtml(val) {
            composer.escapeParameter = val;
        },
        // pluralizationRules
        get pluralizationRules() {
            return composer.pluralRules || {};
        },
        // for internal
        __composer: composer,
        // t
        t(...args) {
            return Reflect.apply(composer.t, composer, [...args]);
        },
        // rt
        rt(...args) {
            return Reflect.apply(composer.rt, composer, [...args]);
        },
        // te
        te(key, locale) {
            return composer.te(key, locale);
        },
        // tm
        tm(key) {
            return composer.tm(key);
        },
        // getLocaleMessage
        getLocaleMessage(locale) {
            return composer.getLocaleMessage(locale);
        },
        // setLocaleMessage
        setLocaleMessage(locale, message) {
            composer.setLocaleMessage(locale, message);
        },
        // mergeLocaleMessage
        mergeLocaleMessage(locale, message) {
            composer.mergeLocaleMessage(locale, message);
        },
        // d
        d(...args) {
            return Reflect.apply(composer.d, composer, [...args]);
        },
        // getDateTimeFormat
        getDateTimeFormat(locale) {
            return composer.getDateTimeFormat(locale);
        },
        // setDateTimeFormat
        setDateTimeFormat(locale, format) {
            composer.setDateTimeFormat(locale, format);
        },
        // mergeDateTimeFormat
        mergeDateTimeFormat(locale, format) {
            composer.mergeDateTimeFormat(locale, format);
        },
        // n
        n(...args) {
            return Reflect.apply(composer.n, composer, [...args]);
        },
        // getNumberFormat
        getNumberFormat(locale) {
            return composer.getNumberFormat(locale);
        },
        // setNumberFormat
        setNumberFormat(locale, format) {
            composer.setNumberFormat(locale, format);
        },
        // mergeNumberFormat
        mergeNumberFormat(locale, format) {
            composer.mergeNumberFormat(locale, format);
        }
    };
    vueI18n.__extender = __extender;
    // for vue-devtools timeline event
    {
        vueI18n.__enableEmitter = (emitter) => {
            const __composer = composer;
            __composer[EnableEmitter] && __composer[EnableEmitter](emitter);
        };
        vueI18n.__disableEmitter = () => {
            const __composer = composer;
            __composer[DisableEmitter] && __composer[DisableEmitter]();
        };
    }
    return vueI18n;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Supports compatibility for legacy vue-i18n APIs
 * This mixin is used when we use vue-i18n@v9.x or later
 */
function defineMixin(vuei18n, composer, i18n) {
    return {
        beforeCreate() {
            const instance = getCurrentInstance();
            /* istanbul ignore if */
            if (!instance) {
                throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
            }
            const options = this.$options;
            if (options.i18n) {
                const optionsI18n = options.i18n;
                if (options.__i18n) {
                    optionsI18n.__i18n = options.__i18n;
                }
                optionsI18n.__root = composer;
                if (this === this.$root) {
                    // merge option and gttach global
                    this.$i18n = mergeToGlobal(vuei18n, optionsI18n);
                }
                else {
                    optionsI18n.__injectWithOption = true;
                    optionsI18n.__extender = i18n.__vueI18nExtend;
                    // atttach local VueI18n instance
                    this.$i18n = createVueI18n(optionsI18n);
                    // extend VueI18n instance
                    const _vueI18n = this.$i18n;
                    if (_vueI18n.__extender) {
                        _vueI18n.__disposer = _vueI18n.__extender(this.$i18n);
                    }
                }
            }
            else if (options.__i18n) {
                if (this === this.$root) {
                    // merge option and gttach global
                    this.$i18n = mergeToGlobal(vuei18n, options);
                }
                else {
                    // atttach local VueI18n instance
                    this.$i18n = createVueI18n({
                        __i18n: options.__i18n,
                        __injectWithOption: true,
                        __extender: i18n.__vueI18nExtend,
                        __root: composer
                    });
                    // extend VueI18n instance
                    const _vueI18n = this.$i18n;
                    if (_vueI18n.__extender) {
                        _vueI18n.__disposer = _vueI18n.__extender(this.$i18n);
                    }
                }
            }
            else {
                // attach global VueI18n instance
                this.$i18n = vuei18n;
            }
            if (options.__i18nGlobal) {
                adjustI18nResources(composer, options, options);
            }
            // defines vue-i18n legacy APIs
            this.$t = (...args) => this.$i18n.t(...args);
            this.$rt = (...args) => this.$i18n.rt(...args);
            this.$te = (key, locale) => this.$i18n.te(key, locale);
            this.$d = (...args) => this.$i18n.d(...args);
            this.$n = (...args) => this.$i18n.n(...args);
            this.$tm = (key) => this.$i18n.tm(key);
            i18n.__setInstance(instance, this.$i18n);
        },
        mounted() {
            /* istanbul ignore if */
            if (this.$el &&
                this.$i18n) {
                const _vueI18n = this.$i18n;
                this.$el.__VUE_I18N__ = _vueI18n.__composer;
                const emitter = (this.__v_emitter =
                    createEmitter());
                _vueI18n.__enableEmitter && _vueI18n.__enableEmitter(emitter);
                emitter.on('*', addTimelineEvent);
            }
        },
        unmounted() {
            const instance = getCurrentInstance();
            /* istanbul ignore if */
            if (!instance) {
                throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
            }
            const _vueI18n = this.$i18n;
            /* istanbul ignore if */
            if (this.$el &&
                this.$el.__VUE_I18N__) {
                if (this.__v_emitter) {
                    this.__v_emitter.off('*', addTimelineEvent);
                    delete this.__v_emitter;
                }
                if (this.$i18n) {
                    _vueI18n.__disableEmitter && _vueI18n.__disableEmitter();
                    delete this.$el.__VUE_I18N__;
                }
            }
            delete this.$t;
            delete this.$rt;
            delete this.$te;
            delete this.$d;
            delete this.$n;
            delete this.$tm;
            if (_vueI18n.__disposer) {
                _vueI18n.__disposer();
                delete _vueI18n.__disposer;
                delete _vueI18n.__extender;
            }
            i18n.__deleteInstance(instance);
            delete this.$i18n;
        }
    };
}
function mergeToGlobal(g, options) {
    g.locale = options.locale || g.locale;
    g.fallbackLocale = options.fallbackLocale || g.fallbackLocale;
    g.missing = options.missing || g.missing;
    g.silentTranslationWarn =
        options.silentTranslationWarn || g.silentFallbackWarn;
    g.silentFallbackWarn = options.silentFallbackWarn || g.silentFallbackWarn;
    g.formatFallbackMessages =
        options.formatFallbackMessages || g.formatFallbackMessages;
    g.postTranslation = options.postTranslation || g.postTranslation;
    g.warnHtmlInMessage = options.warnHtmlInMessage || g.warnHtmlInMessage;
    g.escapeParameterHtml = options.escapeParameterHtml || g.escapeParameterHtml;
    g.sync = options.sync || g.sync;
    g.__composer[SetPluralRulesSymbol](options.pluralizationRules || g.pluralizationRules);
    const messages = getLocaleMessages(g.locale, {
        messages: options.messages,
        __i18n: options.__i18n
    });
    Object.keys(messages).forEach(locale => g.mergeLocaleMessage(locale, messages[locale]));
    if (options.datetimeFormats) {
        Object.keys(options.datetimeFormats).forEach(locale => g.mergeDateTimeFormat(locale, options.datetimeFormats[locale]));
    }
    if (options.numberFormats) {
        Object.keys(options.numberFormats).forEach(locale => g.mergeNumberFormat(locale, options.numberFormats[locale]));
    }
    return g;
}

const baseFormatProps = {
    tag: {
        type: [String, Object]
    },
    locale: {
        type: String
    },
    scope: {
        type: String,
        // NOTE: avoid https://github.com/microsoft/rushstack/issues/1050
        validator: (val /* ComponentI18nScope */) => val === 'parent' || val === 'global',
        default: 'parent' /* ComponentI18nScope */
    },
    i18n: {
        type: Object
    }
};

function getInterpolateArg(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
{ slots }, // SetupContext,
keys) {
    if (keys.length === 1 && keys[0] === 'default') {
        // default slot with list
        const ret = slots.default ? slots.default() : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ret.reduce((slot, current) => {
            return [
                ...slot,
                // prettier-ignore
                ...(current.type === Fragment ? current.children : [current])
            ];
        }, []);
    }
    else {
        // named slots
        return keys.reduce((arg, key) => {
            const slot = slots[key];
            if (slot) {
                arg[key] = slot();
            }
            return arg;
        }, create());
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFragmentableTag() {
    return Fragment;
}

const TranslationImpl = /*#__PURE__*/ defineComponent({
    /* eslint-disable */
    name: 'i18n-t',
    props: assign({
        keypath: {
            type: String,
            required: true
        },
        plural: {
            type: [Number, String],
            validator: (val) => isNumber(val) || !isNaN(val)
        }
    }, baseFormatProps),
    /* eslint-enable */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setup(props, context) {
        const { slots, attrs } = context;
        // NOTE: avoid https://github.com/microsoft/rushstack/issues/1050
        const i18n = props.i18n ||
            useI18n({
                useScope: props.scope,
                __useComponent: true
            });
        return () => {
            const keys = Object.keys(slots).filter(key => key[0] !== '_');
            const options = create();
            if (props.locale) {
                options.locale = props.locale;
            }
            if (props.plural !== undefined) {
                options.plural = isString(props.plural) ? +props.plural : props.plural;
            }
            const arg = getInterpolateArg(context, keys);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const children = i18n[TranslateVNodeSymbol](props.keypath, arg, options);
            const assignedAttrs = assign(create(), attrs);
            const tag = isString(props.tag) || isObject(props.tag)
                ? props.tag
                : getFragmentableTag();
            return h(tag, assignedAttrs, children);
        };
    }
});
/**
 * export the public type for h/tsx inference
 * also to avoid inline import() in generated d.ts files
 */
/**
 * Translation Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [TranslationProps](component#translationprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Component Interpolation](../guide/advanced/component)
 *
 * @example
 * ```html
 * <div id="app">
 *   <!-- ... -->
 *   <i18n keypath="term" tag="label" for="tos">
 *     <a :href="url" target="_blank">{{ $t('tos') }}</a>
 *   </i18n>
 *   <!-- ... -->
 * </div>
 * ```
 * ```js
 * import { createApp } from 'vue'
 * import { createI18n } from 'vue-i18n'
 *
 * const messages = {
 *   en: {
 *     tos: 'Term of Service',
 *     term: 'I accept xxx {0}.'
 *   },
 *   ja: {
 *     tos: '利用規約',
 *     term: '私は xxx の{0}に同意します。'
 *   }
 * }
 *
 * const i18n = createI18n({
 *   locale: 'en',
 *   messages
 * })
 *
 * const app = createApp({
 *   data: {
 *     url: '/term'
 *   }
 * }).use(i18n).mount('#app')
 * ```
 *
 * @VueI18nComponent
 */
const Translation = TranslationImpl;
const I18nT = Translation;

function isVNode(target) {
    return isArray(target) && !isString(target[0]);
}
function renderFormatter(props, context, slotKeys, partFormatter) {
    const { slots, attrs } = context;
    return () => {
        const options = { part: true };
        let overrides = create();
        if (props.locale) {
            options.locale = props.locale;
        }
        if (isString(props.format)) {
            options.key = props.format;
        }
        else if (isObject(props.format)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (isString(props.format.key)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options.key = props.format.key;
            }
            // Filter out number format options only
            overrides = Object.keys(props.format).reduce((options, prop) => {
                return slotKeys.includes(prop)
                    ? assign(create(), options, { [prop]: props.format[prop] }) // eslint-disable-line @typescript-eslint/no-explicit-any
                    : options;
            }, create());
        }
        const parts = partFormatter(...[props.value, options, overrides]);
        let children = [options.key];
        if (isArray(parts)) {
            children = parts.map((part, index) => {
                const slot = slots[part.type];
                const node = slot
                    ? slot({ [part.type]: part.value, index, parts })
                    : [part.value];
                if (isVNode(node)) {
                    node[0].key = `${part.type}-${index}`;
                }
                return node;
            });
        }
        else if (isString(parts)) {
            children = [parts];
        }
        const assignedAttrs = assign(create(), attrs);
        const tag = isString(props.tag) || isObject(props.tag)
            ? props.tag
            : getFragmentableTag();
        return h(tag, assignedAttrs, children);
    };
}

const NumberFormatImpl = /*#__PURE__*/ defineComponent({
    /* eslint-disable */
    name: 'i18n-n',
    props: assign({
        value: {
            type: Number,
            required: true
        },
        format: {
            type: [String, Object]
        }
    }, baseFormatProps),
    /* eslint-enable */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setup(props, context) {
        const i18n = props.i18n ||
            useI18n({
                useScope: props.scope,
                __useComponent: true
            });
        return renderFormatter(props, context, NUMBER_FORMAT_OPTIONS_KEYS, (...args) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i18n[NumberPartsSymbol](...args));
    }
});
/**
 * export the public type for h/tsx inference
 * also to avoid inline import() in generated d.ts files
 */
/**
 * Number Format Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [FormattableProps](component#formattableprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Custom Formatting](../guide/essentials/number#custom-formatting)
 *
 * @VueI18nDanger
 * Not supported IE, due to no support `Intl.NumberFormat#formatToParts` in [IE](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts)
 *
 * If you want to use it, you need to use [polyfill](https://github.com/formatjs/formatjs/tree/main/packages/intl-numberformat)
 *
 * @VueI18nComponent
 */
const NumberFormat = NumberFormatImpl;
const I18nN = NumberFormat;

function getComposer$1(i18n, instance) {
    const i18nInternal = i18n;
    if (i18n.mode === 'composition') {
        return (i18nInternal.__getInstance(instance) || i18n.global);
    }
    else {
        const vueI18n = i18nInternal.__getInstance(instance);
        return vueI18n != null
            ? vueI18n.__composer
            : i18n.global.__composer;
    }
}
/**
 * @deprecated will be removed at vue-i18n v12
 */
function vTDirective(i18n) {
    const _process = (binding) => {
        {
            warnOnce(getWarnMessage(I18nWarnCodes.DEPRECATE_TRANSLATE_CUSTOME_DIRECTIVE));
        }
        const { instance, value } = binding;
        /* istanbul ignore if */
        if (!instance || !instance.$) {
            throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
        }
        const composer = getComposer$1(i18n, instance.$);
        const parsedValue = parseValue(value);
        return [
            Reflect.apply(composer.t, composer, [...makeParams(parsedValue)]),
            composer
        ];
    };
    const register = (el, binding) => {
        const [textContent, composer] = _process(binding);
        if (inBrowser && i18n.global === composer) {
            // global scope only
            el.__i18nWatcher = watch(composer.locale, () => {
                binding.instance && binding.instance.$forceUpdate();
            });
        }
        el.__composer = composer;
        el.textContent = textContent;
    };
    const unregister = (el) => {
        if (inBrowser && el.__i18nWatcher) {
            el.__i18nWatcher();
            el.__i18nWatcher = undefined;
            delete el.__i18nWatcher;
        }
        if (el.__composer) {
            el.__composer = undefined;
            delete el.__composer;
        }
    };
    const update = (el, { value }) => {
        if (el.__composer) {
            const composer = el.__composer;
            const parsedValue = parseValue(value);
            el.textContent = Reflect.apply(composer.t, composer, [
                ...makeParams(parsedValue)
            ]);
        }
    };
    const getSSRProps = (binding) => {
        const [textContent] = _process(binding);
        return { textContent };
    };
    return {
        created: register,
        unmounted: unregister,
        beforeUpdate: update,
        getSSRProps
    };
}
function parseValue(value) {
    if (isString(value)) {
        return { path: value };
    }
    else if (isPlainObject(value)) {
        if (!('path' in value)) {
            throw createI18nError(I18nErrorCodes.REQUIRED_VALUE, 'path');
        }
        return value;
    }
    else {
        throw createI18nError(I18nErrorCodes.INVALID_VALUE);
    }
}
function makeParams(value) {
    const { path, locale, args, choice, plural } = value;
    const options = {};
    const named = args || {};
    if (isString(locale)) {
        options.locale = locale;
    }
    if (isNumber(choice)) {
        options.plural = choice;
    }
    if (isNumber(plural)) {
        options.plural = plural;
    }
    return [path, named, options];
}

function apply(app, i18n, ...options) {
    const pluginOptions = isPlainObject(options[0])
        ? options[0]
        : {};
    const globalInstall = isBoolean(pluginOptions.globalInstall)
        ? pluginOptions.globalInstall
        : true;
    if (globalInstall) {
        [Translation.name, 'I18nT'].forEach(name => app.component(name, Translation));
        [NumberFormat.name, 'I18nN'].forEach(name => app.component(name, NumberFormat));
        [DatetimeFormat.name, 'I18nD'].forEach(name => app.component(name, DatetimeFormat));
    }
    // install directive
    {
        app.directive('t', vTDirective(i18n));
    }
}

/**
 * Injection key for {@link useI18n}
 *
 * @remarks
 * The global injection key for I18n instances with `useI18n`. this injection key is used in Web Components.
 * Specify the i18n instance created by {@link createI18n} together with `provide` function.
 *
 * @VueI18nGeneral
 */
const I18nInjectionKey = 
/* #__PURE__*/ makeSymbol('global-vue-i18n');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createI18n(options = {}) {
    // prettier-ignore
    const __legacyMode = isBoolean(options.legacy)
            ? options.legacy
            : true;
    if (__legacyMode) {
        warnOnce(getWarnMessage(I18nWarnCodes.DEPRECATE_LEGACY_MODE));
    }
    // prettier-ignore
    const __globalInjection = isBoolean(options.globalInjection)
        ? options.globalInjection
        : true;
    const __instances = new Map();
    const [globalScope, __global] = createGlobal(options, __legacyMode);
    const symbol = /* #__PURE__*/ makeSymbol('vue-i18n' );
    function __getInstance(component) {
        return __instances.get(component) || null;
    }
    function __setInstance(component, instance) {
        __instances.set(component, instance);
    }
    function __deleteInstance(component) {
        __instances.delete(component);
    }
    const i18n = {
        // mode
        get mode() {
            return __legacyMode
                ? 'legacy'
                : 'composition';
        },
        // install plugin
        async install(app, ...options) {
            {
                app.__VUE_I18N__ = i18n;
            }
            // setup global provider
            app.__VUE_I18N_SYMBOL__ = symbol;
            app.provide(app.__VUE_I18N_SYMBOL__, i18n);
            // set composer & vuei18n extend hook options from plugin options
            if (isPlainObject(options[0])) {
                const opts = options[0];
                i18n.__composerExtend =
                    opts.__composerExtend;
                i18n.__vueI18nExtend =
                    opts.__vueI18nExtend;
            }
            // global method and properties injection for Composition API
            let globalReleaseHandler = null;
            if (!__legacyMode && __globalInjection) {
                globalReleaseHandler = injectGlobalFields(app, i18n.global);
            }
            // install built-in components and directive
            {
                apply(app, i18n, ...options);
            }
            // setup mixin for Legacy API
            if (__legacyMode) {
                app.mixin(defineMixin(__global, __global.__composer, i18n));
            }
            // release global scope
            const unmountApp = app.unmount;
            app.unmount = () => {
                globalReleaseHandler && globalReleaseHandler();
                i18n.dispose();
                unmountApp();
            };
            // setup vue-devtools plugin
            {
                const ret = await enableDevTools(app, i18n);
                if (!ret) {
                    throw createI18nError(I18nErrorCodes.CANNOT_SETUP_VUE_DEVTOOLS_PLUGIN);
                }
                const emitter = createEmitter();
                if (__legacyMode) {
                    const _vueI18n = __global;
                    _vueI18n.__enableEmitter && _vueI18n.__enableEmitter(emitter);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const _composer = __global;
                    _composer[EnableEmitter] && _composer[EnableEmitter](emitter);
                }
                emitter.on('*', addTimelineEvent);
            }
        },
        // global accessor
        get global() {
            return __global;
        },
        dispose() {
            globalScope.stop();
        },
        // @internal
        __instances,
        // @internal
        __getInstance,
        // @internal
        __setInstance,
        // @internal
        __deleteInstance
    };
    return i18n;
}
function useI18n(options = {}) {
    const instance = getCurrentInstance();
    if (instance == null) {
        throw createI18nError(I18nErrorCodes.MUST_BE_CALL_SETUP_TOP);
    }
    if (!instance.isCE &&
        instance.appContext.app != null &&
        !instance.appContext.app.__VUE_I18N_SYMBOL__) {
        throw createI18nError(I18nErrorCodes.NOT_INSTALLED);
    }
    const i18n = getI18nInstance(instance);
    const gl = getGlobalComposer(i18n);
    const componentOptions = getComponentOptions(instance);
    const scope = getScope(options, componentOptions);
    if (scope === 'global') {
        adjustI18nResources(gl, options, componentOptions);
        return gl;
    }
    if (scope === 'parent') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let composer = getComposer(i18n, instance, options.__useComponent);
        if (composer == null) {
            {
                warn(getWarnMessage(I18nWarnCodes.NOT_FOUND_PARENT_SCOPE));
            }
            composer = gl;
        }
        return composer;
    }
    const i18nInternal = i18n;
    let composer = i18nInternal.__getInstance(instance);
    if (composer == null) {
        const composerOptions = assign({}, options);
        if ('__i18n' in componentOptions) {
            composerOptions.__i18n = componentOptions.__i18n;
        }
        if (gl) {
            composerOptions.__root = gl;
        }
        composer = createComposer(composerOptions);
        if (i18nInternal.__composerExtend) {
            composer[DisposeSymbol] =
                i18nInternal.__composerExtend(composer);
        }
        setupLifeCycle(i18nInternal, instance, composer);
        i18nInternal.__setInstance(instance, composer);
    }
    else {
        if (scope === 'local') {
            throw createI18nError(I18nErrorCodes.DUPLICATE_USE_I18N_CALLING);
        }
    }
    return composer;
}
function createGlobal(options, legacyMode) {
    const scope = effectScope();
    const obj = legacyMode
        ? scope.run(() => createVueI18n(options))
        : scope.run(() => createComposer(options));
    if (obj == null) {
        throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
    }
    return [scope, obj];
}
function getI18nInstance(instance) {
    const i18n = inject(!instance.isCE
        ? instance.appContext.app.__VUE_I18N_SYMBOL__
        : I18nInjectionKey);
    /* istanbul ignore if */
    if (!i18n) {
        throw createI18nError(!instance.isCE
            ? I18nErrorCodes.UNEXPECTED_ERROR
            : I18nErrorCodes.NOT_INSTALLED_WITH_PROVIDE);
    }
    return i18n;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getScope(options, componentOptions) {
    // prettier-ignore
    return isEmptyObject(options)
        ? ('__i18n' in componentOptions)
            ? 'local'
            : 'global'
        : !options.useScope
            ? 'local'
            : options.useScope;
}
function getGlobalComposer(i18n) {
    // prettier-ignore
    return i18n.mode === 'composition'
        ? i18n.global
        : i18n.global.__composer;
}
function getComposer(i18n, target, useComponent = false) {
    let composer = null;
    const root = target.root;
    let current = getParentComponentInstance(target, useComponent);
    while (current != null) {
        const i18nInternal = i18n;
        if (i18n.mode === 'composition') {
            composer = i18nInternal.__getInstance(current);
        }
        else {
            {
                const vueI18n = i18nInternal.__getInstance(current);
                if (vueI18n != null) {
                    composer = vueI18n
                        .__composer;
                    if (useComponent &&
                        composer &&
                        !composer[InejctWithOptionSymbol] // eslint-disable-line @typescript-eslint/no-explicit-any
                    ) {
                        composer = null;
                    }
                }
            }
        }
        if (composer != null) {
            break;
        }
        if (root === current) {
            break;
        }
        current = current.parent;
    }
    return composer;
}
function getParentComponentInstance(target, useComponent = false) {
    if (target == null) {
        return null;
    }
    // if `useComponent: true` will be specified, we get lexical scope owner instance for use-case slots
    return !useComponent
        ? target.parent
        : target.vnode.ctx || target.parent; // eslint-disable-line @typescript-eslint/no-explicit-any
}
function setupLifeCycle(i18n, target, composer) {
    let emitter = null;
    onMounted(() => {
        // inject composer instance to DOM for intlify-devtools
        if (target.vnode.el) {
            target.vnode.el.__VUE_I18N__ = composer;
            emitter = createEmitter();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const _composer = composer;
            _composer[EnableEmitter] && _composer[EnableEmitter](emitter);
            emitter.on('*', addTimelineEvent);
        }
    }, target);
    onUnmounted(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const _composer = composer;
        // remove composer instance from DOM for intlify-devtools
        if (target.vnode.el &&
            target.vnode.el.__VUE_I18N__) {
            emitter && emitter.off('*', addTimelineEvent);
            _composer[DisableEmitter] && _composer[DisableEmitter]();
            delete target.vnode.el.__VUE_I18N__;
        }
        i18n.__deleteInstance(target);
        // dispose extended resources
        const dispose = _composer[DisposeSymbol];
        if (dispose) {
            dispose();
            delete _composer[DisposeSymbol];
        }
    }, target);
}
const globalExportProps = [
    'locale',
    'fallbackLocale',
    'availableLocales'
];
const globalExportMethods = ['t', 'rt', 'd', 'n', 'tm', 'te']
    ;
function injectGlobalFields(app, composer) {
    const i18n = Object.create(null);
    globalExportProps.forEach(prop => {
        const desc = Object.getOwnPropertyDescriptor(composer, prop);
        if (!desc) {
            throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
        }
        const wrap = isRef(desc.value) // check computed props
            ? {
                get() {
                    return desc.value.value;
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                set(val) {
                    desc.value.value = val;
                }
            }
            : {
                get() {
                    return desc.get && desc.get();
                }
            };
        Object.defineProperty(i18n, prop, wrap);
    });
    app.config.globalProperties.$i18n = i18n;
    globalExportMethods.forEach(method => {
        const desc = Object.getOwnPropertyDescriptor(composer, method);
        if (!desc || !desc.value) {
            throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
        }
        Object.defineProperty(app.config.globalProperties, `$${method}`, desc);
    });
    const dispose = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete app.config.globalProperties.$i18n;
        globalExportMethods.forEach(method => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete app.config.globalProperties[`$${method}`];
        });
    };
    return dispose;
}

const DatetimeFormatImpl = /* #__PURE__*/ defineComponent({
    /* eslint-disable */
    name: 'i18n-d',
    props: assign({
        value: {
            type: [Number, Date],
            required: true
        },
        format: {
            type: [String, Object]
        }
    }, baseFormatProps),
    /* eslint-enable */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setup(props, context) {
        const i18n = props.i18n ||
            useI18n({
                useScope: props.scope,
                __useComponent: true
            });
        return renderFormatter(props, context, DATETIME_FORMAT_OPTIONS_KEYS, (...args) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i18n[DatetimePartsSymbol](...args));
    }
});
/**
 * Datetime Format Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [FormattableProps](component#formattableprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Custom Formatting](../guide/essentials/datetime#custom-formatting)
 *
 * @VueI18nDanger
 * Not supported IE, due to no support `Intl.DateTimeFormat#formatToParts` in [IE](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts)
 *
 * If you want to use it, you need to use [polyfill](https://github.com/formatjs/formatjs/tree/main/packages/intl-datetimeformat)
 *
 * @VueI18nComponent
 */
const DatetimeFormat = DatetimeFormatImpl;
const I18nD = DatetimeFormat;

// register message compiler for jit compilation
registerMessageCompiler(compile);
// register message resolver at vue-i18n
registerMessageResolver(resolveValue);
// register fallback locale at vue-i18n
registerLocaleFallbacker(fallbackWithLocaleChain);
// NOTE: experimental !!
{
    const target = getGlobalThis();
    target.__INTLIFY__ = true;
    setDevToolsHook(target.__INTLIFY_DEVTOOLS_GLOBAL_HOOK__);
}
{
    initDev();
}

export { DatetimeFormat, I18nD, I18nInjectionKey, I18nN, I18nT, NumberFormat, Translation, VERSION, createI18n, useI18n, vTDirective };
