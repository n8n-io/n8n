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
import type { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

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
export const WorkflowExecutionStateStoreKey: InjectionKey<
	ShallowRef<ReturnType<typeof useWorkflowExecutionStateStore> | null>
> = Symbol('WorkflowExecutionStateStore');
export const CanvasRenderDataKey: InjectionKey<Ref<CanvasRenderData>> = Symbol('CanvasRenderData');
export const ChatHubToolContextKey: InjectionKey<boolean> = Symbol('ChatHubToolContext');
export const AiBuilderScrollToBottomKey: InjectionKey<() => void> = Symbol('ChatScrollToBottom');
/**
 * Editor capabilities a host can toggle per editor. Grows over time and is not
 * limited to AI features; `editing` toggles canvas read-only.
 */
export type EditorFeature = 'aiAssistant' | 'aiBuilder' | 'askAi' | 'editing';
/**
 * Per-feature enable flags for the current editor (`false` = superseded/off). An
 * explicit `false` hides the feature (or, for `editing`, makes the canvas
 * read-only) on top of the editor's own gating; omitted (or `true`) features
 * fall back to the editor's own gating. A host can only restrict, never grant —
 * a `true` flag cannot enable a feature the instance has turned off. Provided by
 * editor hosts that supersede capabilities — e.g. the Instance AI preview.
 */
export type EditorEnabledFeatures = Partial<Record<EditorFeature, boolean>>;
export const EditorEnabledFeaturesKey: InjectionKey<Readonly<Ref<EditorEnabledFeatures>>> =
	Symbol('EditorEnabledFeatures');
