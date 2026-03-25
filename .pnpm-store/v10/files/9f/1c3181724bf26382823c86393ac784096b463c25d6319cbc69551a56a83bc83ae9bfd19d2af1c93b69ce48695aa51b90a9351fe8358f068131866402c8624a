/*!
  * vue-i18n v11.1.10
  * (c) 2025 kazuya kawaguchi
  * Released under the MIT License.
  */
import { CORE_ERROR_CODES_EXTEND_POINT, createCompileError, isMessageAST, AST_NODE_PROPS_KEYS, DEFAULT_LOCALE, updateFallbackLocale, setFallbackContext, createCoreContext, clearDateTimeFormat, clearNumberFormat, setAdditionalMeta, getFallbackContext, NOT_REOSLVED, parseTranslateArgs, translate, MISSING_RESOLVE_VALUE, parseDateTimeArgs, datetime, parseNumberArgs, number, isMessageFunction, fallbackWithLocaleChain, NUMBER_FORMAT_OPTIONS_KEYS, DATETIME_FORMAT_OPTIONS_KEYS, registerMessageCompiler, compile, registerMessageResolver, resolveValue, registerLocaleFallbacker, setDevToolsHook } from '@intlify/core-base';
import { getGlobalThis, makeSymbol, isObject, create, isPlainObject, isArray, deepCopy, isString, hasOwn, isBoolean, isRegExp, isFunction, inBrowser, assign, isNumber, isEmptyObject } from '@intlify/shared';
import { createVNode, Text, computed, watch, getCurrentInstance, ref, shallowRef, Fragment, defineComponent, h, effectScope, inject, onMounted, onUnmounted, isRef } from 'vue';

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
 * This is only called in esm-bundler builds.
 * istanbul-ignore-next
 */
function initFeatureFlags() {
    if (typeof __VUE_I18N_FULL_INSTALL__ !== 'boolean') {
        getGlobalThis().__VUE_I18N_FULL_INSTALL__ = true;
    }
    if (typeof __VUE_I18N_LEGACY_API__ !== 'boolean') {
        getGlobalThis().__VUE_I18N_LEGACY_API__ = true;
    }
    if (typeof __INTLIFY_DROP_MESSAGE_COMPILER__ !== 'boolean') {
        getGlobalThis().__INTLIFY_DROP_MESSAGE_COMPILER__ = false;
    }
    if (typeof __INTLIFY_PROD_DEVTOOLS__ !== 'boolean') {
        getGlobalThis().__INTLIFY_PROD_DEVTOOLS__ = false;
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
    return createCompileError(code, null, undefined);
}

const TranslateVNodeSymbol = 
/* #__PURE__*/ makeSymbol('__translateVNode');
const DatetimePartsSymbol = /* #__PURE__*/ makeSymbol('__datetimeParts');
const NumberPartsSymbol = /* #__PURE__*/ makeSymbol('__numberParts');
const SetPluralRulesSymbol = makeSymbol('__setPluralRules');
makeSymbol('__intlifyMeta');
const InejctWithOptionSymbol = 
/* #__PURE__*/ makeSymbol('__injectWithOption');
const DisposeSymbol = /* #__PURE__*/ makeSymbol('__dispose');

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
    const wrapWithDeps = (fn, argumentParser, warnType, fallbackSuccess, fallbackFail, successCondition) => {
        trackReactivityValues(); // track reactive dependency
        // NOTE: experimental !!
        let ret;
        try {
            if (false || __INTLIFY_PROD_DEVTOOLS__) {
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
            if (__INTLIFY_PROD_DEVTOOLS__) {
                setAdditionalMeta(null);
            }
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
    return composer;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
        },
        unmounted() {
            const instance = getCurrentInstance();
            /* istanbul ignore if */
            if (!instance) {
                throw createI18nError(I18nErrorCodes.UNEXPECTED_ERROR);
            }
            const _vueI18n = this.$i18n;
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
    const __legacyMode = __VUE_I18N_LEGACY_API__ && isBoolean(options.legacy)
            ? options.legacy
            : __VUE_I18N_LEGACY_API__;
    // prettier-ignore
    const __globalInjection = isBoolean(options.globalInjection)
        ? options.globalInjection
        : true;
    const __instances = new Map();
    const [globalScope, __global] = createGlobal(options, __legacyMode);
    const symbol = /* #__PURE__*/ makeSymbol('');
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
            return __VUE_I18N_LEGACY_API__ && __legacyMode
                ? 'legacy'
                : 'composition';
        },
        // install plugin
        async install(app, ...options) {
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
            if (__VUE_I18N_FULL_INSTALL__) {
                apply(app, i18n, ...options);
            }
            // setup mixin for Legacy API
            if (__VUE_I18N_LEGACY_API__ && __legacyMode) {
                app.mixin(defineMixin(__global, __global.__composer, i18n));
            }
            // release global scope
            const unmountApp = app.unmount;
            app.unmount = () => {
                globalReleaseHandler && globalReleaseHandler();
                i18n.dispose();
                unmountApp();
            };
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
    return composer;
}
function createGlobal(options, legacyMode) {
    const scope = effectScope();
    const obj = __VUE_I18N_LEGACY_API__ && legacyMode
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
            if (__VUE_I18N_LEGACY_API__) {
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
    onMounted(() => {
    }, target);
    onUnmounted(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const _composer = composer;
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

{
    initFeatureFlags();
}
// register message compiler for jit compilation
registerMessageCompiler(compile);
// register message resolver at vue-i18n
registerMessageResolver(resolveValue);
// register fallback locale at vue-i18n
registerLocaleFallbacker(fallbackWithLocaleChain);
// NOTE: experimental !!
if (__INTLIFY_PROD_DEVTOOLS__) {
    const target = getGlobalThis();
    target.__INTLIFY__ = true;
    setDevToolsHook(target.__INTLIFY_DEVTOOLS_GLOBAL_HOOK__);
}

export { DatetimeFormat, I18nD, I18nInjectionKey, I18nN, I18nT, NumberFormat, Translation, VERSION, createI18n, useI18n, vTDirective };
