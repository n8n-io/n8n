import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiRunDebugStep } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiLlmStepsModal from '../InstanceAiLlmStepsModal.vue';
import { useInstanceAiDebugStore } from '../../instanceAiDebug.store';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const slotStub = defineComponent({
		setup:
			(_, { slots }) =>
			() =>
				h('div', slots.default?.()),
	});
	return {
		...(await importOriginal()),
		N8nDialog: slotStub,
		N8nDialogHeader: slotStub,
		N8nDialogTitle: slotStub,
	};
});

vi.mock('../../instanceAi.store', () => ({
	useThread: () => ({ activeRunId: null }),
}));

function step(
	stepNumber: number,
	cacheReadTokens: number,
	cacheWriteTokens: number,
	toolNames: string[],
): InstanceAiRunDebugStep {
	return {
		stepNumber,
		input: { stepTools: toolNames.map((name) => ({ type: 'function', name })) },
		output: {
			finishReason: 'tool-calls',
			usage: {
				inputTokens: cacheReadTokens + cacheWriteTokens + 2,
				inputTokenDetails: { noCacheTokens: 2, cacheReadTokens, cacheWriteTokens },
				outputTokens: 100,
				totalTokens: cacheReadTokens + cacheWriteTokens + 102,
			},
			response: { timestamp: '2026-09-24T22:56:12.824Z' },
		},
	};
}

const renderModal = createComponentRenderer(InstanceAiLlmStepsModal, {
	global: {
		stubs: {
			InstanceAiLlmStepDetail: defineComponent({
				setup: (_, { expose }) => {
					expose({ scrollToOutput: vi.fn() });
					return () => h('div');
				},
			}),
			InstanceAiRunWorkflowCodeSection: true,
		},
	},
});

describe('InstanceAiLlmStepsModal', () => {
	it('marks the step that lost the prompt cache', () => {
		setActivePinia(createTestingPinia());
		const debugStore = mockedStore(useInstanceAiDebugStore);
		debugStore.threadDebugRuns = [
			{ runId: 'run-1', threadId: 'thread-1', startedAt: 0, stepCount: 3, workflowCodeCount: 0 },
		];
		debugStore.selectedRunId = 'run-1';
		debugStore.runDebug = {
			runId: 'run-1',
			threadId: 'thread-1',
			startedAt: 0,
			steps: [
				step(0, 0, 63686, ['search']),
				step(1, 63686, 3814, ['search']),
				step(2, 0, 95361, ['search', 'fetch']),
			],
			workflowCode: [],
		};

		const { getAllByTestId, container } = renderModal({ props: { open: true } });

		expect(container.innerHTML).toContain('instance-ai-llm-steps-modal-run');
		const badges = getAllByTestId('instance-ai-llm-step-cache-break');
		expect(badges).toHaveLength(1);
		expect(badges[0].getAttribute('title')).toMatch(/67[.,\s\u202f]?500/);
		expect(badges[0].textContent).toContain('67.5k');
	});

	it('shows sub-agent steps for the step whose tool call started the sub-agent', async () => {
		setActivePinia(createTestingPinia());
		const debugStore = mockedStore(useInstanceAiDebugStore);
		debugStore.threadDebugRuns = [
			{ runId: 'run-1', threadId: 'thread-1', startedAt: 0, stepCount: 2, workflowCodeCount: 0 },
		];
		debugStore.selectedRunId = 'run-1';
		const spawningStep = step(1, 0, 100, ['build-agent']);
		spawningStep.output = {
			...spawningStep.output,
			toolCalls: [{ toolName: 'build-agent', toolCallId: 'tc-builder', input: {} }],
		};
		debugStore.runDebug = {
			runId: 'run-1',
			threadId: 'thread-1',
			startedAt: 0,
			steps: [step(0, 0, 100, ['load_skill']), spawningStep],
			subAgents: [
				{
					id: 'sub-agent-1',
					role: 'agent-builder',
					label: 'Support Triage',
					parentToolCallId: 'tc-builder',
					afterStepNumber: 1,
					startedAt: 0,
					steps: [step(0, 0, 50, ['agent-context']), step(1, 50, 10, ['write_config'])],
				},
			],
			workflowCode: [],
		};

		const { queryByTestId, getAllByTestId, getByText, rerender } = renderModal({
			props: { open: false },
		});
		await rerender({ open: true });

		// The first step did not start a sub-agent, so the third column stays hidden.
		expect(queryByTestId('instance-ai-llm-steps-modal-sub-agents')).not.toBeInTheDocument();
		expect(getAllByTestId('instance-ai-llm-step-sub-agent-badge')).toHaveLength(1);

		await userEvent.click(getByText('build-agent'));

		expect(queryByTestId('instance-ai-llm-steps-modal-sub-agents')).toBeInTheDocument();
		expect(getByText('agent-builder · Support Triage')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-llm-steps-modal-sub-agent-step')).toHaveLength(2);
	});
});
