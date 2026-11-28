import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { fetchAssistantUsage, fetchAssistantUsageUsers } from '../assistantUsage.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal()),
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: 'http://localhost:5678/rest' } as IRestApiContext;
const range = {
	startDate: new Date('2026-11-01T00:00:00.000Z'),
	endDate: new Date('2026-11-30T23:59:59.999Z'),
};

describe('assistantUsage.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('asks for the days in the time zone of the browser', async () => {
		await fetchAssistantUsage(context, { ...range, projectId: 'project-1' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/assistant/usage', {
			startDate: '2026-11-01T00:00:00.000Z',
			endDate: '2026-11-30T23:59:59.999Z',
			projectId: 'project-1',
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});
	});

	it('leaves out the project and the sort when there are none', async () => {
		await fetchAssistantUsageUsers(context, { ...range, skip: 10, take: 10 });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/assistant/usage/users', {
			startDate: '2026-11-01T00:00:00.000Z',
			endDate: '2026-11-30T23:59:59.999Z',
			skip: 10,
			take: 10,
		});
	});

	it('sends the sort of the users', async () => {
		await fetchAssistantUsageUsers(context, { ...range, skip: 0, take: 10, sortBy: 'tokens:desc' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/assistant/usage/users',
			expect.objectContaining({ sortBy: 'tokens:desc' }),
		);
	});
});
