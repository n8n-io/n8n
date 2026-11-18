import { mockLogger } from '@n8n/backend-test-utils';
import type { SettingsRepository } from '@n8n/db';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { RuntimeCredentialsConfig } from '../runtime-credentials.config';
import type { SensitiveFieldRules } from '../runtime-credentials.schemas';
import { RuntimeCredentialsService } from '../runtime-credentials.service';

const item = (json: IDataObject): INodeExecutionData => ({ json });

describe('RuntimeCredentialsService', () => {
	let service: RuntimeCredentialsService;
	let config: MockProxy<RuntimeCredentialsConfig>;
	let settingsRepository: MockProxy<SettingsRepository>;

	beforeEach(() => {
		config = mock<RuntimeCredentialsConfig>();
		settingsRepository = mock<SettingsRepository>();
		service = new RuntimeCredentialsService(mockLogger(), config, settingsRepository);
	});

	describe('init', () => {
		it.each([
			['default empty object', '{}'],
			['single universal rule', '{"api_key":{"nodeType":"*","path":"headers.authorization"}}'],
			[
				'type-specific rule',
				'{"form_pw":{"nodeType":"n8n-nodes-base.formTrigger","path":"body.password"}}',
			],
			[
				'multiple aliases combined',
				'{"api_key":{"nodeType":"*","path":"headers.authorization"},"form_pw":{"nodeType":"n8n-nodes-base.formTrigger","path":"body.password"}}',
			],
		])('accepts %s', (_name, raw) => {
			config.sensitiveFieldRules = raw;
			expect(() => service.init()).not.toThrow();
		});

		it.each([
			['malformed JSON', 'not json at all'],
			['valid JSON but not an object', '"a string"'],
			['legacy array shape', '{"*":["headers.authorization"]}'],
			['missing path', '{"api_key":{"nodeType":"*"}}'],
			['missing nodeType', '{"api_key":{"path":"headers.authorization"}}'],
			['empty alias key', '{"":{"nodeType":"*","path":"headers.authorization"}}'],
			['empty path string', '{"api_key":{"nodeType":"*","path":""}}'],
			['empty nodeType string', '{"api_key":{"nodeType":"","path":"headers.authorization"}}'],
		])('throws on %s', (_name, raw) => {
			config.sensitiveFieldRules = raw;
			expect(() => service.init()).toThrow(/N8N_SECURITY_SENSITIVE_FIELD_RULES/);
		});
	});

	describe('strip', () => {
		const initWith = (rules: SensitiveFieldRules) => {
			config.sensitiveFieldRules = JSON.stringify(rules);
			service.init();
		};

		type StripCase = {
			name: string;
			rules: SensitiveFieldRules;
			triggerType?: string;
			input: IDataObject[];
			expectedJson: IDataObject[];
			expectedArtifacts: Record<string, unknown>;
		};

		const cases: StripCase[] = [
			{
				name: 'no matching path: items untouched, alias omitted',
				rules: { api_key: { nodeType: '*', path: 'headers.authorization' } },
				input: [{ body: { foo: 'bar' } }],
				expectedJson: [{ body: { foo: 'bar' } }],
				expectedArtifacts: {},
			},
			{
				name: 'wildcard nodeType strips and captures, siblings untouched',
				rules: { api_key: { nodeType: '*', path: 'headers.authorization' } },
				input: [{ headers: { authorization: 'secret', other: 'keep-me' } }],
				expectedJson: [{ headers: { authorization: undefined, other: 'keep-me' } }],
				expectedArtifacts: { api_key: ['secret'] },
			},
			{
				name: 'type-specific rule applies when trigger type matches',
				rules: { form_pw: { nodeType: 'n8n-nodes-base.formTrigger', path: 'body.password' } },
				triggerType: 'n8n-nodes-base.formTrigger',
				input: [{ body: { password: 'p' } }],
				expectedJson: [{ body: { password: undefined } }],
				expectedArtifacts: { form_pw: ['p'] },
			},
			{
				name: 'type-specific rule omitted when trigger type does not match',
				rules: { form_pw: { nodeType: 'n8n-nodes-base.formTrigger', path: 'body.password' } },
				triggerType: 'n8n-nodes-base.webhook',
				input: [{ body: { password: 'p' } }],
				expectedJson: [{ body: { password: 'p' } }],
				expectedArtifacts: {},
			},
			{
				name: 'multiple aliases populate independently when both match',
				rules: {
					api_key: { nodeType: '*', path: 'headers.authorization' },
					form_pw: { nodeType: 'n8n-nodes-base.formTrigger', path: 'body.password' },
				},
				triggerType: 'n8n-nodes-base.formTrigger',
				input: [{ headers: { authorization: 'a' }, body: { password: 'p' } }],
				expectedJson: [{ headers: { authorization: undefined }, body: { password: undefined } }],
				expectedArtifacts: { api_key: ['a'], form_pw: ['p'] },
			},
			{
				name: 'multi-item batch flattens into a single array per alias',
				rules: { api_key: { nodeType: '*', path: 'headers.authorization' } },
				input: [{ headers: { authorization: '1' } }, { headers: { authorization: '2' } }],
				expectedJson: [
					{ headers: { authorization: undefined } },
					{ headers: { authorization: undefined } },
				],
				expectedArtifacts: { api_key: ['1', '2'] },
			},
			{
				name: 'empty input array produces no aliases and does not throw',
				rules: { api_key: { nodeType: '*', path: 'headers.authorization' } },
				input: [],
				expectedJson: [],
				expectedArtifacts: {},
			},
			{
				name: 'Date leaves coerced to ISO string',
				rules: { stamp: { nodeType: '*', path: 'body.when' } },
				input: [{ body: { when: new Date('2026-01-15T00:00:00.000Z') } }],
				expectedJson: [{ body: { when: undefined } }],
				expectedArtifacts: { stamp: ['2026-01-15T00:00:00.000Z'] },
			},
			{
				name: 'function leaves dropped (JSON.stringify yields undefined)',
				rules: { fn: { nodeType: '*', path: 'body.fn' } },
				input: [{ body: { fn: () => 1 } as unknown as IDataObject }],
				expectedJson: [{ body: { fn: undefined } }],
				expectedArtifacts: {},
			},
			{
				name: 'nested object leaves preserved inside the alias array',
				rules: { nested: { nodeType: '*', path: 'body.nested' } },
				input: [{ body: { nested: { id: 'x', tags: ['a', 'b'] } } }],
				expectedJson: [{ body: { nested: undefined } }],
				expectedArtifacts: { nested: [{ id: 'x', tags: ['a', 'b'] }] },
			},
		];

		it.each(cases)(
			'$name',
			({
				rules,
				triggerType = 'n8n-nodes-base.webhook',
				input,
				expectedJson,
				expectedArtifacts,
			}) => {
				initWith(rules);
				const items = input.map(item);

				const result = service.strip(items, triggerType);

				items.forEach((it, i) => expect(it.json).toEqual(expectedJson[i]));
				expect(result.artifactsByAlias).toEqual(expectedArtifacts);
			},
		);

		it('returns the same triggerItems array reference', () => {
			initWith({ api_key: { nodeType: '*', path: 'headers.authorization' } });
			const items = [item({ headers: { authorization: 'x' } })];
			const json = items[0].json;

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(result.triggerItems).toBe(items);
			expect(result.triggerItems[0].json).toBe(json);
		});
	});

	describe('stored rules', () => {
		const ENV_RULES = '{"env_key":{"nodeType":"*","path":"headers.authorization"}}';
		const storedRule = {
			alias: 'tenant_key',
			nodeType: 'n8n-nodes-base.webhook',
			path: 'headers.x-tenant-key',
			description: 'Tenant API key',
		};

		beforeEach(() => {
			config.sensitiveFieldRules = ENV_RULES;
			service.init();
		});

		it('lists env rules and stored rules with their source', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock({ value: JSON.stringify([storedRule]) }));

			await service.loadStoredRules();

			expect(service.getRules()).toEqual([
				{ alias: 'env_key', nodeType: '*', path: 'headers.authorization', source: 'env' },
				{ ...storedRule, source: 'settings' },
			]);
			expect(service.getAliases().sort()).toEqual(['env_key', 'tenant_key']);
		});

		it('strips fields for stored rules', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock({ value: JSON.stringify([storedRule]) }));
			await service.loadStoredRules();

			const { artifactsByAlias } = service.strip(
				[item({ headers: { 'x-tenant-key': 'sk_1' } })],
				'n8n-nodes-base.webhook',
			);

			expect(artifactsByAlias).toEqual({ tenant_key: ['sk_1'] });
		});

		it('ignores an invalid stored value and keeps the env rules', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock({ value: '{"not":"a list"}' }));

			await service.loadStoredRules();

			expect(service.getAliases()).toEqual(['env_key']);
		});

		it('saves the rules and applies them at once', async () => {
			await service.saveRules([storedRule]);

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				'runtimeCredentials.rules',
				JSON.stringify([storedRule]),
				true,
				{},
			);
			expect(service.getAliases()).toContain('tenant_key');
		});

		it('saves an alias that matches an Object.prototype key', async () => {
			await service.saveRules([{ ...storedRule, alias: 'constructor' }]);

			expect(settingsRepository.upsertByKey).toHaveBeenCalled();
		});

		it.each([
			[
				'an alias that the env var already uses',
				[{ ...storedRule, alias: 'env_key' }],
				/already set/,
			],
			['a duplicate alias', [storedRule, storedRule], /more than one rule/],
			['the __proto__ alias', [{ ...storedRule, alias: '__proto__' }], /not supported/],
		])('refuses %s', async (_name, rules, message) => {
			await expect(service.saveRules(rules)).rejects.toThrow(message);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});
});
