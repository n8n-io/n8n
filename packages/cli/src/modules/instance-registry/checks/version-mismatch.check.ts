import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

import { buildCheckResult } from './build-check-result';

const CHECK_CODE = 'cluster.version-mismatch';
const AUDIT_DETECTED = 'n8n.audit.cluster.version-mismatch.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.version-mismatch.resolved';

/**
 * Returns the set of distinct versions running in the cluster, plus a
 * deterministic fingerprint of that set (sorted, pipe-joined) used to
 * deduplicate `detected` audit events across runs.
 */
function computeFingerprint(instances: Iterable<InstanceRegistration>): {
	fingerprint: string;
	versions: string[];
} {
	const versions = [...new Set([...instances].map((i) => i.version))].sort();
	return { fingerprint: versions.join('|'), versions };
}

@ClusterCheck()
export class VersionMismatchCheck implements IClusterCheck {
	checkDescription = {
		name: 'version-mismatch',
		displayName: 'Version mismatch',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const current = computeFingerprint(context.currentState.values());
		const previous = computeFingerprint(context.previousState.values());

		const { versions } = current;

		return buildCheckResult({
			hasProblem: versions.length > 1,
			hadProblem: previous.versions.length > 1,
			fingerprint: current.fingerprint,
			previousFingerprint: previous.fingerprint,
			code: CHECK_CODE,
			severity: 'error',
			message: `Detected multiple n8n versions in the cluster: ${versions.join(', ')}`,
			context: { versions },
			auditDetected: AUDIT_DETECTED,
			auditResolved: AUDIT_RESOLVED,
		});
	}
}
