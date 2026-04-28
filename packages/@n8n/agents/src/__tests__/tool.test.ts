import { z } from 'zod';

import { Tool, wrapToolForApproval } from '../sdk/tool';
import type { BuiltTelemetry, BuiltTool, InterruptibleToolContext, ToolContext } from '../types';

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

function makeCtx(resumeData?: unknown): { ctx: InterruptibleToolContext; suspendMock: jest.Mock } {
	const suspendMock = jest.fn().mockImplementation(async (payload: unknown) => {
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
});

// ---------------------------------------------------------------------------
// wrapToolForApproval — config: { requireApproval: true } (agent-level wrapping)
// ---------------------------------------------------------------------------

describe('wrapToolForApproval — config: { requireApproval: true } (agent-level wrapping)', () => {
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
		tracer: { startSpan: jest.fn() },
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
});
