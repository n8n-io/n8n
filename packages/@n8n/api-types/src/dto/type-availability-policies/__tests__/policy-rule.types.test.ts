import { isNodeTypePolicyRule } from '../policy-rule.types';

describe('isNodeTypePolicyRule', () => {
	it.each(['name', 'package'] as const)('accepts a %s rule', (kind) => {
		expect(isNodeTypePolicyRule({ id: 'r1', action: 'deny', selector: { kind, value: 'x' } })).toBe(
			true,
		);
	});

	it('rejects an extends rule, which only credential type policies accept', () => {
		expect(
			isNodeTypePolicyRule({
				id: 'r1',
				action: 'deny',
				selector: { kind: 'extends', value: 'oAuth2Api' },
			}),
		).toBe(false);
	});
});
