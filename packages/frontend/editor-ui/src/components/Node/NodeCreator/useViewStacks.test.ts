import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
// import { useViewStacks } from './composables/useViewStacks';

describe('useViewStacks', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getAddedNodesAndConnections', () => {});
});
