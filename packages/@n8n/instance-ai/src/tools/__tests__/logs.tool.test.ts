import { isZodSchema } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { OperatorLogRecord } from '@n8n/api-types';
import type { Mock, MockedFunction } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { writeWorkspaceFile } from '../../workspace/workspace-files';
import type { InstanceAiLogQueryPort, RedactedLogPage } from '../log-query.port';
import { createLogsTool } from '../logs.tool';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../workspace/workspace-files', () => ({
	writeWorkspaceFile: vi.fn(),
}));

const mockGetRoot = getWorkspaceRoot as MockedFunction<typeof getWorkspaceRoot>;
const mockWriteWorkspaceFile = writeWorkspaceFile as MockedFunction<typeof writeWorkspaceFile>;

// ── Fixtures ───────────────────────────────────────────────────────────────

function createRecord(overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord {
	return {
		seq: 1,
		ts: '2026-08-12T10:00:00.000Z',
		hostId: 'main-1',
		role: 'main',
		stream: 'log',
		level: 'error',
		origin: 'live',
		message: 'connect ECONNREFUSED 127.0.0.1:5432',
		...overrides,
	};
}

function createPage(records: OperatorLogRecord[], overrides: Partial<RedactedLogPage> = {}) {
	return {
		records,
		nextCursor: 'cursor-2',
		gap: false,
		redaction: { applied: true, redactor: 'test-redactor' },
		...overrides,
	} satisfies RedactedLogPage;
}

function createPort(overrides: Partial<InstanceAiLogQueryPort> = {}): InstanceAiLogQueryPort {
	return {
		read: vi.fn().mockResolvedValue(createPage([createRecord()])),
		readContext: vi.fn().mockResolvedValue(createPage([createRecord()])),
		...overrides,
	};
}

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		logQueryService: createPort(),
		workspace: { sandbox: { executeCommand: vi.fn() } },
		...overrides,
	} as unknown as InstanceAiContext;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('logs tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetRoot.mockResolvedValue('/home/user/workspace');
		mockWriteWorkspaceFile.mockResolvedValue(undefined);
	});

	describe('availability', () => {
		it('returns a stub tool when the host wired no log query port', async () => {
			const context = createMockContext({ logQueryService: undefined });

			const tool = createLogsTool(context);
			const result = await executeTool<{ error: string }>(tool, { action: 'search' }, {} as never);

			expect(tool.name).toBe('logs');
			expect(result.error).toContain('not enabled');
		});

		it('steers the agent towards snapshot + grep in its description', () => {
			const tool = createLogsTool(createMockContext());

			expect(tool.description).toContain('snapshot');
			expect(tool.description).toContain('rg');
			// `context` is load-bearing for debugging, so the description must say so.
			expect(tool.description).toContain('neighbours');
		});
	});

	// ── search ──────────────────────────────────────────────────────────────

	describe('search action', () => {
		it('maps query to a substring filter and applies the default limit', async () => {
			const context = createMockContext();
			const port = context.logQueryService!;

			const tool = createLogsTool(context);
			const result = await executeTool<{ count: number; nextCursor: string }>(
				tool,
				{ action: 'search', query: 'ECONNREFUSED' },
				{} as never,
			);

			expect(port.read).toHaveBeenCalledWith({
				filter: {
					executionId: undefined,
					hostIds: undefined,
					roles: undefined,
					minLevel: undefined,
					grep: 'ECONNREFUSED',
				},
				limit: 50,
				cursor: undefined,
				abortSignal: undefined,
			});
			expect(result.count).toBe(1);
			expect(result.nextCursor).toBe('cursor-2');
		});

		it('passes filters, cursor and limit through to the port', async () => {
			const context = createMockContext();
			const port = context.logQueryService!;

			const tool = createLogsTool(context);
			await executeTool(
				tool,
				{
					action: 'search',
					query: 'timeout',
					executionId: '1234',
					hostIds: ['worker-2'],
					roles: ['worker'],
					minLevel: 'warn',
					cursor: 'cursor-1',
					limit: 10,
				},
				{} as never,
			);

			expect(port.read).toHaveBeenCalledWith({
				filter: {
					executionId: '1234',
					hostIds: ['worker-2'],
					roles: ['worker'],
					minLevel: 'warn',
					grep: 'timeout',
				},
				limit: 10,
				cursor: 'cursor-1',
				abortSignal: undefined,
			});
		});

		it('nudges towards snapshot when the result fills the limit', async () => {
			const context = createMockContext();
			(context.logQueryService!.read as Mock).mockResolvedValue(
				createPage([createRecord({ seq: 1 }), createRecord({ seq: 2 })]),
			);

			const tool = createLogsTool(context);
			const result = await executeTool<{ hint?: string }>(
				tool,
				{ action: 'search', query: 'boom', limit: 2 },
				{} as never,
			);

			expect(result.hint).toContain('snapshot');
		});

		it('surfaces an evicted window instead of implying continuity', async () => {
			const context = createMockContext();
			(context.logQueryService!.read as Mock).mockResolvedValue(
				createPage([createRecord()], { gap: true }),
			);

			const tool = createLogsTool(context);
			const result = await executeTool<{ gap: boolean }>(
				tool,
				{ action: 'search', query: 'boom' },
				{} as never,
			);

			expect(result.gap).toBe(true);
		});
	});

	// ── context ─────────────────────────────────────────────────────────────

	describe('context action', () => {
		it('defaults to 50 lines either side of the hit', async () => {
			const context = createMockContext();
			const port = context.logQueryService!;

			const tool = createLogsTool(context);
			const result = await executeTool<{ hostId: string; seq: number; count: number }>(
				tool,
				{ action: 'context', hostId: 'worker-2', seq: 4210 },
				{} as never,
			);

			expect(port.readContext).toHaveBeenCalledWith({
				hostId: 'worker-2',
				seq: 4210,
				before: 50,
				after: 50,
				abortSignal: undefined,
			});
			expect(result).toMatchObject({ hostId: 'worker-2', seq: 4210, count: 1 });
		});

		it('honours explicit before/after windows', async () => {
			const context = createMockContext();
			const port = context.logQueryService!;

			const tool = createLogsTool(context);
			await executeTool(
				tool,
				{ action: 'context', hostId: 'main-1', seq: 10, before: 0, after: 5 },
				{} as never,
			);

			expect(port.readContext).toHaveBeenCalledWith({
				hostId: 'main-1',
				seq: 10,
				before: 0,
				after: 5,
				abortSignal: undefined,
			});
		});
	});

	// ── snapshot ────────────────────────────────────────────────────────────

	describe('snapshot action', () => {
		it('writes JSONL where it says it did', async () => {
			const records = [createRecord({ seq: 1 }), createRecord({ seq: 2, level: 'warn' })];
			const context = createMockContext();
			(context.logQueryService!.read as Mock).mockResolvedValue(createPage(records));

			const tool = createLogsTool(context);
			const result = await executeTool<{ path: string; lineCount: number; truncated: boolean }>(
				tool,
				{ action: 'snapshot', filter: { executionId: '1234' } },
				{} as never,
			);

			expect(result.path).toMatch(
				/^\/home\/user\/workspace\/logs\/snapshot-[A-Za-z0-9_-]{8}\.jsonl$/,
			);
			expect(result.lineCount).toBe(2);
			expect(result.truncated).toBe(false);

			expect(mockWriteWorkspaceFile).toHaveBeenCalledTimes(1);
			const [workspace, writtenPath, content] = mockWriteWorkspaceFile.mock.calls[0];
			expect(workspace).toBe(context.workspace);
			// The returned path is the path actually written — not a prettified one.
			expect(writtenPath).toBe(result.path);
			expect(content).toBe(`${JSON.stringify(records[0])}\n${JSON.stringify(records[1])}\n`);
		});

		it('applies the executionId filter to the read', async () => {
			const context = createMockContext();
			const port = context.logQueryService!;

			const tool = createLogsTool(context);
			await executeTool(tool, { action: 'snapshot', filter: { executionId: '1234' } }, {} as never);

			expect(port.read).toHaveBeenCalledWith(
				expect.objectContaining({
					filter: expect.objectContaining({ executionId: '1234' }),
				}),
			);
		});

		it('requests one line over the cap and reports truncation', async () => {
			const context = createMockContext();
			const records = Array.from({ length: 4 }, (_, index) => createRecord({ seq: index + 1 }));
			(context.logQueryService!.read as Mock).mockResolvedValue(createPage(records));

			const tool = createLogsTool(context);
			const result = await executeTool<{ lineCount: number; truncated: boolean }>(
				tool,
				{ action: 'snapshot', maxLines: 3 },
				{} as never,
			);

			expect(context.logQueryService!.read).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 4 }),
			);
			expect(result.truncated).toBe(true);
			expect(result.lineCount).toBe(3);

			// The newest lines are the ones worth keeping.
			const content = mockWriteWorkspaceFile.mock.calls[0][2];
			expect(content).toBe(
				`${records
					.slice(1)
					.map((record) => JSON.stringify(record))
					.join('\n')}\n`,
			);
		});

		it('defaults the cap to 5000 lines', async () => {
			const context = createMockContext();

			const tool = createLogsTool(context);
			await executeTool(tool, { action: 'snapshot' }, {} as never);

			expect(context.logQueryService!.read).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 5001 }),
			);
		});

		it("clamps the requested cap to the host's ceiling", async () => {
			const context = createMockContext({
				logQueryService: createPort({ maxSnapshotLines: 100 }),
			});

			const tool = createLogsTool(context);
			await executeTool(tool, { action: 'snapshot', maxLines: 4000 }, {} as never);

			expect(context.logQueryService!.read).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 101 }),
			);
		});

		it('rejects a cap above the hard maximum at the schema level', () => {
			const tool = createLogsTool(createMockContext());
			const schema = tool.inputSchema;

			expect(isZodSchema(schema)).toBe(true);
			expect(
				isZodSchema(schema) && schema.safeParse({ action: 'snapshot', maxLines: 5001 }).success,
			).toBe(false);
			expect(
				isZodSchema(schema) && schema.safeParse({ action: 'snapshot', maxLines: 5000 }).success,
			).toBe(true);
		});

		it('reports an error instead of writing when there is no sandbox', async () => {
			const context = createMockContext({ workspace: undefined });

			const tool = createLogsTool(context);
			const result = await executeTool<{ path: string; error?: string }>(
				tool,
				{ action: 'snapshot' },
				{} as never,
			);

			expect(result.path).toBe('');
			expect(result.error).toContain('sandbox');
			expect(mockWriteWorkspaceFile).not.toHaveBeenCalled();
		});

		it('reports a write failure rather than a phantom path', async () => {
			mockWriteWorkspaceFile.mockRejectedValue(new Error('sandbox gone'));
			const context = createMockContext();

			const tool = createLogsTool(context);
			const result = await executeTool<{ path: string; error?: string }>(
				tool,
				{ action: 'snapshot' },
				{} as never,
			);

			expect(result.path).toBe('');
			expect(result.error).toContain('sandbox gone');
		});
	});

	// ── redaction contract ──────────────────────────────────────────────────

	describe('redaction attestation', () => {
		it.each(['search', 'context', 'snapshot'] as const)(
			'refuses to return %s results from a port that did not attest redaction',
			async (action) => {
				const unattested = { records: [createRecord()], nextCursor: 'c', gap: false };
				const context = createMockContext({
					logQueryService: {
						read: vi.fn().mockResolvedValue(unattested),
						readContext: vi.fn().mockResolvedValue(unattested),
					},
				});

				const tool = createLogsTool(context);
				const input = {
					search: { action: 'search', query: 'x' },
					context: { action: 'context', hostId: 'main-1', seq: 1 },
					snapshot: { action: 'snapshot' },
				}[action];

				await expect(executeTool(tool, input, {} as never)).rejects.toThrow(
					/redaction attestation/,
				);
				expect(mockWriteWorkspaceFile).not.toHaveBeenCalled();
			},
		);
	});
});
