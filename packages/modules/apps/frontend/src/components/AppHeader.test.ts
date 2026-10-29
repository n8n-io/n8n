import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { getProject, type Project } from '@n8n/rest-api-client/api/projects';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { listApps } from '../apps.api';
import AppHeader from './AppHeader.vue';

vi.mock('@n8n/rest-api-client/api/projects', () => ({ getProject: vi.fn() }));
vi.mock('../apps.api');
const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push, resolve: () => ({ href: '/projects/project-1/apps' }) }),
}));

const app: AppResponse = {
	id: 'app-1',
	projectId: 'project-1',
	name: 'Expense tracker',
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

const project = (overrides: Partial<Project>) => ({ id: 'project-1', ...overrides }) as Project;

const renderComponent = createComponentRenderer(AppHeader, {
	props: { projectId: 'project-1', app, tab: 'preview' },
	global: {
		stubs: {
			N8nBreadcrumbs: {
				props: ['items'],
				template:
					'<nav><span v-for="item in items" :key="item.id" data-test-id="breadcrumb">{{ item.label }}</span><slot name="append" /></nav>',
			},
			DropdownMenu: {
				props: ['items'],
				emits: ['select'],
				template: `<div>
					<slot name="trigger" />
					<button
						v-for="item in items"
						:key="item.id"
						data-test-id="switcher-option"
						:disabled="item.disabled"
						@click="$emit('select', item.id)"
					>{{ item.label }}</button>
				</div>`,
			},
			AppActions: {
				props: ['app'],
				emits: ['deleted'],
				template:
					'<button data-test-id="app-actions" @click="$emit(\'deleted\', app.id)">Delete</button>',
			},
		},
	},
});

describe('AppHeader', () => {
	beforeEach(() => {
		vi.mocked(listApps).mockResolvedValue({ data: [app], count: 1 });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('shows the team project name and the app name', async () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('breadcrumb')).toHaveTextContent('Marketing'));
		expect(getByTestId('app-header-name')).toHaveTextContent('Expense tracker');
	});

	it('shows "Personal" for a personal project', async () => {
		vi.mocked(getProject).mockResolvedValue(
			project({ type: 'personal', name: 'Jane Doe <jane@n8n.io>' }),
		);
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('breadcrumb')).toHaveTextContent('Personal'));
	});

	it('falls back to a generic label when the project cannot be loaded', async () => {
		vi.mocked(getProject).mockRejectedValue(new Error('Forbidden'));
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getProject).toHaveBeenCalled());
		expect(getByTestId('breadcrumb')).toHaveTextContent('Project');
	});

	it('shows a disabled publish button', () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		const { getByTestId } = renderComponent();

		expect(getByTestId('app-header-publish')).toBeDisabled();
	});

	it('switches to the configure view', async () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		const { getByText, emitted } = renderComponent();

		await userEvent.click(getByText('Configure'));

		expect(emitted('update:tab')).toEqual([['configure']]);
	});

	it('lists the other apps of the project in the switcher and opens the selected one', async () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		vi.mocked(listApps).mockResolvedValue({
			data: [app, { ...app, id: 'app-2', name: 'Booking tool' }],
			count: 2,
		});
		const { findByText, getAllByTestId } = renderComponent();

		await userEvent.click(await findByText('Booking tool'));

		expect(getAllByTestId('switcher-option').map((option) => option.textContent)).toEqual([
			'Booking tool',
		]);

		expect(push).toHaveBeenCalledWith({
			name: 'AppDetailView',
			params: { projectId: 'project-1', appId: 'app-2' },
		});
	});

	it('shows a disabled option when the project has no other apps', async () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		const { findByText } = renderComponent();

		expect(await findByText('No other apps')).toBeDisabled();
	});

	it('passes a delete on', async () => {
		vi.mocked(getProject).mockResolvedValue(project({ type: 'team', name: 'Marketing' }));
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('app-actions'));

		expect(emitted('deleted')).toEqual([['app-1']]);
	});
});
