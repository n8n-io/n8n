import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { CORE_NODE_TYPES } from '../../convert/core-types.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { NATIVE } from '../../convert/registry.ts';
import {
	NODE_DESCRIPTIONS,
	NODE_DESCRIPTION_VERSIONS,
} from '../../generated/node-descriptions.generated.ts';
import { runReference } from '../../reference/runner.ts';
import type { NodeSources } from '../convert.ts';
import { compileNodeInstance, isVerified } from '../convert.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');

const ENTRIES: Record<string, string> = {
	'n8n-nodes-base.telegram': 'nodes/Telegram/Telegram.node.ts',
};

const nodeSources: NodeSources = {
	entry: (type) => (type in ENTRIES ? join(nodesBase, ENTRIES[type]) : undefined),
	readFile: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined),
	description: (type, version) =>
		NODE_DESCRIPTIONS[NODE_DESCRIPTION_VERSIONS[`${type}@${version}`]],
	aliases: { '@utils/': `${join(nodesBase, 'utils')}/` },
	verified: {
		'n8n-nodes-base.telegram@1.2:message.sendChatAction': ['chatId', 'action', '@each=chatId'],
	},
};
const instance = { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) };

function workflowWith(parameters: Record<string, unknown>, settings: Record<string, unknown> = {}) {
	return {
		name: 'Node compiler',
		nodes: [
			{
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'compiled', httpMethod: 'POST' },
			},
			{
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1.2,
				position: [200, 0],
				parameters,
				credentials: { telegramApi: { id: '1', name: 'Telegram' } },
				...settings,
			},
		],
		connections: { Webhook: { main: [[{ node: 'Telegram', type: 'main', index: 0 }]] } },
	};
}

const fixture = {
	trigger: { body: { chat: '42' }, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Telegram: [{ status: 200, headers: {}, body: { ok: true, result: true } }] },
};

