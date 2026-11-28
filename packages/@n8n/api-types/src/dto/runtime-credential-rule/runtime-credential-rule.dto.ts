import { z } from 'zod';

import { Z } from '../../zod-class';

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

const transformSchema = z.union([
	z.literal('bearer'),
	z.string().regex(/^field:[A-Za-z0-9_]+$/, 'Use "bearer" or "field:<name>"'),
]);

const pathSchema = z
	.string()
	.trim()
	.min(1)
	.max(1000)
	.refine(
		(path) =>
			!path.split('.').some((segment) => UNSAFE_PATH_SEGMENTS.has(segment.replace(/\[\*\]$/, ''))),
		{ message: 'The path has an unsafe segment' },
	);

const aliasSchema = z
	.string()
	.trim()
	.regex(/^[A-Za-z0-9_-]{1,128}$/, 'Use letters, digits, "_" and "-" (max 128)')
	.refine((alias) => !UNSAFE_PATH_SEGMENTS.has(alias), { message: 'The alias is not allowed' });

/**
 * Comma separated hosts. `*.example.com` matches subdomains only. An entry is a bare host:
 * no scheme, port, path, or user info. The syntax follows the allowed domains of a credential.
 */
export const runtimeCredentialAllowedDomainsSchema = z
	.string()
	.max(2000)
	.superRefine((value, ctx) => {
		const entries = value.split(',').map((entry) => entry.trim());
		for (const entry of entries) {
			if (entry === '') {
				ctx.addIssue({ code: 'custom', message: 'The list has an empty entry' });
				return;
			}
			if (/\s/.test(entry)) {
				ctx.addIssue({ code: 'custom', message: `"${entry}" has a space` });
				return;
			}
			if (/[/:@\\]/.test(entry)) {
				ctx.addIssue({
					code: 'custom',
					message: `"${entry}" must be a host only. Do not use "/", ":", "@" or "\\"`,
				});
				return;
			}
			if (entry.replace(/^\*\./, '').includes('*') || entry === '*.') {
				ctx.addIssue({
					code: 'custom',
					message: `"${entry}" is not valid. Use "*." only at the start, followed by a domain`,
				});
				return;
			}
		}
	});

const nodeTypeSchema = z.string().trim().min(1).max(255);

export const runtimeCredentialRulePathSchema = pathSchema;
export const runtimeCredentialRuleNodeTypeSchema = nodeTypeSchema;

/** A run-time input rule. Environment rules are read-only. */
export type RuntimeCredentialRule = {
	alias: string;
	nodeType: string;
	path: string;
	credentialType: string;
	transform?: 'bearer' | `field:${string}`;
	/** Hosts that the secret can be sent to. Absent means no restriction. */
	allowedDomains?: string;
	source: 'environment' | 'database';
	stubCredentialId: string;
};

export class CreateRuntimeCredentialRuleDto extends Z.class({
	alias: aliasSchema,
	nodeType: nodeTypeSchema,
	path: pathSchema,
	credentialType: z.string().trim().min(1).max(255),
	transform: transformSchema.optional(),
	allowedDomains: runtimeCredentialAllowedDomainsSchema.optional(),
}) {}

/** The alias and the credential type cannot change. The stub credential depends on both. */
export class UpdateRuntimeCredentialRuleDto extends Z.class({
	nodeType: nodeTypeSchema.optional(),
	path: pathSchema.optional(),
	transform: transformSchema.nullable().optional(),
	/** `null` removes the restriction. */
	allowedDomains: runtimeCredentialAllowedDomainsSchema.nullable().optional(),
}) {}
