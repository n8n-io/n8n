import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	INode,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { checkDomainRestrictions } from '../checkDomainRestrictions';

describe('checkDomainRestrictions', () => {
	let mockNode: INode;
	let mockExecuteFunctions: IExecuteFunctions;
	let mockSupplyDataFunctions: ISupplyDataFunctions;

	beforeEach(() => {
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		mockExecuteFunctions = createMockExecuteFunction({}, mockNode);
		mockSupplyDataFunctions = mockExecuteFunctions as unknown as ISupplyDataFunctions;
	});

	describe('when allowedDomainsType is "domains"', () => {
		it('should throw error when allowedDomains is empty', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: '',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(NodeOperationError);

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		});

		it('should throw error when allowedDomains is whitespace only', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: '   ',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(NodeOperationError);

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		});

		it('should throw error when allowedDomains is undefined', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(NodeOperationError);

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).toThrow(
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		});

		it('should throw error when URL is not in allowed domains', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com,test.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://notallowed.com');
			}).toThrow(NodeOperationError);

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://notallowed.com');
			}).toThrow(
				'Domain not allowed: This credential is restricted from accessing https://notallowed.com. Only the following domains are allowed: example.com,test.com',
			);
		});

		it('should not throw error when URL is in allowed domains (exact match)', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should not throw error when URL is in allowed domains (comma-separated list)', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com,test.com,another.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://test.com');
			}).not.toThrow();
		});

		it('should not throw error when URL matches wildcard domain', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: '*.example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://sub.example.com');
			}).not.toThrow();
		});

		it('should work with IExecuteFunctions context', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should work with ISupplyDataFunctions context', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockSupplyDataFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});
	});

	describe('when allowedDomainsType is "none"', () => {
		it('should not throw error when URL matches credentials URL', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should throw error when URL does not match credentials URL', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://different.com');
			}).toThrow(NodeOperationError);

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://different.com');
			}).toThrow(
				'Domain not allowed: This credential is restricted from accessing https://different.com. ',
			);
		});

		it('should not throw error when credentials URL key does not exist', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://any-url.com');
			}).not.toThrow();
		});

		it('should use custom credentialsUrlKey parameter', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				baseUrl: 'https://custom.example.com',
			};

			expect(() => {
				checkDomainRestrictions(
					mockExecuteFunctions,
					credentials,
					'https://custom.example.com',
					'baseUrl',
				);
			}).not.toThrow();

			expect(() => {
				checkDomainRestrictions(
					mockExecuteFunctions,
					credentials,
					'https://different.com',
					'baseUrl',
				);
			}).toThrow(NodeOperationError);
		});

		it('should work with IExecuteFunctions context', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should work with ISupplyDataFunctions context', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockSupplyDataFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});
	});

	describe('when allowedDomainsType is undefined or other value', () => {
		it('should not throw error when allowedDomainsType is undefined', () => {
			const credentials: ICredentialDataDecryptedObject = {};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://any-url.com');
			}).not.toThrow();
		});

		it('should not throw error when allowedDomainsType is empty string', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: '',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://any-url.com');
			}).not.toThrow();
		});

		it('should not throw error when allowedDomainsType is other value', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'other' as any,
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://any-url.com');
			}).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('should handle URLs with paths and query parameters', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com',
			};

			expect(() => {
				checkDomainRestrictions(
					mockExecuteFunctions,
					credentials,
					'https://example.com/api/v1/endpoint?param=value',
				);
			}).not.toThrow();
		});

		it('should handle URLs with ports', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com:8080');
			}).not.toThrow();
		});

		it('should handle case-insensitive domain matching', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'EXAMPLE.COM',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should handle domains with trailing dots', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com.',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com');
			}).not.toThrow();
		});

		it('should handle multiple domains with spaces in allowedDomains', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'example.com, test.com , another.com',
			};

			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://test.com');
			}).not.toThrow();
		});

		it('should handle exact URL match for "none" type with different protocols', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			// Should throw because protocol is different
			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'http://example.com');
			}).toThrow(NodeOperationError);
		});

		it('should handle exact URL match for "none" type with different paths', () => {
			const credentials: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'none',
				url: 'https://example.com',
			};

			// Should throw because path is different
			expect(() => {
				checkDomainRestrictions(mockExecuteFunctions, credentials, 'https://example.com/path');
			}).toThrow(NodeOperationError);
		});
	});
});
