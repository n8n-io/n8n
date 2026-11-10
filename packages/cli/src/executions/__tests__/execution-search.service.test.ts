import type { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { ExecutionsConfig } from '@n8n/config';
import type { ExecutionRepository, ExecutionSummaries, IExecutionResponse, User } from '@n8n/db';
import { TooManyRequestsError } from '@n8n/errors';
import type { ExecutionSummary, IDataObject } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { encodeExecutionCursor, parseExecutionCursor } from '../execution-cursor';
import { MissingExecutionDataError } from '../execution-data/missing-execution-data.error';
import type { ExecutionPersistence } from '../execution-persistence';
import { ExecutionSearchService } from '../execution-search.service';

type Candidate = ExecutionSummaries.SearchCandidate;

const MB = 1024 * 1024;
const PAGE_SIZE = 500;

describe('ExecutionSearchService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const redaction = mock<ExecutionRedactionServiceProxy>();
	const executionsConfig = mock<ExecutionsConfig>({ maxDisplaySize: 100 * MB });
	const user = mock<User>({ id: 'user-1' });

	let service: ExecutionSearchService;

	const query = (limit = 20): ExecutionSummaries.RangeQuery => ({
		kind: 'range',
		range: { limit },
		user,
		workflowId: 'wf-1',
		order: { startedAt: 'DESC' },
	});

	const candidate = (id: number, overrides: Partial<Candidate> = {}): Candidate => ({
		id: String(id),
		workflowId: 'wf-1',
		storedAt: 'db',
		jsonSizeBytes: 1024,
		startedAt: new Date(Date.UTC(2026, 0, 1) + id * 1000).toISOString(),
		...overrides,
	});

	/** Candidates with the IDs `from` down to `to`. */
	const candidates = (from: number, to: number, overrides: Partial<Candidate> = {}) =>
		Array.from({ length: from - to + 1 }, (_, index) => candidate(from - index, overrides));

	const execution = (id: string, json: IDataObject) => {
		const data = createEmptyRunExecutionData();
		data.resultData.runData = {
			Webhook: [
				{
					startTime: 0,
					executionIndex: 0,
					executionTime: 1,
					executionStatus: 'success',
					source: [],
					data: { main: [[{ json }]] },
				},
			],
		};
		return {
			id,
			mode: 'webhook',
			workflowId: 'wf-1',
			data,
			workflowData: { nodes: [{ id: 'node-1', name: 'Webhook' }], settings: {} },
		} as unknown as IExecutionResponse;
	};

	/** Serve the history as pages, as the repository does with `beforeId` and `limit`. */
	const givenHistory = (history: Candidate[]) => {
		executionRepository.findSearchCandidates.mockImplementation(async ({ range }) =>
			history
				.filter((c) => range.beforeId === undefined || Number(c.id) < Number(range.beforeId))
				.slice(0, range.limit),
		);
	};

	/** Executions whose stored data holds the text, with the item JSON that a reader sees. */
	const givenStoredData = (visibleJsonById: Record<string, IDataObject>) => {
		executionPersistence.findIdsWithDataContaining.mockImplementation(
			async (refs) => new Set(refs.map((r) => r.executionId).filter((id) => id in visibleJsonById)),
		);
		executionPersistence.findOneInWorkflows.mockImplementation(async (id) =>
			execution(id, visibleJsonById[id]),
		);
	};

	const filteredIds = () =>
		executionPersistence.findIdsWithDataContaining.mock.calls.map(([refs]) =>
			refs.map((r) => r.executionId),
		);

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useRealTimers();
		service = new ExecutionSearchService(
			executionRepository,
			executionPersistence,
			redaction,
			executionsConfig,
		);
		redaction.processExecution.mockImplementation(async (e) => e);
		executionRepository.findSummariesByIds.mockImplementation(async (_, ids) =>
			ids.map((id) => ({ id }) as ExecutionSummary),
		);
		givenHistory([]);
		givenStoredData({});
	});

	it('returns the matches with their place in the data and reports the end of the history', async () => {
		givenHistory(candidates(5, 1));
		givenStoredData({ '4': { url: 'https://example.com/ENG-123' }, '2': { key: 'eng-123' } });

		const page = await service.search(query(), { text: 'ENG-123' });

		expect(page.results.map((r) => [r.id, r.match.path])).toEqual([
			['4', 'url'],
			['2', 'key'],
		]);
		expect(page.results[0].match).toMatchObject({
			nodeName: 'Webhook',
			nodeId: 'node-1',
			source: 'output',
		});
		expect(page).toMatchObject({
			nextCursor: null,
			searchedCount: 5,
			searchedBackTo: candidate(1).startedAt,
		});
	});

	it('pages candidates newest first by ID with the filters of the list', async () => {
		givenHistory(candidates(5, 1));

		await service.search(query(), { text: 'ENG-123' });

		expect(executionRepository.findSearchCandidates).toHaveBeenCalledWith({
			...query(),
			order: undefined,
			range: { limit: PAGE_SIZE, beforeId: undefined },
		});
	});

	it('filters the stored data with the text as the stored JSON has it', async () => {
		givenHistory(candidates(2, 1));

		await service.search(query(), { text: 'Say "Hi"\\now', nodeName: 'My "Node"' });

		expect(executionPersistence.findIdsWithDataContaining).toHaveBeenCalledWith(
			[
				{ executionId: '2', workflowId: 'wf-1', storedAt: 'db' },
				{ executionId: '1', workflowId: 'wf-1', storedAt: 'db' },
			],
			[
				{ text: '"My \\"Node\\"":', ignoreAsciiCase: false },
				{ text: 'say \\"hi\\"\\\\now', ignoreAsciiCase: true },
			],
		);
	});

	it('does not match stored data that the reader cannot see', async () => {
		givenHistory(candidates(3, 1));
		givenStoredData({ '3': { secret: 'ENG-123' }, '1': { open: 'ENG-123' } });
		redaction.processExecution.mockImplementation(async (e) => {
			if (e.id === '3') e.data.resultData.runData.Webhook[0].data = { main: [[{ json: {} }]] };
			return e;
		});

		const page = await service.search(query(), { text: 'ENG-123' });

		expect(redaction.processExecution).toHaveBeenCalledWith(expect.anything(), { user });
		expect(page.results.map((r) => r.id)).toEqual(['1']);
	});

	it('loads an execution for examination within the display size limit', async () => {
		givenHistory(candidates(1, 1));
		givenStoredData({ '1': { key: 'ENG-123' } });

		await service.search(query(), { text: 'ENG-123' });

		expect(executionPersistence.findOneInWorkflows).toHaveBeenCalledWith('1', ['wf-1'], {
			includeAnnotation: false,
			maxDataSizeBytes: 100 * MB,
		});
	});

	it('skips an execution whose data is missing', async () => {
		givenHistory(candidates(2, 1));
		givenStoredData({ '2': { key: 'ENG-123' }, '1': { key: 'ENG-123' } });
		executionPersistence.findOneInWorkflows.mockImplementation(async (id) => {
			if (id === '2') throw new MissingExecutionDataError({ workflowId: 'wf-1', executionId: id });
			return execution(id, { key: 'ENG-123' });
		});

		const page = await service.search(query(), { text: 'ENG-123' });

		expect(page.results.map((r) => r.id)).toEqual(['1']);
		expect(page.searchedCount).toBe(2);
	});

	it('matches a node that ran without text', async () => {
		givenHistory(candidates(2, 1));
		givenStoredData({ '2': {} });

		const page = await service.search(query(), { nodeName: 'Webhook' });

		expect(page.results.map((r) => r.match)).toEqual([{ nodeName: 'Webhook', nodeId: 'node-1' }]);
	});

	it('returns nothing without a user', async () => {
		const page = await service.search({ ...query(), user: undefined }, { text: 'ENG-123' });

		expect(page).toEqual({ results: [], nextCursor: null, searchedCount: 0, searchedBackTo: null });
		expect(executionRepository.findSearchCandidates).not.toHaveBeenCalled();
	});

	describe('position', () => {
		it('stops at a page of matches and continues below the last one', async () => {
			givenHistory(candidates(6, 1));
			givenStoredData(
				Object.fromEntries(['6', '5', '4', '3', '2', '1'].map((id) => [id, { key: 'ENG-123' }])),
			);

			const first = await service.search(query(2), { text: 'ENG-123' });

			expect(first.results.map((r) => r.id)).toEqual(['6', '5']);
			expect(first.searchedCount).toBe(2);
			expect(parseExecutionCursor(first.nextCursor ?? undefined).v1).toEqual({
				id: '5',
				timestamp: candidate(5).startedAt,
			});

			const second = await service.search(
				query(2),
				{ text: 'ENG-123' },
				parseExecutionCursor(first.nextCursor ?? undefined),
			);

			expect(second.results.map((r) => r.id)).toEqual(['4', '3']);
		});

		it('reports the end when the last match is also the last execution', async () => {
			givenHistory(candidates(2, 1));
			givenStoredData({ '2': { key: 'ENG-123' }, '1': { key: 'ENG-123' } });

			const page = await service.search(query(2), { text: 'ENG-123' });

			expect(page.results).toHaveLength(2);
			expect(page.nextCursor).toBeNull();
		});

		it('reads the next page of candidates below the last one of a full page', async () => {
			givenHistory(candidates(PAGE_SIZE + 3, 1));

			const page = await service.search(query(), { text: 'ENG-123' });

			expect(page).toMatchObject({ searchedCount: PAGE_SIZE + 3, nextCursor: null });
			expect(executionRepository.findSearchCandidates).toHaveBeenCalledTimes(2);
			expect(executionRepository.findSearchCandidates.mock.calls[1][0].range).toEqual({
				limit: PAGE_SIZE,
				beforeId: '4',
			});
		});

		it('starts below the cursor position', async () => {
			givenHistory(candidates(9, 1));
			const cursor = parseExecutionCursor(
				encodeExecutionCursor({ version: 1, v1: { id: '4', timestamp: candidate(4).startedAt } }),
			);

			const page = await service.search(query(), { text: 'ENG-123' }, cursor);

			expect(filteredIds()).toEqual([['3', '2', '1']]);
			expect(page.searchedCount).toBe(3);
		});
	});

	describe('time limit', () => {
		/** Let each filter step take `ms` of the request's time. */
		const givenFilterStepTakes = (ms: number) => {
			vi.useFakeTimers({ now: 0 });
			const filter = executionPersistence.findIdsWithDataContaining.getMockImplementation()!;
			executionPersistence.findIdsWithDataContaining.mockImplementation(async (...args) => {
				vi.advanceTimersByTime(ms);
				return await filter(...args);
			});
		};

		it('stops between filter steps when the time is up and returns a cursor', async () => {
			// 40 MB each: one database step takes one execution.
			givenHistory(candidates(5, 1, { jsonSizeBytes: 40 * MB }));
			givenFilterStepTakes(1600);

			const page = await service.search(query(), { text: 'ENG-123' });

			expect(filteredIds()).toEqual([['5'], ['4']]);
			expect(page).toMatchObject({ results: [], searchedCount: 2 });
			expect(parseExecutionCursor(page.nextCursor ?? undefined).v1?.id).toBe('4');
		});

		it('examines the first hit after the time is up, then stops before the next', async () => {
			givenHistory(candidates(4, 1));
			givenStoredData({ '4': { key: 'ENG-123' }, '2': { key: 'ENG-123' } });
			givenFilterStepTakes(5000);

			const page = await service.search(query(), { text: 'ENG-123' });

			expect(page.results.map((r) => r.id)).toEqual(['4']);
			// Execution 3 is not a hit, so it costs nothing to pass it.
			expect(page.searchedCount).toBe(2);
			expect(parseExecutionCursor(page.nextCursor ?? undefined).v1?.id).toBe('3');
		});
	});

	describe('filter steps', () => {
		it('limits a database step by data size', async () => {
			givenHistory(candidates(5, 1, { jsonSizeBytes: 30 * MB }));

			await service.search(query(), { text: 'ENG-123' });

			expect(filteredIds()).toEqual([['5', '4'], ['3', '2'], ['1']]);
		});

		it('gives blob storage smaller steps and does not mix it with the database', async () => {
			givenHistory([
				...candidates(60, 31, { storedAt: 's3' }),
				...candidates(30, 30, { storedAt: 'db' }),
				...candidates(29, 29, { storedAt: 'fs' }),
			]);

			await service.search(query(), { text: 'ENG-123' });

			expect(filteredIds().map((ids) => ids.length)).toEqual([25, 5, 1, 1]);
		});

		it('assumes a size for executions that have none recorded', async () => {
			// 256 kB assumed each: 256 fill one 64 MB database step.
			givenHistory(candidates(300, 1, { jsonSizeBytes: 0 }));

			await service.search(query(), { text: 'ENG-123' });

			expect(filteredIds().map((ids) => ids.length)).toEqual([256, 44]);
		});
	});

	describe('concurrency', () => {
		it('rejects a search while another one runs, and accepts one after it', async () => {
			givenHistory(candidates(1, 1));
			let release = () => {};
			executionPersistence.findIdsWithDataContaining.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						release = () => resolve(new Set());
					}),
			);

			const running = service.search(query(), { text: 'ENG-123' });
			await vi.waitFor(() =>
				expect(executionPersistence.findIdsWithDataContaining).toHaveBeenCalled(),
			);

			await expect(service.search(query(), { text: 'ENG-123' })).rejects.toThrow(
				TooManyRequestsError,
			);

			release();
			await running;

			await expect(service.search(query(), { text: 'ENG-123' })).resolves.toBeDefined();
		});

		it('frees its place when the search fails', async () => {
			executionRepository.findSearchCandidates.mockRejectedValueOnce(new Error('db down'));

			await expect(service.search(query(), { text: 'ENG-123' })).rejects.toThrow('db down');
			await expect(service.search(query(), { text: 'ENG-123' })).resolves.toBeDefined();
		});
	});
});
