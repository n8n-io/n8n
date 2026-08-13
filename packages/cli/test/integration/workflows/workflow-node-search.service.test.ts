import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, shareWorkflowWithUsers, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { RoleService } from '@/services/role.service';
import { WorkflowNodeSearchService } from '@/workflows/workflow-node-search.service';

import { createUser } from '../shared/db/users';

let owner: User;
let member: User;
let anotherMember: User;
let service: WorkflowNodeSearchService;
let workflowRepository: WorkflowRepository;

const makeNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	anotherMember = await createUser({ role: GLOBAL_MEMBER_ROLE });

	const licenseMock = mock<LicenseState>();
	licenseMock.isSharingLicensed.mockReturnValue(true);
	licenseMock.getMaxTeamProjects.mockReturnValue(-1);
	Container.set(LicenseState, licenseMock);

	service = Container.get(WorkflowNodeSearchService);
	workflowRepository = Container.get(WorkflowRepository);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowNodeSearchService', () => {
	describe('access control', () => {
		it('finds nodes in the searching user own workflows', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, member);

			const { results } = await service.search(member, 'orders');

			expect(results).toHaveLength(1);
			expect(results[0].nodeName).toBe('Fetch orders');
		});

		it('does not leak nodes from workflows the user cannot read', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, anotherMember);

			const { results } = await service.search(member, 'orders');

			expect(results).toEqual([]);
		});

		it('finds nodes in workflows shared with the user', async () => {
			const workflow = await createWorkflow(
				{ nodes: [makeNode({ name: 'Fetch orders' })] },
				anotherMember,
			);
			await shareWorkflowWithUsers(workflow, [member]);

			const { results } = await service.search(member, 'orders');

			expect(results.map((hit) => hit.workflowId)).toEqual([workflow.id]);
		});

		it('lets an instance owner search every workflow', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, member);
			await createWorkflow({ nodes: [makeNode({ name: 'Sync orders' })] }, anotherMember);

			const { results } = await service.search(owner, 'orders');

			expect(results).toHaveLength(2);
		});
	});

	describe('matching', () => {
		it('matches node names', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, member);

			const { results } = await service.search(member, 'fetch');

			expect(results[0].matchedField).toBe('name');
		});

		it('matches node types when the instance was renamed', async () => {
			await createWorkflow(
				{
					nodes: [
						makeNode({
							name: 'Notify sales',
							type: 'n8n-nodes-base.slack',
						}),
					],
				},
				member,
			);

			const { results } = await service.search(member, 'slack');

			expect(results).toHaveLength(1);
			expect(results[0].matchedField).toBe('type');
			expect(results[0].nodeType).toBe('n8n-nodes-base.slack');
		});

		it('matches node notes', async () => {
			await createWorkflow({ nodes: [makeNode({ notes: 'retries on 429' })] }, member);

			const { results } = await service.search(member, '429');

			expect(results[0].matchedField).toBe('notes');
		});

		it('matches parameter values', async () => {
			await createWorkflow(
				{ nodes: [makeNode({ parameters: { url: 'https://api.acme.test/v2' } })] },
				member,
			);

			const { results } = await service.search(member, 'acme.test');

			expect(results[0].matchedField).toBe('parameters');
			expect(results[0].snippet).toContain('acme.test');
		});

		it('matches sticky note content', async () => {
			await createWorkflow(
				{
					nodes: [
						makeNode({
							type: 'n8n-nodes-base.stickyNote',
							name: 'Sticky Note',
							parameters: { content: '## Runbook\nrotate the signing key quarterly' },
						}),
					],
				},
				member,
			);

			const { results } = await service.search(member, 'signing key');

			expect(results).toHaveLength(1);
			expect(results[0].isSticky).toBe(true);
		});

		it('does not match on parameter keys', async () => {
			await createWorkflow(
				{ nodes: [makeNode({ name: 'Do thing', parameters: { url: 'https://example.com' } })] },
				member,
			);

			const { results } = await service.search(member, 'url');

			expect(results).toEqual([]);
		});

		it('matches credential names', async () => {
			await createWorkflow(
				{
					nodes: [
						makeNode({
							name: 'Notify',
							credentials: { slackApi: { id: 'c-1', name: 'My Slack account' } },
						}),
					],
				},
				member,
			);

			const { results } = await service.search(member, 'slack account');

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({ nodeName: 'Notify', matchedField: 'credentials' });
		});

		// The DB prefilter matches the raw JSON blob, which contains fields the
		// in-memory matcher deliberately skips (node ids, positions, webhookIds).
		// A hit older than a full batch of such blob-only candidates must still be
		// found — a fixed candidate cap silently returned nothing here.
		it('finds hits beyond a full batch of blob-only false positives', async () => {
			// The real hit is oldest, then 100 newer workflows that match the blob
			// only via node id and fill the first keyset batch entirely.
			await createWorkflow({ nodes: [makeNode({ name: 'needle hit' })] }, member);
			await new Promise((resolve) => setTimeout(resolve, 10)); // decoys must sort newer
			await Promise.all(
				Array.from(
					{ length: 100 },
					async (_, i) =>
						await createWorkflow(
							{ nodes: [makeNode({ id: `needle-${i}`, name: `Decoy ${i}` })] },
							member,
						),
				),
			);

			const { results } = await service.search(member, 'needle');

			expect(results.map((hit) => hit.nodeName)).toEqual(['needle hit']);
		});

		it('is case insensitive', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch ORDERS' })] }, member);

			const { results } = await service.search(member, 'orders');

			expect(results).toHaveLength(1);
		});

		it('excludes archived workflows', async () => {
			await createWorkflow(
				{ nodes: [makeNode({ name: 'Fetch orders' })], isArchived: true },
				member,
			);

			const { results } = await service.search(member, 'orders');

			expect(results).toEqual([]);
		});
	});

	describe('load shedding', () => {
		// The per-user rate limit cannot bound load on a shared database: 20 users
		// each staying within their own limit measured 66x list-query degradation
		// before the process-wide cap existed (#30294).
		it('sheds load once the concurrency cap and its queue are full', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Send Slack Alert' })] }, member);

			// Fire more than (max concurrent + max queued) at once. The guard is
			// evaluated synchronously before the limiter awaits, so this is deterministic.
			const outcomes = await Promise.allSettled(
				Array.from({ length: 10 }, async () => await service.search(member, 'slack')),
			);

			const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
			const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
			expect(rejected.length).toBeGreaterThan(0);
			expect(fulfilled.length).toBeGreaterThan(0);
			expect(rejected[0].reason).toMatchObject({ httpStatusCode: 429 });

			// The cap must not wedge the service: later calls succeed normally.
			const { results } = await service.search(member, 'slack');
			expect(results).toHaveLength(1);
		});
	});

	describe('LIKE metacharacters', () => {
		it('treats % as a literal', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Discount 50% off' })] }, member);
			await createWorkflow({ nodes: [makeNode({ name: 'Unrelated node' })] }, member);

			const { results } = await service.search(member, '50% off');

			expect(results).toHaveLength(1);
			expect(results[0].nodeName).toBe('Discount 50% off');
		});

		it('treats _ as a literal', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'order_id lookup' })] }, member);
			await createWorkflow({ nodes: [makeNode({ name: 'orderXid lookup' })] }, member);

			const { results } = await service.search(member, 'order_id');

			expect(results).toHaveLength(1);
			expect(results[0].nodeName).toBe('order_id lookup');
		});

		it('does not match everything for a lone wildcard query', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, member);

			const { results } = await service.search(member, '%%%');

			expect(results).toEqual([]);
		});
	});

	describe('result context', () => {
		it('returns the owning project', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'Fetch orders' })] }, member);

			const { results } = await service.search(member, 'orders');

			expect(results[0].homeProject).not.toBeNull();
			expect(results[0].homeProject?.type).toBe('personal');
		});

		it('returns the workflow name', async () => {
			await createWorkflow(
				{ name: 'Billing sync', nodes: [makeNode({ name: 'Fetch orders' })] },
				member,
			);

			const { results } = await service.search(member, 'orders');

			expect(results[0].workflowName).toBe('Billing sync');
		});
	});

	describe('findNodeSearchCandidates', () => {
		/** Mirrors how the service resolves roles before querying. */
		const readSharingOptions = async () => {
			const scopes = ['workflow:read' as const];
			const roleService = Container.get(RoleService);
			return {
				scopes,
				projectRoles: await roleService.rolesWithScope('project', scopes),
				workflowRoles: await roleService.rolesWithScope('workflow', scopes),
			};
		};

		it('orders candidates by most recently updated first', async () => {
			const older = await createWorkflow({ nodes: [makeNode({ name: 'orders a' })] }, member);
			const newer = await createWorkflow({ nodes: [makeNode({ name: 'orders b' })] }, member);

			// createWorkflow can stamp both rows within the same clock tick.
			await workflowRepository.update(newer.id, { updatedAt: new Date(Date.now() + 60_000) });

			const candidates = await workflowRepository.findNodeSearchCandidates(
				member,
				await readSharingOptions(),
				'orders',
				10,
			);

			expect(candidates.map((c) => c.id)).toEqual([newer.id, older.id]);
		});

		it('continues after the cursor without skipping or repeating rows', async () => {
			const workflows = [];
			for (let i = 0; i < 3; i++) {
				workflows.push(
					await createWorkflow({ nodes: [makeNode({ name: `orders ${i}` })] }, member),
				);
			}
			// Same timestamp on every row: the id tiebreak alone must page correctly.
			const sharedTime = new Date(Date.now() + 60_000);
			for (const workflow of workflows) {
				await workflowRepository.update(workflow.id, { updatedAt: sharedTime });
			}

			const sharingOptions = await readSharingOptions();
			const first = await workflowRepository.findNodeSearchCandidates(
				member,
				sharingOptions,
				'orders',
				2,
			);
			expect(first).toHaveLength(2);

			const last = first[first.length - 1];
			const second = await workflowRepository.findNodeSearchCandidates(
				member,
				sharingOptions,
				'orders',
				2,
				undefined,
				{ updatedAt: last.updatedAt, id: last.id },
			);

			const seen = [...first, ...second].map((candidate) => candidate.id);
			expect(seen).toHaveLength(3);
			expect(new Set(seen).size).toBe(3);
		});

		it('respects the candidate limit', async () => {
			await createWorkflow({ nodes: [makeNode({ name: 'orders a' })] }, member);
			await createWorkflow({ nodes: [makeNode({ name: 'orders b' })] }, member);

			const candidates = await workflowRepository.findNodeSearchCandidates(
				member,
				await readSharingOptions(),
				'orders',
				1,
			);

			expect(candidates).toHaveLength(1);
		});
	});
});
