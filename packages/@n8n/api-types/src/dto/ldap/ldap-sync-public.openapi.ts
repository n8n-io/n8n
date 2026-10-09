import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const ldapSyncFieldDocs = {
	type: {
		description:
			"Type of synchronization. 'live' applies changes to the database. 'dry' performs a test run and does not persist changes.",
		example: 'live',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const ldapSyncHistoryFieldDocs = {
	id: {
		description: 'Unique identifier for this sync run.',
		example: 1,
	},
	runMode: {
		description: 'Whether the sync was a dry run or applied live.',
		example: 'live',
	},
	status: {
		description: 'Status of the synchronization (for example, success or error).',
		example: 'success',
	},
	startedAt: {
		description: 'Timestamp when the synchronization started.',
		example: '2025-07-21T10:30:00Z',
	},
	endedAt: {
		description: 'Timestamp when the synchronization completed.',
		example: '2025-07-21T10:35:00Z',
	},
	scanned: {
		description: 'Number of LDAP entries scanned during synchronization.',
		example: 42,
	},
	created: {
		description: 'Number of new users created during synchronization.',
		example: 5,
	},
	updated: {
		description: 'Number of existing users updated during synchronization.',
		example: 3,
	},
	disabled: {
		description: 'Number of users disabled during synchronization.',
		example: 0,
	},
	error: {
		description: 'Error message if the synchronization failed. Empty string if successful.',
		example: '',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const ldapSyncHistoryListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through the synchronization history by setting the cursor parameter to the nextCursor attribute returned by the previous request. A null value means there are no more records.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
