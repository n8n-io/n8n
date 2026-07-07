#!/usr/bin/env node
// Build n8n workflows for each test case using `claude -p` driving an MCP
// server, then write a manifest the eval CLI's --prebuilt-workflows flag
// accepts. Validates the produced manifest against the same Zod schema the
// loader uses, so shape regressions surface here rather than at eval time.

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { z } from 'zod';

import {
	buildWorkflowViaMcp,
	stageMcpConfigFromClaudeJson,
	uniqueProjectScopes,
} from './mcp-builder';
import { createLogger } from '../harness/logger';
import { prebuiltManifestSchema, type PrebuiltManifest } from '../harness/prebuilt-workflows';
import { runWithConcurrency } from '../harness/runner';
import { ConversationTurnSchema, DEFAULT_DATASETS } from '../harness/schema';
import { loadTestCasesFromLangTracer } from '../langtracer/provider';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
	iterations: number;
	concurrency: number;
	outputDir: string;
	manifestPath: string;
	statsPath: string;
	logDir: string;
	mcpServerName: string;
	builder: string;
	model: string;
	append: boolean;
	slugs: string[];
	maxAttempts: number;
	mcpTimeoutMs: number;
	/** When set, only build slugs whose `datasets` array includes this tier (mirrors eval --tier). */
	tier?: string;
	/** When set, instructs the model to pass `projectId` to
	 *  `create_workflow_from_code` so workflows land in a specific n8n project.
	 *  When unset, workflows go to the user's personal project (MCP default). */
	projectId?: string;
	/** Override the test-case JSON directory. Defaults to the n8n repo's
	 *  evaluations/data/workflows/, derived via `git rev-parse`. Setting this
	 *  lets the script run from outside the n8n repo. */
	workflowDir?: string;
	/** Working directory for the build subprocess. Lets the user spawn the
	 *  builder from a project where they have skills/settings configured,
	 *  independent of where the script itself runs. */
	buildCwd?: string;
	/** Test-case source: `disk` (default, from --workflow-dir) or `langtracer` (a suite over MCP). */
	source: 'disk' | 'langtracer';
	/** lang-tracer suite slug when `--source langtracer`. */
	suite?: string;
}

const HELP = `
Build n8n workflows for each test case using \`claude -p\` driving an MCP
server, write a manifest the eval CLI's --prebuilt-workflows flag accepts,
plus a build-stats sidecar with per-cohort cost/turn/duration aggregates.

Prerequisites:
  * \`claude\` CLI installed (https://docs.claude.com/claude-code)
  * ~/.claude.json has the MCP server block configured (project-scoped
    under .projects[<repo-root>].mcpServers[<name>] or globally under
    .mcpServers[<name>]). Default name: "n8n-mcp (instance)" — override
    with --mcp-server.
  * n8n instance reachable at the URL the MCP block points at.

Usage:
  pnpm eval:build-mcp-manifest [flags] [slug ...]

Flags:
  -n, --iterations N      Builds per slug (default: 1).
  -j, --concurrency N     Parallel builds (default: 1).
  --append                Append to existing manifest instead of overwriting.
  --output-dir DIR        Where manifest + logs go (default: cwd).
  --manifest PATH         Override manifest path (default: <output-dir>/manifest.json).
  --log-dir DIR           Override log dir (default: <output-dir>/logs).
  --mcp-server NAME       MCP server name in ~/.claude.json (default: "n8n-mcp (instance)").
  --builder LABEL         Free-form label written into manifest-stats.json
                          (default: "instance-mcp").
  --model MODEL           Anthropic model id passed to claude -p
                          (default: claude-sonnet-4-6).
  --max-attempts N        Retries per build when WORKFLOW_ID is missing (default: 3).
  --mcp-timeout-ms N      MCP_TIMEOUT env passed to claude -p (default: 120000).
  --project-id ID         n8n project to create the workflows in. Defaults
                          to the user's personal project.
  --source SRC            Test-case source: disk (default) or langtracer.
  --suite SLUG            lang-tracer suite slug (required with --source langtracer).
  --tier TIER             Only build test cases whose datasets array includes
                          TIER (e.g. "mcp"). Mirrors eval:instance-ai --tier.
                          Applies to discovered and positional slugs alike.
  --workflow-dir DIR      Test-case JSON directory. Defaults to
                          evaluations/data/workflows/ derived from the n8n
                          repo (via git). Set this to run from outside the
                          n8n repo.
  --build-cwd DIR         Working directory for the build subprocess.
                          Defaults to the n8n repo root when running inside
                          it, otherwise process.cwd(). Set this to spawn
                          the builder from a project where you have skills /
                          settings configured.
  -h, --help              Show this help.

Positional args:
  slug ...                Test case slugs to build (filenames in
                          evaluations/data/workflows/ without .json).
                          If omitted, every slug in that directory is built.
`;

