/**
 * Auto-Finalize Handler
 *
 * Handles the auto-finalize logic when the LLM stops calling tools in text editor mode.
 * Validates the code and either returns success or provides feedback for correction.
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { StreamOutput } from '../../types/streaming';
import { FIX_VALIDATION_ERRORS_INSTRUCTION } from '../constants';
import type { WarningTracker } from '../state/warning-tracker';
import type { ParseAndValidateResult } from '../types';
import { pushValidationFeedback } from '../utils/content-extractors';
import { formatWarnings } from '../utils/format-warnings';

/**
 * Parse and validate function type
 */
type ParseAndValidateFn = (
	code: string,
	currentWorkflow?: WorkflowJSON,
) => Promise<ParseAndValidateResult>;

/**
 * Get error context function type
 */
type GetErrorContextFn = (code: string, errorMessage: string) => string;

/**
 * Configuration for AutoFinalizeHandler
 */
export interface AutoFinalizeHandlerConfig {
	parseAndValidate: ParseAndValidateFn;
	getErrorContext: GetErrorContextFn;
}

/**
 * Parameters for executing auto-finalize
 */
export interface AutoFinalizeParams {
	/** The current workflow code from text editor */
	code: string;
	/** The current workflow context for validation */
	currentWorkflow: WorkflowJSON | undefined;
	/** Message history to append feedback to */
	messages: BaseMessage[];
	/** Optional warning tracker for deduplicating repeated warnings */
	warningTracker?: WarningTracker;
}

/**
 * Result of auto-finalize execution
 */
export interface AutoFinalizeResult {
	/** Whether auto-finalize succeeded */
	success: boolean;
	/** The validated workflow (only on success) */
	workflow?: WorkflowJSON;
	/** Parse duration in milliseconds */
	parseDuration?: number;
}

/**
 * Handles the auto-finalize logic when the LLM stops calling tools.
 *
 * This handler:
 * 1. Validates the code and returns success on valid workflow
 * 2. Provides feedback for warnings or parse errors
 */
export class AutoFinalizeHandler {
	private parseAndValidate: ParseAndValidateFn;
	private getErrorContext: GetErrorContextFn;

	constructor(config: AutoFinalizeHandlerConfig) {
		this.parseAndValidate = config.parseAndValidate;
		this.getErrorContext = config.getErrorContext;
	}

	/**
	 * Execute the auto-finalize logic.
	 *
	 * @param params - Execution parameters
	 * @yields StreamOutput chunks (currently none, but kept for consistency)
	 * @returns AutoFinalizeResult with success status and optional workflow
	 */
	// eslint-disable-next-line require-yield
	async *execute(
		params: AutoFinalizeParams,
	): AsyncGenerator<StreamOutput, AutoFinalizeResult, unknown> {
		const { code, currentWorkflow, messages, warningTracker } = params;

		// Auto-validate and finalize
		const parseStartTime = Date.now();
		try {
			const result = await this.parseAndValidate(code, currentWorkflow);
			const parseDuration = Date.now() - parseStartTime;

			// Handle warnings
			if (result.warnings.length > 0) {
				const newWarnings = warningTracker
					? warningTracker.filterNewWarnings(result.warnings)
					: result.warnings;

				if (newWarnings.length > 0) {
					if (warningTracker) {
						warningTracker.markAsSeen(newWarnings);
					}

					const warningText = formatWarnings(newWarnings, warningTracker);
					const errorContext = this.getErrorContext(code, newWarnings[0].message);

					// Send only new warnings back to agent for correction
					pushValidationFeedback(
						messages,
						`Validation warnings:\n${warningText}\n\n${errorContext}\n\n${FIX_VALIDATION_ERRORS_INSTRUCTION}`,
					);

					return { success: false, parseDuration };
				}
			}

			// Success - workflow validated
			return {
				success: true,
				workflow: result.workflow,
				parseDuration,
			};
		} catch (error) {
			const parseDuration = Date.now() - parseStartTime;
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorContext = this.getErrorContext(code, errorMessage);

			// Send error back to agent for correction
			pushValidationFeedback(
				messages,
				`Parse error: ${errorMessage}\n\n${errorContext}\n\n${FIX_VALIDATION_ERRORS_INSTRUCTION}`,
			);

			return { success: false, parseDuration };
		}
	}
}
