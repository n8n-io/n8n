import { createComponentRenderer } from '@/__tests__/render';
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';
import { truncate } from '@n8n/utils/string/truncate';
import { createTestingPinia } from '@pinia/testing';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ProjectCardBadge);

describe('ProjectCardBadge', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should show "Personal" badge if there is no homeProject', () => {
		const { getByText } = renderComponent({
			props: {
				resource: {},
				personalProject: {},
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
				},
				resourceType: 'workflow',
				personalProject: {
					id: '1',
				},
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
				},
				resourceType: 'workflow',
				personalProject: {
					id: '1',
				},
			},
		});

		expect(getByText('+3')).toBeVisible();
	});

	it('should not show breadcrumbs for credentials', () => {
		const { queryByTestId } = renderComponent({
			props: {
				resourceType: 'credential',
				resourceTypeLabel: 'Credential',
				personalProject: {
					id: '1',
				},
				resource: {
					id: '1',
					name: 'Test Credential',
					resourceType: 'credential',
					value: '',
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
					homeProject: {
						id: '1',
						name: 'John',
					},
					sharedWithProjects: [],
					readOnly: false,
					needsSetup: false,
					type: 'testApi',
				},
			},
		});
		expect(queryByTestId('workflow-card-breadcrumbs')).not.toBeInTheDocument();
	});

	it('should show breadcrumbs for workflows', () => {
		const { getByTestId } = renderComponent({
			props: {
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				personalProject: {
					id: '1',
					name: 'John',
				},
				resource: {
					id: '1',
					resourceType: 'workflow',
					name: 'Test Workflow',
					value: '',
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
					homeProject: {
						id: '1',
						name: 'John',
					},
					sharedWithProjects: [],
					parentFolder: {
						id: '1',
						name: 'Test Folder',
					},
				},
			},
		});
		expect(getByTestId('workflow-card-breadcrumbs')).toBeInTheDocument();
		expect(getByTestId('breadcrumbs-item-current')).toBeInTheDocument();
		expect(getByTestId('breadcrumbs-item-current')).toHaveTextContent('Test Folder');
	});

	it('should not show breadcrumbs if `hideBreadcrumbs` prop is true', () => {
		const { queryByTestId } = renderComponent({
			props: {
				hideBreadcrumbs: true,
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				personalProject: {
					id: '1',
					name: 'John',
				},
				resource: {
					id: '1',
					resourceType: 'workflow',
					name: 'Test Workflow',
					value: '',
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),

					homeProject: {
						id: '1',
						name: 'John',
					},
					sharedWithProjects: [],
					parentFolder: {
						id: '1',
						name: 'Test Folder',
					},
					hideBreadcrumbs: true,
				},
			},
		});
		expect(queryByTestId('workflow-card-breadcrumbs')).not.toBeInTheDocument();
	});

	it('should not show breadcrumbs for other users personal projects', () => {
		const { queryByTestId } = renderComponent({
			props: {
				hideBreadcrumbs: true,
				resourceType: 'workflow',
				resourceTypeLabel: 'Workflow',
				personalProject: {
					id: '1',
					name: 'John',
				},
				resource: {
					id: '1',
					resourceType: 'workflow',
					name: 'Test Workflow',
					value: '',
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),

					homeProject: {
						id: '1',
						name: 'John',
					},
					sharedWithProjects: [],
					parentFolder: {
						id: '1',
						name: 'Test Folder',
					},
					hideBreadcrumbs: true,
				},
			},
		});
		expect(queryByTestId('workflow-card-breadcrumbs')).not.toBeInTheDocument();
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
				},
				resourceType: 'workflow',
				personalProject: {
					id: '2',
				},
			},
		});
		expect(getByText(truncate(result, 20))).toBeVisible();
	});
});
