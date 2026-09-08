import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import {
	createStartBrowserRecordingTool,
	createStopBrowserRecordingTool,
} from '../browser-recording.tool';

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: 'thread-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		browserRecordingService: {
			isConnected: vi.fn().mockReturnValue(true),
			startRecording: vi.fn().mockReturnValue(true),
			stopAndSubmitRecording: vi.fn().mockReturnValue(true),
		},
		...overrides,
	} as unknown as InstanceAiContext;
}

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

function suspendCtx() {
	const suspend = vi.fn(async (payload: unknown) => await Promise.resolve(payload));
	return { resumeData: undefined, suspend };
}

function resumeCtx(approved: boolean) {
	return { resumeData: { approved }, suspend: vi.fn() } as never;
}

describe('createStartBrowserRecordingTool', () => {
	it('does not suspend and reports pairing guidance when not connected', async () => {
		const context = createMockContext({
			browserRecordingService: {
				isConnected: vi.fn().mockReturnValue(false),
				startRecording: vi.fn(),
				stopAndSubmitRecording: vi.fn(),
			},
		});
		const tool = createStartBrowserRecordingTool(context);

		const result = await executeTool<{ started: boolean; reason?: string }>(
			tool,
			{},
			noSuspendCtx(),
		);

		expect(result.started).toBe(false);
		expect(result.reason).toMatch(/pair/i);
	});

	it('suspends with a one-click continue action when connected', async () => {
		const context = createMockContext();
		const tool = createStartBrowserRecordingTool(context);
		const ctx = suspendCtx();

		await executeTool(tool, {}, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'continue',
				continueLabel: 'Start recording',
				continueIcon: 'circle-dot',
			}),
		);
	});

	it('reports declined when the user does not approve', async () => {
		const context = createMockContext();
		const tool = createStartBrowserRecordingTool(context);

		const result = await executeTool<{ started: boolean; reason?: string }>(
			tool,
			{},
			resumeCtx(false),
		);

		expect(result).toEqual({ started: false, reason: 'The user declined to start recording.' });
	});

	it('starts recording on the current thread once approved', async () => {
		const context = createMockContext();
		const tool = createStartBrowserRecordingTool(context);

		const result = await executeTool<{ started: boolean }>(tool, {}, resumeCtx(true));

		expect(context.browserRecordingService!.startRecording).toHaveBeenCalledWith(
			'user-1',
			'thread-1',
		);
		expect(result).toEqual({ started: true });
	});

	it('reports failure without a thread to resume into', async () => {
		const context = createMockContext({ threadId: undefined });
		const tool = createStartBrowserRecordingTool(context);

		const result = await executeTool<{ started: boolean; reason?: string }>(
			tool,
			{},
			resumeCtx(true),
		);

		expect(result.started).toBe(false);
		expect(context.browserRecordingService!.startRecording).not.toHaveBeenCalled();
	});
});

describe('createStopBrowserRecordingTool', () => {
	it('reports not connected', async () => {
		const context = createMockContext({
			browserRecordingService: {
				isConnected: vi.fn().mockReturnValue(false),
				startRecording: vi.fn(),
				stopAndSubmitRecording: vi.fn(),
			},
		});
		const tool = createStopBrowserRecordingTool(context);

		const result = await executeTool<{ stopped: boolean }>(tool, {}, noSuspendCtx());

		expect(result.stopped).toBe(false);
	});

	it('stops and submits when connected', async () => {
		const context = createMockContext();
		const tool = createStopBrowserRecordingTool(context);

		const result = await executeTool<{ stopped: boolean }>(tool, {}, noSuspendCtx());

		expect(context.browserRecordingService!.stopAndSubmitRecording).toHaveBeenCalledWith('user-1');
		expect(result.stopped).toBe(true);
	});
});
