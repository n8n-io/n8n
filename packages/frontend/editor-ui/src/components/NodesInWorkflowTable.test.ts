import { createComponentRenderer } from '@/__tests__/render';
import NodesInWorkflowTable from '@/components/NodesInWorkflowTable.vue';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { WorkflowResource } from '@/Interface';

const mockWorkflows: WorkflowResource[] = [
	{
		id: 'workflow-1',
		name: 'Test Workflow 1',
		resourceType: 'workflow',
		active: true,
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z',
		homeProject: {
			id: 'project-1',
			name: 'Test Project 1',
			icon: { type: 'emoji', value: 'test' },
			type: 'personal',
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
		},
		isArchived: false,
		readOnly: false,
		scopes: [],
		tags: [],
	},
	{
		id: 'workflow-2',
		name: 'Test Workflow 2',
		resourceType: 'workflow',
		active: false,
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z',
		homeProject: {
			id: 'project-2',
			name: 'Test Project 2',
			icon: { type: 'emoji', value: 'test' },
			type: 'personal',
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
		},
		isArchived: false,
		readOnly: false,
		scopes: [],
		tags: [],
	},
];

describe('NodesInWorkflowTable', () => {
	it('should render workflow data in table rows', () => {
		const renderComponent = createComponentRenderer(NodesInWorkflowTable, {
			props: {
				data: mockWorkflows,
			},
			global: {
				stubs: {
					RouterLink: {
						template: '<a><slot /></a>',
					},
				},
				plugins: [createTestingPinia()],
			},
		});

		renderComponent();

		expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
		expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
		expect(screen.getByText('Test Project 1')).toBeInTheDocument();
		expect(screen.getByText('Test Project 2')).toBeInTheDocument();
		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(screen.getByText('Inactive')).toBeInTheDocument();
	});
});
