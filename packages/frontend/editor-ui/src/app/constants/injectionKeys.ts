import type {
	CanvasInjectionData,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
} from '@/features/workflows/canvas/canvas.types';
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { TelemetryContext } from '@/app/types/telemetry';
import type { useExecutionDataStore } from '@/app/stores/executionData.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { CanvasRenderData } from '@/features/workflows/canvas/canvas.utils';

export const WorkflowIdKey = 'workflowId' as unknown as InjectionKey<ComputedRef<string>>;
export const CanvasKey = 'canvas' as unknown as InjectionKey<CanvasInjectionData>;
export const CanvasNodeKey = 'canvasNode' as unknown as InjectionKey<CanvasNodeInjectionData>;
export const CanvasNodeHandleKey =
	'canvasNodeHandle' as unknown as InjectionKey<CanvasNodeHandleInjectionData>;
export const PopOutWindowKey: InjectionKey<Ref<Window | undefined>> = Symbol('PopOutWindow');
export const ExpressionLocalResolveContextSymbol: InjectionKey<
	ComputedRef<ExpressionLocalResolveContext | undefined>
> = Symbol('ExpressionLocalResolveContext');
export const TelemetryContextSymbol: InjectionKey<TelemetryContext> = Symbol('TelemetryContext');
export const WorkflowDocumentStoreKey: InjectionKey<ShallowRef<WorkflowDocumentStore | null>> =
	Symbol('WorkflowDocumentStore');
export const ExecutionDataStoreKey: InjectionKey<
	ShallowRef<ReturnType<typeof useExecutionDataStore> | null>
> = Symbol('ExecutionDataStore');
// NOTE: there is intentionally no injection key for the workflow-execution-state
// store — it shares its identity with the workflow document store and is always
// derived from it via injectWorkflowExecutionStateStore(), so a subtree's
// document scope and execution scope can never diverge.
export const CanvasRenderDataKey: InjectionKey<Ref<CanvasRenderData>> = Symbol('CanvasRenderData');
export const ChatHubToolContextKey: InjectionKey<boolean> = Symbol('ChatHubToolContext');
export const AiBuilderScrollToBottomKey: InjectionKey<() => void> = Symbol('ChatScrollToBottom');
/**
 * AI editor capabilities a host can toggle per editor, using enablement
 * semantics (an explicit `false` supersedes; omitted or `true` falls back to
 * the editor's own gating). Grows over time. `instanceAi` gates the Instance AI
 * entry points (its store gate is global Instance AI availability); a host sets
 * it `false` to keep the legacy AI builder/assistant entry points for that
 * editor instead.
 */
export type EditorFeature = 'aiAssistant' | 'aiBuilder' | 'askAi' | 'instanceAi';
/**
 * Per-editor host overrides. The AI features use enablement semantics
 * (`false` = superseded/off; omitted or `true` falls back to the editor's own
 * gating, and a `true` can never grant a feature the instance disabled).
 * `readOnly` is a direct state flag — `true` forces the canvas read-only on top
 * of the editor's own gating. `executionSuccessToasts` / `executionErrorToasts`
 * are direct state flags too — both shown by default; an explicit `false`
 * suppresses that class of workflow execution result toast for this editor
 * (mirrors the old iframe `suppressNotifications` / `allowErrorNotifications`
 * knobs, but scoped per editor instead of via the shared UI store). Hosts that
 * surface results in their own UI — e.g. the Instance AI preview — set them.
 * `expandGroups` is a direct state flag — `true` shows every canvas group
 * expanded and leaves the editor's persisted view state untouched
 * Provided by editor hosts that supersede capabilities.
 */
export type EditorEnabledFeatures = Partial<Record<EditorFeature, boolean>> & {
	readOnly?: boolean;
	expandGroups?: boolean;
	executionSuccessToasts?: boolean;
	executionErrorToasts?: boolean;
};
export const EditorEnabledFeaturesKey: InjectionKey<Readonly<Ref<EditorEnabledFeatures>>> =
	Symbol('EditorEnabledFeatures');
