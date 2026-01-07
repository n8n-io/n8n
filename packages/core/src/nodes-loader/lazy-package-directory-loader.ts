import type { INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';

import { PackageDirectoryLoader } from './package-directory-loader';

/**
 * This loader extends PackageDirectoryLoader to load node and credentials lazily, if possible
 */
export class LazyPackageDirectoryLoader extends PackageDirectoryLoader {
	private fullNodeDefinitionsPath?: string;

	override async loadAll() {
		try {
			this.known.nodes = await this.readJSON('dist/known/nodes.json');
			this.known.credentials = await this.readJSON('dist/known/credentials.json');

			try {
				this.types.manifests = await this.readJSON('dist/types/manifests.json');
				this.fullNodeDefinitionsPath = path.join(this.directory, 'dist/types/nodes.json');
			} catch {
				this.types.nodes = await this.readJSON('dist/types/nodes.json');
			}

			this.types.credentials = await this.readJSON('dist/types/credentials.json');

			if (this.removeNonIncludedNodes) {
				const allowedNodes: typeof this.known.nodes = {};
				for (const nodeType of this.includeNodes) {
					if (nodeType in this.known.nodes) {
						allowedNodes[nodeType] = this.known.nodes[nodeType];
					}
				}
				this.known.nodes = allowedNodes;

				if (this.types.manifests) {
					this.types.manifests = this.types.manifests.filter((manifest) =>
						this.includeNodes.includes(manifest.name),
					);
				}
				if (this.types.nodes) {
					this.types.nodes = this.types.nodes.filter((nodeType) =>
						this.includeNodes.includes(nodeType.name),
					);
				}
			}

			if (this.excludeNodes.length) {
				for (const nodeType of this.excludeNodes) {
					delete this.known.nodes[nodeType];
				}

				if (this.types.manifests) {
					this.types.manifests = this.types.manifests.filter(
						(manifest) => !this.excludeNodes.includes(manifest.name),
					);
				}
				if (this.types.nodes) {
					this.types.nodes = this.types.nodes.filter(
						(nodeType) => !this.excludeNodes.includes(nodeType.name),
					);
				}
			}

			this.logger.debug(`Lazy-loading nodes and credentials from ${this.packageJson.name}`, {
				manifests: this.types.manifests?.length ?? 0,
				nodes: this.types.nodes?.length ?? 0,
				credentials: this.types.credentials?.length ?? 0,
			});

			this.isLazyLoaded = true;

			return; // We can load nodes and credentials lazily now
		} catch {
			this.logger.debug("Can't enable lazy-loading");
			await super.loadAll();
		}
	}

	async getFullDefinition(nodeType: string): Promise<INodeTypeDescription | undefined> {
		if (this.types.nodes?.length) {
			return this.types.nodes.find((d) => d.name === nodeType);
		}

		if (!this.fullNodeDefinitionsPath) {
			return undefined;
		}

		// @TODO: Replace nodes.json with individual JSON files per node
		try {
			const allDefinitions: INodeTypeDescription[] = await this.readJSON('dist/types/nodes.json');
			return allDefinitions.find((d) => d.name === nodeType);
		} catch (error) {
			this.logger.warn(
				`Failed to load full node definitions from ${this.fullNodeDefinitionsPath}`,
				{ error },
			);
			return undefined;
		}
	}
}
