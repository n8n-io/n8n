import { z } from 'zod';

export const STORAGE_MODES = ['database', 'filesystem', 's3', 'azure'] as const;

export const storageModeSchema = z.enum(STORAGE_MODES);

export type StorageMode = z.infer<typeof storageModeSchema>;

export const STORAGE_MODE_TAGS = {
	database: 'db',
	filesystem: 'fs',
	s3: 's3',
	azure: 'az',
} as const;

export type StorageModeTag = (typeof STORAGE_MODE_TAGS)[StorageMode];
