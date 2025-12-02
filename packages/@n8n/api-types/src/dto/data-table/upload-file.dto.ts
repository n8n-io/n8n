import { z } from 'zod';
import { Z } from 'zod-class';

export class UploadFileDto extends Z.class({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
}) {}

export class UploadFileResponseDto extends Z.class({
	url: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	size: z.number(),
	bucketId: z.string(),
	fileId: z.string(),
	uploadedAt: z.date(),
}) {}
