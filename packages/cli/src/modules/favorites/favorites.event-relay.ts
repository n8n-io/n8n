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
			'workflow-deleted': async ({ workflowId }) =>
				await this.favoritesService.deleteByResource(workflowId, 'workflow'),
			'data-table-deleted': async ({ dataTableId }) =>
				await this.favoritesService.deleteByResource(dataTableId, 'dataTable'),
			'folder-deleted': async ({ folderId }) =>
				await this.favoritesService.deleteByResource(folderId, 'folder'),
			'team-project-deleted': async ({ projectId }) => {
				await this.favoritesService.deleteByResource(projectId, 'project');
			},
		});
	}
}
