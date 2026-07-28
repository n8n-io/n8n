import { Service } from '@n8n/di';

import { ActionLookupMcpService } from './action-lookup/action-lookup-mcp.service';
import { JsonSchemaNodeMcpPocService } from './json-schema/node-mcp-poc.service';
import { NODE_MCP_POC_ENDPOINTS } from './node-mcp-poc.config';

@Service()
export class NodeMcpPocService {
	constructor(
		private readonly jsonSchemaService: JsonSchemaNodeMcpPocService,
		private readonly actionLookupService: ActionLookupMcpService,
	) {}

	async getServer(endpointName: string) {
		const endpoint = NODE_MCP_POC_ENDPOINTS.find(
			(candidate) => candidate.endpoint === endpointName,
		);
		if (!endpoint) throw new Error(`Unknown node MCP POC endpoint: ${endpointName}`);

		switch (endpoint.type) {
			case 'json-schema':
				return await this.jsonSchemaService.getServer(endpointName);
			case 'action-lookup':
				return await this.actionLookupService.getServer(endpointName);
		}
	}
}
