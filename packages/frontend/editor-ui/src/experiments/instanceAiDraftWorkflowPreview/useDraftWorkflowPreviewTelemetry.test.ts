// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT,
} from '@/app/constants/experiments';

import { useDraftWorkflowPreviewTelemetry } from './useDraftWorkflowPreviewTelemetry';

const getVariant = vi.fn();
const track = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant })),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

function agentTree(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'root',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

const buildCall = (args: Record<string, unknown> = {}) => ({
	toolCallId: 'tc-build',
	toolName: 'workflow_builder_build_workflow',
	args,
	isLoading: true,
});

const scopes: EffectScope[] = [];

function setup() {
	const thread = reactive({
		id: 'thread-1',
		activeRunId: null as string | null,
		isSendingMessage: false,
		messages: [] as InstanceAiMessage[],
	});
	const scope = effectScope();
	scopes.push(scope);
	const telemetry = scope.run(() => useDraftWorkflowPreviewTelemetry(thread))!;

	async function startRun(tree: InstanceAiAgentNode = agentTree()) {
		thread.isSendingMessage = true;
		await nextTick();
		thread.activeRunId = 'run-1';
		thread.messages = [
			{ id: 'msg-1', runId: 'run-1', role: 'assistant', agentTree: tree } as InstanceAiMessage,
		];
		await nextTick();
	}
	async function updateTree(tree: InstanceAiAgentNode) {
		thread.messages = [
			{ id: 'msg-1', runId: 'run-1', role: 'assistant', agentTree: tree } as InstanceAiMessage,
		];
		await nextTick();
	}
	return { thread, scope, telemetry, startRun, updateTree };
}

function tracked(entry: { name: string }) {
	return track.mock.calls.filter(([event]) => event === entry);
}

describe('useDraftWorkflowPreviewTelemetry', () => {
	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
	});

	beforeEach(() => {
		track.mockReset();
		getVariant.mockReset().mockReturnValue('variant');
	});

	it('registers the experiment for enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.name);
	});

	it('reports exposure once, when the run starts building a workflow', async () => {
		const { startRun, updateTree } = setup();
		await startRun();
		expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED)).toHaveLength(0);

		await updateTree(agentTree({ toolCalls: [buildCall()] }));
		await updateTree(agentTree({ toolCalls: [buildCall(), { ...buildCall(), toolCallId: 'b' }] }));

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED, {
			thread_id: 'thread-1',
			run_id: 'run-1',
			variant: 'variant',
			'$feature/137_instance_ai_draft_workflow_preview': 'variant',
			is_new_workflow: true,
		});
		expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED)).toHaveLength(1);
	});

	it('reports an edit of a saved workflow as not new', async () => {
		const { startRun } = setup();

		await startRun(agentTree({ toolCalls: [buildCall({ workflowId: 'wf-1' })] }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED,
			expect.objectContaining({ is_new_workflow: false }),
		);
	});

	it('reports the control arm too', async () => {
		getVariant.mockReturnValue('control');
		const { startRun } = setup();

		await startRun(agentTree({ toolCalls: [buildCall()] }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED,
			expect.objectContaining({ variant: 'control' }),
		);
	});

	it('reports nothing for users outside the experiment', async () => {
		getVariant.mockReturnValue(undefined);
		const { startRun, telemetry } = setup();

		await startRun(agentTree({ toolCalls: [buildCall()] }));
		telemetry.trackCanvasRendered('draft');

		expect(track).not.toHaveBeenCalled();
	});

	it('reports the first render of each canvas kind once per run', async () => {
		const { startRun, telemetry } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));

		telemetry.trackCanvasRendered('draft');
		telemetry.trackCanvasRendered('draft');
		telemetry.trackCanvasRendered('saved');

		const renders = tracked(TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_CANVAS_FIRST_RENDERED);
		expect(renders.map(([, props]) => props.canvas_kind)).toEqual(['draft', 'saved']);
		expect(renders[0][1].ms_since_message).toEqual(expect.any(Number));
	});

	it('does not report a canvas render outside a building run', () => {
		const { telemetry } = setup();

		telemetry.trackCanvasRendered('saved');

		expect(track).not.toHaveBeenCalled();
	});

	it('reports a staging render that came before exposure once the run is exposed', async () => {
		vi.useFakeTimers();
		try {
			const { startRun, updateTree, telemetry } = setup();
			await startRun();
			vi.advanceTimersByTime(1000);
			telemetry.trackCanvasRendered('staging');
			expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_CANVAS_FIRST_RENDERED)).toHaveLength(0);

			vi.advanceTimersByTime(5000);
			await updateTree(agentTree({ toolCalls: [buildCall()] }));

			const [[, props]] = tracked(TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_CANVAS_FIRST_RENDERED);
			expect(props).toMatchObject({ canvas_kind: 'staging', is_new_workflow: true });
			expect(props.ms_since_message).toBeLessThan(2000);
		} finally {
			vi.useRealTimers();
		}
	});

	it('reports a stopped run during staging with the staging canvas', async () => {
		const { startRun, updateTree, telemetry } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));
		telemetry.trackCanvasRendered('staging');

		await updateTree(agentTree({ toolCalls: [buildCall()], status: 'cancelled' }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED,
			expect.objectContaining({ canvas_state: 'staging' }),
		);
	});

	it('reports a stopped run with the canvas the user saw', async () => {
		const { startRun, updateTree, telemetry } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));
		telemetry.trackCanvasRendered('draft');

		await updateTree(agentTree({ status: 'cancelled', toolCalls: [buildCall()] }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED,
			expect.objectContaining({ reason: 'stopped', canvas_state: 'draft' }),
		);
	});

	it('reports a run the user left while the agent was responding', async () => {
		const { startRun, scope } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));

		scope.stop();

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED,
			expect.objectContaining({ reason: 'left', canvas_state: 'none' }),
		);
	});

	it('reports a page close as leaving', async () => {
		const { startRun } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));

		window.dispatchEvent(new Event('pagehide'));

		expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED)).toHaveLength(1);
	});

	it('does not report leaving after the run finished', async () => {
		const { startRun, thread, scope } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));

		thread.activeRunId = null;
		await nextTick();
		scope.stop();

		expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED)).toHaveLength(0);
	});

	it('reports at most one abandon per run', async () => {
		const { startRun, updateTree, scope } = setup();
		await startRun(agentTree({ toolCalls: [buildCall()] }));

		await updateTree(agentTree({ status: 'cancelled', toolCalls: [buildCall()] }));
		scope.stop();

		expect(tracked(TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED)).toHaveLength(1);
	});

	it('does not report abandoning a run that never built a workflow', async () => {
		const { startRun, scope } = setup();
		await startRun();

		scope.stop();

		expect(track).not.toHaveBeenCalled();
	});
});
