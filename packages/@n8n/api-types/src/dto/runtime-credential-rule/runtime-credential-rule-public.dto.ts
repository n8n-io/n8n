import '../../openapi-extend';

import { z } from 'zod';

import {
	CreateRuntimeCredentialRuleDto,
	runtimeCredentialAllowedDomainsSchema,
	runtimeCredentialRuleNodeTypeSchema,
	runtimeCredentialRulePathSchema,
} from './runtime-credential-rule.dto';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

const transformSchema = z.union([z.literal('bearer'), z.string().regex(/^field:[A-Za-z0-9_]+$/)]);

const ruleShape = {
	alias: z.string().openapi({ example: 'gmail_token' }),
	nodeType: z.string().openapi({
		example: 'n8n-nodes-base.webhook',
		description: 'The trigger node type that the rule applies to. `*` means any trigger.',
	}),
	path: z.string().openapi({
		example: 'headers.authorization',
		description: 'Dot path to the value in the trigger item.',
	}),
	credentialType: z.string().openapi({ example: 'gmailOAuth2' }),
	transform: transformSchema.optional().openapi({
		description: '`bearer` or `field:<name>`. Absent means `bearer`.',
	}),
	allowedDomains: z.string().optional().openapi({
		description: 'Hosts that the secret can be sent to, comma separated. Absent means no limit.',
	}),
	source: z.enum(['environment', 'database']).openapi({
		description: 'Rules from the environment are read-only.',
	}),
	stubCredentialId: z.string().openapi({
		description: 'The ID of the stub credential that workflows reference.',
	}),
};

/** One run-time input rule. */
export class RuntimeCredentialRulePublicDto extends Z.class(ruleShape) {}

export class RuntimeCredentialRuleListQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}

export class RuntimeCredentialRuleListPublicDto extends Z.class({
	data: z.array(z.object(ruleShape)),
	nextCursor: z.string().nullable(),
}) {}

/** Same body as the internal create route. */
export class CreateRuntimeCredentialRulePublicDto extends CreateRuntimeCredentialRuleDto {}

/**
 * Full replacement of a rule. The body of a `GET` is valid here: `alias` and `credentialType`
 * cannot change, so a value that differs from the stored one is rejected. `source` and
 * `stubCredentialId` are ignored. An absent `transform` or `allowedDomains` clears the value.
 */
export class ReplaceRuntimeCredentialRulePublicDto extends Z.class({
	nodeType: runtimeCredentialRuleNodeTypeSchema,
	path: runtimeCredentialRulePathSchema,
	transform: transformSchema.nullable().optional(),
	allowedDomains: runtimeCredentialAllowedDomainsSchema.nullable().optional(),
	alias: z.string().optional().openapi({ description: 'Must equal the alias in the path.' }),
	credentialType: z
		.string()
		.optional()
		.openapi({ description: 'Must equal the stored credential type. It cannot change.' }),
	source: z.string().optional().openapi({ readOnly: true, description: 'Ignored.' }),
	stubCredentialId: z.string().optional().openapi({ readOnly: true, description: 'Ignored.' }),
}) {}

export class RuntimeCredentialRuleImpactPublicDto extends Z.class({
	workflows: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			projectId: z.string(),
			projectName: z.string(),
			nodeNames: z.array(z.string()).openapi({ description: 'At most 20 names.' }),
		}),
	),
	truncated: z.boolean().openapi({ description: 'True when the list is not complete.' }),
}) {}

/** The effect of the request-fed credential type policy on one rule in one project. */
export const runtimeCredentialRuleAccessSchema = z.enum(['allowed', 'blocked']);
export const runtimeCredentialRuleBlockedBySchema = z.enum(['instance', 'project']);

export type RuntimeCredentialRuleAccess = z.infer<typeof runtimeCredentialRuleAccessSchema>;
export type RuntimeCredentialRuleBlockedBy = z.infer<typeof runtimeCredentialRuleBlockedBySchema>;

/** The part of a rule that a project admin sees, plus its effective access in the project. */
export type ProjectRuntimeCredentialRule = {
	alias: string;
	path: string;
	credentialType: string;
	allowedDomains?: string;
	access: RuntimeCredentialRuleAccess;
	/** The policy scope that blocks the rule. `null` when the rule is allowed. */
	blockedBy: RuntimeCredentialRuleBlockedBy | null;
};

const projectRuleShape = {
	alias: ruleShape.alias,
	path: ruleShape.path,
	credentialType: ruleShape.credentialType,
	allowedDomains: ruleShape.allowedDomains,
	access: runtimeCredentialRuleAccessSchema.openapi({
		description:
			'`blocked` when the request-fed credential type policy of the instance or the project blocks the credential type.',
	}),
	blockedBy: runtimeCredentialRuleBlockedBySchema.nullable(),
};

export class ProjectRuntimeCredentialRuleListPublicDto extends Z.class({
	data: z.array(z.object(projectRuleShape)),
	nextCursor: z.string().nullable(),
}) {}
