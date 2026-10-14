import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

import { buildCheckResult } from './build-check-result';

const CHECK_CODE = 'cluster.split-brain';
const AUDIT_DETECTED = 'n8n.audit.cluster.split-brain.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.split-brain.resolved';

/**
 * Analyzes leadership state. `fingerprint` is a deterministic identity for the
 * current leader set, used to deduplicate `detected` audit events across runs.
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
		fingerprint: leaders.map((l) => l.instanceKey).join('|'),
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

		const leaderKeys = current.leaders.map((l) => l.instanceKey);

		return buildCheckResult({
			hasProblem: current.leaders.length > 1,
			hadProblem: previous.leaders.length > 1,
			fingerprint: current.fingerprint,
			previousFingerprint: previous.fingerprint,
			code: CHECK_CODE,
			severity: 'error',
			message: `Detected ${current.leaders.length} instances claiming leader role: ${leaderKeys.join(', ')}`,
			context: { leaders: current.leaders },
			auditDetected: AUDIT_DETECTED,
			auditResolved: AUDIT_RESOLVED,
		});
	}
}
