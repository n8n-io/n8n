import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

import { buildCheckResult } from './build-check-result';

const CHECK_CODE = 'cluster.hostid-clash';
const AUDIT_DETECTED = 'n8n.audit.cluster.hostid-clash.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.hostid-clash.resolved';

/**
 * Analyzes hostId collisions. `fingerprint` is a deterministic identity for the
 * current set of clashing hostIds, used to deduplicate `detected` audit events
 * across runs.
 *
 * Fingerprints on hostIds (not instance keys) because instance keys rotate on
 * restart; the operator-relevant signal is which *hosts* are misconfigured.
 */
function computeFingerprint(instances: Iterable<InstanceRegistration>): {
	fingerprint: string;
	clashing: Array<{ hostId: string; instanceKeys: string[] }>;
} {
	const byHost = new Map<string, string[]>();
	for (const instance of instances) {
		const keys = byHost.get(instance.hostId) ?? [];
		keys.push(instance.instanceKey);
		byHost.set(instance.hostId, keys);
	}

	const clashing = Array.from(byHost.entries())
		.filter(([, keys]) => keys.length > 1)
		.map(([hostId, keys]) => ({ hostId, instanceKeys: [...keys].sort() }))
		.sort((a, b) => a.hostId.localeCompare(b.hostId));

	return {
		fingerprint: clashing.map((c) => c.hostId).join('|'),
		clashing,
	};
}

@ClusterCheck()
export class HostIdClashCheck implements IClusterCheck {
	checkDescription = {
		name: 'hostid-clash',
		displayName: 'Host ID clash',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const current = computeFingerprint(context.currentState.values());
		const previous = computeFingerprint(context.previousState.values());

		const hostIds = current.clashing.map((c) => c.hostId);

		return buildCheckResult({
			hasProblem: current.clashing.length > 0,
			hadProblem: previous.clashing.length > 0,
			fingerprint: current.fingerprint,
			previousFingerprint: previous.fingerprint,
			code: CHECK_CODE,
			severity: 'warning',
			message: `Detected multiple instances sharing the same hostId: ${hostIds.join(', ')}`,
			context: { clashing: current.clashing },
			auditDetected: AUDIT_DETECTED,
			auditResolved: AUDIT_RESOLVED,
		});
	}
}
