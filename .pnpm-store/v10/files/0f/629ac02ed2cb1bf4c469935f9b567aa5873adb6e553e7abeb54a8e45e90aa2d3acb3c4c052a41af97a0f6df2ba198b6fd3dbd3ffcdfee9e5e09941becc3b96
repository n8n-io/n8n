"use strict";
// Forked from https://github.com/eslint/eslint/blob/4b23ffd6454cfb1a269430f5fe28e7d1c37b9d3e/lib/config/flat-config-schema.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatConfigSchema = void 0;
const severity_1 = require("./severity");
const ruleSeverities = new Map([
    ['error', 2],
    ['off', 0],
    ['warn', 1],
    [0, 0],
    [1, 1],
    [2, 2],
]);
/**
 * Check if a value is a non-null object.
 * @param value The value to check.
 * @returns `true` if the value is a non-null object.
 */
function isNonNullObject(value) {
    // eslint-disable-next-line eqeqeq, @typescript-eslint/internal/eqeq-nullish
    return typeof value === 'object' && value !== null;
}
/**
 * Check if a value is a non-null non-array object.
 * @param value The value to check.
 * @returns `true` if the value is a non-null non-array object.
 */
function isNonArrayObject(value) {
    return isNonNullObject(value) && !Array.isArray(value);
}
/**
 * Deeply merges two non-array objects.
 * @param first The base object.
 * @param second The overrides object.
 * @param mergeMap Maps the combination of first and second arguments to a merged result.
 * @returns An object with properties from both first and second.
 */
function deepMerge(first, second, mergeMap = new Map()) {
    let secondMergeMap = mergeMap.get(first);
    if (secondMergeMap) {
        const result = secondMergeMap.get(second);
        if (result) {
            // If this combination of first and second arguments has been already visited, return the previously created result.
            return result;
        }
    }
    else {
        secondMergeMap = new Map();
        mergeMap.set(first, secondMergeMap);
    }
    /*
     * First create a result object where properties from the second object
     * overwrite properties from the first. This sets up a baseline to use
     * later rather than needing to inspect and change every property
     * individually.
     */
    const result = {
        ...first,
        ...second,
    };
    delete result.__proto__; // don't merge own property "__proto__"
    // Store the pending result for this combination of first and second arguments.
    secondMergeMap.set(second, result);
    for (const key of Object.keys(second)) {
        // avoid hairy edge case
        if (key === '__proto__' ||
            !Object.prototype.propertyIsEnumerable.call(first, key)) {
            continue;
        }
        const firstValue = first[key];
        const secondValue = second[key];
        if (isNonArrayObject(firstValue) && isNonArrayObject(secondValue)) {
            result[key] = deepMerge(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            firstValue, 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secondValue, mergeMap);
            // eslint-disable-next-line @typescript-eslint/internal/eqeq-nullish
        }
        else if (secondValue === undefined) {
            result[key] = firstValue;
        }
    }
    return result;
}
/**
 * Normalizes the rule options config for a given rule by ensuring that
 * it is an array and that the first item is 0, 1, or 2.
 * @param ruleOptions The rule options config.
 * @returns An array of rule options.
 */
function normalizeRuleOptions(ruleOptions) {
    const finalOptions = Array.isArray(ruleOptions)
        ? [...ruleOptions]
        : [ruleOptions];
    finalOptions[0] = ruleSeverities.get(finalOptions[0]);
    return structuredClone(finalOptions);
}
/**
 * Determines if an object has any methods.
 * @param object The object to check.
 * @returns `true` if the object has any methods.
 */
function hasMethod(object) {
    for (const key of Object.keys(object)) {
        if (typeof object[key] === 'function') {
            return true;
        }
    }
    return false;
}
/**
 * The error type when a rule's options are configured with an invalid type.
 */
class InvalidRuleOptionsError extends Error {
    messageData;
    messageTemplate;
    constructor(ruleId, value) {
        super(`Key "${ruleId}": Expected severity of "off", 0, "warn", 1, "error", or 2.`);
        this.messageTemplate = 'invalid-rule-options';
        this.messageData = { ruleId, value };
    }
}
/**
 * Validates that a value is a valid rule options entry.
 * @param ruleId Rule name being configured.
 * @param value The value to check.
 * @throws {InvalidRuleOptionsError} If the value isn't a valid rule options.
 */
function assertIsRuleOptions(ruleId, value) {
    if (typeof value !== 'string' &&
        typeof value !== 'number' &&
        !Array.isArray(value)) {
        throw new InvalidRuleOptionsError(ruleId, value);
    }
}
/**
 * The error type when a rule's severity is invalid.
 */
