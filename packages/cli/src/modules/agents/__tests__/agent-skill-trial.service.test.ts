import type { Agent, GenerateResult } from '@n8n/agents';
import type { RunSkillTrialDto } from '@n8n/api-types';
import type { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { SkillSourceService } from '@/modules/skills';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AgentSkillTrialService } from '../agent-skill-trial.service';
import type { AgentDefaultModelResolverService } from '../agent-default-model-resolver.service';
import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentsSettingsService } from '../agents-settings.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@/modules/skills', () => ({ SkillSourceService: vi.fn() }));
vi.mock('../agent-runtime-reconstruction.service', () => ({
	AgentRuntimeReconstructionService: vi.fn(),
}));
vi.mock('../budget-guardrail', () => ({ withBudgetGuardrail: (options: unknown) => options }));

const user = mock<User>({ id: 'user-1' });
const payload: RunSkillTrialDto = {
	catalogId: 'acme/skills/writing',
	contentHash: 'a'.repeat(64),
	message: 'Write a welcome email',
	model: 'openai/gpt-5-mini',
	credential: 'credential-1',
};

function resultFixture(result: Partial<GenerateResult>): GenerateResult {
	return { runId: 'run-1', messages: [], getState: vi.fn<GenerateResult['getState']>(), ...result };
}

function setup() {
	const sources = mock<SkillSourceService>();
	const settings = mock<AgentsSettingsService>();
	const defaults = mock<AgentDefaultModelResolverService>();
	const reconstruction = mock<AgentRuntimeReconstructionService>();
	const agent = mock<Agent>();
	const fetched = {
		skill: { name: 'writing', description: 'Write emails', instructions: 'Be concise.' },
		contentHash: payload.contentHash,
		revision: 'commit-1',
		check: { verdict: 'pass' as const, findings: [] },
		skippedFiles: [],
	};
	sources.readPublicSkill.mockResolvedValue(fetched);
	defaults.resolve.mockResolvedValue({ model: 'openai/gpt-5-mini', credential: 'credential-1' });
	reconstruction.reconstructFromResolvedSource.mockResolvedValue({
		agent,
		toolRegistry: { tools: new Map() } as never,
		mcpServerAttributions: new Map(),
	});
	agent.generate.mockResolvedValue(
		resultFixture({
			messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Welcome aboard.' }] }],
			toolCalls: [
				{
					tool: 'load_skill',
					canceled: false,
					input: { skillId: 'trial' },
					output: {
						success: true,
						skillId: 'trial',
						content: 'The skill instructions are active.',
					},
				},
			],
			usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
			finishReason: 'stop',
			model: 'openai/gpt-5-mini',
			error: undefined,
			guardrail: undefined,
		}),
	);
	vi.mocked(userHasScopes).mockResolvedValue(true);
	const service = new AgentSkillTrialService(
		sources,
		settings,
		defaults,
		mock<CredentialsService>(),
		reconstruction,
		mock<AiConfig>(),
	);
	return { service, sources, settings, defaults, reconstruction, agent, fetched };
}

