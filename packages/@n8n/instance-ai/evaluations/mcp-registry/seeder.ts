// ---------------------------------------------------------------------------
// MCP registry seeding for evaluation runs
//
// The MCP registry catalog drives the synthetic registry nodes (Notion MCP,
// Linear MCP, etc.) that workflow-builder evals depend on. In production the
// catalog is fetched from the n8n.io Strapi API on the leader instance — but
// the fire-and-forget boot fetch swallows errors, so an eval run can otherwise
// silently start with an empty catalog and no MCP nodes available to the
// builder agent.
//
// This seeder calls the test endpoint to deterministically upsert the Notion +
// Linear mock entries and trigger a node-type reload. Best-effort on a missing
// endpoint and idempotent — multiple calls are no-ops.
//
// Requires the n8n server to be running with E2E_TESTS=true so the test
// controller is mounted (CI containers already set this; local dev does not by
// default), and an authenticated client — call after `client.login()`.
// ---------------------------------------------------------------------------

import { N8nApiError } from '../clients/n8n-client';
import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

export interface McpRegistrySeedResult {
	seeded: boolean;
	count: number;
}

/**
 * Seed the MCP registry into the n8n instance for evaluation runs.
 *
 * Non-fatal when the endpoint is missing — `E2E_TESTS=true` not being set on
 * the server is informative rather than a run-stopper. Auth errors are fatal:
 * they arrive only after a successful login, and swallowing one would let the
 * run proceed with an empty registry and misattribute failures to the builder.
 */
export async function seedMcpRegistry(
	client: N8nClient,
	logger?: EvalLogger,
): Promise<McpRegistrySeedResult> {
	try {
		const { count } = await client.seedMcpRegistry();
		return { seeded: true, count };
	} catch (error) {
		if (error instanceof N8nApiError && (error.status === 401 || error.status === 403)) {
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		logger?.verbose(`  Skipping MCP registry seed: ${message}`);
		return { seeded: false, count: 0 };
	}
}
