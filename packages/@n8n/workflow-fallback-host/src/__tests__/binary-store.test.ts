/**
 * The binary data store of the host (binary-store.ts): n8n-core's filesystem
 * mode, with n8n's ids and the location of the execution.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { deleteExecutionBinaryData } from '../binary-store';
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';
import type { JsonObject } from '../protocol';

const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
// A manual run: the id is n8n's execution id.
const execution = { id: '41', mode: 'test' as const, workflowId: 'wf-binary' };
// A production run: the id is the runtime's, so the files go under `wfrt-<id>`.
const production = { id: '7', mode: 'production' as const, workflowId: 'wf-binary' };

function entryOf(item: JsonObject | undefined): JsonObject {
	const binary = item?.$binary;
	if (typeof binary !== 'object' || binary === null || Array.isArray(binary)) {
		throw new Error('no binary data');
	}
	const entry = binary.data;
	if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
		throw new Error('no binary entry "data"');
	}
	return entry;
}

describe('the binary data store', () => {
	const previous = process.env.WF_FALLBACK_BINARY_REFS;

	afterEach(() => {
		if (previous === undefined) delete process.env.WF_FALLBACK_BINARY_REFS;
		else process.env.WF_FALLBACK_BINARY_REFS = previous;
	});

	it('stores binary data with the id of n8n and reads it back by id', async () => {
		const made = await runner.run(
			parseNodeStepArgs({
				name: 'To File',
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: 1.1,
				parameters: { operation: 'toText', sourceProperty: 'text', options: {} },
				items: [{ text: 'hello store' }],
			}),
			{ step: 'To File', key: 'k1', execution },
		);
		const entry = entryOf(made[0]);
		expect(entry.id).toMatch(
			/^filesystem-v2:workflows\/wf-binary\/executions\/41\/binary_data\/[0-9a-f-]+$/,
		);
		// Until the runtime reads references, the host also gives the data.
		const data = typeof entry.data === 'string' ? entry.data : '';
		expect(Buffer.from(data, 'base64').toString()).toBe('hello store');

		// A reference without the data: the node reads the bytes from the store.
		const reference = { ...made[0], $binary: { data: { ...entry, data: 'filesystem-v2' } } };
		const read = await runner.run(
			parseNodeStepArgs({
				name: 'From File',
				type: 'n8n-nodes-base.extractFromFile',
				typeVersion: 1.1,
				parameters: { operation: 'text', options: {} },
				items: [reference],
			}),
			{ step: 'From File', key: 'k2', execution },
		);
		expect(read[0]).toMatchObject({ data: 'hello store' });
	});

	it('stores the binary data of a production run under its runtime id with a prefix', async () => {
		const made = await runner.run(
			parseNodeStepArgs({
				name: 'To File',
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: 1.1,
				parameters: { operation: 'toText', sourceProperty: 'text', options: {} },
				items: [{ text: 'production' }],
			}),
			{ step: 'To File', key: 'k4', execution: production },
		);
		expect(entryOf(made[0]).id).toMatch(
			/^filesystem-v2:workflows\/wf-binary\/executions\/wfrt-7\/binary_data\/[0-9a-f-]+$/,
		);
	});

	it('gives references only with WF_FALLBACK_BINARY_REFS=1', async () => {
		process.env.WF_FALLBACK_BINARY_REFS = '1';
		const made = await runner.run(
			parseNodeStepArgs({
				name: 'To File',
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: 1.1,
				parameters: { operation: 'toText', sourceProperty: 'text', options: {} },
				items: [{ text: 'by reference' }],
			}),
			{ step: 'To File', key: 'k3', execution },
		);
		expect(entryOf(made[0]).data).toBe('filesystem-v2');
	});

	it('deletes the binary data of an execution', async () => {
		const folder = join(
			String(process.env.N8N_USER_FOLDER),
			'.n8n',
			'storage',
			'workflows',
			'wf-binary',
			'executions',
			'41',
		);
		expect(existsSync(folder)).toBe(true);
		await deleteExecutionBinaryData('wf-binary', '41');
		expect(existsSync(folder)).toBe(false);
	});
});
