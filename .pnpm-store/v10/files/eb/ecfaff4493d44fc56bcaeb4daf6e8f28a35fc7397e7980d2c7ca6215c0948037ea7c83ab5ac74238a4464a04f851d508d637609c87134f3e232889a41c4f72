import { COLUMN_TYPE, GenerateOptions, NOTICE_TYPE, Plugin } from './types.js';
export declare const COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING: {
    [key in COLUMN_TYPE]: boolean;
};
export declare const NOTICE_TYPE_DEFAULT_PRESENCE_AND_ORDERING: {
    [key in NOTICE_TYPE]: boolean;
};
export declare const OPTION_DEFAULTS: {
    check: boolean;
    configEmoji: never[];
    configFormat: "name";
    ignoreConfig: never[];
    ignoreDeprecatedRules: boolean;
    initRuleDocs: boolean;
    pathRuleDoc: string;
    pathRuleList: string[];
    postprocess: (content: string) => string;
    ruleDocNotices: string[];
    ruleDocSectionExclude: never[];
    ruleDocSectionInclude: never[];
    ruleDocSectionOptions: boolean;
    ruleDocTitleFormat: "desc-parens-prefix-name";
    ruleListColumns: string[];
    ruleListSplit: never[];
    urlConfigs: undefined;
    urlRuleDoc: undefined;
};
/**
 * Combines user-provided options with default options. Additionally, this performs some basic
 * normalization, like converting "foo" to "[foo]" for options that are lists.
 */
export declare function getResolvedOptions(plugin: Plugin, userOptions?: GenerateOptions): {
    check: boolean;
    configEmojis: import("./types.js").ConfigEmojis;
    configFormat: "name" | "prefix-name" | "plugin-colon-prefix-name";
    ignoreConfig: readonly string[];
    ignoreDeprecatedRules: boolean;
    initRuleDocs: boolean;
    pathRuleDoc: string | import("./types.js").PathRuleDocFunction;
    pathRuleList: readonly string[];
    postprocess: (content: string, pathToFile: string) => string | Promise<string>;
    ruleDocNotices: readonly NOTICE_TYPE[];
    ruleDocSectionExclude: readonly string[];
    ruleDocSectionInclude: readonly string[];
    ruleDocSectionOptions: boolean;
    ruleDocTitleFormat: "name" | "desc" | "desc-parens-name" | "desc-parens-prefix-name" | "prefix-name";
    ruleListColumns: readonly COLUMN_TYPE[];
    ruleListSplit: readonly string[] | import("./types.js").RuleListSplitFunction;
    urlConfigs: string | undefined;
    urlRuleDoc: string | import("./types.js").UrlRuleDocFunction | undefined;
};
/** Dynamically calculated from the "getResolvedOptions" function. */
export type ResolvedGenerateOptions = ReturnType<typeof getResolvedOptions>;
