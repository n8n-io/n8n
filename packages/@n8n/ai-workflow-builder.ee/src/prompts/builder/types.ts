/**
 * Format type for section output
 * - 'xml': Wraps content in XML-style tags <section_name>content</section_name>
 * - 'markdown': Uses markdown headers ## SECTION NAME
 */
export type SectionFormat = 'xml' | 'markdown';

/**
 * Content can be a string or a factory function for lazy evaluation.
 * Factory functions are only called during build() and can return null/undefined
 * to skip the section.
 */
export type ContentOrFactory = string | (() => string | null | undefined);

/**
 * Options for individual sections
 */
export interface SectionOptions {
	/**
	 * Custom tag/header name. Defaults to normalized section name.
	 * For XML: becomes the tag name
	 * For Markdown: becomes the header text
	 */
	tag?: string;

	/**
	 * Whether to add LangChain cache_control to this section.
	 * Only affects buildAsMessageBlocks() output.
	 * Default: false
	 */
	cache?: boolean;
}

/**
 * Options for the PromptBuilder constructor
 */
export interface PromptBuilderOptions {
	/**
	 * Output format for sections.
	 * Default: 'xml'
	 */
	format?: SectionFormat;

	/**
	 * Separator between sections.
	 * Default: '\n\n'
	 */
	separator?: string;
}

/**
 * Internal representation of a section
 */
export interface SectionEntry {
	/** Display name of the section */
	name: string;

	/** Content or factory function */
	content: ContentOrFactory;

	/** Section options */
	options: SectionOptions;
}

/**
 * LangChain message block format
 */
export interface MessageBlock {
	type: 'text';
	text: string;
	cache_control?: { type: 'ephemeral' };
}
