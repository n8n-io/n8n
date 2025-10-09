import Table from 'cli-table3';
import pc from 'picocolors';

import {
	formatColoredScore,
	formatHeader,
	formatPercentage,
	formatStatusBadge,
	formatTestName,
	formatViolationType,
} from './evaluation-helpers.js';
import type { Violation } from '../types/evaluation.js';
import type { TestResult } from '../types/test-result.js';

/**
 * Generates a markdown report from evaluation results
 * @param results - Array of test results
 * @param metrics - Calculated metrics including averages and counts
 * @returns Formatted markdown report string
 */
export function generateMarkdownReport(
	results: TestResult[],
	metrics: {
		totalTests: number;
		successfulTests: number;
		averageScore: number;
		categoryAverages: Record<string, number>;
		violationCounts: { critical: number; major: number; minor: number };
	},
): string {
	const { totalTests, successfulTests, averageScore, categoryAverages, violationCounts } = metrics;

	let report = `# AI Workflow Builder Evaluation Report

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${totalTests - successfulTests}
- Average Score: ${formatPercentage(averageScore)}

## Category Averages
- Functionality: ${formatPercentage(categoryAverages.functionality)}
- Connections: ${formatPercentage(categoryAverages.connections)}
- Expressions: ${formatPercentage(categoryAverages.expressions)}
- Node Configuration: ${formatPercentage(categoryAverages.nodeConfiguration)}

## Violations Summary
- Critical: ${violationCounts.critical}
- Major: ${violationCounts.major}
- Minor: ${violationCounts.minor}

## Detailed Results

`;

	results.forEach((result) => {
		report += `### ${result.testCase.name} (${result.testCase.id})
- **Score**: ${formatPercentage(result.evaluationResult.overallScore)}
- **Generation Time**: ${result.generationTime}ms
- **Nodes Generated**: ${result.generatedWorkflow.nodes.length}
- **Summary**: ${result.evaluationResult.summary}

`;

		if (
			result.evaluationResult.criticalIssues &&
			result.evaluationResult.criticalIssues.length > 0
		) {
			report += '**Critical Issues**:\n';
			result.evaluationResult.criticalIssues.forEach((issue) => {
				report += `- ${issue}\n`;
			});
			report += '\n';
		}

		const allViolations = [
			...result.evaluationResult.functionality.violations.map((v) => ({
				...v,
				category: 'Functionality',
			})),
			...result.evaluationResult.connections.violations.map((v) => ({
				...v,
				category: 'Connections',
			})),
			...result.evaluationResult.expressions.violations.map((v) => ({
				...v,
				category: 'Expressions',
			})),
			...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
				...v,
				category: 'Node Configuration',
			})),
		];

		if (allViolations.length > 0) {
			report += '**Violations**:\n';
			allViolations.forEach((v) => {
				report += `- [${v.type.toUpperCase()}] ${v.category}: ${v.description}\n`;
			});
			report += '\n';
		}
	});

	return report;
}

/**
 * Displays test results summary in the console
 * @param testCases - Array of test cases
 * @param results - Array of test results
 */
export function displayTestResults(
	testCases: Array<{ id: string; name: string }>,
	results: TestResult[],
): void {
	console.log();
	console.log(formatHeader('Test Results', 70));
	console.log();

	for (const testCase of testCases) {
		const result = results.find((r) => r.testCase.id === testCase.id);
		if (result) {
			const status = result.error ? 'fail' : 'pass';
			const badge = formatStatusBadge(status);
			const score = result.error ? 'N/A' : formatColoredScore(result.evaluationResult.overallScore);
			console.log(`  ${badge} ${formatTestName(testCase.name, testCase.id)}`);
			console.log(
				`     Score: ${score} | Nodes: ${result.generatedWorkflow?.nodes?.length} | Time: ${result.generationTime}ms`,
			);
			if (result.error) {
				console.log(`     ${pc.red('Error:')} ${pc.dim(result.error)}`);
			}
		}
	}
}

