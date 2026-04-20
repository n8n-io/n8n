export const BADGE_THEME = [
	'default',
	'neutral',
	'pink',
	'orange',
	'green',
	'purple',
	'mint',
	'red',
	'blue',
	'yellow',
	// @deprecated - Prefer semantic over utility themes
	'success',
	'warning',
	'danger',
	'primary',
	'secondary',
	'tertiary',
] as const;
export type BadgeTheme = (typeof BADGE_THEME)[number];
