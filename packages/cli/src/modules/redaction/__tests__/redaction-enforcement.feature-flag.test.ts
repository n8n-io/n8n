import {
	N8N_ENV_FEAT_REDACTION_ENFORCEMENT,
	isRedactionEnforcementEnabled,
} from '../redaction-enforcement.feature-flag';

describe('isRedactionEnforcementEnabled', () => {
	const original = process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];

	afterEach(() => {
		if (original === undefined) {
			delete process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];
		} else {
			process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] = original;
		}
	});

	it('returns false when the flag is unset', () => {
		delete process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];
		expect(isRedactionEnforcementEnabled()).toBe(false);
	});

	it("returns true when the flag is 'true'", () => {
		process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] = 'true';
		expect(isRedactionEnforcementEnabled()).toBe(true);
	});
});
