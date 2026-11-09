import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const { recommended } = configs;
const hardcodedRules = Object.fromEntries(
	Object.entries(recommended.rules).filter(
		([ruleId]) => ruleId === '@n8n/community-nodes/no-hardcoded-ids',
	),
);

function lintCode(code: string, filename = 'SmsApi.node.js') {
	return new Linter().verify(
		code,
		[{ files: ['**/*.{js,ts}'], plugins: recommended.plugins, rules: hardcodedRules }],
		{ filename },
	);
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

	it.each(["'fixed-partner'", '"fixed-partner"', '`fixed-partner`'])(
		'rejects a fixed partner_id in a community node request: %s',
		(value) => {
			// CE-2056: Community nodes must let users configure partner IDs.
			expect(lintPartnerId(value)).toEqual([
				expect.objectContaining({
					ruleId: '@n8n/community-nodes/no-hardcoded-ids',
					severity: 2,
					message: expect.stringContaining('partner_id'),
				}),
			]);
		},
	);

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

	it.each([
		['variable declaration', 'const partner_id = `fixed-partner`;'],
		['class field', 'class SmsApi { partner_id = `fixed-partner`; }'],
		['object property', 'const qs = { partner_id: `fixed-partner` };'],
		['identifier assignment', 'partner_id = `fixed-partner`;'],
		['member assignment', 'qs.partner_id = `fixed-partner`;'],
		['computed member assignment', "qs['partner_id'] = `fixed-partner`;"],
	])('detects a static template value: %s', (_name, code) => {
		expect(lintCode(code)).toEqual([
			expect.objectContaining({
				ruleId: '@n8n/community-nodes/no-hardcoded-ids',
				messageId: 'hardcodedId',
				severity: 2,
				message: expect.stringContaining('partner_id'),
			}),
		]);
	});

	it.each(['SmsApi.node.js', 'SmsApi.node.ts'])(
		'detects static template keys in %s',
		(filename) => {
			expect(
				lintCode(
					`const qs = { [\`partner_id\`]: 'fixed-partner' };
					class SmsApi { [\`partner_id\`] = 'fixed-partner'; }
					qs[\`partner_id\`] = 'fixed-partner';`,
					filename,
				),
			).toEqual(
				Array.from({ length: 3 }, () =>
					expect.objectContaining({
						ruleId: '@n8n/community-nodes/no-hardcoded-ids',
						messageId: 'hardcodedId',
						severity: 2,
						message: expect.stringContaining('partner_id'),
					}),
				),
			);
		},
	);

	it('accepts dynamic template values and keys', () => {
		/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string -- Keep template expressions in the source fixtures. */
		expect(lintPartnerId("`prefix-${this.getNodeParameter('partnerId', 0)}`")).toEqual([]);
		expect(lintPartnerId("`${(await this.getCredentials('smsApi')).partnerId}`")).toEqual([]);
		expect(lintPartnerId("'fixed-partner'", '[`partner_${field}`]')).toEqual([]);
		expect(lintCode("qs[`partner_${field}`] = 'fixed-partner';")).toEqual([]);
		/* eslint-enable n8n-local-rules/no-interpolation-in-regular-string */
	});

	it('runs only the ID rule', () => {
		expect(lintCode("const apiKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';")).toEqual([]);
	});

	it('ignores unrelated fields and files outside node source', () => {
		expect(lintPartnerId("'fixed-partner'", 'operationId')).toEqual([]);
		expect(lintPartnerId("'fixed-partner'", 'partner_id', 'SmsApi.test.js')).toEqual([]);
	});
});
