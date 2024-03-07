import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createProjectListItem, createProjectSharingData } from '@/__tests__/data/projects';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';

const renderComponent = createComponentRenderer(ProjectSharing);

const homeProject = createProjectSharingData();
const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 2 }, () => createProjectListItem('team'));
const projects = [homeProject, ...personalProjects, ...teamProjects];

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

	it('should filter out home project and team projects and selected projects from the available projects for sharing', async () => {
		const { getByTestId, getAllByTestId } = renderComponent({
			props: {
				projects,
				homeProject,
				modelValue: [personalProjects[0]],
			},
		});

		expect(getAllByTestId('project-sharing-list-item')).toHaveLength(1);

		const projectSelect = getByTestId('project-sharing-select');

		await userEvent.click(projectSelect);

		await waitFor(() =>
			expect(projectSelect.querySelectorAll('.el-select-dropdown__item')).toHaveLength(2),
		);
	});
});
