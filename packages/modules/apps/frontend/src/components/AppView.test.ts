import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';

import { getApp } from '../apps.api';
import AppView from './AppView.vue';

vi.mock('../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const app = (id: string): AppResponse => ({
	id,
	projectId: 'project-1',
	name: `App ${id}`,
	namespace: `app-${id}`,
	visibility: 'public',
	draftVersionId: null,
	publishedVersionId: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const renderComponent = createComponentRenderer(AppView, {
	props: { projectId: 'project-1', appId: 'app-1' },
	global: {
		stubs: {
			RouterLink: { props: ['to'], template: '<a :data-to="to.name"><slot /></a>' },
			AppActions: {
				props: ['app'],
				emits: ['deleted'],
				template:
					'<button data-test-id="app-actions" @click="$emit(\'deleted\', app.id)">Delete</button>',
			},
		},
	},
});

describe('AppView', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('shows the app after it loads', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByText, getByTestId } = renderComponent();

		expect(getByTestId('app-view-loading')).toBeInTheDocument();
		expect(await findByTestId('app-view-name')).toHaveTextContent('App app-1');
		expect(getByText('app-app-1 | Public')).toBeInTheDocument();
		expect(getByTestId('app-view-preview')).toBeInTheDocument();
		expect(getApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('shows the not-found state without an error toast for a missing app', async () => {
		vi.mocked(getApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-view-not-found')).toBeInTheDocument();
		expect(showError).not.toHaveBeenCalled();
	});

	it('shows an error toast and the not-found state when loading fails', async () => {
		vi.mocked(getApp).mockRejectedValue(new Error('Network error'));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-view-not-found')).toBeInTheDocument();
		expect(showError).toHaveBeenCalled();
	});

	it('ignores a response for an app that is no longer shown', async () => {
		let resolveFirst: (value: AppResponse) => void = () => {};
		vi.mocked(getApp)
			.mockImplementationOnce(async () => await new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(app('app-2'));
		const { findByTestId, getByTestId, rerender } = renderComponent();

		await rerender({ projectId: 'project-1', appId: 'app-2' });
		expect(await findByTestId('app-view-name')).toHaveTextContent('App app-2');
		resolveFirst(app('app-1'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByTestId('app-view-name')).toHaveTextContent('App app-2');
	});

	it('emits deleted when the app is deleted', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('app-actions'));

		expect(emitted('deleted')).toEqual([['app-1']]);
	});

	it('links back to the apps list of the project', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { getByTestId } = renderComponent();

		expect(getByTestId('app-view-back')).toHaveAttribute('data-to', 'ProjectApps');
	});
});
