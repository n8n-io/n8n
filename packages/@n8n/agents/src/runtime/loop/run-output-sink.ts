import type { CompleteEmission, RunServices } from '../../types/runtime/agent-loop';

export type {
	ModelTurnErrorType,
	ModelTurnError,
	ModelTurnResult,
	ModelCallContext,
	SuspendEmission,
	CompleteEmission,
	RunServices,
	RunOutputSink,
} from '../../types/runtime/agent-loop';

/** Persist the turn and settle a sync title before checkpoint cleanup and telemetry flush. */
export async function finalizeRun(
	services: RunServices,
	{ list, options }: Pick<CompleteEmission, 'list' | 'options'>,
): Promise<void> {
	await services.saveToMemory(list, options);
	await services.settleTitle();
	await services.cleanupRun();
	await services.flushTelemetry(options);
}
