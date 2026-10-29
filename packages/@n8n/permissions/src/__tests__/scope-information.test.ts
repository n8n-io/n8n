import { ALL_SCOPES } from '@/scope-information';

describe('Scope Information', () => {
	it('ensure scopes are defined correctly', () => {
		expect(ALL_SCOPES).toMatchSnapshot();
	});

	it('does not contain wildcard scopes', () => {
		expect(ALL_SCOPES).not.toContain('*');
		expect(ALL_SCOPES.filter((scope) => scope.endsWith(':*'))).toEqual([]);
	});

	it('does not define the retired apiKey:list and apiKey:delete scopes', () => {
		// Listing and revoking own API keys needs no scope, and apiKey:manage gates
		// other users' keys. Nothing checks these two, so they were removed (IAM-1109).
		expect(ALL_SCOPES).not.toContain('apiKey:list');
		expect(ALL_SCOPES).not.toContain('apiKey:delete');
	});
});
