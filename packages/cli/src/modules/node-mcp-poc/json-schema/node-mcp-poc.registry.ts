import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { NODE_MCP_POC_ENDPOINTS } from '../node-mcp-poc.config';
import type { CompiledNodeToolset } from './node-mcp-poc.types';
import { NodeToolsetCompiler } from './node-toolset-compiler';

@Service()
export class NodeMcpPocRegistry {
	private readonly toolsets = new Map<string, CompiledNodeToolset>();

	constructor(
		private readonly compiler: NodeToolsetCompiler,
		private readonly logger: Logger,
	) {}

	initialize() {
		this.toolsets.clear();
		for (const endpoint of NODE_MCP_POC_ENDPOINTS) {
			if (endpoint.type !== 'json-schema') continue;
			try {
				const toolset = this.compiler.compile(endpoint);
				this.toolsets.set(endpoint.endpoint, toolset);
				this.logger.info('Registered node MCP POC endpoint', {
					endpoint: endpoint.endpoint,
					nodeType: endpoint.binding.nodeType,
					toolCount: toolset.tools.length,
					resolver: endpoint.flavor.resolver,
				});
			} catch (error) {
				this.logger.warn('Could not compile node MCP POC endpoint', {
					endpoint: endpoint.endpoint,
					nodeType: endpoint.binding.nodeType,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	get(endpoint: string) {
		return this.toolsets.get(endpoint);
	}

	list() {
		return Array.from(this.toolsets.keys());
	}
}
