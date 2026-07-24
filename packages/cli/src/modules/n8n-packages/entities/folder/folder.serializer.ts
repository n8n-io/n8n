import type { Folder } from '@n8n/db';
import { Service } from '@n8n/di';

import { serializedFolderSchema, type SerializedFolder } from '../../spec/serialized/folder.schema';

@Service()
export class FolderSerializer {
	serialize(folder: Folder, parentFolderId: string | null): SerializedFolder {
		return serializedFolderSchema.parse({
			id: folder.id,
			name: folder.name,
			parentFolderId,
		});
	}
}
