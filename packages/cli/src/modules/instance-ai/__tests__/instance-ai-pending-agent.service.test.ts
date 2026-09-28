import type { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { AgentRunnableStateService } from '@/modules/agents/agent-runnable-state.service';
import { AgentsService } from '@/modules/agents/agents.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import * as checkAccess from '@/permissions.ee/check-access';

import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiPendingAgentService } from '../instance-ai-pending-agent.service';

const user = mock<User>({ id: 'user-1' });
const PROJECT_ID = 'project-1';
const AGENT_ID = 'aBcDeFgHiJkLmNoP';
const THREAD_ID = 'thread-1';

/** Thread metadata written by the frontend when it opens an unsaved new-agent artifact. */
const pendingMetadata = {
	instanceAiPendingAgentTarget: { projectId: PROJECT_ID, agentId: AGENT_ID },
};
/** ...and what replaces it once any writer binds the agent to the thread. */
const boundMetadata = {
	instanceAiAgentBuilderTarget: {
		projectId: PROJECT_ID,
		agentId: AGENT_ID,
		name: 'Support Triage',
	},
};

function setup() {
	const memoryService = mock<InstanceAiMemoryService>();
	// The service resolves these through the container on use, not by injection.
	const agentsService = mockInstance(AgentsService);
	const runnableState = mockInstance(AgentRunnableStateService);
	const defaultModelResolver = mockInstance(AgentDefaultModelResolverService);
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(true);

	defaultModelResolver.resolve.mockResolvedValue(null);
	runnableState.addRunnableState.mockImplementation(
		async (agent) => ({ ...agent, isRunnable: true }) as never,
	);
	memoryService.getThreadProjectId.mockResolvedValue(PROJECT_ID);
	memoryService.bindAgentBuilderTarget.mockResolvedValue({
		id: THREAD_ID,
		resourceId: user.id,
		createdAt: '2026-08-20T00:00:00.000Z',
		updatedAt: '2026-08-20T00:00:00.000Z',
		metadata: boundMetadata,
	});

	const service = new InstanceAiPendingAgentService(memoryService, moduleRegistry);
	return {
		service,
		memoryService,
		agentsService,
		runnableState,
		defaultModelResolver,
		moduleRegistry,
	};
}

const payload = { projectId: PROJECT_ID, agentId: AGENT_ID, name: 'New Agent' };

