import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { AgentValidationService } from '../../agent-validation.service';
import type { AgentsSettingsService } from '../../agents-settings.service';
import type { AgentsService } from '../../agents.service';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import type { AgentsBuilderToolsService } from '../agents-builder-tools.service';
import { AgentsBuilderService } from '../agents-builder.service';
import type { BuilderCredentialService } from '../builder-session';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('../agents-builder-tools.service', () => ({
	AgentsBuilderToolsService: class AgentsBuilderToolsService {},
}));

const user = mock<User>({ id: 'user-1' });

function setup() {
	const agents = mock<AgentsService>();
	const tools = mock<AgentsBuilderToolsService>();
	const memory = mock<N8nMemory>();
	const threads = mock<AgentThreadRepository>();
	const settings = mock<AgentsSettingsService>();
	const validation = mock<AgentValidationService>();
	const skillRefs = mock<AgentSkillRefsService>();
	const provider = mock<CredentialProvider>();
	const providerFor = vi.fn(() => provider);
	const credentials = mock<BuilderCredentialService>();
	const service = new AgentsBuilderService(
		agents,
		tools,
		memory,
		threads,
		mock<CredentialsService>(),
		settings,
		validation,
		skillRefs,
		mock<OutboundHttp>(),
	);
	return {
		service,
		agents,
		tools,
		memory,
		threads,
		settings,
		validation,
		skillRefs,
		provider,
		providerFor,
		credentials,
	};
}

