import fs from 'fs';
import assert from 'node:assert/strict';
import path from 'path';
import { $, which, tmpfile } from 'zx';

import { buildTestReport, type K6Tag } from '@/test-execution/test-report';
import type { Scenario } from '@/types/scenario';
export type { K6Tag };

export type K6ExecutorOpts = {
	k6ExecutablePath: string;
	/** How many concurrent requests to make */
	vus: number;
	/** Test duration, e.g. 1m or 30s */
	duration: string;
	k6Out?: string;
	k6ApiToken?: string;
	n8nApiBaseUrl: string;
	tags?: K6Tag[];
	resultsWebhook?: {
		url: string;
		authHeader: string;
	};
};

export type K6RunOpts = {
	/** Name of the scenario run. Used e.g. when the run is reported to k6 cloud */
	scenarioRunName: string;
};

/**
 * Flag for the k6 CLI.
 * @example ['--duration', '1m']
 * @example ['--quiet']
 */
type K6CliFlag = [string | number] | [string, string | number];

/**
 * Executes test scenarios using k6
 */
export class K6Executor {
	/**
	 * This script is dynamically injected into the k6 test script to generate
	 * a summary report of the test execution.
	 */
	private readonly handleSummaryScript = `
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
export function handleSummary(data) {
	return {
		stdout: textSummary(data),
		'{{scenarioName}}.summary.json': JSON.stringify(data),
	};
}
`;

	constructor(private readonly opts: K6ExecutorOpts) {}

	async executeTestScenario(scenario: Scenario, { scenarioRunName }: K6RunOpts) {
		const augmentedTestScriptPath = this.augmentSummaryScript(scenario, scenarioRunName);
		const runDirPath = path.dirname(augmentedTestScriptPath);

		const flags: K6CliFlag[] = [
			['--quiet'],
			['--duration', this.opts.duration],
			['--vus', this.opts.vus],
		];

		if (this.opts.k6Out) {
			flags.push(['--out', this.opts.k6Out]);
		} else if (!this.opts.resultsWebhook && this.opts.k6ApiToken) {
			flags.push(['--out', 'cloud']);
		}

		const flattedFlags = flags.flat(2);

		const k6ExecutablePath = await this.resolveK6ExecutablePath();

		await $({
			cwd: runDirPath,
			env: {
				API_BASE_URL: this.opts.n8nApiBaseUrl,
				K6_CLOUD_TOKEN: this.opts.k6ApiToken,
			},
			stdio: 'inherit',
		})`${k6ExecutablePath} run ${flattedFlags} ${augmentedTestScriptPath}`;

		console.log('\n');

		if (this.opts.resultsWebhook) {
			const endOfTestSummary = this.loadEndOfTestSummary(runDirPath, scenarioRunName);

			const testReport = buildTestReport(scenario, endOfTestSummary, [
				...(this.opts.tags ?? []),
				{ name: 'Vus', value: this.opts.vus.toString() },
				{ name: 'Duration', value: this.opts.duration.toString() },
			]);

			await this.sendTestReport(testReport);
		}
	}

	async sendTestReport(testReport: unknown) {
		assert(this.opts.resultsWebhook);

		const response = await fetch(this.opts.resultsWebhook.url, {
			method: 'POST',
			body: JSON.stringify(testReport),
			headers: {
				Authorization: this.opts.resultsWebhook.authHeader,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			console.warn(`Failed to send test summary: ${response.status} ${await response.text()}`);
		}
	}

	/**
	 * Augments the test script with a summary script
	 *
	 * @returns Absolute path to the augmented test script
	 */
	private augmentSummaryScript(scenario: Scenario, scenarioRunName: string) {
		const fullTestScriptPath = path.join(scenario.scenarioDirPath, scenario.scriptPath);
		const testScript = fs.readFileSync(fullTestScriptPath, 'utf8');
		const summaryScript = this.handleSummaryScript.replace('{{scenarioName}}', scenarioRunName);

		const augmentedTestScript = `${testScript}\n\n${summaryScript}`;

		const tempFilePath = tmpfile(`${scenarioRunName}.js`, augmentedTestScript);

		return tempFilePath;
	}

	private loadEndOfTestSummary(dir: string, scenarioRunName: string): K6EndOfTestSummary {
		const summaryReportPath = path.join(dir, `${scenarioRunName}.summary.json`);
		const summaryReport = fs.readFileSync(summaryReportPath, 'utf8');

		try {
			return JSON.parse(summaryReport) as K6EndOfTestSummary;
		} catch (error) {
			throw new Error(`Failed to parse the summary report at ${summaryReportPath}`);
		}
	}

	/**
	 * @returns Resolved path to the k6 executable
	 */
	private async resolveK6ExecutablePath(): Promise<string> {
		const k6ExecutablePath = await which(this.opts.k6ExecutablePath, { nothrow: true });
		if (!k6ExecutablePath) {
			throw new Error(
				'Could not find k6 executable based on your `PATH`. Please ensure k6 is available in your system and add it to your `PATH` or specify the path to the k6 executable using the `K6_PATH` environment variable.',
			);
		}

		return k6ExecutablePath;
	}
}
