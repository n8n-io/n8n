import { Column, Entity, JoinColumn, ManyToOne, Index } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Folder } from './folder';
import { User } from './user';

@Entity('folder_permissions')
@Index(['folderId', 'userId'], { unique: true, where: 'userId IS NOT NULL' })
@Index(['folderId', 'teamId'], { unique: true, where: 'teamId IS NOT NULL' })
export class FolderPermission extends WithTimestampsAndStringId {
	@Column()
	@Index()
	folderId: string;

	@ManyToOne(() => Folder, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'folderId' })
	folder: Folder;

	@Column({ nullable: true })
	@Index()
	userId: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User | null;

	@Column({ nullable: true })
	@Index()
	teamId: string | null;

	@Column({ type: 'varchar', length: 50 })
	role: 'owner' | 'editor' | 'viewer';

	@Column({ type: 'boolean', default: true })
	canRead: boolean;

	@Column({ type: 'boolean', default: false })
	canWrite: boolean;

	@Column({ type: 'boolean', default: false })
	canDelete: boolean;

	@Column({ type: 'boolean', default: false })
	canShare: boolean;

	@Column({ type: 'boolean', default: false })
	canExecute: boolean;

	@Column({ type: 'boolean', default: false })
	canCreateSubfolders: boolean;

	@Column({ type: 'boolean', default: false })
	inherited: boolean;

	@Column({ type: 'datetime' })
	grantedAt: Date;

	@Column()
	grantedBy: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'grantedBy' })
	grantedByUser: User;

	@Column({ type: 'datetime', nullable: true })
	expiresAt: Date | null;
}
