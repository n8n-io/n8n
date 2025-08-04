'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const credentials_overwrites_1 = require('@/credentials-overwrites');
describe('CredentialsOverwrites', () => {
	const testCredentialType = (0, jest_mock_extended_1.mock)({ name: 'test', extends: ['parent'] });
	const parentCredentialType = (0, jest_mock_extended_1.mock)({
		name: 'parent',
		extends: undefined,
	});
	const globalConfig = (0, jest_mock_extended_1.mock)({ credentials: { overwrite: {} } });
	const credentialTypes = (0, jest_mock_extended_1.mock)();
	const logger = (0, jest_mock_extended_1.mock)();
	let credentialsOverwrites;
	beforeEach(() => {
		jest.resetAllMocks();
		globalConfig.credentials.overwrite.data = JSON.stringify({
			test: { username: 'user' },
			parent: { password: 'pass' },
		});
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockImplementation((credentialType) => {
			if (credentialType === testCredentialType.name) return testCredentialType;
			if (credentialType === parentCredentialType.name) return parentCredentialType;
			throw new n8n_core_1.UnrecognizedCredentialTypeError(credentialType);
		});
		credentialTypes.getParentTypes
			.calledWith(testCredentialType.name)
			.mockReturnValue([parentCredentialType.name]);
		credentialsOverwrites = new credentials_overwrites_1.CredentialsOverwrites(
			globalConfig,
			credentialTypes,
			logger,
		);
	});
	describe('constructor', () => {
		it('should parse and set overwrite data from config', () => {
			expect(credentialsOverwrites.getAll()).toEqual({
				parent: { password: 'pass' },
				test: {
					password: 'pass',
					username: 'user',
				},
			});
		});
	});
	describe('setData', () => {
		it('should reset resolvedTypes when setting new data', () => {
			const newData = { test: { token: 'test-token' } };
			credentialsOverwrites.setData(newData);
			expect(credentialsOverwrites.getAll()).toEqual(newData);
		});
	});
	describe('applyOverwrite', () => {
		it('should apply overwrites only for empty fields', () => {
			const result = credentialsOverwrites.applyOverwrite('test', {
				username: 'existingUser',
				password: '',
			});
			expect(result).toEqual({
				username: 'existingUser',
				password: 'pass',
			});
		});
		it('should return original data if no overwrites exist', () => {
			const data = {
				username: 'user1',
				password: 'pass1',
			};
			credentialTypes.getParentTypes.mockReturnValueOnce([]);
			const result = credentialsOverwrites.applyOverwrite('unknownCredential', data);
			expect(result).toEqual(data);
		});
	});
	describe('getOverwrites', () => {
		it('should return undefined for unrecognized credential type', () => {
			credentialTypes.recognizes.mockReturnValue(false);
			const result = credentialsOverwrites.getOverwrites('unknownType');
			expect(result).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown credential type'));
		});
		it('should cache resolved types', () => {
			credentialsOverwrites.getOverwrites('parent');
			const firstCall = credentialsOverwrites.getOverwrites('test');
			const secondCall = credentialsOverwrites.getOverwrites('test');
			expect(firstCall).toEqual(secondCall);
			expect(credentialTypes.getByName).toHaveBeenCalledTimes(2);
			expect(credentialsOverwrites['resolvedTypes']).toEqual(['parent', 'test']);
		});
		it('should merge overwrites from parent types', () => {
			credentialTypes.getByName.mockImplementation((credentialType) => {
				if (credentialType === 'childType')
					return (0, jest_mock_extended_1.mock)({ extends: ['parentType1', 'parentType2'] });
				if (credentialType === 'parentType1')
					return (0, jest_mock_extended_1.mock)({ extends: undefined });
				if (credentialType === 'parentType2')
					return (0, jest_mock_extended_1.mock)({ extends: undefined });
				throw new n8n_core_1.UnrecognizedCredentialTypeError(credentialType);
			});
			globalConfig.credentials.overwrite.data = JSON.stringify({
				childType: { specificField: 'childValue' },
				parentType1: { parentField1: 'value1' },
				parentType2: { parentField2: 'value2' },
			});
			const credentialsOverwrites = new credentials_overwrites_1.CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
			);
			const result = credentialsOverwrites.getOverwrites('childType');
			expect(result).toEqual({
				parentField1: 'value1',
				parentField2: 'value2',
				specificField: 'childValue',
			});
		});
	});
});
//# sourceMappingURL=credentials-overwrites.test.js.map
