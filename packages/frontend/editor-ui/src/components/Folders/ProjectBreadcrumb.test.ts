import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import ProjectBreadcrumb from './ProjectBreadcrumb.vue';
import { ProjectTypes } from '@/types/projects.types';
import type { Project } from '@vue-flow/core';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: vi.fn((key) => {
			if (key === 'projects.menu.personal') return 'Personal';
			return key;
		}),
	}),
}));

const mockComponents = {
	'n8n-link': {
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
				currentProject: {
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				} satisfies Partial<Project>,
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'user');
		expect(getByTestId('project-label')).toHaveTextContent('Personal');
	});

	it('Renders team project info correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentProject: {
					id: '1',
					name: 'Team Project',
					type: ProjectTypes.Team,
					icon: { type: 'icon', value: 'folder' },
				} satisfies Partial<Project>,
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', 'folder');
		expect(getByTestId('project-label')).toHaveTextContent('Team Project');
	});

	it('Renders team project emoji icon correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentProject: {
					id: '1',
					name: 'Team Project',
					type: ProjectTypes.Team,
					icon: { type: 'emoji', value: '🔥' },
				} satisfies Partial<Project>,
			},
		});
		expect(getByTestId('project-icon')).toHaveAttribute('data-icon', '🔥');
		expect(getByTestId('project-label')).toHaveTextContent('Team Project');
	});

	it('emits hover event', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				currentProject: {
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				} satisfies Partial<Project>,
			},
		});
		await fireEvent.mouseEnter(getByTestId('home-project'));
		expect(emitted('projectHover')).toBeTruthy();
	});

	it('emits project drop event if dragging', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				isDragging: true,
				currentProject: {
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				} satisfies Partial<Project>,
			},
		});
		await fireEvent.mouseUp(getByTestId('home-project'));
		expect(emitted('projectDrop')).toBeTruthy();
	});

	it('does not emit project drop event if not dragging', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				isDragging: false,
				currentProject: {
					id: '1',
					name: 'Test Project',
					type: ProjectTypes.Personal,
				} satisfies Partial<Project>,
			},
		});
		await fireEvent.mouseUp(getByTestId('home-project'));
		expect(emitted('projectDrop')).toBeFalsy();
	});
});
