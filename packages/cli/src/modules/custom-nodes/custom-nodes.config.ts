import { Config, Env } from '@n8n/config';

@Config
export class CustomNodesConfig {
	/**
	 * Enable the Custom Nodes & Custom Operations mockup. When off, the module
	 * registers no routes and no node types.
	 */
	@Env('N8N_CUSTOM_NODES_MOCKUP')
	enabled: boolean = false;
}
