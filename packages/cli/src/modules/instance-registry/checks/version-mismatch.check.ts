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
 * Returns the set of distinct versions running in the cluster as a
 * deterministic fingerprint (sorted, pipe-joined). Returns an empty string
 * when there is only a single version, indicating "no mismatch".
 */
function computeFingerprint(instances: Iterable<InstanceRegistration>): string {
	const versions = [...new Set([...instances].map((i) => i.version))].sort();
	return versions.length > 1 ? versions.join('|') : '';
}

@ClusterCheck()
export class VersionMismatchCheck implements IClusterCheck {
	checkDescription = {
		name: 'version-mismatch',
		displayName: 'Version mismatch',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const currentFingerprint = computeFingerprint(context.currentState.values());
		const previousFingerprint = computeFingerprint(context.previousState.values());

		const versions = currentFingerprint.split('|');

		return buildCheckResult({
			currentFingerprint,
			previousFingerprint,
			code: CHECK_CODE,
			severity: 'error',
			message: `Detected multiple n8n versions in the cluster: ${versions.join(', ')}`,
			context: { versions },
			auditDetected: AUDIT_DETECTED,
			auditResolved: AUDIT_RESOLVED,
		});
	}
}
