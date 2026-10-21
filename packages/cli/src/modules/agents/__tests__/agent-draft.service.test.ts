import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { ProjectAgent } from '../entities/agent.entity';
import { AgentDraftService } from '../agent-draft.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

type Dependencies = ConstructorParameters<typeof AgentDraftService>;

function setup() {
	const settings = mock<Dependencies[0]>();
	const agents = mock<Dependencies[1]>();
	const defaultModel = mock<Dependencies[2]>();
	const runnableState = mock<Dependencies[3]>();
	settings.assertEnabled.mockResolvedValue(undefined);
	defaultModel.resolve.mockResolvedValue(null);
	agents.createOrAdopt.mockResolvedValue({
		agent: draft,
		adopted: false,
		config: null,
		configHash: null,
	});
	agents.getCreationResult.mockImplementation(async (agent, adopted) => ({
		agent,
		adopted,
		config: null,
		configHash: null,
	}));
	runnableState.addRunnableState.mockImplementation(
		async (agent) => ({ ...agent, isRunnable: true }) as never,
	);
	const service = new AgentDraftService(settings, agents, defaultModel, runnableState);
	return { service, settings, agents, defaultModel, runnableState };
}

const user = mock<User>({ id: 'user-1' });
const draft = mock<ProjectAgent>({
	id: 'agent-1',
	projectId: 'project-1',
	name: 'Persisted name',
	versionId: 'v1',
});

