// Co-review cockpit — a throwaway, localhost-only HTTP server for collaborative
// eval calibration. Loads many cases, builds them concurrently against one or
// more live n8n instances (reusing the eval runner + lane model), and serves a
// case list + drill-in UI (index.html). See .agents/skills/create-instance-ai-eval/cockpit.md.
//
// This file is I/O glue; the testable logic lives in ./lib.ts.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { parseCliArgs } from '../cli/args';
import { partitionRoundRobin } from '../cli/lanes';
import { N8nClient } from '../clients/n8n-client';
import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { createLogger, type EvalLogger } from '../harness/logger';
import { EvalTestCaseSchema } from '../harness/schema';
import { effectiveTimeoutMs, runWithConcurrency, runWorkflowTestCase } from '../harness/runner';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';
import type { WorkflowTestCaseWithFile } from '../utils/load-eval-cases';
import {
	appendCalibrationNote,
	browserAuthCookie,
	extractCockpitFlags,
	instanceAiThreadUrl,
	RunRegistry,
	type CalibrationCategory,
} from './lib';

/** Per-instance build cap — mirrors MAX_CONCURRENT_BUILDS in cli/index.ts.
 *  Not imported from there because importing cli/index.ts runs its main(). */
const DEFAULT_BUILD_CONCURRENCY = 4;

const DATA_DIR = join(__dirname, '..', 'data', 'workflows');
const INDEX_HTML = join(__dirname, 'index.html');

/** A lane is one n8n instance; its client logs in lazily and is reused. */
interface Lane {
	baseUrl: string;
	client: N8nClient;
	ready?: Promise<void>;
}

interface CalibrationVerdictBody {
	category: CalibrationCategory;
	note: string;
}

function caseFilePath(slug: string): string {
	return join(DATA_DIR, `${slug}.json`);
}

function isVerdictBody(value: unknown): value is CalibrationVerdictBody {
	if (typeof value !== 'object' || value === null) return false;
	const category: unknown = Reflect.get(value, 'category');
	const note: unknown = Reflect.get(value, 'note');
	return (category === 'harness' || category === 'capability-gap') && typeof note === 'string';
}

function parseRunSlugs(value: unknown): string[] | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const slugs: unknown = Reflect.get(value, 'slugs');
	if (slugs === undefined) return undefined;
	if (!Array.isArray(slugs)) return undefined;
	return slugs.filter((s): s is string => typeof s === 'string');
}

/** Compact, JSON-safe projection of a build result for the drill-in detail. */
function projectResult(result: WorkflowTestCaseResult) {
	return {
		workflowBuildSuccess: result.workflowBuildSuccess,
		buildError: result.buildError,
		workflowId: result.workflowId,
		threadId: result.threadId,
		n8nBaseUrl: result.n8nBaseUrl,
		buildExpectationResults: result.buildExpectationResults ?? [],
		executionScenarioResults: (result.executionScenarioResults ?? []).map((sr) => ({
			name: sr.scenario.name,
			success: sr.success,
			reasoning: sr.reasoning,
			failureCategory: sr.failureCategory,
		})),
	};
}

async function readBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(payload);
}

