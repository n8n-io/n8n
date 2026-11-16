/**
 * The node compiler in the converter: a native or library node comes first, a
 * node without one is compiled from its n8n source, and a node whose source
 * does not compile runs in the fallback host.
 */
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
	verified: { 'n8n-nodes-base.telegram@1.2:message.sendChatAction': ['chatId', 'action'] },
};
const instance = { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) };

function workflowWith(parameters: Record<string, unknown>) {
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
			// The chat id is an expression: the module reads it from the call for each item.
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
		// A file download reads binary data, which has no compiled form.
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