class InvalidRuleSeverityError extends Error {
    messageData;
    messageTemplate;
    constructor(ruleId, value) {
        super(`Key "${ruleId}": Expected severity of "off", 0, "warn", 1, "error", or 2.`);
        this.messageTemplate = 'invalid-rule-severity';
        this.messageData = { ruleId, value };
    }
}
/**
 * Validates that a value is valid rule severity.
 * @param ruleId Rule name being configured.
 * @param value The value to check.
 * @throws {InvalidRuleSeverityError} If the value isn't a valid rule severity.
 */
function assertIsRuleSeverity(ruleId, value) {
    const severity = ruleSeverities.get(value);
    if (severity == null) {
        throw new InvalidRuleSeverityError(ruleId, value);
    }
}
/**
 * Validates that a given string is the form pluginName/objectName.
 * @param value The string to check.
 */
function assertIsPluginMemberName(value) {
    if (typeof value !== 'string' || !/[@\w$-]+(?:\/[\w$-]+)+$/iu.test(value)) {
        throw new TypeError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Expected string in the form "pluginName/objectName" but found "${value}".`);
    }
}
/**
 * Validates that a value is an object.
 * @param value The value to check.
 */
function assertIsObject(value) {
    if (!isNonNullObject(value)) {
        throw new TypeError('Expected an object.');
    }
}
/**
 * The error type when there's an eslintrc-style options in a flat config.
 */
class IncompatibleKeyError extends Error {
    messageData;
    messageTemplate;
    /**
     * @param key The invalid key.
     */
    constructor(key) {
        super('This appears to be in eslintrc format rather than flat config format.');
        this.messageTemplate = 'eslintrc-incompat';
        this.messageData = { key };
    }
}
/**
 * The error type when there's an eslintrc-style plugins array found.
 */
class IncompatiblePluginsError extends Error {
    messageData;
    messageTemplate;
    constructor(plugins) {
        super('This appears to be in eslintrc format (array of strings) rather than flat config format (object).');
        this.messageTemplate = 'eslintrc-plugins';
        this.messageData = { plugins };
    }
}
const booleanSchema = {
    merge: 'replace',
    validate: 'boolean',
};
const ALLOWED_SEVERITIES = new Set([0, 1, 2, 'error', 'off', 'warn']);
const disableDirectiveSeveritySchema = {
    merge(first, second) {
        const value = second ?? first;
        if (typeof value === 'boolean') {
            return value ? 'warn' : 'off';
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return (0, severity_1.normalizeSeverityToNumber)(value);
    },
    validate(value) {
        if (!(ALLOWED_SEVERITIES.has(value) ||
            typeof value === 'boolean')) {
            throw new TypeError('Expected one of: "error", "warn", "off", 0, 1, 2, or a boolean.');
        }
    },
};
const deepObjectAssignSchema = {
    merge(first = {}, second = {}) {
        return deepMerge(first, second);
    },
    validate: 'object',
};
const languageOptionsSchema = {
    merge(first = {}, second = {}) {
        const result = deepMerge(first, second);
        for (const [key, value] of Object.entries(result)) {
            /*
             * Special case: Because the `parser` property is an object, it should
             * not be deep merged. Instead, it should be replaced if it exists in
             * the second object. To make this more generic, we just check for
             * objects with methods and replace them if they exist in the second
             * object.
             */
            if (isNonArrayObject(value)) {
                if (hasMethod(value)) {
                    result[key] = second[key] ?? first[key];
                    continue;
                }
                // for other objects, make sure we aren't reusing the same object
                result[key] = { ...result[key] };
                continue;
            }
        }
        return result;
    },
    validate: 'object',
};
const languageSchema = {
    merge: 'replace',
    validate: assertIsPluginMemberName,
};
const pluginsSchema = {
    merge(first = {}, second = {}) {
        const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
        const result = {};
        // manually validate that plugins are not redefined
        for (const key of keys) {
            // avoid hairy edge case
            if (key === '__proto__') {
                continue;
            }
            if (key in first && key in second && first[key] !== second[key]) {
                throw new TypeError(`Cannot redefine plugin "${key}".`);
            }
            result[key] = second[key] || first[key];
        }
        return result;
    },
    validate(value) {
        // first check the value to be sure it's an object
        if (value == null || typeof value !== 'object') {
            throw new TypeError('Expected an object.');
        }
        // make sure it's not an array, which would mean eslintrc-style is used
        if (Array.isArray(value)) {
            throw new IncompatiblePluginsError(value);
        }
        // second check the keys to make sure they are objects
        for (const key of Object.keys(value)) {
            // avoid hairy edge case
            if (key === '__proto__') {
                continue;
            }
            if (value[key] == null ||
                typeof value[key] !== 'object') {
                throw new TypeError(`Key "${key}": Expected an object.`);
            }
        }
    },
};
const processorSchema = {
    merge: 'replace',
    validate(value) {
        if (typeof value === 'string') {
            assertIsPluginMemberName(value);
        }
        else if (value && typeof value === 'object') {
            if (typeof value.preprocess !==
                'function' ||
                typeof value.postprocess !==
                    'function') {
                throw new TypeError('Object must have a preprocess() and a postprocess() method.');
            }
        }
        else {
            throw new TypeError('Expected an object or a string.');
        }
    },
};
const rulesSchema = {
    merge(first = {}, second = {}) {
        const result = {
            ...first,
            ...second,
        };
        for (const ruleId of Object.keys(result)) {
            try {
                // avoid hairy edge case
                if (ruleId === '__proto__') {
                    delete result.__proto__;
                    continue;
                }
                result[ruleId] = normalizeRuleOptions(result[ruleId]);
                /*
                 * If either rule config is missing, then the correct
                 * config is already present and we just need to normalize
                 * the severity.
                 */
                if (!(ruleId in first) || !(ruleId in second)) {
                    continue;
                }
                const firstRuleOptions = normalizeRuleOptions(first[ruleId]);
                const secondRuleOptions = normalizeRuleOptions(second[ruleId]);
                /*
                 * If the second rule config only has a severity (length of 1),
                 * then use that severity and keep the rest of the options from
                 * the first rule config.
                 */
                if (secondRuleOptions.length === 1) {
                    result[ruleId] = [secondRuleOptions[0], ...firstRuleOptions.slice(1)];
                    continue;
                }
                /*
                 * In any other situation, then the second rule config takes
                 * precedence. That means the value at `result[ruleId]` is
                 * already correct and no further work is necessary.
                 */
            }
            catch (ex) {
                throw new Error(`Key "${ruleId}": ${ex.message}`, {
                    cause: ex,
                });
            }
        }
        return result;
    },
    validate(value) {
        assertIsObject(value);
        /*
         * We are not checking the rule schema here because there is no
         * guarantee that the rule definition is present at this point. Instead
         * we wait and check the rule schema during the finalization step
         * of calculating a config.
         */
        for (const ruleId of Object.keys(value)) {
            // avoid hairy edge case
            if (ruleId === '__proto__') {
                continue;
            }
            const ruleOptions = value[ruleId];
            assertIsRuleOptions(ruleId, ruleOptions);
            if (Array.isArray(ruleOptions)) {
                assertIsRuleSeverity(ruleId, ruleOptions[0]);
            }
            else {
                assertIsRuleSeverity(ruleId, ruleOptions);
            }
        }
    },
};
/**
 * Creates a schema that always throws an error. Useful for warning
 * about eslintrc-style keys.
 * @param key The eslintrc key to create a schema for.
 */
function createEslintrcErrorSchema(key) {
    return {
        merge: 'replace',
        validate() {
            throw new IncompatibleKeyError(key);
        },
    };
}
const eslintrcKeys = [
    'env',
    'extends',
    'globals',
    'ignorePatterns',
    'noInlineConfig',
    'overrides',
    'parser',
    'parserOptions',
    'reportUnusedDisableDirectives',
    'root',
];
exports.flatConfigSchema = {
    $schema: { type: 'string' },
    // Original ESLint schemas from flat-config-schema.js
    // eslintrc-style keys that should always error
    ...Object.fromEntries(eslintrcKeys.map(key => [key, createEslintrcErrorSchema(key)])),
    // flat config keys
    language: languageSchema,
    languageOptions: languageOptionsSchema,
    linterOptions: {
        schema: {
            noInlineConfig: booleanSchema,
            reportUnusedDisableDirectives: disableDirectiveSeveritySchema,
        },
    },
    plugins: pluginsSchema,
    processor: processorSchema,
    rules: rulesSchema,
    settings: deepObjectAssignSchema,
    // not in ESLint source, but seemingly relevant?
    defaultFilenames: {
        additionalProperties: false,
        properties: {
            ts: { type: 'string' },
            tsx: { type: 'string' },
        },
        required: ['ts', 'tsx'],
        type: 'object',
    },
    // @typescript-eslint/rule-tester extensions
    dependencyConstraints: {
        additionalProperties: {
            type: 'string',
        },
        type: 'object',
    },
    files: { items: { type: 'string' }, type: 'array' },
};
