// ---------------------------------------------------------------------------
// Case selection — narrows the loaded cases to what this run can actually
// execute (TRUST-261): prebuilt-manifest coverage and the `claude` MCP build
// path's setup-field limitations. Loading itself lives in data/source.ts.
// ---------------------------------------------------------------------------

import type { CliArgs } from '../cli/args';
import { unsupportedMcpBuildSetupFields } from '../cli/mcp-builder';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import {
	loadPrebuiltManifest,
	partitionByPrebuiltCoverage,
	type PrebuiltManifest,
} from '../harness/prebuilt-workflows';

export function selectCases(
	args: CliArgs,
	loaded: WorkflowTestCaseWithFile[],
	logger: EvalLogger,
): { testCasesWithFiles: WorkflowTestCaseWithFile[]; prebuiltManifest?: PrebuiltManifest } {
	let testCasesWithFiles = loaded;
	const prebuiltManifest = args.prebuiltWorkflows
		? loadPrebuiltManifest(args.prebuiltWorkflows)
		: undefined;
	if (prebuiltManifest) {
		// Multi-lane is for distributing the orchestrator build phase across
		// n8n instances. Prebuilt workflows live on a single instance — fetching
		// them from any other lane's URL would 404 — and prebuilt mode skips
		// builds anyway, so multi-lane buys nothing. Refuse the combination
		// rather than silently fetching from one lane and ignoring the rest.
		if (args.baseUrls.length > 1) {
			throw new Error(
				'--prebuilt-workflows is incompatible with multiple --base-url values. Prebuilt workflows live on a single n8n instance; pass exactly one --base-url.',
			);
		}
		const slugCount = Object.keys(prebuiltManifest).length;
		logger.info(`Loaded prebuilt manifest: ${String(slugCount)} test case(s)`);

		// Typo-check manifest slugs against known cases; skip when filtered (a
		// deselected slug isn't a typo, else we'd warn on every filtered-out entry).
		if (!args.filter && !args.exclude && !args.tier) {
			const knownSlugs = new Set(testCasesWithFiles.map((tc) => tc.fileSlug));
			const orphanSlugs = Object.keys(prebuiltManifest).filter((slug) => !knownSlugs.has(slug));
			if (orphanSlugs.length > 0) {
				logger.warn(
					`Prebuilt manifest references ${String(orphanSlugs.length)} slug(s) with no matching test case (will be ignored): ${orphanSlugs.join(', ')}`,
				);
			}
		}

		// Skip selected cases the manifest has no build for, rather than silently
		// orchestrator-building them (which would mix builders in one result set).
		const { covered, skipped } = partitionByPrebuiltCoverage(testCasesWithFiles, prebuiltManifest);
		if (skipped.length > 0) {
			logger.warn(
				`Prebuilt: skipping ${String(skipped.length)} selected case(s) with no workflow in the manifest: ${skipped.map((tc) => tc.fileSlug).join(', ')}`,
			);
		}
		if (covered.length === 0) {
			throw new Error('Prebuilt manifest covers none of the selected test cases — nothing to run.');
		}
		testCasesWithFiles = covered;
	}

	// `claude -p` builds get only the flattened conversation — build-side setup
	// (credentials, seeds) is orchestrator-only. Skip cases that declare it
	// rather than building them without prerequisites and reporting misleading
	// failures (mirrors the prebuilt-coverage partition above).
	if (args.buildViaMcp) {
		const skippedMcp: string[] = [];
		testCasesWithFiles = testCasesWithFiles.filter(({ testCase, fileSlug }) => {
			const fields = unsupportedMcpBuildSetupFields(testCase);
			if (fields.length === 0) return true;
			skippedMcp.push(`${fileSlug} (${fields.join(', ')})`);
			return false;
		});
		if (skippedMcp.length > 0) {
			logger.warn(
				`MCP build: skipping ${String(skippedMcp.length)} selected case(s) with setup fields the \`claude\` build path cannot honor: ${skippedMcp.join('; ')}`,
			);
		}
		if (testCasesWithFiles.length === 0) {
			throw new Error(
				'--build-via-mcp supports none of the selected test cases (all declare orchestrator-only setup fields) — nothing to run.',
			);
		}
	}
	return { testCasesWithFiles, prebuiltManifest };
}
