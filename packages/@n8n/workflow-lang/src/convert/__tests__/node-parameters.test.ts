import { describe, expect, it } from 'vitest';

import { convertWorkflow } from '../index.ts';
import type { NodeDescription } from '../node-parameters.ts';
import { getNodeParameters, hideParameters } from '../node-parameters.ts';

const description: NodeDescription = {
	name: 'test',
	properties: [
		{ name: 'operation', type: 'options', default: 'get' },
		{
			name: 'limit',
			type: 'number',
			default: 50,
			displayOptions: { show: { operation: ['getAll'] } },
		},
		{
			name: 'options',
			type: 'collection',
			default: {},
			options: [
				{
					name: 'old',
					type: 'string',
					default: '',
					displayOptions: { hide: { '@version': [{ _cnd: { gte: 2 } }] } },
				},
				{ name: 'kept', type: 'string', default: '' },
			],
		},
	],
};

describe('getNodeParameters (n8n-workflow 2.42.2)', () => {
	it('drops hidden parameters and adds defaults', () => {
		expect(
			getNodeParameters(
				description.properties,
				{ limit: 5, options: { old: 'x', kept: 'y' } },
				true,
				false,
				2,
				description,
			),
		).toEqual({ operation: 'get', options: { kept: 'y' } });
	});

	it('keeps a parameter that the version shows', () => {
		expect(
			getNodeParameters(
				description.properties,
				{ options: { old: 'x' } },
				true,
				false,
				1,
				description,
			),
		).toEqual({ operation: 'get', options: { old: 'x' } });
	});
});

describe('hideParameters', () => {
	it('leaves unknown node types as they are', () => {
		expect(hideParameters('n8n-nodes-base.unknownThing', 1, { a: 1 })).toEqual({ a: 1 });
	});

	it('drops the options that Google Calendar 1.3 hides, and adds no defaults', () => {
		const parameters = {
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
			returnAll: true,
			options: { timeMin: '2020-01-01T00:00:00Z', singleEvents: true, query: 'x' },
		};
		expect(hideParameters('n8n-nodes-base.googleCalendar', 1.3, parameters)).toEqual({
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
			returnAll: true,
			options: { query: 'x' },
		});
		expect(hideParameters('n8n-nodes-base.googleCalendar', 1.2, parameters).options).toEqual(
			parameters.options,
		);
	});

	it('the converter gives a library node its parameters without the hidden ones', () => {
		const r = convertWorkflow({
			name: 'Calendar',
			nodes: [
				{
					name: 'Hook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: { path: 'cal' },
				},
				{
					name: 'Events',
					type: 'n8n-nodes-base.googleCalendar',
					typeVersion: 1.3,
					position: [200, 0],
					parameters: {
						operation: 'getAll',
						calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
						options: { timeMin: '2020-01-01T00:00:00Z' },
					},
					credentials: { googleCalendarOAuth2Api: { id: '1', name: 'cal' } },
				},
			],
			connections: { Hook: { main: [[{ node: 'Events', type: 'main', index: 0 }]] } },
		});
		expect(r.ok).toBe(true);
		expect(r.source).not.toContain('2020-01-01T00:00:00Z');
	});
});

describe('the port gives what n8n-workflow gives', () => {
	it('for the parameters of every equivalence case', async () => {
		const { NodeHelpers } = await import('n8n-workflow');
		const { EQUIVALENCE_CASES } = await import('../../nodes/__tests__/equivalence-cases.ts');
		const { nodeDescription } = await import('../node-parameters.ts');
		let compared = 0;
		for (const c of EQUIVALENCE_CASES) {
			const d = nodeDescription(c.type, c.typeVersion);
			if (!d) continue;
			const ours = getNodeParameters(d.properties, c.parameters, true, false, c.typeVersion, d);
			const theirs = NodeHelpers.getNodeParameters(
				// The slim description has the members that getNodeParameters reads.
				d.properties as never,
				c.parameters as never,
				true,
				false,
				{ typeVersion: c.typeVersion },
				d as never,
			);
			expect(ours, c.name).toEqual(theirs);
			compared++;
		}
		expect(compared).toBeGreaterThan(100);
	});
});
