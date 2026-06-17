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

		expect(suspendMock).toHaveBeenCalledWith({
			type: 'approval',
			toolName: 'testTool',
			args: { id: '1' },
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

		expect(suspendMock).toHaveBeenCalledWith({
			type: 'approval',
			toolName: 'testTool',
			displayName: 'Display test tool',
			args: { id: '1' },
		});
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

		expect(suspendMock).toHaveBeenCalledWith({
			type: 'approval',
			toolName: 'testTool',
			args: { id: 'secret' },
		});
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

		expect(suspendMock).toHaveBeenCalledWith({
			type: 'approval',
			toolName: 'testTool',
			args: { id: 'any-id' },
		});
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
