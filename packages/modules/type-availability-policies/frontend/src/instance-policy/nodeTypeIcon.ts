import type { TypeIcon } from './instancePolicyTable.types';
import { typeIcon } from './typeIcon';
import type { AppliedTheme } from '../composables/useAppliedTheme';
import type { NodeTypeSummary } from '../type-availability-policies.api';

export const FALLBACK_NODE_TYPE_ICON: TypeIcon = { type: 'icon', name: 'box' };

export function nodeTypeIcon(
	summary: NodeTypeSummary,
	theme: AppliedTheme,
	baseUrl: string,
): TypeIcon {
	return typeIcon(summary, theme, baseUrl, FALLBACK_NODE_TYPE_ICON) ?? FALLBACK_NODE_TYPE_ICON;
}
