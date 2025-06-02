import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

import { CommunityNodesPackagesService } from './community-nodes-packages.service';
import { CommunityNodesConfig } from './community-nodes.config';
import './community-nodes-packages.controller';
import './community-nodes-types.controller';

@BackendModule({ name: 'community-nodes' })
export class CommunityNodesModule implements ModuleInterface {
	constructor(
		private readonly logger: Logger,
		private readonly config: CommunityNodesConfig,
		private readonly packagesService: CommunityNodesPackagesService,
	) {
		this.logger = this.logger.scoped('community-nodes');
	}

	async init() {
		if (this.config.enabled) {
			await this.packagesService.init();
		}
	}
}
