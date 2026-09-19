import type { AgentJsonConfig } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type {
	DecisionOutcome,
	DecisionService,
} from '../../../workflow-compiler/decision/decision-service';
import type { DecisionAnswer } from '../../../workflow-compiler/decision/schemas';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createBuildAgentTool } from '../build-agent.tool';

vi.mock('../agent-target-binding', async (importOriginal) => {
	const original = await importOriginal<typeof import('../agent-target-binding')>();
	return {
		...original,
		resolveAgentBuilderTarget: vi.fn(
			async (context: InstanceAiContext) => context.agentBuilderTarget,
		),
		saveAgentBuilderTarget: vi.fn(async () => undefined),
		getSessionAgentByRef: vi.fn(async () => undefined),
		readPendingAgentTarget: vi.fn(async () => undefined),
		rereadAgentBuilderTarget: vi.fn(async () => undefined),
	};
});

const scripted: DecisionService = {
	kind: 'scripted',
	async decide(request): Promise<DecisionOutcome> {
		const answers: Record<string, DecisionAnswer> = {};
		for (const [name, question] of Object.entries(request.questions)) {
			if (question.type !== 'choice') continue;
			const choice = Object.keys(question.criteria)[0];
			answers[name] = {
				type: 'choice',
				choice,
				probabilities: { [choice]: 0.95 },
				confidence: 0.95,
			};
		}
		return { ok: true, answers, model: 'scripted', latencyMs: 1, problems: [] };
	},
};

interface Harness {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	saved: Array<{
		agentId: string;
		config: AgentJsonConfig;
		tasks: unknown[];
		baseConfigHash: string | null;
	}>;
}

function harness(
	options: {
		existing?: AgentJsonConfig;
		preview?: InstanceAiBuilderDelegate['runAgentPreview'];
	} = {},
): Harness {
	const saved: Harness['saved'] = [];
	const delegate: InstanceAiBuilderDelegate = {
		createAgent: vi.fn(async (name: string) => ({ agentId: 'ag-new', projectId: 'proj-1', name })),
		streamBuild: vi.fn(async () => {
			throw new Error('streamBuild is not used by the compiler-backed tool');
		}),
		resumeBuild: vi.fn(async () => {
			throw new Error('resumeBuild is not used by the compiler-backed tool');
		}),
		findOpenSuspensions: vi.fn(async () => []),
		cancelOpenSuspension: vi.fn(async () => undefined),
		listAgents: vi.fn(async () => [
			{ agentId: 'ag-billing', name: 'Billing Agent', published: true, updatedAt: '' },
		]),
		listAgentCapabilities: vi.fn(async () => ({
			channels: [{ type: 'slack', label: 'Slack', icon: 'slack', credentialTypes: ['slackApi'] }],
			agentCapabilities: [],
			limitations: [],
		})),
		resolveAgentName: vi.fn(async () => options.existing?.name ?? 'Sales Helper'),
		readAgentArtifact: vi.fn(async () =>
			options.existing ? { config: options.existing, skills: {}, configHash: 'hash-1' } : null,
		),
		writeAgentArtifact: vi.fn(
			async (
				agentId: string,
				artifact: { config: AgentJsonConfig; tasks?: unknown[] },
				writeOptions: { baseConfigHash: string | null },
			) => {
				saved.push({
					agentId,
					config: artifact.config,
					tasks: artifact.tasks ?? [],
					baseConfigHash: writeOptions.baseConfigHash,
				});
				return { ok: true as const, configHash: 'hash-2', skillIds: [], taskIds: [] };
			},
		),
		listAttachableWorkflows: vi.fn(async () => [
			{ id: 'wf-refund', name: 'Issue refund', published: true },
		]),
		resolveDefaultModel: vi.fn(async () => ({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
		})),
		...(options.preview ? { runAgentPreview: options.preview } : {}),
	};

	const domainContext = mockDeep<InstanceAiContext>();
	Object.assign(domainContext, {
		builderDelegate: delegate,
		decisionService: scripted,
		projectId: 'proj-1',
		modelId: undefined,
		agentBuilderTarget: options.existing
			? { agentId: 'ag-1', projectId: 'proj-1', name: options.existing.name, ref: 'sales-helper' }
			: undefined,
		threadMemory: undefined,
		threadId: 'thread-1',
	});
	const context = mockDeep<OrchestrationContext>();
	Object.assign(context, {
		domainContext,
		tracing: undefined,
		abortSignal: undefined,
		userDecisions: undefined,
	});
	return { context, delegate, saved };
}

type Handler = (input: unknown, ctx: Record<string, unknown>) => Promise<Record<string, unknown>>;
function handlerOf(context: OrchestrationContext): Handler {
	const tool = createBuildAgentTool(context);
	if (!tool.handler) throw new Error('no handler');
	return tool.handler as Handler;
}

