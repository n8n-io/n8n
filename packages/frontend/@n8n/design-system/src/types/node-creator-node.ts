import type { N8nTagType } from '../components/N8nTag/Tag.type';

export type NodeCreatorTag = {
	text: string;
	/** Color of the tag. A pill maps `info` and `danger` to the badge. Other colors use the success badge. */
	type?: N8nTagType;
	/** When true, renders as N8nBadge instead of N8nTag. */
	pill?: boolean;
	/** When true, renders as PreviewBadge instead of N8nTag. `text` overrides the default "Preview" label. */
	preview?: boolean;
};
