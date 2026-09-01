import { describe, expect, it } from 'vitest';

import { buildSchemaPlaceholderItem } from './placeholder';
import type { NodeSchemaContext } from './types';

const NOW = new Date('2026-09-01T10:30:00.000Z');
const options = { now: NOW };

const ctx = (overrides: Partial<NodeSchemaContext>): NodeSchemaContext => ({
	nodeName: 'Node',
	nodeType: 'n8n-nodes-base.slack',
	typeVersion: 1,
	...overrides,
});

describe('buildSchemaPlaceholderItem', () => {
	it('returns an empty item when nothing describes the node output', () => {
		expect(buildSchemaPlaceholderItem(undefined, options)).toEqual({});
		expect(buildSchemaPlaceholderItem(ctx({}), options)).toEqual({});
	});

	it('shapes the item from the node schema, with a value per declared type', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'object',
					properties: {
						channel: { type: 'string' },
						ok: { type: 'boolean' },
						retries: { type: 'integer' },
						ratio: { type: 'number' },
						deletedAt: { type: 'null' },
					},
				},
			}),
			options,
		);

		expect(item).toEqual({
			channel: 'sample',
			ok: true,
			retries: 1,
			ratio: 1,
			deletedAt: null,
		});
	});

	it('expands nested objects and gives arrays one element', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'object',
					properties: {
						user: { type: 'object', properties: { name: { type: 'string' } } },
						tags: { type: 'array', items: { type: 'string' } },
						untypedList: { type: 'array' },
					},
				},
			}),
			options,
		);

		expect(item).toEqual({
			user: { name: 'sample' },
			tags: ['sample'],
			untypedList: [],
		});
	});

	it('prefers a const, enum, example or default over the synthesized value', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'object',
					properties: {
						kind: { const: 'message' },
						status: { type: 'string', enum: ['open', 'closed'] },
						region: { type: 'string', examples: ['eu-west-1'] },
						limit: { type: 'number', default: 25 },
					},
				},
			}),
			options,
		);

		expect(item).toEqual({
			kind: 'message',
			status: 'open',
			region: 'eu-west-1',
			limit: 25,
		});
	});

	it('anchors date-shaped strings to the injected clock', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'object',
					properties: {
						createdAt: { type: 'string', format: 'date-time' },
						day: { type: 'string', format: 'date' },
						email: { type: 'string', format: 'email' },
					},
				},
			}),
			options,
		);

		expect(item).toEqual({
			createdAt: '2026-09-01T10:30:00.000Z',
			day: '2026-09-01',
			email: 'jane@example.com',
		});
	});

	it('takes the item shape from the element schema when the output is an array', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'array',
					items: { type: 'object', properties: { id: { type: 'integer' } } },
				},
			}),
			options,
		);

		expect(item).toEqual({ id: 1 });
	});

	it('resolves union types and composite branches', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				schema: {
					type: 'object',
					properties: {
						note: { type: ['string', 'null'] },
						payload: { anyOf: [{ type: 'object', properties: { a: { type: 'string' } } }] },
					},
				},
			}),
			options,
		);

		expect(item).toEqual({ note: 'sample', payload: { a: 'sample' } });
	});

	it('names an untyped property from its key so downstream reads still resolve', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({ schema: { type: 'object', properties: { id: {}, createdAt: {}, label: {} } } }),
			options,
		);

		expect(item).toEqual({
			id: 1,
			createdAt: '2026-09-01T10:30:00.000Z',
			label: 'sample',
		});
	});

	it('stops expanding past the depth cap instead of recursing forever', () => {
		const deep = (levels: number): Record<string, unknown> =>
			levels === 0
				? { type: 'string' }
				: { type: 'object', properties: { next: deep(levels - 1) } };

		const item = buildSchemaPlaceholderItem(ctx({ schema: deep(8) }), options);

		expect(item).toEqual({ next: { next: { next: { next: {} } } } });
	});

	it('caps how many properties one object contributes', () => {
		const properties = Object.fromEntries(
			Array.from({ length: 60 }, (_, i) => [`field${String(i)}`, { type: 'string' }]),
		);

		const item = buildSchemaPlaceholderItem(
			ctx({ schema: { type: 'object', properties } }),
			options,
		);

		expect(Object.keys(item)).toHaveLength(40);
	});

	it('overlays declared parser fields under their envelope key', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				nodeType: '@n8n/n8n-nodes-langchain.agent',
				schema: {
					type: 'object',
					required: ['output'],
					properties: { output: { type: 'object' } },
				},
				declaredFields: {
					keys: ['sentiment', 'score'],
					envelopeKey: 'output',
					exact: false,
					source: 'declared-schema',
				},
			}),
			options,
		);

		expect(item).toEqual({ output: { sentiment: 'sample', score: 'sample' } });
	});

	it('uses declared field names at the top level when there is no envelope', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				declaredFields: {
					keys: ['invoice_total'],
					exact: false,
					source: 'declared-schema',
				},
			}),
			options,
		);

		expect(item).toEqual({ invoice_total: 'sample' });
	});

	it('emits exactly the Data Table columns, typed, for an exact contract', () => {
		const item = buildSchemaPlaceholderItem(
			ctx({
				nodeType: 'n8n-nodes-base.dataTable',
				schema: { type: 'object', properties: { irrelevant: { type: 'string' } } },
				dataTableColumns: [
					{ name: 'email', type: 'string' },
					{ name: 'visits', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'seenAt', type: 'date' },
				],
				declaredFields: {
					keys: ['id', 'createdAt', 'updatedAt', 'email', 'visits', 'active', 'seenAt'],
					exact: true,
					source: 'data-table-columns',
				},
			}),
			options,
		);

		expect(item).toEqual({
			id: 1,
			createdAt: '2026-09-01T10:30:00.000Z',
			updatedAt: '2026-09-01T10:30:00.000Z',
			email: 'sample',
			visits: 1,
			active: true,
			seenAt: '2026-09-01T10:30:00.000Z',
		});
	});

	it('falls back to the AI root envelope when no schema resolves', () => {
		expect(
			buildSchemaPlaceholderItem(ctx({ nodeType: '@n8n/n8n-nodes-langchain.agent' }), options),
		).toEqual({ output: 'sample' });
		expect(
			buildSchemaPlaceholderItem(ctx({ nodeType: '@n8n/n8n-nodes-langchain.chainLlm' }), options),
		).toEqual({ text: 'sample' });
	});

	it('leaves passthrough and vendor AI roots empty, having no static shape', () => {
		expect(
			buildSchemaPlaceholderItem(
				ctx({ nodeType: '@n8n/n8n-nodes-langchain.textClassifier' }),
				options,
			),
		).toEqual({});
		expect(
			buildSchemaPlaceholderItem(ctx({ nodeType: '@n8n/n8n-nodes-langchain.openAi' }), options),
		).toEqual({});
	});
});
