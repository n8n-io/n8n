import { z } from 'zod';
import { Z } from 'zod-class';

import { folderIdSchema } from '../../schemas/folder.schema';

export class TransferFolderBodyDto extends Z.class({
	destinationProjectId: z.string(),
	shareCredentials: z.array(z.string()).optional(),
	destinationParentFolderId: folderIdSchema,
}) {}
