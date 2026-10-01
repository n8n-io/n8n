import {
	DEFAULT_SANDBOX_PROVIDER,
	isSandboxProvider,
	normalizeSandboxProvider,
} from '../../../workspace/sandbox/provider';

describe('normalizeSandboxProvider', () => {
	it('returns n8n-sandbox for undefined', () => {
		expect(normalizeSandboxProvider(undefined)).toBe('n8n-sandbox');
	});

	it('returns n8n-sandbox for empty string', () => {
		expect(normalizeSandboxProvider('')).toBe('n8n-sandbox');
	});

	it('returns n8n-sandbox for valid n8n-sandbox value', () => {
		expect(normalizeSandboxProvider('n8n-sandbox')).toBe('n8n-sandbox');
	});

	it('returns daytona for valid daytona value', () => {
		expect(normalizeSandboxProvider('daytona')).toBe('daytona');
	});

	it('returns n8n-sandbox for unrecognized value', () => {
		expect(normalizeSandboxProvider('bad-value')).toBe('n8n-sandbox');
	});
});

describe('isSandboxProvider', () => {
	it('returns true for daytona', () => {
		expect(isSandboxProvider('daytona')).toBe(true);
	});

	it('returns false for bad value', () => {
		expect(isSandboxProvider('bad-value')).toBe(false);
	});
});

describe('DEFAULT_SANDBOX_PROVIDER', () => {
	it('is n8n-sandbox', () => {
		expect(DEFAULT_SANDBOX_PROVIDER).toBe('n8n-sandbox');
	});
});
