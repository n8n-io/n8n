/**
 * Integration test for `AgentsCredentialProvider.resolve()` with a real
 * `CredentialsHelper`.
 *
 * The unit tests stub `getDecrypted`, so they prove the provider calls it with
 * the right arguments but not that a stored `$secrets` expression is actually
 * evaluated. This drives the real decryption path — a credential encrypted in
 * the DB whose token is an expression — so a regression in `internal`-mode
 * expression handling fails here.
 */

import { LicenseState } from '@n8n/backend-common';
import { getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy } from 'n8n-core';
import { HttpBearerAuth } from 'n8n-nodes-base/credentials/HttpBearerAuth.credentials';

import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { AgentsCredentialProvider } from '@/modules/agents/adapters/agents-credential-provider';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';

const SECRET_VALUE = 'bearer-token-from-the-store';
const SECRET_NAME = 'mcpToken';
const PROVIDER_NAME = 'testSecretsProvider';
const TOKEN_EXPRESSION = `={{ $secrets.${PROVIDER_NAME}.${SECRET_NAME} }}`;

// Resolving external secrets sits behind a license gate.
const licenseMock = mockInstance(LicenseState);
licenseMock.isLicensed.mockReturnValue(true);

// Must be at module level so the DI entry is replaced before testDb.init() or
// any Container.get() can cache the real service.
const mockExternalSecretsProxy = mockInstance(ExternalSecretsProxy);

function configureMockProxy() {
	mockExternalSecretsProxy.hasProvider.mockImplementation(
		(provider: string) => provider === PROVIDER_NAME,
	);
	mockExternalSecretsProxy.hasSecret.mockImplementation(
		(provider: string, name: string) => provider === PROVIDER_NAME && name === SECRET_NAME,
	);
	mockExternalSecretsProxy.getSecret.mockImplementation((provider: string, name: string) =>
		provider === PROVIDER_NAME && name === SECRET_NAME ? SECRET_VALUE : undefined,
	);
	mockExternalSecretsProxy.listProviders.mockReturnValue([PROVIDER_NAME]);
	mockExternalSecretsProxy.listSecrets.mockImplementation((provider: string) =>
		provider === PROVIDER_NAME ? [SECRET_NAME] : [],
	);
}

describe('AgentsCredentialProvider — external secrets', () => {
	let owner: User;
	let projectId: string;
	let credentialsService: CredentialsService;

	beforeAll(async () => {
		await testDb.init();

		// `CredentialsHelper.getCredentialsProperties` resolves the type through
		// LoadNodesAndCredentials, so the real bearer credential must be loadable.
		const lnc = Container.get(LoadNodesAndCredentials);
		lnc.loaded.credentials = {
			...lnc.loaded.credentials,
			httpBearerAuth: { type: new HttpBearerAuth(), sourcePath: '' },
		};

		owner = await createOwner();
		projectId = (await getPersonalProject(owner)).id;
		credentialsService = Container.get(CredentialsService);

		configureMockProxy();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		configureMockProxy();
	});

	afterEach(async () => {
		await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveBearerCredential(token: string) {
		return await saveCredential(
			{ name: 'MCP bearer', type: 'httpBearerAuth', data: { token } },
			{ user: owner, role: 'credential:owner' },
		);
	}

	it('evaluates a $secrets expression stored in the credential', async () => {
		const credential = await saveBearerCredential(TOKEN_EXPRESSION);

		const provider = new AgentsCredentialProvider(credentialsService, projectId, owner);
		const resolved = await provider.resolve(credential.id);

		expect(resolved.token).toBe(SECRET_VALUE);
		expect(mockExternalSecretsProxy.getSecret).toHaveBeenCalledWith(PROVIDER_NAME, SECRET_NAME);

		// Guards against a fixture that was already plaintext: the stored value is
		// the unevaluated expression, so the assertion above can only pass if
		// resolution actually ran.
		const stored = await credentialsService.decrypt(credential, true);
		expect(stored.token).toBe(TOKEN_EXPRESSION);
	});

	it('rejects when the referenced secret does not exist', async () => {
		const credential = await saveBearerCredential(`={{ $secrets.${PROVIDER_NAME}.missingSecret }}`);

		const provider = new AgentsCredentialProvider(credentialsService, projectId, owner);

		await expect(provider.resolve(credential.id)).rejects.toThrow(/secrets/i);
	});

	it('returns a literal token unchanged', async () => {
		const credential = await saveBearerCredential('literal-token');

		const provider = new AgentsCredentialProvider(credentialsService, projectId, owner);

		await expect(provider.resolve(credential.id)).resolves.toMatchObject({
			token: 'literal-token',
		});
		expect(mockExternalSecretsProxy.getSecret).not.toHaveBeenCalled();
	});
});
