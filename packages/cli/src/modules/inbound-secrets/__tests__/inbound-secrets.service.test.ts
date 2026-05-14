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

			expect(result.triggerItems).toBe(items);
			expect(items[0].json).toEqual({ headers: { authorization: 'x' } });
			expect(result.artifactsByItem).toEqual([{}]);
		});

		it('applies universal `*` rule across any trigger type and leaves siblings untouched', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ headers: { authorization: 'secret', other: 'keep-me' } })];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined, other: 'keep-me' },
			});
			expect(result.artifactsByItem).toEqual([{ 'headers.authorization': 'secret' }]);
		});

		it('applies type-specific rules only when the trigger type matches', () => {
			initWith({ 'n8n-nodes-base.formTrigger': ['body.password'] });
			const items = [item({ body: { password: 'p' } })];

			const result = service.strip(items, 'n8n-nodes-base.formTrigger');

			expect(items[0].json).toEqual({ body: { password: undefined } });
			expect(result.artifactsByItem).toEqual([{ 'body.password': 'p' }]);
		});

		it('does not apply type-specific rules to other trigger types', () => {
			initWith({ 'n8n-nodes-base.formTrigger': ['body.password'] });
			const items = [item({ body: { password: 'p' } })];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({ body: { password: 'p' } });
			expect(result.artifactsByItem).toEqual([{}]);
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

			const result = service.strip(items, 'n8n-nodes-base.formTrigger');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined },
				body: { password: undefined },
			});
			expect(result.artifactsByItem).toEqual([
				{ 'headers.authorization': 'a', 'body.password': 'p' },
			]);
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

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined },
				body: { password: 'p' },
			});
			expect(result.artifactsByItem).toEqual([{ 'headers.authorization': 'a' }]);
		});

		it('applies rules independently to every item in the batch', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [
				item({ headers: { authorization: '1' } }),
				item({ headers: { authorization: '2' } }),
				item({ headers: { authorization: '3' } }),
			];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			for (const i of items) {
				expect(i.json).toEqual({ headers: { authorization: undefined } });
			}
			expect(result.artifactsByItem).toEqual([
				{ 'headers.authorization': '1' },
				{ 'headers.authorization': '2' },
				{ 'headers.authorization': '3' },
			]);
		});

		it('applies multiple paths from the same rule', () => {
			initWith({ '*': ['headers.authorization', 'headers.cookie'] });
			const items = [item({ headers: { authorization: 'a', cookie: 'c', other: 'k' } })];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({
				headers: { authorization: undefined, cookie: undefined, other: 'k' },
			});
			expect(result.artifactsByItem).toEqual([
				{ 'headers.authorization': 'a', 'headers.cookie': 'c' },
			]);
		});

		it('returns the same array reference and mutates items in place', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ headers: { authorization: 'x' } })];
			const json = items[0].json;

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(result.triggerItems).toBe(items);
			expect(result.triggerItems[0].json).toBe(json);
		});

		it('silently leaves items untouched when no path in the rule set matches', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ body: { foo: 'bar' } })];

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(items[0].json).toEqual({ body: { foo: 'bar' } });
			expect(result.artifactsByItem).toEqual([{}]);
		});

		describe('descriptionPaths', () => {
			it('contributes paths additively when no admin rules are configured', () => {
				initWith({});
				const items = [item({ body: { token: 't' } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook', ['body.token']);

				expect(items[0].json).toEqual({ body: { token: undefined } });
				expect(result.artifactsByItem).toEqual([{ 'body.token': 't' }]);
			});

			it('unions with admin rules so admins can add paths node authors did not declare', () => {
				initWith({
					'*': ['headers.authorization'],
					'n8n-nodes-base.webhook': ['headers.x-internal'],
				});
				const items = [
					item({
						headers: { authorization: 'a', 'x-internal': 'i', cookie: 'c' },
					}),
				];

				const result = service.strip(items, 'n8n-nodes-base.webhook', ['headers.cookie']);

				expect(items[0].json).toEqual({
					headers: { authorization: undefined, 'x-internal': undefined, cookie: undefined },
				});
				expect(result.artifactsByItem).toEqual([
					{
						'headers.authorization': 'a',
						'headers.x-internal': 'i',
						'headers.cookie': 'c',
					},
				]);
			});

			it('de-duplicates paths declared by both admin and description', () => {
				initWith({ '*': ['headers.authorization'] });
				const items = [item({ headers: { authorization: 'a' } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook', ['headers.authorization']);

				// Single entry, single value — second extraction would otherwise overwrite with undefined.
				expect(result.artifactsByItem).toEqual([{ 'headers.authorization': 'a' }]);
				expect(items[0].json).toEqual({ headers: { authorization: undefined } });
			});

			it('omits paths that find no match from the per-item map', () => {
				initWith({});
				const items = [item({ body: { token: 't' } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook', [
					'body.token',
					'body.missing',
				]);

				expect(result.artifactsByItem).toEqual([{ 'body.token': 't' }]);
			});
		});

		describe('value sanitisation', () => {
			it('coerces Date leaves to their ISO string form', () => {
				initWith({ '*': ['body.when'] });
				const when = new Date('2026-01-15T00:00:00.000Z');
				const items = [item({ body: { when } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook');

				expect(result.artifactsByItem).toEqual([{ 'body.when': '2026-01-15T00:00:00.000Z' }]);
			});

			it('drops values whose JSON serialisation is undefined (e.g. raw function)', () => {
				initWith({ '*': ['body.fn'] });
				const items = [item({ body: { fn: () => 1 } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook');

				expect(result.artifactsByItem).toEqual([{}]);
			});

			it('preserves nested object leaves', () => {
				initWith({ '*': ['body.nested'] });
				const items = [item({ body: { nested: { id: 'x', tags: ['a', 'b'] } } })];

				const result = service.strip(items, 'n8n-nodes-base.webhook');

				expect(result.artifactsByItem).toEqual([{ 'body.nested': { id: 'x', tags: ['a', 'b'] } }]);
			});
		});
	});
});
