/**
 * Replays expression resolution for a node's parameters against a past
 * execution's saved data — the server-side equivalent of the editor's
 * "resolved parameters" view. Used by `executions(action="get-resolved-node-parameters")`
 * and folded into the `debug` action's failedNode payload.
 *
 * Loads the execution from the DB and wraps the result for the AI assistant;
 * the actual replay lives in `@/executions/resolve-node-parameters-from-run`.
 *
 * Lives in its own module to keep `instance-ai.adapter.service.ts` focused.
 */
import { Container } from '@n8n/di';
import { wrapUntrustedData, type ResolvedNodeParametersResult } from '@n8n/instance-ai';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { resolveNodeParametersFromRun } from '@/executions/resolve-node-parameters-from-run';
import type { NodeTypes } from '@/node-types';

/**
 * Replays expression resolution for a node's parameters against a past execution's
 * data, mirroring the editor's resolved-parameter view. Returns the resolved
 * parameter tree (same shape as `node.parameters`) plus a flat list of expressions
 * that failed to resolve, with `unreconstructable-context` tagged on failures
 * stemming from variables that only exist during a live run (e.g. `$response`).
 */
export async function extractResolvedNodeParameters(
	nodeTypes: NodeTypes,
	executionId: string,
	nodeName: string,
	options?: { itemIndex?: number; runIndex?: number },
): Promise<ResolvedNodeParametersResult> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		throw new Error(`Execution ${executionId} not found`);
	}

	// Resolve against the execution's workflow snapshot — what the user actually
	// saw at the time the run happened, not the current draft.
	const workflowData = execution.workflowData;
	const nodeJson = workflowData.nodes.find((n) => n.name === nodeName);
	if (!nodeJson) {
		throw new Error(`Node "${nodeName}" not found in execution ${executionId}`);
	}

	// `$execution.mode` is `'test' | 'production'`. Map runtime modes — the editor
	// uses 'test' for manual replays, which is what an inspection like this is.
	const result = await resolveNodeParametersFromRun({
		workflowData,
		runExecutionData: execution.data ?? createEmptyRunExecutionData(),
		nodeName,
		nodeTypes,
		runIndex: options?.runIndex,
		itemIndex: options?.itemIndex,
		executionId,
		executionMode: execution.mode === 'manual' ? 'test' : 'production',
	});

	// Resolved values can echo data from upstream nodes (webhook bodies, HTTP
	// responses, etc.) so they're wrapped as untrusted data — same pattern used
	// for node output items in `extractNodeOutput`. `parameters`, `failedExpressions`,
	// and `emptyResolutions` are NOT wrapped: they only contain user-authored
	// expressions and engine-generated text, never substituted upstream content.
	const resolved = wrapUntrustedData(
		JSON.stringify(result.resolved, null, 2),
		'execution-output',
		`resolved-parameters:${nodeName}`,
	);

	return {
		nodeName,
		runIndex: result.runIndex,
		itemIndex: result.itemIndex,
		// Defaults-applied, same tree `resolved` mirrors — matches what this function
		// returned before the replay was extracted (`Workflow` used to apply defaults
		// in place on the snapshot's node objects).
		parameters: result.parameters,
		resolved,
		failedExpressions: result.failedExpressions,
		emptyResolutions: result.emptyResolutions,
	};
}
