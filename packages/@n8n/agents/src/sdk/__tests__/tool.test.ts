import type { Mock } from 'vitest';
import { z } from 'zod';

import type { BuiltTelemetry, BuiltTool, InterruptibleToolContext, ToolContext } from '../../types';
import { Tool, wrapToolForApproval } from '../tool';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBuiltTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
	return {
		name: 'testTool',
		description: 'A test tool',
		inputSchema: z.object({ id: z.string() }),
		handler: async (input) => {
			return await Promise.resolve({ result: (input as { id: string }).id });
		},
		...overrides,
	};
}

function makeCtx(resumeData?: unknown): { ctx: InterruptibleToolContext; suspendMock: Mock } {
	const suspendMock = vi.fn().mockImplementation(async (payload: unknown) => {
		return await Promise.resolve({ __suspended: true, payload });
	});
	const ctx: InterruptibleToolContext = {
		suspend: suspendMock as unknown as InterruptibleToolContext['suspend'],
		resumeData,
	};
	return { ctx, suspendMock };
}

// ---------------------------------------------------------------------------
// Tool builder — .requireApproval()
// ---------------------------------------------------------------------------

describe('Tool builder — .requireApproval()', () => {
	it('build() returns a tool with suspendSchema and resumeSchema when .requireApproval() is set', () => {
		const tool = new Tool('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		expect(tool.suspendSchema).toBeDefined();
		expect(tool.resumeSchema).toBeDefined();
		expect(tool.approval?.required).toBe(true);
	});

	it('build() throws when .requireApproval() is combined with .suspend()/.resume()', () => {
		expect(() => {
			new Tool('delete')
				.description('Delete a record')
				.input(z.object({ id: z.string() }))
				.requireApproval()
				.suspend(z.object({ msg: z.string() }))
				.resume(z.object({ ok: z.boolean() }))
				.handler(async (_input, _ctx) => {
					return await Promise.resolve({});
				})
				.build();
		}).toThrow('cannot use both approval');
	});
});

// ---------------------------------------------------------------------------
// Tool builder — .needsApprovalFn()
// ---------------------------------------------------------------------------

describe('Tool builder — .needsApprovalFn()', () => {
	it('build() returns a tool with suspendSchema and resumeSchema when .needsApprovalFn() is set', () => {
		const tool = new Tool('query')
			.description('Run a query')
			.input(z.object({ id: z.string() }))
			.needsApprovalFn(async (args) => {
				return await Promise.resolve((args as { id: string }).id === 'secret');
			})
			.handler(async ({ id }) => {
				return await Promise.resolve({ result: id });
			})
			.build();

		expect(tool.suspendSchema).toBeDefined();
		expect(tool.resumeSchema).toBeDefined();
		expect(tool.approval?.required).toBe(false);
	});

	it('build() throws when .needsApprovalFn() is combined with .suspend()/.resume()', () => {
		expect(() => {
			new Tool('query')
				.description('Run a query')
				.input(z.object({ id: z.string() }))
				.needsApprovalFn(async () => {
					return await Promise.resolve(true);
				})
				.suspend(z.object({ msg: z.string() }))
				.resume(z.object({ ok: z.boolean() }))
				.handler(async (_input, _ctx) => {
					return await Promise.resolve({});
				})
				.build();
		}).toThrow('cannot use both approval');
	});
});

// ---------------------------------------------------------------------------
// Tool builder — without approval
// ---------------------------------------------------------------------------

describe('Tool builder — without approval', () => {
	it('build() returns a normal tool (no suspendSchema) when neither .requireApproval() nor .needsApprovalFn() is set', () => {
		const tool = new Tool('fetch')
			.description('Fetch data')
			.input(z.object({ id: z.string() }))
			.handler(async ({ id }) => {
				return await Promise.resolve({ data: id });
			})
			.build();

		expect(tool.suspendSchema).toBeUndefined();
		expect(tool.resumeSchema).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Tool builder — .systemInstruction()
// ---------------------------------------------------------------------------

describe('Tool builder — .systemInstruction()', () => {
	it('build() carries the systemInstruction onto the BuiltTool', () => {
		const tool = new Tool('fetch')
			.description('Fetch data')
			.systemInstruction('Always fetch with the cache disabled.')
			.input(z.object({ id: z.string() }))
			.handler(async ({ id }) => {
				return await Promise.resolve({ data: id });
			})
			.build();

		expect(tool.systemInstruction).toBe('Always fetch with the cache disabled.');
	});

	it('build() leaves systemInstruction undefined when not set', () => {
		const tool = new Tool('fetch')
			.description('Fetch data')
			.input(z.object({ id: z.string() }))
			.handler(async ({ id }) => {
				return await Promise.resolve({ data: id });
			})
			.build();

		expect(tool.systemInstruction).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// wrapToolForApproval — requireApproval: true
// ---------------------------------------------------------------------------

describe('wrapToolForApproval — requireApproval: true', () => {
	it('suspends on first call when requireApproval is true', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx, suspendMock } = makeCtx(); // resumeData = undefined → first call

		await wrapped.handler!({ id: '1' }, ctx);

		expect(suspendMock).toHaveBeenCalledWith(
			{ type: 'approval', toolName: 'testTool', args: { id: '1' } },
			expect.objectContaining({ resumeSchema: expect.anything() }),
		);
		expect(suspendMock.mock.calls[0]?.[1]?.continuation).toEqual({
			__n8nApprovalGate: true,
		});
	});

	it('includes display metadata from the wrapped tool object when suspending', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = {
			...wrapToolForApproval(baseTool, { requireApproval: true }),
			metadata: { displayName: 'Display test tool' },
		};
		const { ctx, suspendMock } = makeCtx();

		await wrapped.handler!({ id: '1' }, ctx);

		expect(suspendMock).toHaveBeenCalledWith(
			{
				type: 'approval',
				toolName: 'testTool',
				displayName: 'Display test tool',
				args: { id: '1' },
			},
			expect.objectContaining({ resumeSchema: expect.anything() }),
		);
	});

	it('persists a prepared approval binding and exposes it to the approved handler', async () => {
		const prepareApproval = vi.fn().mockResolvedValue('published-version-1');
		const handler = vi.fn(async (_input, ctx) => {
			return await Promise.resolve({ approvalBinding: ctx.approvalBinding });
		});
		const wrapped = wrapToolForApproval(makeBuiltTool({ prepareApproval, handler }), {
			requireApproval: true,
		});
		const initialCall = makeCtx();

		await wrapped.handler!({ id: 'abc' }, initialCall.ctx);

		const [, suspendOptions] = initialCall.suspendMock.mock.calls[0] ?? [];
		const approvedCall = makeCtx({ approved: true });
		approvedCall.ctx.continuation = suspendOptions?.continuation;
		const result = await wrapped.handler!({ id: 'abc' }, approvedCall.ctx);

		expect(prepareApproval).toHaveBeenCalledOnce();
		expect(prepareApproval).toHaveBeenCalledWith({ id: 'abc' });
		expect(handler).toHaveBeenCalledOnce();
		expect(result).toEqual({ approvalBinding: 'published-version-1' });
	});

	it('does not suspend when approval preparation rejects the input', async () => {
		const prepareApproval = vi.fn().mockRejectedValue(new Error('Current input is invalid'));
		const handler = vi.fn();
		const wrapped = wrapToolForApproval(makeBuiltTool({ prepareApproval, handler }), {
			requireApproval: true,
		});
		const { ctx, suspendMock } = makeCtx();

		await expect(wrapped.handler!({ id: 'abc' }, ctx)).rejects.toThrow('Current input is invalid');

		expect(suspendMock).not.toHaveBeenCalled();
		expect(handler).not.toHaveBeenCalled();
	});

	it('rejects an approved resume when its prepared binding is missing', async () => {
		const handler = vi.fn();
		const wrapped = wrapToolForApproval(
			makeBuiltTool({ prepareApproval: vi.fn().mockResolvedValue('version-1'), handler }),
			{ requireApproval: true },
		);
		const { ctx } = makeCtx({ approved: true });

		await expect(wrapped.handler!({ id: 'abc' }, ctx)).rejects.toThrow(
			'approval is no longer valid',
		);
		expect(handler).not.toHaveBeenCalled();
	});

	it('executes original handler when approved on resume', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx } = makeCtx({ approved: true });

		const result = await wrapped.handler!({ id: 'abc' }, ctx);

		expect(result).toEqual({ result: 'abc' });
	});

	it('returns declined message when not approved on resume', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx } = makeCtx({ approved: false });

		const result = await wrapped.handler!({ id: 'abc' }, ctx);

		expect(result).toEqual({ declined: true, message: 'Tool "testTool" was not approved' });
	});

	it("resumes an inner suspension when its approval payload matches the wrapper's payload", async () => {
		const approvalPayload = {
			type: 'approval',
			toolName: 'testTool',
			args: { id: 'parent-call' },
		};
		const continuation = { childRunId: 'child-run-1' };
		const originalHandler = vi.fn(async (_input, ctx) => {
			const interruptCtx = ctx as InterruptibleToolContext;
			if (interruptCtx.continuation === undefined) {
				return await interruptCtx.suspend(approvalPayload, { continuation });
			}
			return { resumedWith: interruptCtx.resumeData };
		});
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
			}),
			{ requireApproval: true },
		);
		const initialCall = makeCtx();
		await wrapped.handler!({ id: 'parent-call' }, initialCall.ctx);
		const [, outerSuspendOptions] = initialCall.suspendMock.mock.calls[0] ?? [];
		const outerApproval = makeCtx({ approved: true });
		outerApproval.ctx.suspendPayload = approvalPayload;
		outerApproval.ctx.continuation = outerSuspendOptions?.continuation;
		await wrapped.handler!({ id: 'parent-call' }, outerApproval.ctx);

		const innerApproval = makeCtx({ approved: true });
		innerApproval.ctx.suspendPayload = approvalPayload;
		innerApproval.ctx.continuation = continuation;
		const result = await wrapped.handler!({ id: 'parent-call' }, innerApproval.ctx);

		expect(innerApproval.suspendMock).not.toHaveBeenCalled();
		expect(result).toEqual({ resumedWith: { approved: true } });
	});

	it('preserves the approval binding and private continuation across repeated inner suspensions', async () => {
		const observedContexts: Array<{
			approvalBinding: string | undefined;
			continuation: unknown;
		}> = [];
		const originalHandler = vi.fn(async (_input, ctx) => {
			const interruptCtx = ctx as InterruptibleToolContext;
			observedContexts.push({
				approvalBinding: interruptCtx.approvalBinding,
				continuation: interruptCtx.continuation,
			});

			const continuation = interruptCtx.continuation as { stage?: string } | undefined;
			if (continuation?.stage === undefined) {
				return await interruptCtx.suspend({ stage: 'first' }, { continuation: { stage: 'first' } });
			}
			if (continuation.stage === 'first') {
				return await interruptCtx.suspend(
					{ stage: 'second' },
					{ continuation: { stage: 'second' } },
				);
			}
			return { resumedWith: interruptCtx.resumeData };
		});
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				prepareApproval: vi.fn().mockResolvedValue('published-version-1'),
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
			}),
			{ requireApproval: true },
		);
		const initialCall = makeCtx();
		await wrapped.handler!({ id: 'parent-call' }, initialCall.ctx);
		const [approvalPayload, approvalOptions] = initialCall.suspendMock.mock.calls[0] ?? [];

		const approvedCall = makeCtx({ approved: true });
		approvedCall.ctx.suspendPayload = approvalPayload;
		approvedCall.ctx.continuation = approvalOptions?.continuation;
		await wrapped.handler!({ id: 'parent-call' }, approvedCall.ctx);
		const [firstInnerPayload, firstInnerOptions] = approvedCall.suspendMock.mock.calls[0] ?? [];

		const firstInnerResume = makeCtx({ answer: 'first' });
		firstInnerResume.ctx.suspendPayload = firstInnerPayload;
		firstInnerResume.ctx.continuation = firstInnerOptions?.continuation;
		await wrapped.handler!({ id: 'parent-call' }, firstInnerResume.ctx);
		const [secondInnerPayload, secondInnerOptions] =
			firstInnerResume.suspendMock.mock.calls[0] ?? [];

		const secondInnerResume = makeCtx({ answer: 'second' });
		secondInnerResume.ctx.suspendPayload = secondInnerPayload;
		secondInnerResume.ctx.continuation = secondInnerOptions?.continuation;
		const result = await wrapped.handler!({ id: 'parent-call' }, secondInnerResume.ctx);

		expect(observedContexts).toEqual([
			{ approvalBinding: 'published-version-1', continuation: undefined },
			{ approvalBinding: 'published-version-1', continuation: { stage: 'first' } },
			{ approvalBinding: 'published-version-1', continuation: { stage: 'second' } },
		]);
		expect(result).toEqual({ resumedWith: { answer: 'second' } });
	});

	it('unwraps an approval-bound inner continuation for cancellation cleanup', async () => {
		const innerContinuation = { childRunId: 'child-run-1' };
		const onCancellation = vi.fn<NonNullable<BuiltTool['onCancellation']>>();
		const originalHandler = vi.fn(async (_input, ctx) => {
			return await (ctx as InterruptibleToolContext).suspend(
				{ stage: 'inner' },
				{ continuation: innerContinuation },
			);
		});
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				prepareApproval: vi.fn().mockResolvedValue('published-version-1'),
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
				onCancellation,
			}),
			{ requireApproval: true },
		);
		const initialCall = makeCtx();
		await wrapped.handler!({ id: 'parent-call' }, initialCall.ctx);
		const [approvalPayload, approvalOptions] = initialCall.suspendMock.mock.calls[0] ?? [];
		const approvedCall = makeCtx({ approved: true });
		approvedCall.ctx.suspendPayload = approvalPayload;
		approvedCall.ctx.continuation = approvalOptions?.continuation;
		await wrapped.handler!({ id: 'parent-call' }, approvedCall.ctx);
		const [innerPayload, innerOptions] = approvedCall.suspendMock.mock.calls[0] ?? [];

		await wrapped.onCancellation?.(
			{ id: 'parent-call' },
			{
				cancellation: { message: 'cancelled' },
				suspendPayload: innerPayload,
				continuation: innerOptions?.continuation,
			},
		);

		expect(onCancellation).toHaveBeenCalledWith(
			{ id: 'parent-call' },
			expect.objectContaining({
				approvalBinding: 'published-version-1',
				continuation: innerContinuation,
			}),
		);
	});

	it('rejects a malformed approval-bound inner continuation', async () => {
		const originalHandler = vi.fn();
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				prepareApproval: vi.fn().mockResolvedValue('published-version-1'),
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
			}),
			{ requireApproval: true },
		);
		const { ctx } = makeCtx({ answer: 'inner' });
		ctx.suspendPayload = { stage: 'inner' };
		ctx.continuation = {
			__n8nApprovalBoundInnerTool: true,
			approvalBinding: 42,
			continuation: { childRunId: 'child-run-1' },
		};

		await expect(wrapped.handler!({ id: 'parent-call' }, ctx)).rejects.toThrow(
			'approval is no longer valid',
		);
		expect(originalHandler).not.toHaveBeenCalled();
	});

	it('rejects a missing approval-bound envelope when resuming a required inner tool', async () => {
		const originalHandler = vi.fn();
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				prepareApproval: vi.fn().mockResolvedValue('published-version-1'),
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
			}),
			{ requireApproval: true },
		);
		const { ctx } = makeCtx({ answer: 'inner' });
		ctx.suspendPayload = { stage: 'inner' };
		ctx.continuation = { childRunId: 'legacy-child-run' };

		await expect(wrapped.handler!({ id: 'parent-call' }, ctx)).rejects.toThrow(
			'approval is no longer valid',
		);
		expect(originalHandler).not.toHaveBeenCalled();
	});

	it('does not run inner cancellation cleanup when the outer approval is cancelled', async () => {
		const onCancellation = vi.fn<NonNullable<BuiltTool['onCancellation']>>();
		const wrapped = wrapToolForApproval(makeBuiltTool({ onCancellation }), {
			requireApproval: true,
		});
		const { ctx, suspendMock } = makeCtx();

		await wrapped.handler!({ id: 'parent-call' }, ctx);
		const [suspendPayload, suspendOptions] = suspendMock.mock.calls[0] ?? [];
		await wrapped.onCancellation?.(
			{ id: 'parent-call' },
			{
				cancellation: { message: 'cancelled' },
				suspendPayload,
				continuation: suspendOptions?.continuation,
			},
		);

		expect(onCancellation).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// wrapToolForApproval — needsApprovalFn
// ---------------------------------------------------------------------------

describe('wrapToolForApproval — needsApprovalFn', () => {
	it('does not suspend when needsApprovalFn returns false', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, {
			needsApprovalFn: async () => {
				return await Promise.resolve(false);
			},
		});
		const { ctx, suspendMock } = makeCtx(); // resumeData = undefined

		const result = await wrapped.handler!({ id: 'safe' }, ctx);

		expect(suspendMock).not.toHaveBeenCalled();
		expect(result).toEqual({ result: 'safe' });
	});

	it('suspends when needsApprovalFn returns true', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, {
			needsApprovalFn: async (args) => {
				return await Promise.resolve((args as { id: string }).id === 'secret');
			},
		});
		const { ctx, suspendMock } = makeCtx(); // resumeData = undefined

		await wrapped.handler!({ id: 'secret' }, ctx);

		expect(suspendMock).toHaveBeenCalledWith(
			{ type: 'approval', toolName: 'testTool', args: { id: 'secret' } },
			expect.objectContaining({ resumeSchema: expect.anything() }),
		);
	});

	it('does not suspend when needsApprovalFn returns false for non-matching args', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, {
			needsApprovalFn: async (args) => {
				return await Promise.resolve((args as { id: string }).id === 'secret');
			},
		});
		const { ctx, suspendMock } = makeCtx();

		const result = await wrapped.handler!({ id: 'public' }, ctx);

		expect(suspendMock).not.toHaveBeenCalled();
		expect(result).toEqual({ result: 'public' });
	});

	it('resumes a raw inner continuation when conditional approval was not needed', async () => {
		const innerContinuation = { childRunId: 'unapproved-child-run' };
		const prepareApproval = vi.fn().mockResolvedValue('published-version-1');
		const originalHandler = vi.fn(async (_input, ctx) => {
			const interruptCtx = ctx as InterruptibleToolContext;
			if (interruptCtx.continuation === undefined) {
				return await interruptCtx.suspend({ stage: 'inner' }, { continuation: innerContinuation });
			}
			return {
				approvalBinding: interruptCtx.approvalBinding,
				continuation: interruptCtx.continuation,
			};
		});
		const wrapped = wrapToolForApproval(
			makeBuiltTool({
				prepareApproval,
				suspendSchema: z.unknown(),
				resumeSchema: z.unknown(),
				handler: originalHandler,
			}),
			{ needsApprovalFn: () => false },
		);
		const initialCall = makeCtx();

		await wrapped.handler!({ id: 'public' }, initialCall.ctx);
		const [innerPayload, innerOptions] = initialCall.suspendMock.mock.calls[0] ?? [];
		const innerResume = makeCtx({ answer: 'continue' });
		innerResume.ctx.suspendPayload = innerPayload;
		innerResume.ctx.continuation = innerOptions?.continuation;
		const result = await wrapped.handler!({ id: 'public' }, innerResume.ctx);

		expect(prepareApproval).not.toHaveBeenCalled();
		expect(result).toEqual({
			approvalBinding: undefined,
			continuation: innerContinuation,
		});
	});

	it('emits tool execution start with the original structured args when approval is not needed', async () => {
		const baseTool = makeBuiltTool({
			inputSchema: z.object({
				id: z.string(),
				password: z.string(),
				nested: z.object({ apiKey: z.string() }),
			}),
		});
		const wrapped = wrapToolForApproval(baseTool, {
			needsApprovalFn: async () => await Promise.resolve(false),
		});
		const { ctx } = makeCtx();
		const emitEvent = vi.fn();
		ctx.toolCallId = 'tool-call-1';
		ctx.emitEvent = emitEvent;
		const input = {
			id: 'public',
			password: 'plain-secret-password',
			nested: { apiKey: 'secret-api-key' },
		};

		await wrapped.handler!(input, ctx);

		expect(emitEvent).toHaveBeenCalledWith({
			type: 'tool_execution_start',
			toolCallId: 'tool-call-1',
			toolName: 'testTool',
			args: input,
		});
	});
});

