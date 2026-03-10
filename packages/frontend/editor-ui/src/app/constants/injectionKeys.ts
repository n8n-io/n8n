import type {
	CanvasInjectionData,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
} from '@/features/workflows/canvas/canvas.types';
import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { TelemetryContext } from '@/app/types/telemetry';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

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
export const WorkflowStateKey: InjectionKey<WorkflowState> = Symbol('WorkflowState');
export const WorkflowDocumentStoreKey: InjectionKey<
	ShallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>
> = Symbol('WorkflowDocumentStore');
export const ChatHubToolContextKey: InjectionKey<boolean> = Symbol('ChatHubToolContext');