const REQUEST =
	'Create a Slack agent that answers questions about our pricing. It should upsert new leads in HubSpot. Never promise discounts.';

describe('build-agent tool', () => {
	beforeEach(() => vi.clearAllMocks());

	it('creates an agent: compiles, saves through the delegate, and returns scenarios', async () => {
		const { context, delegate, saved } = harness();
		const output = await handlerOf(context)(
			{ action: 'create', request: REQUEST, name: 'Sales Helper', agentRef: 'sales-helper' },
			{},
		);
		expect(vi.mocked(delegate.createAgent)).toHaveBeenCalledWith('Sales Helper', undefined);
		expect(output).toMatchObject({
			ok: true,
			status: 'compiled',
			configUpdated: true,
			agentId: 'ag-new',
			agentRef: 'sales-helper',
			agentName: 'Sales Helper',
		});
		expect(saved).toHaveLength(1);
		expect(saved[0].baseConfigHash).toBeNull();
		expect(saved[0].config.integrations?.map((integration) => integration.type)).toEqual(['slack']);
		expect(saved[0].config.tools?.map((tool) => tool.type)).toEqual(['node']);
		expect(saved[0].config.model).toBe('anthropic/claude-sonnet-4-5');
		expect(output.verification).toMatchObject({
			schema: 'pass',
			references: 'pass',
			previewScenarios: 'not_run',
		});
		expect(Array.isArray(output.scenarios)).toBe(true);
	});

	it('returns a clarification for an unsupported channel and never saves', async () => {
		const { context, saved } = harness();
		const output = await handlerOf(context)(
			{ action: 'create', request: 'Build a WhatsApp bot for order questions', name: 'Orders Bot' },
			{},
		);
		expect(output).toMatchObject({
			ok: false,
			status: 'needs_clarification',
			configUpdated: false,
		});
		expect(String(output.message)).toContain('whatsapp');
		expect(saved).toHaveLength(0);
	});

	it('reports missing workflow tools as required artifacts', async () => {
		const { context, saved } = harness();
		const output = await handlerOf(context)(
			{
				action: 'create',
				request: 'Create an agent for orders that uses the Restock inventory workflow.',
				name: 'Orders',
			},
			{},
		);
		expect(output).toMatchObject({ ok: false, status: 'needs_artifacts' });
		expect(output.requiredArtifacts).toEqual([
			expect.objectContaining({
				type: 'workflow',
				name: 'Restock inventory',
				relationship: 'agent-tool',
			}),
		]);
		expect(saved).toHaveLength(0);
	});

	it('edits the bound agent with a minimal patch fenced on the read config hash', async () => {
		const existing: AgentJsonConfig = {
			name: 'Sales Helper',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: '# Role\nYou help with pricing.',
			tools: [],
			integrations: [],
		};
		const { context, saved } = harness({ existing });
		const output = await handlerOf(context)(
			{
				action: 'edit',
				request: 'Make it remember previous conversations',
				agentRef: 'sales-helper',
			},
			{},
		);
		expect(output).toMatchObject({ ok: true, status: 'compiled', agentId: 'ag-1' });
		expect(saved[0].baseConfigHash).toBe('hash-1');
		expect(saved[0].config.memory).toMatchObject({
			enabled: true,
			observationalMemory: { enabled: true },
		});
		expect(saved[0].config.instructions).toBe(existing.instructions);
	});

	it('verifies compiled scenarios in Preview and reports coverage', async () => {
		const preview = vi.fn(async (_agentId: string, message: string) => ({
			status: 'completed' as const,
			response: `ok: ${message}`,
			toolCalls: /upsert|hubspot/i.test(message) ? ['upsert-contact'] : [],
			sessionId: 's1',
		}));
		const { context } = harness({ preview });
		const created = await handlerOf(context)(
			{ action: 'create', request: REQUEST, name: 'Sales Helper', agentRef: 'sales-helper' },
			{},
		);
		const verified = await handlerOf(context)(
			{ action: 'verify', agentRef: 'sales-helper', sessionId: created.sessionId },
			{},
		);
		expect(verified.status).toBe('verified');
		expect(preview).toHaveBeenCalled();
		const coverage = verified.scenarioCoverage as { total: number; covered: number; note: string };
		expect(coverage.total).toBeGreaterThan(0);
		expect(coverage.note).toMatch(/agent scenarios exercised/);
	});

	it('fails cleanly without a builder delegate', async () => {
		const context = mockDeep<OrchestrationContext>();
		Object.assign(context, { domainContext: undefined, abortSignal: undefined });
		const output = await handlerOf(context)({ action: 'create', request: 'x', name: 'y' }, {});
		expect(output).toMatchObject({ ok: false, status: 'failed' });
	});
});
