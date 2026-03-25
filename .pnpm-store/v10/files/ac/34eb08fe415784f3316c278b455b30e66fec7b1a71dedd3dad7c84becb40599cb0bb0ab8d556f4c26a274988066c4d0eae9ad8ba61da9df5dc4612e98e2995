import { END_RULE_HEADER_MARKER } from './comment-markers.js';
import { EMOJI_DEPRECATED, EMOJI_FIXABLE, EMOJI_HAS_SUGGESTIONS, EMOJI_REQUIRES_TYPE_CHECKING, EMOJI_CONFIG_FROM_SEVERITY, EMOJI_OPTIONS, } from './emojis.js';
import { findConfigEmoji, getConfigsForRule } from './plugin-configs.js';
import { SEVERITY_TYPE, NOTICE_TYPE, } from './types.js';
import { RULE_TYPE_MESSAGES_NOTICES } from './rule-type.js';
import { hasOptions } from './rule-options.js';
import { getLinkToRule, replaceRulePlaceholder } from './rule-link.js';
import { toSentenceCase, removeTrailingPeriod, addTrailingPeriod, getEndOfLine, } from './string.js';
import { configNameToDisplay } from './config-format.js';
const EOL = getEndOfLine();
function severityToTerminology(severity) {
    switch (severity) {
        case SEVERITY_TYPE.error: {
            return 'is enabled';
        }
        case SEVERITY_TYPE.warn: {
            return '_warns_';
        }
        case SEVERITY_TYPE.off: {
            return 'is _disabled_';
        }
        /* istanbul ignore next -- this shouldn't happen */
        default: {
            throw new Error(`Unknown severity: ${String(severity)}`);
        }
    }
}
function configsToNoticeSentence(configs, severity, configsLinkOrWord, configLinkOrWord, configEmojis, configFormat, pluginPrefix) {
    // Create CSV list of configs with their emojis.
    const csv = configs
        .map((config) => {
        const emoji = findConfigEmoji(configEmojis, config);
        return `${emoji ? `${emoji} ` : ''}\`${configNameToDisplay(config, configFormat, pluginPrefix)}\``;
    })
        .join(', ');
    const term = severityToTerminology(severity);
    const sentence = configs.length > 1
        ? `This rule ${term} in the following ${configsLinkOrWord}: ${csv}.`
        : configs.length === 1
            ? `This rule ${term} in the ${csv} ${configLinkOrWord}.`
            : undefined;
    return sentence;
}
// A few individual notices declared here just so they can be reused in multiple notices.
const NOTICE_FIXABLE = `${EMOJI_FIXABLE} This rule is automatically fixable by the [\`--fix\` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).`;
const NOTICE_HAS_SUGGESTIONS = `${EMOJI_HAS_SUGGESTIONS} This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).`;
/**
 * An object containing the text for each notice type (as a string or function to generate the string).
 */
