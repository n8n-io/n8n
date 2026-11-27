import type { PromotionSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import type * as PromotionsApi from '../promotions.api';
import PromotionSettingsRows from './PromotionSettingsRows.vue';

const api = vi.hoisted(() => ({
	getPromotionSettings: vi.fn<typeof PromotionsApi.getPromotionSettings>(),
	updatePromotionSettings: vi.fn<typeof PromotionsApi.updatePromotionSettings>(),
}));
vi.mock('../promotions.api', () => api);

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

const stored: PromotionSettings = {
	whoCanPromote: 'instanceAdmins',
	whoCanApprove: 'instanceAdmins',
	whoCanApply: 'instanceAdmins',
	requireApproval: 'whenConfigured',
};

const renderRows = createComponentRenderer(PromotionSettingsRows, {
	props: { settings: ['whoCanPromote'] },
});

async function choose(option: string, name = 'Who can promote') {
	const select = screen.getByRole('combobox', { name });
	// N8nSelect2 marks a disabled trigger with `data-disabled`, not the `disabled` attribute.
	await waitFor(() => expect(select).not.toHaveAttribute('data-disabled'));
	await userEvent.click(select);
	await userEvent.click(await screen.findByRole('option', { name: option }));
	return select;
}

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	api.getPromotionSettings.mockResolvedValue(stored);
});

it.each([
	{
		setting: 'whoCanPromote',
		name: 'Who can promote',
		option: 'Project admins',
		change: { whoCanPromote: 'projectAdmins' },
	},
	{
		setting: 'requireApproval',
		name: 'Require approval',
		option: 'Always required',
		change: { requireApproval: 'alwaysRequired' },
	},
] as const)(
	'saves the chosen option of $setting and keeps it selected',
	async ({ setting, name, option, change }) => {
		api.updatePromotionSettings.mockResolvedValue({ ...stored, ...change });
		renderRows({ props: { settings: [setting] } });

		const select = await choose(option, name);

		// Only the changed setting, so a newer value of another setting stays.
		expect(api.updatePromotionSettings).toHaveBeenCalledWith(expect.anything(), change);
		await waitFor(() => expect(select).toHaveTextContent(new RegExp(`^${option}$`)));
		expect(showMessage).toHaveBeenCalled();
	},
);

it('keeps the selects disabled when the settings cannot load', async () => {
	api.getPromotionSettings.mockRejectedValue(new Error('Request failed'));
	renderRows();

	await waitFor(() =>
		expect(showError).toHaveBeenCalledWith(
			expect.any(Error),
			"Couldn't load project access settings",
			expect.anything(),
		),
	);
	expect(screen.getByRole('combobox', { name: 'Who can promote' })).toHaveAttribute(
		'data-disabled',
	);
});

it('puts the previous option back when saving fails', async () => {
	api.updatePromotionSettings.mockRejectedValue(new Error('Request failed'));
	renderRows();

	const select = await choose('Project admins and editors');

	await waitFor(() => expect(select).toHaveTextContent(/^Instance owners and admins$/));
	expect(showError).toHaveBeenCalledWith(
		expect.any(Error),
		"Couldn't save project access settings",
		expect.anything(),
	);
});
