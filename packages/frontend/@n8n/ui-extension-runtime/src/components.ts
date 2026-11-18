import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import type { Component } from 'vue';

/**
 * The design-system components that a view can use. The MCP tool description
 * lists the same names. `N8nLink` is not here, because it needs a router.
 */
export const VIEW_COMPONENTS: Record<string, Component> = {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nTag,
	N8nText,
};
