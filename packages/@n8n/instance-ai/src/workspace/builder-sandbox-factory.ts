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

	private getDaytona(): Daytona {
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
		const daytona = this.getDaytona();
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
		const daytonaSandbox = new DaytonaSandbox({
			id: sandbox.id,
			apiKey: this.config.daytonaApiKey,
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
				try {
					await daytona.delete(sandbox);
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
				// Local cleanup: no-op (directories persist for debugging)
			},
		};
	}
}
