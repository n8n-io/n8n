import { TestCaseExecutionRepository, WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';

import { averageNormalizedScore } from './insights-scoring';

// Bounds that keep the prompt (and its token cost) from ballooning on large
// datasets / workflows. Per-case fields are truncated and both the case count
// and the node-name lists are capped.
const MAX_CASES_PER_VERSION = 3;
const MAX_FIELD_CHARS = 400;
const MAX_DIFF_NAMES = 15;
// Only the first this-many cases per run (ordered by runIndex) are fetched, so
// on larger datasets regression selection is limited to that window — a
// bounded, approximate "worst cases" rather than an exhaustive scan.
const CASE_FETCH_LIMIT = 100;

// One version as the service hands it to the builder — already scored, so the
// builder never re-derives scores or the winner (keeps them in lockstep).
export type InsightsContextVersion = {
	testRunId: string;
	workflowVersionId: string | null;
	versionLabel: string;
	avgScore: number | null;
	scores: Record<string, number>;
};

export type InsightsContextCase = {
	caseNumber: number;
	input: string;
	baseOutput: string;
	versionOutput: string;
	baseScorePercent: number | null;
	versionScorePercent: number | null;
};

export type InsightsContextWorkflowDiff = {
	added: string[];
	removed: string[];
	modified: string[];
};

export type InsightsContextVersionView = {
	label: string;
	isBase: boolean;
	avgScorePercent: number | null;
	metricScores: Record<string, number>;
	// Node diff vs the base version; null when either side has no snapshot.
	workflowDiff: InsightsContextWorkflowDiff | null;
	// Worst-regressed cases vs base (biggest score drop first).
	regressedCases: InsightsContextCase[];
};

export type InsightsContext = {
	collectionName: string;
	baseVersionLabel: string;
	versions: InsightsContextVersionView[];
};

const toPercent = (score: number | null): number | null =>
	score === null ? null : Math.round(score * 100);

const truncate = (value: string): string =>
	value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value;

const stringify = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
};

const scoresToPercent = (scores: Record<string, number>): Record<string, number> => {
	const out: Record<string, number> = {};
	for (const [key, value] of Object.entries(scores)) out[key] = Math.round(value * 100);
	return out;
};

/**
 * Assembles the per-version context the insights LLM reasons over: each
 * version's scores, its node diff vs the base (winner), and the handful of
 * cases where it regressed most. Everything is bounded/truncated up front so
 * the prompt stays within a predictable token budget.
 */
@Service()
export class InsightsContextBuilder {
	constructor(
		private readonly workflowHistoryRepo: WorkflowHistoryRepository,
		private readonly testCaseExecutionRepo: TestCaseExecutionRepository,
	) {}

	async build(
		workflowId: string,
		params: {
			collectionName: string;
			versions: InsightsContextVersion[];
			winnerLabel: string;
		},
	): Promise<InsightsContext> {
		const { collectionName, versions, winnerLabel } = params;
		const base = versions.find((version) => version.versionLabel === winnerLabel) ?? versions[0];

		const baseNodes = await this.loadNodes(workflowId, base.workflowVersionId);
		const baseCasesByIndex = await this.loadCasesByRunIndex(base.testRunId);

		const versionViews: InsightsContextVersionView[] = [];
		for (const version of versions) {
			const isBase = version.versionLabel === base.versionLabel;
			versionViews.push({
				label: version.versionLabel,
				isBase,
				avgScorePercent: toPercent(version.avgScore),
				metricScores: scoresToPercent(version.scores),
				workflowDiff: isBase ? null : await this.diff(workflowId, baseNodes, version),
				regressedCases: isBase ? [] : await this.regressedCases(baseCasesByIndex, version),
			});
		}

		return { collectionName, baseVersionLabel: base.versionLabel, versions: versionViews };
	}

	private async loadNodes(workflowId: string, versionId: string | null): Promise<INode[] | null> {
		if (!versionId) return null;
		const snapshot = await this.workflowHistoryRepo.findOne({ where: { workflowId, versionId } });
		return snapshot?.nodes ?? null;
	}

	private async loadCasesByRunIndex(
		testRunId: string,
	): Promise<Map<number, { metrics: Record<string, number | boolean> | null; outputs: unknown }>> {
		const cases = await this.testCaseExecutionRepo.getManyByTestRunId(testRunId, {
			take: CASE_FETCH_LIMIT,
		});
		const byIndex = new Map<
			number,
			{ metrics: Record<string, number | boolean> | null; outputs: unknown }
		>();
		cases.forEach((testCase, position) => {
			// `runIndex` is the stable per-case sequence; fall back to fetch order
			// so a run missing indices still aligns positionally.
			const key = testCase.runIndex ?? position;
			byIndex.set(key, { metrics: testCase.metrics, outputs: testCase.outputs });
		});
		return byIndex;
	}

	private async diff(
		workflowId: string,
		baseNodes: INode[] | null,
		version: InsightsContextVersion,
	): Promise<InsightsContextWorkflowDiff | null> {
		const versionNodes = await this.loadNodes(workflowId, version.workflowVersionId);
		if (!baseNodes || !versionNodes) return null;

		const diff = compareWorkflowsNodes<INode>(baseNodes, versionNodes);
		const added: string[] = [];
		const removed: string[] = [];
		const modified: string[] = [];
		for (const { status, node } of diff.values()) {
			const label = `${node.name} (${node.type})`;
			if (status === NodeDiffStatus.Added) added.push(label);
			else if (status === NodeDiffStatus.Deleted) removed.push(label);
			else if (status === NodeDiffStatus.Modified) modified.push(label);
		}
		return {
			added: added.slice(0, MAX_DIFF_NAMES),
			removed: removed.slice(0, MAX_DIFF_NAMES),
			modified: modified.slice(0, MAX_DIFF_NAMES),
		};
	}

	private async regressedCases(
		baseCasesByIndex: Map<
			number,
			{ metrics: Record<string, number | boolean> | null; outputs: unknown }
		>,
		version: InsightsContextVersion,
	): Promise<InsightsContextCase[]> {
		const versionCases = await this.testCaseExecutionRepo.getManyByTestRunId(version.testRunId, {
			take: CASE_FETCH_LIMIT,
		});

		const rows: Array<InsightsContextCase & { drop: number }> = [];
		versionCases.forEach((testCase, position) => {
			const key = testCase.runIndex ?? position;
			const baseCase = baseCasesByIndex.get(key);
			const baseScore = averageNormalizedScore(baseCase?.metrics);
			const versionScore = averageNormalizedScore(testCase.metrics);
			// Only rank cases where both sides scored and the version did worse.
			if (baseScore === null || versionScore === null) return;
			const drop = baseScore - versionScore;
			if (drop <= 0) return;
			rows.push({
				drop,
				caseNumber: key + 1,
				input: truncate(stringify(testCase.inputs)),
				baseOutput: truncate(stringify(baseCase?.outputs)),
				versionOutput: truncate(stringify(testCase.outputs)),
				baseScorePercent: toPercent(baseScore),
				versionScorePercent: toPercent(versionScore),
			});
		});

		return rows
			.sort((a, b) => b.drop - a.drop)
			.slice(0, MAX_CASES_PER_VERSION)
			.map(({ drop: _drop, ...rest }) => rest);
	}
}
