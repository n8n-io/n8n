import { buildCheckResult } from '../../checks/build-check-result';

const build = (args: {
	hasProblem: boolean;
	hadProblem: boolean;
	fingerprint: string;
	previousFingerprint: string;
}) =>
	buildCheckResult({
		...args,
		code: 'cluster.example',
		severity: 'warning',
		message: 'Detected a problem',
		context: { hostIds: ['host-a'] },
		auditDetected: 'n8n.audit.cluster.example.detected',
		auditResolved: 'n8n.audit.cluster.example.resolved',
	});

const noProblem = {
	hasProblem: false,
	hadProblem: false,
	fingerprint: '',
	previousFingerprint: '',
};
const resolved = {
	hasProblem: false,
	hadProblem: true,
	fingerprint: '',
	previousFingerprint: 'fp-1',
};
const newProblem = {
	hasProblem: true,
	hadProblem: false,
	fingerprint: 'fp-1',
	previousFingerprint: '',
};
const ongoingProblem = {
	hasProblem: true,
	hadProblem: true,
	fingerprint: 'fp-1',
	previousFingerprint: 'fp-1',
};

describe('buildCheckResult', () => {
	it('returns nothing when there is no problem and there was none before', () => {
		expect(build(noProblem)).toEqual({});
	});

	it('emits the resolved audit event when the problem is cleared', () => {
		expect(build(resolved)).toEqual({
			auditEvents: [{ eventName: 'n8n.audit.cluster.example.resolved', payload: {} }],
		});
	});

	it('emits a warning and the detected audit event for a new problem', () => {
		expect(build(newProblem)).toEqual({
			warnings: [
				{
					code: 'cluster.example',
					message: 'Detected a problem',
					severity: 'warning',
					context: { hostIds: ['host-a'] },
				},
			],
			auditEvents: [
				{
					eventName: 'n8n.audit.cluster.example.detected',
					payload: { hostIds: ['host-a'] },
				},
			],
		});
	});

	it('emits the detected audit event again when the problem changes', () => {
		const result = build({
			hasProblem: true,
			hadProblem: true,
			fingerprint: 'fp-2',
			previousFingerprint: 'fp-1',
		});

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toEqual([
			expect.objectContaining({ eventName: 'n8n.audit.cluster.example.detected' }),
		]);
	});

	it('emits a warning without an audit event for an unchanged problem', () => {
		const result = build(ongoingProblem);

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toBeUndefined();
	});

	it('warns on a problem whose fingerprint is empty', () => {
		const result = build({
			hasProblem: true,
			hadProblem: false,
			fingerprint: '',
			previousFingerprint: '',
		});

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toEqual([
			expect.objectContaining({ eventName: 'n8n.audit.cluster.example.detected' }),
		]);
	});

	it('deduplicates the detected event for an ongoing problem with an empty fingerprint', () => {
		const result = build({
			hasProblem: true,
			hadProblem: true,
			fingerprint: '',
			previousFingerprint: '',
		});

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toBeUndefined();
	});

	it('never emits push notifications', () => {
		for (const result of [
			build(noProblem),
			build(resolved),
			build(newProblem),
			build(ongoingProblem),
		]) {
			expect(result.pushNotifications).toBeUndefined();
		}
	});
});
