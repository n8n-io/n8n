import { LlmUsageCallsQueryDto, LlmUsageQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { LlmUsageController } from '../llm-usage.controller';
import type { LlmUsageCall, LlmUsageRepository } from '../llm-usage.repository';
import { LlmUsageService } from '../llm-usage.service';

describe('LlmUsageController', () => {
	const totals = {
		calls: 2,
		unpricedCalls: 1,
		inputTokens: 30,
		outputTokens: 10,
		cacheReadTokens: 0,
		costUsd: 0.5,
	};
	const range = { from: new Date('2026-09-22T00:00:00Z'), to: new Date('2026-10-22T00:00:00Z') };
	const repository = mock<LlmUsageRepository>();
	const controller = new LlmUsageController(new LlmUsageService(repository));
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		vi.useFakeTimers({ now: range.to, toFake: ['Date'] });
		repository.dailyTotals.mockResolvedValue([
			{ date: '2026-10-01', ...totals, calls: 1, costUsd: 0.2 },
			{ date: '2026-10-02', ...totals, calls: 1, costUsd: 0.3 },
		]);
		repository.totalsByGroup.mockImplementation(async ({ groupBy }) => [
			{ key: `${groupBy}-1`, label: groupBy, ...totals },
		]);
		repository.listCalls.mockResolvedValue({
			count: 40,
			items: [
				mock<LlmUsageCall>({
					callId: 'c-1',
					startedAt: null,
					finishedAt: new Date('2026-10-01T10:00:00Z'),
				}),
			],
		});
	});

	afterEach(() => vi.useRealTimers());

	it('summarizes the last 30 days with totals, days and the top five of each group', async () => {
		const response = await controller.getSummary(req, res, LlmUsageQueryDto.parse({}));

		expect(repository.dailyTotals).toHaveBeenCalledWith(range);
		for (const groupBy of ['workflow', 'agent', 'model', 'caller', 'user']) {
			expect(repository.totalsByGroup).toHaveBeenCalledWith({ ...range, groupBy, limit: 5 });
		}
		expect(response).toEqual({
			// The range total is the sum of its days.
			totals: {
				calls: 2,
				unpricedCalls: 2,
				inputTokens: 60,
				outputTokens: 20,
				cacheReadTokens: 0,
				costUsd: 0.5,
			},
			daily: [
				{ date: '2026-10-01', calls: 1, costUsd: 0.2 },
				{ date: '2026-10-02', calls: 1, costUsd: 0.3 },
			],
			top: {
				workflow: [expect.objectContaining({ key: 'workflow-1' })],
				agent: [expect.objectContaining({ key: 'agent-1' })],
				model: [expect.objectContaining({ key: 'model-1' })],
				caller: [expect.objectContaining({ key: 'caller-1' })],
				user: [expect.objectContaining({ key: 'user-1' })],
			},
		});
	});

	it('lists one page of calls, newest first by default', async () => {
		const response = await controller.getCalls(req, res, LlmUsageCallsQueryDto.parse({}));

		expect(repository.listCalls).toHaveBeenCalledWith({
			...range,
			skip: 0,
			take: 25,
			sortBy: 'finishedAt',
			sortOrder: 'desc',
		});
		expect(response).toEqual({
			count: 40,
			items: [
				expect.objectContaining({
					callId: 'c-1',
					startedAt: null,
					finishedAt: '2026-10-01T10:00:00.000Z',
				}),
			],
		});
	});

	it('passes the range, page and sort through', async () => {
		await controller.getCalls(
			req,
			res,
			LlmUsageCallsQueryDto.parse({
				days: '7',
				skip: '50',
				take: '25',
				sortBy: 'estimatedCostUsd',
				sortOrder: 'asc',
			}),
		);

		expect(repository.listCalls).toHaveBeenCalledWith({
			from: new Date('2026-10-15T00:00:00Z'),
			to: range.to,
			skip: 50,
			take: 25,
			sortBy: 'estimatedCostUsd',
			sortOrder: 'asc',
		});
	});

	it('rejects an unknown range or sort column', () => {
		expect(LlmUsageQueryDto.safeParse({ days: '5' }).success).toBe(false);
		expect(LlmUsageCallsQueryDto.safeParse({ sortBy: 'callId' }).success).toBe(false);
	});
});