async function main(): Promise<void> {
	const { port, runAll, rest } = extractCockpitFlags(process.argv.slice(2));
	const args = parseCliArgs(rest);
	const logger: EvalLogger = createLogger(args.verbose);

	const casesWithFiles = loadWorkflowTestCasesWithFiles(args.filter, args.exclude);
	if (casesWithFiles.length === 0) {
		logger.error('No cases matched — check --filter / --exclude.');
		process.exit(1);
	}

	const lanes: Lane[] = args.baseUrls.map((baseUrl) => ({
		baseUrl,
		client: new N8nClient(baseUrl),
	}));

	// Stable, deterministic case→lane assignment (round-robin), so a case always
	// builds on the same instance and the iframe can target it.
	const laneBySlug = new Map<string, Lane>();
	const caseBySlug = new Map<string, WorkflowTestCase>();
	partitionRoundRobin(casesWithFiles, lanes.length).forEach((bucket, laneIdx) => {
		for (const cwf of bucket) {
			laneBySlug.set(cwf.fileSlug, lanes[laneIdx]);
			caseBySlug.set(cwf.fileSlug, cwf.testCase);
		}
	});

	const registry = new RunRegistry(casesWithFiles.map((c) => c.fileSlug));
	const results = new Map<string, WorkflowTestCaseResult>();

	// Auth session primed onto the browser so the embedded builder iframe is
	// already logged in (see browserAuthCookie). Captured from the primary lane;
	// cookies aren't port-scoped, so this authenticates a single-instance run.
	// Multi-instance runs can only prime one instance (each signs its own JWT).
	let browserCookie: string | undefined;

	async function ensureLoggedIn(lane: Lane): Promise<void> {
		if (!lane.ready) {
			lane.ready = lane.client.login(args.email, args.password);
		}
		await lane.ready;
	}

	async function runCase(slug: string): Promise<void> {
		if (!registry.claim(slug)) return; // already in flight
		const lane = laneBySlug.get(slug);
		const testCase = caseBySlug.get(slug);
		if (!lane || !testCase) {
			registry.fail(slug, `unknown case "${slug}"`);
			return;
		}
		try {
			await ensureLoggedIn(lane);
			const result = await runWorkflowTestCase({
				client: lane.client,
				baseUrl: lane.baseUrl,
				testCase,
				timeoutMs: effectiveTimeoutMs(testCase.complexity, args.timeoutMs),
				createdCredentialIds: new Set<string>(),
				preRunWorkflowIds: new Set<string>(),
				claimedWorkflowIds: new Set<string>(),
				logger,
				keepWorkflows: true,
			});
			results.set(slug, result);
			registry.finish(slug, result);
		} catch (error) {
			registry.fail(slug, error instanceof Error ? error.message : String(error));
		}
	}

	/** Dispatch the given slugs across their lanes, each lane bounded by the build
	 *  cap. Non-blocking: kicks off the work and returns the slugs actually started. */
	function dispatch(requested: string[]): string[] {
		const started = requested.filter((slug) => !registry.isInFlight(slug));
		const byLane = new Map<Lane, string[]>();
		for (const slug of requested) {
			const lane = laneBySlug.get(slug);
			if (!lane) continue;
			const bucket = byLane.get(lane) ?? [];
			bucket.push(slug);
			byLane.set(lane, bucket);
		}
		const cap = args.concurrency > 0 ? args.concurrency : DEFAULT_BUILD_CONCURRENCY;
		for (const [, bucket] of byLane) {
			void runWithConcurrency(bucket, runCase, Math.min(cap, DEFAULT_BUILD_CONCURRENCY));
		}
		return started;
	}

	function casesPayload() {
		return registry.snapshot().map((entry) => {
			const baseUrl = laneBySlug.get(entry.slug)?.baseUrl;
			const threadId = results.get(entry.slug)?.threadId;
			return {
				...entry,
				laneBaseUrl: baseUrl,
				threadId,
				// The iframe deep-links to the built thread once there is one, else the
				// empty builder — so selecting a case shows the conversation it ran in.
				frameUrl: baseUrl ? instanceAiThreadUrl(baseUrl, threadId) : undefined,
			};
		});
	}

	const server = createServer((req, res) => {
		void handle(req, res).catch((error: unknown) => {
			sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
		});
	});

	async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const url = new URL(req.url ?? '/', `http://localhost:${port}`);
		const slug = url.searchParams.get('slug') ?? '';

		if (req.method === 'GET' && url.pathname === '/') {
			const headers: Record<string, string> = { 'content-type': 'text/html' };
			// Prime the browser with the instance session so the iframe is logged in.
			if (browserCookie) headers['set-cookie'] = browserCookie;
			res.writeHead(200, headers);
			res.end(readFileSync(INDEX_HTML, 'utf8'));
			return;
		}

		if (req.method === 'GET' && url.pathname === '/cases') {
			sendJson(res, 200, { cases: casesPayload(), baseUrls: args.baseUrls });
			return;
		}

		if (req.method === 'GET' && url.pathname === '/case') {
			const file = caseFilePath(slug);
			if (!existsSync(file)) {
				sendJson(res, 404, { error: `no case file for "${slug}"` });
				return;
			}
			sendJson(res, 200, { slug, json: readFileSync(file, 'utf8') });
			return;
		}

		if (req.method === 'PUT' && url.pathname === '/case') {
			const raw = await readBody(req);
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch (error) {
				sendJson(res, 200, {
					ok: false,
					errors: [error instanceof Error ? error.message : 'invalid JSON'],
				});
				return;
			}
			const check = EvalTestCaseSchema.safeParse(parsed);
			if (!check.success) {
				sendJson(res, 200, { ok: false, errors: check.error.issues.map((i) => i.message) });
				return;
			}
			writeFileSync(caseFilePath(slug), `${JSON.stringify(parsed, null, 2)}\n`);
			refreshCase(slug);
			sendJson(res, 200, { ok: true });
			return;
		}

		if (req.method === 'POST' && url.pathname === '/run') {
			const body = await readBody(req);
			let requested: string[];
			try {
				requested = parseRunSlugs(JSON.parse(body || '{}')) ?? [...caseBySlug.keys()];
			} catch {
				requested = [...caseBySlug.keys()];
			}
			const started = dispatch(requested);
			sendJson(res, 200, { started });
			return;
		}

		if (req.method === 'GET' && url.pathname === '/result') {
			const result = results.get(slug);
			if (!result) {
				sendJson(res, 404, { error: `no result yet for "${slug}"` });
				return;
			}
			sendJson(res, 200, projectResult(result));
			return;
		}

		if (req.method === 'POST' && url.pathname === '/verdict') {
			const body = await readBody(req);
			let parsed: unknown;
			try {
				parsed = JSON.parse(body);
			} catch {
				parsed = undefined;
			}
			if (!isVerdictBody(parsed)) {
				sendJson(res, 400, { error: 'expected { category, note }' });
				return;
			}
			const file = caseFilePath(slug);
			if (!existsSync(file)) {
				sendJson(res, 404, { error: `no case file for "${slug}"` });
				return;
			}
			const caseJson: unknown = JSON.parse(readFileSync(file, 'utf8'));
			if (typeof caseJson !== 'object' || caseJson === null) {
				sendJson(res, 400, { error: 'case file is not an object' });
				return;
			}
			const existingDescription =
				'description' in caseJson && typeof caseJson.description === 'string'
					? caseJson.description
					: undefined;
			const description = appendCalibrationNote(existingDescription, parsed.category, parsed.note);
			const updated = { ...caseJson, description };
			writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
			refreshCase(slug);
			sendJson(res, 200, { description });
			return;
		}

		sendJson(res, 404, { error: `no route for ${req.method ?? '?'} ${url.pathname}` });
	}

	/** Reload a case from disk into the in-memory map after an edit/verdict write,
	 *  going back through the loader so the stored value keeps its WorkflowTestCase type. */
	function refreshCase(slug: string): void {
		const reloaded = loadWorkflowTestCasesWithFiles(slug).find((c) => c.fileSlug === slug);
		if (reloaded) {
			caseBySlug.set(slug, reloaded.testCase);
		}
	}

	server.listen(port, () => {
		logger.success(
			`Cockpit on http://localhost:${port} — ${casesWithFiles.length} case(s), ${lanes.length} lane(s).`,
		);

		// Best-effort: log the primary lane in so the '/' response can prime the
		// browser with an authenticated session (the iframe then loads logged in).
		// Failure is non-fatal — the user can still sign in manually in the iframe.
		void ensureLoggedIn(lanes[0])
			.then(() => {
				browserCookie = browserAuthCookie(lanes[0].client.cookie);
				logger.info('Primed browser auth — the builder iframe will load logged in.');
			})
			.catch((error: unknown) => {
				logger.warn(
					`Could not prime browser auth (sign in manually in the iframe): ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			});

		if (runAll) {
			const started = dispatch([...caseBySlug.keys()]);
			logger.info(`Auto-running all cases: ${started.length} dispatched.`);
		}
	});
}

void main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.stack : String(error));
	process.exit(1);
});
