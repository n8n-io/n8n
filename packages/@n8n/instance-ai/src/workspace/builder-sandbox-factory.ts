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
import assert from 'node:assert/strict';

import type { SandboxConfig } from './create-workspace';
import { DaytonaFilesystem } from './daytona-filesystem';
import { N8nSandboxFilesystem } from './n8n-sandbox-filesystem';
import { N8nSandboxImageManager } from './n8n-sandbox-image-manager';
import { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';
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

	private n8nSandboxImageManager: N8nSandboxImageManager | null = null;

	constructor(
		private readonly config: SandboxConfig,
		private readonly imageManager?: SnapshotManager,
	) {}

	async create(builderId: string, context: InstanceAiContext): Promise<BuilderWorkspace> {
		if (this.config.provider === 'local') {
			return await this.createLocal(builderId, context);
		}
		if (this.config.provider === 'n8n-sandbox') {
			return await this.createN8nSandbox(builderId, context);
		}
		return await this.createDaytona(builderId, context);
	}

	private async getDaytona(): Promise<Daytona> {
		const config = this.assertIsDaytona();
		if (config.getAuthToken) {
			// Proxy mode: create a fresh client with a fresh JWT each time
			const apiKey = await config.getAuthToken();
			return new Daytona({ apiKey, apiUrl: config.daytonaApiUrl });
		}
		// Direct mode: cache the client (Daytona API keys don't expire)
		this.daytona ??= new Daytona({
			apiKey: config.daytonaApiKey,
			apiUrl: config.daytonaApiUrl,
		});
		return this.daytona;
	}

	private getN8nSandboxImageManager(): N8nSandboxImageManager {
		this.n8nSandboxImageManager ??= new N8nSandboxImageManager();
		return this.n8nSandboxImageManager;
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
		const config = this.assertIsDaytona();
		assert(this.imageManager, 'Daytona snapshot manager required');

		// Get pre-warmed image (config + deps, no catalog — catalog is too large for API body)
		const image = this.imageManager.ensureImage();

		// Start sandbox creation AND catalog generation in parallel
		const createSandboxFn = async () => {
			const daytona = await this.getDaytona();
			return await daytona.create(
				{
					image,
					language: 'typescript',
					ephemeral: true,
					labels: { 'n8n-builder': builderId },
				},
				{ timeout: 300 },
			);
		};

		const [sandbox, catalog] = await Promise.all([createSandboxFn(), this.getNodeCatalog(context)]);

		const deleteSandbox = async () => {
			try {
				const d = await this.getDaytona();
				await d.delete(sandbox);
			} catch {
				// Best-effort cleanup
			}
		};

		try {
			// Wrap raw Sandbox in DaytonaSandbox for Mastra Workspace compatibility.
			// DaytonaSandbox.start() reconnects to the existing sandbox by ID.
			// Use the same apiKey source as getDaytona() — fresh token in proxy mode, static key in direct mode.
			const apiKey = config.getAuthToken ? await config.getAuthToken() : config.daytonaApiKey;
			const daytonaSandbox = new DaytonaSandbox({
				id: sandbox.id,
				apiKey,
				apiUrl: config.daytonaApiUrl,
				language: 'typescript',
				timeout: config.timeout ?? 300_000,
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
					await deleteSandbox();
				},
			};
		} catch (error) {
			await deleteSandbox();
			throw error;
		}
	}

	private async createN8nSandbox(
		_builderId: string,
		context: InstanceAiContext,
	): Promise<BuilderWorkspace> {
		const config = this.assertIsN8nSandbox();

		const dockerfile = this.getN8nSandboxImageManager().getDockerfile();
		const catalog = await this.getNodeCatalog(context);

		const sandbox = new N8nSandboxServiceSandbox({
			apiKey: config.apiKey,
			serviceUrl: config.serviceUrl,
			timeout: config.timeout ?? 300_000,
			dockerfile,
		});

		const workspace = new Workspace({
			sandbox,
			filesystem: new N8nSandboxFilesystem(sandbox),
		});

		await workspace.init();

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
					await sandbox.destroy();
				} catch {
					// Best-effort cleanup
				}
			},
		};
	}

	private assertIsDaytona(): Extract<SandboxConfig, { enabled: true; provider: 'daytona' }> {
		assert(
			this.config.enabled && this.config.provider === 'daytona',
			'Daytona sandbox config required',
		);
		return this.config;
	}

	private assertIsN8nSandbox(): Extract<SandboxConfig, { enabled: true; provider: 'n8n-sandbox' }> {
		assert(
			this.config.enabled && this.config.provider === 'n8n-sandbox',
			'n8n sandbox config required',
		);
		return this.config;
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
