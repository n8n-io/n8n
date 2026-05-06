#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Computer-use eval CLI
//
// Discovers scenario JSON files under evaluations/computer-use/data/, runs
// them sequentially against a local n8n instance, prints a summary, and
// exits non-zero when any scenario fails. Designed for the prompt-tuning
// inner loop — fast feedback, no LangSmith dependency.
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

import { ensureDaemon } from './daemon';
import { formatTokens } from './formatting';
import { renderHtml } from './report-html';
import { runScenario } from './runner';
import type { RunManifest, RunReport, Scenario, ScenarioResult } from './types';
import { N8nClient } from '../clients/n8n-client';
import { createLogger } from '../harness/logger';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface CliArgs {
	baseUrl: string;
	email?: string;
	password?: string;
	verbose: boolean;
	filter?: string;
	timeoutMs: number;
	outputDir: string;
	html: boolean;
	autoStartDaemon: boolean;
	daemonSandboxDir?: string;
	usePublishedDaemon: boolean;
	keepData: boolean;
}

/** Defaults to the instance-ai package root so artifacts always land in the
 *  same gitignored spot regardless of cwd. Override via --output-dir. */
const DEFAULT_OUTPUT_DIR = resolve(__dirname, '../..');

const argsSchema = z.object({
	baseUrl: z.string().url().default('http://localhost:5678'),
	email: z.string().optional(),
	password: z.string().optional(),
	verbose: z.boolean().default(false),
	filter: z.string().optional(),
	timeoutMs: z.number().int().positive().default(600_000),
	outputDir: z.string().default(DEFAULT_OUTPUT_DIR),
	html: z.boolean().default(false),
	autoStartDaemon: z.boolean().default(true),
	daemonSandboxDir: z.string().optional(),
	usePublishedDaemon: z.boolean().default(false),
	keepData: z.boolean().default(false),
});

function parseArgs(argv: string[]): CliArgs {
	const raw: Record<string, unknown> = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--base-url':
				raw.baseUrl = next(argv, i++, arg);
				break;
			case '--email':
				raw.email = next(argv, i++, arg);
				break;
			case '--password':
				raw.password = next(argv, i++, arg);
				break;
			case '--verbose':
				raw.verbose = true;
				break;
			case '--filter':
				raw.filter = next(argv, i++, arg);
				break;
			case '--timeout-ms':
				raw.timeoutMs = parseInt(next(argv, i++, arg), 10);
				break;
			case '--output-dir':
				raw.outputDir = next(argv, i++, arg);
				break;
			case '--html':
				raw.html = true;
				break;
			case '--no-auto-start-daemon':
				raw.autoStartDaemon = false;
				break;
			case '--daemon-sandbox-dir':
				raw.daemonSandboxDir = next(argv, i++, arg);
				break;
			case '--use-published-daemon':
				raw.usePublishedDaemon = true;
				break;
			case '--keep-data':
				raw.keepData = true;
				break;
			default:
				if (arg.startsWith('--')) {
					throw new Error(`Unknown flag: ${arg.split('=', 1)[0]}`);
				}
				throw new Error('Unexpected positional argument');
		}
	}

	return argsSchema.parse(raw);
}