describe('AgentDraftService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it.each([undefined, 'builder' as const])(
		'requires create and update scopes and preserves creation attribution: %s',
		async (createdBy) => {
			const { service, agents } = setup();
			agents.createOrAdopt.mockResolvedValue({
				agent: draft,
				adopted: true,
				config: null,
				configHash: null,
			});
			expect(
				await service.createDraft(user, 'project-1', 'Draft name', {
					id: 'agent-1',
					adoptOnCollision: true,
					createdBy,
				}),
			).toEqual({
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Persisted name',
				adopted: true,
			});
			expect(agents.createOrAdopt).toHaveBeenCalledWith('project-1', 'Draft name', {
				id: 'agent-1',
				adoptOnCollision: true,
				createdBy,
				actor: { kind: 'user', user },
				...(createdBy ? { user } : {}),
			});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create', 'agent:update'], false, {
				projectId: 'project-1',
			});
			vi.mocked(userHasScopes).mockResolvedValue(false);
			await expect(service.createDraft(user, 'project-1', 'Draft name')).rejects.toThrow(
				ForbiddenError,
			);
			expect(agents.createOrAdopt).toHaveBeenCalledTimes(1);
		},
	);

	it.each([undefined, { instructions: 'Help users' }])(
		'seeds a pending draft with the default model when the initial config has no model: %j',
		async (config) => {
			const { service, agents, defaultModel } = setup();
			defaultModel.resolve.mockResolvedValue({
				model: 'anthropic/model',
				credential: 'credential-1',
			});
			const result = await service.persistDraft(user, 'project-1', {
				id: 'agent-1',
				name: 'Draft name',
				adoptOnCollision: false,
				config,
			});
			expect(result).toMatchObject({ id: 'agent-1' });
			expect(await result?.getState()).toMatchObject({
				id: 'agent-1',
				projectId: 'project-1',
				isRunnable: true,
			});
			expect(agents.createOrAdopt).toHaveBeenCalledWith('project-1', 'Draft name', {
				id: 'agent-1',
				adoptOnCollision: false,
				actor: { kind: 'user', user },
				user,
				createdBy: 'user',
				config,
				pushRef: undefined,
				defaultModel: { model: 'anthropic/model', credential: 'credential-1' },
			});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create'], false, {
				projectId: 'project-1',
			});
		},
	);

	it.each(['', 'anthropic/model'])(
		'saves the initial config with explicit model "%s" and returns the saved baseline',
		async (model) => {
			const { service, agents, defaultModel } = setup();
			const config = { name: 'Persisted name', model, instructions: 'Help users' };
			agents.createOrAdopt.mockResolvedValue({
				agent: draft,
				config,
				configHash: 'saved-hash',
				adopted: false,
			});

			const result = await service.persistDraft(user, 'project-1', {
				id: 'agent-1',
				name: 'Draft name',
				adoptOnCollision: true,
				config,
				pushRef: 'tab-1',
			});

			expect(agents.createOrAdopt).toHaveBeenCalledWith('project-1', 'Draft name', {
				actor: { kind: 'user', user },
				user,
				createdBy: 'user',
				id: 'agent-1',
				adoptOnCollision: true,
				config,
				pushRef: 'tab-1',
			});
			expect(defaultModel.resolve).not.toHaveBeenCalled();
			expect(await result?.getState()).toMatchObject({
				id: 'agent-1',
				isRunnable: true,
				config,
				configHash: 'saved-hash',
				adopted: false,
				versionId: 'v1',
			});
		},
	);

	it('adopts an existing or concurrently created draft without replacing its name', async () => {
		const { service, agents, defaultModel } = setup();
		agents.findById.mockResolvedValueOnce(draft).mockResolvedValueOnce(null);
		const config = {
			name: 'Persisted name',
			model: 'anthropic/winner',
			instructions: 'Help users',
		};
		const winner = { agent: draft, config, configHash: 'winner-hash', adopted: true };
		agents.getCreationResult.mockResolvedValue(winner);
		agents.createOrAdopt.mockResolvedValue(winner);
		const options = {
			id: 'agent-1',
			name: 'Draft name',
			adoptOnCollision: true,
			config: { model: 'anthropic/loser' },
		};
		const existing = await service.persistDraft(user, 'project-1', options);
		expect(existing).toMatchObject({ name: 'Persisted name' });
		expect(await existing?.getState()).toMatchObject({
			config,
			configHash: 'winner-hash',
			adopted: true,
		});
		expect(agents.createOrAdopt).not.toHaveBeenCalled();
		expect(defaultModel.resolve).not.toHaveBeenCalled();
		const concurrent = await service.persistDraft(user, 'project-1', options);
		expect(concurrent).toMatchObject({ name: 'Persisted name' });
		expect(await concurrent?.getState()).toMatchObject({
			config,
			configHash: 'winner-hash',
			adopted: true,
		});
		expect(agents.createOrAdopt).toHaveBeenCalledWith(
			'project-1',
			'Draft name',
			expect.objectContaining({ adoptOnCollision: true }),
		);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:create', 'agent:update'], false, {
			projectId: 'project-1',
		});
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.persistDraft(user, 'project-1', options)).rejects.toThrow(ForbiddenError);
		expect(agents.createOrAdopt).toHaveBeenCalledTimes(1);
	});

	it('does not adopt a pending draft without host attestation', async () => {
		const { service, agents } = setup();
		agents.findById.mockResolvedValue(draft);
		expect(
			await service.persistDraft(user, 'project-1', {
				id: 'agent-1',
				name: 'Draft',
				adoptOnCollision: false,
			}),
		).toBeNull();
		expect(agents.createOrAdopt).not.toHaveBeenCalled();
	});

	it('still permits an authorized draft deletion when Agents are disabled', async () => {
		const { service, settings, agents } = setup();
		settings.assertEnabled.mockRejectedValue(new NotFoundError('Agents are disabled'));
		await expect(service.createDraft(user, 'project-1', 'Draft name')).rejects.toThrow(
			'Agents are disabled',
		);
		await service.deleteDraft(user, 'project-1', 'agent-1');
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:delete'], false, {
			projectId: 'project-1',
		});
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.deleteDraft(user, 'project-1', 'agent-1')).rejects.toThrow(ForbiddenError);
		expect(agents.delete).toHaveBeenCalledExactlyOnceWith('agent-1', 'project-1');
		expect(agents.createOrAdopt).not.toHaveBeenCalled();
	});
});
