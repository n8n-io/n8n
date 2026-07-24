/**
 * Scripted wait-gate verification: one execution per gate decision, each on an
 * ephemeral workflow copy with the script's loop edge removed so no decision
 * can re-enter the gate. Pass results merge into a single verification
 * analysis — success requires every pass to succeed, coverage is the union.
 */

import {
	analyzeVerificationResult,
	buildSimulationNote,
	type VerificationAnalysis,
} from './analyze-result';
import type { PreparedVerificationRun } from './prepare-run';
import type { ExecutionRunResult } from './types';
import type { OrchestrationContext } from '../../../types';
import type {
	WaitGateScript,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from '../../../workflow-loop/workflow-loop-state';

type VerificationExecutionService = NonNullable<
	OrchestrationContext['domainContext']
>['executionService'];

export interface ScriptedGateRunArgs {
	script: WaitGateScript;
	prepared: PreparedVerificationRun;
	executionService: VerificationExecutionService;
	workflowId: string;
	inputData?: Record<string, unknown>;
	timeout?: number;
	abortSignal?: AbortSignal;
	buildOutcome: WorkflowBuildOutcome;
	stateBefore: WorkflowLoopState | undefined;
	runId: string;
}

interface DecisionPass {
	label: string;
	result: ExecutionRunResult;
	analysis: VerificationAnalysis;
}

export async function runScriptedGateVerification(
	args: ScriptedGateRunArgs,
): Promise<{ result: ExecutionRunResult; analysis: VerificationAnalysis }> {
	const { script, prepared, executionService, workflowId, buildOutcome, stateBefore, runId } = args;
	const basePins = prepared.verificationPinData ?? {};

	const passes: DecisionPass[] = [];
	for (const decision of script.decisions) {
		const result = await executionService.run(workflowId, args.inputData, {
			timeout: args.timeout,
			verificationPinData: { ...basePins, [script.nodeName]: decision.items },
			omitConnections: [script.cutEdge],
			abortSignal: args.abortSignal,
		});
		const analysis = analyzeVerificationResult({
			result,
			buildOutcome,
			simulatedNodes: prepared.simulatedNodes,
			stateBefore,
			runId,
		});
		passes.push({ label: decision.label, result, analysis });
	}

	return { result: mergeResults(passes), analysis: mergeAnalyses(script, prepared, passes) };
}

function mergeResults(passes: DecisionPass[]): ExecutionRunResult {
	const last = passes[passes.length - 1];
	const failing = passes.find((pass) => !pass.analysis.success);
	const data: Record<string, unknown> = {};
	const executedNodeNames = new Set<string>();
	for (const pass of passes) {
		Object.assign(data, pass.result.data ?? {});
		for (const name of pass.analysis.reachedNames) executedNodeNames.add(name);
	}

	// A pass can fail on node errors while its engine status is still
	// 'success' — normalize so the merged status never contradicts `success`.
	const failingStatus = failing
		? failing.result.status === 'success'
			? 'error'
			: failing.result.status
		: undefined;

	return {
		...last.result,
		status: failingStatus ?? last.result.status,
		data: Object.keys(data).length > 0 ? data : undefined,
		executedNodeNames: [...executedNodeNames],
		error: failing?.result.error ?? failing?.analysis.errorMessage,
	};
}

function mergeAnalyses(
	script: WaitGateScript,
	prepared: PreparedVerificationRun,
	passes: DecisionPass[],
): VerificationAnalysis {
	const reachedNames = new Set<string>();
	for (const pass of passes) {
		for (const name of pass.analysis.reachedNames) reachedNames.add(name);
	}
	const failing = passes.find((pass) => !pass.analysis.success);
	const nodesNotReached = [
		...new Set(passes.flatMap((pass) => pass.analysis.nodesNotReached)),
	].filter((name) => !reachedNames.has(name));
	const nodeErrors = passes.flatMap((pass) =>
		pass.analysis.nodeErrors.map((nodeError) => ({
			...nodeError,
			message: `[decision: ${pass.label}] ${nodeError.message ?? 'node execution failed'}`,
		})),
	);

	const endings = passes
		.map(
			(pass) =>
				`"${pass.label}" ended at ${pass.result.lastNodeExecuted ? `"${pass.result.lastNodeExecuted}"` : 'an unknown node'}`,
		)
		.join('; ');
	const coverageNote =
		`Scripted gate verification: ran ${String(passes.length)} decision pass(es) through ` +
		`"${script.nodeName}" with loop edge "${script.cutEdge.source}" → "${script.cutEdge.target}" ` +
		`removed so each pass is loop-safe (${endings}). The gate's send/wait behaviour itself was ` +
		'simulated — recommend a live end-to-end test for final confirmation.' +
		(nodesNotReached.length > 0
			? ` ${String(nodesNotReached.length)} planned node(s) not reached by any pass: ` +
				`${nodesNotReached.join(', ')}. If a decision should route to them, inspect the ` +
				'branch wiring before editing.'
			: '');

	// Rebuild the note from the union — a node simulated only in an earlier
	// pass must still be disclosed.
	const reachedSimulatedNodes = prepared.simulatedNodes.filter((node) =>
		reachedNames.has(node.nodeName),
	);

	return {
		success: passes.every((pass) => pass.analysis.success),
		reachedNames,
		reachedSimulatedNodes,
		nodesNotReached,
		remediation: failing?.analysis.remediation,
		nodesExecuted: [...reachedNames],
		simulationNote: buildSimulationNote(reachedSimulatedNodes, false),
		coverageNote,
		errorMessage: failing?.analysis.errorMessage,
		nodeErrors,
	};
}
