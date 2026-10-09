import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	checkTeamsCredential,
	createTeamsManagerCredential,
	fetchTeamsAppPackage,
	getTeamsAzureSubscriptions,
	getTeamsManagedSetup,
	getTeamsSetupState,
	provisionTeamsApp,
	provisionTeamsBot,
} from './api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal()),
	makeRestApiRequest: vi.fn().mockResolvedValue({}),
}));

vi.mock('@n8n/constants', async (importOriginal) => ({
	...(await importOriginal()),
	getBrowserId: () => 'browser-1',
}));

const context = { baseUrl: 'https://n8n.test/rest' } as IRestApiContext;
const BASE = '/projects/project-1/agents/v2/agent-1/integrations/teams';

/** The call the wrapper made, as the REST client saw it. */
const sent = () => vi.mocked(makeRestApiRequest).mock.calls[0];

describe('teams channel api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTeamsSetupState', () => {
		it('reads the setup state for the agent', async () => {
			await getTeamsSetupState(context, 'project-1', 'agent-1');

			expect(sent()).toEqual([context, 'GET', `${BASE}/setup`, undefined]);
		});

		/**
		 * The credential is the one picked in the setup, before it is on the
		 * agent, so the backend has to be told which one to read.
		 */
		it('names the credential the setup has picked', async () => {
			await getTeamsSetupState(context, 'project-1', 'agent-1', 'cred-1');

			expect(sent()).toEqual([context, 'GET', `${BASE}/setup`, { credentialId: 'cred-1' }]);
		});
	});

	it('checks a credential by id, in its path', async () => {
		await checkTeamsCredential(context, 'project-1', 'agent-1', 'cred-1');

		expect(sent()).toEqual([context, 'POST', `${BASE}/check/cred-1`]);
	});

	it('reads the managed setup state', async () => {
		await getTeamsManagedSetup(context, 'project-1', 'agent-1');

		expect(sent()).toEqual([context, 'GET', `${BASE}/managed-setup`]);
	});

	it('creates the manager credential', async () => {
		await createTeamsManagerCredential(context, 'project-1', 'agent-1');

		expect(sent()).toEqual([context, 'POST', `${BASE}/manager-credential`]);
	});

	it('registers the Entra app on the signed-in account', async () => {
		await provisionTeamsApp(context, 'project-1', 'agent-1', 'manager-1');

		expect(sent()).toEqual([
			context,
			'POST',
			`${BASE}/provision-app`,
			{ managerCredentialId: 'manager-1' },
		]);
	});

	/** A GET, so the subscription lookup goes in the query rather than a body. */
	it('asks for the Azure subscriptions with the sign-in in the query', async () => {
		await getTeamsAzureSubscriptions(context, 'project-1', 'agent-1', 'manager-1');

		expect(sent()).toEqual([
			context,
			'GET',
			`${BASE}/azure-subscriptions`,
			{ managerCredentialId: 'manager-1' },
		]);
	});

	it('creates the bot against the chosen subscription', async () => {
		const payload = {
			managerCredentialId: 'manager-1',
			credentialId: 'bot-cred-1',
			subscriptionId: 'sub-1',
		};

		await provisionTeamsBot(context, 'project-1', 'agent-1', payload);

		expect(sent()).toEqual([context, 'POST', `${BASE}/provision-bot`, payload]);
	});

	describe('fetchTeamsAppPackage', () => {
		/**
		 * Fetched rather than linked to: the session cookie is bound to a
		 * `browser-id` header, which a plain navigation cannot send -- the request
		 * comes back 401 and the app signs the user out.
		 */
		it('sends the browser id, so the session survives the download', async () => {
			const blob = new Blob(['PK']);
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValue({ ok: true, blob: async () => blob } as Response);

			await expect(
				fetchTeamsAppPackage(context, 'project-1', 'agent-1', 'bot-cred-1', {
					teamChannels: true,
				}),
			).resolves.toBe(blob);

			expect(fetchSpy).toHaveBeenCalledWith(
				`https://n8n.test/rest${BASE}/package`,
				expect.objectContaining({
					method: 'POST',
					credentials: 'include',
					headers: expect.objectContaining({ 'browser-id': 'browser-1' }),
					body: JSON.stringify({
						credentialId: 'bot-cred-1',
						settings: { teamChannels: true },
					}),
				}),
			);
		});

		it('reports a refused download rather than saving the refusal', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response);

			await expect(
				fetchTeamsAppPackage(context, 'project-1', 'agent-1', 'bot-cred-1'),
			).rejects.toThrow(/403/);
		});
	});
});
