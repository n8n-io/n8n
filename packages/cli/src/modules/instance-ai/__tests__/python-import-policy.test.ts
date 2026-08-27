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

	it('is not authoritative in external runner mode, where the runner is configured separately', () => {
		expect(
			buildPythonImportPolicy({ stdlibAllow: 're', externalAllow: '', mode: 'external' }),
		).toEqual({ stdlib: ['re'], external: [], authoritative: false });
	});
});
