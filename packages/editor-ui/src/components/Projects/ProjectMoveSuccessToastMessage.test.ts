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
			resource: {
				id: '1',
				name: 'My Workflow',
				homeProject: {
					id: '2',
					name: 'My Project',
				},
			},
			resourceType: ResourceType.Workflow,
			resourceTypeLabel: 'Workflow',
			targetProject: {
				id: '2',
				name: 'My Project',
			},
		};
		const { getByText } = renderComponent({ props });
		expect(getByText(/Please double check any credentials/)).toBeInTheDocument();
	});

	it('should show link if the target project type is team project', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resource: {
				id: '1',
				name: 'My Workflow',
				homeProject: {
					id: '2',
					name: 'My Project',
				},
			},
			resourceType: ResourceType.Workflow,
			resourceTypeLabel: 'workflow',
			targetProject: {
				id: '2',
				name: 'Team Project',
				type: ProjectTypes.Team,
			},
		};
		const { getByRole } = renderComponent({ props });
		expect(getByRole('link')).toBeInTheDocument();
	});

	it('should show only general if the resource is credential and moved to a personal project', async () => {
		const props = {
			routeName: VIEWS.PROJECTS_WORKFLOWS,
			resource: {
				id: '1',
				name: 'Notion API',
				homeProject: {
					id: '2',
					name: 'My Project',
				},
			},
			resourceType: ResourceType.Credential,
			resourceTypeLabel: 'credential',
			targetProject: {
				id: '2',
				name: 'Personal Project',
				type: ProjectTypes.Personal,
			},
		};
		const { getByText, queryByText, queryByRole } = renderComponent({ props });
		expect(getByText(/credential was moved to /)).toBeInTheDocument();
		expect(queryByText(/Please double check any credentials/)).not.toBeInTheDocument();
		expect(queryByRole('link')).not.toBeInTheDocument();
	});
});
