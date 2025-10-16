import { type IconSize } from './icon';
import type { TextFloat } from './text';
import type { IconName } from '../components/N8nIcon/icons';

const BUTTON_ELEMENT = ['button', 'a'] as const;
export type ButtonElement = (typeof BUTTON_ELEMENT)[number];

const BUTTON_TYPE = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'highlight',
] as const;
export type ButtonType = (typeof BUTTON_TYPE)[number];

const BUTTON_SIZE = ['xmini', 'mini', 'small', 'medium', 'large'] as const;
export type ButtonSize = (typeof BUTTON_SIZE)[number];

const BUTTON_NATIVE_TYPE = ['submit', 'reset', 'button'] as const;
export type ButtonNativeType = (typeof BUTTON_NATIVE_TYPE)[number];

export interface IconButtonProps {
	active?: boolean;
	disabled?: boolean;
	float?: TextFloat;
	icon?: IconName;
	loading?: boolean;
	outline?: boolean;
	size?: ButtonSize;
	iconSize?: IconSize;
	text?: boolean;
	type?: ButtonType;
	nativeType?: ButtonNativeType;
}

export interface ButtonProps extends IconButtonProps {
	ariaLabel?: string;
	block?: boolean;
	element?: ButtonElement;
	href?: string;
	label?: string;
	square?: boolean;
}

export type IN8nButton = {
	attrs: ButtonProps & {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'data-test-id'?: string;
	};
	listeners?: Record<string, (event: Event) => void>;
};
