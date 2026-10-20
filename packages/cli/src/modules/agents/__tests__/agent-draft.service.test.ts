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
	runnableState.addRunnableState.mockImplementation(
		async (agent) => ({ ...agent, isRunnable: true }) as never,
	);
	const service = new AgentDraftService(settings, agents, defaultModel, runnableState);
	return { service, settings, agents, defaultModel, runnableState };
}

const user = mock<User>({ id: 'user-1' });
const draft = mock<ProjectAgent>({ id: 'agent-1', projectId: 'project-1', name: 'Persisted name' });

describe('AgentDraftService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('requires create and update scopes before it adopts a draft', async () => {
		const { service, agents } = setup();
		agents.createOrAdopt.mockResolvedValue({ agent: draft, adopted: true });
		expect(
			await service.createDraft(user, 'project-1', 'Draft name', {
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
		await expect(service.createDraft(user, 'project-1', 'Draft name')).rejects.toThrow(
			ForbiddenError,
		);
		expect(agents.createOrAdopt).toHaveBeenCalledTimes(1);
	});

	it('seeds a new pending draft with the default model and returns runnable state', async () => {
		const { service, agents, defaultModel } = setup();
		agents.create.mockResolvedValue(draft);
		defaultModel.resolve.mockResolvedValue({
			model: 'anthropic/model',
			credential: 'credential-1',
		});
		const result = await service.persistDraft(user, 'project-1', {
			id: 'agent-1',
			name: 'Draft name',
			adoptOnCollision: false,
		});
		expect(result).toMatchObject({ id: 'agent-1' });
		expect(await result?.getState()).toMatchObject({
			id: 'agent-1',
			projectId: 'project-1',
			isRunnable: true,
		});
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
		const { service, agents, defaultModel } = setup();
		agents.findById.mockResolvedValueOnce(draft).mockResolvedValueOnce(null);
		agents.create.mockResolvedValue(draft);
		const options = { id: 'agent-1', name: 'Draft name', adoptOnCollision: true };
		expect(await service.persistDraft(user, 'project-1', options)).toMatchObject({
			name: 'Persisted name',
		});
		expect(defaultModel.resolve).not.toHaveBeenCalled();
		expect(await service.persistDraft(user, 'project-1', options)).toMatchObject({
			name: 'Persisted name',
		});
		expect(agents.create).toHaveBeenCalledWith(
			'project-1',
			'Draft name',
			expect.objectContaining({ adoptOnCollision: true }),
		);
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
		expect(agents.create).not.toHaveBeenCalled();
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
