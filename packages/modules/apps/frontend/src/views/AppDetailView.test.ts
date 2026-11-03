import type { AppResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { flushPromises } from '@vue/test-utils';
import { computed, ref } from 'vue';

import { getApp } from '../apps.api';
import AppDetailView from './AppDetailView.vue';

vi.mock('../apps.api');

const { currentRoute, openApp, replace } = vi.hoisted(() => ({
	currentRoute: {
		value: { params: { projectId: 'project-1', appId: 'app-1' }, query: {} } as {
			name?: string;
			params: Record<string, string>;
			query: Record<string, string>;
		},
	},
	openApp: vi.fn(),
	replace: vi.fn(),
}));
const isAvailable = ref(true);
const available = computed(() => isAvailable.value);

vi.mock('vue-router', () => ({
	useRoute: () => currentRoute.value,
	useRouter: () => ({ currentRoute, push: vi.fn(), replace }),
}));

const renderComponent = createComponentRenderer(AppDetailView, {
	global: {
		stubs: {
			AppView: {
				template: '<div data-test-id="app-view" />',
			},
		},
	},
});
const app: AppResponse = {
	id: 'app-1',
	projectId: 'project-1',
	name: 'Test app',
	namespace: 'test-app',
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

describe('AppDetailView', () => {
	beforeEach(() => {
		currentRoute.value = { params: { projectId: 'project-1', appId: 'app-1' }, query: {} };
		isAvailable.value = true;
		vi.mocked(getApp).mockResolvedValue(app);
		openApp.mockResolvedValue(true);
		capabilityRegistry.provide(capabilities.createAppAssistantHandoff, () => ({
			available,
			openApp,
			createApp: vi.fn(),
		}));
	});

	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('opens an existing App in Assistant', async () => {
		renderComponent();

		await vi.waitFor(() =>
			expect(openApp).toHaveBeenCalledWith({ appId: 'app-1', projectId: 'project-1' }),
		);
		expect(getApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('returns to the Apps list when the App does not exist', async () => {
		vi.mocked(getApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		renderComponent();

		await vi.waitFor(() =>
			expect(replace).toHaveBeenCalledWith({
				name: 'ProjectApps',
				params: { projectId: 'project-1' },
			}),
		);
		expect(openApp).not.toHaveBeenCalled();
	});

	it('does not open the App after the user leaves while validation is pending', async () => {
		const loading = Promise.withResolvers<AppResponse>();
		vi.mocked(getApp).mockReturnValue(loading.promise);
		renderComponent();
		currentRoute.value = { name: 'ProjectApps', params: { projectId: 'project-1' }, query: {} };

		loading.resolve(app);
		await flushPromises();

		expect(openApp).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	it('shows the App editor when Assistant is unavailable', async () => {
		isAvailable.value = false;
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-view')).toBeInTheDocument();
		expect(openApp).not.toHaveBeenCalled();
	});

	it('shows the App editor when Assistant cannot open', async () => {
		openApp.mockResolvedValue(false);
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-view')).toBeInTheDocument();
		expect(replace).not.toHaveBeenCalled();
	});
});
