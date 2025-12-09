import type {
	ContentOrFactory,
	MessageBlock,
	PromptBuilderOptions,
	SectionEntry,
	SectionFormat,
	SectionOptions,
} from './types';

/**
 * Normalizes a section name to a valid XML tag or keeps it for markdown.
 * - Converts to lowercase
 * - Replaces spaces and special characters with underscores
 * - Removes consecutive underscores
 */
function normalizeToTag(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
}

/**
 * Formats a section based on the format type.
 */
function formatSection(
	name: string,
	content: string,
	format: SectionFormat,
	customTag?: string,
): string {
	if (format === 'markdown') {
		const header = customTag ?? name;
		return `## ${header}\n${content}`;
	}

	// XML format (default)
	const tag = customTag ?? normalizeToTag(name);
	return `<${tag}>\n${content}\n</${tag}>`;
}

/**
 * Resolves content from a string or factory function.
 * Returns null if the factory returns null/undefined/empty string.
 */
function resolveContent(content: ContentOrFactory): string | null {
	if (typeof content === 'function') {
		const result = content();
		if (result === null || result === undefined || result === '') {
			return null;
		}
		return result;
	}
	return content;
}

/**
 * A type-safe, fluent builder for composing LLM prompts.
 *
 * Features:
 * - Conditional sections with `sectionIf()`
 * - Lazy evaluation with factory functions
 * - Configurable format (XML tags or Markdown headers)
 * - Priority-based ordering
 * - LangChain message block support with cache_control
 * - Composable via `merge()`
 *
 * @example
 * ```typescript
 * const systemPrompt = prompt()
 *   .section('ROLE', 'You are an assistant')
 *   .sectionIf(hasContext, 'CONTEXT', () => buildContext())
 *   .examples('EXAMPLES', data, (ex) => `${ex.input} → ${ex.output}`)
 *   .build();
 * ```
 */
export class PromptBuilder {
	private readonly sections: SectionEntry[] = [];

	private readonly format: SectionFormat;

	private readonly separator: string;

	private orderCounter = 0;

	constructor(options: PromptBuilderOptions = {}) {
		this.format = options.format ?? 'xml';
		this.separator = options.separator ?? '\n\n';
	}

	/**
	 * Adds a section that is always included.
	 *
	 * @param name - Display name of the section (used for tag generation if no custom tag)
	 * @param content - String content or factory function for lazy evaluation
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	section(name: string, content: ContentOrFactory, options: SectionOptions = {}): this {
		this.sections.push({
			name,
			content,
			options,
			order: this.orderCounter++,
		});
		return this;
	}

	/**
	 * Adds a section conditionally based on a truthy/falsy condition.
	 * If condition is falsy, the section is skipped entirely and the factory (if provided)
	 * is never called.
	 *
	 * @param condition - Truthy value to include the section, falsy to skip
	 * @param name - Display name of the section
	 * @param content - String content or factory function
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	sectionIf(
		condition: unknown,
		name: string,
		content: ContentOrFactory,
		options: SectionOptions = {},
	): this {
		if (condition) {
			this.sections.push({
				name,
				content,
				options,
				order: this.orderCounter++,
			});
		}
		return this;
	}

	/**
	 * Adds a section containing formatted examples.
	 *
	 * @param name - Display name of the examples section
	 * @param examples - Array of example objects
	 * @param formatter - Function to format each example into a string
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	examples<T>(
		name: string,
		examples: T[],
		formatter: (example: T) => string,
		options: SectionOptions = {},
	): this {
		const content = examples.map(formatter).join('\n');
		return this.section(name, content, options);
	}

	/**
	 * Adds a section containing formatted examples conditionally.
	 *
	 * @param condition - Truthy value to include the examples, falsy to skip
	 * @param name - Display name of the examples section
	 * @param examples - Array of example objects
	 * @param formatter - Function to format each example into a string
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	examplesIf<T>(
		condition: unknown,
		name: string,
		examples: T[],
		formatter: (example: T) => string,
		options: SectionOptions = {},
	): this {
		if (condition) {
			return this.examples(name, examples, formatter, options);
		}
		return this;
	}

	/**
	 * Merges sections from another PromptBuilder into this one.
	 * Sections are appended in their relative order.
	 *
	 * @param other - Another PromptBuilder to merge from
	 * @returns this for chaining
	 */
	merge(other: PromptBuilder): this {
		for (const section of other.sections) {
			this.sections.push({
				...section,
				order: this.orderCounter++,
			});
		}
		return this;
	}

	/**
	 * Builds the final prompt string.
	 * Sections are sorted by priority (lower first), then by insertion order.
	 * Factory functions are evaluated, and sections returning null/undefined/empty are skipped.
	 *
	 * @returns The composed prompt string
	 */
	build(): string {
		const sorted = this.getSortedSections();

		const formatted: string[] = [];
		for (const section of sorted) {
			const content = resolveContent(section.content);
			if (content === null) {
				continue;
			}
			formatted.push(formatSection(section.name, content, this.format, section.options.tag));
		}

		return formatted.join(this.separator);
	}

	/**
	 * Builds the prompt as an array of LangChain message blocks.
	 * Each section becomes a separate block, allowing individual cache_control settings.
	 *
	 * @returns Array of message blocks for use with ChatPromptTemplate
	 */
	buildAsMessageBlocks(): MessageBlock[] {
		const sorted = this.getSortedSections();

		const blocks: MessageBlock[] = [];
		for (const section of sorted) {
			const content = resolveContent(section.content);
			if (content === null) {
				continue;
			}

			const text = formatSection(section.name, content, this.format, section.options.tag);
			const block: MessageBlock = { type: 'text', text };

			if (section.options.cache) {
				block.cache_control = { type: 'ephemeral' };
			}

			blocks.push(block);
		}

		return blocks;
	}

	/**
	 * Estimates the token count for the built prompt.
	 * Uses a rough approximation of ~4 characters per token.
	 *
	 * @returns Estimated token count
	 */
	estimateTokens(): number {
		const text = this.build();
		if (text === '') {
			return 0;
		}
		return Math.ceil(text.length / 4);
	}

	/**
	 * Gets sections sorted by priority (lower first), then by insertion order.
	 */
	private getSortedSections(): SectionEntry[] {
		return [...this.sections].sort((a, b) => {
			const priorityA = a.options.priority ?? 0;
			const priorityB = b.options.priority ?? 0;

			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}

			return a.order - b.order;
		});
	}
}

/**
 * Factory function for creating a new PromptBuilder.
 * Provides a cleaner API than `new PromptBuilder()`.
 *
 * @param options - Optional builder configuration
 * @returns A new PromptBuilder instance
 *
 * @example
 * ```typescript
 * const result = prompt()
 *   .section('ROLE', 'You are an assistant')
 *   .build();
 *
 * const markdownResult = prompt({ format: 'markdown' })
 *   .section('ROLE', 'You are an assistant')
 *   .build();
 * ```
 */
export function prompt(options?: PromptBuilderOptions): PromptBuilder {
	return new PromptBuilder(options);
}
