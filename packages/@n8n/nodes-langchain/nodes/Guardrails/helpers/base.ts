import {
	type GuardrailResult,
	GuardrailError,
	type GroupedGuardrailResults,
	type StageGuardRails,
} from '../actions/types';

// eslint-disable-next-line @typescript-eslint/promise-function-async
const wrapInGuardrailError = (guardrailName: string, promise: Promise<GuardrailResult>) => {
	return promise.catch((error) => {
		throw new GuardrailError(
			guardrailName,
			error?.description || error?.message || 'Unknown error',
			error?.description,
		);
	});
};

export async function runStageGuardrails(
	stageGuardrails: StageGuardRails,
	stage: keyof StageGuardRails,
	inputText: string,
): Promise<GroupedGuardrailResults> {
	const guardrailPromises: Array<Promise<GuardrailResult>> = [];
	for (const guardrail of stageGuardrails[stage]) {
		guardrailPromises.push(
			wrapInGuardrailError(
				guardrail.name,
				// ensure the check is async
				Promise.resolve().then(async () => await guardrail.check(inputText)),
			),
		);
	}
	const results = await Promise.allSettled(guardrailPromises);
	const passed: Array<PromiseFulfilledResult<GuardrailResult>> = [];
	const failed: Array<PromiseRejectedResult | PromiseFulfilledResult<GuardrailResult>> = [];
	for (const result of results) {
		if (result.status === 'fulfilled' && !result.value.tripwireTriggered) {
			passed.push(result);
		} else {
			failed.push(result);
		}
	}
	return { passed, failed };
}
