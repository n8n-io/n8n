import type { ClusterCheckResult } from '@n8n/decorators';

/**
 * Builds the result of a fingerprint-based cluster check.
 *
 * `hasProblem` alone decides whether the check warns, so a problem stays
 * reported even when its fingerprint is empty. The fingerprints only
 * deduplicate the `detected` audit event across runs, and the `resolved` audit
 * event is only emitted when the previous run did report a problem.
 */
export function buildCheckResult(args: {
	hasProblem: boolean;
	hadProblem: boolean;
	fingerprint: string;
	previousFingerprint: string;
	code: string;
	severity: 'warning' | 'error';
	message: string;
	context: Record<string, unknown>;
	auditDetected: string;
	auditResolved: string;
}): ClusterCheckResult {
	const { hasProblem, hadProblem, fingerprint, previousFingerprint, context } = args;

	if (!hasProblem) {
		if (!hadProblem) return {};
		return { auditEvents: [{ eventName: args.auditResolved, payload: {} }] };
	}

	const result: ClusterCheckResult = {
		warnings: [{ code: args.code, message: args.message, severity: args.severity, context }],
	};

	// A problem that was absent before is always a fresh detection, even if its
	// fingerprint matches the previous (problem-free) one.
	if (!hadProblem || fingerprint !== previousFingerprint) {
		result.auditEvents = [{ eventName: args.auditDetected, payload: context }];
	}

	return result;
}
