import '../../openapi-extend';

import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';
import {
	ldapSyncFieldDocs,
	ldapSyncHistoryFieldDocs,
	ldapSyncHistoryListFieldDocs,
} from './ldap-sync-public.openapi';

const ldapSyncHistoryFields = {
	id: z.number().int().openapi(ldapSyncHistoryFieldDocs.id),
	runMode: z.enum(['dry', 'live']).openapi(ldapSyncHistoryFieldDocs.runMode),
	status: z.string().openapi(ldapSyncHistoryFieldDocs.status),
	startedAt: z.string().datetime().openapi(ldapSyncHistoryFieldDocs.startedAt),
	endedAt: z.string().datetime().openapi(ldapSyncHistoryFieldDocs.endedAt),
	scanned: z.number().int().openapi(ldapSyncHistoryFieldDocs.scanned),
	created: z.number().int().openapi(ldapSyncHistoryFieldDocs.created),
	updated: z.number().int().openapi(ldapSyncHistoryFieldDocs.updated),
	disabled: z.number().int().openapi(ldapSyncHistoryFieldDocs.disabled),
	error: z.string().openapi(ldapSyncHistoryFieldDocs.error),
};

const ldapSyncHistoryPublicSchema = z.object(ldapSyncHistoryFields).openapi({
	description: 'LDAP synchronization history record.',
	additionalProperties: false,
});

export class LdapSyncHistoryPublicDto extends Z.class(ldapSyncHistoryPublicSchema.shape) {
	static schema = ldapSyncHistoryPublicSchema;
}

const ldapSyncHistoryListPublicSchema = z.object({
	data: z.array(ldapSyncHistoryPublicSchema),
	nextCursor: z.string().nullable().openapi(ldapSyncHistoryListFieldDocs.nextCursor),
});

export class LdapSyncHistoryListPublicDto extends Z.class(ldapSyncHistoryListPublicSchema.shape) {
	static schema = ldapSyncHistoryListPublicSchema;
}

const runLdapSyncPublicSchema = z
	.object({
		type: z.enum(['live', 'dry']).openapi(ldapSyncFieldDocs.type),
	})
	.strict()
	.openapi({
		description: 'Request body for triggering an LDAP synchronization.',
		additionalProperties: false,
	});

export class RunLdapSyncPublicDto extends Z.class(runLdapSyncPublicSchema.shape, { strict: true }) {
	static schema = runLdapSyncPublicSchema;
}

export { RunLdapSyncPublicDto as LdapSyncDto };

export class ListLdapSyncHistoryQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
