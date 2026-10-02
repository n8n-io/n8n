import type {
	CanvasInjectionData,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
	GroupExpansionMode,
} from '@/features/workflows/canvas/canvas.types';
import type { ComputedRef, InjectionKey, MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import type { LogsPanelContext } from '@/features/execution/logs/logs.types';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { TelemetryContext } from '@/app/types/telemetry';
import type { useExecutionDataStore } from '@/app/stores/executionData.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { CanvasRenderData } from '@/features/workflows/canvas/canvas.utils';
import type { INodeUpdatePropertiesInformation } from '@/Interface';

export const WorkflowIdKey = 'workflowId' as unknown as InjectionKey<ComputedRef<string>>;
export const CanvasKey = 'canvas' as unknown as InjectionKey<CanvasInjectionData>;
export const CanvasNodeKey = 'canvasNode' as unknown as InjectionKey<CanvasNodeInjectionData>;
export const CanvasNodeHandleKey =
	'canvasNodeHandle' as unknown as InjectionKey<CanvasNodeHandleInjectionData>;
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
/** Keep setup hints compact while retaining their full text on the field. */
export const CompactParameterHintsKey: InjectionKey<boolean> = Symbol('CompactParameterHints');
/**
 * Opts resource-locator dropdowns into teleporting to `<body>`. Defaults to
 * `false` (stay in the local stacking context, e.g. inside the NDV dialog).
 * Hosts that render parameters inside a scroll container overlaid by sticky
 * elements (e.g. the Instance AI workflow setup card above the chat input)
 * provide `true` so the dropdown isn't painted underneath those overlays.
 */
export const ResourceLocatorDropdownTeleportedKey: InjectionKey<boolean> = Symbol(
	'ResourceLocatorDropdownTeleported',
);
export const ChatHubToolContextKey: InjectionKey<boolean> = Symbol('ChatHubToolContext');
/** Whether resource mappers may reconcile cached schemas without an explicit user action. */
export const ResourceMapperSchemaAutoRefreshKey: InjectionKey<boolean> = Symbol(
	'ResourceMapperSchemaAutoRefresh',
);
/** Whether an empty resource mapper may load once its dependencies first become available. */
export const ResourceMapperRefreshEmptySchemaKey: InjectionKey<boolean> = Symbol(
	'ResourceMapperRefreshEmptySchema',
);
/**
 * Optional callback for hosts that keep a local node draft (e.g. tool-config
 * modals). ParameterInput invokes this when CredentialsSelect picks a
 * credential, so the draft stays in sync with the document store write.
 */
export const ToolConfigCredentialSelectedKey: InjectionKey<
	(update: INodeUpdatePropertiesInformation) => void
> = Symbol('ToolConfigCredentialSelected');
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
 * `expandGroups` overrides canvas group expansion without touching the editor's
 * persisted view state.
 * `executionButtonType` selects the canvas execute button treatment —
 * `'secondary'` demotes it from the primary CTA (e.g. in the Instance AI
 * artifact, where the conversation is the primary surface).
 * Provided by editor hosts that supersede capabilities.
 */
export type EditorEnabledFeatures = Partial<Record<EditorFeature, boolean>> & {
	readOnly?: boolean;
	expandGroups?: GroupExpansionMode;
	executionSuccessToasts?: boolean;
	executionErrorToasts?: boolean;
	executionButtonType?: 'primary' | 'secondary';
	/** Show missing credentials as setup warnings in hosts with a setup panel. */
	credentialSetupWarnings?: boolean;
};
export const EditorEnabledFeaturesKey: InjectionKey<Readonly<Ref<EditorEnabledFeatures>>> =
	Symbol('EditorEnabledFeatures');

/**
 * Host-specific setup of the logs panel (INS-1192). The editor provides nothing:
 * `useLogsPanelLayout` falls back to the editor setup. A host that renders the
 * panel inside a pane, like the Instance AI artifact, provides its own.
 */
export interface LogsPanelHost {
	/** Host name in the `User toggled log view` telemetry event. */
	context: LogsPanelContext;
	/** localStorage key of the panel height. Each host keeps its own height. */
	heightStorageKey: string;
	/** Element the panel height is relative to. Defaults to the document body. */
	heightContainer?: MaybeRefOrGetter<HTMLElement | null | undefined>;
}
export const LogsPanelHostKey: InjectionKey<LogsPanelHost> = Symbol('LogsPanelHost');
