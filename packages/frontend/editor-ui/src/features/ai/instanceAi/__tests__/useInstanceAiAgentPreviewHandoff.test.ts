import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const openThreadWithContextMock = vi.fn();
const trackMock = vi.fn();
let instanceAiAvailable = true;

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => instanceAiAvailable),
}));

vi.mock('../composables/useInstanceAiHandoff', () => ({
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
	useInstanceAiHandoff: () => ({ openThreadWithContext: openThreadWithContextMock }),
}));

describe('useInstanceAiAgentPreviewHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		instanceAiAvailable = true;
	});

	it('starts a new-tab instance AI thread with agent preview context', async () => {
		openThreadWithContextMock.mockResolvedValue(true);
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(openThreadWithContextMock).toHaveBeenCalledWith(
			'project-1',
			{
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'thread-1',
			},
			{
				source: 'agent_preview',
				origin: 'internal',
				sourceContext: { agentId: 'agent-1', previewThreadId: 'thread-1' },
			},
			{ newTab: true },
		);
		expect(trackMock).toHaveBeenCalledWith('Instance AI opened from agent preview', {
			agent_id: 'agent-1',
			preview_thread_id: 'thread-1',
		});
	});

	it('does not track telemetry when opening the instance AI thread fails', async () => {
		openThreadWithContextMock.mockResolvedValue(false);
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(openThreadWithContextMock).toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
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

		expect(openThreadWithContextMock).not.toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
	});
});
