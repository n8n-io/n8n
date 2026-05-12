import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

const YELLOW = '\x1b[33m';
const CLEAR = '\x1b[0m';
const WARNING_MESSAGE =
	"[Agent] 'agent' module is experimental and proxies to ai-assistant-service. " +
	'Disabled by default; set N8N_CLOUD_AGENT_ENABLED=true to opt in. Subject to change.';

@BackendModule({ name: 'cloud-agent', instanceTypes: ['main'] })
export class AgentModule implements ModuleInterface {
	async init() {
		const logger = Container.get(Logger).scoped('cloud-agent');
		const globalConfig = Container.get(GlobalConfig);

		if (!globalConfig.cloudAgent.enabled) {
			logger.debug('Agent module disabled (set N8N_CLOUD_AGENT_ENABLED=true to enable).');
			return;
		}

		logger.warn(`${YELLOW}${WARNING_MESSAGE}${CLEAR}`);

		// Lazy-load controller and services so the disabled path doesn't
		// drag in their dependencies.
		await import('./cloud-agent.controller');
		const { AgentService } = await import('./cloud-agent.service');
		await Container.get(AgentService).init();
	}

	async settings() {
		const globalConfig = Container.get(GlobalConfig);
		return {
			enabled: globalConfig.cloudAgent.enabled,
			baseUrl: globalConfig.cloudAgent.baseUrl || globalConfig.aiAssistant.baseUrl,
		};
	}

	@OnShutdown()
	async shutdown() {
		const globalConfig = Container.get(GlobalConfig);
		if (!globalConfig.cloudAgent.enabled) return;
		const { AgentService } = await import('./cloud-agent.service');
		await Container.get(AgentService).shutdown();
	}
}
