import { analyzeVerificationResult } from './analyze-result';
import { runScriptedGateVerification, type ScriptedGateRunArgs } from './scripted-gate-run';

export type WorkflowVerificationRunArgs = Omit<ScriptedGateRunArgs, 'script'>;

/** Run prepared verification without builder task lookup or persistence. */
export async function runWorkflowVerification(args: WorkflowVerificationRunArgs) {
	args.abortSignal?.throwIfAborted();

	const { prepared } = args;

	if (prepared.gateScript) {
		return await runScriptedGateVerification({ ...args, script: prepared.gateScript });
	}

	const result = await args.executionService.run(args.workflowId, args.inputData, {
		timeout: args.timeout,
		triggerNodeName: args.triggerNodeName,
		verificationPinData: prepared.verificationPinData,
		isVerificationRun: true,
		abortSignal: args.abortSignal,
	});

	const analysis = analyzeVerificationResult({
		result,
		buildOutcome: args.buildOutcome,
		simulatedNodes: prepared.simulatedNodes,
		haltedGateNames: prepared.haltedGateNames,
		triggerNodeName: args.triggerNodeName,
		stateBefore: args.stateBefore,
		runId: args.runId,
		chatModelRelatedNodeNames: args.chatModelRelatedNodeNames,
		chatModelRecovery: args.chatModelRecovery,
		verificationScope: args.verificationScope,
	});

	return {
		result,
		analysis,
		parameterCheckRuns: [
			{
				executionId: result.executionId,
				nodeNames: analysis.reachedSimulatedNodes.map((node) => node.nodeName),
			},
		],
	};
}
