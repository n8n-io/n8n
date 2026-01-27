import { type IconSize } from './icon';
import type { TextFloat } from './text';
import type { IconName } from '../components/N8nIcon/icons';

// Current variant types
const BUTTON_VARIANT = ['solid', 'subtle', 'ghost', 'outline', 'destructive'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[number];

const BUTTON_ELEMENT = ['button', 'a'] as const;
export type ButtonElement = (typeof BUTTON_ELEMENT)[number];

// Legacy type values (deprecated, for backwards compat)
const BUTTON_TYPE = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'highlight',
	'highlightFill',
] as const;
/** @deprecated Use ButtonVariant instead */
export type ButtonType = (typeof BUTTON_TYPE)[number];

// Combined sizes (includes legacy xmini/mini mapped to xsmall)
const BUTTON_SIZE = ['xmini', 'mini', 'small', 'medium', 'large', 'xlarge', 'xsmall'] as const;
export type ButtonSize = (typeof BUTTON_SIZE)[number];

const BUTTON_NATIVE_TYPE = ['submit', 'reset', 'button'] as const;
export type ButtonNativeType = (typeof BUTTON_NATIVE_TYPE)[number];

export interface IconButtonProps {
	/** Determines the type of button, typically the intent of the action */
	variant?: ButtonVariant;

	// Legacy props (deprecated, for backwards compat)
	/** @deprecated Use variant instead */
	type?: ButtonType;

	// Shared props
	active?: boolean;
	disabled?: boolean;
	float?: TextFloat;
	loading?: boolean;
	/** @deprecated Use variant="outline" instead */
	outline?: boolean;
	size?: ButtonSize;
	/** @deprecated Use variant="ghost" instead */
	text?: boolean;
	/** @deprecated Use type attribute directly */
	nativeType?: ButtonNativeType;

	/** If true, forces equal width and height (square button for icons) */
	iconOnly?: boolean;

	// Legacy icon props (deprecated)
	/** @deprecated Pass <N8nIcon> in slot instead */
	icon?: IconName;
	iconSize?: IconSize;
}

export interface ButtonProps extends IconButtonProps {
	/** @deprecated Use CSS class with width: 100% */
	block?: boolean;
	/** @deprecated Use href prop */
	element?: ButtonElement;
	href?: string;
	/** @deprecated Pass content as slot */
	label?: string;
	/** @deprecated Use iconOnly prop */
	square?: boolean;
}

export type IN8nButton = {
	attrs: ButtonProps & {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'data-test-id'?: string;
	};
	listeners?: Record<string, (event: Event) => void>;
};
