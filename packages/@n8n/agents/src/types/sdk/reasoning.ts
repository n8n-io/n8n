import type { LanguageModelCallOptions } from 'ai';

/** Provider-agnostic reasoning level understood by AI SDK 7. */
export type ReasoningLevel = NonNullable<LanguageModelCallOptions['reasoning']>;
