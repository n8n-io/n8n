import { z } from 'zod';

import { Z } from '../../zod-class';

export const egressProtectionModeSchema = z.enum(['off', 'log', 'enforce']);
export type EgressProtectionModeDto = z.infer<typeof egressProtectionModeSchema>;

// What actually happened to a destination when it was recorded, independent of the
// current mode: `blocked` = rejected in enforce mode; `would-block` = let through in
// log mode but would have been blocked under enforce.
export const egressDecisionSchema = z.enum(['blocked', 'would-block']);
export type EgressDecision = z.infer<typeof egressDecisionSchema>;

// Loose IP/CIDR shape check. The engine's BlockList does the authoritative parse
// (and logs anything it can't build); this keeps obvious garbage out at the API
// boundary while staying environment-agnostic (no node:net in @n8n/api-types).
const IP_OR_CIDR = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]+)(?:\/\d{1,3})?$/;

// Allow-all ranges in an allow list would neutralise egress protection entirely,
// so they are rejected rather than silently accepted.
const ALLOW_ALL_RANGES = new Set(['0.0.0.0/0', '0.0.0.0', '::/0', '::0/0', '::']);

// Hostname, optionally with a single leading wildcard label. No scheme/port/path.
const HOSTNAME_PATTERN = /^(?:\*\.)?(?:[a-zA-Z0-9_-]+\.)*[a-zA-Z0-9_-]+$/;

const ipRangeList = (options: { isAllowList: boolean }) =>
	z
		.array(z.string().trim().min(1))
		.max(1000)
		.superRefine((entries, ctx) => {
			for (const entry of entries) {
				if (!IP_OR_CIDR.test(entry)) {
					ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid IP range: "${entry}"` });
				} else if (options.isAllowList && ALLOW_ALL_RANGES.has(entry)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Refusing allow-all range "${entry}": it would disable egress protection`,
					});
				}
			}
		});

const hostnameList = z
	.array(z.string().trim().min(1))
	.max(1000)
	.superRefine((entries, ctx) => {
		for (const entry of entries) {
			if (entry === '*' || !HOSTNAME_PATTERN.test(entry)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Invalid hostname pattern: "${entry}"`,
				});
			}
		}
	});

/**
 * Admin-editable egress protection override. The lists are *additive* on top of
 * the environment baseline (they cannot remove a baseline entry); `mode`, if set,
 * replaces the baseline mode. Entries are shape-validated and allow-all ranges
 * are rejected so an override can never silently disable protection.
 */
export class UpdateEgressPolicyDto extends Z.class({
	mode: egressProtectionModeSchema.optional(),
	blockedIpRanges: ipRangeList({ isAllowList: false }),
	allowedIpRanges: ipRangeList({ isAllowList: true }),
	allowedHostnames: hostnameList,
	blockedHostnames: hostnameList,
}) {}

/** A single policy list, split into the read-only env baseline and the admin's override. */
export interface EgressPolicyListResponse {
	baseline: string[];
	override: string[];
}

/** Full egress protection state for the admin settings page. */
export interface EgressPolicyStateResponse {
	mode: EgressProtectionModeDto;
	baselineMode: EgressProtectionModeDto;
	editable: boolean;
	blockedIpRanges: EgressPolicyListResponse;
	allowedIpRanges: EgressPolicyListResponse;
	allowedHostnames: EgressPolicyListResponse;
	blockedHostnames: EgressPolicyListResponse;
	updatedAt?: string;
}

/**
 * A single aggregated entry in the calibration log: a distinct
 * `(hostname, resolvedIp, feature, decision)` tuple with how many times it
 * occurred and when it was last seen. `decision` records what actually
 * happened, so a destination can appear as both `blocked` and `would-block`
 * if the mode changed between occurrences.
 */
export interface EgressBlockedDestinationResponse {
	hostname: string;
	resolvedIp: string;
	feature: string;
	count: number;
	decision: EgressDecision;
	lastSeen: string;
}

/** The calibration view payload: the log of recorded destinations plus the current mode. */
export interface EgressCalibrationResponse {
	/** The mode currently in force, shown as context. Per-row `decision` is authoritative for what happened. */
	mode: EgressProtectionModeDto;
	destinations: EgressBlockedDestinationResponse[];
}
