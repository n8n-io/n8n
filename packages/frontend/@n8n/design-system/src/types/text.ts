const TEXT_SIZE = ['xsmall', 'small', 'mini', 'medium', 'large', 'xlarge'] as const;
export type TextSize = (typeof TEXT_SIZE)[number];

const TEXT_COLOR = [
	'primary',
	'secondary',
	'text-dark',
	'text-base',
	'text-light',
	'text-xlight',
	'danger',
	'success',
	'warning',
	'foreground-dark',
	'foreground-xdark',
] as const;
export type TextColor = (typeof TEXT_COLOR)[number];

const TEXT_ALIGN = ['right', 'left', 'center'] as const;
export type TextAlign = (typeof TEXT_ALIGN)[number];

const TEXT_FLOAT = ['left', 'right'] as const;
export type TextFloat = (typeof TEXT_FLOAT)[number];