interface ParseResult {
	helpRequested: boolean;
	args?: CliArgs;
}

function parseArgs(argv: string[]): ParseResult {
	const result: CliArgs = {
		iterations: 1,
		concurrency: 1,
		outputDir: process.cwd(),
		manifestPath: '',
		statsPath: '',
		logDir: '',
		mcpServerName: 'n8n-mcp (instance)',
		builder: 'instance-mcp',
		model: 'claude-sonnet-4-6',
		append: false,
		slugs: [],
		maxAttempts: 3,
		mcpTimeoutMs: 120_000,
		source: 'disk',
	};

	let i = 0;
	while (i < argv.length) {
		const arg = argv[i];
		switch (arg) {
			case '-n':
			case '--iterations':
				result.iterations = parseIntArg(argv, i, arg);
				i += 2;
				break;
			case '-j':
			case '--concurrency':
				result.concurrency = parseIntArg(argv, i, arg);
				i += 2;
				break;
			case '--append':
				result.append = true;
				i += 1;
				break;
			case '--output-dir':
				result.outputDir = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--manifest':
				result.manifestPath = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--log-dir':
				result.logDir = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--mcp-server':
				result.mcpServerName = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--builder':
				result.builder = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--model':
				result.model = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--max-attempts':
				result.maxAttempts = parseIntArg(argv, i, arg);
				i += 2;
				break;
			case '--mcp-timeout-ms':
				result.mcpTimeoutMs = parseIntArg(argv, i, arg);
				i += 2;
				break;
			case '--project-id':
				result.projectId = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--tier':
				result.tier = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--workflow-dir':
				result.workflowDir = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--build-cwd':
				result.buildCwd = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--source': {
				const value = nextArg(argv, i, arg);
				if (value !== 'disk' && value !== 'langtracer') {
					throw new Error('--source must be "disk" or "langtracer"');
				}
				result.source = value;
				i += 2;
				break;
			}
			case '--suite':
				result.suite = nextArg(argv, i, arg);
				i += 2;
				break;
			case '-h':
			case '--help':
				return { helpRequested: true };
			default:
				if (arg.startsWith('--')) {
					throw new Error(`Unknown flag: ${arg.split('=', 1)[0]} (use --help)`);
				}
				result.slugs.push(arg);
				i += 1;
				break;
		}
	}

	if (result.iterations < 1) throw new Error('--iterations must be >= 1');
	if (result.concurrency < 1) throw new Error('--concurrency must be >= 1');
	if (result.maxAttempts < 1) throw new Error('--max-attempts must be >= 1');
	if (result.source === 'langtracer' && !result.suite) {
		throw new Error('--source langtracer requires --suite <slug>');
	}

	mkdirSync(result.outputDir, { recursive: true });
	if (!result.manifestPath) result.manifestPath = join(result.outputDir, 'manifest.json');
	if (!result.logDir) result.logDir = join(result.outputDir, 'logs');
	const base = result.manifestPath.replace(/\.json$/, '');
	result.statsPath = `${base}-stats.json`;
	mkdirSync(result.logDir, { recursive: true });

	return { helpRequested: false, args: result };
}

function readJson(path: string, label: string): unknown {
	const content = readFileSync(path, 'utf-8');
	try {
		return JSON.parse(content);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse ${label} at ${path}: ${msg}`);
	}
}

function nextArg(argv: string[], i: number, flag: string): string {
	const value = argv[i + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${flag}`);
	}
	return value;
}

function parseIntArg(argv: string[], i: number, flag: string): number {
	const raw = nextArg(argv, i, flag);
	const parsed = parseInt(raw, 10);
	if (Number.isNaN(parsed)) throw new Error(`Invalid integer for ${flag}`);
	return parsed;
}

// ---------------------------------------------------------------------------
// Build outcome + test-case prompt source
//
// The `claude -p` invocation, MCP config staging, prompt flattening, and
// workflow-id extraction live in ./mcp-builder (shared with the fused
// --build-via-mcp eval path). This file owns only the manifest/stats concerns.
// ---------------------------------------------------------------------------

interface BuildOutcome {
	slug: string;
	iteration: number;
	workflowId: string | null;
	cost: number;
	turns: number;
	durationMs: number;
}

/** Canonical conversation-turn type (role enum + normalized text), reused from
 *  the harness schema instead of a looser inline `{ role: string; text }`. */
type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

const testCaseSchema = z
	.object({
		// Reuse the canonical turn schema so `role` is the exact 'user' | 'assistant'
		// enum and the array (multi-line) `text` form is normalized as in the harness.
		conversation: z.array(ConversationTurnSchema).min(1),
	})
	.passthrough();

