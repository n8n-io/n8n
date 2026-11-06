import type { PublicApiRateLimitSettingsResponse } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import ApiKeyRateLimitsSection from './ApiKeyRateLimitsSection.vue';
import { RATE_LIMIT_ROW_KEYS } from './rateLimits';

const getSettings = vi.fn();
const updateSettings = vi.fn();

vi.mock('@n8n/rest-api-client/api/public-api-rate-limit-settings', () => ({
	getPublicApiRateLimitSettings: (...args: unknown[]) => getSettings(...args),
	updatePublicApiRateLimitSettings: (...args: unknown[]) => updateSettings(...args),
}));

const showToast = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showToast, showError }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const defaults = {
	globalReadLimit: 1200,
	globalReadWindowSeconds: 60,
	globalWriteLimit: 600,
	globalWriteWindowSeconds: 60,
	endpointReadLimit: 1000,
	endpointReadWindowSeconds: 60,
	endpointWriteLimit: 500,
	endpointWriteWindowSeconds: 60,
};

const response = (
	overrides: Partial<PublicApiRateLimitSettingsResponse> = {},
): PublicApiRateLimitSettingsResponse => ({
	enabled: false,
	...defaults,
	defaults,
	envManagedFields: [],
	...overrides,
});

const { defaults: _defaults, envManagedFields: _envManagedFields, ...settingsOf } = response();

const pinia = createTestingPinia();
setActivePinia(pinia);
const settingsStore = mockedStore(useSettingsStore);

const renderSection = createComponentRenderer(ApiKeyRateLimitsSection, { pinia });

async function renderLoaded(overrides: Partial<PublicApiRateLimitSettingsResponse> = {}) {
	getSettings.mockResolvedValue(response(overrides));
	const result = renderSection();
	await waitFor(() => expect(result.getByTestId('rate-limits-toggle')).toBeInTheDocument());
	return result;
}

const limitInput = (row: string) =>
	screen.getByTestId<HTMLInputElement>(`rate-limits-limit-${row}`);

async function clearAllLimits() {
	for (const row of RATE_LIMIT_ROW_KEYS) {
		await userEvent.clear(limitInput(row));
	}
}

