// The service needs these classes only as DI tokens. Stubs keep their large import graphs out of the test.
vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));
vi.mock('../../instance-ai-memory.service', () => ({ InstanceAiMemoryService: class {} }));

import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import type { WorkflowProvenance } from '../workflow-provenance.entity';
import type { WorkflowProvenanceRepository } from '../workflow-provenance.repository';
import {
	PROVENANCE_CANDIDATE_CAP,
	WorkflowProvenanceService,
} from '../workflow-provenance.service';

const ME = 'user-me';
const TEAMMATE = 'user-teammate';

interface StoredRow {
	workflowId: string;
	threadId: string;
	createdByUserId: string | null;
	createdAt: Date;
	name: string;
	active: boolean;
}

const byNewest = (a: StoredRow, b: StoredRow) => b.createdAt.getTime() - a.createdAt.getTime();

/** An in-memory stand-in for the table, so the tests check results instead of calls. */
function setup(options: {
	rows: StoredRow[];
	readable: string[];
	threadOwners?: Record<string, string>;
}) {
	const repository = mock<WorkflowProvenanceRepository>();
	const finder = mock<WorkflowFinderService>();
	const memory = mock<InstanceAiMemoryService>();
	const readable = new Set(options.readable);
	const owners = options.threadOwners ?? {};

	repository.listWorkflowIdsCreatedBy.mockImplementation(async (userId, limit) =>
		options.rows
			.filter((row) => row.createdByUserId === userId)
			.sort(byNewest)
			.slice(0, limit)
			.map(({ workflowId }) => workflowId),
	);
	repository.listForWorkflowIds.mockImplementation(async (ids, limit) =>
		options.rows
			.filter((row) => ids.includes(row.workflowId))
			.sort(byNewest)
			.slice(0, limit)
			.map(({ workflowId, threadId, createdAt, name, active }) => ({
				workflowId,
				threadId,
				createdAt,
				name,
				active,
			})),
	);
	repository.findForWorkflow.mockImplementation(async (workflowId) => {
		const row = options.rows.find((candidate) => candidate.workflowId === workflowId);
		return row ? mock<WorkflowProvenance>(row) : null;
	});
	finder.findWorkflowIdsWithScopeForUser.mockImplementation(
		async (ids) => new Set(ids.filter((id) => readable.has(id))),
	);
	finder.findWorkflowForUser.mockImplementation(async (workflowId) =>
		readable.has(workflowId) ? mock({ id: workflowId }) : null,
	);
	memory.checkThreadOwnership.mockImplementation(async (userId, threadId) => {
		if (!(threadId in owners)) return 'not_found';
		return owners[threadId] === userId ? 'owned' : 'other_user';
	});
	memory.findOwnedThreadIds.mockImplementation(
		async (userId, threadIds) => new Set(threadIds.filter((id) => owners[id] === userId)),
	);

	const service = new WorkflowProvenanceService(repository, finder, memory);
	return { service, repository, finder, memory };
}

const row = (overrides: Partial<StoredRow> & Pick<StoredRow, 'workflowId'>): StoredRow => ({
	threadId: `thread-${overrides.workflowId}`,
	createdByUserId: ME,
	createdAt: new Date('2026-03-01T10:00:00.000Z'),
	name: `Workflow ${overrides.workflowId}`,
	active: false,
	...overrides,
});

const me = mock<User>({ id: ME });

