import type { Agent as RuntimeAgent } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	createAgentSkillRefsService,
	storedAgentConfig,
} from '../../__tests__/test-utils/stored-agent-config';
import { Agent } from '../../entities/agent.entity';
import { createAgentCredentialProvider } from '../../utils/agent-credential-provider';
import { AgentEvaluationService } from '../agent-evaluation.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('../../utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(),
}));

type Dependencies = ConstructorParameters<typeof AgentEvaluationService>;

const user = mock<User>({ id: 'user/123:raw' });
const baseConfig: AgentJsonConfig = {
	name: 'Support agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with support tickets.',
	tools: [
		{
			type: 'node',
			name: 'Slack Tool',
			node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
		},
	],
};

function setup(config: AgentJsonConfig | null = baseConfig) {
	const settings = mock<Dependencies[0]>();
	const executions = mock<Dependencies[1]>({ mode: 'regular' });
	const repository = mock<Dependencies[2]>();
	const skillRefs = createAgentSkillRefsService();
	const reconstruction = mock<Dependencies[4]>();
	const credentials = mock<Dependencies[5]>();
	const saved = Object.assign(new Agent(), {
		id: 'agent-1',
		projectId: 'proj-1',
		schema: config ? storedAgentConfig(structuredClone(config)) : null,
		tools: {},
		integrations: [],
	});
	settings.getEnabled.mockResolvedValue(true);
	repository.findByIdAndProjectId.mockResolvedValue(saved);
	vi.mocked(createAgentCredentialProvider).mockReturnValue(mock());
	return {
		service: new AgentEvaluationService(
			settings,
			executions,
			repository,
			skillRefs,
			reconstruction,
			credentials,
		),
		settings,
		executions,
		repository,
		skillRefs,
		reconstruction,
		credentials,
		saved,
	};
}

