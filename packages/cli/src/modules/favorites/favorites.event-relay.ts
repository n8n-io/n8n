import { Service } from '@n8n/di';

import { EventRelay } from '@/events/relays/event-relay';
import { EventService } from '@/events/event.service';

import { FavoritesService } from './favorites.service';

@Service()
export class FavoritesEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		private readonly favoritesService: FavoritesService,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'workflow-deleted': ({ workflowId }) => this.favoritesService.deleteByResource(workflowId),
			'team-project-deleted': async ({ projectId, removalType }) => {
				if (removalType === 'delete') {
					await this.favoritesService.deleteByResource(projectId);
				}
			},
		});
	}
}
