import type { EncryptionKeyResponseDto } from '@n8n/api-types';

export type EncryptionKeyStatus = 'active' | 'inactive';

export type EncryptionKey = Omit<EncryptionKeyResponseDto, 'status'> & {
	status: EncryptionKeyStatus;
};

export type EncryptionKeySortField = 'createdAt' | 'status';

export type EncryptionKeySort = {
	field: EncryptionKeySortField;
	direction: 'asc' | 'desc';
};

export type EncryptionKeyFilters = {
	activatedFrom: string | null;
	activatedTo: string | null;
};
