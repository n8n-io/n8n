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
    getClassNameFromSelector: function() {
        return getClassNameFromSelector;
    },
    resolveMatches: function() {
        return resolveMatches;
    },
    generateRules: function() {
        return generateRules;
    }
});
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _postcssselectorparser = /*#__PURE__*/ _interop_require_default(require("postcss-selector-parser"));
const _parseObjectStyles = /*#__PURE__*/ _interop_require_default(require("../util/parseObjectStyles"));
const _isPlainObject = /*#__PURE__*/ _interop_require_default(require("../util/isPlainObject"));
const _prefixSelector = /*#__PURE__*/ _interop_require_default(require("../util/prefixSelector"));
const _pluginUtils = require("../util/pluginUtils");
const _log = /*#__PURE__*/ _interop_require_default(require("../util/log"));
const _sharedState = /*#__PURE__*/ _interop_require_wildcard(require("./sharedState"));
const _formatVariantSelector = require("../util/formatVariantSelector");
const _nameClass = require("../util/nameClass");
const _dataTypes = require("../util/dataTypes");
const _setupContextUtils = require("./setupContextUtils");
const _isSyntacticallyValidPropertyValue = /*#__PURE__*/ _interop_require_default(require("../util/isSyntacticallyValidPropertyValue"));
const _splitAtTopLevelOnly = require("../util/splitAtTopLevelOnly.js");
const _featureFlags = require("../featureFlags");
const _applyImportantSelector = require("../util/applyImportantSelector");
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
let classNameParser = (0, _postcssselectorparser.default)((selectors)=>{
    return selectors.first.filter(({ type  })=>type === "class").pop().value;
});
function getClassNameFromSelector(selector) {
    return classNameParser.transformSync(selector);
}
// Generate match permutations for a class candidate, like:
// ['ring-offset-blue', '100']
// ['ring-offset', 'blue-100']
// ['ring', 'offset-blue-100']
// Example with dynamic classes:
// ['grid-cols', '[[linename],1fr,auto]']
// ['grid', 'cols-[[linename],1fr,auto]']
function* candidatePermutations(candidate) {
    let lastIndex = Infinity;
    while(lastIndex >= 0){
        let dashIdx;
        let wasSlash = false;
        if (lastIndex === Infinity && candidate.endsWith("]")) {
            let bracketIdx = candidate.indexOf("[");
            // If character before `[` isn't a dash or a slash, this isn't a dynamic class
            // eg. string[]
            if (candidate[bracketIdx - 1] === "-") {
                dashIdx = bracketIdx - 1;
            } else if (candidate[bracketIdx - 1] === "/") {
                dashIdx = bracketIdx - 1;
                wasSlash = true;
            } else {
                dashIdx = -1;
            }
        } else if (lastIndex === Infinity && candidate.includes("/")) {
            dashIdx = candidate.lastIndexOf("/");
            wasSlash = true;
        } else {
            dashIdx = candidate.lastIndexOf("-", lastIndex);
        }
        if (dashIdx < 0) {
            break;
        }
        let prefix = candidate.slice(0, dashIdx);
        let modifier = candidate.slice(wasSlash ? dashIdx : dashIdx + 1);
        lastIndex = dashIdx - 1;
        // TODO: This feels a bit hacky
        if (prefix === "" || modifier === "/") {
            continue;
        }
        yield [
            prefix,
            modifier
        ];
    }
}
function applyPrefix(matches, context) {
    if (matches.length === 0 || context.tailwindConfig.prefix === "") {
        return matches;
    }
    for (let match of matches){
        let [meta] = match;
        if (meta.options.respectPrefix) {
            let container = _postcss.default.root({
                nodes: [
                    match[1].clone()
                ]
            });
            let classCandidate = match[1].raws.tailwind.classCandidate;
            container.walkRules((r)=>{
                // If this is a negative utility with a dash *before* the prefix we
                // have to ensure that the generated selector matches the candidate
                // Not doing this will cause `-tw-top-1` to generate the class `.tw--top-1`
                // The disconnect between candidate <-> class can cause @apply to hard crash.
                let shouldPrependNegative = classCandidate.startsWith("-");
                r.selector = (0, _prefixSelector.default)(context.tailwindConfig.prefix, r.selector, shouldPrependNegative);
            });
            match[1] = container.nodes[0];
        }
    }
    return matches;
}
function applyImportant(matches, classCandidate) {
    if (matches.length === 0) {
        return matches;
    }
    let result = [];
    function isInKeyframes(rule) {
        return rule.parent && rule.parent.type === "atrule" && rule.parent.name === "keyframes";
    }
    for (let [meta, rule] of matches){
        let container = _postcss.default.root({
            nodes: [
                rule.clone()
            ]
        });
        container.walkRules((r)=>{
            // Declarations inside keyframes cannot be marked as important
            // They will be ignored by the browser
            if (isInKeyframes(r)) {
                return;
            }
            let ast = (0, _postcssselectorparser.default)().astSync(r.selector);
            // Remove extraneous selectors that do not include the base candidate
            ast.each((sel)=>(0, _formatVariantSelector.eliminateIrrelevantSelectors)(sel, classCandidate));
            // Update all instances of the base candidate to include the important marker
            (0, _pluginUtils.updateAllClasses)(ast, (className)=>className === classCandidate ? `!${className}` : className);
            r.selector = ast.toString();
            r.walkDecls((d)=>d.important = true);
        });
        result.push([
            {
                ...meta,
                important: true
            },
            container.nodes[0]
        ]);
    }
    return result;
}
// Takes a list of rule tuples and applies a variant like `hover`, sm`,
// whatever to it. We used to do some extra caching here to avoid generating
// a variant of the same rule more than once, but this was never hit because
// we cache at the entire selector level further up the tree.
//
// Technically you can get a cache hit if you have `hover:focus:text-center`
// and `focus:hover:text-center` in the same project, but it doesn't feel
// worth the complexity for that case.
function applyVariant(variant, matches, context) {
    if (matches.length === 0) {
        return matches;
    }
    /** @type {{modifier: string | null, value: string | null}} */ let args = {
        modifier: null,
        value: _sharedState.NONE
    };
    // Retrieve "modifier"
    {
        let [baseVariant, ...modifiers] = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(variant, "/");
        // This is a hack to support variants with `/` in them, like `ar-1/10/20:text-red-500`
        // In this case 1/10 is a value but /20 is a modifier
        if (modifiers.length > 1) {
            baseVariant = baseVariant + "/" + modifiers.slice(0, -1).join("/");
            modifiers = modifiers.slice(-1);
        }
        if (modifiers.length && !context.variantMap.has(variant)) {
            variant = baseVariant;
            args.modifier = modifiers[0];
            if (!(0, _featureFlags.flagEnabled)(context.tailwindConfig, "generalizedModifiers")) {
                return [];
            }
        }
    }
    // Retrieve "arbitrary value"
    if (variant.endsWith("]") && !variant.startsWith("[")) {
        // We either have:
        //   @[200px]
        //   group-[:hover]
        //
        // But we don't want:
        //   @-[200px]        (`-` is incorrect)
        //   group[:hover]    (`-` is missing)
        let match = /(.)(-?)\[(.*)\]/g.exec(variant);
        if (match) {
            let [, char, separator, value] = match;
            // @-[200px] case
            if (char === "@" && separator === "-") return [];
            // group[:hover] case
            if (char !== "@" && separator === "") return [];
            variant = variant.replace(`${separator}[${value}]`, "");
            args.value = value;
        }
    }
    // Register arbitrary variants
    if (isArbitraryValue(variant) && !context.variantMap.has(variant)) {
        let sort = context.offsets.recordVariant(variant);
        let selector = (0, _dataTypes.normalize)(variant.slice(1, -1));
        let selectors = (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(selector, ",");
        // We do not support multiple selectors for arbitrary variants
        if (selectors.length > 1) {
            return [];
        }
        if (!selectors.every(_setupContextUtils.isValidVariantFormatString)) {
            return [];
        }
        let records = selectors.map((sel, idx)=>[
                context.offsets.applyParallelOffset(sort, idx),
                (0, _setupContextUtils.parseVariant)(sel.trim())
            ]);
        context.variantMap.set(variant, records);
    }
    if (context.variantMap.has(variant)) {
        var _context_variantOptions_get;
        let isArbitraryVariant = isArbitraryValue(variant);
        var _context_variantOptions_get_INTERNAL_FEATURES;
        let internalFeatures = (_context_variantOptions_get_INTERNAL_FEATURES = (_context_variantOptions_get = context.variantOptions.get(variant)) === null || _context_variantOptions_get === void 0 ? void 0 : _context_variantOptions_get[_setupContextUtils.INTERNAL_FEATURES]) !== null && _context_variantOptions_get_INTERNAL_FEATURES !== void 0 ? _context_variantOptions_get_INTERNAL_FEATURES : {};
        let variantFunctionTuples = context.variantMap.get(variant).slice();
        let result = [];
        let respectPrefix = (()=>{
            if (isArbitraryVariant) return false;
            if (internalFeatures.respectPrefix === false) return false;
            return true;
        })();
        for (let [meta, rule] of matches){
            // Don't generate variants for user css
            if (meta.layer === "user") {
                continue;
            }
            let container = _postcss.default.root({
                nodes: [
                    rule.clone()
                ]
            });
            for (let [variantSort, variantFunction, containerFromArray] of variantFunctionTuples){
                let clone = (containerFromArray !== null && containerFromArray !== void 0 ? containerFromArray : container).clone();
                let collectedFormats = [];
                function prepareBackup() {
                    // Already prepared, chicken out
                    if (clone.raws.neededBackup) {
                        return;
                    }
                    clone.raws.neededBackup = true;
                    clone.walkRules((rule)=>rule.raws.originalSelector = rule.selector);
                }
                function modifySelectors(modifierFunction) {
                    prepareBackup();
                    clone.each((rule)=>{
                        if (rule.type !== "rule") {
                            return;
                        }
                        rule.selectors = rule.selectors.map((selector)=>{
                            return modifierFunction({
                                get className () {
                                    return getClassNameFromSelector(selector);
                                },
                                selector
                            });
                        });
                    });
                    return clone;
                }
                let ruleWithVariant = variantFunction({
                    // Public API
                    get container () {
                        prepareBackup();
                        return clone;
                    },
                    separator: context.tailwindConfig.separator,
                    modifySelectors,
                    // Private API for now
                    wrap (wrapper) {
                        let nodes = clone.nodes;
                        clone.removeAll();
                        wrapper.append(nodes);
                        clone.append(wrapper);
                    },
                    format (selectorFormat) {
                        collectedFormats.push({
                            format: selectorFormat,
                            respectPrefix
                        });
                    },
                    args
                });
                // It can happen that a list of format strings is returned from within the function. In that
                // case, we have to process them as well. We can use the existing `variantSort`.
                if (Array.isArray(ruleWithVariant)) {
                    for (let [idx, variantFunction] of ruleWithVariant.entries()){
                        // This is a little bit scary since we are pushing to an array of items that we are
                        // currently looping over. However, you can also think of it like a processing queue
                        // where you keep handling jobs until everything is done and each job can queue more
                        // jobs if needed.
                        variantFunctionTuples.push([
                            context.offsets.applyParallelOffset(variantSort, idx),
                            variantFunction,
                            // If the clone has been modified we have to pass that back
                            // though so each rule can use the modified container
                            clone.clone()
                        ]);
                    }
                    continue;
                }
                if (typeof ruleWithVariant === "string") {
                    collectedFormats.push({
                        format: ruleWithVariant,
                        respectPrefix
                    });
                }
                if (ruleWithVariant === null) {
                    continue;
                }
                // We had to backup selectors, therefore we assume that somebody touched
                // `container` or `modifySelectors`. Let's see if they did, so that we
                // can restore the selectors, and collect the format strings.
                if (clone.raws.neededBackup) {
                    delete clone.raws.neededBackup;
                    clone.walkRules((rule)=>{
                        let before = rule.raws.originalSelector;
                        if (!before) return;
                        delete rule.raws.originalSelector;
                        if (before === rule.selector) return; // No mutation happened
                        let modified = rule.selector;
                        // Rebuild the base selector, this is what plugin authors would do
                        // as well. E.g.: `${variant}${separator}${className}`.
                        // However, plugin authors probably also prepend or append certain
                        // classes, pseudos, ids, ...
                        let rebuiltBase = (0, _postcssselectorparser.default)((selectors)=>{
                            selectors.walkClasses((classNode)=>{
                                classNode.value = `${variant}${context.tailwindConfig.separator}${classNode.value}`;
                            });
                        }).processSync(before);
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
                        collectedFormats.push({
                            format: modified.replace(rebuiltBase, "&"),
                            respectPrefix
                        });
                        rule.selector = before;
                    });
                }
                // This tracks the originating layer for the variant
                // For example:
                // .sm:underline {} is a variant of something in the utilities layer
                // .sm:container {} is a variant of the container component
                clone.nodes[0].raws.tailwind = {
                    ...clone.nodes[0].raws.tailwind,
                    parentLayer: meta.layer
                };
                var _meta_collectedFormats;
                let withOffset = [
                    {
                        ...meta,
                        sort: context.offsets.applyVariantOffset(meta.sort, variantSort, Object.assign(args, context.variantOptions.get(variant))),
                        collectedFormats: ((_meta_collectedFormats = meta.collectedFormats) !== null && _meta_collectedFormats !== void 0 ? _meta_collectedFormats : []).concat(collectedFormats)
                    },
                    clone.nodes[0]
                ];
                result.push(withOffset);
            }
        }
        return result;
    }
    return [];
}
function parseRules(rule, cache, options = {}) {
    // PostCSS node
    if (!(0, _isPlainObject.default)(rule) && !Array.isArray(rule)) {
        return [
            [
                rule
            ],
            options
        ];
    }
    // Tuple
    if (Array.isArray(rule)) {
        return parseRules(rule[0], cache, rule[1]);
    }
    // Simple object
    if (!cache.has(rule)) {
        cache.set(rule, (0, _parseObjectStyles.default)(rule));
    }
    return [
        cache.get(rule),
        options
    ];
}
const IS_VALID_PROPERTY_NAME = /^[a-z_-]/;
function isValidPropName(name) {
    return IS_VALID_PROPERTY_NAME.test(name);
}
/**
 * @param {string} declaration
 * @returns {boolean}
 */ function looksLikeUri(declaration) {
    // Quick bailout for obvious non-urls
    // This doesn't support schemes that don't use a leading // but that's unlikely to be a problem
    if (!declaration.includes("://")) {
        return false;
    }
    try {
        const url = new URL(declaration);
        return url.scheme !== "" && url.host !== "";
    } catch (err) {
        // Definitely not a valid url
        return false;
    }
}
function isParsableNode(node) {
    let isParsable = true;
    node.walkDecls((decl)=>{
        if (!isParsableCssValue(decl.prop, decl.value)) {
            isParsable = false;
            return false;
        }
    });
    return isParsable;
}
function isParsableCssValue(property, value) {
    // We don't want to to treat [https://example.com] as a custom property
    // Even though, according to the CSS grammar, it's a totally valid CSS declaration
    // So we short-circuit here by checking if the custom property looks like a url
    if (looksLikeUri(`${property}:${value}`)) {
        return false;
    }
    try {
        _postcss.default.parse(`a{${property}:${value}}`).toResult();
        return true;
    } catch (err) {
        return false;
    }
}
function extractArbitraryProperty(classCandidate, context) {
    var _classCandidate_match;
    let [, property, value] = (_classCandidate_match = classCandidate.match(/^\[([a-zA-Z0-9-_]+):(\S+)\]$/)) !== null && _classCandidate_match !== void 0 ? _classCandidate_match : [];
    if (value === undefined) {
        return null;
    }
    if (!isValidPropName(property)) {
        return null;
    }
    if (!(0, _isSyntacticallyValidPropertyValue.default)(value)) {
        return null;
    }
    let normalized = (0, _dataTypes.normalize)(value, {
        property
    });
    if (!isParsableCssValue(property, normalized)) {
        return null;
    }
    let sort = context.offsets.arbitraryProperty(classCandidate);
    return [
        [
            {
                sort,
                layer: "utilities",
                options: {
                    respectImportant: true
                }
            },
            ()=>({
                    [(0, _nameClass.asClass)(classCandidate)]: {
                        [property]: normalized
                    }
                })
        ]
    ];
}
function* resolveMatchedPlugins(classCandidate, context) {
    if (context.candidateRuleMap.has(classCandidate)) {
        yield [
            context.candidateRuleMap.get(classCandidate),
            "DEFAULT"
        ];
    }
    yield* function*(arbitraryPropertyRule) {
        if (arbitraryPropertyRule !== null) {
            yield [
                arbitraryPropertyRule,
                "DEFAULT"
            ];
        }
    }(extractArbitraryProperty(classCandidate, context));
    let candidatePrefix = classCandidate;
    let negative = false;
    const twConfigPrefix = context.tailwindConfig.prefix;
    const twConfigPrefixLen = twConfigPrefix.length;
    const hasMatchingPrefix = candidatePrefix.startsWith(twConfigPrefix) || candidatePrefix.startsWith(`-${twConfigPrefix}`);
    if (candidatePrefix[twConfigPrefixLen] === "-" && hasMatchingPrefix) {
        negative = true;
        candidatePrefix = twConfigPrefix + candidatePrefix.slice(twConfigPrefixLen + 1);
    }
    if (negative && context.candidateRuleMap.has(candidatePrefix)) {
        yield [
            context.candidateRuleMap.get(candidatePrefix),
            "-DEFAULT"
        ];
    }
    for (let [prefix, modifier] of candidatePermutations(candidatePrefix)){
        if (context.candidateRuleMap.has(prefix)) {
            yield [
                context.candidateRuleMap.get(prefix),
                negative ? `-${modifier}` : modifier
            ];
        }
    }
}
function splitWithSeparator(input, separator) {
    if (input === _sharedState.NOT_ON_DEMAND) {
        return [
            _sharedState.NOT_ON_DEMAND
        ];
    }
    return (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(input, separator);
}
function* recordCandidates(matches, classCandidate) {
    for (const match of matches){
        var _match__options;
        var _match__options_preserveSource;
        match[1].raws.tailwind = {
            ...match[1].raws.tailwind,
            classCandidate,
            preserveSource: (_match__options_preserveSource = (_match__options = match[0].options) === null || _match__options === void 0 ? void 0 : _match__options.preserveSource) !== null && _match__options_preserveSource !== void 0 ? _match__options_preserveSource : false
        };
        yield match;
    }
}
function* resolveMatches(candidate, context) {
    let separator = context.tailwindConfig.separator;
    let [classCandidate, ...variants] = splitWithSeparator(candidate, separator).reverse();
    let important = false;
    if (classCandidate.startsWith("!")) {
        important = true;
        classCandidate = classCandidate.slice(1);
    }
    // TODO: Reintroduce this in ways that doesn't break on false positives
    // function sortAgainst(toSort, against) {
    //   return toSort.slice().sort((a, z) => {
    //     return bigSign(against.get(a)[0] - against.get(z)[0])
    //   })
    // }
    // let sorted = sortAgainst(variants, context.variantMap)
    // if (sorted.toString() !== variants.toString()) {
    //   let corrected = sorted.reverse().concat(classCandidate).join(':')
    //   throw new Error(`Class ${candidate} should be written as ${corrected}`)
    // }
    for (let matchedPlugins of resolveMatchedPlugins(classCandidate, context)){
        let matches = [];
        let typesByMatches = new Map();
        let [plugins, modifier] = matchedPlugins;
        let isOnlyPlugin = plugins.length === 1;
        for (let [sort, plugin] of plugins){
            let matchesPerPlugin = [];
            if (typeof plugin === "function") {
                for (let ruleSet of [].concat(plugin(modifier, {
                    isOnlyPlugin
                }))){
                    let [rules, options] = parseRules(ruleSet, context.postCssNodeCache);
                    for (let rule of rules){
                        matchesPerPlugin.push([
                            {
                                ...sort,
                                options: {
                                    ...sort.options,
                                    ...options
                                }
                            },
                            rule
                        ]);
                    }
                }
            } else if (modifier === "DEFAULT" || modifier === "-DEFAULT") {
                let ruleSet = plugin;
                let [rules, options] = parseRules(ruleSet, context.postCssNodeCache);
                for (let rule of rules){
                    matchesPerPlugin.push([
                        {
                            ...sort,
                            options: {
                                ...sort.options,
                                ...options
                            }
                        },
                        rule
                    ]);
                }
            }
            if (matchesPerPlugin.length > 0) {
                var _sort_options;
                var _sort_options_types, _sort_options1;
                let matchingTypes = Array.from((0, _pluginUtils.getMatchingTypes)((_sort_options_types = (_sort_options = sort.options) === null || _sort_options === void 0 ? void 0 : _sort_options.types) !== null && _sort_options_types !== void 0 ? _sort_options_types : [], modifier, (_sort_options1 = sort.options) !== null && _sort_options1 !== void 0 ? _sort_options1 : {}, context.tailwindConfig)).map(([_, type])=>type);
                if (matchingTypes.length > 0) {
                    typesByMatches.set(matchesPerPlugin, matchingTypes);
                }
                matches.push(matchesPerPlugin);
            }
        }
        if (isArbitraryValue(modifier)) {
            if (matches.length > 1) {
                // Partition plugins in 2 categories so that we can start searching in the plugins that
                // don't have `any` as a type first.
                let [withAny, withoutAny] = matches.reduce((group, plugin)=>{
                    let hasAnyType = plugin.some(([{ options  }])=>options.types.some(({ type  })=>type === "any"));
                    if (hasAnyType) {
                        group[0].push(plugin);
                    } else {
                        group[1].push(plugin);
                    }
                    return group;
                }, [
                    [],
                    []
                ]);
                function findFallback(matches) {
                    // If only a single plugin matches, let's take that one
                    if (matches.length === 1) {
                        return matches[0];
                    }
                    // Otherwise, find the plugin that creates a valid rule given the arbitrary value, and
                    // also has the correct type which preferOnConflicts the plugin in case of clashes.
                    return matches.find((rules)=>{
                        let matchingTypes = typesByMatches.get(rules);
                        return rules.some(([{ options  }, rule])=>{
                            if (!isParsableNode(rule)) {
                                return false;
                            }
                            return options.types.some(({ type , preferOnConflict  })=>matchingTypes.includes(type) && preferOnConflict);
                        });
                    });
                }
                var _findFallback;
                // Try to find a fallback plugin, because we already know that multiple plugins matched for
                // the given arbitrary value.
                let fallback = (_findFallback = findFallback(withoutAny)) !== null && _findFallback !== void 0 ? _findFallback : findFallback(withAny);
                if (fallback) {
                    matches = [
                        fallback
                    ];
                } else {
                    var _typesByMatches_get;
                    let typesPerPlugin = matches.map((match)=>new Set([
                            ...(_typesByMatches_get = typesByMatches.get(match)) !== null && _typesByMatches_get !== void 0 ? _typesByMatches_get : []
                        ]));
                    // Remove duplicates, so that we can detect proper unique types for each plugin.
                    for (let pluginTypes of typesPerPlugin){
                        for (let type of pluginTypes){
                            let removeFromOwnGroup = false;
                            for (let otherGroup of typesPerPlugin){
                                if (pluginTypes === otherGroup) continue;
                                if (otherGroup.has(type)) {
                                    otherGroup.delete(type);
                                    removeFromOwnGroup = true;
                                }
                            }
                            if (removeFromOwnGroup) pluginTypes.delete(type);
                        }
                    }
                    let messages = [];
                    for (let [idx, group] of typesPerPlugin.entries()){
                        for (let type of group){
                            let rules = matches[idx].map(([, rule])=>rule).flat().map((rule)=>rule.toString().split("\n").slice(1, -1) // Remove selector and closing '}'
                                .map((line)=>line.trim()).map((x)=>`      ${x}`) // Re-indent
                                .join("\n")).join("\n\n");
                            messages.push(`  Use \`${candidate.replace("[", `[${type}:`)}\` for \`${rules.trim()}\``);
                            break;
                        }
                    }
                    _log.default.warn([
                        `The class \`${candidate}\` is ambiguous and matches multiple utilities.`,
                        ...messages,
                        `If this is content and not a class, replace it with \`${candidate.replace("[", "&lsqb;").replace("]", "&rsqb;")}\` to silence this warning.`
                    ]);
                    continue;
                }
            }
            matches = matches.map((list)=>list.filter((match)=>isParsableNode(match[1])));
        }
        matches = matches.flat();
        matches = Array.from(recordCandidates(matches, classCandidate));
        matches = applyPrefix(matches, context);
        if (important) {
            matches = applyImportant(matches, classCandidate);
        }
        for (let variant of variants){
            matches = applyVariant(variant, matches, context);
        }
        for (let match of matches){
            match[1].raws.tailwind = {
                ...match[1].raws.tailwind,
                candidate
            };
            // Apply final format selector
            match = applyFinalFormat(match, {
                context,
                candidate
            });
            // Skip rules with invalid selectors
            // This will cause the candidate to be added to the "not class"
            // cache skipping it entirely for future builds
            if (match === null) {
                continue;
            }
            yield match;
        }
    }
}
function applyFinalFormat(match, { context , candidate  }) {
    if (!match[0].collectedFormats) {
        return match;
    }
    let isValid = true;
    let finalFormat;
    try {
        finalFormat = (0, _formatVariantSelector.formatVariantSelector)(match[0].collectedFormats, {
            context,
            candidate
        });
    } catch  {
        // The format selector we produced is invalid
        // This could be because:
        // - A bug exists
        // - A plugin introduced an invalid variant selector (ex: `addVariant('foo', '&;foo')`)
        // - The user used an invalid arbitrary variant (ex: `[&;foo]:underline`)
        // Either way the build will fail because of this
        // We would rather that the build pass "silently" given that this could
        // happen because of picking up invalid things when scanning content
        // So we'll throw out the candidate instead
        return null;
    }
    let container = _postcss.default.root({
        nodes: [
            match[1].clone()
        ]
    });
    container.walkRules((rule)=>{
        if (inKeyframes(rule)) {
            return;
        }
        try {
            let selector = (0, _formatVariantSelector.finalizeSelector)(rule.selector, finalFormat, {
                candidate,
                context
            });
            // Finalize Selector determined that this candidate is irrelevant
            // TODO: This elimination should happen earlier so this never happens
            if (selector === null) {
                rule.remove();
                return;
            }
            rule.selector = selector;
        } catch  {
            // If this selector is invalid we also want to skip it
            // But it's likely that being invalid here means there's a bug in a plugin rather than too loosely matching content
            isValid = false;
            return false;
        }
    });
    if (!isValid) {
        return null;
    }
    // If all rules have been eliminated we can skip this candidate entirely
    if (container.nodes.length === 0) {
        return null;
    }
    match[1] = container.nodes[0];
    return match;
}
function inKeyframes(rule) {
    return rule.parent && rule.parent.type === "atrule" && rule.parent.name === "keyframes";
}
function getImportantStrategy(important) {
    if (important === true) {
        return (rule)=>{
            if (inKeyframes(rule)) {
                return;
            }
            rule.walkDecls((d)=>{
                if (d.parent.type === "rule" && !inKeyframes(d.parent)) {
                    d.important = true;
                }
            });
        };
    }
    if (typeof important === "string") {
        return (rule)=>{
            if (inKeyframes(rule)) {
                return;
            }
            rule.selectors = rule.selectors.map((selector)=>{
                return (0, _applyImportantSelector.applyImportantSelector)(selector, important);
            });
        };
    }
}
function generateRules(candidates, context, isSorting = false) {
    let allRules = [];
    let strategy = getImportantStrategy(context.tailwindConfig.important);
    for (let candidate of candidates){
        if (context.notClassCache.has(candidate)) {
            continue;
        }
        if (context.candidateRuleCache.has(candidate)) {
            allRules = allRules.concat(Array.from(context.candidateRuleCache.get(candidate)));
            continue;
        }
        let matches = Array.from(resolveMatches(candidate, context));
        if (matches.length === 0) {
            context.notClassCache.add(candidate);
            continue;
        }
        context.classCache.set(candidate, matches);
        var _context_candidateRuleCache_get;
        let rules = (_context_candidateRuleCache_get = context.candidateRuleCache.get(candidate)) !== null && _context_candidateRuleCache_get !== void 0 ? _context_candidateRuleCache_get : new Set();
        context.candidateRuleCache.set(candidate, rules);
        for (const match of matches){
            let [{ sort , options  }, rule] = match;
            if (options.respectImportant && strategy) {
                let container = _postcss.default.root({
                    nodes: [
                        rule.clone()
                    ]
                });
                container.walkRules(strategy);
                rule = container.nodes[0];
            }
            // Note: We have to clone rules during sorting
            // so we eliminate some shared mutable state
            let newEntry = [
                sort,
                isSorting ? rule.clone() : rule
            ];
            rules.add(newEntry);
            context.ruleCache.add(newEntry);
            allRules.push(newEntry);
        }
    }
    return allRules;
}
function isArbitraryValue(input) {
    return input.startsWith("[") && input.endsWith("]");
}
