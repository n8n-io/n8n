import { writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
	IBinaryData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING, Node, NodeOperationError } from 'n8n-workflow';

import { executeCli, verifyBinary } from '../execution/cli-executor';
import { buildHarnessOutput } from '../output/output-builder';
import type { ChangedFile, HarnessDiff, HarnessEvent, Workspace } from '../types';
import { removeGitLockFile } from '../workspace/git-operations';
import { WorkspaceManager } from '../workspace/workspace-manager';

const DEFAULT_WORKSPACE_ROOT = '/tmp/n8n-harness-workspaces';
const DEFAULT_TIMEOUT = 600;
const DEFAULT_MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Abstract base class for all Harness nodes.
 *
 * Implements the full harness lifecycle:
 *   preflight → workspace setup → CLI execution → diff → output → cleanup
 *
 * Subclasses only need to implement:
 * - `buildCommand()` — returns the CLI command and arguments
 * - `buildEnv()`     — returns the environment variables
 * - `parseEvents()`  — parses CLI-specific stdout format (optional)
 */
export abstract class BaseHarnessNode extends Node {
	abstract description: INodeTypeDescription;

	protected workspace?: Workspace;

	// ---------------------------------------------------------------------------
	// Subclass API
	// ---------------------------------------------------------------------------

	/** Build the CLI command and arguments for this harness. */
	protected abstract buildCommand(
		ctx: IExecuteFunctions,
		itemIndex: number,
	): { command: string; args: string[] };

	/**
	 * Build the environment variables for this harness.
	 * Should include API keys from credentials and any harness-specific flags.
	 */
	protected abstract buildEnv(
		ctx: IExecuteFunctions,
		itemIndex: number,
	): Promise<Record<string, string>>;

	/**
	 * Parse harness-specific stdout into structured events.
	 * Default: returns an empty array.
	 */
	protected parseEvents(_stdout: string): HarnessEvent[] {
		return [];
	}

	/** Base environment variables available to all harnesses. */
	protected getBaseEnv(): Record<string, string> {
		return {
			PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
			HOME: this.workspace?.path ?? process.env.HOME ?? '/tmp',
			LANG: 'en_US.UTF-8',
		};
	}

	// ---------------------------------------------------------------------------
	// Main execution lifecycle
	// ---------------------------------------------------------------------------