const RULE_NOTICES = {
    // Configs notice varies based on whether the rule is configured in one or more configs.
    [NOTICE_TYPE.CONFIGS]: ({ configsError, configsWarn, configsOff, configEmojis, configFormat, pluginPrefix, urlConfigs, }) => {
        // Add link to configs documentation if provided.
        const configsLinkOrWord = urlConfigs
            ? `[configs](${urlConfigs})`
            : 'configs';
        const configLinkOrWord = urlConfigs ? `[config](${urlConfigs})` : 'config';
        /* istanbul ignore next -- this shouldn't happen */
        if (configsError.length === 0 &&
            configsWarn.length === 0 &&
            configsOff.length === 0) {
            throw new Error('Should not be trying to display config notice for rule not configured in any configs.');
        }
        // Use the emoji(s) for the severity levels this rule is set to in various configs.
        const emojis = [];
        if (configsError.length > 0) {
            emojis.push(EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.error]);
        }
        if (configsWarn.length > 0) {
            emojis.push(EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.warn]);
        }
        if (configsOff.length > 0) {
            emojis.push(EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.off]);
        }
        const sentences = [
            configsToNoticeSentence(configsError, SEVERITY_TYPE.error, configsLinkOrWord, configLinkOrWord, configEmojis, configFormat, pluginPrefix),
            configsToNoticeSentence(configsWarn, SEVERITY_TYPE.warn, configsLinkOrWord, configLinkOrWord, configEmojis, configFormat, pluginPrefix),
            configsToNoticeSentence(configsOff, SEVERITY_TYPE.off, configsLinkOrWord, configLinkOrWord, configEmojis, configFormat, pluginPrefix),
        ]
            .filter(Boolean)
            .join(' ');
        return `${emojis.join('')} ${sentences}`;
    },
    // Deprecated notice has optional "replaced by" rules list.
    [NOTICE_TYPE.DEPRECATED]: ({ replacedBy, plugin, pluginPrefix, pathPlugin, pathRuleDoc, ruleName, urlRuleDoc, }) => {
        const replacementRuleList = (replacedBy ?? []).map((replacementRuleName) => getLinkToRule(replacementRuleName, plugin, pluginPrefix, pathPlugin, pathRuleDoc, replaceRulePlaceholder(pathRuleDoc, ruleName), true, true, urlRuleDoc));
        return `${EMOJI_DEPRECATED} This rule is deprecated.${replacedBy && replacedBy.length > 0
            ? ` It was replaced by ${replacementRuleList.join(', ')}.`
            : ''}`;
    },
    [NOTICE_TYPE.DESCRIPTION]: ({ description }) => {
        /* istanbul ignore next -- this shouldn't happen */
        if (!description) {
            throw new Error('Should not be trying to display description notice for rule with no description.');
        }
        // Return the description like a normal body sentence.
        return addTrailingPeriod(toSentenceCase(description));
    },
    [NOTICE_TYPE.TYPE]: ({ type }) => {
        /* istanbul ignore next -- this shouldn't happen */
        if (!type) {
            throw new Error('Should not be trying to display type notice for rule with no type.');
        }
        return RULE_TYPE_MESSAGES_NOTICES[type];
    },
    // Fixable/suggestions.
    [NOTICE_TYPE.FIXABLE]: NOTICE_FIXABLE,
    [NOTICE_TYPE.FIXABLE_AND_HAS_SUGGESTIONS]: ({ fixable, hasSuggestions }) => {
        if (fixable && hasSuggestions) {
            return `${EMOJI_FIXABLE}${EMOJI_HAS_SUGGESTIONS} This rule is automatically fixable by the [\`--fix\` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).`;
        }
        else if (fixable) {
            return NOTICE_FIXABLE;
        }
        else if (hasSuggestions) {
            return NOTICE_HAS_SUGGESTIONS;
        }
        /* istanbul ignore next -- this shouldn't happen */
        throw new Error('Should not be trying to display fixable and has suggestions column when neither apply.');
    },
    [NOTICE_TYPE.HAS_SUGGESTIONS]: NOTICE_HAS_SUGGESTIONS,
    [NOTICE_TYPE.OPTIONS]: `${EMOJI_OPTIONS} This rule is configurable.`,
    [NOTICE_TYPE.REQUIRES_TYPE_CHECKING]: `${EMOJI_REQUIRES_TYPE_CHECKING} This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).`,
};
/**
 * Determine which notices should and should not be included at the top of a rule doc.
 */
function getNoticesForRule(rule, configsError, configsWarn, configsOff, ruleDocNotices) {
    const notices = {
        // Alphabetical order.
        [NOTICE_TYPE.CONFIGS]: configsError.length > 0 ||
            configsWarn.length > 0 ||
            configsOff.length > 0,
        [NOTICE_TYPE.DEPRECATED]: rule.meta?.deprecated || false,
        [NOTICE_TYPE.DESCRIPTION]: Boolean(rule.meta?.docs?.description) || false,
        // Fixable/suggestions.
        [NOTICE_TYPE.FIXABLE]: Boolean(rule.meta?.fixable),
        [NOTICE_TYPE.FIXABLE_AND_HAS_SUGGESTIONS]: Boolean(rule.meta?.fixable) || Boolean(rule.meta?.hasSuggestions),
        [NOTICE_TYPE.HAS_SUGGESTIONS]: Boolean(rule.meta?.hasSuggestions),
        [NOTICE_TYPE.OPTIONS]: hasOptions(rule.meta?.schema),
        [NOTICE_TYPE.REQUIRES_TYPE_CHECKING]: 
        // @ts-expect-error -- TODO: requiresTypeChecking type not present
        rule.meta?.docs?.requiresTypeChecking || false,
        [NOTICE_TYPE.TYPE]: Boolean(rule.meta?.type),
    };
    // Recreate object using the ordering and presence of columns specified in ruleDocNotices.
    return Object.fromEntries(ruleDocNotices.map((type) => [type, notices[type]]));
}
/**
 * Get the lines for the notice section at the top of a rule doc.
 */
