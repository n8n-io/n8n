import { z } from 'zod';
import { Z } from 'zod-class';
import { BinaryDataStoredModes } from 'n8n-core';

export class GetBinaryData extends Z.class({
	id: z
		.string({
			required_error: 'Missing binary data ID',
			invalid_type_error: 'Invalid binary data ID',
		})
		.regex(new RegExp(`^(${BinaryDataStoredModes.join('|')}):`)),
	action: z.literal('view').or(z.literal('download')),
	fileName: z.string().optional(),
	mimeType: z.string().optional(),
}) {}
