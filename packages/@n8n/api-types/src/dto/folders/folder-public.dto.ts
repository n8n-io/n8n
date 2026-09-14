import '../../openapi-extend';

import { deleteFolderQueryFieldDocs } from './folder-public.openapi';
import { folderIdSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

/**
 * Strict so an undocumented query parameter still answers 400, as the legacy spec-driven
 * validator did.
 */
export class DeleteFolderQueryPublicDto extends Z.class(
	{
		transferToFolderId: folderIdSchema
			.optional()
			.openapi(deleteFolderQueryFieldDocs.transferToFolderId),
	},
	{ strict: true },
) {}
