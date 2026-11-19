import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type {
	AgentContextReader,
	AgentContextResult,
	AgentSessionDetail,
	AgentSessionTurn,
} from '@/modules/agents/agent-context.contracts';

import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';

vi.mock('@/modules/agents/agent-context.service', () => ({
	AgentContextService: class AgentContextService {},
}));

function makeTurn(overrides: Partial<AgentSessionTurn> = {}): AgentSessionTurn {
	return {
		id: 'turn-1',
		status: 'success',
		userMessage: 'Help me',
		model: 'test',
		duration: 100,
		totalTokens: 10,
		error: null,
		timeline: [{ type: 'text', content: 'Done', timestamp: 1 }],
		...overrides,
	};
}

function makeSessionDetail(executions: AgentSessionTurn[]): AgentSessionDetail {
	return {
		thread: {
			id: 'session-1',
			agentId: 'agent-1',
			agentName: 'Support',
			title: 'Question',
			sessionNumber: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		executions,
	};
}

function setup(executions: AgentSessionTurn[]) {
	const agents = mock<AgentContextService>();
	const reader = mock<AgentContextReader>();
	agents.createReader.mockReturnValue(reader);
	reader.lookup.mockResolvedValue({
		session: { threadId: 'session-1' },
		sessionDetail: makeSessionDetail(executions),
	});
	const adapter = new InstanceAiAgentContextAdapterService(agents).createReader(
		mock<User>(),
		'project-1',
	);
	return { adapter, reader };
}

const sessionInput = { type: 'session' as const, agentId: 'agent-1', threadId: 'session-1' };

function toolTurn(output: string): AgentSessionTurn {
	return makeTurn({
		timeline: [
			{
				type: 'tool-call',
				kind: 'tool',
				name: 'search_orders',
				toolCallId: 'tc-1',
				input: { query: 'open orders' },
				output,
				startTime: 1000,
				endTime: 1500,
				success: true,
			},
		],
	});
}

describe('InstanceAiAgentContextAdapterService', () => {
	it('formats a requested session without returning the raw session data', async () => {
		const { adapter, reader } = setup([makeTurn()]);
		const input = { ...sessionInput, executionId: 'turn-1' };

		expect(await adapter.lookup(input)).toEqual({
			session: { threadId: 'session-1' },
			transcript: expect.stringContaining('Done'),
		});
		expect(await adapter.lookup({ ...input, executionId: 'missing' })).toEqual({ notFound: true });

		const notFound: AgentContextResult = { notFound: true };
		reader.lookup.mockResolvedValue(notFound);
		expect(await adapter.lookup(input)).toEqual(notFound);
	});

	it('cuts tool values without the page inputs', async () => {
		const { adapter } = setup([toolTurn('o'.repeat(5_000))]);

		const result = await adapter.lookup(sessionInput);

		expect(result.transcript).toContain('… [truncated]');
		expect(result).not.toHaveProperty('nextCursor');
	});

	it('returns complete tool values in pages', async () => {
		const output = 'o'.repeat(100_000);
		const { adapter } = setup([toolTurn(output)]);
		const pages: string[] = [];
		let cursor: string | undefined;

		do {
			const result = await adapter.lookup({
				...sessionInput,
				maxToolValueLength: 10_000_000,
				cursor,
			});
			expect(result.session).toEqual({ threadId: 'session-1' });
			pages.push(String(result.transcript));
			cursor = typeof result.nextCursor === 'string' ? result.nextCursor : undefined;
		} while (cursor !== undefined);

		expect(pages.length).toBeGreaterThan(1);
		expect(pages.join('')).toContain(`  Output: "${output}"\n`);
	});

	it('shows only the tool call header when maxToolValueLength is 0', async () => {
		const { adapter } = setup([toolTurn('secret output')]);

		const result = await adapter.lookup({ ...sessionInput, maxToolValueLength: 0 });

		expect(result.transcript).toContain('Tool call: search_orders | kind=tool | succeeded');
		expect(result.transcript).not.toContain('Output:');
		expect(result.nextCursor).toBeNull();
	});

	it('scopes pages to one turn and its resumed parts', async () => {
		const { adapter } = setup([
			makeTurn({ id: 'turn-1', userMessage: 'First question' }),
			makeTurn({ id: 'turn-1-resumed', userMessage: null }),
			makeTurn({ id: 'turn-2', userMessage: 'Second question' }),
		]);
		const input = { ...sessionInput, executionId: 'turn-1-resumed', maxToolValueLength: 100 };

		const result = await adapter.lookup(input);

		expect(result.transcript).toContain('First question');
		expect(result.transcript).toMatch(/turns: 2/);
		expect(result.transcript).not.toContain('Second question');
		expect(result.nextCursor).toBeNull();
		expect(await adapter.lookup({ ...input, executionId: 'missing' })).toEqual({ notFound: true });
	});

	it('rejects a cursor that does not match the transcript', async () => {
		const { adapter, reader } = setup([toolTurn('o'.repeat(100_000))]);
		const first = await adapter.lookup({ ...sessionInput, maxToolValueLength: 10_000_000 });
		const cursor = String(first.nextCursor);

		await expect(adapter.lookup({ ...sessionInput, cursor: 'not-a-cursor' })).rejects.toThrow(
			UserError,
		);
		await expect(
			adapter.lookup({ ...sessionInput, maxToolValueLength: 0, cursor }),
		).rejects.toThrow('The cursor does not match this transcript.');
		await expect(
			adapter.lookup({
				...sessionInput,
				executionId: 'turn-1',
				maxToolValueLength: 10_000_000,
				cursor,
			}),
		).rejects.toThrow(UserError);

		reader.lookup.mockResolvedValue({
			session: { threadId: 'session-1' },
			sessionDetail: makeSessionDetail([toolTurn('changed'.repeat(20_000))]),
		});
		await expect(
			adapter.lookup({ ...sessionInput, maxToolValueLength: 10_000_000, cursor }),
		).rejects.toThrow(UserError);
	});
});
