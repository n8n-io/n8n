import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import { SystemAgentRegistry } from '../system-agent-registry';
import { SystemAgentUsageRelay } from '../system-agent-usage-relay';
import type {
	SystemAgentDelegatedRunUsageReport,
	SystemAgentDelegatedSideCallUsageReport,
	SystemAgentProvider,
} from '../system-agent.types';

const report: SystemAgentDelegatedRunUsageReport = {
	executionId: 'child-exec-1',
	threadId: 'child-thread-1',
	parentExecutionId: 'turn-1',
	status: 'completed',
	model: 'anthropic/claude-haiku-5-5',
	usage: { promptTokens: 1000, completionTokens: 100, totalTokens: 1100 },
};

const sideCallReport: SystemAgentDelegatedSideCallUsageReport = {
	task: 'title',
	model: 'anthropic/claude-haiku-5-5',
	usage: { promptTokens: 300, completionTokens: 20, totalTokens: 320 },
	cost: 0.0004,
	reportId: 'report-1',
	executionId: 'child-exec-1',
	threadId: 'child-thread-1',
	parentExecutionId: 'turn-1',
};

function setup(rootThread: Partial<AgentExecutionThread> | null = { agentId: 'assistant' }) {
	const logger = mock<Logger>();
	const registry = new SystemAgentRegistry();
	const executionRepository = mock<AgentExecutionRepository>();
	const thread = rootThread
		? ({ id: 'parent-thread-1', ...rootThread } as AgentExecutionThread)
		: null;
	executionRepository.findThreadOf.mockResolvedValue(thread);
	const onDelegatedRunUsage = vi.fn();
	const onDelegatedSideCallUsage = vi.fn();
	const provider = mock<SystemAgentProvider>({
		agentId: 'assistant',
		onDelegatedRunUsage,
		onDelegatedSideCallUsage,
	});
	registry.register(provider);
	const relay = new SystemAgentUsageRelay(logger, registry, executionRepository);
	return {
		relay,
		logger,
		onDelegatedRunUsage,
		onDelegatedSideCallUsage,
		executionRepository,
		thread,
	};
}

describe('SystemAgentUsageRelay', () => {
	it('gives the report to the provider of the parent thread, with that thread', async () => {
		const { relay, onDelegatedRunUsage, executionRepository, thread } = setup();

		await relay.relay(report);

		expect(executionRepository.findThreadOf).toHaveBeenCalledWith('turn-1');
		expect(onDelegatedRunUsage).toHaveBeenCalledWith(report, { thread });
	});

	it('does nothing when the parent thread belongs to a project agent', async () => {
		const { relay, onDelegatedRunUsage } = setup({ agentId: 'project-agent-1' });

		await relay.relay(report);

		expect(onDelegatedRunUsage).not.toHaveBeenCalled();
	});

	it('does nothing when the parent execution is gone', async () => {
		const { relay, onDelegatedRunUsage } = setup(null);

		await relay.relay(report);

		expect(onDelegatedRunUsage).not.toHaveBeenCalled();
	});

	it('logs a warning when the provider callback fails', async () => {
		const { relay, logger, onDelegatedRunUsage } = setup();
		onDelegatedRunUsage.mockRejectedValue(new Error('claim failed'));

		await expect(relay.relay(report)).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to report delegated run usage',
			expect.objectContaining({ executionId: 'child-exec-1', parentExecutionId: 'turn-1' }),
		);
	});

	describe('side calls', () => {
		it('gives the report to the provider of the parent thread, with that thread', async () => {
			const { relay, onDelegatedSideCallUsage, onDelegatedRunUsage, thread } = setup();

			await relay.relaySideCall(sideCallReport);

			expect(onDelegatedSideCallUsage).toHaveBeenCalledWith(sideCallReport, { thread });
			expect(onDelegatedRunUsage).not.toHaveBeenCalled();
		});

		it('does nothing when the parent thread belongs to a project agent', async () => {
			const { relay, onDelegatedSideCallUsage } = setup({ agentId: 'project-agent-1' });

			await relay.relaySideCall(sideCallReport);

			expect(onDelegatedSideCallUsage).not.toHaveBeenCalled();
		});

		it('logs a warning when the provider callback fails', async () => {
			const { relay, logger, onDelegatedSideCallUsage } = setup();
			onDelegatedSideCallUsage.mockRejectedValue(new Error('claim failed'));

			await expect(relay.relaySideCall(sideCallReport)).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to report delegated side-call usage',
				expect.objectContaining({ executionId: 'child-exec-1', parentExecutionId: 'turn-1' }),
			);
		});
	});
});
