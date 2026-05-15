import { GlobalConfig } from '@n8n/config';
import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings, scanDirectoryForPackages } from 'n8n-core';
import path from 'node:path';

@BackendModule({ name: 'community-packages' })
export class CommunityPackagesModule implements ModuleInterface {
	async init() {
		await import('./community-packages.controller');
		await import('./community-node-types.controller');
	}

	async commands() {
		await import('./community-node.command');
	}

	async entities() {
		const { InstalledNodes } = await import('./installed-nodes.entity');
		const { InstalledPackages } = await import('./installed-packages.entity');

		return [InstalledNodes, InstalledPackages] as EntityClass[];
	}

	async settings() {
		const { CommunityPackagesConfig } = await import('./community-packages.config');

		return {
			communityNodesEnabled: Container.get(CommunityPackagesConfig).enabled,
			unverifiedCommunityNodesEnabled: Container.get(CommunityPackagesConfig).unverifiedEnabled,
		};
	}

	async nodeLoaders() {
		const { CommunityPackagesConfig } = await import('./community-packages.config');
		if (Container.get(CommunityPackagesConfig).preventLoading) return [];

		const dir = path.join(Container.get(InstanceSettings).nodesDownloadDir, 'node_modules');
		const { nodes } = Container.get(GlobalConfig);
		return await scanDirectoryForPackages(dir, {
			excludeNodes: nodes.exclude,
			includeNodes: nodes.include,
		});
	}
}
