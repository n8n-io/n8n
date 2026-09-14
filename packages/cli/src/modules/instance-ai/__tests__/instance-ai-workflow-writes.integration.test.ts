import { LicenseState } from '@n8n/backend-common';
import {
	createWorkflow,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { License } from '@/license';
import { Push } from '@/push';
import { CacheService } from '@/services/cache/cache.service';
import { Telemetry } from '@/telemetry';
import { createMember, createOwner } from '@test-integration/db/users';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

/**
 * Instance AI writes bypass the REST controller, so the editor write lock and
 * the `workflowUpdated` broadcast have to be enforced by the adapter itself.
 */
describe('Instance AI workflow writes (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));

	const EDITOR_CLIENT_ID = 'editor-client-id';

	let pushService: Push;
	let collaborationService: CollaborationService;
	let cacheService: CacheService;
	let workflowRepository: WorkflowRepository;
	let adapterService: InstanceAiAdapterService;

	/** The user chatting with Instance AI. */
	let agentUser: User;
	/** A collaborator with the workflow open on the canvas. */
	let editingUser: User;
	let workflow: IWorkflowBase;

	const workflowJson = (name: string) =>
		({ name, nodes: [], connections: {} }) as unknown as WorkflowJSON;

	const instanceAiWorkflows = () =>
		adapterService.createContext(agentUser, { threadId: 'thread-1' }).workflowService;

	const openInEditor = async (user: User, clientId: string) =>
		await collaborationService.handleUserMessage(user.id, clientId, {
			type: 'workflowOpened',
			workflowId: workflow.id,
		});

	const acquireWriteLock = async (user: User, clientId: string) =>
		await collaborationService.handleUserMessage(user.id, clientId, {
			type: 'writeAccessRequested',
			workflowId: workflow.id,
		});

	const releaseWriteLock = async (user: User, clientId: string) =>
		await collaborationService.handleUserMessage(user.id, clientId, {
			type: 'writeAccessReleaseRequested',
			workflowId: workflow.id,
		});

	const storedWorkflow = async () => await workflowRepository.findOneByOrFail({ id: workflow.id });

	beforeAll(async () => {
		await testDb.init();
		Container.get(LicenseState).setLicenseProvider(Container.get(License));

		pushService = Container.get(Push);
		collaborationService = Container.get(CollaborationService);
		cacheService = Container.get(CacheService);
		workflowRepository = Container.get(WorkflowRepository);
		adapterService = Container.get(InstanceAiAdapterService);

		await cacheService.init();

		[agentUser, editingUser] = await Promise.all([createOwner(), createMember()]);
	});

	beforeEach(async () => {
		workflow = await createWorkflow({ name: 'Original name' }, agentUser);
		await shareWorkflowWithUsers(workflow, [editingUser]);
	});

	afterEach(async () => {
		vi.resetAllMocks();
		await cacheService.reset();
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('while another user holds the editor write lock', () => {
		beforeEach(async () => {
			await openInEditor(editingUser, EDITOR_CLIENT_ID);
			await acquireWriteLock(editingUser, EDITOR_CLIENT_ID);
		});

		it('rejects an update and leaves the stored workflow untouched', async () => {
			await expect(
				instanceAiWorkflows().updateFromWorkflowJSON(workflow.id, workflowJson('Renamed by AI')),
			).rejects.toThrow(/being edited/);

			expect((await storedWorkflow()).name).toBe('Original name');
		});

		it('rejects a publish', async () => {
			await expect(instanceAiWorkflows().publish(workflow.id)).rejects.toThrow(/being edited/);

			expect((await storedWorkflow()).activeVersionId).toBeNull();
		});

		it('rejects an archive', async () => {
			await expect(instanceAiWorkflows().archive(workflow.id)).rejects.toThrow(/being edited/);

			expect((await storedWorkflow()).isArchived).toBe(false);
		});

		it('allows the update once the lock is released', async () => {
			await releaseWriteLock(editingUser, EDITOR_CLIENT_ID);

			await instanceAiWorkflows().updateFromWorkflowJSON(
				workflow.id,
				workflowJson('Renamed by AI'),
			);

			expect((await storedWorkflow()).name).toBe('Renamed by AI');
		});
	});

	describe('when nobody holds the editor write lock', () => {
		it('notifies open editors that the workflow changed', async () => {
			await openInEditor(editingUser, EDITOR_CLIENT_ID);
			vi.mocked(pushService.sendToUsers).mockClear();

			await instanceAiWorkflows().updateFromWorkflowJSON(
				workflow.id,
				workflowJson('Renamed by AI'),
			);

			expect((await storedWorkflow()).name).toBe('Renamed by AI');
			expect(pushService.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowUpdated', data: { workflowId: workflow.id, userId: agentUser.id } },
				expect.arrayContaining([editingUser.id]),
			);
		});

		it('does not notify anyone when the workflow is not open in an editor', async () => {
			await instanceAiWorkflows().updateFromWorkflowJSON(
				workflow.id,
				workflowJson('Renamed by AI'),
			);

			expect(pushService.sendToUsers).not.toHaveBeenCalled();
		});
	});
});
