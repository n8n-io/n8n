import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';

export class DeleteUserQueryPublicDto extends Z.class({
	transferId: z.string().optional().openapi({
		description:
			"ID of the project to transfer the deleted user's workflows and credentials to. Omit to delete those resources instead of transferring them.",
	}),
}) {}
