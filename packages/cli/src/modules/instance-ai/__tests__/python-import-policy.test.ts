import { buildPythonImportPolicy } from '../python-import-policy';

describe('buildPythonImportPolicy', () => {
	it('reports nothing allowed when both allowlists are empty', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: '', externalAllow: '', mode: 'internal' }),
		).toEqual({ stdlib: [], external: [], authoritative: true });
	});

	it('splits comma-separated modules and trims whitespace', () => {
		expect(
			buildPythonImportPolicy({
				stdlibAllow: 're, json ,math',
				externalAllow: '',
				mode: 'internal',
			}),
		).toEqual({ stdlib: ['re', 'json', 'math'], external: [], authoritative: true });
	});

	it('keeps the wildcard as its own entry', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: '*', externalAllow: 'pandas', mode: 'internal' }),
		).toEqual({ stdlib: ['*'], external: ['pandas'], authoritative: true });
	});

	it('drops empty segments from a trailing or doubled comma', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: 're,,json,', externalAllow: '', mode: 'internal' }),
		).toEqual({ stdlib: ['re', 'json'], external: [], authoritative: true });
	});

	it('reports a wildcard combined with named modules as a misconfiguration', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: '*,re', externalAllow: '', mode: 'internal' }),
		).toEqual({ stdlib: [], external: [], authoritative: true, misconfigured: true });
	});

	// In external runner mode these values are not the ones the runner reads, so an
	// invalid one says nothing about whether the runner will start. Claiming a
	// misconfiguration there would tell the builder Python is unusable on an instance
	// whose separately-configured runner is perfectly fine.
	it('does not call an invalid allowlist a misconfiguration in external runner mode', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: '*,re', externalAllow: '', mode: 'external' }),
		).toEqual({ stdlib: [], external: [], authoritative: false });
	});

	it('is not authoritative in external runner mode, where the runner is configured separately', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: 're', externalAllow: '', mode: 'external' }),
		).toEqual({ stdlib: ['re'], external: [], authoritative: false });
	});
});
