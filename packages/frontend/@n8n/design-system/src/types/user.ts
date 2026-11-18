/** Plain backdrops shown behind a picture with transparent pixels. Mirrors `@n8n/api-types`. */
export type UserAvatarBackground = 'pink' | 'pink-light' | 'gray-light' | 'gray' | 'gray-dark';

/** Shapes a generated avatar can take; the variants of `vue-boring-avatars`. */
export type UserAvatarVariant = 'marble' | 'beam' | 'bauhaus' | 'ring' | 'sunset' | 'pixel';

/** Where the user left the color picker, so the editor can restore it. */
export interface GeneratedUserAvatarRecipe {
	/** Degrees on the color wheel. */
	hue: number;
	/** 0 is deep and dark, 100 is light and pale. */
	tone: number;
}

export interface GeneratedUserAvatar {
	variant: UserAvatarVariant;
	seed: string;
	/** Five hex colors. */
	colors: string[];
	recipe?: GeneratedUserAvatarRecipe;
}

/**
 * A user's picture as the API describes it. `source` is the picture that is
 * shown; the optional members are every picture the user can switch back to.
 */
export interface UserAvatarDescriptor {
	source: 'upload' | 'sso' | 'generated';
	background: UserAvatarBackground;
	upload?: { url: string };
	sso?: {
		url: string;
		/** Host of the identity provider the picture came from, e.g. `accounts.google.com`. */
		provider?: string;
	};
	generated?: GeneratedUserAvatar;
}

export type IUser = {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string;
	role?: string;
	email?: string | null;
	signInType?: string;
	isOwner?: boolean;
	isPendingUser?: boolean;
	inviteAcceptUrl?: string;
	disabled?: boolean;
	mfaEnabled?: boolean;
	/** Absent or null when the user has no picture: the name-based default is drawn. */
	avatar?: UserAvatarDescriptor | null;
};

export interface UserAction<UserType extends IUser> {
	label: string;
	value: string;
	/** Whether to show a separator above the item in the dropdown menu. */
	divided?: boolean;
	disabled?: boolean;
	type?: 'external-link';
	tooltip?: string;
	guard?: (user: UserType) => boolean;
}

export type UserStackGroups = { [groupName: string]: IUser[] };
