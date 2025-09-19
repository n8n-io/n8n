import { createComponentRenderer } from '@/__tests__/render';
import ProjectMoveSuccessToastMessage from '@/components/Projects/ProjectMoveSuccessToastMessage.vue';
import { ResourceType } from '@/utils/projects.utils';
import { VIEWS } from '@/constants';
import { ProjectTypes } from '@/types/projects.types';

const renderComponent = createComponentRenderer(ProjectMoveSuccessToastMessage, {
	global: {
		stubs: {
			'router-link': {
				template: '<a href="#"><slot /></a>',
			},
		},
	},
});

describe('ProjectMoveSuccessToastMessage', () => {
	it('should show credentials message if the resource is a workflow', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resourceType: ResourceType.Workflow,
			targetProject: {
				id: '2',
				name: 'My Project',
			},
			isShareCredentialsChecked: false,
			areAllUsedCredentialsShareable: false,
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/The workflow's credentials were not shared/)).toBeInTheDocument();
	});

	it('should show all credentials shared message if the resource is a workflow', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resourceType: ResourceType.Workflow,
			targetProject: {
				id: '2',
				name: 'My Project',
			},
			isShareCredentialsChecked: true,
			areAllUsedCredentialsShareable: true,
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/The workflow's credentials were shared/)).toBeInTheDocument();
	});

	it('should show not all credentials shared message if the resource is a workflow', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resourceType: ResourceType.Workflow,
			targetProject: {
				id: '2',
				name: 'My Project',
			},
			isShareCredentialsChecked: true,
			areAllUsedCredentialsShareable: false,
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/Due to missing permissions/)).toBeInTheDocument();
	});

	it('should show link if the target project type is team project', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resourceType: ResourceType.Workflow,
			targetProject: {
				id: '2',
				name: 'Team Project',
				type: ProjectTypes.Team,
			},
			isShareCredentialsChecked: false,
			areAllUsedCredentialsShareable: false,
		};
		const { getByRole } = renderComponent({ props });
		expect(getByRole('link')).toBeInTheDocument();
	});

	it('should show only general if the resource is credential and moved to a personal project', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resourceType: ResourceType.Credential,
			targetProject: {
				id: '2',
				name: 'Personal Project',
				type: ProjectTypes.Personal,
			},
			isShareCredentialsChecked: false,
			areAllUsedCredentialsShareable: false,
		};
		const { queryByText, queryByRole } = renderComponent({ props });
		expect(queryByText(/The workflow's credentials were not shared/)).not.toBeInTheDocument();
		expect(queryByRole('link')).not.toBeInTheDocument();
	});
});
