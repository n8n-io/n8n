import { Tool, type BuiltTool } from '@n8n/agents';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { NODE_MCP_POC_ENDPOINTS } from '../node-mcp-poc.config';
import {
	GET_NODE_ACTION_DESCRIPTION,
	RESOLVE_NODE_PARAMETER_DESCRIPTION,
	RUN_NODE_ACTION_DESCRIPTION,
	SEARCH_NODE_ACTIONS_DESCRIPTION,
	getNodeActionInputSchema,
	resolveNodeParameterInputSchema,
	runNodeActionInputSchema,
	searchNodeActionsInputSchema,
} from './action-lookup-tool-definitions';
import { NodeActionGatewayService } from './node-action-gateway.service';
import { VisibleActionCatalogRegistry } from './visible-action-catalog';

const ACTION_LOOKUP_ENDPOINT = 'action-lookup';

@Service()
export class ActionLookupInstanceAiToolsService {
	constructor(
		private readonly gateway: NodeActionGatewayService,
		private readonly catalogs: VisibleActionCatalogRegistry,
	) {}

	createTools(requireRunApproval = true): BuiltTool[] {
		if (
			process.env.NODE_ENV === 'production' ||
			process.env.N8N_NODE_MCP_POC_ENABLED !== 'true' ||
			!NODE_MCP_POC_ENDPOINTS.some(
				(endpoint) =>
					endpoint.type === 'action-lookup' && endpoint.endpoint === ACTION_LOOKUP_ENDPOINT,
			)
		) {
			return [];
		}
		if (!this.catalogs.get(ACTION_LOOKUP_ENDPOINT)) this.catalogs.initialize();
		this.gateway.getCatalog(ACTION_LOOKUP_ENDPOINT);

		const runActionTool = new Tool('run_node_action')
			.description(RUN_NODE_ACTION_DESCRIPTION)
			.input(runNodeActionInputSchema)
			.handler(
				async (input: z.infer<typeof runNodeActionInputSchema>) =>
					await this.gateway.run(ACTION_LOOKUP_ENDPOINT, input.actionId, input.input),
			);
		if (requireRunApproval) runActionTool.requireApproval();

		return [
			new Tool('search_node_actions')
				.description(SEARCH_NODE_ACTIONS_DESCRIPTION)
				.input(searchNodeActionsInputSchema)
				.handler(
					async (input: z.infer<typeof searchNodeActionsInputSchema>) =>
						await Promise.resolve(
							this.gateway.search(ACTION_LOOKUP_ENDPOINT, input.query, input.limit, input.cursor),
						),
				)
				.build(),
			new Tool('get_node_action')
				.description(GET_NODE_ACTION_DESCRIPTION)
				.input(getNodeActionInputSchema)
				.handler(
					async (input: z.infer<typeof getNodeActionInputSchema>) =>
						await Promise.resolve(this.gateway.get(ACTION_LOOKUP_ENDPOINT, input.actionId)),
				)
				.build(),
			new Tool('resolve_node_parameter')
				.description(RESOLVE_NODE_PARAMETER_DESCRIPTION)
				.input(resolveNodeParameterInputSchema)
				.handler(
					async (input: z.infer<typeof resolveNodeParameterInputSchema>) =>
						await this.gateway.resolve(ACTION_LOOKUP_ENDPOINT, input),
				)
				.build(),
			runActionTool.build(),
		];
	}
}
