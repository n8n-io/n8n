import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createProjectListItem, createProjectSharingData } from '@/__tests__/data/projects';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';

const renderComponent = createComponentRenderer(ProjectSharing);

const homeProject = createProjectSharingData();
const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 2 }, () => createProjectListItem('team'));
const projects = [homeProject, ...personalProjects, ...teamProjects];

const getDropdownItems = async (dropdownTriggerParent: HTMLElement) => {
	await userEvent.click(within(dropdownTriggerParent).getByRole('textbox'));
	const selectTrigger = dropdownTriggerParent.querySelector(
		'.select-trigger[aria-describedby]',
	) as HTMLElement;
	await waitFor(() => expect(selectTrigger).toBeInTheDocument());

	const selectDropdownId = selectTrigger.getAttribute('aria-describedby');
	const selectDropdown = document.getElementById(selectDropdownId as string) as HTMLElement;
	await waitFor(() => expect(selectDropdown).toBeInTheDocument());

	return selectDropdown.querySelectorAll('.el-select-dropdown__item');
};

describe('ProjectSharing', () => {
	it('should render empty select when projects is empty and no selected project existing', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				projects: [],
				homeProject,
				modelValue: [],
			},
		});

		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();
	});

	it('should filter, add and remove projects', async () => {
		const { getByTestId, getAllByTestId, queryAllByTestId } = renderComponent({
			props: {
				projects,
				homeProject,
				modelValue: [personalProjects[0]],
			},
		});

		// Check the initial state (one selected project comes from the modelValue prop)
		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(1);

		const projectSelect = getByTestId('project-sharing-select');

		// Get the dropdown items
		let projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await waitFor(() => expect(projectSelectDropdownItems).toHaveLength(2));

		// Add a project (first from the dropdown list)
		await userEvent.click(projectSelectDropdownItems[0]);
		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(2);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await waitFor(() => expect(projectSelectDropdownItems).toHaveLength(1));

		// Remove the project (first from the list)
		let actionDropDownItems = await getDropdownItems(
			getAllByTestId('project-sharing-list-item')[0],
		);
		await waitFor(() => expect(actionDropDownItems).toHaveLength(2));

		// Click on the remove action which is the second item in the dropdown
		await userEvent.click(actionDropDownItems[1]);

		// Check the state
		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(1);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await waitFor(() => expect(projectSelectDropdownItems).toHaveLength(2));

		// Remove the last selected project
		actionDropDownItems = await getDropdownItems(getAllByTestId('project-sharing-list-item')[0]);
		await waitFor(() => expect(actionDropDownItems).toHaveLength(2));

		await userEvent.click(actionDropDownItems[1]);

		// Check the final state
		expect(queryAllByTestId('project-sharing-list-item')).toHaveLength(0);
		projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await waitFor(() => expect(projectSelectDropdownItems).toHaveLength(3));
	});
});
