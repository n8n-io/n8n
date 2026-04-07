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
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-06-15T12:00:00.000Z',
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
	});

	describe('execute', () => {
		it('returns credentials without accountIdentifier when getAccountContext is not available', async () => {
			const context = createMockContext();
			const credentials = [makeCredential()];
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);

			const tool = createListCredentialsTool(context);
			const result = (await tool.execute!({}, {} as never)) as {
				credentials: CredentialSummary[];
			};

			expect(result.credentials).toEqual(credentials);
		});

		it('enriches credentials with accountIdentifier when getAccountContext is available', async () => {
			const context = createMockContext();
			const credentials = [
				makeCredential({ id: 'cred-1', name: 'Gmail OAuth' }),
				makeCredential({ id: 'cred-2', name: 'Slack API', type: 'slackApi' }),
			];
			(context.credentialService.list as jest.Mock).mockResolvedValue(credentials);
			context.credentialService.getAccountContext = jest
				.fn()
				.mockResolvedValueOnce({ accountIdentifier: 'user@gmail.com' })
				.mockResolvedValueOnce({ accountIdentifier: undefined });

			const tool = createListCredentialsTool(context);
			const result = (await tool.execute!({}, {} as never)) as {
				credentials: Array<CredentialSummary & { accountIdentifier?: string }>;
			};

			expect(result.credentials).toHaveLength(2);
			expect(result.credentials[0].accountIdentifier).toBe('user@gmail.com');
			expect(result.credentials[1].accountIdentifier).toBeUndefined();
		});

		it('passes type filter to the list call', async () => {
			const context = createMockContext();
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);

			const tool = createListCredentialsTool(context);
			await tool.execute!({ type: 'gmailOAuth2' }, {} as never);

			expect(context.credentialService.list).toHaveBeenCalledWith({ type: 'gmailOAuth2' });
		});
	});
});
