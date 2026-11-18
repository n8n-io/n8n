export const AVATAR_SIZES = {
	xxsmall: 16,
	xsmall: 20,
	small: 28,
	medium: 40,
	large: 48,
	/** Preview size, e.g. while a user edits their picture. */
	xlarge: 96,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;
