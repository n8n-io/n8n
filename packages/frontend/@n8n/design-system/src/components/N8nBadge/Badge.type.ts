import type { IconName } from '../N8nIcon';

export const BADGE_VARIANT = [
	'filled',
	'primary',
	'secondary',
	'subtle',
	'outline',
	'ghost',
	'warning',
	'danger',
	'success',
	'info',
] as const;

export type BadgeVariant = (typeof BADGE_VARIANT)[number];

export interface BadgeProps {
	variant?: BadgeVariant;
	size?: BadgeSize;
	clickable?: boolean;
	disabled?: boolean;
	leadingIcon?: IconName;
	trailingIcon?: IconName;
}

export const BADGE_SIZE = ['xxsmall', 'xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

export type BadgeSize = (typeof BADGE_SIZE)[number];
