import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useUIStore } from '@/app/stores/ui.store';
import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/app/constants';
import { useBuildManually } from './useBuildManually';

const push = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
}));

describe('useBuildManually', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		push.mockReset();
	});

	it('flags the trigger picker and routes to a new workflow within the given project', () => {
		const { buildManually } = useBuildManually();

		buildManually('project-1');

		expect(useUIStore().addFirstStepOnLoad).toBe(true);
		// Manual builds from Instance AI are attributed via the node-creator source.
		expect(useUIStore().addFirstStepOnLoadSource).toBe(NODE_CREATOR_OPEN_SOURCES.INSTANCE_AI);
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.NEW_WORKFLOW,
			query: { projectId: 'project-1' },
		});
	});

	it('omits the project query when no project is provided', () => {
		const { buildManually } = useBuildManually();

		buildManually();

		expect(push).toHaveBeenCalledWith({ name: VIEWS.NEW_WORKFLOW, query: {} });
	});
});
