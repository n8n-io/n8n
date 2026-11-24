import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import {
	toErrorWorkflowContext,
	type IExecutionContext,
	type IRunExecutionData,
	type Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { assertExecutionDataExists, type PreExecutionAdditionalData } from '@/utils/assertions';

import { ExecutionContextService } from './execution-context.service';

/**
 * Establishes the execution context for a workflow run.
 *
 * This function creates or inherits the execution context that persists throughout the workflow
 * execution lifecycle. The context is stored in `runExecutionData.executionData.runtimeData`.
 *
 * @param workflow - The workflow instance being executed (reserved for future context extraction)
 * @param runExecutionData - The execution data structure that will be mutated to include the execution context
 * @param additionalData - Additional workflow execution data used for validation and future context extraction
 * @param mode - The workflow execution mode (manual, trigger, webhook, error, etc.)
 *
 * @returns Promise that resolves when context has been established
 *
 * @throws {UnexpectedError} When `runExecutionData.executionData` is missing or invalid
 *
 * @remarks
 * ## Context Establishment Strategy
 *
 * The function follows a priority-based approach to establish execution context:
 *
 * ### 1. Preserve Existing Context (Webhook Resume)
 * If `executionData.runtimeData` already exists, the function returns immediately, keeping
 * that context. This preserves context when workflows resume from database (e.g., after
 * waiting for a webhook or manual continuation). An error run still passes its context
 * through {@link contextAllowedFor}, which the branches below cannot reach.
 *
 * ### 2. Inherit from Parent Execution (Sub-workflows)
 * If `runExecutionData.parentExecution` exists, creates a new context by inheriting all
 * fields from the parent context while generating fresh values for:
 * - `establishedAt`: Set to current timestamp
 * - `source`: Set to current execution mode
 * - `parentExecutionId`: Tracks the parent execution ID
 *
 * This applies to sub-workflows invoked via "Execute Workflow" node, and to error
 * workflows — `executeErrorWorkflow` populates `parentExecution` as well.
 *
 * ### 3. Inherit from Start Node Metadata
 * If `startItem.metadata.parentExecution.executionContext` exists, creates a new context
 * by inheriting from the parent context. Reached only when branch 2 did not apply.
 *
 * ### 4. Create Fresh Context (New Executions)
 * For new root executions, creates a fresh context with:
 * - `version`: 1
 * - `establishedAt`: Current timestamp
 * - `source`: Current execution mode
 *
 * ## Mutation Behavior
 * This function mutates `runExecutionData.executionData.runtimeData` with the execution context.
 *
 * ## Context Inheritance Pattern
 * When inheriting context, the strategy is:
 * 1. Spread the inheritable parent context fields (see {@link contextAllowedFor}:
 *    everything for a sub-workflow, non-identity fields only for an error workflow)
 * 2. Override `establishedAt` with current timestamp
 * 3. Override `source` with current execution mode
 * 4. Add `parentExecutionId` to track lineage
 *
 * This ensures child executions reflect their own timing and mode while preserving
 * contextual information like credentials and authentication state.
 *
 * ## Special Cases
 *
 * ### Chat Trigger Workflows
 * Workflows containing only Chat Trigger nodes have an empty `nodeExecutionStack`.
 * Basic context is still established with version and timestamp.
 *
 * ### Empty Execution Stack
 * If no start item exists and no parent context is available, establishes minimal
 * context (version, timestamp, source) without additional enrichment.
 *
 * ## Future Enhancements
 * The function is designed to support extracting context information from:
 * - Start node parameters (e.g., webhook authentication tokens)
 * - Start node type (trigger, manual, webhook, etc.)
 * - Input data from triggering events
 * - User identification from various sources
 *
 * ## Example Usage
 * ```typescript
 * // New execution
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');
 * // Context: { version: 1, establishedAt: 1234567890, source: 'manual' }
 *
 * // Sub-workflow execution (with parent context)
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'trigger');
 * // Context: { ...parentContext, establishedAt: 9876543210, source: 'trigger', parentExecutionId: 'parent-id' }
 *
 * // Resumed execution (webhook wait completed)
 * await establishExecutionContext(workflow, runExecutionData, additionalData, 'webhook');
 * // Context: <preserved from original execution>
 * ```
 *
 * @see IExecutionContextV1 for context structure definition
 * @see IRunExecutionData for execution data structure
 * @see IWorkflowExecuteAdditionalData for additional execution data
 * @see RelatedExecution for parent execution context propagation
 */
/**
 * Second gate on the identity carrier reaching an error workflow.
 *
 * `executeErrorWorkflow` already strips the carrier when it builds the error
 * payload. This refuses one even if a caller passes it, so the boundary does not
 * depend on every present and future call site getting it right. Every way a
 * context enters an error run passes through here: the two inheritance branches
 * below (`executeErrorWorkflow` populates both `parentExecution` and the start
 * item's metadata) and a context the run data already carries, which the early
 * return would otherwise hand on unfiltered.
 *
 * The remaining source, `additionalData.encryptedRunnerIdentity`, cannot be
 * filtered — it IS a carrier — so an error run must not read it at all.
 */
function contextAllowedFor(
	context: IExecutionContext,
	mode: WorkflowExecuteMode,
): IExecutionContext;
function contextAllowedFor(
	context: IExecutionContext | undefined,
	mode: WorkflowExecuteMode,
): IExecutionContext | undefined;
function contextAllowedFor(
	context: IExecutionContext | undefined,
	mode: WorkflowExecuteMode,
): IExecutionContext | undefined {
	return mode === 'error' ? toErrorWorkflowContext(context) : context;
}

export const establishExecutionContext = async (
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	additionalData: PreExecutionAdditionalData | undefined,
	mode: WorkflowExecuteMode,
): Promise<void> => {
	assertExecutionDataExists(runExecutionData.executionData, workflow, additionalData, mode);

	const executionData = runExecutionData.executionData;

	// Call the execution context service to augment the context with any hook-based data
	const executionContextService = Container.get(ExecutionContextService);

	if (executionData.runtimeData) {
		// Context is already established (e.g. established at webhook mint time,
		// before the real executionId existed, or resumed from the database).
		// Bind the now-known executionId to any sealed carrier so credential
		// resolution can gate on executionPath. No-op for legacy (subject-less)
		// carriers and when executionId is undefined; idempotent on resume.
		// A retry reloads the original run's data under a NEW executionId, so its
		// id must join the sealed carrier's path (allowInherit) or resolution would
		// reject it. Resume keeps the same id, so the bind stays a no-op regardless.
		//
		// Filter first: an error run that already has a context (resumed from the
		// database, or established by an earlier call on the main process) skips
		// the inheritance branches below, so this is where its gate has to sit.
		executionData.runtimeData = await executionContextService.maybeBindExecutionId(
			contextAllowedFor(executionData.runtimeData, mode),
			additionalData?.executionId,
			{ allowInherit: mode === 'retry' },
		);
		return;
	}

	// At this point we have established the basic execution context.
	// If a context is already established we overwrite it.
	// This might change depending on the propagation strategy we want to implement in the future.
	executionData.runtimeData = {
		version: 1,
		establishedAt: Date.now(),
		source: mode,
	};

	// An error workflow reports a failure; it never acts as the failed run's user.
	// A carrier handed in here would land on the context after the inheritance
	// branches spread it, so it has to be refused at the source.
	if (mode !== 'error' && additionalData?.encryptedRunnerIdentity) {
		executionData.runtimeData.credentials = additionalData.encryptedRunnerIdentity;
		if (executionData.runtimeData.credentials) {
			executionData.runtimeData = await executionContextService.maybeBindExecutionId(
				executionData.runtimeData,
				additionalData.executionId,
			);
		}
	}

	if (runExecutionData.parentExecution) {
		// Create a new context by inheriting everything from the parent execution context,
		// except for the establishedAt timestamp which we set to now and the source which we set to the current mode.
		// This ensures that the child execution context reflects the time it was established
		// and the mode in which it is running, while still retaining all other contextual information
		// from the parent execution.
		executionData.runtimeData = {
			...(contextAllowedFor(runExecutionData.parentExecution.executionContext, mode) ?? {}),
			...executionData.runtimeData,
			parentExecutionId: runExecutionData.parentExecution.executionId,
		};

		executionData.runtimeData = await executionContextService.maybeBindExecutionId(
			executionData.runtimeData,
			additionalData?.executionId,
			{ allowInherit: true },
		);

		// The child inherits the parent's context, but its OWN execution record must
		// still reflect context derived from the child workflow — most importantly
		// its redaction policy (a policy'd child called by a policy-less parent must
		// redact its own record). Re-run the global context hooks against the
		// inherited context so they can merge with it (redaction escalates
		// strictest-per-channel; the parent's top-down escalation is preserved).
		const [subExecutionStartItem] = executionData.nodeExecutionStack;
		if (subExecutionStartItem) {
			executionData.runtimeData = await Container.get(
				ExecutionContextService,
			).augmentSubExecutionContext(workflow, subExecutionStartItem, executionData.runtimeData);
		}
		return;
	}

	// Next, we attempt to extract additional context from the start node of the execution stack.
	const [startItem] = executionData.nodeExecutionStack;

	// The nodeExecutionStack is typically initialized in one of three ways:
	// 1. run() method: Creates stack with start node (workflow-execute.ts:143-157)
	// 2. runPartialWorkflow2(): Recreates stack from existing runData via recreateNodeExecutionStack()
	// 3. Constructor with executionData: Pre-populated from caller (resume scenarios)
	//
	// However, the stack CAN be legitimately empty for workflows containing only Chat Trigger nodes
	// (see workflow-execute.ts:1368-1369). In such cases, we cannot extract context from a start
	// node, but we should still establish basic execution context.
	//
	// We cannot extract user specific information from the initial item though. So we exit early.
	if (!startItem) {
		return;
	}

	// Store basic trigger node info in the context for reference
	executionData.runtimeData.triggerNode = {
		name: startItem.node.name,
		type: startItem.node.type,
	};

	// We were triggered from a parent execution
	// and can inherit context from there
	if (startItem.metadata?.parentExecution?.executionContext) {
		executionData.runtimeData = {
			...contextAllowedFor(startItem.metadata.parentExecution.executionContext, mode),
			...executionData.runtimeData,
			parentExecutionId: startItem.metadata.parentExecution.executionId,
		};

		// Bind this execution's id to any inherited sealed carrier so it stays
		// resolvable within its own execution (mirrors the parentExecution branch).
		executionData.runtimeData = await executionContextService.maybeBindExecutionId(
			executionData.runtimeData,
			additionalData?.executionId,
			{ allowInherit: true },
		);

		// Re-run the global sub-execution hooks against the child workflow so its own
		// record reflects context derived from itself (redaction policy, private-
		// credential flag), merged with the inherited parent context. Without this a
		// policy'd or private-credential child called by a policy-less parent would
		// not redact its own record. Mirrors the `runExecutionData.parentExecution`
		// branch above.
		executionData.runtimeData = await executionContextService.augmentSubExecutionContext(
			workflow,
			startItem,
			executionData.runtimeData,
		);
		return;
	}

	try {
		const { context, triggerItems } =
			await executionContextService.augmentExecutionContextWithHooks(
				workflow,
				startItem,
				executionData.runtimeData,
			);

		executionData.runtimeData = context;

		// If the trigger items were modified by hooks, update the start item accordingly
		if (triggerItems) {
			startItem.data['main'][0] = triggerItems;
		}
	} catch (error) {
		// Log the error
		Container.get(Logger).error('Failed to augment execution context with hooks.', { error });
		throw error;
	}
};
