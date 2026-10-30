import { createWorkflow, shareWorkflowWithUsers, testDb } from '@n8n/backend-test-utils';
import { WorkflowSharingService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { accountFullName, GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';

import { OwnershipService } from '@/services/ownership.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createAdmin, createMember, createServiceAccountWithProject } from '../shared/db/users';

describe('Workflows with a service account as the personal owner', () => {
	let workflowFinderService: WorkflowFinderService;
	let workflowSharingService: WorkflowSharingService;
	let ownershipService: OwnershipService;

	beforeAll(async () => {
		await testDb.init();
		workflowFinderService = Container.get(WorkflowFinderService);
		workflowSharingService = Container.get(WorkflowSharingService);
		ownershipService = Container.get(OwnershipService);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** The ids of the workflows that the account can read, through the finder and through sharing. */
	async function readableWorkflowIds(account: User, workflowIds: string[]) {
		const found = await Promise.all(
			workflowIds.map(
				async (id) =>
					await workflowFinderService.findWorkflowForUser(id, account, ['workflow:read']),
			),
		);
		const shared = await workflowSharingService.getSharedWorkflowIds(account, {
			scopes: ['workflow:read'],
		});
		return {
			found: found.flatMap((workflow) => (workflow ? [workflow.id] : [])).sort(),
			shared: shared.sort(),
		};
	}

	// A member reads only the workflows of their own project. An admin reads every
	// personal workflow.
	it.each([
		['member', GLOBAL_MEMBER_ROLE, createMember, false],
		['admin', GLOBAL_ADMIN_ROLE, createAdmin, true],
	])(
		'gives a service account with the %s role the same workflows as a person with that role',
		async (_name, role, createPerson, readsAllPersonal) => {
			const person = await createPerson();
			const serviceAccount = await createServiceAccountWithProject(role);
			const personWorkflow = await createWorkflow({}, person);
			const serviceAccountWorkflow = await createWorkflow({}, serviceAccount);
			const workflowIds = [personWorkflow.id, serviceAccountWorkflow.id];

			const forPerson = await readableWorkflowIds(person, workflowIds);
			const forServiceAccount = await readableWorkflowIds(serviceAccount, workflowIds);

			const all = [...workflowIds].sort();
			const expected = (ownId: string) =>
				readsAllPersonal ? { found: all, shared: all } : { found: [ownId], shared: [ownId] };
			expect(forPerson).toEqual(expected(personWorkflow.id));
			expect(forServiceAccount).toEqual(expected(serviceAccountWorkflow.id));
		},
	);

	it('gives a workflow that a service account owns to the people it is shared with', async () => {
		const serviceAccount = await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE);
		const sharee = await createMember();
		const otherMember = await createMember();
		const workflow = await createWorkflow({}, serviceAccount);
		await shareWorkflowWithUsers(workflow, [sharee]);

		expect(await readableWorkflowIds(sharee, [workflow.id])).toEqual({
			found: [workflow.id],
			shared: [workflow.id],
		});
		expect(await readableWorkflowIds(otherMember, [workflow.id])).toEqual({
			found: [],
			shared: [],
		});
	});

	it('gives a service account the workflows that a person shares with it', async () => {
		const person = await createMember();
		const serviceAccount = await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE);
		const sharedWorkflow = await createWorkflow({}, person);
		await createWorkflow({}, person);
		await shareWorkflowWithUsers(sharedWorkflow, [serviceAccount]);

		const workflowIds = [sharedWorkflow.id];
		expect(await readableWorkflowIds(serviceAccount, workflowIds)).toEqual({
			found: workflowIds,
			shared: workflowIds,
		});
	});

	// The sub-workflow policy error names this owner.
	it('names a service account as the owner of its workflow, also from the cache', async () => {
		const serviceAccount = await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE);
		const workflow = await createWorkflow({}, serviceAccount);
		const project = await ownershipService.getWorkflowProjectCached(workflow.id);

		const fromDb = await ownershipService.getPersonalProjectOwnerCached(project.id);
		const fromCache = await ownershipService.getPersonalProjectOwnerCached(project.id);

		expect(fromDb?.id).toBe(serviceAccount.id);
		expect(fromDb && accountFullName(fromDb)).toBe('Deploy bot');
		expect(fromCache?.id).toBe(serviceAccount.id);
		expect(fromCache && accountFullName(fromCache)).toBe('Deploy bot');
	});
});
