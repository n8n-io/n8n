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
 * Analyzes leadership state. `fingerprint` is a deterministic identity for the
 * current leader set, used to deduplicate `detected` audit events across runs.
 */
function computeFingerprint(instances: Iterable<InstanceRegistration>): {
	splitBrain: boolean;
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

	const splitBrain = leaders.length > 1;

	return {
		splitBrain,
		fingerprint: splitBrain ? leaders.map((l) => l.instanceKey).join('|') : '',
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

		if (!current.splitBrain) {
			if (previous.splitBrain) {
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
