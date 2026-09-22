import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { ExecutionSummaries, User } from '@n8n/db';
import { ExecutionListRepository, ExecutionRepository, SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ExecutionListItem } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { ExecutionListService } from '@/executions/execution-list.service';
import {
	EngineDataPlaneProxyService,
	type EngineDataPlaneProvider,
} from '@/services/engine-data-plane-proxy.service';
import { WaitTracker } from '@/wait-tracker';

import { createExecution } from '../shared/db/executions';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(WaitTracker);
mockInstance(ConcurrencyControlService);
const server = setupTestServer({ endpointGroups: ['executions'] });
const provider = mock<EngineDataPlaneProvider>();
let owner: User;
let member: User;
const time = '2026-09-07T12:00:00.000Z';
const uuid = '01992380-0000-7000-8000-000000000001';

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	owner = await createOwner();
	member = await createMember();
	server.license.reset();
	provider.searchExecutions.mockReset();
	provider.searchExecutions.mockResolvedValue({ items: [], nextCursor: null, total: 0 });
	Container.get(EngineDataPlaneProxyService).registerProvider(provider);
});

const row = (workflowId: string): ExecutionListItem => ({
	id: uuid,
	workflowId,
	status: 'completed',
	mode: 'manual',
	createdAt: time,
	updatedAt: time,
	finishedAt: time,
});

describe('editor execution visibility', () => {
	it('applies a project move on the next request', async () => {
		const home = await createTeamProject();
		const destination = await createTeamProject();
		await linkUserToProject(member, home, 'project:admin');
		const workflow = await createWorkflow({}, home);
		const filter = JSON.stringify({ status: ['success'], workflowId: workflow.id });
		await server.authAgentFor(member).get('/executions').query({ filter }).expect(200);
		expect(provider.searchExecutions).toHaveBeenCalledWith(
			expect.objectContaining({ workflowIds: [workflow.id] }),
		);
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: workflow.id, projectId: home.id },
			{ projectId: destination.id },
		);
		provider.searchExecutions.mockClear();
		await server.authAgentFor(member).get('/executions').query({ filter }).expect(200);
		expect(provider.searchExecutions).not.toHaveBeenCalled();
	});
	it('uses all for the owner and omits the DP for a member without access', async () => {
		const workflow = await createWorkflow({}, owner);
		provider.searchExecutions.mockResolvedValue({
			items: [row(workflow.id)],
			nextCursor: null,
			total: 1,
		});
		await server
			.authAgentFor(owner)
			.get('/executions')
			.query({ filter: JSON.stringify({ status: ['success'] }) })
			.expect(200);
		expect(provider.searchExecutions).toHaveBeenLastCalledWith(
			expect.objectContaining({ workflowIds: 'all' }),
		);
		provider.searchExecutions.mockClear();
		await server
			.authAgentFor(member)
			.get('/executions')
			.query({ filter: JSON.stringify({ status: ['success'], workflowId: workflow.id }) })
			.expect(200);
		expect(provider.searchExecutions).not.toHaveBeenCalled();
	});

	it('includes a workflow shared into the selected project and removes access on the next request', async () => {
		const home = await createTeamProject();
		const visible = await createTeamProject();
		await linkUserToProject(member, visible, 'project:admin');
		const workflow = await createWorkflow({}, home);
		await Container.get(SharedWorkflowRepository).save({
			workflowId: workflow.id,
			projectId: visible.id,
			role: 'workflow:editor',
		});
		provider.searchExecutions.mockResolvedValue({
			items: [row(workflow.id)],
			total: 1,
			nextCursor: null,
		});
		const filter = JSON.stringify({ status: ['success'], projectId: visible.id });
		const response = await server
			.authAgentFor(member)
			.get('/executions')
			.query({ filter })
			.expect(200);
		const body = response.body as {
			data: { results: Array<{ id: string; workflowName: string }>; count: number };
		};
		expect(body.data).toMatchObject({
			results: [{ id: uuid, workflowName: workflow.name }],
			count: 1,
		});
		expect(provider.searchExecutions).toHaveBeenLastCalledWith(
			expect.objectContaining({ workflowIds: [workflow.id] }),
		);
		await Container.get(SharedWorkflowRepository).delete({
			workflowId: workflow.id,
			projectId: visible.id,
		});
		provider.searchExecutions.mockClear();
		await server.authAgentFor(member).get('/executions').query({ filter }).expect(200);
		expect(provider.searchExecutions).not.toHaveBeenCalled();
	});

	it('resolves archive and workflow setting filters in the CP', async () => {
		const workflow = await createWorkflow({ settings: { availableInMCP: true } }, owner);
		const sharingOptions =
			await Container.get(ExecutionListService).buildSharingOptions('workflow:read');
		const query: ExecutionSummaries.RangeQuery = {
			kind: 'range',
			range: { limit: 2 },
			user: owner,
			sharingOptions,
			workflowId: workflow.id,
			isArchived: false,
			workflowBooleanSettings: [{ key: 'availableInMCP', value: true }],
		};
		const workflows = Container.get(ExecutionListRepository);
		expect(await workflows.findWorkflowIdsForExecutionList(query)).toEqual([workflow.id]);
		expect(await workflows.findWorkflowIdsForExecutionList({ ...query, isArchived: true })).toEqual(
			[],
		);
		expect(
			await workflows.findWorkflowIdsForExecutionList({
				...query,
				workflowBooleanSettings: [{ key: 'availableInMCP', value: false }],
			}),
		).toEqual([]);
	});
});