	async execute(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const workspaceSource = ctx.getNodeParameter('workspaceSource', 0) as string;
		const timeout = ctx.getNodeParameter('timeout', 0, DEFAULT_TIMEOUT) as number;
		const retainWorkspace = ctx.getNodeParameter('retainWorkspace', 0, false) as boolean;

		// --- 1. Pre-flight check ---
		const { command } = this.buildCommand(ctx, 0);
		const preflight = await verifyBinary(command);
		if (!preflight.available) {
			throw new NodeOperationError(ctx.getNode(), `${command} CLI is not installed`, {
				description: preflight.error ?? `Install '${command}' and ensure it is in PATH.`,
			});
		}

		// --- 2. Workspace setup ---
		const workspaceRoot = process.env.N8N_HARNESS_WORKSPACE_ROOT || DEFAULT_WORKSPACE_ROOT;
		const retentionSeconds = parseInt(
			process.env.N8N_HARNESS_WORKSPACE_RETENTION_SECONDS || '0',
			10,
		);
		const workspaceManager = new WorkspaceManager(workspaceRoot, retentionSeconds);

		const executionId = ctx.getExecutionId?.() ?? `exec-${Date.now()}`;
		const workflowId = ctx.getWorkflow().id ?? 'unknown';

		let workspace: Workspace | undefined;

		try {
			// Populate workspace based on source type.
			switch (workspaceSource) {
				case 'previous': {
					const inputItems = ctx.getInputData();
					const prevPath = inputItems[0]?.json?.workspacePath;
					if (!prevPath || typeof prevPath !== 'string') {
						throw new NodeOperationError(ctx.getNode(), 'No workspace path found in input data', {
							description:
								'Connect a harness node with "Retain Workspace" enabled, or choose a different workspace source.',
						});
					}
					await stat(prevPath);
					workspace = { path: prevPath, workflowId, executionId };
					// Create a new baseline so this node's diff is isolated.
					await workspaceManager.commitCurrentState(workspace, `baseline-${executionId}`);
					break;
				}

				case 'git': {
					workspace = await workspaceManager.create(workflowId, executionId);
					const repoUrl = ctx.getNodeParameter('repoUrl', 0) as string;
					const branch = ctx.getNodeParameter('branch', 0, 'main') as string;

					// Inject git credentials if provided.
					let effectiveUrl = repoUrl;
					try {
						const gitCredentials = await ctx.getCredentials('gitPassword');
						if (gitCredentials?.username && gitCredentials?.password) {
							const url = new URL(repoUrl);
							url.username = gitCredentials.username as string;
							url.password = gitCredentials.password as string;
							effectiveUrl = url.toString();
						}
					} catch {
						// No git credentials configured — use the URL as-is.
					}

					await workspaceManager.populateFromGit(workspace, effectiveUrl, branch);
					await workspaceManager.initBaseline(workspace);
					break;
				}

				case 'directory': {
					workspace = await workspaceManager.create(workflowId, executionId);
					const directoryPath = ctx.getNodeParameter('directoryPath', 0) as string;
					await workspaceManager.populateFromDirectory(workspace, directoryPath);
					await workspaceManager.initBaseline(workspace);
					break;
				}

				case 'input': {
					workspace = await workspaceManager.create(workflowId, executionId);
					const items = ctx.getInputData();
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						if (!item.binary) continue;
						for (const [key, binaryMeta] of Object.entries(item.binary) as Array<
							[string, IBinaryData]
						>) {
							const filePath = binaryMeta.fileName || key;
							let buffer: Buffer;
							if (binaryMeta.id) {
								buffer = await ctx.helpers.getBinaryDataBuffer(i, key);
							} else {
								buffer = Buffer.from(binaryMeta.data, BINARY_ENCODING);
							}
							const targetPath = join(workspace.path, filePath);
							await mkdir(dirname(targetPath), { recursive: true });
							await writeFile(targetPath, buffer);
						}
					}
					await workspaceManager.initBaseline(workspace);
					break;
				}

				default:
					throw new NodeOperationError(
						ctx.getNode(),
						`Unknown workspace source: ${workspaceSource}`,
					);
			}

			this.workspace = workspace;

			// --- 3. Execute CLI ---
			const { command: cmd, args } = this.buildCommand(ctx, 0);
			const env = await this.buildEnv(ctx, 0);

			const result = await executeCli(
				{
					command: cmd,
					args,
					workDir: workspace.path,
					env,
					timeout,
					maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
				},
				{
					signal: ctx.getExecutionCancelSignal(),
				},
			);

			// --- 4. Collect results ---
			// Clean up stale git lock files left by interrupted CLI operations.
			await removeGitLockFile(workspace.path);

			// Compute diff (best-effort — if git state is corrupted, return empty diff).
			let diff: HarnessDiff;
			let changedFiles: ChangedFile[];
			try {
				diff = await workspaceManager.computeDiff(workspace);
				changedFiles = await workspaceManager.getChangedFiles(workspace);
			} catch {
				diff = {
					unified: '',
					stats: { additions: 0, deletions: 0, filesChanged: 0 },
					files: [],
				};
				changedFiles = [];
			}

			const events = this.parseEvents(result.stdout);

			// --- 5. Build output ---
			return await buildHarnessOutput(
				ctx,
				result,
				diff,
				changedFiles,
				events,
				retainWorkspace ? workspace.path : null,
			);
		} catch (error) {
			// --- Error handling with continueOnFail support ---
			if (ctx.continueOnFail()) {
				const emptyDiff = {
					stats: { filesChanged: 0, additions: 0, deletions: 0 },
					files: [] as Array<{
						path: string;
						status: string;
						additions: number;
						deletions: number;
						patch: string;
					}>,
					unified: '',
				};
				return [
					[
						{
							json: {
								success: false,
								exitCode: -1,
								duration: 0,
								diff: emptyDiff,
								events: [],
								workspacePath: null,
								stdout: '',
								stderr: '',
								error: error instanceof Error ? error.message : String(error),
							},
							pairedItem: { item: 0 },
						},
					],
					[{ json: {}, pairedItem: { item: 0 } }],
				];
			}

			if (error instanceof NodeOperationError) throw error;
			throw new NodeOperationError(
				ctx.getNode(),
				error instanceof Error ? error.message : String(error),
			);
		} finally {
			// --- 6. Cleanup ---
			// Only clean up workspaces we created (not 'previous' source),
			// and only when retainWorkspace is false.
			if (workspace && !retainWorkspace && workspaceSource !== 'previous') {
				await workspaceManager.cleanup(workspace);
			}
		}
	}
}
