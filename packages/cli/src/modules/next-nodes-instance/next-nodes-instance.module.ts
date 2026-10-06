import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

/**
 * Custom actions that users of this instance make and publish. They are `private` versions of
 * the node contracts store, so the contract loader serves them.
 */
@BackendModule({ name: 'next-nodes-instance' })
export class NextNodesInstanceModule implements ModuleInterface {
	async init() {
		if (!Container.get(GlobalConfig).instanceAi.nodeContractsEnabled) return;
		await import('./next-nodes-instance.controller.js');
	}

	async settings() {
		return { enabled: Container.get(GlobalConfig).instanceAi.nodeContractsEnabled };
	}
}
