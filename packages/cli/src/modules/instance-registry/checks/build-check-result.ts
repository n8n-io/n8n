import type { ClusterCheckResult } from '@n8n/decorators';

/**
 * Builds the result of a fingerprint-based cluster check. An empty
 * `currentFingerprint` means "no problem". Comparing both fingerprints
 * deduplicates the `detected` audit event across runs, and the `resolved` audit
 * event is only emitted when the previous run did report a problem.
 */
export function buildCheckResult(args: {
	currentFingerprint: string;
	previousFingerprint: string;
	code: string;
	severity: 'warning' | 'error';
	message: string;
	context: Record<string, unknown>;
	auditDetected: string;
	auditResolved: string;
}): ClusterCheckResult {
	const { currentFingerprint, previousFingerprint, context } = args;

	if (currentFingerprint === '') {
		if (previousFingerprint === '') return {};
		return { auditEvents: [{ eventName: args.auditResolved, payload: {} }] };
	}

	const result: ClusterCheckResult = {
		warnings: [{ code: args.code, message: args.message, severity: args.severity, context }],
	};

	if (currentFingerprint !== previousFingerprint) {
		result.auditEvents = [{ eventName: args.auditDetected, payload: context }];
	}

	return result;
}
