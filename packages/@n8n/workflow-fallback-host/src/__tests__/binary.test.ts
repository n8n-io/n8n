/**
 * Binary data through host steps: a node writes a file into `$binary`, the
 * compiled code passes the item on, and another node reads the file.
 */
import { BinaryLimitError, toN8nItem, toStepItem } from '../binary';
import { disposeExpressionEngine, NodeStepRunner, parseNodeStepArgs } from '../node-step';
import type { JsonObject } from '../protocol';

describe('binary items', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	afterAll(async () => {
		await disposeExpressionEngine();
	});

	it('moves `$binary` to the n8n item and back', () => {
		const entry = { data: 'aGk=', mimeType: 'text/plain', fileName: 'a.txt' };
		// The host adds both size fields: `bytes` (runtime) and `fileSize` (n8n's text).
		const sized = { ...entry, bytes: 2, fileSize: '2 B' };
		expect(toN8nItem({ a: 1, $binary: { file: entry } })).toEqual({
			json: { a: 1 },
			binary: { file: sized },
		});
		expect(toStepItem({ a: 1, $binary: { file: entry } })).toEqual({
			json: { a: 1 },
			binary: { file: sized },
		});
		expect(toN8nItem({ a: 1 })).toEqual({ json: { a: 1 } });
	});

	it('round-trips a file between two node steps', async () => {
		const written = await runner.run(
			parseNodeStepArgs({
				name: 'To File',
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: 1.1,
				parameters: { operation: 'toJson', mode: 'once', options: {} },
				items: [{ name: 'Ada' }, { name: 'Grace' }],
			}),
			{ step: 'To File', key: 'k1' },
		);
		expect(written).toHaveLength(1);
		const binary = written[0].$binary as JsonObject;
		const data = binary.data as JsonObject;
		expect(data.mimeType).toBe('application/json');
		expect(JSON.parse(Buffer.from(data.data as string, 'base64').toString('utf8'))).toEqual([
			{ name: 'Ada' },
			{ name: 'Grace' },
		]);

		const read = await runner.run(
			parseNodeStepArgs({
				name: 'From File',
				type: 'n8n-nodes-base.extractFromFile',
				typeVersion: 1,
				parameters: { operation: 'fromJson', options: {} },
				items: written,
			}),
			{ step: 'From File', key: 'k2' },
		);
		expect(read).toEqual([{ data: [{ name: 'Ada' }, { name: 'Grace' }] }]);
	});

	it('refuses a result with more binary data than the limit', async () => {
		const small = new NodeStepRunner({ credentials: { get: async () => ({}) }, maxBinaryBytes: 8 });
		await expect(
			small.run(
				parseNodeStepArgs({
					name: 'To File',
					type: 'n8n-nodes-base.convertToFile',
					typeVersion: 1.1,
					parameters: { operation: 'toJson', mode: 'once', options: {} },
					items: [{ text: 'more than eight bytes' }],
				}),
				{ step: 'To File', key: 'k3' },
			),
		).rejects.toThrow(BinaryLimitError);
	});
});
