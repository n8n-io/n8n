import { z } from 'zod';
import { Z } from 'zod-class';

export class TransferFolderBodyDto extends Z.class({
	destinationProjectId: z.string(),
	shareCredentials: z.array(z.string()).optional(),
	destinationParentFolderId: z.string(),
}) {}
