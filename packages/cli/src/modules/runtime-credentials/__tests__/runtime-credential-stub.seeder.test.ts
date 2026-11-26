import type { Logger } from '@n8n/backend-common';
import type { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import type { CredentialFieldTargetValidator } from '../credential-field-target';
import { RuntimeCredentialStubSeeder } from '../runtime-credential-stub.seeder';
import type { CredentialRule } from '../runtime-credentials.service';
import { RuntimeCredentialsService, runtimeStubId } from '../runtime-credentials.service';

const rule = (credentialType: string): CredentialRule => ({
	nodeType: '*',
	path: 'headers.authorization',
	credentialType,
});

describe('RuntimeCredentialStubSeeder', () => {
	const rulesService = mock<RuntimeCredentialsService>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialTypes = mock<CredentialTypes>();
	const targetValidator = mock<CredentialFieldTargetValidator>();
	const cipher = mock<Cipher>();
	const logger = mock<Logger>();
	let seeder: RuntimeCredentialStubSeeder;

	beforeEach(() => {
		vi.clearAllMocks();
		cipher.encryptV2.mockResolvedValue('encrypted-placeholder');
		Container.set(Cipher, cipher);
		credentialTypes.recognizes.mockReturnValue(true);
		targetValidator.getError.mockReturnValue(undefined);
		credentialsRepository.insertRuntimeStubIfMissing.mockResolvedValue(true);
		seeder = new RuntimeCredentialStubSeeder(
			logger,
			rulesService,
			credentialsRepository,
			credentialTypes,
			targetValidator,
		);
	});

	it('creates one stub per rule with a stable id and encrypted placeholder data', async () => {
		rulesService.getCredentialRules.mockReturnValue([
			['gmail', rule('gmailOAuth2')],
			['sf', rule('salesforceOAuth2Api')],
		]);

		await seeder.seed();

		expect(credentialsRepository.insertRuntimeStubIfMissing).toHaveBeenCalledTimes(2);
		expect(credentialsRepository.insertRuntimeStubIfMissing).toHaveBeenCalledWith({
			id: runtimeStubId('gmail'),
			name: 'Request value: gmail',
			type: 'gmailOAuth2',
			data: 'encrypted-placeholder',
		});
		expect(cipher.encryptV2).toHaveBeenCalledWith({});
	});

	it('skips a rule with an unknown credential type and logs a warning', async () => {
		rulesService.getCredentialRules.mockReturnValue([['typo', rule('gmailOAuth3')]]);
		credentialTypes.recognizes.mockReturnValue(false);

		await seeder.seed();

		expect(credentialsRepository.insertRuntimeStubIfMissing).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('gmailOAuth3'));
	});

	it('skips a rule with a protected target field and names the alias in the warning', async () => {
		rulesService.getCredentialRules.mockReturnValue([
			['bad', { ...rule('oAuth2Api'), transform: 'field:authUrl' }],
		]);
		targetValidator.getError.mockReturnValue('The field "authUrl" is controlled by n8n');

		await seeder.seed();

		expect(credentialsRepository.insertRuntimeStubIfMissing).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"bad"'));
	});

	it('creates nothing when no rule names a credential type', async () => {
		rulesService.getCredentialRules.mockReturnValue([]);

		await seeder.seed();

		expect(credentialsRepository.insertRuntimeStubIfMissing).not.toHaveBeenCalled();
	});

	it('runs again without error when the stubs already exist', async () => {
		rulesService.getCredentialRules.mockReturnValue([['gmail', rule('gmailOAuth2')]]);
		credentialsRepository.insertRuntimeStubIfMissing.mockResolvedValue(false);

		await expect(seeder.seed()).resolves.toBeUndefined();
	});
});
