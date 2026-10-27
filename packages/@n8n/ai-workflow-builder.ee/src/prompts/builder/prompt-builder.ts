import type {
	ContentOrFactory,
	MessageBlock,
	PromptBuilderOptions,
	SectionEntry,
	SectionFormat,
	SectionOptions,
} from './types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard for objects with a content property
 */
function hasContentProperty(value: unknown): value is { content: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'content' in value &&
		typeof value.content === 'string'
	);
}

/**
 * Default formatter for examples.
 * Handles strings and objects with a `content` property.
 */
function defaultExampleFormatter<T>(example: T): string {
	if (typeof example === 'string') return example;
	if (hasContentProperty(example)) return example.content;
	throw new Error(
		'Example must be a string or have a content property. Provide a custom formatter.',
	);
}

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
	if (format === 'plain') {
		return content;
	}

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
			});
		}
		return this;
	}

	/**
	 * Adds a section containing formatted examples.
	 *
	 * @param name - Display name of the examples section
	 * @param examples - Array of example objects
	 * @param formatter - Optional function to format each example. Defaults to handling
	 *                    strings and objects with a `content` property.
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	examples<T>(
		name: string,
		examples: T[],
		formatter?: (example: T) => string,
		options: SectionOptions = {},
	): this {
		const format = formatter ?? defaultExampleFormatter;
		const content = examples.map(format).join('\n\n');
		return this.section(name, content, options);
	}

	/**
	 * Adds a section containing formatted examples conditionally.
	 *
	 * @param condition - Truthy value to include the examples, falsy to skip
	 * @param name - Display name of the examples section
	 * @param examples - Array of example objects
	 * @param formatter - Optional function to format each example. Defaults to handling
	 *                    strings and objects with a `content` property.
	 * @param options - Optional section configuration
	 * @returns this for chaining
	 */
	examplesIf<T>(
		condition: unknown,
		name: string,
		examples: T[],
		formatter?: (example: T) => string,
		options: SectionOptions = {},
	): this {
		if (condition) {
			return this.examples(name, examples, formatter, options);
		}
		return this;
	}

	/**
	 * Appends examples to the last added section.
	 * This is a section modifier that must be called after section() or sectionIf().
	 *
	 * @param examples - Array of example objects
	 * @param formatter - Optional function to format each example. Defaults to handling
	 *                    strings and objects with a `content` property.
	 * @returns this for chaining
	 *
	 * @example
	 * ```typescript
	 * prompt()
	 *   .section('routing', ROUTING_RULES)
	 *   .withExamples(['example 1', 'example 2'])
	 *   .section('output', OUTPUT_FORMAT)
	 *   .build();
	 * ```
	 */
	withExamples<T>(examples: T[], formatter?: (example: T) => string): this {
		const lastSection = this.sections.at(-1);
		if (!lastSection) {
			throw new Error('withExamples() must be called after section()');
		}

		if (examples.length === 0) {
			return this;
		}

		const format = formatter ?? defaultExampleFormatter;
		const examplesContent = examples.map(format).join('\n\n');

		// Format examples block using the section's format (or builder default)
		const sectionFormat = lastSection.options.format ?? this.format;
		const examplesBlock =
			sectionFormat === 'plain'
				? examplesContent
				: sectionFormat === 'markdown'
					? `## Examples\n${examplesContent}`
					: `<examples>\n${examplesContent}\n</examples>`;

		// Wrap original content to append examples
		const originalContent = lastSection.content;
		lastSection.content = () => {
			const resolved = resolveContent(originalContent);
			if (resolved === null) return null;
			return `${resolved}\n\n${examplesBlock}`;
		};

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
			this.sections.push({ ...section });
		}
		return this;
	}

	/**
	 * Builds the final prompt string.
	 * Sections are output in insertion order.
	 * Factory functions are evaluated, and sections returning null/undefined/empty are skipped.
	 *
	 * @returns The composed prompt string
	 */
	build(): string {
		const formatted: string[] = [];
		for (const section of this.sections) {
			const content = resolveContent(section.content);
			if (content === null) {
				continue;
			}
			const sectionFormat = section.options.format ?? this.format;
			formatted.push(formatSection(section.name, content, sectionFormat, section.options.tag));
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
		const blocks: MessageBlock[] = [];
		for (const section of this.sections) {
			const content = resolveContent(section.content);
			if (content === null) {
				continue;
			}

			const sectionFormat = section.options.format ?? this.format;
			const text = formatSection(section.name, content, sectionFormat, section.options.tag);
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
