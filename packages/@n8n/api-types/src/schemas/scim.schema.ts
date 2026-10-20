import { z } from 'zod';

import { SCIM_N8N_USER_SCHEMA } from '../constants/scim';

// SCIM 2.0 Meta schema
export const scimMetaSchema = z.object({
	resourceType: z.string(),
	created: z.string().optional(),
	lastModified: z.string().optional(),
	location: z.string().optional(),
	version: z.string().optional(),
});

// SCIM 2.0 User Name schema
export const scimUserNameSchema = z.object({
	formatted: z.string().optional(),
	familyName: z.string().optional(),
	givenName: z.string().optional(),
	middleName: z.string().optional(),
	honorificPrefix: z.string().optional(),
	honorificSuffix: z.string().optional(),
});

// SCIM 2.0 Email schema
export const scimEmailSchema = z.object({
	value: z.string().email(),
	type: z.string().optional(),
	primary: z.boolean().optional(),
	display: z.string().optional(),
});

/** One entry of the core `roles` attribute (RFC 7643 section 4.1.2). The vocabulary is the service provider's. */
export const scimRoleSchema = z.object({
	value: z.string(),
	display: z.string().optional(),
	type: z.string().optional(),
	primary: z.boolean().optional(),
});

/**
 * The n8n extension attributes of a User. `instanceRole` is the slug of a
 * global role, for example `global:admin`. The owner role is never accepted.
 */
export const scimUserExtensionSchema = z.object({
	instanceRole: z.string().optional(),
});

// SCIM 2.0 User schema (core attributes plus the n8n extension)
export const scimUserSchema = z.object({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:schemas:core:2.0:User']),
	id: z.string(),
	externalId: z.string().optional(),
	userName: z.string(),
	name: scimUserNameSchema.optional(),
	displayName: z.string().optional(),
	emails: z.array(scimEmailSchema).optional(),
	active: z.boolean().default(true),
	roles: z.array(scimRoleSchema).optional(),
	[SCIM_N8N_USER_SCHEMA]: scimUserExtensionSchema.optional(),
	meta: scimMetaSchema.optional(),
});

// SCIM 2.0 User patch operation
export const scimPatchOpSchema = z.object({
	op: z.enum(['add', 'remove', 'replace']),
	path: z.string().optional(),
	value: z.unknown().optional(),
});

export const scimPatchRequestSchema = z.object({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:PatchOp']),
	Operations: z.array(scimPatchOpSchema),
});

// SCIM 2.0 List Response schema
export const scimListResponseSchema = z.object({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:ListResponse']),
	totalResults: z.number(),
	startIndex: z.number().default(1),
	itemsPerPage: z.number(),
	Resources: z.array(scimUserSchema),
});

// SCIM 2.0 Error schema
export const scimErrorSchema = z.object({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:Error']),
	status: z.string(),
	scimType: z.string().optional(),
	detail: z.string().optional(),
});

// Type exports
export type ScimUser = z.infer<typeof scimUserSchema>;
export type ScimPatchOp = z.infer<typeof scimPatchOpSchema>;
export type ScimPatchRequest = z.infer<typeof scimPatchRequestSchema>;
export type ScimListResponse = z.infer<typeof scimListResponseSchema>;
export type ScimError = z.infer<typeof scimErrorSchema>;
export type ScimMeta = z.infer<typeof scimMetaSchema>;
export type ScimUserName = z.infer<typeof scimUserNameSchema>;
export type ScimEmail = z.infer<typeof scimEmailSchema>;
export type ScimRole = z.infer<typeof scimRoleSchema>;
export type ScimUserExtension = z.infer<typeof scimUserExtensionSchema>;
