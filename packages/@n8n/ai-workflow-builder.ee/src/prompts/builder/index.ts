/**
 * PromptBuilder - A type-safe, fluent builder for composing LLM prompts.
 *
 * @example
 * ```typescript
 * import { prompt } from '@/prompts/builder';
 *
 * const systemPrompt = prompt()
 *   .section('ROLE', 'You are an assistant')
 *   .sectionIf(hasContext, 'CONTEXT', () => buildContext())
 *   .examples('EXAMPLES', data, (ex) => `${ex.input} → ${ex.output}`)
 *   .build();
 * ```
 */

export { PromptBuilder, prompt } from './prompt-builder';

export type {
	ContentOrFactory,
	MessageBlock,
	PromptBuilderOptions,
	SectionFormat,
	SectionOptions,
} from './types';
