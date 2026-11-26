import type { Themed } from 'n8n-workflow';

import type { TypeIcon } from './instancePolicyTable.types';
import type { AppliedTheme } from '../composables/useAppliedTheme';

type IconFields = {
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
};

const ABSOLUTE_URL = /^(https?:)?\/\//;

function themed(value: Themed<string> | undefined, theme: AppliedTheme): string | undefined {
	return typeof value === 'object' ? value[theme] : value;
}

/**
 * Follows the editor's icon resolution, which a module cannot import. Returns `fallback` for an icon
 * this module cannot draw, and `undefined` when the type has no icon of its own.
 */
export function typeIcon(
	type: IconFields,
	theme: AppliedTheme,
	baseUrl: string,
	fallback: TypeIcon,
): TypeIcon | undefined {
	const iconUrl = themed(type.iconUrl, theme);
	if (iconUrl) {
		return { type: 'file', src: ABSOLUTE_URL.test(iconUrl) ? iconUrl : baseUrl + iconUrl };
	}

	const icon = themed(type.icon, theme);
	const color = type.iconColor ? `var(--node--icon--color--${type.iconColor})` : undefined;
	if (icon?.startsWith('fa:')) return { type: 'icon', name: icon.slice('fa:'.length), color };
	if (icon?.startsWith('node:')) {
		// `node:<package>.<type>` points at a node type, while `node:<name>` is a built-in icon.
		return icon.includes('.') ? fallback : { type: 'icon', name: icon, color };
	}

	return undefined;
}
