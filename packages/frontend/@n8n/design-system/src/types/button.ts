import { type ClassValue } from 'clsx';

import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { type IconSize } from './icon';

const BUTTON_VARIANT = ['solid', 'subtle', 'ghost', 'outline', 'destructive'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[number];

/** @deprecated Use 'ghost' or 'subtle' instead */
export type LegacyButtonVariant = 'highlight' | 'highlight-fill';

const BUTTON_SIZE = ['mini', 'xmini', 'small', 'medium', 'large', 'xlarge', 'xsmall'] as const;
export type ButtonSize = (typeof BUTTON_SIZE)[number];

export interface ButtonProps {
	/** Determines the visual style of the button */
	variant?: ButtonVariant | LegacyButtonVariant;
	/** Determines the size of the button */
	size?: ButtonSize;
	/** If passed, the button will be rendered as a link */
	href?: string;
	/** If true, the button will show a loading spinner */
	loading?: boolean;
	/** If true, button is fixed square size (for icon-only buttons) */
	iconOnly?: boolean;
	/** If true, the button will be disabled */
	disabled?: boolean;
	/** Additional classes to apply to the button (accepts string, object, or array) */
	class?: ClassValue;
	/** @deprecated Use slot instead */
	icon?: IconName;
	iconSize?: IconSize;
	/** @deprecated Use slot instead */
	label?: string;
}

export interface IconButtonProps extends ButtonProps {
	/** Icon is required for icon buttons */
	icon: IconName;
}

export type IN8nButton = {
	attrs: ButtonProps & {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'data-test-id'?: string;
	};
	listeners?: Record<string, (event: Event) => void>;
};
