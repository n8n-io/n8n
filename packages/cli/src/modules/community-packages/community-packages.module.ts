import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings, scanDirectoryForPackages } from 'n8n-core';
import path from 'node:path';

@BackendModule({ name: 'community-packages' })
export class CommunityPackagesModule implements ModuleInterface {
	async init() {
		await import('./community-packages.controller.js');
		await import('./community-node-types.controller.js');
	}

	async commands() {
		await import('./community-node.command.js');
	}

	async entities() {
		const { InstalledNodes } = await import('./installed-nodes.entity.js');
		const { InstalledPackages } = await import('./installed-packages.entity.js');

		return [InstalledNodes, InstalledPackages] as EntityClass[];
	}

	async settings() {
		const { CommunityPackagesConfig } = await import('./community-packages.config.js');

		return {
			communityNodesEnabled: Container.get(CommunityPackagesConfig).enabled,
			unverifiedCommunityNodesEnabled: Container.get(CommunityPackagesConfig).unverifiedEnabled,
		};
	}

	async nodeLoaders() {
		const { CommunityPackagesConfig } = await import('./community-packages.config.js');
		if (Container.get(CommunityPackagesConfig).preventLoading) return [];

		const dir = path.join(Container.get(InstanceSettings).nodesDownloadDir, 'node_modules');
		const { nodes } = Container.get(GlobalConfig);
		const loaders = await scanDirectoryForPackages(dir, {
			excludeNodes: nodes.exclude,
			includeNodes: nodes.include,
		});
		if (!nodes.permissionsDeny.includes('full-community')) return loaders;
		// A community package holds legacy nodes, which have full access to the n8n server.
		const logger = Container.get(Logger);
		for (const { packageName } of loaders) {
			logger.warn(
				`Community package ${packageName} does not load: N8N_NODE_PERMISSIONS_DENY denies its permission class "full-community"`,
			);
		}
		return [];
	}
}
