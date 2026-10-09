import type { CredentialsEntity, User } from '@n8n/db';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@n8n/errors';

import { TeamsEntraProvisioningService } from '../teams-entra-provisioning.service';
import type { GraphResponse, TeamsGraphService } from '../teams-graph.service';
import type { TeamsManagerTokenService } from '../teams-manager-token.service';

const user = mock<User>({ id: 'user-1' });
const OBJECT_ID = 'object-1';
const APP_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';

const options = {
	user,
	projectId: 'project-1',
	agentId: 'agent-1',
	agentName: 'Support Bot',
	managerCredentialId: 'manager-1',
};

const ok = (body: unknown): GraphResponse => ({ statusCode: 200, body, ok: true });
const failed = (statusCode: number, code?: string): GraphResponse => ({
	statusCode,
	body: code ? { error: { code } } : {},
	ok: false,
});

describe('TeamsEntraProvisioningService', () => {
	let graph: ReturnType<typeof mock<TeamsGraphService>>;
	let tokens: ReturnType<typeof mock<TeamsManagerTokenService>>;
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let credentialsFinderService: ReturnType<typeof mock<CredentialsFinderService>>;
	let service: TeamsEntraProvisioningService;

	/** Routes each Graph call by method and path, so tests state only what differs. */
	const routeGraph = (overrides: Record<string, GraphResponse> = {}) => {
		const routes: Record<string, GraphResponse> = {
			'GET /organization?$select=id,displayName': ok({
				value: [{ id: TENANT_ID, displayName: 'Acme Corp' }],
			}),
			"PATCH /applications(uniqueName='n8n-agent-agent-1')": ok({
				id: OBJECT_ID,
				appId: APP_ID,
				displayName: 'Support Bot (n8n)',
			}),
			[`POST /applications/${OBJECT_ID}/addPassword`]: ok({
				secretText: 'a-secret',
				endDateTime: '2028-09-17T00:00:00Z',
			}),
			'POST /servicePrincipals': ok({ id: 'sp-1' }),
			[`GET /applications/${OBJECT_ID}`]: ok({ appId: APP_ID, displayName: 'Support Bot (n8n)' }),
			...overrides,
		};
		graph.request.mockImplementation(
			async (_token: string, method: string, path: string) =>
				routes[`${method} ${path}`] ?? failed(404),
		);
		return routes;
	};

	/** The credential data written for the channel. */
	const writtenCredentialData = () =>
		credentialsService.createUnmanagedCredential.mock.calls[0][0].data as Record<string, unknown>;

	beforeEach(() => {
		graph = mock<TeamsGraphService>();
		tokens = mock<TeamsManagerTokenService>();
		credentialsService = mock<CredentialsService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		service = new TeamsEntraProvisioningService(
			graph,
			tokens,
			credentialsService,
			credentialsFinderService,
		);

		tokens.acquire.mockResolvedValue('graph-token');
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({
				id: 'manager-1',
				name: 'Microsoft organization',
				type: 'microsoftTeamsManagerOAuth2Api',
			}) as never,
		);
		credentialsService.decrypt.mockResolvedValue({} as never);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([] as never);
		credentialsService.createUnmanagedCredential.mockResolvedValue(
			mock({ id: 'bot-cred-1' }) as never,
		);
		routeGraph();
	});

	it('registers the app, its secret and its service principal', async () => {
		const result = await service.provision(options);

		expect(graph.request).toHaveBeenCalledWith(
			'graph-token',
			'PATCH',
			"/applications(uniqueName='n8n-agent-agent-1')",
			expect.objectContaining({ signInAudience: 'AzureADMyOrg' }),
			{ Prefer: 'create-if-missing' },
		);
		expect(graph.request).toHaveBeenCalledWith('graph-token', 'POST', '/servicePrincipals', {
			appId: APP_ID,
		});
		expect(result.appId).toBe(APP_ID);
		expect(result.organizationName).toBe('Acme Corp');
	});

	it('writes the channel credential itself, so the user never handles a secret', async () => {
		const result = await service.provision(options);

		expect(writtenCredentialData()).toMatchObject({
			tenantId: TENANT_ID,
			clientId: APP_ID,
			clientSecret: 'a-secret',
			entraAppObjectId: OBJECT_ID,
			provisionedForAgentId: 'agent-1',
		});
		expect(result.credentialId).toBe('bot-cred-1');
	});

	it('records when the secret expires', async () => {
		const result = await service.provision(options);

		expect(result.secretExpiresAt).toBe('2028-09-17T00:00:00Z');
		expect(writtenCredentialData().secretExpiresAt).toBe('2028-09-17T00:00:00Z');
	});

	it('links to the app registration in Entra', async () => {
		const result = await service.provision(options);

		expect(result.entraAppUrl).toContain(APP_ID);
	});

	it('asks for the longest secret lifetime first', async () => {
		await service.provision(options);

		const call = graph.request.mock.calls.find(([, , path]) =>
			String(path).endsWith('/addPassword'),
		);
		const endDateTime = new Date(
			String(
				(call?.[3] as { passwordCredential: { endDateTime: string } }).passwordCredential
					.endDateTime,
			),
		);
		const monthsAhead =
			(endDateTime.getFullYear() - new Date().getFullYear()) * 12 +
			(endDateTime.getMonth() - new Date().getMonth());
		expect(monthsAhead).toBe(24);
	});

	it('steps down to a shorter lifetime when the tenant caps it', async () => {
		let attempt = 0;
		const routes = routeGraph();
		graph.request.mockImplementation(async (_token: string, method: string, path: string) => {
			if (path.endsWith('/addPassword')) {
				attempt += 1;
				return attempt < 3
					? failed(400, 'CredentialLifetimePolicyViolation')
					: ok({ secretText: 'a-secret', endDateTime: '2027-03-17T00:00:00Z' });
			}
			return routes[`${method} ${path}`] ?? failed(404);
		});

		await expect(service.provision(options)).resolves.toMatchObject({
			secretExpiresAt: '2027-03-17T00:00:00Z',
		});
		expect(attempt).toBe(3);
	});

	it('sends the user to the manual setup when secrets are refused outright', async () => {
		const routes = routeGraph();
		graph.request.mockImplementation(async (_token: string, method: string, path: string) =>
			path.endsWith('/addPassword')
				? failed(403, 'Authorization_RequestDenied')
				: (routes[`${method} ${path}`] ?? failed(404)),
		);

		await expect(service.provision(options)).rejects.toThrow(/manual setup/);
	});

	it('says so when the account may not register applications', async () => {
		routeGraph({
			"PATCH /applications(uniqueName='n8n-agent-agent-1')": failed(
				403,
				'Authorization_RequestDenied',
			),
		});

		await expect(service.provision(options)).rejects.toThrow(/not allowed to register/);
	});

	it('refuses a personal Microsoft account', async () => {
		routeGraph({ 'GET /organization?$select=id,displayName': ok({ value: [] }) });

		await expect(service.provision(options)).rejects.toThrow(/work or school account/);
	});

	it('refuses to run without a Microsoft sign-in', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null as never);

		await expect(service.provision(options)).rejects.toThrow(BadRequestError);
	});

	it('remembers which organisation the sign-in belongs to', async () => {
		await service.provision(options);

		expect(credentialsService.update).toHaveBeenCalledWith(
			'manager-1',
			expect.anything(),
			{ kind: 'user', user },
			expect.objectContaining({ tenantId: TENANT_ID, organizationName: 'Acme Corp' }),
		);
	});

	describe('keeping the secret out of sight', () => {
		it('never returns the secret to the browser', async () => {
			const result = await service.provision(options);

			expect(JSON.stringify(result)).not.toContain('a-secret');
		});

		it('puts the secret only in the credential, which is encrypted', async () => {
			await service.provision(options);

			// The one place it appears is the credential payload; nothing else the
			// call produces carries it.
			expect(writtenCredentialData().clientSecret).toBe('a-secret');
			const graphBodies = JSON.stringify(graph.request.mock.calls.map(([, , , body]) => body));
			expect(graphBodies).not.toContain('a-secret');
		});

		it('never passes the access token anywhere but the Graph client', async () => {
			await service.provision(options);

			expect(graph.request.mock.calls.every(([token]) => token === 'graph-token')).toBe(true);
			const result = await service.provision(options);
			expect(JSON.stringify(result)).not.toContain('graph-token');
		});
	});

	/**
	 * The n8n credential is a shortcut, not the record. Losing it must not strand
	 * the registration this agent already owns in the customer's directory.
	 */
	describe('when the n8n credential is gone but the app is not', () => {
		it('picks the app back up rather than registering a second one', async () => {
			// 204: Microsoft updated the app it already had, and says nothing.
			routeGraph({
				"PATCH /applications(uniqueName='n8n-agent-agent-1')": {
					statusCode: 204,
					body: {},
					ok: true,
				},
				'GET /applications?%24filter=uniqueName+eq+%27n8n-agent-agent-1%27&%24select=id%2CappId%2CdisplayName':
					ok({ value: [{ id: OBJECT_ID, appId: APP_ID, displayName: 'Support Bot (n8n)' }] }),
			});

			await expect(service.provision(options)).resolves.toMatchObject({ appId: APP_ID });
		});

		it('reports it rather than guessing when Microsoft will not say which app', async () => {
			routeGraph({
				"PATCH /applications(uniqueName='n8n-agent-agent-1')": {
					statusCode: 204,
					body: {},
					ok: true,
				},
				// Answered, and named nothing.
				'GET /applications?%24filter=uniqueName+eq+%27n8n-agent-agent-1%27&%24select=id%2CappId%2CdisplayName':
					ok({ value: [] }),
			});

			await expect(service.provision(options)).rejects.toThrow(/would not say which one/);
		});

		/**
		 * A refusal is not Microsoft declining to name an app it made, and saying
		 * so sends the user looking for the wrong thing.
		 */
		it('reports a refused lookup as a refusal', async () => {
			routeGraph({
				"PATCH /applications(uniqueName='n8n-agent-agent-1')": {
					statusCode: 204,
					body: {},
					ok: true,
				},
				'GET /applications?%24filter=uniqueName+eq+%27n8n-agent-agent-1%27&%24select=id%2CappId%2CdisplayName':
					failed(403, 'Authorization_RequestDenied'),
			});

			await expect(service.provision(options)).rejects.toThrow(/not allowed to register/);
		});
	});

	describe('running the setup a second time', () => {
		beforeEach(() => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				mock({ id: 'bot-cred-1', type: 'microsoftEntraServicePrincipalApi' }),
			] as never);
			credentialsFinderService.findCredentialForUser.mockImplementation(
				async (id: string) =>
					mock<CredentialsEntity>({
						id,
						name: id === 'manager-1' ? 'Microsoft organization' : 'Support Bot (n8n)',
						type:
							id === 'manager-1'
								? 'microsoftTeamsManagerOAuth2Api'
								: 'microsoftEntraServicePrincipalApi',
					}) as never,
			);
			credentialsService.decrypt.mockImplementation(async (credential: { id: string }) =>
				credential.id === 'bot-cred-1'
					? ({ entraAppObjectId: OBJECT_ID, provisionedForAgentId: 'agent-1' } as never)
					: ({} as never),
			);
		});

		/**
		 * Losing the credential and running again adds another secret to the app
		 * that survived. Entra caps how many one may hold, so the dead ones go --
		 * and only those, since a live one may belong to another instance.
		 */
		it('clears secrets that have expired before adding another', async () => {
			routeGraph({
				[`GET /applications/${OBJECT_ID}`]: ok({
					appId: APP_ID,
					displayName: 'Support Bot (n8n)',
					passwordCredentials: [
						{ keyId: 'dead-1', endDateTime: '2020-01-01T00:00:00Z' },
						{ keyId: 'live-1', endDateTime: '2099-01-01T00:00:00Z' },
					],
				}),
			});

			await service.provision(options);

			expect(graph.request).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				`/applications/${OBJECT_ID}/removePassword`,
				{ keyId: 'dead-1' },
			);
			expect(graph.request).not.toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				`/applications/${OBJECT_ID}/removePassword`,
				{ keyId: 'live-1' },
			);
		});

		/**
		 * The publish records which app it put in the catalogue on this very
		 * credential, and that note is the only answer the setup has while
		 * Microsoft has not listed the app. A re-run must not lose it.
		 */
		it('keeps what the publish recorded on the credential', async () => {
			credentialsService.decrypt.mockImplementation(
				async (credential: { id: string }, includeRawData?: boolean) => {
					if (credential.id !== 'bot-cred-1') return {} as never;
					const data = {
						entraAppObjectId: OBJECT_ID,
						provisionedForAgentId: 'agent-1',
						publishedTeamsAppId: 'teams-app-1',
						publishedTeamsAppState: 'published',
						privateKey: 'pem-1',
					};
					// The real `decrypt` blanks every password field unless the caller
					// asks for the raw data, and this one is written straight back.
					return (
						includeRawData ? data : { ...data, privateKey: CREDENTIAL_BLANKING_VALUE }
					) as never;
				},
			);

			await service.provision(options);

			expect(credentialsService.createEncryptedData).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						publishedTeamsAppId: 'teams-app-1',
						publishedTeamsAppState: 'published',
						privateKey: 'pem-1',
					}),
				}),
			);
		});

		/**
		 * A re-run against another directory keeps the credential but not what it
		 * said about a catalogue the new tenant has never seen -- carrying that
		 * across suppresses the publish that is actually due.
		 */
		it('drops the publish note when the app lands in another tenant', async () => {
			credentialsService.decrypt.mockImplementation(
				async (credential: { id: string }) =>
					(credential.id === 'bot-cred-1'
						? {
								entraAppObjectId: OBJECT_ID,
								provisionedForAgentId: 'agent-1',
								tenantId: 'a-different-tenant',
								clientId: APP_ID,
								publishedTeamsAppId: 'teams-app-1',
								publishedTeamsAppState: 'published',
								publishedTeamsAppAt: '2026-10-01T00:00:00Z',
							}
						: {}) as never,
			);

			await service.provision(options);

			const written = credentialsService.createEncryptedData.mock.calls[0][0].data as Record<
				string,
				unknown
			>;
			expect(written.publishedTeamsAppId).toBeUndefined();
			expect(written.publishedTeamsAppState).toBeUndefined();
			expect(written.publishedTeamsAppAt).toBeUndefined();
			expect(written.tenantId).toBe(TENANT_ID);
		});

		it('reuses the app it registered, rather than registering a second one', async () => {
			await service.provision(options);

			expect(graph.request).not.toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				expect.stringContaining('uniqueName'),
				expect.anything(),
				expect.anything(),
			);
		});

		it('updates the existing credential instead of creating another', async () => {
			const result = await service.provision(options);

			expect(credentialsService.createUnmanagedCredential).not.toHaveBeenCalled();
			expect(result.credentialId).toBe('bot-cred-1');
		});

		/**
		 * The credential outlives the app it points at. Someone deleting the
		 * registration in Entra used to leave the agent stuck: the credential was
		 * still found, reading the app failed, and no run could ever get past it.
		 */
		describe('when the app was deleted in the tenant', () => {
			beforeEach(() => {
				routeGraph({ [`GET /applications/${OBJECT_ID}`]: failed(404) });
			});

			it('registers a replacement rather than refusing for good', async () => {
				await expect(service.provision(options)).resolves.toMatchObject({
					credentialId: 'bot-cred-1',
				});
			});

			it('mints a secret for the replacement, since the old one is for an app that is gone', async () => {
				await service.provision(options);

				expect(graph.request).toHaveBeenCalledWith(
					expect.anything(),
					'POST',
					expect.stringContaining('/addPassword'),
					expect.anything(),
				);
			});
		});
	});
});
