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
 *
 * The row keeps a hash of the token, not the token. The token is shown once,
 * when it is created.
 */
@Entity({ name: 'scim_token' })
export class ScimToken extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Index({ unique: true })
	@Column({ type: 'varchar', length: 16, default: 'instance' })
	slot: 'instance';

	/** Hex SHA-256 hash of the token. See `hashScimToken`. */
	@Column({ type: 'varchar', length: 64 })
	tokenHash: string;

	/** Last four characters of the token, so that admins can identify it. */
	@Column({ type: 'varchar', length: 4 })
	tokenHint: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy?: Relation<User> | null;

	@DateTimeColumn({ nullable: true })
	lastUsedAt: Date | null;
}
