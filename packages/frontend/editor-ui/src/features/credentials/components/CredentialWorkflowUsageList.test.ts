import { createComponentRenderer } from '@/__tests__/render';
import CredentialWorkflowUsageList from './CredentialWorkflowUsageList.vue';
import type { CredentialUsageWorkflow } from '../credentials.types';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const renderComponent = createComponentRenderer(CredentialWorkflowUsageList);

const createProject = (overrides: Partial<ProjectSharingData> = {}): ProjectSharingData => ({
	id: 'project-1',
	name: 'Personal Project',
	type: 'personal',
	icon: null,
	createdAt: '2025-01-01T00:00:00.000Z',
	updatedAt: '2025-01-01T00:00:00.000Z',
	...overrides,
});

const createWorkflow = (
	overrides: Partial<CredentialUsageWorkflow> = {},
): CredentialUsageWorkflow => ({
	id: 'workflow-1',
	name: 'Workflow 1',
	active: true,
	isArchived: false,
	updatedAt: '2025-01-01T00:00:00.000Z',
	currentUserHasAccess: true,
	homeProject: createProject(),
	sharedWithProjects: [],
	...overrides,
});

describe('CredentialWorkflowUsageList', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('renders links for workflows the user can access', () => {
		const workflows = [createWorkflow()];
		const { getByText } = renderComponent({
			props: { workflows },
		});

		const link = getByText(workflows[0].name).closest('a');
		expect(link).toBeTruthy();
		expect(link).toHaveClass('usage-link');
	});

	it('shows access warning badge when user lacks permissions', () => {
		const workflows = [
			createWorkflow({
				id: 'workflow-2',
				name: 'Restricted Workflow',
				currentUserHasAccess: false,
			}),
		];
		const { getByText, queryByRole } = renderComponent({
			props: { workflows },
		});

		expect(queryByRole('link', { name: workflows[0].name })).not.toBeInTheDocument();
		expect(getByText('No access')).toBeInTheDocument();
	});
});
