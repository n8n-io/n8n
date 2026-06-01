import { mock } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { FavoritesEventRelay } from '../favorites.event-relay';
import type { FavoritesService } from '../favorites.service';

describe('FavoritesEventRelay', () => {
	const eventService = new EventService();
	const favoritesService = mock<FavoritesService>();
	new FavoritesEventRelay(eventService, favoritesService).init();

	afterEach(() => jest.clearAllMocks());

	describe('workflow-deleted', () => {
		it('should delete favorites for the deleted workflow', async () => {
			const event: RelayEventMap['workflow-deleted'] = {
				user: mock(),
				workflowId: 'wf1',
				publicApi: false,
			};

			eventService.emit('workflow-deleted', event);

			await new Promise(setImmediate);

			expect(favoritesService.deleteByResource).toHaveBeenCalledWith('wf1', 'workflow');
		});
	});

	describe('data-table-deleted', () => {
		it('should delete favorites for the deleted data table', async () => {
			const event: RelayEventMap['data-table-deleted'] = {
				dataTableId: 'dt1',
				projectId: 'proj1',
			};

			eventService.emit('data-table-deleted', event);

			await new Promise(setImmediate);

			expect(favoritesService.deleteByResource).toHaveBeenCalledWith('dt1', 'dataTable');
		});
	});

	describe('team-project-deleted', () => {
		it('should delete favorites when a project is deleted', async () => {
			const event: RelayEventMap['team-project-deleted'] = {
				userId: 'user1',
				role: 'owner',
				projectId: 'proj1',
				removalType: 'delete',
			};

			eventService.emit('team-project-deleted', event);

			await new Promise(setImmediate);

			expect(favoritesService.deleteByResource).toHaveBeenCalledWith('proj1', 'project');
		});

		it('should delete favorites when a project is transferred', async () => {
			const event: RelayEventMap['team-project-deleted'] = {
				userId: 'user1',
				role: 'owner',
				projectId: 'proj1',
				removalType: 'transfer',
				targetProjectId: 'proj2',
			};

			eventService.emit('team-project-deleted', event);

			await new Promise(setImmediate);

			expect(favoritesService.deleteByResource).toHaveBeenCalledWith('proj1', 'project');
		});
	});
});
