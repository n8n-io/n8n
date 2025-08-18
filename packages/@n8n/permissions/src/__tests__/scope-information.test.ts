import { ALL_SCOPES } from '@/scope-information';

describe('Scope Information', () => {
	it('ensure scopes are defined correctly', () => {
		expect(ALL_SCOPES).toMatchSnapshot();
	});
});
