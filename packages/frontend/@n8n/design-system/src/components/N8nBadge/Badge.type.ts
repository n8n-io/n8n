import type { IconName } from '../N8nIcon';

export interface BadgeProps {
	variant?:
		| 'filled'
		| 'primary'
		| 'secondary'
		| 'subtle'
		| 'outline'
		| 'ghost'
		| 'warning'
		| 'danger'
		| 'success';
	size?: BadgeSize;
	clickable?: boolean;
	disabled?: boolean;
	leadingIcon?: IconName;
	trailingIcon?: IconName;
}

export const BADGE_SIZE = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

export type BadgeSize = (typeof BADGE_SIZE)[number];
