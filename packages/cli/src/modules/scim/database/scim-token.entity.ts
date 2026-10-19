import { DateTimeColumn, WithCreatedAt, type User } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';

/**
 * The bearer token that the identity provider uses for `/scim/v2`. The
 * instance has at most one: `slot` always holds `instance`, and its unique
 * index rejects a second row. The token belongs to the instance, so it keeps
 * working when its creator is disabled, demoted or deleted.
 */
@Entity({ name: 'scim_token' })
export class ScimToken extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Index({ unique: true })
	@Column({ type: 'varchar', length: 16, default: 'instance' })
	slot: 'instance';

	@Column({ type: 'text' })
	token: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy?: Relation<User> | null;

	@DateTimeColumn({ nullable: true })
	lastUsedAt: Date | null;
}
