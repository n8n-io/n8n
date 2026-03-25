"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignConfig = exports.stringifyYaml = exports.parseYaml = void 0;
exports.pushStack = pushStack;
exports.pluralize = pluralize;
exports.popStack = popStack;
exports.loadYaml = loadYaml;
exports.isDefined = isDefined;
exports.isPlainObject = isPlainObject;
exports.isEmptyObject = isEmptyObject;
exports.isNotEmptyObject = isNotEmptyObject;
exports.isEmptyArray = isEmptyArray;
exports.isNotEmptyArray = isNotEmptyArray;
exports.readFileFromUrl = readFileFromUrl;
exports.pickObjectProps = pickObjectProps;
exports.omitObjectProps = omitObjectProps;
exports.splitCamelCaseIntoWords = splitCamelCaseIntoWords;
exports.validateMimeType = validateMimeType;
exports.validateMimeTypeOAS3 = validateMimeTypeOAS3;
exports.readFileAsStringSync = readFileAsStringSync;
exports.yamlAndJsonSyncReader = yamlAndJsonSyncReader;
exports.isPathParameter = isPathParameter;
exports.slash = slash;
exports.isString = isString;
exports.isNotString = isNotString;
exports.assignOnlyExistingConfig = assignOnlyExistingConfig;
exports.getMatchingStatusCodeRange = getMatchingStatusCodeRange;
exports.isCustomRuleId = isCustomRuleId;
exports.doesYamlFileExist = doesYamlFileExist;
exports.showWarningForDeprecatedField = showWarningForDeprecatedField;
exports.showErrorForDeprecatedField = showErrorForDeprecatedField;
exports.isTruthy = isTruthy;
exports.identity = identity;
exports.keysOf = keysOf;
exports.pickDefined = pickDefined;
exports.nextTick = nextTick;
exports.pause = pause;
exports.getProxyAgent = getProxyAgent;
exports.dequal = dequal;
const fs = require("fs");
const path_1 = require("path");
const minimatch = require("minimatch");
const js_yaml_1 = require("./js-yaml");
const env_1 = require("./env");
const logger_1 = require("./logger");
const https_proxy_agent_1 = require("https-proxy-agent");
const pluralizeOne = require("pluralize");
var js_yaml_2 = require("./js-yaml");
Object.defineProperty(exports, "parseYaml", { enumerable: true, get: function () { return js_yaml_2.parseYaml; } });
Object.defineProperty(exports, "stringifyYaml", { enumerable: true, get: function () { return js_yaml_2.stringifyYaml; } });
function pushStack(head, value) {
    return { prev: head, value };
}
function pluralize(sentence, count, inclusive) {
    return sentence
        .split(' ')
        .map((word) => pluralizeOne(word, count, inclusive))
        .join(' ');
}
function popStack(head) {
    return head?.prev ?? null;
}
async function loadYaml(filename) {
    const contents = await fs.promises.readFile(filename, 'utf-8');
    return (0, js_yaml_1.parseYaml)(contents);
}
function isDefined(x) {
    return x !== undefined;
}
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isEmptyObject(value) {
    return isPlainObject(value) && Object.keys(value).length === 0;
}
function isNotEmptyObject(obj) {
    return isPlainObject(obj) && !isEmptyObject(obj);
}
function isEmptyArray(value) {
    return Array.isArray(value) && value.length === 0;
}
function isNotEmptyArray(args) {
    return !!args && Array.isArray(args) && !!args.length;
}
async function readFileFromUrl(url, config) {
    const headers = {};
    for (const header of config.headers) {
        if (match(url, header.matches)) {
            headers[header.name] =
                header.envVariable !== undefined ? env_1.env[header.envVariable] || '' : header.value;
        }
    }
    const req = await (config.customFetch || fetch)(url, {
        headers: headers,
    });
    if (!req.ok) {
        throw new Error(`Failed to load ${url}: ${req.status} ${req.statusText}`);
    }
    return { body: await req.text(), mimeType: req.headers.get('content-type') };
}
function match(url, pattern) {
    if (!pattern.match(/^https?:\/\//)) {
        // if pattern doesn't specify protocol directly, do not match against it
        url = url.replace(/^https?:\/\//, '');
    }
    return minimatch(url, pattern);
}
function pickObjectProps(object, keys) {
    return Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));
}
function omitObjectProps(object, keys) {
    return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}
