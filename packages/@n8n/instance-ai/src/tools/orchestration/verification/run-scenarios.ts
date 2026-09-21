import type { VerifyToolInput } from './types';
import type { OrchestrationContext } from '../../../types';
import type { VerifyInput, VerifyScenarioOutput } from '../verify-built-workflow.tool';

/** Keep the existing verifier responsible for each run and its attempt budget. */
export async function runVerificationScenarios(
	input: VerifyInput,
	context: OrchestrationContext,
	verify: (scenario: VerifyToolInput) => Promise<VerifyScenarioOutput>,
) {
	const { scenarios = [], ...sharedInput } = input;
	const scenarioResults: Array<{ name: string; result: VerifyScenarioOutput }> = [];
	let versionId: string | undefined;
	let error: string | undefined;
	const workflowService = context.domainContext?.workflowService;
	const checkVersion = async () => {
		if (!workflowService) return 'Verification support is not available.';
		try {
			const head = await workflowService.getWorkflowHead(input.workflowId);
			versionId ??= head.versionId;
			return head.versionId === versionId
				? undefined
				: 'The workflow changed during scenario verification. Read its current version before continuing.';
		} catch {
			return 'The workflow version could not be read. Retry verification when it is available.';
		}
	};

	for (const { name, ...scenario } of scenarios) {
		if (context.abortSignal?.aborted) {
			error = 'Scenario verification was cancelled.';
			break;
		}
		error = await checkVersion();
		if (error) break;
		let result: VerifyScenarioOutput;
		try {
			result = await verify({ ...sharedInput, ...scenario });
		} catch (cause) {
			context.logger.warn('Scenario verification did not complete', {
				workflowId: input.workflowId,
				scenario: name,
				error: cause instanceof Error ? cause.message : String(cause),
			});
			result = {
				success: false,
				error: 'The scenario did not complete. Read its verification state before retrying.',
			};
		}
		scenarioResults.push({ name, result });
		if (!result.success || result.status !== 'success') {
			error = result.error ?? `Scenario "${name}" did not finish successfully.`;
			break;
		}
		if (result.workflowVersionId && result.workflowVersionId !== versionId) {
			error =
				'The scenario ran a different workflow version. Read its current version before continuing.';
			break;
		}
		error = await checkVersion();
		if (error) break;
	}

	// Per-run claims retain simulation, repair target, and publication limits.
	// Successful scenarios do not prove all paths through the workflow.
	return {
		success: error === undefined,
		status: error === undefined ? ('success' as const) : ('unknown' as const),
		scenarioResults,
		scenariosNotRun: scenarios.slice(scenarioResults.length).map(({ name }) => name),
		error,
		guidance:
			'Report each scenario result and its evidence limits. Do not treat these runs as proof of untested paths or live production behavior.',
	};
}
