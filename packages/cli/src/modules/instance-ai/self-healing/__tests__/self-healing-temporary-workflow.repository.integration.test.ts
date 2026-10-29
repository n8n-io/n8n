import {
	createTeamProject,
	createWorkflowWithHistory,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	ExecutionRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import { SelfHealingTemporaryWorkflowRepository } from '../database/self-healing-temporary-workflow.repository';

let repository: SelfHealingTemporaryWorkflowRepository;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	repository = Container.get(SelfHealingTemporaryWorkflowRepository);
});
afterAll(async () => await testDb.terminate());
afterEach(async () => {
	await repository.clear();
	await testDb.truncate(['WorkflowEntity']);
});

const markerId = (workflowId: string) => `verification-workflow:${workflowId}`;

async function fixture() {
	const project = await createTeamProject();
	const created = await createWorkflowWithHistory(
		{
			staticData: { global: { cursor: 4 } },
			pinData: { 'Schedule Trigger': [{ json: { value: 'original' } }] },
		},
		project,
	);
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(created.id, { activeVersionId: created.versionId, active: true });
	const original = await workflows.findOneByOrFail({ id: created.id });
	const originalHistory = await Container.get(WorkflowHistoryRepository).findBy({
		workflowId: original.id,
	});
	const editorProject = await createTeamProject();
	await Container.get(SharedWorkflowRepository).insert({
		workflowId: original.id,
		projectId: editorProject.id,
		role: 'workflow:editor',
	});
	const temporary = new WorkflowEntity();
	temporary.name = 'Assistant verification';
	temporary.nodes = structuredClone(original.nodes);
	temporary.connections = structuredClone(original.connections);
	temporary.staticData = structuredClone(original.staticData);
	temporary.pinData = structuredClone(original.pinData);
	temporary.active = false;
	temporary.activeVersionId = null;
	temporary.isArchived = true;
	temporary.versionId = randomUUID();
	const policyCleared = await new PolicyEnforcementService().enforceWorkflowSave(
		{ workflow: temporary, storedWorkflow: null, projectId: project.id },
		{ kind: 'system', reason: 'execution' },
	);
	const saved = await Container.get(TransactionRunner).run(
		{ policyCleared },
		async (ctx) => await repository.createTemporary(temporary, original.id, ctx),
	);
	return { original, originalHistory, saved };
}

it('copies access and keeps the original workflow and its history unchanged', async () => {
	const { original, originalHistory, saved } = await fixture();
	const workflows = Container.get(WorkflowRepository);
	const shares = Container.get(SharedWorkflowRepository);
	expect(saved.id).not.toBe(original.id);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	const access = async (workflowId: string) =>
		(await shares.findBy({ workflowId }))
			.map(({ projectId, role }) => ({ projectId, role }))
			.sort((left, right) => left.projectId.localeCompare(right.projectId));
	expect(await access(saved.id)).toEqual(await access(original.id));
	expect(await Container.get(WorkflowHistoryRepository).countBy({ workflowId: saved.id })).toBe(0);
	expect(await repository.existsBy({ id: markerId(saved.id) })).toBe(true);
	await workflows.update(saved.id, { staticData: { global: { cursor: 20 } }, pinData: {} });
	await repository.deleteTemporary(saved.id);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(
		await Container.get(WorkflowHistoryRepository).findBy({ workflowId: original.id }),
	).toEqual(originalHistory);
});

it('permits cleanup only for marked temporary workflows', async () => {
	const { original, saved } = await fixture();
	expect(await repository.canDelete(original.id)).toBe(false);
	expect(await repository.canDelete(saved.id)).toBe(true);
	await repository.deleteTemporary(saved.id);
	expect(await Container.get(WorkflowRepository).existsBy({ id: saved.id })).toBe(false);
	expect(await repository.existsBy({ id: markerId(saved.id) })).toBe(false);
});

it('retires the cleanup marker without changing a restored workflow', async () => {
	const { saved } = await fixture();
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(saved.id, { isArchived: false });
	const restored = await workflows.findOneByOrFail({ id: saved.id });
	await repository.update(
		{ id: markerId(saved.id) },
		{ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
	);
	expect(await repository.findAbandonedIds(new Date())).toEqual([saved.id]);

	expect(await repository.findUnfinishedExecutionIds(saved.id)).toEqual([]);
	expect(await repository.canDelete(saved.id)).toBe(false);
	expect(await repository.existsBy({ id: markerId(saved.id) })).toBe(false);
	expect(await repository.findAbandonedIds(new Date())).toEqual([]);
	expect(await workflows.findOneByOrFail({ id: saved.id })).toEqual(restored);
});

it.each(['new', 'running', 'waiting', 'unknown'] as const)(
	'defers cleanup while its execution is %s',
	async (status) => {
		const { saved } = await fixture();
		const execution = await Container.get(ExecutionRepository).save({
			workflowId: saved.id,
			status,
			mode: 'manual',
			createdAt: new Date(),
			finished: false,
		});
		expect(await repository.findUnfinishedExecutionIds(saved.id)).toEqual([execution.id]);
		expect(await repository.canDelete(saved.id)).toBe(false);
	},
);

it('recovers only old verification markers', async () => {
	const { saved } = await fixture();
	const old = new Date('2026-10-10T00:00:00Z');
	await repository.save({ id: `thread:${randomUUID()}`, createdAt: old });
	expect(await repository.findAbandonedIds(new Date('2026-10-11T00:00:00Z'))).toEqual([]);
	await repository.update({ id: markerId(saved.id) }, { createdAt: old });
	expect(await repository.findAbandonedIds(new Date('2026-10-11T00:00:00Z'))).toEqual([saved.id]);
});

it('keeps canceled executions until recovery can safely remove the snapshot', async () => {
	const { saved } = await fixture();
	await Container.get(ExecutionRepository).save({
		workflowId: saved.id,
		status: 'canceled',
		mode: 'manual',
		createdAt: new Date(),
		finished: false,
	});
	expect(await repository.canDelete(saved.id)).toBe(false);
	await repository.update(
		{ id: markerId(saved.id) },
		{ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
	);
	expect(await repository.canDelete(saved.id)).toBe(true);
});

it('keeps an old snapshot when its execution was just canceled', async () => {
	const { saved } = await fixture();
	const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
	await repository.update({ id: markerId(saved.id) }, { createdAt: old });
	const executions = Container.get(ExecutionRepository);
	const execution = await executions.save({
		workflowId: saved.id,
		status: 'canceled',
		mode: 'manual',
		createdAt: old,
		stoppedAt: new Date(),
		finished: false,
	});
	expect(await repository.canDelete(saved.id)).toBe(false);
	await executions.update(execution.id, { stoppedAt: old });
	expect(await repository.canDelete(saved.id)).toBe(true);
});

it('removes the cleanup marker when the workflow was already deleted', async () => {
	const { saved } = await fixture();
	await Container.get(WorkflowRepository).delete(saved.id);
	expect(await repository.canDelete(saved.id)).toBe(true);
	await repository.deleteTemporary(saved.id);
	expect(await repository.existsBy({ id: markerId(saved.id) })).toBe(false);
});
