import type { InstanceAiContext, CredentialTypeSearchResult } from '../../../types';
import {
	createSearchCredentialTypesTool,
	searchCredentialTypesInputSchema,
} from '../search-credential-types.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(
	searchResults?: CredentialTypeSearchResult[],
	hasSearchMethod = true,
): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
			...(hasSearchMethod
				? {
						searchCredentialTypes: jest.fn().mockResolvedValue(searchResults ?? []) as jest.Mock<
							Promise<CredentialTypeSearchResult[]>,
							[string]
						>,
					}
				: {}),
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('search-credential-types tool', () => {
	describe('schema validation', () => {
		it('accepts a valid query', () => {
			const result = searchCredentialTypesInputSchema.safeParse({ query: 'linear' });
			expect(result.success).toBe(true);
		});

		it('rejects missing query', () => {
			const result = searchCredentialTypesInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns matching credential types', async () => {
			const searchResults: CredentialTypeSearchResult[] = [
				{ type: 'linearApi', displayName: 'Linear API' },
			];
			const context = createMockContext(searchResults);
			const tool = createSearchCredentialTypesTool(context);

			const result = (await tool.execute!({ query: 'linear' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(context.credentialService.searchCredentialTypes).toHaveBeenCalledWith('linear');
			expect(result).toEqual({ results: searchResults });
		});

		it('filters out generic auth types', async () => {
			const searchResults: CredentialTypeSearchResult[] = [
				{ type: 'linearApi', displayName: 'Linear API' },
				{ type: 'httpHeaderAuth', displayName: 'Header Auth' },
				{ type: 'httpBearerAuth', displayName: 'Bearer Auth' },
				{ type: 'httpQueryAuth', displayName: 'Query Auth' },
				{ type: 'httpBasicAuth', displayName: 'Basic Auth' },
				{ type: 'httpCustomAuth', displayName: 'Custom Auth' },
				{ type: 'httpDigestAuth', displayName: 'Digest Auth' },
				{ type: 'oAuth1Api', displayName: 'OAuth1 API' },
				{ type: 'oAuth2Api', displayName: 'OAuth2 API' },
			];
			const context = createMockContext(searchResults);
			const tool = createSearchCredentialTypesTool(context);

			const result = (await tool.execute!({ query: 'auth' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual({
				results: [{ type: 'linearApi', displayName: 'Linear API' }],
			});
		});

		it('returns empty results when searchCredentialTypes is not implemented', async () => {
			const context = createMockContext([], false);
			const tool = createSearchCredentialTypesTool(context);

			const result = (await tool.execute!({ query: 'linear' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual({ results: [] });
		});

		it('returns empty results when no matches found', async () => {
			const context = createMockContext([]);
			const tool = createSearchCredentialTypesTool(context);

			const result = (await tool.execute!({ query: 'nonexistent' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual({ results: [] });
		});
	});
});