describe('ApiKeyRateLimitsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.isPublicApiEnabled = true;
		updateSettings.mockImplementation(async (_context, data) => response(data));
	});

	describe('the section', () => {
		it('names the section after the Public API', async () => {
			const { getByText } = await renderLoaded();

			expect(getByText('Public API Limits')).toBeInTheDocument();
		});

		it('names the toggle after its row', async () => {
			const { getByRole } = await renderLoaded();

			expect(getByRole('switch', { name: 'Enable API key rate limits' })).toBeInTheDocument();
		});

		it('does not show the limits while rate limiting is off', async () => {
			const { queryByTestId } = await renderLoaded();

			expect(queryByTestId('rate-limits-summary-allEndpoints')).not.toBeInTheDocument();
		});

		it('shows the limits while rate limiting is on', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true, endpointWriteLimit: 0 });

			expect(getByTestId('rate-limits-summary-allEndpoints')).toHaveTextContent(
				'1,200 reads · 600 writes / 60 seconds',
			);
			expect(getByTestId('rate-limits-summary-individualEndpoints')).toHaveTextContent(
				'1,000 reads / 60 seconds · no limit on writes',
			);
		});

		it('turns rate limiting off with the toggle and keeps the limits', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true });

			await userEvent.click(getByTestId('rate-limits-toggle'));

			await waitFor(() =>
				expect(updateSettings).toHaveBeenCalledWith({}, { ...settingsOf, enabled: false }),
			);
		});

		it('hides the section and shows an error when the settings cannot be loaded', async () => {
			getSettings.mockRejectedValue(new Error('boom'));
			const { queryByTestId } = renderSection();

			await waitFor(() => expect(showError).toHaveBeenCalled());
			expect(queryByTestId('rate-limits-section')).not.toBeInTheDocument();
		});

		it('shows an error when the settings cannot be saved', async () => {
			updateSettings.mockRejectedValue(new Error('boom'));
			const { getByTestId } = await renderLoaded({ enabled: true });

			await userEvent.click(getByTestId('rate-limits-toggle'));

			await waitFor(() => expect(showError).toHaveBeenCalled());
			expect(getByTestId('rate-limits-summary-allEndpoints')).toBeInTheDocument();
		});
	});

	describe('the dialog', () => {
		it('describes the limits in the dialog', async () => {
			const { getByTestId } = await renderLoaded();

			await userEvent.click(getByTestId('rate-limits-toggle'));

			expect(
				screen.getByText(
					'Limits how many Public API requests each API key can make. Requests over the limit get a 429 response until it resets.',
				),
			).toBeInTheDocument();
		});

		it('names each limit and window input after its group and kind', async () => {
			const { getByTestId } = await renderLoaded();

			await userEvent.click(getByTestId('rate-limits-toggle'));

			expect(limitInput('endpointWrite')).toHaveAccessibleName('Individual endpoints: Write limit');
			expect(screen.getByTestId('rate-limits-window-globalRead')).toHaveAccessibleName(
				'All endpoints: Read window in seconds',
			);
		});

		it('opens the dialog with the stored values and turns rate limiting on when saved', async () => {
			const { getByTestId } = await renderLoaded();

			await userEvent.click(getByTestId('rate-limits-toggle'));

			expect(limitInput('globalRead').value).toBe('1200');
			await userEvent.click(screen.getByTestId('rate-limits-save'));

			await waitFor(() =>
				expect(updateSettings).toHaveBeenCalledWith({}, { ...settingsOf, enabled: true }),
			);
			expect(getByTestId('rate-limits-summary-allEndpoints')).toBeInTheDocument();
		});

		it('keeps rate limiting off when the dialog is cancelled', async () => {
			const { getByTestId, queryByTestId } = await renderLoaded();

			await userEvent.click(getByTestId('rate-limits-toggle'));
			await userEvent.click(screen.getByTestId('rate-limits-cancel'));

			expect(updateSettings).not.toHaveBeenCalled();
			expect(queryByTestId('rate-limits-summary-allEndpoints')).not.toBeInTheDocument();
		});

		it('does not turn rate limiting on while no limit is set', async () => {
			const { getByTestId } = await renderLoaded();

			await userEvent.click(getByTestId('rate-limits-toggle'));
			await clearAllLimits();

			expect(screen.getByTestId('rate-limits-save')).toBeDisabled();
		});

		it('turns rate limiting off when every limit is cleared in the edit dialog', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true });

			await userEvent.click(getByTestId('rate-limits-edit'));
			await clearAllLimits();
			const save = screen.getByTestId('rate-limits-save');
			expect(save).toHaveTextContent('Disable limits');
			await userEvent.click(save);

			await waitFor(() =>
				expect(updateSettings).toHaveBeenCalledWith(
					{},
					{
						...settingsOf,
						enabled: false,
						globalReadLimit: 0,
						globalWriteLimit: 0,
						endpointReadLimit: 0,
						endpointWriteLimit: 0,
					},
				),
			);
		});

		it('shows an error for an invalid limit and does not save', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true });

			await userEvent.click(getByTestId('rate-limits-edit'));
			await userEvent.clear(limitInput('globalRead'));
			await userEvent.type(limitInput('globalRead'), 'abc');
			await userEvent.tab();
			await userEvent.click(screen.getByTestId('rate-limits-save'));

			expect(screen.getByTestId('rate-limits-error-globalRead')).toHaveTextContent(
				'Enter a whole number, 1 or more.',
			);
			expect(screen.getByText('Fix the highlighted fields.')).toBeInTheDocument();
			expect(updateSettings).not.toHaveBeenCalled();
		});

		it('warns when a per-endpoint limit is above the all-endpoints limit', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true });

			await userEvent.click(getByTestId('rate-limits-edit'));
			await userEvent.clear(limitInput('endpointRead'));
			await userEvent.type(limitInput('endpointRead'), '5000');

			expect(screen.getByTestId('rate-limits-warning-endpointRead')).toHaveTextContent(
				'Higher than the all-endpoints limit, so it never applies.',
			);
		});
	});

	describe('environment variables', () => {
		it('locks a field that an environment variable sets', async () => {
			const { getByTestId } = await renderLoaded({
				enabled: true,
				envManagedFields: ['enabled', 'globalReadLimit'],
			});

			expect(getByTestId('rate-limits-toggle')).toBeDisabled();
			await userEvent.click(getByTestId('rate-limits-edit'));
			expect(limitInput('globalRead')).toBeDisabled();
			expect(limitInput('globalWrite')).not.toBeDisabled();
		});

		it('does not offer to turn rate limiting off when an environment variable turns it on', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true, envManagedFields: ['enabled'] });

			await userEvent.click(getByTestId('rate-limits-edit'));
			await clearAllLimits();

			const save = screen.getByTestId('rate-limits-save');
			expect(save).not.toHaveTextContent('Disable limits');
			expect(save).toBeDisabled();
		});

		it('resets the editable field of a row whose other field is locked', async () => {
			const { getByTestId } = await renderLoaded({
				enabled: true,
				globalReadWindowSeconds: 30,
				envManagedFields: ['globalReadWindowSeconds'],
			});

			await userEvent.click(getByTestId('rate-limits-edit'));
			await userEvent.clear(limitInput('globalRead'));
			await userEvent.type(limitInput('globalRead'), '5');
			const reset = screen.getByTestId('rate-limits-reset-globalRead');
			expect(reset).toHaveAccessibleName('Reset to default: 1,200 / 30 s');
			await userEvent.click(reset);

			expect(limitInput('globalRead').value).toBe('1200');
			expect(screen.getByTestId<HTMLInputElement>('rate-limits-window-globalRead').value).toBe(
				'30',
			);
		});

		it('explains how to change the limits when an environment variable turns them on', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true, envManagedFields: ['enabled'] });

			await userEvent.hover(getByTestId('rate-limits-toggle').parentElement!);

			expect(
				await screen.findByText(
					'These limits are set through an environment variable. To change them or turn them off, edit the variable.',
				),
			).toBeInTheDocument();
		});

		it('explains how to change a limit that an environment variable sets', async () => {
			const { getByTestId } = await renderLoaded({
				enabled: true,
				envManagedFields: ['globalReadLimit'],
			});

			await userEvent.click(getByTestId('rate-limits-edit'));
			await userEvent.hover(limitInput('globalRead').parentElement!);

			expect(
				await screen.findByText(
					'This limit is set by an environment variable. To change it, edit the variable.',
				),
			).toBeInTheDocument();
		});
	});

	describe('API keys turned off', () => {
		beforeEach(() => {
			settingsStore.isPublicApiEnabled = false;
		});

		it('locks the toggle and the edit button', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true });

			expect(getByTestId('rate-limits-toggle')).toBeDisabled();
			expect(getByTestId('rate-limits-edit')).toBeDisabled();
		});

		it('explains that the limits do not apply', async () => {
			const { getByTestId } = await renderLoaded({ enabled: true, envManagedFields: ['enabled'] });

			await userEvent.hover(getByTestId('rate-limits-toggle').parentElement!);

			expect(
				await screen.findByText(
					'API keys are turned off on this instance, so these limits do not apply.',
				),
			).toBeInTheDocument();
		});
	});
});
