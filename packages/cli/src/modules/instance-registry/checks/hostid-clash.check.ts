import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

const CHECK_CODE = 'cluster.hostid-clash';
const AUDIT_DETECTED = 'n8n.audit.cluster.hostid-clash.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.hostid-clash.resolved';

/**
 * Returns the set of hostIds that are shared by more than one instance, as a
 * deterministic fingerprint (sorted, pipe-joined). Returns an empty string
 * when no hostId is shared, indicating "no clash".
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

	const clashing: Array<{ hostId: string; instanceKeys: string[] }> = [];
	for (const [hostId, instanceKeys] of byHost) {
		if (instanceKeys.length > 1) {
			clashing.push({ hostId, instanceKeys: [...instanceKeys].sort() });
		}
	}
	clashing.sort((a, b) => a.hostId.localeCompare(b.hostId));

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

		if (current.fingerprint === '') {
			if (previous.fingerprint !== '') {
				return { auditEvents: [{ eventName: AUDIT_RESOLVED, payload: {} }] };
			}
			return {};
		}

		const hostIds = current.clashing.map((c) => c.hostId);
		const result: ClusterCheckResult = {
			warnings: [
				{
					code: CHECK_CODE,
					message: `Detected multiple instances sharing the same hostId: ${hostIds.join(', ')}`,
					severity: 'warning',
					context: { clashing: current.clashing },
				},
			],
		};

		if (current.fingerprint !== previous.fingerprint) {
			result.auditEvents = [{ eventName: AUDIT_DETECTED, payload: { clashing: current.clashing } }];
		}

		return result;
	}
}
