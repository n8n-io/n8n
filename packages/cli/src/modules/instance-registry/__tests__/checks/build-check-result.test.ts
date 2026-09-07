import { buildCheckResult } from '../../checks/build-check-result';

const build = (currentFingerprint: string, previousFingerprint: string) =>
	buildCheckResult({
		currentFingerprint,
		previousFingerprint,
		code: 'cluster.example',
		severity: 'warning',
		message: 'Detected a problem',
		context: { hostIds: ['host-a'] },
		auditDetected: 'n8n.audit.cluster.example.detected',
		auditResolved: 'n8n.audit.cluster.example.resolved',
	});

describe('buildCheckResult', () => {
	it('returns nothing when there is no problem and there was none before', () => {
		expect(build('', '')).toEqual({});
	});

	it('emits the resolved audit event when the problem is cleared', () => {
		expect(build('', 'fp-1')).toEqual({
			auditEvents: [{ eventName: 'n8n.audit.cluster.example.resolved', payload: {} }],
		});
	});

	it('emits a warning and the detected audit event for a new problem', () => {
		expect(build('fp-1', '')).toEqual({
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
		const result = build('fp-2', 'fp-1');

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toEqual([
			expect.objectContaining({ eventName: 'n8n.audit.cluster.example.detected' }),
		]);
	});

	it('emits a warning without an audit event for an unchanged problem', () => {
		const result = build('fp-1', 'fp-1');

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toBeUndefined();
	});

	it('never emits push notifications', () => {
		for (const result of [
			build('', ''),
			build('', 'fp-1'),
			build('fp-1', ''),
			build('fp-1', 'fp-1'),
		]) {
			expect(result.pushNotifications).toBeUndefined();
		}
	});
});
