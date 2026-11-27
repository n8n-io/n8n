import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Person } from '@n8n/db';
import { Container } from '@n8n/di';
import { AuthError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { AuthService } from '@/auth/auth.service';
import { DisableMFACommand } from '@/commands/mfa/disable';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MfaService } from '@/mfa/mfa.service';
import { NodeTypes } from '@/node-types';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createUser, createUserWithMfaEnabled } from '../../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(NodeTypes);
const licenseState = mockInstance(LicenseState);
mockInstance(License);

const command = setupTestCommand(DisableMFACommand);

beforeAll(() => {
	Container.get(GlobalConfig).userManagement.jwtSecret = 'My JWT secret';
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	licenseState.isMFAEnforcementLicensed.mockReturnValue(false);
});

test('mfa:disable disables MFA for a user with MFA enabled', async () => {
	const { user } = await createUserWithMfaEnabled();

	await command.run([`--email=${user.email}`]);

	const person = await Container.get(DataSource).manager.findOneOrFail(Person, {
		where: { id: user.id },
	});

	expect(person.mfaEnabled).toBe(false);
	expect(person.mfaSecret).toBeNull();
	expect(person.mfaRecoveryCodes).toEqual([]);
});

test('mfa:disable keeps a session issued before enabling MFA invalid after disabling MFA', async () => {
	// IAM-1643
	const user = await createUser();
	const authService = Container.get(AuthService);
	const mfaService = Container.get(MfaService);
	const browserId = 'test-browser-id';

	const earlierToken = authService.issueJWT(user, false, browserId);

	await expect(
		authService.authenticateUserBasedOnToken(earlierToken, 'GET', '/rest/login', browserId),
	).resolves.toMatchObject({ id: user.id });

	const secret = mfaService.totp.generateSecret();
	const recoveryCodes = mfaService.generateRecoveryCodes();
	await mfaService.saveSecretAndRecoveryCodes(user.id, secret, recoveryCodes);
	await mfaService.enableMfa(user.id);

	await expect(
		authService.authenticateUserBasedOnToken(earlierToken, 'GET', '/rest/login', browserId),
	).rejects.toThrow(AuthError);

	await command.run([`--email=${user.email}`]);

	const personAfterDisable = await Container.get(DataSource).manager.findOneOrFail(Person, {
		where: { id: user.id },
	});
	expect(personAfterDisable.mfaEnabled).toBe(false);
	expect(personAfterDisable.mfaSecret).toBeNull();

	await expect(
		authService.authenticateUserBasedOnToken(earlierToken, 'GET', '/rest/login', browserId),
	).rejects.toThrow(AuthError);
});
