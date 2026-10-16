import '../../openapi-extend';

import { z } from 'zod';

import {
	ldapConfigurationFieldDocs,
	ldapConfigurationUpdateFieldDocs,
} from './ldap-configuration-public.openapi';
import { Z } from '../../zod-class';

const connectionSecuritySchema = z.enum(['none', 'tls', 'startTls']);

export const ldapConfigurationPublicSchema = z
	.object({
		loginEnabled: z.boolean().openapi(ldapConfigurationFieldDocs.loginEnabled),
		loginLabel: z.string().openapi(ldapConfigurationFieldDocs.loginLabel),
		connectionUrl: z.string().openapi(ldapConfigurationFieldDocs.connectionUrl),
		allowUnauthorizedCerts: z.boolean().openapi(ldapConfigurationFieldDocs.allowUnauthorizedCerts),
		connectionSecurity: connectionSecuritySchema.openapi(
			ldapConfigurationFieldDocs.connectionSecurity,
		),
		connectionPort: z.number().openapi(ldapConfigurationFieldDocs.connectionPort),
		baseDn: z.string().openapi(ldapConfigurationFieldDocs.baseDn),
		bindingAdminDn: z.string().openapi(ldapConfigurationFieldDocs.bindingAdminDn),
		bindingAdminPassword: z.string().openapi(ldapConfigurationFieldDocs.bindingAdminPassword),
		firstNameAttribute: z.string().openapi(ldapConfigurationFieldDocs.firstNameAttribute),
		lastNameAttribute: z.string().openapi(ldapConfigurationFieldDocs.lastNameAttribute),
		emailAttribute: z.string().openapi(ldapConfigurationFieldDocs.emailAttribute),
		loginIdAttribute: z.string().openapi(ldapConfigurationFieldDocs.loginIdAttribute),
		ldapIdAttribute: z.string().openapi(ldapConfigurationFieldDocs.ldapIdAttribute),
		userFilter: z.string().openapi(ldapConfigurationFieldDocs.userFilter),
		synchronizationEnabled: z.boolean().openapi(ldapConfigurationFieldDocs.synchronizationEnabled),
		synchronizationInterval: z.number().openapi(ldapConfigurationFieldDocs.synchronizationInterval),
		searchPageSize: z.number().openapi(ldapConfigurationFieldDocs.searchPageSize),
		searchTimeout: z.number().openapi(ldapConfigurationFieldDocs.searchTimeout),
		enforceEmailUniqueness: z.boolean().openapi(ldapConfigurationFieldDocs.enforceEmailUniqueness),
	})
	.openapi({
		description:
			'Full LDAP configuration. Every field is returned by GET; send the full object back as PUT body.',
		additionalProperties: false,
	});

export class LdapConfigurationPublicDto extends Z.class(ldapConfigurationPublicSchema.shape) {
	static schema = ldapConfigurationPublicSchema;
}

const updateLdapConfigurationSchema = z
	.object({
		loginEnabled: z.boolean().openapi(ldapConfigurationUpdateFieldDocs.loginEnabled),
		loginLabel: z.string().openapi(ldapConfigurationFieldDocs.loginLabel),
		connectionUrl: z.string().openapi(ldapConfigurationFieldDocs.connectionUrl),
		allowUnauthorizedCerts: z.boolean().openapi(ldapConfigurationFieldDocs.allowUnauthorizedCerts),
		connectionSecurity: connectionSecuritySchema.openapi(
			ldapConfigurationFieldDocs.connectionSecurity,
		),
		connectionPort: z.number().int().openapi(ldapConfigurationFieldDocs.connectionPort),
		baseDn: z.string().openapi(ldapConfigurationFieldDocs.baseDn),
		bindingAdminDn: z.string().openapi(ldapConfigurationFieldDocs.bindingAdminDn),
		bindingAdminPassword: z.string().openapi(ldapConfigurationUpdateFieldDocs.bindingAdminPassword),
		firstNameAttribute: z.string().openapi(ldapConfigurationFieldDocs.firstNameAttribute),
		lastNameAttribute: z.string().openapi(ldapConfigurationFieldDocs.lastNameAttribute),
		emailAttribute: z.string().openapi(ldapConfigurationFieldDocs.emailAttribute),
		loginIdAttribute: z.string().openapi(ldapConfigurationFieldDocs.loginIdAttribute),
		ldapIdAttribute: z.string().openapi(ldapConfigurationFieldDocs.ldapIdAttribute),
		userFilter: z.string().openapi(ldapConfigurationFieldDocs.userFilter),
		synchronizationEnabled: z.boolean().openapi(ldapConfigurationFieldDocs.synchronizationEnabled),
		synchronizationInterval: z
			.number()
			.int()
			.openapi(ldapConfigurationFieldDocs.synchronizationInterval),
		searchPageSize: z.number().int().openapi(ldapConfigurationFieldDocs.searchPageSize),
		searchTimeout: z.number().int().openapi(ldapConfigurationFieldDocs.searchTimeout),
		enforceEmailUniqueness: z.boolean().openapi(ldapConfigurationFieldDocs.enforceEmailUniqueness),
	})
	.strict()
	.openapi({
		description: 'Full LDAP configuration. Use empty strings for unset fields.',
	});

export class UpdateLdapConfigurationPublicDto extends Z.class(updateLdapConfigurationSchema.shape, {
	strict: true,
}) {
	static schema = updateLdapConfigurationSchema;
}
