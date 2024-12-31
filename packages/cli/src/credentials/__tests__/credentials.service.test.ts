import { mock } from 'jest-mock-extended';
import { nanoId, date } from 'minifaker';
import { Credentials } from 'n8n-core';
import { CREDENTIAL_EMPTY_VALUE, type ICredentialType } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import type { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { AuthenticatedRequest } from '@/requests';

import { createNewCredentialsPayload, credentialScopes } from './credentials.test-data';

let req = { user: { id: '123' } } as AuthenticatedRequest;

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

	const credentialTypes = mock<CredentialTypes>();
	const service = new CredentialsService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		credentialTypes,
		mock(),
		mock(),
		mock(),
		mock(),
	);

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

	describe('createCredential', () => {
		it('it should create new credentials and return with scopes', async () => {
			// Arrange

			const encryptedData = 'encryptedData';

			const newCredentialPayloadData = createNewCredentialsPayload();

			const newCredential = mock<CredentialsEntity>({
				name: newCredentialPayloadData.name,
				data: JSON.stringify(newCredentialPayloadData.data),
				type: newCredentialPayloadData.type,
			});

			const encryptedDataResponse = {
				name: newCredentialPayloadData.name,
				type: newCredentialPayloadData.type,
				updatedAt: date(),
				data: encryptedData,
			};

			const saveCredentialsResponse = {
				id: nanoId.nanoid(),
				name: newCredentialPayloadData.name,
				type: newCredentialPayloadData.type,
				updatedAt: encryptedDataResponse.updatedAt,
				createdAt: date(),
				data: encryptedDataResponse.data,
				isManaged: false,
				shared: undefined,
			};

			service.prepareCreateData = jest.fn().mockReturnValue(newCredential);
			service.createEncryptedData = jest.fn().mockImplementation(() => encryptedDataResponse);
			service.save = jest.fn().mockResolvedValue(saveCredentialsResponse);
			service.getCredentialScopes = jest.fn().mockReturnValue(credentialScopes);

			// Act

			const createdCredential = await service.createCredential(newCredentialPayloadData, req.user);

			// Assert

			expect(service.prepareCreateData).toHaveBeenCalledWith(newCredentialPayloadData);
			expect(service.createEncryptedData).toHaveBeenCalledWith(null, newCredential);
			expect(service.save).toHaveBeenCalledWith(
				newCredential,
				encryptedDataResponse,
				req.user,
				newCredentialPayloadData.projectId,
			);
			expect(service.getCredentialScopes).toHaveBeenCalledWith(
				req.user,
				saveCredentialsResponse.id,
			);

			expect(createdCredential).toEqual({
				...saveCredentialsResponse,
				scopes: credentialScopes,
			});
		});
	});

	describe('decrypt', () => {
		it('should redact sensitive values by default', () => {
			// ARRANGE
			const data = {
				clientId: 'abc123',
				clientSecret: 'sensitiveSecret',
				accessToken: '',
				oauthTokenData: 'super-secret',
				csrfSecret: 'super-secret',
			};
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);
			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			// ACT
			const redactedData = service.decrypt(credential);

			// ASSERT
			expect(redactedData).toEqual({
				clientId: 'abc123',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should return sensitive values if `includeRawData` is true', () => {
			// ARRANGE
			const data = {
				clientId: 'abc123',
				clientSecret: 'sensitiveSecret',
				accessToken: '',
				oauthTokenData: 'super-secret',
				csrfSecret: 'super-secret',
			};
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);
			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			// ACT
			const redactedData = service.decrypt(credential, true);

			// ASSERT
			expect(redactedData).toEqual(data);
		});
	});
});
