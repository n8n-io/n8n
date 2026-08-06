import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { CATALOG_LIST_LIMIT, CatalogService } from '@/workflows/catalog.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

/** Bound to the finder's contract rather than a hand-picked entity type. */
type Candidate = Awaited<ReturnType<WorkflowFinderService['findAllWorkflowsForUser']>>[number];

const entity = (id: string, name = `Workflow ${id}`) =>
	mock<Candidate>({ id, name, description: null, nodes: [] });

describe('CatalogService', () => {
	const user = mock<User>({ id: 'user-1' });

	let service: CatalogService;
	let logger: ReturnType<typeof mock<Logger>>;
	let finder: ReturnType<typeof mock<WorkflowFinderService>>;
	let schemas: ReturnType<typeof mock<WorkflowInputSchemaService>>;

	beforeEach(() => {
		logger = mock<Logger>();
		finder = mock<WorkflowFinderService>();
		schemas = mock<WorkflowInputSchemaService>();

		schemas.describe.mockResolvedValue({
			eligible: true,
			trigger: 'manual-trigger',
			fields: [],
		});

		service = new CatalogService(logger, finder, schemas);
	});

	it('should list only workflows shared with the person, not every one they may administer', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a')]);

		await service.list(user);

		// An instance owner holds global execute, which would otherwise return every
		// workflow there is — including other people's personal ones.
		expect(finder.findAllWorkflowsForUser).toHaveBeenCalledWith(
			user,
			['workflow:execute'],
			undefined,
			undefined,
			{ sharedWithUserOnly: true },
		);
	});

	it('should return the declared contract without the graph', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a', 'Weekly report')]);
		schemas.describe.mockResolvedValue({
			eligible: true,
			trigger: 'execute-workflow-trigger',
			fields: [{ name: 'customer', type: 'string' }],
		});

		const result = await service.list(user);

		expect(result.workflows).toEqual([
			{
				id: 'a',
				name: 'Weekly report',
				description: null,
				trigger: 'execute-workflow-trigger',
				fields: [{ name: 'customer', type: 'string' }],
			},
		]);
	});

	it('should leave out workflows with no readable contract', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a'), entity('b')]);
		schemas.describe
			.mockResolvedValueOnce({ eligible: true, trigger: 'manual-trigger', fields: [] })
			.mockResolvedValueOnce({ eligible: false, reason: 'own-schedule' });

		const result = await service.list(user);

		expect(result.workflows.map((w) => w.id)).toEqual(['a']);
	});

	it('should return one entry for a workflow reachable by several share paths', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a'), entity('a'), entity('b')]);

		const result = await service.list(user);

		expect(result.workflows.map((w) => w.id)).toEqual(['a', 'b']);
	});

	it('should report a complete listing as not truncated', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a')]);

		const result = await service.list(user);

		expect(result.truncated).toBe(false);
	});

	it('should flag and log a listing the limit cut short', async () => {
		const candidates = Array.from({ length: CATALOG_LIST_LIMIT + 1 }, (_, i) => entity(`w-${i}`));
		finder.findAllWorkflowsForUser.mockResolvedValue(candidates);

		const result = await service.list(user);

		// A short list must never read as a complete one.
		expect(result.truncated).toBe(true);
		expect(result.workflows).toHaveLength(CATALOG_LIST_LIMIT);
		expect(logger.warn).toHaveBeenCalled();
	});
});
