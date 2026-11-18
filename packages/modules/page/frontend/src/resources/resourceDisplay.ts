import type { PageResourceType } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

import { splitTitleEmoji } from './titleEmoji';

export const RESOURCE_ICONS: Record<PageResourceType, IconName> = {
	workflow: 'workflow',
	node: 'box',
	page: 'file-text',
	credential: 'key-round',
	dataTable: 'table',
};

const UNKNOWN_RESOURCE_ICON: IconName = 'link';

/** How a resource shows. `emoji` replaces `icon` when it is present. */
export type ResourceDisplay = { icon: IconName; emoji?: string; text: string };

/**
 * Gives the icon and the text that show a resource with this name.
 * A page whose title starts with an emoji shows that emoji as its icon.
 */
export function toResourceDisplay(
	resourceType: PageResourceType | undefined,
	name: string,
): ResourceDisplay {
	const icon = resourceType ? RESOURCE_ICONS[resourceType] : UNKNOWN_RESOURCE_ICON;
	return resourceType === 'page' ? { icon, ...splitTitleEmoji(name) } : { icon, text: name };
}
