import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import {
	getAllMetricNames,
	getUserDefinedMetricNames,
	getMetricScale,
	type MetricCategory,
} from './evaluation.utils';
import type { MetricSource } from './evaluation.utils';

const MAX_CASES_IN_PROMPT = 8;
const MAX_JSON_LENGTH = 500;

interface FailingCase {
	index: number;
	value: number;
	inputs: TestCaseExecutionRecord['inputs'];
	outputs: TestCaseExecutionRecord['outputs'];
	hasEvidence: boolean;
}

function isFailure(value: number | undefined, category: MetricCategory): boolean {
	if (value === undefined || Number.isNaN(value)) return false;
	if (getMetricScale(category) === 'oneToFive') return value <= 3;
	return value < 1;
}

function getTargetLabel(category: MetricCategory): string {
	return getMetricScale(category) === 'oneToFive' ? '5.0' : '1.0';
}

function getMetricTypeDescription(category: MetricCategory): string {
	switch (category) {
		case 'categorization':
			return 'exact-match (0 = wrong, 1 = correct)';
		case 'aiBased':
			return 'AI-judged quality score (1–5 scale)';
		case 'stringSimilarity':
			return 'string similarity (0–1 scale)';
		case 'toolsUsed':
			return 'tool usage match (0–1 scale)';
		default:
			return 'numeric score';
	}
}

function truncateJson(obj: unknown): string {
	const raw = JSON.stringify(obj);
	if (raw.length <= MAX_JSON_LENGTH) return raw;
	return raw.slice(0, MAX_JSON_LENGTH) + '…}';
}

function hasData(
	obj: TestCaseExecutionRecord['inputs'] | TestCaseExecutionRecord['outputs'],
): boolean {
	return obj !== undefined && obj !== null && Object.keys(obj).length > 0;
}

function formatCaseWithEvidence(c: FailingCase): string {
	const lines: string[] = [`- Case #${c.index} (score: ${c.value})`];
	if (hasData(c.inputs)) {
		lines.push(`  Input: ${truncateJson(c.inputs)}`);
	}
	if (hasData(c.outputs)) {
		lines.push(`  Output: ${truncateJson(c.outputs)}`);
	}
	return lines.join('\n');
}

/**
 * Composes a structured prompt from evaluation results for the AI Builder.
 * Pure function — no side effects.
 *
 * @param selectedMetrics - If provided, only these metric names are included.
 *   When omitted, all user-defined metrics are used (legacy behavior).
 */
export function composeImprovementPrompt(
	testRun: TestRunRecord,
	testCases: TestCaseExecutionRecord[],
	metricSources: Record<string, MetricSource>,
	selectedMetrics?: ReadonlySet<string>,
): string {
	const allNames = getAllMetricNames(testRun.metrics);
	const metricNames = selectedMetrics
		? allNames.filter((name) => selectedMetrics.has(name))
		: getUserDefinedMetricNames(testRun.metrics);
	const totalCases = testCases.length;

	const sections: string[] = [];

	sections.push(
		`This workflow was evaluated against ${totalCases} test cases. The results show room for improvement.`,
	);

	const aggregateLines = metricNames.map((name) => {
		const value = testRun.metrics?.[name];
		const category = metricSources[name]?.category ?? 'custom';
		const target = getTargetLabel(category);
		const display = value !== undefined ? value.toFixed(2) : '–';
		const typeDesc = getMetricTypeDescription(category);
		return `- **${name}**: ${display} / ${target} — ${typeDesc}`;
	});
	sections.push(['## Metrics', ...aggregateLines].join('\n'));

	const failuresByMetric: Array<{
		name: string;
		category: MetricCategory;
		cases: FailingCase[];
		total: number;
		hasAnyEvidence: boolean;
	}> = [];

	for (const name of metricNames) {
		const category = metricSources[name]?.category ?? 'custom';
		const failing: FailingCase[] = [];

		for (let i = 0; i < testCases.length; i++) {
			const tc = testCases[i];
			const value = tc.metrics?.[name];
			if (isFailure(value, category)) {
				failing.push({
					index: i + 1,
					value: value!,
					inputs: tc.inputs,
					outputs: tc.outputs,
					hasEvidence: hasData(tc.inputs) || hasData(tc.outputs),
				});
			}
		}

		if (failing.length > 0) {
			failing.sort((a, b) => a.value - b.value);
			const hasAnyEvidence = failing.some((c) => c.hasEvidence);
			failuresByMetric.push({
				name,
				category,
				cases: failing,
				total: failing.length,
				hasAnyEvidence,
			});
		}
	}

	if (failuresByMetric.length > 0) {
		const failureLines: string[] = ['## Failure Details'];

		for (const { name, category, cases, total, hasAnyEvidence } of failuresByMetric) {
			const pct = Math.round((total / totalCases) * 100);
			failureLines.push(`\n### ${name} — ${total}/${totalCases} failed (${pct}%)`);

			if (hasAnyEvidence) {
				const capped = cases.filter((c) => c.hasEvidence).slice(0, MAX_CASES_IN_PROMPT);
				for (const c of capped) {
					failureLines.push(formatCaseWithEvidence(c));
				}
				const remaining = total - capped.length;
				if (remaining > 0) {
					failureLines.push(`  _(${remaining} more failing cases not shown)_`);
				}
			} else {
				if (category === 'categorization') {
					failureLines.push(
						`The workflow produced the wrong category/label for ${total} out of ${totalCases} inputs. ` +
							'Look at the classification logic and system prompt to improve accuracy.',
					);
				} else if (category === 'aiBased') {
					failureLines.push(
						`${total} responses scored 3 or below on a 1–5 quality scale. ` +
							'The system prompt likely needs more detailed instructions, examples, or constraints.',
					);
				} else {
					failureLines.push(
						`${total} cases scored below the target. Review the processing logic for this metric.`,
					);
				}
			}
		}

		sections.push(failureLines.join('\n'));
	}

	sections.push(
		[
			'## Instructions',
			'Improve this workflow to address the failures above. You may:',
			'- Rewrite or expand the AI Agent system prompt with better instructions and examples',
			'- Change model parameters (temperature, max tokens) or switch to a stronger model',
			'- Add pre-processing nodes to clean or enrich the input before the agent',
			'- Add post-processing nodes to validate or fix the agent output',
			'- Add tools to give the agent access to more context',
			'',
			'Do NOT modify any Evaluation or Evaluation Trigger nodes.',
		].join('\n'),
	);

	return sections.join('\n\n');
}
