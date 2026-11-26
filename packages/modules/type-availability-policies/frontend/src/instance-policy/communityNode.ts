import type { UninstalledCommunityNodeAccess } from '@n8n/api-types';
import { isCommunityPackageName } from 'n8n-workflow';

import type { TypeIcon } from './instancePolicyTable.types';
import { nodeTypeIcon } from './nodeTypeIcon';
import type { AppliedTheme } from '../composables/useAppliedTheme';

type CatalogNode = Pick<
	UninstalledCommunityNodeAccess,
	'displayName' | 'icon' | 'iconUrl' | 'iconColor'
>;

/** A node type from a community package. One that is not installed carries its catalog data. */
export type CommunityNodeInfo = { installed: true } | ({ installed: false } & CatalogNode);

/** For an installed type, from its name. A generated tool variant has the name of its package too. */
export function installedCommunityNode(typeName: string): CommunityNodeInfo | undefined {
	return isCommunityPackageName(typeName) ? { installed: true } : undefined;
}

export function catalogNodeOf(
	type: { community?: CommunityNodeInfo } | undefined,
): CatalogNode | undefined {
	return type?.community?.installed === false ? type.community : undefined;
}

// The editor uses the icon URL of a catalog node as it is, so the URL gets no base URL here.
export function catalogNodeIcon(node: CatalogNode, theme: AppliedTheme): TypeIcon {
	return nodeTypeIcon(node, theme, '');
}
