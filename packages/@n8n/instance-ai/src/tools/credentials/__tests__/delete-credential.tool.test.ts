import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createDeleteCredentialTool } from '../delete-credential.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(
	permissionOverrides?: InstanceAiContext['permissions'],
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
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		permissions: permissionOverrides,
	};
}

/**
 * Build the second argument (`ctx`) that Mastra passes to `execute`.
 * The suspend/resume pattern uses `ctx.agent.suspend` and `ctx.agent.resumeData`.
 */
function createToolCtx(options?: { resumeData?: { approved: boolean } }) {
	return {
		agent: {
			suspend: jest.fn(),
			resumeData: options?.resumeData ?? undefined,
		},
	} as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('delete-credential tool', () => {
	describe('schema validation', () => {
		it('accepts a valid credentialId', () => {
			const tool = createDeleteCredentialTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ credentialId: 'cred-123' });
			expect(result.success).toBe(true);
		});

		it('rejects missing credentialId', () => {
			const tool = createDeleteCredentialTool(createMockContext());
			const result = tool.inputSchema!.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('suspend/resume flow (default permissions)', () => {
		it('suspends for confirmation on first call', async () => {
			const context = createMockContext();
			const tool = createDeleteCredentialTool(context);
			const ctx = createToolCtx(); // no resumeData => first call

			await tool.execute!({ credentialId: 'cred-123' }, ctx);

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).toHaveBeenCalledTimes(1);

			const suspendPayload = (suspend.mock.calls as unknown[][])[0][0] as {
				requestId: string;
				message: string;
				severity: string;
			};
			expect(suspendPayload.requestId).toEqual(expect.any(String));
			expect(suspendPayload.message).toContain('cred-123');
			expect(suspendPayload.severity).toBe('destructive');
			// Service should NOT have been called yet
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});

		it('deletes the credential when resumed with approved: true', async () => {
			const context = createMockContext();
			(context.credentialService.delete as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteCredentialTool(context);
			const ctx = createToolCtx({ resumeData: { approved: true } });

			const result = await tool.execute!({ credentialId: 'cred-123' }, ctx);

			expect(context.credentialService.delete).toHaveBeenCalledWith('cred-123');
			expect(result).toEqual({ success: true });
		});

		it('returns denied when resumed with approved: false', async () => {
			const context = createMockContext();
			const tool = createDeleteCredentialTool(context);
			const ctx = createToolCtx({ resumeData: { approved: false } });

			const result = await tool.execute!({ credentialId: 'cred-123' }, ctx);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.credentialService.delete).not.toHaveBeenCalled();
		});
	});

	describe('always_allow permission', () => {
		it('skips confirmation and deletes immediately', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				deleteCredential: 'always_allow',
			});
			(context.credentialService.delete as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteCredentialTool(context);
			const ctx = createToolCtx(); // no resumeData, but permission overrides

			const result = await tool.execute!({ credentialId: 'cred-456' }, ctx);

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).not.toHaveBeenCalled();
			expect(context.credentialService.delete).toHaveBeenCalledWith('cred-456');
			expect(result).toEqual({ success: true });
		});
	});

	describe('error handling', () => {
		it('propagates service errors on delete', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				deleteCredential: 'always_allow',
			});
			(context.credentialService.delete as jest.Mock).mockRejectedValue(
				new Error('Credential in use'),
			);
			const tool = createDeleteCredentialTool(context);
			const ctx = createToolCtx();

			await expect(tool.execute!({ credentialId: 'cred-789' }, ctx)).rejects.toThrow(
				'Credential in use',
			);
		});
	});
});
