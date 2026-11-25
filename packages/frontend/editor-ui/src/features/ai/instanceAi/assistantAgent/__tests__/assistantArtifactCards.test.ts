import { AGENT_BUILDER_TOOL_NAMES, WORKFLOW_BUILDER_TOOL_NAMES } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, provide } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import type { ArtifactInfo } from '@/features/ai/instanceAi/agentTimeline.utils';
import {
	provideArtifactThread,
	type ArtifactThread,
} from '@/features/ai/instanceAi/artifactThread';
import type { ArtifactToolCall, ArtifactTurn } from '@/features/ai/instanceAi/artifactTurns';
import type { ResourceEntry } from '@/features/ai/instanceAi/useResourceRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AssistantArtifactCard from '../AssistantArtifactCard.vue';
import { ASSISTANT_ARTIFACT_CARDS, findAssistantArtifactCards } from '../assistantArtifactCards';

function build(toolCallId: string, workflowId: string, success = true): ArtifactToolCall {
	return {
		toolCallId,
		toolName: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
		args: {},
		result: { success, workflowId, workflowName: `Workflow ${workflowId}` },
		isLoading: false,
	};
}

function selectAgent(toolCallId: string, agentId: string): ArtifactToolCall {
	return {
		toolCallId,
		toolName: AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT,
		args: {},
		result: { ok: true, agentChange: 'created', agentId, agentName: 'Helper', projectId: 'p1' },
		isLoading: false,
	};
}

function patchConfig(toolCallId: string, agentId: string): ArtifactToolCall {
	return {
		toolCallId,
		toolName: AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG,
		args: {},
		result: { configMutated: true, agentId, agentName: 'Helper' },
		isLoading: false,
	};
}

function turn(id: string, toolCalls: ArtifactToolCall[], isLive = false): ArtifactTurn {
	return { id, role: 'assistant', isLive, toolCalls };
}

const panelSubject = { type: 'agent' as const, id: 'subject-agent', projectId: 'p1' };

describe('findAssistantArtifactCards', () => {
	it('shows no workflow card in the full view', () => {
		expect(findAssistantArtifactCards([turn('t1', [build('c1', 'w1')])], undefined).size).toBe(0);
	});

	it('shows a workflow card at the first successful build of each turn in the embedded panel', () => {
		const cards = findAssistantArtifactCards(
			[
				turn('t1', [
					build('c1', 'w1', false),
					build('c2', 'w1'),
					build('c3', 'w1'),
					build('c4', 'w2'),
				]),
				turn('t2', [build('c5', 'w1')]),
			],
			panelSubject,
		);

		expect([...cards.keys()]).toEqual(['c2', 'c4', 'c5']);
		expect(cards.get('c2')).toMatchObject({
			type: 'workflow',
			resourceId: 'w1',
			name: 'Workflow w1',
		});
	});

	it('shows an Agent card at the last change of a turn, after the turn ends', () => {
		const toolCalls = [selectAgent('c1', 'a1'), patchConfig('c2', 'a1')];

		expect(findAssistantArtifactCards([turn('t1', toolCalls, true)], undefined).size).toBe(0);

		const cards = findAssistantArtifactCards([turn('t1', toolCalls)], undefined);
		expect([...cards.keys()]).toEqual(['c2']);
		// The config change has no project, so the card keeps the project of the selection.
		expect(cards.get('c2')).toMatchObject({ type: 'agent', resourceId: 'a1', projectId: 'p1' });
	});

	it('shows no card for the subject of the embedded panel', () => {
		const cards = findAssistantArtifactCards(
			[turn('t1', [selectAgent('c1', 'subject-agent'), selectAgent('c2', 'a1')])],
			panelSubject,
		);

		expect([...cards.keys()]).toEqual(['c2']);
	});
});

describe('AssistantArtifactCard', () => {
	const toolCall: ToolCall = {
		tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
		toolCallId: 'c1',
		state: 'done',
		output: {},
	};
	const artifact: ArtifactInfo = { type: 'workflow', resourceId: 'w1', name: 'Built name' };

	function renderCard(entry: ResourceEntry | undefined) {
		const Host = defineComponent({
			setup() {
				provideArtifactThread({
					producedArtifacts: new Map(entry ? [[entry.id, entry]] : []),
				} as unknown as ArtifactThread);
				provide(
					ASSISTANT_ARTIFACT_CARDS,
					computed(() => new Map([['c1', artifact]])),
				);
				return () => h(AssistantArtifactCard, { toolCall });
			},
		});
		return createComponentRenderer(Host, { pinia: createTestingPinia() })();
	}

	it('shows the latest name and the archived badge from the thread registry', () => {
		const { getByTestId } = renderCard({
			type: 'workflow',
			id: 'w1',
			name: 'Renamed workflow',
			archived: true,
		});

		const card = getByTestId('instance-ai-artifact-card');
		expect(card).toHaveTextContent('Renamed workflow');
		expect(card).toHaveTextContent('Archived');
	});

	it('shows the built name and no badge when the registry has no entry', () => {
		const { getByTestId } = renderCard(undefined);

		const card = getByTestId('instance-ai-artifact-card');
		expect(card).toHaveTextContent('Built name');
		expect(card).not.toHaveTextContent('Archived');
	});
});
