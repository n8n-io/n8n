import type { CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { Agent } from '../entities/agent.entity';
import {
	AgentsPublicApi,
	type BuilderCredentialService,
	type BuilderSessionOptions,
} from '../public-api';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

type Dependencies = ConstructorParameters<typeof AgentsPublicApi>;

function setup() {
	const settings = mock<Dependencies[0]>();
	const agents = mock<Dependencies[1]>();
	const builder = mock<Dependencies[2]>();
	const config = mock<Dependencies[4]>();
	const skills = mock<Dependencies[5]>();
	const sessions = mock<Dependencies[6]>();
	const threads = mock<Dependencies[7]>();
	const memory = mock<Dependencies[8]>();
	const defaultModel = mock<Dependencies[9]>();
	const runnableState = mock<Dependencies[10]>();
	settings.assertEnabled.mockResolvedValue(undefined);
	defaultModel.resolve.mockResolvedValue(null);
	runnableState.addRunnableState.mockImplementation(
		async (agent) => ({ ...agent, isRunnable: true }) as never,
	);
	const api = new AgentsPublicApi(
		settings,
		agents,
		builder,
		mock(),
		config,
		skills,
		sessions,
		threads,
		memory,
		defaultModel,
		runnableState,
		mock(),
		mock(),
	);
	return {
		api,
		settings,
		agents,
		builder,
		config,
		skills,
		sessions,
		threads,
		memory,
		defaultModel,
		runnableState,
	};
}

const user = mock<User>({ id: 'user-1' });
const draft = mock<Agent>({ id: 'agent-1', projectId: 'project-1', name: 'Persisted name' });

describe('AgentsPublicApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('requires create and update scopes before it adopts a draft', async () => {
		const { api, agents } = setup();
		agents.createOrAdopt.mockResolvedValue({ agent: draft, adopted: true });
		expect(
			await api.createDraft(user, 'project-1', 'Draft name', {
				id: 'agent-1',
				adoptOnCollision: true,
			}),
		).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			name: 'Persisted name',
			adopted: true,
		});
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create', 'agent:update'], false, {
			projectId: 'project-1',
		});
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(api.createDraft(user, 'project-1', 'Draft name')).rejects.toThrow(ForbiddenError);
		expect(agents.createOrAdopt).toHaveBeenCalledTimes(1);
	});

	it('seeds a new pending draft with the default model and returns runnable state', async () => {
		const { api, agents, defaultModel } = setup();
		agents.create.mockResolvedValue(draft);
		defaultModel.resolve.mockResolvedValue({
			model: 'anthropic/model',
			credential: 'credential-1',
		});
		const result = await api.persistDraft(user, 'project-1', {
			id: 'agent-1',
			name: 'Draft name',
			adoptOnCollision: false,
		});
		expect(result).toMatchObject({ id: 'agent-1' });
		expect(await result?.getState()).toMatchObject({ id: 'agent-1', isRunnable: true });
		expect(agents.create).toHaveBeenCalledWith('project-1', 'Draft name', {
			id: 'agent-1',
			adoptOnCollision: false,
			actor: { kind: 'user', user },
			defaultModel: { model: 'anthropic/model', credential: 'credential-1' },
		});
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create'], false, {
			projectId: 'project-1',
		});
	});

	it('adopts an existing or concurrently created draft without replacing its name', async () => {
		const { api, agents, defaultModel } = setup();
		agents.findById.mockResolvedValueOnce(draft).mockResolvedValueOnce(null);
		agents.create.mockResolvedValue(draft);
		const options = { id: 'agent-1', name: 'Draft name', adoptOnCollision: true };
		expect(await api.persistDraft(user, 'project-1', options)).toMatchObject({
			name: 'Persisted name',
		});
		expect(defaultModel.resolve).not.toHaveBeenCalled();
		expect(await api.persistDraft(user, 'project-1', options)).toMatchObject({
			name: 'Persisted name',
		});
		expect(agents.create).toHaveBeenCalledWith(
			'project-1',
			'Draft name',
			expect.objectContaining({ adoptOnCollision: true }),
		);
	});

	it('does not adopt a pending draft without host attestation', async () => {
		const { api, agents } = setup();
		agents.findById.mockResolvedValue(draft);
		expect(
			await api.persistDraft(user, 'project-1', {
				id: 'agent-1',
				name: 'Draft',
				adoptOnCollision: false,
			}),
		).toBeNull();
		expect(agents.create).not.toHaveBeenCalled();
	});

	it('checks availability and authorization again on each builder operation', async () => {
		const { api, settings, builder } = setup();
		builder.findOpenCheckpointForThread.mockResolvedValue({
			pendingToolCalls: { tool: { suspended: true, runId: 'run-1', toolCallId: 'call-1' } },
		} as never);
		expect(await api.findOpenSuspensions(user, 'project-1', 'agent-1', 'thread-1')).toEqual([
			{ runId: 'run-1', toolCallId: 'call-1' },
		]);
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(api.findOpenSuspensions(user, 'project-1', 'agent-1', 'thread-1')).rejects.toThrow(
			ForbiddenError,
		);
		settings.assertEnabled.mockRejectedValue(new NotFoundError('Agents are disabled'));
		const request = {
			user,
			projectId: 'project-1',
			agentId: 'agent-1',
			credentialProvider: mock<CredentialProvider>(),
			credentialService: mock<BuilderCredentialService>(),
			session: mock<BuilderSessionOptions>(),
		};
		await expect(api.build(request, 'Build')).rejects.toThrow('Agents are disabled');
		await expect(
			api.resumeBuild(request, { runId: 'run-1', toolCallId: 'call-1', resumeData: {} }),
		).rejects.toThrow('Agents are disabled');
		expect(builder.buildAgent).not.toHaveBeenCalled();
		expect(builder.resumeBuild).not.toHaveBeenCalled();
	});

	it('still permits an authorized cancellation when Agents are disabled', async () => {
		const { api, settings, builder } = setup();
		settings.assertEnabled.mockRejectedValue(new NotFoundError('Agents are disabled'));
		await api.cancelOpenSuspension(user, 'project-1', 'agent-1', 'run-1');
		expect(builder.cancelCheckpoint).toHaveBeenCalledWith('agent-1', 'run-1');
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(api.cancelOpenSuspension(user, 'project-1', 'agent-1', 'run-1')).rejects.toThrow(
			ForbiddenError,
		);
	});

	it('distinguishes a fresh draft from a failed artifact read', async () => {
		const { api, config } = setup();
		config.getConfig
			.mockRejectedValueOnce(new UserError('No config'))
			.mockRejectedValueOnce(new Error('Read failed'));
		expect(await api.readArtifact(user, 'project-1', 'agent-1')).toBeNull();
		await expect(api.readArtifact(user, 'project-1', 'agent-1')).rejects.toThrow('Read failed');
	});

	it('deletes all opaque builder sessions through agent-scoped memory', async () => {
		const { api, threads, memory } = setup();
		const implementation = mock<ReturnType<Dependencies[8]['getImplementation']>>();
		memory.getImplementation.mockReturnValue(implementation);
		threads.findBuilderSessionIds.mockResolvedValue([
			'builder:thread:agent-1',
			'builder:thread:agent-2',
		]);
		await api.deleteBuilderSessions('builder:thread:');
		expect(memory.getImplementation.mock.calls).toEqual([['agent-1'], ['agent-2']]);
		expect(implementation.deleteThread.mock.calls).toEqual([
			['builder:thread:agent-1'],
			['builder:thread:agent-2'],
		]);
	});
});