function getRuleNoticeLines(ruleName, plugin, configsToRules, pluginPrefix, pathPlugin, pathRuleDoc, configEmojis, configFormat, ignoreConfig, ruleDocNotices, urlConfigs, urlRuleDoc) {
    const lines = [];
    const rule = plugin.rules?.[ruleName];
    /* istanbul ignore next */
    if (!rule) {
        // This is only to please TypeScript. We should always have a rule when this function is called.
        throw new Error('Rule not found');
    }
    if (typeof rule !== 'object') {
        // We don't support the deprecated, function-style rule format as there's not much information we can extract from it.
        // https://eslint.org/docs/latest/developer-guide/working-with-rules-deprecated
        return [];
    }
    const configsError = getConfigsForRule(ruleName, configsToRules, pluginPrefix, SEVERITY_TYPE.error).filter((configName) => !ignoreConfig.includes(configName));
    const configsWarn = getConfigsForRule(ruleName, configsToRules, pluginPrefix, SEVERITY_TYPE.warn).filter((configName) => !ignoreConfig.includes(configName));
    const configsOff = getConfigsForRule(ruleName, configsToRules, pluginPrefix, SEVERITY_TYPE.off).filter((configName) => !ignoreConfig.includes(configName));
    const notices = getNoticesForRule(rule, configsError, configsWarn, configsOff, ruleDocNotices);
    let noticeType;
    for (noticeType in notices) {
        const expected = notices[noticeType];
        if (!expected) {
            // This notice should not be included.
            continue;
        }
        lines.push(''); // Blank line first.
        const ruleNoticeStrOrFn = RULE_NOTICES[noticeType];
        /* istanbul ignore next -- this won't happen since we would have already bailed out earlier. */
        if (!ruleNoticeStrOrFn) {
            // No notice for this column.
            continue;
        }
        lines.push(typeof ruleNoticeStrOrFn === 'function'
            ? ruleNoticeStrOrFn({
                ruleName,
                configsError,
                configsWarn,
                configsOff,
                configEmojis,
                configFormat,
                description: rule.meta?.docs?.description,
                fixable: Boolean(rule.meta?.fixable),
                hasSuggestions: Boolean(rule.meta?.hasSuggestions),
                urlConfigs,
                replacedBy: rule.meta?.replacedBy,
                plugin,
                pluginPrefix,
                pathPlugin,
                pathRuleDoc,
                type: rule.meta?.type,
                urlRuleDoc,
            })
            : ruleNoticeStrOrFn);
    }
    return lines;
}
function makeRuleDocTitle(name, description, pluginPrefix, ruleDocTitleFormat) {
    const descriptionFormatted = description
        ? removeTrailingPeriod(toSentenceCase(description))
        : undefined;
    let ruleDocTitleFormatWithFallback = ruleDocTitleFormat;
    if (ruleDocTitleFormatWithFallback.includes('desc') && !description) {
        // If format includes the description but the rule is missing a description,
        // fallback to the corresponding format without the description.
        switch (ruleDocTitleFormatWithFallback) {
            case 'desc':
            case 'desc-parens-prefix-name': {
                ruleDocTitleFormatWithFallback = 'prefix-name';
                break;
            }
            case 'desc-parens-name': {
                ruleDocTitleFormatWithFallback = 'name';
                break;
            }
            /* istanbul ignore next -- this shouldn't happen */
            default: {
                throw new Error(`Unhandled rule doc title format fallback: ${String(ruleDocTitleFormatWithFallback)}`);
            }
        }
    }
    switch (ruleDocTitleFormatWithFallback) {
        // Backticks (code-style) only used around rule name to differentiate it when the rule description is also present.
        case 'desc': {
            /* istanbul ignore next -- this shouldn't happen */
            if (!descriptionFormatted) {
                throw new Error('Attempting to display non-existent description in rule doc title.');
            }
            return `# ${descriptionFormatted}`;
        }
        case 'desc-parens-name': {
            /* istanbul ignore next -- this shouldn't happen */
            if (!descriptionFormatted) {
                throw new Error('Attempting to display non-existent description in rule doc title.');
            }
            return `# ${descriptionFormatted} (\`${name}\`)`;
        }
        case 'desc-parens-prefix-name': {
            /* istanbul ignore next -- this shouldn't happen */
            if (!descriptionFormatted) {
                throw new Error('Attempting to display non-existent description in rule doc title.');
            }
            return `# ${descriptionFormatted} (\`${pluginPrefix}/${name}\`)`;
        }
        case 'name': {
            return `# ${name}`;
        }
        case 'prefix-name': {
            return `# ${pluginPrefix}/${name}`;
        }
        /* istanbul ignore next -- this shouldn't happen */
        default: {
            throw new Error(`Unhandled rule doc title format: ${String(ruleDocTitleFormatWithFallback)}`);
        }
    }
}
/**
 * Generate a rule doc header for a particular rule.
 * @returns {string} - new header including marker
 */
export function generateRuleHeaderLines(description, name, plugin, configsToRules, pluginPrefix, pathPlugin, pathRuleDoc, configEmojis, configFormat, ignoreConfig, ruleDocNotices, ruleDocTitleFormat, urlConfigs, urlRuleDoc) {
    return [
        makeRuleDocTitle(name, description, pluginPrefix, ruleDocTitleFormat),
        ...getRuleNoticeLines(name, plugin, configsToRules, pluginPrefix, pathPlugin, pathRuleDoc, configEmojis, configFormat, ignoreConfig, ruleDocNotices, urlConfigs, urlRuleDoc),
        '',
        END_RULE_HEADER_MARKER,
    ].join(EOL);
}
