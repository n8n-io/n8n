import type { JsonValue } from '../common';

/**
 * How a step executor hands structured failure detail across the seam.
 *
 * The engine records a thrown error's name, message and stack, and persists
 * the details without inspecting them: what they mean belongs to the step
 * type. The details ride on the error itself, so the executor's callers still
 * see the error class the node threw.
 */
const STEP_ERROR_DETAILS = Symbol('stepErrorDetails');

interface WithStepErrorDetails {
	[STEP_ERROR_DETAILS]?: JsonValue;
}

export function attachStepErrorDetails<E extends Error>(error: E, details: JsonValue): E {
	const carrier: E & WithStepErrorDetails = error;
	carrier[STEP_ERROR_DETAILS] = details;
	return error;
}

export function stepErrorDetails(error: Error): JsonValue | undefined {
	const carrier: Error & WithStepErrorDetails = error;
	return carrier[STEP_ERROR_DETAILS];
}
