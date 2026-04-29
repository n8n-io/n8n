import { selectBuilderToolNames } from '../harness/builder-tools';

describe('selectBuilderToolNames', () => {
	describe.each(['sandbox', 'inline'] as const)('mode=%s', (mode) => {
		it('includes templates by default', () => {
			expect(selectBuilderToolNames({ mode, includeTemplates: true })).toContain('templates');
		});

		it('omits templates when includeTemplates is false', () => {
			const names = selectBuilderToolNames({ mode, includeTemplates: false });
			expect(names).not.toContain('templates');
		});

		it('keeps the rest of the tool list intact when templates are withheld', () => {
			const withTpl = selectBuilderToolNames({ mode, includeTemplates: true });
			const withoutTpl = selectBuilderToolNames({ mode, includeTemplates: false });
			expect(withoutTpl).toEqual(withTpl.filter((n) => n !== 'templates'));
		});
	});

	it('exposes the sandbox-only tool surface (no build-workflow)', () => {
		const names = selectBuilderToolNames({ mode: 'sandbox', includeTemplates: true });
		expect(names).toContain('credentials');
		expect(names).not.toContain('build-workflow');
	});

	it('exposes the inline tool surface (no credentials, has build-workflow)', () => {
		const names = selectBuilderToolNames({ mode: 'inline', includeTemplates: true });
		expect(names).toContain('build-workflow');
		expect(names).not.toContain('credentials');
	});
});
