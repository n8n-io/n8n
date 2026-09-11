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
		hasUnpublishedChanges: false,
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

	it('saves the template defaults when the app has no theme yet', async () => {
		const app = makeApp();
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith('proj-1', 'app-1', {
			mode: 'system',
			primary: '#ff6900',
			radius: 4,
			density: 'comfortable',
			tone: 'neutral',
		});
	});

	it('starts from the app’s saved settings', async () => {
		const app = makeApp({
			theme: {
				mode: 'dark',
				vars: {},
				settings: {
					mode: 'dark',
					primary: '#4f46e5',
					radius: 8,
					density: 'compact',
					tone: 'tinted',
				},
			},
		});
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			expect.objectContaining({ mode: 'dark', primary: '#4f46e5', radius: 8, tone: 'tinted' }),
		);
	});

	it('sends the mode, radius, density and tone the user picks', async () => {
		const app = makeApp();
		appsStore.applyAppTheme.mockResolvedValue(app);
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('radio-button-dark'));
		await userEvent.click(getByTestId('radio-button-spacious'));
		await userEvent.click(getByTestId('radio-button-tinted'));
		await fireEvent.update(getByTestId('app-theme-radius'), '12');
		await userEvent.click(getByTestId('app-theme-save'));

		expect(appsStore.applyAppTheme).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			expect.objectContaining({ mode: 'dark', radius: 12, density: 'spacious', tone: 'tinted' }),
		);
	});

	it('shows a loading state while saving and a "publish next" toast after', async () => {
		let resolveApply: (app: App) => void = () => {};
		appsStore.applyAppTheme.mockReturnValue(new Promise((resolve) => (resolveApply = resolve)));
		const app = makeApp();
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		expect(getByTestId('app-theme-save')).toHaveAttribute('aria-disabled', 'true');

		resolveApply(makeApp({ hasUnpublishedChanges: true }));
		await vi.waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith({
				title: 'Theme saved',
				message: 'Publish to make it live.',
				type: 'success',
			}),
		);
		expect(getByTestId('app-theme-save')).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('emits the updated app on success', async () => {
		const app = makeApp();
		const updated = makeApp({ hasUnpublishedChanges: true });
		appsStore.applyAppTheme.mockResolvedValue(updated);
		const { getByTestId, emitted } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		await vi.waitFor(() => expect(emitted().saved).toBeTruthy());

		expect(emitted().saved[0]).toEqual([updated]);
	});

	it('shows an error toast without emitting when the save fails', async () => {
		const app = makeApp();
		const error = new Error('App "Greeter" has no source yet.');
		appsStore.applyAppTheme.mockRejectedValue(error);
		const { getByTestId, emitted } = renderEditor({ props: { projectId: 'proj-1', app } });

		await userEvent.click(getByTestId('app-theme-save'));
		await vi.waitFor(() =>
			expect(showError).toHaveBeenCalledWith(error, "Couldn't save the theme"),
		);

		expect(emitted().saved).toBeUndefined();
	});
});
