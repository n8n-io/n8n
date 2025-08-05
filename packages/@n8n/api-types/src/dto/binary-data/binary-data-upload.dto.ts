import { z } from 'zod';
import { Z } from 'zod-class';

export class BinaryDataUploadDto extends Z.class({
	fileName: z.string().optional(),
	mimeType: z.string().optional(),
	workflowId: z.string().optional(),
	executionId: z.string().optional(),
}) {}
