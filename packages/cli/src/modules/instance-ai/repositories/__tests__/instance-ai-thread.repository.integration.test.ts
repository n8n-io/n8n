import { randomUUID } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { WorkflowLoopStorage, WorkflowTaskCoordinator } from '@n8n/instance-ai';

import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';
import { InstanceAiObservationLockRepository } from '../instance-ai-observation-lock.repository';
import { InstanceAiObservationRepository } from '../instance-ai-observation.repository';
import { InstanceAiResourceRepository } from '../instance-ai-resource.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

describe('Instance AI thread verification transitions', () => {
	let repository: InstanceAiThreadRepository;
	let project: Project;
	let threadId: string;
	let memory: TypeORMAgentMemory;
	let storage: WorkflowLoopStorage;
	let coordinator: WorkflowTaskCoordinator;

	function createMemory() {
		return new TypeORMAgentMemory(
			repository,
			Container.get(InstanceAiMessageRepository),
			Container.get(InstanceAiResourceRepository),
			Container.get(InstanceAiObservationRepository),
			Container.get(InstanceAiObservationCursorRepository),
			Container.get(InstanceAiObservationLockRepository),
			Container.get(Logger),
		);
	}

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiThreadRepository);
		project = await createTeamProject();
	});

	beforeEach(async () => {
		await repository.delete({});
		threadId = randomUUID();
		await repository.save(
			repository.create({
				id: threadId,
				resourceId: 'user-1',
				projectId: project.id,
				title: 'Build',
				metadata: { unrelated: { keep: true } },
			}),
		);
		memory = createMemory();
		storage = new WorkflowLoopStorage(memory);
		coordinator = new WorkflowTaskCoordinator(threadId, storage);
		await coordinator.reportBuildOutcome({
			workItemId: 'wi-1',
			runId: 'build-run',
			taskId: 'build-task',
			workflowId: 'wf-1',
			owner: { type: 'planned', taskId: 'planned-task' },
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: true,
			nodeSimulationPlan: [],
			summary: 'Submitted.',
			sourceFilePath: 'main.workflow.ts',
			verificationReadiness: {
				status: 'needs_setup',
				reason: 'workflow-needs-setup',
				guidance: 'Connect the account.',
			},
			remediation: { category: 'needs_setup', shouldEdit: false, guidance: 'Connect the account.' },
		});
		await storage.saveWorkItem(
			threadId,
			{
				workItemId: 'wi-other',
				threadId,
				status: 'completed',
				phase: 'done',
				source: 'create',
				rebuildAttempts: 0,
			},
			[],
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([false, true])(
		'allows one host to claim the same snapshot with prior setup failure=%s',
		async (priorSetupFailure) => {
			if (priorSetupFailure) {
				const initial = (await storage.getWorkItem(threadId, 'wi-1'))!;
				await coordinator.beginVerification(initial.lastBuildOutcome!, initial.state, 'build-run');
				await coordinator.updateBuildOutcome('wi-1', {
					verifyAttempts: 1,
					verification: {
						attempted: true,
						success: false,
						executionId: 'setup-failure',
						status: 'error',
					},
				});
				await coordinator.reportVerificationVerdict({
					workItemId: 'wi-1',
					workflowId: 'wf-1',
					runId: 'build-run',
					verdict: 'needs_user_input',
					remediation: {
						category: 'needs_setup',
						shouldEdit: false,
						guidance: 'Connect the account.',
					},
					summary: 'The verification requires setup.',
				});
			}

			const before = (await storage.getWorkItem(threadId, 'wi-1'))!;
			const siblingBefore = await storage.getWorkItem(threadId, 'wi-other');
			const other = new WorkflowTaskCoordinator(threadId, new WorkflowLoopStorage(createMemory()));
			const claims = await Promise.all([
				coordinator.beginVerification(before.lastBuildOutcome!, before.state, 'turn-a'),
				other.beginVerification(before.lastBuildOutcome!, before.state, 'turn-b'),
			]);

			expect(claims.filter(Boolean)).toHaveLength(1);
			const after = (await storage.getWorkItem(threadId, 'wi-1'))!;
			expect(after.state).toEqual({
				...before.state,
				runId: claims[0] ? 'turn-a' : 'turn-b',
				phase: 'verifying',
				status: 'active',
				lastRemediation: undefined,
			});
			expect(after.attempts).toEqual(before.attempts);
			expect(after.lastBuildOutcome).toEqual({
				...before.lastBuildOutcome,
				verificationReadiness: { status: 'ready' },
				remediation: undefined,
			});
			expect(await storage.getWorkItem(threadId, 'wi-other')).toEqual(siblingBefore);
			expect((await repository.findOneByOrFail({ id: threadId })).metadata?.unrelated).toEqual({
				keep: true,
			});
		},
	);

	it('rejects a delayed claim after a newer build replaces its outcome', async () => {
		const before = (await storage.getWorkItem(threadId, 'wi-1'))!;
		await coordinator.reportBuildOutcome({
			...before.lastBuildOutcome!,
			taskId: 'new-build-task',
			summary: 'Rebuilt.',
		});
		const rebuilt = await storage.getWorkItem(threadId, 'wi-1');
		await expect(
			coordinator.beginVerification(before.lastBuildOutcome!, before.state, 'next-turn'),
		).resolves.toBe(false);
		expect(await storage.getWorkItem(threadId, 'wi-1')).toEqual(rebuilt);
	});

	it('preserves workflow state when a normal thread save overlaps a claim', async () => {
		const before = (await storage.getWorkItem(threadId, 'wi-1'))!;
		const otherMemory = createMemory();
		const results = await Promise.all([
			coordinator.beginVerification(before.lastBuildOutcome!, before.state, 'next-turn'),
			otherMemory.saveThread({
				id: threadId,
				resourceId: 'user-1',
				title: 'Updated title',
				metadata: { anotherKey: true, instanceAiWorkflowLoop: {} },
			}),
		]);
		expect(results[0]).toBe(true);
		expect((await storage.getWorkItem(threadId, 'wi-1'))?.state.runId).toBe('next-turn');
		const row = await repository.findOneByOrFail({ id: threadId });
		expect(row.title).toBe('Updated title');
		expect(row.metadata).toMatchObject({ unrelated: { keep: true }, anotherKey: true });
	});

	it('does not report success for missing records or rejected updates', async () => {
		const before = await storage.getWorkItem(threadId, 'wi-1');
		await expect(storage.updateWorkItem(threadId, 'missing', (record) => record)).resolves.toBe(
			false,
		);
		await expect(storage.updateWorkItem(threadId, 'wi-1', () => null)).resolves.toBe(false);
		await expect(storage.updateWorkItem(randomUUID(), 'wi-1', (record) => record)).resolves.toBe(
			false,
		);
		expect(await storage.getWorkItem(threadId, 'wi-1')).toEqual(before);
	});
});
