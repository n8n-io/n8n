/**
 * Parse and Validate Handler
 *
 * Handles parsing TypeScript workflow code to WorkflowJSON and validation.
 * Consolidates duplicate parse/validate logic that was previously in multiple
 * places in the code builder agent.
 */

import type { Logger } from '@n8n/backend-common';
import { parseWorkflowCodeToBuilder, validateWorkflow, workflow } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ParseAndValidateResult, ValidationWarning } from '../types';
import { stripImportStatements } from '../utils/extract-code';

/**
 * Configuration for ParseValidateHandler
 */
export interface ParseValidateHandlerConfig {
	logger?: Logger;
	/** Whether to generate pin data for new nodes. Defaults to true. */
	generatePinData?: boolean;
}

/**
 * Handles parsing and validation of workflow code.
 *
 * Consolidates the parse/validate logic that was duplicated in:
 * - Main loop (lines 784-846)
 * - Text editor auto-finalize (lines 695-765)
 * - Validate tool (lines 1428-1594)
 */
/** Validation issue from graph or JSON validation */
interface ValidationIssue {
	code: string;
	message: string;
	nodeName?: string;
}

export class ParseValidateHandler {
	private logger?: Logger;
	private generatePinData: boolean;

	constructor(config: ParseValidateHandlerConfig = {}) {
		this.logger = config.logger;
		this.generatePinData = config.generatePinData ?? true;
	}

	/**
	 * Collect validation issues (errors or warnings) into the warnings array.
	 * Used to normalize all validation feedback for agent self-correction.
	 */
	private collectValidationIssues(
		issues: ValidationIssue[],
		allWarnings: ValidationWarning[],
		context: string,
		logLevel: 'warn' | 'info',
	): void {
		if (issues.length === 0) return;

		if (logLevel === 'warn') {
			this.logger?.warn(`Graph validation ${context.toLowerCase()}`, {
				[context.toLowerCase()]: issues.map((i) => i.message),
			});
		} else {
			this.logger?.info(`Graph validation ${context.toLowerCase()}`, {
				[context.toLowerCase()]: issues.map((i) => i.message),
			});
		}

		for (const issue of issues) {
			allWarnings.push({
				code: issue.code,
				message: issue.message,
				nodeName: issue.nodeName,
			});
		}
	}

	/**
	 * Validate an existing workflow (from JSON) using graph validation only.
	 *
	 * Used to discover pre-existing warnings before the agent starts editing,
	 * so those warnings can be annotated as [pre-existing] when shown to the agent.
	 *
	 * Skips JSON validation since we already have the JSON — graph validation
	 * alone is sufficient for discovering pre-existing warnings.
	 *
	 * @param json - The existing workflow JSON to validate
	 * @returns Array of validation warnings found in the existing workflow
	 */
	validateExistingWorkflow(json: WorkflowJSON): ValidationWarning[] {
		if (json.nodes.length === 0) {
			return [];
		}

		const builder = workflow.fromJSON(json);
		const allWarnings: ValidationWarning[] = [];
		const graphValidation = builder.validate();
		this.collectValidationIssues(
			graphValidation.errors,
			allWarnings,
			'GRAPH VALIDATION ERRORS',
			'warn',
		);
		this.collectValidationIssues(
			graphValidation.warnings,
			allWarnings,
			'GRAPH VALIDATION WARNINGS',
			'info',
		);
		return allWarnings;
	}

