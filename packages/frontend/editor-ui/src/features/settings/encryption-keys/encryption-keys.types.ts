import type {
	EncryptionKey as EncryptionKeyApiType,
	EncryptionKeysSortOption,
} from '@n8n/api-types';

export type EncryptionKeyStatus = 'active' | 'inactive';

/**
 * For an inactive key, `updatedAt` is effectively the archive date: when a key
 * transitions from `active` to `inactive` its `updatedAt` is bumped, and that
 * transition cannot be undone.
 */
export type EncryptionKey = Omit<EncryptionKeyApiType, 'status'> & {
	status: EncryptionKeyStatus;
};

export type EncryptionKeySortField = 'createdAt' | 'updatedAt' | 'status';
export type EncryptionKeySortDirection = 'asc' | 'desc';

export type EncryptionKeySort = {
	field: EncryptionKeySortField;
	direction: EncryptionKeySortDirection;
};

export type EncryptionKeyFilters = {
	/** ISO datetime, inclusive lower bound */
	activatedFrom: string | null;
	/** ISO datetime, inclusive upper bound */
	activatedTo: string | null;
};

export const toApiSort = (sort: EncryptionKeySort): EncryptionKeysSortOption =>
	`${sort.field}:${sort.direction}` as EncryptionKeysSortOption;
