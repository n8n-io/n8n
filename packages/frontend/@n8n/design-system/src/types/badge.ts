const BADGE_THEME = [
	'default',
	'success',
	'warning',
	'danger',
	'primary',
	'secondary',
	'tertiary',
] as const;
export type BadgeTheme = (typeof BADGE_THEME)[number];
