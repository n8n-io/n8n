import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const { recommended } = configs;
const hardcodedRules = Object.fromEntries(
	Object.entries(recommended.rules).filter(([ruleId]) =>
		ruleId.startsWith('@n8n/community-nodes/no-hardcoded-'),
	),
);

function lintCode(code: string, filename = 'SmsApi.node.js') {
	return new Linter().verify(code, [{ plugins: recommended.plugins, rules: hardcodedRules }], {
		filename,
	});
}

function lintPartnerId(value: string, field = 'partner_id', filename = 'SmsApi.node.js') {
	return lintCode(
		`class SmsApi {
			async execute() {
				return this.helpers.httpRequest({ qs: { ${field}: ${value} } });
			}
		}`,
		filename,
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

	it('detects camelCase IDs and static string keys in node source', () => {
		expect(lintPartnerId("'fixed-partner'", 'partnerId', 'SmsApi.node.ts')).toHaveLength(1);
		expect(lintPartnerId("'fixed-partner'", "'partner_id'")).toHaveLength(1);
		expect(lintPartnerId("'fixed-client'", 'client_id')).toHaveLength(1);
	});

	it('detects fixed IDs in declarations and assignments', () => {
		expect(
			lintCode(`const partnerId = 'fixed-partner';
			class SmsApi {
				partner_id = 'fixed-partner';
				execute() { this.partnerId = 'fixed-partner'; }
			}`),
		).toHaveLength(3);
	});

	it('ignores unrelated fields and files outside node source', () => {
		expect(lintPartnerId("'fixed-partner'", 'operationId')).toEqual([]);
		expect(lintPartnerId("'fixed-partner'", 'partner_id', 'SmsApi.test.js')).toEqual([]);
	});
});
