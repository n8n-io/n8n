import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import ProjectBreadcrumb from './ProjectBreadcrumb.vue';
import { ProjectTypes } from '@/features/projects/projects.types';
import { createTestProject } from '@/features/projects/__tests__/utils';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: vi.fn((key) => {
			if (key === 'projects.menu.personal') return 'Personal';
			if (key === 'projects.menu.shared') return 'Shared with you';
			return key;
		}),
	}),
}));

const mockComponents = {
	N8nLink: {
		template: '<a :href="to"><slot /></a>',
		props: ['to'],
	},
	ProjectIcon: {
		template:
			'<div class="project-icon" data-test-id="project-icon" :data-icon="icon.value"><slot /></div>',
		props: ['icon', 'borderLess', 'size', 'title'],
	},
	N8nText: {
		template: '<span class="n8n-text" data-test-id="project-label"><slot /></span>',
		props: ['size', 'color'],
	},
};

const renderComponent = createComponentRenderer(ProjectBreadcrumb, {
	global: {
		stubs: mockComponents,
	},
});

describe('ProjectBreadcrumb', () => {
	it('Renders personal project info correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentProject: createTestProject({
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				}),
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'user');
		expect(getByTestId('project-label')).toHaveTextContent('Personal');
	});

	it('Renders team project info correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentProject: createTestProject({
					id: '1',
					name: 'Team Project',
					type: ProjectTypes.Team,
					icon: { type: 'icon', value: 'folder' },
				}),
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'folder');
		expect(getByTestId('project-label')).toHaveTextContent('Team Project');
	});

	it('Renders team project emoji icon correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentProject: createTestProject({
					id: '1',
					name: 'Team Project',
					type: ProjectTypes.Team,
					icon: { type: 'emoji', value: '🔥' },
				}),
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', '🔥');
		expect(getByTestId('project-label')).toHaveTextContent('Team Project');
	});

	it('emits hover event', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				currentProject: createTestProject({
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				}),
			},
		});
		await fireEvent.mouseEnter(getByTestId('home-project'));
		expect(emitted('projectHover')).toBeTruthy();
	});

	it('emits project drop event if dragging', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				isDragging: true,
				currentProject: createTestProject({
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				}),
			},
		});
		await fireEvent.mouseUp(getByTestId('home-project'));
		expect(emitted('projectDrop')).toBeTruthy();
	});

	it('does not emit project drop event if not dragging', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				isDragging: false,
				currentProject: createTestProject({
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				}),
			},
		});
		await fireEvent.mouseUp(getByTestId('home-project'));
		expect(emitted('projectDrop')).toBeFalsy();
	});

	describe('Shared context', () => {
		it('renders shared project with share icon when isShared is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					isShared: true,
				},
			});
			expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'share');
			expect(getByTestId('project-label')).toHaveTextContent('Shared with you');
		});

		it('renders shared project even with currentProject provided when isShared is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					isShared: true,
					currentProject: createTestProject({
						id: '1',
						name: 'Some Project',
						type: ProjectTypes.Personal,
					}),
				},
			});
			expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'share');
			expect(getByTestId('project-label')).toHaveTextContent('Shared with you');
		});

		it('generates correct link for shared project', () => {
			const { container } = renderComponent({
				props: {
					isShared: true,
				},
			});
			const link = container.querySelector('a');
			expect(link).toHaveAttribute('href', '/shared');
		});

		it('generates project link when not shared and currentProject exists', () => {
			const { container } = renderComponent({
				props: {
					isShared: false,
					currentProject: createTestProject({
						id: 'project-123',
						name: 'My Project',
						type: ProjectTypes.Team,
					}),
				},
			});
			const link = container.querySelector('a');
			expect(link).toHaveAttribute('href', '/projects/project-123');
		});

		it('generates home link when not shared and no currentProject', () => {
			const { container } = renderComponent({
				props: {
					isShared: false,
				},
			});
			const link = container.querySelector('a');
			expect(link).toHaveAttribute('href', '/home');
		});
	});
});
