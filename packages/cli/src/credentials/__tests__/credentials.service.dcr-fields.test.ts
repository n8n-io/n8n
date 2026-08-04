import type { Logger } from '@n8n/backend-common';
import type {
	CredentialsRepository,
	DbLockService,
	InstanceCredentialAssignmentRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { CredentialsEntity, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Credentials, type ErrorReporter } from 'n8n-core';
import type { ICredentialDataDecryptedObject, ICredentialType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialConnectionStatusProxy } from '@/credentials/credential-connection-status-proxy';
import type { CredentialDependencyService } from '@/credentials/credential-dependency.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import type { InstanceCredentialUseRegistry } from '@/credentials/instance-credential-use.registry';
import type { CredentialsHelper } from '@/credentials-helper';
import {
	DCR_MANAGED_CREDENTIAL_FIELDS,
	type DcrManagedCredentialField,
} from '@/oauth/dcr-managed-fields';
import type { ExternalHooks } from '@/external-hooks';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import type { CredentialsTester } from '@/services/credentials-tester.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';

const CREDENTIAL_TYPE = 'linearMcpOAuth2Api';

/**
 * The fields the dynamic client registration handshake negotiates and stores on
 * the credential. All are `hidden` in the UI, so the frontend never sends them
 * back when the credential is saved.
 */
const DCR_FIELDS: Record<DcrManagedCredentialField, string | boolean> = {
	clientId: 'dcr-client-id',
	clientSecret: 'dcr-client-secret',
	authUrl: 'https://linear.app/oauth/authorize',
	accessTokenUrl: 'https://linear.app/oauth/token',
	grantType: 'authorizationCode',
	authentication: 'header',
	usePkce: true,
};

const storedData: ICredentialDataDecryptedObject = {
	useDynamicClientRegistration: true,
	serverUrl: 'https://mcp.linear.app/mcp',
	scope: 'read write',
	...DCR_FIELDS,
	oauthTokenData: { access_token: 'stale-token', refresh_token: 'refresh-token' },
};

describe('CredentialsService DCR field retention', () => {
	const user = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
	const credentialTypes = mock<CredentialTypes>();
	const credentialsRepository = mock<CredentialsRepository>();

	const service = new CredentialsService(
		credentialsRepository,
		mock<CredentialDependencyService>(),
		mock<SharedCredentialsRepository>(),
		mock<OwnershipService>(),
		mock<Logger>(),
		mock<ErrorReporter>(),
		mock<CredentialsTester>(),
		mock<ExternalHooks>(),
		credentialTypes,
		mock<ProjectRepository>(),
		mock<ProjectService>(),
		mock<RoleService>(),
		mock<UserRepository>(),
		mock<CredentialsFinderService>(),
		mock<CredentialsHelper>(),
		mock<ExternalSecretsConfig>(),
		mock<SecretsProviderAccessCheckService>(),
		mock<CredentialConnectionStatusProxy>(),
		mock<InstanceCredentialAssignmentRepository>(),
		mock<InstanceCredentialUseRegistry>(),
		mock<DbLockService>(),
	);

	async function existingCredential(): Promise<CredentialsEntity> {
		const credentials = new Credentials({ id: 'cred-1', name: 'Linear' }, CREDENTIAL_TYPE);
		await credentials.setData(storedData);

		const entity = mock<CredentialsEntity>({
			id: 'cred-1',
			name: 'Linear',
			type: CREDENTIAL_TYPE,
			usageScope: 'project',
			data: credentials.getDataToSave().data,
			shared: [{ role: 'credential:owner', projectId: 'project-1' }],
		});
		return entity;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		credentialTypes.getByName.mockReturnValue(
			mock<ICredentialType>({ extends: [], properties: [] }),
		);
		credentialsRepository.create.mockImplementation(
			(data) => Object.assign(new CredentialsEntity(), data) as CredentialsEntity,
		);
	});

	it('keeps the dynamically registered client fields when the credential is saved', async () => {
		const credential = await existingCredential();

		// What the frontend sends on save: the visible fields only. Every DCR
		// field is hidden, so none of them are part of the payload.
		const prepared = await service.prepareUpdateData(
			user,
			{
				name: 'Linear',
				type: CREDENTIAL_TYPE,
				data: { serverUrl: 'https://mcp.linear.app/mcp', scope: 'read write' },
			},
			credential,
		);

		const preparedData = prepared.data as unknown as ICredentialDataDecryptedObject;
		expect(preparedData).toMatchObject(DCR_FIELDS);
	});

	it('drops them along with the token when the caller clears it', async () => {
		const credential = await existingCredential();

		const prepared = await service.prepareUpdateData(
			user,
			{ name: 'Linear', type: CREDENTIAL_TYPE, data: {} },
			credential,
			{ clearOauthTokenData: true },
		);

		const preparedData = prepared.data as unknown as ICredentialDataDecryptedObject;
		expect(preparedData.oauthTokenData).toBeUndefined();
		for (const field of DCR_MANAGED_CREDENTIAL_FIELDS) {
			expect(preparedData[field]).toBeUndefined();
		}
	});
});