describe('AgentSkillTrialService', () => {
	beforeEach(() => vi.clearAllMocks());

	it('prepares public GitHub content and an available model without creating resources', async () => {
		const { service, sources } = setup();
		await expect(service.prepare(user, 'project-1', payload.catalogId)).resolves.toMatchObject({
			skill: { name: 'writing' },
			defaultModel: { credential: 'credential-1' },
		});
		expect(sources.readPublicSkill).toHaveBeenCalledWith(
			user,
			'https://github.com/acme/skills',
			'writing',
		);
		expect(sources.connect).not.toHaveBeenCalled();
	});

	it('checks project access before reading content or resolving credentials', async () => {
		const { service, sources, defaults } = setup();
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.prepare(user, 'other-project', payload.catalogId)).rejects.toThrow(
			'cannot try skills',
		);
		expect(sources.readPublicSkill).not.toHaveBeenCalled();
		expect(defaults.resolve).not.toHaveBeenCalled();
	});

	it('runs an isolated inline agent with a bounded request and closes it', async () => {
		const { service, reconstruction, agent } = setup();
		await expect(
			service.run(user, 'project-1', payload, new AbortController().signal),
		).resolves.toMatchObject({
			response: 'Welcome aboard.',
			skillLoaded: true,
			totalTokens: 14,
		});
		expect(reconstruction.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				user,
				projectId: 'project-1',
				runtimeProfile: 'inline',
				runType: 'test',
				skills: { trial: expect.objectContaining({ name: 'writing' }) },
				config: expect.objectContaining({
					credential: payload.credential,
					skills: [{ type: 'skill', id: 'trial' }],
				}),
			}),
		);
		expect(agent.generate).toHaveBeenCalledWith(
			[{ role: 'user', content: [{ type: 'text', text: payload.message }] }],
			expect.objectContaining({ maxIterations: 6, maxOutputTokens: 2048 }),
		);
		expect(agent.close).toHaveBeenCalledOnce();
	});

	it('passes earlier user and assistant messages to the model for a follow-up', async () => {
		const { service, agent } = setup();
		await service.run(
			user,
			'project-1',
			{
				...payload,
				history: [
					{ role: 'user', content: 'Our product is named Pine.' },
					{ role: 'assistant', content: 'Pine helps you organize your work.' },
				],
				message: 'Make that shorter.',
			},
			new AbortController().signal,
		);
		expect(agent.generate).toHaveBeenCalledWith(
			[
				{ role: 'user', content: [{ type: 'text', text: 'Our product is named Pine.' }] },
				{
					role: 'assistant',
					content: [{ type: 'text', text: 'Pine helps you organize your work.' }],
				},
				{ role: 'user', content: [{ type: 'text', text: 'Make that shorter.' }] },
			],
			expect.anything(),
		);
	});

	it('does not mark a failed skill load as successful', async () => {
		const { service, agent } = setup();
		agent.generate.mockResolvedValueOnce(
			resultFixture({
				messages: [
					{ role: 'assistant', content: [{ type: 'text', text: 'Could not load the skill.' }] },
				],
				toolCalls: [
					{
						tool: 'load_skill',
						input: { skillId: 'trial' },
						output: { success: false },
						canceled: false,
					},
				],
				error: undefined,
				guardrail: undefined,
				model: payload.model,
			}),
		);
		await expect(
			service.run(user, 'project-1', payload, new AbortController().signal),
		).resolves.toMatchObject({ skillLoaded: false });
	});

	it('requires a new review when GitHub content changes', async () => {
		const { service, reconstruction } = setup();
		await expect(
			service.run(
				user,
				'project-1',
				{ ...payload, contentHash: 'b'.repeat(64) },
				new AbortController().signal,
			),
		).rejects.toThrow('changed on GitHub');
		expect(reconstruction.reconstructFromResolvedSource).not.toHaveBeenCalled();
	});

	it('closes the runtime after a model error and allows a later retry', async () => {
		const { service, agent } = setup();
		agent.generate.mockRejectedValueOnce(new Error('Provider unavailable'));
		await expect(
			service.run(user, 'project-1', payload, new AbortController().signal),
		).rejects.toThrow('Provider unavailable');
		expect(agent.close).toHaveBeenCalledOnce();
		await expect(
			service.run(user, 'project-1', payload, new AbortController().signal),
		).resolves.toHaveProperty('response');
	});

	it('refuses overlapping trials for the same user', async () => {
		const { service, agent } = setup();
		let finish!: (result: GenerateResult) => void;
		agent.generate.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const first = service.run(user, 'project-1', payload, new AbortController().signal);
		await vi.waitFor(() => expect(agent.generate).toHaveBeenCalledOnce());
		await expect(
			service.run(user, 'project-1', payload, new AbortController().signal),
		).rejects.toThrow('still running');
		finish(
			resultFixture({
				toolCalls: [],
				model: 'openai/gpt-5-mini',
				messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Done' }] }],
				error: undefined,
				guardrail: undefined,
			}),
		);
		await first;
	});

	it('stops before model setup when the caller disconnects', async () => {
		const { service, reconstruction } = setup();
		const controller = new AbortController();
		controller.abort();
		await expect(service.run(user, 'project-1', payload, controller.signal)).rejects.toThrow();
		expect(reconstruction.reconstructFromResolvedSource).not.toHaveBeenCalled();
	});
});
