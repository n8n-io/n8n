// ---------------------------------------------------------------------------
// Lane setup — one authenticated n8n lane per --base-url (TRUST-261):
// login, MCP-registry seed, optional `claude` MCP config staging, and the
// pre-run workflow snapshot. Plus the end-of-run per-lane artifact cleanup.
// ---------------------------------------------------------------------------

import { unlinkSync } from 'fs';

import type { Lane } from './build-orchestrator';
import type { CliArgs } from '../cli/args';
import { stageLaneMcpConfig } from '../cli/mcp-builder';
import { N8nClient } from '../clients/n8n-client';
import { cleanupCredentials } from '../credentials/seeder';
import type { EvalLogger } from '../harness/logger';
import { cleanupPrebuiltWorkflows } from '../harness/prebuilt-workflows';
import { seedMcpRegistry } from '../mcp-registry/seeder';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';

export interface LaneSetup {
	lanes: Lane[];
	/** Removes staged `claude` MCP configs (they embed lane bearer tokens). Also
	 *  registered on process exit; calling it twice is safe. */
	cleanupStagedMcpConfigs: () => void;
}

export async function setupLanes(args: CliArgs, logger: EvalLogger): Promise<LaneSetup> {
	// Remove staged MCP configs (they embed the lane's bearer token) on exit,
	// belt-and-suspenders alongside the explicit finally cleanup below.
	// Registered before lane init and populated as configs are staged, so a
	// lane failing setup can't strand another lane's already-staged token file.
	const stagedMcpConfigPaths: string[] = [];
	const cleanupStagedMcpConfigs = () => {
		for (const path of stagedMcpConfigPaths) {
			try {
				unlinkSync(path);
			} catch {
				// best-effort
			}
		}
	};
	if (args.buildViaMcp) process.on('exit', cleanupStagedMcpConfigs);

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

			// --build-via-mcp: enable MCP, mint this lane's own API key, and stage a
			// `claude` MCP config pointing at this lane's MCP server. Each lane is a
			// self-contained build+verify target — a workflow built here is verified
			// here, so N lanes parallelize the whole pipeline within one process.
			let mcpConfigPath: string | undefined;
			if (args.buildViaMcp) {
				await client.enableMcpAccess();
				const apiKey = await client.rotateMcpApiKey();
				mcpConfigPath = stageLaneMcpConfig({
					serverName: args.mcpServerName,
					url: `${baseUrl}/mcp-server/http`,
					apiKey,
				});
				stagedMcpConfigPaths.push(mcpConfigPath);
				logger.info(`Staged MCP build config${tag}`);
			}

			const preRunWorkflowIds = await snapshotWorkflowIds(client);
			const claimedWorkflowIds = new Set<string>();
			const createdCredentialIds = new Set<string>();
			const workflowIdsToDelete = new Set<string>();
			return {
				client,
				baseUrl,
				preRunWorkflowIds,
				claimedWorkflowIds,
				createdCredentialIds,
				workflowIdsToDelete,
				mcpConfigPath,
			};
		}),
	);

	return { lanes, cleanupStagedMcpConfigs };
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
		}),
	);
}
