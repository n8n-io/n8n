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
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const renderComponent = createComponentRenderer(AppView, {
	props: { projectId: 'project-1', appId: 'app-1' },
	global: {
		stubs: {
			AppHeader: {
				props: ['projectId', 'app', 'tab'],
				emits: ['deleted', 'update:tab'],
				template: `<div>
					<button data-test-id="app-header" @click="$emit('deleted', app?.id)">{{ app?.name }}</button>
					<button data-test-id="configure" @click="$emit('update:tab', 'configure')" />
				</div>`,
			},
			AppPreview: {
				props: ['projectId', 'app'],
				template: '<div data-test-id="app-view-preview">{{ app.id }}</div>',
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
		const { findByTestId, getByTestId } = renderComponent();

		expect(getByTestId('app-view-loading')).toBeInTheDocument();
		expect(await findByTestId('app-view-preview')).toBeInTheDocument();
		expect(getByTestId('app-header')).toHaveTextContent('App app-1');
		expect(getByTestId('app-view-preview')).toBeInTheDocument();
		expect(getApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('shows the not-found state without an error toast for a missing app', async () => {
		vi.mocked(getApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('app-view-not-found')).toBeInTheDocument();
		expect(queryByTestId('app-header')).not.toBeInTheDocument();
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
		await findByTestId('app-view-preview');
		expect(getByTestId('app-header')).toHaveTextContent('App app-2');
		resolveFirst(app('app-1'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByTestId('app-header')).toHaveTextContent('App app-2');
	});

	it('does not show the previous app while the next app loads', async () => {
		vi.mocked(getApp)
			.mockResolvedValueOnce(app('app-1'))
			.mockReturnValueOnce(new Promise(() => {}));
		const { findByTestId, getByTestId, rerender } = renderComponent();
		await findByTestId('app-view-preview');

		await rerender({ projectId: 'project-1', appId: 'app-2' });

		expect(getByTestId('app-header')).toHaveTextContent('');
		expect(getByTestId('app-view-loading')).toBeInTheDocument();
	});

	it('emits deleted when the app is deleted', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await findByTestId('app-view-preview');
		await userEvent.click(getByTestId('app-header'));

		expect(emitted('deleted')).toEqual([['app-1']]);
	});

	it('switches between the preview and configure tabs', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();
		expect(await findByTestId('app-view-preview')).toBeInTheDocument();

		await userEvent.click(getByTestId('configure'));

		expect(await findByTestId('app-view-configure')).toBeInTheDocument();
		expect(queryByTestId('app-view-preview')).not.toBeInTheDocument();
	});

	it('opens the configure tab for a configure section with a sub-tab', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId } = renderComponent({ props: { section: 'configure.authentication' } });

		expect(await findByTestId('app-view-configure')).toBeInTheDocument();
	});

	it('emits the section when the tab changes', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, emitted } = renderComponent();
		await findByTestId('app-view-preview');

		await userEvent.click(getByTestId('configure'));

		expect(emitted('update:section')).toEqual([['configure']]);
	});
});