/**
 * Displays the evaluation summary table
 * @param results - Array of test results
 * @param metrics - Calculated metrics
 */
export function displaySummaryTable(
	_results: TestResult[],
	metrics: {
		totalTests: number;
		successfulTests: number;
		averageScore: number;
		categoryAverages: Record<string, number>;
		violationCounts: { critical: number; major: number; minor: number };
	},
): void {
	const { totalTests, successfulTests, averageScore, categoryAverages, violationCounts } = metrics;
	const failedTests = totalTests - successfulTests;

	const summaryTable = new Table({
		head: ['Metric', 'Value'],
		style: { head: ['cyan'] },
	});

	summaryTable.push(
		['Total Tests', totalTests.toString()],
		['Successful', pc.green(successfulTests.toString())],
		['Failed', failedTests > 0 ? pc.red(failedTests.toString()) : '0'],
		['Average Score', formatColoredScore(averageScore)],
		[pc.dim('─'.repeat(20)), pc.dim('─'.repeat(20))],
		['Functionality', formatColoredScore(categoryAverages.functionality)],
		['Connections', formatColoredScore(categoryAverages.connections)],
		['Expressions', formatColoredScore(categoryAverages.expressions)],
		['Node Config', formatColoredScore(categoryAverages.nodeConfiguration)],
		[pc.dim('─'.repeat(20)), pc.dim('─'.repeat(20))],
		[
			'Critical Issues',
			violationCounts.critical > 0 ? pc.red(violationCounts.critical.toString()) : '0',
		],
		['Major Issues', violationCounts.major > 0 ? pc.yellow(violationCounts.major.toString()) : '0'],
		['Minor Issues', pc.dim(violationCounts.minor.toString())],
	);

	console.log();
	console.log(formatHeader('Summary', 70));
	console.log(summaryTable.toString());
}

/**
 * Displays detailed violations grouped by severity
 * @param results - Array of test results
 */
export function displayViolationsDetail(results: TestResult[]): void {
	// Collect all violations with test context
	const allViolations: Array<{
		violation: Violation & { category: string };
		testName: string;
	}> = [];

	results.forEach((result) => {
		if (!result.error) {
			const testViolations = [
				...result.evaluationResult.functionality.violations.map((v) => ({
					violation: { ...v, category: 'Functionality' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.connections.violations.map((v) => ({
					violation: { ...v, category: 'Connections' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.expressions.violations.map((v) => ({
					violation: { ...v, category: 'Expressions' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
					violation: { ...v, category: 'Node Config' },
					testName: result.testCase.name,
				})),
			];
			allViolations.push.apply(allViolations, testViolations);
		}
	});

	if (allViolations.length === 0) return;

	console.log();
	console.log(formatHeader('Violations Detail', 70));

	// Group violations by severity
	const criticalViolations = allViolations.filter((v) => v.violation.type === 'critical');
	const majorViolations = allViolations.filter((v) => v.violation.type === 'major');
	const minorViolations = allViolations.filter((v) => v.violation.type === 'minor');

	// Display critical violations
	if (criticalViolations.length > 0) {
		console.log();
		console.log(pc.red('Critical Violations:'));
		criticalViolations.forEach(({ violation, testName }) => {
			console.log(
				`  ${formatViolationType('critical')} [${violation.category}] ${violation.description}`,
			);
			console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
		});
	}

	// Display major violations
	if (majorViolations.length > 0) {
		console.log();
		console.log(pc.yellow('Major Violations:'));
		majorViolations.forEach(({ violation, testName }) => {
			console.log(
				`  ${formatViolationType('major')} [${violation.category}] ${violation.description}`,
			);
			console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
		});
	}

	// Display minor violations
	if (minorViolations.length > 0) {
		console.log();
		console.log(pc.gray('Minor Violations:'));
		minorViolations.forEach(({ violation, testName }) => {
			console.log(
				`  ${formatViolationType('minor')} [${violation.category}] ${violation.description}`,
			);
			console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
		});
	}
}
