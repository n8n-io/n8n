import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import { stripToolSuffix } from '@/utils';

/** Sentinel key the gateway uses for nodes with a flat `operation` param (no resource). */
const OPERATION_ONLY = '__operation_only__';

export type AiGatewayEligibilityReason =
	| 'nodeNotCovered'
	| 'credentialTypeNotCovered'
	| 'versionTooLow'
	| 'unsupportedAction'
	| 'hiddenPropertySet';

export type AiGatewayEligibility =
	| { eligible: true }
	| { eligible: false; reason: AiGatewayEligibilityReason; details?: string };

/**
 * Decides whether the AI Gateway can serve credentials for `node` of type
 * `credentialType`, given the current gateway config. Pure function — no I/O.
 * Callers use this from within auto-assign: on `eligible: true` attach the
 * gateway sentinel; on `eligible: false` leave the slot empty (pre-change
 * behavior) and log the `reason` for telemetry.
 *
 * `resolvedParameters` (parameters with node-type defaults applied) is used ONLY
 * for the `resource`/`operation` action check, so a node relying on its default
 * action stays eligible. The `hiddenNodeProperties` check deliberately uses the
 * raw `node.parameters` — a hidden property that only carries its default value
 * was not set by the user and must not disqualify the node.
 */
export function checkAiGatewayEligibility(
	node: Pick<INode, 'type' | 'typeVersion' | 'parameters'>,
	credentialType: string,
	config: AiGatewayConfigDto,
	resolvedParameters?: Record<string, unknown>,
): AiGatewayEligibility {
	const key = resolveNodeKey(node.type, config.nodes);
	if (!key) return { eligible: false, reason: 'nodeNotCovered' };

	if (!config.credentialTypes.includes(credentialType)) {
		return { eligible: false, reason: 'credentialTypeNotCovered' };
	}

	const minVersion = config.minNodeTypeVersion?.[key];
	if (minVersion !== undefined && node.typeVersion < minVersion) {
		return {
			eligible: false,
			reason: 'versionTooLow',
			details: `requires typeVersion >= ${minVersion}`,
		};
	}

	const hidden = config.hiddenNodeProperties?.[key];
	if (hidden?.length) {
		const params = node.parameters ?? {};
		const offending = hidden.find((prop) => hasNestedProperty(params, prop));
		if (offending !== undefined) {
			return {
				eligible: false,
				reason: 'hiddenPropertySet',
				details: `property "${offending}" is hidden when using n8n credits`,
			};
		}
	}

	const actions = config.supportedActions?.[key];
	if (actions) {
		// Read resource/operation from defaults-resolved params so a node relying
		// on its default action is judged against the values it will actually run.
		const params = resolvedParameters ?? node.parameters ?? {};
		const resource = typeof params.resource === 'string' ? params.resource : OPERATION_ONLY;
		const operation = typeof params.operation === 'string' ? params.operation : undefined;
		const allowedOps = actions[resource];
		// When the gateway defines an action allowlist for this node, require an
		// explicit operation that is on the list. A missing operation is not
		// eligible — we don't grant a managed credential for an unspecified action.
		if (!allowedOps || operation === undefined || !allowedOps.includes(operation)) {
			return {
				eligible: false,
				reason: 'unsupportedAction',
				details:
					resource === OPERATION_ONLY
						? `operation "${operation ?? ''}" not supported`
						: `${resource}.${operation ?? ''} not supported`,
			};
		}
	}

	return { eligible: true };
}

function resolveNodeKey(nodeType: string, nodes: string[]): string | null {
	if (nodes.includes(nodeType)) return nodeType;
	const stripped = stripToolSuffix(nodeType);
	if (stripped !== nodeType && nodes.includes(stripped)) return stripped;
	return null;
}

/** Whether `key` appears as a property name at any depth in `value` (nested objects and arrays included). */
function hasNestedProperty(value: unknown, key: string): boolean {
	if (Array.isArray(value)) {
		return value.some((item) => hasNestedProperty(item, key));
	}
	if (value !== null && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if (Object.prototype.hasOwnProperty.call(record, key)) return true;
		return Object.values(record).some((v) => hasNestedProperty(v, key));
	}
	return false;
}
