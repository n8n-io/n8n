import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { generateSimplifiedCode } from './simplified-generator';
import { buildSemanticGraph } from './semantic-graph';
import { annotateGraph } from './graph-annotator';
import { buildCompositeTree } from './composite-builder';
import { parseWorkflowCode } from './parse-workflow-code';
import { transpileWorkflowJS } from '../simplified-compiler/compiler';
import type { WorkflowJSON } from '../types/base';

function toSimplified(json: WorkflowJSON): string {
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateSimplifiedCode(tree, json, graph);
}

describe('simplified-generator', () => {
	it('emits onManual for a manual trigger with no body', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe('onManual(async () => {\n});');
	});

	it('emits onSchedule with hours interval', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: {
						rule: {
							interval: [{ field: 'hours', hoursInterval: 21 }],
						},
					},
				},
			],
			connections: {},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe("onSchedule({ every: '21h' }, async () => {\n});");
	});

	it('emits onWebhook with method and path', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						httpMethod: 'POST',
						path: '/my-hook',
					},
				},
			],
			connections: {},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			"onWebhook({ method: 'POST', path: '/my-hook' }, async ({ body }) => {\n});",
		);
	});

	it('emits await http.get for a simple HTTP GET node', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'GET example.com',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: {
						method: 'GET',
						url: 'https://example.com/api',
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'GET example.com', type: 'main', index: 0 }]],
				},
			},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			['onManual(async () => {', "\tawait http.get('https://example.com/api');", '});'].join('\n'),
		);
	});

	it('emits await http.post with body and auth', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'POST api.twitter.com/2/tweets',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: {
						method: 'POST',
						url: 'https://api.twitter.com/2/tweets',
						sendBody: true,
						contentType: 'json',
						specifyBody: 'json',
						jsonBody: '{"text":"Hello world"}',
						authentication: 'genericCredentialType',
						genericAuthType: 'oAuth2Api',
					},
					credentials: {
						oAuth2Api: { id: '', name: 'Twitter OAuth2' },
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'POST api.twitter.com/2/tweets', type: 'main', index: 0 }]],
				},
			},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			[
				'onManual(async () => {',
				"\tawait http.post('https://api.twitter.com/2/tweets', {",
				"\t\ttext: 'Hello world',",
				"\t}, { auth: { type: 'oauth2', credential: 'Twitter OAuth2' } });",
				'});',
			].join('\n'),
		);
	});

	it('emits const assignment for Set node', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Set query',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {
						options: {},
						assignments: {
							assignments: [{ id: 'a1', name: 'query', type: 'string', value: 'hello' }],
						},
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'Set query', type: 'main', index: 0 }]],
				},
			},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			['onManual(async () => {', '\tconst query = "hello";', '});'].join('\n'),
		);
	});

	it('emits inline code for Code node', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Code 1',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [200, 0],
					parameters: {
						jsCode: 'const x = 1;\nconst y = 2;\nreturn [{ json: { x, y } }];',
						mode: 'runOnceForAllItems',
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'Code 1', type: 'main', index: 0 }]],
				},
			},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			['onManual(async () => {', '\tconst x = 1;', '\tconst y = 2;', '});'].join('\n'),
		);
	});

	it('emits const assignment for HTTP when referenced downstream', () => {
		const json: WorkflowJSON = {
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'GET example.com/api',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: {
						method: 'GET',
						url: 'https://example.com/api',
					},
				},
				{
					id: '3',
					name: 'POST api.slack.com',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [400, 0],
					parameters: {
						method: 'POST',
						url: 'https://api.slack.com/post',
						sendBody: true,
						contentType: 'json',
						specifyBody: 'json',
						jsonBody: '{"text":"={{ $(\'GET example.com/api\').first().json.title }}"}',
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'GET example.com/api', type: 'main', index: 0 }]],
				},
				'GET example.com/api': {
					main: [[{ node: 'POST api.slack.com', type: 'main', index: 0 }]],
				},
			},
		};

		const result = toSimplified(json);
		expect(result.trim()).toBe(
			[
				'onManual(async () => {',
				"\tconst data = await http.get('https://example.com/api');",
				'',
				"\tawait http.post('https://api.slack.com/post', { text: data.title });",
				'});',
			].join('\n'),
		);
	});
});

// ─── Round-trip integration tests ────────────────────────────────────────────

function normalizeSDK(code: string): string {
	return code
		.replace(/,?\s*metadata:\s*\{[^}]*\}/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n')
		.trim();
}

function decompileViaCompositeTree(sdkCode: string): string {
	const json = parseWorkflowCode(sdkCode);
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateSimplifiedCode(tree, json, graph);
}

const fixturesDir = join(__dirname, '../simplified-compiler/__fixtures__');
const fixtures = readdirSync(fixturesDir)
	.filter((f) => statSync(join(fixturesDir, f)).isDirectory())
	.sort();

describe('simplified-generator round-trip', () => {
	for (const name of fixtures) {
		it(`round-trip ${name}`, () => {
			const dir = join(fixturesDir, name);
			const input = readFileSync(join(dir, 'input.js'), 'utf-8').trim();

			// Pass 1: simplified → SDK₁
			const sdk1 = transpileWorkflowJS(input);
			expect(sdk1.errors).toHaveLength(0);

			// Decompile via composite tree: SDK₁ → JSON → simplified₂
			const simplified2 = decompileViaCompositeTree(sdk1.code);

			// Pass 2: simplified₂ → SDK₂
			const sdk2 = transpileWorkflowJS(simplified2);
			expect(sdk2.errors).toHaveLength(0);

			// Compare normalized SDKs
			const norm1 = normalizeSDK(sdk1.code);
			const norm2 = normalizeSDK(sdk2.code);
			if (norm1 !== norm2) {
				console.log(`\n=== ${name} decompiled ===`);
				console.log(simplified2);
			}
			expect(norm2).toBe(norm1);
		});
	}
});
