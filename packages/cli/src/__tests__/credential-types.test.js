'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const credential_types_1 = require('@/credential-types');
describe('CredentialTypes', () => {
	const loadNodesAndCredentials = (0, jest_mock_extended_1.mock)();
	const credentialTypes = new credential_types_1.CredentialTypes(loadNodesAndCredentials);
	const testCredential = {
		sourcePath: '',
		type: (0, jest_mock_extended_1.mock)(),
	};
	loadNodesAndCredentials.getCredential.mockImplementation((credentialType) => {
		if (credentialType === 'testCredential') return testCredential;
		throw new n8n_core_1.UnrecognizedCredentialTypeError(credentialType);
	});
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getByName', () => {
		test('Should throw error when calling invalid credential name', () => {
			expect(() => credentialTypes.getByName('unknownCredential')).toThrowError('c');
		});
		test('Should return correct credential type for valid name', () => {
			expect(credentialTypes.getByName('testCredential')).toStrictEqual(testCredential.type);
		});
	});
	describe('recognizes', () => {
		test('Should recognize credential type that exists in knownCredentials', () => {
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					loadedCredentials: {},
					knownCredentials: {
						testCredential: (0, jest_mock_extended_1.mock)({ supportedNodes: [] }),
					},
				}),
			);
			expect(credentialTypes.recognizes('testCredential')).toBe(true);
		});
		test('Should recognize credential type that exists in loadedCredentials', () => {
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					loadedCredentials: { testCredential },
					knownCredentials: {},
				}),
			);
			expect(credentialTypes.recognizes('testCredential')).toBe(true);
		});
		test('Should not recognize unknown credential type', () => {
			expect(credentialTypes.recognizes('unknownCredential')).toBe(false);
		});
	});
	describe('getSupportedNodes', () => {
		test('Should return supported nodes for known credential type', () => {
			const supportedNodes = ['node1', 'node2'];
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					knownCredentials: { testCredential: (0, jest_mock_extended_1.mock)({ supportedNodes }) },
				}),
			);
			expect(credentialTypes.getSupportedNodes('testCredential')).toEqual(supportedNodes);
		});
		test('Should return empty array for unknown credential type supported nodes', () => {
			expect(credentialTypes.getSupportedNodes('unknownCredential')).toBeEmptyArray();
		});
	});
	describe('getParentTypes', () => {
		test('Should return parent types for credential type with extends', () => {
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					knownCredentials: {
						childType: { extends: ['parentType1', 'parentType2'] },
						parentType1: { extends: ['grandparentType'] },
						parentType2: { extends: [] },
						grandparentType: { extends: [] },
					},
				}),
			);
			const parentTypes = credentialTypes.getParentTypes('childType');
			expect(parentTypes).toContain('parentType1');
			expect(parentTypes).toContain('parentType2');
			expect(parentTypes).toContain('grandparentType');
		});
		test('Should return empty array for credential type without extends', () => {
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					knownCredentials: { testCredential: { extends: [] } },
				}),
			);
			expect(credentialTypes.getParentTypes('testCredential')).toBeEmptyArray();
		});
		test('Should return empty array for unknown credential type parent types', () => {
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({
					knownCredentials: {},
				}),
			);
			expect(credentialTypes.getParentTypes('unknownCredential')).toBeEmptyArray();
		});
		test('Should not mutate the original extends array', () => {
			const knownCredentials = {
				childType: { extends: ['parentType'] },
				parentType: { extends: ['grandparentType'] },
				grandparentType: { extends: [] },
			};
			const credentialTypes = new credential_types_1.CredentialTypes(
				(0, jest_mock_extended_1.mock)({ knownCredentials }),
			);
			const originalExtends = knownCredentials.childType.extends;
			const originalLength = originalExtends.length;
			credentialTypes.getParentTypes('childType');
			credentialTypes.getParentTypes('childType');
			credentialTypes.getParentTypes('childType');
			expect(originalExtends).toHaveLength(originalLength);
		});
	});
});
//# sourceMappingURL=credential-types.test.js.map
