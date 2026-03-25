import type { LocaleEntry } from './definitions';
/**
 * The possible definitions related to dates.
 */
export type DateDefinition = LocaleEntry<{
    /**
     * The translations for months (January - December).
     */
    month: DateEntryDefinition;
    /**
     * The translations for weekdays (Sunday - Saturday).
     */
    weekday: DateEntryDefinition;
}>;
/**
 * The possible definitions related to date entries.
 */
export interface DateEntryDefinition {
    /**
     * The long name of the entry.
     */
    wide: string[];
    /**
     * The short name/abbreviation of the entry.
     * If null, the locale does not support a short name/abbreviation for the entry.
     */
    abbr: string[] | null;
    /**
     * The wide name of the entry when used in context. If absent wide will be used instead.
     * It is used to specify a word in context, which may differ from a stand-alone word.
     */
    wide_context?: string[];
    /**
     * The short name/abbreviation name of the entry when used in context. If absent abbr will be used instead.
     * It is used to specify a word in context, which may differ from a stand-alone word.
     */
    abbr_context?: string[];
}
