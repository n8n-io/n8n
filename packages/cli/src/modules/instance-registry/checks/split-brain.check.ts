import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

const CHECK_CODE = 'cluster.split-brain';
const AUDIT_DETECTED = 'n8n.audit.cluster.split-brain.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.split-brain.resolved';

/**
 * Returns the sorted list of leaders as a deterministic fingerprint.
 * Empty fingerprint means "no split-brain" (0 or 1 leader is healthy).
 */
function computeFingerprint(instances: Iterable<InstanceRegistration>): {
	fingerprint: string;
	leaders: Array<{ instanceKey: string; hostId: string; instanceType: string }>;
} {
	const leaders = [...instances]
		.filter((i) => i.instanceRole === 'leader')
		.map((i) => ({
			instanceKey: i.instanceKey,
			hostId: i.hostId,
			instanceType: i.instanceType,
		}))
		.sort((a, b) => a.instanceKey.localeCompare(b.instanceKey));

	return {
		fingerprint: leaders.length > 1 ? leaders.map((l) => l.instanceKey).join('|') : '',
		leaders,
	};
}

@ClusterCheck()
export class SplitBrainCheck implements IClusterCheck {
	checkDescription = {
		name: 'split-brain',
		displayName: 'Split-brain',
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

		const leaderKeys = current.leaders.map((l) => l.instanceKey);
		const result: ClusterCheckResult = {
			warnings: [
				{
					code: CHECK_CODE,
					message: `Detected ${current.leaders.length} instances claiming leader role: ${leaderKeys.join(', ')}`,
					severity: 'error',
					context: { leaders: current.leaders },
				},
			],
		};

		if (current.fingerprint !== previous.fingerprint) {
			result.auditEvents = [{ eventName: AUDIT_DETECTED, payload: { leaders: current.leaders } }];
		}

		return result;
	}
}
