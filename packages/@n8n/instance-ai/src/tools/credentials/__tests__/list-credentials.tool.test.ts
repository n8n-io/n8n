import type { InstanceAiContext, CredentialSummary } from '../../../types';
import { createListCredentialsTool, listCredentialsInputSchema } from '../list-credentials.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

function makeCredential(overrides?: Partial<CredentialSummary>): CredentialSummary {
	return {
		id: 'cred-1',
		name: 'Gmail OAuth',
		type: 'gmailOAuth2',
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('list-credentials tool', () => {
	describe('schema validation', () => {
		it('accepts empty input', () => {
			const result = listCredentialsInputSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('accepts a type filter', () => {
			const result = listCredentialsInputSchema.safeParse({ type: 'gmailOAuth2' });
			expect(result.success).toBe(true);
		});

		it('accepts pagination params', () => {
			const result = listCredentialsInputSchema.safeParse({ limit: 10, offset: 20 });
			expect(result.success).toBe(true);
		});
	});

	describe('execute', () => {
		it('returns credentials with total count', async () => {
			const context = createMockContext();
			const credentials = [makeCredential()];
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = (await tool.execute!({}, {} as never)) as {
				credentials: Array<{ id: string; name: string; type: string }>;
				total: number;
			};

			expect(result.credentials).toEqual([
				{ id: 'cred-1', name: 'Gmail OAuth', type: 'gmailOAuth2' },
			]);
			expect(result.total).toBe(1);
		});

		it('passes type filter to the list call', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const tool = createListCredentialsTool(context);
			await tool.execute!({ type: 'gmailOAuth2' }, {} as never);

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'gmailOAuth2' });
		});

		it('paginates results with limit and offset', async () => {
			const context = createMockContext();
			const credentials = Array.from({ length: 5 }, (_, i) =>
				makeCredential({ id: `cred-${i}`, name: `Cred ${i}` }),
			);
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = (await tool.execute!({ limit: 2, offset: 1 }, {} as never)) as {
				credentials: Array<{ id: string }>;
				total: number;
			};

			expect(result.total).toBe(5);
			expect(result.credentials).toHaveLength(2);
			expect(result.credentials[0].id).toBe('cred-1');
			expect(result.credentials[1].id).toBe('cred-2');
		});

		it('uses default limit of 50', async () => {
			const context = createMockContext();
			const credentials = Array.from({ length: 60 }, (_, i) =>
				makeCredential({ id: `cred-${i}`, name: `Cred ${i}` }),
			);
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = (await tool.execute!({}, {} as never)) as {
				credentials: Array<{ id: string }>;
				total: number;
			};

			expect(result.total).toBe(60);
			expect(result.credentials).toHaveLength(50);
		});
	});
});
