import type { Linter } from '@typescript-eslint/utils/ts-eslint';
type LintMessage = Linter.LintMessage | Linter.LintSuggestion;
export interface AppliedFixes {
    fixed: boolean;
    messages: readonly LintMessage[];
    output: string;
}
/**
 * Applies the fixes specified by the messages to the given text. Tries to be
 * smart about the fixes and won't apply fixes over the same area in the text.
 * @param sourceText The text to apply the changes to.
 * @param  messages The array of messages reported by ESLint.
 * @returns An object containing the fixed text and any unfixed messages.
 */
export declare function applyFixes(sourceText: string, messages: readonly LintMessage[]): AppliedFixes;
export {};
