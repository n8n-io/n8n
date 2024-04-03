import type { TextFloat } from './text';

const BUTTON_ELEMENT = ['button', 'a'] as const;
export type ButtonElement = (typeof BUTTON_ELEMENT)[number];

const BUTTON_TYPE = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'] as const;
export type ButtonType = (typeof BUTTON_TYPE)[number];

const BUTTON_SIZE = ['small', 'medium', 'large'] as const;
export type ButtonSize = (typeof BUTTON_SIZE)[number];

export interface IconButtonProps {
	active?: boolean;
	disabled?: boolean;
	float?: TextFloat;
	icon?: string | string[];
	loading?: boolean;
	outline?: boolean;
	size?: ButtonSize;
	text?: boolean;
	type?: ButtonType;
}

export interface ButtonProps extends IconButtonProps {
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
