import type { EncryptionKeyResponseDto } from '@n8n/api-types';

export type EncryptionKeyStatus = 'active' | 'inactive';

/**
 * For an inactive key, `updatedAt` is effectively the archive date: when a key
 * transitions from `active` to `inactive` its `updatedAt` is bumped, and that
 * transition cannot be undone.
 */
export type EncryptionKey = Omit<EncryptionKeyResponseDto, 'status'> & {
	status: EncryptionKeyStatus;
};

export type EncryptionKeySortField = 'createdAt' | 'updatedAt' | 'status';

export type EncryptionKeySort = {
	field: EncryptionKeySortField;
	direction: 'asc' | 'desc';
};

export type EncryptionKeyFilters = {
	activatedFrom: string | null;
	activatedTo: string | null;
};
