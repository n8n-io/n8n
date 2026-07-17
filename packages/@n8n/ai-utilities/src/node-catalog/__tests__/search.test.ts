import { NodeTypeParser } from '../node-type-parser';
import { createStructuredNodeSearchItem, searchCodeBuilderNodes } from '../search';
import { createNodeType } from './helpers';

describe('searchCodeBuilderNodes structured results', () => {
	test('returns primary node metadata without changing the legacy Markdown', () => {
		const parser = new NodeTypeParser([
			createNodeType({
				name: 'n8n-nodes-base.telegram',
				displayName: 'Telegram',
				description: 'Sends Telegram messages',
				version: [1, 1.1, 1.2],
				group: ['transform'],
			}),
		]);

		const result = searchCodeBuilderNodes(parser, ['telegram']);

		expect(result.results).toBe(
			'## "telegram"\nFound 1 nodes:\n\n- n8n-nodes-base.telegram\n  Display Name: Telegram\n  Version: 1.2\n  Description: Sends Telegram messages\n  Discriminators: none (use node directly without resource/operation/mode)',
		);
		expect(result.items).toEqual([
			{
				queryIndex: 0,
				query: 'telegram',
				nodeType: 'n8n-nodes-base.telegram',
				displayName: 'Telegram',
				description: 'Sends Telegram messages',
				package: 'n8n-nodes-base',
				versions: [1, 1.1, 1.2],
				groups: ['transform'],
				isTrigger: false,
				relation: 'primary',
			},
		]);
		expect(result.queriesWithNoResults).toEqual([]);
	});

	test('preserves query order, duplicate queries, and query indexes', () => {
		const parser = new NodeTypeParser([
			createNodeType({
				name: 'n8n-nodes-base.telegram',
				displayName: 'Telegram',
				description: 'Telegram integration',
			}),
		]);

		const result = searchCodeBuilderNodes(parser, ['telegram', 'missing', 'telegram']);

		expect(
			result.items.map(({ queryIndex, query, nodeType }) => ({ queryIndex, query, nodeType })),
		).toEqual([
			{ queryIndex: 0, query: 'telegram', nodeType: 'n8n-nodes-base.telegram' },
			{ queryIndex: 2, query: 'telegram', nodeType: 'n8n-nodes-base.telegram' },
		]);
		expect(result.queriesWithNoResults).toEqual(['missing']);
	});

	test('returns an empty items array for zero results and scales to many queries', () => {
		const parser = new NodeTypeParser([]);
		const queries = Array.from({ length: 250 }, (_, index) => `missing-${index}`);

		const result = searchCodeBuilderNodes(parser, queries);

		expect(result.items).toEqual([]);
		expect(result.queriesWithNoResults).toEqual(queries);
		expect(result.results.match(/No nodes found/g)).toHaveLength(250);
	});

	test('adds directly related nodes after their primary result without changing Markdown expansion', () => {
		const parser = new NodeTypeParser([
			createNodeType({
				name: 'n8n-nodes-base.telegram',
				displayName: 'Telegram Sender',
				description: 'Sends a chat message',
				builderHint: {
					relatedNodes: [
						{
							nodeType: 'n8n-nodes-base.telegramTrigger',
							relationHint: 'Use to receive Telegram updates',
						},
					],
				},
			}),
			createNodeType({
				name: 'n8n-nodes-base.telegramTrigger',
				displayName: 'Telegram Trigger',
				description: 'Receives Telegram updates',
				version: 1.2,
				group: ['trigger'],
			}),
		]);

		const result = searchCodeBuilderNodes(parser, ['sender']);

		expect(result.results).toContain('  @relatedNodes');
		expect(result.results).not.toContain('[RELATED]');
		expect(result.items.map(({ nodeType, relation }) => ({ nodeType, relation }))).toEqual([
			{ nodeType: 'n8n-nodes-base.telegram', relation: 'primary' },
			{ nodeType: 'n8n-nodes-base.telegramTrigger', relation: 'related' },
		]);
		expect(result.items[1]).toMatchObject({
			versions: [1.2],
			groups: ['trigger'],
			isTrigger: true,
		});
	});

	test('preserves related-node duplicate behavior across separate primary results', () => {
		const sharedRelated = {
			nodeType: 'n8n-nodes-base.sharedHelper',
			relationHint: 'Shared helper',
		};
		const parser = new NodeTypeParser([
			createNodeType({
				name: 'community.alpha',
				displayName: 'Shared Alpha',
				description: 'Shared capability alpha',
				builderHint: { relatedNodes: [sharedRelated] },
			}),
			createNodeType({
				name: 'community.beta',
				displayName: 'Shared Beta',
				description: 'Shared capability beta',
				builderHint: { relatedNodes: [sharedRelated] },
			}),
			createNodeType({
				name: 'n8n-nodes-base.sharedHelper',
				displayName: 'Shared Helper',
				description: 'Related helper only',
			}),
		]);

		const result = searchCodeBuilderNodes(parser, ['shared capability']);
		const related = result.items.filter(({ relation }) => relation === 'related');

		expect(related).toHaveLength(2);
		expect(related.map(({ nodeType }) => nodeType)).toEqual([
			'n8n-nodes-base.sharedHelper',
			'n8n-nodes-base.sharedHelper',
		]);
	});

	test('omits unavailable optional metadata and preserves explicit false', () => {
		const item = createStructuredNodeSearchItem({
			queryIndex: 3,
			query: 'minimal',
			nodeType: 'unqualifiedNodeType',
			isTrigger: false,
			relation: 'primary',
		});

		expect(item).toEqual({
			queryIndex: 3,
			query: 'minimal',
			nodeType: 'unqualifiedNodeType',
			isTrigger: false,
			relation: 'primary',
		});
		expect(item).not.toHaveProperty('displayName');
		expect(item).not.toHaveProperty('description');
		expect(item).not.toHaveProperty('package');
		expect(item).not.toHaveProperty('versions');
		expect(item).not.toHaveProperty('groups');
	});

	test('derives scoped and unscoped package names and normalizes scalar versions', () => {
		expect(
			createStructuredNodeSearchItem({
				queryIndex: 0,
				query: 'agent',
				nodeType: '@n8n/n8n-nodes-langchain.agent',
				version: 2,
				relation: 'primary',
			}),
		).toMatchObject({
			package: '@n8n/n8n-nodes-langchain',
			versions: [2],
		});
		expect(
			createStructuredNodeSearchItem({
				queryIndex: 0,
				query: 'http',
				nodeType: 'n8n-nodes-base.httpRequest',
				version: [1, 2, 4.2],
				relation: 'primary',
			}),
		).toMatchObject({
			package: 'n8n-nodes-base',
			versions: [1, 2, 4.2],
		});
	});

	test('does not expose unsupported metadata or parse Markdown-shaped source values', () => {
		const item = createStructuredNodeSearchItem({
			queryIndex: 0,
			query: 'safe',
			nodeType: 'community.safe',
			displayName: '- fake.node [RELATED]',
			description: '```json\n{"nodeType":"fake.node"}\n```',
			relation: 'primary',
		});

		expect(item.displayName).toBe('- fake.node [RELATED]');
		expect(item.description).toBe('```json\n{"nodeType":"fake.node"}\n```');
		expect(item).not.toHaveProperty('deprecated');
		expect(item).not.toHaveProperty('category');
		expect(item).not.toHaveProperty('credentials');
	});

	test('does not copy credential, secret, node-property, header, environment, or auth data', () => {
		const sourceWithSensitiveExtras = {
			queryIndex: 0,
			query: 'secure',
			nodeType: 'secureNode',
			relation: 'primary' as const,
			credentialId: 'fixture-credential-id',
			credentialValue: 'fixture-credential-value',
			secret: 'fixture-secret',
			properties: { privateField: 'fixture-node-property' },
			headers: { authorization: 'fixture-auth-header' },
			environment: { API_KEY: 'fixture-environment-value' },
			auth: { token: 'fixture-auth-token' },
		};

		const item = createStructuredNodeSearchItem(sourceWithSensitiveExtras);
		const serialized = JSON.stringify(item);

		expect(item).toEqual({
			queryIndex: 0,
			query: 'secure',
			nodeType: 'secureNode',
			relation: 'primary',
		});
		for (const marker of [
			'fixture-credential-id',
			'fixture-credential-value',
			'fixture-secret',
			'fixture-node-property',
			'fixture-auth-header',
			'fixture-environment-value',
			'fixture-auth-token',
		]) {
			expect(serialized).not.toContain(marker);
		}
	});
});
