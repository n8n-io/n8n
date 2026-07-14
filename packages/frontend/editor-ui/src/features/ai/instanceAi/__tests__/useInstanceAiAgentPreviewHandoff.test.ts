import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const startThreadMock = vi.fn();
const trackMock = vi.fn();
let instanceAiAvailable = true;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			key === 'agents.builder.preview.sendToAssistant.message'
				? 'Please review this preview session and improve the agent based on how it behaved.'
				: key,
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => instanceAiAvailable),
}));

vi.mock('../composables/useInstanceAiHandoff', () => ({
	buildInstanceAiAgentPreviewQuestion: () =>
		'Please review this preview session and improve the agent based on how it behaved.',
	buildInstanceAiAgentPreviewHandoffContext: ({
		agentId,
		threadId,
	}: {
		agentId: string;
		threadId: string;
	}) => ({
		source: 'agent-preview',
		agentId,
		threadId,
	}),
	useInstanceAiHandoff: () => ({ startThread: startThreadMock }),
}));

describe('useInstanceAiAgentPreviewHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		instanceAiAvailable = true;
	});

	it('starts a new-tab instance AI thread with agent preview context', async () => {
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(startThreadMock).toHaveBeenCalledWith(
			'project-1',
			'Please review this preview session and improve the agent based on how it behaved.',
			undefined,
			undefined,
			{
				newTab: true,
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'thread-1',
				},
			},
		);
		expect(trackMock).toHaveBeenCalledWith('Instance AI opened from agent preview', {
			agent_id: 'agent-1',
			preview_thread_id: 'thread-1',
		});
	});

	it('does nothing when instance AI is unavailable', async () => {
		instanceAiAvailable = false;
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(startThreadMock).not.toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
	});
});
