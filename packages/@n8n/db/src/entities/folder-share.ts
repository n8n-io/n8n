import { Column, Entity, JoinColumn, ManyToOne, Index } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Folder } from './folder';
import { User } from './user';

@Entity('folder_shares')
export class FolderShare extends WithTimestampsAndStringId {
	@Column()
	@Index()
	folderId: string;

	@ManyToOne(() => Folder, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'folderId' })
	folder: Folder;

	@Column({ type: 'varchar', length: 50 })
	recipientType: 'user' | 'team' | 'public' | 'link';

	@Column({ type: 'varchar', length: 50 })
	role: 'editor' | 'viewer';

	@Column()
	createdBy: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'createdBy' })
	createdByUser: User;

	@Column({ type: 'datetime', nullable: true })
	expiresAt: Date | null;

	@Column({ type: 'boolean', default: false })
	allowCopy: boolean;

	@Column({ type: 'boolean', default: false })
	allowDownload: boolean;

	@Column({ type: 'boolean', default: false })
	requirePassword: boolean;

	@Column({ type: 'text', nullable: true })
	passwordHash: string | null;

	@Column({ type: 'text' })
	@Index({ unique: true })
	url: string;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@Column({ type: 'int', default: 0 })
	accessCount: number;

	@Column({ type: 'datetime', nullable: true })
	lastAccessedAt: Date | null;
}
