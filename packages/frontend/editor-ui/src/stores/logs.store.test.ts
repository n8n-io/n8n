import { setActivePinia } from 'pinia';
import { useLogsStore } from './logs.store';
import { createTestingPinia } from '@pinia/testing';
import { LOG_DETAILS_PANEL_STATE } from '@/features/logs/logs.constants';

describe('logs.store', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	describe('detailsState', () => {
		it('should return value depending on whether the selected node is sub node or not', () => {
			const store = useLogsStore();

			// Initial state: OUTPUT for regular node, BOTH for sub nodes
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.OUTPUT);
			store.setSubNodeSelected(true);
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.BOTH);

			store.toggleOutputOpen(false); // regular node unchanged, sub node to INPUT
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.INPUT);
			store.setSubNodeSelected(false);
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.OUTPUT);

			store.toggleInputOpen(true); // regular node to BOTH, sub node unchanged
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.BOTH);
			store.setSubNodeSelected(true);
			expect(store.detailsState).toBe(LOG_DETAILS_PANEL_STATE.INPUT);
		});
	});
});
