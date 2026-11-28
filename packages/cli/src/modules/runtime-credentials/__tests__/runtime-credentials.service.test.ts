import { mockLogger } from '@n8n/backend-test-utils';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { RuntimeCredentialRuleRepository } from '@n8n/db';

import type { RuntimeCredentialsConfig } from '../runtime-credentials.config';
import type { SensitiveFieldRules } from '../runtime-credentials.schemas';
import { RuntimeCredentialsService, runtimeStubId } from '../runtime-credentials.service';

const item = (json: IDataObject): INodeExecutionData => ({ json });

describe('RuntimeCredentialsService', () => {
	let service: RuntimeCredentialsService;
	let config: MockProxy<RuntimeCredentialsConfig>;
	let ruleRepository: MockProxy<RuntimeCredentialRuleRepository>;

	beforeEach(() => {
		config = mock<RuntimeCredentialsConfig>();
		ruleRepository = mock<RuntimeCredentialRuleRepository>();
		service = new RuntimeCredentialsService(mockLogger(), config, ruleRepository);
	});

	describe('database rules', () => {
		const row = {
			alias: 'db_token',
			nodeType: 'n8n-nodes-base.webhook',
			path: 'headers.authorization',
			credentialType: 'httpHeaderAuth',
			transform: null,
			allowedDomains: null,
		};

		beforeEach(() => {
			config.sensitiveFieldRules = JSON.stringify({
				env_token: { nodeType: '*', path: 'headers.x-env', credentialType: 'httpHeaderAuth' },
			});
			service.init();
		});

		it('serves environment and database rules together', async () => {
			ruleRepository.findAll.mockResolvedValue([row]);
			await service.loadDatabaseRules();

			expect(
				service
					.getCredentialRules()
					.map(([alias]) => alias)
					.sort(),
			).toEqual(['db_token', 'env_token']);
			expect(service.isEnvironmentRule('env_token')).toBe(true);
			expect(service.isDatabaseRule('db_token')).toBe(true);
			expect(service.getRuleForStub(runtimeStubId('db_token'))?.alias).toBe('db_token');
			expect(
				service.stubRuleAppliesToTrigger(runtimeStubId('db_token'), 'n8n-nodes-base.webhook'),
			).toBe(true);
		});

		it('strips values for a database rule', async () => {
			ruleRepository.findAll.mockResolvedValue([row]);
			await service.loadDatabaseRules();

			const { artifactsByAlias, triggerItems } = service.strip(
				[item({ headers: { authorization: 'Bearer abc' } })],
				'n8n-nodes-base.webhook',
			);

			expect(artifactsByAlias.db_token).toEqual(['Bearer abc']);
			expect(JSON.stringify(triggerItems)).not.toContain('abc');
		});

		it('lets the environment win when the alias clashes', async () => {
			ruleRepository.findAll.mockResolvedValue([{ ...row, alias: 'env_token', path: 'other' }]);
			await service.loadDatabaseRules();

			expect(service.getRuleForStub(runtimeStubId('env_token'))?.rule.path).toBe('headers.x-env');
			expect(service.isDatabaseRule('env_token')).toBe(false);
		});

		it('drops a removed database rule on reload', async () => {
			ruleRepository.findAll.mockResolvedValue([row]);
			await service.loadDatabaseRules();
			ruleRepository.findAll.mockResolvedValue([]);
			await service.reloadDatabaseRules();

			expect(service.getRuleForStub(runtimeStubId('db_token'))).toBeUndefined();
		});

		it('loads the allowed domains of a database rule', async () => {
			ruleRepository.findAll.mockResolvedValue([
				row,
				{ ...row, alias: 'limited', allowedDomains: 'api.example.com, *.example.org' },
			]);
			await service.loadDatabaseRules();

			expect(
				service.getRuleForStub(runtimeStubId('db_token'))?.rule.allowedDomains,
			).toBeUndefined();
			expect(service.getRuleForStub(runtimeStubId('limited'))?.rule.allowedDomains).toBe(
				'api.example.com, *.example.org',
			);
		});

		it('skips a row with an invalid allowed domains list', async () => {
			ruleRepository.findAll.mockResolvedValue([
				{ ...row, alias: 'bad', allowedDomains: 'https://example.com' },
				row,
			]);
			await service.loadDatabaseRules();

			expect(service.getCredentialRules().map(([alias]) => alias)).not.toContain('bad');
			expect(service.isDatabaseRule('db_token')).toBe(true);
		});

		it('skips an invalid row and keeps the others', async () => {
			ruleRepository.findAll.mockResolvedValue([{ ...row, alias: 'bad', transform: 'nope' }, row]);
			await service.loadDatabaseRules();

			expect(service.getCredentialRules().map(([alias]) => alias)).not.toContain('bad');
			expect(service.isDatabaseRule('db_token')).toBe(true);
		});

		it('keeps the old rules when a reload fails', async () => {
			ruleRepository.findAll.mockResolvedValueOnce([row]);
			await service.loadDatabaseRules();
			ruleRepository.findAll.mockRejectedValue(new Error('db down'));

			await expect(service.reloadDatabaseRules()).resolves.toBeUndefined();
			expect(service.isDatabaseRule('db_token')).toBe(true);
		});
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

	describe('credential rules', () => {
		const rules = {
			gmail: {
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.authorization',
				credentialType: 'gmailOAuth2',
			},
			plain: { nodeType: '*', path: 'body.password' },
		};

		beforeEach(() => {
			config.sensitiveFieldRules = JSON.stringify(rules);
			service.init();
		});

		it('replaces a matched value with a marker when the rule has a credentialType', () => {
			const items = [item({ headers: { authorization: 'Bearer abc' }, body: { password: 'pw' } })];
			const { triggerItems, artifactsByAlias } = service.strip(items, 'n8n-nodes-base.webhook');

			expect(triggerItems[0].json).toEqual({
				headers: { authorization: '[moved to credential: gmailOAuth2]' },
				body: { password: undefined },
			});
			expect(artifactsByAlias).toEqual({ gmail: ['Bearer abc'], plain: ['pw'] });
		});

		it('returns only the rules that name a credential type', () => {
			expect(service.getCredentialRules()).toEqual([['gmail', rules.gmail]]);
		});

		it('finds the rule that a stub credential belongs to', () => {
			expect(service.getRuleForStub(runtimeStubId('gmail'))).toEqual({
				alias: 'gmail',
				rule: rules.gmail,
			});
			expect(service.getRuleForStub(runtimeStubId('plain'))).toBeUndefined();
			expect(service.getRuleForStub('unknown-id')).toBeUndefined();
		});

		it('derives a stable stub id that fits the id column', () => {
			expect(runtimeStubId('gmail')).toBe(runtimeStubId('gmail'));
			expect(runtimeStubId('gmail')).not.toBe(runtimeStubId('other'));
			expect(runtimeStubId('gmail').length).toBeLessThanOrEqual(36);
		});

		it('reports whether the rule behind a stub applies to a trigger', () => {
			const id = runtimeStubId('gmail');
			expect(service.stubRuleAppliesToTrigger(id, 'n8n-nodes-base.webhook')).toBe(true);
			expect(service.stubRuleAppliesToTrigger(id, 'n8n-nodes-base.formTrigger')).toBe(false);
			expect(service.stubRuleAppliesToTrigger('unknown-id', 'n8n-nodes-base.webhook')).toBe(false);
		});

		it('rejects a transform without a credentialType', () => {
			config.sensitiveFieldRules = '{"a":{"nodeType":"*","path":"x","transform":"bearer"}}';
			expect(() => service.init()).toThrow(/N8N_SECURITY_SENSITIVE_FIELD_RULES/);
		});

		describe('allowed domains', () => {
			const withDomains = (allowedDomains: string) =>
				JSON.stringify({
					a: { nodeType: '*', path: 'x', credentialType: 't', allowedDomains },
				});

			it('accepts a list with a wildcard', () => {
				config.sensitiveFieldRules = withDomains('api.example.com, *.example.org');
				service.init();
				expect(service.getRuleForStub(runtimeStubId('a'))?.rule.allowedDomains).toBe(
					'api.example.com, *.example.org',
				);
			});

			it.each([
				['an empty string', ''],
				['an empty entry', 'a.com,,b.com'],
				['a trailing comma', 'a.com,'],
				['a space inside an entry', 'a b.com'],
				['a scheme', 'https://a.com'],
				['a path', 'a.com/path'],
				['a port', 'a.com:8080'],
				['user info', 'user@a.com'],
				['a backslash', 'a.com\\evil.com'],
				['a wildcard in the middle', 'a.*.com'],
			])('rejects %s', (_name, value) => {
				config.sensitiveFieldRules = withDomains(value);
				expect(() => service.init()).toThrow(/N8N_SECURITY_SENSITIVE_FIELD_RULES/);
			});

			it('rejects a list without a credentialType', () => {
				config.sensitiveFieldRules = '{"a":{"nodeType":"*","path":"x","allowedDomains":"a.com"}}';
				expect(() => service.init()).toThrow(/N8N_SECURITY_SENSITIVE_FIELD_RULES/);
			});
		});

		it('rejects an unknown transform', () => {
			config.sensitiveFieldRules =
				'{"a":{"nodeType":"*","path":"x","credentialType":"t","transform":"upper"}}';
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
});
