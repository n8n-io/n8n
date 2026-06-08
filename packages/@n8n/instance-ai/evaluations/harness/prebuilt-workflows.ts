// ---------------------------------------------------------------------------
// Prebuilt-workflows manifest + BuildResult adapter
//
// Owns everything specific to `--prebuilt-workflows` mode:
//   • the manifest schema + loader (loadPrebuiltManifest)
//   • the per-iteration workflow-ID picker (pickPrebuiltWorkflowId)
//   • the BuildResult adapter that fetches an existing workflow from n8n
//     and shapes it like a fresh build (fetchPrebuiltBuild)
//
// When `--prebuilt-workflows <path>` is set, the eval CLI uses this module
// in place of the orchestrator build — useful for evaluating workflows
// authored by tools other than Instance AI (e.g. an MCP-driven build,
// a hand-built reference, an older Instance AI snapshot).
//
// Multiple IDs per slug let multi-iteration runs (--iterations N) compare
// across distinct builds; pickPrebuiltWorkflowId rotates with
// iteration % ids.length.
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { z } from 'zod';

import type { EvalLogger } from './logger';
import type { BuildResult } from './runner';
import type { N8nClient } from '../clients/n8n-client';

export const prebuiltManifestSchema = z
	.record(z.string().min(1), z.array(z.string().min(1)).min(1))
	.refine((v) => Object.keys(v).length > 0, { message: 'manifest must not be empty' });

export type PrebuiltManifest = z.infer<typeof prebuiltManifestSchema>;

export function loadPrebuiltManifest(path: string): PrebuiltManifest {
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, 'utf-8'));
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to read prebuilt-workflows manifest at ${path}: ${msg}`);
	}
	const result = prebuiltManifestSchema.safeParse(raw);
	if (!result.success) {
		throw new Error(
			`Invalid prebuilt-workflows manifest at ${path}: ${result.error.issues
				.map((i) => `${i.path.join('.')}: ${i.message}`)
				.join('; ')}`,
		);
	}
	return result.data;
}

/**
 * Look up the workflow ID for a given test-case file slug + iteration.
 *
 * Returns `undefined` in two cases — callers cannot distinguish them and
 * shouldn't need to:
 *   • the manifest argument itself is undefined (no `--prebuilt-workflows`)
 *   • the manifest exists but doesn't cover this slug (fall through to the
 *     regular orchestrator build path)
 */
export function pickPrebuiltWorkflowId(
	manifest: PrebuiltManifest | undefined,
	fileSlug: string,
	iteration: number,
): string | undefined {
	if (!manifest) return undefined;
	const ids = manifest[fileSlug];
	if (!ids || ids.length === 0) return undefined;
	return ids[iteration % ids.length];
}

/**
 * Build a BuildResult for a workflow that already exists in the n8n instance.
 * Used by --prebuilt-workflows mode to skip the orchestrator and verify a
 * workflow built by some other tool (e.g. an MCP-driven session).
 *
 * `createdWorkflowIds` is intentionally left empty: cleanupBuild() iterates
 * that array and would delete the workflow otherwise. Prebuilt workflows
 * are owned by the caller, not the eval run.
 */
export async function fetchPrebuiltBuild(
	client: N8nClient,
	workflowId: string,
	logger: EvalLogger,
): Promise<BuildResult> {
	logger.info(`  Using prebuilt workflow: ${workflowId}`);
	try {
		const workflow = await client.getWorkflow(workflowId);
		return {
			success: true,
			workflowId,
			workflowJsons: [workflow],
			createdWorkflowIds: [],
			createdDataTableIds: [],
		};
	} catch (error: unknown) {
		return {
			success: false,
			error: `Failed to fetch prebuilt workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`,
			workflowJsons: [],
			createdWorkflowIds: [],
			createdDataTableIds: [],
		};
	}
}