	/**
	 * Parse TypeScript code to WorkflowJSON and validate.
	 *
	 * @param code - The TypeScript workflow code to parse
	 * @param currentWorkflow - Optional current workflow for context (used for pin data generation)
	 * @returns ParseAndValidateResult with workflow and any warnings
	 * @throws Error if parsing fails or there are validation errors
	 */
	async parseAndValidate(
		code: string,
		currentWorkflow?: WorkflowJSON,
	): Promise<ParseAndValidateResult> {
		// Strip import statements before parsing - SDK functions are available as globals
		const codeToParse = stripImportStatements(code);

		try {
			// Parse the TypeScript code to WorkflowBuilder
			this.logger?.debug('Parsing WorkflowCode', { codeLength: codeToParse.length });
			const builder = parseWorkflowCodeToBuilder(codeToParse);

			// Regenerate node IDs deterministically to ensure stable IDs across re-parses
			builder.regenerateNodeIds();

			// Run graph + JSON validation
			const allWarnings: ValidationWarning[] = [];

			// Validate the graph structure BEFORE converting to JSON
			const graphValidation = builder.validate();

			// Collect graph validation errors as warnings for agent self-correction
			this.collectValidationIssues(
				graphValidation.errors,
				allWarnings,
				'GRAPH VALIDATION ERRORS',
				'warn',
			);

			// Collect graph validation warnings
			this.collectValidationIssues(
				graphValidation.warnings,
				allWarnings,
				'GRAPH VALIDATION WARNINGS',
				'info',
			);

			// Convert to JSON for JSON-based validation
			const json = builder.toJSON();

			// Run JSON-based validation for additional checks
			const validationResult = validateWorkflow(json);

			// Collect JSON validation errors as warnings for agent self-correction
			this.collectValidationIssues(
				validationResult.errors,
				allWarnings,
				'JSON VALIDATION ERRORS',
				'warn',
			);

			// Collect JSON validation warnings
			this.collectValidationIssues(
				validationResult.warnings,
				allWarnings,
				'JSON VALIDATION WARNINGS',
				'info',
			);

			// Generate pin data for new nodes only (nodes not in currentWorkflow)
			if (this.generatePinData) {
				builder.generatePinData({ beforeWorkflow: currentWorkflow });
			}

			// Convert to JSON
			const workflowJson: WorkflowJSON = builder.toJSON();

			this.logger?.debug('Parsed workflow', {
				id: workflowJson.id,
				name: workflowJson.name,
				nodeCount: workflowJson.nodes.length,
			});

			// Return both workflow and warnings for agent self-correction
			return { workflow: workflowJson, warnings: allWarnings };
		} catch (error) {
			this.logger?.error('Failed to parse WorkflowCode', {
				error: error instanceof Error ? error.message : String(error),
				code: code.substring(0, 500),
			});

			throw new Error(
				`Failed to parse generated workflow code: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Extract error context with line numbers for debugging.
	 *
	 * @param code - The code to extract context from
	 * @param errorMessage - The error message (may contain line number)
	 * @returns Formatted code context around the error
	 */
	getErrorContext(code: string, errorMessage: string): string {
		// Try to extract line number from error message (e.g., "at line 5" or "Line 5:")
		const lineMatch = errorMessage.match(/(?:line|Line)\s*(\d+)/i);
		if (!lineMatch) {
			// No line number - show first 10 lines as context
			const lines = code.split('\n').slice(0, 10);
			return `Code context:\n${lines.map((l, i) => `${i + 1}: ${l}`).join('\n')}`;
		}

		const errorLine = parseInt(lineMatch[1], 10);
		const lines = code.split('\n');

		// Show 3 lines before and after the error line
		const start = Math.max(0, errorLine - 4);
		const end = Math.min(lines.length, errorLine + 3);
		const context = lines
			.slice(start, end)
			.map((l, i) => {
				const lineNum = start + i + 1;
				const marker = lineNum === errorLine ? '> ' : '  ';
				return `${marker}${lineNum}: ${l}`;
			})
			.join('\n');

		const contextText = `Code around line ${errorLine}:\n${context}`;

		const hint = this.detectFixHint(lines, errorLine);
		if (hint) {
			return `${contextText}\n\n${hint}`;
		}

		return contextText;
	}

	/**
	 * Detect known error patterns near the error line and return a fix hint.
	 *
	 * Checks for `${{` inside backtick template literals — a common issue where
	 * JS interprets `${{` as template literal interpolation `${...}`.
	 */
	private detectFixHint(lines: string[], errorLine: number): string | null {
		const searchStart = Math.max(0, errorLine - 5);
		const searchEnd = Math.min(lines.length, errorLine + 5);
		const nearbyCode = lines.slice(searchStart, searchEnd).join('\n');

		// Detect ${{ inside backtick template literals (expr(`...${{...}}`))
		if (/expr\s*\(\s*`[^`]*\$\{\{/.test(nearbyCode)) {
			return (
				"HINT: The '$' before '{{' inside a backtick template literal is interpreted as JS template interpolation. " +
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				"Use single quotes instead of backticks for expr(), e.g. expr('Amount: ${{ $json.amount }}'). " +
				'Fix ALL occurrences in the file at once.'
			);
		}

		return null;
	}
}
