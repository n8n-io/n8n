import type { FavoriteResourceType } from '@n8n/api-types';
import { Actor } from '@n8n/db';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from '@n8n/typeorm';

@Entity('user_favorites')
@Unique(['userId', 'resourceId', 'resourceType'])
@Index(['userId'])
export class UserFavorite {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Actor, { onDelete: 'CASCADE' })
	user: Actor;

	@Column({ type: String })
	userId: string;

	@Column({ type: String })
	resourceId: string;

	@Column({ type: String })
	resourceType: FavoriteResourceType;
}
