import type { Daytona, Image } from '@daytona/sdk';
import { buildRuntimeSkillWorkspaceBundle } from '@n8n/agents';
import { DAYTONA_WORKSPACE_ROOT, loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { N8N_VERSION } from '@/constants';

import { createBuiltinRuntimeSkillSource } from './skills/builtin-runtime-skills';

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

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function writeFileCommand(path: string, content: string | Buffer): string {
	const base64 =
		typeof content === 'string'
			? Buffer.from(content, 'utf-8').toString('base64')
			: content.toString('base64');
	const directory = path.slice(0, path.lastIndexOf('/'));
	return `mkdir -p ${shellEscape(directory)} && printf '%s' ${shellEscape(base64)} | base64 -d > ${shellEscape(path)}`;
}

@Service()
export class AgentSandboxSnapshotService {
	private cachedImage: Promise<Image> | undefined;

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
		await daytona.snapshot.create({ name, image: await this.ensureImage() }, options);
		this.logger.info('Created regular agent skills Daytona snapshot', { name });
		return name;
	}

	invalidate(): void {
		this.cachedImage = undefined;
	}

	private async prepareImage(): Promise<Image> {
		const bundle = await buildRuntimeSkillWorkspaceBundle({
			source: createBuiltinRuntimeSkillSource(),
			root: DAYTONA_WORKSPACE_ROOT,
		});
		const files = new Map<string, string | Buffer>(bundle?.files ?? []);
		files.set(`${DAYTONA_WORKSPACE_ROOT}/package.json`, PACKAGE_JSON);

		const commands = [...files].map(([path, content]) => writeFileCommand(path, content));
		commands.push(`cd ${shellEscape(DAYTONA_WORKSPACE_ROOT)} && npm install --ignore-scripts`);

		const { Image } = loadDaytona();
		const image = Image.base(
			this.agentsConfig.sandboxImage || 'daytonaio/sandbox:0.5.0',
		).runCommands(...commands);

		this.logger.info('Prepared regular agent skills Daytona image descriptor', {
			dockerfileLength: image.dockerfile.length,
			runtimeSkillsHash: bundle?.skillsHash,
			runtimeSkillFiles: bundle?.files.size ?? 0,
		});

		return image;
	}
}
