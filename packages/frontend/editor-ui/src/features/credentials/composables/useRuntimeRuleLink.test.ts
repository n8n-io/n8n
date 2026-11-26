import { getRuntimeRuleAlias } from './useRuntimeRuleLink';

describe('getRuntimeRuleAlias', () => {
	it('reads the alias from the stub name', () => {
		expect(getRuntimeRuleAlias('Request value: gmail-caller')).toBe('gmail-caller');
	});

	it.each([undefined, '', 'Gmail account', 'Request value: '])(
		'returns undefined for %j',
		(name) => {
			expect(getRuntimeRuleAlias(name)).toBeUndefined();
		},
	);
});
