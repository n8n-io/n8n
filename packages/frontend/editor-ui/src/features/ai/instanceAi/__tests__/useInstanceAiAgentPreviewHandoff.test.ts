import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const openAgentArtifactThreadMock = vi.fn();
const trackMock = vi.fn();
const FIX_WITH_ASSISTANT_DRAFT = 'Investigate the tool errors in this agent run and fix the agent';
let instanceAiAvailable = true;

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => instanceAiAvailable),
}));

vi.mock('../composables/useInstanceAiHandoff', () => ({
	buildInstanceAiAgentPreviewHandoffContext: ({
		agentId,
		threadId,
		executionId,
	}: {
		agentId: string;
		threadId: string;
		executionId?: string;
	}) => ({
		source: 'agent-preview',
		agentId,
		threadId,
		...(executionId ? { executionId } : {}),
	}),
	useInstanceAiHandoff: () => ({ openAgentArtifactThread: openAgentArtifactThreadMock }),
}));

describe('useInstanceAiAgentPreviewHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		instanceAiAvailable = true;
	});

	it('opens the agent artifact in the same tab with preview context', async () => {
		openAgentArtifactThreadMock.mockResolvedValue(true);
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(openAgentArtifactThreadMock).toHaveBeenCalledWith(
			{
				type: 'agent',
				id: 'agent-1',
				projectId: 'project-1',
			},
			{
				source: 'agent_preview',
				origin: 'internal',
				sourceContext: { agentId: 'agent-1', previewThreadId: 'thread-1' },
			},
			{
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'thread-1',
				},
			},
		);
		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.INSTANCE_AI_OPENED_FROM_AGENT_PREVIEW,
			{
				agent_id: 'agent-1',
				preview_thread_id: 'thread-1',
			},
		);
	});

	it('passes executionId into preview handoff context and telemetry', async () => {
		openAgentArtifactThreadMock.mockResolvedValue(true);
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			executionId: 'exec-1',
			initialDraft: FIX_WITH_ASSISTANT_DRAFT,
		});

		expect(openAgentArtifactThreadMock).toHaveBeenCalledWith(
			{
				type: 'agent',
				id: 'agent-1',
				projectId: 'project-1',
			},
			{
				source: 'agent_preview',
				origin: 'internal',
				sourceContext: { agentId: 'agent-1', previewThreadId: 'thread-1' },
			},
			{
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'exec-1',
				},
				initialDraft: FIX_WITH_ASSISTANT_DRAFT,
			},
		);
		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.INSTANCE_AI_OPENED_FROM_AGENT_PREVIEW,
			{
				agent_id: 'agent-1',
				preview_thread_id: 'thread-1',
				preview_execution_id: 'exec-1',
			},
		);
	});

	it('does not track telemetry when opening the instance AI thread fails', async () => {
		openAgentArtifactThreadMock.mockResolvedValue(false);
		const { useInstanceAiAgentPreviewHandoff } = await import(
			'../composables/useInstanceAiAgentPreviewHandoff'
		);

		await useInstanceAiAgentPreviewHandoff().sendPreviewSessionToInstanceAi({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		expect(openAgentArtifactThreadMock).toHaveBeenCalled();
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

		expect(openAgentArtifactThreadMock).not.toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
	});
});
