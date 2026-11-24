import credentialSetupability from '../credential-setupability.json';
import { addSetupPreference } from '../setup-preference';

function expectedPreference(metric: (typeof credentialSetupability)[number]) {
	return {
		type: metric.id,
		setupCompletionPercent:
			metric.setupability === null ? null : Math.round(metric.setupability * 100),
		popularityScore: metric.popularity === null ? null : Math.round(metric.popularity * 10) / 10,
	};
}

describe('credential setupability data', () => {
	it('should contain canonical credential metrics', () => {
		expect(credentialSetupability.length).toBeGreaterThan(0);
		expect(new Set(credentialSetupability.map(({ id }) => id)).size).toBe(
			credentialSetupability.length,
		);

		for (const metric of credentialSetupability) {
			expect(Object.keys(metric).sort()).toEqual(['id', 'popularity', 'setupability']);
			expect(metric.id.trim()).toBe(metric.id);
			expect(metric.id.length).toBeGreaterThan(0);
			if (metric.setupability !== null) {
				expect(metric.setupability).toBeGreaterThanOrEqual(0);
				expect(metric.setupability).toBeLessThanOrEqual(1);
				expect(metric.setupability * 20).toBeCloseTo(Math.round(metric.setupability * 20));
			}
			if (metric.popularity !== null) {
				expect(metric.popularity).toBeGreaterThanOrEqual(0);
				expect(metric.popularity).toBeLessThanOrEqual(1);
				expect(metric.popularity * 10).toBeCloseTo(Math.round(metric.popularity * 10));
			}
		}
	});

	it('should attach metrics only for credentials supported by the node', () => {
		const knownMetric = credentialSetupability.find(({ setupability }) => setupability !== null);
		const unknownMetric = credentialSetupability.find(({ setupability }) => setupability === null);
		if (!knownMetric || !unknownMetric) throw new Error('Expected known and unknown setupability');
		const credentialTypes = [knownMetric.id, unknownMetric.id, knownMetric.id, 'missing'];
		const node = { name: 'n8n-nodes-base.gmail' };

		expect(addSetupPreference(node, credentialTypes)).toEqual({
			...node,
			setupPreference: [expectedPreference(knownMetric), expectedPreference(unknownMetric)].sort(
				(left, right) => left.type.localeCompare(right.type),
			),
		});
	});

	it('should leave nodes without matching credential metrics unchanged', () => {
		const node = { name: 'n8n-nodes-base.unknownSetupability' };

		expect(addSetupPreference(node, ['unknownCredential'])).toBe(node);
	});
});
