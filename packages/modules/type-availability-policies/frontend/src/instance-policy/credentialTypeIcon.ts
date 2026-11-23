import type { TypeIcon } from './instancePolicyTable.types';
import { typeIcon } from './typeIcon';
import type { AppliedTheme } from '../composables/useAppliedTheme';
import type { CredentialTypeSummary } from '../type-availability-policies.api';

/** For a type with no icon this module can resolve, for example one that names a node type. */
export const FALLBACK_TYPE_ICON: TypeIcon = { type: 'icon', name: 'key-round' };

/** Follows the editor's `CredentialIcon`, which a module cannot import. */
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

	const ownIcon = typeIcon(type, theme, baseUrl, FALLBACK_TYPE_ICON);
	if (ownIcon) return ownIcon;

	for (const parent of type.extends ?? []) {
		const parentIcon = credentialTypeIcon(types, parent, theme, baseUrl, visited);
		if (parentIcon) return parentIcon;
	}

	return undefined;
}
