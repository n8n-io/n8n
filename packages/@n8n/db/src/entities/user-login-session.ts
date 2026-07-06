import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';
import { User } from './user';

/**
 * A persisted record of a browser/device login. The row's `id` is the `jti`
 * embedded in the auth JWT; its presence is what keeps the session valid, so
 * deleting the row revokes the session on its next request.
 */
@Entity('user_login_session')
export class UserLoginSession extends WithTimestampsAndStringId {
	// Unidirectional: we always query sessions by `userId`, never via `user.loginSessions`.
	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	@Index()
	@Column({ type: String })
	userId: string;

	/** Hash of the browser id (matches the `browserId` claim in the JWT). Null for logins without the header. */
	@Column({ type: String, nullable: true })
	browserIdHash: string | null;

	@Column({ type: String, nullable: true, length: 512 })
	userAgent: string | null;

	@Column({ type: String, nullable: true, length: 45 })
	ipAddress: string | null;

	/** Mirrors the JWT `exp`; used to prune dead rows when the user next lists sessions. */
	@DateTimeColumn()
	expiresAt: Date;

	@DateTimeColumn({ nullable: true })
	lastActiveAt: Date | null;
}
