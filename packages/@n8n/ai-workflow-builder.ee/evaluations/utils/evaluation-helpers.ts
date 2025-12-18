import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { v4 as uuid } from 'uuid';

import type { BuilderFeatureFlags, ChatPayload } from '../../src/workflow-builder-agent';
import { DEFAULTS } from '../constants';
import type { TestResult } from '../types/test-result';

/**
 * Formats percentage for display
 * @param value - Decimal value between 0 and 1
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculates elapsed time and formats it for display
 * @param startTime - Start timestamp from Date.now()
 * @returns Formatted time string
 */
export function formatElapsedTime(startTime: number): string {
	const elapsed = Date.now() - startTime;
	if (elapsed < 1000) {
		return `${elapsed}ms`;
	}
	return `${(elapsed / 1000).toFixed(1)}s`;
}

/**
 * Formats a score with appropriate color based on value
 * @param score - Score between 0 and 1
 * @param asPercentage - Whether to format as percentage
 * @returns Color-formatted score string
 */
export function formatColoredScore(score: number, asPercentage = true): string {
	const value = asPercentage ? formatPercentage(score) : score.toFixed(2);
	if (score >= 0.8) return pc.green(value);
	if (score >= 0.5) return pc.yellow(value);
	return pc.red(value);
}

/**
 * Creates a formatted section header
 * @param title - Header title
 * @param width - Total width of the header line
 * @returns Formatted header string
 */
export function formatHeader(title: string, width = 60): string {
	const padding = Math.max(0, width - title.length - 4);
	const leftPad = Math.floor(padding / 2);
	const rightPad = padding - leftPad;
	return pc.blue('═'.repeat(leftPad) + ` ${title} ` + '═'.repeat(rightPad));
}

/**
 * Formats a status badge with appropriate icon and color
 * @param status - Status type
 * @returns Formatted status badge
 */
export function formatStatusBadge(status: 'pass' | 'fail' | 'running' | 'pending'): string {
	switch (status) {
		case 'pass':
			return pc.green('✓ PASS');
		case 'fail':
			return pc.red('✗ FAIL');
		case 'running':
			return pc.blue('⚡ RUNNING');
		case 'pending':
			return pc.gray('○ PENDING');
	}
}

/**
 * Formats violation type with appropriate color
 * @param type - Violation type
 * @returns Color-formatted violation type
 */
export function formatViolationType(type: 'critical' | 'major' | 'minor'): string {
	switch (type) {
		case 'critical':
			return pc.red('[CRITICAL]');
		case 'major':
			return pc.yellow('[MAJOR]');
		case 'minor':
			return pc.gray('[MINOR]');
	}
}

/**
 * Formats a test name with dimmed ID
 * @param name - Test name
 * @param id - Test ID
 * @returns Formatted test name
 */
export function formatTestName(name: string, id: string): string {
	return `${name} ${pc.dim(`(${id})`)}`;
}

/**
 * Saves evaluation results to disk in both JSON and markdown formats
 * @param results - Array of test results
 * @param report - Generated markdown report
 * @returns Paths to saved files
 */
export function saveEvaluationResults(
	results: TestResult[],
	report: string,
): { reportPath: string; resultsPath: string } {
	const resultsDir = join(process.cwd(), 'evaluations', 'results');
	mkdirSync(resultsDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/:/g, '-');
	const reportPath = join(resultsDir, `evaluation-report-${timestamp}.md`);
	const resultsPath = join(resultsDir, `evaluation-results-${timestamp}.json`);

	writeFileSync(reportPath, report);
	writeFileSync(resultsPath, JSON.stringify(results, null, 2));

	return { reportPath, resultsPath };
}

export async function consumeGenerator<T>(gen: AsyncGenerator<T>) {
	for await (const _ of gen) {
		/* consume all */
	}
}

export interface GetChatPayloadOptions {
	evalType: string;
	message: string;
	workflowId: string;
	featureFlags?: BuilderFeatureFlags;
}

export function getChatPayload(options: GetChatPayloadOptions): ChatPayload {
	const { evalType, message, workflowId, featureFlags } = options;

	return {
		id: `${evalType}-${uuid()}`,
		featureFlags: featureFlags ?? DEFAULTS.FEATURE_FLAGS,
		message,
		workflowContext: {
			currentWorkflow: { id: workflowId, nodes: [], connections: {} },
		},
	};
}
