import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/**
 * A knowledge collection: files and vector stores that agents search. A shared
 * collection (`kind = 'shared'`) belongs to a project. A private collection
 * (`kind = 'agent'`) belongs to one agent.
 *
 * The check `CHK_knowledge_collection_owner` gives each collection exactly one
 * owner, a project or an agent, and gives the kind 'agent' only to a collection
 * that an agent owns. The database does not check the other values of `kind`.
 */
@Entity({ name: 'knowledge_collection' })
@Index(['slug'], { unique: true })
@Index(['projectId', 'name'], { unique: true })
@Index(['agentId'], { unique: true })
export class KnowledgeCollection extends WithTimestampsAndStringId {
	/** Unique in the owner project of a shared collection. */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	/** Tells the agent when to use the collection. */
	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	/** Tool-safe identifier, unique on the instance. Set at creation and never changed. */
	@Column({ type: 'varchar', length: 24 })
	slug: string;

	@Column({ type: 'varchar', length: 16 })
	kind: 'shared' | 'agent';

	/**
	 * Home project of a shared collection. Null for an agent collection.
	 *
	 * This column is the source of truth for the owner project, and the project
	 * delete cascade follows it. The owner row of `SharedKnowledgeCollection`
	 * repeats it: code that writes one writes both in one transaction.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/**
	 * Agent of a private collection. The database keeps the foreign key to
	 * `agents` with its cascade; the entity declares no relation, so the
	 * knowledge module does not depend on the agents module.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

	@Column({ type: 'boolean', default: false })
	isGlobal: boolean;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
