import type { Folder } from '@n8n/db';
import { Service } from '@n8n/di';

import { serializedFolderSchema, type SerializedFolder } from '../../spec/serialized/folder.schema';
import {
	definePackageSerializationPayload,
	type PackageEntityKeyHandling,
} from '../package-serialization.types';

const folderPackageKeyHandling = {
	id: 'copy',
	createdAt: 'exclude',
	updatedAt: 'exclude',
	name: 'copy',
	parentFolderId: 'transform',
	parentFolder: 'exclude',
	subFolders: 'exclude',
	homeProject: 'transform',
	workflows: 'exclude',
	tags: 'exclude',
} as const satisfies PackageEntityKeyHandling<Folder>;

const serializePayload = definePackageSerializationPayload<
	Folder,
	SerializedFolder,
	typeof folderPackageKeyHandling
>();

@Service()
export class FolderSerializer {
	serialize(folder: Folder, parentFolderId: string | null): SerializedFolder {
		return serializedFolderSchema.parse(
			serializePayload({
				id: folder.id,
				name: folder.name,
				parentFolderId,
			}),
		);
	}
}
