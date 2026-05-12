import { Config, Env } from '../decorators';

/**
 * Configuration for the cloud agent module. This module proxies the n8n
 * instance to the AI-SDK-based agent hosted in ai-assistant-service.
 * Disabled by default while the feature is experimental.
 */
@Config
export class CloudAgentConfig {
	/** Toggle the module. When false, the /v1/cloud-agent/* endpoints return 404. */
	@Env('N8N_CLOUD_AGENT_ENABLED')
	enabled: boolean = false;

	/**
	 * Base URL of the cloud agent service. Defaults to empty, which falls back
	 * to the AiAssistantConfig.baseUrl (single deployment target).
	 */
	@Env('N8N_CLOUD_AGENT_BASE_URL')
	baseUrl: string = '';
}
