import { SEVERITY_TYPE } from './types.js';
import { EMOJIS_TYPE } from './rule-type.js';
// Configs.
const EMOJI_A11Y = '♿';
const EMOJI_ERROR = '❗';
const EMOJI_STYLE = '🎨';
const EMOJI_TYPESCRIPT = '⌨️';
const EMOJI_WARNING = '🚸';
/** Default emojis for common configs. */
export const EMOJI_CONFIGS = {
    a11y: EMOJI_A11Y,
    accessibility: EMOJI_A11Y,
    all: '🌐',
    error: EMOJI_ERROR,
    errors: EMOJI_ERROR,
    recommended: '✅',
    'recommended-type-aware': '☑️',
    'recommended-type-checked': '☑️',
    strict: '🔒',
    style: EMOJI_STYLE,
    stylistic: EMOJI_STYLE,
    ts: EMOJI_TYPESCRIPT,
    type: EMOJI_TYPESCRIPT,
    'type-aware': EMOJI_TYPESCRIPT,
    'type-checked': EMOJI_TYPESCRIPT,
    typed: EMOJI_TYPESCRIPT,
    types: EMOJI_TYPESCRIPT,
    typescript: EMOJI_TYPESCRIPT,
    warning: EMOJI_WARNING,
    warnings: EMOJI_WARNING,
};
// Severities.
export const EMOJI_CONFIG_ERROR = '💼';
export const EMOJI_CONFIG_WARN = '⚠️';
export const EMOJI_CONFIG_OFF = '🚫';
/** Emoji for each config severity. */
export const EMOJI_CONFIG_FROM_SEVERITY = {
    [SEVERITY_TYPE.error]: EMOJI_CONFIG_ERROR,
    [SEVERITY_TYPE.warn]: EMOJI_CONFIG_WARN,
    [SEVERITY_TYPE.off]: EMOJI_CONFIG_OFF,
};
/** Rule has an autofixer (from `meta.fixable`). */
export const EMOJI_FIXABLE = '🔧';
/** Rule provides suggestions (`meta.hasSuggestions`). */
export const EMOJI_HAS_SUGGESTIONS = '💡';
/** Rule options (from `meta.schema`). */
export const EMOJI_OPTIONS = '⚙️';
/**
 * Rule requires type-checking (from `meta.docs.requiresTypeChecking`).
 * Should match the emoji that @typescript-eslint/eslint-plugin uses for this (https://typescript-eslint.io/rules/).
 */
export const EMOJI_REQUIRES_TYPE_CHECKING = '💭';
/**
 * Rule type (from `meta.type`).
 * Also see EMOJIS_TYPE defined in rule-type.ts.
 */
export const EMOJI_TYPE = '🗂️';
/** Rule is deprecated (from `meta.deprecated`). */
export const EMOJI_DEPRECATED = '❌';
/**
 * The user is not allowed to specify a reserved emoji to represent their config because we use these emojis for other purposes.
 * Note that the default emojis for common configs are intentionally not reserved.
 */
export const RESERVED_EMOJIS = [
    ...Object.values(EMOJI_CONFIG_FROM_SEVERITY),
    ...Object.values(EMOJIS_TYPE),
    EMOJI_FIXABLE,
    EMOJI_HAS_SUGGESTIONS,
    EMOJI_OPTIONS,
    EMOJI_REQUIRES_TYPE_CHECKING,
    EMOJI_TYPE,
    EMOJI_DEPRECATED,
];
