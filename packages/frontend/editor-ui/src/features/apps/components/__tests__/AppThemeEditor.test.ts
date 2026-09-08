import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';

import AppThemeEditor from '../AppThemeEditor.vue';
import { useAppsStore } from '../../apps.store';
import type { App } from '../../apps.types';

const showError = vi.hoisted(() => vi.fn());
const showMessage = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

function makeApp(overrides: Partial<App> = {}): App {
	return {
		id: 'app-1',
		name: 'Greeter',
		namespace: 'greeter',
		theme: null,
		projectId: 'proj-1',
		activeVersionId: 'v-1',
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
		...overrides,
	};
}

const renderEditor = createComponentRenderer(AppThemeEditor);

describe('AppThemeEditor', () => {
	let appsStore: MockedStore<typeof useAppsStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		showError.mockReset();
		showMessage.mockReset();
	});

	it('saves the template defaults when nothing has been touched', async () => {
		const app = makeApp();
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith('proj-1', 'app-1', {
			mode: 'system',
			vars: { '--primary': '#18181b', '--radius': '10px' },
		});
	});

	it('starts from the app’s saved theme', async () => {
		const app = makeApp({
			theme: {
				mode: 'dark',
				vars: { '--primary': '#4f46e5', '--radius': '4px', '--font-sans': 'Geist, sans-serif' },
			},
		});
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith('proj-1', 'app-1', app.theme);
	});

	it('sends the mode and radius the user picks', async () => {
		const app = makeApp();
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('radio-button-dark'));
		await fireEvent.update(getByTestId('app-theme-radius'), '12');
		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			expect.objectContaining({
				mode: 'dark',
				vars: expect.objectContaining({ '--radius': '12px' }),
			}),
		);
	});

	it('shows a loading state while applying and a success toast after', async () => {
		let resolveApply: (app: App) => void = () => {};
		appsStore.applyAppTheme.mockReturnValue(new Promise((resolve) => (resolveApply = resolve)));
		const app = makeApp();
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		expect(getByTestId('app-theme-save')).toHaveAttribute('aria-disabled', 'true');

		resolveApply(makeApp({ activeVersionId: 'v-2' }));
		await vi.waitFor(() => expect(showMessage).toHaveBeenCalled());
		expect(getByTestId('app-theme-save')).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('emits the updated app on success', async () => {
		const app = makeApp();
		const updated = makeApp({ activeVersionId: 'v-2' });
		appsStore.applyAppTheme.mockResolvedValue(updated);
		const { getByTestId, emitted } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		await vi.waitFor(() => expect(emitted().applied).toBeTruthy());

		expect(emitted().applied[0]).toEqual([updated]);
	});

	it('shows an error toast without emitting when the build fails', async () => {
		const app = makeApp();
		const error = new Error('Build the app once before applying a theme.');
		appsStore.applyAppTheme.mockRejectedValue(error);
		const { getByTestId, emitted } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		await vi.waitFor(() => expect(showError).toHaveBeenCalledWith(error, 'Error applying theme'));

		expect(emitted().applied).toBeUndefined();
	});
});
