import { Service } from '@n8n/di';
import type { Folder } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedFolder } from './folder.types';

@Service()
export class FolderSerializer implements Serializer<Folder, SerializedFolder> {
	serialize(folder: Folder): SerializedFolder {
		return {
			id: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolderId,
		};
	}
}