// ---------------------------------------------------------------------------
// wrapToolForApproval — config: { requireApproval: true }
// ---------------------------------------------------------------------------

describe('wrapToolForApproval — config: { requireApproval: true }', () => {
	it('always suspends regardless of original tool settings', async () => {
		const baseTool = makeBuiltTool();
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx, suspendMock } = makeCtx(); // resumeData = undefined

		await wrapped.handler!({ id: 'any-id' }, ctx);

		expect(suspendMock).toHaveBeenCalledWith(
			{ type: 'approval', toolName: 'testTool', args: { id: 'any-id' } },
			expect.objectContaining({ resumeSchema: expect.anything() }),
		);
	});
});

// ---------------------------------------------------------------------------
// wrapToolForApproval — telemetry propagation
// ---------------------------------------------------------------------------

describe('wrapToolForApproval — telemetry propagation', () => {
	const fakeTelemetry: BuiltTelemetry = {
		enabled: true,
		functionId: 'parent-agent',
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		tracer: { startSpan: vi.fn() },
	};

	it('forwards parentTelemetry to the original handler when approval is not needed', async () => {
		let capturedCtx: ToolContext | undefined;
		const baseTool = makeBuiltTool({
			handler: async (_input, ctx) => {
				capturedCtx = ctx as ToolContext;
				return await Promise.resolve({ result: 'ok' });
			},
		});
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: false });
		const { ctx } = makeCtx(); // no resumeData
		ctx.parentTelemetry = fakeTelemetry;

		await wrapped.handler!({ id: 'test' }, ctx);

		expect(capturedCtx).toBeDefined();
		expect(capturedCtx!.parentTelemetry).toBe(fakeTelemetry);
	});

	it('forwards parentTelemetry to the original handler after approval', async () => {
		let capturedCtx: ToolContext | undefined;
		const baseTool = makeBuiltTool({
			handler: async (_input, ctx) => {
				capturedCtx = ctx as ToolContext;
				return await Promise.resolve({ result: 'ok' });
			},
		});
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx } = makeCtx({ approved: true }); // resumeData = approved
		ctx.parentTelemetry = fakeTelemetry;

		await wrapped.handler!({ id: 'test' }, ctx);

		expect(capturedCtx).toBeDefined();
		expect(capturedCtx!.parentTelemetry).toBe(fakeTelemetry);
	});

	it('forwards the full ToolContext to the original handler after approval', async () => {
		let capturedCtx: ToolContext | undefined;
		const baseTool = makeBuiltTool({
			handler: async (_input, ctx) => {
				capturedCtx = ctx as ToolContext;
				return await Promise.resolve({ result: 'ok' });
			},
		});
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: true });
		const { ctx } = makeCtx({ approved: true });
		const abortController = new AbortController();
		const emitEvent = vi.fn();
		ctx.parentTelemetry = fakeTelemetry;
		ctx.runId = 'parent-run-1';
		ctx.toolCallId = 'tool-call-1';
		ctx.persistence = { resourceId: 'resource-1', threadId: 'thread-1' };
		ctx.emitEvent = emitEvent;
		ctx.abortSignal = abortController.signal;

		await wrapped.handler!({ id: 'test' }, ctx);

		expect(capturedCtx).toEqual({
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
			persistence: { resourceId: 'resource-1', threadId: 'thread-1' },
			parentTelemetry: fakeTelemetry,
			emitEvent,
			abortSignal: abortController.signal,
			suspend: ctx.suspend,
			resumeData: { approved: true },
		});
	});

	it('forwards the full ToolContext when approval is not needed', async () => {
		let capturedCtx: ToolContext | undefined;
		const baseTool = makeBuiltTool({
			handler: async (_input, ctx) => {
				capturedCtx = ctx as ToolContext;
				return await Promise.resolve({ result: 'ok' });
			},
		});
		const wrapped = wrapToolForApproval(baseTool, { requireApproval: false });
		const { ctx } = makeCtx();
		ctx.runId = 'parent-run-2';
		ctx.toolCallId = 'tool-call-2';

		await wrapped.handler!({ id: 'test' }, ctx);

		expect(capturedCtx?.runId).toBe('parent-run-2');
		expect(capturedCtx?.toolCallId).toBe('tool-call-2');
	});
});
