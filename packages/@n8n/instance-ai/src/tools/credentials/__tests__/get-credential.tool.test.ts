import type { InstanceAiContext, CredentialDetail } from '../../../types';
import { createGetCredentialTool, getCredentialInputSchema } from '../get-credential.tool';

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

function makeCredentialDetail(overrides?: Partial<CredentialDetail>): CredentialDetail {
	return {
		id: 'cred-123',
		name: 'My Slack Token',
		type: 'slackApi',
		nodesWithAccess: [{ nodeType: 'n8n-nodes-base.slack' }],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('get-credential tool', () => {
	describe('schema validation', () => {
		it('accepts a valid credentialId', () => {
			const result = getCredentialInputSchema.safeParse({ credentialId: 'cred-123' });
			expect(result.success).toBe(true);
		});

		it('rejects missing credentialId', () => {
			const result = getCredentialInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns credential detail for a valid credential', async () => {
			const context = createMockContext();
			const credential = makeCredentialDetail();
			(context.credentialService.get as jest.Mock).mockResolvedValue(credential);

			const tool = createGetCredentialTool(context);
			const result = (await tool.execute!({ credentialId: 'cred-123' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(context.credentialService.get).toHaveBeenCalledWith('cred-123');
			expect(result).toEqual(credential);
		});

		it('returns credential without nodesWithAccess when absent', async () => {
			const context = createMockContext();
			const credential = makeCredentialDetail({ nodesWithAccess: undefined });
			(context.credentialService.get as jest.Mock).mockResolvedValue(credential);

			const tool = createGetCredentialTool(context);
			const result = (await tool.execute!({ credentialId: 'cred-456' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(context.credentialService.get).toHaveBeenCalledWith('cred-456');
			expect(result).toEqual(credential);
		});

		it('propagates error when credential is not found', async () => {
			const context = createMockContext();
			(context.credentialService.get as jest.Mock).mockRejectedValue(
				new Error('Credential not found'),
			);

			const tool = createGetCredentialTool(context);

			await expect(tool.execute!({ credentialId: 'nonexistent' }, {} as never)).rejects.toThrow(
				'Credential not found',
			);
			expect(context.credentialService.get).toHaveBeenCalledWith('nonexistent');
		});

		it('includes accountIdentifier when getAccountContext is available', async () => {
			const context = createMockContext();
			const credential = makeCredentialDetail();
			(context.credentialService.get as jest.Mock).mockResolvedValue(credential);
			context.credentialService.getAccountContext = jest
				.fn()
				.mockResolvedValue({ accountIdentifier: 'user@example.com' });

			const tool = createGetCredentialTool(context);
			const result = (await tool.execute!({ credentialId: 'cred-123' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(context.credentialService.getAccountContext).toHaveBeenCalledWith('cred-123');
			expect(result).toEqual({ ...credential, accountIdentifier: 'user@example.com' });
		});

		it('returns undefined accountIdentifier when getAccountContext returns no identifier', async () => {
			const context = createMockContext();
			const credential = makeCredentialDetail();
			(context.credentialService.get as jest.Mock).mockResolvedValue(credential);
			context.credentialService.getAccountContext = jest
				.fn()
				.mockResolvedValue({ accountIdentifier: undefined });

			const tool = createGetCredentialTool(context);
			const result = (await tool.execute!({ credentialId: 'cred-123' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual({ ...credential, accountIdentifier: undefined });
		});

		it('omits accountIdentifier when getAccountContext is not available', async () => {
			const context = createMockContext();
			const credential = makeCredentialDetail();
			(context.credentialService.get as jest.Mock).mockResolvedValue(credential);

			const tool = createGetCredentialTool(context);
			const result = (await tool.execute!({ credentialId: 'cred-123' }, {} as never)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual(credential);
			expect(result).not.toHaveProperty('accountIdentifier');
		});
	});
});
