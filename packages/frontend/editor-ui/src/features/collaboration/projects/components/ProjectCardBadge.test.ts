import { createComponentRenderer } from '@/__tests__/render';
import ProjectCardBadge from './ProjectCardBadge.vue';
import type { WorkflowResource } from '@/Interface';
import type { Project } from '../projects.types';
import { ResourceType } from '../projects.utils';
import { truncate } from '@n8n/utils/string/truncate';

const renderComponent = createComponentRenderer(ProjectCardBadge, {
	global: {
		stubs: {
			RouterLink: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('ProjectCardBadge', () => {
	it('should show "Personal" badge if there is no homeProject', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {} as WorkflowResource,
				personalProject: {} as Project,
			},
		});

		expect(getByText('Personal')).toBeVisible();
	});

	it('should show "Personal" badge if homeProject ID equals personalProject ID', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {
					homeProject: {
						id: '1',
						name: 'John',
					},
				} as WorkflowResource,
				resourceType: ResourceType.Workflow,
				personalProject: {
					id: '1',
				} as Project,
			},
		});

		expect(getByText('Personal')).toBeVisible();
	});

	it('should show shared with count', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {
					sharedWithProjects: [{}, {}, {}],
					homeProject: {
						id: '1',
						name: 'John',
					},
				} as WorkflowResource,
				resourceType: ResourceType.Workflow,
				personalProject: {
					id: '1',
				} as Project,
			},
		});

		expect(getByText('+3')).toBeVisible();
	});

	test.each([
		['First Last <email@domain.com>', 'First Last'],
		['First Last Third <email@domain.com>', 'First Last Third'],
		['First Last Third Fourth <email@domain.com>', 'First Last Third Fourth'],
		['<email@domain.com>', 'email@domain.com'],
		[' <email@domain.com>', 'email@domain.com'],
		['My project', 'My project'],
		['MyProject', 'MyProject'],
	])('should show the correct owner badge for project name: "%s"', (name, result) => {
		const { getByText } = renderComponent({
			props: {
				resource: {
					homeProject: {
						id: '1',
						name,
					},
				} as WorkflowResource,
				resourceType: ResourceType.Workflow,
				personalProject: {
					id: '2',
				} as Project,
			},
		});
		expect(getByText(truncate(result, 20))).toBeVisible();
	});
});
