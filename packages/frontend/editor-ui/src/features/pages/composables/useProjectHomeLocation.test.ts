import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useProjectHomeLocation } from './useProjectHomeLocation';

describe('useProjectHomeLocation', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('opens the documentation board when the instance has pages', () => {
		vi.mocked(useSettingsStore().isModuleActive).mockReturnValue(true);

		expect(useProjectHomeLocation()('project-1')).toEqual({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: 'project-1' },
			query: { view: 'docs' },
		});
	});

	it('opens the list of workflows when the instance has no pages', () => {
		vi.mocked(useSettingsStore().isModuleActive).mockReturnValue(false);

		expect(useProjectHomeLocation()('project-1')).toEqual({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: 'project-1' },
		});
	});
});
