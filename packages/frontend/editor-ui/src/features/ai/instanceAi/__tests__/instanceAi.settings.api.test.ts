import { makeRestApiRequest } from '@n8n/rest-api-client';

import { fetchUserPreferences, updateUserPreferences } from '../instanceAi.settings.api';

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));

const context = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-1' };

describe('approval mode preferences API', () => {
	beforeEach(() => {
		vi.mocked(makeRestApiRequest).mockReset();
	});

	it('reads the preferences from the Assistant route', async () => {
		await fetchUserPreferences(context);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/assistant/preferences');
	});

	it('saves the approval mode on the Assistant route', async () => {
		await updateUserPreferences(context, { approvalMode: 'manual' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PUT', '/assistant/preferences', {
			approvalMode: 'manual',
		});
	});
});
