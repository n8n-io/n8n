#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Instance AI workflow eval CLI — composition root (TRUST-261).
//
// Parses args, selects cases, sets up lanes, then hands the run to one of two
// drivers over the shared session/pipeline in evaluations/run/: the LangSmith
// driver (evaluate() + experiments) when LANGSMITH_API_KEY is set, else the
// direct driver (same rows, same pipeline and local artifacts, no LangSmith
// experiment tracking — the mode the LangTracer dispatcher invokes).
// ---------------------------------------------------------------------------

import { mkdirSync } from 'fs';
import { join } from 'path';

import { parseCliArgs } from './args';
import { loadTestCases } from '../data/source';
import { LOCAL_FIXTURE_ID } from '../harness/credential-setup-lane';
import { createLogger } from '../harness/logger';
import { type McpBuildSpend } from '../run/build-orchestrator';
import { selectCases } from '../run/case-selection';
import { runDirect } from '../run/direct-driver';
import { cleanupLanes, setupLanes } from '../run/lane-setup';
import { runWithLangSmith } from '../run/langsmith-driver';
import { ciRerunHint, createRowSink, runEvalAndPersist } from '../run/persist';
import { emitRunReports } from '../run/reporters';

/** Whether more than one browser BUILD can exist in this run — the relay is
 *  instance-wide, and iterations expand into separate concurrent rows. */
export function serialiseForBrowserLane(browserCaseCount: number, iterations: number): boolean {
	return browserCaseCount > 1 || (browserCaseCount > 0 && iterations > 1);
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	const { testCasesWithFiles, prebuiltManifest } = selectCases(
		args,
		await loadTestCases(args, logger),
		logger,
	);

	// A `local` case drives the developer's own browser against the real provider.
	// That cannot be parallelised: concurrency defaults to 16, lanes cap at 4 and
	// iterations multiply again, and a single Chrome profile cannot be opened
	// twice. Serialise, and refuse a multi-case selection outright rather than
	// opening windows nobody is watching. Enforced HERE because the case count is
	// only known after selectCases.
	const localCases = testCasesWithFiles.filter(
		({ testCase }) => testCase.credentialFixture === LOCAL_FIXTURE_ID,
	);
	if (localCases.length > 0) {
		if (testCasesWithFiles.length > 1) {
			throw new Error(
				`credentialFixture "${LOCAL_FIXTURE_ID}" drives your real browser, so it runs one case at a time — ` +
					`the current selection has ${String(testCasesWithFiles.length)}. Narrow it with --filter.`,
			);
		}
		if (args.iterations > 1) {
			throw new Error(
				`credentialFixture "${LOCAL_FIXTURE_ID}" cannot run multiple iterations — each one creates a REAL credential.`,
			);
		}
		args.concurrency = 1;
		logger.info('  Local mode: serialised, and every run creates a REAL credential.');
	}

	// Every browser-lane case shares ONE resource: the instance's single relay.
	// `createBrowserLink()` / `disconnectBrowserSession()` are instance-wide, so
	// a second concurrent browser build displaces the first and either build's
	// tools can end up driving the other's browser. A single case at one
	// iteration cannot collide with itself, so the rest of the run keeps its
	// parallelism.
	const browserCases = testCasesWithFiles.filter(
		({ testCase }) => testCase.credentialFixture !== undefined,
	);
	if (serialiseForBrowserLane(browserCases.length, args.iterations) && args.concurrency !== 1) {
		args.concurrency = 1;
		logger.info(
			`  ${String(browserCases.length)} browser-lane case(s) selected: serialised, because the n8n relay is instance-wide.`,
		);
	}

	// Per-build `claude` logs (--build-via-mcp only). One shared dir; filenames
	// are slug/iteration/attempt-scoped so concurrent lanes never collide.
	const mcpBuildLogDir = args.buildViaMcp
		? join(args.outputDir ?? process.cwd(), 'mcp-build-logs')
		: undefined;
	if (mcpBuildLogDir) mkdirSync(mcpBuildLogDir, { recursive: true });

	// One lane per base URL; the drivers dispatch builds across them via the
	// work-stealing allocator inside the shared eval session.
	const lanes = await setupLanes(args, logger);

	const startTime = Date.now();
	// Delete workflows after the run when they're throwaway: prebuilt opt-in
	// (--delete-prebuilt-workflows) or MCP builds (--build-via-mcp, unless
	// --keep-workflows). Tracked per-lane on lane.workflowIdsToDelete.
	const cleanupBuiltWorkflows =
		args.deletePrebuiltWorkflows || (args.buildViaMcp && !args.keepWorkflows);

	const mcpBuildSpend: McpBuildSpend[] = [];
	// Every completed row is journaled so a crashed run still persists verdicts.
	const rowSink = createRowSink(args.outputDir);
	const commitSha = process.env.LANGSMITH_REVISION_ID ?? process.env.GITHUB_SHA;

	try {
		const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY);

		// runEvalAndPersist owns the always-write guarantee: it writes
		// eval-results.json even if the run below throws (a budget/timeout abort, a
		// lane meltdown, an OOM), aggregating whatever completed scenarios were
		// pushed into `partialResults` so the dispatcher never finds no file.
		const { evaluation, slugByTestCase, outcome, gate, jsonPath, prCommentPath } =
			await runEvalAndPersist(
				{
					logger,
					outputDir: args.outputDir,
					startTime,
					iterations: args.iterations,
					tier: args.tier,
					commitSha,
					rerun: ciRerunHint(),
					mcpBuildSpend,
					rowSink,
					testCasesWithFiles,
				},
				async (partialResults) => {
					if (hasLangSmith) {
						logger.info('LangSmith API key detected, using evaluate() with experiment tracking');
						const langsmithRun = await runWithLangSmith({
							args,
							lanes,
							logger,
							testCasesWithFiles,
							prebuiltManifest,
							cleanupBuiltWorkflows,
							mcpBuildLogDir,
							mcpBuildSpend,
							rowSink,
						});
						return {
							evaluation: langsmithRun.evaluation,
							experimentName: langsmithRun.experimentName,
							experimentUrl: langsmithRun.experimentUrl,
							outcome: langsmithRun.outcome,
							slugByTestCase: langsmithRun.slugByTestCase,
						};
					}
					logger.info(
						'No LANGSMITH_API_KEY, running direct loop (results in eval-results.json only)',
					);
					const directRun = await runDirect({
						args,
						lanes,
						logger,
						testCasesWithFiles,
						prebuiltManifest,
						cleanupBuiltWorkflows,
						mcpBuildLogDir,
						mcpBuildSpend,
						partialResults,
						rowSink,
					});
					return { evaluation: directRun.evaluation, slugByTestCase: directRun.slugByTestCase };
				},
			);

		emitRunReports({
			evaluation,
			outcome,
			gate,
			slugByTestCase,
			commitSha,
			outputDir: args.outputDir,
			jsonPath,
			prCommentPath,
			experimentName: args.experimentName,
		});
	} finally {
		await cleanupLanes(lanes, cleanupBuiltWorkflows, logger);
	}
}

// Only auto-run as the CLI entry point. Importing this module (e.g. from a unit
// test that exercises the exported runEvalAndPersist / writeEvalResults seams)
// must not kick off a real eval run against process.argv.
if (!process.env.VITEST) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}
