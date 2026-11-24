import type { CallToolResult } from '../types';
import { applyHitsToResult } from './redact';
import type { SensitivityOk } from '../sensitivity/analyze-html';

export function applyRedactions(
	result: CallToolResult,
	sensitivity: SensitivityOk,
): CallToolResult {
	return applyHitsToResult(result, sensitivity.hits);
}