describe('InstanceAiPendingAgentService', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
	});

	it('creates the agent under the client-minted id and binds it to the thread', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		agentsService.create.mockResolvedValue(
			mock<Agent>({ id: AGENT_ID, name: 'New Agent', projectId: PROJECT_ID }),
		);

		const result = await service.persistAndBind(user, THREAD_ID, payload);

		expect(agentsService.create).toHaveBeenCalledWith(PROJECT_ID, 'New Agent', {
			id: AGENT_ID,
			adoptOnCollision: true,
		});
		expect(memoryService.bindAgentBuilderTarget).toHaveBeenCalledWith(user.id, THREAD_ID, {
			agentId: AGENT_ID,
			projectId: PROJECT_ID,
			name: 'New Agent',
		});
		expect(result.thread.metadata).toEqual(boundMetadata);
		expect(result.agent).toEqual(expect.objectContaining({ id: AGENT_ID, isRunnable: true }));
	});

	it('seeds the project default model, like the strict create does', async () => {
		const { service, memoryService, agentsService, defaultModelResolver } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		defaultModelResolver.resolve.mockResolvedValue({ model: 'anthropic/x', credential: 'cred-1' });
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'New Agent' }));

		await service.persistAndBind(user, THREAD_ID, payload);

		expect(agentsService.create).toHaveBeenCalledWith(
			PROJECT_ID,
			'New Agent',
			expect.objectContaining({ defaultModel: { model: 'anthropic/x', credential: 'cred-1' } }),
		);
	});

	// Resolving a default model reaches the provider's model catalogue, and an
	// adopted row would discard the result.
	it('adopts an existing row without resolving a default model for it', async () => {
		const { service, memoryService, agentsService, defaultModelResolver } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		const existing = mock<Agent>({ id: AGENT_ID, name: 'Support Triage' });
		agentsService.findById.mockResolvedValue(existing);

		const result = await service.persistAndBind(user, THREAD_ID, payload);

		expect(result.agent).toEqual(expect.objectContaining({ id: AGENT_ID }));
		expect(agentsService.create).not.toHaveBeenCalled();
		expect(defaultModelResolver.resolve).not.toHaveBeenCalled();
		expect(memoryService.bindAgentBuilderTarget).toHaveBeenCalled();
	});

	// The whole point: whichever writer inserts first usually names and configures
	// the row before the other one gets here.
	it('binds the adopted name, not the draft name it was called with', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		agentsService.create.mockResolvedValue(
			mock<Agent>({ id: AGENT_ID, name: 'Support Triage', projectId: PROJECT_ID }),
		);

		await service.persistAndBind(user, THREAD_ID, payload);

		expect(memoryService.bindAgentBuilderTarget).toHaveBeenCalledWith(
			user.id,
			THREAD_ID,
			expect.objectContaining({ name: 'Support Triage' }),
		);
	});

	// The winner's bind deletes the pending marker, so the loser can only prove
	// itself by the active binding.
	it('accepts the active bound target as proof once the pending marker is gone', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(boundMetadata);
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'Support Triage' }));

		await expect(service.persistAndBind(user, THREAD_ID, payload)).resolves.toBeDefined();
	});

	const unattestedMetadata: Array<[string, Record<string, unknown> | undefined]> = [
		['a thread with no agent metadata at all', {}],
		['an unowned thread, which reads as no metadata', undefined],
		[
			'a pending marker for another agent',
			{ instanceAiPendingAgentTarget: { projectId: PROJECT_ID, agentId: 'zZzZzZzZzZzZzZzZ' } },
		],
		[
			'a pending marker for another project',
			{ instanceAiPendingAgentTarget: { projectId: 'other-project', agentId: AGENT_ID } },
		],
		[
			'a bound target for another project',
			{ instanceAiAgentBuilderTarget: { projectId: 'other-project', agentId: AGENT_ID } },
		],
	];

	it.each(unattestedMetadata)('refuses to adopt an existing row with %s', async (_l, metadata) => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(metadata);
		agentsService.findById.mockResolvedValue(mock<Agent>({ id: AGENT_ID }));

		await expect(service.persistAndBind(user, THREAD_ID, payload)).rejects.toThrow(ForbiddenError);
		expect(agentsService.create).not.toHaveBeenCalled();
		expect(memoryService.bindAgentBuilderTarget).not.toHaveBeenCalled();
	});

	// Attestation authorizes taking over someone else's row, not creating one. Any
	// bind drops the pending marker, so a thread that has since targeted another
	// agent must still be able to save the draft it has open.
	it.each(unattestedMetadata)('still creates the draft with %s', async (_l, metadata) => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(metadata);
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'New Agent' }));

		await expect(service.persistAndBind(user, THREAD_ID, payload)).resolves.toBeDefined();
		// Strict: an unattested create must not quietly adopt on a collision.
		expect(agentsService.create).toHaveBeenCalledWith(
			PROJECT_ID,
			'New Agent',
			expect.objectContaining({ id: AGENT_ID, adoptOnCollision: false }),
		);
		expect(memoryService.bindAgentBuilderTarget).toHaveBeenCalled();
	});

	it('needs only agent:create to create, not agent:update', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue({});
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'New Agent' }));
		const userHasScopes = vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

		await service.persistAndBind(user, THREAD_ID, payload);

		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create'], false, {
			projectId: PROJECT_ID,
		});
	});

	it('requires both agent:create and agent:update in the project', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		const userHasScopes = vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

		await expect(service.persistAndBind(user, THREAD_ID, payload)).rejects.toThrow(ForbiddenError);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create', 'agent:update'], false, {
			projectId: PROJECT_ID,
		});
		expect(agentsService.create).not.toHaveBeenCalled();
	});

	// The row and the binding are separate writes; the caller retries, and the
	// retry adopts the row the failed attempt left behind.
	it('propagates a binding failure without swallowing it', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'New Agent' }));
		memoryService.bindAgentBuilderTarget.mockRejectedValue(new Error('thread write failed'));

		await expect(service.persistAndBind(user, THREAD_ID, payload)).rejects.toThrow(
			'thread write failed',
		);
	});

	// A thread belongs to one project, and instance-ai ignores a pending marker
	// from another — binding across projects leaves an unusable target.
	it('refuses a payload project that is not the thread project', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadProjectId.mockResolvedValue('other-project');
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);

		await expect(service.persistAndBind(user, THREAD_ID, payload)).rejects.toThrow(ForbiddenError);
		expect(agentsService.create).not.toHaveBeenCalled();
		expect(agentsService.findById).not.toHaveBeenCalled();
	});

	it('allows a thread persisted before threads carried a project', async () => {
		const { service, memoryService, agentsService } = setup();
		memoryService.getThreadProjectId.mockResolvedValue(undefined);
		memoryService.getThreadMetadata.mockResolvedValue(pendingMetadata);
		agentsService.create.mockResolvedValue(mock<Agent>({ id: AGENT_ID, name: 'New Agent' }));

		await expect(service.persistAndBind(user, THREAD_ID, payload)).resolves.toBeDefined();
	});

	it('reports agents being unavailable before touching the thread', async () => {
		const { service, memoryService, moduleRegistry } = setup();
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(service.persistAndBind(user, THREAD_ID, payload)).rejects.toThrow(NotFoundError);
		expect(memoryService.getThreadMetadata).not.toHaveBeenCalled();
	});
});
