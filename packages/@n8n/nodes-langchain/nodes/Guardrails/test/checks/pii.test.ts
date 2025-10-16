import type { PIIConfig } from '../../actions/checks/pii';
import { PIIEntity, createPiiCheckFn } from '../../actions/checks/pii';

describe('pii guardrail', () => {
	it('masks detected PII when block=false', async () => {
		const config: PIIConfig = {
			entities: [PIIEntity.EMAIL_ADDRESS, PIIEntity.US_SSN],
			block: false,
		};
		const text = 'Contact john@example.com SSN: 111-22-3333';

		const result = await createPiiCheckFn(config)(text);

		expect(result.tripwireTriggered).toBe(false);
		expect(result.info?.maskEntities?.EMAIL_ADDRESS).toEqual(['john@example.com']);
		expect(result.info?.maskEntities?.US_SSN).toEqual(['111-22-3333']);
	});

	it('triggers tripwire when block=true', async () => {
		const config: PIIConfig = {
			entities: [PIIEntity.PHONE_NUMBER],
			block: true,
		};

		const result = await createPiiCheckFn(config)('Call me at (415) 123-4567');

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.maskEntities?.PHONE_NUMBER?.[0]).toContain('415');
	});

	it('throws on empty input', async () => {
		const config: PIIConfig = {
			entities: [PIIEntity.EMAIL_ADDRESS],
			block: false,
		};

		const exec = async () => {
			return await createPiiCheckFn(config)('');
		};

		await expect(exec()).rejects.toThrow('Text cannot be empty or null');
	});
});
