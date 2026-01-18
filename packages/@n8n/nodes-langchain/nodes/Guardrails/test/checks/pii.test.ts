import type { PIIConfig } from '../../actions/checks/pii';
import { PIIEntity, createPiiCheckFn } from '../../actions/checks/pii';

describe('pii guardrail', () => {
	it('masks detected PII and triggers tripwire', async () => {
		const config: PIIConfig = {
			entities: [PIIEntity.EMAIL_ADDRESS, PIIEntity.US_SSN],
		};
		const text = 'Contact john@example.com SSN: 111-22-3333';

		const result = await createPiiCheckFn(config)(text);

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.maskEntities?.EMAIL_ADDRESS).toEqual(['john@example.com']);
		expect(result.info?.maskEntities?.US_SSN).toEqual(['111-22-3333']);
	});

	it('returns no findings on empty input', async () => {
		const config: PIIConfig = {
			entities: [PIIEntity.EMAIL_ADDRESS],
		};

		const result = await createPiiCheckFn(config)('');
		expect(result.tripwireTriggered).toBe(false);
		expect(result.info?.maskEntities).toEqual({});
		expect(result.info?.analyzerResults).toEqual([]);
	});
});
