import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';

import { mockedStore } from '@/__tests__/utils';

import { useCredentialPages, useDataTablePages } from './useProjectResourcePages';

function setModuleActive(isActive: boolean) {
	mockedStore(useSettingsStore).isModuleActive.mockReturnValue(isActive);
}

describe('useProjectResourcePages', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		setModuleActive(true);
	});

	it('should describe a saved credential with its home project', () => {
		const { pagesResource, pagesProjectId } = useCredentialPages(
			ref({ id: 'c1', homeProject: { id: 'p1' } }),
		);

		expect(pagesResource.value).toEqual({
			resourceType: 'credential',
			resourceId: 'c1',
			projectId: 'p1',
		});
		expect(pagesProjectId.value).toBe('p1');
	});

	it('should describe nothing for a credential that is not saved', () => {
		expect(useCredentialPages(ref(null)).pagesResource.value).toBeUndefined();
	});

	it('should describe a loaded data table with its project', () => {
		const { pagesResource, pagesProjectId } = useDataTablePages(ref({ id: 'd1', projectId: 'p1' }));

		expect(pagesResource.value).toEqual({
			resourceType: 'dataTable',
			resourceId: 'd1',
			projectId: 'p1',
		});
		expect(pagesProjectId.value).toBe('p1');
	});

	it('should describe nothing when the page module is off', () => {
		setModuleActive(false);

		expect(
			useCredentialPages(ref({ id: 'c1', homeProject: { id: 'p1' } })).pagesResource.value,
		).toBeUndefined();
		expect(
			useDataTablePages(ref({ id: 'd1', projectId: 'p1' })).pagesResource.value,
		).toBeUndefined();
	});
});
