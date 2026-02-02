import type {
	CanvasInjectionData,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
} from '@/features/workflows/canvas/canvas.types';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import type { TelemetryContext } from '@/app/types/telemetry';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

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

/**
 * CRDT Expression Resolver context.
 * When provided, useResolvedExpression will use this to get pre-computed values
 * instead of resolving expressions on-demand.
 */
export interface CrdtExpressionResolver {
	/**
	 * Get resolved value for a parameter path.
	 * @param nodeId - The node ID
	 * @param paramPath - The parameter path (e.g., "parameters.value" or just "value")
	 * @returns Object with value, display string, and state (valid/pending/invalid), or null if not found
	 */
	getResolved(
		nodeId: string,
		paramPath: string,
	): {
		value: unknown;
		display: string;
		state: 'valid' | 'pending' | 'invalid';
		error?: string;
	} | null;
	/** Reactive version counter - increments when resolvedParams changes */
	version: Ref<number>;
}
export const CrdtExpressionResolverKey: InjectionKey<CrdtExpressionResolver> =
	Symbol('CrdtExpressionResolver');

/**
 * Current node ID for CRDT expression resolution context.
 */
export const CrdtNodeIdKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('CrdtNodeId');

/**
 * CRDT Autocomplete Resolver for expression editor code completion.
 * When provided, autocomplete will use this to resolve expressions via the coordinator.
 */
export interface CrdtAutocompleteResolver {
	/** Resolve an expression and return the value */
	resolve(expression: string, contextNodeName?: string): Promise<unknown>;
	/** The workflow ID for this resolver */
	workflowId: string;
}
export const CrdtAutocompleteResolverKey: InjectionKey<
	ComputedRef<CrdtAutocompleteResolver | undefined>
> = Symbol('CrdtAutocompleteResolver');
