/**
 * Builder Sandbox Factory
 *
 * Creates an ephemeral sandbox + workspace per builder invocation.
 * - Daytona mode: creates from pre-warmed Image (config + deps baked in),
 *   then writes the node-types catalog post-creation via filesystem API.
 * - Local mode: per-builder subdirectory with full setup (development only)
 */

import { Daytona } from '@daytonaio/sdk';
import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { DaytonaSandbox } from '@mastra/daytona';

import type { SandboxConfig } from './create-workspace';
import { DaytonaFilesystem } from './daytona-filesystem';
import { writeFileViaSandbox } from './sandbox-fs';
import type { SnapshotManager } from './snapshot-manager';
import type { InstanceAiContext } from '../types';
import { formatNodeCatalogLine, getWorkspaceRoot, setupSandboxWorkspace } from './sandbox-setup';

export interface BuilderWorkspace {
	workspace: Workspace;
	cleanup: () => Promise<void>;
}

async function cleanupTrackedSandboxProcesses(workspace: Workspace): Promise<void> {
	const processManager = workspace.sandbox?.processes;
	if (!processManager) return;

	let processes: Awaited<ReturnType<typeof processManager.list>>;
	try {
		processes = await processManager.list();
	} catch {
		return;
	}

	// Dismiss finished handles and stop any lingering processes so the workspace
	// does not keep stdout/stderr listener closures alive after builder cleanup.
	for (const process of processes) {
		try {
			if (process.running) {
				await processManager.kill(process.pid);
			} else {
				await processManager.get(process.pid);
			}
		} catch {
			// Best-effort cleanup
		}
	}
}

export class BuilderSandboxFactory {
	private daytona: Daytona | null = null;

	constructor(
		private readonly config: SandboxConfig,
		private readonly imageManager?: SnapshotManager,
	) {}

	async create(builderId: string, context: InstanceAiContext): Promise<BuilderWorkspace> {
		if (this.config.provider === 'local') {
			return await this.createLocal(builderId, context);
		}
		return await this.createDaytona(builderId, context);
	}

	private async getDaytona(): Promise<Daytona> {
		if (this.config.getAuthToken) {
			// Proxy mode: create a fresh client with a fresh JWT each time
			const apiKey = await this.config.getAuthToken();
			return new Daytona({ apiKey, apiUrl: this.config.daytonaApiUrl });
		}
		// Direct mode: cache the client (Daytona API keys don't expire)
		this.daytona ??= new Daytona({
			apiKey: this.config.daytonaApiKey,
			apiUrl: this.config.daytonaApiUrl,
		});
		return this.daytona;
	}

	/** Cached node-types catalog string — generated once, reused across builders. */
	private catalogCache: string | null = null;

	private async getNodeCatalog(context: InstanceAiContext): Promise<string> {
		if (this.catalogCache) return this.catalogCache;
		const nodeTypes = await context.nodeService.listSearchable();
		this.catalogCache = nodeTypes.map(formatNodeCatalogLine).join('\n');
		return this.catalogCache;
	}

	private async createDaytona(
		builderId: string,
		context: InstanceAiContext,
	): Promise<BuilderWorkspace> {
		// Get pre-warmed image (config + deps, no catalog — catalog is too large for API body)
		const image = this.imageManager!.ensureImage();

		// Start sandbox creation AND catalog generation in parallel
		const daytona = await this.getDaytona();
		const [sandbox, catalog] = await Promise.all([
			daytona.create(
				{
					image,
					language: 'typescript',
					ephemeral: true,
					labels: { 'n8n-builder': builderId },
				},
				{
					timeout: 300,
				},
			),
			this.getNodeCatalog(context),
		]);

		// Wrap raw Sandbox in DaytonaSandbox for Mastra Workspace compatibility.
		// DaytonaSandbox.start() reconnects to the existing sandbox by ID.
		// Use the same apiKey source as getDaytona() — fresh token in proxy mode, static key in direct mode.
		const apiKey = this.config.getAuthToken
			? await this.config.getAuthToken()
			: this.config.daytonaApiKey;
		const daytonaSandbox = new DaytonaSandbox({
			id: sandbox.id,
			apiKey,
			apiUrl: this.config.daytonaApiUrl,
			language: 'typescript',
			timeout: this.config.timeout ?? 300_000,
		});

		const workspace = new Workspace({
			sandbox: daytonaSandbox,
			filesystem: new DaytonaFilesystem(daytonaSandbox),
		});

		await workspace.init();

		// Write node-types catalog (too large for dockerfile, written post-creation via filesystem API)
		const root = await getWorkspaceRoot(workspace);
		if (workspace.filesystem) {
			await workspace.filesystem.writeFile(`${root}/node-types/index.txt`, catalog);
		} else {
			await writeFileViaSandbox(workspace, `${root}/node-types/index.txt`, catalog);
		}

		return {
			workspace,
			cleanup: async () => {
				await cleanupTrackedSandboxProcesses(workspace);
				try {
					// Get a fresh client for cleanup — the original token may have expired
					const cleanupDaytona = await this.getDaytona();
					await cleanupDaytona.delete(sandbox);
				} catch {
					// Best-effort cleanup
				}
			},
		};
	}

	private async createLocal(
		builderId: string,
		context: InstanceAiContext,
	): Promise<BuilderWorkspace> {
		const dir = `./workspace-builders/${builderId}`;
		const sandbox = new LocalSandbox({ workingDirectory: dir });
		const workspace = new Workspace({
			sandbox,
			filesystem: new LocalFilesystem({ basePath: dir }),
		});
		await workspace.init();
		await setupSandboxWorkspace(workspace, context);

		return {
			workspace,
			cleanup: async () => {
				await cleanupTrackedSandboxProcesses(workspace);
				// Local cleanup keeps the directory for debugging.
			},
		};
	}
}
