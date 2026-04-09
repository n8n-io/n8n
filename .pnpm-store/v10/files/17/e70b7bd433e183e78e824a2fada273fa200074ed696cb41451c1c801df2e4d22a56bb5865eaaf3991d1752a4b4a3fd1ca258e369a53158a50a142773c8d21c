import type { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import type { ReportDescriptorMessageData } from '@typescript-eslint/utils/ts-eslint';
import type { DependencyConstraint } from './DependencyConstraint';
import type { ValidTestCase } from './ValidTestCase';
export interface SuggestionOutput<MessageIds extends string> {
    /**
     * The data used to fill the message template.
     */
    readonly data?: ReportDescriptorMessageData;
    /**
     * Reported message ID.
     */
    readonly messageId: MessageIds;
    /**
     * NOTE: Suggestions will be applied as a stand-alone change, without triggering multi-pass fixes.
     * Each individual error has its own suggestion, so you have to show the correct, _isolated_ output for each suggestion.
     */
    readonly output: string;
}
export interface TestCaseError<MessageIds extends string> {
    /**
     * The 1-based column number of the reported start location.
     */
    readonly column?: number;
    /**
     * The data used to fill the message template.
     */
    readonly data?: ReportDescriptorMessageData;
    /**
     * The 1-based column number of the reported end location.
     */
    readonly endColumn?: number;
    /**
     * The 1-based line number of the reported end location.
     */
    readonly endLine?: number;
    /**
     * The 1-based line number of the reported start location.
     */
    readonly line?: number;
    /**
     * Reported message ID.
     */
    readonly messageId: MessageIds;
    /**
     * Reported suggestions.
     */
    readonly suggestions?: readonly SuggestionOutput<MessageIds>[] | null;
    /**
     * @deprecated `type` is deprecated and will be removed in the next major version.
     */
    readonly type?: AST_NODE_TYPES | AST_TOKEN_TYPES;
}
export interface InvalidTestCase<MessageIds extends string, Options extends readonly unknown[]> extends ValidTestCase<Options> {
    /**
     * Constraints that must pass in the current environment for the test to run
     */
    readonly dependencyConstraints?: DependencyConstraint;
    /**
     * Expected errors.
     */
    readonly errors: readonly TestCaseError<MessageIds>[];
    /**
     * The expected code after autofixes are applied. If set to `null`, the test runner will assert that no autofix is suggested.
     */
    readonly output?: string | string[] | null;
}
