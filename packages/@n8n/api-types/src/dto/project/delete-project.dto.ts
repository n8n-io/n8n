import { z } from 'zod';
import { Z } from 'zod-class';

export class DeleteProjectDto extends Z.class({
	transferId: z.string().optional(),
}) {}
