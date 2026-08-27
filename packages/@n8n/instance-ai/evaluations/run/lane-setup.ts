// ---------------------------------------------------------------------------
// Lane setup — one authenticated n8n lane per --base-url (TRUST-261):
// login, MCP-registry seed, optional MCP build-user pool, and the pre-run
// workflow snapshot. Plus the end-of-run per-lane artifact cleanup.
// ---------------------------------------------------------------------------

import type { Lane } from './build-orchestrator';
import { cleanupLaneUsers, LaneUserPool } from './lane-users';
import type { CliArgs } from '../cli/args';
import { N8nClient } from '../clients/n8n-client';
import { cleanupCredentials } from '../credentials/seeder';
import type { EvalLogger } from '../harness/logger';
import { cleanupPrebuiltWorkflows } from '../harness/prebuilt-workflows';
import { seedMcpRegistry } from '../mcp-registry/seeder';
import { snapshotDataTableIds, snapshotWorkflowIds } from '../outcome/workflow-discovery';

export async function setupLanes(args: CliArgs, logger: EvalLogger): Promise<Lane[]> {
	// One lane per base URL. The LangSmith path then uses a work-stealing
	// allocator (lane-allocator.ts) to dispatch builds across lanes; the direct
	// path partitions test cases statically per lane.
	const lanes: Lane[] = await Promise.all(
		args.baseUrls.map(async (baseUrl, idx) => {
			const tag =
				args.baseUrls.length > 1
					? ` [lane ${String(idx + 1)}/${String(args.baseUrls.length)}]`
					: '';
			const client = new N8nClient(baseUrl);
			logger.info(`Authenticating with ${baseUrl}...${tag}`);
			await client.login(args.email, args.password);
			logger.success(`Authenticated${tag}`);

			logger.info(`Seeding MCP registry...${tag}`);
			const mcpSeedResult = await seedMcpRegistry(client, logger);
			if (mcpSeedResult.seeded) {
				logger.info(`Seeded ${String(mcpSeedResult.count)} MCP registry server(s)${tag}`);
			} else {
				logger.info(`Skipped MCP registry seed (test endpoint unavailable)${tag}`);
			}

			// --build-via-mcp: enable MCP and set up the lane's build-user pool.
			// Each lane is a self-contained build+verify target — a workflow built
			// here is verified here, so N lanes parallelize the whole pipeline.
			let mcpUserPool: LaneUserPool | undefined;
			if (args.buildViaMcp) {
				await client.enableMcpAccess();
				mcpUserPool = new LaneUserPool(client);
			}

			const preRunWorkflowIds = await snapshotWorkflowIds(client);
			const preRunDataTableIds = await snapshotDataTableIds(client);
			const claimedWorkflowIds = new Set<string>();
			const createdCredentialIds = new Set<string>();
			const workflowIdsToDelete = new Set<string>();
			return {
				client,
				baseUrl,
				preRunWorkflowIds,
				preRunDataTableIds,
				claimedWorkflowIds,
				createdCredentialIds,
				workflowIdsToDelete,
				mcpUserPool,
			};
		}),
	);

	return lanes;
}

/** Per-lane cleanup: each lane only holds the workflows built/fetched on it,
 *  so delete them via that lane's own client (multi-lane MCP builds spread
 *  workflows across lanes; a single-lane cleanup would 404 on the rest). */
export async function cleanupLanes(
	lanes: Lane[],
	cleanupBuiltWorkflows: boolean,
	logger: EvalLogger,
): Promise<void> {
	await Promise.all(
		lanes.map(async (lane) => {
			if (cleanupBuiltWorkflows && lane.workflowIdsToDelete.size > 0) {
				await cleanupPrebuiltWorkflows(lane.client, lane.workflowIdsToDelete, logger);
			}
			await cleanupCredentials(lane.client, [...lane.createdCredentialIds]).catch(() => {});
			// Deleting a user deletes their remaining data, so keep the build
			// users when workflows are kept.
			if (cleanupBuiltWorkflows && lane.mcpUserPool) {
				await cleanupLaneUsers(lane.client, lane.mcpUserPool, logger);
			}
		}),
	);
}
