import type { AgentSseEvent } from '@n8n/api-types';
import { effectScope, ref } from 'vue';

import { useAssistantWorkflowDrafts } from '../useAssistantWorkflowDrafts';

const FILE = 'src/workflows/demo.workflow.ts';

function draftPayload(revision: number) {
	return {
		filePath: FILE,
		revision,
		workflow: {
			name: 'Demo',
			nodes: [
				{
					id: 'node-1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		},
	};
}

const transient = (name: string, payload: unknown): AgentSseEvent => ({
	type: 'transient-host-event',
	name,
	payload,
});

const buildResult = (output: unknown): AgentSseEvent => ({
	type: 'tool-result',
	toolCallId: 'call-1',
	toolName: 'workflow_builder_build_workflow',
	output,
});

function setup() {
	const liveRunId = ref<string | undefined>('turn-1');
	const scope = effectScope();
	const drafts = scope.run(() => useAssistantWorkflowDrafts({ liveRunId: () => liveRunId.value }))!;
	return { ...drafts, liveRunId };
}

describe('useAssistantWorkflowDrafts', () => {
	it('keeps a streamed draft for the live turn', () => {
		const { drafts, handleStreamEvent } = setup();

		handleStreamEvent(transient('workflow-draft', draftPayload(1)));

		expect(drafts.value[FILE]).toMatchObject({ filePath: FILE, revision: 1, runId: 'turn-1' });
	});

	it('ignores a draft that does not match the draft schema', () => {
		const { drafts, handleStreamEvent } = setup();

		handleStreamEvent(transient('workflow-draft', { filePath: FILE }));

		expect(drafts.value).toEqual({});
	});

	it('ignores other transient events', () => {
		const { drafts, handleStreamEvent } = setup();

		handleStreamEvent(transient('something-else', draftPayload(1)));

		expect(drafts.value).toEqual({});
	});

	it('sets the issues on the revision whose save they blocked', () => {
		const { drafts, handleStreamEvent } = setup();
		handleStreamEvent(transient('workflow-draft', draftPayload(2)));

		handleStreamEvent(
			transient('workflow-draft-issues', {
				filePath: FILE,
				revision: 2,
				issues: [{ code: 'MISSING', message: 'No credentials', nodeName: 'Start' }],
			}),
		);

		expect(drafts.value[FILE].issues).toEqual([
			{ code: 'MISSING', message: 'No credentials', nodeName: 'Start' },
		]);
	});

	it('marks the draft that a successful build saved, and dismisses it for that workflow', () => {
		const { drafts, handleStreamEvent, dismiss } = setup();
		handleStreamEvent(transient('workflow-draft', draftPayload(1)));

		handleStreamEvent(buildResult({ success: true, filePath: FILE, workflowId: 'wf-1' }));

		expect(drafts.value[FILE].savedWorkflowId).toBe('wf-1');
		dismiss('wf-1');
		expect(drafts.value).toEqual({});
	});

	it('keeps the draft when the build failed', () => {
		const { drafts, handleStreamEvent } = setup();
		handleStreamEvent(transient('workflow-draft', draftPayload(1)));

		handleStreamEvent(buildResult({ success: false, filePath: FILE }));

		expect(drafts.value[FILE].savedWorkflowId).toBeUndefined();
	});
});
