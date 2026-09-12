import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	createPreference,
	deletePreference,
	getPreferences,
	updatePreference,
} from './context.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('context.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(makeRestApiRequest).mockResolvedValue({ count: 0, data: [] });
	});

	it('reads a page of preferences', async () => {
		await getPreferences(context, { skip: 50, take: 25 });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/ai-preferences', {
			skip: 50,
			take: 25,
		});
	});

	it('asks for the whole collection when given no page', async () => {
		await getPreferences(context);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/ai-preferences', {});
	});

	it('sends the scope with the content on create', async () => {
		await createPreference(context, {
			content: 'Keep replies short.',
			scope: 'project',
			projectId: 'proj',
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/ai-preferences', {
			content: 'Keep replies short.',
			scope: 'project',
			projectId: 'proj',
		});
	});

	it('addresses one preference on update', async () => {
		await updatePreference(context, 'p1', { content: 'New', scope: 'user' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PATCH', '/ai-preferences/p1', {
			content: 'New',
			scope: 'user',
		});
	});

	it('addresses one preference on delete', async () => {
		await deletePreference(context, 'p1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'DELETE', '/ai-preferences/p1');
	});
});
