export const CODE_BLOCK_LANGUAGES = ['json', 'typescript'] as const;

export type CodeBlockLanguage = (typeof CODE_BLOCK_LANGUAGES)[number] | 'auto';

export interface CodeBlockProps {
	/** Raw code string. */
	code: string;
	/** Language used for syntax highlighting. */
	language?: CodeBlockLanguage;
	/** Whether to show the copy action. */
	copyable?: boolean;
	/** Control collapsed state outside component */
	collapsed?: boolean;
	/** Maximum collapsed height in pixels. */
	maxHeight?: number;
	/** Accessible label for the code region. */
	ariaLabel?: string;
}

export interface CodeBlockEmits {
	'update:collapsed': [collapsed: boolean];
	copy: [code: string];
}