describe('node compiler in the converter', () => {
	it('compiles an operation that the library node does not have from the node source', async () => {
		const result = convertWorkflow(
			workflowWith({
				resource: 'message',
				operation: 'sendChatAction',
				chatId: '={{ $json.body.chat }}',
				action: 'typing',
			}),
			{ nodeSources, instance },
		);
		expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(result.fallbackNodes).toEqual([]);
		expect(Object.keys(result.nodes ?? {})).toHaveLength(1);
		expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);

		const out = await runReference(result.source, fixture, { extraNodes: result.nodes });
		expect(out.status).toBe('ok');
		expect(out.effects).toHaveLength(1);
		expect(out.effects[0].args).toMatchObject({
			method: 'POST',
			url: '{{$credentials.baseUrl}}/bot{{$credentials.accessToken}}/sendChatAction',

			body: { chat_id: '42', action: 'typing' },
		});
	});

	it('uses the library node first when it has the operation', () => {
		const result = convertWorkflow(
			workflowWith({ resource: 'message', operation: 'sendMessage', chatId: '42', text: 'hello' }),
			{ nodeSources, instance },
		);
		expect(result.fallbackNodes).toEqual([]);
		expect(result.nodes).toBeUndefined();
		expect(result.source).toContain("type: 'n8n-nodes-base.telegram'");
	});

	it('runs the node in the fallback host when its source does not compile', () => {
		const result = convertWorkflow(
			workflowWith({ resource: 'file', operation: 'get', fileId: 'abc', download: true }),
			{ nodeSources, instance },
		);
		expect(result.fallbackNodes).toEqual(['Telegram']);
		expect(result.nodes).toBeUndefined();
		expect(result.diagnostics.some((d) => d.code === 'node-compile')).toBe(true);
	});

	it('runs an operation that is not checked against v1 in the fallback host', () => {
		const result = convertWorkflow(
			workflowWith({ resource: 'chat', operation: 'leave', chatId: '42' }),
			{ nodeSources, instance },
		);
		expect(result.fallbackNodes).toEqual(['Telegram']);
		expect(result.nodes).toBeUndefined();
	});

	it('calls the node once with all items, also when a parameter reads the item', () => {
		const key = 'n8n-nodes-base.telegram@1.2:message.sendChatAction';
		const oneCall: NodeSources = { ...nodeSources, verified: { [key]: ['chatId', 'action'] } };
		const fixed = {
			resource: 'message',
			operation: 'sendChatAction',
			chatId: '42',
			action: 'typing',
		};
		const once = convertWorkflow(workflowWith(fixed), { nodeSources: oneCall, instance });
		expect(once.fallbackNodes).toEqual([]);
		expect(once.source).toContain('webhookItems.length > 0 ? await ctx.node(');
		expect(once.source).toContain('items: webhookItems,');

		const perItem = { ...fixed, chatId: '={{ $json.body.chat }}' };
		const refused = convertWorkflow(workflowWith(perItem), { nodeSources: oneCall, instance });
		expect(refused.fallbackNodes).toEqual(['Telegram']);
		const each = convertWorkflow(workflowWith(perItem), { nodeSources, instance });
		expect(each.fallbackNodes).toEqual([]);
		expect(each.source).toContain('for (const $json of webhookItems) {');
		expect(each.source).toContain('telegramParameters.push({ chatId: ');
		expect(each.source).toContain('parameters: { each: telegramParameters },');
		expect(each.source).toContain('items: webhookItems,');
		expect(each.source).not.toContain('items: [$json],');
	});

	it('compiles a node for its error setting only when v1 agrees under that setting', async () => {
		const parameters = {
			resource: 'message',
			operation: 'sendChatAction',
			chatId: '={{ $json.body.chat }}',
			action: 'typing',
		};
		const key = 'n8n-nodes-base.telegram@1.2:message.sendChatAction';
		const workflow = workflowWith(parameters, { onError: 'continueRegularOutput' });
		expect(convertWorkflow(workflow, { nodeSources, instance }).fallbackNodes).toEqual([
			'Telegram',
		]);

		const conditions = ['chatId', 'action', '@each=chatId', '@onError=continueRegularOutput'];
		const stopOnly: NodeSources = { ...nodeSources, verified: { [key]: conditions } };
		expect(convertWorkflow(workflow, { nodeSources: stopOnly, instance }).fallbackNodes).toEqual([
			'Telegram',
		]);
		const proven: NodeSources = {
			...nodeSources,
			verified: { [key]: [...conditions, '@each=chatId@continueRegularOutput'] },
		};
		const result = convertWorkflow(workflow, { nodeSources: proven, instance });
		expect(result.fallbackNodes).toEqual([]);
		expect(result.source).toContain('items: [$json]');
		const once: NodeSources = {
			...nodeSources,
			verified: {
				[key]: [
					...conditions,
					'@each=chatId@continueRegularOutput',
					'@oneCall=continueRegularOutput',
				],
			},
		};
		const inOneCall = convertWorkflow(workflow, { nodeSources: once, instance });
		expect(inOneCall.fallbackNodes).toEqual([]);
		expect(inOneCall.source).not.toContain('items: [$json]');
		expect(compile(inOneCall.source, { extraNodes: inOneCall.nodes }).diagnostics).toEqual([]);
		expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);
		const failing = {
			...fixture,
			effects: {
				Telegram: [{ status: 400, headers: {}, body: { message: 'chat not found' } }],
			},
		};
		const out = await runReference(result.source, failing, { extraNodes: result.nodes });
		expect(out).toMatchObject({
			status: 'ok',
			result: { Telegram: [{ error: 'chat not found' }] },
		});

		const errorOutput = workflowWith(parameters, { onError: 'continueErrorOutput' });
		expect(convertWorkflow(errorOutput, { nodeSources: proven, instance }).fallbackNodes).toEqual([
			'Telegram',
		]);
	});

	it('records the error setting of the instance as a condition of the check', () => {
		const node = {
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			parameters: { resource: 'message', operation: 'sendChatAction', chatId: '42' },
		};
		const stop = compileNodeInstance(nodeSources, node, instance.id);
		const regular = compileNodeInstance(
			nodeSources,
			node,
			instance.id,
			{},
			undefined,
			undefined,
			'continueRegularOutput',
		);
		if ('errors' in stop || 'errors' in regular) throw new Error('the node does not compile');
		expect(stop.changed).toEqual(['chatId']);
		expect(regular.changed).toEqual(['chatId', '@onError=continueRegularOutput']);
		expect(regular.source).not.toEqual(stop.source);
		expect(isVerified(nodeSources, node.type, node.version, stop)).toBe(true);
		expect(isVerified(nodeSources, node.type, node.version, regular)).toBe(false);
	});

	it('keeps a node that makes binary data in the fallback host for the binary mode `combined`', () => {
		const download = { resource: 'file', operation: 'get', fileId: 'abc', download: true };
		const checked: NodeSources = {
			...nodeSources,
			storesResponses: true,
			verified: { 'n8n-nodes-base.telegram@1.2:file.get': ['fileId', 'download'] },
		};
		const separate = convertWorkflow(workflowWith(download), { nodeSources: checked, instance });
		expect(separate.diagnostics.filter((d) => d.code === 'node-compile')).toEqual([]);
		expect(separate.fallbackNodes).toEqual([]);
		expect(Object.keys(separate.nodes ?? {})).toHaveLength(1);

		const combined = convertWorkflow(
			{ ...workflowWith(download), settings: { binaryMode: 'combined' } },
			{ nodeSources: checked, instance },
		);
		expect(combined.fallbackNodes).toEqual(['Telegram']);
		expect(combined.nodes).toBeUndefined();
		expect(combined.diagnostics.some((d) => d.message.includes('binary mode `combined`'))).toBe(
			true,
		);
	});

	it('keeps a node that asks for response bytes in the fallback host without a runtime that stores them', () => {
		const result = convertWorkflow(
			workflowWith({ resource: 'file', operation: 'get', fileId: 'abc', download: true }),
			{
				nodeSources: {
					...nodeSources,
					verified: { 'n8n-nodes-base.telegram@1.2:file.get': ['fileId', 'download'] },
				},
				instance,
			},
		);
		expect(result.fallbackNodes).toEqual(['Telegram']);
		expect(result.nodes).toBeUndefined();
		expect(
			result.diagnostics.some((d) =>
				d.message.includes('does not store a response as binary data'),
			),
		).toBe(true);
	});

	it('does not compile a core node with a native lowering from its source', () => {
		expect(Object.keys(NATIVE).sort()).toEqual([...CORE_NODE_TYPES].sort());
	});

	it('changes nothing without node sources', () => {
		const result = convertWorkflow(
			workflowWith({
				resource: 'message',
				operation: 'sendChatAction',
				chatId: '42',
				action: 'typing',
			}),
			{ instance },
		);
		expect(result.fallbackNodes).toEqual(['Telegram']);
	});
});