function next(argv: string[], idx: number, flag: string): string {
	const value = argv[idx + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${flag}`);
	}
	return value;
}

// ---------------------------------------------------------------------------
// Scenario discovery
// ---------------------------------------------------------------------------

async function discoverScenarios(dataDir: string, filter?: string): Promise<Scenario[]> {
	const entries = await readdir(dataDir);
	const files = entries.filter((f) => f.endsWith('.json'));
	const scenarios: Scenario[] = [];

	for (const file of files) {
		const raw = await readFile(join(dataDir, file), 'utf-8');
		const parsed = jsonParse<Scenario>(raw, { errorMessage: `Invalid scenario JSON in ${file}` });
		if (filter && !parsed.id.includes(filter) && !file.includes(filter)) continue;
		scenarios.push(withDefaultGraders(parsed));
	}

	scenarios.sort((a, b) => a.id.localeCompare(b.id));
	return scenarios;
}

const BROWSER_BOOTSTRAP_TAG = 'requires:browser-bootstrap';

/**
 * Append default-on graders that should run regardless of what the scenario
 * JSON declared. If the scenario already includes a grader of the same type,
 * the explicit version wins (so authors can override defaults — e.g. set
 * `extraLiterals` for a literal that should never echo back, or raise
 * `maxErrors` for a flaky scenario).
 *
 * Defaults applied:
 * - `security.noSecretLeak` to every scenario.
 * - `trace.toolsMustNotError` to scenarios tagged `requires:browser-bootstrap` —
 *   browser tool errors usually mean the agent hit a timeout and silently gave
 *   up; nothing else in the suite catches that.
 */
function withDefaultGraders(scenario: Scenario): Scenario {
	const additions: Scenario['graders'] = [];

	if (!scenario.graders.some((g) => g.type === 'security.noSecretLeak')) {
		additions.push({ type: 'security.noSecretLeak' });
	}

	const isBrowserBootstrap = (scenario.tags ?? []).includes(BROWSER_BOOTSTRAP_TAG);
	if (isBrowserBootstrap && !scenario.graders.some((g) => g.type === 'trace.toolsMustNotError')) {
		additions.push({ type: 'trace.toolsMustNotError' });
	}

	if (additions.length === 0) return scenario;
	return { ...scenario, graders: [...scenario.graders, ...additions] };
}

// ---------------------------------------------------------------------------
// Run manifest — minimal provenance recorded at run start.
// ---------------------------------------------------------------------------

async function collectManifest(): Promise<RunManifest> {
	const repoRoot = resolve(__dirname, '../../../../..');
	const [gitRef, daemonVersion, n8nVersion] = await Promise.all([
		readGitRef(repoRoot),
		readPackageVersion(join(repoRoot, 'packages/@n8n/computer-use/package.json')),
		readPackageVersion(join(repoRoot, 'packages/cli/package.json')),
	]);
	return { gitRef, daemonVersion, n8nVersion };
}

async function readGitRef(cwd: string): Promise<string> {
	try {
		const { stdout: sha } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd });
		const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd });
		const dirty = status.trim().length > 0 ? '-dirty' : '';
		return sha.trim() + dirty;
	} catch {
		return 'unknown';
	}
}

async function readPackageVersion(packageJsonPath: string): Promise<string> {
	try {
		const raw = await readFile(packageJsonPath, 'utf-8');
		const parsed = jsonParse<{ version?: unknown }>(raw, {
			errorMessage: `Invalid package.json at ${packageJsonPath}`,
		});
		return typeof parsed.version === 'string' ? parsed.version : 'unknown';
	} catch {
		return 'unknown';
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	const root = __dirname;
	const dataDir = join(root, 'data');
	const fixturesDir = join(root, 'fixtures');
	const evalOutputDir = join(args.outputDir, '.eval-output');
	await mkdir(evalOutputDir, { recursive: true });

	const scenarios = await discoverScenarios(dataDir, args.filter);
	if (scenarios.length === 0) {
		logger.warn(
			`No scenarios found in ${dataDir}${args.filter ? ` matching "${args.filter}"` : ''}`,
		);
		process.exit(0);
	}

	logger.info(`Running ${String(scenarios.length)} scenario(s) against ${args.baseUrl}`);

	const client = new N8nClient(args.baseUrl);
	await client.login(args.email, args.password);

	const daemon = await ensureDaemon({
		client,
		baseUrl: args.baseUrl,
		logger,
		evalOutputDir,
		autoStart: args.autoStartDaemon,
		daemonSandboxDir: args.daemonSandboxDir,
		usePublishedDaemon: args.usePublishedDaemon,
	});
	logger.info(`Using daemon at ${daemon.directory}`);

	const manifest = await collectManifest();
	logger.info(
		`Manifest: git ${manifest.gitRef}, daemon ${manifest.daemonVersion}, n8n ${manifest.n8nVersion}`,
	);

	const startedAt = new Date().toISOString();
	const results: ScenarioResult[] = [];

	for (const scenario of scenarios) {
		const result = await runScenario({
			client,
			scenario,
			daemon,
			fixturesDir,
			logger,
			timeoutMs: args.timeoutMs,
			keepData: args.keepData,
		});
		results.push(result);
	}

	const finishedAt = new Date().toISOString();
	const passCount = results.filter((r) => r.pass).length;

	const report: RunReport = {
		manifest,
		startedAt,
		finishedAt,
		totalScenarios: results.length,
		passCount,
		results,
	};

	const reportPath = join(evalOutputDir, 'computer-use-eval-results.json');
	await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

	printSummary(report);
	logger.info(`Report written to ${reportPath}`);

	if (args.html) {
		const htmlPath = join(evalOutputDir, 'computer-use-eval-results.html');
		await writeFile(htmlPath, renderHtml(report), 'utf-8');
		logger.info(`HTML preview at ${htmlPath}`);
	}

	process.exit(passCount === results.length ? 0 : 1);
}

function printSummary(report: RunReport): void {
	console.log('');
	console.log('─'.repeat(70));
	console.log(
		`Computer-use eval — ${String(report.passCount)}/${String(report.totalScenarios)} passed`,
	);
	console.log('─'.repeat(70));
	for (const r of report.results) {
		const tag = r.pass ? 'PASS' : 'FAIL';
		console.log(
			`${tag}  ${r.scenario.id}  (${String(r.toolCallCount)} calls, ${String(Math.round(r.durationMs / 1000))}s, ${formatTokens(r.tokens.totalResultsEst)} result tokens est)`,
		);
		if (!r.pass) {
			if (r.error) {
				console.log(`      error: ${r.error}`);
			}
			for (const g of r.graderResults.filter((x) => !x.pass)) {
				console.log(`      ${g.grader.type}: ${g.reason}`);
			}
		}
		if (r.tokens.largestResultEst > 0) {
			const tool = r.tokens.largestResultToolName ?? 'unknown';
			console.log(
				`      biggest tool result: ${tool} ~${formatTokens(r.tokens.largestResultEst)} tokens (est)`,
			);
		}
	}
	console.log('─'.repeat(70));
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
	process.exit(2);
});
