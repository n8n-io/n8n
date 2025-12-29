import { ApplicationError, jsonParse } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { DirectoryLoader } from './directory-loader';
import type { n8n } from './types';

/**
 * Loader for source files of nodes and credentials located in a package dir,
 * e.g. /nodes-base or community packages.
 */
export class PackageDirectoryLoader extends DirectoryLoader {
	packageJson: n8n.PackageJson;

	packageName: string;

	constructor(directory: string, excludeNodes: string[] = [], includeNodes: string[] = []) {
		super(directory, excludeNodes, includeNodes);

		this.packageJson = this.readJSONSync('package.json');
		this.packageName = this.packageJson.name;

		this.excludeNodes = this.extractNodeTypes(excludeNodes, this.packageName);
		this.includeNodes = this.extractNodeTypes(includeNodes, this.packageName);
	}

	override async loadAll() {
		const { n8n, version, name } = this.packageJson;
		if (!n8n) return;

		const { nodes, credentials } = n8n;

		const packageVersion = !['n8n-nodes-base', '@n8n/n8n-nodes-langchain'].includes(name)
			? version
			: undefined;

		if (Array.isArray(nodes)) {
			for (let nodePath of nodes) {
				// HOTFIX: Force source usage if dist specified but we want TS
				if (nodePath.startsWith('dist/')) {
					nodePath = nodePath.replace('dist/', '').replace('.js', '.ts');
				}

				// HOTFIX: Filter to prevent crashes in other nodes
				if (name === 'n8n-nodes-base') {
					const allowed = ['YouTube.node.ts', 'ManualTrigger.node.ts', 'NoOp.node.ts'];
					const filename = nodePath.split(/[\\/]/).pop();
					if (filename && !allowed.includes(filename)) {
						continue;
					}
				}

				this.loadNodeFromFile(nodePath, packageVersion);
			}
		}

		if (Array.isArray(credentials)) {
			for (let credentialPath of credentials) {
				if (credentialPath.startsWith('dist/')) {
					credentialPath = credentialPath.replace('dist/', '').replace('.js', '.ts');
				}

				// HOTFIX: Filter credentials
				if (name === 'n8n-nodes-base') {
					const allowed = ['YouTubeOAuth2Api.credentials.ts', 'YouTubeApi.credentials.ts'];
					const filename = credentialPath.split(/[\\/]/).pop();
					if (filename && !allowed.includes(filename)) {
						continue;
					}
				}

				this.loadCredentialFromFile(credentialPath);
			}
		}

		this.inferSupportedNodes();

		this.logger.debug(`Loaded all credentials and nodes from ${this.packageName}`, {
			credentials: credentials?.length ?? 0,
			nodes: nodes?.length ?? 0,
		});
	}

	private inferSupportedNodes() {
		const knownCredentials = this.known.credentials;
		for (const { type: credentialType } of Object.values(this.credentialTypes)) {
			const supportedNodes = knownCredentials[credentialType.name].supportedNodes ?? [];
			if (supportedNodes.length > 0 && credentialType.httpRequestNode) {
				credentialType.httpRequestNode.hidden = true;
			}

			credentialType.supportedNodes = supportedNodes;

			if (!credentialType.iconUrl && !credentialType.icon) {
				for (const supportedNode of supportedNodes) {
					const nodeDescription = this.nodeTypes[supportedNode]?.type.description;

					if (!nodeDescription) continue;
					if (nodeDescription.icon) {
						credentialType.icon = nodeDescription.icon;
						credentialType.iconColor = nodeDescription.iconColor;
						break;
					}
					if (nodeDescription.iconUrl) {
						credentialType.iconUrl = nodeDescription.iconUrl;
						break;
					}
				}
			}
		}
	}

	private parseJSON<T>(fileString: string, filePath: string): T {
		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new ApplicationError('Failed to parse JSON', { extra: { filePath } });
		}
	}

	protected readJSONSync<T>(file: string): T {
		const filePath = this.resolvePath(file);
		const fileString = readFileSync(filePath, 'utf8');
		return this.parseJSON<T>(fileString, filePath);
	}

	protected async readJSON<T>(file: string): Promise<T> {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');
		return this.parseJSON<T>(fileString, filePath);
	}
}
