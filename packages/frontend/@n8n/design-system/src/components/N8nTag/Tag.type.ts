export const N8N_TAG_TYPE = ['success', 'info', 'warning', 'danger'] as const;

/** Callout color. Omit this value for the neutral tag. */
export type N8nTagType = (typeof N8N_TAG_TYPE)[number];

export const N8N_TAG_SIZE = ['sm', 'md', 'lg'] as const;

/** Height of the tag. `sm` is the compact size. */
export type N8nTagSize = (typeof N8N_TAG_SIZE)[number];

export interface TagProps {
	/** Text shown when the tag has no slot. */
	text?: string;
	/** `true` shows the pointer cursor and the hover color. */
	clickable?: boolean;
	/** Height of the tag. */
	size?: N8nTagSize;
	/** Color of the tag. Omit this prop for the neutral tag. */
	type?: N8nTagType;
	/** `true` uses a pill radius. */
	round?: boolean;
}
