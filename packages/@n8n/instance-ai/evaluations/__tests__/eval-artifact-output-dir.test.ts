import { existsSync, mkdtempSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import type { EvalLogger } from '../harness/logger';
import { writeScenarioVerificationSnapshot } from '../harness/scenario-execution';
import { writeRunDebugReport } from '../report/run-debug-report';
import { writeWorkflowReport } from '../report/workflow-report';
import type { ChecklistResult, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// Pins artifact PLACEMENT for the lang-tracer dispatcher (lang-tracer
// `packages/dispatcher/src/lib/runner.ts`): it runs several concurrent eval
// children against ONE n8n checkout in one container — each child gets its own
// `--output-dir`, and relies on that flag covering EVERY artifact the run
// writes, not just `eval-results.json`. All three writers that used to hardcode
// the package-level `.data` directory are covered here. The HTML reports are
// the sharpest case: their filenames are stable
// (`workflow-eval-report.html`, `workflow-eval-llm-debug.html`), so ignoring
// `--output-dir` silently lets concurrent runs clobber each other's reports.
// The no-arg default must stay `.data` for local dev and for n8n's own eval CI,
// which uploads that path as a build artifact without passing `--output-dir`.

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

	describe('writeScenarioVerificationSnapshot', () => {
		const CHECKLIST_RESULT: ChecklistResult = {
			id: 1,
			pass: true,
			reasoning: 'digest arrived',
			strategy: 'llm',
		};

		/** Collects warnings so a swallowed write error reads differently from a
		 *  snapshot correctly written somewhere else. */
		function collectingLogger(): { logger: EvalLogger; warnings: string[] } {
			const warnings: string[] = [];
			const logger: EvalLogger = {
				info: () => {},
				verbose: () => {},
				success: () => {},
				warn: (msg: string) => warnings.push(msg),
				error: (msg: string) => warnings.push(msg),
				isVerbose: false,
			};
			return { logger, warnings };
		}

		async function writeSnapshot(testCaseName: string, outputDir?: string): Promise<string[]> {
			const { logger, warnings } = collectingLogger();
			await writeScenarioVerificationSnapshot({
				testCaseName,
				scenarioName: 'happy path',
				workflowId: 'wf-1',
				passed: true,
				result: CHECKLIST_RESULT,
				verificationResults: [CHECKLIST_RESULT],
				verifierAttempts: [],
				logger,
				outputDir,
			});
			expect(warnings).toEqual([]);
			return warnings;
		}

		it('writes the snapshot into the given outputDir', async () => {
			const outputDir = freshOutputDir();

			await writeSnapshot('daily digest', outputDir);

			const names = readdirSync(outputDir);
			expect(names).toHaveLength(1);
			expect(names[0]).toMatch(/^daily-digest_happy-path_.*\.json$/);
		});

		it('creates the outputDir when it does not exist yet', async () => {
			const outputDir = path.join(freshOutputDir(), 'nested', 'run-3');

			await writeSnapshot('daily digest', outputDir);

			expect(readdirSync(outputDir)).toHaveLength(1);
		});

		it('falls back to the package .data directory when no outputDir is given', async () => {
			const caseName = `fallback case ${String(Date.now())}`;

			await writeSnapshot(caseName);

			const slug = caseName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
			expect(readdirSync(DEFAULT_REPORT_DIR).some((n) => n.startsWith(`${slug}_`))).toBe(true);
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
