"use strict";
// Forked from https://github.com/eslint/eslint/blob/ad9dd6a933fd098a0d99c6a9aa059850535c23ee/lib/shared/config-validator.js
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const use_at_your_own_risk_1 = require("eslint/use-at-your-own-risk");
const node_util_1 = __importDefault(require("node:util"));
const ajv_1 = require("./ajv");
const deprecation_warnings_1 = require("./deprecation-warnings");
const flat_config_schema_1 = require("./flat-config-schema");
const getRuleOptionsSchema_1 = require("./getRuleOptionsSchema");
const hasOwnProperty_1 = require("./hasOwnProperty");
const ajv = (0, ajv_1.ajvBuilder)();
const ruleValidators = new WeakMap();
let validateSchema;
const severityMap = {
    error: 2,
    off: 0,
    warn: 1,
};
/**
 * Validates a rule's severity and returns the severity value. Throws an error if the severity is invalid.
 * @param options The given options for the rule.
 * @throws {Error} Wrong severity value.
 */
function validateRuleSeverity(options) {
    const severity = Array.isArray(options) ? options[0] : options;
    const normSeverity = typeof severity === 'string'
        ? severityMap[severity.toLowerCase()]
        : severity;
    if (normSeverity === 0 || normSeverity === 1 || normSeverity === 2) {
        return normSeverity;
    }
    throw new Error(`\tSeverity should be one of the following: 0 = off, 1 = warn, 2 = error (you passed '${node_util_1.default
        .inspect(severity)
        .replaceAll("'", '"')
        .replaceAll('\n', '')}').\n`);
}
/**
 * Validates the non-severity options passed to a rule, based on its schema.
 * @param rule The rule to validate
 * @param localOptions The options for the rule, excluding severity
 * @throws {Error} Any rule validation errors.
 */
function validateRuleSchema(rule, localOptions) {
    if (!ruleValidators.has(rule)) {
        const schema = (0, getRuleOptionsSchema_1.getRuleOptionsSchema)(rule);
        if (schema) {
            ruleValidators.set(rule, ajv.compile(schema));
        }
    }
    const validateRule = ruleValidators.get(rule);
    if (validateRule) {
        void validateRule(localOptions);
        if (validateRule.errors) {
            throw new Error(validateRule.errors
                .map(error => `\tValue ${JSON.stringify(error.data)} ${error.message}.\n`)
                .join(''));
        }
    }
}
/**
 * Validates a rule's options against its schema.
 * @param rule The rule that the config is being validated for
 * @param ruleId The rule's unique name.
 * @param options The given options for the rule.
 * @param source The name of the configuration source to report in any errors. If null or undefined,
 * no source is prepended to the message.
 * @throws {Error} Upon any bad rule configuration.
 */
function validateRuleOptions(rule, ruleId, options, source = null) {
    try {
        const severity = validateRuleSeverity(options);
        if (severity !== 0) {
            validateRuleSchema(rule, Array.isArray(options) ? options.slice(1) : []);
        }
    }
    catch (err) {
        const enhancedMessage = `Configuration for rule "${ruleId}" is invalid:\n${err.message}`;
        if (typeof source === 'string') {
            throw new Error(`${source}:\n\t${enhancedMessage}`);
        }
        else {
            throw new Error(enhancedMessage);
        }
    }
}
/**
 * Validates a rules config object
 * @param rulesConfig The rules config object to validate.
 * @param source The name of the configuration source to report in any errors.
 * @param getAdditionalRule A map from strings to loaded rules
 */
function validateRules(rulesConfig, source, getAdditionalRule) {
    if (!rulesConfig) {
        return;
    }
    Object.keys(rulesConfig).forEach(id => {
        const rule = getAdditionalRule(id) ?? use_at_your_own_risk_1.builtinRules.get(id) ?? null;
        if (rule == null) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        validateRuleOptions(rule, id, rulesConfig[id], source);
    });
}
/**
 * Formats an array of schema validation errors.
 */
function formatErrors(errors) {
    return errors
        .map(error => {
        if (error.keyword === 'additionalProperties') {
            const params = error.params;
            const formattedPropertyPath = error.dataPath.length
                ? `${error.dataPath.slice(1)}.${params.additionalProperty}`
                : params.additionalProperty;
            return `Unexpected top-level property "${formattedPropertyPath}"`;
        }
        if (error.keyword === 'type') {
            const formattedField = error.dataPath.slice(1);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const formattedExpectedType = Array.isArray(error.schema)
                ? error.schema.join('/')
                : error.schema;
            const formattedValue = JSON.stringify(error.data);
            return `Property "${formattedField}" is the wrong type (expected ${formattedExpectedType} but got \`${formattedValue}\`)`;
        }
        const field = error.dataPath[0] === '.' ? error.dataPath.slice(1) : error.dataPath;
        return `"${field}" ${error.message}. Value: ${JSON.stringify(error.data)}`;
    })
        .map(message => `\t- ${message}.\n`)
        .join('');
}
/**
 * Validates the top level properties of the config object.
 * @param config The config object to validate.
 * @param source The name of the configuration source to report in any errors.
 * @throws {Error} For any config invalid per the schema.
 */
function validateConfigSchema(config, source) {
    validateSchema ??= ajv.compile(flat_config_schema_1.flatConfigSchema);
    if (!validateSchema(config)) {
        throw new Error(`ESLint configuration in ${source} is invalid:\n${formatErrors(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        validateSchema.errors)}`);
    }
    // @ts-expect-error -- intentional deprecated check
    if ((0, hasOwnProperty_1.hasOwnProperty)(config, 'ecmaFeatures')) {
        (0, deprecation_warnings_1.emitDeprecationWarning)(source, 'ESLINT_LEGACY_ECMAFEATURES');
    }
}
/**
 * Validates an entire config object.
 * @param config The config object to validate.
 * @param source The name of the configuration source to report in any errors.
 * @param getAdditionalRule A map from strings to loaded rules.
 */
function validate(config, source, getAdditionalRule) {
    validateConfigSchema(config, source);
    validateRules(config.rules, source, getAdditionalRule);
}
