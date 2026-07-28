import { existsSync, mkdtempSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { writeRunDebugReport } from '../report/run-debug-report';
import { writeWorkflowReport } from '../report/workflow-report';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// Pins artifact PLACEMENT for the lang-tracer dispatcher (lang-tracer
// `packages/dispatcher/src/lib/runner.ts`): it runs several concurrent eval
// children against ONE n8n checkout in one container — each child gets its own
// `--output-dir`, and relies on that flag covering EVERY artifact the run
// writes, not just `eval-results.json`. The HTML reports use stable filenames
// (`workflow-eval-report.html`, `workflow-eval-llm-debug.html`), so a writer
// that ignores `--output-dir` and falls back to the package-level `.data`
// directory silently lets concurrent runs clobber each other's reports.
// The no-arg default must stay `.data` for local dev.

const DEFAULT_REPORT_DIR = path.join(__dirname, '..', '..', '.data');

const TEST_CASE: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'Build a Slack notifier' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [{ name: 's', description: 'd', dataSetup: '', successCriteria: 'ok' }],
	datasets: ['full'],
};

const RESULTS: WorkflowTestCaseResult[] = [
	{
		testCase: TEST_CASE,
		workflowBuildSuccess: true,
		executionScenarioResults: [],
		fileSlug: 'slack-notifier',
	},
];

function freshOutputDir(): string {
	return mkdtempSync(path.join(tmpdir(), 'eval-artifact-output-dir-'));
}

describe('eval report artifacts — --output-dir contract', () => {
	describe('writeWorkflowReport', () => {
		it('writes the timestamped and stable reports into the given outputDir', () => {
			const outputDir = freshOutputDir();

			const reportPath = writeWorkflowReport(RESULTS, outputDir);

			expect(path.dirname(reportPath)).toBe(outputDir);
			expect(existsSync(reportPath)).toBe(true);
			expect(existsSync(path.join(outputDir, 'workflow-eval-report.html'))).toBe(true);
		});

		it('creates the outputDir when it does not exist yet', () => {
			const outputDir = path.join(freshOutputDir(), 'nested', 'run-1');

			const reportPath = writeWorkflowReport(RESULTS, outputDir);

			expect(path.dirname(reportPath)).toBe(outputDir);
			expect(readdirSync(outputDir)).toContain('workflow-eval-report.html');
		});

		it('falls back to the package .data directory when no outputDir is given', () => {
			const reportPath = writeWorkflowReport(RESULTS);

			expect(path.dirname(reportPath)).toBe(DEFAULT_REPORT_DIR);
			expect(existsSync(path.join(DEFAULT_REPORT_DIR, 'workflow-eval-report.html'))).toBe(true);
		});
	});

	describe('writeRunDebugReport', () => {
		it('writes the timestamped and stable reports into the given outputDir', () => {
			const outputDir = freshOutputDir();

			const reportPath = writeRunDebugReport(RESULTS, outputDir);

			expect(path.dirname(reportPath)).toBe(outputDir);
			expect(existsSync(reportPath)).toBe(true);
			expect(existsSync(path.join(outputDir, 'workflow-eval-llm-debug.html'))).toBe(true);
		});

		it('creates the outputDir when it does not exist yet', () => {
			const outputDir = path.join(freshOutputDir(), 'nested', 'run-2');

			const reportPath = writeRunDebugReport(RESULTS, outputDir);

			expect(path.dirname(reportPath)).toBe(outputDir);
			expect(readdirSync(outputDir)).toContain('workflow-eval-llm-debug.html');
		});

		it('falls back to the package .data directory when no outputDir is given', () => {
			const reportPath = writeRunDebugReport(RESULTS);

			expect(path.dirname(reportPath)).toBe(DEFAULT_REPORT_DIR);
			expect(existsSync(path.join(DEFAULT_REPORT_DIR, 'workflow-eval-llm-debug.html'))).toBe(true);
		});
	});

	it('gives concurrent runs their own copy of the stable-named reports', () => {
		const dirA = freshOutputDir();
		const dirB = freshOutputDir();

		writeWorkflowReport(RESULTS, dirA);
		writeRunDebugReport(RESULTS, dirA);
		writeWorkflowReport(RESULTS, dirB);
		writeRunDebugReport(RESULTS, dirB);

		for (const dir of [dirA, dirB]) {
			const names = readdirSync(dir);
			expect(names).toContain('workflow-eval-report.html');
			expect(names).toContain('workflow-eval-llm-debug.html');
		}
	});
});
