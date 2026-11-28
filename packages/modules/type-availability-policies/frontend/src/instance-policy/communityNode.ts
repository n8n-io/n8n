import type { CommunityCatalogNode } from '@n8n/api-types';

import type { TypeIcon } from './instancePolicyTable.types';
import { nodeTypeIcon } from './nodeTypeIcon';
import type { AppliedTheme } from '../composables/useAppliedTheme';

/** A node type from a community package. One that is not installed carries its catalog data. */
export type CommunityNodeInfo = { installed: true } | ({ installed: false } & CommunityCatalogNode);

export function catalogNodeOf(
	type: { community?: CommunityNodeInfo } | undefined,
): CommunityCatalogNode | undefined {
	return type?.community?.installed === false ? type.community : undefined;
}

// The editor uses the icon URL of a catalog node as it is, so the URL gets no base URL here.
export function catalogNodeIcon(node: CommunityCatalogNode, theme: AppliedTheme): TypeIcon {
	return nodeTypeIcon(node, theme, '');
}
