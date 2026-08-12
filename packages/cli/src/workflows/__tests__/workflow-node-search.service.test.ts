/* eslint-disable @typescript-eslint/unbound-method -- vi mocks */
import { NODE_SEARCH_MAX_RESULTS, NODE_SEARCH_PER_WORKFLOW_CAP } from '@n8n/api-types';
import type { NodeSearchCandidate, User, WorkflowRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { WorkflowNodeSearchService } from '../workflow-node-search.service';

const user = mock<User>({ id: 'user-1' });

const makeNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const makeCandidate = (overrides: Partial<NodeSearchCandidate> = {}): NodeSearchCandidate => ({
	id: 'wf-1',
	name: 'My Workflow',
	nodes: [],
	homeProject: { id: 'proj-1', name: 'Acme Corp', type: 'team', icon: null },
	parentFolder: null,
	...overrides,
});

function setup(candidates: NodeSearchCandidate[] = []) {
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findNodeSearchCandidates.mockResolvedValue(candidates);

	const roleService = mock<RoleService>();
	roleService.rolesWithScope.mockResolvedValue([]);

	const service = new WorkflowNodeSearchService(workflowRepository, roleService);

	return { service, workflowRepository, roleService };
}

describe('WorkflowNodeSearchService', () => {
	describe('search', () => {
		it('returns nothing for a blank query without hitting the DB', async () => {
			const { service, workflowRepository } = setup();

			await expect(service.search(user, '   ')).resolves.toEqual({ results: [], hasMore: false });
			expect(workflowRepository.findNodeSearchCandidates).not.toHaveBeenCalled();
		});

		it('scopes the query to workflow:read roles', async () => {
			const { service, workflowRepository, roleService } = setup();
			roleService.rolesWithScope.mockResolvedValueOnce(['project:admin']);
			roleService.rolesWithScope.mockResolvedValueOnce(['workflow:owner']);

			await service.search(user, 'orders');

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
			expect(workflowRepository.findNodeSearchCandidates).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: ['workflow:read'],
					projectRoles: ['project:admin'],
					workflowRoles: ['workflow:owner'],
				}),
				'orders',
				expect.any(Number),
				undefined,
			);
		});

		it('forwards projectId when scoping to a project', async () => {
			const { service, workflowRepository } = setup();

			await service.search(user, 'orders', { projectId: 'proj-1' });

			expect(workflowRepository.findNodeSearchCandidates).toHaveBeenCalledWith(
				user,
				expect.anything(),
				'orders',
				expect.any(Number),
				'proj-1',
			);
		});

		it('trims the query before searching', async () => {
			const { service, workflowRepository } = setup();

			await service.search(user, '  orders  ');

			expect(workflowRepository.findNodeSearchCandidates).toHaveBeenCalledWith(
				user,
				expect.anything(),
				'orders',
				expect.any(Number),
				undefined,
			);
		});

		it('discards workflows whose nodes do not actually match', async () => {
			// The SQL pre-filter matches JSON structure too, so a candidate can arrive
			// with no genuinely matching node.
			const { service } = setup([
				makeCandidate({ nodes: [makeNode({ name: 'Unrelated', parameters: { url: 'x' } })] }),
			]);

			await expect(service.search(user, 'orders')).resolves.toEqual({
				results: [],
				hasMore: false,
			});
		});

		it('reports which field matched and a snippet of it', async () => {
			const { service } = setup([
				makeCandidate({
					nodes: [makeNode({ parameters: { url: 'https://api.acme.test/orders' } })],
				}),
			]);

			const { results } = await service.search(user, 'acme.test');

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				workflowId: 'wf-1',
				workflowName: 'My Workflow',
				nodeId: 'node-1',
				nodeName: 'HTTP Request',
				matchedField: 'parameters',
				isSticky: false,
				disabled: false,
			});
			expect(results[0].snippet).toContain('acme.test');
		});

		it('flags sticky notes so the client can skip the NDV', async () => {
			const { service } = setup([
				makeCandidate({
					nodes: [
						makeNode({
							type: 'n8n-nodes-base.stickyNote',
							name: 'Sticky Note',
							parameters: { content: 'remember to rotate the orders token' },
						}),
					],
				}),
			]);

			const { results } = await service.search(user, 'orders token');

			expect(results[0]).toMatchObject({ isSticky: true, matchedField: 'parameters' });
			expect(results[0].snippet).toContain('orders token');
		});

		it('marks disabled nodes', async () => {
			const { service } = setup([
				makeCandidate({ nodes: [makeNode({ name: 'Fetch orders', disabled: true })] }),
			]);

			const { results } = await service.search(user, 'orders');

			expect(results[0].disabled).toBe(true);
		});

		it('passes through project and folder context', async () => {
			const { service } = setup([
				makeCandidate({
					nodes: [makeNode({ name: 'Fetch orders' })],
					parentFolder: { id: 'folder-1', name: 'Billing' },
				}),
			]);

			const { results } = await service.search(user, 'orders');

			expect(results[0].homeProject).toEqual({
				id: 'proj-1',
				name: 'Acme Corp',
				type: 'team',
				icon: null,
			});
			expect(results[0].parentFolder).toEqual({ id: 'folder-1', name: 'Billing' });
		});

		it('matches the node type when the name does not contain the query', async () => {
			const { service } = setup([
				makeCandidate({
					nodes: [
						makeNode({
							id: 'renamed',
							name: 'Notify sales',
							type: 'n8n-nodes-base.slack',
						}),
					],
				}),
			]);

			const { results } = await service.search(user, 'slack');

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				nodeId: 'renamed',
				matchedField: 'type',
				nodeType: 'n8n-nodes-base.slack',
			});
		});

		it('ranks name matches above type, notes and parameter matches', async () => {
			const { service } = setup([
				makeCandidate({
					nodes: [
						makeNode({ id: 'param', name: 'A', parameters: { q: 'orders' } }),
						makeNode({ id: 'notes', name: 'B', notes: 'about orders' }),
						makeNode({
							id: 'type',
							name: 'C',
							type: 'n8n-nodes-base.orders',
						}),
						makeNode({ id: 'name', name: 'Fetch orders' }),
					],
				}),
			]);

			const { results } = await service.search(user, 'orders');

			expect(results.map((hit) => hit.nodeId)).toEqual(['name', 'type', 'notes', 'param']);
		});

		it('ranks by matched field before applying the per-workflow cap', async () => {
			// The name match is last in node order — it must survive the cap.
			const nodes = [
				...Array.from({ length: NODE_SEARCH_PER_WORKFLOW_CAP }, (_, i) =>
					makeNode({ id: `param-${i}`, name: `P${i}`, parameters: { q: 'orders' } }),
				),
				makeNode({ id: 'name', name: 'Fetch orders' }),
			];
			const { service } = setup([makeCandidate({ nodes })]);

			const { results } = await service.search(user, 'orders');

			expect(results).toHaveLength(NODE_SEARCH_PER_WORKFLOW_CAP);
			expect(results[0].nodeId).toBe('name');
		});

		it('caps hits per workflow', async () => {
			const nodes = Array.from({ length: NODE_SEARCH_PER_WORKFLOW_CAP + 3 }, (_, i) =>
				makeNode({ id: `node-${i}`, name: `Fetch orders ${i}` }),
			);
			const { service } = setup([makeCandidate({ nodes })]);

			const { results } = await service.search(user, 'orders');

			expect(results).toHaveLength(NODE_SEARCH_PER_WORKFLOW_CAP);
		});

		it('caps total hits and reports truncation', async () => {
			const candidates = Array.from({ length: 20 }, (_, w) =>
				makeCandidate({
					id: `wf-${w}`,
					nodes: Array.from({ length: NODE_SEARCH_PER_WORKFLOW_CAP }, (_, n) =>
						makeNode({ id: `node-${w}-${n}`, name: `Fetch orders ${n}` }),
					),
				}),
			);
			const { service } = setup(candidates);

			const { results, hasMore } = await service.search(user, 'orders');

			expect(results).toHaveLength(NODE_SEARCH_MAX_RESULTS);
			expect(hasMore).toBe(true);
		});

		it('does not report truncation when everything fits', async () => {
			const { service } = setup([makeCandidate({ nodes: [makeNode({ name: 'Fetch orders' })] })]);

			const { hasMore } = await service.search(user, 'orders');

			expect(hasMore).toBe(false);
		});

		it('preserves recency order within a relevance tier', async () => {
			// Candidates arrive newest-first from the repository.
			const { service } = setup([
				makeCandidate({ id: 'newer', nodes: [makeNode({ name: 'Fetch orders' })] }),
				makeCandidate({ id: 'older', nodes: [makeNode({ name: 'Sync orders' })] }),
			]);

			const { results } = await service.search(user, 'orders');

			expect(results.map((hit) => hit.workflowId)).toEqual(['newer', 'older']);
		});
	});
});
