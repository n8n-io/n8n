#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Capture-plans CLI.
//
// Drives parent dataset prompts (default: notion-pairwise-workflows)
// through a live n8n instance, captures each orchestrator plan at the
// `submit-plan` boundary, and writes one row per `build-workflow` task to
// the target dataset (default: instance-ai-builder-from-plans).
//
// Idempotent: the target row id is `${parentExampleId}/${taskId}` and
// blueprint item IDs are stable, so re-running only updates rows whose
// captured spec/blueprint actually changed.
//
// Usage:
//   pnpm eval:capture-plans \
//     --base-url http://localhost:5678 \
//     --parent-dataset notion-pairwise-workflows \
//     --target-dataset instance-ai-builder-from-plans
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { Client as LangSmithClient } from 'langsmith';

import { N8nClient } from '../clients/n8n-client';
import { createLogger } from '../harness/logger';
import { syncBuilderFromPlansDataset } from '../langsmith/builder-from-plans-sync';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface CaptureArgs {
	baseUrl: string;
	email?: string;
	password?: string;
	parentDataset: string;
	targetDataset: string;
	maxExamples?: number;
	exampleIds?: Set<string>;
	concurrency: number;
	timeoutMs: number;
	verbose: boolean;
}

function parseArgs(argv: string[]): CaptureArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};
	const has = (flag: string): boolean => argv.includes(flag);

	const exampleIdsFile = get('--example-ids-file');
	let exampleIds: Set<string> | undefined;
	if (exampleIdsFile) {
		const content = readFileSync(exampleIdsFile, 'utf8');
		const ids = content
			.split('\n')
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('#'));
		exampleIds = new Set(ids);
	}

	return {
		baseUrl: get('--base-url') ?? process.env.N8N_EVAL_BASE_URL ?? 'http://localhost:5678',
		email: get('--email') ?? process.env.N8N_EVAL_EMAIL,
		password: get('--password') ?? process.env.N8N_EVAL_PASSWORD,
		parentDataset: get('--parent-dataset') ?? 'notion-pairwise-workflows',
		targetDataset: get('--target-dataset') ?? 'instance-ai-builder-from-plans',
		maxExamples: parsePositiveInt(get('--max-examples'), '--max-examples'),
		exampleIds,
		concurrency: parsePositiveInt(get('--concurrency'), '--concurrency') ?? 4,
		timeoutMs: parsePositiveInt(get('--timeout-ms'), '--timeout-ms') ?? 180_000,
		verbose: has('--verbose'),
	};
}

function parsePositiveInt(raw: string | undefined, name: string): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
		throw new Error(`${name} must be a positive integer, got "${raw}".`);
	}
	return n;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	logger.info(
		`Capture: parent="${args.parentDataset}" target="${args.targetDataset}" via ${args.baseUrl}`,
	);

	const n8nClient = new N8nClient(args.baseUrl);
	await n8nClient.login(args.email, args.password);
	logger.verbose('Authenticated against n8n instance');

	const lsClient = new LangSmithClient();

	const result = await syncBuilderFromPlansDataset({
		lsClient,
		n8nClient,
		parentDataset: args.parentDataset,
		targetDataset: args.targetDataset,
		logger,
		timeoutMs: args.timeoutMs,
		concurrency: args.concurrency,
		maxExamples: args.maxExamples,
		exampleIds: args.exampleIds,
	});

	logger.success(
		`Done — created=${String(result.created)} updated=${String(result.updated)} unchanged=${String(result.unchanged)} skipped=${String(result.skipped.length)}`,
	);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
