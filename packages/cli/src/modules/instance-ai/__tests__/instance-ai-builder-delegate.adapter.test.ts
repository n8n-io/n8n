import type { CredentialProvider, MemoryTaskUsageReport, StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import type { BuilderDelegateSession, InstanceAiCredentialService } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import { AgentsPublicApi } from '@/modules/agents/public-api';

import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';
import { InstanceAiBuilderDelegateAdapterService } from '../instance-ai-builder-delegate.adapter';
import type { InstanceAiCreditService } from '../instance-ai-credit.service';

vi.mock('@/modules/agents/public-api', () => ({ AgentsPublicApi: class AgentsPublicApi {} }));

function setup(options: { useEvalModelCatalog?: boolean } = {}) {
	const agents = mock<AgentsPublicApi>();
	const context = mock<InstanceAiAgentContextAdapterService>();
	context.createReader.mockReturnValue({ lookup: vi.fn() });
	const credit = mock<InstanceAiCreditService>();
	const logger = mock<ConstructorParameters<typeof InstanceAiBuilderDelegateAdapterService>[3]>();
	const user = mock<User>({ id: 'user-1' });
	const provider = mock<CredentialProvider>();
	const providerFor = vi.fn(() => provider);
	const telemetry =
		mock<ConstructorParameters<typeof InstanceAiBuilderDelegateAdapterService>[4]>();
	const service = new InstanceAiBuilderDelegateAdapterService(
		agents,
		context,
		credit,
		logger,
		telemetry,
	);
	const delegate = service.createDelegate(
		user,
		'project-1',
		providerFor,
		mock<InstanceAiCredentialService>(),
		options,
	);
	return { agents, credit, logger, user, provider, providerFor, service, delegate, telemetry };
}

const session = {
	threadId: 'ia-builder:thread-1:agent-1',
	hostThreadId: 'thread-1',
	runId: 'run-1',
	modelConfig: 'anthropic/claude-sonnet-4-6',
	abortSignal: new AbortController().signal,
} satisfies BuilderDelegateSession;

async function* chunks(values: StreamChunk[] = []) {
	yield* values;
}

async function drain(stream: AsyncIterable<unknown>) {
	const received: unknown[] = [];
	for await (const chunk of stream) received.push(chunk);
	return received;
}

const report: MemoryTaskUsageReport = {
	task: 'observer',
	reportId: 'report-1',
	model: session.modelConfig,
	usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
};

describe('InstanceAiBuilderDelegateAdapterService', () => {
	it('forwards stream chunks and resolves text after the stream closes', async () => {
		const { agents, delegate, providerFor } = setup();
		const values: StreamChunk[] = [
			{ type: 'text-delta', id: 'text-1', delta: 'Hello' },
			{ type: 'text-delta', id: 'text-1', delta: ' there' },
		];
		agents.build.mockResolvedValue(chunks(values));
		const turn = await delegate.streamBuild('agent-1', 'Build', session);
		const received: unknown[] = [];
		for await (const chunk of turn.fullStream) received.push(chunk);
		expect(received).toEqual(values);
		expect(await turn.text).toBe('Hello there');
		expect(providerFor).toHaveBeenCalledWith('agent-1');
	});

	it('provides Assistant tools, model policy, and the opaque persistence thread', async () => {
		const { agents, delegate, telemetry } = setup({ useEvalModelCatalog: true });
		agents.build.mockResolvedValue(chunks());
		await delegate.streamBuild('agent-1', 'Build', session);
		const built = agents.build.mock.calls[0][0].session;
		expect(built).toMatchObject({
			threadId: session.threadId,
			reasoning: 'medium',
			promptCaching: { enabled: true, anthropic: { ttl: '5m' } },
			useEvalModelCatalog: true,
		});
		expect(built).not.toHaveProperty('hostThreadId');
		expect(built).not.toHaveProperty('runId');
		expect(built.hostTools.map((tool) => tool.name)).toEqual([
			'agent-context',
			'report_required_artifact',
		]);
		built.track?.(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
			question_count: 1,
			question_types: ['text'],
		});
		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
			agent_id: 'agent-1',
			user_id: 'user-1',
			thread_id: 'thread-1',
			run_id: 'run-1',
			question_count: 1,
			question_types: ['text'],
		});
	});

	it('preserves required artifacts reported during a builder turn', async () => {
		const { agents, delegate } = setup();
		agents.build.mockImplementation(async (request) => {
			const tool = request.session.hostTools.find(
				(tool) => tool.name === 'report_required_artifact',
			);
			await tool?.handler?.(
				{
					artifact: {
						type: 'workflow',
						name: 'Chat bridge',
						purpose: 'Receive and reply to messages',
						requirements: ['Forward the message to the Agent'],
						relationship: 'agent-entrypoint',
					},
				},
				{} as never,
			);
			return chunks();
		});
		const turn = await delegate.streamBuild('agent-1', 'Build', session);
		await drain(turn.fullStream);
		expect(await turn.requiredArtifacts).toEqual([
			expect.objectContaining({ name: 'Chat bridge', relationship: 'agent-entrypoint' }),
		]);
	});

	it('uses a new target-scoped provider and host callback for a resumed turn', async () => {
		const { agents, delegate, providerFor, credit } = setup();
		agents.build.mockResolvedValue(chunks());
		agents.resumeBuild.mockResolvedValue(chunks());
		await delegate.streamBuild('agent-1', 'Build', session);
		const resume = { runId: 'checkpoint-1', toolCallId: 'tool-1', resumeData: { approved: true } };
		await delegate.resumeBuild('agent-2', resume, { ...session, runId: 'run-2' });
		expect(providerFor.mock.calls).toEqual([['agent-1'], ['agent-2']]);
		expect(agents.resumeBuild.mock.calls[0][1]).toEqual(resume);
		await agents.resumeBuild.mock.calls[0][0].session.onMemoryUsage(report);
		expect(credit.claimRunUsage).toHaveBeenCalledWith(
			expect.anything(),
			'thread-1',
			'run-2:agent-builder:agent-2:memory:observer:report-1',
			expect.any(Array),
			'completed',
		);
	});

	it('claims late memory usage against the visible thread with stable report identities', async () => {
		const { agents, delegate, credit, user } = setup();
		agents.build.mockResolvedValue(chunks());
		const turn = await delegate.streamBuild('agent-1', 'Build', session);
		await drain(turn.fullStream);
		await agents.build.mock.calls[0][0].session.onMemoryUsage(report);
		expect(credit.claimRunUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'run-1:agent-builder:agent-1:memory:observer:report-1',
			expect.arrayContaining([expect.objectContaining({ type: 'llmTokens' })]),
			'completed',
		);
	});

	it('skips empty reports and warns without retrying failed claims', async () => {
		const { agents, delegate, credit, logger } = setup();
		agents.build.mockResolvedValue(chunks());
		await delegate.streamBuild('agent-1', 'Build', session);
		const onUsage = agents.build.mock.calls[0][0].session.onMemoryUsage;
		await onUsage({ ...report, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } });
		expect(credit.claimRunUsage).not.toHaveBeenCalled();
		credit.claimRunUsage.mockRejectedValue(new Error('Claim failed'));
		await expect(onUsage(report)).resolves.toBeUndefined();
		expect(credit.claimRunUsage).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('observational-memory usage'),
			expect.objectContaining({ agentId: 'agent-1', hostThreadId: 'thread-1', runId: 'run-1' }),
		);
	});

	it('cleans up builder sessions with the Assistant thread prefix', async () => {
		const { service, agents } = setup();
		await service.deleteBuilderSessions('thread-1');
		expect(agents.deleteBuilderSessions).toHaveBeenCalledWith('ia-builder:thread-1:');
	});
});
