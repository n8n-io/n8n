import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { BaseFilters } from '@/Interface';
import ResourceFiltersDropdown from './ResourceFiltersDropdown.vue';

const remoteProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

// Holds the filters like a parent view does, so the dropdown receives its own updates.
const Host = defineComponent({
	setup() {
		const filters = ref<BaseFilters>({ search: '', homeProject: '' });
		return () =>
			h(ResourceFiltersDropdown, {
				modelValue: filters.value,
				keys: ['search', 'homeProject'],
				'onUpdate:modelValue': (value: BaseFilters) => {
					filters.value = value;
				},
			});
	},
});

const renderComponent = createComponentRenderer(Host);

const openFilters = async (getByTestId: (id: string) => HTMLElement) => {
	await userEvent.click(getByTestId('resources-list-filters-trigger'));
	await waitFor(() => expect(getByTestId('resources-list-filters-dropdown')).toBeInTheDocument());
};

const ownerInput = (getByTestId: (id: string) => HTMLElement) =>
	within(getByTestId('project-sharing-select')).getByRole('combobox');

describe('ResourceFiltersDropdown', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isEnterpriseFeatureEnabled = {
			[EnterpriseEditionFeature.Sharing]: true,
		} as typeof settingsStore.isEnterpriseFeatureEnabled;

		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = true;
		// The owner comes from a remote search and is not in the projects store.
		projectsStore.availableProjects = [];
		projectsStore.globalProjectPermissions = { list: true };
		projectsStore.searchProjects.mockResolvedValue({
			count: remoteProjects.length,
			data: remoteProjects,
		});
	});

	it('should show the selected owner after it is picked from a remote search', async () => {
		const { getByTestId } = renderComponent();
		await openFilters(getByTestId);

		const items = await getDropdownItems(getByTestId('project-sharing-select'));
		const option = [...items].find(
			(item) => item.querySelector('p')?.textContent?.trim() === remoteProjects[1].name,
		);
		await userEvent.click(option as Element);

		await waitFor(() => expect(ownerInput(getByTestId)).toHaveValue(remoteProjects[1].name));
		expect(getByTestId('resources-list-filters-count')).toHaveTextContent('1');
	});

	it('should clear the selected owner when the filters are reset', async () => {
		const { getByTestId, getByText } = renderComponent();
		await openFilters(getByTestId);

		const items = await getDropdownItems(getByTestId('project-sharing-select'));
		await userEvent.click(items[0]);
		await waitFor(() => expect(ownerInput(getByTestId)).not.toHaveValue(''));

		await userEvent.click(getByText('Reset all'));

		await waitFor(() => expect(ownerInput(getByTestId)).toHaveValue(''));
	});
});
