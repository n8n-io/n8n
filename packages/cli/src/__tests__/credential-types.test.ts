import { mock } from 'jest-mock-extended';
import { UnrecognizedCredentialTypeError } from 'n8n-core';
import type { ICredentialType, LoadedClass } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

describe('CredentialTypes', () => {
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const credentialTypes = new CredentialTypes(loadNodesAndCredentials);

	const testCredential: LoadedClass<ICredentialType> = {
		sourcePath: '',
		type: mock(),
	};

	loadNodesAndCredentials.getCredential.mockImplementation((credentialType) => {
		if (credentialType === 'testCredential') return testCredential;
		throw new UnrecognizedCredentialTypeError(credentialType);
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
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
					loadedCredentials: {},
					knownCredentials: { testCredential: mock({ supportedNodes: [] }) },
				}),
			);

			expect(credentialTypes.recognizes('testCredential')).toBe(true);
		});

		test('Should recognize credential type that exists in loadedCredentials', () => {
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
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
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
					knownCredentials: { testCredential: mock({ supportedNodes }) },
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
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
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
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
					knownCredentials: { testCredential: { extends: [] } },
				}),
			);

			expect(credentialTypes.getParentTypes('testCredential')).toBeEmptyArray();
		});

		test('Should return empty array for unknown credential type parent types', () => {
			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({
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

			const credentialTypes = new CredentialTypes(
				mock<LoadNodesAndCredentials>({ knownCredentials }),
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
