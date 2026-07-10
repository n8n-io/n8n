import type { Folder } from '@n8n/db';
import { Service } from '@n8n/di';

import { serializedFolderSchema, type SerializedFolder } from '../../spec/serialized/folder.schema';

@Service()
export class FolderSerializer {
	/**
	 * Serializes a folder into its package shell. The exporter passes the
	 * `parentFolderId` it computed relative to the exported set (null when the
	 * folder roots the exported forest), so we deliberately ignore the entity's
	 * own parent.
	 */
	serialize(folder: Folder, parentFolderId: string | null): SerializedFolder {
		return serializedFolderSchema.parse({
			id: folder.id,
			name: folder.name,
			parentFolderId,
		});
	}
}