async function buildOne(
	slug: string,
	iteration: number,
	args: CliArgs,
	mcpConfigPath: string,
	conversation: ConversationTurn[],
): Promise<BuildOutcome> {
	const result = await buildWorkflowViaMcp({
		conversation,
		slug,
		iteration,
		mcpConfigPath,
		logDir: args.logDir,
		settings: {
			serverName: args.mcpServerName,
			model: args.model,
			maxAttempts: args.maxAttempts,
			mcpTimeoutMs: args.mcpTimeoutMs,
			buildCwd: args.buildCwd,
			projectId: args.projectId,
		},
	});

	return {
		slug,
		iteration,
		workflowId: result.workflowId,
		cost: result.cost,
		turns: result.turns,
		durationMs: result.durationMs,
	};
}

// ---------------------------------------------------------------------------
// Manifest + stats output
// ---------------------------------------------------------------------------

function readExistingWorkflows(manifestPath: string): Record<string, string[]> {
	if (!existsSync(manifestPath)) return {};
	// The file exists — it must be parseable. Silently treating a malformed
	// manifest as empty would clobber accumulated entries on the next write
	// (especially destructive with --append, where the entire prior corpus
	// could be lost). Force the user to fix or remove the file first.
	try {
		return { ...prebuiltManifestSchema.parse(readJson(manifestPath, 'existing manifest')) };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Existing manifest at ${manifestPath} is malformed; remove or fix it before re-running:\n  ${msg}`,
		);
	}
}

function writeManifest(args: CliArgs, results: BuildOutcome[]): void {
	const workflows = readExistingWorkflows(args.manifestPath);

	if (!args.append) {
		// Without --append, clear entries for slugs we just rebuilt; preserve
		// other slugs in the existing manifest.
		for (const slug of new Set(results.map((r) => r.slug))) {
			delete workflows[slug];
		}
	}

	for (const r of results) {
		if (!r.workflowId) continue;
		if (!workflows[r.slug]) workflows[r.slug] = [];
		workflows[r.slug].push(r.workflowId);
	}

	const manifest: PrebuiltManifest = prebuiltManifestSchema.parse(workflows);

	writeFileSync(args.manifestPath, JSON.stringify(manifest, null, 2));
}

function writeStats(args: CliArgs, results: BuildOutcome[]): void {
	const successful = results.filter((r) => r.workflowId !== null);
	const total = successful.length;
	const sum = (selector: (r: BuildOutcome) => number) =>
		successful.reduce((s, r) => s + selector(r), 0);

	const stats = {
		version: 1 as const,
		builder: args.builder,
		summary: {
			totalBuilds: total,
			avgTurns: total > 0 ? sum((r) => r.turns) / total : 0,
			avgCostUSD: total > 0 ? sum((r) => r.cost) / total : 0,
			totalCostUSD: sum((r) => r.cost),
			avgDurationMs: total > 0 ? sum((r) => r.durationMs) / total : 0,
		},
		builds: successful.map((r) => ({
			slug: r.slug,
			iteration: r.iteration,
			workflowId: r.workflowId,
			turns: r.turns,
			costUSD: r.cost,
			durationMs: r.durationMs,
		})),
	};

	writeFileSync(args.statsPath, JSON.stringify(stats, null, 2));
}

function discoverSlugs(workflowDir: string): string[] {
	if (!existsSync(workflowDir)) {
		throw new Error(`Workflow directory not found: ${workflowDir}`);
	}
	return readdirSync(workflowDir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => basename(f, '.json'))
		.sort();
}

const tierDatasetsSchema = z.object({ datasets: z.array(z.string()).optional() }).passthrough();

/** A test case's `datasets`, defaulting to the shared eval default when absent — mirrors the loader schema. */
function readDatasets(workflowDir: string, slug: string): string[] {
	const file = join(workflowDir, `${slug}.json`);
	if (!existsSync(file)) return [];
	try {
		return (
			tierDatasetsSchema.parse(readJson(file, `test case ${slug}`)).datasets ?? DEFAULT_DATASETS
		);
	} catch {
		return DEFAULT_DATASETS;
	}
}

/** Keep only slugs whose `datasets` includes `tier`, mirroring eval:instance-ai --tier semantics. */
function filterSlugsByTier(workflowDir: string, slugs: string[], tier: string): string[] {
	return slugs.filter((slug) => readDatasets(workflowDir, slug).includes(tier));
}

async function main(): Promise<void> {
	const parsed = parseArgs(process.argv.slice(2));
	if (parsed.helpRequested) {
		process.stdout.write(HELP);
		return;
	}
	const args = parsed.args!;

	try {
		execSync('command -v claude', { stdio: 'ignore' });
	} catch {
		throw new Error('claude not on PATH');
	}

	// Repo root scopes the staged MCP config (cwd fallback). Best-effort: the disk
	// source resolves/validates its own test-case dir below; langtracer pulls cases
	// over MCP, so it needs no repo at all and can run outside the n8n checkout.
	let repoRoot: string | undefined;
	try {
		repoRoot = execSync('git rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		repoRoot = undefined;
	}

	if (args.buildCwd && !existsSync(args.buildCwd)) {
		throw new Error(`--build-cwd directory does not exist: ${args.buildCwd}`);
	}

	// Resolve slug -> conversation from the chosen source. Disk reads --workflow-dir
	// (positional slugs or discovered), langtracer pulls a suite over MCP; both feed
	// the same buildOne prompt.
	const casesBySlug = new Map<string, ConversationTurn[]>();
	if (args.source === 'langtracer') {
		const suite = args.suite;
		if (!suite) throw new Error('--source langtracer requires --suite <slug>');
		const cases = await loadTestCasesFromLangTracer({
			suite,
			tier: args.tier,
			logger: createLogger(false),
		});
		for (const { fileSlug, testCase } of cases)
			casesBySlug.set(fileSlug, testCase.conversation ?? []);
		if (args.slugs.length > 0) {
			const requested = new Set(args.slugs);
			for (const slug of [...casesBySlug.keys()]) {
				if (!requested.has(slug)) casesBySlug.delete(slug);
			}
		}
	} else {
		const workflowDir =
			args.workflowDir ??
			(repoRoot
				? join(repoRoot, 'packages/@n8n/instance-ai/evaluations/data/workflows')
				: undefined);
		if (!workflowDir) {
			throw new Error(
				'Disk source needs the n8n repo (run from inside it) or --workflow-dir; or use --source langtracer.',
			);
		}
		let slugs = args.slugs.length > 0 ? args.slugs : discoverSlugs(workflowDir);
		if (args.tier) slugs = filterSlugsByTier(workflowDir, slugs, args.tier);
		for (const slug of slugs) {
			const file = join(workflowDir, `${slug}.json`);
			if (!existsSync(file)) {
				console.log(`  [${slug}] skip: scenario file missing`);
				continue;
			}
			casesBySlug.set(slug, testCaseSchema.parse(readJson(file, `test case ${slug}`)).conversation);
		}
	}
	// Drop cases with no user turn to build from (e.g. seedThread-only).
	for (const [slug, conv] of [...casesBySlug]) {
		if (!conv.some((t) => t.role === 'user' && t.text.trim().length > 0)) {
			console.log(`  [${slug}] skip: no user turn to build from`);
			casesBySlug.delete(slug);
		}
	}
	args.slugs = [...casesBySlug.keys()];
	if (args.slugs.length === 0) {
		throw new Error(
			args.tier ? `No scenarios match --tier "${args.tier}"` : 'No scenarios to build',
		);
	}

	const projectScopes = uniqueProjectScopes([
		args.buildCwd ? resolve(args.buildCwd) : undefined,
		repoRoot,
		repoRoot ? undefined : process.cwd(),
	]);
	const mcpConfigPath = stageMcpConfigFromClaudeJson(args.mcpServerName, projectScopes);
	process.on('exit', () => {
		try {
			unlinkSync(mcpConfigPath);
		} catch {
			// best-effort
		}
	});

	const tasks: Array<{ slug: string; iteration: number }> = [];
	for (const slug of args.slugs) {
		for (let i = 1; i <= args.iterations; i++) {
			tasks.push({ slug, iteration: i });
		}
	}

	console.log(
		`Building ${String(args.slugs.length)} scenario(s) × ${String(args.iterations)} iteration(s) = ${String(tasks.length)} workflow(s)`,
	);
	console.log(`MCP server:  ${args.mcpServerName}`);
	console.log(`Builder tag: ${args.builder}`);
	console.log(`Model:       ${args.model}`);
	console.log(`Concurrency: ${String(args.concurrency)}`);
	console.log(`Logs:        ${args.logDir}`);
	console.log(`Manifest:    ${args.manifestPath}`);
	console.log();

	const results = await runWithConcurrency(
		tasks,
		async (task) =>
			await buildOne(
				task.slug,
				task.iteration,
				args,
				mcpConfigPath,
				casesBySlug.get(task.slug) ?? [],
			),
		args.concurrency,
	);

	writeManifest(args, results);
	writeStats(args, results);

	console.log();
	console.log(`Manifest: ${args.manifestPath}`);
	console.log(`Stats:    ${args.statsPath}`);
	console.log(readFileSync(args.manifestPath, 'utf-8'));
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
