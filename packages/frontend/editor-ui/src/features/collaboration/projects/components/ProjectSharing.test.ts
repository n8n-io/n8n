import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, getSelectedDropdownValue } from '@/__tests__/utils';
import { createProjectListItem, createProjectSharingData } from '../__tests__/utils';
import ProjectSharing from './ProjectSharing.vue';
import type { AllRolesMap } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import type * as I18nModule from '@n8n/i18n';

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof I18nModule>();
	return {
		...actual,
		useI18n: vi.fn(),
	};
});

const mockBaseText = vi.fn((key: string) => {
	const translations: Record<string, string> = {
		'projects.sharing.allUsers': 'All users and projects',
		'auth.roles.owner': 'Owner',
	};
	return translations[key] || key;
});

const renderComponent = createComponentRenderer(ProjectSharing);

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));
const homeProject = createProjectSharingData();

describe('ProjectSharing', () => {
	beforeEach(() => {
		vi.mocked(useI18n).mockReturnValue({
			baseText: mockBaseText,
		} as unknown as ReturnType<typeof useI18n>);
	});
	it('should render empty select when projects is empty and no selected project existing', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				projects: [],
				modelValue: [],
			},
		});

		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();
		expect(queryByTestId('project-sharing-owner')).not.toBeInTheDocument();
	});

	it('should filter, add and remove projects', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, queryAllByTestId, emitted } =
			renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [personalProjects[0]],
					roles: [
						{
							role: 'project:admin',
							name: 'Admin',
						},
						{
							role: 'project:editor',
							name: 'Editor',
						},
					] as unknown as AllRolesMap['workflow' | 'credential' | 'project'],
				},
			});

		expect(queryByTestId('project-sharing-owner')).not.toBeInTheDocument();
		// Check the initial state (one selected project comes from the modelValue prop)
		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(1);

		const projectSelect = getByTestId('project-sharing-select');
		const projectSelectInput = projectSelect.querySelector('input') as HTMLInputElement;

		// Get the dropdown items
		let projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(2);

		// Add a project (first from the dropdown list)
		await userEvent.click(projectSelectDropdownItems[0]);
		expect(emitted()['update:modelValue']).toEqual([[[expect.any(Object), expect.any(Object)]]]);

		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(2);
		expect(projectSelectInput.value).toBe('');
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(1);

		let actionDropDownItems = await getDropdownItems(
			getAllByTestId('project-sharing-list-item')[0],
		);
		expect(actionDropDownItems).toHaveLength(2);

		// Click on the remove button
		await userEvent.click(
			within(getAllByTestId('project-sharing-list-item')[0]).getByTestId('project-sharing-remove'),
		);
		expect(emitted()['update:modelValue']).toEqual([
			[[expect.any(Object), expect.any(Object)]],
			[[expect.any(Object)]],
		]);

		// Check the state
		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(1);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(2);

		actionDropDownItems = await getDropdownItems(getAllByTestId('project-sharing-list-item')[0]);
		expect(actionDropDownItems).toHaveLength(2);

		// Remove the last selected project
		await userEvent.click(
			within(getAllByTestId('project-sharing-list-item')[0]).getByTestId('project-sharing-remove'),
		);
		expect(emitted()['update:modelValue']).toEqual([
			[[expect.any(Object), expect.any(Object)]],
			[[expect.any(Object)]],
			[[]],
		]);

		// Check the final state
		expect(queryAllByTestId('project-sharing-list-item')).toHaveLength(0);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(3);
	});

	it('should work as a simple select when model is not an array', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent({
			props: {
				projects: teamProjects,
				modelValue: null,
			},
		});
		expect(queryByTestId('project-sharing-owner')).not.toBeInTheDocument();

		const projectSelect = getByTestId('project-sharing-select');

		// Get the dropdown items
		let projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(3);

		// Select the first project from the dropdown list
		await userEvent.click(projectSelectDropdownItems[0]);
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(3);

		const selectedValue = await getSelectedDropdownValue(projectSelectDropdownItems);
		expect(selectedValue).toBeTruthy();
		expect(emitted()['update:modelValue']).toEqual([
			[
				expect.objectContaining({
					name: selectedValue,
				}),
			],
		]);

		// Select another project from the dropdown list
		await userEvent.click(projectSelectDropdownItems[1]);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(3);
		const newSelectedValue = await getSelectedDropdownValue(projectSelectDropdownItems);
		expect(newSelectedValue).toBeTruthy();
		expect(emitted()['update:modelValue']).toEqual([
			expect.any(Array),
			[
				expect.objectContaining({
					name: newSelectedValue,
				}),
			],
		]);
	});

	it('should render home project as owner when defined', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				projects: personalProjects,
				modelValue: [],
				homeProject,
			},
		});

		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();
		expect(getByTestId('project-sharing-owner')).toBeInTheDocument();
	});

	describe('global sharing', () => {
		it('should show "All Users" option when canShareGlobally is true', async () => {
			const { getByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: true,
				},
			});

			const projectSelect = getByTestId('project-sharing-select');
			const dropdownItems = await getDropdownItems(projectSelect);

			// "All users and projects" should be the first option
			expect(dropdownItems[0]).toHaveTextContent('All users and projects');
			// Total items should be projects + "All Users"
			expect(dropdownItems).toHaveLength(personalProjects.length + 1);
		});

		it('should not show "All Users" option when canShareGlobally is false', async () => {
			const { getByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: false,
				},
			});

			const projectSelect = getByTestId('project-sharing-select');
			const dropdownItems = await getDropdownItems(projectSelect);

			// "All users and projects" should not be present
			expect(dropdownItems[0]).not.toHaveTextContent('All users and projects');
			expect(dropdownItems).toHaveLength(personalProjects.length);
		});

		it('should not show "All Users" option when canShareGlobally is undefined', async () => {
			const { getByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
				},
			});

			const projectSelect = getByTestId('project-sharing-select');
			const dropdownItems = await getDropdownItems(projectSelect);

			// "All users and projects" should not be present
			expect(dropdownItems[0]).not.toHaveTextContent('All users and projects');
			expect(dropdownItems).toHaveLength(personalProjects.length);
		});

		it('should emit update:shareWithAllUsers when "All Users" is selected', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: true,
				},
			});

			const projectSelect = getByTestId('project-sharing-select');
			const dropdownItems = await getDropdownItems(projectSelect);

			// Select "All Users" (first item)
			await userEvent.click(dropdownItems[0]);

			expect(emitted()['update:shareWithAllUsers']).toBeTruthy();
			expect(emitted()['update:shareWithAllUsers']).toEqual([[true]]);
		});

		it('should show "All Users" in selected list when isSharedGlobally is true', () => {
			const { getAllByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: true,
					isSharedGlobally: true,
				},
			});

			const listItems = getAllByTestId('project-sharing-list-item');
			// First item should be "All users and projects"
			expect(listItems[0]).toHaveTextContent('All users and projects');
		});

		it('should emit update:shareWithAllUsers with false when "All Users" is removed', async () => {
			const { getAllByTestId, emitted } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: true,
					isSharedGlobally: true,
					roles: [
						{
							role: 'project:admin',
							name: 'Admin',
						},
					] as unknown as AllRolesMap['workflow' | 'credential' | 'project'],
				},
			});

			const listItems = getAllByTestId('project-sharing-list-item');
			const removeButton = within(listItems[0]).getByTestId('project-sharing-remove');

			await userEvent.click(removeButton);

			expect(emitted()['update:shareWithAllUsers']).toBeTruthy();
			expect(emitted()['update:shareWithAllUsers']).toEqual([[false]]);
		});

		it('should not show remove button for "All Users" when canShareGlobally is false', () => {
			const { getAllByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: false,
					isSharedGlobally: true,
				},
			});

			const listItems = getAllByTestId('project-sharing-list-item');
			const removeButton = within(listItems[0]).queryByTestId('project-sharing-remove');

			// Remove button should not exist for "All Users" when canShareGlobally is false
			expect(removeButton).not.toBeInTheDocument();
		});

		it('should not show "All Users" in dropdown when already globally shared', async () => {
			const { getByTestId } = renderComponent({
				props: {
					projects: personalProjects,
					modelValue: [],
					canShareGlobally: true,
					isSharedGlobally: true,
				},
			});

			const projectSelect = getByTestId('project-sharing-select');
			const dropdownItems = await getDropdownItems(projectSelect);

			// "All users and projects" should not be in dropdown when already shared globally
			expect(dropdownItems[0]).not.toHaveTextContent('All users and projects');
			expect(dropdownItems).toHaveLength(personalProjects.length);
		});
	});
});
