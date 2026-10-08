import { mock } from 'vitest-mock-extended';
import type { User } from '@n8n/db';

import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import type { OauthService } from '@/oauth/oauth.service';
import { BadRequestError } from '@n8n/errors';

import {
	REQUIRED_MANAGER_SCOPES,
	TEAMS_MANAGER_CREDENTIAL_TYPE,
	TeamsManagedSetupService,
} from '../teams-managed-setup.service';

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const user = mock<User>({ id: 'user-1' });
const scope = { projectId: PROJECT_ID, agentId: AGENT_ID, user };

/**
 * What Entra records when the user consents to the credential as it stands,
 * rather than a list written out here. A hand-written grant can satisfy a
 * requirement the sign-in never asks for, which is the one case these tests
 * exist to catch.
 */
const ALL_SCOPES = ['openid', 'offline_access', ...REQUIRED_MANAGER_SCOPES].join(' ');

describe('TeamsManagedSetupService', () => {
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let credentialsFinderService: ReturnType<typeof mock<CredentialsFinderService>>;
	let credentialsOverwrites: ReturnType<typeof mock<CredentialsOverwrites>>;
	let oauthService: ReturnType<typeof mock<OauthService>>;
	let service: TeamsManagedSetupService;

	const withOverwrites = (overwrites: Record<string, unknown> | undefined) => {
		credentialsOverwrites.getOverwrites.mockReturnValue(overwrites as never);
	};

	/** One usable manager credential whose stored grant is `data`. */
	const withManagerCredential = (
		data: Record<string, unknown>,
		{ id = 'cred-1', name = 'Microsoft organization', type = TEAMS_MANAGER_CREDENTIAL_TYPE } = {},
	) => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			mock({ id, type }),
		] as never);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(mock({ id, name }) as never);
		credentialsService.decrypt.mockResolvedValue(data as never);
	};

	beforeEach(() => {
		credentialsService = mock<CredentialsService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		credentialsOverwrites = mock<CredentialsOverwrites>();
		oauthService = mock<OauthService>();
		oauthService.getBaseUrl.mockReturnValue('https://n8n.example.com/rest/oauth2-credential');
		service = new TeamsManagedSetupService(
			credentialsService,
			credentialsFinderService,
			credentialsOverwrites,
			oauthService,
		);
		withOverwrites({ clientId: 'client-id', clientSecret: 'client-secret' });
	});

	describe('isSetupAvailable', () => {
		it('is available when the overwrite supplies a client ID and secret', () => {
			expect(service.isSetupAvailable()).toBe(true);
		});

		it.each([
			['no overwrite at all', undefined],
			['only a client ID', { clientId: 'client-id' }],
			['only a secret', { clientSecret: 'client-secret' }],
			['blank values', { clientId: '  ', clientSecret: '  ' }],
		])('is unavailable with %s', (_label, overwrites) => {
			withOverwrites(overwrites);
			expect(service.isSetupAvailable()).toBe(false);
		});

		it('reads the overwrite for the manager credential type', () => {
			service.isSetupAvailable();
			expect(credentialsOverwrites.getOverwrites).toHaveBeenCalledWith(
				'microsoftTeamsManagerOAuth2Api',
			);
		});
	});

	describe('getSetupState', () => {
		it('reports the flow unavailable, and lists nothing, without an overwrite', async () => {
			withOverwrites(undefined);

			await expect(service.getSetupState(scope)).resolves.toEqual({
				managedSetupAvailable: false,
				managerCredentials: [],
				adminConsentUrl: null,
			});
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
		});

		it('lists a connected sign-in with its organisation', async () => {
			withManagerCredential({
				organizationName: 'Acme Corp',
				tenantId: 'tenant-1',
				oauthTokenData: { access_token: 'token', scope: ALL_SCOPES },
			});

			await expect(service.getSetupState(scope)).resolves.toMatchObject({
				managedSetupAvailable: true,
				managerCredentials: [
					{
						id: 'cred-1',
						name: 'Microsoft organization',
						connected: true,
						reconnectRequired: false,
						organizationName: 'Acme Corp',
						tenantId: 'tenant-1',
					},
				],
			});
		});

		it('reports a credential whose OAuth round trip never finished as not connected', async () => {
			withManagerCredential({});

			const [summary] = (await service.getSetupState(scope)).managerCredentials;
			expect(summary).toMatchObject({
				connected: false,
				reconnectRequired: false,
				organizationName: null,
				tenantId: null,
			});
		});

		/** Catches a sign-in made before the install scope was corrected. */
		it('asks for a reconnect when a grant carries only the narrow install scope', async () => {
			withManagerCredential({
				oauthTokenData: {
					access_token: 'token',
					scope: [
						'https://graph.microsoft.com/Application.ReadWrite.All',
						'https://graph.microsoft.com/TeamsAppInstallation.ReadWriteSelfForUser',
					].join(' '),
				},
			});

			const [summary] = (await service.getSetupState(scope)).managerCredentials;
			expect(summary.reconnectRequired).toBe(true);
		});

		it('asks for a reconnect when a required scope is missing from the grant', async () => {
			withManagerCredential({
				oauthTokenData: {
					access_token: 'token',
					scope: 'openid https://graph.microsoft.com/Application.ReadWrite.All',
				},
			});

			const [summary] = (await service.getSetupState(scope)).managerCredentials;
			expect(summary.reconnectRequired).toBe(true);
		});

		it('accepts a granted scope that Entra returned without its resource prefix', async () => {
			withManagerCredential({
				oauthTokenData: {
					access_token: 'token',
					// Entra sometimes answers with the bare permission name.
					scope: REQUIRED_MANAGER_SCOPES.map((granted) =>
						granted.replace('https://graph.microsoft.com/', ''),
					).join(' '),
				},
			});

			const [summary] = (await service.getSetupState(scope)).managerCredentials;
			expect(summary.reconnectRequired).toBe(false);
		});

		it('ignores credentials of any other type', async () => {
			withManagerCredential({}, { type: 'microsoftEntraServicePrincipalApi' });

			await expect(service.getSetupState(scope)).resolves.toMatchObject({
				managedSetupAvailable: true,
				managerCredentials: [],
			});
		});

		it('skips a credential the user may not read', async () => {
			withManagerCredential({});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null as never);

			const state = await service.getSetupState(scope);
			expect(state.managerCredentials).toEqual([]);
		});
	});

	describe('the administrator consent prompt', () => {
		/**
		 * A sign-in cannot ask for Graph and Azure together, because a code is
		 * redeemed for one resource. `/.default` asks for every permission on the
		 * app registration instead, which is what makes one prompt cover both.
		 */
		it('asks for every permission on the registration, so one prompt covers both APIs', () => {
			const url = new URL(String(service.adminConsentUrl()));

			expect(url.searchParams.get('scope')).toBe('https://graph.microsoft.com/.default');
			expect(url.searchParams.get('client_id')).toBe('client-id');
		});

		it('never offers organisation consent to a personal account', () => {
			// `common` would; `organizations` cannot.
			expect(String(service.adminConsentUrl())).toContain('/organizations/');
			expect(String(service.adminConsentUrl())).not.toContain('/common/');
		});

		it('comes back with the setup state, so the step can offer it', async () => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([] as never);

			const state = await service.getSetupState(scope);

			expect(state.adminConsentUrl).toBe(service.adminConsentUrl());
		});

		it('offers nothing when the instance has no manager client credentials', () => {
			withOverwrites(undefined);

			expect(service.adminConsentUrl()).toBeNull();
		});
	});

	describe('createManagerCredential', () => {
		it('creates an empty credential of the manager type in the agent project', async () => {
			credentialsService.createUnmanagedCredential.mockResolvedValue(
				mock({ id: 'cred-new', name: 'Microsoft organization' }) as never,
			);

			await expect(service.createManagerCredential(scope)).resolves.toEqual({
				id: 'cred-new',
				name: 'Microsoft organization',
				type: 'microsoftTeamsManagerOAuth2Api',
				isResolvable: false,
			});
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'microsoftTeamsManagerOAuth2Api',
					data: {},
					projectId: PROJECT_ID,
				}),
				user,
			);
		});

		it('refuses when the flow is unavailable', async () => {
			withOverwrites(undefined);

			await expect(service.createManagerCredential(scope)).rejects.toThrow(BadRequestError);
			expect(credentialsService.createUnmanagedCredential).not.toHaveBeenCalled();
		});
	});
});
