import { join, sep, relative, dirname } from 'node:path';
import { RULE_SOURCE, } from './types.js';
import { getPluginRoot } from './package-json.js';
export function replaceRulePlaceholder(pathOrUrl, ruleName) {
    if (typeof pathOrUrl === 'function') {
        return pathOrUrl(ruleName);
    }
    return pathOrUrl.replaceAll('{name}', ruleName);
}
/**
 * Account for how Windows paths use backslashes instead of the forward slashes that URLs require.
 */
function pathToUrl(path) {
    return path.split(sep).join('/');
}
/**
 * Get the link to a rule's documentation page.
 * Will be relative to the current page.
 */
export function getUrlToRule(ruleName, ruleSource, pluginPrefix, pathPlugin, pathRuleDoc, pathCurrentPage, urlRuleDoc) {
    switch (ruleSource) {
        case RULE_SOURCE.eslintCore: {
            return `https://eslint.org/docs/latest/rules/${ruleName}`;
        }
        case RULE_SOURCE.thirdPartyPlugin: {
            // We don't know the documentation URL to third-party plugins.
            return undefined;
        }
        default: {
            // Fallthrough to remaining logic in function.
            break;
        }
    }
    // Ignore plugin prefix if it's included in rule name.
    // While we could display the prefix if we wanted, it definitely cannot be part of the link.
    const ruleNameWithoutPluginPrefix = ruleName.startsWith(`${pluginPrefix}/`)
        ? ruleName.slice(pluginPrefix.length + 1)
        : ruleName;
    // If the URL is a function, evaluate it.
    const urlRuleDocFunctionEvaluated = typeof urlRuleDoc === 'function'
        ? urlRuleDoc(ruleName, pathToUrl(relative(pathPlugin, pathCurrentPage)))
        : undefined;
    const pathRuleDocEvaluated = join(getPluginRoot(pathPlugin), replaceRulePlaceholder(pathRuleDoc, ruleNameWithoutPluginPrefix));
    return (
    // If the function returned a URL, use it.
    urlRuleDocFunctionEvaluated ??
        (typeof urlRuleDoc === 'string'
            ? // Otherwise, use the URL if it's a string.
                replaceRulePlaceholder(urlRuleDoc, ruleNameWithoutPluginPrefix)
            : // Finally, fallback to the relative path.
                pathToUrl(relative(dirname(pathCurrentPage), pathRuleDocEvaluated))));
}
/**
 * Get the markdown link (title and URL) to the rule's documentation.
 */
export function getLinkToRule(ruleName, plugin, pluginPrefix, pathPlugin, pathRuleDoc, pathCurrentPage, includeBackticks, includePrefix, urlRuleDoc) {
    const ruleNameWithoutPluginPrefix = ruleName.startsWith(`${pluginPrefix}/`)
        ? ruleName.slice(pluginPrefix.length + 1)
        : ruleName;
    // Determine what plugin this rule comes from.
    let ruleSource;
    if (plugin.rules?.[ruleNameWithoutPluginPrefix]) {
        ruleSource = RULE_SOURCE.self;
    }
    else if (ruleName.includes('/')) {
        // Assume a slash is for the plugin prefix (ESLint core doesn't have any nested rules).
        ruleSource = RULE_SOURCE.thirdPartyPlugin;
    }
    else {
        ruleSource = RULE_SOURCE.eslintCore;
    }
    const ruleNameWithPluginPrefix = ruleName.startsWith(`${pluginPrefix}/`)
        ? ruleName
        : ruleSource === RULE_SOURCE.self
            ? `${pluginPrefix}/${ruleName}`
            : undefined;
    const urlToRule = getUrlToRule(ruleName, ruleSource, pluginPrefix, pathPlugin, pathRuleDoc, pathCurrentPage, urlRuleDoc);
    const ruleNameToDisplay = `${includeBackticks ? '`' : ''}${includePrefix && ruleNameWithPluginPrefix
        ? ruleNameWithPluginPrefix
        : ruleNameWithoutPluginPrefix}${includeBackticks ? '`' : ''}`;
    return urlToRule ? `[${ruleNameToDisplay}](${urlToRule})` : ruleNameToDisplay;
}
