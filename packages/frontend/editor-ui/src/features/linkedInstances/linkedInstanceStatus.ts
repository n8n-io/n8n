import type { LinkedInstanceStatus } from '@n8n/api-types';
import type { BadgeVariant } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

export type LinkedInstanceStatusDisplay = { labelKey: BaseTextKey; variant: BadgeVariant };

/** The status chip of a link. Status colours come from the status tokens, never from the brand. */
export const LINKED_INSTANCE_STATUS_DISPLAY: Record<
	LinkedInstanceStatus,
	LinkedInstanceStatusDisplay
> = {
	online: { labelKey: 'settings.linkedInstances.status.online', variant: 'success' },
	offline: { labelKey: 'settings.linkedInstances.status.offline', variant: 'danger' },
	unauthorised: { labelKey: 'settings.linkedInstances.status.unauthorised', variant: 'danger' },
	'mcp-disabled': { labelKey: 'settings.linkedInstances.status.mcpDisabled', variant: 'warning' },
	unknown: { labelKey: 'settings.linkedInstances.status.unknown', variant: 'outline' },
};
