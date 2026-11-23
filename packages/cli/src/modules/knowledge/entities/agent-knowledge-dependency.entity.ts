import { WithCreatedAt } from '@n8n/db';
import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * One agent that uses one knowledge collection. The row alone gives no access:
 * the agent reads the collection only if its project owns it, has a share of
 * it, or the collection is global.
 */
@Entity({ name: 'agent_knowledge_dependency' })
export class AgentKnowledgeDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 16 })
	knowledgeCollectionId: string;
}
