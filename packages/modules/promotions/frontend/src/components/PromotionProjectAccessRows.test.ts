import type { PromotionSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import type * as PromotionsApi from '../promotions.api';
import PromotionProjectAccessRows from './PromotionProjectAccessRows.vue';

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
};

const renderRows = createComponentRenderer(PromotionProjectAccessRows, {
	props: { settings: ['whoCanPromote'] },
});

async function choose(option: string) {
	const select = screen.getByRole('combobox', { name: 'Who can promote' });
	await waitFor(() => expect(select).toBeEnabled());
	await userEvent.click(select);
	await userEvent.click(await screen.findByRole('option', { name: option }));
	return select;
}

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	api.getPromotionSettings.mockResolvedValue(stored);
});

it('saves the chosen option and keeps it selected', async () => {
	api.updatePromotionSettings.mockResolvedValue({ ...stored, whoCanPromote: 'projectAdmins' });
	renderRows();

	const select = await choose('Project admins');

	expect(api.updatePromotionSettings).toHaveBeenCalledWith(expect.anything(), {
		...stored,
		whoCanPromote: 'projectAdmins',
	});
	await waitFor(() => expect(select).toHaveTextContent(/^Project admins$/));
	expect(showMessage).toHaveBeenCalled();
});

it('puts the previous option back when saving fails', async () => {
	api.updatePromotionSettings.mockRejectedValue(new Error('Request failed'));
	renderRows();

	const select = await choose('Project admins and editors');

	await waitFor(() => expect(select).toHaveTextContent(/^Instance admins only$/));
	expect(showError).toHaveBeenCalledWith(
		expect.any(Error),
		"Couldn't save the promotion setting",
		expect.anything(),
	);
});
