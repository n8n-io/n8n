#!/usr/bin/env node
// Build n8n workflows for each test case using `claude -p` driving an MCP
// server, then write a manifest the eval CLI's --prebuilt-workflows flag
// accepts. Validates the produced manifest against the same Zod schema the
// loader uses, so shape regressions surface here rather than at eval time.

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { basename, join } from 'path';
import { z } from 'zod';

import { prebuiltManifestSchema, type PrebuiltManifest } from '../harness/prebuilt-workflows';
import { runWithConcurrency } from '../harness/runner';

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
			case '--workflow-dir':
				result.workflowDir = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--build-cwd':
				result.buildCwd = nextArg(argv, i, arg);
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
// MCP config — extract the named server block from ~/.claude.json
// ---------------------------------------------------------------------------

const claudeConfigSchema = z.object({
	mcpServers: z.record(z.unknown()).optional(),
	projects: z
		.record(z.object({ mcpServers: z.record(z.unknown()).optional() }).passthrough())
		.optional(),
});

function stageMcpConfig(serverName: string, repoRoot: string | undefined): string {
	const claudeConfigPath = join(homedir(), '.claude.json');
	if (!existsSync(claudeConfigPath)) {
		throw new Error(`${claudeConfigPath} not found`);
	}
	const parsed = claudeConfigSchema.parse(readJson(claudeConfigPath, 'Claude Code config'));

	const projectScopedBlock = repoRoot
		? parsed.projects?.[repoRoot]?.mcpServers?.[serverName]
		: undefined;
	const block = projectScopedBlock ?? parsed.mcpServers?.[serverName];
	if (!block) {
		const scope = repoRoot
			? `project-scope under "${repoRoot}" or global`
			: 'global (no repo root, project-scope skipped)';
		throw new Error(`MCP server "${serverName}" not configured in ${claudeConfigPath} (${scope})`);
	}

	const tmpPath = join(tmpdir(), `n8n-mcp-config-${process.pid}-${Date.now()}.json`);
	writeFileSync(tmpPath, JSON.stringify({ mcpServers: { [serverName]: block } }), {
		mode: 0o600,
	});
	return tmpPath;
}

/** Each non-alphanumeric character (excluding hyphen) becomes "_". Mirrors
 *  Claude Code's tool-prefix sanitization: "n8n-mcp (instance)" maps to
 *  "n8n-mcp__instance_", and the full prefix becomes "mcp__n8n-mcp__instance___". */
function sanitizeServerName(name: string): string {
	return name.replace(/[^a-zA-Z0-9-]/g, '_');
}

const INSTANCE_MCP_TOOLS = [
	'get_sdk_reference',
	'search_nodes',
	'get_suggested_nodes',
	'get_node_types',
	'validate_workflow',
	'create_workflow_from_code',
	'archive_workflow',
	'update_workflow',
] as const;

function buildAllowedTools(serverName: string): readonly string[] {
	const prefix = `mcp__${sanitizeServerName(serverName)}__`;
	return INSTANCE_MCP_TOOLS.map((t) => `${prefix}${t}`);
}

// ---------------------------------------------------------------------------
// `claude -p` subprocess invocation
// ---------------------------------------------------------------------------

const claudeSessionSchema = z
	.object({
		result: z.string().optional(),
		num_turns: z.number().optional(),
		total_cost_usd: z.number().optional(),
		duration_ms: z.number().optional(),
		subtype: z.string().optional(),
	})
	.passthrough();
type ClaudeSession = z.infer<typeof claudeSessionSchema>;

interface BuildAttempt {
	session: ClaudeSession | undefined;
	logFile: string;
}

