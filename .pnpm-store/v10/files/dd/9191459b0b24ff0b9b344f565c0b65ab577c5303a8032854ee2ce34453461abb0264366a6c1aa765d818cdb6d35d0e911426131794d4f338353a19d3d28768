"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRuntimeExpressionPayload = evaluateRuntimeExpressionPayload;
exports.evaluateRuntimeExpression = evaluateRuntimeExpression;
exports.isPureRuntimeExpression = isPureRuntimeExpression;
const utils_1 = require("@redocly/openapi-core/lib/utils");
const lint_1 = require("./lint");
const replace_json_pointers_1 = require("./replace-json-pointers");
const config_parser_1 = require("../config-parser");
// Used when evaluating expressions in a string that can contain other text, like request bodies payload, output values, etc.
function evaluateRuntimeExpressionPayload({ payload, context, contentType, }) {
    if (contentType?.includes('application/octet-stream') ||
        contentType?.includes('multipart/form-data')) {
        return (0, config_parser_1.parseJson)(payload, context); // Return parsed file content as JSON
    }
    if (typeof payload === 'string') {
        // Resolve string expressions
        return isPureRuntimeExpression(payload)
            ? evaluateRuntimeExpression(payload, context)
            : evaluateExpressionsInString(payload, context);
    }
    else if ((0, utils_1.isPlainObject)(payload)) {
        return Object.entries(payload).reduce((acc, [key, value]) => {
            acc[key] = evaluateRuntimeExpressionPayload({ payload: value, context });
            return acc;
        }, {});
    }
    else if (Array.isArray(payload)) {
        // Handle each element in an array
        return payload.map((item) => evaluateRuntimeExpressionPayload({ payload: item, context }));
    }
    else {
        // Return the payload as-is if it's not a string, object, or array
        return payload;
    }
}
// Evaluate runtime expressions in a given expression object. Used in SuccessCriteria conditions.
function evaluateRuntimeExpression(expression, context) {
    if (typeof expression === 'string') {
        return evaluateExpressionString(expression, context);
    }
    else if ((0, utils_1.isPlainObject)(expression)) {
        return Object.entries(expression).reduce((acc, [key, value]) => {
            acc[key] = value && evaluateRuntimeExpression(value, context);
            return acc;
        }, {});
    }
    else if (Array.isArray(expression)) {
        return expression.map((exp) => evaluateRuntimeExpression(exp, context));
    }
    else {
        return expression;
    }
}
function evaluateExpressionString(expression, context) {
    // Replace $faker expressions with fake data as it is not the part of the Runtime
    // Expressions and should be evaluated separately
    if (/^\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?$/.test(expression)) {
        return (0, config_parser_1.getFakeData)(expression.slice(1), context);
    }
    else if (expression.includes('$faker.')) {
        const fakerRegex = /\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?/g;
        expression = expression
            .replace(fakerRegex, (match) => {
            return (0, config_parser_1.getFakeData)(match.slice(1), context);
        })
            .replace(/{(.*?)}/g, '$1');
    }
    if (!expression.includes('$') && !/[=<>]/.test(expression)) {
        return expression;
    }
    // Validate expression syntax to match ABNF Arazzo grammar
    (0, lint_1.lintExpression)(expression);
    const normalizedExpression = normalizeExpression(expression, context);
    // Normalize the context for evaluation by replacing hyphens with underscores in all keys
    const normalizedContext = normalizeContext(context);
    try {
        // Create a new Function to evaluate the expression
        const evaluate = new Function(...Object.keys(normalizedContext), `return ${normalizedExpression};`);
        // Evaluate the modified expression
        return evaluate(...Object.values(normalizedContext));
    }
    catch (_error) {
        throw new Error(`Error in resolving runtime expression '${expression}'. \n` +
            "This could be because the expression references a value from a previous failed step, or is trying to reference a variable that hasn't been set.");
    }
}
// Normalize the expression to replace hyphens with underscores and convert to lowercase
function normalizeSymbolsExpression(expression) {
    return expression.replace(/\$([a-zA-Z0-9._-]+)/g, (_match, variable) => {
        // Normalize variable by replacing hyphens with underscores and converting to lowercase
        const normalizedKey = variable.replace(/-/g, '_'); // Replace hyphens with underscores
        return `$${normalizedKey}`; // Return the normalized variable for evaluation
    });
}
function normalizeExpression(expression, context) {
    const modifiedJsExpression = (0, replace_json_pointers_1.replaceJSONPointers)(expression, context);
    // Normalize the expression for evaluation by replacing hyphens with underscores and converting to lowercase
    const normalizedSymbolsExpression = normalizeSymbolsExpression(modifiedJsExpression);
    // Remove the curly braces surrounding the expression (if any)
    const cleanedJsExpression = normalizedSymbolsExpression.replace(/{(.*?)}/g, '$1');
    // Convert numeric indices (e.g., `.0`) into square bracket notation (e.g., `[0]`)
    const expressionWithBrackets = convertNumericIndices(cleanedJsExpression);
    // Check if the expression contains `.header.` and lowercase the parameter after `.header.`.
    // As headers are case-insensitive, we need to normalize the header names to lowercase for evaluation.
    const headerParameterNameRegex = /\.header\.([a-zA-Z0-9._-]+)/g;
    const normalizedExpression = expressionWithBrackets.replace(headerParameterNameRegex, (_match, p1) => {
        return `.header.${p1.toLowerCase()}`;
    });
    return normalizedExpression;
}
// Normalize the entire context to replace hyphens with underscores in all keys
function normalizeContext(context) {
    const normalized = {};
    for (const [key, value] of Object.entries(context)) {
        // Normalize variable names to lowercase and replace hyphens with underscores
        const normalizedKey = key.replace(/-/g, '_');
        normalized[normalizedKey] = normalizeValue(value);
    }
    return normalized;
}
// Normalize values recursively, handling objects and primitives
function normalizeValue(value) {
    if (Array.isArray(value)) {
        // If the value is an array, return it as-is without modifying
        return value;
    }
    else if (typeof value === 'object' && value !== null) {
        return normalizeObject(value);
    }
    return value;
}
// Normalize an object by replacing hyphens with underscores in keys
function normalizeObject(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        const normalizedKey = key.replace(/-/g, '_'); // Convert hyphens to underscores
        acc[normalizedKey] = normalizeValue(obj[key]);
        return acc;
    }, {});
}
function convertNumericIndices(expression) {
    // Match any dot followed by a number (e.g., .0, .1, etc.) and replace it with [0], [1], etc.
    // but not modify floats.
    return expression.replace(/\.(\d+)/g, (match, num, offset, str) => {
        // Look at the character right before the dot
        const charBeforeDot = str[offset - 1];
        // If the character before the dot is a digit, it's a float
        const isFloat = /\d/.test(charBeforeDot);
        return isFloat ? match : `[${num}]`;
    });
}
// Helper function to evaluate expressions within a string
function evaluateExpressionsInString(expression, context) {
    const regex = /\{(?:[^{}]|\{[^{}]*\})*\}|\$[^\s{}]+(?:\([^()]*\))*/g;
    return expression.replace(regex, (match) => {
        const exprToEvaluate = match.trim();
        // For dollar expressions, include the leading $ when passing to evaluateRuntimeExpression
        const evaluatedValue = evaluateRuntimeExpression(exprToEvaluate, context);
        // Return evaluated value or the original match if undefined
        return evaluatedValue !== undefined ? evaluatedValue : match;
    });
}
function isPureRuntimeExpression(expression) {
    // Regular expression to match runtime expressions
    const regex = /^\$[^\s{}]+(\([^)]*\))?$|^\{[^{}]*\}$/;
    // Check if the expression matches the runtime expression format
    return regex.test(expression.trim());
}
//# sourceMappingURL=evaluate.js.map