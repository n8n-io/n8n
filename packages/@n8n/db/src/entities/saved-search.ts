import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';
import { Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { User } from './user';

@Entity()
@Index(['userId'])
export class SavedSearch extends WithTimestampsAndStringId {
	@Length(1, 100, {
		message: 'Saved search name must be $constraint1 to $constraint2 characters long.',
	})
	@Column({ length: 100 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description?: string;

	@Column({ type: 'json' })
	query: Record<string, any>;

	@Column({ type: 'json', nullable: true })
	metadata?: {
		resultsCount?: number;
		lastExecutedAt?: string;
		executionCount?: number;
		tags?: string[];
	};

	@Column({ default: false })
	isPublic: boolean;

	@Column({ default: false })
	isPinned: boolean;

	@ManyToOne('User', 'savedSearches')
	user: User;

	@Column()
	userId: string;
}
