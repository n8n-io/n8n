import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type {
	InstanceAiActivityEntry,
	InstanceAiActivityService,
	InstanceAiContext,
} from '../../types';
import { createActivityTool } from '../activity.tool';

const savedEntry: InstanceAiActivityEntry = {
	id: 20,
	at: '2026-08-26T11:56:00.000Z',
	category: 'workflow',
	action: 'saved',
	resourceType: 'workflow',
	resourceId: 'wf1',
	resourceName: 'Lead enrichment',
	byCurrentUser: true,
	detail: { source: 'ui', nodesAdded: ['slack'], nodesAddedTotal: 1 },
};

function makeContext(activityService?: InstanceAiActivityService): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.activityService = activityService;
	return context;
}

function makeService(
	overrides: Partial<InstanceAiActivityService> = {},
): InstanceAiActivityService {
	return {
		list: vi.fn().mockResolvedValue([savedEntry]),
		expand: vi.fn().mockResolvedValue({ entry: savedEntry, resourceHistory: [] }),
		...overrides,
	};
}

describe('activity tool', () => {
	it('refuses plainly when the instance has no activity log', async () => {
		const tool = createActivityTool(makeContext(undefined));

		await expect(executeTool(tool, { action: 'list' })).rejects.toThrow(
			'activity log is not enabled',
		);
	});

	it('lists with a default limit when the model gives none', async () => {
		const service = makeService();
		const tool = createActivityTool(makeContext(service));

		const output = await executeTool<{ entries: InstanceAiActivityEntry[] }>(tool, {
			action: 'list',
		});

		expect(service.list).toHaveBeenCalledWith({ limit: 30 });
		expect(output.entries).toEqual([savedEntry]);
	});

	it('passes only the filters the model actually set', async () => {
		const service = makeService();
		const tool = createActivityTool(makeContext(service));

		await executeTool(tool, { action: 'list', category: 'credential', limit: 5 });

		expect(service.list).toHaveBeenCalledWith({ limit: 5, category: 'credential' });
	});

	it('expands an entry and returns its resource history', async () => {
		const older = { ...savedEntry, id: 4, action: 'created' };
		const service = makeService({
			expand: vi.fn().mockResolvedValue({
				entry: savedEntry,
				resourceHistory: [older],
				liveRecordHint: 'workflows(action="get", workflowId="wf1")',
			}),
		});
		const tool = createActivityTool(makeContext(service));

		const output = await executeTool<{
			entry: InstanceAiActivityEntry;
			resourceHistory: InstanceAiActivityEntry[];
			liveRecordHint: string;
		}>(tool, { action: 'expand', id: 20 });

		expect(service.expand).toHaveBeenCalledWith(20);
		expect(output.entry.id).toBe(20);
		expect(output.resourceHistory).toEqual([older]);
		expect(output.liveRecordHint).toBe('workflows(action="get", workflowId="wf1")');
	});

	/** An id outside the conversation's scope answers the same way, so the tool cannot probe. */
	it('reports a missing entry as an outcome, not an error — ids get pruned', async () => {
		const service = makeService({ expand: vi.fn().mockResolvedValue(null) });
		const tool = createActivityTool(makeContext(service));

		const output = await executeTool<{ notFound: boolean }>(tool, { action: 'expand', id: 999 });

		expect(output.notFound).toBe(true);
	});

	describe('input schema', () => {
		function inputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
			return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
				.inputSchema;
		}

		/** The union carries the arity, so the handler never has to check for a missing id. */
		it('refuses an expand with no id', () => {
			const schema = inputSchema(createActivityTool(makeContext(makeService())));

			expect(schema.safeParse({ action: 'expand' }).success).toBe(false);
			expect(schema.safeParse({ action: 'expand', id: 20 }).success).toBe(true);
		});

		it('refuses a category outside the vocabulary, so a typo cannot widen the read', () => {
			const schema = inputSchema(createActivityTool(makeContext(makeService())));

			expect(schema.safeParse({ action: 'list', category: 'execution' }).success).toBe(false);
			expect(schema.safeParse({ action: 'list', category: 'workflow' }).success).toBe(true);
		});
	});

	it('returns the history the service gives it, without re-bounding it', async () => {
		const history = Array.from({ length: 5 }, (_, index) => ({ ...savedEntry, id: index }));
		const service = makeService({
			expand: vi.fn().mockResolvedValue({ entry: savedEntry, resourceHistory: history }),
		});
		const tool = createActivityTool(makeContext(service));

		const output = await executeTool<{ resourceHistory: InstanceAiActivityEntry[] }>(tool, {
			action: 'expand',
			id: 20,
		});

		expect(output.resourceHistory).toHaveLength(5);
	});
});
