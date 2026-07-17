/**
 * Type-safe fluent builder for composing LLM prompts from named sections.
 */

export { PromptBuilder, prompt } from './prompt-builder';

export type {
	ContentOrFactory,
	MessageBlock,
	PromptBuilderOptions,
	SectionEntry,
	SectionFormat,
	SectionOptions,
} from './types';
