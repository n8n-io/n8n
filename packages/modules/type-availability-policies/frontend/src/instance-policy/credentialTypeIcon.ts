import type { Themed } from 'n8n-workflow';

import type { AppliedTheme } from '../composables/useAppliedTheme';
import type { CredentialTypeSummary } from '../type-availability-policies.api';

/** The props of `N8nNodeIcon` for one row. */
export type TypeIcon =
	| { type: 'file'; src: string }
	| { type: 'icon'; name: string; color?: string };

/** A credential that names a node type's icon gets this, because node icons need `nodes.json`. */
export const FALLBACK_TYPE_ICON: TypeIcon = { type: 'icon', name: 'key-round' };

function themed(value: Themed<string> | undefined, theme: AppliedTheme): string | undefined {
	return typeof value === 'object' ? value[theme] : value;
}

/**
 * Follows the editor's `CredentialIcon`: the type's own icon file or icon name first, then the icon
 * of the first type it extends that has one.
 */
export function credentialTypeIcon(
	types: ReadonlyMap<string, CredentialTypeSummary>,
	name: string,
	theme: AppliedTheme,
	baseUrl: string,
	visited = new Set<string>(),
): TypeIcon | undefined {
	const type = types.get(name);
	if (!type || visited.has(name)) return undefined;
	visited.add(name);

	const iconUrl = themed(type.iconUrl, theme);
	if (iconUrl) return { type: 'file', src: baseUrl + iconUrl };

	const icon = themed(type.icon, theme);
	const color = type.iconColor ? `var(--node--icon--color--${type.iconColor})` : undefined;
	if (icon?.startsWith('fa:')) return { type: 'icon', name: icon.slice('fa:'.length), color };
	if (icon?.startsWith('node:')) {
		// `node:<package>.<type>` points at a node type, while `node:<name>` is a built-in icon.
		return icon.includes('.') ? FALLBACK_TYPE_ICON : { type: 'icon', name: icon, color };
	}

	for (const parent of type.extends ?? []) {
		const parentIcon = credentialTypeIcon(types, parent, theme, baseUrl, visited);
		if (parentIcon) return parentIcon;
	}

	return undefined;
}
