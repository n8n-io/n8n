import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { EventRelay } from '@/events/relays/event-relay';
import { Push } from '@/push';

/**
 * Tells every open editor of a user that their side panel views or pages
 * changed, so the editors refetch them. A change can come from an MCP tool or
 * from the editor, and both emit the same event.
 */
@Service()
export class UiExtensionsPushEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		private readonly push: Push,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'ui-extension-changed': ({ userId }) => {
				this.push.sendToUsers({ type: 'uiExtensionViewsChanged', data: {} }, [userId]);
			},
		});
	}
}
