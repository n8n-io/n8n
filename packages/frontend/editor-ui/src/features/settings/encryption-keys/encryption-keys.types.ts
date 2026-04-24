export type EncryptionKeyStatus = 'active' | 'inactive';

export type EncryptionKeyUser = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
};

export type EncryptionKey = {
	id: string;
	type: string;
	algorithm: string | null;
	status: EncryptionKeyStatus;
	activatedAt: string;
	archivedAt: string | null;
	createdBy: EncryptionKeyUser;
};

export type EncryptionKeySortField = 'activatedAt' | 'archivedAt' | 'type' | 'createdBy';

export type EncryptionKeySort = {
	field: EncryptionKeySortField;
	direction: 'asc' | 'desc';
};

export type EncryptionKeyFilters = {
	activatedFrom: string | null;
	activatedTo: string | null;
	createdByIds: string[];
};
