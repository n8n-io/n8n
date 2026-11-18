import type { UserAvatarBackground, UserAvatarDescriptor, UserAvatarVariant } from '../types/user';

/**
 * The on-brand backdrops: the brand pink, its light tint and three greys from
 * the design-system primitives, so a transparent picture sits on something
 * deliberate rather than on whatever is behind the avatar. These are only ever
 * applied as CSS, so referencing the tokens keeps them in step with the brand.
 */
export const AVATAR_BACKGROUND_COLORS: Record<UserAvatarBackground, string> = {
	pink: 'var(--color--pink-500)',
	'pink-light': 'var(--color--pink-200)',
	'gray-light': 'var(--color--neutral-200)',
	gray: 'var(--color--neutral-400)',
	'gray-dark': 'var(--color--neutral-700)',
};

export const AVATAR_BACKGROUNDS = Object.keys(AVATAR_BACKGROUND_COLORS) as UserAvatarBackground[];

export const AVATAR_VARIANTS: UserAvatarVariant[] = [
	'marble',
	'beam',
	'bauhaus',
	'ring',
	'sunset',
	'pixel',
];

export interface AvatarAppearance {
	src?: string;
	backgroundColor?: string;
	variant?: UserAvatarVariant;
	seed?: string;
	colors?: string[];
}

/**
 * Turns the API's description of a user's picture into `N8nAvatar` props. A
 * missing descriptor yields nothing, so the avatar draws its name-based default.
 */
export function getAvatarAppearance(
	avatar: UserAvatarDescriptor | null | undefined,
): AvatarAppearance {
	if (!avatar) return {};

	const backgroundColor = AVATAR_BACKGROUND_COLORS[avatar.background];

	if (avatar.source === 'upload' && avatar.upload) {
		return { src: avatar.upload.url, backgroundColor };
	}
	if (avatar.source === 'sso' && avatar.sso) {
		return { src: avatar.sso.url, backgroundColor };
	}
	if (avatar.source === 'generated' && avatar.generated) {
		const { variant, seed, colors } = avatar.generated;
		return { variant, seed, colors };
	}
	return {};
}