describe('AgentEvaluationService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('rejects queue mode before loading an Agent', async () => {
		const { service, executions, repository } = setup();
		executions.mode = 'queue';
		expect(await service.prepare(user, 'proj-1', 'agent-1')).toEqual({
			error: expect.stringContaining('queue mode is not supported'),
		});
		expect(repository.findByIdAndProjectId).not.toHaveBeenCalled();
	});

	it.each(['disabled', 'denied'])('checks access before reading a draft: %s', async (failure) => {
		const { service, settings, repository } = setup();
		if (failure === 'disabled') settings.getEnabled.mockResolvedValue(false);
		else vi.mocked(userHasScopes).mockResolvedValue(false);
		expect(await service.prepare(user, 'proj-1', 'agent-1')).toEqual({
			error: expect.stringContaining(
				failure === 'disabled' ? 'Agents are disabled' : 'not found or not accessible',
			),
		});
		expect(repository.findByIdAndProjectId).not.toHaveBeenCalled();
	});

	it.each(['missing', 'configless'])('reports an unavailable draft: %s', async (failure) => {
		const { service, repository } = setup(null);
		if (failure === 'missing') repository.findByIdAndProjectId.mockResolvedValue(null);
		expect(await service.prepare(user, 'proj-1', 'agent-1')).toEqual({
			error: expect.stringContaining(
				failure === 'missing' ? 'not found or not accessible' : 'has no JSON config',
			),
		});
	});

	it('prepares metadata without building a runtime and prunes only a detached configuration', async () => {
		const config = {
			...baseConfig,
			memory: { enabled: true },
			vectorStores: [{ provider: 'pinecone' }],
			mcpServers: [{ name: 'legacy', url: 'https://example.com/sse', transport: 'sse' }],
			subAgents: { agents: [{ agentId: 'child-1' }] },
		} as AgentJsonConfig;
		const { service, saved, reconstruction, credentials, repository } = setup(config);
		saved.integrations = [mock({ type: 'slack' })];
		const original = structuredClone(saved.schema);
		const { preparation } = await service.prepare(user, 'proj-1', 'agent-1');
		expect(preparation).toBeDefined();
		if (!preparation) throw new Error('Expected evaluation preparation');
		expect(reconstruction.reconstructFromAgentEntity).not.toHaveBeenCalled();
		expect(preparation.tools).toEqual([
			{ name: 'Slack_Tool', kind: 'node', nodeType: 'n8n-nodes-base.slackTool' },
		]);
		expect(preparation.skippedFeatures.map(({ feature }) => feature).sort()).toEqual([
			'integrations',
			'mcpServers (sse transport)',
			'memory',
			'vectorStores',
		]);
		preparation.config.instructions = 'Host metadata copy';
		const firstRuntime = mock<RuntimeAgent>();
		const secondRuntime = mock<RuntimeAgent>();
		reconstruction.reconstructFromAgentEntity
			.mockResolvedValueOnce({
				agent: firstRuntime,
				toolRegistry: new Map(),
				mcpServerAttributions: new Map(),
			})
			.mockResolvedValueOnce({
				agent: secondRuntime,
				toolRegistry: new Map(),
				mcpServerAttributions: new Map(),
			});
		expect(await preparation.buildRuntime({})).toBe(firstRuntime);
		expect(await preparation.buildRuntime({})).toBe(secondRuntime);
		expect(reconstruction.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		const [source, , runType, integrationType, runtimeUser, , mode, sandboxIdentity] =
			reconstruction.reconstructFromAgentEntity.mock.calls[0];
		expect(source.agent).not.toBe(saved);
		expect(source.agent.schema).toMatchObject({
			instructions: config.instructions,
			subAgents: config.subAgents,
		});
		expect(source.agent.schema?.memory).toBeUndefined();
		expect(source.agent.schema?.vectorStores).toBeUndefined();
		expect(source.agent.schema?.mcpServers).toBeUndefined();
		expect(source.agent.integrations).toEqual([]);
		expect({ runType, integrationType, runtimeUser, mode, sandboxIdentity }).toEqual({
			runType: 'test',
			integrationType: undefined,
			runtimeUser: user,
			mode: 'manual',
			sandboxIdentity: 'Gt4H3q6RzhJe9cTxQm6be0AdIZQlifuy3w9OPSykmYo',
		});
		expect(createAgentCredentialProvider).toHaveBeenCalledWith(
			credentials,
			'proj-1',
			user,
			'agent-1',
		);
		expect(saved.schema).toEqual(original);
		expect(saved.integrations).toHaveLength(1);
		expect(repository.save).not.toHaveBeenCalled();
	});

	it('retains draft skill refs and resolves their bodies when building the runtime', async () => {
		const refs = [
			{ type: 'skill' as const, id: 'zeta' },
			{ type: 'skill' as const, id: 'alpha' },
		];
		const { service, skillRefs, reconstruction } = setup({ ...baseConfig, skills: refs });
		const result = await service.prepare(user, 'proj-1', 'agent-1');
		if (!result.preparation) throw new Error('Expected evaluation preparation');
		expect(skillRefs.skillsForRefs).not.toHaveBeenCalled();
		const zeta = { name: 'Zeta', description: 'Zeta skill', instructions: 'Use zeta.' };
		const alpha = { name: 'Alpha', description: 'Alpha skill', instructions: 'Use alpha.' };
		skillRefs.bodies.zeta = zeta;
		skillRefs.bodies.alpha = alpha;
		reconstruction.reconstructFromAgentEntity.mockResolvedValue({
			agent: mock(),
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
		});
		await result.preparation.buildRuntime({});
		expect(reconstruction.reconstructFromAgentEntity.mock.calls[0][0]).toMatchObject({
			skillRefs: refs,
			skills: { zeta, alpha },
		});
	});

	it('passes host mock hooks to the uncached runtime and prunes delegated configurations', async () => {
		const { service, reconstruction } = setup();
		const result = await service.prepare(user, 'proj-1', 'agent-1');
		if (!result.preparation) throw new Error('Expected evaluation preparation');
		const hooks = {
			modelFetch: vi.fn(),
			mcpFetch: vi.fn(),
			webSearch: vi.fn(),
			configureToolAdditionalData: vi.fn(),
			onMcpToolCallSettled: vi.fn(),
		};
		reconstruction.reconstructFromAgentEntity.mockResolvedValue({
			agent: mock(),
			toolRegistry: new Map(),
			mcpServerAttributions: new Map(),
		});
		await result.preparation.buildRuntime(hooks);
		const instrumentation = reconstruction.reconstructFromAgentEntity.mock.calls[0][5];
		expect(instrumentation).toMatchObject(hooks);
		const childConfig = { ...baseConfig, memory: { enabled: true } } as AgentJsonConfig;
		const child = instrumentation?.transformDelegatedAgentConfig?.(childConfig, {
			subAgentId: 'child-1',
		});
		expect(child?.memory).toBeUndefined();
		expect(childConfig.memory).toEqual({ enabled: true });
		expect(result.preparation.skippedFeatures.map(({ feature }) => feature)).toContain(
			'subAgent child-1: memory',
		);
	});

	it.each(['queue', 'disabled', 'denied'])(
		'rechecks access before runtime construction: %s',
		async (failure) => {
			const { service, executions, settings, reconstruction } = setup();
			const result = await service.prepare(user, 'proj-1', 'agent-1');
			if (!result.preparation) throw new Error('Expected evaluation preparation');
			if (failure === 'queue') executions.mode = 'queue';
			if (failure === 'disabled') settings.getEnabled.mockResolvedValue(false);
			if (failure === 'denied') vi.mocked(userHasScopes).mockResolvedValue(false);
			await expect(result.preparation.buildRuntime({})).rejects.toThrow();
			expect(reconstruction.reconstructFromAgentEntity).not.toHaveBeenCalled();
		},
	);

	it.each(['access', 'skills', 'reconstruction'])(
		'cancels stalled %s setup without starting later work',
		async (stage) => {
			const { service, settings, skillRefs, reconstruction } = setup();
			const { preparation } = await service.prepare(user, 'proj-1', 'agent-1');
			if (!preparation) throw new Error('Expected evaluation preparation');
			const blocked = createDeferredPromise();
			const runtime = mock<RuntimeAgent>();
			if (stage === 'access') {
				settings.getEnabled.mockReturnValueOnce(blocked.promise.then(() => true));
			} else if (stage === 'skills') {
				skillRefs.skillsForRefs.mockReturnValueOnce(blocked.promise.then(() => ({})));
			} else {
				reconstruction.reconstructFromAgentEntity.mockReturnValueOnce(
					blocked.promise.then(() => ({
						agent: runtime,
						toolRegistry: new Map(),
						mcpServerAttributions: new Map(),
					})),
				);
			}
			const controller = new AbortController();
			const reason = new Error('setup cancelled');
			const building = preparation.buildRuntime({}, controller.signal);
			const rejected = expect(building).rejects.toBe(reason);
			await new Promise((resolve) => setImmediate(resolve));
			controller.abort(reason);
			await rejected;
			blocked.resolve();
			await new Promise((resolve) => setImmediate(resolve));

			if (stage === 'reconstruction') {
				expect(reconstruction.reconstructFromAgentEntity.mock.calls[0][8]).toEqual({
					abortSignal: controller.signal,
				});
				expect(runtime.close).toHaveBeenCalledTimes(1);
			} else {
				expect(reconstruction.reconstructFromAgentEntity).not.toHaveBeenCalled();
			}
			if (stage === 'access') expect(skillRefs.skillsForRefs).not.toHaveBeenCalled();
		},
		1_000,
	);
});
