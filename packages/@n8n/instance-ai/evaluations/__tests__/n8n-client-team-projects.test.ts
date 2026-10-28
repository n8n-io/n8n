import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

function mockFetch(body: unknown) {
	const fn = vi.fn((_url: string | URL, _init?: RequestInit) => ({
		ok: true,
		status: 200,
		headers: { get: () => null },
		json: () => body,
		text: () => '',
	}));
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

const settingsWithTeamLimit = (limit: number) => ({
	data: { enterprise: { projects: { team: { limit } } } },
});

describe('N8nClient.canCreateTeamProjects', () => {
	it('is true when the license allows any team projects', async () => {
		const fetchMock = mockFetch(settingsWithTeamLimit(-1));

		await expect(new N8nClient('http://n8n.test').canCreateTeamProjects()).resolves.toBe(true);
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://n8n.test/rest/settings');
	});

	it('is false on an unlicensed instance, whose team project limit is 0', async () => {
		mockFetch(settingsWithTeamLimit(0));

		await expect(new N8nClient('http://n8n.test').canCreateTeamProjects()).resolves.toBe(false);
	});

	it('is false when the settings carry no team project limit', async () => {
		mockFetch({ data: {} });

		await expect(new N8nClient('http://n8n.test').canCreateTeamProjects()).resolves.toBe(false);
	});
});
