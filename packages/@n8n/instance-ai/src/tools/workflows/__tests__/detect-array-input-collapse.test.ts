import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectArrayInputCollapse } from '../detect-array-input-collapse';

function workflow(
	httpUrl: string,
	jsCode: string,
	upstreamType = 'n8n-nodes-base.httpRequest',
): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Fetch',
				type: upstreamType,
				typeVersion: 4,
				position: [200, 0],
				parameters: { url: httpUrl },
			},
			{
				id: '3',
				name: 'Pick',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [400, 0],
				parameters: { jsCode },
			},
		],
		connections: {
			Trigger: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] },
			Fetch: { main: [[{ node: 'Pick', type: 'main', index: 0 }]] },
		},
	};
}

describe('detectArrayInputCollapse', () => {
	const codes = (w: WorkflowJSON) => detectArrayInputCollapse(w).map((x) => x.code);

	it('flags the items[0].json + .slice pattern fed by HTTP (INS-662)', () => {
		const js =
			'const storyIds = items[0].json;\nconst top = storyIds.slice(0, 3);\nreturn top.map(id => ({ json: { id } }));';
		const result = detectArrayInputCollapse(
			workflow('https://hacker-news.firebaseio.com/v0/topstories.json', js),
		);
		expect(result).toHaveLength(1);
		expect(result[0].code).toBe('ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM');
		expect(result[0].nodeName).toBe('Pick');
		expect(result[0].message).toContain('$input.all()');
	});

	it('flags $input.first().json.map applied directly (Binance-style)', () => {
		const js = 'return $input.first().json.map(row => ({ json: { close: row[4] } }));';
		expect(codes(workflow('https://api.binance.com/api/v3/klines', js))).toEqual([
			'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
		]);
	});

	it('flags Array.isArray($input.first().json) guard fed by HTTP', () => {
		const js =
			'const ids = Array.isArray($input.first().json) ? $input.first().json : [];\nreturn ids.map(id => ({ json: { id } }));';
		expect(codes(workflow('https://example.com/list.json', js))).toEqual([
			'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
		]);
	});

	it('flags $input.item.json + .slice in runOnceForEachItem mode (HN build form)', () => {
		const js =
			'const storyIds = $input.item.json;\nconst topThree = storyIds.slice(0, 3);\nreturn topThree.map(id => ({ json: { storyId: id } }));';
		expect(codes(workflow('https://hacker-news.firebaseio.com/v0/topstories.json', js))).toEqual([
			'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
		]);
	});

	it('does NOT flag the correct $input.all() pattern', () => {
		const js =
			'const ids = $input.all().map(i => i.json);\nreturn ids.slice(0, 3).map(id => ({ json: { id } }));';
		expect(codes(workflow('https://example.com/list.json', js))).toEqual([]);
	});

	it('does NOT flag an array op on a sub-field of the first item (single-object response)', () => {
		const js =
			'const rows = $input.first().json.results.slice(0, 3);\nreturn rows.map(r => ({ json: r }));';
		expect(codes(workflow('https://example.com/search.json', js))).toEqual([]);
	});

	it('does NOT flag the pattern when the upstream is not an HTTP Request node', () => {
		const js = 'const ids = items[0].json;\nreturn ids.slice(0, 3).map(id => ({ json: { id } }));';
		expect(codes(workflow('n/a', js, 'n8n-nodes-base.set'))).toEqual([]);
	});
});
