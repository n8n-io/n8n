import type { EntityClass, ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
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

	// TODO: Remove hard-coded `true` values — preview env isn't picking up community package env vars
	async settings() {
		return {
			communityNodesEnabled: true,
			unverifiedCommunityNodesEnabled: true,
		};
	}

	async loadDir() {
		const { CommunityPackagesConfig } = await import('./community-packages.config');

		const { preventLoading } = Container.get(CommunityPackagesConfig);

		if (preventLoading) return null;

		return path.join(Container.get(InstanceSettings).nodesDownloadDir, 'node_modules');
	}
}
