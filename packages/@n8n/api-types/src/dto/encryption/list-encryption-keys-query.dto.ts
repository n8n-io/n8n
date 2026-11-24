import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export const ENCRYPTION_KEYS_SORT_OPTIONS = [
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
	'status:asc',
	'status:desc',
] as const;

export type EncryptionKeysSortOption = (typeof ENCRYPTION_KEYS_SORT_OPTIONS)[number];

export class ListEncryptionKeysQueryDto extends Z.class({
	...paginationSchema,
	type: z.literal('data_encryption').optional(),
	sortBy: z
		.enum(ENCRYPTION_KEYS_SORT_OPTIONS, {
			message: `sortBy must be one of: ${ENCRYPTION_KEYS_SORT_OPTIONS.join(', ')}`,
		})
		.optional(),
	activatedFrom: z.string().datetime({ offset: true }).optional(),
	activatedTo: z.string().datetime({ offset: true }).optional(),
}) {}
