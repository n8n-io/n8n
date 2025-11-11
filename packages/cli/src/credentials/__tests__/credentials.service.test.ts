import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { CREDENTIAL_ERRORS, CredentialDataError, Credentials, type ErrorReporter } from 'n8n-core';
import { CREDENTIAL_EMPTY_VALUE, type ICredentialType } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import type { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';

describe('CredentialsService', () => {
	const credType = mock<ICredentialType>({
		extends: [],
		properties: [
			{
				name: 'clientSecret',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
			{
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
		],
	});

	const errorReporter = mock<ErrorReporter>();
	const credentialTypes = mock<CredentialTypes>();
	const credentialsRepository = mock<CredentialsRepository>();
	const service = new CredentialsService(
		credentialsRepository,
		mock(),
		mock(),
		mock(),
		errorReporter,
		mock(),
		mock(),
		credentialTypes,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);

	beforeEach(() => jest.resetAllMocks());

	describe('redact', () => {
		it('should redact sensitive values', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});

			const decryptedData = {
				clientId: 'abc123',
				clientSecret: 'sensitiveSecret',
				accessToken: '',
				oauthTokenData: 'super-secret',
				csrfSecret: 'super-secret',
			};

			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				clientId: 'abc123',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});
	});

	describe('decrypt', () => {
		const data = {
			clientId: 'abc123',
			clientSecret: 'sensitiveSecret',
			accessToken: '',
			oauthTokenData: 'super-secret',
			csrfSecret: 'super-secret',
		};
		const credentialEntity = mock<CredentialsEntity>({
			id: '123',
			name: 'Test Credential',
			type: 'oauth2',
		});
		const credentials = mock<Credentials>({ id: credentialEntity.id });

		beforeEach(() => {
			credentialTypes.getByName.calledWith(credentialEntity.type).mockReturnValueOnce(credType);
		});

		it('should redact sensitive values by default', () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);

			// ACT
			const redactedData = service.decrypt(credentialEntity);

			// ASSERT
			expect(redactedData).toEqual({
				...data,
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should return sensitive values if `includeRawData` is true', () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);

			// ACT
			const redactedData = service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual(data);
		});

		it('should return return an empty object if decryption fails', () => {
			// ARRANGE
			const decryptionError = new CredentialDataError(
				credentials,
				CREDENTIAL_ERRORS.DECRYPTION_FAILED,
			);
			jest.spyOn(Credentials.prototype, 'getData').mockImplementation(() => {
				throw decryptionError;
			});

			// ACT
			const redactedData = service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual({});
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(decryptionError, {
				extra: { credentialId: credentialEntity.id },
				level: 'error',
				tags: { credentialType: credentialEntity.type },
			});
		});
	});

	describe('addGlobalCredentials', () => {
		it('should merge global credentials without duplicates', async () => {
			// ARRANGE
			const regularCred = mock<CredentialsEntity>({ id: 'cred1', name: 'Regular' });
			const globalCred = mock<CredentialsEntity>({ id: 'cred2', name: 'Global', isGlobal: true });
			const credentials = [regularCred];

			credentialsRepository.findAllGlobalCredentials.mockResolvedValueOnce([globalCred]);

			// ACT
			const result = await (service as any).addGlobalCredentials(credentials);

			// ASSERT
			expect(result).toHaveLength(2);
			expect(result).toContain(regularCred);
			expect(result).toContain(globalCred);
		});

		it('should not duplicate credentials when user already has access', async () => {
			// ARRANGE
			const sharedGlobalCred = mock<CredentialsEntity>({
				id: 'cred1',
				name: 'Shared Global',
				isGlobal: true,
			});
			const credentials = [sharedGlobalCred];

			credentialsRepository.findAllGlobalCredentials.mockResolvedValueOnce([sharedGlobalCred]);

			// ACT
			const result = await (service as any).addGlobalCredentials(credentials);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(sharedGlobalCred);
		});

		it('should handle empty global credentials list', async () => {
			// ARRANGE
			const regularCred = mock<CredentialsEntity>({ id: 'cred1', name: 'Regular' });
			const credentials = [regularCred];

			credentialsRepository.findAllGlobalCredentials.mockResolvedValueOnce([]);

			// ACT
			const result = await (service as any).addGlobalCredentials(credentials);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(regularCred);
		});

		it('should handle empty input credentials list', async () => {
			// ARRANGE
			const globalCred = mock<CredentialsEntity>({ id: 'cred1', name: 'Global', isGlobal: true });
			const credentials: CredentialsEntity[] = [];

			credentialsRepository.findAllGlobalCredentials.mockResolvedValueOnce([globalCred]);

			// ACT
			const result = await (service as any).addGlobalCredentials(credentials);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(globalCred);
		});
	});
});
