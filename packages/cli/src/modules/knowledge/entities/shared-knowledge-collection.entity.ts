import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * One project that can use a knowledge collection, with its role. Same shape
 * as `SharedCredentials`, so the permission checks can reuse the credential
 * code.
 *
 * `KnowledgeCollection.projectId` is the source of truth for the owner
 * project. The owner row repeats it: code that writes one writes both in one
 * transaction.
 */
@Entity({ name: 'shared_knowledge_collection' })
@Index(['knowledgeCollectionId'], {
	unique: true,
	where: '"role" = \'knowledgeCollection:owner\'',
})
export class SharedKnowledgeCollection extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 16 })
	knowledgeCollectionId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 32 })
	role: 'knowledgeCollection:owner' | 'knowledgeCollection:user';
}
