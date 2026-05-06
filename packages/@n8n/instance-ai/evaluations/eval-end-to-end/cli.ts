#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pLimit from 'p-limit';

import { N8nClient } from '../clients/n8n-client';
import { createLogger } from '../harness/logger';
import { shouldFailProcessForCompletedRun } from './exit-policy';
import { loadEvalEndToEndCases } from './fixtures';
import { runEvalEndToEndCase } from './runner';
import { formatRunSummary } from './summary';
import type { EvalEndToEndRunResult } from './types';

const DEFAULT_TIMEOUT_MS = 600_000;

interface CliArgs {
	baseUrl: string;
	email?: string;
	password?: string;
	filter?: string;
	timeoutMs: number;
	concurrency: number;
	keepArtifacts: boolean;
	output: string;
	verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		baseUrl: process.env.N8N_EVAL_BASE_URL ?? 'http://localhost:5678',
		email: process.env.N8N_EVAL_EMAIL,
		password: process.env.N8N_EVAL_PASSWORD,
		timeoutMs: DEFAULT_TIMEOUT_MS,
		concurrency: 1,
		keepArtifacts: false,
		output: resolve(process.cwd(), 'eval-end-to-end-results.json'),
		verbose: hasFlag(argv, '--verbose'),
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		switch (arg) {
			case '--base-url':
				args.baseUrl = readValue(argv, ++i, arg);
				break;
			case '--email':
				args.email = readValue(argv, ++i, arg);
				break;
			case '--password':
				args.password = readValue(argv, ++i, arg);
				break;
			case '--filter':
				args.filter = readValue(argv, ++i, arg);
				break;
			case '--timeout-ms':
				args.timeoutMs = requirePositiveInt(readValue(argv, ++i, arg), arg);
				break;
			case '--concurrency':
				args.concurrency = requirePositiveInt(readValue(argv, ++i, arg), arg);
				break;
			case '--keep-artifacts':
				args.keepArtifacts = true;
				break;
			case '--output':
				args.output = resolve(process.cwd(), readValue(argv, ++i, arg));
				break;
			case '--verbose':
				break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return args;
}

function hasFlag(argv: string[], flag: string): boolean {
	return argv.includes(flag);
}

function readValue(argv: string[], index: number, flag: string): string {
	const value = argv[index];
	if (!value || value.startsWith('--')) {
		throw new Error(`Missing value for ${flag}`);
	}
	return value;
}

function requirePositiveInt(raw: string, flag: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`Invalid value for ${flag}: ${raw} (expected a positive integer)`);
	}
	return value;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(hasFlag(process.argv.slice(2), '--verbose'));
	const client = new N8nClient(args.baseUrl);

	await client.login(args.email, args.password);

	const cases = loadEvalEndToEndCases({ filter: args.filter });
	if (cases.length === 0) {
		throw new Error('No eval end-to-end cases found');
	}

	const projectId = await client.getPersonalProjectId();
	const limit = pLimit(args.concurrency);
	const results = await Promise.all(
		cases.map((testCase) =>
			limit(async () => {
				logger.info(`RUN ${testCase.slug}`);
				const result = await runEvalEndToEndCase({
					client,
					testCase,
					logger,
					timeoutMs: args.timeoutMs,
					keepArtifacts: args.keepArtifacts,
					projectId,
				});

				if (result.passed) {
					logger.success(`PASS ${testCase.slug}`);
				} else {
					logger.warn(`FAIL ${testCase.slug}`);
				}

				return result;
			}),
		),
	);

	const runResult: EvalEndToEndRunResult = {
		passed: results.every((result) => result.passed),
		results,
	};

	await writeFile(args.output, `${JSON.stringify(runResult, null, 2)}\n`, 'utf8');
	logger.info(`Wrote results to ${args.output}`);
	logger.info(formatRunSummary(runResult));

	for (const result of results.filter((caseResult) => !caseResult.passed)) {
		logger.warn(`Case failed: ${result.caseSlug}`);
		const findings = [
			...result.toolSelection.findings,
			...result.topology.findings,
			...result.execution.errors.map((message) => ({ code: 'execution_error', message })),
		];
		for (const finding of findings) {
			logger.warn(`  ${finding.code}: ${finding.message}`);
		}
	}

	if (shouldFailProcessForCompletedRun(runResult)) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	const logger = createLogger(hasFlag(process.argv.slice(2), '--verbose'));
	const message = error instanceof Error ? error.message : String(error);
	logger.error(message);
	process.exitCode = 1;
});
