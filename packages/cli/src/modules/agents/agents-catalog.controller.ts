import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { Get, ProjectScope, RestController } from '@n8n/decorators';

import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { filterOfferedAgentModelProviders } from './model-catalog';

@RestController('/projects/:projectId/agents/v2')
export class AgentsCatalogController {
	constructor(
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
	) {}

	@Get('/catalog/models')
	@ProjectScope('agent:read')
	async getModelCatalog() {
		const { fetchProviderCatalog } = await import('@n8n/agents');
		return filterOfferedAgentModelProviders(await fetchProviderCatalog());
	}

	@Get('/catalog/integrations')
	@ProjectScope('agent:read')
	listIntegrations(): ChatIntegrationDescriptor[] {
		return this.agentIntegrationPersistenceService.listChatIntegrations();
	}
}
