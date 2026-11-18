import type { UiExtensionKind } from '@n8n/api-types';
import '@n8n/backend-services';

export interface UiExtensionsEventMap {
	/** A user saved or removed a side panel view or a page. The cli pushes it to that user. */
	'ui-extension-changed': {
		userId: string;
		extensionId: string;
		kind: UiExtensionKind;
		change: 'saved' | 'removed';
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends UiExtensionsEventMap {}
}
