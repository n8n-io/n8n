"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValueFromContext = getValueFromContext;
exports.replaceFakerVariablesInString = replaceFakerVariablesInString;
exports.getFakeData = getFakeData;
exports.parseJson = parseJson;
exports.resolvePath = resolvePath;
const colorette_1 = require("colorette");
const node_vm_1 = require("node:vm");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
const hasCurlyBraces = (input) => {
    return /\{.*?\}/.test(input);
};
function getValueFromContext(value, ctx) {
    if (!value)
        return value;
    if (typeof value === 'object') {
        for (const key in value) {
            value[key] = getValueFromContext(value[key], ctx);
        }
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (value.toString().startsWith('$faker.')) {
        return getFakeData(value.slice(1), ctx);
    }
    if (hasCurlyBraces(value)) {
        // multiple variables in string => {$var1} {$var2}
        return replaceVariablesInString(value, ctx);
    }
    else {
        // single variable in string => $var1
        return resolveValue(value, ctx);
    }
}
function replaceFakerVariablesInString(input, ctx) {
    const startIndex = input.indexOf('{');
    if (startIndex !== -1) {
        const substringAfterFirstBrace = input.substring(startIndex + 1);
        const fakerFunction = substringAfterFirstBrace.slice(0, -1);
        const fakerValue = getFakeData(fakerFunction.slice(1), ctx);
        return fakerValue && input.replace(/{(.*)}/, fakerValue);
    }
    else {
        return input;
    }
}
function replaceVariablesInString(input, ctx) {
    // Regular expression to match content inside ${...}
    const regex = /\{\$(\{[^{}]*\}|[^{}])*\}/g;
    let result = input;
    // Replace each match with its interpolated value
    result = result.replace(regex, (match, _code) => {
        return interpolate(match, ctx);
    });
    return result;
}
function interpolate(part, ctx) {
    if (!part.includes('$'))
        return part;
    if (part.includes('$faker.')) {
        return replaceFakerVariablesInString(part, ctx);
    }
    const value = getFrom(ctx)(removeFigureBrackets(part));
    return value !== undefined ? value : '';
}
const resolveValue = (value, ctx) => {
    if (!value)
        return value;
    const path = value.toString();
    if (!path.includes('$')) {
        return value;
    }
    // if path has $file('...') syntax, return the path but trim the $file(' and ')
    if (path.startsWith('$file(') && path.endsWith(')')) {
        return path.slice(7, -2);
    }
    // $sourceDescriptions.<name>.workflows.<workflowId>
    if (path.startsWith('$sourceDescriptions.') && path.includes('.workflows.')) {
        const parts = path.split('.');
        const sourceDescriptionName = parts[1];
        const workflowId = parts[3];
        if (!sourceDescriptionName || !workflowId) {
            return undefined;
        }
        const sourceDescriptions = getFrom(ctx)('$sourceDescriptions');
        if (!sourceDescriptions[sourceDescriptionName]) {
            return undefined;
        }
        return sourceDescriptions[sourceDescriptionName].workflows.find((workflow) => workflow.workflowId === workflowId);
    }
    if (path && path.trim().startsWith('faker.')) {
        return getFakeData(path, ctx);
    }
    return path
        ? getFrom(ctx)(replaceSquareBrackets(path))
        : path.replace(/\$\{([^}]+)}/g, (_, path) => getFrom(ctx)(replaceSquareBrackets(path)));
};
function removeFigureBrackets(input) {
    return input.replace(/\{(.*)\}/, '$1');
}
function replaceSquareBrackets(input) {
    return input.replace(/\['(.*?)'\]/g, '.$1');
}
const getFrom = ($, originalPointer = '') => (pointer) => {
    if (!originalPointer) {
        originalPointer = pointer; // Store the first pointer only during the initial call
    }
    if (!pointer)
        return $;
    const [key, ...rest] = pointer.split('.');
    if (!$) {
        throw Error(`Cannot get ${(0, colorette_1.red)(key)} from ${(0, colorette_1.red)(originalPointer)}`);
    }
    if ($?.[key] === undefined) {
        const reason = ` Undefined ${(0, colorette_1.red)(key)} at ${(0, colorette_1.red)(originalPointer)}.`;
        const additionalInfo = Object.keys($).length
            ? `Did you mean to use another key? Available keys:\n${Object.keys($).join(', ')}.\n`
            : '';
        const errorMessage = `${reason} ${additionalInfo}`;
        throw Error(errorMessage);
    }
    return getFrom($[key], originalPointer)(rest.join('.'));
};
function getFakeData(pointer, ctx) {
    const segments = pointer.split('.');
    const fakerContext = { ctx: { faker: ctx.$faker } };
    try {
        (0, node_vm_1.createContext)(fakerContext);
        const escapedSegments = segments
            .map((segment) => segment.trim())
            .map((segment, idx) => 
        // Dumb function check (if ends by ')'), if function goes first dont need to put '.',
        // if goes second and so on - must be prepended by '.', like ["escaped-field"].func()
        segment.endsWith(')') ? `${idx == 0 ? '' : '.'}${segment}` : `["${segment}"]`)
            .join('');
        return (0, node_vm_1.runInContext)(`ctx${escapedSegments}`, fakerContext);
    }
    catch (err) {
        logger.error((0, colorette_1.red)(err.toString()));
        return undefined;
    }
}
function modifyJSON(value, ctx) {
    if (typeof value === 'string') {
        if (value)
            return getValueFromContext(value, ctx);
    }
    if (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'undefined' ||
        value === null)
        return;
    for (const i in value) {
        if (typeof value[i] === 'string') {
            if (value[i])
                value[i] = getValueFromContext(value[i], ctx);
        }
        else {
            modifyJSON(value[i], ctx);
        }
    }
}
function parseJson(objectToResolve, ctx) {
    return modifyJSON(objectToResolve, ctx) || objectToResolve;
}
function resolvePath(path, pathParams) {
    if (!path)
        return;
    const paramsWithBraces = {};
    for (const param in pathParams) {
        paramsWithBraces[`{${param}}`] = String(pathParams[param]);
    }
    return path
        .split(/(\{[a-zA-Z0-9_.-]+\}+)/g)
        .map((key) => (paramsWithBraces[key] ? paramsWithBraces[key] : key))
        .join('');
}
//# sourceMappingURL=get-value-from-context.js.map