async function runClaude(
	userMessage: string,
	args: CliArgs,
	mcpConfigPath: string,
	allowedTools: readonly string[],
	logFile: string,
): Promise<BuildAttempt> {
	return await new Promise((resolve) => {
		const claudeArgs = [
			'-p',
			userMessage,
			'--model',
			args.model,
			'--mcp-config',
			mcpConfigPath,
			'--strict-mcp-config',
			'--allowedTools',
			...allowedTools,
			'--output-format',
			'json',
		];
		const child = spawn('claude', claudeArgs, {
			env: { ...process.env, MCP_TIMEOUT: String(args.mcpTimeoutMs) },
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: args.buildCwd,
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('close', () => {
			// Persist stdout (or stderr fallback) for forensics regardless of parse success.
			writeFileSync(logFile, stdout || stderr || '{}');
			let session: ClaudeSession | undefined;
			try {
				const parsed = claudeSessionSchema.safeParse(JSON.parse(stdout));
				if (parsed.success) session = parsed.data;
			} catch {
				// stdout wasn't JSON — caller treats undefined session as failure.
			}
			resolve({ session, logFile });
		});
		child.on('error', () => {
			resolve({ session: undefined, logFile });
		});
	});
}

interface BuildOutcome {
	slug: string;
	iteration: number;
	workflowId: string | null;
	cost: number;
	turns: number;
	durationMs: number;
}

const testCaseSchema = z.object({ prompt: z.string() }).passthrough();

function tailWorkflowId(text: string): string | null {
	const matches = [...text.matchAll(/WORKFLOW_ID=([A-Za-z0-9_-]+)/g)];
	return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

async function buildOne(
	slug: string,
	iteration: number,
	args: CliArgs,
	mcpConfigPath: string,
	workflowDir: string,
	allowedTools: readonly string[],
): Promise<BuildOutcome> {
	const scenarioFile = join(workflowDir, `${slug}.json`);
	if (!existsSync(scenarioFile)) {
		console.log(`  [${slug}#${iteration}] skip: scenario file missing`);
		return { slug, iteration, workflowId: null, cost: 0, turns: 0, durationMs: 0 };
	}
	const testCase = testCaseSchema.parse(readJson(scenarioFile, `test case ${slug}`));

	const projectInstruction = args.projectId
		? `\n\nWhen calling create_workflow_from_code, pass projectId: '${args.projectId}' so the workflow is created in that n8n project.`
		: '';

	const userMessage = `${testCase.prompt}${projectInstruction}

---
After you have created the workflow with create_workflow_from_code, print a final line of the exact form:

WORKFLOW_ID=<id>

where <id> is the workflowId returned by create_workflow_from_code. Emit it verbatim, no quotes, no markdown.`;

	let workflowId: string | null = null;
	let lastSession: ClaudeSession | undefined;
	for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const logFile = join(args.logDir, `${slug}-iter${iteration}-attempt${attempt}-${ts}.json`);
		const { session } = await runClaude(userMessage, args, mcpConfigPath, allowedTools, logFile);
		lastSession = session;
		const id = session?.result ? tailWorkflowId(session.result) : null;
		if (id) {
			workflowId = id;
			break;
		}
		const reason = session?.subtype ?? 'no-stdout';
		console.log(
			`  [${slug}#${iteration}] attempt ${attempt}: no WORKFLOW_ID (${reason}, log: ${logFile})`,
		);
	}

	if (!workflowId) {
		console.log(`  [${slug}#${iteration}] FAILED after ${args.maxAttempts} attempts`);
	} else {
		console.log(`  [${slug}#${iteration}] ok → ${workflowId}`);
	}

	return {
		slug,
		iteration,
		workflowId,
		cost: lastSession?.total_cost_usd ?? 0,
		turns: lastSession?.num_turns ?? 0,
		durationMs: lastSession?.duration_ms ?? 0,
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

	// `--workflow-dir` lets the script run from outside the n8n repo. When
	// not provided, we derive both the workflow dir and the repo root from
	// `git rev-parse` (the script must then be invoked inside the n8n repo).
	let workflowDir: string;
	let repoRoot: string | undefined;
	if (args.workflowDir) {
		workflowDir = args.workflowDir;
		try {
			repoRoot = execSync('git rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] })
				.toString()
				.trim();
		} catch {
			repoRoot = undefined;
		}
	} else {
		try {
			repoRoot = execSync('git rev-parse --show-toplevel').toString().trim();
		} catch {
			throw new Error(
				'Could not determine repo root via git. Run from inside the n8n repo, or pass --workflow-dir to point at a test-case directory directly.',
			);
		}
		workflowDir = join(repoRoot, 'packages/@n8n/instance-ai/evaluations/data/workflows');
	}

	if (args.buildCwd && !existsSync(args.buildCwd)) {
		throw new Error(`--build-cwd directory does not exist: ${args.buildCwd}`);
	}

	if (args.slugs.length === 0) {
		args.slugs = discoverSlugs(workflowDir);
	}
	if (args.slugs.length === 0) {
		throw new Error('No scenarios to build');
	}

	const mcpConfigPath = stageMcpConfig(args.mcpServerName, repoRoot);
	process.on('exit', () => {
		try {
			unlinkSync(mcpConfigPath);
		} catch {
			// best-effort
		}
	});

	const allowedTools = buildAllowedTools(args.mcpServerName);
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
			await buildOne(task.slug, task.iteration, args, mcpConfigPath, workflowDir, allowedTools),
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
