import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const { recommended } = configs;
const hardcodedRules = Object.fromEntries(
	Object.entries(recommended.rules).filter(([ruleId]) =>
		ruleId.startsWith('@n8n/community-nodes/no-hardcoded-'),
	),
);

function lintPartnerId(value: string) {
	return new Linter().verify(
		`class SmsApi {
			async execute() {
				return this.helpers.httpRequest({ qs: { partner_id: ${value} } });
			}
		}`,
		[{ plugins: recommended.plugins, rules: hardcodedRules }],
		{ filename: 'SmsApi.node.js' },
	);
}

describe('community node hardcoded IDs (CE-2056)', () => {
	it('accepts partner IDs from node parameters and credentials', () => {
		expect(lintPartnerId("this.getNodeParameter('partnerId', 0)")).toEqual([]);
		expect(lintPartnerId("(await this.getCredentials('smsApi')).partnerId")).toEqual([]);
	});

	it('rejects a fixed partner_id in a community node request', () => {
		// CE-2056: Community nodes must let users configure partner IDs.
		expect(lintPartnerId("'fixed-partner'")).toEqual([
			expect.objectContaining({
				ruleId: '@n8n/community-nodes/no-hardcoded-ids',
				severity: 2,
				message: expect.stringContaining('partner_id'),
			}),
		]);
	});
});
