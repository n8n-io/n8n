import { AgentExecutionListPublicDto, ListAgentExecutionsPublicQueryDto } from '../dto';

describe('ListAgentExecutionsPublicQueryDto', () => {
	it('accepts cursor, limit, session, and status filters', () => {
		expect(
			ListAgentExecutionsPublicQueryDto.parse({ limit: '10', sessionId: 'session-1' }),
		).toEqual({ limit: 10, sessionId: 'session-1' });
		expect(ListAgentExecutionsPublicQueryDto.parse({ status: 'running', cursor: 'abc' })).toEqual({
			limit: 100,
			status: 'running',
			cursor: 'abc',
		});
	});

	it('rejects an unknown status and a blank session id', () => {
		expect(ListAgentExecutionsPublicQueryDto.safeParse({ status: 'queued' }).success).toBe(false);
		expect(ListAgentExecutionsPublicQueryDto.safeParse({ sessionId: '' }).success).toBe(false);
	});
});

describe('AgentExecutionListPublicDto', () => {
	it('parses a full row: run identity, source, times, and usage', () => {
		const row = {
			executionId: 'execution-1',
			sessionId: 'session-1',
			status: 'success',
			source: 'public_api',
			createdAt: '2026-11-19T14:00:00.000Z',
			startedAt: '2026-11-19T14:00:01.000Z',
			stoppedAt: '2026-11-19T14:00:02.000Z',
			usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: 0.1 },
		};

		expect(AgentExecutionListPublicDto.parse({ data: [row], nextCursor: null })).toEqual({
			data: [row],
			nextCursor: null,
		});
	});

	it('accepts a null source and null times', () => {
		expect(
			AgentExecutionListPublicDto.safeParse({
				data: [
					{
						executionId: 'execution-2',
						sessionId: 'session-1',
						status: 'running',
						source: null,
						createdAt: '2026-11-19T14:00:00.000Z',
						startedAt: null,
						stoppedAt: null,
						usage: {
							promptTokens: null,
							completionTokens: null,
							totalTokens: null,
							cost: null,
						},
					},
				],
				nextCursor: null,
			}).success,
		).toBe(true);
	});
});
