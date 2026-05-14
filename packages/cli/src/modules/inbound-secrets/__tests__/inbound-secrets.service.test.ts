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

		type StripCase = {
			name: string;
			rules?: Record<string, string[]>;
			triggerType?: string;
			descriptionPaths?: string[];
			input: IDataObject[];
			expectedJson: IDataObject[];
			expectedArtifacts: Array<Record<string, unknown>>;
		};

		const cases: StripCase[] = [
			{
				name: 'no matching path: items untouched, empty artifacts',
				rules: { '*': ['headers.authorization'] },
				input: [{ body: { foo: 'bar' } }],
				expectedJson: [{ body: { foo: 'bar' } }],
				expectedArtifacts: [{}],
			},
			{
				name: 'universal * strips and captures, siblings untouched',
				rules: { '*': ['headers.authorization'] },
				input: [{ headers: { authorization: 'secret', other: 'keep-me' } }],
				expectedJson: [{ headers: { authorization: undefined, other: 'keep-me' } }],
				expectedArtifacts: [{ 'headers.authorization': 'secret' }],
			},
			{
				name: 'type-specific rule applies when trigger type matches',
				rules: { 'n8n-nodes-base.formTrigger': ['body.password'] },
				triggerType: 'n8n-nodes-base.formTrigger',
				input: [{ body: { password: 'p' } }],
				expectedJson: [{ body: { password: undefined } }],
				expectedArtifacts: [{ 'body.password': 'p' }],
			},
			{
				name: 'unions universal and type-specific rules when both apply',
				rules: {
					'*': ['headers.authorization'],
					'n8n-nodes-base.formTrigger': ['body.password'],
				},
				triggerType: 'n8n-nodes-base.formTrigger',
				input: [{ headers: { authorization: 'a' }, body: { password: 'p' } }],
				expectedJson: [{ headers: { authorization: undefined }, body: { password: undefined } }],
				expectedArtifacts: [{ 'headers.authorization': 'a', 'body.password': 'p' }],
			},
			{
				name: 'only universal rule when type-specific does not match',
				rules: {
					'*': ['headers.authorization'],
					'n8n-nodes-base.formTrigger': ['body.password'],
				},
				input: [{ headers: { authorization: 'a' }, body: { password: 'p' } }],
				expectedJson: [{ headers: { authorization: undefined }, body: { password: 'p' } }],
				expectedArtifacts: [{ 'headers.authorization': 'a' }],
			},
			{
				name: 'applied independently to every item in the batch',
				rules: { '*': ['headers.authorization'] },
				input: [{ headers: { authorization: '1' } }, { headers: { authorization: '2' } }],
				expectedJson: [
					{ headers: { authorization: undefined } },
					{ headers: { authorization: undefined } },
				],
				expectedArtifacts: [{ 'headers.authorization': '1' }, { 'headers.authorization': '2' }],
			},
			{
				name: 'descriptionPaths apply additively without admin rules',
				descriptionPaths: ['body.token'],
				input: [{ body: { token: 't' } }],
				expectedJson: [{ body: { token: undefined } }],
				expectedArtifacts: [{ 'body.token': 't' }],
			},
			{
				name: 'admin and descriptionPaths union',
				rules: {
					'*': ['headers.authorization'],
					'n8n-nodes-base.webhook': ['headers.x-internal'],
				},
				descriptionPaths: ['headers.cookie'],
				input: [{ headers: { authorization: 'a', 'x-internal': 'i', cookie: 'c' } }],
				expectedJson: [
					{ headers: { authorization: undefined, 'x-internal': undefined, cookie: undefined } },
				],
				expectedArtifacts: [
					{
						'headers.authorization': 'a',
						'headers.x-internal': 'i',
						'headers.cookie': 'c',
					},
				],
			},
			{
				name: 'duplicate paths across admin and description extracted once',
				rules: { '*': ['headers.authorization'] },
				descriptionPaths: ['headers.authorization'],
				input: [{ headers: { authorization: 'a' } }],
				expectedJson: [{ headers: { authorization: undefined } }],
				expectedArtifacts: [{ 'headers.authorization': 'a' }],
			},
			{
				name: 'Date leaves coerced to ISO string',
				rules: { '*': ['body.when'] },
				input: [{ body: { when: new Date('2026-01-15T00:00:00.000Z') } }],
				expectedJson: [{ body: { when: undefined } }],
				expectedArtifacts: [{ 'body.when': '2026-01-15T00:00:00.000Z' }],
			},
			{
				name: 'function leaves dropped (JSON.stringify → undefined)',
				rules: { '*': ['body.fn'] },
				input: [{ body: { fn: () => 1 } as unknown as IDataObject }],
				expectedJson: [{ body: { fn: undefined } }],
				expectedArtifacts: [{}],
			},
			{
				name: 'nested object leaves preserved',
				rules: { '*': ['body.nested'] },
				input: [{ body: { nested: { id: 'x', tags: ['a', 'b'] } } }],
				expectedJson: [{ body: { nested: undefined } }],
				expectedArtifacts: [{ 'body.nested': { id: 'x', tags: ['a', 'b'] } }],
			},
		];

		it.each(cases)(
			'$name',
			({
				rules = {},
				triggerType = 'n8n-nodes-base.webhook',
				descriptionPaths = [],
				input,
				expectedJson,
				expectedArtifacts,
			}) => {
				initWith(rules);
				const items = input.map(item);

				const result = service.strip(items, triggerType, descriptionPaths);

				items.forEach((it, i) => expect(it.json).toEqual(expectedJson[i]));
				expect(result.artifactsByItem).toEqual(expectedArtifacts);
			},
		);

		it('returns the same triggerItems array reference', () => {
			initWith({ '*': ['headers.authorization'] });
			const items = [item({ headers: { authorization: 'x' } })];
			const json = items[0].json;

			const result = service.strip(items, 'n8n-nodes-base.webhook');

			expect(result.triggerItems).toBe(items);
			expect(result.triggerItems[0].json).toBe(json);
		});
	});
});
