import { Service } from '@n8n/di';

import { NotFoundError } from '@n8n/errors';

import { KnowledgeAvailability } from '@/modules/knowledge/knowledge-availability';

/**
 * The agents view of knowledge availability. The knowledge module decides
 * whether knowledge works; this adapter only adds the agents 404, so the file
 * routes and the warm-up route keep the response they had before the module existed.
 */
@Service()
export class AgentKnowledgeGate {
	constructor(private readonly knowledgeAvailability: KnowledgeAvailability) {}

	/** Backs `agents.knowledgeBaseEnabled`. */
	isEnabled(): boolean {
		return this.knowledgeAvailability.isFileKnowledgeEnabled();
	}

	assertEnabled(): void {
		if (!this.isEnabled()) {
			throw new NotFoundError('Agent knowledge base is not enabled');
		}
	}
}
