import { ALL_SCOPES } from '@/scope-information';

describe('Scope Information', () => {
	it('ensure scopes are defined correctly', () => {
		expect(ALL_SCOPES).toMatchSnapshot();
	});

	it('does not contain wildcard scopes', () => {
		expect(ALL_SCOPES).not.toContain('*');
		expect(ALL_SCOPES.filter((scope) => scope.endsWith(':*'))).toEqual([]);
	});
});
