import type { IConnections, INode } from 'n8n-workflow';

import {
	chainReadsPath,
	findJsonReferences,
	findReadingNodes,
	longestLiteral,
	parseRulePath,
} from '../rule-impact-matcher';

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const WEBHOOK = 'n8n-nodes-base.webhook';
const connect = (from: string, to: string): IConnections => ({
	[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
});

const reads = (expression: string, path: string) =>
	findJsonReferences(expression).some((reference) =>
		chainReadsPath(reference.chain, parseRulePath(path)),
	);

describe('chainReadsPath', () => {
	it.each([
		["{{ $json.headers['x-token'] }}", 'headers.x-token'],
		['{{ $json["headers"]["x-token"] }}', 'headers.x-token'],
		['{{ $json.headers["x-token"] }}', 'headers.x-token'],
		['{{ $json?.headers?.["x-token"] }}', 'headers.x-token'],
		['{{ $json.body.user.token }}', 'body.user.token'],
		['{{ $json.body.user.token.length }}', 'body.user.token'],
		['{{ $json.body.user.token.trim() }}', 'body.user.token'],
		["{{ $json.headers['x-api-key'] }}", 'headers.x-*'],
		["{{ $json.headers['x-api-key'] }}", '*.x-api-key'],
		['{{ $json.body.tags[0] }}', 'body.tags[*]'],
		['{{ $json.body.tags }}', 'body.tags[*]'],
		['{{ $json.body.tags[0].value }}', 'body.tags[*].value'],
		['{{ $json.headers[$json.name] }}', 'headers.x-token'],
		["{{ $('Webhook').item.json.headers['x-token'] }}", 'headers.x-token'],
		["{{ $('Webhook').first().json.headers['x-token'] }}", 'headers.x-token'],
		["{{ $('Webhook').all()[0].json.headers['x-token'] }}", 'headers.x-token'],
		["{{ $input.item.json.headers['x-token'] }}", 'headers.x-token'],
		["{{ $input.first().json.headers['x-token'] }}", 'headers.x-token'],
		['{{ $node["Webhook"].json.headers["x-token"] }}', 'headers.x-token'],
	])('matches %s for %s', (expression, path) => {
		expect(reads(expression, path)).toBe(true);
	});

	it.each([
		['{{ $json.headers["x-token-other"] }}', 'headers.x-token'],
		['{{ $json.headers["x-tokens"] }}', 'headers.x-token'],
		['{{ $json.header["x-token"] }}', 'headers.x-token'],
		['{{ $json.body.x-token }}', 'headers.x-token'],
		['{{ $json.headers }}', 'headers.x-token'],
		['{{ $json.body.tags.length }}', 'body.tags[*].value'],
		['{{ $myjson.headers["x-token"] }}', 'headers.x-token'],
		['{{ $jsonData.headers["x-token"] }}', 'headers.x-token'],
		['{{ $json.headers[0] }}', 'headers.x-token'],
		['{{ $json.headers["y-api-key"] }}', 'headers.x-*'],
		['{{ $json }}', 'headers.x-token'],
	])('does not match %s for %s', (expression, path) => {
		expect(reads(expression, path)).toBe(false);
	});

	it('reads a long text without a match in linear time', () => {
		const text = `{{ ${"$json.a['".repeat(5000)}`;

		expect(reads(text, 'headers.x-token')).toBe(false);
	});
});

describe('longestLiteral', () => {
	it.each([
		['headers.x-token', 'headers'],
		['headers.x-*', 'headers'],
		['*.authorization', 'authorization'],
		['body.tags[*].value', 'value'],
		['*', undefined],
	])('%s gives %s', (path, expected) => {
		expect(longestLiteral(path)).toBe(expected);
	});
});

describe('findReadingNodes', () => {
	const setNode = (value: string) => node('Set', 'n8n-nodes-base.set', { values: [{ value }] });

	it('finds a node that reads the path with $json below the trigger', () => {
		const nodes = [node('Webhook', WEBHOOK), setNode("={{ $json.headers['x-token'] }}")];

		expect(findReadingNodes(nodes, connect('Webhook', 'Set'), WEBHOOK, 'headers.x-token')).toEqual([
			'Set',
		]);
	});

	it('finds a node that names the trigger, even when it is not connected', () => {
		const nodes = [
			node('Webhook', WEBHOOK),
			setNode("={{ $('Webhook').item.json.headers['x-token'] }}"),
		];

		expect(findReadingNodes(nodes, {}, WEBHOOK, 'headers.x-token')).toEqual(['Set']);
	});

	it('ignores $json when no matching trigger is an ancestor', () => {
		const nodes = [node('Webhook', WEBHOOK), setNode("={{ $json.headers['x-token'] }}")];

		expect(findReadingNodes(nodes, {}, WEBHOOK, 'headers.x-token')).toEqual([]);
	});

	it('ignores a reference to a node that is not a matching trigger', () => {
		const nodes = [
			node('Webhook', WEBHOOK),
			node('Other', 'n8n-nodes-base.set'),
			setNode("={{ $('Other').item.json.headers['x-token'] }}"),
		];

		expect(findReadingNodes(nodes, {}, WEBHOOK, 'headers.x-token')).toEqual([]);
	});

	it('ignores a workflow with a different trigger type', () => {
		const nodes = [
			node('Form', 'n8n-nodes-base.formTrigger'),
			setNode("={{ $json.headers['x-token'] }}"),
		];

		expect(findReadingNodes(nodes, connect('Form', 'Set'), WEBHOOK, 'headers.x-token')).toEqual([]);
	});

	it('treats * as any trigger and not as a regular node', () => {
		const connections = connect('Form', 'Set');
		const withTrigger = [
			node('Form', 'n8n-nodes-base.formTrigger'),
			setNode("={{ $json.headers['x-token'] }}"),
		];
		const withoutTrigger = [
			node('Form', 'n8n-nodes-base.set'),
			setNode("={{ $json.headers['x-token'] }}"),
		];

		expect(findReadingNodes(withTrigger, connections, '*', 'headers.x-token')).toEqual(['Set']);
		expect(findReadingNodes(withoutTrigger, connections, '*', 'headers.x-token')).toEqual([]);
	});

	it('ignores a plain string that is not an expression', () => {
		const nodes = [node('Webhook', WEBHOOK), setNode("$json.headers['x-token']")];

		expect(findReadingNodes(nodes, connect('Webhook', 'Set'), WEBHOOK, 'headers.x-token')).toEqual(
			[],
		);
	});

	it('reads the code of a Code node', () => {
		const nodes = [
			node('Webhook', WEBHOOK),
			node('Code', 'n8n-nodes-base.code', {
				jsCode: "return [{ json: { t: $('Webhook').first().json.headers['x-token'] } }];",
			}),
		];

		expect(findReadingNodes(nodes, {}, WEBHOOK, 'headers.x-token')).toEqual(['Code']);
	});
});
