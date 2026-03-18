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
		mockCredentials?: boolean;
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

describe('setup-credentials tool — credential flow', () => {
	it('returns mocked result when approved=false with mockCredentials=true', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({
			resumeData: { approved: false, mockCredentials: true },
		});

		const result = await tool.execute!(
			{
				credentials: [
					{ credentialType: 'slackApi', reason: 'Send messages' },
					{ credentialType: 'gmailOAuth2Api', reason: 'Send emails' },
				],
			},
			ctx,
		);

		expect(result).toMatchObject({
			success: false,
			mocked: true,
			mockedCredentialTypes: ['slackApi', 'gmailOAuth2Api'],
		});
		expect((result as { reason: string }).reason).toContain('pinned data');
	});

	it('returns denied result when approved=false without mockCredentials', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({
			resumeData: { approved: false },
		});

		const result = await tool.execute!({ credentials: [{ credentialType: 'slackApi' }] }, ctx);

		expect(result).toMatchObject({ success: false });
		expect(result).not.toHaveProperty('mocked');
		expect((result as { reason: string }).reason).toContain('declined');
	});

	it('returns all credential types in mockedCredentialTypes when mocking', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({
			resumeData: { approved: false, mockCredentials: true },
		});

		const result = await tool.execute!(
			{
				credentials: [
					{ credentialType: 'openAiApi' },
					{ credentialType: 'slackApi' },
					{ credentialType: 'gmailOAuth2Api' },
				],
			},
			ctx,
		);

		expect(result).toMatchObject({
			mocked: true,
			mockedCredentialTypes: ['openAiApi', 'slackApi', 'gmailOAuth2Api'],
		});
	});

	it('returns success with credentials when approved=true', async () => {
		const context = createMockContext();
		const tool = createSetupCredentialsTool(context);
		const ctx = createToolCtx({
			resumeData: {
				approved: true,
				credentials: { slackApi: 'cred-123' },
			},
		});

		const result = await tool.execute!({ credentials: [{ credentialType: 'slackApi' }] }, ctx);

		expect(result).toEqual({
			success: true,
			credentials: { slackApi: 'cred-123' },
		});
	});
});
