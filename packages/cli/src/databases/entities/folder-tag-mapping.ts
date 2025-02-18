import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import type { Folder } from './folder';
import type { TagEntity } from './tag-entity';

@Entity({ name: 'folder_tag' })
export class FolderTagMapping {
	@PrimaryColumn()
	folderId: string;

	@ManyToOne('Folder', 'tagMappings')
	@JoinColumn({ name: 'folderId' })
	folders: Folder[];

	@PrimaryColumn()
	tagId: string;

	@ManyToOne('TagEntity', 'folderMappings')
	@JoinColumn({ name: 'tagId' })
	tags: TagEntity[];
}
