"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathRewriter = createPathRewriter;
const is_plain_object_1 = require("is-plain-object");
const errors_1 = require("./errors");
const debug_1 = require("./debug");
const debug = debug_1.Debug.extend('path-rewriter');
/**
 * Create rewrite function, to cache parsed rewrite rules.
 *
 * @param {Object} rewriteConfig
 * @return {Function} Function to rewrite paths; This function should accept `path` (request.url) as parameter
 */
function createPathRewriter(rewriteConfig) {
    let rulesCache;
    if (!isValidRewriteConfig(rewriteConfig)) {
        return;
    }
    if (typeof rewriteConfig === 'function') {
        const customRewriteFn = rewriteConfig;
        return customRewriteFn;
    }
    else {
        rulesCache = parsePathRewriteRules(rewriteConfig);
        return rewritePath;
    }
    function rewritePath(path) {
        let result = path;
        for (const rule of rulesCache) {
            if (rule.regex.test(path)) {
                result = result.replace(rule.regex, rule.value);
                debug('rewriting path from "%s" to "%s"', path, result);
                break;
            }
        }
        return result;
    }
}
function isValidRewriteConfig(rewriteConfig) {
    if (typeof rewriteConfig === 'function') {
        return true;
    }
    else if ((0, is_plain_object_1.isPlainObject)(rewriteConfig)) {
        return Object.keys(rewriteConfig).length !== 0;
    }
    else if (rewriteConfig === undefined || rewriteConfig === null) {
        return false;
    }
    else {
        throw new Error(errors_1.ERRORS.ERR_PATH_REWRITER_CONFIG);
    }
}
function parsePathRewriteRules(rewriteConfig) {
    const rules = [];
    if ((0, is_plain_object_1.isPlainObject)(rewriteConfig)) {
        for (const [key, value] of Object.entries(rewriteConfig)) {
            rules.push({
                regex: new RegExp(key),
                value: value,
            });
            debug('rewrite rule created: "%s" ~> "%s"', key, value);
        }
    }
    return rules;
}