describe('WorkflowProvenanceService', () => {
	describe('record', () => {
		it('stores the workflow, thread and user it receives', async () => {
			const { service, repository } = setup({ rows: [], readable: [] });

			await service.record('wf-1', 'thread-1', ME);

			expect(repository.recordIfAbsent).toHaveBeenCalledTimes(1);
			expect(repository.recordIfAbsent).toHaveBeenCalledWith('wf-1', 'thread-1', ME);
		});
	});

	describe('listMine', () => {
		it('returns only workflows the user can read, newest first', async () => {
			const { service } = setup({
				rows: [
					row({ workflowId: 'wf-old', createdAt: new Date('2026-03-01T00:00:00.000Z') }),
					row({
						workflowId: 'wf-new',
						createdAt: new Date('2026-03-03T00:00:00.000Z'),
						name: 'Daily report',
						active: true,
					}),
					row({ workflowId: 'wf-moved', createdAt: new Date('2026-03-02T00:00:00.000Z') }),
				],
				readable: ['wf-old', 'wf-new'],
				threadOwners: { 'thread-wf-old': ME, 'thread-wf-new': ME },
			});

			const items = await service.listMine(me, 10);

			expect(items).toEqual([
				{
					workflowId: 'wf-new',
					name: 'Daily report',
					active: true,
					threadId: 'thread-wf-new',
					createdAt: '2026-03-03T00:00:00.000Z',
					canOpenThread: true,
				},
				{
					workflowId: 'wf-old',
					name: 'Workflow wf-old',
					active: false,
					threadId: 'thread-wf-old',
					createdAt: '2026-03-01T00:00:00.000Z',
					canOpenThread: true,
				},
			]);
		});

		it('checks read access with the workflow:read scope for the requesting user', async () => {
			const { service, finder } = setup({
				rows: [row({ workflowId: 'wf-1' })],
				readable: ['wf-1'],
			});

			await service.listMine(me, 10);

			expect(finder.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(['wf-1'], me, [
				'workflow:read',
			]);
		});

		it('leaves out workflows that other users built', async () => {
			const { service } = setup({
				rows: [
					row({ workflowId: 'wf-mine' }),
					row({ workflowId: 'wf-theirs', createdByUserId: TEAMMATE }),
					row({ workflowId: 'wf-orphan', createdByUserId: null }),
				],
				readable: ['wf-mine', 'wf-theirs', 'wf-orphan'],
			});

			const items = await service.listMine(me, 10);

			expect(items.map(({ workflowId }) => workflowId)).toEqual(['wf-mine']);
		});

		it('applies the limit after the access filter', async () => {
			const { service } = setup({
				rows: [
					row({ workflowId: 'wf-a', createdAt: new Date('2026-03-04T00:00:00.000Z') }),
					row({ workflowId: 'wf-b', createdAt: new Date('2026-03-03T00:00:00.000Z') }),
					row({ workflowId: 'wf-c', createdAt: new Date('2026-03-02T00:00:00.000Z') }),
					row({ workflowId: 'wf-d', createdAt: new Date('2026-03-01T00:00:00.000Z') }),
				],
				readable: ['wf-b', 'wf-c', 'wf-d'],
			});

			const items = await service.listMine(me, 2);

			expect(items.map(({ workflowId }) => workflowId)).toEqual(['wf-b', 'wf-c']);
		});

		it('reads a bounded number of candidate rows', async () => {
			const { service, repository } = setup({ rows: [], readable: [] });

			await service.listMine(me, 10);

			expect(repository.listWorkflowIdsCreatedBy).toHaveBeenCalledWith(
				ME,
				PROVENANCE_CANDIDATE_CAP,
			);
			expect(PROVENANCE_CANDIDATE_CAP).toBe(500);
		});

		it('sets canOpenThread to false for a chat owned by someone else or deleted', async () => {
			const { service } = setup({
				rows: [
					row({ workflowId: 'wf-own', createdAt: new Date('2026-03-03T00:00:00.000Z') }),
					row({ workflowId: 'wf-shared', createdAt: new Date('2026-03-02T00:00:00.000Z') }),
					row({ workflowId: 'wf-gone', createdAt: new Date('2026-03-01T00:00:00.000Z') }),
				],
				readable: ['wf-own', 'wf-shared', 'wf-gone'],
				threadOwners: { 'thread-wf-own': ME, 'thread-wf-shared': TEAMMATE },
			});

			const items = await service.listMine(me, 10);

			expect(items.map(({ workflowId, canOpenThread }) => [workflowId, canOpenThread])).toEqual([
				['wf-own', true],
				['wf-shared', false],
				['wf-gone', false],
			]);
		});

		it('checks the ownership of all listed chats in one lookup', async () => {
			const { service, memory } = setup({
				rows: [
					row({ workflowId: 'wf-1', threadId: 'thread-shared' }),
					row({ workflowId: 'wf-2', threadId: 'thread-shared' }),
					row({ workflowId: 'wf-3', threadId: 'thread-other' }),
				],
				readable: ['wf-1', 'wf-2', 'wf-3'],
				threadOwners: { 'thread-shared': ME, 'thread-other': TEAMMATE },
			});

			const items = await service.listMine(me, 10);

			expect(items.map(({ workflowId, canOpenThread }) => [workflowId, canOpenThread])).toEqual([
				['wf-1', true],
				['wf-2', true],
				['wf-3', false],
			]);
			expect(memory.findOwnedThreadIds).toHaveBeenCalledTimes(1);
			expect(memory.findOwnedThreadIds).toHaveBeenCalledWith(
				ME,
				expect.arrayContaining(['thread-shared', 'thread-other']),
			);
			expect(memory.checkThreadOwnership).not.toHaveBeenCalled();
		});

		it('returns an empty list without an ownership lookup when the user built nothing', async () => {
			const { service, memory } = setup({
				rows: [row({ workflowId: 'wf-theirs', createdByUserId: TEAMMATE })],
				readable: ['wf-theirs'],
			});

			await expect(service.listMine(me, 10)).resolves.toEqual([]);
			expect(memory.findOwnedThreadIds).not.toHaveBeenCalled();
		});
	});

	describe('getForWorkflow', () => {
		it('throws NotFoundError when the user cannot read the workflow', async () => {
			const { service, repository } = setup({
				rows: [row({ workflowId: 'wf-private' })],
				readable: [],
			});

			const result = service.getForWorkflow(me, 'wf-private');

			await expect(result).rejects.toThrow(NotFoundError);
			await expect(result).rejects.toThrow('Workflow not found');
			expect(repository.findForWorkflow).not.toHaveBeenCalled();
		});

		it('checks read access with the workflow:read scope', async () => {
			const { service, finder } = setup({ rows: [], readable: ['wf-1'] });

			await service.getForWorkflow(me, 'wf-1');

			expect(finder.findWorkflowForUser).toHaveBeenCalledWith('wf-1', me, ['workflow:read']);
		});

		it('returns null for a readable workflow that the Assistant did not build', async () => {
			const { service } = setup({ rows: [], readable: ['wf-manual'] });

			await expect(service.getForWorkflow(me, 'wf-manual')).resolves.toBeNull();
		});

		it('returns the source chat and lets the owner open it', async () => {
			const { service } = setup({
				rows: [row({ workflowId: 'wf-1', createdAt: new Date('2026-03-05T08:30:00.000Z') })],
				readable: ['wf-1'],
				threadOwners: { 'thread-wf-1': ME },
			});

			await expect(service.getForWorkflow(me, 'wf-1')).resolves.toEqual({
				workflowId: 'wf-1',
				threadId: 'thread-wf-1',
				createdAt: '2026-03-05T08:30:00.000Z',
				canOpenThread: true,
			});
		});

		it('does not let a reader open a chat that someone else owns', async () => {
			const { service } = setup({
				rows: [row({ workflowId: 'wf-1', createdByUserId: TEAMMATE })],
				readable: ['wf-1'],
				threadOwners: { 'thread-wf-1': TEAMMATE },
			});

			const provenance = await service.getForWorkflow(me, 'wf-1');

			expect(provenance?.canOpenThread).toBe(false);
		});
	});
});
