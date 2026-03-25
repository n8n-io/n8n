import { PathRuleDocFunction, Plugin, RULE_SOURCE, UrlRuleDocFunction } from './types.js';
export declare function replaceRulePlaceholder(pathOrUrl: string | PathRuleDocFunction, ruleName: string): string;
/**
 * Get the link to a rule's documentation page.
 * Will be relative to the current page.
 */
export declare function getUrlToRule(ruleName: string, ruleSource: RULE_SOURCE, pluginPrefix: string, pathPlugin: string, pathRuleDoc: string | PathRuleDocFunction, pathCurrentPage: string, urlRuleDoc?: string | UrlRuleDocFunction): string | undefined;
/**
 * Get the markdown link (title and URL) to the rule's documentation.
 */
export declare function getLinkToRule(ruleName: string, plugin: Plugin, pluginPrefix: string, pathPlugin: string, pathRuleDoc: string | PathRuleDocFunction, pathCurrentPage: string, includeBackticks: boolean, includePrefix: boolean, urlRuleDoc?: string | UrlRuleDocFunction): string;
