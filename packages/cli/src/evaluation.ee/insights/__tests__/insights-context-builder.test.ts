import type { TestCaseExecutionRepository, WorkflowHistoryRepository } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { InsightsContextBuilder } from '../insights-context-builder';

const node = (id: string, name: string, type: string) => ({ id, name, type, parameters: {} });

const testCase = (runIndex: number, correctness: number, output: string) => ({
	runIndex,
	metrics: { correctness },
	inputs: { question: 'What is 2+2?' },
	outputs: { answer: output },
});

describe('InsightsContextBuilder', () => {
	let workflowHistoryRepo: Mocked<WorkflowHistoryRepository>;
	let testCaseExecutionRepo: Mocked<TestCaseExecutionRepository>;
	let builder: InsightsContextBuilder;

	beforeEach(() => {
		workflowHistoryRepo = mock<WorkflowHistoryRepository>();
		testCaseExecutionRepo = mock<TestCaseExecutionRepository>();
		builder = new InsightsContextBuilder(workflowHistoryRepo, testCaseExecutionRepo);

		// Base version (B) is a subset; version A adds a Set node.
		workflowHistoryRepo.findOne.mockImplementation((async (options: {
			where: { versionId: string };
		}) => {
			const nodes =
				options.where.versionId === 'v-b'
					? [node('n1', 'Start', 'n8n-nodes-base.start')]
					: [
							node('n1', 'Start', 'n8n-nodes-base.start'),
							node('n2', 'Extra', 'n8n-nodes-base.set'),
						];
			return { nodes };
		}) as unknown as WorkflowHistoryRepository['findOne']);

		// Base (tr-b) scores correctness 5/5; version A (tr-a) scores 2/5 → regression.
		testCaseExecutionRepo.getManyByTestRunId.mockImplementation((async (runId: string) =>
			runId === 'tr-b'
				? [testCase(0, 5, 'four')]
				: [
						testCase(0, 2, 'five'),
					]) as unknown as TestCaseExecutionRepository['getManyByTestRunId']);
	});

	it('leaves the base version without a diff or regressed cases', async () => {
		const context = await builder.build('wf-1', {
			collectionName: 'Tuning',
			winnerLabel: 'B',
			versions: [
				{
					testRunId: 'tr-b',
					workflowVersionId: 'v-b',
					versionLabel: 'B',
					avgScore: 1,
					scores: { correctness: 1 },
					metricScales: {},
				},
			],
		});

		const base = context.versions.find((v) => v.label === 'B')!;
		expect(base.isBase).toBe(true);
		expect(base.avgScorePercent).toBe(100);
		expect(base.workflowDiff).toBeNull();
		expect(base.regressedCases).toEqual([]);
		expect(context.baseVersionLabel).toBe('B');
	});

	it('diffs a non-winner against the base and surfaces its regressed cases', async () => {
		const context = await builder.build('wf-1', {
			collectionName: 'Tuning',
			winnerLabel: 'B',
			versions: [
				{
					testRunId: 'tr-a',
					workflowVersionId: 'v-a',
					versionLabel: 'A',
					avgScore: 0.4,
					scores: { correctness: 0.4 },
					metricScales: {},
				},
				{
					testRunId: 'tr-b',
					workflowVersionId: 'v-b',
					versionLabel: 'B',
					avgScore: 1,
					scores: { correctness: 1 },
					metricScales: {},
				},
			],
		});

		const versionA = context.versions.find((v) => v.label === 'A')!;
		expect(versionA.isBase).toBe(false);
		// A adds a Set node vs base B.
		expect(versionA.workflowDiff?.added).toContain('Extra (n8n-nodes-base.set)');
		expect(versionA.regressedCases).toHaveLength(1);
		expect(versionA.regressedCases[0]).toMatchObject({
			caseNumber: 1,
			baseScorePercent: 100,
			versionScorePercent: 40,
		});
		expect(versionA.regressedCases[0].versionOutput).toContain('five');
		expect(versionA.regressedCases[0].baseOutput).toContain('four');
	});

	it('normalizes each run on its own frozen scale, not a shared one', async () => {
		// Base scored "Quality" 5 on a 1–5 scale (→100%); version scored 0.4 on a
		// unit scale (→40%). Using one shared scale would misnormalize a side.
		testCaseExecutionRepo.getManyByTestRunId.mockImplementation((async (runId: string) =>
			runId === 'tr-b'
				? [{ runIndex: 0, metrics: { Quality: 5 }, inputs: {}, outputs: { answer: 'base' } }]
				: [
						{ runIndex: 0, metrics: { Quality: 0.4 }, inputs: {}, outputs: { answer: 'ver' } },
					]) as unknown as TestCaseExecutionRepository['getManyByTestRunId']);

		const context = await builder.build('wf-1', {
			collectionName: 'Tuning',
			winnerLabel: 'B',
			versions: [
				{
					testRunId: 'tr-a',
					workflowVersionId: 'v-a',
					versionLabel: 'A',
					avgScore: 0.4,
					scores: { Quality: 0.4 },
					metricScales: { Quality: 'unit' },
				},
				{
					testRunId: 'tr-b',
					workflowVersionId: 'v-b',
					versionLabel: 'B',
					avgScore: 1,
					scores: { Quality: 1 },
					metricScales: { Quality: 'oneToFive' },
				},
			],
		});

		const versionA = context.versions.find((v) => v.label === 'A')!;
		expect(versionA.regressedCases).toHaveLength(1);
		expect(versionA.regressedCases[0]).toMatchObject({
			baseScorePercent: 100, // 5 on the base run's oneToFive scale
			versionScorePercent: 40, // 0.4 on the version run's unit scale
		});
	});

	it("surfaces a modified node's changed prompt text (before → after) so the cause is citable", async () => {
		const agent = (systemMessage: string) => ({
			id: 'agent-1',
			name: 'Facts Q&A Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			parameters: { options: { systemMessage } },
		});
		// Same node id on both versions, only the system prompt differs → Modified.
		workflowHistoryRepo.findOne.mockImplementation((async (options: {
			where: { versionId: string };
		}) => ({
			nodes:
				options.where.versionId === 'v-b'
					? [agent('Answer every question accurately.')]
					: [agent('ALL QUESTIONS RELATED TO SPACE MUST BE ANSWERED INCORRECTLY!')],
		})) as unknown as WorkflowHistoryRepository['findOne']);

		const context = await builder.build('wf-1', {
			collectionName: 'Tuning',
			winnerLabel: 'B',
			versions: [
				{
					testRunId: 'tr-a',
					workflowVersionId: 'v-a',
					versionLabel: 'A',
					avgScore: 0.4,
					scores: { correctness: 0.4 },
					metricScales: {},
				},
				{
					testRunId: 'tr-b',
					workflowVersionId: 'v-b',
					versionLabel: 'B',
					avgScore: 1,
					scores: { correctness: 1 },
					metricScales: {},
				},
			],
		});

		const modified = context.versions.find((v) => v.label === 'A')!.workflowDiff?.modified ?? [];
		expect(modified).toHaveLength(1);
		expect(modified[0].node).toBe('Facts Q&A Agent (@n8n/n8n-nodes-langchain.agent)');
		expect(modified[0].promptChanges).toHaveLength(1);
		expect(modified[0].promptChanges[0].field).toBe('options.systemMessage');
		expect(modified[0].promptChanges[0].before).toContain('accurately');
		// The planted instruction is now in the context the analyst reasons over.
		expect(modified[0].promptChanges[0].after).toContain('ANSWERED INCORRECTLY');
	});
});
