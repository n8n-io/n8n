import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import type { InboundSecretsConfig } from '../inbound-secrets.config';
import { InboundSecretsService } from '../inbound-secrets.service';

const item = (json: IDataObject): INodeExecutionData => ({ json });

describe('InboundSecretsService', () => {
	let service: InboundSecretsService;
	let config: MockProxy<InboundSecretsConfig>;

	beforeEach(() => {
		config = mock<InboundSecretsConfig>();
		service = new InboundSecretsService(mockLogger(), config);
	});

	describe('init', () => {
		it.each([
			['default empty object', '{}'],
			['valid universal rule', '{"*":["headers.authorization"]}'],
			['valid type-specific rule', '{"n8n-nodes-base.webhook":["body.token"]}'],
			[
				'valid combined rules',
				'{"*":["headers.authorization"],"n8n-nodes-base.formTrigger":["body.password"]}',
			],
		])('accepts %s', (_name, raw) => {
			config.sensitiveFieldRules = raw;
			expect(() => service.init()).not.toThrow();
		});

		it.each([
			['malformed JSON', 'not json at all'],
			['valid JSON but not an object', '"a string"'],
			['valid JSON but value is not an array', '{"*":"not-an-array"}'],
			['valid JSON but path entry is not a string', '{"*":[123]}'],
			['empty key', '{"":["x"]}'],
			['empty path string', '{"*":[""]}'],
		])('throws on %s', (_name, raw) => {
			config.sensitiveFieldRules = raw;
			expect(() => service.init()).toThrow(/N8N_SECURITY_SENSITIVE_FIELD_RULES/);
		});
	});

	describe('strip', () => {
		const initWith = (rules: Record<string, string[]>) => {
			config.sensitiveFieldRules = JSON.stringify(rules);
			service.init();
		};

		it('is a no-op when no rules are configured', () => {
			initWith({});
			const items = [item({ headers: { authorization: 'x' } })];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(result).toBe(items);
			expect(items[0].json).toEqual({ headers: { authorization: 'x' } });
		});

		it('applies universal `*` rule across any trigger type and leaves siblings untouched', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ headers: { authorization: 'secret', other: 'keep-me' } })];

			service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined, other: 'keep-me' },
			});
		});

		it('applies type-specific rules only when the trigger type matches', () => {
			initWith({ 'n8n-nodes-base.formTrigger': ['body.password'] });
			const items = [item({ body: { password: 'p' } })];

			service.strip(items, 'n8n-nodes-base.formTrigger');

			expect(items[0].json).toEqual({ body: { password: undefined } });
		});

		it('does not apply type-specific rules to other trigger types', () => {
			initWith({ 'n8n-nodes-base.formTrigger': ['body.password'] });
			const items = [item({ body: { password: 'p' } })];

			service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({ body: { password: 'p' } });
		});

		it('unions universal and type-specific rules when both match', () => {
			initWith({
				'*': ['headers.authorization'],
				'n8n-nodes-base.formTrigger': ['body.password'],
			});
			const items = [
				item({
					headers: { authorization: 'a' },
					body: { password: 'p' },
				}),
			];

			service.strip(items, 'n8n-nodes-base.formTrigger');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined },
				body: { password: undefined },
			});
		});

		it('only applies the universal rule when the type-specific rule does not match', () => {
			initWith({
				'*': ['headers.authorization'],
				'n8n-nodes-base.formTrigger': ['body.password'],
			});
			const items = [
				item({
					headers: { authorization: 'a' },
					body: { password: 'p' },
				}),
			];

			service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined },
				body: { password: 'p' },
			});
		});

		it('applies rules independently to every item in the batch', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [
				item({ headers: { authorization: '1' } }),
				item({ headers: { authorization: '2' } }),
				item({ headers: { authorization: '3' } }),
			];

			service.strip(items, 'n8n-nodes-base.webhook');

			for (const i of items) {
				expect(i.json).toEqual({ headers: { authorization: undefined } });
			}
		});

		it('applies multiple paths from the same rule', () => {
			initWith({ '*': ['headers.authorization', 'headers.cookie'] });
			const items = [item({ headers: { authorization: 'a', cookie: 'c', other: 'k' } })];

			service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined, cookie: undefined, other: 'k' },
			});
		});

		it('returns the same array reference and mutates items in place', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ headers: { authorization: 'x' } })];
			const json = items[0].json;

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(result).toBe(items);
			expect(result[0].json).toBe(json);
		});

		it('silently leaves items untouched when no path in the rule set matches', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ body: { foo: 'bar' } })];

			service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({ body: { foo: 'bar' } });
		});
	});
});
