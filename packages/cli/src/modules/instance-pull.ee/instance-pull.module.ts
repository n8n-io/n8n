import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { InstancePullConfig } from './instance-pull.config';

/**
 * Git-backed release demo (instance-pull). Inert unless N8N_INSTANCE_PULL_DEMO=true.
 * When enabled, wires the internal credential-binding REST controller (prd uses it
 * to resolve required credentials for a PR). The deploy/validate public-API path
 * and its DeployService/BindingSessionService are always available via DI; this
 * module only gates the browser-facing controller.
 */
@BackendModule({ name: 'instance-pull', instanceTypes: ['main'] })
export class InstancePullModule implements ModuleInterface {
	async init() {
		if (!Container.get(InstancePullConfig).enabled) return;
		// prd binding page + dev raise-review. Each endpoint validates role/config itself.
		await import('./instance-pull.controller');
		await import('./raise-review.controller');
	}
}
