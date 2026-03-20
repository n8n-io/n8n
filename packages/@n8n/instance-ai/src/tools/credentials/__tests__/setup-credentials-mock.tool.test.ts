import type { InstanceAiContext } from '../../../types';
import { createSetupCredentialsTool } from '../setup-credentials.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {
			list: jest.fn().mockResolvedValue([]),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

function createToolCtx(options?: {
	resumeData?: {
		approved: boolean;
		credentials?: Record<string, string>;
		autoSetup?: { credentialType: string };
	};
}) {
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

describe('setup-credentials tool', () => {
	it('returns deferred result when approved=false', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({ resumeData: { approved: false } });

		const result = await tool.execute!({ credentials: [{ credentialType: 'slackApi' }] }, ctx);

		expect(result).toMatchObject({ success: true, deferred: true });
		expect((result as { reason: string }).reason).toContain('skipped');
	});

	it('includes projectId in suspend payload when input has projectId', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const suspendFn = jest.fn();
		const ctx = {
			agent: { suspend: suspendFn, resumeData: undefined },
		} as never;

		await tool.execute!(
			{
				credentials: [{ credentialType: 'slackApi', reason: 'Send messages' }],
				projectId: 'proj-123',
			},
			ctx,
		);

		expect(suspendFn).toHaveBeenCalled();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const payload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toHaveProperty('projectId', 'proj-123');
	});

	it('omits projectId from suspend payload when input has no projectId', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const suspendFn = jest.fn();
		const ctx = {
			agent: { suspend: suspendFn, resumeData: undefined },
		} as never;

		await tool.execute!(
			{ credentials: [{ credentialType: 'slackApi', reason: 'Send messages' }] },
			ctx,
		);

		expect(suspendFn).toHaveBeenCalled();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const payload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).not.toHaveProperty('projectId');
	});

	it('returns success with credentials when approved=true', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({
			resumeData: { approved: true, credentials: { slackApi: 'cred-123' } },
		});

		const result = await tool.execute!({ credentials: [{ credentialType: 'slackApi' }] }, ctx);

		expect(result).toEqual({ success: true, credentials: { slackApi: 'cred-123' } });
	});

	it('includes credentialFlow in suspend payload for finalize mode', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const suspendFn = jest.fn();
		const ctx = {
			agent: { suspend: suspendFn, resumeData: undefined },
		} as never;

		await tool.execute!(
			{
				credentials: [{ credentialType: 'slackApi' }],
				credentialFlow: { stage: 'finalize' },
			},
			ctx,
		);

		expect(suspendFn).toHaveBeenCalled();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const payload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toHaveProperty('credentialFlow', { stage: 'finalize' });
		expect((payload as { message: string }).message).toContain('verified');
	});
});
