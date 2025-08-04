'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const credentials_service_1 = require('@/credentials/credentials.service');
describe('CredentialsService', () => {
	const credType = (0, jest_mock_extended_1.mock)({
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
	const errorReporter = (0, jest_mock_extended_1.mock)();
	const credentialTypes = (0, jest_mock_extended_1.mock)();
	const credentialsRepository = (0, jest_mock_extended_1.mock)();
	const service = new credentials_service_1.CredentialsService(
		credentialsRepository,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		errorReporter,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		credentialTypes,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	beforeEach(() => jest.resetAllMocks());
	describe('redact', () => {
		it('should redact sensitive values', () => {
			const credential = (0, jest_mock_extended_1.mock)({
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
				clientSecret: constants_1.CREDENTIAL_BLANKING_VALUE,
				accessToken: n8n_workflow_1.CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: constants_1.CREDENTIAL_BLANKING_VALUE,
				csrfSecret: constants_1.CREDENTIAL_BLANKING_VALUE,
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
		const credentialEntity = (0, jest_mock_extended_1.mock)({
			id: '123',
			name: 'Test Credential',
			type: 'oauth2',
		});
		const credentials = (0, jest_mock_extended_1.mock)({ id: credentialEntity.id });
		beforeEach(() => {
			credentialTypes.getByName.calledWith(credentialEntity.type).mockReturnValueOnce(credType);
		});
		it('should redact sensitive values by default', () => {
			jest.spyOn(n8n_core_1.Credentials.prototype, 'getData').mockReturnValueOnce(data);
			const redactedData = service.decrypt(credentialEntity);
			expect(redactedData).toEqual({
				...data,
				clientSecret: constants_1.CREDENTIAL_BLANKING_VALUE,
				accessToken: n8n_workflow_1.CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: constants_1.CREDENTIAL_BLANKING_VALUE,
				csrfSecret: constants_1.CREDENTIAL_BLANKING_VALUE,
			});
		});
		it('should return sensitive values if `includeRawData` is true', () => {
			jest.spyOn(n8n_core_1.Credentials.prototype, 'getData').mockReturnValueOnce(data);
			const redactedData = service.decrypt(credentialEntity, true);
			expect(redactedData).toEqual(data);
		});
		it('should return return an empty object if decryption fails', () => {
			const decryptionError = new n8n_core_1.CredentialDataError(
				credentials,
				n8n_core_1.CREDENTIAL_ERRORS.DECRYPTION_FAILED,
			);
			jest.spyOn(n8n_core_1.Credentials.prototype, 'getData').mockImplementation(() => {
				throw decryptionError;
			});
			const redactedData = service.decrypt(credentialEntity, true);
			expect(redactedData).toEqual({});
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(decryptionError, {
				extra: { credentialId: credentialEntity.id },
				level: 'error',
				tags: { credentialType: credentialEntity.type },
			});
		});
	});
});
//# sourceMappingURL=credentials.service.test.js.map
