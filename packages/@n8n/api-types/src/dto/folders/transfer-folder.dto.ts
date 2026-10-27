import { z } from 'zod';

import { folderIdSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

export class TransferFolderBodyDto extends Z.class({
	destinationProjectId: z.string(),
	shareCredentials: z.array(z.string()).optional(),
	destinationParentFolderId: folderIdSchema,
}) {}
