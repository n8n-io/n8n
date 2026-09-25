import type * as AiImport from 'ai';

import type { ObservationalMemoryConfig } from '../../types';
import type { ExecutionOptions, RunOptions, SideCallUsageReport } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import type { ScopedMemoryTaskEvent } from '../memory/scoped-memory-task-runner';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const OBSERVER_MODEL = 'openai/gpt-4o';

const { mockGetModelCost } = vi.hoisted(() => ({
	mockGetModelCost: vi.fn<(...args: [string]) => Promise<unknown>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return { ...actual };
});

vi.mock('../../sdk/catalog', async (importOriginal) => ({
	...(await importOriginal<{}>()),
	getModelCost: mockGetModelCost,
}));

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function assistantMsg(text: string): AgentMessage {
	return { role: 'assistant', content: [{ type: 'text', text }] };
}

function runOptions(
	onSideCallUsage?: (report: SideCallUsageReport) => void,
): RunOptions & ExecutionOptions {
	return {
		persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		onSideCallUsage,
	};
}

function buildOrchestrator(observationalMemory: ObservationalMemoryConfig): {
	orchestrator: MemoryOrchestrator;
	events: ScopedMemoryTaskEvent[];
} {
	const events: ScopedMemoryTaskEvent[] = [];
	const config = {
		name: 'side-call-agent',
		memory: new InMemoryMemory(),
		observationalMemory,
		onMemoryTaskEvent: (event: ScopedMemoryTaskEvent) => events.push(event),
	} as unknown as AgentRuntimeConfig;
	const tracker = new BackgroundTaskTracker();
	const orchestrator = new MemoryOrchestrator(
		config,
		tracker,
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		async (text) => await Promise.resolve(text.length),
	);
	return { orchestrator, events };
}

describe('MemoryOrchestrator side-call cost forwarding', () => {
	beforeEach(() => {
		mockGetModelCost.mockReset();
	});

	it('forwards a priced observer usage report to onSideCallUsage', async () => {
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });
		const { orchestrator } = buildOrchestrator({
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: async () =>
				await Promise.resolve({
					text: '* CRITICAL (14:30) User set up mid-run observation.',
					usage: { promptTokens: 80, completionTokens: 20, totalTokens: 100 },
					model: OBSERVER_MODEL,
				}),
		});

		const reports: SideCallUsageReport[] = [];
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(
			list,
			runOptions((report) => reports.push(report)),
		);

		expect(reports).toHaveLength(1);
		const report = reports[0];
		expect(report.task).toBe('observer');
		expect(report.model).toBe(OBSERVER_MODEL);
		expect(report.usage.promptTokens).toBe(80);
		expect(report.usage.completionTokens).toBe(20);
		// 80 input at $5/M = $0.0004; 20 output at $15/M = $0.0003.
		expect(report.cost).toBeCloseTo(0.0007, 7);
		expect(report.reportId).toEqual(expect.any(String));
	});

	it('does not forward a report when the observer returns no usage', async () => {
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });
		const { orchestrator } = buildOrchestrator({
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: async () => await Promise.resolve('* CRITICAL (14:30) No usage reported.'),
		});

		const reports: SideCallUsageReport[] = [];
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(
			list,
			runOptions((report) => reports.push(report)),
		);
		expect(reports).toHaveLength(0);
	});

	it('does not forward a report when the model has no catalog pricing', async () => {
		mockGetModelCost.mockResolvedValue(undefined);
		const { orchestrator } = buildOrchestrator({
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: async () =>
				await Promise.resolve({
					text: '* CRITICAL (14:30) Unpriced observer call.',
					usage: { promptTokens: 80, completionTokens: 20, totalTokens: 100 },
					model: 'unknown/model',
				}),
		});

		const reports: SideCallUsageReport[] = [];
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(
			list,
			runOptions((report) => reports.push(report)),
		);
		expect(reports).toHaveLength(0);
	});

	it('does not break the run when onSideCallUsage throws', async () => {
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });
		const { orchestrator } = buildOrchestrator({
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: async () =>
				await Promise.resolve({
					text: '* CRITICAL (14:30) Observer call.',
					usage: { promptTokens: 80, completionTokens: 20, totalTokens: 100 },
					model: OBSERVER_MODEL,
				}),
		});

		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await expect(
			orchestrator.maybeObserveMidRun(
				list,
				runOptions(() => {
					throw new Error('host callback exploded');
				}),
			),
		).resolves.toBeUndefined();
	});
});