describe('AgentsBuilderService', () => {
	beforeEach(() => vi.mocked(userHasScopes).mockReset().mockResolvedValue(true));

	it.each([undefined, 'agent-pinned'])(
		'checks access before resolving target %s',
		async (pinned) => {
			const { service, tools, providerFor, credentials } = setup();
			const target = vi.fn(async () => 'agent-selected');
			service.getTools(user, 'project-1', target, providerFor, credentials);
			const [resolve] = tools.getToolsForResolvedTarget.mock.calls[0];

			await expect(resolve(pinned)).resolves.toBe(pinned ?? 'agent-selected');
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:update'], false, {
				projectId: 'project-1',
			});
			if (pinned) expect(target).not.toHaveBeenCalled();

			vi.mocked(userHasScopes).mockResolvedValue(false);
			await expect(resolve(pinned)).rejects.toThrow(ForbiddenError);
		},
	);

	it('reads credential defaults only with agent:read', async () => {
		const { service, tools } = setup();
		const defaults = { channelCredentialIds: ['cred-1'], managedCredentialAvailable: true };
		tools.getCredentialDefaults.mockResolvedValue(defaults);

		await expect(service.getCredentialDefaults(user, 'project-1', 'agent-1')).resolves.toBe(
			defaults,
		);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(tools.getCredentialDefaults).toHaveBeenCalledWith('agent-1', 'project-1');

		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.getCredentialDefaults(user, 'project-1', 'agent-1')).rejects.toThrow(
			ForbiddenError,
		);
	});

	it('rejects the next tool call when Agents are disabled', async () => {
		const { service, tools, settings, providerFor, credentials } = setup();
		const target = vi.fn(async () => 'agent-1');
		service.getTools(user, 'project-1', target, providerFor, credentials);
		const [resolve] = tools.getToolsForResolvedTarget.mock.calls[0];
		await expect(resolve()).resolves.toBe('agent-1');
		settings.assertEnabled.mockRejectedValue(new ForbiddenError('Agents are disabled.'));
		target.mockClear();

		await expect(resolve()).rejects.toThrow(ForbiddenError);
		expect(target).not.toHaveBeenCalled();
	});

	it('rejects a tool call when no Agent is selected', async () => {
		const { service, tools, providerFor, credentials } = setup();
		service.getTools(user, 'project-1', async () => undefined, providerFor, credentials);
		const [resolve] = tools.getToolsForResolvedTarget.mock.calls[0];

		await expect(resolve()).rejects.toThrow(UserError);
	});

	it('summarizes Publish validation and capability counts', async () => {
		const { service, agents, validation, skillRefs, provider, providerFor } = setup();
		const config = {
			name: 'Support Triage',
			tools: [{ type: 'workflow', workflow: 'wf-1' }],
		} as unknown as AgentJsonConfig;
		const agent = { id: 'agent-1', schema: config, integrations: [] } as unknown as ProjectAgent;
		const refs = [{ type: 'skill' as const, id: 'skill-1' }];
		agents.findById.mockResolvedValue(agent);
		skillRefs.refsForDraft.mockResolvedValue(refs);
		validation.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [
				{ code: 'missing_credential', path: 'tools.0', capability: { kind: 'tool' } },
				{ code: 'missing_required', path: 'instructions', capability: { kind: 'agent' } },
				{ code: 'missing_credential', path: 'tools.1', capability: { kind: 'tool' } },
			],
		});

		await expect(service.validateAgent(user, 'project-1', 'agent-1', providerFor)).resolves.toEqual(
			{
				valid: false,
				issueCodes: ['missing_credential', 'missing_required'],
				issueCount: 3,
				capabilityCount: 2,
			},
		);
		expect(validation.validateLoadedAgentConfiguration).toHaveBeenCalledWith(
			agent,
			'project-1',
			provider,
			'publish',
			{ skillRefs: refs },
		);
		expect(providerFor).toHaveBeenCalledWith('agent-1');
	});

	it('returns no validation summary for a missing Agent', async () => {
		const { service, agents, validation, providerFor } = setup();
		agents.findById.mockResolvedValue(null);

		await expect(
			service.validateAgent(user, 'project-1', 'agent-1', providerFor),
		).resolves.toBeUndefined();
		expect(validation.validateLoadedAgentConfiguration).not.toHaveBeenCalled();
		expect(providerFor).not.toHaveBeenCalled();
	});

	it('does not load an Agent for validation without read access', async () => {
		const { service, agents, providerFor } = setup();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(service.validateAgent(user, 'project-1', 'agent-1', providerFor)).rejects.toThrow(
			ForbiddenError,
		);
		expect(agents.findById).not.toHaveBeenCalled();
	});

	it.each(['', 'thread-1:', 'ia-builder:', 'ia-builder::', 'ia-builder:thread-1'])(
		'rejects an invalid builder session prefix: %j',
		async (prefix) => {
			const { service, memory, threads } = setup();
			threads.findBuilderSessionIds.mockResolvedValue([]);

			await expect(service.deleteBuilderSessions(prefix)).rejects.toThrow(UnexpectedError);

			expect(threads.findBuilderSessionIds).not.toHaveBeenCalled();
			expect(memory.getImplementation).not.toHaveBeenCalled();
		},
	);

	it('deletes legacy builder sessions while Agents are disabled', async () => {
		const { service, memory, threads, settings } = setup();
		settings.assertEnabled.mockRejectedValue(new ForbiddenError('Agents are disabled.'));
		threads.findBuilderSessionIds.mockResolvedValue([
			'ia-builder:thread-1:agent-a',
			'ia-builder:thread-1:agent-b',
		]);
		const first = mock<N8nMemoryImpl>();
		const second = mock<N8nMemoryImpl>();
		memory.getImplementation.mockReturnValueOnce(first).mockReturnValueOnce(second);

		await service.deleteBuilderSessions('ia-builder:thread-1:');

		expect(memory.getImplementation).toHaveBeenNthCalledWith(1, 'agent-a');
		expect(memory.getImplementation).toHaveBeenNthCalledWith(2, 'agent-b');
		expect(first.deleteThread).toHaveBeenCalledWith('ia-builder:thread-1:agent-a');
		expect(second.deleteThread).toHaveBeenCalledWith('ia-builder:thread-1:agent-b');
	});
});
