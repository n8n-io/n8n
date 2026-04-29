import type { EncryptionKeyResponseDto } from '@n8n/api-types';

export type EncryptionKeyStatus = 'active' | 'inactive';

export type EncryptionKey = Omit<EncryptionKeyResponseDto, 'status'> & {
	status: EncryptionKeyStatus;
	/**
	 * Used to derive the archive date for inactive keys. When a key transitions from
	 * `active` to `inactive` its `updatedAt` is bumped, and that transition cannot be
	 * undone, so for an inactive row `updatedAt` is effectively the archive date.
	 *
	 * Optional until the backend extends `EncryptionKeyResponseDto` with `updatedAt`.
	 */
	updatedAt?: string;
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
