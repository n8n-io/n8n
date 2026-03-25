"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    INTERNAL_FEATURES: function() {
        return INTERNAL_FEATURES;
    },
    isValidVariantFormatString: function() {
        return isValidVariantFormatString;
    },
    parseVariant: function() {
        return parseVariant;
    },
    getFileModifiedMap: function() {
        return getFileModifiedMap;
    },
    createContext: function() {
        return createContext;
    },
    getContext: function() {
        return getContext;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _url = /*#__PURE__*/ _interop_require_default(require("url"));
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _dlv = /*#__PURE__*/ _interop_require_default(require("dlv"));
const _postcssselectorparser = /*#__PURE__*/ _interop_require_default(require("postcss-selector-parser"));
const _transformThemeValue = /*#__PURE__*/ _interop_require_default(require("../util/transformThemeValue"));
const _parseObjectStyles = /*#__PURE__*/ _interop_require_default(require("../util/parseObjectStyles"));
const _prefixSelector = /*#__PURE__*/ _interop_require_default(require("../util/prefixSelector"));
const _isPlainObject = /*#__PURE__*/ _interop_require_default(require("../util/isPlainObject"));
const _escapeClassName = /*#__PURE__*/ _interop_require_default(require("../util/escapeClassName"));
const _nameClass = /*#__PURE__*/ _interop_require_wildcard(require("../util/nameClass"));
const _pluginUtils = require("../util/pluginUtils");
const _corePlugins = require("../corePlugins");
const _sharedState = /*#__PURE__*/ _interop_require_wildcard(require("./sharedState"));
const _toPath = require("../util/toPath");
const _log = /*#__PURE__*/ _interop_require_default(require("../util/log"));
const _negateValue = /*#__PURE__*/ _interop_require_default(require("../util/negateValue"));
const _isSyntacticallyValidPropertyValue = /*#__PURE__*/ _interop_require_default(require("../util/isSyntacticallyValidPropertyValue"));
const _generateRules = require("./generateRules");
const _cacheInvalidation = require("./cacheInvalidation.js");
const _offsets = require("./offsets.js");
const _featureFlags = require("../featureFlags.js");
const _formatVariantSelector = require("../util/formatVariantSelector");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
const INTERNAL_FEATURES = Symbol();
const VARIANT_TYPES = {
    AddVariant: Symbol.for("ADD_VARIANT"),
    MatchVariant: Symbol.for("MATCH_VARIANT")
};
const VARIANT_INFO = {
    Base: 1 << 0,
    Dynamic: 1 << 1
};
function prefix(context, selector) {
    let prefix = context.tailwindConfig.prefix;
    return typeof prefix === "function" ? prefix(selector) : prefix + selector;
}
function normalizeOptionTypes({ type ="any" , ...options }) {
    let types = [].concat(type);
    return {
        ...options,
        types: types.map((type)=>{
            if (Array.isArray(type)) {
                return {
                    type: type[0],
                    ...type[1]
                };
            }
            return {
                type,
                preferOnConflict: false
            };
        })
    };
}
function parseVariantFormatString(input) {
    /** @type {string[]} */ let parts = [];
    // When parsing whitespace around special characters are insignificant
    // However, _inside_ of a variant they could be
    // Because the selector could look like this
    // @media { &[data-name="foo bar"] }
    // This is why we do not skip whitespace
    let current = "";
    let depth = 0;
    for(let idx = 0; idx < input.length; idx++){
        let char = input[idx];
        if (char === "\\") {
            // Escaped characters are not special
            current += "\\" + input[++idx];
        } else if (char === "{") {
            // Nested rule: start
            ++depth;
            parts.push(current.trim());
            current = "";
        } else if (char === "}") {
            // Nested rule: end
            if (--depth < 0) {
                throw new Error(`Your { and } are unbalanced.`);
            }
            parts.push(current.trim());
            current = "";
        } else {
            // Normal character
            current += char;
        }
    }
    if (current.length > 0) {
        parts.push(current.trim());
    }
    parts = parts.filter((part)=>part !== "");
    return parts;
}
function insertInto(list, value, { before =[]  } = {}) {
    before = [].concat(before);
    if (before.length <= 0) {
        list.push(value);
        return;
    }
    let idx = list.length - 1;
    for (let other of before){
        let iidx = list.indexOf(other);
        if (iidx === -1) continue;
        idx = Math.min(idx, iidx);
    }
    list.splice(idx, 0, value);
}
function parseStyles(styles) {
    if (!Array.isArray(styles)) {
        return parseStyles([
            styles
        ]);
    }
    return styles.flatMap((style)=>{
        let isNode = !Array.isArray(style) && !(0, _isPlainObject.default)(style);
        return isNode ? style : (0, _parseObjectStyles.default)(style);
    });
}
function getClasses(selector, mutate) {
    let parser = (0, _postcssselectorparser.default)((selectors)=>{
        let allClasses = [];
        if (mutate) {
            mutate(selectors);
        }
        selectors.walkClasses((classNode)=>{
            allClasses.push(classNode.value);
        });
        return allClasses;
    });
    return parser.transformSync(selector);
}
/**
 * Ignore everything inside a :not(...). This allows you to write code like
 * `div:not(.foo)`. If `.foo` is never found in your code, then we used to
 * not generated it. But now we will ignore everything inside a `:not`, so
 * that it still gets generated.
 *
 * @param {selectorParser.Root} selectors
 */ function ignoreNot(selectors) {
    selectors.walkPseudos((pseudo)=>{
        if (pseudo.value === ":not") {
            pseudo.remove();
        }
    });
}
function extractCandidates(node, state = {
    containsNonOnDemandable: false
}, depth = 0) {
    let classes = [];
    let selectors = [];
    if (node.type === "rule") {
        // Handle normal rules
        selectors.push(...node.selectors);
    } else if (node.type === "atrule") {
        // Handle at-rules (which contains nested rules)
        node.walkRules((rule)=>selectors.push(...rule.selectors));
    }
    for (let selector of selectors){
        let classCandidates = getClasses(selector, ignoreNot);
        // At least one of the selectors contains non-"on-demandable" candidates.
        if (classCandidates.length === 0) {
            state.containsNonOnDemandable = true;
        }
        for (let classCandidate of classCandidates){
            classes.push(classCandidate);
        }
    }
    if (depth === 0) {
        return [
            state.containsNonOnDemandable || classes.length === 0,
            classes
        ];
    }
    return classes;
}
function withIdentifiers(styles) {
    return parseStyles(styles).flatMap((node)=>{
        let nodeMap = new Map();
        let [containsNonOnDemandableSelectors, candidates] = extractCandidates(node);
        // If this isn't "on-demandable", assign it a universal candidate to always include it.
        if (containsNonOnDemandableSelectors) {
            candidates.unshift(_sharedState.NOT_ON_DEMAND);
        }
        // However, it could be that it also contains "on-demandable" candidates.
        // E.g.: `span, .foo {}`, in that case it should still be possible to use
        // `@apply foo` for example.
        return candidates.map((c)=>{
            if (!nodeMap.has(node)) {
                nodeMap.set(node, node);
            }
            return [
                c,
                nodeMap.get(node)
            ];
        });
    });
}
function isValidVariantFormatString(format) {
    return format.startsWith("@") || format.includes("&");
}
function parseVariant(variant) {
    variant = variant.replace(/\n+/g, "").replace(/\s{1,}/g, " ").trim();
    let fns = parseVariantFormatString(variant).map((str)=>{
        if (!str.startsWith("@")) {
            return ({ format  })=>format(str);
        }
        let [, name, params] = /@(\S*)( .+|[({].*)?/g.exec(str);
        var _params_trim;
        return ({ wrap  })=>{
            return wrap(_postcss.default.atRule({
                name,
                params: (_params_trim = params === null || params === void 0 ? void 0 : params.trim()) !== null && _params_trim !== void 0 ? _params_trim : ""
            }));
        };
    }).reverse();
    return (api)=>{
        for (let fn of fns){
            fn(api);
        }
    };
}
/**
 *
 * @param {any} tailwindConfig
 * @param {any} context
 * @param {object} param2
 * @param {Offsets} param2.offsets
 */ function buildPluginApi(tailwindConfig, context, { variantList , variantMap , offsets , classList  }) {
    function getConfigValue(path, defaultValue) {
        return path ? (0, _dlv.default)(tailwindConfig, path, defaultValue) : tailwindConfig;
    }
    function applyConfiguredPrefix(selector) {
        return (0, _prefixSelector.default)(tailwindConfig.prefix, selector);
    }
    function prefixIdentifier(identifier, options) {
        if (identifier === _sharedState.NOT_ON_DEMAND) {
            return _sharedState.NOT_ON_DEMAND;
        }
        if (!options.respectPrefix) {
            return identifier;
        }
        return context.tailwindConfig.prefix + identifier;
    }
    function resolveThemeValue(path, defaultValue, opts = {}) {
        let parts = (0, _toPath.toPath)(path);
        let value = getConfigValue([
            "theme",
            ...parts
        ], defaultValue);
        return (0, _transformThemeValue.default)(parts[0])(value, opts);
    }
    let variantIdentifier = 0;
    let api = {
        postcss: _postcss.default,
        prefix: applyConfiguredPrefix,
        e: _escapeClassName.default,
        config: getConfigValue,
        theme: resolveThemeValue,
        corePlugins: (path)=>{
            if (Array.isArray(tailwindConfig.corePlugins)) {
                return tailwindConfig.corePlugins.includes(path);
            }
            return getConfigValue([
                "corePlugins",
                path
            ], true);
        },
        variants: ()=>{
            // Preserved for backwards compatibility but not used in v3.0+
            return [];
        },
        addBase (base) {
            for (let [identifier, rule] of withIdentifiers(base)){
                let prefixedIdentifier = prefixIdentifier(identifier, {});
                let offset = offsets.create("base");
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push([
                    {
                        sort: offset,
                        layer: "base"
                    },
                    rule
                ]);
            }
        },
        /**
     * @param {string} group
     * @param {Record<string, string | string[]>} declarations
     */ addDefaults (group, declarations) {
            const groups = {
                [`@defaults ${group}`]: declarations
            };
            for (let [identifier, rule] of withIdentifiers(groups)){
                let prefixedIdentifier = prefixIdentifier(identifier, {});
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push([
                    {
                        sort: offsets.create("defaults"),
                        layer: "defaults"
                    },
                    rule
                ]);
            }
        },
        addComponents (components, options) {
            let defaultOptions = {
                preserveSource: false,
                respectPrefix: true,
                respectImportant: false
            };
            options = Object.assign({}, defaultOptions, Array.isArray(options) ? {} : options);
            for (let [identifier, rule] of withIdentifiers(components)){
                let prefixedIdentifier = prefixIdentifier(identifier, options);
                classList.add(prefixedIdentifier);
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push([
                    {
                        sort: offsets.create("components"),
                        layer: "components",
                        options
                    },
                    rule
                ]);
            }
        },
        addUtilities (utilities, options) {
            let defaultOptions = {
                preserveSource: false,
                respectPrefix: true,
                respectImportant: true
            };
            options = Object.assign({}, defaultOptions, Array.isArray(options) ? {} : options);
            for (let [identifier, rule] of withIdentifiers(utilities)){
                let prefixedIdentifier = prefixIdentifier(identifier, options);
                classList.add(prefixedIdentifier);
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push([
                    {
                        sort: offsets.create("utilities"),
                        layer: "utilities",
                        options
                    },
                    rule
                ]);
            }
        },
        matchUtilities: function(utilities, options) {
            let defaultOptions = {
                respectPrefix: true,
                respectImportant: true,
                modifiers: false
            };
            options = normalizeOptionTypes({
                ...defaultOptions,
                ...options
            });
            let offset = offsets.create("utilities");
            for(let identifier in utilities){
                let prefixedIdentifier = prefixIdentifier(identifier, options);
                let rule = utilities[identifier];
                classList.add([
                    prefixedIdentifier,
                    options
                ]);
                function wrapped(modifier, { isOnlyPlugin  }) {
                    let [value, coercedType, utilityModifier] = (0, _pluginUtils.coerceValue)(options.types, modifier, options, tailwindConfig);
                    if (value === undefined) {
                        return [];
                    }
                    if (!options.types.some(({ type  })=>type === coercedType)) {
                        if (isOnlyPlugin) {
                            _log.default.warn([
                                `Unnecessary typehint \`${coercedType}\` in \`${identifier}-${modifier}\`.`,
                                `You can safely update it to \`${identifier}-${modifier.replace(coercedType + ":", "")}\`.`
                            ]);
                        } else {
                            return [];
                        }
                    }
                    if (!(0, _isSyntacticallyValidPropertyValue.default)(value)) {
                        return [];
                    }
                    let extras = {
                        get modifier () {
                            if (!options.modifiers) {
                                _log.default.warn(`modifier-used-without-options-for-${identifier}`, [
                                    "Your plugin must set `modifiers: true` in its options to support modifiers."
                                ]);
                            }
                            return utilityModifier;
                        }
                    };
                    let modifiersEnabled = (0, _featureFlags.flagEnabled)(tailwindConfig, "generalizedModifiers");
                    let ruleSets = [].concat(modifiersEnabled ? rule(value, extras) : rule(value)).filter(Boolean).map((declaration)=>({
                            [(0, _nameClass.default)(identifier, modifier)]: declaration
                        }));
                    return ruleSets;
                }
                let withOffsets = [
                    {
                        sort: offset,
                        layer: "utilities",
                        options
                    },
                    wrapped
                ];
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push(withOffsets);
            }
        },
        matchComponents: function(components, options) {
            let defaultOptions = {
                respectPrefix: true,
                respectImportant: false,
                modifiers: false
            };
            options = normalizeOptionTypes({
                ...defaultOptions,
                ...options
            });
            let offset = offsets.create("components");
            for(let identifier in components){
                let prefixedIdentifier = prefixIdentifier(identifier, options);
                let rule = components[identifier];
                classList.add([
                    prefixedIdentifier,
                    options
                ]);
                function wrapped(modifier, { isOnlyPlugin  }) {
                    let [value, coercedType, utilityModifier] = (0, _pluginUtils.coerceValue)(options.types, modifier, options, tailwindConfig);
                    if (value === undefined) {
                        return [];
                    }
                    if (!options.types.some(({ type  })=>type === coercedType)) {
                        if (isOnlyPlugin) {
                            _log.default.warn([
                                `Unnecessary typehint \`${coercedType}\` in \`${identifier}-${modifier}\`.`,
                                `You can safely update it to \`${identifier}-${modifier.replace(coercedType + ":", "")}\`.`
                            ]);
                        } else {
                            return [];
                        }
                    }
                    if (!(0, _isSyntacticallyValidPropertyValue.default)(value)) {
                        return [];
                    }
                    let extras = {
                        get modifier () {
                            if (!options.modifiers) {
                                _log.default.warn(`modifier-used-without-options-for-${identifier}`, [
                                    "Your plugin must set `modifiers: true` in its options to support modifiers."
                                ]);
                            }
                            return utilityModifier;
                        }
                    };
                    let modifiersEnabled = (0, _featureFlags.flagEnabled)(tailwindConfig, "generalizedModifiers");
                    let ruleSets = [].concat(modifiersEnabled ? rule(value, extras) : rule(value)).filter(Boolean).map((declaration)=>({
                            [(0, _nameClass.default)(identifier, modifier)]: declaration
                        }));
                    return ruleSets;
                }
                let withOffsets = [
                    {
                        sort: offset,
                        layer: "components",
                        options
                    },
                    wrapped
                ];
                if (!context.candidateRuleMap.has(prefixedIdentifier)) {
                    context.candidateRuleMap.set(prefixedIdentifier, []);
                }
                context.candidateRuleMap.get(prefixedIdentifier).push(withOffsets);
            }
        },
        addVariant (variantName, variantFunctions, options = {}) {
            variantFunctions = [].concat(variantFunctions).map((variantFunction)=>{
                if (typeof variantFunction !== "string") {
                    // Safelist public API functions
                    return (api = {})=>{
                        let { args , modifySelectors , container , separator , wrap , format  } = api;
                        let result = variantFunction(Object.assign({
                            modifySelectors,
                            container,
                            separator
                        }, options.type === VARIANT_TYPES.MatchVariant && {
                            args,
                            wrap,
                            format
                        }));
                        if (typeof result === "string" && !isValidVariantFormatString(result)) {
                            throw new Error(`Your custom variant \`${variantName}\` has an invalid format string. Make sure it's an at-rule or contains a \`&\` placeholder.`);
                        }
                        if (Array.isArray(result)) {
                            return result.filter((variant)=>typeof variant === "string").map((variant)=>parseVariant(variant));
                        }
                        // result may be undefined with legacy variants that use APIs like `modifySelectors`
                        // result may also be a postcss node if someone was returning the result from `modifySelectors`
                        return result && typeof result === "string" && parseVariant(result)(api);
                    };
                }
                if (!isValidVariantFormatString(variantFunction)) {
                    throw new Error(`Your custom variant \`${variantName}\` has an invalid format string. Make sure it's an at-rule or contains a \`&\` placeholder.`);
                }
                return parseVariant(variantFunction);
            });
            insertInto(variantList, variantName, options);
            variantMap.set(variantName, variantFunctions);
            context.variantOptions.set(variantName, options);
        },
        matchVariant (variant, variantFn, options) {
            var _options_id;
            // A unique identifier that "groups" these variants together.
            // This is for internal use only which is why it is not present in the types
            let id = (_options_id = options === null || options === void 0 ? void 0 : options.id) !== null && _options_id !== void 0 ? _options_id : ++variantIdentifier;
            let isSpecial = variant === "@";
            let modifiersEnabled = (0, _featureFlags.flagEnabled)(tailwindConfig, "generalizedModifiers");
            var _options_values;
            for (let [key, value] of Object.entries((_options_values = options === null || options === void 0 ? void 0 : options.values) !== null && _options_values !== void 0 ? _options_values : {})){
                if (key === "DEFAULT") continue;
                api.addVariant(isSpecial ? `${variant}${key}` : `${variant}-${key}`, ({ args , container  })=>{
                    return variantFn(value, modifiersEnabled ? {
                        modifier: args === null || args === void 0 ? void 0 : args.modifier,
                        container
                    } : {
                        container
                    });
                }, {
                    ...options,
                    value,
                    id,
                    type: VARIANT_TYPES.MatchVariant,
                    variantInfo: VARIANT_INFO.Base
                });
            }
            var _options_values1;
            let hasDefault = "DEFAULT" in ((_options_values1 = options === null || options === void 0 ? void 0 : options.values) !== null && _options_values1 !== void 0 ? _options_values1 : {});
            api.addVariant(variant, ({ args , container  })=>{
                if ((args === null || args === void 0 ? void 0 : args.value) === _sharedState.NONE && !hasDefault) {
                    return null;
                }
                var // (JetBrains) plugins.
                _args_value;
                return variantFn((args === null || args === void 0 ? void 0 : args.value) === _sharedState.NONE ? options.values.DEFAULT : (_args_value = args === null || args === void 0 ? void 0 : args.value) !== null && _args_value !== void 0 ? _args_value : typeof args === "string" ? args : "", modifiersEnabled ? {
                    modifier: args === null || args === void 0 ? void 0 : args.modifier,
                    container
                } : {
                    container
                });
            }, {
                ...options,
                id,
                type: VARIANT_TYPES.MatchVariant,
                variantInfo: VARIANT_INFO.Dynamic
            });
        }
    };
    return api;
}
let fileModifiedMapCache = new WeakMap();
function getFileModifiedMap(context) {
    if (!fileModifiedMapCache.has(context)) {
        fileModifiedMapCache.set(context, new Map());
    }
    return fileModifiedMapCache.get(context);
}
function trackModified(files, fileModifiedMap) {
    let changed = false;
    let mtimesToCommit = new Map();
    for (let file of files){
        var _fs_statSync;
        if (!file) continue;
        let parsed = _url.default.parse(file);
        let pathname = parsed.hash ? parsed.href.replace(parsed.hash, "") : parsed.href;
        pathname = parsed.search ? pathname.replace(parsed.search, "") : pathname;
        let newModified = (_fs_statSync = _fs.default.statSync(decodeURIComponent(pathname), {
            throwIfNoEntry: false
        })) === null || _fs_statSync === void 0 ? void 0 : _fs_statSync.mtimeMs;
        if (!newModified) {
            continue;
        }
        if (!fileModifiedMap.has(file) || newModified > fileModifiedMap.get(file)) {
            changed = true;
        }
        mtimesToCommit.set(file, newModified);
    }
    return [
        changed,
        mtimesToCommit
    ];
}
function extractVariantAtRules(node) {
    node.walkAtRules((atRule)=>{
        if ([
            "responsive",
            "variants"
        ].includes(atRule.name)) {
            extractVariantAtRules(atRule);
            atRule.before(atRule.nodes);
            atRule.remove();
        }
    });
}
function collectLayerPlugins(root) {
    let layerPlugins = [];
    root.each((node)=>{
        if (node.type === "atrule" && [
            "responsive",
            "variants"
        ].includes(node.name)) {
            node.name = "layer";
            node.params = "utilities";
        }
    });
    // Walk @layer rules and treat them like plugins
    root.walkAtRules("layer", (layerRule)=>{
        extractVariantAtRules(layerRule);
        if (layerRule.params === "base") {
            for (let node of layerRule.nodes){
                layerPlugins.push(function({ addBase  }) {
                    addBase(node, {
                        respectPrefix: false
                    });
                });
            }
            layerRule.remove();
        } else if (layerRule.params === "components") {
            for (let node of layerRule.nodes){
                layerPlugins.push(function({ addComponents  }) {
                    addComponents(node, {
                        respectPrefix: false,
                        preserveSource: true
                    });
                });
            }
            layerRule.remove();
        } else if (layerRule.params === "utilities") {
            for (let node of layerRule.nodes){
                layerPlugins.push(function({ addUtilities  }) {
                    addUtilities(node, {
                        respectPrefix: false,
                        preserveSource: true
                    });
                });
            }
            layerRule.remove();
        }
    });
    return layerPlugins;
}
function resolvePlugins(context, root) {
    let corePluginList = Object.entries({
        ..._corePlugins.variantPlugins,
        ..._corePlugins.corePlugins
    }).map(([name, plugin])=>{
        if (!context.tailwindConfig.corePlugins.includes(name)) {
            return null;
        }
        return plugin;
    }).filter(Boolean);
    let userPlugins = context.tailwindConfig.plugins.map((plugin)=>{
        if (plugin.__isOptionsFunction) {
            plugin = plugin();
        }
        return typeof plugin === "function" ? plugin : plugin.handler;
    });
    let layerPlugins = collectLayerPlugins(root);
    // TODO: This is a workaround for backwards compatibility, since custom variants
    // were historically sorted before screen/stackable variants.
    let beforeVariants = [
        _corePlugins.variantPlugins["childVariant"],
        _corePlugins.variantPlugins["pseudoElementVariants"],
        _corePlugins.variantPlugins["pseudoClassVariants"],
        _corePlugins.variantPlugins["hasVariants"],
        _corePlugins.variantPlugins["ariaVariants"],
        _corePlugins.variantPlugins["dataVariants"]
    ];
    let afterVariants = [
        _corePlugins.variantPlugins["supportsVariants"],
        _corePlugins.variantPlugins["reducedMotionVariants"],
        _corePlugins.variantPlugins["prefersContrastVariants"],
        _corePlugins.variantPlugins["screenVariants"],
        _corePlugins.variantPlugins["orientationVariants"],
        _corePlugins.variantPlugins["directionVariants"],
        _corePlugins.variantPlugins["darkVariants"],
        _corePlugins.variantPlugins["forcedColorsVariants"],
        _corePlugins.variantPlugins["printVariant"]
    ];
    // This is a compatibility fix for the pre 3.4 dark mode behavior
    // `class` retains the old behavior, but `selector` keeps the new behavior
    let isLegacyDarkMode = context.tailwindConfig.darkMode === "class" || Array.isArray(context.tailwindConfig.darkMode) && context.tailwindConfig.darkMode[0] === "class";
    if (isLegacyDarkMode) {
        afterVariants = [
            _corePlugins.variantPlugins["supportsVariants"],
            _corePlugins.variantPlugins["reducedMotionVariants"],
            _corePlugins.variantPlugins["prefersContrastVariants"],
            _corePlugins.variantPlugins["darkVariants"],
            _corePlugins.variantPlugins["screenVariants"],
            _corePlugins.variantPlugins["orientationVariants"],
            _corePlugins.variantPlugins["directionVariants"],
            _corePlugins.variantPlugins["forcedColorsVariants"],
            _corePlugins.variantPlugins["printVariant"]
        ];
    }
    return [
        ...corePluginList,
        ...beforeVariants,
        ...userPlugins,
        ...afterVariants,
        ...layerPlugins
    ];
}
function registerPlugins(plugins, context) {
    let variantList = [];
    let variantMap = new Map();
    context.variantMap = variantMap;
    let offsets = new _offsets.Offsets();
    context.offsets = offsets;
    let classList = new Set();
    let pluginApi = buildPluginApi(context.tailwindConfig, context, {
        variantList,
        variantMap,
        offsets,
        classList
    });
    for (let plugin of plugins){
        if (Array.isArray(plugin)) {
            for (let pluginItem of plugin){
                pluginItem(pluginApi);
            }
        } else {
            plugin === null || plugin === void 0 ? void 0 : plugin(pluginApi);
        }
    }
    // Make sure to record bit masks for every variant
    offsets.recordVariants(variantList, (variant)=>variantMap.get(variant).length);
    // Build variantMap
    for (let [variantName, variantFunctions] of variantMap.entries()){
        context.variantMap.set(variantName, variantFunctions.map((variantFunction, idx)=>[
                offsets.forVariant(variantName, idx),
                variantFunction
            ]));
    }
    var _context_tailwindConfig_safelist;
    let safelist = ((_context_tailwindConfig_safelist = context.tailwindConfig.safelist) !== null && _context_tailwindConfig_safelist !== void 0 ? _context_tailwindConfig_safelist : []).filter(Boolean);
    if (safelist.length > 0) {
        let checks = [];
        for (let value of safelist){
            if (typeof value === "string") {
                context.changedContent.push({
                    content: value,
                    extension: "html"
                });
                continue;
            }
            if (value instanceof RegExp) {
                _log.default.warn("root-regex", [
                    "Regular expressions in `safelist` work differently in Tailwind CSS v3.0.",
                    "Update your `safelist` configuration to eliminate this warning.",
                    "https://tailwindcss.com/docs/content-configuration#safelisting-classes"
                ]);
                continue;
            }
            checks.push(value);
        }
        if (checks.length > 0) {
            let patternMatchingCount = new Map();
            let prefixLength = context.tailwindConfig.prefix.length;
            let checkImportantUtils = checks.some((check)=>check.pattern.source.includes("!"));
            for (let util of classList){
                let utils = Array.isArray(util) ? (()=>{
                    let [utilName, options] = util;
                    var _options_values;
                    let values = Object.keys((_options_values = options === null || options === void 0 ? void 0 : options.values) !== null && _options_values !== void 0 ? _options_values : {});
                    let classes = values.map((value)=>(0, _nameClass.formatClass)(utilName, value));
                    if (options === null || options === void 0 ? void 0 : options.supportsNegativeValues) {
                        // This is the normal negated version
                        // e.g. `-inset-1` or `-tw-inset-1`
                        classes = [
                            ...classes,
                            ...classes.map((cls)=>"-" + cls)
                        ];
                        // This is the negated version *after* the prefix
                        // e.g. `tw--inset-1`
                        // The prefix is already attached to util name
                        // So we add the negative after the prefix
                        classes = [
                            ...classes,
                            ...classes.map((cls)=>cls.slice(0, prefixLength) + "-" + cls.slice(prefixLength))
                        ];
                    }
                    if (options.types.some(({ type  })=>type === "color")) {
                        classes = [
                            ...classes,
                            ...classes.flatMap((cls)=>Object.keys(context.tailwindConfig.theme.opacity).map((opacity)=>`${cls}/${opacity}`))
                        ];
                    }
                    if (checkImportantUtils && (options === null || options === void 0 ? void 0 : options.respectImportant)) {
                        classes = [
                            ...classes,
                            ...classes.map((cls)=>"!" + cls)
                        ];
                    }
                    return classes;
                })() : [
                    util
                ];
                for (let util of utils){
                    for (let { pattern , variants =[]  } of checks){
                        // RegExp with the /g flag are stateful, so let's reset the last
                        // index pointer to reset the state.
                        pattern.lastIndex = 0;
                        if (!patternMatchingCount.has(pattern)) {
                            patternMatchingCount.set(pattern, 0);
                        }
                        if (!pattern.test(util)) continue;
                        patternMatchingCount.set(pattern, patternMatchingCount.get(pattern) + 1);
                        context.changedContent.push({
                            content: util,
                            extension: "html"
                        });
                        for (let variant of variants){
                            context.changedContent.push({
                                content: variant + context.tailwindConfig.separator + util,
                                extension: "html"
                            });
                        }
                    }
                }
            }
            for (let [regex, count] of patternMatchingCount.entries()){
                if (count !== 0) continue;
                _log.default.warn([
                    `The safelist pattern \`${regex}\` doesn't match any Tailwind CSS classes.`,
                    "Fix this pattern or remove it from your `safelist` configuration.",
                    "https://tailwindcss.com/docs/content-configuration#safelisting-classes"
                ]);
            }
        }
    }
    var _context_tailwindConfig_darkMode, _concat_;
    let darkClassName = (_concat_ = [].concat((_context_tailwindConfig_darkMode = context.tailwindConfig.darkMode) !== null && _context_tailwindConfig_darkMode !== void 0 ? _context_tailwindConfig_darkMode : "media")[1]) !== null && _concat_ !== void 0 ? _concat_ : "dark";
    // A list of utilities that are used by certain Tailwind CSS utilities but
    // that don't exist on their own. This will result in them "not existing" and
    // sorting could be weird since you still require them in order to make the
    // host utilities work properly. (Thanks Biology)
    let parasiteUtilities = [
        prefix(context, darkClassName),
        prefix(context, "group"),
        prefix(context, "peer")
    ];
    context.getClassOrder = function getClassOrder(classes) {
        // Sort classes so they're ordered in a deterministic manner
        let sorted = [
            ...classes
        ].sort((a, z)=>{
            if (a === z) return 0;
            if (a < z) return -1;
            return 1;
        });
        // Non-util classes won't be generated, so we default them to null
        let sortedClassNames = new Map(sorted.map((className)=>[
                className,
                null
            ]));
        // Sort all classes in order
        // Non-tailwind classes won't be generated and will be left as `null`
        let rules = (0, _generateRules.generateRules)(new Set(sorted), context, true);
        rules = context.offsets.sort(rules);
        let idx = BigInt(parasiteUtilities.length);
        for (const [, rule] of rules){
            let candidate = rule.raws.tailwind.candidate;
            var _sortedClassNames_get;
            // When multiple rules match a candidate
            // always take the position of the first one
            sortedClassNames.set(candidate, (_sortedClassNames_get = sortedClassNames.get(candidate)) !== null && _sortedClassNames_get !== void 0 ? _sortedClassNames_get : idx++);
        }
        return classes.map((className)=>{
            var _sortedClassNames_get;
            let order = (_sortedClassNames_get = sortedClassNames.get(className)) !== null && _sortedClassNames_get !== void 0 ? _sortedClassNames_get : null;
            let parasiteIndex = parasiteUtilities.indexOf(className);
            if (order === null && parasiteIndex !== -1) {
                // This will make sure that it is at the very beginning of the
                // `components` layer which technically means 'before any
                // components'.
                order = BigInt(parasiteIndex);
            }
            return [
                className,
                order
            ];
        });
    };
    // Generate a list of strings for autocompletion purposes, e.g.
    // ['uppercase', 'lowercase', ...]
    context.getClassList = function getClassList(options = {}) {
        let output = [];
        for (let util of classList){
            if (Array.isArray(util)) {
                var _utilOptions_types;
                let [utilName, utilOptions] = util;
                let negativeClasses = [];
                var _utilOptions_modifiers;
                let modifiers = Object.keys((_utilOptions_modifiers = utilOptions === null || utilOptions === void 0 ? void 0 : utilOptions.modifiers) !== null && _utilOptions_modifiers !== void 0 ? _utilOptions_modifiers : {});
                if (utilOptions === null || utilOptions === void 0 ? void 0 : (_utilOptions_types = utilOptions.types) === null || _utilOptions_types === void 0 ? void 0 : _utilOptions_types.some(({ type  })=>type === "color")) {
                    var _context_tailwindConfig_theme_opacity;
                    modifiers.push(...Object.keys((_context_tailwindConfig_theme_opacity = context.tailwindConfig.theme.opacity) !== null && _context_tailwindConfig_theme_opacity !== void 0 ? _context_tailwindConfig_theme_opacity : {}));
                }
                let metadata = {
                    modifiers
                };
                let includeMetadata = options.includeMetadata && modifiers.length > 0;
                var _utilOptions_values;
                for (let [key, value] of Object.entries((_utilOptions_values = utilOptions === null || utilOptions === void 0 ? void 0 : utilOptions.values) !== null && _utilOptions_values !== void 0 ? _utilOptions_values : {})){
                    // Ignore undefined and null values
                    if (value == null) {
                        continue;
                    }
                    let cls = (0, _nameClass.formatClass)(utilName, key);
                    output.push(includeMetadata ? [
                        cls,
                        metadata
                    ] : cls);
                    if ((utilOptions === null || utilOptions === void 0 ? void 0 : utilOptions.supportsNegativeValues) && (0, _negateValue.default)(value)) {
                        let cls = (0, _nameClass.formatClass)(utilName, `-${key}`);
                        negativeClasses.push(includeMetadata ? [
                            cls,
                            metadata
                        ] : cls);
                    }
                }
                output.push(...negativeClasses);
            } else {
                output.push(util);
            }
        }
        return output;
    };
    // Generate a list of available variants with meta information of the type of variant.
    context.getVariants = function getVariants() {
        // We use a unique, random ID for candidate names to avoid conflicts
        // We can't use characters like `_`, `:`, `@` or `.` because they might
        // be used as a separator
        let id = Math.random().toString(36).substring(7).toUpperCase();
        let result = [];
        for (let [name, options] of context.variantOptions.entries()){
            if (options.variantInfo === VARIANT_INFO.Base) continue;
            var _options_values;
            result.push({
                name,
                isArbitrary: options.type === Symbol.for("MATCH_VARIANT"),
                values: Object.keys((_options_values = options.values) !== null && _options_values !== void 0 ? _options_values : {}),
                hasDash: name !== "@",
                selectors ({ modifier , value  } = {}) {
                    let candidate = `TAILWINDPLACEHOLDER${id}`;
                    let rule = _postcss.default.rule({
                        selector: `.${candidate}`
                    });
                    let container = _postcss.default.root({
                        nodes: [
                            rule.clone()
                        ]
                    });
                    let before = container.toString();
                    var _context_variantMap_get;
                    let fns = ((_context_variantMap_get = context.variantMap.get(name)) !== null && _context_variantMap_get !== void 0 ? _context_variantMap_get : []).flatMap(([_, fn])=>fn);
                    let formatStrings = [];
                    for (let fn of fns){
                        var _options_values;
                        let localFormatStrings = [];
                        var _options_values_value;
                        let api = {
                            args: {
                                modifier,
                                value: (_options_values_value = (_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[value]) !== null && _options_values_value !== void 0 ? _options_values_value : value
                            },
                            separator: context.tailwindConfig.separator,
                            modifySelectors (modifierFunction) {
                                // Run the modifierFunction over each rule
                                container.each((rule)=>{
                                    if (rule.type !== "rule") {
                                        return;
                                    }
                                    rule.selectors = rule.selectors.map((selector)=>{
                                        return modifierFunction({
                                            get className () {
                                                return (0, _generateRules.getClassNameFromSelector)(selector);
                                            },
                                            selector
                                        });
                                    });
                                });
                                return container;
                            },
                            format (str) {
                                localFormatStrings.push(str);
                            },
                            wrap (wrapper) {
                                localFormatStrings.push(`@${wrapper.name} ${wrapper.params} { & }`);
                            },
                            container
                        };
                        let ruleWithVariant = fn(api);
                        if (localFormatStrings.length > 0) {
                            formatStrings.push(localFormatStrings);
                        }
                        if (Array.isArray(ruleWithVariant)) {
                            for (let variantFunction of ruleWithVariant){
                                localFormatStrings = [];
                                variantFunction(api);
                                formatStrings.push(localFormatStrings);
                            }
                        }
                    }
                    // Reverse engineer the result of the `container`
                    let manualFormatStrings = [];
                    let after = container.toString();
                    if (before !== after) {
                        // Figure out all selectors
                        container.walkRules((rule)=>{
                            let modified = rule.selector;
                            // Rebuild the base selector, this is what plugin authors would do
                            // as well. E.g.: `${variant}${separator}${className}`.
                            // However, plugin authors probably also prepend or append certain
                            // classes, pseudos, ids, ...
                            let rebuiltBase = (0, _postcssselectorparser.default)((selectors)=>{
                                selectors.walkClasses((classNode)=>{
                                    classNode.value = `${name}${context.tailwindConfig.separator}${classNode.value}`;
                                });
                            }).processSync(modified);
                            // Now that we know the original selector, the new selector, and
                            // the rebuild part in between, we can replace the part that plugin
                            // authors need to rebuild with `&`, and eventually store it in the
                            // collectedFormats. Similar to what `format('...')` would do.
                            //
                            // E.g.:
                            //                   variant: foo
                            //                  selector: .markdown > p
                            //      modified (by plugin): .foo .foo\\:markdown > p
                            //    rebuiltBase (internal): .foo\\:markdown > p
                            //                    format: .foo &
                            manualFormatStrings.push(modified.replace(rebuiltBase, "&").replace(candidate, "&"));
                        });
                        // Figure out all atrules
                        container.walkAtRules((atrule)=>{
                            manualFormatStrings.push(`@${atrule.name} (${atrule.params}) { & }`);
                        });
                    }
                    var _options_values1;
                    let isArbitraryVariant = !(value in ((_options_values1 = options.values) !== null && _options_values1 !== void 0 ? _options_values1 : {}));
                    var _options_INTERNAL_FEATURES;
                    let internalFeatures = (_options_INTERNAL_FEATURES = options[INTERNAL_FEATURES]) !== null && _options_INTERNAL_FEATURES !== void 0 ? _options_INTERNAL_FEATURES : {};
                    let respectPrefix = (()=>{
                        if (isArbitraryVariant) return false;
                        if (internalFeatures.respectPrefix === false) return false;
                        return true;
                    })();
                    formatStrings = formatStrings.map((format)=>format.map((str)=>({
                                format: str,
                                respectPrefix
                            })));
                    manualFormatStrings = manualFormatStrings.map((format)=>({
                            format,
                            respectPrefix
                        }));
                    let opts = {
                        candidate,
                        context
                    };
                    let result = formatStrings.map((formats)=>(0, _formatVariantSelector.finalizeSelector)(`.${candidate}`, (0, _formatVariantSelector.formatVariantSelector)(formats, opts), opts).replace(`.${candidate}`, "&").replace("{ & }", "").trim());
                    if (manualFormatStrings.length > 0) {
                        result.push((0, _formatVariantSelector.formatVariantSelector)(manualFormatStrings, opts).toString().replace(`.${candidate}`, "&"));
                    }
                    return result;
                }
            });
        }
        return result;
    };
}
/**
 * Mark as class as retroactively invalid
 *
 *
 * @param {string} candidate
 */ function markInvalidUtilityCandidate(context, candidate) {
    if (!context.classCache.has(candidate)) {
        return;
    }
    // Mark this as not being a real utility
    context.notClassCache.add(candidate);
    // Remove it from any candidate-specific caches
    context.classCache.delete(candidate);
    context.applyClassCache.delete(candidate);
    context.candidateRuleMap.delete(candidate);
    context.candidateRuleCache.delete(candidate);
    // Ensure the stylesheet gets rebuilt
    context.stylesheetCache = null;
}
/**
 * Mark as class as retroactively invalid
 *
 * @param {import('postcss').Node} node
 */ function markInvalidUtilityNode(context, node) {
    let candidate = node.raws.tailwind.candidate;
    if (!candidate) {
        return;
    }
    for (const entry of context.ruleCache){
        if (entry[1].raws.tailwind.candidate === candidate) {
            context.ruleCache.delete(entry);
        // context.postCssNodeCache.delete(node)
        }
    }
    markInvalidUtilityCandidate(context, candidate);
}
function createContext(tailwindConfig, changedContent = [], root = _postcss.default.root()) {
    var _tailwindConfig_blocklist;
    let context = {
        disposables: [],
        ruleCache: new Set(),
        candidateRuleCache: new Map(),
        classCache: new Map(),
        applyClassCache: new Map(),
        // Seed the not class cache with the blocklist (which is only strings)
        notClassCache: new Set((_tailwindConfig_blocklist = tailwindConfig.blocklist) !== null && _tailwindConfig_blocklist !== void 0 ? _tailwindConfig_blocklist : []),
        postCssNodeCache: new Map(),
        candidateRuleMap: new Map(),
        tailwindConfig,
        changedContent: changedContent,
        variantMap: new Map(),
        stylesheetCache: null,
        variantOptions: new Map(),
        markInvalidUtilityCandidate: (candidate)=>markInvalidUtilityCandidate(context, candidate),
        markInvalidUtilityNode: (node)=>markInvalidUtilityNode(context, node)
    };
    let resolvedPlugins = resolvePlugins(context, root);
    registerPlugins(resolvedPlugins, context);
    return context;
}
let contextMap = _sharedState.contextMap;
let configContextMap = _sharedState.configContextMap;
let contextSourcesMap = _sharedState.contextSourcesMap;
function getContext(root, result, tailwindConfig, userConfigPath, tailwindConfigHash, contextDependencies) {
    let sourcePath = result.opts.from;
    let isConfigFile = userConfigPath !== null;
    _sharedState.env.DEBUG && console.log("Source path:", sourcePath);
    let existingContext;
    if (isConfigFile && contextMap.has(sourcePath)) {
        existingContext = contextMap.get(sourcePath);
    } else if (configContextMap.has(tailwindConfigHash)) {
        let context = configContextMap.get(tailwindConfigHash);
        contextSourcesMap.get(context).add(sourcePath);
        contextMap.set(sourcePath, context);
        existingContext = context;
    }
    let cssDidChange = (0, _cacheInvalidation.hasContentChanged)(sourcePath, root);
    // If there's already a context in the cache and we don't need to
    // reset the context, return the cached context.
    if (existingContext) {
        let [contextDependenciesChanged, mtimesToCommit] = trackModified([
            ...contextDependencies
        ], getFileModifiedMap(existingContext));
        if (!contextDependenciesChanged && !cssDidChange) {
            return [
                existingContext,
                false,
                mtimesToCommit
            ];
        }
    }
    // If this source is in the context map, get the old context.
    // Remove this source from the context sources for the old context,
    // and clean up that context if no one else is using it. This can be
    // called by many processes in rapid succession, so we check for presence
    // first because the first process to run this code will wipe it out first.
    if (contextMap.has(sourcePath)) {
        let oldContext = contextMap.get(sourcePath);
        if (contextSourcesMap.has(oldContext)) {
            contextSourcesMap.get(oldContext).delete(sourcePath);
            if (contextSourcesMap.get(oldContext).size === 0) {
                contextSourcesMap.delete(oldContext);
                for (let [tailwindConfigHash, context] of configContextMap){
                    if (context === oldContext) {
                        configContextMap.delete(tailwindConfigHash);
                    }
                }
                for (let disposable of oldContext.disposables.splice(0)){
                    disposable(oldContext);
                }
            }
        }
    }
    _sharedState.env.DEBUG && console.log("Setting up new context...");
    let context = createContext(tailwindConfig, [], root);
    Object.assign(context, {
        userConfigPath
    });
    let [, mtimesToCommit] = trackModified([
        ...contextDependencies
    ], getFileModifiedMap(context));
    // ---
    // Update all context tracking state
    configContextMap.set(tailwindConfigHash, context);
    contextMap.set(sourcePath, context);
    if (!contextSourcesMap.has(context)) {
        contextSourcesMap.set(context, new Set());
    }
    contextSourcesMap.get(context).add(sourcePath);
    return [
        context,
        true,
        mtimesToCommit
    ];
}
