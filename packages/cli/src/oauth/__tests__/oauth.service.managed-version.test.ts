import type { LicenseState } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	CredentialsRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, EncryptionKeyProxy, type InstanceSettings } from 'n8n-core';
import type { ICredentialType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '@/credential-types';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { OauthService } from '../oauth.service';

vi.mock('@/workflow-execute-additional-data');

/**
 * These tests use the real `OauthService`, `CredentialsHelper` and `CredentialsOverwrites`. Only the
 * storage is mocked. The unit tests of the service mock `getDecrypted`, so they cannot show how
 * the overwrite fills the client fields before the version of a new connection is read.
 */
describe('OauthService with managed app versions', () => {
	const encryptionKeyProxy = new EncryptionKeyProxy();
	const cipher = new Cipher(
		mock<InstanceSettings>({ encryptionKey: 'test_key_for_testing' }),
		encryptionKeyProxy,
	);
	Container.set(Cipher, cipher);
	const instanceKey = {
		id: 'instance-key',
		value: cipher.encryptDEKWithInstanceKey('test_key_for_testing'),
		algorithm: 'aes-256-cbc' as const,
		format: 'no-prefix' as const,
	};
	encryptionKeyProxy.setProvider({
		getActiveKey: async () => instanceKey,
		getKeyById: async () => null,
		getLegacyKey: async () => instanceKey,
	});

	const oAuth2Api: ICredentialType = {
		name: 'oAuth2Api',
		displayName: 'OAuth2',
		properties: [
			{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '' },
			{ displayName: 'Client Secret', name: 'clientSecret', type: 'string', default: '' },
		],
	};
	const managedApi: ICredentialType = {
		name: 'managedOAuth2Api',
		displayName: 'Managed',
		extends: ['oAuth2Api'],
		properties: [],
	};

	const loader = mock<LoadNodesAndCredentials>();
	Object.assign(loader, {
		knownCredentials: { oAuth2Api: {}, managedOAuth2Api: { extends: ['oAuth2Api'] } },
		loadedCredentials: { oAuth2Api: {}, managedOAuth2Api: {} },
	});
	loader.getCredential.mockImplementation(((name: string) => ({
		type: name === 'oAuth2Api' ? oAuth2Api : managedApi,
		sourcePath: '',
	})) as never);

	const credentialTypes = new CredentialTypes(loader);
	const credentialsRepository = mock<CredentialsRepository>();
	const baseApp = { clientId: 'base-id', clientSecret: 'base-secret' };
	const newerApp = { clientId: 'newer-id', clientSecret: 'newer-secret' };
	const tokens = { access_token: 'access', refresh_token: 'refresh' };

	let overwrites: CredentialsOverwrites;
	let service: OauthService;

	beforeEach(() => {
		overwrites = new CredentialsOverwrites(
			{ credentials: { overwrite: { skipTypes: [], data: '' } } } as never,
			credentialTypes,
			mock(),
			mock(),
			cipher,
		);
		const helper = new CredentialsHelper(
			credentialTypes,
			overwrites,
			credentialsRepository,
			new DynamicCredentialsProxy(mock()),
			mock<SecretsProviderConnectionRepository>(),
			mock<LicenseState>(),
			mock<ExternalSecretsConfig>(),
			mock<AiGatewayService>(),
			mock<PolicyEnforcementService>(),
		);
		service = new OauthService(
			mock(),
			mock(),
			helper,
			credentialsRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			cipher,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);
		vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
		);
	});

	const rollout = () =>
		overwrites.setPlainData({
			managedOAuth2Api: baseApp,
			__versions: { managedOAuth2Api: { version: 2, ...newerApp } },
		});

	const store = (data: Record<string, unknown>) => {
		const entity = {
			id: 'credential-1',
			name: 'Managed',
			type: 'managedOAuth2Api',
			data: cipher.encryptWithInstanceKey(data),
			usageScope: 'project',
		} as CredentialsEntity;
		credentialsRepository.findOneByOrFail.mockResolvedValue(entity);
		return entity;
	};

	const managed = (extra: Record<string, unknown> = {}) => ({
		clientId: '',
		clientSecret: '',
		...extra,
	});

	describe('a new connection', () => {
		it('should use the newer app and return its version for a new credential', async () => {
			rollout();
			const credential = store(managed());

			const result = await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(result.managedVersion).toBe(2);
			expect(result.oauthCredentials).toMatchObject(newerApp);
		});

		it('should move a credential that has tokens of the base app to the newer app', async () => {
			rollout();
			const credential = store(managed({ oauthTokenData: tokens }));

			const result = await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(result.managedVersion).toBe(2);
			expect(result.oauthCredentials).toMatchObject(newerApp);
		});

		it('should connect again when the stored version has no app any more', async () => {
			rollout();
			const credential = store(managed({ oauthTokenData: { ...tokens, n8n_managed_version: 3 } }));

			const result = await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(result.managedVersion).toBe(2);
			expect(result.oauthCredentials).toMatchObject(newerApp);
		});

		it('should return the version of the base app when there is no rollout', async () => {
			overwrites.setPlainData({ managedOAuth2Api: baseApp });
			const credential = store(managed());

			const result = await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(result.managedVersion).toBe(1);
			expect(result.oauthCredentials).toMatchObject(baseApp);
		});

		it('should return no version for a credential with its own client', async () => {
			rollout();
			const own = { clientId: 'own-id', clientSecret: 'own-secret' };
			const credential = store(own);

			const result = await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(result.managedVersion).toBeUndefined();
			expect(result.oauthCredentials).toMatchObject(own);
		});
	});

	describe('an existing connection', () => {
		it.each([
			['the version stored on the credential: base', 1, baseApp],
			['the version stored on the credential: newer', 2, newerApp],
		])('should use %s', async (_name, version, app) => {
			rollout();
			const credential = store(
				managed({ oauthTokenData: { ...tokens, n8n_managed_version: version } }),
			);

			const result = await service.getOAuthCredentials<typeof baseApp>(credential);

			expect(result).toMatchObject(app);
		});

		it('should use the base app for tokens without a stored version', async () => {
			rollout();
			const credential = store(managed({ oauthTokenData: tokens }));

			const result = await service.getOAuthCredentials<typeof baseApp>(credential);

			expect(result).toMatchObject(baseApp);
		});

		it('should fail with the reconnect message when the stored version has no app', async () => {
			rollout();
			const credential = store(managed({ oauthTokenData: { ...tokens, n8n_managed_version: 3 } }));

			await expect(service.getOAuthCredentials(credential)).rejects.toThrow(
				'Reconnect the credential to continue.',
			);
		});
	});

	describe('the tokens that a reconnect keeps', () => {
		it('should keep the stored tokens when there is no rollout', async () => {
			overwrites.setPlainData({ managedOAuth2Api: baseApp });
			const stored = managed({ oauthTokenData: tokens });
			const credential = store(stored);
			const { managedVersion } =
				await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(service.getCarriedOverTokenData('managedOAuth2Api', stored, managedVersion)).toEqual(
				tokens,
			);
		});

		it('should start fresh when the connection moves to the newer app', async () => {
			rollout();
			const stored = managed({ oauthTokenData: tokens });
			const credential = store(stored);
			const { managedVersion } =
				await service.getNewConnectionCredentials<typeof baseApp>(credential);

			expect(service.getCarriedOverTokenData('managedOAuth2Api', stored, managedVersion)).toEqual(
				{},
			);
		});
	});
});
