import type { Daytona, DaytonaError as TDaytonaError, Image } from '@daytona/sdk';
import { buildRuntimeSkillWorkspaceBundle } from '@n8n/agents';
import { DAYTONA_WORKSPACE_ROOT, loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { N8N_VERSION } from '@/constants';

import { createFullBuiltinRuntimeSkillSource } from './skills/builtin-runtime-skills';

export interface CreateAgentSandboxSnapshotOptions {
	timeout?: number;
	onLogs?: (chunk: string) => void;
}

const PACKAGE_JSON = JSON.stringify(
	{
		type: 'module',
		dependencies: {
			tsx: 'latest',
		},
	},
	null,
	2,
);

const DAYTONA_WORKSPACE_BAKE_ROOT = '/tmp/n8n-agent-skills-bake';

function isAlreadyExistsError(error: unknown): error is TDaytonaError {
	const { DaytonaError } = loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error.statusCode === 409) return true;
	return /already exists/i.test(error.message);
}

async function stageWorkspaceFilesForImage(
	files: Map<string, string | Buffer>,
	workspaceRoot: string,
): Promise<string> {
	const stagingDir = await mkdtemp(path.join(tmpdir(), 'n8n-agent-skills-'));

	await Promise.all(
		[...files].map(async ([workspacePath, content]) => {
			const relativePath = path.posix.relative(workspaceRoot, workspacePath);
			if (!relativePath || relativePath.startsWith('..') || path.posix.isAbsolute(relativePath)) {
				throw new Error(`Cannot stage file outside Daytona workspace root: ${workspacePath}`);
			}

			const destination = path.join(stagingDir, relativePath);
			await mkdir(path.dirname(destination), { recursive: true });
			await writeFile(destination, content);
		}),
	);

	return stagingDir;
}

@Service()
export class AgentSandboxSnapshotService {
	private cachedImage: Promise<Image> | undefined;
	private stagingDir: string | undefined;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {}

	snapshotName(version: string = N8N_VERSION): string {
		return `n8n/agent-skills:${version}`;
	}

	async ensureImage(): Promise<Image> {
		this.cachedImage ??= this.prepareImage();
		return await this.cachedImage;
	}

	async createSnapshot(
		daytona: Daytona,
		options?: CreateAgentSandboxSnapshotOptions,
	): Promise<string> {
		const name = this.snapshotName();
		try {
			await daytona.snapshot.create({ name, image: await this.ensureImage() }, options);
			this.logger.info('Created regular agent skills Daytona snapshot', { name });
			return name;
		} catch (error) {
			if (isAlreadyExistsError(error)) {
				this.logger.info('Regular agent skills Daytona snapshot already exists', { name });
				return name;
			}
			throw error;
		}
	}

	invalidate(): void {
		const stagingDir = this.stagingDir;
		this.cachedImage = undefined;
		this.stagingDir = undefined;
		if (stagingDir) {
			void rm(stagingDir, { recursive: true, force: true });
		}
	}

	private async prepareImage(): Promise<Image> {
		const bundle = await buildRuntimeSkillWorkspaceBundle({
			source: createFullBuiltinRuntimeSkillSource(),
			root: DAYTONA_WORKSPACE_ROOT,
		});
		const files = new Map<string, string | Buffer>(bundle?.files ?? []);
		files.set(`${DAYTONA_WORKSPACE_ROOT}/package.json`, PACKAGE_JSON);
		const stagingDir = await stageWorkspaceFilesForImage(files, DAYTONA_WORKSPACE_ROOT);
		this.stagingDir = stagingDir;

		const { Image } = loadDaytona();
		const image = Image.base(this.agentsConfig.sandboxImage || 'daytonaio/sandbox:0.5.0')
			.addLocalDir(stagingDir, DAYTONA_WORKSPACE_BAKE_ROOT)
			.runCommands(
				`cp -a ${DAYTONA_WORKSPACE_BAKE_ROOT}/. ${DAYTONA_WORKSPACE_ROOT}/ && cd ${DAYTONA_WORKSPACE_ROOT} && npm install --ignore-scripts`,
			);

		this.logger.info('Prepared regular agent skills Daytona image descriptor', {
			dockerfileLength: image.dockerfile.length,
			runtimeSkillsHash: bundle?.skillsHash,
			runtimeSkillFiles: bundle?.files.size ?? 0,
			stagingDir,
		});

		return image;
	}
}
