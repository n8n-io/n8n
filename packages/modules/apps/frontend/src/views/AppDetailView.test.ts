import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';

import AppDetailView from './AppDetailView.vue';

const { openApp, replace } = vi.hoisted(() => ({ openApp: vi.fn(), replace: vi.fn() }));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { projectId: 'project-1', appId: 'app-1' } }),
	useRouter: () => ({ replace }),
}));

const renderComponent = createComponentRenderer(AppDetailView);

describe('AppDetailView', () => {
	beforeEach(() => {
		openApp.mockResolvedValue(true);
		capabilityRegistry.provide(capabilities.createAppAssistantHandoff, () => ({
			openApp,
			createApp: vi.fn(),
		}));
	});

	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('opens the App in Assistant', () => {
		renderComponent();

		expect(openApp).toHaveBeenCalledWith({ appId: 'app-1', projectId: 'project-1' });
	});

	it('returns to the Apps list when Assistant cannot open', async () => {
		openApp.mockResolvedValue(false);
		renderComponent();
		await vi.waitFor(() =>
			expect(replace).toHaveBeenCalledWith({
				name: 'ProjectApps',
				params: { projectId: 'project-1' },
			}),
		);
	});
});
