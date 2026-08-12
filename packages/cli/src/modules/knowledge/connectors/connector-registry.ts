import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { KnowledgeConnector } from './connector.types';
import { GithubKnowledgeConnector } from './github.connector';
import { N8nKnowledgeConnector } from './n8n.connector';
import { KNOWLEDGE_SOURCE_TYPES } from '../knowledge.constants';

/**
 * Single lookup from a source's `type` to the connector that can sync it.
 * Connectors are constructor-injected, so adding one means adding it here and
 * to `KNOWLEDGE_SOURCE_TYPES`.
 */
@Service()
export class KnowledgeConnectorRegistry {
	/** Keyed by plain string so callers can hand over unvalidated input. */
	private readonly connectors: Map<string, KnowledgeConnector>;

	constructor(githubConnector: GithubKnowledgeConnector, n8nConnector: N8nKnowledgeConnector) {
		this.connectors = new Map<string, KnowledgeConnector>([
			[githubConnector.type, githubConnector],
			[n8nConnector.type, n8nConnector],
		]);
	}

	getConnector(type: string): KnowledgeConnector {
		const connector = this.connectors.get(type);

		if (!connector) {
			throw new UserError(
				`Unknown knowledge source type: '${type}'. Supported types: ${KNOWLEDGE_SOURCE_TYPES.join(', ')}`,
			);
		}

		return connector;
	}
}
