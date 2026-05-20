import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { EpisodicEvalLogEvent, EpisodicEvalScenarioResult } from './types';

export interface EpisodicEvalArtifacts {
	results: EpisodicEvalScenarioResult[];
	entries: unknown[];
	sources: unknown[];
	recalls: unknown[];
	answers: unknown[];
	scorecard: unknown;
	report: string;
	log: EpisodicEvalLogEvent[];
}

export async function writeEvalArtifacts(
	outputDir: string,
	artifacts: EpisodicEvalArtifacts,
): Promise<void> {
	await mkdir(outputDir, { recursive: true });
	await Promise.all([
		writeJson(outputDir, 'results.json', artifacts.results),
		writeJson(outputDir, 'entries.json', artifacts.entries),
		writeJson(outputDir, 'sources.json', artifacts.sources),
		writeJson(outputDir, 'recalls.json', artifacts.recalls),
		writeJson(outputDir, 'answers.json', artifacts.answers),
		writeJson(outputDir, 'scorecard.json', artifacts.scorecard),
		writeJson(outputDir, 'log.json', artifacts.log),
		writeFile(join(outputDir, 'report.md'), artifacts.report),
	]);
}

export function buildMarkdownReport(results: EpisodicEvalScenarioResult[]): string {
	const lines = [
		'# Episodic Memory Golden Eval',
		'',
		'| Scenario | Overall | Deterministic | Judge | Failures |',
		'| --- | ---: | ---: | ---: | ---: |',
		...results.map(
			(result) =>
				`| ${[
					result.scenarioName,
					formatScore(result.scorecard.overall),
					formatScore(result.scorecard.deterministic),
					result.scorecard.judge === undefined ? 'n/a' : formatScore(result.scorecard.judge),
					String(result.failures.length),
				].join(' | ')} |`,
		),
		'',
		'## Failure Taxonomy',
		'',
	];
	for (const result of results) {
		if (result.failures.length === 0) continue;
		lines.push(`### ${result.scenarioName}`, '');
		for (const failure of result.failures) {
			lines.push(`- ${failure.kind}: ${failure.message}`);
		}
		lines.push('');
	}
	return `${lines.join('\n')}\n`;
}

export function buildAggregateScorecard(results: EpisodicEvalScenarioResult[]) {
	return {
		overall: average(results.map((result) => result.scorecard.overall)),
		deterministic: average(results.map((result) => result.scorecard.deterministic)),
		judge: average(
			results.flatMap((result) =>
				result.scorecard.judge === undefined ? [] : [result.scorecard.judge],
			),
		),
		scenarios: results.map((result) => ({
			id: result.scenarioId,
			name: result.scenarioName,
			overall: result.scorecard.overall,
			deterministic: result.scorecard.deterministic,
			judge: result.scorecard.judge,
			failures: result.failures,
			metrics: result.scorecard.metrics,
		})),
	};
}

async function writeJson(outputDir: string, filename: string, value: unknown): Promise<void> {
	await writeFile(join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function formatScore(score: number): string {
	return score.toFixed(3);
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}