describe('editor v1 source cursor', () => {
	it('walks mixed REST pages with equal timestamps without gaps or duplicates', async () => {
		const workflow = await createWorkflow({}, owner);
		const v1Ids: string[] = [];
		for (let i = 0; i < 5; i++) {
			const execution = await createExecution(
				{ createdAt: new Date(time), startedAt: new Date(time), status: 'success' },
				workflow,
			);
			v1Ids.push(execution.id);
		}
		const v2Rows = ['3', '2', '1'].map((suffix) => ({
			...row(workflow.id),
			id: `${uuid.slice(0, -1)}${suffix}`,
		}));
		provider.searchExecutions.mockImplementation(async (query) => {
			const remaining = v2Rows.filter(
				(item) =>
					!query.before ||
					item.createdAt < query.before.createdAt ||
					(item.createdAt === query.before.createdAt && item.id < query.before.id),
			);
			const limit = query.limit ?? 20;
			const page = remaining.slice(0, limit);
			const last = page.at(-1);
			return {
				items: page,
				nextCursor:
					remaining.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
				total: v2Rows.length,
			};
		});
		const seen: string[] = [];
		let cursor: string | null = null;
		for (let i = 0; i < 4; i++) {
			const response = await server
				.authAgentFor(owner)
				.get('/executions')
				.query({
					filter: JSON.stringify({ workflowId: workflow.id, status: ['success'] }),
					limit: 2,
					...(cursor ? { cursor } : {}),
				})
				.expect(200);
			const { data } = response.body as {
				data: { results: Array<{ id: string }>; count: number; nextCursor: string | null };
			};
			expect(data.count).toBe(8);
			seen.push(...data.results.map((item) => item.id));
			cursor = data.nextCursor;
			if (i < 3) expect(cursor).not.toBeNull();
		}
		expect(cursor).toBeNull();
		expect(seen).toEqual([...v2Rows.map((item) => item.id), ...v1Ids.reverse()]);
	});
	it('walks equal timestamps and a null start time in numeric ID order', async () => {
		const workflow = await createWorkflow({}, owner);
		const ids: string[] = [];
		for (let i = 0; i < 5; i++) {
			const execution = await createExecution(
				{ createdAt: new Date(time), startedAt: i % 2 ? null : new Date(time), status: 'success' },
				workflow,
			);
			ids.push(execution.id);
		}
		const repository = Container.get(ExecutionRepository);
		const query: ExecutionSummaries.RangeQuery = {
			kind: 'range',
			user: owner,
			workflowId: workflow.id,
			range: { limit: 2 },
			order: { startedAt: 'DESC' },
		};
		const seen: string[] = [];
		for (let i = 0; i < 3; i++) {
			const items = await repository.findManyByRangeQuery(query);
			seen.push(...items.map((item) => item.id));
			query.range.beforeId = items.at(-1)!.id;
		}
		expect(seen).toEqual(ids.reverse());
		expect(await repository.fetchCount({ ...query, kind: 'count' })).toBe(5);
	});
});
