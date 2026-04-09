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
    updateAllClasses: function() {
        return updateAllClasses;
    },
    asValue: function() {
        return asValue;
    },
    parseColorFormat: function() {
        return parseColorFormat;
    },
    asColor: function() {
        return asColor;
    },
    asLookupValue: function() {
        return asLookupValue;
    },
    typeMap: function() {
        return typeMap;
    },
    coerceValue: function() {
        return coerceValue;
    },
    getMatchingTypes: function() {
        return getMatchingTypes;
    }
});
const _escapeCommas = /*#__PURE__*/ _interop_require_default(require("./escapeCommas"));
const _withAlphaVariable = require("./withAlphaVariable");
const _dataTypes = require("./dataTypes");
const _negateValue = /*#__PURE__*/ _interop_require_default(require("./negateValue"));
const _validateFormalSyntax = require("./validateFormalSyntax");
const _featureFlags = require("../featureFlags.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function updateAllClasses(selectors, updateClass) {
    selectors.walkClasses((sel)=>{
        sel.value = updateClass(sel.value);
        if (sel.raws && sel.raws.value) {
            sel.raws.value = (0, _escapeCommas.default)(sel.raws.value);
        }
    });
}
function resolveArbitraryValue(modifier, validate) {
    if (!isArbitraryValue(modifier)) {
        return undefined;
    }
    let value = modifier.slice(1, -1);
    if (!validate(value)) {
        return undefined;
    }
    return (0, _dataTypes.normalize)(value);
}
function asNegativeValue(modifier, lookup = {}, validate) {
    let positiveValue = lookup[modifier];
    if (positiveValue !== undefined) {
        return (0, _negateValue.default)(positiveValue);
    }
    if (isArbitraryValue(modifier)) {
        let resolved = resolveArbitraryValue(modifier, validate);
        if (resolved === undefined) {
            return undefined;
        }
        return (0, _negateValue.default)(resolved);
    }
}
function asValue(modifier, options = {}, { validate =()=>true  } = {}) {
    var _options_values;
    let value = (_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier];
    if (value !== undefined) {
        return value;
    }
    if (options.supportsNegativeValues && modifier.startsWith("-")) {
        return asNegativeValue(modifier.slice(1), options.values, validate);
    }
    return resolveArbitraryValue(modifier, validate);
}
function isArbitraryValue(input) {
    return input.startsWith("[") && input.endsWith("]");
}
function splitUtilityModifier(modifier) {
    let slashIdx = modifier.lastIndexOf("/");
    // If the `/` is inside an arbitrary, we want to find the previous one if any
    // This logic probably isn't perfect but it should work for most cases
    let arbitraryStartIdx = modifier.lastIndexOf("[", slashIdx);
    let arbitraryEndIdx = modifier.indexOf("]", slashIdx);
    let isNextToArbitrary = modifier[slashIdx - 1] === "]" || modifier[slashIdx + 1] === "[";
    // Backtrack to the previous `/` if the one we found was inside an arbitrary
    if (!isNextToArbitrary) {
        if (arbitraryStartIdx !== -1 && arbitraryEndIdx !== -1) {
            if (arbitraryStartIdx < slashIdx && slashIdx < arbitraryEndIdx) {
                slashIdx = modifier.lastIndexOf("/", arbitraryStartIdx);
            }
        }
    }
    if (slashIdx === -1 || slashIdx === modifier.length - 1) {
        return [
            modifier,
            undefined
        ];
    }
    let arbitrary = isArbitraryValue(modifier);
    // The modifier could be of the form `[foo]/[bar]`
    // We want to handle this case properly
    // without affecting `[foo/bar]`
    if (arbitrary && !modifier.includes("]/[")) {
        return [
            modifier,
            undefined
        ];
    }
    return [
        modifier.slice(0, slashIdx),
        modifier.slice(slashIdx + 1)
    ];
}
function parseColorFormat(value) {
    if (typeof value === "string" && value.includes("<alpha-value>")) {
        let oldValue = value;
        return ({ opacityValue =1  })=>oldValue.replace(/<alpha-value>/g, opacityValue);
    }
    return value;
}
function unwrapArbitraryModifier(modifier) {
    return (0, _dataTypes.normalize)(modifier.slice(1, -1));
}
function asColor(modifier, options = {}, { tailwindConfig ={}  } = {}) {
    var _options_values;
    if (((_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier]) !== undefined) {
        var _options_values1;
        return parseColorFormat((_options_values1 = options.values) === null || _options_values1 === void 0 ? void 0 : _options_values1[modifier]);
    }
    // TODO: Hoist this up to getMatchingTypes or something
    // We do this here because we need the alpha value (if any)
    let [color, alpha] = splitUtilityModifier(modifier);
    if (alpha !== undefined) {
        var _options_values2, _tailwindConfig_theme, _tailwindConfig_theme_opacity;
        var _options_values_color;
        let normalizedColor = (_options_values_color = (_options_values2 = options.values) === null || _options_values2 === void 0 ? void 0 : _options_values2[color]) !== null && _options_values_color !== void 0 ? _options_values_color : isArbitraryValue(color) ? color.slice(1, -1) : undefined;
        if (normalizedColor === undefined) {
            return undefined;
        }
        normalizedColor = parseColorFormat(normalizedColor);
        if (isArbitraryValue(alpha)) {
            return (0, _withAlphaVariable.withAlphaValue)(normalizedColor, unwrapArbitraryModifier(alpha));
        }
        if (((_tailwindConfig_theme = tailwindConfig.theme) === null || _tailwindConfig_theme === void 0 ? void 0 : (_tailwindConfig_theme_opacity = _tailwindConfig_theme.opacity) === null || _tailwindConfig_theme_opacity === void 0 ? void 0 : _tailwindConfig_theme_opacity[alpha]) === undefined) {
            return undefined;
        }
        return (0, _withAlphaVariable.withAlphaValue)(normalizedColor, tailwindConfig.theme.opacity[alpha]);
    }
    return asValue(modifier, options, {
        validate: _dataTypes.color
    });
}
function asLookupValue(modifier, options = {}) {
    var _options_values;
    return (_options_values = options.values) === null || _options_values === void 0 ? void 0 : _options_values[modifier];
}
function guess(validate) {
    return (modifier, options)=>{
        return asValue(modifier, options, {
            validate
        });
    };
}
let typeMap = {
    any: asValue,
    color: asColor,
    url: guess(_dataTypes.url),
    image: guess(_dataTypes.image),
    length: guess(_dataTypes.length),
    percentage: guess(_dataTypes.percentage),
    position: guess(_dataTypes.position),
    lookup: asLookupValue,
    "generic-name": guess(_dataTypes.genericName),
    "family-name": guess(_dataTypes.familyName),
    number: guess(_dataTypes.number),
    "line-width": guess(_dataTypes.lineWidth),
    "absolute-size": guess(_dataTypes.absoluteSize),
    "relative-size": guess(_dataTypes.relativeSize),
    shadow: guess(_dataTypes.shadow),
    size: guess(_validateFormalSyntax.backgroundSize)
};
let supportedTypes = Object.keys(typeMap);
function splitAtFirst(input, delim) {
    let idx = input.indexOf(delim);
    if (idx === -1) return [
        undefined,
        input
    ];
    return [
        input.slice(0, idx),
        input.slice(idx + 1)
    ];
}
function coerceValue(types, modifier, options, tailwindConfig) {
    if (options.values && modifier in options.values) {
        for (let { type  } of types !== null && types !== void 0 ? types : []){
            let result = typeMap[type](modifier, options, {
                tailwindConfig
            });
            if (result === undefined) {
                continue;
            }
            return [
                result,
                type,
                null
            ];
        }
    }
    if (isArbitraryValue(modifier)) {
        let arbitraryValue = modifier.slice(1, -1);
        let [explicitType, value] = splitAtFirst(arbitraryValue, ":");
        // It could be that this resolves to `url(https` which is not a valid
        // identifier. We currently only support "simple" words with dashes or
        // underscores. E.g.: family-name
        if (!/^[\w-_]+$/g.test(explicitType)) {
            value = arbitraryValue;
        } else if (explicitType !== undefined && !supportedTypes.includes(explicitType)) {
            return [];
        }
        if (value.length > 0 && supportedTypes.includes(explicitType)) {
            return [
                asValue(`[${value}]`, options),
                explicitType,
                null
            ];
        }
    }
    let matches = getMatchingTypes(types, modifier, options, tailwindConfig);
    // Find first matching type
    for (let match of matches){
        return match;
    }
    return [];
}
function* getMatchingTypes(types, rawModifier, options, tailwindConfig) {
    let modifiersEnabled = (0, _featureFlags.flagEnabled)(tailwindConfig, "generalizedModifiers");
    let [modifier, utilityModifier] = splitUtilityModifier(rawModifier);
    let canUseUtilityModifier = modifiersEnabled && options.modifiers != null && (options.modifiers === "any" || typeof options.modifiers === "object" && (utilityModifier && isArbitraryValue(utilityModifier) || utilityModifier in options.modifiers));
    if (!canUseUtilityModifier) {
        modifier = rawModifier;
        utilityModifier = undefined;
    }
    if (utilityModifier !== undefined && modifier === "") {
        modifier = "DEFAULT";
    }
    // Check the full value first
    // TODO: Move to asValue… somehow
    if (utilityModifier !== undefined) {
        if (typeof options.modifiers === "object") {
            var _options_modifiers;
            var _options_modifiers_utilityModifier;
            let configValue = (_options_modifiers_utilityModifier = (_options_modifiers = options.modifiers) === null || _options_modifiers === void 0 ? void 0 : _options_modifiers[utilityModifier]) !== null && _options_modifiers_utilityModifier !== void 0 ? _options_modifiers_utilityModifier : null;
            if (configValue !== null) {
                utilityModifier = configValue;
            } else if (isArbitraryValue(utilityModifier)) {
                utilityModifier = unwrapArbitraryModifier(utilityModifier);
            }
        }
    }
    for (let { type  } of types !== null && types !== void 0 ? types : []){
        let result = typeMap[type](modifier, options, {
            tailwindConfig
        });
        if (result === undefined) {
            continue;
        }
        yield [
            result,
            type,
            utilityModifier !== null && utilityModifier !== void 0 ? utilityModifier : null
        ];
    }
}