function splitCamelCaseIntoWords(str) {
    const camel = str
        .split(/(?:[-._])|([A-Z][a-z]+)/)
        .filter(isTruthy)
        .map((item) => item.toLocaleLowerCase());
    const caps = str
        .split(/([A-Z]{2,})/)
        .filter((e) => e && e === e.toUpperCase())
        .map((item) => item.toLocaleLowerCase());
    return new Set([...camel, ...caps]);
}
function validateMimeType({ type, value }, { report, location }, allowedValues) {
    const ruleType = type === 'consumes' ? 'request' : 'response';
    if (!allowedValues)
        throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
    if (!value[type])
        return;
    for (const mime of value[type]) {
        if (!allowedValues.includes(mime)) {
            report({
                message: `Mime type "${mime}" is not allowed`,
                location: location.child(value[type].indexOf(mime)).key(),
            });
        }
    }
}
function validateMimeTypeOAS3({ type, value }, { report, location }, allowedValues) {
    const ruleType = type === 'consumes' ? 'request' : 'response';
    if (!allowedValues)
        throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
    if (!value.content)
        return;
    for (const mime of Object.keys(value.content)) {
        if (!allowedValues.includes(mime)) {
            report({
                message: `Mime type "${mime}" is not allowed`,
                location: location.child('content').child(mime).key(),
            });
        }
    }
}
function readFileAsStringSync(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}
function yamlAndJsonSyncReader(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return (0, js_yaml_1.parseYaml)(content);
}
function isPathParameter(pathSegment) {
    return pathSegment.startsWith('{') && pathSegment.endsWith('}');
}
/**
 * Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
 */
function slash(path) {
    const isExtendedLengthPath = /^\\\\\?\\/.test(path);
    if (isExtendedLengthPath) {
        return path;
    }
    return path.replace(/\\/g, '/');
}
// TODO: use it everywhere
function isString(value) {
    return typeof value === 'string';
}
function isNotString(value) {
    return !isString(value);
}
const assignConfig = (target, obj) => {
    if (!obj)
        return;
    for (const k of Object.keys(obj)) {
        if (isPlainObject(target[k]) && typeof obj[k] === 'string') {
            target[k].severity = obj[k];
        }
        else {
            target[k] = obj[k];
        }
    }
};
exports.assignConfig = assignConfig;
function assignOnlyExistingConfig(target, obj) {
    if (!obj)
        return;
    for (const k of Object.keys(obj)) {
        if (!target.hasOwnProperty(k))
            continue;
        if (isPlainObject(target[k]) && typeof obj[k] === 'string') {
            target[k].severity = obj[k];
        }
        else {
            target[k] = obj[k];
        }
    }
}
function getMatchingStatusCodeRange(code) {
    return `${code}`.replace(/^(\d)\d\d$/, (_, firstDigit) => `${firstDigit}XX`);
}
function isCustomRuleId(id) {
    return id.includes('/');
}
function doesYamlFileExist(filePath) {
    return (((0, path_1.extname)(filePath) === '.yaml' || (0, path_1.extname)(filePath) === '.yml') &&
        fs?.hasOwnProperty?.('existsSync') &&
        fs.existsSync(filePath));
}
function showWarningForDeprecatedField(deprecatedField, updatedField, updatedObject, link) {
    const readMoreText = link ? `Read more about this change: ${link}` : '';
    logger_1.logger.warn(`The '${logger_1.colorize.red(deprecatedField)}' field is deprecated. ${updatedField
        ? `Use ${logger_1.colorize.green(getUpdatedFieldName(updatedField, updatedObject))} instead. `
        : ''}${readMoreText}\n`);
}
function showErrorForDeprecatedField(deprecatedField, updatedField, updatedObject) {
    throw new Error(`Do not use '${deprecatedField}' field. ${updatedField ? `Use '${getUpdatedFieldName(updatedField, updatedObject)}' instead. ` : ''}\n`);
}
function isTruthy(value) {
    return !!value;
}
function identity(value) {
    return value;
}
function keysOf(obj) {
    if (!obj)
        return [];
    return Object.keys(obj);
}
function pickDefined(obj) {
    if (!obj)
        return undefined;
    const res = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            res[key] = obj[key];
        }
    }
    return res;
}
function nextTick() {
    return new Promise((resolve) => {
        setTimeout(resolve);
    });
}
async function pause(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getUpdatedFieldName(updatedField, updatedObject) {
    return `${typeof updatedObject !== 'undefined' ? `${updatedObject}.` : ''}${updatedField}`;
}
function getProxyAgent() {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    return proxy ? new https_proxy_agent_1.HttpsProxyAgent(proxy) : undefined;
}
/**
 * Checks if two objects are deeply equal.
 * Borrowed the source code from https://github.com/lukeed/dequal.
 */
function dequal(foo, bar) {
    let ctor, len;
    if (foo === bar)
        return true;
    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
        if (ctor === Date)
            return foo.getTime() === bar.getTime();
        if (ctor === RegExp)
            return foo.toString() === bar.toString();
        if (ctor === Array) {
            if ((len = foo.length) === bar.length) {
                while (len-- && dequal(foo[len], bar[len]))
                    ;
            }
            return len === -1;
        }
        if (!ctor || typeof foo === 'object') {
            len = 0;
            for (ctor in foo) {
                if (Object.prototype.hasOwnProperty.call(foo, ctor) &&
                    ++len &&
                    !Object.prototype.hasOwnProperty.call(bar, ctor))
                    return false;
                if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor]))
                    return false;
            }
            return Object.keys(bar).length === len;
        }
    }
    return foo !== foo && bar !== bar;
}
