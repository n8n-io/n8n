// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import {
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
	type InstanceAiAgentNode,
	type InstanceAiMessage,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useEventListener } from '@vueuse/core';
import { computed, onScopeDispose, watch } from 'vue';

import { INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

type Variant =
	| typeof INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control
	| typeof INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant;
type CanvasKind = 'staging' | 'draft' | 'saved';

/** The part of a thread runtime this telemetry reads. */
export interface DraftWorkflowPreviewTelemetryThread {
	id: string;
	activeRunId: string | null;
	isSendingMessage: boolean;
	messages: InstanceAiMessage[];
}

interface TrackedRun {
	runId: string;
	startedAt: number;
	exposed: boolean;
	rendered: Set<CanvasKind>;
	/** Renders before exposure, with their time since the message. Sent at exposure. */
	pendingRenders: Map<CanvasKind, number>;
	abandoned: boolean;
}

function isVariant(value: unknown): value is Variant {
	return (
		value === INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control ||
		value === INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant
	);
}

const SOURCE_WRITE_TOOLS = new Set(['workspace_write_file', 'workspace_str_replace_file']);

function isWorkflowSourceWrite(toolName: string, args: Record<string, unknown>): boolean {
	return (
		SOURCE_WRITE_TOOLS.has(toolName) &&
		typeof args.path === 'string' &&
		/\.workflow\.(ts|json)$/.test(args.path)
	);
}

/**
 * The run's first workflow build step, the same signal in both arms. A new
 * workflow is a build without a saved target, or a source file written whole.
 */
export function findWorkflowBuildStart(
	node: InstanceAiAgentNode,
): { isNewWorkflow: boolean } | undefined {
	if (
		node.targetResource?.type === 'workflow' &&
		(node.kind === 'builder' || node.role === 'workflow-builder')
	) {
		return { isNewWorkflow: typeof node.targetResource.id !== 'string' };
	}
	for (const call of node.toolCalls) {
		if (resolveBuilderToolName(call.toolName) === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW) {
			return { isNewWorkflow: typeof call.args.workflowId !== 'string' };
		}
		if (isWorkflowSourceWrite(call.toolName, call.args)) {
			return { isNewWorkflow: call.toolName === 'workspace_write_file' };
		}
	}
	for (const child of node.children) {
		const start = findWorkflowBuildStart(child);
		if (start) return start;
	}
	return undefined;
}

function canvasState(run: TrackedRun): 'none' | CanvasKind {
	if (run.rendered.has('saved')) return 'saved';
	if (run.rendered.has('draft')) return 'draft';
	return run.rendered.has('staging') ? 'staging' : 'none';
}

/**
 * Exposure, first canvas render and abandon events for the draft workflow
 * preview experiment. Both arms report, so the arms share a denominator.
 */
export function useDraftWorkflowPreviewTelemetry(thread: DraftWorkflowPreviewTelemetryThread) {
	const telemetry = useTelemetry();
	const posthog = usePostHog();
	const variant = computed(() => {
		const value = posthog.getVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.name);
		return isVariant(value) ? value : null;
	});

	let run: TrackedRun | undefined;
	let sentAt: number | undefined;
	let isNewWorkflow = false;

	function baseProps(current: TrackedRun, assigned: Variant) {
		return {
			thread_id: thread.id,
			run_id: current.runId,
			variant: assigned,
			'$feature/137_instance_ai_draft_workflow_preview': assigned,
		};
	}

	const runTree = computed(() => {
		const runId = thread.activeRunId ?? run?.runId;
		return thread.messages.find((m) => m.runId === runId || m.runIds?.includes(runId ?? ''))
			?.agentTree;
	});

	function checkExposure() {
		const tree = runTree.value;
		if (!run || run.exposed || !variant.value || !tree) return;
		const start = findWorkflowBuildStart(tree);
		if (!start) return;
		run.exposed = true;
		isNewWorkflow = start.isNewWorkflow;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.DRAFT_WORKFLOW_PREVIEW_EXPOSED, {
			...baseProps(run, variant.value),
			is_new_workflow: isNewWorkflow,
		});
		for (const [kind, msSinceMessage] of run.pendingRenders) {
			sendCanvasRendered(run, variant.value, kind, msSinceMessage);
		}
		run.pendingRenders.clear();
	}

	function sendCanvasRendered(
		current: TrackedRun,
		assigned: Variant,
		kind: CanvasKind,
		msSinceMessage: number,
	) {
		current.rendered.add(kind);
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_CANVAS_FIRST_RENDERED, {
			...baseProps(current, assigned),
			canvas_kind: kind,
			ms_since_message: msSinceMessage,
			is_new_workflow: isNewWorkflow,
		});
	}

	function trackAbandon(reason: 'stopped' | 'left') {
		if (!run?.exposed || run.abandoned || !variant.value) return;
		run.abandoned = true;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.RUN_ABANDONED, {
			...baseProps(run, variant.value),
			reason,
			ms_since_message: Date.now() - run.startedAt,
			canvas_state: canvasState(run),
		});
	}

	function trackCanvasRendered(kind: CanvasKind) {
		checkExposure();
		if (!run || run.rendered.has(kind) || !variant.value) return;
		const msSinceMessage = Date.now() - run.startedAt;
		// The staging canvas opens before the first build step, so it waits for exposure.
		if (!run.exposed) {
			if (kind === 'staging' && !run.pendingRenders.has(kind)) {
				run.pendingRenders.set(kind, msSinceMessage);
			}
			return;
		}
		sendCanvasRendered(run, variant.value, kind, msSinceMessage);
	}

	function leaveIfRunning() {
		if (run && thread.activeRunId === run.runId) trackAbandon('left');
	}

	watch(
		() => thread.isSendingMessage,
		(sending) => {
			if (sending) sentAt = Date.now();
		},
	);
	watch(
		() => thread.activeRunId,
		(runId) => {
			if (!runId || runId === run?.runId) return;
			run = {
				runId,
				startedAt: sentAt ?? Date.now(),
				exposed: false,
				rendered: new Set(),
				pendingRenders: new Map(),
				abandoned: false,
			};
			sentAt = undefined;
		},
	);
	watch(runTree, (tree) => {
		checkExposure();
		if (tree?.status === 'cancelled') trackAbandon('stopped');
	});
	useEventListener(window, 'pagehide', leaveIfRunning);
	onScopeDispose(leaveIfRunning);

	return { trackCanvasRendered };
}
