import { z } from 'zod';

import { Z } from '../../zod-class';

const ConnectionSecuritySchema = z.enum(['none', 'tls', 'startTls']);

export class UpdateLdapConfigurationDto extends Z.class({
	loginEnabled: z.boolean(),
	loginLabel: z.string(),
	connectionUrl: z.string(),
	allowUnauthorizedCerts: z.boolean(),
	connectionSecurity: ConnectionSecuritySchema,
	connectionPort: z.number(),
	baseDn: z.string(),
	bindingAdminDn: z.string(),
	bindingAdminPassword: z.string(),
	firstNameAttribute: z.string(),
	lastNameAttribute: z.string(),
	emailAttribute: z.string(),
	loginIdAttribute: z.string(),
	ldapIdAttribute: z.string(),
	userFilter: z.string(),
	synchronizationEnabled: z.boolean(),
	synchronizationInterval: z.number(),
	searchPageSize: z.number(),
	searchTimeout: z.number(),
	enforceEmailUniqueness: z.boolean(),
}) {}
