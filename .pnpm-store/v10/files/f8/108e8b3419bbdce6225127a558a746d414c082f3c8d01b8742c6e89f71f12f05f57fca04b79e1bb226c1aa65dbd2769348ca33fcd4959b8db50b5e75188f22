import { Context } from './context.js';
import type { SEVERITY_TYPE } from './types.js';
export declare function getConfigsThatSetARule(context: Context, severityType?: SEVERITY_TYPE): string[];
/**
 * Get config names that a given rule belongs to.
 * @param severityType - Include configs that set the rule to this severity. Omit to allow any severity.
 */
export declare function getConfigsForRule(context: Context, ruleName: string, severityType?: SEVERITY_TYPE): string[];
/**
 * Find the representation of a config to display.
 * @param configEmojis - known list of configs and corresponding emojis
 * @param configName - name of the config to find an emoji for
 * @param options
 * @param options.fallback - if true and no emoji is found, choose whether to fallback to a badge.
 * @returns the string to display for the config
 */
export declare function findConfigEmoji(context: Context, configName: string, fallback?: 'badge'): string | undefined;
/**
 * Get the emojis for the configs that set a rule to a certain severity.
 */
export declare function getEmojisForConfigsSettingRuleToSeverity(context: Context, ruleName: string, severityType: SEVERITY_TYPE): string[];
