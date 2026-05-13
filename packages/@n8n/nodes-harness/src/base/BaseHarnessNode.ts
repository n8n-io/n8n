import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { HarnessTaskResult } from '@n8n/task-runner-harness';
import { verifyBinary } from '@n8n/task-runner-harness';

import { HarnessSandbox } from '../execution/harness-sandbox';
import { buildHarnessOutput } from '../execution/output-builder';
import type { OpenCodeEvent, Workspace } from '../types';
import { WorkspaceManager } from '../workspace/workspace-manager';

/**
 * Abstract base class for all Harness nodes.
 *
 * Encodes the common execution lifecycle:
 * 1. Pre-flight check the required CLI binary
 * 2. Create a per-execution workspace
 * 3. Populate the workspace (git clone or directory copy)
 * 4. Initialize git baseline for diff tracking
 * 5. Execute the CLI via the harness task runner
 * 6. Compute diff and read changed files
 * 7. Build two-output result (Summary + Files)
 * 8. Clean up workspace
 *
 * Subclasses only need to implement:
 * - buildCommand(): returns the CLI command and arguments
 * - buildEnv(): returns the environment variables
 * - parseEvents(): parses CLI-specific stdout format (optional)
 */
export abstract class BaseHarnessNode implements INodeType {
	abstract description: INodeTypeDescription;

	protected workspace?: Workspace;

	/**
	 * Build the CLI command and arguments for this harness.
	 */
	protected abstract buildCommand(
		ctx: IExecuteFunctions,
		itemIndex: number,
	): { command: string; args: string[] };

	/**
	 * Build the environment variables for this harness.
	 * Should include API keys from credentials and any harness-specific isolation vars.
	 */
	protected abstract buildEnv(
		ctx: IExecuteFunctions,
		itemIndex: number,
	): Promise<Record<string, string>>;

	/**
	 * Parse harness-specific stdout into structured events.
	 * Default implementation returns an empty array.
	 * Override for harnesses with structured output (e.g., OpenCode JSON events).
	 */
	protected parseEvents(_stdout: string): OpenCodeEvent[] {
		return [];
	}

	/**
	 * Main execution method. Implements the full harness lifecycle.
	 */
	async execute(this: BaseHarnessNode & IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const ctx = this as unknown as IExecuteFunctions;

		// --- Configuration ---
		const workspaceSource = ctx.getNodeParameter('workspaceSource', 0) as string;
		const timeout = ctx.getNodeParameter('timeout', 0, 600) as number;

		// --- Pre-flight check ---
		const { command } = (this as unknown as BaseHarnessNode).buildCommand(ctx, 0);
		const preflight = await verifyBinary(command);
		if (!preflight.available) {
			throw new NodeOperationError(ctx.getNode(), `${command} CLI is not installed`, {
				description: preflight.error ?? `Install '${command}' and ensure it is in PATH.`,
			});
		}

		// --- Workspace setup ---
		// Use a temp directory for workspaces. In production this would come from config.
		const workspaceRoot = process.env.N8N_HARNESS_WORKSPACE_ROOT || '/tmp/n8n-harness-workspaces';
		const retentionSeconds = parseInt(
			process.env.N8N_HARNESS_WORKSPACE_RETENTION_SECONDS || '0',
			10,
		);
		const workspaceManager = new WorkspaceManager(workspaceRoot, retentionSeconds);

		const executionId = ctx.getExecutionId?.() ?? `exec-${Date.now()}`;
		const workflowId = 'workflow'; // Simplified for PoC

		const workspace = await workspaceManager.create(workflowId, executionId);
		(this as unknown as BaseHarnessNode).workspace = workspace;

		try {
			// --- Populate workspace ---
			if (workspaceSource === 'git') {
				const repoUrl = ctx.getNodeParameter('repoUrl', 0) as string;
				const branch = ctx.getNodeParameter('branch', 0, 'main') as string;
				await workspaceManager.populateFromGit(workspace, repoUrl, branch);
			} else {
				const directoryPath = ctx.getNodeParameter('directoryPath', 0) as string;
				await workspaceManager.populateFromDirectory(workspace, directoryPath);
			}

			// --- Initialize baseline ---
			await workspaceManager.initBaseline(workspace);

			// --- Build command ---
			const { command: cmd, args } = (this as unknown as BaseHarnessNode).buildCommand(ctx, 0);

			// --- Build environment ---
			const env = await (this as unknown as BaseHarnessNode).buildEnv(ctx, 0);

			// --- Execute via task runner ---
			const sandbox = new HarnessSandbox(ctx);
			let result: HarnessTaskResult;
			try {
				result = await sandbox.execute({
					command: cmd,
					args,
					workDir: workspace.path,
					env,
					timeout,
					maxOutputSize: 10 * 1024 * 1024,
				});
			} catch (error) {
				throw new NodeOperationError(
					ctx.getNode(),
					`Harness execution failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}

			// --- Compute diff ---
			const diff = await workspaceManager.computeDiff(workspace);

			// --- Read changed files ---
			const changedFiles = await workspaceManager.getChangedFiles(workspace);

			// --- Parse events ---
			const events = (this as unknown as BaseHarnessNode).parseEvents(result.stdout);

			// --- Build output ---
			const workspaceRetainedPath = retentionSeconds > 0 ? workspace.path : undefined;
			return await buildHarnessOutput(
				ctx,
				result,
				diff,
				changedFiles,
				events,
				workspaceRetainedPath,
			);
		} catch (error) {
			// Re-throw NodeOperationErrors as-is
			if (error instanceof NodeOperationError) throw error;

			throw new NodeOperationError(
				ctx.getNode(),
				`Harness execution error: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			// --- Cleanup ---
			await workspaceManager.cleanup(workspace);
		}
	}
}
